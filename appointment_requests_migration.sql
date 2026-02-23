-- Run this in your Supabase SQL Editor
-- Creates the appointment_requests table for patient self-service booking

CREATE TABLE IF NOT EXISTS appointment_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    reason      TEXT,
    notes       TEXT,
    preferred_date  DATE,
    preferred_time  TEXT,  -- e.g. "Morning (8am–12pm)"
    scheduled_date  TIMESTAMPTZ,  -- receptionist sets this when confirming
    status      TEXT NOT NULL DEFAULT 'pending',  -- pending | scheduled | completed | cancelled
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

-- Patients can only see their own requests
CREATE POLICY "Patients can view own requests"
    ON appointment_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Patients can insert their own requests
CREATE POLICY "Patients can insert requests"
    ON appointment_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Staff (receptionist/admin) can view all requests
CREATE POLICY "Staff can view all requests"
    ON appointment_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'receptionist')
        )
    );

-- Staff can update (schedule/cancel) requests
CREATE POLICY "Staff can update requests"
    ON appointment_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'receptionist')
        )
    );
