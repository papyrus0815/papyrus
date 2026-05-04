import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RichText } from './rich-text'
import { Tokens } from '@/constants/theme'
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

const KIND_ICON: Record<TimelineKind, keyof typeof Ionicons.glyphMap> = {
  'ego-birth': 'sparkles',
  'ego-death': 'flower',
  marriage: 'heart',
  reign: 'ribbon',
  tenure: 'briefcase',
  'life-event': 'bookmark',
  'event-participation': 'flag',
  'family-birth': 'people',
  'family-death': 'people',
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
            {g.items.map((it) => (
              <Item key={it.key} entry={it} onPress={onPress} />
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
}: {
  entry: TimelineEntry
  onPress: (entry: TimelineEntry) => void
}) {
  const dateText =
    entry.endLabel && entry.endLabel !== entry.dateLabel
      ? `${entry.dateLabel} ~ ${entry.endLabel}`
      : entry.dateLabel
  const Wrapper: any = entry.link ? Pressable : View
  return (
    <Wrapper
      style={({ pressed }: { pressed?: boolean }) => [styles.card, pressed && styles.cardPressed]}
      onPress={entry.link ? () => onPress(entry) : undefined}
    >
      <View style={[styles.iconBubble, { backgroundColor: entry.color }]}>
        <Ionicons name={KIND_ICON[entry.kind]} size={14} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.topRow}>
          <View style={[styles.kindChip, { backgroundColor: hexAlpha(entry.color, 0.15) }]}>
            <Text style={[styles.kindChipText, { color: entry.color }]}>{KIND_LABEL[entry.kind]}</Text>
          </View>
          <Text style={styles.date} numberOfLines={1}>{dateText}</Text>
          {entry.link && (
            <Ionicons name="chevron-forward" size={14} color={Tokens.text.soft} />
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>
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
    </Wrapper>
  )
}

/** hex 색상에 알파 적용. #rrggbb만 가정. */
function hexAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
    color: Tokens.text.primary,
    minWidth: 56,
  },
  yearLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Tokens.border.subtle },
  yearCount: {
    fontSize: 11,
    color: Tokens.text.muted,
    fontWeight: '600',
    backgroundColor: Tokens.surface.pressed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    textAlign: 'center',
  },
  itemsCol: { gap: 8 },
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: Tokens.surface.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Tokens.border.subtle,
  },
  cardPressed: { backgroundColor: Tokens.surface.canvas },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  kindChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  kindChipText: { fontSize: 10, fontWeight: '700' },
  date: { flex: 1, fontSize: 12, fontWeight: '600', color: Tokens.text.secondary },
  title: { fontSize: 14, fontWeight: '600', color: Tokens.text.primary },
  subtitle: { fontSize: 12, color: Tokens.text.muted },
  body: { marginTop: 4 },
})
