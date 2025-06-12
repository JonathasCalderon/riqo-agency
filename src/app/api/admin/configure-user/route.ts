import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you can modify this logic based on your admin system)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single()

    // Simple admin check - you can modify this
    if (profile?.subscription_plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const {
      userId,
      company,
      client_type,
      client_database_url,
      client_database_anon_key,
      client_database_service_key,
      data_table_name,
      grafana_dashboard_url
    } = await request.json()

    // Validate required fields
    if (!userId || !client_database_url || !client_database_anon_key || !client_database_service_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'User configured successfully',
      profile: {
        id: updatedProfile.id,
        full_name: updatedProfile.full_name,
        company: updatedProfile.company,
        client_type: updatedProfile.client_type,
        has_client_database: !!updatedProfile.client_database_url,
        data_table_name: updatedProfile.data_table_name,
        grafana_dashboard_url: updatedProfile.grafana_dashboard_url
      }
    })

  } catch (error) {
    console.error('Configure user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
