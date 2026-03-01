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

/** 인물 선택 버튼 - 행정조직 폼과 동일 (아바타 48px, 호버 #faf5ff) */
export const PersonSelectButton = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    background: #faf5ff;
    color: #111827;
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  svg:last-of-type {
    flex-shrink: 0;
    opacity: 0.5;
  }
`

export const PersonAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $hasImage }) =>
    $hasImage ? 'transparent' : 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #6366f1;
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
`

export const DateFieldButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonBase}
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};

  > svg:first-child {
    color: #6366f1;
    flex-shrink: 0;
  }
`
