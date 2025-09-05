import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Handle internationalization first
  const intlResponse = intlMiddleware(request)

  // If intl middleware wants to redirect, do it
  if (intlResponse && intlResponse.status !== 200) {
    return intlResponse
  }

  let supabaseResponse = intlResponse || NextResponse.next({
    request,
  })

  // Check if Supabase environment variables are properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey ||
      supabaseUrl === 'your_supabase_project_url_here' ||
      supabaseAnonKey === 'your_supabase_anon_key_here' ||
      !supabaseUrl.startsWith('http')) {
    console.warn('Supabase environment variables not properly configured. Skipping auth middleware.')

    // For development, allow access without auth when Supabase is not configured
    if (process.env.NODE_ENV === 'development') {
      return supabaseResponse
    }

    // In production, redirect to a configuration error page
    const pathname = request.nextUrl.pathname
    if (!pathname.includes('/config-error')) {
      const url = request.nextUrl.clone()
      url.pathname = '/config-error'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only check auth if Supabase is properly configured
  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    console.warn('Failed to get user from Supabase:', error)
    // In development, allow access without auth
    if (process.env.NODE_ENV === 'development') {
      return supabaseResponse
    }
  }

  // Check if trying to access dashboard without auth
  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.includes('/dashboard')
  const isAuthRoute = pathname.includes('/auth')

  if (!user && !isAuthRoute && isDashboardRoute) {
    const url = request.nextUrl.clone()
    // Preserve locale in redirect
    const locale = pathname.split('/')[1]
    url.pathname = `/${locale}/auth/signin`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, any images
     */
    '/((?!api|_next/static|_next/image|riqo-logo-simple.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
