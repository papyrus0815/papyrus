import React, { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { type ContinentOption } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { pathKeys } from '@/shared/router'

import { CountryDetailDashboard } from './country-detail-dashboard.widget'
import { CountryDetailHeader } from './country-detail-header.widget'
import * as S from './country-detail.styles'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
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
import { CountryPersonsSection } from './country-persons-section.widget'
import { EventsTimelineSection } from './events-timeline-section.widget'
import { TreatySectionWidget } from './treaty-section.widget'

/**
 * 국가 상세 위젯이 다루는 탭 키.
 *
 * - `OverviewSubTab`(서브 탭) ∪ `'heads'`(역대 수반은 government 탭의 sub-view) 로 구성.
 * - URL과 어휘 일치 — 페이지 → 위젯으로 그대로 전달, 위젯 → 페이지로 그대로 전달된다.
 */
export type CountryDetailTabKey = OverviewSubTab | 'heads'

export interface CountryDetailProps {
  country: UnifiedCountry | null
  continents: ContinentOption[]
  isLoading?: boolean
  /** URL의 countryId가 어떤 국가에도 매칭되지 않을 때 — NotFound 화면을 보여준다. */
  notFound?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** URL 연동: 역대 수반·대시보드·역사적 국가·행정구역·행정조직 등 특정 탭으로 진입 시 */
  initialDetailTab?: CountryDetailTabKey
  /**
   * 탭 전환 시 URL 갱신 콜백.
   * `'dashboard'` 포함 — 모든 탭 전환을 단일 콜백으로 처리한다.
   */
  onDetailTabChange?: (tab: CountryDetailTabKey | null) => void
}

/** `initialDetailTab` → 실제 표시할 서브 탭으로 변환. 'heads'는 government 탭의 sub-view라 government로 매핑. */
function resolveSubTab(
  initial: CountryDetailTabKey | undefined,
): OverviewSubTab {
  if (!initial) return 'dashboard'
  if (initial === 'heads') return 'government'
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

  // historical 국가 + modern-only 탭 URL(dashboard·linked-historical·treaty)
  // 진입 시 → base URL로 자동 정리 (URL ↔ 화면 일치 회복).
  // historical 위젯은 자체 'overview'로 떨어지는데 URL은 modern-only 세그먼트라 불일치 발생.
  React.useEffect(() => {
    if (country?.type !== 'historical' || !initialDetailTab) return
    const modernOnly: ReadonlySet<CountryDetailTabKey> = new Set([
      'dashboard',
      'linked-historical',
      'treaty',
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

  // 우선순위: loading > notFound > empty(미선택). 셋을 명확히 분리해야 사용자가 자신의 상태를 안다.
  if (isLoading && !country) {
    return (
      <S.DetailPaneRelative>
        <LoadingOverlay message="국가 정보를 불러오는 중..." />
      </S.DetailPaneRelative>
    )
  }
  if (notFound) {
    return <NotFoundState />
  }
  if (!country) {
    return <EmptyState />
  }

  // 역사적 국가는 별도 UI로 렌더링.
  // historical 위젯이 동기화하는 탭 키와 widget tab key가 겹치는 것만 forward —
  // 'dashboard'/'linked-historical'/'treaty'는 historical에 매칭되는 탭이 없어 overview로 폴백.
  if (country.type === 'historical') {
    const historicalInitialTab =
      initialDetailTab === 'heads' ||
      initialDetailTab === 'regions' ||
      initialDetailTab === 'government' ||
      initialDetailTab === 'elections' ||
      initialDetailTab === 'laws' ||
      initialDetailTab === 'ethnicity'
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
              />
            </S.StickyTopBar>

            {activeSubTab === 'dashboard' && (
              <CountryDetailHeader
                country={country}
                continentName={continent?.name}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}

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
                  <CountryDetailDashboard country={country} onEdit={onEdit} />
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
                        initialDetailTab === 'heads' ? 'heads' : undefined
                      }
                    />
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
                        country.historicalCountries?.map((h) => ({
                          id: h.id,
                          name: h.name,
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

                {/* 인물 탭은 헤더 "인물"로 통합 — 국가별 보기는 /history/dashboard/persons?countries=<id>로 이동 */}
              </S.TabSwapMotion>
          </S.AnalyticsDashboard>
        </S.CountrySwapMotion>
      </AnimatePresence>
    </S.DetailPaneRelative>
  )
}

function NotFoundState() {
  return (
    <S.EmptyStateContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <S.EmptyStateBgOrb $x="20%" $y="25%" $size="280px" />
      <S.EmptyStateBgOrb $x="70%" $y="65%" $size="240px" />
      <S.EmptyStateCard
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <S.EmptyStateIllustration>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="60"
              r="42"
              stroke="#fee2e2"
              strokeWidth="3"
              fill="#fef2f2"
            />
            <path
              d="M44 44l32 32M76 44l-32 32"
              stroke="#ef4444"
              strokeWidth="3"
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
          ← 목록에서 다시 선택
        </S.EmptyStateHint>
      </S.EmptyStateCard>
    </S.EmptyStateContainer>
  )
}

function EmptyState() {
  return (
    <S.EmptyStateContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <S.EmptyStateBgOrb $x="10%" $y="20%" $size="320px" />
      <S.EmptyStateBgOrb $x="75%" $y="60%" $size="280px" />
      <S.EmptyStateBgOrb $x="50%" $y="85%" $size="200px" />
      <S.EmptyStateCard
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <S.EmptyStateIllustration>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="54"
              r="38"
              stroke="#e5e7eb"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M22 54h76M60 16v76"
              stroke="#e5e7eb"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M60 92c-6 0-10-4-10-10 0-8 10-20 10-20s10 12 10 20c0 6-4 10-10 10z"
              fill="#6366f1"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="82" r="3" fill="#fff" />
          </svg>
        </S.EmptyStateIllustration>
        <S.EmptyStateTitle>
          국가를 선택해주세요
        </S.EmptyStateTitle>
        <S.EmptyStateDescription>
          왼쪽 목록에서 국가를 선택하면 상세 정보를 볼 수 있습니다
        </S.EmptyStateDescription>
        <S.EmptyStateHint>
          ← 목록에서 선택
        </S.EmptyStateHint>
      </S.EmptyStateCard>
    </S.EmptyStateContainer>
  )
}

export const CountryDetail = React.memo(CountryDetailInner)
