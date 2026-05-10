import { useEffect, useMemo } from 'react'
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Elevation, Radius, Spacing, useTokens, type TokenSet } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'

const SWEEP_DURATION = 1400

type SkeletonProps = {
  width?: DimensionValue
  height?: DimensionValue
  radius?: number
  style?: ViewStyle
}

/**
 * Shimmer 스켈레톤 박스 — 좌→우로 부드럽게 가로지르는 highlight gradient.
 * Reanimated로 워클릿에서 translateX 처리. opacity pulse(이전 패턴)보다 앱 느낌.
 */
export function Skeleton({ width = '100%', height = 16, radius = Radius.xs, style }: SkeletonProps) {
  const t = useTokens()
  const isDark = useColorScheme() === 'dark'
  // 컨테이너 폭을 layout에서 읽어 SharedValue로 전달
  const containerW = useSharedValue(0)
  const phase = useSharedValue(0)

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: SWEEP_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    )
  }, [phase])

  const animStyle = useAnimatedStyle(() => {
    // -W에서 시작해 +W로 sweep. 너비 미측정 시 0으로 보일 뿐 깨지지 않음
    const w = containerW.value || 200
    return {
      transform: [{ translateX: -w + phase.value * w * 2 }],
    }
  })

  const onLayout = (e: LayoutChangeEvent) => {
    containerW.value = e.nativeEvent.layout.width
  }

  // 다크모드는 raised 톤이 base보다 살짝 밝아 그대로 highlight로 사용. 라이트는 흰색에 가까운 raised로.
  const highlight = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'

  return (
    <View
      onLayout={onLayout}
      style={[
        { width, height, borderRadius: radius, backgroundColor: t.surface.pressed, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', highlight, 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  )
}

/** PersonCardRow와 동일한 비율의 사진-우선 스켈레톤. */
export function PersonCardSkeleton() {
  const tokens = useTokens()
  const styles = useMemo(() => makeCardStyles(tokens), [tokens])
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={undefined} radius={0} style={{ aspectRatio: 4 / 3 }} />
      <View style={styles.body}>
        <Skeleton width="60%" height={18} radius={Radius.xs} />
        <Skeleton width="40%" height={12} radius={Radius.xs} style={{ marginTop: Spacing.xs }} />
        <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
          <Skeleton width={56} height={20} radius={Radius.full} />
          <Skeleton width={72} height={20} radius={Radius.full} />
        </View>
      </View>
    </View>
  )
}

/** 가로 카드형 (사건/국가) 스켈레톤. */
export function HorizontalCardSkeleton({ thumbSize = 72 }: { thumbSize?: number } = {}) {
  const tokens = useTokens()
  const styles = useMemo(() => makeHorizontalStyles(tokens), [tokens])
  return (
    <View style={styles.card}>
      <Skeleton width={thumbSize} height={thumbSize} radius={Radius.md} />
      <View style={{ flex: 1, gap: Spacing.xs, justifyContent: 'center' }}>
        <Skeleton width="80%" height={16} radius={Radius.xs} />
        <Skeleton width="60%" height={12} radius={Radius.xs} />
        <Skeleton width="40%" height={12} radius={Radius.xs} />
      </View>
    </View>
  )
}

/** N개 스켈레톤을 리스트처럼 렌더 */
export function SkeletonList({
  count = 6,
  variant = 'horizontal',
  gap = Spacing.sm,
  paddingHorizontal = Spacing.md,
}: {
  count?: number
  variant?: 'horizontal' | 'person-card'
  gap?: number
  paddingHorizontal?: number
}) {
  const Item = variant === 'person-card' ? PersonCardSkeleton : HorizontalCardSkeleton
  return (
    <View style={{ paddingHorizontal, paddingVertical: Spacing.sm, gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </View>
  )
}

function makeCardStyles(t: TokenSet) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      overflow: 'hidden',
      ...Elevation.card,
    },
    body: {
      padding: Spacing.md,
      gap: 4,
    },
  })
}

function makeHorizontalStyles(t: TokenSet) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.md,
      flexDirection: 'row',
      gap: Spacing.md,
      ...Elevation.card,
    },
  })
}
