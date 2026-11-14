import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  FiBarChart2,
  FiBriefcase,
  FiClock,
  FiLayers,
  FiShield,
  FiUsers,
} from 'react-icons/fi'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'

import {
  GOV_ACCENT as ACCENT,
  GOV_MAIN_COLOR as MAIN,
} from '../model/constants'
import { useGovernmentStatisticsMockData } from '../model/use-government-statistics-mock'

import { GOV_BRAND } from './government-ledger.styles'
import { GovSectionEyebrow } from './government-organizations-tab.styled'

export interface GovernmentStatisticsTabProps {
  country?: UnifiedCountry
  effectiveCountryId?: string
}

export function GovernmentStatisticsTab({
  country,
  effectiveCountryId,
}: GovernmentStatisticsTabProps = {}) {
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const {
    totalDepartments,
    activeDepartmentCount,
    totalCabinets,
    totalPositions,
    totalMilitaryUnits,
    totalMinistries,
    totalConstitutional,
    totalAgencies,
    totalLocal,
    ministryExamples,
    agencyExamples,
    specialExamples,
    organizationExamples,
    budgetData,
    filteredEvents,
    eventCounts,
    selectedEventType,
    onSelectedEventTypeChange,
  } = useGovernmentStatisticsMockData({ country, effectiveCountryId })

  const totalCategorizedCount = useMemo(
    () => budgetData.reduce((accSum, rowItem) => accSum + (rowItem.budget || 0), 0),
    [budgetData],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* 단일 핵심 지표 그리드 (중복 스트립 제거) */}
      <section aria-label="정부·행정 핵심 지표">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: 12,
          }}
        >
          <StatCard
            accentColor={MAIN}
            icon={<FiBriefcase size={18} />}
            title="중앙부처 · 국가기관"
            value={totalDepartments}
            unit="곳"
            subLabel={`현존 ${activeDepartmentCount}곳`}
          />
          <StatCard
            accentColor={ACCENT.sky}
            icon={<FiUsers size={18} />}
            title="역대 행정부 · 내각"
            value={totalCabinets}
            unit="개"
            subLabel="정권·내각 단위 기록"
          />
          <StatCard
            accentColor={ACCENT.emerald}
            icon={<FiLayers size={18} />}
            title="직위 · 관직 정의"
            value={totalPositions}
            unit="개"
            subLabel="원수·각료·관직 서열"
          />
          <StatCard
            accentColor={ACCENT.teal}
            icon={<FiShield size={18} />}
            title="소관 연결 군부대"
            value={totalMilitaryUnits}
            unit="개"
            subLabel="국방·군정 부처 직할"
          />
          <StatCard
            accentColor={ACCENT.amber}
            icon={<FiBarChart2 size={18} />}
            title="유관 · 산하 조직"
            value={totalLocal}
            unit="개"
            subLabel="행정·사회 산하 기구"
          />
        </div>
      </section>

      {/* 분야별 부처 분포 차트 */}
      <section aria-label="분야별 기관 분포">
        <GovSectionEyebrow>분야별 기관 분포</GovSectionEyebrow>
        <div
          style={{
            background: palette.bgSubtle,
            border: `1px solid ${palette.border}`,
            borderRadius: 16,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: budgetData.length > 0 ? 18 : 10,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: palette.textMuted,
                fontWeight: 600,
              }}
            >
              행정 분야 카테고리별 등록 기관 수 (상위 8개 분류)
            </p>
            {budgetData.length > 0 ? (
              <span
                style={{
                  fontSize: 12,
                  color: palette.textMuted,
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: palette.cardBg,
                  border: `1px solid ${palette.borderHairline}`,
                }}
              >
                최다 분류 {Math.max(...budgetData.map((row) => row.budget || 0))}곳
              </span>
            ) : null}
          </div>

          {budgetData.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                borderRadius: 12,
                border: `1px dashed ${palette.borderMid}`,
                background: palette.cardBg,
                color: palette.textMuted,
                fontSize: 13,
              }}
            >
              아직 등록된 중앙부처·국가기관이 없어 분야별 분포를 집계할 수 없습니다.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 14,
                height: 210,
                padding: '8px 6px 4px',
                position: 'relative',
                overflowX: 'auto',
              }}
            >
              {/* Y축 눈금 배경 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 8,
                  bottom: 42,
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
                      background: isDark ? palette.divider : 'rgba(15,23,42,0.06)',
                    }}
                  />
                ))}
              </div>

              {budgetData.map((stat) => {
                const maxCount = Math.max(
                  ...budgetData.map((row) => row.budget || 0),
                  1,
                )
                const barHeight = maxCount
                  ? ((stat.budget || 0) / maxCount) * 145
                  : 0
                const sharePct =
                  totalCategorizedCount > 0
                    ? Math.round(((stat.budget || 0) / totalCategorizedCount) * 100)
                    : 0

                return (
                  <div
                    key={stat.year}
                    style={{
                      flex: '1 1 72px',
                      minWidth: 68,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 56,
                        minHeight: 28,
                        height: `${Math.max(barHeight, 28)}px`,
                        background: GOV_BRAND.primary,
                        borderRadius: '6px 6px 2px 2px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 6,
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.budget}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        textAlign: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: palette.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stat.year}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: palette.textFaint,
                        }}
                      >
                        비중 {sharePct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* 좌: 기관 변천 연혁 타임라인 | 우: 조직 성격별 분포 */}
      <section
        aria-label="기관 변천 연혁 및 성격별 현황"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* 좌측: 기관 설립·폐지·개편 연혁 */}
        <div style={{ minWidth: 0 }}>
          <GovSectionEyebrow>기관 변천 연혁</GovSectionEyebrow>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 16,
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: palette.accentBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: MAIN,
                    flexShrink: 0,
                  }}
                >
                  <FiClock size={17} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: palette.text,
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    행정·군정 개편 타임라인
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: palette.textMuted,
                      margin: '2px 0 0',
                    }}
                  >
                    설립·개편·통합·폐지 이력 자동 집계
                  </p>
                </div>
              </div>

              {/* 사건 타입 필터 */}
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  padding: 3,
                  background: palette.cardBg,
                  borderRadius: 10,
                  border: `1px solid ${palette.borderHairline}`,
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
                    label: '개편',
                    count: eventCounts.reform,
                  },
                  {
                    key: 'merger',
                    label: '통합',
                    count: eventCounts.merger,
                  },
                  {
                    key: 'crisis',
                    label: '폐지',
                    count: eventCounts.crisis,
                  },
                ].map((filterItem) => {
                  const isSelected = selectedEventType === filterItem.key
                  return (
                    <button
                      key={filterItem.key}
                      type="button"
                      onClick={() => onSelectedEventTypeChange(filterItem.key)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 7,
                        border: 'none',
                        background: isSelected
                          ? palette.accentBg
                          : 'transparent',
                        color: isSelected ? palette.accent : palette.textMuted,
                        fontSize: 11.5,
                        fontWeight: isSelected ? 700 : 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {filterItem.label}
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          opacity: isSelected ? 1 : 0.7,
                        }}
                      >
                        {filterItem.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                maxHeight: 500,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredEvents.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: palette.textMuted,
                    background: palette.cardBg,
                    borderRadius: 12,
                    border: `1px dashed ${palette.borderMid}`,
                  }}
                >
                  해당 조건의 설립·개편 연혁이 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {filteredEvents.slice(0, 25).map((eventItem) => {
                    const imageUrl = eventItem.images?.[0]
                    const eventBadgeTone =
                      eventItem.type === 'establishment'
                        ? {
                            label: '설립',
                            bg: isDark ? 'rgba(16,185,129,0.16)' : '#ecfdf5',
                            color: isDark ? '#6ee7b7' : '#047857',
                          }
                        : eventItem.type === 'crisis'
                          ? {
                              label: '폐지',
                              bg: isDark ? 'rgba(148,163,184,0.16)' : '#f1f5f9',
                              color: isDark ? '#cbd5e1' : '#475569',
                            }
                          : eventItem.type === 'merger'
                            ? {
                                label: '통합',
                                bg: isDark ? 'rgba(245,158,11,0.16)' : '#fffbeb',
                                color: isDark ? '#fcd34d' : '#b45309',
                              }
                            : {
                                label: '개편',
                                bg: palette.accentBg,
                                color: palette.accent,
                              }

                    return (
                      <div
                        key={eventItem.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '68px minmax(0, 1fr)',
                          gap: 10,
                          alignItems: 'start',
                        }}
                      >
                        <span
                          style={{
                            marginTop: 10,
                            padding: '3px 7px',
                            borderRadius: 7,
                            textAlign: 'center',
                            fontSize: 11.5,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            background: palette.cardBg,
                            border: `1px solid ${palette.borderHairline}`,
                            color: MAIN,
                          }}
                        >
                          {eventItem.year}
                        </span>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '11px 13px',
                            borderRadius: 12,
                            background: palette.cardBg,
                            border: `1px solid ${palette.borderHairline}`,
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: `1px solid ${palette.border}`,
                              }}
                            />
                          ) : null}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 4,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  background: eventBadgeTone.bg,
                                  color: eventBadgeTone.color,
                                }}
                              >
                                {eventBadgeTone.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: palette.textMuted,
                                }}
                              >
                                {eventItem.orgType}
                              </span>
                            </div>
                            <h4
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: palette.text,
                                margin: '0 0 3px',
                                lineHeight: 1.35,
                              }}
                            >
                              {eventItem.title}
                            </h4>
                            <p
                              style={{
                                fontSize: 12,
                                color: palette.textMuted,
                                lineHeight: 1.45,
                                margin: 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {eventItem.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 조직 성격별 현황 2x2 */}
        <div style={{ minWidth: 0 }}>
          <GovSectionEyebrow>성격별 기관 구성</GovSectionEyebrow>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            <OrgTypeCard
              accentColor={MAIN}
              title="중앙부처 (성·부·조)"
              count={totalMinistries}
              description="내각·국무 핵심 행정부처"
              examples={
                ministryExamples.length > 0
                  ? ministryExamples
                  : ['등록된 중앙부처 없음']
              }
            />
            <OrgTypeCard
              accentColor={ACCENT.amber}
              title="외청 · 위원회 · 정보"
              count={totalAgencies}
              description="독립 위원회 및 직할·외청 기구"
              examples={
                agencyExamples.length > 0
                  ? agencyExamples
                  : ['등록된 외청·위원회 없음']
              }
            />
            <OrgTypeCard
              accentColor={ACCENT.teal}
              title="궁내 · 총독부 · 특수기관"
              count={totalConstitutional}
              description="왕실·식민통치·특수 통치기구"
              examples={
                specialExamples.length > 0
                  ? specialExamples
                  : ['등록된 특수기관 없음']
              }
            />
            <OrgTypeCard
              accentColor={ACCENT.sky}
              title="유관 · 산하 행정조직"
              count={totalLocal}
              description="국가 연결 일반·사회 조직"
              examples={
                organizationExamples.length > 0
                  ? organizationExamples
                  : ['등록된 산하조직 없음']
              }
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  accentColor = MAIN,
  icon,
  title,
  value,
  unit,
  subLabel,
}: {
  accentColor?: string
  icon: ReactNode
  title: string
  value: string | number
  unit: string
  subLabel?: string
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const cardPalette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  return (
    <div
      style={{
        background: cardPalette.bgSubtle,
        border: `1px solid ${cardPalette.borderMid}`,
        borderRadius: 14,
        padding: '15px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            color: cardPalette.textMuted,
            fontWeight: 700,
          }}
        >
          {title}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
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
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: cardPalette.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: cardPalette.textMuted,
            }}
          >
            {unit}
          </span>
        </div>
        {subLabel ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: cardPalette.textFaint,
              fontWeight: 500,
            }}
          >
            {subLabel}
          </div>
        ) : null}
      </div>
    </div>
  )
}

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
  const cardPalette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  return (
    <div
      style={{
        background: cardPalette.bgSubtle,
        border: `1px solid ${cardPalette.borderMid}`,
        borderRadius: 14,
        padding: '16px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <h4
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: cardPalette.text,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h4>
        <span
          style={{
            minWidth: 30,
            height: 26,
            padding: '0 8px',
            borderRadius: 8,
            background: accentColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {count}
        </span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: cardPalette.textMuted,
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {description}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          marginTop: 2,
        }}
      >
        {examples.map((example, exampleIndex) => (
          <div
            key={exampleIndex}
            style={{
              fontSize: 12,
              color: isDark
                ? cardPalette.textMuted
                : cardPalette.sectionLabelTint,
              padding: '6px 10px',
              background: cardPalette.cardBg,
              borderRadius: 7,
              border: `1px solid ${cardPalette.borderHairline}`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            • {example}
          </div>
        ))}
      </div>
    </div>
  )
}
