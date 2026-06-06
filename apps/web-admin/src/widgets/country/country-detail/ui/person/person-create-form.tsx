import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAllPersons,
  createPerson,
  type CreatePersonDto as CreatePersonInput,
  type Era,
} from '@/shared/api/persons'
import { onContentRegistered } from '@/entities/gamification'
import { countryApi } from '@/shared/api/country'
import { dynastyApi } from '@/shared/api/dynasty'
import { jobApi } from '@/shared/api/job'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

interface PersonCreateFormProps {
  countryId: string
  onSuccess: () => void
  onCancel: () => void
}

interface FormData {
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
  influence: string
  profileImageUrl: string
  countryId: string
  dynastyId: string
  religionId: string
  denominationId: string
  jobId: string
  fatherId: string
  motherId: string
}

interface FormErrors {
  [key: string]: string
}

type Step = 1 | 2 | 3

export function PersonCreateForm({
  countryId,
  onSuccess,
  onCancel,
}: PersonCreateFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
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
    influence: '',
    profileImageUrl: '',
    countryId: countryId,
    dynastyId: '',
    religionId: '',
    denominationId: '',
    jobId: '',
    fatherId: '',
    motherId: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [countries, setCountries] = useState<any[]>([])
  const [dynasties, setDynasties] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [persons, setPersons] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesData, dynastiesData, jobsData, personsData] =
          await Promise.all([
            countryApi.getAll(),
            dynastyApi.getAll(),
            jobApi.getAll(),
            getAllPersons(),
          ])
        setCountries(countriesData)
        setDynasties(dynastiesData)
        setJobs(jobsData)
        setPersons(personsData)
      } catch {
        // ignore
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
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateStep = (step: Step): boolean => {
    const newErrors: FormErrors = {}

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = '이름은 필수 항목입니다'
      } else if (formData.name.trim().length < 2) {
        newErrors.name = '이름은 최소 2자 이상이어야 합니다'
      }

      if (formData.birthYear) {
        const year = parseInt(formData.birthYear)
        if (isNaN(year) || year < 1 || year > 9999) {
          newErrors.birthDate = '올바른 출생 연도를 입력하세요'
        }
      }

      if (formData.deathYear) {
        const year = parseInt(formData.deathYear)
        if (isNaN(year) || year < 1 || year > 9999) {
          newErrors.deathDate = '올바른 사망 연도를 입력하세요'
        }

        if (formData.birthYear && formData.deathYear) {
          const birthYear = parseInt(formData.birthYear)
          const deathYear = parseInt(formData.deathYear)
          if (
            formData.birthEra === formData.deathEra &&
            deathYear < birthYear
          ) {
            newErrors.deathDate = '사망일은 출생일 이후여야 합니다'
          }
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(3, prev + 1) as Step)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as Step)
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return
    }

    setIsSubmitting(true)

    try {
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
        influence: formData.influence !== '' ? parseInt(formData.influence, 10) : undefined,
        profileImageUrl: formData.profileImageUrl.trim() || null,
        countryId: formData.countryId || null,
      }

      const created = await createPerson(data)
      // 게이미피케이션 즉시 갱신 + 완성도 보너스 피드백 (사진·약력·출생연도)
      onContentRegistered(
        (created.profileImageUrl ? 1 : 0) +
          (created.biography ? 1 : 0) +
          (created.birthYear != null ? 1 : 0),
      )
      onSuccess()
    } catch (error: any) {
      setErrors({
        submit:
          error?.message ||
          '인물 등록 중 오류가 발생했습니다. 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = (currentStep / 3) * 100

  return (
    <Container>
      {/* Top Progress Bar */}
      <ProgressBar>
        <ProgressInfo>
          <ProgressTitle>인물 등록</ProgressTitle>
          <ProgressSteps>
            {currentStep === 1 && '기본 정보'}
            {currentStep === 2 && '소속 정보'}
            {currentStep === 3 && '가족 관계'}
            <ProgressBadge>{currentStep}/3</ProgressBadge>
          </ProgressSteps>
        </ProgressInfo>
        <ProgressTrack>
          <ProgressFill
            as={motion.div}
            initial={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </ProgressTrack>
      </ProgressBar>

      {errors.submit && (
        <ErrorBanner
          as={motion.div}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ErrorIcon>⚠️</ErrorIcon>
          <div>
            <ErrorTitle>오류 발생</ErrorTitle>
            <ErrorText>{errors.submit}</ErrorText>
          </div>
        </ErrorBanner>
      )}

      {/* Form Content */}
      <FormContent>
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <StepSection
              key="step1"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SectionCard>
                <CardHeader>
                  <CardTitle>인적 사항</CardTitle>
                  <CardDesc>기본 정보를 입력하세요</CardDesc>
                </CardHeader>
                <FormGrid>
                  <FormGroup $error={!!errors.name}>
                    <Label>
                      이름 <Required>*</Required>
                    </Label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="예: 홍길동"
                      autoFocus
                    />
                    {errors.name && <ErrorMsg>{errors.name}</ErrorMsg>}
                  </FormGroup>

                  <FormGroup>
                    <Label>성</Label>
                    <Input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                      placeholder="예: 김"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>성별</Label>
                    <Select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">선택</option>
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
                      placeholder="https://..."
                    />
                  </FormGroup>
                </FormGrid>
              </SectionCard>

              <SectionCard>
                <CardHeader>
                  <CardTitle>생년월일</CardTitle>
                  <CardDesc>출생 정보를 입력하세요</CardDesc>
                </CardHeader>
                <DateRow>
                  <DateGroup>
                    <SmallLabel>시대</SmallLabel>
                    <SmallSelect
                      name="birthEra"
                      value={formData.birthEra}
                      onChange={handleInputChange}
                    >
                      <option value="AD">AD</option>
                      <option value="BC">BC</option>
                    </SmallSelect>
                  </DateGroup>

                  <DateGroup $flex>
                    <SmallLabel>연도</SmallLabel>
                    <DateInput
                      type="number"
                      name="birthYear"
                      value={formData.birthYear}
                      onChange={handleInputChange}
                      placeholder="1990"
                    />
                  </DateGroup>

                  <DateGroup>
                    <SmallLabel>월</SmallLabel>
                    <DateInput
                      type="number"
                      name="birthMonth"
                      value={formData.birthMonth}
                      onChange={handleInputChange}
                      placeholder="1"
                      min="1"
                      max="12"
                    />
                  </DateGroup>

                  <DateGroup>
                    <SmallLabel>일</SmallLabel>
                    <DateInput
                      type="number"
                      name="birthDay"
                      value={formData.birthDay}
                      onChange={handleInputChange}
                      placeholder="1"
                      min="1"
                      max="31"
                    />
                  </DateGroup>
                </DateRow>
                {errors.birthDate && <ErrorMsg>{errors.birthDate}</ErrorMsg>}
              </SectionCard>

              <SectionCard>
                <CardHeader>
                  <CardTitle>사망일</CardTitle>
                  <CardDesc>사망 정보를 입력하세요 (선택)</CardDesc>
                </CardHeader>
                <DateRow>
                  <DateGroup>
                    <SmallLabel>시대</SmallLabel>
                    <SmallSelect
                      name="deathEra"
                      value={formData.deathEra}
                      onChange={handleInputChange}
                    >
                      <option value="AD">AD</option>
                      <option value="BC">BC</option>
                    </SmallSelect>
                  </DateGroup>

                  <DateGroup $flex>
                    <SmallLabel>연도</SmallLabel>
                    <DateInput
                      type="number"
                      name="deathYear"
                      value={formData.deathYear}
                      onChange={handleInputChange}
                      placeholder="2020"
                    />
                  </DateGroup>

                  <DateGroup>
                    <SmallLabel>월</SmallLabel>
                    <DateInput
                      type="number"
                      name="deathMonth"
                      value={formData.deathMonth}
                      onChange={handleInputChange}
                      placeholder="12"
                      min="1"
                      max="12"
                    />
                  </DateGroup>

                  <DateGroup>
                    <SmallLabel>일</SmallLabel>
                    <DateInput
                      type="number"
                      name="deathDay"
                      value={formData.deathDay}
                      onChange={handleInputChange}
                      placeholder="31"
                      min="1"
                      max="31"
                    />
                  </DateGroup>
                </DateRow>
                {errors.deathDate && <ErrorMsg>{errors.deathDate}</ErrorMsg>}
              </SectionCard>

              <SectionCard>
                <CardHeader>
                  <CardTitle>역사적 영향력</CardTitle>
                  <CardDesc>이 인물의 역사적 영향력을 설정하세요 (0 = 없음, 100 = 매우 높음)</CardDesc>
                </CardHeader>
                <FormGroup>
                  <InfluenceRow>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={formData.influence === '' ? 0 : parseInt(formData.influence, 10)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, influence: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <InfluenceValue>{formData.influence === '' ? 0 : formData.influence}</InfluenceValue>
                  </InfluenceRow>
                </FormGroup>
              </SectionCard>

              <SectionCard>
                <CardHeader>
                  <CardTitle>전기</CardTitle>
                  <CardDesc>인물에 대한 설명을 작성하세요</CardDesc>
                </CardHeader>
                <FormGroup>
                  <TextArea
                    name="biography"
                    value={formData.biography}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="인물의 생애, 업적, 특징 등을 작성하세요..."
                  />
                  <CharCount $limit={formData.biography.length > 2000}>
                    {formData.biography.length} / 2000
                  </CharCount>
                </FormGroup>
              </SectionCard>
            </StepSection>
          )}

          {currentStep === 2 && (
            <StepSection
              key="step2"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SectionCard>
                <CardHeader>
                  <CardTitle>소속 및 정체성</CardTitle>
                  <CardDesc>국가, 가문, 직업 등을 선택하세요</CardDesc>
                </CardHeader>
                <FormGrid>
                  <FormGroup>
                    <Label>국가</Label>
                    <Select
                      name="countryId"
                      value={formData.countryId}
                      onChange={handleInputChange}
                    >
                      <option value="">선택</option>
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
                    >
                      <option value="">선택</option>
                      {dynasties.map((dynasty) => (
                        <option key={dynasty.id} value={dynasty.id}>
                          {dynasty.name}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>직업</Label>
                    <Select
                      name="jobId"
                      value={formData.jobId}
                      onChange={handleInputChange}
                    >
                      <option value="">선택</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>종교</Label>
                    <Input type="text" placeholder="추후 지원" disabled />
                  </FormGroup>
                </FormGrid>

                <InfoBox>
                  <InfoText>
                    💡 모든 항목은 선택사항입니다. 나중에 수정할 수 있습니다.
                  </InfoText>
                </InfoBox>
              </SectionCard>
            </StepSection>
          )}

          {currentStep === 3 && (
            <StepSection
              key="step3"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SectionCard>
                <CardHeader>
                  <CardTitle>부모 정보</CardTitle>
                  <CardDesc>아버지와 어머니를 선택하세요</CardDesc>
                </CardHeader>
                <FormGrid>
                  <FormGroup>
                    <Label>아버지</Label>
                    <Select
                      name="fatherId"
                      value={formData.fatherId}
                      onChange={handleInputChange}
                    >
                      <option value="">선택</option>
                      {persons
                        .filter((p) => p.gender === '남성')
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {getPersonDisplayName(person)}
                            {person.birthYear && ` (${person.birthYear}~)`}
                          </option>
                        ))}
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>어머니</Label>
                    <Select
                      name="motherId"
                      value={formData.motherId}
                      onChange={handleInputChange}
                    >
                      <option value="">선택</option>
                      {persons
                        .filter((p) => p.gender === '여성')
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {getPersonDisplayName(person)}
                            {person.birthYear && ` (${person.birthYear}~)`}
                          </option>
                        ))}
                    </Select>
                  </FormGroup>
                </FormGrid>

                <InfoBox>
                  <InfoText>
                    💡 가족 관계는 선택사항입니다. 등록 후 추가할 수 있습니다.
                  </InfoText>
                </InfoBox>
              </SectionCard>

              <CompleteCard>
                <CompleteIcon>✅</CompleteIcon>
                <CompleteTitle>등록 준비 완료!</CompleteTitle>
                <CompleteDesc>
                  모든 정보를 확인했습니다. 등록 버튼을 눌러주세요.
                </CompleteDesc>
              </CompleteCard>
            </StepSection>
          )}
        </AnimatePresence>
      </FormContent>

      {/* Bottom Navigation */}
      <BottomNav>
        <NavGroup>
          <NavButton onClick={onCancel} $secondary disabled={isSubmitting}>
            취소
          </NavButton>
          {currentStep > 1 && (
            <NavButton onClick={handleBack} $secondary disabled={isSubmitting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              이전
            </NavButton>
          )}
        </NavGroup>

        {currentStep < 3 ? (
          <NavButton onClick={handleNext} disabled={isSubmitting}>
            다음
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </NavButton>
        ) : (
          <NavButton onClick={handleSubmit} disabled={isSubmitting} $primary>
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
                  />
                </svg>
                등록 완료
              </>
            )}
          </NavButton>
        )}
      </BottomNav>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const ProgressBar = styled.div`
  padding: 20px 0 16px;
  border-bottom: 1px solid #e2e8f0;
`

const ProgressInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`

const ProgressTitle = styled.h2`
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
`

const ProgressSteps = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
`

const ProgressBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  background: #0f172a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
`

const ProgressTrack = styled.div`
  height: 4px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #0f172a 0%, #334155 100%);
  border-radius: 999px;
`

const ErrorBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: #fef2f2;
  border-left: 4px solid #dc2626;
  border-radius: 8px;
  margin: 20px 0;
`

const ErrorIcon = styled.div`
  font-size: 20px;
  flex-shrink: 0;
`

const ErrorTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 4px;
`

const ErrorText = styled.div`
  font-size: 13px;
  color: #dc2626;
  font-weight: 500;
`

const FormContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
`

const StepSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SectionCard = styled.div`
  padding: 24px 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`

const CardHeader = styled.div`
  margin-bottom: 20px;
`

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
`

const CardDesc = styled.p`
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const FormGroup = styled.div<{ $error?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`

const Required = styled.span`
  color: #dc2626;
`

const Input = styled.input`
  height: 48px;
  padding: 0 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  background: #fff;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #64748b;
    box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.1);
  }

  &:disabled {
    background: #f8fafc;
    color: #cbd5e1;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #cbd5e1;
  }
`

const Select = styled.select`
  height: 48px;
  padding: 0 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #64748b;
    box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.1);
  }
`

const DateRow = styled.div`
  display: flex;
  gap: 12px;
`

const DateGroup = styled.div<{ $flex?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: ${({ $flex }) => ($flex ? 1 : '0 0 90px')};
`

const SmallLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
`

const SmallSelect = styled(Select)`
  height: 42px;
  font-size: 14px;
`

const DateInput = styled(Input)`
  height: 42px;
  font-size: 14px;
  text-align: center;
`

const TextArea = styled.textarea`
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  color: #0f172a;
  background: #fff;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #64748b;
    box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.1);
  }

  &::placeholder {
    color: #cbd5e1;
  }
`

const ErrorMsg = styled.span`
  font-size: 12px;
  color: #dc2626;
  font-weight: 600;
`

const CharCount = styled.div<{ $limit: boolean }>`
  text-align: right;
  font-size: 12px;
  color: ${({ $limit }) => ($limit ? '#dc2626' : '#94a3b8')};
  font-weight: 600;
  margin-top: 8px;
`

const InfoBox = styled.div`
  padding: 14px 16px;
  background: #f8fafc;
  border-left: 3px solid #64748b;
  border-radius: 6px;
  margin-top: 16px;
`

const InfoText = styled.p`
  font-size: 13px;
  color: #475569;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
`

const CompleteCard = styled.div`
  padding: 28px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-left: 4px solid #10b981;
  border-radius: 12px;
  text-align: center;
`

const CompleteIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`

const CompleteTitle = styled.h4`
  font-size: 20px;
  font-weight: 800;
  color: #065f46;
  margin: 0 0 8px 0;
`

const CompleteDesc = styled.p`
  font-size: 14px;
  color: #047857;
  font-weight: 500;
  margin: 0;
`

const BottomNav = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid #e2e8f0;
  gap: 12px;
`

const NavGroup = styled.div`
  display: flex;
  gap: 12px;
`

const NavButton = styled.button<{ $primary?: boolean; $secondary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 28px;
  border: 2px solid
    ${({ $primary, $secondary }) =>
      $primary ? '#10b981' : $secondary ? '#e2e8f0' : '#0f172a'};
  border-radius: 12px;
  background: ${({ $primary, $secondary }) =>
    $primary
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : $secondary
        ? '#fff'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'};
  color: ${({ $primary, $secondary }) =>
    $primary || !$secondary ? '#fff' : '#64748b'};
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: ${({ $primary, $secondary }) =>
    $primary
      ? '0 4px 12px rgba(16, 185, 129, 0.25)'
      : !$secondary
        ? '0 4px 12px rgba(15, 23, 42, 0.15)'
        : 'none'};

  &:hover:not(:disabled) {
    background: ${({ $primary, $secondary }) =>
      $primary
        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
        : $secondary
          ? '#f8fafc'
          : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'};
    transform: translateY(-2px);
    box-shadow: ${({ $primary, $secondary }) =>
      $primary
        ? '0 6px 16px rgba(16, 185, 129, 0.35)'
        : !$secondary
          ? '0 6px 16px rgba(15, 23, 42, 0.25)'
          : '0 2px 8px rgba(0, 0, 0, 0.04)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    stroke: ${({ $primary, $secondary }) =>
      $primary || !$secondary ? '#fff' : '#64748b'};
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

const InfluenceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='range'] {
    accent-color: #6366f1;
  }
`

const InfluenceValue = styled.span`
  min-width: 36px;
  text-align: right;
  font-size: 15px;
  font-weight: 700;
  color: #6366f1;
`
