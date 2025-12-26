ALTER TABLE resumes ADD COLUMN IF NOT EXISTS forked_from UUID REFERENCES resumes(id);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS fork_count INT DEFAULT 0;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_flagship BOOLEAN DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS flagship_resume_id UUID REFERENCES resumes(id);

CREATE TABLE resume_forks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  forked_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  forked_by UUID REFERENCES auth.users(id),
  forked_at TIMESTAMPTZ DEFAULT now(),
  html_content TEXT,
  pdf_url TEXT,
  UNIQUE(parent_resume_id, forked_resume_id)
);

CREATE TABLE diff_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume1_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  resume2_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  resume1_url TEXT,
  resume2_url TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  views_count INT DEFAULT 0,
  cache_key TEXT UNIQUE
);

CREATE TABLE diff_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diff_cache_id UUID REFERENCES diff_cache(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_positive BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(diff_cache_id, user_id)
);

ALTER TABLE resume_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE diff_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE diff_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forks" ON resume_forks
  FOR SELECT USING (true);

CREATE POLICY "Users can create forks" ON resume_forks
  FOR INSERT WITH CHECK (auth.uid() = forked_by);

CREATE POLICY "Anyone can view cached diffs" ON diff_cache
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create diffs" ON diff_cache
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view feedback" ON diff_feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their feedback" ON diff_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_fork_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resumes SET fork_count = fork_count + 1 WHERE id = NEW.parent_resume_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_fork_created
AFTER INSERT ON resume_forks
FOR EACH ROW EXECUTE FUNCTION increment_fork_count();

CREATE INDEX idx_forks_parent ON resume_forks(parent_resume_id);
CREATE INDEX idx_forks_child ON resume_forks(forked_resume_id);
CREATE INDEX idx_diff_cache_key ON diff_cache(cache_key);
CREATE INDEX idx_diff_feedback_cache ON diff_feedback(diff_cache_id);
CREATE INDEX idx_resumes_flagship ON resumes(is_flagship) WHERE is_flagship = true;
