import { createClient } from '@/lib/supabase/server'
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

    // Get user's profile (which contains client configuration)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        company,
        client_type,
        client_database_url,
        data_table_name,
        grafana_dashboard_url,
        subscription_plan,
        subscription_status,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // In this simplified model, each user has one client configuration
    const clients = profile ? [{
      id: profile.id,
      name: profile.full_name || 'Unnamed Client',
      company: profile.company,
      client_type: profile.client_type,
      has_client_database: !!profile.client_database_url,
      data_table_name: profile.data_table_name,
      grafana_dashboard_url: profile.grafana_dashboard_url,
      subscription_plan: profile.subscription_plan,
      subscription_status: profile.subscription_status,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    }] : []

    return NextResponse.json({
      clients,
      total: clients.length
    })

  } catch (error) {
    console.error('Clients API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      company,
      client_type,
      client_database_url,
      client_database_anon_key,
      client_database_service_key,
      data_table_name,
      grafana_dashboard_url
    } = body

    // Validate required fields for client database setup
    if (!client_database_url || !client_database_anon_key || !client_database_service_key) {
      return NextResponse.json(
        { error: 'Missing required client database configuration fields' },
        { status: 400 }
      )
    }

    // Update user profile with client configuration
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        company,
        client_type: client_type || 'business',
        client_database_url,
        client_database_anon_key,
        client_database_service_key,
        data_table_name: data_table_name || 'client_data',
        grafana_dashboard_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update client configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Client configuration updated successfully',
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
