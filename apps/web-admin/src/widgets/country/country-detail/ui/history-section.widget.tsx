import { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import type { Country } from '@/entities/country/api'

import { useThemeStore } from '@/shared/styles/theme.store'

import { mockHistoryData } from '../mock'
import type { HistoricalEvent, HistoricalPeriod } from '../mock/history-types'

// ============================================
// 역사 섹션 컴포넌트
// ============================================

interface HistorySectionProps {
  selectedCountry?: Country | null
}

export const HistorySection = ({ selectedCountry }: HistorySectionProps) => {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const [activeView] = useState<'events'>('events')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [selectedCountryId, setSelectedCountryId] = useState<string>('all') // 선택된 국가
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(
    null,
  )
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [eventImageIndex, setEventImageIndex] = useState(0)
  const [expandedMajorEvents, setExpandedMajorEvents] = useState<Set<string>>(
    new Set(),
  ) // 확장된 거대 사건들

  const { succession, events, timeline, majorEvents, subEventsByParent } =
    mockHistoryData

  // 외부에서 선택된 국가가 변경되면 자동으로 필터링
  useEffect(() => {
    if (selectedCountry) {
      // 이름으로 역사적 국가 찾기
      const foundCountry = succession.predecessorCountries.find(
        (pc) =>
          pc.name === selectedCountry.name ||
          pc.nameEn === selectedCountry.name ||
          pc.name.includes(selectedCountry.name) ||
          selectedCountry.name.includes(pc.name),
      )

      if (foundCountry) {
        // 역사적 국가가 매칭되면 해당 국가로 필터링
        setSelectedCountryId(foundCountry.id)
        setSelectedPeriod(null)
        setSelectedEvent(null)
      } else {
        // 매칭되는 역사적 국가가 없으면 전체 보기 (현대 국가)
        setSelectedCountryId('all')
      }
    } else {
      // 국가 선택 해제 시 전체 보기
      setSelectedCountryId('all')
    }
  }, [selectedCountry, succession.predecessorCountries])

  // 국가별 필터링된 사건 목록
  const eventsByCountry =
    selectedCountryId === 'all'
      ? events
      : events.filter((event) => event.countryId === selectedCountryId)

  const majorEventsByCountry =
    selectedCountryId === 'all'
      ? majorEvents
      : majorEvents.filter((event) => event.countryId === selectedCountryId)

  // 필터링된 사건 목록 (major만 + 타입 필터)
  const filteredMajorEvents =
    eventTypeFilter === 'all'
      ? majorEventsByCountry
      : majorEventsByCountry.filter((event) => event.type === eventTypeFilter)

  // 시대별로 그룹화된 사건
  const eventsByPeriod = selectedPeriod
    ? events.filter((event) =>
        timeline.periods
          .find((period) => period.id === selectedPeriod)
          ?.majorEvents.includes(event.id),
      )
    : []

  // 사건 타입 한글화
  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      war: '전쟁',
      treaty: '조약',
      reform: '개혁',
      revolution: '혁명',
      diplomatic: '외교',
      economic: '경제',
      cultural: '문화',
      disaster: '재난',
      establishment: '건국/설립',
      collapse: '멸망',
    }
    return labels[type] || type
  }

  // 사건 타입 색상
  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      war: '#ef4444',
      treaty: '#3b82f6',
      reform: '#10b981',
      revolution: '#f59e0b',
      diplomatic: '#8b5cf6',
      economic: '#06b6d4',
      cultural: '#ec4899',
      disaster: '#64748b',
      establishment: '#84cc16',
      collapse: '#dc2626',
    }
    return colors[type] || '#6b7280'
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    if (dateString.startsWith('-')) {
      const year = Math.abs(parseInt(dateString.split('-')[1]))
      return `기원전 ${year}년`
    }
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* 헤더 */}
      <div
        style={{
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
        ></div>

      </div>

      <AnimatePresence mode="wait">
        {/* 타임라인 뷰 제거됨 */}
        {false && (
          <motion.div key="timeline-removed">
            <div style={{ marginBottom: '40px' }}>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  color: '#1f2937',
                }}
              >
                🏛️ 역사적 국가
              </h3>

              <div style={{ position: 'relative' }}>
                {/* 타임라인 선 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(to right, #e5e7eb, #d1d5db)',
                    zIndex: 0,
                  }}
                />

                {/* 국가 카드들 */}
                <div
                  style={{
                    display: 'flex',
                    gap: '20px',
                    overflowX: 'auto',
                    paddingBottom: '20px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {succession.predecessorCountries.map((country, index) => {
                    const isSelected = selectedCountryId === country.id
                    const countryEventCount = events.filter(
                      (e) => e.countryId === country.id,
                    ).length

                    return (
                      <motion.div
                        key={country.id}
                        whileHover={{ y: -5, scale: 1.02 }}
                        onClick={() => {
                          setSelectedCountryId(country.id)
                          setSelectedPeriod(null)
                          setSelectedEvent(null)
                        }}
                        style={{
                          minWidth: '280px',
                          background: isSelected
                            ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
                            : 'white',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: isSelected
                            ? '0 6px 12px rgba(139, 92, 246, 0.3)'
                            : '0 4px 6px rgba(0,0,0,0.1)',
                          border: isSelected
                            ? '2px solid #8b5cf6'
                            : '2px solid #e5e7eb',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s',
                        }}
                      >
                        {/* 선택 표시 */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              width: '24px',
                              height: '24px',
                              background: '#8b5cf6',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold',
                            }}
                          >
                            ✓
                          </div>
                        )}

                        {/* 연결점 */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '16px',
                            height: '16px',
                            background: isSelected ? '#8b5cf6' : '#8b5cf6',
                            borderRadius: '50%',
                            border: '3px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        />

                        {/* 이미지 */}
                        {country.images && country.images.length > 0 && (
                          <img
                            src={country.images[0]}
                            alt={country.name}
                            style={{
                              width: '100%',
                              height: '140px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}
                          />
                        )}

                        <h4
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: isSelected ? '#6d28d9' : '#1f2937',
                          }}
                        >
                          {country.name}
                        </h4>
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '12px',
                            color: isSelected ? '#7c3aed' : '#6b7280',
                          }}
                        >
                          {country.nameEn}
                        </p>

                        <div
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: isSelected ? '#8b5cf6' : '#f3e8ff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: isSelected ? 'white' : '#7c3aed',
                            marginBottom: '12px',
                          }}
                        >
                          {new Date(country.period.start).getFullYear() > 0
                            ? new Date(country.period.start).getFullYear()
                            : `기원전 ${Math.abs(parseInt(country.period.start.split('-')[1]))}`}
                          년 ~{' '}
                          {new Date(country.period.end).getFullYear() > 0
                            ? new Date(country.period.end).getFullYear()
                            : `기원전 ${Math.abs(parseInt(country.period.end.split('-')[1]))}`}
                          년
                        </div>

                        {/* 사건 개수 표시 */}
                        <div
                          style={{
                            padding: '8px',
                            background: isSelected
                              ? 'rgba(139, 92, 246, 0.2)'
                              : '#f9fafb',
                            borderRadius: '6px',
                            marginBottom: '12px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              color: isSelected ? '#6d28d9' : '#6b7280',
                              marginBottom: '2px',
                            }}
                          >
                            주요 사건
                          </div>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: isSelected ? '#8b5cf6' : '#1f2937',
                            }}
                          >
                            {countryEventCount}건
                          </div>
                        </div>

                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '13px',
                            color: isSelected ? '#6d28d9' : '#374151',
                            lineHeight: '1.5',
                          }}
                        >
                          <strong>수도:</strong> {country.capital}
                        </p>
                        <p
                          style={{
                            margin: '0 0 12px 0',
                            fontSize: '13px',
                            color: isSelected ? '#7c3aed' : '#4b5563',
                            lineHeight: '1.5',
                          }}
                        >
                          {country.significance}
                        </p>

                        {/* 문화적 성취 */}
                        {country.culturalAchievements &&
                          country.culturalAchievements.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: isSelected ? '#7c3aed' : '#6b7280',
                                  marginBottom: '6px',
                                }}
                              >
                                주요 업적
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                }}
                              >
                                {country.culturalAchievements
                                  .slice(0, 3)
                                  .map((achievement, achievementIndex) => (
                                    <span
                                      key={achievementIndex}
                                      style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        background: isSelected
                                          ? 'rgba(139, 92, 246, 0.2)'
                                          : '#f9fafb',
                                        border: isSelected
                                          ? '1px solid #8b5cf6'
                                          : '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        color: isSelected
                                          ? '#6d28d9'
                                          : '#374151',
                                      }}
                                    >
                                      {achievement}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* 화살표 (다음 국가가 있을 때만) */}
                        {index < succession.predecessorCountries.length - 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '-30px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '24px',
                              color: '#d1d5db',
                              zIndex: 2,
                            }}
                          >
                            →
                          </div>
                        )}
                      </motion.div>
                    )
                  })}

                  {/* 현대 대한민국 - 전체 보기 */}
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={() => {
                      setSelectedCountryId('all')
                      setSelectedPeriod(null)
                      setSelectedEvent(null)
                    }}
                    style={{
                      minWidth: '280px',
                      background:
                        selectedCountryId === 'all'
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow:
                        selectedCountryId === 'all'
                          ? '0 6px 12px rgba(139, 92, 246, 0.3)'
                          : '0 4px 6px rgba(0,0,0,0.1)',
                      border:
                        selectedCountryId === 'all'
                          ? '2px solid #7c3aed'
                          : '2px solid #d1d5db',
                      color: selectedCountryId === 'all' ? 'white' : '#1f2937',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {/* 선택 표시 */}
                    {selectedCountryId === 'all' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          background: 'white',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#8b5cf6',
                          fontSize: '14px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✓
                      </div>
                    )}

                    {/* 연결점 */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '20px',
                        height: '20px',
                        background:
                          selectedCountryId === 'all' ? 'white' : '#8b5cf6',
                        borderRadius: '50%',
                        border:
                          selectedCountryId === 'all'
                            ? '3px solid #8b5cf6'
                            : '3px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    />

                    <div
                      style={{
                        fontSize: '48px',
                        textAlign: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      🇰🇷
                    </div>

                    <h4
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      대한민국
                    </h4>
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '12px',
                        textAlign: 'center',
                        opacity: 0.9,
                      }}
                    >
                      Republic of Korea
                    </p>

                    <div
                      style={{
                        textAlign: 'center',
                        padding: '6px 12px',
                        background:
                          selectedCountryId === 'all'
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color:
                          selectedCountryId === 'all' ? 'white' : '#8b5cf6',
                      }}
                    >
                      1948년 ~ 현재
                    </div>

                    {/* 전체 사건 개수 */}
                    <div
                      style={{
                        padding: '12px',
                        background:
                          selectedCountryId === 'all'
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          opacity: 0.9,
                          marginBottom: '4px',
                          textAlign: 'center',
                        }}
                      >
                        {selectedCountryId === 'all'
                          ? '📂 전체 역사'
                          : '주요 사건'}
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        {events.length}건
                      </div>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        opacity: 0.95,
                      }}
                    >
                      {selectedCountryId === 'all'
                        ? '한반도 전체 역사를 탐색합니다'
                        : '민주공화국으로서 경제 발전과 민주화를 이룬 현대 국가'}
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* 선택된 국가 정보 */}
            {selectedCountryId !== 'all' && (
              <div style={{ marginBottom: '40px' }}>
                {(() => {
                  const selectedCountryFound =
                    succession.predecessorCountries.find(
                      (countryItem) => countryItem.id === selectedCountryId,
                    )
                  if (!selectedCountryFound) return null
                  // 파일이 거대해 TS 흐름 분석(CFA)이 비활성화됨 — 바로 위에서 undefined를 걸렀으므로 단언 사용
                  const selectedCountry = selectedCountryFound!

                  const countryEvents = majorEventsByCountry.length

                  return (
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                        borderRadius: '12px',
                        padding: '24px',
                        border: '2px solid #8b5cf6',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          marginBottom: '20px',
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            background:
                              'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                          }}
                        >
                          🏛️
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '28px',
                              fontWeight: 'bold',
                              color: '#6d28d9',
                            }}
                          >
                            {selectedCountry.name}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '14px',
                              color: '#7c3aed',
                            }}
                          >
                            {selectedCountry.nameEn} • {selectedCountry.dynasty}
                          </p>
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            padding: '12px 16px',
                            background: 'rgba(139, 92, 246, 0.3)',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6d28d9',
                              marginBottom: '4px',
                            }}
                          >
                            주요 사건
                          </div>
                          <div
                            style={{
                              fontSize: '28px',
                              fontWeight: 'bold',
                              color: '#8b5cf6',
                            }}
                          >
                            {countryEvents}건
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '16px',
                          marginBottom: '20px',
                        }}
                      >
                        <div
                          style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginBottom: '4px',
                            }}
                          >
                            존속 기간
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1f2937',
                            }}
                          >
                            {new Date(
                              selectedCountry.period.start,
                            ).getFullYear() > 0
                              ? new Date(
                                  selectedCountry.period.start,
                                ).getFullYear()
                              : `기원전 ${Math.abs(parseInt(selectedCountry.period.start.split('-')[1]))}`}
                            년 ~{' '}
                            {new Date(
                              selectedCountry.period.end,
                            ).getFullYear() > 0
                              ? new Date(
                                  selectedCountry.period.end,
                                ).getFullYear()
                              : `기원전 ${Math.abs(parseInt(selectedCountry.period.end.split('-')[1]))}`}
                            년
                          </div>
                        </div>
                        <div
                          style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginBottom: '4px',
                            }}
                          >
                            수도
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1f2937',
                            }}
                          >
                            {selectedCountry.capital}
                          </div>
                        </div>
                        <div
                          style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              marginBottom: '4px',
                            }}
                          >
                            정부 형태
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1f2937',
                            }}
                          >
                            {selectedCountry.government}
                          </div>
                        </div>
                        {selectedCountry.population && (
                          <div
                            style={{
                              background: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '4px',
                              }}
                            >
                              인구
                            </div>
                            <div
                              style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#1f2937',
                              }}
                            >
                              {selectedCountry.population}
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          background: 'white',
                          padding: '16px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '8px',
                          }}
                        >
                          💡 역사적 의의
                        </div>
                        <div
                          style={{
                            fontSize: '15px',
                            color: '#374151',
                            lineHeight: '1.6',
                          }}
                        >
                          {selectedCountry.significance}
                        </div>
                      </div>

                      {(selectedCountry.culturalAchievements?.length ?? 0) >
                        0 && (
                          <div
                            style={{
                              background: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '12px',
                              }}
                            >
                              🎨 문화적 업적
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              {(selectedCountry.culturalAchievements ?? []).map(
                                (achievement, achievementIndex) => (
                                  <div
                                    key={achievementIndex}
                                    style={{
                                      padding: '8px 12px',
                                      background:
                                        'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                                      border: '1px solid #8b5cf6',
                                      borderRadius: '6px',
                                      fontSize: '13px',
                                      fontWeight: '500',
                                      color: '#6d28d9',
                                    }}
                                  >
                                    {achievement}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 시대별 구분 */}
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  color: '#1f2937',
                }}
              >
                📚 시대별 구분
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {timeline.periods.map((period) => (
                  <motion.div
                    key={period.id}
                    whileHover={{ y: -3, scale: 1.02 }}
                    onClick={() => setSelectedPeriod(period.id)}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: `2px solid ${period.color}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          background: `${period.color}20`,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        📖
                      </div>
                      <div>
                        <h4
                          style={{
                            margin: '0 0 2px 0',
                            fontSize: '18px',
                            fontWeight: 'bold',
                          }}
                        >
                          {period.name}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#6b7280',
                          }}
                        >
                          {period.nameEn}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: `${period.color}15`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: period.color,
                        marginBottom: '10px',
                      }}
                    >
                      {period.startYear < 0
                        ? `기원전 ${Math.abs(period.startYear)}`
                        : period.startYear}
                      년 ~ {period.endYear}년
                    </div>

                    <p
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: '13px',
                        color: '#4b5563',
                        lineHeight: '1.5',
                      }}
                    >
                      {period.description}
                    </p>

                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                    >
                      {period.characteristics
                        .slice(0, 3)
                        .map((char, charIndex) => (
                          <span
                            key={charIndex}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              color: '#374151',
                            }}
                          >
                            {char}
                          </span>
                        ))}
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      주요 사건 {period.majorEvents.length}건 →
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 시대 상세 뷰 - 타임라인 기능 제거 */}
        {false && selectedPeriod && (
          <motion.div
            key="period-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => setSelectedPeriod(null)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                background: '#f3f4f6',
                color: '#374151',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ← 뒤로 가기
            </button>

            {(() => {
              const periodFound = timeline.periods.find(
                (periodItem) => periodItem.id === selectedPeriod,
              )
              if (!periodFound) return null
              // 파일이 거대해 TS 흐름 분석(CFA)이 비활성화됨 — 바로 위에서 undefined를 걸렀으므로 단언 사용
              const period = periodFound!

              return (
                <div>
                  {/* 시대 헤더 */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${period.color} 0%, ${period.color}dd 100%)`,
                      borderRadius: '12px',
                      padding: '30px',
                      color: 'white',
                      marginBottom: '30px',
                    }}
                  >
                    <h2
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '32px',
                        fontWeight: 'bold',
                      }}
                    >
                      {period.name}
                    </h2>
                    <p
                      style={{
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        opacity: 0.9,
                      }}
                    >
                      {period.nameEn}
                    </p>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '16px',
                      }}
                    >
                      {period.startYear < 0
                        ? `기원전 ${Math.abs(period.startYear)}`
                        : period.startYear}
                      년 ~ {period.endYear}년
                    </div>
                    <p
                      style={{ margin: 0, fontSize: '16px', lineHeight: '1.6' }}
                    >
                      {period.description}
                    </p>
                  </div>

                  {/* 시대적 특징 */}
                  <div style={{ marginBottom: '30px' }}>
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '16px',
                      }}
                    >
                      시대적 특징
                    </h3>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                    >
                      {period.characteristics.map((char, charIndex) => (
                        <div
                          key={charIndex}
                          style={{
                            padding: '10px 16px',
                            background: `${period.color}10`,
                            border: `2px solid ${period.color}30`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151',
                          }}
                        >
                          {char}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 주요 사건 */}
                  <div>
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '16px',
                      }}
                    >
                      주요 사건 ({eventsByPeriod.length}건)
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {eventsByPeriod.map((event) => (
                        <motion.div
                          key={event.id}
                          whileHover={{ x: 5 }}
                          onClick={() => setSelectedEvent(event)}
                          style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            border: '2px solid #e5e7eb',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '16px',
                          }}
                        >
                          {/* 사건 이미지 */}
                          {event.images && event.images.length > 0 && (
                            <img
                              src={event.images[0]}
                              alt={event.name}
                              style={{
                                width: '120px',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                flexShrink: 0,
                              }}
                            />
                          )}

                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                              }}
                            >
                              <span
                                style={{
                                  padding: '4px 10px',
                                  background: getEventTypeColor(event.type),
                                  color: 'white',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                }}
                              >
                                {getEventTypeLabel(event.type)}
                              </span>
                              <span
                                style={{ fontSize: '13px', color: '#6b7280' }}
                              >
                                {formatDate(event.date.start)}
                                {event.date.end &&
                                  ` ~ ${formatDate(event.date.end)}`}
                              </span>
                            </div>

                            <h4
                              style={{
                                margin: '0 0 8px 0',
                                fontSize: '18px',
                                fontWeight: 'bold',
                              }}
                            >
                              {event.name}
                            </h4>

                            <p
                              style={{
                                margin: '0 0 8px 0',
                                fontSize: '14px',
                                color: '#4b5563',
                                lineHeight: '1.5',
                              }}
                            >
                              {event.description}
                            </p>

                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              📍 {event.location}
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#9ca3af',
                              fontSize: '20px',
                            }}
                          >
                            →
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* 사건 타임라인 뷰 - 타임라인 기능 제거 */}
        {false && !selectedEvent && (
          <motion.div
            key="events-timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 필터 버튼 */}
            <div
              style={{
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setEventTypeFilter('all')}
                style={{
                  padding: '8px 16px',
                  border: '2px solid',
                  borderColor:
                    eventTypeFilter === 'all' ? '#8b5cf6' : '#e5e7eb',
                  borderRadius: '8px',
                  background: eventTypeFilter === 'all' ? '#f3e8ff' : 'white',
                  color: eventTypeFilter === 'all' ? '#7c3aed' : '#6b7280',
                  fontWeight: eventTypeFilter === 'all' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                전체 ({events.length})
              </button>
              {[
                'war',
                'treaty',
                'reform',
                'revolution',
                'cultural',
                'establishment',
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => setEventTypeFilter(type)}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid',
                    borderColor:
                      eventTypeFilter === type
                        ? getEventTypeColor(type)
                        : '#e5e7eb',
                    borderRadius: '8px',
                    background:
                      eventTypeFilter === type
                        ? `${getEventTypeColor(type)}20`
                        : 'white',
                    color:
                      eventTypeFilter === type
                        ? getEventTypeColor(type)
                        : '#6b7280',
                    fontWeight: eventTypeFilter === type ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {getEventTypeLabel(type)} (
                  {events.filter((eventItem) => eventItem.type === type).length}
                  )
                </button>
              ))}
            </div>

            {/* 수직 타임라인 */}
            <div style={{ position: 'relative', paddingLeft: '80px' }}>
              {/* 타임라인 선 */}
              <div
                style={{
                  position: 'absolute',
                  left: '40px',
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background:
                    'linear-gradient(to bottom, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)',
                }}
              />

              {/* 사건 목록 (시간순) */}
              {filteredMajorEvents
                .sort((eventA, eventB) => {
                  const getYear = (dateString: string) => {
                    if (dateString.startsWith('-')) {
                      return -parseInt(dateString.split('-')[1])
                    }
                    return new Date(dateString).getFullYear()
                  }
                  return getYear(eventA.date.start) - getYear(eventB.date.start)
                })
                .map((event, index) => {
                  const year = event.date.start.startsWith('-')
                    ? `기원전 ${Math.abs(parseInt(event.date.start.split('-')[1]))}년`
                    : `${new Date(event.date.start).getFullYear()}년`

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        position: 'relative',
                        marginBottom: '40px',
                      }}
                    >
                      {/* 타임라인 점 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-54px',
                          top: '24px',
                          width: '24px',
                          height: '24px',
                          background: getEventTypeColor(event.type),
                          borderRadius: '50%',
                          border: '4px solid white',
                          boxShadow: '0 0 0 2px #e5e7eb',
                          zIndex: 2,
                        }}
                      />

                      {/* 연도 표시 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-150px',
                          top: '20px',
                          width: '80px',
                          textAlign: 'right',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#374151',
                        }}
                      >
                        {year}
                      </div>

                      {/* 사건 카드 */}
                      <motion.div
                        whileHover={{ scale: 1.02, x: 5 }}
                        onClick={() => {
                          setSelectedEvent(event)
                          setEventImageIndex(0)
                        }}
                        style={{
                          background: 'white',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '2px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '16px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* 사건 이미지 */}
                        {event.images && event.images.length > 0 && (
                          <img
                            src={event.images[0]}
                            alt={event.name}
                            style={{
                              width: '120px',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div style={{ flex: 1 }}>
                          {/* 타입 배지 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '10px',
                            }}
                          >
                            <span
                              style={{
                                padding: '5px 12px',
                                background: getEventTypeColor(event.type),
                                color: 'white',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              {getEventTypeLabel(event.type)}
                            </span>
                            {event.date.end && (
                              <span
                                style={{ fontSize: '12px', color: '#9ca3af' }}
                              >
                                ~ {formatDate(event.date.end)}
                              </span>
                            )}
                          </div>

                          <h4
                            style={{
                              margin: '0 0 6px 0',
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: '#1f2937',
                            }}
                          >
                            {event.name}
                          </h4>
                          <p
                            style={{
                              margin: '0 0 10px 0',
                              fontSize: '13px',
                              color: '#6b7280',
                            }}
                          >
                            {event.nameEn}
                          </p>

                          <p
                            style={{
                              margin: '0 0 10px 0',
                              fontSize: '14px',
                              color: '#4b5563',
                              lineHeight: '1.6',
                            }}
                          >
                            {event.description}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              fontSize: '13px',
                              color: '#6b7280',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              📍 {event.location}
                            </div>
                            {event.participants.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                👥{' '}
                                {event.participants
                                  .slice(0, 2)
                                  .map((participant) => participant.name)
                                  .join(', ')}
                                {event.participants.length > 2 &&
                                  ` 외 ${event.participants.length - 2}`}
                              </div>
                            )}
                          </div>

                          {/* 의의 미리보기 */}
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '10px',
                              background: '#fef3c7',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#78350f',
                              lineHeight: '1.5',
                            }}
                          >
                            💡 {event.significance}
                          </div>
                        </div>

                        {/* 화살표 */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: '#9ca3af',
                            fontSize: '24px',
                          }}
                        >
                          →
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
            </div>
          </motion.div>
        )}

        {/* 사건 목록 뷰 */}
        {activeView === 'events' && !selectedEvent && (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 필터 버튼 */}
            <div
              style={{
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setEventTypeFilter('all')}
                style={{
                  padding: '8px 16px',
                  border: '2px solid',
                  borderColor:
                    eventTypeFilter === 'all' ? '#8b5cf6' : '#e5e7eb',
                  borderRadius: '8px',
                  background: eventTypeFilter === 'all'
                    ? (isDark ? 'rgba(99,102,241,0.12)' : '#f3e8ff')
                    : (isDark ? '#212121' : 'white'),
                  color: eventTypeFilter === 'all'
                    ? '#7c3aed'
                    : (isDark ? '#a1a1aa' : '#6b7280'),
                  fontWeight: eventTypeFilter === 'all' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                전체 ({events.length})
              </button>
              {[
                'war',
                'treaty',
                'reform',
                'revolution',
                'cultural',
                'establishment',
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => setEventTypeFilter(type)}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid',
                    borderColor:
                      eventTypeFilter === type
                        ? getEventTypeColor(type)
                        : (isDark ? '#2a2a2a' : '#e5e7eb'),
                    borderRadius: '8px',
                    background:
                      eventTypeFilter === type
                        ? `${getEventTypeColor(type)}20`
                        : (isDark ? '#212121' : 'white'),
                    color:
                      eventTypeFilter === type
                        ? getEventTypeColor(type)
                        : (isDark ? '#a1a1aa' : '#6b7280'),
                    fontWeight: eventTypeFilter === type ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {getEventTypeLabel(type)} (
                  {events.filter((eventItem) => eventItem.type === type).length}
                  )
                </button>
              ))}
            </div>

            {/* 사건 목록 */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredMajorEvents.map((event) => {
                const hasSubEvents =
                  event.subEvents && event.subEvents.length > 0
                const isExpanded = expandedMajorEvents.has(event.id)
                const subEvents = hasSubEvents
                  ? subEventsByParent[event.id] || []
                  : []

                return (
                  <div key={event.id}>
                    {/* 거대 사건 카드 */}
                    <motion.div
                      whileHover={{ x: 5 }}
                      style={{
                        background: isDark ? '#212121' : 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: hasSubEvents
                          ? '2px solid #8b5cf6'
                          : (isDark ? '2px solid #2a2a2a' : '2px solid #e5e7eb'),
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {/* 사건 이미지 */}
                        {event.images && event.images.length > 0 && (
                          <img
                            src={event.images[0]}
                            alt={event.name}
                            style={{
                              width: '140px',
                              height: '140px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <span
                              style={{
                                padding: '4px 10px',
                                background: getEventTypeColor(event.type),
                                color: 'white',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}
                            >
                              {getEventTypeLabel(event.type)}
                            </span>
                            {hasSubEvents && (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  background: '#f3e8ff',
                                  color: '#7c3aed',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                }}
                              >
                                📂 {subEvents.length}개 세부 사건
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '13px',
                                color: isDark ? '#a1a1aa' : '#6b7280',
                              }}
                            >
                              {formatDate(event.date.start)}
                              {event.date.end &&
                                ` ~ ${formatDate(event.date.end)}`}
                            </span>
                          </div>

                          <h4
                            onClick={() => {
                              setSelectedEvent(event)
                              setEventImageIndex(0)
                            }}
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '20px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            {event.name}
                          </h4>
                          <p
                            style={{
                              margin: '0 0 10px 0',
                              fontSize: '13px',
                              color: isDark ? '#a1a1aa' : '#6b7280',
                            }}
                          >
                            {event.nameEn}
                          </p>

                          <p
                            style={{
                              margin: '0 0 10px 0',
                              fontSize: '14px',
                              color: isDark ? '#d1d5db' : '#4b5563',
                              lineHeight: '1.5',
                            }}
                          >
                            {event.description}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              fontSize: '12px',
                              color: isDark ? '#a1a1aa' : '#6b7280',
                            }}
                          >
                            <div>📍 {event.location}</div>
                            {event.participants.length > 0 && (
                              <div>
                                참여:{' '}
                                {event.participants
                                  .slice(0, 2)
                                  .map((participant) => participant.name)
                                  .join(', ')}
                                {event.participants.length > 2 &&
                                  ` 외 ${event.participants.length - 2}명`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 확장/축소 버튼 */}
                        {hasSubEvents && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedMajorEvents((prev) => {
                                const newSet = new Set(prev)
                                if (newSet.has(event.id)) {
                                  newSet.delete(event.id)
                                } else {
                                  newSet.add(event.id)
                                }
                                return newSet
                              })
                            }}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              border: '2px solid #8b5cf6',
                              background: isExpanded
                                ? '#8b5cf6'
                                : (isDark ? '#212121' : 'white'),
                              color: isExpanded ? 'white' : '#8b5cf6',
                              fontSize: '20px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                            }}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        )}

                        {/* 상세보기 화살표 */}
                        {!hasSubEvents && (
                          <div
                            onClick={() => {
                              setSelectedEvent(event)
                              setEventImageIndex(0)
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: isDark ? '#71717a' : '#9ca3af',
                              fontSize: '24px',
                              cursor: 'pointer',
                            }}
                          >
                            →
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* 하위 사건 목록 */}
                    {hasSubEvents && isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          marginTop: '12px',
                          marginLeft: '40px',
                          paddingLeft: '20px',
                          borderLeft: '3px solid #8b5cf6',
                        }}
                      >
                        {subEvents.map((subEvent, subIndex) => (
                          <motion.div
                            key={subEvent.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: subIndex * 0.05 }}
                            whileHover={{ x: 5 }}
                            onClick={() => {
                              setSelectedEvent(subEvent)
                              setEventImageIndex(0)
                            }}
                            style={{
                              background: isDark ? '#1d1d1d' : '#f9fafb',
                              borderRadius: '8px',
                              padding: '16px',
                              marginBottom: '8px',
                              border: isDark
                                ? '2px solid #2a2a2a'
                                : '2px solid #e5e7eb',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: '12px',
                            }}
                          >
                            {/* 하위 사건 이미지 */}
                            {subEvent.images && subEvent.images.length > 0 && (
                              <img
                                src={subEvent.images[0]}
                                alt={subEvent.name}
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginBottom: '6px',
                                }}
                              >
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    background: isDark ? '#2a2a2a' : '#e5e7eb',
                                    color: isDark ? '#d1d5db' : '#374151',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                  }}
                                >
                                  세부
                                </span>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: isDark ? '#a1a1aa' : '#6b7280',
                                  }}
                                >
                                  {formatDate(subEvent.date.start)}
                                </span>
                              </div>

                              <h5
                                style={{
                                  margin: '0 0 4px 0',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: isDark ? '#f5f5f5' : '#1f2937',
                                }}
                              >
                                {subEvent.name}
                              </h5>

                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '13px',
                                  color: isDark ? '#a1a1aa' : '#6b7280',
                                  lineHeight: '1.4',
                                }}
                              >
                                {subEvent.description}
                              </p>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                color: isDark ? '#71717a' : '#9ca3af',
                                fontSize: '18px',
                              }}
                            >
                              →
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* 사건 상세 뷰 */}
        {selectedEvent && (
          <motion.div
            key="event-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                background: isDark ? '#2a2a2a' : '#f3f4f6',
                color: isDark ? '#d1d5db' : '#374151',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ← 뒤로 가기
            </button>

            {/* 사건 헤더 */}
            <div
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                borderRadius: '12px',
                padding: '30px',
                color: 'white',
                marginBottom: '30px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '12px',
                }}
              >
                {getEventTypeLabel(selectedEvent.type)}
              </span>

              <h2
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '36px',
                  fontWeight: 'bold',
                }}
              >
                {selectedEvent.name}
              </h2>
              <p
                style={{ margin: '0 0 16px 0', fontSize: '18px', opacity: 0.9 }}
              >
                {selectedEvent.nameEn}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  fontSize: '15px',
                  opacity: 0.95,
                }}
              >
                <div>
                  📅 {formatDate(selectedEvent.date.start)}
                  {selectedEvent.date.end &&
                    ` ~ ${formatDate(selectedEvent.date.end)}`}
                </div>
                <div>📍 {selectedEvent.location}</div>
              </div>
            </div>

            {/* 이미지 갤러리 */}
            {selectedEvent.images && selectedEvent.images.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                  }}
                >
                  관련 이미지
                </h3>

                {/* 메인 이미지 */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <img
                    src={selectedEvent.images[eventImageIndex]}
                    alt={selectedEvent.name}
                    style={{
                      width: '100%',
                      height: '400px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                    }}
                  />

                  {/* 네비게이션 버튼 */}
                  {selectedEvent.images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setEventImageIndex(
                            (eventImageIndex -
                              1 +
                              selectedEvent.images!.length) %
                              selectedEvent.images!.length,
                          )
                        }
                        style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          border: 'none',
                          color: 'white',
                          fontSize: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ←
                      </button>
                      <button
                        onClick={() =>
                          setEventImageIndex(
                            (eventImageIndex + 1) %
                              selectedEvent.images!.length,
                          )
                        }
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          border: 'none',
                          color: 'white',
                          fontSize: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        →
                      </button>
                    </>
                  )}

                  {/* 이미지 카운터 */}
                  {selectedEvent.images.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        padding: '6px 12px',
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      {eventImageIndex + 1} / {selectedEvent.images.length}
                    </div>
                  )}
                </div>

                {/* 썸네일 */}
                {selectedEvent.images.length > 1 && (
                  <div
                    style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}
                  >
                    {selectedEvent.images.map((image, imageIndex) => (
                      <img
                        key={imageIndex}
                        src={image}
                        alt={`${selectedEvent.name} ${imageIndex + 1}`}
                        onClick={() => setEventImageIndex(imageIndex)}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border:
                            eventImageIndex === imageIndex
                              ? '3px solid #8b5cf6'
                              : '3px solid transparent',
                          opacity: eventImageIndex === imageIndex ? 1 : 0.6,
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 사건 설명 */}
            <div
              style={{
                background: isDark ? '#212121' : 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  color: isDark ? '#f5f5f5' : '#1f2937',
                }}
              >
                개요
              </h3>
              <p
                style={{
                  fontSize: '15px',
                  color: isDark ? '#d1d5db' : '#374151',
                  lineHeight: '1.7',
                  margin: 0,
                }}
              >
                {selectedEvent.description}
              </p>
            </div>

            {/* 역사적 의의 */}
            <div
              style={{
                background: isDark ? '#212121' : 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '2px solid #f3e8ff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background:
                      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  💡
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    margin: 0,
                    color: isDark ? '#f5f5f5' : '#1f2937',
                  }}
                >
                  역사적 의의
                </h3>
              </div>
              <p
                style={{
                  fontSize: '15px',
                  color: isDark ? '#d1d5db' : '#4b5563',
                  lineHeight: '1.7',
                  margin: 0,
                }}
              >
                {selectedEvent.significance}
              </p>
            </div>

            {/* 영향 */}
            {selectedEvent.impact && (
              <div
                style={{
                  background: isDark ? '#212121' : 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: isDark ? '2px solid #2a2a2a' : '2px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isDark ? '#2a2a2a' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}
                  >
                    📊
                  </div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      margin: 0,
                      color: isDark ? '#f5f5f5' : '#1f2937',
                    }}
                  >
                    영향
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: '15px',
                    color: isDark ? '#d1d5db' : '#4b5563',
                    lineHeight: '1.7',
                    margin: 0,
                  }}
                >
                  {selectedEvent.impact}
                </p>
              </div>
            )}

            {/* 인명 피해 */}
            {selectedEvent.casualties && (
              <div
                style={{
                  background: isDark ? '#212121' : 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '2px solid #fecaca',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}
                  >
                    ⚠️
                  </div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      margin: 0,
                      color: '#991b1b',
                    }}
                  >
                    인명 피해
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: '15px',
                    color: isDark ? '#d1d5db' : '#4b5563',
                    lineHeight: '1.7',
                    margin: 0,
                  }}
                >
                  {selectedEvent.casualties}
                </p>
              </div>
            )}

            {/* 하위 사건 (거대 사건인 경우) */}
            {selectedEvent.subEvents && selectedEvent.subEvents.length > 0 && (
              <div
                style={{
                  background: isDark ? '#212121' : 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '2px solid #f3e8ff',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    color: isDark ? '#f5f5f5' : '#1f2937',
                  }}
                >
                  📂 세부 사건 ({selectedEvent.subEvents.length}개)
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {(subEventsByParent[selectedEvent.id] || []).map(
                    (subEvent) => (
                      <motion.div
                        key={subEvent.id}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          setSelectedEvent(subEvent)
                          setEventImageIndex(0)
                        }}
                        style={{
                          padding: '16px',
                          background: isDark ? '#1d1d1d' : '#f9fafb',
                          border: isDark
                            ? '2px solid #2a2a2a'
                            : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                        }}
                      >
                        {/* 하위 사건 이미지 */}
                        {subEvent.images && subEvent.images.length > 0 && (
                          <img
                            src={subEvent.images[0]}
                            alt={subEvent.name}
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '4px',
                            }}
                          >
                            <span
                              style={{
                                padding: '3px 8px',
                                background: isDark ? '#2a2a2a' : '#e5e7eb',
                                color: isDark ? '#d1d5db' : '#374151',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                              }}
                            >
                              세부
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                color: isDark ? '#a1a1aa' : '#6b7280',
                              }}
                            >
                              {formatDate(subEvent.date.start)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: isDark ? '#f5f5f5' : '#1f2937',
                              marginBottom: '4px',
                            }}
                          >
                            {subEvent.name}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: isDark ? '#a1a1aa' : '#6b7280',
                            }}
                          >
                            {subEvent.description}
                          </div>
                        </div>
                        <div
                          style={{
                            color: isDark ? '#71717a' : '#9ca3af',
                            fontSize: '18px',
                          }}
                        >
                          →
                        </div>
                      </motion.div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 참여자 */}
            {selectedEvent.participants.length > 0 && (
              <div
                style={{
                  background: isDark ? '#212121' : 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    color: isDark ? '#f5f5f5' : '#1f2937',
                  }}
                >
                  참여자
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {selectedEvent.participants.map(
                    (participant, participantIndex) => (
                      <div
                        key={participantIndex}
                        style={{
                          padding: '12px',
                          background: isDark ? '#1d1d1d' : '#f9fafb',
                          border: isDark
                            ? '1px solid #2a2a2a'
                            : '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: isDark ? '#a1a1aa' : '#6b7280',
                            marginBottom: '4px',
                          }}
                        >
                          {participant.type === 'country'
                            ? '🏛️ 국가'
                            : participant.type === 'person'
                              ? '👤 인물'
                              : '🏢 조직'}
                        </div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: isDark ? '#f5f5f5' : '#1f2937',
                            marginBottom: '2px',
                          }}
                        >
                          {participant.name}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: isDark ? '#a1a1aa' : '#6b7280',
                          }}
                        >
                          {participant.role}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 관련 사건 */}
            {selectedEvent.relatedEvents.length > 0 && (
              <div
                style={{
                  background: isDark ? '#212121' : 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    color: isDark ? '#f5f5f5' : '#1f2937',
                  }}
                >
                  관련 사건
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedEvent.relatedEvents.map((relatedEventId) => {
                    const relatedEvent = events.find(
                      (eventItem) => eventItem.id === relatedEventId,
                    )
                    if (!relatedEvent) return null

                    return (
                      <motion.div
                        key={relatedEvent.id}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          setSelectedEvent(relatedEvent)
                          setEventImageIndex(0)
                        }}
                        style={{
                          padding: '16px',
                          background: isDark ? '#1d1d1d' : '#f9fafb',
                          border: isDark
                            ? '2px solid #2a2a2a'
                            : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '4px',
                            }}
                          >
                            <span
                              style={{
                                padding: '3px 8px',
                                background: '#8b5cf6',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                              }}
                            >
                              {getEventTypeLabel(relatedEvent.type)}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                color: isDark ? '#a1a1aa' : '#6b7280',
                              }}
                            >
                              {formatDate(relatedEvent.date.start)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: isDark ? '#f5f5f5' : '#1f2937',
                            }}
                          >
                            {relatedEvent.name}
                          </div>
                        </div>
                        <div
                          style={{
                            color: isDark ? '#71717a' : '#9ca3af',
                            fontSize: '18px',
                          }}
                        >
                          →
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
