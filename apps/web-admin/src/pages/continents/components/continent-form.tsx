/**
 * 대륙 등록/수정 폼 컴포넌트
 *
 * @description
 * FormSidePanel을 사용한 대륙 데이터 입력 폼
 * - 기본 정보: 대륙명, 영문명, ISO 코드, 국가 수
 * - 통계 정보: 면적, 인구
 */

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'
import type { ContinentResponseDto } from '@/shared/api/continents'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import { FormInput } from '@/shared/ui/form-input/form-input'

interface ContinentFormProps {
  isOpen: boolean
  initialData?: ContinentResponseDto
  onSubmit: (data: any) => void
  onCancel: () => void
}

interface ContinentFormData {
  name: string
  enName: string
  isoCode: string
  areaSqKm: string
  population: string
  countryCount: string
}

export function ContinentForm({
  isOpen,
  initialData,
  onSubmit,
  onCancel,
}: ContinentFormProps) {
  const [formData, setFormData] = useState<ContinentFormData>({
    name: '',
    enName: '',
    isoCode: '',
    areaSqKm: '',
    population: '',
    countryCount: '',
  })

  /**
   * initialData 변경 시 formData 업데이트
   */
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        enName: initialData.enName || '',
        isoCode: initialData.isoCode || '',
        areaSqKm: initialData.areaSqKm?.toString() || '',
        population: initialData.population?.toString() || '',
        countryCount: initialData.countryCount?.toString() || '',
      })
    } else {
      // 신규 등록 시 초기화
      setFormData({
        name: '',
        enName: '',
        isoCode: '',
        areaSqKm: '',
        population: '',
        countryCount: '',
      })
    }
  }, [initialData])

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('대륙명을 입력해주세요')

      return
    }

    onSubmit({
      name: formData.name,
      enName: formData.enName || undefined,
      isoCode: formData.isoCode || undefined,
      areaSqKm: formData.areaSqKm ? parseFloat(formData.areaSqKm) : undefined,
      population: formData.population || undefined,
      countryCount: formData.countryCount
        ? parseInt(formData.countryCount)
        : undefined,
    })
  }

  return (
    <FormSidePanel
      isOpen={isOpen}
      title={initialData ? '대륙 수정' : '새 대륙 등록'}
      onClose={onCancel}
      submitLabel={initialData ? '수정 완료' : '대륙 등록'}
      formId="continent-form"
      submitDisabled={!formData.name.trim()}
      headerExtra={
        <RequiredFieldsNotice>
          <RequiredFieldsIcon>⚠️</RequiredFieldsIcon>
          <RequiredFieldsText>
            <RequiredFieldsTitle>필수 항목:</RequiredFieldsTitle>
            <RequiredFieldsList>
              <RequiredFieldItem $completed={!!formData.name}>
                대륙명
              </RequiredFieldItem>
            </RequiredFieldsList>
          </RequiredFieldsText>
        </RequiredFieldsNotice>
      }
    >
      <Form id="continent-form" onSubmit={handleSubmit}>
        {/* 기본 정보 섹션 */}
        <FormSection>
          <FormSectionHeader>
            <FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                  fill="currentColor"
                />
              </svg>
            </FormSectionIcon>
            <div>
              <FormSectionTitle>기본 정보</FormSectionTitle>
              <FormSectionDescription>
                대륙의 이름과 식별 정보를 입력하세요
              </FormSectionDescription>
            </div>
          </FormSectionHeader>

          <FormRow>
            <FormField>
              <FormLabel>
                대륙명 <RequiredStar>*</RequiredStar>
              </FormLabel>
              <FormInput
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 아시아"
                required
              />
            </FormField>
            <FormField>
              <FormLabel>영문명</FormLabel>
              <FormInput
                type="text"
                value={formData.enName}
                onChange={(e) =>
                  setFormData({ ...formData, enName: e.target.value })
                }
                placeholder="예: Asia"
              />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField>
              <FormLabel>ISO 코드</FormLabel>
              <FormInput
                type="text"
                value={formData.isoCode}
                onChange={(e) =>
                  setFormData({ ...formData, isoCode: e.target.value })
                }
                placeholder="예: AS"
                maxLength={5}
              />
            </FormField>
            <FormField>
              <FormLabel>국가 수</FormLabel>
              <FormInput
                type="number"
                value={formData.countryCount}
                onChange={(e) =>
                  setFormData({ ...formData, countryCount: e.target.value })
                }
                placeholder="예: 48"
                min="0"
              />
            </FormField>
          </FormRow>
        </FormSection>

        {/* 통계 정보 섹션 */}
        <FormSection>
          <FormSectionHeader>
            <FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                  fill="currentColor"
                />
              </svg>
            </FormSectionIcon>
            <div>
              <FormSectionTitle>통계 정보</FormSectionTitle>
              <FormSectionDescription>
                면적, 인구 등 대륙의 통계 데이터를 입력하세요
              </FormSectionDescription>
            </div>
          </FormSectionHeader>

          <FormRow>
            <FormField>
              <FormLabel>면적 (km²)</FormLabel>
              <FormInput
                type="number"
                value={formData.areaSqKm}
                onChange={(e) =>
                  setFormData({ ...formData, areaSqKm: e.target.value })
                }
                placeholder="예: 44579000"
                step="0.01"
                min="0"
              />
            </FormField>
            <FormField>
              <FormLabel>인구</FormLabel>
              <FormInput
                type="number"
                value={formData.population}
                onChange={(e) =>
                  setFormData({ ...formData, population: e.target.value })
                }
                placeholder="예: 4600000000"
                min="0"
              />
            </FormField>
          </FormRow>
        </FormSection>
      </Form>
    </FormSidePanel>
  )
}

// Styled Components
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const FormSection = styled.div`
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

const FormSectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const FormSectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
`

const FormSectionTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.2px;
`

const FormSectionDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
`

const RequiredStar = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  font-weight: 700;
`

const RequiredFieldsNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 2px solid ${({ theme }) => theme.colors.alert.warning.border};
`

const RequiredFieldsIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  font-size: 18px;
`

const RequiredFieldsText = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RequiredFieldsTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
`

const RequiredFieldsList = styled.span`
  font-weight: 500;
`

const RequiredFieldItem = styled.span<{ $completed: boolean }>`
  color: ${({ $completed, theme }) =>
    $completed ? theme.colors.success : 'inherit'};
  text-decoration: ${({ $completed }) =>
    $completed ? 'line-through' : 'none'};
  opacity: ${({ $completed }) => ($completed ? '0.6' : '1')};
`
