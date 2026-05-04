import { StyleSheet, Text, View } from 'react-native'
import { Tokens } from '@/constants/theme'

export function RegnalTitleRow({
  regnalName,
  regnalNumber,
  templeName,
  posthumousName,
}: {
  regnalName?: string | null
  regnalNumber?: number | null
  templeName?: string | null
  posthumousName?: string | null
}) {
  if (!regnalName && !templeName && !posthumousName) return null
  return (
    <View style={styles.row}>
      <Text style={styles.crown}>♔</Text>
      <View style={{ flex: 1, gap: 2 }}>
        {regnalName ? (
          <Text style={styles.title}>
            {regnalName}
            {regnalNumber != null ? ` (${regnalNumber}대)` : ''}
          </Text>
        ) : null}
        {(templeName || posthumousName) && (
          <Text style={styles.sub} numberOfLines={2}>
            {[templeName ? `묘호 ${templeName}` : null, posthumousName ? `시호 ${posthumousName}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Tokens.surface.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Tokens.surface.highlightBorder,
  },
  crown: { fontSize: 18, color: Tokens.accent.amber },
  title: { fontSize: 14, fontWeight: '700', color: Tokens.accent.amber },
  sub: { fontSize: 12, color: Tokens.text.muted },
})
