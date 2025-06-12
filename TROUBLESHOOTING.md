# CSV Upload System Troubleshooting Guide

## Quick Fix for Current Error

The error "Cannot access 'process1' before initialization" has been fixed. Here's what to do:

### 1. Test Your Configuration

First, test if your user is properly configured:

```bash
# Visit this URL in your browser (while logged in)
http://localhost:3000/api/test-client-db
```

This will show you:
- Whether your client database is configured
- If the connection works
- If the required table exists

### 2. Common Issues and Solutions

#### Issue: "Client database not configured"
**Solution:** Follow the user configuration steps:

1. Create a separate Supabase project for the user
2. Create the `client_data` table in that project:
```sql
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

3. Update the user's profile with the database credentials

#### Issue: "Table does not exist"
**Solution:** Make sure you created the `client_data` table in the user's Supabase project (not your main project).

#### Issue: "Connection failed"
**Solution:** Check that:
- The Supabase project URL is correct
- The service role key is correct and has the right permissions
- The project is active and not paused

### 3. Step-by-Step User Configuration

Here's the exact process to configure a user:

#### Step A: Create User's Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name it something like "user-name-data"
4. Wait for it to be created
5. Go to Settings > API and copy:
   - Project URL
   - Anon key
   - Service role key

#### Step B: Create the Data Table
1. In the new project, go to SQL Editor
2. Run this SQL:
```sql
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

#### Step C: Configure the User Profile
Option 1 - Direct Database Update (Easiest):
```sql
-- In your MAIN Riqo database (not the user's project)
UPDATE profiles 
SET 
  company = 'User Company Name',
  client_type = 'business',
  client_database_url = 'https://your-user-project.supabase.co',
  client_database_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  client_database_service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  data_table_name = 'client_data',
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

### 4. Testing the Upload

1. **Test Configuration:**
   - Visit `/api/test-client-db` to verify setup
   - Should show `"configured": true` and successful tests

2. **Test Upload:**
   - Use the provided `test-data.csv` file
   - Upload through the dashboard
   - Check the upload status

3. **Verify Data:**
   - Go to the user's Supabase project
   - Check the `client_data` table
   - Should see the uploaded data in JSONB format

### 5. Common Error Messages

#### "Upload failed: Cannot access 'process1' before initialization"
- **Fixed:** This was a code issue that has been resolved

#### "Client database connection failed"
- Check the database URL and keys
- Make sure the Supabase project is active
- Verify the service role key has the right permissions

#### "Table 'client_data' does not exist"
- Create the table in the user's Supabase project (not your main one)
- Use the SQL provided above

#### "Processing failed"
- Check the browser console for detailed error messages
- Check the server logs for more information

### 6. Debug Information

To get detailed debug information:

1. **Check Upload Status:**
```javascript
// In browser console
fetch('/api/upload/status/UPLOAD_ID')
  .then(r => r.json())
  .then(console.log)
```

2. **Check Configuration:**
```javascript
// In browser console
fetch('/api/test-client-db')
  .then(r => r.json())
  .then(console.log)
```

3. **Server Logs:**
- Check your Next.js console for detailed error messages
- Look for console.log statements showing the processing steps

### 7. Quick Test Checklist

- [ ] User has a separate Supabase project created
- [ ] `client_data` table exists in the user's project
- [ ] User profile is updated with correct database credentials
- [ ] `/api/test-client-db` returns successful results
- [ ] Test CSV file uploads without errors
- [ ] Data appears in the user's `client_data` table

### 8. Example Working Configuration

Here's what a working user profile should look like:

```json
{
  "id": "user-uuid",
  "full_name": "John Doe",
  "company": "Acme Corp",
  "client_type": "business",
  "client_database_url": "https://abcdef123456.supabase.co",
  "client_database_anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_database_service_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data_table_name": "client_data",
  "grafana_dashboard_url": "https://acme.grafana.net/d/dashboard-id"
}
```

If you're still having issues, check the specific error message and follow the corresponding solution above.
