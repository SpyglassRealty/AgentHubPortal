-- Community Content Blocks Migration
-- Creates table for drag-and-drop content blocks on community pages
-- Schema matches shared/schema.ts communityContentBlocks definition

CREATE TABLE IF NOT EXISTS community_content_blocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  
  -- Media configuration (JSON arrays)
  images JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  
  -- Layout configuration
  background_color VARCHAR(20) DEFAULT 'white',
  media_position VARCHAR(10) DEFAULT 'left',
  
  -- Call-to-action configuration (JSON array)
  cta_buttons JSONB DEFAULT '[]'::jsonb,
  
  -- Organization and publishing
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_community_id ON community_content_blocks(community_id);
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_sort_order ON community_content_blocks(sort_order);
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_published ON community_content_blocks(is_published);
CREATE INDEX IF NOT EXISTS idx_community_content_blocks_community_published ON community_content_blocks(community_id, is_published);

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