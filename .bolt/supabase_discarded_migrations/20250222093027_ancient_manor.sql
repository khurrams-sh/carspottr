/*
  # Fix posts table setup
  
  1. Clean up
    - Drop existing table and policies
    - Remove from realtime publication
  
  2. Recreate
    - Create posts table with proper structure
    - Set up RLS policies
    - Add indexes
    - Enable realtime
*/

-- First, clean up any existing objects
DROP TABLE IF EXISTS posts CASCADE;

-- Remove from realtime if exists
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS posts;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create posts table
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read posts"
  ON posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX posts_user_id_idx ON posts (user_id);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE posts;