/** 행정부(내각) UI 액센트 — `cabinets-section` 전용 */
export const CABINET_SECTION_MAIN = '#6366f1'
export const CABINET_SECTION_MAIN_HOVER = '#4f46e5'

/** 수반 재임 등록 시 HEAD 계열 */
export const HEAD_POSITION_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
])

/** 각료 등록 시 선택 가능한 직위 타입 (수반·의원 등 제외) */
export const MINISTER_POSITION_TYPES = new Set([
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/** 인포그래픽 타임라인 — 칼럼 좌우 패딩·리스트 좌측 inset (`cabinets-section.styled`와 위젯 공용) */
export const TL_COL_PAD_X = 4
export const TL_LIST_PAD_LEFT = 100

/** 타임라인 행·썸네일·노드 — 위젯·`cabinets-section-timeline` 공용 */
export const TL_ROW_H = 400
export const TL_BUBBLE_W = 84
export const TL_THUMB = 144
export const TL_GRID_GAP_X = 12
export const TL_NODE_EDGE_PAD = 28
export const TL_VERT_SEG_H = 14
export const TL_YEAR_BUBBLE_SHIFT_X = 28
export const TL_NODE_CENTER_X = TL_COL_PAD_X + TL_THUMB / 2

export const TL_ROWS = [
  { line: '#6366f1', textColor: '#3730a3' },
  { line: '#f59e0b', textColor: '#78350f' },
  { line: '#10b981', textColor: '#065f46' },
  { line: '#e11d48', textColor: '#881337' },
] as const
