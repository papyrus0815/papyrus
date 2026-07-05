import styled from 'styled-components'
import {
  CHILD_GAP,
  DESCENDANT_GAP,
  GP_PAIR_GAP,
  GP_PAIR_W,
  NODE_H,
  NODE_W,
  SPOUSE_JOIN_W,
  SPOUSE_STACK_GAP,
} from './constants'
import type { ChildLayout } from './geometry'

/**
 * ForkSvg: preserveAspectRatio="none" + vectorEffect="non-scaling-stroke"
 * → SVG가 컨테이너를 꽉 채우면서 선 위치가 viewBox 비율 그대로 유지됨
 */
export const ForkSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
`

/**
 * 부모 둘 → 두 선이 위에서 내려와 합쳐진 뒤 아래로 수직 하강.
 * preserveAspectRatio="none" + vectorEffect="non-scaling-stroke" 로
 * 컨테이너 전체를 꽉 채우면서 선 두께는 유지.
 */
export function ForkFromTwoParents() {
  return (
    <ForkSvg
      viewBox="0 0 400 52"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>부모 두 분에서 이어지는 혈연선</title>
      <path
        d="M 100 0 L 100 18 M 300 0 L 300 18 M 100 18 L 300 18 M 200 18 L 200 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/**
 * ego ↔ 배우자 세로 스택 연결선(브래킷).
 *
 * 배우자가 2명 이상이면 스택 전체 세로 중앙 한 곳에만 ♥선을 그리던 기존 방식은
 * 카드 사이 gap(빈 공간)을 가리켰다. 각 배우자 카드 세로 중앙에서 세로 버스로 모은 뒤
 * 버스 중점에서 ego로 한 줄 나가는 브래킷으로 교체 — 짝수 명일 때도 선이 카드에 닿는다.
 *
 * 카드 높이는 NODE_H 고정 가정($card SpouseJoin·자녀 페어와 동일 전제).
 * side='left'면 배우자 스택이 왼쪽(x=0)·ego가 오른쪽(x=W), 'right'면 반대.
 */
export function SpouseStackJoin({
  count,
  side,
}: {
  count: number
  side: 'left' | 'right'
}) {
  const w = SPOUSE_JOIN_W
  const centers = Array.from(
    { length: Math.max(count, 1) },
    (_, i) => i * (NODE_H + SPOUSE_STACK_GAP) + NODE_H / 2,
  )
  const totalH =
    Math.max(count, 1) * NODE_H + (Math.max(count, 1) - 1) * SPOUSE_STACK_GAP
  const top = centers[0]
  const bottom = centers[centers.length - 1]
  const mid = (top + bottom) / 2
  const stackX = side === 'left' ? 0 : w
  const egoX = side === 'left' ? w : 0
  const busX = w / 2
  const segments = centers.map((y) => `M ${stackX} ${y} L ${busX} ${y}`)
  if (count > 1) segments.push(`M ${busX} ${top} L ${busX} ${bottom}`)
  segments.push(`M ${busX} ${mid} L ${egoX} ${mid}`)
  return (
    <ForkSvg
      viewBox={`0 0 ${w} ${totalH}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>배우자 관계선</title>
      <path
        d={segments.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/**
 * 부모 둘 → 아래로 수렴 (실측 폭 버전).
 *
 * ForkFromTwoParents는 부/모 컬럼이 항상 50:50이라 가정해 선을 25%/75%에 고정했지만,
 * 두 가지의 서브트리 폭이 다르면(비대칭 조상) 카드 중심이 그 위치를 벗어나 선이 어긋났다.
 * 여기서는 실측 폭(leftW·gap·rightW)으로 각 부모 카드 중심과 자식 드롭(컬럼 중앙)을 계산한다.
 * viewBox 폭 = leftW+gap+rightW = AncColumnDiv 폭(부모 둘일 때)과 일치.
 */
export function ForkFromTwoParentsMeasured({
  leftW,
  gap,
  rightW,
}: {
  leftW: number
  gap: number
  rightW: number
}) {
  const totalW = leftW + gap + rightW
  const leftC = leftW / 2
  const rightC = leftW + gap + rightW / 2
  const stem = totalW / 2 // 자식 카드 중심 (max(NODE_W,totalW)=totalW 컬럼 중앙)
  return (
    <ForkSvg
      viewBox={`0 0 ${totalW} 52`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>부모 두 분에서 이어지는 혈연선</title>
      <path
        d={`M ${leftC} 0 L ${leftC} 18 M ${rightC} 0 L ${rightC} 18 M ${leftC} 18 L ${rightC} 18 M ${stem} 18 L ${stem} 52`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/** 부모 한 명 → 수직 직선 */
export function ForkFromOneParent() {
  return (
    <ForkSvg
      viewBox="0 0 100 52"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>부모에서 이어지는 혈연선</title>
      <path
        d="M 50 0 L 50 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/**
 * 자녀 여러 명 → T자형 분기 (수직선 + 하단 가로 바).
 *
 * 가로 바 양 끝(xStart, xEnd)은 페어 중심이 아닌 **실제 자녀 카드 중심**에 맞춘다.
 * 첫/마지막 페어가 [배우자 + 자녀]일 때 페어 중심 ≠ 자녀 중심이므로, 페어 중심을 쓰면
 * 가로 바가 배우자 위까지 침범해 "배우자도 ego의 자녀"처럼 보이는 정렬 버그 발생.
 *
 * 페어 폭·자녀 오프셋은 손자녀 서브트리로 팽창한 실측값(computeChildLayouts)을 받아 쓴다.
 * ChildPair::before(수직 세그먼트)·childrenCenterShift도 같은 layouts를 소비하므로 출처 통일.
 *
 * xMid는 자녀 중심들의 평균(=childMean)으로 둔다. main에서 ChildrenGrid + ForkTrack에
 * `transform: translateX(-childrenCenterShift)`를 함께 걸어, childMean이 GenerationBlock
 * 중심(=ego 수직 드롭 위치)에 정렬되도록 보정한다. 시프트와 xMid가 짝지어 작동해야
 * 가로 바·수직선 모두 ego와 자녀 중심에 정확히 정렬됨.
 */
export function ForkToChildren({ layouts }: { layouts: ChildLayout[] }) {
  const totalW =
    layouts.reduce((acc, layout) => acc + layout.pairWidth, 0) +
    (layouts.length - 1) * CHILD_GAP

  // 각 페어의 좌측 x (누적). pairStartX[index] + childOffset = 자녀 카드 중심 절대 x
  const pairStartX: number[] = []
  let cursor = 0
  for (let index = 0; index < layouts.length; index++) {
    pairStartX.push(cursor)
    cursor += layouts[index].pairWidth + (index < layouts.length - 1 ? CHILD_GAP : 0)
  }
  const childCenterX = (index: number) => pairStartX[index] + layouts[index].childOffset

  const xStart = childCenterX(0)
  const xEnd = childCenterX(layouts.length - 1)
  const xMid = (xStart + xEnd) / 2

  return (
    <svg
      width={totalW}
      height={48}
      viewBox={`0 0 ${totalW} 48`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', color: 'inherit' }}
    >
      <title>자녀 세대로 이어지는 분기선</title>
      <path
        d={`M ${xMid} 0 L ${xMid} 30 M ${xStart} 30 L ${xEnd} 30`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * 조부모 2명 → 아래로 수렴.
 * viewBox = GP_PAIR_W(396) × 52
 * x=96(왼쪽 카드 중심), x=300(오른쪽 카드 중심), x=198(중앙 하강)
 */
export function ForkFromTwoGrandparents() {
  return (
    <ForkSvg
      viewBox={`0 0 ${GP_PAIR_W} 52`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>조부모 두 분에서 이어지는 혈연선</title>
      <path
        d={`M ${NODE_W / 2} 0 L ${NODE_W / 2} 18 M ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 0 L ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 18 M ${NODE_W / 2} 18 L ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 18 M ${GP_PAIR_W / 2} 18 L ${GP_PAIR_W / 2} 52`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/**
 * N개의 후손 페어 위로 T자형 분기선.
 *
 * 각 페어 폭은 균일한 NODE_W가 아니라 그 아래 서브트리로 팽창한 실측값(widths)이다 —
 * 균일 폭을 가정하면 손자녀가 또 자녀를 가진 페어에서 바가 좁아져 스텁이 카드를 벗어난다.
 * 세로 stem(xMid)은 컨테이너(GrandchildrenForkTrack, width:100%·center) 중앙에 서야
 * 부모 카드 중심과 이어지므로 totalW/2에 고정한다.
 */
export function ForkToCompactChildren({ widths }: { widths: number[] }) {
  const count = widths.length
  const totalW =
    widths.reduce((acc, width) => acc + width, 0) + (count - 1) * DESCENDANT_GAP
  const pairStartX: number[] = []
  let cursor = 0
  for (let index = 0; index < count; index++) {
    pairStartX.push(cursor)
    cursor += widths[index] + (index < count - 1 ? DESCENDANT_GAP : 0)
  }
  const centerX = (index: number) => pairStartX[index] + widths[index] / 2
  const xStart = centerX(0)
  const xEnd = centerX(count - 1)
  const xMid = totalW / 2
  return (
    <svg
      width={totalW}
      height={28}
      viewBox={`0 0 ${totalW} 28`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', color: 'inherit' }}
    >
      <title>손자녀 세대로 이어지는 분기선</title>
      <path
        d={`M ${xMid} 0 L ${xMid} 14 M ${xStart} 14 L ${xEnd} 14`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
