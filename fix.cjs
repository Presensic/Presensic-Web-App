const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const replacement = `empLogs.forEach(l => {
          let logInside = false;
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
          }

          if (!logInside) { 
             isInsideGeofence = false;
             hasGpsFailure = true;
          }
          if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
            hasFaceFailure = true;
          }`;

const target1 = `empLogs.forEach(l => {
          let logInside = true;
          if (l.isNotRegistered || l.gps_verified === false || l.inside_geofence === false) {
            logInside = false;
          }
          const empZone = zones.find(z => z.name === (emp.zone || l.zone));
          if (empZone && empZone.lat && empZone.lng && l.gps_latitude != null && l.gps_longitude != null) {
            const dist = calculateDistance(l.gps_latitude, l.gps_longitude, empZone.lat, empZone.lng);
            if (dist > (empZone.radius || currentCompany?.geofence_radius || 150)) {
              logInside = false;
            }
          } else if (l.distance && l.distance > (empZone?.radius || currentCompany?.geofence_radius || 150)) {
            logInside = false;
          }
          if (!logInside) { 
             isInsideGeofence = false;
             hasGpsFailure = true;
          }
          if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
            hasFaceFailure = true;
          }`;

const replacement2 = `empLogs.forEach(l => {
                        let logInside = false;
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
                        }

                        if (!logInside) { 
                           isInsideGeofence = false;
                           hasGpsFailure = true;
                        }
                        if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
                          hasFaceFailure = true;
                        }
                        if (l.is_test) {
                          hasTestRecord = true;
                        }`;

const target2 = `empLogs.forEach(l => {
                        let logInside = true;
                        if (l.isNotRegistered || l.gps_verified === false || l.inside_geofence === false) {
                          logInside = false;
                        }
                        const empZone = zones.find(z => z.name === (emp.zone || l.zone));
                        if (empZone && empZone.lat && empZone.lng && l.gps_latitude != null && l.gps_longitude != null) {
                          const dist = calculateDistance(l.gps_latitude, l.gps_longitude, empZone.lat, empZone.lng);
                          if (dist > (empZone.radius || currentCompany?.geofence_radius || 150)) {
                            logInside = false;
                          }
                        } else if (l.distance && l.distance > (empZone?.radius || currentCompany?.geofence_radius || 150)) {
                          logInside = false;
                        }
                        if (!logInside) { 
                           isInsideGeofence = false;
                           hasGpsFailure = true;
                        }
                        if (l.status === "warning" || l.face_verified === false || l.verification_status === "failed") {
                          hasFaceFailure = true;
                        }
                        if (l.is_test) {
                          hasTestRecord = true;
                        }`;

content = content.replace(target1, replacement);
content = content.replace(target2, replacement2);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
