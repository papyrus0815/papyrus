/**
 * 폼 공용 스타일 (shared 레이어)
 * Form, FormSection, FormField 등 여러 위젯에서 공유
 */
import styled from 'styled-components'

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
  display: flex;
  align-items: center;
  gap: 4px;
`

export const RequiredStar = styled.span`
  color: #ea4335;
  font-size: 14px;
  font-weight: 700;
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

export const ModalFormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`
