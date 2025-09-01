import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Dashboard from '@/pages/Dashboard'
import Editor from '@/pages/Editor'
import AuthLayout from '@/components/layouts/AuthLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

function App() {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/auth/*" element={<AuthLayout />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:projectId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </div>
  )
}

export default App
