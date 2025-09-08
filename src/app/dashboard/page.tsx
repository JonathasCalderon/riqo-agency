"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, FileText, BarChart3, Settings, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/signin")
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)
    setUploadStatus('Uploading file...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use blob upload for large files
      const uploadUrl = '/api/upload-blob'
      console.log('Uploading to:', uploadUrl)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        cache: 'no-cache' // Prevent caching issues
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('Non-JSON response:', textResponse)
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`)
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Start polling for upload status
      setUploadStatus('Processing file...')
      await pollUploadStatus(result.uploadId)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
      setUploadStatus('')
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
          setUploadSuccess(true)
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
        setUploadError(error instanceof Error ? error.message : 'Failed to check upload status')
        setUploadStatus('')
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
      case 'pending':
        return 'Your file is in the processing queue. This usually takes a few seconds.'
      case 'processing':
        return 'Processing your data... This may take a few minutes for large files.'
      case 'completed':
        return `Successfully processed ${rows_processed || 0} rows. Your dashboards have been updated with the latest data.`
      case 'failed':
        if (metadata?.error_category) {
          switch (metadata.error_category) {
            case 'excel_processing':
              return 'Excel file processing failed. Please ensure your Excel file is not corrupted and try again.'
            case 'csv_parsing':
              return 'CSV parsing failed. Please check that your file has proper headers and is correctly formatted.'
            case 'encoding':
              return 'File encoding issue. Please save your file with UTF-8 encoding and try again.'
            case 'database':
              return 'Database error occurred. Please try again or contact support if the issue persists.'
            case 'size':
              return 'File is too large. Please reduce the file size or split it into smaller files.'
            default:
              return error_message || 'An unexpected error occurred during processing.'
          }
        }
        return error_message || 'Processing failed. Please try again.'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/riqo-logo.svg"
                alt="Riqo"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Upload your CSV files and manage your data visualizations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Data File
                </CardTitle>
                <CardDescription>
                  Upload your CSV or Excel file to update your dashboards and visualizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileUpload} className="space-y-6">
                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-foreground mb-2">
                      Select CSV or Excel File
                    </label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null)
                        setUploadError('')
                        setUploadSuccess(false)
                        setUploadStatus('')
                      }}
                      className="cursor-pointer"
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: CSV, Excel (.xlsx, .xls) - Max size: 50MB
                    </p>
                  </div>
                  
                  {file && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadStatus && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        {uploading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        <p className="text-sm text-blue-800">{uploadStatus}</p>
                      </div>
                      {uploading && (
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        🎉 File uploaded and processed successfully! Your dashboards have been updated.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={!file || uploading}
                    className="w-full"
                  >
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Files Uploaded</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dashboards</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Update</span>
                  <span className="font-semibold text-sm">Never</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Your Dashboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  No dashboards yet. Upload a CSV file to get started!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to start visualizing your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Upload Your Data</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file containing your data. Make sure it has proper headers.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Process & Validate</h3>
                <p className="text-sm text-muted-foreground">
                  We'll process your data and validate the format for optimal visualization.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">View Dashboards</h3>
                <p className="text-sm text-muted-foreground">
                  Access your updated dashboards and visualizations in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
