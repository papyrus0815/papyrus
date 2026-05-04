import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { api } from '@/lib/api'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { formatDateString } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import type { EventDetail } from '@/lib/dto'

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<EventDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    api
      .get<EventDetail>(`/events/${id}`)
      .then((res) => {
        if (!cancel) setData(res.data)
      })
      .catch((err) => {
        if (!cancel) setError(err?.response?.data?.message ?? err?.message ?? 'failed to load')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [id])

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

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.root}>
        {heroImg && <Image source={{ uri: heroImg }} style={styles.hero} resizeMode="cover" />}
        <Text style={styles.heading}>{title}</Text>

        <DetailSection title="기본">
          <DetailRow label="기간" value={period} />
          <DetailRow label="장소" value={data.location} />
          <DetailRow label="분류" value={data.category?.name ?? data.categoryId} />
        </DetailSection>

        {data.description && (
          <DetailSection title="개요">
            <RichText html={data.description} />
          </DetailSection>
        )}

        {data.background && (
          <DetailSection title="배경">
            <RichText html={data.background} />
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
                  <Image source={{ uri: url }} style={styles.galleryImg} resizeMode="cover" />
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
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  root: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444' },
  hero: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12, backgroundColor: '#e2e8f0' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 12, paddingHorizontal: 4 },
  body: { fontSize: 14, color: '#0f172a', lineHeight: 22 },
  galleryImg: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#e2e8f0' },
  caption: { fontSize: 13, color: '#0f172a', marginTop: 4 },
  captionMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyword: { fontSize: 12, color: '#0369a1', backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  relatedNote: { fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 4, marginLeft: 8, fontStyle: 'italic' },
})
