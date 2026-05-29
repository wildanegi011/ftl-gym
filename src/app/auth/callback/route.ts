import { NextResponse } from 'next/server'
// The client can be created using the server helper
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect path after auth
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Fetch user profile to get their role
      let { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      // Fetch membership to check if registration is complete
      let { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('member_id', data.user.id)
        .maybeSingle()

      console.log("AUTH CALLBACK - User ID:", data.user.id)
      console.log("AUTH CALLBACK - Profile:", profile)
      console.log("AUTH CALLBACK - Membership:", membership)

      let role = profile?.role || 'member'

      // Check if registration is complete:
      // Staff (admin, trainer, pt) are complete by default.
      // Members are complete if they have completed the registration / membership wizard.
      const isComplete = role === 'admin' || role === 'trainer' || role === 'pt' || (role === 'member' && !!membership?.id)

      if (!isComplete) {
        console.log("AUTH CALLBACK - Redirecting to /register")
        return NextResponse.redirect(`${origin}/register`)
      }

      const dashboardPath = role === 'admin' ? '/admin' : `/${role}/dashboard`
      
      console.log("AUTH CALLBACK - Redirecting to dashboard:", dashboardPath)
      // If "next" was provided and they are fully registered, use it, otherwise dashboard
      if (next !== '/') {
        return NextResponse.redirect(`${origin}${next}`)
      }
      return NextResponse.redirect(`${origin}${dashboardPath}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
