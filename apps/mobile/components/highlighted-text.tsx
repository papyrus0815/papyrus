import { useMemo } from 'react'
import { Text, type StyleProp, type TextStyle } from 'react-native'
import { useTokens } from '@/constants/theme'

/**
 * query에 일치하는 부분(case-insensitive)을 강조 색으로 표시.
 * 매칭 없으면 plain text 그대로.
 */
export function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: {
  text: string
  query: string
  style?: StyleProp<TextStyle>
  highlightStyle?: StyleProp<TextStyle>
  numberOfLines?: number
}) {
  const tokens = useTokens()
  const defaultHighlight = useMemo<TextStyle>(
    () => ({
      // 노란 형광펜 대신 굵게 + underline — 카드 다수에서 깜빡거리지 않음
      color: tokens.text.primary,
      fontWeight: '800',
      textDecorationLine: 'underline',
    }),
    [tokens],
  )

  const q = query.trim()
  if (!q) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    )
  }
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts: Array<{ text: string; match: boolean }> = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(needle, i)
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false })
      break
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false })
    parts.push({ text: text.slice(idx, idx + needle.length), match: true })
    i = idx + needle.length
  }
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, k) =>
        p.match ? (
          <Text key={k} style={[defaultHighlight, highlightStyle]}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  )
}
