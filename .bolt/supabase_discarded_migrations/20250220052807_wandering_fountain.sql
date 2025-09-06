/*
  # Add storage bucket for car images

  1. New Storage Bucket
    - Create 'car-spots' bucket for storing car images
    - Enable public access for viewing images
    - Set up RLS policies for secure access

  2. Security
    - Enable RLS on the bucket
    - Add policies for authenticated users to:
      - Upload their own images
      - Read any image (since they're public)
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-spots', 'car-spots', true);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload car images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'car-spots' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public access to view images
CREATE POLICY "Anyone can view car images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'car-spots');