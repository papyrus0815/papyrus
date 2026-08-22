/**
 * 대륙별 컬러 매핑 — 사이드바 행 좌측 strip + 그룹 헤더 dot에 사용.
 *
 * 백엔드의 ContinentOption엔 색이 없어 한국어 이름 기반으로 hardcoded.
 * 새 대륙 추가 시 fallback(회색)으로 잡힘.
 */

const NAME_COLOR_MAP: Record<string, string> = {
  아시아: '#ef4444', // 빨강
  유럽: '#3b82f6', // 파랑
  북아메리카: '#8b5cf6', // 보라
  '북아메리카 ': '#8b5cf6',
  남아메리카: '#ec4899', // 핑크
  아프리카: '#f59e0b', // 주황
  오세아니아: '#14b8a6', // 청록
  남극: '#94a3b8', // 회색-블루
  // 영문 폴백
  Asia: '#ef4444',
  Europe: '#3b82f6',
  'North America': '#8b5cf6',
  'South America': '#ec4899',
  Africa: '#f59e0b',
  Oceania: '#14b8a6',
  Antarctica: '#94a3b8',
}

/** quick-access/특수 그룹 ID에 대한 별도 색 */
const SPECIAL_GROUP_COLORS: Record<string, string> = {
  __pinned__: '#eab308', // 노랑(★ 핀)
  __recent__: '#06b6d4', // 시아노(🕒 최근)
  __historical__: '#92400e', // 갈색(과거 국가)
  __unknown__: '#a1a1aa', // 회색
}

const FALLBACK_COLOR = '#a1a1aa'

// 배지 텍스트 대비 보정·alpha 적용은 인물 목록과 공유 — 정의 원본은 shared/ui/sidebar-list.
export { getBadgeTextColor, withAlpha } from '@/shared/ui/sidebar-list'

export function getContinentColor(opts: {
  continentId?: string | null
  continentName?: string | null
}): string {
  const { continentId, continentName } = opts
  if (continentId && SPECIAL_GROUP_COLORS[continentId]) {
    return SPECIAL_GROUP_COLORS[continentId]
  }
  if (continentName && NAME_COLOR_MAP[continentName]) {
    return NAME_COLOR_MAP[continentName]
  }
  return FALLBACK_COLOR
}

/**
 * 대륙 표시 순서 — 사용자 지정.
 * 매핑되지 않은 대륙은 가장 뒤(999).
 */
const NAME_ORDER: Record<string, number> = {
  유럽: 0,
  Europe: 0,
  아시아: 1,
  Asia: 1,
  북아메리카: 2,
  '북아메리카 ': 2,
  'North America': 2,
  남아메리카: 3,
  'South America': 3,
  아프리카: 4,
  Africa: 4,
  오세아니아: 5,
  Oceania: 5,
  남극: 6,
  Antarctica: 6,
}

/** 대륙 표시 순서 가져오기 (정렬용). 미정 대륙은 999. */
export function getContinentOrder(name?: string | null): number {
  if (!name) return 999
  return NAME_ORDER[name] ?? 999
}
