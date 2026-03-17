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
}

const darkColors = {
  button: {
    primary: '#636af2',
    hover: '#4f57e8',
    disabled: '#48484a',
    text: '#ffffff',
  },
  header: {
    primary: 'rgba(28, 28, 30, 0.97)', // iOS 다크 네비게이션바
    secondary: '#1c1c1e',
  },
  background: {
    primary: '#1c1c1e',   // iOS 다크 메인 배경
    secondary: '#2c2c2e', // iOS 그룹화된 배경 2레벨
    tertiary: '#3a3a3c',  // iOS 그룹화된 배경 3레벨
    quaternary: '#48484a', // iOS 그룹화된 배경 4레벨
  },
  white: '#1c1c1e',
  primary: '#636af2',
  secondary: '#9f7aea',
  accent: '#32ade6',  // iOS 시스템 블루
  success: '#30d158', // iOS 시스템 그린
  warning: '#ffd60a', // iOS 시스템 옐로우
  error: '#ff453a',   // iOS 시스템 레드
  active: '#636af2',
  activeLight: '#2c2c3e',
  hover: '#2c2c2e',
  text: {
    primary: '#f5f5f7',   // iOS 라벨 (거의 흰색)
    secondary: '#98989d', // iOS 세컨더리 라벨
    tertiary: '#636366',  // iOS 터셔리 라벨
  },
  border: {
    light: '#2c2c2e',  // iOS separator
    default: '#3a3a3c',
    medium: '#48484a',
    dark: '#636366',
  },
  shadow: {
    sm: 'rgba(0, 0, 0, 0.4)',
    md: 'rgba(0, 0, 0, 0.6)',
    lg: 'rgba(0, 0, 0, 0.75)',
    xl: 'rgba(0, 0, 0, 0.9)',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #636af2 0%, #9f7aea 100%)',
    secondary: 'linear-gradient(135deg, #32ade6 0%, #3b82f6 100%)',
    accent: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)',
    blue: 'linear-gradient(135deg, #1c3a52 0%, #1e4a6e 100%)',
    pink: 'linear-gradient(135deg, #3d1a2e 0%, #5c2a44 100%)',
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
