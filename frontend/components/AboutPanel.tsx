import React from 'react';

const AboutPanel: React.FC = () => {
    return (
        <div className="flex flex-col h-full gap-4 animate-fade-in font-mono overflow-y-auto pr-2 custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between px-1 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-main uppercase tracking-[0.2em] italic">SYSTEM_ABOUT_</h2>
                    <div className="h-[2px] w-16 bg-gcs-primary mt-1 shadow-[0_0_10px_var(--neon-glow)]" />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gcs-primary tracking-widest uppercase">GCS Version 1.0.0</p>
                    <p className="text-[8px] text-dim tracking-widest uppercase mt-0.5">© 2026 SMART MOSQUITO CONTROL</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 pb-2">
                
                {/* Left Column: Overview & Objectives */}
                <div className="flex flex-col gap-4 col-span-1 lg:col-span-2">
                    <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl flex flex-col gap-4 h-full">
                        <section>
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-gcs-primary" />
                                PROJECT_OVERVIEW
                            </h3>
                            <p className="text-[9px] text-slate-400 leading-relaxed text-justify">
                                The Smart Mosquito Control Drone GCS is a monitoring and intervention interface designed to manage a semi-autonomous UAV for mosquito larval detection and larvicide deployment. This system utilizes a "pilot-in-the-loop" architecture, where flight dynamics are handled via a dedicated Radio Controller (RC), while the GCS manages AI inference and payload release.
                            </p>
                        </section>
                        
                        <div className="h-[1px] w-full bg-slate-800 my-1" />

                        <section>
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-gcs-primary" />
                                OBJECTIVES_&_PURPOSE
                            </h3>
                            <ul className="text-[9px] text-slate-400 space-y-2 list-none">
                                <li className="flex gap-2"><span className="text-gcs-primary">❯</span> Provide an efficient and automated solution for mosquito vector control.</li>
                                <li className="flex gap-2"><span className="text-gcs-primary">❯</span> Address traditional manual patrol limitations by accessing and treating hard-to-reach breeding sites.</li>
                                <li className="flex gap-2"><span className="text-gcs-primary">❯</span> Reduce disease incidence and alleviate healthcare burdens in urban communities.</li>
                                <li className="flex gap-2"><span className="text-gcs-primary">❯</span> Enable data-driven, proactive intervention through real-time AI and GPS mapping.</li>
                            </ul>
                        </section>

                        <div className="h-[1px] w-full bg-slate-800 my-1" />

                        <section>
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-gcs-primary" />
                                KEY_SYSTEM_FEATURES
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-[9px] text-slate-400">
                                <div><span className="text-gcs-primary font-bold">Two-Stage AI:</span> YOLOv8 detection + Stage 2 binary classifier.</div>
                                <div><span className="text-gcs-primary font-bold">Telemetry:</span> Live GPS mapping & fail-safe CSV logging.</div>
                                <div><span className="text-gcs-primary font-bold">Dispenser Control:</span> Operator-assisted 3D-printed rotary Bti gate.</div>
                                <div><span className="text-gcs-primary font-bold">Geospatial:</span> Leaflet tracking of drone & detection hotspots.</div>
                                <div><span className="text-gcs-primary font-bold">Analytics:</span> Mission summaries & exportable logs.</div>
                                <div><span className="text-gcs-primary font-bold">Avionics:</span> Tuning tools for PID loops & sensor validation.</div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Column: Credits & Tech Stack */}
                <div className="flex flex-col gap-4 col-span-1">
                    <div className="bg-gcs-panel border border-main rounded-lg p-5 shadow-2xl h-full flex flex-col gap-4">
                        <section>
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                <span className="text-gcs-primary">///</span> TECH_STACK
                            </h3>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-1.5 text-[9px] text-slate-400">
                                <p><span className="text-main font-bold">Frontend:</span> React, TS, Tailwind, Leaflet</p>
                                <p><span className="text-main font-bold">AI Model:</span> YOLOv8 (GCS Inference)</p>
                                <p><span className="text-main font-bold">Backend:</span> Node.js, Fastify, Supabase</p>
                                <p><span className="text-main font-bold">Hardware:</span> RPi 4 (8GB), GEP-F405-HD V2, M10 GPS, LiDAR</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                <span className="text-gcs-primary">///</span> DEV_TEAM
                            </h3>
                            <div className="text-[9px] text-slate-400 space-y-1">
                                <p className="text-main font-bold">Engineers:</p>
                                <p>Gerikah L. Alday</p>
                                <p>Alexa P. Babiera</p>
                                <p>Charles David P. Bernido</p>
                                <p>Catelyn Joy M. Morco</p>
                                <p className="mt-2 text-main font-bold">Adviser:</p>
                                <p>Dr. Luisito L. Lacatan</p>
                                <p className="mt-2 text-[8px] opacity-70">PUP Sta. Mesa | BS Computer Engineering</p>
                            </div>
                        </section>

                        <section className="mt-auto">
                            <h3 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                                <span className="text-gcs-primary">///</span> ACKNOWLEDGMENTS
                            </h3>
                            <p className="text-[8px] text-slate-500 leading-tight">
                                Deepest gratitude to our mentors, PUP, LGUs, CAAP, and FPA. Special thanks to subject matter experts <span className="text-slate-300">Sir Peter Geronimo (PinoyFPV)</span> and <span className="text-slate-300">Sir Sherwin Esguerra</span> for their technical mastery, guidance, and vital contributions.
                            </p>
                            <p className="text-[8px] text-gcs-primary mt-3 hover:underline cursor-pointer">smartdroneproject@gmail.com</p>
                        </section>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AboutPanel;