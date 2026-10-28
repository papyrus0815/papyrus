/**
 * 진영 색 — 저장된 색이 없으면 **진영 순서대로 팔레트**를 빌려 칠한다(표시용, 저장값 불변).
 *
 * 진영 있는 사건 31건 중 25건이 색을 지정하지 않았다(색은 '진영 추가' 버튼으로 만들 때만 붙었다).
 * 그러면 두 진영 카드의 윗선이 같은 회색이고, 수치 비교 막대도 둘 다 같은 회색이라 어느 막대가 어느
 * 편인지 알 수 없었다.
 */
export const SIDE_PALETTE = ['#1d4ed8', '#b91c1c', '#047857', '#7c3aed', '#b45309'] as const

export function withSideColors<T extends { color?: string | null; sortOrder?: number | null }>(
  sides: ReadonlyArray<T>,
): Array<T & { color: string }> {
  /* 팔레트 순번은 표시 순서(sortOrder)로 — 배열 순서가 바뀌어도 같은 진영은 같은 색 */
  const order = [...sides].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
  return sides.map((side) => ({
    ...side,
    color: side.color || SIDE_PALETTE[order.indexOf(side) % SIDE_PALETTE.length],
  }))
}
