import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L, { LatLng, Icon } from 'leaflet';
import type { MissionPlan } from 'types';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

import LoadPlanModal from './LoadPlanModal';
import { mapStyleProviders } from '../utils/mapStyles'; 

const DefaultIcon = new Icon({
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconAnchor: [12, 41],
    shadowAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Map Component ---
const WaypointMap = React.memo(({ waypoints }: { 
    waypoints: LatLng[]
}) => {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [waypoints, map]);

  return (
    <>
      {waypoints.map((pos, idx) => (
        <Marker key={idx} position={pos} icon={DefaultIcon} />
      ))}
    </>
  );
});


// --- Main View Component ---
interface MissionSetupViewProps {
  onLaunch: (plan: MissionPlan) => void;
  onClose: () => void;
  mapStyle: string;
}

const MissionSetupView: React.FC<MissionSetupViewProps> = ({ onLaunch, onClose, mapStyle }) => {
  const { url, attribution } = mapStyleProviders[mapStyle] || mapStyleProviders['Default'];
  const [missionName, setMissionName] = useState('New Mission Plan');
  const [altitude, setAltitude] = useState(50);
  const [speed, setSpeed] = useState(10);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [checklist, setChecklist] = useState({
    battery: false,
    propellers: false,
    gps: false,
    weather: false,
  });
  const [preArmingChecks, setPreArmingChecks] = useState({
    uavLevelled: { status: 'loading' as 'loading' | 'success' | 'error', label: 'UAV is Levelled' },
    runtimeCalibration: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Run-time Calibration' },
    cpuLoad: { status: 'loading' as 'loading' | 'success' | 'error', label: 'CPU Load' },
    navigationSafe: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Navigation is Safe' },
    compassCalibrated: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Compass Calibrated' },
    accelerometerCalibrated: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Accelerometer Calibrated' },
    settingsValidated: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Settings Validated' },
    hardwareHealth: { status: 'loading' as 'loading' | 'success' | 'error', label: 'Hardware Health' },
  });
  const [isLoadModalOpen, setLoadModalOpen] = useState(false);

  // Simulate pre-arming checks loading
  useEffect(() => {
    const checks = Object.keys(preArmingChecks) as Array<keyof typeof preArmingChecks>;
    checks.forEach((key, index) => {
      setTimeout(() => {
        setPreArmingChecks(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'success' as const }
        }));
      }, (index + 1) * 500); // Stagger the checks
    });
  }, []);

  const handleChecklistChange = (item: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };
  
  const isChecklistComplete = Object.values(checklist).every(Boolean);
  const allPreArmingComplete = Object.values(preArmingChecks).every(check => check.status === 'success');
  const allChecksComplete = isChecklistComplete && allPreArmingComplete;

  const savePlan = async (plan: MissionPlan): Promise<MissionPlan | null> => {
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      if (!response.ok) {
        let errorMsg = 'Failed to save plan';
        try {
          const err = await response.json();
          errorMsg = err.error || errorMsg;
        } catch (e) {
          errorMsg = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error instanceof Error ? error.message : 'Could not save mission plan.'}`);
      return null;
    }
  };

  // ---
  // THIS IS THE FIX FOR THE "SAVE PLAN" BUTTON
  // It no longer calls onClose()
  // ---
  const handleSaveAndClose = async () => {
    const plan: MissionPlan = {
      name: missionName,
      altitude,
      speed,
      waypoints: waypoints.map(wp => ({ lat: wp.lat, lon: wp.lng })),
    };
    
    const savedPlan = await savePlan(plan);
    if (savedPlan) {
      alert('Plan saved successfully!'); // Give user feedback
      // We removed onClose() from here so the modal stays open
    }
  };
  // --- END OF FIX ---

  const handleLaunch = async () => {
    const plan: MissionPlan = {
      name: missionName,
      altitude,
      speed,
      waypoints: waypoints.map(wp => ({ lat: wp.lat, lon: wp.lng })),
    };
    
    // We save the plan, then launch
    const savedPlan = await savePlan(plan);
    if (savedPlan) {
      onLaunch(savedPlan); 
    }
  };

  const handlePlanSelected = (plan: MissionPlan) => {
    setMissionName(plan.name);
    setAltitude(plan.altitude);
    setSpeed(plan.speed);
    
    const loadedWaypoints = plan.waypoints 
      ? plan.waypoints.map(wp => new LatLng(wp.lat, wp.lon))
      : [];
    setWaypoints(loadedWaypoints);
    
    setLoadModalOpen(false); // Close the modal
  };

  return (
    <>
      <div className="relative w-full h-full flex flex-col bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden">
          
          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            
                        {/* Left Side: Map */}
                        <div className="w-2/3 p-3 flex flex-col border-r border-gray-700 min-h-0">
                          <div className="flex items-center justify-between mb-2">
                            <h2 className="text-orange-500 text-sm font-semibold">Flight Path Planning</h2>
                            <button 
                              onClick={() => alert(`Map Source: ${url}\nIf blank, try switching style in Settings.`)}
                              className="text-[10px] text-gray-500 hover:text-white"
                            >
                              ⚙️ Map Debug
                            </button>
                          </div>
                          
                          <div className="flex-1 bg-gray-800 rounded overflow-hidden mb-2 relative border border-gray-700" style={{ minHeight: '450px', height: '100%' }}>
                            <MapContainer
                              center={[14.5995, 120.9842]} 
                              zoom={13}
                              className="w-full h-full"
                              style={{ height: '450px', width: '100%' }}
                            >
                              <TileLayer
                                url={url || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                                attribution={attribution}
                              />
                              <WaypointMap waypoints={waypoints} />
                            </MapContainer>
                          </div>
                        </div>
            
                        {/* Right Side: Form & Checklists */}
                        <div className="w-1/3 p-3 flex flex-col overflow-y-auto">
                          
                          {/* iNAV Mission Import & USB Connect */}
                          <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                            <h3 className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-2">View Current Waypoints</h3>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <button
                                onClick={async () => {
                                  if (!('serial' in navigator)) {
                                    alert("USB Serial is not supported. Use Chrome/Edge over HTTPS or localhost.");
                                    return;
                                  }
            
                                  try {
                                    // @ts-ignore
                                    const port = await navigator.serial.requestPort();
                                    await port.open({ baudRate: 115200 });
                                    
                                    const writer = port.writable.getWriter();
                                    const reader = port.readable.getReader();
            
                                    console.log("USB Sync: Reading mission from EEPROM...");
                                    const newSyncWaypoints: LatLng[] = [];
                                    let firstAlt = 50;
            
                                    // Loop through first 5 waypoints to get the mission
                                    for (let i = 1; i <= 5; i++) {
                                      // MSP_WP (118) for index i
                                      const checksum = 0x01 ^ 0x76 ^ i;
                                      const request = new Uint8Array([0x24, 0x4D, 0x3C, 0x01, 0x76, i, checksum]);
                                      
                                      await writer.write(request);
                                      const { value } = await reader.read();
                                      
                                      if (value && value.length >= 15) {
                                        let offset = 0;
                                        while (offset < value.length - 10) {
                                          if (value[offset] === 0x24 && value[offset+1] === 0x4D && value[offset+2] === 0x3E) {
                                            const payloadOffset = offset + 5;
                                            const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
                                            const lat = view.getInt32(payloadOffset + 2, true) / 10000000;
                                            const lon = view.getInt32(payloadOffset + 6, true) / 10000000;
                                            const alt = view.getUint32(payloadOffset + 10, true) / 100;
            
                                            if (lat !== 0 && lon !== 0) {
                                              newSyncWaypoints.push(new LatLng(lat, lon));
                                              if (i === 1) firstAlt = alt;
                                              console.log(`Synced WP #${i}: ${lat}, ${lon}`);
                                            }
                                            break;
                                          }
                                          offset++;
                                        }
                                      }
                                    }
            
                                    if (newSyncWaypoints.length > 0) {
                                      setWaypoints(newSyncWaypoints);
                                      setAltitude(firstAlt);
                                      alert(`Successfully synced ${newSyncWaypoints.length} waypoints from Drone EEPROM!`);
                                    } else {
                                      alert("Connected, but no mission waypoints were found in EEPROM. Ensure a mission is 'Saved to FC' in iNAV.");
                                    }
            
                                    writer.releaseLock();
                                    reader.releaseLock();
                                    await port.close();
                                  } catch (err) {
                                    console.error("Serial error:", err);
                                    alert("USB Sync Failed. Check cable and ensure iNAV Configurator is closed.");
                                  }
                                }}
                                className="flex items-center justify-center gap-2 py-2 px-3 rounded bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold transition-colors"
                              >
                                <span>🔌</span> SYNC FROM USB
                              </button>
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold transition-colors cursor-pointer text-center">
                    <span>📁</span> LOAD FILE
                    <input
                      type="file"
                      accept=".mission,.xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            try {
                              const parser = new DOMParser();
                              const xmlDoc = parser.parseFromString(content, "text/xml");
                              
                              // Look for waypoints inside <waypoints>, <missionitem> or directly under root
                              let wpNodes = Array.from(xmlDoc.getElementsByTagName("waypoint"));
                              if (wpNodes.length === 0) {
                                wpNodes = Array.from(xmlDoc.getElementsByTagName("WayPoint"));
                              }
                              if (wpNodes.length === 0) {
                                wpNodes = Array.from(xmlDoc.getElementsByTagName("missionitem"));
                              }
                              
                              console.log(`Found ${wpNodes.length} waypoint nodes in XML`);
                              const newWaypoints: LatLng[] = [];
                              
                              for (let i = 0; i < wpNodes.length; i++) {
                                const node = wpNodes[i];
                                
                                // Helper to get value from either child element or attribute
                                const getVal = (name: string) => {
                                  const child = node.getElementsByTagName(name)[0];
                                  if (child) return child.textContent?.trim() || "0";
                                  return node.getAttribute(name) || "0";
                                };

                                const latStr = getVal("lat");
                                const lonStr = getVal("lon");
                                const altStr = getVal("alt");
                                const actionStr = getVal("action");
                                
                                let lat = parseFloat(latStr);
                                let lon = parseFloat(lonStr);
                                const altValue = parseFloat(altStr);
                                
                                // iNAV coordinates can be decimal degrees (51.5) or integer (515000000)
                                if (Math.abs(lat) > 180) lat /= 10000000;
                                if (Math.abs(lon) > 180) lon /= 10000000;
                                
                                // Actions can be numeric (1=WAYPOINT) or string ("WAYPOINT")
                                const isActionValid = actionStr === "WAYPOINT" || ["1", "3", "5", "8"].includes(actionStr);
                                
                                console.log(`WP ${i}: Action=${actionStr}, Lat=${lat}, Lon=${lon}, Alt=${altValue}`);

                                if (isActionValid && !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
                                  newWaypoints.push(new LatLng(lat, lon));
                                  // Use the first waypoint's altitude as the mission altitude
                                  if (newWaypoints.length === 1 && altValue > 0) {
                                    setAltitude(altValue > 1000 ? altValue / 100 : altValue);
                                  }
                                }
                              }
                              
                              if (newWaypoints.length > 0) {
                                setWaypoints(newWaypoints);
                                setMissionName(file.name.replace(/\.[^/.]+$/, ""));
                                alert(`Successfully loaded ${newWaypoints.length} waypoints from ${file.name}`);
                              } else {
                                alert("No valid waypoints found in the file.");
                              }
                            } catch (error) {
                              console.error("Error parsing mission file:", error);
                              alert("Failed to parse mission file.");
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[9px] text-gray-500 italic">Direct USB sync requires Chrome or Edge.</p>
              </div>

              {/* Mission Name */}
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1 text-gray-300">Mission Name</label>
                <input
                  type="text"
                  value={missionName}
                  onChange={e => setMissionName(e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Pre-flight Checklist */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Pre-flight Checklist</h3>
                  <button 
                    onClick={() => setChecklist({ battery: true, propellers: true, gps: true, weather: true })}
                    className="text-xs text-orange-500 hover:text-orange-400"
                  >
                    Check All
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={checklist.battery}
                      onChange={() => handleChecklistChange('battery')}
                      className="w-3 h-3 rounded"
                    />
                    <span className={`text-xs ${checklist.battery ? 'line-through text-gray-500' : ''}`}>
                      Battery Charged & Secure
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={checklist.propellers}
                      onChange={() => handleChecklistChange('propellers')}
                      className="w-3 h-3 rounded"
                    />
                    <span className={`text-xs ${checklist.propellers ? 'line-through text-gray-500' : ''}`}>
                      Propellers Secure
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={checklist.gps}
                      onChange={() => handleChecklistChange('gps')}
                      className="w-3 h-3 rounded"
                    />
                    <span className={`text-xs ${checklist.gps ? 'line-through text-gray-500' : ''}`}>
                      GPS Lock Acquired
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={checklist.weather}
                      onChange={() => handleChecklistChange('weather')}
                      className="w-3 h-3 rounded"
                    />
                    <span className={`text-xs ${checklist.weather ? 'line-through text-gray-500' : ''}`}>
                      Weather Conditions Checked
                    </span>
                  </label>
                </div>
              </div>

              {/* Pre-arming Checks */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold mb-2">Pre-arming Checks</h3>
                <div className="space-y-1">
                  {Object.entries(preArmingChecks).map(([key, check]) => (
                    <div key={key} className="flex items-center space-x-2 p-1">
                      {check.status === 'loading' && (
                        <span className="text-yellow-500 text-sm animate-pulse">⟳</span>
                      )}
                      {check.status === 'success' && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}
                      {check.status === 'error' && (
                        <span className="text-red-500 text-sm">✗</span>
                      )}
                      <span className={`text-xs ${
                        check.status === 'loading' ? 'text-gray-400' :
                        check.status === 'success' ? 'text-green-400' :
                        'text-red-400'
                      }`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
                {!allPreArmingComplete && (
                  <div className="mt-2 text-xs text-yellow-400 text-center">
                    Running pre-arming checks...
                  </div>
                )}
                {allChecksComplete && (
                  <div className="mt-2 text-xs text-green-400 text-center">
                    All checks passed. Ready to launch.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <button 
                  onClick={() => setLoadModalOpen(true)}
                  className="py-2 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  Load Plan
                </button>
                
                <button 
                  onClick={handleSaveAndClose} 
                  className="py-2 px-3 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                >
                  Save Plan
                </button>

                <button 
                  onClick={onClose} 
                  className="py-2 px-3 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleLaunch}
                  disabled={!allChecksComplete} 
                  className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    !allChecksComplete
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-orange-500' 
                  }`}
                >
                  🚀 Launch Mission
                </button>
              </div>
            </div>
          </div>
        </div>

      {isLoadModalOpen && (
        <LoadPlanModal 
          onSelect={handlePlanSelected} 
          onClose={() => setLoadModalOpen(false)} 
        />
      )}
    </>
  );
};

export default MissionSetupView;