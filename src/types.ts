/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Walker {
  name: string;
  steps: number;
  miles: number;
  status: string; // e.g. "Walking", "Resting", "Summited Peak 1", "Finished"
  avatar: string; // emoji or design style
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface LiveUpdate {
  id: string;
  timestamp: string;
  author: string;
  text: string;
  image?: string; // base64 string
  coordinate?: Coordinate;
  type?: 'text' | 'summit' | 'photo' | 'start' | 'finish';
}

export interface AppStats {
  manualMode: boolean;
  manualMiles: number;
  manualSteps: number;
  manualProgress: number; // 0 - 100
  haGpsActive: boolean;
  haStepsActive: boolean;
  currentLat?: number;
  currentLng?: number;
  lastHaFetchSync?: string;
  lastHaFetchStatus?: string;
  sheetUrl?: string;
}

export interface DbState {
  passwordRequired: boolean;
  stats: AppStats;
  walkers: Walker[];
  updates: LiveUpdate[];
}
