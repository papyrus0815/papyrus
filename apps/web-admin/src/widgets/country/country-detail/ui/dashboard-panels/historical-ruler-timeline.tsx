import { useState } from 'react'

import styled from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'
import { formatCountryYearShort } from '@/shared/lib/country-period'

import type { HistoricalRulerItem } from '../../model/use-historical-country-dashboard'

/** 카드 목록을 접어 둘 기준 — 조선처럼 27대가 넘는 나라가 지면을 먹지 않게 */
const COLLAPSED_LIMIT = 8

const AXIS_LABELS: Record<HistoricalRulerItem['axis'], string> = {
  HEAD_OF_STATE: '국가원수',
  HEAD_OF_GOVERNMENT: '정부수반',
}

export interface HistoricalRulerTimelineProps {
  rulers: HistoricalRulerItem[]
  /** 나라의 존속 기간(부호 연도) — 둘 다 있으면 띠의 양 끝이 된다 */
  spanStart: number | null
  spanEnd: number | null
  onSelectPerson: (personId: string) => void
}

function yearsLabel(ruler: HistoricalRulerItem): string {
  const start = formatCountryYearShort(ruler.startYear)
  const end = formatCountryYearShort(ruler.endYear)
  if (start && end) return start === end ? start : `${start}–${end}`
  if (start) return `${start}–`
  if (end) return `–${end}`
  return '연대 미상'
}

function reignLength(ruler: HistoricalRulerItem): number | null {
  if (ruler.startYear == null || ruler.endYear == null) return null
  const length = ruler.endYear - ruler.startYear
  return length >= 0 ? length : null
}

/** 구간 합집합이 [domainStart, domainEnd]에서 차지하는 비율(%) — 겹치는 치세는 한 번만 센다 */
function coverageOf(
  rulers: HistoricalRulerItem[],
  domainStart: number,
  domainEnd: number,
): number {
  const intervals = rulers
    .map((ruler) => [
      Math.max(ruler.startYear as number, domainStart),
      Math.min(ruler.endYear ?? (ruler.startYear as number), domainEnd),
    ])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0])
  let covered = 0
  let cursor = domainStart
  for (const [start, end] of intervals) {
    const from = Math.max(start, cursor)
    if (end > from) {
      covered += end - from
      cursor = end
    }
  }
  return Math.round((covered / (domainEnd - domainStart)) * 100)
}

/** [domainStart, domainEnd] 안에서 수반 재위가 비어 있는 연도 공백 구간 목록 */
function findUncoveredGaps(
  rulers: HistoricalRulerItem[],
  domainStart: number,
  domainEnd: number,
): Array<{ start: number; end: number; years: number }> {
  const intervals = rulers
    .map((ruler) => [
      Math.max(ruler.startYear as number, domainStart),
      Math.min(ruler.endYear ?? (ruler.startYear as number), domainEnd),
    ])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0])
  const gaps: Array<{ start: number; end: number; years: number }> = []
  let cursor = domainStart
  for (const [start, end] of intervals) {
    if (start > cursor) {
      gaps.push({ start: cursor, end: start, years: start - cursor })
    }
    if (end > cursor) {
      cursor = end
    }
  }
  if (domainEnd > cursor) {
    gaps.push({ start: cursor, end: domainEnd, years: domainEnd - cursor })
  }
  return gaps.filter((gap) => gap.years >= 1)
}

/**
 * 역대 수반 — 존속 기간 위에 재위를 띠로 깔고, 아래에 사람을 카드로 세운다.
 *
 * 현대 국가 대시보드의 '행정부'가 지금 정권 하나를 크게 보여준다면, 역사 국가는
 * 끝난 나라라 '지금'이 없다. 대신 **누가 얼마나 다스렸나**가 이 나라의 윤곽이다 —
 * 띠를 보면 긴 치세와 잦은 교체가 한눈에 갈리고, 빈 구간은 기록이 빠진 자리로 읽힌다.
 *
 * 존속 기간 밖의 기록은 띠에서 빼고 카드에 '존속 기간 밖' 표지를 단다 — 실DB에서
 * 다른 나라의 변경백이 프로이센 왕국에 걸려 있던 것처럼, 잘못 걸린 행이 거의 전부다.
 */
export function HistoricalRulerTimeline({
  rulers,
  spanStart,
  spanEnd,
  onSelectPerson,
}: HistoricalRulerTimelineProps) {
  const [expanded, setExpanded] = useState(false)
  const [axisFilter, setAxisFilter] = useState<'ALL' | HistoricalRulerItem['axis']>('ALL')
  const [viewMode, setViewMode] = useState<'cards' | 'ledger'>('cards')

  const dated = rulers.filter(
    (ruler) => ruler.startYear != null && !ruler.isOutOfSpan,
  )
  const domainStart =
    spanStart ?? Math.min(...dated.map((ruler) => ruler.startYear as number))
  const domainEnd =
    spanEnd ??
    Math.max(...dated.map((ruler) => ruler.endYear ?? (ruler.startYear as number)))
  const domainLength = domainEnd - domainStart
  const canDrawBand =
    dated.length > 0 && Number.isFinite(domainLength) && domainLength > 0

  const axes = (['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'] as const).filter(
    (axis) => dated.some((ruler) => ruler.axis === axis),
  )
  const hasMultipleAxes =
    rulers.some((ruler) => ruler.axis === 'HEAD_OF_STATE') &&
    rulers.some((ruler) => ruler.axis === 'HEAD_OF_GOVERNMENT')

  /* 치세가 덮은 비율 — 빈 구간이 '없던 시대'가 아니라 '아직 안 적은 재위'임을 말해 준다 */
  const primaryDated = dated.filter(
    (ruler) => ruler.axis === (axes[0] ?? 'HEAD_OF_STATE'),
  )
  const coveragePercent = canDrawBand
    ? coverageOf(primaryDated, domainStart, domainEnd)
    : null
  const uncoveredGaps = canDrawBand
    ? findUncoveredGaps(primaryDated, domainStart, domainEnd)
    : []

  const inSpanRulers = rulers.filter((ruler) => !ruler.isOutOfSpan)
  const outOfSpanCount = rulers.length - inSpanRulers.length
  const hosCount = inSpanRulers.filter(
    (ruler) => ruler.axis === 'HEAD_OF_STATE',
  ).length
  const hogCount = inSpanRulers.filter(
    (ruler) => ruler.axis === 'HEAD_OF_GOVERNMENT',
  ).length
  const primaryPool =
    inSpanRulers.filter((ruler) => ruler.axis === (axes[0] ?? 'HEAD_OF_STATE'))
      .length > 0
      ? inSpanRulers.filter(
          (ruler) => ruler.axis === (axes[0] ?? 'HEAD_OF_STATE'),
        )
      : inSpanRulers
  const firstRuler = primaryPool[0] ?? rulers[0] ?? null
  const lastRuler =
    primaryPool.length > 1
      ? primaryPool[primaryPool.length - 1]
      : null
  const reignLengths = inSpanRulers
    .map((ruler) => ({ ruler, years: reignLength(ruler) }))
    .filter(
      (entry): entry is { ruler: HistoricalRulerItem; years: number } =>
        entry.years != null,
    )
  const avgReignYears =
    reignLengths.length > 0
      ? Math.round(
          (reignLengths.reduce((sum, item) => sum + item.years, 0) /
            reignLengths.length) *
            10,
        ) / 10
      : null
  const longestRuler =
    reignLengths.length > 0
      ? reignLengths.reduce((best, cur) =>
          cur.years > best.years ? cur : best,
        )
      : null

  const filteredRulers =
    !hasMultipleAxes || axisFilter === 'ALL'
      ? rulers
      : rulers.filter((ruler) => ruler.axis === axisFilter)
  const visible = expanded ? filteredRulers : filteredRulers.slice(0, COLLAPSED_LIMIT)
  const hiddenCount = filteredRulers.length - visible.length

  return (
    <Wrap>
      <HeadlineStrip>
        <HeadlineCell>
          <HeadlineLabel>등록 수반</HeadlineLabel>
          <HeadlineValue>
            {inSpanRulers.length}
            <HeadlineUnit>명</HeadlineUnit>
          </HeadlineValue>
          <HeadlineSub>
            {hasMultipleAxes
              ? `국가원수 ${hosCount} · 정부수반 ${hogCount}`
              : outOfSpanCount > 0
                ? `존속 기간 밖 ${outOfSpanCount}건 별도`
                : '존속 기간 내 재위·재임'}
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>초대 — 마지막</HeadlineLabel>
          <HeadlineValue>
            {firstRuler ? firstRuler.personName : '—'}
            {lastRuler ? ` → ${lastRuler.personName}` : ''}
          </HeadlineValue>
          <HeadlineSub>
            {firstRuler
              ? `${yearsLabel(firstRuler)}${lastRuler ? ` ~ ${yearsLabel(lastRuler)}` : ''}`
              : '재위 연대순'}
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>평균 · 최장 재위</HeadlineLabel>
          <HeadlineValue>
            {avgReignYears != null ? (
              <>
                평균 {avgReignYears}
                <HeadlineUnit>년</HeadlineUnit>
              </>
            ) : (
              '연수 미산정'
            )}
          </HeadlineValue>
          <HeadlineSub>
            {longestRuler
              ? `최장: ${longestRuler.ruler.personName} (${longestRuler.years}년)`
              : '시작·종료 연도 기준'}
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>치세 기록 밀도</HeadlineLabel>
          <HeadlineValue>
            {coveragePercent != null ? (
              <>
                {coveragePercent}
                <HeadlineUnit>%</HeadlineUnit>
              </>
            ) : (
              '—'
            )}
          </HeadlineValue>
          <HeadlineSub>
            {coveragePercent != null
              ? coveragePercent >= 95
                ? '존속 기간 전체 기록됨'
                : `미기록 공백 ${100 - coveragePercent}%`
              : '존속 기간 대비 재위 비율'}
          </HeadlineSub>
        </HeadlineCell>
      </HeadlineStrip>
      {canDrawBand && (
        <Band aria-label="재위 띠">
          {axes.map((axis) => (
            <Lane key={axis}>
              {axes.length > 1 && (
                <LaneLabel $axis={axis}>{AXIS_LABELS[axis]}</LaneLabel>
              )}
              <Track>
                {dated
                  .filter((ruler) => ruler.axis === axis)
                  .map((ruler, index) => {
                    const start = Math.max(ruler.startYear as number, domainStart)
                    const end = Math.min(
                      ruler.endYear ?? (ruler.startYear as number),
                      domainEnd,
                    )
                    const left = ((start - domainStart) / domainLength) * 100
                    const width = Math.max(((end - start) / domainLength) * 100, 0)
                    const label = `${ruler.personName} · ${yearsLabel(ruler)}`
                    return (
                      <Segment
                        key={ruler.recordId}
                        type="button"
                        title={label}
                        aria-label={label}
                        $tone={index % 2}
                        $axis={axis}
                        style={{ left: `${left}%`, width: `max(${width}%, 3px)` }}
                        onClick={() =>
                          ruler.personId && onSelectPerson(ruler.personId)
                        }
                        disabled={!ruler.personId}
                      />
                    )
                  })}
              </Track>
            </Lane>
          ))}
          <Scale $offset={axes.length > 1}>
            <span>{formatCountryYearShort(domainStart)}</span>
            {coveragePercent != null && coveragePercent < 95 && (
              <Coverage>
                기록된 치세 {coveragePercent}% · 빈 구간은 아직 등록되지 않은 재위
              </Coverage>
            )}
            <span>{formatCountryYearShort(domainEnd)}</span>
          </Scale>
          {uncoveredGaps.length > 0 && coveragePercent != null && coveragePercent < 95 && (
            <GapSummaryLine $offset={axes.length > 1}>
              <GapSummaryLabel>미기록 공백 ({uncoveredGaps.length}곳)</GapSummaryLabel>
              <GapSummaryText>
                {uncoveredGaps
                  .slice(0, 4)
                  .map(
                    (gap) =>
                      `${formatCountryYearShort(gap.start)}–${formatCountryYearShort(gap.end)} (${gap.years}년)`,
                  )
                  .join(' · ')}
                {uncoveredGaps.length > 4
                  ? ` 외 ${uncoveredGaps.length - 4}곳`
                  : ''}
              </GapSummaryText>
            </GapSummaryLine>
          )}
        </Band>
      )}

      <ToolbarRow>
        {hasMultipleAxes ? (
          <AxisFilterRow role="tablist" aria-label="역대 수반 축 필터">
            {(
              [
                { key: 'ALL', label: '전체', count: rulers.length },
                {
                  key: 'HEAD_OF_STATE',
                  label: '국가원수',
                  count: rulers.filter(
                    (ruler) => ruler.axis === 'HEAD_OF_STATE',
                  ).length,
                },
                {
                  key: 'HEAD_OF_GOVERNMENT',
                  label: '정부수반',
                  count: rulers.filter(
                    (ruler) => ruler.axis === 'HEAD_OF_GOVERNMENT',
                  ).length,
                },
              ] as const
            ).map((item) => {
              const active = axisFilter === item.key
              return (
                <AxisFilterChip
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  $active={active}
                  onClick={() => setAxisFilter(item.key)}
                >
                  {item.label} <AxisFilterCount>{item.count}</AxisFilterCount>
                </AxisFilterChip>
              )
            })}
          </AxisFilterRow>
        ) : (
          <ToolbarHint>
            수반을 누르면 인물 상세 미리보기가 열립니다
          </ToolbarHint>
        )}

        <ViewToggleGroup role="group" aria-label="역대 수반 보기 방식">
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'cards'}
            onClick={() => setViewMode('cards')}
          >
            재위 카드
          </ViewToggleBtn>
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'ledger'}
            onClick={() => setViewMode('ledger')}
          >
            수치 원장 ({filteredRulers.length})
          </ViewToggleBtn>
        </ViewToggleGroup>
      </ToolbarRow>

      {viewMode === 'ledger' ? (
        <LedgerGrid role="table" aria-label="역대 수반 전체 수치 원장">
          {filteredRulers.map((ruler, index) => {
            const length = reignLength(ruler)
            const maxReign = longestRuler?.years ?? 1
            const ratio =
              length != null && maxReign > 0
                ? Math.max(4, Math.round((length / maxReign) * 100))
                : 0
            return (
              <LedgerCell key={ruler.recordId}>
                <LedgerRowButton
                  type="button"
                  onClick={() =>
                    ruler.personId && onSelectPerson(ruler.personId)
                  }
                  disabled={!ruler.personId}
                >
                  <LedgerOrdinal $axis={ruler.axis}>
                    {ruler.ordinal != null
                      ? `제${ruler.ordinal}대`
                      : `#${index + 1}`}
                  </LedgerOrdinal>
                  <LedgerIdentity>
                    <LedgerNameLine>
                      <LedgerName>{ruler.personName}</LedgerName>
                      {ruler.title && <LedgerTitle>{ruler.title}</LedgerTitle>}
                      {ruler.isOutOfSpan && (
                        <OutOfSpan title="존속 기간 밖 기록">기간 밖</OutOfSpan>
                      )}
                    </LedgerNameLine>
                    {length != null && (
                      <LedgerBarTrack aria-hidden>
                        <LedgerBarFill
                          $axis={ruler.axis}
                          style={{ width: `${ratio}%` }}
                        />
                      </LedgerBarTrack>
                    )}
                  </LedgerIdentity>
                  <LedgerMetaRight>
                    <LedgerYears>{yearsLabel(ruler)}</LedgerYears>
                    <LedgerDuration>
                      {length != null ? `${length}년` : '연수 미상'}
                    </LedgerDuration>
                  </LedgerMetaRight>
                </LedgerRowButton>
              </LedgerCell>
            )
          })}
        </LedgerGrid>
      ) : (
        <>
          <Cards>
            {visible.map((ruler) => {
              const length = reignLength(ruler)
              const counterparts =
                hasMultipleAxes && ruler.startYear != null && !ruler.isOutOfSpan
                  ? dated.filter((other) => {
                      if (other.axis === ruler.axis) return false
                      const rStart = ruler.startYear as number
                      const rEnd = ruler.endYear ?? rStart
                      const oStart = other.startYear as number
                      const oEnd = other.endYear ?? oStart
                      return oStart <= rEnd && oEnd >= rStart
                    })
                  : []
              const counterpartSummary =
                counterparts.length > 0
                  ? ruler.axis === 'HEAD_OF_GOVERNMENT'
                    ? `${counterparts.map((counterpart) => counterpart.personName).join(' · ')} 재위기`
                    : `정부수반 ${counterparts.slice(0, 2).map((counterpart) => counterpart.personName).join('·')}${counterparts.length > 2 ? ` 외 ${counterparts.length - 2}명` : ''}`
                  : null

              return (
                <RulerCard
                  key={ruler.recordId}
                  type="button"
                  onClick={() => ruler.personId && onSelectPerson(ruler.personId)}
                  disabled={!ruler.personId}
                >
                  <Avatar aria-hidden>
                    {ruler.profileImageUrl ? (
                      <img src={getUploadImageUrl(ruler.profileImageUrl)} alt="" />
                    ) : (
                      ruler.personName.slice(0, 1)
                    )}
                  </Avatar>
                  <CardMain>
                    <CardTop>
                      {ruler.ordinal != null && (
                        <Ordinal $axis={ruler.axis}>제{ruler.ordinal}대</Ordinal>
                      )}
                      <CardName>{ruler.personName}</CardName>
                    </CardTop>
                    <CardMeta>
                      {[ruler.title, yearsLabel(ruler), length != null ? `${length}년` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </CardMeta>
                    {counterpartSummary && (
                      <CounterpartTag $axis={ruler.axis} title={counterpartSummary}>
                        {counterpartSummary}
                      </CounterpartTag>
                    )}
                    {ruler.isOutOfSpan && (
                      <OutOfSpan title="이 나라의 존속 기간과 겹치지 않습니다. 다른 나라에 걸려야 할 기록일 수 있습니다.">
                        존속 기간 밖
                      </OutOfSpan>
                    )}
                  </CardMain>
                </RulerCard>
              )
            })}
          </Cards>
          {filteredRulers.length > COLLAPSED_LIMIT && (
            <MoreButton type="button" onClick={() => setExpanded((open) => !open)}>
              {expanded ? '접기' : `${hiddenCount}명 더 보기`}
            </MoreButton>
          )}
        </>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  min-width: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-right: none;
  }

  @media (max-width: 820px) {
    &:nth-child(2n) {
      border-right: none;
    }
    &:nth-child(-n + 2) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const HeadlineLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadlineValue = styled.span`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeadlineUnit = styled.span`
  margin-left: 2px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineSub = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Band = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Lane = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const LaneLabel = styled.span<{ $axis?: HistoricalRulerItem['axis'] }>`
  flex: 0 0 56px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#2dd4bf'
        : '#0f766e'
      : theme.colors.primary};
`

const Track = styled.div`
  position: relative;
  flex: 1;
  height: 22px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.05)'};
  overflow: hidden;
`

const Segment = styled.button<{ $tone: number; $axis?: HistoricalRulerItem['axis'] }>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0;
  border: none;
  border-right: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#ffffff')};
  background: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#14b8a6'
        : '#0d9488'
      : theme.colors.primary};
  opacity: ${({ $tone }) => ($tone === 0 ? 0.85 : 0.55)};
  cursor: pointer;
  transition: opacity 0.12s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 1px;
    z-index: 1;
  }

  &:disabled {
    cursor: default;
  }
`

const Scale = styled.div<{ $offset: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-left: ${({ $offset }) => ($offset ? '66px' : '0')};
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Coverage = styled.span`
  font-weight: 500;
  text-align: center;
`

const GapSummaryLine = styled.div<{ $offset: boolean }>`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-left: ${({ $offset }) => ($offset ? '66px' : '0')};
  padding-top: 4px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
`

const GapSummaryLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const GapSummaryText = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
`

const ToolbarHint = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ViewToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  padding: 3px 9px;
  border: none;
  border-radius: 5px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const LedgerCell = styled.div`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 720px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`

const LedgerRowButton = styled.button`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) max-content;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:disabled {
    cursor: default;
  }
`

const LedgerOrdinal = styled.span<{ $axis?: HistoricalRulerItem['axis'] }>`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#2dd4bf'
        : '#0f766e'
      : theme.colors.primary};
`

const LedgerIdentity = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const LedgerNameLine = styled.span`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
`

const LedgerName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LedgerTitle = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const LedgerBarTrack = styled.span`
  display: block;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  overflow: hidden;
`

const LedgerBarFill = styled.span<{ $axis?: HistoricalRulerItem['axis'] }>`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#14b8a6'
        : '#0d9488'
      : theme.colors.primary};
`

const LedgerMetaRight = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
`

const LedgerYears = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LedgerDuration = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AxisFilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const AxisFilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const AxisFilterCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.78;
`

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RulerCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease;

  &:nth-child(odd) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (max-width: 720px) {
    padding: 10px 4px;
    &:nth-child(odd) {
      border-right: none;
    }
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
  }
`

const Avatar = styled.span`
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CardMain = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
`

const CardTop = styled.span`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
`

const Ordinal = styled.span<{ $axis?: HistoricalRulerItem['axis'] }>`
  flex: none;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#2dd4bf'
        : '#0f766e'
      : theme.colors.primary};
`

const CardName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CardMeta = styled.span`
  max-width: 100%;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CounterpartTag = styled.span<{ $axis?: HistoricalRulerItem['axis'] }>`
  max-width: 100%;
  margin-top: 2px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? '#fde68a'
        : '#92400e'
      : theme.mode === 'dark'
        ? '#99f6e4'
        : '#0f766e'};
  background: ${({ $axis, theme }) =>
    $axis === 'HEAD_OF_GOVERNMENT'
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.18)'
        : '#fef3c7'
      : theme.mode === 'dark'
        ? 'rgba(20, 184, 166, 0.18)'
        : '#ccfbf1'};
`

const OutOfSpan = styled.span`
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  border: 1px solid currentColor;
`

const MoreButton = styled.button`
  align-self: flex-start;
  padding: 4px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }
`
