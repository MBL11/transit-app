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

  // Metro Line 3 (Olive)
  { id: 'M3', shortName: 'M3', longName: 'Pont de Levallois - Gallieni', type: 1, color: '837902', textColor: 'FFFFFF' },

  // Metro Line 4 (Purple)
  { id: 'M4', shortName: 'M4', longName: 'Porte de Clignancourt - Mairie de Montrouge', type: 1, color: 'BC1A8D', textColor: 'FFFFFF' },

  // Metro Line 5 (Orange)
  { id: 'M5', shortName: 'M5', longName: 'Bobigny - Place d\'Italie', type: 1, color: 'FF7E2E', textColor: '000000' },

  // Metro Line 6 (Green)
  { id: 'M6', shortName: 'M6', longName: 'Charles de Gaulle - Étoile - Nation', type: 1, color: '79BB92', textColor: '000000' },

  // Metro Line 7 (Pink)
  { id: 'M7', shortName: 'M7', longName: 'La Courneuve - Villejuif', type: 1, color: 'F3A4BA', textColor: '000000' },

  // Metro Line 8 (Lilac)
  { id: 'M8', shortName: 'M8', longName: 'Balard - Pointe du Lac', type: 1, color: 'E19BDF', textColor: '000000' },

  // Metro Line 9 (Yellow-Green)
  { id: 'M9', shortName: 'M9', longName: 'Pont de Sèvres - Mairie de Montreuil', type: 1, color: 'D5C900', textColor: '000000' },

  // Metro Line 11 (Brown)
  { id: 'M11', shortName: 'M11', longName: 'Châtelet - Mairie des Lilas', type: 1, color: '704B1C', textColor: 'FFFFFF' },

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

  // Metro Line 3 - Key Stations (passes through République)
  { id: 'M3_VILLIERS', name: 'Villiers', lat: 48.8810, lon: 2.3155, locationType: 0, parentStation: undefined },
  { id: 'M3_EUROPE', name: 'Europe', lat: 48.8790, lon: 2.3227, locationType: 0, parentStation: undefined },
  { id: 'M3_STLAZARE3', name: 'Saint-Lazare', lat: 48.8760, lon: 2.3260, locationType: 0, parentStation: undefined },
  { id: 'M3_HAVRE3', name: 'Havre - Caumartin', lat: 48.8734, lon: 2.3278, locationType: 0, parentStation: undefined },
  { id: 'M3_OPERA3', name: 'Opéra', lat: 48.8710, lon: 2.3318, locationType: 0, parentStation: undefined },
  { id: 'M3_QUATRE', name: 'Quatre-Septembre', lat: 48.8697, lon: 2.3375, locationType: 0, parentStation: undefined },
  { id: 'M3_BOURSE', name: 'Bourse', lat: 48.8686, lon: 2.3410, locationType: 0, parentStation: undefined },
  { id: 'M3_SENTIER', name: 'Sentier', lat: 48.8674, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'M3_REAUMUR3', name: 'Réaumur - Sébastopol', lat: 48.8663, lon: 2.3522, locationType: 0, parentStation: undefined },
  { id: 'M3_ARTSETM', name: 'Arts et Métiers', lat: 48.8653, lon: 2.3560, locationType: 0, parentStation: undefined },
  { id: 'M3_TEMPLE', name: 'Temple', lat: 48.8665, lon: 2.3612, locationType: 0, parentStation: undefined },
  { id: 'M3_REPUBLIQUE', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
  { id: 'M3_PARMENTIER', name: 'Parmentier', lat: 48.8653, lon: 2.3745, locationType: 0, parentStation: undefined },
  { id: 'M3_RUESTVMAUR', name: 'Rue Saint-Maur', lat: 48.8640, lon: 2.3808, locationType: 0, parentStation: undefined },
  { id: 'M3_PERELACHA', name: 'Père Lachaise', lat: 48.8628, lon: 2.3865, locationType: 0, parentStation: undefined },
  { id: 'M3_GAMBETTA', name: 'Gambetta', lat: 48.8650, lon: 2.3985, locationType: 0, parentStation: undefined },
  { id: 'M3_GALLIENI', name: 'Gallieni', lat: 48.8635, lon: 2.4160, locationType: 0, parentStation: undefined },

  // Metro Line 5 - Key Stations (passes through République)
  { id: 'M5_BOBIGNY', name: 'Bobigny - Pablo Picasso', lat: 48.9065, lon: 2.4490, locationType: 0, parentStation: undefined },
  { id: 'M5_EGLISED', name: 'Église de Pantin', lat: 48.8950, lon: 2.4120, locationType: 0, parentStation: undefined },
  { id: 'M5_OURCQ', name: 'Ourcq', lat: 48.8875, lon: 2.3860, locationType: 0, parentStation: undefined },
  { id: 'M5_LAUMIERE', name: 'Laumière', lat: 48.8850, lon: 2.3790, locationType: 0, parentStation: undefined },
  { id: 'M5_JAURES', name: 'Jaurès', lat: 48.8822, lon: 2.3707, locationType: 0, parentStation: undefined },
  { id: 'M5_STALINGRAD', name: 'Stalingrad', lat: 48.8840, lon: 2.3660, locationType: 0, parentStation: undefined },
  { id: 'M5_GAREDN5', name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, locationType: 0, parentStation: undefined },
  { id: 'M5_GARDEST5', name: 'Gare de l\'Est', lat: 48.8767, lon: 2.3594, locationType: 0, parentStation: undefined },
  { id: 'M5_JACQUESB', name: 'Jacques Bonsergent', lat: 48.8710, lon: 2.3615, locationType: 0, parentStation: undefined },
  { id: 'M5_REPUBLIQUE', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
  { id: 'M5_OBERKAMPF', name: 'Oberkampf', lat: 48.8647, lon: 2.3680, locationType: 0, parentStation: undefined },
  { id: 'M5_RICHARD', name: 'Richard-Lenoir', lat: 48.8590, lon: 2.3718, locationType: 0, parentStation: undefined },
  { id: 'M5_BREGUET', name: 'Bréguet - Sabin', lat: 48.8560, lon: 2.3710, locationType: 0, parentStation: undefined },
  { id: 'M5_BASTILLE5', name: 'Bastille', lat: 48.8530, lon: 2.3690, locationType: 0, parentStation: undefined },
  { id: 'M5_QUAIRA', name: 'Quai de la Rapée', lat: 48.8460, lon: 2.3665, locationType: 0, parentStation: undefined },
  { id: 'M5_GAREDEL5', name: 'Gare d\'Austerlitz', lat: 48.8420, lon: 2.3645, locationType: 0, parentStation: undefined },
  { id: 'M5_STMARCEL', name: 'Saint-Marcel', lat: 48.8382, lon: 2.3610, locationType: 0, parentStation: undefined },
  { id: 'M5_ITALIE', name: 'Place d\'Italie', lat: 48.8310, lon: 2.3553, locationType: 0, parentStation: undefined },

  // Metro Line 8 - Key Stations (passes through République)
  { id: 'M8_BALARD', name: 'Balard', lat: 48.8365, lon: 2.2785, locationType: 0, parentStation: undefined },
  { id: 'M8_LOURMEL', name: 'Lourmel', lat: 48.8388, lon: 2.2820, locationType: 0, parentStation: undefined },
  { id: 'M8_COMMERCE', name: 'Commerce', lat: 48.8445, lon: 2.2935, locationType: 0, parentStation: undefined },
  { id: 'M8_GRENELLE8', name: 'La Motte-Picquet - Grenelle', lat: 48.8489, lon: 2.2981, locationType: 0, parentStation: undefined },
  { id: 'M8_ECOLE', name: 'École Militaire', lat: 48.8550, lon: 2.3058, locationType: 0, parentStation: undefined },
  { id: 'M8_LATOUR', name: 'La Tour-Maubourg', lat: 48.8575, lon: 2.3100, locationType: 0, parentStation: undefined },
  { id: 'M8_INVALIDES', name: 'Invalides', lat: 48.8614, lon: 2.3147, locationType: 0, parentStation: undefined },
  { id: 'M8_CONCORDE8', name: 'Concorde', lat: 48.8656, lon: 2.3212, locationType: 0, parentStation: undefined },
  { id: 'M8_MADELEINE8', name: 'Madeleine', lat: 48.8701, lon: 2.3247, locationType: 0, parentStation: undefined },
  { id: 'M8_OPERA8', name: 'Opéra', lat: 48.8710, lon: 2.3318, locationType: 0, parentStation: undefined },
  { id: 'M8_RICHELIEU8', name: 'Richelieu - Drouot', lat: 48.8717, lon: 2.3397, locationType: 0, parentStation: undefined },
  { id: 'M8_GRANDSBOUL', name: 'Grands Boulevards', lat: 48.8714, lon: 2.3439, locationType: 0, parentStation: undefined },
  { id: 'M8_BONNE8', name: 'Bonne Nouvelle', lat: 48.8704, lon: 2.3499, locationType: 0, parentStation: undefined },
  { id: 'M8_STRASBOURG8', name: 'Strasbourg - Saint-Denis', lat: 48.8695, lon: 2.3545, locationType: 0, parentStation: undefined },
  { id: 'M8_REPUBLIQUE', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
  { id: 'M8_FILLESD', name: 'Filles du Calvaire', lat: 48.8631, lon: 2.3665, locationType: 0, parentStation: undefined },
  { id: 'M8_STSEBASF', name: 'Saint-Sébastien - Froissart', lat: 48.8610, lon: 2.3680, locationType: 0, parentStation: undefined },
  { id: 'M8_CHEMIN', name: 'Chemin Vert', lat: 48.8575, lon: 2.3685, locationType: 0, parentStation: undefined },
  { id: 'M8_BASTILLE8', name: 'Bastille', lat: 48.8530, lon: 2.3690, locationType: 0, parentStation: undefined },
  { id: 'M8_LEDRU', name: 'Ledru-Rollin', lat: 48.8510, lon: 2.3760, locationType: 0, parentStation: undefined },

  // Metro Line 11 - Key Stations (passes through République)
  { id: 'M11_CHATELET11', name: 'Châtelet', lat: 48.8583, lon: 2.3470, locationType: 0, parentStation: undefined },
  { id: 'M11_HOTELD11', name: 'Hôtel de Ville', lat: 48.8571, lon: 2.3517, locationType: 0, parentStation: undefined },
  { id: 'M11_RAMBUTEAU', name: 'Rambuteau', lat: 48.8610, lon: 2.3538, locationType: 0, parentStation: undefined },
  { id: 'M11_ARTSM11', name: 'Arts et Métiers', lat: 48.8653, lon: 2.3560, locationType: 0, parentStation: undefined },
  { id: 'M11_REPUBLIQUE', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
  { id: 'M11_GONCOURT', name: 'Goncourt', lat: 48.8700, lon: 2.3705, locationType: 0, parentStation: undefined },
  { id: 'M11_BELLEVILLE', name: 'Belleville', lat: 48.8720, lon: 2.3770, locationType: 0, parentStation: undefined },
  { id: 'M11_PYRENEES', name: 'Pyrénées', lat: 48.8735, lon: 2.3850, locationType: 0, parentStation: undefined },
  { id: 'M11_JOURDAIN', name: 'Jourdain', lat: 48.8755, lon: 2.3895, locationType: 0, parentStation: undefined },
  { id: 'M11_PLACEFETES', name: 'Place des Fêtes', lat: 48.8770, lon: 2.3935, locationType: 0, parentStation: undefined },
  { id: 'M11_TELEGRAPH', name: 'Télégraphe', lat: 48.8755, lon: 2.3980, locationType: 0, parentStation: undefined },
  { id: 'M11_LILAS', name: 'Mairie des Lilas', lat: 48.8795, lon: 2.4165, locationType: 0, parentStation: undefined },

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

  // Metro Line 9 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M9_EAST_${i}`,
      routeId: 'M9',
      serviceId: 'WD',
      headsign: 'Mairie de Montreuil',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M9_WEST_${i}`,
      routeId: 'M9',
      serviceId: 'WD',
      headsign: 'Pont de Sèvres',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 3 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M3_EAST_${i}`,
      routeId: 'M3',
      serviceId: 'WD',
      headsign: 'Gallieni',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M3_WEST_${i}`,
      routeId: 'M3',
      serviceId: 'WD',
      headsign: 'Pont de Levallois',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 5 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M5_SOUTH_${i}`,
      routeId: 'M5',
      serviceId: 'WD',
      headsign: 'Place d\'Italie',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M5_NORTH_${i}`,
      routeId: 'M5',
      serviceId: 'WD',
      headsign: 'Bobigny - Pablo Picasso',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 8 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M8_EAST_${i}`,
      routeId: 'M8',
      serviceId: 'WD',
      headsign: 'Pointe du Lac',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M8_WEST_${i}`,
      routeId: 'M8',
      serviceId: 'WD',
      headsign: 'Balard',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 11 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M11_EAST_${i}`,
      routeId: 'M11',
      serviceId: 'WD',
      headsign: 'Mairie des Lilas',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M11_WEST_${i}`,
      routeId: 'M11',
      serviceId: 'WD',
      headsign: 'Châtelet',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // Metro Line 14 - Both directions
  for (let i = 0; i < 10; i++) {
    trips.push({
      id: `M14_SOUTH_${i}`,
      routeId: 'M14',
      serviceId: 'WD',
      headsign: 'Olympiades',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `M14_NORTH_${i}`,
      routeId: 'M14',
      serviceId: 'WD',
      headsign: 'Saint-Lazare',
      directionId: 1,
      shapeId: undefined,
    });
  }

  // RER A - Both directions
  for (let i = 0; i < 5; i++) {
    trips.push({
      id: `RERA_EAST_${i}`,
      routeId: 'RERA',
      serviceId: 'WD',
      headsign: 'Marne-la-Vallée',
      directionId: 0,
      shapeId: undefined,
    });
    trips.push({
      id: `RERA_WEST_${i}`,
      routeId: 'RERA',
      serviceId: 'WD',
      headsign: 'Saint-Germain-en-Laye',
      directionId: 1,
      shapeId: undefined,
    });
  }

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

  // Metro Line 9 - East direction (important: connects to République!)
  const m9EastStops = [
    'M9_TROCADERO9', 'M9_IENA', 'M9_ALMA', 'M9_FDROOS9', 'M9_STPHILIPPE',
    'M9_MIROMESNIL', 'M9_AUGUSTIN', 'M9_HAVRE', 'M9_CHAUSSEE', 'M9_RICHELIEU',
    'M9_GRANDS', 'M9_BONNE', 'M9_STRASBOURG9', 'M9_REPUBLIQUE', 'M9_VOLTAIRE',
    'M9_NATION9'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m9EastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M9_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 9 - West direction
  const m9WestStops = [...m9EastStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 3 + tripNum * 3;
    m9WestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M9_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 3 - East direction (passes through République)
  const m3EastStops = [
    'M3_VILLIERS', 'M3_EUROPE', 'M3_STLAZARE3', 'M3_HAVRE3', 'M3_OPERA3',
    'M3_QUATRE', 'M3_BOURSE', 'M3_SENTIER', 'M3_REAUMUR3', 'M3_ARTSETM',
    'M3_TEMPLE', 'M3_REPUBLIQUE', 'M3_PARMENTIER', 'M3_RUESTVMAUR',
    'M3_PERELACHA', 'M3_GAMBETTA', 'M3_GALLIENI'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 1 + tripNum * 3;
    m3EastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M3_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 3 - West direction
  const m3WestStops = [...m3EastStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m3WestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M3_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 5 - South direction (passes through République)
  const m5SouthStops = [
    'M5_BOBIGNY', 'M5_EGLISED', 'M5_OURCQ', 'M5_LAUMIERE', 'M5_JAURES',
    'M5_STALINGRAD', 'M5_GAREDN5', 'M5_GARDEST5', 'M5_JACQUESB', 'M5_REPUBLIQUE',
    'M5_OBERKAMPF', 'M5_RICHARD', 'M5_BREGUET', 'M5_BASTILLE5', 'M5_QUAIRA',
    'M5_GAREDEL5', 'M5_STMARCEL', 'M5_ITALIE'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 1 + tripNum * 3;
    m5SouthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M5_SOUTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 5 - North direction
  const m5NorthStops = [...m5SouthStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m5NorthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M5_NORTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 8 - East direction (passes through République)
  const m8EastStops = [
    'M8_BALARD', 'M8_LOURMEL', 'M8_COMMERCE', 'M8_GRENELLE8', 'M8_ECOLE',
    'M8_LATOUR', 'M8_INVALIDES', 'M8_CONCORDE8', 'M8_MADELEINE8', 'M8_OPERA8',
    'M8_RICHELIEU8', 'M8_GRANDSBOUL', 'M8_BONNE8', 'M8_STRASBOURG8', 'M8_REPUBLIQUE',
    'M8_FILLESD', 'M8_STSEBASF', 'M8_CHEMIN', 'M8_BASTILLE8', 'M8_LEDRU'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 1 + tripNum * 3;
    m8EastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M8_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 8 - West direction
  const m8WestStops = [...m8EastStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m8WestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M8_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 11 - East direction (passes through République)
  const m11EastStops = [
    'M11_CHATELET11', 'M11_HOTELD11', 'M11_RAMBUTEAU', 'M11_ARTSM11', 'M11_REPUBLIQUE',
    'M11_GONCOURT', 'M11_BELLEVILLE', 'M11_PYRENEES', 'M11_JOURDAIN',
    'M11_PLACEFETES', 'M11_TELEGRAPH', 'M11_LILAS'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 1 + tripNum * 3;
    m11EastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M11_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 11 - West direction
  const m11WestStops = [...m11EastStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m11WestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M11_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 2),
        departureTime: generateFutureTime(startOffset + idx * 2),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 14 - South direction
  const m14SouthStops = [
    'M14_STLAZARE', 'M14_MADELEINE', 'M14_PYRAMIDES14', 'M14_CHATELET14',
    'M14_GAREDEL14', 'M14_BERCY14', 'M14_COUR', 'M14_BIBLIO', 'M14_OLYMP'
  ];

  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 1 + tripNum * 3;
    m14SouthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M14_SOUTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 3), // Faster line, 3 min between stops
        departureTime: generateFutureTime(startOffset + idx * 3),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // Metro Line 14 - North direction
  const m14NorthStops = [...m14SouthStops].reverse();
  for (let tripNum = 0; tripNum < 10; tripNum++) {
    const startOffset = 2 + tripNum * 3;
    m14NorthStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `M14_NORTH_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 3),
        departureTime: generateFutureTime(startOffset + idx * 3),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // RER A - East direction
  const reraEastStops = [
    'RERA_DEFENSE', 'RERA_ETOILE', 'RERA_AUBER', 'RERA_CHATELET',
    'RERA_GAREDEL', 'RERA_NATION', 'RERA_VINCENNES'
  ];

  for (let tripNum = 0; tripNum < 5; tripNum++) {
    const startOffset = tripNum * 10; // Every 10 min
    reraEastStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `RERA_EAST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 4), // 4 min between RER stops
        departureTime: generateFutureTime(startOffset + idx * 4),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  // RER A - West direction
  const reraWestStops = [...reraEastStops].reverse();
  for (let tripNum = 0; tripNum < 5; tripNum++) {
    const startOffset = 5 + tripNum * 10;
    reraWestStops.forEach((stopId, idx) => {
      stopTimes.push({
        tripId: `RERA_WEST_${tripNum}`,
        arrivalTime: generateFutureTime(startOffset + idx * 4),
        departureTime: generateFutureTime(startOffset + idx * 4),
        stopId,
        stopSequence: idx + 1,
      });
    });
  }

  return stopTimes;
}
