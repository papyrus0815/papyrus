/**
 * 지도 및 지역 — 인프라 전용 뷰
 * 행정조직/행정구역과 동일한 UI: SectionLabel, pill 필터, 카드, 단순 목록·상세
 */
import { useMemo, useState } from 'react'

import { GoogleMap } from '@/shared/ui/google-map/google-map'

import { mockInfrastructureData } from '../mock'
import * as Styled from './map-region-section.styles'

const BORDER = '#e5e7eb'
const MUTED = '#64748b'
const TITLE = '#0f172a'
const MAIN = '#6366f1'

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
  const [filter, setFilter] = useState<InfraFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const currentMapLocation = {
    latitude: country.latitude ?? 37.5665,
    longitude: country.longitude ?? 126.978,
    name: country.name,
  }

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

  return (
    <>
      <section aria-label="지도">
        <Styled.MapRegionSectionLabel>지도</Styled.MapRegionSectionLabel>
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            height: 320,
          }}
        >
          {country.latitude != null && country.longitude != null ? (
            <div style={{ height: '100%', minHeight: 320 }}>
              <GoogleMap
                latitude={currentMapLocation.latitude}
                longitude={currentMapLocation.longitude}
                name={currentMapLocation.name}
                zoom={7}
              />
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
              }}
            >
              <span style={{ color: MUTED, fontSize: 14, fontWeight: 500 }}>
                지도 정보가 없습니다
              </span>
            </div>
          )}
        </div>
      </section>

      <section aria-label="인프라">
        <Styled.MapRegionSectionLabel>인프라</Styled.MapRegionSectionLabel>
        {/* KPI 스트립 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            color: MUTED,
            fontWeight: 500,
          }}
        >
          <span style={{ color: TITLE, fontWeight: 600 }}>현재 보기</span>
          <span>·</span>
          <span>고속도로 {mockInfrastructureData.highways?.length ?? 0}개</span>
          <span>철도 {mockInfrastructureData.railways?.length ?? 0}개</span>
          <span>공항 {mockInfrastructureData.airports?.length ?? 0}개</span>
          <span>항구 {mockInfrastructureData.ports?.length ?? 0}개</span>
          <span style={{ marginLeft: 'auto', color: MAIN, fontWeight: 600 }}>
            총 {totalCount}개
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* 좌측: pill 필터 + 목록 — 높이 제한으로 리스트 스크롤 */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 1120,
              minHeight: 400,
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                flexShrink: 0,
              }}
            >
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 14,
                    border: 'none',
                    background: filter === f.value ? '#ffffff' : 'transparent',
                    color: filter === f.value ? '#4f46e5' : MUTED,
                    fontSize: 13,
                    fontWeight: filter === f.value ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow:
                      filter === f.value
                        ? '0 2px 8px rgba(79,70,229,0.12)'
                        : 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: 12,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {items.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: MUTED,
                    fontSize: 13,
                  }}
                >
                  항목이 없습니다
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && setSelectedId(item.id)
                    }
                    style={{
                      padding: '12px 14px',
                      marginBottom: 6,
                      borderRadius: 12,
                      borderLeft: `3px solid ${selectedId === item.id ? MAIN : 'transparent'}`,
                      background:
                        selectedId === item.id ? '#eef2ff' : '#ffffff',
                      border: `1px solid ${selectedId === item.id ? MAIN : BORDER}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: TITLE,
                        marginBottom: 4,
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      {item.subtitle}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 우측: 상세 */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              overflow: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              padding: 24,
              minHeight: 0,
            }}
          >
            {!selectedItem ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 320,
                  color: MUTED,
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    border: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    fontSize: 28,
                  }}
                >
                  ⚡
                </div>
                <div style={{ fontWeight: 600, color: TITLE, marginBottom: 4 }}>
                  인프라를 선택해주세요
                </div>
                <div>
                  좌측 목록에서 항목을 선택하면 상세 정보를 볼 수 있습니다
                </div>
              </div>
            ) : (
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: TITLE,
                    margin: '0 0 8px',
                  }}
                >
                  {selectedItem.name}
                </h2>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
                  {selectedItem.subtitle}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 12,
                  }}
                >
                  {selectedHighway && (
                    <>
                      <MetaCard
                        label="노선 번호"
                        value={selectedHighway.number}
                      />
                      <MetaCard label="연장" value={selectedHighway.length} />
                      <MetaCard label="차선" value={selectedHighway.lanes} />
                      <MetaCard label="구간" value={selectedHighway.sections} />
                      <MetaCard label="개통" value={selectedHighway.opening} />
                    </>
                  )}
                  {selectedRailway && (
                    <>
                      <MetaCard label="유형" value={selectedRailway.type} />
                      <MetaCard label="연장" value={selectedRailway.length} />
                      <MetaCard
                        label="역 수"
                        value={selectedRailway.stations ?? '—'}
                      />
                      <MetaCard label="개통" value={selectedRailway.opening} />
                      <MetaCard label="운영" value={selectedRailway.operator} />
                    </>
                  )}
                  {selectedAirport && (
                    <>
                      <MetaCard label="코드" value={selectedAirport.code} />
                      <MetaCard label="유형" value={selectedAirport.type} />
                      <MetaCard
                        label="이용객"
                        value={selectedAirport.passengers}
                      />
                      <MetaCard label="위치" value={selectedAirport.location} />
                    </>
                  )}
                  {selectedPort && (
                    <>
                      <MetaCard label="유형" value={selectedPort.type} />
                      <MetaCard
                        label="처리능력"
                        value={selectedPort.capacity}
                      />
                      <MetaCard label="위치" value={selectedPort.location} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: '#f8fafc',
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: MUTED,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: TITLE }}>{value}</div>
    </div>
  )
}
