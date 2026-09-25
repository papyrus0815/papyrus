import styled, { css, keyframes } from 'styled-components'

/**
 * 대시보드 로딩 골격 — 자료가 오기 전, **그려질 그래프와 같은 모양·같은 높이**로 자리를 잡는다.
 *
 * 예전엔 섹션마다 제각각이었다. 지표·국채는 모양 없는 회색 상자(320px), 정체·선거는
 * '불러오는 중…' 한 줄, 인구 피라미드는 아예 null이라 로딩이 끝나는 순간 섹션이 통째로
 * 끼어들며 아래 지면을 밀어냈다. 교역·캘린더는 로딩 중에 **'자료가 없습니다 + 등록'**
 * 안내를 띄워 없는 사실을 말했다.
 *
 * 골격은 두 가지를 지킨다.
 *  · 높이와 뼈대(제목·요약 숫자·축·막대 자리)를 실제 그래프와 맞춘다 — 자료가 오면
 *    같은 자리에 값이 앉을 뿐 지면이 튀지 않는다.
 *  · 값을 지어내지 않는다 — 선의 모양이나 막대 길이를 흉내 내면 한순간 그 모양이 '자료'로
 *    읽힌다. 막대 자리는 트랙만, 선 그래프는 눈금선만 그린다.
 *
 * 반짝임은 한 방향으로 천천히 지나간다(1.6s). 움직임 줄이기 설정이면 멈춘 채 둔다.
 */

type LineProps = {
  variant: 'line'
  /** 나란히 놓을 그래프 수 — 지표 추이·국채처럼 두 장이 한 줄이면 2 */
  count?: number
  /** 요약 숫자 줄(지금·평균·최고·최저)이 있는 그래프인가 */
  summary?: boolean
}

type BarsProps = {
  variant: 'bars'
  rows?: number
}

type PyramidProps = {
  variant: 'pyramid'
}

type CalendarProps = {
  variant: 'calendar'
}

type TextProps = {
  variant: 'text'
  lines?: number
}

export type ChartSkeletonProps =
  | LineProps
  | BarsProps
  | PyramidProps
  | CalendarProps
  | TextProps

/** 실제 그래프 높이와 같게 — IndicatorTrendChart·BondYieldCurve가 248px로 그린다 */
const PLOT_HEIGHT = 248
const GRID_LINES = 5
const PYRAMID_ROWS = 9
const CALENDAR_CELLS = 35

export function ChartSkeleton(props: ChartSkeletonProps) {
  return (
    <Root role="status" aria-label="불러오는 중" aria-busy="true">
      {renderBody(props)}
    </Root>
  )
}

function renderBody(props: ChartSkeletonProps) {
  switch (props.variant) {
    case 'line':
      return (
        <LineGrid $count={props.count ?? 1}>
          {Array.from({ length: props.count ?? 1 }, (_, index) => (
            <LineCard key={index}>
              <Block $width="38%" $height={15} />
              <Block $width="54%" $height={11} $gap={6} />
              {props.summary !== false && (
                <SummaryRow>
                  {[0, 1, 2, 3].map((stat) => (
                    <SummaryStat key={stat}>
                      <Block $width="46px" $height={10} />
                      <Block $width="56px" $height={15} $gap={5} />
                    </SummaryStat>
                  ))}
                </SummaryRow>
              )}
              <Plot>
                <YStubs>
                  {Array.from({ length: GRID_LINES }, (_, tick) => (
                    <Block key={tick} $width="30px" $height={9} />
                  ))}
                </YStubs>
                <PlotArea>
                  {Array.from({ length: GRID_LINES }, (_, tick) => (
                    <GridLine key={tick} />
                  ))}
                </PlotArea>
              </Plot>
              <XStubs>
                {[0, 1, 2, 3].map((tick) => (
                  <Block key={tick} $width="30px" $height={9} />
                ))}
              </XStubs>
            </LineCard>
          ))}
        </LineGrid>
      )
    case 'bars':
      return (
        <BarList>
          {Array.from({ length: props.rows ?? 4 }, (_, index) => (
            <BarRow key={index}>
              <Block $width="46px" $height={12} />
              <Track />
              <Block $width="54px" $height={12} />
            </BarRow>
          ))}
        </BarList>
      )
    case 'pyramid':
      return (
        <PyramidGrid>
          {Array.from({ length: PYRAMID_ROWS }, (_, index) => (
            <PyramidRow key={index}>
              <Block $width="36px" $height={10} />
              <Track $mirror />
              <Axis />
              <Track />
            </PyramidRow>
          ))}
        </PyramidGrid>
      )
    case 'calendar':
      return (
        <CalendarWrap>
          <CalendarHead>
            <Block $width="32px" $height={32} $radius={10} />
            <Block $width="120px" $height={18} />
            <Block $width="32px" $height={32} $radius={10} />
          </CalendarHead>
          <CalendarGrid>
            {Array.from({ length: CALENDAR_CELLS }, (_, index) => (
              <CalendarCell key={index} />
            ))}
          </CalendarGrid>
        </CalendarWrap>
      )
    case 'text': {
      const lineCount = props.lines ?? 2
      return (
        <TextLines>
          {Array.from({ length: lineCount }, (_, index) => (
            <Block
              key={index}
              /* 마지막 줄은 짧게 — 문단 끝처럼 보여야 글 자리로 읽힌다 */
              $width={index === lineCount - 1 ? '42%' : '88%'}
              $height={12}
            />
          ))}
        </TextLines>
      )
    }
  }
}

/* ─── 톤 ────────────────────────────────────────────────────────────────── */

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
`

/**
 * 골격 면 — 배경보다 한 단계만 짙게. 반짝임은 같은 계열의 옅은 띠가 지나가는 것으로
 * 충분하다(흰 띠는 다크에서 번쩍인다).
 */
const skeletonFill = css`
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.65)'}
      50%,
    transparent 100%
  );
  background-size: 300% 100%;
  background-repeat: no-repeat;
  animation: ${shimmer} 1.6s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: none;
  }
`

const Root = styled.div`
  width: 100%;
`

const Block = styled.span<{
  $width: string
  $height: number
  $gap?: number
  $radius?: number
}>`
  display: block;
  width: ${({ $width }) => $width};
  max-width: 100%;
  height: ${({ $height }) => $height}px;
  margin-top: ${({ $gap }) => $gap ?? 0}px;
  border-radius: ${({ $radius }) => $radius ?? 6}px;
  ${skeletonFill}
`

/* 선 그래프 — IndicatorTrendChart와 같은 격자(두 장이면 760px 칼럼부터 좌우) */
const LineGrid = styled.div<{ $count: number }>`
  container-type: inline-size;
  display: grid;
  gap: 28px;
  grid-template-columns: minmax(0, 1fr);

  ${({ $count }) =>
    $count > 1 &&
    css`
      @media (min-width: 1100px) {
        grid-template-columns: repeat(${$count}, minmax(0, 1fr));
      }
    `}
`

const LineCard = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const SummaryRow = styled.div`
  display: flex;
  gap: 24px;
  margin: 14px 0 12px;
`

const SummaryStat = styled.div`
  display: flex;
  flex-direction: column;
`

const Plot = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  height: ${PLOT_HEIGHT - 28}px;
  margin-top: 28px;
`

const YStubs = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
`

const PlotArea = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
`

/** 눈금선은 반짝이지 않는다 — 실제 그래프에도 있는 것이라 골격이 아니라 틀이다 */
const GridLine = styled.span`
  display: block;
  height: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#eef1f5'};
`

const XStubs = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 0 0 52px;
`

/* 막대 — 교역 연도 막대와 같은 줄 간격 */
const BarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const BarRow = styled.div`
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) 96px;
  align-items: center;
  gap: 16px;
  height: 46px;
  padding: 0 10px;
`

const Track = styled.span<{ $mirror?: boolean }>`
  display: block;
  height: 16px;
  border-radius: ${({ $mirror }) =>
    $mirror ? '999px 4px 4px 999px' : '4px 999px 999px 4px'};
  ${skeletonFill}
`

const PyramidGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0 26px;
`

const PyramidRow = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  height: 25px;

  > span:first-child {
    justify-self: end;
  }
`

const Axis = styled.span`
  align-self: stretch;
  background: ${({ theme }) => theme.colors.border.medium};
`

/* 캘린더 — EventCalendarPanel과 같은 76px 칸 */
const CalendarWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CalendarHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 28px;
`

const CalendarCell = styled.span`
  min-height: 76px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  ${skeletonFill}
  background-color: transparent;
`

const TextLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
  /* 내용만큼 줄어드는 카드(선거) 안에서 %폭 줄이 한 점으로 쪼그라들지 않게 */
  min-width: 200px;
`
