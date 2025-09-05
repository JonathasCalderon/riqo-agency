import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import Papa, { ParseError } from 'papaparse'
import { getFileContentWithProperEncoding, validateCsvContent, logEncodingStats } from '@/lib/encoding-utils'

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

    // Basic file validation - check if file is not empty and has reasonable content
    if (file.size < 10) {
      return NextResponse.json(
        { error: 'File appears to be empty or corrupted' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB, but warn for large files)
    const fileSizeInMB = file.size / (1024 * 1024)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds the maximum limit of 50MB. Please reduce the file size or split it into smaller files.` },
        { status: 400 }
      )
    }

    // Log file size for monitoring
    console.log(`Processing file: ${file.name} (${fileSizeInMB.toFixed(2)}MB)`)

    // Warn about large files that might take longer to process
    if (fileSizeInMB > 10) {
      console.log(`Large file detected (${fileSizeInMB.toFixed(2)}MB) - processing may take longer`)
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

    // Read file with proper UTF-8 encoding handling
    const fileContent = await getFileContentWithProperEncoding(file)

    // Log encoding statistics for debugging
    logEncodingStats(fileContent, file.name)

    // Validate CSV content
    const validation = validateCsvContent(fileContent)
    if (!validation.isValid) {
      throw new Error(`Invalid CSV file: ${validation.error}`)
    }

    // Save the file with UTF-8 encoding
    const inputPath = join(tempDir, file.name)
    try {
      await writeFile(inputPath, fileContent, 'utf-8')
      console.log(`Successfully saved file to: ${inputPath} (${fileContent.length} characters, UTF-8 encoded)`)
    } catch (error) {
      console.error('Error writing file:', error)
      console.error('Temp directory:', tempDir)
      console.error('Input path:', inputPath)
      console.error('Content length:', fileContent.length)
      throw new Error(`Failed to save uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Handle Excel files by converting them to CSV first
    let csvPath = inputPath

    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      // Temporarily disable Excel processing to debug server issues
      throw new Error('Excel file processing is temporarily disabled for debugging. Please convert your Excel file to CSV format and try again.')

      /*
      console.log('Excel file detected, converting to CSV...')

      // Create CSV output path
      const csvFileName = file.name.replace(/\.(xlsx|xls)$/i, '.csv')
      csvPath = join(tempDir, csvFileName)

      try {
        // Convert Excel to CSV using Python
        await convertExcelToCsv(inputPath, csvPath)
        console.log(`Successfully converted Excel file to CSV: ${csvPath}`)
      } catch (conversionError) {
        console.error('Excel conversion failed:', conversionError)
        throw new Error(`Failed to convert Excel file: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}. Please ensure the Excel file is not corrupted and try again.`)
      }
      */
    }

    // Use the CSV file (either original or converted from Excel)
    const processedPath = csvPath

    // Parse processed CSV with streaming for large files
    const csvContent = await readFile(processedPath, 'utf-8')
    console.log(`Reading CSV file for parsing: ${csvContent.length} characters`)

    // Check file size and use appropriate parsing strategy
    const fileSizeInMB = csvContent.length / (1024 * 1024)
    console.log(`CSV file size: ${fileSizeInMB.toFixed(2)} MB`)

    // Log a sample of the content to verify encoding
    const sampleLines = csvContent.split('\n').slice(0, 3)
    console.log('Sample CSV content after file read:', sampleLines)

    let parseResult: any

    if (fileSizeInMB > 10) {
      // For large files, use streaming approach with chunking
      console.log('Large file detected, using streaming parser...')
      parseResult = await parseCSVInChunks(csvContent)
    } else {
      // For smaller files, use regular parsing
      parseResult = Papa.parse(csvContent, {
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

    // Test client database connection
    console.log('Testing client database connection...')
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client database connection failed: ${connectionTest.error}`)
    }
    console.log('Client database connection successful')
    console.log('Table info:', connectionTest.tableInfo)

    // Log CSV columns vs expected table structure
    const csvColumns = parseResult.meta?.fields || []
    console.log('CSV columns detected:', csvColumns)
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

    // Skip table creation - table already exists
    console.log(`Using existing table: ${profile.data_table_name || 'ventas'}`)

    // Truncate existing data
    console.log('Truncating existing data...')
    const truncateResult = await ClientDatabaseManager.truncateDataTable(profile)
    if (!truncateResult.success) {
      throw new Error(`Failed to truncate data table: ${truncateResult.error}`)
    }
    console.log('Data truncated successfully')

    // Insert new data with chunking for large datasets
    console.log('Inserting new data...')
    const dataToInsert = parseResult.data as Record<string, any>[]

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

    // Clean up temporary directory on error
    try {
      const errorTempDir = getTempDir(uploadId)
      await rm(errorTempDir, { recursive: true, force: true })
      console.log(`Cleaned up temp directory after error: ${errorTempDir}`)
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory after error:', cleanupError)
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

/**
 * Convert Excel file to CSV using Python with improved error handling
 */
async function convertExcelToCsv(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Escape paths for Windows compatibility
    const escapedInputPath = inputPath.replace(/\\/g, '\\\\')
    const escapedOutputPath = outputPath.replace(/\\/g, '\\\\')

    const pythonScript = `
import pandas as pd
import sys
import os
from pathlib import Path

try:
    # Verify input file exists
    input_file = r'${escapedInputPath}'
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")

    # Simple Excel reading with basic error handling
    try:
        df = pd.read_excel(input_file, engine='openpyxl')
        print("Successfully read Excel file with openpyxl")
    except Exception as e1:
        try:
            df = pd.read_excel(input_file, engine='xlrd')
            print("Successfully read Excel file with xlrd")
        except Exception as e2:
            raise Exception(f"Failed to read Excel file. openpyxl error: {str(e1)}, xlrd error: {str(e2)}")

    # Validate that we have data
    if df.empty:
        raise Exception("Excel file is empty or contains no readable data")

    # Clean column names (remove extra spaces, special characters)
    df.columns = df.columns.astype(str).str.strip()

    # Convert to CSV with UTF-8 encoding
    output_file = r'${escapedOutputPath}'
    df.to_csv(output_file, index=False, encoding='utf-8')

    # Verify output file was created
    if not os.path.exists(output_file):
        raise Exception("CSV output file was not created successfully")

    print(f"SUCCESS: Converted {len(df)} rows and {len(df.columns)} columns")

except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`

    console.log('Starting Excel to CSV conversion...')
    console.log('Input path:', inputPath)
    console.log('Output path:', outputPath)

    // Use the virtual environment Python
    const venvPythonPath = join(process.cwd(), 'venv', 'bin', 'python')
    console.log('Using virtual environment Python:', venvPythonPath)

    const pythonProcess = spawn(venvPythonPath, ['-c', pythonScript])
    let output = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log('Python stdout:', text.trim())
    })

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString()
      error += text
      console.error('Python stderr:', text.trim())
    })

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code: ${code}`)
      console.log('Final output:', output.trim())

      if (code === 0 && output.includes('SUCCESS')) {
        console.log('Excel conversion completed successfully')
        resolve()
      } else {
        const errorMessage = error.trim() || output.trim() || 'Unknown conversion error'
        console.error('Excel conversion failed:', errorMessage)
        reject(new Error(`Excel conversion failed: ${errorMessage}`))
      }
    })

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err)
      reject(new Error(`Failed to start Python process: ${err.message}. Make sure Python 3 is installed and available in PATH.`))
    })
  })
}

/**
 * Process CSV with Python script
 */
async function processCsvWithPython(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'process_csv.py')
    const venvPythonPath = join(process.cwd(), 'venv', 'bin', 'python')
    const pythonProcess = spawn(venvPythonPath, [scriptPath, inputPath, outputPath])

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

          // Process chunk data
          const processedChunk = chunk.data.map((row: any) => {
            const processedRow: any = {}
            for (const [key, value] of Object.entries(row)) {
              const cleanKey = String(key).trim()
              let cleanValue = value

              if (cleanValue === null || cleanValue === undefined || cleanValue === '') {
                cleanValue = null
              } else if (!isNaN(Number(cleanValue)) && String(cleanValue).trim() !== '') {
                cleanValue = Number(cleanValue)
              } else {
                cleanValue = String(cleanValue).trim()
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
