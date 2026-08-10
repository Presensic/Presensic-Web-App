const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeDashboard.tsx', 'utf8');

const t1 = `                    if (checkInTime !== "—" && checkInTime !== "null" && checkInTime !== null) {
                      if (!isLoggedIn) return "Checked Out";
                      
                      let displayDist = "On Site (Live)";
                      
                      // Try to calculate distance from last known location or currently computed distance
                      const lat1 = currentEmployeeInDb?.last_latitude;
                      const lng1 = currentEmployeeInDb?.last_longitude;
                      const lat2 = activeGeofence?.lat;
                      const lng2 = activeGeofence?.lng;
                      
                      let dist = computedDistance;
                      if ((dist === null || dist === undefined) && lat1 && lng1 && lat2 && lng2) {
                         dist = calculateDistance(lat1, lng1, lat2, lng2);
                      }
                      
                      if (dist !== null && dist !== undefined) {
                          const isInside = activeGeofence && dist <= (activeGeofence.radius || 150);
                          if (isInside) {
                              displayDist = "Inside Geofence";
                          } else {
                              displayDist = dist >= 1000 ? \`\${(dist / 1000).toFixed(1)} km from office\` : \`\${Math.round(dist)} m from office\`;
                          }
                      }`;

const r1 = `                    if (checkInTime !== "—" && checkInTime !== "null" && checkInTime !== null) {
                      if (!isLoggedIn) return "Checked Out";
                      
                      let displayDist = "Out of Bounds";
                      
                      // Try to calculate distance from last known location or currently computed distance
                      const lat1 = currentEmployeeInDb?.last_latitude;
                      const lng1 = currentEmployeeInDb?.last_longitude;
                      const lat2 = activeGeofence?.lat;
                      const lng2 = activeGeofence?.lng;
                      
                      let dist = computedDistance;
                      if ((dist === null || dist === undefined) && lat1 && lng1 && lat2 && lng2) {
                         dist = calculateDistance(lat1, lng1, lat2, lng2);
                      }
                      
                      if (dist !== null && dist !== undefined) {
                          const isInside = activeGeofence && dist <= (activeGeofence.radius || 150);
                          if (isInside) {
                              displayDist = "Inside Geofence";
                          } else {
                              displayDist = "Outside Geofence";
                          }
                      }`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployeeDashboard.tsx', content);
