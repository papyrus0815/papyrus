import { useMemo } from 'react'
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import RAnimated from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AppImage } from '@/components/app-image'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { ExpandableText } from '@/components/expandable-text'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { goEventEdit } from '@/lib/routes'
import { useHeroAnimatedStyle, useHeroParallax } from '@/hooks/use-hero-parallax'
import { formatDateString } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import { errorMessage } from '@/lib/error'
import { Radius, Spacing, Type, useTokens, type TokenSet } from '@/constants/theme'
import type { EventDetail } from '@/lib/dto'

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const tokens = useTokens()
  const styles = useMemo(() => makeStyles(tokens), [tokens])
  const { scrollY, onScroll } = useHeroParallax()
  const heroStyle = useHeroAnimatedStyle(scrollY)

  // detail은 react-query 캐시 공유 — 수정 화면(event/edit)이 같은 키로 데이터 즉시 사용
  const detailQuery = useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: async () => {
      const res = await api.get<EventDetail>(`/events/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  const data = detailQuery.data ?? null
  const loading = detailQuery.isLoading
  const error = detailQuery.error ? errorMessage(detailQuery.error) : null
  const load = () => {
    void detailQuery.refetch()
  }

  if (loading) {
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
          onPress={() => load()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
        >
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </Pressable>
      </View>
    )
  }

  const title = data.title ?? `사건 #${data.id}`
  const start = formatDateString(data.startDate, data.startDatePrecision)
  const end = formatDateString(data.endDate, data.endDatePrecision)
  const period = start || end ? `${start ?? '?'} ~ ${end ?? '?'}` : null
  const heroImg = imageUrl(data.thumbnailUrl ?? data.thumbnail)
  const sections = (data.eventSections ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const images = (data.eventImages ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const onShare = () => {
    void Share.share({
      message: [title, period, data.location].filter(Boolean).join(' · '),
    })
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => goEventEdit(router, id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="사건 수정"
                style={({ pressed }) => [styles.headerTextBtn, pressed && styles.headerIconBtnPressed]}
              >
                <Text style={styles.headerTextLabel}>수정</Text>
              </Pressable>
              <Pressable
                onPress={onShare}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="공유"
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              >
                <Ionicons name="share-outline" size={20} color={tokens.text.primary} />
              </Pressable>
            </View>
          ),
        }}
      />
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
              fallback={<Ionicons name="time-outline" size={48} color={tokens.text.soft} />}
            />
          </RAnimated.View>
        )}
        <Text style={styles.heading}>{title}</Text>

        <DetailSection title="기본">
          <DetailRow label="기간" value={period} />
          <DetailRow label="장소" value={data.location} />
          <DetailRow label="분류" value={data.category?.name ?? data.categoryId} />
        </DetailSection>

        {data.description && (
          <DetailSection title="개요">
            <ExpandableText collapsedLines={6}>
              <RichText html={data.description} />
            </ExpandableText>
          </DetailSection>
        )}

        {data.background && (
          <DetailSection title="배경">
            <ExpandableText collapsedLines={6}>
              <RichText html={data.background} />
            </ExpandableText>
          </DetailSection>
        )}

        {sections.map((s) => (
          <DetailSection key={s.id} title={s.title}>
            <RichText html={s.content} />
          </DetailSection>
        ))}

        {data.aftermath && (
          <DetailSection title="여파">
            <RichText html={data.aftermath} />
          </DetailSection>
        )}

        {images.length > 0 && (
          <DetailSection title="이미지">
            {images.map((img) => {
              const url = imageUrl(img.imageUrl)
              if (!url) return null
              return (
                <View key={img.id} style={{ marginBottom: 8 }}>
                  <AppImage
                    uri={url}
                    style={styles.galleryImg}
                    fallback={<Ionicons name="image-outline" size={32} color={tokens.text.soft} />}
                  />
                  {!!img.caption && <Text style={styles.caption}>{img.caption}</Text>}
                  {!!img.source && <Text style={styles.captionMeta}>출처: {img.source}</Text>}
                </View>
              )
            })}
          </DetailSection>
        )}

        {data.keywords?.length ? (
          <DetailSection title="키워드">
            <View style={styles.tagWrap}>
              {data.keywords.map((k, i) => (
                <Text key={i} style={styles.keyword}>#{k}</Text>
              ))}
            </View>
          </DetailSection>
        ) : null}

        {(data.relatedCountries?.length || data.relatedHistoricalCountries?.length) ? (
          <DetailSection title="관련 국가">
            {data.relatedCountries?.map((c) => (
              <RelatedLink
                key={`mc-${c.id}`}
                kind="country"
                id={c.id}
                label={`${c.flagEmoji ? c.flagEmoji + ' ' : ''}${c.name}`}
                sublabel="현대 국가"
              />
            ))}
            {data.relatedHistoricalCountries?.map((c) => (
              <RelatedLink key={`hc-${c.id}`} kind="country" id={c.id} label={c.name} sublabel="역사 국가" />
            ))}
          </DetailSection>
        ) : null}

        {data.relatedPersons?.length ? (
          <DetailSection title="관련 인물">
            {data.relatedPersons.map((rp) => (
              <View key={rp.id} style={{ marginBottom: 6 }}>
                <RelatedLink
                  kind="person"
                  id={rp.personId}
                  label={
                    rp.person
                      ? `${rp.person.surname ?? ''}${rp.person.name}`.trim() || rp.person.name
                      : `인물 #${rp.personId}`
                  }
                  sublabel={rp.role}
                />
                {!!rp.note && <Text style={styles.relatedNote}>{rp.note}</Text>}
              </View>
            ))}
          </DetailSection>
        ) : null}

        {data.parentEvent && (
          <DetailSection title="상위 사건">
            <RelatedLink kind="event" id={data.parentEvent.id} label={data.parentEvent.title ?? '?'} />
          </DetailSection>
        )}

        {data.childEvents?.length ? (
          <DetailSection title="하위 사건">
            {data.childEvents.map((c) => (
              <RelatedLink key={c.id} kind="event" id={c.id} label={c.title ?? '?'} />
            ))}
          </DetailSection>
        ) : null}
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
    heading: { ...Type.displayLg, color: t.text.primary, marginBottom: Spacing.md, paddingHorizontal: 4 },
    galleryImg: { width: '100%', height: 200, borderRadius: Radius.md, backgroundColor: t.border.subtle },
    caption: { fontSize: 13, color: t.text.primary, marginTop: 4 },
    captionMeta: { fontSize: 11, color: t.text.soft, marginTop: 2 },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    keyword: {
      fontSize: 12,
      color: t.text.secondary,
      backgroundColor: t.surface.pressed,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    relatedNote: {
      fontSize: 12,
      color: t.text.secondary,
      lineHeight: 18,
      marginTop: 4,
      marginLeft: 8,
      fontStyle: 'italic',
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 9999,
      backgroundColor: t.surface.pressed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconBtnPressed: { opacity: 0.7 },
    headerTextBtn: {
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 9999,
      backgroundColor: t.surface.pressed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextLabel: { fontSize: 14, fontWeight: '700', color: t.text.primary },
  })
}
