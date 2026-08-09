import { createClient } from '@supabase/supabase-js';

// Using credentials from update_db.js as fallback
const url = process.env.VITE_SUPABASE_URL || 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';

const supabase = createClient(url, key);

async function run() {
  console.log("Adding is_test column to attendance_logs table...");
  
  const query = 'ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;';
  const rpcNames = ['query', 'exec_sql', 'run_sql', 'execute_sql', 'sql'];

  let success = false;
  for (const rpcName of rpcNames) {
    console.log(`Trying RPC "${rpcName}"...`);
    
    // Try with 'query' parameter
    let { data, error } = await supabase.rpc(rpcName, { query });
    if (!error) {
      console.log(`Successfully executed using RPC "${rpcName}" with 'query' parameter`);
      success = true;
      break;
    }
    
    // Try with 'sql' parameter
    ({ data, error } = await supabase.rpc(rpcName, { sql: query }));
    if (!error) {
      console.log(`Successfully executed using RPC "${rpcName}" with 'sql' parameter`);
      success = true;
      break;
    }

    // Try with 'query_text' parameter
    ({ data, error } = await supabase.rpc(rpcName, { query_text: query }));
    if (!error) {
      console.log(`Successfully executed using RPC "${rpcName}" with 'query_text' parameter`);
      success = true;
      break;
    }
    
    console.log(`RPC "${rpcName}" failed: ${error.message}`);
  }

  if (success) {
    process.exit(0);
  } else {
    console.error("All RPC attempts failed.");
    process.exit(1);
  }
}

run();
