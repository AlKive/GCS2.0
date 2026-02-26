// A helper function to create and download a GPX file
export const downloadGpx = (track: { lat: number, lon: number }[], missionName: string) => {
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GCS" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${missionName}</name>
  </metadata>
  <trk>
    <name>${missionName} Track</name>
    <trkseg>
`;

  track.forEach(point => {
    gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}"></trkpt>\n`;
  });

  gpxContent += `    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  const fileName = missionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `${fileName}_track.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};