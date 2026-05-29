export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      
      {/* Subtle Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-emerald-500/20 opacity-50 blur-[100px] animate-pulse duration-[3000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-blue-500/20 opacity-50 blur-[100px] animate-pulse duration-[4000ms]"></div>
      
      <div className="z-10 w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
        {children}
      </div>
    </div>
  )
}
