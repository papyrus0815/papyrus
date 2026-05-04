import { Platform } from 'react-native';

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

export const Tokens = {
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    soft: '#94a3b8',
    inverse: '#fff',
    accent: '#0f172a',
    danger: '#ef4444',
  },
  surface: {
    canvas: '#f8fafc',
    raised: '#fff',
    pressed: '#f1f5f9',
    highlight: '#fef3c7',
    highlightBorder: '#fde68a',
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
