import styled from 'styled-components'

/**
 * FormInput - 폼에서 사용하는 표준 Input 컴포넌트
 *
 * @description
 * 데이터 입력/수정 폼에서 사용하는 통일된 Input 스타일 컴포넌트입니다.
 * CountryForm, HistoricalCountryForm, ContinentForm 등에서 사용됩니다.
 *
 * @features
 * - 에러 상태 시각화 (빨간 테두리, 연한 빨강 배경)
 * - 브랜드 컬러 포커스 (보라색)
 * - 자동완성 스타일 일관성 유지
 * - Disabled 상태 스타일링
 * - Number type 스피너 제거
 *
 * @example
 * ```tsx
 * import { FormInput } from '@/shared/ui/form-input/form-input'
 *
 * <FormInput
 *   type="text"
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 *   placeholder="국가명을 입력하세요"
 * />
 *
 * <FormInput
 *   type="text"
 *   $error={!!errors.name}
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 * />
 * ```
 */
/* 행정조직 폼 톤: #e5e7eb 테두리, 12px radius, 인디고 포커스 */
export const FormInput = styled.input<{ $error?: boolean }>`
  border: 1px solid ${({ $error }) => ($error ? '#ea4335' : '#e5e7eb')};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ $error }) => ($error ? '#fef2f2' : '#fff')};
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#6366f1')};
    box-shadow: ${({ $error }) =>
      $error ? '0 0 0 3px rgba(234, 67, 53, 0.1)' : '0 0 0 3px rgba(99, 102, 241, 0.15)'};
  }

  &:hover:not(:focus) {
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#d1d5db')};
  }

  &::-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #fff inset;
    -webkit-text-fill-color: #111827;
    caret-color: #111827;
  }

  &:disabled {
    background: #f9fafb;
    border-color: #e5e7eb;
    color: #6b7280;
    cursor: not-allowed;
  }

  &[type='number'] {
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
`
