/**
 * İzmir Transit Alert Scraper
 *
 * Scrapes announcements from official İzmir transit operator websites:
 * - İzmir Metro (metro + tram): izmirmetro.com.tr
 * - İZBAN (commuter rail): izban.com.tr
 * - ESHOT (buses): eshot.gov.tr
 *
 * Since İzmir has no GTFS-RT Service Alerts API, we parse HTML from
 * announcement pages to detect disruptions, schedule changes, etc.
 *
 * Alerts are cached in AsyncStorage to avoid re-fetching on every call.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert } from '../core/types/adapter';
import { logger } from '../utils/logger';
import { captureException } from './crash-reporting';

const CACHE_KEY = '@izmir_alerts_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FETCH_TIMEOUT = 8000; // 8 seconds
const MAX_ALERT_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

// Turkish month names for date parsing
const TURKISH_MONTHS: Record<string, number> = {
  'ocak': 0, 'şubat': 1, 'subat': 1, 'mart': 2, 'nisan': 3,
  'mayıs': 4, 'mayis': 4, 'haziran': 5, 'temmuz': 6, 'ağustos': 7,
  'agustos': 7, 'eylül': 8, 'eylul': 8, 'ekim': 9, 'kasım': 10,
  'kasim': 10, 'aralık': 11, 'aralik': 11,
};

interface CachedAlerts {
  alerts: Alert[];
  timestamp: number;
}

// Keywords indicating severity levels (Turkish)
const SEVERE_KEYWORDS = [
  'iptal', 'durduruldu', 'kapali', 'kapalı', 'durdu', 'grev',
  'arıza', 'ariza', 'kaza', 'tehlike', 'acil',
];

const WARNING_KEYWORDS = [
  'değişiklik', 'degisiklik', 'gecikme', 'düzenleme', 'duzenleme',
  'güzergah', 'guzergah', 'bakım', 'bakim', 'onarım', 'onarim',
  'tek hat', 'yavaşlama', 'yavas', 'sefer saati', 'aktarma',
];

// Keywords to match affected transit types
const ROUTE_KEYWORDS: Record<string, string[]> = {
  metro: ['metro', 'm1', 'metrosu'],
  tram: ['tramvay', 'tram', 't1', 't2', 't3', 'konak tram', 'karşıyaka tram', 'çiğli tram'],
  izban: ['izban', 'İZBAN', 'banliyö', 'banliyo'],
  ferry: ['vapur', 'feribot', 'izdeniz', 'İzdeniz', 'iskelesi'],
  bus: ['otobüs', 'otobus', 'eshot', 'hat'],
};

/**
 * Determine alert severity from text content
 */
function detectSeverity(text: string): 'severe' | 'warning' | 'info' {
  const lower = text.toLowerCase();
  if (SEVERE_KEYWORDS.some(kw => lower.includes(kw))) return 'severe';
  if (WARNING_KEYWORDS.some(kw => lower.includes(kw))) return 'warning';
  return 'info';
}

/**
 * Detect affected route types from text content
 */
function detectAffectedRoutes(text: string): string[] {
  const lower = text.toLowerCase();
  const affected: string[] = [];

  for (const [type, keywords] of Object.entries(ROUTE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      affected.push(type);
    }
  }

  return affected;
}

/**
 * Try to extract a date from text (Turkish date formats)
 * Returns the date if found, or null
 */
function extractDate(text: string): Date | null {
  const lower = text.toLowerCase();

  // Format: DD.MM.YYYY or DD/MM/YYYY
  const numericMatch = lower.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Format: DD Month YYYY (Turkish)
  const turkishMatch = lower.match(/(\d{1,2})\s+(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)\s+(20\d{2})/);
  if (turkishMatch) {
    const [, day, month, year] = turkishMatch;
    const monthIndex = TURKISH_MONTHS[month];
    if (monthIndex !== undefined) {
      return new Date(parseInt(year), monthIndex, parseInt(day));
    }
  }

  return null;
}

/**
 * Check if a date is recent (within MAX_ALERT_AGE_MS)
 */
function isRecent(date: Date | null): boolean {
  if (!date) return false;
  return (Date.now() - date.getTime()) < MAX_ALERT_AGE_MS;
}

/**
 * Fetch HTML with timeout
 */
async function fetchWithTimeout(url: string, timeout: number = FETCH_TIMEOUT): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TransitIzmir/1.0',
        'Accept': 'text/html',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[AlertScraper] HTTP ${response.status} from ${url}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    logger.warn(`[AlertScraper] Fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Extract text content from HTML (simple regex-based, no DOM parser needed)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape İzmir Metro announcements (covers metro + tram)
 */
async function scrapeIzmirMetro(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Try the main page which shows banner alerts
  const html = await fetchWithTimeout('https://www.izmirmetro.com.tr');
  if (!html) return alerts;

  try {
    // Extract announcement blocks - İzmir Metro uses div blocks with titles
    // Look for common announcement patterns in Turkish transit sites
    const announcementPattern = /<div[^>]*class="[^"]*(?:duyuru|haber|announcement|news|alert|banner)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;

    while ((match = announcementPattern.exec(html)) !== null) {
      const block = match[1];
      const text = stripHtml(block);
      if (text.length > 20 && text.length < 500) {
        alerts.push({
          id: `metro_${hashString(text)}`,
          title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          description: text,
          severity: detectSeverity(text),
          affectedRoutes: detectAffectedRoutes(text),
          startTime: new Date(),
          url: 'https://www.izmirmetro.com.tr',
        });
      }
    }

    // Also extract from h2/h3 tags that often contain alerts
    const headerPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match = headerPattern.exec(html)) !== null) {
      const text = stripHtml(match[1]);
      // Filter to only transit-relevant headers
      if (text.length > 15 && text.length < 200 && detectAffectedRoutes(text).length > 0) {
        const id = `metro_h_${hashString(text)}`;
        // Don't add duplicates
        if (!alerts.some(a => a.id === id)) {
          alerts.push({
            id,
            title: text,
            description: text,
            severity: detectSeverity(text),
            affectedRoutes: detectAffectedRoutes(text),
            startTime: new Date(),
            url: 'https://www.izmirmetro.com.tr',
          });
        }
      }
    }
  } catch (error) {
    logger.warn('[AlertScraper] Error parsing İzmir Metro:', error);
  }

  return alerts;
}

/**
 * Scrape İZBAN announcements
 */
async function scrapeIzban(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const html = await fetchWithTimeout('https://www.izban.com.tr/Sayfalar/Duyurular.aspx');
  if (!html) return alerts;

  try {
    // İZBAN announcements are in divs with h3 titles and p descriptions
    // Pattern: <h3>TITLE</h3> followed by <p>DESCRIPTION</p>
    const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(?:<[^>]*>\s*)*<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;

    while ((match = titlePattern.exec(html)) !== null) {
      const title = stripHtml(match[1]);
      const description = stripHtml(match[2]);

      if (title.length > 5 && title.length < 200) {
        const fullText = `${title} ${description}`;
        alerts.push({
          id: `izban_${hashString(title)}`,
          title,
          description: description || title,
          severity: detectSeverity(fullText),
          affectedRoutes: ['izban'],
          startTime: new Date(),
          url: 'https://www.izban.com.tr/Sayfalar/Duyurular.aspx',
        });
      }
    }

    // Fallback: extract h3s only if they contain disruption keywords
    if (alerts.length === 0) {
      const h3Pattern = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
      while ((match = h3Pattern.exec(html)) !== null) {
        const title = stripHtml(match[1]);
        const severity = detectSeverity(title);
        // Only include if it looks like a real disruption, not generic news
        if (title.length > 10 && title.length < 200 && severity !== 'info') {
          alerts.push({
            id: `izban_${hashString(title)}`,
            title,
            description: title,
            severity,
            affectedRoutes: ['izban'],
            startTime: new Date(),
            url: 'https://www.izban.com.tr/Sayfalar/Duyurular.aspx',
          });
        }
      }
    }
  } catch (error) {
    logger.warn('[AlertScraper] Error parsing İZBAN:', error);
  }

  return alerts;
}

/**
 * Scrape ESHOT announcements (buses)
 */
async function scrapeEshot(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const html = await fetchWithTimeout('https://www.eshot.gov.tr/tr/Haberler/534/288');
  if (!html) return alerts;

  try {
    // ESHOT uses a news list with titles and dates
    const titlePattern = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
    let match;

    while ((match = titlePattern.exec(html)) !== null) {
      const title = stripHtml(match[1]);
      // Filter: only transit-relevant (contains keywords about routes, disruptions)
      if (title.length > 10 && title.length < 300) {
        const routes = detectAffectedRoutes(title);
        const severity = detectSeverity(title);
        // Only include if it looks like a transit alert (not generic news)
        if (routes.length > 0 || severity !== 'info') {
          alerts.push({
            id: `eshot_${hashString(title)}`,
            title,
            description: title,
            severity,
            affectedRoutes: routes.length > 0 ? routes : ['bus'],
            startTime: new Date(),
            url: 'https://www.eshot.gov.tr',
          });
        }
      }
    }
  } catch (error) {
    logger.warn('[AlertScraper] Error parsing ESHOT:', error);
  }

  return alerts;
}

/**
 * Simple string hash for generating deterministic IDs
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cached alerts if still fresh
 */
async function getCachedAlerts(): Promise<Alert[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: CachedAlerts = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_TTL) {
        logger.log(`[AlertScraper] Using cached alerts (${data.alerts.length} alerts)`);
        // Restore Date objects
        return data.alerts.map(a => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: a.endTime ? new Date(a.endTime) : undefined,
        }));
      }
    }
  } catch (error) {
    logger.warn('[AlertScraper] Cache read error:', error);
  }
  return null;
}

/**
 * Cache alerts
 */
async function cacheAlerts(alerts: Alert[]): Promise<void> {
  try {
    const data: CachedAlerts = {
      alerts,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.warn('[AlertScraper] Cache write error:', error);
  }
}

/**
 * Fetch all İzmir transit alerts from operator websites
 * Results are cached for 10 minutes to avoid excessive scraping
 */
export async function fetchIzmirAlerts(): Promise<Alert[]> {
  // Check cache first
  const cached = await getCachedAlerts();
  if (cached) return cached;

  logger.log('[AlertScraper] Fetching fresh alerts from operator websites...');

  // Fetch from all sources in parallel (with individual error handling)
  const [metroAlerts, izbanAlerts, eshotAlerts] = await Promise.all([
    scrapeIzmirMetro().catch(err => {
      logger.warn('[AlertScraper] Metro scrape failed:', err);
      captureException(err, { tags: { module: 'alerts', source: 'izmir_metro' } });
      return [] as Alert[];
    }),
    scrapeIzban().catch(err => {
      logger.warn('[AlertScraper] İZBAN scrape failed:', err);
      captureException(err, { tags: { module: 'alerts', source: 'izban' } });
      return [] as Alert[];
    }),
    scrapeEshot().catch(err => {
      logger.warn('[AlertScraper] ESHOT scrape failed:', err);
      captureException(err, { tags: { module: 'alerts', source: 'eshot' } });
      return [] as Alert[];
    }),
  ]);

  const allAlerts = [...metroAlerts, ...izbanAlerts, ...eshotAlerts];

  // Filter: only keep alerts that have a recent date in their text,
  // or severe alerts (cancellations/breakdowns are always relevant)
  const recentAlerts = allAlerts.filter(alert => {
    // Severe alerts (cancellations, breakdowns) always shown
    if (alert.severity === 'severe') return true;

    // For warning/info: check if the text contains a recent date
    const dateInText = extractDate(alert.description || alert.title);
    if (dateInText && isRecent(dateInText)) return true;

    // No date found and not severe → skip (likely old/permanent content)
    return false;
  });

  // Sort: severe first, then warning, then info
  const severityOrder = { severe: 0, warning: 1, info: 2 };
  recentAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Limit to most recent/important alerts
  const limitedAlerts = recentAlerts.slice(0, 20);

  logger.log(`[AlertScraper] Found ${limitedAlerts.length} recent alerts out of ${allAlerts.length} total (Metro: ${metroAlerts.length}, İZBAN: ${izbanAlerts.length}, ESHOT: ${eshotAlerts.length})`);

  // Cache results
  await cacheAlerts(limitedAlerts);

  return limitedAlerts;
}

/**
 * Clear the alert cache (useful after manual refresh)
 */
export async function clearAlertCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    logger.warn('[AlertScraper] Cache clear error:', error);
  }
}
