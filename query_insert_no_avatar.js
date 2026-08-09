import { createClient } from '@supabase/supabase-js';
const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';
const supabase = createClient(url, key);
async function run() {
  const logPayload = {
    employee_id: 'PRES-4144',
    company_id: 1,
    zone: 'Corporate HQ',
    time: '10:00 AM',
    status: 'verified',
    gps_accuracy: '6m',
    coordinates: '19.0760, 72.8777',
    method: 'Biometric Check-In'
    // avatar: '...' removed
  };
  const { data, error } = await supabase.from('attendance_logs').insert([logPayload]).select();
  console.log("Error:", error);
}
run();
