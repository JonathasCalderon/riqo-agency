# Vercel Blob Storage Setup Guide

This guide will help you set up Vercel Blob Storage to handle large file uploads (>4.5MB) that exceed Vercel's serverless function limits.

## Prerequisites

- Vercel account with your project deployed
- Access to your Vercel dashboard
- Admin access to your project's environment variables

## Step 1: Create a Vercel Blob Store

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to the "Storage" tab in your dashboard
3. Click "Create Database" and select "Blob"
4. Choose a name for your blob store (e.g., "riqo-agency-files")
5. Select the region closest to your users
6. Click "Create"

## Step 2: Get Your Blob Token

1. After creating the blob store, you'll see it in your Storage dashboard
2. Click on your blob store name
3. Go to the "Settings" tab
4. Copy the "Read-Write Token" - this is your `BLOB_READ_WRITE_TOKEN`

## Step 3: Configure Environment Variables

### In Vercel Dashboard:
1. Go to your project in Vercel dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the following environment variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: The token you copied from Step 2
   - **Environment**: Production, Preview, Development (select all)

### In Your Local Development:
1. Update your `.env.local` file:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_actual_token_here
```

## Step 4: Deploy Your Changes

1. Commit your changes:
```bash
git add .
git commit -m "Add Vercel Blob storage for large file uploads"
git push origin main
```

2. Vercel will automatically redeploy your application

## Step 5: Verify the Setup

### Test with a Large File:
1. Go to your deployed application
2. Try uploading a CSV file larger than 4.5MB
3. Monitor the upload process - you should see:
   - "Uploading file..." (file goes to blob storage)
   - "Processing file..." (file is processed from blob)
   - Success message with processing details

### Check Logs:
1. In Vercel dashboard, go to "Functions" tab
2. Look for logs from your upload endpoints
3. You should see messages like:
   - "File uploaded to blob: https://..."
   - "Processing started: ..."

## How It Works

The blob storage implementation uses a 3-step process:

1. **Upload URL Generation** (`/api/upload-url`):
   - Creates a database record for tracking
   - Returns a proxy URL for uploading

2. **File Upload** (`/api/blob-upload/[uploadId]`):
   - Receives the file via PUT request
   - Uploads to Vercel Blob storage
   - Updates the database record

3. **File Processing** (`/api/process-blob`):
   - Downloads file from blob storage
   - Processes CSV data
   - Updates client databases
   - Provides status updates

## File Size Limits

- **Previous limit**: 4.5MB (Vercel serverless function limit)
- **New limit**: 100MB (Vercel Blob storage limit)
- **Recommended**: Keep files under 50MB for optimal performance

## Troubleshooting

### Common Issues:

1. **"Blob storage not configured" error**:
   - Ensure `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
   - Redeploy after adding the environment variable

2. **Upload fails silently**:
   - Check Vercel function logs
   - Verify the blob store is in the same region as your functions

3. **Processing timeout**:
   - Large files may take longer to process
   - Check the `vercel.json` configuration for function timeouts

### Debug Steps:

1. Check environment variables in Vercel dashboard
2. Look at function logs in Vercel dashboard
3. Test with smaller files first
4. Verify blob store is accessible

## Security Considerations

- Blob tokens have read-write access - keep them secure
- Files are stored with public access but with obscure URLs
- Consider implementing additional access controls if needed

## Cost Considerations

- Vercel Blob storage pricing: $0.15/GB/month
- Transfer costs: $0.30/GB
- Most CSV files are small, so costs should be minimal

## Support

If you encounter issues:
1. Check the Vercel documentation: https://vercel.com/docs/storage/vercel-blob
2. Review the function logs in your Vercel dashboard
3. Test locally with the same environment variables
