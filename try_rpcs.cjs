const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const query = 'SELECT 1;';
  const rpcs = ['query', 'exec_sql', 'run_sql', 'execute_sql', 'sql'];
  for (const rpc of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpc, { query });
      console.log(`RPC "${rpc}" with {query}:`, { data, error: error ? error.message : null });
    } catch (e) {
      console.log(`RPC "${rpc}" with {query} threw:`, e.message);
    }
    try {
      const { data, error } = await supabase.rpc(rpc, { sql: query });
      console.log(`RPC "${rpc}" with {sql}:`, { data, error: error ? error.message : null });
    } catch (e) {
      console.log(`RPC "${rpc}" with {sql} threw:`, e.message);
    }
  }
}
run();
