'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Home, Users, Settings, Activity, Calendar, FileText, Dumbbell, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuthStore } from "@/stores/auth.store"

// We no longer use mock auth state

const menus = {
  admin: [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Members", url: "/admin/members", icon: Users },
    { title: "Classes", url: "/admin/classes", icon: Calendar },
    { title: "Trainers", url: "/admin/trainers", icon: Dumbbell },
    { title: "Subscriptions", url: "/admin/subscriptions", icon: FileText },
    { title: "Payments", url: "/admin/payments", icon: Wallet },
  ],
  trainer: [
    { title: "Dashboard", url: "/trainer/schedule", icon: Home },
    { title: "Classes", url: "/trainer/classes", icon: Calendar },
  ],
  pt: [
    { title: "Dashboard", url: "/pt/dashboard", icon: Home },
    { title: "Sessions", url: "/pt/sessions", icon: Calendar },
  ],
  member: [
    { title: "Dashboard", url: "/member/dashboard", icon: Home },
    { title: "Classes", url: "/member/classes", icon: Calendar },
    { title: "Personal Trainers", url: "/member/pt", icon: Dumbbell },
    { title: "Sesi PT Saya", url: "/member/pt/packages", icon: Activity },
    { title: "Subscription", url: "/member/subscription", icon: FileText },
    { title: "Payments", url: "/member/payments", icon: Wallet },
  ],
}

export function AppSidebar() {
  const pathname = usePathname()
  const { role } = useAuthStore()
  
  // Determine role from pathname prefix to ensure instant, zero-flicker routing sync.
  // Falls back to Zustand store role if pathname is neutral.
  let currentRole: 'admin' | 'trainer' | 'pt' | 'member' = role || 'member'
  if (pathname?.startsWith('/admin')) {
    currentRole = 'admin'
  } else if (pathname?.startsWith('/trainer')) {
    currentRole = 'trainer'
  } else if (pathname?.startsWith('/pt')) {
    currentRole = 'pt'
  } else if (pathname?.startsWith('/member')) {
    currentRole = 'member'
  }

  const roleMenus = menus[currentRole] || menus.member

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>FTL Gym AI</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roleMenus.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url}
                    render={<Link href={item.url} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
