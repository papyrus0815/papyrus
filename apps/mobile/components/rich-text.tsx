import { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'
import RenderHTML, {
  defaultSystemFonts,
  type MixedStyleDeclaration,
  type MixedStyleRecord,
} from 'react-native-render-html'
import { FontFamily, useTokens, type TokenSet } from '@/constants/theme'

const baseFontSize = 14
const baseLineHeight = 22

// RenderHTML이 fontFamily를 검증할 때 인식하도록 Inter 패밀리들을 등록
const systemFonts = [
  ...defaultSystemFonts,
  FontFamily.regular,
  FontFamily.medium,
  FontFamily.semibold,
  FontFamily.bold,
]

const renderersProps = {
  a: { onPress: () => {} },
}

/** HTML 또는 일반 텍스트 본문 렌더. 빈 문자열/null이면 아무것도 안 그림 */
export function RichText({ html, color }: { html?: string | null; color?: string }) {
  const { width } = useWindowDimensions()
  const tokens = useTokens()
  const tagsStyles = useMemo<MixedStyleRecord>(() => makeTagsStyles(tokens), [tokens])
  const source = useMemo(() => ({ html: html ?? '' }), [html])
  const baseStyle = useMemo<MixedStyleDeclaration>(
    () => ({
      color: color ?? tokens.text.primary,
      fontSize: baseFontSize,
      lineHeight: baseLineHeight,
      fontFamily: FontFamily.regular,
    }),
    [color, tokens],
  )

  if (!html || !html.trim()) return null

  return (
    <View>
      <RenderHTML
        contentWidth={width - 56}
        source={source}
        baseStyle={baseStyle}
        tagsStyles={tagsStyles}
        systemFonts={systemFonts}
        renderersProps={renderersProps}
        defaultTextProps={{ selectable: true }}
      />
    </View>
  )
}

function makeTagsStyles(t: TokenSet): MixedStyleRecord {
  return {
    body: { color: t.text.primary, fontSize: baseFontSize, lineHeight: baseLineHeight, fontFamily: FontFamily.regular },
    p: { marginVertical: 6, lineHeight: baseLineHeight, fontFamily: FontFamily.regular },
    h1: { fontSize: 20, fontFamily: FontFamily.bold, marginVertical: 10 },
    h2: { fontSize: 18, fontFamily: FontFamily.bold, marginVertical: 8 },
    h3: { fontSize: 16, fontFamily: FontFamily.semibold, marginVertical: 6 },
    h4: { fontSize: 15, fontFamily: FontFamily.semibold, marginVertical: 6 },
    strong: { fontFamily: FontFamily.bold },
    b: { fontFamily: FontFamily.bold },
    em: { fontStyle: 'italic' },
    i: { fontStyle: 'italic' },
    ul: { marginVertical: 6 },
    ol: { marginVertical: 6 },
    li: { marginVertical: 2 },
    blockquote: {
      backgroundColor: t.surface.pressed,
      borderLeftWidth: 3,
      borderLeftColor: t.text.soft,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginVertical: 6,
      fontStyle: 'italic',
    },
    code: {
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    pre: {
      backgroundColor: t.text.primary,
      color: t.surface.canvas,
      padding: 10,
      borderRadius: 6,
      marginVertical: 6,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    a: { color: t.text.primary, textDecorationLine: 'underline' },
    hr: { borderTopWidth: 1, borderTopColor: t.border.subtle, marginVertical: 8 },
    table: { borderWidth: 1, borderColor: t.border.subtle, marginVertical: 6 },
    th: { backgroundColor: t.surface.pressed, padding: 6, fontWeight: '600' },
    td: { padding: 6, borderTopWidth: 1, borderTopColor: t.border.subtle },
  }
}
