-- Add batch_size to profiles (NULL = use posting_target as default)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch_size integer DEFAULT NULL;
