/**
 * 인포그래픽 레이아웃 상수.
 * 카드/간격/세대 깊이 등 시각·구조에 영향을 주는 모든 px 값을 한 곳에서 관리.
 * ForkFromTwoGrandparents 등 SVG viewBox 계산에 직접 쓰이므로 변경 시 fork 모듈의 좌표도 확인 필요.
 */
export const NODE_W = 192
export const NODE_H = 232
export const GP_PAIR_GAP = 12
export const GP_PAIR_W = 2 * NODE_W + GP_PAIR_GAP // 396
/**
 * ChildrenGrid의 ChildPair 사이 간격(px).
 * SpouseJoin(♥) 폭(52px)과 함께 페어 그룹핑을 결정 — 페어 외부 간격이 페어 내부 ♥보다
 * 시각적으로 명확히 더 넓어야 "이 둘은 한 쌍, 옆은 별개 자녀"가 읽힘.
 */
export const CHILD_GAP = 40
export const SPOUSE_JOIN_W = 52 // SpouseJoin flex-basis (px)
export const FT_MAX_DEPTH = 4 // 가계도 최대 표시 세대 (1=부모, 2=조부모, 3=증조부모, 4=고조부모)

/** BFS scope → 사용자 노출용 한국어 라벨 (truncation 배너에 사용) */
export const TRUNCATION_SCOPE_LABEL: Record<string, string> = {
  'children': '자녀',
  'spouse-children': '배우자의 자녀',
  'siblings': '형제자매',
  'aunts-uncles': '삼촌·이모·고모',
  'nephews': '조카',
  'grand-aunts-uncles': '종조부·종조모',
  'great-grand-aunts-uncles': '고조부의 형제',
  'grandchildren': '손자녀',
  'great-grandchildren': '증손자녀',
  'all-spouses': '배우자 일괄',
  'spouse-parents': '처가·시가 부모',
  'spouse-parent-spouses': '처가·시가 부부쌍',
}
