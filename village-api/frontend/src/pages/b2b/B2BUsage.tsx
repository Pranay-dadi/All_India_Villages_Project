// src/pages/b2b/B2BUsage.tsx
import { useState } from 'react'
import { useQuery } from 'react-query'
import api, { formatDateTime } from '../../utils/api'

function StatusBadge({ code }: { code: number }) {
  if (code >= 200 && code < 300) return <span className="badge-green text-xs">{code}</span>
  if (code >= 400 && code < 500) return <span className="badge-yellow text-xs">{code}</span>
  return <span className="badge-red text-xs">{code}</span>
}

export default function B2BUsage() {
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading } = useQuery(
    ['b2b-usage', page, startDate, endDate],
    () => api.get('/b2b/usage', { params: { page, limit: 50, startDate, endDate } }).then(r => r.data),
    { keepPreviousData: true }
  )

  const logs = data?.data || []

  return (
    <div className="p-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Usage History</h1>
        <p className="text-slate-500 text-sm">{data?.total?.toLocaleString() || 0} total API calls</p>
      </div>

      <div className="flex gap-3 mb-5">
        <input type="date" className="input w-40" value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1) }} />
        <input type="date" className="input w-40" value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1) }} />
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
            className="btn-secondary">Clear</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-500/10">
                <th className="table-header text-left px-4 py-3">Time</th>
                <th className="table-header text-left px-4 py-3">Key</th>
                <th className="table-header text-left px-4 py-3">Endpoint</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Response</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-500/5">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-surface-200 rounded animate-pulse-slow w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">
                    No usage logs found
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell px-4 text-xs text-slate-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="table-cell px-4 text-xs text-slate-400">
                    {log.apiKey?.name}
                  </td>
                  <td className="table-cell px-4">
                    <span className="font-mono text-xs text-brand-400">{log.endpoint}</span>
                  </td>
                  <td className="table-cell px-4">
                    <StatusBadge code={log.statusCode} />
                  </td>
                  <td className="table-cell px-4">
                    <span className={`font-mono text-xs ${log.responseTime > 100 ? 'text-yellow-400' : 'text-emerald-400'}`}>
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
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p+1)} disabled={page>=(data?.totalPages||1)}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}