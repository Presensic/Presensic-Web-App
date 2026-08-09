const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  console.log("Adding device_info and ip_address columns to attendance_logs...");
  
  const queries = [
    'ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS device_info TEXT;',
    'ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;'
  ];

  const rpcNames = ['query', 'exec_sql', 'run_sql', 'execute_sql', 'sql'];

  for (const query of queries) {
    let success = false;
    for (const rpcName of rpcNames) {
      console.log(`Trying RPC "${rpcName}" for query: ${query}`);
      const { data, error } = await supabase.rpc(rpcName, { query });
      if (!error) {
        console.log(`Successfully executed using RPC "${rpcName}"`);
        success = true;
        break;
      } else {
        // Try other parameter names
        const { error: e2 } = await supabase.rpc(rpcName, { sql: query });
        if (!e2) {
          console.log(`Successfully executed using RPC "${rpcName}" with parameter "sql"`);
          success = true;
          break;
        }
        const { error: e3 } = await supabase.rpc(rpcName, { query_text: query });
        if (!e3) {
          console.log(`Successfully executed using RPC "${rpcName}" with parameter "query_text"`);
          success = true;
          break;
        }
        console.log(`RPC "${rpcName}" failed: ${error.message}`);
      }
    }
    if (!success) {
      console.error(`All RPCs failed for query: ${query}`);
    }
  }
}
run();
