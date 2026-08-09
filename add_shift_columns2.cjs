require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
async function run() {
  const query = `
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'fixed';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_start TEXT DEFAULT '09:00';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_end TEXT DEFAULT '18:00';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 15;
  `;
  const { data, error } = await supabase.rpc('query', { query });
  console.log("Data:", data, "Error:", error);
}
run();
