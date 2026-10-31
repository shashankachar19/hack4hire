import { useEffect, useState } from 'react'
import { api } from '../api'
import {
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconMapPin,
  IconClock,
  IconZap,
  IconX,
  IconIndianRupee,
  IconActivity,
  IconShieldCheck,
} from './Icons'

export default function UnassignedPanel() {
  const [schedule, setSchedule] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadData = () => {
    api.getCurrentSchedule()
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleForceAssign = async (jobId: string) => {
    setActionLoading(jobId)
    try {
      const res = await api.forceAssign(jobId, 30)
      setNotification({
        message: res.explanation || 'Job successfully force-assigned with approved overtime!',
        type: 'success',
      })
      loadData()
    } catch (err: any) {
      setNotification({
        message: `Error force-assigning job: ${err.message}`,
        type: 'error',
      })
    } finally {
      setActionLoading(null)
      setTimeout(() => setNotification(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <IconActivity className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Analyzing unassigned queue & recovery pathways...</span>
      </div>
    )
  }

  const unassignedJobs: any[] = schedule?.unassignedJobs || []
  const explanations: any[] = schedule?.unassignedExplanations || []

  // Map explanations by jobId for quick lookup
  const explanationMap = new Map<string, any>()
  explanations.forEach(e => explanationMap.set(e.jobId, e))

  const formatINR = (val: number) => '₹' + Math.round(val).toLocaleString('en-IN')

  if (unassignedJobs.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border-slate-800 p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-xl shadow-emerald-950/50">
          <IconCheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">Full Dispatch Saturation</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          100% of candidate jobs are currently assigned to qualified technicians with zero unassigned queue backlog.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <IconAlertTriangle className="w-5 h-5 text-amber-400" />
            Unassigned Jobs & Business Recovery Matrix ({unassignedJobs.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Classified into <strong className="text-amber-400">Infeasible</strong> (capacity / overtime recoverable) and{' '}
            <strong className="text-rose-400">Impossible</strong> (structural skill / territory deficit).
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/80 border-rose-700/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <IconCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <IconXCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid gap-3.5">
        {unassignedJobs.map((job: any) => {
          const explanation = explanationMap.get(job.id)
          const isImpossible = explanation?.outcome === 'IMPOSSIBLE'
          const isInfeasible = explanation?.outcome === 'INFEASIBLE'
          const recovery = explanation?.recoveryTradeoff

          return (
            <div
              key={job.id}
              className={`glass-panel rounded-xl border p-4.5 transition-all ${
                isImpossible
                  ? 'border-rose-900/60 bg-rose-950/20'
                  : isInfeasible
                  ? 'border-amber-900/60 bg-amber-950/20'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-white text-sm tracking-wide">{job.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        job.priority === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : job.priority === 'HIGH'
                          ? 'bg-amber-600 text-white'
                          : job.priority === 'MEDIUM'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {job.priority}
                    </span>
                    <span className="text-[11px] bg-slate-900/90 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1">
                      <IconMapPin className="w-3 h-3 text-indigo-400" />
                      {job.serviceZone}
                    </span>
                    <span className="text-[11px] bg-slate-900/90 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1">
                      <IconClock className="w-3 h-3 text-slate-400" />
                      {job.durationMinutes} min
                    </span>
                    <span className="text-[11px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-lg font-mono font-bold flex items-center gap-0.5">
                      <IconIndianRupee className="w-3 h-3" />
                      Ticket: {formatINR(job.ticketValue || 2200)}
                    </span>
                    <span className="text-[11px] bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-lg font-mono flex items-center gap-0.5">
                      <IconShieldCheck className="w-3 h-3" />
                      SLA: {formatINR(job.slaPenaltyAmount || 2000)}
                    </span>
                  </div>
                </div>
                <div>
                  {isImpossible && (
                    <span className="text-[11px] bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-lg font-bold tracking-wider">
                      IMPOSSIBLE
                    </span>
                  )}
                  {isInfeasible && (
                    <span className="text-[11px] bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-lg font-bold tracking-wider">
                      INFEASIBLE
                    </span>
                  )}
                  {!explanation && (
                    <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold tracking-wider">
                      PENDING
                    </span>
                  )}
                </div>
              </div>

              {/* Constraint diagnostic explanation */}
              {explanation && (
                <div
                  className={`mt-3 rounded-xl p-3 text-xs ${
                    isImpossible
                      ? 'bg-rose-950/40 border border-rose-900/50'
                      : 'bg-amber-950/40 border border-amber-900/50'
                  }`}
                >
                  <p className={`font-semibold mb-1.5 ${isImpossible ? 'text-rose-300' : 'text-amber-300'}`}>
                    {explanation.explanation}
                  </p>
                  {explanation.reasons?.length > 0 && (
                    <ul className="space-y-1">
                      {explanation.reasons.map((r: string, i: number) => (
                        <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                          <span className="text-slate-500 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Actionable Business Recovery Card */}
              {isInfeasible && recovery && (
                <div className="mt-3 bg-emerald-50 border border-emerald-300 text-emerald-950 border border-emerald-500/50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-900/90 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-600 flex items-center gap-1 shadow-sm">
                        <IconZap className="w-3 h-3 text-emerald-300" />
                        Actionable Business Recovery
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        +{formatINR(recovery.netBenefitINR)} Net Margin Value
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1.5 font-medium">{recovery.actionLabel}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                      <span>
                        Ticket: <strong className="text-emerald-400">{formatINR(recovery.ticketValueINR)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Overtime Cost: <strong className="text-amber-400">₹{recovery.overtimeCostINR}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        SLA Saved: <strong className="text-indigo-400">{formatINR(recovery.penaltyAvoidedINR)}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleForceAssign(job.id)}
                    disabled={actionLoading === job.id}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl whitespace-nowrap shadow-lg shadow-emerald-950/60 transition flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
                  >
                    {actionLoading === job.id ? (
                      <>
                        <IconActivity className="w-3.5 h-3.5 animate-spin" /> Assigning...
                      </>
                    ) : (
                      <>
                        <IconZap className="w-3.5 h-3.5" /> Force Assign (+30m Overtime)
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-3 text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 font-mono">
                <span>
                  Required Skills: <strong className="text-slate-200">{job.requiredSkills?.join(', ')}</strong>
                </span>
                <span>•</span>
                <span>
                  Window: {new Date(job.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(job.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>•</span>
                <span>
                  SLA: {new Date(job.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
