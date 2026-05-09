import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
  PERSON_TRAIT_META,
  type PersonStats,
  type PersonTraitAssignment,
} from '@/lib/person-stats'
import { DetailSection } from '@/components/detail-section'
import { RichText } from '@/components/rich-text'
import { InfluenceTierBadge } from '@/components/influence-tier-badge'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'

export function PersonStatsCard({
  stats,
  traits,
  influence,
}: {
  stats?: PersonStats | null
  traits?: PersonTraitAssignment[] | null
  influence?: number | null
}) {
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const toneFor = useMemo(
    () => ({
      positive: tokens.state.positive,
      negative: tokens.state.negative,
      neutral: tokens.state.neutral,
    }),
    [tokens],
  )

  const hasAnyStat = stats != null && PERSON_STAT_KEYS.some((k) => stats[k] != null)
  const hasTraits = (traits?.length ?? 0) > 0
  const hasInfluence = influence != null

  if (!hasAnyStat && !hasTraits && !hasInfluence) {
    return (
      <DetailSection title="능력치 · 성격">
        <Text style={styles.empty}>아직 평가가 없습니다</Text>
      </DetailSection>
    )
  }

  return (
    <>
      {(hasAnyStat || hasInfluence) && (
        <DetailSection title="능력치">
          {hasInfluence && (
            <View style={{ marginBottom: 8 }}>
              <View style={styles.influenceHeader}>
                <Text style={styles.influenceLabel}>역사적 영향력</Text>
                <InfluenceTierBadge influence={influence} size="sm" />
              </View>
              <Bar
                styles={styles}
                label="영향력"
                short="INF"
                color={tokens.text.primary}
                value={influence!}
                showHeader={false}
              />
            </View>
          )}
          {hasAnyStat &&
            PERSON_STAT_KEYS.map((key) => {
              const meta = PERSON_STAT_META[key]
              const v = stats![key]
              if (v == null) return null
              return (
                <Bar
                  key={key}
                  styles={styles}
                  label={meta.label}
                  short={meta.short}
                  color={tokens.text.primary}
                  value={v}
                />
              )
            })}
          {stats?.notes && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.notesLabel}>메모</Text>
              <RichText html={stats.notes} />
            </View>
          )}
        </DetailSection>
      )}

      {hasTraits && (
        <DetailSection title="성격">
          <View style={styles.tagWrap}>
            {traits!.map((t) => {
              const meta = PERSON_TRAIT_META[t.trait] ?? { label: t.trait, tone: 'neutral' as const }
              const tone = toneFor[meta.tone]
              return (
                <View key={t.id} style={[styles.tag, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.tagText, { color: tone.fg }]}>{meta.label}</Text>
                  {t.intensity != null && t.intensity !== 1 && (
                    <Text style={[styles.tagIntensity, { color: tone.fg }]}>×{t.intensity}</Text>
                  )}
                </View>
              )
            })}
          </View>
        </DetailSection>
      )}
    </>
  )
}

function Bar({
  styles,
  label,
  color,
  value,
  showHeader = true,
}: {
  styles: ReturnType<typeof makeStyles>
  label: string
  short: string
  color: string
  value: number
  showHeader?: boolean
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <View style={styles.barRow}>
      {showHeader && (
        <View style={styles.barHeader}>
          <Text style={styles.barLabel}>{label}</Text>
          <Text style={styles.barValue}>{value}</Text>
        </View>
      )}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    empty: { ...Type.captionSm, color: t.text.soft },
    barRow: { marginVertical: Spacing.xs },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    barLabel: { ...Type.captionSm, color: t.text.secondary, fontWeight: '500' },
    barValue: { ...Type.captionSm, color: t.text.primary, fontWeight: '700' },
    barBg: { height: 8, borderRadius: 4, backgroundColor: t.surface.pressed, overflow: 'hidden' },
    influenceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    influenceLabel: { ...Type.captionSm, color: t.text.secondary, fontWeight: '600' },
    barFill: { height: '100%', borderRadius: 4 },
    notesLabel: { ...Type.sectionLabel, fontSize: 11, color: t.text.muted, marginBottom: Spacing.xs },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tagText: { ...Type.captionSm, fontWeight: '600' },
    tagIntensity: { ...Type.badge, opacity: 0.7 },
  })
}
