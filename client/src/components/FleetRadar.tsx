import { useEffect, useState } from 'react'
import { api } from '../api'
import {
  IconRadio,
  IconUsers,
  IconActivity,
  IconCompass,
} from './Icons'

interface Tech {
  id: string
  name: string
  skills: string[]
  serviceZones: string[]
  shiftStart: string
  shiftEnd: string
  latitude: number
  longitude: number
  isAvailable: boolean
  assignments?: any[]
}

interface Job {
  id: string
  title: string
  priority: string
  durationMinutes: number
  serviceZone: string
  latitude: number
  longitude: number
  status: string
  windowStart: string
  windowEnd: string
}

const ZONE_METADATA: Record<string, { label: string; cx: number; cy: number; color: string }> = {
  'zone-north':   { label: 'North Sector',   cx: 350, cy: 110, color: '#38bdf8' },
  'zone-south':   { label: 'South Sector',   cx: 350, cy: 370, color: '#a855f7' },
  'zone-west':    { label: 'West Sector',    cx: 170, cy: 240, color: '#f59e0b' },
  'zone-east':    { label: 'East Sector',    cx: 530, cy: 240, color: '#10b981' },
  'zone-central': { label: 'Central Hub',    cx: 350, cy: 240, color: '#6366f1' },
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#3b82f6',
  LOW: '#64748b',
}

export default function FleetRadar() {
  const [technicians, setTechnicians] = useState<Tech[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string>('all')

  useEffect(() => {
    Promise.all([api.getTechnicians(), api.getJobs(), api.getCurrentSchedule()])
      .then(([techData, jobData, schedData]) => {
        // Map assignments to technicians
        const assignmentMap = new Map<string, any[]>()
        if (schedData?.schedule) {
          schedData.schedule.forEach((s: any) => {
            assignmentMap.set(s.technician.id, s.assignments || [])
          })
        }

        const enrichedTechs = techData.map((t: any) => ({
          ...t,
          assignments: assignmentMap.get(t.id) || [],
        }))

        setTechnicians(enrichedTechs)
        setJobs(jobData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
        <IconRadio className="w-6 h-6 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Scanning fleet coordinates & routing telemetry...</span>
      </div>
    )
  }

  // Calculate zone metrics
  const zoneStats = Object.keys(ZONE_METADATA).map((zone) => {
    const zoneJobs = jobs.filter((j) => j.serviceZone === zone)
    const zoneTechs = technicians.filter((t) => t.serviceZones.includes(zone) && t.isAvailable)
    const assignedCount = zoneJobs.filter((j) => j.status === 'ASSIGNED').length
    const unassignedCount = zoneJobs.filter((j) => j.status === 'UNASSIGNED' || j.status === 'PENDING').length

    return {
      zone,
      ...ZONE_METADATA[zone],
      totalJobs: zoneJobs.length,
      assignedCount,
      unassignedCount,
      techCount: zoneTechs.length,
      ratio: zoneTechs.length > 0 ? (zoneJobs.length / zoneTechs.length).toFixed(1) : '∞',
    }
  })

  // Filter jobs by zone
  const filteredJobs = selectedZone === 'all' ? jobs : jobs.filter((j) => j.serviceZone === selectedZone)
  const selectedTech = technicians.find((t) => t.id === selectedTechId)

  // Map coordinates to SVG plane:
  // Bangalore roughly lat 12.90 to 13.00, lng 77.50 to 77.66
  const toSvgCoords = (lat: number, lng: number) => {
    const minLat = 12.90
    const maxLat = 13.00
    const minLng = 77.52
    const maxLng = 77.64

    const x = ((lng - minLng) / (maxLng - minLng)) * 560 + 70
    // Invert Y for latitude
    const y = 440 - ((lat - minLat) / (maxLat - minLat)) * 360 - 20

    return { x: Math.max(40, Math.min(660, x)), y: Math.max(40, Math.min(440, y)) }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <IconCompass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Fleet Geospatial Radar & Zone Routing Matrix
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Live Telemetry
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive geographic route mapping, sector demand/capacity ratios, and live GPS dispatch vectors across 5 Bangalore zones.
            </p>
          </div>
        </div>

        {/* Zone Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedZone('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedZone === 'all'
                ? 'bg-indigo-600 text-white shadow-sm glow-pill-indigo'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            All Sectors ({jobs.length})
          </button>
          {Object.entries(ZONE_METADATA).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSelectedZone(key)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedZone === key
                  ? 'bg-indigo-600 text-white shadow-sm glow-pill-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {meta.label.replace(' Sector', '').replace(' Hub', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Map Canvas (2 Columns) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <IconRadio className="w-4 h-4 text-emerald-400" />
              <span>GEOSPATIAL FLEET RADAR — 50 KM² COVERAGE</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Technicians ({technicians.length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Critical Jobs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Standard Jobs
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-[16/10] bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 700 480" className="w-full h-full">
              {/* Radar Grid Rings */}
              <circle cx="350" cy="240" r="210" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="350" cy="240" r="140" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="350" cy="240" r="70" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="350" y1="20" x2="350" y2="460" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="240" x2="670" y2="240" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

              {/* Zone Sector Boundaries */}
              {Object.entries(ZONE_METADATA).map(([key, meta]) => {
                const isSelected = selectedZone === 'all' || selectedZone === key
                return (
                  <g key={key} opacity={isSelected ? 1 : 0.25} className="transition-opacity duration-300">
                    <circle
                      cx={meta.cx}
                      cy={meta.cy}
                      r="75"
                      fill={meta.color}
                      fillOpacity="0.04"
                      stroke={meta.color}
                      strokeOpacity="0.3"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={meta.cx}
                      y={meta.cy - 55}
                      textAnchor="middle"
                      fill={meta.color}
                      fontSize="11"
                      fontWeight="700"
                      className="font-mono tracking-wider uppercase pointer-events-none"
                    >
                      {meta.label}
                    </text>
                  </g>
                )
              })}

              {/* Connecting Route Vectors for Selected Technician */}
              {selectedTech && selectedTech.assignments && selectedTech.assignments.length > 0 && (() => {
                const points = [
                  toSvgCoords(selectedTech.latitude, selectedTech.longitude),
                  ...selectedTech.assignments.map((a: any) => toSvgCoords(a.job.latitude, a.job.longitude)),
                ]
                const pathD = points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '')

                return (
                  <g>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                    {points.slice(1).map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="5" fill="#818cf8" stroke="#1e1b4b" strokeWidth="2" />
                    ))}
                  </g>
                )
              })()}

              {/* Job Locations */}
              {filteredJobs.map((j) => {
                const { x, y } = toSvgCoords(j.latitude, j.longitude)
                const isAssigned = j.status === 'ASSIGNED'
                const color = PRIORITY_COLORS[j.priority] || '#94a3b8'

                return (
                  <g key={j.id} className="cursor-pointer group">
                    <circle
                      cx={x}
                      cy={y}
                      r={isAssigned ? 4 : 3.5}
                      fill={color}
                      fillOpacity={isAssigned ? 0.9 : 0.4}
                      stroke={isAssigned ? '#0f172a' : '#ef4444'}
                      strokeWidth="1.5"
                    />
                    <title>{`${j.title} (${j.priority})\nStatus: ${j.status}\nZone: ${j.serviceZone}`}</title>
                  </g>
                )
              })}

              {/* Technician Pins */}
              {technicians.map((t) => {
                const { x, y } = toSvgCoords(t.latitude, t.longitude)
                const isSelected = selectedTechId === t.id
                const isOnline = t.isAvailable

                return (
                  <g
                    key={t.id}
                    onClick={() => setSelectedTechId(isSelected ? null : t.id)}
                    className="cursor-pointer group"
                  >
                    {isSelected && (
                      <circle cx={x} cy={y} r="18" fill="none" stroke="#6366f1" strokeWidth="2" className="animate-ping" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={isOnline ? (isSelected ? '#6366f1' : '#10b981') : '#ef4444'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      fill={isSelected ? '#c7d2fe' : '#e2e8f0'}
                      fontSize="9"
                      fontWeight="600"
                      className="pointer-events-none drop-shadow"
                    >
                      {t.name.split(' ')[0]} ({t.assignments?.length || 0})
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Footer Instruction */}
          <div className="pt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Click any technician pin on the radar to inspect their dynamic dispatch journey path.</span>
            {selectedTech && (
              <button
                onClick={() => setSelectedTechId(null)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Clear Selected Tech (Viewing: {selectedTech.name})
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Sector Balance & Capacity Ratios */}
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <IconActivity className="w-4 h-4 text-indigo-400" />
              Sector Demand vs Supply Balance
            </h3>
            <div className="space-y-3">
              {zoneStats.map((stat) => (
                <div
                  key={stat.zone}
                  onClick={() => setSelectedZone(selectedZone === stat.zone ? 'all' : stat.zone)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedZone === stat.zone
                      ? 'bg-indigo-950/40 border-indigo-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white" style={{ color: stat.color }}>
                      {stat.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Ratio: {stat.ratio} jobs/tech
                    </span>
                  </div>

                  {/* Capacity progress bar */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      Demand: <span className="text-white font-semibold">{stat.totalJobs} jobs</span>
                    </div>
                    <div>
                      Capacity: <span className="text-emerald-400 font-semibold">{stat.techCount} techs</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(stat.assignedCount / (stat.totalJobs || 1)) * 100}%` }}
                      title={`${stat.assignedCount} Assigned`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${(stat.unassignedCount / (stat.totalJobs || 1)) * 100}%` }}
                      title={`${stat.unassignedCount} Pending/Unassigned`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Technician Card */}
          {selectedTech ? (
            <div className="glass-panel p-4 rounded-2xl border-indigo-500/40 glow-pill-indigo">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Inspecting Technician</div>
                  <h4 className="text-base font-bold text-white">{selectedTech.name}</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedTech.isAvailable ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                }`}>
                  {selectedTech.isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shift Window:</span>
                  <span className="font-mono text-white">{selectedTech.shiftStart} – {selectedTech.shiftEnd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Covered Zones:</span>
                  <span>{selectedTech.serviceZones.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Jobs:</span>
                  <span className="font-bold text-emerald-400">{selectedTech.assignments?.length || 0}</span>
                </div>
              </div>

              {selectedTech.assignments && selectedTech.assignments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">Scheduled Route Queue:</div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedTech.assignments.map((a: any, idx: number) => (
                      <div key={a.id} className="text-[11px] bg-slate-900 p-2 rounded border border-slate-800 flex justify-between">
                        <span className="truncate max-w-[150px] font-medium text-slate-200">
                          {idx + 1}. {a.job.title}
                        </span>
                        <span className="font-mono text-indigo-400">
                          {new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-4 rounded-2xl border-slate-800 text-center text-xs text-slate-500 py-8">
              <IconUsers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Select any technician on the radar map to inspect their real-time route path and shift itinerary.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
