/**
 * 진영 수치 그래프 — 비교표(module-metrics)의 '그래프' 보기.
 *
 * 형식:
 *  - 진영이 **둘**이면 대결형(가운데 지표 이름, 왼쪽·오른쪽으로 뻗는 막대) — 전쟁 수치의 기본 질문이 '누가 더'라서
 *    두 막대가 같은 축에서 마주 보게 한다.
 *  - 셋 이상이면 지표마다 진영 막대 묶음.
 *  - **눈금은 지표(행)마다 따로** — 병력(수십만)과 포로(수천)를 한 자로 재면 작은 쪽이 0이 된다. 두 척도를 한 축에
 *    올리지 않는다(행 = 작은 배수). 그래서 행끼리 막대 길이를 견주지 말라고 머리에 적는다.
 *  - 아래 '나라별 몫' — 진영 값을 나라가 얼마씩 냈는지, 진영 색 한 가지로 큰 나라부터.
 *
 * 색은 진영 색(진영을 따라간다, 순위를 따라가지 않는다). 글자는 글자 토큰 — 값·이름에 진영 색을 입히지 않는다.
 * 출처 미검증 값은 막대를 흐리게(범례에 적는다). 범위 값은 막대 끝에 수염. 막대를 누르면 그 값을 고친다.
 */
import { type FocusEvent, type MouseEvent, useRef, useState } from 'react'

import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  formatObservationExact,
  formatObservationValue,
  isUnverified,
  observationExtent,
  unverifiedLabel,
} from '@/entities/evidence/lib/format-observation'
import { glassCardMixin } from '@/shared/styles/mixins'
import { ledgerHairline, ledgerHairlineStrong, ledgerAccent } from '@/entities/event/ui/ledger-tokens'
import { type Observation } from '@/shared/api/evidence'
import { metaText } from '@/pages/events/styles/theme'

import { memberSum, representativeOf, type MemberEntry } from './side-metrics.lib'

export interface ChartSide {
  id: string
  name: string
  color: string
}

export interface ChartRow {
  key: string
  name: string
  cells: Map<string, Observation[]>
}

interface SideMetricsChartProps {
  rows: ReadonlyArray<ChartRow>
  sides: ReadonlyArray<ChartSide>
  memberCells: Map<string, Map<string, MemberEntry<Observation>[]>>
  onEdit: (observation: Observation) => void
  onAdd: (sideId: string, metricKey: string) => void
  sourceLabel: (observation: Observation) => string
}

/** 한 진영·한 지표의 그릴 값 — 진영 값, 없으면 나라 합(계산) */
interface BarDatum {
  side: ChartSide
  observation: Observation | null
  center: number | null
  low: number | null
  high: number | null
  derived: boolean
  unverified: boolean
  label: string
}

/** 계산한 합을 같은 표기로('약 63.7만명') — 원래 값의 지표·통화를 빌린다 */
function sumLabel(base: Observation, value: number): string {
  return formatObservationValue({ ...base, value: String(Math.round(value)), low: null, high: null, atLeast: false })
}

function datumOf(
  row: ChartRow,
  side: ChartSide,
  memberCells: SideMetricsChartProps['memberCells'],
): BarDatum {
  const representative = representativeOf(row.cells.get(side.id) ?? [])
  const extent = representative ? observationExtent(representative) : null
  if (representative && extent) {
    return {
      side,
      observation: representative,
      center: extent.center,
      low: extent.low,
      high: extent.high,
      derived: false,
      unverified: isUnverified(representative),
      label: formatObservationValue(representative),
    }
  }
  const members = memberCells.get(row.key)?.get(side.id) ?? []
  const sum = memberSum(members)
  if (sum !== null && members[0]) {
    return {
      side,
      observation: null,
      center: sum,
      low: sum,
      high: sum,
      derived: true,
      unverified: members.every((member) => isUnverified(member.observation)),
      label: sumLabel(members[0].observation, sum),
    }
  }
  return { side, observation: null, center: null, low: null, high: null, derived: false, unverified: false, label: '' }
}

interface TooltipState {
  x: number
  y: number
  title: string
  lines: string[]
}

export function SideMetricsChart({ rows, sides, memberCells, onEdit, onAdd, sourceLabel }: SideMetricsChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const butterfly = sides.length === 2

  const showTooltip = (
    target: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
    datum: BarDatum,
    metricName: string,
  ) => {
    const host = hostRef.current
    if (!host) return
    const hostRect = host.getBoundingClientRect()
    const rect = target.currentTarget.getBoundingClientRect()
    const lines = [
      datum.derived
        ? `${datum.label} — 나라별 값을 더한 계산 값`
        : datum.observation
          ? formatObservationExact(datum.observation)
          : '',
      datum.observation
        ? datum.unverified
          ? unverifiedLabel(datum.observation)
          : sourceLabel(datum.observation)
        : datum.derived && datum.unverified
          ? '출처 미검증 값이 섞임'
          : '',
      datum.observation ? '누르면 고칩니다' : '',
    ].filter(Boolean)
    /* 툴팁(최대 280px)이 지면 밖으로 잘리지 않게 가운데 x를 안쪽으로 당긴다(휴대폰 왼쪽 막대에서 잘렸다) */
    const half = Math.min(140, hostRect.width / 2)
    const center = rect.left - hostRect.left + rect.width / 2
    setTooltip({
      x: Math.max(half, Math.min(hostRect.width - half, center)),
      y: rect.top - hostRect.top,
      title: `${datum.side.name} · ${metricName}`,
      lines,
    })
  }
  const hideTooltip = () => setTooltip(null)

  const anyUnverified = rows.some((row) =>
    sides.some((side) => {
      const datum = datumOf(row, side, memberCells)
      return datum.center !== null && datum.unverified
    }),
  )

  /* 막대 하나 — 진영 값이면 버튼(고치기), 나라 합이면 그림만, 값이 없으면 '+ 값' 자리 */
  const renderBar = (row: ChartRow, datum: BarDatum, max: number, direction: 'start' | 'end') => {
    if (datum.center === null) {
      return (
        <AddSlot
          type="button"
          $direction={direction}
          onClick={() => onAdd(datum.side.id, row.key)}
          aria-label={`${datum.side.name} ${row.name} 추가`}
        >
          <FiPlus aria-hidden />값
        </AddSlot>
      )
    }
    const scale = (value: number) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0)
    const width = Math.max(scale(datum.center), 1.5)
    const whisker =
      datum.low !== null && datum.high !== null && datum.high > datum.low
        ? { from: scale(datum.low), to: scale(datum.high) }
        : null
    const handlers = {
      onMouseEnter: (mouseEvent: MouseEvent<HTMLElement>) => showTooltip(mouseEvent, datum, row.name),
      onMouseLeave: hideTooltip,
      onFocus: (focusEvent: FocusEvent<HTMLElement>) => showTooltip(focusEvent, datum, row.name),
      onBlur: hideTooltip,
    }
    const content = (
      <>
        <Track $direction={direction}>
          <BarFill
            $direction={direction}
            $unverified={datum.unverified}
            $derived={datum.derived}
            style={{ width: `${width}%`, background: datum.side.color }}
          />
          {whisker && (
            <WhiskerLine
              $direction={direction}
              style={
                direction === 'end'
                  ? { left: `${whisker.from}%`, width: `${whisker.to - whisker.from}%` }
                  : { right: `${whisker.from}%`, width: `${whisker.to - whisker.from}%` }
              }
            />
          )}
        </Track>
        <BarValue $direction={direction}>
          {datum.label}
          {datum.derived && <span className="derived">나라 합</span>}
        </BarValue>
      </>
    )
    const accessibleName = `${datum.side.name} ${row.name} ${datum.label}${datum.unverified ? ', 출처 미검증' : ''}`
    return datum.observation ? (
      <BarButton
        type="button"
        $direction={direction}
        onClick={() => datum.observation && onEdit(datum.observation)}
        aria-label={`${accessibleName} — 고치기`}
        {...handlers}
      >
        {content}
      </BarButton>
    ) : (
      <BarStatic $direction={direction} role="img" aria-label={`${accessibleName}(나라별 값의 합)`} tabIndex={0} {...handlers}>
        {content}
      </BarStatic>
    )
  }

  /** 나라별 몫 — 나라 값이 둘 이상 있는 (지표, 진영)만 */
  const memberBlocks = rows.flatMap((row) =>
    sides.flatMap((side) => {
      const members = memberCells.get(row.key)?.get(side.id) ?? []
      const perCountry = new Map<string, MemberEntry<Observation>[]>()
      for (const member of members) perCountry.set(member.name, [...(perCountry.get(member.name) ?? []), member])
      const entries = [...perCountry.entries()]
        .map(([name, list]) => {
          const picked = representativeOf(list.map((member) => member.observation))
          const extent = picked ? observationExtent(picked) : null
          return picked && extent ? { name, observation: picked, center: extent.center } : null
        })
        .filter((entry): entry is { name: string; observation: Observation; center: number } => Boolean(entry))
        .sort((left, right) => right.center - left.center)
      return entries.length >= 2 ? [{ row, side, entries }] : []
    }),
  )

  return (
    <Host ref={hostRef}>
      <Legend aria-label="범례">
        {sides.map((side) => (
          <LegendItem key={side.id}>
            <Swatch style={{ background: side.color }} aria-hidden />
            {side.name}
          </LegendItem>
        ))}
        <LegendNote>
          막대 길이는 지표마다 따로 잽니다
          {anyUnverified && ' · 흐린 막대 = 출처 없음·미검증'}
        </LegendNote>
      </Legend>

      {butterfly ? (
        <Butterfly role="list" aria-label="진영 수치 비교">
          {rows.map((row) => {
            const [left, right] = sides.map((side) => datumOf(row, side, memberCells))
            const max = Math.max(left.high ?? 0, right.high ?? 0)
            const ratio =
              left.center && right.center && left.derived === right.derived
                ? Math.max(left.center, right.center) / Math.min(left.center, right.center)
                : null
            return (
              <ButterflyRow key={row.key} role="listitem">
                <Half>{renderBar(row, left, max, 'start')}</Half>
                <MetricLabel>
                  <span className="name">{row.name}</span>
                  {ratio !== null && ratio >= 1.05 && (
                    <span className="ratio" title="큰 쪽 ÷ 작은 쪽">
                      {ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}배
                    </span>
                  )}
                </MetricLabel>
                <Half>{renderBar(row, right, max, 'end')}</Half>
              </ButterflyRow>
            )
          })}
        </Butterfly>
      ) : (
        <Grouped role="list" aria-label="진영 수치 비교">
          {rows.map((row) => {
            const data = sides.map((side) => datumOf(row, side, memberCells))
            const max = Math.max(0, ...data.map((datum) => datum.high ?? 0))
            return (
              <GroupBlock key={row.key} role="listitem">
                <GroupTitle>{row.name}</GroupTitle>
                {data.map((datum) => (
                  <GroupLine key={datum.side.id}>
                    <span className="side">{datum.side.name}</span>
                    {renderBar(row, datum, max, 'end')}
                  </GroupLine>
                ))}
              </GroupBlock>
            )
          })}
        </Grouped>
      )}

      {memberBlocks.length > 0 && (
        <Members aria-label="나라별 몫">
          <MembersTitle>나라별 몫</MembersTitle>
          <MembersGrid>
            {memberBlocks.map(({ row, side, entries }) => {
              const total = entries.reduce((sum, entry) => sum + entry.center, 0)
              const max = entries[0]?.center ?? 0
              return (
                <MemberCard key={`${row.key}:${side.id}`}>
                  <MemberHead>
                    <Swatch style={{ background: side.color }} aria-hidden />
                    {side.name} · {row.name}
                  </MemberHead>
                  <ul>
                    {entries.map((entry) => (
                      <li key={entry.name}>
                        <button
                          type="button"
                          onClick={() => onEdit(entry.observation)}
                          aria-label={`${entry.name} ${row.name} ${formatObservationValue(entry.observation)} — 고치기`}
                          title={formatObservationExact(entry.observation)}
                        >
                          <span className="name">{entry.name}</span>
                          <span className="track">
                            <span
                              className="fill"
                              style={{
                                width: `${max > 0 ? Math.max(1.5, (entry.center / max) * 100) : 0}%`,
                                background: side.color,
                                opacity: isUnverified(entry.observation) ? 0.45 : 0.9,
                              }}
                            />
                          </span>
                          <span className="value">
                            {formatObservationValue(entry.observation)}
                            {total > 0 && <span className="share">{Math.round((entry.center / total) * 100)}%</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </MemberCard>
              )
            })}
          </MembersGrid>
        </Members>
      )}

      {tooltip && (
        <Tooltip role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.title}</strong>
          {tooltip.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </Tooltip>
      )}
    </Host>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

type Direction = { $direction: 'start' | 'end' }

const Host = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const Swatch = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 3px;
`

const LegendNote = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: ${metaText};
`

const Butterfly = styled.div`
  display: flex;
  flex-direction: column;
`

const ButterflyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 150px) minmax(0, 1fr);
  align-items: center;
  min-height: 40px;

  /* 휴대폰 폭 — 가운데 지표 칸을 줄여 막대 자리를 돌려준다 */
  @media (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr) minmax(64px, 84px) minmax(0, 1fr);
  }
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const Half = styled.div`
  min-width: 0;
  padding: 8px 0;
`

const MetricLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 0 10px;
  text-align: center;
  border-inline: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 639px) {
    padding: 0 6px;
  }

  .name {
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.35;
    word-break: keep-all;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .ratio {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
`

/* 막대 + 값 한 줄. 왼쪽 반은 거꾸로(축이 가운데) */
const barLine = ({ $direction }: Direction) => `
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  flex-direction: ${$direction === 'start' ? 'row-reverse' : 'row'};
`

const BarButton = styled.button<Direction>`
  ${barLine}
  padding: 4px 0;
  border: 0;
  border-radius: 4px;
  background: none;
  font: inherit;
  cursor: pointer;

  &:hover > span:first-child,
  &:focus-visible > span:first-child {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const BarStatic = styled.div<Direction>`
  ${barLine}
  padding: 4px 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const Track = styled.span<Direction>`
  position: relative;
  flex: 1 1 auto;
  min-width: 28px;
  height: 14px;
  border-radius: 4px;
  transition: background 0.14s;
`

/* 축(가운데)에 붙은 쪽은 각지고, 값 끝만 4px 둥글게 */
const BarFill = styled.span<Direction & { $unverified: boolean; $derived: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${({ $direction }) => ($direction === 'start' ? 'right: 0; border-radius: 4px 0 0 4px;' : 'left: 0; border-radius: 0 4px 4px 0;')}
  opacity: ${({ $unverified }) => ($unverified ? 0.45 : 0.9)};
  /* 나라 합(계산)은 빗금 — 저장된 진영 값과 구분(색만으로 말하지 않게) */
  ${({ $derived }) =>
    $derived
      ? 'background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 3px, transparent 3px 7px) !important;'
      : ''}
`

const WhiskerLine = styled.span<Direction>`
  position: absolute;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: ${({ theme }) => theme.colors.text.primary};
  opacity: 0.6;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    width: 2px;
    height: 10px;
    background: inherit;
  }
  &::before {
    left: 0;
  }
  &::after {
    right: 0;
  }
`

const BarValue = styled.span<Direction>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 639px) {
    font-size: 12px;
  }

  .derived {
    font-size: 11px;
    font-weight: 500;
    color: ${metaText};
  }
`

const AddSlot = styled.button<Direction>`
  display: flex;
  align-items: center;
  justify-content: ${({ $direction }) => ($direction === 'start' ? 'flex-end' : 'flex-start')};
  gap: 3px;
  width: 100%;
  padding: 6px 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: ${metaText};
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover,
  &:focus-visible {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const Grouped = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const GroupTitle = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupLine = styled.div`
  display: grid;
  grid-template-columns: minmax(80px, 160px) minmax(0, 1fr);
  align-items: center;
  gap: 10px;

  .side {
    overflow: hidden;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Members = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const MembersTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MembersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px 24px;
`

const MemberCard = styled.div`
  min-width: 0;

  ul {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }
  button {
    display: grid;
    grid-template-columns: minmax(64px, 110px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 3px 0;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
  .name {
    overflow: hidden;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    position: relative;
    height: 10px;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 0 4px 4px 0;
  }
  .value {
    display: inline-flex;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .share {
    font-weight: 400;
    color: ${metaText};
  }
`

const MemberHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Tooltip = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 8px));

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
