-- Add photo type and classification timestamp to instagram_media
ALTER TABLE instagram_media ADD COLUMN photo_type VARCHAR(255);
ALTER TABLE instagram_media ADD COLUMN classified_at TIMESTAMP;

-- Create index for photo_type filtering
CREATE INDEX instagram_media_photo_type_idx ON instagram_media(photo_type);
