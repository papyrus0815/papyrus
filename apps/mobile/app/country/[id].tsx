import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import RAnimated from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AppImage } from '@/components/app-image'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { ExpandableText } from '@/components/expandable-text'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { useHeroAnimatedStyle, useHeroParallax } from '@/hooks/use-hero-parallax'
import { dateRange, formatYMD } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { errorMessage } from '@/lib/error'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { CountryDetail } from '@/lib/dto'

export default function CountryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const { scrollY, onScroll } = useHeroParallax()
  const heroStyle = useHeroAnimatedStyle(scrollY)

  const detailQuery = useQuery({
    queryKey: ['countries', 'detail', id],
    queryFn: async ({ signal }) => {
      const res = await api.get<CountryDetail>(`/historical-countries/${id}`, { signal })
      return res.data
    },
    enabled: !!id,
  })

  const data = detailQuery.data ?? null
  const error = detailQuery.error ? errorMessage(detailQuery.error) : null

  if (detailQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '데이터 없음'}</Text>
        <Pressable
          onPress={() => void detailQuery.refetch()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
        >
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </Pressable>
      </View>
    )
  }

  const title = data.name ?? `국가 #${data.id}`
  const range = dateRange(data)
  const heroImg = imageUrl(data.thumbnailUrl)

  return (
    <>
      <Stack.Screen options={{ title }} />
      <RAnimated.ScrollView
        contentContainerStyle={styles.root}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {heroImg && (
          <RAnimated.View style={heroStyle}>
            <AppImage
              uri={heroImg}
              style={styles.hero}
              fallback={<Ionicons name="flag-outline" size={48} color={tokens.text.soft} />}
            />
          </RAnimated.View>
        )}
        <Text style={styles.heading}>{title}</Text>
        {!!data.enName && <Text style={styles.subheading}>{data.enName}</Text>}

        <DetailSection title="기본">
          <DetailRow label="국가 유형" value={data.stateType} />
          <DetailRow label="정치체 성격" value={data.entityKind} />
          <DetailRow label="존속 기간" value={range} />
          <DetailRow label="시작" value={formatYMD(data.startEra, data.startYear, data.startMonth, data.startDay)} />
          <DetailRow label="종료" value={formatYMD(data.endEra, data.endYear, data.endMonth, data.endDay)} />
        </DetailSection>

        {data.nameOrigin && (
          <DetailSection title="국명 어원">
            <RichText html={data.nameOrigin} />
          </DetailSection>
        )}

        {data.description && (
          <DetailSection title="개요">
            <ExpandableText collapsedLines={6}>
              <RichText html={data.description} />
            </ExpandableText>
          </DetailSection>
        )}

        {data.history && (
          <DetailSection title="역사">
            <ExpandableText collapsedLines={8}>
              <RichText html={data.history} />
            </ExpandableText>
          </DetailSection>
        )}

        {data.parentHistoricalCountryIds?.length ? (
          <DetailSection title="상위 역사 국가">
            {data.parentHistoricalCountryIds.map((pid) => (
              <RelatedLink key={pid} kind="country" id={pid} label={`#${pid.slice(0, 8)}…`} />
            ))}
          </DetailSection>
        ) : null}

        {data.transitionEventType && (
          <DetailSection title="변천">
            <DetailRow label="유형" value={data.transitionEventType} />
          </DetailSection>
        )}
      </RAnimated.ScrollView>
    </>
  )
}

function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    root: { padding: Spacing.md, backgroundColor: t.surface.canvas, flexGrow: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: t.surface.canvas },
    errorText: { color: t.text.danger, textAlign: 'center' },
    retryBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      backgroundColor: t.surface.raised,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: t.border.subtle,
      minHeight: 48,
      justifyContent: 'center',
    },
    retryBtnPressed: { backgroundColor: t.surface.pressed },
    retryBtnText: { fontSize: 14, color: t.text.primary, fontWeight: '600' },
    hero: { width: '100%', height: 220, borderRadius: Radius.md, marginBottom: Spacing.md, backgroundColor: t.border.subtle },
    heading: { ...Type.displayLg, color: t.text.primary, paddingHorizontal: 4 },
    subheading: { ...Type.bodySm, color: t.text.muted, marginBottom: Spacing.md, paddingHorizontal: 4 },
  })
}
