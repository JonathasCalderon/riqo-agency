import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'

export async function POST(request: NextRequest) {
  try {
    const { blobUrl } = await request.json()
    
    if (!blobUrl) {
      return NextResponse.json({ error: 'Blob URL required' }, { status: 400 })
    }

    console.log('🔧 Manual blob processing started:', blobUrl)

    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        details: profileError 
      }, { status: 404 })
    }

    // Create upload record manually
    const uploadRecord = {
      user_id: user.id,
      file_name: `manual_${Date.now()}_${blobUrl.split('/').pop()}`,
      original_file_name: blobUrl.split('/').pop() || 'unknown.csv',
      file_size: 0,
      mime_type: 'text/csv',
      processing_status: 'pending',
      blob_url: blobUrl
    }

    const { data: createdRecord, error: uploadError } = await supabase
      .from('data_uploads')
      .insert(uploadRecord)
      .select()
      .single()

    if (uploadError) {
      return NextResponse.json({ 
        error: 'Failed to create upload record',
        details: uploadError 
      }, { status: 500 })
    }

    console.log('📝 Created upload record:', createdRecord.id)

    // Update to processing
    await supabase
      .from('data_uploads')
      .update({ processing_status: 'processing' })
      .eq('id', createdRecord.id)

    // Download and process file
    console.log('⬇️ Downloading file...')
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`)
    }

    const fileContent = await response.text()
    const fileSize = new Blob([fileContent]).size
    console.log(`📄 File: ${fileContent.length} chars, ${fileSize} bytes`)

    // Parse CSV
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) {
      throw new Error('CSV must have header and data rows')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      return row
    })

    console.log(`📊 Parsed: ${dataRows.length} rows, ${headers.length} columns`)

    // Test client database connection
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client DB connection failed: ${connectionTest.error}`)
    }

    // Insert data
    console.log('💾 Inserting data...')
    const insertResult = await ClientDatabaseManager.insertData(profile, dataRows)
    
    if (!insertResult.success) {
      throw new Error(`Insert failed: ${insertResult.error}`)
    }

    // Update record as completed
    await supabase
      .from('data_uploads')
      .update({
        processing_status: 'completed',
        file_size: fileSize,
        rows_processed: dataRows.length,
        columns_processed: headers.length,
        client_database_synced: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', createdRecord.id)

    console.log(`✅ Success: ${dataRows.length} rows inserted`)

    return NextResponse.json({
      success: true,
      uploadId: createdRecord.id,
      file: {
        size: fileSize,
        rows: dataRows.length,
        columns: headers.length
      },
      insertResult,
      message: 'File processed successfully and data inserted into client database'
    })

  } catch (error) {
    console.error('❌ Manual processing error:', error)
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
