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
 * import { FormInput } from '@/shared/ui/form-input'
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
export const FormInput = styled.input<{ $error?: boolean }>`
  border: 1px solid ${({ $error }) => ($error ? '#ea4335' : '#dadce0')};
  border-radius: 10px;
  padding: 14px 16px;
  background: ${({ $error }) => ($error ? '#fef7f7' : '#ffffff')};
  color: #202124;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;

  &::placeholder {
    color: #9aa0a6;
  }

  &:focus {
    outline: none;
    border-color: ${({ $error }) =>
      $error ? '#ea4335' : 'var(--color-primary)'};
    box-shadow: ${({ $error }) =>
      $error
        ? '0 0 0 3px rgba(234, 67, 53, 0.1)'
        : '0 0 0 3px rgba(173, 70, 255, 0.1)'};
    background: #ffffff;
  }

  &:hover:not(:focus) {
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#bdc1c6')};
  }

  &::-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
    -webkit-text-fill-color: #202124;
    caret-color: #202124;
  }

  &:disabled {
    background: #f1f3f4;
    border-color: #dadce0;
    color: #80868b;
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
