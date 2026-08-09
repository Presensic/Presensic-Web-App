import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const { data: comp } = await supabase.from('companies').select('id').limit(1).single();
  console.log("Company ID:", comp?.id);

  if (comp) {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        id: 'EMP-TEST-' + Date.now(),
        name: 'Test Employee',
        company_id: comp.id
      })
      .select();
    console.log("Insert Result:", data);
    console.log("Insert Error:", error);
  }
}

testInsert();
