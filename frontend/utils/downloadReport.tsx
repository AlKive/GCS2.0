import type { Mission, FlightSession } from 'types';

// This function converts a single mission or flight session object into a CSV string
export const downloadMissionReport = (data: Mission | FlightSession) => {
  if (!data) return;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Property,Value\r\n";

  if ('start_time' in data) {
    // Handling FlightSession
    csvContent += `Session ID,"${data.id}"\r\n`;
    csvContent += `Start Time,"${data.start_time}"\r\n`;
    csvContent += `End Time,"${data.end_time || 'Ongoing'}"\r\n`;
    csvContent += `Status,"${data.status}"\r\n`;
    csvContent += `Location,"${data.location?.barangay_name || 'N/A'}, ${data.location?.city || ''}"\r\n`;

    if (data.target_detections && data.target_detections.length > 0) {
      csvContent += "\r\nDetected Objects\r\n";
      csvContent += "ID,Class Name,Detected At\r\n";
      data.target_detections.forEach((det) => {
        csvContent += `"${det.id}","${det.target_class}","${det.detected_at}"\r\n`;
      });
    }

    if (data.spray_logs && data.spray_logs.length > 0) {
      csvContent += "\r\nSpray Logs\r\n";
      csvContent += "ID,Trigger Type,Duration (s),Triggered At\r\n";
      data.spray_logs.forEach((log) => {
        csvContent += `"${log.id}","${log.trigger_type}",${log.spray_duration_seconds},"${log.triggered_at}"\r\n`;
      });
    }

    if (data.hardware_telemetry && data.hardware_telemetry.length > 0) {
      csvContent += "\r\nHardware Telemetry\r\n";
      csvContent += "Latitude,Longitude,Altitude (m)\r\n";
      data.hardware_telemetry.forEach(point => {
        csvContent += `${point.latitude},${point.longitude},${point.altitude_lidar_m}\r\n`;
      });
    }

  } else {
    // Handling Mission (Legacy)
    csvContent += `Mission Name,"${data.name}"\r\n`;
    csvContent += `Date,"${data.date}"\r\n`;
    csvContent += `Status,"${data.status}"\r\n`;
    csvContent += `Duration (secs),${data.duration || '0'}\r\n`;
    csvContent += `Location,"${data.location}"\r\n`;

    if (data.detectedSites && data.detectedSites.length > 0) {
      csvContent += "\r\nDetected Objects\r\n";
      csvContent += "Index,Class Name,Type,Bounding Box\r\n";
      data.detectedSites.forEach((site, index) => {
        const bbox = site.bbox ? `"${site.bbox.join(', ')}"` : "N/A";
        csvContent += `${index + 1},"${site.object}","${site.type}",${bbox}\r\n`;
      });
    }

    if (data.gpsTrack && data.gpsTrack.length > 0) {
      csvContent += "\r\nGPS Track\r\n";
      csvContent += "Latitude,Longitude\r\n";
      data.gpsTrack.forEach(point => {
        csvContent += `${point.lat},${point.lon}\r\n`;
      });
    }
  }

  // --- Download Logic ---
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  
  const name = ('name' in data) ? data.name : `session_${data.id.substring(0, 8)}`;
  const fileName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `${fileName}_report.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
