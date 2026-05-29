"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Loader2 } from "lucide-react"
import { createClient, getRedirectUrl } from "@/lib/supabase/client"

const memberships = [
  {
    id: "basic",
    name: "Basic",
    price: 350000,
    features: ["Limited Gym Access (Off-peak)", "Standard Facilities", "1x Free Consultation", "Daily Locker"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 600000,
    popular: true,
    features: ["Unlimited 24/7 Gym Access", "All Aerobic Classes Included", "Face Check-in Technology", "Exclusive Locker", "Sauna & Spa Access"],
  },
  {
    id: "vip",
    name: "VIP",
    price: 900000,
    features: ["All Premium Features", "Private Monthly Locker", "Priority Class Booking", "VIP Lounge Access", "Free Towel & Premium Drinks"],
  }
]

export function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly")
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    const calculatedPrice = billingInterval === "annual" ? price * 10 : price // 2 months free for annual
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(calculatedPrice)
  }

  const handleRegister = async (membershipType: string) => {
    setLoadingPlan(membershipType)
    // Store selected plan in localStorage so /register can pick it up after OAuth
    localStorage.setItem("ftl_selected_plan", JSON.stringify({ membership_type: membershipType, interval: billingInterval }))

    const supabase = createClient()
    // Check if already logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in → go to register directly
      const params = new URLSearchParams()
      params.set("membership_type", membershipType)
      params.set("interval", billingInterval)
      window.location.href = `/register?${params.toString()}`
      return
    }

    // Not logged in → Google OAuth, callback will handle redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) {
      console.error(error.message)
      setLoadingPlan(null)
    }
  }

  return (
    <section id="pricing" className="py-32 bg-white dark:bg-zinc-950 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-6">
            <Sparkles className="w-4 h-4 mr-2" /> Transparent Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Invest In Your Health</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
            Choose a plan that fits your goals and commitment. No hidden fees.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="inline-flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${billingInterval === "monthly" ? "bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("annual")}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center ${billingInterval === "annual" ? "bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                Annually 
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${billingInterval === "annual" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30"}`}>
                  Save 2 Months
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {memberships.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative flex flex-col p-10 rounded-[2.5rem] transition-all duration-500 ${plan.popular ? 'bg-zinc-900 dark:bg-zinc-900 text-white shadow-2xl scale-105 z-10 border border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-2'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tighter">{formatPrice(plan.price)}</span>
                  <span className={`text-base font-medium ${plan.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>
              
              <div className={`h-px w-full mb-8 ${plan.popular ? 'bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
              
              <ul className="flex-1 space-y-5 mb-10">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={`mt-1 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className={`font-medium ${plan.popular ? 'text-zinc-300' : 'text-zinc-700 dark:text-zinc-300'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => handleRegister(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full h-14 rounded-2xl text-base font-bold transition-all ${plan.popular ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 shadow-xl hover:-translate-y-1' : 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-emerald-500/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPlan === plan.id ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                {loadingPlan === plan.id ? 'Menghubungkan...' : `Choose ${plan.name} Plan`}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
