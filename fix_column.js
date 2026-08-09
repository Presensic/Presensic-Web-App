import { createClient } from '@supabase/supabase-js';
const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.from('employees').update({ face_setup_completed: true }).eq('id', 'PRES-1695');
  console.log("Update Error:", error);
  const { data: data2, error: error2 } = await supabase.from('employees').select('face_setup_completed').eq('id', 'PRES-1695');
  console.log("Select Error:", error2);
}
run();
