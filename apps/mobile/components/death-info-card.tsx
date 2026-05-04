import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RichText } from './rich-text'
import { formatYMD, placeText } from '@/lib/format'
import { Tokens } from '@/constants/theme'
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
        <Ionicons name="alert-circle-outline" size={18} color={Tokens.text.danger} />
        <Text style={styles.title}>사망 정보</Text>
        {typeLabel && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        )}
      </View>
      {dateLabel && <MetaRow label="일자" value={dateLabel} />}
      {place && <MetaRow label="장소" value={place} />}
      {data.deathCause && <MetaRow label="원인" value={data.deathCause} />}
      {data.deathNote && (
        <View style={{ marginTop: 6 }}>
          <RichText html={data.deathNote} />
        </View>
      )}
    </View>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
    gap: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '700', color: '#991b1b', flex: 1 },
  typeBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 11, color: '#991b1b', fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2 },
  metaLabel: { width: 60, fontSize: 12, color: '#991b1b', fontWeight: '600' },
  metaValue: { flex: 1, fontSize: 13, color: '#7f1d1d' },
})
