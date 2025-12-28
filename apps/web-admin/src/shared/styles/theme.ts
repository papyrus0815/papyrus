// src/shared/theme.ts
import 'styled-components'

declare module 'styled-components' {
  export interface DefaultTheme {
    mode: 'light' | 'dark'
    colors: typeof theme.colors
    spacing: typeof theme.spacing
    borderRadius: typeof theme.borderRadius
    fontSize: typeof theme.fontSize
    fontWeight: typeof theme.fontWeight
    zIndex: typeof theme.zIndex
  }
}

const lightTheme = {
  colors: {
    button: {
      primary: '#6366f1', // 현대적인 인디고 색상
      hover: '#4f46e5', // hover 시 배경색
      disabled: '#9ca3af', // 비활성화 시 배경색
      text: '#ffffff',
    },
    header: {
      primary: 'rgba(255, 255, 255, 0.95)', // 반투명 헤더 배경
      secondary: '#f8fafc',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      quaternary: '#e2e8f0',
    },
    white: '#ffffff',
    primary: '#6366f1', // 일관된 주 색상
    secondary: '#8b5cf6', // 보조 색상
    accent: '#06b6d4', // 액센트 색상
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    active: '#6366f1',
    activeLight: '#eef2ff', // active 상태 배경색
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
    },
  },
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
}

const darkTheme = {
  colors: {
    button: {
      primary: '#7c3aed', // 다크모드에서 더 선명한 보라색
      hover: '#6d28d9',
      disabled: '#6b7280',
      text: '#ffffff',
    },
    header: {
      primary: 'rgba(0, 0, 0, 0.95)', // 진짜 검은색 헤더 배경
      secondary: '#000000',
    },
    background: {
      primary: '#000000', // 진짜 검은색
      secondary: '#0a0a0a', // 매우 어두운 검은색
      tertiary: '#1a1a1a', // 어두운 회색
      quaternary: '#2a2a2a', // 약간 밝은 어두운 회색
    },
    white: '#000000', // 다크모드에서는 검은색
    primary: '#7c3aed', // 다크모드 주 색상
    secondary: '#a855f7', // 다크모드 보조 색상
    accent: '#0ea5e9', // 다크모드 액센트 색상
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444',
    active: '#7c3aed',
    activeLight: '#1e1b4b', // 다크모드 active 배경색
    hover: '#1a1a1a', // 어두운 회색
    text: {
      primary: '#ffffff', // 흰색 텍스트
      secondary: '#e5e7eb', // 밝은 회색 텍스트
      tertiary: '#d1d5db', // 중간 밝기 회색 텍스트
    },
    border: {
      light: '#1a1a1a', // 어두운 회색
      default: '#2a2a2a', // 약간 밝은 어두운 회색
      medium: '#404040', // 중간 어두운 회색
      dark: '#6b7280', // 밝은 회색
    },
    shadow: {
      sm: 'rgba(0, 0, 0, 0.8)',
      md: 'rgba(0, 0, 0, 0.9)',
      lg: 'rgba(0, 0, 0, 0.95)',
      xl: 'rgba(0, 0, 0, 1)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      secondary: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
      accent: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    },
  },
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
}

export const theme = lightTheme
export const darkThemeConfig = darkTheme

export const getTheme = (mode: 'light' | 'dark') => {
  const baseTheme = {
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
  }

  return {
    mode,
    ...baseTheme,
    colors: mode === 'dark' ? darkTheme.colors : lightTheme.colors,
  }
}
