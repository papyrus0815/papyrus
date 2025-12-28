import { useState } from 'react'

import { motion } from 'framer-motion'

import { mockGovernmentData } from '../mock'
import type { HistoricalEvent } from '../mock/types'

/**
 * 행정조직 통계 대시보드
 * - 전체 조직 통계
 * - 주요 사건 타임라인
 * - 예산/인원 그래프
 * - 조직별 현황
 */
export function GovernmentInfoSection() {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  // 전체 통계 계산
  const totalMinistries = mockGovernmentData.ministries.length
  const totalConstitutional = mockGovernmentData.constitutionalBodies.length
  const totalAgencies = mockGovernmentData.agencies.length
  const totalLocal = mockGovernmentData.localGovernments.length
  const totalOrganizations =
    totalMinistries + totalConstitutional + totalAgencies + totalLocal

  // 전체 예산 (조원)
  const totalBudget = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const budget = parseFloat(ministry.budget.replace(/[^0-9.]/g, ''))
      return sum + budget
    }, 0)
    .toFixed(1)

  // 전체 인원
  const totalEmployees = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const employees = parseInt(ministry.employees.replace(/[^0-9]/g, ''))
      return sum + employees
    }, 0)
    .toLocaleString()

  // 모든 사건 수집
  const allEvents: (HistoricalEvent & { orgName: string; orgType: string })[] =
    []

  mockGovernmentData.ministries.forEach((ministry) => {
    if (ministry.events) {
      ministry.events.forEach((event) => {
        allEvents.push({
          ...event,
          orgName: ministry.name,
          orgType: '중앙부처',
        })
      })
    }
  })

  mockGovernmentData.constitutionalBodies.forEach((body) => {
    if (body.events) {
      body.events.forEach((event) => {
        allEvents.push({ ...event, orgName: body.name, orgType: '헌법기관' })
      })
    }
  })

  mockGovernmentData.agencies.forEach((agency) => {
    if (agency.events) {
      agency.events.forEach((event) => {
        allEvents.push({ ...event, orgName: agency.name, orgType: '산하기관' })
      })
    }
  })

  mockGovernmentData.localGovernments.forEach((local) => {
    if (local.events) {
      local.events.forEach((event: HistoricalEvent) => {
        allEvents.push({ ...event, orgName: local.name, orgType: '지방정부' })
      })
    }
  })

  // 연도순 정렬
  allEvents.sort(
    (eventA, eventB) => parseInt(eventB.year) - parseInt(eventA.year),
  )

  // 필터링된 사건
  const filteredEvents =
    selectedEventType === 'all'
      ? allEvents
      : allEvents.filter((event) => event.type === selectedEventType)

  // 사건 타입별 개수
  const eventCounts = {
    all: allEvents.length,
    establishment: allEvents.filter((event) => event.type === 'establishment')
      .length,
    reform: allEvents.filter((event) => event.type === 'reform').length,
    achievement: allEvents.filter((event) => event.type === 'achievement')
      .length,
    crisis: allEvents.filter((event) => event.type === 'crisis').length,
    merger: allEvents.filter((event) => event.type === 'merger').length,
  }

  // 연도별 예산 데이터 (기획재정부 기준)
  const budgetData = mockGovernmentData.ministries[0].statistics || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        background: '#f8fafc',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
      }}
    >
      {/* 통계 카드 그리드 - 상단으로 올려서 국기 영역과 겹치게 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          marginTop: '-80px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          }
          title="전체 조직"
          value={totalOrganizations}
          unit="개"
          color="#8b5cf6"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
            </svg>
          }
          title="중앙부처"
          value={totalMinistries}
          unit="개"
          color="#3b82f6"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          }
          title="헌법기관"
          value={totalConstitutional}
          unit="개"
          color="#10b981"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          title="총 인원"
          value={totalEmployees}
          unit="명"
          color="#f59e0b"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title="총 예산"
          value={totalBudget}
          unit="조원"
          color="#ef4444"
        />
      </div>

      {/* 조직별 상세 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        <OrgTypeCard
          title="중앙행정기관"
          count={totalMinistries}
          color="#8b5cf6"
          description="18개 부처"
          examples={['기획재정부', '외교부', '국방부']}
        />
        <OrgTypeCard
          title="헌법기관"
          count={totalConstitutional}
          color="#3b82f6"
          description="5개 기관"
          examples={['국회', '대법원', '헌법재판소']}
        />
        <OrgTypeCard
          title="산하기관"
          count={totalAgencies}
          color="#10b981"
          description="8개 기관"
          examples={['국세청', '관세청', '경찰청']}
        />
        <OrgTypeCard
          title="지방자치단체"
          count={totalLocal}
          color="#f59e0b"
          description="4개 시/도"
          examples={['서울시', '경기도', '부산시']}
        />
      </div>

      {/* 예산 추이 그래프 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              국가 예산 추이
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              최근 6년간 예산 변화 (단위: 조원)
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            height: '280px',
            padding: '20px 0',
          }}
        >
          {budgetData.map((stat, idx) => {
            const maxBudget = Math.max(...budgetData.map((s) => s.budget || 0))
            const height = ((stat.budget || 0) / maxBudget) * 240
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}px`,
                    background:
                      'linear-gradient(180deg, #8b5cf6 0%, #a78bfa 100%)',
                    borderRadius: '12px 12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '16px 8px',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 700,
                    boxShadow: '0 -4px 16px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)'
                    e.currentTarget.style.boxShadow =
                      '0 -8px 24px rgba(139, 92, 246, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow =
                      '0 -4px 16px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  {stat.budget}조
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {stat.year}
                  </span>
                  {idx > 0 && budgetData[idx - 1].budget && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color:
                          (stat.budget || 0) > (budgetData[idx - 1].budget || 0)
                            ? '#10b981'
                            : '#ef4444',
                      }}
                    >
                      {(stat.budget || 0) > (budgetData[idx - 1].budget || 0)
                        ? '↑'
                        : '↓'}{' '}
                      {Math.abs(
                        ((stat.budget || 0) -
                          (budgetData[idx - 1].budget || 0)) /
                          (budgetData[idx - 1].budget || 1),
                      ).toFixed(1)}
                      %
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 주요 사건 타임라인 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                주요 사건 타임라인
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                행정조직 관련 주요 역사적 사건
              </p>
            </div>
          </div>

          {/* 사건 타입 필터 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'all', label: '전체', count: eventCounts.all },
              {
                key: 'establishment',
                label: '설립',
                count: eventCounts.establishment,
              },
              { key: 'reform', label: '개혁', count: eventCounts.reform },
              {
                key: 'achievement',
                label: '성과',
                count: eventCounts.achievement,
              },
              { key: 'crisis', label: '위기', count: eventCounts.crisis },
              { key: 'merger', label: '통합', count: eventCounts.merger },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedEventType(filter.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border:
                    selectedEventType === filter.key
                      ? '2px solid #8b5cf6'
                      : '1px solid #e2e8f0',
                  background:
                    selectedEventType === filter.key
                      ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                      : '#ffffff',
                  color:
                    selectedEventType === filter.key ? '#8b5cf6' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (selectedEventType !== filter.key) {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedEventType !== filter.key) {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#ffffff'
                  }
                }}
              >
                {filter.label}
                <span
                  style={{
                    fontSize: '11px',
                    background:
                      selectedEventType === filter.key ? '#8b5cf6' : '#e2e8f0',
                    color:
                      selectedEventType === filter.key ? '#ffffff' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 사건 리스트 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {filteredEvents.slice(0, 20).map((event, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                background: getEventColor(event.type),
                borderRadius: '12px',
                border: `1px solid ${getEventBorderColor(event.type)}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(139, 92, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: getEventIconBackground(event.type),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                }}
              >
                {getEventIcon(event.type)}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginTop: '4px',
                  }}
                >
                  {event.year}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    {event.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      background: 'rgba(255,255,255,0.8)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {event.orgName}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: '1.6',
                    margin: 0,
                  }}
                >
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 부처별 현황 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              중앙부처 현황
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              18개 중앙행정기관 예산 및 인원
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {mockGovernmentData.ministries.slice(0, 9).map((ministry, idx) => (
            <div
              key={idx}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow =
                  '0 8px 20px rgba(139, 92, 246, 0.15)'
                e.currentTarget.style.borderColor = '#8b5cf6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e5e5e5'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                >
                  <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
                </svg>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {ministry.name}
                </h4>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    장관
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    {ministry.minister}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    예산
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#8b5cf6',
                    }}
                  >
                    {ministry.budget}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    인원
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    {ministry.employees}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// 통계 카드 컴포넌트
function StatCard({
  icon,
  title,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.15)'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: `0 4px 12px ${color}40`,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>
            {value}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

// 조직 타입 카드 컴포넌트
function OrgTypeCard({
  title,
  count,
  color,
  description,
  examples,
}: {
  title: string
  count: number
  color: string
  description: string
  examples: string[]
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.15)'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h4
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
          }}
        >
          {title}
        </h4>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: 800,
          }}
        >
          {count}
        </div>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {examples.map((example, idx) => (
          <div
            key={idx}
            style={{
              fontSize: '12px',
              color: '#475569',
              padding: '6px 10px',
              background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
              borderRadius: '6px',
              border: '1px solid #e5e5e5',
            }}
          >
            • {example}
          </div>
        ))}
      </div>
    </div>
  )
}

// 이벤트 타입별 배경색
function getEventColor(type: string) {
  switch (type) {
    case 'establishment':
      return 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    case 'reform':
      return 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
    case 'achievement':
      return 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
    case 'crisis':
      return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
    case 'merger':
      return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
    default:
      return 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)'
  }
}

// 이벤트 타입별 테두리 색
function getEventBorderColor(type: string) {
  switch (type) {
    case 'establishment':
      return '#e9d5ff'
    case 'reform':
      return '#bfdbfe'
    case 'achievement':
      return '#a7f3d0'
    case 'crisis':
      return '#fecaca'
    case 'merger':
      return '#fde68a'
    default:
      return '#e5e5e5'
  }
}

// 이벤트 타입별 아이콘 배경
function getEventIconBackground(type: string) {
  switch (type) {
    case 'establishment':
      return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    case 'reform':
      return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    case 'achievement':
      return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    case 'crisis':
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    case 'merger':
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    default:
      return 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
  }
}

// 이벤트 타입별 아이콘
function getEventIcon(type: string) {
  switch (type) {
    case 'establishment':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
        </svg>
      )
    case 'reform':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      )
    case 'achievement':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    case 'crisis':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'merger':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      )
    default:
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}
