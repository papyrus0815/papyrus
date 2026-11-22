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
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'
import {
  useBondYields,
  useDemographicIndicators,
  useDevelopmentIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'
import { useInfrastructures } from '@/entities/country/api.infrastructure'
import { useNaturalFeatures } from '@/entities/country/api.natural-feature'
import { useExportImports } from '@/entities/country/api.trade'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  formatCountryPeriod,
  getCountryDurationYears,
  getCountryYearRange,
} from '@/shared/lib/country-period'
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
  ledgerHairline,
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
  const { data: developmentRows = [] } = useDevelopmentIndicators(modernCountry?.id)
  const { data: bondRows = [] } = useBondYields(modernCountry?.id)
  const { data: tradeRows = [] } = useExportImports(modernCountry?.id)
  const { data: adminDivisionRoots = [], isLoading: adminDivisionsLoading } =
    useAdministrativeDivisions(modernCountry?.id, null)
  const { data: naturalFeatureItems = [], isLoading: naturalFeaturesLoading } =
    useNaturalFeatures(modernCountry?.id)
  const { data: infrastructureItems = [], isLoading: infrastructuresLoading } =
    useInfrastructures(modernCountry?.id)
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
      ...developmentRows.map((row) => row.year),
      ...bondRows.map((row) => row.year),
    ]).size

    const countDivisions = (nodes: AdministrativeDivision[]): number => {
      let total = 0
      for (const node of nodes) {
        total += 1
        if (node.children?.length) total += countDivisions(node.children)
      }
      return total
    }
    const regionsTotal =
      countDivisions(adminDivisionRoots) +
      naturalFeatureItems.length +
      infrastructureItems.length
    const regionsLoading =
      adminDivisionsLoading &&
      naturalFeaturesLoading &&
      infrastructuresLoading

    return {
      persons: dashboardStats.loading.persons
        ? undefined
        : dashboardStats.personCount,
      events: dashboardStats.loading.events
        ? undefined
        : dashboardStats.eventCount,
      'linked-historical': dashboardStats.historicalCountryCount,
      regions: regionsLoading ? undefined : regionsTotal,
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
    developmentRows,
    bondRows,
    tradeRows.length,
    adminDivisionRoots,
    naturalFeatureItems.length,
    infrastructureItems.length,
    adminDivisionsLoading,
    naturalFeaturesLoading,
    infrastructuresLoading,
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

  /** 지도/지역 탭에서 항목을 선택했을 때 — 지도 위치만 갱신 (빈 id/name이면 포커스 해제) */
  const handleCityClick = (city: {
    id?: string
    name: string
    latitude: number
    longitude: number
  }) => {
    if (!city.id && !city.name) {
      setMapLocation(null)
      return
    }
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
                    preloadedStats={dashboardStats}
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
                    countryName={country.name}
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

const WORLD_SOVEREIGN_BENCHMARK = 195
const WORLD_LAND_AREA_KM2 = 148_940_000

type ExplorerRankMetric = 'population' | 'area' | 'historical'
type ContinentMetric = 'count' | 'population' | 'area'

const ATLAS_VIEW_W = 720
const ATLAS_VIEW_H = 300

function projectLonLat(lng: number, lat: number): [number, number] {
  const clampedLng = Math.max(-180, Math.min(180, lng))
  const clampedLat = Math.max(-82, Math.min(84, lat))
  const x = ((clampedLng + 180) / 360) * ATLAS_VIEW_W
  const y = ((90 - clampedLat) / 180) * ATLAS_VIEW_H
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

const WORLD_LANDMASS_POLYGONS: Array<{
  key: string
  coords: Array<[number, number]>
}> = [
  {
    key: 'northAmerica',
    coords: [
      [-168, 66], [-140, 70], [-95, 73], [-62, 60], [-55, 47], [-70, 42],
      [-80, 25], [-90, 21], [-83, 9], [-95, 16], [-106, 22], [-115, 30],
      [-124, 48], [-140, 59], [-166, 60],
    ],
  },
  {
    key: 'greenland',
    coords: [[-55, 81], [-20, 81], [-18, 70], [-43, 60], [-56, 70]],
  },
  {
    key: 'southAmerica',
    coords: [
      [-80, 10], [-62, 11], [-50, 1], [-35, -6], [-39, -18], [-48, -28],
      [-58, -38], [-68, -54], [-74, -50], [-72, -35], [-71, -18], [-81, -5],
    ],
  },
  {
    key: 'europe',
    coords: [
      [-10, 36], [-9, 43], [-5, 48], [2, 51], [8, 55], [10, 63], [20, 70],
      [32, 70], [45, 65], [55, 60], [50, 46], [38, 45], [29, 41], [24, 37],
      [15, 38], [12, 42], [5, 43], [-5, 36],
    ],
  },
  {
    key: 'uk',
    coords: [[-6, 50], [-5, 58], [1, 58], [2, 51]],
  },
  {
    key: 'africa',
    coords: [
      [-17, 15], [-13, 28], [-6, 35], [10, 37], [25, 32], [33, 31], [43, 12],
      [51, 12], [41, -2], [40, -15], [33, -26], [27, -34], [18, -34],
      [14, -22], [12, -6], [8, 4], [-8, 5], [-16, 11],
    ],
  },
  {
    key: 'madagascar',
    coords: [[44, -13], [50, -14], [47, -25], [43, -24]],
  },
  {
    key: 'asia',
    coords: [
      [28, 41], [40, 42], [52, 38], [56, 26], [44, 13], [54, 17], [60, 25],
      [68, 24], [73, 16], [77, 8], [82, 16], [89, 22], [97, 16], [103, 2],
      [109, 12], [108, 21], [117, 23], [122, 31], [121, 39], [127, 35],
      [129, 41], [136, 46], [142, 53], [160, 60], [175, 66], [170, 70],
      [135, 72], [100, 74], [70, 72], [55, 60], [50, 46],
    ],
  },
  {
    key: 'japan',
    coords: [[130, 32], [136, 35], [141, 41], [145, 44], [141, 38], [134, 33]],
  },
  {
    key: 'indonesia',
    coords: [[96, 5], [105, -6], [115, -8], [125, -8], [120, -2], [110, 1], [102, 3]],
  },
  {
    key: 'oceania',
    coords: [
      [114, -22], [122, -17], [132, -12], [142, -11], [150, -22], [153, -28],
      [149, -38], [139, -36], [130, -32], [115, -34],
    ],
  },
  {
    key: 'newZealand',
    coords: [[172, -35], [178, -38], [170, -46], [167, -45]],
  },
]

const PROJECTED_LANDMASS_PATHS = WORLD_LANDMASS_POLYGONS.map((poly) => ({
  key: poly.key,
  points: poly.coords
    .map(([lng, lat]) => projectLonLat(lng, lat).join(','))
    .join(' '),
}))

function parseExplorerNumber(raw: unknown): number {
  if (raw == null || raw === '') return 0
  const num =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/,/g, '').trim())
  return Number.isFinite(num) && num > 0 ? num : 0
}

function formatExplorerPopulation(raw: unknown): string | null {
  const num = parseExplorerNumber(raw)
  if (num <= 0) return null
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
  }
  if (num >= 10_000) {
    return `${Math.round(num / 10_000).toLocaleString('ko-KR')}만`
  }
  return `${Math.round(num).toLocaleString('ko-KR')}명`
}

function formatExplorerArea(raw: unknown): string | null {
  const num = parseExplorerNumber(raw)
  if (num <= 0) return null
  if (num >= 10_000) {
    const man = num / 10_000
    const formatted =
      man >= 100
        ? Math.round(man).toLocaleString('ko-KR')
        : man.toFixed(1).replace(/\.0$/, '')
    return `${formatted}만 km²`
  }
  return `${Math.round(num).toLocaleString('ko-KR')} km²`
}

function EmptyState({
  onOpenMobileList,
}: {
  onOpenMobileList?: () => void
}) {
  const navigate = useNavigate()
  const [rankMetric, setRankMetric] = useState<ExplorerRankMetric>('population')
  const [continentMetric, setContinentMetric] =
    useState<ContinentMetric>('count')
  const [hoveredAtlasId, setHoveredAtlasId] = useState<string | null>(null)
  const [histEraFilter, setHistEraFilter] = useState<string | null>(null)
  const [histStateFilter, setHistStateFilter] = useState<string | null>(null)
  const [histSort, setHistSort] = useState<'duration' | 'ancient' | 'modern'>(
    'duration',
  )
  const [onlyUnlinkedHist, setOnlyUnlinkedHist] = useState(false)
  const [histSearch, setHistSearch] = useState('')
  const {
    countries,
    unifiedCountries,
    continents,
    historicalCount,
    unlinkedHistoricalIds,
    apiHistoricalCountries,
    continentFilter,
    setContinentFilter,
    countryTypeFilter,
    setCountryTypeFilter,
  } = useCountryListState()

  const isHistoricalAtlasMode = countryTypeFilter === 'historical'

  const continentStats = useMemo(() => {
    const countMap = new Map<string, number>()
    const popMap = new Map<string, number>()
    const areaMap = new Map<string, number>()

    let popTotal = 0
    let areaTotal = 0

    for (const c of countries) {
      if (!c.continentId) continue
      const p = parseExplorerNumber(c.population)
      const a = parseExplorerNumber(c.areaSqKm)
      countMap.set(c.continentId, (countMap.get(c.continentId) ?? 0) + 1)
      popMap.set(c.continentId, (popMap.get(c.continentId) ?? 0) + p)
      areaMap.set(c.continentId, (areaMap.get(c.continentId) ?? 0) + a)
      popTotal += p
      areaTotal += a
    }

    const totalModern = Math.max(countries.length, 1)
    const safePopTotal = Math.max(popTotal, 1)
    const safeAreaTotal = Math.max(areaTotal, 1)

    const items = continents
      .map((cont) => {
        const count = countMap.get(cont.id) ?? 0
        const population = popMap.get(cont.id) ?? 0
        const area = areaMap.get(cont.id) ?? 0
        const metricVal =
          continentMetric === 'population'
            ? population
            : continentMetric === 'area'
              ? area
              : count
        const activeSharePct =
          continentMetric === 'population'
            ? Math.round((population / safePopTotal) * 100)
            : continentMetric === 'area'
              ? Math.round((area / safeAreaTotal) * 100)
              : Math.round((count / totalModern) * 100)
        return {
          id: cont.id,
          name: cont.name,
          count,
          sharePct: Math.round((count / totalModern) * 100),
          activeSharePct,
          metricVal,
          population,
          area,
        }
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        if (b.metricVal !== a.metricVal) return b.metricVal - a.metricVal
        return b.count - a.count
      })

    const maxMetricVal = Math.max(...items.map((item) => item.metricVal), 1)
    return { items, maxMetricVal }
  }, [countries, continents, continentMetric])

  const { totalPopulation, totalAreaSqKm } = useMemo(() => {
    let popSum = 0
    let areaSum = 0
    for (const c of countries) {
      popSum += parseExplorerNumber(c.population)
      areaSum += parseExplorerNumber(c.areaSqKm)
    }
    return { totalPopulation: popSum, totalAreaSqKm: areaSum }
  }, [countries])

  const sovereignCoveragePct = useMemo(
    () =>
      Math.min(
        100,
        Math.round((unifiedCountries.length / WORLD_SOVEREIGN_BENCHMARK) * 100),
      ),
    [unifiedCountries.length],
  )

  const landCoveragePct = useMemo(
    () =>
      totalAreaSqKm > 0
        ? Math.min(100, Math.round((totalAreaSqKm / WORLD_LAND_AREA_KM2) * 100))
        : 0,
    [totalAreaSqKm],
  )

  const historicalInfographic = useMemo(() => {
    const eraDefs = [
      { key: 'ancient', label: '고대', sub: 'BC', count: 0 },
      { key: 'classical', label: '고전', sub: '1~5c', count: 0 },
      { key: 'medieval', label: '중세', sub: '6~14c', count: 0 },
      { key: 'earlyModern', label: '근세', sub: '15~18c', count: 0 },
      { key: 'modernEra', label: '근현대', sub: '19c~', count: 0 },
    ]
    let unknownEraCount = 0

    const typeCounts = {
      empire: 0,
      monarchy: 0,
      republic: 0,
      other: 0,
    }

    for (const h of apiHistoricalCountries ?? []) {
      const span = getCountryYearRange({
        startYear: h.startYear,
        startEra: h.startEra,
        endYear: h.endYear,
        endEra: h.endEra,
      })
      const start = span.start
      if (start == null) {
        unknownEraCount += 1
      } else if (start <= 0) {
        eraDefs[0].count += 1
      } else if (start <= 500) {
        eraDefs[1].count += 1
      } else if (start <= 1400) {
        eraDefs[2].count += 1
      } else if (start <= 1800) {
        eraDefs[3].count += 1
      } else {
        eraDefs[4].count += 1
      }

      const st = String(h.stateType ?? '').toUpperCase()
      if (st.includes('EMPIRE')) {
        typeCounts.empire += 1
      } else if (
        st.includes('KINGDOM') ||
        st.includes('DYNASTY') ||
        st.includes('MONARCHY') ||
        st.includes('DUCHY') ||
        st.includes('PRINCIPALITY') ||
        st.includes('KHANATE') ||
        st.includes('SHOGUNATE') ||
        st.includes('SULTANATE') ||
        st.includes('CALIPHATE')
      ) {
        typeCounts.monarchy += 1
      } else if (
        st.includes('REPUBLIC') ||
        st.includes('FEDERATION') ||
        st.includes('CONFEDERATION') ||
        st.includes('COMMONWEALTH')
      ) {
        typeCounts.republic += 1
      } else {
        typeCounts.other += 1
      }
    }

    const maxEraCount = Math.max(...eraDefs.map((b) => b.count), 1)
    const totalPolities = Math.max((apiHistoricalCountries ?? []).length, 1)
    const stateSegments = [
      {
        key: 'monarchy',
        label: '왕조·왕국',
        count: typeCounts.monarchy,
        pct: Math.round((typeCounts.monarchy / totalPolities) * 100),
        tone: 'indigo' as const,
      },
      {
        key: 'empire',
        label: '제국',
        count: typeCounts.empire,
        pct: Math.round((typeCounts.empire / totalPolities) * 100),
        tone: 'amber' as const,
      },
      {
        key: 'republic',
        label: '공화·연방',
        count: typeCounts.republic,
        pct: Math.round((typeCounts.republic / totalPolities) * 100),
        tone: 'teal' as const,
      },
      {
        key: 'other',
        label: '정권·기타',
        count: typeCounts.other,
        pct: Math.round((typeCounts.other / totalPolities) * 100),
        tone: 'slate' as const,
      },
    ].filter((seg) => seg.count > 0)

    return {
      eraDefs,
      maxEraCount,
      unknownEraCount,
      stateSegments,
    }
  }, [apiHistoricalCountries])

  const rankedModernCountries = useMemo(() => {
    const pool = continentFilter
      ? unifiedCountries.filter((c) => c.continentId === continentFilter)
      : unifiedCountries

    const scored = pool.map((c) => {
      const metricValue =
        rankMetric === 'population'
          ? parseExplorerNumber(c.population)
          : rankMetric === 'area'
            ? parseExplorerNumber(c.areaSqKm)
            : (c.historicalCountries?.length ?? 0)
      return { country: c, metricValue }
    })

    const sorted = scored
      .sort((a, b) => {
        if (b.metricValue !== a.metricValue) return b.metricValue - a.metricValue
        return a.country.name.localeCompare(b.country.name, 'ko')
      })
      .slice(0, 8)

    const maxMetric = Math.max(...sorted.map((item) => item.metricValue), 1)
    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      ratioPct:
        item.metricValue > 0
          ? Math.max(4, Math.round((item.metricValue / maxMetric) * 100))
          : 0,
    }))
  }, [unifiedCountries, continentFilter, rankMetric])

  const top3CountryIds = useMemo(
    () => new Set(rankedModernCountries.slice(0, 3).map((r) => r.country.id)),
    [rankedModernCountries],
  )

  const atlasWorldPoints = useMemo(() => {
    const withCoords = unifiedCountries.filter(
      (c) =>
        c.latitude != null &&
        c.longitude != null &&
        Number.isFinite(c.latitude) &&
        Number.isFinite(c.longitude),
    )

    const scored = withCoords.map((c) => {
      const metricValue =
        rankMetric === 'population'
          ? parseExplorerNumber(c.population)
          : rankMetric === 'area'
            ? parseExplorerNumber(c.areaSqKm)
            : (c.historicalCountries?.length ?? 0)
      const [x, y] = projectLonLat(c.longitude as number, c.latitude as number)
      return { country: c, metricValue, x, y }
    })

    const maxVal = Math.max(...scored.map((s) => s.metricValue), 1)
    return scored
      .map((s) => {
        const radius =
          s.metricValue > 0
            ? 3.2 + Math.sqrt(s.metricValue / maxVal) * 9.8
            : 2.6
        return { ...s, radius: Math.round(radius * 10) / 10 }
      })
      .sort((a, b) => b.radius - a.radius)
  }, [unifiedCountries, rankMetric])

  const hoveredAtlasEntry = useMemo(() => {
    if (!hoveredAtlasId) return null
    const found = atlasWorldPoints.find((p) => p.country.id === hoveredAtlasId)
    if (found) return found
    const fallbackCountry = unifiedCountries.find(
      (c) => c.id === hoveredAtlasId,
    )
    if (!fallbackCountry) return null
    const metricValue =
      rankMetric === 'population'
        ? parseExplorerNumber(fallbackCountry.population)
        : rankMetric === 'area'
          ? parseExplorerNumber(fallbackCountry.areaSqKm)
          : (fallbackCountry.historicalCountries?.length ?? 0)
    return {
      country: fallbackCountry,
      metricValue,
      x: null as number | null,
      y: null as number | null,
      radius: 0,
    }
  }, [hoveredAtlasId, atlasWorldPoints, unifiedCountries, rankMetric])

  const filteredHistoricalAtlasList = useMemo(() => {
    const raw = apiHistoricalCountries ?? []
    const q = histSearch.trim().toLowerCase()

    const classifyEraKey = (h: (typeof raw)[number]): string => {
      const span = getCountryYearRange({
        startYear: h.startYear,
        startEra: h.startEra,
        endYear: h.endYear,
        endEra: h.endEra,
      })
      const start = span.start
      if (start == null) return 'unknown'
      if (start <= 0) return 'ancient'
      if (start <= 500) return 'classical'
      if (start <= 1400) return 'medieval'
      if (start <= 1800) return 'earlyModern'
      return 'modernEra'
    }

    const classifyStateKey = (h: (typeof raw)[number]): string => {
      const st = String(h.stateType ?? '').toUpperCase()
      if (st.includes('EMPIRE')) return 'empire'
      if (
        st.includes('KINGDOM') ||
        st.includes('DYNASTY') ||
        st.includes('MONARCHY') ||
        st.includes('DUCHY') ||
        st.includes('PRINCIPALITY') ||
        st.includes('KHANATE') ||
        st.includes('SHOGUNATE') ||
        st.includes('SULTANATE') ||
        st.includes('CALIPHATE')
      ) {
        return 'monarchy'
      }
      if (
        st.includes('REPUBLIC') ||
        st.includes('FEDERATION') ||
        st.includes('CONFEDERATION') ||
        st.includes('COMMONWEALTH')
      ) {
        return 'republic'
      }
      return 'other'
    }

    const matched = raw.filter((h) => {
      if (onlyUnlinkedHist && !unlinkedHistoricalIds.has(h.id)) return false
      if (histEraFilter && classifyEraKey(h) !== histEraFilter) return false
      if (histStateFilter && classifyStateKey(h) !== histStateFilter) return false
      if (q) {
        const hay = [h.name, h.enName ?? '', formatCountryPeriod(h)]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const scored = matched.map((h) => {
      const duration =
        getCountryDurationYears({
          startYear: h.startYear,
          startEra: h.startEra,
          endYear: h.endYear,
          endEra: h.endEra,
        }) ?? 0
      const span = getCountryYearRange({
        startYear: h.startYear,
        startEra: h.startEra,
        endYear: h.endYear,
        endEra: h.endEra,
      })
      return {
        item: h,
        duration,
        startSigned: span.start,
        isUnlinked: unlinkedHistoricalIds.has(h.id),
      }
    })

    scored.sort((a, b) => {
      if (histSort === 'duration') {
        if (b.duration !== a.duration) return b.duration - a.duration
      } else if (histSort === 'ancient') {
        const lS = a.startSigned ?? 99999
        const rS = b.startSigned ?? 99999
        if (lS !== rS) return lS - rS
      } else {
        const lS = a.startSigned ?? -99999
        const rS = b.startSigned ?? -99999
        if (rS !== lS) return rS - lS
      }
      return a.item.name.localeCompare(b.item.name, 'ko')
    })

    const maxDuration = Math.max(1, ...scored.map((s) => s.duration))
    return {
      totalMatched: scored.length,
      items: scored.slice(0, 24).map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        ratioPct:
          entry.duration > 0
            ? Math.max(5, Math.round((entry.duration / maxDuration) * 100))
            : 4,
      })),
    }
  }, [
    apiHistoricalCountries,
    histSearch,
    onlyUnlinkedHist,
    unlinkedHistoricalIds,
    histEraFilter,
    histStateFilter,
    histSort,
  ])

  const featuredHistoricalCountries = useMemo(() => {
    if (!apiHistoricalCountries?.length) return []
    return [...apiHistoricalCountries]
      .sort((a, b) => {
        const durA =
          getCountryDurationYears({
            startYear: a.startYear,
            startEra: a.startEra,
            endYear: a.endYear,
            endEra: a.endEra,
          }) ?? 0
        const durB =
          getCountryDurationYears({
            startYear: b.startYear,
            startEra: b.startEra,
            endYear: b.endYear,
            endEra: b.endEra,
          }) ?? 0
        if (durB !== durA) return durB - durA
        return a.name.localeCompare(b.name, 'ko')
      })
      .slice(0, 8)
  }, [apiHistoricalCountries])

  const selectedContinentName = continentFilter
    ? continentStats.items.find((c) => c.id === continentFilter)?.name ?? null
    : null

  const ringRadius = 17
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset =
    ringCircumference * (1 - Math.min(1, sovereignCoveragePct / 100))

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
            <ExplorerEyebrow>
              {isHistoricalAtlasMode
                ? 'HISTORICAL POLITIES ATLAS'
                : 'GLOBAL ATLAS INFOGRAPHIC'}
            </ExplorerEyebrow>
            <ExplorerTitle>
              {isHistoricalAtlasMode
                ? '역사 정치체 · 왕조 · 제국 아카이브 현황판'
                : '현대 주권국과 역사 정치체 아카이브 현황판'}
            </ExplorerTitle>
            <ExplorerDescription>
              {isHistoricalAtlasMode
                ? '고대(BC)부터 근현대까지의 성립 시대·국체 분포를 필터링하고, 존속 기간 비례 랭킹으로 과거 국가 대시보드에 바로 진입하세요.'
                : '대륙 막대와 세계 버블 지도를 클릭해 필터링하거나, 상위 랭킹·역사 왕조 카드로 바로 진입하세요.'}
            </ExplorerDescription>
          </ExplorerHeaderText>

          <ExplorerHeaderRight>
            <RankModeGroup role="tablist" aria-label="아틀라스 시대 축 전환">
              <RankModeBtn
                type="button"
                role="tab"
                aria-selected={!isHistoricalAtlasMode}
                $active={!isHistoricalAtlasMode}
                onClick={() => setCountryTypeFilter('all')}
              >
                현대 주권국 ({unifiedCountries.length})
              </RankModeBtn>
              <RankModeBtn
                type="button"
                role="tab"
                aria-selected={isHistoricalAtlasMode}
                $active={isHistoricalAtlasMode}
                onClick={() => setCountryTypeFilter('historical')}
              >
                과거 정치체 ({historicalCount})
              </RankModeBtn>
            </RankModeGroup>

            {onOpenMobileList && (
              <S.EmptyStateMobileButton type="button" onClick={onOpenMobileList}>
                목록에서 국가 선택하기
              </S.EmptyStateMobileButton>
            )}
          </ExplorerHeaderRight>
        </ExplorerHeader>

        {/* 1단: 전체 국가 아카이브 4칸 헤어라인 요약 */}
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
            <ExplorerKpiSub>
              UN 기준 {sovereignCoveragePct}% 수록 · 현대 목록 열기
            </ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell
            type="button"
            onClick={() => setCountryTypeFilter('historical')}
          >
            <ExplorerKpiLabel>등록 역사 정치체</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {historicalCount.toLocaleString('ko-KR')}
              <ExplorerKpiUnit>개국</ExplorerKpiUnit>
            </ExplorerKpiValue>
            <ExplorerKpiSub>왕조 · 제국 · 고대~근현대 정권</ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell as="div">
            <ExplorerKpiLabel>집계 현대 인구</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {formatExplorerPopulation(totalPopulation) ?? '—'}
            </ExplorerKpiValue>
            <ExplorerKpiSub>
              {continentStats.items.length}개 대륙 권역 합산
            </ExplorerKpiSub>
          </ExplorerKpiCell>

          <ExplorerKpiCell as="div">
            <ExplorerKpiLabel>집계 영토 면적</ExplorerKpiLabel>
            <ExplorerKpiValue>
              {formatExplorerArea(totalAreaSqKm) ?? '—'}
            </ExplorerKpiValue>
            <ExplorerKpiSub>
              지구 육지 면적 대비 약 {landCoveragePct}%
            </ExplorerKpiSub>
          </ExplorerKpiCell>
        </ExplorerKpiStrip>

        {isHistoricalAtlasMode ? (
          <>
            {/* 과거 정치체 전용 2열 Bento: 시대별 성립 히스토그램 + 국체/현대계승 현황 */}
            <AtlasBentoGrid>
              <AtlasBentoCard aria-label="시대별 역사 정치체 성립 분포">
                <AtlasCardHead>
                  <AtlasCardTitleWrap>
                    <AtlasCardTitle>시대별 성립 정치체 밀도</AtlasCardTitle>
                    <AtlasCardBadge>총 {historicalCount}개국</AtlasCardBadge>
                  </AtlasCardTitleWrap>
                  {histEraFilter ? (
                    <ExplorerResetBtn
                      type="button"
                      onClick={() => setHistEraFilter(null)}
                    >
                      시대 필터 해제
                    </ExplorerResetBtn>
                  ) : (
                    <AtlasCardHint>막대 클릭 시 시대 필터</AtlasCardHint>
                  )}
                </AtlasCardHead>

                <EraColumnsGrid>
                  {historicalInfographic.eraDefs.map((era) => {
                    const heightPct =
                      era.count > 0
                        ? Math.max(
                            10,
                            Math.round(
                              (era.count / historicalInfographic.maxEraCount) *
                                100,
                            ),
                          )
                        : 3
                    const isSelected = histEraFilter === era.key
                    return (
                      <EraColumnButton
                        key={era.key}
                        type="button"
                        $active={isSelected}
                        onClick={() =>
                          setHistEraFilter((prev) =>
                            prev === era.key ? null : era.key,
                          )
                        }
                        title={`${era.label} (${era.sub}) 성립 정치체 ${era.count}개`}
                      >
                        <EraColumnCount $zero={era.count === 0}>
                          {era.count}
                        </EraColumnCount>
                        <EraColumnWell>
                          <EraColumnBar
                            $pct={heightPct}
                            $zero={era.count === 0}
                          />
                        </EraColumnWell>
                        <EraColumnLabel>{era.label}</EraColumnLabel>
                        <EraColumnSub>{era.sub}</EraColumnSub>
                      </EraColumnButton>
                    )
                  })}
                </EraColumnsGrid>
              </AtlasBentoCard>

              <AtlasBentoCard aria-label="국체 구성 및 현대 국가 브리지 현황">
                <AtlasCardHead>
                  <AtlasCardTitleWrap>
                    <AtlasCardTitle>국체 구성 · 현대 계보 연결</AtlasCardTitle>
                    <AtlasCardBadge>
                      연결 {Math.max(0, historicalCount - unlinkedHistoricalIds.size)}개국
                    </AtlasCardBadge>
                  </AtlasCardTitleWrap>
                  {(histStateFilter || onlyUnlinkedHist) && (
                    <ExplorerResetBtn
                      type="button"
                      onClick={() => {
                        setHistStateFilter(null)
                        setOnlyUnlinkedHist(false)
                      }}
                    >
                      필터 해제
                    </ExplorerResetBtn>
                  )}
                </AtlasCardHead>

                <EraHistogramWrap>
                  <PolityTypeFooter style={{ borderTop: 'none', paddingTop: 0 }}>
                    <PolityStackedTrack>
                      {historicalInfographic.stateSegments.map((seg) => (
                        <PolityStackedSeg
                          key={seg.key}
                          $pct={Math.max(seg.pct, 3)}
                          $tone={seg.tone}
                          title={`${seg.label}: ${seg.count}개 (${seg.pct}%)`}
                        />
                      ))}
                    </PolityStackedTrack>
                    <PolityLegendRow>
                      {historicalInfographic.stateSegments.map((seg) => {
                        const active = histStateFilter === seg.key
                        return (
                          <HistFilterPillBtn
                            key={seg.key}
                            type="button"
                            $active={active}
                            onClick={() =>
                              setHistStateFilter((prev) =>
                                prev === seg.key ? null : seg.key,
                              )
                            }
                          >
                            <PolityLegendDot $tone={seg.tone} />
                            <span>{seg.label}</span>
                            <strong>
                              {seg.count} ({seg.pct}%)
                            </strong>
                          </HistFilterPillBtn>
                        )
                      })}
                    </PolityLegendRow>
                  </PolityTypeFooter>

                  <HistBridgeSummaryRow>
                    <span>
                      현대 국가 계보 연결:{' '}
                      <strong>
                        {Math.max(
                          0,
                          historicalCount - unlinkedHistoricalIds.size,
                        )}
                        개국
                      </strong>
                      {unlinkedHistoricalIds.size > 0
                        ? ` · 미연결 ${unlinkedHistoricalIds.size}개국`
                        : ''}
                    </span>
                    {unlinkedHistoricalIds.size > 0 && (
                      <HistFilterPillBtn
                        type="button"
                        $active={onlyUnlinkedHist}
                        onClick={() => setOnlyUnlinkedHist((prev) => !prev)}
                      >
                        미연결 정치체만 ({unlinkedHistoricalIds.size})
                      </HistFilterPillBtn>
                    )}
                  </HistBridgeSummaryRow>
                </EraHistogramWrap>
              </AtlasBentoCard>
            </AtlasBentoGrid>

            {/* 과거 정치체 전폭 탐색 원장 & 존속 기간 비례 바 */}
            <AtlasBentoCard aria-label="역사 정치체 존속 기간 비례 탐색기">
              <AtlasCardHead $wrap>
                <AtlasCardTitleWrap>
                  <AtlasCardTitle>역사 정치체 존속 비례 랭킹 · 탐색</AtlasCardTitle>
                  <AtlasCardBadge>
                    검색 결과 {filteredHistoricalAtlasList.totalMatched}개국
                  </AtlasCardBadge>
                </AtlasCardTitleWrap>

                <ContinentHeaderControls>
                  <HistAtlasSearchInput
                    type="search"
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    placeholder="역사 국호 · 영문명 · 연도 검색…"
                    aria-label="역사 정치체 검색"
                  />

                  <RankModeGroup role="tablist" aria-label="역사 정치체 정렬 기준">
                    <RankModeBtn
                      type="button"
                      role="tab"
                      aria-selected={histSort === 'duration'}
                      $active={histSort === 'duration'}
                      onClick={() => setHistSort('duration')}
                    >
                      최장 존속순
                    </RankModeBtn>
                    <RankModeBtn
                      type="button"
                      role="tab"
                      aria-selected={histSort === 'ancient'}
                      $active={histSort === 'ancient'}
                      onClick={() => setHistSort('ancient')}
                    >
                      고대 성립순
                    </RankModeBtn>
                    <RankModeBtn
                      type="button"
                      role="tab"
                      aria-selected={histSort === 'modern'}
                      $active={histSort === 'modern'}
                      onClick={() => setHistSort('modern')}
                    >
                      근현대순
                    </RankModeBtn>
                  </RankModeGroup>
                </ContinentHeaderControls>
              </AtlasCardHead>

              {filteredHistoricalAtlasList.items.length === 0 ? (
                <CoverageSubText>
                  선택한 시대·국체 필터나 검색어에 해당하는 역사 정치체가 없습니다.
                </CoverageSubText>
              ) : (
                <RankingTwoColGrid>
                  {filteredHistoricalAtlasList.items.map(
                    ({ item, rank, duration, ratioPct, isUnlinked }) => {
                      const flagSrc = item.thumbnailUrl
                        ? getUploadImageUrl(item.thumbnailUrl)
                        : null
                      const periodText = formatCountryPeriod(item)
                      return (
                        <RankingBarCard
                          key={item.id}
                          type="button"
                          onClick={() =>
                            navigate(pathKeys.countryDetail(item.id))
                          }
                        >
                          <RankingIndex $top={rank <= 3}>{rank}</RankingIndex>
                          <ExplorerFlagBox>
                            {flagSrc ? (
                              <img src={flagSrc} alt="" />
                            ) : (
                              <FiCompass size={13} aria-hidden />
                            )}
                          </ExplorerFlagBox>
                          <RankingMainCol>
                            <RankingTopLine>
                              <ExplorerCardName>
                                {item.name}
                                {isUnlinked ? ' (미연결)' : ''}
                              </ExplorerCardName>
                              <RankingMetricText>
                                {duration > 0
                                  ? `약 ${duration.toLocaleString('ko-KR')}년`
                                  : periodText || '연대 미상'}
                              </RankingMetricText>
                            </RankingTopLine>
                            {periodText && duration > 0 && (
                              <ExplorerCardMeta>{periodText}</ExplorerCardMeta>
                            )}
                            <RankingTrack>
                              <RankingFill
                                $pct={ratioPct}
                                $top={rank <= 3}
                              />
                            </RankingTrack>
                          </RankingMainCol>
                        </RankingBarCard>
                      )
                    },
                  )}
                </RankingTwoColGrid>
              )}
            </AtlasBentoCard>
          </>
        ) : (
          <>
        {/* 2단: 대륙별 주권국 비례 바 & 시대별 역사 정치체 밀도 히스토그램 */}
        <AtlasBentoGrid>
          <AtlasBentoCard aria-label="대륙별 현대 국가 분포">
            <AtlasCardHead $wrap>
              <AtlasCardTitleWrap>
                <AtlasCardTitle>대륙별 주권국 분포</AtlasCardTitle>
                <AtlasCardBadge>
                  {continentStats.items.length}개 권역
                </AtlasCardBadge>
              </AtlasCardTitleWrap>
              <ContinentHeaderControls>
                <RankModeGroup role="tablist" aria-label="대륙 비교 기준">
                  <RankModeBtn
                    type="button"
                    role="tab"
                    aria-selected={continentMetric === 'count'}
                    $active={continentMetric === 'count'}
                    onClick={() => setContinentMetric('count')}
                  >
                    국가 수
                  </RankModeBtn>
                  <RankModeBtn
                    type="button"
                    role="tab"
                    aria-selected={continentMetric === 'population'}
                    $active={continentMetric === 'population'}
                    onClick={() => setContinentMetric('population')}
                  >
                    인구
                  </RankModeBtn>
                  <RankModeBtn
                    type="button"
                    role="tab"
                    aria-selected={continentMetric === 'area'}
                    $active={continentMetric === 'area'}
                    onClick={() => setContinentMetric('area')}
                  >
                    면적
                  </RankModeBtn>
                </RankModeGroup>
                {continentFilter ? (
                  <ExplorerResetBtn
                    type="button"
                    onClick={() => setContinentFilter('')}
                  >
                    필터 해제 ({selectedContinentName})
                  </ExplorerResetBtn>
                ) : null}
              </ContinentHeaderControls>
            </AtlasCardHead>

            <ContinentBarList>
              {continentStats.items.map((cont) => {
                const isSelected = continentFilter === cont.id
                const isDimmed = Boolean(continentFilter) && !isSelected
                const barPct =
                  cont.metricVal > 0
                    ? Math.max(
                        6,
                        Math.round(
                          (cont.metricVal / continentStats.maxMetricVal) * 100,
                        ),
                      )
                    : 4
                const popText = formatExplorerPopulation(cont.population)
                const areaText = formatExplorerArea(cont.area)
                const primaryMetricLabel =
                  continentMetric === 'population'
                    ? popText ?? '미집계'
                    : continentMetric === 'area'
                      ? areaText ?? '미집계'
                      : `${cont.count}개국`
                const secondaryMetaLabel =
                  continentMetric === 'count'
                    ? popText
                      ? `인구 ${popText}`
                      : null
                    : `${cont.count}개국`
                return (
                  <ContinentBarRow
                    key={cont.id}
                    type="button"
                    $active={isSelected}
                    $dimmed={isDimmed}
                    onClick={() => {
                      setCountryTypeFilter('modern')
                      setContinentFilter(isSelected ? '' : cont.id)
                    }}
                  >
                    <ContinentRowTop>
                      <ContinentName $active={isSelected}>
                        {cont.name}
                      </ContinentName>
                      <ContinentRightMeta>
                        {secondaryMetaLabel ? (
                          <ContinentPopMeta>
                            {secondaryMetaLabel}
                          </ContinentPopMeta>
                        ) : null}
                        <ContinentCountValue>
                          {primaryMetricLabel}
                          <ContinentSharePct>
                            ({cont.activeSharePct}%)
                          </ContinentSharePct>
                        </ContinentCountValue>
                      </ContinentRightMeta>
                    </ContinentRowTop>
                    <ContinentTrack>
                      <ContinentFill
                        $pct={barPct}
                        $active={isSelected}
                      />
                    </ContinentTrack>
                  </ContinentBarRow>
                )
              })}
            </ContinentBarList>
          </AtlasBentoCard>

          <AtlasBentoCard aria-label="시대별 역사 정치체 밀도">
            <AtlasCardHead>
              <AtlasCardTitleWrap>
                <AtlasCardTitle>시대별 역사 정치체 밀도</AtlasCardTitle>
                <AtlasCardBadge>총 {historicalCount}개</AtlasCardBadge>
              </AtlasCardTitleWrap>
              <ExplorerResetBtn
                type="button"
                onClick={() => setCountryTypeFilter('historical')}
              >
                역사 목록 열기
                <FiArrowUpRight size={12} aria-hidden />
              </ExplorerResetBtn>
            </AtlasCardHead>

            <EraHistogramWrap>
              <EraColumnsGrid>
                {historicalInfographic.eraDefs.map((era) => {
                  const heightPct =
                    era.count > 0
                      ? Math.max(
                          10,
                          Math.round(
                            (era.count / historicalInfographic.maxEraCount) *
                              100,
                          ),
                        )
                      : 3
                  return (
                    <EraColumnButton
                      key={era.key}
                      type="button"
                      onClick={() => setCountryTypeFilter('historical')}
                      title={`${era.label} (${era.sub}) 성립 정치체 ${era.count}개`}
                    >
                      <EraColumnCount $zero={era.count === 0}>
                        {era.count}
                      </EraColumnCount>
                      <EraColumnWell>
                        <EraColumnBar
                          $pct={heightPct}
                          $zero={era.count === 0}
                        />
                      </EraColumnWell>
                      <EraColumnLabel>{era.label}</EraColumnLabel>
                      <EraColumnSub>{era.sub}</EraColumnSub>
                    </EraColumnButton>
                  )
                })}
              </EraColumnsGrid>

              {historicalInfographic.stateSegments.length > 0 && (
                <PolityTypeFooter>
                  <PolityTypeHeader>
                    <span>정치체 국체 구성</span>
                    {historicalInfographic.unknownEraCount > 0 && (
                      <span>
                        성립 연대 미상 {historicalInfographic.unknownEraCount}개
                      </span>
                    )}
                  </PolityTypeHeader>
                  <PolityStackedTrack>
                    {historicalInfographic.stateSegments.map((seg) => (
                      <PolityStackedSeg
                        key={seg.key}
                        $pct={Math.max(seg.pct, 3)}
                        $tone={seg.tone}
                        title={`${seg.label}: ${seg.count}개 (${seg.pct}%)`}
                      />
                    ))}
                  </PolityStackedTrack>
                  <PolityLegendRow>
                    {historicalInfographic.stateSegments.map((seg) => (
                      <PolityLegendItem key={seg.key}>
                        <PolityLegendDot $tone={seg.tone} />
                        <span>{seg.label}</span>
                        <strong>{seg.count}</strong>
                      </PolityLegendItem>
                    ))}
                  </PolityLegendRow>
                </PolityTypeFooter>
              )}
            </EraHistogramWrap>
          </AtlasBentoCard>
        </AtlasBentoGrid>

        {/* 3단: 글로벌 커버리지 도넛 링 + Top 8 비례 랭킹 바 */}
        {rankedModernCountries.length > 0 && (
          <AtlasBentoCard aria-label="글로벌 스케일 상위 국가 랭킹">
            <AtlasCardHead $wrap>
              <CoverageLeadGroup>
                <CoverageRingSvg
                  width={42}
                  height={42}
                  viewBox="0 0 42 42"
                  aria-hidden
                >
                  <CoverageRingTrack
                    cx={21}
                    cy={21}
                    r={ringRadius}
                    strokeWidth={3.5}
                  />
                  <CoverageRingFill
                    cx={21}
                    cy={21}
                    r={ringRadius}
                    strokeWidth={3.5}
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 21 21)"
                  />
                  <CoverageRingText x={21} y={24.5} textAnchor="middle">
                    {sovereignCoveragePct}%
                  </CoverageRingText>
                </CoverageRingSvg>
                <div>
                  <AtlasCardTitleWrap>
                    <AtlasCardTitle>
                      월드 버블 아틀라스 · 스케일 Top 8
                      {selectedContinentName ? ` · ${selectedContinentName}` : ''}
                    </AtlasCardTitle>
                    <AtlasCardBadge>
                      주권국 {unifiedCountries.length}/{WORLD_SOVEREIGN_BENCHMARK}
                    </AtlasCardBadge>
                  </AtlasCardTitleWrap>
                  <CoverageSubText>
                    세계 지도 버블 및 상위 8개국 비례 랭킹 · 호버하여 지표 확인, 클릭 시 대시보드 이동
                  </CoverageSubText>
                </div>
              </CoverageLeadGroup>

              <RankModeGroup role="tablist" aria-label="랭킹 정렬 기준">
                <RankModeBtn
                  type="button"
                  role="tab"
                  aria-selected={rankMetric === 'population'}
                  $active={rankMetric === 'population'}
                  onClick={() => setRankMetric('population')}
                >
                  인구 상위
                </RankModeBtn>
                <RankModeBtn
                  type="button"
                  role="tab"
                  aria-selected={rankMetric === 'area'}
                  $active={rankMetric === 'area'}
                  onClick={() => setRankMetric('area')}
                >
                  영토 면적
                </RankModeBtn>
                <RankModeBtn
                  type="button"
                  role="tab"
                  aria-selected={rankMetric === 'historical'}
                  $active={rankMetric === 'historical'}
                  onClick={() => setRankMetric('historical')}
                >
                  연결 역사국가
                </RankModeBtn>
              </RankModeGroup>
            </AtlasCardHead>

            {atlasWorldPoints.length > 0 && (
              <WorldAtlasFrame
                onMouseLeave={() => setHoveredAtlasId(null)}
              >
                <WorldAtlasStatusBar>
                  {hoveredAtlasEntry ? (
                    <WorldAtlasCallout>
                      <WorldAtlasCalloutName>
                        {hoveredAtlasEntry.country.flagEmoji ? (
                          <span>{hoveredAtlasEntry.country.flagEmoji}</span>
                        ) : null}
                        <strong>{hoveredAtlasEntry.country.name}</strong>
                        {hoveredAtlasEntry.country.capital ? (
                          <WorldAtlasCalloutSub>
                            수도 {hoveredAtlasEntry.country.capital}
                          </WorldAtlasCalloutSub>
                        ) : null}
                      </WorldAtlasCalloutName>
                      <WorldAtlasCalloutMetric>
                        {rankMetric === 'population'
                          ? `인구 ${formatExplorerPopulation(hoveredAtlasEntry.metricValue) ?? '미입력'}`
                          : rankMetric === 'area'
                            ? `면적 ${formatExplorerArea(hoveredAtlasEntry.metricValue) ?? '미입력'}`
                            : `연결 역사국가 ${hoveredAtlasEntry.metricValue}개국`}
                        <span>· 클릭 시 대시보드 열기</span>
                      </WorldAtlasCalloutMetric>
                    </WorldAtlasCallout>
                  ) : (
                    <WorldAtlasIdleMeta>
                      <span>
                        좌표 등록 {atlasWorldPoints.length}개국 플로팅 (원 크기 ={' '}
                        {rankMetric === 'population'
                          ? '인구 비례'
                          : rankMetric === 'area'
                            ? '영토 면적 비례'
                            : '연결 역사국가 비례'}
                        )
                      </span>
                      <span>
                        {selectedContinentName
                          ? `${selectedContinentName} 권역 하이라이트 중`
                          : '버블 또는 하단 랭킹 호버 시 위치 연동'}
                      </span>
                    </WorldAtlasIdleMeta>
                  )}
                </WorldAtlasStatusBar>

                <WorldAtlasSvg
                  viewBox={`0 0 ${ATLAS_VIEW_W} ${ATLAS_VIEW_H}`}
                  role="img"
                  aria-label="세계 주권국 버블 아틀라스 지도"
                >
                  {/* 경위선 그리드 (적도, 남북회귀선, 본초자오선 등) */}
                  {[60, 30, 0, -30, -60].map((lat) => {
                    const [, gy] = projectLonLat(0, lat)
                    return (
                      <WorldGraticuleLine
                        key={`lat-${lat}`}
                        x1={0}
                        y1={gy}
                        x2={ATLAS_VIEW_W}
                        y2={gy}
                        $major={lat === 0}
                      />
                    )
                  })}
                  {[-120, -60, 0, 60, 120].map((lng) => {
                    const [gx] = projectLonLat(lng, 0)
                    return (
                      <WorldGraticuleLine
                        key={`lng-${lng}`}
                        x1={gx}
                        y1={0}
                        x2={gx}
                        y2={ATLAS_VIEW_H}
                        $major={lng === 0}
                      />
                    )
                  })}

                  {/* 대륙 실루엣 배경 폴리곤 */}
                  {PROJECTED_LANDMASS_PATHS.map((land) => (
                    <WorldLandmassPolygon
                      key={land.key}
                      points={land.points}
                    />
                  ))}

                  {/* 호버 십자선 레티클 */}
                  {hoveredAtlasEntry &&
                    hoveredAtlasEntry.x != null &&
                    hoveredAtlasEntry.y != null && (
                      <g pointerEvents="none">
                        <WorldReticleLine
                          x1={hoveredAtlasEntry.x}
                          y1={0}
                          x2={hoveredAtlasEntry.x}
                          y2={ATLAS_VIEW_H}
                        />
                        <WorldReticleLine
                          x1={0}
                          y1={hoveredAtlasEntry.y}
                          x2={ATLAS_VIEW_W}
                          y2={hoveredAtlasEntry.y}
                        />
                      </g>
                    )}

                  {/* 국가별 비례 버블 핀 */}
                  {atlasWorldPoints.map(({ country: c, x, y, radius }) => {
                    const isContinentMatch =
                      !continentFilter || c.continentId === continentFilter
                    const isHovered = hoveredAtlasId === c.id
                    const isTop3 = top3CountryIds.has(c.id)
                    return (
                      <WorldCountryBubbleGroup
                        key={c.id}
                        transform={`translate(${x}, ${y})`}
                        $dimmed={!isContinentMatch && !isHovered}
                        onMouseEnter={() => setHoveredAtlasId(c.id)}
                        onFocus={() => setHoveredAtlasId(c.id)}
                        onClick={() => navigate(pathKeys.countryDetail(c.id))}
                        role="button"
                        tabIndex={0}
                        aria-label={`${c.name} 대시보드로 이동`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(pathKeys.countryDetail(c.id))
                          }
                        }}
                      >
                        {(isTop3 || isHovered) && (
                          <WorldBubbleHalo
                            r={radius + (isHovered ? 4 : 2.5)}
                            $hovered={isHovered}
                          />
                        )}
                        <WorldBubbleDot
                          r={isHovered ? radius + 1.2 : radius}
                          $hovered={isHovered}
                          $highlighted={isTop3 || Boolean(continentFilter && isContinentMatch)}
                        />
                      </WorldCountryBubbleGroup>
                    )
                  })}
                </WorldAtlasSvg>
              </WorldAtlasFrame>
            )}

            <RankingTwoColGrid>
              {rankedModernCountries.map(({ country: item, rank, metricValue, ratioPct }) => {
                const flagSrc = item.thumbnailUrl
                  ? getUploadImageUrl(item.thumbnailUrl)
                  : null
                const metricLabel =
                  rankMetric === 'population'
                    ? formatExplorerPopulation(metricValue) ?? '미입력'
                    : rankMetric === 'area'
                      ? formatExplorerArea(metricValue) ?? '미입력'
                      : `${metricValue}개국`

                return (
                  <RankingBarCard
                    key={item.id}
                    type="button"
                    $hovered={hoveredAtlasId === item.id}
                    onMouseEnter={() => setHoveredAtlasId(item.id)}
                    onMouseLeave={() => setHoveredAtlasId(null)}
                    onClick={() => navigate(pathKeys.countryDetail(item.id))}
                  >
                    <RankingIndex $top={rank <= 3}>{rank}</RankingIndex>
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
                    <RankingMainCol>
                      <RankingTopLine>
                        <ExplorerCardName>{item.name}</ExplorerCardName>
                        <RankingMetricText>{metricLabel}</RankingMetricText>
                      </RankingTopLine>
                      <RankingTrack>
                        <RankingFill $pct={ratioPct} $top={rank <= 3} />
                      </RankingTrack>
                    </RankingMainCol>
                  </RankingBarCard>
                )
              })}
            </RankingTwoColGrid>
          </AtlasBentoCard>
        )}

        {/* 4단: 주요 장기 존속 역사 국가 · 왕조 바로가기 */}
        {featuredHistoricalCountries.length > 0 && (
          <ExplorerSection>
            <ExplorerSectionHead>
              <ExplorerSectionTitle>
                장기 존속 역사 국가 · 왕조 바로가기
              </ExplorerSectionTitle>
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
                const duration = getCountryDurationYears({
                  startYear: hist.startYear,
                  startEra: hist.startEra,
                  endYear: hist.endYear,
                  endEra: hist.endEra,
                })
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
                        {[
                          periodLabel,
                          duration ? `약 ${duration}년` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') ||
                          hist.enName ||
                          '역사 국가'}
                      </ExplorerCardMeta>
                    </ExplorerCardBody>
                  </ExplorerCountryCard>
                )
              })}
            </ExplorerGrid>
          </ExplorerSection>
        )}
          </>
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
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const ExplorerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
`

const ExplorerHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const ExplorerHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const ExplorerEyebrow = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
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
  font-size: 12.5px;
  color: ${metaText};
`

const ExplorerKpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ExplorerKpiCell = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 13px 16px;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background ${MOTION.fast} ease;

  & + & {
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 820px) {
    &:nth-child(2n + 1) {
      border-left: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const ExplorerKpiLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
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
  color: ${metaText};
`

const ExplorerKpiSub = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const AtlasBentoGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const AtlasBentoCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: none;
`

const AtlasCardHead = styled.div<{ $wrap?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`

const AtlasCardTitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const AtlasCardTitle = styled.h2`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const AtlasCardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AtlasCardHint = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const ContinentBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ContinentBarRow = styled.button<{
  $active: boolean
  $dimmed: boolean
}>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 9px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : 'transparent'};
  border-radius: 7px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.45 : 1)};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    opacity ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    opacity: 1;
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const ContinentRowTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`

const ContinentName = styled.span<{ $active: boolean }>`
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
`

const ContinentRightMeta = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  ${DIGIT_DISPLAY}
`

const ContinentPopMeta = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const ContinentCountValue = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ContinentSharePct = styled.span`
  margin-left: 3px;
  font-size: 11px;
  font-weight: 500;
  color: ${metaText};
`

const ContinentTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const ContinentFill = styled.div<{ $pct: number; $active: boolean }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.65)'
        : 'rgba(79, 70, 229, 0.68)'};
  transition: width ${MOTION.normal} ease;
`

const EraHistogramWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  flex: 1;
`

const EraColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  padding-top: 4px;
`

const EraColumnButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : 'transparent'};
  border-radius: 7px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    border-color: ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  }
`

const HistFilterPillBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11px;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const HistBridgeSummaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const HistAtlasSearchInput = styled.input`
  width: min(210px, 100%);
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font-family: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const EraColumnCount = styled.span<{ $zero: boolean }>`
  font-size: 11.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $zero }) =>
    $zero ? theme.colors.text.tertiary : theme.colors.text.primary};
`

const EraColumnWell = styled.div`
  width: 100%;
  max-width: 38px;
  height: 78px;
  border-radius: 5px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  display: flex;
  align-items: flex-end;
  overflow: hidden;
`

const EraColumnBar = styled.div<{ $pct: number; $zero: boolean }>`
  width: 100%;
  height: ${({ $pct }) => `${$pct}%`};
  border-radius: 4px 4px 0 0;
  background: ${({ theme, $zero }) =>
    $zero
      ? 'transparent'
      : theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'};
  transition: height ${MOTION.normal} ease;
`

const EraColumnLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EraColumnSub = styled.span`
  font-size: 10.5px;
  ${DIGIT_DISPLAY}
  color: ${metaText};
`

type PolityTone = 'indigo' | 'amber' | 'teal' | 'slate'

function polityToneColor(tone: PolityTone, mode?: string): string {
  const isDark = mode === 'dark'
  if (tone === 'indigo') return isDark ? '#a5b4fc' : '#4f46e5'
  if (tone === 'amber') return isDark ? '#fcd34d' : '#d97706'
  if (tone === 'teal') return isDark ? '#5eead4' : '#0d9488'
  return isDark ? '#94a3b8' : '#64748b'
}

const PolityTypeFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 11px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PolityTypeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
`

const PolityStackedTrack = styled.div`
  display: flex;
  width: 100%;
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const PolityStackedSeg = styled.div<{ $pct: number; $tone: PolityTone }>`
  flex: ${({ $pct }) => `${$pct} 1 0%`};
  height: 100%;
  background: ${({ theme, $tone }) => polityToneColor($tone, theme.mode)};
`

const PolityLegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const PolityLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PolityLegendDot = styled.span<{ $tone: PolityTone }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme, $tone }) => polityToneColor($tone, theme.mode)};
`

const CoverageLeadGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const CoverageRingSvg = styled.svg`
  flex-shrink: 0;
`

const CoverageRingTrack = styled.circle`
  fill: none;
  stroke: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const CoverageRingFill = styled.circle`
  fill: none;
  stroke: ${({ theme }) => ledgerAccent(theme.mode)};
  stroke-linecap: round;
`

const CoverageRingText = styled.text`
  font-size: 10.5px;
  font-weight: 700;
  fill: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const CoverageSubText = styled.p`
  margin: 2px 0 0;
  font-size: 11.5px;
  color: ${metaText};
`

const RankModeGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const RankModeBtn = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 5px;
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const ContinentHeaderControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const WorldAtlasFrame = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.42)'
      : 'rgba(248, 250, 252, 0.72)'};
  overflow: hidden;
`

const WorldAtlasStatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const WorldAtlasCallout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
`

const WorldAtlasCalloutName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    font-weight: 700;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const WorldAtlasCalloutSub = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const WorldAtlasCalloutMetric = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    font-size: 11px;
    font-weight: 500;
    color: ${metaText};
  }
`

const WorldAtlasIdleMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
  font-size: 11px;
  ${DIGIT_DISPLAY}
  color: ${metaText};
`

const WorldAtlasSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  max-height: 290px;
  user-select: none;
`

const WorldGraticuleLine = styled.line<{ $major?: boolean }>`
  stroke: ${({ theme, $major }) =>
    $major
      ? ledgerHairlineStrong(theme.mode)
      : ledgerHairline(theme.mode)};
  stroke-width: ${({ $major }) => ($major ? 0.9 : 0.6)};
  stroke-dasharray: ${({ $major }) => ($major ? 'none' : '2.5 3.5')};
`

const WorldLandmassPolygon = styled.polygon`
  fill: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.13)'
      : 'rgba(100, 116, 139, 0.11)'};
  stroke: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.26)'
      : 'rgba(100, 116, 139, 0.24)'};
  stroke-width: 0.7;
  stroke-linejoin: round;
`

const WorldReticleLine = styled.line`
  stroke: ${({ theme }) => ledgerAccent(theme.mode)};
  stroke-width: 0.75;
  stroke-dasharray: 3 3;
  opacity: 0.55;
`

const WorldCountryBubbleGroup = styled.g<{ $dimmed: boolean }>`
  cursor: pointer;
  opacity: ${({ $dimmed }) => ($dimmed ? 0.2 : 1)};
  transition: opacity ${MOTION.fast} ease;
  outline: none;
`

const WorldBubbleHalo = styled.circle<{ $hovered: boolean }>`
  fill: ${({ theme, $hovered }) =>
    $hovered
      ? theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.24)'
        : 'rgba(79, 70, 229, 0.18)'
      : 'transparent'};
  stroke: ${({ theme }) => ledgerAccent(theme.mode)};
  stroke-width: ${({ $hovered }) => ($hovered ? 1.2 : 0.85)};
  opacity: ${({ $hovered }) => ($hovered ? 0.95 : 0.55)};
`

const WorldBubbleDot = styled.circle<{
  $hovered: boolean
  $highlighted: boolean
}>`
  fill: ${({ theme, $hovered, $highlighted }) =>
    $hovered
      ? ledgerAccent(theme.mode)
      : $highlighted
        ? theme.mode === 'dark'
          ? 'rgba(165, 180, 252, 0.86)'
          : 'rgba(79, 70, 229, 0.82)'
        : theme.mode === 'dark'
          ? 'rgba(165, 180, 252, 0.52)'
          : 'rgba(79, 70, 229, 0.5)'};
  stroke: ${({ theme }) => ledgerBackground(theme.mode)};
  stroke-width: 0.9;
  transition: r ${MOTION.fast} ease, fill ${MOTION.fast} ease;
`

const RankingTwoColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;

  @media (max-width: 740px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RankingBarCard = styled.button<{ $hovered?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid
    ${({ theme, $hovered }) =>
      $hovered ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  border-radius: 8px;
  background: ${({ theme, $hovered }) =>
    $hovered ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  min-width: 0;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const RankingIndex = styled.span<{ $top: boolean }>`
  width: 18px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  flex-shrink: 0;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $top }) =>
    $top ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const RankingMainCol = styled.span`
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
`

const RankingTopLine = styled.span`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const RankingMetricText = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RankingTrack = styled.span`
  display: block;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const RankingFill = styled.span<{ $pct: number; $top: boolean }>`
  display: block;
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $top }) =>
    $top
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.52)'
        : 'rgba(79, 70, 229, 0.55)'};
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
  font-size: 13.5px;
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
  font-size: 11.5px;
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

const ExplorerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ExplorerCardMeta = styled.span`
  font-size: 11px;
  color: ${metaText};
  ${DIGIT_DISPLAY}
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CountryDetail = React.memo(CountryDetailInner)
