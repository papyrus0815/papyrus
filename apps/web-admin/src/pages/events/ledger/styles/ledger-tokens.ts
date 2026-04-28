/**
 * Ledger Design Tokens — "장부" 컨셉
 *
 * 목적: 사건의 *수치*(연도·기간·건수)를 시각의 1순위로.
 * 톤: atlas/ledger — 잡지 매거진 톤이 아님. 좁은 행간·단단한 격자·강한 숫자 타이포.
 *
 * 모든 ledger 컴포넌트는 색·라인·표면을 이 파일의 토큰으로만 참조한다 (다크/라이트 일관성).
 */
import { css } from 'styled-components'

export type Mode = 'light' | 'dark'

/** 카테고리 — 시드(eventCategory.seed.ts)와 1:1 명시 매핑 (휴리스틱 안 씀) */
export const LEDGER_CATEGORY = {
  정치: { key: 'politics', color: '#5b6ee0', icon: '◆' },
  경제: { key: 'economy', color: '#a16207', icon: '$' },
  '전쟁/군사': { key: 'war', color: '#b91c1c', icon: '⚔' },
  사회: { key: 'social', color: '#0d9488', icon: '◉' },
  문화: { key: 'culture', color: '#7c3aed', icon: '✦' },
  과학기술: { key: 'tech', color: '#0369a1', icon: '⚙' },
  외교: { key: 'diplomacy', color: '#0284c7', icon: '☍' },
  '회담/조약': { key: 'treaty', color: '#1e40af', icon: '✎' },
  종교: { key: 'religion', color: '#9333ea', icon: '✚' },
  기타: { key: 'other', color: '#6b7280', icon: '·' },
} as const

export type LedgerCategoryName = keyof typeof LEDGER_CATEGORY
export type LedgerCategory = (typeof LEDGER_CATEGORY)[LedgerCategoryName]

const DEFAULT_CATEGORY: LedgerCategory = LEDGER_CATEGORY.기타

const CATEGORY_BY_NAME: Record<string, LedgerCategory> = LEDGER_CATEGORY

export const resolveCategory = (name?: string | null): LedgerCategory => {
  if (!name) return DEFAULT_CATEGORY
  return CATEGORY_BY_NAME[name] ?? DEFAULT_CATEGORY
}

/** 중요도 — 기간 막대 두께·채도 */
export type LedgerImportance = 'critical' | 'major' | 'normal' | 'minor'

export const IMPORTANCE_BAR_HEIGHT: Record<LedgerImportance, number> = {
  critical: 10,
  major: 7,
  normal: 5,
  minor: 3,
}

export const IMPORTANCE_OPACITY: Record<LedgerImportance, number> = {
  critical: 1,
  major: 0.85,
  normal: 0.65,
  minor: 0.45,
}

export const importanceFromHierarchy = (
  imp?: 'critical' | 'major' | 'notable',
  childCount = 0,
): LedgerImportance => {
  if (imp === 'critical') return 'critical'
  if (imp === 'major' || childCount > 0) return 'major'
  if (imp === 'notable') return 'normal'
  return 'minor'
}

/** Display digits — 연도·통계용 */
export const DIGIT_DISPLAY = css`
  font-family:
    'IBM Plex Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular,
    'SF Mono', Menlo, Consolas, monospace;
  font-feature-settings: 'tnum' 1, 'zero' 1;
  font-variant-numeric: tabular-nums slashed-zero;
`

/** Body — 한국어 본문 */
export const BODY_TEXT = css`
  font-family:
    -apple-system, BlinkMacSystemFont, 'Pretendard Variable', Pretendard,
    'Noto Sans KR', sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1;
`

/** 페이지 배경 — 라이트=종이결 회백, 다크=잉크 */
export const ledgerBackground = (mode: Mode) =>
  mode === 'dark' ? '#0e0f12' : '#f7f5ef'

/** 잉크라인 — 1px 구분선 (가장 옅은 단계) */
export const ledgerInkLine = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'

export const ledgerAccent = (mode: Mode) =>
  mode === 'dark' ? '#a78bfa' : '#5b21b6'

/* ── Surface 토큰 ─────────────────────────────────────────
 * UI 요소 기준이 되는 배경/테두리/구분선 모음. 모든 ledger 컴포넌트는
 * 직접 rgba/hex를 쓰지 않고 이 함수들을 거친다.
 */
export const ledgerSurface = (mode: Mode) =>
  mode === 'dark' ? 'rgba(20,20,24,0.6)' : '#ffffff'

export const ledgerSurfaceSolid = (mode: Mode) =>
  mode === 'dark' ? '#17181c' : '#ffffff'

export const ledgerOverlay = (mode: Mode) =>
  mode === 'dark' ? 'rgba(20,20,24,0.96)' : '#ffffff'

export const ledgerScrim = (mode: Mode) =>
  mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.42)'

export const ledgerHairline = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'

export const ledgerHairlineStrong = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'

export const ledgerSubtleFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'

export const ledgerExpandedFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)'

export const ledgerHoverFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)'

/** 카테고리 색에 알파를 16진 2자리로 합쳐 문자열로 — `#rrggbb` + `aa` */
export const withAlpha = (hex: string, alpha: number): string => {
  const clamped = Math.max(0, Math.min(1, alpha))
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${byte}`
}

/** 기간 (start, end) → 일수 (1일짜리 = 1) */
export const durationInDays = (start?: string | null, end?: string | null): number => {
  if (!start) return 0
  const startObj = new Date(start)
  if (Number.isNaN(startObj.getTime())) return 0
  if (!end) return 1
  const endObj = new Date(end)
  if (Number.isNaN(endObj.getTime())) return 1
  const days = Math.round((endObj.getTime() - startObj.getTime()) / 86400000) + 1
  return Math.max(days, 1)
}

/** 기간을 사람용 라벨로 — "1일" "12일" "3개월" "2년 5개월" */
export const formatDuration = (days: number): string => {
  if (days <= 1) return '1일'
  if (days < 60) return `${days}일`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}년`
  return `${years}년 ${remainingMonths}개월`
}

/** 십년대 라벨 — "1860년대" */
export const decadeOf = (year: number): number => Math.floor(year / 10) * 10
export const decadeLabel = (decade: number): string => `${decade}년대`

/** 세기 라벨 */
export const centuryOf = (year: number): number => Math.floor((year - 1) / 100) + 1
export const centuryLabel = (century: number): string => `${century}세기`
