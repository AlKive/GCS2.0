import React, { useState, useEffect } from 'react';

interface OfflineFile {
    name: string;
    size: number;
}

const OfflineManagerPanel: React.FC = () => {
    const [files, setFiles] = useState<OfflineFile[]>([]);
    const [storage, setStorage] = useState<string>('Checking...');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ msg: 'Connecting to drone...', color: 'text-blue-400' });

    const fetchFiles = async () => {
        setLoading(true);
        setStatus({ msg: 'Fetching files...', color: 'text-blue-400' });
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/offline/list`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setFiles(data);
            setStatus({ msg: '✅ Connected to Drone SD Card', color: 'text-emerald-400' });
        } catch (err: any) {
            setStatus({ msg: `❌ Connection Failed: ${err.message}`, color: 'text-rose-400' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStorage = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/offline/storage`);
            const data = await res.json();
            setStorage(data.available || 'Unknown');
        } catch (err) {}
    };

    useEffect(() => {
        fetchFiles();
        fetchStorage();
    }, []);

    const handleDownload = (filename: string) => {
        window.open(`http://${window.location.hostname}:5000/api/offline/download/${filename}`, '_blank');
    };

    return (
        <div className="p-8 h-full bg-gcs-dark text-slate-200 font-mono">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-slate-800 pb-6">
                    <h1 className="text-2xl font-black tracking-tighter italic uppercase text-slate-100 flex items-center gap-3">
                        <svg className="w-8 h-8 text-gcs-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="7" y="2" width="10" height="20" rx="2" ry="2"/><path d="M7 6h10M7 10h10M9 14h6M9 18h6"/></svg>
                        Drone SD Card Manager_
                    </h1>
                    <div className="mt-4 flex items-center justify-between">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                            {status.msg}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                            Pi Free Space: <span className="text-slate-200">{storage}</span>
                        </p>
                    </div>
                </header>

                <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
                    <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Offline Video Registry</span>
                        <button 
                            onClick={fetchFiles}
                            disabled={loading}
                            className="text-[9px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Refreshing...' : 'Refresh List'}
                        </button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        {files.length === 0 ? (
                            <div className="p-12 text-center text-slate-600 uppercase text-xs font-black tracking-widest">
                                {loading ? 'Scanning Remote Directory...' : 'No offline records found on drone.'}
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Filename</th>
                                        <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Size</th>
                                        <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {files.map(file => (
                                        <tr key={file.name} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-300 font-mono">{file.name}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500 text-right">{(file.size / (1024 * 1024)).toFixed(1)} MB</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDownload(file.name)}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
                                                >
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <footer className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-lg">
                        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Automated Retrieval</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider">
                            Videos recorded to the SD card during telemetry link outages are stored in <code className="text-gcs-primary bg-gcs-primary/5 px-1">/offline_videos</code>. Use this panel to sync them for post-mission analysis.
                        </p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-lg flex flex-col justify-center">
                        <button 
                            className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white border border-indigo-500/20 rounded font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg"
                            onClick={() => alert("Local Analyzer Launcher is integrated into the GCS Desktop environment.")}
                        >
                            Open Offline Analyzer_
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default OfflineManagerPanel;
