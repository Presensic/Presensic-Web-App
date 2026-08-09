import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function seed() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_ANON_KEY!);
  
  const hash = await bcrypt.hash('Presensic@2026!', 10);
  const { data, error } = await supabase.from('super_admins').insert({
    full_name: 'Presensic Super Admin',
    email: 'admin@presensic.com',
    username: 'presensic_admin',
    password_hash: hash,
    role: 'Founder',
    status: 'Active'
  });
  if (error) console.error('Seed error:', error);
  else console.log('Seed successful');
}
seed();
