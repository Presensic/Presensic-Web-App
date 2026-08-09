const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    console.error("DATABASE_URL is not defined in the environment!");
    process.exit(1);
  }

  console.log(`Connecting to database via DATABASE_URL...`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('SELECT 1;');
    console.log("Connected successfully!");
    
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
