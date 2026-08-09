import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

// Try connecting to DATABASE_URL if available, or construct from Supabase URL if needed
// Alternatively, check if DATABASE_URL is in environment
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@db.d6nnfuebyvw4vjznnt5h4y.supabase.co:5432/postgres"; // or similar

async function run() {
  console.log("Creating master_admin table...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_admin (
        id SERIAL PRIMARY KEY,
        whatsapp TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'master_admin',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("master_admin table created successfully.");

    const passwordHash = bcrypt.hashSync('7894561230', 10);
    await pool.query(`
      INSERT INTO master_admin (whatsapp, password_hash, role, is_active)
      VALUES ($1, $2, 'master_admin', true)
      ON CONFLICT (whatsapp) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
    `, ['+917894561230', passwordHash]);
    console.log("Master Admin seed account created successfully (+917894561230 / 7894561230).");
  } catch (err) {
    console.error("Error creating/seeding master_admin:", err);
  } finally {
    await pool.end();
  }
}

run();
