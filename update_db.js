import { createClient } from '@supabase/supabase-js';
const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';
const supabase = createClient(url, key);

async function run() {
  console.log("Adding columns to employees table...");
  
  const queries = [
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_descriptor TEXT;',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_lock_setup BOOLEAN DEFAULT FALSE;'
  ];

  for (const query of queries) {
    const { data, error } = await supabase.rpc('query', { query });
    if (error) {
      console.error(`Error executing query "${query}":`, error);
    } else {
      console.log(`Successfully executed: ${query}`);
    }
  }
}

run();
