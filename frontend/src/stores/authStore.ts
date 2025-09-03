import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  signup: (userData: { name: string; email: string; password: string }) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<void>
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email: string, password: string) => {
        set({ loading: true })
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Login failed')
          }

          const data = await response.json()
          
          // Store token in localStorage for axios interceptors
          localStorage.setItem('token', data.token)
          
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signup: async (userData: { name: string; email: string; password: string }) => {
        set({ loading: true })
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Signup failed')
          }

          const data = await response.json()
          
          // Store token in localStorage
          localStorage.setItem('token', data.token)
          
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
        })
      },

      updateUser: async (userData: Partial<User>) => {
        const { token, user } = get()
        if (!token || !user) throw new Error('Not authenticated')

        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Update failed')
          }

          const updatedUser = await response.json()
          
          set({
            user: updatedUser.user,
          })
        } catch (error) {
          throw error
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isAuthenticated: false, loading: false })
          return
        }

        set({ loading: true })
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            throw new Error('Token invalid')
          }

          const data = await response.json()
          
          set({
            user: data.user,
            token,
            isAuthenticated: true,
            loading: false,
          })
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          })
        }
      },

      refreshToken: async () => {
        const { token } = get()
        if (!token) throw new Error('No token to refresh')

        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            throw new Error('Token refresh failed')
          }

          const data = await response.json()
          
          // Update token in localStorage
          localStorage.setItem('token', data.token)
          
          set({
            token: data.token,
          })
        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Axios interceptor for automatic token handling
export const setupAxiosInterceptors = () => {
  // Request interceptor to add token
  const requestInterceptor = (config: any) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }

  // Response interceptor to handle token expiry
  const responseInterceptor = async (error: any) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        await useAuthStore.getState().refreshToken()
        // Retry original request with new token
        const token = localStorage.getItem('token')
        originalRequest.headers.Authorization = `Bearer ${token}`
        return fetch(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }

  return { requestInterceptor, responseInterceptor }
}

// Helper function to get auth header
export const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Helper function to make authenticated requests
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (response.status === 401) {
      // Token expired, try to refresh
      try {
        await useAuthStore.getState().refreshToken()
        // Retry with new token
        config.headers = {
          ...config.headers,
          ...getAuthHeader(),
        }
        return await fetch(url, config)
      } catch (refreshError) {
        // Refresh failed, logout and redirect
        useAuthStore.getState().logout()
        window.location.href = '/login'
        throw refreshError
      }
    }
    
    return response
  } catch (error) {
    throw error
  }
}

// Initialize auth check on app start
export const initializeAuth = async () => {
  await useAuthStore.getState().checkAuth()
}
