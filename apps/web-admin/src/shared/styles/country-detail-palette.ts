/**
 * 국가 상세 위젯(행정부·지도 등)에서 인라인 스타일에 쓰는 라이트/다크 팔레트.
 * `theme.ts`의 시맨틱 색과 병행하되, 글래스/반투명 패널용 값은 여기서 통일합니다.
 */

export type CabinetsSectionPalette = {
  bg: string
  bgSubtle: string
  bgMuted: string
  border: string
  borderMid: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentBg: string
  accentBorder: string
  accentSecondaryBg: string
  accentSecondaryBorder: string
  btnBg: string
  btnHover: string
  avatarBg: string
  avatarBorder: string
  badge: string
  badgeBorder: string
  cardBg: string
  cardBgSelected: string
  cardBgHover: string
  divider: string
  inputBg: string
  inputBorder: string
  placeholderText: string
  iconColor: string
  danger: string
  dangerBg: string
  /** 작은 액션 칩(「등록」 등) */
  chipActionColor: string
  chipActionBg: string
  chipActionBorder: string
  /** 취소 버튼 등 약한 테두리 */
  borderHairline: string
  borderHairline12: string
  /** 섹션 소제목 (취임 정보 등) */
  sectionLabelTint: string
  /** 재임 기록 등 제목 */
  sectionHeading: string
  /** 조약 행 제목 */
  treatyTitleText: string
  treatyRowBg: string
  /** 참여국 칩 */
  signatoryPillBg: string
  signatoryPillText: string
  /** 조약 별칭·연도 등 고정 슬레이트 (라이트에서도 동일) */
  slate400: string
  /** 통계·타임라인 스톤 톤 부제 (라이트: stone-500~600) */
  warmCaption: string
  warmCaptionMuted: string
  warmFilterIdle: string
  warmTitle: string
  /** 카드 호버 시 테두리 강조 */
  borderEmphasis: string
  /** 타임라인 수반 직책 뱃지 — `HEAD_OF_STATE` */
  posPillHeadOfState: string
  /** 타임라인 수반 직책 뱃지 — `HEAD_OF_GOVERNMENT` */
  posPillHeadOfGovernment: string
  /** 타임라인 수반 직책 뱃지 — 그 외 직위 유형 */
  posPillDefault: string
}

let cabinetsSectionPaletteLight: CabinetsSectionPalette | undefined
let cabinetsSectionPaletteDark: CabinetsSectionPalette | undefined

/**
 * 라이트/다크별 객체를 한 번만 생성해 재사용합니다(국가 상세 등에서 빈번 호출).
 */
export function getCabinetsSectionPalette(
  isDark: boolean,
): CabinetsSectionPalette {
  if (isDark) {
    cabinetsSectionPaletteDark ??= buildCabinetsSectionPalette(true)
    return cabinetsSectionPaletteDark
  }
  cabinetsSectionPaletteLight ??= buildCabinetsSectionPalette(false)
  return cabinetsSectionPaletteLight
}

function buildCabinetsSectionPalette(isDark: boolean): CabinetsSectionPalette {
  return {
    bg: isDark ? 'rgba(18,18,28,0.6)' : '#fff',
    bgSubtle: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    bgMuted: isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#f0f2f5',
    borderMid: isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#475569' : '#94a3b8',
    accent: '#6366f1',
    accentBg: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
    accentBorder: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
    accentSecondaryBg: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
    accentSecondaryBorder: isDark ? 'rgba(99,102,241,0.4)' : '#c7d2fe',
    btnBg: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    btnHover: isDark ? 'rgba(255,255,255,0.08)' : '#f9fafb',
    avatarBg: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    avatarBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    badge: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    badgeBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    cardBgSelected: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
    cardBgHover: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    divider: isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    placeholderText: isDark ? '#475569' : '#b0bac9',
    iconColor: isDark ? '#64748b' : '#94a3b8',
    danger: '#e11d48',
    dangerBg: isDark ? 'rgba(225,29,72,0.15)' : '#fff0f3',
    chipActionColor: isDark ? '#94a3b8' : '#475569',
    chipActionBg: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    chipActionBorder: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    borderHairline: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    borderHairline12: isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0',
    sectionLabelTint: isDark ? '#cbd5e1' : '#374151',
    sectionHeading: isDark ? '#e2e8f0' : '#374151',
    treatyTitleText: isDark ? '#e2e8f0' : '#1e293b',
    treatyRowBg: isDark ? 'rgba(255,255,255,0.04)' : '#fafbff',
    signatoryPillBg: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
    signatoryPillText: isDark ? '#cbd5e1' : '#475569',
    slate400: '#94a3b8',
    warmCaption: isDark ? '#94a3b8' : '#78716c',
    warmCaptionMuted: isDark ? '#64748b' : '#a8a29e',
    warmFilterIdle: isDark ? '#94a3b8' : '#57534e',
    warmTitle: isDark ? '#f1f5f9' : '#292524',
    borderEmphasis: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db',
    posPillHeadOfState: isDark ? '#fbbf24' : '#d97706',
    posPillHeadOfGovernment: isDark ? '#a5b4fc' : '#4f46e5',
    posPillDefault: isDark ? '#94a3b8' : '#64748b',
  }
}

export type MapRegionSectionPalette = {
  bg: string
  bgSecondary: string
  bgHover: string
  bgSelected: string
  bgSelectedHover: string
  border: string
  borderMedium: string
  borderSelected: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
  primaryLight: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
  blueBadgeBg: string
  blueBadgeBorder: string
  blueBadgeText: string
  divider: string
  shadow: (alpha: string) => string
  shadowSelected: string
  shadowHover: string
  shadowNone: string
  gradientBg: string
}

export function getMapRegionSectionPalette(
  isDark: boolean,
): MapRegionSectionPalette {
  return {
    bg: isDark ? '#141414' : '#ffffff',
    bgSecondary: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
    bgHover: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    bgSelected: isDark ? 'rgba(99,106,242,0.12)' : '#eef2ff',
    bgSelectedHover: isDark ? 'rgba(99,106,242,0.16)' : '#f8fafc',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
    borderMedium: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db',
    borderSelected: isDark ? 'rgba(99,106,242,0.4)' : '#6366f1',
    text: isDark ? '#f4f4f5' : '#0f172a',
    textSecondary: isDark ? '#a1a1aa' : '#64748b',
    textMuted: isDark ? '#71717a' : '#94a3b8',
    primary: '#6366f1',
    primaryLight: isDark ? '#818cf8' : '#4f46e5',
    badgeBg: isDark ? 'rgba(99,106,242,0.15)' : '#eef2ff',
    badgeBorder: isDark ? 'rgba(99,106,242,0.3)' : '#c7d2fe',
    badgeText: isDark ? '#818cf8' : '#4f46e5',
    blueBadgeBg: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
    blueBadgeBorder: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe',
    blueBadgeText: isDark ? '#93c5fd' : '#1e40af',
    divider: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    shadow: (a: string) =>
      isDark ? `0 2px 8px rgba(0,0,0,${a})` : `0 2px 8px rgba(0,0,0,${a})`,
    shadowSelected: isDark
      ? '0 2px 8px rgba(99,102,241,0.2)'
      : '0 2px 8px rgba(99,102,241,0.12)',
    shadowHover: isDark
      ? '0 4px 14px rgba(0,0,0,0.5)'
      : '0 8px 20px rgba(0,0,0,0.06)',
    shadowNone: isDark
      ? '0 1px 3px rgba(0,0,0,0.25)'
      : '0 1px 2px rgba(0,0,0,0.04)',
    gradientBg: isDark
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  }
}

/** 국가 상세「조약 · 협정」탭 — styled-components `theme.ts`로 주입 */
export type TreatySectionPalette = {
  bg: string
  card: string
  border: string
  borderMid: string
  text: string
  textSub: string
  textMuted: string
  main: string
  mainLight: string
  mainHover: string
  danger: string
  dangerLight: string
  success: string
  successLight: string
  gold: string
  inputBg: string
  signatoryChipBorder: string
  badgeGuarantorBg: string
  badgeGuarantorText: string
  badgeMediatorBg: string
  badgeMediatorText: string
  badgeObserverBg: string
  badgeObserverText: string
  termSecretBg: string
  termSecretBorder: string
  cardHoverShadow: string
  modalShadow: string
}

export function getTreatySectionPalette(isDark: boolean): TreatySectionPalette {
  return {
    bg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    card: isDark ? 'rgba(18,18,28,0.92)' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    borderMid: isDark ? 'rgba(255,255,255,0.14)' : '#cbd5e1',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSub: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    main: '#6366f1',
    mainLight: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff',
    mainHover: '#4f46e5',
    danger: isDark ? '#fb7185' : '#ef4444',
    dangerLight: isDark ? 'rgba(225,29,72,0.12)' : '#fef2f2',
    success: '#10b981',
    successLight: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
    gold: isDark ? '#fbbf24' : '#f59e0b',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    signatoryChipBorder: isDark ? 'rgba(99,102,241,0.35)' : '#c7d2fe',
    badgeGuarantorBg: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7',
    badgeGuarantorText: isDark ? '#fbbf24' : '#92400e',
    badgeMediatorBg: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7',
    badgeMediatorText: isDark ? '#34d399' : '#065f46',
    badgeObserverBg: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    badgeObserverText: isDark ? '#94a3b8' : '#475569',
    termSecretBg: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
    termSecretBorder: isDark ? 'rgba(248,113,113,0.4)' : '#fecaca',
    cardHoverShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.45)'
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
    modalShadow: isDark
      ? '0 20px 60px rgba(0,0,0,0.55)'
      : '0 20px 60px rgba(0, 0, 0, 0.25)',
  }
}

declare module 'styled-components' {
  export interface DefaultTheme {
    /** `TreatySectionWidget`에서 `ThemeProvider`로 병합 */
    ts?: TreatySectionPalette
    /** `GovernmentInfoSection` 부처 카테고리 모달 — `ThemeProvider`로 병합 */
    gov?: CabinetsSectionPalette
  }
}
