// src/pages/admin/AdminDashboard.tsx
import { useQuery } from 'react-query'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Users, Zap, Clock, Database, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import api, { formatNumber } from '../../utils/api'

const COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6']
const PLAN_COLORS: Record<string, string> = {
  FREE: '#64748b', PREMIUM: '#3b82f6', PRO: '#14b8a6', UNLIMITED: '#10b981'
}

function StatCard({ label, value, sub, icon: Icon, trend, trendUp }: any) {
  return (
    <div className="stat-card animate-fadeIn">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-400" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-100" style={{fontFamily:'Sora,sans-serif'}}>{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-brand-500 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-50 border border-brand-500/20 rounded-lg px-3 py-2 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery('admin-stats', () =>
    api.get('/admin/stats').then(r => r.data.data)
  , { refetchInterval: 30000 })

  if (isLoading) return (
    <div className="p-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse-slow">
            <div className="h-8 w-8 bg-brand-500/10 rounded-lg mb-3" />
            <div className="h-6 w-20 bg-surface-200 rounded mb-2" />
            <div className="h-3 w-16 bg-surface-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )

  const stats = data?.overview || {}
  const daily = (data?.dailyRequests || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    requests: parseInt(d.count),
  }))

  const planDist = (data?.planDistribution || []).map((p: any) => ({
    name: p.plan,
    value: p.count,
    color: PLAN_COLORS[p.plan] || '#64748b',
  }))

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Platform overview and analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Villages"
          value={formatNumber(stats.totalVillages || 0)}
          icon={Database}
          sub="Across all states"
        />
        <StatCard
          label="Active Users Today"
          value={stats.activeUsersToday || 0}
          icon={Users}
          trend={`${stats.activeUsersYesterday || 0} yesterday`}
          trendUp={stats.activeUsersToday >= stats.activeUsersYesterday}
        />
        <StatCard
          label="API Requests Today"
          value={formatNumber(stats.apiRequestsToday || 0)}
          icon={Zap}
          sub="Across all users"
        />
        <StatCard
          label="Avg Response Time"
          value={`${stats.avgResponseTime || 0}ms`}
          icon={Clock}
          sub={`p95: ${stats.p95ResponseTime || 0}ms`}
          trendUp={stats.avgResponseTime < 100}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart - daily requests */}
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">API Requests (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gradReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,184,166,0.07)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="requests" stroke="#14b8a6" strokeWidth={2}
                fill="url(#gradReq)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart - plan distribution */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Users by Plan</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="value" paddingAngle={3}>
                {planDist.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [v, 'Users']} contentStyle={{ background: '#111918', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {planDist.map((p: any) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name} ({p.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top endpoints */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Endpoints (30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(data?.topEndpoints || []).slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,184,166,0.07)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
              <YAxis type="category" dataKey="endpoint" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User status */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Users by Status</h3>
          <div className="space-y-3">
            {(data?.usersByStatus || []).map((s: any) => {
              const colors: Record<string, string> = {
                ACTIVE: '#10b981', PENDING_APPROVAL: '#f59e0b',
                SUSPENDED: '#ef4444', REJECTED: '#64748b',
              }
              const total = data.usersByStatus.reduce((sum: number, x: any) => sum + x.count, 0)
              const pct = total ? Math.round((s.count / total) * 100) : 0
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{s.status.replace('_', ' ')}</span>
                    <span className="text-slate-300 font-semibold">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[s.status] || '#64748b' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}