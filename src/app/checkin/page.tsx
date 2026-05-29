'use client'

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  QrCode, Camera, Volume2, VolumeX, Loader2, CheckCircle, XCircle,
  ArrowLeft, Scan, ShieldCheck, Zap, Smile, CalendarDays, Dumbbell, User, Mic, MicOff, MessageCircle, BotMessageSquare, RefreshCw
} from "lucide-react"
import { BrowserMultiFormatReader } from "@zxing/browser"

let faceapi: any = null

export default function CheckinKioskPage() {
  const [mode, setMode] = useState<"menu" | "barcode" | "face">("menu")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [faceStatus, setFaceStatus] = useState("Loading AI Models...")
  const [barcodeStatus, setBarcodeStatus] = useState("Loading scanner camera...")
  const [smileDetected, setSmileDetected] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [checkedInMember, setCheckedInMember] = useState<any>(null)
  
  // Barcode specific state
  const [showManualInput, setShowManualInput] = useState(false)
  const [cameraTrigger, setCameraTrigger] = useState(0)

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false)
  const [voiceQuery, setVoiceQuery] = useState("")
  const [assistantReply, setAssistantReply] = useState("")
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([])
  const recognitionRef = useRef<any>(null)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const detectRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  
  // Ref to hold the ZXing controls
  const qrReaderControlsRef = useRef<any>(null)

  const speak = useCallback((text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-US"; u.rate = 1.0; u.pitch = 1.0
    window.speechSynthesis.speak(u)
  }, [soundEnabled])

  // Load face-api models once
  useEffect(() => {
    const load = async () => {
      try {
        if (typeof window !== 'undefined' && !faceapi) {
          faceapi = await import('@vladmandic/face-api')
        }
        if (!faceapi) return
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ])
        setModelsReady(true)
      } catch (err) {
        console.error('Failed to load face-api models', err)
        setFaceStatus("Failed to load face AI models.")
      }
    }
    load()
  }, [])

  const stopCamera = useCallback(() => {
    // Stop the QR code reader if it's active
    if (qrReaderControlsRef.current) {
      try {
        qrReaderControlsRef.current.stop()
      } catch (err) {
        console.error("Failed to stop QR reader:", err)
      }
      qrReaderControlsRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (detectRef.current) cancelAnimationFrame(detectRef.current)
    animRef.current = null
    detectRef.current = null
    processingRef.current = false
  }, [])

  const resetKiosk = useCallback(() => {
    stopCamera()
    setMode("menu"); setStatus("idle"); setStatusMsg("")
    setBarcodeInput(""); setFaceStatus("Loading AI Models...")
    setBarcodeStatus("Loading scanner camera...")
    setSmileDetected(false); setCheckedInMember(null)
    setShowManualInput(false)
    // Reset voice assistant
    setIsListening(false); setVoiceQuery(""); setAssistantReply(""); setAssistantLoading(false)
    setChatHistory([])
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
    if (resetTimerRef.current) { clearTimeout(resetTimerRef.current); resetTimerRef.current = null }
  }, [stopCamera])

  // Extend reset timer when interacting with voice assistant
  const extendResetTimer = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => resetKiosk(), 30000) // 30s idle auto-reset
  }, [resetKiosk])

  // Use ref to avoid stale closure for checkedInMember
  const checkedInMemberRef = useRef<any>(null)
  useEffect(() => {
    checkedInMemberRef.current = checkedInMember
  }, [checkedInMember])

  // Voice Assistant: Send query to API (defined BEFORE startListening)
  const askAssistant = useCallback(async (query: string) => {
    const member = checkedInMemberRef.current
    if (!member?.member_id && !member?.id) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Member data not available. Please try again.' }])
      return
    }
    setAssistantLoading(true)
    extendResetTimer()

    const memberId = member.member_id || member.id
    setChatHistory(prev => [...prev, { role: 'user', text: query }])

    try {
      const res = await fetch('/api/checkins/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, query })
      })
      const data = await res.json()
      const answer = data.answer || data.error || 'Sorry, an error occurred.'
      setAssistantReply(answer)
      setChatHistory(prev => [...prev, { role: 'assistant', text: answer }])
      speak(answer)
    } catch {
      const errorMsg = 'Sorry, unable to process your question at this moment.'
      setAssistantReply(errorMsg)
      setChatHistory(prev => [...prev, { role: 'assistant', text: errorMsg }])
    } finally {
      setAssistantLoading(false)
    }
  }, [speak, extendResetTimer])

  // Voice Assistant: Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'This browser does not support voice recognition. Please use Google Chrome or tap the query buttons below.' }])
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error)
      setIsListening(false)
      if (e.error === 'not-allowed') {
        setChatHistory(prev => [...prev, { role: 'assistant', text: 'Microphone access denied. Please allow microphone access in your browser settings.' }])
      }
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setVoiceQuery(transcript)
      askAssistant(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
    extendResetTimer()
  }, [askAssistant, extendResetTimer])

  // Mesh overlay animation
  const startMesh = useCallback((isBarcode = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = 480; canvas.height = 480
    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, 480, 480); frame++
      const bs = 240, x = 120, y = 120
      
      const themeColor = isBarcode ? "rgba(16,185,129,0.85)" : "rgba(16,185,129,0.85)"
      const softColor = isBarcode ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.3)"
      const laserColor = isBarcode ? "rgba(239,68,68,0.8)" : "rgba(16,185,129,0.7)" // red laser for scanner

      ctx.strokeStyle = softColor; ctx.lineWidth = 1.5
      ctx.strokeRect(x, y, bs, bs)
      ctx.strokeStyle = themeColor; ctx.lineWidth = 3.5
      const corners = [
        [[x-2,y+25],[x-2,y-2],[x+25,y-2]],
        [[x+bs+2,y+25],[x+bs+2,y-2],[x+bs-25,y-2]],
        [[x-2,y+bs-25],[x-2,y+bs+2],[x+25,y+bs+2]],
        [[x+bs+2,y+bs-25],[x+bs+2,y+bs+2],[x+bs-25,y+bs+2]],
      ]
      corners.forEach(c => { ctx.beginPath(); ctx.moveTo(c[0][0],c[0][1]); ctx.lineTo(c[1][0],c[1][1]); ctx.lineTo(c[2][0],c[2][1]); ctx.stroke() })
      
      const sY = y + (Math.sin(frame*0.04)+1)*(bs/2)
      ctx.strokeStyle = laserColor; ctx.lineWidth = isBarcode ? 2.5 : 1
      ctx.beginPath(); ctx.moveTo(x,sY); ctx.lineTo(x+bs,sY); ctx.stroke()
      
      const g = ctx.createLinearGradient(0,sY-8,0,sY+8)
      if (isBarcode) {
        g.addColorStop(0,"rgba(239,68,68,0)"); g.addColorStop(0.5,"rgba(239,68,68,0.25)"); g.addColorStop(1,"rgba(239,68,68,0)")
      } else {
        g.addColorStop(0,"rgba(16,185,129,0)"); g.addColorStop(0.5,"rgba(16,185,129,0.2)"); g.addColorStop(1,"rgba(16,185,129,0)")
      }
      ctx.fillStyle = g; ctx.fillRect(x,sY-8,bs,16)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
  }, [])

  // Face detection + smile liveness + auto check-in loop
  const startDetectionLoop = useCallback(() => {
    if (!faceapi || !modelsReady) return

    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || processingRef.current) {
        detectRef.current = requestAnimationFrame(detect)
        return
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptor()

        if (!detection) {
          setFaceStatus("Face not detected. Face the camera directly.")
          setSmileDetected(false)
          detectRef.current = requestAnimationFrame(detect)
          return
        }

        const expressions = detection.expressions
        const happyScore = expressions.happy || 0

        if (happyScore < 0.5) {
          setFaceStatus("Face detected! Please smile to check-in 😊")
          setSmileDetected(false)
          detectRef.current = requestAnimationFrame(detect)
          return
        }

        // Smile detected! Auto check-in
        setSmileDetected(true)
        setFaceStatus("Smile detected! Processing check-in...")
        processingRef.current = true

        const descriptor = Array.from(detection.descriptor) // Float32Array → number[]
        const response = await fetch("/api/checkins/face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ face_embedding: descriptor, liveness_passed: true })
        })
        const resData = await response.json()

        if (!response.ok) {
          const errorMsg = resData.error || "Failed to match face."
          setFaceStatus(`❌ ${errorMsg}`)
          setSmileDetected(false)
          speak("Check-in failed. " + errorMsg)
          // Resume detection after cooldown — camera stays on
          setTimeout(() => {
            setFaceStatus("Face the camera directly and smile 😊")
            processingRef.current = false
            detectRef.current = requestAnimationFrame(detect)
          }, 4000)
          return
        }

        setStatus("success")
        setStatusMsg(resData.message)
        setCheckedInMember(resData.data || null)
        speak(resData.message)
        extendResetTimer()
      } catch (err) {
        console.error("Detection error:", err)
        processingRef.current = false
        detectRef.current = requestAnimationFrame(detect)
      }

      if (!processingRef.current) {
        detectRef.current = requestAnimationFrame(detect)
      }
    }

    detect()
  }, [modelsReady, speak, resetKiosk, extendResetTimer])

  // Barcode / QR Code execution
  const processBarcodeCheckin = useCallback(async (barcode: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcode.trim(), method: "barcode" })
      })
      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || "Failed to process check-in.")
      
      setStatus("success")
      setStatusMsg(resData.message)
      setCheckedInMember(resData.data || null)
      speak(resData.message)
      extendResetTimer()
    } catch (err: any) {
      setStatus("error")
      setStatusMsg(err.message || "Failed to check-in.")
      speak("Check-in failed. " + (err.message || ""))
      
      if (mode === "barcode" && !showManualInput) {
        stopCamera()
      } else {
        setTimeout(() => {
          setStatus("idle")
          processingRef.current = false
        }, 4000)
      }
    } finally {
      setLoading(false)
    }
  }, [speak, extendResetTimer, mode, showManualInput, stopCamera])

  // Try again helper to restart camera scan cleanly
  const handleTryAgain = useCallback(() => {
    setStatus("idle")
    setStatusMsg("")
    processingRef.current = false
    setCameraTrigger(prev => prev + 1)
  }, [])

  // Barcode / QR Code Decoded handler
  const handleDecodedQRCode = useCallback(async (text: string) => {
    if (processingRef.current) return
    processingRef.current = true
    extendResetTimer()

    try {
      console.log("[QR SCAN] Raw decoded text:", text)
      // Format payload: barcode:timestamp
      const parts = text.split(':')
      const barcode = parts[0]
      const timestampStr = parts[1]

      console.log("[QR SCAN] Parsed barcode:", barcode, "timestampStr:", timestampStr)

      if (!timestampStr) {
        console.log("[QR SCAN] No timestamp found. Treating as static barcode fallback.")
        await processBarcodeCheckin(barcode)
        return
      }

      const timestamp = parseInt(timestampStr, 10)
      const now = Date.now()
      const diffSeconds = Math.abs(now - timestamp) / 1000
      
      console.log("[QR SCAN] Time evaluation - Now:", now, "QR Timestamp:", timestamp, "Diff Seconds:", diffSeconds)

      if (isNaN(timestamp)) {
        console.warn("[QR SCAN] Timestamp is NaN. Rejecting.")
        throw new Error("Invalid QR Code timestamp format.")
      }

      if (diffSeconds > 300) {
        console.warn("[QR SCAN] QR Code expired. Diff seconds:", diffSeconds, "exceeded 300s limit.")
        setStatus("error")
        setStatusMsg("Dynamic QR Code expired. Please refresh your phone screen.")
        speak("Access denied. QR Code has expired.")
        stopCamera()
        return
      }

      setBarcodeStatus("Valid QR Code! Processing...")
      await processBarcodeCheckin(barcode)
    } catch (err: any) {
      console.error("QR Code parsing error:", err)
      setStatus("error")
      setStatusMsg("Invalid QR Code format.")
      speak("Unrecognized code format.")
      stopCamera()
    }
  }, [processBarcodeCheckin, speak, extendResetTimer, stopCamera])

  // Start camera effect for both modes
  useEffect(() => {
    // If not in camera-requiring modes, stop the camera
    const needsCamera = mode === "face" || (mode === "barcode" && !showManualInput)
    if (!needsCamera) {
      stopCamera()
      return
    }

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 480, facingMode: "user" }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Wait for video to be ready before playing to avoid AbortError
          await new Promise<void>((resolve) => {
            const v = videoRef.current!
            v.onloadeddata = () => resolve()
            if (v.readyState >= 2) resolve()
          })
          await videoRef.current.play().catch(() => {})
        }

        if (mode === "face") {
          startMesh(false)
          if (modelsReady) {
            setFaceStatus("Face the camera directly and smile 😊")
            startDetectionLoop()
          }
        } else if (mode === "barcode") {
          startMesh(true)
          setBarcodeStatus("Align your phone's QR Code with the camera")
          
          // Bind ZXing Browser Scanner
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromVideoElement(videoRef.current!, (result) => {
            if (result && !processingRef.current) {
              handleDecodedQRCode(result.getText())
            }
          })
          qrReaderControlsRef.current = controls
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return // Ignore play interruptions
        console.error("Camera error:", err)
        setFaceStatus("Camera not detected. Please allow camera access.")
        setBarcodeStatus("Camera not detected. Please allow camera access.")
      }
    }
    init()

    return () => stopCamera()
  }, [mode, showManualInput, modelsReady, stopCamera, startMesh, startDetectionLoop, handleDecodedQRCode, cameraTrigger])

  // Barcode manually typed submit
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return
    processingRef.current = true
    await processBarcodeCheckin(barcodeInput.trim())
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center max-w-5xl mx-auto w-full border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500 shadow-md shadow-emerald-500/5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase text-emerald-500">FTL Gym AI</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Self Gate Entry Kiosk</p>
          </div>
        </div>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors">
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-grow flex items-center justify-center max-w-5xl mx-auto w-full my-6">
        {mode === "menu" && (
          <div className="w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Welcome to FTL Gym
              </h2>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Please choose your gate check-in method</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <button onClick={() => setMode("face")} className="group p-8 rounded-3xl bg-zinc-900/40 border border-zinc-900 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all duration-300 text-center flex flex-col items-center gap-4 hover:shadow-2xl hover:shadow-emerald-500/5 cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors">Face Recognition</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto leading-relaxed flex items-center gap-1 justify-center">
                    <Smile className="w-3 h-3" /> Simply smile for automatic check-in
                  </p>
                </div>
              </button>
              <button onClick={() => setMode("barcode")} className="group p-8 rounded-3xl bg-zinc-900/40 border border-zinc-900 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all duration-300 text-center flex flex-col items-center gap-4 hover:shadow-2xl hover:shadow-emerald-500/5 cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors">Scan QR / Barcode</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Scan the dynamic QR Code from your member portal directly.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Barcode / QR Code Scanner Mode */}
        {mode === "barcode" && (
          <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-900/30 border border-zinc-900 backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex justify-between items-center mb-6">
              <button onClick={resetKiosk} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> QR Code Scanner
              </span>
            </div>

            {status !== "idle" ? (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  {status === "success" ? (
                    <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                  ) : (
                    <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                  )}
                  <p className={`text-base font-black ${status === "success" ? "text-emerald-400" : "text-red-400"} max-w-sm mx-auto leading-relaxed`}>
                    {statusMsg}
                  </p>
                </div>
                
                {status === "success" && checkedInMember && (
                  <div className="max-w-sm mx-auto space-y-3 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Member Profile info */}
                    <div className="flex items-center gap-3">
                      {checkedInMember.avatar_url ? (
                        <img src={checkedInMember.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xl border-2 border-emerald-500/20">
                          {checkedInMember.full_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-base text-white">{checkedInMember.full_name}</h4>
                        {checkedInMember.membership_type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            {checkedInMember.membership_type} Member
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Trainer Info */}
                    {checkedInMember.trainer && (
                      <div className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                        <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Personal Trainer</p>
                          <p className="text-sm font-bold text-white truncate">{checkedInMember.trainer.pt_name}</p>
                          <p className="text-[10px] text-zinc-400">{checkedInMember.trainer.sessions_remaining} PT sessions remaining</p>
                        </div>
                      </div>
                    )}
                    {/* Today's Classes */}
                    {checkedInMember.classes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Today's Classes</p>
                        {checkedInMember.classes.map((cls: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                            <span className="text-xs font-bold text-white">{cls.name}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{new Date(cls.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {status === "error" && (
                  <div className="pt-4 text-center">
                    <Button 
                      type="button" 
                      onClick={handleTryAgain} 
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Try Again / Rescan</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : showManualInput ? (
              /* Manual Input Fallback Form */
              <form onSubmit={handleBarcodeSubmit} className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className="text-center space-y-2">
                  <Scan className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-extrabold">Scan your QR / Barcode</h3>
                  <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed">Enter your manual barcode ID below.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gate Barcode ID</Label>
                  <Input id="barcode" placeholder="Enter Barcode ID..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="h-11 bg-zinc-950 border-zinc-800 rounded-xl focus-visible:ring-emerald-500" required autoFocus />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Check-In Entry"}
                </Button>
                
                <div className="text-center">
                  <button type="button" onClick={() => setShowManualInput(false)} className="text-[10px] font-bold text-emerald-400 hover:underline">
                    Scan via Camera Instead
                  </button>
                </div>
              </form>
            ) : (
              /* Automated Camera QR Scanner view */
              <div className="space-y-6 flex flex-col items-center">
                <div className="relative w-80 h-80 rounded-full border-4 border-emerald-500/20 overflow-hidden shadow-2xl shadow-emerald-500/5 flex items-center justify-center bg-zinc-950">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping pointer-events-none" />
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </div>
                
                <div className="text-center space-y-3 w-full">
                  <div className="py-2.5 px-4 bg-zinc-950 border border-zinc-900 rounded-2xl text-xs font-bold text-emerald-400 shadow-sm max-w-xs mx-auto animate-pulse">
                    {barcodeStatus}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                    Point the <span className="text-emerald-400 font-bold">Dynamic Access QR</span> on your phone to the camera for instant scanning.
                  </p>
                </div>
                
                <div className="text-center w-full pt-2 border-t border-zinc-900">
                  <button type="button" onClick={() => setShowManualInput(true)} className="text-[10px] font-bold text-zinc-400 hover:text-emerald-400 hover:underline">
                    Camera Issues? Type Barcode Manually
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Face Recognition Mode */}
        {mode === "face" && (
          <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-900/30 border border-zinc-900 backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex justify-between items-center mb-6">
              <button onClick={resetKiosk} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              {smileDetected && status === "idle" && (
                <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Smile className="w-3 h-3" /> Smile Detected
                </span>
              )}
            </div>

            {status !== "idle" ? (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  {status === "success" ? (
                    <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                  ) : (
                    <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                  )}
                  <p className={`text-base font-black ${status === "success" ? "text-emerald-400" : "text-red-400"} max-w-sm mx-auto leading-relaxed`}>
                    {statusMsg}
                  </p>
                </div>
                {status === "success" && checkedInMember && (
                  <div className="max-w-sm mx-auto space-y-3 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-3">
                      {checkedInMember.avatar_url ? (
                        <img src={checkedInMember.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xl border-2 border-emerald-500/20">
                          {checkedInMember.full_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-base text-white">{checkedInMember.full_name}</h4>
                        {checkedInMember.membership_type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            {checkedInMember.membership_type} Member
                          </span>
                        )}
                      </div>
                    </div>
                    {checkedInMember.trainer && (
                      <div className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                        <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Personal Trainer</p>
                          <p className="text-sm font-bold text-white truncate">{checkedInMember.trainer.pt_name}</p>
                          <p className="text-[10px] text-zinc-400">{checkedInMember.trainer.sessions_remaining} of {checkedInMember.trainer.session_count} sessions remaining</p>
                        </div>
                      </div>
                    )}
                    {checkedInMember.classes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Today's Classes</p>
                        {checkedInMember.classes.map((cls: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                            <div>
                              <span className="text-xs font-bold text-white">{cls.name}</span>
                              {cls.trainer_name && <span className="text-[9px] text-zinc-500 ml-1.5">• {cls.trainer_name}</span>}
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold">{new Date(cls.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 flex flex-col items-center">
                <div className="relative w-80 h-80 rounded-full border-4 border-emerald-500/20 overflow-hidden shadow-2xl shadow-emerald-500/5 flex items-center justify-center bg-zinc-950">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping pointer-events-none" />
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" muted playsInline />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </div>
                <div className="text-center space-y-3 w-full">
                  <div className="py-2.5 px-4 bg-zinc-950 border border-zinc-900 rounded-2xl text-xs font-bold text-emerald-400 shadow-sm max-w-xs mx-auto">
                    {faceStatus}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                    Face the camera directly and smile for liveness verification and automatic check-in.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Voice Assistant Panel */}
      {status === "success" && checkedInMember && (
        <div className="relative z-10 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <BotMessageSquare className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">FTL AI Assistant</h4>
                  <p className="text-[9px] text-zinc-500">Ask about class schedules, trainers, PT sessions, or membership</p>
                </div>
              </div>
              <button
                onClick={startListening}
                disabled={isListening || assistantLoading}
                className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30' : 'bg-violet-500 hover:bg-violet-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'} text-white`}
              >
                {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : assistantLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: "Today's classes", q: "What classes are today?" },
                { label: "My trainer", q: "Who is my trainer?" },
                { label: "Next PT session", q: "When is my next PT session?" },
                { label: "Remaining membership", q: "How many days left in my membership?" },
                { label: "Check-ins this month", q: "How many check-ins this month?" },
              ].map((chip) => (
                <button
                  key={chip.q}
                  onClick={() => { setVoiceQuery(chip.q); askAssistant(chip.q) }}
                  disabled={assistantLoading}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-violet-500/20 hover:text-violet-400 text-zinc-400 border border-zinc-700 hover:border-violet-500/30 transition-all"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {chatHistory.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <BotMessageSquare className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                    )}
                    <div className={`max-w-[80%] text-[11px] leading-relaxed px-3 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-violet-500/20 text-violet-200 rounded-br-md'
                        : 'bg-zinc-800/80 text-zinc-200 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3 h-3 text-emerald-400" />
                      </div>
                    )}
                  </div>
                ))}
                {assistantLoading && (
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                      <BotMessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="bg-zinc-800/80 text-zinc-400 text-[11px] px-3 py-2 rounded-2xl rounded-bl-md flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                    </div>
                  </div>
                )}
              </div>
            )}

            {isListening && (
              <div className="flex items-center justify-center gap-2 py-2 text-violet-400">
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-1 bg-violet-500 rounded-full animate-pulse" style={{ height: `${Math.random()*12+4}px`, animationDelay: `${i*100}ms` }} />
                  ))}
                </div>
                <span className="text-[10px] font-bold">Listening... Please speak now</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 flex justify-between items-center max-w-5xl mx-auto w-full border-t border-zinc-900 pt-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Encrypted pgvector Biometric Verification System
        </span>
        <span>FTL Gym v1.0.0</span>
      </div>
    </div>
  )
}
