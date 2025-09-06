/*
  # Fix Posts Visibility and Add Posts Table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `content` (text)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `posts` table
    - Add policies for:
      - All authenticated users can read all posts
      - Users can create their own posts
*/

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read all posts
CREATE POLICY "All authenticated users can read all posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to create their own posts
CREATE POLICY "Users can create own posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE posts;