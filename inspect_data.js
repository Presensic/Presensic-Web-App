import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: d1, error: e1 } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  console.log("Employees Data:", d1);
  console.log("Employees Error:", e1);
}

checkData();
