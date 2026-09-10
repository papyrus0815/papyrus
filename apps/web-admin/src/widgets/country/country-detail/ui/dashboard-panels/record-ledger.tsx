import type { ReactNode } from 'react'

import styled, { css } from 'styled-components'

export interface RecordLedgerRow {
  key: string
  label: string
  unit: string
  value: number
  /** 최근 7일 새로 등록된 수 — 0이면 표시하지 않는다 */
  delta: number
  isLoading: boolean
  icon: ReactNode
  /** null이면 아직 갈 곳이 없는 축(군대) */
  onClick: (() => void) | null
  /** 비활성 축의 사유 — '준비 중' 등 */
  badge?: string
}

export interface RecordLedgerProps {
  rows: RecordLedgerRow[]
}

/**
 * 기록 원장 — 이 나라에 무엇이 얼마나 쌓였는지 **서로 견주어** 보이게.
 *
 * 예전에는 축마다 카드를 세우고 숫자를 크게 찍었다. 그러면 "인물 20"과 "사건 39"가
 * 각자 자기 상자 안에 있어 **둘 중 어느 쪽이 많은지 눈으로 비교되지 않는다**.
 * 게다가 카드는 폭을 380px에서 멈춰 본문 오른쪽이 통째로 비었다.
 *
 * 한 줄에 하나씩, 막대 길이로 견준다 — 폭을 자연스럽게 다 쓰고 순위가 즉시 읽힌다.
 * 값이 0인 축은 막대를 그리지 않고 아래 한 줄로 접는다(0을 크게 그리면 그게 주인공이 된다).
 */
export function RecordLedger({ rows }: RecordLedgerProps) {
  const filled = rows.filter((row) => row.isLoading || row.value > 0)
  const empty = rows.filter((row) => !row.isLoading && row.value === 0)
  const max = filled.reduce((acc, row) => Math.max(acc, row.value), 0) || 1

  return (
    <Root>
      {filled.length > 0 && (
        <List>
          {filled.map((row) => {
            const interactive = row.onClick != null
            return (
              <Row
                key={row.key}
                as={interactive ? 'button' : 'div'}
                type={interactive ? 'button' : undefined}
                $interactive={interactive}
                onClick={row.onClick ?? undefined}
                aria-label={
                  interactive
                    ? `${row.label} ${row.value}${row.unit} — 탭으로 이동`
                    : undefined
                }
              >
                <RowIcon aria-hidden>{row.icon}</RowIcon>
                <RowLabel>{row.label}</RowLabel>
                <BarTrack>
                  <BarFill
                    style={{
                      width: row.isLoading
                        ? '0%'
                        : `${Math.max(2, (row.value / max) * 100)}%`,
                    }}
                  />
                </BarTrack>
                <RowValue>
                  {row.isLoading ? '—' : row.value.toLocaleString('ko-KR')}
                  <RowUnit>{row.unit}</RowUnit>
                </RowValue>
                {row.delta > 0 && <RowDelta>+{row.delta}</RowDelta>}
                {interactive && <RowChevron aria-hidden>›</RowChevron>}
              </Row>
            )
          })}
        </List>
      )}

      {empty.length > 0 && (
        <EmptyRow>
          <EmptyLabel>아직 없는 기록</EmptyLabel>
          {empty.map((row) =>
            row.onClick ? (
              <EmptyChip
                key={row.key}
                type="button"
                onClick={row.onClick}
                aria-label={`${row.label} 기록하러 가기`}
              >
                {row.label}
              </EmptyChip>
            ) : (
              <EmptyChipStatic key={row.key}>
                {row.label}
                {row.badge ? ` · ${row.badge}` : ''}
              </EmptyChipStatic>
            ),
          )}
        </EmptyRow>
      )}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Row = styled.div<{ $interactive: boolean }>`
  display: grid;
  /*
   * 막대에 상한을 둔다. 폭을 다 쓰게 두면 '20명'이 제 이름표에서 1,100px 떨어져
   * 서로를 못 찾는다 — 선거 카드에서 겪은 것과 같은 문제다. 남는 폭은 오른쪽 여백으로.
   */
  grid-template-columns: 26px minmax(72px, max-content) minmax(0, 760px) max-content auto auto;
  justify-content: start;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: none;
  font-family: inherit;
  text-align: left;

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;

      &:hover {
        background: ${theme.colors.hover};
      }
      &:focus-visible {
        outline: 2px solid ${theme.colors.active};
        outline-offset: -2px;
      }
    `}
`

const RowIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 15px;
    height: 15px;
  }
`

const RowLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

/** 막대가 폭을 흡수한다 — 카드가 380px에서 멈추던 자리를 그대로 쓴다 */
const BarTrack = styled.span`
  display: block;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  overflow: hidden;
`

const BarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.75),
    rgba(139, 92, 246, 0.75)
  );
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
`

const RowValue = styled.span`
  min-width: 68px;
  text-align: right;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowUnit = styled.span`
  margin-left: 3px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 최근 7일 증가분 — 있을 때만 */
const RowDelta = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #059669;
  background: rgba(16, 185, 129, 0.14);
`

const RowChevron = styled.span`
  font-size: 15px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 2px 12px 0;
`

const EmptyLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const emptyChipBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(15, 23, 42, 0.035)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15, 23, 42, 0.06)'};
`

const EmptyChip = styled.button`
  ${emptyChipBase}
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.2);
    color: #4f46e5;
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

const EmptyChipStatic = styled.span`
  ${emptyChipBase}
  opacity: 0.65;
`
