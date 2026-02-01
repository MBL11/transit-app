/**
 * Transit adapters registry
 * İzmir Transit App - ESHOT, Metro, İZBAN
 */

import { izmirAdapter } from './izmir';

export * from './izmir';

// Current active adapter (İzmir only for now)
// Can be extended for multi-city support later (Phase 6)

// Export the default adapter
export { izmirAdapter as defaultAdapter } from './izmir';

// Function to get the active adapter
export function getAdapter() {
  return izmirAdapter;
}
