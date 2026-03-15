import React, { useMemo } from 'react';
import type { FlightSession } from 'types';

interface FlightHistoryProps {
    sessions: FlightSession[];
}

const MiniMapView: React.FC<{ track: { latitude: number; longitude: number }[] | undefined }> = ({ track }) => {
    const points = useMemo(() => {
        if (!track || track.length < 2) return null;

        const lats = track.map(p => p.latitude);
        const lons = track.map(p => p.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        
        if (latRange === 0 && lonRange === 0) return null;

        const scale = Math.min(90 / (lonRange || 1), 90 / (latRange || 1));

        const lonOffset = (100 - lonRange * scale) / 2;
        const latOffset = (100 - latRange * scale) / 2;

        const pathData = track.map((p, i) => {
            const x = ((p.longitude - minLon) * scale) + lonOffset;
            const y = ((maxLat - p.latitude) * scale) + latOffset;
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        }).join(' ');

        return pathData;
    }, [track]);

    return (
        <div className="w-10 h-10 bg-gcs-card border border-main rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
            {points ? (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 opacity-60">
                    <path d={points} fill="none" stroke="var(--neon-primary)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg className="w-5 h-5 text-dim opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
        </div>
    );
};


const MissionHistory: React.FC<FlightHistoryProps> = ({ sessions }) => {
    const recentSessions = sessions.slice(0, 10);

    const getDuration = (start: string, end: string | null) => {
        if (!end) return 'LIVE_';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const secs = Math.floor(diff / 1000);
        const mins = Math.floor(secs / 60);
        return mins > 0 ? `${mins}M ${secs % 60}S` : `${secs}S`;
    };

    return (
        <div className="bg-gcs-panel border border-main p-6 rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-main">
                <h3 className="text-xs font-black text-dim uppercase tracking-[0.3em] font-mono flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    DEPLOYMENT_ARCHIVE_
                </h3>
                <span className="text-[8px] font-mono text-dim uppercase tracking-widest">RECORDS_LIVE</span>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-1">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[8px] font-black font-mono text-dim uppercase tracking-widest bg-gcs-card/30 rounded mb-2">
                    <div className="col-span-1">MAP</div>
                    <div className="col-span-4">SESSION_IDENTIFIER</div>
                    <div className="col-span-3 text-center">STATUS</div>
                    <div className="col-span-2 text-right">TIME</div>
                    <div className="col-span-2 text-right">DUR</div>
                </div>

                {recentSessions.length > 0 ? recentSessions.map(session => (
                    <div key={session.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center rounded border border-transparent hover:bg-gcs-card/50 hover:border-main transition-all group">
                        <div className="col-span-1">
                            <MiniMapView track={session.hardware_telemetry} />
                        </div>
                        <div className="col-span-4 min-w-0">
                            <p className="font-mono text-[10px] font-bold text-main truncate tracking-tight uppercase">REC_{session.id.substring(0, 12)}</p>
                            <p className="text-[8px] font-mono text-dim tracking-wider">LOC: {session.location?.barangay_name || 'NULL'}</p>
                        </div>
                        <div className="col-span-3 flex justify-center">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[8px] font-black font-mono rounded uppercase tracking-widest border ${
                                session.status === 'completed' 
                                ? 'bg-gcs-success/10 border-gcs-success/30 text-gcs-success' 
                                : session.status === 'active'
                                ? 'bg-gcs-primary/10 border-gcs-primary/30 text-gcs-primary animate-pulse'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}>
                                {session.status === 'active' && <span className="w-1 h-1 mr-1.5 rounded-full bg-gcs-primary" />}
                                {session.status}
                            </span>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="font-mono text-[9px] text-dim">{new Date(session.start_time).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="font-mono text-[9px] font-bold text-main group-hover:text-gcs-primary transition-colors">{getDuration(session.start_time, session.end_time)}</p>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-12 border border-dashed border-main rounded">
                        <p className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-dim">NO_DATA_RECORDS_FOUND</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MissionHistory;
