/**
 * 지도 및 지역 — 행정구역 전용 뷰
 */
import { useMemo, useState } from 'react'

import {
  administrativeSystemByCountry,
  getCountryCode,
  mockAdministrativeRegions,
  mockCityDetails,
} from '../mock'
import {
  ListEmptyState,
  MapCard,
  MetaCard,
  RegionDetailHeader,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  useRegionPalette,
} from './map-region'

type NavLevel = 'level1' | 'level2'

interface MapRegionAdministrativeViewProps {
  country: { name: string; latitude?: number | null; longitude?: number | null }
  mapLocation?: { latitude: number; longitude: number; name: string } | null
  onCityClick: (city: {
    id: string
    name: string
    population: string
    latitude: number
    longitude: number
    area?: string
    gdp?: string
    industry?: string
  }) => void
}

const DEFAULT_LATLNG = { lat: 37.5665, lng: 126.978 }

export function MapRegionAdministrativeView({
  country,
  mapLocation,
  onCityClick,
}: MapRegionAdministrativeViewProps) {
  const palette = useRegionPalette()

  const [level, setLevel] = useState<NavLevel>('level1')
  const [selectedLevel1Id, setSelectedLevel1Id] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const countryCode = getCountryCode(country.name)
  const adminSystem = administrativeSystemByCountry[countryCode]

  const level1List = mockAdministrativeRegions.level1
  const level2List = selectedLevel1Id
    ? mockAdministrativeRegions.level2[selectedLevel1Id] ?? []
    : []

  const currentItems = level === 'level1' ? level1List : level2List
  const filteredItems = useMemo(
    () =>
      currentItems.filter((item: { name: string }) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [currentItems, searchQuery],
  )

  const handleLevel1Click = (id: string) => {
    const region = level1List.find((r) => r.id === id)
    if (!region) return
    const hasLevel2 = (mockAdministrativeRegions.level2[id] ?? []).length > 0
    if (hasLevel2) {
      setLevel('level2')
      setSelectedLevel1Id(id)
      setSelectedId(id)
    } else {
      setSelectedId(id)
    }
    const details = mockCityDetails[id as keyof typeof mockCityDetails]
    onCityClick({
      id,
      name: region.name,
      population: details?.population ?? '—',
      latitude: DEFAULT_LATLNG.lat,
      longitude: DEFAULT_LATLNG.lng,
      area: details?.area,
      gdp: details?.gdp,
      industry: details?.industry,
    })
  }

  const handleLevel2Click = (item: {
    id: string
    name: string
    population?: string
    area?: string
  }) => {
    setSelectedId(item.id)
    const details = mockCityDetails[item.id as keyof typeof mockCityDetails]
    onCityClick({
      id: item.id,
      name: item.name,
      population: details?.population ?? item.population ?? '—',
      latitude: DEFAULT_LATLNG.lat,
      longitude: DEFAULT_LATLNG.lng,
      area: details?.area ?? item.area,
      gdp: details?.gdp,
      industry: details?.industry,
    })
  }

  const handleBack = () => {
    setLevel('level1')
    setSelectedLevel1Id(null)
    setSelectedId(null)
    onCityClick({
      id: '',
      name: '',
      population: '',
      latitude: country.latitude ?? DEFAULT_LATLNG.lat,
      longitude: country.longitude ?? DEFAULT_LATLNG.lng,
    })
  }

  const selectedLevel1 = selectedLevel1Id
    ? level1List.find((r) => r.id === selectedLevel1Id)
    : null
  const selectedDetails = selectedId
    ? mockCityDetails[selectedId as keyof typeof mockCityDetails]
    : null

  const detailTitle =
    level === 'level1'
      ? selectedLevel1?.name ?? ''
      : level2List.find((x: { id: string }) => x.id === selectedId)?.name ??
        selectedId ??
        ''
  const detailSubtitle =
    adminSystem && selectedLevel1
      ? `${adminSystem.countryNameKo} · ${selectedLevel1.name}`
      : undefined

  const toolbar = (
    <>
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${palette.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {level === 'level2' && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로가기"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${palette.border}`,
              background: palette.bg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={palette.textSecondary}
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: palette.text,
            flex: 1,
          }}
        >
          {level === 'level1' ? '1차 행정구역' : selectedLevel1?.name ?? '하위 구역'}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: palette.primary,
            background: palette.badgeBg,
            padding: '4px 10px',
            borderRadius: 8,
          }}
        >
          {filteredItems.length}개
        </span>
      </div>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <input
          type="text"
          placeholder="검색..."
          aria-label="행정구역 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 13,
            border: `1px solid ${palette.border}`,
            borderRadius: 10,
            background: palette.bg,
            color: palette.text,
            outline: 'none',
          }}
        />
      </div>
    </>
  )

  return (
    <>
      <MapCard palette={palette} country={country} mapLocation={mapLocation} />

      <RegionSplitLayout
        ariaLabel="행정구역"
        sectionLabel="행정구역"
        maxHeight="calc(100vh - 380px)"
        left={
          <RegionListPanel palette={palette} toolbar={toolbar}>
            {filteredItems.length === 0 ? (
              <ListEmptyState palette={palette} />
            ) : (
              filteredItems.map(
                (item: {
                  id: string
                  name: string
                  count?: number
                  population?: string
                  area?: string
                }) => (
                  <RegionListItem
                    key={item.id}
                    palette={palette}
                    selected={selectedId === item.id}
                    onSelect={() =>
                      level === 'level1'
                        ? handleLevel1Click(item.id)
                        : handleLevel2Click(item)
                    }
                    title={item.name}
                    trailing={
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: palette.textSecondary,
                          background: palette.bgSecondary,
                          padding: '2px 8px',
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      >
                        {'count' in item && item.count != null
                          ? `${item.count}개`
                          : item.population ?? '—'}
                      </span>
                    }
                  />
                ),
              )
            )}
          </RegionListPanel>
        }
        right={
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedId}
            emptyTitle="좌측 목록에서 지역을 선택하세요"
            emptyDescription=""
            header={
              selectedId ? (
                <RegionDetailHeader
                  palette={palette}
                  title={detailTitle}
                  subtitle={detailSubtitle}
                />
              ) : null
            }
          >
            {selectedDetails?.population && (
              <MetaCard
                palette={palette}
                label="인구"
                value={selectedDetails.population}
              />
            )}
            {selectedDetails?.area && (
              <MetaCard
                palette={palette}
                label="면적"
                value={selectedDetails.area}
              />
            )}
            {selectedDetails?.mayor && (
              <MetaCard
                palette={palette}
                label="행정 수장"
                value={
                  selectedDetails.party
                    ? `${selectedDetails.mayor} (${selectedDetails.party})`
                    : selectedDetails.mayor
                }
                fullWidth
              />
            )}
          </RegionDetailPanel>
        }
      />
    </>
  )
}
