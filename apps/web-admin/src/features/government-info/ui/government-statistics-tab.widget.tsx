import { useMemo } from 'react'
import type { ReactNode } from 'react'

import styled from 'styled-components'

import {
  type CabinetsSectionPalette,
  getCabinetsSectionPalette,
} from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { mockGovernmentData } from '@/widgets/country/country-detail/mock'
import type {
  HistoricalEvent,
  StatisticsData,
} from '@/widgets/country/country-detail/mock/types'

import {
  GOV_ACCENT as ACCENT,
  GOV_MAIN_COLOR as MAIN,
} from '../model/constants'

const SectionLabelDiv = styled.div`
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

function SectionLabel({ children }: { children: ReactNode }) {
  return <SectionLabelDiv>{children}</SectionLabelDiv>
}

export type GovernmentStatisticsTabProps = {
  palette: CabinetsSectionPalette
  isDark: boolean
  totalEmployees: string
  totalBudget: string
  totalOrganizations: number
  totalMinistries: number
  totalConstitutional: number
  totalAgencies: number
  totalLocal: number
  budgetData: StatisticsData[]
  filteredEvents: (HistoricalEvent & { orgName: string; orgType: string })[]
  eventCounts: {
    all: number
    establishment: number
    reform: number
    achievement: number
    crisis: number
    merger: number
  }
  selectedEventType: string
  onSelectedEventTypeChange: (key: string) => void
}

export function GovernmentStatisticsTab({
  palette,
  isDark,
  totalEmployees,
  totalBudget,
  totalOrganizations,
  totalMinistries,
  totalConstitutional,
  totalAgencies,
  totalLocal,
  budgetData,
  filteredEvents,
  eventCounts,
  selectedEventType,
  onSelectedEventTypeChange,
}: GovernmentStatisticsTabProps) {
  return (
    <>
      {/* 핵심 수치 요약 */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${palette.border}`,
          paddingBottom: 20,
          marginBottom: 4,
        }}
      >
        {[
          { label: '총 인원', value: totalEmployees, unit: '명' },
          { label: '총 예산', value: totalBudget, unit: '조원' },
          { label: '조직 수', value: totalOrganizations, unit: '개' },
          { label: '중앙부처', value: totalMinistries, unit: '개' },
          { label: '헌법기관', value: totalConstitutional, unit: '개' },
        ].map((kpi, kpiIndex, kpiRow) => (
          <div
            key={kpiIndex}
            style={{
              flex: '1 1 0',
              paddingLeft: kpiIndex === 0 ? 0 : 24,
              paddingRight: kpiIndex < kpiRow.length - 1 ? 24 : 0,
              borderRight:
                    kpiIndex < kpiRow.length - 1 ? `1px solid ${palette.divider}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: palette.iconColor,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}
            >
              {kpi.label}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: palette.text,
                letterSpacing: '-0.03em',
                lineHeight: 1.3,
              }}
            >
              {kpi.value}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: palette.textFaint,
                  marginLeft: 2,
                }}
              >
                {kpi.unit}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* 요약 지표 */}
      <section aria-label="행정조직 요약">
        <SectionLabel>요약 지표</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 20,
          }}
        >
          <StatCard
            accentColor={MAIN}
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
          />
          <StatCard
            accentColor={ACCENT.teal}
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
              </svg>
            }
            title="중앙부처"
            value={totalMinistries}
            unit="개"
          />
          <StatCard
            accentColor={ACCENT.amber}
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            }
            title="헌법기관"
            value={totalConstitutional}
            unit="개"
          />
          <StatCard
            accentColor={ACCENT.emerald}
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
            title="총 인원"
            value={totalEmployees}
            unit="명"
          />
          <StatCard
            accentColor={ACCENT.sky}
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
            title="총 예산"
            value={totalBudget}
            unit="조원"
          />
        </div>
      </section>

      {/* 예산 추이 — 요약 지표 바로 아래 */}
      <section aria-label="국가 예산 추이">
        <SectionLabel>예산 추이</SectionLabel>
        <div
          style={{
            background: palette.bgSubtle,
            border: `1px solid ${palette.border}`,
            borderRadius: 24,
            padding: 28,
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: palette.warmCaption,
                fontWeight: 500,
              }}
            >
              최근 6년간 예산 변화 (단위: 조원)
            </p>
            {budgetData.length > 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: palette.warmCaptionMuted,
                  fontWeight: 500,
                }}
              >
                최대 {Math.max(...budgetData.map((s) => s.budget || 0))}조원
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 16,
              height: 260,
              padding: '0 8px 8px',
              position: 'relative',
            }}
          >
            {/* Y축 눈금 배경 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              {[100, 75, 50, 25].map((pct) => (
                <div
                  key={pct}
                  style={{
                    width: '100%',
                    height: 1,
                    background: isDark ? palette.divider : 'rgba(0,0,0,0.06)',
                    marginLeft: 8,
                    marginRight: 8,
                  }}
                />
              ))}
            </div>
            {budgetData.map((stat, budgetIndex) => {
              const maxBudget = Math.max(
                ...budgetData.map((s) => s.budget || 0),
                1,
              )
              const height = maxBudget
                ? ((stat.budget || 0) / maxBudget) * 200
                : 0
              const prevBudget =
                budgetIndex > 0
                  ? budgetData[budgetIndex - 1].budget || 0
                  : 0
              const currBudget = stat.budget || 0
              const isUp = currBudget > prevBudget
              const pctChange = prevBudget
                ? Math.abs((currBudget - prevBudget) / prevBudget) * 100
                : 0
              return (
                <div
                  key={budgetIndex}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 72,
                      minHeight: 32,
                      height: `${Math.max(height, 32)}px`,
                      background: `linear-gradient(180deg, ${MAIN} 0%, rgba(99, 102, 241, 0.75) 70%, rgba(99, 102, 241, 0.5) 100%)`,
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: '10px 6px',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 700,
                      boxShadow: '0 2px 12px rgba(99, 102, 241, 0.25)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(mouseEvent) => {
                          mouseEvent.currentTarget.style.transform =
                            'translateY(-4px)'
                          mouseEvent.currentTarget.style.boxShadow =
                            '0 8px 24px rgba(99, 102, 241, 0.35)'
                        }}
                        onMouseLeave={(mouseEvent) => {
                          mouseEvent.currentTarget.style.transform =
                            'translateY(0)'
                          mouseEvent.currentTarget.style.boxShadow =
                            '0 2px 12px rgba(99, 102, 241, 0.25)'
                        }}
                  >
                    {stat.budget}조
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: palette.text,
                      }}
                    >
                      {stat.year}
                    </span>
                        {budgetIndex > 0 && prevBudget > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: isUp ? ACCENT.emerald : '#78716c',
                        }}
                      >
                        {isUp ? '↑' : '↓'} {pctChange.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 좌: 타임라인 | 우: 조직 유형별 현황 — 5:5 */}
      <section
        aria-label="타임라인 및 조직 유형"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* 좌측: 주요 사건 타임라인 */}
        <div style={{ minWidth: 0 }}>
          <SectionLabel>주요 사건</SectionLabel>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 24,
              padding: 28,
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: MAIN,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: palette.text,
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    타임라인
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: palette.warmCaption,
                      margin: '2px 0 0',
                    }}
                  >
                    행정조직 관련 주요 사건
                  </p>
                </div>
              </div>

              {/* 사건 타입 필터 — 세그먼트 스타일 */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  flexWrap: 'wrap',
                  padding: 4,
                  background: palette.cardBgHover,
                  borderRadius: 14,
                  border: `1px solid ${palette.border}`,
                }}
              >
                {[
                  { key: 'all', label: '전체', count: eventCounts.all },
                  {
                    key: 'establishment',
                    label: '설립',
                    count: eventCounts.establishment,
                  },
                  {
                    key: 'reform',
                    label: '개혁',
                    count: eventCounts.reform,
                  },
                  {
                    key: 'achievement',
                    label: '성과',
                    count: eventCounts.achievement,
                  },
                  {
                    key: 'crisis',
                    label: '위기',
                    count: eventCounts.crisis,
                  },
                  {
                    key: 'merger',
                    label: '통합',
                    count: eventCounts.merger,
                  },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => onSelectedEventTypeChange(filter.key)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background:
                        selectedEventType === filter.key
                          ? isDark
                            ? palette.badge
                            : '#ffffff'
                          : 'transparent',
                      color:
                        selectedEventType === filter.key
                          ? palette.text
                          : palette.warmFilterIdle,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow:
                        selectedEventType === filter.key
                          ? '0 1px 3px rgba(0,0,0,0.08)'
                          : 'none',
                    }}
                        onMouseEnter={(mouseEvent) => {
                          if (selectedEventType !== filter.key) {
                            mouseEvent.currentTarget.style.background = isDark
                              ? palette.btnHover
                              : 'rgba(255,255,255,0.6)'
                            mouseEvent.currentTarget.style.color = palette.text
                          }
                        }}
                        onMouseLeave={(mouseEvent) => {
                          if (selectedEventType !== filter.key) {
                            mouseEvent.currentTarget.style.background =
                              'transparent'
                            mouseEvent.currentTarget.style.color =
                              palette.warmFilterIdle
                          }
                        }}
                  >
                    {filter.label}
                    <span
                      style={{
                        fontSize: 10,
                        background:
                          selectedEventType === filter.key
                            ? MAIN
                            : isDark
                              ? palette.badge
                              : 'rgba(0,0,0,0.08)',
                        color:
                          selectedEventType === filter.key
                            ? '#ffffff'
                            : palette.warmFilterIdle,
                        padding: '2px 6px',
                        borderRadius: 8,
                        fontWeight: 700,
                      }}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 사건 리스트 — 세로 타임라인 (축선 + 노드 + 카드) */}
            <div
              style={{
                position: 'relative',
                maxHeight: 560,
                overflowY: 'auto',
                paddingRight: 4,
              }}
              className="government-events-list"
            >
              {filteredEvents.length === 0 ? (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    fontSize: 14,
                    color: palette.warmCaption,
                    background: palette.bgMuted,
                    borderRadius: 18,
                    border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                >
                  해당 조건의 사건이 없습니다.
                </div>
              ) : (
                <>
                  {/* 세로 축선 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 23,
                      top: 12,
                      bottom: 12,
                      width: 2,
                      background: `linear-gradient(180deg, ${MAIN} 0%, transparent 100%)`,
                      borderRadius: 1,
                      opacity: 0.8,
                    }}
                    aria-hidden
                  />
                  {filteredEvents.slice(0, 20).map((event, eventIndex) => {
                    const eventWithImages = event as typeof event & {
                      images?: string[]
                    }
                    const imageUrl =
                      eventWithImages.images?.[0] ??
                      mockGovernmentData.ministries.find(
                        (m) => m.name === event.orgName,
                      )?.images?.[0]
                    return (
                      <div
                        key={eventIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0,
                          position: 'relative',
                          paddingBottom: 20,
                        }}
                      >
                        {/* 타임라인 노드 (연도) */}
                        <div
                          style={{
                            width: 48,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            paddingTop: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isDark ? palette.badge : '#ffffff',
                              border: `3px solid ${MAIN}`,
                              boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: MAIN,
                              marginTop: 6,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {event.year}
                          </span>
                        </div>

                        {/* 카드 */}
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: palette.bgSubtle,
                            borderRadius: 18,
                            border: `1px solid ${palette.border}`,
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            boxShadow: isDark
                              ? '0 2px 8px rgba(0,0,0,0.3)'
                              : '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                              onMouseEnter={(mouseEvent) => {
                                mouseEvent.currentTarget.style.boxShadow = isDark
                                  ? '0 8px 24px rgba(0,0,0,0.4)'
                                  : '0 8px 24px rgba(0,0,0,0.08)'
                                mouseEvent.currentTarget.style.borderColor = MAIN
                              }}
                              onMouseLeave={(mouseEvent) => {
                                mouseEvent.currentTarget.style.boxShadow = isDark
                                  ? '0 2px 8px rgba(0,0,0,0.3)'
                                  : '0 2px 8px rgba(0,0,0,0.04)'
                                mouseEvent.currentTarget.style.borderColor =
                                  palette.border
                              }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              minHeight: 88,
                            }}
                          >
                            <div
                              style={{
                                width: 100,
                                minWidth: 100,
                                flexShrink: 0,
                                background: imageUrl
                                  ? `url(${imageUrl}) center/cover`
                                  : `linear-gradient(135deg, #e7e5e4 0%, ${MAIN} 100%)`,
                              }}
                            />
                            <div
                              style={{
                                padding: '12px 14px 14px',
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginBottom: 6,
                                  flexWrap: 'wrap',
                                }}
                              >
                                {event.orgName && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: palette.warmFilterIdle,
                                      background: isDark
                                        ? palette.btnHover
                                        : '#f5f5f4',
                                      padding: '4px 8px',
                                      borderRadius: 8,
                                    }}
                                  >
                                    {event.orgName}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: palette.warmCaptionMuted,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {event.type === 'establishment' && '설립'}
                                  {event.type === 'reform' && '개혁'}
                                  {event.type === 'achievement' && '성과'}
                                  {event.type === 'crisis' && '위기'}
                                  {event.type === 'merger' && '통합'}
                                </span>
                              </div>
                              <h4
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: palette.warmTitle,
                                  margin: '0 0 4px',
                                  lineHeight: 1.35,
                                }}
                              >
                                {event.title}
                              </h4>
                              <p
                                style={{
                                  fontSize: 12,
                                  color: palette.warmFilterIdle,
                                  lineHeight: 1.5,
                                  margin: 0,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {event.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 조직 유형별 현황 2x2 */}
        <div style={{ minWidth: 0 }}>
          <SectionLabel>조직 유형별 현황</SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            <OrgTypeCard
              accentColor={MAIN}
              title="중앙행정기관"
              count={totalMinistries}
              description="18개 부처"
              examples={['기획재정부', '외교부', '국방부']}
            />
            <OrgTypeCard
              accentColor={ACCENT.teal}
              title="헌법기관"
              count={totalConstitutional}
              description="5개 기관"
              examples={['국회', '대법원', '헌법재판소']}
            />
            <OrgTypeCard
              accentColor={ACCENT.amber}
              title="산하기관"
              count={totalAgencies}
              description="8개 기관"
              examples={['국세청', '관세청', '경찰청']}
            />
            <OrgTypeCard
              accentColor={ACCENT.sky}
              title="지방자치단체"
              count={totalLocal}
              description="4개 시/도"
              examples={['서울시', '경기도', '부산시']}
            />
          </div>
        </div>
      </section>
    </>
  )
}

// 통계 카드 (카드별 액센트 색)
function StatCard({
  accentColor = MAIN,
  icon,
  title,
  value,
  unit,
}: {
  accentColor?: string
  icon: ReactNode
  title: string
  value: string | number
  unit: string
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const cardPalette = useMemo(
    () => getCabinetsSectionPalette(isDark),
    [isDark],
  )
  return (
    <div
      style={{
        background: cardPalette.bgSubtle,
        border: `1px solid ${cardPalette.borderMid}`,
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(mouseEvent) => {
        mouseEvent.currentTarget.style.transform = 'translateY(-2px)'
        mouseEvent.currentTarget.style.boxShadow = isDark
          ? '0 8px 20px rgba(0,0,0,0.3)'
          : '0 8px 20px rgba(0,0,0,0.06)'
        mouseEvent.currentTarget.style.borderColor = cardPalette.borderEmphasis
      }}
      onMouseLeave={(mouseEvent) => {
        mouseEvent.currentTarget.style.transform = 'translateY(0)'
        mouseEvent.currentTarget.style.boxShadow = 'none'
        mouseEvent.currentTarget.style.borderColor = cardPalette.borderMid
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: cardPalette.avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: cardPalette.textMuted,
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: cardPalette.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: cardPalette.textMuted,
            }}
          >
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

// 조직 타입 카드 (카드별 액센트 색)
function OrgTypeCard({
  accentColor = MAIN,
  title,
  count,
  description,
  examples,
}: {
  accentColor?: string
  title: string
  count: number
  description: string
  examples: string[]
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const cardPalette = useMemo(
    () => getCabinetsSectionPalette(isDark),
    [isDark],
  )
  return (
    <div
      style={{
        background: cardPalette.bgSubtle,
        border: `1px solid ${cardPalette.borderMid}`,
        borderRadius: 16,
        padding: 22,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(mouseEvent) => {
        mouseEvent.currentTarget.style.transform = 'translateY(-2px)'
        mouseEvent.currentTarget.style.boxShadow = isDark
          ? '0 8px 20px rgba(0,0,0,0.3)'
          : '0 8px 20px rgba(0,0,0,0.06)'
        mouseEvent.currentTarget.style.borderColor = cardPalette.borderEmphasis
      }}
      onMouseLeave={(mouseEvent) => {
        mouseEvent.currentTarget.style.transform = 'translateY(0)'
        mouseEvent.currentTarget.style.boxShadow = 'none'
        mouseEvent.currentTarget.style.borderColor = cardPalette.borderMid
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h4
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: cardPalette.text,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h4>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {count}
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: cardPalette.textMuted,
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {examples.map((example, exampleIndex) => (
          <div
            key={exampleIndex}
            style={{
              fontSize: 12,
              color: isDark ? cardPalette.textMuted : cardPalette.sectionLabelTint,
              padding: '8px 12px',
              background: cardPalette.bgMuted,
              borderRadius: 8,
              border: `1px solid ${cardPalette.borderMid}`,
            }}
          >
            • {example}
          </div>
        ))}
      </div>
    </div>
  )
}
