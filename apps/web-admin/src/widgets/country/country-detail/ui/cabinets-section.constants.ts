/** 행정부(내각) UI 액센트 — `cabinets-section` 전용 */
export const CABINET_SECTION_MAIN = '#6366f1'
export const CABINET_SECTION_MAIN_HOVER = '#4f46e5'

/**
 * 수반(행정부 수반) 직위 선택 시 포함할 관직 유형
 * 역대 수반·전역 수반 등록과 동일 (국가원수·정부수반·섭정·왕세자·왕족/귀족 직함)
 */
export const HEAD_POSITION_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  'REGENT',
  'HEIR_APPARENT',
  'ROYAL_NOBLE_TITLE',
])

/**
 * 각료 등록 시 선택 가능한 직위 타입 (수반·의원 등 제외).
 * DEPUTY_HEAD_OF_STATE(부통령)는 스키마 정의부터 "행정부 각료로 cabinetId에 소속"이라
 * 각료 집합에 포함한다 — 재임 패널의 MINISTER_POSITION_TYPES와 같은 규약.
 */
export const MINISTER_POSITION_TYPES = new Set([
  'DEPUTY_HEAD_OF_STATE',
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'OTHER',
])

/** 인포그래픽 타임라인 — 칼럼 좌우 패딩·리스트 좌측 inset (`cabinets-section.styled`와 위젯 공용) */
export const TL_COL_PAD_X = 4
export const TL_LIST_PAD_LEFT = 112

/** 타임라인 행·썸네일·노드 — 위젯·`cabinets-section-timeline` 공용 */
export const TL_ROW_H = 556
/** 한 줄(4칸) 행정부 행과 다음 행 사이 세로 간격 */
export const TL_ROW_GAP = 96
export const TL_BUBBLE_W = 84
/** 수반 원형 사진 — 행 높이와 비율 맞춤 (`176 * 1.1` 반올림) */
export const TL_THUMB = 212
/** `TlItemRoot` 썸네일–텍스트 간격 — 가로 타임라인이 텍스트 열까지 넘지 않을 때 사용 */
export const TL_ITEM_THUMB_TEXT_GAP = 14
export const TL_GRID_GAP_X = 18
/** 썸네일·연도 버블 ↔ 노드·가로선 사이 세로 여백 */
export const TL_NODE_EDGE_PAD = 52
/** 노드 위·아래 짧은 수직 연결선 높이 */
export const TL_VERT_SEG_H = 28
/** 홀수 열(`colIdx` 홀수, 썸네일 아래 · `!itemOnTop`) 연도·축 `translateY`(px) */
export const TL_YEAR_NUDGE_Y_ODD_COL = 0
/** 짝수 열(`colIdx` 짝수, 썸네일 위 · `itemOnTop`) 연도·축 `translateY`(px) */
export const TL_YEAR_NUDGE_Y_EVEN_COL = 0
export const TL_YEAR_BUBBLE_SHIFT_X = 28

/** 화면상 맨 왼쪽 열 행정부만 추가로 우측 이동(행 전체·가로선 간격은 그대로) */
export const TL_FIRST_COL_EXTRA_SHIFT_X = 48

/** `TlItem` 군주 배지 — 타임라인 컴포넌트와 공용 */
export const TL_MONARCH_BADGE_VISUAL = 52
export const TL_MONARCH_HIT_MIN = 64

export const TL_ROWS = [
  { line: '#6366f1', textColor: '#3730a3' },
  { line: '#f59e0b', textColor: '#78350f' },
  { line: '#10b981', textColor: '#065f46' },
  { line: '#e11d48', textColor: '#881337' },
] as const

/** 소속(현대·역사 국가)별 타임라인 강조색 — 4색 순환만 쓰면 서로 다른 국가가 같은 색으로 겹치기 쉬움 */
export const TL_TERRITORY_PALETTE = [
  { line: '#6366f1', textColor: '#3730a3' },
  { line: '#f59e0b', textColor: '#78350f' },
  { line: '#10b981', textColor: '#065f46' },
  { line: '#e11d48', textColor: '#881337' },
  { line: '#0ea5e9', textColor: '#0c4a6e' },
  { line: '#8b5cf6', textColor: '#4c1d95' },
  { line: '#65a30d', textColor: '#365314' },
  { line: '#c026d3', textColor: '#86198f' },
  { line: '#0d9488', textColor: '#134e4a' },
  { line: '#ea580c', textColor: '#7c2d12' },
  { line: '#2563eb', textColor: '#1e3a8a' },
  { line: '#db2777', textColor: '#831843' },
] as const

/** 타임라인 직책 뱃지 테두리·글자색 — 직위 정의 id 또는 직함 문자열 해시로 순환 (직책마다 고정 색) */
export const TL_POSITION_BADGE_LINE_HEXES: readonly string[] =
  TL_TERRITORY_PALETTE.map((p) => p.line)

/** 행정부–정당 연결 역할 (`CabinetPartyRole`) */
export const CABINET_PARTY_ROLE_OPTIONS = [
  { value: 'LEADING', label: '집권·주도' },
  { value: 'COALITION_PARTNER', label: '연정' },
  { value: 'SUPPORTING_MINOR', label: '소수 여당·지지' },
  { value: 'OTHER', label: '기타' },
] as const
