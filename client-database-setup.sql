-- SQL to run in the CLIENT'S Supabase database (not your main Riqo database)
-- This enables proper TRUNCATE functionality for the upload system

-- Function to truncate any table (for the upload system)
CREATE OR REPLACE FUNCTION truncate_table(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: If your table is called "ventas", make sure it has the fecha_formateada column
-- Run this only if you don't already have the fecha_formateada column:

-- ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_formateada DATE;

-- Example table structure for reference (adjust to match your actual table):
/*
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  fecha VARCHAR(20), -- Original date in DD/MM/YYYY format from CSV
  producto VARCHAR(255),
  cantidad INTEGER,
  precio DECIMAL(10,2),
  cliente VARCHAR(255),
  vendedor VARCHAR(255),
  fecha_formateada DATE, -- Formatted date for Grafana (YYYY-MM-DD)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- Grant necessary permissions to the service role
-- Replace 'service_role' with your actual service role name if different
GRANT EXECUTE ON FUNCTION truncate_table(text) TO service_role;
GRANT ALL ON TABLE ventas TO service_role; -- Replace 'ventas' with your actual table name
