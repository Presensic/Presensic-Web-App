import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let env = fs.readFileSync('.env.local', 'utf8');
let url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
let key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function run() {
  const { data: emps, error } = await supabase.from('employees').select('*').limit(3);
  console.log("Emps:", JSON.stringify(emps, null, 2));
  
  const { data: logs, error: logsError } = await supabase.from('attendance_logs').select('*').limit(3);
  console.log("Logs:", JSON.stringify(logs, null, 2));
}
run();
