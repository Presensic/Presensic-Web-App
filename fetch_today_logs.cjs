const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  console.log("Fetching attendance_logs...");
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .order('time', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found", data.length, "logs.");
  console.log(JSON.stringify(data, null, 2));
}
run();
