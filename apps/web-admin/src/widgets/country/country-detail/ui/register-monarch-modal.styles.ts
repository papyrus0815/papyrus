/**
 * 역대 수반 > 수반 등록 폼과 동일한 트리거·섹션 스타일 (heads-of-state-section과 맞춤)
 */
import styled from 'styled-components'

const TEXT_PRIMARY = '#0f172a'

const triggerButtonStyles = `
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: inherit;
  background: #fff;
  border: 1px solid #e5e7eb;
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

export const MonarchSelectTriggerButton = styled.button<{ $hasValue?: boolean }>`
  ${triggerButtonStyles}
  color: ${({ $hasValue }) => ($hasValue ? '#111827' : '#9ca3af')};
`

export const MonarchSubSectionTitle = styled.h4`
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const MonarchSectionHint = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
`

export const MonarchFormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
`

export const MonarchResetButton = styled.button`
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const MonarchEventsPageCheckWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const MonarchCheckboxLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
    flex-shrink: 0;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
    user-select: none;
  }
`

export const MonarchSaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.2);

  &:hover:not(:disabled) {
    background: #4f46e5;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
