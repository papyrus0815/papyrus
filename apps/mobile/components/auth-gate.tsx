import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const first = segments[0]
    const inLogin = first === 'login'
    if (status === 'signedOut' && !inLogin) {
      router.replace('/login')
    } else if (status === 'signedIn' && inLogin) {
      router.replace('/')
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
