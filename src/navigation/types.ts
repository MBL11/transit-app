/**
 * Navigation types
 * Centralized navigation parameter lists to avoid circular dependencies
 */

export type LinesStackParamList = {
  LinesList: undefined;
  LineDetails: { routeId: string };
  StopDetails: { stopId: string };
};

export type MapStackParamList = {
  MapView: undefined;
  StopDetails: { stopId: string };
  LineDetails: { routeId: string };
  Alerts: undefined;
};

export type SearchStackParamList = {
  SearchView: undefined;
  StopDetails: { stopId: string };
  LineDetails: { routeId: string };
};

export type RouteStackParamList = {
  RouteView: undefined;
  RouteDetails: { route: any };
  StopDetails: { stopId: string };
};

export type FavoritesStackParamList = {
  FavoritesList: undefined;
  StopDetails: { stopId: string };
  LineDetails: { routeId: string };
};

export type SettingsStackParamList = {
  SettingsView: undefined;
};

// Root tab navigator param list
export type RootTabParamList = {
  Map: undefined;
  Lines: undefined;
  SearchTab: undefined;
  Route: undefined;
  Favorites: undefined;
  Settings: undefined;
};

// Combined type for all possible navigation
export type RootStackParamList =
  & MapStackParamList
  & LinesStackParamList
  & SearchStackParamList
  & RouteStackParamList
  & FavoritesStackParamList
  & SettingsStackParamList;
