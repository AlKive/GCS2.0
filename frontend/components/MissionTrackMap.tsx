import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L, { LatLng, LatLngBounds, Icon, DivIcon } from 'leaflet';

// This imports the marker icons as URLs so Vite can find them.
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

import { mapStyleProviders } from '../utils/mapStyles';

const DefaultIcon = new Icon({
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconAnchor: [12, 41],
    shadowAnchor: [12, 41]
});

// Custom Icons for Detections and Sprays
const DetectionIcon = new DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const SprayIcon = new DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(34,197,94,0.6); animation: pulse 2s infinite;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

interface MissionTrackMapProps {
  telemetry?: { latitude: number; longitude: number; altitude_lidar_m: number }[];
  detections?: { id: string; target_class: string; detected_at: string; image_url?: string; location?: any }[];
  sprays?: { id: string; trigger_type: string; spray_duration_seconds: number; triggered_at: string; location?: any }[];
  mapStyle?: string;
  // Fallback for legacy support
  track?: { lat: number; lon: number }[];
}

const MissionTrackMap: React.FC<MissionTrackMapProps> = ({ 
  telemetry = [], 
  detections = [], 
  sprays = [], 
  mapStyle = 'Satellite',
  track = [] 
}) => {
  const { url, attribution } = mapStyleProviders[mapStyle] || mapStyleProviders['Default'];
  
  // Normalize telemetry/track data for polyline
  const polylinePositions: LatLng[] = React.useMemo(() => {
    if (telemetry.length > 0) {
      return telemetry.map(p => new LatLng(p.latitude, p.longitude));
    }
    return track.map(p => new LatLng(p.lat, p.lon));
  }, [telemetry, track]);

  // Calculate bounds
  const bounds = React.useMemo(() => {
    if (polylinePositions.length > 0) {
      return new LatLngBounds(polylinePositions);
    }
    return null;
  }, [polylinePositions]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[14.5995, 120.9842]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        bounds={bounds || undefined}
      >
        <TileLayer url={url} attribution={attribution} />
        
        {/* Flight Path */}
        {polylinePositions.length > 0 && (
          <Polyline 
            pathOptions={{ color: '#F97316', weight: 3, opacity: 0.8 }} 
            positions={polylinePositions} 
          />
        )}

        {/* Detections */}
        {detections.map((det, idx) => {
          // Note: In a real scenario, detections should have coordinates. 
          // If they don't, we might need to correlate with telemetry or assume they have a 'location' field.
          // For now, let's assume they might have lat/lon or we skip markers without coords.
          const lat = (det as any).latitude;
          const lon = (det as any).longitude;
          if (lat && lon) {
            return (
              <Marker key={`det-${idx}`} position={[lat, lon]} icon={DetectionIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">Detection: {det.target_class}</p>
                    <p>{new Date(det.detected_at).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}

        {/* Sprays */}
        {sprays.map((spray, idx) => {
          const lat = (spray as any).latitude;
          const lon = (spray as any).longitude;
          if (lat && lon) {
            return (
              <Marker key={`spray-${idx}`} position={[lat, lon]} icon={SprayIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-green-600">Spray Triggered ({spray.trigger_type})</p>
                    <p>Duration: {spray.spray_duration_seconds}s</p>
                    <p>{new Date(spray.triggered_at).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}

        {/* Start/End Markers */}
        {polylinePositions.length > 0 && (
          <>
            <Marker position={polylinePositions[0]} icon={DefaultIcon}>
              <Popup>Start Point</Popup>
            </Marker>
            <Marker position={polylinePositions[polylinePositions.length - 1]} icon={DefaultIcon}>
              <Popup>Current/End Position</Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(MissionTrackMap);
