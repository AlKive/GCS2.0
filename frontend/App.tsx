import React, { useState, useEffect } from 'react';

// ---

import Sidebar, { View } from './components/ControlPanel'; 
import DashboardHeader from './components/Header'; 
import LiveMissionViewNew from './components/LiveMissionViewNew';
import DashboardView from './components/DashboardView';
import AnalyticsPanel from './components/AnalyticsPanel';
import FlightLogsPanel from './components/FlightLogsPanel';
import SettingsPanel from './components/SettingsPanel';
import MissionSetupView from './components/MissionSetupView';
import GuidePanel from './components/GuidePanel';
import AboutPanel from './components/AboutPanel';
import DroneStreamView from './components/DroneStreamView';

import { useDashboardData } from './hooks/useDashboardData';
import type { Mission, BreedingSiteInfo, MissionPlan, LiveTelemetry } from 'types';
// ---

const App: React.FC = () => {
  const [isMissionActive, setMissionActive] = useState(false);
  const [missionPlan, setMissionPlan] = useState<MissionPlan | null>(null);
  const [isDarkMode, setDarkMode] = useState(false);
  const [mapStyle, setMapStyle] = useState(() => {
    return localStorage.getItem('mapStyle') || 'Satellite';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'orange';
  });

  useEffect(() => {
    localStorage.setItem('mapStyle', mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    const oldTheme = localStorage.getItem('theme');
    if (oldTheme) {
      document.documentElement.classList.remove(`theme-${oldTheme}`);
    }
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 1. Start with an empty array
  const [missions, setMissions] = useState<Mission[]>([]); 
  const { overviewStats, time, date, liveTelemetry, setArmedState } = useDashboardData(isMissionActive);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // 2. Fetch missions from the backend when the app loads
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/missions'); // Uses the vite proxy
        
        // ---
        // 3. CRASH FIX
        // This checks for 500 errors and prevents the "missions.slice" crash
        // ---
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // ---

        const data: Mission[] = await response.json();
        setMissions(data);
      } catch (error) {
        console.error("Failed to fetch missions:", error);
        // On error, set missions to an empty array so the app doesn't crash
        setMissions([]); 
      }
    };
    fetchMissions();
  }, []); // The empty array means this runs only once

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // 4. This function now SAVES the mission to the backend
  const endMission = async (duration: string | number, gpsTrack: { lat: number; lon: number }[], detectedSites: BreedingSiteInfo[]) => {
    const formattedDuration = typeof duration === 'number' 
        ? `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`
        : duration;

    const newMission: Omit<Mission, 'id'> = { // The database will create the 'id'
        name: missionPlan?.name || `Mission ${missions.length + 1}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        duration: formattedDuration,
        status: 'Completed',
        location: 'Live Location',
        gpsTrack,
        detectedSites,
    };

    try {
      // Send the new mission data to the backend
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const savedMission: Mission = await response.json(); // Get the final mission back
      setMissions(prevMissions => [savedMission, ...prevMissions]); // Add it to the list
    } catch (error) {
      console.error("Failed to save mission:", error);
    }

    setMissionActive(false);
    setMissionPlan(null);
  };
  
  // helper that tells backend to start the external Python helpers
  const launchPythonHelpers = async () => {
    try {
      await fetch('/api/mission/start', { method: 'POST' });
    } catch (err) {
      console.error('Failed to launch helper scripts:', err);
    }
  };

  const handleLaunchMission = async (plan: MissionPlan) => {
    setMissionPlan(plan);
    setCurrentView('dashboard');
    setMissionActive(true);

    // fire off the python processes (do not await so UI is instant)
    launchPythonHelpers();
  };

  const handleOpenMissionSetup = () => {
    setCurrentView('droneStream');
  };

  const renderView = () => {
    switch (currentView) {
      case 'analytics':
        return <AnalyticsPanel missions={missions} />;
      case 'flightLogs':
        return <FlightLogsPanel missions={missions} mapStyle={mapStyle} />;
      case 'settings':
        return <SettingsPanel 
          isDarkMode={isDarkMode} 
          onToggleDarkMode={() => setDarkMode(!isDarkMode)} 
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          theme={theme}
          setTheme={setTheme}
        />;
      case 'guide':
        return <GuidePanel />;
      case 'about':
        return <AboutPanel />;
      case 'droneStream':
        return <DroneStreamView telemetry={liveTelemetry} onClose={() => setCurrentView('dashboard')} mapStyle={mapStyle} />;
      case 'dashboard':
      default:
        return <DashboardView overviewStats={overviewStats} missions={missions} onMissionSetup={handleOpenMissionSetup} telemetry={liveTelemetry} setArmedState={setArmedState} />;
    }
  };
  
  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    flightLogs: 'Flight Logs',
    settings: 'Settings',
    guide: 'Guide',
    about: 'About Project',
    droneStream: 'Drone Stream',
  };

  return (
    <div className="flex h-screen bg-gcs-background text-gcs-text-dark font-sans dark:bg-gcs-dark dark:text-gcs-text-light overflow-hidden">
      {currentView !== 'droneStream' && <Sidebar currentView={currentView} onNavigate={setCurrentView} />}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        {currentView !== 'droneStream' && <DashboardHeader time={time} date={date} title={viewTitles[currentView]} batteryPercentage={liveTelemetry.battery.percentage} />}
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderView()}
        </div>
      </main>
      
      {isMissionActive && <LiveMissionViewNew telemetry={liveTelemetry} onEndMission={endMission} mapStyle={mapStyle} />}
    </div>
  );
};

export default App;
