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

/**
 * IsoBadge ISO 텍스트 대비 보정 (F31) — 원색은 소형 볼드 텍스트로 AA(4.5:1) 미달이라
 * dot·strip·배경 틴트는 base를 유지하되 텍스트만 판독 가능한 톤(700/400 계열)으로 조정한다.
 * 라이트=흰 배경 기준 어둡게, 다크=#171717 기준 밝게.
 */
const BADGE_TEXT_LIGHT: Record<string, string> = {
  '#ef4444': '#b91c1c', // 아시아
  '#3b82f6': '#1d4ed8', // 유럽
  '#8b5cf6': '#6d28d9', // 북아메리카
  '#ec4899': '#be185d', // 남아메리카
  '#f59e0b': '#b45309', // 아프리카
  '#14b8a6': '#0f766e', // 오세아니아
  '#94a3b8': '#475569', // 남극
  '#eab308': '#a16207', // 핀
  '#06b6d4': '#0e7490', // 최근
  '#92400e': '#92400e', // 과거(라이트는 이미 충분)
  '#a1a1aa': '#52525b', // fallback/미분류
}
const BADGE_TEXT_DARK: Record<string, string> = {
  '#ef4444': '#f87171',
  '#3b82f6': '#60a5fa',
  '#8b5cf6': '#a78bfa',
  '#ec4899': '#f472b6',
  '#f59e0b': '#fbbf24',
  '#14b8a6': '#2dd4bf',
  '#94a3b8': '#cbd5e1',
  '#eab308': '#facc15',
  '#06b6d4': '#22d3ee',
  '#92400e': '#d97706', // 과거 다크는 밝힘
  '#a1a1aa': '#d4d4d8',
}

/** 배지 ISO 텍스트용 대비 보정 색 (base 색은 dot·틴트 배경에 그대로 유지) */
export function getBadgeTextColor(baseColor: string, isDark: boolean): string {
  const map = isDark ? BADGE_TEXT_DARK : BADGE_TEXT_LIGHT
  return map[baseColor] ?? baseColor
}

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

/** hex color에 alpha 적용 — IsoBadge 배경(옅은 톤)에 사용 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  // #rgb → #rrggbb 정규화
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}${a}`
  }
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return `${hex}${a}`
  }
  return hex
}
