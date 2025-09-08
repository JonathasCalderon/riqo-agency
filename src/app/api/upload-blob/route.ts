import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Papa, { ParseError } from 'papaparse'
import { getFileContentWithProperEncoding, validateCsvContent, logEncodingStats } from '@/lib/encoding-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('Blob Upload API called - Environment:', process.env.NODE_ENV, 'Timestamp:', new Date().toISOString())
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type (accept both CSV and Excel)
    const allowedExtensions = ['.csv', '.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Only CSV and Excel files are allowed' },
        { status: 400 }
      )
    }

    // Basic file validation
    if (file.size < 10) {
      return NextResponse.json(
        { error: 'File appears to be empty or corrupted' },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB for blob storage)
    const fileSizeInMB = file.size / (1024 * 1024)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds the maximum limit of 100MB.` },
        { status: 400 }
      )
    }

    console.log(`Processing file: ${file.name} (${fileSizeInMB.toFixed(2)}MB)`)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user has client database configured
    if (!profile.client_database_url) {
      return NextResponse.json(
        { error: 'Client database not configured. Please contact support to set up your data visualization environment.' },
        { status: 400 }
      )
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('data_uploads')
      .insert({
        user_id: user.id,
        file_name: `processed_${Date.now()}_${file.name}`,
        original_file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'text/csv',
        processing_status: 'pending'
      })
      .select()
      .single()

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      )
    }

    // Upload file to Vercel Blob
    const fileName = `uploads/${uploadRecord.id}/${file.name}`

    // Check if blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.' },
        { status: 500 }
      )
    }

    const blob = await put(fileName, file, {
      access: 'public',
    })

    console.log('File uploaded to blob:', blob.url)

    // Process the file asynchronously
    processFileFromBlob(blob.url, profile, uploadRecord.id, supabase).catch(error => {
      console.error('Async processing error:', error)
    })

    return NextResponse.json({
      message: 'File upload started',
      uploadId: uploadRecord.id,
      fileName: file.name,
      fileSize: file.size,
      blobUrl: blob.url,
      status: 'pending'
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Process file from Vercel Blob storage
 */
async function processFileFromBlob(blobUrl: string, profile: any, uploadId: string, supabase: any) {
  try {
    console.log(`Starting blob file processing for upload ${uploadId}`)
    console.log(`Blob URL: ${blobUrl}`)

    // Update status to processing
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', uploadId)

    // Fetch file content from blob
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch file from blob: ${response.statusText}`)
    }

    const fileBuffer = await response.arrayBuffer()
    const fileContent = new TextDecoder('utf-8').decode(fileBuffer)

    console.log(`File content loaded: ${fileContent.length} characters`)

    // Validate CSV content
    const validation = validateCsvContent(fileContent)
    if (!validation.isValid) {
      throw new Error(`Invalid CSV file: ${validation.error}`)
    }

    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value, header) => {
        if (value === null || value === undefined || value === '') {
          return null
        }
        if (!isNaN(Number(value)) && value.trim() !== '') {
          return Number(value)
        }
        return value.trim()
      }
    })

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors)
      const fatalErrors = parseResult.errors.filter((e: ParseError) => e.type === 'Delimiter' || e.type === 'Quotes')
      if (fatalErrors.length > 0) {
        const errorDetails = fatalErrors.map((e: ParseError) => `Line ${e.row || 'unknown'}: ${e.message}`).join('; ')
        throw new Error(`CSV format errors detected: ${errorDetails}`)
      }
    }

    console.log(`Processing ${parseResult.data.length} rows for upload ${uploadId}`)

    // Test database connection
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client database connection failed: ${connectionTest.error}`)
    }

    // Truncate existing data
    const truncateResult = await ClientDatabaseManager.truncateDataTable(profile)
    if (!truncateResult.success) {
      throw new Error(`Failed to truncate data table: ${truncateResult.error}`)
    }

    // Insert new data
    const dataToInsert = parseResult.data as Record<string, any>[]
    let insertResult: { success: boolean; error?: string; rowsInserted?: number }

    if (dataToInsert.length > 5000) {
      insertResult = await ClientDatabaseManager.insertDataInChunks(profile, dataToInsert, 1000)
    } else {
      insertResult = await ClientDatabaseManager.insertData(profile, dataToInsert)
    }

    if (!insertResult.success) {
      throw new Error(`Failed to insert data: ${insertResult.error}`)
    }

    // Update upload record with success
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        row_count: insertResult.rowsInserted || 0,
        column_count: parseResult.meta?.fields?.length || 0,
        columns_info: parseResult.meta?.fields || [],
        client_database_synced: true,
        metadata: {
          table_name: profile.data_table_name || 'client_data',
          columns: parseResult.meta?.fields || [],
          rows_processed: insertResult.rowsInserted || 0,
          blob_url: blobUrl
        }
      })
      .eq('id', uploadId)

    console.log(`Successfully processed upload ${uploadId}: ${insertResult.rowsInserted} rows`)

  } catch (error) {
    console.error(`Error processing blob upload ${uploadId}:`, error)

    // Update upload record with error
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'failed',
        processing_completed_at: new Date().toISOString(),
        processing_error: error instanceof Error ? error.message : 'Unknown error',
        sync_error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', uploadId)
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
