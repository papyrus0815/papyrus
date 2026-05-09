import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

type Props = {
  children: ReactNode
  /** 접혔을 때 보여줄 줄 수 (default 5) */
  collapsedLines?: number
  /** 더보기/접기 라벨 */
  expandLabel?: string
  collapseLabel?: string
  textStyle?: TextStyle
}

/**
 * 긴 컨텐츠(생애·사건 본문)를 접고 펼치는 토글.
 *
 * 텍스트가 N줄 미만이면 토글 버튼 숨김.
 * 측정은 펼친 상태와 접힌 상태 두 번에 onLayout으로 비교.
 */
export function ExpandableText({
  children,
  collapsedLines = 5,
  expandLabel = '더 보기',
  collapseLabel = '접기',
  textStyle,
}: Props) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const [expanded, setExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [measured, setMeasured] = useState(false)

  // children이 string이면 numberOfLines 사용 가능. RichText 등 노드면 측정 기반으로 가림.
  const isString = typeof children === 'string'

  const onTextLayout = useCallback(
    (e: { nativeEvent: { lines: { text: string }[] } }) => {
      if (measured) return
      const lineCount = e.nativeEvent.lines.length
      setHasOverflow(lineCount > collapsedLines)
      setMeasured(true)
    },
    [collapsedLines, measured],
  )

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (measured || isString) return
      // RichText 등 비-텍스트 노드: collapsed height vs full height 비교.
      // 단순히 일정 높이 초과면 오버플로 — 보수적으로 collapsedLines * 24px 기준.
      const threshold = collapsedLines * 24
      if (e.nativeEvent.layout.height > threshold) setHasOverflow(true)
      setMeasured(true)
    },
    [collapsedLines, isString, measured],
  )

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    void Haptics.selectionAsync()
    setExpanded((v) => !v)
  }, [])

  if (isString) {
    return (
      <View>
        <Text
          style={textStyle}
          numberOfLines={expanded ? undefined : collapsedLines}
          onTextLayout={onTextLayout}
        >
          {children}
        </Text>
        {hasOverflow && (
          <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button">
            <Text style={styles.toggle}>{expanded ? collapseLabel : expandLabel}</Text>
          </Pressable>
        )}
      </View>
    )
  }

  // 비-텍스트 노드(RichText 등): collapsed 시 maxHeight로 잘라 보여주고 그라데이션 페이드
  const collapsedMaxHeight = collapsedLines * 24
  return (
    <View>
      <View
        style={!expanded && hasOverflow ? { maxHeight: collapsedMaxHeight, overflow: 'hidden' } : undefined}
        onLayout={onContainerLayout}
      >
        {children}
      </View>
      {hasOverflow && (
        <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" style={{ marginTop: Spacing.xs }}>
          <Text style={styles.toggle}>{expanded ? collapseLabel : expandLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    toggle: { ...Type.bodySm, marginTop: Spacing.xs, fontWeight: '600', color: t.brand.primary },
  })
}
