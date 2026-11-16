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
    bg: isDark ? '#0e0f12' : '#ffffff',
    bgSubtle: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    bgMuted: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    borderMid: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
    text: isDark ? '#f4f4f5' : '#18181b',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    textFaint: isDark ? '#71717a' : '#94a3b8',
    accent: isDark ? '#a5b4fc' : '#4f46e5',
    accentBg: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)',
    accentBorder: isDark ? 'rgba(165,180,252,0.38)' : 'rgba(99,102,241,0.35)',
    accentSecondaryBg: isDark ? 'rgba(165,180,252,0.16)' : 'rgba(99,102,241,0.12)',
    accentSecondaryBorder: isDark ? 'rgba(165,180,252,0.42)' : 'rgba(99,102,241,0.45)',
    btnBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    btnHover: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)',
    avatarBg: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    avatarBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    badge: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    badgeBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    cardBg: isDark ? 'rgba(255,255,255,0.025)' : '#ffffff',
    cardBgSelected: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.06)',
    cardBgHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    placeholderText: isDark ? '#71717a' : '#9ca3af',
    iconColor: isDark ? '#a1a1aa' : '#6b7280',
    danger: '#ef4444',
    dangerBg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
    chipActionColor: isDark ? '#a1a1aa' : '#52525b',
    chipActionBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    chipActionBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    borderHairline: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    borderHairline12: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
    sectionLabelTint: isDark ? '#d4d4d8' : '#3f3f46',
    sectionHeading: isDark ? '#f4f4f5' : '#18181b',
    treatyTitleText: isDark ? '#f4f4f5' : '#18181b',
    treatyRowBg: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.025)',
    signatoryPillBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    signatoryPillText: isDark ? '#d4d4d8' : '#52525b',
    slate400: isDark ? '#a1a1aa' : '#6b7280',
    warmCaption: isDark ? '#a1a1aa' : '#6b7280',
    warmCaptionMuted: isDark ? '#71717a' : '#9ca3af',
    warmFilterIdle: isDark ? '#a1a1aa' : '#52525b',
    warmTitle: isDark ? '#f4f4f5' : '#18181b',
    borderEmphasis: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)',
    posPillHeadOfState: isDark ? '#fbbf24' : '#d97706',
    posPillHeadOfGovernment: isDark ? '#a5b4fc' : '#4f46e5',
    posPillDefault: isDark ? '#a1a1aa' : '#6b7280',
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
    bg: isDark ? '#0e0f12' : '#ffffff',
    bgSecondary: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)',
    bgHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    bgSelected: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)',
    bgSelectedHover: isDark ? 'rgba(165,180,252,0.16)' : 'rgba(99,102,241,0.11)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    borderMedium: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)',
    borderSelected: isDark ? 'rgba(165,180,252,0.4)' : 'rgba(99,102,241,0.45)',
    text: isDark ? '#f4f4f5' : '#18181b',
    textSecondary: isDark ? '#a1a1aa' : '#52525b',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    primary: isDark ? '#a5b4fc' : '#4f46e5',
    primaryLight: isDark ? '#c7d2fe' : '#4338ca',
    badgeBg: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)',
    badgeBorder: isDark ? 'rgba(165,180,252,0.3)' : 'rgba(99,102,241,0.28)',
    badgeText: isDark ? '#a5b4fc' : '#4f46e5',
    blueBadgeBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    blueBadgeBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    blueBadgeText: isDark ? '#d4d4d8' : '#52525b',
    divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    shadow: () => 'none',
    shadowSelected: 'none',
    shadowHover: 'none',
    shadowNone: 'none',
    gradientBg: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)',
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
    bg: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)',
    card: isDark ? '#0e0f12' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
    borderMid: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)',
    text: isDark ? '#f4f4f5' : '#18181b',
    textSub: isDark ? '#a1a1aa' : '#52525b',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    main: isDark ? '#a5b4fc' : '#4f46e5',
    mainLight: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)',
    mainHover: isDark ? '#c7d2fe' : '#4338ca',
    danger: '#ef4444',
    dangerLight: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
    success: '#10b981',
    successLight: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
    gold: isDark ? '#fbbf24' : '#d97706',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    signatoryChipBorder: isDark ? 'rgba(165,180,252,0.35)' : 'rgba(99,102,241,0.3)',
    badgeGuarantorBg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
    badgeGuarantorText: isDark ? '#fbbf24' : '#b45309',
    badgeMediatorBg: isDark ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.1)',
    badgeMediatorText: isDark ? '#34d399' : '#047857',
    badgeObserverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
    badgeObserverText: isDark ? '#a1a1aa' : '#52525b',
    termSecretBg: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
    termSecretBorder: isDark ? 'rgba(239,68,68,0.32)' : 'rgba(239,68,68,0.25)',
    cardHoverShadow: 'none',
    modalShadow: isDark
      ? '0 20px 60px rgba(0, 0, 0, 0.55)'
      : '0 20px 60px rgba(15, 23, 42, 0.18)',
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
