// Backend-specific types (without React dependencies)

export interface BreedingSiteInfo {
    type: 'Enclosed' | 'Open';
    object: string; // e.g., 'Tires', 'Sewage', 'Pots'
    bbox: [number, number, number, number];
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
