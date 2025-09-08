import { NextRequest, NextResponse } from 'next/server'

// Redirect old upload endpoint to new blob upload endpoint
export async function POST(request: NextRequest) {
  console.log('🚨 OLD UPLOAD ENDPOINT CALLED - REDIRECTING TO BLOB')
  console.log('Request URL:', request.url)
  console.log('Timestamp:', new Date().toISOString())
  
  return NextResponse.json({
    error: 'This endpoint has been moved. Please use /api/upload-blob instead.',
    redirect: '/api/upload-blob',
    timestamp: new Date().toISOString()
  }, { status: 301 })
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload endpoint moved to /api/upload-blob',
    redirect: '/api/upload-blob'
  }, { status: 301 })
}
