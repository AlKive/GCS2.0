import React, { useState } from 'react';

interface SettingsPanelProps {
  currentDarkMode: boolean;
  currentMapStyle: string;
  currentTheme: string;
  onSave: (settings: { isDarkMode: boolean; mapStyle: string; theme: string }) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  currentDarkMode, 
  currentMapStyle, 
  currentTheme,
  onSave
}) => {
  // Local state for pending changes
  const [pendingDarkMode, setPendingDarkMode] = useState(currentDarkMode);
  const [pendingMapStyle, setPendingMapStyle] = useState(currentMapStyle);
  const [pendingTheme, setPendingTheme] = useState(currentTheme);

  const themes = [
    { id: 'red', name: 'NEO_RED', class: 'bg-red-500' },
    { id: 'blue', name: 'CYBER_BLUE', class: 'bg-blue-500' },
    { id: 'amber', name: 'AMBER_WARM', class: 'bg-amber-500' },
    { id: 'emerald', name: 'EMERALD_TOX', class: 'bg-emerald-500' },
    { id: 'purple', name: 'VOID_PURPLE', class: 'bg-purple-500' },
  ];

  const hasChanges = 
    pendingDarkMode !== currentDarkMode || 
    pendingMapStyle !== currentMapStyle || 
    pendingTheme !== currentTheme;

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in font-mono">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-main uppercase tracking-[0.2em] italic">SYSTEM_CONFIG_</h2>
          <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_var(--neon-glow)]" />
        </div>
        
        <button
          onClick={() => onSave({ isDarkMode: pendingDarkMode, mapStyle: pendingMapStyle, theme: pendingTheme })}
          disabled={!hasChanges}
          className={`px-8 py-3 rounded font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-xl ${
            hasChanges 
            ? 'bg-gcs-primary text-slate-100 neon-glow active:scale-95' 
            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          {hasChanges ? 'SAVE_CHANGES_' : 'CONFIG_SYNCHRONIZED'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Appearance & Mode */}
        <div className="bg-gcs-panel border border-main rounded-lg p-8 shadow-2xl flex flex-col gap-10">
          <section>
            <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gcs-primary" />
              LUMINANCE_PROTOCOL
            </h3>
            <div className="flex items-center justify-between p-6 bg-gcs-card/30 border border-main rounded-xl">
              <div>
                <p className="text-sm font-black text-main uppercase tracking-wider">Tactical_Dark_Mode</p>
                <p className="text-[10px] text-dim mt-1 uppercase">Toggle between Dark and Light interface cores</p>
              </div>
              <button
                onClick={() => setPendingDarkMode(!pendingDarkMode)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all focus:outline-none border-2 ${pendingDarkMode ? 'bg-slate-800 border-gcs-primary' : 'bg-white border-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${pendingDarkMode ? 'translate-x-8 bg-gcs-primary' : 'translate-x-1 bg-slate-400'}`} />
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gcs-primary" />
              MAP_TERRAIN_RENDER
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {['Satellite', 'Light', 'Dark', 'Outdoors'].map((style) => (
                <button
                  key={style}
                  onClick={() => setPendingMapStyle(style)}
                  className={`py-4 rounded font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                    pendingMapStyle === style 
                    ? 'bg-gcs-primary/10 border-gcs-primary text-main' 
                    : 'bg-gcs-card/30 border-main text-dim hover:border-slate-600'
                  }`}
                >
                  {style}_VIEW
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Theme Palette */}
        <div className="bg-gcs-panel border border-main rounded-lg p-8 shadow-2xl flex flex-col gap-8">
          <section>
            <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gcs-primary" />
              NEURAL_LINK_PALETTE
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPendingTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${pendingTheme === t.id ? 'bg-gcs-primary/10 border-gcs-primary shadow-[0_0_15px_var(--neon-glow)]' : 'bg-gcs-card/20 border-transparent hover:border-main'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${t.class}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${pendingTheme === t.id ? 'text-main' : 'text-dim'}`}>{t.name}</span>
                  </div>
                  {pendingTheme === t.id && <span className="text-[8px] font-black text-gcs-primary">ACTIVE_SELECTION</span>}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
