import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCompass,
  FiEdit2,
  FiGlobe,
} from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { type ContinentOption } from '@/entities/country/api'
import {
  useBondYields,
  useDemographicIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'
import { useExportImports } from '@/entities/country/api.trade'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'

import { useCountryDashboardStats } from '../model/use-country-dashboard-stats'
import { CountryCompaniesTabSection } from './country-companies-tab-section.widget'
import { CountryDetailDashboard } from './country-detail-dashboard.widget'
import { CountryDetailHeader } from './country-detail-header.widget'
import * as S from './country-detail.styles'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { CountryMilitarySection } from './country-military-section.widget'
import { CountryStatisticsSection } from './country-statistics-section.widget'
import { CountryTradeSection } from './country-trade-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { HistoricalCountryDetail } from './historical-country-detail.widget'
import { LinkedHistoricalCountriesSection } from './linked-historical-countries-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionSection } from './map-region-section.widget'
import {
  type OverviewSubTab,
  OverviewSubTabs,
  panelId,
  tabId,
} from './overview-sub-tabs'
import * as TabStyles from './overview-sub-tabs.styles'
import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  countryTabCanvasPadding,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerInkLine,
  ledgerSubtleFill,
  metaText,
} from './country-ledger-primitives'
import { CountryPersonsSection } from './country-persons-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { TreatySectionWidget } from './treaty-section.widget'

/**
 * 국가 상세 위젯이 다루는 탭 키.
 *
 * - `OverviewSubTab`(서브 탭) ∪ `'heads'`·`'political-system'`(둘 다 government 탭의
 *   sub-view) 로 구성.
 * - URL과 어휘 일치 — 페이지 → 위젯으로 그대로 전달, 위젯 → 페이지로 그대로 전달된다.
 */
export type CountryDetailTabKey = OverviewSubTab | 'heads' | 'political-system'

export interface CountryDetailProps {
  country: UnifiedCountry | null
  continents: ContinentOption[]
  isLoading?: boolean
  /** URL의 countryId가 어떤 국가에도 매칭되지 않을 때 — NotFound 화면을 보여준다. */
  notFound?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** 모바일/태블릿(≤1024px)에서 국가 목록 시트 열기 */
  onOpenMobileList?: () => void
  /** URL 연동: 역대 수반·대시보드·역사적 국가·행정구역·행정조직 등 특정 탭으로 진입 시 */
  initialDetailTab?: CountryDetailTabKey
  /**
   * 탭 전환 시 URL 갱신 콜백.
   * `'dashboard'` 포함 — 모든 탭 전환을 단일 콜백으로 처리한다.
   */
  onDetailTabChange?: (tab: CountryDetailTabKey | null) => void
}

/**
 * `initialDetailTab` → 실제 표시할 서브 탭으로 변환.
 * 'heads'·'political-system'은 government 탭 안의 sub-view라 government로 매핑.
 */
function resolveSubTab(
  initial: CountryDetailTabKey | undefined,
): OverviewSubTab {
  if (!initial) return 'dashboard'
  if (initial === 'heads' || initial === 'political-system') return 'government'
  return initial
}

/** 국가 상세 페이지 (React.memo로 부모 리렌더 시 불필요한 리렌더 감소) */

function CountryDetailInner({
  country,
  continents,
  isLoading = false,
  notFound = false,
  onEdit,
  onDelete,
  onOpenMobileList,
  initialDetailTab,
  onDetailTabChange,
}: CountryDetailProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeSubTab, setActiveSubTab] = useState<OverviewSubTab>(() =>
    resolveSubTab(initialDetailTab),
  )
  const [mapLocation, setMapLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)

  // country 변경 시 상태 초기화
  React.useEffect(() => {
    setMapLocation(null)
  }, [country?.id])

  // URL 변화 → 탭 동기화. 'heads'는 government 탭 안의 sub-view로 매핑된다.
  React.useEffect(() => {
    if (!initialDetailTab) return
    setActiveSubTab(resolveSubTab(initialDetailTab))
  }, [initialDetailTab])

  // historical 국가 + modern-only 탭 URL(dashboard·linked-historical)
  // 진입 시 → base URL로 자동 정리 (URL ↔ 화면 일치 회복).
  // historical 위젯은 자체 'overview'로 떨어지는데 URL은 modern-only 세그먼트라 불일치 발생.
  // ⚠️ 'treaty'는 역사국가에도 탭이 생겼으므로 여기서 빼야 한다 — 남겨두면 딥링크가
  // 조약 탭을 열자마자 base URL로 튕겨 개요로 돌아간다.
  React.useEffect(() => {
    if (country?.type !== 'historical' || !initialDetailTab) return
    const modernOnly: ReadonlySet<CountryDetailTabKey> = new Set([
      'dashboard',
      'linked-historical',
      'statistics',
    ])
    if (modernOnly.has(initialDetailTab)) {
      onDetailTabChange?.(null)
    }
  }, [country?.type, country?.id, initialDetailTab, onDetailTabChange])

  const handleOverviewSubTabChange = React.useCallback(
    (tab: OverviewSubTab) => {
      setActiveSubTab(tab)
      onDetailTabChange?.(tab)
    },
    [onDetailTabChange],
  )

  const modernCountry = country?.type === 'modern' ? country : null
  const dashboardStats = useCountryDashboardStats(modernCountry)
  const { data: economicRows = [] } = useEconomicIndicators(modernCountry?.id)
  const { data: demographicRows = [] } = useDemographicIndicators(modernCountry?.id)
  const { data: bondRows = [] } = useBondYields(modernCountry?.id)
  const { data: tradeRows = [] } = useExportImports(modernCountry?.id)
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
    enabled: Boolean(modernCountry?.id),
  })

  const tabCounts = useMemo<
    Partial<Record<OverviewSubTab, number>> | undefined
  >(() => {
    if (!modernCountry) return undefined
    const linkedHistIds = new Set(
      (modernCountry.historicalCountries ?? [])
        .map((item) => item?.id)
        .filter((id): id is string => Boolean(id)),
    )
    const companyCount = allCompanies.filter(
      (company) =>
        company.countryId === modernCountry.id ||
        (Boolean(company.historicalCountryId) &&
          linkedHistIds.has(company.historicalCountryId!)),
    ).length
    const statYearCount = new Set([
      ...economicRows.map((row) => row.year),
      ...demographicRows.map((row) => row.year),
      ...bondRows.map((row) => row.year),
    ]).size

    return {
      persons: dashboardStats.loading.persons
        ? undefined
        : dashboardStats.personCount,
      events: dashboardStats.loading.events
        ? undefined
        : dashboardStats.eventCount,
      'linked-historical': dashboardStats.historicalCountryCount,
      regions: dashboardStats.loading.cities
        ? undefined
        : dashboardStats.cityCount,
      government: dashboardStats.loading.administration
        ? undefined
        : dashboardStats.administrationCount +
          dashboardStats.currentHeads.length,
      military: dashboardStats.loading.military
        ? undefined
        : dashboardStats.militaryCount,
      ethnicity: dashboardStats.loading.ethnicity
        ? undefined
        : dashboardStats.ethnicityCount,
      elections: dashboardStats.loading.elections
        ? undefined
        : dashboardStats.electionCount,
      laws: dashboardStats.loading.laws ? undefined : dashboardStats.lawCount,
      treaty: dashboardStats.loading.treaties
        ? undefined
        : dashboardStats.treatyCount,
      trade: tradeRows.length,
      companies: companyCount,
      statistics: statYearCount,
    }
  }, [
    modernCountry,
    allCompanies,
    economicRows,
    demographicRows,
    bondRows,
    tradeRows.length,
    dashboardStats,
  ])

  // 우선순위: loading > notFound > empty(미선택). 셋을 명확히 분리해야 사용자가 자신의 상태를 안다.
  if (isLoading && !country) {
    return (
      <S.DetailPaneRelative>
        <LoadingOverlay message="국가 정보를 불러오는 중..." />
      </S.DetailPaneRelative>
    )
  }
  if (notFound) {
    return <NotFoundState onOpenMobileList={onOpenMobileList} />
  }
  if (!country) {
    return <EmptyState onOpenMobileList={onOpenMobileList} />
  }

  // 역사적 국가는 별도 UI로 렌더링.
  // historical 위젯이 동기화하는 탭 키와 widget tab key가 겹치는 것만 forward —
  // 'dashboard'/'linked-historical'는 historical에 매칭되는 탭이 없어 overview로 폴백.
  if (country.type === 'historical') {
    /* 역사 국가엔 행정조직 안의 서브탭이 없다 — 정체 딥링크는 행정조직 탭으로 접는다 */
    const historicalInitialTab =
      initialDetailTab === 'political-system'
        ? ('government' as const)
        : initialDetailTab === 'persons'
          ? ('figures' as const)
          : initialDetailTab === 'events' ||
              initialDetailTab === 'heads' ||
              initialDetailTab === 'regions' ||
              initialDetailTab === 'government' ||
              initialDetailTab === 'military' ||
              initialDetailTab === 'elections' ||
              initialDetailTab === 'laws' ||
              initialDetailTab === 'ethnicity' ||
              initialDetailTab === 'treaty' ||
              initialDetailTab === 'trade' ||
              initialDetailTab === 'companies'
            ? initialDetailTab
            : undefined
    return (
      <HistoricalCountryDetail
        country={country}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        initialTab={historicalInitialTab}
        onTabChangeToUrl={onDetailTabChange}
      />
    )
  }

  const continent = continents.find((cont) => cont.id === country.continentId)

  /** 지도/지역 탭에서 항목을 선택했을 때 — 지도 위치만 갱신 */
  const handleCityClick = (city: {
    name: string
    latitude: number
    longitude: number
  }) => {
    setMapLocation({
      latitude: city.latitude,
      longitude: city.longitude,
      name: city.name,
    })
  }

  // 두 개의 의미 있는 애니메이션 레이어:
  //  - 외곽: 국가 전환 (key={country.id}) opacity fade
  //  - 내부: 탭 전환 (key={activeSubTab}) opacity + y fade
  return (
    <S.DetailPaneRelative>
      <AnimatePresence mode="wait">
        <S.CountrySwapMotion
          key={`content-${country.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <S.AnalyticsDashboard>
            {/* 스크롤은 외부 DetailPane이 담당 */}
            <S.StickyTopBar>
              <OverviewSubTabs
                activeSubTab={activeSubTab}
                onSubTabChange={handleOverviewSubTabChange}
                counts={tabCounts}
                contextBar={
                  activeSubTab !== 'dashboard' ? (
                    <TabStyles.CompactContextBar>
                      <TabStyles.CompactCountryBtn
                        type="button"
                        onClick={() => handleOverviewSubTabChange('dashboard')}
                        title="대시보드로 돌아가기"
                      >
                        <FiArrowLeft aria-hidden />
                        <TabStyles.CompactFlag aria-hidden>
                          {country.thumbnailUrl ? (
                            <img
                              src={getUploadImageUrl(country.thumbnailUrl)}
                              alt=""
                            />
                          ) : (
                            country.flagEmoji || country.name.slice(0, 1)
                          )}
                        </TabStyles.CompactFlag>
                        <TabStyles.CompactName>
                          {country.name}
                        </TabStyles.CompactName>
                        {(continent?.name || country.isoCode) && (
                          <TabStyles.CompactMeta>
                            {[continent?.name, country.isoCode]
                              .filter(Boolean)
                              .join(' · ')}
                          </TabStyles.CompactMeta>
                        )}
                      </TabStyles.CompactCountryBtn>
                      {onEdit && (
                        <TabStyles.CompactActions>
                          <TabStyles.CompactActionBtn
                            type="button"
                            onClick={() => onEdit(country)}
                          >
                            <FiEdit2 aria-hidden />
                            기본 정보 수정
                          </TabStyles.CompactActionBtn>
                        </TabStyles.CompactActions>
                      )}
                    </TabStyles.CompactContextBar>
                  ) : undefined
                }
              />
            </S.StickyTopBar>

            {/*
              서브 탭 콘텐츠 — 들어오는 쪽만 짧게 페이드한다.

              예전엔 AnimatePresence(mode="wait") + exit 0.32s였다. 그러면 나가는 패널이
              다 사라질 때까지 기다렸다가 들어오는 패널이 시작하므로 전환에 **~800ms**가
              걸리고, 그 중간이 빈 화면이다(실측: 272ms 시점 opacity 0.02, 434ms에 새 패널이
              opacity 0으로 등장). 탭마다 콘텐츠 높이가 크게 달라(1974px→745px) 그 빈 구간이
              레이아웃 붕괴처럼 읽혔다.

              exit를 없애면 이전 패널은 즉시 교체되고 새 패널만 180ms 페이드-업 한다 —
              전환이 한 동작으로 끝나고 빈 구간이 사라진다. 페이드는 CSS 애니메이션이 맡는다
              (TabSwapMotion) — framer `initial`은 라우팅 완료 리렌더에 한 프레임 되칠해진다.
            */}
              <S.TabSwapMotion
                key={activeSubTab}
                id={panelId(activeSubTab)}
                role="tabpanel"
                aria-labelledby={tabId(activeSubTab)}
                tabIndex={0}
              >
                {activeSubTab === 'dashboard' && (
                  <CountryDetailDashboard
                    country={country}
                    onEdit={onEdit ? () => onEdit(country) : undefined}
                    /*
                      히어로는 대시보드 셸 좌측 칼럼 안에서 렌더한다. 바깥 형제로 두면
                      우측 관리 레일이 히어로 아래에서 시작하고 히어로만 레일 밑으로
                      뻗는다 — 넓은 화면에서 상단만 격자를 벗어나 보였다.
                    */
                    header={
                      <CountryDetailHeader
                        country={country}
                        continentName={continent?.name}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    }
                  />
                )}

                {activeSubTab === 'persons' && (
                  <CountryPersonsSection country={country} />
                )}

                {activeSubTab === 'events' && (
                  <EventsTimelineSection
                    countryId={country.id}
                    /* 서버 필터는 최상위 사건에만 걸린다 — 평탄화된 하위 사건까지
                       같은 기준으로 거르도록 이 국가의 id 집합을 넘긴다 */
                    scopeCountryIds={[
                      country.id,
                      ...(country.historicalCountries ?? []).map(
                        (item) => item.id,
                      ),
                    ]}
                    initialFormFromSearchParams={
                      searchParams.get('form') === 'create'
                    }
                    /* 대시보드 연표 막대에서 넘어온 세기 — 그 묶음으로 내려간다 */
                    focusCentury={searchParams.get('century')}
                    onNavigateToForm={(toForm) =>
                      navigate(
                        toForm
                          ? pathKeys.countryEvents(country.id, 'create')
                          : pathKeys.countryEvents(country.id),
                      )
                    }
                  />
                )}

                {activeSubTab === 'regions' && (
                  <MapRegionSection
                    country={country}
                    mapLocation={mapLocation}
                    onCityClick={handleCityClick}
                  />
                )}

                {activeSubTab === 'government' && (
                  <S.TabContentPane>
                    <GovernmentInfoSection
                      country={country}
                      countryId={country.id}
                      initialContentTab={
                        (searchParams.get('sub') as
                          | import('./government-info-section.widget').GovernmentContentTab
                          | null) ??
                        (initialDetailTab === 'heads'
                          ? 'cabinets'
                          : initialDetailTab === 'political-system'
                            ? 'system'
                            : undefined)
                      }
                    />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'military' && (
                  <S.TabContentPane>
                    <CountryMilitarySection country={country} />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'ethnicity' && (
                  <EthnicitySection countryId={country.id} />
                )}

                {activeSubTab === 'linked-historical' && (
                  <LinkedHistoricalCountriesSection country={country} />
                )}

                {activeSubTab === 'treaty' && (
                  <TreatySectionWidget country={country} />
                )}

                {activeSubTab === 'elections' && (
                  <S.TabContentPane>
                    <CountryElectionsSection
                      countryId={country.id}
                      linkedHistoricalCountries={
                        country.historicalCountries?.map((hist) => ({
                          id: hist.id,
                          name: hist.name,
                        })) ?? []
                      }
                    />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'laws' && (
                  <S.TabContentPane>
                    <CountryLawsSection countryId={country.id} />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'trade' && (
                  <S.TabContentPane>
                    <CountryTradeSection
                      countryId={country.id}
                      countryName={country.name}
                    />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'companies' && (
                  <S.TabContentPane>
                    <CountryCompaniesTabSection country={country} />
                  </S.TabContentPane>
                )}

                {activeSubTab === 'statistics' && (
                  <S.TabContentPane>
                    <CountryStatisticsSection
                      countryId={country.id}
                      countryName={country.name}
                    />
                  </S.TabContentPane>
                )}

                {/* 인물 탭은 헤더 "인물"로 통합 — 국가별 보기는 /history/dashboard/persons?countries=<id>로 이동 */}
              </S.TabSwapMotion>
          </S.AnalyticsDashboard>
        </S.CountrySwapMotion>
      </AnimatePresence>
    </S.DetailPaneRelative>
  )
}

function NotFoundState({
  onOpenMobileList,
}: {
  onOpenMobileList?: () => void
}) {
  return (
    <S.EmptyStateContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <S.EmptyStateCard
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <S.EmptyStateIllustration>
          <svg
            width="80"
            height="80"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="60"
              r="42"
              stroke="rgba(239, 68, 68, 0.28)"
              strokeWidth="2.5"
              fill="rgba(239, 68, 68, 0.06)"
            />
            <path
              d="M46 46l28 28M74 46l-28 28"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </S.EmptyStateIllustration>
        <S.EmptyStateTitle>
          국가를 찾을 수 없습니다
        </S.EmptyStateTitle>
        <S.EmptyStateDescription>
          해당 ID의 국가가 삭제되었거나 잘못된 링크일 수 있습니다.
        </S.EmptyStateDescription>
        <S.EmptyStateHint>
          <FiArrowLeft
            size={13}
            style={{ verticalAlign: '-2px', marginRight: 4 }}
            aria-hidden
          />
          목록에서 다시 선택
        </S.EmptyStateHint>
        {onOpenMobileList && (
          <S.EmptyStateMobileButton type="button" onClick={onOpenMobileList}>
            목록에서 국가 선택하기
          </S.EmptyStateMobileButton>
        )}
      </S.EmptyStateCard>
    </S.EmptyStateContainer>
  )
}

function formatExplorerPopulation(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  const num =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/,/g, '').trim())
  if (!Number.isFinite(num) || num <= 0) return null
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
  }
  if (num >= 10_000) {
    return `${Math.round(num / 10_000).toLocaleString('ko-KR')}만`
  }
  return `${Math.round(num).toLocaleString('ko-KR')}명`
}

function EmptyState({
  onOpenMobileList,
}: {
  onOpenMobileList?: () => void
}) {
  const navigate = useNavigate()
  const {
    countries,
    unifiedCountries,
    continents,
    historicalCount,
    apiHistoricalCountries,
    continentFilter,
    setContinentFilter,
    setCountryTypeFilter,
  } = useCountryListState()

  const continentCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of countries) {
      if (c.continentId) {
        map.set(c.continentId, (map.get(c.continentId) ?? 0) + 1)
      }
    }
    return continents
      .map((cont) => ({
        id: cont.id,
        name: cont.name,
        count: map.get(cont.id) ?? 0,
      }))
      .filter((item) => item.count > 0)
  }, [countries, continents])

  const totalPopulation = useMemo(() => {
    let sum = 0
    for (const c of countries) {
      const pop =
        typeof c.population === 'number'
          ? c.population
          : Number(String(c.population ?? '').replace(/,/g, ''))
      if (Number.isFinite(pop) && pop > 0) sum += pop
    }
    return sum
  }, [countries])

  const topModernCountries = useMemo(() => {
    const pool = continentFilter
      ? unifiedCountries.filter((c) => c.continentId === continentFilter)
      : unifiedCountries
    return [...pool]
      .sort((a, b) => {
        const popA = Number(String(a.population ?? 0).replace(/,/g, '')) || 0
        const popB = Number(String(b.population ?? 0).replace(/,/g, '')) || 0
        if (popB !== popA) return popB - popA
        return a.name.localeCompare(b.name, 'ko')
      })
      .slice(0, 8)
  }, [unifiedCountries, continentFilter])

  const featuredHistoricalCountries = useMemo(() => {
    if (!apiHistoricalCountries?.length) return []
    return [...apiHistoricalCountries]
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .slice(0, 8)
  }, [apiHistoricalCountries])

  return (
    <ExplorerContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ExplorerInner>
        <ExplorerHeader>
          <ExplorerHeaderText>
            <ExplorerEyebrow>국가 아카이브 탐색기</ExplorerEyebrow>
            <ExplorerTitle>현대 주권국과 역사 국가를 한눈에 탐색하세요</ExplorerTitle>
            <ExplorerDescription>
              좌측 목록에서 국가를 선택하거나, 아래 대륙·주요 국가 바로가기로 즉시 진입할 수 있습니다.
            </ExplorerDescription>
          </ExplorerHeaderText>
          {onOpenMobileList && (
            <S.EmptyStateMobileButton type="button" onClick={onOpenMobileList}>
              목록에서 국가 선택하기
            </S.EmptyStateMobileButton>
          )}
        </ExplorerHeader>

        <ExplorerKpiStrip aria-label="전체 국가 아카이브 요약">
          <ExplorerKpiCell
            type="button"
            onClick={() => {
              setCountryTypeFilter('modern')
              setContinentFilter('')
            }}
          >
            <ExplorerKpiLabel>등록 현대 국가</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {unifiedCountries.length.toLocaleString('ko-KR')}
              <ExplorerKpiUnit>개국</ExplorerKpiUnit>
            </ExplorerKpiValue>
            <ExplorerKpiSub>현존 주권국 · 대시보드 바로가기</ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell
            type="button"
            onClick={() => setCountryTypeFilter('historical')}
          >
            <ExplorerKpiLabel>등록 과거 국가</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {historicalCount.toLocaleString('ko-KR')}
              <ExplorerKpiUnit>개국</ExplorerKpiUnit>
            </ExplorerKpiValue>
            <ExplorerKpiSub>왕조 · 제국 · 역사 정권 아카이브</ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell
            type="button"
            onClick={() => {
              setCountryTypeFilter('all')
              setContinentFilter('')
            }}
          >
            <ExplorerKpiLabel>대륙 권역</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {continentCounts.length}
              <ExplorerKpiUnit>개 대륙</ExplorerKpiUnit>
            </ExplorerKpiValue>
            <ExplorerKpiSub>대륙별 국가 목록 필터 연동</ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell as="div">
            <ExplorerKpiLabel>집계 등록 인구</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {formatExplorerPopulation(totalPopulation) ?? '—'}
            </ExplorerKpiValue>
            <ExplorerKpiSub>현대 국가 기준 인구 합산</ExplorerKpiSub>
          </ExplorerKpiCell>
        </ExplorerKpiStrip>

        {continentCounts.length > 0 && (
          <ExplorerSection>
            <ExplorerSectionHead>
              <ExplorerSectionTitle>대륙별 빠른 필터</ExplorerSectionTitle>
              {continentFilter && (
                <ExplorerResetBtn
                  type="button"
                  onClick={() => setContinentFilter('')}
                >
                  대륙 필터 해제
                </ExplorerResetBtn>
              )}
            </ExplorerSectionHead>
            <ExplorerChipRow>
              <ExplorerChip
                type="button"
                $active={!continentFilter}
                onClick={() => {
                  setCountryTypeFilter('modern')
                  setContinentFilter('')
                }}
              >
                전체 대륙 ({unifiedCountries.length})
              </ExplorerChip>
              {continentCounts.map((cont) => (
                <ExplorerChip
                  key={cont.id}
                  type="button"
                  $active={continentFilter === cont.id}
                  onClick={() => {
                    setCountryTypeFilter('modern')
                    setContinentFilter(
                      continentFilter === cont.id ? '' : cont.id,
                    )
                  }}
                >
                  {cont.name} ({cont.count})
                </ExplorerChip>
              ))}
            </ExplorerChipRow>
          </ExplorerSection>
        )}

        {topModernCountries.length > 0 && (
          <ExplorerSection>
            <ExplorerSectionHead>
              <ExplorerSectionTitle>
                주요 현대 국가 바로가기
                {continentFilter
                  ? ` · ${continentCounts.find((c) => c.id === continentFilter)?.name ?? ''}`
                  : ''}
              </ExplorerSectionTitle>
            </ExplorerSectionHead>
            <ExplorerGrid>
              {topModernCountries.map((item) => {
                const popLabel = formatExplorerPopulation(item.population)
                const flagSrc = item.thumbnailUrl
                  ? getUploadImageUrl(item.thumbnailUrl)
                  : null
                return (
                  <ExplorerCountryCard
                    key={item.id}
                    type="button"
                    onClick={() => navigate(pathKeys.countryDetail(item.id))}
                  >
                    <ExplorerFlagBox>
                      {flagSrc ? (
                        <img src={flagSrc} alt="" />
                      ) : item.flagEmoji ? (
                        <span>{item.flagEmoji}</span>
                      ) : item.isoCode ? (
                        <ExplorerFlagCode>{item.isoCode}</ExplorerFlagCode>
                      ) : (
                        <FiGlobe size={13} aria-hidden />
                      )}
                    </ExplorerFlagBox>
                    <ExplorerCardBody>
                      <ExplorerCardName>{item.name}</ExplorerCardName>
                      <ExplorerCardMeta>
                        {[
                          item.capital ? `수도 ${item.capital}` : null,
                          popLabel ? `인구 ${popLabel}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || item.localName || '상세 보기'}
                      </ExplorerCardMeta>
                    </ExplorerCardBody>
                  </ExplorerCountryCard>
                )
              })}
            </ExplorerGrid>
          </ExplorerSection>
        )}

        {featuredHistoricalCountries.length > 0 && (
          <ExplorerSection>
            <ExplorerSectionHead>
              <ExplorerSectionTitle>역사 국가 · 왕조 바로가기</ExplorerSectionTitle>
              <ExplorerResetBtn
                type="button"
                onClick={() => setCountryTypeFilter('historical')}
              >
                과거 국가 전체 목록 ({historicalCount})
                <FiArrowUpRight size={13} aria-hidden />
              </ExplorerResetBtn>
            </ExplorerSectionHead>
            <ExplorerGrid>
              {featuredHistoricalCountries.map((hist) => {
                const periodLabel = formatCountryPeriod(hist)
                const flagSrc = hist.thumbnailUrl
                  ? getUploadImageUrl(hist.thumbnailUrl)
                  : null
                return (
                  <ExplorerCountryCard
                    key={hist.id}
                    type="button"
                    onClick={() => navigate(pathKeys.countryDetail(hist.id))}
                  >
                    <ExplorerFlagBox>
                      {flagSrc ? (
                        <img src={flagSrc} alt="" />
                      ) : (
                        <FiCompass size={13} aria-hidden />
                      )}
                    </ExplorerFlagBox>
                    <ExplorerCardBody>
                      <ExplorerCardName>{hist.name}</ExplorerCardName>
                      <ExplorerCardMeta>
                        {periodLabel || hist.enName || '역사 국가'}
                      </ExplorerCardMeta>
                    </ExplorerCardBody>
                  </ExplorerCountryCard>
                )
              })}
            </ExplorerGrid>
          </ExplorerSection>
        )}
      </ExplorerInner>
    </ExplorerContainer>
  )
}

const ExplorerContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  ${countryTabCanvasPadding}
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const ExplorerInner = styled.div`
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const ExplorerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
`

const ExplorerHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ExplorerEyebrow = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ExplorerTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ExplorerDescription = styled.p`
  margin: 0;
  font-size: 13px;
  ${metaText}
`

const ExplorerKpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ExplorerKpiCell = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background ${MOTION.fast} ease;

  & + & {
    border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 820px) {
    &:nth-child(2n + 1) {
      border-left: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    }
  }
`

const ExplorerKpiLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  ${metaText}
`

const ExplorerKpiValue = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 21px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.primary};
`

const ExplorerKpiUnit = styled.span`
  font-size: 12px;
  font-weight: 500;
  ${metaText}
`

const ExplorerKpiSub = styled.span`
  font-size: 11.5px;
  ${metaText}
`

const ExplorerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const ExplorerSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const ExplorerSectionTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ExplorerResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ExplorerChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const ExplorerChip = styled.button<{ $active: boolean }>`
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  ${DIGIT_DISPLAY}
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineHover(theme.mode)};
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const ExplorerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 8px;
`

const ExplorerCountryCard = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  min-width: 0;
  box-shadow: none;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ExplorerFlagBox = styled.span`
  width: 32px;
  height: 22px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const ExplorerFlagCode = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
`

const ExplorerCardBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ExplorerCardName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ExplorerCardMeta = styled.span`
  font-size: 11.5px;
  ${metaText}
  ${DIGIT_DISPLAY}
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CountryDetail = React.memo(CountryDetailInner)
