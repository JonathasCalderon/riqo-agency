"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugUploadPage() {
  const [blobUrl, setBlobUrl] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testBlobUpload = async () => {
    if (!blobUrl) {
      alert('Please enter a blob URL')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/debug-blob-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blobUrl })
      })

      const data = await response.json()
      setResult({ status: response.status, data })
    } catch (error) {
      setResult({ 
        status: 'ERROR', 
        data: { error: error instanceof Error ? error.message : 'Unknown error' } 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Blob Upload</CardTitle>
          <CardDescription>
            Test the blob upload and client database insertion process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="blobUrl" className="text-sm font-medium">
              Blob URL (from Vercel Blob Storage)
            </label>
            <Input
              id="blobUrl"
              type="url"
              placeholder="https://lqbojxxka82wg1vu.public.blob.vercel-storage.com/..."
              value={blobUrl}
              onChange={(e) => setBlobUrl(e.target.value)}
            />
          </div>

          <Button 
            onClick={testBlobUpload} 
            disabled={loading || !blobUrl}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Blob Upload Process'}
          </Button>

          {result && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  Result (Status: {result.status})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Upload a file using the normal dashboard upload</li>
              <li>Copy the blob URL from the Vercel Blob Storage dashboard</li>
              <li>Paste it here and click "Test Blob Upload Process"</li>
              <li>This will show you exactly where the process is failing</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
