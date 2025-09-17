import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const blobUrl = searchParams.get('blobUrl')

    if (!blobUrl) {
      return NextResponse.json({ error: 'Blob URL is required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Find upload record by blob URL
    const { data: upload, error } = await supabase
      .from('data_uploads')
      .select('*')
      .eq('blob_url', blobUrl)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching upload status:', error)
      return NextResponse.json({ error: 'Upload record not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: upload.id,
      status: upload.processing_status,
      fileName: upload.original_file_name,
      fileSize: upload.file_size,
      rowsProcessed: upload.rows_processed,
      columnsProcessed: upload.columns_processed,
      clientDatabaseSynced: upload.client_database_synced,
      errorMessage: upload.error_message,
      createdAt: upload.created_at,
      completedAt: upload.completed_at
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
