// src/pages/b2b/B2BDashboard.tsx
import { useQuery } from 'react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import api, { formatNumber, PLAN_META } from '../../utils/api'
import { useAuthStore } from '../../store/auth'

export default function B2BDashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery('b2b-dashboard', () =>
    api.get('/b2b/dashboard').then(r => r.data.data)
  , { refetchInterval: 60000 })

  const { data: accessData } = useQuery('b2b-access', () =>
    api.get('/b2b/access').then(r => r.data.data)
  )

  const planMeta = PLAN_META[user?.planType || 'FREE']
  const daily = (data?.dailyBreakdown || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    requests: parseInt(d.count),
  }))

  const usagePct = data?.todayUsagePercent || 0

  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Welcome back, {user?.businessName?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Your API usage overview</p>
        </div>
        <div className="card py-2 px-4 flex items-center gap-2">
          <span className={planMeta?.color}>{planMeta?.label}</span>
          <span className="text-xs text-slate-500">{planMeta?.limit}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Requests",
            value: isLoading ? '...' : formatNumber(data?.todayRequests || 0),
            sub: `of ${formatNumber(data?.dailyLimit || 0)} limit`,
            icon: Zap,
            color: 'text-brand-400',
          },
          {
            label: 'Monthly Total',
            value: isLoading ? '...' : formatNumber(data?.monthRequests || 0),
            sub: 'This month',
            icon: TrendingUp,
            color: 'text-blue-400',
          },
          {
            label: 'Avg Response',
            value: isLoading ? '...' : `${data?.avgResponseTime || 0}ms`,
            sub: 'Last 24 hours',
            icon: Clock,
            color: 'text-yellow-400',
          },
          {
            label: 'Success Rate',
            value: isLoading ? '...' : `${data?.successRate || 100}%`,
            sub: 'Today',
            icon: CheckCircle,
            color: 'text-emerald-400',
          },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className={`w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2" style={{fontFamily:'Sora,sans-serif'}}>
              {card.value}
            </div>
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="text-xs text-brand-600">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-slate-300">Daily Quota Usage</span>
          <span className="text-sm text-slate-400">{usagePct}%</span>
        </div>
        <div className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usagePct}%`,
              background: usagePct > 95 ? '#ef4444' : usagePct > 80 ? '#f59e0b' : '#14b8a6'
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-600">
          <span>{formatNumber(data?.todayRequests || 0)} used</span>
          <span>{formatNumber(data?.todayRemaining || 0)} remaining</span>
        </div>
        {usagePct > 80 && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${usagePct > 95 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
            {usagePct > 95 ? '⚠️ Almost at daily limit! Consider upgrading.' : '⚡ Approaching daily limit (80%)'}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Requests (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={daily}>
            <defs>
              <linearGradient id="b2bGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,184,166,0.07)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <Tooltip contentStyle={{ background: '#111918', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="requests" stroke="#14b8a6" strokeWidth={2} fill="url(#b2bGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* State Access */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Accessible States ({(accessData || []).length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {(accessData || []).length === 0 ? (
            <p className="text-sm text-slate-500">No state access yet. Contact admin.</p>
          ) : (
            (accessData || []).map((s: any) => (
              <span key={s.id} className="badge-teal">{s.name}</span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}