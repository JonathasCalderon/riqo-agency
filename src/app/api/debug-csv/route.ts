import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const fileContent = await file.text()
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Keep original case
      preview: 3 // Only parse first 3 rows for debugging
    })

    return NextResponse.json({
      filename: file.name,
      size: file.size,
      headers: parseResult.meta.fields || [],
      sample_data: parseResult.data,
      errors: parseResult.errors,
      total_rows: parseResult.data.length
    })

  } catch (error) {
    console.error('Debug CSV error:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
