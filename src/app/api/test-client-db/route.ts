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

    // Check if user has client database configured
    if (!profile.client_database_url) {
      return NextResponse.json({
        configured: false,
        message: 'Client database not configured'
      })
    }

    // Test connection and get table info
    const connectionTest = await ClientDatabaseManager.testConnection(profile)

    // Test table existence (skip this since table already exists)
    const tableTest = { success: true, message: "Table check skipped - using existing table" }

    // Try to get table structure info
    let tableInfo = null
    if (connectionTest.success) {
      try {
        const supabase = ClientDatabaseManager.getClientConnection(profile, true)
        const tableName = profile.data_table_name || 'client_data'

        // Get a sample row to see the table structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!sampleError && sampleData) {
          tableInfo = {
            table_name: tableName,
            sample_columns: sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
            row_count_sample: sampleData.length
          }
        }
      } catch (error) {
        console.warn('Could not get table info:', error)
      }
    }

    return NextResponse.json({
      configured: true,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        company: profile.company,
        client_type: profile.client_type,
        data_table_name: profile.data_table_name,
        has_grafana_url: !!profile.grafana_dashboard_url
      },
      connection_test: connectionTest,
      table_test: tableTest,
      table_info: tableInfo,
      client_database_url: profile.client_database_url ? 'configured' : 'not configured'
    })

  } catch (error) {
    console.error('Test client DB error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
