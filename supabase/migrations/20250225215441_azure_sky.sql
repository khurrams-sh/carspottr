/*
  # Add delete policy for posts

  1. Security Changes
    - Add RLS policy to allow users to delete their own posts
    
  2. Notes
    - Users can only delete posts they created
    - Deletion is permanent and cannot be undone
*/

CREATE POLICY "Users can delete own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);