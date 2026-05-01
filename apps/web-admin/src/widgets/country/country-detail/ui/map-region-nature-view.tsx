/**
 * 지도 및 지역 — 자연지리 전용 뷰
 *
 * 데이터 소스: GET /natural-features?countryId=xxx
 * 비어 있으면 "등록된 항목 없음" 빈 상태 노출.
 */
import { useMemo, useState } from 'react'

import {
  type NaturalFeature,
  type NaturalFeatureType,
  useNaturalFeatures,
} from '@/entities/country/api.natural-feature'

import {
  FilterPill,
  ListEmptyState,
  MapCard,
  MetaCard,
  PillToolbar,
  RegionDetailHeader,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  useRegionPalette,
} from './map-region'

type NatureFilter = 'all' | NaturalFeatureType

interface MapRegionNatureViewProps {
  country: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
  }
}

const FILTERS: { value: NatureFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'mountain', label: '산' },
  { value: 'river', label: '강' },
  { value: 'lake', label: '호수' },
  { value: 'coast', label: '해안' },
]

const TYPE_LABEL: Record<NaturalFeatureType, string> = {
  mountain: '산',
  river: '강',
  lake: '호수',
  coast: '해안',
}

const EMPTY_ICON_BY_TYPE: Record<NaturalFeatureType, string> = {
  mountain: '🏔️',
  river: '🏞️',
  lake: '🏞️',
  coast: '🏖️',
}

function buildSubtitle(item: NaturalFeature): string {
  const parts: string[] = []
  if (item.region) parts.push(item.region)
  if (item.heightM != null) parts.push(`${item.heightM.toLocaleString()}m`)
  if (item.lengthKm != null) parts.push(`${item.lengthKm.toLocaleString()}km`)
  if (item.areaSqKm != null) parts.push(`${item.areaSqKm.toLocaleString()}km²`)
  if (item.isProtected) parts.push('보호구역')
  return parts.join(' · ')
}

export function MapRegionNatureView({ country }: MapRegionNatureViewProps) {
  const palette = useRegionPalette()
  const [filter, setFilter] = useState<NatureFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: allFeatures = [], isLoading } = useNaturalFeatures(country.id)

  const filtered = useMemo(() => {
    if (filter === 'all') return allFeatures
    return allFeatures.filter((f) => f.type === filter)
  }, [allFeatures, filter])

  const selectedItem = selectedId
    ? allFeatures.find((f) => f.id === selectedId) ?? null
    : null

  const countByType = useMemo(() => {
    const counts: Record<NaturalFeatureType, number> = {
      mountain: 0,
      river: 0,
      lake: 0,
      coast: 0,
    }
    for (const f of allFeatures) counts[f.type]++
    return counts
  }, [allFeatures])

  const totalCount = allFeatures.length

  const kpiStrip = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '10px 14px',
        background: palette.bgSecondary,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: 500,
      }}
    >
      <span style={{ color: palette.text, fontWeight: 600 }}>현재 보기</span>
      <span>·</span>
      <span>산 {countByType.mountain}개</span>
      <span>강 {countByType.river}개</span>
      <span>호수 {countByType.lake}개</span>
      <span>해안 {countByType.coast}개</span>
      <span
        style={{
          marginLeft: 'auto',
          color: palette.primary,
          fontWeight: 600,
        }}
      >
        총 {totalCount}개
      </span>
    </div>
  )

  const listContent = (() => {
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (allFeatures.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 자연 지리 항목이 없습니다"
        />
      )
    }
    if (filtered.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message={`${TYPE_LABEL[filter as NaturalFeatureType] ?? ''} 항목이 없습니다`}
        />
      )
    }
    return filtered.map((item) => (
      <RegionListItem
        key={item.id}
        palette={palette}
        selected={selectedId === item.id}
        onSelect={() => setSelectedId(item.id)}
        title={item.name}
        subtitle={buildSubtitle(item) || TYPE_LABEL[item.type]}
      />
    ))
  })()

  return (
    <>
      <MapCard
        palette={palette}
        country={country}
        zoom={{ withLocation: 7, withoutLocation: 7 }}
      />

      <RegionSplitLayout
        ariaLabel="자연지리"
        sectionLabel="자연지리"
        kpiStrip={kpiStrip}
        minHeight={400}
        left={
          <RegionListPanel
            palette={palette}
            maxHeight={1120}
            minHeight={400}
            toolbar={
              <PillToolbar palette={palette}>
                {FILTERS.map((f) => (
                  <FilterPill
                    key={f.value}
                    palette={palette}
                    active={filter === f.value}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </FilterPill>
                ))}
              </PillToolbar>
            }
          >
            {listContent}
          </RegionListPanel>
        }
        right={
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedItem}
            emptyIcon={
              filter !== 'all'
                ? EMPTY_ICON_BY_TYPE[filter as NaturalFeatureType]
                : '🏔️'
            }
            emptyTitle="자연 지형을 선택해주세요"
            header={
              selectedItem ? (
                <RegionDetailHeader
                  palette={palette}
                  title={selectedItem.name}
                  subtitle={
                    selectedItem.localName
                      ? `${TYPE_LABEL[selectedItem.type]} · ${selectedItem.localName}`
                      : TYPE_LABEL[selectedItem.type]
                  }
                />
              ) : null
            }
          >
            {selectedItem?.region && (
              <MetaCard palette={palette} label="지역" value={selectedItem.region} />
            )}
            {selectedItem?.heightM != null && (
              <MetaCard
                palette={palette}
                label="고도"
                value={`${selectedItem.heightM.toLocaleString()}m`}
              />
            )}
            {selectedItem?.lengthKm != null && (
              <MetaCard
                palette={palette}
                label="길이"
                value={`${selectedItem.lengthKm.toLocaleString()}km`}
              />
            )}
            {selectedItem?.areaSqKm != null && (
              <MetaCard
                palette={palette}
                label="면적"
                value={`${selectedItem.areaSqKm.toLocaleString()}km²`}
              />
            )}
            {selectedItem?.isProtected && (
              <MetaCard palette={palette} label="구분" value="보호구역" />
            )}
            {selectedItem?.latitude != null && selectedItem?.longitude != null && (
              <MetaCard
                palette={palette}
                label="좌표"
                value={`${selectedItem.latitude.toFixed(4)}, ${selectedItem.longitude.toFixed(4)}`}
              />
            )}
          </RegionDetailPanel>
        }
      />
    </>
  )
}
