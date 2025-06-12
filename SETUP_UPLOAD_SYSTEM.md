# CSV Upload System Setup Guide - Riqo Agency

This guide explains how to set up and configure the CSV upload and data processing system for Riqo Agency using your existing database structure.

## Overview

The system allows users to upload CSV/Excel files that are:
1. **Processed** - Normalized (dates, formats, etc.) using Python
2. **Stored** - In user-specific client Supabase databases
3. **Visualized** - Automatically updated in Grafana Cloud dashboards

## Architecture

- **Main Database**: Your existing Riqo Agency Supabase database (user management, upload tracking)
- **Client Databases**: Separate Supabase projects for each user's data visualization needs
- **Processing**: Python scripts for data normalization
- **Visualization**: Grafana Cloud dashboards connected to client databases

## Prerequisites

### 1. Python Environment
```bash
# Install Python dependencies
pip install -r requirements.txt
```

### 2. Database Migration
Apply the migration to extend your existing database:
```bash
# Apply the migration to add client management fields
supabase db push
```

### 3. Environment Variables
Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_main_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_main_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_main_supabase_service_key
```

## User Setup Process

### 1. Create Client Supabase Project
For each user who needs data visualization:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project for the user's data
3. Note down:
   - Project URL
   - Anon key
   - Service role key

### 2. Configure Client Database
In the user's client Supabase project, create the data table:
```sql
-- Create the data table for CSV uploads
CREATE TABLE client_data (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  row_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_data_created_at ON client_data(created_at);
CREATE INDEX idx_client_data_row_number ON client_data(row_number);
```

### 3. Configure User Profile
Update the user's profile with client database information:

**Via API (Recommended):**
```javascript
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company: 'User Company Name',
    client_type: 'business', // 'individual', 'business', 'enterprise'
    client_database_url: 'https://user-project.supabase.co',
    client_database_anon_key: 'user_anon_key',
    client_database_service_key: 'user_service_key',
    data_table_name: 'client_data', // optional, defaults to 'client_data'
    grafana_dashboard_url: 'https://your-org.grafana.net/d/dashboard-id'
  })
})
```

**Via Database (Direct):**
```sql
-- Update user profile with client database configuration
UPDATE profiles
SET
  company = 'User Company Name',
  client_type = 'business',
  client_database_url = 'https://user-project.supabase.co',
  client_database_anon_key = 'user_anon_key',
  client_database_service_key = 'user_service_key',
  data_table_name = 'client_data',
  grafana_dashboard_url = 'https://your-org.grafana.net/d/dashboard-id',
  updated_at = NOW()
WHERE id = 'user_uuid';
```

## Grafana Cloud Integration

### 1. Connect Supabase to Grafana
1. In Grafana Cloud, add a PostgreSQL data source
2. Use the client's Supabase database connection details:
   - Host: `db.{project-ref}.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: `{database-password}`

### 2. Create Dashboard
Create dashboards that query the `client_data` table:
```sql
-- Example query for Grafana
SELECT
  (data->>'date')::timestamp as time,
  (data->>'value')::numeric as value,
  data->>'category' as category
FROM client_data
WHERE $__timeFilter((data->>'date')::timestamp)
ORDER BY time
```

### 3. Update Client Record
Add the Grafana dashboard URL to the client record:
```sql
UPDATE clients
SET grafana_dashboard_url = 'https://your-org.grafana.net/d/dashboard-id'
WHERE id = 'client_uuid';
```

## File Upload Process

### 1. User Workflow
1. User logs into dashboard
2. System checks if client database is configured
3. User uploads CSV/Excel file (max 50MB)
4. System processes file asynchronously
5. User sees real-time status updates
6. Data appears in Grafana dashboards automatically

### 2. Processing Pipeline
```
Upload → Validate → Convert (Excel→CSV) → Normalize → Parse → Truncate → Insert → Sync → Complete
```

### 3. Data Normalization
The Python script handles:
- **Date formatting** - Converts various date formats to ISO standard
- **Numeric cleaning** - Removes currency symbols, handles commas
- **Column standardization** - Lowercase, underscore-separated names
- **Missing values** - Fills with appropriate defaults
- **Duplicate removal** - Removes exact duplicate rows

## Monitoring and Troubleshooting

### 1. Upload Status
Check upload status via API:
```javascript
const response = await fetch(`/api/upload/status/${uploadId}`)
const status = await response.json()
```

### 2. Database Logs
Monitor the `data_uploads` table for processing status:
```sql
SELECT * FROM data_uploads
WHERE processing_status = 'failed'
ORDER BY created_at DESC;
```

### 3. Python Script Logs
The Python script generates detailed logs and reports:
- Processing log in `{filename}_report.json`
- Console output for debugging

### 4. Common Issues

**Upload fails immediately:**
- Check file size (max 50MB)
- Verify file format (CSV, XLSX, XLS)
- Ensure user has editor/admin role for client

**Processing fails:**
- Check Python dependencies are installed
- Verify CSV format and encoding
- Check client database connection

**Data not appearing in Grafana:**
- Verify Grafana data source connection
- Check dashboard queries
- Ensure data was inserted successfully

## Security Considerations

1. **Database Isolation** - Each client has separate Supabase project
2. **Access Control** - Users can only access assigned clients
3. **File Validation** - Size and type restrictions
4. **Secure Keys** - Service keys stored securely, not exposed to frontend

## Scaling Considerations

1. **File Processing** - Consider queue system for high volume
2. **Database Connections** - Connection pooling for multiple clients
3. **Storage** - Temporary files are cleaned up after processing
4. **Monitoring** - Set up alerts for failed uploads

## Next Steps

1. Set up your first client following the steps above
2. Test the upload process with sample data
3. Create Grafana dashboards for the client
4. Monitor the system and adjust as needed

For support, check the logs and error messages, or contact the development team.
