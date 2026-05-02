/**
 * 인물 등록 모달 (행정조직 디자인)
 * - 연대표/국가선택/인물/인물 리스트 등에서 공통 사용
 * - initialCountryId 시 해당 국가로 미리 설정
 */
import React, { useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { toast } from 'react-hot-toast'
import { FiAlertCircle, FiCheck, FiChevronDown, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { FormInput } from '@/shared/ui/form-input/form-input'

import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  type CreatePersonDto as CreatePersonInput,
  type Era,
  createPerson,
} from '@/shared/api/persons'
import { uploadImage } from '@/shared/api/upload'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import {
  ModalOverlay,
  ModalBox,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
} from '@/shared/ui/modal'

const FormBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
`

const FormDesc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const Field = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
`

/** 공용 Input — FormInput 컴포넌트 사용 (border-radius 8px 오버라이드) */
const Input = styled(FormInput)`
  padding: 12px 14px;
  font-size: 15px;
  border-radius: 8px;
`

const SelectBtn = styled.button<{ $hasValue?: boolean; $error?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? '#dc2626' : theme.colors.border.default};
  border-radius: 8px;
  background: ${({ $error, theme }) =>
    $error
      ? theme.mode === 'dark'
        ? 'rgba(220,38,38,0.12)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#f9fafb'};
  }
  &:focus {
    border-color: #6366f1;
  }
`

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SegmentBtn = styled.button<{ $active?: boolean; $error?: boolean }>`
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  background: ${({ $active, $error, theme }) => {
    if ($active) return '#6366f1'
    if ($error)
      return theme.mode === 'dark' ? 'rgba(220,38,38,0.12)' : '#fef2f2'
    return theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'
  }};
  border: 1px solid
    ${({ $active, $error, theme }) => {
      if ($active) return '#6366f1'
      if ($error) return '#dc2626'
      return theme.colors.border.default
    }};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? '#4f46e5' : '#a5b4fc')};
    color: ${({ $active, theme }) =>
      $active ? '#fff' : theme.colors.text.primary};
  }
`

const SuccessPanel = styled.div`
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
`

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  margin-bottom: 4px;
`

const SuccessTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SuccessDesc = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  max-width: 360px;
`

const SuccessActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
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
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const ErrorText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 8px;
  svg {
    flex-shrink: 0;
  }
`

const FieldError = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`

const YearRow = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
`

const EraSelect = styled.select`
  padding: 12px 10px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: #6366f1;
  }
`

const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

/**
 * 모듈 레벨 캐시 — 모달 열 때마다 매번 fetch하지 않게 Promise singleton 보관.
 * 첫 호출자가 fetch하고 같은 Promise를 모두 공유.
 */
let countriesCache:
  | Promise<{
      modern: CountryResponseDto[]
      historical: HistoricalCountryResponseDto[]
    }>
  | null = null

function loadCountriesCached() {
  if (!countriesCache) {
    countriesCache = Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
    ])
      .then(([modern, historical]) => ({ modern, historical }))
      .catch((err) => {
        // 실패 시 다음 호출에서 재시도할 수 있게 캐시 비움.
        countriesCache = null
        throw err
      })
  }
  return countriesCache
}

export interface PersonRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  /** 미리 선택할 국가 ID (연대표·국가 상세·인물 리스트에서 호출 시 해당 국가) */
  initialCountryId?: string | null
  /** 등록 성공 시 콜백 (인물 ID 전달) */
  onSuccess?: (personId: string) => void
  /**
   * 등록 직후 "자세히 편집" 버튼을 노출할 때 호출. 보통 호출자가
   * navigate로 인물 수정 페이지로 보낸다. prop을 주면 등록 후 모달이 즉시 닫히지 않고
   * 후속 액션을 사용자가 선택. 미설정이면 등록 후 바로 닫힘.
   */
  onEditDetails?: (personId: string) => void
}

export function PersonRegisterModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
  onEditDetails,
}: PersonRegisterModalProps) {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState('')
  const [birthEra, setBirthEra] = useState<Era>('AD')
  const [birthYear, setBirthYear] = useState('')
  const [deathEra, setDeathEra] = useState<Era>('AD')
  const [deathYear, setDeathYear] = useState('')
  const [biography, setBiography] = useState('')
  const [countryId, setCountryId] = useState<string>('')
  const [countryName, setCountryName] = useState<string>('')
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** 필드별 에러 — 페이지 폼과 동일 패턴 */
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** 등록 성공 후 자세히 편집 액션을 보여줄 단계 — onEditDetails가 주어졌을 때만 사용 */
  const [successPersonId, setSuccessPersonId] = useState<string | null>(null)

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])

  useEffect(() => {
    if (!isOpen) return
    loadCountriesCached()
      .then(({ modern, historical }) => {
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
    setBirthEra('AD')
    setBirthYear('')
    setDeathEra('AD')
    setDeathYear('')
    setBiography('')
    setErrors({})
    setCountryId(initialCountryId ?? '')
    setCountryName('')
    setSuccessPersonId(null)
  }, [isOpen, initialCountryId])

  // 국가 목록 로드 후 initialCountryId에 해당하는 국가명 표시
  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length))
      return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName(historical.name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  /** 미저장 입력 여부 — 닫기 경고 트리거 */
  const isDirty = useMemo(() => {
    return Boolean(
      name.trim() ||
        surname.trim() ||
        gender ||
        birthYear.trim() ||
        deathYear.trim() ||
        biography.trim() ||
        // 국가 변경 — initialCountryId와 달라진 경우만 dirty로 본다.
        (countryId && countryId !== (initialCountryId ?? '')),
    )
  }, [
    name,
    surname,
    gender,
    birthYear,
    deathYear,
    biography,
    countryId,
    initialCountryId,
  ])

  const requestClose = () => {
    if (isSubmitting) return
    if (
      isDirty &&
      !window.confirm('입력 중인 내용이 사라집니다. 닫으시겠습니까?')
    ) {
      return
    }
    onClose()
  }

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleCountrySelect = (c: { id: string; name: string }) => {
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
    clearFieldError('countryId')
  }

  /** 유효한 연도: 정수 1~9999 (기원 전/후 공통) */
  const isValidYear = (y: string): boolean => {
    if (!y.trim()) return true
    const n = Number(y)
    return Number.isInteger(n) && n >= 1 && n <= 9999
  }

  // 페이지 폼과 동일 검증 — 이름·성·성별·국가 필수, 연도 범위, 사망일 ≥ 출생일, 미래 날짜 차단.
  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!surname.trim()) e.surname = '성을 입력해주세요.'
    if (!gender) e.gender = '성별을 선택해주세요.'
    if (!countryId) e.countryId = '소속 국가를 선택해주세요.'
    if (birthYear.trim() && !isValidYear(birthYear)) {
      e.birth = '출생 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (deathYear.trim() && !isValidYear(deathYear)) {
      e.death = '사망 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (
      !e.birth &&
      !e.death &&
      birthYear.trim() &&
      deathYear.trim()
    ) {
      const by = parseInt(birthYear, 10)
      const dy = parseInt(deathYear, 10)
      const birthVal = (birthEra === 'BC' ? -1 : 1) * by
      const deathVal = (deathEra === 'BC' ? -1 : 1) * dy
      if (deathVal < birthVal) {
        e.death = '사망 연도는 출생 연도 이후여야 합니다.'
      }
    }
    // 미래 날짜 차단 (AD만 검사 — BC는 무조건 과거)
    const todayY = new Date().getFullYear()
    if (!e.birth && birthEra === 'AD' && birthYear.trim()) {
      const by = parseInt(birthYear, 10)
      if (by > todayY) e.birth = '출생 연도는 올해 이후일 수 없습니다.'
    }
    if (!e.death && deathEra === 'AD' && deathYear.trim()) {
      const dy = parseInt(deathYear, 10)
      if (dy > todayY) e.death = '사망 연도는 올해 이후일 수 없습니다.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = (): CreatePersonInput => {
    const payload: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || null,
      gender: gender || null,
      countryId: countryId || undefined,
      biography: biography.trim() || null,
    }
    // birth/death 객체 형식으로 보내 BC를 era로 명시 — birthDate 문자열 padStart는 음수 케이스에 깨짐.
    if (birthYear.trim()) {
      const y = parseInt(birthYear, 10)
      if (!isNaN(y)) payload.birth = { era: birthEra, year: y }
    }
    if (deathYear.trim()) {
      const y = parseInt(deathYear, 10)
      if (!isNaN(y)) payload.death = { era: deathEra, year: y }
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const created = await createPerson(buildPayload())
      toast.success('인물이 등록되었습니다.')
      onSuccess?.(created.id)
      if (onEditDetails) {
        // 자세히 편집 액션을 받을 수 있는 호출자 — 모달은 success 화면으로 전환.
        setSuccessPersonId(created.id)
      } else {
        onClose()
      }
    } catch (err: any) {
      const msg = err?.message ?? '등록에 실패했습니다.'
      setErrors((prev) => ({ ...prev, _form: msg }))
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // 등록 성공 후 자세히 편집 액션을 받을 수 있으면 success 패널만 표시.
  if (successPersonId && onEditDetails) {
    const personId = successPersonId
    const successContent = (
      <ModalOverlay
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-register-success"
      >
        <ModalBox onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle id="person-register-success">등록 완료</ModalTitle>
            <ModalCloseButton
              type="button"
              onClick={onClose}
              aria-label="닫기"
            >
              <FiX size={20} />
            </ModalCloseButton>
          </ModalHeader>
          <SuccessPanel>
            <SuccessIcon>
              <FiCheck size={32} strokeWidth={3} />
            </SuccessIcon>
            <SuccessTitle>인물이 등록되었습니다</SuccessTitle>
            <SuccessDesc>
              생몰·국적·가족·약력 등 더 자세한 정보를 입력하면 인물 페이지가 풍부해집니다.
            </SuccessDesc>
            <SuccessActions>
              <CancelBtn type="button" onClick={onClose}>
                닫기
              </CancelBtn>
              <PrimaryBtn
                type="button"
                onClick={() => {
                  onEditDetails(personId)
                  onClose()
                }}
              >
                자세히 편집
              </PrimaryBtn>
            </SuccessActions>
          </SuccessPanel>
        </ModalBox>
      </ModalOverlay>
    )
    return createPortal(successContent, document.body)
  }

  const content = (
    <ModalOverlay
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-register-title"
    >
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle id="person-register-title">인물 등록</ModalTitle>
          <ModalCloseButton
            type="button"
            onClick={requestClose}
            aria-label="닫기"
          >
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>
        <FormBody>
          <FormDesc>
            기본 정보를 입력하세요. 소속 국가는 미리 선택된 경우 해당 국가로
            설정됩니다.
          </FormDesc>
          <form onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="person-modal-name">이름 *</Label>
              <Input
                id="person-modal-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearFieldError('name')
                }}
                placeholder="예: 홍길동"
                autoFocus
                $error={!!errors.name}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.name}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label htmlFor="person-modal-surname">성 *</Label>
              <Input
                id="person-modal-surname"
                value={surname}
                onChange={(e) => {
                  setSurname(e.target.value)
                  clearFieldError('surname')
                }}
                placeholder="예: 김"
                $error={!!errors.surname}
                aria-invalid={!!errors.surname}
              />
              {errors.surname && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.surname}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label>성별 *</Label>
              <SegmentRow role="radiogroup" aria-label="성별">
                {GENDER_OPTIONS.map((opt) => (
                  <SegmentBtn
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={gender === opt.value}
                    $active={gender === opt.value}
                    $error={!!errors.gender}
                    onClick={() => {
                      setGender(opt.value)
                      clearFieldError('gender')
                    }}
                  >
                    {opt.label}
                  </SegmentBtn>
                ))}
              </SegmentRow>
              {errors.gender && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.gender}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label>소속 국가 *</Label>
              <SelectBtn
                type="button"
                $hasValue={!!countryName}
                $error={!!errors.countryId}
                aria-invalid={!!errors.countryId}
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
              {errors.countryId && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.countryId}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label htmlFor="person-modal-birth">출생 연도</Label>
              <YearRow>
                <EraSelect
                  aria-label="출생 시대"
                  value={birthEra}
                  onChange={(e) => {
                    setBirthEra(e.target.value as Era)
                    clearFieldError('birth')
                  }}
                >
                  <option value="AD">AD</option>
                  <option value="BC">BC</option>
                </EraSelect>
                <Input
                  id="person-modal-birth"
                  type="number"
                  value={birthYear}
                  onChange={(e) => {
                    setBirthYear(e.target.value)
                    clearFieldError('birth')
                  }}
                  placeholder="예: 1397"
                  min={1}
                  max={9999}
                  $error={!!errors.birth}
                  aria-invalid={!!errors.birth}
                />
              </YearRow>
              {errors.birth && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.birth}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label htmlFor="person-modal-death">사망 연도</Label>
              <YearRow>
                <EraSelect
                  aria-label="사망 시대"
                  value={deathEra}
                  onChange={(e) => {
                    setDeathEra(e.target.value as Era)
                    clearFieldError('death')
                  }}
                >
                  <option value="AD">AD</option>
                  <option value="BC">BC</option>
                </EraSelect>
                <Input
                  id="person-modal-death"
                  type="number"
                  value={deathYear}
                  onChange={(e) => {
                    setDeathYear(e.target.value)
                    clearFieldError('death')
                  }}
                  placeholder="예: 1450"
                  min={1}
                  max={9999}
                  $error={!!errors.death}
                  aria-invalid={!!errors.death}
                />
              </YearRow>
              {errors.death && (
                <FieldError role="alert">
                  <FiAlertCircle size={13} />
                  {errors.death}
                </FieldError>
              )}
            </Field>
            <Field>
              <Label>약력</Label>
              <RichTextEditor
                value={biography}
                onChange={setBiography}
                showTitle={false}
                placeholder="인물의 일생을 설명하는 글 (선택). 서식·이미지를 넣을 수 있습니다."
                onImageUpload={async (file) => {
                  const result = await uploadImage(file, 'persons')
                  return result.url
                }}
              />
            </Field>
            {errors._form && (
              <ErrorText role="alert">
                <FiAlertCircle size={14} />
                {errors._form}
              </ErrorText>
            )}
            <FormActions>
              <CancelBtn type="button" onClick={requestClose}>
                취소
              </CancelBtn>
              <PrimaryBtn type="submit" disabled={isSubmitting}>
                {isSubmitting ? '등록 중…' : '등록'}
              </PrimaryBtn>
            </FormActions>
          </form>
        </FormBody>
      </ModalBox>
    </ModalOverlay>
  )

  return createPortal(content, document.body)
}
