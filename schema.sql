
-- Companies Table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  org_name TEXT NOT NULL,
  password TEXT NOT NULL, -- Note: In production, hash this!
  role TEXT NOT NULL,
  billing_cycle TEXT,
  selected_plan TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE geofence_anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS tracking_geofence TEXT; -- Using TEXT to store UUID for compatibility with existing string logic if needed, but intended for Anchor IDs

-- Update employees to reference an anchor id instead of a string if possible, 
-- but for now we'll keep tracking_geofence as a string but store the Anchor ID there.

-- Employees Table
CREATE TABLE employees (
  id TEXT PRIMARY KEY, -- Using the 'EMP-XXX' format as ID
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  pin TEXT,
  tracking_geofence TEXT,
  status TEXT DEFAULT 'Absent',
  check_in_time TEXT,
  check_out_time TEXT,
  last_punch TEXT,
  avatar TEXT,
  face_descriptor TEXT,
  face_lock_setup BOOLEAN DEFAULT FALSE,
  shift_type TEXT DEFAULT 'fixed',
  shift_start TEXT DEFAULT '09:00',
  shift_end TEXT DEFAULT '18:00',
  grace_period INTEGER DEFAULT 15,
  last_latitude DECIMAL(10, 8),
  last_longitude DECIMAL(11, 8),
  last_location_address TEXT,
  gps_accuracy DECIMAL,
  distance_from_office_meters DECIMAL,
  inside_geofence BOOLEAN DEFAULT TRUE,
  last_location_timestamp TIMESTAMP WITH TIME ZONE,
  distance_status TEXT
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  strict_selfie_match BOOLEAN DEFAULT TRUE,
  strict_gps_match BOOLEAN DEFAULT TRUE,
  geofence_radius INTEGER DEFAULT 100,
  shift_start TEXT DEFAULT '09:00',
  shift_end TEXT DEFAULT '18:00',
  grace_period INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id)
);

-- Attendance Logs Table
CREATE TABLE attendance_logs (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  zone TEXT,
  time TEXT,
  status TEXT,
  gps_accuracy TEXT,
  coordinates TEXT,
  method TEXT,
  avatar TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  location_address TEXT,
  employee_latitude DECIMAL(10, 8),
  employee_longitude DECIMAL(11, 8),
  office_latitude DECIMAL(10, 8),
  office_longitude DECIMAL(11, 8),
  distance_from_office_meters DECIMAL,
  distance_status TEXT,
  inside_geofence BOOLEAN DEFAULT FALSE,
  face_verified BOOLEAN DEFAULT FALSE,
  gps_verified BOOLEAN DEFAULT FALSE,
  location_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_test BOOLEAN DEFAULT FALSE
);

-- RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Companies can only view/update their own records
CREATE POLICY "Companies can view own records" ON companies FOR SELECT USING (auth.uid()::text = whatsapp);
CREATE POLICY "Companies can update own records" ON companies FOR UPDATE USING (auth.uid()::text = whatsapp);

-- Policy: Employees can view their own records, Employers can view all employees in their company
CREATE POLICY "Employers can view all employees" ON employees FOR SELECT USING (
  EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.whatsapp = auth.uid()::text)
);
CREATE POLICY "Employees can view own record" ON employees FOR SELECT USING (email = auth.email());

-- Policy: Employers can view logs of their company, Employees can view their own logs
CREATE POLICY "Employers can view company logs" ON attendance_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM companies WHERE companies.id = attendance_logs.company_id AND companies.whatsapp = auth.uid()::text)
);
CREATE POLICY "Employees can view own logs" ON attendance_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE employees.id = attendance_logs.employee_id AND employees.email = auth.email())
);
-- Leave Requests Table
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

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read leave_requests" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert leave_requests" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update leave_requests" ON leave_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete leave_requests" ON leave_requests FOR DELETE USING (true);

