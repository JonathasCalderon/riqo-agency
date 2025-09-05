import { createClient } from '@/lib/supabase/server'
import { ClientDatabaseManager } from '@/lib/supabase/client-db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // Get user profile with client configuration
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

    // Test client database connection
    console.log('=== CLIENT DATABASE DEBUG ===')
    console.log('User ID:', user.id)
    console.log('Profile data:', {
      id: profile.id,
      client_database_url: profile.client_database_url,
      data_table_name: profile.data_table_name,
      has_anon_key: !!profile.client_database_anon_key,
      has_service_key: !!profile.client_database_service_key
    })

    const connectionTest = await ClientDatabaseManager.testConnection(profile)
    
    console.log('Connection test result:', connectionTest)

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.error,
        profile_info: {
          has_client_db_url: !!profile.client_database_url,
          has_anon_key: !!profile.client_database_anon_key,
          has_service_key: !!profile.client_database_service_key,
          table_name: profile.data_table_name
        }
      })
    }

    // Try to get table structure
    const tableStructure = await ClientDatabaseManager.getTableStructure(profile)
    
    return NextResponse.json({
      success: true,
      connection_test: connectionTest,
      table_structure: tableStructure,
      profile_info: {
        client_database_url: profile.client_database_url,
        data_table_name: profile.data_table_name,
        has_anon_key: !!profile.client_database_anon_key,
        has_service_key: !!profile.client_database_service_key
      }
    })

  } catch (error) {
    console.error('Debug client DB error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
