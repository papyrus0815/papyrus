import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { RichText } from './rich-text'
import { formatDateString } from '@/lib/format'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
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
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
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
        <UnifiedCard key={`${it.kind}-${it.data.id ?? i}`} item={it} styles={styles} />
      ))}
    </View>
  )
}

function UnifiedCard({
  item,
  styles,
}: {
  item: Item
  styles: ReturnType<typeof makeStyles>
}) {
  const isReign = item.kind === 'reign'
  if (isReign) {
    const r = item.data as SovereignReign
    const country = r.country?.name ?? r.historicalCountry?.name
    const start = formatDateString(r.startDate) ?? '?'
    const end = r.endDate ? formatDateString(r.endDate) : '재위 중'
    return (
      <View style={[styles.card, styles.cardReign]}>
        <View style={styles.topRow}>
          <KindBadge kind="reign" styles={styles} />
          <Text style={styles.title} numberOfLines={2}>
            {r.regnalName ?? country ?? '재위'}
            {r.regnalNumber != null ? <Text style={styles.ordinal}> · {r.regnalNumber}대</Text> : null}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {country && <Chip text={country} styles={styles} />}
          <Chip text={`${start} ~ ${end}`} muted styles={styles} />
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
        <KindBadge kind="tenure" styles={styles} />
        <Text style={styles.title} numberOfLines={2}>{position}</Text>
      </View>
      <View style={styles.metaRow}>
        {country && <Chip text={country} styles={styles} />}
        <Chip text={`${start} ~ ${end}`} muted styles={styles} />
      </View>
      {g.notes ? (
        <View style={styles.notes}>
          <RichText html={g.notes} />
        </View>
      ) : null}
    </View>
  )
}

function KindBadge({
  kind,
  styles,
}: {
  kind: 'reign' | 'tenure'
  styles: ReturnType<typeof makeStyles>
}) {
  const isReign = kind === 'reign'
  return (
    <View style={[styles.kindBadge, isReign ? styles.kindReign : styles.kindTenure]}>
      <Text style={[styles.kindText, isReign ? styles.kindReignText : styles.kindTenureText]}>
        {isReign ? '재위' : '재임'}
      </Text>
    </View>
  )
}

function Chip({
  text,
  muted,
  styles,
}: {
  text: string
  muted?: boolean
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={[styles.chip, muted && styles.chipMuted]}>
      <Text style={[styles.chipText, muted && styles.chipTextMuted]}>{text}</Text>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      borderLeftWidth: 4,
      gap: Spacing.sm,
    },
    // 재위 카드: 좌측 두꺼운 brand 액센트 바 + 약한 캔버스 톤
    cardReign: { borderLeftColor: t.brand.primary, borderLeftWidth: 5, backgroundColor: t.surface.canvas },
    // 재임 카드: 약한 회색 좌측 바
    cardTenure: { borderLeftColor: t.border.subtle },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    title: { ...Type.titleSm, flex: 1, fontWeight: '700', color: t.text.primary },
    ordinal: { ...Type.captionSm, fontWeight: '500', color: t.text.muted },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    notes: { marginTop: Spacing.xs },
    kindBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.xs },
    kindReign: { backgroundColor: t.brand.primary },
    kindTenure: { backgroundColor: t.surface.pressed },
    kindText: { ...Type.badge },
    kindReignText: { color: t.brand.onPrimary },
    kindTenureText: { color: t.text.secondary },
    chip: {
      backgroundColor: t.surface.canvas,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Radius.xs,
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    chipMuted: { backgroundColor: 'transparent', borderColor: 'transparent' },
    chipText: { ...Type.badge, color: t.text.secondary, fontWeight: '500' },
    chipTextMuted: { color: t.text.muted },
  })
}
