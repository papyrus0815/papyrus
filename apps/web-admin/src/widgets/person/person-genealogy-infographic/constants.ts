/**
 * 인포그래픽 레이아웃 상수.
 * 카드/간격/세대 깊이 등 시각·구조에 영향을 주는 모든 px 값을 한 곳에서 관리.
 * ForkFromTwoGrandparents 등 SVG viewBox 계산에 직접 쓰이므로 변경 시 fork 모듈의 좌표도 확인 필요.
 */
export const NODE_W = 192
export const NODE_H = 232
export const GP_PAIR_GAP = 12
/**
 * 조상(AncestorColumn) 재귀에서 부/모 두 컬럼 사이 gap(px).
 * 실측 폭 기반 레이아웃·ForkFromTwoParentsMeasured 좌표가 같은 값을 써야 커넥터가 어긋나지 않는다.
 */
export const ANC_PARENTS_GAP = GP_PAIR_GAP
export const GP_PAIR_W = 2 * NODE_W + GP_PAIR_GAP // 396
/**
 * ChildrenGrid의 ChildPair 사이 간격(px).
 * SpouseJoin(♥) 폭(52px)과 함께 페어 그룹핑을 결정 — 페어 외부 간격이 페어 내부 ♥보다
 * 시각적으로 명확히 더 넓어야 "이 둘은 한 쌍, 옆은 별개 자녀"가 읽힘.
 */
export const CHILD_GAP = 40
export const SPOUSE_JOIN_W = 52 // SpouseJoin flex-basis (px)
export const SPOUSE_JOIN_MARGIN = 2 // SpouseJoin 좌우 margin (px) — SpouseJoin styled와 동기화
/**
 * SpouseJoin이 flex row에서 실제 점유하는 폭(flex-basis + 좌우 margin).
 * 자녀 페어 폭·자녀 중심 오프셋 계산은 반드시 이 값을 써야 함 — flex-basis(52)만 쓰면
 * margin 4px이 누락돼 배우자 동반 페어마다 fork 끝점이 조금씩 어긋난다.
 */
export const SPOUSE_JOIN_SPAN = SPOUSE_JOIN_W + SPOUSE_JOIN_MARGIN * 2 // 56
/** ego 배우자 세로 스택(SpouseStack)의 카드 간 gap(px) — 다중 배우자 브래킷 join 계산과 동기화 */
export const SPOUSE_STACK_GAP = 8
/** DescendantSubtree(손자녀+) 행의 카드 간 gap(px) — descendant-subtree.tsx GrandchildrenRow gap과 동기화 */
export const DESCENDANT_GAP = 12
export const FT_MAX_DEPTH = 4 // 가계도 최대 표시 세대 (1=부모, 2=조부모, 3=증조부모, 4=고조부모)
/**
 * 하향(후손) 서브트리 최대 렌더 깊이 (1=손자녀, 2=증손자녀, 3=고손자녀).
 * 렌더(DescendantSubtree 호출)·폭 계산(geometry.childColumnWidth)·회귀 테스트가
 * 반드시 같은 값을 써야 fork·스텁·shift가 어긋나지 않으므로 단일 출처로 둔다.
 */
export const DESCENDANT_MAX_DEPTH = 3

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
  'sibling-other-parents': '형제의 다른 쪽 부모',
}
