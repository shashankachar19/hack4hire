import {
  IconShieldCheck,
  IconHardHat,
  IconSliders,
} from '../components/Icons'

export type PortalType = 'customer' | 'technician' | 'admin'

interface Props {
  activePortal: PortalType
  onSelectPortal?: (portal: PortalType) => void
}

export default function PortalNavbar({ activePortal }: Props) {
  const isCustomer = activePortal === 'customer'
  const isTechnician = activePortal === 'technician'
  const isAdmin = activePortal === 'admin'

  return (
    <header className="bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/90 px-4 sm:px-6 py-2.5 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Contextual Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-black text-sm tracking-tighter text-white shadow-md glow-pill-indigo">
              DG
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-base tracking-tight">
                  {isCustomer
                    ? 'DispatchGrid Instant'
                    : isTechnician
                    ? 'DispatchGrid Partner'
                    : 'DispatchGrid Fleet'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 uppercase font-mono">
                  {isCustomer ? 'Consumer Portal' : isTechnician ? 'Field Terminal' : 'Command Center'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {isCustomer
                  ? 'Certified Emergency Trade Specialists'
                  : isTechnician
                  ? 'Active Duty Partner Execution Console'
                  : 'Automated Workforce Dispatch & Routing Platform'}
              </p>
            </div>
          </div>

          {/* Live Sync Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="hidden sm:inline">Live Sync (2s)</span>
            <span className="sm:hidden">Live</span>
          </div>
        </div>

        {/* Dedicated Isolated Header Controls */}
        {isCustomer && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <IconShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Dispatch Fleet</span>
            </div>
          </div>
        )}

        {isTechnician && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <IconHardHat className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-200 font-semibold">Field Partner Terminal</span>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <IconSliders className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-200 font-semibold">Dispatcher Command Console</span>
          </div>
        )}
      </div>
    </header>
  )
}
