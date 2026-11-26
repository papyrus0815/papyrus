/**
 * 정부·내각·국가기관 시대 띠 — `/events`의 `EraStrip`과 동일한 비례 타임라인 개관 한 줄.
 *
 * - 세기마다 같은 폭의 슬롯(`Century`), 슬롯 안 10년 막대(`Decade`) = 그 10년에 출범·설립된 내각/기관 수
 * - 기록이 없는 세기 구간은 좁은 틈(`⋯`, `Gap`)으로 압축해 시대 간 거리감을 유지
 * - 위쪽 가는 선(`SpanLine`) = 장기 집권 내각·장기 존속 핵심 기관의 기간 (최대 3레인 패킹)
 * - 옅은 창(`Window`) = 현재 스크롤 화면에 보이는 연도 범위 실시간 표시
 * - 시점 단면 연도(`activeYearValue`)가 지정된 경우 해당 연도 위치에 수직 마커(`YearNeedle`) 표시
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  buildEraAxis,
  centuryLabel,
  centuryOf,
  decadeIndex,
  decadeMidYear,
  packLanes,
} from '@/pages/events/list/lib/era-strip.lib'
import { metaText } from '@/pages/events/styles/theme'
import { formatCenturyLabel } from '@/shared/lib/iso-date'

export interface GovernmentCenturyBucket {
  key: string
  century: number | null
  count: number
}

export interface GovernmentDecadeBucket {
  key: string
  decadeStartYear: number
  centuryKey: string
  count: number
}

export interface GovernmentEraSpanItem {
  id: string
  title: string
  from: number
  to: number
}

export interface GovernmentEraStripProps {
  buckets: GovernmentCenturyBucket[]
  decadeBuckets?: GovernmentDecadeBucket[]
  spans?: ReadonlyArray<GovernmentEraSpanItem>
  activeCenturyKey: string | null
  onJumpToCentury: (centuryKey: string) => void
  onJumpToDecade?: (decadeBucket: GovernmentDecadeBucket) => void
  activeYearValue: string
  currentOnly: boolean
  showCurrentToggle: boolean
  onSelectPresetYear?: (presetYear: number) => void
  onToggleCurrentOnly: () => void
  undatedCount: number
}

const SPAN_LANES = 3

export const GovernmentEraStrip: React.FC<GovernmentEraStripProps> = ({
  buckets,
  decadeBuckets = [],
  spans = [],
  activeCenturyKey,
  onJumpToCentury,
  onJumpToDecade,
  activeYearValue,
  currentOnly,
  showCurrentToggle,
  onToggleCurrentOnly,
  undatedCount,
}) => {
  const model = useMemo(() => {
    const centuryYears: number[] = []
    for (const bucket of buckets) {
      if (bucket.century != null && bucket.count > 0) {
        const repYear =
          bucket.century > 0
            ? (bucket.century - 1) * 100 + 50
            : bucket.century * 100 + 50
        centuryYears.push(repYear)
      }
    }
    for (const decade of decadeBuckets) {
      if (decade.count > 0) {
        centuryYears.push(
          decade.decadeStartYear === 0 ? 1 : decade.decadeStartYear + 5,
        )
      }
    }

    const axis = buildEraAxis(centuryYears)
    if (!axis) return null

    const decades = new Map<string, { count: number; bucket: GovernmentDecadeBucket }>()
    for (const decade of decadeBuckets) {
      if (decade.count <= 0) continue
      const repYear =
        decade.decadeStartYear === 0 ? 1 : decade.decadeStartYear + 5
      const centuryValue = centuryOf(repYear)
      const idx = decadeIndex(repYear)
      const key = `${centuryValue}:${idx}`
      const existing = decades.get(key)
      if (existing) {
        existing.count += decade.count
      } else {
        decades.set(key, { count: decade.count, bucket: decade })
      }
    }

    // 만약 decadeBuckets가 비어 있고 century buckets만 있는 경우 세기 균등 배분 폴백
    if (decades.size === 0) {
      for (const bucket of buckets) {
        if (bucket.century != null && bucket.count > 0) {
          const midIdx = 5
          const midYear = decadeMidYear(bucket.century, midIdx)
          decades.set(`${bucket.century}:${midIdx}`, {
            count: bucket.count,
            bucket: {
              key: `${bucket.key}:d5`,
              decadeStartYear: midYear - 5,
              centuryKey: bucket.key,
              count: bucket.count,
            },
          })
        }
      }
    }

    const counts = [...decades.values()].map((entry) => entry.count)
    const peak = Math.max(1, ...counts)

    const lanes = packLanes(
      spans.map((span) => ({
        ...span,
        left: axis.toPct(span.from),
        right: Math.max(axis.toPct(span.to + 1), axis.toPct(span.from) + 0.35),
      })),
      SPAN_LANES,
    )

    return { axis, decades, peak, lanes }
  }, [buckets, decadeBuckets, spans])

  /* 현재 목록 화면에 보이는 해들의 범위를 실시간 측정해 Window 오버레이로 표시 */
  const stripRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState<[number, number] | null>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const top = stripRef.current?.getBoundingClientRect().bottom ?? 0
      const bottom = window.innerHeight
      const years: number[] = []
      let lastAbove: number | null = null

      const rowElements = document.querySelectorAll<HTMLElement>(
        '[data-gov-row-year]',
      )
      for (const element of Array.from(rowElements)) {
        const year = Number(element.dataset.govRowYear)
        if (!Number.isFinite(year)) continue
        const rect = element.getBoundingClientRect()
        if (rect.bottom < top) {
          lastAbove = year
        } else if (rect.top <= bottom) {
          years.push(year)
        }
      }
      if (lastAbove != null && years.length === 0) {
        years.push(lastAbove)
      }
      setVisibleRange(
        years.length > 0 ? [Math.min(...years), Math.max(...years)] : null,
      )
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    schedule()
    document.addEventListener('scroll', schedule, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', schedule)
    const timer = window.setInterval(schedule, 1500)
    return () => {
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      window.clearInterval(timer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [model])

  if (!model && undatedCount === 0) return null

  const parsedActiveYear = activeYearValue.trim()
    ? Number.parseInt(activeYearValue.trim(), 10)
    : Number.NaN
  const needleLeftPct =
    model && Number.isFinite(parsedActiveYear)
      ? model.axis.toPct(parsedActiveYear)
      : null

  const windowLeft =
    model && visibleRange ? model.axis.toPct(visibleRange[0]) : null
  const windowRight =
    model && visibleRange ? model.axis.toPct(visibleRange[1] + 1) : null

  return (
    <Strip
      ref={stripRef}
      role="navigation"
      aria-label="시대 띠 — 세기·10년별 정부·내각 분포와 장기 존속 기간"
    >
      {model ? (
        <AxisColumn>
          {model.lanes.length > 0 ? (
            <Spans aria-hidden="true" style={{ height: `${SPAN_LANES * 5}px` }}>
              {model.lanes.map((span) => (
                <SpanLine
                  key={span.id}
                  title={`${span.title} · ${
                    span.from < 0 ? `BC ${-span.from}` : span.from
                  }–${span.to < 0 ? `BC ${-span.to}` : span.to}`}
                  style={{
                    left: `${span.left}%`,
                    width: `${Math.max(0.35, span.right - span.left)}%`,
                    top: `${span.lane * 5}px`,
                  }}
                />
              ))}
            </Spans>
          ) : null}

          <Bars>
            {windowLeft != null && windowRight != null ? (
              <Window
                aria-hidden="true"
                style={{
                  left: `${Math.min(windowLeft, windowRight)}%`,
                  width: `${Math.max(
                    0.8,
                    Math.abs(windowRight - windowLeft),
                  )}%`,
                }}
              />
            ) : null}
            {needleLeftPct != null ? (
              <YearNeedle
                aria-hidden="true"
                style={{ left: `${needleLeftPct}%` }}
                title={`시점 단면: ${parsedActiveYear}년`}
              />
            ) : null}

            {model.axis.slots.map((slot) =>
              slot.kind === 'gap' ? (
                <Gap
                  key={`gap-${slot.century}`}
                  style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
                  title={`기록 없는 ${slot.skipped}개 세기`}
                  aria-hidden="true"
                >
                  ⋯
                </Gap>
              ) : (
                <Century
                  key={slot.century}
                  $active={activeCenturyKey === String(slot.century)}
                  style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
                >
                  {Array.from({ length: 10 }, (_unused, index) => {
                    const entry = model.decades.get(`${slot.century}:${index}`)
                    const count = entry?.count ?? 0
                    const year = decadeMidYear(slot.century, index)
                    const label = `${centuryLabel(slot.century)}세기 ${
                      index === 0 ? '첫 10년' : `${index * 10}년대`
                    }`
                    const isActiveDecade =
                      Number.isFinite(parsedActiveYear) &&
                      Math.abs(parsedActiveYear - year) <= 5
                    return (
                      <Decade
                        key={index}
                        type="button"
                        disabled={count === 0}
                        $active={isActiveDecade}
                        onClick={() => {
                          if (entry?.bucket && onJumpToDecade) {
                            onJumpToDecade(entry.bucket)
                          } else {
                            onJumpToCentury(String(slot.century))
                          }
                        }}
                        title={
                          count
                            ? `${label} — ${count}건 · 클릭하여 이동`
                            : undefined
                        }
                        aria-label={
                          count ? `${label} ${count}건, 해당 시대로 이동` : undefined
                        }
                        tabIndex={count ? 0 : -1}
                      >
                        {count > 0 ? (
                          <span
                            style={{
                              height: `${Math.max(
                                14,
                                Math.sqrt(count / model.peak) * 100,
                              )}%`,
                            }}
                          />
                        ) : null}
                      </Decade>
                    )
                  })}
                </Century>
              ),
            )}
          </Bars>

          <Labels>
            {model.axis.slots
              .filter((slot) => slot.kind === 'century')
              .map((slot, index, centuries) => {
                const centuryKey = String(slot.century)
                const isSelected = activeCenturyKey === centuryKey
                return (
                  <CenturyLabelBtn
                    key={slot.century}
                    type="button"
                    $active={isSelected}
                    style={{ left: `${slot.left + slot.width / 2}%` }}
                    onClick={() => onJumpToCentury(centuryKey)}
                    title={`${formatCenturyLabel(slot.century)}로 이동`}
                  >
                    {centuryLabel(slot.century)}
                    {index === centuries.length - 1 ? '세기' : ''}
                  </CenturyLabelBtn>
                )
              })}
          </Labels>
        </AxisColumn>
      ) : null}

      {showCurrentToggle ? (
        <UndatedJumpChip
          type="button"
          $active={currentOnly}
          onClick={onToggleCurrentOnly}
          title="현직 행정부·내각만 보기 전환"
        >
          현직만
        </UndatedJumpChip>
      ) : null}

      {undatedCount > 0 ? (
        <UndatedJumpChip
          type="button"
          $active={activeCenturyKey === '__undated__'}
          onClick={() => onJumpToCentury('__undated__')}
          title={`연대 미상 ${undatedCount}건으로 이동`}
        >
          미상 {undatedCount}
        </UndatedJumpChip>
      ) : null}
    </Strip>
  )
}

const Strip = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 8px 14px 5px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(20,19,34,0.025)'};

  @media (max-width: 640px) {
    display: none;
  }
`

const AxisColumn = styled.div`
  flex: 1;
  min-width: 0;
`

const Spans = styled.div`
  position: relative;
`

const SpanLine = styled.span`
  position: absolute;
  height: 3px;
  min-width: 3px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(165, 180, 252, 0.55)'
      : 'rgba(79, 70, 229, 0.45)'};
`

const Bars = styled.div`
  position: relative;
  height: 32px;
  margin-top: 3px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(20, 19, 34, 0.12)'};
`

const Window = styled.span`
  position: absolute;
  top: -16px;
  bottom: -1px;
  border-left: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  border-right: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(129, 140, 248, 0.12)'
      : 'rgba(79, 70, 229, 0.07)'};
  pointer-events: none;
  transition:
    left 0.15s ease,
    width 0.15s ease;
`

const YearNeedle = styled.span`
  position: absolute;
  top: -16px;
  bottom: -2px;
  width: 2px;
  transform: translateX(-50%);
  background: ${({ theme }) => (theme.mode === 'dark' ? '#f59e0b' : '#d97706')};
  box-shadow: 0 0 0 2px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.22)'
        : 'rgba(217, 119, 6, 0.18)'};
  pointer-events: none;
  z-index: 2;
`

const Gap = styled.span`
  position: absolute;
  bottom: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 11px;
  color: ${metaText};
  opacity: 0.7;
`

const Century = styled.div<{ $active?: boolean }>`
  position: absolute;
  bottom: 0;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  padding: 0 1px;
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.06)'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(129, 140, 248, 0.08)'
        : 'rgba(79, 70, 229, 0.05)'
      : 'transparent'};
`

const Decade = styled.button<{ $active?: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  span {
    display: block;
    width: 100%;
    border-radius: 2px 2px 0 0;
    background: ${({ theme, $active }) =>
      $active
        ? ledgerAccent(theme.mode)
        : theme.mode === 'dark'
          ? '#a1a1aa'
          : '#71717a'};
    transition:
      height 0.15s ease,
      background 0.12s ease;
  }

  &:hover:not(:disabled) span,
  &:focus-visible span {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#e4e4e7' : '#18181b'};
  }

  &:focus-visible {
    outline: 2px solid
      ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    outline-offset: 1px;
  }
`

const Labels = styled.div`
  position: relative;
  height: 16px;
  margin-top: 1px;
  font-size: 10px;
  line-height: 16px;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
`

const CenturyLabelBtn = styled.button<{ $active?: boolean }>`
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 0 3px;
  border: none;
  border-radius: 3px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : 'inherit'};
  font: inherit;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const UndatedJumpChip = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
`
