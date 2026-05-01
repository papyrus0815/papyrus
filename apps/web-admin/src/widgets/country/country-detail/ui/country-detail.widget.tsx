import React, { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { type ContinentOption, type Country } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'

import { CountryDetailDashboard } from './country-detail-dashboard.widget'
import { CountryDetailHeader } from './country-detail-header.widget'
import * as CountryDetailStyles from './country-detail.styles'
import * as CountryStyles from './country-detail.styles'
import { CountryElectionsSection } from './country-elections-section.widget'
import { CountryLawsSection } from './country-laws-section.widget'
import { EthnicitySection } from './ethnicity-section.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { HistoricalCountryDetail } from './historical-country-detail.widget'
import { LinkedHistoricalCountriesSection } from './linked-historical-countries-section.widget'
import { LoadingOverlay } from './loading-overlay'
import { MapRegionSection } from './map-region-section.widget'
import { type OverviewSubTab, OverviewSubTabs } from './overview-sub-tabs'
import { TreatySectionWidget } from './treaty-section.widget'

export interface CountryDetailProps {
  country: UnifiedCountry | null
  continents: ContinentOption[]
  isLoading?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** URL 연동: 역대 수반·대시보드·역사적 국가·행정구역·행정조직 등 특정 탭으로 진입 시 */
  initialDetailTab?:
    | 'heads'
    | 'dashboard'
    | 'linked-historical'
    | 'regions'
    | 'government'
    | 'elections'
    | 'laws'
  onDetailTabChange?: (
    tab:
      | 'heads'
      | 'linked-historical'
      | 'regions'
      | 'government'
      | 'elections'
      | 'laws'
      | null,
  ) => void
  /** 대시보드(overview + statistics) 뷰로 전환 시 URL 갱신용 */
  onDashboardView?: () => void
}

/**
 * 국가 상세 페이지 (React.memo로 부모 리렌더 시 불필요한 리렌더 감소)
 */
function CountryDetailInner({
  country,
  continents,
  isLoading = false,
  onEdit,
  onDelete,
  initialDetailTab,
  onDetailTabChange,
  onDashboardView,
}: CountryDetailProps) {
  const [activeSubTab, setActiveSubTab] = useState<OverviewSubTab>('statistics')
  const [mapLocation, setMapLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  // country 변경 시 상태 초기화
  React.useEffect(() => {
    setMapLocation(null)
  }, [country?.id])

  // URL 등으로 역대 수반 / 대시보드 / 역사적 국가 / 행정구역 / 행정조직 진입 시 → 해당 탭으로 열기
  // 인물 탭은 헤더 "인물" 페이지로 통합됐으므로 ?tab=person / persons-list 진입은 대시보드로 폴백됨 (page 계층에서 리다이렉트)
  React.useEffect(() => {
    if (initialDetailTab === 'dashboard') {
      setActiveSubTab('statistics')
    } else if (initialDetailTab === 'heads') {
      setActiveSubTab('government')
    } else if (initialDetailTab === 'regions') {
      setActiveSubTab('map')
    } else if (initialDetailTab === 'government') {
      setActiveSubTab('government')
    } else if (initialDetailTab === 'elections') {
      setActiveSubTab('elections')
    } else if (initialDetailTab === 'laws') {
      setActiveSubTab('laws')
    }
  }, [initialDetailTab])

  const handleOverviewSubTabChange = React.useCallback(
    (tab: OverviewSubTab) => {
      setActiveSubTab(tab)
      if (tab === 'statistics') onDashboardView?.()
      else if (tab === 'map') onDetailTabChange?.('regions')
      else if (tab === 'government') onDetailTabChange?.('government')
      else if (tab === 'elections') onDetailTabChange?.('elections')
      else if (tab === 'laws') onDetailTabChange?.('laws')
    },
    [onDashboardView, onDetailTabChange],
  )

  if (!country) {
    return <EmptyState />
  }

  // 역사적 국가인지 확인
  const isHistoricalCountry = country.type === 'historical'

  // 역사적 국가는 별도 UI로 렌더링
  if (isHistoricalCountry) {
    return (
      <HistoricalCountryDetail
        country={country}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        initialTab={initialDetailTab === 'heads' ? 'heads' : undefined}
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

  return (
    <CountryStyles.DetailPaneRelative>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingOverlay key="loading" message="국가 정보를 불러오는 중..." />
        ) : (
          <motion.div
            key={`content-${country.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CountryStyles.AnalyticsDashboard
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                gap: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 스크롤은 외부 DetailPane이 담당 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* 대시보드, 역사적 국가, 행정구역, 행정조직 등 — 국가명 컨테이너 위 */}
                <div style={{ flexShrink: 0 }}>
                  <OverviewSubTabs
                    activeSubTab={activeSubTab}
                    onSubTabChange={handleOverviewSubTabChange}
                  />
                </div>

                {activeSubTab === 'statistics' && (
                  <CountryDetailHeader
                    country={country}
                    continentName={continent?.name}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* KPI Grid 제거 - 불필요한 공간 낭비 */}

                  {/* 서브 탭 콘텐츠 — opacity만 사용해 스르륵 크로스페이드 */}
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={activeSubTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{
                        duration: 0.32,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {activeSubTab === 'statistics' && country && (
                        <CountryDetailDashboard
                          country={country}
                          onEdit={onEdit}
                        />
                      )}

                      {activeSubTab === 'map' && (
                        <MapRegionSection
                          country={country}
                          mapLocation={mapLocation}
                          onCityClick={handleCityClick}
                        />
                      )}

                      {activeSubTab === 'government' && (
                        <CountryStyles.TabContentPane>
                          <GovernmentInfoSection
                            country={country}
                            countryId={country.id}
                            categoryModalOpen={categoryModalOpen}
                            onCloseCategoryModal={() =>
                              setCategoryModalOpen(false)
                            }
                            onOpenCategoryModal={() =>
                              setCategoryModalOpen(true)
                            }
                            initialContentTab={
                              initialDetailTab === 'heads' ? 'heads' : undefined
                            }
                          />
                        </CountryStyles.TabContentPane>
                      )}

                      {activeSubTab === 'ethnicity' && (
                        <EthnicitySection countryId={country.id} />
                      )}

                      {activeSubTab === 'linkedHistorical' && (
                        <LinkedHistoricalCountriesSection country={country} />
                      )}

                      {activeSubTab === 'treaty' && (
                        <TreatySectionWidget country={country} />
                      )}

                      {activeSubTab === 'elections' && (
                        <CountryStyles.TabContentPane>
                          <CountryElectionsSection
                            countryId={country.id}
                            linkedHistoricalCountries={
                              country.historicalCountries?.map((h) => ({
                                id: h.id,
                                name: h.name,
                              })) ?? []
                            }
                          />
                        </CountryStyles.TabContentPane>
                      )}

                      {activeSubTab === 'laws' && (
                        <CountryStyles.TabContentPane>
                          <CountryLawsSection countryId={country.id} />
                        </CountryStyles.TabContentPane>
                      )}

                      {/* 인물 탭은 헤더 "인물"로 통합 — 국가별 보기는 /history/dashboard/persons?countries=<id>로 이동 */}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </CountryStyles.AnalyticsDashboard>
          </motion.div>
        )}
      </AnimatePresence>
    </CountryStyles.DetailPaneRelative>
  )
}

function EmptyState() {
  return (
    <CountryDetailStyles.EmptyStateContainer
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <CountryDetailStyles.EmptyStateBgOrb $x="10%" $y="20%" $size="320px" />
      <CountryDetailStyles.EmptyStateBgOrb $x="75%" $y="60%" $size="280px" />
      <CountryDetailStyles.EmptyStateBgOrb $x="50%" $y="85%" $size="200px" />
      <CountryDetailStyles.EmptyStateCard
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <CountryDetailStyles.EmptyStateIllustration>
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
        </CountryDetailStyles.EmptyStateIllustration>
        <CountryDetailStyles.EmptyStateTitle>
          국가를 선택해주세요
        </CountryDetailStyles.EmptyStateTitle>
        <CountryDetailStyles.EmptyStateDescription>
          왼쪽 목록에서 국가를 선택하면 상세 정보를 볼 수 있습니다
        </CountryDetailStyles.EmptyStateDescription>
        <CountryDetailStyles.EmptyStateHint>
          ← 목록에서 선택
        </CountryDetailStyles.EmptyStateHint>
      </CountryDetailStyles.EmptyStateCard>
    </CountryDetailStyles.EmptyStateContainer>
  )
}

export const CountryDetail = React.memo(CountryDetailInner)
