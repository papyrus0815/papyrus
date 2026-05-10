import { useCallback, useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { Platform, Text, TextInput, UIManager } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { AuthProvider } from '@/lib/auth-context'
import { AuthGate } from '@/components/auth-gate'
import { ErrorBoundary } from '@/components/error-boundary'
import { FontFamily, useTokens } from '@/constants/theme'
import { queryClient } from '@/lib/query-client'

// 폰트 로드 전까지 네이티브 스플래시를 유지 — 첫 프레임에서 시스템 폰트가 깜빡이는 현상 방지
SplashScreen.preventAutoHideAsync().catch(() => {})

// Android에서 LayoutAnimation 사용 활성화 (필터/정렬 변경 시 부드러운 재배치)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export const unstable_settings = {
  anchor: '(tabs)',
}

// Inter를 모든 Text·TextInput의 기본 폰트로 설정 + 시스템 폰트 확대 상한 (RN 표준 패턴: defaultProps 오버라이드)
// maxFontSizeMultiplier=1.4: 시스템 dynamic type 130~140%까진 허용, 그 이상 확대 시 레이아웃 깨짐 방지
type WithDefaultProps<T> = T & {
  defaultProps?: { style?: unknown; maxFontSizeMultiplier?: number }
}
const TextWithDefaults = Text as WithDefaultProps<typeof Text>
const TextInputWithDefaults = TextInput as WithDefaultProps<typeof TextInput>
TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {}
TextWithDefaults.defaultProps.style = [
  { fontFamily: FontFamily.regular },
  TextWithDefaults.defaultProps.style,
]
TextWithDefaults.defaultProps.maxFontSizeMultiplier =
  TextWithDefaults.defaultProps.maxFontSizeMultiplier ?? 1.4
TextInputWithDefaults.defaultProps = TextInputWithDefaults.defaultProps ?? {}
TextInputWithDefaults.defaultProps.style = [
  { fontFamily: FontFamily.regular },
  TextInputWithDefaults.defaultProps.style,
]
TextInputWithDefaults.defaultProps.maxFontSizeMultiplier =
  TextInputWithDefaults.defaultProps.maxFontSizeMultiplier ?? 1.4

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  // Pretendard — 한글 가독성 + iOS 시스템 폰트와 톤 매치. 키 문자열이 그대로 fontFamily 값으로 사용됨.
  const [fontsLoaded, fontError] = useFonts({
    Pretendard_400Regular: require('pretendard/dist/public/static/alternative/Pretendard-Regular.ttf'),
    Pretendard_500Medium: require('pretendard/dist/public/static/alternative/Pretendard-Medium.ttf'),
    Pretendard_600SemiBold: require('pretendard/dist/public/static/alternative/Pretendard-SemiBold.ttf'),
    Pretendard_700Bold: require('pretendard/dist/public/static/alternative/Pretendard-Bold.ttf'),
  })

  // 폰트가 로드(또는 실패)되면 스플래시 닫기
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    void onLayoutRootView()
  }, [onLayoutRootView])

  if (!fontsLoaded && !fontError) {
    // 네이티브 스플래시가 그대로 유지됨 — 빈 뷰로 자리만 차지
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <BottomSheetModalProvider>
                  <AuthGate>
                    <ThemedStack />
                  </AuthGate>
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                </BottomSheetModalProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function ThemedStack() {
  const Tokens = useTokens()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Tokens.surface.raised },
        headerTintColor: Tokens.text.primary,
        headerTitleStyle: { fontWeight: '700', fontFamily: FontFamily.bold },
        // iOS: chevron만, Android: 자체 back arrow — 한글 라벨 제거로 nav 시각 노이즈 ↓
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Tokens.surface.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* 상세 보기 = drill-down (push). 모달은 작성/편집 폼에만. */}
      <Stack.Screen name="event/[id]" options={{ title: '사건' }} />
      <Stack.Screen name="person/[id]" options={{ title: '인물' }} />
      <Stack.Screen name="country/[id]" options={{ title: '국가' }} />
      <Stack.Screen
        name="event/edit"
        options={{
          title: '사건 등록',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="person/edit"
        options={{
          title: '인물 등록',
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="bookmarks" options={{ title: '즐겨찾기' }} />
    </Stack>
  )
}
