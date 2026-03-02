/**
 * 인물 등록/수정 페이지 — event-create.styles와 함께 사용
 */
import styled from 'styled-components'

const BORDER = '#e5e7eb'
const TEXT = '#374151'
const TEXT_MUTED = '#6b7280'
const ACCENT = '#6366f1'

export const PageHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  background: #ffffff;
  border-bottom: 1px solid ${BORDER};
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`

export const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
`

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`

/* 행정조직 디자인: 목록 보기 버튼 (position-definitions-section과 동일) */
export const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 20px;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  background: none;
  border: none;
  border-radius: 0;
  cursor: pointer;

  span {
    @media (max-width: 640px) {
      display: none;
    }
  }
  &:hover {
    color: #111;
  }
  svg {
    flex-shrink: 0;
  }
`

export const HeaderIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  color: ${TEXT};
  flex-shrink: 0;
`

export const HeaderTitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${TEXT};
`

export const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: ${TEXT_MUTED};
`

export const ContentLayout = styled.div`
  padding: 32px 40px 48px;
  @media (max-width: 768px) {
    padding: 24px 20px;
  }
`

// ========== 카테고리 사이드바 (레거시 호환) ==========
export const CategorySidebar = styled.div`display: none;`
export const CategoryHeader = styled.div`display: block;`
export const CategoryItem = styled.button<{ $active: boolean }>`display: block; border: none; background: transparent;`
export const CategoryIcon = styled.div<{ $active: boolean }>`display: block;`
export const CategoryContent = styled.div`display: block;`
export const CategoryLabel = styled.div`display: block;`
export const CategoryDescription = styled.div`display: block;`
export const ActiveIndicator = styled.div`display: block;`

// ========== 폼 카드 ==========
export const FormArea = styled.div`
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 12px;
  overflow: hidden;
`

export const StepTabNav = styled.div`display: none;`
export const StepTabButton = styled.button<{ $active?: boolean }>`display: inline-block; border: none; background: transparent;`

/* 행정조직 디자인: 헤더 하단 테두리 #f3f4f6 */
export const FormAreaHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
  gap: 12px;
`

/* 행정조직 디자인: FormTitle 22px (position-definitions-section과 동일) */
export const FormAreaTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #111;
`

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  input[type='checkbox'],
  input[type='radio'] {
    accent-color: ${ACCENT};
  }
`

export const FormContent = styled.div`
  padding: 28px 32px 32px;
  @media (max-width: 768px) {
    padding: 24px 20px;
  }
`

/* 행정조직 디자인: 섹션 제목 FormTitle 22px + FormDesc 14px #666 */
export const SectionTitle = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${BORDER};

  > svg {
    color: ${TEXT_MUTED};
    margin-top: 2px;
    flex-shrink: 0;
  }
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #111;
  }
  p {
    margin: 8px 0 0;
    font-size: 14px;
    color: #666;
    line-height: 1.5;
  }
`

// ========== 폼 행·라벨·필드 ==========
export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
`

export const FormRow = styled.div<{ $noBorder?: boolean; $compact?: boolean }>`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 24px;
  align-items: start;
  padding: ${(p) => (p.$compact ? '0' : '16px 0')};
  border-bottom: ${(p) => (p.$noBorder ? 'none' : `1px solid ${BORDER}`)};

  &:last-child {
    border-bottom: none;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: ${(p) => (p.$compact ? '0' : '12px 0')};
  }
`

export const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT};
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  @media (max-width: 768px) {
    padding-top: 0;
  }
`

export const FormLabelHint = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${TEXT_MUTED};
  line-height: 1.4;
`

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT};
`

export const Required = styled.span`
  color: #dc2626;
  font-size: 13px;
  margin-left: 2px;
`

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

export const InputIcon = styled.div`
  position: absolute;
  left: 12px;
  color: ${TEXT_MUTED};
  display: flex;
  align-items: center;
  pointer-events: none;
`

export const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: ${TEXT};
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 8px;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: ${TEXT};
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 8px;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`

export const Hint = styled.span`
  font-size: 12px;
  color: ${TEXT_MUTED};
  line-height: 1.4;
`

// ========== 선택 버튼·카드 ==========
export const SelectCardButton = styled.button<{
  $hasValue?: boolean
  $hasError?: boolean
}>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ $hasValue }) => ($hasValue ? TEXT : '#9ca3af')};
  background: #fff;
  border: 1px ${({ $hasValue }) => ($hasValue ? 'solid' : 'dashed')}
    ${({ $hasError }) => ($hasError ? '#dc2626' : BORDER)};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;

  svg {
    color: ${TEXT_MUTED};
    flex-shrink: 0;
  }
  span {
    flex: 1;
  }
  &:hover {
    border-color: #d1d5db;
  }
  &:focus {
    outline: none;
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`

export const SelectButton = SelectCardButton

export const SelectedCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 8px;
`

export const CountryFlagEmoji = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #f9fafb;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid ${BORDER};
`

export const DynastyIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: ${TEXT};
  border-radius: 6px;
  flex-shrink: 0;
`

export const CountryInfo = styled.div`
  flex: 1;
  min-width: 0;
`

export const CountryName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${TEXT};
`

export const CountryLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${TEXT_MUTED};
`

export const ClearIconButton = styled.button`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #dc2626;
    color: #fff;
  }
  flex-shrink: 0;
`

// ========== 연혁 등 ==========
export const HistoryFormCard = styled.div`
  background: #fff;
  border: 1px solid ${BORDER};
  border-radius: 12px;
  overflow: hidden;
`
export const HistoryFormHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${BORDER};
  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${TEXT};
  }
`
export const HistoryFormBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`
export const FormActions = styled.div`
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid ${BORDER};
`

export const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;

  ${({ $variant = 'primary' }) =>
    $variant === 'primary'
      ? `
    color: #fff;
    background: ${ACCENT};
    border: none;
    &:hover:not(:disabled) {
      background: ${ACCENT_HOVER};
    }
  `
      : `
    color: ${TEXT};
    background: #fff;
    border: 1px solid ${BORDER};
    &:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
