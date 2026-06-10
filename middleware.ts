import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if (process.env.NEXT_EXPORT === 'true') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
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

  const pathname = request.nextUrl.pathname

  // 1. Always allow the auth callback to run
  if (pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // 2. Always allow the update-password page
  if (pathname === '/update-password') {
    return supabaseResponse
  }

  // 3. Bypass auth check for API routes to avoid redundant Auth API requests and save egress
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // 3. Protect /dashboard — redirect unauthenticated users to login
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Protect /admin routes — redirect unauthenticated users to admin login
  if (!user && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // 5. Redirect logged-in users away from landing/login/signup
  if (user && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api/public-health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
