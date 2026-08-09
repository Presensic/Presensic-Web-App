const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('employees').select('id, name, tracking_geofence, assigned_anchor_id, company_id');
  if (error) console.error(error);
  else console.log("data", JSON.stringify(data, null, 2));
}
run();
