/*
  # Add subject field to posts table

  1. Changes
    - Add `subject` column to posts table
    - Make it optional to maintain compatibility with existing posts
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS subject text;