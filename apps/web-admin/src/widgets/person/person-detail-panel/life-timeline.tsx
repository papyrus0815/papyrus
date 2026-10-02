/**
 * 생애 타임라인 — 인물 머리 카드 안의 한 줄 축.
 *
 *   생애  ●━━━━━━━[재임]━━[재임]━━━━━━━━[━━━재위━━━]━━━━●
 *         1852     1870      1890      1910      1930
 *
 * 출생에서 사망(생존자는 현재)까지를 축으로, 재임·작위·재위 구간을 레인에 겹치지 않게 쌓는다.
 * 막대를 누르면 개요의 그 카드로 스크롤한다(카드 앵커 `person-record-${kind}-${id}`).
 * 배치 계산은 life-timeline.lib(테스트됨), 여기는 그리기만.
 */
import styled from 'styled-components'

import {
  type LifeRecordFamily,
  type LifeTimelineLayout,
} from './life-timeline.lib'

interface LifeTimelineProps {
  layout: LifeTimelineLayout
  /** 막대 클릭 → 해당 카드로 이동(개요 탭이 아니면 탭 전환까지 부모가 맡는다) */
  onSelect: (key: string) => void
  /**
   * '연보 전체 보기' — 이 축은 재임·재위만 보여주는 요약이다. 출생·학업·참전·가족사까지 이어진
   * 전체 흐름은 연보 탭이 정본이라, 요약에서 정본으로 가는 길을 둔다. 없으면 버튼을 그리지 않는다.
   */
  onOpenAnnals?: () => void
}

const FAMILY_LABEL: Record<LifeRecordFamily, string> = {
  office: '재임',
  noble: '작위',
  reign: '재위',
}

/** 재임 카드의 종류 색(unifiedKindColor)과 같은 계열 — 막대와 카드가 같은 색으로 짝지어진다 */
const FAMILY_COLOR: Record<LifeRecordFamily, { light: string; dark: string }> = {
  office: { light: '#6366f1', dark: '#818cf8' },
  noble: { light: '#a78bfa', dark: '#c4b5fd' },
  reign: { light: '#0d9488', dark: '#2dd4bf' },
}

const LANE_HEIGHT = 10
const LANE_GAP = 4

const formatYear = (year: number) => (year < 0 ? `기원전 ${-year}` : `${year}`)

export function LifeTimeline({
  layout,
  onSelect,
  onOpenAnnals,
}: LifeTimelineProps) {
  const families = Array.from(new Set(layout.bars.map((bar) => bar.family)))
  const trackHeight =
    layout.laneCount * LANE_HEIGHT + (layout.laneCount - 1) * LANE_GAP

  return (
    <Wrap aria-label="생애 타임라인">
      <Head>
        <Title>생애</Title>
        <Legend>
          {families.map((family) => (
            <LegendItem key={family}>
              <LegendSwatch $family={family} aria-hidden />
              {FAMILY_LABEL[family]}
            </LegendItem>
          ))}
        </Legend>
        {onOpenAnnals && (
          <AnnalsLink type="button" onClick={onOpenAnnals}>
            연보 전체 보기 →
          </AnnalsLink>
        )}
      </Head>

      <Axis>
        <Track style={{ height: trackHeight }}>
          {/* 생애 기준선 — 막대들이 그 위에 얹힌다 */}
          <Baseline />
          {layout.ticks.map((tick) => (
            <Gridline key={tick.year} style={{ left: `${tick.x * 100}%` }} aria-hidden />
          ))}
          {layout.bars.map((bar) => {
            const range = `${formatYear(bar.startYear)}–${
              bar.open ? '' : bar.endYear != null ? formatYear(bar.endYear) : ''
            }`
            const label = `${FAMILY_LABEL[bar.family]} · ${bar.title} · ${range}`
            return (
              <Bar
                key={bar.key}
                type="button"
                $family={bar.family}
                $open={bar.open}
                title={label}
                aria-label={`${label} — 카드로 이동`}
                onClick={() => onSelect(bar.key)}
                style={{
                  left: `${bar.x0 * 100}%`,
                  width: `max(6px, calc(${(bar.x1 - bar.x0) * 100}% - 2px))`,
                  top: bar.lane * (LANE_HEIGHT + LANE_GAP),
                }}
              />
            )
          })}
        </Track>

        <Ticks aria-hidden>
          {layout.ticks.map((tick) => (
            <Tick
              key={tick.year}
              style={{
                left: `${tick.x * 100}%`,
                // 양 끝 눈금은 축 밖으로 반쯤 삐져나가지 않게 안쪽으로 붙인다
                transform:
                  tick.x < 0.04 ? 'none' : tick.x > 0.96 ? 'translateX(-100%)' : undefined,
              }}
            >
              {formatYear(tick.year)}
            </Tick>
          ))}
        </Ticks>
      </Axis>
    </Wrap>
  )
}

const familyColor = (family: LifeRecordFamily) =>
  ({ theme }: { theme: { mode: string } }) =>
    theme.mode === 'dark' ? FAMILY_COLOR[family].dark : FAMILY_COLOR[family].light

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 28px 18px;
  border-top: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};

  @media (max-width: 640px) {
    padding: 14px 18px 16px;
  }
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

const Legend = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
`

const AnnalsLink = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendSwatch = styled.span<{ $family: LifeRecordFamily }>`
  width: 12px;
  height: 6px;
  border-radius: 3px;
  background: ${({ $family }) => familyColor($family)};
`

const Axis = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Track = styled.div`
  position: relative;
  min-height: ${LANE_HEIGHT}px;
`

/* 생애 전체를 잇는 옅은 띠 — 막대가 없는 구간(공백)도 '살아 있던 시간'으로 보이게 */
const Baseline = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
`

const Gridline = styled.span`
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
`

const Bar = styled.button<{ $family: LifeRecordFamily; $open: boolean }>`
  position: absolute;
  height: ${LANE_HEIGHT}px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: ${({ $family }) => familyColor($family)};
  /* 열린 끝(종료일 없음)은 오른쪽으로 옅어진다 — 끝을 모르는 구간을 단정하지 않게 */
  ${({ $open }) =>
    $open &&
    `mask-image: linear-gradient(90deg, #000 70%, transparent 100%);
     -webkit-mask-image: linear-gradient(90deg, #000 70%, transparent 100%);`}
  cursor: pointer;
  transition:
    transform 0.12s ease,
    filter 0.12s ease;

  &:hover {
    filter: brightness(1.1);
    transform: scaleY(1.3);
  }

  &:focus-visible {
    outline: 2px solid ${({ $family }) => familyColor($family)};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`

const Ticks = styled.div`
  position: relative;
  height: 14px;
`

const Tick = styled.span`
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`
