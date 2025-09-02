import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import { useAuthStore } from '@/stores/authStore'

const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore()

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="auth-layout">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default AuthLayout
