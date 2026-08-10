const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

// Replace the first occurrence
content = content.replace(/isInsideGeofence = true;\s*const sorted = \[\.\.\.empLogs\]/g, `let allInside = true;
        const sorted = [...empLogs]`);

content = content.replace(/if \(!logInside\) \{\s*isInsideGeofence = false;\s*hasGpsFailure = true;\s*\}/g, `if (!logInside) {
             allInside = false;
             hasGpsFailure = true;
          }`);

content = content.replace(/hasFaceFailure = true;\s*\}\s*\}\);\s*\}/g, `hasFaceFailure = true;
          }
        });
        isInsideGeofence = allInside;
      }`);

fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
