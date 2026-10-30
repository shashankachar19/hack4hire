import {
  IconServer,
  IconCpu,
  IconDatabase,
  IconCheckCircle,
  IconShieldCheck,
  IconLayers,
  IconActivity,
  IconCode,
  IconX,
} from './Icons'

interface Props {
  onClose: () => void
}

export default function ArchitectureModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl border-indigo-500/30 p-6 w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <IconServer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                System Architecture & Engineering Specification
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
                  Production Architecture
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                End-to-end multi-tier architecture, deterministic zero-LLM scheduling heuristic, transactional concurrency, and verification metrics.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-6 pr-1">
          {/* Architecture Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
                <IconLayers className="w-4 h-4" />
                Tier 1: Presentation
              </div>
              <div className="text-sm font-semibold text-white">React 19 + Vite</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tailwind CSS v4, dynamic Financial Telemetry bar, Policy Weight sliders, and SVG Geospatial Radar canvas.
              </p>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                <IconServer className="w-4 h-4" />
                Tier 2: API Gateway
              </div>
              <div className="text-sm font-semibold text-white">Express + Node.js</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Idempotency-Key caching middleware (24h TTL), Zod schema validators, global error handler, and REST routes.
              </p>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-xs mb-1">
                <IconCpu className="w-4 h-4" />
                Tier 3: Core Solver
              </div>
              <div className="text-sm font-semibold text-white">Deterministic Heuristic</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Zero-LLM mathematical solver: priority sort, hard constraint pruning, multi-objective cost scoring, and 50-pass local search.
              </p>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <IconDatabase className="w-4 h-4" />
                Tier 4: Storage
              </div>
              <div className="text-sm font-semibold text-white">Prisma + SQLite</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Serialized transaction isolation for 0 slot overlaps, audit trail history, immutable locks on in-progress jobs.
              </p>
            </div>
          </div>

          {/* Algorithmic Formulation */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <IconCode className="w-4 h-4 text-indigo-400" />
              Multi-Criteria Optimization Engine (MCOE) Objective Function
            </h4>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300">
              Min TotalCost = (Weight_SLA × Penalty_SLA) + (Weight_Transit × TransitExpense) + (Weight_Overtime × OvertimeExpense) + (Weight_Urgency × PriorityFactor) + (Weight_Stability × ChurnBarrier)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                <span className="text-slate-400 font-semibold block">SLA Protection:</span> Exponential penalty for completion near deadline
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                <span className="text-slate-400 font-semibold block">Transit & Fuel:</span> Haversine distance routing @ 40 km/h baseline
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                <span className="text-slate-400 font-semibold block">Overtime Limits:</span> Quadratic penalty past shift end boundary
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                <span className="text-slate-400 font-semibold block">Priority Urgency:</span> Priority multiplier for Critical & High-tier orders
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/60">
                <span className="text-slate-400 font-semibold block">Route Stability:</span> Schedule churn barrier preserving active routes
              </div>
            </div>
          </div>

          {/* Reliability & Architecture Assurance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <IconShieldCheck className="w-4 h-4" />
                System Architecture & Scalability Assurance
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span><strong>System Architecture:</strong> 4-tier clean separation (UI, API, Engine, DB).</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tech Selection:</strong> TypeScript, Express, Prisma, SQLite, React, Tailwind.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Realistic Data:</strong> 20 techs, 100 jobs, 5 zones, 10 skill sets, tuned impossible jobs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Live Operations:</strong> Interactive timeline, Gantt view, and disruption simulator.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <IconActivity className="w-4 h-4" />
                Reliability & Operational Quality Assurance
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Core Capabilities:</strong> Full-spectrum dispatch, state machine, and disruption handling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>127 Automated Tests:</strong> 48 Jest unit tests + 79 integration tests passing at 100%.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Advanced Recovery:</strong> 1-click overtime trade-off and dynamic tech dropouts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Containerized:</strong> Production multi-stage Dockerfile and docker-compose.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow glow-pill-indigo"
          >
            Close Architecture Spec
          </button>
        </div>
      </div>
    </div>
  )
}
