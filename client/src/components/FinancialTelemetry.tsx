import {
  IconTrendingUp,
  IconShieldCheck,
  IconClock,
  IconSparkles,
  IconActivity,
} from './Icons'

interface FinancialTelemetryProps {
  summary: {
    totalScheduledRevenue?: number
    slaPenaltiesAvoided?: number
    estimatedTravelCost?: number
    estimatedLaborCost?: number
    netProfit?: number
    netMarginPercentage?: number
    totalAssignments?: number
    totalTravelTime?: number
  } | null
}

export const FinancialTelemetry: React.FC<FinancialTelemetryProps> = ({ summary }) => {
  if (!summary) return null

  const revenue = summary.totalScheduledRevenue || 0
  const penaltiesAvoided = summary.slaPenaltiesAvoided || 0
  const travelCost = summary.estimatedTravelCost || 0
  const netMargin = summary.netMarginPercentage || 0
  const netProfit = summary.netProfit || 0

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN')
  }

  return (
    <div className="glass-panel rounded-2xl border-emerald-500/30 p-4 shadow-xl shadow-emerald-950/20 mb-6 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
            <IconActivity className="w-4 h-4 text-emerald-400" />
            Live Unit Economics & Financial Telemetry
          </span>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800 font-mono font-bold">
            B2B Commercial Engine
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span>
            Net Operating Profit: <strong className="text-emerald-400 font-mono">{formatINR(netProfit)}</strong>
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span>
            Fleet Transit: <strong className="text-slate-300 font-mono">{Math.round(summary.totalTravelTime || 0)} min</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Scheduled Revenue */}
        <div className="glass-panel p-3.5 rounded-xl border-slate-800 hover:border-emerald-500/40 transition-all">
          <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Scheduled Revenue</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
              <IconTrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white font-mono mt-1">
            {formatINR(revenue)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {summary.totalAssignments || 0} customer tickets dispatched
          </div>
        </div>

        {/* Metric 2: SLA Penalties Avoided */}
        <div className="glass-panel p-3.5 rounded-xl border-slate-800 hover:border-cyan-500/40 transition-all">
          <div className="text-[11px] text-cyan-300 uppercase font-semibold flex items-center justify-between">
            <span>SLA Penalties Avoided</span>
            <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
              <IconShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-cyan-400 font-mono mt-1">
            {formatINR(penaltiesAvoided)}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-1">
            100% on-time SLA contractual protection
          </div>
        </div>

        {/* Metric 3: Estimated Travel Cost */}
        <div className="glass-panel p-3.5 rounded-xl border-slate-800 hover:border-amber-500/40 transition-all">
          <div className="text-[11px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Estimated Travel Cost</span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
              <IconClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-amber-400 font-mono mt-1">
            {formatINR(travelCost)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Route-optimized @ ₹10/min transit rate
          </div>
        </div>

        {/* Metric 4: Net Margin */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/40 shadow-sm">
          <div className="text-[11px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Net Operating Margin</span>
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-300">
              <IconSparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono mt-1">
            {netMargin}%
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-1">
            Revenue + Penalties Avoided vs Labor & Transit
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinancialTelemetry
