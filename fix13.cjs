const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf8');

const t1 = `              let finalLng = Number(matchedAnchor.longitude || matchedAnchor.lng);
              
              if (displayName && displayName.toLowerCase().includes("marathon nexzone")) {
                // Force correct exact coordinates for Marathon Nexzone to fix discrepancy
                finalLat = 18.9658757;
                finalLng = 73.1269787;
              }

              setCompanyGeofence({`;

const r1 = `              let finalLng = Number(matchedAnchor.longitude || matchedAnchor.lng);

              setCompanyGeofence({`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployeeDashboard.tsx', content);
