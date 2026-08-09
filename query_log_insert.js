import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAttendanceLogsTable() {
  console.log("Testing attendance_logs insert and select...");
  const dummyPayload = {
    employee_id: "EMP-736021",
    company_id: 2,
    zone: "Corporate HQ",
    time: "09:00 AM",
    status: "verified",
    gps_accuracy: "5m",
    coordinates: "19.0760, 72.8777",
    method: "Biometric Check-In",
    avatar: "https://example.com/avatar.jpg"
  };

  console.log("EXACT payload sent to Supabase before insert:", JSON.stringify(dummyPayload, null, 2));

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert([dummyPayload])
    .select();

  console.log("Insert Response Data:", data);
  console.log("Insert Response Error:", error);

  if (data && data.length > 0) {
    const insertedRow = data[0];
    console.log("Returned row from insert:", insertedRow);
    console.log("Columns present on returned row:", Object.keys(insertedRow));

    const insertedId = insertedRow.id;
    const { data: selectData, error: selectError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('id', insertedId)
      .single();
    
    console.log("SELECT back row from attendance_logs:", selectData);
    console.log("SELECT error:", selectError);

    // Cleanup test row
    await supabase.from('attendance_logs').delete().eq('id', insertedId);
  }
}

checkAttendanceLogsTable();
