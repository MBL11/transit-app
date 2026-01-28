/**
 * Transit adapters registry
 * İzmir Transit App - ESHOT, Metro, İZBAN
 */

import { parisAdapter } from './paris';
import { izmirAdapter } from './izmir';

export * from './paris';
export * from './izmir';

// Available adapters
export const adapters = {
  paris: parisAdapter,
  izmir: izmirAdapter,
};

// Current active city (can be changed via settings)
// Set to 'izmir' for İzmir Metro & Otobüs app
let activeCity: 'paris' | 'izmir' = 'izmir';

// Export the default adapter (İzmir for this app)
export { izmirAdapter as defaultAdapter } from './izmir';

// Function to get the active adapter
export function getAdapter() {
  return adapters[activeCity];
}

// Function to set the active city
export function setActiveCity(city: 'paris' | 'izmir') {
  activeCity = city;
}

// Function to get the active city
export function getActiveCity() {
  return activeCity;
}
