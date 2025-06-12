# Setup Guide for Existing Tables

This guide is for your specific use case where:
- You already have tables created (like "ventas")
- CSV columns match table columns
- You just need to truncate and insert new data

## Quick Setup Steps

### 1. Configure User Profile

Update the user's profile in your main Riqo database:

```sql
-- Replace with actual values
UPDATE profiles 
SET 
  company = 'Client Company Name',
  client_type = 'business',
  client_database_url = 'https://client-project.supabase.co',
  client_database_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  client_database_service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  data_table_name = 'ventas', -- Your existing table name
  grafana_dashboard_url = 'https://your-org.grafana.net/d/dashboard-id',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'client@example.com'
);
```

### 2. Test Configuration

Visit: `http://localhost:3000/api/test-client-db`

You should see:
```json
{
  "configured": true,
  "connection_test": { "success": true },
  "table_test": { "success": true },
  "table_info": {
    "table_name": "ventas",
    "sample_columns": ["fecha", "producto", "cantidad", "precio", "cliente", "vendedor"],
    "row_count_sample": 1
  }
}
```

### 3. CSV Format Requirements

Your CSV must have headers that **exactly match** your table columns:

**Example for "ventas" table:**
```csv
fecha,producto,cantidad,precio,cliente,vendedor
2024-01-15,Laptop,2,1500.00,Empresa ABC,Juan Perez
2024-01-16,Mouse,10,25.50,Tienda XYZ,Maria Lopez
```

**Important:**
- CSV headers must match table column names exactly
- Data types should be compatible (dates as YYYY-MM-DD, numbers as numbers)
- Empty values will be inserted as NULL

### 4. Upload Process

1. User uploads CSV file
2. System validates file format
3. System connects to client's Supabase database
4. System truncates the existing table (deletes all data)
5. System inserts all CSV rows into the table
6. Grafana dashboards automatically update

### 5. Troubleshooting

#### Error: "Cannot access table 'ventas'"
- Check that the table exists in the client's Supabase project
- Verify the service role key has access to the table
- Make sure `data_table_name` in the profile matches the actual table name

#### Error: "Failed to insert data"
- CSV columns must match table columns exactly
- Check data types (dates, numbers, text)
- Verify there are no required columns missing from CSV

#### Error: "Failed to truncate table"
- Service role key needs DELETE permissions
- Check if there are foreign key constraints preventing deletion

### 6. Example Working Setup

**Client's Supabase table structure:**
```sql
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  producto VARCHAR(255) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cliente VARCHAR(255),
  vendedor VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**CSV file format:**
```csv
fecha,producto,cantidad,precio,cliente,vendedor
2024-01-15,Laptop,2,1500.00,Empresa ABC,Juan Perez
2024-01-16,Mouse,10,25.50,Tienda XYZ,Maria Lopez
```

**User profile configuration:**
```json
{
  "client_database_url": "https://client-project.supabase.co",
  "client_database_anon_key": "anon_key_here",
  "client_database_service_key": "service_key_here",
  "data_table_name": "ventas"
}
```

### 7. Multiple Clients with Different Tables

Each client can have a different table name:

**Client A:** `data_table_name = 'ventas'`
**Client B:** `data_table_name = 'sales'`
**Client C:** `data_table_name = 'transactions'`

Just make sure:
1. Each client has their own Supabase project
2. The table exists in their project
3. CSV columns match their table structure
4. `data_table_name` in their profile is correct

### 8. Grafana Integration

Since you're already using the tables for Grafana:
1. Grafana should be connected to the client's Supabase database
2. Dashboards query the table directly (e.g., `SELECT * FROM ventas`)
3. After CSV upload, dashboards will automatically show new data
4. No additional configuration needed

### 9. Testing with Sample Data

Use the provided `test-data.csv` file to test the upload process. Make sure your test table has these columns:
- fecha (DATE)
- producto (VARCHAR)
- cantidad (INTEGER)
- precio (DECIMAL)
- cliente (VARCHAR)
- vendedor (VARCHAR)

The system is now ready to handle your existing table structure!
