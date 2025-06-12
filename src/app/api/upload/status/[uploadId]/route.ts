import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
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

    const { uploadId } = params

    // Get upload status from data_uploads table
    const { data: upload, error: uploadError } = await supabase
      .from('data_uploads')
      .select(`
        id,
        processing_status,
        row_count,
        column_count,
        processing_error,
        sync_error_message,
        processing_started_at,
        processing_completed_at,
        client_database_synced,
        created_at,
        updated_at,
        file_name,
        original_file_name,
        file_size,
        columns_info,
        metadata
      `)
      .eq('id', uploadId)
      .eq('user_id', user.id) // Ensure user can only see their own uploads
      .single()

    if (uploadError || !upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: upload.id,
      status: upload.processing_status,
      rows_processed: upload.row_count,
      columns_processed: upload.column_count,
      error_message: upload.processing_error || upload.sync_error_message,
      processing_started_at: upload.processing_started_at,
      processing_completed_at: upload.processing_completed_at,
      client_database_synced: upload.client_database_synced,
      created_at: upload.created_at,
      updated_at: upload.updated_at,
      file_info: {
        name: upload.file_name,
        original_name: upload.original_file_name,
        size: upload.file_size
      },
      columns_info: upload.columns_info,
      metadata: upload.metadata,
      debug_info: {
        csv_columns: upload.columns_info || [],
        table_name: upload.metadata?.table_name || 'unknown'
      }
    })

  } catch (error) {
    console.error('Upload status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
