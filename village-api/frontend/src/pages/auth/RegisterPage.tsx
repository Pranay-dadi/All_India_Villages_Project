// src/pages/auth/RegisterPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import api from '../../utils/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    businessName: '', phone: '', gstNumber: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        phone: form.phone,
        gstNumber: form.gstNumber || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface bg-grid flex items-center justify-center p-4">
        <div className="max-w-md w-full card border-emerald-500/20 text-center animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-emerald-300 mb-2">Registration Submitted!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your account is pending admin approval. You'll receive an email once approved.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface bg-grid flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 mb-4">
            <MapPin className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-brand-100">VillageAPI</h1>
          <p className="text-slate-500 text-sm mt-1">Register your business</p>
        </div>

        <div className="card border-brand-500/20">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Create Business Account</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Business Email *</label>
              <input type="email" className="input" placeholder="you@company.com"
                value={form.email} onChange={e => update('email', e.target.value)} required />
              <p className="text-xs text-slate-600 mt-1">Use your business email (not Gmail/Yahoo)</p>
            </div>

            <div>
              <label className="label">Business Name *</label>
              <input type="text" className="input" placeholder="Acme Technologies Pvt Ltd"
                value={form.businessName} onChange={e => update('businessName', e.target.value)} required />
            </div>

            <div>
              <label className="label">Phone Number *</label>
              <input type="tel" className="input" placeholder="+91 98765 43210"
                value={form.phone} onChange={e => update('phone', e.target.value)} required />
            </div>

            <div>
              <label className="label">GST Number (Optional)</label>
              <input type="text" className="input" placeholder="22AAAAA0000A1Z5"
                value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} />
            </div>

            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={form.password} onChange={e => update('password', e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password *</label>
              <input type="password" className="input"
                placeholder="Repeat password"
                value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}