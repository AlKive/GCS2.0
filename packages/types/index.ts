// Shared TypeScript types for GCS Application (3NF Normalized)
import React from 'react';

export type MissionStatus = 'active' | 'completed' | 'aborted';

// --- 3NF Reference Tables ---

export interface City {
  id: number;
  name: string;
}

export interface Barangay {
  id: number;
  city_id: number;
  name: string;
  city?: City; // Joined data
}

export interface TargetType {
  id: number;
  label: string;
  description?: string;
}

export interface User {
  id: string;
  full_name: string;
  role: 'Pilot' | 'LGU Personnel' | 'Sanitation Officer';
  email: string;
}

// --- Core Transactional Entities ---

export interface Detection {
    id: string;
    session_id: string;
    target_type_id: number;
    confidence: number;
    water_confirmed: boolean;
    latitude: number;
    longitude: number;
    lidar_m?: number;
    image_url?: string;
    created_at: string;
    // Joined data
    target_types?: TargetType;
}

export interface SprayOperation {
    id: string;
    session_id: string | null;
    detection_id: string;
    triggered_at: string;
    trigger_type: 'Manual' | 'Auto';
    duration_seconds: number;
    target_area_pixels?: number;
    true_area_scaled?: number;
}

export interface StreamHealth {
    id: string;
    session_id: string;
    logged_at: string;
    pi_ip: string;
    laptop_ip: string;
    stream_pid?: string;
    status: 'Healthy' | 'Missing/Restarting' | 'Disconnected' | 'Failed' | 'Stream Frozen' | 'Too Blurry';
}

export interface FlightSession {
  id: string;
  pilot_id: string | null;
  barangay_id: number | null;
  start_time: string;
  end_time: string | null;
  status: MissionStatus;
  session_name?: string;
  // Joined data
  barangays?: Barangay | null;
  users?: User | null;
  detections?: Detection[];
  hardware_telemetry?: HardwareTelemetry[];
  ai_performance_logs?: AiPerformanceLog[];
  spray_operations?: SprayOperation[];
  stream_health?: StreamHealth[];
}

// --- Telemetry (Time-Series) ---

export interface HardwareTelemetry {
  id: number;
  session_id: string;
  logged_at: string;
  latitude: number;
  longitude: number;
  altitude_lidar_m: number;
  battery_voltage: number;
  heading: number;
  is_armed: boolean;
}

export interface AiPerformanceLog {
  id: number;
  session_id: string;
  logged_at: string;
  sharpness_score: number;
  tracking_progress_percent: number;
  pipeline_speed_ms: number;
}

export interface BreedingSiteInfo {
    type: 'Enclosed' | 'Open';
    object: string; // e.g., 'Tires', 'Sewage', 'Pots'
    bbox: [number, number, number, number];
}

// --- GCS UI Components ---

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
    aiStatus: {
      sharpnessScore: number;
      isSharpEnough: boolean;
      trackingProgress: number; // 0 to 100
      waterConfirmed: boolean;
      activeTarget?: string;
      totalPipelineSpeedMs: number;
      gps_lat?: number;
      gps_lon?: number;
      lidar_m?: number;
      heading?: number;
      battery_voltage?: number;
      linkStatus: 'Healthy' | 'Lost';
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

export interface OverviewStat {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}
