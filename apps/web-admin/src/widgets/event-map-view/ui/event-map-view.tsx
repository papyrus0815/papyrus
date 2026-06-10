/**
 * Event Map View — 사건의 *공간 차원*을 표현.
 *
 * 데이터:
 *   1) event.map.markers[].coordinates — 명시적 사건 위치(전투지·점령지 등)
 *   2) (fallback) relatedCountries / relatedHistoricalCountries 첫 번째 좌표
 *
 * 인터랙션:
 *   - 마커 클릭 → 사건 선택 (drawer)
 *   - 시간 슬라이더 — startYear..endYear 범위 안 사건만 노출
 *   - 좌측 위 패널: 카테고리별 색 범례 + 보이는 마커 카운트
 *
 * 좌표 0건 사건은 *조용히 제외* (안내 라인으로 통계만 노출).
 */
import React, { useMemo, useState } from 'react'

import { FiFilter, FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import { CategoryDot } from '@/shared/ui/category-dot/category-dot'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { GoogleMap } from '@/shared/ui/google-map/google-map'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  /** 현재 글로벌 필터가 활성 상태인가 — 빈 결과 시 "필터 풀기" CTA 노출에 사용 */
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

interface MarkerFlat {
  id: string
  eventId: string
  lat: number
  lng: number
  title: string
  category: string
  year: number
}

export const EventMapView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  onSelectEvent,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  /** 모든 사건 → 마커 리스트(좌표 있는 것만). depth 0만, 같은 root는 한 번만. */
  const allMarkers = useMemo<MarkerFlat[]>(() => {
    const eventByRootId = new Map<string, HistoricalEvent>()
    for (const e of events) eventByRootId.set(e.id, e)

    const seenRoots = new Set<string>()
    const out: MarkerFlat[] = []
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      if (seenRoots.has(item.node.id)) continue
      seenRoots.add(item.node.id)
      const evt = eventByRootId.get(item.node.id)
      if (!evt) continue
      const markers = evt.map?.markers ?? []
      const year = new Date(item.node.period.start).getFullYear()
      let mIdx = 0
      for (const m of markers) {
        if (
          typeof m.coordinates?.lat !== 'number' ||
          typeof m.coordinates?.lng !== 'number'
        )
          continue
        out.push({
          // GoogleMap onMarkerClick은 단일 id를 받음. *unique* id로 두되,
          // selectedId 매칭은 prefix(eventId)로 외부에서 처리.
          id: `${evt.id}::m${mIdx}`,
          eventId: evt.id,
          lat: m.coordinates.lat,
          lng: m.coordinates.lng,
          title: m.label || evt.title,
          category: evt.category || 'other',
          year,
        })
        mIdx += 1
      }
    }
    return out
  }, [flattenedHierarchy, events])

  const yearBounds = useMemo(() => {
    if (allMarkers.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const m of allMarkers) {
      if (m.year < min) min = m.year
      if (m.year > max) max = m.year
    }
    return { min, max }
  }, [allMarkers])

  const [range, setRange] = useState<[number, number] | null>(null)
  const effectiveRange = range ?? (yearBounds ? [yearBounds.min, yearBounds.max] : null)

  const visibleMarkers = useMemo(() => {
    if (!effectiveRange) return allMarkers
    const [from, to] = effectiveRange
    return allMarkers.filter((m) => m.year >= from && m.year <= to)
  }, [allMarkers, effectiveRange])

  const eventsWithoutCoords = useMemo(() => {
    let count = 0
    const seenRoot = new Set<string>()
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      if (seenRoot.has(item.node.id)) continue
      seenRoot.add(item.node.id)
      const evt = events.find((e) => e.id === item.node.id)
      if (!evt) continue
      const has = (evt.map?.markers ?? []).some(
        (m) =>
          typeof m.coordinates?.lat === 'number' &&
          typeof m.coordinates?.lng === 'number',
      )
      if (!has) count += 1
    }
    return count
  }, [flattenedHierarchy, events])

  const mapMarkers = visibleMarkers.map((m) => ({
    id: m.id, // *unique* per marker
    latitude: m.lat,
    longitude: m.lng,
    name: m.title,
  }))

  /** 선택된 사건의 첫 마커 id — 강조 표시 매칭용 */
  const selectedMarkerId = useMemo(() => {
    if (!selectedEventId) return null
    const m = visibleMarkers.find((mm) => mm.eventId === selectedEventId)
    return m?.id ?? null
  }, [selectedEventId, visibleMarkers])

  /** GoogleMap의 onMarkerClick은 marker id를 줌 — eventId로 변환해서 부모에 전달 */
  const handleMarkerClick = (markerId: string) => {
    const m = visibleMarkers.find((mm) => mm.id === markerId)
    if (m) onSelectEvent(m.eventId)
  }

  const visibleByCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const mk of visibleMarkers) m.set(mk.category, (m.get(mk.category) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [visibleMarkers])

  if (allMarkers.length === 0) {
    // 두 가지 상황 분기:
    //  (a) 필터로 좌표 있는 사건이 모두 빠진 경우 — "필터 풀기" CTA 노출
    //  (b) 전체 데이터 자체에 좌표 없음 — 데이터 등록 안내
    return hasActiveFilters && onResetFilters ? (
      <EmptyStateSpotlight
        icon={<FiFilter size={28} />}
        title="현재 필터에 좌표 있는 사건이 없습니다"
        description="필터를 풀어 좌표가 있는 다른 사건을 확인해 보세요."
        primaryAction={{
          label: '필터 모두 초기화',
          onClick: onResetFilters,
        }}
      />
    ) : (
      <EmptyStateSpotlight
        icon={<FiMapPin size={28} />}
        title="아직 좌표 데이터가 없습니다"
        description={
          <>
            사건 등록 시 <em>map.markers</em>에 좌표를 추가하면 여기에
            표시됩니다.
          </>
        }
      />
    )
  }

  return (
    <Host>
      <Bar>
        <Stat>
          <FiMapPin size={13} aria-hidden="true" />
          <strong>{visibleMarkers.length.toLocaleString()}</strong>
          <span>마커 표시</span>
          {eventsWithoutCoords > 0 && (
            <Muted>· 좌표 없는 사건 {eventsWithoutCoords.toLocaleString()}건</Muted>
          )}
        </Stat>
        <Legend>
          {visibleByCategory.slice(0, 5).map(([cat, n]) => (
            <LegendItem key={cat}>
              <CategoryDot category={cat} size={8} />
              <span>{cat}</span>
              <Count>{n}</Count>
            </LegendItem>
          ))}
        </Legend>
      </Bar>

      {yearBounds && yearBounds.min !== yearBounds.max && (
        <RangeBar>
          <RangeLabel>
            {effectiveRange?.[0]}년 ~ {effectiveRange?.[1]}년
          </RangeLabel>
          <RangeInputs>
            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={effectiveRange?.[0] ?? yearBounds.min}
              onChange={(e) => {
                const v = Number(e.target.value)
                const cur = effectiveRange ?? [yearBounds.min, yearBounds.max]
                setRange([Math.min(v, cur[1]), cur[1]])
              }}
              aria-label="시작 연도"
            />
            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={effectiveRange?.[1] ?? yearBounds.max}
              onChange={(e) => {
                const v = Number(e.target.value)
                const cur = effectiveRange ?? [yearBounds.min, yearBounds.max]
                setRange([cur[0], Math.max(v, cur[0])])
              }}
              aria-label="종료 연도"
            />
          </RangeInputs>
          <ResetBtn
            type="button"
            onClick={() => setRange(null)}
            disabled={
              !range ||
              (range[0] === yearBounds.min && range[1] === yearBounds.max)
            }
          >
            전체 기간
          </ResetBtn>
        </RangeBar>
      )}

      <MapWrap>
        <GoogleMap
          markers={mapMarkers}
          selectedId={selectedMarkerId}
          onMarkerClick={handleMarkerClick}
        />
      </MapWrap>
    </Host>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
`

const Bar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : `background: #fff; border: 1px solid rgba(15,23,42,0.06);`}
`

const Stat = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Legend = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-left: auto;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Count = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RangeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : `background: #fff; border: 1px solid rgba(15,23,42,0.06);`}
`

const RangeLabel = styled.div`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 140px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RangeInputs = styled.div`
  display: flex;
  flex: 1;
  gap: 8px;
  input {
    flex: 1;
  }
`

const ResetBtn = styled.button`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const MapWrap = styled.div`
  flex: 1;
  min-height: 320px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'};

  /* GoogleMap 내부 height 400px overrides — flex 채우도록 */
  & > * {
    height: 100% !important;
    min-height: 320px;
  }
`

