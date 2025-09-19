import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing blob handler components...')
    
    // Test 1: Check if we can create a Supabase client
    const supabase = await createClient()
    console.log('✅ Supabase client created')

    // Test 2: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔍 Auth check:', { hasUser: !!user, error: authError })

    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated',
        details: 'Please log in first'
      }, { status: 401 })
    }

    // Test 3: Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('👤 Profile check:', { 
      found: !!profile, 
      error: profileError,
      userId: user.id
    })

    if (profileError || !profile) {
      return NextResponse.json({
        error: 'Profile not found',
        details: profileError,
        userId: user.id
      }, { status: 404 })
    }

    // Test 4: Check client database configuration
    const clientDbConfig = {
      hasUrl: !!profile.client_database_url,
      hasAnonKey: !!profile.client_database_anon_key,
      hasServiceKey: !!profile.client_database_service_key,
      tableName: profile.data_table_name,
      url: profile.client_database_url ? 'CONFIGURED' : 'MISSING'
    }

    console.log('🔧 Client DB config:', clientDbConfig)

    // Test 5: Try to create a test upload record
    const testRecord = {
      user_id: user.id,
      file_name: `test_${Date.now()}.csv`,
      original_file_name: 'test.csv',
      file_size: 100,
      mime_type: 'text/csv',
      processing_status: 'pending',
      blob_url: 'https://test.blob.url/test.csv'
    }

    const { data: uploadRecord, error: uploadError } = await supabase
      .from('data_uploads')
      .insert(testRecord)
      .select()
      .single()

    console.log('📝 Test upload record:', { 
      created: !!uploadRecord, 
      error: uploadError 
    })

    if (uploadError) {
      return NextResponse.json({
        error: 'Failed to create test upload record',
        details: uploadError,
        testRecord
      }, { status: 500 })
    }

    // Clean up test record
    await supabase
      .from('data_uploads')
      .delete()
      .eq('id', uploadRecord.id)

    return NextResponse.json({
      success: true,
      tests: {
        supabaseClient: 'OK',
        authentication: user ? 'OK' : 'FAILED',
        profile: profile ? 'OK' : 'FAILED',
        clientDbConfig,
        uploadRecordCreation: uploadRecord ? 'OK' : 'FAILED'
      },
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        company: profile.company,
        hasClientDb: !!profile.client_database_url
      }
    })

  } catch (error) {
    console.error('🧪 Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
