import { useState, useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import ScheduleTimeline from '../components/ScheduleTimeline'
import FleetRadar from '../components/FleetRadar'
import UnassignedPanel from '../components/UnassignedPanel'
import AuditHistory from '../components/AuditHistory'
import ControlPanel from '../components/ControlPanel'
import DiffModal from '../components/DiffModal'
import ExternalToolsModal from '../components/ExternalToolsModal'
import ArchitectureModal from '../components/ArchitectureModal'
import { api } from '../api'
import {
  IconActivity,
  IconClock,
  IconRadio,
  IconAlertTriangle,
  IconLayers,
  IconCheckCircle,
  IconXCircle,
  IconSparkles,
  IconServer,
} from '../components/Icons'

const ADMIN_TABS = [
  { id: 'Dashboard', label: 'Command Center', icon: IconActivity },
  { id: 'Timeline', label: 'Timeline Gantt', icon: IconClock },
  { id: 'Radar', label: 'Fleet Geospatial Radar', icon: IconRadio },
  { id: 'Unassigned', label: 'Unassigned & Recovery', icon: IconAlertTriangle },
  { id: 'Audit', label: 'Audit History', icon: IconLayers },
] as const

type AdminTabId = typeof ADMIN_TABS[number]['id']

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('Dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [diffRun, setDiffRun] = useState<any>(null)
  const [showToolsModal, setShowToolsModal] = useState(false)
  const [showArchModal, setShowArchModal] = useState(false)
  const [currentSchedule, setCurrentSchedule] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const refresh = () => setRefreshKey((k) => k + 1)
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Poll current schedule every 2 seconds for live sync with Customer & Technician portals
  useEffect(() => {
    api.getCurrentSchedule()
      .then(setCurrentSchedule)
      .catch(() => {})
    const interval = setInterval(() => {
      api.getCurrentSchedule().then(setCurrentSchedule).catch(() => {})
    }, 2000)
    return () => clearInterval(interval)
  }, [refreshKey])

  return (
    <div className="space-y-6">
      {/* Admin Action Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-white">Fleet Dispatch Command Center</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-700 font-mono uppercase tracking-wider">
              Dispatcher View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-objective scheduling heuristic, live telemetry, and zero-collision disruption recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            title="System Architecture & Optimization Specifications"
          >
            <IconServer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">System Specs</span>
          </button>

          <button
            onClick={() => setShowToolsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Google Calendar, Vehicle Telematics, Webhooks, and Capacity AI"
          >
            <IconSparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Integrations</span>
          </button>

          <ControlPanel onRefresh={refresh} onShowToast={showToast} onShowDiff={setDiffRun} />
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800 rounded-2xl p-1">
        <div className="flex gap-1.5 overflow-x-auto">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-indigo-400 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Animated Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 transition-all animate-float-slow ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border border-emerald-500/50 glow-pill-emerald'
              : 'bg-rose-950/95 text-rose-200 border border-rose-500/50 glow-pill-rose'
          }`}
        >
          {toast.type === 'success' ? (
            <IconCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <IconXCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Tab Panels */}
      <div>
        {activeTab === 'Dashboard' && <Dashboard key={refreshKey} onShowDiff={setDiffRun} />}
        {activeTab === 'Timeline' && <ScheduleTimeline key={refreshKey} />}
        {activeTab === 'Radar' && <FleetRadar key={refreshKey} />}
        {activeTab === 'Unassigned' && <UnassignedPanel key={refreshKey} />}
        {activeTab === 'Audit' && <AuditHistory key={refreshKey} onShowDiff={setDiffRun} />}
      </div>

      {/* Modals */}
      {diffRun && <DiffModal run={diffRun} onClose={() => setDiffRun(null)} />}
      {showToolsModal && (
        <ExternalToolsModal
          schedule={currentSchedule || { schedule: [] }}
          onClose={() => setShowToolsModal(false)}
          onShowToast={showToast}
        />
      )}
      {showArchModal && <ArchitectureModal onClose={() => setShowArchModal(false)} />}
    </div>
  )
}

