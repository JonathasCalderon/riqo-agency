/**
 * Encoding utilities for handling CSV files with proper UTF-8 support
 * Helps fix issues with special characters like ñ, á, é, etc.
 */

/**
 * Attempts to detect and fix encoding issues in file content
 * @param file - The uploaded File object
 * @returns Promise<string> - The content with proper UTF-8 encoding
 */
export async function getFileContentWithProperEncoding(file: File): Promise<string> {
  try {
    // First, try to read the file as text directly from the File object
    let fileContent = await file.text()
    console.log(`Read file content: ${fileContent.length} characters`)

    // Detect if the content has encoding issues (replacement characters)
    const hasEncodingIssues = fileContent.includes('�') || fileContent.includes('\ufffd')

    if (hasEncodingIssues) {
      console.warn('Detected potential encoding issues in file content, attempting to fix...')

      // Get the raw buffer to try different encodings
      const buffer = Buffer.from(await file.arrayBuffer())

      // Try different encodings commonly used for CSV files with special characters
      const encodings: BufferEncoding[] = ['utf8', 'latin1', 'ascii']
      let bestContent = fileContent
      let bestScore = getEncodingScore(fileContent)

      for (const encoding of encodings) {
        try {
          const testContent = buffer.toString(encoding)
          const score = getEncodingScore(testContent)

          if (score > bestScore) {
            bestContent = testContent
            bestScore = score
            console.log(`Better encoding found: ${encoding} (score: ${score} vs ${bestScore})`)
          }
        } catch (encodingError) {
          console.warn(`Failed to try encoding ${encoding}:`, encodingError)
        }
      }

      fileContent = bestContent

      // Log some sample content for debugging
      const sampleLines = fileContent.split('\n').slice(0, 3)
      console.log('Sample content after encoding fix:', sampleLines)
    }

    return fileContent

  } catch (error) {
    console.error('Error reading file with proper encoding:', error)
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Scores the quality of text encoding based on various factors
 * Higher score means better encoding
 */
function getEncodingScore(content: string): number {
  let score = 100

  // Penalize replacement characters heavily
  const replacementChars = (content.match(/�|\ufffd/g) || []).length
  score -= replacementChars * 50

  // Penalize other suspicious character sequences
  const suspiciousPatterns = [
    /Ã±/g, // Common mis-encoding of ñ
    /Ã¡/g, // Common mis-encoding of á
    /Ã©/g, // Common mis-encoding of é
    /Ã­/g, // Common mis-encoding of í
    /Ã³/g, // Common mis-encoding of ó
    /Ãº/g, // Common mis-encoding of ú
  ]

  for (const pattern of suspiciousPatterns) {
    const matches = (content.match(pattern) || []).length
    score -= matches * 10
  }

  // Bonus for proper Spanish characters
  const spanishChars = (content.match(/[ñáéíóúüÑÁÉÍÓÚÜ]/g) || []).length
  score += spanishChars * 2

  return score
}

/**
 * Validates that the content appears to be a valid CSV
 */
export function validateCsvContent(content: string): { isValid: boolean; error?: string } {
  try {
    const lines = content.split('\n').filter(line => line.trim().length > 0)

    if (lines.length < 2) {
      return { isValid: false, error: 'CSV must have at least a header row and one data row' }
    }

    // Check if first line looks like headers (no numbers only)
    const firstLine = lines[0]
    const headers = firstLine.split(',').map(h => h.trim().replace(/['"]/g, ''))

    if (headers.length < 1) {
      return { isValid: false, error: 'CSV must have at least one column' }
    }

    // Basic validation passed
    return { isValid: true }

  } catch (error) {
    return { isValid: false, error: `CSV validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Logs encoding statistics for debugging
 */
export function logEncodingStats(content: string, filename: string): void {
  const stats = {
    filename,
    totalChars: content.length,
    replacementChars: (content.match(/�|\ufffd/g) || []).length,
    spanishChars: (content.match(/[ñáéíóúüÑÁÉÍÓÚÜ]/g) || []).length,
    lines: content.split('\n').length,
    suspiciousSequences: {
      'Ã±': (content.match(/Ã±/g) || []).length,
      'Ã¡': (content.match(/Ã¡/g) || []).length,
      'Ã©': (content.match(/Ã©/g) || []).length,
    }
  }

  console.log('Encoding statistics:', stats)

  // Log sample of problematic content if found
  if (stats.replacementChars > 0 || Object.values(stats.suspiciousSequences).some(count => count > 0)) {
    const lines = content.split('\n').slice(0, 5)
    console.log('Sample content (first 5 lines):', lines)
  }
}
