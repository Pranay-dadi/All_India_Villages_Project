// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminLogs from './pages/admin/AdminLogs'
import AdminVillages from './pages/admin/AdminVillages'

// B2B Pages
import B2BLayout from './pages/b2b/B2BLayout'
import B2BDashboard from './pages/b2b/B2BDashboard'
import B2BApiKeys from './pages/b2b/B2BApiKeys'
import B2BUsage from './pages/b2b/B2BUsage'
import B2BDocs from './pages/b2b/B2BDocs'

function PrivateRoute({ children, adminOnly = false }: { children: JSX.Element, adminOnly?: boolean }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && !user?.isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="villages" element={<AdminVillages />} />
        </Route>

        {/* B2B */}
        <Route path="/dashboard" element={<PrivateRoute><B2BLayout /></PrivateRoute>}>
          <Route index element={<B2BDashboard />} />
          <Route path="keys" element={<B2BApiKeys />} />
          <Route path="usage" element={<B2BUsage />} />
          <Route path="docs" element={<B2BDocs />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={
          user?.isAdmin
            ? <Navigate to="/admin" replace />
            : user
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}