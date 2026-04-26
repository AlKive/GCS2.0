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
    { id: 'red', name: 'NEO_RED', class: 'bg-red-500', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' },
    { id: 'blue', name: 'CYBER_BLUE', class: 'bg-blue-500', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
    { id: 'amber', name: 'AMBER_WARM', class: 'bg-amber-500', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
    { id: 'emerald', name: 'EMERALD_TOX', class: 'bg-emerald-500', color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
    { id: 'purple', name: 'VOID_PURPLE', class: 'bg-purple-500', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)' },
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
          style={hasChanges ? { backgroundColor: themes.find(t => t.id === pendingTheme)?.color } : {}}
        >
          {hasChanges ? 'SAVE_CHANGES_' : 'CONFIG_SYNCHRONIZED'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Appearance & Mode */}
        <div className="flex flex-col gap-6 h-full">
            <div className="bg-gcs-panel border border-main rounded-lg p-8 shadow-2xl flex flex-col gap-10">
              <section>
                <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
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
                    style={pendingDarkMode ? { borderColor: themes.find(t => t.id === pendingTheme)?.color } : {}}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${pendingDarkMode ? 'translate-x-8 bg-gcs-primary' : 'translate-x-1 bg-slate-400'}`} 
                          style={pendingDarkMode ? { backgroundColor: themes.find(t => t.id === pendingTheme)?.color } : {}} />
                  </button>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
                  MAP_TERRAIN_RENDER
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Default', 'Satellite', 'Topographic'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setPendingMapStyle(style)}
                      className={`py-4 rounded font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        pendingMapStyle === style 
                        ? 'bg-gcs-primary/10 border-gcs-primary text-main' 
                        : 'bg-gcs-card/30 border-main text-dim hover:border-slate-600'
                      }`}
                      style={pendingMapStyle === style ? { borderColor: themes.find(t => t.id === pendingTheme)?.color, backgroundColor: `${themes.find(t => t.id === pendingTheme)?.color}1a` } : {}}
                    >
                      {style}_VIEW
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Advanced Settings */}
            <div className="bg-gcs-panel border border-main rounded-lg p-8 shadow-2xl">
                <section>
                    <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-gcs-primary shadow-[0_0_5px_#ef4444]" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
                        ADVANCED_SYSTEM_CORE
                    </h3>
                    <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-4">
                        <div>
                            <p className="text-sm font-black text-main uppercase tracking-wider">iNav_Configurator_Bundle</p>
                            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">
                                Download pre-configured iNav software for deep hardware tuning and flight controller optimization. 
                                Recommended for advanced pilots only.
                            </p>
                        </div>
                        <a 
                            href="/downloads/INAV-Configurator_Win64_9.0.2.zip" 
                            download="INAV-Configurator_Win64_9.0.2.zip"
                            className="w-full py-4 rounded bg-slate-850 border border-slate-700 hover:border-gcs-primary text-slate-400 hover:text-gcs-primary font-black font-mono text-[10px] uppercase tracking-[0.3em] transition-all text-center flex items-center justify-center gap-3 group"
                        >
                            <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            DOWNLOAD_INAV_PACKAGE_
                        </a>
                        <div className="flex items-center gap-2 px-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                           <span className="text-[8px] text-amber-500/80 font-black uppercase tracking-widest">REQUIRES_USB_CONNECTION</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Theme Palette */}
        <div className="bg-gcs-panel border border-main rounded-lg p-8 shadow-2xl flex flex-col gap-8">
          <section>
            <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
              NEURAL_LINK_PALETTE
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPendingTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${pendingTheme === t.id ? 'border-gcs-primary' : 'bg-gcs-card/20 border-transparent hover:border-main'}`}
                  style={pendingTheme === t.id ? { 
                    borderColor: t.color, 
                    backgroundColor: `${t.color}1a`,
                    boxShadow: `0 0 15px ${t.glow}`
                  } : {}}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${t.class}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${pendingTheme === t.id ? 'text-main' : 'text-dim'}`}>{t.name}</span>
                  </div>
                  {pendingTheme === t.id && <span className="text-[8px] font-black" style={{ color: t.color }}>ACTIVE_SELECTION</span>}
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
