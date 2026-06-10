import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// WebView 셸 — 화면 로직은 web-admin 한 곳에서만 관리.
// 네이티브는 web-admin을 띄우는 얇은 컨테이너 역할만 한다.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  )
}
