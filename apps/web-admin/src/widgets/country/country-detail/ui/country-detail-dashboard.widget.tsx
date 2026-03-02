/**
 * 국가 상세 대시보드
 * - 헤더(제목 + 국가명)
 * - 탭 메뉴(요약 / 통계)
 * - 핵심 지표, 국가 정보, 그래프
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCountryDashboardStats } from '../model/use-country-dashboard-stats'
import * as S from '@/pages/history/country/country.styles'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { formatRelativeTime } from '../../country-dashboard/relative-time'

const BORDER = '#e2e8f0'
const MUTED = '#64748b'
const TITLE = '#0f172a'
const MAIN = '#6366f1'

/* 레이아웃: 일관된 간격 (24px 패딩, 20px 그리드 갭, 32px 섹션 갭) */
const DASHBOARD_PADDING = 24
const SECTION_GAP = 32
const GRID_GAP = 20
const CARD_PADDING = 24

/* /country 대시보드와 동일한 패딩·간격 */
const DashboardRoot = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 32px 40px 48px;
  gap: 32px;
  background: #ffffff;

  @media (max-width: 1024px) {
    padding: 24px 28px 36px;
    gap: 28px;
  }
  @media (max-width: 768px) {
    padding: 20px 20px 28px;
    gap: 24px;
  }
  @media (max-width: 480px) {
    padding: 16px 16px 24px;
    gap: 20px;
  }
`

/* ---------- 탭 메뉴 (/country 대시보드 톤 유지) ---------- */
const TabBar = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 4px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${GRID_GAP}px;
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
`

const SectionTitleIcon = styled.div`
  width: 20px;
  height: 20px;
  color: ${MAIN};
  display: flex;
  align-items: center;
  justify-content: center;
`

const SectionTitleText = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
`

/* ---------- 카드 그리드 ---------- */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${GRID_GAP}px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const StatCard = styled.div`
  background: #ffffff;
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  padding: ${CARD_PADDING}px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }
`

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: ${MAIN};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StatContent = styled.div`
  min-width: 0;
`

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${MUTED};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.03em;
  line-height: 1.2;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: ${GRID_GAP}px;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`

const InfoCard = styled.div`
  background: #ffffff;
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  padding: 18px ${CARD_PADDING}px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }
`

const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${MUTED};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
  line-height: 1.3;
`

const InfoValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${TITLE};
  line-height: 1.35;
  letter-spacing: -0.01em;
`

const ChartsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${GRID_GAP}px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const ChartBlock = styled.div`
  padding: 20px 22px;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  background: #ffffff;
`

const ChartBlockTitle = styled.h3`
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
`

const ChartEmpty = styled.div`
  padding: 40px 28px;
  text-align: center;
  font-size: 14px;
  color: #94a3b8;
  background: #ffffff;
  border-radius: 12px;
  border: 1px dashed #e8ecf1;
  line-height: 1.5;
`

const EmptyHint = styled.p`
  margin: 0;
  padding: 16px 20px;
  font-size: 14px;
  color: #94a3b8;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  line-height: 1.5;
`

/* 등록 현황 + 하위 역사적 국가 나란히 */
const FeedAndHistoricalRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${GRID_GAP}px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

/* 등록 현황 패널 — /country 대시보드 FeedPanel과 동일 */
const FeedPanel = styled.div`
  background: #ffffff;
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  padding: 20px 22px;
`

const FeedPanelTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.03em;
`

const FeedList = styled.ul`
  margin: 0;
  padding: 0 8px 0 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`

const FeedRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  text-align: left;
  width: 100%;
  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`

const FeedRowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const FeedAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%);
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const FeedLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FeedTime = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

const FeedEmpty = styled.p`
  margin: 0;
  padding: 24px 0;
  text-align: center;
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
`

/* 하위 역사적 국가 리스트 — FeedPanel과 동일 스타일 */
const HistoricalListPanel = styled.div`
  background: #ffffff;
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  padding: 20px 22px;
`

const HistoricalList = styled.ul`
  margin: 0;
  padding: 0 8px 0 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`

const HistoricalListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  text-align: left;
  width: 100%;
  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`

const HistoricalListThumb = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f1f5f9;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const HistoricalListName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${TITLE};
  flex: 1;
  min-width: 0;
  text-align: left;
`

const HistoricalListDate = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: ${MUTED};
  flex-shrink: 0;
`

function formatHistoricalPeriod(h: {
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
}): string {
  const sy = h.startYear != null ? String(h.startYear) : (h.startEra ?? '')
  const ey = h.endYear != null ? String(h.endYear) : (h.endEra ?? '')
  if (sy && ey) return `${sy} ~ ${ey}`
  if (sy) return `${sy}~`
  if (ey) return `~${ey}`
  return ''
}

/** 헤더/피드용 국기 썸네일 (이미지 또는 이모지) */
function HeroFlag({
  thumbnailUrl,
  flagEmoji,
  type,
}: {
  thumbnailUrl?: string | null
  flagEmoji?: string | null
  type: 'modern' | 'historical'
}) {
  const [imgError, setImgError] = React.useState(false)
  const showImg = thumbnailUrl && !imgError
  return (
    <HeroFlagWrap>
      {showImg ? (
        <img
          src={getUploadImageUrl(thumbnailUrl!)}
          alt=""
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{type === 'modern' && flagEmoji ? flagEmoji : '🏛️'}</span>
      )}
    </HeroFlagWrap>
  )
}

const HeroFlagWrap = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #e0f2fe 0%, #e8ecf1 100%);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  @media (max-width: 768px) {
    width: 38px;
    height: 38px;
    font-size: 20px;
  }
`

function formatPopulation(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value
  if (!Number.isFinite(n) || n < 0) return '—'
  return Math.floor(n).toLocaleString('ko-KR')
}

function formatArea(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toLocaleString()} km²`
}

const IconPeople = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconMilitary = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconEvent = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
  </svg>
)
const IconGlobe = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
  </svg>
)
const IconCity = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

const DATA_LABELS = [
  { key: 'person' as const, label: '인물', icon: IconPeople },
  { key: 'military' as const, label: '군대', icon: IconMilitary },
  { key: 'event' as const, label: '주요 사건', icon: IconEvent },
  { key: 'historical' as const, label: '연결된 역사적 국가', icon: IconHistory },
]

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
}

type DashboardTab = 'summary' | 'stats'

export function CountryDetailDashboard({ country }: CountryDetailDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('summary')
  const stats = useCountryDashboardStats(country)
  const isModern = country.type === 'modern'

  const totalRegistered =
    stats.personCount + stats.militaryCount + stats.eventCount + stats.historicalCountryCount
  const getCount = (key: (typeof DATA_LABELS)[number]['key']) => {
    switch (key) {
      case 'person':
        return stats.personCount
      case 'military':
        return stats.militaryCount
      case 'event':
        return stats.eventCount
      case 'historical':
        return stats.historicalCountryCount
    }
  }
  const maxCount = Math.max(
    stats.personCount,
    stats.militaryCount,
    stats.eventCount,
    stats.historicalCountryCount,
    1,
  )
  const percentForBar = (count: number) => (totalRegistered > 0 ? (count / totalRegistered) * 100 : 0)
  const relativeBarPercent = (count: number) => (count / maxCount) * 100

  const popNum =
    country.population != null
      ? typeof country.population === 'string'
        ? Number(country.population.replace(/,/g, ''))
        : Number(country.population)
      : null
  const areaNum = country.areaSqKm != null ? Number(country.areaSqKm) : null
  const density =
    popNum != null && areaNum != null && areaNum > 0 && Number.isFinite(popNum) && Number.isFinite(areaNum)
      ? (popNum / areaNum).toFixed(1)
      : null

  const displayName = country.fullName && country.fullName.trim() ? `${country.name} (${country.fullName})` : country.name

  const navigate = useNavigate()

  return (
    <DashboardRoot>
      {/* 헤더: 국기 썸네일 + 제목 */}
      <S.GlobalDashboardHero>
        <S.HeroContent>
          <HeroFlag
            thumbnailUrl={country.thumbnailUrl}
            flagEmoji={country.flagEmoji}
            type={country.type}
          />
          <S.HeroTextGroup>
            <S.HeroTitle>대시보드</S.HeroTitle>
            <S.HeroSubtitle>{displayName}</S.HeroSubtitle>
          </S.HeroTextGroup>
        </S.HeroContent>
      </S.GlobalDashboardHero>

      {/* 탭 메뉴 */}
      <TabBar role="tablist" aria-label="대시보드 보기 전환">
        <TabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          $active={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
        >
          요약
        </TabButton>
        <TabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'stats'}
          $active={activeTab === 'stats'}
          onClick={() => setActiveTab('stats')}
        >
          통계
        </TabButton>
      </TabBar>

      {activeTab === 'summary' && (
        <>
          {/* 국가 정보 (현대 국가) — 요약 탭에서만 */}
          {isModern && (
            <Section>
              <SectionTitleRow>
                <SectionTitleIcon><IconGlobe /></SectionTitleIcon>
                <SectionTitleText>국가 정보</SectionTitleText>
              </SectionTitleRow>
              <InfoGrid>
                <InfoCard>
                  <InfoLabel>인구</InfoLabel>
                  <InfoValue>{formatPopulation(country.population)}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>면적</InfoLabel>
                  <InfoValue>{formatArea(country.areaSqKm)}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>수도</InfoLabel>
                  <InfoValue>{(country.capital && String(country.capital).trim()) || '—'}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>인구 밀도</InfoLabel>
                  <InfoValue>{density != null ? `${density} 명/km²` : '—'}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>ISO 코드</InfoLabel>
                  <InfoValue>{(country.isoCode && String(country.isoCode).trim()) || '—'}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>현지어 명칭</InfoLabel>
                  <InfoValue>{(country.localName && String(country.localName).trim()) || '—'}</InfoValue>
                </InfoCard>
              </InfoGrid>
            </Section>
          )}

          {/* 핵심 지표 — 요약 탭에서만 */}
          <Section>
            <SectionTitleRow>
              <SectionTitleIcon><IconChart /></SectionTitleIcon>
              <SectionTitleText>핵심 지표</SectionTitleText>
            </SectionTitleRow>
            <StatsGrid>
              <StatCard>
                <StatIcon><IconPeople /></StatIcon>
                <StatContent>
                  <StatLabel>인물</StatLabel>
                  <StatValue>
                    {stats.isLoading ? '—' : stats.personCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>명</span>
                  </StatValue>
                </StatContent>
              </StatCard>
              <StatCard>
                <StatIcon><IconMilitary /></StatIcon>
                <StatContent>
                  <StatLabel>군대</StatLabel>
                  <StatValue>
                    {stats.isLoading ? '—' : stats.militaryCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>개</span>
                  </StatValue>
                </StatContent>
              </StatCard>
              <StatCard>
                <StatIcon><IconEvent /></StatIcon>
                <StatContent>
                  <StatLabel>주요 사건</StatLabel>
                  <StatValue>
                    {stats.isLoading ? '—' : stats.eventCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>건</span>
                  </StatValue>
                </StatContent>
              </StatCard>
              <StatCard>
                <StatIcon><IconHistory /></StatIcon>
                <StatContent>
                  <StatLabel>연결된 역사적 국가</StatLabel>
                  <StatValue>
                    {stats.historicalCountryCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>개</span>
                  </StatValue>
                </StatContent>
              </StatCard>
              <StatCard>
                <StatIcon><IconBuilding /></StatIcon>
                <StatContent>
                  <StatLabel>행정조직</StatLabel>
                  <StatValue>
                    {stats.isLoading ? '—' : stats.administrationCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>개</span>
                  </StatValue>
                </StatContent>
              </StatCard>
              <StatCard>
                <StatIcon><IconCity /></StatIcon>
                <StatContent>
                  <StatLabel>지역(도시)</StatLabel>
                  <StatValue>
                    {stats.isLoading ? '—' : stats.cityCount}
                    <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: MUTED }}>개</span>
                  </StatValue>
                </StatContent>
              </StatCard>
            </StatsGrid>
            {totalRegistered === 0 && !stats.isLoading && (
              <EmptyHint>
                등록된 인물·군대·사건·연결된 역사적 국가가 없습니다. 각 탭에서 데이터를 등록하면 여기에 집계됩니다.
              </EmptyHint>
            )}
          </Section>

          {/* 등록 현황 (최근 등록 인물) + 하위 역사적 국가 리스트 */}
          <Section>
            <SectionTitleRow>
              <SectionTitleIcon><IconPeople /></SectionTitleIcon>
              <SectionTitleText>등록 현황</SectionTitleText>
            </SectionTitleRow>
            <FeedAndHistoricalRow>
              <FeedPanel>
                <FeedPanelTitle>최근 등록 인물</FeedPanelTitle>
                {stats.recentPersons.length === 0 && !stats.isLoading ? (
                  <FeedEmpty>이 국가로 등록된 최근 인물이 없습니다.</FeedEmpty>
                ) : (
                  <FeedList>
                    {stats.recentPersons.map((p) => (
                      <li key={p.id}>
                        <FeedRow
                          as="button"
                          type="button"
                          onClick={() => navigate(pathKeys.persons.detail(p.id))}
                        >
                          <FeedRowLeft>
                            <FeedAvatar>
                              {p.profileImageUrl ? (
                                <img src={getUploadImageUrl(p.profileImageUrl)} alt="" />
                              ) : (
                                <span>👤</span>
                              )}
                            </FeedAvatar>
                            <FeedLabel>{p.displayName}</FeedLabel>
                          </FeedRowLeft>
                          <FeedTime>{formatRelativeTime(p.createdAt)}</FeedTime>
                        </FeedRow>
                      </li>
                    ))}
                  </FeedList>
                )}
              </FeedPanel>
              {country.type === 'modern' && (
                <HistoricalListPanel>
                  <FeedPanelTitle>하위 역사적 국가</FeedPanelTitle>
                  {!country.historicalCountries?.length ? (
                    <FeedEmpty>연결된 역사적 국가가 없습니다.</FeedEmpty>
                  ) : (
                    <HistoricalList>
                      {(country.historicalCountries ?? []).map((h) => (
                        <li key={h.id}>
                          <HistoricalListItem
                            as="button"
                            type="button"
                            onClick={() => navigate(pathKeys.history.countryDetail(h.id))}
                          >
                            <HistoricalListThumb>
                              {(h as { thumbnailUrl?: string | null }).thumbnailUrl ? (
                                <img
                                  src={getUploadImageUrl((h as { thumbnailUrl: string }).thumbnailUrl)}
                                  alt=""
                                />
                              ) : (
                                <span>🏛️</span>
                              )}
                            </HistoricalListThumb>
                            <HistoricalListName>{h.name}</HistoricalListName>
                            {formatHistoricalPeriod(h) && (
                              <HistoricalListDate>{formatHistoricalPeriod(h)}</HistoricalListDate>
                            )}
                          </HistoricalListItem>
                        </li>
                      ))}
                    </HistoricalList>
                  )}
                </HistoricalListPanel>
              )}
            </FeedAndHistoricalRow>
          </Section>
        </>
      )}

      {activeTab === 'stats' && (
        <Section>
          <SectionTitleRow>
            <SectionTitleIcon><IconChart /></SectionTitleIcon>
            <SectionTitleText>등록 데이터 통계</SectionTitleText>
          </SectionTitleRow>
          {totalRegistered === 0 && !stats.isLoading ? (
            <ChartEmpty>
              등록된 데이터가 없습니다. 인물·군대·사건·연결된 역사적 국가를 등록하면 그래프에 반영됩니다.
            </ChartEmpty>
          ) : (
            <ChartsRow>
              <ChartBlock>
                <ChartBlockTitle>구성 비율</ChartBlockTitle>
                <S.BarChartList>
                  {DATA_LABELS.map(({ key, label }) => {
                    const count = getCount(key)
                    const pct = percentForBar(count)
                    return (
                      <S.BarChartRow key={key}>
                        <S.BarChartLabel>{label}</S.BarChartLabel>
                        <S.BarChartTrack>
                          <S.BarChartFill $percent={pct} />
                        </S.BarChartTrack>
                        <S.BarChartValue>
                          {stats.isLoading ? '—' : `${count} (${pct.toFixed(0)}%)`}
                        </S.BarChartValue>
                      </S.BarChartRow>
                    )
                  })}
                </S.BarChartList>
              </ChartBlock>
              <ChartBlock>
                <ChartBlockTitle>규모 비교</ChartBlockTitle>
                <S.BarChartList>
                  {DATA_LABELS.map(({ key, label }) => {
                    const count = getCount(key)
                    const pct = relativeBarPercent(count)
                    return (
                      <S.BarChartRow key={key}>
                        <S.BarChartLabel>{label}</S.BarChartLabel>
                        <S.BarChartTrack>
                          <S.BarChartFill $percent={pct} />
                        </S.BarChartTrack>
                        <S.BarChartValue>{count}</S.BarChartValue>
                      </S.BarChartRow>
                    )
                  })}
                </S.BarChartList>
              </ChartBlock>
            </ChartsRow>
          )}
        </Section>
      )}
    </DashboardRoot>
  )
}
