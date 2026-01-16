import { XMLParser } from 'fast-xml-parser';
import { Alert } from '../../core/types/adapter';
import { cache } from '../../core/cache';

const SIRI_GM_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/general-message';
const API_KEY = process.env.EXPO_PUBLIC_IDFM_API_KEY || '';
const CACHE_TTL = 300000; // 5 minutes

export async function fetchAlerts(): Promise<Alert[]> {
  // 1. Check cache
  const cacheKey = 'alerts';
  const cached = cache.get<Alert[]>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  try {
    // 2. Appel API
    const response = await fetch(SIRI_GM_URL, {
      headers: {
        'apikey': API_KEY,
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`SIRI GM API error: ${response.status}`);
    }

    const xml = await response.text();

    // 3. Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xml);

    // 4. Extrait les messages
    const delivery = parsed?.Siri?.ServiceDelivery?.GeneralMessageDelivery;
    if (!delivery) return [];

    const messages = delivery.InfoMessage;
    if (!messages) return [];

    const messagesArray = Array.isArray(messages) ? messages : [messages];

    // 5. Normalise vers Alert[]
    const alerts: Alert[] = messagesArray.map((msg: any) => {
      const content = msg.Content;
      const message = content?.Message;

      // Extrait la sévérité
      let severity: 'info' | 'warning' | 'severe' = 'info';
      const infoChannelRef = msg.InfoChannelRef;
      if (infoChannelRef?.includes('Perturbation')) severity = 'warning';
      if (infoChannelRef?.includes('Alerte') || content?.Severity === 'severe') severity = 'severe';

      // Extrait les lignes affectées
      const affects = content?.Affects;
      const affectedRoutes: string[] = [];
      const affectedStops: string[] = [];

      if (affects?.Networks?.AffectedNetwork?.AffectedLine) {
        const lines = affects.Networks.AffectedNetwork.AffectedLine;
        const linesArray = Array.isArray(lines) ? lines : [lines];
        linesArray.forEach((line: any) => {
          if (line.LineRef) affectedRoutes.push(line.LineRef);
        });
      }

      if (affects?.StopPoints?.AffectedStopPoint) {
        const stops = affects.StopPoints.AffectedStopPoint;
        const stopsArray = Array.isArray(stops) ? stops : [stops];
        stopsArray.forEach((stop: any) => {
          if (stop.StopPointRef) affectedStops.push(stop.StopPointRef);
        });
      }

      // Extrait les dates
      const validUntil = msg.ValidUntilTime;
      const recordedAt = msg.RecordedAtTime;

      return {
        id: msg.ItemIdentifier || msg['@_ItemIdentifier'] || String(Date.now()),
        title: content?.Summary || message?.MessageText?.substring(0, 50) || 'Perturbation',
        description: message?.MessageText || content?.Description || '',
        severity,
        affectedRoutes: affectedRoutes.length > 0 ? affectedRoutes : undefined,
        affectedStops: affectedStops.length > 0 ? affectedStops : undefined,
        startTime: new Date(recordedAt || Date.now()),
        endTime: validUntil ? new Date(validUntil) : undefined,
        url: content?.InfoURL,
      };
    });

    // 6. Filtre les alertes expirées et trie par sévérité
    const now = new Date();
    const validAlerts = alerts
      .filter(a => !a.endTime || a.endTime > now)
      .sort((a, b) => {
        const severityOrder = { severe: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

    // 7. Cache
    cache.set(cacheKey, validAlerts);

    return validAlerts;

  } catch (error) {
    console.warn('Failed to fetch alerts:', error);
    return [];
  }
}

// Helper pour vérifier si une ligne est affectée
export function isRouteAffected(routeId: string, alerts: Alert[]): Alert | undefined {
  return alerts.find(a => a.affectedRoutes?.some(r => r.includes(routeId)));
}

// Helper pour vérifier si un arrêt est affecté
export function isStopAffected(stopId: string, alerts: Alert[]): Alert | undefined {
  return alerts.find(a => a.affectedStops?.some(s => s.includes(stopId)));
}
