CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  achievement_type TEXT CHECK (achievement_type IN ('internship', 'job', 'both')),
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  year_graduated TEXT,
  
  tips TEXT,
  remarks TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  views_count INT DEFAULT 0,
  steals_count INT DEFAULT 0
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved resumes" ON resumes
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can insert their own resumes" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pending resumes" ON resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all resumes" ON resumes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Only admins can view admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
