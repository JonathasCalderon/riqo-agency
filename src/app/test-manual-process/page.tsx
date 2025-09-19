"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestManualProcessPage() {
  const [blobUrl, setBlobUrl] = useState('https://lqbojxxka82wg1vu.public.blob.vercel-storage.com/junio-septiembre-F5hbH3mNXbPidvt8OYJST6athCxJ9t.csv')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testManualProcess = async () => {
    if (!blobUrl) {
      alert('Please enter a blob URL')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/manual-blob-process', {
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
          <CardTitle>Test Manual Blob Processing</CardTitle>
          <CardDescription>
            Manually trigger the blob processing workflow to test if everything works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="blobUrl" className="text-sm font-medium">
              Blob URL (from your latest upload)
            </label>
            <Input
              id="blobUrl"
              type="url"
              value={blobUrl}
              onChange={(e) => setBlobUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <Button 
            onClick={testManualProcess} 
            disabled={loading || !blobUrl}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Test Manual Processing'}
          </Button>

          {result && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className={`text-lg ${result.status === 200 ? 'text-green-600' : 'text-red-600'}`}>
                  Result (Status: {result.status})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">What this test does:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Downloads the file from Vercel Blob storage</li>
              <li>Creates an upload record in the main database</li>
              <li>Parses the CSV content</li>
              <li>Tests connection to your client Supabase database</li>
              <li>Inserts the data into your "ventas" table</li>
              <li>Updates the upload record as completed</li>
            </ol>
            <p className="mt-2 text-sm text-gray-600">
              If this works, it means the blob upload handler should work too, 
              and the issue is with the onUploadCompleted callback not being triggered.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
