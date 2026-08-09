const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('pg_proc')
    .select('proname')
    .ilike('proname', '%sql%');
  console.log("Functions with 'sql':", data, "Error:", error);

  const { data: data2, error: error2 } = await supabase
    .from('pg_proc')
    .select('proname')
    .ilike('proname', '%query%');
  console.log("Functions with 'query':", data2, "Error:", error2);
}
run();
