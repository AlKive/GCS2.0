import React, { useState, useMemo, useEffect } from 'react';
import type { FlightSession, HardwareTelemetry, AiTelemetry, SprayLog, TargetDetection, StreamHealth } from 'types'; 
import MissionTrackMap from './MissionTrackMap';
import { downloadMissionReport } from '../utils/downloadReport'; 

// --- Tactical Icons ---
const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" x2="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface FlightLogsPanelProps {
  sessions: FlightSession[];
}

const YOLOV8_CLASSES = [
  "tires", "pot", "bottle", "vase"
].sort();

const FlightLogsPanel: React.FC<FlightLogsPanelProps> = ({ sessions }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active' | 'aborted'>('all');
  const [objectFilter, setObjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [minDurationFilter, setMinDurationFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'hardware' | 'health'>('overview');

  // Auto-select first session on load
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Status Filter
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;

      // Object Filter
      if (objectFilter !== 'all') {
        const hasObject = session.target_detections?.some(d => d.target_class?.toLowerCase() === objectFilter.toLowerCase());
        if (!hasObject) return false;
      }

      // Date Filter
      if (dateFilter) {
        const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
        if (sessionDate !== dateFilter) return false;
      }

      // Duration Filter (in minutes)
      if (minDurationFilter > 0) {
        if (!session.end_time) return true;
        const diff = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
        const mins = diff / 1000 / 60;
        if (mins < minDurationFilter) return false;
      }

      return true;
    });
  }, [sessions, statusFilter, objectFilter, dateFilter, minDurationFilter]);

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  const handleDownloadReport = () => {
    if (selectedSession) {
      downloadMissionReport(selectedSession as any);
    }
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'LIVE_SESSION';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    return hours > 0 ? `${hours}H ${mins % 60}M` : mins > 0 ? `${mins}M ${secs % 60}S` : `${secs}S`;
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in">
      {/* Header HUD */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-[0.2em] font-mono italic">FLIGHT_LOG_REGISTRY_</h2>
            <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_#ef4444]" />
          </div>
        </div>

        {/* Tactical Filter HUD */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg flex flex-wrap gap-6 items-end shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gcs-primary/30" />

          <div className="flex flex-col gap-2">
            <label className="text-[7px] font-mono font-black text-slate-500 uppercase tracking-[0.3em] pl-1">SORTIE_STATUS</label>
            <select
              className="bg-slate-950 border border-slate-800 text-[10px] font-mono uppercase tracking-widest p-2 rounded focus:ring-1 focus:ring-gcs-primary outline-none text-slate-300 w-32 cursor-pointer hover:border-slate-700 transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
                <option value="all">ALL_STATUS</option>
                <option value="completed">COMPLETED</option>
                <option value="active">ACTIVE</option>
                <option value="aborted">ABORTED</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[7px] font-mono font-black text-slate-500 uppercase tracking-[0.3em] pl-1">OBJECT_TARGET</label>
            <select
              className="bg-slate-950 border border-slate-800 text-[10px] font-mono uppercase tracking-widest p-2 rounded focus:ring-1 focus:ring-gcs-primary outline-none text-slate-300 w-40 cursor-pointer hover:border-slate-700 transition-colors"
              value={objectFilter}
              onChange={(e) => setObjectFilter(e.target.value)}
            >
                <option value="all">ALL_OBJECTS</option>
                {YOLOV8_CLASSES.map(obj => (
                  <option key={obj} value={obj}>{obj.toUpperCase()}</option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[7px] font-mono font-black text-slate-500 uppercase tracking-[0.3em] pl-1">CHRONO_DATE</label>
            <input
              type="date"
              className="bg-slate-950 border border-slate-800 text-[10px] font-mono uppercase p-2 rounded focus:ring-1 focus:ring-gcs-primary outline-none text-slate-300 w-40 cursor-pointer hover:border-slate-700 transition-colors [color-scheme:dark]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[7px] font-mono font-black text-slate-500 uppercase tracking-[0.3em] pl-1">MIN_DUR (MINS)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="bg-slate-950 border border-slate-800 text-[10px] font-mono uppercase p-2 rounded focus:ring-1 focus:ring-gcs-primary outline-none text-slate-300 w-24 hover:border-slate-700 transition-colors"
              value={minDurationFilter || ''}
              onChange={(e) => setMinDurationFilter(parseInt(e.target.value) || 0)}
            />
          </div>

          <button
            onClick={() => {
              setStatusFilter('all');
              setObjectFilter('all');
              setDateFilter('');
              setMinDurationFilter(0);
            }}
            className="p-2 border border-slate-800 hover:border-gcs-primary text-slate-600 hover:text-gcs-primary transition-all rounded bg-slate-950/50"
            title="RESET_TACTICAL_FILTERS"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className="ml-auto text-right">
             <span className="text-[8px] font-mono text-slate-600 block tracking-widest">REGISTRY_MATCHES</span>  
             <span className="text-sm font-black font-mono text-gcs-primary">{filteredSessions.length}</span>     
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Sidebar: Tactical Record List */}
        <div className="w-80 flex flex-col bg-gcs-panel border border-slate-700/50 rounded-lg overflow-hidden shadow-2xl shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">       
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">LOG_ARCHIVE</span>
            <span className="text-[10px] font-mono text-gcs-primary">{filteredSessions.length} FILES</span>       
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`p-4 border-b border-slate-800/50 cursor-pointer transition-all duration-300 relative group ${selectedSessionId === session.id ? 'bg-slate-800/50' : 'hover:bg-slate-800/20'}`}
              >
                {selectedSessionId === session.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gcs-primary shadow-[0_0_10px_#ef4444]" />
                )}

                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-mono text-[10px] font-bold text-slate-100 tracking-wider uppercase truncate pr-2">FLT_{session.id.substring(0, 8)}</h3>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border ${
                    session.status === 'completed' ? 'border-gcs-success/30 text-gcs-success bg-gcs-success/5' :  
                    session.status === 'active' ? 'border-gcs-primary/30 text-gcs-primary bg-gcs-primary/5' :     
                    'border-slate-700 text-slate-500'
                  }`}>
                    {session.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-slate-500 font-mono tracking-tight uppercase">{new Date(session.start_time).toLocaleString()}</p>
                  <p className="text-[9px] text-gcs-primary/60 font-mono flex items-center gap-2 uppercase font-bold truncate">
                    <span className="w-1 h-1 bg-gcs-primary/40 rounded-full" />
                    {session.location?.barangay_name || 'UNKNOWN_SEC'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail HUD View */}
        <div className="flex-1 flex flex-col bg-gcs-panel border border-slate-700/50 rounded-lg overflow-hidden shadow-2xl relative min-w-0">
          {selectedSession ? (
            <div className="flex flex-col h-full">
              {/* Tactical Tabs */}
              <div className="bg-slate-900/80 border-b border-slate-800 flex overflow-x-auto scrollbar-hide shrink-0">
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="OVERVIEW" />
                <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="AI_DATABANK" />  
                <TabButton active={activeTab === 'hardware'} onClick={() => setActiveTab('hardware')} label="HARDWARE_METRICS" />
                <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="STREAM_HEALTH" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
                {activeTab === 'overview' && (
                  <>
                    {/* Overview Header Stats */}
                    <div className="grid grid-cols-4 gap-4 shrink-0">
                      <StatCard label="PILOT" value={selectedSession.users?.full_name || 'N/A'} />
                      <StatCard label="LOCATION" value={selectedSession.location?.barangay_name || 'N/A'} subValue={selectedSession.location?.city} />
                      <StatCard label="DURATION" value={getDuration(selectedSession.start_time, selectedSession.end_time)} />
                      <StatCard label="STATUS" value={selectedSession.status.toUpperCase()} />
                    </div>

                    {/* Map Section */}
                    <div className="h-64 relative border border-slate-800 rounded overflow-hidden group">
                      <MissionTrackMap
                          telemetry={selectedSession.hardware_telemetry || []}
                          detections={selectedSession.target_detections || []}
                          sprays={selectedSession.spray_logs || []}
                      />
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                          <div className="bg-slate-900/90 border border-slate-700 p-2 rounded text-[8px] font-mono text-slate-400">
                             SPATIAL_DATA: EPSG:4326 (WGS84)
                          </div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-primary pl-3">MISSION_CHRONOLOGY</h4>
                        <div className="space-y-2">
                           <LogItem label="START_TIME" value={new Date(selectedSession.start_time).toLocaleString()} />
                           <LogItem label="END_TIME" value={selectedSession.end_time ? new Date(selectedSession.end_time).toLocaleString() : 'LIVE'} />
                           <LogItem label="SESSION_ID" value={selectedSession.id} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-success pl-3">PAYLOAD_SUMMARY</h4>
                        <div className="space-y-2">
                           <LogItem label="DETECTIONS" value={selectedSession.target_detections?.length || 0} />  
                           <LogItem label="SPRAY_EVENTS" value={selectedSession.spray_logs?.length || 0} />       
                           <LogItem label="AVG_SPRAY_DUR" value={`${((selectedSession.spray_logs?.reduce((a,c) => a+c.spray_duration_seconds, 0) || 0) / (selectedSession.spray_logs?.length || 1)).toFixed(1)}S`} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-primary pl-3">AI_TELEMETRY_LOGS</h4>
                    <div className="overflow-x-auto border border-slate-800 rounded">
                      <table className="w-full text-left font-mono text-[9px]">
                        <thead className="bg-slate-900 text-slate-500 uppercase tracking-widest border-b border-slate-800">
                          <tr>
                            <th className="p-3">LOGGED_AT</th>
                            <th className="p-3">SHARPNESS</th>
                            <th className="p-3">PROGRESS</th>
                            <th className="p-3">CONFIRMED</th>
                            <th className="p-3">TARGET</th>
                            <th className="p-3">PIPELINE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {selectedSession.ai_telemetry?.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/30">
                              <td className="p-3 text-slate-400">{new Date(log.logged_at).toLocaleTimeString()}</td>
                              <td className="p-3 text-slate-100">{log.sharpness_score}</td>
                              <td className="p-3">
                                <div className="w-16 bg-slate-800 h-1 rounded overflow-hidden">
                                  <div className="bg-gcs-primary h-full" style={{ width: `${log.tracking_progress_percent}%` }} />
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={log.water_confirmed ? 'text-gcs-success' : 'text-slate-600'}>{log.water_confirmed ? 'YES' : 'NO'}</span>
                              </td>
                              <td className="p-3 text-slate-300">{log.active_target || '---'}</td>
                              <td className="p-3 text-slate-100">{log.pipeline_speed_ms}MS</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-primary pl-3">TARGET_DETECTION_STACK</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSession.target_detections?.map((det) => (
                        <div key={det.id} className="p-4 bg-slate-900 border border-slate-800 rounded flex gap-4 items-center">
                           <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 flex items-center justify-center overflow-hidden">
                              {det.image_url ? <img src={det.image_url} alt="Target" className="w-full h-full object-cover" /> : <span className="text-slate-600 text-[8px]">NO_IMG</span>}
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold text-slate-100 uppercase tracking-widest">{det.target_class}</p>
                              <p className="text-[8px] text-slate-500 font-mono">AREA: {det.bounding_box_area.toFixed(0)}PX² | {new Date(det.detected_at).toLocaleTimeString()}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'hardware' && (
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-primary pl-3">HARDWARE_TELEMETRY_DATABANK</h4>
                      <div className="overflow-x-auto border border-slate-800 rounded">
                        <table className="w-full text-left font-mono text-[9px]">
                          <thead className="bg-slate-900 text-slate-500 uppercase tracking-widest border-b border-slate-800">
                            <tr>
                              <th className="p-3">LOGGED_AT</th>
                              <th className="p-3">GPS_COORDS</th>
                              <th className="p-3">ALT_LIDAR</th>
                              <th className="p-3">VOLT</th>
                              <th className="p-3">RSSI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {selectedSession.hardware_telemetry?.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-800/30">
                                <td className="p-3 text-slate-400">{new Date(log.logged_at).toLocaleTimeString()}</td>
                                <td className="p-3 text-slate-100">{log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}</td>
                                <td className="p-3 text-slate-100">{log.altitude_lidar_m.toFixed(2)}M</td>        
                                <td className="p-3 text-gcs-success">{log.battery_voltage.toFixed(2)}V</td>       
                                <td className="p-3 text-slate-300">{log.signal_strength_dbm}DBM</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-success pl-3">SPRAY_LOG_EVENTS</h4>
                      <div className="space-y-2">
                        {selectedSession.spray_logs?.map((log) => (
                          <div key={log.id} className="p-3 bg-slate-900 border border-slate-800 rounded flex justify-between items-center">
                             <div>
                                <p className="text-[10px] font-bold text-slate-100 uppercase">TRIGGER_{log.trigger_type}</p>
                                <p className="text-[8px] text-slate-500 font-mono">{new Date(log.triggered_at).toLocaleTimeString()} | DUR: {log.spray_duration_seconds}S</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-mono text-gcs-success font-black">{log.target_area.toFixed(0)}PX²</p>
                                <p className="text-[7px] text-slate-600 uppercase font-mono font-bold tracking-widest">TARGET_AREA</p>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono border-l-2 border-gcs-primary pl-3">STREAM_SYSTEM_HEALTH</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedSession.stream_health?.map((log) => (
                         <div key={log.id} className="p-4 bg-slate-900 border border-slate-800 rounded flex items-center justify-between">
                            <div className="flex gap-8">
                               <div>
                                  <span className="text-[7px] text-slate-600 uppercase font-mono block">PI_IP</span>
                                  <span className="text-[10px] font-mono text-slate-200">{log.pi_ip}</span>       
                               </div>
                               <div>
                                  <span className="text-[7px] text-slate-600 uppercase font-mono block">LAPTOP_IP</span>
                                  <span className="text-[10px] font-mono text-slate-200">{log.laptop_ip}</span>   
                               </div>
                               <div>
                                  <span className="text-[7px] text-slate-600 uppercase font-mono block">PID</span>
                                  <span className="text-[10px] font-mono text-slate-200">{log.stream_pid || '---'}</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border ${log.status === 'Healthy' ? 'border-gcs-success/30 text-gcs-success' : 'border-gcs-error/30 text-gcs-error'}`}>        
                                  {log.status.toUpperCase()}
                               </span>
                               <p className="text-[7px] text-slate-600 font-mono mt-1">{new Date(log.logged_at).toLocaleTimeString()}</p>
                            </div>
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secure Export Footer */}
                <div className="flex justify-end pt-4 border-t border-slate-800 mt-auto shrink-0">
                  <button
                    onClick={handleDownloadReport}
                    disabled={!selectedSession || selectedSession.status === 'active'}
                    className="bg-gcs-primary hover:bg-red-600 text-slate-100 font-black font-mono text-[10px] uppercase tracking-[0.3em] px-8 py-3 rounded shadow-xl transition-all disabled:opacity-10 active:scale-95 flex items-center gap-3 neon-glow-red"
                  >
                    <ExportIcon />
                    GENERATE_SECURE_REPORT
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 grayscale border border-dashed border-slate-800 m-6 rounded">
               <svg className="w-16 h-16 text-slate-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="1.5" strokeLinecap="round"/></svg>
               <p className="text-xs font-black font-mono uppercase tracking-[0.4em] text-slate-500">SELECT_FLIGHT_DATA_PACKET</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-[9px] font-mono font-black tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
      active ? 'text-gcs-primary border-gcs-primary bg-gcs-primary/5' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
    }`}
  >
    {label}_
  </button>
);

const StatCard: React.FC<{ label: string, value: string | number, subValue?: string }> = ({ label, value, subValue }) => (
  <div className="p-3 bg-slate-900/50 border border-slate-800 rounded">
     <span className="text-[7px] text-slate-600 font-mono font-bold uppercase tracking-widest block mb-1">{label}</span>
     <p className="text-xs font-black font-mono text-slate-100 truncate">{value}</p>
     {subValue && <p className="text-[8px] text-slate-500 font-mono truncate">{subValue}</p>}
  </div>
);

const LogItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/30 last:border-0">
    <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-[0.1em]">{label}_</span>    
    <span className="text-[9px] font-black font-mono text-slate-200 uppercase truncate ml-4">{value}</span>       
  </div>
);

export default FlightLogsPanel;
