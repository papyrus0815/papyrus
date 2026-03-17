import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'

import { GoogleMap } from '@/shared/ui/GoogleMap'

// Mock 데이터 import
import {
  administrativeSystemByCountry,
  getCountryCode,
  mockAdministrativeRegions,
  mockCityDetails,
} from '../mock'
import * as CountryStyles from '@/widgets/country/country-dashboard/ui/country-dashboard.styles'
import * as S from './CountryDetail.styles'
import { MapRegionAdministrativeView } from './MapRegionAdministrativeView'
import { MapRegionInfrastructureView } from './MapRegionInfrastructureView'
import { MapRegionNatureView } from './MapRegionNatureView'
import * as Styled from './map-region-section.styles'

interface City {
  id: string
  name: string
  population: string
  area?: string
  gdp?: string
  industry?: string
  latitude: number
  longitude: number
}

type SortType = 'name' | 'population' | 'area' | 'gdp'
type DetailTabType = 'overview' | 'institutions' | 'tourism' | 'statistics'

// 네비게이션 레벨 타입
type NavigationLevel = 'country' | 'level1' | 'level2' | 'city'

// 네비게이션 상태 인터페이스
interface NavigationState {
  level: NavigationLevel
  selectedLevel1?: string // 1차 행정구역 ID
  selectedLevel2?: string // 2차 행정구역 ID
  selectedCity?: City
}

interface MapRegionSectionProps {
  country: {
    latitude?: number | null
    longitude?: number | null
    name: string
  }
  mapLocation?: { latitude: number; longitude: number; name: string } | null
  mockCities: City[]
  onCityClick: (city: City) => void
}

/**
 * 지도 & 행정구역 섹션 위젯

 */
export function MapRegionSection({
  country,
  mapLocation,
  mockCities,
  onCityClick,
}: MapRegionSectionProps) {
  // 네비게이션 상태 관리
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'level1', // 시작은 1차 행정구역 목록
  })

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTabType>('overview')
  const [sortType, setSortType] = useState<SortType>('population')
  const [regionViewMode, setRegionViewMode] = useState<'list' | 'card'>('card')
  const [viewMode, setViewMode] = useState<
    'administrative' | 'nature' | 'infrastructure'
  >('administrative')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showAdminSystem, setShowAdminSystem] = useState<boolean>(false) // 행정구역 체계 토글

  const currentMapLocation = mapLocation || {
    latitude: country.latitude || 0,
    longitude: country.longitude || 0,
    name: country.name,
  }

  // 네비게이션 핸들러
  const handleLevel1Click = (regionId: string) => {
    setNavigation({
      level: 'level2',
      selectedLevel1: regionId,
    })
    setSelectedRegionId(regionId)
    // Level1을 클릭하면 해당 광역시도의 Detail을 표시하기 위해 selectedCityId도 설정
    setSelectedCityId(regionId)

    // Level1 클릭 시 해당 광역시도의 정보를 Detail로 전달
    const region = mockAdministrativeRegions.level1.find(
      (r) => r.id === regionId,
    )
    if (region) {
      // mockCityDetails에서 해당 지역의 상세 정보 조회
      const regionDetails =
        mockCityDetails[regionId as keyof typeof mockCityDetails]

      onCityClick({
        id: region.id,
        name: region.name,
        population: regionDetails?.population || '데이터 없음',
        latitude: 37.5665,
        longitude: 126.978,
        area: regionDetails?.area,
        gdp: regionDetails?.gdp,
        industry: regionDetails?.industry,
      } as any)
    }
  }

  const handleLevel2Click = (city: {
    id: string
    name: string
    population?: string
    area?: string
  }) => {
    // 최하위 레벨인지 확인 (level2가 없는 경우)
    const hasLevel3 =
      mockAdministrativeRegions.level2[
        city.id as keyof typeof mockAdministrativeRegions.level2
      ]

    // 최하위 레벨이면 선택만 하고 네비게이션 하지 않음
    if (!hasLevel3) {
      setSelectedCityId(city.id)

      // mockCityDetails에서 확장된 정보를 찾아서 onCityClick 호출
      const cityDetails =
        mockCityDetails[city.id as keyof typeof mockCityDetails]
      if (cityDetails) {
        onCityClick({
          id: city.id,
          name: city.name,
          population: cityDetails.population || city.population || '',
          latitude: 37.5665,
          longitude: 126.978,
          area: cityDetails.area,
          gdp: cityDetails.gdp,
          industry: cityDetails.industry,
        } as any)
      }
      return
    }

    // 하위 레벨이 있으면 네비게이션
    setNavigation({
      ...navigation,
      level: 'city',
      selectedLevel2: city.id,
    })
    setSelectedCityId(city.id)

    // mockCityDetails에서 확장된 정보를 찾아서 onCityClick 호출
    const cityDetails = mockCityDetails[city.id as keyof typeof mockCityDetails]
    if (cityDetails) {
      onCityClick({
        id: city.id,
        name: city.name,
        population: cityDetails.population || city.population || '',
        latitude: 37.5665,
        longitude: 126.978,
        area: cityDetails.area,
        gdp: cityDetails.gdp,
        industry: cityDetails.industry,
      } as any)
    }
  }

  const handleBackNavigation = () => {
    if (navigation.level === 'city') {
      // city → level2로 이동: 상위 광역시도 정보 전달
      setNavigation({
        level: 'level2',
        selectedLevel1: navigation.selectedLevel1,
      })
      // Level2로 돌아갈 때 selectedCityId를 selectedLevel1로 설정하여 광역시도 Detail 표시
      setSelectedCityId(navigation.selectedLevel1 || null)

      // 상위 광역시도 정보 조회하여 onCityClick 호출 (Detail 영역 업데이트)
      if (navigation.selectedLevel1) {
        const region = mockAdministrativeRegions.level1.find(
          (r) => r.id === navigation.selectedLevel1,
        )
        if (region) {
          // mockCityDetails에서 광역시도의 상세 정보 조회
          const regionDetails =
            mockCityDetails[
              navigation.selectedLevel1 as keyof typeof mockCityDetails
            ]

          onCityClick({
            id: region.id,
            name: region.name,
            population: regionDetails?.population || '데이터 없음',
            latitude: 37.5665,
            longitude: 126.978,
            area: regionDetails?.area,
            gdp: regionDetails?.gdp,
            industry: regionDetails?.industry,
          } as any)
        }
      }
    } else if (navigation.level === 'level2') {
      // level2 → level1로 이동: 선택 초기화 및 Detail 영역 비우기
      setNavigation({
        level: 'level1',
      })
      setSelectedRegionId(null)
      setSelectedCityId(null)

      // Detail 영역을 비우기 위해 빈 데이터 전달
      onCityClick({
        id: '',
        name: '',
        population: '',
        latitude: country.latitude || 37.5665,
        longitude: country.longitude || 126.978,
      })
    }
  }

  // 현재 표시할 데이터 계산
  const getCurrentLevelData = () => {
    if (navigation.level === 'level1') {
      return mockAdministrativeRegions.level1
    } else if (navigation.level === 'level2' && navigation.selectedLevel1) {
      return (
        mockAdministrativeRegions.level2[
          navigation.selectedLevel1 as keyof typeof mockAdministrativeRegions.level2
        ] || []
      )
    }
    return []
  }

  const currentData = getCurrentLevelData()

  // 검색 필터링
  const filteredData = currentData.filter((item: { name: string }) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 현재 선택된 지역 이름
  const getSelectedRegionName = () => {
    if (navigation.level === 'level1') return '대한민국 행정구역'
    if (navigation.selectedLevel1) {
      const region = mockAdministrativeRegions.level1.find(
        (regionItem) => regionItem.id === navigation.selectedLevel1,
      )
      if (navigation.level === 'level2') {
        return `${region?.name} - 하위 행정구역`
      }
      if (navigation.level === 'city' && navigation.selectedLevel2) {
        const level2Data =
          mockAdministrativeRegions.level2[
            navigation.selectedLevel1 as keyof typeof mockAdministrativeRegions.level2
          ] || []
        const level2 = level2Data.find(
          (levelItem) => levelItem.id === navigation.selectedLevel2,
        )
        return level2?.name || region?.name || ''
      }
    }
    return ''
  }

  // Breadcrumb 경로 생성
  const getBreadcrumbPath = () => {
    const path: Array<{ label: string; level: NavigationLevel }> = [
      { label: '대한민국', level: 'level1' },
    ]

    if (navigation.selectedLevel1) {
      const region = mockAdministrativeRegions.level1.find(
        (regionItem) => regionItem.id === navigation.selectedLevel1,
      )
      if (region) {
        path.push({ label: region.name, level: 'level2' })
      }
    }

    if (navigation.selectedLevel2 && navigation.level === 'city') {
      const level2Data =
        mockAdministrativeRegions.level2[
          navigation.selectedLevel1 as keyof typeof mockAdministrativeRegions.level2
        ] || []
      const city = level2Data.find(
        (cityItem: { id: string; name: string }) =>
          cityItem.id === navigation.selectedLevel2,
      )
      if (city) {
        path.push({ label: city.name, level: 'city' })
      }
    }

    return path
  }

  // Breadcrumb 클릭 핸들러
  const handleBreadcrumbClick = (targetLevel: NavigationLevel) => {
    if (targetLevel === 'level1') {
      setNavigation({ level: 'level1' })
      setSelectedRegionId(null)
      setSelectedCityId(null)
    } else if (targetLevel === 'level2' && navigation.selectedLevel1) {
      setNavigation({
        level: 'level2',
        selectedLevel1: navigation.selectedLevel1,
      })
      setSelectedCityId(null)
    }
  }

  // 이전 핸들러 (호환성)
  const handleRegionClick = (regionId: string) => {
    handleLevel1Click(regionId)
  }

  // 선택된 광역시도의 하위 도시 가져오기
  const selectedCities = selectedRegionId
    ? mockAdministrativeRegions.level2[
        selectedRegionId as keyof typeof mockAdministrativeRegions.level2
      ] || []
    : []

  // 주요 도시에 면적, GDP, 산업, 시장, 정당 추가
  const citiesWithArea = mockCities.map((city, index) => ({
    ...city,
    area: ['91.2km²', '765.8km²', '1,063.3km²', '883.6km²', '539.8km²'][index],
    gdp: ['450조원', '95조원', '78조원', '65조원', '42조원'][index],
    industry: [
      '금융/IT',
      '제조/물류',
      '자동차/철강',
      '관광/서비스',
      '교육/R&D',
    ][index],
    mayor: ['오세훈', '박형준', '유정복', '홍준표', '이장우'][index],
    party: ['국민의힘', '국민의힘', '국민의힘', '국민의힘', '국민의힘'][index],
  }))

  // 정렬 함수
  const sortedCities = [...citiesWithArea].sort((cityA, cityB) => {
    if (sortType === 'name') {
      return cityA.name.localeCompare(cityB.name)
    } else if (sortType === 'population') {
      const popA = parseInt(cityA.population.replace(/,/g, ''))
      const popB = parseInt(cityB.population.replace(/,/g, ''))
      return popB - popA
    } else if (sortType === 'area') {
      const areaA = parseFloat(cityA.area?.replace('km²', '') || '0')
      const areaB = parseFloat(cityB.area?.replace('km²', '') || '0')
      return areaB - areaA
    } else if (sortType === 'gdp') {
      const gdpA = parseInt(cityA.gdp?.replace('조원', '') || '0')
      const gdpB = parseInt(cityB.gdp?.replace('조원', '') || '0')
      return gdpB - gdpA
    }
    return 0
  })

  // 선택된 도시의 상세 정보
  const selectedCityDetails = selectedCityId
    ? mockCityDetails[selectedCityId as keyof typeof mockCityDetails]
    : null

  // 현재 레벨의 전체 데이터 집계 계산
  const calculateLevelStats = () => {
    const currentData = getCurrentLevelData() as City[]

    if (!currentData || currentData.length === 0) {
      return null
    }

    // 총 인구 계산
    const totalPopulation = currentData.reduce((sum, item) => {
      if (!item.population) return sum
      const pop = parseInt(item.population.replace(/,/g, '')) || 0
      return sum + pop
    }, 0)

    // 총 면적 계산
    const totalArea = currentData.reduce((sum, item) => {
      if (!item.area) return sum
      const area =
        parseFloat(item.area.replace(/km²/g, '').replace(/,/g, '')) || 0
      return sum + area
    }, 0)

    // 총 GDP 계산
    const totalGdp = currentData.reduce((sum, item) => {
      if (!item.gdp) return sum
      const gdp = parseInt(item.gdp.replace(/조원/g, '').replace(/,/g, '')) || 0
      return sum + gdp
    }, 0)

    // 주요 산업 집계 (상위 3개)
    const industries: Record<string, number> = {}
    currentData.forEach((item) => {
      if (item.industry) {
        industries[item.industry] = (industries[item.industry] || 0) + 1
      }
    })
    const topIndustries = Object.entries(industries)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([industry]) => industry)
      .join(', ')

    // 인구 밀도 계산
    const populationDensity =
      totalArea > 0 ? Math.round(totalPopulation / totalArea) : 0

    // 평균 GDP 계산
    const avgGdp =
      currentData.length > 0 ? Math.round(totalGdp / currentData.length) : 0

    return {
      totalPopulation,
      totalArea,
      totalGdp,
      topIndustries: topIndustries || '정보 없음',
      count: currentData.length,
      populationDensity,
      avgGdp,
    }
  }

  const levelStats = calculateLevelStats()

  const handleCitySelect = (city: City) => {
    setSelectedCityId(city.id)
    onCityClick(city)
  }

  // 현재 국가의 행정구역 체계 정보 가져오기
  const countryCode = getCountryCode(country.name)
  const adminSystem = administrativeSystemByCountry[countryCode]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        background: '#ffffff',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
      }}
    >
      <CountryStyles.GlobalDashboardHero>
        <CountryStyles.HeroContent>
          <CountryStyles.HeroTextGroup>
            <CountryStyles.HeroTitle>행정구역</CountryStyles.HeroTitle>
            <CountryStyles.HeroSubtitle>
              행정구역, 자연 지리, 인프라를 지도와 목록으로 확인할 수 있습니다.
            </CountryStyles.HeroSubtitle>
          </CountryStyles.HeroTextGroup>
        </CountryStyles.HeroContent>
      </CountryStyles.GlobalDashboardHero>

      {/* 탭 + 요약 스트립 — 행정조직과 동일 구조 (탭 위 라벨 없음, 탭 아래 KPI 스트립) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Styled.MapRegionTabNav>
          <Styled.MapRegionTabButton
            type="button"
            $active={viewMode === 'administrative'}
            onClick={() => setViewMode('administrative')}
          >
            행정구역
          </Styled.MapRegionTabButton>
          <Styled.MapRegionTabButton
            type="button"
            $active={viewMode === 'nature'}
            onClick={() => setViewMode('nature')}
          >
            자연 지리
          </Styled.MapRegionTabButton>
          <Styled.MapRegionTabButton
            type="button"
            $active={viewMode === 'infrastructure'}
            onClick={() => setViewMode('infrastructure')}
          >
            인프라
          </Styled.MapRegionTabButton>
        </Styled.MapRegionTabNav>

        {/* 요약 스트립 — 행정조직 KPI 스트립과 동일 톤 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
            padding: '20px 28px',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              현재 보기
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.03em',
              }}
            >
              {viewMode === 'administrative'
                ? '행정구역'
                : viewMode === 'nature'
                  ? '자연 지리'
                  : '인프라'}
            </span>
          </div>
          {viewMode === 'administrative' && (
            <>
              <span
                style={{
                  width: 1,
                  height: 24,
                  background: '#e2e8f0',
                  borderRadius: 1,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#64748b',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  1차 행정구역
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {mockAdministrativeRegions.level1.length}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#64748b',
                      marginLeft: 2,
                    }}
                  >
                    개
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 행정구역 모드 — 행정조직과 동일한 UI 패턴(섹션+카드+단순 목록) */}
      {viewMode === 'administrative' && (
        <MapRegionAdministrativeView
          country={country}
          mapLocation={mapLocation}
          onCityClick={onCityClick}
        />
      )}

      {/* 레거시 행정구역 UI (미사용, 새 MapRegionAdministrativeView 사용) */}
      {false && viewMode === 'administrative' && (
        <section aria-label="지도 및 행정구역 (legacy)">
          <Styled.MapRegionSectionLabel>지도 및 행정구역</Styled.MapRegionSectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '35% 1fr',
              gap: 24,
              height: 'calc(100vh - 320px)',
              minHeight: 560,
            }}
          >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: '100%',
            }}
          >
            <div
              style={{
                height: '280px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                {country.latitude && country.longitude ? (
                  <S.MapContainer>
                    <GoogleMap
                      latitude={currentMapLocation.latitude}
                      longitude={currentMapLocation.longitude}
                      name={currentMapLocation.name}
                      zoom={mapLocation ? 12 : 6}
                    />
                  </S.MapContainer>
                ) : (
                  <S.MapPlaceholder>
                    <S.MapPlaceholderText>
                      지도 정보가 없습니다
                    </S.MapPlaceholderText>
                  </S.MapPlaceholder>
                )}
              </div>
            </div>

            {/* 행정구역 리스트 카드 — 행정조직 카드와 동일 톤 */}
            <div
              style={{
                flex: '1',
                minHeight: '0',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                overflow: 'visible',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 8px 20px rgba(0, 0, 0, 0.06)'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >

              {/* 헤더 — 행정조직 탭 톤 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#ffffff',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  {navigation.level !== 'level1' && (
                    <button
                      onClick={handleBackNavigation}
                      title="뒤로가기"
                      type="button"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eef2ff'
                        e.currentTarget.style.borderColor = '#6366f1'
                        const svg = e.currentTarget.querySelector('svg')
                        if (svg) svg.setAttribute('stroke', '#6366f1')
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        const svg = e.currentTarget.querySelector('svg')
                        if (svg) svg.setAttribute('stroke', '#64748b')
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                  )}
                  <span style={{ fontSize: '18px' }}>🗺️</span>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {getSelectedRegionName()}
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6366f1',
                    background: '#eef2ff',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {filteredData.length}개
                </div>
              </div>

              {/* 검색 필터 — 행정조직 input 톤 */}
              <div
                style={{
                  padding: '12px 20px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      pointerEvents: 'none',
                    }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="행정구역 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '13px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1'
                      e.currentTarget.style.boxShadow =
                        '0 0 0 3px rgba(99, 102, 241, 0.15)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#e2e8f0',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#cbd5e1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#e2e8f0'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Breadcrumb */}
              {navigation.level !== 'level1' && (
                <div
                  style={{
                    padding: '8px 20px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {getBreadcrumbPath().map((pathItem, idx, arr) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          onClick={() => handleBreadcrumbClick(pathItem.level)}
                          style={{
                            fontSize: '11px',
                            color:
                              idx === arr.length - 1 ? '#4f46e5' : '#64748b',
                            cursor:
                              idx === arr.length - 1 ? 'default' : 'pointer',
                            fontWeight: idx === arr.length - 1 ? 700 : 600,
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (idx !== arr.length - 1) {
                              e.currentTarget.style.color = '#6366f1'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (idx !== arr.length - 1) {
                              e.currentTarget.style.color = '#64748b'
                            }
                          }}
                        >
                          {pathItem.label}
                        </span>
                        {idx < arr.length - 1 && (
                          <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
                            ›
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 카테고리 필터 (Level1에서만) */}
              {navigation.level === 'level1' && (
                <div
                  style={{
                    padding: '12px 20px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: 600,
                    }}
                  >
                    전체
                  </button>
                  {mockAdministrativeRegions.level1.map((region) => (
                    <button
                      type="button"
                      key={region.id}
                      onClick={() => handleLevel1Click(region.id)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        background:
                          selectedRegionId === region.id ? '#eef2ff' : '#fff',
                        color:
                          selectedRegionId === region.id
                            ? '#4f46e5'
                            : '#64748b',
                        border: `1px solid ${selectedRegionId === region.id ? '#6366f1' : '#e5e7eb'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: 600,
                        boxShadow:
                          selectedRegionId === region.id
                            ? '0 2px 8px rgba(99, 102, 241, 0.12)'
                            : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRegionId !== region.id) {
                          e.currentTarget.style.borderColor = '#c7d2fe'
                          e.currentTarget.style.backgroundColor = '#f8fafc'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRegionId !== region.id) {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.backgroundColor = '#fff'
                        }
                      }}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              )}

              {/* 리스트 */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '18px 22px',
                  background: '#ffffff',
                }}
              >
                {navigation.level === 'level1' && (
                  <div>
                    {mockAdministrativeRegions.level1.map((region, index) => (
                      <div
                        key={region.id}
                        onClick={() => handleLevel1Click(region.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '120px 1fr',
                          gap: '14px',
                          cursor: 'pointer',
                          borderRadius: '14px',
                          border:
                            selectedRegionId === region.id
                              ? '1px solid #6366f1'
                              : '1px solid #e5e7eb',
                          background: '#ffffff',
                          boxShadow:
                            selectedRegionId === region.id
                              ? '0 2px 8px rgba(99, 102, 241, 0.15)'
                              : '0 1px 2px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          padding: '14px',
                          marginBottom:
                            index < mockAdministrativeRegions.level1.length - 1
                              ? '12px'
                              : '0',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRegionId !== region.id) {
                            e.currentTarget.style.borderColor = '#c7d2fe'
                            e.currentTarget.style.boxShadow =
                              '0 2px 8px rgba(99, 102, 241, 0.12)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRegionId !== region.id) {
                            e.currentTarget.style.borderColor = '#e5e7eb'
                            e.currentTarget.style.boxShadow =
                              '0 1px 2px rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        {/* 썸네일 - 120px */}
                        <div
                          style={{
                            width: '120px',
                            height: '90px',
                            borderRadius: '10px',
                            background: '#eef2ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #c7d2fe',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: 0.5 }}
                          >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              background: '#ffffff',
                              color: '#4f46e5',
                              borderRadius: '6px',
                              fontWeight: 700,
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            }}
                          >
                            {region.type}
                          </div>
                        </div>

                        {/* 내용 */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            flex: 1,
                            padding: '4px 0',
                          }}
                        >
                          {/* 지역명 + 하위 행정구역 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 800,
                                color: '#0f172a',
                                lineHeight: '1.3',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {region.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#4f46e5',
                                fontWeight: 600,
                                background: '#eef2ff',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              {region.count}개
                            </div>
                          </div>

                          {/* 메타 정보 그리드 */}
                          {mockCityDetails[region.id] && (
                            <>
                              {/* 도지사/시장 + 정당 */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    fontSize: '12px',
                                    color: '#475569',
                                    fontWeight: 600,
                                  }}
                                >
                                  {mockCityDetails[region.id].mayor}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    background:
                                      mockCityDetails[region.id].party ===
                                      '국민의힘'
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                        : mockCityDetails[region.id].party ===
                                            '더불어민주당'
                                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                          : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                                  }}
                                >
                                  {mockCityDetails[region.id].party}
                                </div>
                              </div>

                              {/* 인구 + 면적 */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px',
                                }}
                              >
                                {mockCityDetails[region.id].population && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 10px',
                                      background: '#ffffff',
                                      borderRadius: '8px',
                                      border: '1px solid #e5e7eb',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        color: '#64748b',
                                        fontWeight: 600,
                                      }}
                                    >
                                      인구
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#0f172a',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {mockCityDetails[region.id].population}
                                    </span>
                                  </div>
                                )}
                                {mockCityDetails[region.id].area && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 10px',
                                      background: '#ffffff',
                                      borderRadius: '8px',
                                      border: '1px solid #e5e7eb',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        color: '#64748b',
                                        fontWeight: 600,
                                      }}
                                    >
                                      면적
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#0f172a',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {mockCityDetails[region.id].area}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {navigation.level === 'level2' && (
                  <div>
                    {getCurrentLevelData().map(
                      (
                        item: {
                          id: string
                          name: string
                          population?: string
                          area?: string
                        },
                        index: number,
                      ) => (
                        <div
                          key={item.id}
                          onClick={() => handleLevel2Click(item)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr',
                            gap: '14px',
                            cursor: 'pointer',
                            borderRadius: '14px',
                            border:
                              selectedCityId === item.id
                                ? '1px solid #6366f1'
                                : '1px solid #e5e7eb',
                            background: '#ffffff',
                            boxShadow:
                              selectedCityId === item.id
                                ? '0 2px 8px rgba(99, 102, 241, 0.15)'
                                : '0 1px 2px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s ease',
                            overflow: 'hidden',
                            padding: '14px',
                            marginBottom:
                              index < getCurrentLevelData().length - 1
                                ? '12px'
                                : '0',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedCityId !== item.id) {
                              e.currentTarget.style.borderColor = '#c7d2fe'
                              e.currentTarget.style.boxShadow =
                                '0 2px 8px rgba(99, 102, 241, 0.12)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCityId !== item.id) {
                              e.currentTarget.style.borderColor = '#e5e7eb'
                              e.currentTarget.style.boxShadow =
                                '0 1px 2px rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          {/* 썸네일 - 120px */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '10px',
                              background: '#eef2ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #c7d2fe',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '36px',
                                filter: 'grayscale(0.2) opacity(0.7)',
                              }}
                            >
                              🏙️
                            </div>
                          </div>

                          {/* 내용 */}
                          <div
                            style={{
                              padding: '4px 0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 800,
                                color: '#0f172a',
                                lineHeight: '1.5',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {item.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: '8px',
                                borderTop: '1px solid #e5e7eb',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    fontWeight: 500,
                                  }}
                                >
                                  👥 {item.population}
                                </span>
                                {item.area && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: '#64748b',
                                      fontWeight: 500,
                                    }}
                                  >
                                    📍 {item.area}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 선택한 지역의 상세 정보 (65%) — 행정조직 카드 톤 */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              maxHeight: '800px',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
              e.currentTarget.style.borderColor = '#e5e7eb'
            }}
          >

            {/* Level1에서도 표시, selectedCityDetails가 있을 때도 표시 */}
            {levelStats || navigation.level === 'level1' ? (
              <>
                {/* 헤더 — 행정조직 톤 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: 0,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {selectedCityId
                        ? getCurrentLevelData().find(
                            (item: { id: string; name: string }) =>
                              item.id === selectedCityId,
                          )?.name || '지역 정보'
                        : navigation.level === 'level1'
                          ? '대한민국 행정구역'
                          : getSelectedRegionName()}
                    </h3>
                  </div>
                  {selectedCityDetails && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {selectedCityDetails.mayor}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#1e40af',
                          background: '#eff6ff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {selectedCityDetails.party}
                      </span>
                    </div>
                  )}
                </div>

                {/* 선택된 지역의 경로 표시 (동적) — 인디고 액센트 */}
                {selectedCityDetails && (
                  <div
                    style={{
                      padding: '10px 20px',
                      background: '#eef2ff',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>
                      {adminSystem?.countryNameKo}
                    </span>
                    <span style={{ color: '#6366f1' }}>›</span>
                    {navigation.selectedLevel1 && (
                      <>
                        <span style={{ fontWeight: 700 }}>
                          {
                            mockAdministrativeRegions.level1.find(
                              (r) => r.id === navigation.selectedLevel1,
                            )?.name
                          }
                        </span>
                        {selectedCityId &&
                          navigation.selectedLevel1 !== selectedCityId && (
                            <>
                              <span style={{ color: '#6366f1' }}>›</span>
                              <span
                                style={{ fontWeight: 800, color: '#4f46e5' }}
                              >
                                {
                                  getCurrentLevelData().find(
                                    (item: { id: string; name: string }) =>
                                      item.id === selectedCityId,
                                  )?.name
                                }
                              </span>
                            </>
                          )}
                      </>
                    )}
                  </div>
                )}

                {/* Level1일 때는 탭 없이 행정구역 체계만 간단하게 표시 */}
                {navigation.level === 'level1' && !selectedCityId ? (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '20px',
                      background: '#ffffff',
                    }}
                  >
                    {/* 행정구역 체계 - 한 줄 요약 */}
                    {adminSystem && (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '12px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="10" r="3" />
                            <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                          </svg>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {adminSystem.countryNameKo} 행정구역 체계
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {adminSystem.levels.map((level, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#64748b',
                                }}
                              >
                                {level.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                }}
                              >
                                {level.count.toLocaleString()}
                              </span>
                              {idx < adminSystem.levels.length - 1 && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: '#cbd5e1',
                                    margin: '0 4px',
                                  }}
                                >
                                  •
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 전체 통계 - 한 줄 요약 */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '12px',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#0f172a',
                              marginBottom: '4px',
                            }}
                          >
                            {mockAdministrativeRegions.level1.length}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            광역시도
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#0f172a',
                              marginBottom: '4px',
                            }}
                          >
                            {adminSystem?.levels[1]?.count.toLocaleString() ||
                              '226'}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            시군구
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#0f172a',
                              marginBottom: '4px',
                            }}
                          >
                            {adminSystem?.levels[2]?.count.toLocaleString() ||
                              '3,482'}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            읍면동
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              color: '#0f172a',
                              marginBottom: '4px',
                            }}
                          >
                            51.8M
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            인구
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 안내 메시지 */}
                    <div
                      style={{
                        padding: '20px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          margin: '0 auto 12px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: '2px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="10" r="3" />
                          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#475569',
                          marginBottom: '6px',
                        }}
                      >
                        좌측 리스트에서 지역을 선택하세요
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontWeight: 500,
                        }}
                      >
                        광역시도를 선택하면 상세 정보를 확인할 수 있습니다
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 탭 메뉴 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        padding: '16px 20px',
                        background: '#ffffff',
                      }}
                    >
                      {[
                        { key: 'overview', label: '개요' },
                        { key: 'institutions', label: '기관' },
                        { key: 'tourism', label: '관광' },
                        { key: 'statistics', label: '통계' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setDetailTab(tab.key as DetailTabType)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            border:
                              detailTab === tab.key
                                ? '1px solid #6366f1'
                                : '1px solid #e5e7eb',
                            borderRadius: '10px',
                            background:
                              detailTab === tab.key ? '#eef2ff' : '#ffffff',
                            color:
                              detailTab === tab.key ? '#4f46e5' : '#64748b',
                            fontSize: '13px',
                            fontWeight: detailTab === tab.key ? 700 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow:
                              detailTab === tab.key
                                ? '0 2px 8px rgba(99, 102, 241, 0.12)'
                                : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (detailTab !== tab.key) {
                              e.currentTarget.style.borderColor = '#c7d2fe'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (detailTab !== tab.key) {
                              e.currentTarget.style.borderColor = '#e5e7eb'
                              e.currentTarget.style.background = '#ffffff'
                            }
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* 탭 컨텐츠 */}
                    <div
                      style={{
                        flex: 1,
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          padding: '20px',
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* 개요 탭 */}
                        {detailTab === 'overview' && selectedCityDetails && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                            }}
                          >
                            {/* 지역 설명 */}
                            <div
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '16px',
                                fontSize: '13px',
                                color: '#475569',
                                lineHeight: '1.6',
                              }}
                            >
                              {getCurrentLevelData().find(
                                (item: { id: string; name: string }) =>
                                  item.id === selectedCityId,
                              )?.name || ''}
                              은(는) {adminSystem?.countryNameKo}의 주요
                              행정구역입니다.
                            </div>

                            {/* 주요 정보 그리드 (3열) */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                              }}
                            >
                              <div
                                style={{
                                  background: '#ffffff',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  도지사/시장
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    marginBottom: '4px',
                                  }}
                                >
                                  {selectedCityDetails.mayor}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#1e40af',
                                    background: '#eff6ff',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    display: 'inline-block',
                                  }}
                                >
                                  {selectedCityDetails.party}
                                </div>
                              </div>
                              <div
                                style={{
                                  background: '#ffffff',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  설립일
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                  }}
                                >
                                  1995년 1월 1일
                                </div>
                              </div>
                              <div
                                style={{
                                  background: '#ffffff',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  행정구역 코드
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                  }}
                                >
                                  {selectedCityId}
                                </div>
                              </div>
                              <div
                                style={{
                                  background: '#ffffff',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  하위 행정구역
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                  }}
                                >
                                  {selectedCities.length > 0
                                    ? `${selectedCities.length}개`
                                    : '정보 없음'}
                                </div>
                              </div>
                              <div
                                style={{
                                  background: '#ffffff',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  인구 밀도
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                  }}
                                >
                                  {selectedCityDetails.population &&
                                  selectedCityDetails.area
                                    ? `${Math.round(
                                        parseInt(
                                          selectedCityDetails.population.replace(
                                            /,/g,
                                            '',
                                          ),
                                        ) /
                                          parseFloat(
                                            selectedCityDetails.area.replace(
                                              'km²',
                                              '',
                                            ),
                                          ),
                                      ).toLocaleString()}명/km²`
                                    : '정보 없음'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 개요 탭 - 선택 없을 때 */}
                        {detailTab === 'overview' && !selectedCityDetails && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1,
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: '80px',
                                height: '80px',
                                background:
                                  'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '36px',
                                marginBottom: '24px',
                                border: '2px solid #bfdbfe',
                              }}
                            >
                              📊
                            </div>
                            <h3
                              style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#0f172a',
                                margin: '0 0 12px 0',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              전체 통계를 확인하세요
                            </h3>
                            <p
                              style={{
                                fontSize: '13px',
                                color: '#64748b',
                                lineHeight: '1.6',
                                margin: 0,
                                fontWeight: 500,
                                maxWidth: '400px',
                              }}
                            >
                              상단 KPI 카드에서 전체 행정구역의 집계 통계를
                              확인하실 수 있습니다.
                              <br />
                              좌측에서 특정 지역을 선택하면 해당 지역의 상세
                              정보를 볼 수 있습니다.
                            </p>
                          </div>
                        )}

                        {/* 기관 탭 (대학 + 기업) */}
                        {detailTab === 'institutions' &&
                          selectedCityDetails && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                              }}
                            >
                              {/* 대학 섹션 */}
                              {selectedCityDetails.universities &&
                                selectedCityDetails.universities.length > 0 && (
                                  <>
                                    <div
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        marginBottom: '8px',
                                        paddingBottom: '8px',
                                        borderBottom: '2px solid #e2e8f0',
                                      }}
                                    >
                                      대학 (
                                      {selectedCityDetails.universities.length})
                                    </div>
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '12px',
                                      }}
                                    >
                                      {selectedCityDetails.universities.map(
                                        (university, idx) => (
                                          <div
                                            key={idx}
                                            style={{
                                              background: '#ffffff',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '10px',
                                              padding: '14px',
                                              transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor =
                                                '#3b82f6'
                                              e.currentTarget.style.boxShadow =
                                                '0 4px 12px rgba(59, 130, 246, 0.1)'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor =
                                                '#e2e8f0'
                                              e.currentTarget.style.boxShadow =
                                                'none'
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                color: '#0f172a',
                                                marginBottom: '8px',
                                              }}
                                            >
                                              {university.name}
                                            </div>
                                            <div
                                              style={{
                                                display: 'flex',
                                                gap: '8px',
                                                fontSize: '12px',
                                              }}
                                            >
                                              <span
                                                style={{
                                                  padding: '4px 10px',
                                                  background: '#eff6ff',
                                                  color: '#1e40af',
                                                  borderRadius: '6px',
                                                  fontWeight: 600,
                                                  border: '1px solid #bfdbfe',
                                                }}
                                              >
                                                {university.type}
                                              </span>
                                              <span
                                                style={{
                                                  padding: '4px 10px',
                                                  background: '#f8fafc',
                                                  color: '#64748b',
                                                  borderRadius: '6px',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {university.students}
                                              </span>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </>
                                )}

                              {/* 기업 섹션 */}
                              {selectedCityDetails.companies &&
                                selectedCityDetails.companies.length > 0 && (
                                  <>
                                    <div
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        marginBottom: '8px',
                                        marginTop: '8px',
                                        paddingBottom: '8px',
                                        borderBottom: '2px solid #e2e8f0',
                                      }}
                                    >
                                      주요 기업 (
                                      {selectedCityDetails.companies.length})
                                    </div>
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '12px',
                                      }}
                                    >
                                      {selectedCityDetails.companies.map(
                                        (company, idx) => (
                                          <div
                                            key={idx}
                                            style={{
                                              background: '#ffffff',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '10px',
                                              padding: '14px',
                                              transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor =
                                                '#3b82f6'
                                              e.currentTarget.style.boxShadow =
                                                '0 4px 12px rgba(59, 130, 246, 0.1)'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor =
                                                '#e2e8f0'
                                              e.currentTarget.style.boxShadow =
                                                'none'
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                color: '#0f172a',
                                                marginBottom: '8px',
                                              }}
                                            >
                                              {company.name}
                                            </div>
                                            <div
                                              style={{
                                                display: 'flex',
                                                gap: '8px',
                                                fontSize: '12px',
                                              }}
                                            >
                                              <span
                                                style={{
                                                  padding: '4px 10px',
                                                  background: '#eff6ff',
                                                  color: '#1e40af',
                                                  borderRadius: '6px',
                                                  fontWeight: 600,
                                                  border: '1px solid #bfdbfe',
                                                }}
                                              >
                                                {company.sector}
                                              </span>
                                              <span
                                                style={{
                                                  padding: '4px 10px',
                                                  background: '#f8fafc',
                                                  color: '#64748b',
                                                  borderRadius: '6px',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {company.employees}
                                              </span>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </>
                                )}
                            </div>
                          )}

                        {/* 기관 탭 - Empty */}
                        {detailTab === 'institutions' &&
                          !selectedCityDetails && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: 1,
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '48px',
                                  marginBottom: '16px',
                                }}
                              >
                                🏛️
                              </div>
                              <h3
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  marginBottom: '8px',
                                }}
                              >
                                지역을 선택해주세요
                              </h3>
                              <p
                                style={{
                                  fontSize: '13px',
                                  color: '#64748b',
                                  margin: 0,
                                }}
                              >
                                좌측에서 지역을 선택하면 대학, 기업 정보를
                                확인할 수 있습니다
                              </p>
                            </div>
                          )}

                        {/* 관광 탭 */}
                        {detailTab === 'tourism' && selectedCityDetails && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '8px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid #e2e8f0',
                              }}
                            >
                              관광 명소 (
                              {selectedCityDetails.attractions?.length || 0})
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '12px',
                              }}
                            >
                              {selectedCityDetails.attractions?.map(
                                (attraction, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '10px',
                                      padding: '14px',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor =
                                        '#3b82f6'
                                      e.currentTarget.style.boxShadow =
                                        '0 4px 12px rgba(59, 130, 246, 0.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor =
                                        '#e2e8f0'
                                      e.currentTarget.style.boxShadow = 'none'
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        marginBottom: '8px',
                                      }}
                                    >
                                      {attraction.name}
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '8px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          padding: '4px 10px',
                                          background: '#eff6ff',
                                          color: '#1e40af',
                                          borderRadius: '6px',
                                          fontWeight: 600,
                                          border: '1px solid #bfdbfe',
                                        }}
                                      >
                                        {attraction.type}
                                      </span>
                                      <span
                                        style={{
                                          padding: '4px 10px',
                                          background: '#f8fafc',
                                          color: '#64748b',
                                          borderRadius: '6px',
                                          fontWeight: 600,
                                        }}
                                      >
                                        {attraction.visitors}
                                      </span>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* 관광 탭 - Empty */}
                        {detailTab === 'tourism' && !selectedCityDetails && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1,
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{ fontSize: '48px', marginBottom: '16px' }}
                            >
                              🎭
                            </div>
                            <h3
                              style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '8px',
                              }}
                            >
                              지역을 선택해주세요
                            </h3>
                            <p
                              style={{
                                fontSize: '13px',
                                color: '#64748b',
                                margin: 0,
                              }}
                            >
                              좌측에서 지역을 선택하면 관광 명소 정보를 확인할
                              수 있습니다
                            </p>
                          </div>
                        )}

                        {/* 통계 탭 */}
                        {detailTab === 'statistics' && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flex: 1,
                              background: '#f8fafc',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '8px',
                              }}
                            >
                              통계 데이터 준비 중
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                                fontWeight: 500,
                              }}
                            >
                              더 많은 통계 데이터가 곧 제공됩니다
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '100px 40px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  margin: '20px',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    background:
                      'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#3b82f6',
                    marginBottom: '28px',
                    border: '3px solid #93c5fd',
                    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)',
                  }}
                >
                  행정구역
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 12px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  지역을 선택해주세요
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.6',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  좌측 목록에서 행정구역을 선택하시면
                  <br />
                  해당 지역의 상세 정보를 확인하실 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
        </section>
      )}

      {/* 자연지리 모드 — 행정구역과 동일 UI (SectionLabel, pill 필터, 카드) */}
      {viewMode === 'nature' && (
        <MapRegionNatureView country={country} />
      )}
      {/* 인프라 모드 — 행정구역과 동일 UI (SectionLabel, pill 필터, 카드) */}
      {viewMode === 'infrastructure' && (
        <MapRegionInfrastructureView country={country} />
      )}
    </motion.div>
  )
}
