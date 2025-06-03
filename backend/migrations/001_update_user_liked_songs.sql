-- Migration 001: Update user_liked_songs table schema
-- This migration changes track_id from INTEGER to VARCHAR to support external track IDs

BEGIN;

-- Drop the existing unique constraint
ALTER TABLE user_liked_songs DROP CONSTRAINT IF EXISTS user_liked_songs_user_id_track_id_key;

-- Add track_source column if it doesn't exist
ALTER TABLE user_liked_songs ADD COLUMN IF NOT EXISTS track_source VARCHAR(50) DEFAULT 'local';

-- Change track_id to VARCHAR if it's currently INTEGER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_liked_songs' 
        AND column_name = 'track_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE user_liked_songs ALTER COLUMN track_id TYPE VARCHAR(255);
    END IF;
END $$;

-- Add new unique constraint
ALTER TABLE user_liked_songs ADD CONSTRAINT user_liked_songs_unique 
UNIQUE (user_id, track_id, track_source);

-- Update existing records to have 'local' track_source
UPDATE user_liked_songs SET track_source = 'local' WHERE track_source IS NULL;

COMMIT; 