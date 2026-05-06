import React from 'react';

const GuidePanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in font-mono overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h2 className="text-xl font-black text-main uppercase tracking-[0.2em] italic">OPERATIONAL_GUIDE_</h2>
          <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_var(--neon-glow)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-2">
        {/* GCS-W Web Interface Guide */}
        <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-gcs-primary uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-gcs-primary animate-pulse" />
            GCS-W (WEB_INTERFACE) NODE
          </h3>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">1.0 Mission Initialization</h4>
              <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">GCS Web serves as the Mission Control & Data Visualization Node. Flight is RC-managed; GCS Web manages mission parameters.</p>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-gcs-primary font-bold">1.1 Data Logging:</span> Input Session Name, PIC, and Barangay before accessing the stream to link payload activity.</li>
                <li><span className="text-gcs-primary font-bold">1.2 Link Establishment:</span> Successful entry initializes the AI inference engine and drone-web synchronization.</li>
              </ul>
            </div>

            <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">2.0 AI Vision & Payload</h4>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-gcs-primary font-bold">2.1 Live Video:</span> Real-time AI camera stream for tracking potential breeding locations.</li>
                <li><span className="text-gcs-primary font-bold">2.2 Larvicide Command:</span> Web control is strictly restricted to the Dispensing System.</li>
                <li><span className="text-gcs-primary font-bold">2.3 Operational Logic:</span> Trigger is interlocked until YOLOv8 confirms detection. Operator must then issue the manual dispense command.</li>
              </ul>
            </div>

            <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">3.0 Maintenance & Recovery</h4>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-gcs-primary font-bold">3.1 Flight Tuning:</span> iNAV Configurator download is available in Settings for PID/calibration.</li>
                <li><span className="text-gcs-primary font-bold">3.2 Fail-Safe:</span> On connection loss, the onboard system records locally. Files are indexed upon link restoration.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* GCS-M Mobile Companion Guide */}
        <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            GCS-M (MOBILE_COMPANION) APP
          </h3>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
             <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">1.0 Admin Access Control</h4>
              <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">GCS-Mobile is an Administrative Oversight Tool for field monitoring and post-mission review.</p>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-emerald-500 font-bold">1.1 Secure Auth:</span> Mandatory Auth Screen ensures sensitive mission data remains restricted to authorized personnel.</li>
              </ul>
            </div>

            <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">2.0 Functional Scope</h4>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-emerald-500 font-bold">2.1 Monitoring Status:</span> Companion app is monitoring-only. It holds ZERO control authority over flight dynamics or payload.</li>
                <li><span className="text-emerald-500 font-bold">2.2 Data Management:</span> Grants access to the Analytics Engine and Flight Log Repository.</li>
              </ul>
            </div>

            <div className="p-4 bg-gcs-card/30 border border-main rounded-xl">
              <h4 className="text-[10px] font-black text-main uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">3.0 Docs & Reporting</h4>
              <ul className="text-[9px] text-dim space-y-1.5 list-none">
                <li><span className="text-emerald-500 font-bold">3.1 Report Generation:</span> Primary function is the extraction of Flight Logs and Analytics Reports in portable formats.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidePanel;