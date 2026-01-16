/**
 * Navigation types
 * Centralized navigation parameter lists to avoid circular dependencies
 */

export type LinesStackParamList = {
  LinesList: undefined;
  LineDetails: { routeId: string };
  StopDetails: { stopId: string };
};
