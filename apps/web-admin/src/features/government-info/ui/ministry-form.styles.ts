import styled from 'styled-components'

import {
  FieldRow,
  FieldLabel,
} from '@/shared/ui/register-form-layout'
import {
  ModalBody,
  ModalBox,
} from '@/shared/ui/modal/modal.styles'

export { FieldLabel }

/** 중앙부처 등록·수정 모달 */
export const MinistryFormModalBox = styled(ModalBox)`
  max-width: 720px;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
export const MinistryFormModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  max-height: min(78vh, 720px);
  overflow-y: auto;
  padding: 20px 24px 28px;
`

/** 중앙부처 등록 폼 행 (200px 레이블 컬럼, FieldRow 기반) */
export const FormFieldRow = styled(FieldRow)`
  grid-template-columns: 200px 1fr;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
export const FormSelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111827'
      : p.theme.mode === 'dark'
        ? '#64748b'
        : '#9ca3af'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fafafa'};
  }
`
export const FormTextareaField = styled.textarea`
  width: 100%;
  max-width: 440px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  resize: vertical;
  min-height: 72px;
  outline: none;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#6366f1'};
  }
`
export const FormInputField = styled.input`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.15s,
    background 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#6366f1'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  }
`
