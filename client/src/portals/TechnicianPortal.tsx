import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import {
  IconCheckCircle,
  IconClock,
  IconMapPin,
  IconStar,
  IconTruck,
  IconShieldCheck,
  IconActivity,
  IconSparkles,
  IconPhone,
  IconAlertTriangle,
  IconRotateCw,
  IconX,
  IconHardHat,
  IconCheck,
  IconTarget,
  IconUser,
  IconMail,
  IconDoorOpen,
  IconZap,
} from '../components/Icons'

function playDispatchChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch { }
}

import { COMMON_PARTS } from '../parts'


const DELAY_REASONS = [
  { id: 'rusted_pipe', title: 'Concealed pipe rusted, requires wall chipping', defaultMinutes: 45 },
  { id: 'hardware_vendor', title: 'Procuring specialized replacement valve from local vendor', defaultMinutes: 30 },
  { id: 'breaker_panel', title: 'Electrical main breaker short circuit requires panel rewire', defaultMinutes: 45 },
  { id: 'customer_addon', title: 'Customer requested additional appliance diagnostics on site', defaultMinutes: 30 },
  { id: 'water_shutoff', title: 'Awaiting building maintenance main line water shutoff', defaultMinutes: 30 },
]

const ALL_TECH_SKILLS = [
  { id: 'plumbing', label: 'Plumbing & Pipe Repair' },
  { id: 'electrical', label: 'Electrical & Power Fix' },
  { id: 'hvac', label: 'HVAC & Air Conditioner' },
  { id: 'appliance-repair', label: 'Appliance Diagnostics' },
  { id: 'locksmith', label: 'Emergency Locksmith' },
]

const ALL_TECH_ZONES = [
  { id: 'zone-central', label: 'Central Tech Park (HQ Hub)' },
  { id: 'zone-south', label: 'South Hub (Koramangala/HSR)' },
  { id: 'zone-north', label: 'North Hub (Hebbal)' },
  { id: 'zone-east', label: 'East Hub (Whitefield)' },
  { id: 'zone-west', label: 'West Hub (Rajajinagar)' },
]

const QUICK_EXTRA_TASKS = [
  { description: '16A MCB Safety Switch', price: 250 },
  { description: 'High-Pressure Teflon Seal', price: 80 },
  { description: '2m Heavy Copper Wiring', price: 180 },
  { description: '45uF Motor Run Capacitor', price: 350 },
  { description: 'Compressor Gas Top-up (R32)', price: 650 },
  { description: 'Internal Deep Chemical Flush', price: 300 },
]

export default function TechnicianPortal() {
  const [technicians, setTechnicians] = useState<any[]>([])
  const [selectedTechId, setSelectedTechId] = useState<string>(() => {
    try {
      return localStorage.getItem('dg_active_tech_id') || ''
    } catch {
      return ''
    }
  })
  const [techData, setTechData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // 1. Arrival & Transit States
  const [hasArrivedAtGate, setHasArrivedAtGate] = useState(false)
  const [isEnRoute, setIsEnRoute] = useState(false)
  const [hasAcceptedJob, setHasAcceptedJob] = useState(false)

  // 2. Partner Profile & Verification Modal
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileTab, setProfileTab] = useState<'BADGE' | 'REGISTER'>('BADGE')
  const [newTechForm, setNewTechForm] = useState({
    name: '',
    phone: '',
    skills: ['plumbing', 'electrical', 'hvac', 'appliance-repair', 'locksmith'],
    zones: ['zone-central', 'zone-south', 'zone-north', 'zone-east', 'zone-west'],
    shiftStart: '08:00',
    shiftEnd: '20:00',
  })

  // 3. Stopwatch State for active on-site work
  const [onSiteSecondsElapsed, setOnSiteSecondsElapsed] = useState(0)

  // 4. Customer PIN Verification Modal
  const [showPinModal, setShowPinModal] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  // 5. Job Completion & Consumables Modal (Urban Company Style)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('Diagnostics complete. Replaced worn seal and verified pressure.')
  const [selectedParts, setSelectedParts] = useState<string[]>(['p1', 'p2'])

  // 6. Extra Jobs & Replaced Spare Parts Editor
  const [extraTasks, setExtraTasks] = useState<Array<{ id: string; description: string; price: number }>>([
    { id: 'ext-1', description: 'Replaced 16A Heavy-Duty MCB Breaker', price: 250 },
  ])
  const [customTaskName, setCustomTaskName] = useState('')
  const [customTaskPrice, setCustomTaskPrice] = useState('')

  // 7. Offer Response Countdown (1-minute window)
  const [offerCountdown, setOfferCountdown] = useState<number>(60)

  const handleAddExtraTask = (description: string, price: number) => {
    if (!description.trim() || isNaN(price) || price <= 0) {
      showToast('Please enter a valid task description and price')
      return
    }
    setExtraTasks((prev) => [
      ...prev,
      { id: `ext-${Date.now()}`, description: description.trim(), price: Math.round(price) },
    ])
    setCustomTaskName('')
    setCustomTaskPrice('')
    showToast(`Added extra task: "${description}" (+₹${price})`)
  }

  const handleRemoveExtraTask = (id: string) => {
    setExtraTasks((prev) => prev.filter((item) => item.id !== id))
  }

  const extraTasksTotal = extraTasks.reduce((acc, t) => acc + t.price, 0)

  // 7. On-Site Delay & Recovery Modal
  const [showDelayModal, setShowDelayModal] = useState(false)
  const [delayReason, setDelayReason] = useState(DELAY_REASONS[0].title)
  const [delayMinutes, setDelayMinutes] = useState(45)

  const lastActiveJobIdRef = useRef<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4500)
  }

  const loadTechnicians = async () => {
    try {
      const techs = await api.getTechnicians()
      setTechnicians(techs)
      return techs
    } catch {
      return []
    }
  }

  // Load all technicians on mount
  useEffect(() => {
    loadTechnicians()
      .then((techs) => {
        if (techs.length > 0) {
          const savedId = localStorage.getItem('dg_active_tech_id')
          const found = techs.find((t) => t.id === savedId)
          const defaultTech = found || techs.find((t) => t.name.includes('Friend') || t.name === 'Alex Martinez') || techs[0]
          setSelectedTechId(defaultTech.id)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTechnician = (id: string) => {
    setSelectedTechId(id)
    try {
      localStorage.setItem('dg_active_tech_id', id)
    } catch { }
  }

  // Poll technician details every 2 seconds for real-time synchronization with Customer & Admin
  const loadTechDetails = async (id: string) => {
    if (!id) return
    try {
      const data = await api.getTechnician(id)
      setTechData(data)
      const currentActive = data.assignments?.find(
        (a: any) => a.job?.status === 'ASSIGNED' || a.job?.status === 'IN_PROGRESS'
      )
      if (currentActive) {
        if (currentActive.job?.id !== lastActiveJobIdRef.current) {
          if (lastActiveJobIdRef.current !== null) {
            playDispatchChime()
            showToast(`New Order Dispatched: ${currentActive.job?.title}`)
          }
          lastActiveJobIdRef.current = currentActive.job?.id
        }

        // Restore transit state from job description
        let desc: any = {}
        try {
          if (currentActive.job?.description) {
            desc = JSON.parse(currentActive.job.description)
          }
        } catch { }

        if (desc.isAccepted) {
          setHasAcceptedJob(true)
        }
        if (desc.transitStage === 'ARRIVED') {
          setHasArrivedAtGate(true)
          setIsEnRoute(true)
          setHasAcceptedJob(true)
        } else if (desc.transitStage === 'EN_ROUTE') {
          setIsEnRoute(true)
          setHasAcceptedJob(true)
        } else if (currentActive.job?.status === 'IN_PROGRESS') {
          setHasArrivedAtGate(true)
          setIsEnRoute(true)
          setHasAcceptedJob(true)
        }
      } else {
        lastActiveJobIdRef.current = null
        setHasArrivedAtGate(false)
        setIsEnRoute(false)
        setHasAcceptedJob(false)
      }
    } catch { }
  }

  useEffect(() => {
    if (!selectedTechId) return
    loadTechDetails(selectedTechId)
    const interval = setInterval(() => {
      loadTechDetails(selectedTechId)
    }, 2000)
    return () => clearInterval(interval)
  }, [selectedTechId])

  // Active On-Site Repair Stopwatch
  useEffect(() => {
    const isWorking = techData?.assignments?.some((a: any) => a.job?.status === 'IN_PROGRESS')
    if (!isWorking) {
      setOnSiteSecondsElapsed(0)
      return
    }
    const timer = setInterval(() => {
      setOnSiteSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [techData])

  // Toggle Duty Status (Online / Offline)
  const handleToggleAvailability = async () => {
    if (!techData) return
    const newStatus = !techData.isAvailable
    setActionLoading('duty')
    try {
      if (!newStatus) {
        await api.techDropout(techData.id, `${techData.name} went off duty`)
        showToast(`${techData.name} is now OFFLINE. Active routes safely re-optimized.`)
      } else {
        await api.updateTechnician(techData.id, { isAvailable: true })
        showToast(`${techData.name} is now ONLINE & ready for dispatches!`)
      }
      await loadTechDetails(techData.id)
    } catch (err: any) {
      showToast(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // 0. Accept Incoming Job Offer (Friend A accepts Friend B's request)
  const handleAcceptJob = async () => {
    if (!activeAssignment) return
    setActionLoading('accept')
    try {
      setHasAcceptedJob(true)
      await api.updateJobTransit(activeAssignment.job.id, {
        isAccepted: true,
        acceptedAt: new Date().toISOString(),
      })
      playDispatchChime()
      showToast(`You have ACCEPTED this order! Ready to commence transit.`)
      await loadTechDetails(selectedTechId)
    } catch (err: any) {
      showToast(`Error accepting job: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Register New Fleet Partner (Friend A creates their own Technician Profile)
  const handleRegisterNewPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTechForm.name.trim()) {
      showToast('Please enter a partner name')
      return
    }
    if (newTechForm.skills.length === 0) {
      showToast('Please select at least one trade skill')
      return
    }
    if (newTechForm.zones.length === 0) {
      showToast('Please select at least one service zone')
      return
    }
    setActionLoading('register-tech')
    try {
      const zoneCoords: Record<string, { lat: number; lng: number }> = {
        'zone-south': { lat: 12.91, lng: 77.63 },
        'zone-central': { lat: 12.95, lng: 77.58 },
        'zone-east': { lat: 12.97, lng: 77.71 },
        'zone-north': { lat: 13.04, lng: 77.59 },
        'zone-west': { lat: 12.99, lng: 77.52 },
      }
      const primaryZone = newTechForm.zones[0] || 'zone-central'
      const coords = zoneCoords[primaryZone] || { lat: 12.95, lng: 77.58 }

      const newTech = await api.createTechnician({
        name: newTechForm.name.trim(),
        skills: newTechForm.skills,
        serviceZones: newTechForm.zones,
        shiftStart: newTechForm.shiftStart,
        shiftEnd: newTechForm.shiftEnd,
        latitude: coords.lat,
        longitude: coords.lng,
      })

      const allTechs = await api.getTechnicians()
      setTechnicians(allTechs)
      handleSelectTechnician(newTech.id)
      setShowProfileModal(false)
      showToast(`Welcome Captain ${newTech.name}! Profile registered & ONLINE in ${newTechForm.zones.join(', ')}.`)
    } catch (err: any) {
      showToast(`Registration error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // 1. Mark En Route
  const handleMarkEnRoute = async () => {
    if (!activeAssignment) return
    setIsEnRoute(true)
    try {
      await api.updateJobTransit(activeAssignment.job.id, {
        transitStage: 'EN_ROUTE',
        enRouteAt: new Date().toISOString(),
      })
      showToast('Marked EN ROUTE! Customer notified via Live Radar.')
    } catch (err: any) {
      showToast(`Error: ${err.message}`)
    }
  }

  // 2. Mark Arrived at Gate
  const handleMarkArrivedAtGate = async () => {
    if (!activeAssignment) return
    setHasArrivedAtGate(true)
    try {
      await api.updateJobTransit(activeAssignment.job.id, {
        transitStage: 'ARRIVED',
        arrivedAt: new Date().toISOString(),
      })
      showToast('Arrived at Gate! Customer alerted to share their 4-Digit PIN.')
    } catch (err: any) {
      showToast(`Error: ${err.message}`)
    }
  }

  // 3. Verify Customer Security PIN & Start Job
  const handleVerifyPinAndStart = async () => {
    if (!activeAssignment) return
    let customer: any = null
    try {
      if (activeAssignment.job.description) {
        customer = JSON.parse(activeAssignment.job.description)
      }
    } catch { }

    const expectedPin = customer?.servicePin || '4829'
    const entered = enteredPin.trim()

    // Accept matching PIN or universal demo safety codes (4829, 6410, 0000)
    if (entered !== expectedPin && entered !== '4829' && entered !== '6410' && entered !== '0000') {
      setPinError(`Incorrect Security PIN. Ask customer for the 4-digit code shown on their DispatchGrid tracking screen.`)
      return
    }

    setActionLoading('verify-pin')
    setPinError(null)
    try {
      await api.updateJobState(activeAssignment.job.id, 'IN_PROGRESS')
      await api.updateJobTransit(activeAssignment.job.id, {
        transitStage: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
      })
      setShowPinModal(false)
      setEnteredPin('')
      setHasArrivedAtGate(true)
      setIsEnRoute(true)
      showToast('Customer PIN verified! Job started on site. Stopwatch active.')
      await loadTechDetails(selectedTechId)
    } catch (err: any) {
      setPinError(err.message || 'Failed to start job')
    } finally {
      setActionLoading(null)
    }
  }

  // 4. Complete Job with Resolution & Parts Sheet (Urban Company Style)
  const handleConfirmCompletion = async () => {
    if (!activeAssignment) return
    setActionLoading('completing')
    try {
      await api.updateJobState(activeAssignment.job.id, 'COMPLETED')
      await api.updateJobTransit(activeAssignment.job.id, {
        transitStage: 'COMPLETED',
        resolutionNote,
        selectedParts,
        extraTasks,
        extraTasksTotal,
        partsCost: totalPartsCost + extraTasksTotal,
        completedAt: new Date().toISOString(),
      })
      setShowCompletionModal(false)
      setHasArrivedAtGate(false)
      setIsEnRoute(false)
      setOnSiteSecondsElapsed(0)
      playDispatchChime()
      showToast(`Work Order marked COMPLETED! Extra tasks (+₹${extraTasksTotal}) added to invoice.`)
      await loadTechDetails(selectedTechId)
    } catch (err: any) {
      showToast(`Completion error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // 5. Report Delay & Trigger Algorithmic Recovery
  const handleOpenDelayModal = () => {
    setShowDelayModal(true)
  }

  const handleConfirmDelay = async () => {
    if (!activeAssignment) return
    setActionLoading('delay')
    try {
      const currentDuration = activeAssignment.job.durationMinutes || 45
      await api.extendDuration(activeAssignment.job.id, currentDuration + delayMinutes, delayReason)
      await api.updateJobTransit(activeAssignment.job.id, {
        complication: {
          reason: delayReason,
          delayMinutes,
          reportedAt: new Date().toISOString(),
        },
      })
      setShowDelayModal(false)
      showToast(`Delay (+${delayMinutes}m) logged: "${delayReason}". Downstream route protected by engine!`)
      await loadTechDetails(selectedTechId)
    } catch (err: any) {
      showToast(`Delay reporting failed: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Decline Job
  const handleDeclineJob = async (jobId: string) => {
    setActionLoading(`decline-${jobId}`)
    try {
      const res: any = await api.declineJob(jobId, 'Partner unavailable for this route')
      if (res?.reassigned) {
        showToast(`Offer declined! Reassigned to backup Captain ${res.backupTechName || 'partner'}!`)
      } else {
        showToast('Offer declined. Returned to pending queue. You will not be reassigned this job.')
      }
      await loadTechDetails(selectedTechId)
      await loadTechnicians()
    } catch (err: any) {
      showToast(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Offer countdown timer (60s response window)
  useEffect(() => {
    const assignments: any[] = techData?.assignments || []
    const pendingOffer = assignments.find((a) => a.job?.status === 'ASSIGNED')

    let desc: any = {}
    try {
      if (pendingOffer?.job?.description) desc = JSON.parse(pendingOffer.job.description)
    } catch {}

    if (!pendingOffer || desc.isAccepted) {
      setOfferCountdown(60)
      return
    }

    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleDeclineJob(pendingOffer.job.id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [techData, hasAcceptedJob])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <IconActivity className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Connecting to Partner Network...</span>
      </div>
    )
  }

  const assignments: any[] = techData?.assignments || []
  const activeAssignment = assignments.find((a) => a.job?.status === 'IN_PROGRESS' || a.job?.status === 'ASSIGNED')
  const completedCount = assignments.filter((a) => a.job?.status === 'COMPLETED').length
  const baseEarnings = (completedCount + 3) * 650
  const bonusIncentive = 400
  const totalPartnerEarnings = baseEarnings + bonusIncentive

  // Total parts cost calculation
  const totalPartsCost = selectedParts.reduce((acc, partId) => {
    const part = COMMON_PARTS.find((p) => p.id === partId)
    return acc + (part ? part.price : 0)
  }, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header: Partner Profile & Duty Switch */}
      <div className="glass-panel rounded-2xl p-5 border-indigo-500/30 relative overflow-hidden shadow-2xl space-y-4">
        {/* Operations Network Banner */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-cyan-950/80 border border-indigo-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center text-cyan-400">
              <IconHardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Fleet Partner Operations Console</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded-full font-mono">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Verified Technician Operations Network. Manage work orders, live GPS transit, and on-site repair verifications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setProfileTab('REGISTER')
                setShowProfileModal(true)
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>+ Register Partner Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileTab('BADGE')
                setShowProfileModal(true)
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <IconShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>KYC Credentials</span>
            </button>
          </div>
        </div>

        {/* Profile Card & Duty Switch */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-indigo-400/30">
                {techData?.name ? techData.name.slice(0, 2).toUpperCase() : 'TC'}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${techData?.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono flex items-center gap-1">
                  <IconCheck className="w-3 h-3" /> Captain Verified
                </span>

                {/* Persona Switcher Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Active Profile:</span>
                  <select
                    value={selectedTechId}
                    onChange={(e) => handleSelectTechnician(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white font-bold text-xs sm:text-sm rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-full sm:max-w-xs truncate"
                  >
                    {technicians.length === 0 ? (
                      <option value="">No partners registered yet (Click + Register)</option>
                    ) : (
                      technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({Array.isArray(t.skills) ? t.skills.join(', ') : t.skills})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('BADGE')
                    setShowProfileModal(true)
                  }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-700 flex items-center gap-1 font-mono transition-all cursor-pointer shadow-sm hover:bg-indigo-900 shrink-0"
                >
                  <IconShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>ID Badge & KYC</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <IconStar className="w-3.5 h-3.5 fill-amber-400" /> 4.9 Rating
                </span>
                <span>•</span>
                <span>Shift: {techData?.shiftStart || '08:00'} – {techData?.shiftEnd || '20:00'}</span>
                <span>•</span>
                <span>Hubs: {Array.isArray(techData?.serviceZones) ? techData.serviceZones.join(', ') : techData?.serviceZones}</span>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {techData?.skills && (Array.isArray(techData.skills) ? techData.skills : JSON.parse(techData.skills || '[]')).map((sk: string) => (
                  <span key={sk} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-800/60 font-mono capitalize">
                    {sk.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Big Duty Status Toggle (Online / Offline) */}
          <div className="shrink-0 w-full md:w-auto flex justify-end">
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={actionLoading === 'duty'}
              className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md whitespace-nowrap min-w-[180px] ${techData?.isAvailable
                ? 'bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 glow-pill-emerald'
                : 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500/60 text-rose-300 glow-pill-rose'
                }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${techData?.isAvailable ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span>{techData?.isAvailable ? 'ONLINE (ON DUTY)' : 'OFFLINE (OFF DUTY)'}</span>
            </button>
          </div>
        </div>

        {/* Feature 4: Partner Wallet & Incentive Tracker (Driver Economics) */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Today's Payout</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                ₹{totalPartnerEarnings.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Completed Orders</div>
              <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">{completedCount + 3} Jobs</div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">SLA Bonus</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">+₹{bonusIncentive}</div>
            </div>
          </div>

          {/* Weekly Incentive Tier Bar */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <IconTarget className="w-3.5 h-3.5 text-cyan-400" />
                <span>Weekly Partner Incentive Goal</span>
                <span className="text-amber-400 font-mono">8 / 12 Completed</span>
              </span>
              <span className="text-emerald-400 font-bold font-mono">+₹1,000 Weekend Bonus</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full w-[66%]"></div>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Complete 4 more orders before Sunday 10 PM</span>
              <span className="text-indigo-400 font-mono">Tier 2 Captain</span>
            </div>
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

      {/* ACTIVE DISPATCH ALERT / ORDER (Feature 1 & Feature 2) */}
      {activeAssignment ? (() => {
        let customer: any = null
        try {
          if (activeAssignment.job.description) {
            customer = JSON.parse(activeAssignment.job.description)
          }
        } catch { }

        const dbCust = activeAssignment.job.customer
        const custName = dbCust?.name || customer?.customerName || customer?.name || 'Customer'
        const custPhone = dbCust?.phone || customer?.customerPhone || customer?.phone || '+91 98450 12345'
        const custEmail = dbCust?.email || customer?.customerEmail || customer?.email || 'customer@dispatchgrid.in'
        const custAddress = dbCust?.address || customer?.address || 'Bengaluru, India'
        const custAge = dbCust?.age || customer?.age || 28
        const custGateNote = customer?.gateNote || 'Flat 402, Ring bell twice'

        return (
          <div className="glass-panel rounded-2xl border-amber-500/40 p-5 space-y-4 shadow-xl relative overflow-hidden bg-gradient-to-b from-amber-950/20 via-slate-900/80 to-slate-900">
            {/* Header & Priority */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${activeAssignment.job.status === 'IN_PROGRESS' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-ping'
                  }`} />
                <h3 className="font-bold text-white text-base">
                  {activeAssignment.job.status === 'IN_PROGRESS'
                    ? 'Service In Progress On-Site'
                    : hasArrivedAtGate
                      ? 'Arrived at Customer Gate'
                      : 'Active Dispatched Work Order'}
                </h3>
              </div>
              <span
                className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${activeAssignment.job.priority === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  }`}
              >
                {activeAssignment.job.priority} TIER
              </span>
            </div>

            {/* Job Details */}
            <div className="space-y-2">
              <div className="text-base font-bold text-white">{activeAssignment.job.title}</div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-cyan-400">
                  <IconMapPin className="w-3.5 h-3.5" /> {activeAssignment.job.serviceZone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <IconClock className="w-3.5 h-3.5 text-indigo-400" /> Target Duration: {activeAssignment.job.durationMinutes} mins
                </span>
                <span>•</span>
                <span className="font-mono text-emerald-400 font-bold">Base Payout: ₹650</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Scheduled Slot: {new Date(activeAssignment.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(activeAssignment.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Feature 2: Active On-Site Repair Stopwatch (ticks up during IN_PROGRESS) */}
            {activeAssignment.job.status === 'IN_PROGRESS' && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <IconClock className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-300 font-mono">
                      Live On-Site Repair Stopwatch
                    </div>
                    <div className="text-lg font-black text-white font-mono mt-0.5">
                      {Math.floor(onSiteSecondsElapsed / 60)}m {(onSiteSecondsElapsed % 60).toString().padStart(2, '0')}s
                      <span className="text-xs font-normal text-slate-400 ml-2">/ {activeAssignment.job.durationMinutes}m SLA Target</span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono flex items-center gap-1">
                  <IconCheck className="w-3 h-3" /> PIN Verified
                </span>
              </div>
            )}

            {/* Customer Profile & Gate Note Dossier (Feature 5) */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between font-mono">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <IconUser className="w-3.5 h-3.5" /> Customer Contact & Delivery Location
                </span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/80 px-2 py-0.5 rounded text-[9px]">
                  {dbCust?.id ? `Verified Record (${dbCust.id.slice(0, 8)})` : 'Verified Resident'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{custName}</span>
                    <span className="text-xs text-slate-400 font-normal">({custAge} yrs)</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1"><IconPhone className="w-3 h-3 text-slate-400" /> {custPhone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><IconMail className="w-3 h-3 text-slate-400" /> {custEmail}</span>
                  </div>
                  <div className="text-xs text-cyan-300 mt-1 flex items-start gap-1.5">
                    <IconMapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{custAddress}</span>
                  </div>
                  <div className="text-[11px] text-amber-300 mt-1.5 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-800/60 inline-flex items-center gap-1.5 font-mono shadow-sm">
                    <IconDoorOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Arrival Note:</span>
                    <strong className="text-white">"{custGateNote}"</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => showToast(`Calling ${custName} (${custPhone})... (Simulated Call)`)}
                    className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <IconPhone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast(`Opening Turn-by-Turn GPS navigation to: ${custAddress}`)}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <IconMapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GPS Route</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 1: 3-Stage Partner Arrival Pipeline Action Row */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
              {activeAssignment.job.status === 'ASSIGNED' ? (
                <>
                  {!hasAcceptedJob ? (
                    <div className="w-full space-y-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-4 rounded-xl border border-indigo-500/60 shadow-lg animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                          <span className="text-xs font-black text-cyan-300 uppercase tracking-wider font-mono">
                            Incoming Dispatch Offer
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded-lg animate-pulse">
                            {offerCountdown}s window
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            Payout: ₹650 + ₹400 SLA Bonus
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300">
                        Service request from <strong className="text-white">{custName}</strong> for <strong className="text-cyan-300">{activeAssignment.job.title}</strong> at {custAddress}. Accept to lock dispatch.
                      </div>
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleAcceptJob}
                          disabled={actionLoading === 'accept'}
                          className="flex-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md glow-pill-emerald flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <IconCheckCircle className="w-4 h-4 text-white" />
                          <span>ACCEPT JOB OFFER</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineJob(activeAssignment.job.id)}
                          disabled={actionLoading?.startsWith('decline')}
                          className="bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-300 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          <IconX className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-full p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/70 text-emerald-300 text-xs flex items-center justify-between font-mono">
                        <span className="flex items-center gap-1.5">
                          <IconCheck className="w-3.5 h-3.5" /> Order Accepted by Captain! Review directions & commence route:
                        </span>
                        <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded text-white">READY</span>
                      </div>

                      <div className="w-full flex flex-wrap gap-2">
                        {!isEnRoute && (
                          <button
                            type="button"
                            onClick={handleMarkEnRoute}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-md glow-pill-indigo flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            <IconTruck className="w-4 h-4 text-white" />
                            <span>Start Transit (En Route)</span>
                          </button>
                        )}

                        {!hasArrivedAtGate ? (
                          <button
                            type="button"
                            onClick={handleMarkArrivedAtGate}
                            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-md glow-pill-amber flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            <IconMapPin className="w-4 h-4 text-white" />
                            <span>Mark Arrived at Gate</span>
                          </button>
                        ) : (
                          <div className="px-3 py-2 bg-amber-950/80 border border-amber-600 text-amber-300 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5">
                            <IconMapPin className="w-4 h-4 text-amber-400" />
                            <span>At Customer Gate</span>
                          </div>
                        )}
                      </div>

                      {/* Prominent Direct In-Card Doorstep PIN Entry Field */}
                      <div className="w-full bg-slate-950/90 border border-emerald-500/50 rounded-2xl p-4 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                            <IconShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Verify Customer Doorstep 4-Digit PIN to Start</span>
                          </span>
                          <span className="text-[10px] text-amber-300 font-mono">Customer has PIN on their screen</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2.5">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 4829"
                            value={enteredPin}
                            onChange={(e) => {
                              setEnteredPin(e.target.value.replace(/\D/g, ''))
                              setPinError(null)
                            }}
                            className="w-full sm:w-44 text-center font-mono text-2xl font-black tracking-widest bg-slate-900 border border-slate-700 text-white rounded-xl py-2 focus:border-emerald-500 focus:outline-none shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyPinAndStart}
                            disabled={enteredPin.length < 4 || actionLoading !== null}
                            className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md glow-pill-emerald flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            <IconShieldCheck className="w-4 h-4 text-white" />
                            <span>{actionLoading === 'verify-pin' ? 'Verifying PIN...' : 'Verify PIN & Start Work'}</span>
                          </button>
                        </div>
                        {pinError && (
                          <div className="p-2 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-200">
                            {pinError}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeclineJob(activeAssignment.job.id)}
                    disabled={actionLoading !== null}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300 font-bold text-xs py-3 px-4 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Pass job to next backup partner"
                  >
                    Decline Job
                  </button>
                </>
              ) : (
                /* IN_PROGRESS: Active Service with Extra Jobs & Spare Parts Column / Table */
                <div className="w-full bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <IconSparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Extra Jobs & Replaced Spare Parts (Billing Add-ons)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-700/60">
                      Additional Amount: +₹{extraTasksTotal}
                    </span>
                  </div>

                  {/* Table of entered extra tasks */}
                  <div className="space-y-2">
                    {extraTasks.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        No additional tasks or spare parts logged yet. Use the inputs below if extra work was performed.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] text-slate-400 uppercase font-mono border-b border-slate-800/80">
                              <th className="pb-2 font-medium">Extra Job / Replaced Spare Part</th>
                              <th className="pb-2 font-medium text-right">Additional Price</th>
                              <th className="pb-2 font-medium text-right w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {extraTasks.map((item) => (
                              <tr key={item.id} className="text-slate-200">
                                <td className="py-2.5 font-medium flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  <span>{item.description}</span>
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                                  +₹{item.price}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExtraTask(item.id)}
                                    className="text-rose-400 hover:text-rose-300 text-[11px] px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Quick Add Chips */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Quick-Add Common Spare Parts:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_EXTRA_TASKS.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddExtraTask(q.description, q.price)}
                          className="text-[11px] bg-slate-900 hover:bg-indigo-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-indigo-600 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 font-mono active:scale-95"
                        >
                          <span>+ {q.description}</span>
                          <span className="text-emerald-400 font-bold">(₹{q.price})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Extra Job / Part Inputs */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800/80">
                    <input
                      type="text"
                      placeholder="Extra job description (e.g. Copper wiring 2m replaced)"
                      value={customTaskName}
                      onChange={(e) => setCustomTaskName(e.target.value)}
                      className="w-full sm:flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:border-cyan-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        placeholder="₹ Price"
                        value={customTaskPrice}
                        onChange={(e) => setCustomTaskPrice(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddExtraTask(customTaskName, parseFloat(customTaskPrice))}
                        className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        + Add Extra Job
                      </button>
                    </div>
                  </div>

                  {/* Resolution note */}
                  <div className="pt-2">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                      Technician Work Resolution Summary:
                    </label>
                    <input
                      type="text"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Button to Mark Tasks or Services Done */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmCompletion}
                      disabled={actionLoading !== null}
                      className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm py-3.5 px-6 rounded-xl transition-all shadow-xl glow-pill-emerald flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <IconCheckCircle className="w-5 h-5 text-white" />
                      <span>MARK TASK & SERVICE COMPLETED {extraTasksTotal > 0 ? `(+₹${extraTasksTotal} Extra)` : ''}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDelayModal}
                      disabled={actionLoading !== null}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-3 px-4 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                      title="Report on-site complication (+45m)"
                    >
                      <IconAlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Report Delay (+45m)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })() : (
        <div className="glass-panel rounded-2xl p-6 border-slate-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-500">
            <IconTruck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-300">No Active Order Right Now</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            You are online. Stay in {techData?.serviceZones?.join(', ') || 'your zone'} to receive instant dispatches.
          </p>
        </div>
      )}

      {/* TODAY'S ASSIGNED SHIFT TIMELINE / QUEUE */}
      <div className="glass-panel rounded-2xl border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <IconClock className="w-4 h-4 text-indigo-400" />
              <span>Assigned Shift Route & Schedule</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Chronological queue for today's shift ({assignments.length} jobs assigned)</p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800">
            {assignments.length} Scheduled
          </span>
        </div>

        {assignments.length > 0 ? (
          <div className="space-y-2.5">
            {assignments.map((a: any, idx: number) => {
              const job = a.job
              const isLocked = a.isLocked || job.status === 'IN_PROGRESS' || job.status === 'COMPLETED'
              return (
                <div
                  key={a.id || idx}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${job.status === 'IN_PROGRESS'
                    ? 'bg-indigo-950/40 border-indigo-500/70'
                    : job.status === 'COMPLETED'
                      ? 'bg-slate-950/50 border-slate-800/80 opacity-60'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{job.title}</span>
                      {isLocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                          LOCKED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
                      <span>{job.serviceZone}</span>
                      <span>•</span>
                      <span>
                        {new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(a.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>Transit: {Math.round(a.travelTimeMin || 0)}m</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap font-mono ${job.status === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : job.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                      }`}
                  >
                    {job.status}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No jobs scheduled yet for this technician.</p>
        )}
      </div>

      {/* MODAL 1: Start-Service 4-Digit Security PIN Verification */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="glass-panel rounded-2xl border-indigo-500/50 p-6 w-full max-w-sm shadow-2xl text-center space-y-4 animate-float-slow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <IconShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verify Customer 4-Digit PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ask the customer for the security PIN displayed on their DispatchGrid tracking screen:
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-200">
                {pinError}
              </div>
            )}

            <div className="py-2">
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 6410"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                className="w-44 text-center font-mono text-3xl font-black tracking-widest bg-slate-950 border border-indigo-500/60 text-white rounded-xl py-2.5 focus:outline-none focus:border-indigo-400 shadow-inner"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={enteredPin.length < 4 || actionLoading !== null}
                onClick={handleVerifyPinAndStart}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md glow-pill-emerald cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Verifying PIN...' : 'Confirm PIN & Start Work'}
              </button>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Job Completion & Parts Consumed Sheet (Urban Company Style) */}
      {showCompletionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowCompletionModal(false)}
        >
          <div
            className="glass-panel rounded-2xl border-indigo-500/50 p-6 w-full max-w-md shadow-2xl space-y-4 animate-float-slow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <IconCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Work Completion & Materials Sheet</h3>
                  <p className="text-xs text-slate-400">Urban Company standard itemized closeout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Resolution Summary */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Resolution & Work Performed
              </label>
              <input
                type="text"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Consumables / Parts Installed Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Consumables / Replacement Parts Used
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Parts Subtotal: ₹{totalPartsCost}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {COMMON_PARTS.map((part) => {
                  const isChecked = selectedParts.includes(part.id)
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        setSelectedParts((prev) =>
                          isChecked ? prev.filter((id) => id !== part.id) : [...prev, part.id]
                        )
                      }}
                      className={`w-full p-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${isChecked
                        ? 'bg-indigo-950/70 border-indigo-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                          }`}>
                          {isChecked ? <IconCheck className="w-3 h-3 text-white" /> : null}
                        </span>
                        <span>{part.name}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">₹{part.price}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Warranty Badge */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <IconShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>DispatchGrid 30-Day Service Guarantee Stamped</span>
              </span>
              <span className="text-cyan-400 font-mono">Invoice Signed</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleConfirmCompletion}
                className="flex-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md glow-pill-emerald flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <IconRotateCw className="w-4 h-4 animate-spin" />
                    <span>Signing Off Order...</span>
                  </>
                ) : (
                  <>
                    <IconCheckCircle className="w-4 h-4" />
                    <span>Complete Order & Issue Digital Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: On-Site Complication & Delay Reporter */}
      {showDelayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowDelayModal(false)}
        >
          <div
            className="glass-panel rounded-2xl border-amber-500/50 p-6 w-full max-w-md shadow-2xl space-y-4 animate-float-slow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <IconAlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Report On-Site Complication</h3>
                  <p className="text-xs text-slate-400">Protects downstream bookings with algorithmic recovery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Delay Reason Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Complication Cause
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {DELAY_REASONS.map((r) => {
                  const isSelected = delayReason === r.title
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setDelayReason(r.title)
                        setDelayMinutes(r.defaultMinutes)
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${isSelected
                        ? 'bg-amber-950/70 border-amber-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{r.title}</span>
                        <span className="text-[10px] font-mono text-amber-400">+{r.defaultMinutes}m</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Delay Duration Picker */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Estimated Extra Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDelayMinutes(mins)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${delayMinutes === mins
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                  >
                    +{mins} Minutes
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleConfirmDelay}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md glow-pill-amber flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Triggering Recovery Engine...' : 'Submit Delay & Protect Downstream Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Partner Profile & Verification Modal (Urban Company Captain & ID Badge Standard) */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="glass-panel border-indigo-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-float-slow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <IconX className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-xl font-black shadow-md">
                <IconShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Technician Profile & Fleet Verification</h3>
                <p className="text-xs text-slate-400">Urban Company & Police Clearance Standard</p>
              </div>
            </div>

            {/* Tabs: Digital ID Badge vs Register New Fleet Partner */}
            <div className="flex border-b border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setProfileTab('BADGE')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${profileTab === 'BADGE'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                Digital Partner ID Badge
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('REGISTER')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${profileTab === 'REGISTER'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                + Onboard New Partner Profile
              </button>
            </div>

            {profileTab === 'BADGE' ? (
              <div className="space-y-4">
                {/* The Badge */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 p-4 rounded-2xl border border-indigo-500/40 shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      DISPATCHGRID VERIFIED FLEET ID
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                      ACTIVE • 2026
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 pt-1">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg border border-indigo-400 shrink-0">
                      {techData?.name ? techData.name.slice(0, 2).toUpperCase() : 'TC'}
                    </div>
                    <div>
                      <div className="text-base font-black text-white">{techData?.name}</div>
                      <div className="text-xs text-slate-300 font-mono">
                        ID: DG-TECH-{techData?.id ? techData.id.slice(0, 6).toUpperCase() : '9042'}
                      </div>
                      <div className="text-xs text-emerald-400 font-medium">
                        Skills: {Array.isArray(techData?.skills) ? techData.skills.join(', ') : techData?.skills}
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Police Background Clearance: <strong>Verified (#KA-POL-8492)</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Government Aadhaar e-KYC: <strong>Identity Confirmed</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Trade Competency: <strong>NSDC Level 4 Master Technician</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Vehicle Equipment: <strong>Toolkit & Safety Gear Inspected</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    Close Badge View
                  </button>
                </div>
              </div>
            ) : (
              /* Onboarding Form for Friend A */
              <form onSubmit={handleRegisterNewPartner} className="space-y-4 text-xs">
                {/* 1-Click Fast Fill Specialist Credentials */}
                <div className="p-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/40 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <IconZap className="w-4 h-4 text-cyan-400" />
                      <span>Fast Onboarding Preset</span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-mono">CERTIFIED</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">Pre-selects all 5 trade skills and all 5 city service hubs.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTechForm({
                        name: 'Captain Arjun Rao (Master Fleet Specialist)',
                        phone: '+91 98765 43210',
                        skills: ['plumbing', 'electrical', 'hvac', 'appliance-repair', 'locksmith'],
                        zones: ['zone-central', 'zone-south', 'zone-north', 'zone-east', 'zone-west'],
                        shiftStart: '08:00',
                        shiftEnd: '20:00',
                      })
                      showToast('Pre-filled specialist profile with all trade skills & zones!')
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-[11px] font-mono shadow-md cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                  >
                    Auto-Fill Preset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Technician / Partner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Captain Arjun Rao"
                      value={newTechForm.name}
                      onChange={(e) => setNewTechForm({ ...newTechForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={newTechForm.phone}
                      onChange={(e) => setNewTechForm({ ...newTechForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Shift Start (24h)
                    </label>
                    <input
                      type="text"
                      placeholder="08:00"
                      value={newTechForm.shiftStart}
                      onChange={(e) => setNewTechForm({ ...newTechForm, shiftStart: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Shift End (24h)
                    </label>
                    <input
                      type="text"
                      placeholder="20:00"
                      value={newTechForm.shiftEnd}
                      onChange={(e) => setNewTechForm({ ...newTechForm, shiftEnd: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Qualified Trade Skills * ({newTechForm.skills.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewTechForm(p => ({
                        ...p,
                        skills: p.skills.length === ALL_TECH_SKILLS.length ? [] : ALL_TECH_SKILLS.map(s => s.id)
                      }))}
                      className="text-[10px] text-cyan-400 hover:underline font-mono cursor-pointer"
                    >
                      {newTechForm.skills.length === ALL_TECH_SKILLS.length ? 'Clear All' : 'Select All Skills'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_TECH_SKILLS.map((sk) => {
                      const isSel = newTechForm.skills.includes(sk.id)
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => setNewTechForm(p => ({
                            ...p,
                            skills: isSel ? p.skills.filter(s => s !== sk.id) : [...p.skills, sk.id]
                          }))}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${isSel ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                          <span className="font-medium text-[11px]">{sk.label}</span>
                          <span className={`text-xs ${isSel ? 'text-cyan-400 font-bold' : 'text-slate-600'}`}>{isSel ? <IconCheck className="w-3.5 h-3.5 text-cyan-400 inline" /> : '+'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Service Operating Zones * ({newTechForm.zones.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewTechForm(p => ({
                        ...p,
                        zones: p.zones.length === ALL_TECH_ZONES.length ? [] : ALL_TECH_ZONES.map(z => z.id)
                      }))}
                      className="text-[10px] text-cyan-400 hover:underline font-mono cursor-pointer"
                    >
                      {newTechForm.zones.length === ALL_TECH_ZONES.length ? 'Clear All' : 'Select All Zones'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_TECH_ZONES.map((zn) => {
                      const isSel = newTechForm.zones.includes(zn.id)
                      return (
                        <button
                          key={zn.id}
                          type="button"
                          onClick={() => setNewTechForm(p => ({
                            ...p,
                            zones: isSel ? p.zones.filter(z => z !== zn.id) : [...p.zones, zn.id]
                          }))}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${isSel ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                          <span className="font-medium text-[11px]">{zn.label}</span>
                          <span className={`text-xs ${isSel ? 'text-cyan-400 font-bold' : 'text-slate-600'}`}>{isSel ? <IconCheck className="w-3.5 h-3.5 text-cyan-400 inline" /> : '+'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant Fleet Matching Guarantee</span>
                  </div>
                  <p>Registering will add this technician to the live SQLite fleet pool with full qualification across selected skills and zones.</p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="w-1/3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'register-tech'}
                    className="w-2/3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl shadow-md glow-pill-indigo active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === 'register-tech' ? 'Registering...' : 'Register & Activate As Partner'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
