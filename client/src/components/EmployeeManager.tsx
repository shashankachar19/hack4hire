import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import {
  IconHardHat,
  IconSearch,
  IconEdit,
  IconCheckCircle,
  IconXCircle,
  IconPhone,
  IconMail,
  IconRotateCw,
  IconStar,
} from './Icons'

const ALL_SKILLS = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'carpentry',
  'elevator-tech',
  'painting',
]

const ALL_ZONES = [
  'indiranagar',
  'koramangala',
  'whitefield',
  'hsr-layout',
  'jayanagar',
  'electronic-city',
  'marathahalli',
  'malleshwaram',
]

interface Technician {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  skills: string[]
  serviceZones: string[]
  isAvailable: boolean
  hourlyRate: number
  shiftStart: string
  shiftEnd: string
  rating?: number
  assignments?: any[]
}

interface EmployeeManagerProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void
}

export default function EmployeeManager({ onShowToast }: EmployeeManagerProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [skillFilter, setSkillFilter] = useState<string>('ALL')
  const [zoneFilter, setZoneFilter] = useState<string>('ALL')
  const [availFilter, setAvailFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')
  const [editingTech, setEditingTech] = useState<Technician | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)

  // Edit/Add Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skills: ['plumbing'],
    serviceZones: ['indiranagar'],
    hourlyRate: 550,
    shiftStart: '08:00',
    shiftEnd: '17:00',
    isAvailable: true,
  })

  const fetchTechnicians = async () => {
    setLoading(true)
    try {
      const data = await api.getTechnicians()
      setTechnicians(data || [])
    } catch (err: any) {
      onShowToast(`Failed to load technicians: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTechnicians()
  }, [])

  // Filter technicians
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((t) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = t.name.toLowerCase().includes(q)
        const matchesEmail = t.email ? t.email.toLowerCase().includes(q) : false
        const matchesPhone = t.phone ? t.phone.toLowerCase().includes(q) : false
        if (!matchesName && !matchesEmail && !matchesPhone) return false
      }

      // Skill filter
      if (skillFilter !== 'ALL') {
        const hasSkill = t.skills.some(
          (s) => s.toLowerCase() === skillFilter.toLowerCase()
        )
        if (!hasSkill) return false
      }

      // Zone filter
      if (zoneFilter !== 'ALL') {
        const hasZone = t.serviceZones.some(
          (z) => z.toLowerCase() === zoneFilter.toLowerCase()
        )
        if (!hasZone) return false
      }

      // Availability filter
      if (availFilter === 'ONLINE' && !t.isAvailable) return false
      if (availFilter === 'OFFLINE' && t.isAvailable) return false

      return true
    })
  }, [technicians, searchQuery, skillFilter, zoneFilter, availFilter])

  // 1-Click Availability Toggle
  const handleToggleAvailability = async (tech: Technician) => {
    const nextStatus = !tech.isAvailable
    try {
      await api.updateTechnician(tech.id, { isAvailable: nextStatus })
      setTechnicians((prev) =>
        prev.map((t) => (t.id === tech.id ? { ...t, isAvailable: nextStatus } : t))
      )
      onShowToast(
        `Captain ${tech.name} status switched to ${nextStatus ? 'ONLINE' : 'OFFLINE'}!`,
        'success'
      )
    } catch (err: any) {
      onShowToast(`Availability toggle failed: ${err.message}`, 'error')
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (tech: Technician) => {
    setEditingTech(tech)
    setFormData({
      name: tech.name,
      email: tech.email || '',
      phone: tech.phone || '',
      skills: Array.isArray(tech.skills) ? [...tech.skills] : ['plumbing'],
      serviceZones: Array.isArray(tech.serviceZones)
        ? [...tech.serviceZones]
        : ['indiranagar'],
      hourlyRate: tech.hourlyRate || 550,
      shiftStart: tech.shiftStart || '08:00',
      shiftEnd: tech.shiftEnd || '17:00',
      isAvailable: tech.isAvailable !== undefined ? tech.isAvailable : true,
    })
  }

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTech(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      skills: ['plumbing'],
      serviceZones: ['indiranagar', 'koramangala'],
      hourlyRate: 550,
      shiftStart: '08:00',
      shiftEnd: '17:00',
      isAvailable: true,
    })
    setShowAddModal(true)
  }

  // Save edits or create new technician
  const handleSaveTechnician = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      onShowToast('Specialist name is required', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (editingTech) {
        const updated = await api.updateTechnician(editingTech.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          skills: formData.skills,
          serviceZones: formData.serviceZones,
          hourlyRate: Number(formData.hourlyRate) || 550,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          isAvailable: formData.isAvailable,
        })
        setTechnicians((prev) =>
          prev.map((t) => (t.id === editingTech.id ? { ...t, ...updated } : t))
        )
        onShowToast(`Technician "${formData.name}" profile saved successfully!`, 'success')
        setEditingTech(null)
      } else {
        await api.createTechnician({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          skills: formData.skills,
          serviceZones: formData.serviceZones,
          hourlyRate: Number(formData.hourlyRate) || 550,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          isAvailable: formData.isAvailable,
          lat: 12.9716,
          lng: 77.5946,
        })
        await fetchTechnicians()
        onShowToast(`New specialist "${formData.name}" enrolled into fleet!`, 'success')
        setShowAddModal(false)
      }
    } catch (err: any) {
      onShowToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill)
      if (exists) {
        if (prev.skills.length === 1) return prev // keep at least 1 skill
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) }
      } else {
        return { ...prev, skills: [...prev.skills, skill] }
      }
    })
  }

  const toggleZone = (zone: string) => {
    setFormData((prev) => {
      const exists = prev.serviceZones.includes(zone)
      if (exists) {
        if (prev.serviceZones.length === 1) return prev // keep at least 1 zone
        return { ...prev, serviceZones: prev.serviceZones.filter((z) => z !== zone) }
      } else {
        return { ...prev, serviceZones: [...prev.serviceZones, zone] }
      }
    })
  }

  const onlineCount = technicians.filter((t) => t.isAvailable).length
  const offlineCount = technicians.length - onlineCount

  return (
    <div className="space-y-5 animate-scaleIn text-[#FAE5D8]">
      {/* Top Banner & Metrics */}
      <div className="bg-[#2A114B]/90 border border-[#824D69]/50 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#180018] border border-[#824D69] text-[#FAE5D8]">
                <IconHardHat className="w-5 h-5 text-[#DFB6B2]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-[#FAE5D8]">
                  Fleet Employees & Specialists (100 Technicians)
                </h3>
                <p className="text-xs text-[#DFB6B2]/80">
                  Full administrative control over trade credentials, shift hours, hourly billing, service zones, and live dispatch availability.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTechnicians}
              disabled={loading}
              className="btn-solid-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
              title="Refresh technician fleet"
            >
              <IconRotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="btn-solid-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95"
            >
              <span>+ Add Specialist</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#824D69]/30">
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Total Fleet</div>
            <div className="text-xl font-black text-[#FAE5D8] font-mono mt-0.5">{technicians.length}</div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Online & Ready</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{onlineCount}</div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Offline / Off-Duty</div>
            <div className="text-xl font-black text-[#DFB6B2] font-mono mt-0.5">{offlineCount}</div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Avg Hourly Rate</div>
            <div className="text-xl font-black text-[#FAE5D8] font-mono mt-0.5">
              ₹
              {technicians.length > 0
                ? Math.round(
                    technicians.reduce((acc, t) => acc + (t.hourlyRate || 550), 0) /
                      technicians.length
                  )
                : 550}
              <span className="text-xs font-normal text-[#DFB6B2]">/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#2A114B]/70 border border-[#824D69]/50 rounded-2xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DFB6B2]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specialists by name, phone (+91), or email..."
              className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl pl-10 pr-4 py-2 text-xs text-[#FAE5D8] placeholder-[#DFB6B2]/50 focus:outline-none focus:border-[#DFB6B2]"
            />
          </div>

          {/* Skill Filter Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3 py-2 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2] cursor-pointer"
            >
              <option value="ALL">All Trade Skills</option>
              {ALL_SKILLS.map((sk) => (
                <option key={sk} value={sk}>
                  {sk.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Zone Filter Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3 py-2 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2] cursor-pointer"
            >
              <option value="ALL">All Zones</option>
              {ALL_ZONES.map((zn) => (
                <option key={zn} value={zn}>
                  {zn.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter Buttons */}
          <div className="sm:col-span-2 flex gap-1 bg-[#180018]/90 p-1 rounded-xl border border-[#824D69]/50">
            {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAvailFilter(m)}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  availFilter === m
                    ? 'bg-[#522959] text-[#FAE5D8]'
                    : 'text-[#DFB6B2]/60 hover:text-[#FAE5D8]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Showing Count */}
        <div className="flex items-center justify-between text-[11px] text-[#DFB6B2]/70 font-mono pt-1">
          <span>
            Showing {filteredTechnicians.length} of {technicians.length} fleet specialists
          </span>
          {(searchQuery || skillFilter !== 'ALL' || zoneFilter !== 'ALL' || availFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSkillFilter('ALL')
                setZoneFilter('ALL')
                setAvailFilter('ALL')
              }}
              className="text-[#DFB6B2] hover:text-white underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Technician Directory Table */}
      <div className="bg-[#2A114B]/80 border border-[#824D69]/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#180018]/80 text-[#DFB6B2] uppercase font-mono text-[10px] border-b border-[#824D69]/50 tracking-wider">
                <th className="py-3 px-4">Specialist</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Trade Skills</th>
                <th className="py-3 px-4">Service Zones</th>
                <th className="py-3 px-4 text-center">Shift Hours</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-center">Live Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#824D69]/30">
              {loading && technicians.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#DFB6B2]/70">
                    <IconRotateCw className="w-6 h-6 animate-spin mx-auto text-[#DFB6B2] mb-2" />
                    <span>Loading 100-technician fleet database...</span>
                  </td>
                </tr>
              ) : filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#DFB6B2]/70">
                    No specialists match your filter criteria
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((tech) => {
                  return (
                    <tr
                      key={tech.id}
                      className="hover:bg-[#522959]/25 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#180018] border border-[#824D69] text-[#FAE5D8] flex items-center justify-center font-bold font-mono text-xs shadow-sm flex-shrink-0">
                            {tech.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-[#FAE5D8] group-hover:text-white transition-colors flex items-center gap-1.5">
                              <span>{tech.name}</span>
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 rounded flex items-center gap-0.5">
                                <IconStar className="w-2.5 h-2.5 fill-amber-400" />
                                <span>4.9</span>
                              </span>
                            </div>
                            <div className="text-[10px] text-[#DFB6B2]/70 font-mono">
                              ID: {tech.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-[#FAE5D8] font-mono">
                          <IconPhone className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <a
                            href={`tel:${tech.phone || '+91 9845000000'}`}
                            className="hover:underline hover:text-emerald-300"
                          >
                            {tech.phone || '+91 9845000000'}
                          </a>
                        </div>
                        {tech.email && (
                          <div className="flex items-center gap-1.5 text-[#DFB6B2]/80">
                            <IconMail className="w-3 h-3 text-[#DFB6B2] flex-shrink-0" />
                            <a
                              href={`mailto:${tech.email}`}
                              className="hover:underline hover:text-[#FAE5D8] truncate max-w-[150px] inline-block"
                            >
                              {tech.email}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {tech.skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded-md bg-[#180018] border border-[#824D69]/60 text-[10px] font-mono font-semibold text-[#DFB6B2] uppercase"
                            >
                              {sk.replace('-tech', '')}
                            </span>
                          ))}
                          {tech.skills.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#180018] text-[9px] text-[#DFB6B2]/60">
                              +{tech.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service Zones */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {tech.serviceZones.slice(0, 2).map((zn) => (
                            <span
                              key={zn}
                              className="px-1.5 py-0.5 rounded-md bg-[#522959]/60 border border-[#824D69]/40 text-[9px] font-mono text-[#FAE5D8]"
                            >
                              {zn}
                            </span>
                          ))}
                          {tech.serviceZones.length > 2 && (
                            <span className="px-1 py-0.5 text-[9px] text-[#DFB6B2]/60">
                              +{tech.serviceZones.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Shift Hours */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-[#DFB6B2]">
                        {tech.shiftStart} - {tech.shiftEnd}
                      </td>

                      {/* Hourly Rate */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{tech.hourlyRate || 550}/hr
                      </td>

                      {/* 1-Click Online Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(tech)}
                          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-90 border ${
                            tech.isAvailable
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                              : 'bg-[#180018] text-[#DFB6B2]/60 border-[#824D69]/40 hover:text-[#FAE5D8]'
                          }`}
                          title="Click to toggle availability"
                        >
                          {tech.isAvailable ? '🟢 Online' : '⚪ Offline'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(tech)}
                          className="btn-solid-secondary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm active:scale-95"
                          title="Edit Specialist Credentials"
                        >
                          <IconEdit className="w-3.5 h-3.5 text-[#DFB6B2]" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Specialist Modal */}
      {(editingTech || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-scaleIn">
          <div className="bg-[#2A114B] border-2 border-[#824D69] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-[#FAE5D8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#824D69]/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#180018] border border-[#824D69] text-[#FAE5D8]">
                  <IconHardHat className="w-4 h-4 text-[#DFB6B2]" />
                </div>
                <h3 className="text-base font-black text-[#FAE5D8]">
                  {editingTech ? `Edit Specialist: ${editingTech.name}` : 'Enroll New Fleet Specialist'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingTech(null)
                  setShowAddModal(false)
                }}
                className="text-[#DFB6B2]/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <IconXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTechnician} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Specialist Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Gowda"
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. ramesh@dispatchgrid.in"
                    className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3 py-2 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                    Phone Number (+91)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9845012345"
                    className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3 py-2 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                  />
                </div>
              </div>

              {/* Trade Skills Multi-Select Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1.5">
                  Certified Trade Skills (Click to toggle)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SKILLS.map((sk) => {
                    const selected = formData.skills.includes(sk)
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => toggleSkill(sk)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-mono ${
                          selected
                            ? 'bg-[#522959] text-[#FAE5D8] border-[#824D69] font-bold shadow-sm'
                            : 'bg-[#180018]/90 text-[#DFB6B2]/60 border-[#824D69]/40 hover:text-[#FAE5D8]'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {sk.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Service Zones Multi-Select Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1.5">
                  Assigned Service Zones
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ZONES.map((zn) => {
                    const selected = formData.serviceZones.includes(zn)
                    return (
                      <button
                        type="button"
                        key={zn}
                        onClick={() => toggleZone(zn)}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer font-mono ${
                          selected
                            ? 'bg-[#522959] text-[#FAE5D8] border-[#824D69] font-bold shadow-sm'
                            : 'bg-[#180018]/90 text-[#DFB6B2]/60 border-[#824D69]/40 hover:text-[#FAE5D8]'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {zn}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Shift Hours & Hourly Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                    Shift Start
                  </label>
                  <input
                    type="time"
                    value={formData.shiftStart}
                    onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                    className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-2.5 py-2 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                    Shift End
                  </label>
                  <input
                    type="time"
                    value={formData.shiftEnd}
                    onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                    className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-2.5 py-2 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                    Rate (₹/hr)
                  </label>
                  <input
                    type="number"
                    min="200"
                    max="3000"
                    step="50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-2.5 py-2 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#180018]/90 border border-[#824D69]/40">
                <div>
                  <div className="text-xs font-bold text-[#FAE5D8]">Live On-Demand Availability</div>
                  <div className="text-[10px] text-[#DFB6B2]/70">Eligible for real-time customer dispatch algorithms</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                    formData.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      : 'bg-[#180018] text-[#DFB6B2]/60 border-[#824D69]/40'
                  }`}
                >
                  {formData.isAvailable ? '🟢 Online' : '⚪ Offline'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#824D69]/40">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTech(null)
                    setShowAddModal(false)
                  }}
                  className="btn-solid-secondary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-solid-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <IconRotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Specialist...</span>
                    </>
                  ) : (
                    <>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Save Specialist</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
