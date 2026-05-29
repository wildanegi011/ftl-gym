'use client'

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          
        setAuth(session.user, profile?.role || 'member')
      } else {
        setAuth(null, null)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          
        setAuth(session.user, profile?.role || 'member')
      } else {
        setAuth(null, null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setAuth])

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full flex-1 flex flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px]">
          <SidebarTrigger />
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
