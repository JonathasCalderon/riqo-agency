import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  console.log('🔍 TEST ENDPOINT CALLED - GET')
  return NextResponse.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    method: 'GET'
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 TEST ENDPOINT CALLED - POST')
  console.log('Request URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      console.log('File received:', {
        name: file?.name,
        size: file?.size,
        type: file?.type
      })
      
      return NextResponse.json({
        message: 'File upload test successful',
        fileInfo: {
          name: file?.name,
          size: file?.size,
          type: file?.type
        },
        timestamp: new Date().toISOString()
      })
    } else {
      const body = await request.text()
      console.log('Body received:', body.substring(0, 100))
      
      return NextResponse.json({
        message: 'POST test successful',
        bodyLength: body.length,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      error: 'Test endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
