import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { countryApi } from '@/shared/api/country'
import { dynastyApi } from '@/shared/api/dynasty'
import {
  type CreatePersonInput,
  type Era,
  personApi,
} from '@/shared/api/person'

interface FormData {
  // 기본 정보
  name: string
  surname: string
  gender: string
  birthEra: Era
  birthYear: string
  birthMonth: string
  birthDay: string
  deathEra: Era
  deathYear: string
  deathMonth: string
  deathDay: string
  biography: string
  profileImageUrl: string

  // 소속 정보
  countryId: string
  dynastyId: string
}

interface FormErrors {
  [key: string]: string
}

export default function PersonCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCountryId = searchParams.get('countryId')

  const [formData, setFormData] = useState<FormData>({
    name: '',
    surname: '',
    gender: '',
    birthEra: 'AD',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    deathEra: 'AD',
    deathYear: '',
    deathMonth: '',
    deathDay: '',
    biography: '',
    profileImageUrl: '',
    countryId: presetCountryId || '',
    dynastyId: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [dynasties, setDynasties] = useState<any[]>([])

  // 국가 및 가문 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesData, dynastiesData] = await Promise.all([
          countryApi.getAll(),
          dynastyApi.getAll(),
        ])
        setCountries(countriesData)
        setDynasties(dynastiesData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 이름 필수
    if (!formData.name.trim()) {
      newErrors.name = '이름은 필수 항목입니다'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '이름은 최소 2자 이상이어야 합니다'
    }

    // 생년 검증
    if (formData.birthYear) {
      const year = parseInt(formData.birthYear)
      if (isNaN(year) || year < 1 || year > 9999) {
        newErrors.birthYear = '올바른 연도를 입력하세요 (1-9999)'
      }

      if (formData.birthMonth) {
        const month = parseInt(formData.birthMonth)
        if (isNaN(month) || month < 1 || month > 12) {
          newErrors.birthMonth = '올바른 월을 입력하세요 (1-12)'
        }
      }

      if (formData.birthDay) {
        const day = parseInt(formData.birthDay)
        if (isNaN(day) || day < 1 || day > 31) {
          newErrors.birthDay = '올바른 일을 입력하세요 (1-31)'
        }
      }
    }

    // 사망년 검증
    if (formData.deathYear) {
      const year = parseInt(formData.deathYear)
      if (isNaN(year) || year < 1 || year > 9999) {
        newErrors.deathYear = '올바른 연도를 입력하세요 (1-9999)'
      }

      if (formData.deathMonth) {
        const month = parseInt(formData.deathMonth)
        if (isNaN(month) || month < 1 || month > 12) {
          newErrors.deathMonth = '올바른 월을 입력하세요 (1-12)'
        }
      }

      if (formData.deathDay) {
        const day = parseInt(formData.deathDay)
        if (isNaN(day) || day < 1 || day > 31) {
          newErrors.deathDay = '올바른 일을 입력하세요 (1-31)'
        }
      }

      // 사망일이 출생일보다 빠른지 검증
      if (formData.birthYear && formData.deathYear) {
        const birthYear = parseInt(formData.birthYear)
        const deathYear = parseInt(formData.deathYear)

        if (formData.birthEra === formData.deathEra && deathYear < birthYear) {
          newErrors.deathYear = '사망일은 출생일 이후여야 합니다'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // 날짜 구성
      let birthDate: string | null = null
      if (formData.birthYear) {
        const year = formData.birthYear.padStart(4, '0')
        const month = formData.birthMonth.padStart(2, '0')
        const day = formData.birthDay.padStart(2, '0')
        birthDate = `${year}-${month || '01'}-${day || '01'}`
      }

      let deathDate: string | null = null
      if (formData.deathYear) {
        const year = formData.deathYear.padStart(4, '0')
        const month = formData.deathMonth.padStart(2, '0')
        const day = formData.deathDay.padStart(2, '0')
        deathDate = `${year}-${month || '01'}-${day || '01'}`
      }

      const data: CreatePersonInput = {
        name: formData.name.trim(),
        surname: formData.surname.trim() || null,
        gender: formData.gender || null,
        birthEra: formData.birthYear ? formData.birthEra : null,
        birthDate: birthDate,
        deathEra: formData.deathYear ? formData.deathEra : null,
        deathDate: deathDate,
        biography: formData.biography.trim() || null,
        profileImageUrl: formData.profileImageUrl.trim() || null,
        countryId: formData.countryId || null,
      }

      await personApi.create(data)

      // 성공 시 인물 목록으로 이동
      if (presetCountryId) {
        navigate(-1) // 이전 페이지로 돌아가기
      } else {
        navigate('/persons')
      }
    } catch (error: any) {
      console.error('Failed to create person:', error)
      setErrors({
        submit:
          error?.message ||
          '인물 등록 중 오류가 발생했습니다. 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleCancel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          뒤로가기
        </BackButton>
        <HeaderTitle>
          <TitleIcon>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </TitleIcon>
          인물 등록
        </HeaderTitle>
      </Header>

      <Content>
        <Form onSubmit={handleSubmit}>
          {errors.submit && (
            <ErrorBanner>
              <ErrorIcon>⚠️</ErrorIcon>
              {errors.submit}
            </ErrorBanner>
          )}

          {/* 기본 정보 */}
          <Section>
            <SectionTitle>기본 정보</SectionTitle>
            <SectionDesc>인물의 이름과 기본 정보를 입력하세요</SectionDesc>

            <FormRow>
              <FormGroup $error={!!errors.name}>
                <Label>
                  이름 <Required>*</Required>
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="예: 홍길동"
                  autoFocus
                />
                {errors.name && <ErrorText>{errors.name}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>성</Label>
                <Input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="예: 김"
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label>성별</Label>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">선택하지 않음</option>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>프로필 이미지 URL</Label>
                <Input
                  type="url"
                  name="profileImageUrl"
                  value={formData.profileImageUrl}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="https://example.com/image.jpg"
                />
              </FormGroup>
            </FormRow>
          </Section>

          {/* 생년월일 */}
          <Section>
            <SectionTitle>생년월일</SectionTitle>
            <SectionDesc>출생 정보를 입력하세요 (선택사항)</SectionDesc>

            <DateRow>
              <EraSelect
                name="birthEra"
                value={formData.birthEra}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="AD">AD</option>
                <option value="BC">BC</option>
              </EraSelect>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="연도"
                  min="1"
                  max="9999"
                />
                <DateLabel>년</DateLabel>
                {errors.birthYear && <ErrorText>{errors.birthYear}</ErrorText>}
              </DateInputGroup>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="birthMonth"
                  value={formData.birthMonth}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="월"
                  min="1"
                  max="12"
                />
                <DateLabel>월</DateLabel>
                {errors.birthMonth && (
                  <ErrorText>{errors.birthMonth}</ErrorText>
                )}
              </DateInputGroup>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="birthDay"
                  value={formData.birthDay}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="일"
                  min="1"
                  max="31"
                />
                <DateLabel>일</DateLabel>
                {errors.birthDay && <ErrorText>{errors.birthDay}</ErrorText>}
              </DateInputGroup>
            </DateRow>
          </Section>

          {/* 사망일 */}
          <Section>
            <SectionTitle>사망일</SectionTitle>
            <SectionDesc>
              사망 정보를 입력하세요 (선택사항, 없으면 비워두세요)
            </SectionDesc>

            <DateRow>
              <EraSelect
                name="deathEra"
                value={formData.deathEra}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="AD">AD</option>
                <option value="BC">BC</option>
              </EraSelect>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="deathYear"
                  value={formData.deathYear}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="연도"
                  min="1"
                  max="9999"
                />
                <DateLabel>년</DateLabel>
                {errors.deathYear && <ErrorText>{errors.deathYear}</ErrorText>}
              </DateInputGroup>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="deathMonth"
                  value={formData.deathMonth}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="월"
                  min="1"
                  max="12"
                />
                <DateLabel>월</DateLabel>
                {errors.deathMonth && (
                  <ErrorText>{errors.deathMonth}</ErrorText>
                )}
              </DateInputGroup>

              <DateInputGroup>
                <DateInput
                  type="number"
                  name="deathDay"
                  value={formData.deathDay}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="일"
                  min="1"
                  max="31"
                />
                <DateLabel>일</DateLabel>
                {errors.deathDay && <ErrorText>{errors.deathDay}</ErrorText>}
              </DateInputGroup>
            </DateRow>
          </Section>

          {/* 소속 정보 */}
          <Section>
            <SectionTitle>소속 정보</SectionTitle>
            <SectionDesc>국가와 가문 정보를 선택하세요 (선택사항)</SectionDesc>

            <FormRow>
              <FormGroup>
                <Label>국가</Label>
                <Select
                  name="countryId"
                  value={formData.countryId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">선택하지 않음</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.flagEmoji} {country.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>가문</Label>
                <Select
                  name="dynastyId"
                  value={formData.dynastyId}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="">선택하지 않음</option>
                  {dynasties.map((dynasty) => (
                    <option key={dynasty.id} value={dynasty.id}>
                      {dynasty.name}
                    </option>
                  ))}
                </Select>
                <HintText>현재 API에서 가문 ID를 지원하지 않습니다</HintText>
              </FormGroup>
            </FormRow>
          </Section>

          {/* 전기 */}
          <Section>
            <SectionTitle>전기</SectionTitle>
            <SectionDesc>
              인물에 대한 상세 설명을 입력하세요 (선택사항)
            </SectionDesc>

            <FormGroup>
              <TextArea
                name="biography"
                value={formData.biography}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={12}
                placeholder="인물의 생애, 업적, 특징 등을 자유롭게 작성하세요..."
              />
              <CharCount $limit={formData.biography.length > 2000}>
                {formData.biography.length} / 2000
              </CharCount>
            </FormGroup>
          </Section>

          {/* 액션 버튼 */}
          <FormActions>
            <CancelButton
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              취소
            </CancelButton>
            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  등록 중...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  등록하기
                </>
              )}
            </SubmitButton>
          </FormActions>
        </Form>
      </Content>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  min-height: calc(100vh - var(--header-height));
  background: #fafafa;
  padding: 40px 0;
`

const Header = styled.div`
  max-width: 900px;
  margin: 0 auto 40px;
  padding: 0 32px;
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 24px;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  svg {
    stroke: #6b7280;
  }
`

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 800;
  color: #111827;
  margin: 0;
`

const TitleIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
`

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 32px;
`

const Form = styled.form`
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-bottom: 2px solid #fecaca;
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
`

const ErrorIcon = styled.span`
  font-size: 20px;
`

const Section = styled.div`
  padding: 40px 32px;
  border-bottom: 1px solid #f3f4f6;

  &:last-of-type {
    border-bottom: none;
  }
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
`

const SectionDesc = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px 0;
  line-height: 1.5;
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const FormGroup = styled.div<{ $error?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;

  ${({ $error }) =>
    $error &&
    `
    Input, Select, TextArea {
      border-color: #ef4444;
      background: #fef2f2;
    }
  `}
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
`

const Required = styled.span`
  color: #ef4444;
  font-size: 16px;
`

const Input = styled.input`
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const Select = styled.select`
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }
`

const TextArea = styled.textarea`
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }

  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const DateRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`

const EraSelect = styled(Select)`
  flex: 0 0 100px;
`

const DateInputGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DateInput = styled(Input)`
  flex: 1;
`

const DateLabel = styled.span`
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  padding-left: 4px;
`

const ErrorText = styled.span`
  font-size: 13px;
  color: #ef4444;
  font-weight: 500;
`

const HintText = styled.span`
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
`

const CharCount = styled.div<{ $limit: boolean }>`
  text-align: right;
  font-size: 13px;
  color: ${({ $limit }) => ($limit ? '#ef4444' : '#9ca3af')};
  font-weight: 500;
`

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 32px;
  background: #fafafa;
  border-top: 1px solid #e5e7eb;
`

const CancelButton = styled.button`
  height: 48px;
  padding: 0 28px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 32px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    stroke: #fff;
  }
`

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`
