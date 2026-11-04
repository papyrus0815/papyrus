import { useState } from 'react'

import styled from 'styled-components'

export interface EventCenturyStripProps {
  /** 오래된 순 세기 분포. century는 부호 세기(20 = 20세기, -1 = 기원전 1세기) */
  counts: Array<{ century: number; count: number }>
  /** 막대를 누르면 그 세기로 — 사건 탭의 해당 세기 묶음으로 내려간다 */
  onOpen: (century: number) => void
}

/** 부호 세기 → 라벨. 20 → '20세기', -1 → '기원전 1세기' */
function centuryLabel(century: number): string {
  return century < 0 ? `기원전 ${-century}세기` : `${century}세기`
}

/** 축약 라벨 — 막대 아래에는 '20C', 'BC1' 정도만 놓는다 */
function shortLabel(century: number): string {
  return century < 0 ? `BC${-century}` : `${century}C`
}

/**
 * 사건 연표 — 이 나라의 사건이 **어느 세기에 몰려 있는지**.
 *
 * 상단 4칸 헤어라인 요약 바(총 기록 사건 · 분포 세기 범위 · 최다 집중 세기 · 공백 세기 현황)와
 * 「분포 차트 / 세기별 원장」 보기 전환을 제공한다.
 */
export function EventCenturyStrip({ counts, onOpen }: EventCenturyStripProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>('chart')

  if (counts.length === 0) return null

  const max = counts.reduce((acc, row) => Math.max(acc, row.count), 0) || 1
  const total = counts.reduce((acc, row) => acc + row.count, 0)
  const first = counts[0].century
  const last = counts[counts.length - 1].century
  const peakRow = counts.reduce(
    (best, row) => (row.count > best.count ? row : best),
    counts[0],
  )
  const peakSharePct = total > 0 ? Math.round((peakRow.count / total) * 100) : 0

  const totalSkippedCenturies = counts.reduce((acc, row, index) => {
    if (index === 0) return 0
    const prev = counts[index - 1].century
    const step = row.century - prev - (prev < 0 && row.century > 0 ? 1 : 0)
    return acc + (step > 1 ? step - 1 : 0)
  }, 0)

  return (
    <Root>
      <HeadlineStrip aria-label="세기별 사건 분포 요약">
        <HeadlineCell>
          <HeadlineLabel>총 기록 사건</HeadlineLabel>
          <HeadlineValue>
            {total.toLocaleString('ko-KR')}
            <HeadlineUnit>건</HeadlineUnit>
          </HeadlineValue>
          <HeadlineSub>세기 산정 사건 합계</HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>분포 세기 범위</HeadlineLabel>
          <HeadlineValue>
            {centuryLabel(first)}
            {first !== last ? ` – ${centuryLabel(last)}` : ''}
          </HeadlineValue>
          <HeadlineSub>활동 기록 {counts.length}개 세기</HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>최다 집중 세기</HeadlineLabel>
          <HeadlineValue>
            <PeakButton
              type="button"
              onClick={() => onOpen(peakRow.century)}
              title={`${centuryLabel(peakRow.century)} 사건 보러 가기`}
            >
              {centuryLabel(peakRow.century)}
            </PeakButton>
          </HeadlineValue>
          <HeadlineSub>
            {peakRow.count.toLocaleString('ko-KR')}건 · 전체의 {peakSharePct}%
          </HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>공백 세기 현황</HeadlineLabel>
          <HeadlineValue>
            {totalSkippedCenturies > 0 ? (
              <>
                {totalSkippedCenturies}
                <HeadlineUnit>개 세기</HeadlineUnit>
              </>
            ) : (
              '연속 기록'
            )}
          </HeadlineValue>
          <HeadlineSub>
            {totalSkippedCenturies > 0
              ? '범위 내 사건 미기록 세기'
              : '시작~마지막 세기 공백 없음'}
          </HeadlineSub>
        </HeadlineCell>
      </HeadlineStrip>

      <ToolbarRow>
        <ToolbarHint>
          막대나 원장 행을 누르면 사건 탭의 해당 세기 목록으로 이동합니다
        </ToolbarHint>
        <ViewToggleGroup role="group" aria-label="사건 연표 보기 방식">
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'chart'}
            onClick={() => setViewMode('chart')}
          >
            분포 차트
          </ViewToggleBtn>
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'ledger'}
            onClick={() => setViewMode('ledger')}
          >
            세기별 원장 ({counts.length})
          </ViewToggleBtn>
        </ViewToggleGroup>
      </ToolbarRow>

      {viewMode === 'chart' ? (
        <Bars>
          {counts.map((row, index) => {
            const previous = index > 0 ? counts[index - 1].century : null
            /* 부호 세기는 0을 건너뛴다(기원전 1세기 → 1세기가 연속) */
            const step =
              previous == null
                ? 0
                : row.century -
                  previous -
                  (previous < 0 && row.century > 0 ? 1 : 0)
            const skipped = step > 1 ? step - 1 : 0
            return (
              <Column key={row.century}>
                {skipped > 0 && (
                  <Skip title={`사건이 없는 ${skipped}개 세기`}>
                    <SkipMark aria-hidden>⋯</SkipMark>
                    <SkipText>{skipped}세기 공백</SkipText>
                  </Skip>
                )}
                <Bar
                  type="button"
                  onClick={() => onOpen(row.century)}
                  title={`${centuryLabel(row.century)} · ${row.count}건`}
                  aria-label={`${centuryLabel(row.century)} 사건 ${row.count}건 — 사건 탭의 그 세기로 이동`}
                >
                  <BarCount>{row.count}</BarCount>
                  <BarTrack>
                    <BarFill
                      style={{
                        height: `${Math.max(6, (row.count / max) * 100)}%`,
                      }}
                    />
                  </BarTrack>
                  <BarLabel>{shortLabel(row.century)}</BarLabel>
                </Bar>
              </Column>
            )
          })}
        </Bars>
      ) : (
        <LedgerGrid role="table" aria-label="세기별 사건 분포 원장">
          {counts.map((row) => {
            const ratio = Math.max(4, Math.round((row.count / max) * 100))
            const sharePct =
              total > 0 ? Math.round((row.count / total) * 100) : 0
            return (
              <LedgerCell key={row.century}>
                <LedgerRowButton
                  type="button"
                  onClick={() => onOpen(row.century)}
                >
                  <LedgerCenturyLabel>
                    {centuryLabel(row.century)}
                  </LedgerCenturyLabel>
                  <LedgerBarTrack aria-hidden>
                    <LedgerBarFill style={{ width: `${ratio}%` }} />
                  </LedgerBarTrack>
                  <LedgerCountMeta>
                    <strong>{row.count.toLocaleString('ko-KR')}건</strong>
                    <span>({sharePct}%)</span>
                    <LedgerChevron aria-hidden>›</LedgerChevron>
                  </LedgerCountMeta>
                </LedgerRowButton>
              </LedgerCell>
            )
          })}
        </LedgerGrid>
      )}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
`

const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 14px;
  min-width: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    padding-left: 2px;
  }

  &:last-child {
    border-right: none;
    padding-right: 2px;
  }

  @media (max-width: 860px) {
    &:nth-child(2n) {
      border-right: none;
    }
    &:nth-child(2n + 1) {
      padding-left: 2px;
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
  font-size: 14.5px;
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
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PeakButton = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
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
  }
`

const LedgerRowButton = styled.button`
  display: grid;
  grid-template-columns: minmax(76px, max-content) minmax(40px, 1fr) max-content;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const LedgerCenturyLabel = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerBarTrack = styled.span`
  display: block;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  overflow: hidden;
`

const LedgerBarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(217, 119, 6, 0.8)'};
`

const LedgerCountMeta = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    font-size: 12.5px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LedgerChevron = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 2px;
`

const Column = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
`

/** 사건이 없는 구간 — 칸을 만들지 않고 표지 하나로 접는다 */
const Skip = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 2px 18px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SkipMark = styled.span`
  font-size: 13px;
  letter-spacing: 0.1em;
`

const SkipText = styled.span`
  font-size: 9.5px;
  font-weight: 600;
  white-space: nowrap;
`

/**
 * 막대는 18px — 칸 폭(32px)을 다 채우면 두꺼운 벽돌이 된다. 남는 폭은 누르는 자리로만
 * 쓴다. 위쪽 끝만 둥글고 바닥은 각지게 — 바닥선에서 자라는 막대로 읽히게 한다.
 */
const BarFill = styled.span`
  display: block;
  width: 18px;
  border-radius: 4px 4px 0 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(217, 119, 6, 0.75)'};
  transition: background 0.15s ease;
`

const Bar = styled.button`
  appearance: none;
  border: none;
  background: none;
  font-family: inherit;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:hover ${BarFill},
  &:focus-visible ${BarFill} {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#f59e0b' : '#d97706')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
    border-radius: 6px;
  }
`

/*
 * 회색 칸을 깔지 않는다 — 칸 전체가 '만점 그릇'처럼 보여 1건짜리 세기가 '거의 빈 통'으로
 * 읽혔다. 세기 사이 비교는 공통 바닥선 하나로 충분하다.
 */
const BarTrack = styled.span`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 32px;
  height: 64px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.medium};
`

const BarCount = styled.span`
  font-size: 11.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
