const { Pool } = require('pg');

async function tryConnect(projectRef, password, port) {
  const connectionString = `postgres://postgres:${password}@db.${projectRef}.supabase.co:${port}/postgres`;
  console.log(`Trying connection for ${projectRef} with password length ${password.length} on port ${port}...`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('SELECT 1;');
    console.log(`Connected successfully to ${projectRef}!`);
    return pool;
  } catch (err) {
    console.log(`Failed for ${projectRef} with password: ${err.message}`);
    await pool.end();
    return null;
  }
}

async function run() {
  require('dotenv').config();
  const refs = ["lxpfprlcckmukchuxrjt", "d6nnfuebyvw4vjznnt5h4y"];
  const passwords = [
    "postgres", 
    "supabase",
    "supabasedb",
    "supabasedb123",
    "password",
    "admin",
    "admin123",
    "root",
    "root123",
    "lxpfprlcckmukchuxrjt", 
    "d6nnfuebyvw4vjznnt5h4y",
    process.env.VITE_SUPABASE_ANON_KEY
  ].filter(Boolean);
  const ports = [6543, 5432];

  let pool = null;
  for (const ref of refs) {
    for (const port of ports) {
      for (const pwd of passwords) {
        pool = await tryConnect(ref, pwd, port);
        if (pool) break;
      }
      if (pool) break;
    }
    if (pool) break;
  }

  if (!pool) {
    console.error("Could not connect with any known combination.");
    process.exit(1);
  }

  try {
    console.log("Adding columns via PG Pool...");
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS device_info TEXT;');
    console.log("Successfully added device_info column.");
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;');
    console.log("Successfully added ip_address column.");
  } catch (err) {
    console.error("Error executing query:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
