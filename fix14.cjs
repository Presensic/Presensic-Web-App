const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

content = content.replace(/lat: ez\.toLowerCase\(\)\.includes\("marathon nexzone"\) \? 18\.9658757 : 18\.96,/g, 'lat: 18.96,');
content = content.replace(/lng: ez\.toLowerCase\(\)\.includes\("marathon nexzone"\) \? 73\.1269787 : 73\.12,/g, 'lng: 73.12,');

fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
