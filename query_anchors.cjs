const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('geofence_anchors').select('*');
  console.log("data", JSON.stringify(data, null, 2));
  if (error) console.log("error", error);
}
run();
