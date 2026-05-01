/**
 * 지도 및 지역 — 인프라 전용 뷰
 *
 * 데이터 소스: GET /infrastructures?countryId=xxx
 */
import { useMemo, useState } from 'react'

import {
  type Infrastructure,
  type InfrastructureType,
  useInfrastructures,
} from '@/entities/country/api.infrastructure'

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

type InfraFilter = 'all' | InfrastructureType

interface MapRegionInfrastructureViewProps {
  country: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
  }
}

const FILTERS: { value: InfraFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'highway', label: '고속도로' },
  { value: 'railway', label: '철도' },
  { value: 'airport', label: '공항' },
  { value: 'port', label: '항구' },
]

const TYPE_LABEL: Record<InfrastructureType, string> = {
  highway: '고속도로',
  railway: '철도',
  airport: '공항',
  port: '항구',
}

function buildSubtitle(item: Infrastructure): string {
  const parts: string[] = []
  if (item.code) parts.push(item.code)
  if (item.lengthKm != null) parts.push(`${item.lengthKm.toLocaleString()}km`)
  if (item.capacity) parts.push(item.capacity)
  if (item.openedYear != null) parts.push(`${item.openedYear}`)
  return parts.join(' · ')
}

export function MapRegionInfrastructureView({
  country,
}: MapRegionInfrastructureViewProps) {
  const palette = useRegionPalette()
  const [filter, setFilter] = useState<InfraFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: allInfra = [], isLoading } = useInfrastructures(country.id)

  const filtered = useMemo(() => {
    if (filter === 'all') return allInfra
    return allInfra.filter((i) => i.type === filter)
  }, [allInfra, filter])

  const selectedItem = selectedId
    ? allInfra.find((i) => i.id === selectedId) ?? null
    : null

  const countByType = useMemo(() => {
    const counts: Record<InfrastructureType, number> = {
      highway: 0,
      railway: 0,
      airport: 0,
      port: 0,
    }
    for (const i of allInfra) counts[i.type]++
    return counts
  }, [allInfra])

  const totalCount = allInfra.length

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
      <span>고속도로 {countByType.highway}개</span>
      <span>철도 {countByType.railway}개</span>
      <span>공항 {countByType.airport}개</span>
      <span>항구 {countByType.port}개</span>
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
    if (allInfra.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 인프라 항목이 없습니다"
        />
      )
    }
    if (filtered.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message={`${TYPE_LABEL[filter as InfrastructureType] ?? ''} 항목이 없습니다`}
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
        ariaLabel="인프라"
        sectionLabel="인프라"
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
            emptyIcon="⚡"
            emptyTitle="인프라를 선택해주세요"
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
            {selectedItem?.code && (
              <MetaCard palette={palette} label="식별 코드" value={selectedItem.code} />
            )}
            {selectedItem?.region && (
              <MetaCard palette={palette} label="지역" value={selectedItem.region} />
            )}
            {selectedItem?.lengthKm != null && (
              <MetaCard
                palette={palette}
                label="길이"
                value={`${selectedItem.lengthKm.toLocaleString()}km`}
              />
            )}
            {selectedItem?.capacity && (
              <MetaCard
                palette={palette}
                label="이용량/처리능력"
                value={selectedItem.capacity}
              />
            )}
            {selectedItem?.operatorName && (
              <MetaCard
                palette={palette}
                label="운영"
                value={selectedItem.operatorName}
              />
            )}
            {selectedItem?.openedYear != null && (
              <MetaCard
                palette={palette}
                label="개통"
                value={`${selectedItem.openedYear}년`}
              />
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
