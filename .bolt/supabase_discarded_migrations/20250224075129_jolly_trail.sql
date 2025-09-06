/*
  # Clean up and recreate posts table

  1. Cleanup
    - Drop existing posts table and related objects
    - Remove any existing policies
    - Clean up triggers and functions

  2. New Setup
    - Create posts table with proper structure
    - Set up RLS and policies
    - Create necessary indexes and triggers
*/

-- Clean up existing objects
DROP TABLE IF EXISTS posts CASCADE;
DROP FUNCTION IF EXISTS check_profile_exists CASCADE;

-- Create posts table
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read posts"
  ON posts
  FOR SELECT
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

-- Create function to ensure profile exists
CREATE OR REPLACE FUNCTION check_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Profile must exist before creating a post';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER ensure_profile_exists
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_exists();