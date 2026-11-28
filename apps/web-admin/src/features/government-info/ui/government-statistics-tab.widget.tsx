import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiLayers,
  FiShield,
  FiUsers,
  FiX,
} from 'react-icons/fi'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'

import {
  GOV_ACCENT as ACCENT,
  GOV_MAIN_COLOR as MAIN,
} from '../model/constants'
import type { GovernmentContentTab } from '../model/government-content-tab'
import { useGovernmentStatistics } from '../model/use-government-statistics'

import {
  GovMoreFieldGroup,
  GovMoreFieldLabel,
  GovMoreNativeSelect,
  GovMorePopover,
} from './gov-more-popover'
import { GOV_BRAND } from './government-ledger.styles'
import { GovSectionEyebrow } from './government-organizations-tab.styled'

export interface GovernmentStatisticsTabProps {
  country?: UnifiedCountry
  effectiveCountryId?: string
  onSelectTab?: (tab: GovernmentContentTab) => void
  onSelectCategory?: (categoryId: string) => void
  onSelectDepartment?: (departmentId: string) => void
  onSelectCabinet?: (cabinetId: string) => void
  onOpenMilitaryTab?: () => void
}

export function GovernmentStatisticsTab({
  country,
  effectiveCountryId,
  onSelectTab,
  onSelectCategory,
  onSelectDepartment,
  onSelectCabinet,
  onOpenMilitaryTab,
}: GovernmentStatisticsTabProps = {}) {
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const {
    totalPoliticalSystems,
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
    categoryStats,
    governmentFormBreakdown,
    regimeSummaries,
    totalMeasuredRegimeYears,
    filteredEvents,
    eventCounts,
    selectedEventType,
    onSelectedEventTypeChange,
  } = useGovernmentStatistics({ country, effectiveCountryId })

  const [showAllEvents, setShowAllEvents] = useState(false)

  useEffect(() => {
    setShowAllEvents(false)
  }, [effectiveCountryId, selectedEventType])

  const totalCategorizedCount = useMemo(
    () =>
      categoryStats.reduce(
        (accSum, rowItem) => accSum + (rowItem.departmentCount || 0),
        0,
      ),
    [categoryStats],
  )

  const displayedEvents = showAllEvents
    ? filteredEvents
    : filteredEvents.slice(0, 30)

  const eventFilterOptions = useMemo(
    () =>
      [
        { key: 'all', label: '전체 연혁', count: eventCounts.all },
        { key: 'regime', label: '헌정 체제', count: eventCounts.regime },
        { key: 'cabinet', label: '내각 출범', count: eventCounts.cabinet },
        {
          key: 'establishment',
          label: '기관 설립',
          count: eventCounts.establishment,
        },
        { key: 'reform', label: '기관 개편', count: eventCounts.reform },
        { key: 'merger', label: '기관 통합', count: eventCounts.merger },
        { key: 'crisis', label: '기관 폐지', count: eventCounts.crisis },
      ].filter(
        (filterItem) => filterItem.key === 'all' || filterItem.count > 0,
      ),
    [eventCounts],
  )

  const activeEventFilterLabel =
    selectedEventType !== 'all'
      ? (eventFilterOptions.find(
          (filterItem) => filterItem.key === selectedEventType,
        )?.label ?? null)
      : null

  const orgBreakdownRows = useMemo(
    () => [
      {
        key: 'ministry',
        title: '중앙부처 (성·부·조)',
        count: totalMinistries,
        accentColor: MAIN,
        examples: ministryExamples,
      },
      {
        key: 'agency',
        title: '외청 · 위원회 · 정보',
        count: totalAgencies,
        accentColor: ACCENT.amber,
        examples: agencyExamples,
      },
      {
        key: 'special',
        title: '궁내 · 총독부 · 특수기관',
        count: totalConstitutional,
        accentColor: ACCENT.teal,
        examples: specialExamples,
      },
      {
        key: 'local',
        title: '유관 · 산하 행정조직',
        count: totalLocal,
        accentColor: ACCENT.sky,
        examples: organizationExamples,
      },
    ],
    [
      totalMinistries,
      ministryExamples,
      totalAgencies,
      agencyExamples,
      totalConstitutional,
      specialExamples,
      totalLocal,
      organizationExamples,
    ],
  )

  const totalOrgBreakdownSum = useMemo(
    () =>
      Math.max(
        orgBreakdownRows.reduce((sumAcc, rowItem) => sumAcc + rowItem.count, 0),
        1,
      ),
    [orgBreakdownRows],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 단일 핵심 지표 그리드 */}
      <section aria-label="정부·행정 핵심 지표">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard
            accentColor="#6366f1"
            icon={<FiBookOpen size={17} />}
            title="정체 · 헌정 체제"
            value={totalPoliticalSystems}
            unit="개"
            onClick={onSelectTab ? () => onSelectTab('system') : undefined}
          />
          <StatCard
            accentColor={ACCENT.sky}
            icon={<FiUsers size={17} />}
            title="역대 행정부 · 내각"
            value={totalCabinets}
            unit="개"
            onClick={onSelectTab ? () => onSelectTab('cabinets') : undefined}
          />
          <StatCard
            accentColor={MAIN}
            icon={<FiBriefcase size={17} />}
            title="중앙부처 · 국가기관"
            value={totalDepartments}
            unit="곳"
            subLabel={
              totalDepartments > 0 ? `현존 ${activeDepartmentCount}곳` : undefined
            }
            onClick={onSelectTab ? () => onSelectTab('ministries') : undefined}
          />
          <StatCard
            accentColor={ACCENT.emerald}
            icon={<FiLayers size={17} />}
            title="국가 고유 관직"
            value={totalPositions}
            unit="개"
            onClick={onSelectTab ? () => onSelectTab('positions') : undefined}
          />
          {totalMilitaryUnits > 0 ? (
            <StatCard
              accentColor={ACCENT.teal}
              icon={<FiShield size={17} />}
              title="소관 연결 군부대"
              value={totalMilitaryUnits}
              unit="개"
              onClick={onOpenMilitaryTab}
            />
          ) : null}
          {totalLocal > 0 ? (
            <StatCard
              accentColor={ACCENT.amber}
              icon={<FiBarChart2 size={17} />}
              title="유관 · 산하 조직"
              value={totalLocal}
              unit="개"
            />
          ) : null}
        </div>
      </section>

      {/* 헌정사 · 정부형태 존속 분석 (등록된 헌정 체제가 있을 때 노출) */}
      {regimeSummaries.length > 0 ? (
        <section aria-label="헌정사 및 정부 형태 존속 분석">
          <GovSectionEyebrow>헌정사 · 정부 형태 존속 분석</GovSectionEyebrow>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {governmentFormBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      color: palette.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    정부 형태별 누적 존속 연수 비중
                  </span>
                  {totalMeasuredRegimeYears > 0 ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        color: palette.textMuted,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      누적 {totalMeasuredRegimeYears.toLocaleString('ko-KR')}년 ·{' '}
                      {regimeSummaries.length}개 헌정 체제
                    </span>
                  ) : null}
                </div>
                <div
                  role="img"
                  aria-label={governmentFormBreakdown
                    .map(
                      (row) =>
                        `${row.formLabel} ${row.totalYears > 0 ? `${row.totalYears}년` : `${row.regimeCount}개`} (${row.sharePercent}%)`,
                    )
                    .join(', ')}
                  style={{
                    display: 'flex',
                    height: 11,
                    borderRadius: 999,
                    overflow: 'hidden',
                    gap: 2,
                    background: palette.cardBg,
                  }}
                >
                  {governmentFormBreakdown.map((row, idx) => {
                    const formColors = [
                      '#6366f1',
                      ACCENT.sky,
                      ACCENT.emerald,
                      ACCENT.amber,
                      ACCENT.teal,
                      '#ec4899',
                      '#64748b',
                    ]
                    const barColor = formColors[idx % formColors.length]
                    return (
                      <div
                        key={row.formKey}
                        style={{
                          flexGrow: Math.max(row.sharePercent, 2),
                          flexBasis: 0,
                          minWidth: 4,
                          background: barColor,
                        }}
                      />
                    )
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 14px',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {governmentFormBreakdown.map((row, idx) => {
                    const formColors = [
                      '#6366f1',
                      ACCENT.sky,
                      ACCENT.emerald,
                      ACCENT.amber,
                      ACCENT.teal,
                      '#ec4899',
                      '#64748b',
                    ]
                    const barColor = formColors[idx % formColors.length]
                    return (
                      <span
                        key={row.formKey}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: palette.text,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: barColor,
                          }}
                        />
                        <strong>{row.formLabel}</strong>
                        <span style={{ color: palette.textMuted }}>
                          {row.totalYears > 0
                            ? `${row.totalYears.toLocaleString('ko-KR')}년 (${row.sharePercent}%)`
                            : `${row.regimeCount}개 체제`}
                          {row.cabinetCount > 0
                            ? ` · 내각 ${row.cabinetCount}`
                            : ''}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div
              style={{
                overflowX: 'auto',
                borderTop: `1px solid ${palette.borderHairline}`,
                paddingTop: 10,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      color: palette.textMuted,
                      fontSize: 11.5,
                      borderBottom: `1px solid ${palette.borderHairline}`,
                    }}
                  >
                    <th style={{ padding: '6px 8px' }}>헌정 체제</th>
                    <th style={{ padding: '6px 8px' }}>정부 형태 · 의회</th>
                    <th style={{ padding: '6px 8px' }}>존속 기간</th>
                    <th style={{ padding: '6px 8px' }}>출범 내각 · 평균 수명</th>
                    <th style={{ padding: '6px 8px' }}>근거 헌법</th>
                  </tr>
                </thead>
                <tbody>
                  {regimeSummaries.map((regime) => (
                    <tr
                      key={regime.id}
                      onClick={
                        onSelectTab ? () => onSelectTab('system') : undefined
                      }
                      style={{
                        borderBottom: `1px solid ${palette.borderHairline}`,
                        cursor: onSelectTab ? 'pointer' : 'default',
                      }}
                    >
                      <td
                        style={{
                          padding: '7px 8px',
                          fontWeight: 700,
                          color: palette.text,
                        }}
                      >
                        <span>{regime.name}</span>
                        {regime.isCurrent ? (
                          <span
                            style={{
                              marginLeft: 6,
                              padding: '1px 6px',
                              borderRadius: 999,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: 'rgba(99, 102, 241, 0.14)',
                              color: '#6366f1',
                            }}
                          >
                            현행
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '7px 8px', color: palette.textMuted }}>
                        {regime.governmentFormLabel}
                        {regime.legislatureLabel
                          ? ` · ${regime.legislatureLabel}`
                          : ''}
                      </td>
                      <td style={{ padding: '7px 8px', color: palette.text }}>
                        {regime.periodLabel}
                        {regime.durationYears != null ? (
                          <span style={{ color: palette.textMuted }}>
                            {' '}
                            ({regime.durationYears.toLocaleString('ko-KR')}년)
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '7px 8px', color: palette.text }}>
                        {regime.cabinetCount > 0 ? (
                          <span
                            onClick={(ev) => {
                              if (!onSelectTab) return
                              ev.stopPropagation()
                              onSelectTab('cabinets')
                            }}
                            style={{
                              textDecoration: onSelectTab ? 'underline' : 'none',
                              textUnderlineOffset: 2,
                            }}
                          >
                            {regime.cabinetCount}개 내각
                            {regime.avgCabinetYears != null
                              ? ` (평균 ${regime.avgCabinetYears}년)`
                              : ''}
                          </span>
                        ) : (
                          <span style={{ color: palette.textFaint }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 8px', color: palette.textMuted }}>
                        {regime.constitutionLawName ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* 분야별 부처 분포 차트 — 데이터가 있을 때만 노출 */}
      {categoryStats.length > 0 ? (
        <section aria-label="분야별 기관 분포">
          <GovSectionEyebrow>분야별 기관 분포</GovSectionEyebrow>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 14,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: palette.textMuted,
                  fontWeight: 600,
                }}
              >
                상위 직능 분류별 기관 수
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: palette.textMuted,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: palette.cardBg,
                  border: `1px solid ${palette.borderHairline}`,
                }}
              >
                최다{' '}
                {Math.max(
                  ...categoryStats.map((row) => row.departmentCount || 0),
                )}
                곳
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 14,
                height: 190,
                padding: '6px 6px 4px',
                position: 'relative',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 6,
                  bottom: 40,
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
                      background: isDark
                        ? palette.divider
                        : 'rgba(15,23,42,0.06)',
                    }}
                  />
                ))}
              </div>

              {categoryStats.map((stat) => {
                const maxCount = Math.max(
                  ...categoryStats.map((row) => row.departmentCount || 0),
                  1,
                )
                const barHeight = maxCount
                  ? ((stat.departmentCount || 0) / maxCount) * 130
                  : 0
                const sharePct =
                  totalCategorizedCount > 0
                    ? Math.round(
                        ((stat.departmentCount || 0) / totalCategorizedCount) *
                          100,
                      )
                    : 0

                const isClickableBar = Boolean(
                  stat.categoryId && onSelectCategory,
                )

                return (
                  <div
                    key={stat.categoryName}
                    role={isClickableBar ? 'button' : undefined}
                    tabIndex={isClickableBar ? 0 : undefined}
                    title={
                      isClickableBar
                        ? `${stat.categoryName} 분류 중앙부처 목록 보기`
                        : undefined
                    }
                    onClick={() => {
                      if (stat.categoryId && onSelectCategory) {
                        onSelectCategory(stat.categoryId)
                      }
                    }}
                    onKeyDown={(keyEvent) => {
                      if (
                        isClickableBar &&
                        (keyEvent.key === 'Enter' || keyEvent.key === ' ')
                      ) {
                        keyEvent.preventDefault()
                        if (stat.categoryId && onSelectCategory) {
                          onSelectCategory(stat.categoryId)
                        }
                      }
                    }}
                    style={{
                      flex: '1 1 68px',
                      minWidth: 64,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                      position: 'relative',
                      zIndex: 1,
                      cursor: isClickableBar ? 'pointer' : 'default',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 52,
                        minHeight: 26,
                        height: `${Math.max(barHeight, 26)}px`,
                        background: GOV_BRAND.primary,
                        borderRadius: '6px 6px 2px 2px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 5,
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.departmentCount}
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
                          fontSize: 12,
                          fontWeight: 700,
                          color: palette.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stat.categoryName}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: palette.textFaint,
                        }}
                      >
                        {sharePct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 좌: 통합 변천 연혁 | 우: 성격별 기관 구성 원장 */}
      <section
        aria-label="기관 변천 연혁 및 성격별 현황"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <GovSectionEyebrow>통합 변천 연혁</GovSectionEyebrow>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 14,
              padding: '15px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: palette.text,
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  헌정 · 내각 · 기관 연혁
                </h3>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: palette.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {filteredEvents.length}건
                </span>
                {activeEventFilterLabel ? (
                  <button
                    type="button"
                    onClick={() => onSelectedEventTypeChange('all')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.cardBg,
                      color: palette.text,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{activeEventFilterLabel}</span>
                    <FiX size={11} color={palette.textMuted} />
                  </button>
                ) : null}
              </div>

              {eventFilterOptions.length > 1 ? (
                <GovMorePopover
                  triggerSize="sm"
                  ariaLabel="연혁 유형 필터 설정"
                  title="연혁 유형 필터"
                  hasActiveIndicator={selectedEventType !== 'all'}
                  customContent={
                    <GovMoreFieldGroup>
                      <GovMoreFieldLabel htmlFor="gov-stats-event-filter">
                        연혁 유형 필터
                      </GovMoreFieldLabel>
                      <GovMoreNativeSelect
                        id="gov-stats-event-filter"
                        value={selectedEventType}
                        onChange={(changeEvent) =>
                          onSelectedEventTypeChange(changeEvent.target.value)
                        }
                      >
                        {eventFilterOptions.map((filterItem) => (
                          <option key={filterItem.key} value={filterItem.key}>
                            {filterItem.label} ({filterItem.count})
                          </option>
                        ))}
                      </GovMoreNativeSelect>
                    </GovMoreFieldGroup>
                  }
                />
              ) : null}
            </div>

            <div
              style={{
                position: 'relative',
                maxHeight: 460,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredEvents.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    fontSize: 12.5,
                    color: palette.textMuted,
                    background: palette.cardBg,
                    borderRadius: 10,
                    border: `1px dashed ${palette.borderMid}`,
                  }}
                >
                  기록된 변천 연혁이 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {displayedEvents.map((eventItem) => {
                    const imageUrl = eventItem.images?.[0]
                    const eventBadgeTone =
                      eventItem.type === 'regime'
                        ? {
                            label: '헌정',
                            bg: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                            color: isDark ? '#a5b4fc' : '#4338ca',
                          }
                        : eventItem.type === 'cabinet'
                          ? {
                              label: '내각',
                              bg: isDark ? 'rgba(14,165,233,0.18)' : '#e0f2fe',
                              color: isDark ? '#7dd3fc' : '#0369a1',
                            }
                          : eventItem.type === 'establishment'
                            ? {
                                label: '설립',
                                bg: isDark
                                  ? 'rgba(16,185,129,0.16)'
                                  : '#ecfdf5',
                                color: isDark ? '#6ee7b7' : '#047857',
                              }
                            : eventItem.type === 'crisis'
                              ? {
                                  label: '폐지',
                                  bg: isDark
                                    ? 'rgba(148,163,184,0.16)'
                                    : '#f1f5f9',
                                  color: isDark ? '#cbd5e1' : '#475569',
                                }
                              : eventItem.type === 'merger'
                                ? {
                                    label: '통합',
                                    bg: isDark
                                      ? 'rgba(245,158,11,0.16)'
                                      : '#fffbeb',
                                    color: isDark ? '#fcd34d' : '#b45309',
                                  }
                                : {
                                    label: '개편',
                                    bg: palette.accentBg,
                                    color: palette.accent,
                                  }

                    const handleOpenTimelineTarget = () => {
                      if (
                        eventItem.targetKind === 'cabinet' &&
                        eventItem.targetId &&
                        onSelectCabinet
                      ) {
                        onSelectCabinet(eventItem.targetId)
                        return
                      }
                      if (
                        eventItem.targetKind === 'department' &&
                        eventItem.targetId &&
                        onSelectDepartment
                      ) {
                        onSelectDepartment(eventItem.targetId)
                        return
                      }
                      if (eventItem.targetKind === 'system' && onSelectTab) {
                        onSelectTab('system')
                      }
                    }

                    const isInteractiveItem = Boolean(
                      (eventItem.targetKind === 'cabinet' &&
                        eventItem.targetId &&
                        onSelectCabinet) ||
                        (eventItem.targetKind === 'department' &&
                          eventItem.targetId &&
                          onSelectDepartment) ||
                        (eventItem.targetKind === 'system' && onSelectTab),
                    )

                    return (
                      <div
                        key={eventItem.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '64px minmax(0, 1fr)',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 6px',
                            borderRadius: 6,
                            textAlign: 'center',
                            fontSize: 11,
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
                          role={isInteractiveItem ? 'button' : undefined}
                          tabIndex={isInteractiveItem ? 0 : undefined}
                          onClick={
                            isInteractiveItem
                              ? handleOpenTimelineTarget
                              : undefined
                          }
                          onKeyDown={(keyEvent) => {
                            if (
                              isInteractiveItem &&
                              (keyEvent.key === 'Enter' ||
                                keyEvent.key === ' ')
                            ) {
                              keyEvent.preventDefault()
                              handleOpenTimelineTarget()
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 12px',
                            borderRadius: 10,
                            background: palette.cardBg,
                            border: `1px solid ${palette.borderHairline}`,
                            cursor: isInteractiveItem ? 'pointer' : 'default',
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
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
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 5,
                                  background: eventBadgeTone.bg,
                                  color: eventBadgeTone.color,
                                }}
                              >
                                {eventBadgeTone.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: palette.text,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  minWidth: 120,
                                }}
                              >
                                {eventItem.title}
                              </span>
                            </div>
                            {eventItem.description ? (
                              <p
                                style={{
                                  fontSize: 11.5,
                                  color: palette.textMuted,
                                  lineHeight: 1.4,
                                  margin: '2px 0 0',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {eventItem.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {filteredEvents.length > 30 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllEvents((prev) => !prev)}
                      style={{
                        alignSelf: 'center',
                        marginTop: 4,
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: `1px solid ${palette.border}`,
                        background: palette.cardBg,
                        color: palette.textMuted,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {showAllEvents
                        ? '접기 (최근 30건만 보기)'
                        : `이전 연혁 더 보기 (+${filteredEvents.length - 30}건)`}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 성격별 기관 구성 원장 */}
        <div style={{ minWidth: 0 }}>
          <GovSectionEyebrow>성격별 기관 구성</GovSectionEyebrow>
          <div
            style={{
              background: palette.bgSubtle,
              border: `1px solid ${palette.border}`,
              borderRadius: 14,
              padding: '15px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {orgBreakdownRows.map((rowItem, rowIndex) => {
              const ratioPct = Math.min(
                100,
                Math.round((rowItem.count / totalOrgBreakdownSum) * 100),
              )
              return (
                <div
                  key={rowItem.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingTop: rowIndex > 0 ? 10 : 0,
                    borderTop:
                      rowIndex > 0
                        ? `1px solid ${palette.borderHairline}`
                        : 'none',
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
                        fontSize: 13,
                        fontWeight: 700,
                        color: palette.text,
                      }}
                    >
                      {rowItem.title}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          rowItem.count > 0 ? palette.text : palette.textFaint,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {rowItem.count}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 999,
                      background: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(15,23,42,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    {rowItem.count > 0 ? (
                      <div
                        style={{
                          width: `${Math.max(ratioPct, 4)}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: rowItem.accentColor,
                        }}
                      />
                    ) : null}
                  </div>

                  {rowItem.examples.length > 0 ? (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: palette.textMuted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rowItem.examples.slice(0, 3).join(' · ')}
                    </div>
                  ) : null}
                </div>
              )
            })}
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
  onClick,
}: {
  accentColor?: string
  icon: ReactNode
  title: string
  value: string | number
  unit: string
  subLabel?: string
  onClick?: () => void
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const cardPalette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(keyEvent) => {
        if (onClick && (keyEvent.key === 'Enter' || keyEvent.key === ' ')) {
          keyEvent.preventDefault()
          onClick()
        }
      }}
      style={{
        background: cardPalette.bgSubtle,
        border: `1px solid ${cardPalette.borderMid}`,
        borderRadius: 14,
        padding: '15px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: onClick ? 'pointer' : 'default',
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
