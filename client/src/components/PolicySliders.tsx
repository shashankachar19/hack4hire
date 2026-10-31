import React, { useState } from 'react'
import {
  IconSliders,
  IconPlay,
  IconRotateCw,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
} from './Icons'

export interface PolicyWeights {
  SLA_RISK: number
  TRAVEL_TIME: number
  OVERTIME: number
  PRIORITY_PENALTY: number
  CHURN: number
  [key: string]: number
}

export const DEFAULT_WEIGHTS: PolicyWeights = {
  SLA_RISK: 10.0,
  TRAVEL_TIME: 2.0,
  OVERTIME: 5.0,
  PRIORITY_PENALTY: 3.0,
  CHURN: 1.5,
}

interface PolicySlidersProps {
  onApplyGenerate: (weights: PolicyWeights) => void
  onApplyReOptimize: (weights: PolicyWeights) => void
  loading?: boolean
}

export const PolicySliders: React.FC<PolicySlidersProps> = ({
  onApplyGenerate,
  onApplyReOptimize,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [weights, setWeights] = useState<PolicyWeights>(DEFAULT_WEIGHTS)

  const handleChange = (key: keyof PolicyWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }))
  }

  const handlePreset = (presetWeights: PolicyWeights) => {
    setWeights(presetWeights)
  }

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS)
  }

  return (
    <div className="glass-panel rounded-2xl border-indigo-500/25 p-4 mb-6 shadow-xl relative overflow-hidden">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <IconSliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Optimization Policy & Trade-Off Engine
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-mono font-bold">
                Multi-Objective Strategy
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Tune business trade-offs across SLA Protection, Transit Efficiency, Overtime Controls, Priority Weighting, and Schedule Stability.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <span>{isOpen ? 'Collapse Strategy' : 'Tune Strategy'}</span>
          {isOpen ? <IconChevronDown className="w-3.5 h-3.5" /> : <IconChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Optimization Profiles:
            </span>
            <button
              type="button"
              onClick={() =>
                handlePreset({
                  SLA_RISK: 20.0,
                  TRAVEL_TIME: 1.5,
                  OVERTIME: 4.0,
                  PRIORITY_PENALTY: 5.0,
                  CHURN: 2.0,
                })
              }
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-medium transition-colors cursor-pointer"
            >
              SLA Protection (Strict)
            </button>
            <button
              type="button"
              onClick={() =>
                handlePreset({
                  SLA_RISK: 8.0,
                  TRAVEL_TIME: 6.0,
                  OVERTIME: 4.0,
                  PRIORITY_PENALTY: 2.5,
                  CHURN: 1.5,
                })
              }
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-medium transition-colors cursor-pointer"
            >
              Fuel & Transit Saver
            </button>
            <button
              type="button"
              onClick={() =>
                handlePreset({
                  SLA_RISK: 10.0,
                  TRAVEL_TIME: 2.0,
                  OVERTIME: 12.0,
                  PRIORITY_PENALTY: 3.0,
                  CHURN: 1.5,
                })
              }
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 font-medium transition-colors cursor-pointer"
            >
              Strict Shift Boundaries
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              Balanced Profile
            </button>
          </div>

          {/* 5 Strategy Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* 1: SLA Protection */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>SLA Protection</span>
                <span className="font-mono text-cyan-400 font-bold">{weights.SLA_RISK.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.5"
                value={weights.SLA_RISK}
                onChange={(e) => handleChange('SLA_RISK', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">High = Extreme penalty for breach risk</span>
            </div>

            {/* 2: Transit Efficiency */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>Transit Efficiency</span>
                <span className="font-mono text-amber-400 font-bold">{weights.TRAVEL_TIME.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={weights.TRAVEL_TIME}
                onChange={(e) => handleChange('TRAVEL_TIME', parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">High = Cluster nearby territory jobs</span>
            </div>

            {/* 3: Overtime Control */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>Overtime Control</span>
                <span className="font-mono text-rose-400 font-bold">{weights.OVERTIME.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={weights.OVERTIME}
                onChange={(e) => handleChange('OVERTIME', parseFloat(e.target.value))}
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">High = Strict shift boundary lock</span>
            </div>

            {/* 4: Priority Urgency */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>Priority Urgency</span>
                <span className="font-mono text-indigo-400 font-bold">{weights.PRIORITY_PENALTY.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={weights.PRIORITY_PENALTY}
                onChange={(e) => handleChange('PRIORITY_PENALTY', parseFloat(e.target.value))}
                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">High = Critical tickets dispatched first</span>
            </div>

            {/* 5: Schedule Stability */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                <span>Schedule Stability</span>
                <span className="font-mono text-emerald-400 font-bold">{weights.CHURN.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.25"
                value={weights.CHURN}
                onChange={(e) => handleChange('CHURN', parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">High = Minimize reassignments</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <IconRefresh className="w-3.5 h-3.5" />
              <span>Reset to Default Calibration</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => onApplyReOptimize(weights)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-700/60 font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <IconRotateCw className="w-3.5 h-3.5" />
                <span>Apply & Re-Optimize</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onApplyGenerate(weights)}
                className="btn-solid-primary text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <IconPlay className="w-3.5 h-3.5" />
                <span>Apply & Full Re-Solve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PolicySliders
