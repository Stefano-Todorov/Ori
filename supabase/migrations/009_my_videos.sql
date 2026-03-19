-- My Videos: extension analytics sync + idea-video linking

-- Unique partial index on posts(user_id, url) to enable upsert
CREATE UNIQUE INDEX IF NOT EXISTS posts_user_url_unique
  ON posts(user_id, url) WHERE url IS NOT NULL;

-- Filtered index for querying user's own videos efficiently
CREATE INDEX IF NOT EXISTS posts_own_videos_idx
  ON posts(user_id) WHERE is_competitor = false AND is_trending = false;

-- Bidirectional idea-video linking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_idea_id uuid REFERENCES content_ideas(id) ON DELETE SET NULL;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS linked_post_id uuid REFERENCES posts(id) ON DELETE SET NULL;

-- Sync preferences on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_sync_own_profile boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at jsonb DEFAULT '{}';
