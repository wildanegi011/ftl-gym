"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Loader2 } from "lucide-react"
import { createClient, getRedirectUrl } from "@/lib/supabase/client"

export function HeaderSection() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const [isAuthPending, setIsAuthPending] = useState(false)

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)

      // Scroll spy logic
      const sections = navLinks.map(link => link.href.substring(1))
      let current = "home"

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          // If the section's top is within the viewport's top half, it's active
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section
          }
        }
      }

      setActiveSection(current)
    }

    window.addEventListener("scroll", handleScroll)
    // Initial check
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleJoinNow = async () => {
    setIsAuthPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error(error.message)
      setIsAuthPending(false)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md ${isScrolled
          ? "bg-white/90 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 py-3 shadow-lg shadow-black/5"
          : "bg-white/60 dark:bg-zinc-950/60 border-b border-zinc-200/50 dark:border-zinc-800/50 py-5"
        }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="#home" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-black text-xl leading-none">F</span>
          </div>
          <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">
            FTL Gym
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${activeSection === link.href.substring(1)
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                }`}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleJoinNow}
            disabled={isAuthPending}
            className="inline-flex items-center justify-center h-10 px-6 text-sm font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {isAuthPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sign In
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-zinc-600 dark:text-zinc-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 shadow-lg flex flex-col gap-4 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`p-3 text-base font-bold rounded-xl ${activeSection === link.href.substring(1)
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleJoinNow();
            }}
            disabled={isAuthPending}
            className="p-3 text-base font-bold text-center text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            {isAuthPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
            Sign In
          </button>
        </div>
      )}
    </header>
  )
}
