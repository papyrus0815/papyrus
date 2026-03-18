/**
 * 지도 및 지역 — 행정구역 전용 뷰
 * 행정조직과 동일한 UI 패턴: SectionLabel + 카드, 단순 목록, 상세 카드
 */
import { useState, useMemo } from 'react'

import { GoogleMap } from '@/shared/ui/google-map/google-map'

import {
  administrativeSystemByCountry,
  getCountryCode,
  mockAdministrativeRegions,
  mockCityDetails,
} from '../mock'
import * as Styled from './map-region-section.styles'

const BORDER = '#e5e7eb'
const MUTED = '#64748b'
const TITLE = '#0f172a'
const MAIN = '#6366f1'

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

export function MapRegionAdministrativeView({
  country,
  mapLocation,
  onCityClick,
}: MapRegionAdministrativeViewProps) {
  const [level, setLevel] = useState<NavLevel>('level1')
  const [selectedLevel1Id, setSelectedLevel1Id] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const countryCode = getCountryCode(country.name)
  const adminSystem = administrativeSystemByCountry[countryCode]
  const currentMapLocation = mapLocation ?? {
    latitude: country.latitude ?? 37.5665,
    longitude: country.longitude ?? 126.978,
    name: country.name,
  }

  const level1List = mockAdministrativeRegions.level1
  const level2List = selectedLevel1Id
    ? mockAdministrativeRegions.level2[selectedLevel1Id] ?? []
    : []

  const currentItems = level === 'level1' ? level1List : level2List
  const filteredItems = useMemo(
    () =>
      currentItems.filter((item: { name: string }) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [currentItems, searchQuery]
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
      latitude: 37.5665,
      longitude: 126.978,
      area: details?.area,
      gdp: details?.gdp,
      industry: details?.industry,
    })
  }

  const handleLevel2Click = (item: { id: string; name: string; population?: string; area?: string }) => {
    setSelectedId(item.id)
    const details = mockCityDetails[item.id as keyof typeof mockCityDetails]
    onCityClick({
      id: item.id,
      name: item.name,
      population: details?.population ?? item.population ?? '—',
      latitude: 37.5665,
      longitude: 126.978,
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
      latitude: currentMapLocation.latitude,
      longitude: currentMapLocation.longitude,
    })
  }

  const selectedLevel1 = selectedLevel1Id
    ? level1List.find((r) => r.id === selectedLevel1Id)
    : null
  const selectedDetails = selectedId
    ? mockCityDetails[selectedId as keyof typeof mockCityDetails]
    : null

  return (
    <>
      {/* 지도 — 행정조직 섹션처럼 SectionLabel + 단일 카드 */}
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
                zoom={mapLocation ? 12 : 6}
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

      {/* 행정구역 — SectionLabel + 2열(목록 | 상세) */}
      <section aria-label="행정구역">
        <Styled.MapRegionSectionLabel>행정구역</Styled.MapRegionSectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 24,
            minHeight: 320,
            maxHeight: 'calc(100vh - 380px)',
          }}
        >
          {/* 좌측: 목록 카드 — 행정조직 목록 스타일 */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${BORDER}`,
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
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eef2ff'
                    e.currentTarget.style.borderColor = MAIN
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.borderColor = BORDER
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <span style={{ fontSize: 15, fontWeight: 700, color: TITLE }}>
                {level === 'level1' ? '1차 행정구역' : selectedLevel1?.name ?? '하위 구역'}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MAIN,
                  background: '#eef2ff',
                  padding: '4px 10px',
                  borderRadius: 8,
                }}
              >
                {filteredItems.length}개
              </span>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  fontSize: 13,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  background: '#fff',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {filteredItems.map((item: { id: string; name: string; count?: number; population?: string; area?: string }) => {
                const isSelected = selectedId === item.id
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      level === 'level1'
                        ? handleLevel1Click(item.id)
                        : handleLevel2Click(item)
                    }
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      border: 'none',
                      borderBottom: `1px solid ${BORDER}`,
                      background: isSelected ? '#eef2ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderLeft: isSelected ? `3px solid ${MAIN}` : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#fff'
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: TITLE }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: MUTED,
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {'count' in item ? `${item.count}개` : item.population ?? '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 우측: 상세 카드 — 행정조직 카드와 동일 톤 */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              padding: 28,
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            {!selectedId ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 320,
                  color: MUTED,
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                좌측 목록에서 지역을 선택하세요
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      color: TITLE,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {level === 'level1'
                      ? selectedLevel1?.name
                      : level2List.find((x: { id: string }) => x.id === selectedId)?.name ?? selectedId}
                  </h3>
                  {adminSystem && selectedLevel1Id && (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13,
                        color: MUTED,
                        fontWeight: 500,
                      }}
                    >
                      {adminSystem.countryNameKo} · {selectedLevel1?.name}
                    </p>
                  )}
                </div>
                {selectedDetails && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 16,
                    }}
                  >
                    {selectedDetails.population && (
                      <div
                        style={{
                          padding: 16,
                          background: '#f8fafc',
                          borderRadius: 12,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                          인구
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: TITLE }}>
                          {selectedDetails.population}
                        </div>
                      </div>
                    )}
                    {selectedDetails.area && (
                      <div
                        style={{
                          padding: 16,
                          background: '#f8fafc',
                          borderRadius: 12,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                          면적
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: TITLE }}>
                          {selectedDetails.area}
                        </div>
                      </div>
                    )}
                    {selectedDetails.mayor && (
                      <div
                        style={{
                          padding: 16,
                          background: '#f8fafc',
                          borderRadius: 12,
                          border: `1px solid ${BORDER}`,
                          gridColumn: '1 / -1',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                          행정 수장
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: TITLE }}>
                          {selectedDetails.mayor}
                          {selectedDetails.party && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: MAIN,
                                background: '#eef2ff',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {selectedDetails.party}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
