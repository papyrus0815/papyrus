/**
 * 전역 Z-Index 레이어 시스템
 *
 * 계층 구조:
 * - 0-99: Base Layer (일반 컨텐츠)
 * - 100-899: Elevated Elements (드롭다운, 툴팁 등)
 * - 900-999: Sidebar & Navigation
 * - 1000-1999: Header & Fixed Elements
 * - 2000-8999: Overlays & Dialogs
 * - 9000-9999: Modal Overlays
 * - 10000+: Modal Content & Critical UI
 */

export const Z_INDEX = {
  // Base Layer (0-99)
  BASE: 0,
  CONTENT: 1,

  // Header & Fixed Elements (100-199)
  HEADER: 100,
  STICKY_HEADER: 110,

  // Elevated Elements (200-899)
  DROPDOWN: 200,
  TOOLTIP: 300,
  ACTION_MENU: 400,

  // Sidebar & Navigation (900-999)
  SIDEBAR: 900,
  NAV: 950,

  // Overlays & Dialogs (2000-8999)
  DIALOG_OVERLAY: 2000,
  DIALOG_CONTENT: 2001,
  DRAWER_OVERLAY: 3000,
  DRAWER_CONTENT: 3001,

  // Modal Overlays (9000-9999)
  MODAL_OVERLAY: 9999,

  // Modal Content & Critical UI (10000+)
  MODAL_CONTENT: 10000,
  /** 리치텍스트 에디터 컨텍스트 메뉴·중첩 오버레이 (모달 overflow/auto 위·바깥에도 보이게) */
  RICH_TEXT_EDITOR_OVERLAY: 10100,
  TOAST: 10001,
  NOTIFICATION: 10002,
  LOADING_OVERLAY: 10003,
} as const

export type ZIndexLayer = (typeof Z_INDEX)[keyof typeof Z_INDEX]

/**
 * 전역 오버레이 스타일 상수
 *
 * 모든 모달/다이얼로그/드로어 오버레이에서 일관된 스타일 사용
 */
export const OVERLAY_STYLES = {
  // 표준 오버레이 (모달, 다이얼로그, 드로어 등)
  BACKGROUND: 'rgba(0, 0, 0, 0.5)',
  BACKDROP_FILTER: 'blur(2px)',

  // 로딩 오버레이 (더 투명)
  LOADING_BACKGROUND: 'rgba(255, 255, 255, 0.9)',
  LOADING_BACKDROP_FILTER: 'blur(12px) saturate(180%)',
} as const

/**
 * z-index CSS 변수 생성 함수
 */
export const getZIndexVar = (layer: keyof typeof Z_INDEX): string => {
  return `var(--z-${layer.toLowerCase().replace(/_/g, '-')}, ${Z_INDEX[layer]})`
}

/**
 * CSS 변수로 z-index 적용
 *
 * @example
 * styled.div`
 *   z-index: ${Z_INDEX.MODAL_OVERLAY};
 *   background: ${OVERLAY_STYLES.BACKGROUND};
 *   backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
 * `
 */
