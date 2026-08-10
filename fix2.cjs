const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const replacement = `let logInside = false;
          const empZone = zones.find(z => z.name === (emp.zone || l.zone));
          const radius = empZone?.radius || currentCompany?.geofence_radius || 150;

          if (empZone && empZone.lat && empZone.lng && l.gps_latitude != null && l.gps_longitude != null) {
            const dist = calculateDistance(Number(l.gps_latitude), Number(l.gps_longitude), Number(empZone.lat), Number(empZone.lng));
            if (dist <= radius && l.gps_verified !== false) {
              logInside = true;
            }
          } else if (l.distance != null && l.distance <= radius && l.gps_verified !== false) {
            logInside = true;
          }

          if (l.isNotRegistered || l.gps_verified === false || l.inside_geofence === false) {
            logInside = false;
          }`;

let replaced = false;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('empLogs.forEach(l => {')) {
    if (lines[i+1] && lines[i+1].includes('let logInside = true;')) {
      // replace lines[i+1] to lines[i+11]
      lines.splice(i+1, 11, replacement);
      replaced = true;
    }
  }
}
fs.writeFileSync('src/components/EmployerDashboard.tsx', lines.join('\n'));
