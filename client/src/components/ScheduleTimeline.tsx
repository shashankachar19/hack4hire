import { useEffect, useState } from 'react'
import { api } from '../api'
import { IconLock, IconClock, IconActivity } from './Icons'

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: 'bg-rose-600/90 border-rose-400 text-white shadow-rose-950/40',
  HIGH: 'bg-amber-600/90 border-amber-400 text-white shadow-amber-950/40',
  MEDIUM: 'bg-indigo-600/90 border-indigo-400 text-white shadow-indigo-950/40',
  LOW: 'bg-slate-600/90 border-slate-400 text-slate-100 shadow-slate-950/40',
}

export default function ScheduleTimeline() {
  const [schedule, setSchedule] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCurrentSchedule()
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <IconActivity className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Synchronizing dispatch timeline...</span>
      </div>
    )
  }

  if (!schedule?.schedule?.length) {
    return (
      <div className="glass-panel rounded-2xl border-slate-800 p-12 text-center">
        <IconClock className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
        <h4 className="text-base font-semibold text-slate-300">No Schedule Active</h4>
        <p className="text-xs text-slate-400 mt-1">
          Generate an initial schedule from the Command Center to visualize technician Gantt schedules.
        </p>
      </div>
    )
  }

  // Find all assignments across technicians
  const allAssignments = schedule.schedule.flatMap((s: any) => s.assignments || [])

  // Anchor the operational time axis strictly from 06:00 to 20:00 of the schedule's date
  const firstAssignment = allAssignments[0]
  const refDate = firstAssignment ? new Date(firstAssignment.scheduledStart) : new Date()

  const startHour = new Date(refDate)
  startHour.setHours(6, 0, 0, 0)
  const endHour = new Date(refDate)
  endHour.setHours(20, 0, 0, 0)

  const timelineStart = startHour.getTime()
  const timelineEnd = endHour.getTime()
  const timelineSpan = timelineEnd - timelineStart || 1

  // Fixed hourly intervals from 06:00 to 20:00
  const hourMarks = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  const hours: Date[] = hourMarks.map((h) => {
    const d = new Date(refDate)
    d.setHours(h, 0, 0, 0)
    return d
  })

  return (
    <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden w-full shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
            <IconClock className="w-5 h-5 text-indigo-400" />
            Operational Schedule Timeline & Gantt View
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational window (06:00 – 20:00). High-precision slotting, transit buffers, and SLA adherence.
          </p>
        </div>
        <div className="text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/80 font-medium">
          Total Assigned Jobs:{' '}
          <span className="font-bold font-mono text-emerald-400 ml-1">{allAssignments.length}</span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        {/* Hour headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/70">
          <div className="w-48 flex-shrink-0 px-3.5 py-2 text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Technician & Shift
          </div>
          <div className="flex-1 relative h-8 mr-3">
            {hours.map((h, i) => {
              const left = Math.max(0, Math.min(100, ((h.getTime() - timelineStart) / timelineSpan) * 100))
              return (
                <div
                  key={i}
                  className="absolute text-[11px] text-slate-400 -translate-x-1/2 font-mono font-medium"
                  style={{ left: `${left}%`, top: '6px' }}
                >
                  {h.getHours().toString().padStart(2, '0')}:00
                </div>
              )
            })}
          </div>
        </div>

        {/* Technician rows */}
        <div className="divide-y divide-slate-800/40 max-h-[600px] overflow-y-auto">
          {schedule.schedule.map((s: any) => (
            <div key={s.technician.id} className="flex hover:bg-slate-800/25 transition-colors">
              <div className="w-48 flex-shrink-0 px-3.5 py-2.5">
                <div className="text-xs font-semibold text-slate-200 truncate">{s.technician.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {s.technician.shiftStart} – {s.technician.shiftEnd}
                  <span className="ml-1.5 text-slate-500 font-sans">({s.technician.serviceZone})</span>
                </div>
                {!s.technician.isAvailable && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-rose-400 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> OFFLINE
                  </span>
                )}
              </div>
              <div className="flex-1 relative py-1.5 min-h-[46px] mr-3">
                {/* Shift background */}
                {(() => {
                  const [sH, sM] = s.technician.shiftStart.split(':').map(Number)
                  const [eH, eM] = s.technician.shiftEnd.split(':').map(Number)
                  const shiftS = new Date(refDate)
                  shiftS.setHours(sH, sM, 0, 0)
                  const shiftE = new Date(refDate)
                  shiftE.setHours(eH, eM, 0, 0)
                  const left = Math.max(0, Math.min(100, ((shiftS.getTime() - timelineStart) / timelineSpan) * 100))
                  const right = Math.max(0, Math.min(100, ((shiftE.getTime() - timelineStart) / timelineSpan) * 100))
                  return (
                    <div
                      className="absolute inset-y-1 bg-slate-800/30 rounded border border-slate-700/30"
                      style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
                    />
                  )
                })()}

                {/* Job blocks */}
                {s.assignments?.map((a: any) => {
                  const start = new Date(a.scheduledStart).getTime()
                  const end = new Date(a.scheduledEnd).getTime()
                  const left = Math.max(0, Math.min(100, ((start - timelineStart) / timelineSpan) * 100))
                  const width = Math.max(1.2, Math.min(100 - left, ((end - start) / timelineSpan) * 100))

                  // SLA check
                  const slaDeadline = new Date(a.job.slaDeadline).getTime()
                  const isOverdue = end > slaDeadline
                  const isAtRisk = !isOverdue && slaDeadline - end < 30 * 60 * 1000 // <30min buffer

                  return (
                    <div
                      key={a.id}
                      className={`absolute top-1 bottom-1 rounded-md border-l-2 ${PRIORITY_BG[a.job.priority]} 
                        ${
                          isOverdue
                            ? 'ring-2 ring-rose-500 shadow-lg shadow-rose-950/50'
                            : isAtRisk
                            ? 'ring-2 ring-amber-400'
                            : ''
                        }
                        flex items-center px-1.5 overflow-hidden cursor-pointer hover:brightness-125 transition-all z-10 shadow-sm`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${a.job.title}\nPriority: ${a.job.priority}\nTime: ${new Date(
                        a.scheduledStart
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
                        a.scheduledEnd
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}\nTransit: ${a.travelTimeMin.toFixed(0)} min\n${
                        isOverdue ? '[!] SLA BREACH' : isAtRisk ? '[*] SLA AT RISK' : '[OK] SLA MET'
                      }${a.isLocked ? '\n[LOCKED]' : ''}`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        {a.isLocked && <IconLock className="w-2.5 h-2.5 text-white/90 flex-shrink-0" />}
                        <span className="text-[10px] text-white font-medium truncate leading-tight">
                          {a.job.title}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap gap-4 text-xs text-slate-400 items-center">
        <span className="font-semibold text-slate-300">Priority Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Critical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-500"></span> Low
        </span>
        <div className="h-3 w-px bg-slate-700 mx-1"></div>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded ring-2 ring-rose-400 bg-slate-800"></span> SLA Breached
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded ring-2 ring-amber-400 bg-slate-800"></span> SLA At Risk
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <IconLock className="w-3.5 h-3.5 text-indigo-400" /> Locked Job (In-Progress/Completed)
        </span>
      </div>
    </div>
  )
}
