import React, { useState, useEffect } from 'react';

// ---

import Sidebar, { View } from './components/ControlPanel'; 
import DashboardHeader from './components/Header'; 
import LiveMissionViewNew from './components/LiveMissionViewNew';
import DashboardView from './components/DashboardView';
import AnalyticsPanel from './components/AnalyticsPanel';
import FlightLogsPanel from './components/FlightLogsPanel';
import SettingsPanel from './components/SettingsPanel';
import GuidePanel from './components/GuidePanel';
import AboutPanel from './components/AboutPanel';
import DroneStreamView from './components/DroneStreamView';

import { useDashboardData } from './hooks/useDashboardData';
import type { FlightSession, BreedingSiteInfo, LiveTelemetry } from 'types';
// ---

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 3500);
    const completeTimer = setTimeout(() => onComplete(), 4500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] transition-all duration-1000 ease-in-out ${fadeOut ? 'opacity-0 scale-105' : 'opacity-100'}`}
    >
      {/* Futuristic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ef4444]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo with Scanning Aura */}
        <div className="w-56 h-56 mb-12 relative group">
          <div className="absolute inset-0 bg-[#ef4444] rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="absolute -inset-4 border border-[#94a3b8]/10 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute -inset-8 border border-[#ef4444]/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 overflow-hidden rounded-full z-20">
            <div className="w-full h-[2px] bg-[#ef4444] shadow-[0_0_15px_#ef4444] absolute top-0 animate-scan" />
          </div>

          <img src="/logo.png" alt="LIPAD Logo" className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
        </div>

        {/* Minimalist Typography */}
        <div className="text-center space-y-4 relative z-10 font-mono">
          <div className="overflow-hidden">
            <h1 className="text-5xl font-black tracking-[0.3em] text-[#ef4444] uppercase italic animate-slide-up drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              LIPAD
            </h1>
          </div>
          <div className="h-[1px] w-12 bg-slate-700 mx-auto" />
          <p className="text-slate-400 text-[10px] tracking-[0.6em] font-light uppercase opacity-70 animate-fade-in-delayed">
            GROUND_CONTROL_SYSTEM
          </p>
        </div>
      </div>
      
      {/* Sleek Laser Progress Bar */}
      <div className="absolute bottom-24 w-72 flex flex-col items-center gap-3">
        <div className="w-full h-[2px] bg-slate-800 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-transparent via-[#ef4444] to-slate-100 animate-progress-laser shadow-[0_0_10px_#ef4444]" />
        </div>
        <span className="text-[8px] font-mono text-[#ef4444]/60 tracking-[0.2em] uppercase">INITIALIZING_TACTICAL_LINK...</span>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes progress-laser {
          0% { width: 0%; left: -100%; }
          100% { width: 100%; left: 0%; }
        }
        @keyframes slide-up {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-progress-laser {
          animation: progress-laser 3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .animate-slide-up {
          animation: slide-up 1s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .animate-fade-in-delayed {
          animation: fadeIn 1s ease-out 0.8s forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          to { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [isAppLoading, setAppLoading] = useState(true);
  const [isMissionActive, setMissionActive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDarkMode, setDarkMode] = useState(false);
  const [mapStyle, setMapStyle] = useState(() => {
    return localStorage.getItem('mapStyle') || 'Satellite';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'red';
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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    }
  }, [isDarkMode]);

  const [sessions, setSessions] = useState<FlightSession[]>([]); 
  const { overviewStats, time, date, liveTelemetry, setArmedState } = useDashboardData(isMissionActive);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions'); 
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setSessions([]);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Update theme handling to use dynamic variables
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'red') {
      root.style.setProperty('--neon-primary', '#ef4444');
      root.style.setProperty('--neon-glow', 'rgba(239, 68, 68, 0.8)');
    } else if (theme === 'blue') {
      root.style.setProperty('--neon-primary', '#3b82f6');
      root.style.setProperty('--neon-glow', 'rgba(59, 130, 246, 0.8)');
    } else if (theme === 'amber') {
      root.style.setProperty('--neon-primary', '#f59e0b');
      root.style.setProperty('--neon-glow', 'rgba(245, 158, 11, 0.8)');
    } else if (theme === 'emerald') {
      root.style.setProperty('--neon-primary', '#10b981');
      root.style.setProperty('--neon-glow', 'rgba(16, 185, 129, 0.8)');
    } else if (theme === 'purple') {
      root.style.setProperty('--neon-primary', '#a855f7');
      root.style.setProperty('--neon-glow', 'rgba(168, 85, 247, 0.8)');
    } else if (theme === 'light') {
        // Switch to Light Mode
        setDarkMode(false);
    } else if (theme === 'dark') {
        // Switch to Dark Mode
        setDarkMode(true);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const endMission = async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      await fetchSessions();
    } catch (error) {
      console.error("Failed to end session:", error);
    }
    setMissionActive(false);
    setActiveSessionId(null);
  };
  
  const launchPythonHelpers = async () => {
    try {
      const response = await fetch('/api/system/start', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: 1 })
      });
      const data = await response.json();
      if (data.success && data.session_id) {
        setActiveSessionId(data.session_id);
        setMissionActive(true);
      }
    } catch (err) {
      console.error('Failed to launch system processes:', err);
    }
  };

  useEffect(() => {
    if (currentView === 'droneStream') {
      launchPythonHelpers();
    }
  }, [currentView]);

  const handleSaveSettings = (newSettings: { isDarkMode: boolean; mapStyle: string; theme: string }) => {
    setDarkMode(newSettings.isDarkMode);
    setMapStyle(newSettings.mapStyle);
    setTheme(newSettings.theme);
    localStorage.setItem('mapStyle', newSettings.mapStyle);
    // theme and isDarkMode are saved in their respective effects
  };

  const renderView = () => {
    switch (currentView) {
      case 'analytics':
        return <AnalyticsPanel sessions={sessions} />;
      case 'flightLogs':
        return <FlightLogsPanel sessions={sessions} />;
      case 'settings':
        return <SettingsPanel 
          currentDarkMode={isDarkMode}
          currentMapStyle={mapStyle}
          currentTheme={theme}
          onSave={handleSaveSettings}
        />;
      case 'guide':
        return <GuidePanel />;
      case 'about':
        return <AboutPanel />;
      case 'droneStream':
        return <DroneStreamView 
          telemetry={liveTelemetry} 
          onClose={() => setCurrentView('dashboard')} 
          mapStyle={mapStyle} 
        />;
      case 'dashboard':
      default:
        return <DashboardView 
          overviewStats={overviewStats} 
          sessions={sessions} 
          onMissionSetup={() => setCurrentView('droneStream')} 
          telemetry={liveTelemetry} 
          setArmedState={setArmedState} 
        />;
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
    <>
      {isAppLoading && <SplashScreen onComplete={() => setAppLoading(false)} />}
      <div className={`flex h-screen bg-gcs-dark text-slate-300 font-sans overflow-hidden antialiased theme-${theme}`}>
        {currentView !== 'droneStream' && <Sidebar currentView={currentView} onNavigate={setCurrentView} />}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {currentView !== 'droneStream' && (
            <DashboardHeader 
              time={time} 
              date={date} 
              title={viewTitles[currentView]} 
              batteryPercentage={liveTelemetry?.battery?.percentage ?? 0} 
            />
          )}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {renderView()}
          </div>
        </main>
        
        {isMissionActive && <LiveMissionViewNew telemetry={liveTelemetry} onEndMission={endMission} mapStyle={mapStyle} />}
      </div>
    </>
  );
};

export default App;
