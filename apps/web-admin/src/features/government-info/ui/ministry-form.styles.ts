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
  max-width: 880px;
  width: 96vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
export const MinistryFormModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  max-height: min(82vh, 780px);
  overflow-y: auto;
  padding: 20px 26px 28px;
`

/** 중앙부처 등록 폼 행 (170px 레이블 컬럼, FieldRow 기반) */
export const FormFieldRow = styled(FieldRow)`
  grid-template-columns: 170px 1fr;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
export const FormSelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 100%;
  padding: 11px 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 11px;
  font-size: 13.5px;
  color: ${(props) =>
    props.$hasValue
      ? props.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111827'
      : props.theme.mode === 'dark'
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
  max-width: 100%;
  box-sizing: border-box;
  padding: 11px 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 11px;
  font-size: 13.5px;
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
  max-width: 100%;
  box-sizing: border-box;
  padding: 11px 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 11px;
  font-size: 13.5px;
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
