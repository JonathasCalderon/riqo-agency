import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

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

    // Save file temporarily for inspection
    const tempDir = tmpdir()
    const tempPath = join(tempDir, `debug_${Date.now()}_${file.name}`)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempPath, buffer)

    // Read first few bytes to check file signature
    const firstBytes = buffer.slice(0, 20)
    const hexSignature = firstBytes.toString('hex')
    
    // Common file signatures
    const signatures = {
      'xlsx': '504b0304', // ZIP signature (Excel 2007+)
      'xls_old': 'd0cf11e0a1b11ae1', // OLE2 signature (Excel 97-2003)
      'csv_utf8': 'efbbbf', // UTF-8 BOM
      'zip': '504b0304'
    }

    let detectedType = 'unknown'
    for (const [type, sig] of Object.entries(signatures)) {
      if (hexSignature.toLowerCase().startsWith(sig)) {
        detectedType = type
        break
      }
    }

    // Try to read as text to see if it's actually CSV
    let textPreview = ''
    try {
      const textContent = buffer.toString('utf-8', 0, Math.min(500, buffer.length))
      textPreview = textContent
    } catch (error) {
      textPreview = 'Cannot read as UTF-8 text'
    }

    // Clean up temp file
    try {
      const fs = await import('fs')
      fs.unlinkSync(tempPath)
    } catch (error) {
      console.warn('Failed to clean up temp file:', error)
    }

    return NextResponse.json({
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      detected_type: detectedType,
      hex_signature: hexSignature,
      text_preview: textPreview.substring(0, 200),
      analysis: {
        is_likely_excel: detectedType === 'xlsx' || detectedType === 'xls_old',
        is_likely_csv: textPreview.includes(',') && textPreview.includes('\n'),
        is_zip_based: hexSignature.toLowerCase().startsWith('504b0304'),
        has_utf8_bom: hexSignature.toLowerCase().startsWith('efbbbf')
      }
    })

  } catch (error) {
    console.error('Debug file error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
