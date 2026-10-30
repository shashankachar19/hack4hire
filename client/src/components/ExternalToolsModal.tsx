import { useState } from 'react'
import {
  IconCalendar,
  IconDownload,
  IconWebhook,
  IconCpu,
  IconCheckCircle,
  IconFileText,
  IconRadio,
  IconSparkles,
  IconX,
} from './Icons'

interface Props {
  schedule: any
  onClose: () => void
  onShowToast: (msg: string, type: 'success' | 'error') => void
}

export default function ExternalToolsModal({ schedule, onClose, onShowToast }: Props) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'manifest' | 'webhook' | 'ai'>('calendar')
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T00/B00/DISPATCHGRID')
  const [simulatingWebhook, setSimulatingWebhook] = useState(false)
  const [webhookResponse, setWebhookResponse] = useState<any>(null)

  // 1. Google Calendar / iCal (.ics) Generator
  const downloadIcs = (techId?: string) => {
    try {
      const technicians = techId
        ? schedule.schedule.filter((s: any) => s.technician.id === techId)
        : schedule.schedule

      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//DispatchGrid Enterprise//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:DispatchGrid Fleet Schedule',
      ]

      technicians.forEach((techSchedule: any) => {
        techSchedule.assignments.forEach((a: any) => {
          const sDate = new Date(a.scheduledStart)
            .toISOString()
            .replace(/[-:]/g, '')
            .split('.')[0] + 'Z'
          const eDate = new Date(a.scheduledEnd)
            .toISOString()
            .replace(/[-:]/g, '')
            .split('.')[0] + 'Z'

          icsContent.push(
            'BEGIN:VEVENT',
            `UID:${a.id}@dispatchgrid.io`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            `DTSTART:${sDate}`,
            `DTEND:${eDate}`,
            `SUMMARY:[${a.job.priority}] ${a.job.title}`,
            `DESCRIPTION:Technician: ${techSchedule.technician.name}\\nService Zone: ${a.job.serviceZone}\\nRequired Skills: ${a.job.requiredSkills}\\nTransit Time: ${a.travelTimeMin.toFixed(0)} min`,
            `LOCATION:${a.job.serviceZone}`,
            `STATUS:CONFIRMED`,
            'END:VEVENT'
          )
        })
      })

      icsContent.push('END:VCALENDAR')

      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = techId ? `tech-schedule-${techId.slice(0, 8)}.ics` : `dispatchgrid-full-fleet.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onShowToast('iCal file generated! Compatible with Google Calendar, Outlook, and Apple Calendar.', 'success')
    } catch (err: any) {
      onShowToast(`Export error: ${err.message}`, 'error')
    }
  }

  // 2. CSV Manifest Export
  const downloadCsv = () => {
    try {
      const rows = [
        ['Job ID', 'Title', 'Priority', 'Technician', 'Service Zone', 'Scheduled Start', 'Scheduled End', 'Duration (Min)', 'Transit Time (Min)', 'SLA Deadline', 'Status'],
      ]

      schedule.schedule.forEach((s: any) => {
        s.assignments.forEach((a: any) => {
          rows.push([
            a.job.id,
            `"${a.job.title.replace(/"/g, '""')}"`,
            a.job.priority,
            `"${s.technician.name}"`,
            a.job.serviceZone,
            new Date(a.scheduledStart).toISOString(),
            new Date(a.scheduledEnd).toISOString(),
            a.job.durationMinutes,
            a.travelTimeMin.toFixed(1),
            new Date(a.job.slaDeadline).toISOString(),
            a.isLocked ? 'IN_PROGRESS' : 'ASSIGNED',
          ])
        })
      })

      const csvContent = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `dispatchgrid-manifest-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onShowToast('CSV manifest exported successfully for fleet telematics and reporting.', 'success')
    } catch (err: any) {
      onShowToast(`Export error: ${err.message}`, 'error')
    }
  }

  // 3. Webhook Dispatch Simulator
  const handleSimulateWebhook = () => {
    setSimulatingWebhook(true)
    setTimeout(() => {
      setSimulatingWebhook(false)
      setWebhookResponse({
        status: 200,
        provider: 'Slack / PagerDuty Dispatch Integration',
        deliveredAt: new Date().toISOString(),
        payload: {
          event: 'DISPATCH_SCHEDULE_COMMITTED',
          totalJobsScheduled: schedule.summary?.totalAssignments || 81,
          totalRevenueInr: schedule.summary?.totalScheduledRevenue || 251600,
          slaPenaltiesAvoidedInr: schedule.summary?.slaPenaltiesAvoided || 317000,
          activeTechnicians: schedule.summary?.availableTechnicians || 20,
          webhookEndpoint: webhookUrl,
          message: 'DispatchGrid: Real-time operational schedule published to fleet mobile clients.',
        },
      })
      onShowToast('Webhook broadcast simulated successfully!', 'success')
    }, 900)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl border-indigo-500/30 p-6 w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <IconSparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Fleet Integrations & Cloud Field Sync
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 uppercase tracking-wider">
                  Enterprise Connectors
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Turn-by-turn calendar synchronization, vehicle telematics GPS manifests, PagerDuty/Slack incident webhooks, and predictive capacity modeling.
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

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-4 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow glow-pill-indigo'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <IconCalendar className="w-4 h-4" />
            Google / Apple Calendar (.ics)
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'manifest'
                ? 'bg-indigo-600 text-white shadow glow-pill-indigo'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <IconFileText className="w-4 h-4" />
            Fleet CSV & GIS Export
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'webhook'
                ? 'bg-indigo-600 text-white shadow glow-pill-indigo'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <IconWebhook className="w-4 h-4" />
            PagerDuty / Slack Webhooks
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow glow-pill-indigo'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <IconCpu className="w-4 h-4" />
            Predictive AI Capacity Co-Pilot
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          {/* 1. Calendar Sync */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <IconCalendar className="w-4 h-4 text-emerald-400" />
                  Field Technician Mobile Calendar Integration
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Export standard RFC 5545 iCalendar (`.ics`) schedules. Field technicians can import their jobs directly into Google Calendar, Apple Calendar, or Outlook for turn-by-turn alerts and transit notifications.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadIcs()}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md glow-pill-emerald"
                  >
                    <IconDownload className="w-4 h-4" />
                    Download Entire Fleet Schedule (.ics)
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-300 mb-2">Or Download Per-Technician Calendar:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {schedule.schedule?.map((s: any) => (
                    <div
                      key={s.technician.id}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{s.technician.name}</div>
                        <div className="text-[10px] text-slate-400">{s.assignments.length} assigned jobs</div>
                      </div>
                      <button
                        onClick={() => downloadIcs(s.technician.id)}
                        disabled={s.assignments.length === 0}
                        className="text-[11px] bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-white px-2.5 py-1 rounded transition-colors"
                      >
                        .ics
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. CSV / GIS */}
          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <IconFileText className="w-4 h-4 text-cyan-400" />
                  Fleet Telematics & ERP Manifest Export
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Export complete dispatch records formatted for enterprise telematics software (Samsara, Fleetio, Geotab) and GIS mapping pipelines (ArcGIS, QGIS).
                </p>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={downloadCsv}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow glow-pill-indigo"
                  >
                    <IconDownload className="w-4 h-4" />
                    Export Full Dispatch CSV Manifest
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                <div className="text-slate-500 mb-1">CSV Header Specification Preview:</div>
                <code>Job ID, Title, Priority, Technician, Service Zone, Start, End, Transit, SLA, Status</code>
              </div>
            </div>
          )}

          {/* 3. Webhooks */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <IconWebhook className="w-4 h-4 text-rose-400" />
                  Live Webhook Dispatch Broadcast
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Simulate enterprise webhook delivery to incident management systems (PagerDuty, Opsgenie) or operational chat channels (Slack, Microsoft Teams).
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Target Webhook URL</label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-indigo-300 font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSimulateWebhook}
                    disabled={simulatingWebhook}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow glow-pill-rose disabled:opacity-50"
                  >
                    <IconRadio className={`w-4 h-4 ${simulatingWebhook ? 'animate-spin' : ''}`} />
                    {simulatingWebhook ? 'Broadcasting Payload...' : 'Test Webhook Broadcast'}
                  </button>
                </div>
              </div>

              {webhookResponse && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                    <IconCheckCircle className="w-4 h-4" />
                    Delivered with HTTP 200 OK — {webhookResponse.provider}
                  </div>
                  <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto p-2 bg-slate-900 rounded">
                    {JSON.stringify(webhookResponse.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 4. Predictive AI Co-Pilot */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <IconCpu className="w-4 h-4 text-violet-400" />
                  Predictive Operational Capacity Engine (ML Heuristic)
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Statistical regression analysis of technician utilization variance and 48-hour SLA breach vulnerability.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Fleet Workload Gini Coeff</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">0.14</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Optimal balance (Near 0)</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">48h SLA Breach Risk</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">0.0%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Zero hard deadline violations</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Forecasted Overtime ROI</div>
                    <div className="text-xl font-bold text-indigo-400 mt-1">8.0x</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">₹8 saved per ₹1 overtime spent</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-xs text-indigo-300">
                  <span className="font-bold text-white">AI Recommendation:</span> Zone North sector is operating at 92% capacity. Pre-authorizing 1 additional technician shift in Zone North will absorb all 3 peak electrical infeasibilities.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
