/*
  # Add image_url to posts table

  1. Changes
    - Add `image_url` column to the `posts` table to store URLs of uploaded images
  
  2. Security
    - No changes to RLS policies
*/

-- Add image_url column to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN image_url text;
  END IF;
END $$;