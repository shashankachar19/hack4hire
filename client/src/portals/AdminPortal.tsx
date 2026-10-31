import { useState } from 'react'
import Dashboard from '../components/Dashboard'
import ScheduleTimeline from '../components/ScheduleTimeline'
import FleetRadar from '../components/FleetRadar'
import UnassignedPanel from '../components/UnassignedPanel'
import AuditHistory from '../components/AuditHistory'
import ControlPanel from '../components/ControlPanel'
import DiffModal from '../components/DiffModal'
import CustomerManager from '../components/CustomerManager'
import EmployeeManager from '../components/EmployeeManager'
import {
  IconActivity,
  IconClock,
  IconRadio,
  IconAlertTriangle,
  IconLayers,
  IconCheckCircle,
  IconXCircle,
  IconUsers,
  IconHardHat,
} from '../components/Icons'

const ADMIN_TABS = [
  { id: 'Dashboard', label: 'Command Center', icon: IconActivity },
  { id: 'Customers', label: 'Customers', icon: IconUsers },
  { id: 'Employees', label: 'Employees (Fleet)', icon: IconHardHat },
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
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const refresh = () => setRefreshKey((k) => k + 1)
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Streamlined Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#824D69]/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-[#FAE5D8]">Fleet Dispatch Command Center</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2A114B] text-[#DFB6B2] border border-[#824D69]/60 font-mono uppercase tracking-wider">
              Dispatcher View (Admin)
            </span>
          </div>
          <p className="text-xs text-[#DFB6B2]/80 mt-0.5">
            Real-time multi-objective scheduling heuristic, 100-technician fleet telemetry, and customer record management.
          </p>
        </div>

        {/* Clean, essential controls only */}
        <div className="flex items-center gap-2">
          <ControlPanel onRefresh={refresh} onShowToast={showToast} onShowDiff={setDiffRun} />
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-[#2A114B]/80 backdrop-blur-md border border-[#824D69]/50 rounded-2xl p-1 shadow-md">
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
                    ? 'bg-[#522959] text-[#FAE5D8] border border-[#824D69] shadow-md'
                    : 'text-[#DFB6B2] hover:text-[#FAE5D8] hover:bg-[#180018]/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FAE5D8]' : 'text-[#DFB6B2]/70'}`} />
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
        {activeTab === 'Customers' && <CustomerManager onShowToast={showToast} />}
        {activeTab === 'Employees' && <EmployeeManager onShowToast={showToast} />}
        {activeTab === 'Timeline' && <ScheduleTimeline key={refreshKey} />}
        {activeTab === 'Radar' && <FleetRadar key={refreshKey} />}
        {activeTab === 'Unassigned' && <UnassignedPanel key={refreshKey} />}
        {activeTab === 'Audit' && <AuditHistory key={refreshKey} onShowDiff={setDiffRun} />}
      </div>

      {/* Diff Run Modal */}
      {diffRun && <DiffModal run={diffRun} onClose={() => setDiffRun(null)} />}
    </div>
  )
}
