import React, { useState, useMemo } from 'react';
import type { FlightSession } from 'types'; 
import MissionTrackMap from './MissionTrackMap';
import { downloadMissionReport } from '../utils/downloadReport'; 

// --- Tactical Icons ---
const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface FlightLogsPanelProps {
  sessions: FlightSession[];
}

const FlightLogsPanel: React.FC<FlightLogsPanelProps> = ({ sessions }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[0]?.id || null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active' | 'aborted'>('all');

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => filter === 'all' || session.status === filter);
  }, [sessions, filter]);

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
    return mins > 0 ? `${mins}M ${secs % 60}S` : `${secs}S`;
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in">
      {/* Header HUD */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-[0.2em] font-mono italic">REGISTRY_ARCHIVE_</h2>
          <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_#ef4444]" />
        </div>
        <div className="flex gap-3">
           <select 
             className="bg-slate-900 border border-slate-800 text-[10px] font-mono uppercase tracking-widest p-2 rounded focus:ring-1 focus:ring-gcs-primary outline-none text-slate-300"
             value={filter}
             onChange={(e) => setFilter(e.target.value as any)}
           >
              <option value="all">SORTIE_ALL</option>
              <option value="completed">STAT_COMP</option>
              <option value="active">STAT_LIVE</option>
              <option value="aborted">STAT_ABRT</option>
           </select>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Sidebar: Tactical Record List */}
        <div className="w-1/3 flex flex-col bg-gcs-panel border border-slate-700/50 rounded-lg overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">SECURE_DATABANK</span>
            <span className="text-[10px] font-mono text-gcs-primary">{filteredSessions.length} FILES</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredSessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`p-5 border-b border-slate-800/50 cursor-pointer transition-all duration-300 relative group ${selectedSessionId === session.id ? 'bg-slate-800/50' : 'hover:bg-slate-800/20'}`}
              >
                {selectedSessionId === session.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gcs-primary shadow-[0_0_10px_#ef4444]" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-mono text-xs font-bold text-slate-100 tracking-wider uppercase truncate pr-2">REC_{session.id.substring(0, 12)}</h3>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border ${
                    session.status === 'completed' ? 'border-gcs-success/30 text-gcs-success bg-gcs-success/5' : 
                    session.status === 'active' ? 'border-gcs-primary/30 text-gcs-primary bg-gcs-primary/5' :
                    'border-slate-700 text-slate-500'
                  }`}>
                    {session.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-slate-500 font-mono tracking-tight uppercase">TS: {new Date(session.start_time).toLocaleString()}</p>
                  <p className="text-[10px] text-gcs-primary/60 font-mono flex items-center gap-2 uppercase font-bold">
                    <span className="w-1 h-1 bg-gcs-primary/40 rounded-full" />
                    LOC: {session.location?.barangay_name || 'NULL_ADDR'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail HUD View */}
        <div className="flex-1 flex flex-col bg-gcs-panel border border-slate-700/50 rounded-lg overflow-hidden shadow-2xl relative">
          {selectedSession ? (
            <div className="flex flex-col h-full">
              {/* Map Replay Header */}
              <div className="h-1/2 relative border-b border-slate-800 group">
                 <MissionTrackMap 
                    telemetry={selectedSession.hardware_telemetry} 
                    detections={selectedSession.target_detections}
                    sprays={selectedSession.spray_logs}
                 />
                 {/* Map Overlay HUD Elements */}
                 <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <div className="bg-slate-900/80 border border-slate-700 backdrop-blur-sm p-3 rounded shadow-2xl">
                        <span className="text-[8px] font-mono text-gcs-primary uppercase block mb-1 tracking-[0.2em] font-bold">TELEMETRY_REPLAY</span>
                        <div className="flex gap-4">
                            <div>
                                <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-widest">NODES</span>
                                <span className="text-sm font-bold font-mono text-slate-100">{selectedSession.hardware_telemetry?.length || 0}</span>
                            </div>
                            <div className="w-[1px] bg-slate-700" />
                            <div>
                                <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-widest">HITS</span>
                                <span className="text-sm font-bold font-mono text-gcs-success">{selectedSession.spray_logs?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                {/* Meta Grid HUD */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900 border border-slate-800 rounded">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">SORTIE_METADATA</span>
                      <InfoItem label="ELAPSED" value={getDuration(selectedSession.start_time, selectedSession.end_time)} />
                      <InfoItem label="SECTOR" value={selectedSession.location?.barangay_name || 'NULL'} />
                   </div>
                   <div className="p-4 bg-slate-900 border border-slate-800 rounded">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">AI_LOG_STATS</span>
                      <div className="flex justify-around items-center h-full pb-2">
                        <div className="text-center">
                            <p className="text-xl font-black font-mono text-slate-100 tracking-tighter">{selectedSession.target_detections?.length || 0}</p>
                            <p className="text-[8px] font-mono text-gcs-primary uppercase font-bold tracking-widest">DETECTIONS</p>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div className="text-center">
                            <p className="text-xl font-black font-mono text-slate-100 tracking-tighter">{(selectedSession.spray_logs?.reduce((acc, curr) => acc + curr.spray_duration_seconds, 0) || 0) * 10}</p>
                            <p className="text-[8px] font-mono text-gcs-success uppercase font-bold tracking-widest">ML_VOLUME</p>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Event Stack Log */}
                <div className="flex-1 min-h-[200px]">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gcs-primary rounded-full shadow-[0_0_5px_#ef4444]" />
                    CHRONOLOGICAL_EVENT_STACK
                  </h4>
                  {!selectedSession.target_detections || selectedSession.target_detections.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-20 border border-dashed border-slate-800 rounded">
                        <p className="text-[10px] uppercase font-mono tracking-[0.3em]">NO_EVENTS_REGISTERED</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedSession.target_detections.map((det, idx) => {
                        const spray = selectedSession.spray_logs?.find(s => s.id === det.id);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800/50 border border-slate-800 rounded transition-colors group/item">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-mono text-slate-600 font-bold group-hover/item:text-gcs-primary transition-colors">#{idx.toString().padStart(2, '0')}</span>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-100 uppercase font-mono tracking-wider">{det.target_class}</p>
                                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{new Date(det.detected_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border ${spray ? 'border-gcs-success/30 text-gcs-success bg-gcs-success/5 neon-glow-green' : 'border-gcs-primary/30 text-gcs-primary bg-gcs-primary/5'}`}>
                              {spray ? `NEUTRALIZED_${spray.spray_duration_seconds}S` : 'LOGGED_ONLY'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Secure Export Footer */}
                <div className="flex justify-end pt-4 border-t border-slate-800 mt-auto">
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
               <p className="text-xs font-black font-mono uppercase tracking-[0.4em] text-slate-500">SELECT_SESSION_FILE</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const InfoItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50 last:border-0">
    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-[0.2em]">{label}_</span>
    <span className="text-[10px] font-black font-mono text-slate-100 tracking-wider uppercase">{value}</span>
  </div>
);

export default FlightLogsPanel;
