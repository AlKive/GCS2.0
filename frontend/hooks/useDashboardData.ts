import { useState, useEffect, useRef } from 'react';
import type { OverviewStat, LiveTelemetry } from 'types'; 

const defaultTelemetry: LiveTelemetry = {
    gps: { lat: 14.531120, lon: 121.057442 },
    altitude: 0,
    speed: 0,
    roll: 0,
    pitch: 0,
    heading: 345,
    signalStrength: -55,
    battery: { voltage: 0, percentage: 0 },
    satellites: 0,
    flightTime: '00:00',
    distanceFromHome: 0,
    flightMode: 'Loiter',
    armed: false,
    verticalSpeed: 0,
    breedingSiteDetected: false,
    detectedSites: [],
    gpsTrack: [],
    aiStatus: {
      sharpnessScore: 0,
      isSharpEnough: false,
      trackingProgress: 0,
      waterConfirmed: false,
      activeTarget: undefined,
      totalPipelineSpeedMs: 0,
      lidar_m: 0,
      linkStatus: 'Healthy',
    },
    modes: {
      angle: false, positionHold: false, returnToHome: false,
      altitudeHold: false, headingHold: false, airmode: false,
      surface: false, mcBraking: false, beeper: false,
    }
};

export const useDashboardData = (isMissionActive: boolean) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveTelemetry, setLiveTelemetry] = useState<LiveTelemetry>(defaultTelemetry);
  const [fastLaneAi, setFastLaneAi] = useState<Partial<LiveTelemetry>>({});
  const [aiLastUpdated, setAiLastUpdated] = useState(0); 
  const [stats, setStats] = useState({ totalFlights: 0, totalFlightTime: '0 Hours' });
  const socketRef = useRef<WebSocket | null>(null);

  const setArmedState = (shouldArm: boolean) => {
      if (isMissionActive && !shouldArm) {
          alert("Cannot disarm while a mission is active. Please end the mission first.");
          return;
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'SET_ARM', payload: shouldArm }));
      }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Primary Hardware WebSocket
  useEffect(() => {
    fetch('http://localhost:8080/api/sessions/stats').then(res => res.json()).then(setStats).catch(() => {});

    const wsHost = 'ws://localhost:8080/ws/live';
    const socket = new WebSocket(wsHost);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        setLiveTelemetry(JSON.parse(event.data)); 
      } catch (error) {}
    };

    return () => socket.close();
  }, [isMissionActive]);

  // AI Fast-Lane Data Fetcher
  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/status');
        if (!response.ok) return;
        
        const aiData = await response.json();
        
        // 6S LiPo Math: Max 25.2V, Nominal 22.2V, Empty ~21.0V
        const currentVolts = aiData.battery_voltage || aiData.voltage || 0;
        let battPercent = 0;
        if (currentVolts > 0) {
            battPercent = Math.max(0, Math.min(100, ((currentVolts - 21.0) / (25.2 - 21.0)) * 100));
        }

        const mappedTelemetry: Partial<LiveTelemetry> = {
            gps: { lat: aiData.gps_lat || 0, lon: aiData.gps_lon || 0 },
            altitude: aiData.lidar_m || aiData.altitude_m || 0, // <--- Barometer fallback
            heading: aiData.heading || 0,
            roll: aiData.roll || 0,         // <--- NEW
            pitch: aiData.pitch || 0,       // <--- NEW
            flightMode: aiData.flight_mode, // <--- NEW
            armed: aiData.is_armed || false,
            battery: currentVolts > 0 ? { voltage: currentVolts, percentage: battPercent } : undefined,
            aiStatus: {
                ...aiData,
                lidar_m: aiData.lidar_m
            }
        };

        setFastLaneAi(mappedTelemetry);
        setAiLastUpdated(Date.now()); 
      } catch (error) {}
    };

    const aiInterval = setInterval(fetchAiStatus, 250); 
    return () => clearInterval(aiInterval);
  }, []);

  // --- FAULT-TOLERANT MERGE ---
  const isFastLaneHealthy = Date.now() - aiLastUpdated < 2000;
  
  const finalTelemetry: LiveTelemetry = { ...liveTelemetry };
  
  if (isFastLaneHealthy) {
      // Overwrite ONLY the keys that the fast-lane actually provides
      if (fastLaneAi.gps) finalTelemetry.gps = fastLaneAi.gps;
      if (fastLaneAi.altitude) finalTelemetry.altitude = fastLaneAi.altitude;
      if (fastLaneAi.heading) finalTelemetry.heading = fastLaneAi.heading;
      if (fastLaneAi.armed !== undefined) finalTelemetry.armed = fastLaneAi.armed;
      if (fastLaneAi.battery) finalTelemetry.battery = fastLaneAi.battery;
      if (fastLaneAi.aiStatus) finalTelemetry.aiStatus = fastLaneAi.aiStatus;
  }

  // --- DISARMED OVERRIDE ---
  // If the drone is disarmed, force all visual flight modes to false
  if (!finalTelemetry.armed) {
      finalTelemetry.modes = {
          angle: false, positionHold: false, returnToHome: false,
          altitudeHold: false, headingHold: false, airmode: false,
          surface: false, mcBraking: false, beeper: false,
      };
  }

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const formattedDate = currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return {
    overviewStats: [
      { id: 'flights', label: 'Total Flights', value: `${stats.totalFlights} Flights`, subtext: 'Completed Missions' },
      { id: 'flightTime', label: 'Total Flight Time', value: stats.totalFlightTime, subtext: 'Accumulated drone flight duration' },
      { id: 'battery', label: 'System Battery', value: `${finalTelemetry.battery.percentage.toFixed(1)}%`, subtext: finalTelemetry.battery.percentage > 20 ? 'Healthy' : 'Low' },
    ], 
    time: formattedTime, 
    date: formattedDate,
    liveTelemetry: finalTelemetry, 
    setArmedState
  };
};