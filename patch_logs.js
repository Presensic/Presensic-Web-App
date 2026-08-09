import fs from 'fs';
let code = fs.readFileSync('src/components/EmployerDashboard.tsx', 'utf-8');
const oldLogs = `      console.log("[AUDIT] Supabase response:", { data: insertResult, error: insertErr });

      if (insertErr) {
        console.error("[AUDIT] Failed to insert employee into Supabase:", {
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint
        });`;
const newLogs = `      console.log("SUPABASE RESPONSE", insertResult);

      if (insertErr) {
        console.error("SUPABASE ERROR", insertErr);
        console.error("SUPABASE ERROR CODE", insertErr.code);
        console.error("SUPABASE DETAILS", insertErr.details);
        console.error("SUPABASE HINT", insertErr.hint);`;
code = code.replace(oldLogs, newLogs);
fs.writeFileSync('src/components/EmployerDashboard.tsx', code);
