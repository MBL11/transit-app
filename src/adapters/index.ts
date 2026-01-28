/**
 * Transit adapters registry
 * İzmir Transit App - ESHOT, Metro, İZBAN
 */

import { izmirAdapter } from './izmir';

export * from './izmir';

// Export the default adapter (İzmir)
export { izmirAdapter as defaultAdapter } from './izmir';

// Function to get the active adapter
export function getAdapter() {
  return izmirAdapter;
}
