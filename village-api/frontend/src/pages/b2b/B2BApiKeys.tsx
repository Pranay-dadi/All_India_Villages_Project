// src/pages/b2b/B2BApiKeys.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plus, Copy, Trash2, Check, AlertTriangle, Key } from 'lucide-react'
import api, { formatDate } from '../../utils/api'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded text-slate-500 hover:text-slate-300 transition">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function B2BApiKeys() {
  const qc = useQueryClient()
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyData, setNewKeyData] = useState<{key: string; secret: string; name: string} | null>(null)
  const [confirmedSecret, setConfirmedSecret] = useState(false)

  const { data: keys, isLoading } = useQuery('b2b-keys', () =>
    api.get('/b2b/keys').then(r => r.data.data)
  )

  const createKey = useMutation(
    () => api.post('/b2b/keys', { name: newKeyName }),
    {
      onSuccess: (res) => {
        setNewKeyData(res.data.data)
        setNewKeyName('')
        setConfirmedSecret(false)
        qc.invalidateQueries('b2b-keys')
      }
    }
  )

  const revokeKey = useMutation(
    (id: string) => api.delete(`/b2b/keys/${id}`),
    { onSuccess: () => qc.invalidateQueries('b2b-keys') }
  )

  return (
    <div className="p-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">API Keys</h1>
        <p className="text-slate-500 text-sm">Manage your API credentials</p>
      </div>

      {/* Create new key */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-400" />
          Create New API Key
        </h3>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Key name (e.g., Production Server)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && newKeyName && createKey.mutate()}
          />
          <button
            onClick={() => createKey.mutate()}
            disabled={!newKeyName.trim() || createKey.isLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            {createKey.isLoading ? 'Creating...' : 'Generate Key'}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Maximum 5 active keys per account</p>
      </div>

      {/* New key display (one-time) */}
      {newKeyData && (
        <div className="card border-yellow-500/30 bg-yellow-500/5 mb-6 animate-fadeIn">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-yellow-300">Save Your API Secret Now!</h3>
              <p className="text-xs text-yellow-600 mt-0.5">The secret will never be shown again. Copy it and store it securely.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label text-yellow-600">API Key</label>
              <div className="flex items-center gap-2 bg-surface-100 rounded-lg px-3 py-2.5">
                <code className="font-mono text-sm text-brand-300 flex-1">{newKeyData.key}</code>
                <CopyButton text={newKeyData.key} />
              </div>
            </div>
            <div>
              <label className="label text-yellow-600">API Secret (ONE TIME ONLY)</label>
              <div className="flex items-center gap-2 bg-surface-100 rounded-lg px-3 py-2.5 border border-yellow-500/30">
                <code className="font-mono text-sm text-yellow-300 flex-1 break-all">{newKeyData.secret}</code>
                <CopyButton text={newKeyData.secret} />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={confirmedSecret} onChange={e => setConfirmedSecret(e.target.checked)} />
            <span className="text-xs text-slate-400">I have securely saved my API secret</span>
          </label>
          <button
            onClick={() => setNewKeyData(null)}
            disabled={!confirmedSecret}
            className="btn-primary mt-3 disabled:opacity-40"
          >
            I've Saved It — Close
          </button>
        </div>
      )}

      {/* Keys list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-500/10">
          <span className="text-sm text-slate-400">{(keys || []).length} / 5 keys</span>
        </div>

        {isLoading ? (
          <div className="p-6 text-slate-500 text-sm">Loading...</div>
        ) : (keys || []).length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-10 h-10 text-brand-500/20 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No API keys yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-500/10">
                <th className="table-header text-left px-4 py-3">Name</th>
                <th className="table-header text-left px-4 py-3">Key</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Created</th>
                <th className="table-header text-left px-4 py-3">Last Used</th>
                <th className="table-header text-left px-4 py-3">Calls</th>
                <th className="table-header text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(keys || []).map((k: any) => (
                <tr key={k.id} className="table-row">
                  <td className="table-cell px-4 font-medium text-slate-200">{k.name}</td>
                  <td className="table-cell px-4">
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs text-slate-400">{k.key}</code>
                    </div>
                  </td>
                  <td className="table-cell px-4">
                    <span className={k.isActive ? 'badge-green' : 'badge-red'}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="table-cell px-4 text-xs text-slate-500">{formatDate(k.createdAt)}</td>
                  <td className="table-cell px-4 text-xs text-slate-500">
                    {k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}
                  </td>
                  <td className="table-cell px-4 text-slate-400">{k._count?.apiLogs || 0}</td>
                  <td className="table-cell px-4">
                    {k.isActive && (
                      <button
                        onClick={() => confirm('Revoke this API key?') && revokeKey.mutate(k.id)}
                        className="btn-danger py-1.5 px-2.5 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}