import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkWrites() {
  console.log("1. Trying to insert into leave_requests...");
  const { data: emps } = await supabase.from('employees').select('id, company_id, name').limit(1);
  if (emps && emps[0]) {
    const emp = emps[0];
    console.log(`Found employee ${emp.id}. Inserting leave request...`);
    const { data: lData, error: lErr } = await supabase.from('leave_requests').insert({
      company_id: emp.company_id,
      employee_id: emp.id,
      employee_name: emp.name,
      leave_type: 'PIN_RESET',
      start_date: '2026-08-01',
      end_date: '2026-08-01',
      total_days: 1,
      reason: 'Requested PIN Reset'
    }).select();
    console.log("Leave request insert response:", { lData, lErr: lErr?.message });
    if (lData && lData[0]) {
      console.log("Deleting leave request...");
      await supabase.from('leave_requests').delete().eq('id', lData[0].id);
    }
  } else {
    console.log("No employees found.");
  }
}
checkWrites();
