-- Add blob_url column to data_uploads table for Vercel Blob storage support
-- This migration adds support for storing Vercel Blob URLs in upload records

-- Add blob_url column to data_uploads table
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS blob_url TEXT;

-- Add index for blob_url lookups (used by status-by-url endpoint)
CREATE INDEX IF NOT EXISTS idx_data_uploads_blob_url ON public.data_uploads(blob_url);

-- Add additional columns that might be missing for blob upload workflow
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS rows_processed INTEGER;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS columns_processed INTEGER;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_data_uploads_completed_at ON public.data_uploads(completed_at);
CREATE INDEX IF NOT EXISTS idx_data_uploads_rows_processed ON public.data_uploads(rows_processed);

-- Update the database types comment for documentation
COMMENT ON COLUMN public.data_uploads.blob_url IS 'URL of the file stored in Vercel Blob storage';
COMMENT ON COLUMN public.data_uploads.rows_processed IS 'Number of data rows processed from the CSV file';
COMMENT ON COLUMN public.data_uploads.columns_processed IS 'Number of columns processed from the CSV file';
COMMENT ON COLUMN public.data_uploads.completed_at IS 'Timestamp when processing was completed';
COMMENT ON COLUMN public.data_uploads.error_message IS 'Error message if processing failed';
