/**
 * Event Editor — 풀 페이지 에디터 전용 styled tokens.
 *
 * 톤·버튼·카드 같은 공통 표현은 가급적 dynasty.styles의 컨벤션을 따른다.
 * (라이트/다크 토큰: theme.colors.background.*, .text.*, .border.*, .primary, .error)
 *
 * 본 파일은 *에디터 셸 레이아웃(좌측 sticky nav + 우측 본문)* 과
 * 섹션 카드처럼 에디터 고유 컴포지션에 필요한 토큰만 정의한다.
 */
import styled, { css, keyframes } from 'styled-components'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

/* ─── Page shell ────────────────────────────────────────────────────────── */

export const EditorRoot = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow: hidden;
`

export const EditorStickyHeader = styled.header`
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
  flex-shrink: 0;
`

export const EditorHeaderInner = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  width: 100%;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`

export const EditorHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

export const EditorBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const EditorTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const EditorMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  white-space: nowrap;
`

export const EditorHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

export const SaveStatusPill = styled.span<{ $tone?: 'idle' | 'saving' | 'saved' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};

  ${({ $tone, theme }) =>
    $tone === 'saving' &&
    css`
      color: ${theme.colors.text.secondary};
    `}
  ${({ $tone, theme }) =>
    $tone === 'saved' &&
    css`
      color: ${theme.colors.primary};
      border-color: ${isDark(theme.mode)
        ? 'rgba(99,106,242,0.4)'
        : 'rgba(99,102,241,0.32)'};
      background: ${isDark(theme.mode)
        ? 'rgba(99,106,242,0.12)'
        : 'rgba(99,102,241,0.08)'};
    `}
  ${({ $tone, theme }) =>
    $tone === 'error' &&
    css`
      color: ${theme.colors.error};
      border-color: ${isDark(theme.mode) ? '#4a1d1d' : '#fecaca'};
      background: ${isDark(theme.mode) ? 'rgba(255,69,58,0.12)' : '#fef2f2'};
    `}
`

/* ─── Body layout (sidebar + main) ─────────────────────────────────────── */

export const EditorBody = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px 1fr;
  max-width: 1480px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

export const EditorSidebar = styled.aside`
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 20px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  height: 100%;

  @media (max-width: 960px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
    height: auto;
    padding: 14px 16px;
    overflow-y: visible;
  }
`

export const EditorMain = styled.main`
  overflow-y: auto;
  height: 100%;
  scroll-behavior: smooth;

  @media (max-width: 960px) {
    height: auto;
  }
`

export const EditorMainInner = styled.div`
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 32px 96px;
  display: flex;
  flex-direction: column;
  gap: 28px;

  @media (max-width: 640px) {
    padding: 18px 16px 72px;
    gap: 22px;
  }
`

/* ─── Sidebar nav ──────────────────────────────────────────────────────── */

export const SidebarSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 10px;
`

export const SidebarNavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const SidebarNavItem = styled.button<{ $active?: boolean; $hasError?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${isDark(theme.mode)
        ? 'rgba(99,106,242,0.14)'
        : 'rgba(99,102,241,0.09)'};
      color: ${theme.colors.primary};
      font-weight: 600;
    `}

  ${({ $hasError, theme }) =>
    $hasError &&
    css`
      color: ${theme.colors.error};
    `}
`

export const SidebarNavDot = styled.span<{ $filled?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, theme }) =>
    $filled
      ? theme.colors.primary
      : theme.colors.border.medium};
`

export const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 14px 10px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

/* ─── Section card ─────────────────────────────────────────────────────── */

export const SectionAnchor = styled.section`
  scroll-margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const SectionHeader = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
`

export const SectionDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.55;
`

export const SectionCardBox = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`

/* ─── Form primitives ──────────────────────────────────────────────────── */

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
`

export const FieldRow = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols = 2 }) => `repeat(${$cols}, 1fr)`};
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.error};
  margin-left: 2px;
`

const inputBase = css`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        isDark(theme.mode)
          ? 'rgba(99,106,242,0.22)'
          : 'rgba(99,102,241,0.14)'};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;
  }
`

export const TextInput = styled.input`
  ${inputBase}
`

export const TextArea = styled.textarea`
  ${inputBase}
  min-height: 96px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.55;
`

export const NativeSelect = styled.select`
  ${inputBase}
  appearance: none;
  background-image: ${({ theme }) =>
    isDark(theme.mode)
      ? "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23a3a3a3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"
      : "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"};
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
`

export const HelpText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`

export const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error};
  font-weight: 500;
`

/* ─── Chip (keywords) ──────────────────────────────────────────────────── */

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px 5px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ChipRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 2px;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* ─── Spinner ──────────────────────────────────────────────────────────── */

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const Spinner = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid ${({ theme }) => theme.colors.border.medium};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`
