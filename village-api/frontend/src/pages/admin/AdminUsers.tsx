// src/pages/admin/AdminUsers.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { Search, Filter, ChevronRight, UserCheck, UserX, RefreshCw } from 'lucide-react'
import api, { PLAN_META, STATUS_META, formatDate } from '../../utils/api'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [planType, setPlanType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery(
    ['admin-users', page, search, status, planType],
    () => api.get('/admin/users', { params: { page, limit: 20, search, status, planType } }).then(r => r.data),
    { keepPreviousData: true }
  )

  const updateUser = useMutation(
    ({ id, data }: any) => api.patch(`/admin/users/${id}`, data),
    { onSuccess: () => qc.invalidateQueries('admin-users') }
  )

  const users = data?.data || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Users</h1>
          <p className="text-slate-500 text-sm">{total} registered businesses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by email or business..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input w-40"
          value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className="input w-36"
          value={planType} onChange={e => { setPlanType(e.target.value); setPage(1) }}>
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
          <option value="PRO">Pro</option>
          <option value="UNLIMITED">Unlimited</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-500/10">
                <th className="table-header text-left px-4 py-3">Business</th>
                <th className="table-header text-left px-4 py-3">Plan</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Registered</th>
                <th className="table-header text-left px-4 py-3">Requests</th>
                <th className="table-header text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-500/5">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-200 rounded animate-pulse-slow w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.map((u: any) => {
                const planMeta = PLAN_META[u.planType]
                const statusMeta = STATUS_META[u.status]
                return (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell px-4">
                      <div className="font-medium text-slate-200">{u.businessName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="table-cell px-4">
                      <span className={planMeta?.color || 'badge-gray'}>{planMeta?.label || u.planType}</span>
                    </td>
                    <td className="table-cell px-4">
                      <span className={statusMeta?.color || 'badge-gray'}>{statusMeta?.label || u.status}</span>
                    </td>
                    <td className="table-cell px-4 text-slate-400">{formatDate(u.createdAt)}</td>
                    <td className="table-cell px-4 text-slate-400">{u._count?.apiLogs || 0}</td>
                    <td className="table-cell px-4">
                      <div className="flex items-center gap-2">
                        {u.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => updateUser.mutate({ id: u.id, data: { status: 'ACTIVE' } })}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            title="Approve"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {u.status === 'ACTIVE' && (
                          <button
                            onClick={() => updateUser.mutate({ id: u.id, data: { status: 'SUSPENDED' } })}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                            title="Suspend"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <button
                            onClick={() => updateUser.mutate({ id: u.id, data: { status: 'ACTIVE' } })}
                            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition"
                            title="Reactivate"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link to={`/admin/users/${u.id}`}
                          className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:text-slate-200 transition">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-brand-500/10">
          <span className="text-xs text-slate-500">
            Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}