import { createClient } from '@supabase/supabase-js';

const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';

const supabase = createClient(url, key);

async function run() {
  console.log("Adding is_test column to attendance_logs table (HARDCODED CREDENTIALS)...");
  
  const query = 'ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;';
  
  console.log("Trying RPC 'query'...");
  const { data, error } = await supabase.rpc('query', { query });
  
  if (error) {
    console.error("Error executing query:", error);
    process.exit(1);
  } else {
    console.log("Successfully executed query.");
    process.exit(0);
  }
}

run();
