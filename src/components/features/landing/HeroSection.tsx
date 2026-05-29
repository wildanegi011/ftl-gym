"use client"

import { Button } from "@/components/ui/button"

import { ArrowRight, Play, Sparkles, Dumbbell, Activity, HeartPulse, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function HeroSection() {
  const [positions, setPositions] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])
  const [isAuthPending, setIsAuthPending] = useState(false)

  const handleJoinNow = async () => {
    setIsAuthPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => prev.map(() => ({
        x: Math.random() * 60 - 30, // Random between -30px and 30px
        y: Math.random() * 60 - 30,
      })))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section id="home" className="relative overflow-hidden bg-white dark:bg-black pt-40 pb-40">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 dark:opacity-20 blur-[120px] bg-gradient-to-b from-emerald-400 via-blue-500 to-transparent rounded-full mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Floating Decorative Icons */}
      <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none overflow-hidden">
        <div
          className="absolute top-[20%] left-[10%] animate-pulse opacity-20 dark:opacity-40 transition-transform duration-[3000ms] ease-in-out"
          style={{ transform: `translate(${positions[0].x}px, ${positions[0].y}px)` }}
        >
          <Dumbbell className="w-16 h-16 text-emerald-500 -rotate-45" />
        </div>
        <div
          className="absolute top-[30%] right-[12%] opacity-20 dark:opacity-40 transition-transform duration-[3500ms] ease-in-out"
          style={{ transform: `translate(${positions[1].x}px, ${positions[1].y}px)`, animation: 'pulse 3s infinite 1s' }}
        >
          <Activity className="w-12 h-12 text-blue-500" />
        </div>
        <div
          className="absolute bottom-[25%] left-[15%] opacity-20 dark:opacity-40 transition-transform duration-[4000ms] ease-in-out"
          style={{ transform: `translate(${positions[2].x}px, ${positions[2].y}px)`, animation: 'pulse 4s infinite 2s' }}
        >
          <HeartPulse className="w-14 h-14 text-rose-500 rotate-12" />
        </div>
        <div
          className="absolute bottom-[20%] right-[15%] opacity-20 dark:opacity-40 transition-transform duration-[3000ms] ease-in-out"
          style={{ transform: `translate(${positions[3].x}px, ${positions[3].y}px)`, animation: 'pulse 3.5s infinite 0.5s' }}
        >
          <Dumbbell className="w-10 h-10 text-emerald-400 rotate-45" />
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6 mt-10">
        <div className="flex flex-col items-center text-center space-y-10 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-1000">
          <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md px-4 py-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm transition-all hover:border-emerald-500/50">
            <Sparkles className="h-4 w-4 text-emerald-500 mr-2" />
            A New Era of Smart Fitness
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[1.1]">
            Build Your Ideal Body <br className="hidden md:block" />
            with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500">FTL Gym</span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl font-medium leading-relaxed">
            World-class premium facilities combined with cutting-edge AI technology to track, guide, and accelerate your physical transformation.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto pt-4">
            <button
              onClick={handleJoinNow}
              disabled={isAuthPending}
              className="inline-flex items-center justify-center h-16 px-10 text-lg font-bold rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 transition-all shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isAuthPending ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : null}
              Join Now <ArrowRight className="ml-3 h-5 w-5" />
            </button>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center h-16 px-10 text-lg font-bold rounded-full border-2 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              <Play className="mr-3 h-5 w-5 text-emerald-500" /> View Plans
            </Link>
          </div>

          <div className="pt-12 flex flex-col items-center gap-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            <div className="flex -space-x-4">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="Member" className="w-12 h-12 rounded-full border-4 border-white dark:border-black object-cover" />
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop" alt="Member" className="w-12 h-12 rounded-full border-4 border-white dark:border-black object-cover" />
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=100&auto=format&fit=crop" alt="Member" className="w-12 h-12 rounded-full border-4 border-white dark:border-black object-cover" />
              <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=100&auto=format&fit=crop" alt="Member" className="w-12 h-12 rounded-full border-4 border-white dark:border-black object-cover" />
              <div className="w-12 h-12 rounded-full border-4 border-white dark:border-black bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs z-10">5k+</div>
            </div>
            <p>Join thousands of other active members</p>
          </div>
        </div>
      </div>
    </section>
  )
}
