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
    iconBackground: 'rgba(99, 102, 241, 0.18)',
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
    iconBackground: 'rgba(139, 92, 246, 0.2)',
    iconColor: '#6b21a8',
    shadow: 'rgba(167, 139, 250, 0.2)',
    accent: '#8b5cf6',
    tagline: '조약, 국제 관계, 협상',
  },
  conference: {
    background: '#ffffff',
    border: 'rgba(129, 140, 248, 0.45)',
    iconBackground: 'rgba(99, 102, 241, 0.2)',
    iconColor: '#4338ca',
    shadow: 'rgba(129, 140, 248, 0.2)',
    accent: '#6366f1',
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
  political: '#a855f7',
  economic: '#0ea5e9',
  social: '#22c55e',
  technological: '#f97316',
  cultural: '#ec4899',
  diplomatic: '#8b5cf6',
  conference: '#6366f1',
  religious: '#fb923c',
  other: '#4b5563',
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
    background: 'rgba(99, 102, 241, 0.1)',
    color: '#6366f1',
  },
} as const

/**
 * 공통 색상
 */
export const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: 'rgba(99, 102, 241, 0.12)',
  secondary: '#a855f7',
  border: 'rgba(20, 19, 34, 0.08)',
  borderLight: 'rgba(99, 102, 241, 0.12)',
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
