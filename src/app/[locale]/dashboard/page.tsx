"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, FileText, BarChart3, Settings } from "lucide-react"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'

function DashboardContent() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const { user, signOut } = useAuth()
  const t = useTranslations('dashboard')

  const handleSignOut = async () => {
    await signOut()
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    try {
      // Here you would implement the actual file upload logic
      // For now, we'll just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Reset form
      setFile(null)
      alert("File uploaded successfully! (This is a demo)")
    } catch (error) {
      alert("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
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
                width={150}
                height={50}
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src="/riqo-logo-light.svg"
                alt="Riqo"
                width={150}
                height={50}
                className="h-8 w-auto hidden dark:block"
              />
            </Link>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t('welcome')}, {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
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
                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-foreground mb-2">
                      {t('selectFile')}
                    </label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
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

                  <Button
                    type="submit"
                    disabled={!file || uploading}
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
