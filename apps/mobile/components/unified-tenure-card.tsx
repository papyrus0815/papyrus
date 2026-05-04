import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { RichText } from './rich-text'
import { formatDateString } from '@/lib/format'
import { Tokens } from '@/constants/theme'
import type { GovernmentPosition, PersonDetail, SovereignReign } from '@/lib/dto'

type Item =
  | { kind: 'reign'; data: SovereignReign }
  | { kind: 'tenure'; data: GovernmentPosition }

function startMs(item: Item): number {
  const s = item.data.startDate
  if (!s) return -Infinity
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? -Infinity : t
}

export function UnifiedTenureCardList({ data }: { data: PersonDetail }) {
  const items = useMemo<Item[]>(() => {
    const list: Item[] = []
    for (const r of data.sovereignReigns ?? []) list.push({ kind: 'reign', data: r })
    for (const g of data.governmentPositions ?? []) list.push({ kind: 'tenure', data: g })
    list.sort((a, b) => startMs(b) - startMs(a))
    return list
  }, [data])

  if (!items.length) return null

  return (
    <View style={{ gap: 8 }}>
      {items.map((it, i) => (
        <UnifiedCard key={`${it.kind}-${it.data.id ?? i}`} item={it} />
      ))}
    </View>
  )
}

function UnifiedCard({ item }: { item: Item }) {
  const isReign = item.kind === 'reign'
  if (isReign) {
    const r = item.data as SovereignReign
    const country = r.country?.name ?? r.historicalCountry?.name
    const start = formatDateString(r.startDate) ?? '?'
    const end = r.endDate ? formatDateString(r.endDate) : '재위 중'
    return (
      <View style={[styles.card, styles.cardReign]}>
        <View style={styles.topRow}>
          <KindBadge kind="reign" />
          <Text style={styles.title} numberOfLines={2}>
            {r.regnalName ?? country ?? '재위'}
            {r.regnalNumber != null ? <Text style={styles.ordinal}> · {r.regnalNumber}대</Text> : null}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {country && <Chip text={country} />}
          <Chip text={`${start} ~ ${end}`} muted />
        </View>
        {r.notes ? (
          <View style={styles.notes}>
            <RichText html={r.notes} />
          </View>
        ) : null}
      </View>
    )
  }
  const g = item.data as GovernmentPosition
  const country = g.country?.name ?? g.historicalCountry?.name
  const position =
    g.positionDefinition?.name ??
    g.positionDefinition?.title ??
    g.positionName ??
    g.title ??
    g.position?.name ??
    '직책 미지정'
  const start = formatDateString(g.startDate, g.startDatePrecision) ?? '?'
  const end = g.endDate ? formatDateString(g.endDate, g.endDatePrecision) ?? '?' : '재임 중'
  return (
    <View style={[styles.card, styles.cardTenure]}>
      <View style={styles.topRow}>
        <KindBadge kind="tenure" />
        <Text style={styles.title} numberOfLines={2}>{position}</Text>
      </View>
      <View style={styles.metaRow}>
        {country && <Chip text={country} />}
        <Chip text={`${start} ~ ${end}`} muted />
      </View>
      {g.notes ? (
        <View style={styles.notes}>
          <RichText html={g.notes} />
        </View>
      ) : null}
    </View>
  )
}

function KindBadge({ kind }: { kind: 'reign' | 'tenure' }) {
  const isReign = kind === 'reign'
  return (
    <View style={[styles.kindBadge, isReign ? styles.kindReign : styles.kindTenure]}>
      <Text style={[styles.kindText, isReign ? styles.kindReignText : styles.kindTenureText]}>
        {isReign ? '재위' : '재임'}
      </Text>
    </View>
  )
}

function Chip({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <View style={[styles.chip, muted && styles.chipMuted]}>
      <Text style={[styles.chipText, muted && styles.chipTextMuted]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
    borderLeftWidth: 4,
    gap: 8,
  },
  cardReign: { borderLeftColor: Tokens.accent.amber },
  cardTenure: { borderLeftColor: Tokens.accent.blue },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: Tokens.text.primary },
  ordinal: { fontWeight: '500', color: Tokens.text.muted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  notes: { marginTop: 4 },
  kindBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  kindReign: { backgroundColor: '#fef3c7' },
  kindTenure: { backgroundColor: '#dbeafe' },
  kindText: { fontSize: 11, fontWeight: '700' },
  kindReignText: { color: '#92400e' },
  kindTenureText: { color: '#1e40af' },
  chip: {
    backgroundColor: Tokens.surface.canvas,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  chipMuted: { backgroundColor: 'transparent', borderColor: 'transparent' },
  chipText: { fontSize: 11, color: Tokens.text.secondary, fontWeight: '500' },
  chipTextMuted: { color: Tokens.text.muted },
})
