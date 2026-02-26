// FIX: Import React to provide types like ReactNode.
import React from 'react';

export type MissionStatus = 'Completed' | 'Interrupted' | 'In Progress';

export interface BreedingSiteInfo {
    type: 'Enclosed' | 'Open';
    object: string; // e.g., 'Tires', 'Sewage', 'Pots'
    bbox: [number, number, number, number];
}

export interface Mission {
  id: string | number;
  name: string;
  date: string;
  duration: string; // This will store total seconds as a string
  status: MissionStatus;
  location: string;
  gpsTrack?: { lat: number; lon: number }[];
  detectedSites?: BreedingSiteInfo[];
}

export interface OverviewStat {
  id:string;
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}

export interface LiveTelemetry {
    gps: {
        lat: number;
        lon: number;
    };
    altitude: number;
    speed: number;
    roll: number;
    pitch: number;
    heading: number;
    signalStrength: number;
    battery: {
        voltage: number;
        percentage: number;
    };
    satellites: number;
    flightTime: string; // This will be sent by the backend, but we'll ignore it
    distanceFromHome: number;
    flightMode: string;
    armed: boolean;
    verticalSpeed: number;
    breedingSiteDetected: boolean;
    currentBreedingSite?: BreedingSiteInfo;
    detectedSites: BreedingSiteInfo[];
    gpsTrack: { lat: number; lon: number }[];
    
    // --- THIS IS THE NEW PART ---
    // This will hold the status for your new 10-mode panel
    modes: {
      angle: boolean;
      positionHold: boolean;
      returnToHome: boolean;
      altitudeHold: boolean;
      headingHold: boolean;
      airmode: boolean;
      surface: boolean;
      mcBraking: boolean;
      beeper: boolean;
    }
    // --- END OF NEW PART ---
}

export interface MissionPlan {
  id?: string | number;
  name: string;
  waypoints: { lat: number; lon: number }[];
  altitude: number;
  speed: number;
}