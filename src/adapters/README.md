# Adapters

Ce dossier contient les adapters spécifiques à chaque ville.

## Structure

```
adapters/
├── adapter-factory.ts    # Factory pour sélectionner l'adapter actif
├── paris/                # Adapter Paris (MVP)
│   ├── paris-adapter.ts
│   ├── siri-client.ts
│   ├── alerts.ts
│   ├── config.ts
│   └── README.md
└── [future-cities]/      # Futurs adapters
```

## Adapter Actif

L'adapter utilisé par l'app est défini dans la variable d'environnement `ACTIVE_CITY` (voir `.env`).

Par défaut : **Paris**

## Créer un Nouvel Adapter

Voir le guide complet : [../docs/ADAPTERS.md](../docs/ADAPTERS.md)

### Quick Start

1. Créer le dossier `adapters/[ville]/`
2. Implémenter `TransitAdapter` interface
3. Ajouter la config (timezone, bbox, etc.)
4. Tester avec les données GTFS de la ville
5. Documenter les spécificités

## Adapters Disponibles

| Ville | Statut | GTFS | Temps Réel | Maintainer |
|-------|--------|------|------------|------------|
| Paris | ✅ Actif | ✅ | ✅ SIRI-Lite | - |
| Bucarest | 🔲 Planifié | ✅ | ✅ GTFS-RT | - |
| Ankara | 🔲 Planifié | Partiel | ✅ | - |

## Interface TransitAdapter

```typescript
interface TransitAdapter {
  readonly config: AdapterConfig;
  
  loadStops(): Promise<Stop[]>;
  loadRoutes(): Promise<Route[]>;
  loadTrips(): Promise<Trip[]>;
  
  getNextDepartures(stopId: string): Promise<NextDeparture[]>;
  getAlerts(): Promise<Alert[]>;
  
  getDataSource(): DataSource;
  getLastUpdate(): Date;
}
```

Tous les adapters doivent implémenter cette interface.
