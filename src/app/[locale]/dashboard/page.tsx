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
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus(t('fileUploadedSuccessfully'))
        // Poll for processing status
        pollUploadStatus(result.uploadId)
        setFile(null)
      } else {
        throw new Error(result.error || t('uploadFailed'))
      }
    } catch (error) {
      setUploadStatus(`${t('uploadFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`)
      setTimeout(() => setUploadStatus(''), 5000)
    } finally {
      setUploading(false)
    }
  }

  const pollUploadStatus = async (uploadId: string) => {
    const maxAttempts = 30 // 5 minutes max
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/upload/status/${uploadId}`)
        const result = await response.json()

        if (response.ok) {
          const statusText = result.rows_processed
            ? `${result.rows_processed} ${t('rows')}, ${result.columns_processed || 0} ${t('columns')}`
            : t('processing')

          setUploadStatus(`${t('status')}: ${result.status} (${statusText})`)

          if (result.status === 'completed') {
            const syncStatus = result.client_database_synced ? `✅ ${t('syncedToDashboard')}` : `⚠️ ${t('syncPending')}`
            setUploadStatus(`✅ ${t('uploadCompletedSuccessfully')} ${syncStatus}`)
            setTimeout(() => setUploadStatus(''), 8000)
            return
          } else if (result.status === 'failed') {
            setUploadStatus(`❌ ${t('uploadFailedError')}: ${result.error_message || t('unknownError')}`)
            setTimeout(() => setUploadStatus(''), 10000)
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // Poll every 10 seconds
        } else {
          setUploadStatus(`⏱️ ${t('uploadTakingLonger')}`)
          setTimeout(() => setUploadStatus(''), 10000)
        }
      } catch (error) {
        console.error('Error polling upload status:', error)
        setUploadStatus(t('errorCheckingUploadStatus'))
        setTimeout(() => setUploadStatus(''), 5000)
      }
    }

    poll()
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
