CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tech_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories" ON categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view tech_stacks" ON tech_stacks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tech_stacks" ON tech_stacks FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Anyone can insert skills" ON skills FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view user_skills" ON user_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage their skills" ON user_skills FOR ALL USING (auth.uid() = user_id);

INSERT INTO categories (name, slug, icon) VALUES
  ('Web', 'web', 'code'),
  ('Mobile', 'mobile', 'smartphone'),
  ('AI/ML', 'ai', 'brain'),
  ('Data', 'data', 'database'),
  ('DevOps', 'devops', 'server'),
  ('Games', 'game', 'gamepad'),
  ('IoT', 'iot', 'cpu'),
  ('Other', 'other', 'more-horizontal');

INSERT INTO tech_stacks (name) VALUES
  ('React'), ('Next.js'), ('Vue'), ('Angular'), ('Node.js'), ('Python'), ('Django'), ('FastAPI'),
  ('TypeScript'), ('JavaScript'), ('Go'), ('Rust'), ('Java'), ('Swift'), ('Kotlin'), ('Flutter'),
  ('TailwindCSS'), ('PostgreSQL'), ('MongoDB'), ('Redis'), ('Docker'), ('AWS'), ('Firebase'),
  ('TensorFlow'), ('PyTorch'), ('OpenAI'), ('Supabase'), ('Prisma');

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_tech_stacks_name ON tech_stacks(name);
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
