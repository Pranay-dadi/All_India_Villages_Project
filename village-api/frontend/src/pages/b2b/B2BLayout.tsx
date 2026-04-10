// src/pages/b2b/B2BLayout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { MapPin, LayoutDashboard, Key, BarChart2, BookOpen, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { PLAN_META } from '../../utils/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/keys', label: 'API Keys', icon: Key },
  { to: '/dashboard/usage', label: 'Usage', icon: BarChart2 },
  { to: '/dashboard/docs', label: 'Documentation', icon: BookOpen },
]

export default function B2BLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const planMeta = PLAN_META[user?.planType || 'FREE']

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <aside className="w-60 flex flex-col bg-surface-50 border-r border-brand-500/10 flex-shrink-0">
        <div className="px-5 py-5 border-b border-brand-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-brand-200" style={{fontFamily:'Sora,sans-serif'}}>VillageAPI</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider">Developer Portal</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-brand-500/10">
          <div className="px-3 py-2.5 rounded-lg bg-surface-100 mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-slate-300 truncate">{user?.businessName}</div>
              <span className={`${planMeta?.color} text-[10px]`}>{planMeta?.label}</span>
            </div>
            <div className="text-xs text-slate-600 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout}
            className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/5">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  )
}