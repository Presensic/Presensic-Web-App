const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const modalT = `        {selectedLocationRecord && (() => {
          // Find the primary punch log for today.
          const primaryLog = selectedLocationRecord?.empLogs?.[0] || {};
          
          // Extract location address or name
          const locationName = primaryLog?.location_name || "Marathon Nexzone - Main Entrance";
          const locationAddress = primaryLog?.location_address || "Marathon Nexzone, Palaspe Phata, Panvel, Maharashtra 410206";
          
          // Latitude / Longitude
          const modalLat = primaryLog?.latitude || 18.9894;
          const modalLng = primaryLog?.longitude || 73.1175;

          // Parse encoded metadata in 'method' if present
          const methodStr = primaryLog?.method || '';
          let deviceInfo = primaryLog?.device_info || 'Chrome on Android';
          let ipAddress = primaryLog?.ip_address || '103.114.50.8';

          const deviceMatch = methodStr.match(/\\|\\|device:(.*?)\\|\\|/);
          if (deviceMatch) {
            deviceInfo = deviceMatch[1];
          }
          const ipMatch = methodStr.match(/\\|\\|ip:(.*?)\\|\\|/);
          if (ipMatch) {
            ipAddress = ipMatch[1];
          }

          // Geofence Distance calculation
          const distanceMeters = primaryLog?.distance_from_office_meters !== undefined && primaryLog?.distance_from_office_meters !== null 
            ? Math.round(primaryLog.distance_from_office_meters) 
            : 124;
          
          const isInside = primaryLog?.inside_geofence !== undefined && primaryLog?.inside_geofence !== null
            ? primaryLog.inside_geofence
            : selectedLocationRecord?.isInsideGeofence;

          const accuracy = primaryLog?.gps_accuracy ? \`\${Math.round(primaryLog.gps_accuracy)}m\` : '15m';`;

const modalR = `        {selectedLocationRecord && (() => {
          // Find the primary punch log for today.
          const primaryLog = selectedLocationRecord?.empLogs?.[0] || {};
          
          // Extract location address or name
          const locationName = primaryLog?.location_name || "Unknown Location";
          const locationAddress = primaryLog?.location_address || "Address unavailable";
          
          // Latitude / Longitude
          const modalLat = primaryLog?.gps_latitude || primaryLog?.latitude || 0;
          const modalLng = primaryLog?.gps_longitude || primaryLog?.longitude || 0;

          // Parse encoded metadata in 'method' if present
          const methodStr = primaryLog?.method || '';
          let deviceInfo = primaryLog?.device_info || 'Unknown Device';
          let ipAddress = primaryLog?.ip_address || 'Unknown IP';

          const deviceMatch = methodStr.match(/\\|\\|device:(.*?)\\|\\|/);
          if (deviceMatch) {
            deviceInfo = deviceMatch[1];
          }
          const ipMatch = methodStr.match(/\\|\\|ip:(.*?)\\|\\|/);
          if (ipMatch) {
            ipAddress = ipMatch[1];
          }

          // Geofence Distance calculation
          const distanceMeters = primaryLog?.distance_from_office_meters !== undefined && primaryLog?.distance_from_office_meters !== null 
            ? Math.round(primaryLog.distance_from_office_meters) 
            : (primaryLog?.distance ? parseInt(primaryLog.distance) : null);
          
          const isInside = primaryLog?.inside_geofence !== undefined && primaryLog?.inside_geofence !== null
            ? primaryLog.inside_geofence
            : selectedLocationRecord?.isInsideGeofence;

          const accuracy = primaryLog?.gps_accuracy ? \`\${Math.round(primaryLog.gps_accuracy)}m\` : (primaryLog?.gpsAccuracy || "Unknown");`;

content = content.replace(modalT, modalR);
content = content.replace('Verified Inside 150m Geofence Radius', 'Verified Inside ${currentCompany?.geofence_radius || 150}m Geofence Radius');
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
