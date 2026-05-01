/**
 * 지도 및 지역 — 인프라 전용 뷰
 */
import { useMemo, useState } from 'react'

import { mockInfrastructureData } from '../mock'
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

type InfraFilter = 'all' | 'highways' | 'railways' | 'airports' | 'ports'

interface MapRegionInfrastructureViewProps {
  country: { name: string; latitude?: number | null; longitude?: number | null }
}

const FILTERS: { value: InfraFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'highways', label: '고속도로' },
  { value: 'railways', label: '철도' },
  { value: 'airports', label: '공항' },
  { value: 'ports', label: '항구' },
]

export function MapRegionInfrastructureView({
  country,
}: MapRegionInfrastructureViewProps) {
  const palette = useRegionPalette()
  const [filter, setFilter] = useState<InfraFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo(() => {
    const list: { id: string; name: string; subtitle: string; type: string }[] =
      []
    if (filter === 'all' || filter === 'highways') {
      ;(mockInfrastructureData.highways || []).forEach((h) =>
        list.push({
          id: h.id,
          name: h.name,
          subtitle: `${h.number} · ${h.length} · ${h.opening}`,
          type: 'highway',
        }),
      )
    }
    if (filter === 'all' || filter === 'railways') {
      ;(mockInfrastructureData.railways || []).forEach((r) =>
        list.push({
          id: r.id,
          name: r.name,
          subtitle: `${r.type} · ${r.length} · ${r.operator}`,
          type: 'railway',
        }),
      )
    }
    if (filter === 'all' || filter === 'airports') {
      ;(mockInfrastructureData.airports || []).forEach((a) =>
        list.push({
          id: a.id,
          name: a.name,
          subtitle: `${a.code} · ${a.type} · ${a.passengers}`,
          type: 'airport',
        }),
      )
    }
    if (filter === 'all' || filter === 'ports') {
      ;(mockInfrastructureData.ports || []).forEach((p) =>
        list.push({
          id: p.id,
          name: p.name,
          subtitle: `${p.type} · ${p.capacity} · ${p.location}`,
          type: 'port',
        }),
      )
    }
    return list
  }, [filter])

  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId)
    : null
  const selectedHighway =
    selectedId && mockInfrastructureData.highways
      ? mockInfrastructureData.highways.find((h) => h.id === selectedId)
      : null
  const selectedRailway =
    selectedId && mockInfrastructureData.railways
      ? mockInfrastructureData.railways.find((r) => r.id === selectedId)
      : null
  const selectedAirport =
    selectedId && mockInfrastructureData.airports
      ? mockInfrastructureData.airports.find((a) => a.id === selectedId)
      : null
  const selectedPort =
    selectedId && mockInfrastructureData.ports
      ? mockInfrastructureData.ports.find((p) => p.id === selectedId)
      : null

  const totalCount =
    (mockInfrastructureData.highways?.length ?? 0) +
    (mockInfrastructureData.railways?.length ?? 0) +
    (mockInfrastructureData.airports?.length ?? 0) +
    (mockInfrastructureData.ports?.length ?? 0)

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
      <span>고속도로 {mockInfrastructureData.highways?.length ?? 0}개</span>
      <span>철도 {mockInfrastructureData.railways?.length ?? 0}개</span>
      <span>공항 {mockInfrastructureData.airports?.length ?? 0}개</span>
      <span>항구 {mockInfrastructureData.ports?.length ?? 0}개</span>
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
            emptyIcon="⚡"
            emptyTitle="인프라를 선택해주세요"
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
            {selectedHighway && (
              <>
                <MetaCard palette={palette} label="노선 번호" value={selectedHighway.number} />
                <MetaCard palette={palette} label="연장" value={selectedHighway.length} />
                <MetaCard palette={palette} label="차선" value={selectedHighway.lanes} />
                <MetaCard palette={palette} label="구간" value={selectedHighway.sections} />
                <MetaCard palette={palette} label="개통" value={selectedHighway.opening} />
              </>
            )}
            {selectedRailway && (
              <>
                <MetaCard palette={palette} label="유형" value={selectedRailway.type} />
                <MetaCard palette={palette} label="연장" value={selectedRailway.length} />
                <MetaCard palette={palette} label="역 수" value={selectedRailway.stations ?? '—'} />
                <MetaCard palette={palette} label="개통" value={selectedRailway.opening} />
                <MetaCard palette={palette} label="운영" value={selectedRailway.operator} />
              </>
            )}
            {selectedAirport && (
              <>
                <MetaCard palette={palette} label="코드" value={selectedAirport.code} />
                <MetaCard palette={palette} label="유형" value={selectedAirport.type} />
                <MetaCard palette={palette} label="이용객" value={selectedAirport.passengers} />
                <MetaCard palette={palette} label="위치" value={selectedAirport.location} />
              </>
            )}
            {selectedPort && (
              <>
                <MetaCard palette={palette} label="유형" value={selectedPort.type} />
                <MetaCard palette={palette} label="처리능력" value={selectedPort.capacity} />
                <MetaCard palette={palette} label="위치" value={selectedPort.location} />
              </>
            )}
          </RegionDetailPanel>
        }
      />
    </>
  )
}
