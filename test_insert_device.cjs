const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  console.log("Testing insert with device_info and ip_address...");
  const payload = {
    employee_id: "EMP-001",
    company_id: 1,
    time: "09:00 AM",
    status: "On Time",
    device_info: "Test Device",
    ip_address: "127.0.0.1",
    is_test: true
  };

  const { data, error } = await supabase.from('attendance_logs').insert([payload]);
  console.log("Insert result:", { data, error });
}
run();
