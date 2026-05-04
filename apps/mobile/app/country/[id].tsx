import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { api } from '@/lib/api'
import { DetailRow, DetailSection } from '@/components/detail-section'
import { RelatedLink } from '@/components/related-link'
import { RichText } from '@/components/rich-text'
import { dateRange, formatYMD } from '@/lib/format'
import { imageUrl } from '@/lib/image-url'
import type { CountryDetail } from '@/lib/dto'

export default function CountryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<CountryDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    api
      .get<CountryDetail>(`/historical-countries/${id}`)
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

  const title = data.name ?? `국가 #${data.id}`
  const range = dateRange(data)
  const heroImg = imageUrl(data.thumbnailUrl)

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.root}>
        {heroImg && <Image source={{ uri: heroImg }} style={styles.hero} resizeMode="cover" />}
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
            <RichText html={data.description} />
          </DetailSection>
        )}

        {data.history && (
          <DetailSection title="역사">
            <RichText html={data.history} />
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
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  root: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444' },
  hero: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: '#e2e8f0' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a', paddingHorizontal: 4 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 12, paddingHorizontal: 4 },
  body: { fontSize: 14, color: '#0f172a', lineHeight: 22 },
})
