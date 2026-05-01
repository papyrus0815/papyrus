/**
 * Events Page Theme Constants
 * 이벤트 페이지 전용 테마 상수 및 색상 정의
 */
import type { HistoricalEventCategory } from '../create/events.types'

/**
 * 카테고리별 색상 테마
 */
export const CATEGORY_COLORS: Partial<
  Record<
    string,
    {
      background: string
      border: string
      iconBackground: string
      iconColor: string
      shadow: string
      accent: string
      tagline: string
    }
  >
> = {
  military: {
    background: '#ffffff',
    border: 'rgba(248, 113, 113, 0.35)',
    iconBackground: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#b91c1c',
    shadow: 'rgba(248, 113, 113, 0.18)',
    accent: '#ef4444',
    tagline: '무력 충돌, 작전, 동맹 확장 흐름',
  },
  political: {
    background: '#ffffff',
    border: 'rgba(129, 140, 248, 0.4)',
    iconBackground: 'rgba(37, 99, 235, 0.18)',
    iconColor: '#4c1d95',
    shadow: 'rgba(129, 140, 248, 0.2)',
    accent: '#6d28d9',
    tagline: '정권 교체, 협상, 체제 전환',
  },
  economic: {
    background: '#ffffff',
    border: 'rgba(251, 191, 36, 0.5)',
    iconBackground: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#b45309',
    shadow: 'rgba(251, 191, 36, 0.2)',
    accent: '#d97706',
    tagline: '금융 위기, 자원, 공급망 시프트',
  },
  social: {
    background: '#ffffff',
    border: 'rgba(34, 211, 238, 0.45)',
    iconBackground: 'rgba(6, 182, 212, 0.18)',
    iconColor: '#0f766e',
    shadow: 'rgba(34, 211, 238, 0.2)',
    accent: '#0ea5e9',
    tagline: '사회운동, 인권, 문화 충돌',
  },
  technological: {
    background: '#ffffff',
    border: 'rgba(14, 165, 233, 0.45)',
    iconBackground: 'rgba(14, 165, 233, 0.2)',
    iconColor: '#0369a1',
    shadow: 'rgba(14, 165, 233, 0.2)',
    accent: '#0284c7',
    tagline: '기술 혁신, 산업 전환, 연구 경쟁',
  },
  cultural: {
    background: '#ffffff',
    border: 'rgba(244, 114, 182, 0.45)',
    iconBackground: 'rgba(236, 72, 153, 0.2)',
    iconColor: '#be185d',
    shadow: 'rgba(244, 114, 182, 0.2)',
    accent: '#ec4899',
    tagline: '예술, 문학, 문화 유산',
  },
  diplomatic: {
    background: '#ffffff',
    border: 'rgba(167, 139, 250, 0.45)',
    iconBackground: 'rgba(37, 99, 235, 0.2)',
    iconColor: '#6b21a8',
    shadow: 'rgba(167, 139, 250, 0.2)',
    accent: '#2563eb',
    tagline: '조약, 국제 관계, 협상',
  },
  conference: {
    background: '#ffffff',
    border: 'rgba(129, 140, 248, 0.45)',
    iconBackground: 'rgba(37, 99, 235, 0.2)',
    iconColor: '#1e40af',
    shadow: 'rgba(129, 140, 248, 0.2)',
    accent: '#2563eb',
    tagline: '국제 회담, 정상회담, 협상',
  },
  religious: {
    background: '#ffffff',
    border: 'rgba(253, 186, 116, 0.45)',
    iconBackground: 'rgba(251, 146, 60, 0.2)',
    iconColor: '#c2410c',
    shadow: 'rgba(253, 186, 116, 0.2)',
    accent: '#fb923c',
    tagline: '신앙, 종교 개혁, 영적 운동',
  },
  other: {
    background: '#ffffff',
    border: 'rgba(156, 163, 175, 0.45)',
    iconBackground: 'rgba(107, 114, 128, 0.2)',
    iconColor: '#374151',
    shadow: 'rgba(156, 163, 175, 0.2)',
    accent: '#6b7280',
    tagline: '분류되지 않은 기타 사건',
  },
}

/**
 * 카테고리별 배지 색상 (리스트용)
 */
export const CATEGORY_BADGE_COLORS: Record<HistoricalEventCategory, string> = {
  military: '#db2777',
  political: '#2563eb',
  economic: '#0ea5e9',
  social: '#22c55e',
  technological: '#f97316',
  cultural: '#ec4899',
  diplomatic: '#2563eb',
  conference: '#2563eb',
  religious: '#fb923c',
  other: '#4b5563',
}

/**
 * 카테고리별 soft chip 토큰 — 단색 배지 대신 *tinted* 배경 + 진한 텍스트.
 *   rgb: 베이스 색의 R,G,B 만 (alpha를 styled에서 동적으로) — bg 0.10/0.16, border 0.22/0.32
 *   text/textDark: 라이트/다크 모드별 가독성 확보된 텍스트 색
 *   spark: sparkbar 그라데이션 끝 색 — accent에서 한 톤 옅은 변형
 */
export const CATEGORY_SOFT_COLORS: Record<
  HistoricalEventCategory,
  { rgb: string; text: string; textDark: string; sparkEnd: string }
> = {
  military: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  political: { rgb: '37, 99, 235', text: '#1d4ed8', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  economic: { rgb: '14, 165, 233', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  social: { rgb: '34, 197, 94', text: '#15803d', textDark: '#86efac', sparkEnd: '#4ade80' },
  technological: { rgb: '249, 115, 22', text: '#c2410c', textDark: '#fdba74', sparkEnd: '#fb923c' },
  cultural: { rgb: '236, 72, 153', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  diplomatic: { rgb: '37, 99, 235', text: '#1d4ed8', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  conference: { rgb: '37, 99, 235', text: '#1d4ed8', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  religious: { rgb: '251, 146, 60', text: '#c2410c', textDark: '#fdba74', sparkEnd: '#fb923c' },
  other: { rgb: '75, 85, 99', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
}

/**
 * 중요도 색상
 */
export const IMPORTANCE_COLORS = {
  critical: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#dc2626',
  },
  major: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#d97706',
  },
  notable: {
    background: 'rgba(37, 99, 235, 0.1)',
    color: '#2563eb',
  },
} as const

/**
 * Brand tokens — events 페이지 도구 톤(차분한 단색 indigo).
 *
 * 사용 규칙:
 *   - hover/active alpha의 *비율*은 고정 — 높이려면 모든 토큰을 같이 올림
 *   - 다크모드 분기는 토큰 선택만 다르게 (alpha 비율은 동일)
 *   - !매직 헥스 / rgba(37,99,235,*) 직접 사용 금지 — 모두 BRAND.* 경유
 */
export const BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.06)',
  primarySoftHover: 'rgba(37, 99, 235, 0.12)',
  primaryFill: 'rgba(37, 99, 235, 0.16)',
  primaryBorder: 'rgba(37, 99, 235, 0.3)',
  primaryBorderHover: 'rgba(37, 99, 235, 0.5)',
  /** 키보드 focus halo — 모든 컨트롤 동일하게 사용 */
  focusRing: '0 0 0 2px rgba(37, 99, 235, 0.18)',
  /** dark mode alt */
  primaryTextOnDark: '#93c5fd',
  primarySoftDark: 'rgba(37, 99, 235, 0.14)',
  primaryFillDark: 'rgba(37, 99, 235, 0.22)',
} as const

export const DANGER = {
  base: '#ef4444',
  hover: '#dc2626',
  soft: 'rgba(239, 68, 68, 0.06)',
  fill: 'rgba(239, 68, 68, 0.12)',
  border: 'rgba(239, 68, 68, 0.3)',
  borderHover: 'rgba(239, 68, 68, 0.45)',
} as const

/** 모션 — prefers-reduced-motion에서는 transition 무력화 */
export const MOTION = {
  fast: '0.15s ease',
  base: '0.18s ease',
  drawer: '0.24s cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const

/**
 * 아이콘 사이즈 — 카테고리화. 자유롭게 size={number} 박지 말 것.
 *   xs(11): chip 내부 ✕ 등
 *   sm(13): toolbar 보조 액션 / clear
 *   base(14): 일반 toolbar 버튼
 *   md(16): 검색바 / primary CTA
 *   lg(18): drawer/modal close
 */
export const ICON_SIZE = {
  xs: 11,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
} as const

/**
 * Elevation 토큰 — 평면 톤 어드민 정책. 일반 카드는 sm 이하만 사용.
 * lg 이상은 모달/드로어 같은 floating에만.
 */
export const SHADOW = {
  none: 'none',
  /** 1dp 정도의 hairline 음영 — 카드 base */
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
  /** hover 시 약간의 lift 대안 — 평면 톤에서는 거의 안 씀 */
  sm: '0 2px 6px rgba(15, 23, 42, 0.06)',
  /** dropdown / popover */
  md: '0 6px 16px rgba(15, 23, 42, 0.08)',
  /** drawer 슬라이드 */
  drawer: '-12px 0 32px rgba(15, 17, 29, 0.18)',
  /** modal float */
  modal: '0 20px 60px rgba(15, 23, 42, 0.18)',
  /** 다크 모드 — solid 검정 톤. 알파 비율 동일 */
  xsDark: '0 1px 2px rgba(0, 0, 0, 0.3)',
  smDark: '0 2px 6px rgba(0, 0, 0, 0.35)',
  mdDark: '0 6px 16px rgba(0, 0, 0, 0.4)',
  drawerDark: '-12px 0 32px rgba(0, 0, 0, 0.55)',
  modalDark: '0 20px 60px rgba(0, 0, 0, 0.55)',
} as const

/**
 * 타이포 스케일 — 페이지 안에서 4단 위계.
 *   page(19): 페이지 헤더 1번
 *   section(15): 모달/패널 헤더
 *   card(13): 카드 타이틀, toolbar 버튼
 *   micro(11): 메타·chip·뱃지
 */
export const TYPE_SCALE = {
  page: '19px',
  section: '15px',
  card: '13px',
  micro: '11px',
} as const

/**
 * 표면 색 — PageScene/Drawer/Card 등 surface elevation.
 *   base: PageScene 외곽 (가장 어둡거나 밝음)
 *   raised: drawer/sidebar — base보다 한 톤 위
 *   card: 일반 카드 — raised보다 한 톤 위
 */
export const SURFACE = {
  baseDark: '#0f0f0f',
  raisedDark: '#171717',
  cardDark: 'rgba(255, 255, 255, 0.04)',
  baseLight: '#ffffff',
  raisedLight: '#ffffff',
  cardLight: '#ffffff',
} as const

/**
 * 공통 색상
 */
export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: 'rgba(37, 99, 235, 0.12)',
  secondary: '#2563eb',
  border: 'rgba(20, 19, 34, 0.08)',
  borderLight: 'rgba(37, 99, 235, 0.12)',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
  },
  background: {
    white: '#ffffff',
    light: '#f8fafc',
    lighter: '#fafbff',
    gradient: 'linear-gradient(180deg, #fafbff, #ffffff)',
  },
} as const

/**
 * 애니메이션 키프레임
 */
export const KEYFRAMES = {
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
} as const

/**
 * 반응형 브레이크포인트
 */
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
  wide: '1600px',
} as const

/**
 * Z-인덱스
 */
export const Z_INDEX = {
  dropdown: 100,
  modal: 1000,
  modalOverlay: 1000,
  modalContent: 1001,
  tooltip: 2000,
} as const
