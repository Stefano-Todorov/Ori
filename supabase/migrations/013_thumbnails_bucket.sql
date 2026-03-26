-- Create storage bucket for post thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload thumbnails (API routes use service client)
CREATE POLICY "Service role can upload thumbnails"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'thumbnails');

-- Allow public read access for thumbnails
CREATE POLICY "Public read thumbnails"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'thumbnails');
