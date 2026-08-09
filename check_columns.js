import dotenv from 'dotenv';
dotenv.config();

async function checkColumns() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.definitions && json.definitions.attendance_logs) {
    console.log('attendance_logs columns:', Object.keys(json.definitions.attendance_logs.properties));
    console.log('attendance_logs schema definition:', json.definitions.attendance_logs.properties);
  } else {
    console.log('Definitions:', json.definitions ? Object.keys(json.definitions) : json);
  }
}
checkColumns();
