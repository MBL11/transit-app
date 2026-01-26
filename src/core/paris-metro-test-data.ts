/**
 * Paris Metro Test Data
 * Realistic test data based on the actual Paris metro network
 * Includes lines 1, 4, 14 with real station names and coordinates
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// ============================================================================
// METRO LINES (route_type = 1)
// ============================================================================

export const METRO_ROUTES: Route[] = [
  {
    id: 'METRO_1',
    shortName: '1',
    longName: 'La Défense - Château de Vincennes',
    type: 1, // Metro
    color: 'FFCD00',
    textColor: '000000',
  },
  {
    id: 'METRO_4',
    shortName: '4',
    longName: 'Porte de Clignancourt - Mairie de Montrouge',
    type: 1,
    color: 'CF009E',
    textColor: 'FFFFFF',
  },
  {
    id: 'METRO_14',
    shortName: '14',
    longName: 'Saint-Denis Pleyel - Aéroport d\'Orly',
    type: 1,
    color: '62259D',
    textColor: 'FFFFFF',
  },
  {
    id: 'RER_A',
    shortName: 'A',
    longName: 'Saint-Germain-en-Laye / Cergy / Poissy - Boissy / Marne-la-Vallée',
    type: 2, // Rail
    color: 'E3051C',
    textColor: 'FFFFFF',
  },
  {
    id: 'BUS_38',
    shortName: '38',
    longName: 'Porte d\'Orléans - Gare du Nord',
    type: 3, // Bus
    color: '00AA55',
    textColor: 'FFFFFF',
  },
];

// ============================================================================
// METRO STATIONS (with real GPS coordinates)
// ============================================================================

export const METRO_STOPS: Stop[] = [
  // === Ligne 1 ===
  { id: 'STOP_LA_DEFENSE', name: 'La Défense', lat: 48.8919, lon: 2.2381, locationType: 0 },
  { id: 'STOP_ESPLANADE', name: 'Esplanade de La Défense', lat: 48.8879, lon: 2.2503, locationType: 0 },
  { id: 'STOP_PONT_NEUILLY', name: 'Pont de Neuilly', lat: 48.8848, lon: 2.2592, locationType: 0 },
  { id: 'STOP_SABLONS', name: 'Les Sablons', lat: 48.8814, lon: 2.2716, locationType: 0 },
  { id: 'STOP_PORTE_MAILLOT', name: 'Porte Maillot', lat: 48.8780, lon: 2.2823, locationType: 0 },
  { id: 'STOP_ARGENTINE', name: 'Argentine', lat: 48.8757, lon: 2.2892, locationType: 0 },
  { id: 'STOP_CDG_ETOILE', name: 'Charles de Gaulle - Étoile', lat: 48.8738, lon: 2.2950, locationType: 0 },
  { id: 'STOP_GEORGE_V', name: 'George V', lat: 48.8720, lon: 2.3008, locationType: 0 },
  { id: 'STOP_FRANKLIN_ROOSEVELT', name: 'Franklin D. Roosevelt', lat: 48.8689, lon: 2.3096, locationType: 0 },
  { id: 'STOP_CHAMPS_ELYSEES', name: 'Champs-Élysées - Clemenceau', lat: 48.8676, lon: 2.3140, locationType: 0 },
  { id: 'STOP_CONCORDE', name: 'Concorde', lat: 48.8656, lon: 2.3211, locationType: 0 },
  { id: 'STOP_TUILERIES', name: 'Tuileries', lat: 48.8645, lon: 2.3302, locationType: 0 },
  { id: 'STOP_PALAIS_ROYAL', name: 'Palais Royal - Musée du Louvre', lat: 48.8622, lon: 2.3367, locationType: 0 },
  { id: 'STOP_LOUVRE', name: 'Louvre - Rivoli', lat: 48.8609, lon: 2.3408, locationType: 0 },
  { id: 'STOP_CHATELET', name: 'Châtelet', lat: 48.8584, lon: 2.3475, locationType: 0 },
  { id: 'STOP_HOTEL_VILLE', name: 'Hôtel de Ville', lat: 48.8572, lon: 2.3514, locationType: 0 },
  { id: 'STOP_ST_PAUL', name: 'Saint-Paul', lat: 48.8551, lon: 2.3611, locationType: 0 },
  { id: 'STOP_BASTILLE', name: 'Bastille', lat: 48.8531, lon: 2.3691, locationType: 0 },
  { id: 'STOP_GARE_LYON', name: 'Gare de Lyon', lat: 48.8453, lon: 2.3739, locationType: 0 },
  { id: 'STOP_REUILLY', name: 'Reuilly - Diderot', lat: 48.8472, lon: 2.3866, locationType: 0 },
  { id: 'STOP_NATION', name: 'Nation', lat: 48.8485, lon: 2.3957, locationType: 0 },
  { id: 'STOP_VINCENNES', name: 'Château de Vincennes', lat: 48.8443, lon: 2.4403, locationType: 0 },

  // === Ligne 4 ===
  { id: 'STOP_CLIGNANCOURT', name: 'Porte de Clignancourt', lat: 48.8976, lon: 2.3445, locationType: 0 },
  { id: 'STOP_SIMPLON', name: 'Simplon', lat: 48.8940, lon: 2.3479, locationType: 0 },
  { id: 'STOP_MARCADET', name: 'Marcadet - Poissonniers', lat: 48.8915, lon: 2.3497, locationType: 0 },
  { id: 'STOP_CHATEAU_ROUGE', name: 'Château Rouge', lat: 48.8873, lon: 2.3493, locationType: 0 },
  { id: 'STOP_BARBES', name: 'Barbès - Rochechouart', lat: 48.8835, lon: 2.3494, locationType: 0 },
  { id: 'STOP_GARE_NORD', name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, locationType: 0 },
  { id: 'STOP_GARE_EST', name: 'Gare de l\'Est', lat: 48.8763, lon: 2.3579, locationType: 0 },
  { id: 'STOP_STRASBOURG', name: 'Strasbourg - Saint-Denis', lat: 48.8692, lon: 2.3546, locationType: 0 },
  { id: 'STOP_REAUMUR', name: 'Réaumur - Sébastopol', lat: 48.8662, lon: 2.3522, locationType: 0 },
  { id: 'STOP_ETIENNE_MARCEL', name: 'Étienne Marcel', lat: 48.8636, lon: 2.3488, locationType: 0 },
  { id: 'STOP_LES_HALLES', name: 'Les Halles', lat: 48.8622, lon: 2.3456, locationType: 0 },
  // Châtelet already exists (shared station)
  { id: 'STOP_CITE', name: 'Cité', lat: 48.8552, lon: 2.3465, locationType: 0 },
  { id: 'STOP_ST_MICHEL', name: 'Saint-Michel', lat: 48.8536, lon: 2.3442, locationType: 0 },
  { id: 'STOP_ODEON', name: 'Odéon', lat: 48.8519, lon: 2.3391, locationType: 0 },
  { id: 'STOP_ST_GERMAIN', name: 'Saint-Germain-des-Prés', lat: 48.8532, lon: 2.3334, locationType: 0 },
  { id: 'STOP_ST_SULPICE', name: 'Saint-Sulpice', lat: 48.8510, lon: 2.3308, locationType: 0 },
  { id: 'STOP_ST_PLACIDE', name: 'Saint-Placide', lat: 48.8467, lon: 2.3269, locationType: 0 },
  { id: 'STOP_MONTPARNASSE', name: 'Montparnasse - Bienvenüe', lat: 48.8428, lon: 2.3216, locationType: 0 },
  { id: 'STOP_VAVIN', name: 'Vavin', lat: 48.8421, lon: 2.3289, locationType: 0 },
  { id: 'STOP_RASPAIL', name: 'Raspail', lat: 48.8390, lon: 2.3306, locationType: 0 },
  { id: 'STOP_DENFERT', name: 'Denfert-Rochereau', lat: 48.8337, lon: 2.3326, locationType: 0 },
  { id: 'STOP_MOUTON', name: 'Mouton-Duvernet', lat: 48.8316, lon: 2.3305, locationType: 0 },
  { id: 'STOP_ALESIA', name: 'Alésia', lat: 48.8282, lon: 2.3268, locationType: 0 },
  { id: 'STOP_PORTE_ORLEANS', name: 'Porte d\'Orléans', lat: 48.8233, lon: 2.3252, locationType: 0 },
  { id: 'STOP_MAIRIE_MONTROUGE', name: 'Mairie de Montrouge', lat: 48.8182, lon: 2.3195, locationType: 0 },

  // === Ligne 14 ===
  { id: 'STOP_ST_LAZARE', name: 'Saint-Lazare', lat: 48.8757, lon: 2.3251, locationType: 0 },
  { id: 'STOP_MADELEINE', name: 'Madeleine', lat: 48.8698, lon: 2.3245, locationType: 0 },
  { id: 'STOP_PYRAMIDES', name: 'Pyramides', lat: 48.8661, lon: 2.3343, locationType: 0 },
  // Châtelet already exists
  // Gare de Lyon already exists
  { id: 'STOP_BERCY', name: 'Bercy', lat: 48.8401, lon: 2.3795, locationType: 0 },
  { id: 'STOP_COUR_ST_EMILION', name: 'Cour Saint-Émilion', lat: 48.8334, lon: 2.3868, locationType: 0 },
  { id: 'STOP_BNF', name: 'Bibliothèque François Mitterrand', lat: 48.8299, lon: 2.3760, locationType: 0 },
  { id: 'STOP_OLYMPIADES', name: 'Olympiades', lat: 48.8271, lon: 2.3673, locationType: 0 },

  // === RER A stations (some shared) ===
  // La Défense already exists
  // Châtelet already exists
  // Gare de Lyon already exists
  // Nation already exists

  // === Bus 38 stops (subset) ===
  // Gare du Nord already exists
  // Châtelet already exists
  // Porte d'Orléans already exists
];

// ============================================================================
// TRIPS (Example trips for each line)
// ============================================================================

function generateTrips(): Trip[] {
  const trips: Trip[] = [];

  // Generate trips for Ligne 1 (both directions)
  for (let i = 0; i < 20; i++) {
    trips.push({
      id: `TRIP_M1_EST_${i}`,
      routeId: 'METRO_1',
      serviceId: 'DAILY',
      headsign: 'Château de Vincennes',
      directionId: 0,
    });
    trips.push({
      id: `TRIP_M1_OUEST_${i}`,
      routeId: 'METRO_1',
      serviceId: 'DAILY',
      headsign: 'La Défense',
      directionId: 1,
    });
  }

  // Generate trips for Ligne 4
  for (let i = 0; i < 20; i++) {
    trips.push({
      id: `TRIP_M4_SUD_${i}`,
      routeId: 'METRO_4',
      serviceId: 'DAILY',
      headsign: 'Mairie de Montrouge',
      directionId: 0,
    });
    trips.push({
      id: `TRIP_M4_NORD_${i}`,
      routeId: 'METRO_4',
      serviceId: 'DAILY',
      headsign: 'Porte de Clignancourt',
      directionId: 1,
    });
  }

  // Generate trips for Ligne 14
  for (let i = 0; i < 20; i++) {
    trips.push({
      id: `TRIP_M14_SUD_${i}`,
      routeId: 'METRO_14',
      serviceId: 'DAILY',
      headsign: 'Olympiades',
      directionId: 0,
    });
    trips.push({
      id: `TRIP_M14_NORD_${i}`,
      routeId: 'METRO_14',
      serviceId: 'DAILY',
      headsign: 'Saint-Lazare',
      directionId: 1,
    });
  }

  // RER A trips
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `TRIP_RERA_EST_${i}`,
      routeId: 'RER_A',
      serviceId: 'DAILY',
      headsign: 'Boissy-Saint-Léger',
      directionId: 0,
    });
    trips.push({
      id: `TRIP_RERA_OUEST_${i}`,
      routeId: 'RER_A',
      serviceId: 'DAILY',
      headsign: 'Saint-Germain-en-Laye',
      directionId: 1,
    });
  }

  // Bus 38 trips
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `TRIP_BUS38_SUD_${i}`,
      routeId: 'BUS_38',
      serviceId: 'DAILY',
      headsign: 'Porte d\'Orléans',
      directionId: 0,
    });
    trips.push({
      id: `TRIP_BUS38_NORD_${i}`,
      routeId: 'BUS_38',
      serviceId: 'DAILY',
      headsign: 'Gare du Nord',
      directionId: 1,
    });
  }

  return trips;
}

// ============================================================================
// STOP TIMES (schedules)
// ============================================================================

function generateStopTimes(): StopTime[] {
  const stopTimes: StopTime[] = [];

  // Ligne 1 stops in order (East direction)
  const ligne1StopsEast = [
    'STOP_LA_DEFENSE', 'STOP_ESPLANADE', 'STOP_PONT_NEUILLY', 'STOP_SABLONS',
    'STOP_PORTE_MAILLOT', 'STOP_ARGENTINE', 'STOP_CDG_ETOILE', 'STOP_GEORGE_V',
    'STOP_FRANKLIN_ROOSEVELT', 'STOP_CHAMPS_ELYSEES', 'STOP_CONCORDE',
    'STOP_TUILERIES', 'STOP_PALAIS_ROYAL', 'STOP_LOUVRE', 'STOP_CHATELET',
    'STOP_HOTEL_VILLE', 'STOP_ST_PAUL', 'STOP_BASTILLE', 'STOP_GARE_LYON',
    'STOP_REUILLY', 'STOP_NATION', 'STOP_VINCENNES'
  ];

  // Ligne 4 stops in order (South direction)
  const ligne4StopsSouth = [
    'STOP_CLIGNANCOURT', 'STOP_SIMPLON', 'STOP_MARCADET', 'STOP_CHATEAU_ROUGE',
    'STOP_BARBES', 'STOP_GARE_NORD', 'STOP_GARE_EST', 'STOP_STRASBOURG',
    'STOP_REAUMUR', 'STOP_ETIENNE_MARCEL', 'STOP_LES_HALLES', 'STOP_CHATELET',
    'STOP_CITE', 'STOP_ST_MICHEL', 'STOP_ODEON', 'STOP_ST_GERMAIN',
    'STOP_ST_SULPICE', 'STOP_ST_PLACIDE', 'STOP_MONTPARNASSE', 'STOP_VAVIN',
    'STOP_RASPAIL', 'STOP_DENFERT', 'STOP_MOUTON', 'STOP_ALESIA',
    'STOP_PORTE_ORLEANS', 'STOP_MAIRIE_MONTROUGE'
  ];

  // Ligne 14 stops in order (South direction)
  const ligne14StopsSouth = [
    'STOP_ST_LAZARE', 'STOP_MADELEINE', 'STOP_PYRAMIDES', 'STOP_CHATELET',
    'STOP_GARE_LYON', 'STOP_BERCY', 'STOP_COUR_ST_EMILION', 'STOP_BNF',
    'STOP_OLYMPIADES'
  ];

  // RER A stops (simplified)
  const rerAStopsEast = [
    'STOP_LA_DEFENSE', 'STOP_CDG_ETOILE', 'STOP_CHATELET', 'STOP_GARE_LYON', 'STOP_NATION'
  ];

  // Bus 38 stops (simplified)
  const bus38StopsSouth = [
    'STOP_GARE_NORD', 'STOP_CHATELET', 'STOP_ST_MICHEL', 'STOP_PORTE_ORLEANS'
  ];

  // Generate stop times for each trip (coverage from 6h to 23h)
  for (let tripNum = 0; tripNum < 20; tripNum++) {
    // Ligne 1 East - spread trips across the day
    const baseHourM1 = 6 + tripNum; // 6h, 7h, 8h... up to 25h (1h next day)
    const baseMinuteM1 = 0;

    ligne1StopsEast.forEach((stopId, index) => {
      const minutes = baseMinuteM1 + index * 2; // 2 min between stations
      const hours = baseHourM1 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M1_EST_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // Ligne 1 West (reverse)
    ligne1StopsEast.slice().reverse().forEach((stopId, index) => {
      const minutes = baseMinuteM1 + 10 + index * 2;
      const hours = baseHourM1 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M1_OUEST_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // Ligne 4 South - spread trips across the day
    const baseHourM4 = 6 + tripNum;
    const baseMinuteM4 = 10; // Offset by 10 min from ligne 1

    ligne4StopsSouth.forEach((stopId, index) => {
      const minutes = baseMinuteM4 + index * 2;
      const hours = baseHourM4 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M4_SUD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // Ligne 4 North (reverse)
    ligne4StopsSouth.slice().reverse().forEach((stopId, index) => {
      const minutes = baseMinuteM4 + 10 + index * 2;
      const hours = baseHourM4 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M4_NORD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // Ligne 14 South - spread trips across the day
    const baseHourM14 = 6 + tripNum;
    const baseMinuteM14 = 20; // Offset by 20 min

    ligne14StopsSouth.forEach((stopId, index) => {
      const minutes = baseMinuteM14 + index * 3; // 3 min between stations (faster line)
      const hours = baseHourM14 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M14_SUD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // Ligne 14 North (reverse)
    ligne14StopsSouth.slice().reverse().forEach((stopId, index) => {
      const minutes = baseMinuteM14 + 10 + index * 3;
      const hours = baseHourM14 + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_M14_NORD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });
  }

  // RER A (10 trips)
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const baseHour = 6 + Math.floor(tripNum / 2);
    const baseMinute = (tripNum % 2) * 30;

    // East
    rerAStopsEast.forEach((stopId, index) => {
      const minutes = baseMinute + index * 5;
      const hours = baseHour + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_RERA_EST_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // West
    rerAStopsEast.slice().reverse().forEach((stopId, index) => {
      const minutes = baseMinute + 15 + index * 5;
      const hours = baseHour + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_RERA_OUEST_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });
  }

  // Bus 38 (10 trips)
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const baseHour = 7 + Math.floor(tripNum / 2);
    const baseMinute = (tripNum % 2) * 30;

    // South
    bus38StopsSouth.forEach((stopId, index) => {
      const minutes = baseMinute + index * 10;
      const hours = baseHour + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_BUS38_SUD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });

    // North
    bus38StopsSouth.slice().reverse().forEach((stopId, index) => {
      const minutes = baseMinute + 15 + index * 10;
      const hours = baseHour + Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;

      stopTimes.push({
        tripId: `TRIP_BUS38_NORD_${tripNum}`,
        arrivalTime: time,
        departureTime: time,
        stopId,
        stopSequence: index + 1,
      });
    });
  }

  return stopTimes;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const METRO_TRIPS = generateTrips();
export const METRO_STOP_TIMES = generateStopTimes();

/**
 * Get all test data
 */
export function getParisMetroTestData() {
  return {
    stops: METRO_STOPS,
    routes: METRO_ROUTES,
    trips: METRO_TRIPS,
    stopTimes: METRO_STOP_TIMES,
  };
}
