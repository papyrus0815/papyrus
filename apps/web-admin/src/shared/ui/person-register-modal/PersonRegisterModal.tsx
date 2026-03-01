/**
 * 인물 등록 모달 (행정조직 디자인)
 * - 연대표/국가선택/인물/인물 리스트 등에서 공통 사용
 * - initialCountryId 시 해당 국가로 미리 설정
 */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'
import { toast } from 'react-hot-toast'

import { personApi, type CreatePersonInput } from '@/shared/api/person'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'

const OVERLAY_Z = 9000

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${OVERLAY_Z};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const ModalBox = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`

const CloseBtn = styled.button`
  padding: 8px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  &:hover {
    background: #f3f4f6;
    color: #111;
  }
`

const FormBody = styled.div`
  padding: 24px;
`

const FormDesc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
`

const Field = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const SelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: ${(p) => (p.$hasValue ? '#111' : '#888')};
  cursor: pointer;
  text-align: left;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
`

const PrimaryBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const CancelBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #f9fafb;
  }
`

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
  margin-top: 4px;
  display: block;
`

const GENDER_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '선택' },
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

export interface PersonRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  /** 미리 선택할 국가 ID (연대표·국가 상세·인물 리스트에서 호출 시 해당 국가) */
  initialCountryId?: string | null
  /** 등록 성공 시 콜백 (인물 ID 전달) */
  onSuccess?: (personId: string) => void
}

export function PersonRegisterModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
}: PersonRegisterModalProps) {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [deathYear, setDeathYear] = useState('')
  const [biography, setBiography] = useState('')
  const [countryId, setCountryId] = useState<string>('')
  const [countryName, setCountryName] = useState<string>('')
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showGenderModal, setShowGenderModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])

  useEffect(() => {
    if (!isOpen) return
    Promise.all([getAllCountries(), getAllHistoricalCountries()])
      .then(([modern, historical]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
      })
      .catch(() => {})
  }, [isOpen])

  // 모달이 열릴 때만 폼 초기화 (국가 목록 로드 시에는 리셋하지 않음)
  useEffect(() => {
    if (!isOpen) return
    setName('')
    setSurname('')
    setGender('')
    setBirthYear('')
    setDeathYear('')
    setBiography('')
    setError(null)
    setCountryId(initialCountryId ?? '')
    setCountryName('')
  }, [isOpen, initialCountryId])

  // 국가 목록 로드 후 initialCountryId에 해당하는 국가명 표시
  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length)) return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName((historical as any).name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  const handleCountrySelect = (c: { id: string; name: string }) => {
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
  }

  const buildPayload = (): CreatePersonInput => {
    const payload: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || null,
      gender: gender || null,
      countryId: countryId || null,
      biography: biography.trim() || null,
    }
    if (birthYear.trim()) {
      const y = parseInt(birthYear, 10)
      if (!isNaN(y)) payload.birthDate = `${String(y).padStart(4, '0')}-01-01`
    }
    if (deathYear.trim()) {
      const y = parseInt(deathYear, 10)
      if (!isNaN(y)) payload.deathDate = `${String(y).padStart(4, '0')}-01-01`
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const input = buildPayload()
      const created = await personApi.create(input)
      const personId = (created as any)?.id ?? (created as any)?.data?.id
      toast.success('인물이 등록되었습니다.')
      onSuccess?.(personId)
      onClose()
    } catch (err: any) {
      setError(err?.message ?? '등록에 실패했습니다.')
      toast.error(err?.message ?? '등록에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const content = (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="person-register-title">
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle id="person-register-title">인물 등록</ModalTitle>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseBtn>
        </ModalHeader>
        <FormBody>
          <FormDesc>
            기본 정보를 입력하세요. 소속 국가는 미리 선택된 경우 해당 국가로 설정됩니다.
          </FormDesc>
          <form onSubmit={handleSubmit}>
            <Field>
              <Label>이름 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                autoFocus
              />
            </Field>
            <Field>
              <Label>성</Label>
              <Input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="예: 김"
              />
            </Field>
            <Field>
              <Label>성별</Label>
              <SelectBtn
                type="button"
                $hasValue={!!gender}
                onClick={() => setShowGenderModal(true)}
              >
                <span>
                  {GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? '선택'}
                </span>
                <FiChevronDown size={18} />
              </SelectBtn>
              <SelectModal
                isOpen={showGenderModal}
                onClose={() => setShowGenderModal(false)}
                options={GENDER_OPTIONS}
                selectedValue={gender}
                onSelect={(v) => {
                  setGender(v)
                  setShowGenderModal(false)
                }}
                title="성별 선택"
              />
            </Field>
            <Field>
              <Label>소속 국가 *</Label>
              <SelectBtn
                type="button"
                $hasValue={!!countryName}
                onClick={() => setShowCountryModal(true)}
              >
                <span>{countryName || '국가 선택'}</span>
                <FiChevronDown size={18} />
              </SelectBtn>
              <CountrySelectModal
                isOpen={showCountryModal}
                onClose={() => setShowCountryModal(false)}
                onSelect={handleCountrySelect}
                modernCountries={modernCountries}
                historicalCountries={historicalCountries}
                title="소속 국가 선택"
                selectedCountryId={countryId || undefined}
              />
            </Field>
            <Field>
              <Label>출생 연도</Label>
              <Input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="예: 1397"
                min={-9999}
                max={9999}
              />
            </Field>
            <Field>
              <Label>사망 연도</Label>
              <Input
                type="number"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                placeholder="예: 1450"
                min={-9999}
                max={9999}
              />
            </Field>
            <Field>
              <Label>약력</Label>
              <TextArea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="간단한 약력 (선택)"
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <FormActions>
              <CancelBtn type="button" onClick={onClose}>
                취소
              </CancelBtn>
              <PrimaryBtn type="submit" disabled={isSubmitting}>
                {isSubmitting ? '등록 중…' : '등록'}
              </PrimaryBtn>
            </FormActions>
          </form>
        </FormBody>
      </ModalBox>
    </Overlay>
  )

  return createPortal(content, document.body)
}
