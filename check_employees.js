import { createClient } from '@supabase/supabase-js';
const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.from('employees').select('*').limit(1);
  console.log("Columns:", data ? Object.keys(data[0]) : "Error/Empty", "Error:", error);
  if (data && data.length > 0) {
    console.log("Example Row:", JSON.stringify(data[0], null, 2));
  }
}
run();
