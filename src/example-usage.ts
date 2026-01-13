/**
 * Example usage of Paris Adapter
 * This demonstrates how to use the adapter in the app
 */

import { parisAdapter } from './adapters/paris';

/**
 * Example: Initialize and load data
 */
export async function exampleLoadData() {
  // Initialize adapter (creates database tables)
  await parisAdapter.initialize();

  // Load all stops
  const stops = await parisAdapter.loadStops();
  console.log(`Loaded ${stops.length} stops`);

  // Load all routes
  const routes = await parisAdapter.loadRoutes();
  console.log(`Loaded ${routes.length} routes`);

  // Get next departures for a specific stop
  if (stops.length > 0) {
    const departures = await parisAdapter.getNextDepartures(stops[0].id);
    console.log(`Next ${departures.length} departures from ${stops[0].name}`);
  }

  return { stops, routes };
}

/**
 * Example: Access adapter configuration
 */
export function exampleConfig() {
  const config = parisAdapter.config;
  console.log('City:', config.cityName);
  console.log('Timezone:', config.timezone);
  console.log('Default center:', config.defaultCenter);
  console.log('Bounding box:', config.boundingBox);

  const dataSource = parisAdapter.getDataSource();
  console.log('Data source:', dataSource.name);
  console.log('Attribution:', dataSource.attribution);
}
