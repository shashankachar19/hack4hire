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

export default function PortalNavbar({ activePortal, onSelectPortal }: Props) {
  const isCustomer = activePortal === 'customer'
  const isTechnician = activePortal === 'technician'
  const isAdmin = activePortal === 'admin'

  return (
    <header className="bg-[#180018]/95 backdrop-blur-xl border-b border-[#824D69]/40 px-4 sm:px-6 py-2.5 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Contextual Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#522959] border border-[#824D69] flex items-center justify-center font-black text-sm tracking-tighter text-[#FAE5D8] shadow-md">
              DG
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[#FAE5D8] text-base tracking-tight">
                  {isCustomer
                    ? 'DispatchGrid Instant'
                    : isTechnician
                    ? 'DispatchGrid Partner'
                    : 'DispatchGrid Fleet'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2A114B] text-[#DFB6B2] border border-[#824D69]/60 uppercase font-mono">
                  {isCustomer ? 'Customer Portal' : isTechnician ? 'Field Terminal' : 'Command Center'}
                </span>
              </div>
              <p className="text-[10px] text-[#DFB6B2]/80 font-medium">
                {isCustomer
                  ? 'Certified Emergency Trade Specialists'
                  : isTechnician
                  ? 'Active Duty Partner Execution Console'
                  : 'Automated Workforce Dispatch & Routing Platform'}
              </p>
            </div>
          </div>

          {/* Live Sync Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#2A114B] border border-[#824D69]/50 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="hidden sm:inline">Live Sync (2s)</span>
            <span className="sm:hidden">Live</span>
          </div>
        </div>

        {/* Interactive Role Navigation Switcher */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center p-1 rounded-xl bg-[#2A114B] border border-[#824D69]/60 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => onSelectPortal?.('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isCustomer
                  ? 'bg-[#522959] text-[#FAE5D8] shadow-md border border-[#824D69]'
                  : 'text-[#DFB6B2] hover:text-[#FAE5D8] hover:bg-[#180018]/50'
              }`}
              title="Open Customer Booking & Instant Matching Portal"
            >
              <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPortal?.('technician')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isTechnician
                  ? 'bg-[#522959] text-[#FAE5D8] shadow-md border border-[#824D69]'
                  : 'text-[#DFB6B2] hover:text-[#FAE5D8] hover:bg-[#180018]/50'
              }`}
              title="Open Field Technician Partner Terminal"
            >
              <IconHardHat className="w-3.5 h-3.5 text-[#DFB6B2]" />
              <span>Partner App</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPortal?.('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-[#522959] text-[#FAE5D8] shadow-md border border-[#824D69]'
                  : 'text-[#DFB6B2] hover:text-[#FAE5D8] hover:bg-[#180018]/50'
              }`}
              title="Open Fleet Dispatcher & Command Console (Admin)"
            >
              <IconSliders className="w-3.5 h-3.5 text-[#FAE5D8]" />
              <span>Dispatcher (Admin)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
