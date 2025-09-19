import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting blob upload debug')
    
    const { blobUrl } = await request.json()
    console.log('🔍 DEBUG: Received blob URL:', blobUrl)

    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('🔍 DEBUG: Auth error:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 DEBUG: User authenticated:', user.id)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔍 DEBUG: Profile query result:', { 
      found: !!profile, 
      error: profileError,
      hasClientDb: profile?.client_database_url ? 'YES' : 'NO',
      hasServiceKey: profile?.client_database_service_key ? 'YES' : 'NO',
      tableName: profile?.data_table_name
    })

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found', 
        details: profileError 
      }, { status: 404 })
    }

    if (!profile.client_database_url) {
      return NextResponse.json({ 
        error: 'Client database not configured',
        profile: {
          id: profile.id,
          hasUrl: !!profile.client_database_url,
          hasServiceKey: !!profile.client_database_service_key,
          tableName: profile.data_table_name
        }
      }, { status: 400 })
    }

    // Test client database connection
    console.log('🔍 DEBUG: Testing client database connection...')
    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    console.log('🔍 DEBUG: Connection test result:', connectionTest)

    if (!connectionTest.success) {
      return NextResponse.json({ 
        error: 'Client database connection failed',
        details: connectionTest.error,
        profile: {
          url: profile.client_database_url,
          tableName: profile.data_table_name,
          hasServiceKey: !!profile.client_database_service_key
        }
      }, { status: 500 })
    }

    // Try to download the blob
    console.log('🔍 DEBUG: Downloading blob...')
    const response = await fetch(blobUrl)
    console.log('🔍 DEBUG: Blob download response:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to download blob',
        status: response.status,
        statusText: response.statusText
      }, { status: 500 })
    }

    const fileContent = await response.text()
    console.log('🔍 DEBUG: File content length:', fileContent.length)
    console.log('🔍 DEBUG: First 200 chars:', fileContent.substring(0, 200))

    // Parse CSV
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0)
    console.log('🔍 DEBUG: CSV lines:', lines.length)
    
    if (lines.length < 2) {
      return NextResponse.json({ 
        error: 'CSV must have at least header and one data row',
        lines: lines.length
      }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
    console.log('🔍 DEBUG: CSV headers:', headers)

    // Process a few sample rows
    const sampleRows = lines.slice(1, 4).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      return row
    })

    console.log('🔍 DEBUG: Sample rows:', sampleRows)

    // Try to insert sample data
    console.log('🔍 DEBUG: Testing data insertion...')
    const insertResult = await ClientDatabaseManager.insertData(profile, sampleRows)
    console.log('🔍 DEBUG: Insert result:', insertResult)

    return NextResponse.json({
      success: true,
      debug: {
        user: user.id,
        profile: {
          id: profile.id,
          hasClientDb: !!profile.client_database_url,
          hasServiceKey: !!profile.client_database_service_key,
          tableName: profile.data_table_name
        },
        connectionTest,
        file: {
          size: fileContent.length,
          lines: lines.length,
          headers
        },
        sampleRows,
        insertResult
      }
    })

  } catch (error) {
    console.error('🔍 DEBUG: Error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
