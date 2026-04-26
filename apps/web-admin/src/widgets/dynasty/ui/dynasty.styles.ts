/**
 * 가문 페이지 공통 styled components — 라이트/다크 테마 토큰 사용.
 * 클린·모던 톤: 단일 primary 액센트, 산세리프 통일, 넉넉한 여백.
 */
import styled, { css } from 'styled-components'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

/** primary 액센트의 옅은 글로우 (포커스/hover 등) */
const primaryGlow = (mode: 'light' | 'dark') =>
  isDark(mode) ? 'rgba(99,106,242,0.22)' : 'rgba(99,102,241,0.14)'

/** 라이트 모드용 매우 옅은 primary 배경 */
const primarySoft = (mode: 'light' | 'dark') =>
  isDark(mode) ? 'rgba(99,106,242,0.12)' : 'rgba(99,102,241,0.08)'

export { primaryGlow, primarySoft }

/* ─── Layout shell ──────────────────────────────────────────────────────── */

export const SectionRoot = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};
  /* body{overflow:hidden} 환경 — 페이지가 자체 스크롤 컨테이너를 만들어야 함 */
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
`

/** 스티키 페이지 헤더 — SectionRoot 스크롤 컨테이너 상단에 고정 */
export const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) =>
    isDark(theme.mode)
      ? 'rgba(23,23,23,0.92)'
      : 'rgba(255,255,255,0.92)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const StickyHeaderInner = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 640px) {
    padding: 14px 16px 12px;
    gap: 10px;
  }
`

export const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

export const TitleCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
`

export const PageTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.2;
`

/** KPI 인라인 — 페이지 헤더에 칩처럼 들어감 */
export const KpiInlineGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-left: 18px;
  border-left: 1px solid ${({ theme }) => theme.colors.border.default};

  @media (max-width: 640px) {
    padding-left: 0;
    border-left: none;
    gap: 12px;
  }
`

export const KpiInlineItem = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export const KpiInlineLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

export const KpiInlineValue = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

/** 스크롤되는 본문 컨테이너 */
export const ScrollBody = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  padding: 24px 32px 80px;

  @media (max-width: 640px) {
    padding: 16px 16px 60px;
  }
`

/* ─── Buttons ───────────────────────────────────────────────────────────── */

export const PrimaryButton = styled.button`
  padding: 11px 22px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.button.text};
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px
    ${({ theme }) =>
      isDark(theme.mode) ? 'rgba(99,106,242,0.32)' : 'rgba(99,102,241,0.22)'};
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`

export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`

export const SubtleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

export const DangerButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) => (isDark(theme.mode) ? '#4a1d1d' : '#fecaca')};
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,69,58,0.12)' : '#fef2f2'};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      isDark(theme.mode) ? 'rgba(255,69,58,0.2)' : '#fee2e2'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.error};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`

/* ─── Form ──────────────────────────────────────────────────────────────── */

export const FormCard = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const FormToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
  gap: 16px;
`

export const FormToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

export const FormTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
`

export const FormBody = styled.div`
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const FormGroupHeader = styled.h3`
  margin: 24px 0 4px;
  padding-top: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:first-of-type {
    margin-top: 0;
    padding-top: 0;
  }
`

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
  padding: 18px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px 0;
  }
`

export const FormLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  padding-top: 10px;

  @media (max-width: 720px) {
    padding-top: 0;
  }
`

export const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.error};
  margin-left: 4px;
`

export const TextInput = styled.input`
  width: 100%;
  max-width: 440px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => primaryGlow(theme.mode)};
  }
`

export const TextArea = styled.textarea`
  width: 100%;
  max-width: 440px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  resize: vertical;
  min-height: 80px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => primaryGlow(theme.mode)};
  }
`

export const DateInput = styled.input<{ $filled: boolean }>`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 13px;
  color: ${({ $filled, theme }) =>
    $filled ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  min-width: 140px;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const FieldHelpText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FormError = styled.div`
  margin-bottom: 16px;
  padding: 12px 16px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,69,58,0.12)' : '#fee2e2'};
  border: 1px solid
    ${({ theme }) => (isDark(theme.mode) ? '#4a1d1d' : '#fecaca')};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  font-weight: 500;
`

export const ImagePreviewBox = styled.div<{ $contain?: boolean }>`
  margin-top: 4px;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  ${({ $contain }) =>
    $contain
      ? css`
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        `
      : css`
          width: 100%;
          max-width: 280px;
          aspect-ratio: 16 / 10;
        `}

  img {
    width: 100%;
    height: 100%;
    object-fit: ${({ $contain }) => ($contain ? 'contain' : 'cover')};
    ${({ $contain }) =>
      $contain &&
      css`
        max-width: 100%;
        max-height: 100%;
      `}
  }
`

/* ─── Controls bar (search + sort) ─────────────────────────────────────── */

export const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 420px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
`

export const SearchInput = styled.input`
  width: 100%;
  padding: 9px 12px 9px 36px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => primaryGlow(theme.mode)};
  }
`

export const SortSelect = styled.select`
  padding: 9px 30px 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: ${({ theme }) =>
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(
      isDark(theme.mode) ? '#a1a1aa' : '#6b7280',
    )}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`};
  background-repeat: no-repeat;
  background-position: right 10px center;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const ResultMeta = styled.div`
  margin-left: auto;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/* ─── Row list ─────────────────────────────────────────────────────────── */

export const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const StatusPanel = styled.div`
  padding: 56px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 14px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
`
