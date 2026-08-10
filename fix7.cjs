const fs = require('fs');
let content = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf8');

const t1 = `  // Location Details Modal States
  const [selectedLocationRecord, setSelectedLocationRecord] = useState<any | null>(null);`;

const r1 = `  // Location Details Modal States
  const [selectedLocationRecord, setSelectedLocationRecord] = useState<any | null>(null);
  const [modalReverseAddress, setModalReverseAddress] = useState<string>("Address unavailable");

  useEffect(() => {
    if (selectedLocationRecord) {
      const primaryLog = selectedLocationRecord?.empLogs?.[0] || {};
      const lat = primaryLog?.gps_latitude || primaryLog?.latitude;
      const lng = primaryLog?.gps_longitude || primaryLog?.longitude;
      if (lat && lng) {
        setModalReverseAddress("Fetching address...");
        fetchReverseGeocode(lat, lng).then(addr => setModalReverseAddress(addr));
      } else {
        setModalReverseAddress("Address unavailable");
      }
    }
  }, [selectedLocationRecord]);`;

content = content.replace(t1, r1);
fs.writeFileSync('src/components/EmployerDashboard.tsx', content);
