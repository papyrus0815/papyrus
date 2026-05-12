import styled from 'styled-components'
import type { ChildPerson } from './types'
import { CHILD_GAP, GP_PAIR_GAP, GP_PAIR_W, NODE_W } from './constants'
import { childCenterOffsetInPair, childPairWidth } from './utils'

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
 * ChildPair::before(수직 세그먼트)도 동일한 childCenterOffsetInPair를 쓰므로
 * 단일 헬퍼로 출처 통일.
 *
 * xMid는 자녀 중심들의 평균(=childMean)으로 둔다. main에서 ChildrenGrid + ForkTrack에
 * `transform: translateX(-childrenCenterShift)`를 함께 걸어, childMean이 GenerationBlock
 * 중심(=ego 수직 드롭 위치)에 정렬되도록 보정한다. 시프트와 xMid가 짝지어 작동해야
 * 가로 바·수직선 모두 ego와 자녀 중심에 정확히 정렬됨.
 */
export function ForkToChildren({ childList }: { childList: ChildPerson[] }) {
  const pairWidths = childList.map(childPairWidth)
  const totalW =
    pairWidths.reduce((s, w) => s + w, 0) + (childList.length - 1) * CHILD_GAP

  // 각 페어의 좌측 x (누적). pairStartX[i] + childCenterOffsetInPair(i) = 자녀 중심 절대 x
  const pairStartX: number[] = []
  let acc = 0
  for (let i = 0; i < childList.length; i++) {
    pairStartX.push(acc)
    acc += pairWidths[i] + (i < childList.length - 1 ? CHILD_GAP : 0)
  }
  const childCenterX = (i: number) =>
    pairStartX[i] + childCenterOffsetInPair(childList[i])

  const xStart = childCenterX(0)
  const xEnd = childCenterX(childList.length - 1)
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

/** N개의 후손 카드 위로 T자형 분기선 — 카드 폭 NODE_W 기준으로 정렬 */
export function ForkToCompactChildren({ count }: { count: number }) {
  const GAP = 12 // GrandchildrenRow gap
  const W = NODE_W
  const totalW = count * W + (count - 1) * GAP
  const xStart = W / 2
  const xEnd = totalW - W / 2
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
