import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@db.lxpfprlcckmukchuxrjt.supabase.co:5432/postgres";

async function run() {
  console.log(`Connecting to: ${connectionString.replace(/:[^@]+@/, ':****@')}`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Adding is_test column via PG Pool...");
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;');
    console.log("Successfully executed query.");
  } catch (err) {
    console.error("Error executing query:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
