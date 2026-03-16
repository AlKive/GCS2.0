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

export interface Location {
  id: number;
  barangay_name: string;
  city: string;
}

export interface User {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

export interface AiTelemetry {
  id: number;
  session_id: string;
  logged_at: string;
  sharpness_score: number;
  is_sharp_enough: boolean;
  tracking_progress_percent: number;
  water_confirmed: boolean;
  active_target: string | null;
  pipeline_speed_ms: number;
}

export interface HardwareTelemetry {
  id: number;
  session_id: string;
  logged_at: string;
  latitude: number;
  longitude: number;
  altitude_lidar_m: number;
  battery_voltage: number;
  signal_strength_dbm: number;
}

export interface SprayLog {
  id: number;
  session_id: string;
  triggered_at: string;
  trigger_type: string;
  target_area: number;
  spray_duration_seconds: number;
  detection_id: number | null;
}

export interface StreamHealth {
  id: number;
  session_id: string;
  logged_at: string;
  pi_ip: string;
  laptop_ip: string;
  stream_pid: number | null;
  status: string;
}

export interface TargetDetection {
  id: number;
  session_id: string;
  detected_at: string;
  target_class: string;
  bounding_box_area: number;
  location: any; // postgis point or similar
  image_url: string | null;
}

export interface FlightSession {
  id: string;
  pilot_id: string | null;
  location_id: number | null;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'aborted';
  // Joined data
  location?: Location | null;
  users?: User | null; // Note: Supabase often returns single objects if linked
  ai_telemetry?: AiTelemetry[];
  hardware_telemetry?: HardwareTelemetry[];
  spray_logs?: SprayLog[];
  stream_health?: StreamHealth[];
  target_detections?: TargetDetection[];
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
