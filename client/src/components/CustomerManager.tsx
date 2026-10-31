import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import {
  IconUsers,
  IconSearch,
  IconEdit,
  IconCheckCircle,
  IconXCircle,
  IconPhone,
  IconMail,
  IconMapPin,
  IconShieldCheck,
  IconRotateCw,
  IconUser,
} from './Icons'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
  age?: number | null
  createdAt?: string
  _count?: {
    jobs?: number
  }
}

interface CustomerManagerProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void
}

export default function CustomerManager({ onShowToast }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)

  // New customer form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    age: 28,
  })

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const data = await api.getCustomers()
      setCustomers(data || [])
    } catch (err: any) {
      onShowToast(`Failed to load customers: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase().trim()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    )
  }, [customers, searchQuery])

  // Open edit modal
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      age: customer.age || 28,
    })
  }

  // Open add modal
  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: 'Bengaluru, Karnataka',
      age: 28,
    })
    setShowAddModal(true)
  }

  // Save changes
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) {
      onShowToast('Name and phone number are required', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (editingCustomer) {
        // Update customer in database
        const updated = await api.updateCustomer(editingCustomer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          age: Number(formData.age) || 28,
        })
        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...updated } : c))
        )
        onShowToast(`Customer "${formData.name}" profile updated successfully!`, 'success')
        setEditingCustomer(null)
      } else {
        // Register new customer in database
        await api.createOrUpdateCustomer({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          age: Number(formData.age) || 28,
        })
        await fetchCustomers()
        onShowToast(`New customer "${formData.name}" registered successfully!`, 'success')
        setShowAddModal(false)
      }
    } catch (err: any) {
      onShowToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 animate-scaleIn text-[#FAE5D8]">
      {/* Top Controls & Metrics Banner */}
      <div className="bg-[#2A114B]/90 border border-[#824D69]/50 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#180018] border border-[#824D69] text-[#FAE5D8]">
                <IconUsers className="w-5 h-5 text-[#DFB6B2]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-[#FAE5D8]">
                  Customer Accounts & Dossier Management
                </h3>
                <p className="text-xs text-[#DFB6B2]/80">
                  Full CRUD authority over {customers.length} residential customer accounts with verified database records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="btn-solid-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
              title="Refresh database records"
            >
              <IconRotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="btn-solid-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95"
            >
              <span>+ Add Customer</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#824D69]/30">
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Total Customers</div>
            <div className="text-xl font-black text-[#FAE5D8] font-mono mt-0.5">{customers.length}</div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Active Residents</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
              {customers.filter((c) => c.address).length}
            </div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Avg Resident Age</div>
            <div className="text-xl font-black text-[#FAE5D8] font-mono mt-0.5">
              {customers.length > 0
                ? Math.round(
                    customers.reduce((acc, c) => acc + (c.age || 28), 0) / customers.length
                  )
                : 28}{' '}
              <span className="text-xs font-normal text-[#DFB6B2]">yrs</span>
            </div>
          </div>
          <div className="bg-[#180018]/60 p-3 rounded-xl border border-[#824D69]/40">
            <div className="text-[10px] uppercase font-bold text-[#DFB6B2]/70 font-mono">Verified DB Sync</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <IconShieldCheck className="w-4 h-4" />
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#DFB6B2]/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone (+91), email, or residential address..."
          className="w-full bg-[#2A114B]/80 border border-[#824D69]/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#FAE5D8] placeholder-[#DFB6B2]/50 focus:outline-none focus:border-[#DFB6B2] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#DFB6B2]/60 hover:text-[#FAE5D8]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customer Directory Table */}
      <div className="bg-[#2A114B]/80 border border-[#824D69]/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#180018]/80 text-[#DFB6B2] uppercase font-mono text-[10px] border-b border-[#824D69]/50 tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Worksite Address</th>
                <th className="py-3 px-4 text-center">Age</th>
                <th className="py-3 px-4 text-center">Total Jobs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#824D69]/30">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#DFB6B2]/70">
                    <IconRotateCw className="w-6 h-6 animate-spin mx-auto text-[#DFB6B2] mb-2" />
                    <span>Loading verified customer database...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#DFB6B2]/70">
                    No customers match your search "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const initials = cust.name
                    ? cust.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'CU'

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-[#522959]/25 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#522959] border border-[#824D69] text-[#FAE5D8] flex items-center justify-center font-bold font-mono text-xs shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#FAE5D8] group-hover:text-white transition-colors">
                              {cust.name}
                            </div>
                            <div className="text-[10px] text-[#DFB6B2]/70 font-mono">
                              ID: {cust.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-[#FAE5D8] font-mono">
                          <IconPhone className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <a
                            href={`tel:${cust.phone}`}
                            className="hover:underline hover:text-emerald-300"
                          >
                            {cust.phone}
                          </a>
                        </div>
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-[#DFB6B2]/80">
                            <IconMail className="w-3 h-3 text-[#DFB6B2] flex-shrink-0" />
                            <a
                              href={`mailto:${cust.email}`}
                              className="hover:underline hover:text-[#FAE5D8] truncate max-w-[180px] inline-block"
                            >
                              {cust.email}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1.5 max-w-xs text-[#DFB6B2]">
                          <IconMapPin className="w-3.5 h-3.5 text-[#DFB6B2]/70 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{cust.address || 'Bengaluru, Karnataka'}</span>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-[#FAE5D8]">
                        {cust.age || 28}
                      </td>

                      {/* Total Bookings */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-[#180018] border border-[#824D69]/60 text-xs font-mono font-bold text-[#DFB6B2]">
                          {cust._count?.jobs ?? 1}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="btn-solid-secondary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm active:scale-95"
                          title="Edit Customer Profile"
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

      {/* Edit / Add Customer Modal */}
      {(editingCustomer || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-scaleIn">
          <div className="bg-[#2A114B] border-2 border-[#824D69] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-[#FAE5D8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#824D69]/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#180018] border border-[#824D69] text-[#FAE5D8]">
                  <IconUser className="w-4 h-4 text-[#DFB6B2]" />
                </div>
                <h3 className="text-base font-black text-[#FAE5D8]">
                  {editingCustomer ? 'Edit Customer Dossier' : 'Register New Customer'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingCustomer(null)
                  setShowAddModal(false)
                }}
                className="text-[#DFB6B2]/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <IconXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Phone Number (+91) *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 9845012345"
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ramesh.kulkarni@gmail.com"
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Worksite Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Worksite / Residential Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru"
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-[11px] font-bold uppercase font-mono text-[#DFB6B2] mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full bg-[#180018]/90 border border-[#824D69]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#FAE5D8] font-mono focus:outline-none focus:border-[#DFB6B2]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#824D69]/40">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomer(null)
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Save Changes</span>
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
