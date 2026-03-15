import React from 'react';

const Logo = () => (
    <div className="w-24 h-24 mx-auto mb-4 relative group">
        <div className="absolute inset-0 bg-gcs-primary/10 rounded-full blur-xl group-hover:bg-gcs-primary/20 transition-all duration-700" />
        <img src="/logo.png" alt="Mosquito Control Drone Logo" className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_0_8px_var(--neon-glow)]" />
    </div>
);

const DashboardIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const AnalyticsIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const LogsIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>;
const DroneStreamIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const SettingsIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const GuideIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

export type View = 'dashboard' | 'analytics' | 'flightLogs' | 'settings' | 'guide' | 'about' | 'droneStream';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`group flex w-full items-center px-6 py-4 text-[10px] font-black font-mono uppercase tracking-[0.2em] transition-all duration-300 relative ${
        active 
        ? 'text-gcs-primary bg-white/5 shadow-2xl' 
        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
    }`}
  >
    {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gcs-primary shadow-[0_0_10px_var(--neon-glow)]" />
    )}
    <span className={`${active ? 'text-gcs-primary' : ''} transition-all`}>
        {icon}
    </span>
    <span>{label}</span>
  </button>
);

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-72 bg-black/40 backdrop-blur-xl flex flex-col hidden lg:flex border-r border-white/5 z-20 shadow-2xl transition-colors duration-300">
      <div className="p-10 text-center border-b border-white/5 bg-white/5">
        <Logo />
        <div className="mt-6">
            <h1 className="text-white font-black text-sm tracking-[0.3em] font-mono italic uppercase">LIPAD_GCS</h1>
            <p className="text-gcs-primary text-[8px] font-mono font-bold uppercase tracking-[0.4em] mt-1 opacity-60">TAC_NET_V4.0</p>
        </div>
      </div>

      <nav className="flex-1 pt-6 flex flex-col">
        <NavItem icon={<DashboardIcon />} label="DASHBOARD" active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
        <NavItem icon={<DroneStreamIcon />} label="DRONE STREAM" active={currentView === 'droneStream'} onClick={() => onNavigate('droneStream')} />
        <NavItem icon={<AnalyticsIcon />} label="ANALYTICS" active={currentView === 'analytics'} onClick={() => onNavigate('analytics')} />
        <NavItem icon={<LogsIcon />} label="FLIGHT LOGS" active={currentView === 'flightLogs'} onClick={() => onNavigate('flightLogs')} />
        <NavItem icon={<SettingsIcon />} label="SETTINGS" active={currentView === 'settings'} onClick={() => onNavigate('settings')} />
        <NavItem icon={<GuideIcon />} label="GUIDE" active={currentView === 'guide'} onClick={() => onNavigate('guide')} />
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
            onClick={() => onNavigate('about')} 
            className={`flex w-full items-center justify-center py-3 border border-white/10 rounded font-mono transition-all duration-300 ${
                currentView === 'about' 
                ? 'bg-gcs-primary text-slate-100 border-gcs-primary font-black shadow-[0_0_15px_var(--neon-glow)]' 
                : 'text-slate-600 hover:border-slate-600 hover:text-slate-300'
            }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest">ABOUT PROJECT</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
