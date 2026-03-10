-- Community Content Blocks Migration
-- Creates table for drag-and-drop content blocks on community pages

CREATE TABLE IF NOT EXISTS community_content_blocks (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  block_type VARCHAR(50) NOT NULL DEFAULT 'split',
  title VARCHAR(255),
  content TEXT,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  image_position VARCHAR(10) DEFAULT 'right',
  background_color VARCHAR(20) DEFAULT 'white',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_community_id ON community_content_blocks(community_id);
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_sort_order ON community_content_blocks(sort_order);
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_published ON community_content_blocks(published);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_community_content_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_content_blocks_updated_at
  BEFORE UPDATE ON community_content_blocks
  FOR EACH ROW EXECUTE PROCEDURE update_community_content_blocks_updated_at();