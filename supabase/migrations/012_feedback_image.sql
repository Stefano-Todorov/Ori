-- Add image_url column to feedback table
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback', 'feedback', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to feedback bucket
CREATE POLICY "Users can upload feedback images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feedback');

-- Allow public read access for feedback images
CREATE POLICY "Public read feedback images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback');
