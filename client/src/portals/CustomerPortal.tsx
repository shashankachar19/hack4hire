import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { COMMON_PARTS, type ConsumablePart } from '../parts'
import { downloadOfficialInvoicePdf } from '../utils/invoicePdf'
import {
  IconCheckCircle,
  IconMapPin,
  IconPhone,
  IconStar,
  IconZap,
  IconAlertTriangle,
  IconRotateCw,
  IconXCircle,
  IconShieldCheck,
  IconDollarSign,
  IconSparkles,
  IconX,
  IconMail,
  IconLock,
  IconKey,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconHome,
  IconBuilding,
  IconPlane,
  IconWrench,
  IconSnowflake,
  IconToolbox,
  IconMessageSquare,
  IconHardHat,
  IconCheck,
  IconBell,
  IconBike,
  IconUser,
  IconCreditCard,
  IconQrCode,
  IconWallet,
} from '../components/Icons'

function getCategoryIcon(id: string, className = 'w-6 h-6 text-cyan-400') {
  switch (id) {
    case 'plumbing':
      return <IconWrench className={className} />
    case 'electrical':
      return <IconZap className={className} />
    case 'hvac':
      return <IconSnowflake className={className} />
    case 'appliance':
      return <IconToolbox className={className} />
    case 'locksmith':
      return <IconLock className={className} />
    default:
      return <IconWrench className={className} />
  }
}

function getAddressIcon(id: string, className = 'w-4 h-4 text-cyan-400') {
  switch (id) {
    case 'home':
      return <IconHome className={className} />
    case 'work':
      return <IconBuilding className={className} />
    case 'central':
      return <IconMapPin className={className} />
    case 'north':
      return <IconPlane className={className} />
    default:
      return <IconMapPin className={className} />
  }
}

function getCancellationIcon(id: string, className = 'w-4 h-4 text-cyan-400') {
  switch (id) {
    case 'eta':
      return <IconClock className={className} />
    case 'resolved':
      return <IconWrench className={className} />
    case 'wrong_service':
      return <IconMapPin className={className} />
    case 'maintenance':
      return <IconBuilding className={className} />
    case 'reschedule':
      return <IconClock className={className} />
    case 'other':
      return <IconMessageSquare className={className} />
    default:
      return <IconAlertTriangle className={className} />
  }
}

interface Category {
  id: string
  name: string
  skill: string
  basePrice: number
  description: string
  avgTime: string
}

export interface CustomerProfile {
  id?: string
  name: string
  phone: string
  email: string
  address: string
  age: number
}

export interface SavedAddress {
  id: string
  label: string
  tag: string
  address: string
  zoneId: string
  landmark: string
}

const SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: 'home',
    label: 'Home',
    tag: 'Primary',
    address: 'Flat 402, Tower B, Prestige Falcon City, Konanakunte, Bengaluru',
    zoneId: 'zone-south',
    landmark: 'Opposite Metro Station',
  },
  {
    id: 'work',
    label: 'Office (HQ)',
    tag: 'Work',
    address: 'Level 6, Brigade Tech Gardens, Brookefield, Whitefield, Bengaluru',
    zoneId: 'zone-east',
    landmark: 'Behind ITPL Gate 2',
  },
  {
    id: 'central',
    label: 'Indiranagar Hub',
    tag: 'Family',
    address: '#48, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru',
    zoneId: 'zone-central',
    landmark: 'Near 100ft Road Junction',
  },
  {
    id: 'north',
    label: 'North Campus',
    tag: 'Transit',
    address: 'Prestige Golfshire, Hebbal Flyover Corridor, Bengaluru',
    zoneId: 'zone-north',
    landmark: 'Airport Express Highway',
  },
]

const CANCELLATION_REASONS = [
  { id: 'eta', title: 'Technician ETA is too long / delayed', desc: 'Partner estimated arrival exceeds my available window' },
  { id: 'resolved', title: 'Issue resolved itself / Already fixed', desc: 'I was able to fix the problem myself or no longer need service' },
  { id: 'wrong_service', title: 'Booked wrong service category or address', desc: 'Accidentally selected the wrong trade skill or service address' },
  { id: 'maintenance', title: 'Building maintenance handles it now', desc: 'Apartment facility team arrived to take care of it' },
  { id: 'reschedule', title: 'Need to reschedule to another date/time', desc: 'I will book another slot later when convenient' },
  { id: 'other', title: 'Other reason / Changed plans', desc: 'Personal reason or emergency change of plans' },
]

const CATEGORIES: Category[] = [
  { id: 'plumbing', name: 'Plumbing & Pipe Repair', skill: 'plumbing', basePrice: 499, description: 'Leaks, blockages, faucet & drain installation', avgTime: '45 mins' },
  { id: 'electrical', name: 'Electrical & Power Fix', skill: 'electrical', basePrice: 549, description: 'Short circuits, switchboards, wiring & breakers', avgTime: '40 mins' },
  { id: 'hvac', name: 'HVAC & Air Conditioner', skill: 'hvac', basePrice: 799, description: 'Cooling issues, compressor, gas charge, servicing', avgTime: '60 mins' },
  { id: 'appliance', name: 'Appliance Diagnostics', skill: 'appliance-repair', basePrice: 599, description: 'Washing machines, refrigerators, microwaves', avgTime: '45 mins' },
  { id: 'locksmith', name: 'Emergency Locksmith', skill: 'locksmith', basePrice: 699, description: 'Lockouts, cylinder change, high-security deadbolts', avgTime: '30 mins' },
]

const ZONES = [
  { id: 'zone-central', name: 'Central Tech Park (HQ Hub)', lat: 12.95, lng: 77.58 },
  { id: 'zone-north', name: 'North Tech Corridor (Hebbal/Yelahanka)', lat: 13.04, lng: 77.59 },
  { id: 'zone-south', name: 'South Residential (Koramangala/HSR)', lat: 12.91, lng: 77.63 },
  { id: 'zone-east', name: 'East IT Hub (Whitefield/Indiranagar)', lat: 12.97, lng: 77.71 },
  { id: 'zone-west', name: 'West Commercial (Rajajinagar/Yeshwantpur)', lat: 12.99, lng: 77.53 },
]

const QUICK_GATE_NOTES = [
  'Flat 402, Ring bell twice',
  'Call from main security gate',
  'Beware of pet dog on premises',
  'Basement-1 Visitor Parking',
]

function playDispatchChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

function playArrivalChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(659.25, ctx.currentTime) // E5
    osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.18) // C5 (two-tone doorbell)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12) // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24) // G5
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
    osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15) // F#4
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.45)
  } catch {}
}


function ConfettiCanvas() {
  const pieces = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: ((i * 1.25 + 1) % 98) + '%',
    delay: ((i * 0.05) % 3) + 's',
    duration: (2.0 + (i % 6) * 0.35) + 's',
    color: ['#522959', '#DFB6B2', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#824D69', '#FAE5D8'][i % 8],
    size: 7 + (i % 5) * 2.5,
    rotate: (i * 41) % 360,
    isEmoji: i % 7 === 0,
    emoji: ['🎉', '✨', '⭐', '🎊', '🌸', '💖'][i % 6],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {pieces.map((p) => (
        p.isEmoji ? (
          <div
            key={p.id}
            className="absolute animate-confetti-fall select-none pointer-events-none text-xl"
            style={{
              left: p.left,
              top: '-30px',
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            {p.emoji}
          </div>
        ) : (
          <div
            key={p.id}
            className="absolute animate-confetti-fall pointer-events-none shadow-sm"
            style={{
              left: p.left,
              top: '-20px',
              width: p.size + 'px',
              height: (p.size * 1.5) + 'px',
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : '3px',
              transform: 'rotate(' + p.rotate + 'deg)',
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        )
      ))}
    </div>
  );
}

export default function CustomerPortal() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0])
  const [selectedZone, setSelectedZone] = useState(ZONES[0])
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL')
  const [customTitle, setCustomTitle] = useState('')
  const [gateNote, setGateNote] = useState('Flat 402, Ring bell twice')
  const [streetAddress, setStreetAddress] = useState(SAVED_ADDRESSES[0].address)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('home')
  const [showFareBreakdown, setShowFareBreakdown] = useState<boolean>(false)

  // Cancellation Reason Survey Modal (Feature 2)
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false)
  const [cancelReason, setCancelReason] = useState<string>('Technician ETA is too long / delayed')
  const [cancelNotes, setCancelNotes] = useState<string>('')
  const [isCancelling, setIsCancelling] = useState<boolean>(false)

  // Dynamic Partner ETA & Reallocation State
  const [reallocationSecondsLeft, setReallocationSecondsLeft] = useState<number>(60)
  const hasAutoDeclinedRef = useRef<string | null>(null)
  const [showMailFeed, setShowMailFeed] = useState<boolean>(false)
  const [recentEmails, setRecentEmails] = useState<any[]>([])
  const [mailFeedLoading, setMailFeedLoading] = useState<boolean>(false)

  const handleOpenMailFeed = async () => {
    setMailFeedLoading(true)
    setShowMailFeed(true)
    try {
      const list = await api.getRecentEmails()
      setRecentEmails(list)
    } catch {
      // ignore
    } finally {
      setMailFeedLoading(false)
    }
  }

  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingBookingAfterAuth, setPendingBookingAfterAuth] = useState(false)
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    age: '29',
  })
  // Authentication & OTP State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY_OTP' | 'FORGOT_PASSWORD'>('LOGIN')
  const [loginMethod, setLoginMethod] = useState<'OTP' | 'PASSWORD'>('OTP')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authOtp, setAuthOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [otpActionType, setOtpActionType] = useState<'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'>('LOGIN')
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(180) // 3-minute OTP expiration countdown
  const [isMatching, setIsMatching] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([])
  const [preferredTechId, setPreferredTechId] = useState<string>('')
  const [showAssignedPopup, setShowAssignedPopup] = useState<boolean>(false)
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'CARD' | 'POD' | 'WALLET'>('UPI')
  const [dummyUpiId, setDummyUpiId] = useState<string>('customer@oksbi')
  const [showQrPreview, setShowQrPreview] = useState<boolean>(false)
  const [isAuthorizingPayment, setIsAuthorizingPayment] = useState<boolean>(false)
  const hasShownCompletionModalRef = useRef<string | null>(null)
  const hasShownAssignedPopupRef = useRef<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Prevent background scrolling while any modal is open
  useEffect(() => {
    if (showAuthModal || showDrawer || showCancelModal || showAssignedPopup || showMailFeed) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAuthModal, showDrawer, showCancelModal, showAssignedPopup, showMailFeed])

  // Load customer profile and bookings from database & localStorage on mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('dg_customer_profile')
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile)
        setProfile(parsedProfile)
        setStreetAddress(parsedProfile.address || '')

        // Verify & synchronize with live SQLite database
        if (parsedProfile.id) {
          api.getCustomer(parsedProfile.id)
            .then((dbCust) => {
              if (dbCust) {
                setProfile(dbCust)
                setStreetAddress(dbCust.address || '')
                localStorage.setItem('dg_customer_profile', JSON.stringify(dbCust))
              }
            })
            .catch(() => {})
        } else if (parsedProfile.phone) {
          api.getCustomers({ phone: parsedProfile.phone })
            .then((list) => {
              if (list && list[0]) {
                setProfile(list[0])
                setStreetAddress(list[0].address || '')
                localStorage.setItem('dg_customer_profile', JSON.stringify(list[0]))
              }
            })
            .catch(() => {})
        }
      }

      const stored = localStorage.getItem('dg_user_bookings')
      if (stored) {
        const parsed = JSON.parse(stored)
        setBookings(parsed)
        // If an active incomplete booking exists, restore it automatically
        const ongoing = parsed.find((b: any) => b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS')
        if (ongoing && !activeOrder) {
          api.getJob(ongoing.id)
            .then((fresh) => {
              if (fresh && (fresh.status === 'ASSIGNED' || fresh.status === 'IN_PROGRESS')) {
                setActiveOrder({
                  job: fresh,
                  assignment: fresh.assignments?.[0],
                  otp: ongoing.otp || '4829',
                  gateNote: ongoing.gateNote || 'Flat 402, Ring bell twice',
                })
              }
            })
            .catch(() => {})
        }
      }
    } catch {}

    // Load online technicians for live matching
    api.getTechnicians().then(setAvailableTechnicians).catch(() => {})
    const techPoll = setInterval(() => {
      api.getTechnicians().then(setAvailableTechnicians).catch(() => {})
    }, 4000)
    return () => clearInterval(techPoll)
  }, [])

  // 3-Minute OTP countdown timer
  useEffect(() => {
    if (authMode !== 'VERIFY_OTP' && (authMode !== 'FORGOT_PASSWORD' || resetStep !== 2)) return
    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [authMode, resetStep])

  // Poll active order state every 2 seconds for real-time synchronization with Technician & Admin
  useEffect(() => {
    if (!activeOrder?.job?.id) return
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getJob(activeOrder.job.id)
        if (!fresh) return

        const statusChanged = fresh.status !== activeOrder.job.status
        const descChanged = fresh.description !== activeOrder.job.description
        const durationChanged = fresh.durationMinutes !== activeOrder.job.durationMinutes

        if (statusChanged || descChanged || durationChanged) {
          const rawAssign = fresh.assignments?.[0]
          
          let prevDesc: any = {}
          let freshDesc: any = {}
          try {
            if (activeOrder.job.description) prevDesc = JSON.parse(activeOrder.job.description)
          } catch {}
          try {
            if (fresh.description) freshDesc = JSON.parse(fresh.description)
          } catch {}

          const techName = rawAssign?.technician?.name || activeOrder.assignment?.technician?.name || 'Alex Martinez'

          if (fresh.status === 'ASSIGNED' && hasShownAssignedPopupRef.current !== fresh.id) {
            hasShownAssignedPopupRef.current = fresh.id
            setShowAssignedPopup(true)
          }

          // Real-time audio and toast notifications reflecting technician actions
          if (freshDesc.isAccepted && !prevDesc.isAccepted) {
            playDispatchChime()
            showToast(`Captain ${techName} has ACCEPTED your service order! Preparing toolkit.`)
          } else if (freshDesc.transitStage === 'EN_ROUTE' && prevDesc.transitStage !== 'EN_ROUTE') {
            playDispatchChime()
            showToast(`Partner ${techName} is EN ROUTE to your address! Tracking radar live.`)
          } else if (freshDesc.transitStage === 'ARRIVED' && prevDesc.transitStage !== 'ARRIVED') {
            playArrivalChime()
            showToast(`Partner ${techName} has ARRIVED at your gate! Please share PIN ${activeOrder.otp || '4829'}.`)
          } else if (fresh.status === 'IN_PROGRESS' && activeOrder.job.status !== 'IN_PROGRESS') {
            playDispatchChime()
            showToast(`Security PIN verified! ${techName} started repairs on site.`)
          } else if (fresh.status === 'COMPLETED') {
            if (activeOrder.job.status !== 'COMPLETED') {
              playSuccessChime()
              showToast(`Service completed! Official tax invoice and 30-day warranty certificate ready.`)
            }
            if (hasShownCompletionModalRef.current !== fresh.id) {
              hasShownCompletionModalRef.current = fresh.id
              playSuccessChime()
              setShowCompletionModal(true)
              // Trigger service completion email to customer
              api.sendCompletionEmail(fresh.id, {
                customerName: profile?.name || 'Valued Customer',
                email: profile?.email || 'customer@dispatchgrid.in',
                techName,
              }).catch(() => {})
            }
          } else if (freshDesc.reassignedTo && freshDesc.reassignedTo !== prevDesc.reassignedTo) {
            playDispatchChime()
            showToast(`Reassigned to Captain ${freshDesc.reassignedTo}! Previous partner declined.`)
            setReallocationSecondsLeft(60)
          } else if (fresh.status === 'PENDING' && activeOrder.job.status === 'ASSIGNED') {
            playAlertChime()
            showToast('Partner declined. Waiting for next qualified partner to come online...')
          } else if (freshDesc.complication && (!prevDesc.complication || freshDesc.complication.reportedAt !== prevDesc.complication.reportedAt)) {
            playAlertChime()
            showToast(`Live Field Update: "${freshDesc.complication.reason}" (+${freshDesc.complication.delayMinutes}m). SLA Deadline automatically extended!`)
          }

          setActiveOrder((prev: any) => ({
            ...prev,
            job: fresh,
            assignment: rawAssign || (fresh.status === 'PENDING' ? null : prev?.assignment),
          }))

          // Sync into localStorage bookings history
          setBookings((prev) => {
            const updated = prev.map((b) => (b.id === fresh.id ? { ...b, status: fresh.status, description: fresh.description, durationMinutes: fresh.durationMinutes } : b))
            try {
              localStorage.setItem('dg_user_bookings', JSON.stringify(updated))
            } catch {}
            return updated
          })
        }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [activeOrder?.job?.id, activeOrder?.job?.status, activeOrder?.job?.description, activeOrder?.job?.durationMinutes])

  // 1-minute Acceptance & Reallocation countdown (Active strictly while !desc.isAccepted)
  useEffect(() => {
    if (!activeOrder?.job?.id || activeOrder.job.status !== 'ASSIGNED') return
    let desc: any = {}
    try {
      if (activeOrder.job.description) desc = JSON.parse(activeOrder.job.description)
    } catch {}

    // Once accepted, reallocation window stops completely!
    if (desc.isAccepted) return

    const expiresAtMs = desc.offerExpiresAt
      ? new Date(desc.offerExpiresAt).getTime()
      : (activeOrder.job.createdAt ? new Date(activeOrder.job.createdAt).getTime() + 60000 : Date.now() + 60000)

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
      setReallocationSecondsLeft(remaining)

      if (remaining === 0 && !desc.isAccepted && hasAutoDeclinedRef.current !== activeOrder.job.id) {
        hasAutoDeclinedRef.current = activeOrder.job.id
        api.declineJob(activeOrder.job.id, 'Acceptance window timeout (60s)')
          .then((res: any) => {
            if (res?.reassigned) {
              playDispatchChime()
              showToast(`60s Window expired! Auto-reallocated to Captain ${res.backupTechName || 'next partner'}!`)
              setReallocationSecondsLeft(60)
            } else {
              showToast('Partner did not accept within 60s. Job placed in high-priority standby queue.')
            }
          })
          .catch(() => {})
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [activeOrder?.job?.id, activeOrder?.job?.status, activeOrder?.job?.description])

  // Distance Calculation between assigned / preferred tech and customer zone
  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 3.2
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Transparent Fare Breakdown Calculations (Urban Company Style)
  const defaultServiceCharge = 150
  const selectedTech = availableTechnicians.find((t: any) => t.id === preferredTechId) || availableTechnicians[0]
  const techLat = selectedTech?.latitude || 12.95
  const techLng = selectedTech?.longitude || 77.58
  const distanceKm = calculateDistanceKm(techLat, techLng, selectedZone.lat, selectedZone.lng)
  const isDistanceOver5Km = distanceKm > 5.0
  const distanceSurchargeFee = isDistanceOver5Km ? 50 : 0

  const baseTradePrice = selectedCategory.basePrice
  const prioritySpeedFee = priority === 'CRITICAL' ? 200 : priority === 'HIGH' ? 100 : 0
  const safetyEquipmentFee = 49
  const cloudPlatformFee = 29
  const subtotalBeforeTax =
    baseTradePrice + defaultServiceCharge + distanceSurchargeFee + prioritySpeedFee + safetyEquipmentFee + cloudPlatformFee
  const gstTaxAmount = Math.round(subtotalBeforeTax * 0.18)
  const totalEstimatedFare = subtotalBeforeTax + gstTaxAmount

  // 1-Click Saved Address Switcher (Feature 1)
  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id)
    setStreetAddress(addr.address)
    const matchingZone = ZONES.find((z) => z.id === addr.zoneId)
    if (matchingZone) {
      setSelectedZone(matchingZone)
    }
    showToast(`Set to ${addr.label} (${matchingZone?.name.split('(')[0].trim() || 'Hub'})`)
  }

  // Cancellation Reason Survey Modal Handlers (Feature 2)
  const handleOpenCancelModal = () => {
    setCancelReason('Technician ETA is too long / delayed')
    setCancelNotes('')
    setShowCancelModal(true)
  }

  const handleConfirmCancellation = async () => {
    if (!activeOrder?.job?.id) return
    setIsCancelling(true)
    try {
      const jobId = activeOrder.job.id
      const isPartnerAtDoorstep = (() => {
        try {
          if (!activeOrder?.job?.description) return false
          const desc = JSON.parse(activeOrder.job.description)
          return desc.transitStage === 'ARRIVED' || desc.transitStage === 'IN_PROGRESS' || !!desc.arrivedAt
        } catch {
          return false
        }
      })()

      const penaltyAmount = isPartnerAtDoorstep ? 150 : 0

      await api.updateJobState(jobId, 'CANCELLED')
      if (penaltyAmount > 0) {
        await api.updateJobTransit(jobId, {
          cancellationPenalty: penaltyAmount,
          cancelledAfterArrival: true,
        }).catch(() => {})
      }

      setActiveOrder(null)
      setShowCancelModal(false)
      showToast(
        penaltyAmount > 0
          ? `Booking cancelled. Doorstep arrival penalty of ₹150 applied to partner compensation.`
          : `Booking cancelled: "${cancelReason}". Partner returned to fleet.`
      )

      setBookings((prev) => {
        const updated = prev.map((b) =>
          b.id === jobId
            ? {
                ...b,
                status: 'CANCELLED',
                cancellationReason: cancelReason,
                cancellationPenalty: penaltyAmount,
              }
            : b
        )
        try {
          localStorage.setItem('dg_user_bookings', JSON.stringify(updated))
        } catch {}
        return updated
      })
    } catch (err: any) {
      showToast(`Cancellation failed: ${err.message}`)
    } finally {
      setIsCancelling(false)
    }
  }

  // 1. Send Login Email OTP
  const handleSendLoginOtp = async (emailTarget?: string) => {
    const target = (emailTarget || authEmail).trim().toLowerCase()
    if (!target || !target.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      await api.sendOtp({ email: target, type: 'LOGIN' })
      setAuthEmail(target)
      setAuthOtp('')
      setOtpSecondsLeft(180)
      setOtpActionType('LOGIN')
      setAuthMode('VERIFY_OTP')
      showToast(`Verification PIN sent to ${target}! Check your inbox.`)
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send OTP')
    } finally {
      setAuthLoading(false)
    }
  }

  // 2. Send Registration Email OTP
  const handleSendRegisterOtp = async () => {
    if (!authForm.name || !authForm.phone || !authForm.email || !authForm.address) {
      setAuthError('Please fill in Name, Phone, Email, and Address.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      await api.sendOtp({
        email: authForm.email.trim().toLowerCase(),
        type: 'REGISTER',
        name: authForm.name.trim(),
        phone: authForm.phone.trim(),
        address: authForm.address.trim(),
        age: parseInt(authForm.age) || 28,
      })
      setAuthEmail(authForm.email.trim().toLowerCase())
      setAuthOtp('')
      setOtpSecondsLeft(180)
      setOtpActionType('REGISTER')
      setAuthMode('VERIFY_OTP')
      showToast(`Registration PIN sent to ${authForm.email}! Check your inbox.`)
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send registration OTP')
    } finally {
      setAuthLoading(false)
    }
  }

  // 3. Verify OTP Code and Log In
  const handleVerifyOtp = async () => {
    if (!authOtp || authOtp.length < 4) {
      setAuthError('Please enter the 6-digit verification PIN.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await api.verifyOtp(authEmail, authOtp.trim())
      const cust = res.customer
      const newProfile: CustomerProfile = {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        age: cust.age,
      }
      setProfile(newProfile)
      setStreetAddress(newProfile.address)
      try {
        localStorage.setItem('dg_customer_profile', JSON.stringify(newProfile))
      } catch {}
      setShowAuthModal(false)
      showToast(`Verified via Email OTP! Welcome ${newProfile.name}`)

      if (pendingBookingAfterAuth) {
        setPendingBookingAfterAuth(false)
        setTimeout(() => executeBooking(newProfile), 300)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed. Please check the PIN.')
    } finally {
      setAuthLoading(false)
    }
  }

  // 4. Password Login
  const handlePasswordLogin = async () => {
    if (!authEmail || !authPassword) {
      setAuthError('Please enter your email and password.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await api.loginWithPassword(authEmail.trim().toLowerCase(), authPassword)
      const cust = res.customer
      const newProfile: CustomerProfile = {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        age: cust.age,
      }
      setProfile(newProfile)
      setStreetAddress(newProfile.address)
      try {
        localStorage.setItem('dg_customer_profile', JSON.stringify(newProfile))
      } catch {}
      setShowAuthModal(false)
      showToast(`Signed in as ${newProfile.name}!`)

      if (pendingBookingAfterAuth) {
        setPendingBookingAfterAuth(false)
        setTimeout(() => executeBooking(newProfile), 300)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check your password.')
    } finally {
      setAuthLoading(false)
    }
  }

  // 5. Send Reset Password OTP
  const handleSendResetOtp = async () => {
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Please enter a valid email to reset password.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      await api.sendOtp({ email: authEmail.trim().toLowerCase(), type: 'RESET_PASSWORD' })
      setResetStep(2)
      setAuthOtp('')
      setOtpSecondsLeft(180)
      showToast(`Password reset PIN sent to ${authEmail}! Check your inbox.`)
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send password reset OTP')
    } finally {
      setAuthLoading(false)
    }
  }

  // 6. Reset Password Submit
  const handleResetPasswordSubmit = async () => {
    if (!authOtp || !newPassword || !confirmPassword) {
      setAuthError('Please enter the OTP and both password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify.')
      return
    }
    if (newPassword.length < 4) {
      setAuthError('Password must be at least 4 characters long.')
      return
    }
    setAuthLoading(true)
    setAuthError(null)
    try {
      await api.resetPassword({
        email: authEmail.trim().toLowerCase(),
        otp: authOtp.trim(),
        newPassword,
      })
      showToast('Password changed in database! Please login with your new password.')
      setAuthPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setAuthOtp('')
      setResetStep(1)
      setAuthMode('LOGIN')
      setLoginMethod('PASSWORD')
    } catch (err: any) {
      setAuthError(err.message || 'Failed to reset password.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = () => {
    try {
      localStorage.removeItem('dg_customer_profile')
    } catch {}
    setProfile(null)
    setStreetAddress('')
    setAuthEmail('')
    setAuthForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      age: '29',
    })
    showToast('Signed out. Reset to Guest Mode!')
  }

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    if (profile) {
      setAuthForm({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        age: profile.age.toString(),
      })
      setAuthEmail(profile.email)
    } else {
      setAuthForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        age: '29',
      })
      setAuthEmail('')
    }
    setAuthMode(mode)
    setAuthPassword('')
    setAuthOtp('')
    setAuthError(null)
    setShowAuthModal(true)
  }

  // Instant booking request (Uber/Rapido/Zepto instant matching)
  const executeBooking = async (custProfile?: CustomerProfile) => {
    const currentCust = custProfile || profile
    if (!currentCust) {
      openAuthModal('LOGIN')
      setPendingBookingAfterAuth(true)
      return
    }

    setIsMatching(true)
    const title = customTitle.trim() || `${selectedCategory.name} Urgent Service`
    const now = new Date()
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const slaDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000)
    // Generate secure 4-digit start-service PIN (Uber/Urban Company style)
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString()

    const customerDossier: any = {
      customerId: currentCust.id,
      name: currentCust.name,
      phone: currentCust.phone,
      email: currentCust.email,
      address: streetAddress.trim() || currentCust.address,
      age: currentCust.age,
      gateNote: gateNote.trim() || 'Flat 402, Ring bell twice',
      customIssue: customTitle.trim() || `${selectedCategory.name} issue`,
      servicePin: generatedOtp,
    }

    const payload = {
      title,
      description: JSON.stringify(customerDossier),
      customerId: currentCust.id || undefined,
      preferredTechId: preferredTechId || undefined,
      priority,
      durationMinutes: parseInt(selectedCategory.avgTime) || 45,
      requiredSkills: [selectedCategory.skill],
      serviceZone: selectedZone.id,
      latitude: selectedZone.lat,
      longitude: selectedZone.lng,
      windowStart: now.toISOString(),
      windowEnd: windowEnd.toISOString(),
      slaDeadline: slaDeadline.toISOString(),
    }

    const txnId = 'DG-PAY-' + Math.floor(100000 + Math.random() * 900000)
    customerDossier.paymentMethod = selectedPaymentMethod
    customerDossier.paymentTxnId = txnId
    customerDossier.paymentStatus = selectedPaymentMethod === 'POD' ? 'PAY_ON_COMPLETION' : 'PAID_PREPAID'
    payload.description = JSON.stringify(customerDossier)

    try {
      if (selectedPaymentMethod !== 'POD') {
        setIsAuthorizingPayment(true)
        showToast(`Authorizing ₹${totalEstimatedFare} via NPCI / Razorpay Sandbox...`)
        await new Promise((r) => setTimeout(r, 1200))
        setIsAuthorizingPayment(false)
        showToast(`Payment Authorized! Ref: ${txnId}`)
      } else {
        await new Promise((r) => setTimeout(r, 800))
      }
      const res = await api.instantMatch(payload)
      const orderData = {
        ...res,
        otp: generatedOtp,
        gateNote: customerDossier.gateNote,
        customer: customerDossier,
        paymentMethod: selectedPaymentMethod,
        paymentTxnId: txnId,
      }
      setActiveOrder(orderData)
      setReallocationSecondsLeft(60) // Reset 1m reallocation countdown
      playDispatchChime()
      showToast('Technician matched & dispatched instantly!')
      setShowAssignedPopup(true)
      hasShownAssignedPopupRef.current = res.job.id

      // Save to customer's personal booking history
      const newBookingRecord = {
        id: res.job.id,
        title: res.job.title,
        category: selectedCategory.name,
        zone: selectedZone.name,
        priority,
        totalAmount: totalEstimatedFare,
        status: res.job.status,
        otp: generatedOtp,
        gateNote: orderData.gateNote,
        technicianName: res.assignment?.technician?.name || 'Alex Martinez',
        customer: customerDossier,
        paymentMethod: selectedPaymentMethod,
        paymentTxnId: txnId,
        createdAt: new Date().toISOString(),
      }
      const updatedList = [newBookingRecord, ...bookings]
      setBookings(updatedList)
      try {
        localStorage.setItem('dg_user_bookings', JSON.stringify(updatedList))
      } catch {}
    } catch (err: any) {
      showToast(`Booking failed: ${err.message}`)
    } finally {
      setIsMatching(false)
    }
  }

  const handleInstantBook = () => executeBooking()

  const handleNewBooking = () => {
    setActiveOrder(null)
    setRating(null)
    setCustomTitle('')
  }

  const downloadInvoice = (orderItem?: any) => {
    const job = orderItem?.job || activeOrder?.job || orderItem
    if (!job) return
    const techName = activeOrder?.assignment?.technician?.name || orderItem?.technicianName || 'Alex Martinez'
    const price = orderItem?.totalAmount || activeOrder?.totalAmount || totalEstimatedFare
    const cust = orderItem?.customer || activeOrder?.customer || profile || {
      name: 'Valued Resident',
      phone: '+91 98450 12345',
      email: 'customer@dispatchgrid.in',
      address: streetAddress || 'Bengaluru, Karnataka',
      age: 28,
    }

    let parsedDesc: any = {}
    try {
      if (job.description) parsedDesc = JSON.parse(job.description)
    } catch {}

    const partsList: { name: string; price: number }[] = []
    if (parsedDesc.selectedParts && parsedDesc.selectedParts.length > 0) {
      parsedDesc.selectedParts.forEach((partId: string) => {
        const part = COMMON_PARTS.find((p: ConsumablePart) => p.id === partId)
        if (part) {
          partsList.push({ name: part.name, price: part.price })
        }
      })
    }

    downloadOfficialInvoicePdf({
      jobId: job.id || 'dg-job-001',
      invoiceNumber: `INV-DG-${job.id?.slice(0, 8).toUpperCase() || '2026-001'}`,
      date: new Date().toLocaleString('en-IN'),
      serviceTitle: job.title || selectedCategory.name,
      serviceZone: job.serviceZone || selectedZone.name,
      priority: job.priority || priority,
      customerName: cust.name || 'Valued Customer',
      customerPhone: cust.phone || '+91 98450 00000',
      customerEmail: cust.email || 'customer@dispatchgrid.in',
      customerAddress: cust.address || streetAddress || 'Bengaluru, Karnataka',
      customerAge: cust.age || 28,
      technicianName: techName,
      partnerId: 'DG-PARTNER-402',
      baseLabor: baseTradePrice,
      speedFee: prioritySpeedFee,
      safetyFee: safetyEquipmentFee,
      platformFee: cloudPlatformFee,
      gstTax: gstTaxAmount,
      totalAmount: price,
      partsInstalled: partsList,
      resolutionNote: parsedDesc.resolutionNote,
      paymentMethod: activeOrder?.paymentMethod || orderItem?.paymentMethod || selectedPaymentMethod || 'UPI',
      paymentTxnId: activeOrder?.paymentTxnId || orderItem?.paymentTxnId || 'DG-PAY-88412',
      paymentStatus: 'Paid & Verified',
    })

    showToast('Official Tax Invoice (PDF) generated & downloaded!')
  }

  const clearCustomerHistory = () => {
    localStorage.removeItem('dg_user_bookings')
    setBookings([])
    showToast('Customer history cleared. Fresh user profile!')
  }

  const assignedTech = activeOrder?.assignment?.technician
  const jobStatus = activeOrder?.job?.status || 'PENDING'
  let activeOrderDesc: any = {}
  try {
    if (activeOrder?.job?.description) {
      activeOrderDesc = JSON.parse(activeOrder.job.description)
    }
  } catch {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Customer Hero Header */}
      <div className="glass-panel rounded-2xl p-6 border-indigo-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <IconZap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">
                DispatchGrid <span className="text-indigo-400">Instant</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 uppercase tracking-wider font-mono">
                Live On-Demand
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-lg">
              Book certified emergency trade specialists in seconds. Intelligent on-demand dispatch matching the nearest qualified fleet partner with zero wait.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Dispatched Mails Feed Button */}
            <button
              type="button"
              onClick={handleOpenMailFeed}
              className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-200 text-xs font-bold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="Inspect dispatched real transactional emails & verification PINs"
            >
              <IconMail className="w-4 h-4 text-cyan-400" />
              <span>Mails Feed</span>
              {recentEmails.length > 0 && (
                <span className="bg-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                  {recentEmails.length}
                </span>
              )}
            </button>

            {/* My Bookings History Button */}
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              title="View my booking receipts and order history"
            >
              <span>My Bookings</span>
              <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                {bookings.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs text-indigo-200 flex items-center justify-between shadow-xl animate-float-slow">
          <div className="flex items-center gap-2">
            <IconSparkles className="w-4 h-4 text-cyan-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Customer Profile Status Bar (Login / Identity) */}
      {profile ? (
        <div className="glass-panel rounded-2xl p-4 border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{profile.name}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {profile.age} yrs • Resident
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/80 px-2 py-0.5 rounded font-mono">
                  Active Session
                </span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/80 px-2 py-0.5 rounded font-mono">
                  {profile.id ? `SQLite DB: ${profile.id.slice(0, 8)}...` : 'Database Verified'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1"><IconPhone className="w-3 h-3 text-slate-400" /> {profile.phone}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><IconMail className="w-3 h-3 text-slate-400" /> {profile.email}</span>
              </div>
              <div className="text-xs text-cyan-300 mt-1 flex items-center gap-1 font-medium">
                <IconMapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate max-w-md">{streetAddress || profile.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => openAuthModal('REGISTER')}
              className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-bold text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* MAIDPOOL-INSPIRED HIGH-TRUST GUEST ONBOARDING SHOWCASE */}
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          {/* Hero Header with Badge */}
          <div className="space-y-3 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 font-mono shadow-sm">
                <IconShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>100% Verified & Trusted Fleet • South Bangalore</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                Modeled after mAidpool & Urban Company
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Emergency Home & Office Trade Specialists in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300">South Bangalore</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Professional, police-verified technicians for emergency pipe repairs, short circuits, air conditioning, and electrical diagnostics. Serving JP Nagar, Koramangala, BTM Layout, HSR, Indiranagar & Whitefield with <strong className="text-white">100% SLA Satisfaction Guarantee!</strong>
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 relative z-10 pt-1">
            <button
              type="button"
              onClick={() => openAuthModal('LOGIN')}
              className="btn-solid-cream text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
            >
              <IconMail className="w-4 h-4 text-[#180018]" />
              <span>Sign In / Register with Email OTP</span>
            </button>

            <button
              type="button"
              onClick={() => showToast('Connecting to 24/7 Dispatch Control Room: +91 74839 59021 (Simulated Call)')}
              className="btn-solid-secondary text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm"
            >
              <IconPhone className="w-4 h-4 text-emerald-400" />
              <span>Call Fleet Desk +91 74839 59021</span>
            </button>
          </div>

          {/* 4 Core Maidpool Trust Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 pt-2 border-t border-slate-800/80">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <IconShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">100% Verified</div>
                <div className="text-[10px] text-slate-400">Background Checked</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <IconZap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">45-Min SLA</div>
                <div className="text-[10px] text-slate-400">Zero-Wait Dispatch</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 flex-shrink-0">
                <IconStar className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">4.9 / 5.0 Rating</div>
                <div className="text-[10px] text-slate-400">1,200+ Dispatches</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <IconCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">100% Assured</div>
                <div className="text-[10px] text-slate-400">30-Day Warranty</div>
              </div>
            </div>
          </div>

          {/* 3-Step "How It Works" Interactive Stepper */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40 relative z-10 space-y-2.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between font-mono">
              <span>HOW DISPATCHGRID WORKS (3 SIMPLE STEPS)</span>
              <span className="text-cyan-400">Pre-Book or Instant Callout</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">1</span>
                <span>Choose Trade Skill from catalog below</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">2</span>
                <span>Intelligent algorithm matches nearest fleet</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">3</span>
                <span>Share 4-Digit PIN & receive official GST invoice</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE ORDER SCREEN (Uber/Zepto Live Tracking) */}
      {activeOrder ? (
        <div className="glass-panel rounded-2xl border-emerald-500/40 p-6 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Live Booking Status</div>
              <h3 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                {jobStatus === 'ASSIGNED' && (
                  <>
                    <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping inline-block" />
                    <span>Technician Dispatched & En Route</span>
                  </>
                )}
                {jobStatus === 'IN_PROGRESS' && (
                  <>
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse inline-block" />
                    <span className="text-amber-400">Service In Progress On-Site</span>
                  </>
                )}
                {jobStatus === 'COMPLETED' && (
                  <>
                    <IconCheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Service Completed</span>
                  </>
                )}
                {jobStatus === 'CANCELLED' && (
                  <>
                    <IconXCircle className="w-5 h-5 text-rose-400" />
                    <span className="text-rose-400">Booking Cancelled</span>
                  </>
                )}
                {jobStatus === 'PENDING' && (
                  <>
                    <IconRotateCw className="w-5 h-5 text-indigo-400 animate-spin" />
                    <span>Matching Nearest Specialist...</span>
                  </>
                )}
              </h3>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
              Ticket #{activeOrder.job.id.slice(0, 8)}
            </span>
          </div>

          {/* Stepper (Uber/Zepto style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
            {[
              { label: '1. Confirmed', active: true, done: true },
              { 
                label: activeOrderDesc.transitStage === 'ARRIVED' 
                  ? '2. At Gate' 
                  : activeOrderDesc.isAccepted 
                  ? '2. Accepted by Captain' 
                  : '2. Dispatched', 
                active: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(jobStatus), 
                done: activeOrderDesc.transitStage === 'ARRIVED' || ['IN_PROGRESS', 'COMPLETED'].includes(jobStatus) 
              },
              { 
                label: '3. Repair On-Site', 
                active: ['IN_PROGRESS', 'COMPLETED'].includes(jobStatus), 
                done: jobStatus === 'COMPLETED' 
              },
              { 
                label: '4. Done & Warranty', 
                active: jobStatus === 'COMPLETED', 
                done: jobStatus === 'COMPLETED' 
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  step.done
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                    : step.active
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-sm glow-pill-indigo'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-xs font-bold">{step.label}</div>
              </div>
            ))}
          </div>

          {/* Captain Accepted Order Banner */}
          {activeOrderDesc.isAccepted && activeOrderDesc.transitStage !== 'ARRIVED' && jobStatus === 'ASSIGNED' && (
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 p-3.5 rounded-2xl border border-emerald-500/60 shadow-md flex items-center justify-between gap-3 animate-float-slow">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-sm font-bold">
                  <IconCheck className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-emerald-300 font-bold text-xs uppercase tracking-wider font-mono">
                    Order Accepted by {assignedTech?.name || 'Captain'}
                  </div>
                  <div className="text-white text-xs mt-0.5">
                    Your technician has accepted the dispatch and is preparing safety gear and toolkit.
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-300 px-2.5 py-1 rounded-full font-mono shrink-0">
                Captain Confirmed
              </span>
            </div>
          )}

          {/* Standout Gate Arrival Alert Banner (When Technician arrives at customer gate) */}
          {activeOrderDesc.transitStage === 'ARRIVED' && jobStatus === 'ASSIGNED' && (
            <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 p-4 rounded-2xl border-2 border-amber-500 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-inner">
                  <IconBell className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-amber-300 font-black text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>Partner Has Arrived at Your Gate!</span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                      Action Required
                    </span>
                  </div>
                  <div className="text-white text-xs mt-1">
                    {assignedTech?.name || 'Alex Martinez'} has reached your premises. Share the 4-digit security PIN to grant entrance & commence work.
                  </div>
                </div>
              </div>
              <div className="bg-amber-500/20 border border-amber-400/80 px-5 py-2.5 rounded-xl text-center glow-pill-amber">
                <div className="text-[10px] uppercase font-mono font-bold text-amber-200">Security PIN</div>
                <div className="font-mono text-3xl font-black text-white tracking-widest">{activeOrder.otp || '4829'}</div>
              </div>
            </div>
          )}

          {/* On-Site Delay / Complication Notification Banner */}
          {activeOrderDesc.complication && (
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/60 shadow-lg flex items-start gap-3">
              <IconAlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-amber-400 font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>Field Technician Update — SLA Schedule Extended</span>
                  <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-700/60 font-mono">
                    +{activeOrderDesc.complication.delayMinutes}m Extended
                  </span>
                </div>
                <div className="text-white text-xs mt-1 font-medium">
                  "{activeOrderDesc.complication.reason}"
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <IconShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DispatchGrid Guarantee: Your booking price is 100% price-locked. Schedule recovery engine has shifted downstream routes.</span>
                </div>
              </div>
            </div>
          )}

          {/* 4-Digit Service Start Verification PIN (Feature 5) */}
          {jobStatus !== 'COMPLETED' && jobStatus !== 'CANCELLED' && (
            <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 p-4 rounded-2xl border border-indigo-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider flex items-center gap-1.5 font-mono">
                  <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Start-Service Security Verification PIN</span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Share this 4-digit code with {assignedTech?.name || 'technician'} upon arrival to begin work:
                </div>
              </div>
              <div className="bg-indigo-600/30 border border-indigo-500/80 px-4 py-2 rounded-xl font-mono text-2xl font-black text-white tracking-widest glow-pill-indigo">
                {activeOrder.otp || '4829'}
              </div>
            </div>
          )}

          {/* Phase 1 vs Phase 2: Awaiting Acceptance (Reallocation Window Running) vs Accepted (Arrival Time Confirmed & Locked) */}
          {jobStatus !== 'COMPLETED' && jobStatus !== 'CANCELLED' && (
            !activeOrderDesc.isAccepted ? (
              /* Phase 1: Waiting for partner acceptance -> Reallocation countdown runs; arrival time NOT shown yet */
              <div className="bg-gradient-to-r from-slate-900 via-amber-950/60 to-slate-900 p-4 sm:p-5 rounded-2xl border border-amber-500/50 shadow-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-amber-300 uppercase font-bold tracking-wider flex items-center gap-1.5 font-mono">
                      <IconClock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>Reallocation Window Running • Partner Acceptance</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1 flex flex-wrap items-center gap-2">
                      <span>Waiting for Partner Response:</span>
                      <span className="font-mono px-3 py-1 rounded-xl border text-base font-bold shadow-md bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse">
                        {reallocationSecondsLeft}s remaining
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                      <IconMapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Offer dispatched to Captain <strong className="text-white">{assignedTech?.name}</strong> ({activeOrderDesc.distanceKm || 2.4} km away). Auto-reallocates to next backup if no response in {reallocationSecondsLeft}s.
                      </span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-full bg-amber-950 border border-amber-700/80 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>Reallocation Window Active</span>
                  </div>
                </div>

                {/* Reallocation Progress Bar (ticks down from 60 to 0) */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${Math.min(100, Math.max(5, (reallocationSecondsLeft / 60) * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Dispatched (0s)</span>
                    <span>Auto-Reallocation Cutoff (60s)</span>
                  </div>
                </div>

                <div className="text-[11px] text-amber-200/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50 flex items-center gap-2">
                  <IconShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Arrival time will confirm and lock immediately once Captain {assignedTech?.name} accepts your service request.
                  </span>
                </div>
              </div>
            ) : (
              /* Phase 2: Partner Accepted! Reallocation window completely removed. Arrival Time is now activated and confirmed! */
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950/70 to-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-500/50 shadow-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider flex items-center gap-1.5 font-mono">
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Captain Accepted • Arrival Schedule Confirmed</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1 flex flex-wrap items-center gap-2">
                      <span>Confirmed Arrival:</span>
                      <span className="font-mono px-3 py-1 rounded-xl border text-base font-bold shadow-md bg-emerald-950/80 text-emerald-300 border-emerald-600 glow-pill-emerald">
                        Today by {activeOrderDesc.scheduledArrivalTime || '06:30 PM'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        (~{Math.max(12, Math.round((activeOrderDesc.distanceKm || 2.4) * 3))} mins transit)
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                      <IconMail className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Official arrival schedule & PIN confirmation dispatched to <strong className="text-white">{activeOrderDesc.email || 'your email'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Transit Status Badge */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm ${
                      jobStatus === 'IN_PROGRESS'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                        : activeOrderDesc.transitStage === 'ARRIVED'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600 animate-pulse'
                        : activeOrderDesc.transitStage === 'EN_ROUTE'
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600'
                        : 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      <span>
                        {jobStatus === 'IN_PROGRESS'
                          ? 'Partner Working On-Site'
                          : activeOrderDesc.transitStage === 'ARRIVED'
                          ? 'Partner At Gate (Share PIN)'
                          : activeOrderDesc.transitStage === 'EN_ROUTE'
                          ? 'En Route via Main Arterial Corridor'
                          : 'Order Accepted & En Route'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Transit Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-sm"
                      style={{
                        width: `${
                          jobStatus === 'IN_PROGRESS'
                            ? 100
                            : activeOrderDesc.transitStage === 'ARRIVED'
                            ? 90
                            : activeOrderDesc.transitStage === 'EN_ROUTE'
                            ? 60
                            : 35
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Hub Dispatched</span>
                    <span>Transit Corridor</span>
                    <span>{activeOrderDesc.address || 'Delivery Address'}</span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Assigned Technician Profile Card (Partner Card with Verified Badges & Vehicle) */}
          {assignedTech ? (
            <div className="space-y-4">
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {assignedTech.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{assignedTech.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                        <IconShieldCheck className="w-3 h-3" /> Verified Partner
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono hidden sm:inline">
                        Background Checked
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <IconStar className="w-3.5 h-3.5 fill-amber-400" /> 4.9 (142 ratings)
                      </span>
                      <span>•</span>
                      <span>{assignedTech.skills?.join(', ')}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">98% On-Time SLA</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                      <IconBike className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Honda Activa 6G • #KA-05-MN-4821 (Toolkit Onboard)</span>
                    </div>
                  </div>
                </div>

                {/* Transit & Contact Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="text-right mr-2 hidden sm:block">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Worksite Distance</div>
                    <div className="text-base font-bold text-cyan-400 font-mono">
                      {activeOrderDesc.distanceKm || activeOrderDesc.techDistance || 2.4} km away
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Arrival: Today by {activeOrderDesc.scheduledArrivalTime || '06:30 PM'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast(`Calling ${assignedTech.name}... (Simulated Direct Partner Dispatch Line +91 98860 12345)`)}
                    className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold p-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="Call Technician"
                  >
                    <IconPhone className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Call Partner</span>
                  </button>
                </div>
              </div>

              {/* Decision Engine Candidate Ranking Audit (Why this person was chosen over someone else) */}
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-indigo-500/30 space-y-3.5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <IconShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                      Fleet Dispatch Decision Engine • Candidate Proximity Audit
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded-lg">
                    FOR JUDGE SHOWCASE
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong>Why was this person chosen over someone else?</strong>{' '}
                  <span className="text-cyan-200">
                    {activeOrderDesc.dispatchReason ||
                      `Captain ${assignedTech.name} was chosen because they are located ${activeOrderDesc.distanceKm || 2.4} km from worksite (${activeOrderDesc.address || 'Prestige Falcon City'}), which is the closest distance among all qualified specialists.`}
                  </span>
                </div>

                {/* Candidate Ranking Comparison Table */}
                {activeOrderDesc.candidateRanking && activeOrderDesc.candidateRanking.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Technician</th>
                          <th className="py-2.5 px-3">GPS Distance from Worksite</th>
                          <th className="py-2.5 px-3">Qualification</th>
                          <th className="py-2.5 px-3">Engine Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                        {activeOrderDesc.candidateRanking.map((cand: any, idx: number) => (
                          <tr
                            key={cand.techId || idx}
                            className={cand.isChosen ? 'bg-indigo-950/40 text-cyan-200 font-bold' : 'hover:bg-slate-900/50'}
                          >
                            <td className="py-2.5 px-3 font-black text-white">#{cand.rank || idx + 1}</td>
                            <td className="py-2.5 px-3 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              <span>{cand.techName}</span>
                            </td>
                            <td className="py-2.5 px-3 text-cyan-300 font-black">
                              {cand.distanceKm} km
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                                cand.isQualified ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {cand.isQualified ? 'Trade Qualified' : 'Alternative Skill'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {cand.isChosen ? (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-600 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                  <IconCheck className="w-3 h-3" /> SELECTED #1
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Backup (+{(cand.distanceKm - (activeOrderDesc.distanceKm || 2.4)).toFixed(1)} km)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-3">
              <IconAlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Searching qualified backup partners...</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  All local technicians currently on active jobs. Dispatch system actively searching nearest available specialist.
                </div>
              </div>
            </div>
          )}

          {/* Customer Profile Dossier attached to this booking */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Delivery Contact (Billed To)</div>
              <div className="text-white mt-1 font-bold flex items-center gap-2">
                <span>{activeOrder.customer?.name || profile?.name || 'Rahul Sharma'}</span>
                <span className="text-[10px] text-slate-400">({activeOrder.customer?.age || profile?.age || 29} yrs)</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1"><IconPhone className="w-3 h-3 text-slate-400" /> {activeOrder.customer?.phone || profile?.phone || '+91 98765 43210'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><IconMail className="w-3 h-3 text-slate-400" /> {activeOrder.customer?.email || profile?.email || 'customer@example.com'}</span>
              </div>
              <div className="text-[11px] text-cyan-300 mt-0.5 flex items-center gap-1">
                <IconMapPin className="w-3 h-3 text-cyan-400" />
                <span>{activeOrder.customer?.address || profile?.address || 'Flat 402, Tower B, Prestige Falcon City'}</span>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono border border-slate-700">
              Verified Order
            </span>
          </div>

          {/* Gate Notes Attached to Order (Feature 3) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gate / Arrival Instructions for Partner</div>
              <div className="text-slate-200 mt-1 font-medium">{activeOrder.gateNote || 'Flat 402, Ring bell twice'}</div>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
              Sent to Partner
            </span>
          </div>

          {/* Consumables & Parts Fitted Sheet (Urban Company Style) */}
          {jobStatus === 'COMPLETED' && activeOrderDesc.selectedParts && activeOrderDesc.selectedParts.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <IconWrench className="w-4 h-4 text-slate-400" />
                  <span>Parts & Consumables Installed On-Site</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-mono">
                    Genuine OEM Parts
                  </span>
                </div>
                <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                  <IconShieldCheck className="w-3 h-3 text-cyan-400" /> 30-Day Urban Company Warranty
                </span>
              </div>
              <div className="space-y-1.5">
                {activeOrderDesc.selectedParts.map((partId: string) => {
                  const part = COMMON_PARTS.find((p: ConsumablePart) => p.id === partId)
                  return (
                    <div key={partId} className="flex justify-between items-center text-xs text-slate-300 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                      <span className="font-medium">{part?.name || partId} ({part?.category})</span>
                      <span className="font-mono text-emerald-400 font-bold">₹{part?.price || 0}</span>
                    </div>
                  )
                })}
              </div>
              {activeOrderDesc.resolutionNote && (
                <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 font-mono">
                  <span className="text-emerald-400 font-bold">Work Order Notes:</span> "{activeOrderDesc.resolutionNote}"
                </div>
              )}
            </div>
          )}

          {/* Extra Jobs & Replaced Spare Parts Fitted Sheet */}
          {jobStatus === 'COMPLETED' && activeOrderDesc.extraTasks && activeOrderDesc.extraTasks.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <IconSparkles className="w-4 h-4 text-cyan-400" />
                  <span>Additional Jobs & Spare Parts Authorized On-Site</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded-full font-mono">
                    Technician Add-ons
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Total Add-ons: +₹{activeOrderDesc.extraTasksTotal || activeOrderDesc.extraTasks.reduce((s: number, i: any) => s + (i.price || 0), 0)}
                </span>
              </div>
              <div className="space-y-1.5">
                {activeOrderDesc.extraTasks.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs text-slate-300 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                    <span className="font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{item.description}</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">+₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Section on Completion */}
          {jobStatus === 'COMPLETED' && (
            <div className="p-6 bg-[#2A114B] rounded-2xl border-2 border-[#824D69] text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[#180018] border border-[#824D69] text-[#FAE5D8] flex items-center justify-center mx-auto text-3xl shadow-md">
                🎉
              </div>
              <div>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#180018] text-emerald-400 border border-emerald-500/40 uppercase font-mono tracking-wider">
                  Service 100% Completed
                </span>
                <h4 className="text-lg font-black text-[#FAE5D8] mt-2">
                  Thank You for Choosing DispatchGrid!
                </h4>
                <p className="text-xs text-[#DFB6B2] mt-1 max-w-md mx-auto">
                  Your certified emergency trade service has concluded with verified five-star quality. 30-day warranty certificate is now active.
                </p>
              </div>

              {/* Prominent Confetti & Celebration Replay Button */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(true)}
                  className="btn-solid-primary py-3 px-6 rounded-xl text-xs sm:text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="text-base">🎉</span>
                  <span>View Completion Celebration & Confetti</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadInvoice()}
                  className="btn-solid-secondary py-3 px-4 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <IconDollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Tax Invoice</span>
                </button>
              </div>
              <h4 className="text-sm font-bold text-white">How was your service with {assignedTech?.name || 'our partner'}?</h4>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRating(star)
                      showToast(`Rated ${star} stars! Thank you for your feedback.`)
                    }}
                    className="p-2 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <IconStar
                      className={`w-7 h-7 ${
                        (rating || 5) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Tax Invoice Download Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => downloadInvoice()}
                  className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs py-2 px-4 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <IconDollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Official Tax Invoice</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">100% On-Time SLA Guarantee fulfilled.</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleNewBooking}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              + Book Another Service
            </button>

            {jobStatus === 'ASSIGNED' && (
              <button
                type="button"
                onClick={handleOpenCancelModal}
                className="text-xs font-bold text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950 border border-rose-800/60 px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <IconXCircle className="w-3.5 h-3.5" />
                <span>Cancel Booking (Survey)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* BOOKING FORM (On-Demand Category Grid) */
        <div className="space-y-6">
          {/* 1. Category Picker */}
          <div>
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
              1. Select Trade Specialist
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory.id === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between card-interactive ${
                      isSelected
                        ? 'bg-[#522959] border-[#DFB6B2] text-[#FAE5D8] shadow-lg glow-pill-plum scale-[1.02]'
                        : 'glass-panel border-[#824D69]/40 hover:border-[#824D69] hover:bg-[#2A114B]/70'
                    }`}
                  >
                    <div>
                      <div className="mb-2.5 p-2 w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        {getCategoryIcon(cat.id)}
                      </div>
                      <div className="text-xs font-bold text-white leading-tight">{cat.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{cat.description}</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-emerald-400">₹{cat.basePrice}</span>
                      <span className="text-[10px] text-slate-400 font-mono">~{cat.avgTime}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Location & Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zone / Address Picker with Quick Saved Address Switcher (Feature 1) */}
            <div className="glass-panel rounded-2xl p-4 border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <IconMapPin className="w-4 h-4 text-cyan-400" />
                  <span>2. Service Location & Saved Addresses</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">1-Click Fast Switch</span>
              </div>

              {/* Quick Saved Address Chips (Home, Office, Hub, Campus) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAVED_ADDRESSES.map((addr) => {
                  const isSelected = selectedAddressId === addr.id
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer card-interactive ${
                        isSelected
                          ? 'bg-[#522959] border-[#DFB6B2] text-[#FAE5D8] shadow-md'
                          : 'bg-[#2A114B]/70 border-[#824D69]/40 text-[#DFB6B2] hover:text-[#FAE5D8] hover:border-[#824D69]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-1 rounded-lg bg-slate-800/80 text-cyan-400">{getAddressIcon(addr.id)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-indigo-600/60 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {addr.tag}
                        </span>
                      </div>
                      <div className="text-xs font-bold mt-1 text-white truncate">{addr.label}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{addr.landmark}</div>
                    </button>
                  )
                })}
              </div>

              {/* Hub Zone Dropdown */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Dispatch Zone</div>
                <select
                  value={selectedZone.id}
                  onChange={(e) => {
                    const z = ZONES.find((item) => item.id === e.target.value)
                    if (z) {
                      setSelectedZone(z)
                      setSelectedAddressId('custom')
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exact Street Address Input */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Street / Flat / Door Number</div>
                <input
                  type="text"
                  placeholder="Specific Street / Apartment / Flat No. (e.g. Flat 402, Tower B)"
                  value={streetAddress}
                  onChange={(e) => {
                    setStreetAddress(e.target.value)
                    setSelectedAddressId('custom')
                  }}
                  className="w-full bg-slate-900/60 border border-slate-800 text-slate-300 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* Urgency & Priority Picker */}
            <div className="glass-panel rounded-2xl p-4 border-slate-800 space-y-3">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <IconZap className="w-4 h-4 text-amber-400" />
                <span>3. Dispatch Priority Level</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CRITICAL', label: 'Emergency', sub: 'Immediate 45m SLA', color: 'border-rose-500 text-rose-300 bg-rose-950/40' },
                  { id: 'HIGH', label: 'High Priority', sub: 'Within 2 Hours', color: 'border-amber-500 text-amber-300 bg-amber-950/40' },
                  { id: 'MEDIUM', label: 'Standard', sub: 'Flexible Today', color: 'border-blue-500 text-blue-300 bg-blue-950/40' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setPriority(tier.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      priority === tier.id ? tier.color + ' font-bold shadow-md' : 'border-slate-800 bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{tier.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-80">{tier.sub}</div>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder={`Custom issue details (e.g. "${selectedCategory.name} issue in kitchen")`}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 text-slate-300 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Preferred Fleet Partner Dispatch Selector */}
          <div className="glass-panel rounded-2xl p-4 border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <IconHardHat className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dispatched Fleet Specialist</span>
                <span className="text-[10px] text-cyan-400 font-mono">(Smart Auto-Match or Choose Preferred Partner)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {availableTechnicians.filter((t: any) => t.isAvailable).length} Active Online
              </span>
            </div>
            <select
              value={preferredTechId}
              onChange={(e) => setPreferredTechId(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
            >
              <option value="">Smart Auto-Match Nearest Qualified Specialist (Recommended)</option>
              {availableTechnicians
                .slice()
                .sort((a, b) => {
                  const aMatch = Array.isArray(a.skills) && a.skills.includes(selectedCategory.skill) ? 1 : 0
                  const bMatch = Array.isArray(b.skills) && b.skills.includes(selectedCategory.skill) ? 1 : 0
                  return bMatch - aMatch
                })
                .map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.isAvailable ? '[ONLINE]' : '[STANDBY]'} — Captain {t.name} (Skills: {Array.isArray(t.skills) ? t.skills.join(', ') : t.skills})
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Gate Notes & Arrival Instructions (Feature 3) */}
          <div className="glass-panel rounded-2xl p-4 border-slate-800 space-y-3">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>4. Gate Notes & Arrival Instructions for Partner</span>
              <span className="text-[10px] text-indigo-400 font-mono">Quick-Tap Chips</span>
            </label>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_GATE_NOTES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setGateNote(chip)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    gateNote === chip
                      ? 'bg-indigo-950 text-indigo-300 border-indigo-600 font-bold'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Custom arrival note (e.g. Buzz intercom #104 or leave shoes outside)"
              value={gateNote}
              onChange={(e) => setGateNote(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 text-slate-300 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* 3. SELECT PAYMENT METHOD (SIMULATED SECURE SANDBOX) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FAE5D8] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <IconCreditCard className="w-4 h-4 text-emerald-400" />
                <span>3. Payment Method (Simulated Sandbox)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <IconShieldCheck className="w-3.5 h-3.5" />
                <span>256-Bit SSL Encrypted</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* UPI */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('UPI')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPaymentMethod === 'UPI'
                    ? 'bg-[#522959] border-[#824D69] text-[#FAE5D8] shadow-md'
                    : 'bg-[#2A114B]/70 border-[#824D69]/40 text-[#DFB6B2] hover:bg-[#2A114B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono">📱 UPI / QR</span>
                  {selectedPaymentMethod === 'UPI' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <div className="text-[10px] text-[#DFB6B2]/80">GPay, PhonePe, Paytm</div>
                <div className="text-[9px] text-emerald-400 font-mono mt-1 font-semibold">Zero Surcharge</div>
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('CARD')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPaymentMethod === 'CARD'
                    ? 'bg-[#522959] border-[#824D69] text-[#FAE5D8] shadow-md'
                    : 'bg-[#2A114B]/70 border-[#824D69]/40 text-[#DFB6B2] hover:bg-[#2A114B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono">💳 Card</span>
                  {selectedPaymentMethod === 'CARD' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <div className="text-[10px] text-[#DFB6B2]/80">Visa, Mastercard, RuPay</div>
                <div className="text-[9px] text-emerald-400 font-mono mt-1 font-semibold">•••• 4242</div>
              </button>

              {/* Pay on Completion */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('POD')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPaymentMethod === 'POD'
                    ? 'bg-[#522959] border-[#824D69] text-[#FAE5D8] shadow-md'
                    : 'bg-[#2A114B]/70 border-[#824D69]/40 text-[#DFB6B2] hover:bg-[#2A114B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono">💵 Cash / POD</span>
                  {selectedPaymentMethod === 'POD' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <div className="text-[10px] text-[#DFB6B2]/80">Pay Upon Completion</div>
                <div className="text-[9px] text-[#DFB6B2] font-mono mt-1 font-semibold">₹0 Advance</div>
              </button>

              {/* Wallet */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('WALLET')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedPaymentMethod === 'WALLET'
                    ? 'bg-[#522959] border-[#824D69] text-[#FAE5D8] shadow-md'
                    : 'bg-[#2A114B]/70 border-[#824D69]/40 text-[#DFB6B2] hover:bg-[#2A114B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono flex items-center gap-1.5"><IconWallet className="w-3.5 h-3.5 text-emerald-400" /><span>DG Wallet</span></span>
                  {selectedPaymentMethod === 'WALLET' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <div className="text-[10px] text-[#DFB6B2]/80">Instant 1-Tap Pay</div>
                <div className="text-[9px] text-emerald-400 font-mono mt-1 font-semibold">Bal: ₹2,450</div>
              </button>
            </div>

            {/* Method Details Row */}
            {selectedPaymentMethod === 'UPI' && (
              <div className="p-3.5 rounded-xl bg-[#180018]/90 border border-[#824D69]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-mono text-[#DFB6B2]/80">UPI VPA:</span>
                  <input
                    type="text"
                    value={dummyUpiId}
                    onChange={(e) => setDummyUpiId(e.target.value)}
                    className="bg-[#2A114B] border border-[#824D69]/60 px-3 py-1.5 rounded-lg text-xs font-mono text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2] w-full sm:w-48"
                  />
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    ✓ NPCI Verified
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrPreview(!showQrPreview)}
                  className="btn-solid-secondary px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5 ml-auto sm:ml-0"
                >
                  <IconQrCode className="w-3.5 h-3.5 text-[#DFB6B2]" />
                  <span>{showQrPreview ? 'Hide QR' : 'Show Instant QR'}</span>
                </button>
              </div>
            )}

            {showQrPreview && selectedPaymentMethod === 'UPI' && (
              <div className="p-4 rounded-xl bg-[#180018] border border-[#824D69] text-center space-y-2 animate-scaleIn max-w-xs mx-auto">
                <div className="text-[11px] font-mono font-bold text-[#FAE5D8]">Scan with GPay / PhonePe / Paytm</div>
                <div className="w-40 h-40 bg-white p-2 rounded-xl mx-auto flex items-center justify-center">
                  <div className="w-full h-full border-4 border-black p-1 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-black"></div>
                      <div className="w-8 h-8 bg-black"></div>
                    </div>
                    <div className="text-[10px] font-black text-black font-mono">₹{totalEstimatedFare} UPI</div>
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-black"></div>
                      <div className="w-6 h-6 bg-black"></div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#DFB6B2]/70 font-mono">Simulated Razorpay / NPCI Sandbox Gateway</div>
              </div>
            )}

            {selectedPaymentMethod === 'CARD' && (
              <div className="p-3.5 rounded-xl bg-[#180018]/90 border border-[#824D69]/50 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💳</span>
                  <div>
                    <div className="font-bold text-[#FAE5D8]">HDFC Regalia Black •••• 4242</div>
                    <div className="text-[10px] text-[#DFB6B2]/70">Exp: 08/29 • CVV: Verified • RBI Tokenized</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Ready to Charge
                </span>
              </div>
            )}

            {selectedPaymentMethod === 'WALLET' && (
              <div className="p-3.5 rounded-xl bg-[#180018]/90 border border-[#824D69]/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👛</span>
                  <div>
                    <div className="font-bold text-[#FAE5D8]">DispatchGrid Instant Wallet</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Available Balance: ₹2,450.00 (+₹50 Cashback on this order)</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  1-Tap Checkout
                </span>
              </div>
            )}

            {selectedPaymentMethod === 'POD' && (
              <div className="p-3.5 rounded-xl bg-[#180018]/90 border border-[#824D69]/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💵</span>
                  <div>
                    <div className="font-bold text-[#FAE5D8]">Pay on Doorstep Completion</div>
                    <div className="text-[10px] text-[#DFB6B2]/70">Pay specialist via Cash or Dynamic QR after complete job satisfaction.</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#DFB6B2] bg-[#2A114B] px-2.5 py-1 rounded-lg border border-[#824D69]/60">
                  No Advance Required
                </span>
              </div>
            )}
          </div>

          {/* 4. Transparent Fare Breakdown Card (Urban Company style - Feature 3) */}
          <div className="glass-panel rounded-2xl border-indigo-500/30 overflow-hidden shadow-xl transition-all">
            {/* Top Bar with Total & Action Button */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <IconDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-2">
                    <span>Total Guaranteed Amount</span>
                    <button
                      type="button"
                      onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-0.5 cursor-pointer underline underline-offset-2"
                    >
                      <span>{showFareBreakdown ? 'Hide Breakdown' : 'View Fare Breakdown'}</span>
                      {showFareBreakdown ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    ₹{totalEstimatedFare}
                    <span className="text-[11px] text-emerald-400 font-medium font-sans ml-2">
                      (All Taxes & Fees Included)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstantBook}
                disabled={isMatching || isAuthorizingPayment}
                className="btn-solid-success w-full sm:w-auto text-sm px-7 py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isAuthorizingPayment ? (
                  <>
                    <IconRotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Authorizing Sandbox Payment...</span>
                  </>
                ) : isMatching ? (
                  <>
                    <IconRotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Matching Nearest Specialist...</span>
                  </>
                ) : (
                  <>
                    <IconZap className="w-4 h-4 text-white" />
                    <span>Confirm & Match Technician Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Expandable Urban Company Styled Itemized Breakdown */}
            {showFareBreakdown && (
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 space-y-3">
                <div className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5">
                    <IconShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Urban Company Style Transparent Fare Receipt</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">100% Guaranteed • No Cash Surprises</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>Base Trade Labour ({selectedCategory.name})</span>
                    </div>
                    <span className="font-mono font-semibold text-white">₹{baseTradePrice}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>Standard Service Visit & Logistics Charge</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400 font-bold">+₹{defaultServiceCharge}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                      <span>Distance Surcharge ({distanceKm.toFixed(1)} km from nearest partner)</span>
                    </div>
                    <span className={`font-mono font-semibold ${isDistanceOver5Km ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {isDistanceOver5Km ? `+₹${distanceSurchargeFee} (>5km)` : '₹0 (Within 5km)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>SLA Speed Guarantee ({priority === 'CRITICAL' ? 'Immediate 45-Min Emergency' : priority === 'HIGH' ? 'Within 2 Hours' : 'Standard Flexible'})</span>
                    </div>
                    <span className="font-mono font-semibold text-white">₹{prioritySpeedFee}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>Safety Gear, Sanitized Tools & Basic Consumables</span>
                    </div>
                    <span className="font-mono font-semibold text-white">₹{safetyEquipmentFee}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>Real-Time Cloud Dispatch & Fleet Platform Fee</span>
                    </div>
                    <span className="font-mono font-semibold text-white">₹{cloudPlatformFee}</span>
                  </div>

                  <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Statutory Taxes (18% GST SGST + CGST)</span>
                    <span className="font-mono text-slate-300">₹{gstTaxAmount}</span>
                  </div>

                  <div className="border-t border-indigo-900/60 pt-2 flex items-center justify-between text-sm font-bold text-white">
                    <span className="text-indigo-300">Final Billed Total (Tax Inclusive)</span>
                    <span className="font-mono text-emerald-400 text-base">₹{totalEstimatedFare}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5"><IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Backed by DispatchGrid 30-Day Service Guarantee</span>
                  <span className="text-cyan-400 font-mono">Official GST Invoice generated upon completion</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MY BOOKINGS & RECEIPTS DRAWER (Feature 4) */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-md p-4"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="glass-panel rounded-2xl border-slate-800 p-6 w-full max-w-md shadow-2xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>My Bookings History</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-mono">
                    {bookings.length} Tickets
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Order receipts, security PINs, and tax invoices.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Active Customer Profile Inside Drawer */}
            <div className="py-3 border-b border-slate-800">
              {profile ? (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <IconUser className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{profile.name}</span>
                      <span className="text-[10px] text-slate-400">({profile.age} yrs)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openAuthModal('REGISTER')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1"><IconPhone className="w-3 h-3 text-slate-400" /> {profile.phone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><IconMail className="w-3 h-3 text-slate-400" /> {profile.email}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <IconMapPin className="w-3 h-3 text-cyan-400" />
                    <span>{profile.address}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[9px] text-emerald-400 font-mono">Verified Resident</span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      Sign Out (Switch User)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 flex items-center justify-between">
                  <div className="text-xs text-amber-200">
                    <span className="font-bold">Guest Mode</span> (Not Signed In)
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('LOGIN')}
                    className="text-xs font-bold bg-amber-500 text-black px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Bookings List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {bookings.length > 0 ? (
                bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">{b.title}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : b.status === 'IN_PROGRESS'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                      <span>Tech: {b.technicianName || 'Alex Martinez'}</span>
                      <span className="text-emerald-400 font-bold">₹{b.totalAmount}</span>
                    </div>

                    {b.otp && b.status !== 'COMPLETED' && (
                      <div className="text-[10px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded flex items-center justify-between border border-slate-800">
                        <span>Security Start PIN:</span>
                        <strong className="text-indigo-400 tracking-wider font-bold">{b.otp}</strong>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          api.getJob(b.id).then((fresh) => {
                            setActiveOrder({
                              job: fresh,
                              assignment: fresh.assignments?.[0],
                              otp: b.otp,
                              gateNote: b.gateNote,
                              paymentMethod: b.paymentMethod || 'UPI',
                              paymentTxnId: b.paymentTxnId || 'DG-PAY-88412',
                            })
                            setShowDrawer(false)
                            if (fresh.status === 'COMPLETED') {
                              setShowCompletionModal(true)
                            }
                          })
                        }}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        View Live Tracker →
                      </button>

                      {b.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => downloadInvoice(b)}
                          className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/80 cursor-pointer"
                        >
                          Invoice TXT
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-xs font-semibold">No past bookings found.</p>
                  <p className="text-[11px] mt-1 text-slate-600">Fresh customer profile with zero history!</p>
                </div>
              )}
            </div>

            {/* Clear History Button */}
            {bookings.length > 0 && (
              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={clearCustomerHistory}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear History (Reset to Fresh User)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION REASON SURVEY MODAL (Uber/Rapido Flow - Feature 2) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative animate-float-slow">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-white text-base">Cancel Booking Confirmation</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Please share why you'd like to cancel this dispatch request:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Doorstep Arrival Penalty Alert if technician already arrived */}
            {(() => {
              let isArrived = false
              try {
                if (activeOrder?.job?.description) {
                  const d = JSON.parse(activeOrder.job.description)
                  isArrived = d.transitStage === 'ARRIVED' || d.transitStage === 'IN_PROGRESS' || !!d.arrivedAt
                }
              } catch {}
              if (!isArrived) return null
              return (
                <div className="p-3.5 bg-rose-950/90 border border-rose-500 rounded-xl space-y-1.5 shadow-md">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
                    <IconAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Late Cancellation Doorstep Penalty: ₹150</span>
                  </div>
                  <p className="text-[11px] text-rose-200">
                    Captain <strong>{activeOrder?.assignment?.technician?.name || 'Partner'}</strong> has already arrived at your doorstep. Cancelling now incurs a mandatory <strong>₹150</strong> doorstep visit fee to compensate partner travel and fuel costs.
                  </p>
                </div>
              )
            })()}

            {/* Warning Banner */}
            <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2.5">
              <IconAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                Cancelling will release your technician ({activeOrder?.assignment?.technician?.name || 'Partner'}) back to the active fleet pool immediately.
              </span>
            </div>

            {/* Cancellation Reason Options (Interactive Radio Style) */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {CANCELLATION_REASONS.map((opt) => {
                const isSelected = cancelReason === opt.title
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCancelReason(opt.title)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-rose-950/70 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="p-1 rounded-lg bg-rose-950/60 text-rose-400">{getCancellationIcon(opt.id)}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white">{opt.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${
                      isSelected ? 'border-rose-400 bg-rose-500 text-white' : 'border-slate-700'
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Optional Additional Feedback */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Additional Comments (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Will book tomorrow at 10 AM instead"
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancellation}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md glow-pill-rose flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <IconRotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Releasing Fleet...</span>
                  </>
                ) : (
                  <>
                    <IconXCircle className="w-3.5 h-3.5" />
                    <span>
                      Confirm Cancellation{' '}
                      {(() => {
                        try {
                          const d = activeOrder?.job?.description ? JSON.parse(activeOrder.job.description) : null
                          if (d?.transitStage === 'ARRIVED' || d?.transitStage === 'IN_PROGRESS' || d?.arrivedAt) {
                            return '(₹150 Penalty Applies)'
                          }
                        } catch {}
                        return ''
                      })()}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER AUTHENTICATION & EMAIL OTP MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#2A114B] border border-[#824D69]/60 rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative animate-scaleIn">
            {/* Pinned Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#824D69]/40 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-[#522959] border border-[#824D69]/60 flex items-center justify-center">
                    {authMode === 'VERIFY_OTP' ? (
                      <IconMail className="w-5 h-5 text-[#FAE5D8]" />
                    ) : authMode === 'FORGOT_PASSWORD' ? (
                      <IconKey className="w-5 h-5 text-[#FAE5D8]" />
                    ) : (
                      <IconUser className="w-5 h-5 text-[#FAE5D8]" />
                    )}
                  </span>
                  <h3 className="font-bold text-[#FAE5D8] text-base">
                    {authMode === 'VERIFY_OTP'
                      ? 'Verify Email OTP Code'
                      : authMode === 'FORGOT_PASSWORD'
                      ? 'Reset / Change Password'
                      : authMode === 'REGISTER'
                      ? 'Register Customer Profile'
                      : 'Customer Sign In'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#180018] text-[#DFB6B2] border border-[#824D69]/60 font-mono">
                    SQLite Verified
                  </span>
                </div>
                <p className="text-xs text-[#DFB6B2]/80 mt-1">
                  {authMode === 'VERIFY_OTP'
                    ? `Enter the 6-digit verification code sent to ${authEmail}.`
                    : authMode === 'FORGOT_PASSWORD'
                    ? 'Verify your email via OTP to set a new password in the database.'
                    : authMode === 'REGISTER'
                    ? 'Create an account to track dispatches, verified invoices, and OTP history.'
                    : 'Sign in securely with email OTP or account password.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false)
                  setPendingBookingAfterAuth(false)
                  setAuthError(null)
                }}
                className="text-[#DFB6B2] hover:text-[#FAE5D8] p-1 rounded-lg cursor-pointer transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pt-3 pr-1">

            {/* Mode Switcher Tabs (when not verifying OTP) */}
            {authMode !== 'VERIFY_OTP' && (
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN')
                    setAuthError(null)
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('REGISTER')
                    setAuthError(null)
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    authMode === 'REGISTER' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register New
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('FORGOT_PASSWORD')
                    setResetStep(1)
                    setAuthError(null)
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                    authMode === 'FORGOT_PASSWORD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <IconKey className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              </div>
            )}

            {/* Error Banner */}
            {authError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <IconAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* TAB 1: LOGIN MODE */}
            {authMode === 'LOGIN' && (
              <div className="space-y-3 pt-1">
                {/* Method Toggle: OTP vs Password */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('OTP')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                      loginMethod === 'OTP'
                        ? 'bg-indigo-950/90 text-indigo-300 border-indigo-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <IconMail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Email OTP (Passwordless)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('PASSWORD')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                      loginMethod === 'PASSWORD'
                        ? 'bg-indigo-950/90 text-indigo-300 border-indigo-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <IconLock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Password</span>
                  </button>
                </div>

                {loginMethod === 'OTP' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendLoginOtp()
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul.sharma@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('FORGOT_PASSWORD')
                          setResetStep(1)
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Change / Set Password?
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="btn-solid-primary px-5 py-2.5 text-xs rounded-xl disabled:opacity-50"
                      >
                        {authLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handlePasswordLogin()
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul.sharma@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('FORGOT_PASSWORD')
                          setResetStep(1)
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="btn-solid-primary px-5 py-2.5 text-xs rounded-xl disabled:opacity-50"
                      >
                        {authLoading ? 'Signing in...' : 'Sign In with Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: REGISTER MODE */}
            {authMode === 'REGISTER' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendRegisterOtp()
                }}
                className="space-y-3 pt-1"
              >
                {/* Fast Fill Customer Preset */}
                <div className="p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/40 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <IconZap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verified Customer Preset</span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-mono">1-CLICK</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">Auto-fills verified resident credentials for instant booking.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthForm({
                        name: 'Pooja Hegde',
                        age: 27 as any,
                        phone: '+91 94812 73910',
                        email: 'pooja.hegde@dispatchgrid.in',
                        address: 'Flat 402, Prestige Falcon City, Bengaluru',
                      })
                      setAuthEmail('pooja.hegde@dispatchgrid.in')
                      showToast('Pre-filled verified customer credentials!')
                    }}
                    className="btn-solid-cream px-3 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap"
                  >
                    Auto-Fill Preset
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min={18}
                      max={100}
                      placeholder="e.g. 29"
                      value={authForm.age}
                      onChange={(e) => setAuthForm({ ...authForm, age: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Mobile Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={authForm.phone}
                      onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      value={authForm.email}
                      onChange={(e) => {
                        setAuthForm({ ...authForm, email: e.target.value })
                        setAuthEmail(e.target.value)
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Service Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 402, Tower B, Prestige Falcon City, Bengaluru"
                    value={authForm.address}
                    onChange={(e) => setAuthForm({ ...authForm, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-solid-primary px-5 py-2.5 text-xs rounded-xl disabled:opacity-50"
                  >
                    {authLoading ? 'Sending OTP...' : 'Send Verification OTP & Register'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: VERIFY OTP CODE */}
            {authMode === 'VERIFY_OTP' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleVerifyOtp()
                }}
                className="space-y-4 pt-1"
              >
                {/* Real Email Dispatch Notice */}
                <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/50 rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <IconMail className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-200 font-bold">Verification PIN Dispatched</span>
                    </div>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                      otpSecondsLeft > 0
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                    }`}>
                      {otpSecondsLeft > 0
                        ? `Expires in ${Math.floor(otpSecondsLeft / 60)}:${(otpSecondsLeft % 60).toString().padStart(2, '0')}`
                        : 'PIN Expired'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                    A 6-digit verification code has been dispatched to your actual inbox at <strong className="text-cyan-300 font-mono">{authEmail}</strong>. Please check your inbox or spam folder and enter the PIN below.
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">Didn't receive the email?</span>
                    <button
                      type="button"
                      disabled={otpSecondsLeft > 150}
                      onClick={() => {
                        if (otpActionType === 'REGISTER') handleSendRegisterOtp()
                        else handleSendLoginOtp()
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer disabled:text-slate-600 disabled:no-underline"
                    >
                      {otpSecondsLeft > 150 ? `Resend in ${otpSecondsLeft - 150}s` : 'Resend Email PIN'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Enter 6-Digit Verification PIN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 482910"
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-indigo-500/80 text-white text-center text-xl font-mono tracking-widest rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-mono px-1">
                    <span>Demo Master PIN: <button type="button" onClick={() => setAuthOtp('123456')} className="text-cyan-400 underline font-bold hover:text-cyan-300 cursor-pointer">123456</button></span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1"><IconCheck className="w-3 h-3" /> Real Email OTP Active</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('LOGIN')
                      setAuthError(null)
                    }}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-solid-success px-6 py-2.5 text-xs rounded-xl disabled:opacity-50"
                  >
                    {authLoading ? 'Verifying...' : 'Verify Code & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: RESET / CHANGE PASSWORD */}
            {authMode === 'FORGOT_PASSWORD' && (
              <div className="space-y-4 pt-1">
                {resetStep === 1 ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendResetOtp()
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        Registered Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul.sharma@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      We will dispatch a secure single-use verification PIN to this email address to verify your identity before updating the password in the SQLite database.
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('LOGIN')
                          setAuthError(null)
                        }}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        ← Back to Sign In
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="btn-solid-primary px-5 py-2.5 text-xs rounded-xl disabled:opacity-50"
                      >
                        {authLoading ? 'Dispatching PIN...' : 'Send Password Reset OTP'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleResetPasswordSubmit()
                    }}
                    className="space-y-3"
                  >
                    {/* Real Email Dispatch Notice */}
                    <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/50 rounded-2xl space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <IconKey className="w-4 h-4 text-cyan-400" />
                          <span className="text-slate-200 font-bold">Password Reset PIN Dispatched</span>
                        </div>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          otpSecondsLeft > 0
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                        }`}>
                          {otpSecondsLeft > 0
                            ? `Expires in ${Math.floor(otpSecondsLeft / 60)}:${(otpSecondsLeft % 60).toString().padStart(2, '0')}`
                            : 'PIN Expired'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        A 6-digit password reset code has been sent to your Gmail/inbox at <strong className="text-cyan-300 font-mono">{authEmail}</strong>. Enter the PIN from your email to update your password.
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400">Didn't receive email?</span>
                        <button
                          type="button"
                          disabled={otpSecondsLeft > 150}
                          onClick={handleSendResetOtp}
                          className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer disabled:text-slate-600 disabled:no-underline"
                        >
                          {otpSecondsLeft > 150 ? `Resend in ${otpSecondsLeft - 150}s` : 'Resend Reset Code'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                        6-Digit Reset PIN *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 482910"
                        value={authOtp}
                        onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-center font-mono text-base rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          New Password *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="At least 4 chars"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setResetStep(1)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        ← Change Email
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="btn-solid-success px-5 py-2.5 text-xs rounded-xl disabled:opacity-50"
                      >
                        {authLoading ? 'Updating Database...' : 'Save New Password & Login'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
      {/* TECHNICIAN ASSIGNED POPUP MODAL (Urban Company / Uber Style) */}
      {showAssignedPopup && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-scaleIn">
          <div className="bg-[#2A114B] border border-[#824D69]/80 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative overflow-hidden text-[#FAE5D8]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#824D69]" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#522959] border border-[#824D69] flex items-center justify-center text-[#FAE5D8] shadow-md">
                  <IconCheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#DFB6B2] font-bold bg-[#180018] px-2 py-0.5 rounded border border-[#824D69]/60">
                    Fleet Specialist Assigned
                  </span>
                  <h3 className="text-lg font-black text-[#FAE5D8] mt-0.5">Technician Dispatched!</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignedPopup(false)}
                className="text-[#DFB6B2] hover:text-[#FAE5D8] p-1 rounded-lg cursor-pointer transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Specialist Card */}
            <div className="p-4 rounded-2xl bg-[#180018]/90 border border-[#824D69]/40 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-[#522959] border border-[#824D69] flex items-center justify-center text-[#FAE5D8] text-lg font-black shadow-lg">
                  {(activeOrder.assignment?.technician?.name || 'CP').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#FAE5D8]">
                      Captain {activeOrder.assignment?.technician?.name || 'Alex Martinez'}
                    </span>
                    <span className="text-[9px] bg-[#522959] text-[#DFB6B2] border border-[#824D69] px-1.5 py-0.2 rounded font-mono">
                      VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-300 font-bold mt-0.5">
                    <span className="flex items-center gap-1">
                      <IconStar className="w-3.5 h-3.5 fill-amber-400" /> 4.9 Rating
                    </span>
                    <span className="text-[#824D69]">•</span>
                    <span className="text-[#DFB6B2] font-normal">
                      {Array.isArray(activeOrder.assignment?.technician?.skills)
                        ? activeOrder.assignment.technician.skills.join(', ')
                        : 'Trade Specialist'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-[#DFB6B2] pt-1 border-t border-[#824D69]/30">
                Assigned to service your <strong className="text-[#FAE5D8]">{activeOrder.job?.title || 'Urgent Service'}</strong> in{' '}
                <strong className="text-[#DFB6B2]">{activeOrder.job?.serviceZone || 'Central Hub'}</strong>.
              </div>
            </div>

            {/* Doorstep Security PIN Notification */}
            <div className="p-4 bg-[#180018]/90 border border-[#824D69]/60 rounded-2xl text-center space-y-2 shadow-inner">
              <div className="text-[10px] text-[#DFB6B2] uppercase font-mono font-bold tracking-widest">
                Your Doorstep Security PIN
              </div>
              <div className="font-mono text-3xl font-black text-[#FAE5D8] tracking-[0.2em] py-0.5">
                {activeOrder.otp || '4829'}
              </div>
              <p className="text-[11px] text-[#DFB6B2]/80">
                Share this 4-digit code with Captain {activeOrder.assignment?.technician?.name || 'Partner'} when they arrive at your door to authorize entrance & start work.
              </p>
            </div>

            {/* Email Confirmation Notice */}
            <div className="p-3 bg-[#522959]/60 border border-[#824D69] rounded-xl text-xs text-[#FAE5D8] flex items-center gap-2.5">
              <IconMail className="w-4 h-4 text-[#DFB6B2] flex-shrink-0" />
              <span>
                Assignment confirmation email with Security PIN sent to <strong className="text-white">{profile?.email || 'your registered email'}</strong>!
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAssignedPopup(false)}
              className="btn-solid-primary w-full py-3.5 text-xs rounded-xl font-bold"
            >
              Track Live on Radar
            </button>
          </div>
        </div>
      )}

      {/* DISPATCHED MAILS & ALERTS LIVE FEED DRAWER / MODAL */}
      {showMailFeed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <IconMail className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-white text-base">Dispatched Mails & Live Alerts Feed</h3>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2 py-0.5 rounded-full font-mono">
                    Gmail SMTP Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Real transactional emails sent by the platform. All emails are copied via BCC to <strong className="text-white">4mh23is094@gmail.com</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setMailFeedLoading(true)
                    try {
                      const list = await api.getRecentEmails()
                      setRecentEmails(list)
                    } catch {}
                    finally {
                      setMailFeedLoading(false)
                    }
                  }}
                  disabled={mailFeedLoading}
                  className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer text-xs flex items-center gap-1"
                  title="Refresh mail feed"
                >
                  <IconSparkles className={`w-3.5 h-3.5 text-cyan-400 ${mailFeedLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMailFeed(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 custom-scrollbar">
              {recentEmails.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <IconMail className="w-8 h-8 mx-auto text-slate-600" />
                  <div className="text-sm font-semibold text-slate-300">No emails dispatched yet in this runtime</div>
                  <div className="text-xs text-slate-500">
                    Book a service or register to trigger instant notifications.
                  </div>
                </div>
              ) : (
                recentEmails.map((email: any) => (
                  <div
                    key={email.id}
                    className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white font-mono">{email.subject}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(email.sentAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">To:</span>
                      <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                        {email.to}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        (BCC: 4mh23is094@gmail.com)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {email.pin && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-lg">
                          <IconKey className="w-3 h-3 text-amber-400" />
                          PIN: {email.pin}
                        </span>
                      )}
                      {email.scheduledArrival && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-lg">
                          <IconClock className="w-3 h-3 text-emerald-400" />
                          Arrival Target: {email.scheduledArrival}
                        </span>
                      )}
                      {email.distanceKm && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg">
                          <IconMapPin className="w-3 h-3 text-cyan-400" />
                          {email.distanceKm} km
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <IconCheck className="w-3 h-3" /> Sent via SMTP
                      </span>
                    </div>

                    {email.preview && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 line-clamp-2 font-mono">
                        {email.preview}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMailFeed(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Feed
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* 🎊 Task Completion Celebration Modal with Confetti & Home Redirection in Mindazzle Luxury Obsidian-Plum Theme */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-scaleIn">
          <ConfettiCanvas />
          <div className="relative z-[101] bg-[#2A114B] border-2 border-[#824D69] rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-5 animate-scaleIn text-[#FAE5D8]">
            {/* Celebration Icon Header */}
            <div className="w-20 h-20 rounded-3xl bg-[#180018] border border-[#824D69] text-[#FAE5D8] flex items-center justify-center mx-auto shadow-md">
              <span className="text-4xl">🎉</span>
            </div>

            <div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#180018] text-[#DFB6B2] border border-[#824D69]/60 uppercase font-mono tracking-wider">
                100% Service Completed
              </span>
              <h2 className="text-2xl font-black text-[#FAE5D8] mt-2 tracking-tight">
                Thank You for Choosing DispatchGrid!
              </h2>
              <p className="text-xs sm:text-sm text-[#DFB6B2] mt-1.5 leading-relaxed">
                Your emergency trade service has concluded with five-star verified workmanship. Your official 30-day warranty certificate is now active.
              </p>
            </div>

            {/* Service Recap Card */}
            <div className="p-4 rounded-2xl bg-[#180018]/90 border border-[#824D69]/50 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#824D69]/30">
                <span className="text-[#DFB6B2]/70">Service Completed:</span>
                <span className="font-bold text-[#FAE5D8]">{activeOrder?.job?.title || 'Emergency Repair'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#824D69]/30">
                <span className="text-[#DFB6B2]/70">Assigned Specialist:</span>
                <span className="font-bold text-[#FAE5D8]">Captain {assignedTech?.name || 'Trade Partner'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#824D69]/30">
                <span className="text-[#DFB6B2]/70">Worksite Address:</span>
                <span className="font-medium text-[#FAE5D8] truncate max-w-[220px]">{streetAddress || 'Worksite'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold">
                <span className="text-[#DFB6B2]">Total Bill Paid:</span>
                <span className="text-emerald-400 text-sm font-mono">₹{activeOrder?.totalAmount || totalEstimatedFare}</span>
              </div>
              <div className="flex justify-between items-center pt-1 text-[11px] font-mono border-t border-[#824D69]/30">
                <span className="text-[#DFB6B2]/70">Payment Settlement:</span>
                <span className="text-emerald-400 font-bold">
                  Paid via {activeOrder?.paymentMethod || selectedPaymentMethod || 'UPI'} ({activeOrder?.paymentTxnId || 'DG-PAY-88412'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 text-[10px] font-mono text-emerald-400">
                <span className="text-[#DFB6B2]/70">Email Invoice:</span>
                <span className="flex items-center gap-1 font-semibold">
                  <span>✓ Delivered to {activeOrder?.customer?.email || profile?.email || 'customer@dispatchgrid.in'}</span>
                </span>
              </div>
            </div>

            {/* Star Rating Section */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#FAE5D8]">How was your experience today?</div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRating(star)
                      showToast(`Rated ${star} stars! Thank you for your feedback.`)
                    }}
                    className="p-1.5 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <IconStar
                      className={`w-7 h-7 ${
                        (rating || 5) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Download Invoice & Return to Home */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  downloadInvoice()
                }}
                className="btn-solid-secondary w-full py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <IconDollarSign className="w-4 h-4 text-emerald-400" />
                <span>Download Official Tax Invoice (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false)
                  setActiveOrder(null)
                  setSelectedCategory(CATEGORIES[0])
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  showToast('Welcome back! Select any service to book again.')
                }}
                className="btn-solid-primary w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Book Another Service (Return to Home)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
