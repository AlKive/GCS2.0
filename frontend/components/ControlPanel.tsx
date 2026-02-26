import React from 'react';

const Logo = () => (
    <div className="w-24 h-24 mx-auto mb-2">
        <img src="/logo.png?v=1" alt="Mosquito Control Drone Logo" className="w-full h-full object-contain" />
    </div>
);
const DashboardIcon = () => <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const AnalyticsIcon = () => <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M16,11V3H8v8H2v2h2v2H2v2h6v-2h2v2h8v-2h-2v-2h2V11H16z M10,5h2v6h-2V5z M6,13H4v-2h2V13z M6,17H4v-2h2V17z M14,13h-2v6h2V13z M20,13h-2v-2h2V13z M20,17h-2v-2h2V17z"/></svg>;
const LogsIcon = () => <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>;
const SettingsIcon = () => <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>;
const GuideIcon = () => <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h12v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const AboutIcon = () => <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" ></path></svg>;

type View = 'dashboard' | 'analytics' | 'flightLogs' | 'settings' | 'guide' | 'about';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    view: View;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex w-full items-center px-4 py-3 text-lg rounded-xl transition-colors duration-200 ${active ? 'bg-white text-gcs-text-dark shadow-lg' : 'text-gcs-text-light hover:bg-gray-700/50'}`}>
    {icon}
    <span>{label}</span>
  </button>
);

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-80 bg-gcs-dark text-white flex-col p-6 hidden lg:flex">
      <div className="text-center mb-10">
        <Logo />
        <h1 className="text-xl font-semibold mt-4 text-gray-300">Ground Control System</h1>
      </div>
      <nav className="flex flex-col space-y-3">
        <NavItem icon={<DashboardIcon />} label="Dashboard" view="dashboard" active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
        <NavItem icon={<AnalyticsIcon />} label="Analytics" view="analytics" active={currentView === 'analytics'} onClick={() => onNavigate('analytics')} />
        <NavItem icon={<LogsIcon />} label="Flight Logs" view="flightLogs" active={currentView === 'flightLogs'} onClick={() => onNavigate('flightLogs')} />
        <NavItem icon={<SettingsIcon />} label="Settings" view="settings" active={currentView === 'settings'} onClick={() => onNavigate('settings')} />
        <NavItem icon={<GuideIcon />} label="Guide" view="guide" active={currentView === 'guide'} onClick={() => onNavigate('guide')} />
      </nav>
      <div className="mt-auto">
        <button onClick={() => onNavigate('about')} className={`flex w-full items-center justify-center px-4 py-2 rounded-lg transition-colors duration-200 ${currentView === 'about' ? 'text-gcs-primary font-semibold' : 'text-gray-400 hover:text-gcs-primary'}`}>
          <AboutIcon />
          <span>About Project</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;