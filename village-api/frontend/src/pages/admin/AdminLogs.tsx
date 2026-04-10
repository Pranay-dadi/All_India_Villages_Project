// src/pages/admin/AdminLogs.tsx
import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import api, { formatDateTime } from '../../utils/api'

function StatusBadge({ code }: { code: number }) {
  if (code >= 200 && code < 300) return <span className="badge-green">{code}</span>
  if (code >= 400 && code < 500) return <span className="badge-yellow">{code}</span>
  return <span className="badge-red">{code}</span>
}

export default function AdminLogs() {
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [statusCode, setStatusCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading } = useQuery(
    ['admin-logs', page, userId, endpoint, statusCode, startDate, endDate],
    () => api.get('/admin/logs', { params: { page, limit: 50, userId, endpoint, statusCode, startDate, endDate } })
      .then(r => r.data),
    { keepPreviousData: true }
  )

  const logs = data?.data || []
  const total = data?.total || 0

  return (
    <div className="p-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">API Logs</h1>
        <p className="text-slate-500 text-sm">{total.toLocaleString()} total requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input className="input w-48" placeholder="Filter by endpoint" value={endpoint}
          onChange={e => { setEndpoint(e.target.value); setPage(1) }} />
        <select className="input w-36" value={statusCode}
          onChange={e => { setStatusCode(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="200">2xx Success</option>
          <option value="400">4xx Client</option>
          <option value="500">5xx Server</option>
        </select>
        <input type="date" className="input w-40" value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1) }} />
        <input type="date" className="input w-40" value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1) }} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-500/10">
                <th className="table-header text-left px-4 py-3">Time</th>
                <th className="table-header text-left px-4 py-3">User</th>
                <th className="table-header text-left px-4 py-3">Key</th>
                <th className="table-header text-left px-4 py-3">Endpoint</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-500/5">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-surface-200 rounded animate-pulse-slow w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.map((log: any) => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell px-4 text-xs text-slate-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="table-cell px-4">
                    <div className="text-xs font-medium text-slate-300">{log.user?.businessName}</div>
                    <div className="text-xs text-slate-600">{log.user?.email}</div>
                  </td>
                  <td className="table-cell px-4">
                    <span className="font-mono text-xs text-slate-400">{log.apiKey?.name}</span>
                  </td>
                  <td className="table-cell px-4">
                    <span className="font-mono text-xs text-brand-400">{log.endpoint}</span>
                  </td>
                  <td className="table-cell px-4">
                    <StatusBadge code={log.statusCode} />
                  </td>
                  <td className="table-cell px-4">
                    <span className={`text-xs font-mono ${log.responseTime > 100 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {log.responseTime}ms
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-brand-500/10">
          <span className="text-xs text-slate-500">Page {page} of {data?.totalPages || 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages || 1)}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}