CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  
  tech_stack TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  live_url TEXT,
  github_url TEXT,
  demo_video_url TEXT,
  
  thumbnail_url TEXT,
  images TEXT[] DEFAULT '{}',
  
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'featured', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  
  category TEXT CHECK (category IN ('web', 'mobile', 'ai', 'data', 'devops', 'game', 'iot', 'other'))
);

CREATE TABLE project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published projects" ON projects
  FOR SELECT USING (status IN ('published', 'featured'));

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Anyone can view likes" ON project_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their likes" ON project_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view non-deleted comments" ON project_comments
  FOR SELECT USING (is_deleted = false OR auth.uid() = user_id);

CREATE POLICY "Users can insert comments" ON project_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON project_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments" ON project_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Anyone can view collaborators" ON project_collaborators
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage collaborators" ON project_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION update_project_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET likes_count = likes_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET likes_count = likes_count - 1 WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_likes_trigger
AFTER INSERT OR DELETE ON project_likes
FOR EACH ROW EXECUTE FUNCTION update_project_likes_count();

CREATE OR REPLACE FUNCTION update_project_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET comments_count = comments_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET comments_count = comments_count - 1 WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_comments_trigger
AFTER INSERT OR DELETE ON project_comments
FOR EACH ROW EXECUTE FUNCTION update_project_comments_count();

CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_updated
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_project_timestamp();

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_likes_project ON project_likes(project_id);
CREATE INDEX idx_project_comments_project ON project_comments(project_id);
