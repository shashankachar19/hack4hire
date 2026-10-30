import { useEffect, useState } from 'react'
import { api } from '../api'
import { IconRotateCw, IconPlus, IconCheckCircle, IconFileText, IconLayers, IconActivity } from './Icons'

export default function AuditHistory({ onShowDiff }: { onShowDiff: (run: any) => void }) {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRuns()
      .then(setRuns)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <IconActivity className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Loading ledger audit history...</span>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border-slate-800 p-12 text-center">
        <IconFileText className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
        <h4 className="text-base font-semibold text-slate-300">No Schedule Runs Yet</h4>
        <p className="text-xs text-slate-400 mt-1">
          Generate an initial schedule or trigger a disruption scenario to record cryptographic ledger runs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconLayers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Schedule Ledger & Run History</h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {runs.length} Recorded Runs (Audit-Compliant)
        </span>
      </div>

      <div className="grid gap-3.5">
        {runs.map((run: any) => (
          <div
            key={run.id}
            className="glass-panel rounded-xl border-slate-800/80 p-4 hover:border-slate-700 transition-all shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      run.runType === 'INITIAL'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                        : run.runType === 'DISRUPTION_RECOVERY'
                        ? 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                        : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60'
                    }`}
                  >
                    {run.runType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(run.timestamp).toLocaleString()}
                  </span>
                </div>
                {run.triggerReason && (
                  <p className="text-xs text-slate-300 mt-1.5 font-medium">{run.triggerReason}</p>
                )}
                <code className="text-[10px] text-slate-500 mt-1 block font-mono">
                  Tx ID: {run.id}
                </code>
              </div>
              <button
                onClick={() => {
                  api.getRun(run.id).then(onShowDiff).catch(() => {})
                }}
                className="text-xs bg-slate-800/90 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 px-3.5 py-1.5 rounded-lg border border-slate-700/80 transition-colors font-medium flex items-center gap-1.5"
              >
                <IconFileText className="w-3.5 h-3.5" />
                View Ledger Diff
              </button>
            </div>

            {/* Metrics bar */}
            <div className="mt-3.5 grid grid-cols-3 md:grid-cols-6 gap-2">
              <Metric label="Total Jobs" value={run.totalJobs} />
              <Metric label="Assigned" value={run.assignedJobs} color="text-emerald-400" />
              <Metric label="Infeasible" value={run.infeasibleJobs} color="text-amber-400" />
              <Metric label="Impossible" value={run.impossibleJobs} color="text-rose-400" />
              <Metric
                label="SLA Breaches"
                value={run.slaViolations}
                color={run.slaViolations > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}
              />
              <Metric label="Obj Score" value={run.objectiveScore?.toFixed(1) || '0.0'} color="text-indigo-300" />
            </div>

            {/* Change stats for re-optimization */}
            {run.runType !== 'INITIAL' && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                  <IconRotateCw className="w-3.5 h-3.5 text-amber-400" />
                  Reassigned: {run.jobsReassigned}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300/90 font-medium">
                  <IconPlus className="w-3.5 h-3.5 text-emerald-400" />
                  Newly Assigned: {run.jobsNewlyAssigned}
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                  Preserved / Unchanged: {run.jobsUnchanged}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, color = 'text-white' }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-xs font-bold ${color} mt-0.5`}>{value}</div>
    </div>
  )
}
