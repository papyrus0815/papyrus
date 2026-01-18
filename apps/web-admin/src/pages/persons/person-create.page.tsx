import React, { useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiGlobe,
  FiHeart,
  FiPlus,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { GiCrossedSwords } from 'react-icons/gi'
import { IoFemaleSharp, IoMaleSharp } from 'react-icons/io5'
import { RiGovernmentLine } from 'react-icons/ri'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  ActionButton,
  ContentWrapper,
  DateInputDisplay,
  DateInputWrapper,
  DateRangeColumn,
  DateRangeLabel,
  DateRangeRow,
  FormArea,
  FormAreaHeader,
  FormAreaTitle,
  FormField,
  FormLabel,
  FormRow,
  FormSection,
  Hint,
  Input,
  PageWrapper,
  Required,
  TextArea,
} from '@/pages/events/create/event-create.styles'
import { getAllContinents } from '@/shared/api/continents'
import { getAllCountries } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllJobs } from '@/shared/api/jobs'
import {
  type CreatePersonInput,
  type Era,
  personApi,
} from '@/shared/api/person'
import { getAllReligions } from '@/shared/api/religions'
import { uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { StepNavigation } from '@/widgets/event-form/ui'

interface Career {
  id: string
  jobId: string
  jobName: string
  title: string
  organization: string
  startEra: Era
  startYear: string
  startMonth: string
  startDay: string
  endEra: Era
  endYear: string
  endMonth: string
  endDay: string
  isCurrent: boolean
  countryId: string
  note: string
  priority: number
}

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
  religionId: string
  jobId: string

  // 가족 관계
  fatherId: string
  motherId: string

  // 미상 플래그
  isBirthDateUnknown: boolean
  isDeathDateUnknown: boolean
}

interface FormErrors {
  [key: string]: string
}

export default function PersonCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCountryId = searchParams.get('countryId')
  const playClick = useClickSound()

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
    religionId: '',
    jobId: '',
    fatherId: '',
    motherId: '',
    isBirthDateUnknown: false,
    isDeathDateUnknown: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<any[]>([])
  const [dynasties, setDynasties] = useState<any[]>([])
  const [continentList, setContinentList] = useState<any[]>([])
  const [religions, setReligions] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [persons, setPersons] = useState<any[]>([])

  // 경력 상태
  const [careers, setCareers] = useState<Career[]>([])
  const [showCareerModal, setShowCareerModal] = useState(false)
  const [editingCareer, setEditingCareer] = useState<Career | null>(null)
  const [currentStep, setCurrentStep] = useState<'basic' | 'career'>('basic')

  // 모달 상태
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)

  // 검색 상태
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [dynastySearchTerm, setDynastySearchTerm] = useState('')
  const [religionSearchTerm, setReligionSearchTerm] = useState('')
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [fatherSearchTerm, setFatherSearchTerm] = useState('')
  const [motherSearchTerm, setMotherSearchTerm] = useState('')
  const [countryType, setCountryType] = useState<'modern' | 'historical'>(
    'modern',
  )
  const [selectedContinent, setSelectedContinent] = useState<string>('all')
  const [selectedParentCountry, setSelectedParentCountry] =
    useState<string>('all')

  // 이미지 업로드 상태
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    loadEntities()
  }, [])

  const loadEntities = async () => {
    try {
      const [
        countriesData,
        historicalCountriesData,
        dynastiesData,
        continentsData,
        religionsData,
        jobsData,
        personsData,
      ] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
        dynastyApi.getAll(),
        getAllContinents(),
        getAllReligions(),
        getAllJobs(),
        personApi.getAll(),
      ])

      console.log('Modern countries:', countriesData)
      console.log('Historical countries:', historicalCountriesData)
      console.log('Continents:', continentsData)

      setCountries(countriesData || [])
      setHistoricalCountries(historicalCountriesData || [])
      setDynasties(dynastiesData || [])
      setContinentList(continentsData || [])
      setReligions(religionsData || [])
      setJobs(jobsData || [])
      setPersons(personsData || [])
    } catch (error) {
      console.error('Failed to load entities:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    }
  }

  // 나이 계산
  const calculatedAge = useMemo(() => {
    if (!formData.birthYear || !formData.deathYear) return null
    if (formData.isBirthDateUnknown || formData.isDeathDateUnknown) return null

    const birthYear = parseInt(formData.birthYear, 10)
    const deathYear = parseInt(formData.deathYear, 10)

    if (isNaN(birthYear) || isNaN(deathYear)) return null

    let age = 0

    // BC와 AD 조합에 따른 나이 계산
    if (formData.birthEra === 'BC' && formData.deathEra === 'BC') {
      // 둘 다 BC: 큰 수에서 작은 수를 뺌 (BC 100 -> BC 50 = 50세)
      age = birthYear - deathYear
    } else if (formData.birthEra === 'BC' && formData.deathEra === 'AD') {
      // BC에서 AD로: 두 수를 더함 (BC 1년 -> AD 1년 사이는 1년이 없음을 고려)
      age = birthYear + deathYear - 1
    } else {
      // 둘 다 AD: 일반적인 계산
      age = deathYear - birthYear
    }

    // 월/일이 있으면 더 정확한 나이 계산
    if (formData.birthMonth && formData.deathMonth) {
      const birthMonth = parseInt(formData.birthMonth, 10)
      const deathMonth = parseInt(formData.deathMonth, 10)

      if (deathMonth < birthMonth) {
        age -= 1
      } else if (
        deathMonth === birthMonth &&
        formData.birthDay &&
        formData.deathDay
      ) {
        const birthDay = parseInt(formData.birthDay, 10)
        const deathDay = parseInt(formData.deathDay, 10)
        if (deathDay < birthDay) {
          age -= 1
        }
      }
    }

    return age > 0 ? age : null
  }, [
    formData.birthYear,
    formData.birthMonth,
    formData.birthDay,
    formData.deathYear,
    formData.deathMonth,
    formData.deathDay,
    formData.birthEra,
    formData.deathEra,
    formData.isBirthDateUnknown,
    formData.isDeathDateUnknown,
  ])

  const selectedCountry = useMemo(() => {
    if (!formData.countryId) return null
    return (
      countries.find((c) => c.id === formData.countryId) ||
      historicalCountries.find((c) => c.id === formData.countryId)
    )
  }, [formData.countryId, countries, historicalCountries])

  const selectedDynasty = useMemo(() => {
    if (!formData.dynastyId) return null
    return dynasties.find((d) => d.id === formData.dynastyId)
  }, [formData.dynastyId, dynasties])

  const selectedReligion = useMemo(() => {
    if (!formData.religionId) return null
    return religions.find((r) => r.id === formData.religionId)
  }, [formData.religionId, religions])

  const selectedJob = useMemo(() => {
    if (!formData.jobId) return null
    return jobs.find((j) => j.id === formData.jobId)
  }, [formData.jobId, jobs])

  const selectedFather = useMemo(() => {
    if (!formData.fatherId) return null
    return persons.find((p) => p.id === formData.fatherId)
  }, [formData.fatherId, persons])

  const selectedMother = useMemo(() => {
    if (!formData.motherId) return null
    return persons.find((p) => p.id === formData.motherId)
  }, [formData.motherId, persons])

  // 대륙 목록 추출
  // 대륙 목록 (continentId를 name으로 변환)
  const continents = useMemo(() => {
    const sourceList =
      countryType === 'modern' ? countries : historicalCountries
    const continentIds = new Set(
      sourceList.map((c) => c.continentId).filter(Boolean),
    )

    // continentId를 대륙 이름으로 변환
    const continentNames = Array.from(continentIds)
      .map((id) => {
        const continent = continentList.find((cont) => cont.id === id)
        return continent ? continent.name : null
      })
      .filter(Boolean)

    return continentNames.sort()
  }, [countries, historicalCountries, countryType, continentList])

  // 상위 국가 목록
  const parentCountries = useMemo(() => {
    const sourceList =
      countryType === 'modern' ? countries : historicalCountries
    return sourceList.filter((c) => !c.parentCountryId)
  }, [countries, historicalCountries, countryType])

  const filteredCountries = useMemo(() => {
    let sourceList = countryType === 'modern' ? countries : historicalCountries

    // 대륙 필터
    if (selectedContinent !== 'all') {
      // 대륙 이름으로 continentId 찾기
      const selectedContinentObj = continentList.find(
        (c) => c.name === selectedContinent,
      )
      if (selectedContinentObj) {
        sourceList = sourceList.filter(
          (c) => c.continentId === selectedContinentObj.id,
        )
      }
    }

    // 상위 국가 필터
    if (selectedParentCountry !== 'all') {
      sourceList = sourceList.filter(
        (c) => c.parentCountryId === selectedParentCountry,
      )
    }

    // 검색어 필터
    if (countrySearchTerm) {
      sourceList = sourceList.filter((country) =>
        country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()),
      )
    }

    return sourceList
  }, [
    countries,
    historicalCountries,
    countrySearchTerm,
    countryType,
    selectedContinent,
    selectedParentCountry,
    continentList,
  ])

  const filteredDynasties = useMemo(() => {
    if (!dynastySearchTerm) return dynasties

    return dynasties.filter((dynasty) =>
      dynasty.name.toLowerCase().includes(dynastySearchTerm.toLowerCase()),
    )
  }, [dynasties, dynastySearchTerm])

  const filteredReligions = useMemo(() => {
    if (!religionSearchTerm) return religions

    return religions.filter((religion) =>
      religion.name.toLowerCase().includes(religionSearchTerm.toLowerCase()),
    )
  }, [religions, religionSearchTerm])

  const filteredJobs = useMemo(() => {
    if (!jobSearchTerm) return jobs

    return jobs.filter((job) =>
      job.name.toLowerCase().includes(jobSearchTerm.toLowerCase()),
    )
  }, [jobs, jobSearchTerm])

  const filteredFathers = useMemo(() => {
    let filtered = persons.filter((p) => p.gender === '남')

    if (fatherSearchTerm) {
      filtered = filtered.filter((person) => {
        const fullName = `${person.surname || ''} ${person.name}`.trim()
        return fullName.toLowerCase().includes(fatherSearchTerm.toLowerCase())
      })
    }

    return filtered
  }, [persons, fatherSearchTerm])

  const filteredMothers = useMemo(() => {
    let filtered = persons.filter((p) => p.gender === '여')

    if (motherSearchTerm) {
      filtered = filtered.filter((person) => {
        const fullName = `${person.surname || ''} ${person.name}`.trim()
        return fullName.toLowerCase().includes(motherSearchTerm.toLowerCase())
      })
    }

    return filtered
  }, [persons, motherSearchTerm])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  // 경력 관리 함수
  const handleAddCareer = () => {
    setEditingCareer({
      id: Date.now().toString(),
      jobId: '',
      jobName: '',
      title: '',
      organization: '',
      startEra: 'AD',
      startYear: '',
      startMonth: '',
      startDay: '',
      endEra: 'AD',
      endYear: '',
      endMonth: '',
      endDay: '',
      isCurrent: false,
      countryId: '',
      note: '',
      priority: careers.length,
    })
    setShowCareerModal(true)
  }

  const handleEditCareer = (career: Career) => {
    setEditingCareer({ ...career })
    setShowCareerModal(true)
  }

  const handleSaveCareer = () => {
    if (!editingCareer) return

    if (!editingCareer.jobId) {
      toast.error('직업을 선택해주세요.')
      return
    }

    const existingIndex = careers.findIndex((c) => c.id === editingCareer.id)
    if (existingIndex >= 0) {
      // 수정
      const updated = [...careers]
      updated[existingIndex] = editingCareer
      setCareers(updated)
      toast.success('경력이 수정되었습니다.')
      setEditingCareer(null)
    } else {
      // 추가
      setCareers([...careers, editingCareer])
      toast.success('경력이 추가되었습니다.')
      // 추가 후에는 폼을 초기화하지 않고 계속 입력할 수 있게 유지
      // 단, 새로운 경력을 위해 ID만 새로 생성
      setEditingCareer({
        id: Date.now().toString(),
        jobId: '',
        jobName: '',
        title: '',
        organization: '',
        startEra: 'AD',
        startYear: '',
        startMonth: '',
        startDay: '',
        endEra: 'AD',
        endYear: '',
        endMonth: '',
        endDay: '',
        isCurrent: false,
        countryId: '',
        note: '',
        priority: careers.length + 1,
      })
    }

    setShowCareerModal(false)
  }

  const handleDeleteCareer = (careerId: string) => {
    if (!confirm('이 경력을 삭제하시겠습니까?')) return

    setCareers(careers.filter((c) => c.id !== careerId))
    toast.success('경력이 삭제되었습니다.')
  }

  const handleCareerInputChange = (field: keyof Career, value: any) => {
    if (!editingCareer) return
    setEditingCareer({ ...editingCareer, [field]: value })
  }

  const formatCareerDate = (career: Career, type: 'start' | 'end') => {
    const era = type === 'start' ? career.startEra : career.endEra
    const year = type === 'start' ? career.startYear : career.endYear
    const month = type === 'start' ? career.startMonth : career.endMonth
    const day = type === 'start' ? career.startDay : career.endDay

    if (!year) return '미정'

    let dateStr = `${era === 'BC' ? 'BC ' : ''}${year}`
    if (month) dateStr += `.${month.padStart(2, '0')}`
    if (day) dateStr += `.${day.padStart(2, '0')}`

    return dateStr
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploadingImage(true)
    try {
      const imageUrl = await uploadImage(file)
      handleInputChange('profileImageUrl', imageUrl)
      toast.success('이미지가 업로드되었습니다.')
    } catch (error) {
      console.error('Image upload failed:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleBirthDateSelect = (
    era: Era,
    year: number,
    month: number,
    day: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      birthEra: era,
      birthYear: year.toString(),
      birthMonth: month.toString(),
      birthDay: day.toString(),
    }))
    setShowBirthDateModal(false)
  }

  const handleDeathDateSelect = (
    era: Era,
    year: number,
    month: number,
    day: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      deathEra: era,
      deathYear: year.toString(),
      deathMonth: month.toString(),
      deathDay: day.toString(),
    }))
    setShowDeathDateModal(false)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }

    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    playClick()

    if (!validateForm()) {
      toast.error('필수 항목을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const input: CreatePersonInput = {
        name: formData.name.trim(),
        surname: formData.surname.trim() || undefined,
        gender: formData.gender,
        biography: formData.biography.trim() || undefined,
        profileImageUrl: formData.profileImageUrl || undefined,
        countryId: formData.countryId || undefined,
        dynastyId: formData.dynastyId || undefined,
        religionId: formData.religionId || undefined,
        jobId: formData.jobId || undefined,
        fatherId: formData.fatherId || undefined,
        motherId: formData.motherId || undefined,
      }

      // 출생일이 미상이 아닐 경우에만 포함
      if (!formData.isBirthDateUnknown) {
        if (formData.birthYear) {
          input.birth = {
            era: formData.birthEra,
            year: parseInt(formData.birthYear),
            month: formData.birthMonth
              ? parseInt(formData.birthMonth)
              : undefined,
            day: formData.birthDay ? parseInt(formData.birthDay) : undefined,
          }
        }
      }

      // 사망일이 미상이 아닐 경우에만 포함
      if (!formData.isDeathDateUnknown) {
        if (formData.deathYear) {
          input.death = {
            era: formData.deathEra,
            year: parseInt(formData.deathYear),
            month: formData.deathMonth
              ? parseInt(formData.deathMonth)
              : undefined,
            day: formData.deathDay ? parseInt(formData.deathDay) : undefined,
          }
        }
      }

      console.log('Submitting person data:', input)

      await personApi.create(input)
      toast.success('인물이 등록되었습니다.')
      navigate('/persons')
    } catch (error: any) {
      console.error('Person creation failed:', error)

      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.error?.details?.errors) {
          const validationErrors = errorData.error.details.errors
          toast.error(
            `등록 실패: ${validationErrors.map((e: any) => Object.values(e.constraints || {}).join(', ')).join(', ')}`,
          )
        } else {
          toast.error(
            `등록 실패: ${errorData.error?.message || '알 수 없는 오류'}`,
          )
        }
      } else {
        toast.error('인물 등록에 실패했습니다.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { id: 'basic', label: '기본 정보', icon: FiUser, color: '#a78bfa' },
    { id: 'career', label: '경력 사항', icon: FiBriefcase, color: '#06b6d4' },
  ]

  const formatBirthDate = () => {
    if (formData.isBirthDateUnknown) return '출생일 미상'
    if (!formData.birthYear) return '출생일 선택'

    let dateStr = `${formData.birthEra} ${formData.birthYear}`
    if (formData.birthMonth)
      dateStr += `.${formData.birthMonth.padStart(2, '0')}`
    if (formData.birthDay) dateStr += `.${formData.birthDay.padStart(2, '0')}`
    return dateStr
  }

  const formatDeathDate = () => {
    if (formData.isDeathDateUnknown) return '사망일 미상'
    if (!formData.deathYear) return '사망일 선택'

    let dateStr = `${formData.deathEra} ${formData.deathYear}`
    if (formData.deathMonth)
      dateStr += `.${formData.deathMonth.padStart(2, '0')}`
    if (formData.deathDay) dateStr += `.${formData.deathDay.padStart(2, '0')}`
    return dateStr
  }

  return (
    <PageWrapper>
      <ContentWrapper>
        {/* 좌측: 네비게이션 */}
        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          playClickSound={playClick}
          onBack={() => navigate('/persons')}
        />

        {/* 우측: 폼 영역 */}
        <FormArea>
          <FormAreaHeader>
            <FormAreaTitle>인물 등록</FormAreaTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ActionButton
                type="button"
                $variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <FiSave />
                {isSubmitting ? '등록 중...' : '등록'}
              </ActionButton>
            </div>
          </FormAreaHeader>

          <FormContent>
            {/* 기본 정보 단계 */}
            {currentStep === 'basic' && (
              <FormSection>
                {/* 프로필 이미지 */}
                <FormRow>
                  <FormLabel>프로필 이미지</FormLabel>
                  <FormField>
                    <ProfileImageContainer>
                      <ProfileImagePreview>
                        {formData.profileImageUrl ? (
                          <ProfileImage
                            src={formData.profileImageUrl}
                            alt="프로필"
                          />
                        ) : (
                          <ProfileImagePlaceholder>
                            <FiUser size={32} />
                          </ProfileImagePlaceholder>
                        )}
                      </ProfileImagePreview>
                      <ProfileImageActions>
                        <SelectButton
                          as="label"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <FiUpload size={16} />
                          {isUploadingImage ? '업로드 중...' : '이미지 업로드'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            disabled={isUploadingImage}
                          />
                        </SelectButton>
                        {formData.profileImageUrl && (
                          <RemoveImageButton
                            onClick={() =>
                              handleInputChange('profileImageUrl', '')
                            }
                          >
                            <FiX size={16} />
                          </RemoveImageButton>
                        )}
                      </ProfileImageActions>
                    </ProfileImageContainer>
                  </FormField>
                </FormRow>

                {/* 이름과 성 (한 줄) */}
                <FormRow>
                  <FormLabel>
                    이름 <Required>*</Required>
                  </FormLabel>
                  <FormField>
                    <NameRow>
                      <NameInputWrapper>
                        <NameLabel>성</NameLabel>
                        <Input
                          type="text"
                          placeholder="성 (선택)"
                          value={formData.surname}
                          onChange={(e) =>
                            handleInputChange('surname', e.target.value)
                          }
                        />
                      </NameInputWrapper>
                      <NameInputWrapper>
                        <NameLabel>이름</NameLabel>
                        <Input
                          type="text"
                          placeholder="이름"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange('name', e.target.value)
                          }
                          $hasError={!!errors.name}
                        />
                      </NameInputWrapper>
                    </NameRow>
                    {errors.name && <ErrorText>{errors.name}</ErrorText>}
                    <Hint>성과 이름을 각각 입력하세요 (이름은 필수)</Hint>
                  </FormField>
                </FormRow>

                {/* 성별 */}
                <FormRow>
                  <FormLabel>
                    성별 <Required>*</Required>
                  </FormLabel>
                  <FormField>
                    <GenderButtonGroup>
                      <SelectButton
                        $selected={formData.gender === '남'}
                        onClick={() => handleInputChange('gender', '남')}
                      >
                        <IoMaleSharp style={{ color: '#3b82f6' }} />
                        남성
                      </SelectButton>
                      <SelectButton
                        $selected={formData.gender === '여'}
                        onClick={() => handleInputChange('gender', '여')}
                      >
                        <IoFemaleSharp style={{ color: '#ec4899' }} />
                        여성
                      </SelectButton>
                    </GenderButtonGroup>
                    {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
                  </FormField>
                </FormRow>

                {/* 생몰 정보 */}
                <FormRow>
                  <FormLabel>생몰 정보</FormLabel>
                  <FormField>
                    <LifespanContainer>
                      <LifespanRow>
                        {/* 출생 */}
                        <LifespanItem>
                          <LifespanLabelRow>
                            <LifespanLabel>출생</LifespanLabel>
                            <CustomCheckbox>
                              <input
                                type="checkbox"
                                checked={formData.isBirthDateUnknown}
                                onChange={(e) => {
                                  handleInputChange(
                                    'isBirthDateUnknown',
                                    e.target.checked,
                                  )
                                  if (e.target.checked) {
                                    handleInputChange('birthYear', '')
                                    handleInputChange('birthMonth', '')
                                    handleInputChange('birthDay', '')
                                  }
                                }}
                              />
                              <span className="checkmark">
                                <FiCheck size={12} />
                              </span>
                              <span className="label">미상</span>
                            </CustomCheckbox>
                          </LifespanLabelRow>
                          {formData.isBirthDateUnknown ? (
                            <UnknownDateBox>
                              <span className="icon">❓</span>
                              <span className="text">미상</span>
                            </UnknownDateBox>
                          ) : (
                            <DateButton
                              onClick={() => setShowBirthDateModal(true)}
                              $hasValue={!!formData.birthYear}
                            >
                              <FiCalendar />
                              <span>{formatBirthDate()}</span>
                            </DateButton>
                          )}
                        </LifespanItem>

                        <LifespanSeparator>~</LifespanSeparator>

                        {/* 사망 */}
                        <LifespanItem>
                          <LifespanLabelRow>
                            <LifespanLabel>사망</LifespanLabel>
                            <CustomCheckbox>
                              <input
                                type="checkbox"
                                checked={formData.isDeathDateUnknown}
                                onChange={(e) => {
                                  handleInputChange(
                                    'isDeathDateUnknown',
                                    e.target.checked,
                                  )
                                  if (e.target.checked) {
                                    handleInputChange('deathYear', '')
                                    handleInputChange('deathMonth', '')
                                    handleInputChange('deathDay', '')
                                  }
                                }}
                              />
                              <span className="checkmark">
                                <FiCheck size={12} />
                              </span>
                              <span className="label">미상</span>
                            </CustomCheckbox>
                          </LifespanLabelRow>
                          {formData.isDeathDateUnknown ? (
                            <UnknownDateBox>
                              <span className="icon">❓</span>
                              <span className="text">미상</span>
                            </UnknownDateBox>
                          ) : (
                            <DateButton
                              onClick={() => setShowDeathDateModal(true)}
                              $hasValue={!!formData.deathYear}
                            >
                              <FiCalendar />
                              <span>{formatDeathDate()}</span>
                            </DateButton>
                          )}
                        </LifespanItem>
                      </LifespanRow>

                      {/* 나이 표시 */}
                      {calculatedAge !== null && (
                        <AgeDisplayRow>
                          <AgeDisplay>향년 {calculatedAge}세</AgeDisplay>
                        </AgeDisplayRow>
                      )}
                    </LifespanContainer>
                  </FormField>
                </FormRow>

                {/* 국가 및 가문 - 카드 스타일 */}
                <FormRow>
                  <FormLabel>국가 및 가문</FormLabel>
                  <FormField>
                    <PrimarySelectionGrid>
                      {/* 국가 */}
                      <PrimarySelectionCard
                        $hasValue={!!formData.countryId}
                        $color="#3b82f6"
                        onClick={() => setShowCountryModal(true)}
                        type="button"
                      >
                        <PrimarySelectionCardIcon $color="#3b82f6">
                          <FiGlobe />
                        </PrimarySelectionCardIcon>
                        <PrimarySelectionCardContent>
                          <PrimarySelectionCardLabel>
                            국가
                          </PrimarySelectionCardLabel>
                          <PrimarySelectionCardValue
                            $hasValue={!!formData.countryId}
                          >
                            {selectedCountry
                              ? selectedCountry.name
                              : '국가를 선택하세요'}
                          </PrimarySelectionCardValue>
                        </PrimarySelectionCardContent>
                      </PrimarySelectionCard>

                      {/* 가문 */}
                      <PrimarySelectionCard
                        $hasValue={!!formData.dynastyId}
                        $color="#f59e0b"
                        onClick={() => setShowDynastyModal(true)}
                        type="button"
                      >
                        <PrimarySelectionCardIcon $color="#f59e0b">
                          <GiCrossedSwords />
                        </PrimarySelectionCardIcon>
                        <PrimarySelectionCardContent>
                          <PrimarySelectionCardLabel>
                            가문
                          </PrimarySelectionCardLabel>
                          <PrimarySelectionCardValue
                            $hasValue={!!formData.dynastyId}
                          >
                            {selectedDynasty
                              ? selectedDynasty.name
                              : '가문을 선택하세요'}
                          </PrimarySelectionCardValue>
                        </PrimarySelectionCardContent>
                      </PrimarySelectionCard>
                    </PrimarySelectionGrid>
                  </FormField>
                </FormRow>

                {/* 소속 및 관계 정보 - 카드 스타일 */}
                <FormRow>
                  <FormLabel>소속 및 관계 정보</FormLabel>
                  <FormField>
                    <SelectionCardsGrid>
                      {/* 종교 */}
                      <SelectionCard
                        $hasValue={!!formData.religionId}
                        $color="#8b5cf6"
                        onClick={() => setShowReligionModal(true)}
                        type="button"
                      >
                        <SelectionCardIcon $color="#8b5cf6">
                          <FiHeart />
                        </SelectionCardIcon>
                        <SelectionCardContent>
                          <SelectionCardLabel>종교</SelectionCardLabel>
                          <SelectionCardValue $hasValue={!!formData.religionId}>
                            {selectedReligion
                              ? selectedReligion.name
                              : '선택하세요'}
                          </SelectionCardValue>
                        </SelectionCardContent>
                      </SelectionCard>

                      {/* 직업 */}
                      <SelectionCard
                        $hasValue={!!formData.jobId}
                        $color="#06b6d4"
                        onClick={() => setShowJobModal(true)}
                        type="button"
                      >
                        <SelectionCardIcon $color="#06b6d4">
                          <FiBriefcase />
                        </SelectionCardIcon>
                        <SelectionCardContent>
                          <SelectionCardLabel>직업</SelectionCardLabel>
                          <SelectionCardValue $hasValue={!!formData.jobId}>
                            {selectedJob ? selectedJob.name : '선택하세요'}
                          </SelectionCardValue>
                        </SelectionCardContent>
                      </SelectionCard>

                      {/* 아버지 */}
                      <SelectionCard
                        $hasValue={!!formData.fatherId}
                        $color="#10b981"
                        onClick={() => setShowFatherModal(true)}
                        type="button"
                      >
                        <SelectionCardIcon $color="#10b981">
                          <FiUser />
                        </SelectionCardIcon>
                        <SelectionCardContent>
                          <SelectionCardLabel>아버지</SelectionCardLabel>
                          <SelectionCardValue $hasValue={!!formData.fatherId}>
                            {selectedFather
                              ? `${selectedFather.surname || ''} ${selectedFather.name}`.trim()
                              : '선택하세요'}
                          </SelectionCardValue>
                        </SelectionCardContent>
                      </SelectionCard>

                      {/* 어머니 */}
                      <SelectionCard
                        $hasValue={!!formData.motherId}
                        $color="#ec4899"
                        onClick={() => setShowMotherModal(true)}
                        type="button"
                      >
                        <SelectionCardIcon $color="#ec4899">
                          <FiUsers />
                        </SelectionCardIcon>
                        <SelectionCardContent>
                          <SelectionCardLabel>어머니</SelectionCardLabel>
                          <SelectionCardValue $hasValue={!!formData.motherId}>
                            {selectedMother
                              ? `${selectedMother.surname || ''} ${selectedMother.name}`.trim()
                              : '선택하세요'}
                          </SelectionCardValue>
                        </SelectionCardContent>
                      </SelectionCard>
                    </SelectionCardsGrid>
                  </FormField>
                </FormRow>

                {/* 약력 */}
                <FormRow>
                  <FormLabel>약력</FormLabel>
                  <FormField>
                    <TextArea
                      placeholder="인물의 약력을 입력하세요"
                      value={formData.biography}
                      onChange={(e) =>
                        handleInputChange('biography', e.target.value)
                      }
                      rows={6}
                    />
                  </FormField>
                </FormRow>
              </FormSection>
            )}

            {/* 경력 사항 단계 */}
            {currentStep === 'career' && (
              <FormSection>
                <CareerManagementSection>
                  <CareerHeader>
                    <CareerHeaderTitle>
                      <FiBriefcase />
                      <span>경력 타임라인</span>
                      <CareerCount>{careers.length}</CareerCount>
                    </CareerHeaderTitle>
                    <AddCareerButton onClick={handleAddCareer} type="button">
                      <FiPlus />
                      경력 추가
                    </AddCareerButton>
                  </CareerHeader>

                  {editingCareer && (
                    <CareerEditForm>
                      <CareerFormHeader>
                        <CareerFormTitle>
                          <FiBriefcase />
                          {careers.find((c) => c.id === editingCareer.id)
                            ? '경력 수정'
                            : '새 경력 추가'}
                        </CareerFormTitle>
                        <IconButton
                          onClick={() => setEditingCareer(null)}
                          type="button"
                        >
                          <FiX />
                        </IconButton>
                      </CareerFormHeader>

                      <CareerFormBody>
                        <FormRow>
                          <FormLabel>
                            직업 <Required>*</Required>
                          </FormLabel>
                          <FormField>
                            <SelectButton
                              type="button"
                              onClick={() => setShowJobModal(true)}
                              $selected={!!editingCareer.jobId}
                            >
                              {editingCareer.jobName || '직업 선택'}
                            </SelectButton>
                          </FormField>
                        </FormRow>

                        <FormRow>
                          <FormLabel>직책/직위</FormLabel>
                          <FormField>
                            <Input
                              type="text"
                              placeholder="예: 제32대 대통령, 해군차관"
                              value={editingCareer.title}
                              onChange={(e) =>
                                handleCareerInputChange('title', e.target.value)
                              }
                            />
                          </FormField>
                        </FormRow>

                        <FormRow>
                          <FormLabel>소속 조직</FormLabel>
                          <FormField>
                            <Input
                              type="text"
                              placeholder="예: 미국 정부, 뉴욕주"
                              value={editingCareer.organization}
                              onChange={(e) =>
                                handleCareerInputChange(
                                  'organization',
                                  e.target.value,
                                )
                              }
                            />
                          </FormField>
                        </FormRow>

                        <FormRow>
                          <FormLabel>시작일</FormLabel>
                          <FormField>
                            <DateRangeRow>
                              <Input
                                type="number"
                                placeholder="년"
                                value={editingCareer.startYear}
                                onChange={(e) =>
                                  handleCareerInputChange(
                                    'startYear',
                                    e.target.value,
                                  )
                                }
                                style={{ width: '100px' }}
                              />
                              <Input
                                type="number"
                                placeholder="월"
                                value={editingCareer.startMonth}
                                onChange={(e) =>
                                  handleCareerInputChange(
                                    'startMonth',
                                    e.target.value,
                                  )
                                }
                                style={{ width: '80px' }}
                                min="1"
                                max="12"
                              />
                              <Input
                                type="number"
                                placeholder="일"
                                value={editingCareer.startDay}
                                onChange={(e) =>
                                  handleCareerInputChange(
                                    'startDay',
                                    e.target.value,
                                  )
                                }
                                style={{ width: '80px' }}
                                min="1"
                                max="31"
                              />
                            </DateRangeRow>
                          </FormField>
                        </FormRow>

                        <FormRow>
                          <FormLabel>
                            <CheckboxLabel>
                              <input
                                type="checkbox"
                                checked={editingCareer.isCurrent}
                                onChange={(e) =>
                                  handleCareerInputChange(
                                    'isCurrent',
                                    e.target.checked,
                                  )
                                }
                              />
                              현재 재직중
                            </CheckboxLabel>
                          </FormLabel>
                        </FormRow>

                        {!editingCareer.isCurrent && (
                          <FormRow>
                            <FormLabel>종료일</FormLabel>
                            <FormField>
                              <DateRangeRow>
                                <Input
                                  type="number"
                                  placeholder="년"
                                  value={editingCareer.endYear}
                                  onChange={(e) =>
                                    handleCareerInputChange(
                                      'endYear',
                                      e.target.value,
                                    )
                                  }
                                  style={{ width: '100px' }}
                                />
                                <Input
                                  type="number"
                                  placeholder="월"
                                  value={editingCareer.endMonth}
                                  onChange={(e) =>
                                    handleCareerInputChange(
                                      'endMonth',
                                      e.target.value,
                                    )
                                  }
                                  style={{ width: '80px' }}
                                  min="1"
                                  max="12"
                                />
                                <Input
                                  type="number"
                                  placeholder="일"
                                  value={editingCareer.endDay}
                                  onChange={(e) =>
                                    handleCareerInputChange(
                                      'endDay',
                                      e.target.value,
                                    )
                                  }
                                  style={{ width: '80px' }}
                                  min="1"
                                  max="31"
                                />
                              </DateRangeRow>
                            </FormField>
                          </FormRow>
                        )}

                        <FormRow>
                          <FormLabel>비고</FormLabel>
                          <FormField>
                            <TextArea
                              placeholder="추가 설명이나 특이사항"
                              value={editingCareer.note}
                              onChange={(e) =>
                                handleCareerInputChange('note', e.target.value)
                              }
                              rows={3}
                            />
                          </FormField>
                        </FormRow>

                        <FormRow>
                          <FormLabel>
                            <CheckboxLabel>
                              <input
                                type="checkbox"
                                checked={editingCareer.priority === 0}
                                onChange={(e) =>
                                  handleCareerInputChange(
                                    'priority',
                                    e.target.checked ? 0 : careers.length,
                                  )
                                }
                              />
                              주요 경력으로 표시
                            </CheckboxLabel>
                          </FormLabel>
                        </FormRow>

                        <CareerFormActions>
                          <ActionButton
                            type="button"
                            onClick={() => setEditingCareer(null)}
                          >
                            취소
                          </ActionButton>
                          <ActionButton
                            type="button"
                            $variant="primary"
                            onClick={handleSaveCareer}
                          >
                            저장
                          </ActionButton>
                        </CareerFormActions>
                      </CareerFormBody>
                    </CareerEditForm>
                  )}

                  {careers.length === 0 && !editingCareer ? (
                    <EmptyCareerMessage>
                      <FiBriefcase size={48} />
                      <p>등록된 경력이 없습니다</p>
                      <span>+ 버튼을 눌러 경력을 추가하세요</span>
                    </EmptyCareerMessage>
                  ) : (
                    <CareerTimeline>
                      {careers
                        .sort((a, b) => {
                          if (a.priority !== b.priority)
                            return a.priority - b.priority
                          const aYear = parseInt(a.startYear) || 0
                          const bYear = parseInt(b.startYear) || 0
                          return bYear - aYear
                        })
                        .map((career) => {
                          const job = jobs.find((j) => j.id === career.jobId)
                          const country =
                            countries.find((c) => c.id === career.countryId) ||
                            historicalCountries.find(
                              (c) => c.id === career.countryId,
                            )

                          return (
                            <CareerItem
                              key={career.id}
                              $isPrimary={career.priority === 0}
                            >
                              <CareerItemHeader>
                                <CareerItemTitle>
                                  {career.title || job?.name || '직책 미정'}
                                  {career.priority === 0 && (
                                    <PrimaryBadge>★ 주요경력</PrimaryBadge>
                                  )}
                                  {career.isCurrent && (
                                    <CurrentBadge>재직중</CurrentBadge>
                                  )}
                                </CareerItemTitle>
                                <CareerItemActions>
                                  <IconButton
                                    onClick={() => handleEditCareer(career)}
                                    type="button"
                                  >
                                    <FiEdit2 />
                                  </IconButton>
                                  <IconButton
                                    onClick={() =>
                                      handleDeleteCareer(career.id)
                                    }
                                    type="button"
                                    $danger
                                  >
                                    <FiTrash2 />
                                  </IconButton>
                                </CareerItemActions>
                              </CareerItemHeader>
                              <CareerItemDetails>
                                <CareerItemRow>
                                  <CareerItemLabel>기간</CareerItemLabel>
                                  <CareerItemValue>
                                    {formatCareerDate(career, 'start')} ~{' '}
                                    {career.isCurrent
                                      ? '현재'
                                      : formatCareerDate(career, 'end')}
                                  </CareerItemValue>
                                </CareerItemRow>
                                {career.organization && (
                                  <CareerItemRow>
                                    <CareerItemLabel>소속</CareerItemLabel>
                                    <CareerItemValue>
                                      {career.organization}
                                    </CareerItemValue>
                                  </CareerItemRow>
                                )}
                                {country && (
                                  <CareerItemRow>
                                    <CareerItemLabel>국가</CareerItemLabel>
                                    <CareerItemValue>
                                      {country.name}
                                    </CareerItemValue>
                                  </CareerItemRow>
                                )}
                                {career.note && (
                                  <CareerItemRow>
                                    <CareerItemLabel>비고</CareerItemLabel>
                                    <CareerItemValue>
                                      {career.note}
                                    </CareerItemValue>
                                  </CareerItemRow>
                                )}
                              </CareerItemDetails>
                            </CareerItem>
                          )
                        })}
                    </CareerTimeline>
                  )}
                </CareerManagementSection>
              </FormSection>
            )}
          </FormContent>
        </FormArea>
      </ContentWrapper>

      {/* 직업 선택 모달 - 경력용 */}
      {showJobModal && editingCareer && (
        <Modal onClick={() => setShowJobModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>직업 선택</ModalTitle>
              <ModalCloseButton onClick={() => setShowJobModal(false)}>
                <FiX />
              </ModalCloseButton>
            </ModalHeader>

            <SearchWrapper>
              <FiSearch />
              <SearchInput
                type="text"
                placeholder="직업 검색..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
              />
            </SearchWrapper>

            <ModalList>
              {filteredJobs.map((job) => (
                <ModalListItem
                  key={job.id}
                  $selected={editingCareer.jobId === job.id}
                  onClick={() => {
                    handleCareerInputChange('jobId', job.id)
                    handleCareerInputChange('jobName', job.name)
                    setShowJobModal(false)
                    setJobSearchTerm('')
                  }}
                >
                  {job.name}
                </ModalListItem>
              ))}
              {filteredJobs.length === 0 && (
                <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
              )}
            </ModalList>
          </ModalContent>
        </Modal>
      )}

      {/* 기존 모달들은 currentStep === 'basic'일 때만 표시 */}
      {currentStep === 'basic' && (
        <>
          {/* 국가 선택 모달 */}
          {showCountryModal && (
            <Modal onClick={() => setShowCountryModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>국가 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowCountryModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <ModalBody>
                  {/* 좌측 필터 영역 */}
                  <FilterSidebar>
                    <FilterSidebarSection>
                      <FilterSidebarTitle>국가 타입</FilterSidebarTitle>
                      <CountryTypeOption
                        $active={countryType === 'modern'}
                        onClick={() => {
                          setCountryType('modern')
                          setSelectedContinent('all')
                          setSelectedParentCountry('all')
                        }}
                      >
                        <RadioButton $active={countryType === 'modern'}>
                          <RadioDot $active={countryType === 'modern'} />
                        </RadioButton>
                        <span>현대 국가</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={countryType === 'historical'}
                        onClick={() => {
                          setCountryType('historical')
                          setSelectedContinent('all')
                          setSelectedParentCountry('all')
                        }}
                      >
                        <RadioButton $active={countryType === 'historical'}>
                          <RadioDot $active={countryType === 'historical'} />
                        </RadioButton>
                        <span>역사적 국가</span>
                      </CountryTypeOption>
                    </FilterSidebarSection>

                    <FilterSidebarSection>
                      <FilterSidebarTitle>대륙</FilterSidebarTitle>
                      <FilterOptionButton
                        $active={selectedContinent === 'all'}
                        onClick={() => setSelectedContinent('all')}
                      >
                        전체
                      </FilterOptionButton>
                      {continents.map((continent) => (
                        <FilterOptionButton
                          key={continent}
                          $active={selectedContinent === continent}
                          onClick={() => setSelectedContinent(continent)}
                        >
                          {continent}
                        </FilterOptionButton>
                      ))}
                    </FilterSidebarSection>
                  </FilterSidebar>

                  {/* 우측 리스트 영역 */}
                  <ListArea>
                    <SearchWrapper>
                      <FiSearch />
                      <SearchInput
                        type="text"
                        placeholder="국가 검색..."
                        value={countrySearchTerm}
                        onChange={(e) => setCountrySearchTerm(e.target.value)}
                      />
                    </SearchWrapper>

                    <ModalList>
                      <ModalListItem
                        $selected={!formData.countryId}
                        onClick={() => {
                          handleInputChange('countryId', '')
                          setShowCountryModal(false)
                          setCountrySearchTerm('')
                        }}
                      >
                        선택 안함
                      </ModalListItem>
                      {filteredCountries.map((country) => (
                        <ModalListItem
                          key={country.id}
                          $selected={formData.countryId === country.id}
                          onClick={() => {
                            handleInputChange('countryId', country.id)
                            setShowCountryModal(false)
                            setCountrySearchTerm('')
                          }}
                        >
                          <CountryItemContent>
                            {country.flagEmoji && (
                              <CountryFlag>{country.flagEmoji}</CountryFlag>
                            )}
                            <CountryName>{country.name}</CountryName>
                            {country.startYear && (
                              <CountryPeriod>
                                ({country.startYear}
                                {country.endYear
                                  ? ` - ${country.endYear}`
                                  : ' - 현재'}
                                )
                              </CountryPeriod>
                            )}
                          </CountryItemContent>
                        </ModalListItem>
                      ))}
                      {filteredCountries.length === 0 && (
                        <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                      )}
                    </ModalList>
                  </ListArea>
                </ModalBody>
              </ModalContent>
            </Modal>
          )}

          {/* 가문 선택 모달 */}
          {showDynastyModal && (
            <Modal onClick={() => setShowDynastyModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>가문 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowDynastyModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <SearchWrapper>
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="가문 검색..."
                    value={dynastySearchTerm}
                    onChange={(e) => setDynastySearchTerm(e.target.value)}
                  />
                </SearchWrapper>

                <ModalList>
                  <ModalListItem
                    $selected={!formData.dynastyId}
                    onClick={() => {
                      handleInputChange('dynastyId', '')
                      setShowDynastyModal(false)
                      setDynastySearchTerm('')
                    }}
                  >
                    선택 안함
                  </ModalListItem>
                  {filteredDynasties.map((dynasty) => (
                    <ModalListItem
                      key={dynasty.id}
                      $selected={formData.dynastyId === dynasty.id}
                      onClick={() => {
                        handleInputChange('dynastyId', dynasty.id)
                        setShowDynastyModal(false)
                        setDynastySearchTerm('')
                      }}
                    >
                      {dynasty.name}
                    </ModalListItem>
                  ))}
                  {filteredDynasties.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ModalContent>
            </Modal>
          )}

          {/* 종교 선택 모달 */}
          {showReligionModal && (
            <Modal onClick={() => setShowReligionModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>종교 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowReligionModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <SearchWrapper>
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="종교 검색..."
                    value={religionSearchTerm}
                    onChange={(e) => setReligionSearchTerm(e.target.value)}
                  />
                </SearchWrapper>

                <ModalList>
                  <ModalListItem
                    $selected={!formData.religionId}
                    onClick={() => {
                      handleInputChange('religionId', '')
                      setShowReligionModal(false)
                      setReligionSearchTerm('')
                    }}
                  >
                    선택 안함
                  </ModalListItem>
                  {filteredReligions.map((religion) => (
                    <ModalListItem
                      key={religion.id}
                      $selected={formData.religionId === religion.id}
                      onClick={() => {
                        handleInputChange('religionId', religion.id)
                        setShowReligionModal(false)
                        setReligionSearchTerm('')
                      }}
                    >
                      {religion.name}
                    </ModalListItem>
                  ))}
                  {filteredReligions.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ModalContent>
            </Modal>
          )}

          {/* 직업 선택 모달 */}
          {showJobModal && (
            <Modal onClick={() => setShowJobModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>직업 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowJobModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <SearchWrapper>
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="직업 검색..."
                    value={jobSearchTerm}
                    onChange={(e) => setJobSearchTerm(e.target.value)}
                  />
                </SearchWrapper>

                <ModalList>
                  <ModalListItem
                    $selected={!formData.jobId}
                    onClick={() => {
                      handleInputChange('jobId', '')
                      setShowJobModal(false)
                      setJobSearchTerm('')
                    }}
                  >
                    선택 안함
                  </ModalListItem>
                  {filteredJobs.map((job) => (
                    <ModalListItem
                      key={job.id}
                      $selected={formData.jobId === job.id}
                      onClick={() => {
                        handleInputChange('jobId', job.id)
                        setShowJobModal(false)
                        setJobSearchTerm('')
                      }}
                    >
                      {job.name}
                    </ModalListItem>
                  ))}
                  {filteredJobs.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ModalContent>
            </Modal>
          )}

          {/* 아버지 선택 모달 */}
          {showFatherModal && (
            <Modal onClick={() => setShowFatherModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>아버지 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowFatherModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <SearchWrapper>
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="이름 검색..."
                    value={fatherSearchTerm}
                    onChange={(e) => setFatherSearchTerm(e.target.value)}
                  />
                </SearchWrapper>

                <ModalList>
                  <ModalListItem
                    $selected={!formData.fatherId}
                    onClick={() => {
                      handleInputChange('fatherId', '')
                      setShowFatherModal(false)
                      setFatherSearchTerm('')
                    }}
                  >
                    선택 안함
                  </ModalListItem>
                  {filteredFathers.map((person) => (
                    <ModalListItem
                      key={person.id}
                      $selected={formData.fatherId === person.id}
                      onClick={() => {
                        handleInputChange('fatherId', person.id)
                        setShowFatherModal(false)
                        setFatherSearchTerm('')
                      }}
                    >
                      {`${person.surname || ''} ${person.name}`.trim()}
                      {person.birthYear &&
                        ` (${person.birthEra === 'BC' ? 'BC ' : ''}${person.birthYear})`}
                    </ModalListItem>
                  ))}
                  {filteredFathers.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ModalContent>
            </Modal>
          )}

          {/* 어머니 선택 모달 */}
          {showMotherModal && (
            <Modal onClick={() => setShowMotherModal(false)}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>어머니 선택</ModalTitle>
                  <ModalCloseButton onClick={() => setShowMotherModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <SearchWrapper>
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="이름 검색..."
                    value={motherSearchTerm}
                    onChange={(e) => setMotherSearchTerm(e.target.value)}
                  />
                </SearchWrapper>

                <ModalList>
                  <ModalListItem
                    $selected={!formData.motherId}
                    onClick={() => {
                      handleInputChange('motherId', '')
                      setShowMotherModal(false)
                      setMotherSearchTerm('')
                    }}
                  >
                    선택 안함
                  </ModalListItem>
                  {filteredMothers.map((person) => (
                    <ModalListItem
                      key={person.id}
                      $selected={formData.motherId === person.id}
                      onClick={() => {
                        handleInputChange('motherId', person.id)
                        setShowMotherModal(false)
                        setMotherSearchTerm('')
                      }}
                    >
                      {`${person.surname || ''} ${person.name}`.trim()}
                      {person.birthYear &&
                        ` (${person.birthEra === 'BC' ? 'BC ' : ''}${person.birthYear})`}
                    </ModalListItem>
                  ))}
                  {filteredMothers.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ModalContent>
            </Modal>
          )}

          {/* 출생일 선택 모달 */}
          {showBirthDateModal && (
            <DatePickerModal
              isOpen={showBirthDateModal}
              onClose={() => setShowBirthDateModal(false)}
              onSelect={handleBirthDateSelect}
              initialEra={formData.birthEra}
              initialYear={
                formData.birthYear ? parseInt(formData.birthYear) : undefined
              }
              initialMonth={
                formData.birthMonth ? parseInt(formData.birthMonth) : undefined
              }
              initialDay={
                formData.birthDay ? parseInt(formData.birthDay) : undefined
              }
            />
          )}

          {/* 사망일 선택 모달 */}
          {showDeathDateModal && (
            <DatePickerModal
              isOpen={showDeathDateModal}
              onClose={() => setShowDeathDateModal(false)}
              onSelect={handleDeathDateSelect}
              initialEra={formData.deathEra}
              initialYear={
                formData.deathYear ? parseInt(formData.deathYear) : undefined
              }
              initialMonth={
                formData.deathMonth ? parseInt(formData.deathMonth) : undefined
              }
              initialDay={
                formData.deathDay ? parseInt(formData.deathDay) : undefined
              }
            />
          )}
        </>
      )}
    </PageWrapper>
  )
}

// Styled Components
const FormContent = styled.div`
  padding: 32px;
`

const SelectButton = styled.button<{ $selected?: boolean }>`
  padding: 1rem 1.5rem;
  background: ${(props) =>
    props.$selected
      ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
      : 'white'};
  border: 2px solid ${(props) => (props.$selected ? '#a78bfa' : '#e5e7eb')};
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: ${(props) => (props.$selected ? '600' : '500')};
  color: ${(props) => (props.$selected ? '#7c3aed' : '#374151')};
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;

  &:hover {
    border-color: #a78bfa;
    background: ${(props) =>
      props.$selected
        ? 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)'
        : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 2rem;
  }
`

const ErrorText = styled.span`
  font-size: 0.85rem;
  color: #ef4444;
`

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const NameInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const NameLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
`

const ProfileImageContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`

const ProfileImagePreview = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #e9d5ff;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #a78bfa;
    transform: scale(1.02);
  }
`

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ProfileImagePlaceholder = styled.div`
  color: #a78bfa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;

  svg {
    font-size: 2.5rem;
  }
`

const ProfileImageActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const RemoveImageButton = styled.button`
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    border-color: #dc2626;
  }
`

const GenderButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;

  button {
    flex: 1;
    max-width: 150px;
  }
`

const LifespanContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const LifespanRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 2rem;
`

const LifespanItem = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const LifespanLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
`

const LifespanLabel = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
`

const LifespanSeparator = styled.div`
  font-size: 2rem;
  color: #d1d5db;
  font-weight: 300;
  padding-top: 1.75rem;
`

const AgeDisplayRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0.75rem;
`

const AgeDisplay = styled.div`
  font-size: 1rem;
  color: #7c3aed;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-radius: 12px;
  border: 2px solid #e9d5ff;
`

const DateRangeSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #9ca3af;
  padding-top: 2rem;
`

const CustomCheckbox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  user-select: none;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;
  background: #f9fafb;

  &:hover {
    background: #f3f4f6;
  }

  input[type='checkbox'] {
    display: none;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background: white;

    svg {
      font-size: 0.875rem;
      color: white;
      opacity: 0;
      transition: opacity 0.2s;
    }
  }

  input[type='checkbox']:checked + .checkmark {
    background: #7c3aed;
    border-color: #7c3aed;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);

    svg {
      opacity: 1;
    }
  }

  &:hover .checkmark {
    border-color: #a78bfa;
  }

  .label {
    color: #374151;
    font-weight: 600;
  }
`

const UnknownDateBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 10px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);

  .icon {
    font-size: 1.25rem;
  }

  .text {
    color: #92400e;
    font-weight: 700;
  }
`

// Modal Styled Components
const Modal = styled.div`
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
  padding: 1rem;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ModalBody = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const FilterSidebar = styled.div`
  width: 240px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;

    &:hover {
      background: #9ca3af;
    }
  }
`

const FilterSidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FilterSidebarTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  padding: 0 0.5rem;
`

const ListArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
`

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  svg {
    font-size: 1.375rem;
  }
`

const CountryTypeOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.$active ? '#111827' : '#6b7280')};

  &:hover {
    background: #f3f4f6;
  }

  span {
    flex: 1;
    text-align: left;
  }
`

const RadioButton = styled.div<{ $active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.$active ? '#7c3aed' : '#d1d5db')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
`

const RadioDot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? '#7c3aed' : 'transparent')};
  transition: all 0.2s;
  transform: scale(${(props) => (props.$active ? 1 : 0)});
`

const FilterOptionButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 0.625rem 1rem;
  background: ${(props) => (props.$active ? '#ede9fe' : 'transparent')};
  color: ${(props) => (props.$active ? '#7c3aed' : '#6b7280')};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: ${(props) => (props.$active ? '#ddd6fe' : '#f3f4f6')};
    color: ${(props) => (props.$active ? '#6d28d9' : '#374151')};
  }
`

const DateButton = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  padding: 1rem 1.25rem;
  background: ${(props) =>
    props.$hasValue
      ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
      : 'white'};
  border: 2px solid ${(props) => (props.$hasValue ? '#7c3aed' : '#e5e7eb')};
  border-radius: 12px;
  font-size: 1rem;
  font-weight: ${(props) => (props.$hasValue ? '600' : '500')};
  color: ${(props) => (props.$hasValue ? '#111827' : '#9ca3af')};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  svg {
    font-size: 1.25rem;
    color: ${(props) => (props.$hasValue ? '#7c3aed' : '#9ca3af')};
  }

  &:hover {
    border-color: ${(props) => (props.$hasValue ? '#6d28d9' : '#d1d5db')};
    background: ${(props) =>
      props.$hasValue
        ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)'
        : '#f9fafb'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

const SelectionCard = styled.button<{ $hasValue: boolean; $color?: string }>`
  width: 100%;
  padding: 1.25rem 1.5rem;
  background: ${(props) =>
    props.$hasValue
      ? `linear-gradient(135deg, ${props.$color || '#7c3aed'}15 0%, ${props.$color || '#7c3aed'}08 100%)`
      : 'white'};
  border: 2px solid
    ${(props) => (props.$hasValue ? props.$color || '#7c3aed' : '#e5e7eb')};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: ${(props) =>
    props.$hasValue
      ? `0 4px 12px ${props.$color || '#7c3aed'}15`
      : '0 2px 4px rgba(0, 0, 0, 0.05)'};
  text-align: left;

  &:hover {
    transform: translateY(-2px);
    border-color: ${(props) => props.$color || '#7c3aed'};
    box-shadow: ${(props) =>
      props.$hasValue
        ? `0 8px 20px ${props.$color || '#7c3aed'}25`
        : `0 4px 12px ${props.$color || '#7c3aed'}15`};
    background: ${(props) =>
      props.$hasValue
        ? `linear-gradient(135deg, ${props.$color || '#7c3aed'}20 0%, ${props.$color || '#7c3aed'}12 100%)`
        : `${props.$color || '#7c3aed'}05`};
  }

  &:active {
    transform: translateY(0);
  }
`

const SelectionCardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 12px;
  background: ${(props) => props.$color || '#7c3aed'}15;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: ${(props) => props.$color || '#7c3aed'};
  transition: all 0.3s;

  ${SelectionCard}:hover & {
    transform: scale(1.1);
    background: ${(props) => props.$color || '#7c3aed'}25;
  }
`

const SelectionCardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const SelectionCardLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const SelectionCardValue = styled.div<{ $hasValue: boolean }>`
  font-size: 1rem;
  font-weight: ${(props) => (props.$hasValue ? '600' : '500')};
  color: ${(props) => (props.$hasValue ? '#111827' : '#9ca3af')};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const SelectionCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const PrimarySelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 140px));
  gap: 0.875rem;
  max-width: 350px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    max-width: 100%;
  }
`

const PrimarySelectionCard = styled.button<{
  $hasValue: boolean
  $color?: string
}>`
  width: 100%;
  aspect-ratio: 1;
  padding: 0.75rem;
  background: ${(props) =>
    props.$hasValue
      ? `linear-gradient(180deg, ${props.$color || '#7c3aed'}08 0%, transparent 100%), white`
      : 'white'};
  border: 2px solid
    ${(props) => (props.$hasValue ? props.$color || '#7c3aed' : '#e5e7eb')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: ${(props) =>
    props.$hasValue
      ? `0 2px 8px ${props.$color || '#7c3aed'}10`
      : '0 1px 4px rgba(0, 0, 0, 0.04)'};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${(props) =>
      props.$hasValue
        ? `linear-gradient(90deg, ${props.$color || '#7c3aed'}, ${props.$color || '#7c3aed'}80)`
        : 'transparent'};
    transition: all 0.3s;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: ${(props) => props.$color || '#7c3aed'};
    box-shadow: ${(props) =>
      props.$hasValue
        ? `0 5px 15px ${props.$color || '#7c3aed'}18`
        : `0 4px 12px ${props.$color || '#7c3aed'}12`};
    background: ${(props) =>
      props.$hasValue
        ? `linear-gradient(180deg, ${props.$color || '#7c3aed'}12 0%, transparent 100%), white`
        : `linear-gradient(180deg, ${props.$color || '#7c3aed'}05 0%, white 100%)`};

    &::before {
      height: 4px;
    }
  }

  &:active {
    transform: translateY(-1px);
  }
`

const PrimarySelectionCardIcon = styled.div<{ $color?: string }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    ${(props) => props.$color || '#7c3aed'}12 0%,
    ${(props) => props.$color || '#7c3aed'}08 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: ${(props) => props.$color || '#7c3aed'};
  transition: all 0.3s;
  box-shadow: 0 1px 4px ${(props) => props.$color || '#7c3aed'}10;

  ${PrimarySelectionCard}:hover & {
    transform: scale(1.08);
    box-shadow: 0 2px 8px ${(props) => props.$color || '#7c3aed'}18;
  }
`

const PrimarySelectionCardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
`

const PrimarySelectionCardLabel = styled.div`
  font-size: 0.625rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const PrimarySelectionCardValue = styled.div<{ $hasValue: boolean }>`
  font-size: 0.8rem;
  font-weight: ${(props) => (props.$hasValue ? '700' : '600')};
  color: ${(props) => (props.$hasValue ? '#111827' : '#9ca3af')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  line-height: 1.2;
  word-break: keep-all;
`

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;

  svg {
    color: #9ca3af;
    font-size: 1.25rem;
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  color: #111827;

  &::placeholder {
    color: #9ca3af;
  }
`

const ModalList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f9fafb;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;

    &:hover {
      background: #9ca3af;
    }
  }
`

const ModalListItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  padding: 1rem 1.25rem;
  background: ${(props) => (props.$selected ? '#f3f4f6' : 'white')};
  border: 2px solid ${(props) => (props.$selected ? '#7c3aed' : 'transparent')};
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  position: relative;

  &:hover {
    background: #f9fafb;
    border-color: ${(props) => (props.$selected ? '#7c3aed' : '#e5e7eb')};
  }

  &:last-child {
    margin-bottom: 0;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${(props) => (props.$selected ? '#7c3aed' : 'transparent')};
    border-radius: 10px 0 0 10px;
    transition: all 0.2s;
  }

  ${(props) =>
    props.$selected &&
    `
    &::after {
      content: '✓';
      color: #7c3aed;
      font-weight: 700;
      font-size: 1.125rem;
    }
  `}
`

const CountryItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`

const CountryFlag = styled.span`
  font-size: 1.75rem;
`

const CountryName = styled.span`
  flex: 1;
`

const CountryPeriod = styled.span`
  font-size: 0.8rem;
  color: #6b7280;
  margin-left: auto;
  padding: 0.25rem 0.625rem;
  background: #f3f4f6;
  border-radius: 6px;
`

const EmptyMessage = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.95rem;
`

// ===== 경력 관리 스타일 =====
const CareerManagementSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
`

const CareerSection = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: white;
`

const CareerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
`

const CareerHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;

  svg {
    color: #6b7280;
    font-size: 1rem;
  }
`

const CareerCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 10px;
`

const AddCareerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 0.9375rem;
  }
`

const EmptyCareerMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;

  svg {
    color: #d1d5db;
    margin-bottom: 0.75rem;
  }

  p {
    font-size: 0.9375rem;
    font-weight: 500;
    margin: 0 0 0.375rem 0;
    color: #6b7280;
  }

  span {
    font-size: 0.8125rem;
  }
`

const CareerTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const CareerItem = styled.div<{ $isPrimary: boolean }>`
  background: white;
  border: 1px solid ${(props) => (props.$isPrimary ? '#9ca3af' : '#e5e7eb')};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: #9ca3af;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  ${(props) =>
    props.$isPrimary &&
    `
    background: #f9fafb;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #6b7280;
      border-radius: 8px 0 0 8px;
    }
  `}
`

const CareerItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.875rem;
  gap: 1rem;
`

const CareerItemTitle = styled.h4`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const PrimaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: #374151;
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.01em;
`

const CurrentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.1875rem 0.5rem;
  background: #10b981;
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.01em;
`

const CareerItemActions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: ${(props) => (props.$danger ? '#fee2e2' : '#f3f4f6')};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${(props) => (props.$danger ? '#dc2626' : '#6b7280')};

  &:hover {
    background: ${(props) => (props.$danger ? '#fecaca' : '#e5e7eb')};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 0.875rem;
  }
`

const CareerItemDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const CareerItemRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`

const CareerItemLabel = styled.span`
  min-width: 3.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
`

const CareerItemValue = styled.span`
  flex: 1;
  font-size: 0.8125rem;
  color: #374151;
  line-height: 1.5;
`

const LargeModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

const CareerModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const CareerModalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const CareerModalLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const CareerModalField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const CareerModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
`

const CareerEditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`

const CareerFormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`

const CareerFormTitle = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #6b7280;
    font-size: 1rem;
  }
`

const CareerFormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const CareerFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;

  input[type='checkbox'] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }
`
