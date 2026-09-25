import { useLayoutEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  type CountryPeriodShape,
  compareByCountryStart,
  formatCountryPeriod,
  getCountryYearRange,
} from '@/shared/lib/country-period'

interface LineageNode {
  id: string
  name: string
  yearsLabel: string | null
  /** 시작 연도(부호 연도). 세기 열을 가르는 데만 쓴다 — 미상이면 null */
  startYear: number | null
}

/** 전체/경량 역사 국가 DTO 공통 — 여기서 실제로 쓰는 필드만 요구 */
type LineageSource = {
  id: string
  name?: string | null
} & CountryPeriodShape

interface CenturyColumn {
  key: string
  label: string
  nodes: LineageNode[]
}

function toNode(source: LineageSource): LineageNode {
  // era를 반영한 공용 포맷터 — BC는 '기원전', 종료 미상은 '미상'(‘현재’ 아님)
  const yearsLabel = formatCountryPeriod(source, { variant: 'short' })
  return {
    id: source.id,
    name: source.name ?? '미상',
    yearsLabel: yearsLabel || null,
    startYear: getCountryYearRange(source).start,
  }
}

/**
 * 부호 연도 → 세기 라벨. 1871 → '19세기', -753 → '기원전 8세기'.
 * (BC는 -1~-100이 기원전 1세기다 — 0년이 없으므로 AD와 같은 식으로 올림 처리)
 */
function centuryLabelOf(signedYear: number): string {
  if (signedYear < 0) {
    return `기원전 ${Math.ceil(Math.abs(signedYear) / 100)}세기`
  }
  return `${Math.ceil(signedYear / 100)}세기`
}

/** 시간순으로 정렬된 노드를 시작 세기별 열로 묶는다. 연대 미상은 맨 뒤 한 열 */
function groupByCentury(nodes: LineageNode[]): CenturyColumn[] {
  const columns: CenturyColumn[] = []
  const unknown: LineageNode[] = []
  for (const node of nodes) {
    if (node.startYear == null) {
      unknown.push(node)
      continue
    }
    const label = centuryLabelOf(node.startYear)
    const last = columns[columns.length - 1]
    if (last && last.label === label) last.nodes.push(node)
    else columns.push({ key: label, label, nodes: [node] })
  }
  if (unknown.length > 0) {
    columns.push({ key: '__unknown', label: '연대 미상', nodes: unknown })
  }
  return columns
}

export interface LineageFlowProps {
  /** 시간순 정렬 전 historical countries (전체/경량 DTO 모두 허용) */
  historicalCountries: LineageSource[]
}

/**
 * 계보 — 세기 열로 세운 가로 시간축.
 *
 * 예전엔 칩을 한 줄로 흘려 놓고 세기가 바뀌는 자리에 '|7세기' 같은 글자를 끼웠다.
 * 칩이 줄바꿈되면 축이 두 동강 나 시간이 어디서 이어지는지 안 보였고, 무엇보다
 * **같은 시대에 함께 있던 나라**(고구려·백제·신라)가 옆으로 늘어서 차례대로 이어진
 * 것처럼 읽혔다.
 *
 * 세기마다 열을 세우고 같은 세기에 시작한 나라는 **세로로 쌓는다** — 옆은 시간,
 * 위아래는 동시대다. 화살표로 잇지 않는 원칙은 그대로다(검토서 R1): 이 목록엔 직계
 * 계승뿐 아니라 병존 구성국·느슨한 고대 조상까지 섞여 있어 선형 계승을 그리면 거짓
 * 주장이 된다. 축은 '언제'만 말하고 '누가 누구를 이었다'는 말하지 않는다.
 *
 * 열이 칼럼 폭을 넘으면 가로로 넘기되 **가장 최근 쪽에서 연다** — 이 나라가 무엇에서
 * 곧바로 이어졌는지가 제일 궁금한 것이라서다(요약도 최근 쪽을 남긴다).
 */
export function LineageFlow({ historicalCountries }: LineageFlowProps) {
  // era 인지 비교기로 시간순 정렬 — BC 국가가 역순으로 이어지던 문제(F7) 해소
  const nodes = [...historicalCountries].sort(compareByCountryStart).map(toNode)
  const columns = groupByCentury(nodes)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  /* 처음 그릴 때 최근 쪽 끝으로 — 열 수가 바뀌어도(이전 N개 펼치기) 다시 맞춘다 */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = scroller.scrollWidth
  }, [columns.length])

  /* 가려진 쪽 가장자리를 흐리게 — 넘길 게 있다는 표시 */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => {
      const maxLeft = scroller.scrollWidth - scroller.clientWidth
      const next = {
        start: scroller.scrollLeft > 2,
        end: scroller.scrollLeft < maxLeft - 2,
      }
      setEdges((previous) =>
        previous.start === next.start && previous.end === next.end
          ? previous
          : next,
      )
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [columns.length])

  return (
    <Frame $fadeStart={edges.start} $fadeEnd={edges.end}>
      <Scroller ref={scrollerRef}>
        <Columns>
          {columns.map((column) => (
            <Column key={column.key}>
              <Tick>
                <TickDot aria-hidden />
                <TickLabel>{column.label}</TickLabel>
              </Tick>
              <Stack>
                {column.nodes.map((node) => (
                  <Card key={node.id}>
                    <CardName>{node.name}</CardName>
                    {node.yearsLabel && (
                      <CardYears>{node.yearsLabel}</CardYears>
                    )}
                  </Card>
                ))}
              </Stack>
            </Column>
          ))}
        </Columns>
      </Scroller>
    </Frame>
  )
}

const COLUMN_WIDTH = 148
const DOT_SIZE = 9

/** 가장자리 흐림은 틀에 씌운다 — 스크롤되는 안쪽에 씌우면 흐림도 같이 밀려간다 */
const Frame = styled.div<{ $fadeStart: boolean; $fadeEnd: boolean }>`
  position: relative;
  mask-image: linear-gradient(
    90deg,
    ${({ $fadeStart }) => ($fadeStart ? 'transparent 0, #000 40px' : '#000 0')},
    ${({ $fadeEnd }) =>
      $fadeEnd ? '#000 calc(100% - 40px), transparent 100%' : '#000 100%'}
  );
`

const Scroller = styled.div`
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
`

const Columns = styled.ol`
  position: relative;
  display: flex;
  width: max-content;
  min-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;

  /* 축 — 첫 점에서 마지막 점까지 이어지는 가로선 */
  &::before {
    content: '';
    position: absolute;
    top: ${DOT_SIZE / 2}px;
    left: ${DOT_SIZE / 2}px;
    right: 0;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const Column = styled.li`
  position: relative;
  flex: 0 0 ${COLUMN_WIDTH}px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 12px;
`

const Tick = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const TickDot = styled.span`
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 2px solid ${({ theme }) => theme.colors.text.tertiary};
  box-sizing: border-box;
`

const TickLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 같은 세기에 시작한 나라들 — 위아래는 동시대 */
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 11px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.035)'
      : 'rgba(15, 23, 42, 0.025)'};
`

const CardName = styled.span`
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const CardYears = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
