import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, registerUnauthorizedHandler } from './api'
import { clearTokens, getAccessToken, saveTokens } from './auth-storage'

type AuthState = {
  status: 'loading' | 'signedIn' | 'signedOut'
  signIn: (account: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading')

  useEffect(() => {
    getAccessToken().then((t) => setStatus(t ? 'signedIn' : 'signedOut'))
    registerUnauthorizedHandler(() => setStatus('signedOut'))
  }, [])

  const signIn = useCallback(async (account: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', {
      account,
      password,
    })
    await saveTokens(res.data.accessToken, res.data.refreshToken)
    setStatus('signedIn')
  }, [])

  const signOut = useCallback(async () => {
    await clearTokens()
    setStatus('signedOut')
  }, [])

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
