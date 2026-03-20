-- Add liveby_location_id column to communities table
-- For storing LiveBy locationId when polygon is sourced from LiveBy API

ALTER TABLE communities 
ADD COLUMN liveby_location_id INTEGER;

-- Add index for LiveBy location lookups
CREATE INDEX idx_communities_liveby_location_id ON communities(liveby_location_id);

-- Add comment for documentation
COMMENT ON COLUMN communities.liveby_location_id IS 'LiveBy locationId when polygon data sourced from LiveBy autocomplete API';