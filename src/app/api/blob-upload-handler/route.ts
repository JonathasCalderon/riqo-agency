import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { Profile } from '@/types/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname: string,
        _clientPayload: string | null,
        _multipart: boolean,
      ) => {
        // Generate a client token for the browser to upload the file
        console.log('🔐 Generating token for blob upload:', pathname)

        // Authenticate users before generating the token
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error('Authentication error:', authError)
          throw new Error('Not authorized')
        }

        // Get user profile to check client database configuration
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          throw new Error('User profile not found')
        }

        if (!profile.client_database_url) {
          throw new Error('Client database not configured. Please contact support.')
        }

        return {
          allowedContentTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
          tokenPayload: JSON.stringify({
            userId: user.id,
            userEmail: user.email,
            // Note: user.id and profile.id should be the same
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        console.log('📁 Blob upload completed:', blob.url)
        console.log('🔍 Token payload:', tokenPayload)

        try {
          const payload = JSON.parse(tokenPayload || '{}')
          const { userId } = payload
          console.log('👤 Processing upload for user:', userId)

          if (!userId) {
            throw new Error('Missing user information in token payload')
          }

          // Create Supabase client
          const supabase = await createClient()

          // Get user profile (userId and profile.id should be the same)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          console.log('📋 Profile query result:', { profile: !!profile, error: profileError })

          if (profileError || !profile) {
            console.error('❌ Profile error:', profileError)
            throw new Error(`User profile not found: ${profileError?.message || 'Unknown error'}`)
          }

          console.log('🔧 Profile config:', {
            hasClientDb: !!profile.client_database_url,
            hasServiceKey: !!profile.client_database_service_key,
            tableName: profile.data_table_name
          })

          // Create upload record
          console.log('📝 Creating upload record...')
          const { data: uploadRecord, error: uploadError } = await supabase
            .from('data_uploads')
            .insert({
              user_id: userId,
              file_name: `processed_${Date.now()}_${blob.pathname}`,
              original_file_name: blob.pathname,
              file_size: 0, // Will be updated during processing
              mime_type: 'text/csv',
              processing_status: 'pending',
              blob_url: blob.url
            })
            .select()
            .single()

          if (uploadError) {
            console.error('❌ Failed to create upload record:', uploadError)
            throw new Error(`Failed to create upload record: ${uploadError.message}`)
          }

          console.log('✅ Created upload record:', uploadRecord.id)

          // Start processing the file asynchronously
          console.log('🚀 Starting async file processing...')
          processFileFromBlob(blob.url, profile, uploadRecord.id, supabase).catch(error => {
            console.error('❌ Async processing error:', error)
          })

        } catch (error) {
          console.error('❌ Error in onUploadCompleted:', error)
          // Don't throw here as it would cause the upload to fail
          // The error will be logged and the upload record won't be created
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Blob upload handler error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    )
  }
}

// Import the processing function from the existing upload-blob route
async function processFileFromBlob(blobUrl: string, profile: Profile, uploadId: string, supabaseClient: Awaited<ReturnType<typeof createClient>>) {
  try {
    console.log('🔄 Starting file processing from blob:', blobUrl)
    console.log('👤 Profile info:', {
      id: profile.id,
      hasClientDb: !!profile.client_database_url,
      hasServiceKey: !!profile.client_database_service_key,
      tableName: profile.data_table_name
    })

    // Update status to processing
    console.log('📝 Updating status to processing...')
    await supabaseClient
      .from('data_uploads')
      .update({ processing_status: 'processing' })
      .eq('id', uploadId)

    // Download file from blob
    console.log('⬇️ Downloading file from blob...')
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file from blob: ${response.status}`)
    }

    const fileContent = await response.text()
    const fileSize = new Blob([fileContent]).size
    console.log(`📄 Downloaded file content: ${fileContent.length} characters, ${fileSize} bytes`)

    // Process the CSV content (simplified version)
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Test client database connection
    console.log('🔗 Testing client database connection...')
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    if (!connectionTest.success) {
      throw new Error(`Client database connection failed: ${connectionTest.error}`)
    }
    console.log('✅ Client database connection successful')

    // Process and insert data (this is a simplified version)
    // In a real implementation, you'd want to use the full processing logic
    console.log('📊 Processing CSV data...')
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      return row
    })

    console.log(`📈 Processed ${dataRows.length} rows with ${headers.length} columns`)
    console.log('📋 Headers:', headers)

    // Insert data into client database
    console.log('💾 Inserting data into client database...')
    const insertResult = await ClientDatabaseManager.insertData(profile, dataRows)

    if (!insertResult.success) {
      throw new Error(`Failed to insert data: ${insertResult.error}`)
    }

    console.log(`✅ Successfully inserted ${insertResult.rowsInserted} rows`)

    // Update upload record as completed
    await supabaseClient
      .from('data_uploads')
      .update({
        processing_status: 'completed',
        file_size: fileSize,
        rows_processed: dataRows.length,
        columns_processed: headers.length,
        client_database_synced: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', uploadId)

    console.log(`✅ Processing completed: ${dataRows.length} rows processed`)

  } catch (error) {
    console.error('Processing error:', error)

    // Update upload record as failed
    await supabaseClient
      .from('data_uploads')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', uploadId)

    throw error
  }
}
