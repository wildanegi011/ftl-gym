'use client'

import { useState, useEffect, useRef, useCallback } from "react"
let faceapi: any = null
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeRegistration } from "@/app/actions/auth"
import { getTrainers } from "@/app/actions/trainers"
import { wizardProfileSchema, type WizardProfileInput } from "@/lib/validations/auth"
import { Dumbbell, ArrowRight, CheckCircle2, User, Phone, Loader2, UserCircle2, Star, CreditCard, Users, ClipboardList, AlertCircle, Camera, RotateCcw, ScanFace } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

type WizardStep = 1 | 2 | 3

const stepInfo = [
  { label: 'Plan', icon: CreditCard },
  { label: 'Trainer', icon: Users },
  { label: 'Profile', icon: ClipboardList },
]

export function RegisterWizard({ defaultMembership }: { defaultMembership: string }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [membershipType, setMembershipType] = useState(defaultMembership || 'basic')

  // Read selected plan from localStorage (set by PricingSection before OAuth redirect)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ftl_selected_plan')
      if (saved) {
        const plan = JSON.parse(saved)
        if (plan.membership_type && defaultMembership === 'basic') {
          // Only override if no explicit query param was provided (defaultMembership is fallback 'basic')
          setMembershipType(plan.membership_type)
        }
        localStorage.removeItem('ftl_selected_plan') // Clean up
      }
    } catch {}
  }, [defaultMembership])
  const [ptId, setPtId] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [trainers, setTrainers] = useState<any[]>([])
  const [loadingTrainers, setLoadingTrainers] = useState(false)
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState<any>(null)
  const [ptPackageId, setPtPackageId] = useState<string | undefined>()
  const [facePhoto, setFacePhoto] = useState<string | null>(null)
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceValidation, setFaceValidation] = useState({ isValid: false, message: 'Menunggu kamera...' })
  const [facePhotoError, setFacePhotoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectLoopRef = useRef<number | undefined>(undefined)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const { register, handleSubmit, formState: { errors }, watch } = useForm<WizardProfileInput>({
    resolver: zodResolver(wizardProfileSchema),
    defaultValues: { full_name: '', phone: '' },
    mode: 'onBlur',
  })

  const watchedName = watch('full_name')
  const watchedPhone = watch('phone')

  useEffect(() => {
    const loadModels = async () => {
      try {
        if (typeof window !== 'undefined' && !faceapi) {
          faceapi = await import('@vladmandic/face-api')
        }
        if (faceapi) {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          ])
          setModelsLoaded(true)
        }
      } catch (err) {
        console.error('Failed to load face-api models', err)
      }
    }
    loadModels()
  }, [])

  useEffect(() => {
    if (step === 2 && trainers.length === 0) {
      setLoadingTrainers(true)
      getTrainers().then(data => {
        setTrainers(data)
        setLoadingTrainers(false)
      })
    }
  }, [step])

  const nextStep = () => setStep(s => Math.min(s + 1, 3) as WizardStep)
  const prevStep = () => setStep(s => Math.max(s - 1, 1) as WizardStep)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraActive(true)
  }, [])

  // Attach stream after video element is rendered and start validation
  useEffect(() => {
    if (!cameraActive || facePhoto) return
    let cancelled = false

    const validateFace = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || cancelled) return

      try {
        if (modelsLoaded && faceapi) {
          const detection = await faceapi
            .detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceExpressions()

          if (!detection) {
            setFaceValidation({ isValid: false, message: 'Wajah tidak terdeteksi (lepas masker)' })
          } else {
            setFaceValidation({ isValid: true, message: 'Wajah terdeteksi jelas' })
          }
        }
      } catch (err) {
        console.error('Validation error', err)
      }

      if (!cancelled) {
        detectLoopRef.current = requestAnimationFrame(validateFace)
      }
    }

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await new Promise<void>((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              resolve()
            }
          })
          await videoRef.current.play()
          validateFace()
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError('Unable to access camera. Please allow camera permissions.')
          setCameraActive(false)
          console.error('Camera error:', err)
        }
      }
    }
    init()

    return () => { 
      cancelled = true 
      if (detectLoopRef.current) cancelAnimationFrame(detectLoopRef.current)
    }
  }, [cameraActive, facePhoto, modelsLoaded])

  const stopCamera = useCallback(() => {
    if (detectLoopRef.current) cancelAnimationFrame(detectLoopRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setFaceValidation({ isValid: false, message: 'Menunggu kamera...' })
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return
    // Extract real 128-dim descriptor before capturing photo
    if (faceapi && modelsLoaded) {
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor()
        if (detection) {
          setFaceDescriptor(Array.from(detection.descriptor))
        }
      } catch (err) {
        console.error('Failed to extract face descriptor:', err)
      }
    }
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(videoRef.current, 0, 0, 480, 480)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setFacePhoto(dataUrl)
    stopCamera()
  }, [stopCamera, modelsLoaded])

  const retakePhoto = useCallback(() => {
    setFacePhoto(null)
    setFaceDescriptor(null)
    setCameraActive(true)
  }, [])

  // Cleanup camera on unmount or step change
  useEffect(() => {
    return () => { stopCamera() }
  }, [step, stopCamera])

  const onSubmit = async (data: WizardProfileInput) => {
    if (!facePhoto) {
      setFacePhotoError('Face photo is required for biometric check-in')
      return
    }
    setFacePhotoError(null)
    setIsSubmitting(true)
    
    const result = await completeRegistration({
      membership_type: membershipType,
      pt_id: ptId,
      pt_package_id: ptPackageId,
      full_name: data.full_name,
      phone: data.phone,
      face_photo: facePhoto,
      face_descriptor: faceDescriptor || undefined,
    })

    if (result?.error) {
      alert(result.error)
      setIsSubmitting(false)
    } else if (result?.success && result.invoiceUrl) {
      window.location.href = result.invoiceUrl
    } else {
      setIsSubmitting(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold">Choose Subscription</h3>
        <p className="text-sm text-zinc-500">Select the plan that fits your goals</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { id: 'basic', name: 'Basic', price: 'Rp 350.000', features: ['Limited Access', 'Standard Facilities'] },
          { id: 'premium', name: 'Premium', price: 'Rp 600.000', features: ['24/7 Access', 'Free Classes', 'Sauna'] },
          { id: 'vip', name: 'VIP', price: 'Rp 900.000', features: ['All Premium', 'Private Locker', 'VIP Lounge'] }
        ].map(plan => (
          <div 
            key={plan.id}
            onClick={() => setMembershipType(plan.id)}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${membershipType === plan.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md' : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-lg">{plan.name}</h4>
              {membershipType === plan.id && <CheckCircle2 className="text-emerald-500 w-5 h-5" />}
            </div>
            <p className="font-black text-xl mb-4">{plan.price}<span className="text-sm font-normal text-zinc-500">/mo</span></p>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={nextStep} className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20">
          Next <ArrowRight className="w-5 h-5 ml-2"/>
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-black mb-2 tracking-tight">Confused?</h3>
        <p className="text-zinc-500">Let us help you choose the right trainer for you</p>
      </div>

      {/* Banner Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <div 
          onClick={() => {
            const males = trainers.filter(pt => pt.name.match(/budi|reza|andi|hendra/i));
            const pool = males.length > 0 ? males : trainers;
            if (pool.length > 0) setSelectedTrainerDetails(pool[Math.floor(Math.random() * pool.length)]);
          }}
          className="cursor-pointer rounded-3xl p-8 relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}
        >
          <div className="relative z-10 text-white w-[70%]">
            <h4 className="text-2xl font-black mb-2 leading-tight">Pick Any Male<br/>Trainers</h4>
            <p className="text-blue-200 text-sm mb-6">Certified male fitness professionals</p>
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md rounded-xl font-bold" onClick={(e) => { 
              e.stopPropagation(); 
              const males = trainers.filter(pt => pt.name.match(/budi|reza|andi|hendra/i));
              const pool = males.length > 0 ? males : trainers;
              if (pool.length > 0) setSelectedTrainerDetails(pool[Math.floor(Math.random() * pool.length)]);
            }}>
              Select <ArrowRight className="w-4 h-4 ml-2"/>
            </Button>
          </div>
          {/* Decorative shapes */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/20 to-transparent skew-x-12 translate-x-12" />
          <div className="absolute right-4 bottom-4 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-50 pointer-events-none" />
        </div>

        <div 
          onClick={() => {
            const females = trainers.filter(pt => pt.name.match(/siti|maya|putri|dewi/i));
            const pool = females.length > 0 ? females : trainers;
            if (pool.length > 0) setSelectedTrainerDetails(pool[Math.floor(Math.random() * pool.length)]);
          }}
          className="cursor-pointer rounded-3xl p-8 relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
        >
          <div className="relative z-10 text-white w-[70%]">
            <h4 className="text-2xl font-black mb-2 leading-tight">Pick Any Female<br/>Trainers</h4>
            <p className="text-purple-200 text-sm mb-6">Certified female fitness professionals</p>
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md rounded-xl font-bold" onClick={(e) => { 
              e.stopPropagation(); 
              const females = trainers.filter(pt => pt.name.match(/siti|maya|putri|dewi/i));
              const pool = females.length > 0 ? females : trainers;
              if (pool.length > 0) setSelectedTrainerDetails(pool[Math.floor(Math.random() * pool.length)]);
            }}>
              Select <ArrowRight className="w-4 h-4 ml-2"/>
            </Button>
          </div>
          {/* Decorative shapes */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/20 to-transparent skew-x-12 translate-x-12" />
          <div className="absolute right-4 bottom-4 w-32 h-32 bg-purple-400 rounded-full blur-3xl opacity-50 pointer-events-none" />
        </div>
      </div>

      <div className="pt-8">
        <h3 className="text-2xl font-black mb-1 tracking-tight">Or choose your own trainer</h3>
        <p className="text-zinc-500 text-sm">Browse our certified professional team</p>
      </div>

      {loadingTrainers ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {trainers.map(pt => (
            <div 
              key={pt.id}
              className={`rounded-[2rem] overflow-hidden relative group aspect-[3/4] transition-all bg-zinc-900 ${ptId === pt.id ? 'ring-4 ring-emerald-500 ring-offset-4 dark:ring-offset-zinc-950 scale-[1.02]' : 'hover:scale-[1.02] hover:shadow-2xl shadow-xl'}`}
            >
              <img src={pt.avatar_url} alt={pt.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90" />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-95" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-4 h-4 text-[#0ea5e9]" />
                  <h4 className="font-black text-2xl leading-none tracking-tight">{pt.name}</h4>
                </div>
                <div className="flex flex-wrap gap-1 mb-6">
                  {pt.specialities?.slice(0, 2).map((spec: string, i: number) => (
                    <span key={i} className="bg-white/10 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">{spec}</span>
                  ))}
                  {pt.specialities?.length > 2 && (
                    <span className="bg-white/10 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">+{pt.specialities.length - 2}</span>
                  )}
                </div>
                
                {(() => {
                  const selectedPkg = ptId === pt.id && ptPackageId ? pt.packages?.find((p: any) => p.id === ptPackageId) : null;
                  return (
                    <Button 
                      onClick={() => setSelectedTrainerDetails(pt)}
                      className={`w-full flex-col justify-center gap-0.5 rounded-xl font-bold h-14 transition-all shadow-lg ${ptId === pt.id ? 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-[#0ea5e9]/20' : 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-[#0ea5e9]/20'}`}
                    >
                      <span>{ptId === pt.id ? 'Selected' : 'Select'}</span>
                      {selectedPkg && <span className="text-[10px] font-medium opacity-90">{selectedPkg.session_count} Session{selectedPkg.session_count > 1 ? 's' : ''} (Rp {selectedPkg.price.toLocaleString('id-ID')})</span>}
                    </Button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog or Drawer for Trainer Details */}
      {isDesktop ? (
        <Dialog open={!!selectedTrainerDetails} onOpenChange={(open) => !open && setSelectedTrainerDetails(null)}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-zinc-950 border-zinc-800 rounded-[2rem]">
            <DialogTitle className="sr-only">Trainer Details</DialogTitle>
            {selectedTrainerDetails && (
              <div className="relative">
                <div className="aspect-square w-full relative">
                  <img src={selectedTrainerDetails.avatar_url} alt={selectedTrainerDetails.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-4xl font-black text-white mb-2 tracking-tight">{selectedTrainerDetails.name}</h3>
                    <div className="flex items-center gap-3 text-zinc-300 font-medium">
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainerDetails.specialities?.map((spec: string, i: number) => (
                          <span key={i} className="bg-[#0ea5e9]/20 text-[#0ea5e9] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{spec}</span>
                        ))}
                      </div>
                      <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold"><Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {selectedTrainerDetails.rating}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 pt-4 space-y-6 text-zinc-300 bg-zinc-950">
                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-[#0ea5e9]"/> Biography</h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {selectedTrainerDetails.bio || `${selectedTrainerDetails.name} is a certified professional personal trainer specializing in ${selectedTrainerDetails.specialities?.[0]?.toLowerCase() || 'fitness'}. With a proven track record of helping clients achieve their fitness goals through structured training and dedication.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Experience</p>
                      <p className="text-white font-bold text-lg">{selectedTrainerDetails.experience_years} Years</p>
                    </div>
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Rate</p>
                      <p className="text-[#0ea5e9] font-black text-lg">Rp {selectedTrainerDetails.price_per_session?.toLocaleString('id-ID') || 0}<span className="text-xs font-medium text-zinc-500">/session</span></p>
                    </div>
                  </div>

                  {selectedTrainerDetails.certifications?.length > 0 && (
                    <div>
                      <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider text-zinc-500">Certifications</h4>
                      <ul className="space-y-2">
                        {selectedTrainerDetails.certifications.map((cert: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wider text-zinc-500">Select Training Package</h4>
                    {selectedTrainerDetails.packages?.map((pkg: any) => (
                      <Button 
                        key={pkg.id}
                        onClick={() => {
                          setPtId(selectedTrainerDetails.id)
                          setPtPackageId(pkg.id)
                          setSelectedTrainerDetails(null)
                        }}
                        className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left flex items-center justify-between px-6 transition-all group"
                      >
                        <div>
                          <span className="text-white font-bold block">{pkg.session_count} Session{pkg.session_count > 1 ? 's' : ''}</span>
                          <span className="text-zinc-500 text-xs font-medium">{pkg.duration_minutes} mins per session</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#0ea5e9] font-black text-lg">Rp {pkg.price?.toLocaleString('id-ID') || 0}</span>
                          <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center group-hover:bg-[#0ea5e9] group-hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Button>
                    ))}
                    {(!selectedTrainerDetails.packages || selectedTrainerDetails.packages.length === 0) && (
                      <Button 
                        onClick={() => {
                          setPtId(selectedTrainerDetails.id)
                          setSelectedTrainerDetails(null)
                        }}
                        className="w-full h-14 rounded-2xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-lg shadow-xl shadow-[#0ea5e9]/20"
                      >
                        Choose {selectedTrainerDetails.name}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={!!selectedTrainerDetails} onOpenChange={(open) => !open && setSelectedTrainerDetails(null)}>
          <DrawerContent className="p-0 overflow-hidden bg-zinc-950 border-zinc-800 border-x-0 border-b-0 rounded-t-[2rem]">
            <DrawerTitle className="sr-only">Trainer Details</DrawerTitle>
            {selectedTrainerDetails && (
              <div className="relative max-h-[85vh] overflow-y-auto">
                <div className="aspect-square w-full relative">
                  <img src={selectedTrainerDetails.avatar_url} alt={selectedTrainerDetails.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{selectedTrainerDetails.name}</h3>
                    <div className="flex items-center gap-3 text-zinc-300 font-medium">
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainerDetails.specialities?.map((spec: string, i: number) => (
                          <span key={i} className="bg-[#0ea5e9]/20 text-[#0ea5e9] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{spec}</span>
                        ))}
                      </div>
                      <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold"><Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {selectedTrainerDetails.rating}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 pt-4 space-y-5 text-zinc-300 bg-zinc-950 pb-8">
                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2"><User className="w-4 h-4 text-[#0ea5e9]"/> Biography</h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {selectedTrainerDetails.bio || `${selectedTrainerDetails.name} is a certified professional personal trainer specializing in ${selectedTrainerDetails.specialities?.[0]?.toLowerCase() || 'fitness'}.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Experience</p>
                      <p className="text-white font-bold text-lg">{selectedTrainerDetails.experience_years} Years</p>
                    </div>
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Rate</p>
                      <p className="text-[#0ea5e9] font-black text-lg">Rp {selectedTrainerDetails.price_per_session?.toLocaleString('id-ID') || 0}<span className="text-xs font-medium text-zinc-500">/session</span></p>
                    </div>
                  </div>

                  {selectedTrainerDetails.certifications?.length > 0 && (
                    <div>
                      <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider text-zinc-500">Certifications</h4>
                      <ul className="space-y-2">
                        {selectedTrainerDetails.certifications.map((cert: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-wider text-zinc-500">Select Training Package</h4>
                    {selectedTrainerDetails.packages?.map((pkg: any) => (
                      <Button 
                        key={pkg.id}
                        onClick={() => {
                          setPtId(selectedTrainerDetails.id)
                          setPtPackageId(pkg.id)
                          setSelectedTrainerDetails(null)
                        }}
                        className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left flex items-center justify-between px-6 transition-all group"
                      >
                        <div>
                          <span className="text-white font-bold block">{pkg.session_count} Session{pkg.session_count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#0ea5e9] font-black text-lg">Rp {pkg.price?.toLocaleString('id-ID') || 0}</span>
                        </div>
                      </Button>
                    ))}
                    {(!selectedTrainerDetails.packages || selectedTrainerDetails.packages.length === 0) && (
                      <Button 
                        onClick={() => {
                          setPtId(selectedTrainerDetails.id)
                          setSelectedTrainerDetails(null)
                        }}
                        className="w-full h-14 rounded-2xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-lg shadow-xl shadow-[#0ea5e9]/20"
                      >
                        Choose {selectedTrainerDetails.name}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      )}

      <div className="flex justify-between pt-8 border-t border-zinc-200 dark:border-zinc-800 mt-8">
        <Button type="button" variant="outline" onClick={prevStep} className="rounded-xl h-12 px-8 font-bold border-zinc-300 dark:border-zinc-700">Back</Button>
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => {
              setPtId(undefined);
              setPtPackageId(undefined);
              nextStep();
            }} 
            className="rounded-xl h-12 px-6 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Skip
          </Button>
          <Button type="button" onClick={nextStep} className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20">
            Next <ArrowRight className="w-5 h-5 ml-2"/>
          </Button>
        </div>
      </div>
    </div>
  )

  const selectedTrainer = trainers.find(t => t.id === ptId)
  const selectedPkg = selectedTrainer?.packages?.find((p: any) => p.id === ptPackageId)

  const renderStep3 = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-2">
        <h3 className="text-2xl font-black tracking-tight">Complete Your Profile</h3>
        <p className="text-sm text-zinc-500">Just a few details to finalize your membership</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left: Form Fields */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</Label>
            <div className="relative">
              <UserCircle2 className={`absolute left-3.5 top-3 h-4 w-4 ${errors.full_name ? 'text-red-400' : 'text-muted-foreground'}`} />
              <Input 
                id="full_name" 
                {...register('full_name')}
                className={`pl-10 h-11 rounded-xl bg-background/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/20 ${errors.full_name ? 'border-red-400 focus:ring-red-500/20' : ''}`} 
                placeholder="e.g. John Doe" 
              />
            </div>
            {errors.full_name && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.full_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Phone Number</Label>
            <div className="relative">
              <Phone className={`absolute left-3.5 top-3 h-4 w-4 ${errors.phone ? 'text-red-400' : 'text-muted-foreground'}`} />
              <Input 
                id="phone" 
                {...register('phone')}
                className={`pl-10 h-11 rounded-xl bg-background/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/20 ${errors.phone ? 'border-red-400 focus:ring-red-500/20' : ''}`} 
                placeholder="+6281234567890" 
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Face Photo Capture */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <ScanFace className="w-3.5 h-3.5" /> Face Photo <span className="text-red-400">*</span> <span className="text-zinc-400 font-normal normal-case">(for biometric check-in)</span>
            </Label>
            <div className={`rounded-2xl border-2 border-dashed bg-zinc-50 dark:bg-zinc-900/50 overflow-hidden relative aspect-square max-w-[240px] transition-colors ${facePhotoError && !facePhoto ? 'border-red-400' : 'border-zinc-300 dark:border-zinc-700'}`}>
              {facePhoto ? (
                <div className="relative w-full h-full">
                  <img src={facePhoto} alt="Your face" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 inset-x-3 flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={retakePhoto} className="flex-1 rounded-lg bg-white/20 backdrop-blur-md text-white border-0 hover:bg-white/30 text-xs h-8">
                      <RotateCcw className="w-3 h-3 mr-1" /> Retake
                    </Button>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Captured</span>
                  </div>
                </div>
              ) : cameraActive ? (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-[70%] h-[70%] border-2 rounded-[2rem] transition-colors duration-300 ${faceValidation.isValid ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`} />
                  </div>
                  <div className="absolute top-3 inset-x-3 flex justify-center">
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-colors duration-300 ${faceValidation.isValid ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                      {faceValidation.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {faceValidation.message}
                    </span>
                  </div>
                  <div className="absolute bottom-3 inset-x-3">
                    <Button type="button" disabled={!faceValidation.isValid} onClick={capturePhoto} className={`w-full rounded-lg font-bold text-xs h-9 shadow-lg transition-all ${faceValidation.isValid ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white/80 text-zinc-400 cursor-not-allowed backdrop-blur-md'}`}>
                      <Camera className="w-3.5 h-3.5 mr-1.5" /> Take Photo
                    </Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={startCamera} className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-medium">Tap to open camera</span>
                </button>
              )}
            </div>
            {(cameraError || (facePhotoError && !facePhoto)) && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {cameraError || facePhotoError}
              </p>
            )}
          </div>
        </div>

        {/* Right: Summary Card */}
        {(() => {
          const priceMap: Record<string, number> = { basic: 350000, premium: 600000, vip: 900000 }
          const membershipPrice = priceMap[membershipType] || 350000
          const trainerPrice = selectedPkg?.price ? Number(selectedPkg.price) : 0
          const total = membershipPrice + trainerPrice

          return (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">Order Summary</h4>
              
              <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-sm font-medium">Membership</span>
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">{membershipType}</span>
                </div>
                <span className="font-bold text-sm">Rp {membershipPrice.toLocaleString('id-ID')}</span>
              </div>

              {selectedTrainer ? (
                <>
                  <div className="flex items-center gap-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                    <img src={selectedTrainer.avatar_url} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0ea5e9]/20" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{selectedTrainer.name}</p>
                      <p className="text-xs text-zinc-500">Personal Trainer</p>
                    </div>
                  </div>
                  {selectedPkg && (
                    <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <span className="text-sm font-medium">{selectedPkg.session_count} Session{selectedPkg.session_count > 1 ? 's' : ''}</span>
                        <span className="text-xs text-zinc-500 ml-1">({selectedPkg.duration_minutes} min)</span>
                      </div>
                      <span className="font-bold text-sm text-[#0ea5e9]">Rp {trainerPrice.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Trainer</span>
                  <span className="text-sm text-zinc-400 italic">None selected</span>
                </div>
              )}

              <div className="pt-3 mt-2 border-t-2 border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-wider">Total</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 text-right">per month + trainer package</p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Status</span>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">Pending Payment</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <Button type="button" variant="outline" onClick={prevStep} className="rounded-xl h-12 px-8 font-bold border-zinc-300 dark:border-zinc-700">Back</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl h-12 px-8 shadow-lg shadow-emerald-500/20 text-base">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Dumbbell className="w-4 h-4 mr-2" />}
          Complete Setup
        </Button>
      </div>
    </form>
  )

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-2xl border-white/20 dark:border-white/10 backdrop-blur-md bg-white/70 dark:bg-zinc-950/70 my-8">
      <CardHeader className="space-y-4 pb-2">
        <div className="flex justify-center">
          <div className="flex items-center gap-0">
            {stepInfo.map((s, idx) => {
              const stepNum = idx + 1
              const Icon = s.icon
              const isActive = step === stepNum
              const isCompleted = step > stepNum
              return (
                <div key={stepNum} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : isActive ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-4 ring-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive || isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>{s.label}</span>
                  </div>
                  {idx < 2 && <div className={`w-16 h-0.5 mx-2 mb-5 transition-all duration-300 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />}
                </div>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </CardContent>
    </Card>
  )
}
