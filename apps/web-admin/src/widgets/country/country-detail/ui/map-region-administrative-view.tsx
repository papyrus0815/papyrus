/**
 * 지도 및 지역 — 행정구역 전용 뷰
 *
 * 데이터 소스: GET /cities/administrative-divisions?countryId=...
 * 백엔드 응답 = AdministrativeDivision 트리 (최상위 + nested children).
 *
 * UX:
 *  - 검색 / 정렬 / 키보드 네비 / URL 동기화 — 자연·인프라와 일관
 *  - level1/level2 드릴다운: admin_level1 쿼리에 부모 ID 기록
 */
import { useCallback, useEffect, useMemo } from 'react'

import { useSearchParams } from 'react-router-dom'

import {
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'

import {
  ListEmptyState,
  ListToolbarRow,
  MapCard,
  MetaCard,
  RegionDetailHeader,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  SearchInput,
  SortSelect,
  useListKeyboard,
  useRegionPalette,
} from './map-region'

type AdminSort = 'name' | 'children'

const SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'children' as const, label: '하위 구역 많은 순' },
]
const SORT_VALUES = ['name', 'children'] as const

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

  // URL 동기화 — admin_q, admin_sort, admin_level1, admin_id
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('admin_q') ?? ''
  const sort = ((): AdminSort => {
    const raw = searchParams.get('admin_sort')
    return raw && (SORT_VALUES as readonly string[]).includes(raw)
      ? (raw as AdminSort)
      : 'name'
  })()
  const selectedLevel1Id = searchParams.get('admin_level1')
  const selectedId = searchParams.get('admin_id')

  const updateParam = useCallback(
    (key: string, value: string | null, defaultValue?: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (
            value == null ||
            value === '' ||
            (defaultValue != null && value === defaultValue)
          ) {
            next.delete(key)
          } else {
            next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (v: string) => updateParam('admin_q', v),
    [updateParam],
  )
  const setSort = useCallback(
    (v: AdminSort) => updateParam('admin_sort', v, 'name'),
    [updateParam],
  )
  const setSelectedLevel1Id = useCallback(
    (v: string | null) => updateParam('admin_level1', v),
    [updateParam],
  )
  const setSelectedId = useCallback(
    (v: string | null) => updateParam('admin_id', v),
    [updateParam],
  )

  // 데이터 가공
  const level1List: AdministrativeDivision[] = divisions
  const level2List: AdministrativeDivision[] = useMemo(() => {
    if (!selectedLevel1Id) return []
    const parent = level1List.find((d) => d.id === selectedLevel1Id)
    return parent?.children ?? []
  }, [level1List, selectedLevel1Id])

  const level: 'level1' | 'level2' = selectedLevel1Id ? 'level2' : 'level1'
  const currentItems = level === 'level1' ? level1List : level2List

  const filteredAndSorted = useMemo(() => {
    let list = currentItems
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.localName ?? '').toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else {
      sorted.sort(
        (a, b) => (b.children?.length ?? 0) - (a.children?.length ?? 0),
      )
    }
    return sorted
  }, [currentItems, search, sort])

  // 선택 부모/항목 검증 (URL 직접 접근 대비)
  useEffect(() => {
    if (
      selectedLevel1Id &&
      !level1List.some((d) => d.id === selectedLevel1Id)
    ) {
      // 부모가 사라졌으면 모두 리셋
      setSelectedLevel1Id(null)
      setSelectedId(null)
    }
  }, [selectedLevel1Id, level1List, setSelectedLevel1Id, setSelectedId])

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
    setSelectedLevel1Id(null)
    setSelectedId(null)
    reportLocation(null)
  }

  // 키보드 네비
  useListKeyboard({
    items: filteredAndSorted,
    selectedId,
    onSelect: (id) => {
      if (id === null) {
        setSelectedId(null)
        return
      }
      // 키보드로 이동 시 자동 드릴다운은 안 하고 선택만
      if (level === 'level1') {
        const region = level1List.find((r) => r.id === id)
        if (!region) return
        setSelectedId(id)
        reportLocation(region)
      } else {
        const item = level2List.find((d) => d.id === id)
        if (!item) return
        setSelectedId(id)
        reportLocation(item)
      }
    },
  })

  const selectedLevel1 = selectedLevel1Id
    ? level1List.find((r) => r.id === selectedLevel1Id) ?? null
    : null
  const selectedDivision: AdministrativeDivision | null = useMemo(() => {
    if (!selectedId) return null
    if (level === 'level1') {
      return level1List.find((d) => d.id === selectedId) ?? null
    }
    if (selectedId === selectedLevel1Id) return selectedLevel1
    return level2List.find((d) => d.id === selectedId) ?? null
  }, [selectedId, level, level1List, level2List, selectedLevel1, selectedLevel1Id])

  const detailTitle = selectedDivision?.name ?? ''
  const detailSubtitle =
    level === 'level2' && selectedLevel1
      ? `${country.name} · ${selectedLevel1.name}`
      : country.name

  const childCount = selectedDivision?.children?.length ?? 0

  const toolbar = (
    <>
      <ListToolbarRow palette={palette}>
        <SearchInput
          palette={palette}
          value={search}
          onChange={setSearch}
          placeholder="이름·현지어로 검색"
        />
        <SortSelect
          palette={palette}
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
        />
      </ListToolbarRow>
      <div
        style={{
          padding: '12px 16px',
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
            aria-label="상위 구역으로 돌아가기"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${palette.border}`,
              background: palette.bg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
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
            fontSize: 13,
            fontWeight: 600,
            color: palette.text,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {level === 'level1'
            ? '1차 행정구역'
            : selectedLevel1?.name ?? '하위 구역'}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: palette.primary,
            background: palette.badgeBg,
            padding: '3px 8px',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          {filteredAndSorted.length}개
        </span>
      </div>
    </>
  )

  const listContent = (() => {
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (level1List.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 행정구역이 없습니다"
        />
      )
    }
    if (filteredAndSorted.length === 0) {
      const message = search.trim()
        ? `"${search}" 검색 결과가 없습니다`
        : '하위 구역이 없습니다'
      return <ListEmptyState palette={palette} message={message} />
    }
    return filteredAndSorted.map((item) => {
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
                : '↑↓로 이동, Esc로 선택 해제'
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
