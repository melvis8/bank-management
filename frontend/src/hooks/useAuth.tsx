import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { getToken, setToken, setUnauthorizedHandler } from '@/api/client'
import { queryClient } from '@/lib/queryClient'
import { getErrorMessage } from '@/lib/errors'
import type { AuthUser, LoginPayload } from '@/types'

const USER_STORAGE_KEY = 'bms.user'

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoggingIn: boolean
  loginError: string | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => (getToken() ? readStoredUser() : null))
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    setUser(null)
    queryClient.clear()
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoggingIn(true)
    setLoginError(null)
    try {
      const { token, user: loggedInUser } = await authApi.login(payload)
      setToken(token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser))
      setUser(loggedInUser)
    } catch (error) {
      setLoginError(getErrorMessage(error))
      throw error
    } finally {
      setIsLoggingIn(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      isLoggingIn,
      loginError,
      login,
      logout,
    }),
    [user, isLoggingIn, loginError, login, logout]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
