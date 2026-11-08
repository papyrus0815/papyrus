/**
 * 진영 색 — 저장된 색이 없으면 **진영 순서대로 팔레트**를 빌려 칠한다(표시용, 저장값 불변).
 *
 * 진영 있는 사건 31건 중 25건이 색을 지정하지 않았다(색은 '진영 추가' 버튼으로 만들 때만 붙었다).
 * 그러면 두 진영 카드의 윗선이 같은 회색이고, 수치 비교 막대도 둘 다 같은 회색이라 어느 막대가 어느
 * 편인지 알 수 없었다.
 */
/*
 * 분야 색과 겹치지 않게 — 예전 2번 진영색 #b91c1c는 분야 '군사'와 같은 값, 5번 #b45309는 '경제'와 같은 값이었다.
 * 전쟁 사건은 히어로 진영 열(진영색)과 조망 간트(분야색)가 한 화면에 서서, 빨강이 '프랑스 측'도 되고 '군사'도 됐다.
 * 1·2번(파랑↔올리브)은 색약에서도 갈리는 축이다. 진영은 늘 이름과 함께 서므로(칩·열 머리) 3번 이후의 근접은 글자가 받는다.
 * 검증: dataviz validate_palette — 인접 정상시 ΔE 최소 21, 군사색과 2번 ΔE 26.
 */
export const SIDE_PALETTE = ['#1d4ed8', '#4d7c0f', '#be185d', '#0891b2', '#a16207'] as const

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
