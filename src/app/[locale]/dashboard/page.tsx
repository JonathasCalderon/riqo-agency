"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, FileText, BarChart3 } from "lucide-react"
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Navigation } from '@/components/navigation'

function DashboardContent() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [clientConfig, setClientConfig] = useState<any>(null)
  const [hasClientDatabase, setHasClientDatabase] = useState(false)
  const { user } = useAuth()
  const t = useTranslations('dashboard')

  // Load user's client configuration on component mount
  useEffect(() => {
    loadClientConfig()
  }, [user])

  const loadClientConfig = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        if (data.clients?.length > 0) {
          const config = data.clients[0]
          setClientConfig(config)
          setHasClientDatabase(config.has_client_database)
        }
      }
    } catch (error) {
      console.error('Error loading client config:', error)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    if (!hasClientDatabase) {
      setUploadStatus(`❌ ${t('clientDatabaseNotConfigured')}`)
      setTimeout(() => setUploadStatus(''), 10000)
      return
    }

    setUploading(true)
    setUploadStatus(t('uploadingFile'))

    try {
      // For large files, use the blob upload flow to avoid Vercel limits
      console.log('🚀 BLOB UPLOAD: Starting upload for file:', file.name, file.size)

      // Step 1: Get upload URL from our API
      setUploadStatus(t('uploadingFile'))
      const uploadUrlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size
        })
      })

      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, blobUrl, uploadId } = await uploadUrlResponse.json()
      console.log('📝 Got upload URL:', uploadUrl)

      // Step 2: Upload directly to blob storage
      setUploadStatus(t('uploadingFile'))
      const blobUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      })

      if (!blobUploadResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }

      console.log('✅ File uploaded to blob storage')

      // Step 3: Trigger processing
      setUploadStatus(t('processingFile'))
      const processResponse = await fetch('/api/process-blob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl,
          uploadId,
          filename: file.name
        })
      })

      if (!processResponse.ok) {
        throw new Error('Failed to start file processing')
      }

      const result = await processResponse.json()
      console.log('✅ Processing started:', result)

      // Step 4: Poll for completion
      setUploadStatus(t('processingFile'))
      await pollUploadStatus(uploadId)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`${t('uploadFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`)
      setTimeout(() => setUploadStatus(''), 5000)
    } finally {
      setUploading(false)
    }
  }

  const pollUploadStatus = async (uploadId: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/upload-blob/status/${uploadId}`)
        const status = await response.json()

        if (!response.ok) {
          throw new Error(status.error || 'Failed to check upload status')
        }

        const statusMessage = getStatusMessage(status.status)
        const detailedMessage = getDetailedStatusMessage(status)
        setUploadStatus(detailedMessage || statusMessage)

        if (status.status === 'completed') {
          setUploadStatus(getDetailedStatusMessage(status))
          setFile(null)
          return
        } else if (status.status === 'failed') {
          throw new Error(getDetailedStatusMessage(status) || status.error_message || 'Upload processing failed')
        } else if (status.status === 'processing' || status.status === 'pending') {
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000) // Poll every 5 seconds
          } else {
            throw new Error('Upload timeout - processing is taking too long')
          }
        }
      } catch (error) {
        setUploadStatus(`${t('uploadFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`)
        setTimeout(() => setUploadStatus(''), 5000)
      }
    }

    await poll()
  }

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳ Upload queued for processing...'
      case 'processing': return '⚙️ Processing file and updating database...'
      case 'completed': return '✅ Upload completed successfully!'
      case 'failed': return '❌ Upload failed'
      default: return '🔍 Checking status...'
    }
  }

  const getDetailedStatusMessage = (statusData: any): string => {
    if (!statusData) return ''

    const { status, rows_processed, error_message, metadata } = statusData

    switch (status) {
      case 'completed':
        const rowsText = rows_processed ? `${rows_processed} rows processed` : ''
        const syncText = statusData.client_database_synced ? '✅ Synced to dashboard' : '⚠️ Sync pending'
        return `✅ Upload completed successfully! ${rowsText} ${syncText}`

      case 'failed':
        return `❌ Upload failed: ${error_message || 'Unknown error'}`

      case 'processing':
        if (metadata?.current_step) {
          return `⚙️ ${metadata.current_step}${rows_processed ? ` (${rows_processed} rows)` : ''}`
        }
        return `⚙️ Processing file${rows_processed ? ` (${rows_processed} rows processed)` : ''}...`

      case 'pending':
        return '⏳ Upload queued for processing...'

      default:
        return ''
    }
  }



  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('description')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {t('welcome')}, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  {t('uploadCsv')}
                </CardTitle>
                <CardDescription>
                  {t('uploadDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileUpload} className="space-y-6">
                  {/* Client Configuration Status */}
                  {clientConfig && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hasClientDatabase ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <div>
                          <p className="font-medium">
                            {clientConfig.name || t('yourAccount')}
                            {clientConfig.company && ` - ${clientConfig.company}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {hasClientDatabase
                              ? `✅ ${t('databaseConfigured')}`
                              : `⚠️ ${t('databaseNotConfigured')}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-foreground mb-2">
                      {t('selectFile')}
                    </label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('supportsFiles')}
                    </p>
                  </div>

                  {file && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Status */}
                  {uploadStatus && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">{uploadStatus}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!file || uploading || !hasClientDatabase}
                    className="w-full"
                  >
                    {uploading ? t('uploading') : t('uploadButton')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('quickStats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('filesUploaded')}</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dashboards')}</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('lastUpdate')}</span>
                  <span className="font-semibold text-sm">{t('never')}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  {t('yourDashboards')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('noDashboards')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('gettingStarted')}</CardTitle>
            <CardDescription>
              {t('gettingStartedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">{t('step1')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('step1Desc')}
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">{t('step2')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('step2Desc')}
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">{t('step3')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('step3Desc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
