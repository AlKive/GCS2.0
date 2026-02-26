import type { Mission } from 'types';

// This function converts a single mission object into a CSV string
export const downloadMissionReport = (mission: Mission) => {
  if (!mission) return;

  let csvContent = "data:text/csv;charset=utf-8,";

  // --- CSV Header ---
  csvContent += "Property,Value\r\n";
  
  // --- Mission Details ---
  csvContent += `Mission Name,"${mission.name}"\r\n`;
  csvContent += `Date,"${mission.date}"\r\n`;
  csvContent += `Status,"${mission.status}"\r\n`;
  csvContent += `Duration (secs),${mission.duration || '0'}\r\n`;
  csvContent += `Location,"${mission.location}"\r\n`;

  // --- Detected Objects ---
  if (mission.detectedSites && mission.detectedSites.length > 0) {
    // Add a header for the objects section
    csvContent += "\r\nDetected Objects\r\n";
    csvContent += "Index,Class Name,Type,Bounding Box\r\n";
    
    // Add each object as a new row
    mission.detectedSites.forEach((site, index) => {
      const bbox = site.bbox ? `"${site.bbox.join(', ')}"` : "N/A";
      csvContent += `${index + 1},"${site.object}","${site.type}",${bbox}\r\n`;
    });
  } else {
    csvContent += "\r\nDetected Objects,None\r\n";
  }

  // --- GPS Track (Optional, but good to include) ---
  if (mission.gpsTrack && mission.gpsTrack.length > 0) {
    csvContent += "\r\nGPS Track\r\n";
    csvContent += "Latitude,Longitude\r\n";
    mission.gpsTrack.forEach(point => {
      csvContent += `${point.lat},${point.lon}\r\n`;
    });
  }

  // --- Download Logic ---
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  
  const fileName = mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `${fileName}_report.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};