import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';

const supabase = createClient(url, key);

async function run() {
  console.log("Creating tables for Forgot Password reset flows...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      whatsapp TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS pin_reset_requests (
      id SERIAL PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending'
    );`,
    `ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow public access for password_resets" ON password_resets;`,
    `CREATE POLICY "Allow public access for password_resets" ON password_resets FOR ALL USING (true) WITH CHECK (true);`,
    `ALTER TABLE pin_reset_requests ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow public access for pin_reset_requests" ON pin_reset_requests;`,
    `CREATE POLICY "Allow public access for pin_reset_requests" ON pin_reset_requests FOR ALL USING (true) WITH CHECK (true);`
  ];

  for (const q of queries) {
    const { data, error } = await supabase.rpc('query', { query: q });
    if (error) {
      console.error(`Error executing: ${q.substring(0, 50)}...`, error);
    } else {
      console.log(`Successfully executed: ${q.substring(0, 50)}...`);
    }
  }
}

run();
