-- Add auto_save_competitor_ideas setting to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_save_competitor_ideas boolean DEFAULT true;
