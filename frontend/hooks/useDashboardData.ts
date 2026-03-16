import React, { useState, useEffect, useRef } from 'react';
import type { OverviewStat, LiveTelemetry } from 'types'; 

const defaultTelemetry: LiveTelemetry = {
    gps: { lat: 14.531120, lon: 121.057442 },
    altitude: 0,
    speed: 0,
    roll: 0,
    pitch: 0,
    heading: 345,
    signalStrength: -55,
    battery: { voltage: 16.8, percentage: 99 },
    satellites: 14,
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
      totalPipelineSpeedMs: 0
    },
    modes: {
      angle: false,
      positionHold: false,
      returnToHome: false,
      altitudeHold: false,
      headingHold: false,
      airmode: false,
      surface: false,
      mcBraking: false,
      beeper: false,
    }
};

export const useDashboardData = (isMissionActive: boolean) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 1. Separate States for Hardware (WebSocket) vs. AI (Fast-Lane)
  const [liveTelemetry, setLiveTelemetry] = useState<LiveTelemetry>(defaultTelemetry);
  const [fastLaneAi, setFastLaneAi] = useState(defaultTelemetry.aiStatus);
  const [aiLastUpdated, setAiLastUpdated] = useState(0); 
  
  const [stats, setStats] = useState({ totalFlights: 0, totalFlightTime: '0 Hours' });
  const socketRef = useRef<WebSocket | null>(null);

  const setArmedState = (shouldArm: boolean) => {
      if (isMissionActive && !shouldArm) {
          alert("Cannot disarm while a mission is active. Please end the mission first.");
          return;
      }
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'SET_ARM',
          payload: shouldArm
        }));
      } else {
        console.warn("WebSocket is not connected. Cannot send arm command.");
      }
  };

  // Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hardware WebSocket & Initial Stats Effect
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/sessions/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    };
    fetchStats();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = `${wsProtocol}//${window.location.host}/ws/live`;
    
    const socket = new WebSocket(wsHost);
    socketRef.current = socket;

    socket.onopen = () => console.log('WebSocket connected!');
    socket.onclose = () => console.log('WebSocket disconnected.');
    socket.onerror = (err) => console.error('WebSocket error:', err);

    socket.onmessage = (event) => {
      try {
        const telemetryData: LiveTelemetry = JSON.parse(event.data);
        setLiveTelemetry(telemetryData); 
      } catch (error) {
        console.error("Failed to parse telemetry:", error);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  // --- THE AI FAST-LANE FIX ---
  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        // MUST use absolute URL to hit the Python engine on port 5000
        const response = await fetch('http://127.0.0.1:5000/api/status');
        if (!response.ok) throw new Error("API Offline");
        
        const aiData = await response.json();
        setFastLaneAi(aiData);
        setAiLastUpdated(Date.now()); 
      } catch (error) {
        // Silently fail if the Python engine isn't running
      }
    };

    const aiInterval = setInterval(fetchAiStatus, 250); 
    return () => clearInterval(aiInterval);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const formattedDate = currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const overviewStats: Omit<OverviewStat, 'icon'>[] = [
      { 
        id: 'flights', 
        label: 'Total Flights', 
        value: `${stats.totalFlights} Flights`, 
        subtext: 'Completed Missions' 
      },
      { 
        id: 'flightTime', 
        label: 'Total Flight Time', 
        value: stats.totalFlightTime, 
        subtext: 'Accumulated drone flight duration' 
      },
      { 
        id: 'battery', 
        label: 'System Battery', 
        value: `${liveTelemetry.battery.percentage.toFixed(1)}%`, 
        subtext: liveTelemetry.battery.percentage > 20 ? 'Healthy' : 'Low' 
      },
  ];

  // --- FAULT-TOLERANT MERGE ---
  // If the Fast-Lane is updated within 2s, use it. Otherwise, fallback to WebSocket data.
  const isFastLaneHealthy = Date.now() - aiLastUpdated < 2000;
  
  const finalTelemetry = {
      ...liveTelemetry,
      aiStatus: isFastLaneHealthy ? fastLaneAi : liveTelemetry.aiStatus
  };

  return {
    overviewStats, 
    time: formattedTime, 
    date: formattedDate,
    liveTelemetry: finalTelemetry, 
    setArmedState
  };
};