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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
