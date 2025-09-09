import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'
import Papa, { ParseError } from 'papaparse'
import { validateCsvContent } from '@/lib/encoding-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('⚙️ Process Blob API called')
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

    const { blobUrl, uploadId } = await request.json()

    if (!blobUrl || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

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

    // Start processing asynchronously
    processFileFromBlob(blobUrl, profile, uploadId, supabase).catch(error => {
      console.error('Async processing error:', error)
    })

    return NextResponse.json({
      message: 'File processing started',
      uploadId: uploadId,
      status: 'processing'
    })

  } catch (error) {
    console.error('Process blob error:', error)
    
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

// Copy the processing function from the upload route
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

    // Parse CSV with advanced processing
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value, field) => {
        if (value === null || value === undefined || value === '') {
          return null
        }
        
        // Handle date fields specifically
        if (field && typeof field === 'string' && (field.toLowerCase().includes('fecha') || field.toLowerCase().includes('date'))) {
          if (typeof value === 'string' && isDateLike(value)) {
            return normalizeDate(value)
          }
        }
        
        // Handle numeric fields
        if (typeof value === 'string' && isNumericLike(value)) {
          return cleanNumericValue(value)
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
        client_database_synced: true
      })
      .eq('id', uploadId)

    console.log(`Upload ${uploadId} completed successfully`)

  } catch (error) {
    console.error(`Error processing blob upload ${uploadId}:`, error)

    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'failed',
        processing_completed_at: new Date().toISOString(),
        processing_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', uploadId)
  }
}

// Helper functions
function isDateLike(value: string): boolean {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/ // D/M/YY
  ]
  return datePatterns.some(pattern => pattern.test(value))
}

function normalizeDate(value: string): string {
  try {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (e) {
    // If date parsing fails, return original value
  }
  return value
}

function isNumericLike(value: string): boolean {
  const numericPattern = /^[\$\€\£]?[\d,]+\.?\d*$/
  return numericPattern.test(value.trim())
}

function cleanNumericValue(value: string): string {
  const cleaned = value.replace(/[\$\€\£,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? value : num.toString()
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
