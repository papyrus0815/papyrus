import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { centuryShortLabel } from '@/lib/century'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type {
  CenturyFacet,
  CountryFacet,
  DynastyFacet,
  EvalFilter,
  GenderKey,
} from './types'

type Props = {
  filterGenders: Set<GenderKey>
  toggleGender: (g: GenderKey) => void
  filterEval: EvalFilter
  setFilterEval: (v: EvalFilter) => void
  filterCountryIds: Set<string>
  toggleCountry: (id: string) => void
  filterDynastyIds: Set<string>
  toggleDynasty: (id: string) => void
  filterCenturies: Set<number | null>
  toggleCentury: (c: number | null) => void
  countries: CountryFacet[]
  dynasties: DynastyFacet[]
  centuries: CenturyFacet[]
  onReset: () => void
}

export function PersonsFilterPanel({
  filterGenders,
  toggleGender,
  filterEval,
  setFilterEval,
  filterCountryIds,
  toggleCountry,
  filterDynastyIds,
  toggleDynasty,
  filterCenturies,
  toggleCentury,
  countries,
  dynasties,
  centuries,
  onReset,
}: Props) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return (
    <View style={styles.filterPanel}>
      <FilterSection styles={styles} label="성별 (다중 가능)">
        <Chip styles={styles} active={filterGenders.has('MALE')} label="남" onPress={() => toggleGender('MALE')} />
        <Chip styles={styles} active={filterGenders.has('FEMALE')} label="여" onPress={() => toggleGender('FEMALE')} />
      </FilterSection>

      <FilterSection styles={styles} label="평가">
        <Chip styles={styles} active={filterEval === 'all'} label="전체" onPress={() => setFilterEval('all')} />
        <Chip styles={styles} active={filterEval === 'evaluated'} label="평가됨" onPress={() => setFilterEval('evaluated')} />
        <Chip styles={styles} active={filterEval === 'unevaluated'} label="미평가" onPress={() => setFilterEval('unevaluated')} />
      </FilterSection>

      {centuries.length > 1 && (
        <FilterSection styles={styles} label="세기 (다중 가능)" scrollable>
          {centuries.map((c) => (
            <Chip
              key={String(c.century)}
              styles={styles}
              active={filterCenturies.has(c.century)}
              label={centuryShortLabel(c.century)}
              count={c.count}
              onPress={() => toggleCentury(c.century)}
            />
          ))}
        </FilterSection>
      )}

      {countries.length > 0 && (
        <FilterSection styles={styles} label="국가 (다중 가능)" scrollable>
          {countries.map((c) => (
            <Chip
              key={c.id}
              styles={styles}
              active={filterCountryIds.has(c.id)}
              label={`${c.flagEmoji ?? ''} ${c.name}`.trim()}
              count={c.count}
              onPress={() => toggleCountry(c.id)}
            />
          ))}
        </FilterSection>
      )}

      {dynasties.length > 0 && (
        <FilterSection styles={styles} label="가문 (다중 가능)" scrollable>
          {dynasties.map((d) => (
            <Chip
              key={d.id}
              styles={styles}
              active={filterDynastyIds.has(d.id)}
              label={d.name}
              count={d.count}
              onPress={() => toggleDynasty(d.id)}
            />
          ))}
        </FilterSection>
      )}

      <Pressable onPress={onReset} style={styles.resetBtn}>
        <Ionicons name="refresh" size={14} color={t.text.muted} />
        <Text style={styles.resetText}>모든 필터 초기화</Text>
      </Pressable>
    </View>
  )
}

function FilterSection({
  label,
  scrollable,
  children,
  styles,
}: {
  label: string
  scrollable?: boolean
  children: React.ReactNode
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.filterChipsRow}>{children}</View>
      )}
    </View>
  )
}

function Chip({
  active,
  label,
  count,
  onPress,
  styles,
}: {
  active: boolean
  label: string
  count?: number
  onPress: () => void
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count != null && (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      )}
    </Pressable>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    filterPanel: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border.subtle,
      marginTop: Spacing.sm,
    },
    filterSection: { gap: Spacing.xs },
    filterLabel: { ...Type.sectionLabel, fontSize: 10, color: t.text.muted, letterSpacing: 0.4 },
    filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    filterChipsScroll: { gap: Spacing.xs, paddingVertical: 2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    chipActive: { backgroundColor: t.brand.primary, borderColor: t.brand.primary },
    chipPressed: { opacity: 0.7 },
    chipText: { ...Type.captionSm, fontWeight: '600', color: t.text.secondary },
    chipTextActive: { color: t.brand.onPrimary },
    chipCount: { ...Type.badge, fontSize: 10, color: t.text.muted },
    chipCountActive: { color: t.brand.onPrimary, opacity: 0.8 },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-end',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      marginTop: Spacing.xs,
    },
    resetText: { ...Type.captionSm, color: t.text.muted, fontWeight: '600' },
  })
}
