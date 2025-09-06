/*
  # Clean up posts table

  This migration ensures that any remaining posts table and its related objects are removed from the database.
*/

-- Drop the posts table if it exists
DROP TABLE IF EXISTS posts CASCADE;

-- Remove from realtime if exists
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