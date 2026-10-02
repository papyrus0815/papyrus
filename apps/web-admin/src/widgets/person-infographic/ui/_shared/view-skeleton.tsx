/**
 * 인물 목록 로딩 스켈레톤 — **뷰마다 그 뷰의 틀**을 그린다.
 *
 * 예전엔 어느 뷰든 맨 카드 격자 8장(CardGridSkeleton)이었다. 그런데 기본 뷰(세기별)는
 * 테두리 판(GroupPanel) 안에 세기 바로가기 줄 · 레일 위 도트 머리글 · 레일만큼 들여 쓴
 * 카드 격자가 있어서, 데이터가 오는 순간
 *   - 판 테두리·바로가기 줄·머리글이 새로 생기며 카드가 약 110px 아래로 밀리고
 *   - 격자 폭이 레일(40px)만큼 줄어 1440px에서 한 줄 7장 → 6장으로 바뀌고
 *   - 8장이라 둘째 줄에 카드 한 장만 덩그러니 남았다(7 + 1).
 * 매트릭스·은하계·능력치는 카드가 아예 없는 뷰인데도 카드 격자를 보여줬다.
 *
 * 원칙
 *  - 틀(판·머리글·격자 들여쓰기)은 실제 styled를 **그대로** 쓴다 — 치수가 같아야 안 튄다.
 *  - 채움만 shimmer. 격자 전체가 한 번에 쓸리도록 background-attachment: fixed로 위상을 맞춘다.
 *  - 카드 수는 넉넉히(어느 폭에서도 화면을 채우게) 그리고 판 아래쪽을 **페이드로 끊는다** —
 *    몇 열이 될지 CSS가 정하므로 개수로 줄을 맞출 수 없고, 마지막 줄의 외톨이 카드는
 *    페이드 아래로 사라진다.
 *  - 빠른 응답에서 번쩍이지 않게 150ms 뒤에 서서히 나타난다.
 */
import styled, { css, keyframes } from 'styled-components'

import { GroupPanel } from './group-section'
import { BRAND, hairline, surface } from './catalog.styles'
import { EraCardGrid } from './person-card'
import { ViewPanel, ViewPanelHeader } from './view-panel'

export type SkeletonView = 'story' | 'dynasty' | 'matrix' | 'galaxy' | 'stats'

export function PersonViewSkeleton({ view }: { view: SkeletonView }) {
  return (
    <Reveal aria-hidden role="presentation">
      {view === 'story' && <GroupedSkeleton withCenturyIndex />}
      {view === 'dynasty' && <GroupedSkeleton withRoleTag />}
      {view === 'matrix' && <MatrixSkeleton />}
      {view === 'galaxy' && <GalaxySkeleton />}
      {view === 'stats' && <StatsSkeleton />}
    </Reveal>
  )
}

/* ───────────────────────── 세기별·왕조 — 판 + 머리글 + 카드 격자 ───────────────────────── */

/**
 * 바로가기 줄 — 실제처럼 '20세기 76'(라벨 + 작은 수) 짝으로. 같은 폭 막대 14개를 늘어놓으면
 * 점선 한 줄처럼 읽혔다. 폭은 라벨 글자 수(두 자리 세기가 더 길다)를 따른다.
 */
const INDEX_ITEMS = [
  [38, 14],
  [38, 18],
  [38, 14],
  [38, 12],
  [38, 12],
  [38, 12],
  [38, 12],
  [38, 12],
  [38, 12],
  [38, 8],
  [38, 12],
  [30, 8],
  [30, 8],
  [30, 8],
]

/** 한 화면을 넉넉히 채우는 수 — 1920px(8열) × 3줄. 넘치는 줄은 페이드가 끊는다. */
const CARD_COUNT = 24

function GroupedSkeleton({
  withCenturyIndex = false,
  withRoleTag = false,
}: {
  withCenturyIndex?: boolean
  withRoleTag?: boolean
}) {
  return (
    <FadingPanel>
      {withCenturyIndex && (
        <IndexRow>
          {INDEX_ITEMS.map(([labelWidth, countWidth], index) => (
            <IndexItem key={index}>
              <Bar style={{ width: labelWidth, height: 12 }} />
              <Bar style={{ width: countWidth, height: 8, opacity: 0.7 }} />
            </IndexItem>
          ))}
        </IndexRow>
      )}
      <GroupHead>
        <HeadChevron />
        <Bar style={{ width: 92, height: 18 }} />
        <Bar style={{ width: 76, height: 10 }} />
        <Bar style={{ width: 30, height: 11 }} />
        <HeadRule />
      </GroupHead>
      <GroupBody>
        <EraCardGrid>
          {Array.from({ length: CARD_COUNT }).map((_unused, index) => (
            <CardSkeleton
              key={index}
              order={index}
              withRoleTag={withRoleTag}
              /* 실제 카드는 절반쯤 직함 줄이 있다 — 높이가 같은 줄끼리 맞춰지는 것까지 흉내 */
              withTitle={index % 3 !== 1}
              nameWidth={NAME_WIDTHS[index % NAME_WIDTHS.length]}
            />
          ))}
        </EraCardGrid>
      </GroupBody>
    </FadingPanel>
  )
}

const NAME_WIDTHS = ['62%', '48%', '70%', '56%', '66%', '52%']

/**
 * 카드 한 장 — person-card의 줄 구성(이름 · 직함 · [바닥] 생몰|나이 · 국가|영향력 링)을
 * 같은 줄 높이로 쌓는다. 막대는 글자 크기보다 조금 낮게 — 줄 높이 안에서 가운데.
 */
function CardSkeleton({
  order,
  withRoleTag,
  withTitle,
  nameWidth,
}: {
  order: number
  withRoleTag: boolean
  withTitle: boolean
  nameWidth: string
}) {
  return (
    <Card style={{ ['--order' as string]: Math.min(order, 11) }}>
      <Visual>
        <Silhouette viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="23" r="11" fill="currentColor" />
          <path d="M9 60c0-13 10.3-21.5 23-21.5S55 47 55 60z" fill="currentColor" />
        </Silhouette>
        {withRoleTag && <RoleTag />}
      </Visual>
      <Body>
        <Line $height={19}>
          <Bar style={{ width: nameWidth, height: 12 }} />
        </Line>
        {withTitle && (
          <Line $height={17}>
            <Bar style={{ width: '38%', height: 9 }} />
          </Line>
        )}
        <MetaRow $pushDown>
          <Bar style={{ width: '50%', height: 10 }} />
          <Bar style={{ width: 40, height: 9 }} />
        </MetaRow>
        <MetaRow>
          <Bar style={{ width: '58%', height: 9 }} />
          <InfluenceStub>
            <RingStub />
            <Bar style={{ width: 16, height: 10 }} />
          </InfluenceStub>
        </MetaRow>
      </Body>
    </Card>
  )
}

/* ───────────────────────── 매트릭스 — 국가 열 + 연도 축 + 막대 띠 ───────────────────────── */

/** 국가 행 — 실제 뷰처럼 첫 나라가 길고 갈수록 짧다(인물 수 내림차순) */
const MATRIX_ROWS = [
  { bars: 14, from: 70 },
  { bars: 10, from: 66 },
  { bars: 6, from: 58 },
]

function MatrixSkeleton() {
  return (
    <FadingViewPanel>
      <PanelHeaderSkeleton titleWidth={128} descWidth={110} legendCount={6} />
      <MatrixGrid>
        <MatrixAxisLabel>
          <Bar style={{ width: 56, height: 9 }} />
        </MatrixAxisLabel>
        <MatrixAxis>
          {Array.from({ length: 12 }).map((_unused, index) => (
            <Bar key={index} style={{ width: 22, height: 8 }} />
          ))}
        </MatrixAxis>
        {MATRIX_ROWS.map((row, rowIndex) => (
          <MatrixRow key={rowIndex}>
            <MatrixLabel>
              <Bar style={{ width: 52, height: 11 }} />
              <Bar style={{ width: 14, height: 9 }} />
            </MatrixLabel>
            <MatrixTrack>
              {Array.from({ length: row.bars }).map((_unused, index) => (
                <Bar
                  key={index}
                  style={{
                    height: 12,
                    width: `${8 + ((index * 7) % 9)}%`,
                    marginLeft: `${row.from + ((index * 13) % 22)}%`,
                  }}
                />
              ))}
            </MatrixTrack>
          </MatrixRow>
        ))}
      </MatrixGrid>
    </FadingViewPanel>
  )
}

/* ───────────────────────── 은하계 — 헤더·범례 + 산점도 판 ───────────────────────── */

function GalaxySkeleton() {
  return (
    <FadingViewPanel>
      <PanelHeaderSkeleton titleWidth={80} descWidth={220} legendCount={6} />
      <LegendRowSkeleton>
        <Bar style={{ width: 22, height: 9 }} />
        {Array.from({ length: 6 }).map((_unused, index) => (
          <LegendDot key={index}>
            <Dot />
            <Bar style={{ width: 30, height: 9 }} />
          </LegendDot>
        ))}
      </LegendRowSkeleton>
      <GalaxyPlot>
        <GalaxyAxis>
          {[0, 1, 2, 3].map((index) => (
            <Bar key={index} style={{ width: 18, height: 9 }} />
          ))}
        </GalaxyAxis>
        <GalaxyField />
      </GalaxyPlot>
    </FadingViewPanel>
  )
}

/* ───────────────────────── 능력치 — 하위 탭 + 진행률 카드 + 차트 두 장 ───────────────────────── */

function StatsSkeleton() {
  return (
    <StatsWrap>
      <StatsTabs>
        {[36, 52, 64, 76, 30].map((width, index) => (
          <Bar key={index} style={{ width, height: 12 }} />
        ))}
      </StatsTabs>
      <StatsCard>
        <Bar style={{ width: 72, height: 12 }} />
        <Bar style={{ width: 96, height: 24, marginTop: 10 }} />
        <Bar style={{ width: '100%', height: 8, marginTop: 10, borderRadius: 999 }} />
        <StatsList>
          {Array.from({ length: 6 }).map((_unused, index) => (
            <StatsListRow key={index}>
              <Bar style={{ width: 64 + ((index * 17) % 40), height: 11 }} />
              <Bar style={{ width: 72, height: 10 }} />
            </StatsListRow>
          ))}
        </StatsList>
      </StatsCard>
      <StatsCharts>
        {[0, 1].map((index) => (
          <StatsCard key={index}>
            <Bar style={{ width: 96, height: 12 }} />
            <Bar style={{ width: 150, height: 9, marginTop: 8 }} />
            <ChartArea />
          </StatsCard>
        ))}
      </StatsCharts>
    </StatsWrap>
  )
}

/* ───────────────────────── 공용 조각 ───────────────────────── */

function PanelHeaderSkeleton({
  titleWidth,
  descWidth,
  legendCount,
}: {
  titleWidth: number
  descWidth: number
  legendCount: number
}) {
  return (
    <ViewPanelHeader>
      <Bar style={{ width: titleWidth, height: 13 }} />
      <Bar style={{ width: descWidth, height: 9 }} />
      <LegendStub>
        {Array.from({ length: legendCount }).map((_unused, index) => (
          <LegendDot key={index}>
            <Dot />
            <Bar style={{ width: 26, height: 9 }} />
          </LegendDot>
        ))}
      </LegendStub>
    </ViewPanelHeader>
  )
}

const reveal = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

/* 150ms 안에 끝나는 응답(캐시 재검증 등)에서는 스켈레톤이 보이지 않는다 */
const Reveal = styled.div`
  animation: ${reveal} 0.2s ease-out 0.15s both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/**
 * 쓸기 — 화면 왼쪽 밖에서 **오른쪽 끝까지**. 예전 값(-600 → 600px)은 고정 배경 기준이라
 * 하이라이트가 화면 x=1200px에서 멈춰, 1440·1920px에서는 오른쪽 카드들이 끝내 반짝이지 않았다.
 */
const sweep = keyframes`
  from { background-position: -600px 0; }
  to { background-position: 100vw 0; }
`

const shimmer = css`
  /* 한 단 옅게 — 회색 판 24장이 '벽'처럼 서 있지 않게. 실제 '사진 없음' 바탕(#f4f5f7)보다
     한 단만 진해 자리는 읽히되 무게는 없다. */
  background-color: ${({ theme }) => (theme.mode === 'dark' ? '#1f2126' : '#eceef2')};
  background-image: linear-gradient(
    90deg,
    transparent 0,
    ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)'}
      50%,
    transparent 100%
  );
  background-size: 600px 100%;
  background-repeat: no-repeat;
  background-attachment: fixed;
  animation: ${sweep} 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: none;
  }
`

const Bar = styled.span`
  display: block;
  flex-shrink: 0;
  border-radius: 4px;
  ${shimmer}
`

/**
 * 아래로 갈수록 사라지는 마스크 — 한 화면 높이에서 끊는다. 카드 줄이 몇 개가 되든
 * 끝이 '잘린 격자'가 아니라 '이어지는 목록'으로 읽힌다.
 */
const fadeOut = css`
  max-height: calc(100vh - 120px);
  min-height: 520px;
  overflow: hidden;
  mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
`

const FadingPanel = styled(GroupPanel)`
  ${fadeOut}
`

const FadingViewPanel = styled(ViewPanel)`
  ${fadeOut}
`

/* 세기 바로가기 줄 — era-story-view의 CenturyIndex와 같은 여백·헤어라인 */
const IndexRow = styled.div`
  /* 판의 레일이 첫 세기 도트에서 시작하도록 이 줄이 레일 자리까지 지면색으로 덮는다(실제와 같음) */
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 22px;
  background: ${surface};
  margin: 0 0 4px calc(-1 * var(--rail-inset));
  /* 실측으로 맞춘 값 — 실제 바로가기 줄(글 버튼 27px + 위아래 10px)과 같은 45px */
  padding: 16px 0 16px var(--rail-inset);
  border-bottom: 1px solid ${hairline};

  @media (max-width: 640px) {
    flex-wrap: nowrap;
    overflow: hidden;
  }
`

/* 그룹 머리글 — group-section의 Header와 같은 높이(52)·레일 도트 위치 */
const GroupHead = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  margin-left: calc(-1 * var(--rail-inset));
  padding: 10px 0 10px var(--rail-inset);

  &::before {
    content: '';
    position: absolute;
    left: calc(var(--rail-inset) / 2 + 0.5px);
    top: 50%;
    /* 실제 숫자 구슬(22~28px)과 같은 자리·크기 — 숫자만 아직 없는 빈 구슬 */
    width: 24px;
    height: 24px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    /*
     * 빈 고리 — 실제 도트(채운 원)의 '아직 안 채워진' 상태. 반투명 채움은 레일 선이 도트를
     * 뚫고 비쳤다. 지면색으로 채우고 옅은 브랜드색 테두리만 둔다.
     */
    background: ${surface};
    border: 2px solid ${BRAND.primaryBorder};
    box-shadow: 0 0 0 3px ${surface};
  }
`

const IndexItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const HeadChevron = styled.span`
  width: 15px;
  height: 15px;
`

const HeadRule = styled.span`
  flex: 1;
  min-width: 16px;
  height: 1px;
  margin-left: 6px;
  background: ${hairline};
`

const GroupBody = styled.div`
  padding: 4px 0 16px;
`

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
`

/**
 * 카드 — person-card의 Card·Visual·Body와 같은 radius·테두리·패딩.
 * 앞 12장은 읽는 순서대로 35ms씩 늦게 떠오른다 — 24장이 한 번에 '벽'으로 서지 않고
 * 목록이 채워지는 방향(왼→오, 위→아래)이 보인다. 지연은 판 전체 진입(150ms) 뒤부터.
 */
const Card = styled.div`
  animation: ${cardIn} 0.32s ease-out both;
  animation-delay: calc(150ms + var(--order, 0) * 35ms);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${hairline};
  background: ${surface};
`

const Visual = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-bottom: 1px solid ${hairline};
  ${shimmer}
`

/* 사진 없는 카드의 실루엣과 같은 모양 — '여기에 초상이 온다'를 회색 판보다 분명히 */
const Silhouette = styled.svg`
  display: block;
  width: 38%;
  height: auto;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.05)'};
`

const RoleTag = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  width: 38px;
  height: 20px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'};
`

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 11px;

  @media (max-width: 640px) {
    padding: 10px 10px 11px;
  }
`

/** 글자 한 줄의 상자 — 막대를 그 줄 높이 안 가운데에 둔다 */
const Line = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  height: ${({ $height }) => $height}px;
`

const MetaRow = styled.div<{ $pushDown?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* 실제 메타 줄(12.5px 글자·14px 링) 높이 — 실측 카드 301px에 맞춘 값 */
  height: 15px;
  ${({ $pushDown }) =>
    $pushDown &&
    css`
      margin-top: auto;
      padding-top: 6px;
      height: 21px;
    `}
`

const InfluenceStub = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const RingStub = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)'};
`

const LegendStub = styled.div`
  display: flex;
  gap: 12px;
  margin-left: auto;
  flex-wrap: wrap;
`

const LegendDot = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)'};
`

/* 매트릭스 — 실제 뷰의 '130px 라벨 열 + 타임라인' 격자 */
const MatrixGrid = styled.div`
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
`

const MatrixAxisLabel = styled.div`
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-right: 1px solid ${hairline};
  border-bottom: 1px solid ${hairline};
`

const MatrixAxis = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 24px;
  border-bottom: 1px solid ${hairline};
`

const MatrixRow = styled.div`
  display: contents;
`

const MatrixLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 220px;
  padding: 0 12px;
  border-right: 1px solid ${hairline};
  border-bottom: 1px solid ${hairline};
`

const MatrixTrack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 24px 10px 0;
  border-bottom: 1px solid ${hairline};
`

const LegendRowSkeleton = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid ${hairline};
`

const GalaxyPlot = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  height: 720px;
  padding: 20px 24px 20px 0;
`

const GalaxyAxis = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 120px;
`

/* 산점도 판 — 점 하나하나를 흉내 내면 소음이라 옅은 면 하나로 '여기에 그림이 온다'만 */
const GalaxyField = styled.div`
  border-radius: 8px;
  ${shimmer}
`

const StatsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const StatsTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 26px;
  align-self: flex-start;
  height: 34px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid ${hairline};
  background: ${surface};
`

const StatsCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px 18px;
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};
`

const StatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 26px;
`

const StatsListRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
`

const StatsCharts = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
`

const ChartArea = styled.div`
  height: 220px;
  margin-top: 20px;
  border-radius: 6px;
  ${shimmer}
`
