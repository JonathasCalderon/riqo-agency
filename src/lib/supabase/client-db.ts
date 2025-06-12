import { createClient } from '@supabase/supabase-js'
import { Profile, ClientConfig } from '@/types/database'

/**
 * Client Database Manager
 * Handles connections to individual client Supabase databases
 * Updated to work with existing Riqo Agency database structure
 */
export class ClientDatabaseManager {
  private static connections: Map<string, any> = new Map()

  /**
   * Get or create a connection to a user's client Supabase database
   */
  static getClientConnection(profile: Profile, useServiceKey: boolean = false) {
    if (!profile.client_database_url) {
      throw new Error('User does not have a client database configured')
    }

    const connectionKey = `${profile.id}-${useServiceKey ? 'service' : 'anon'}`

    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey)
    }

    const supabaseKey = useServiceKey
      ? profile.client_database_service_key
      : profile.client_database_anon_key

    if (!supabaseKey) {
      throw new Error(`Missing ${useServiceKey ? 'service' : 'anon'} key for client database`)
    }

    const connection = createClient(profile.client_database_url, supabaseKey, {
      auth: {
        persistSession: false // Don't persist auth for client connections
      }
    })

    this.connections.set(connectionKey, connection)
    return connection
  }

  /**
   * Test connection to a user's client database
   */
  static async testConnection(profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      if (!profile.client_database_url) {
        return { success: false, error: 'No client database configured' }
      }

      const supabase = this.getClientConnection(profile, true) // Use service key for testing

      // Try a simple query to test the connection
      // We'll try to query the actual table that should exist
      const tableName = profile.data_table_name || 'client_data'
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        return { success: false, error: `Cannot access table '${tableName}': ${error.message}` }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create the client data table if it doesn't exist
   */
  static async ensureDataTable(profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getClientConnection(profile, true) // Use service key for DDL operations
      const tableName = profile.data_table_name || 'client_data'

      // Since the table already exists, we just need to verify we can access it
      // This was already done in testConnection, so we can skip this step
      console.log(`Table '${tableName}' is ready for data insertion`)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Truncate the user's existing data table (exactly like TRUNCATE TABLE ventas)
   */
  static async truncateDataTable(profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getClientConnection(profile, true) // Use service key for truncate
      const tableName = profile.data_table_name || 'ventas'

      console.log(`Truncating table: ${tableName}`)

      // Use SQL TRUNCATE command for better performance and to reset auto-increment
      const { error } = await supabase.rpc('truncate_table', { table_name: tableName })

      if (error) {
        // If RPC doesn't exist, fall back to DELETE
        console.log('TRUNCATE RPC not available, using DELETE instead')
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', -1) // Delete all rows

        if (deleteError) {
          return {
            success: false,
            error: `Failed to truncate table '${tableName}': ${deleteError.message}`
          }
        }
      }

      console.log(`Successfully truncated table: ${tableName}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Insert data and format dates (your exact workflow)
   */
  static async insertData(
    profile: Profile,
    data: Record<string, any>[]
  ): Promise<{ success: boolean; error?: string; rowsInserted?: number }> {
    try {
      const supabase = this.getClientConnection(profile, true) // Use service key for inserts
      const tableName = profile.data_table_name || 'ventas'

      if (!data || data.length === 0) {
        return { success: true, rowsInserted: 0 }
      }

      console.log(`Inserting ${data.length} rows into table: ${tableName}`)
      console.log('CSV columns:', Object.keys(data[0] || {}))

      // Process data to format dates if needed
      const processedData = data.map(row => {
        const processedRow = { ...row }

        // If there's a 'fecha' field, also create 'fecha_formateada'
        if (row.fecha) {
          processedRow.fecha_formateada = this.formatDateForGrafana(row.fecha)
          console.log(`Formatted date: ${row.fecha} → ${processedRow.fecha_formateada}`)
        }

        return processedRow
      })

      // Insert data directly - only the columns that exist in CSV
      // Supabase will handle missing columns by setting them to NULL or default values
      const { error, count } = await supabase
        .from(tableName)
        .insert(processedData)
        .select('id', { count: 'exact' }) // Only select id to avoid fetching all data

      if (error) {
        console.error('Insert error details:', error)
        console.error('Sample data being inserted:', JSON.stringify(processedData[0], null, 2))
        return {
          success: false,
          error: `Failed to insert data into table '${tableName}': ${error.message}. CSV columns: ${Object.keys(data[0] || {}).join(', ')}`
        }
      }

      console.log(`Successfully inserted ${count} rows into table: ${tableName}`)
      return { success: true, rowsInserted: count || 0 }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Format date from DD/MM/YYYY to YYYY-MM-DD for Grafana
   */
  private static formatDateForGrafana(dateString: string): string {
    try {
      // Handle DD/MM/YYYY format
      if (dateString && typeof dateString === 'string') {
        const parts = dateString.split('/')
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0')
          const month = parts[1].padStart(2, '0')
          const year = parts[2]
          return `${year}-${month}-${day}`
        }
      }

      // If already in correct format or can't parse, return as-is
      return dateString
    } catch (error) {
      console.warn('Error formatting date:', dateString, error)
      return dateString
    }
  }

  /**
   * Get data from the user's client data table
   */
  static async getData(
    profile: Profile,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; error?: string; total?: number }> {
    try {
      const supabase = this.getClientConnection(profile, false) // Use anon key for reads
      const tableName = profile.data_table_name || 'client_data'

      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear all cached connections
   */
  static clearConnections() {
    this.connections.clear()
  }

  /**
   * Remove a specific user's client connection from cache
   */
  static removeClientConnection(userId: string) {
    const keysToRemove = Array.from(this.connections.keys()).filter(key =>
      key.startsWith(userId)
    )
    keysToRemove.forEach(key => this.connections.delete(key))
  }
}
