/**
 * Transit adapters registry
 * Import and export all city adapters here
 */

export * from './paris';

// Export the default adapter (Paris for now)
export { parisAdapter as defaultAdapter } from './paris';

// Function to get the active adapter (can be extended for multi-city support)
export function getAdapter() {
  return defaultAdapter;
}
