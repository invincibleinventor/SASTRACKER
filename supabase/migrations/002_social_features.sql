CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT NOT NULL,
  blocked_by UUID,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  expires_at TIMESTAMPTZ
);

CREATE TABLE resume_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  user_id UUID,
  vote_type INT CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resume_id, user_id)
);

CREATE TABLE resume_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS votes_count INT DEFAULT 0;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0;

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked_users" ON blocked_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Anyone can view votes" ON resume_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON resume_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON resume_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON resume_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view non-deleted comments" ON resume_comments
  FOR SELECT USING (is_deleted = false OR auth.uid() = user_id);

CREATE POLICY "Users can insert comments" ON resume_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON resume_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments" ON resume_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE OR REPLACE FUNCTION update_resume_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE resumes SET votes_count = votes_count + NEW.vote_type WHERE id = NEW.resume_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE resumes SET votes_count = votes_count - OLD.vote_type WHERE id = OLD.resume_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE resumes SET votes_count = votes_count - OLD.vote_type + NEW.vote_type WHERE id = NEW.resume_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resume_votes_trigger
AFTER INSERT OR UPDATE OR DELETE ON resume_votes
FOR EACH ROW EXECUTE FUNCTION update_resume_votes_count();

CREATE OR REPLACE FUNCTION update_resume_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE resumes SET comments_count = comments_count + 1 WHERE id = NEW.resume_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE resumes SET comments_count = comments_count - 1 WHERE id = OLD.resume_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resume_comments_trigger
AFTER INSERT OR DELETE ON resume_comments
FOR EACH ROW EXECUTE FUNCTION update_resume_comments_count();

CREATE INDEX idx_resume_votes_resume ON resume_votes(resume_id);
CREATE INDEX idx_resume_votes_user ON resume_votes(user_id);
CREATE INDEX idx_resume_comments_resume ON resume_comments(resume_id);
CREATE INDEX idx_blocked_users_email ON blocked_users(user_email);
