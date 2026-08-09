-- Migration: Verified Manual Attendance Module

-- 1. Alter attendance_logs table to support all verification & audit fields
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT 'employer_verified';
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS captured_selfie_url TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS face_match_score NUMERIC;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS gps_accuracy TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS inside_geofence BOOLEAN DEFAULT TRUE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verified_by_employer_id TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verified_by_employer_name TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS manual_reason TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS attendance_source TEXT DEFAULT 'employer_verified';
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS camera_device TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS browser_info TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS attendance_type TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_out_time TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT TRUE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Ensure RLS Policies for attendance_logs allow Employers and Super Admins to insert/read/update
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Allow public insert attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Allow public update attendance_logs" ON attendance_logs;

CREATE POLICY "Allow public read attendance_logs" ON attendance_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert attendance_logs" ON attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update attendance_logs" ON attendance_logs FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Storage Bucket Creation for Verified Attendance Selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-verification', 'attendance-verification', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read attendance-verification" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert attendance-verification" ON storage.objects;

CREATE POLICY "Public Read attendance-verification" ON storage.objects FOR SELECT USING (bucket_id = 'attendance-verification');
CREATE POLICY "Public Insert attendance-verification" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attendance-verification');
