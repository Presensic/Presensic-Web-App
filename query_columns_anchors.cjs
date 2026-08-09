const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('geofence_anchors').select('*').limit(1);
  console.log("error", error);
  if (data) {
     console.log("columns", data.length > 0 ? Object.keys(data[0]) : "no data");
  }
}
run();
