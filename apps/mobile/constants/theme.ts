import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/**
 * 라이트 토큰 — Papyrus 슬레이트 톤 + saffron 액센트.
 * brand는 historical/scholarly 톤의 saffron(amber-700). 텍스트 ink와 분리.
 * CTA, FAB, 활성 chip, progress bar, 그라데이션 등에 사용.
 */
export const LightTokens = {
  brand: {
    primary: '#b45309',          // saffron-700 — 따뜻한 호박색 액센트
    primaryActive: '#92400e',    // saffron-800 — pressed
    primaryDisabled: '#fde68a',  // amber-200 — disabled
    onPrimary: '#ffffff',        // saffron 위 흰 글자 (contrast 5.5:1, AA)
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    soft: '#94a3b8',
    inverse: '#ffffff',
    accent: '#0f172a',
    danger: '#ef4444',
  },
  surface: {
    canvas: '#f8fafc',
    raised: '#ffffff',
    pressed: '#f1f5f9',
    highlight: '#fef3c7',
    highlightBorder: '#fde68a',
    scrim: 'rgba(0,0,0,0.4)',
  },
  border: {
    subtle: '#e2e8f0',
    soft: '#f1f5f9',
  },
  state: {
    positive: { bg: '#dcfce7', fg: '#166534' },
    negative: { bg: '#fee2e2', fg: '#991b1b' },
    neutral: { bg: '#e2e8f0', fg: '#334155' },
    info: { bg: '#dbeafe', fg: '#1e40af' },
    warning: { bg: '#fef3c7', fg: '#92400e' },
  },
  accent: {
    purple: '#7c3aed',
    purpleSoft: '#ede9fe',
    orange: '#ea580c',
    pink: '#ec4899',
    green: '#16a34a',
    red: '#dc2626',
    blue: '#0369a1',
    amber: '#ca8a04',
  },
  timeline: {
    'ego-birth': '#16a34a',
    'ego-death': '#dc2626',
    marriage: '#ec4899',
    reign: '#ca8a04',
    tenure: '#0369a1',
    'life-event': '#7c3aed',
    'event-participation': '#a855f7',
    'family-birth': '#86efac',
    'family-death': '#fca5a5',
  },
};

export type TokenSet = typeof LightTokens;

/** 다크 토큰 */
export const DarkTokens: TokenSet = {
  brand: {
    primary: '#f59e0b',          // amber-500 — 다크 배경에 따뜻한 saffron
    primaryActive: '#d97706',    // amber-600 — pressed
    primaryDisabled: '#78350f',  // amber-900
    onPrimary: '#1c1917',        // stone-900 — saffron 위 어두운 글자 (contrast 9:1)
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    // canvas(#0f172a) 대비 contrast 상향: 기존 muted/soft가 라이트 값 그대로라 대비 부족했음
    muted: '#cbd5e1',
    soft: '#94a3b8',
    inverse: '#0f172a',
    accent: '#f1f5f9',
    danger: '#f87171',
  },
  surface: {
    canvas: '#0f172a',
    raised: '#1e293b',
    pressed: '#334155',
    highlight: '#422006',
    highlightBorder: '#854d0e',
    scrim: 'rgba(0,0,0,0.6)',
  },
  border: {
    subtle: '#334155',
    soft: '#1e293b',
  },
  state: {
    positive: { bg: '#14532d', fg: '#86efac' },
    negative: { bg: '#7f1d1d', fg: '#fecaca' },
    neutral: { bg: '#334155', fg: '#cbd5e1' },
    info: { bg: '#1e3a8a', fg: '#bfdbfe' },
    warning: { bg: '#451a03', fg: '#fde68a' },
  },
  accent: {
    purple: '#a78bfa',
    purpleSoft: '#3b1d63',
    orange: '#fb923c',
    pink: '#f472b6',
    green: '#4ade80',
    red: '#f87171',
    blue: '#60a5fa',
    amber: '#facc15',
  },
  timeline: {
    'ego-birth': '#4ade80',
    'ego-death': '#f87171',
    marriage: '#f472b6',
    reign: '#facc15',
    tenure: '#60a5fa',
    'life-event': '#a78bfa',
    'event-participation': '#c4b5fd',
    'family-birth': '#86efac',
    'family-death': '#fca5a5',
  },
};

/**
 * 정적 import용 — 라이트 색상 고정. 기존 코드 호환성.
 * 다크모드 대응 컴포넌트는 useTokens() 훅 사용.
 */
export const Tokens = LightTokens;

/** 현재 컬러 스킴에 맞는 토큰 반환. dark/light 자동 분기 */
export function useTokens(): TokenSet {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkTokens : LightTokens;
}

/** 라운드 스케일. 버튼·입력은 sm(8), 카드는 md(14), 검색바·아이콘 버튼은 full(pill). */
export const Radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 32,
  full: 9999,
} as const;
export type RadiusToken = keyof typeof Radius;

/** 스페이싱 스케일 — 4px 베이스 + 2px micro. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
} as const;
export type SpacingToken = keyof typeof Spacing;

/**
 * 단일 elevation — 카드, 검색바, 드롭다운에 사용.
 * iOS 네이티브 톤에 맞춰 옅게. 진한 그림자는 "Material 웹" 느낌이라 의도적으로 톤다운.
 */
export const Elevation: { card: ViewStyle } = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
};

/** Pretendard 폰트 패밀리 — `_layout.tsx`에서 useFonts로 로드. 한글·라틴 모두 커버. */
export const FontFamily = {
  regular: 'Pretendard_400Regular',
  medium: 'Pretendard_500Medium',
  semibold: 'Pretendard_600SemiBold',
  bold: 'Pretendard_700Bold',
} as const;

/**
 * 타이포 스케일.
 * lineHeight: 한글 가독성을 위해 본문은 ~1.5–1.6배.
 * 섹션 라벨은 sectionLabel 단일 토큰으로 통일 (uppercase + tracking).
 */
export const Type: Record<string, TextStyle> = {
  displayXl: { fontFamily: FontFamily.bold,     fontSize: 28, lineHeight: 36, letterSpacing: -0.2 },
  displayLg: { fontFamily: FontFamily.semibold, fontSize: 22, lineHeight: 30, letterSpacing: -0.2 },
  displayMd: { fontFamily: FontFamily.bold,     fontSize: 21, lineHeight: 28 },
  displaySm: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.1 },
  titleMd:   { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  titleSm:   { fontFamily: FontFamily.medium,   fontSize: 16, lineHeight: 22 },
  bodyMd:    { fontFamily: FontFamily.regular,  fontSize: 16, lineHeight: 26 },
  bodySm:    { fontFamily: FontFamily.regular,  fontSize: 14, lineHeight: 22 },
  caption:   { fontFamily: FontFamily.medium,   fontSize: 14, lineHeight: 20 },
  captionSm: { fontFamily: FontFamily.regular,  fontSize: 13, lineHeight: 18 },
  badge:     { fontFamily: FontFamily.semibold, fontSize: 11, lineHeight: 14 },
  /** 섹션 헤더 (대문자/eyebrow) — detail-section, kpi label 등 통합 */
  sectionLabel: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  microLabel:{ fontFamily: FontFamily.bold,     fontSize: 12, lineHeight: 16 },
  buttonMd:  { fontFamily: FontFamily.medium,   fontSize: 16, lineHeight: 20 },
  buttonSm:  { fontFamily: FontFamily.medium,   fontSize: 14, lineHeight: 18 },
  link:      { fontFamily: FontFamily.regular,  fontSize: 14, lineHeight: 20 },
  navLink:   { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 20 },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
