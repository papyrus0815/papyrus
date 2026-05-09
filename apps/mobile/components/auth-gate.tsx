import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { goHome, goLogin } from '@/lib/routes'

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const first = segments[0]
    const inLogin = first === 'login'
    if (status === 'signedOut' && !inLogin) {
      goLogin(router)
    } else if (status === 'signedIn' && inLogin) {
      goHome(router)
    }
  }, [status, segments, router])

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <>{children}</>
}
