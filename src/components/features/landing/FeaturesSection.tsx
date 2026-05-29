import { Activity, Dumbbell, ScanFace, CalendarCheck, ShieldCheck, Zap } from "lucide-react"

const features = [
  {
    title: "AI Face Check-in",
    description: "Enter the gym in seconds without physical cards using AI-powered facial recognition technology.",
    icon: ScanFace,
  },
  {
    title: "Premium Equipment",
    description: "Enjoy access to the latest international standard fitness equipment for all your workout needs.",
    icon: Dumbbell,
  },
  {
    title: "AI Progress Tracking",
    description: "Our smart system helps monitor performance and suggests daily workout routines.",
    icon: Activity,
  },
  {
    title: "Flexible Class Booking",
    description: "Book yoga, HIIT, or Zumba classes directly from the app in one click.",
    icon: CalendarCheck,
  },
  {
    title: "Guaranteed Security",
    description: "Facilities equipped with secure lockers, 24/7 security, and advanced biometric verification.",
    icon: ShieldCheck,
  },
  {
    title: "Personal Trainer Sessions",
    description: "Boost your results with intensive guidance from our certified personal trainers.",
    icon: Zap,
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 bg-white dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-900 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(16,185,129,0.03),transparent)] pointer-events-none" />
      
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Why Choose FTL Gym?</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg md:text-xl">
            We merge the comfort of world-class facilities with smart technology to ensure you hit your fitness targets effectively and measurably.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="group p-10 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-2 hover:border-emerald-500/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                <feature.icon className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">{feature.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
