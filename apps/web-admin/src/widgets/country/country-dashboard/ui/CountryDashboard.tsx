import React from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { type ContinentOption, type Country } from '@/entities/country/api'

/** 전 세계 국가 수 기준 (UN 회원국·옵저버 등 통상 인용치) */
const TOTAL_COUNTRIES_IN_WORLD = 195
/** 전 세계 육지 면적 (km², 통상 인용치) */
const TOTAL_WORLD_AREA_KM2 = 148_940_000
const RANKING_TOP_N = 8
import { getSummaryMetrics } from '@/entities/country/lib/utils'
import { type UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'

import styled from 'styled-components'
import { getUploadImageUrl } from '@/shared/api/upload'
import * as S from '../../../../pages/history/country/country.styles'
import { formatEventPeriod, formatRelativeTime } from '../relative-time'

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
const FeedAvatar = styled.div<{ $type: 'country' | 'person' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: ${(p) =>
    p.$type === 'country'
      ? 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)'
      : 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)'};
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`
const FeedLabelBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`
const FeedCountryChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  flex-shrink: 0;
`
const FeedPrimaryLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  line-height: 1.4;
`
const FeedActionSuffix = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
`
const FeedTime = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
`
const BoardList = styled.ul`
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
const BoardEmpty = styled.p`
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
  padding: 24px 0;
  text-align: center;
  line-height: 1.5;
`
const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`
const ThreeCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`
const FeedPanel = styled.section`
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
const CountryTypeChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  flex-shrink: 0;
`
const EventRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e8ecf1;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: #e2e8f0;
  }
`
const EventLeft = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`
const EventTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const EventCountries = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`
const EventCountryChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 3px 6px;
  border-radius: 5px;
`
const EventTime = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
`
const EventPeriod = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-top: 2px;
`
const EventList = styled.ul`
  margin: 0;
  padding: 0 8px 0 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/** API Country에 gdpUsdBn이 있을 수 있음 */
type CountryWithOptionalGdp = Country & { gdpUsdBn?: number | null }

/** 국기 이미지 또는 이모지 폴백 (이미지 로드 실패 시 이모지 표시) */
function CountryFeedFlag({
  thumbnailUrl,
  flagEmoji,
}: {
  thumbnailUrl?: string | null
  flagEmoji: string
}) {
  const [imgError, setImgError] = React.useState(false)
  const showImg = thumbnailUrl && !imgError
  return (
    <>
      {showImg && (
        <img
          src={getUploadImageUrl(thumbnailUrl!)}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      )}
      {!showImg && <span>{flagEmoji}</span>}
    </>
  )
}

/** 등록 현황 게시판 한 건 — 인물만 (국가 등록은 별도 패널 "국가(현대, 역사적) 등록 현황"에서 표시) */
export type RegistrationFeedItem = {
  date: string
  type: 'person'
  primaryLabel: string
  countryName?: string | null
  profileImageUrl?: string | null
  /** 클릭 시 해당 국가 인물 리스트로 이동용 */
  personId?: string
  countryId?: string | null
}

/** 사건 일주일 내 한 건 */
export type RecentEventItem = {
  id: string
  title: string
  date: string
  countryNames?: string[]
  startDate?: string | null
  endDate?: string | null
}

/** 국가(현대·역사적) 등록 현황 일주일 내 한 건 */
export type CountryRegistrationFeedItem = {
  date: string
  name: string
  type: 'modern' | 'historical'
  /** 국기 이미지 URL (있으면 이미지 표시) */
  thumbnailUrl?: string | null
  /** 현대 국가일 때 이모지 폴백 (예: 🇰🇷) */
  flagEmoji?: string | null
}

interface CountryDashboardProps {
  countries?: Country[]
  filtered?: UnifiedCountry[]
  continents?: ContinentOption[]
  isLoading?: boolean
  onCountryEdit?: (country: Country) => void
  registrationFeed?: RegistrationFeedItem[]
  recentEvents?: RecentEventItem[]
  countryRegistrationFeed?: CountryRegistrationFeedItem[]
  /** 등록 현황에서 인물 카드 클릭 시 (해당 국가 인물 리스트로 이동용) */
  onRegistrationPersonClick?: (item: RegistrationFeedItem) => void
}

export function CountryDashboard({
  countries: countriesProp,
  filtered: filteredProp,
  continents: continentsProp,
  isLoading = false,
  onCountryEdit,
  registrationFeed = [],
  recentEvents = [],
  countryRegistrationFeed = [],
  onRegistrationPersonClick,
}: CountryDashboardProps) {
  const listState = useCountryListState()
  const countries = countriesProp ?? listState.countries
  const filtered = filteredProp ?? listState.filtered
  const continents = continentsProp ?? listState.continents
  const metrics = getSummaryMetrics(countries)

  // Always show Global Dashboard
  return (
    <S.GlobalDashboard>
      {countries.length === 0 ? (
        <S.EmptyGlobalState>
          <S.EmptyGlobalIcon>🌍</S.EmptyGlobalIcon>
          <S.EmptyGlobalTitle>등록된 국가가 없어요</S.EmptyGlobalTitle>
          <S.EmptyGlobalDesc>
            전 세계 통계를 보려면 먼저 국가를 등록해주세요.
            <br />
            왼쪽 목록에서 새 국가를 추가할 수 있습니다.
          </S.EmptyGlobalDesc>
        </S.EmptyGlobalState>
      ) : (
        <>
          <S.GlobalDashboardHero>
            <S.HeroContent>
              <S.HeroIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </S.HeroIcon>
              <S.HeroTextGroup>
                <S.HeroTitle>전 세계 국가 통계</S.HeroTitle>
                <S.HeroSubtitle>
                  {countries.length}개 국가의 데이터를 한눈에 확인하세요
                </S.HeroSubtitle>
              </S.HeroTextGroup>
            </S.HeroContent>
          </S.GlobalDashboardHero>

          {/* Global Metrics */}
          <S.GlobalMetricsGrid>
            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>총 인구</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {(metrics.totalPopulation / 1_000_000_000).toFixed(2)}B
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>
                  {countries.length}개 국가 합계
                </S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </S.GlobalMetricIcon>
                <S.GlobalMetricContent>
                <S.GlobalMetricLabel>등록 면적</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {Math.round(metrics.totalArea).toLocaleString()}
                  <span style={{ margin: '0 2px', color: '#94a3b8', fontWeight: 500 }}>/</span>
                  {TOTAL_WORLD_AREA_KM2.toLocaleString()}
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>
                  km² (전체 육지 면적 대비 — 더 등록하면 채워져요)
                </S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>등록 국가</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {countries.length}
                  <span style={{ margin: '0 2px', color: '#94a3b8', fontWeight: 500 }}>/</span>
                  {TOTAL_COUNTRIES_IN_WORLD}
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>
                  {TOTAL_COUNTRIES_IN_WORLD}개국 중 등록 — 더 등록하면 통계가 풍부해져요
                </S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>평균 인구 밀도</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {metrics.avgDensity.toLocaleString()}
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>명/km²</S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>
          </S.GlobalMetricsGrid>

          {/* 등록 현황 | 사건 | 국가(현대·역사적) 등록 현황 (3열) */}
          <ThreeCol>
            <FeedPanel>
              <FeedPanelTitle>등록 현황</FeedPanelTitle>
              {registrationFeed.length === 0 ? (
                <BoardEmpty>아직 등록된 인물이 없습니다.</BoardEmpty>
              ) : (
                <BoardList>
                  {registrationFeed.map((item, index) => {
                    const isPersonClickable =
                      item.type === 'person' &&
                      item.countryId &&
                      typeof onRegistrationPersonClick === 'function'
                    return (
                      <li key={`${item.date}-${item.type}-${item.personId ?? index}`}>
                        <FeedRow
                          as={isPersonClickable ? 'button' : 'div'}
                          type={isPersonClickable ? 'button' : undefined}
                          onClick={
                            isPersonClickable
                              ? () => onRegistrationPersonClick!(item)
                              : undefined
                          }
                          style={
                            isPersonClickable
                              ? { cursor: 'pointer', textAlign: 'left', width: '100%' }
                              : undefined
                          }
                        >
                          <FeedRowLeft>
                            <FeedAvatar $type="person">
                              {item.profileImageUrl ? (
                                <img src={item.profileImageUrl} alt="" />
                              ) : (
                                <span>👤</span>
                              )}
                            </FeedAvatar>
                            <FeedLabelBlock>
                              {item.countryName && (
                                <FeedCountryChip>{item.countryName}</FeedCountryChip>
                              )}
                              <FeedPrimaryLabel>{item.primaryLabel}</FeedPrimaryLabel>
                              <FeedActionSuffix>등록</FeedActionSuffix>
                            </FeedLabelBlock>
                          </FeedRowLeft>
                          <FeedTime>{formatRelativeTime(item.date)}</FeedTime>
                        </FeedRow>
                      </li>
                    )
                  })}
                </BoardList>
              )}
            </FeedPanel>
            <FeedPanel>
              <FeedPanelTitle>사건</FeedPanelTitle>
              {recentEvents.length === 0 ? (
                <BoardEmpty>최근 일주일 내 사건이 없습니다.</BoardEmpty>
              ) : (
                <EventList>
                  {recentEvents.map((evt) => (
                    <li key={evt.id}>
                      <EventRow>
                        <EventLeft>
                          <EventTitle>{evt.title}</EventTitle>
                          {(evt.startDate != null || evt.endDate != null) && (
                            <EventPeriod>
                              {formatEventPeriod(evt.startDate, evt.endDate)}
                            </EventPeriod>
                          )}
                          {(evt.countryNames?.length ?? 0) > 0 && (
                            <EventCountries>
                              {evt.countryNames!.map((name) => (
                                <EventCountryChip key={name}>{name}</EventCountryChip>
                              ))}
                            </EventCountries>
                          )}
                        </EventLeft>
                        <EventTime>{formatRelativeTime(evt.date)}</EventTime>
                      </EventRow>
                    </li>
                  ))}
                </EventList>
              )}
            </FeedPanel>
            <FeedPanel>
              <FeedPanelTitle>국가(현대, 역사적) 등록 현황</FeedPanelTitle>
              {countryRegistrationFeed.length === 0 ? (
                <BoardEmpty>최근 일주일 내 등록된 국가가 없습니다.</BoardEmpty>
              ) : (
                <BoardList>
                  {countryRegistrationFeed.map((item, index) => (
                    <li key={`${item.date}-${item.type}-${item.name}-${index}`}>
                      <FeedRow>
                        <FeedRowLeft>
                          <FeedAvatar $type="country">
                            <CountryFeedFlag
                              thumbnailUrl={item.thumbnailUrl}
                              flagEmoji={item.type === 'modern' ? (item.flagEmoji || '🌍') : '🏛️'}
                            />
                          </FeedAvatar>
                          <FeedLabelBlock>
                            <CountryTypeChip>{item.type === 'modern' ? '현대' : '역사적'}</CountryTypeChip>
                            <FeedPrimaryLabel>{item.name}</FeedPrimaryLabel>
                            <FeedActionSuffix>등록</FeedActionSuffix>
                          </FeedLabelBlock>
                        </FeedRowLeft>
                        <FeedTime>{formatRelativeTime(item.date)}</FeedTime>
                      </FeedRow>
                    </li>
                  ))}
                </BoardList>
              )}
            </FeedPanel>
          </ThreeCol>

          <S.DashboardSectionTitle>
            <S.SectionTitleIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
              </svg>
            </S.SectionTitleIcon>
            <S.SectionTitleText>상세 통계</S.SectionTitleText>
          </S.DashboardSectionTitle>

          {/* Continent Distribution & Rankings */}
          <S.GlobalDashboardGrid>
            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>대륙별 분포</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
              <S.GlobalWidgetContent>
                <S.BarChartList>
                  {continents.map((continent) => {
                    const count = countries.filter(
                      (country) => country.continentId === continent.id,
                    ).length
                    const percent = countries.length
                      ? (count / countries.length) * 100
                      : 0
                    return (
                      <S.BarChartRow key={continent.id}>
                        <S.BarChartLabel>{continent.name}</S.BarChartLabel>
                        <S.BarChartTrack>
                          <S.BarChartFill $percent={percent} />
                        </S.BarChartTrack>
                        <S.BarChartValue>
                          {count}개국 ({percent.toFixed(1)}%)
                        </S.BarChartValue>
                      </S.BarChartRow>
                    )
                  })}
                </S.BarChartList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>

            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>인구 상위 국가</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
                <S.GlobalWidgetContent>
                <S.BarChartList>
                  {(() => {
                    const totalPop = countries.reduce(
                      (sum, c) => sum + (Number(c.population) || 0),
                      0,
                    )
                    return [...countries]
                      .sort(
                        (a, b) =>
                          (Number(b.population) || 0) -
                          (Number(a.population) || 0),
                      )
                      .slice(0, RANKING_TOP_N)
                      .map((country, index) => {
                        const rank = index + 1
                        const pop = Number(country.population) || 0
                        const percent = totalPop > 0 ? (pop / totalPop) * 100 : 0
                        return (
                          <S.BarChartRow key={country.id}>
                            <S.BarChartRank $rank={rank}>{rank}</S.BarChartRank>
                            <S.BarChartLabel>
                              {country.flagEmoji} {country.name}
                            </S.BarChartLabel>
                            <S.BarChartTrack>
                              <S.BarChartFill
                                $percent={percent}
                                $rank={rank <= 3 ? (rank as 1 | 2 | 3) : undefined}
                              />
                            </S.BarChartTrack>
                            <S.BarChartValue>
                              {(pop / 1_000_000).toFixed(1)}M ({percent.toFixed(1)}%)
                            </S.BarChartValue>
                          </S.BarChartRow>
                        )
                      })
                  })()}
                </S.BarChartList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>

            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>GDP 순위</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
              <S.GlobalWidgetContent>
                <S.BarChartList>
                  {(() => {
                    const withGdp = (countries as CountryWithOptionalGdp[])
                      .filter(
                        (c) =>
                          c.gdpUsdBn != null && Number(c.gdpUsdBn) > 0,
                      )
                      .sort(
                        (a, b) =>
                          (Number(b.gdpUsdBn) || 0) -
                          (Number(a.gdpUsdBn) || 0),
                      )
                      .slice(0, RANKING_TOP_N)
                    if (withGdp.length === 0) {
                      return (
                        <S.BarChartRow>
                          <S.BarChartLabel
                            style={{ maxWidth: 'none', color: '#94a3b8' }}
                          >
                            GDP 데이터가 있는 국가가 없습니다
                          </S.BarChartLabel>
                        </S.BarChartRow>
                      )
                    }
                    const totalGdp = withGdp.reduce(
                      (sum, c) => sum + (Number(c.gdpUsdBn) || 0),
                      0,
                    )
                    return withGdp.map((country, index) => {
                      const rank = index + 1
                      const gdp = Number(country.gdpUsdBn) || 0
                      const percent =
                        totalGdp > 0 ? (gdp / totalGdp) * 100 : 0
                      return (
                        <S.BarChartRow key={country.id}>
                          <S.BarChartRank $rank={rank}>{rank}</S.BarChartRank>
                          <S.BarChartLabel>
                            {country.flagEmoji} {country.name}
                          </S.BarChartLabel>
                          <S.BarChartTrack>
                            <S.BarChartFill
                              $percent={percent}
                              $rank={rank <= 3 ? (rank as 1 | 2 | 3) : undefined}
                            />
                          </S.BarChartTrack>
                          <S.BarChartValue>
                            {gdp.toLocaleString()}B ({percent.toFixed(1)}%)
                          </S.BarChartValue>
                        </S.BarChartRow>
                      )
                    })
                  })()}
                </S.BarChartList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>

            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>면적 순위</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
              <S.GlobalWidgetContent>
                <S.BarChartList>
                  {(() => {
                    const totalArea = countries.reduce(
                      (sum, c) => sum + (c.areaSqKm || 0),
                      0,
                    )
                    return [...countries]
                      .sort((a, b) => (b.areaSqKm || 0) - (a.areaSqKm || 0))
                      .slice(0, RANKING_TOP_N)
                      .map((country, index) => {
                        const rank = index + 1
                        const area = country.areaSqKm || 0
                        const percent =
                          totalArea > 0 ? (area / totalArea) * 100 : 0
                        return (
                          <S.BarChartRow key={country.id}>
                            <S.BarChartRank $rank={rank}>{rank}</S.BarChartRank>
                            <S.BarChartLabel>
                              {country.flagEmoji} {country.name}
                            </S.BarChartLabel>
                            <S.BarChartTrack>
                              <S.BarChartFill
                                $percent={percent}
                                $rank={rank <= 3 ? (rank as 1 | 2 | 3) : undefined}
                              />
                            </S.BarChartTrack>
                            <S.BarChartValue>
                              {area.toLocaleString()} ({percent.toFixed(1)}%)
                            </S.BarChartValue>
                          </S.BarChartRow>
                        )
                      })
                  })()}
                </S.BarChartList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>
          </S.GlobalDashboardGrid>

          <S.DashboardSectionTitle style={{ marginTop: '32px' }}>
            <S.SectionTitleIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </S.SectionTitleIcon>
            <S.SectionTitleText>국가 비교 목록</S.SectionTitleText>
          </S.DashboardSectionTitle>

          <S.DashboardTableWrap>
          <S.DashboardTable>
            <S.DashboardTableHead>
              <tr>
                <S.DashboardTh>국가</S.DashboardTh>
                <S.DashboardTh>ISO</S.DashboardTh>
                <S.DashboardTh>수도</S.DashboardTh>
                <S.DashboardTh>대륙</S.DashboardTh>
                <S.DashboardTh align="right">인구</S.DashboardTh>
                <S.DashboardTh align="right">GDP (B)</S.DashboardTh>
                <S.DashboardTh align="right">면적 (km²)</S.DashboardTh>
                <S.DashboardTh align="right">인구밀도</S.DashboardTh>
              </tr>
            </S.DashboardTableHead>
            <tbody>
              {filtered.map((country) => {
                const continent = continents.find(
                  (cont) => cont.id === country.continentId,
                )
                const density =
                  country.population != null && country.areaSqKm != null
                    ? (
                        Number(country.population) / Number(country.areaSqKm)
                      ).toFixed(1)
                    : '-'

                // 현대 국가만 편집 가능
                const isModernCountry = country.type === 'modern'
                const handleClick = () => {
                  if (isModernCountry && onCountryEdit) {
                    // UnifiedCountry를 Country로 변환
                    const modernCountry: Country = {
                      id: country.id,
                      name: country.name,
                      localName: country.localName,
                      isoCode: country.isoCode,
                      flagEmoji: country.flagEmoji,
                      capital: country.capital,
                      population: country.population,
                      areaSqKm: country.areaSqKm,
                      thumbnailUrl: country.thumbnailUrl || undefined,
                      continentId: country.continentId,
                    }
                    onCountryEdit(modernCountry)
                  }
                }

                return (
                  <S.DashboardTr
                    key={country.id}
                    onClick={handleClick}
                    style={{ cursor: isModernCountry ? 'pointer' : 'default' }}
                  >
                    <S.DashboardTd>
                      <S.CountryCell>
                        <S.CountryFlag>
                          {country.flagEmoji || '🏳️'}
                        </S.CountryFlag>
                        <S.CountryInfo>
                          <S.CountryName>{country.name}</S.CountryName>
                          {country.localName && (
                            <S.CountryLocalName>
                              {country.localName}
                            </S.CountryLocalName>
                          )}
                        </S.CountryInfo>
                      </S.CountryCell>
                    </S.DashboardTd>
                    <S.DashboardTd>
                      <S.IsoCode>{country.isoCode || '-'}</S.IsoCode>
                    </S.DashboardTd>
                    <S.DashboardTd>{country.capital || '-'}</S.DashboardTd>
                    <S.DashboardTd>
                      <S.ContinentBadge>
                        {continent?.name || '-'}
                      </S.ContinentBadge>
                    </S.DashboardTd>
                    <S.DashboardTd align="right">
                      {country.population
                        ? Number(country.population).toLocaleString()
                        : '-'}
                    </S.DashboardTd>
                    <S.DashboardTd align="right">
                      {country.type === 'modern'
                        ? (() => {
                            const c = countries.find((x) => x.id === country.id) as CountryWithOptionalGdp | undefined
                            return c?.gdpUsdBn != null ? Number(c.gdpUsdBn).toLocaleString() : '-'
                          })()
                        : '-'}
                    </S.DashboardTd>
                    <S.DashboardTd align="right">
                      {country.areaSqKm
                        ? country.areaSqKm.toLocaleString()
                        : '-'}
                    </S.DashboardTd>
                    <S.DashboardTd align="right">{density}</S.DashboardTd>
                  </S.DashboardTr>
                )
              })}
            </tbody>
          </S.DashboardTable>
          </S.DashboardTableWrap>
        </>
      )}
    </S.GlobalDashboard>
  )
}
