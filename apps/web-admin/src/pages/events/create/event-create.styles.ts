/**
 * EventCreatePage 스타일 컴포넌트
 */
import styled, { type DefaultTheme } from 'styled-components'

import type { HistoricalEventCategory } from './events.types'

// ============================================
// 폼 필드 max-width 설정 (여기서 한 번에 변경 가능)
// ============================================
export const FORM_FIELD_MAX_WIDTH = '680px'

// ============================================
// 메인 색상 변수 (라이트/다크 분리 — getC(theme)로 접근)
// ============================================
type ColorSet = {
  primary: {
    main: string
    light: string
    dark: string
    gradient: string
    gradientFull: string
  }
  background: {
    page: string
    content: string
    section: string
    hover: string
    input: string
  }
  border: {
    default: string
    hover: string
    focus: string
    /** 포커스 시 3px 소프트 헤일로 — theme.colors.focusRing(1px)과 두께가 달라 별도 보관 */
    focusHalo: string
    light: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  state: {
    success: string
    error: string
    warning: string
    info: string
  }
}

const LIGHT_COLORS: ColorSet = {
  primary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    gradientFull:
      'linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #7c3aed 100%)',
  },
  background: {
    page: '#f5f7fa',
    content: '#ffffff',
    section: '#fafbfc',
    hover: '#f8fafc',
    input: '#f8fafc',
  },
  border: {
    default: '#e2e8f0',
    hover: '#cbd5e1',
    focus: '#8b5cf6',
    focusHalo: 'rgba(99, 102, 241, 0.12)',
    light: '#f1f5f9',
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
  state: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
}

const DARK_COLORS: ColorSet = {
  primary: {
    main: '#a78bfa',
    light: '#c4b5fd',
    dark: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    gradientFull:
      'linear-gradient(135deg, #312e81 0%, #6366f1 50%, #a78bfa 100%)',
  },
  background: {
    page: '#0f0f0f',
    content: '#1a1a1a',
    section: '#212121',
    hover: '#2a2a2a',
    input: '#212121',
  },
  border: {
    default: '#2a2a2a',
    hover: '#3f3f46',
    focus: '#a78bfa',
    focusHalo: 'rgba(99, 106, 242, 0.20)',
    light: '#212121',
  },
  text: {
    primary: '#f5f5f5',
    secondary: '#a1a1aa',
    muted: '#71717a',
    inverse: '#0f0f0f',
  },
  state: {
    success: '#30d158',
    error: '#ff453a',
    warning: '#ffd60a',
    info: '#3b82f6',
  },
}

/**
 * 라이트/다크 색상 셋 선택 — styled-components 내부에서만 사용.
 *
 * **브랜드색(primary·focus)은 앱 테마를 단일 출처로 덮어쓴다.** 이 파일의 원래 primary는
 * `#8b5cf6`인데 그건 앱 테마의 *secondary*라, 사건 등록 폼만 앱에서 유일하게 다른 색을
 * 강조색으로 쓰고 있었다. 나머지(배경·테두리·텍스트·상태색)는 이 파일 값을 그대로 둔다.
 *
 * 카테고리별 색(`getCategoryColors`)은 분류의 정체성이라 브랜드색과 무관 — 건드리지 않는다.
 */
export const getC = (theme: DefaultTheme) => {
  const base = theme.mode === 'dark' ? DARK_COLORS : LIGHT_COLORS
  return {
    ...base,
    primary: {
      ...base.primary,
      main: theme.colors.primary,
      light: theme.colors.secondary,
      dark: theme.colors.button.hover,
      gradient: theme.colors.gradient.primary,
    },
    border: { ...base.border, focus: theme.colors.primary },
  }
}

/** 라이트/다크 분기 단축 헬퍼 */
export const pickC = (theme: DefaultTheme, light: string, dark: string) =>
  theme.mode === 'dark' ? dark : light

/** 외부에서 import 하는 정적 색상 (라이트 기준) — 하위 호환 */
export const COLORS = LIGHT_COLORS

export const getCategoryColor = (category: HistoricalEventCategory | '') => {
  type ColorKey = HistoricalEventCategory
  const colors: Record<ColorKey, {
    border: string; background: string; iconBackground: string; iconColor: string; shadow: string
  }> = {
    military: {
      border: 'rgba(239, 68, 68, 0.4)',
      background: 'rgba(239, 68, 68, 0.08)',
      iconBackground: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#b91c1c',
      shadow: 'rgba(248, 113, 113, 0.18)',
    },
    political: {
      border: 'rgba(99, 102, 241, 0.4)',
      background: 'rgba(99, 102, 241, 0.08)',
      iconBackground: 'rgba(99, 102, 241, 0.18)',
      iconColor: '#4c1d95',
      shadow: 'rgba(129, 140, 248, 0.2)',
    },
    economic: {
      border: 'rgba(245, 158, 11, 0.4)',
      background: 'rgba(245, 158, 11, 0.08)',
      iconBackground: 'rgba(245, 158, 11, 0.2)',
      iconColor: '#b45309',
      shadow: 'rgba(251, 191, 36, 0.2)',
    },
    social: {
      border: 'rgba(6, 182, 212, 0.4)',
      background: 'rgba(6, 182, 212, 0.08)',
      iconBackground: 'rgba(6, 182, 212, 0.18)',
      iconColor: '#0f766e',
      shadow: 'rgba(34, 211, 238, 0.2)',
    },
    technological: {
      border: 'rgba(14, 165, 233, 0.4)',
      background: 'rgba(14, 165, 233, 0.08)',
      iconBackground: 'rgba(14, 165, 233, 0.2)',
      iconColor: '#0369a1',
      shadow: 'rgba(14, 165, 233, 0.2)',
    },
    cultural: {
      border: 'rgba(236, 72, 153, 0.4)',
      background: 'rgba(236, 72, 153, 0.08)',
      iconBackground: 'rgba(236, 72, 153, 0.2)',
      iconColor: '#be185d',
      shadow: 'rgba(244, 114, 182, 0.2)',
    },
    diplomatic: {
      border: 'rgba(139, 92, 246, 0.4)',
      background: 'rgba(139, 92, 246, 0.08)',
      iconBackground: 'rgba(139, 92, 246, 0.2)',
      iconColor: '#6b21a8',
      shadow: 'rgba(167, 139, 250, 0.2)',
    },
    conference: {
      border: 'rgba(99, 102, 241, 0.4)',
      background: 'rgba(99, 102, 241, 0.08)',
      iconBackground: 'rgba(99, 102, 241, 0.2)',
      iconColor: '#4338ca',
      shadow: 'rgba(129, 140, 248, 0.2)',
    },
    religious: {
      border: 'rgba(251, 146, 60, 0.4)',
      background: 'rgba(251, 146, 60, 0.08)',
      iconBackground: 'rgba(251, 146, 60, 0.2)',
      iconColor: '#c2410c',
      shadow: 'rgba(253, 186, 116, 0.2)',
    },
    other: {
      border: 'rgba(107, 114, 128, 0.4)',
      background: 'rgba(107, 114, 128, 0.08)',
      iconBackground: 'rgba(107, 114, 128, 0.2)',
      iconColor: '#374151',
      shadow: 'rgba(156, 163, 175, 0.2)',
    },
  }

  if (!category || !(category in colors)) {
    return colors.other
  }

  return colors[category as ColorKey]
}

/**
 * padding-top이 0인 이유 — CSS sticky의 고정 위치는 스크롤 컨테이너의 **패딩만큼 안쪽으로**
 * 잡힌다. 여기에 padding-top: 32px가 있으면 sticky 헤더가 스크롤포트 상단(64px)이 아니라
 * 96px에 붙고, 그 32px 띠로 스크롤되는 폼 내용이 헤더 위에 비쳐 보인다.
 * 상단 여백은 ContentWrapper가 대신 갖는다(헤더보다 위에 있으므로 그냥 스크롤돼 나간다).
 */
export const PageWrapper = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding: 0 32px 32px;
  overflow-y: auto;
  background: transparent;
`

export const ContentWrapper = styled.div`
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding-top: 32px;
`

export const FormArea = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`

/**
 * 제목 + 저장/이전 버튼 줄. **sticky** — 폼 전체 높이가 1300px대라 예전엔 조금만
 * 스크롤해도 저장 버튼이 화면 밖으로 사라졌다.
 * 배경은 셸 표면(content-shell과 동일 토큰)이라야 스크롤한 필드가 비쳐 보이지 않는다.
 */
export const FormAreaHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0 18px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

/** 헤더 우측 액션 묶음 (이전 / 저장) */
export const FormAreaActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`

export const FormAreaTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

/**
 * 폼 위에 떠있는 로딩 오버레이 (편집 모드 데이터 로드, 저장 중).
 *
 * 뷰포트 고정 — 예전엔 `position: absolute; inset: 0`이라 1300px대 폼 **전체**를 기준으로
 * 중앙 정렬됐고, 아래쪽까지 스크롤한 상태에서 저장하면 스피너가 화면 밖에 그려졌다.
 * (`PageWrapper`가 `position: fixed`로 헤더 아래를 차지하므로 같은 인셋을 쓴다.)
 */
export const FormOverlay = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 15, 15, 0.72)'
      : 'rgba(255, 255, 255, 0.78)'};
  backdrop-filter: blur(2px);
  z-index: 10;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => getC(theme).text.primary};
`

export const OverlaySpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid ${({ theme }) => getC(theme).border.default};
  border-top-color: ${({ theme }) => getC(theme).primary.main};
  border-radius: 50%;
  animation: form-spinner-rotate 0.8s linear infinite;

  @keyframes form-spinner-rotate {
    to {
      transform: rotate(360deg);
    }
  }
`

export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px 0 0;
  flex: 1;
  overflow: visible;
  width: 100%;
`

// Notion 스타일 레이아웃: Label/Field 좌우 분리
export const FormRow = styled.div<{ $noBorder?: boolean; $compact?: boolean }>`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
  padding: ${(props) => (props.$compact ? '0' : '20px 0')};
  margin-top: ${(props) => (props.$compact ? '0' : '0')};
  border-bottom: ${(props) =>
    props.$noBorder ? 'none' : `1px solid ${props.theme.colors.border.light}`};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 160px 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: ${(props) => (props.$compact ? '0' : '16px 0')};
  }
`

export const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  padding-top: 9px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  @media (max-width: 768px) {
    padding-top: 0;
  }
`

export const PeriodBadge = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => getC(theme).primary.dark};
  background: ${({ theme }) =>
    pickC(theme, '#f3effe', 'rgba(167, 139, 250, 0.14)')};
  border-radius: 6px;
  padding: 3px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  span {
    color: ${({ theme }) => getC(theme).text.muted};
    font-size: 10px;
  }
`

export const DateRangeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

export const DateRangeColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const DateRangeLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  /* 그리드/플렉스 자식(카테고리 그리드 등)이 트랙을 밀어내 컨테이너를 넘는 것 방지 */
  min-width: 0;
`

// 레거시 호환용

// 필수 항목 마커. aria-label 기본 부여로 스크린리더에 "필수"가 명시됨.
// JSX 사용 시 별도 속성 없이도 accessible — 시각적 별표(*) + 청각 메시지 모두 전달.
export const Required = styled.span.attrs({
  'aria-label': '필수',
  role: 'img',
})`
  color: #ef4444;
  font-size: 14px;
`

/** 공용 Input — FormInput 컴포넌트 직접 re-export */
export { FormInput as Input, FormTextarea as Textarea } from '@/shared/ui/form-input/form-input'

export const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
`

// 확장 가능한 카테고리 카드

export const CategoryCard = styled.button<{
  $selected: boolean
  $category: HistoricalEventCategory | ''
}>`
  position: relative;
  border: 1px solid
    ${({ $selected, $category, theme }) =>
      $selected
        ? getCategoryColor($category).border
        : getC(theme).border.default};
  border-radius: 10px;
  padding: 14px;
  background: ${({ $selected, $category, theme }) =>
    $selected
      ? getCategoryColor($category).background
      : getC(theme).background.content};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;

  &:hover {
    border-color: ${({ $selected, $category, theme }) =>
      $selected ? getCategoryColor($category).border : getC(theme).border.hover};
    background: ${({ $selected, $category, theme }) =>
      $selected
        ? getCategoryColor($category).background
        : getC(theme).background.section};
  }
`

export const CategoryIcon = styled.div<{
  $category: HistoricalEventCategory | ''
  $selected?: boolean
}>`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: ${({ $selected, $category, theme }) =>
    $selected ? getCategoryColor($category).iconBackground : getC(theme).border.light};
  color: ${({ $selected, $category, theme }) =>
    $selected ? getCategoryColor($category).iconColor : getC(theme).text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
`

export const CategoryLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => getC(theme).text.secondary};
`

export const CategoryCheck = styled.div`
  position: absolute;
  top: 7px;
  right: 7px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: ${({ theme }) => getC(theme).primary.main};
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
`

// 전투 유형/양상 선택 (군사 카테고리) - 하위 상세 옵션 느낌

// InfoBox 스타일 (전투 유형 가이드용)

// 말풍선 스타일 가이드

// 기존 접을 수 있는 가이드 스타일들은 유지 (다른 곳에서 사용할 수 있음)

export const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => getC(theme).text.muted};
  line-height: 1.5;
  font-weight: 400;
`

export const DateInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => getC(theme).border.default};
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  background: ${({ theme }) => getC(theme).background.content};
  max-width: ${FORM_FIELD_MAX_WIDTH};

  &:hover {
    border-color: ${({ theme }) => getC(theme).border.hover};
  }

  &:focus-within {
    border-color: ${({ theme }) => getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => getC(theme).border.focusHalo};
  }

  svg {
    color: ${({ theme }) => getC(theme).text.muted};
    flex-shrink: 0;
  }
`

export const DateInputDisplay = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }) => getC(theme).text.primary};

  &:empty::before {
    content: '날짜를 선택하세요';
    color: ${({ theme }) => getC(theme).text.muted};
  }
`

export const ErrorMessage = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '⚠';
    font-size: 14px;
  }
`

// 플랫 모던 버튼 — primary(솔리드)/secondary(아웃라인) 동일 크기
export const ActionButton = styled.button<{
  $variant: 'primary' | 'secondary'
}>`
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? getC(theme).primary.main
      : getC(theme).background.content};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? '#ffffff' : getC(theme).text.secondary};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'primary' ? 'transparent' : getC(theme).border.default};

  &:hover:not(:disabled) {
    background: ${({ $variant, theme }) =>
      $variant === 'primary'
        ? getC(theme).primary.dark
        : getC(theme).background.hover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${({ theme }) => getC(theme).text.muted};

  svg {
    margin-bottom: 8px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
`

export const ThumbnailUploadArea = styled.div`
  border: 1px dashed ${({ theme }) => getC(theme).border.hover};
  border-radius: 10px;
  padding: 24px;
  background: ${({ theme }) => getC(theme).background.content};
  transition: border-color 0.15s ease, background 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: ${({ theme }) => getC(theme).text.muted};
  max-width: ${FORM_FIELD_MAX_WIDTH};

  &:hover {
    border-color: ${({ theme }) => getC(theme).primary.main};
    background: ${({ theme }) => getC(theme).background.section};
  }

  svg {
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => getC(theme).text.muted};
  }
`

export const ThumbnailPreview = styled.div`
  border: 1px dashed ${({ theme }) => getC(theme).border.hover};
  border-radius: 10px;
  padding: 20px;
  background: ${({ theme }) => getC(theme).background.content};
  transition: border-color 0.15s ease, background 0.15s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => getC(theme).primary.main};
    background: ${({ theme }) => getC(theme).background.section};
  }

  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

export const ThumbnailImage = styled.img``

export const ThumbnailDeleteButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`

export const UploadButton = styled.button`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => getC(theme).text.secondary};
  background: ${({ theme }) => getC(theme).background.content};
  border: 1px solid ${({ theme }) => getC(theme).border.default};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => getC(theme).background.section};
    border-color: ${({ theme }) => getC(theme).border.hover};
  }
`

// ============================================
// 내용 작성 섹션: 에디터 + 사이드바 레이아웃
// ============================================

// ============================================
// 사이드바: 사건 빠른 정보
// ============================================

// ============================================
// 사이드바: 목차 / 섹션 네비게이션
// ============================================

// ============================================
// 사이드바: 작성 통계
// ============================================

// ============================================
// 사이드바: 빠른 참조
// ============================================

// ============================================
// 기존 섹션 추가 버튼
// ============================================

// 섹션 사이에 나타나는 작은 추가 버튼

/** 공용 TextArea — FormTextarea 컴포넌트 직접 re-export (Textarea alias) */
export { FormTextarea as TextArea } from '@/shared/ui/form-input/form-input'

// 태그 관련 스타일

// 선택된 사건 리스트

// 관련 국가 스타일

export const SelectedItemsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

export const SelectedItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 12px;
  background: ${({ theme }) =>
    pickC(theme, 'rgba(99, 102, 241, 0.08)', 'rgba(167, 139, 250, 0.14)')};
  border: 1px solid
    ${({ theme }) =>
      pickC(theme, 'rgba(99, 102, 241, 0.2)', 'rgba(167, 139, 250, 0.30)')};
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => getC(theme).text.primary};
`

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${({ theme }) => getC(theme).background.content};
  color: ${({ theme }) => getC(theme).text.secondary};
  border: 1px solid ${({ theme }) => getC(theme).border.default};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => getC(theme).background.section};
    border-color: ${({ theme }) => getC(theme).border.hover};
  }
`

export const RemoveButton = styled.button`
  border: none;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px;
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
`

// 모달 스타일

// ============================================
// 🆕 하위 사건 빠른 추가 스타일
// ============================================

