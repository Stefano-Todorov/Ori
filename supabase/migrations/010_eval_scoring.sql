-- ============================================================
-- EVAL SCORING SYSTEM
-- Adds eval scores, tags, and script linking for the
-- auto-improvement feedback loop.
-- ============================================================

-- Add eval fields to scripts table
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS eval_score integer;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS eval_tags text[] DEFAULT '{}';

-- Add eval fields + script text + linked_script_id to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS eval_score integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS eval_tags text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS script_text text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_script_id uuid REFERENCES scripts(id) ON DELETE SET NULL;

-- Add performance_summary to profiles for coach context
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS performance_summary text;

-- Index for finding scored posts for performance analysis
CREATE INDEX IF NOT EXISTS posts_eval_score_idx ON posts(eval_score) WHERE eval_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS scripts_eval_score_idx ON scripts(eval_score) WHERE eval_score IS NOT NULL;
