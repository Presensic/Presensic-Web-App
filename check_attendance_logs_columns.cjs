const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('attendance_logs').select('*').limit(1);
  if (error) {
    console.error("Error fetching attendance_logs:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in attendance_logs:", Object.keys(data[0]));
  } else {
    console.log("No records in attendance_logs to infer columns.");
  }
}
run();
