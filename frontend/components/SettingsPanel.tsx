import React, { useState } from 'react';

// --- Reusable Setting Components ---

interface SettingSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, description, children }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <h3 className="text-base font-bold text-gcs-text-dark dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">{description}</p>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

interface ToggleSettingProps {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, description, enabled, onToggle }) => (
    <div className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0 dark:border-gray-700">
        <div>
            <p className="font-semibold text-sm text-gcs-text-dark dark:text-gray-200">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <button 
            onClick={onToggle}
            className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 gcs-primary ${enabled ? 'bg-gcs-orange' : 'bg-gray-300'}`}
        >
            <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
    </div>
);

interface SelectSettingProps {
    label: string;
    description: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

const SelectSetting: React.FC<SelectSettingProps> = ({ label, description, options, value, onChange }) => (
     <div className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0 dark:border-gray-700">
        <div>
            <p className="font-semibold text-sm text-gcs-text-dark dark:text-gray-200">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-44 bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:ring-2 gcs-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);


// --- Main Settings Panel ---
interface SettingsPanelProps {
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    mapStyle: string;
    setMapStyle: (style: string) => void;
    theme: string;
    setTheme: (theme: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isDarkMode, onToggleDarkMode, mapStyle, setMapStyle, theme, setTheme }) => {
    // Dummy state for other settings
    const [units, setUnits] = useState('Metric');
    const [hudColor, setHudColor] = useState('Orange');
    const [autoSync, setAutoSync] = useState(true);
    const [showSaveMessage, setShowSaveMessage] = useState(false);

    // Effect to hide the message after a few seconds
    React.useEffect(() => {
        if (showSaveMessage) {
            const timer = setTimeout(() => {
                setShowSaveMessage(false);
            }, 3000); // Hide after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [showSaveMessage]);

    const handleSaveSettings = () => {
        // In a real application, you'd save these settings to a backend or more robust storage.
        // For now, they are already being saved/applied immediately (dark mode, map style).
        // This button will just provide visual feedback.
        setShowSaveMessage(true);
    };

    return (
        <div className="space-y-4 animate-fade-in h-full overflow-y-auto">
            <SettingSection title="General Settings" description="Customize the overall look and feel of the application.">
                <ToggleSetting 
                    label="Dark Mode"
                    description="Enable a darker theme for better viewing in low-light conditions."
                    enabled={isDarkMode}
                    onToggle={onToggleDarkMode}
                />
                <SelectSetting
                    label="Unit System"
                    description="Choose between Metric (m, m/s) and Imperial (ft, mph) units."
                    options={['Metric', 'Imperial']}
                    value={units}
                    onChange={setUnits}
                />
                <SelectSetting
                    label="GUI Color Theme"
                    description="Select the color theme for the application."
                    options={['purple', 'orange', 'blue', 'green', 'black']}
                    value={theme}
                    onChange={setTheme}
                />
            </SettingSection>

            <SettingSection title="Map & Flight Log Settings" description="Adjust preferences for the flight map and mission log views.">
                 <SelectSetting
                    label="Default Map Style"
                    description="Select the default map style for viewing GPS tracks."
                    options={['Default', 'Satellite', 'Streets', 'Topographic']}
                    value={mapStyle}
                    onChange={setMapStyle}
                />
                <SelectSetting
                    label="GPS Track Color"
                    description="Set the color of the drone's flight path on the map."
                    options={['Orange', 'Cyan', 'Lime Green', 'Yellow']}
                    value={'Orange'} // Placeholder
                    onChange={() => {}} // Placeholder
                />
            </SettingSection>

             <SettingSection title="Live Mission Settings" description="Configure the live telemetry and heads-up display.">
                <SelectSetting
                    label="HUD Color"
                    description="Change the color of the text overlay on the live camera feed."
                    options={['Orange', 'Green', 'White']}
                    value={hudColor}
                    onChange={setHudColor}
                />
                <div className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0 dark:border-gray-700">
                     <div>
                        <p className="font-semibold text-sm text-gcs-text-dark dark:text-gray-200">Low Battery Warning</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Set the threshold for low battery alerts (10-50%).</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <input type="number" defaultValue="20" min="10" max="50" className="w-16 text-center bg-white border border-gray-300 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:ring-2 gcs-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                         <span className="text-xs dark:text-gray-300">%</span>
                    </div>
                </div>
            </SettingSection>

             <SettingSection title="Data & Privacy" description="Manage your mission data and application settings.">
                <ToggleSetting 
                    label="Cloud Sync"
                    description="Automatically back up mission logs and settings to the cloud."
                    enabled={autoSync}
                    onToggle={() => setAutoSync(!autoSync)}
                />
            </SettingSection>
            
            <div className="flex justify-end gap-3 pb-4">
                 <button className="text-gray-600 font-bold text-sm py-2 px-6 rounded-lg transition-all duration-200 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">
                    Reset to Defaults
                </button>
                 <button className="text-white font-bold text-sm py-2 px-6 rounded-lg transition-all duration-200 bg-gcs-orange hover:opacity-90 shadow-lg shadow-gcs-orange/30 focus:outline-none focus:ring-2 focus:ring-offset-2 gcs-primary"
                    onClick={handleSaveSettings}
                >
                    Save Settings
                </button>
            </div>

            {showSaveMessage && (
                <div className="absolute bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-fast">
                    Settings saved successfully!
                </div>
            )}
        </div>
    );
};

export default SettingsPanel;