/**
 * 사이드바 목록 accent 색 유틸 — 국가(대륙 색)·인물(시대 색) 공용.
 *
 * 행 좌측 strip, 그룹 헤더 dot, 아바타 대체 배지의 배경/텍스트가 같은 규칙을 쓴다.
 */

/**
 * 소형 볼드 텍스트 대비 보정 (F31) — 원색은 dot·strip·배경 틴트에 그대로 두되,
 * 배지 안 텍스트만 판독 가능한 톤(700/400 계열)으로 조정한다.
 * 라이트=흰 배경 기준 어둡게, 다크=#171717 기준 밝게.
 */
const BADGE_TEXT_LIGHT: Record<string, string> = {
  '#ef4444': '#b91c1c', // 아시아 / 중세
  '#3b82f6': '#1d4ed8', // 유럽 / 근대 19c
  '#8b5cf6': '#6d28d9', // 북아메리카 / 당대
  '#ec4899': '#be185d', // 남아메리카
  '#f59e0b': '#b45309', // 아프리카 / 고대
  '#14b8a6': '#0f766e', // 오세아니아
  '#94a3b8': '#475569', // 남극
  '#eab308': '#a16207', // 핀
  '#06b6d4': '#0e7490', // 최근
  '#92400e': '#92400e', // 과거(라이트는 이미 충분)
  '#a1a1aa': '#52525b', // fallback/미분류
  '#10b981': '#047857', // 근세
  '#6366f1': '#4338ca', // 현대 20c
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
  '#10b981': '#34d399',
  '#6366f1': '#818cf8',
}

/** 배지 텍스트용 대비 보정 색 (base 색은 dot·틴트 배경에 그대로 유지) */
export function getBadgeTextColor(baseColor: string, isDark: boolean): string {
  const map = isDark ? BADGE_TEXT_DARK : BADGE_TEXT_LIGHT
  return map[baseColor] ?? baseColor
}

/** hex color에 alpha 적용 — 아바타 대체 배지 배경(옅은 톤)에 사용 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  // #rgb → #rrggbb 정규화
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const red = hex[1]
    const green = hex[2]
    const blue = hex[3]
    return `#${red}${red}${green}${green}${blue}${blue}${clamped}`
  }
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return `${hex}${clamped}`
  }
  return hex
}
