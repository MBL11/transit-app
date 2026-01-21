/**
 * Route Screen State Reducer
 * Manages all state for RouteScreen using useReducer pattern
 */

import type { Stop } from '../../core/types/models';
import type { JourneyResult } from '../../core/types/routing';
import type { GeocodingResult } from '../../core/geocoding';
import type { RoutingPreferences } from '../../types/routing-preferences';
import { DEFAULT_PREFERENCES } from '../../types/routing-preferences';

// State type
export interface RouteScreenState {
  // Data loading
  stops: Stop[];
  loading: boolean;
  calculating: boolean;

  // Search modes
  fromMode: 'stop' | 'address';
  toMode: 'stop' | 'address';

  // Selected locations
  fromStop: Stop | null;
  toStop: Stop | null;
  fromAddress: GeocodingResult | null;
  toAddress: GeocodingResult | null;

  // Search UI states
  showFromSearch: boolean;
  showToSearch: boolean;
  showFromAddressSearch: boolean;
  showToAddressSearch: boolean;
  fromSearchQuery: string;
  toSearchQuery: string;

  // Time configuration
  timeMode: 'departure' | 'arrival';
  departureTime: Date;
  showTimePicker: boolean;

  // Results
  journeys: JourneyResult[];
  selectedRoute: JourneyResult | null;
  hasSearched: boolean;

  // Preferences
  preferences: RoutingPreferences;
  showFilters: boolean;
}

// Action types
export type RouteScreenAction =
  | { type: 'SET_STOPS'; payload: Stop[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'SET_FROM_MODE'; payload: 'stop' | 'address' }
  | { type: 'SET_TO_MODE'; payload: 'stop' | 'address' }
  | { type: 'TOGGLE_FROM_MODE' }
  | { type: 'TOGGLE_TO_MODE' }
  | { type: 'SELECT_FROM_STOP'; payload: Stop }
  | { type: 'SELECT_TO_STOP'; payload: Stop }
  | { type: 'SELECT_FROM_ADDRESS'; payload: GeocodingResult }
  | { type: 'SELECT_TO_ADDRESS'; payload: GeocodingResult }
  | { type: 'SWAP_LOCATIONS' }
  | { type: 'SHOW_FROM_SEARCH'; payload: boolean }
  | { type: 'SHOW_TO_SEARCH'; payload: boolean }
  | { type: 'SHOW_FROM_ADDRESS_SEARCH'; payload: boolean }
  | { type: 'SHOW_TO_ADDRESS_SEARCH'; payload: boolean }
  | { type: 'SET_FROM_SEARCH_QUERY'; payload: string }
  | { type: 'SET_TO_SEARCH_QUERY'; payload: string }
  | { type: 'SET_TIME_MODE'; payload: 'departure' | 'arrival' }
  | { type: 'SET_DEPARTURE_TIME'; payload: Date }
  | { type: 'ADJUST_DEPARTURE_TIME'; payload: number }
  | { type: 'SET_DEPARTURE_TO_NOW' }
  | { type: 'SHOW_TIME_PICKER'; payload: boolean }
  | { type: 'SET_JOURNEYS'; payload: JourneyResult[] }
  | { type: 'SELECT_ROUTE'; payload: JourneyResult | null }
  | { type: 'SET_HAS_SEARCHED'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: RoutingPreferences }
  | { type: 'SHOW_FILTERS'; payload: boolean };

// Initial state
export const initialState: RouteScreenState = {
  stops: [],
  loading: true,
  calculating: false,
  fromMode: 'stop',
  toMode: 'stop',
  fromStop: null,
  toStop: null,
  fromAddress: null,
  toAddress: null,
  showFromSearch: false,
  showToSearch: false,
  showFromAddressSearch: false,
  showToAddressSearch: false,
  fromSearchQuery: '',
  toSearchQuery: '',
  timeMode: 'departure',
  departureTime: new Date(),
  showTimePicker: false,
  journeys: [],
  selectedRoute: null,
  hasSearched: false,
  preferences: DEFAULT_PREFERENCES,
  showFilters: false,
};

// Reducer function
export function routeReducer(
  state: RouteScreenState,
  action: RouteScreenAction
): RouteScreenState {
  switch (action.type) {
    case 'SET_STOPS':
      return { ...state, stops: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_CALCULATING':
      return { ...state, calculating: action.payload };

    case 'SET_FROM_MODE':
      return {
        ...state,
        fromMode: action.payload,
        // Clear selection when switching modes
        fromStop: action.payload === 'stop' ? state.fromStop : null,
        fromAddress: action.payload === 'address' ? state.fromAddress : null,
      };

    case 'SET_TO_MODE':
      return {
        ...state,
        toMode: action.payload,
        // Clear selection when switching modes
        toStop: action.payload === 'stop' ? state.toStop : null,
        toAddress: action.payload === 'address' ? state.toAddress : null,
      };

    case 'TOGGLE_FROM_MODE':
      const newFromMode = state.fromMode === 'stop' ? 'address' : 'stop';
      return {
        ...state,
        fromMode: newFromMode,
        fromStop: newFromMode === 'stop' ? state.fromStop : null,
        fromAddress: newFromMode === 'address' ? state.fromAddress : null,
      };

    case 'TOGGLE_TO_MODE':
      const newToMode = state.toMode === 'stop' ? 'address' : 'stop';
      return {
        ...state,
        toMode: newToMode,
        toStop: newToMode === 'stop' ? state.toStop : null,
        toAddress: newToMode === 'address' ? state.toAddress : null,
      };

    case 'SELECT_FROM_STOP':
      return {
        ...state,
        fromStop: action.payload,
        showFromSearch: false,
      };

    case 'SELECT_TO_STOP':
      return {
        ...state,
        toStop: action.payload,
        showToSearch: false,
      };

    case 'SELECT_FROM_ADDRESS':
      return {
        ...state,
        fromAddress: action.payload,
        showFromAddressSearch: false,
      };

    case 'SELECT_TO_ADDRESS':
      return {
        ...state,
        toAddress: action.payload,
        showToAddressSearch: false,
      };

    case 'SWAP_LOCATIONS':
      return {
        ...state,
        fromMode: state.toMode,
        toMode: state.fromMode,
        fromStop: state.toStop,
        toStop: state.fromStop,
        fromAddress: state.toAddress,
        toAddress: state.fromAddress,
      };

    case 'SHOW_FROM_SEARCH':
      return {
        ...state,
        showFromSearch: action.payload,
        fromSearchQuery: action.payload ? '' : state.fromSearchQuery,
      };

    case 'SHOW_TO_SEARCH':
      return {
        ...state,
        showToSearch: action.payload,
        toSearchQuery: action.payload ? '' : state.toSearchQuery,
      };

    case 'SHOW_FROM_ADDRESS_SEARCH':
      return { ...state, showFromAddressSearch: action.payload };

    case 'SHOW_TO_ADDRESS_SEARCH':
      return { ...state, showToAddressSearch: action.payload };

    case 'SET_FROM_SEARCH_QUERY':
      return { ...state, fromSearchQuery: action.payload };

    case 'SET_TO_SEARCH_QUERY':
      return { ...state, toSearchQuery: action.payload };

    case 'SET_TIME_MODE':
      return { ...state, timeMode: action.payload };

    case 'SET_DEPARTURE_TIME':
      return { ...state, departureTime: action.payload };

    case 'ADJUST_DEPARTURE_TIME':
      const newTime = new Date(state.departureTime.getTime() + action.payload * 60000);
      return { ...state, departureTime: newTime };

    case 'SET_DEPARTURE_TO_NOW':
      return { ...state, departureTime: new Date() };

    case 'SHOW_TIME_PICKER':
      return { ...state, showTimePicker: action.payload };

    case 'SET_JOURNEYS':
      return {
        ...state,
        journeys: action.payload,
        selectedRoute: action.payload.length > 0 ? action.payload[0] : null,
      };

    case 'SELECT_ROUTE':
      return { ...state, selectedRoute: action.payload };

    case 'SET_HAS_SEARCHED':
      return { ...state, hasSearched: action.payload };

    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };

    case 'SHOW_FILTERS':
      return { ...state, showFilters: action.payload };

    default:
      return state;
  }
}
