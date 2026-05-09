import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RichText } from './rich-text'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { TimelineEntry, TimelineKind } from '@/lib/timeline-builder'

const KIND_LABEL: Record<TimelineKind, string> = {
  'ego-birth': '출생',
  'ego-death': '사망',
  marriage: '혼인',
  reign: '재위',
  tenure: '재임',
  'life-event': '생애',
  'event-participation': '사건',
  'family-birth': '가족',
  'family-death': '가족',
}

type Group = { year: string; items: TimelineEntry[] }

function yearLabel(entry: TimelineEntry): string {
  if (entry.sortKey == null) return '시점 미상'
  const y = Math.trunc(entry.sortKey / 10000)
  return y < 0 ? `BC ${-y}` : `${y}`
}

export function TimelineList({
  entries,
  onPress,
}: {
  entries: TimelineEntry[]
  onPress: (entry: TimelineEntry) => void
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, TimelineEntry[]>()
    const orderedKeys: string[] = []
    for (const e of entries) {
      const key = yearLabel(e)
      if (!map.has(key)) {
        map.set(key, [])
        orderedKeys.push(key)
      }
      map.get(key)!.push(e)
    }
    return orderedKeys.map((y) => ({ year: y, items: map.get(y)! }))
  }, [entries])

  return (
    <View>
      {groups.map((g) => (
        <View key={g.year} style={styles.group}>
          <View style={styles.yearRow}>
            <Text style={styles.yearText}>{g.year}</Text>
            <View style={styles.yearLine} />
            <Text style={styles.yearCount}>{g.items.length}</Text>
          </View>
          <View style={styles.itemsCol}>
            {g.items.map((it, idx) => (
              <Item
                key={it.key}
                entry={it}
                onPress={onPress}
                t={t}
                styles={styles}
                isLast={idx === g.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

function Item({
  entry,
  onPress,
  t,
  styles,
  isLast,
}: {
  entry: TimelineEntry
  onPress: (entry: TimelineEntry) => void
  t: TokenSet
  styles: ReturnType<typeof makeStyles>
  isLast: boolean
}) {
  const dateText =
    entry.endLabel && entry.endLabel !== entry.dateLabel
      ? `${entry.dateLabel} ~ ${entry.endLabel}`
      : entry.dateLabel
  const dotColor = t.timeline[entry.kind]
  const titleText = entry.title?.trim() || '(제목 없음)'
  const a11yLabel = `${KIND_LABEL[entry.kind]}, ${dateText}, ${titleText}`
  const inner = (
    <>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.railLine} />}
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.title} numberOfLines={3}>
          {titleText}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.kindText, { color: dotColor }]}>{KIND_LABEL[entry.kind]}</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.date} numberOfLines={1}>{dateText}</Text>
          {entry.link && (
            <Ionicons name="chevron-forward" size={12} color={t.text.soft} />
          )}
        </View>
        {entry.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {entry.subtitle}
          </Text>
        ) : null}
        {entry.body ? (
          <View style={styles.body}>
            <RichText html={entry.body} />
          </View>
        ) : null}
      </View>
    </>
  )
  if (entry.link) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => onPress(entry)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="자세히 보기"
      >
        {inner}
      </Pressable>
    )
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={a11yLabel}>
      {inner}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    group: { marginBottom: Spacing.lg },
    yearRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    yearText: {
      ...Type.titleMd,
      fontSize: 18,
      lineHeight: 24,
      color: t.text.primary,
      minWidth: 64,
    },
    yearLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border.subtle },
    yearCount: {
      ...Type.badge,
      color: t.text.muted,
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.xs,
      minWidth: 22,
      textAlign: 'center',
    },
    itemsCol: {},
    row: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    rowPressed: { opacity: 0.6 },
    rail: {
      width: 12,
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 6,
    },
    railLine: {
      flex: 1,
      width: 2,
      backgroundColor: t.border.subtle,
      marginTop: 4,
    },
    itemBody: { flex: 1, gap: Spacing.xxs, paddingBottom: Spacing.xs },
    title: { ...Type.titleMd, color: t.text.primary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    kindText: { fontSize: 12, fontWeight: '700' },
    metaSep: { fontSize: 12, color: t.text.soft },
    date: { fontSize: 12, fontWeight: '600', color: t.text.secondary },
    subtitle: { fontSize: 13, color: t.text.muted },
    body: { marginTop: 4 },
  })
}
