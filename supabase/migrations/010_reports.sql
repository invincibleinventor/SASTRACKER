CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reporter_id UUID,
    reporter_email TEXT,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_content_type ON reports(content_type);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reports" ON reports
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
    );

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
    );
