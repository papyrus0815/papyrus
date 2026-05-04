import { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html'

const baseFontSize = 14

const tagsStyles = {
  body: { color: '#0f172a', fontSize: baseFontSize, lineHeight: 22 } as any,
  p: { marginVertical: 6, lineHeight: 22 } as any,
  h1: { fontSize: 20, fontWeight: '700', marginVertical: 10 } as any,
  h2: { fontSize: 18, fontWeight: '700', marginVertical: 8 } as any,
  h3: { fontSize: 16, fontWeight: '600', marginVertical: 6 } as any,
  h4: { fontSize: 15, fontWeight: '600', marginVertical: 6 } as any,
  strong: { fontWeight: '700' } as any,
  b: { fontWeight: '700' } as any,
  em: { fontStyle: 'italic' } as any,
  i: { fontStyle: 'italic' } as any,
  ul: { marginVertical: 6 } as any,
  ol: { marginVertical: 6 } as any,
  li: { marginVertical: 2 } as any,
  blockquote: {
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 3,
    borderLeftColor: '#94a3b8',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginVertical: 6,
    fontStyle: 'italic',
  } as any,
  code: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 13,
  } as any,
  pre: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
    fontFamily: 'monospace',
    fontSize: 13,
  } as any,
  a: { color: '#0369a1', textDecorationLine: 'underline' } as any,
  hr: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginVertical: 8 } as any,
  table: { borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 6 } as any,
  th: { backgroundColor: '#f1f5f9', padding: 6, fontWeight: '600' } as any,
  td: { padding: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' } as any,
}

const systemFonts = [...defaultSystemFonts]

const renderersProps = {
  a: { onPress: () => {} },
}

/** HTML 또는 일반 텍스트 본문 렌더. 빈 문자열/null이면 아무것도 안 그림 */
export function RichText({ html, color }: { html?: string | null; color?: string }) {
  const { width } = useWindowDimensions()
  const source = useMemo(() => ({ html: html ?? '' }), [html])
  const baseStyle = useMemo(
    () => ({ color: color ?? '#0f172a', fontSize: baseFontSize, lineHeight: 22 }),
    [color],
  )

  if (!html || !html.trim()) return null

  return (
    <View>
      <RenderHTML
        contentWidth={width - 56}
        source={source}
        baseStyle={baseStyle as any}
        tagsStyles={tagsStyles}
        systemFonts={systemFonts}
        renderersProps={renderersProps}
        defaultTextProps={{ selectable: true }}
      />
    </View>
  )
}
