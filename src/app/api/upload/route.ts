import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import Papa from 'papaparse'

/**
 * Get a safe temporary directory path for the upload
 */
function getTempDir(uploadId: string): string {
  // Use system temp directory for production compatibility
  return join(tmpdir(), 'riqo-uploads', uploadId)
}

/**
 * Ensure temp directory exists and is writable
 */
async function ensureTempDir(uploadId: string): Promise<string> {
  const tempDir = getTempDir(uploadId)
  try {
    await mkdir(tempDir, { recursive: true })
    console.log(`Created/verified temp directory: ${tempDir}`)
    return tempDir
  } catch (error) {
    console.error('Error creating temp directory:', error)
    throw new Error(`Failed to create temporary directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    // Get user profile with client configuration
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

    // Create upload record using existing data_uploads table
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

    // Process the file asynchronously
    processFileAsync(file, profile, uploadRecord.id, supabase)

    return NextResponse.json({
      message: 'File upload started',
      uploadId: uploadRecord.id,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process file asynchronously
 */
async function processFileAsync(file: File, profile: any, uploadId: string, supabase: any) {
  try {
    console.log(`Starting file processing for upload ${uploadId}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`Platform: ${process.platform}`)
    console.log(`System temp dir: ${tmpdir()}`)

    // Update status to processing
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', uploadId)

    // Create temporary directory using helper function
    const tempDir = await ensureTempDir(uploadId)

    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer())
    const inputPath = join(tempDir, file.name)
    try {
      await writeFile(inputPath, buffer)
      console.log(`Successfully saved file to: ${inputPath} (${buffer.length} bytes)`)
    } catch (error) {
      console.error('Error writing file:', error)
      console.error('Temp directory:', tempDir)
      console.error('Input path:', inputPath)
      console.error('Buffer length:', buffer.length)
      throw new Error(`Failed to save uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // For now, let's skip Excel conversion and Python processing to get basic CSV upload working
    // We'll use the uploaded CSV directly
    let csvPath = inputPath

    // If it's an Excel file, we'll need to handle this differently for now
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      throw new Error('Excel file support requires Python dependencies. Please upload CSV files for now.')
    }

    // Use the original CSV file (we'll add Python processing later)
    const processedPath = csvPath

    // Parse processed CSV
    const csvContent = await readFile(processedPath, 'utf-8')
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Keep original case - don't lowercase
      transform: (value, header) => {
        // Clean up the data
        if (value === null || value === undefined || value === '') {
          return null
        }
        // Try to convert numbers
        if (!isNaN(Number(value)) && value.trim() !== '') {
          return Number(value)
        }
        return value.trim()
      }
    })

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors)
      // Only throw error for fatal parsing errors
      const fatalErrors = parseResult.errors.filter(e => e.type === 'Delimiter' || e.type === 'Quotes')
      if (fatalErrors.length > 0) {
        throw new Error(`CSV parsing errors: ${fatalErrors.map(e => e.message).join(', ')}`)
      }
    }

    console.log(`Processing ${parseResult.data.length} rows for upload ${uploadId}`)

    // Test client database connection
    console.log('Testing client database connection...')
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client database connection failed: ${connectionTest.error}`)
    }
    console.log('Client database connection successful')

    // Skip table creation - table already exists
    console.log(`Using existing table: ${profile.data_table_name || 'ventas'}`)

    // Truncate existing data
    console.log('Truncating existing data...')
    const truncateResult = await ClientDatabaseManager.truncateDataTable(profile)
    if (!truncateResult.success) {
      throw new Error(`Failed to truncate data table: ${truncateResult.error}`)
    }
    console.log('Data truncated successfully')

    // Insert new data
    console.log('Inserting new data...')
    const insertResult = await ClientDatabaseManager.insertData(profile, parseResult.data as Record<string, any>[])
    if (!insertResult.success) {
      throw new Error(`Failed to insert data: ${insertResult.error}`)
    }
    console.log(`Data inserted successfully: ${insertResult.rowsInserted} rows`)

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
        normalized_data_path: processedPath,
        metadata: {
          table_name: profile.data_table_name || 'client_data',
          columns: parseResult.meta?.fields || [],
          rows_processed: insertResult.rowsInserted || 0
        }
      })
      .eq('id', uploadId)

    console.log(`Successfully processed upload ${uploadId}: ${insertResult.rowsInserted} rows`)

    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true })
      console.log(`Cleaned up temp directory: ${tempDir}`)
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory:', cleanupError)
    }

  } catch (error) {
    console.error(`Error processing upload ${uploadId}:`, error)

    // Clean up temporary directory on error
    try {
      const errorTempDir = getTempDir(uploadId)
      await rm(errorTempDir, { recursive: true, force: true })
      console.log(`Cleaned up temp directory after error: ${errorTempDir}`)
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory after error:', cleanupError)
    }

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

/**
 * Convert Excel file to CSV using Python
 */
async function convertExcelToCsv(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import pandas as pd
import sys

try:
    df = pd.read_excel('${inputPath}')
    df.to_csv('${outputPath}', index=False, encoding='utf-8')
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`

    const pythonProcess = spawn('python3', ['-c', pythonScript])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0 && output.includes('SUCCESS')) {
        resolve()
      } else {
        reject(new Error(`Excel conversion failed: ${error || output}`))
      }
    })
  })
}

/**
 * Process CSV with Python script
 */
async function processCsvWithPython(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'process_csv.py')
    const pythonProcess = spawn('python3', [scriptPath, inputPath, outputPath])

    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`CSV processing failed: ${error || output}`))
      }
    })
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
