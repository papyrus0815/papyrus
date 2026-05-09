import { Tabs } from 'expo-router'
import React from 'react'
import { StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { HapticTab } from '@/components/haptic-tab'
import { useTokens } from '@/constants/theme'

export default function TabLayout() {
  const tokens = useTokens()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: tokens.text.primary,
        tabBarInactiveTintColor: tokens.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.surface.raised,
          borderTopColor: tokens.border.subtle,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        sceneStyle: { backgroundColor: tokens.surface.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '사건',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="persons"
        options={{
          title: '인물',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="countries"
        options={{
          title: '국가',
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
