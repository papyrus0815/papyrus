import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { TimelineKind } from '@/lib/timeline-builder'

export type TimelineGroup = 'self' | 'rule' | 'marriage' | 'life' | 'event' | 'family'

export const TIMELINE_GROUP_KINDS: Record<TimelineGroup, TimelineKind[]> = {
  self: ['ego-birth', 'ego-death'],
  rule: ['reign', 'tenure'],
  marriage: ['marriage'],
  life: ['life-event'],
  event: ['event-participation'],
  family: ['family-birth', 'family-death'],
}

const GROUP_LABEL: Record<TimelineGroup, string> = {
  self: '본인',
  rule: '재위·재임',
  marriage: '혼인',
  life: '생애',
  event: '사건',
  family: '가족',
}

export function kindToGroup(kind: TimelineKind): TimelineGroup {
  for (const [g, kinds] of Object.entries(TIMELINE_GROUP_KINDS)) {
    if ((kinds as TimelineKind[]).includes(kind)) return g as TimelineGroup
  }
  return 'life'
}

export function TimelineFilter({
  available,
  active,
  onToggle,
  onReset,
}: {
  available: Set<TimelineGroup>
  active: Set<TimelineGroup>
  onToggle: (group: TimelineGroup) => void
  onReset: () => void
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const groups = (Object.keys(TIMELINE_GROUP_KINDS) as TimelineGroup[]).filter((g) =>
    available.has(g),
  )
  if (groups.length <= 1) return null
  const allActive = active.size === 0 || groups.every((g) => active.has(g))
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      <Pressable
        onPress={onReset}
        style={({ pressed }) => [styles.chip, allActive && styles.chipActive, pressed && styles.chipPressed]}
      >
        <Text style={[styles.chipText, allActive && styles.chipTextActive]}>전체</Text>
      </Pressable>
      {groups.map((g) => {
        const isActive = !allActive && active.has(g)
        return (
          <Pressable
            key={g}
            onPress={() => onToggle(g)}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{GROUP_LABEL[g]}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    scroll: { marginBottom: Spacing.sm },
    row: { gap: 6, paddingVertical: Spacing.xs },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
      backgroundColor: t.surface.raised,
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    chipActive: { backgroundColor: t.brand.primary, borderColor: t.brand.primary },
    chipPressed: { opacity: 0.7 },
    chipText: { ...Type.captionSm, color: t.text.secondary, fontWeight: '600' },
    chipTextActive: { color: t.brand.onPrimary },
  })
}
