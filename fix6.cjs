const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const helper = `async function fetchReverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lon}\`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Presensic/1.0 (contact: presensic@gmail.com)"
      }
    });
    if (!response.ok) throw new Error("OSM Nominatim API request failed");
    const data = await response.json();
    if (data) {
       return data.display_name;
    }
  } catch (e) {
    console.error(e);
  }
  return "Unknown Location";
}

const mapLogFromDB`;

content = content.replace('const mapLogFromDB', helper);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
