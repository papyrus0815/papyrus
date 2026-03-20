/**
 * 역대 수반 기본정보/업적 폼과 인물 등록 폼 공용 레이아웃 스타일
 * - FormCardWrapper, FormHeader, 탭(TabNavigation/TabButton), FormRows, FieldRow 등
 * - 두 폼이 동일한 디자인을 쓰도록 공용으로 분리
 */
import styled from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'
import { PillTabButton, PillTabNav } from '@/shared/ui/tab/tab.styles'

export const BORDER_COLOR = '#e5e7eb'
export const FOCUS_COLOR = '#4f46e5'
export const TEXT_PRIMARY = '#0f172a'
export const TEXT_SECONDARY = '#64748b'
export const TEXT_MUTED = '#6b7280'

export const FormCardWrapper = styled.div`
  ${({ theme }) => glassOrSolidMixin(theme)}
  border-radius: 20px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)'
      : '0 1px 3px rgba(0, 0, 0, 0.04)'};
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
`

export const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`

export const FormHeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  flex: 1;
  min-width: 0;
  @media (max-width: 640px) {
    width: 100%;
    order: -1;
    margin-bottom: 8px;
  }
`

export const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
  order: 0;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    svg {
      transform: translateX(-2px);
    }
  }
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
`

export const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** @alias PillTabNav — 폼 레이아웃용 탭 컨테이너 */
export const TabNavigation = PillTabNav

/** @alias PillTabButton — 폼 레이아웃용 탭 버튼 */
export const TabButton = PillTabButton

export const FormSectionInner = styled.div`
  padding: 28px 0px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 20px 0;
  }
`

export const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  padding-top: 10px;
  @media (max-width: 768px) {
    padding-top: 0;
  }
`

export const FieldControl = styled.div<{ $variant?: 'person' | 'datePair' }>`
  min-width: 0;
  max-width: ${(p) =>
    p.$variant === 'person'
      ? '360px'
      : p.$variant === 'datePair'
        ? '480px'
        : '360px'};
`

export const DateFieldsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 480px;
  & > button {
    max-width: 100%;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const DateFieldBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 380px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: ${FOCUS_COLOR};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#faf5ff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  span {
    flex: 1;
  }
  > svg:first-child {
    color: ${FOCUS_COLOR};
    flex-shrink: 0;
  }
  > svg:last-child {
    color: ${({ theme }) => theme.colors.text.secondary};
    flex-shrink: 0;
  }
`

export const FieldHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`

export const Required = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: #dc2626;
  vertical-align: 0.2em;
  font-size: 0;
  color: transparent;
  overflow: hidden;
  text-indent: -999px;
`

/** 공용 Input — FormInput 컴포넌트 직접 re-export */
export { FormInput as Input } from '@/shared/ui/form-input/form-input'

export const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
    user-select: none;
  }
`

// ---------------------------------------------------------------------------
// 공용 폼 필드 컴포넌트 — 현대국가/역사국가/인물/사건 폼에서 공통 사용
// ---------------------------------------------------------------------------

/** 공용 Textarea — FormTextarea 컴포넌트 직접 re-export */
export { FormTextarea as Textarea } from '@/shared/ui/form-input/form-input'

/** 선택 버튼 (값 선택 트리거) */
export const SelectBtn = styled.button<{
  $hasValue?: boolean
  $error?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid
    ${({ $error, theme }) => ($error ? '#ea4335' : theme.colors.border.default)};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex-shrink: 0;
    opacity: 0.6;
  }
  &:hover {
    border-color: ${({ $error, theme }) =>
      $error ? '#ea4335' : theme.colors.border.medium};
    svg {
      opacity: 1;
    }
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

/** 에러 메시지 */
export const ErrorMessage = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ea4335;
`

/** 썸네일 원형 업로드 영역 */
export const ThumbnailCircle = styled.label<{ $hasImage?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ $hasImage, theme }) =>
    $hasImage
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#fff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'};
  border: 2px ${({ $hasImage }) => ($hasImage ? 'solid' : 'dashed')}
    ${({ $hasImage, theme }) =>
      $hasImage
        ? theme.colors.border.default
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : '#cbd5e1'};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 36px;
    height: 36px;
  }
  &:hover {
    border-color: ${FOCUS_COLOR};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.1)'
        : 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)'};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }
`

/** 썸네일 힌트 텍스트 */
export const ThumbnailHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`
