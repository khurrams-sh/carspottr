/*
  # Basic posts functionality

  1. Changes
    - Drop existing community_posts table
    - Create simplified posts table with just essential fields
    - Set up basic RLS policies

  2. Security
    - Enable RLS
    - Allow public read access
    - Allow authenticated users to create posts
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS community_posts;

-- Create the posts table with minimal fields
CREATE TABLE community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read posts
CREATE POLICY "Anyone can read posts"
  ON community_posts
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create posts
CREATE POLICY "Authenticated users can create posts"
  ON community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);