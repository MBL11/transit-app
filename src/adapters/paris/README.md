# Adapter Paris (IDFM)

Adapter pour les données de transport d'Île-de-France Mobilités (IDFM).

## Sources de Données

### GTFS Statique
- **Provider** : Île-de-France Mobilités
- **URL** : https://prim.iledefrance-mobilites.fr
- **Contenu** : 1 900 lignes, 40 000 arrêts
- **Opérateurs** : RATP, SNCF, + 75 opérateurs
- **Mise à jour** : 3 fois par jour
- **Licence** : Licence Mobilités (gratuit, inscription requise)

### Temps Réel
- **Format** : SIRI-Lite (PAS GTFS-RT)
- **API** : `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring`
- **Données** :
  - ✅ Prochains passages en temps réel
  - ✅ Retards et avances
  - ✅ Alertes et perturbations
  - ⚠️ Positions véhicules (partiel)

### Bridge GTFS-RT (Alternatif)
- **Repo** : https://github.com/Jouca/IDFM_GTFS-RT
- **Usage** : Convertit SIRI-Lite → GTFS-Realtime
- **Note** : Non utilisé actuellement (on utilise SIRI directement)

## Configuration

```typescript
{
  cityName: 'Paris',
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'en'],
  timezone: 'Europe/Paris',
  boundingBox: [48.8156, 2.2241, 48.9022, 2.4699],
  defaultZoom: 12,
  defaultCenter: [48.8566, 2.3522],
}
```

## Obtenir une Clé API

1. Créer un compte sur [PRIM](https://prim.iledefrance-mobilites.fr)
2. Aller dans "Mon compte" → "Mes APIs"
3. Activer l'API "SIRI-Lite"
4. Copier la clé et l'ajouter dans `.env` :
   ```
   IDFM_API_KEY=ta_cle_ici
   ```

## Spécificités IDFM

### Format des Stop IDs

Les stop_id IDFM suivent ce format : `STIF:StopPoint:Q:123456:`

Pour l'API SIRI-Lite, utiliser : `MonitoringRef=STIF:StopPoint:Q:123456:`

### Zones Tarifaires

Les données GTFS incluent les zones (1-5) mais ce n'est **pas** implémenté dans le MVP car :
- Complexité spécifique à Paris
- Peu utile pour d'autres villes
- Peut être ajouté plus tard si besoin

### RER Partagés RATP/SNCF

Les lignes A et B du RER sont exploitées conjointement RATP/SNCF. Les `route_id` peuvent varier selon les tronçons.

## Format SIRI-Lite

### Exemple de Réponse

```xml
<Siri>
  <ServiceDelivery>
    <StopMonitoringDelivery>
      <MonitoredStopVisit>
        <MonitoredVehicleJourney>
          <LineRef>STIF:Line::C01742:</LineRef>
          <PublishedLineName>14</PublishedLineName>
          <DestinationName>Olympiades</DestinationName>
          <MonitoredCall>
            <StopPointRef>STIF:StopPoint:Q:41515:</StopPointRef>
            <AimedDepartureTime>2025-01-12T14:30:00+01:00</AimedDepartureTime>
            <ExpectedDepartureTime>2025-01-12T14:32:00+01:00</ExpectedDepartureTime>
            <DepartureStatus>delayed</DepartureStatus>
          </MonitoredCall>
        </MonitoredVehicleJourney>
      </MonitoredStopVisit>
    </StopMonitoringDelivery>
  </ServiceDelivery>
</Siri>
```

### Normalisation

```typescript
{
  tripId: "...",
  routeShortName: "14",
  headsign: "Olympiades",
  departureTime: new Date("2025-01-12T14:32:00+01:00"),
  scheduledTime: new Date("2025-01-12T14:30:00+01:00"),
  isRealtime: true,
  delay: 120, // secondes
}
```

## Limites et Contraintes

### Rate Limiting

- **Limite** : 100 requêtes/minute
- **Recommandation** : Cacher les réponses pendant 30 secondes
- **Stratégie** : Batch requests si possible

### Couverture Temps Réel

- ✅ Métro : ~100% couvert
- ✅ RER : ~95% couvert
- ✅ Bus : ~80% couvert (zones urbaines)
- ⚠️ Tramway : Variable
- ❌ Noctilien : Limité

### Données Manquantes

Certains petits opérateurs n'ont pas de temps réel. Dans ce cas, l'adapter retombe sur les horaires théoriques depuis GTFS.

## Alertes et Perturbations

Les alertes IDFM sont disponibles via l'endpoint SIRI General Message :

```
https://prim.iledefrance-mobilites.fr/marketplace/general-message
```

Format : XML SIRI-GM

## Performance

### Benchmarks

- Chargement GTFS : ~2 secondes (première fois)
- Base SQLite : ~85 MB
- Appel SIRI (1 arrêt) : ~300ms
- Mémoire utilisée : ~150 MB

### Optimisations

- GTFS est pré-parsé et stocké dans SQLite
- Les réponses SIRI sont cachées 30s
- Seuls les arrêts visibles sont chargés (tiles)

## Ressources

- [Documentation PRIM](https://prim.iledefrance-mobilites.fr/fr/apis)
- [Spec SIRI-Lite](http://www.siri.org.uk/schema/2.0/doc/Siri-Lite.pdf)
- [GTFS IDFM Schema](https://prim.iledefrance-mobilites.fr/fr/apis/gtfs)
- [Support IDFM](https://prim.iledefrance-mobilites.fr/fr/contact)

## Maintenance

**Dernière mise à jour** : Janvier 2025  
**Maintainer** : -  
**Statut** : ✅ Actif (MVP)
