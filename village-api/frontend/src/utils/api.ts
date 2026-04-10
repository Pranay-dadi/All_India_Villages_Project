// src/utils/api.ts
import axios from 'axios'
import { useAuthStore } from '../store/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Plan metadata
export const PLAN_META: Record<string, { label: string; color: string; limit: string; price: string }> = {
  FREE:      { label: 'Free',      color: 'badge-gray',   limit: '5K/day',    price: '$0' },
  PREMIUM:   { label: 'Premium',   color: 'badge-blue',   limit: '50K/day',   price: '$49/mo' },
  PRO:       { label: 'Pro',       color: 'badge-teal',   limit: '300K/day',  price: '$199/mo' },
  UNLIMITED: { label: 'Unlimited', color: 'badge-green',  limit: '1M/day',    price: '$499/mo' },
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE:           { label: 'Active',           color: 'badge-green' },
  PENDING_APPROVAL: { label: 'Pending',          color: 'badge-yellow' },
  SUSPENDED:        { label: 'Suspended',        color: 'badge-red' },
  REJECTED:         { label: 'Rejected',         color: 'badge-gray' },
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}