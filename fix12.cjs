const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const t1 = `                        if (l.is_test) {
                          hasTestRecord = true;
                        }
                      });
                    }`;

const r1 = `                        if (l.is_test) {
                          hasTestRecord = true;
                        }
                      });
                      isInsideGeofence = allInside;
                    }`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
