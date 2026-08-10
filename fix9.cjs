const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const t1 = `          // Geofence Distance calculation
          const distanceMeters = primaryLog?.distance_from_office_meters !== undefined && primaryLog?.distance_from_office_meters !== null 
            ? Math.round(primaryLog.distance_from_office_meters) 
            : (primaryLog?.distance ? parseInt(primaryLog.distance) : null);
          
          const isInside = primaryLog?.inside_geofence !== undefined && primaryLog?.inside_geofence !== null
            ? primaryLog.inside_geofence
            : selectedLocationRecord?.isInsideGeofence;`;

const r1 = `          // Geofence Distance calculation
          let distanceMeters = primaryLog?.distance_from_office_meters !== undefined && primaryLog?.distance_from_office_meters !== null 
            ? Math.round(primaryLog.distance_from_office_meters) 
            : (primaryLog?.distance ? parseInt(primaryLog.distance) : null);
          
          let isInside = primaryLog?.inside_geofence !== undefined && primaryLog?.inside_geofence !== null
            ? primaryLog.inside_geofence
            : selectedLocationRecord?.isInsideGeofence;

          // Dynamically recalculate if distance is null but we have coordinates
          const empZone = zones.find(z => z.name === (selectedLocationRecord?.emp?.zone || primaryLog?.zone));
          const radius = empZone?.radius || currentCompany?.geofence_radius || 150;
          if (modalLat && modalLng && empZone?.lat && empZone?.lng) {
             const dist = calculateDistance(Number(modalLat), Number(modalLng), Number(empZone.lat), Number(empZone.lng));
             if (distanceMeters === null || isNaN(distanceMeters)) {
               distanceMeters = dist;
             }
             if (primaryLog?.inside_geofence === undefined || primaryLog?.inside_geofence === null) {
               isInside = (dist <= radius);
             }
          }
          if (distanceMeters !== null && !isNaN(distanceMeters) && distanceMeters > radius) {
             isInside = false;
          }`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
