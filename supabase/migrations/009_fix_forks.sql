ALTER TABLE resume_forks ALTER COLUMN forked_resume_id DROP NOT NULL;
ALTER TABLE resume_forks DROP CONSTRAINT IF EXISTS resume_forks_parent_resume_id_forked_resume_id_key;
