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

  /* 치세가 덮은 비율 — 빈 구간이 '없던 시대'가 아니라 '아직 안 적은 재위'임을 말해 준다 */
  const coveragePercent = canDrawBand
    ? coverageOf(
        dated.filter((ruler) => ruler.axis === (axes[0] ?? 'HEAD_OF_STATE')),
        domainStart,
        domainEnd,
      )
    : null

  const visible = expanded ? rulers : rulers.slice(0, COLLAPSED_LIMIT)
  const hiddenCount = rulers.length - visible.length

  return (
    <Wrap>
      {canDrawBand && (
        <Band aria-label="재위 띠">
          {axes.map((axis) => (
            <Lane key={axis}>
              {axes.length > 1 && <LaneLabel>{AXIS_LABELS[axis]}</LaneLabel>}
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
        </Band>
      )}

      <Cards>
        {visible.map((ruler) => {
          const length = reignLength(ruler)
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
                  {ruler.ordinal != null && <Ordinal>제{ruler.ordinal}대</Ordinal>}
                  <CardName>{ruler.personName}</CardName>
                </CardTop>
                <CardMeta>
                  {[ruler.title, yearsLabel(ruler), length != null ? `${length}년` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </CardMeta>
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
      {rulers.length > COLLAPSED_LIMIT && (
        <MoreButton type="button" onClick={() => setExpanded((open) => !open)}>
          {expanded ? '접기' : `${hiddenCount}명 더 보기`}
        </MoreButton>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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

const LaneLabel = styled.span`
  flex: 0 0 56px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
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

const Segment = styled.button<{ $tone: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0;
  border: none;
  border-right: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#ffffff')};
  background: ${({ theme }) => theme.colors.primary};
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

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
`

const RulerCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
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

const Ordinal = styled.span`
  flex: none;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.primary};
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
