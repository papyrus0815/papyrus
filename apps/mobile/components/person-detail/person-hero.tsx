import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import RAnimated, { type SharedValue } from 'react-native-reanimated'
import { AppImage } from '@/components/app-image'
import { InitialAvatar } from '@/components/initial-avatar'
import { FamilyBadges } from '@/components/family-badges'
import { RegnalTitleRow } from '@/components/regnal-title-row'
import { KpiStrip, type KpiEntry } from '@/components/kpi-strip'
import { useHeroAnimatedStyle } from '@/hooks/use-hero-parallax'
import { lifespanYears, totalReignAndTenureYears } from '@/lib/age-utils'
import { Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { PersonDetail, PersonListItem } from '@/lib/dto'

function genderLabel(g?: string | null): string {
  if (!g) return '-'
  const k = g.toUpperCase()
  if (k === 'MALE' || k === 'M') return '남'
  if (k === 'FEMALE' || k === 'F') return '여'
  return g
}

export function PersonHero({
  title,
  subTitle,
  profileImg,
  headerSource,
  detail,
  scrollY,
}: {
  title: string
  subTitle: string
  profileImg: string | null
  headerSource: PersonDetail | PersonListItem | null
  detail: PersonDetail | null
  scrollY: SharedValue<number>
}) {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const heroStyle = useHeroAnimatedStyle(scrollY)

  const kpiItems = useMemo<KpiEntry[]>(() => {
    if (!detail) return []
    const list: KpiEntry[] = []
    // 영향력 — Apple Health 스타일: 큰 숫자 + progress bar
    if (detail.influence != null) {
      list.push({
        key: 'influence',
        label: '영향력',
        value: detail.influence,
        progress: detail.influence,
        progressColor: t.brand.primary,
      })
    }
    if (detail.country?.name) list.push({ key: 'country', label: '국가', value: detail.country.name })
    if (detail.gender) list.push({ key: 'gender', label: '성별', value: genderLabel(detail.gender) })
    const span = lifespanYears(detail)
    if (span != null && span > 0) {
      list.push({
        key: 'lifespan',
        label: '생존',
        value: detail.isAlive ? `${span}년 (생존)` : `${span}년`,
      })
    }
    const totalReign = totalReignAndTenureYears(detail)
    if (totalReign != null) {
      list.push({ key: 'reign', label: '재임·재위', value: `약 ${totalReign}년` })
    }
    if (detail.dynasty?.name) list.push({ key: 'dynasty', label: '가문', value: detail.dynasty.name })
    if (detail.religion?.name) list.push({ key: 'religion', label: '종교', value: detail.religion.name })
    return list
  }, [detail, t.brand.primary])

  return (
    <View>
      <RAnimated.View style={[styles.header, heroStyle]}>
        <AppImage
          uri={profileImg}
          style={styles.avatar}
          fallback={
            <InitialAvatar
              seed={headerSource?.id ?? title}
              initial={title.slice(0, 1)}
              fontSize={36}
              style={styles.avatar}
            />
          }
        />
        <View style={styles.headerBody}>
          <View style={styles.titleRow}>
            <Text style={styles.heading} numberOfLines={2}>
              {title}
            </Text>
            {!!headerSource?.country?.flagEmoji && (
              <Text style={styles.flag}>{headerSource.country.flagEmoji}</Text>
            )}
          </View>
          {!!subTitle && <Text style={styles.subheading}>{subTitle}</Text>}
          {!!headerSource?.country?.name && (
            <Text style={styles.subheading}>{headerSource.country.name}</Text>
          )}
          {detail && <FamilyBadges data={detail} />}
        </View>
      </RAnimated.View>
      {detail && (
        <View style={styles.regnalWrap}>
          <RegnalTitleRow
            regnalName={detail.regnalName}
            regnalNumber={(detail.sovereignReigns ?? [])[0]?.regnalNumber ?? null}
            templeName={detail.templeName}
            posthumousName={detail.posthumousName}
          />
        </View>
      )}
      {kpiItems.length > 0 && <KpiStrip items={kpiItems} />}
    </View>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      gap: Spacing.md,
      alignItems: 'center',
      padding: Spacing.base,
      backgroundColor: t.surface.raised,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    headerBody: { flex: 1 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: t.border.subtle },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heading: { ...Type.displayLg, color: t.text.primary, flexShrink: 1 },
    flag: { fontSize: 18 },
    subheading: { ...Type.captionSm, color: t.text.muted, marginTop: 4 },
    regnalWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, backgroundColor: t.surface.raised },
  })
}
