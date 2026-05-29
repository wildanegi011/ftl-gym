import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export default async function proxy(request: NextRequest) {
  // Update session to keep auth cookie active
  const response = await updateSession(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Ignore setting cookies here, we just want to read
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Define public routes
  const isAuthRoute = pathname.startsWith('/register') || pathname.startsWith('/auth')
  const isPublicRoute = 
    pathname === '/' || 
    isAuthRoute || 
    pathname.startsWith('/api/webhooks') || 
    pathname.startsWith('/checkin') || 
    pathname.startsWith('/api/checkins') ||
    pathname.startsWith('/models/')

  // If user is not authenticated and trying to access a protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access login/register
  if (user && isAuthRoute) {
    // Check if they are trying to access /register. If they are, let them through if they don't have a membership
    if (pathname.startsWith('/register')) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('member_id', user.id)
        .maybeSingle()
        
      if (!membership) {
        return response // allow them to access /register to complete onboarding
      }
    }

    // Need to get user role to redirect appropriately
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'member'
    const redirectPath = role === 'admin' 
      ? '/admin' 
      : role === 'trainer' 
      ? '/trainer/schedule' 
      : role === 'pt' 
      ? '/pt/sessions' 
      : '/member/dashboard'
    
    // Don't redirect auth callback
    if (!pathname.startsWith('/auth/callback')) {
      const redirectUrl = new URL(redirectPath, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Route protection based on role
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'member'
    const redirectPath = role === 'admin' 
      ? '/admin' 
      : role === 'trainer' 
      ? '/trainer/schedule' 
      : role === 'pt' 
      ? '/pt/sessions' 
      : '/member/dashboard'

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
    
    if (pathname.startsWith('/trainer') && role !== 'trainer' && role !== 'admin') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    if (pathname.startsWith('/pt') && role !== 'pt' && role !== 'admin') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
    
    if (pathname.startsWith('/member') && role !== 'member' && role !== 'admin') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
