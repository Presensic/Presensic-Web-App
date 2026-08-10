const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const t1 = `          // Extract location address or name
          const locationName = primaryLog?.location_name || "Unknown Location";
          const locationAddress = primaryLog?.location_address || "Address unavailable";`;

const r1 = `          // Extract location address or name
          const locationName = primaryLog?.location_name || "Captured Coordinates";
          const locationAddress = primaryLog?.location_address && primaryLog?.location_address !== "Unknown Location" ? primaryLog.location_address : modalReverseAddress;`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
