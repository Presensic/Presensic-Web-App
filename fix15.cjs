const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf8');

content = content.replace(/\{import\.meta\.env\.VITE_ENABLE_TEST_MODE === "true" && \(\s*\)\}/g, '');

fs.writeFileSync('src/components/EmployeeDashboard.tsx', content);
