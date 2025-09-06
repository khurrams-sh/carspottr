/*
  # Remove image functionality from spots table

  1. Changes
    - Remove image_url column from spots table
    - Remove image-related policies
*/

ALTER TABLE spots
DROP COLUMN image_url;