import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import {
  STATE_TYPE_LABELS,
  STATE_TYPE_COLORS,
  STATE_TYPE_EMOJIS,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_COLORS,
  ENTITY_KIND_EMOJIS,
  type HistoricalEntityKind,
} from '@/entities/historical-country/model/constants'
import styled from 'styled-components'

interface HistoricalCountryDashboardProps {
  countries: HistoricalCountry[]
}

export function HistoricalCountryDashboard({
  countries,
}: HistoricalCountryDashboardProps) {
  // 통계 계산
  const stats = useMemo(() => {
    const total = countries.length

    // 국가 형태별 통계
    const byStateType: Record<string, number> = {}
    // 정치체 성격별 통계 (국가/정권/시대)
    const byEntityKind: Record<string, number> = { _null: 0 }
    let withDuration = 0
    let totalDuration = 0

    countries.forEach((country) => {
      byStateType[country.stateType] = (byStateType[country.stateType] || 0) + 1
      const ek = (country as { entityKind?: HistoricalEntityKind | null }).entityKind ?? '_null'
      byEntityKind[ek] = (byEntityKind[ek] || 0) + 1

      // Era 기반 날짜로 존속 기간 계산
      if (
        country.startEra &&
        country.startYear &&
        country.endEra &&
        country.endYear
      ) {
        withDuration++
        // BC는 음수로, AD는 양수로 변환
        const startYearValue =
          country.startEra === 'BC' ? -country.startYear : country.startYear
        const endYearValue =
          country.endEra === 'BC' ? -country.endYear : country.endYear
        const duration = endYearValue - startYearValue
        totalDuration += duration
      }
    })

    const avgDuration =
      withDuration > 0 ? Math.round(totalDuration / withDuration) : 0

    // 가장 많은 형태
    const mostCommonType = Object.entries(byStateType).sort(
      (a, b) => b[1] - a[1],
    )[0]

    return {
      total,
      byStateType,
      byEntityKind,
      avgDuration,
      mostCommonType: mostCommonType
        ? {
            type: mostCommonType[0],
            count: mostCommonType[1],
          }
        : null,
    }
  }, [countries])

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Title>📚 역사적 국가 통계</Title>

      {/* 주요 메트릭 */}
      <MetricsGrid>
        <MetricCard
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ borderLeft: '4px solid #6366f1' }}
        >
          <MetricEmoji>🏛️</MetricEmoji>
          <MetricValue>{stats.total}</MetricValue>
          <MetricLabel>전체 국가 수</MetricLabel>
        </MetricCard>

        <MetricCard
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ borderLeft: '4px solid #8b5cf6' }}
        >
          <MetricEmoji>
            {stats.mostCommonType
              ? STATE_TYPE_EMOJIS[
                  stats.mostCommonType.type as keyof typeof STATE_TYPE_EMOJIS
                ]
              : '🏴'}
          </MetricEmoji>
          <MetricValue>{stats.mostCommonType?.count || 0}</MetricValue>
          <MetricLabel>
            {stats.mostCommonType
              ? STATE_TYPE_LABELS[
                  stats.mostCommonType.type as keyof typeof STATE_TYPE_LABELS
                ]
              : '없음'}
          </MetricLabel>
        </MetricCard>

        <MetricCard
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ borderLeft: '4px solid #10b981' }}
        >
          <MetricEmoji>⏳</MetricEmoji>
          <MetricValue>{stats.avgDuration}</MetricValue>
          <MetricLabel>평균 존속 기간 (년)</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      {/* 정치체 성격별 분포 (국가/정권/시대) */}
      {(stats.byEntityKind['STATE'] || stats.byEntityKind['REGIME'] || stats.byEntityKind['PERIOD'] || stats.byEntityKind['_null']) && (
        <Section>
          <SectionTitle>정치체 성격별 분포</SectionTitle>
          <StateTypeGrid>
            {(['STATE', 'REGIME', 'PERIOD'] as const).map((kind) => {
              const count = stats.byEntityKind[kind] || 0
              if (count === 0) return null
              const label = ENTITY_KIND_LABELS[kind]
              const color = ENTITY_KIND_COLORS[kind]
              const emoji = ENTITY_KIND_EMOJIS[kind]
              const percentage = ((count / stats.total) * 100).toFixed(1)
              return (
                <StateTypeCard key={kind} whileHover={{ scale: 1.03, y: -2 }} style={{ borderLeftColor: color }}>
                  <StateTypeEmoji>{emoji}</StateTypeEmoji>
                  <StateTypeInfo>
                    <StateTypeLabel>{label}</StateTypeLabel>
                    <StateTypeStats>
                      <StateTypeCount style={{ color }}>{count}개</StateTypeCount>
                      <StateTypePercentage>({percentage}%)</StateTypePercentage>
                    </StateTypeStats>
                  </StateTypeInfo>
                </StateTypeCard>
              )
            })}
            {(stats.byEntityKind['_null'] ?? 0) > 0 && (
              <StateTypeCard whileHover={{ scale: 1.03, y: -2 }} style={{ borderLeftColor: '#6b7280' }}>
                <StateTypeEmoji>🏛️</StateTypeEmoji>
                <StateTypeInfo>
                  <StateTypeLabel>미지정 (과거 주권 국가)</StateTypeLabel>
                  <StateTypeStats>
                    <StateTypeCount style={{ color: '#6b7280' }}>{stats.byEntityKind['_null']}개</StateTypeCount>
                    <StateTypePercentage>({((stats.byEntityKind['_null'] / stats.total) * 100).toFixed(1)}%)</StateTypePercentage>
                  </StateTypeStats>
                </StateTypeInfo>
              </StateTypeCard>
            )}
          </StateTypeGrid>
        </Section>
      )}

      {/* 국가 형태별 분포 */}
      <Section>
        <SectionTitle>국가 형태별 분포</SectionTitle>
        <StateTypeGrid>
          {Object.entries(stats.byStateType).map(([type, count]) => {
            const label =
              STATE_TYPE_LABELS[type as keyof typeof STATE_TYPE_LABELS]
            const color =
              STATE_TYPE_COLORS[type as keyof typeof STATE_TYPE_COLORS]
            const emoji =
              STATE_TYPE_EMOJIS[type as keyof typeof STATE_TYPE_EMOJIS]
            const percentage = ((count / stats.total) * 100).toFixed(1)

            return (
              <StateTypeCard
                key={type}
                whileHover={{ scale: 1.03, y: -2 }}
                style={{ borderLeftColor: color }}
              >
                <StateTypeEmoji>{emoji}</StateTypeEmoji>
                <StateTypeInfo>
                  <StateTypeLabel>{label}</StateTypeLabel>
                  <StateTypeStats>
                    <StateTypeCount style={{ color }}>{count}개</StateTypeCount>
                    <StateTypePercentage>({percentage}%)</StateTypePercentage>
                  </StateTypeStats>
                </StateTypeInfo>
              </StateTypeCard>
            )
          })}
        </StateTypeGrid>
      </Section>
    </Container>
  )
}

// Styled Components
const Container = styled(motion.div)`
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(to bottom, #f9fafb, #ffffff);
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 24px;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`

const MetricCard = styled(motion.div)`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const MetricEmoji = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`

const MetricValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`

const MetricLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
`

const Section = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
`

const StateTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
`

const StateTypeCard = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #6b7280;
`

const StateTypeEmoji = styled.div`
  font-size: 32px;
  margin-right: 16px;
`

const StateTypeInfo = styled.div`
  flex: 1;
`

const StateTypeLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`

const StateTypeStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const StateTypeCount = styled.span`
  font-size: 16px;
  font-weight: 700;
`

const StateTypePercentage = styled.span`
  font-size: 12px;
  color: #6b7280;
`
