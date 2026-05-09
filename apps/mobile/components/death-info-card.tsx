import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RichText } from './rich-text'
import { formatYMD, placeText } from '@/lib/format'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { PersonDetail } from '@/lib/dto'

const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  ILLNESS: '병사',
  SUICIDE: '자결',
  UNKNOWN: '미상',
  OTHER: '기타',
}

function deathTypeLabel(type?: string | null) {
  if (!type) return null
  return DEATH_TYPE_LABELS[type] ?? type
}

export function DeathInfoCard({ data }: { data: PersonDetail }) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])

  if (data.isAlive) return null
  const dateLabel = data.isDeathDateUnknown
    ? '미상'
    : formatYMD(data.deathEra, data.deathYear, data.deathMonth, data.deathDay)
  const place = placeText({
    city: data.deathCity,
    adminDivision: data.deathAdminDivision,
    placeText: data.deathPlaceText,
  })
  const typeLabel = deathTypeLabel(data.deathType)
  const hasMeta = dateLabel || place || typeLabel || data.deathCause || data.deathNote
  if (!hasMeta) return null

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="alert-circle-outline" size={18} color={tokens.state.negative.fg} />
        <Text style={styles.title}>사망 정보</Text>
        {typeLabel && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        )}
      </View>
      {dateLabel && <MetaRow styles={styles} label="일자" value={dateLabel} />}
      {place && <MetaRow styles={styles} label="장소" value={place} />}
      {data.deathCause && <MetaRow styles={styles} label="원인" value={data.deathCause} />}
      {data.deathNote && (
        <View style={{ marginTop: 6 }}>
          <RichText html={data.deathNote} />
        </View>
      )}
    </View>
  )
}

function MetaRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>
  label: string
  value: string
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    // 빨간 카드 → 회색 카드. 위험 신호는 헤더 아이콘만 danger 색으로.
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border.subtle,
      marginBottom: Spacing.md,
      gap: 4,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
    title: { ...Type.sectionLabel, color: t.text.muted, flex: 1 },
    typeBadge: {
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.xs,
    },
    typeBadgeText: { ...Type.badge, color: t.text.secondary },
    metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 2 },
    metaLabel: { ...Type.captionSm, width: 60, color: t.text.muted, fontWeight: '600' },
    metaValue: { ...Type.bodySm, flex: 1, color: t.text.primary },
  })
}
