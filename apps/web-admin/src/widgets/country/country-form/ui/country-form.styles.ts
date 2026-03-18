/**
 * 폼 공통 스타일 (CountryForm, HistoricalCountryForm, TenureRegisterPanel 공유)
 * 사이드패널 + 폼 필드 레이아웃
 */
import styled from 'styled-components'

import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

// ─── 사이드 패널 ──────────────────────────────────────────────────────────────

export const SidePanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  z-index: ${Z_INDEX.DRAWER_OVERLAY};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
`

export const SidePanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(600px, calc(100% - 40px));
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow:
    -4px 0 24px ${({ theme }) => theme.colors.shadow.lg},
    -2px 0 8px ${({ theme }) => theme.colors.shadow.sm};
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  display: flex;
  flex-direction: column;
`

export const SidePanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

export const SidePanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.2px;
`

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.95);
  }
`

export const SidePanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;
`

export const SidePanelFooter = styled.div`
  padding: 20px 28px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

// ─── 필수 항목 안내 ────────────────────────────────────────────────────────────

export const RequiredFieldsNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(250,204,21,0.08)' : '#fefce8'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  margin-bottom: 4px;
`

export const RequiredFieldsIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #ca8a04;
  font-size: 18px;
`

export const RequiredFieldsText = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const RequiredFieldsTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#f57c00')};
`

export const RequiredFieldsList = styled.span`
  font-weight: 500;
`

export const RequiredFieldItem = styled.span<{ $completed?: boolean }>`
  color: ${({ $completed, theme }) =>
    $completed ? (theme.mode === 'dark' ? '#4ade80' : '#1e8e3e') : 'inherit'};
  text-decoration: ${({ $completed }) =>
    $completed ? 'line-through' : 'none'};
  opacity: ${({ $completed }) => ($completed ? '0.6' : '1')};
`

export const RequiredFieldCheckbox = styled.div`
  display: none;
`

// ─── 폼 레이아웃 ──────────────────────────────────────────────────────────────

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }
`

export const FormSectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

export const FormSectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
`

export const FormSectionTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
`

export const FormSectionDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const FormLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const RequiredStar = styled.span`
  color: #ea4335;
  font-size: 14px;
  font-weight: 700;
`

export const ModalFormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const DateDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;

  .label {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    width: 72px;
    flex-shrink: 0;
  }

  input[type='number'] {
    width: 70px;
    text-align: center;
  }

  button {
    min-width: 100px;
  }
`

export const ErrorMessage = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ea4335;
  margin-top: 6px;
  font-weight: 500;

  &::before {
    content: '⚠';
    font-size: 14px;
  }
`

// ─── 제출 버튼 ────────────────────────────────────────────────────────────────

export const SubmitButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.md};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#94a3b8'};
    box-shadow: none;
  }

  svg {
    flex-shrink: 0;
  }
`

// ─── 폼용 셀렉트 / 입력 위젯 ─────────────────────────────────────────────────

export const Select = styled.select<{ $error?: boolean }>`
  border: 1px solid
    ${({ $error, theme }) => ($error ? '#ea4335' : theme.colors.border.default)};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ $error, theme }) =>
    $error
      ? theme.mode === 'dark'
        ? 'rgba(234,67,53,0.12)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#6366f1')};
    box-shadow: ${({ $error }) =>
      $error
        ? '0 0 0 3px rgba(234, 67, 53, 0.1)'
        : '0 0 0 3px rgba(99, 102, 241, 0.15)'};
  }
`

export const SelectButton = styled.button<{
  $error?: boolean
  $hasValue?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid
    ${({ $error, theme }) => ($error ? '#ea4335' : theme.colors.border.default)};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ $error, theme }) =>
    $error
      ? theme.mode === 'dark'
        ? 'rgba(234,67,53,0.12)'
        : '#fef2f2'
      : theme.colors.background.primary};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
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

  &:focus {
    outline: none;
    border-color: ${({ $error }) => ($error ? '#ea4335' : '#6366f1')};
    box-shadow: ${({ $error }) =>
      $error
        ? '0 0 0 3px rgba(234, 67, 53, 0.1)'
        : '0 0 0 3px rgba(99, 102, 241, 0.15)'};
  }
`

export const ThumbnailPreview = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
`

export const ThumbnailImage = styled.img`
  max-width: 100%;
  max-height: 160px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px ${({ theme }) => theme.colors.shadow.md};
`

export const FlagImagePreview = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const FlagImage = styled.img`
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.shadow.sm};
`

export const FileUploadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const FileUploadLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

export const FileInput = styled.input`
  display: none;
`

export const FileUploadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
`

export const FileUploadText = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 공용 Input — FormInput 컴포넌트 직접 re-export */
export {
  FormInput as Input,
  FormTextarea as Textarea,
} from '@/shared/ui/form-input/form-input'

// ─── 인라인 선택 모달 (국가 형태·기원 선택 등) ────────────────────────────────

export const SelectModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

export const SelectModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(480px, 92vw);
  max-height: 80vh;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,20,20,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border-radius: 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 40px rgba(0,0,0,0.5)'
      : '0 10px 40px rgba(0,0,0,0.12)'};
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const SelectModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

export const SelectModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SelectModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ModalSearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

export const ModalSearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const SelectModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }
`

export const SelectOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border: none;
  border-radius: 10px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.primary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : theme.colors.background.secondary};
  }
  &:last-child {
    margin-bottom: 0;
  }
`

export const SelectOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  font-size: 16px;
`

export const SelectOptionText = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SelectOptionCheck = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`

export const SelectModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

export const SelectModalFooterButton = styled.button`
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`
