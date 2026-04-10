// src/pages/admin/AdminVillages.tsx
import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Database } from 'lucide-react'
import api from '../../utils/api'

export default function AdminVillages() {
  const [stateId, setStateId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [subDistrictId, setSubDistrictId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(500)

  const { data: states } = useQuery('admin-states-list', () =>
    api.get('/admin/geography/states').then(r => r.data.data)
  )

  const { data: districts } = useQuery(['admin-districts', stateId], () =>
    stateId ? api.get(`/admin/geography/districts/${stateId}`).then(r => r.data.data) : Promise.resolve([]),
    { enabled: !!stateId }
  )

  const { data: subDistricts } = useQuery(['admin-subdistricts', districtId], () =>
    districtId ? api.get(`/admin/geography/subdistricts/${districtId}`).then(r => r.data.data) : Promise.resolve([]),
    { enabled: !!districtId }
  )

  const { data, isLoading } = useQuery(
    ['admin-villages', stateId, districtId, subDistrictId, search, page, limit],
    () => api.get('/admin/villages', { params: { stateId, districtId, subDistrictId, search, page, limit } })
      .then(r => r.data),
    { enabled: !!stateId, keepPreviousData: true }
  )

  const villages = data?.data || []

  return (
    <div className="p-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Village Browser</h1>
        <p className="text-slate-500 text-sm">Explore and verify imported geographical data</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input w-48" value={stateId}
          onChange={e => { setStateId(e.target.value); setDistrictId(''); setSubDistrictId(''); setPage(1) }}>
          <option value="">Select State *</option>
          {(states || []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select className="input w-48" value={districtId} disabled={!stateId}
          onChange={e => { setDistrictId(e.target.value); setSubDistrictId(''); setPage(1) }}>
          <option value="">All Districts</option>
          {(districts || []).map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select className="input w-48" value={subDistrictId} disabled={!districtId}
          onChange={e => { setSubDistrictId(e.target.value); setPage(1) }}>
          <option value="">All Sub-Districts</option>
          {(subDistricts || []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input pl-9 w-48" placeholder="Search village..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <select className="input w-28" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          <option value={500}>500 rows</option>
          <option value={5000}>5,000 rows</option>
          <option value={10000}>10,000 rows</option>
        </select>
      </div>

      {!stateId ? (
        <div className="card text-center py-16">
          <Database className="w-12 h-12 text-brand-500/30 mx-auto mb-3" />
          <p className="text-slate-500">Select a state to browse village data</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-500/10 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {data ? `${data.total?.toLocaleString()} villages` : 'Loading...'}
            </span>
            <span className="text-xs text-slate-600">Page {page} of {data?.totalPages || 1}</span>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-50">
                <tr className="border-b border-brand-500/10">
                  <th className="table-header text-left px-4 py-3">State</th>
                  <th className="table-header text-left px-4 py-3">District</th>
                  <th className="table-header text-left px-4 py-3">Sub-District</th>
                  <th className="table-header text-left px-4 py-3">Code</th>
                  <th className="table-header text-left px-4 py-3">Village Name</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-brand-500/5">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-3.5 bg-surface-200 rounded animate-pulse-slow w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : villages.map((v: any) => (
                  <tr key={v.id} className="table-row">
                    <td className="table-cell px-4 text-xs">{v.subDistrict?.district?.state?.name}</td>
                    <td className="table-cell px-4 text-xs">{v.subDistrict?.district?.name}</td>
                    <td className="table-cell px-4 text-xs">{v.subDistrict?.name}</td>
                    <td className="table-cell px-4 font-mono text-xs text-slate-500">{v.code}</td>
                    <td className="table-cell px-4 font-medium text-slate-200">{v.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-500/10">
            <span className="text-xs text-slate-500">
              Showing {Math.min((page-1)*limit+1, data?.total||0)}–{Math.min(page*limit, data?.total||0)} of {data?.total?.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page>=(data?.totalPages||1)}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}