/**
 * 인구 피라미드 막대의 순수 기하 — 리차트가 준 사각형을 좌·우 피라미드 막대로 옮긴다.
 *
 * 별도 파일인 이유: 부호 문제로 한 번 크게 틀린 자리라 테스트로 못을 박아 둔다.
 * 남성은 음수 값으로 그리는데, **리차트는 음수 막대의 width를 음수로 준다**. 이걸
 * 모르고 `x + width`를 축(0) 위치로 단정하면 축 쪽과 값 쪽이 뒤집혀 ⑴ 둥근 끝이
 * 안쪽에 붙고 ⑵ 축척(px/명)이 음수가 되어 기준 연도 눈금이 통째로 사라진다.
 */

export type PyramidSide = 'male' | 'female'

export interface BarGeometry {
  /** 축(0)이 있는 쪽 좌표 */
  zero: number
  /** 값 끝 좌표 */
  valueEnd: number
  /** 축에서 값 쪽으로 향하는 방향 (남성 -1, 여성 +1) */
  direction: number
  /** 부호 없는 픽셀 길이 */
  span: number
}

export function barGeometry(
  x: number,
  width: number,
  side: PyramidSide,
): BarGeometry {
  const left = Math.min(x, x + width)
  const right = Math.max(x, x + width)
  return {
    zero: side === 'male' ? right : left,
    valueEnd: side === 'male' ? left : right,
    direction: side === 'male' ? -1 : 1,
    span: Math.abs(width),
  }
}

/**
 * 값 끝만 둥근 막대 경로. 축 쪽 끝은 각지게 둬야 좌우 두 막대가 한 줄로 읽힌다.
 * `start`가 축 쪽, `end`가 값 끝 — 남성은 왼쪽, 여성은 오른쪽으로 뻗는다.
 */
export function barPath(
  start: number,
  end: number,
  top: number,
  height: number,
  radius: number,
) {
  const direction = end >= start ? 1 : -1
  const length = Math.abs(end - start)
  const corner = Math.max(0, Math.min(radius, length, height / 2))
  const sweep = direction > 0 ? 1 : 0
  const bottom = top + height
  const tip = end - direction * corner
  return [
    `M ${start} ${top}`,
    `L ${tip} ${top}`,
    `A ${corner} ${corner} 0 0 ${sweep} ${end} ${top + corner}`,
    `L ${end} ${bottom - corner}`,
    `A ${corner} ${corner} 0 0 ${sweep} ${tip} ${bottom}`,
    `L ${start} ${bottom}`,
    'Z',
  ].join(' ')
}

/**
 * 기준 연도 표시는 '거기까지였다'는 눈금 하나면 된다 — 윤곽 전체를 상자로 두르면
 * 아홉 칸이 겹쳐 막대보다 테두리가 더 진해진다. 값 끝의 세로선 + 축 쪽으로 접힌
 * 짧은 갈고리(⌐)만 남긴다.
 */
export function markPath(
  edge: number,
  towardAxis: number,
  top: number,
  height: number,
) {
  const serif = 5
  const bottom = top + height
  return [
    `M ${edge + towardAxis * serif} ${top}`,
    `L ${edge} ${top}`,
    `L ${edge} ${bottom}`,
    `L ${edge + towardAxis * serif} ${bottom}`,
  ].join(' ')
}

/*
 * niceAxis는 교역 규모 막대와 함께 쓰므로 공용으로 옮겼다 — 여기서는 그대로 다시
 * 내보내 이 파일을 쓰던 호출부·테스트가 그대로 돌게 둔다.
 */
export { niceAxis } from '@/shared/lib/nice-axis'

/** 0을 반드시 지나는 대칭 눈금. 자동 눈금은 0을 건너뛴 계열을 고른다. */
export function symmetricTicks(axis: { max: number; step: number }): number[] {
  const ticks: number[] = []
  for (let value = -axis.max; value <= axis.max + 1e-9; value += axis.step) {
    ticks.push(Math.round(value))
  }
  return ticks
}
