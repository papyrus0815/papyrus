/**
 * 인물 등록 / 역대 수반 등록 등에서 공통 사용하는 폼 필드 스타일
 */
import styled from 'styled-components'

const BORDER_COLOR = '#e5e7eb'
const FOCUS_COLOR = '#4f46e5'
const TEXT_MUTED = '#6b7280'

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 20px 0;
  }
`

export const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  padding-top: 10px;

  @media (max-width: 768px) {
    padding-top: 0;
  }
`

export const Required = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${TEXT_MUTED};
  margin-left: 4px;
`

export const FieldControl = styled.div<{ $variant?: 'person' | 'datePair' }>`
  min-width: 0;
  max-width: ${({ $variant }) =>
    $variant === 'person' ? '360px' : $variant === 'datePair' ? '480px' : '380px'};
`

export const DatePairRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  > button {
    flex: 1;
    min-width: 0;
  }
`

const triggerButtonBase = `
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
  span {
    flex: 1;
  }
  svg:last-of-type {
    flex-shrink: 0;
    opacity: 0.5;
  }
`

export const SelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonBase}
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};
`

/** 인물 선택 버튼 — 라이트/다크 테마 (register-form-layout FieldRow와 동일 맥락) */
export const PersonSelectButton = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue
      ? theme.mode === 'dark'
        ? theme.colors.text.primary
        : '#111827'
      : theme.mode === 'dark'
        ? theme.colors.text.tertiary
        : '#9ca3af'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.22)' : '#d1d5db'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#faf5ff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  svg:last-of-type {
    flex-shrink: 0;
    opacity: 0.5;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.secondary : undefined};
  }
`

/** 인물 선택 모달(PersonSelectModal) 리스트 아바타와 동일 톤 */
export const PersonAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $hasImage, theme }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const PersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-weight: 600;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DateFieldButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonBase}
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};

  > svg:first-child {
    color: #6366f1;
    flex-shrink: 0;
  }
`
