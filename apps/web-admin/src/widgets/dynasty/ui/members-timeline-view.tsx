/**
 * 가문 구성원 타임라인 시각화.
 * Y축 = 인물(출생순), X축 = 시대, 막대 = 수명, 색 = 재위/일반/생존.
 */
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { Person } from '@/shared/api/person'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  persons: Person[]
}

function signedYear(era: 'BC' | 'AD' | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

function formatYear(value: number): string {
  if (value < 0) return `BC ${Math.abs(value)}`
  return value.toString()
}

function pickAxisTicks(min: number, max: number, count = 6): number[] {
  const range = max - min
  if (range <= 0) return [min]
  const rough = range / (count - 1)
  // 100 단위로 반올림
  const magnitudes = [10, 25, 50, 100, 200, 500, 1000]
  const step =
    magnitudes.find((m) => m >= rough) ?? Math.ceil(rough / 100) * 100
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max; v += step) ticks.push(v)
  return ticks
}

export function MembersTimelineView({ persons }: Props) {
  const navigate = useNavigate()
  const now = new Date().getFullYear()

  // 인물별 시작/종료 연도 계산 (출생·사망 우선, 없으면 전성기(floruit) 폴백)
  const spans = persons.map((p) => {
    const start =
      p.birthYear != null
        ? signedYear(p.birthEra ?? null, p.birthYear)
        : p.floruitStartYear != null
          ? signedYear(p.floruitEra ?? null, p.floruitStartYear)
          : null
    const rawEnd =
      p.deathYear != null
        ? signedYear(p.deathEra ?? null, p.deathYear)
        : p.isAlive
          ? now
          : p.floruitEndYear != null
            ? signedYear(p.floruitEra ?? null, p.floruitEndYear)
            : p.birthYear == null && p.floruitStartYear != null
              ? signedYear(p.floruitEra ?? null, p.floruitStartYear)
              : null
    const end =
      start != null && rawEnd != null && rawEnd >= start ? rawEnd : null
    const isFloruitFallback = p.birthYear == null && p.floruitStartYear != null
    return { person: p, start, end, isFloruitFallback }
  })

  // 시간 축 범위 — 생존 인물이 있을 때만 현재 연도(now)를 상한에 포함해 고대·중세 가문 축이 찌그러지지 않게 함
  const hasAlive = persons.some((p) => p.isAlive)
  const startYears = spans
    .map((s) => s.start)
    .filter((v): v is number => v != null)
  const endYears = spans
    .map((s) => s.end ?? s.start)
    .filter((v): v is number => v != null)
  const minVal = startYears.length ? Math.min(...startYears) : now - 100
  const maxCandidates = hasAlive ? [...endYears, now] : endYears
  const maxRaw = maxCandidates.length
    ? Math.max(...maxCandidates, minVal + 1)
    : now
  const pad = Math.max(10, Math.round((maxRaw - minVal) * 0.04))
  const axisMin = minVal - pad
  const axisMax = maxRaw + pad
  const range = Math.max(1, axisMax - axisMin)

  const ticks = pickAxisTicks(axisMin, axisMax)

  return (
    <Wrap>
      <ScrollArea>
        <Header>
          <NameCol aria-hidden />
          <Track>
            {ticks.map((t) => {
              const left = ((t - axisMin) / range) * 100
              return (
                <TickLabel key={t} style={{ left: `${left}%` }}>
                  {formatYear(t)}
                </TickLabel>
              )
            })}
          </Track>
        </Header>
        <Rows>
          {spans.map(({ person: p, start, end, isFloruitFallback }) => {
            const isRuling = !!p.regnalName?.trim()
            const isAlive = !!p.isAlive

            const leftPct =
              start != null ? Math.max(0, Math.min(100, ((start - axisMin) / range) * 100)) : 0
            const widthPct =
              start != null && end != null
                ? Math.max(1, Math.min(100 - leftPct, ((end - start) / range) * 100))
                : start != null
                  ? 1
                  : 0

            const displayName = getPersonDisplayName(p, true)
            const ageInfo =
              !isFloruitFallback && start != null && end != null
                ? `${Math.max(0, end - start)}세${isAlive ? '+' : ''}`
                : isFloruitFallback && start != null
                  ? `fl. ${formatYear(start)}${end != null && end !== start ? `–${formatYear(end)}` : ''}`
                  : '연도 미상'

            return (
              <Row
                key={p.id}
                onClick={() => navigate(pathKeys.personsTimelineDetail(p.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(pathKeys.personsTimelineDetail(p.id))
                  }
                }}
                aria-label={`${displayName} ${ageInfo}`}
              >
                <NameCol>
                  <NameText title={displayName}>
                    {isRuling && <RulingDot title="재위" />}
                    {displayName}
                  </NameText>
                  {p.regnalName?.trim() && (
                    <RegnalText title={p.regnalName.trim()}>
                      {p.regnalName.trim()}
                    </RegnalText>
                  )}
                </NameCol>
                <Track>
                  {start != null ? (
                    <Bar
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      $ruling={isRuling}
                      $alive={isAlive}
                    >
                      <BarLabel>
                        {isFloruitFallback ? 'fl. ' : ''}
                        {formatYear(start)}
                        {end != null && (!isFloruitFallback || end !== start)
                          ? ` – ${isAlive ? '현재' : formatYear(end)}`
                          : ''}
                      </BarLabel>
                    </Bar>
                  ) : (
                    <UnknownNote>연도 미상</UnknownNote>
                  )}
                </Track>
              </Row>
            )
          })}
        </Rows>
      </ScrollArea>
      <Legend>
        <LegendItem>
          <LegendSwatch $kind="ruling" /> 재위 (재위명 있음)
        </LegendItem>
        <LegendItem>
          <LegendSwatch $kind="alive" /> 생존
        </LegendItem>
        <LegendItem>
          <LegendSwatch $kind="regular" /> 일반 / 사망
        </LegendItem>
        <LegendItem>인물 클릭 시 상세로 이동</LegendItem>
      </Legend>
    </Wrap>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const NAME_COL_WIDTH = 160
const ROW_HEIGHT = 30
const HEADER_HEIGHT = 24

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
`

const ScrollArea = styled.div`
  position: relative;
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  flex: 1;
  min-height: 0;
`

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: ${NAME_COL_WIDTH}px 1fr;
  height: ${HEADER_HEIGHT}px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const NameCol = styled.div`
  width: ${NAME_COL_WIDTH}px;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const NameText = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RegnalText = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RulingDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`

const Track = styled.div`
  position: relative;
  height: 100%;
`

const TickLabel = styled.span`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  pointer-events: none;
`

const Rows = styled.div`
  position: relative;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: ${NAME_COL_WIDTH}px 1fr;
  height: ${ROW_HEIGHT}px;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  position: relative;
  z-index: 1;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) =>
      isDark(theme.mode)
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99,102,241,0.04)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
  &:last-child {
    border-bottom: none;
  }
`

const Bar = styled.div<{ $ruling: boolean; $alive: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 14px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: hidden;
  ${({ $ruling, $alive, theme }) => {
    if ($ruling) {
      return css`
        background: ${theme.colors.primary};
        color: #fff;
      `
    }
    if ($alive) {
      return css`
        background: ${theme.colors.success};
        color: #fff;
      `
    }
    return css`
      background: ${theme.colors.background.quaternary};
      color: ${theme.colors.text.secondary};
    `
  }}
`

const BarLabel = styled.span`
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const UnknownNote = styled.span`
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 4px;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const LegendSwatch = styled.span<{ $kind: 'ruling' | 'alive' | 'regular' }>`
  display: inline-block;
  width: 14px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $kind, theme }) => {
    if ($kind === 'ruling') return theme.colors.primary
    if ($kind === 'alive') return theme.colors.success
    return theme.colors.background.quaternary
  }};
`
