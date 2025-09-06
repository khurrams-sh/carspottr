/*
  # Create spots table for car collection

  1. New Tables
    - `spots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `performance` (text)
      - `features` (text)
      - `rarity` (text)
      - `value_range` (text)
      - `trivia` (text)
      - `image_url` (text)
      - `location` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `spots` table
    - Add policies for authenticated users to:
      - Read their own spots
      - Create new spots
*/

CREATE TABLE IF NOT EXISTS spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  performance text,
  features text,
  rarity text,
  value_range text,
  trivia text,
  image_url text,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own spots"
  ON spots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create spots"
  ON spots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);