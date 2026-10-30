import { useState } from 'react'
import { api } from '../api'
import {
  IconPlay,
  IconRotateCw,
  IconRefresh,
} from './Icons'

interface Props {
  onRefresh: () => void
  onShowToast: (msg: string, type: 'success' | 'error') => void
  onShowDiff: (run: any) => void
}

export default function ControlPanel({ onRefresh, onShowToast, onShowDiff }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading('generate')
    try {
      const result = await api.generateSchedule()
      onShowToast(
        `Schedule generated successfully: ${result.metrics.assignedJobs} assigned, ${result.metrics.unassignedJobs} unassigned`,
        'success'
      )
      onShowDiff(await api.getRun(result.runId))
      onRefresh()
    } catch (e: any) {
      onShowToast(e.message, 'error')
    }
    setLoading(null)
  }

  const handleReOptimize = async () => {
    setLoading('reopt')
    try {
      const result = await api.reOptimize('Manual re-optimization from dashboard')
      onShowToast(
        `Fleet re-optimized: ${result.metrics.jobsReassigned} reassigned, ${result.metrics.jobsNewlyAssigned} newly assigned`,
        'success'
      )
      onShowDiff(await api.getRun(result.runId))
      onRefresh()
    } catch (e: any) {
      onShowToast(e.message, 'error')
    }
    setLoading(null)
  }

  const handleResetBaseline = async () => {
    setLoading('reset')
    try {
      await api.resetSeed()
      onShowToast('Database restored to pristine baseline state (20 technicians, 100 jobs)', 'success')
      onRefresh()
    } catch (e: any) {
      onShowToast(`Reset failed: ${e.message}`, 'error')
    }
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Primary Action: Generate Schedule */}
      <button
        onClick={handleGenerate}
        disabled={!!loading}
        className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/40 glow-pill-emerald flex items-center gap-1.5 active:scale-95 cursor-pointer"
        title="Compute deterministic multi-objective schedule for full pool"
      >
        {loading === 'generate' ? (
          <IconRotateCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <IconPlay className="w-3.5 h-3.5 text-white" />
        )}
        <span>{loading === 'generate' ? 'Generating...' : 'Generate Schedule'}</span>
      </button>

      {/* Secondary Action: Re-Optimize */}
      <button
        onClick={handleReOptimize}
        disabled={!!loading}
        className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 disabled:opacity-50 text-slate-200 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
        title="Re-optimize current schedule while locking in-progress assignments"
      >
        {loading === 'reopt' ? (
          <IconRotateCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <IconRotateCw className="w-3.5 h-3.5 text-indigo-400" />
        )}
        <span>{loading === 'reopt' ? 'Optimizing...' : 'Re-Optimize'}</span>
      </button>

      {/* Discreet Data Reset */}
      <button
        onClick={handleResetBaseline}
        disabled={!!loading}
        className="text-slate-400 hover:text-emerald-400 disabled:opacity-50 flex items-center justify-center p-2 text-xs bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer"
        title="Restore Baseline State: resets to 20 technicians and 100 jobs"
      >
        <IconRefresh className={`w-3.5 h-3.5 ${loading === 'reset' ? 'animate-spin text-emerald-400' : ''}`} />
      </button>
    </div>
  )
}
