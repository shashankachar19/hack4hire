import React from 'react'
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconXCircle,
  IconX,
  IconRotateCw,
  IconPlus,
  IconClock,
  IconMapPin,
  IconLayers,
} from './Icons'

interface Props {
  run: any
  onClose: () => void
}

const OUTCOME_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  ASSIGNED: { text: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-800/60' },
  INFEASIBLE: { text: 'text-amber-400', bg: 'bg-amber-950/60', border: 'border-amber-800/60' },
  IMPOSSIBLE: { text: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-800/60' },
  LOCKED: { text: 'text-slate-400', bg: 'bg-slate-900', border: 'border-slate-800' },
}

const CHANGE_BADGES: Record<string, { label: string; color: string }> = {
  new_assignment: { label: 'NEW', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  reassigned: { label: 'REASSIGNED', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  unchanged: { label: 'SAME', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  unassigned: { label: 'DISPLACED', color: 'bg-rose-950 text-rose-300 border-rose-800' },
}

export default function DiffModal({ run, onClose }: Props) {
  const details: any[] = run?.details || []

  // Group by outcome
  const assigned = details.filter(d => d.outcome === 'ASSIGNED')
  const infeasible = details.filter(d => d.outcome === 'INFEASIBLE')
  const impossible = details.filter(d => d.outcome === 'IMPOSSIBLE')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl border-indigo-500/30 w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shadow-md">
              <IconLayers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Schedule Execution & Ledger Diff
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    run.runType === 'INITIAL'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : run.runType === 'DISRUPTION_RECOVERY'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  }`}
                >
                  {run.runType?.replace('_', ' ')}
                </span>
              </div>
              {run.triggerReason && <p className="text-xs text-slate-400 mt-1">{run.triggerReason}</p>}
              <code className="text-[10px] text-slate-500 block mt-0.5 font-mono">Tx ID: {run.id}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics banner */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex gap-4 text-xs flex-wrap items-center">
          <span className="text-slate-400">Total: <b className="text-white font-mono">{run.totalJobs}</b></span>
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <IconCheckCircle className="w-3.5 h-3.5" /> Assigned: <b className="text-white font-mono">{run.assignedJobs}</b>
          </span>
          <span className="text-amber-400 flex items-center gap-1 font-medium">
            <IconAlertTriangle className="w-3.5 h-3.5" /> Infeasible: <b className="text-white font-mono">{run.infeasibleJobs}</b>
          </span>
          <span className="text-rose-400 flex items-center gap-1 font-medium">
            <IconXCircle className="w-3.5 h-3.5" /> Impossible: <b className="text-white font-mono">{run.impossibleJobs}</b>
          </span>
          <span className="text-indigo-400 font-medium">Objective Score: <b className="text-white font-mono">{run.objectiveScore?.toFixed(1) || '0.0'}</b></span>
          {run.runType !== 'INITIAL' && (
            <div className="flex gap-3 pl-2 border-l border-slate-700">
              <span className="text-amber-400 flex items-center gap-1">
                <IconRotateCw className="w-3 h-3" /> Reassigned: <b className="text-white font-mono">{run.jobsReassigned}</b>
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <IconPlus className="w-3 h-3" /> New: <b className="text-white font-mono">{run.jobsNewlyAssigned}</b>
              </span>
              <span className="text-slate-400">Unchanged: <b className="text-white font-mono">{run.jobsUnchanged}</b></span>
            </div>
          )}
        </div>

        {/* Details list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 pr-3">
          {/* Assigned */}
          {assigned.length > 0 && (
            <Section
              title="Assigned Jobs"
              count={assigned.length}
              icon={<IconCheckCircle className="w-4 h-4 text-emerald-400" />}
              badgeColor="text-emerald-400 bg-emerald-950/70 border-emerald-800"
            >
              {assigned.map(d => <DetailRow key={d.id} detail={d} />)}
            </Section>
          )}

          {/* Infeasible */}
          {infeasible.length > 0 && (
            <Section
              title="Infeasible Jobs (Time / Shift Constraints)"
              count={infeasible.length}
              icon={<IconAlertTriangle className="w-4 h-4 text-amber-400" />}
              badgeColor="text-amber-400 bg-amber-950/70 border-amber-800"
            >
              {infeasible.map(d => <DetailRow key={d.id} detail={d} />)}
            </Section>
          )}

          {/* Impossible */}
          {impossible.length > 0 && (
            <Section
              title="Impossible Jobs (Skill / Coverage Gap)"
              count={impossible.length}
              icon={<IconXCircle className="w-4 h-4 text-rose-400" />}
              badgeColor="text-rose-400 bg-rose-950/70 border-rose-800"
            >
              {impossible.map(d => <DetailRow key={d.id} detail={d} />)}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  icon,
  badgeColor,
  children,
}: {
  title: string
  count: number
  icon: React.ReactNode
  badgeColor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {count} jobs
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ detail }: { detail: any }) {
  const style = OUTCOME_STYLES[detail.outcome] || OUTCOME_STYLES.LOCKED
  const changeBadge = detail.changeType ? CHANGE_BADGES[detail.changeType] : null

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 text-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
            {detail.outcome}
          </span>
          {changeBadge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${changeBadge.color}`}>
              {changeBadge.label}
            </span>
          )}
          <span className="text-slate-400 text-xs font-mono">Job: {detail.jobId?.slice(0, 10)}...</span>
        </div>
        {detail.costScore != null && (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Cost: {detail.costScore.toFixed(2)}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-300 font-medium">{detail.explanation}</p>

      {detail.technicianId && detail.scheduledStart && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60 font-mono">
          <span className="text-indigo-400">Tech: {detail.technicianId?.slice(0, 8)}...</span>
          <span className="flex items-center gap-1">
            <IconClock className="w-3 h-3 text-slate-500" />
            {new Date(detail.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
            {new Date(detail.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {detail.travelTimeMin != null && (
            <span className="flex items-center gap-1 text-slate-400">
              <IconMapPin className="w-3 h-3 text-slate-500" />
              Transit: {detail.travelTimeMin.toFixed(1)} min
            </span>
          )}
        </div>
      )}

      {detail.previousTechId && detail.changeType === 'reassigned' && (
        <div className="text-[11px] text-indigo-400 mt-1 font-medium flex items-center gap-1">
          <IconRotateCw className="w-3 h-3" />
          Reassigned from technician {detail.previousTechId?.slice(0, 8)}...
        </div>
      )}

      {detail.reasons?.length > 0 && detail.outcome !== 'ASSIGNED' && (
        <ul className="mt-2 space-y-1 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
          {detail.reasons.map((r: string, i: number) => (
            <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
              <span className="text-slate-600">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
