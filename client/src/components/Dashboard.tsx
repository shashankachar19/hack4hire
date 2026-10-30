import { useEffect, useState } from 'react'
import { api } from '../api'
import FinancialTelemetry from './FinancialTelemetry'
import PolicySliders, { type PolicyWeights } from './PolicySliders'
import FleetDisruptionConsole from './FleetDisruptionConsole'
import {
  IconUsers,
  IconLayers,
  IconCheckCircle,
  IconActivity,
  IconClock,
  IconAlertTriangle,
  IconSparkles,
  IconTrendingUp,
  IconX,
} from './Icons'

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-slate-500',
}

const STATUS_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  PENDING: { color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/40' },
  ASSIGNED: { color: 'text-indigo-400', bg: 'bg-indigo-950/40', border: 'border-indigo-800/40' },
  IN_PROGRESS: { color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40' },
  COMPLETED: { color: 'text-slate-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  CANCELLED: { color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/40' },
  UNASSIGNED: { color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/40' },
}

interface DashboardProps {
  onShowDiff?: (run: any) => void
}

export default function Dashboard({ onShowDiff }: DashboardProps) {
  const [schedule, setSchedule] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [techSearch, setTechSearch] = useState('')

  const loadData = () => {
    Promise.all([api.getCurrentSchedule(), api.getJobs()])
      .then(([s, j]) => {
        setSchedule(s)
        setJobs(j)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApplyGenerate = async (weights: PolicyWeights) => {
    setOptimizing(true)
    try {
      await api.generateSchedule(weights)
      setToastMessage('Schedule generated successfully with custom optimizer weights!')
      loadData()
    } catch (err: any) {
      setToastMessage(`Error generating schedule: ${err.message}`)
    } finally {
      setOptimizing(false)
      setTimeout(() => setToastMessage(null), 5000)
    }
  }

  const handleApplyReOptimize = async (weights: PolicyWeights) => {
    setOptimizing(true)
    try {
      await api.reOptimize('Policy Sliders Weight Adjustment', weights)
      setToastMessage('Schedule re-optimized with updated weights!')
      loadData()
    } catch (err: any) {
      setToastMessage(`Error re-optimizing: ${err.message}`)
    } finally {
      setOptimizing(false)
      setTimeout(() => setToastMessage(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <IconActivity className="w-6 h-6 animate-spin text-indigo-400" />
        <span className="text-sm font-semibold">Loading telemetry command center...</span>
      </div>
    )
  }

  // Compute stats
  const statusCounts: Record<string, number> = {}
  const priorityCounts: Record<string, number> = {}
  jobs.forEach((j) => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1
    priorityCounts[j.priority] = (priorityCounts[j.priority] || 0) + 1
  })

  const summary = schedule?.summary || {}

  return (
    <div className="space-y-6">
      {/* 1. Live Unit Economics Telemetry Bar */}
      <FinancialTelemetry summary={summary} />

      {toastMessage && (
        <div className="p-3 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs text-indigo-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <IconSparkles className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1 rounded">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Interactive Optimizer Policy Sliders */}
      <PolicySliders
        onApplyGenerate={handleApplyGenerate}
        onApplyReOptimize={handleApplyReOptimize}
        loading={optimizing}
      />

      {/* 3. Operational Disruption & Failover Console */}
      <FleetDisruptionConsole onDisruptionComplete={loadData} onShowDiff={onShowDiff} />

      {/* 4. KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KPICard
          label="Total Ingested"
          value={jobs.length}
          icon={IconLayers}
          accent="text-slate-200"
          borderGlow="hover:border-slate-700"
        />
        <KPICard
          label="Active Assigned"
          value={statusCounts['ASSIGNED'] || 0}
          icon={IconCheckCircle}
          accent="text-indigo-400"
          borderGlow="hover:border-indigo-500/40"
        />
        <KPICard
          label="In Progress (Locked)"
          value={statusCounts['IN_PROGRESS'] || 0}
          icon={IconClock}
          accent="text-emerald-400"
          borderGlow="hover:border-emerald-500/40"
        />
        <KPICard
          label="Completed"
          value={statusCounts['COMPLETED'] || 0}
          icon={IconTrendingUp}
          accent="text-slate-400"
          borderGlow="hover:border-slate-700"
        />
        <KPICard
          label="Unassigned / Triage"
          value={(statusCounts['UNASSIGNED'] || 0) + (statusCounts['PENDING'] || 0)}
          icon={IconAlertTriangle}
          accent="text-amber-400"
          borderGlow="hover:border-amber-500/40"
        />
        <KPICard
          label="Active Fleet"
          value={summary.totalTechnicians || 0}
          icon={IconUsers}
          sublabel={`${summary.availableTechnicians || 0} ready`}
          accent="text-cyan-400"
          borderGlow="hover:border-cyan-500/40"
        />
      </div>

      {/* Priority and Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Card */}
        <div className="glass-panel rounded-2xl border-slate-800 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Workforce Jobs by Priority Tier</span>
            <span className="text-[10px] text-indigo-400 font-mono">100 Total</span>
          </h3>
          <div className="space-y-3">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
              const count = priorityCounts[p] || 0
              const pct = jobs.length > 0 ? (count / jobs.length) * 100 : 0
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-300 w-20">{p}</span>
                  <div className="flex-1 bg-slate-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full ${PRIORITY_COLORS[p]} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200 w-10 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Card */}
        <div className="glass-panel rounded-2xl border-slate-800 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Operational Finite State Machine</span>
            <span className="text-[10px] text-emerald-400 font-mono">Real-Time State</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'UNASSIGNED', 'CANCELLED'].map((s) => {
              const badge = STATUS_BADGES[s] || { color: 'text-slate-300', bg: 'bg-slate-900', border: 'border-slate-800' }
              return (
                <div key={s} className={`p-3 rounded-xl border ${badge.bg} ${badge.border} flex flex-col justify-between`}>
                  <span className={`text-[11px] font-bold tracking-wider ${badge.color}`}>
                    {s.replace('_', ' ')}
                  </span>
                  <span className="text-xl font-bold font-mono text-white mt-1">
                    {statusCounts[s] || 0}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Technician Workload Card */}
      <div className="glass-panel rounded-2xl border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <IconUsers className="w-4 h-4 text-indigo-400" />
              <span>Technician Workload & Utilization Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Live shift utilization, skill profiles, and assigned job sequence.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name, skill, or zone..."
              value={techSearch}
              onChange={(e) => setTechSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
            />
            <span className="text-xs text-slate-400 font-mono whitespace-nowrap hidden md:inline">
              {summary.totalAssignments || 0} Assigned Across {summary.availableTechnicians || 0} Techs
            </span>
          </div>
        </div>

        {schedule?.schedule?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {schedule.schedule
              .filter((s: any) => {
                if (!techSearch.trim()) return true
                const query = techSearch.toLowerCase()
                return (
                  s.technician.name.toLowerCase().includes(query) ||
                  s.technician.skills?.some((sk: string) => sk.toLowerCase().includes(query)) ||
                  s.technician.serviceZones?.some((z: string) => z.toLowerCase().includes(query))
                )
              })
              .map((s: any) => {
              const count = s.assignments?.length || 0
              return (
                <div
                  key={s.technician.id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    !s.technician.isAvailable
                      ? 'border-rose-800/40 bg-rose-950/20 opacity-75'
                      : count === 0
                      ? 'border-slate-800 bg-slate-900/40'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[140px]">{s.technician.name}</span>
                    {!s.technician.isAvailable ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                        OFFLINE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {count} {count === 1 ? 'job' : 'jobs'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {s.technician.shiftStart}–{s.technician.shiftEnd} · {s.technician.serviceZones.join(', ')}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.technician.skills.map((sk: string) => (
                      <span key={sk} className="text-[9px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">
                        {sk}
                      </span>
                    ))}
                  </div>

                  {count > 0 && (
                    <div className="mt-2.5 flex gap-1">
                      {s.assignments.map((a: any) => (
                        <div
                          key={a.id}
                          className={`h-2 flex-1 rounded-full ${PRIORITY_COLORS[a.job.priority]}`}
                          title={`${a.job.title} (${a.job.priority})`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-xs py-4 text-center">No schedule generated yet. Click "Generate Schedule" to compute.</p>
        )}
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  sublabel,
  accent = 'text-white',
  icon: Icon,
  borderGlow = 'hover:border-slate-700',
}: {
  label: string
  value: number | string
  sublabel?: string
  accent?: string
  icon?: any
  borderGlow?: string
}) {
  return (
    <div className={`glass-panel rounded-xl p-3.5 border-slate-800 transition-all ${borderGlow}`}>
      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
        <span>{label}</span>
        {Icon && <Icon className={`w-3.5 h-3.5 ${accent}`} />}
      </div>
      <div className={`text-2xl font-black font-mono mt-1 ${accent}`}>{value}</div>
      {sublabel && <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{sublabel}</div>}
    </div>
  )
}
