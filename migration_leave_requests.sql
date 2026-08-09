-- Migration: Create leave_requests Table and RLS Policies

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for custom auth/anon client key
CREATE POLICY "Allow public read leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert leave_requests" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update leave_requests" ON leave_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete leave_requests" ON leave_requests FOR DELETE USING (true);
