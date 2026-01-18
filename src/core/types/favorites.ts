import { Stop, Route } from './models';
import { JourneyResult } from './routing';

export type FavoriteType = 'stop' | 'route' | 'journey';

export interface FavoriteStop {
  type: 'stop';
  id: string;
  data: Stop;
  addedAt: number; // timestamp
}

export interface FavoriteRoute {
  type: 'route';
  id: string;
  data: Route;
  addedAt: number;
}

export interface FavoriteJourney {
  type: 'journey';
  id: string;
  data: {
    fromStopId: string;
    fromStopName: string;
    toStopId: string;
    toStopName: string;
  };
  addedAt: number;
}

export type Favorite = FavoriteStop | FavoriteRoute | FavoriteJourney;
