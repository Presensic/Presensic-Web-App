import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const passwordHash = bcrypt.hashSync('7894561230', 10);
  const { data, error } = await supabase.from('master_admin').insert([{
    whatsapp: '+917894561230',
    password_hash: passwordHash,
    role: 'master_admin',
    is_active: true
  }]);
  console.log("Seed result:", data, "Error:", error);
}
run();
