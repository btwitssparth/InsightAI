import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  LogOut,
} from 'lucide-react'
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
    if (error) {
      setLoggingOut(false)
      return
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f4f4f1] text-[#171717]">
      <div className="flex min-h-screen">
        <aside
          className={[
            'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#dfdfdb] bg-[#fbfbf9] transition-[width] duration-200 ease-out md:flex',
            collapsed ? 'w-[76px]' : 'w-[248px]',
          ].join(' ')}
        >
          <div className="flex h-16 items-center border-b border-[#dfdfdb] px-4">
            <NavLink
              to="/dashboard"
              className={[
                'flex min-w-0 items-center gap-3 overflow-hidden rounded-lg',
                collapsed ? 'w-full justify-center' : 'px-2',
              ].join(' ')}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#171717] text-white shadow-[0_2px_5px_rgba(0,0,0,0.12)]">
                <BarChart3 size={17} strokeWidth={2.2} />
              </div>

              {!collapsed && (
                <div className="animate-[fade-in_160ms_ease-out] whitespace-nowrap">
                  <div className="text-[15px] font-semibold tracking-[-0.01em]">
                    InsightAI
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a8a86]">
                    Data workspace
                  </div>
                </div>
              )}
            </NavLink>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {!collapsed && (
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a0a09b]">
                Workspace
              </div>
            )}

            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150',
                    collapsed ? 'justify-center px-0' : '',
                    isActive
                      ? 'bg-[#f0f0ed] text-[#171717]'
                      : 'text-[#73736f] hover:bg-[#f5f5f2] hover:text-[#292927]',
                  ].join(' ')
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={17} strokeWidth={1.9} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-[#dfdfdb] p-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mb-1 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[#777772] transition-colors duration-150 hover:bg-[#f1f1ee] hover:text-[#7b5148] disabled:cursor-wait disabled:opacity-50"
              title="Log out"
            >
              <LogOut size={16} />
              {!collapsed && <span className="text-xs font-medium">{loggingOut ? 'Logging out…' : 'Log out'}</span>}
            </button>

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[#73736f] transition-colors duration-150 hover:bg-[#f5f5f2] hover:text-[#292927]"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight size={17} />
              ) : (
                <>
                  <ChevronLeft size={17} />
                  <span className="text-xs font-medium">Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#dfdfdb] bg-[#fbfbf9] px-5 md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171717] text-white">
                <BarChart3 size={16} strokeWidth={2.2} />
              </div>
              <span className="text-sm font-semibold">InsightAI</span>
            </div>

            <div className="hidden md:block">
              <div className="text-sm font-semibold tracking-[-0.01em] text-[#292927]">Data workspace</div>
              <div className="text-[10px] text-[#999994]">Analyze, verify, understand</div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-[#dededb] bg-white px-3 text-xs font-medium text-[#666660] transition-colors hover:bg-[#f1f1ee] hover:text-[#7b5148] disabled:cursor-wait disabled:opacity-50 md:hidden"
            >
              <LogOut size={14} />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </header>

          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
