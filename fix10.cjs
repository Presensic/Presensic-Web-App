const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf8');

content = content.replace(/const \[testModeEnabled[\s\S]*?=== 'true';/g, '');

content = content.replace(/testModeEnabled \? "\[TEST\] " : ""/g, '""');

content = content.replace(/is_test: testModeEnabled,/g, 'is_test: false,');

content = content.replace(/\|\| \(\(testModeEnabled && simulatedCoords\) \? simulatedCoords : detectedCoords\)/g, '|| detectedCoords');

content = content.replace(/overrideCoords \? overrideCoords.accuracy : \(\(testModeEnabled && simulatedCoords\) \? simulatedCoords.accuracy : detectedCoords\?.accuracy\)/g, 'overrideCoords ? overrideCoords.accuracy : detectedCoords?.accuracy');

content = content.replace(/let address = \(testModeEnabled && simulatedCoords\) \? "Simulated Test Location" : detectedAddress;/g, 'let address = detectedAddress;');

content = content.replace(/<button\s+type="button"\s+onClick=\{\(\) => setTestModeEnabled\(\!testModeEnabled\)\}[\s\S]*?<\/button>/g, '');

content = content.replace(/\{\/\* TEST MODE PANEL \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>/g, '');

fs.writeFileSync('src/components/EmployeeDashboard.tsx', content);
