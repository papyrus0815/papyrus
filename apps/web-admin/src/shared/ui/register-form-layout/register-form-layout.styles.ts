/**
 * 역대 수반 기본정보/업적 폼과 인물 등록 폼 공용 레이아웃 스타일
 * - FormCardWrapper, FormHeader, 탭(TabNavigation/TabButton), FormRows, FieldRow 등
 * - 두 폼이 동일한 디자인을 쓰도록 공용으로 분리
 */
import styled from 'styled-components'

const BORDER_COLOR = '#e5e7eb'
const FOCUS_COLOR = '#4f46e5'
const TEXT_PRIMARY = '#0f172a'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#6b7280'

export const FormCardWrapper = styled.div`
  background: #ffffff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
`

export const FormHeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
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
  color: ${TEXT_SECONDARY};
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
  order: 0;
  &:hover {
    background: #f1f5f9;
    color: #475569;
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

/** 역대 수반 기본정보/업적 탭과 동일: pill 배경, 활성 = 흰 배경 + 인디고 글자 */
export const TabNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 24px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const TabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  svg {
    flex-shrink: 0;
  }
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

export const FormSectionInner = styled.div`
  padding: 28px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

/** 행정조직·역대 수반 부처 등록 폼과 동일: grid 360px 1fr */
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

export const FieldControl = styled.div<{ $variant?: 'person' | 'datePair' }>`
  min-width: 0;
  ${(p) =>
    p.$variant === 'person'
      ? 'max-width: 360px;'
      : p.$variant === 'datePair'
        ? 'max-width: 480px;'
        : ''}
`

/** 인물 등록 출생일·사망일 / 역대 수반 취임일·퇴임일 공용: 2열 그리드, 달력 버튼 */
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
  color: ${(p) => (p.$hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: ${FOCUS_COLOR};
    background: #faf5ff;
    color: #111827;
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
    color: ${TEXT_SECONDARY};
    flex-shrink: 0;
  }
`

export const FieldHint = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${TEXT_SECONDARY};
  line-height: 1.4;
`

/** 필수 필드 표시: 빨간 점 (자식 텍스트는 숨김, 라벨 텍스트와 시선 정렬) */
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

/** 행정조직 부처 등록 input과 동일 */
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
  &::placeholder {
    color: #9ca3af;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

export const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
    user-select: none;
  }
`

export { BORDER_COLOR, FOCUS_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED }
