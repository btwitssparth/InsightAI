import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronLeft, ChevronRight, Database, History, LogOut } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
  { label: 'Datasets', to: '/datasets', icon: Database },
  { label: 'Analysis History', to: '/history', icon: History },
]

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) { setLoggingOut(false); return }
    navigate('/login', { replace: true })
  }
  return (
    <div className="min-h-screen bg-[#f3f3f0] text-[#171717]">
      <div className="flex min-h-screen">
        <aside className={['sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#d9d9d5] bg-[#20201e] text-white transition-[width] duration-200 ease-out md:flex', collapsed ? 'w-[78px]' : 'w-[256px]'].join(' ')}>
          <div className="flex h-[76px] items-center border-b border-white/10 px-4">
            <NavLink to="/dashboard" className={['flex min-w-0 items-center gap-3 overflow-hidden rounded-xl', collapsed ? 'w-full justify-center' : 'px-2'].join(' ')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#20201e] shadow-[0_4px_14px_rgba(0,0,0,0.22)]"><BarChart3 size={18} strokeWidth={2.3} /></div>
              {!collapsed && <div className="whitespace-nowrap"><div className="text-[15px] font-semibold tracking-[-0.01em]">InsightAI</div><div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">Data workspace</div></div>}
            </NavLink>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-6">
            {!collapsed && <div className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Workspace</div>}
            {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} title={collapsed ? label : undefined} className={({ isActive }) => ['group flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-150', collapsed ? 'justify-center px-0' : '', isActive ? 'bg-white text-[#20201e] shadow-[0_4px_14px_rgba(0,0,0,0.14)]' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'].join(' ')}><Icon size={17} strokeWidth={1.9} />{!collapsed && <span>{label}</span>}</NavLink>)}
          </nav>
          <div className="border-t border-white/10 p-3">
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="mb-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50" title="Log out"><LogOut size={16} />{!collapsed && <span className="text-xs font-medium">{loggingOut ? 'Logging out…' : 'Log out'}</span>}</button>
            <button type="button" onClick={() => setCollapsed(v => !v)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-white/40 transition-colors hover:bg-white/[0.07] hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span className="text-xs font-medium">Collapse</span></>}</button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-[#d9d9d5] bg-white px-5 md:px-8">
            <div className="flex items-center gap-3 md:hidden"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20201e] text-white"><BarChart3 size={16} strokeWidth={2.2} /></div><span className="text-sm font-semibold">InsightAI</span></div>
            <div className="hidden md:block"><div className="text-[15px] font-semibold tracking-[-0.01em] text-[#20201e]">Data workspace</div><div className="mt-0.5 text-[11px] text-[#969690]">Analyze, verify, understand</div></div>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-[#d9d9d5] bg-white px-3 text-xs font-medium text-[#666660] transition hover:bg-[#f3f3f0] hover:text-[#20201e] disabled:opacity-50 md:hidden"><LogOut size={14} />{loggingOut ? 'Logging out…' : 'Log out'}</button>
          </header>
          <main className="min-h-[calc(100vh-4.75rem)]"><Outlet /></main>
        </div>
      </div>
    </div>
  )
}