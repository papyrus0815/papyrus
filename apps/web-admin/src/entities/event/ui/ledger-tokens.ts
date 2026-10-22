/**
 * Ledger Design Tokens — "장부" 컨셉
 *
 * 목적: 사건의 *수치*(연도·기간·건수)를 시각의 1순위로.
 * 톤: atlas/ledger — 잡지 매거진 톤이 아님. 좁은 행간·단단한 격자·강한 숫자 타이포.
 *
 * 모든 ledger 컴포넌트는 색·라인·표면을 이 파일의 토큰으로만 참조한다 (다크/라이트 일관성).
 *
 * 원래 `pages/events/ledger/styles/`에 있었다. 장부 페이지는 라우트에 연결되지 않은 채
 * 남았고, 살아 있는 사건 상세·인라인 모달이 그 죽은 페이지에서 토큰을 가져다 쓰고 있어
 * (widgets → pages 역방향 의존) 페이지를 지우고 토큰만 entities로 옮겼다.
 */
import { css } from 'styled-components'

export type Mode = 'light' | 'dark'

/*
 * 분야 색·글리프는 분야 레지스트리(entities/event/model/event-domain.ts)가 정본이다 — 예전 이 자리의
 * LEDGER_CATEGORY(한국어 이름 키)는 팔레트 네 벌 중 하나였고 레지스트리로 합쳤다.
 */

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

/**
 * 폰트 스케일 5단계.
 *
 * 이전엔 9.5 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 15 / 22 등 9가지가 무작위로
 * 흩어져 있었음 — 동일 역할인데 사이즈가 다른 사례가 다수.
 *
 *  - HEADING : 챕터 제목·통계 큰 숫자                           (15px / 800)
 *  - TITLE   : 행 제목·카드 헤더                                 (13px / 600)
 *  - BODY    : 일반 본문·설명                                    (12.5px / 500)
 *  - LABEL   : 부제·라벨·count 등 보조 텍스트                    (11.5px / 600)
 *  - META    : 칩·micro 라벨·tertiary                            (10.5px / 600)
 *
 * 매우 큰 디스플레이 숫자(연도 챕터의 22px 등)는 ChapterLabel 같이 한정된
 * 자리에서만 사용하며 별도 스케일로 두지 않음.
 */
export const FONT_SCALE = {
  HEADING: { size: 15, weight: 800 },
  TITLE: { size: 13, weight: 600 },
  BODY: { size: 12.5, weight: 500 },
  LABEL: { size: 11.5, weight: 600 },
  META: { size: 10.5, weight: 600 },
} as const

export type FontTier = keyof typeof FONT_SCALE

/** font-size + font-weight를 한 번에 적는 헬퍼 css */
export const fontTier = (tier: FontTier) => css`
  font-size: ${FONT_SCALE[tier].size}px;
  font-weight: ${FONT_SCALE[tier].weight};
`

/**
 * 모서리 반경 4단 + pill.
 *
 * FONT_SCALE이 폰트에 한 정리를 모서리에도 한다 — 사건 상세 한 지면에서만 2·3·4·5·6·7·8·
 * 10·12·999의 **10종**이 쓰이고 있었고, 3 vs 4, 7 vs 8처럼 눈으로 구별되지 않는 차이가
 * 대부분이라 값이 아니라 **역할**이 흩어진 상태였다(같은 크기의 아이콘 버튼이 파일마다
 * 5·6·8px로 갈렸다).
 *
 *  - FOCUS (2px)  : 텍스트·링크의 focus-visible 링처럼 '거의 직각'이어야 하는 자리
 *  - XS    (4px)  : 인라인 마커·작은 표지
 *  - SM    (6px)  : 버튼·입력·칩 — 손으로 누르는 것들
 *  - MD    (10px) : 카드·패널·드롭존 — 내용을 담는 면
 *  - PILL         : 완전한 알약(상태 배지 등)
 */
export const RADIUS = {
  FOCUS: '2px',
  XS: '4px',
  SM: '6px',
  MD: '10px',
  PILL: '999px',
} as const

/** 표준 transition 시간 — 모션 일관성 */
export const MOTION = {
  fast: '0.12s',
  normal: '0.18s',
  slow: '0.24s',
} as const

/** 페이지 배경 — 라이트=중성 화이트, 다크=잉크 */
export const ledgerBackground = (mode: Mode) =>
  mode === 'dark' ? '#0e0f12' : '#ffffff'

/** 잉크라인 — 1px 구분선 (가장 옅은 단계) */
export const ledgerInkLine = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'

/**
 * 강조색 — 인디고 계열. ledger 전반의 primary 액션·하이라이트.
 * 라이트=`#4f46e5`, 다크=`#a5b4fc`로 충분한 콘트라스트 보장.
 * 이전 코드 곳곳의 `#4f46e5`·`#a78bfa`·`#5b21b6` 하드코딩을 이 토큰으로 통일한다.
 */
export const ledgerAccent = (mode: Mode) =>
  mode === 'dark' ? '#a5b4fc' : '#4f46e5'

/** 강조색 hover 단계 */
export const ledgerAccentHover = (mode: Mode) =>
  mode === 'dark' ? '#c7d2fe' : '#4338ca'

/** 강조색 면(surface) — 옅은 인디고 fill */
export const ledgerAccentSubtle = (mode: Mode) =>
  mode === 'dark' ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)'

/** 강조색 border — outlined 버튼 등 */
export const ledgerAccentBorder = (mode: Mode) =>
  mode === 'dark' ? 'rgba(165,180,252,0.4)' : 'rgba(99,102,241,0.45)'

/**
 * Lens 칩 색 — kind별 hue 분리.
 * 토큰화 전엔 lens-bar.tsx에 #dc2626/#0f766e/#1e40af가 inline으로 흩뿌려져 있었다.
 */
export const LENS_KIND_COLOR = {
  /** 카테고리는 카테고리 자체 색을 따라가므로 placeholder만 둔다 */
  category: { light: '#4f46e5', dark: '#a5b4fc' },
  quality: { light: '#dc2626', dark: '#fca5a5' },
  decade: { light: '#0f766e', dark: '#5eead4' },
  century: { light: '#0f766e', dark: '#5eead4' },
  country: { light: '#1e40af', dark: '#93c5fd' },
  hcountry: { light: '#1e40af', dark: '#93c5fd' },
  default: { light: '#4f46e5', dark: '#a5b4fc' },
} as const

export type LensKindColorKey = keyof typeof LENS_KIND_COLOR

export const lensKindColor = (
  kind: LensKindColorKey | string,
  mode: Mode,
): string => {
  const entry =
    (LENS_KIND_COLOR as Record<string, (typeof LENS_KIND_COLOR)[LensKindColorKey]>)[
      kind
    ] ?? LENS_KIND_COLOR.default
  return mode === 'dark' ? entry.dark : entry.light
}

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

export const ledgerHairlineHover = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)'

/* 플랫 리스트 행 hover 워시 — 액센트 틴트가 아닌 중성(행은 nav가 아니라 내용). */
export const ledgerRowWash = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'

/* 다크 모드는 전반적으로 알파를 라이트보다 1.5~2배 두텁게 — 어두운 배경에서
 * 0.03~0.06은 시각적으로 거의 사라지므로 0.08~0.14 범위가 안정적. */
export const ledgerSubtleFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)'

export const ledgerExpandedFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.05)'

export const ledgerHoverFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(165,180,252,0.1)' : 'rgba(99,102,241,0.04)'

/** Country/keyword 등 inline chip 배경 — 다크에서 너무 옅으면 보이지 않음 */
export const ledgerChipFill = (mode: Mode) =>
  mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'

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
