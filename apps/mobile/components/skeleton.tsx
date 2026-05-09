import { useEffect, useMemo, useRef } from 'react'
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native'
import { Elevation, Radius, Spacing, useTokens, type TokenSet } from '@/constants/theme'

type SkeletonProps = {
  width?: DimensionValue
  height?: DimensionValue
  radius?: number
  style?: ViewStyle
}

/**
 * 펄스 애니메이션 스켈레톤 박스. 로딩 중 컨텐츠 모양을 미리 그려 perceived speed ↑.
 */
export function Skeleton({ width = '100%', height = 16, radius = Radius.xs, style }: SkeletonProps) {
  const tokens = useTokens()
  const opacity = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: tokens.surface.pressed, opacity },
        style,
      ]}
    />
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
