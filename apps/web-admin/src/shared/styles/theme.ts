// src/shared/theme.ts
import 'styled-components'

// spacing/borderRadius/fontSize/fontWeight/zIndex 공통 정의 (라이트/다크 동일)
const BASE_THEME = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    overlay: 1100,
  },
} as const

const lightColors = {
  button: {
    primary: '#6366f1',
    hover: '#4f46e5',
    disabled: '#9ca3af',
    text: '#ffffff',
  },
  header: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: '#f8fafc',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    quaternary: '#e2e8f0',
  },
  white: '#ffffff',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  active: '#6366f1',
  activeLight: '#eef2ff',
  hover: '#f1f5f9',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
  },
  border: {
    light: '#f3f4f6',
    default: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
  shadow: {
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.1)',
    lg: 'rgba(0, 0, 0, 0.15)',
    xl: 'rgba(0, 0, 0, 0.2)',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    secondary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    accent: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    blue: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)',
    pink: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
  },
  // 상태 알림 — 톤다운 (좌측 라인 위주, 배경 거의 없음)
  alert: {
    warning: {
      bg: 'transparent',
      fg: '#b45309',
      border: '#fbbf24',
    },
    danger: {
      bg: 'transparent',
      fg: '#dc2626',
      border: '#fca5a5',
    },
    info: {
      bg: 'transparent',
      fg: '#475569',
      border: '#cbd5e1',
    },
    success: {
      bg: 'transparent',
      fg: '#15803d',
      border: '#86efac',
    },
  },
  // 인풋 focus — 1px ring (halo 제거, Linear 스타일)
  focusRing: {
    primary: '0 0 0 1px #6366f1',
    danger: '0 0 0 1px #dc2626',
  },
}

const darkColors = {
  button: {
    primary: '#636af2',
    hover: '#4f57e8',
    disabled: '#333333',
    text: '#ffffff',
  },
  header: {
    primary: 'rgba(23, 23, 23, 0.97)',
    secondary: '#171717',
  },
  background: {
    primary: '#171717', // 메인 배경
    secondary: '#212121', // 2레벨
    tertiary: '#2a2a2a', // 3레벨
    quaternary: '#333333', // 4레벨
  },
  white: '#171717',
  primary: '#636af2',
  secondary: '#9f7aea',
  accent: '#32ade6',
  success: '#30d158',
  warning: '#ffd60a',
  error: '#ff453a',
  active: '#636af2',
  activeLight: '#1e1e3a',
  hover: '#212121',
  text: {
    primary: '#f5f5f5',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
  },
  border: {
    light: '#212121',
    default: '#2a2a2a',
    medium: '#333333',
    dark: '#3f3f46',
  },
  shadow: {
    // 다크모드 그림자 톤다운 — 기존 0.45/0.65/0.8/0.92는 너무 진해서 평면적
    sm: 'rgba(0, 0, 0, 0.25)',
    md: 'rgba(0, 0, 0, 0.35)',
    lg: 'rgba(0, 0, 0, 0.45)',
    xl: 'rgba(0, 0, 0, 0.55)',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #636af2 0%, #9f7aea 100%)',
    secondary: 'linear-gradient(135deg, #32ade6 0%, #3b82f6 100%)',
    accent: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)',
    blue: 'linear-gradient(135deg, #1a2744 0%, #1e3460 100%)',
    pink: 'linear-gradient(135deg, #3a1628 0%, #561f3c 100%)',
  },
  // 다크모드 상태 알림 — 톤다운
  alert: {
    warning: {
      bg: 'transparent',
      fg: '#fbbf24',
      border: 'rgba(250,204,21,0.4)',
    },
    danger: {
      bg: 'transparent',
      fg: '#f87171',
      border: 'rgba(248,113,113,0.4)',
    },
    info: {
      bg: 'transparent',
      fg: '#94a3b8',
      border: 'rgba(255,255,255,0.15)',
    },
    success: {
      bg: 'transparent',
      fg: '#4ade80',
      border: 'rgba(74,222,128,0.4)',
    },
  },
  focusRing: {
    primary: '0 0 0 1px #818cf8',
    danger: '0 0 0 1px #f87171',
  },
}

declare module 'styled-components' {
  export interface DefaultTheme {
    mode: 'light' | 'dark'
    colors: typeof lightColors
    spacing: typeof BASE_THEME.spacing
    borderRadius: typeof BASE_THEME.borderRadius
    fontSize: typeof BASE_THEME.fontSize
    fontWeight: typeof BASE_THEME.fontWeight
    zIndex: typeof BASE_THEME.zIndex
  }
}

const lightTheme = { ...BASE_THEME, colors: lightColors }
const darkTheme = { ...BASE_THEME, colors: darkColors }

export const theme = lightTheme
export const darkThemeConfig = darkTheme

export const getTheme = (mode: 'light' | 'dark') => ({
  mode,
  ...BASE_THEME,
  colors: mode === 'dark' ? darkColors : lightColors,
})
