// src/pages/admin/AdminUserDetail.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ArrowLeft, Save, Globe } from 'lucide-react'
import api, { PLAN_META, STATUS_META, formatDate } from '../../utils/api'

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [planType, setPlanType] = useState('')
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [grantAll, setGrantAll] = useState(false)
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  const { data: user, isLoading } = useQuery(['admin-user', id], () =>
    api.get(`/admin/users/${id}`).then(r => {
      const u = r.data.data
      setPlanType(u.planType)
      setStatus(u.status)
      setNotes(u.notes || '')
      setSelectedStates(u.stateAccess?.map((a: any) => a.state.id) || [])
      return u
    })
  )

  const { data: statesData } = useQuery('admin-states', () =>
    api.get('/admin/geography/states').then(r => r.data.data)
  )

  const updateUser = useMutation(
    () => api.patch(`/admin/users/${id}`, { planType, status, notes }),
    { onSuccess: () => qc.invalidateQueries(['admin-user', id]) }
  )

  const updateAccess = useMutation(
    () => api.put(`/admin/users/${id}/state-access`, { stateIds: selectedStates, grantAll }),
    { onSuccess: () => qc.invalidateQueries(['admin-user', id]) }
  )

  if (isLoading) return <div className="p-8 text-slate-500">Loading...</div>
  if (!user) return <div className="p-8 text-slate-500">User not found</div>

  return (
    <div className="p-6 animate-fadeIn max-w-5xl">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xl font-bold">
          {user.businessName?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{user.businessName}</h1>
          <p className="text-slate-500 text-sm">{user.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={PLAN_META[user.planType]?.color || 'badge-gray'}>{user.planType}</span>
            <span className={STATUS_META[user.status]?.color || 'badge-gray'}>{user.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile Info */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Account Information</h3>
          {[
            ['Phone', user.phone],
            ['GST Number', user.gstNumber || 'Not provided'],
            ['Registered', formatDate(user.createdAt)],
            ['Last Active', user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never'],
            ['Total API Calls', user._count?.apiLogs || 0],
            ['API Keys', user.apiKeys?.length || 0],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between items-center text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-300 font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Admin Controls */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Admin Controls</h3>

          <div>
            <label className="label">Plan Type</label>
            <select className="input" value={planType} onChange={e => setPlanType(e.target.value)}>
              {['FREE', 'PREMIUM', 'PRO', 'UNLIMITED'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Account Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Admin Notes</label>
            <textarea className="input resize-none" rows={3} value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
          </div>

          <button onClick={() => updateUser.mutate()} disabled={updateUser.isLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {updateUser.isLoading ? 'Saving...' : 'Save Changes'}
          </button>
          {updateUser.isSuccess && <p className="text-xs text-emerald-400">Changes saved!</p>}
        </div>

        {/* State Access */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-400" />
              State Access ({selectedStates.length} states)
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" checked={grantAll} onChange={e => setGrantAll(e.target.checked)}
                  className="rounded" />
                Grant All States
              </label>
              <button onClick={() => updateAccess.mutate()} disabled={updateAccess.isLoading}
                className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50">
                {updateAccess.isLoading ? 'Updating...' : 'Update Access'}
              </button>
            </div>
          </div>

          {!grantAll && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
              {(statesData || []).map((state: any) => (
                <label key={state.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedStates.includes(state.id)
                      ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                      : 'border-brand-500/10 text-slate-500 hover:border-brand-500/20'
                  }`}>
                  <input type="checkbox" className="hidden"
                    checked={selectedStates.includes(state.id)}
                    onChange={e => setSelectedStates(prev =>
                      e.target.checked ? [...prev, state.id] : prev.filter(s => s !== state.id)
                    )} />
                  {state.name}
                </label>
              ))}
            </div>
          )}
          {updateAccess.isSuccess && <p className="text-xs text-emerald-400 mt-2">Access updated!</p>}
        </div>

        {/* API Keys */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">API Keys</h3>
          {user.apiKeys?.length === 0 ? (
            <p className="text-sm text-slate-500">No API keys created yet</p>
          ) : (
            <div className="space-y-2">
              {user.apiKeys?.map((k: any) => (
                <div key={k.id} className="flex items-center justify-between bg-surface-100 rounded-lg px-4 py-2.5">
                  <div>
                    <div className="text-sm text-slate-300 font-medium">{k.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{k.key}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={k.isActive ? 'badge-green' : 'badge-red'}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never used'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}