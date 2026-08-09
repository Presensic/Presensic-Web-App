const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('geofence_anchors').insert([{
    company_id: 7,
    name: 'Marathon Nexzone',
    latitude: 18.9658757,
    longitude: 73.1269787,
    radius_meters: 150
  }]).select();
  console.log("data", JSON.stringify(data, null, 2));
  console.log("error", error);
}
run();
