import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ uploadId: string }> }
) {
  try {
    const params = await context.params
    console.log('📤 Blob Upload Proxy called for upload:', params.uploadId)
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

    // Get upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('data_uploads')
      .select('*')
      .eq('id', params.uploadId)
      .eq('user_id', user.id)
      .single()

    if (uploadError || !uploadRecord) {
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      )
    }

    // Get file from request body
    const fileBuffer = await request.arrayBuffer()
    const file = new File([fileBuffer], uploadRecord.original_file_name, {
      type: uploadRecord.mime_type
    })

    console.log(`Uploading file to blob: ${file.name} (${file.size} bytes)`)

    // Upload to Vercel Blob
    const fileName = `uploads/${params.uploadId}/${uploadRecord.original_file_name}`
    
    const blob = await put(fileName, file, {
      access: 'public',
    })

    console.log('File uploaded to blob:', blob.url)

    // Update upload record with blob URL
    await supabase
      .from('data_uploads')
      .update({
        blob_url: blob.url,
        processing_status: 'uploaded'
      })
      .eq('id', params.uploadId)

    return NextResponse.json({
      success: true,
      blobUrl: blob.url,
      uploadId: params.uploadId
    })

  } catch (error) {
    console.error('Blob upload error:', error)
    
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
