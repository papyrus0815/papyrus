import styled from 'styled-components'

export interface EventCenturyStripProps {
  /** 오래된 순 세기 분포. century는 부호 세기(20 = 20세기, -1 = 기원전 1세기) */
  counts: Array<{ century: number; count: number }>
  /** 막대를 누르면 가는 곳 — 사건 탭 */
  onOpen: () => void
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
 * 달력은 이 자리에 맞지 않는다. 실측하면 한 나라의 사건은 세기 단위로 흩어져 있고
 * (미국 41건이 18~21세기), 달력 격자는 그중 한 달만 비추므로 거의 언제나 빈칸이다.
 * 사건 탭에 본격 타임라인이 이미 있으니 여기서는 **분포만** 한 줄로 압축한다.
 *
 * 사건이 없는 세기는 칸을 만들지 않고 '건너뛴 세기 수'로 접는다 — 9세기와 20세기만
 * 있는 나라에서 빈 칸 열 개를 그리면 그게 지면의 주인공이 된다.
 */
export function EventCenturyStrip({ counts, onOpen }: EventCenturyStripProps) {
  if (counts.length === 0) return null

  const max = counts.reduce((acc, row) => Math.max(acc, row.count), 0) || 1
  const total = counts.reduce((acc, row) => acc + row.count, 0)
  const first = counts[0].century
  const last = counts[counts.length - 1].century

  return (
    <Root>
      <Head>
        <Range>
          {centuryLabel(first)}
          {first !== last && ` – ${centuryLabel(last)}`}
        </Range>
        <Total>{total.toLocaleString('ko-KR')}건</Total>
      </Head>

      <Bars>
        {counts.map((row, index) => {
          const previous = index > 0 ? counts[index - 1].century : null
          /* 부호 세기는 0을 건너뛴다(기원전 1세기 → 1세기가 연속) */
          const step =
            previous == null
              ? 0
              : row.century - previous - (previous < 0 && row.century > 0 ? 1 : 0)
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
                onClick={onOpen}
                title={`${centuryLabel(row.century)} · ${row.count}건`}
                aria-label={`${centuryLabel(row.century)} 사건 ${row.count}건 — 사건 탭으로 이동`}
              >
                <BarCount>{row.count}</BarCount>
                <BarTrack>
                  <BarFill
                    style={{ height: `${Math.max(6, (row.count / max) * 100)}%` }}
                  />
                </BarTrack>
                <BarLabel>{shortLabel(row.century)}</BarLabel>
              </Bar>
            </Column>
          )
        })}
      </Bars>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const Range = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Total = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
`

const Column = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
`

/** 사건이 없는 구간 — 칸을 만들지 않고 표지 하나로 접는다 */
const Skip = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 6px 18px;
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

const BarFill = styled.span`
  display: block;
  width: 100%;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.55);
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
    background: #f59e0b;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
    border-radius: 6px;
  }
`

const BarTrack = styled.span`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 46px;
  height: 64px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};
`

const BarCount = styled.span`
  font-size: 10.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
