-- Add sort_order to content_ideas for drag-and-drop reordering
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
