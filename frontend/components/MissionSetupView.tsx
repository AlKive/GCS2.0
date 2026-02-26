import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
const WaypointMap = React.memo(({ waypoints, onAddWaypoint }: { 
    waypoints: LatLng[], 
    onAddWaypoint: (latlng: LatLng) => void 
}) => {
  useMapEvents({
    click(e) {
      onAddWaypoint(e.latlng);
    },
  });

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
  const [undoStack, setUndoStack] = useState<LatLng[][]>([]);
  const [redoStack, setRedoStack] = useState<LatLng[][]>([]);
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
  
  const handleAddWaypoint = React.useCallback((latlng: LatLng) => {
    setUndoStack(prev => [...prev, waypoints]);
    setRedoStack([]);
    setWaypoints(prev => [...prev, latlng]);
  }, [waypoints]);

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, waypoints]);
      setWaypoints(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, waypoints]);
      setWaypoints(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (waypoints.length > 0) {
      setUndoStack(prev => [...prev, waypoints]);
      setRedoStack([]);
      setWaypoints([]);
    }
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
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-full h-full flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b border-gray-700">
            <h1 className="text-base font-bold">Mission Setup & Pre-flight Checklist</h1>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            
            {/* Left Side: Map */}
            <div className="w-2/3 p-3 flex flex-col border-r border-gray-700">
              <h2 className="text-orange-500 text-sm font-semibold mb-2">Flight Path Planning</h2>
              
              <div className="flex-1 bg-gray-800 rounded overflow-hidden mb-2">
                <MapContainer
                  center={[14.5995, 120.9842]} 
                  zoom={13}
                  className="w-full h-full"
                >
                  <TileLayer
                    url={url}
                    attribution={attribution}
                  />
                  <WaypointMap waypoints={waypoints} onAddWaypoint={handleAddWaypoint} />
                </MapContainer>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Undo
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Redo
                </button>
                <button 
                  onClick={handleClear}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {/* Right Side: Form & Checklists */}
            <div className="w-1/3 p-3 flex flex-col overflow-y-auto">
              
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
                  className={`py-2 px-3 rounded text-xs font-semibold transition-colors ${
                    !allChecksComplete
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white' 
                  }`}
                >
                  Launch Mission
                </button>
              </div>
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