import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.rpc('query', { query: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT FALSE;' });
  console.log("Data:", data, "Error:", error);
}
run();
