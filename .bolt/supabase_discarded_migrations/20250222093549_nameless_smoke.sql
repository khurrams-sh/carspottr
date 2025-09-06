/*
  # Remove posts functionality

  1. Changes
    - Drop posts table and all associated objects
    - Remove posts from realtime publication
    - Clean up any remaining posts-related objects
*/

-- First, remove from realtime publication if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE posts;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Drop the posts table and all its dependencies
DROP TABLE IF EXISTS posts CASCADE;