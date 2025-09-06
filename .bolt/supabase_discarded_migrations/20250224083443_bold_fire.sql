/*
  # Clean up all posts-related objects
  
  This migration removes everything related to posts:
  1. Drop the posts table
  2. Remove any related functions and triggers
  3. Clean up any indexes
*/

-- First remove the table from realtime publication if it exists
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

-- Drop the posts table and all objects that depend on it
DROP TABLE IF EXISTS posts CASCADE;

-- Drop the profile check function
DROP FUNCTION IF EXISTS check_profile_exists CASCADE;

-- Clean up any orphaned policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(polname) || ' ON posts;', E'\n')
    FROM pg_policies 
    WHERE tablename = 'posts'
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Clean up any orphaned triggers
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP TRIGGER IF EXISTS ' || quote_ident(tgname) || ' ON posts;', E'\n')
    FROM pg_trigger
    WHERE tgrelid = 'posts'::regclass::oid
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Clean up any orphaned indexes
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP INDEX IF EXISTS ' || quote_ident(indexname) || ';', E'\n')
    FROM pg_indexes
    WHERE tablename = 'posts'
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;