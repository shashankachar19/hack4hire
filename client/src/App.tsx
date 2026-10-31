import { useState, useEffect } from 'react'
import './index.css'
import PortalNavbar, { type PortalType } from './portals/PortalNavbar'
import CustomerPortal from './portals/CustomerPortal'
import TechnicianPortal from './portals/TechnicianPortal'
import AdminPortal from './portals/AdminPortal'
import { IconAlertTriangle } from './components/Icons'

function getInitialPortal(): PortalType {
  if (typeof window === 'undefined') return 'admin'

  const path = window.location.pathname.toLowerCase()
  if (path.includes('customer')) return 'customer'
  if (path.includes('technician') || path.includes('partner') || path.includes('driver')) return 'technician'
  if (path.includes('admin') || path.includes('dispatcher')) return 'admin'

  const params = new URLSearchParams(window.location.search)
  const role = params.get('portal') || params.get('role') || params.get('page')
  if (role === 'customer') return 'customer'
  if (role === 'technician') return 'technician'
  if (role === 'admin') return 'admin'

  return 'admin'
}

function App() {
  const [activePortal, setActivePortal] = useState<PortalType>(getInitialPortal)

  const handleSelectPortal = (portal: PortalType) => {
    setActivePortal(portal)
    try {
      const newPath = `/${portal}`
      if (window.location.pathname !== newPath) {
        window.history.pushState({ portal }, '', newPath)
      }
    } catch {}
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActivePortal(getInitialPortal())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Strict Role Guard: Customer accounts cannot access Technician portal directly
  const customerProfileRaw = typeof window !== 'undefined' ? localStorage.getItem('dg_customer_profile') : null
  const isCustomerLoggedIn = !!customerProfileRaw

  if (isCustomerLoggedIn && activePortal === 'technician') {
    let customerName = 'Customer'
    try {
      const parsed = JSON.parse(customerProfileRaw || '{}')
      if (parsed.name) customerName = parsed.name
    } catch {}

    return (
      <div className="min-h-screen bg-[#180018] text-[#FAE5D8] flex flex-col font-sans selection:bg-[#522959] selection:text-[#FAE5D8]">
        <PortalNavbar activePortal={activePortal} onSelectPortal={handleSelectPortal} />
        <main className="p-4 sm:p-6 flex-1 max-w-xl mx-auto w-full flex items-center justify-center">
          <div className="bg-[#2A114B] border border-rose-500/50 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl animate-scaleIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <IconAlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#FAE5D8] mb-2">Access Restricted</h2>
            <p className="text-xs font-mono text-rose-300 uppercase tracking-wider mb-3">Role Boundary Isolation Enforced</p>
            <p className="text-sm text-[#DFB6B2] mb-6 leading-relaxed">
              Signed in as <strong className="text-[#FAE5D8]">{customerName}</strong>. Customer accounts are strictly isolated and cannot access the Technician Partner Terminal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => handleSelectPortal('customer')}
                className="btn-solid-primary px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                Return to Customer Portal
              </button>
              <button
                type="button"
                onClick={() => handleSelectPortal('admin')}
                className="btn-solid-secondary px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                Open Admin Console
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('dg_customer_profile')
                  window.location.reload()
                }}
                className="btn-solid-cream px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                Sign Out Customer
              </button>
            </div>
          </div>
        </main>
        <footer className="py-4 border-t border-[#824D69]/30 px-6 text-center text-xs text-[#DFB6B2]/70 max-w-7xl mx-auto w-full font-mono">
          © 2026 DispatchGrid Technologies Inc. Enterprise Tier
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#180018] text-[#FAE5D8] flex flex-col font-sans selection:bg-[#522959] selection:text-[#FAE5D8]">
      {/* Dedicated Portal Navbar */}
      <PortalNavbar activePortal={activePortal} onSelectPortal={handleSelectPortal} />

      {/* Main Role Portal View */}
      <main className="p-4 sm:p-6 flex-1 max-w-7xl mx-auto w-full">
        {activePortal === 'customer' && <CustomerPortal />}
        {activePortal === 'technician' && <TechnicianPortal />}
        {activePortal === 'admin' && <AdminPortal />}
      </main>

      {/* Footer Info */}
      <footer className="py-4 border-t border-[#824D69]/30 px-6 text-center text-xs text-[#DFB6B2]/70 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>DispatchGrid Real-Time Workforce Orchestration Platform</span>
        </div>
        <div className="font-mono text-[11px] text-[#DFB6B2]/60">
          © 2026 DispatchGrid Technologies Inc. Enterprise Tier
        </div>
      </footer>
    </div>
  )
}

export default App
