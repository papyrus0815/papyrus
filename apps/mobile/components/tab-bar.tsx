import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export type TabItem = { key: string; label: string; badge?: number | null }

type TabLayout = { x: number; width: number }

export function TabBar({
  tabs,
  active,
  onChange,
  transparent = false,
}: {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  /** 외곽에서 BlurView 등으로 감쌀 때 자체 배경/보더를 제거 */
  transparent?: boolean
}) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({})
  const indicatorX = useSharedValue(0)
  const indicatorW = useSharedValue(0)
  // ScrollView ref — active 탭이 화면 밖일 때 자동 스크롤
  const scrollRef = useRef<ScrollView>(null)

  // 탭 레이아웃 또는 active 변경 시 인디케이터 위치 갱신
  useEffect(() => {
    const layout = layouts[active]
    if (!layout) return
    indicatorX.value = withSpring(layout.x, { damping: 22, stiffness: 220 })
    indicatorW.value = withSpring(layout.width, { damping: 22, stiffness: 220 })
    // 활성 탭이 ScrollView 밖이면 보이도록 스크롤
    scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 40), animated: true })
  }, [active, layouts, indicatorX, indicatorW])

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }))

  const handleTabLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    setLayouts((prev) => {
      const cur = prev[key]
      if (cur && cur.x === x && cur.width === width) return prev
      return { ...prev, [key]: { x, width } }
    })
  }

  return (
    <View style={[styles.wrap, transparent && styles.wrapTransparent]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {tabs.map((t) => {
          const isActive = active === t.key
          return (
            <Pressable
              key={t.key}
              onLayout={handleTabLayout(t.key)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
              onPress={() => onChange(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t.label}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
              {t.badge != null && t.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
        {/* sliding underline */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { backgroundColor: tokens.brand.primary },
            indicatorStyle,
          ]}
        />
      </ScrollView>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: t.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    wrapTransparent: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
    },
    scroll: { paddingHorizontal: Spacing.sm, gap: 4, position: 'relative' },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    tabPressed: { opacity: 0.7 },
    label: { ...Type.buttonSm, color: t.text.muted },
    labelActive: { ...Type.titleSm, color: t.text.primary, fontWeight: '700' },
    badge: {
      backgroundColor: t.surface.pressed,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
    },
    badgeText: { ...Type.badge, color: t.text.secondary },
    indicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 3,
      borderRadius: 2,
    },
  })
}
