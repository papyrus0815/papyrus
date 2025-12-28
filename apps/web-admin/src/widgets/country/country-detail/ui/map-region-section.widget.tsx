import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'

import { GoogleMap } from '@/shared/ui/GoogleMap'

// Mock 데이터 import
import {
  administrativeSystemByCountry,
  getCountryCode,
  mockAdministrativeRegions,
  mockCityDetails,
  mockInfrastructureData,
  mockNatureData,
} from '../mock'
import * as S from './CountryDetail.styles'
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
  const [selectedNatureItem, setSelectedNatureItem] = useState<string | null>(
    null,
  )
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [natureFilter, setNatureFilter] = useState<
    'all' | 'mountains' | 'rivers' | 'lakes' | 'coastlines'
  >('all')

  // ⚡ 인프라 상태
  const [infraFilter, setInfraFilter] = useState<
    'all' | 'highways' | 'railways' | 'airports' | 'ports'
  >('all')
  const [selectedInfraItem, setSelectedInfraItem] = useState<string | null>(
    null,
  )
  const [infraImageIndex, setInfraImageIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showAdminSystem, setShowAdminSystem] = useState<boolean>(false) // 행정구역 체계 토글

  const currentMapLocation = mapLocation || {
    latitude: country.latitude || 0,
    longitude: country.longitude || 0,
    name: country.name,
  }

  // 선택 항목 변경 시 이미지 인덱스 리셋
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [selectedNatureItem])

  useEffect(() => {
    setInfraImageIndex(0)
  }, [selectedInfraItem])

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* 🎯 View Mode Selector */}
      {/* 카테고리 선택 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
          padding: '0 4px',
        }}
      >
        <motion.button
          onClick={() => setViewMode('administrative')}
          whileHover={{ scale: viewMode !== 'administrative' ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 16px',
            border: 'none',
            borderRadius: '16px',
            background:
              viewMode === 'administrative'
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              viewMode === 'administrative'
                ? '0 8px 24px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.1) inset'
                : '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'administrative') {
              e.currentTarget.style.boxShadow =
                '0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'administrative') {
              e.currentTarget.style.boxShadow =
                '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }
          }}
        >
          {/* Glow effect for active state */}
          {viewMode === 'administrative' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Icon Container */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background:
                viewMode === 'administrative'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow:
                viewMode === 'administrative'
                  ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                  : '0 2px 8px rgba(59, 130, 246, 0.15)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={viewMode === 'administrative' ? '#ffffff' : '#3b82f6'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: viewMode === 'administrative' ? '#ffffff' : '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              행정구역
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color:
                  viewMode === 'administrative'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : '#64748b',
              }}
            >
              Administrative
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setViewMode('nature')}
          whileHover={{ scale: viewMode !== 'nature' ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 16px',
            border: 'none',
            borderRadius: '16px',
            background:
              viewMode === 'nature'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              viewMode === 'nature'
                ? '0 8px 24px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(16, 185, 129, 0.1) inset'
                : '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'nature') {
              e.currentTarget.style.boxShadow =
                '0 4px 16px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.2) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'nature') {
              e.currentTarget.style.boxShadow =
                '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }
          }}
        >
          {/* Glow effect for active state */}
          {viewMode === 'nature' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Icon Container */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background:
                viewMode === 'nature'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow:
                viewMode === 'nature'
                  ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                  : '0 2px 8px rgba(16, 185, 129, 0.15)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={viewMode === 'nature' ? '#ffffff' : '#10b981'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 18a5 5 0 0 0-10 0" />
              <line x1="12" y1="2" x2="12" y2="9" />
              <path d="M4.93 6.93L10.5 12.5" />
              <path d="M19.07 6.93L13.5 12.5" />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: viewMode === 'nature' ? '#ffffff' : '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              자연 지리
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color:
                  viewMode === 'nature'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : '#64748b',
              }}
            >
              Nature
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setViewMode('infrastructure')}
          whileHover={{ scale: viewMode !== 'infrastructure' ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 16px',
            border: 'none',
            borderRadius: '16px',
            background:
              viewMode === 'infrastructure'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              viewMode === 'infrastructure'
                ? '0 8px 24px rgba(245, 158, 11, 0.35), 0 0 0 1px rgba(245, 158, 11, 0.1) inset'
                : '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'infrastructure') {
              e.currentTarget.style.boxShadow =
                '0 4px 16px rgba(245, 158, 11, 0.15), 0 0 0 1px rgba(245, 158, 11, 0.2) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'infrastructure') {
              e.currentTarget.style.boxShadow =
                '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8) inset'
              e.currentTarget.style.background =
                'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }
          }}
        >
          {/* Glow effect for active state */}
          {viewMode === 'infrastructure' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Icon Container */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background:
                viewMode === 'infrastructure'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow:
                viewMode === 'infrastructure'
                  ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                  : '0 2px 8px rgba(245, 158, 11, 0.15)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={viewMode === 'infrastructure' ? '#ffffff' : '#f59e0b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: viewMode === 'infrastructure' ? '#ffffff' : '#1e293b',
                letterSpacing: '-0.02em',
              }}
            >
              인프라
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color:
                  viewMode === 'infrastructure'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : '#64748b',
              }}
            >
              Infrastructure
            </div>
          </div>
        </motion.button>
      </div>

      {/* 🏛️ 행정구역 모드 */}
      {viewMode === 'administrative' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '35% 1fr',
            gap: '16px',
            height: 'calc(100vh - 300px)',
            minHeight: '600px',
          }}
        >
          {/* 좌측: 지도 + 행정구역 리스트 (35%) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: '100%',
            }}
          >
            {/* 지도 + 행정구역 체계 오버레이 */}
            <div
              style={{
                height: '280px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '14px',
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

            {/* 행정구역 리스트 */}
            <div
              style={{
                flex: '1',
                minHeight: '0',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'visible',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(0, 0, 0, 0.08)'
                const gradientEl = e.currentTarget.querySelector(
                  '.hover-gradient',
                ) as HTMLElement
                if (gradientEl) gradientEl.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 8px rgba(0, 0, 0, 0.04)'
                const gradientEl = e.currentTarget.querySelector(
                  '.hover-gradient',
                ) as HTMLElement
                if (gradientEl) gradientEl.style.opacity = '0'
              }}
            >
              {/* 상단 그라데이션 라인 (hover 시에만) */}
              <div
                className="hover-gradient"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background:
                    'linear-gradient(90deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%, #4285f4 100%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  zIndex: 10,
                  borderTopLeftRadius: '14px',
                  borderTopRightRadius: '14px',
                }}
              />

              {/* 헤더 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #f1f5f9',
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
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                        e.currentTarget.style.borderColor = '#e2e8f0'
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
                    fontWeight: 700,
                    color: '#64748b',
                    background: '#f8fafc',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {filteredData.length}개
                </div>
              </div>

              {/* 검색 필터 */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
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
                      padding: '8px 12px 8px 38px',
                      fontSize: '13px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.boxShadow =
                        '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
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
                    padding: '8px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
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
                              idx === arr.length - 1 ? '#3b82f6' : '#64748b',
                            cursor:
                              idx === arr.length - 1 ? 'default' : 'pointer',
                            fontWeight: idx === arr.length - 1 ? 700 : 600,
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (idx !== arr.length - 1) {
                              e.currentTarget.style.color = '#3b82f6'
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
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => {
                      // 전체 필터 로직
                    }}
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      background:
                        'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                      color: '#ffffff',
                      border: '2px solid #1e293b',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(30, 41, 59, 0.3)',
                      transform: 'translateY(-1px)',
                    }}
                  >
                    전체
                  </button>
                  {mockAdministrativeRegions.level1.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => handleLevel1Click(region.id)}
                      style={{
                        padding: '7px 14px',
                        fontSize: '12px',
                        background:
                          selectedRegionId === region.id
                            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                            : '#fff',
                        color:
                          selectedRegionId === region.id
                            ? '#1e40af'
                            : '#64748b',
                        border: `2px solid ${selectedRegionId === region.id ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: 700,
                        boxShadow:
                          selectedRegionId === region.id
                            ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                            : 'none',
                        transform:
                          selectedRegionId === region.id
                            ? 'translateY(-1px)'
                            : 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRegionId !== region.id) {
                          e.currentTarget.style.borderColor = '#3b82f6'
                          e.currentTarget.style.backgroundColor =
                            'rgba(239, 246, 255, 0.5)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRegionId !== region.id) {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.backgroundColor = '#fff'
                          e.currentTarget.style.transform = 'translateY(0)'
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
                          borderRadius: '12px',
                          border:
                            selectedRegionId === region.id
                              ? '1px solid #4285f4'
                              : '1px solid #f1f5f9',
                          background: '#ffffff',
                          boxShadow:
                            selectedRegionId === region.id
                              ? '0 6px 20px rgba(66, 133, 244, 0.25)'
                              : '0 1px 3px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                          padding: '12px',
                          marginBottom:
                            index < mockAdministrativeRegions.level1.length - 1
                              ? '12px'
                              : '0',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4285f4'
                          e.currentTarget.style.boxShadow =
                            '0 6px 20px rgba(66, 133, 244, 0.25)'
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRegionId !== region.id) {
                            e.currentTarget.style.borderColor = '#f1f5f9'
                            e.currentTarget.style.boxShadow =
                              '0 1px 3px rgba(0, 0, 0, 0.03)'
                          }
                        }}
                      >
                        {/* 썸네일 - 120px */}
                        <div
                          style={{
                            width: '120px',
                            height: '90px',
                            borderRadius: '8px',
                            background:
                              'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #3b82f6',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              opacity: 0.5,
                            }}
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
                              color: '#1e40af',
                              borderRadius: '6px',
                              fontWeight: 800,
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
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
                                color: '#64748b',
                                fontWeight: 600,
                                background: '#f1f5f9',
                                padding: '4px 8px',
                                borderRadius: '6px',
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
                                      background: '#f8fafc',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
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
                                      background: '#f8fafc',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
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
                            borderRadius: '12px',
                            border:
                              selectedCityId === item.id
                                ? '1px solid #10b981'
                                : '1px solid #f1f5f9',
                            background: '#ffffff',
                            boxShadow:
                              selectedCityId === item.id
                                ? '0 6px 20px rgba(16, 185, 129, 0.25)'
                                : '0 1px 3px rgba(0, 0, 0, 0.03)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            overflow: 'hidden',
                            padding: '12px',
                            marginBottom:
                              index < getCurrentLevelData().length - 1
                                ? '12px'
                                : '0',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#10b981'
                            e.currentTarget.style.boxShadow =
                              '0 6px 20px rgba(16, 185, 129, 0.25)'
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCityId !== item.id) {
                              e.currentTarget.style.borderColor = '#f1f5f9'
                              e.currentTarget.style.boxShadow =
                                '0 1px 3px rgba(0, 0, 0, 0.03)'
                            }
                          }}
                        >
                          {/* 썸네일 - 120px */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              background:
                                'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #10b981',
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
                                paddingTop: '4px',
                                borderTop: '1px solid #f1f5f9',
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
                                    fontSize: '10px',
                                    color: '#94a3b8',
                                    fontWeight: 600,
                                  }}
                                >
                                  👥 {item.population}
                                </span>
                                {item.area && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: '#94a3b8',
                                      fontWeight: 600,
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

          {/* 우측: 선택한 지역의 상세 정보 (65%) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              maxHeight: '800px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
              const gradientEl = e.currentTarget.querySelector(
                '.hover-gradient-detail',
              ) as HTMLElement
              if (gradientEl) gradientEl.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
              const gradientEl = e.currentTarget.querySelector(
                '.hover-gradient-detail',
              ) as HTMLElement
              if (gradientEl) gradientEl.style.opacity = '0'
            }}
          >
            {/* 상단 그라데이션 라인 (hover 시에만) */}
            <div
              className="hover-gradient-detail"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background:
                  'linear-gradient(90deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%, #4285f4 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                zIndex: 10,
              }}
            />

            {/* Level1에서도 표시, selectedCityDetails가 있을 때도 표시 */}
            {levelStats || navigation.level === 'level1' ? (
              <>
                {/* 헤더 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #f1f5f9',
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

                {/* 선택된 지역의 경로 표시 (동적) */}
                {selectedCityDetails && (
                  <div
                    style={{
                      padding: '10px 16px',
                      background:
                        'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      borderBottom: '2px solid #bfdbfe',
                      fontSize: '12px',
                      color: '#1e40af',
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
                    <span style={{ color: '#3b82f6' }}>›</span>
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
                              <span style={{ color: '#3b82f6' }}>›</span>
                              <span
                                style={{ fontWeight: 800, color: '#1e40af' }}
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
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '16px',
                          marginBottom: '12px',
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
                            stroke="#3b82f6"
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
                                ? '2px solid #3b82f6'
                                : '2px solid #e2e8f0',
                            borderRadius: '8px',
                            background:
                              detailTab === tab.key
                                ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                                : '#ffffff',
                            color:
                              detailTab === tab.key ? '#1e40af' : '#64748b',
                            fontSize: '13px',
                            fontWeight: detailTab === tab.key ? 700 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (detailTab !== tab.key) {
                              e.currentTarget.style.borderColor = '#cbd5e1'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (detailTab !== tab.key) {
                              e.currentTarget.style.borderColor = '#e2e8f0'
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
      )}

      {/* 🏔️ 자연지리 모드 */}
      {viewMode === 'nature' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '35% 1fr',
            gap: '16px',
            height: 'calc(100vh - 300px)',
            minHeight: '600px',
          }}
        >
          {/* 좌측: 지도 + 자연지리 리스트 (35%) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: '100%',
            }}
          >
            {/* 지도 */}
            <div
              style={{
                height: '280px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
              }}
            >
              {country.latitude && country.longitude ? (
                <S.MapContainer>
                  <GoogleMap
                    latitude={country.latitude}
                    longitude={country.longitude}
                    name={country.name}
                    zoom={7}
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

            {/* 우측: 카테고리 리스트 (40%) */}
            <div
              style={{
                flex: '1',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* 헤더 */}
              <div
                style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  자연 지리
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '4px 0 12px',
                  }}
                >
                  주요 자연 지형 및 수계
                </p>

                {/* 필터 버튼 */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    { value: 'all', label: '전체', color: '#64748b' },
                    { value: 'mountains', label: '산', color: '#10b981' },
                    { value: 'rivers', label: '강', color: '#3b82f6' },
                    { value: 'lakes', label: '호수', color: '#0ea5e9' },
                    { value: 'coastlines', label: '해안', color: '#f59e0b' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setNatureFilter(filter.value as any)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border:
                          natureFilter === filter.value
                            ? `1px solid ${filter.color}`
                            : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background:
                          natureFilter === filter.value
                            ? `${filter.color}10`
                            : '#ffffff',
                        color:
                          natureFilter === filter.value
                            ? filter.color
                            : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (natureFilter !== filter.value) {
                          e.currentTarget.style.background = '#f8fafc'
                          e.currentTarget.style.borderColor = '#cbd5e1'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (natureFilter !== filter.value) {
                          e.currentTarget.style.background = '#ffffff'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 스크롤 영역 */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                }}
              >
                {/* 산 섹션 */}
                {(natureFilter === 'all' || natureFilter === 'mountains') && (
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        paddingLeft: '4px',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 18a5 5 0 0 0-10 0" />
                        <line x1="12" y1="2" x2="12" y2="9" />
                        <path d="M4.93 6.93L10.5 12.5" />
                        <path d="M19.07 6.93L13.5 12.5" />
                      </svg>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        주요 산
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {mockNatureData.mountains?.length || 0}개
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {(mockNatureData.mountains || []).map((mountain) => (
                        <div
                          key={mountain.id}
                          onClick={() => setSelectedNatureItem(mountain.id)}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px',
                            background:
                              selectedNatureItem === mountain.id
                                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                                : '#ffffff',
                            border:
                              selectedNatureItem === mountain.id
                                ? '2px solid #10b981'
                                : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedNatureItem !== mountain.id) {
                              e.currentTarget.style.borderColor = '#cbd5e1'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedNatureItem !== mountain.id) {
                              e.currentTarget.style.borderColor = '#e2e8f0'
                              e.currentTarget.style.background = '#ffffff'
                            }
                          }}
                        >
                          {/* 썸네일 */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              background:
                                'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #10b981',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <path d="M17 18a5 5 0 0 0-10 0" />
                              <line x1="12" y1="2" x2="12" y2="9" />
                              <path d="M4.93 6.93L10.5 12.5" />
                              <path d="M19.07 6.93L13.5 12.5" />
                            </svg>
                          </div>

                          {/* 내용 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '6px',
                              }}
                            >
                              {mountain.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#64748b',
                              }}
                            >
                              <span>{mountain.region}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span>{mountain.height}</span>
                              {mountain.nationalPark && (
                                <>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span
                                    style={{
                                      color: '#10b981',
                                      fontWeight: 600,
                                    }}
                                  >
                                    국립공원
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 강 섹션 */}
                {(natureFilter === 'all' || natureFilter === 'rivers') && (
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        paddingLeft: '4px',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                      </svg>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        주요 강
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {mockNatureData.rivers?.length || 0}개
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {(mockNatureData.rivers || []).map((river) => (
                        <div
                          key={river.id}
                          onClick={() => setSelectedNatureItem(river.id)}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px',
                            background:
                              selectedNatureItem === river.id
                                ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                                : '#ffffff',
                            border:
                              selectedNatureItem === river.id
                                ? '2px solid #3b82f6'
                                : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedNatureItem !== river.id) {
                              e.currentTarget.style.borderColor = '#cbd5e1'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedNatureItem !== river.id) {
                              e.currentTarget.style.borderColor = '#e2e8f0'
                              e.currentTarget.style.background = '#ffffff'
                            }
                          }}
                        >
                          {/* 썸네일 */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              background:
                                'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #3b82f6',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                            </svg>
                          </div>

                          {/* 내용 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '6px',
                              }}
                            >
                              {river.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#64748b',
                                marginBottom: '6px',
                              }}
                            >
                              <span>{river.region}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span>{river.length}</span>
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                fontWeight: 500,
                              }}
                            >
                              {river.source} → {river.mouth}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 호수 섹션 */}
                {(natureFilter === 'all' || natureFilter === 'lakes') && (
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        paddingLeft: '4px',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        주요 호수
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {mockNatureData.lakes?.length || 0}개
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {(mockNatureData.lakes || []).map((lake) => (
                        <div
                          key={lake.id}
                          onClick={() => setSelectedNatureItem(lake.id)}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px',
                            background:
                              selectedNatureItem === lake.id
                                ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
                                : '#ffffff',
                            border:
                              selectedNatureItem === lake.id
                                ? '2px solid #0ea5e9'
                                : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedNatureItem !== lake.id) {
                              e.currentTarget.style.borderColor = '#cbd5e1'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedNatureItem !== lake.id) {
                              e.currentTarget.style.borderColor = '#e2e8f0'
                              e.currentTarget.style.background = '#ffffff'
                            }
                          }}
                        >
                          {/* 썸네일 */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              background:
                                'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #0ea5e9',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#0ea5e9"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          </div>

                          {/* 내용 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '6px',
                              }}
                            >
                              {lake.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#64748b',
                              }}
                            >
                              <span>{lake.region}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span>{lake.area}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span
                                style={{ color: '#0ea5e9', fontWeight: 600 }}
                              >
                                {lake.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 해안선 섹션 */}
                {(natureFilter === 'all' || natureFilter === 'coastlines') && (
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        paddingLeft: '4px',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 18.5A2.5 2.5 0 0 1 7.5 20H4.5a2.5 2.5 0 0 1-2.4-3.2c1.7-4 8-9.8 11.7-10.2.3 0 .5.1.7.3.2.2.3.5.3.7-.4 3.7-6.2 10-10.2 11.7" />
                      </svg>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        주요 해안
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {mockNatureData.coastlines?.length || 0}개
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {(mockNatureData.coastlines || []).map((coast) => (
                        <div
                          key={coast.id}
                          onClick={() => setSelectedNatureItem(coast.id)}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '12px',
                            background:
                              selectedNatureItem === coast.id
                                ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                                : '#ffffff',
                            border:
                              selectedNatureItem === coast.id
                                ? '2px solid #f59e0b'
                                : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedNatureItem !== coast.id) {
                              e.currentTarget.style.borderColor = '#cbd5e1'
                              e.currentTarget.style.background = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedNatureItem !== coast.id) {
                              e.currentTarget.style.borderColor = '#e2e8f0'
                              e.currentTarget.style.background = '#ffffff'
                            }
                          }}
                        >
                          {/* 썸네일 */}
                          <div
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              background:
                                'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #f59e0b',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ opacity: 0.5 }}
                            >
                              <path d="M12 18.5A2.5 2.5 0 0 1 7.5 20H4.5a2.5 2.5 0 0 1-2.4-3.2c1.7-4 8-9.8 11.7-10.2.3 0 .5.1.7.3.2.2.3.5.3.7-.4 3.7-6.2 10-10.2 11.7" />
                            </svg>
                          </div>

                          {/* 내용 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '6px',
                              }}
                            >
                              {coast.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#64748b',
                              }}
                            >
                              <span>{coast.region}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span>{coast.length}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span
                                style={{ color: '#f59e0b', fontWeight: 600 }}
                              >
                                {coast.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: Detail 영역 */}
          <div
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            {!selectedNatureItem ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto 16px',
                      borderRadius: '50%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 18a5 5 0 0 0-10 0" />
                      <line x1="12" y1="2" x2="12" y2="9" />
                      <path d="M4.93 6.93L10.5 12.5" />
                      <path d="M19.07 6.93L13.5 12.5" />
                    </svg>
                  </div>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    자연 지형을 선택해주세요
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      margin: 0,
                    }}
                  >
                    좌측 목록에서 항목을 선택하시면
                    <br />
                    상세 정보를 확인하실 수 있습니다
                  </p>
                </div>
              </div>
            ) : selectedNatureItem === 'm1' ? (
              /* 한라산 Detail */
              <div>
                <div
                  style={{
                    marginBottom: '24px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    한라산
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    제주특별자치도 • 해발 1,947m • 국립공원 • 휴화산
                  </div>
                </div>

                {/* 이미지 갤러리 */}
                {(() => {
                  const images = [
                    {
                      url: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=800&h=400&fit=crop',
                      title: '한라산 전경',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                      title: '백록담',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=800&h=400&fit=crop',
                      title: '등산로',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop',
                      title: '한라산 설경',
                    },
                  ]
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      {/* 메인 이미지 */}
                      <div
                        style={{
                          width: '100%',
                          height: '240px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={images[currentImageIndex].url}
                          alt={images[currentImageIndex].title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {/* 좌측 화살표 */}
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex - 1 + images.length) %
                                images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ‹
                        </button>
                        {/* 우측 화살표 */}
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex + 1) % images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ›
                        </button>
                        {/* 이미지 제목 */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                            padding: '20px 16px 12px',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {images[currentImageIndex].title}
                        </div>
                      </div>
                      {/* 썸네일 */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '8px',
                        }}
                      >
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border:
                                currentImageIndex === idx
                                  ? '2px solid #3b82f6'
                                  : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              opacity: currentImageIndex === idx ? 1 : 0.6,
                              transition: 'all 0.2s',
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* 개요 */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '8px',
                      }}
                    >
                      개요
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      대한민국에서 가장 높은 산으로 제주도 중앙에 위치한
                      휴화산입니다. 백록담을 정상으로 하여 방사상으로 계곡과
                      능선이 발달되어 있으며, 아열대에서 한대까지의 다양한 식물
                      분포를 보입니다.
                    </div>
                  </div>

                  {/* 통계 그리드 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        높이
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        1,947m
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        등산 코스
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        5개
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        소요 시간
                      </div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        9~10시간
                      </div>
                    </div>
                  </div>

                  {/* 역사 */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      역사 및 문화
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 삼국시대:</strong> "부악(釜岳)" 또는
                      "영주산(瀛洲山)"으로 불림
                      <br />
                      <strong>• 고려시대:</strong> "한라산"이라는 이름이 처음
                      기록됨
                      <br />
                      <strong>• 1950년:</strong> 천연보호구역 지정
                      <br />
                      <strong>• 1970년:</strong> 국립공원 지정 (제9호)
                      <br />
                      <strong>• 2007년:</strong> UNESCO 세계자연유산 등재
                    </div>
                  </div>

                  {/* 국립공원 정보 */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      한라산 국립공원
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 면적:</strong> 153.332km²
                      <br />
                      <strong>• 생태계:</strong> 아열대~한대성 식물 수직 분포
                      <br />
                      <strong>• 식물:</strong> 1,800여종 (한국 자생식물의 1/4)
                      <br />
                      <strong>• 동물:</strong> 160여종 조류, 포유류, 곤충 등
                      <br />
                      <strong>• 특징:</strong> 360여 개의 오름(기생화산)
                    </div>
                  </div>

                  {/* 등산 코스 */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      주요 등산 코스
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>1. 성판악 코스:</strong> 9.6km, 왕복 9시간 (가장
                      쉬움)
                      <br />
                      <strong>2. 관음사 코스:</strong> 8.7km, 왕복 10시간
                      <br />
                      <strong>3. 어리목 코스:</strong> 4.7km, 윗세오름대피소까지
                      <br />
                      <strong>4. 영실 코스:</strong> 5.8km, 윗세오름대피소까지
                      <br />
                      <strong>5. 돈내코 코스:</strong> 7km, 남벽분기점까지
                    </div>
                  </div>

                  {/* 백록담 */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      백록담 (白鹿潭)
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 위치:</strong> 한라산 정상
                      <br />
                      <strong>• 형태:</strong> 분화구에 형성된 화구호
                      <br />
                      <strong>• 규모:</strong> 둘레 약 3km, 깊이 약 100m
                      <br />
                      <strong>• 유래:</strong> "흰 사슴이 물을 마시던
                      연못"이라는 전설
                      <br />
                      <strong>• 특징:</strong> 겨울철 결빙, 천연기념물 제182호
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedNatureItem === 'r1' ? (
              /* 한강 Detail */
              <div>
                <div
                  style={{
                    marginBottom: '24px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    한강
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    서울·경기·강원·충청 • 총 514km • 4대강
                  </div>
                </div>

                {/* 이미지 갤러리 */}
                {(() => {
                  const images = [
                    {
                      url: 'https://images.unsplash.com/photo-1583241800698-fa0e32c8b244?w=800&h=400&fit=crop',
                      title: '한강 전경',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                      title: '한강 다리',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop',
                      title: '한강공원',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=800&h=400&fit=crop',
                      title: '반포대교 야경',
                    },
                  ]
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '240px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={images[currentImageIndex].url}
                          alt={images[currentImageIndex].title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex - 1 + images.length) %
                                images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex + 1) % images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ›
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                            padding: '20px 16px 12px',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {images[currentImageIndex].title}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '8px',
                        }}
                      >
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border:
                                currentImageIndex === idx
                                  ? '2px solid #3b82f6'
                                  : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              opacity: currentImageIndex === idx ? 1 : 0.6,
                              transition: 'all 0.2s',
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '8px',
                      }}
                    >
                      개요
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      대한민국의 4대강 중 하나로 남한강과 북한강이 합류하여
                      서해로 흘러가는 강입니다. 유역면적 26,219km²로 한반도 중부
                      지역의 젖줄 역할을 하고 있습니다.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        총 길이
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        514km
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        유역면적
                      </div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        26,219km²
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        한강공원
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        12개
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      역사
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 삼국시대:</strong> "아리수(阿利水)"로 불림 -
                      서울의 옛 이름 유래
                      <br />
                      <strong>• 조선시대:</strong> 한양의 주요 교통로, 세곡
                      운반의 핵심
                      <br />
                      <strong>• 1917년:</strong> 한강인도교(현 한강대교) 건설
                      <br />
                      <strong>• 1980년대:</strong> 한강종합개발사업으로 현대적
                      모습 갖춤
                      <br />
                      <strong>• 현재:</strong> 서울 시민의 대표적 휴식·문화 공간
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      주요 정보
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 발원지:</strong> 강원도 태백시 검룡소 (남한강)
                      <br />
                      <strong>• 하구:</strong> 경기도 김포시 서해
                      <br />
                      <strong>• 주요 지류:</strong> 남한강, 북한강, 중랑천,
                      안양천, 탄천
                      <br />
                      <strong>• 주요 교량:</strong> 한강대교, 잠수교, 반포대교
                      등 31개
                      <br />
                      <strong>• 수도권 인구:</strong> 약 2,500만명 생활용수 공급
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      한강 공원 (12개 지구)
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 상류:</strong> 광나루, 잠실, 뚝섬, 잠원
                      <br />
                      <strong>• 중류:</strong> 반포, 이촌, 여의도, 양화
                      <br />
                      <strong>• 하류:</strong> 망원, 난지, 강서
                      <br />
                      <strong>• 시설:</strong> 자전거도로, 수상레저, 음악분수,
                      캠핑장
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedNatureItem === 'l1' ? (
              /* 춘천호 Detail */
              <div>
                <div
                  style={{
                    marginBottom: '24px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 8px',
                    }}
                  >
                    춘천호(소양호)
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    강원도 춘천시 • 69.2km² • 인공호수
                  </div>
                </div>

                {/* 이미지 갤러리 */}
                {(() => {
                  const images = [
                    {
                      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                      title: '춘천호 전경',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=800&h=400&fit=crop',
                      title: '소양강댐',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop',
                      title: '소양강 스카이워크',
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=800&h=400&fit=crop',
                      title: '유람선',
                    },
                  ]
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '240px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={images[currentImageIndex].url}
                          alt={images[currentImageIndex].title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex - 1 + images.length) %
                                images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex + 1) % images.length,
                            )
                          }
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#0f172a',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          ›
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                            padding: '20px 16px 12px',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {images[currentImageIndex].title}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '8px',
                        }}
                      >
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border:
                                currentImageIndex === idx
                                  ? '2px solid #3b82f6'
                                  : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              opacity: currentImageIndex === idx ? 1 : 0.6,
                              transition: 'all 0.2s',
                            }}
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '8px',
                      }}
                    >
                      개요
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      소양강댐 건설로 형성된 인공호수로 국내 최대 규모의
                      담수호입니다. 북한강 수계의 주요 수원이며, 수도권 생활용수
                      및 공업용수 공급의 핵심 역할을 합니다.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        면적
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        69.2km²
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        저수량
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        29억톤
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontWeight: 600,
                          marginBottom: '6px',
                        }}
                      >
                        댐 높이
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        123m
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      역사
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 1967년:</strong> 소양강댐 착공
                      <br />
                      <strong>• 1973년:</strong> 소양강댐 준공 (한국 최초
                      다목적댐)
                      <br />
                      <strong>• 1974년:</strong> 호수 형성 완료
                      <br />
                      <strong>• 1980년대:</strong> 수상레저 및 관광지로 개발
                      <br />
                      <strong>• 현재:</strong> 춘천 대표 관광명소이자 수도권
                      수원
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      소양강댐 정보
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 댐 길이:</strong> 530m
                      <br />
                      <strong>• 댐 높이:</strong> 123m (동양 최대 규모)
                      <br />
                      <strong>• 준공:</strong> 1973년 10월 15일
                      <br />
                      <strong>• 발전 용량:</strong> 200MW (2개 발전기)
                      <br />
                      <strong>• 홍수 조절 능력:</strong> 5억톤
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '10px',
                      }}
                    >
                      관광 및 레저
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.7',
                      }}
                    >
                      <strong>• 소양강 스카이워크:</strong> 174m 길이의 투명
                      전망대
                      <br />
                      <strong>• 물문화관:</strong> 수자원 및 댐 역사 전시
                      <br />
                      <strong>• 유람선:</strong> 청평사, 양구 등으로 운항
                      <br />
                      <strong>• 수상레저:</strong> 카약, 래프팅, 낚시
                      <br />
                      <strong>• 주변 명소:</strong> 청평사, 소양강 처녀상, 춘천
                      막국수촌
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#64748b',
                }}
              >
                상세 정보 준비중...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 인프라 모드 */}
      {viewMode === 'infrastructure' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '35% 65%',
            gap: '20px',
            height: 'calc(100vh - 300px)',
            minHeight: '600px',
          }}
        >
          {/* 왼쪽: 지도 + 리스트 (35%) */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* 지도 */}
            <div
              style={{
                height: '280px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {country.latitude && country.longitude ? (
                <GoogleMap
                  latitude={country.latitude || 0}
                  longitude={country.longitude || 0}
                  name={country.name}
                  zoom={7}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    color: '#94a3b8',
                    fontSize: '14px',
                  }}
                >
                  지도 정보가 없습니다
                </div>
              )}
            </div>

            {/* 리스트 영역 */}
            <div
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 헤더 */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  인프라 현황
                </h3>
              </div>

              {/* 필터 */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => setInfraFilter('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border:
                      infraFilter === 'all'
                        ? '2px solid #3b82f6'
                        : '1px solid #e2e8f0',
                    background: infraFilter === 'all' ? '#eff6ff' : '#ffffff',
                    color: infraFilter === 'all' ? '#1e40af' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  전체
                </button>
                <button
                  onClick={() => setInfraFilter('highways')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border:
                      infraFilter === 'highways'
                        ? '2px solid #10b981'
                        : '1px solid #e2e8f0',
                    background:
                      infraFilter === 'highways' ? '#f0fdf4' : '#ffffff',
                    color: infraFilter === 'highways' ? '#065f46' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12h20M2 18h20M2 6h20" />
                  </svg>
                  고속도로
                </button>
                <button
                  onClick={() => setInfraFilter('railways')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border:
                      infraFilter === 'railways'
                        ? '2px solid #8b5cf6'
                        : '1px solid #e2e8f0',
                    background:
                      infraFilter === 'railways' ? '#f5f3ff' : '#ffffff',
                    color: infraFilter === 'railways' ? '#5b21b6' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path d="M3 13h18M8 19v2M16 19v2" />
                  </svg>
                  철도
                </button>
                <button
                  onClick={() => setInfraFilter('airports')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border:
                      infraFilter === 'airports'
                        ? '2px solid #f59e0b'
                        : '1px solid #e2e8f0',
                    background:
                      infraFilter === 'airports' ? '#fffbeb' : '#ffffff',
                    color: infraFilter === 'airports' ? '#92400e' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                  </svg>
                  공항
                </button>
                <button
                  onClick={() => setInfraFilter('ports')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border:
                      infraFilter === 'ports'
                        ? '2px solid #0ea5e9'
                        : '1px solid #e2e8f0',
                    background: infraFilter === 'ports' ? '#f0f9ff' : '#ffffff',
                    color: infraFilter === 'ports' ? '#075985' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 4 0 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 1 4 0 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1M4 18v-3a1 1 0 0 1 1-1h3l2-3h6l2 3h3a1 1 0 0 1 1 1v3" />
                  </svg>
                  항구
                </button>
              </div>

              {/* 리스트 */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {(infraFilter === 'all' || infraFilter === 'highways') &&
                  mockInfrastructureData.highways.map((highway) => (
                    <div
                      key={highway.id}
                      onClick={() => setSelectedInfraItem(highway.id)}
                      style={{
                        padding: '12px',
                        background:
                          selectedInfraItem === highway.id
                            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                            : '#ffffff',
                        border:
                          selectedInfraItem === highway.id
                            ? '2px solid #10b981'
                            : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                          >
                            <path d="M2 12h20M2 18h20M2 6h20" />
                          </svg>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {highway.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#10b981',
                            background: '#f0fdf4',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          고속도로
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginLeft: '26px',
                        }}
                      >
                        {highway.number} · {highway.length}
                      </div>
                    </div>
                  ))}

                {(infraFilter === 'all' || infraFilter === 'railways') &&
                  mockInfrastructureData.railways.map((railway) => (
                    <div
                      key={railway.id}
                      onClick={() => setSelectedInfraItem(railway.id)}
                      style={{
                        padding: '12px',
                        background:
                          selectedInfraItem === railway.id
                            ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                            : '#ffffff',
                        border:
                          selectedInfraItem === railway.id
                            ? '2px solid #8b5cf6'
                            : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                          >
                            <rect x="3" y="6" width="18" height="13" rx="2" />
                            <path d="M3 13h18M8 19v2M16 19v2" />
                          </svg>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {railway.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#8b5cf6',
                            background: '#f5f3ff',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          철도
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginLeft: '26px',
                        }}
                      >
                        {railway.type} · {railway.length}
                      </div>
                    </div>
                  ))}

                {(infraFilter === 'all' || infraFilter === 'airports') &&
                  mockInfrastructureData.airports.map((airport) => (
                    <div
                      key={airport.id}
                      onClick={() => setSelectedInfraItem(airport.id)}
                      style={{
                        padding: '12px',
                        background:
                          selectedInfraItem === airport.id
                            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                            : '#ffffff',
                        border:
                          selectedInfraItem === airport.id
                            ? '2px solid #f59e0b'
                            : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                          >
                            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                          </svg>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {airport.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#f59e0b',
                            background: '#fffbeb',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          공항
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginLeft: '26px',
                        }}
                      >
                        {airport.code} · {airport.passengers}
                      </div>
                    </div>
                  ))}

                {(infraFilter === 'all' || infraFilter === 'ports') &&
                  mockInfrastructureData.ports.map((port) => (
                    <div
                      key={port.id}
                      onClick={() => setSelectedInfraItem(port.id)}
                      style={{
                        padding: '12px',
                        background:
                          selectedInfraItem === port.id
                            ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
                            : '#ffffff',
                        border:
                          selectedInfraItem === port.id
                            ? '2px solid #0ea5e9'
                            : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2"
                          >
                            <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 4 0 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 1 4 0 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1M4 18v-3a1 1 0 0 1 1-1h3l2-3h6l2 3h3a1 1 0 0 1 1 1v3" />
                          </svg>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {port.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0ea5e9',
                            background: '#f0f9ff',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          항구
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginLeft: '26px',
                        }}
                      >
                        {port.type} · {port.capacity}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: Detail (65%) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px',
              overflowY: 'auto',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {!selectedInfraItem ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  >
                    <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
                  </svg>
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#64748b',
                    margin: '0 0 8px',
                  }}
                >
                  인프라를 선택해주세요
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  왼쪽 패널에서 항목을 선택하시면
                  <br />더 자세한 정보를 확인하실 수 있습니다
                </p>
              </div>
            ) : selectedInfraItem === 'h1' ? (
              /* 경부고속도로 Detail */
              <div>
                {/* 이미지 갤러리 */}
                <div style={{ marginBottom: '24px' }}>
                  {(() => {
                    const images = [
                      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
                      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
                      'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800',
                    ]
                    return (
                      <>
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '320px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <img
                            src={images[infraImageIndex]}
                            alt="경부고속도로"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex - 1 + images.length) %
                                      images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  left: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M15 18l-6-6 6-6" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex + 1) % images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M9 18l6-6-6-6" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {images.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              overflowX: 'auto',
                              paddingBottom: '4px',
                            }}
                          >
                            {images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setInfraImageIndex(idx)}
                                style={{
                                  minWidth: '80px',
                                  height: '60px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border:
                                    infraImageIndex === idx
                                      ? '2px solid #10b981'
                                      : '2px solid transparent',
                                  opacity: infraImageIndex === idx ? 1 : 0.6,
                                  transition: 'all 0.2s',
                                }}
                              >
                                <img
                                  src={img}
                                  alt={`썸네일 ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    >
                      <path d="M2 12h20M2 18h20M2 6h20" />
                    </svg>
                    경부고속도로
                  </h2>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#64748b',
                      margin: 0,
                      lineHeight: '1.6',
                    }}
                  >
                    대한민국 최초의 고속도로로 서울과 부산을 연결하는 국가 기간
                    도로망의 핵심 축입니다.
                  </p>
                </div>

                {/* 기본 정보 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 16px',
                    }}
                  >
                    기본 정보
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        노선 번호
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        1호선
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        총 연장
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        428km
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        차선 수
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        왕복 8-10차선
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        개통 연도
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        1970년
                      </div>
                    </div>
                  </div>
                </div>

                {/* 역사 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    역사
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                    }}
                  >
                    1968년 2월 착공하여 1970년 7월 7일 개통된 경부고속도로는
                    박정희 정부의 핵심 국가 인프라 프로젝트였습니다. 건설 당시
                    총 공사비 429억 원이 투입되었으며, 약 2년 5개월 만에
                    완공되어 세계 건설 역사상 가장 빠른 시공 기록을 세웠습니다.
                    개통 이후 수도권과 영남권의 인적·물적 교류가 급증하여
                    대한민국 경제 발전의 혈맥 역할을 수행해왔습니다.
                  </p>
                </div>

                {/* 주요 구간 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 16px',
                    }}
                  >
                    주요 구간
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {[
                      '서울 (양재IC)',
                      '수원 (수원IC)',
                      '대전 (대전IC)',
                      '대구 (동대구IC)',
                      '부산 (구서IC)',
                    ].map((section, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#10b981',
                          }}
                        ></div>
                        <span
                          style={{
                            fontSize: '13px',
                            color: '#475569',
                            fontWeight: 500,
                          }}
                        >
                          {section}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 현황 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    운영 현황
                  </h3>
                  <ul
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                      paddingLeft: '20px',
                    }}
                  >
                    <li>일평균 교통량: 약 150만 대</li>
                    <li>휴게소: 총 38개소 (상행 19개, 하행 19개)</li>
                    <li>톨게이트: 총 29개소</li>
                    <li>제한속도: 일반구간 100-110km/h</li>
                  </ul>
                </div>
              </div>
            ) : selectedInfraItem === 'rail1' ? (
              /* KTX 경부선 Detail */
              <div>
                {/* 이미지 갤러리 */}
                <div style={{ marginBottom: '24px' }}>
                  {(() => {
                    const images = [
                      'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800',
                      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
                      'https://images.unsplash.com/photo-1569961638571-beadda8be58d?w=800',
                    ]
                    return (
                      <>
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '320px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <img
                            src={images[infraImageIndex]}
                            alt="KTX 경부선"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex - 1 + images.length) %
                                      images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  left: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M15 18l-6-6 6-6" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex + 1) % images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M9 18l6-6-6-6" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {images.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              overflowX: 'auto',
                              paddingBottom: '4px',
                            }}
                          >
                            {images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setInfraImageIndex(idx)}
                                style={{
                                  minWidth: '80px',
                                  height: '60px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border:
                                    infraImageIndex === idx
                                      ? '2px solid #8b5cf6'
                                      : '2px solid transparent',
                                  opacity: infraImageIndex === idx ? 1 : 0.6,
                                  transition: 'all 0.2s',
                                }}
                              >
                                <img
                                  src={img}
                                  alt={`썸네일 ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    >
                      <rect x="3" y="6" width="18" height="13" rx="2" />
                      <path d="M3 13h18M8 19v2M16 19v2" />
                    </svg>
                    KTX 경부선
                  </h2>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#64748b',
                      margin: 0,
                      lineHeight: '1.6',
                    }}
                  >
                    서울과 부산을 연결하는 대한민국 최초의 고속철도 노선입니다.
                  </p>
                </div>

                {/* 기본 정보 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 16px',
                    }}
                  >
                    기본 정보
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        노선 종류
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        고속철도
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        총 연장
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        412km
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        역 수
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        12개역
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        개통 연도
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        2004년
                      </div>
                    </div>
                  </div>
                </div>

                {/* 역사 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    역사
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                    }}
                  >
                    1992년 착공하여 2004년 4월 1일 개통된 KTX는 대한민국 교통
                    혁명의 시발점이었습니다. 프랑스 TGV 기술을 도입하여
                    건설되었으며, 서울-부산 구간을 2시간 40분대로 단축시켜
                    한반도 남부를 반나절 생활권으로 묶었습니다. 개통 20년이 지난
                    현재 누적 이용객 10억 명을 돌파했으며, 대한민국 대중교통의
                    핵심 축으로 자리잡았습니다.
                  </p>
                </div>

                {/* 운영 정보 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    운영 현황
                  </h3>
                  <ul
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                      paddingLeft: '20px',
                    }}
                  >
                    <li>최고 속도: 305km/h</li>
                    <li>운행 시간: 서울-부산 2시간 15분</li>
                    <li>일 평균 운행: 약 150편</li>
                    <li>일 평균 이용객: 약 15만 명</li>
                    <li>운영사: 한국철도공사 (코레일)</li>
                  </ul>
                </div>
              </div>
            ) : selectedInfraItem === 'a1' ? (
              /* 인천국제공항 Detail */
              <div>
                {/* 이미지 갤러리 */}
                <div style={{ marginBottom: '24px' }}>
                  {(() => {
                    const images = [
                      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
                      'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800',
                      'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800',
                      'https://images.unsplash.com/photo-1583712862719-5c7b082c8d89?w=800',
                    ]
                    return (
                      <>
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '320px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <img
                            src={images[infraImageIndex]}
                            alt="인천국제공항"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex - 1 + images.length) %
                                      images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  left: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M15 18l-6-6 6-6" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  setInfraImageIndex(
                                    (infraImageIndex + 1) % images.length,
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                >
                                  <path d="M9 18l6-6-6-6" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {images.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              overflowX: 'auto',
                              paddingBottom: '4px',
                            }}
                          >
                            {images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setInfraImageIndex(idx)}
                                style={{
                                  minWidth: '80px',
                                  height: '60px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border:
                                    infraImageIndex === idx
                                      ? '2px solid #f59e0b'
                                      : '2px solid transparent',
                                  opacity: infraImageIndex === idx ? 1 : 0.6,
                                  transition: 'all 0.2s',
                                }}
                              >
                                <img
                                  src={img}
                                  alt={`썸네일 ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    >
                      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                    </svg>
                    인천국제공항
                  </h2>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#64748b',
                      margin: 0,
                      lineHeight: '1.6',
                    }}
                  >
                    대한민국을 대표하는 국제공항이자 세계 최고 수준의 허브
                    공항입니다.
                  </p>
                </div>

                {/* 기본 정보 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 16px',
                    }}
                  >
                    기본 정보
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        공항 코드
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        ICN
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        공항 유형
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        국제공항
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        연간 이용객
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        7,200만명
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        위치
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        인천광역시 중구
                      </div>
                    </div>
                  </div>
                </div>

                {/* 역사 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    역사
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                    }}
                  >
                    2001년 3월 29일 개항한 인천국제공항은 김포국제공항의 포화
                    상태를 해소하고 동북아 허브 공항을 목표로 건설되었습니다.
                    영종도와 용유도 사이의 갯벌을 매립하여 조성되었으며, 개항
                    이후 13년 연속 국제공항협의회(ACI) 선정 세계 최우수 공항으로
                    선정되는 등 세계 최고 수준의 서비스를 제공하고 있습니다.
                    현재 제2여객터미널까지 완공되어 연간 수용 능력은 7,200만 명
                    수준입니다.
                  </p>
                </div>

                {/* 시설 현황 */}
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 12px',
                    }}
                  >
                    시설 현황
                  </h3>
                  <ul
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.8',
                      margin: 0,
                      paddingLeft: '20px',
                    }}
                  >
                    <li>여객터미널: 2개 (제1터미널, 제2터미널)</li>
                    <li>활주로: 4개 (3,750m × 2, 4,000m × 2)</li>
                    <li>탑승동: 5개 (A, B, C, D, E)</li>
                    <li>주기장: 253개</li>
                    <li>취항 항공사: 90개사</li>
                    <li>취항 도시: 189개 도시 (54개국)</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* 기본 Empty State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  >
                    <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
                  </svg>
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#64748b',
                    margin: '0 0 8px',
                  }}
                >
                  상세 정보 준비 중
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  해당 인프라의 상세 정보는
                  <br />곧 업데이트 예정입니다
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
