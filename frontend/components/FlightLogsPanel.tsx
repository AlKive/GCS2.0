import React, { useState, useMemo } from 'react';
import type { Mission } from 'types';
import MissionTrackMap from './MissionTrackMap'; // Import the map

// ---
// FIX #1: Import the new 'downloadMissionReport' function
// ---
import { downloadMissionReport } from '../utils/downloadReport'; 

// --- Helper Icons for Buttons (Using inline SVGs) ---
const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const SearchIcon = () => (
  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
// ---

interface FlightLogsPanelProps {
  missions: Mission[];
  mapStyle: string;
}

const FlightLogsPanel: React.FC<FlightLogsPanelProps> = ({ missions, mapStyle }) => {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(missions[0] || null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false); 
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Missions');

  // This is the GPS track to display on the map.
  const displayTrack = selectedMission?.gpsTrack || selectedMission?.plan_waypoints || [];

  // ---
  // FIX #2: Update the download handler
  // ---
  const handleDownloadReport = () => {
    if (!selectedMission) {
      alert("Please select a mission to download.");
      return;
    }
    downloadMissionReport(selectedMission);
  };
  // --- END OF FIX ---

  const handleExport = () => {
    alert("Exporting all logs...");
    // In a real app, you would convert 'filteredMissions' to CSV here
  };
  
  const filteredMissions = useMemo(() => {
    const now = new Date();
    
    return missions.filter(mission => {
      // 1. Filter by Search Query
      if (!mission.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // 2. Filter by Status
      if (statusFilter !== 'All' && mission.status !== statusFilter) {
        return false;
      }

      // 3. Filter by Date Range
      if (dateFilter !== 'All Missions') {
        const missionDate = new Date(mission.date);
        if (isNaN(missionDate.getTime())) return false; // Skip invalid dates

        const diffTime = now.getTime() - missionDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === 'Last 7 Days' && diffDays > 7) {
          return false;
        }
        if (dateFilter === 'Last 30 Days' && diffDays > 30) {
          return false;
        }
      }
      return true;
    });
  }, [missions, searchQuery, statusFilter, dateFilter]);

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left: Mission List */}
      <div className="w-1/3 h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-bold mb-3 dark:text-white">Mission History</h2>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-8 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white border border-transparent focus:border-orange-500 focus:ring-0 focus:outline-none"
          />
          <SearchIcon />
        </div>

        {/* Filter/Export Buttons */}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center text-sm font-medium py-1 px-3 rounded-lg transition-colors
              ${showFilters 
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-300' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <FilterIcon />
            <span className="ml-1.5">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-3 rounded-lg transition-colors"
          >
            <ExportIcon />
            <span className="ml-1.5">Export Logs</span>
          </button>
        </div>

        {/* Improved Filter Panel (conditionally rendered) */}
        {showFilters && (
          <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg mb-3 animate-fade-in-fast">
            <h4 className="font-semibold text-sm mb-2 dark:text-white">Filter Options</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:border-orange-500 focus:ring-0 focus:outline-none"
                >
                  <option>All</option>
                  <option>Completed</option>
                  <option>Interrupted</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Date Range</label>
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:border-orange-500 focus:ring-0 focus:outline-none"
                >
                  <option>All Missions</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2">
          {filteredMissions.length === 0 ? (
             <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
               No missions found.
             </div>
          ) : (
            filteredMissions.map(mission => (
              <div
                key={mission.id}
                onClick={() => setSelectedMission(mission)}
                className={`p-3 rounded-lg mb-2 cursor-pointer border-l-4
                  ${selectedMission?.id === mission.id
                    ? 'bg-orange-100 dark:bg-orange-600/30 border-orange-500'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                <p className="font-semibold dark:text-white">{mission.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {mission.date} - {mission.duration || '0'} secs
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  mission.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {mission.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Mission Details */}
      <div className="w-2/3 h-full flex flex-col pl-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm h-full flex flex-col p-4">
          {!selectedMission ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a mission to view details.
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1 dark:text-white">
                {selectedMission.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {selectedMission.date}
              </p>
              
              <div className="w-full h-2/5 rounded-lg overflow-hidden bg-gray-700">
                <MissionTrackMap track={displayTrack} mapStyle={mapStyle} />
              </div>

              <h3 className="text-base font-bold mt-4 mb-2 dark:text-white">Detected Objects</h3>
              <div className="flex-1 w-full overflow-y-auto bg-gray-100 dark:bg-gray-900 rounded-lg p-3 min-h-0">
                {(!selectedMission.detectedSites || selectedMission.detectedSites.length === 0) ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No objects detected for this mission.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedMission.detectedSites.map((site, index) => (
                      <li key={index} className="p-2 bg-white dark:bg-gray-800 rounded shadow-sm">
                        <p className="font-semibold text-orange-600">
                          {site.object}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> ({site.type})</span>
                        </p>
                        <p className="text-xs font-mono text-gray-600 dark:text-gray-300">
                          BBox: {site.bbox ? site.bbox.map(coord => coord.toFixed(4)).join(', ') : 'N/A'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between items-center mt-4">
                <div>
                  <InfoItem label="Status" value={selectedMission.status} />
                  <InfoItem label="Duration" value={`${selectedMission.duration || '0'} secs`} />
                  <InfoItem label="Location" value={selectedMission.location} />
                </div>
                {/* ---
                FIX #3: Button text and onClick handler updated
                ---
                */}
                <button
                  onClick={handleDownloadReport}
                  disabled={!selectedMission}
                  className="py-2 px-5 bg-orange-600 text-white font-semibold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download Report
                </button>
                {/* --- END OF FIX --- */}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <p className="text-sm text-gray-600 dark:text-gray-300">
    {label}: <span className="font-semibold dark:text-white">{value}</span>
  </p>
);

export default FlightLogsPanel;