/**
 * 지도 및 지역 — 행정구역 전용 뷰
 *
 * 데이터 소스: GET /cities/administrative-divisions?countryId=...
 * 백엔드 응답 = AdministrativeDivision 트리 (최상위 + nested children).
 * 비어 있으면 "등록된 행정구역 없음" 빈 상태 노출.
 */
import { useMemo, useState } from 'react'

import {
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'

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
  country: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
  }
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

export function MapRegionAdministrativeView({
  country,
  mapLocation,
  onCityClick,
}: MapRegionAdministrativeViewProps) {
  const palette = useRegionPalette()
  const { data: divisions = [], isLoading } = useAdministrativeDivisions(
    country.id,
  )

  const [level, setLevel] = useState<NavLevel>('level1')
  const [selectedLevel1Id, setSelectedLevel1Id] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const level1List: AdministrativeDivision[] = divisions
  const level2List: AdministrativeDivision[] = useMemo(() => {
    if (!selectedLevel1Id) return []
    const parent = level1List.find((d) => d.id === selectedLevel1Id)
    return parent?.children ?? []
  }, [level1List, selectedLevel1Id])

  const currentItems = level === 'level1' ? level1List : level2List
  const filteredItems = useMemo(
    () =>
      currentItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [currentItems, searchQuery],
  )

  const reportLocation = (
    division: AdministrativeDivision | null,
    name?: string,
  ) => {
    onCityClick({
      id: division?.id ?? '',
      name: division?.name ?? name ?? '',
      population: '',
      latitude: country.latitude ?? 0,
      longitude: country.longitude ?? 0,
    })
  }

  const handleLevel1Click = (id: string) => {
    const region = level1List.find((r) => r.id === id)
    if (!region) return
    const hasChildren = (region.children ?? []).length > 0
    if (hasChildren) {
      setLevel('level2')
      setSelectedLevel1Id(id)
      setSelectedId(id)
    } else {
      setSelectedId(id)
    }
    reportLocation(region)
  }

  const handleLevel2Click = (item: AdministrativeDivision) => {
    setSelectedId(item.id)
    reportLocation(item)
  }

  const handleBack = () => {
    setLevel('level1')
    setSelectedLevel1Id(null)
    setSelectedId(null)
    reportLocation(null)
  }

  const selectedLevel1 = selectedLevel1Id
    ? level1List.find((r) => r.id === selectedLevel1Id) ?? null
    : null
  const selectedDivision: AdministrativeDivision | null = useMemo(() => {
    if (!selectedId) return null
    if (level === 'level1') return selectedLevel1
    return level2List.find((d) => d.id === selectedId) ?? null
  }, [selectedId, selectedLevel1, level2List, level])

  const detailTitle = selectedDivision?.name ?? ''
  const detailSubtitle =
    level === 'level2' && selectedLevel1
      ? `${country.name} · ${selectedLevel1.name}`
      : country.name

  const childCount = selectedDivision?.children?.length ?? 0

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
          {level === 'level1'
            ? '1차 행정구역'
            : selectedLevel1?.name ?? '하위 구역'}
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

  const listContent = (() => {
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (filteredItems.length === 0) {
      const message =
        level1List.length === 0
          ? '등록된 행정구역이 없습니다'
          : searchQuery
            ? '검색 결과가 없습니다'
            : '하위 구역이 없습니다'
      return <ListEmptyState palette={palette} message={message} />
    }
    return filteredItems.map((item) => {
      const subCount = item.children?.length ?? 0
      return (
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
          subtitle={item.localName ?? undefined}
          trailing={
            subCount > 0 ? (
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
                {subCount}개
              </span>
            ) : null
          }
        />
      )
    })
  })()

  return (
    <>
      <MapCard palette={palette} country={country} mapLocation={mapLocation} />

      <RegionSplitLayout
        ariaLabel="행정구역"
        sectionLabel="행정구역"
        maxHeight="calc(100vh - 380px)"
        left={
          <RegionListPanel palette={palette} toolbar={toolbar}>
            {listContent}
          </RegionListPanel>
        }
        right={
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedDivision}
            emptyTitle={
              level1List.length === 0
                ? '등록된 행정구역이 없습니다'
                : '좌측 목록에서 지역을 선택하세요'
            }
            emptyDescription={
              level1List.length === 0
                ? '이 국가에는 아직 행정구역 데이터가 등록되지 않았습니다'
                : ''
            }
            header={
              selectedDivision ? (
                <RegionDetailHeader
                  palette={palette}
                  title={detailTitle}
                  subtitle={detailSubtitle}
                />
              ) : null
            }
          >
            {selectedDivision?.localName && (
              <MetaCard
                palette={palette}
                label="현지어 명칭"
                value={selectedDivision.localName}
              />
            )}
            {childCount > 0 && (
              <MetaCard
                palette={palette}
                label="하위 구역"
                value={`${childCount}개`}
              />
            )}
            {level === 'level2' && selectedLevel1 && (
              <MetaCard
                palette={palette}
                label="상위 구역"
                value={selectedLevel1.name}
              />
            )}
          </RegionDetailPanel>
        }
      />
    </>
  )
}
