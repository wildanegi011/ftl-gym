import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function getRedirectUrl() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `${origin}/auth/callback`
    }
  }
  return 'https://ftl-gym.netlify.app/auth/callback'
}

export function getRedirectPage(path: string) {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `${origin}${path}`
    }
  }
  return `https://ftl-gym.netlify.app${path}`
}
