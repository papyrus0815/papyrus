/**
 * map-region 폼 모달용 공용 필드.
 * 다른 도메인 폼들과 톤을 맞추기 위해 styled-components의 theme 토큰을 사용.
 */
import styled, { css } from 'styled-components'

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

export const FieldFull = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.02em;

  &::after {
    content: '';
  }
`

export const Required = styled.span`
  color: #ef4444;
  margin-left: 2px;
`

const inputBase = css`
  padding: 9px 12px;
  font-size: 13px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const Input = styled.input`
  ${inputBase}
`

export const Select = styled.select`
  ${inputBase}
  cursor: pointer;
  /* 네이티브 select가 다크모드에서 흰 배경으로 고정되는 것 방지 —
     닫힌 컨트롤·OS 드롭다운 톤을 테마에 맞춘다 (전역 color-scheme만으론 부족). */
  color-scheme: ${({ theme }) => (theme.mode === 'dark' ? 'dark' : 'light')};

  option {
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#18181b' : '#ffffff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const CheckboxRow = styled.label`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  user-select: none;

  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #6366f1;
  }
`

export const ErrorText = styled.div`
  font-size: 12px;
  color: #ef4444;
  margin-top: 2px;
`

export const HintText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`

export const FooterBtn = styled.button<{ $primary?: boolean }>`
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;

  ${({ $primary, theme }) =>
    $primary
      ? css`
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          &:hover:not(:disabled) {
            background: #4f46e5;
            border-color: #4f46e5;
          }
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `
      : css`
          background: ${theme.colors.background.tertiary};
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.border.light};
          &:hover { background: ${theme.colors.border.light}; }
        `}
`
