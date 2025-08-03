-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('valid', 'used', 'invalid')) DEFAULT 'valid',
  validation_date TIMESTAMPTZ,
  validation_count INTEGER DEFAULT 0,
  event_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create validation_history table
CREATE TABLE IF NOT EXISTS validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT REFERENCES tickets(id),
  qr_code TEXT NOT NULL,
  validation_date TIMESTAMPTZ NOT NULL,
  event_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_validation_history_date ON validation_history(validation_date DESC);
CREATE INDEX IF NOT EXISTS idx_validation_history_qr_code ON validation_history(qr_code);

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (modify as needed for your security requirements)
CREATE POLICY "Allow all operations on tickets" ON tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations on validation_history" ON validation_history FOR ALL USING (true);

-- Create functions for table creation
CREATE OR REPLACE FUNCTION create_tickets_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Table creation is handled by the schema above
  RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_validation_history_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Table creation is handled by the schema above
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_updated_at 
  BEFORE UPDATE ON tickets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();