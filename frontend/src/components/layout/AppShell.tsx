import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  PanelLeft,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
  { label: 'Datasets', to: '/datasets', icon: Database },
  { label: 'Analysis History', to: '/history', icon: History },
]

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <div className="flex min-h-screen">
        <aside
          className={[
            'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#e5e5e3] bg-white transition-[width] duration-200 ease-out md:flex',
            collapsed ? 'w-[76px]' : 'w-[248px]',
          ].join(' ')}
        >
          <div className="flex h-16 items-center border-b border-[#e5e5e3] px-4">
            <NavLink
              to="/dashboard"
              className={[
                'flex min-w-0 items-center gap-3 overflow-hidden rounded-lg',
                collapsed ? 'w-full justify-center' : 'px-2',
              ].join(' ')}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-white">
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

          <div className="border-t border-[#e5e5e3] p-3">
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
          <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#e5e5e3] bg-white/95 px-5 backdrop-blur-sm md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#73736f] hover:bg-[#f0f0ed]"
                aria-label="Open navigation"
              >
                <PanelLeft size={18} />
              </button>
              <span className="text-sm font-semibold">InsightAI</span>
            </div>

            <div className="hidden md:block">
              <div className="text-sm font-medium text-[#292927]">
                Data workspace
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
