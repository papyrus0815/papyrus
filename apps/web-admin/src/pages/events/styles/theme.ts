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
  // accent = LEDGER_CATEGORY hue, iconColor = 그 hue의 진한 shade, border/iconBackground/
  // shadow = 그 hue의 rgba tint. 카테고리 요약 카드도 목록·타임라인과 같은 색 체계로 통일.
  military: {
    background: '#ffffff',
    border: 'rgba(185, 28, 28, 0.35)',
    iconBackground: 'rgba(185, 28, 28, 0.15)',
    iconColor: '#991b1b',
    shadow: 'rgba(185, 28, 28, 0.18)',
    accent: '#b91c1c',
    tagline: '무력 충돌, 작전, 동맹 확장 흐름',
  },
  political: {
    background: '#ffffff',
    border: 'rgba(109, 40, 217, 0.35)',
    iconBackground: 'rgba(109, 40, 217, 0.15)',
    iconColor: '#5b21b6',
    shadow: 'rgba(109, 40, 217, 0.18)',
    accent: '#6d28d9',
    tagline: '정권 교체, 협상, 체제 전환',
  },
  economic: {
    background: '#ffffff',
    border: 'rgba(180, 83, 9, 0.35)',
    iconBackground: 'rgba(180, 83, 9, 0.15)',
    iconColor: '#9a3412',
    shadow: 'rgba(180, 83, 9, 0.18)',
    accent: '#b45309',
    tagline: '금융 위기, 자원, 공급망 시프트',
  },
  social: {
    background: '#ffffff',
    border: 'rgba(13, 148, 136, 0.35)',
    iconBackground: 'rgba(13, 148, 136, 0.15)',
    iconColor: '#0f766e',
    shadow: 'rgba(13, 148, 136, 0.18)',
    accent: '#0d9488',
    tagline: '사회운동, 인권, 문화 충돌',
  },
  technological: {
    background: '#ffffff',
    border: 'rgba(14, 116, 144, 0.35)',
    iconBackground: 'rgba(14, 116, 144, 0.15)',
    iconColor: '#155e75',
    shadow: 'rgba(14, 116, 144, 0.18)',
    accent: '#0e7490',
    tagline: '기술 혁신, 산업 전환, 연구 경쟁',
  },
  cultural: {
    background: '#ffffff',
    border: 'rgba(219, 39, 119, 0.35)',
    iconBackground: 'rgba(219, 39, 119, 0.15)',
    iconColor: '#be185d',
    shadow: 'rgba(219, 39, 119, 0.18)',
    accent: '#db2777',
    tagline: '예술, 문학, 문화 유산',
  },
  diplomatic: {
    background: '#ffffff',
    border: 'rgba(14, 165, 233, 0.35)',
    iconBackground: 'rgba(14, 165, 233, 0.15)',
    iconColor: '#0369a1',
    shadow: 'rgba(14, 165, 233, 0.18)',
    accent: '#0ea5e9',
    tagline: '조약, 국제 관계, 협상',
  },
  conference: {
    background: '#ffffff',
    border: 'rgba(30, 58, 138, 0.35)',
    iconBackground: 'rgba(30, 58, 138, 0.15)',
    iconColor: '#1e3a8a',
    shadow: 'rgba(30, 58, 138, 0.18)',
    accent: '#1e3a8a',
    tagline: '국제 회담, 정상회담, 협상',
  },
  religious: {
    background: '#ffffff',
    border: 'rgba(161, 98, 7, 0.35)',
    iconBackground: 'rgba(161, 98, 7, 0.15)',
    iconColor: '#854d0e',
    shadow: 'rgba(161, 98, 7, 0.18)',
    accent: '#a16207',
    tagline: '신앙, 종교 개혁, 영적 운동',
  },
  other: {
    background: '#ffffff',
    border: 'rgba(107, 114, 128, 0.35)',
    iconBackground: 'rgba(107, 114, 128, 0.15)',
    iconColor: '#374151',
    shadow: 'rgba(107, 114, 128, 0.18)',
    accent: '#6b7280',
    tagline: '분류되지 않은 기타 사건',
  },
}

/**
 * 카테고리별 배지 색상 (리스트용)
 *
 * NOTE: 영문 슬러그(`'political'` 등)와 한글 이름(`'정치'` 등)을 둘 다 키로
 * 등록한다. 실제 데이터는 EventCategory의 한글 `name`이지만, 과거 코드 일부가
 * 영문 슬러그를 가정하고 작성되어 있어 두 형태 모두 매칭되도록 alias 처리.
 */
export const CATEGORY_BADGE_COLORS: Record<HistoricalEventCategory, string> = {
  // LEDGER_CATEGORY(ledger-tokens.ts)와 동일 hue로 통일 — 목록·격자·갤러리·대시보드·
  // 타임라인이 같은 카테고리에 같은 색을 쓰게 해 뷰 전환 시 색 점프를 없앤다.
  // 10색 모두 뚜렷(이전엔 정치·외교·회담이 전부 #2563eb 파랑으로 구별 불가).
  military: '#b91c1c',
  political: '#6d28d9',
  economic: '#b45309',
  social: '#0d9488',
  technological: '#0e7490',
  cultural: '#db2777',
  diplomatic: '#0ea5e9',
  conference: '#1e3a8a',
  religious: '#a16207',
  other: '#6b7280',
  // 한글 alias — DB EventCategory.name과 직접 매칭
  '전쟁/군사': '#b91c1c',
  정치: '#6d28d9',
  경제: '#b45309',
  사회: '#0d9488',
  과학기술: '#0e7490',
  문화: '#db2777',
  외교: '#0ea5e9',
  '회담/조약': '#1e3a8a',
  종교: '#a16207',
  기타: '#6b7280',
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
  // rgb = LEDGER hue(칩 배경 tint용), text/textDark = 그 hue의 AA 대비 shade(라이트/다크).
  military: { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  political: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  economic: { rgb: '180, 83, 9', text: '#9a3412', textDark: '#fdba74', sparkEnd: '#fb923c' },
  social: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  technological: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  cultural: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  diplomatic: { rgb: '14, 165, 233', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  conference: { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  religious: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
  other: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
  // 한글 alias
  '전쟁/군사': { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  정치: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  경제: { rgb: '180, 83, 9', text: '#9a3412', textDark: '#fdba74', sparkEnd: '#fb923c' },
  사회: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  과학기술: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  문화: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  외교: { rgb: '14, 165, 233', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  '회담/조약': { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  종교: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
  기타: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
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
  /** 키보드 focus halo — 모든 컨트롤 동일하게 사용. 3px·알파 상향으로 WCAG 가시성↑ */
  focusRing: '0 0 0 3px rgba(37, 99, 235, 0.32)',
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
