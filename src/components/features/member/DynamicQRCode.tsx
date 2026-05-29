'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { QrCode, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Download } from 'lucide-react'
import QRCode from 'qrcode'

interface DynamicQRCodeProps {
  barcode: string
  fullName: string
}

export function DynamicQRCode({ barcode, fullName }: DynamicQRCodeProps) {
  const [qrSrc, setQrSrc] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState<number>(300)
  const [isOpen, setIsOpen] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const generateSecureQR = async () => {
    try {
      const timestamp = Date.now()
      // Generate a dynamic payload: barcode:timestamp
      const payload = `${barcode}:${timestamp}`
      
      const url = await QRCode.toDataURL(payload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#022c22',  // Emerald 950
          light: '#ffffff', // White
        },
      })
      setQrSrc(url)
      setTimeLeft(300) // Reset to 300 seconds (5 minutes)
    } catch (err) {
      console.error('Failed to generate QR Code:', err)
    }
  }

  // Handle countdown and auto-regeneration
  useEffect(() => {
    if (!isOpen) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    generateSecureQR()

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateSecureQR()
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen])

  const handleDownload = () => {
    if (!qrSrc) return
    const link = document.createElement('a')
    link.href = qrSrc
    link.download = `FTL_Gym_QR_${fullName.replace(/\s+/g, '_')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to format remaining time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold gap-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-emerald-500/20">
            <QrCode className="h-5 w-5" />
            <span>Show Gate Access QR</span>
          </Button>
        }
      />

      <DialogContent className="max-w-xs mx-auto border border-emerald-500/20 bg-zinc-950/95 backdrop-blur-2xl text-white rounded-3xl p-6 shadow-2xl shadow-emerald-500/5">
        <DialogHeader className="space-y-1.5 text-center pb-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg font-black tracking-tight text-white">Dynamic Access QR</DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-400 max-w-[200px] mx-auto font-medium">
            Scan at the kiosk camera for gate entry access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-5 py-2">
          {/* Member badge card */}
          <div className="w-full text-center py-2 px-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <h4 className="text-xs font-black text-white truncate max-w-[220px] mx-auto">{fullName}</h4>
            <p className="text-[9px] font-bold text-zinc-500 tracking-widest mt-0.5 uppercase">MEMBER ACCESS</p>
          </div>

          {/* Secure QR Code Frame */}
          <div className="relative p-4 rounded-3xl bg-white shadow-xl shadow-emerald-950/20 flex items-center justify-center border-4 border-emerald-500/10 group">
            {qrSrc ? (
              <img src={qrSrc} alt="Secure QR Code" className="w-48 h-48 rounded-xl" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-zinc-100 rounded-xl">
                <RefreshCw className="h-8 w-8 text-zinc-300 animate-spin" />
              </div>
            )}
            
            {/* Liveness glowing pulse decoration */}
            <div className="absolute -inset-1 rounded-[32px] border-2 border-emerald-500/30 animate-pulse pointer-events-none" />
          </div>

          {/* Download Button */}
          {qrSrc && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-zinc-850 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-[10px] gap-1.5 transition-all w-full"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR Code
            </Button>
          )}

          {/* Dynamic timer indicators */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-zinc-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-400" /> Secure Rotation
              </span>
              <span className="text-emerald-400">Regenerating in {formatTime(timeLeft)}</span>
            </div>
            
            {/* Smooth animated progress line */}
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div 
                style={{ width: `${(timeLeft / 300) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-linear"
              />
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[8px] text-zinc-500 leading-normal max-w-[200px] mx-auto flex items-center justify-center gap-1 font-semibold">
            <ShieldAlert className="h-3 w-3 text-emerald-500 shrink-0" />
            Code automatically refreshes every 5 minutes for secure access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
