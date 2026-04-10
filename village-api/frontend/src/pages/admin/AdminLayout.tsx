// src/pages/admin/AdminLayout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  MapPin, LayoutDashboard, Users, FileText,
  Database, LogOut, ChevronRight, Bell
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/logs', label: 'API Logs', icon: FileText },
  { to: '/admin/villages', label: 'Villages', icon: Database },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-surface-50 border-r border-brand-500/10 flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-brand-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-brand-200" style={{fontFamily:'Sora,sans-serif'}}>VillageAPI</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
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

        {/* User */}
        <div className="px-3 py-4 border-t border-brand-500/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-100 mb-2">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">{user?.email}</div>
              <div className="text-[10px] text-brand-500 uppercase tracking-wider">Admin</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/5">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}