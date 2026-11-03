import type { ReactNode } from 'react'

import styled, { css } from 'styled-components'

import type { CompletenessField } from '../../model/use-country-dashboard-stats'

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

export interface RecordLedgerCompleteness {
  filled: number
  total: number
  missing: CompletenessField[]
  isLoading?: boolean
}

export interface RecordLedgerProps {
  rows: RecordLedgerRow[]
  /** 기록 완성도 요약 및 미등록 축 안내를 한 카드 안에 통합 표시 */
  completeness?: RecordLedgerCompleteness
  onFillMissing?: ((field: CompletenessField) => void) | null
}

/**
 * 기록 · 완성도 2열 헤어라인 원장 —
 * 상단 헤드라인 요약 스트립(기록 완성도 · 총 축적 기록 · 최다 기록 분야 · 최근 7일 신규)과
 * 하단 10대 아카이빙 축 2열 비교 원장을 무컨테이너 실선 레이아웃으로 통합한다.
 * 등록된 축은 상대 비중 막대·건수·7일 증감(+N)으로 순위가 즉시 비교되고,
 * 미등록(0건) 축도 작은 하단 알약으로 뭉개지 않고 같은 원장 격자 안에서 '+ 기록하기' 동선을 제공한다.
 */
export function RecordLedger({
  rows,
  completeness,
}: RecordLedgerProps) {
  const filled = rows
    .filter((row) => row.isLoading || row.value > 0)
    .sort((a, b) => b.value - a.value)
  const empty = rows.filter((row) => !row.isLoading && row.value === 0)
  const orderedRows = [...filled, ...empty]

  const max = filled.reduce((acc, row) => Math.max(acc, row.value), 0) || 1
  const totalCount = rows.reduce((acc, row) => acc + row.value, 0)
  const totalDelta = rows.reduce((acc, row) => acc + (row.delta || 0), 0)
  const topAxis = filled.find((row) => row.value > 0) ?? null

  const filledAxesCount =
    completeness && !completeness.isLoading
      ? completeness.filled
      : filled.filter((r) => r.value > 0).length
  const totalAxesCount =
    completeness && !completeness.isLoading && completeness.total > 0
      ? completeness.total
      : rows.length
  const percent =
    totalAxesCount > 0
      ? Math.round((filledAxesCount / totalAxesCount) * 100)
      : 0

  return (
    <Root>
      <HeadlineStrip aria-label="기록 완성도 및 축적 요약">
        <HeadlineCell>
          <HeadlineLabel>기록 완성도</HeadlineLabel>
          <HeadlinePrimaryRow>
            <HeadlineValue>{percent}%</HeadlineValue>
            <CompletenessTrack aria-hidden>
              <CompletenessFill
                $full={filledAxesCount === totalAxesCount && totalAxesCount > 0}
                style={{ width: `${percent}%` }}
              />
            </CompletenessTrack>
          </HeadlinePrimaryRow>
          <HeadlineSub>
            {filledAxesCount}/{totalAxesCount}개 기록 축 등록
          </HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>총 축적 기록</HeadlineLabel>
          <HeadlineValue>
            {totalCount.toLocaleString('ko-KR')}
            <HeadlineUnit>건</HeadlineUnit>
          </HeadlineValue>
          <HeadlineSub>
            활성 {filled.filter((r) => r.value > 0).length}개 축 · 미등록{' '}
            {empty.length}개 축
          </HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>최다 축적 분야</HeadlineLabel>
          <HeadlineValue>
            {topAxis ? (
              <>
                {topAxis.label}{' '}
                <HeadlineInlineStat>
                  {topAxis.value.toLocaleString('ko-KR')}
                  {topAxis.unit}
                </HeadlineInlineStat>
              </>
            ) : (
              '미등록'
            )}
          </HeadlineValue>
          <HeadlineSub>
            {topAxis && totalCount > 0
              ? `전체 기록의 ${Math.round((topAxis.value / totalCount) * 100)}% 차지`
              : '아래 원장에서 첫 기록을 등록해 보세요'}
          </HeadlineSub>
        </HeadlineCell>

        <HeadlineCell>
          <HeadlineLabel>최근 7일 신규</HeadlineLabel>
          <HeadlineValue $positive={totalDelta > 0}>
            {totalDelta > 0
              ? `+${totalDelta.toLocaleString('ko-KR')}건`
              : '변동 없음'}
          </HeadlineValue>
          <HeadlineSub>
            {totalDelta > 0
              ? '최근 7일 내 새로 추가된 기록'
              : '최근 7일 내 신규 등록 없음'}
          </HeadlineSub>
        </HeadlineCell>
      </HeadlineStrip>

      <LedgerGrid>
        {orderedRows.map((row) => {
          const isFilled = row.isLoading || row.value > 0
          const interactive = row.onClick != null
          const ratio =
            !row.isLoading && row.value > 0
              ? Math.max(4, Math.round((row.value / max) * 100))
              : 0

          return (
            <LedgerCell key={row.key}>
              <Row
                as={interactive ? 'button' : 'div'}
                type={interactive ? 'button' : undefined}
                $interactive={interactive}
                $filled={isFilled}
                onClick={row.onClick ?? undefined}
                aria-label={
                  interactive
                    ? isFilled
                      ? `${row.label} ${row.value}${row.unit} — 탭으로 이동`
                      : `${row.label} 미등록 — 기록하러 가기`
                    : undefined
                }
              >
                <RowIcon $filled={isFilled} aria-hidden>
                  {row.icon}
                </RowIcon>
                <RowLabel $filled={isFilled}>{row.label}</RowLabel>

                {isFilled ? (
                  <BarTrack aria-hidden>
                    <BarFill style={{ width: `${ratio}%` }} />
                  </BarTrack>
                ) : (
                  <EmptyStatusText>
                    {row.badge ? `미등록 · ${row.badge}` : '미등록'}
                  </EmptyStatusText>
                )}

                <RowRight>
                  {isFilled ? (
                    <>
                      {row.delta > 0 && <RowDelta>+{row.delta}</RowDelta>}
                      <RowValue>
                        {row.isLoading
                          ? '—'
                          : row.value.toLocaleString('ko-KR')}
                        <RowUnit>{row.unit}</RowUnit>
                      </RowValue>
                      {interactive && <RowChevron aria-hidden>›</RowChevron>}
                    </>
                  ) : interactive ? (
                    <RecordActionTag>+ 기록하기</RecordActionTag>
                  ) : null}
                </RowRight>
              </Row>
            </LedgerCell>
          )
        })}
      </LedgerGrid>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
`

const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 20px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  @media (min-width: 961px) {
    &:not(:first-child) {
      padding-left: 18px;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const HeadlineLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadlinePrimaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const HeadlineValue = styled.span<{ $positive?: boolean }>`
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $positive }) =>
    $positive ? '#10b981' : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HeadlineUnit = styled.span`
  margin-left: 2px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadlineInlineStat = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineSub = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CompletenessTrack = styled.span`
  display: inline-block;
  flex: 1;
  max-width: 96px;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
`

const CompletenessFill = styled.span<{ $full: boolean }>`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: ${({ $full }) =>
    $full
      ? '#10b981'
      : 'linear-gradient(90deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))'};
  transition: width 0.35s ease;
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const LedgerCell = styled.div`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 780px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const Row = styled.div<{ $interactive: boolean; $filled: boolean }>`
  display: grid;
  grid-template-columns: 22px minmax(68px, max-content) minmax(40px, 1fr) max-content;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 10px 12px;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition: background 0.14s ease;

      &:hover {
        background: ${theme.colors.hover};
      }
      &:focus-visible {
        outline: 2px solid ${theme.colors.active};
        outline-offset: -2px;
      }
    `}
`

const RowIcon = styled.span<{ $filled: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme, $filled }) =>
    $filled
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.tertiary};
  opacity: ${({ $filled }) => ($filled ? 1 : 0.65)};

  svg {
    width: 15px;
    height: 15px;
  }
`

const RowLabel = styled.span<{ $filled: boolean }>`
  font-size: 13px;
  font-weight: ${({ $filled }) => ($filled ? 700 : 600)};
  color: ${({ theme, $filled }) =>
    $filled ? theme.colors.text.primary : theme.colors.text.secondary};
  white-space: nowrap;
`

const BarTrack = styled.span`
  display: block;
  height: 7px;
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
    rgba(99, 102, 241, 0.78),
    rgba(139, 92, 246, 0.78)
  );
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
`

const EmptyStatusText = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowRight = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-shrink: 0;
`

const RowValue = styled.span`
  text-align: right;
  font-size: 14.5px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowUnit = styled.span`
  margin-left: 2px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowDelta = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11.5px;
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

const RecordActionTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.24)'
        : 'rgba(99,102,241,0.18)'};
`
