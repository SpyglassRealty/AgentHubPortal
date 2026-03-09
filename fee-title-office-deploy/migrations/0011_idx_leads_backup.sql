-- Create IDX Leads backup table for when FUB fails
CREATE TABLE IF NOT EXISTS idx_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact info
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  message TEXT,
  
  -- Form metadata
  form_type VARCHAR NOT NULL, -- 'contact' | 'showing' | 'info'
  source VARCHAR DEFAULT 'spyglass-idx',
  
  -- Property info (for showing requests)
  listing_address VARCHAR,
  mls_number VARCHAR,
  community_name VARCHAR,
  preferred_date VARCHAR,
  preferred_time VARCHAR,
  
  -- Status tracking
  status VARCHAR DEFAULT 'new', -- 'new' | 'contacted' | 'qualified' | 'archived'
  notes TEXT,
  assigned_to VARCHAR REFERENCES users(id),
  
  -- FUB sync status
  fub_person_id INTEGER,
  fub_sync_error TEXT,
  fub_sync_attempts INTEGER DEFAULT 0,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  contacted_at TIMESTAMP,
  archived_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_idx_leads_email ON idx_leads(email);
CREATE INDEX idx_idx_leads_status ON idx_leads(status);
CREATE INDEX idx_idx_leads_submitted ON idx_leads(submitted_at DESC);
CREATE INDEX idx_idx_leads_assigned ON idx_leads(assigned_to);
CREATE INDEX idx_idx_leads_mls ON idx_leads(mls_number) WHERE mls_number IS NOT NULL;