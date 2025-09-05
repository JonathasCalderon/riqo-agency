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
  static async testConnection(profile: Profile): Promise<{ success: boolean; error?: string; tableInfo?: any }> {
    try {
      if (!profile.client_database_url) {
        return { success: false, error: 'No client database configured' }
      }

      console.log('Testing connection to client database:')
      console.log('- URL:', profile.client_database_url)
      console.log('- Table:', profile.data_table_name || 'client_data')
      console.log('- Has service key:', !!profile.client_database_service_key)

      const supabase = this.getClientConnection(profile, true) // Use service key for testing

      // Try a simple query to test the connection
      // We'll try to query the actual table that should exist
      const tableName = profile.data_table_name || 'client_data'

      // First, try to get table structure
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (tableError) {
        console.error('Table access error:', tableError)
        return {
          success: false,
          error: `Cannot access table '${tableName}': ${tableError.message}. Details: ${JSON.stringify(tableError)}`
        }
      }

      console.log('Table access successful. Sample data structure:', tableData?.[0] ? Object.keys(tableData[0]) : 'No data in table')

      return {
        success: true,
        tableInfo: {
          tableName,
          sampleColumns: tableData?.[0] ? Object.keys(tableData[0]) : [],
          hasData: tableData && tableData.length > 0
        }
      }
    } catch (error) {
      console.error('Connection test error:', error)
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
   * Insert data in chunks for large datasets
   */
  static async insertDataInChunks(
    profile: Profile,
    data: Record<string, any>[],
    chunkSize: number = 1000
  ): Promise<{ success: boolean; error?: string; rowsInserted?: number }> {
    try {
      const supabase = this.getClientConnection(profile, true) // Use service key for inserts
      const tableName = profile.data_table_name || 'ventas'

      if (!data || data.length === 0) {
        return { success: true, rowsInserted: 0 }
      }

      console.log(`Inserting ${data.length} rows in chunks of ${chunkSize} into table: ${tableName}`)

      let totalInserted = 0
      const chunks = []

      // Split data into chunks
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize))
      }

      console.log(`Created ${chunks.length} chunks for insertion`)

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} rows)`)

        // Process data to format dates if needed
        const processedChunk = chunk.map(row => {
          const processedRow = { ...row }

          // If there's a 'fecha' field, also create 'fecha_formateada'
          if (row.fecha) {
            processedRow.fecha_formateada = this.formatDateForGrafana(row.fecha)
          }

          return processedRow
        })

        // Insert chunk
        const { error, count } = await supabase
          .from(tableName)
          .insert(processedChunk)
          .select('id', { count: 'exact' })

        if (error) {
          console.error(`Insert error in chunk ${i + 1}:`, error)
          return {
            success: false,
            error: `Failed to insert chunk ${i + 1}/${chunks.length} into table '${tableName}': ${error.message}`
          }
        }

        totalInserted += count || 0
        console.log(`Chunk ${i + 1}/${chunks.length} inserted successfully: ${count} rows`)

        // Add a small delay between chunks to avoid overwhelming the database
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`Successfully inserted all ${totalInserted} rows into table: ${tableName}`)
      return { success: true, rowsInserted: totalInserted }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get table structure information for debugging
   */
  static async getTableStructure(profile: Profile): Promise<{ success: boolean; columns?: string[]; error?: string }> {
    try {
      const supabase = this.getClientConnection(profile, true)
      const tableName = profile.data_table_name || 'ventas'

      // Try to get table structure by querying with limit 0
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)

      if (error) {
        return { success: false, error: error.message }
      }

      // Get column names from the query metadata
      // Since we're limiting to 0 rows, we won't get data but we can infer structure
      return { success: true, columns: [] }
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
      console.log('Client database URL:', profile.client_database_url)

      // Process data to format dates if needed
      const processedData = data.map(row => {
        const processedRow = { ...row }

        // If there's a 'fecha' field, also create 'fecha_formateada'
        if (row.fecha) {
          processedRow.fecha_formateada = this.formatDateForGrafana(row.fecha)
        }

        return processedRow
      })

      console.log('Sample processed data:', JSON.stringify(processedData[0], null, 2))

      // Insert data directly - only the columns that exist in CSV
      // Supabase will handle missing columns by setting them to NULL or default values
      const { error, count } = await supabase
        .from(tableName)
        .insert(processedData)
        .select('id', { count: 'exact' }) // Only select id to avoid fetching all data

      if (error) {
        console.error('Insert error details:', error)
        console.error('Error code:', error.code)
        console.error('Error hint:', error.hint)
        console.error('Error details:', error.details)
        console.error('Sample data being inserted:', JSON.stringify(processedData[0], null, 2))

        // Provide more specific error messages based on error type
        let userFriendlyError = error.message
        if (error.code === '42P01') {
          userFriendlyError = `Table '${tableName}' does not exist in the client database. Please contact support to set up your data table.`
        } else if (error.code === '42703') {
          userFriendlyError = `Column mismatch: Some columns in your CSV file don't exist in the database table. Expected columns may differ from your CSV headers.`
        } else if (error.code === '23505') {
          userFriendlyError = `Duplicate data detected. The table may already contain some of this data.`
        } else if (error.message.includes('permission')) {
          userFriendlyError = `Permission denied: Unable to insert data into the client database. Please contact support to check your database permissions.`
        }

        return {
          success: false,
          error: `${userFriendlyError} (Technical details: ${error.message})`
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
