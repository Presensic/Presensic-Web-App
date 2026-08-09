import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from environment");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log(`Using URL: ${url}`);
  console.log("Adding is_test column to attendance_logs table...");
  
  const query = 'ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;';
  
  // Try common RPC names
  const rpcNames = ['query', 'exec_sql', 'execute_sql'];
  
  for (const rpcName of rpcNames) {
    console.log(`Trying RPC "${rpcName}"...`);
    const { data, error } = await supabase.rpc(rpcName, { query });
    if (!error) {
      console.log(`Successfully executed using RPC "${rpcName}"`);
      process.exit(0);
    }
    console.log(`RPC "${rpcName}" failed: ${error.message}`);
  }
  
  console.error("All RPC attempts failed.");
  process.exit(1);
}

run();
