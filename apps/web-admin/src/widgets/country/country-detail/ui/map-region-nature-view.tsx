/**
 * 지도 및 지역 — 자연지리 전용 뷰
 */
import { useMemo, useState } from 'react'

import { mockNatureData } from '../mock'
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

type NatureFilter = 'all' | 'mountains' | 'rivers' | 'lakes' | 'coasts'

interface MapRegionNatureViewProps {
  country: { name: string; latitude?: number | null; longitude?: number | null }
}

const FILTERS: { value: NatureFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'mountains', label: '산' },
  { value: 'rivers', label: '강' },
  { value: 'lakes', label: '호수' },
  { value: 'coasts', label: '해안' },
]

export function MapRegionNatureView({ country }: MapRegionNatureViewProps) {
  const palette = useRegionPalette()
  const [filter, setFilter] = useState<NatureFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo(() => {
    const list: { id: string; name: string; subtitle: string; type: string }[] =
      []
    if (filter === 'all' || filter === 'mountains') {
      ;(mockNatureData.mountains || []).forEach((m) =>
        list.push({
          id: m.id,
          name: m.name,
          subtitle: `${m.region} · ${m.height}${m.nationalPark ? ' · 국립공원' : ''}`,
          type: 'mountain',
        }),
      )
    }
    if (filter === 'all' || filter === 'rivers') {
      ;(mockNatureData.rivers || []).forEach((r) =>
        list.push({
          id: r.id,
          name: r.name,
          subtitle: `${r.region} · ${r.length} · ${r.source} → ${r.mouth}`,
          type: 'river',
        }),
      )
    }
    if (filter === 'all' || filter === 'lakes') {
      ;(mockNatureData.lakes || []).forEach((l) =>
        list.push({
          id: l.id,
          name: l.name,
          subtitle: `${l.region} · ${l.area} · ${l.type}`,
          type: 'lake',
        }),
      )
    }
    if (filter === 'all' || filter === 'coasts') {
      ;(mockNatureData.coasts || []).forEach((c) =>
        list.push({
          id: c.id,
          name: c.name,
          subtitle: `${c.region} · ${c.length} · ${c.type}`,
          type: 'coast',
        }),
      )
    }
    return list
  }, [filter])

  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId)
    : null
  const selectedMountain =
    selectedId && mockNatureData.mountains
      ? mockNatureData.mountains.find((m) => m.id === selectedId)
      : null
  const selectedRiver =
    selectedId && mockNatureData.rivers
      ? mockNatureData.rivers.find((r) => r.id === selectedId)
      : null
  const selectedLake =
    selectedId && mockNatureData.lakes
      ? mockNatureData.lakes.find((l) => l.id === selectedId)
      : null
  const selectedCoast =
    selectedId && mockNatureData.coasts
      ? mockNatureData.coasts.find((c) => c.id === selectedId)
      : null

  const totalCount =
    (mockNatureData.mountains?.length ?? 0) +
    (mockNatureData.rivers?.length ?? 0) +
    (mockNatureData.lakes?.length ?? 0) +
    (mockNatureData.coasts?.length ?? 0)

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
      <span>산 {mockNatureData.mountains?.length ?? 0}개</span>
      <span>강 {mockNatureData.rivers?.length ?? 0}개</span>
      <span>호수 {mockNatureData.lakes?.length ?? 0}개</span>
      <span>해안 {mockNatureData.coasts?.length ?? 0}개</span>
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
            {items.length === 0 ? (
              <ListEmptyState palette={palette} />
            ) : (
              items.map((item) => (
                <RegionListItem
                  key={item.id}
                  palette={palette}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  title={item.name}
                  subtitle={item.subtitle}
                />
              ))
            )}
          </RegionListPanel>
        }
        right={
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedItem}
            emptyIcon="🏔️"
            emptyTitle="자연 지형을 선택해주세요"
            header={
              selectedItem ? (
                <RegionDetailHeader
                  palette={palette}
                  title={selectedItem.name}
                  subtitle={selectedItem.subtitle}
                />
              ) : null
            }
          >
            {selectedMountain && (
              <>
                <MetaCard palette={palette} label="지역" value={selectedMountain.region} />
                <MetaCard palette={palette} label="높이" value={selectedMountain.height} />
                <MetaCard palette={palette} label="위치" value={selectedMountain.location} />
                {selectedMountain.nationalPark && (
                  <MetaCard palette={palette} label="구분" value="국립공원" />
                )}
              </>
            )}
            {selectedRiver && (
              <>
                <MetaCard palette={palette} label="길이" value={selectedRiver.length} />
                <MetaCard palette={palette} label="발원" value={selectedRiver.source} />
                <MetaCard palette={palette} label="하구" value={selectedRiver.mouth} />
                <MetaCard palette={palette} label="지역" value={selectedRiver.region} />
              </>
            )}
            {selectedLake && (
              <>
                <MetaCard palette={palette} label="면적" value={selectedLake.area} />
                <MetaCard palette={palette} label="수심" value={selectedLake.depth} />
                <MetaCard palette={palette} label="유형" value={selectedLake.type} />
                <MetaCard palette={palette} label="지역" value={selectedLake.region} />
              </>
            )}
            {selectedCoast && (
              <>
                <MetaCard palette={palette} label="길이" value={selectedCoast.length} />
                <MetaCard palette={palette} label="지역" value={selectedCoast.region} />
                <MetaCard palette={palette} label="유형" value={selectedCoast.type} />
              </>
            )}
          </RegionDetailPanel>
        }
      />
    </>
  )
}
