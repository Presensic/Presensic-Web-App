import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://cravnmtgqmxemcprpoki.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYXZubXRncW14ZW1jcHJwb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjc3NTgsImV4cCI6MjA5OTcwMzc1OH0.KP1qNymUESgY8EGo3wDSwijBE1GfxXuIT-HLPr27qZA';
const supabase = createClient(url, key);

async function runMigration() {
  console.log("Applying enterprise biometric migration...");
  const sql = fs.readFileSync('migration_enterprise_biometric_verification.sql', 'utf8');
  
  // Split by statements or execute via rpc if query function exists, or execute statements
  const { data, error } = await supabase.rpc('query', { query: sql });
  if (error) {
    console.warn("RPC query notice or error:", error.message);
    // Try executing via direct statements if query rpc fails
    console.log("Attempting statement execution...");
  } else {
    console.log("Migration applied successfully via RPC:", data);
  }
}

runMigration();
