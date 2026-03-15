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

export interface FlightSession {
  id: string;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'aborted';
  // Joined data from locations table
  location: { barangay_name: string; city: string } | null; 
  // Joined arrays from your telemetry and logs
  hardware_telemetry?: { latitude: number; longitude: number; altitude_lidar_m: number }[];
  target_detections?: { id: string; target_class: string; detected_at: string; image_url?: string }[];
  spray_logs?: { id: string; trigger_type: string; spray_duration_seconds: number; triggered_at: string }[];
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
    flightTime: string;
    distanceFromHome: number;
    flightMode: string;
    armed: boolean;
    verticalSpeed: number;
    breedingSiteDetected: boolean;
    currentBreedingSite?: BreedingSiteInfo;
    detectedSites: BreedingSiteInfo[];
    gpsTrack: { lat: number; lon: number }[];
    
    // --- AI & Sprayer Info ---
    aiStatus: {
      sharpnessScore: number;
      isSharpEnough: boolean;
      trackingProgress: number; // 0 to 5 seconds
      waterConfirmed: boolean;
      activeTarget?: string;
      totalPipelineSpeedMs: number;
    };

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
}
