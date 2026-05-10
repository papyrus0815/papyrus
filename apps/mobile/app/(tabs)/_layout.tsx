import { Tabs } from 'expo-router'
import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

import { HapticTab } from '@/components/haptic-tab'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useTokens } from '@/constants/theme'

type IoniconName = keyof typeof Ionicons.glyphMap

function makeTabIcon(active: IoniconName, inactive: IoniconName) {
  return function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />
  }
}

export default function TabLayout() {
  const tokens = useTokens()
  const isDark = useColorScheme() === 'dark'
  // iOS는 absolute + BlurView로 컨텐츠가 탭 바 뒤로 스크롤 (네이티브 앱 느낌)
  // Android는 솔리드 유지 (Material 패턴 + 인셋 자동 처리 복잡도 회피)
  const isIOS = Platform.OS === 'ios'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: tokens.brand.primary,
        tabBarInactiveTintColor: tokens.text.muted,
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={80}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarStyle: isIOS
          ? {
              position: 'absolute',
              backgroundColor: 'transparent',
              borderTopColor: tokens.border.subtle,
              borderTopWidth: StyleSheet.hairlineWidth,
            }
          : {
              backgroundColor: tokens.surface.raised,
              borderTopColor: tokens.border.subtle,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: tokens.surface.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '사건', tabBarIcon: makeTabIcon('time', 'time-outline') }}
      />
      <Tabs.Screen
        name="persons"
        options={{ title: '인물', tabBarIcon: makeTabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="countries"
        options={{ title: '국가', tabBarIcon: makeTabIcon('flag', 'flag-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: makeTabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  )
}
