"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "How does the Face Check-in technology work?",
    answer: "Our system uses advanced AI facial recognition algorithms that map your facial structure. When you arrive at the gym, simply stand in front of the scanner, the system will perform liveness detection for security, and the doors will open automatically within 1-2 seconds without needing a physical card."
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer: "Yes, you can cancel your auto-renewal at any time through the Profile page in the app. Your subscription will remain active until the end of your current billing period."
  },
  {
    question: "What is the difference between Premium and VIP memberships?",
    answer: "The VIP membership includes all Premium features plus priority access for class bookings, a private monthly locker (so you can leave your shoes/belongings at the gym), VIP Lounge access, and complimentary towels and premium drinks upon every visit."
  },
  {
    question: "Can I hire a Personal Trainer if I only choose the Basic plan?",
    answer: "Absolutely! After signing up for any membership type (Basic, Premium, or VIP), you still have the freedom to purchase Personal Trainer session packages at any time through the member dashboard."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept various payment methods via Xendit, including Virtual Accounts (BCA, Mandiri, BNI, etc.), QRIS, E-Wallets (GoPay, OVO, DANA, ShopeePay), and Credit/Debit Cards with Visa/Mastercard logos."
  }
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-32 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Frequently Asked Questions</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Still unsure? Find answers to the questions most commonly asked by our prospective members.
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            
            return (
              <div 
                key={idx} 
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${isOpen ? 'bg-white dark:bg-zinc-950 border-emerald-500/50 shadow-md' : 'bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30'}`}
              >
                <button
                  className="flex w-full items-center justify-between p-6 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{faq.question}</span>
                  <div className={`ml-4 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isOpen ? 'bg-emerald-500 text-white rotate-180' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden px-6 text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
                    {faq.answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
