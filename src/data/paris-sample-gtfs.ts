/**
 * Paris Sample GTFS Data
 * Compact dataset with key Paris metro lines and RER stations (~100 stops)
 * Perfect for testing routing without downloading 800MB
 */

import type { Route, Stop, Trip, StopTime } from '../core/types/models';

// Helper to generate future time strings for GTFS
function generateFutureTime(offsetMinutes: number): string {
  const now = new Date();
  const time = new Date(now.getTime() + offsetMinutes * 60000);
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

// Metro & RER Lines
export const PARIS_ROUTES: Route[] = [
  // Metro Line 1 (Yellow)
  { id: 'M1', shortName: 'M1', longName: 'La Défense - Château de Vincennes', type: 1, color: 'FFCD00', textColor: '000000' },

  // Metro Line 4 (Purple)
  { id: 'M4', shortName: 'M4', longName: 'Porte de Clignancourt - Mairie de Montrouge', type: 1, color: 'BC1A8D', textColor: 'FFFFFF' },

  // Metro Line 6 (Green)
  { id: 'M6', shortName: 'M6', longName: 'Charles de Gaulle - Étoile - Nation', type: 1, color: '79BB92', textColor: '000000' },

  // Metro Line 7 (Pink)
  { id: 'M7', shortName: 'M7', longName: 'La Courneuve - Villejuif', type: 1, color: 'F3A4BA', textColor: '000000' },

  // Metro Line 9 (Yellow-Green)
  { id: 'M9', shortName: 'M9', longName: 'Pont de Sèvres - Mairie de Montreuil', type: 1, color: 'D5C900', textColor: '000000' },

  // Metro Line 14 (Purple)
  { id: 'M14', shortName: 'M14', longName: 'Saint-Lazare - Olympiades', type: 1, color: '62259D', textColor: 'FFFFFF' },

  // RER A (Red)
  { id: 'RERA', shortName: 'RER A', longName: 'Saint-Germain-en-Laye - Marne-la-Vallée', type: 2, color: 'E4032E', textColor: 'FFFFFF' },

  // RER B (Blue)
  { id: 'RERB', shortName: 'RER B', longName: 'Aéroport CDG - Robinson/Saint-Rémy', type: 2, color: '5291CE', textColor: 'FFFFFF' },
];

// Key Paris Stops (~100 stations)
export const PARIS_STOPS: Stop[] = [
  // Metro Line 1 - West to East
  { id: 'M1_DEFENSE', name: 'La Défense', lat: 48.8920, lon: 2.2380, locationType: 0, parentStation: undefined },
  { id: 'M1_ESPLANADE', name: 'Esplanade de La Défense', lat: 48.8877, lon: 2.2504, locationType: 0, parentStation: undefined },
  { id: 'M1_NEUILLY', name: 'Pont de Neuilly', lat: 48.8850, lon: 2.2596, locationType: 0, parentStation: undefined },
  { id: 'M1_SABLONS', name: 'Les Sablons', lat: 48.8810, lon: 2.2730, locationType: 0, parentStation: undefined },
  { id: 'M1_MAILLOT', name: 'Porte Maillot', lat: 48.8779, lon: 2.2826, locationType: 0, parentStation: undefined },
  { id: 'M1_ARGENTINE', name: 'Argentine', lat: 48.8756, lon: 2.2896, locationType: 0, parentStation: undefined },
  { id: 'M1_ETOILE', name: 'Charles de Gaulle - Étoile', lat: 48.8738, lon: 2.2950, locationType: 0, parentStation: undefined },
  { id: 'M1_GEORGEV', name: 'George V', lat: 48.8720, lon: 2.3010, locationType: 0, parentStation: undefined },
  { id: 'M1_FDROOS', name: 'Franklin D. Roosevelt', lat: 48.8690, lon: 2.3099, locationType: 0, parentStation: undefined },
  { id: 'M1_CHAMPSELY', name: 'Champs-Élysées - Clemenceau', lat: 48.8677, lon: 2.3147, locationType: 0, parentStation: undefined },
  { id: 'M1_CONCORDE', name: 'Concorde', lat: 48.8656, lon: 2.3212, locationType: 0, parentStation: undefined },
  { id: 'M1_TUILERIES', name: 'Tuileries', lat: 48.8637, lon: 2.3297, locationType: 0, parentStation: undefined },
  { id: 'M1_PALAISROYAL', name: 'Palais Royal - Musée du Louvre', lat: 48.8618, lon: 2.3363, locationType: 0, parentStation: undefined },
  { id: 'M1_LOUVRE', name: 'Louvre - Rivoli', lat: 48.8607, lon: 2.3413, locationType: 0, parentStation: undefined },
  { id: 'M1_CHATELET', name: 'Châtelet', lat: 48.8583, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'M1_HOTELDEVILLE', name: 'Hôtel de Ville', lat: 48.8571, lon: 2.3517, locationType: 0, parentStation: undefined },
  { id: 'M1_STPAUL', name: 'Saint-Paul', lat: 48.8554, lon: 2.3606, locationType: 0, parentStation: undefined },
  { id: 'M1_BASTILLE', name: 'Bastille', lat: 48.8530, lon: 2.3690, locationType: 0, parentStation: undefined },
  { id: 'M1_GAREDEL', name: 'Gare de Lyon', lat: 48.8444, lon: 2.3739, locationType: 0, parentStation: undefined },
  { id: 'M1_REUILLY', name: 'Reuilly - Diderot', lat: 48.8470, lon: 2.3863, locationType: 0, parentStation: undefined },
  { id: 'M1_NATION', name: 'Nation', lat: 48.8480, lon: 2.3960, locationType: 0, parentStation: undefined },
  { id: 'M1_VINCENNES', name: 'Château de Vincennes', lat: 48.8441, lon: 2.4401, locationType: 0, parentStation: undefined },

  // Metro Line 4 - North to South
  { id: 'M4_CLIGNANCOURT', name: 'Porte de Clignancourt', lat: 48.8970, lon: 2.3440, locationType: 0, parentStation: undefined },
  { id: 'M4_SIMPLON', name: 'Simplon', lat: 48.8948, lon: 2.3478, locationType: 0, parentStation: undefined },
  { id: 'M4_MARCDORMOY', name: 'Marcadet - Poissonniers', lat: 48.8910, lon: 2.3500, locationType: 0, parentStation: undefined },
  { id: 'M4_CHATEAU', name: 'Château Rouge', lat: 48.8870, lon: 2.3492, locationType: 0, parentStation: undefined },
  { id: 'M4_BARBES', name: 'Barbès - Rochechouart', lat: 48.8835, lon: 2.3502, locationType: 0, parentStation: undefined },
  { id: 'M4_GARDENORD', name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, locationType: 0, parentStation: undefined },
  { id: 'M4_GARDEST', name: 'Gare de l\'Est', lat: 48.8767, lon: 2.3594, locationType: 0, parentStation: undefined },
  { id: 'M4_CHATEAUDEAU', name: 'Château d\'Eau', lat: 48.8726, lon: 2.3575, locationType: 0, parentStation: undefined },
  { id: 'M4_STRASBOURG', name: 'Strasbourg - Saint-Denis', lat: 48.8695, lon: 2.3545, locationType: 0, parentStation: undefined },
  { id: 'M4_REAUMUR', name: 'Réaumur - Sébastopol', lat: 48.8663, lon: 2.3522, locationType: 0, parentStation: undefined },
  { id: 'M4_ETIENNEMARCEL', name: 'Étienne Marcel', lat: 48.8633, lon: 2.3491, locationType: 0, parentStation: undefined },
  { id: 'M4_LHALLES', name: 'Les Halles', lat: 48.8619, lon: 2.3460, locationType: 0, parentStation: undefined },
  { id: 'M4_CITE', name: 'Cité', lat: 48.8555, lon: 2.3475, locationType: 0, parentStation: undefined },
  { id: 'M4_STMICHEL', name: 'Saint-Michel', lat: 48.8536, lon: 2.3439, locationType: 0, parentStation: undefined },
  { id: 'M4_ODEON', name: 'Odéon', lat: 48.8518, lon: 2.3392, locationType: 0, parentStation: undefined },
  { id: 'M4_STGERMAIN', name: 'Saint-Germain-des-Prés', lat: 48.8536, lon: 2.3334, locationType: 0, parentStation: undefined },
  { id: 'M4_STPLACIDE', name: 'Saint-Placide', lat: 48.8467, lon: 2.3273, locationType: 0, parentStation: undefined },
  { id: 'M4_MONTPARNASSE', name: 'Montparnasse - Bienvenüe', lat: 48.8422, lon: 2.3217, locationType: 0, parentStation: undefined },
  { id: 'M4_VAVIN', name: 'Vavin', lat: 48.8421, lon: 2.3290, locationType: 0, parentStation: undefined },
  { id: 'M4_RASPAIL', name: 'Raspail', lat: 48.8390, lon: 2.3302, locationType: 0, parentStation: undefined },
  { id: 'M4_DENFERT', name: 'Denfert-Rochereau', lat: 48.8339, lon: 2.3325, locationType: 0, parentStation: undefined },
  { id: 'M4_ALESIA', name: 'Alésia', lat: 48.8283, lon: 2.3268, locationType: 0, parentStation: undefined },
  { id: 'M4_MONTROUGE', name: 'Mairie de Montrouge', lat: 48.8178, lon: 2.3195, locationType: 0, parentStation: undefined },

  // Metro Line 6 - Key Stations
  { id: 'M6_ETOILE', name: 'Charles de Gaulle - Étoile', lat: 48.8738, lon: 2.2950, locationType: 0, parentStation: undefined },
  { id: 'M6_TROCADERO', name: 'Trocadéro', lat: 48.8631, lon: 2.2871, locationType: 0, parentStation: undefined },
  { id: 'M6_PASSEY', name: 'Passy', lat: 48.8574, lon: 2.2853, locationType: 0, parentStation: undefined },
  { id: 'M6_BIRHAKEIM', name: 'Bir-Hakeim', lat: 48.8538, lon: 2.2893, locationType: 0, parentStation: undefined },
  { id: 'M6_DUPLEIX', name: 'Dupleix', lat: 48.8502, lon: 2.2929, locationType: 0, parentStation: undefined },
  { id: 'M6_GRENELLE', name: 'La Motte-Picquet - Grenelle', lat: 48.8489, lon: 2.2981, locationType: 0, parentStation: undefined },
  { id: 'M6_CAMBRONNE', name: 'Cambronne', lat: 48.8476, lon: 2.3024, locationType: 0, parentStation: undefined },
  { id: 'M6_SEVRES', name: 'Sèvres - Lecourbe', lat: 48.8449, lon: 2.3102, locationType: 0, parentStation: undefined },
  { id: 'M6_PASTEUR', name: 'Pasteur', lat: 48.8430, lon: 2.3125, locationType: 0, parentStation: undefined },
  { id: 'M6_MONT6', name: 'Montparnasse - Bienvenüe', lat: 48.8422, lon: 2.3217, locationType: 0, parentStation: undefined },
  { id: 'M6_EDGAR', name: 'Edgar Quinet', lat: 48.8408, lon: 2.3252, locationType: 0, parentStation: undefined },
  { id: 'M6_DENFERT6', name: 'Denfert-Rochereau', lat: 48.8339, lon: 2.3325, locationType: 0, parentStation: undefined },
  { id: 'M6_PLACEITALIE', name: 'Place d\'Italie', lat: 48.8310, lon: 2.3553, locationType: 0, parentStation: undefined },
  { id: 'M6_BERCY', name: 'Bercy', lat: 48.8400, lon: 2.3789, locationType: 0, parentStation: undefined },
  { id: 'M6_NATION6', name: 'Nation', lat: 48.8480, lon: 2.3960, locationType: 0, parentStation: undefined },

  // Metro Line 7 - Key Stations
  { id: 'M7_OPERA', name: 'Opéra', lat: 48.8710, lon: 2.3318, locationType: 0, parentStation: undefined },
  { id: 'M7_PYRAMIDES', name: 'Pyramides', lat: 48.8663, lon: 2.3329, locationType: 0, parentStation: undefined },
  { id: 'M7_PALAISROYAL7', name: 'Palais Royal - Musée du Louvre', lat: 48.8618, lon: 2.3363, locationType: 0, parentStation: undefined },
  { id: 'M7_PONTNEUF', name: 'Pont Neuf', lat: 48.8584, lon: 2.3424, locationType: 0, parentStation: undefined },
  { id: 'M7_CHATELET7', name: 'Châtelet', lat: 48.8583, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'M7_PONTMARIE', name: 'Pont Marie', lat: 48.8537, lon: 2.3577, locationType: 0, parentStation: undefined },
  { id: 'M7_SULLYMOR', name: 'Sully - Morland', lat: 48.8514, lon: 2.3624, locationType: 0, parentStation: undefined },
  { id: 'M7_JULESJ', name: 'Jussieu', lat: 48.8460, lon: 2.3545, locationType: 0, parentStation: undefined },
  { id: 'M7_PLACEMON', name: 'Place Monge', lat: 48.8430, lon: 2.3521, locationType: 0, parentStation: undefined },

  // Metro Line 9 - Key Stations
  { id: 'M9_TROCADERO9', name: 'Trocadéro', lat: 48.8631, lon: 2.2871, locationType: 0, parentStation: undefined },
  { id: 'M9_IENA', name: 'Iéna', lat: 48.8643, lon: 2.2934, locationType: 0, parentStation: undefined },
  { id: 'M9_ALMA', name: 'Alma - Marceau', lat: 48.8647, lon: 2.3005, locationType: 0, parentStation: undefined },
  { id: 'M9_FDROOS9', name: 'Franklin D. Roosevelt', lat: 48.8690, lon: 2.3099, locationType: 0, parentStation: undefined },
  { id: 'M9_STPHILIPPE', name: 'Saint-Philippe du Roule', lat: 48.8717, lon: 2.3107, locationType: 0, parentStation: undefined },
  { id: 'M9_MIROMESNIL', name: 'Miromesnil', lat: 48.8734, lon: 2.3150, locationType: 0, parentStation: undefined },
  { id: 'M9_AUGUSTIN', name: 'Saint-Augustin', lat: 48.8747, lon: 2.3205, locationType: 0, parentStation: undefined },
  { id: 'M9_HAVRE', name: 'Havre - Caumartin', lat: 48.8734, lon: 2.3278, locationType: 0, parentStation: undefined },
  { id: 'M9_CHAUSSEE', name: 'Chaussée d\'Antin - La Fayette', lat: 48.8727, lon: 2.3336, locationType: 0, parentStation: undefined },
  { id: 'M9_RICHELIEU', name: 'Richelieu - Drouot', lat: 48.8717, lon: 2.3397, locationType: 0, parentStation: undefined },
  { id: 'M9_GRANDS', name: 'Grands Boulevards', lat: 48.8714, lon: 2.3439, locationType: 0, parentStation: undefined },
  { id: 'M9_BONNE', name: 'Bonne Nouvelle', lat: 48.8704, lon: 2.3499, locationType: 0, parentStation: undefined },
  { id: 'M9_STRASBOURG9', name: 'Strasbourg - Saint-Denis', lat: 48.8695, lon: 2.3545, locationType: 0, parentStation: undefined },
  { id: 'M9_REPUBLIQUE', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
  { id: 'M9_VOLTAIRE', name: 'Voltaire', lat: 48.8610, lon: 2.3794, locationType: 0, parentStation: undefined },
  { id: 'M9_NATION9', name: 'Nation', lat: 48.8480, lon: 2.3960, locationType: 0, parentStation: undefined },

  // Metro Line 14 - Key Stations
  { id: 'M14_STLAZARE', name: 'Saint-Lazare', lat: 48.8760, lon: 2.3260, locationType: 0, parentStation: undefined },
  { id: 'M14_MADELEINE', name: 'Madeleine', lat: 48.8701, lon: 2.3247, locationType: 0, parentStation: undefined },
  { id: 'M14_PYRAMIDES14', name: 'Pyramides', lat: 48.8663, lon: 2.3329, locationType: 0, parentStation: undefined },
  { id: 'M14_CHATELET14', name: 'Châtelet', lat: 48.8583, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'M14_GAREDEL14', name: 'Gare de Lyon', lat: 48.8444, lon: 2.3739, locationType: 0, parentStation: undefined },
  { id: 'M14_BERCY14', name: 'Bercy', lat: 48.8400, lon: 2.3789, locationType: 0, parentStation: undefined },
  { id: 'M14_COUR', name: 'Cour Saint-Émilion', lat: 48.8335, lon: 2.3848, locationType: 0, parentStation: undefined },
  { id: 'M14_BIBLIO', name: 'Bibliothèque François Mitterrand', lat: 48.8299, lon: 2.3758, locationType: 0, parentStation: undefined },
  { id: 'M14_OLYMP', name: 'Olympiades', lat: 48.8270, lon: 2.3669, locationType: 0, parentStation: undefined },

  // RER A - Key Stations
  { id: 'RERA_DEFENSE', name: 'La Défense', lat: 48.8920, lon: 2.2380, locationType: 0, parentStation: undefined },
  { id: 'RERA_ETOILE', name: 'Charles de Gaulle - Étoile', lat: 48.8738, lon: 2.2950, locationType: 0, parentStation: undefined },
  { id: 'RERA_AUBER', name: 'Auber', lat: 48.8734, lon: 2.3281, locationType: 0, parentStation: undefined },
  { id: 'RERA_CHATELET', name: 'Châtelet - Les Halles', lat: 48.8620, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'RERA_GAREDEL', name: 'Gare de Lyon', lat: 48.8444, lon: 2.3739, locationType: 0, parentStation: undefined },
  { id: 'RERA_NATION', name: 'Nation', lat: 48.8480, lon: 2.3960, locationType: 0, parentStation: undefined },
  { id: 'RERA_VINCENNES', name: 'Vincennes', lat: 48.8477, lon: 2.4387, locationType: 0, parentStation: undefined },

  // RER B - Key Stations
  { id: 'RERB_GARDENORD', name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, locationType: 0, parentStation: undefined },
  { id: 'RERB_CHATELET', name: 'Châtelet - Les Halles', lat: 48.8620, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'RERB_STMICHEL', name: 'Saint-Michel - Notre-Dame', lat: 48.8536, lon: 2.3439, locationType: 0, parentStation: undefined },
  { id: 'RERB_LUXEMBOURG', name: 'Luxembourg', lat: 48.8466, lon: 2.3390, locationType: 0, parentStation: undefined },
  { id: 'RERB_DENFERT', name: 'Denfert-Rochereau', lat: 48.8339, lon: 2.3325, locationType: 0, parentStation: undefined },
  { id: 'RERB_CITE', name: 'Cité Universitaire', lat: 48.8210, lon: 2.3372, locationType: 0, parentStation: undefined },
];

// Generate trips for each line
export function generateParisTrips(): Trip[] {
  const now = new Date();
  const trips: Trip[] = [];

  // Metro Line 1 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M1_EAST_${i}`,
      routeId: 'M1',
      serviceId: 'WD',
      headsign: 'Château de Vincennes',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M1_WEST_${i}`,
      routeId: 'M1',
      serviceId: 'WD',
      headsign: 'La Défense',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 4 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M4_NORTH_${i}`,
      routeId: 'M4',
      serviceId: 'WD',
      headsign: 'Porte de Clignancourt',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M4_SOUTH_${i}`,
      routeId: 'M4',
      serviceId: 'WD',
      headsign: 'Mairie de Montrouge',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Add more trips for other lines...
  return trips;
}

// Generate stop times with realistic intervals (metro every 2-3 min, RER every 5 min)
export function generateParisStopTimes(): StopTime[] {
  const stopTimes: StopTime[] = [];

  // Metro Line 1 - East direction (every 3 minutes)
  const m1EastStops = [
    'M1_DEFENSE', 'M1_ESPLANADE', 'M1_NEUILLY', 'M1_SABLONS', 'M1_MAILLOT',
    'M1_ARGENTINE', 'M1_ETOILE', 'M1_GEORGEV', 'M1_FDROOS', 'M1_CHAMPSELY',
    'M1_CONCORDE', 'M1_TUILERIES', 'M1_PALAISROYAL', 'M1_LOUVRE', 'M1_CHATELET',
    'M1_HOTELDEVILLE', 'M1_STPAUL', 'M1_BASTILLE', 'M1_GAREDEL', 'M1_REUILLY',
    'M1_NATION', 'M1_VINCENNES'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3; // Trains every 3 min
    m1EastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M1_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2), // 2 min between stops
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 1 - West direction
  const m1WestStops = [...m1EastStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 3 + tripNum * 3;
    m1WestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M1_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 4 - North direction
  const m4NorthStops = [
    'M4_MONTROUGE', 'M4_ALESIA', 'M4_DENFERT', 'M4_RASPAIL', 'M4_VAVIN',
    'M4_MONTPARNASSE', 'M4_STPLACIDE', 'M4_STGERMAIN', 'M4_ODEON', 'M4_STMICHEL',
    'M4_CITE', 'M4_LHALLES', 'M4_ETIENNEMARCEL', 'M4_REAUMUR', 'M4_STRASBOURG',
    'M4_CHATEAUDEAU', 'M4_GARDEST', 'M4_GARDENORD', 'M4_BARBES', 'M4_CHATEAU',
    'M4_MARCDORMOY', 'M4_SIMPLON', 'M4_CLIGNANCOURT'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 4 + tripNum * 3;
    m4NorthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M4_NORTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 4 - South direction
  const m4SouthStops = [...m4NorthStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 5 + tripNum * 3;
    m4SouthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M4_SOUTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  return stopTimes;
}
