/**
 * 선거 지면 맨 위 — 「역대 의회 구성」: 선거마다 작은 반원 좌석도를 시간순으로 늘어놓는다.
 *
 * 예전 요약 두 칸(투표율 선 + 선거 유형 막대 / 확정 건수 막대)은 독일처럼 선거가 몇 번 안 되면 유형 막대가
 * 한 색 100%, 확정 막대도 한 색 100%라 '일자' 막대 둘과 거의 평평한 선만 남았다. 선거·정당 지면이 보여 줄
 * 것은 '의회가 어떻게 바뀌어 왔나'라서, 선거별 의석 구성을 나란히 둔다. 의석 기록이 없는 선거는 회색 좌석.
 */
import React from 'react'

import styled, { useTheme } from 'styled-components'

import { DIGIT_DISPLAY, ledgerAccent, ledgerHairline, ledgerHoverFill } from '@/entities/event/ui/ledger-tokens'

import { computeSeatDots, HEMICYCLE_VIEWBOX } from './election-result-hemicycle'

export interface ParliamentStripItem {
  id: string
  year: string
  ordinalLabel: string | null
  turnoutLabel: string | null
  totalSeats: number | null
  parties: Array<{ fill: string; seats: number; label: string }>
  title: string
}

export function ElectionsParliamentStrip({
  items,
  selectedId,
  onSelect,
}: {
  items: ParliamentStripItem[]
  selectedId: string | null
  onSelect: (electionId: string) => void
}) {
  const theme = useTheme()
  const unknownFill = theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.14)'
  return (
    <StripRow role="list">
      {items.map((item) => {
        const dots = computeSeatDots(item.parties, item.totalSeats ?? 0, unknownFill)
        const seatSum = item.parties.reduce((sum, party) => sum + party.seats, 0)
        const chamber = Math.max(seatSum, item.totalSeats ?? 0)
        const isActive = item.id === selectedId
        return (
          <StripItem
            key={item.id}
            role="listitem"
            type="button"
            $active={isActive}
            aria-pressed={isActive}
            title={item.title}
            onClick={() => onSelect(item.id)}
          >
            <svg viewBox={HEMICYCLE_VIEWBOX} aria-hidden>
              {dots.length > 0 ? (
                dots.map((dot, idx) => (
                  <circle key={idx} cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r={dot.radius.toFixed(2)} fill={dot.fill} />
                ))
              ) : (
                <path d="M 6 112 A 104 104 0 0 1 214 112" fill="none" stroke={unknownFill} strokeWidth="10" />
              )}
            </svg>
            <span className="year">{item.year}</span>
            <span className="meta">
              {[item.ordinalLabel, chamber > 0 ? `${chamber.toLocaleString('ko-KR')}석` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {item.turnoutLabel ? <span className="turnout">투표율 {item.turnoutLabel}</span> : null}
          </StripItem>
        )
      })}
    </StripRow>
  )
}

const StripRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
`

const StripItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 10px 9px;
  border: 1px solid ${({ theme, $active }) => ($active ? ledgerAccent(theme.mode) : ledgerHairline(theme.mode))};
  border-radius: 10px;
  background: transparent;
  box-shadow: ${({ theme, $active }) => ($active ? `0 0 0 1px ${ledgerAccent(theme.mode)}` : 'none')};
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease;
  ${DIGIT_DISPLAY}

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  svg {
    width: 100%;
    max-width: 120px;
    height: auto;
    margin-bottom: 4px;
  }
  .year {
    font-size: 15px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .turnout {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
