import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Papa, { ParseError } from 'papaparse'
import { validateCsvContent } from '@/lib/encoding-utils'

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

    // Check file size and use appropriate parsing strategy
    const fileSizeInMB = fileContent.length / (1024 * 1024)
    console.log(`CSV file size: ${fileSizeInMB.toFixed(2)} MB`)

    // Log a sample of the content to verify encoding
    const sampleLines = fileContent.split('\n').slice(0, 3)
    console.log('Sample CSV content after file read:', sampleLines)

    let parseResult: any

    if (fileSizeInMB > 10) {
      // For large files, use streaming approach with chunking
      console.log('Large file detected, using streaming parser...')
      parseResult = await parseCSVInChunks(fileContent)
    } else {
      // For smaller files, use regular parsing
      parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Keep original case - don't lowercase
        transform: (value, field) => {
          // Clean up the data
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
    }

    // Log sample parsed data to verify encoding is preserved
    if (parseResult.data.length > 0) {
      console.log('Sample parsed data (first row):', JSON.stringify(parseResult.data[0], null, 2))
    }

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors)

      // Categorize errors
      const fatalErrors = parseResult.errors.filter((e: ParseError) => e.type === 'Delimiter' || e.type === 'Quotes')
      const warningErrors = parseResult.errors.filter((e: ParseError) => e.type !== 'Delimiter' && e.type !== 'Quotes')

      if (fatalErrors.length > 0) {
        const errorDetails = fatalErrors.map((e: ParseError) => `Line ${e.row || 'unknown'}: ${e.message}`).join('; ')
        throw new Error(`CSV format errors detected: ${errorDetails}. Please check your file format and try again.`)
      }

      if (warningErrors.length > 0) {
        console.log(`CSV parsing completed with ${warningErrors.length} warnings (non-fatal)`)
      }
    }

    console.log(`Processing ${parseResult.data.length} rows for upload ${uploadId}`)

    // Log CSV columns vs expected table structure
    const csvColumns = parseResult.meta?.fields || []
    console.log('CSV columns detected:', csvColumns)

    // Identify date columns for processing
    const dateColumns = csvColumns.filter((col: string) =>
      col.toLowerCase().includes('fecha') || col.toLowerCase().includes('date')
    )
    console.log('Date columns identified for normalization:', dateColumns)

    console.log('Expected table columns (from debug-csv.html):', [
      'id', 'fecha', 'hora', 'clienteId', 'cliente', 'oficina', 'vendedor', 'vendedorId',
      'vendedorUsername', 'distribuidor', 'distribuidorId', 'distribuidorUsername', 'zona',
      'tipoPago', 'productoId', 'codigo', 'producto', 'categoria', 'dpGroup', 'cantidad',
      'cantidadCajas', 'precioUnitario', 'precioPaquete', 'monto', 'descuento', 'descuento2',
      'descuentoSocio', 'montoFinal', 'proveedor', 'tipoNegocio', 'nroFactura', 'cuf',
      'razonSocial', 'nit', 'mes', 'supervisor', 'ventaId', 'preVentaId', 'ruta', 'diaVisita',
      'precioLista', 'codigoProducto', 'canal', 'tipoObjeto', 'mercado', 'empresa', 'jerarquia1',
      'jerarquia2', 'jerarquia3', 'descuentoGrupo', 'descuentoVolumen', 'escalaDescuento',
      'escalaProducto', 'cluster', 'descripcionUnificada', 'marca', 'fecha_formateada'
    ])

    // Test database connection
    console.log('Testing client database connection...')
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client database connection failed: ${connectionTest.error}`)
    }
    console.log('Client database connection successful')
    console.log('Table info:', connectionTest.tableInfo)

    // Skip table creation - table already exists
    console.log(`Using existing table: ${profile.data_table_name || 'ventas'}`)

    // Truncate existing data
    console.log('Truncating existing data...')
    const truncateResult = await ClientDatabaseManager.truncateDataTable(profile)
    if (!truncateResult.success) {
      throw new Error(`Failed to truncate data table: ${truncateResult.error}`)
    }
    console.log('Data truncated successfully')

    // Post-process data to ensure all normalization is applied
    console.log('Post-processing data for normalization...')
    let dataToInsert = parseResult.data as Record<string, any>[]

    // Apply additional data normalization if not already done in parsing
    dataToInsert = dataToInsert.map((row: Record<string, any>) => {
      const normalizedRow: Record<string, any> = {}

      for (const [key, value] of Object.entries(row)) {
        let normalizedValue = value

        // Additional date normalization for any missed date fields
        if (typeof value === 'string' && (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date'))) {
          if (isDateLike(value)) {
            normalizedValue = normalizeDate(value)
          }
        }
        // Additional numeric normalization
        else if (typeof value === 'string' && isNumericLike(value)) {
          normalizedValue = cleanNumericValue(value)
        }

        normalizedRow[key] = normalizedValue
      }

      return normalizedRow
    })

    // Insert new data with chunking for large datasets
    console.log('Inserting new data...')
    console.log(`Sample normalized row:`, JSON.stringify(dataToInsert[0] || {}, null, 2))

    let insertResult: { success: boolean; error?: string; rowsInserted?: number }

    if (dataToInsert.length > 5000) {
      // For large datasets, insert in chunks to avoid memory issues
      console.log(`Large dataset detected (${dataToInsert.length} rows), inserting in chunks...`)
      insertResult = await ClientDatabaseManager.insertDataInChunks(profile, dataToInsert, 1000)
      if (!insertResult.success) {
        throw new Error(`Failed to insert data: ${insertResult.error}`)
      }
      console.log(`Data inserted successfully: ${insertResult.rowsInserted} rows`)
    } else {
      // For smaller datasets, use regular insertion
      insertResult = await ClientDatabaseManager.insertData(profile, dataToInsert)
      if (!insertResult.success) {
        throw new Error(`Failed to insert data: ${insertResult.error}`)
      }
      console.log(`Data inserted successfully: ${insertResult.rowsInserted} rows`)
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

    // Categorize error types for better user feedback
    let userFriendlyError = 'An unexpected error occurred while processing your file.'
    let errorCategory = 'unknown'

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()

      if (errorMessage.includes('excel') || errorMessage.includes('openpyxl') || errorMessage.includes('xlrd')) {
        userFriendlyError = 'Failed to process Excel file. Please ensure the file is not corrupted and contains valid data.'
        errorCategory = 'excel_processing'
      } else if (errorMessage.includes('csv') || errorMessage.includes('parsing')) {
        userFriendlyError = 'Failed to parse CSV file. Please check the file format and ensure it has proper headers.'
        errorCategory = 'csv_parsing'
      } else if (errorMessage.includes('encoding') || errorMessage.includes('utf-8')) {
        userFriendlyError = 'File encoding issue detected. Please save your file with UTF-8 encoding and try again.'
        errorCategory = 'encoding'
      } else if (errorMessage.includes('database') || errorMessage.includes('insert')) {
        userFriendlyError = 'Database error occurred while saving your data. Please try again or contact support.'
        errorCategory = 'database'
      } else if (errorMessage.includes('connection')) {
        userFriendlyError = 'Database connection failed. Please check your configuration or contact support.'
        errorCategory = 'connection'
      } else if (errorMessage.includes('size') || errorMessage.includes('memory')) {
        userFriendlyError = 'File is too large to process. Please reduce the file size or split it into smaller files.'
        errorCategory = 'size'
      } else {
        userFriendlyError = error.message
      }
    }

    // Update upload record with detailed error information
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'failed',
        processing_completed_at: new Date().toISOString(),
        processing_error: userFriendlyError,
        sync_error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          error_category: errorCategory,
          original_error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', uploadId)
  }
}

// Helper functions for CSV processing
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
      return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
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
  // Remove currency symbols and commas, keep the number
  const cleaned = value.replace(/[\$\€\£,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? value : num.toString()
}

/**
 * Parse large CSV files in chunks to avoid memory issues
 */
async function parseCSVInChunks(csvContent: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const results: any[] = []
    let headers: string[] = []
    let errors: any[] = []
    let isFirstChunk = true

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      chunk: (chunk: any) => {
        try {
          if (isFirstChunk) {
            headers = chunk.meta.fields || []
            isFirstChunk = false
            console.log(`CSV headers detected: ${headers.length} columns`)
          }

          // Process chunk data with date normalization and data cleaning
          const processedChunk = chunk.data.map((row: any) => {
            const processedRow: any = {}
            for (const [key, value] of Object.entries(row)) {
              const cleanKey = String(key).trim()
              let cleanValue = value

              if (cleanValue === null || cleanValue === undefined || cleanValue === '') {
                cleanValue = null
              } else {
                const stringValue = String(cleanValue)

                // Handle date fields specifically
                if (cleanKey.toLowerCase().includes('fecha') || cleanKey.toLowerCase().includes('date')) {
                  if (isDateLike(stringValue)) {
                    cleanValue = normalizeDate(stringValue)
                  } else {
                    cleanValue = stringValue.trim()
                  }
                }
                // Handle numeric fields
                else if (isNumericLike(stringValue)) {
                  cleanValue = cleanNumericValue(stringValue)
                }
                // Try to convert numbers
                else if (!isNaN(Number(stringValue)) && stringValue.trim() !== '') {
                  cleanValue = Number(stringValue)
                } else {
                  cleanValue = stringValue.trim()
                }
              }

              processedRow[cleanKey] = cleanValue
            }
            return processedRow
          })

          results.push(...processedChunk)
          console.log(`Processed chunk: ${chunk.data.length} rows (total: ${results.length})`)

          if (chunk.errors && chunk.errors.length > 0) {
            errors.push(...chunk.errors)
          }
        } catch (chunkError) {
          console.error('Error processing chunk:', chunkError)
          errors.push({ message: `Chunk processing error: ${chunkError}` })
        }
      },
      complete: () => {
        console.log(`CSV parsing completed: ${results.length} total rows`)
        resolve({
          data: results,
          errors: errors,
          meta: { fields: headers }
        })
      },
      error: (error: any) => {
        console.error('CSV parsing error:', error)
        reject(new Error(`CSV parsing failed: ${error.message}`))
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
