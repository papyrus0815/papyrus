import { useMemo } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { FontFamily, Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

/** 큰 제목이 작아지기 시작하는 스크롤 임계점 → cross-fade 끝나는 임계점 */
const COLLAPSE_DISTANCE = 60
/** 큰 제목 슬롯 기본 높이 (displayXl 36 lineHeight + subtitle 22 + padding) */
const BIG_HEIGHT = 76
/** 인라인 슬롯 기본 높이 (titleMd 22 + padding) */
const INLINE_HEIGHT = 44

type SearchProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

type Props = {
  title: string
  subtitle?: string
  right?: React.ReactNode
  /** 부모 ScrollView/FlatList의 scrollY. 주어지면 큰 제목이 스크롤에 따라 cross-fade. */
  scrollY?: SharedValue<number>
  /** 검색바 통합 — 주어지면 헤더 안에 검색바 렌더 */
  search?: SearchProps
  /** 검색바 아래 슬롯 (history chips 등) */
  bottomSlot?: React.ReactNode
}

/**
 * iOS large-title 헤더.
 *  - 큰 제목 슬롯: scrollY 따라 fade-out + height 축소 (76→44)
 *  - 인라인 제목: scrollY 따라 fade-in (작은 가운데 정렬 제목)
 *  - 하단 hairline divider: 스크롤된 상태 시각 신호
 *  - search/bottomSlot은 항상 표시 (검색바 sticky)
 */
export function PageHeader({ title, subtitle, right, scrollY, search, bottomSlot }: Props) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])

  const animSlot = useAnimatedStyle(() => {
    if (!scrollY) return { height: BIG_HEIGHT }
    const p = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], 'clamp')
    return { height: BIG_HEIGHT - (BIG_HEIGHT - INLINE_HEIGHT) * p }
  })

  const animBig = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1, transform: [{ translateY: 0 }] }
    const p = interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.7], [1, 0], 'clamp')
    return { opacity: p, transform: [{ translateY: (1 - p) * -8 }] }
  })

  const animInline = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0, transform: [{ translateY: 6 }] }
    const p = interpolate(
      scrollY.value,
      [COLLAPSE_DISTANCE * 0.4, COLLAPSE_DISTANCE],
      [0, 1],
      'clamp',
    )
    return { opacity: p, transform: [{ translateY: (1 - p) * 6 }] }
  })

  const animHairline = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 }
    const p = interpolate(
      scrollY.value,
      [COLLAPSE_DISTANCE * 0.5, COLLAPSE_DISTANCE],
      [0, 1],
      'clamp',
    )
    return { opacity: p }
  })

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Animated.View style={[styles.titleSlot, animSlot]}>
        {/* 큰 제목 블록 — fade-out */}
        <Animated.View style={[styles.bigBlock, animBig]}>
          <Animated.Text style={styles.bigTitle} numberOfLines={1} allowFontScaling={false}>
            {title}
          </Animated.Text>
          {subtitle ? (
            <Animated.Text style={styles.bigSubtitle} numberOfLines={1}>
              {subtitle}
            </Animated.Text>
          ) : null}
        </Animated.View>

        {/* 인라인 제목 — fade-in (가운데 정렬) */}
        <Animated.View style={[styles.inlineBlock, animInline]} pointerEvents="none">
          <Animated.Text style={styles.inlineTitle} numberOfLines={1} allowFontScaling={false}>
            {title}
          </Animated.Text>
        </Animated.View>

        {/* 우측 액션 — 항상 보임, top-right 고정 */}
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </Animated.View>

      {search ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={t.text.soft} />
          <TextInput
            style={styles.searchInput}
            value={search.value}
            onChangeText={search.onChange}
            placeholder={search.placeholder ?? '검색'}
            placeholderTextColor={t.text.soft}
            selectionColor={t.brand.primary}
            cursorColor={t.brand.primary}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}
      {bottomSlot}

      {/* 하단 hairline — 스크롤된 상태 시각 신호 */}
      <Animated.View style={[styles.hairline, animHairline]} pointerEvents="none" />
    </SafeAreaView>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    safe: { backgroundColor: t.surface.canvas },
    titleSlot: {
      position: 'relative',
      paddingHorizontal: Spacing.base,
      justifyContent: 'flex-end',
      paddingBottom: Spacing.xs,
    },
    bigBlock: {
      // 자연 흐름. 큰 제목 + 부제. fade-out 시 위로 살짝 translate.
      flexShrink: 1,
      // 우측 액션(absolute)과 겹치지 않게 여유. 액션 width(40) + gap(8).
      paddingRight: 48,
    },
    bigTitle: { ...Type.displayXl, color: t.text.primary },
    bigSubtitle: { ...Type.bodySm, color: t.text.muted, marginTop: 2 },
    // 인라인 제목 — 슬롯 전체에 absolute, 가운데 정렬
    inlineBlock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: INLINE_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineTitle: { ...Type.titleMd, color: t.text.primary, fontWeight: '700' },
    // 우측 액션은 항상 우상단 고정
    rightSlot: {
      position: 'absolute',
      right: Spacing.base,
      bottom: Spacing.xs + 2,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface.raised,
      borderRadius: Radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
    },
    searchInput: {
      fontFamily: FontFamily.regular,
      flex: 1,
      fontSize: 15,
      color: t.text.primary,
      paddingVertical: 0,
    },
    hairline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border.subtle,
    },
  })
}
