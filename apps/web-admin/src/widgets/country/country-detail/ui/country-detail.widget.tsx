import React, { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { type ContinentOption, type Country } from '@/entities/country/api'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import * as CountryStyles from '@/pages/history/country/country.styles'

import * as CountryDetailStyles from './CountryDetail.styles'
import { type CountryDetailTab, CountryDetailTabs } from './CountryDetailTabs'
import { LoadingOverlay } from './LoadingOverlay'
import { type OverviewSubTab, OverviewSubTabs } from './OverviewSubTabs'
import { PersonTabContent } from './PersonTabContent'
import { StatisticsModal } from './StatisticsModal'
import { ChartsSection } from './charts-section.widget'
import { CountryDetailHeader } from './country-detail-header.widget'
import { GovernmentInfoSection } from './government-info-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { HistoricalCountryDetail } from './historical-country-detail.widget'
import { HistorySection } from './history-section.widget'
import { KPIGrid } from './kpi-grid.widget'
import { MapRegionSection } from './map-region-section.widget'
import { PersonListSection } from './person-list-section.widget'
import { PersonStatsSection } from './person-stats-section.widget'

// 목업 데이터
const economicGrowthData = [
  { year: '2018', growth: 2.8, avgGrowth: 2.5 },
  { year: '2019', growth: 3.2, avgGrowth: 2.8 },
  { year: '2020', growth: -2.5, avgGrowth: -2.0 },
  { year: '2021', growth: 5.5, avgGrowth: 4.8 },
  { year: '2022', growth: 4.1, avgGrowth: 3.9 },
  { year: '2023', growth: 3.8, avgGrowth: 3.5 },
  { year: '2024', growth: 4.2, avgGrowth: 3.8 },
]

const populationGrowthData = [
  { year: '2018', rate: 0.52, projection: 0.5 },
  { year: '2019', rate: 0.48, projection: 0.48 },
  { year: '2020', rate: 0.35, projection: 0.45 },
  { year: '2021', rate: 0.42, projection: 0.43 },
  { year: '2022', rate: 0.38, projection: 0.4 },
  { year: '2023', rate: 0.35, projection: 0.38 },
  { year: '2024', rate: 0.32, projection: 0.35 },
]

const mockCities = [
  {
    id: '1',
    name: '서울',
    population: '9,776,000',
    latitude: 37.5665,
    longitude: 126.978,
  },
  {
    id: '2',
    name: '부산',
    population: '3,349,000',
    latitude: 35.1796,
    longitude: 129.0756,
  },
  {
    id: '3',
    name: '인천',
    population: '2,945,000',
    latitude: 37.4563,
    longitude: 126.7052,
  },
  {
    id: '4',
    name: '대구',
    population: '2,401,000',
    latitude: 35.8714,
    longitude: 128.6014,
  },
  {
    id: '5',
    name: '대전',
    population: '1,454,000',
    latitude: 36.3504,
    longitude: 127.3845,
  },
]

const exportData = [
  { category: '반도체', value: 128 },
  { category: '자동차', value: 95 },
  { category: '석유제품', value: 76 },
  { category: '선박', value: 64 },
  { category: '기계류', value: 51 },
  { category: '철강', value: 43 },
]

const importData = [
  { category: '원유', value: 112 },
  { category: '반도체', value: 89 },
  { category: '천연가스', value: 67 },
  { category: '기계류', value: 58 },
  { category: '철강', value: 45 },
  { category: '화학제품', value: 38 },
]

export interface CountryDetailProps {
  country: UnifiedCountry | null
  continents: ContinentOption[]
  isLoading?: boolean
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** URL 연동: 역대 수반 등 특정 탭으로 진입 시 */
  initialDetailTab?: 'heads'
  onDetailTabChange?: (tab: 'heads' | null) => void
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
}: CountryDetailProps) {
  const [activeTab, setActiveTab] = useState<CountryDetailTab>('overview')
  const [activeSubTab, setActiveSubTab] = useState<OverviewSubTab>('statistics')
  /** 인물 탭 내 전환: 통계·최근 인물 | 역대 수반 | 인물 리스트 */
  const [personInnerTab, setPersonInnerTab] = useState<'stats' | 'heads' | 'list'>('stats')
  const [mapLocation, setMapLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [isPopulationModalOpen, setIsPopulationModalOpen] = useState(false)
  const [isGdpModalOpen, setIsGdpModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  // 선택된 행정구역 정보 상태
  const [selectedRegionInfo, setSelectedRegionInfo] = useState<{
    name: string
    population: string
    area: string
    gdp: string
    industry: string
  } | null>(null)

  // country 변경 시 상태 초기화
  React.useEffect(() => {
    setMapLocation(null)
  }, [country?.id])

  // activeSubTab 변경 시 selectedRegionInfo 초기화 (지도 및 지역 → 통계 및 지표로 이동 시)
  React.useEffect(() => {
    if (activeSubTab !== 'map') {
      setSelectedRegionInfo(null)
    }
  }, [activeSubTab])

  // URL 등으로 역대 수반(heads) 진입 시 → 인물 서브탭 + 역대 수반 탭으로 열기
  React.useEffect(() => {
    if (initialDetailTab === 'heads') {
      setActiveTab('overview')
      setActiveSubTab('person')
      setPersonInnerTab('heads')
    }
  }, [initialDetailTab])

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
  const populationFormatted = country.population
    ? Number(country.population).toLocaleString('ko-KR')
    : '-'
  const areaFormatted = country.areaSqKm
    ? `${Number(country.areaSqKm).toLocaleString()}km²`
    : '-'
  const densityFormatted =
    country.population && country.areaSqKm
      ? Math.round(
          Number(country.population) / Number(country.areaSqKm),
        ).toLocaleString('ko-KR')
      : '-'
  const gdpPerCapitaFormatted = '$45,000'

  // 통계 데이터에서 KPI 메타 정보 계산
  const latestPopulationGrowth =
    populationGrowthData[populationGrowthData.length - 1]
  const previousPopulationGrowth =
    populationGrowthData[populationGrowthData.length - 2]
  const populationGrowthChange =
    latestPopulationGrowth && previousPopulationGrowth
      ? (
          ((latestPopulationGrowth.rate - previousPopulationGrowth.rate) /
            previousPopulationGrowth.rate) *
          100
        ).toFixed(1)
      : '0'
  const populationGrowthRate = latestPopulationGrowth
    ? `${latestPopulationGrowth.rate}%`
    : '-'

  const latestEconomicGrowth = economicGrowthData[economicGrowthData.length - 1]
  const previousEconomicGrowth =
    economicGrowthData[economicGrowthData.length - 2]
  const economicGrowthChange =
    latestEconomicGrowth && previousEconomicGrowth
      ? (
          ((latestEconomicGrowth.growth - previousEconomicGrowth.growth) /
            Math.abs(previousEconomicGrowth.growth)) *
          100
        ).toFixed(1)
      : '0'
  const economicGrowthRate = latestEconomicGrowth
    ? `${latestEconomicGrowth.growth}%`
    : '-'

  const handleCityClick = (
    city: (typeof mockCities)[0] & {
      area?: string
      gdp?: string
      industry?: string
    },
  ) => {
    setMapLocation({
      latitude: city.latitude,
      longitude: city.longitude,
      name: city.name,
    })

    // 선택된 행정구역 정보 업데이트
    if (city.area || city.gdp || city.industry) {
      setSelectedRegionInfo({
        name: city.name,
        population: city.population,
        area: city.area || '정보 없음',
        gdp: city.gdp || '정보 없음',
        industry: city.industry || '정보 없음',
      })
    } else {
      setSelectedRegionInfo(null)
    }
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
            style={{ width: '100%', height: '100%' }}
          >
            {/* 우측 사이드바 메뉴: 대시보드, 인물, 군대, 주요 사건 */}
            <CountryDetailTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* 상단 헤더 메뉴: 통계 및 지표, 지도 및 지역, 행정조직 (overview 탭에서만) */}
            {activeTab === 'overview' && (
              <OverviewSubTabs
                activeSubTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
              />
            )}

            <CountryStyles.AnalyticsDashboard
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ gap: 0 }}
            >
              <CountryDetailHeader
                country={country}
                continentName={continent?.name}
                onEdit={onEdit}
                onDelete={onDelete}
              />

              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* KPI Grid 제거 - 불필요한 공간 낭비 */}

                  {/* 서브 탭 콘텐츠 — opacity만 사용해 스르륵 크로스페이드 */}
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={activeSubTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.32,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      {activeSubTab === 'statistics' && (
                        <div>
                          <ChartsSection
                            economicGrowthData={economicGrowthData}
                            populationGrowthData={populationGrowthData}
                            exportData={exportData}
                            importData={importData}
                          />
                        </div>
                      )}

                      {activeSubTab === 'map' && (
                        <MapRegionSection
                          country={country}
                          mapLocation={mapLocation}
                          mockCities={mockCities}
                          onCityClick={handleCityClick}
                        />
                      )}

                      {activeSubTab === 'government' && (
                        <GovernmentInfoSection
                          countryId={country.id}
                          categoryModalOpen={categoryModalOpen}
                          onCloseCategoryModal={() => setCategoryModalOpen(false)}
                          onOpenCategoryModal={() => setCategoryModalOpen(true)}
                        />
                      )}

                      {activeSubTab === 'person' && (
                        <div style={{ marginTop: 28 }}>
                          <CountryDetailStyles.PersonInnerTabBar role="tablist" aria-label="인물 하위 메뉴">
                            <CountryDetailStyles.PersonInnerTabButton
                              role="tab"
                              aria-selected={personInnerTab === 'stats'}
                              $active={personInnerTab === 'stats'}
                              onClick={() => setPersonInnerTab('stats')}
                            >
                              통계·최근 인물
                            </CountryDetailStyles.PersonInnerTabButton>
                            <CountryDetailStyles.PersonInnerTabButton
                              role="tab"
                              aria-selected={personInnerTab === 'heads'}
                              $active={personInnerTab === 'heads'}
                              onClick={() => setPersonInnerTab('heads')}
                            >
                              역대 수반
                            </CountryDetailStyles.PersonInnerTabButton>
                            <CountryDetailStyles.PersonInnerTabButton
                              role="tab"
                              aria-selected={personInnerTab === 'list'}
                              $active={personInnerTab === 'list'}
                              onClick={() => setPersonInnerTab('list')}
                            >
                              인물 리스트
                            </CountryDetailStyles.PersonInnerTabButton>
                          </CountryDetailStyles.PersonInnerTabBar>
                          {personInnerTab === 'stats' && (
                            <PersonStatsSection countryId={country.id} noOverlap />
                          )}
                          {personInnerTab === 'heads' && (
                            <HeadsOfStateSection country={country} />
                          )}
                          {personInnerTab === 'list' && (
                            <PersonListSection countryId={country.id} />
                          )}
                        </div>
                      )}

                      {activeSubTab === 'history' && (
                        <HistorySection selectedCountry={country} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'people' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PersonTabContent countryId={country.id} />
                </motion.div>
              )}
            </CountryStyles.AnalyticsDashboard>

            {isPopulationModalOpen && (
              <StatisticsModal
                isOpen={isPopulationModalOpen}
                onClose={() => setIsPopulationModalOpen(false)}
                title="인구 통계"
                countryId={country.id}
                type="population"
              />
            )}

            {isGdpModalOpen && (
              <StatisticsModal
                isOpen={isGdpModalOpen}
                onClose={() => setIsGdpModalOpen(false)}
                title="1인당 GDP"
                countryId={country.id}
                type="gdp"
              />
            )}
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
        <CountryDetailStyles.EmptyStateHint>← 목록에서 선택</CountryDetailStyles.EmptyStateHint>
      </CountryDetailStyles.EmptyStateCard>
    </CountryDetailStyles.EmptyStateContainer>
  )
}

export const CountryDetail = React.memo(CountryDetailInner)
