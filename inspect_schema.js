import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('query_schema', {});
  console.log("RPC Error:", error);
  
  // Alternative: just do an insert that fails, and see the error.
  const { data: d2, error: e2 } = await supabase
    .from('employees')
    .insert({ id: 'test', name: 'test' });
  console.log("Insert Error:", e2);
}

checkSchema();
