CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  is_sastra_student BOOLEAN DEFAULT false,
  is_alumni BOOLEAN DEFAULT false,
  department TEXT,
  semester INT,
  section TEXT,
  batch_year TEXT,
  graduation_year TEXT,
  current_company TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resume_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  achievement_type TEXT CHECK (achievement_type IN ('internship', 'job', 'freelance', 'project')),
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Anyone can view achievements" ON resume_achievements
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their resume achievements" ON resume_achievements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM resumes WHERE id = resume_id AND user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_updated
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();

CREATE INDEX idx_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_profiles_email ON user_profiles(email);
CREATE INDEX idx_achievements_resume ON resume_achievements(resume_id);
