# Your Exact Workflow - Automated

This implements your exact manual process:

## What You Do Manually:
1. `TRUNCATE TABLE ventas;`
2. Upload CSV to insert rows
3. Format dates: DD/MM/YYYY → YYYY-MM-DD in `fecha_formateada` field

## What the System Does Automatically:
1. **TRUNCATE TABLE ventas** (or whatever table name you specify)
2. **Insert CSV data** directly into table columns
3. **Auto-format dates** from DD/MM/YYYY to YYYY-MM-DD in `fecha_formateada` field
4. **Grafana dashboards update** automatically

## Setup Steps:

### 1. Add SQL Function to Client's Database

Run this in the **client's Supabase database** (not your main Riqo database):

```sql
-- Enable TRUNCATE functionality
CREATE OR REPLACE FUNCTION truncate_table(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION truncate_table(text) TO service_role;
GRANT ALL ON TABLE ventas TO service_role;
```

### 2. Ensure Your Table Has fecha_formateada Column

If you don't already have it:

```sql
-- Add the formatted date column
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_formateada DATE;
```

### 3. Configure User Profile

In your **main Riqo database**:

```sql
UPDATE profiles 
SET 
  client_database_url = 'https://client-project.supabase.co',
  client_database_anon_key = 'client_anon_key',
  client_database_service_key = 'client_service_key',
  data_table_name = 'ventas', -- Your table name
  updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'client@example.com');
```

## CSV Format Requirements:

Your CSV must have columns that match your table:

```csv
fecha,producto,cantidad,precio,cliente,vendedor
15/01/2024,Laptop,2,1500.00,Empresa ABC,Juan Perez
16/01/2024,Mouse,10,25.50,Tienda XYZ,Maria Lopez
```

**Important:**
- `fecha` column should be in DD/MM/YYYY format
- System will automatically create `fecha_formateada` in YYYY-MM-DD format
- Other columns map directly to your table columns

## Testing:

1. **Test configuration:**
   ```
   http://localhost:3000/api/test-client-db
   ```

2. **Upload test CSV:**
   - Use the provided `test-data.csv`
   - Should see "Upload completed successfully"

3. **Verify in client's database:**
   ```sql
   SELECT fecha, fecha_formateada, producto, cantidad, precio 
   FROM ventas 
   ORDER BY fecha_formateada DESC 
   LIMIT 5;
   ```

## Expected Results:

**Before upload:** Table has old data
**After upload:** 
- Table is truncated (all old data removed)
- New CSV data is inserted
- `fecha_formateada` is automatically created from `fecha`
- Grafana dashboards show new data

**Example data after upload:**
```
fecha        | fecha_formateada | producto | cantidad | precio
15/01/2024   | 2024-01-15      | Laptop   | 2        | 1500.00
16/01/2024   | 2024-01-16      | Mouse    | 10       | 25.50
```

## For Different Clients:

Each client can have different table names:
- Client A: `data_table_name = 'ventas'`
- Client B: `data_table_name = 'sales'` 
- Client C: `data_table_name = 'transactions'`

The process is the same:
1. TRUNCATE their specific table
2. Insert CSV data
3. Format dates in `fecha_formateada` field

## Troubleshooting:

**Error: "Failed to truncate table"**
- Run the SQL function in client's database
- Check service role permissions

**Error: "Failed to insert data"**
- CSV columns must match table columns exactly
- Check that `fecha_formateada` column exists

**Dates not formatting correctly:**
- Ensure CSV has dates in DD/MM/YYYY format
- Check that `fecha_formateada` column is DATE type

This exactly replicates your manual workflow but automated for client uploads!
