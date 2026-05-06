import React, { useState } from 'react';

// The iNav configuration dump provided
const INAV_CONFIG_DATA = `diff all

# version
# INAV/GEPRCF405 8.0.1 Mar 28 2025 / 09:57:12 (ae47bcba) 
# GCC-13.2.1 20231009

# start the command batch
batch start

# reset configuration to default settings
defaults noreboot

# features
feature -BLACKBOX
feature -AIRMODE
feature GPS
feature PWM_OUTPUT_ENABLE

# blackbox
blackbox -NAV_ACC
blackbox NAV_POS
blackbox NAV_PID
blackbox MAG
blackbox ACC
blackbox ATTI
blackbox RC_DATA
blackbox RC_COMMAND
blackbox MOTORS
blackbox -GYRO_RAW
blackbox -PEAKS_R
blackbox -PEAKS_P
blackbox -PEAKS_Y
blackbox SERVOS

# Ports
serial 0 0 115200 115200 0 115200
serial 2 1 115200 115200 0 115200
serial 4 2 115200 115200 0 115200

# Modes [aux]
aux 0 0 0 1700 2100
aux 1 1 4 900 1300
aux 2 11 2 1700 2100
aux 3 10 1 1700 2100
aux 4 28 3 1700 2100
aux 5 3 2 1300 1700
aux 6 5 2 1700 2100
aux 7 29 1 900 1300
aux 8 29 1 1700 2100
aux 9 33 2 1700 2100
aux 10 46 2 1700 2100
aux 11 13 1 1275 1700

# OSD [osd_layout]
osd_layout 0 0 24 1 V
osd_layout 0 1 9 1 V
osd_layout 0 7 13 11 V
osd_layout 0 9 1 2 H
osd_layout 0 11 1 3 V
osd_layout 0 15 1 1 V
osd_layout 0 20 0 7 V
osd_layout 0 21 0 6 V
osd_layout 0 28 23 9 V
osd_layout 0 30 0 12 V
osd_layout 0 38 15 1 V
osd_layout 0 40 1 2 V
osd_layout 0 48 23 10 V

# master
set gyro_main_lpf_hz = 90
set dynamic_gyro_notch_q = 250
set dynamic_gyro_notch_min_hz = 60
set dynamic_gyro_notch_mode = 3D
set setpoint_kalman_q = 200
set gyro_zero_x = -1
set gyro_zero_y = -8
set gyro_zero_z = 9
set ins_gravity_cmss =  978.537
set acc_hardware = ICM42605
set acczero_x = -11
set acczero_y = 1
set acczero_z = 14
set accgain_x = 4105
set accgain_y = 4109
set accgain_z = 4074
set rangefinder_hardware = MSP
set opflow_hardware = MSP
set opflow_scale =  4.980
set align_mag = CW270FLIP
set mag_hardware = IST8310
set magzero_x = -117
set magzero_y = -616
set magzero_z = 604
set maggain_x = 477
set maggain_y = 452
set maggain_z = 485
set baro_hardware = DPS310
set serialrx_provider = CRSF
set blackbox_rate_denom = 2
set motor_pwm_protocol = DSHOT300
set vbat_scale = 1130
set applied_defaults = 5
set gps_ublox_use_galileo = ON
set gps_ublox_use_beidou = ON
set gps_ublox_use_glonass = ON
set airmode_type = THROTTLE_THRESHOLD
set inav_allow_dead_reckoning = ON
set inav_max_surface_altitude = 400
set nav_wp_radius = 200
set nav_wp_enforce_altitude = 300
set nav_auto_speed = 100
set nav_max_auto_speed = 300
set nav_manual_speed = 300
set nav_land_maxalt_vspd = 100
set nav_land_slowdown_minalt = 200
set nav_land_slowdown_maxalt = 500
set nav_emerg_landing_speed = 200
set nav_min_rth_distance = 200
set nav_rth_climb_first = OFF
set nav_max_terrain_follow_alt = 200
set nav_max_altitude = 400
set nav_rth_altitude = 300
set nav_mc_auto_climb_rate = 50
set nav_mc_manual_climb_rate = 100
set debug_mode = FLOW_RAW

# control_profile
control_profile 1
set mc_p_pitch = 44
set mc_i_pitch = 82
set mc_d_pitch = 29
set mc_cd_pitch = 110
set mc_i_roll = 75
set mc_d_roll = 26
set mc_cd_roll = 100
set mc_p_yaw = 45
set mc_i_yaw = 80
set mc_cd_yaw = 100
set dterm_lpf_hz = 85
set nav_mc_vel_z_p = 150
set nav_mc_vel_z_i = 250
set nav_mc_vel_z_d = 25
set nav_mc_pos_xy_p = 80
set nav_mc_vel_xy_p = 50
set nav_mc_vel_xy_i = 40
set nav_mc_vel_xy_d = 60
set mc_iterm_relax = RPY
set d_boost_min =  1.000
set d_boost_max =  1.200
set antigravity_gain =  2.000
set antigravity_accelerator =  5.000
set smith_predictor_delay =  1.768
set thr_expo = 20
set tpa_rate = 20
set tpa_breakpoint = 1200
set rc_expo = 80
set rc_yaw_expo = 80
set roll_rate = 70
set pitch_rate = 70
set yaw_rate = 60
set ez_enabled = ON
set ez_filter_hz = 90
set ez_response = 101
set ez_damping = 115
set ez_rate = 134
set ez_expo = 118

# control_profile
control_profile 2
set mc_iterm_relax = RPY
set d_boost_min =  0.800
set d_boost_max =  1.200
set antigravity_gain =  2.000
set antigravity_accelerator =  5.000
set tpa_rate = 20
set tpa_breakpoint = 1200

# control_profile
control_profile 3
set mc_iterm_relax = RPY
set d_boost_min =  0.800
set d_boost_max =  1.200
set antigravity_gain =  2.000
set antigravity_accelerator =  5.000
set tpa_rate = 20
set tpa_breakpoint = 1200

# mixer_profile
mixer_profile 1
set model_preview_type = 3
set motorstop_on_low = OFF

# Mixer: motor mixer
mmix reset
mmix 0  1.000 -1.000  1.000 -1.000
mmix 1  1.000 -1.000 -1.000  1.000
mmix 2  1.000  1.000  1.000  1.000
mmix 3  1.000  1.000 -1.000 -1.000

# battery_profile
battery_profile 1
set battery_capacity = 5600
set battery_capacity_warning = 1120
set throttle_scale =  0.800
set throttle_idle =  5.000

# restore original profile selection
control_profile 1
mixer_profile 1
battery_profile 1

# save configuration
save`;

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

  // Generate dynamic text file blob for download
  const downloadConfigFile = () => {
    const blob = new Blob([INAV_CONFIG_DATA], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GEPRCF405_INAV_Config.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-3 animate-fade-in font-mono">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-main uppercase tracking-[0.2em] italic">SYSTEM_CONFIG_</h2>
          <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_var(--neon-glow)]" />
        </div>
        
        <button
          onClick={() => onSave({ isDarkMode: pendingDarkMode, mapStyle: pendingMapStyle, theme: pendingTheme })}
          disabled={!hasChanges}
          className={`px-6 py-2 rounded font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-xl ${
            hasChanges 
            ? 'bg-gcs-primary text-slate-100 neon-glow active:scale-95' 
            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
          style={hasChanges ? { backgroundColor: themes.find(t => t.id === pendingTheme)?.color } : {}}
        >
          {hasChanges ? 'SAVE_CHANGES_' : 'CONFIG_SYNCHRONIZED'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-2">
        {/* Appearance & Mode */}
        <div className="flex flex-col gap-4 h-full">
            <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl flex flex-col gap-6">
              <section>
                <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
                  LUMINANCE_PROTOCOL
                </h3>
                <div className="flex items-center justify-between p-4 bg-gcs-card/30 border border-main rounded-xl">
                  <div>
                    <p className="text-xs font-black text-main uppercase tracking-wider">Tactical_Dark_Mode</p>
                    <p className="text-[9px] text-dim mt-1 uppercase">Toggle Dark and Light interface</p>
                  </div>
                  <button
                    onClick={() => setPendingDarkMode(!pendingDarkMode)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all focus:outline-none border-2 ${pendingDarkMode ? 'bg-slate-800 border-gcs-primary' : 'bg-white border-slate-300'}`}
                    style={pendingDarkMode ? { borderColor: themes.find(t => t.id === pendingTheme)?.color } : {}}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${pendingDarkMode ? 'translate-x-6 bg-gcs-primary' : 'translate-x-1 bg-slate-400'}`} 
                          style={pendingDarkMode ? { backgroundColor: themes.find(t => t.id === pendingTheme)?.color } : {}} />
                  </button>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
                  MAP_TERRAIN_RENDER
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Default', 'Satellite', 'Topographic'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setPendingMapStyle(style)}
                      className={`py-2 rounded font-black text-[9px] uppercase tracking-widest border-2 transition-all ${
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
            <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl">
                <section>
                    <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-gcs-primary shadow-[0_0_5px_#ef4444]" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
                        ADVANCED_SYSTEM_CORE
                    </h3>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-3">
                        <div>
                            <p className="text-xs font-black text-main uppercase tracking-wider">Flight_Controller_Tools</p>
                            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">
                                Access configuration files and flashing utilities.
                            </p>
                        </div>
                        <div className="flex gap-2 w-full">
                            <a 
                                href="/downloads/INAV-Configurator_Win64_9.0.2.zip" 
                                download="INAV-Configurator_Win64_9.0.2.zip"
                                className="w-1/2 py-3 rounded bg-slate-850 border border-slate-700 hover:border-gcs-primary text-slate-400 hover:text-gcs-primary font-black font-mono text-[9px] uppercase tracking-[0.2em] transition-all text-center flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-3 h-3 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                GET_INAV_
                            </a>
                            <button 
                                onClick={downloadConfigFile}
                                className="w-1/2 py-3 rounded bg-slate-850 border border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-500 font-black font-mono text-[9px] uppercase tracking-[0.2em] transition-all text-center flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-3 h-3 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                                </svg>
                                DRONE_CONFIG_FILE
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Theme Palette */}
        <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl flex flex-col gap-4">
          <section className="flex flex-col h-full">
            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-4 flex items-center gap-3 shrink-0">
              <span className="w-2 h-2 rounded-full bg-gcs-primary" style={{ backgroundColor: themes.find(t => t.id === pendingTheme)?.color }} />
              NEURAL_LINK_PALETTE
            </h3>
            <div className="grid grid-cols-1 gap-2 flex-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPendingTheme(t.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 ${pendingTheme === t.id ? 'border-gcs-primary' : 'bg-gcs-card/20 border-transparent hover:border-main'}`}
                  style={pendingTheme === t.id ? { 
                    borderColor: t.color, 
                    backgroundColor: `${t.color}1a`,
                    boxShadow: `0 0 15px ${t.glow}`
                  } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${t.class}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${pendingTheme === t.id ? 'text-main' : 'text-dim'}`}>{t.name}</span>
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