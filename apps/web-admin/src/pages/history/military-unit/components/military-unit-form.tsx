import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import {
  useCreateMilitaryUnit,
  useUpdateMilitaryUnit,
  useMilitaryUnits,
} from '@/features/military-unit/use-military-units.hook'
import { useCountries } from '@/features/country/use-countries.hook'
import type { MilitaryUnit } from '@/shared/api/military-unit'

const UNIT_TYPES = [
  { value: 'FIELD_ARMY', label: '야전군' },
  { value: 'CORPS', label: '군단' },
  { value: 'DIVISION', label: '사단' },
  { value: 'BRIGADE', label: '여단' },
  { value: 'REGIMENT', label: '연대' },
  { value: 'BATTALION', label: '대대' },
  { value: 'COMPANY', label: '중대' },
  { value: 'PLATOON', label: '소대' },
  { value: 'SQUAD', label: '분대' },
  { value: 'FLEET', label: '함대' },
  { value: 'SQUADRON', label: '전대' },
  { value: 'WING', label: '비행단' },
  { value: 'SPECIAL_FORCES', label: '특수부대' },
  { value: 'DETACHMENT', label: '분견대' },
  { value: 'OTHER', label: '기타' },
]

interface MilitaryUnitFormProps {
  unit?: MilitaryUnit | null
  onClose: () => void
}

export const MilitaryUnitForm = ({ unit, onClose }: MilitaryUnitFormProps) => {
  const createUnit = useCreateMilitaryUnit()
  const updateUnit = useUpdateMilitaryUnit()
  const { data: countries = [], isLoading: countriesLoading } = useCountries()
  const { data: allUnits = [], isLoading: unitsLoading } = useMilitaryUnits()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    unitType: '',
    countryId: '',
    parentUnitId: '',
    isActive: true,
    establishedDate: '',
    disbandedDate: '',
    description: '',
  })

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name || '',
        unitType: unit.unitType || '',
        countryId: unit.countryId || '',
        parentUnitId: unit.parentUnitId || '',
        isActive: unit.isActive ?? true,
        establishedDate: unit.establishedDate
          ? new Date(unit.establishedDate).toISOString().split('T')[0]
          : '',
        disbandedDate: unit.disbandedDate
          ? new Date(unit.disbandedDate).toISOString().split('T')[0]
          : '',
        description: unit.description || '',
      })
    }
  }, [unit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      name: formData.name,
      unitType: formData.unitType || null,
      countryId: formData.countryId || null,
      parentUnitId: formData.parentUnitId || null,
      isActive: formData.isActive,
      establishedDate: formData.establishedDate || null,
      disbandedDate: formData.disbandedDate || null,
      description: formData.description || null,
    }

    try {
      if (unit) {
        await updateUnit.mutateAsync({ id: unit.id, data })
      } else {
        await createUnit.mutateAsync(data)
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || '저장 중 오류가 발생했습니다.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  return (
    <Overlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <FormContainer
        as={motion.div}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <FormHeader>
          <FormTitle>{unit ? '군부대 수정' : '새 군부대 추가'}</FormTitle>
          <CloseButton onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </CloseButton>
        </FormHeader>

        <Form onSubmit={handleSubmit}>
          {error && (
            <ErrorMessage>
              <ErrorIcon>⚠️</ErrorIcon>
              {error}
            </ErrorMessage>
          )}

          {(countriesLoading || unitsLoading) && (
            <LoadingMessage>데이터 로딩 중...</LoadingMessage>
          )}

          <FormGroup>
            <Label>
              부대명 <Required>*</Required>
            </Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="부대 이름을 입력하세요"
            />
          </FormGroup>

          <FormGroup>
            <Label>부대 종류</Label>
            <Select
              name="unitType"
              value={formData.unitType}
              onChange={handleChange}
            >
              <option value="">선택하세요</option>
              {UNIT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>소속 국가</Label>
            <Select
              name="countryId"
              value={formData.countryId}
              onChange={handleChange}
            >
              <option value="">선택하세요</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                  {country.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>상위 부대</Label>
            <Select
              name="parentUnitId"
              value={formData.parentUnitId}
              onChange={handleChange}
            >
              <option value="">없음 (최상위 부대)</option>
              {allUnits
                .filter((u) => u.id !== unit?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <CheckboxLabel>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              <span>활성 상태</span>
            </CheckboxLabel>
          </FormGroup>

          <FormRow>
            <FormGroup>
              <Label>창설일</Label>
              <Input
                type="date"
                name="establishedDate"
                value={formData.establishedDate}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label>해체일</Label>
              <Input
                type="date"
                name="disbandedDate"
                value={formData.disbandedDate}
                onChange={handleChange}
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label>설명</Label>
            <TextArea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="군부대에 대한 설명을 입력하세요"
              rows={4}
            />
          </FormGroup>

          <FormActions>
            <CancelButton type="button" onClick={onClose}>
              취소
            </CancelButton>
            <SubmitButton
              type="submit"
              disabled={createUnit.isPending || updateUnit.isPending}
            >
              {createUnit.isPending || updateUnit.isPending
                ? '저장 중...'
                : unit
                  ? '수정하기'
                  : '추가하기'}
            </SubmitButton>
          </FormActions>
        </Form>
      </FormContainer>
    </Overlay>
  )
}

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`

const FormContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
`

const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
`

const CloseButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`

const Form = styled.form`
  padding: 32px;
  overflow-y: auto;
`

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
`

const ErrorIcon = styled.span`
  font-size: 18px;
`

const LoadingMessage = styled.div`
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  color: #0369a1;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
  text-align: center;
`

const FormGroup = styled.div`
  margin-bottom: 24px;
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`

const Required = styled.span`
  color: #dc2626;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  span {
    font-size: 15px;
    color: #334155;
    font-weight: 500;
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`

const CancelButton = styled.button`
  flex: 1;
  padding: 14px;
  background: #f8fafc;
  color: #475569;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`

const SubmitButton = styled.button`
  flex: 1;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
