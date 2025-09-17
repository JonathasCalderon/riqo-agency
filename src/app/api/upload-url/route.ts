import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Upload URL API called - Hobby Plan Direct Upload')
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

    const { filename, contentType, size } = await request.json()

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB for blob storage)
    const fileSizeInMB = size / (1024 * 1024)
    if (size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds the maximum limit of 100MB.` },
        { status: 400 }
      )
    }

    console.log(`Generating upload URL for: ${filename} (${fileSizeInMB.toFixed(2)}MB)`)

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
        file_name: `processed_${Date.now()}_${filename}`,
        original_file_name: filename,
        file_size: size,
        mime_type: contentType || 'text/csv',
        processing_status: 'pending'
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Upload record error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      )
    }

    // Check if blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.' },
        { status: 500 }
      )
    }

    // Return the upload record ID for direct blob upload
    // The frontend will use the upload-blob endpoint with streaming
    return NextResponse.json({
      uploadUrl: `/api/upload-blob`, // Direct blob upload endpoint
      uploadId: uploadRecord.id,
      fileName: filename,
      fileSize: size
    })

  } catch (error) {
    console.error('Upload URL error:', error)
    
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

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
