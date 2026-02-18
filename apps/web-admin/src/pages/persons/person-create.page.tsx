import React, { useEffect, useMemo, useRef, useState } from 'react'

import { toast } from 'react-hot-toast'
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiHeart,
  FiInfo,
  FiLayers,
  FiMusic,
  FiPackage,
  FiPlus,
  FiSave,
  FiSearch,
  FiShield,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { GiCrossedSwords, GiCrown } from 'react-icons/gi'
import { IoFemaleSharp, IoMaleSharp } from 'react-icons/io5'
import { RiGovernmentLine } from 'react-icons/ri'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  ActionButton,
  ContentWrapper,
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
import { cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { jobCategoryApi } from '@/shared/api/job-category'
import { getAllJobs } from '@/shared/api/jobs'
import {
  type CreatePersonInput,
  type Era,
  personApi,
} from '@/shared/api/person'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllReligions } from '@/shared/api/religions'
import { uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { StepNavigation } from '@/widgets/event-form/ui'

import {
  MonarchField,
  MonarchFieldBadge,
  MonarchFieldGroup,
  MonarchFieldLabel,
  MonarchHint,
  MonarchIcon,
  MonarchSection,
  MonarchSectionHeader,
  MonarchTitle,
} from './person-create-styles'

// 디자인 토큰
const DESIGN_TOKENS = {
  colors: {
    geography: '#10b981',
    organization: '#3b82f6',
    person: '#8b5cf6',
    job: '#f59e0b',
    belief: '#ec4899',
    neutral: '#64748b',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    info: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    neutral: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
} as const

const ERROR_MESSAGES = {
  REQUIRED_NAME: '이름을 입력해주세요',
  REQUIRED_SURNAME: '성을 입력해주세요',
  REQUIRED_GENDER: '성별을 선택해주세요',
  REQUIRED_BIRTH_COUNTRY: '출생 국가를 선택해주세요',
  REQUIRED_LIFESPAN: '생몰정보를 입력해주세요',
  REQUIRED_CAREER_TITLE: '제목을 입력해주세요',
  REQUIRED_CAREER_START: '시작일을 입력해주세요',
  DUPLICATE_NICKNAME: '이미 추가된 별명입니다',
  MAX_NICKNAMES: '별명은 최대 10개까지 추가할 수 있습니다',
  NICKNAME_TOO_LONG: '별명은 50자 이내로 입력해주세요',
  IMAGE_FILE_ONLY: '이미지 파일만 업로드할 수 있습니다',
  IMAGE_SIZE_LIMIT: '이미지 크기는 10MB 이하여야 합니다',
  INVALID_DATE: (label: string) => `${label} 날짜가 유효하지 않습니다`,
  CAREER_BEFORE_BIRTH: '경력 시작일은 출생일 이후여야 합니다',
  END_BEFORE_START: '종료일은 시작일 이후여야 합니다',
  CAREER_AFTER_DEATH: '경력 날짜는 사망일 이전이어야 합니다',
  CURRENT_CAREER_FUTURE: '현재 진행중인 경력의 시작일은 오늘 이전이어야 합니다',
  UNREALISTIC_AGE: '생존자의 나이가 비현실적입니다. 생몰 정보를 확인해주세요',
} as const

interface CareerImage {
  url: string
  description: string
}

interface Organization {
  id: string
  name: string
  type: 'government' | 'company' | 'military' | 'education' | 'sports' | 'other'
  countryId?: string
  foundedYear?: number
  description?: string
}

interface Career {
  id: string
  careerType:
    | 'military'
    | 'government'
    | 'business'
    | 'academic'
    | 'religious'
    | 'artist'
    | 'athlete'
    | 'media'
    | 'legal'
    | 'medical'
    | 'government_position' // 경력 타입
  timelineTitle: string
  showPositionInfo: boolean
  jobId: string
  jobName: string
  jobCategoryId: string // 직업 카테고리 ID 추가
  title: string
  termNumber: string // 대수 (예: 32 -> "제32대 대통령")
  organization: string
  organizationId: string // 조직 ID (DB 선택 시)
  images: CareerImage[]
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

  // GovernmentPositionTenure 전용 필드
  positionType?:
    | 'HEAD_OF_STATE'
    | 'HEAD_OF_GOVERNMENT'
    | 'HEIR_APPARENT'
    | 'REGENT'
    | 'CABINET_MINISTER'
    | 'VICE_MINISTER'
    | 'LEGISLATOR'
    | 'JUDICIARY'
    | 'LOCAL_GOVERNMENT'
    | 'SPECIAL_POSITION'
    | 'MILITARY_COMMANDER'
    | 'ROYAL_NOBLE_TITLE'
    | 'OTHER' // 직위 타입
  positionTitle?: string // 직위명 (예: "대통령", "국왕")
  positionTitleEn?: string // 영문 직위명
  positionDefinitionId?: string // 직위 정의 ID (선택사항)
  regnalNumber?: string // 재위번호 (루이 14세의 "14")
  appointmentMethod?:
    | 'DIRECT_ELECTION'
    | 'INDIRECT_ELECTION'
    | 'APPOINTMENT'
    | 'HEREDITARY'
    | 'COUP'
    | 'PARLIAMENTARY_ELECTION'
    | 'OTHER' // 임명방식
  endReason?:
    | 'TERM_COMPLETED'
    | 'RESIGNATION'
    | 'ABDICATION'
    | 'SUCCESSION_TRANSFER'
    | 'REMOVAL'
    | 'IMPEACHMENT'
    | 'DEATH_IN_OFFICE'
    | 'OVERTHROWN'
    | 'WAR_DEFEAT'
    | 'STATE_DISSOLVED'
    | 'OTHER' // 종료사유
  endReasonDetail?: string // 종료사유 상세
}

interface FormData {
  // 기본 정보
  fullName: string // 전체 이름 (간편 입력용)
  nameInputMode: 'simple' | 'detailed' // 입력 모드
  nameFormat: 'korean' | 'western' // 이름 형식
  name: string // 이름 (First Name)
  middleName: string // 중간 이름 (Middle Name)
  surname: string // 성 (Last Name/Family Name)
  originalName: string // 이름 원어 (Original Name)
  surnameMeaning: string // 성의 뜻
  nameMeaning: string // 이름의 뜻
  middleNameMeaning: string // 중간이름의 뜻
  nicknames: string[] // 별명/호/필명 (다중) - 변경
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
  profileImageUrls: string[]

  // 왕/군주 관련 필드
  regnalName: string // 왕호/재위명 (예: Louis, Henry, 선덕)
  templeName: string // 묘호 (예: 세종, 태종, 고종)
  posthumousName: string // 시호 (예: 세종장헌영문예무인성명효대왕)

  // 소속 정보
  birthCountryId: string // 출생 국가
  birthCityId: string // 출생지 (도시)
  deathCityId: string // 사망지 (도시)
  countryTransfers: Array<{
    countryId: string
    year: string
    month?: string
    day?: string
    note?: string
  }> // 이적 국가 이력
  dynastyId: string
  religionId: string
  jobIds: string[] // 여러 직업 선택 가능하도록 배열로 변경

  // 가족 관계
  fatherId: string
  motherId: string

  // 미상 플래그
  isBirthDateUnknown: boolean
  isDeathDateUnknown: boolean
  isAlive: boolean // 생존 중 플래그 추가
  showLifespanOnEventList: boolean

  // 임시 이적 정보 입력
  transferMonth?: string
  transferDay?: string
}

interface FormErrors {
  [key: string]: string | { [key: string]: string[] } | undefined
  careers?: { [key: string]: string[] }
  name?: string
  surname?: string
  gender?: string
  birthCountry?: string
  lifespan?: string
}

export default function PersonCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id: string }>() // 수정 모드: ID가 있으면 수정
  const presetCountryId = searchParams.get('countryId')
  const playClick = useClickSound()

  const isEditMode = !!id // 수정 모드 여부

  const [formData, setFormData] = useState<FormData>({
    fullName: '', // 전체 이름 (간편 모드용)
    nameInputMode: 'simple', // 기본은 간편 모드
    nameFormat: 'korean', // 기본은 한국식
    name: '',
    middleName: '', // 중간 이름
    surname: '',
    originalName: '', // 이름 원어
    surnameMeaning: '', // 성의 뜻
    nameMeaning: '', // 이름의 뜻
    middleNameMeaning: '', // 중간이름의 뜻
    nicknames: [], // 별명 배열
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
    profileImageUrls: [],
    // 왕/군주 필드
    regnalName: '',
    templeName: '',
    posthumousName: '',
    // 소속 정보
    birthCountryId: presetCountryId || '', // 출생 국가
    birthCityId: '', // 출생지 (도시)
    deathCityId: '', // 사망지 (도시)
    countryTransfers: [], // 이적 이력
    dynastyId: '',
    religionId: '',
    jobIds: [], // 빈 배열로 초기화
    fatherId: '',
    motherId: '',
    isBirthDateUnknown: false,
    isDeathDateUnknown: false,
    isAlive: false, // 생존 중 플래그 초기화
    showLifespanOnEventList: false,
    transferMonth: '',
    transferDay: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorFlashOn, setErrorFlashOn] = useState(false)
  const errorFlashTimerRef = useRef<number | null>(null)
  const [countries, setCountries] = useState<any[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<any[]>([])
  const [dynasties, setDynasties] = useState<any[]>([])
  const [continentList, setContinentList] = useState<any[]>([])
  const [religions, setReligions] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [jobCategories, setJobCategories] = useState<any[]>([])
  const [persons, setPersons] = useState<any[]>([])
  const [cities, setCities] = useState<Array<{ id: string; name: string; countryId: string }>>([])
  const [governmentPositionDefinitions, setGovernmentPositionDefinitions] =
    useState<any[]>([])

  // 조직 데이터 (샘플 - 향후 API로 대체)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  // TODO: API에서 기업 데이터 가져오기
  // useEffect(() => {
  //   fetchOrganizations().then(setOrganizations)
  // }, [])

  const [organizationType, setOrganizationType] = useState<
    'all' | Organization['type']
  >('all')

  // 경력 상태
  const [careers, setCareers] = useState<Career[]>([])
  const [activeCareerId, setActiveCareerId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'basic' | 'career'>('basic')

  // 모달 상태
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [countryModalContext, setCountryModalContext] = useState<
    'birth' | 'career'
  >('birth')
  const [showCountryTransferModal, setShowCountryTransferModal] =
    useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showJobCategoryModal, setShowJobCategoryModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)
  const [showCareerStartDateModal, setShowCareerStartDateModal] =
    useState(false)
  const [showCareerEndDateModal, setShowCareerEndDateModal] = useState(false)
  const [showOrganizationModal, setShowOrganizationModal] = useState(false)

  // 검색 상태
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [dynastySearchTerm, setDynastySearchTerm] = useState('')
  const [religionSearchTerm, setReligionSearchTerm] = useState('')
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [organizationSearchTerm, setOrganizationSearchTerm] = useState('')
  const [selectedJobCategoryId, setSelectedJobCategoryId] = useState('all')
  const [selectedJobParentCategoryId, setSelectedJobParentCategoryId] =
    useState('all')
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
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(
    null,
  )
  const [draggedCareerImageIndex, setDraggedCareerImageIndex] = useState<
    number | null
  >(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // 별명 입력 상태
  const [nicknameInput, setNicknameInput] = useState('')

  // 국가 이적 입력 상태
  const [transferCountryId, setTransferCountryId] = useState('')
  const [transferYear, setTransferYear] = useState('')
  const [transferNote, setTransferNote] = useState('')

  const STORAGE_KEY = 'person-create-draft'

  // 임시 저장 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const shouldRestore = window.confirm(
          '작성 중이던 내용이 있습니다. 불러오시겠습니까?',
        )
        if (shouldRestore) {
          setFormData(parsed.formData)
          setCareers(parsed.careers || [])
          toast.success('임시 저장된 내용을 불러왔습니다.')
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
    }
  }, [])

  // 자동 임시 저장 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.name || formData.surname || careers.length > 0) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ formData, careers }),
          )
        } catch (error) {
          console.error('Failed to save draft:', error)
        }
      }
    }, 30000) // 30초

    return () => clearInterval(interval)
  }, [formData, careers])

  // 수동 임시 저장
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, careers }))
      toast.success('임시 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save draft:', error)
      toast.error('임시 저장에 실패했습니다.')
    }
  }

  // 임시 저장 삭제
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      toast.success('임시 저장 내용이 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }

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
        jobCategoriesData,
        personsData,
        citiesData,
      ] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
        dynastyApi.getAll(),
        getAllContinents(),
        getAllReligions(),
        getAllJobs(),
        jobCategoryApi.getAll(),
        personApi.getAll(),
        cityApi.getAll(),
      ])

      setCountries(countriesData || [])
      setHistoricalCountries(historicalCountriesData || [])
      setDynasties(dynastiesData || [])
      setContinentList(continentsData || [])
      setReligions(religionsData || [])
      setJobs(jobsData || [])
      setJobCategories(jobCategoriesData || [])
      setPersons(personsData || [])
      setCities(Array.isArray(citiesData) ? citiesData : [])

      // 수정 모드: 기존 인물 데이터 + 재임 기록 + 정부/공무원 등 모든 경력 로드
      if (isEditMode && id) {
        try {
          const [personData, tenuresFromApi, allCareersRes] = await Promise.all(
            [
              personApi.getById(id),
              personCareerApi.getTenuresByPersonId(id),
              personCareerApi.getAllCareers(id).catch(() => ({
                government: [],
                military: [],
                business: [],
                academic: [],
                athlete: [],
                religious: [],
                artist: [],
                media: [],
                legal: [],
                medical: [],
                education: [],
                awards: [],
              })),
            ],
          )

          // 폼 데이터 채우기 (nameDisplayOrder에 맞춰 fullName·nameFormat 복원)
          const loadedNameFormat =
            personData.nameDisplayOrder === 'western' ? 'western' : 'korean'
          const loadedFullName = getPersonDisplayName({
            name: personData.name || '',
            surname: personData.surname ?? '',
            middleName: personData.middleName ?? '',
            nameDisplayOrder: personData.nameDisplayOrder ?? 'korean',
          })
          setFormData((prev) => ({
            ...prev,
            name: personData.name || '',
            surname: personData.surname || '',
            middleName: personData.middleName || '',
            originalName: personData.originalName || '',
            surnameMeaning: personData.surnameMeaning || '',
            nameMeaning: personData.nameMeaning || '',
            middleNameMeaning: personData.middleNameMeaning || '',
            nameFormat: loadedNameFormat,
            fullName: loadedFullName,
            gender: personData.gender || '',
            // 생몰 정보
            birthEra: (personData.birthEra || 'AD') as Era,
            birthYear: personData.birthYear?.toString() || '',
            birthMonth: personData.birthMonth?.toString() || '',
            birthDay: personData.birthDay?.toString() || '',
            deathEra: (personData.deathEra || 'AD') as Era,
            deathYear: personData.deathYear?.toString() || '',
            deathMonth: personData.deathMonth?.toString() || '',
            deathDay: personData.deathDay?.toString() || '',
            isBirthDateUnknown: !personData.birthYear,
            isDeathDateUnknown: !personData.deathYear,
            isAlive: !personData.deathYear,
            showLifespanOnEventList:
              personData.showLifespanOnEventList !== false, // DB 값 사용
            biography: personData.biography || '',
            profileImageUrl: personData.profileImageUrl || '',
            profileImageUrls: personData.profileImageUrl
              ? [personData.profileImageUrl]
              : [],
            // 왕/군주 필드
            regnalName: personData.regnalName || '',
            templeName: personData.templeName || '',
            posthumousName: personData.posthumousName || '',
            // 관계
            birthCountryId: personData.countryId || '',
            birthCityId: personData.birthCityId || '',
            deathCityId: personData.deathCityId || '',
            dynastyId: personData.dynastyId || '',
            religionId: personData.religionId || '',
            jobIds: personData.jobId ? [personData.jobId] : [],
            fatherId: personData.fatherId || '',
            motherId: personData.motherId || '',
          }))

          // 재임 기록(tenures)을 Career 배열로 변환 (전용 API 결과 우선, 없으면 getById 응답 fallback)
          const tenures =
            Array.isArray(tenuresFromApi) && tenuresFromApi.length > 0
              ? tenuresFromApi
              : (personData.governmentTenures ?? [])
          if (tenures.length > 0) {
            console.log('📥 왕위 재임 기록 로드:', tenures.length, '건')

            const tenureCareers: Career[] = tenures.map(
              (tenure: any, index: number) => {
                console.log(`  재임기록 ${index + 1}:`, {
                  startDate: tenure.startDate,
                  endDate: tenure.endDate,
                  title: tenure.title,
                  termNumber: tenure.termNumber,
                  showPositionInfo: tenure.showPositionInfo,
                })

                const startDate = tenure.startDate
                  ? new Date(tenure.startDate)
                  : null
                const endDate = tenure.endDate ? new Date(tenure.endDate) : null

                // 날짜가 유효한지 확인
                const isStartDateValid =
                  startDate && !isNaN(startDate.getTime())
                const isEndDateValid = endDate && !isNaN(endDate.getTime())

                console.log(`  날짜 변환 결과:`, {
                  isStartDateValid,
                  startYear: isStartDateValid
                    ? startDate.getFullYear().toString()
                    : '',
                  isEndDateValid,
                  endYear: isEndDateValid
                    ? endDate.getFullYear().toString()
                    : '',
                })

                return {
                  id: tenure.id,
                  careerType: 'government_position',
                  timelineTitle: tenure.timelineTitle || `${tenure.title} 재임`, // DB 값 우선 사용
                  showPositionInfo: tenure.showPositionInfo !== false, // DB 값 사용
                  jobId: '',
                  jobName: '',
                  jobCategoryId: '',
                  title: '',
                  termNumber: tenure.termNumber?.toString() || '',
                  organization: '',
                  organizationId: '',
                  images: [],
                  startEra: 'AD' as Era,
                  startYear: isStartDateValid
                    ? startDate.getFullYear().toString()
                    : '',
                  startMonth: isStartDateValid
                    ? (startDate.getMonth() + 1).toString()
                    : '',
                  startDay: isStartDateValid
                    ? startDate.getDate().toString()
                    : '',
                  endEra: 'AD' as Era,
                  endYear: isEndDateValid
                    ? endDate.getFullYear().toString()
                    : '',
                  endMonth: isEndDateValid
                    ? (endDate.getMonth() + 1).toString()
                    : '',
                  endDay: isEndDateValid ? endDate.getDate().toString() : '',
                  isCurrent: !tenure.endDate,
                  countryId: tenure.countryId || tenure.historicalCountryId || '',
                  note: tenure.notes || '',
                  priority: index,
                  // GovernmentPositionTenure 전용 필드
                  positionType: tenure.positionType,
                  positionTitle: tenure.title,
                  positionTitleEn: tenure.titleEn || '',
                  positionDefinitionId: tenure.positionDefinitionId || '',
                  regnalNumber: tenure.regnalNumber?.toString() || '',
                  appointmentMethod: tenure.appointmentMethod,
                  endReason: tenure.endReason,
                  endReasonDetail: tenure.endReasonDetail || '',
                }
              },
            )

            // 정부/공무원 경력(GovernmentCareer)을 Career[]로 변환
            const governmentList = Array.isArray(allCareersRes?.government)
              ? allCareersRes.government
              : []
            const governmentCareers: Career[] = governmentList.map(
              (c: any, index: number) => {
                const startDate = c.startDate ? new Date(c.startDate) : null
                const endDate = c.endDate ? new Date(c.endDate) : null
                const isStartValid = startDate && !isNaN(startDate.getTime())
                const isEndValid = endDate && !isNaN(endDate.getTime())
                return {
                  id: c.id,
                  careerType: 'government',
                  timelineTitle:
                    c.timelineTitle || c.roleTitle || '정부/공무원 경력',
                  showPositionInfo: c.showPositionInfo !== false,
                  jobId: c.positionId || '',
                  jobName: '',
                  jobCategoryId: c.jobCategoryId || '',
                  title: c.roleTitle || c.timelineTitle || '',
                  termNumber: c.termNumber != null ? String(c.termNumber) : '',
                  organization: '',
                  organizationId: c.organizationId || '',
                  images: [],
                  startEra: 'AD' as Era,
                  startYear: isStartValid
                    ? startDate.getFullYear().toString()
                    : '',
                  startMonth: isStartValid
                    ? (startDate.getMonth() + 1).toString()
                    : '',
                  startDay: isStartValid ? startDate.getDate().toString() : '',
                  endEra: 'AD' as Era,
                  endYear: isEndValid ? endDate.getFullYear().toString() : '',
                  endMonth: isEndValid
                    ? (endDate.getMonth() + 1).toString()
                    : '',
                  endDay: isEndValid ? endDate.getDate().toString() : '',
                  isCurrent: !c.endDate,
                  countryId: c.countryId || '',
                  note: c.notes || '',
                  priority: tenureCareers.length + index,
                }
              },
            )

            const combined = [...tenureCareers, ...governmentCareers].sort(
              (a, b) => {
                const aYear = a.startYear ? parseInt(a.startYear, 10) : 0
                const bYear = b.startYear ? parseInt(b.startYear, 10) : 0
                return bYear - aYear
              },
            )
            setCareers(combined)
            console.log(
              `✅ 경력 로드 완료: 재임 ${tenureCareers.length}건, 정부/공무원 ${governmentCareers.length}건`,
            )
          } else {
            // 재임 기록 없어도 정부/공무원 등 다른 경력은 로드
            const governmentList = Array.isArray(allCareersRes?.government)
              ? allCareersRes.government
              : []
            const governmentCareers: Career[] = governmentList.map(
              (c: any, index: number) => {
                const startDate = c.startDate ? new Date(c.startDate) : null
                const endDate = c.endDate ? new Date(c.endDate) : null
                const isStartValid = startDate && !isNaN(startDate.getTime())
                const isEndValid = endDate && !isNaN(endDate.getTime())
                return {
                  id: c.id,
                  careerType: 'government',
                  timelineTitle:
                    c.timelineTitle || c.roleTitle || '정부/공무원 경력',
                  showPositionInfo: c.showPositionInfo !== false,
                  jobId: c.positionId || '',
                  jobName: '',
                  jobCategoryId: c.jobCategoryId || '',
                  title: c.roleTitle || c.timelineTitle || '',
                  termNumber: c.termNumber != null ? String(c.termNumber) : '',
                  organization: '',
                  organizationId: c.organizationId || '',
                  images: [],
                  startEra: 'AD' as Era,
                  startYear: isStartValid
                    ? startDate.getFullYear().toString()
                    : '',
                  startMonth: isStartValid
                    ? (startDate.getMonth() + 1).toString()
                    : '',
                  startDay: isStartValid ? startDate.getDate().toString() : '',
                  endEra: 'AD' as Era,
                  endYear: isEndValid ? endDate.getFullYear().toString() : '',
                  endMonth: isEndValid
                    ? (endDate.getMonth() + 1).toString()
                    : '',
                  endDay: isEndValid ? endDate.getDate().toString() : '',
                  isCurrent: !c.endDate,
                  countryId: c.countryId || '',
                  note: c.notes || '',
                  priority: index,
                }
              },
            )
            setCareers(governmentCareers.length > 0 ? governmentCareers : [])
            if (governmentCareers.length > 0) {
              console.log(
                `✅ 정부/공무원 경력 ${governmentCareers.length}건 로드 완료`,
              )
            }
          }

          toast.success('데이터를 불러왔습니다')
        } catch (error) {
          console.error('Failed to load person:', error)
          toast.error('인물 데이터를 불러오는데 실패했습니다')
          navigate('/persons')
        }
      }
    } catch (error) {
      console.error('Failed to load entities:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    }
  }

  // 나이 계산
  const calculatedAge = useMemo(() => {
    if (!formData.birthYear) return null
    if (formData.isBirthDateUnknown) return null

    const birthYear = parseInt(formData.birthYear, 10)
    if (isNaN(birthYear)) return null

    // 생존 중인 경우 현재 나이 계산
    if (formData.isAlive) {
      const currentYear = new Date().getFullYear()
      const birthMonth = formData.birthMonth
        ? parseInt(formData.birthMonth, 10)
        : 1
      const birthDay = formData.birthDay ? parseInt(formData.birthDay, 10) : 1
      const currentMonth = new Date().getMonth() + 1
      const currentDay = new Date().getDate()

      let age = currentYear - birthYear

      // 생일이 아직 안 지났으면 -1
      if (formData.birthEra === 'AD' && birthMonth && birthDay) {
        if (
          currentMonth < birthMonth ||
          (currentMonth === birthMonth && currentDay < birthDay)
        ) {
          age -= 1
        }
      }

      return age
    }

    // 사망한 경우 향년 계산
    if (!formData.deathYear || formData.isDeathDateUnknown) return null

    const deathYear = parseInt(formData.deathYear, 10)
    if (isNaN(deathYear)) return null

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
    formData.isAlive,
  ])

  const birthCountry = useMemo(() => {
    if (!formData.birthCountryId) return null
    return (
      countries.find((c) => c.id === formData.birthCountryId) ||
      historicalCountries.find((c) => c.id === formData.birthCountryId)
    )
  }, [formData.birthCountryId, countries, historicalCountries])

  const transferCountries = useMemo(() => {
    return formData.countryTransfers.map((transfer) => ({
      ...transfer,
      country:
        countries.find((c) => c.id === transfer.countryId) ||
        historicalCountries.find((c) => c.id === transfer.countryId),
    }))
  }, [formData.countryTransfers, countries, historicalCountries])

  const selectedDynasty = useMemo(() => {
    if (!formData.dynastyId) return null
    return dynasties.find((d) => d.id === formData.dynastyId)
  }, [formData.dynastyId, dynasties])

  const selectedReligion = useMemo(() => {
    if (!formData.religionId) return null
    return religions.find((r) => r.id === formData.religionId)
  }, [formData.religionId, religions])

  const selectedJobs = useMemo(() => {
    if (!formData.jobIds || formData.jobIds.length === 0) return []
    return jobs.filter((j) => formData.jobIds.includes(j.id))
  }, [formData.jobIds, jobs])

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

  const getJobLabel = (job: any) => job?.title ?? job?.name ?? ''

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, any> = {
      '정치/행정': <RiGovernmentLine />,
      군사: <GiCrossedSwords />,
      '학문/교육': <FiBook />,
      종교: <FiHeart />,
      '예술/문화': <FiMusic />,
      '경제/산업': <FiTrendingUp />,
      법조: <FiShield />,
      의료: <FiActivity />,
      '언론/출판': <FiFileText />,
      기타: <FiPackage />,
    }
    return iconMap[categoryName] || <FiFolder />
  }

  // 1단계 카테고리 (parentId가 null인 것)
  const parentJobCategories = useMemo(() => {
    return jobCategories.filter((cat: any) => !cat.parentId)
  }, [jobCategories])

  // 2단계 카테고리 (선택된 1단계의 자식)
  const childJobCategories = useMemo(() => {
    if (selectedJobParentCategoryId === 'all') return []
    return jobCategories.filter(
      (cat: any) => cat.parentId === selectedJobParentCategoryId,
    )
  }, [jobCategories, selectedJobParentCategoryId])

  const filteredJobs = useMemo(() => {
    let filtered = jobs

    if (selectedJobCategoryId !== 'all') {
      filtered = filtered.filter(
        (job) =>
          job.categoryId === selectedJobCategoryId ||
          job.category?.id === selectedJobCategoryId,
      )
    }

    if (jobSearchTerm) {
      filtered = filtered.filter((job) =>
        getJobLabel(job).toLowerCase().includes(jobSearchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [jobs, jobSearchTerm, selectedJobCategoryId])

  const filteredOrganizations = useMemo(() => {
    let filtered = organizations

    // 타입 필터
    if (organizationType !== 'all') {
      filtered = filtered.filter((org) => org.type === organizationType)
    }

    // 검색 필터
    if (organizationSearchTerm) {
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(organizationSearchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [organizations, organizationType, organizationSearchTerm])

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

  /** 전체 이름을 선택한 형식으로 파싱해 성/이름/중간이름에 반영. 형식 전환 시에도 호출 */
  const parseFullNameToFields = (
    fullName: string,
    format: 'korean' | 'western',
  ) => {
    const t = fullName.trim()
    if (!t) {
      handleInputChange('surname', '')
      handleInputChange('name', '')
      handleInputChange('middleName', '')
      return
    }
    if (format === 'korean') {
      handleInputChange('surname', t[0])
      handleInputChange('name', t.substring(1))
      handleInputChange('middleName', '')
    } else {
      const parts = t.split(/\s+/)
      if (parts.length === 1) {
        handleInputChange('name', parts[0])
        handleInputChange('surname', '')
        handleInputChange('middleName', '')
      } else if (parts.length === 2) {
        handleInputChange('name', parts[0])
        handleInputChange('surname', parts[1])
        handleInputChange('middleName', '')
      } else {
        handleInputChange('name', parts[0])
        handleInputChange(
          'middleName',
          parts.slice(1, -1).join(' '),
        )
        handleInputChange('surname', parts[parts.length - 1])
      }
    }
  }

  const triggerErrorFlash = () => {
    if (errorFlashTimerRef.current) {
      window.clearTimeout(errorFlashTimerRef.current)
    }
    setErrorFlashOn(true)
    errorFlashTimerRef.current = window.setTimeout(() => {
      setErrorFlashOn(false)
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (errorFlashTimerRef.current) {
        window.clearTimeout(errorFlashTimerRef.current)
      }
    }
  }, [])

  const primaryProfileImage =
    formData.profileImageUrls[0] || formData.profileImageUrl

  const activeCareer = useMemo(
    () => careers.find((career) => career.id === activeCareerId) ?? null,
    [careers, activeCareerId],
  )

  const selectedJobCategory = useMemo(() => {
    if (selectedJobCategoryId === 'all') return null
    return jobCategories.find(
      (category) => category.id === selectedJobCategoryId,
    )
  }, [jobCategories, selectedJobCategoryId])

  const orderedCareers = useMemo(() => {
    return [...careers].sort((a, b) => a.priority - b.priority)
  }, [careers])

  useEffect(() => {
    if (!activeCareerId && orderedCareers.length > 0) {
      setActiveCareerId(orderedCareers[0].id)
    }
  }, [activeCareerId, orderedCareers])

  useEffect(() => {
    if (currentStep === 'career' && careers.length === 0) {
      handleAddCareer()
    }
  }, [currentStep, careers.length])

  // 경력 관리 함수
  const handleAddCareer = () => {
    if (activeCareer && !activeCareer.timelineTitle.trim()) {
      toast.error('타임라인 제목을 입력해주세요.')
      return
    }
    const newCareer: Career = {
      id: Date.now().toString(),
      careerType: 'government', // 기본값
      timelineTitle: '',
      showPositionInfo: true, // 기본값을 true로 변경
      jobId: '',
      jobName: '',
      jobCategoryId: '', // 추가
      title: '',
      termNumber: '',
      organization: '',
      organizationId: '', // 추가
      images: [],
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

      // GovernmentPositionTenure 전용 필드
      positionType: 'HEAD_OF_STATE',
      positionTitle: '',
      positionTitleEn: '',
      positionDefinitionId: '',
      regnalNumber: '',
      appointmentMethod: undefined,
      endReason: undefined,
      endReasonDetail: '',
    }
    setCareers((prev) => [...prev, newCareer])
    setActiveCareerId(newCareer.id)
    // 새 경력 추가 시 카테고리 초기화
    setSelectedJobParentCategoryId('all')
  }

  const handleEditCareer = (career: Career) => {
    setActiveCareerId(career.id)
    // 선택한 경력의 카테고리로 업데이트
    setSelectedJobParentCategoryId(career.jobCategoryId || 'all')
  }

  const handleDeleteCareer = (careerId: string) => {
    if (!confirm('이 경력을 삭제하시겠습니까?')) return

    setCareers((prev) => {
      const filtered = prev.filter((c) => c.id !== careerId)
      // 우선순위 재정렬
      return filtered.map((career, index) => ({ ...career, priority: index }))
    })
    if (activeCareerId === careerId) {
      setActiveCareerId(null)
    }
    toast.success('경력이 삭제되었습니다.')
  }

  const handleDuplicateCareer = (careerId: string) => {
    const careerToDuplicate = careers.find((c) => c.id === careerId)
    if (!careerToDuplicate) return

    const newCareer: Career = {
      ...careerToDuplicate,
      id: `career-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timelineTitle: `${careerToDuplicate.timelineTitle} (복사본)`,
      priority: careers.length,
    }

    setCareers((prev) => [...prev, newCareer])
    setActiveCareerId(newCareer.id)
    toast.success('경력이 복제되었습니다.')
  }

  const handleMoveCareerUp = (careerId: string) => {
    setCareers((prev) => {
      const index = prev.findIndex((c) => c.id === careerId)
      if (index <= 0) return prev

      const newCareers = [...prev]
      const temp = newCareers[index - 1]
      newCareers[index - 1] = { ...newCareers[index], priority: index - 1 }
      newCareers[index] = { ...temp, priority: index }
      return newCareers
    })
  }

  const handleMoveCareerDown = (careerId: string) => {
    setCareers((prev) => {
      const index = prev.findIndex((c) => c.id === careerId)
      if (index < 0 || index >= prev.length - 1) return prev

      const newCareers = [...prev]
      const temp = newCareers[index + 1]
      newCareers[index + 1] = { ...newCareers[index], priority: index + 1 }
      newCareers[index] = { ...temp, priority: index }
      return newCareers
    })
  }

  const handleCareerInputChange = (
    careerId: string,
    field: keyof Career,
    value: any,
  ) => {
    setCareers((prev) =>
      prev.map((career) =>
        career.id === careerId ? { ...career, [field]: value } : career,
      ),
    )
  }

  const handleCareerImagesUpload = async (
    careerId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const invalidFile = files.find((file) => !file.type.startsWith('image/'))
    if (invalidFile) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024)
    if (oversizedFile) {
      toast.error('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    try {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file)))
      const items = uploaded
        .map((response) => response.url)
        .filter(Boolean)
        .map((url) => ({
          url,
          description: '',
        }))

      setCareers((prev) =>
        prev.map((career) =>
          career.id === careerId
            ? { ...career, images: [...career.images, ...items] }
            : career,
        ),
      )
      toast.success('이미지가 업로드되었습니다.')
    } catch (error) {
      console.error('Career image upload failed:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      e.target.value = ''
    }
  }

  const handleRemoveCareerImage = (
    careerId: string,
    url: string,
    index: number,
  ) => {
    setCareers((prev) =>
      prev.map((career) =>
        career.id === careerId
          ? {
              ...career,
              images: career.images.filter(
                (image, imageIndex) =>
                  !(image.url === url && imageIndex === index),
              ),
            }
          : career,
      ),
    )
  }

  const handleCareerImageReorder = (
    careerId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    setCareers((prev) =>
      prev.map((career) => {
        if (career.id !== careerId) return career

        const newImages = [...career.images]
        const [movedImage] = newImages.splice(fromIndex, 1)
        newImages.splice(toIndex, 0, movedImage)

        return { ...career, images: newImages }
      }),
    )
  }

  const handleCareerImageDescriptionChange = (
    careerId: string,
    index: number,
    value: string,
  ) => {
    setCareers((prev) =>
      prev.map((career) =>
        career.id === careerId
          ? {
              ...career,
              images: career.images.map((image, imageIndex) =>
                imageIndex === index ? { ...image, description: value } : image,
              ),
            }
          : career,
      ),
    )
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

  const getAgeAtCareerStart = (career: Career) => {
    if (!formData.birthYear || !career.startYear || !career.startYear.trim())
      return null
    const birthYear = parseInt(formData.birthYear, 10)
    const targetYear = parseInt(career.startYear, 10)
    if (isNaN(birthYear) || isNaN(targetYear)) return null

    let age: number
    if (formData.birthEra === 'BC' && career.startEra === 'BC') {
      age = birthYear - targetYear
    } else if (formData.birthEra === 'BC' && career.startEra === 'AD') {
      age = birthYear + targetYear - 1
    } else {
      age = targetYear - birthYear
    }

    return age >= 0 ? age : null
  }

  // 경력 날짜 검증
  const validateCareerDates = (career: Career): string[] => {
    const errors: string[] = []

    // 시작일이 종료일보다 늦은 경우
    if (career.startYear && career.endYear && !career.isCurrent) {
      const startYear = parseInt(career.startYear, 10)
      const endYear = parseInt(career.endYear, 10)

      let isValid = false
      if (career.startEra === 'BC' && career.endEra === 'BC') {
        isValid = startYear >= endYear // BC는 숫자가 클수록 과거
      } else if (career.startEra === 'BC' && career.endEra === 'AD') {
        isValid = true // BC -> AD는 항상 유효
      } else if (career.startEra === 'AD' && career.endEra === 'AD') {
        isValid = startYear <= endYear
      }

      if (!isValid) {
        errors.push('시작일이 종료일보다 늦습니다.')
      }

      // 월/일 비교 (같은 연도인 경우)
      if (
        isValid &&
        startYear === endYear &&
        career.startMonth &&
        career.endMonth
      ) {
        const startMonth = parseInt(career.startMonth, 10)
        const endMonth = parseInt(career.endMonth, 10)

        if (startMonth > endMonth) {
          errors.push('시작월이 종료월보다 늦습니다.')
        } else if (
          startMonth === endMonth &&
          career.startDay &&
          career.endDay
        ) {
          const startDay = parseInt(career.startDay, 10)
          const endDay = parseInt(career.endDay, 10)
          if (startDay > endDay) {
            errors.push('시작일이 종료일보다 늦습니다.')
          }
        }
      }
    }

    // 경력 시작일이 생년월일보다 이른 경우
    if (formData.birthYear && career.startYear) {
      const age = getAgeAtCareerStart(career)
      if (age !== null && age < 0) {
        errors.push('경력 시작일이 출생일보다 이릅니다.')
      }
    }

    // 경력 종료일이 사망일보다 늦은 경우
    if (formData.deathYear && career.endYear && !career.isCurrent) {
      const deathYear = parseInt(formData.deathYear, 10)
      const endYear = parseInt(career.endYear, 10)

      let isValid = false
      if (formData.deathEra === 'BC' && career.endEra === 'BC') {
        isValid = deathYear <= endYear // BC는 숫자가 작을수록 미래
      } else if (career.endEra === 'BC' && formData.deathEra === 'AD') {
        isValid = true // BC -> AD는 항상 유효
      } else if (formData.deathEra === 'AD' && career.endEra === 'AD') {
        isValid = endYear <= deathYear
      }

      if (!isValid) {
        errors.push('경력 종료일이 사망일보다 늦습니다.')
      }
    }

    return errors
  }

  const handleProfileImagesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const invalidFile = files.find((file) => !file.type.startsWith('image/'))
    if (invalidFile) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024)
    if (oversizedFile) {
      toast.error('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploadingImage(true)
    try {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file)))
      const urls = uploaded.map((response) => response.url).filter(Boolean)

      setFormData((prev) => {
        const merged = [...prev.profileImageUrls, ...urls]
        return {
          ...prev,
          profileImageUrls: merged,
          profileImageUrl: merged[0] || '',
        }
      })
      toast.success(`${urls.length}개의 이미지가 업로드되었습니다.`)
    } catch (error) {
      console.error('Image upload failed:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (imageFiles.length !== files.length) {
      toast.error('일부 파일은 이미지가 아니어서 제외되었습니다.')
    }

    const oversizedFile = imageFiles.find(
      (file) => file.size > 10 * 1024 * 1024,
    )
    if (oversizedFile) {
      toast.error('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploadingImage(true)
    try {
      const uploaded = await Promise.all(
        imageFiles.map((file) => uploadImage(file)),
      )
      const urls = uploaded.map((response) => response.url).filter(Boolean)

      setFormData((prev) => {
        const merged = [...prev.profileImageUrls, ...urls]
        return {
          ...prev,
          profileImageUrls: merged,
          profileImageUrl: merged[0] || '',
        }
      })
      toast.success(`${urls.length}개의 이미지가 업로드되었습니다.`)
    } catch (error) {
      console.error('Image upload failed:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveProfileImage = (url: string) => {
    setFormData((prev) => {
      const remaining = prev.profileImageUrls.filter((item) => item !== url)
      return {
        ...prev,
        profileImageUrls: remaining,
        profileImageUrl: remaining[0] || '',
      }
    })
    toast.success('이미지가 제거되었습니다.')
  }

  const handleSetPrimaryProfileImage = (url: string) => {
    setFormData((prev) => {
      const remaining = prev.profileImageUrls.filter((item) => item !== url)
      const merged = [url, ...remaining]
      return {
        ...prev,
        profileImageUrls: merged,
        profileImageUrl: merged[0] || '',
      }
    })
    toast.success('대표 이미지가 변경되었습니다.')
  }

  const handleImagePreview = (url: string) => {
    setImagePreviewUrl(url)
  }

  const closeImagePreview = () => {
    setImagePreviewUrl(null)
  }

  // 이미지 순서 변경
  const handleImageDragStart = (index: number) => {
    setDraggedImageIndex(index)
  }

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedImageIndex === null || draggedImageIndex === index) return
  }

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) return

    setFormData((prev) => {
      const newUrls = [...prev.profileImageUrls]
      const [draggedItem] = newUrls.splice(draggedImageIndex, 1)
      newUrls.splice(dropIndex, 0, draggedItem)

      return {
        ...prev,
        profileImageUrls: newUrls,
        profileImageUrl: newUrls[0] || '',
      }
    })

    setDraggedImageIndex(null)
    toast.success('이미지 순서가 변경되었습니다.')
  }

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null)
  }

  const parseDateString = (date: string) => {
    const isBC = date.startsWith('-')
    const normalized = isBC ? date.slice(1) : date
    const [yearStr, monthStr, dayStr] = normalized.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const day = parseInt(dayStr, 10)
    return {
      era: (isBC ? 'BC' : 'AD') as Era,
      year,
      month,
      day,
    }
  }

  const buildInitialDate = (
    era: Era,
    year?: string,
    month?: string,
    day?: string,
  ) => {
    if (!year) return undefined
    const y = parseInt(year, 10)
    if (isNaN(y)) return undefined
    const m = month ? parseInt(month, 10) : 1
    const d = day ? parseInt(day, 10) : 1
    const yearStr = Math.abs(y).toString().padStart(4, '0')
    const monthStr = String(m).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    return `${era === 'BC' ? '-' : ''}${yearStr}-${monthStr}-${dayStr}`
  }

  const handleBirthDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setFormData((prev) => ({
      ...prev,
      birthEra: era,
      birthYear: year.toString(),
      birthMonth: month.toString(),
      birthDay: day.toString(),
    }))
    setShowBirthDateModal(false)

    // 출생일 선택 후 자동으로 사망일 선택 모달 열기
    if (!formData.isDeathDateUnknown) {
      setTimeout(() => {
        setShowDeathDateModal(true)
      }, 200) // 부드러운 전환을 위한 약간의 딜레이
    }
  }

  const handleDeathDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setFormData((prev) => ({
      ...prev,
      deathEra: era,
      deathYear: year.toString(),
      deathMonth: month.toString(),
      deathDay: day.toString(),
    }))
    setShowDeathDateModal(false)
  }

  const handleCareerStartDateSelect = (date: string) => {
    if (!activeCareerId) return
    const { era, year, month, day } = parseDateString(date)
    setCareers((prev) =>
      prev.map((career) =>
        career.id === activeCareerId
          ? {
              ...career,
              startEra: era,
              startYear: year.toString(),
              startMonth: month.toString(),
              startDay: day.toString(),
            }
          : career,
      ),
    )
    setShowCareerStartDateModal(false)
  }

  const handleCareerEndDateSelect = (date: string) => {
    if (!activeCareerId) return
    const { era, year, month, day } = parseDateString(date)
    setCareers((prev) =>
      prev.map((career) =>
        career.id === activeCareerId
          ? {
              ...career,
              endEra: era,
              endYear: year.toString(),
              endMonth: month.toString(),
              endDay: day.toString(),
            }
          : career,
      ),
    )
    setShowCareerEndDateModal(false)
  }

  const validateForm = (validateCareers: boolean = true): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = ERROR_MESSAGES.REQUIRED_NAME
    }

    if (!formData.surname.trim()) {
      newErrors.surname = ERROR_MESSAGES.REQUIRED_SURNAME
    }

    if (!formData.gender) {
      newErrors.gender = ERROR_MESSAGES.REQUIRED_GENDER
    }

    // 출생 국가 필수 검증
    if (!formData.birthCountryId) {
      newErrors.birthCountry = ERROR_MESSAGES.REQUIRED_BIRTH_COUNTRY
    }

    // 경력 필수 항목 검증 (선택적)
    if (validateCareers && careers.length > 0) {
      const careerErrors: { [key: string]: string[] } = {}
      careers.forEach((career, index) => {
        const errors: string[] = []

        if (!career.timelineTitle?.trim()) {
          errors.push(ERROR_MESSAGES.REQUIRED_CAREER_TITLE)
        }

        if (!career.startYear) {
          errors.push(ERROR_MESSAGES.REQUIRED_CAREER_START)
        }

        // 날짜 검증
        const dateValidation = validateCareerDates(career)
        if (dateValidation.length > 0) {
          errors.push(...dateValidation)
        }

        if (errors.length > 0) {
          careerErrors[career.id] = errors
        }
      })

      if (Object.keys(careerErrors).length > 0) {
        newErrors.careers = careerErrors
        // 첫 번째 에러가 있는 경력으로 이동
        const firstErrorCareerId = Object.keys(careerErrors)[0]
        setActiveCareerId(firstErrorCareerId)

        const errorMessages = Object.values(careerErrors)
          .flat()
          .slice(0, 3)
          .join(', ')
        toast.error(`경력 정보를 확인해주세요: ${errorMessages}`)
      }
    }

    // 날짜 유효성 검사
    const birthDateError = validateDate(
      formData.birthYear,
      formData.birthMonth,
      formData.birthDay,
      '출생',
    )
    if (birthDateError && !formData.isBirthDateUnknown) {
      newErrors.lifespan = birthDateError
    }

    // 사망일 검증
    if (
      !formData.isAlive &&
      !formData.isDeathDateUnknown &&
      formData.deathYear
    ) {
      const deathDateError = validateDate(
        formData.deathYear,
        formData.deathMonth,
        formData.deathDay,
        '사망',
      )
      if (deathDateError) {
        newErrors.lifespan = deathDateError
      }

      // 출생일과 사망일 비교
      if (!birthDateError && !deathDateError && formData.birthYear) {
        const birthDate = new Date(
          parseInt(formData.birthYear),
          formData.birthMonth ? parseInt(formData.birthMonth) - 1 : 0,
          formData.birthDay ? parseInt(formData.birthDay) : 1,
        )
        const deathDate = new Date(
          parseInt(formData.deathYear),
          formData.deathMonth ? parseInt(formData.deathMonth) - 1 : 0,
          formData.deathDay ? parseInt(formData.deathDay) : 1,
        )

        if (deathDate <= birthDate) {
          newErrors.lifespan = '사망일은 출생일 이후여야 합니다'
        }
      }
    }

    // 생존자의 출생년도 검증
    if (formData.isAlive && formData.birthYear) {
      const birthYear = parseInt(formData.birthYear)
      const currentYear = new Date().getFullYear()
      const age = currentYear - birthYear

      if (age > 150) {
        newErrors.lifespan =
          '생존자의 나이가 비현실적입니다. 생몰 정보를 확인해주세요.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 날짜 유효성 검사 함수
  const validateDate = (
    year: string,
    month: string,
    day: string,
    label: string,
  ): string | null => {
    if (!year) return null

    const y = parseInt(year)
    const m = month ? parseInt(month) : 0
    const d = day ? parseInt(day) : 0
    const currentYear = new Date().getFullYear()

    if (isNaN(y) || y < 1 || y > currentYear) {
      return `${label} 연도는 1년부터 ${currentYear}년 사이여야 합니다`
    }

    if (month && (isNaN(m) || m < 1 || m > 12)) {
      return `${label} 월은 1~12 사이여야 합니다`
    }

    if (day && (isNaN(d) || d < 1 || d > 31)) {
      return `${label} 일은 1~31 사이여야 합니다`
    }

    // 실제 날짜 유효성 검사
    if (month && day) {
      const date = new Date(y, m - 1, d)
      if (date.getMonth() !== m - 1 || date.getDate() !== d) {
        return `${label} 날짜가 유효하지 않습니다 (${m}월 ${d}일은 존재하지 않음)`
      }
    }

    return null
  }

  const handleStepChange = (step: 'basic' | 'career') => {
    if (step === 'career') {
      // 기본정보만 검증 (경력은 검증하지 않음)
      const basicValid = validateForm(false)
      // 생존 중: 출생일만 있으면 됨. 사망: 사망일 미상이거나 사망 연도 있으면 됨
      const lifespanValid =
        !formData.isBirthDateUnknown &&
        !!formData.birthYear &&
        (formData.isAlive ||
          formData.isDeathDateUnknown ||
          !!formData.deathYear)

      if (!lifespanValid) {
        setErrors((prev) => ({
          ...prev,
          lifespan: formData.isAlive
            ? '출생일을 입력해주세요.'
            : '생몰정보를 입력해주세요.',
        }))
      } else if (errors.lifespan) {
        setErrors((prev) => ({ ...prev, lifespan: '' }))
      }

      if (!basicValid || !lifespanValid) {
        toast.error('필수 항목을 입력해주세요.')
        triggerErrorFlash()
        return
      }
    }

    // 탭 전환 시 모든 모달 닫기
    setShowCountryModal(false)
    setShowCountryTransferModal(false)
    setShowDynastyModal(false)
    setShowReligionModal(false)
    setShowJobModal(false)
    setShowJobCategoryModal(false)
    setShowFatherModal(false)
    setShowMotherModal(false)
    setShowBirthDateModal(false)
    setShowDeathDateModal(false)
    setShowCareerStartDateModal(false)
    setShowCareerEndDateModal(false)
    setShowOrganizationModal(false)

    setCurrentStep(step)
  }

  const handleSubmit = async () => {
    playClick()

    // 모든 검증 (기본 정보 + 경력)
    if (!validateForm(true)) {
      toast.error('필수 항목을 입력해주세요.')
      triggerErrorFlash()
      return
    }

    // 확인 모달 표시
    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)

    try {
      // 임시 저장 데이터 삭제
      localStorage.removeItem('person-create-draft')

      const input: CreatePersonInput = {
        name: formData.name.trim(),
        surname: formData.surname.trim() || undefined,
        middleName: formData.middleName.trim() || undefined,
        nameDisplayOrder: formData.nameFormat,
        // 빈값이면 null로 보내서 DB에 지워지도록 (수정 시 기존 값 삭제 가능)
        originalName: formData.originalName.trim() || null,
        surnameMeaning: formData.surnameMeaning.trim() || null,
        nameMeaning: formData.nameMeaning.trim() || null,
        middleNameMeaning: formData.middleNameMeaning.trim() || null,
        gender: formData.gender,
        biography: formData.biography.trim() || undefined,
        profileImageUrl:
          formData.profileImageUrls[0] || formData.profileImageUrl || undefined,
        // 왕/군주 필드
        regnalName: formData.regnalName.trim() || undefined,
        templeName: formData.templeName.trim() || undefined,
        posthumousName: formData.posthumousName.trim() || undefined,
        // 소속 정보
        countryId: formData.birthCountryId || undefined, // 출생 국가를 primary로
        birthCityId: formData.birthCityId || undefined,
        deathCityId: formData.deathCityId || undefined,
        dynastyId: formData.dynastyId || undefined,
        religionId: formData.religionId || undefined,
        jobId: formData.jobIds.length > 0 ? formData.jobIds[0] : undefined, // 첫 번째 직업을 주 직업으로
        fatherId: formData.fatherId || undefined,
        motherId: formData.motherId || undefined,
      }

      // 출생일이 미상이 아니고 연도가 있을 경우에만 포함
      if (!formData.isBirthDateUnknown && formData.birthYear) {
        input.birth = {
          era: formData.birthEra,
          year: parseInt(formData.birthYear),
          month: formData.birthMonth
            ? parseInt(formData.birthMonth)
            : undefined,
          day: formData.birthDay ? parseInt(formData.birthDay) : undefined,
        }
      }

      // 사망일이 미상이 아니고 연도가 있을 경우에만 포함
      if (!formData.isDeathDateUnknown && formData.deathYear) {
        input.death = {
          era: formData.deathEra,
          year: parseInt(formData.deathYear),
          month: formData.deathMonth
            ? parseInt(formData.deathMonth)
            : undefined,
          day: formData.deathDay ? parseInt(formData.deathDay) : undefined,
        }
      }

      console.log(`${isEditMode ? 'Updating' : 'Creating'} person data:`, input)

      let personId: string

      if (isEditMode && id) {
        // 수정 모드
        await personApi.update(id, input)
        personId = id
        // 성공 메시지는 모든 작업 완료 후 표시
      } else {
        // 등록 모드
        const createdPerson = await personApi.create(input)
        personId = createdPerson?.id || createdPerson?.data?.id

        if (!personId) {
          throw new Error('Person ID를 가져올 수 없습니다.')
        }
        // 성공 메시지는 모든 작업 완료 후 표시
      }

      // Career 데이터 저장
      if (careers.length > 0 || isEditMode) {
        // 수정 모드: 기존 재임(tenure)·정부 경력(government) 목록 가져오기
        let originalTenures: any[] = []
        let originalGovernmentCareers: { id: string }[] = []
        if (isEditMode && id) {
          try {
            const [currentData, allCareersRes] = await Promise.all([
              personApi.getById(id),
              personCareerApi
                .getAllCareers(id)
                .catch(() => ({ government: [] })),
            ])
            originalTenures = currentData.governmentTenures || []
            originalGovernmentCareers = Array.isArray(allCareersRes?.government)
              ? allCareersRes.government.map((c: any) => ({ id: c.id }))
              : []
          } catch (error) {
            console.error('기존 경력 로드 실패:', error)
          }
        }

        // 수정 모드: 삭제된 재임(tenure) → 서버에서 삭제
        if (isEditMode && originalTenures.length > 0) {
          const deletedTenures = originalTenures.filter(
            (original: any) => !careers.find((c) => c.id === original.id),
          )
          for (const deleted of deletedTenures) {
            try {
              await personCareerApi.deleteGovernmentPositionTenure(deleted.id)
              console.log(`🗑️ 재임 삭제: ${deleted.title}`)
            } catch (error) {
              console.error('재임 삭제 실패:', error)
            }
          }
        }

        // 수정 모드: 삭제된 정부/공무원 경력(government career) → 서버에서 삭제
        if (isEditMode && originalGovernmentCareers.length > 0) {
          const deletedGovernmentCareers = originalGovernmentCareers.filter(
            (original) => !careers.find((c) => c.id === original.id),
          )
          for (const deleted of deletedGovernmentCareers) {
            try {
              await personCareerApi.deleteGovernmentCareer(deleted.id)
              console.log(`🗑️ 정부 경력 삭제: ${deleted.id}`)
            } catch (error) {
              console.error('정부 경력 삭제 실패:', error)
            }
          }
        }

        if (careers.length > 0) {
          toast.loading(`경력 정보 저장 중... (0/${careers.length})`)
        }

        for (let i = 0; i < careers.length; i++) {
          const career = careers[i]
          toast.loading(`경력 정보 저장 중... (${i + 1}/${careers.length})`)

          try {
            // Career 시작/종료일 포맷팅 (ISO-8601 DateTime 형식)
            const startDate = career.startYear
              ? `${career.startEra === 'BC' ? '-' : ''}${career.startYear.padStart(4, '0')}-${(career.startMonth || '01').padStart(2, '0')}-${(career.startDay || '01').padStart(2, '0')}T00:00:00.000Z`
              : undefined

            const endDate =
              !career.isCurrent && career.endYear
                ? `${career.endEra === 'BC' ? '-' : ''}${career.endYear.padStart(4, '0')}-${(career.endMonth || '12').padStart(2, '0')}-${(career.endDay || '31').padStart(2, '0')}T23:59:59.999Z`
                : undefined

            // Career 이미지 변환
            const images = career.images.map((img) => ({
              url: img.url,
              description: img.description || undefined,
            }))

            // 직업 카테고리 이름 가져오기
            const jobCategory = jobCategories.find(
              (c) => c.id === career.jobCategoryId,
            )
            const parentCategory = jobCategory?.parentId
              ? jobCategories.find((c) => c.id === jobCategory.parentId)
              : null
            const topLevelCategoryName =
              parentCategory?.name || jobCategory?.name || ''

            // Career 타입 판별 및 API 호출
            const baseCareerData = {
              personId,
              timelineTitle: career.timelineTitle || undefined,
              showPositionInfo: career.showPositionInfo,
              positionId: career.jobId, // 직급/직책 ID
              jobCategoryId: career.jobCategoryId || undefined,
              organizationId: career.organizationId || undefined,
              startDate,
              endDate,
              notes: career.note || undefined,
              images: images.length > 0 ? images : undefined,
            }

            // careerType에 따라 적절한 API 호출
            console.log(`🔍 경력 ${i + 1} 타입 체크:`, {
              careerType: career.careerType,
              title: career.timelineTitle,
            })

            if (career.careerType === 'government_position') {
              // 국가원수/왕위 재임 기록
              console.log(`📋 경력 ${i + 1} 데이터:`, {
                careerType: career.careerType,
                positionType: career.positionType,
                positionTitle: career.positionTitle,
                positionTitleEn: career.positionTitleEn,
                countryId: career.countryId,
                termNumber: career.termNumber,
                regnalNumber: career.regnalNumber,
                startDate,
                endDate,
              })

              if (!career.positionType || !career.positionTitle) {
                toast.error(`경력 ${i + 1}: 직위 타입과 직위명을 입력해주세요`)
                continue
              }

              const tenureData = {
                personId,
                positionType: career.positionType,
                title: career.positionTitle,
                titleEn: career.positionTitleEn || undefined,
                showPositionInfo: career.showPositionInfo, // 기존 showPositionInfo 사용
                countryId: career.countryId || undefined,
                historicalCountryId: undefined, // TODO: 역사적 국가 선택 UI 추가
                positionDefinitionId:
                  career.positionDefinitionId &&
                  career.positionDefinitionId.trim()
                    ? career.positionDefinitionId
                    : undefined,
                termNumber: career.termNumber
                  ? parseInt(career.termNumber)
                  : undefined,
                regnalNumber: career.regnalNumber
                  ? parseInt(career.regnalNumber)
                  : undefined,
                startDate: startDate!,
                endDate,
                appointmentMethod: career.appointmentMethod,
                endReason: career.endReason,
                endReasonDetail: career.endReasonDetail || undefined,
                notes: career.note || undefined,
                priority: career.priority,
              }

              console.log(`📤 왕위 재임 기록 전송 데이터:`, tenureData)

              // UUID 형식인지 확인 (기존 데이터인지 판단)
              const isExistingTenure =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  career.id,
                )

              if (isEditMode && isExistingTenure) {
                // 수정 모드 + 기존 데이터 → UPDATE
                await personCareerApi.updateGovernmentPositionTenure(
                  career.id,
                  tenureData,
                )
                console.log(`✅ 왕위 재임 기록 수정 완료: ${career.id}`)
              } else {
                // 등록 모드 또는 새로 추가된 데이터 → INSERT
                await personCareerApi.addGovernmentPositionTenure(tenureData)
                console.log(`✅ 왕위 재임 기록 추가 완료`)
              }
            } else if (
              career.careerType === 'military' ||
              topLevelCategoryName.includes('군사')
            ) {
              // 군인 경력
              await personCareerApi.addMilitaryCareer({
                ...baseCareerData,
                branch: undefined, // TODO: UI에서 군종 선택 추가
                position: career.title || undefined,
                termNumber: career.termNumber
                  ? parseInt(career.termNumber)
                  : undefined,
              })
            } else if (
              career.careerType === 'government' ||
              topLevelCategoryName.includes('정치') ||
              topLevelCategoryName.includes('행정')
            ) {
              // 정치인/공무원 경력 (직급 Job 필수) — 기존 항목은 이미 서버에 있으므로 추가 호출 생략
              const isNewGovernmentCareer =
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  career.id,
                )
              if (!isNewGovernmentCareer) {
                console.log(
                  `⏭️ 기존 정부 경력 건너뜀 (수정 API 없음): ${career.id}`,
                )
              } else {
                if (!career.jobId?.trim()) {
                  toast.error(
                    `경력 ${i + 1}: 정치인/공무원 경력에는 직급(직책)을 선택해주세요.`,
                  )
                  setIsSubmitting(false)
                  return
                }
                await personCareerApi.addGovernmentCareer({
                  ...baseCareerData,
                  positionId: career.jobId,
                  countryId: career.countryId || undefined,
                  department: undefined,
                  role: career.title || undefined,
                  termNumber: career.termNumber
                    ? parseInt(career.termNumber)
                    : undefined,
                })
              }
            } else if (
              career.careerType === 'business' ||
              topLevelCategoryName.includes('경제') ||
              topLevelCategoryName.includes('산업')
            ) {
              // 기업인 경력
              await personCareerApi.addBusinessCareer({
                ...baseCareerData,
                title: career.title || undefined,
                level: undefined,
              })
            } else if (
              career.careerType === 'academic' ||
              topLevelCategoryName.includes('학문') ||
              topLevelCategoryName.includes('교육')
            ) {
              // 학자 경력
              await personCareerApi.addAcademicCareer({
                ...baseCareerData,
                department: undefined,
                researchField: undefined,
              })
            } else if (
              career.careerType === 'athlete' ||
              topLevelCategoryName.includes('스포츠')
            ) {
              // 운동선수 경력
              await personCareerApi.addAthleteCareer({
                ...baseCareerData,
                sport: undefined,
                position: career.title || undefined,
                jerseyNumber: undefined,
              })
            } else if (
              career.careerType === 'religious' ||
              topLevelCategoryName.includes('종교')
            ) {
              // 종교인 경력
              await personCareerApi.addReligiousCareer({
                ...baseCareerData,
                religion: undefined,
                denomination: undefined,
                rank: career.title || undefined,
              })
            } else if (
              career.careerType === 'artist' ||
              topLevelCategoryName.includes('예술') ||
              topLevelCategoryName.includes('문화')
            ) {
              // 예술가 경력
              await personCareerApi.addArtistCareer({
                ...baseCareerData,
                artForm: undefined,
                style: undefined,
              })
            } else if (
              career.careerType === 'media' ||
              topLevelCategoryName.includes('언론') ||
              topLevelCategoryName.includes('출판')
            ) {
              // 언론인 경력
              await personCareerApi.addMediaCareer({
                ...baseCareerData,
                mediaType: undefined,
                role: career.title || undefined,
              })
            } else if (
              career.careerType === 'legal' ||
              topLevelCategoryName.includes('법조')
            ) {
              // 법조인 경력
              await personCareerApi.addLegalCareer({
                ...baseCareerData,
                specialization: undefined,
                courtLevel: undefined,
              })
            } else if (
              career.careerType === 'medical' ||
              topLevelCategoryName.includes('의료')
            ) {
              // 의료인 경력
              await personCareerApi.addMedicalCareer({
                ...baseCareerData,
                specialization: undefined,
                department: undefined,
              })
            } else {
              // 기타 - Government Career로 처리 (직급 Job 필수) — 기존 항목은 추가 호출 생략
              const isNewGovernmentCareer =
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  career.id,
                )
              if (isNewGovernmentCareer) {
                if (!career.jobId?.trim()) {
                  toast.error(
                    `경력 ${i + 1}: 경력 유형에 맞는 직급(직책)을 선택해주세요.`,
                  )
                  setIsSubmitting(false)
                  return
                }
                await personCareerApi.addGovernmentCareer({
                  ...baseCareerData,
                  positionId: career.jobId,
                  countryId: career.countryId || undefined,
                  department: undefined,
                  role: career.title || undefined,
                  termNumber: career.termNumber
                    ? parseInt(career.termNumber)
                    : undefined,
                })
              }
            }

            console.log(
              `Career ${i + 1}/${careers.length} saved as ${topLevelCategoryName}`,
            )
          } catch (careerError: any) {
            console.error(`Career ${i + 1} save failed:`, careerError)
            toast.dismiss()
            toast.error(`경력 ${i + 1} 저장 실패: ${career.timelineTitle}`)

            // 경력 저장 실패 시 중단
            setIsSubmitting(false)
            return
          }
        }

        toast.dismiss()
      }

      // 임시 저장 삭제 (등록 모드만)
      if (!isEditMode) {
        handleClearDraft()
      }

      // 모든 저장 성공 시에만 이동
      toast.success(
        isEditMode
          ? '인물 및 경력이 수정되었습니다.'
          : '인물 및 경력이 등록되었습니다.',
      )
      navigate('/persons')
    } catch (error: any) {
      console.error(
        `Person ${isEditMode ? 'update' : 'creation'} failed:`,
        error,
      )

      const actionName = isEditMode ? '수정' : '등록'

      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.error?.details?.errors) {
          const validationErrors = errorData.error.details.errors
          toast.error(
            `${actionName} 실패: ${validationErrors.map((e: any) => Object.values(e.constraints || {}).join(', ')).join(', ')}`,
          )
        } else {
          toast.error(
            `${actionName} 실패: ${errorData.error?.message || '알 수 없는 오류'}`,
          )
        }
      } else {
        toast.error(`인물 ${actionName}에 실패했습니다.`)
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
          setCurrentStep={handleStepChange}
          playClickSound={playClick}
          onBack={() => navigate('/persons')}
        />

        {/* 우측: 폼 영역 */}
        <FormArea>
          <FormAreaHeader>
            <FormAreaTitle>
              {isEditMode ? '인물 수정' : '인물 등록'}
            </FormAreaTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isEditMode && (
                <ActionButton
                  type="button"
                  $variant="secondary"
                  onClick={handleSaveDraft}
                >
                  임시 저장
                </ActionButton>
              )}
              <ActionButton
                type="button"
                $variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <FiSave />
                {isSubmitting
                  ? isEditMode
                    ? '수정 중...'
                    : '등록 중...'
                  : isEditMode
                    ? '수정'
                    : '등록'}
              </ActionButton>
            </div>
          </FormAreaHeader>

          <FormContent>
            {/* 기본 정보 단계 */}
            {currentStep === 'basic' && (
              <FormSection>
                {/* 프로필 이미지 */}
                <FormRow>
                  <FormLabel>
                    프로필 이미지
                    <FormLabelHint>
                      여러 이미지를 업로드할 수 있습니다. 썸네일을 클릭하여 대표
                      이미지를 선택하거나, 드래그하여 순서를 변경하세요.
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <ProfileImageContainer>
                      <ProfileImagePreview
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        $isDragging={isDraggingOver}
                      >
                        <ProfileImageInput
                          id="profile-images-create"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleProfileImagesUpload}
                          disabled={isUploadingImage}
                        />
                        {isUploadingImage ? (
                          <ProfileImagePlaceholder>
                            <UploadingSpinner />
                            <span>업로드 중...</span>
                          </ProfileImagePlaceholder>
                        ) : primaryProfileImage ? (
                          <>
                            <ProfileImage
                              src={primaryProfileImage}
                              alt="프로필"
                            />
                            <ImageOverlay>
                              <ImageOverlayButton
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleImagePreview(primaryProfileImage)
                                }}
                              >
                                <FiSearch size={18} />
                                <span>미리보기</span>
                              </ImageOverlayButton>
                            </ImageOverlay>
                            <RemoveImageButton
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveProfileImage(primaryProfileImage)
                              }}
                            >
                              <FiX size={16} />
                            </RemoveImageButton>
                          </>
                        ) : (
                          <ProfileImagePlaceholder>
                            <FiUser size={32} />
                            <span>
                              {isDraggingOver
                                ? '이미지를 놓아주세요'
                                : '클릭 또는 드래그하여 이미지 추가'}
                            </span>
                            <UploadHint>최대 10MB, 여러 장 가능</UploadHint>
                          </ProfileImagePlaceholder>
                        )}
                      </ProfileImagePreview>

                      {formData.profileImageUrls.length > 0 && (
                        <ImageCountBadge>
                          <FiLayers size={14} />총{' '}
                          {formData.profileImageUrls.length}개의 이미지
                        </ImageCountBadge>
                      )}

                      <ProfileImageThumbnails>
                        {formData.profileImageUrls.map((url, index) => (
                          <ProfileImageThumb
                            key={`${url}-${index}`}
                            $active={url === primaryProfileImage}
                            type="button"
                            draggable
                            onDragStart={() => handleImageDragStart(index)}
                            onDragOver={(e) => handleImageDragOver(e, index)}
                            onDrop={(e) => handleImageDrop(e, index)}
                            onDragEnd={handleImageDragEnd}
                            onClick={() => handleSetPrimaryProfileImage(url)}
                            style={{
                              opacity: draggedImageIndex === index ? 0.5 : 1,
                            }}
                          >
                            <img
                              src={url}
                              alt="프로필 썸네일"
                              draggable={false}
                            />
                            {url === primaryProfileImage && (
                              <PrimaryBadgeThumb>
                                <FiCheck size={12} />
                                대표
                              </PrimaryBadgeThumb>
                            )}
                            <ThumbActionButtons>
                              <ThumbActionButton
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleImagePreview(url)
                                }}
                                title="미리보기"
                              >
                                <FiSearch size={12} />
                              </ThumbActionButton>
                              <ThumbActionButton
                                type="button"
                                $danger
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRemoveProfileImage(url)
                                }}
                                title="삭제"
                              >
                                <FiX size={12} />
                              </ThumbActionButton>
                            </ThumbActionButtons>
                          </ProfileImageThumb>
                        ))}
                        {!isUploadingImage && (
                          <ProfileImageAddThumb
                            as="label"
                            htmlFor="profile-images-create"
                          >
                            <FiPlus />
                            <span>추가</span>
                          </ProfileImageAddThumb>
                        )}
                      </ProfileImageThumbnails>
                    </ProfileImageContainer>
                  </FormField>
                </FormRow>

                {/* 이미지 미리보기 모달 */}
                {imagePreviewUrl && (
                  <ImagePreviewModal onClick={closeImagePreview}>
                    <ImagePreviewContent onClick={(e) => e.stopPropagation()}>
                      <ImagePreviewClose onClick={closeImagePreview}>
                        <FiX size={24} />
                      </ImagePreviewClose>
                      <ImagePreviewImg
                        src={imagePreviewUrl}
                        alt="이미지 미리보기"
                      />
                    </ImagePreviewContent>
                  </ImagePreviewModal>
                )}

                {/* 이름 (이름·이름 원어·뜻 사이 구분선 없음) */}
                <FormRow $noBorder>
                  <FormLabel>
                    이름 <Required>*</Required>
                    <FormLabelHint>
                      전체 이름을 한 칸에 입력하면 성과 이름이 자동으로 구분됩니다. 한국식은 성+이름, 서양식은 이름+성 순으로 표시됩니다.
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <NameToggleRow>
                      <NameSegmentGroup>
                        <NameSegmentLabel>이름 형식</NameSegmentLabel>
                        <NameSegmentPill>
                          <NameSegmentButton
                            type="button"
                            $selected={formData.nameFormat === 'korean'}
                            onClick={() => {
                              // 형식만 바꾸고 성/이름/중간이름은 유지. 한 칸 입력란만 새 순서로 갱신
                              setFormData((prev) => ({
                                ...prev,
                                nameFormat: 'korean',
                                fullName: getPersonDisplayName({
                                  name: prev.name,
                                  surname: prev.surname,
                                  middleName: prev.middleName,
                                  nameDisplayOrder: 'korean',
                                }),
                              }))
                            }}
                            title="첫 글자=성, 나머지=이름 (예: 김철수)"
                          >
                            한국식
                          </NameSegmentButton>
                          <NameSegmentButton
                            type="button"
                            $selected={formData.nameFormat === 'western'}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                nameFormat: 'western',
                                fullName: getPersonDisplayName({
                                  name: prev.name,
                                  surname: prev.surname,
                                  middleName: prev.middleName,
                                  nameDisplayOrder: 'western',
                                }),
                              }))
                            }}
                            title="공백 기준 맨 뒤=성 (예: George Bush)"
                          >
                            서양식
                          </NameSegmentButton>
                        </NameSegmentPill>
                      </NameSegmentGroup>
                      <NameSegmentGroup>
                        <NameSegmentLabel>입력 방식</NameSegmentLabel>
                        <NameSegmentPill>
                          <NameSegmentButton
                            type="button"
                            $selected={formData.nameInputMode === 'simple'}
                            onClick={() => handleInputChange('nameInputMode', 'simple')}
                          >
                            한 칸 입력
                          </NameSegmentButton>
                          <NameSegmentButton
                            type="button"
                            $selected={formData.nameInputMode === 'detailed'}
                            onClick={() => handleInputChange('nameInputMode', 'detailed')}
                          >
                            성·이름·중간 따로
                          </NameSegmentButton>
                        </NameSegmentPill>
                      </NameSegmentGroup>
                    </NameToggleRow>
                    {formData.nameInputMode === 'simple' ? (
                      <>
                        <ErrorInput
                          type="text"
                          placeholder={
                            formData.nameFormat === 'korean'
                              ? '예: 김철수, 이순신'
                              : '예: George Bush, Elizabeth Windsor'
                          }
                          value={formData.fullName}
                          onChange={(e) => {
                            const fullName = e.target.value
                            handleInputChange('fullName', fullName)
                            parseFullNameToFields(fullName, formData.nameFormat)
                          }}
                          $hasError={!!errors.name || !!errors.surname}
                          $flash={errorFlashOn}
                          style={{ marginTop: 12 }}
                        />
                        {formData.fullName?.trim() && (
                          <NameParsePreview>
                            <NameParseDisplay>
                              {getPersonDisplayName({
                                name: formData.name,
                                surname: formData.surname,
                                middleName: formData.middleName,
                                nameDisplayOrder: formData.nameFormat,
                              })}
                            </NameParseDisplay>
                            <NameParseMeta>
                              성 {formData.surname || '—'} · 이름 {formData.name || '—'}
                              {formData.middleName ? ` · 중간 ${formData.middleName}` : ''}
                            </NameParseMeta>
                          </NameParsePreview>
                        )}
                      </>
                    ) : (
                      <>
                        <NameRow style={{ marginTop: 12 }}>
                          <NameInputWrapper>
                            <NameLabel>성 <Required>*</Required></NameLabel>
                            <ErrorInput
                              type="text"
                              placeholder="예: 김, Bush"
                              value={formData.surname}
                              onChange={(e) =>
                                handleInputChange('surname', e.target.value)
                              }
                              $hasError={!!errors.surname}
                              $flash={errorFlashOn}
                            />
                            {errors.surname && (
                              <ErrorText>{errors.surname}</ErrorText>
                            )}
                          </NameInputWrapper>
                          <NameInputWrapper>
                            <NameLabel>이름 <Required>*</Required></NameLabel>
                            <ErrorInput
                              type="text"
                              placeholder="예: 철수, George"
                              value={formData.name}
                              onChange={(e) =>
                                handleInputChange('name', e.target.value)
                              }
                              $hasError={!!errors.name}
                              $flash={errorFlashOn}
                            />
                          </NameInputWrapper>
                          {formData.nameFormat === 'western' && (
                            <NameInputWrapper>
                              <NameLabel>중간이름 (선택)</NameLabel>
                              <ErrorInput
                                type="text"
                                placeholder="예: Walker"
                                value={formData.middleName}
                                onChange={(e) =>
                                  handleInputChange('middleName', e.target.value)
                                }
                                $hasError={false}
                                $flash={false}
                              />
                            </NameInputWrapper>
                          )}
                        </NameRow>
                        {errors.name && <ErrorText>{errors.name}</ErrorText>}
                      </>
                    )}
                    {(errors.name || errors.surname) && (
                      <>
                        {errors.name && <ErrorText>{errors.name}</ErrorText>}
                        {errors.surname && (
                          <ErrorText>{errors.surname}</ErrorText>
                        )}
                      </>
                    )}
                  </FormField>
                </FormRow>

                {/* 이름 원어 (선택) */}
                <FormRow $noBorder>
                  <FormLabel>
                    이름 원어 (선택)
                    <FormLabelHint>
                      영어, 한자, 또는 원어로 된 이름을 입력하세요
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <Input
                      type="text"
                      placeholder="예: George Bush, 毛澤東, Владимир Путин"
                      value={formData.originalName}
                      onChange={(e) =>
                        handleInputChange('originalName', e.target.value)
                      }
                    />
                    <Hint>
                      예시: 조지 부시 → George Bush | 마오쩌둥 → 毛澤東 |
                      블라디미르 푸틴 → Владимир Путин
                    </Hint>
                  </FormField>
                </FormRow>

                {/* 성·이름(·서양식일 때만 중간이름)의 뜻 (선택) */}
                <FormRow $noBorder>
                  <FormLabel>
                    {formData.nameFormat === 'korean'
                      ? '성·이름의 뜻 (선택)'
                      : '성·이름·중간이름의 뜻 (선택)'}
                    <FormLabelHint>
                      한자 훈·음 등 (예: 金 = 쇠 금, 承 = 이을 승)
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <NameRow style={{ marginTop: 0 }}>
                      <NameInputWrapper>
                        <NameLabel>성의 뜻</NameLabel>
                        <Input
                          type="text"
                          placeholder="예: 金 = 쇠 금"
                          value={formData.surnameMeaning}
                          onChange={(e) =>
                            handleInputChange('surnameMeaning', e.target.value)
                          }
                        />
                      </NameInputWrapper>
                      <NameInputWrapper>
                        <NameLabel>이름의 뜻</NameLabel>
                        <Input
                          type="text"
                          placeholder="예: 承 = 이을 승"
                          value={formData.nameMeaning}
                          onChange={(e) =>
                            handleInputChange('nameMeaning', e.target.value)
                          }
                        />
                      </NameInputWrapper>
                      {formData.nameFormat === 'western' && (
                        <NameInputWrapper>
                          <NameLabel>중간이름의 뜻</NameLabel>
                          <Input
                            type="text"
                            placeholder="예: Walker"
                            value={formData.middleNameMeaning}
                            onChange={(e) =>
                              handleInputChange('middleNameMeaning', e.target.value)
                            }
                          />
                        </NameInputWrapper>
                      )}
                    </NameRow>
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
                        $hasError={!!errors.gender}
                        $flash={errorFlashOn}
                        onClick={() => handleInputChange('gender', '남')}
                      >
                        <IoMaleSharp style={{ color: '#3b82f6' }} />
                        남성
                      </SelectButton>
                      <SelectButton
                        $selected={formData.gender === '여'}
                        $hasError={!!errors.gender}
                        $flash={errorFlashOn}
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
                  <FormLabel>
                    생몰 정보
                    <FormLabelHint>
                      출생일은 필수이며, 사망일은 선택사항입니다
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <LifespanContainer>
                      <LifespanRow>
                        {/* 출생 */}
                        <LifespanItem>
                          <LifespanLabelRow>
                            <LifespanLabel>출생</LifespanLabel>
                            <InlineCheckRow>
                              <InlineCheckButton
                                type="button"
                                $checked={formData.isBirthDateUnknown}
                                onClick={() => {
                                  const next = !formData.isBirthDateUnknown
                                  handleInputChange('isBirthDateUnknown', next)
                                  if (next) {
                                    handleInputChange('birthYear', '')
                                    handleInputChange('birthMonth', '')
                                    handleInputChange('birthDay', '')
                                  }
                                }}
                              >
                                {formData.isBirthDateUnknown && <FiCheck />}
                              </InlineCheckButton>
                              <InlineCheckLabel>미상</InlineCheckLabel>
                            </InlineCheckRow>
                          </LifespanLabelRow>
                          {formData.isBirthDateUnknown ? (
                            <UnknownDateBox>미상</UnknownDateBox>
                          ) : (
                            <DateButton
                              onClick={() => setShowBirthDateModal(true)}
                              $hasValue={!!formData.birthYear}
                              $hasError={!!errors.lifespan}
                              $flash={errorFlashOn}
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
                            <RadioGroup>
                              <RadioOption
                                type="button"
                                $selected={
                                  !formData.isAlive &&
                                  !formData.isDeathDateUnknown
                                }
                                onClick={() => {
                                  handleInputChange('isAlive', false)
                                  handleInputChange('isDeathDateUnknown', false)
                                }}
                              >
                                <RadioDot
                                  $selected={
                                    !formData.isAlive &&
                                    !formData.isDeathDateUnknown
                                  }
                                />
                                <span>날짜 입력</span>
                              </RadioOption>
                              <RadioOption
                                type="button"
                                $selected={formData.isAlive}
                                onClick={() => {
                                  handleInputChange('isAlive', true)
                                  handleInputChange('isDeathDateUnknown', false)
                                  handleInputChange('deathYear', '')
                                  handleInputChange('deathMonth', '')
                                  handleInputChange('deathDay', '')
                                }}
                              >
                                <RadioDot $selected={formData.isAlive} />
                                <span>생존</span>
                              </RadioOption>
                              <RadioOption
                                type="button"
                                $selected={formData.isDeathDateUnknown}
                                onClick={() => {
                                  handleInputChange('isAlive', false)
                                  handleInputChange('isDeathDateUnknown', true)
                                  handleInputChange('deathYear', '')
                                  handleInputChange('deathMonth', '')
                                  handleInputChange('deathDay', '')
                                }}
                              >
                                <RadioDot
                                  $selected={formData.isDeathDateUnknown}
                                />
                                <span>미상</span>
                              </RadioOption>
                            </RadioGroup>
                          </LifespanLabelRow>
                          {formData.isAlive ? (
                            <AliveBox>생존 중</AliveBox>
                          ) : formData.isDeathDateUnknown ? (
                            <UnknownDateBox>미상</UnknownDateBox>
                          ) : (
                            <DateButton
                              onClick={() => setShowDeathDateModal(true)}
                              $hasValue={!!formData.deathYear}
                              $hasError={!!errors.lifespan}
                              $flash={errorFlashOn}
                            >
                              <FiCalendar />
                              <span>
                                {formatDeathDate()}
                                {calculatedAge && !formData.isAlive
                                  ? ` (향년 ${calculatedAge}세)`
                                  : ''}
                              </span>
                            </DateButton>
                          )}
                        </LifespanItem>
                      </LifespanRow>

                      {/* 나이 표시 */}
                      {calculatedAge !== null && (
                        <AgeDisplayRow>
                          <AgeDisplay>
                            {formData.isAlive
                              ? `현재 ${calculatedAge}세`
                              : `향년 ${calculatedAge}세`}
                          </AgeDisplay>
                        </AgeDisplayRow>
                      )}

                      <LifespanToggleRow>
                        <ToggleRow>
                          <ToggleLabel>
                            사건 타임라인에 출생/사망 포함
                          </ToggleLabel>
                          <ToggleButton
                            type="button"
                            $active={formData.showLifespanOnEventList}
                            onClick={() =>
                              handleInputChange(
                                'showLifespanOnEventList',
                                !formData.showLifespanOnEventList,
                              )
                            }
                          >
                            <ToggleThumb
                              $active={formData.showLifespanOnEventList}
                            />
                          </ToggleButton>
                        </ToggleRow>
                        <InfoBox>
                          활성화 시, 사건 목록 페이지에 "출생"과 "사망"이
                          자동으로 추가되어 다른 역사적 사건들과 함께 연대순으로
                          표시됩니다.
                        </InfoBox>
                      </LifespanToggleRow>
                    </LifespanContainer>
                    {errors.lifespan && (
                      <ErrorText>{errors.lifespan}</ErrorText>
                    )}
                  </FormField>
                </FormRow>

                {/* 별명/호/필명 */}
                <FormRow>
                  <FormLabel>
                    별명 및 칭호
                    <FormLabelHint>
                      본명 외에 알려진 별명, 호, 필명, 칭호 등을 입력하세요
                      (복수 입력 가능)
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <NicknameInputRow>
                      <Input
                        type="text"
                        placeholder="예: 스탈린, 강철의 사나이"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (nicknameInput.trim()) {
                              if (
                                formData.nicknames.includes(
                                  nicknameInput.trim(),
                                )
                              ) {
                                toast.error(ERROR_MESSAGES.DUPLICATE_NICKNAME)
                                return
                              }
                              if (formData.nicknames.length >= 10) {
                                toast.error(ERROR_MESSAGES.MAX_NICKNAMES)
                                return
                              }
                              if (nicknameInput.trim().length > 50) {
                                toast.error(ERROR_MESSAGES.NICKNAME_TOO_LONG)
                                return
                              }
                              playClick()
                              handleInputChange('nicknames', [
                                ...formData.nicknames,
                                nicknameInput.trim(),
                              ])
                              setNicknameInput('')
                            }
                          }
                        }}
                      />
                      <AddNicknameButton
                        type="button"
                        onClick={() => {
                          if (nicknameInput.trim()) {
                            if (
                              formData.nicknames.includes(nicknameInput.trim())
                            ) {
                              toast.error(ERROR_MESSAGES.DUPLICATE_NICKNAME)
                              return
                            }
                            if (formData.nicknames.length >= 10) {
                              toast.error(ERROR_MESSAGES.MAX_NICKNAMES)
                              return
                            }
                            if (nicknameInput.trim().length > 50) {
                              toast.error(ERROR_MESSAGES.NICKNAME_TOO_LONG)
                              return
                            }
                            playClick()
                            handleInputChange('nicknames', [
                              ...formData.nicknames,
                              nicknameInput.trim(),
                            ])
                            setNicknameInput('')
                          }
                        }}
                        disabled={!nicknameInput.trim()}
                      >
                        <FiPlus size={16} />
                        추가
                      </AddNicknameButton>
                    </NicknameInputRow>
                    {formData.nicknames.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {formData.nicknames.map((nickname, index) => (
                          <NicknameTag key={index}>
                            {index === 0 && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  background: '#3b82f6',
                                  color: 'white',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  marginRight: '0.375rem',
                                }}
                                title="첫 번째 별명이 대표 별명으로 표시됩니다"
                              >
                                대표
                              </span>
                            )}
                            <span style={{ flex: 1 }}>{nickname}</span>
                            {index > 0 && (
                              <span
                                className="action-icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playClick()
                                  // 위로 이동 (대표로 만들기)
                                  const newNicknames = [...formData.nicknames]
                                  const [item] = newNicknames.splice(index, 1)
                                  newNicknames.unshift(item)
                                  handleInputChange('nicknames', newNicknames)
                                  toast.success('대표 별명으로 설정되었습니다')
                                }}
                                title="대표 별명으로 설정"
                                style={{ marginRight: '0.25rem' }}
                              >
                                <FiTrendingUp size={12} />
                              </span>
                            )}
                            <span
                              className="remove-icon"
                              onClick={() => {
                                playClick()
                                handleInputChange(
                                  'nicknames',
                                  formData.nicknames.filter(
                                    (_, i) => i !== index,
                                  ),
                                )
                              }}
                            >
                              <FiX size={14} />
                            </span>
                          </NicknameTag>
                        ))}
                      </div>
                    )}
                    <Hint>
                      예시: 이오시프 주가시빌리 → 스탈린, 강철의 사나이 |
                      블라디미르 울리야노프 → 레닌 | 리처드 1세 → 사자심왕
                    </Hint>
                  </FormField>
                </FormRow>

                {/* 국가 및 가문 - 개선된 디자인 */}
                <FormRow>
                  <FormLabel>
                    소속 국가 및 가문
                    <FormLabelHint>
                      출생 국가와 소속 가문을 선택하세요
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <ModernSelectionGrid>
                      {/* 출생 국가 */}
                      <ModernSelectionCard
                        $hasValue={!!formData.birthCountryId}
                        $error={!!errors.birthCountry}
                        onClick={() => {
                          setCountryModalContext('birth')
                          setShowCountryModal(true)
                        }}
                        type="button"
                      >
                        <ModernCardIcon $color={DESIGN_TOKENS.colors.geography}>
                          <FiGlobe size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>
                            출생 국가 <Required>*</Required>
                          </ModernCardLabel>
                          <ModernCardValue
                            $hasValue={!!formData.birthCountryId}
                          >
                            {birthCountry ? (
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                }}
                              >
                                <span style={{ fontSize: '1.25rem' }}>
                                  {birthCountry.flagEmoji || '—'}
                                </span>
                                <span>{birthCountry.name}</span>
                              </span>
                            ) : (
                              '출생 국가를 선택하세요'
                            )}
                          </ModernCardValue>
                        </ModernCardContent>
                        {formData.birthCountryId && (
                          <ModernCardClear
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInputChange('birthCountryId', '')
                            }}
                          >
                            <FiX size={16} />
                          </ModernCardClear>
                        )}
                      </ModernSelectionCard>

                      {/* 가문 */}
                      <ModernSelectionCard
                        $hasValue={!!formData.dynastyId}
                        onClick={() => setShowDynastyModal(true)}
                        type="button"
                      >
                        <ModernCardIcon
                          $color={DESIGN_TOKENS.colors.organization}
                        >
                          <GiCrossedSwords size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>가문</ModernCardLabel>
                          <ModernCardValue $hasValue={!!formData.dynastyId}>
                            {selectedDynasty
                              ? selectedDynasty.name
                              : '가문을 선택하세요'}
                          </ModernCardValue>
                        </ModernCardContent>
                        {formData.dynastyId && (
                          <ModernCardClear
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInputChange('dynastyId', '')
                            }}
                          >
                            <FiX size={16} />
                          </ModernCardClear>
                        )}
                      </ModernSelectionCard>
                    </ModernSelectionGrid>
                    {errors.birthCountry && (
                      <ErrorText>{errors.birthCountry}</ErrorText>
                    )}
                  </FormField>
                </FormRow>

                {/* 출생지 / 사망지 (도시) — DB에 등록된 도시·행정구역에서 선택 */}
                <FormRow>
                  <FormLabel>
                    출생지 / 사망지 (도시)
                    <FormLabelHint>
                      등록된 도시 또는 국가의 행정구역에서 선택하세요
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <ModernSelectionGrid>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <FormLabel style={{ marginBottom: 6, fontSize: 12 }}>출생지 (도시)</FormLabel>
                        <Input
                          as="select"
                          value={formData.birthCityId}
                          onChange={(e) => handleInputChange('birthCityId', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px' }}
                        >
                          <option value="">선택 안 함</option>
                          {(formData.birthCountryId
                            ? cities.filter((c) => c.countryId === formData.birthCountryId)
                            : cities
                          ).map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                              {city.countryId && countries.find((co) => co.id === city.countryId)
                                ? ` (${countries.find((co) => co.id === city.countryId)?.name})`
                                : ''}
                            </option>
                          ))}
                        </Input>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <FormLabel style={{ marginBottom: 6, fontSize: 12 }}>사망지 (도시)</FormLabel>
                        <Input
                          as="select"
                          value={formData.deathCityId}
                          onChange={(e) => handleInputChange('deathCityId', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px' }}
                        >
                          <option value="">선택 안 함</option>
                          {cities.map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                              {city.countryId && countries.find((co) => co.id === city.countryId)
                                ? ` (${countries.find((co) => co.id === city.countryId)?.name})`
                                : ''}
                            </option>
                          ))}
                        </Input>
                      </div>
                    </ModernSelectionGrid>
                  </FormField>
                </FormRow>

                {/* 국가 이적 이력 */}
                <FormRow>
                  <FormLabel>
                    국가 이적 이력
                    <FormLabelHint>
                      시민권 변경이나 국적 이동 이력을 기록하세요
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {transferCountries.map((transfer, index) => (
                        <CountryTransferItem key={index}>
                          <TransferArrow>
                            <FiArrowRight />
                          </TransferArrow>
                          <TransferInfo>
                            <TransferCountryName>
                              <span style={{ fontSize: '1.125rem' }}>
                                {transfer.country?.flagEmoji || '—'}
                              </span>
                              <span>
                                {transfer.country?.name || '알 수 없음'}
                              </span>
                            </TransferCountryName>
                            <TransferYear>
                              {transfer.year}년
                              {transfer.month && ` ${transfer.month}월`}
                              {transfer.day && ` ${transfer.day}일`} 이적
                            </TransferYear>
                            {transfer.note && (
                              <TransferNote>{transfer.note}</TransferNote>
                            )}
                          </TransferInfo>
                          <TransferRemoveButton
                            type="button"
                            onClick={() => {
                              playClick()
                              handleInputChange(
                                'countryTransfers',
                                formData.countryTransfers.filter(
                                  (_, i) => i !== index,
                                ),
                              )
                            }}
                          >
                            <FiX size={14} />
                          </TransferRemoveButton>
                        </CountryTransferItem>
                      ))}
                      <AddCountryButton
                        type="button"
                        onClick={() => setShowCountryTransferModal(true)}
                      >
                        <FiPlus size={16} />
                        이적 이력 추가
                      </AddCountryButton>
                    </div>
                  </FormField>
                </FormRow>

                {/* 👑 왕/군주 칭호 - 직업이 왕/군주이거나 가문이 있을 때 표시 */}
                {(() => {
                  // 선택된 직업 이름들 가져오기
                  const selectedJobNames = formData.jobIds
                    .map((id) => jobs.find((j) => j.id === id)?.name)
                    .filter(Boolean) as string[]

                  // 왕/군주 관련 직업인지 확인
                  const monarchKeywords = [
                    '왕',
                    '여왕',
                    '황제',
                    '황후',
                    '국왕',
                    '천황',
                    '술탄',
                    '차르',
                    '칸',
                    '왕세자',
                    '황태자',
                  ]
                  const isMonarch = selectedJobNames.some((name) =>
                    monarchKeywords.some((keyword) => name.includes(keyword)),
                  )

                  // 왕/군주이거나 가문이 있으면 표시
                  if (!isMonarch && !formData.dynastyId) return null

                  return (
                    <FormRow>
                      <FormLabel>왕/군주 칭호</FormLabel>
                      <FormField>
                        <MonarchSection>
                          <MonarchSectionHeader>
                            <MonarchIcon>
                              <GiCrown />
                            </MonarchIcon>
                            <MonarchTitle>왕/군주 칭호</MonarchTitle>
                          </MonarchSectionHeader>

                          <MonarchHint>
                            {isMonarch
                              ? '직업이 왕/군주로 선택되었습니다. 왕호, 묘호, 시호 등을 입력하세요.'
                              : '가문에 속한 왕족의 경우 왕호, 묘호, 시호 등을 입력할 수 있습니다.'}
                          </MonarchHint>

                          <MonarchFieldGroup>
                            {/* 왕호/재위명 */}
                            <MonarchField>
                              <MonarchFieldLabel>
                                왕호/재위명
                                <MonarchFieldBadge>서양식</MonarchFieldBadge>
                              </MonarchFieldLabel>
                              <Input
                                type="text"
                                placeholder="예: Louis, Henry, Elizabeth, James"
                                value={formData.regnalName}
                                onChange={(e) =>
                                  handleInputChange(
                                    'regnalName',
                                    e.target.value,
                                  )
                                }
                              />
                              <Hint
                                style={{
                                  fontSize: '0.75rem',
                                  marginTop: '0.5rem',
                                  color: '#78350f',
                                }}
                              >
                                서양 군주의 재위명을 입력하세요. 재위 번호(14세
                                등)는 경력 등록 시 입력합니다.
                              </Hint>
                            </MonarchField>

                            {/* 묘호 */}
                            <MonarchField>
                              <MonarchFieldLabel>
                                묘호
                                <MonarchFieldBadge>
                                  동아시아식
                                </MonarchFieldBadge>
                              </MonarchFieldLabel>
                              <Input
                                type="text"
                                placeholder="예: 세종, 태종, 고종, 성조(聖祖)"
                                value={formData.templeName}
                                onChange={(e) =>
                                  handleInputChange(
                                    'templeName',
                                    e.target.value,
                                  )
                                }
                              />
                              <Hint
                                style={{
                                  fontSize: '0.75rem',
                                  marginTop: '0.5rem',
                                  color: '#78350f',
                                }}
                              >
                                한중일 군주의 묘호를 입력하세요. (예: 조선 세종,
                                청 강희제/성조)
                              </Hint>
                            </MonarchField>

                            {/* 시호 */}
                            <MonarchField>
                              <MonarchFieldLabel>
                                시호
                                <MonarchFieldBadge>선택사항</MonarchFieldBadge>
                              </MonarchFieldLabel>
                              <Input
                                type="text"
                                placeholder="예: 세종장헌영문예무인성명효대왕, 무열왕"
                                value={formData.posthumousName}
                                onChange={(e) =>
                                  handleInputChange(
                                    'posthumousName',
                                    e.target.value,
                                  )
                                }
                              />
                              <Hint
                                style={{
                                  fontSize: '0.75rem',
                                  marginTop: '0.5rem',
                                  color: '#78350f',
                                }}
                              >
                                군주의 완전한 시호를 입력하세요. 매우 길 수
                                있으므로 선택사항입니다.
                              </Hint>
                            </MonarchField>
                          </MonarchFieldGroup>

                          <Hint
                            style={{
                              marginTop: '16px',
                              color: '#92400e',
                              fontSize: '0.875rem',
                            }}
                          >
                            예시:
                            <br />• 조선 제4대 국왕 세종: 묘호 "세종", 시호
                            "세종장헌영문예무인성명효대왕"
                            <br />• 프랑스 루이 14세: 왕호 "Louis" (재위 번호
                            "14"는 아래 재임 기록에서 입력)
                            <br />• 영국 제임스 1세/6세: 왕호 "James" (잉글랜드
                            "1", 스코틀랜드 "6"은 각 재위 기록에서 입력)
                            <br />• 청나라 강희제: 묘호 "성조(聖祖)", 연호
                            "강희(康熙)"는 경력사항 탭에서 입력
                          </Hint>
                        </MonarchSection>
                      </FormField>
                    </FormRow>
                  )
                })()}

                {/* 소속 및 관계 정보 - 개선된 디자인 */}
                <FormRow>
                  <FormLabel>
                    종교 및 가족 관계
                    <FormLabelHint>종교와 부모 정보를 입력하세요</FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <ModernSelectionGrid>
                      {/* 종교 */}
                      <ModernSelectionCard
                        $hasValue={!!formData.religionId}
                        onClick={() => setShowReligionModal(true)}
                        type="button"
                      >
                        <ModernCardIcon $color={DESIGN_TOKENS.colors.belief}>
                          <FiHeart size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>종교</ModernCardLabel>
                          <ModernCardValue $hasValue={!!formData.religionId}>
                            {selectedReligion
                              ? selectedReligion.name
                              : '종교를 선택하세요'}
                          </ModernCardValue>
                        </ModernCardContent>
                        {formData.religionId && (
                          <ModernCardClear
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInputChange('religionId', '')
                            }}
                          >
                            <FiX size={16} />
                          </ModernCardClear>
                        )}
                      </ModernSelectionCard>

                      {/* 빈 공간 (2x2 그리드 유지) */}
                      <div></div>

                      {/* 아버지 */}
                      <ModernSelectionCard
                        $hasValue={!!formData.fatherId}
                        onClick={() => setShowFatherModal(true)}
                        type="button"
                      >
                        <ModernCardIcon $color={DESIGN_TOKENS.colors.person}>
                          <FiUser size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>아버지</ModernCardLabel>
                          <ModernCardValue $hasValue={!!formData.fatherId}>
                            {selectedFather ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.125rem',
                                }}
                              >
                                <span>
                                  {getPersonDisplayName(selectedFather)}
                                </span>
                                {(selectedFather.birthYear ||
                                  selectedFather.deathYear) && (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      fontWeight: '400',
                                    }}
                                  >
                                    {selectedFather.birthYear || '?'} ~{' '}
                                    {selectedFather.deathYear ||
                                      (selectedFather.isAlive ? '생존' : '?')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '아버지를 선택하세요'
                            )}
                          </ModernCardValue>
                        </ModernCardContent>
                        {formData.fatherId && (
                          <ModernCardClear
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInputChange('fatherId', '')
                            }}
                          >
                            <FiX size={16} />
                          </ModernCardClear>
                        )}
                      </ModernSelectionCard>

                      {/* 어머니 */}
                      <ModernSelectionCard
                        $hasValue={!!formData.motherId}
                        onClick={() => setShowMotherModal(true)}
                        type="button"
                      >
                        <ModernCardIcon $color={DESIGN_TOKENS.colors.person}>
                          <FiUsers size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>어머니</ModernCardLabel>
                          <ModernCardValue $hasValue={!!formData.motherId}>
                            {selectedMother ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.125rem',
                                }}
                              >
                                <span>
                                  {getPersonDisplayName(selectedMother)}
                                </span>
                                {(selectedMother.birthYear ||
                                  selectedMother.deathYear) && (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      fontWeight: '400',
                                    }}
                                  >
                                    {selectedMother.birthYear || '?'} ~{' '}
                                    {selectedMother.deathYear ||
                                      (selectedMother.isAlive ? '생존' : '?')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '어머니를 선택하세요'
                            )}
                          </ModernCardValue>
                        </ModernCardContent>
                        {formData.motherId && (
                          <ModernCardClear
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInputChange('motherId', '')
                            }}
                          >
                            <FiX size={16} />
                          </ModernCardClear>
                        )}
                      </ModernSelectionCard>
                    </ModernSelectionGrid>
                  </FormField>
                </FormRow>

                {/* 약력 */}
                <FormRow>
                  <FormLabel>
                    약력
                    <FormLabelHint>
                      인물의 주요 생애와 업적을 간략히 작성하세요
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    <BiographyTextarea
                      placeholder="예: 대한민국의 정치인이자 독립운동가로, 1919년 3·1 운동에 참여하였으며..."
                      value={formData.biography}
                      onChange={(e) =>
                        handleInputChange('biography', e.target.value)
                      }
                      rows={6}
                      maxLength={2000}
                    />
                    <CharacterCountRow>
                      <CharacterCount
                        $warning={formData.biography.length > 1800}
                      >
                        {formData.biography.length} / 2,000자
                      </CharacterCount>
                      {formData.biography.length > 1800 && (
                        <CharacterWarning>
                          권장 길이에 도달했습니다
                        </CharacterWarning>
                      )}
                    </CharacterCountRow>
                    <Hint>
                      인물의 생애, 주요 업적, 역사적 의의 등을 포함하여
                      작성하세요.
                    </Hint>
                  </FormField>
                </FormRow>

                {/* 직업 - 개선된 다중 선택 */}
                <FormRow>
                  <FormLabel>
                    직업 분류 (대표 직업)
                    <FormLabelHint>
                      이 인물을 대표하는 직업을 선택하세요 (복수 선택 가능)
                    </FormLabelHint>
                  </FormLabel>
                  <FormField>
                    {/* 카테고리 미선택 시: 카테고리 선택 유도 */}
                    {selectedJobParentCategoryId === 'all' ? (
                      <ModernSelectionCard
                        $hasValue={false}
                        onClick={() => setShowJobCategoryModal(true)}
                        type="button"
                      >
                        <ModernCardIcon $color={DESIGN_TOKENS.colors.job}>
                          <FiLayers size={22} />
                        </ModernCardIcon>
                        <ModernCardContent>
                          <ModernCardLabel>직업 분류</ModernCardLabel>
                          <ModernCardValue $hasValue={false}>
                            직업 카테고리를 선택하세요
                          </ModernCardValue>
                        </ModernCardContent>
                      </ModernSelectionCard>
                    ) : (
                      /* 카테고리 선택됨: 통합 직업 선택 카드 */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        {/* 통합 직업 카드 */}
                        <ModernSelectionCard
                          $hasValue={formData.jobIds.length > 0}
                          onClick={() => setShowJobModal(true)}
                          type="button"
                        >
                          <ModernCardIcon $color={DESIGN_TOKENS.colors.job}>
                            <FiBriefcase size={22} />
                          </ModernCardIcon>
                          <ModernCardContent style={{ flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              <ModernCardLabel>직업</ModernCardLabel>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <FiLayers size={10} />
                                {
                                  parentJobCategories.find(
                                    (c: any) =>
                                      c.id === selectedJobParentCategoryId,
                                  )?.name
                                }
                                {selectedJobCategoryId !== 'all' &&
                                  selectedJobCategory && (
                                    <> › {selectedJobCategory.name}</>
                                  )}
                              </span>
                            </div>
                            {formData.jobIds.length > 0 ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                  marginTop: '0.5rem',
                                }}
                              >
                                {selectedJobs.map((job) => (
                                  <JobBadgeInCard
                                    key={job.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    <span>{getJobLabel(job)}</span>
                                    <span
                                      className="remove-icon"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        playClick()
                                        const newJobIds =
                                          formData.jobIds.filter(
                                            (id) => id !== job.id,
                                          )
                                        handleInputChange('jobIds', newJobIds)
                                      }}
                                    >
                                      <FiX size={14} />
                                    </span>
                                  </JobBadgeInCard>
                                ))}
                              </div>
                            ) : (
                              <ModernCardValue $hasValue={false}>
                                직업을 선택하세요
                              </ModernCardValue>
                            )}
                          </ModernCardContent>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              alignItems: 'flex-end',
                            }}
                          >
                            <JobCategoryChangeButton
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                playClick()
                                setShowJobCategoryModal(true)
                              }}
                            >
                              카테고리 변경
                            </JobCategoryChangeButton>
                            {formData.jobIds.length > 0 && (
                              <JobCountBadge>
                                {formData.jobIds.length}개
                              </JobCountBadge>
                            )}
                          </div>
                        </ModernSelectionCard>
                      </div>
                    )}
                    <Hint>
                      이 인물의 대표적인 직업을 선택하세요. 시기별 세부 경력은
                      "경력사항" 탭에서 등록할 수 있습니다.
                    </Hint>
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
                      <span>타임라인</span>
                      <CareerCount>{careers.length}</CareerCount>
                    </CareerHeaderTitle>
                    <AddCareerButton onClick={handleAddCareer} type="button">
                      <FiPlus />
                      타임라인 항목 추가
                    </AddCareerButton>
                  </CareerHeader>

                  {careers.length === 0 && (
                    <div
                      style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: '#f8fafc',
                        border: '2px dashed #e2e8f0',
                        borderRadius: '12px',
                        margin: '1rem 0 2rem 0',
                      }}
                    >
                      <FiAlertCircle
                        size={48}
                        style={{ color: '#cbd5e1', marginBottom: '1rem' }}
                      />
                      <div
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '0.5rem',
                        }}
                      >
                        타임라인 항목이 없습니다
                      </div>
                      <div
                        style={{
                          fontSize: '0.938rem',
                          color: '#64748b',
                          marginBottom: '1.5rem',
                        }}
                      >
                        상단의 "타임라인 항목 추가" 버튼을 눌러서 경력을
                        추가하세요
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#94a3b8',
                          lineHeight: '1.6',
                        }}
                      >
                        타임라인 항목을 추가하면 임기/활동 기간, 활동 국가,
                        소속 조직 등을 입력할 수 있습니다.
                      </div>
                    </div>
                  )}

                  <CareerLayout>
                    <TimelineSidebar>
                      <TimelineList>
                        {orderedCareers.map((career, index) => {
                          // 타임라인 제목 생성 로직
                          let displayTitle = career.timelineTitle
                          if (
                            !displayTitle &&
                            career.termNumber &&
                            career.title
                          ) {
                            displayTitle = `제${career.termNumber}대 ${career.title}`
                          } else if (!displayTitle && career.title) {
                            displayTitle = career.title
                          } else if (!displayTitle) {
                            displayTitle = `항목 ${index + 1}`
                          }

                          const careerErrors = validateCareerDates(career)
                          const hasErrors =
                            (errors.careers as { [key: string]: string[] })?.[
                              career.id
                            ]?.length > 0

                          return (
                            <React.Fragment key={career.id}>
                              <TimelineItem
                                $active={activeCareerId === career.id}
                                $isCurrent={career.isCurrent}
                                type="button"
                                onClick={() => setActiveCareerId(career.id)}
                              >
                                <TimelineMarker>
                                  <TimelineDot
                                    $active={activeCareerId === career.id}
                                    $isCurrent={career.isCurrent}
                                  />
                                  {index < orderedCareers.length - 1 && (
                                    <TimelineLine />
                                  )}
                                </TimelineMarker>
                                <TimelineContent>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: career.isCurrent
                                          ? '#10b981'
                                          : undefined,
                                      }}
                                    >
                                      {displayTitle}
                                      {career.isCurrent && (
                                        <span
                                          style={{
                                            marginLeft: '0.25rem',
                                            fontSize: '0.7rem',
                                          }}
                                        >
                                          (진행중)
                                        </span>
                                      )}
                                    </strong>
                                    {(careerErrors.length > 0 || hasErrors) && (
                                      <span
                                        style={{
                                          color: '#ef4444',
                                          fontSize: '0.75rem',
                                        }}
                                        title={careerErrors.join('\n')}
                                      >
                                        ⚠️
                                      </span>
                                    )}
                                  </div>
                                  <span>
                                    {career.startYear
                                      ? formatCareerDate(career, 'start')
                                      : '시작일 미정'}
                                  </span>
                                  <TimelineItemActions>
                                    <TimelineItemButton
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMoveCareerUp(career.id)
                                      }}
                                      disabled={index === 0}
                                      title="위로 이동"
                                    >
                                      ↑
                                    </TimelineItemButton>
                                    <TimelineItemButton
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMoveCareerDown(career.id)
                                      }}
                                      disabled={
                                        index === orderedCareers.length - 1
                                      }
                                      title="아래로 이동"
                                    >
                                      ↓
                                    </TimelineItemButton>
                                    <TimelineItemButton
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDuplicateCareer(career.id)
                                      }}
                                      title="복제"
                                    >
                                      <FiCopy size={14} />
                                    </TimelineItemButton>
                                    <TimelineItemButton
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteCareer(career.id)
                                      }}
                                      $danger
                                      title="삭제"
                                    >
                                      <FiX size={14} />
                                    </TimelineItemButton>
                                  </TimelineItemActions>
                                </TimelineContent>
                              </TimelineItem>
                            </React.Fragment>
                          )
                        })}
                      </TimelineList>
                    </TimelineSidebar>

                    <CareerFormPanel>
                      {activeCareer ? (
                        <CareerEditForm>
                          <CareerFormHeader>
                            <CareerFormTitle>
                              <FiBriefcase />
                              타임라인 항목 편집
                            </CareerFormTitle>
                          </CareerFormHeader>

                          <CareerFormBody>
                            {/* 0. 경력 타입 선택 */}
                            <FormRow>
                              <FormLabel>
                                경력 타입 <Required>*</Required>
                                <FormLabelHint>
                                  해당 시기의 직업 분류를 선택하세요.
                                </FormLabelHint>
                              </FormLabel>
                              <FormField>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {[
                                    {
                                      value: 'government_position',
                                      label: '국가원수/왕위',
                                    },
                                    {
                                      value: 'government',
                                      label: '정부/공무원',
                                    },
                                    {
                                      value: 'military',
                                      label: '군사',
                                    },
                                    {
                                      value: 'business',
                                      label: '기업',
                                    },
                                    {
                                      value: 'academic',
                                      label: '학술',
                                    },
                                    {
                                      value: 'religious',
                                      label: '종교',
                                    },
                                    {
                                      value: 'artist',
                                      label: '예술',
                                    },
                                    {
                                      value: 'athlete',
                                      label: '체육',
                                    },
                                    {
                                      value: 'media',
                                      label: '언론',
                                    },
                                    {
                                      value: 'legal',
                                      label: '법조',
                                    },
                                    {
                                      value: 'medical',
                                      label: '의료',
                                    },
                                  ].map((type) => (
                                    <button
                                      key={type.value}
                                      type="button"
                                      onClick={() =>
                                        handleCareerInputChange(
                                          activeCareer.id,
                                          'careerType',
                                          type.value,
                                        )
                                      }
                                      style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border:
                                          activeCareer.careerType === type.value
                                            ? '2px solid #3b82f6'
                                            : '1.5px solid #e2e8f0',
                                        background:
                                          activeCareer.careerType === type.value
                                            ? '#eff6ff'
                                            : 'white',
                                        color:
                                          activeCareer.careerType === type.value
                                            ? '#1e40af'
                                            : '#64748b',
                                        fontSize: '0.875rem',
                                        fontWeight:
                                          activeCareer.careerType === type.value
                                            ? '600'
                                            : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                      }}
                                    >
                                      {type.label}
                                    </button>
                                  ))}
                                </div>
                                <Hint>
                                  {activeCareer.careerType ===
                                  'government_position'
                                    ? '국가원수, 왕, 황제, 대통령 등의 공식 재임 기록입니다.'
                                    : '해당 시기의 경력 유형을 선택하세요.'}
                                </Hint>
                              </FormField>
                            </FormRow>

                            {/* 1. 제목 (필수) */}
                            <FormRow>
                              <FormLabel>
                                제목 <Required>*</Required>
                              </FormLabel>
                              <FormField>
                                <Input
                                  type="text"
                                  placeholder="예: 대통령 재임, 파리 유학, 애플 CEO 재직"
                                  value={activeCareer.timelineTitle}
                                  onChange={(e) =>
                                    handleCareerInputChange(
                                      activeCareer.id,
                                      'timelineTitle',
                                      e.target.value,
                                    )
                                  }
                                  style={{
                                    borderColor:
                                      !activeCareer.timelineTitle?.trim() &&
                                      (errors.careers as any)?.[activeCareer.id]
                                        ? '#ef4444'
                                        : undefined,
                                  }}
                                />
                                {!activeCareer.timelineTitle?.trim() &&
                                  (errors.careers as any)?.[
                                    activeCareer.id
                                  ] && (
                                    <ErrorText>제목을 입력해주세요</ErrorText>
                                  )}
                              </FormField>
                            </FormRow>

                            {/* 2. 임기/활동 기간 (필수) */}
                            <FormRow>
                              <FormLabel>
                                임기/활동 기간 <Required>*</Required>
                              </FormLabel>
                              <FormField>
                                <PeriodRow>
                                  <DateRangeInline>
                                    <DateRangeColumn>
                                      <DateRangeLabel>시작</DateRangeLabel>
                                      <DateButton
                                        type="button"
                                        onClick={() =>
                                          setShowCareerStartDateModal(true)
                                        }
                                        $hasValue={!!activeCareer.startYear}
                                        style={{
                                          borderColor:
                                            !activeCareer.startYear &&
                                            (errors.careers as any)?.[
                                              activeCareer.id
                                            ]
                                              ? '#ef4444'
                                              : undefined,
                                        }}
                                      >
                                        <FiCalendar />
                                        <span>
                                          {activeCareer.startYear
                                            ? formatCareerDate(
                                                activeCareer,
                                                'start',
                                              )
                                            : '시작일 선택'}
                                        </span>
                                      </DateButton>
                                    </DateRangeColumn>
                                    <DateRangeInlineSeparator>
                                      ~
                                    </DateRangeInlineSeparator>
                                    <DateRangeColumn>
                                      <DateRangeLabel>종료</DateRangeLabel>
                                      {activeCareer.isCurrent ? (
                                        <DateRangeCurrent>
                                          현재
                                        </DateRangeCurrent>
                                      ) : (
                                        <DateButton
                                          type="button"
                                          onClick={() =>
                                            setShowCareerEndDateModal(true)
                                          }
                                          $hasValue={!!activeCareer.endYear}
                                        >
                                          <FiCalendar />
                                          <span>
                                            {activeCareer.endYear
                                              ? formatCareerDate(
                                                  activeCareer,
                                                  'end',
                                                )
                                              : '종료일 선택'}
                                          </span>
                                        </DateButton>
                                      )}
                                    </DateRangeColumn>
                                  </DateRangeInline>
                                  <PeriodStatus>
                                    <ToggleRow>
                                      <ToggleLabel>현재 진행 중</ToggleLabel>
                                      <ToggleButton
                                        type="button"
                                        $active={activeCareer.isCurrent}
                                        onClick={() =>
                                          handleCareerInputChange(
                                            activeCareer.id,
                                            'isCurrent',
                                            !activeCareer.isCurrent,
                                          )
                                        }
                                      >
                                        <ToggleThumb
                                          $active={activeCareer.isCurrent}
                                        />
                                      </ToggleButton>
                                    </ToggleRow>
                                  </PeriodStatus>
                                </PeriodRow>
                                {!activeCareer.startYear &&
                                  (errors.careers as any)?.[
                                    activeCareer.id
                                  ] && (
                                    <ErrorText>시작일을 입력해주세요</ErrorText>
                                  )}
                                {validateCareerDates(activeCareer).length >
                                  0 && (
                                  <ErrorText>
                                    {validateCareerDates(activeCareer).join(
                                      ', ',
                                    )}
                                  </ErrorText>
                                )}
                                {getAgeAtCareerStart(activeCareer) !== null && (
                                  <AgeHint>
                                    만 {getAgeAtCareerStart(activeCareer)}세에
                                    시작
                                    {activeCareer.endYear &&
                                      !activeCareer.isCurrent &&
                                      (() => {
                                        const birthYear = parseInt(
                                          formData.birthYear,
                                        )
                                        const endYear = parseInt(
                                          activeCareer.endYear,
                                        )
                                        let endAge = 0

                                        if (
                                          formData.birthEra === 'BC' &&
                                          activeCareer.endEra === 'BC'
                                        ) {
                                          endAge = birthYear - endYear
                                        } else if (
                                          formData.birthEra === 'BC' &&
                                          activeCareer.endEra === 'AD'
                                        ) {
                                          endAge = birthYear + endYear - 1
                                        } else {
                                          endAge = endYear - birthYear
                                        }

                                        const startAge =
                                          getAgeAtCareerStart(activeCareer) || 0
                                        const duration = endAge - startAge

                                        return `, ${endAge}세에 종료 (${duration}년간 재임)`
                                      })()}
                                  </AgeHint>
                                )}
                              </FormField>
                            </FormRow>

                            {/* 3. 활동 국가 */}
                            <FormRow>
                              <FormLabel>활동 국가</FormLabel>
                              <FormField>
                                <ModernSelectionCard
                                  $hasValue={!!activeCareer.countryId}
                                  onClick={() => {
                                    setCountryModalContext('career')
                                    setShowCountryModal(true)
                                  }}
                                  type="button"
                                >
                                  <ModernCardIcon
                                    $color={DESIGN_TOKENS.colors.geography}
                                  >
                                    <FiGlobe size={22} />
                                  </ModernCardIcon>
                                  <ModernCardContent>
                                    <ModernCardLabel>활동 국가</ModernCardLabel>
                                    <ModernCardValue
                                      $hasValue={!!activeCareer.countryId}
                                    >
                                      {(() => {
                                        const country =
                                          countries.find(
                                            (c) =>
                                              c.id === activeCareer.countryId,
                                          ) ||
                                          historicalCountries.find(
                                            (c) =>
                                              c.id === activeCareer.countryId,
                                          )
                                        return country ? (
                                          <span
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.5rem',
                                            }}
                                          >
                                            <span
                                              style={{ fontSize: '1.25rem' }}
                                            >
                                              {country.flagEmoji || '—'}
                                            </span>
                                            <span>{country.name}</span>
                                          </span>
                                        ) : (
                                          '활동 국가를 선택하세요'
                                        )
                                      })()}
                                    </ModernCardValue>
                                  </ModernCardContent>
                                  {activeCareer.countryId && (
                                    <ModernCardClear
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCareerInputChange(
                                          activeCareer.id,
                                          'countryId',
                                          '',
                                        )
                                      }}
                                    >
                                      <FiX size={16} />
                                    </ModernCardClear>
                                  )}
                                </ModernSelectionCard>
                                <Hint>
                                  해당 경력을 수행한 국가를 선택하세요.
                                </Hint>
                              </FormField>
                            </FormRow>

                            {/* 4. 직책 정보 표시 여부 토글 */}
                            <FormRow>
                              <FormLabel>직책 정보 표시</FormLabel>
                              <FormField>
                                <ToggleRow>
                                  <ToggleLabel>
                                    사건 페이지에 직책 정보를 표시합니다
                                  </ToggleLabel>
                                  <ToggleButton
                                    type="button"
                                    $active={activeCareer.showPositionInfo}
                                    onClick={() =>
                                      handleCareerInputChange(
                                        activeCareer.id,
                                        'showPositionInfo',
                                        !activeCareer.showPositionInfo,
                                      )
                                    }
                                  >
                                    <ToggleThumb
                                      $active={activeCareer.showPositionInfo}
                                    />
                                  </ToggleButton>
                                </ToggleRow>
                                <Hint>
                                  활성화하면 사건 리스트/상세 페이지에 "제32대
                                  대통령" 같은 직책 정보가 표시됩니다.
                                  비활성화하면 이름만 표시됩니다.
                                </Hint>
                              </FormField>
                            </FormRow>

                            {/* 5. 직책 정보 (선택) */}
                            <FormRow>
                              <FormLabel>직책 정보 (선택)</FormLabel>
                              <FormField>
                                <ToggleRow>
                                  <ToggleLabel>직책/직업 상세 입력</ToggleLabel>
                                  <ToggleButton
                                    type="button"
                                    $active={activeCareer.showPositionInfo}
                                    onClick={() =>
                                      handleCareerInputChange(
                                        activeCareer.id,
                                        'showPositionInfo',
                                        !activeCareer.showPositionInfo,
                                      )
                                    }
                                  >
                                    <ToggleThumb
                                      $active={activeCareer.showPositionInfo}
                                    />
                                  </ToggleButton>
                                </ToggleRow>
                                <ToggleHint>
                                  이 시기의 구체적인 직책을 입력합니다. 예:
                                  대령, 대통령, CEO 등
                                </ToggleHint>
                              </FormField>
                            </FormRow>

                            {activeCareer.showPositionInfo && (
                              <>
                                {/* 국가원수/왕위일 때는 직위 정의 선택 */}
                                {activeCareer.careerType ===
                                'government_position' ? (
                                  <>
                                    <FormRow>
                                      <FormLabel>
                                        직위 타입 <Required>*</Required>
                                      </FormLabel>
                                      <FormField>
                                        <select
                                          value={
                                            activeCareer.positionType ||
                                            'HEAD_OF_STATE'
                                          }
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'positionType',
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #e2e8f0',
                                            fontSize: '0.938rem',
                                            width: '100%',
                                          }}
                                        >
                                          <option value="HEAD_OF_STATE">
                                            국가원수 (대통령, 국왕, 황제)
                                          </option>
                                          <option value="HEAD_OF_GOVERNMENT">
                                            정부수반 (총리, 수상)
                                          </option>
                                          <option value="HEIR_APPARENT">
                                            왕세자/황태자
                                          </option>
                                          <option value="REGENT">섭정</option>
                                          <option value="ROYAL_NOBLE_TITLE">
                                            왕족/귀족 칭호
                                          </option>
                                        </select>
                                      </FormField>
                                    </FormRow>

                                    <FormRow>
                                      <FormLabel>
                                        직위명 <Required>*</Required>
                                        <FormLabelHint>
                                          예: "대통령", "국왕", "황제", "총리"
                                        </FormLabelHint>
                                      </FormLabel>
                                      <FormField>
                                        <Input
                                          type="text"
                                          placeholder="예: 대통령"
                                          value={
                                            activeCareer.positionTitle || ''
                                          }
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'positionTitle',
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            borderColor:
                                              !activeCareer.positionTitle &&
                                              (errors.careers as any)?.[
                                                activeCareer.id
                                              ]
                                                ? '#ef4444'
                                                : undefined,
                                          }}
                                        />
                                        {!activeCareer.positionTitle &&
                                          (errors.careers as any)?.[
                                            activeCareer.id
                                          ] && (
                                            <ErrorText>
                                              직위명을 입력해주세요
                                            </ErrorText>
                                          )}
                                      </FormField>
                                    </FormRow>

                                    <FormRow>
                                      <FormLabel>영문 직위명</FormLabel>
                                      <FormField>
                                        <Input
                                          type="text"
                                          placeholder="예: President, King, Emperor"
                                          value={
                                            activeCareer.positionTitleEn || ''
                                          }
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'positionTitleEn',
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </FormField>
                                    </FormRow>
                                  </>
                                ) : (
                                  <FormRow>
                                    <FormLabel>
                                      계급/직급 <Required>*</Required>
                                      <FormLabelHint>
                                        이 사람의 지위 (예: 대장, CEO, 장관)
                                      </FormLabelHint>
                                    </FormLabel>
                                    <FormField>
                                      <ModernSelectionCard
                                        $hasValue={!!activeCareer.jobId}
                                        onClick={() => setShowJobModal(true)}
                                        type="button"
                                      >
                                        <ModernCardIcon
                                          $color={DESIGN_TOKENS.colors.job}
                                        >
                                          <FiBriefcase size={22} />
                                        </ModernCardIcon>
                                        <ModernCardContent>
                                          <ModernCardLabel>
                                            계급/직급
                                          </ModernCardLabel>
                                          <ModernCardValue
                                            $hasValue={!!activeCareer.jobId}
                                          >
                                            {activeCareer.jobId &&
                                            activeCareer.jobName
                                              ? activeCareer.jobName
                                              : '계급/직급 선택 (예: 대장, CEO, 장관)'}
                                          </ModernCardValue>
                                        </ModernCardContent>
                                        {activeCareer.jobId && (
                                          <ModernCardClear
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              playClick()
                                              setSelectedJobParentCategoryId(
                                                'all',
                                              )
                                              setSelectedJobCategoryId('all')
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'jobId',
                                                '',
                                              )
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'jobName',
                                                '',
                                              )
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'jobCategoryId',
                                                '',
                                              )
                                            }}
                                          >
                                            <FiX size={16} />
                                          </ModernCardClear>
                                        )}
                                      </ModernSelectionCard>
                                    </FormField>
                                  </FormRow>
                                )}

                                {/* 소속 조직 (국가원수/왕위가 아닐 때만 표시) */}
                                {activeCareer.careerType !==
                                  'government_position' && (
                                  <FormRow>
                                    <FormLabel>
                                      소속 조직 <Required>*</Required>
                                      <FormLabelHint>
                                        근무한 조직/부대/기업
                                      </FormLabelHint>
                                    </FormLabel>
                                    <FormField>
                                      <ModernSelectionCard
                                        $hasValue={
                                          !!activeCareer.organizationId
                                        }
                                        onClick={() =>
                                          setShowOrganizationModal(true)
                                        }
                                        type="button"
                                      >
                                        <ModernCardIcon
                                          $color={
                                            DESIGN_TOKENS.colors.organization
                                          }
                                        >
                                          <FiPackage size={22} />
                                        </ModernCardIcon>
                                        <ModernCardContent>
                                          <ModernCardLabel>
                                            소속 조직
                                          </ModernCardLabel>
                                          <ModernCardValue
                                            $hasValue={
                                              !!activeCareer.organizationId
                                            }
                                          >
                                            {(() => {
                                              const org = organizations.find(
                                                (o) =>
                                                  o.id ===
                                                  activeCareer.organizationId,
                                              )
                                              return org
                                                ? org.name
                                                : '소속 조직 선택 (예: 제8군단, 삼성전자, 국방부)'
                                            })()}
                                          </ModernCardValue>
                                        </ModernCardContent>
                                        {activeCareer.organizationId && (
                                          <ModernCardClear
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'organizationId',
                                                '',
                                              )
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'organization',
                                                '',
                                              )
                                            }}
                                          >
                                            <FiX size={16} />
                                          </ModernCardClear>
                                        )}
                                      </ModernSelectionCard>
                                    </FormField>
                                  </FormRow>
                                )}

                                {/* 역할/보직 (국가원수/왕위가 아닐 때만 표시) */}
                                {activeCareer.careerType !==
                                  'government_position' && (
                                  <FormRow>
                                    <FormLabel>
                                      역할/보직
                                      <FormLabelHint>
                                        구체적인 역할이나 보직명 (선택)
                                      </FormLabelHint>
                                    </FormLabel>
                                    <FormField>
                                      <TermNumberRow>
                                        <TermNumberInput>
                                          <TermNumberPrefix>
                                            제
                                          </TermNumberPrefix>
                                          <Input
                                            type="text"
                                            placeholder="32"
                                            value={activeCareer.termNumber}
                                            onChange={(e) =>
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'termNumber',
                                                e.target.value.replace(
                                                  /[^0-9]/g,
                                                  '',
                                                ),
                                              )
                                            }
                                            style={{
                                              width: '80px',
                                              textAlign: 'center',
                                            }}
                                          />
                                          <TermNumberSuffix>
                                            대
                                          </TermNumberSuffix>
                                        </TermNumberInput>
                                        <Input
                                          type="text"
                                          placeholder="예: 군단장, 최고경영자, 국방부장관"
                                          value={activeCareer.title}
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'title',
                                              e.target.value,
                                            )
                                          }
                                          style={{ flex: 1 }}
                                        />
                                      </TermNumberRow>
                                      <Hint>
                                        조직에서 맡은 구체적인 역할이나 직책을
                                        입력하세요
                                      </Hint>
                                    </FormField>
                                  </FormRow>
                                )}

                                {/* 국가원수/왕위 전용 필드 */}
                                {activeCareer.careerType ===
                                  'government_position' && (
                                  <>
                                    <FormRow>
                                      <FormLabel>사건 페이지 표시</FormLabel>
                                      <FormField>
                                        <ToggleRow>
                                          <ToggleLabel>
                                            사건 리스트/타임라인에 직책 정보
                                            표시
                                          </ToggleLabel>
                                          <ToggleButton
                                            type="button"
                                            $active={
                                              activeCareer.showPositionInfoForTenure !==
                                              false
                                            }
                                            onClick={() =>
                                              handleCareerInputChange(
                                                activeCareer.id,
                                                'showPositionInfoForTenure',
                                                !activeCareer.showPositionInfoForTenure,
                                              )
                                            }
                                          >
                                            <ToggleThumb
                                              $active={
                                                activeCareer.showPositionInfoForTenure !==
                                                false
                                              }
                                            />
                                          </ToggleButton>
                                        </ToggleRow>
                                        <Hint>
                                          활성화하면 사건 페이지에서 "제32대
                                          대통령" 같은 직책 정보가 표시됩니다.
                                          비활성화하면 이름만 표시됩니다.
                                        </Hint>
                                      </FormField>
                                    </FormRow>

                                    <FormRow>
                                      <FormLabel>
                                        재위번호
                                        <FormLabelHint>
                                          서양 군주용 (예: 루이 14세의 "14")
                                        </FormLabelHint>
                                      </FormLabel>
                                      <FormField>
                                        <Input
                                          type="text"
                                          placeholder="14"
                                          value={
                                            activeCareer.regnalNumber || ''
                                          }
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'regnalNumber',
                                              e.target.value.replace(
                                                /[^0-9]/g,
                                                '',
                                              ),
                                            )
                                          }
                                          style={{ width: '120px' }}
                                        />
                                        <Hint>
                                          동아시아 군주는 "대수"를 사용하고,
                                          서양 군주는 재위번호를 사용합니다
                                        </Hint>
                                      </FormField>
                                    </FormRow>

                                    <FormRow>
                                      <FormLabel>즉위/취임 방식</FormLabel>
                                      <FormField>
                                        <select
                                          value={
                                            activeCareer.appointmentMethod || ''
                                          }
                                          onChange={(e) =>
                                            handleCareerInputChange(
                                              activeCareer.id,
                                              'appointmentMethod',
                                              e.target.value || undefined,
                                            )
                                          }
                                          style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #e2e8f0',
                                            fontSize: '0.938rem',
                                            width: '100%',
                                          }}
                                        >
                                          <option value="">선택 안함</option>
                                          <option value="HEREDITARY">
                                            세습 (왕위 계승)
                                          </option>
                                          <option value="DIRECT_ELECTION">
                                            직접 선거
                                          </option>
                                          <option value="INDIRECT_ELECTION">
                                            간접 선거
                                          </option>
                                          <option value="PARLIAMENTARY_ELECTION">
                                            의회 선출
                                          </option>
                                          <option value="APPOINTMENT">
                                            임명
                                          </option>
                                          <option value="COUP">
                                            쿠데타/혁명
                                          </option>
                                          <option value="OTHER">기타</option>
                                        </select>
                                      </FormField>
                                    </FormRow>

                                    {!activeCareer.isCurrent && (
                                      <>
                                        <FormRow>
                                          <FormLabel>퇴위/퇴임 사유</FormLabel>
                                          <FormField>
                                            <select
                                              value={
                                                activeCareer.endReason || ''
                                              }
                                              onChange={(e) =>
                                                handleCareerInputChange(
                                                  activeCareer.id,
                                                  'endReason',
                                                  e.target.value || undefined,
                                                )
                                              }
                                              style={{
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1.5px solid #e2e8f0',
                                                fontSize: '0.938rem',
                                                width: '100%',
                                              }}
                                            >
                                              <option value="">
                                                선택 안함
                                              </option>
                                              <option value="TERM_COMPLETED">
                                                임기 만료 (정상)
                                              </option>
                                              <option value="RESIGNATION">
                                                사임/사퇴
                                              </option>
                                              <option value="ABDICATION">
                                                자진 퇴위
                                              </option>
                                              <option value="SUCCESSION_TRANSFER">
                                                양위/선위
                                              </option>
                                              <option value="REMOVAL">
                                                폐위/해임
                                              </option>
                                              <option value="IMPEACHMENT">
                                                탄핵
                                              </option>
                                              <option value="DEATH_IN_OFFICE">
                                                재임 중 사망
                                              </option>
                                              <option value="OVERTHROWN">
                                                쿠데타로 축출
                                              </option>
                                              <option value="WAR_DEFEAT">
                                                전쟁 패배
                                              </option>
                                              <option value="STATE_DISSOLVED">
                                                국가 멸망
                                              </option>
                                              <option value="OTHER">
                                                기타
                                              </option>
                                            </select>
                                          </FormField>
                                        </FormRow>

                                        {activeCareer.endReason && (
                                          <FormRow>
                                            <FormLabel>사유 상세</FormLabel>
                                            <FormField>
                                              <Input
                                                type="text"
                                                placeholder="예: 국민투표로 퇴위 결정"
                                                value={
                                                  activeCareer.endReasonDetail ||
                                                  ''
                                                }
                                                onChange={(e) =>
                                                  handleCareerInputChange(
                                                    activeCareer.id,
                                                    'endReasonDetail',
                                                    e.target.value,
                                                  )
                                                }
                                              />
                                            </FormField>
                                          </FormRow>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </>
                            )}

                            {/* 6. 활동 내용/설명 */}
                            <FormRow>
                              <FormLabel>활동 내용 / 설명</FormLabel>
                              <FormField>
                                <TextArea
                                  placeholder="이 기간 동안의 주요 활동이나 업적을 입력하세요"
                                  value={activeCareer.note}
                                  onChange={(e) =>
                                    handleCareerInputChange(
                                      activeCareer.id,
                                      'note',
                                      e.target.value,
                                    )
                                  }
                                  rows={3}
                                />
                              </FormField>
                            </FormRow>

                            {/* 7. 주요 경력 표시 토글 */}
                            <FormRow>
                              <FormLabel>주요 경력</FormLabel>
                              <FormField>
                                <ToggleRow>
                                  <ToggleLabel>주요 경력으로 표시</ToggleLabel>
                                  <ToggleButton
                                    type="button"
                                    $active={activeCareer.priority === 0}
                                    onClick={() =>
                                      handleCareerInputChange(
                                        activeCareer.id,
                                        'priority',
                                        activeCareer.priority === 0
                                          ? careers.length
                                          : 0,
                                      )
                                    }
                                  >
                                    <ToggleThumb
                                      $active={activeCareer.priority === 0}
                                    />
                                  </ToggleButton>
                                </ToggleRow>
                                <ToggleHint>
                                  사건 리스트에서 각종 사건들 사이에 노출됩니다.
                                </ToggleHint>
                              </FormField>
                            </FormRow>

                            {/* 8. 이미지 */}
                            <FormRow>
                              <FormLabel>이미지</FormLabel>
                              <FormField>
                                <CareerImageGrid>
                                  {activeCareer.images.map((image, index) => (
                                    <CareerImageItem
                                      key={`${image.url}-${index}`}
                                      draggable
                                      onDragStart={() =>
                                        setDraggedCareerImageIndex(index)
                                      }
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        if (
                                          draggedCareerImageIndex !== null &&
                                          draggedCareerImageIndex !== index
                                        ) {
                                          handleCareerImageReorder(
                                            activeCareer.id,
                                            draggedCareerImageIndex,
                                            index,
                                          )
                                        }
                                        setDraggedCareerImageIndex(null)
                                      }}
                                      onDragEnd={() =>
                                        setDraggedCareerImageIndex(null)
                                      }
                                      style={{
                                        opacity:
                                          draggedCareerImageIndex === index
                                            ? 0.5
                                            : 1,
                                        cursor: 'move',
                                      }}
                                    >
                                      <CareerImageThumb
                                        type="button"
                                        data-tooltip={
                                          image.description || undefined
                                        }
                                      >
                                        <img
                                          src={image.url}
                                          alt="경력 이미지"
                                        />
                                        <CareerImageRemove
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleRemoveCareerImage(
                                              activeCareer.id,
                                              image.url,
                                              index,
                                            )
                                          }}
                                        >
                                          <FiX size={12} />
                                        </CareerImageRemove>
                                      </CareerImageThumb>
                                      <CareerImageDescriptionInput
                                        type="text"
                                        placeholder="이미지 설명"
                                        value={image.description}
                                        onChange={(e) =>
                                          handleCareerImageDescriptionChange(
                                            activeCareer.id,
                                            index,
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </CareerImageItem>
                                  ))}
                                  <CareerImageAdd
                                    as="label"
                                    htmlFor={`career-images-${activeCareer.id}`}
                                  >
                                    <FiPlus />
                                    이미지 추가
                                  </CareerImageAdd>
                                  <CareerImageInput
                                    id={`career-images-${activeCareer.id}`}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) =>
                                      handleCareerImagesUpload(
                                        activeCareer.id,
                                        e,
                                      )
                                    }
                                  />
                                </CareerImageGrid>
                              </FormField>
                            </FormRow>
                          </CareerFormBody>
                        </CareerEditForm>
                      ) : (
                        <EmptyCareerFormHint>
                          <FiBriefcase
                            size={32}
                            style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}
                          />
                          <div
                            style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#64748b',
                              marginBottom: '0.25rem',
                            }}
                          >
                            타임라인 항목을 선택하세요
                          </div>
                          <div
                            style={{ fontSize: '0.875rem', color: '#94a3b8' }}
                          >
                            왼쪽 타임라인에서 항목을 클릭하거나 새 항목을
                            추가하세요
                          </div>
                        </EmptyCareerFormHint>
                      )}
                    </CareerFormPanel>
                  </CareerLayout>
                </CareerManagementSection>
              </FormSection>
            )}
          </FormContent>
        </FormArea>
      </ContentWrapper>

      {/* 직업 선택 모달 - 경력용 (STEP 2: 직업 선택) */}
      {showJobModal && activeCareer && currentStep === 'career' && (
        <Modal onClick={() => setShowJobModal(false)}>
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '650px' }}
          >
            <ModalHeader style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <JobCategoryModalStep>STEP 2</JobCategoryModalStep>
                <ModalTitle style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  직업 선택
                </ModalTitle>
              </div>
              <ModalCloseButton onClick={() => setShowJobModal(false)}>
                <FiX />
              </ModalCloseButton>
            </ModalHeader>

            {/* 현재 선택된 카테고리 표시 */}
            {(selectedJobParentCategoryId !== 'all' ||
              selectedJobCategoryId !== 'all') && (
              <CurrentCategoryBanner>
                <CurrentCategoryText>
                  <FiLayers style={{ fontSize: '1rem' }} />
                  {selectedJobParentCategoryId !== 'all' && (
                    <>
                      {
                        parentJobCategories.find(
                          (c: any) => c.id === selectedJobParentCategoryId,
                        )?.name
                      }
                      {selectedJobCategoryId !== 'all' &&
                        selectedJobCategory && (
                          <> › {selectedJobCategory.name}</>
                        )}
                    </>
                  )}
                </CurrentCategoryText>
                <CurrentCategoryAction
                  type="button"
                  onClick={() => {
                    setShowJobModal(false)
                    setTimeout(() => {
                      setShowJobCategoryModal(true)
                    }, 200)
                  }}
                >
                  카테고리 변경
                </CurrentCategoryAction>
              </CurrentCategoryBanner>
            )}

            <SearchWrapper
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <FiSearch />
              <SearchInput
                type="text"
                placeholder="직업 검색..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                autoFocus
                style={{ border: 'none', background: 'transparent' }}
              />
            </SearchWrapper>

            <JobModalList>
              {filteredJobs.map((job) => (
                <JobModalListItem
                  key={job.id}
                  $selected={activeCareer.jobId === job.id}
                  onClick={() => {
                    const jobLabel = getJobLabel(job)
                    handleCareerInputChange(activeCareer.id, 'jobId', job.id)
                    handleCareerInputChange(
                      activeCareer.id,
                      'jobCategoryId',
                      selectedJobParentCategoryId,
                    )
                    handleCareerInputChange(
                      activeCareer.id,
                      'jobName',
                      jobLabel,
                    )
                    // title은 자동으로 채우지 않음 (사용자가 별도로 입력)
                    setShowJobModal(false)
                    setJobSearchTerm('')
                  }}
                >
                  <JobModalItemContent>
                    <JobModalItemTitle>{getJobLabel(job)}</JobModalItemTitle>
                    {job.description && (
                      <JobModalItemDesc>{job.description}</JobModalItemDesc>
                    )}
                  </JobModalItemContent>
                  {activeCareer.jobId === job.id && (
                    <JobModalItemCheck>
                      <FiCheck />
                    </JobModalItemCheck>
                  )}
                </JobModalListItem>
              ))}
              {filteredJobs.length === 0 && (
                <EmptyJobMessage>
                  <FiSearch
                    style={{
                      fontSize: '2.5rem',
                      color: '#cbd5e1',
                      marginBottom: '0.5rem',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.95rem',
                      color: '#94a3b8',
                      fontWeight: '500',
                    }}
                  >
                    {jobSearchTerm ? '검색 결과가 없습니다' : '직업이 없습니다'}
                  </div>
                  {(selectedJobParentCategoryId !== 'all' ||
                    selectedJobCategoryId !== 'all') && (
                    <EmptyJobHint>
                      카테고리를 초기화하거나 다른 카테고리를 선택해보세요
                    </EmptyJobHint>
                  )}
                </EmptyJobMessage>
              )}
            </JobModalList>
          </ModalContent>
        </Modal>
      )}

      {/* 직업 카테고리 선택 모달 - 개선된 2단계 선택 디자인 */}
      {showJobCategoryModal && (
        <Modal onClick={() => setShowJobCategoryModal(false)}>
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '900px' }}
          >
            <ModalHeader style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <JobCategoryModalStep>STEP 1</JobCategoryModalStep>
                <ModalTitle style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  직업 카테고리 선택
                </ModalTitle>
              </div>
              <ModalCloseButton onClick={() => setShowJobCategoryModal(false)}>
                <FiX />
              </ModalCloseButton>
            </ModalHeader>
            <JobCategoryModalBody>
              {/* 1단계 대분류 */}
              <JobCategorySection>
                <JobCategorySectionTitle>
                  대분류
                  <JobCategorySectionHint>
                    직업의 주요 분야를 선택하세요
                  </JobCategorySectionHint>
                </JobCategorySectionTitle>
                <JobCategoryGrid>
                  {parentJobCategories.map((category: any) => (
                    <JobCategoryItem
                      key={category.id}
                      $active={selectedJobParentCategoryId === category.id}
                      onClick={() => {
                        playClick()
                        setSelectedJobParentCategoryId(category.id)
                        setSelectedJobCategoryId('all')
                      }}
                    >
                      <JobCategoryItemIcon
                        $active={selectedJobParentCategoryId === category.id}
                      >
                        {getCategoryIcon(category.name)}
                      </JobCategoryItemIcon>
                      <JobCategoryItemText>{category.name}</JobCategoryItemText>
                    </JobCategoryItem>
                  ))}
                </JobCategoryGrid>
              </JobCategorySection>

              {/* 2단계 중분류 */}
              {selectedJobParentCategoryId !== 'all' &&
                childJobCategories.length > 0 && (
                  <JobCategorySection>
                    <JobCategorySectionTitle>
                      중분류
                      <JobCategoryParentBadge>
                        {
                          parentJobCategories.find(
                            (c: any) => c.id === selectedJobParentCategoryId,
                          )?.name
                        }
                      </JobCategoryParentBadge>
                    </JobCategorySectionTitle>
                    <JobCategorySubGrid>
                      <JobCategorySubItem
                        $active={selectedJobCategoryId === 'all'}
                        onClick={() => {
                          playClick()
                          setSelectedJobCategoryId('all')
                        }}
                      >
                        전체
                      </JobCategorySubItem>
                      {childJobCategories.map((category: any) => (
                        <JobCategorySubItem
                          key={category.id}
                          $active={selectedJobCategoryId === category.id}
                          onClick={() => {
                            playClick()
                            setSelectedJobCategoryId(category.id)
                          }}
                        >
                          {category.name}
                        </JobCategorySubItem>
                      ))}
                    </JobCategorySubGrid>
                  </JobCategorySection>
                )}

              {/* 다음 단계 버튼 */}
              {selectedJobParentCategoryId !== 'all' && (
                <JobCategoryModalFooter>
                  <JobCategoryNextButton
                    type="button"
                    onClick={() => {
                      playClick()
                      setShowJobCategoryModal(false)
                      // 카테고리 선택 후 직업 선택 모달 자동 열기
                      setTimeout(() => {
                        setShowJobModal(true)
                      }, 200)
                    }}
                  >
                    <span>다음: 직업 선택</span>
                    <FiChevronRight />
                  </JobCategoryNextButton>
                  <JobCategoryResetButton
                    type="button"
                    onClick={() => {
                      playClick()
                      setSelectedJobParentCategoryId('all')
                      setSelectedJobCategoryId('all')
                      if (activeCareer) {
                        handleCareerInputChange(activeCareer.id, 'jobId', '')
                        handleCareerInputChange(activeCareer.id, 'jobName', '')
                      }
                      setShowJobCategoryModal(false)
                    }}
                  >
                    선택 초기화
                  </JobCategoryResetButton>
                </JobCategoryModalFooter>
              )}
            </JobCategoryModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* 국가 선택 모달 - 기본 정보와 경력 모두에서 사용 */}
      {showCountryModal && (
        <Modal onClick={() => setShowCountryModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {countryModalContext === 'birth'
                  ? '출생 국가 선택'
                  : '활동 국가 선택'}
              </ModalTitle>
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
                      <ModalRadioDot $active={countryType === 'modern'} />
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
                      <ModalRadioDot $active={countryType === 'historical'} />
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
                  {filteredCountries.map((country) => (
                    <ModalListItem
                      key={country.id}
                      $selected={
                        countryModalContext === 'birth'
                          ? formData.birthCountryId === country.id
                          : activeCareer?.countryId === country.id
                      }
                      onClick={() => {
                        playClick()
                        if (countryModalContext === 'birth') {
                          handleInputChange('birthCountryId', country.id)
                        } else if (activeCareerId) {
                          handleCareerInputChange(
                            activeCareerId,
                            'countryId',
                            country.id,
                          )
                        }
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

      {/* 기존 모달들은 currentStep === 'basic'일 때만 표시 */}
      {currentStep === 'basic' && (
        <>
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

          {/* 국가 이적 모달 */}
          {showCountryTransferModal && (
            <Modal
              onClick={() => {
                setShowCountryTransferModal(false)
                setTransferCountryId('')
                setTransferYear('')
                handleInputChange('transferMonth', '')
                handleInputChange('transferDay', '')
                setTransferNote('')
                setCountrySearchTerm('')
              }}
            >
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    {transferCountryId && (
                      <JobCategoryModalStep>STEP 2</JobCategoryModalStep>
                    )}
                    <ModalTitle
                      style={{
                        fontSize: transferCountryId ? '1.1rem' : '1.25rem',
                      }}
                    >
                      국가 이적 추가
                    </ModalTitle>
                  </div>
                  <ModalCloseButton
                    onClick={() => {
                      setShowCountryTransferModal(false)
                      setTransferCountryId('')
                      setTransferYear('')
                      handleInputChange('transferMonth', '')
                      handleInputChange('transferDay', '')
                      setTransferNote('')
                      setCountrySearchTerm('')
                    }}
                  >
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                {!transferCountryId ? (
                  <>
                    {/* STEP 1: 국가 선택 */}
                    <SearchWrapper>
                      <FiSearch />
                      <SearchInput
                        type="text"
                        placeholder="이적한 국가 검색..."
                        value={countrySearchTerm}
                        onChange={(e) => setCountrySearchTerm(e.target.value)}
                        autoFocus
                      />
                    </SearchWrapper>

                    <ModalList>
                      {filteredCountries.map((country) => (
                        <ModalListItem
                          key={country.id}
                          $selected={false}
                          onClick={() => {
                            playClick()
                            setTransferCountryId(country.id)
                          }}
                        >
                          <CountryItemContent>
                            {country.flagEmoji && (
                              <CountryFlag>{country.flagEmoji}</CountryFlag>
                            )}
                            <CountryName>{country.name}</CountryName>
                          </CountryItemContent>
                        </ModalListItem>
                      ))}
                      {filteredCountries.length === 0 && (
                        <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                      )}
                    </ModalList>
                  </>
                ) : (
                  <>
                    {/* STEP 2: 상세정보 입력 */}

                    {/* 선택된 국가 배너 */}
                    <CurrentCategoryBanner
                      style={{
                        background: DESIGN_TOKENS.gradients.info,
                        borderBottom: '1px solid #93c5fd',
                      }}
                    >
                      <CurrentCategoryText>
                        <span style={{ fontSize: '1.5rem' }}>
                          {filteredCountries.find(
                            (c) => c.id === transferCountryId,
                          )?.flagEmoji || '—'}
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          {
                            filteredCountries.find(
                              (c) => c.id === transferCountryId,
                            )?.name
                          }
                        </span>
                      </CurrentCategoryText>
                      <ChangeCountryButton
                        type="button"
                        onClick={() => {
                          setTransferCountryId('')
                          setCountrySearchTerm('')
                        }}
                      >
                        <FiX size={16} />
                        <span style={{ marginLeft: '0.375rem' }}>변경</span>
                      </ChangeCountryButton>
                    </CurrentCategoryBanner>

                    <div style={{ padding: '2rem 1.75rem' }}>
                      {/* 이적 년월일 */}
                      <TransferFormGroup>
                        <TransferLabel>
                          이적 일자 <Required>*</Required>
                        </TransferLabel>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '0.625rem',
                          }}
                        >
                          <Input
                            type="text"
                            placeholder="년 (예: 1933)"
                            value={transferYear}
                            onChange={(e) => setTransferYear(e.target.value)}
                            autoFocus
                          />
                          <Input
                            type="text"
                            placeholder="월 (선택)"
                            value={formData.transferMonth || ''}
                            onChange={(e) =>
                              handleInputChange('transferMonth', e.target.value)
                            }
                          />
                          <Input
                            type="text"
                            placeholder="일 (선택)"
                            value={formData.transferDay || ''}
                            onChange={(e) =>
                              handleInputChange('transferDay', e.target.value)
                            }
                          />
                        </div>
                      </TransferFormGroup>

                      {/* 메모 */}
                      <TransferFormGroup>
                        <TransferLabel>메모 (선택)</TransferLabel>
                        <TransferTextarea
                          placeholder="예: 나치 집권 이후 망명&#10;시민권 취득"
                          value={transferNote}
                          onChange={(e) => setTransferNote(e.target.value)}
                          rows={3}
                        />
                      </TransferFormGroup>
                    </div>

                    {/* 버튼 영역 */}
                    <TransferModalActions>
                      <CancelButton
                        type="button"
                        onClick={() => {
                          setShowCountryTransferModal(false)
                          setTransferCountryId('')
                          setTransferYear('')
                          handleInputChange('transferMonth', '')
                          handleInputChange('transferDay', '')
                          setTransferNote('')
                          setCountrySearchTerm('')
                        }}
                      >
                        취소
                      </CancelButton>
                      <SubmitButton
                        type="button"
                        disabled={!transferYear}
                        onClick={() => {
                          if (transferCountryId && transferYear) {
                            // 중복 국가 검사
                            if (
                              formData.countryTransfers.some(
                                (t) => t.countryId === transferCountryId,
                              )
                            ) {
                              toast.error('이미 추가된 국가입니다')
                              return
                            }

                            // 날짜 유효성 검사
                            const yearNum = parseInt(transferYear)
                            const monthNum = formData.transferMonth
                              ? parseInt(formData.transferMonth)
                              : 0
                            const dayNum = formData.transferDay
                              ? parseInt(formData.transferDay)
                              : 0

                            if (
                              isNaN(yearNum) ||
                              yearNum < 1 ||
                              yearNum > new Date().getFullYear()
                            ) {
                              toast.error('유효한 연도를 입력해주세요')
                              return
                            }

                            if (
                              formData.transferMonth &&
                              (isNaN(monthNum) || monthNum < 1 || monthNum > 12)
                            ) {
                              toast.error('월은 1~12 사이여야 합니다')
                              return
                            }

                            if (
                              formData.transferDay &&
                              (isNaN(dayNum) || dayNum < 1 || dayNum > 31)
                            ) {
                              toast.error('일은 1~31 사이여야 합니다')
                              return
                            }

                            // 실제 날짜 검증
                            if (
                              formData.transferMonth &&
                              formData.transferDay
                            ) {
                              const date = new Date(
                                yearNum,
                                monthNum - 1,
                                dayNum,
                              )
                              if (
                                date.getMonth() !== monthNum - 1 ||
                                date.getDate() !== dayNum
                              ) {
                                toast.error('유효하지 않은 날짜입니다')
                                return
                              }
                            }

                            playClick()
                            handleInputChange('countryTransfers', [
                              ...formData.countryTransfers,
                              {
                                countryId: transferCountryId,
                                year: transferYear,
                                month: formData.transferMonth || undefined,
                                day: formData.transferDay || undefined,
                                note: transferNote || undefined,
                              },
                            ])
                            setShowCountryTransferModal(false)
                            setTransferCountryId('')
                            setTransferYear('')
                            handleInputChange('transferMonth', '')
                            handleInputChange('transferDay', '')
                            setTransferNote('')
                            setCountrySearchTerm('')
                          }
                        }}
                      >
                        추가
                      </SubmitButton>
                    </TransferModalActions>
                  </>
                )}
              </ModalContent>
            </Modal>
          )}

          {/* 종교 선택 모달 */}
          {showReligionModal && (
            <ReligionModal onClick={() => setShowReligionModal(false)}>
              <ReligionModalContent onClick={(e) => e.stopPropagation()}>
                <ReligionModalHeader>
                  <ModalHeaderIcon $color="#64748b">
                    <FiHeart size={20} />
                  </ModalHeaderIcon>
                  <ModalTitleGroup>
                    <ModalTitle>종교 선택</ModalTitle>
                    <ModalSubtitle>
                      신앙과 믿음의 체계를 선택하세요
                    </ModalSubtitle>
                  </ModalTitleGroup>
                  <ModalCloseButton onClick={() => setShowReligionModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ReligionModalHeader>

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
                    $color="#64748b"
                    onClick={() => {
                      handleInputChange('religionId', '')
                      setShowReligionModal(false)
                      setReligionSearchTerm('')
                    }}
                  >
                    <ListItemIcon $color="#64748b">
                      <FiX size={16} />
                    </ListItemIcon>
                    선택 안함
                  </ModalListItem>
                  {filteredReligions.map((religion) => (
                    <ModalListItem
                      key={religion.id}
                      $selected={formData.religionId === religion.id}
                      $color="#64748b"
                      onClick={() => {
                        handleInputChange('religionId', religion.id)
                        setShowReligionModal(false)
                        setReligionSearchTerm('')
                      }}
                    >
                      <ListItemIcon $color="#64748b">
                        <FiHeart size={16} />
                      </ListItemIcon>
                      {religion.name}
                      {formData.religionId === religion.id && (
                        <SelectedBadge $color="#64748b">
                          <FiCheck size={12} />
                        </SelectedBadge>
                      )}
                    </ModalListItem>
                  ))}
                  {filteredReligions.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </ReligionModalContent>
            </ReligionModal>
          )}

          {/* 직업 선택 모달 - 기본 정보용 (STEP 2: 다중 선택) */}
          {showJobModal && currentStep === 'basic' && (
            <Modal onClick={() => setShowJobModal(false)}>
              <ModalContent
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '650px' }}
              >
                <ModalHeader style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <JobCategoryModalStep>STEP 2</JobCategoryModalStep>
                    <ModalTitle
                      style={{ fontSize: '1.1rem', fontWeight: '600' }}
                    >
                      직업 선택 (다중)
                    </ModalTitle>
                  </div>
                  <ModalCloseButton onClick={() => setShowJobModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                {/* 현재 선택된 카테고리 표시 */}
                {(selectedJobParentCategoryId !== 'all' ||
                  selectedJobCategoryId !== 'all') && (
                  <CurrentCategoryBanner>
                    <CurrentCategoryText>
                      <FiLayers style={{ fontSize: '1rem' }} />
                      {selectedJobParentCategoryId !== 'all' && (
                        <>
                          {
                            parentJobCategories.find(
                              (c: any) => c.id === selectedJobParentCategoryId,
                            )?.name
                          }
                          {selectedJobCategoryId !== 'all' &&
                            selectedJobCategory && (
                              <> › {selectedJobCategory.name}</>
                            )}
                        </>
                      )}
                    </CurrentCategoryText>
                    <CurrentCategoryAction
                      type="button"
                      onClick={() => {
                        setShowJobModal(false)
                        setTimeout(() => {
                          setShowJobCategoryModal(true)
                        }, 200)
                      }}
                    >
                      카테고리 변경
                    </CurrentCategoryAction>
                  </CurrentCategoryBanner>
                )}

                <SearchWrapper
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <FiSearch />
                  <SearchInput
                    type="text"
                    placeholder="직업 검색..."
                    value={jobSearchTerm}
                    onChange={(e) => setJobSearchTerm(e.target.value)}
                    autoFocus
                    style={{ border: 'none', background: 'transparent' }}
                  />
                </SearchWrapper>

                {/* 선택된 직업 표시 */}
                {formData.jobIds.length > 0 && (
                  <SelectedJobsContainer>
                    <SelectedJobsLabel>
                      선택된 직업 ({formData.jobIds.length})
                    </SelectedJobsLabel>
                    <SelectedJobsList>
                      {selectedJobs.map((job) => (
                        <SelectedJobTag key={job.id}>
                          {getJobLabel(job)}
                          <SelectedJobRemove
                            onClick={(e) => {
                              e.stopPropagation()
                              playClick()
                              const newJobIds = formData.jobIds.filter(
                                (id) => id !== job.id,
                              )
                              handleInputChange('jobIds', newJobIds)
                            }}
                          >
                            <FiX size={14} />
                          </SelectedJobRemove>
                        </SelectedJobTag>
                      ))}
                    </SelectedJobsList>
                  </SelectedJobsContainer>
                )}

                <JobModalList>
                  {filteredJobs.map((job) => {
                    const isSelected = formData.jobIds.includes(job.id)
                    return (
                      <JobModalListItem
                        key={job.id}
                        $selected={isSelected}
                        onClick={() => {
                          playClick()
                          const newJobIds = isSelected
                            ? formData.jobIds.filter((id) => id !== job.id)
                            : [...formData.jobIds, job.id]
                          handleInputChange('jobIds', newJobIds)
                        }}
                      >
                        <JobModalItemContent>
                          <JobModalItemTitle>
                            {getJobLabel(job)}
                          </JobModalItemTitle>
                          {job.description && (
                            <JobModalItemDesc>
                              {job.description}
                            </JobModalItemDesc>
                          )}
                        </JobModalItemContent>
                        {isSelected && (
                          <JobModalItemCheck>
                            <FiCheck />
                          </JobModalItemCheck>
                        )}
                      </JobModalListItem>
                    )
                  })}
                  {filteredJobs.length === 0 && (
                    <EmptyJobMessage>
                      <FiSearch
                        style={{
                          fontSize: '2.5rem',
                          color: '#cbd5e1',
                          marginBottom: '0.5rem',
                        }}
                      />
                      <div
                        style={{
                          fontSize: '0.95rem',
                          color: '#94a3b8',
                          fontWeight: '500',
                        }}
                      >
                        {jobSearchTerm
                          ? '검색 결과가 없습니다'
                          : '직업이 없습니다'}
                      </div>
                      {(selectedJobParentCategoryId !== 'all' ||
                        selectedJobCategoryId !== 'all') && (
                        <EmptyJobHint>
                          카테고리를 초기화하거나 다른 카테고리를 선택해보세요
                        </EmptyJobHint>
                      )}
                    </EmptyJobMessage>
                  )}
                </JobModalList>

                {/* 완료 버튼 */}
                <JobModalFooter>
                  <JobModalDoneButton
                    type="button"
                    onClick={() => {
                      playClick()
                      setShowJobModal(false)
                      setJobSearchTerm('')
                    }}
                  >
                    <FiCheck size={16} />
                    선택 완료 ({formData.jobIds.length}개)
                  </JobModalDoneButton>
                </JobModalFooter>
              </ModalContent>
            </Modal>
          )}
        </>
      )}

      {/* 조직 선택 모달 - 경력사항에서 사용 */}
      {showOrganizationModal &&
        activeCareerId &&
        (() => {
          const career = careers.find((c) => c.id === activeCareerId)
          if (!career) return null

          // 선택된 직책 카테고리 기반으로 추천 타입 결정
          const category = parentJobCategories.find(
            (c: any) => c.id === career.jobCategoryId,
          )
          const categoryName = category?.name || ''

          let recommendedType: Organization['type'] | 'all' = 'all'
          if (categoryName === '기업인' || categoryName.includes('경영')) {
            recommendedType = 'company'
          } else if (
            categoryName === '정치인' ||
            categoryName.includes('정치')
          ) {
            recommendedType = 'government'
          } else if (categoryName === '군인' || categoryName.includes('군사')) {
            recommendedType = 'military'
          } else if (
            categoryName === '교육자' ||
            categoryName.includes('학자')
          ) {
            recommendedType = 'education'
          } else if (
            categoryName === '운동선수' ||
            categoryName.includes('스포츠')
          ) {
            recommendedType = 'sports'
          }

          // 모달이 열릴 때 추천 타입으로 자동 필터링
          if (organizationType === 'all' && recommendedType !== 'all') {
            setOrganizationType(recommendedType)
          }

          return (
            <Modal
              onClick={() => {
                setShowOrganizationModal(false)
                setOrganizationType('all')
                setOrganizationSearchTerm('')
              }}
            >
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>소속 조직 선택</ModalTitle>
                  <ModalCloseButton
                    onClick={() => {
                      setShowOrganizationModal(false)
                      setOrganizationType('all')
                      setOrganizationSearchTerm('')
                    }}
                  >
                    <FiX />
                  </ModalCloseButton>
                </ModalHeader>

                <ModalBody>
                  {/* 좌측 필터 영역 */}
                  <FilterSidebar>
                    <FilterSidebarSection>
                      <FilterSidebarTitle>조직 타입</FilterSidebarTitle>
                      <CountryTypeOption
                        $active={organizationType === 'all'}
                        onClick={() => setOrganizationType('all')}
                      >
                        <RadioButton $active={organizationType === 'all'}>
                          <ModalRadioDot $active={organizationType === 'all'} />
                        </RadioButton>
                        <span>전체</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={organizationType === 'company'}
                        onClick={() => setOrganizationType('company')}
                      >
                        <RadioButton $active={organizationType === 'company'}>
                          <ModalRadioDot
                            $active={organizationType === 'company'}
                          />
                        </RadioButton>
                        <span>💼 기업</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={organizationType === 'government'}
                        onClick={() => setOrganizationType('government')}
                      >
                        <RadioButton
                          $active={organizationType === 'government'}
                        >
                          <ModalRadioDot
                            $active={organizationType === 'government'}
                          />
                        </RadioButton>
                        <span>🏛️ 정부</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={organizationType === 'military'}
                        onClick={() => setOrganizationType('military')}
                      >
                        <RadioButton $active={organizationType === 'military'}>
                          <ModalRadioDot
                            $active={organizationType === 'military'}
                          />
                        </RadioButton>
                        <span>🎖️ 군대</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={organizationType === 'education'}
                        onClick={() => setOrganizationType('education')}
                      >
                        <RadioButton $active={organizationType === 'education'}>
                          <ModalRadioDot
                            $active={organizationType === 'education'}
                          />
                        </RadioButton>
                        <span>🎓 교육</span>
                      </CountryTypeOption>
                      <CountryTypeOption
                        $active={organizationType === 'sports'}
                        onClick={() => setOrganizationType('sports')}
                      >
                        <RadioButton $active={organizationType === 'sports'}>
                          <ModalRadioDot
                            $active={organizationType === 'sports'}
                          />
                        </RadioButton>
                        <span>⚽ 스포츠</span>
                      </CountryTypeOption>
                    </FilterSidebarSection>
                  </FilterSidebar>

                  {/* 우측 조직 리스트 */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <SearchWrapper>
                      <FiSearch />
                      <SearchInput
                        type="text"
                        placeholder="조직 검색..."
                        value={organizationSearchTerm}
                        onChange={(e) =>
                          setOrganizationSearchTerm(e.target.value)
                        }
                        autoFocus
                      />
                    </SearchWrapper>

                    <ModalList>
                      {filteredOrganizations.map((org) => {
                        const career = careers.find(
                          (c) => c.id === activeCareerId,
                        )
                        if (!career) return null

                        return (
                          <ModalListItem
                            key={org.id}
                            $selected={career.organizationId === org.id}
                            onClick={() => {
                              playClick()
                              handleCareerInputChange(
                                activeCareerId,
                                'organizationId',
                                org.id,
                              )
                              handleCareerInputChange(
                                activeCareerId,
                                'organization',
                                org.name,
                              )
                              setShowOrganizationModal(false)
                              setOrganizationType('all')
                              setOrganizationSearchTerm('')
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                flex: 1,
                              }}
                            >
                              <span style={{ fontSize: '1.25rem' }}>
                                {org.type === 'company' && '💼'}
                                {org.type === 'government' && '🏛️'}
                                {org.type === 'military' && '🎖️'}
                                {org.type === 'education' && '🎓'}
                                {org.type === 'sports' && '⚽'}
                                {org.type === 'other' && '🏢'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: '600',
                                    color: '#1e293b',
                                  }}
                                >
                                  {org.name}
                                </div>
                                {org.foundedYear && (
                                  <div
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      marginTop: '0.125rem',
                                    }}
                                  >
                                    설립: {org.foundedYear}년
                                  </div>
                                )}
                              </div>
                            </div>
                          </ModalListItem>
                        )
                      })}
                      {filteredOrganizations.length === 0 && (
                        <EmptyMessage>
                          {organizations.length === 0
                            ? 'API에서 조직 데이터를 불러와야 합니다. TODO: fetchOrganizations() 구현 필요'
                            : organizationSearchTerm
                              ? '검색 결과가 없습니다.'
                              : '조직이 없습니다.'}
                        </EmptyMessage>
                      )}
                    </ModalList>
                  </div>
                </ModalBody>
              </ModalContent>
            </Modal>
          )
        })()}

      {/* 기존 모달들은 currentStep === 'basic'일 때만 표시 */}
      {currentStep === 'basic' && (
        <>
          {/* 아버지 선택 모달 */}
          {showFatherModal && (
            <FatherModal onClick={() => setShowFatherModal(false)}>
              <FatherModalContent onClick={(e) => e.stopPropagation()}>
                <FatherModalHeader>
                  <ModalHeaderIcon $color="#059669">
                    <IoMaleSharp size={20} />
                  </ModalHeaderIcon>
                  <ModalTitleGroup>
                    <ModalTitle>아버지 선택</ModalTitle>
                    <ModalSubtitle>부친 정보를 선택하세요</ModalSubtitle>
                  </ModalTitleGroup>
                  <ModalCloseButton onClick={() => setShowFatherModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </FatherModalHeader>

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
                    $color="#059669"
                    onClick={() => {
                      handleInputChange('fatherId', '')
                      setShowFatherModal(false)
                      setFatherSearchTerm('')
                    }}
                  >
                    <ListItemIcon $color="#059669">
                      <FiX size={16} />
                    </ListItemIcon>
                    선택 안함
                  </ModalListItem>
                  {filteredFathers.map((person) => (
                    <ModalListItem
                      key={person.id}
                      $selected={formData.fatherId === person.id}
                      $color="#059669"
                      onClick={() => {
                        handleInputChange('fatherId', person.id)
                        setShowFatherModal(false)
                        setFatherSearchTerm('')
                      }}
                    >
                      <ListItemIcon $color="#059669">
                        <FiUser size={16} />
                      </ListItemIcon>
                      <PersonInfo>
                        <PersonName>
                          {getPersonDisplayName(person)}
                        </PersonName>
                        {person.birthYear && (
                          <PersonLifespan $color="#059669">
                            {person.birthEra === 'BC' ? 'BC ' : ''}
                            {person.birthYear}
                          </PersonLifespan>
                        )}
                      </PersonInfo>
                      {formData.fatherId === person.id && (
                        <SelectedBadge $color="#059669">
                          <FiCheck size={12} />
                        </SelectedBadge>
                      )}
                    </ModalListItem>
                  ))}
                  {filteredFathers.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </FatherModalContent>
            </FatherModal>
          )}

          {/* 어머니 선택 모달 */}
          {showMotherModal && (
            <MotherModal onClick={() => setShowMotherModal(false)}>
              <MotherModalContent onClick={(e) => e.stopPropagation()}>
                <MotherModalHeader>
                  <ModalHeaderIcon $color="#db2777">
                    <IoFemaleSharp size={20} />
                  </ModalHeaderIcon>
                  <ModalTitleGroup>
                    <ModalTitle>어머니 선택</ModalTitle>
                    <ModalSubtitle>모친 정보를 선택하세요</ModalSubtitle>
                  </ModalTitleGroup>
                  <ModalCloseButton onClick={() => setShowMotherModal(false)}>
                    <FiX />
                  </ModalCloseButton>
                </MotherModalHeader>

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
                    $color="#db2777"
                    onClick={() => {
                      handleInputChange('motherId', '')
                      setShowMotherModal(false)
                      setMotherSearchTerm('')
                    }}
                  >
                    <ListItemIcon $color="#db2777">
                      <FiX size={16} />
                    </ListItemIcon>
                    선택 안함
                  </ModalListItem>
                  {filteredMothers.map((person) => (
                    <ModalListItem
                      key={person.id}
                      $selected={formData.motherId === person.id}
                      $color="#db2777"
                      onClick={() => {
                        handleInputChange('motherId', person.id)
                        setShowMotherModal(false)
                        setMotherSearchTerm('')
                      }}
                    >
                      <ListItemIcon $color="#db2777">
                        <FiUser size={16} />
                      </ListItemIcon>
                      <PersonInfo>
                        <PersonName>
                          {getPersonDisplayName(person)}
                        </PersonName>
                        {person.birthYear && (
                          <PersonLifespan $color="#db2777">
                            {person.birthEra === 'BC' ? 'BC ' : ''}
                            {person.birthYear}
                          </PersonLifespan>
                        )}
                      </PersonInfo>
                      {formData.motherId === person.id && (
                        <SelectedBadge $color="#db2777">
                          <FiCheck size={12} />
                        </SelectedBadge>
                      )}
                    </ModalListItem>
                  ))}
                  {filteredMothers.length === 0 && (
                    <EmptyMessage>검색 결과가 없습니다.</EmptyMessage>
                  )}
                </ModalList>
              </MotherModalContent>
            </MotherModal>
          )}

          {/* 출생일 선택 모달 */}
          {showBirthDateModal && (
            <DatePickerModal
              isOpen={showBirthDateModal}
              onClose={() => setShowBirthDateModal(false)}
              onSelect={handleBirthDateSelect}
              initialDate={buildInitialDate(
                formData.birthEra,
                formData.birthYear,
                formData.birthMonth,
                formData.birthDay,
              )}
              title="출생일 선택"
            />
          )}

          {/* 사망일 선택 모달 */}
          {showDeathDateModal && (
            <DatePickerModal
              isOpen={showDeathDateModal}
              onClose={() => setShowDeathDateModal(false)}
              onSelect={handleDeathDateSelect}
              initialDate={buildInitialDate(
                formData.deathEra,
                formData.deathYear,
                formData.deathMonth,
                formData.deathDay,
              )}
              title="사망일 선택"
            />
          )}
        </>
      )}

      {/* 경력 시작일 선택 모달 - 경력사항에서 사용 */}
      {showCareerStartDateModal && activeCareer && (
        <DatePickerModal
          isOpen={showCareerStartDateModal}
          onClose={() => setShowCareerStartDateModal(false)}
          onSelect={handleCareerStartDateSelect}
          initialDate={buildInitialDate(
            activeCareer.startEra,
            activeCareer.startYear,
            activeCareer.startMonth,
            activeCareer.startDay,
          )}
          title="시작일 선택"
        />
      )}

      {/* 경력 종료일 선택 모달 */}
      {showCareerEndDateModal && activeCareer && (
        <DatePickerModal
          isOpen={showCareerEndDateModal}
          onClose={() => setShowCareerEndDateModal(false)}
          onSelect={handleCareerEndDateSelect}
          initialDate={buildInitialDate(
            activeCareer.endEra,
            activeCareer.endYear,
            activeCareer.endMonth,
            activeCareer.endDay,
          )}
          title="종료일 선택"
        />
      )}

      {/* 확인 모달 */}
      {showConfirmModal && (
        <Modal onClick={() => setShowConfirmModal(false)}>
          <ConfirmModalContent onClick={(e) => e.stopPropagation()}>
            <ConfirmModalHeader>
              <ConfirmModalTitle>인물 등록 확인</ConfirmModalTitle>
            </ConfirmModalHeader>
            <ConfirmModalBody>
              <ConfirmMessage>
                <strong>
                  {getPersonDisplayName({
                    name: formData.name,
                    surname: formData.surname,
                    middleName: formData.middleName,
                    nameDisplayOrder: formData.nameFormat,
                  })}
                </strong>{' '}
                님의 정보를 등록하시겠습니까?
              </ConfirmMessage>
              <ConfirmDetails>
                <ConfirmDetailItem>
                  <span>성별:</span> <strong>{formData.gender}</strong>
                </ConfirmDetailItem>
                <ConfirmDetailItem>
                  <span>생몰:</span>{' '}
                  <strong>
                    {formatBirthDate()} ~ {formatDeathDate()}
                  </strong>
                </ConfirmDetailItem>
                {calculatedAge && (
                  <ConfirmDetailItem>
                    <span>향년:</span> <strong>{calculatedAge}세</strong>
                  </ConfirmDetailItem>
                )}
                {careers.length > 0 && (
                  <ConfirmDetailItem>
                    <span>경력:</span> <strong>{careers.length}개</strong>
                  </ConfirmDetailItem>
                )}
              </ConfirmDetails>
            </ConfirmModalBody>
            <ConfirmModalActions>
              <ActionButton
                type="button"
                $variant="secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </ActionButton>
              <ActionButton
                type="button"
                $variant="primary"
                onClick={handleConfirmSubmit}
              >
                <FiCheck />
                확인
              </ActionButton>
            </ConfirmModalActions>
          </ConfirmModalContent>
        </Modal>
      )}
    </PageWrapper>
  )
}

// Styled Components
const FormContent = styled.div`
  padding: 32px;
`

const errorBlinkStyles = css`
  animation: error-blink 0.9s ease-in-out 2;

  @keyframes error-blink {
    0%,
    100% {
      border-color: #fca5a5;
      box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.18);
    }
    50% {
      border-color: #f87171;
      box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.18);
    }
  }
`

const ErrorInput = styled(Input)<{ $hasError?: boolean; $flash?: boolean }>`
  ${(props) =>
    props.$hasError &&
    css`
      border-color: #fca5a5;
      box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.12);

      &:focus {
        border-color: #f87171;
        box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.16);
      }
    `}

  ${(props) => props.$hasError && props.$flash && errorBlinkStyles}
`

const SelectButton = styled.button<{
  $selected?: boolean
  $hasError?: boolean
  $flash?: boolean
}>`
  padding: 1rem 1.5rem;
  background: ${(props) => (props.$selected ? '#f3f4f6' : 'white')};
  border: 1px solid
    ${(props) =>
      props.$hasError ? '#fca5a5' : props.$selected ? '#9ca3af' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: ${(props) => (props.$selected ? '600' : '500')};
  color: ${(props) => (props.$selected ? '#111827' : '#374151')};
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  box-shadow: ${(props) =>
    props.$selected
      ? '0 2px 8px rgba(0, 0, 0, 0.08)'
      : '0 1px 2px rgba(0, 0, 0, 0.05)'};

  &:hover {
    border-color: ${(props) =>
      props.$hasError ? '#fca5a5' : props.$selected ? '#6b7280' : '#9ca3af'};
    background: ${(props) => (props.$selected ? '#e5e7eb' : '#f9fafb')};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 2rem;
    transition: transform 0.2s;
  }

  &:hover svg {
    transform: scale(1.05);
  }

  ${(props) => props.$hasError && props.$flash && errorBlinkStyles}
`

const ErrorText = styled.span`
  font-size: 0.85rem;
  color: #ef4444;
`

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
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

const NameToggleRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`

const NameSegmentGroup = styled.div`
  flex: 1 1 0;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`

const NameSegmentLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
`

const NameSegmentPill = styled.div`
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
`

const NameSegmentButton = styled.button<{ $selected?: boolean }>`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${(p) => (p.$selected ? '#0f172a' : '#64748b')};
  background: ${(p) => (p.$selected ? '#fff' : 'transparent')};
  box-shadow: ${(p) => (p.$selected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none')};
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;

  &:hover {
    color: ${(p) => (p.$selected ? '#0f172a' : '#334155')};
    background: ${(p) => (p.$selected ? '#fff' : 'rgba(255,255,255,0.6)')};
  }
`

const NameParsePreview = styled.div`
  margin-top: 0.625rem;
  padding: 0.625rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const NameParseDisplay = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
`

const NameParseMeta = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 400;
`

const NameLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
`

const ProfileImageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: transparent;
  padding: 0;
  border-radius: 0;
  border: none;
`

const ProfileImagePreview = styled.label<{ $isDragging?: boolean }>`
  width: 100%;
  max-width: 320px;
  aspect-ratio: 3 / 4;
  border-radius: 20px;
  overflow: hidden;
  background: ${(props) => (props.$isDragging ? '#f0f9ff' : '#ffffff')};
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${(props) =>
    props.$isDragging ? '2px solid #3b82f6' : '1px solid #e5e7eb'};
  box-shadow: ${(props) =>
    props.$isDragging
      ? '0 8px 32px rgba(59, 130, 246, 0.2)'
      : '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'};
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  margin: 0 auto;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.995);
  }
`

const ProfileImageInput = styled.input`
  display: none;
`

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;

  ${ProfileImagePreview}:hover & {
    opacity: 0.95;
  }
`

const ProfileImagePlaceholder = styled.div`
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 2rem;
  text-align: center;

  svg {
    font-size: 4rem;
    color: #d1d5db;
  }

  span {
    color: #6b7280;
  }
`

const UploadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

const UploadHint = styled.span`
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 400;
`

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ProfileImagePreview}:hover & {
    opacity: 1;
  }
`

const ImageOverlayButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  background: white;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    background: #f9fafb;
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98);
  }
`

const ImageCountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  color: #6b7280;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  align-self: center;

  svg {
    color: #9ca3af;
  }
`

const PrimaryBadgeThumb = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: white;
  color: #3b82f6;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 6px;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`

const ProfileImageThumb = styled.button<{ $active?: boolean }>`
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  border: ${(props) =>
    props.$active ? '3px solid #374151' : '3px solid #f0f0f0'};
  background: white;
  position: relative;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${(props) =>
    props.$active
      ? '0 0 0 3px rgba(55, 65, 81, 0.15), 0 8px 24px rgba(55, 65, 81, 0.2)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: all 0.3s ease;
  }

  &:hover {
    border-color: ${(props) => (props.$active ? '#1f2937' : '#374151')};
    transform: translateY(-4px);
    box-shadow: ${(props) =>
      props.$active
        ? '0 0 0 3px rgba(55, 65, 81, 0.2), 0 12px 32px rgba(55, 65, 81, 0.25)'
        : '0 8px 24px rgba(0, 0, 0, 0.15)'};

    img {
      transform: scale(1.1);
    }
  }

  &:active {
    transform: translateY(0);
  }
`

const ProfileImageThumbnails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  max-width: 560px;
  margin: 0 auto;
`

const ThumbActionButtons = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 0.375rem;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ProfileImageThumb}:hover & {
    opacity: 1;
  }
`

const ThumbActionButton = styled.button<{ $danger?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: ${(props) =>
    props.$danger ? '#ef4444' : 'rgba(255, 255, 255, 0.95)'};
  color: ${(props) => (props.$danger ? 'white' : '#374151')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);

  &:hover {
    background: ${(props) => (props.$danger ? '#dc2626' : 'white')};
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const ImagePreviewModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ImagePreviewContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`

const ImagePreviewImg = styled.img`
  max-width: 100%;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  object-fit: contain;
`

const ImagePreviewClose = styled.button`
  position: absolute;
  top: -52px;
  right: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);

  &:hover {
    background: white;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const ProfileImageAddThumb = styled.label`
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  border: 3px dashed #d1d5db;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  color: #9ca3af;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  svg {
    font-size: 1.75rem;
    padding: 0.75rem;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &:hover {
    border-color: #374151;
    border-style: solid;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #374151;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: scale(0.98);
  }
`

const ProfileImageActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const RemoveImageButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.95);
  color: #ef4444;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 2;
  backdrop-filter: blur(8px);

  &:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: scale(0.95);
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
  color: #3b82f6;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  background: #f0f9ff;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
`

const DateRangeSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #9ca3af;
  padding-top: 2rem;
`

const DateRangeInline = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`

const DateRangeInlineSeparator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #9ca3af;
  padding-top: 1.65rem;
`

const DateRangeCurrent = styled.div`
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.875rem;
`

const ToggleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
`

const ToggleLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const ToggleButton = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d1d5db')};
  background: ${({ $active }) => ($active ? '#3b82f6' : '#f3f4f6')};
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: ${({ $active }) => ($active ? '#1d4ed8' : '#9ca3af')};
  }
`

const InlineCheckRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`

const MultiCheckRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
`

const CheckGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const InlineCheckLabel = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
`

const RadioGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
`

const RadioOption = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: ${({ $selected }) => ($selected ? '#f0f9ff' : '#ffffff')};
  border: 1.5px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#e5e7eb')};
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? '#1e40af' : '#6b7280')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ $selected }) => ($selected ? '#e0f2fe' : '#f9fafb')};
    border-color: ${({ $selected }) => ($selected ? '#2563eb' : '#d1d5db')};
  }

  &:active {
    transform: scale(0.98);
  }
`

const RadioDot = styled.span<{ $selected?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#d1d5db')};
  background: ${({ $selected }) => ($selected ? '#3b82f6' : '#ffffff')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffffff;
    opacity: ${({ $selected }) => ($selected ? 1 : 0)};
    transition: opacity 0.2s;
  }
`

const InlineCheckButton = styled.button<{ $checked?: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid ${(props) => (props.$checked ? '#111827' : '#d1d5db')};
  background: ${(props) => (props.$checked ? '#111827' : '#ffffff')};
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: #f3f4f6;
    border-color: #e5e7eb;
  }

  svg {
    font-size: 0.75rem;
  }
`

const ToggleThumb = styled.span<{ $active?: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transform: ${({ $active }) => ($active ? 'translateX(20px)' : 'none')};
  transition: transform 0.2s;
`

const LifespanToggleRow = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
`

const LifespanToggleHint = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
`

const InfoBox = styled.div`
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1.5px solid #e2e8f0;
  border-left: 3px solid #3b82f6;
  border-radius: 8px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #475569;
`

const PreviewBox = styled.div<{ $active?: boolean }>`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: ${({ $active }) => ($active ? '#f0fdf4' : '#f9fafb')};
  border: 1.5px solid ${({ $active }) => ($active ? '#86efac' : '#e5e7eb')};
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`

const PreviewLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: #059669;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const PreviewText = styled.div`
  font-size: 0.875rem;
  color: #1f2937;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const PreviewLifespan = styled.span`
  color: #6b7280;
  font-weight: 400;
  font-size: 0.8rem;
`

const ToggleHint = styled.span`
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: #6b7280;
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
    background: #3b82f6;
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);

    svg {
      opacity: 1;
    }
  }

  &:hover .checkmark {
    border-color: #93c5fd;
  }

  .label {
    color: #374151;
    font-weight: 600;
  }
`

const UnknownDateBox = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #fef3c7;
  border: 1.5px solid #fcd34d;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #92400e;
  font-weight: 600;
`

const AliveBox = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #f0f9ff;
  border: 1.5px solid #bae6fd;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #0369a1;
  font-weight: 600;
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

// 종교 모달 (부드러운 라벤더 테마)
const ReligionModal = styled(Modal)``

const ReligionModalContent = styled.div`
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.2s ease;
  overflow: hidden;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ReligionModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 1.5rem;
  background: #faf9fc;
  border-bottom: 1px solid #f0f0f3;
`

// 직업 모달 (부드러운 스카이블루 테마)
const JobModal = styled(Modal)``

const JobModalContent = styled.div`
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.2s ease;
  overflow: hidden;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const JobModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 1.5rem;
  background: #f8fcfd;
  border-bottom: 1px solid #e8f4f8;
`

// 아버지 모달 (부드러운 민트 테마)
const FatherModal = styled(Modal)``

const FatherModalContent = styled.div`
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.2s ease;
  overflow: hidden;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const FatherModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 1.5rem;
  background: #f7fcfa;
  border-bottom: 1px solid #e7f5f0;
`

// 어머니 모달 (부드러운 로즈 테마)
const MotherModal = styled(Modal)``

const MotherModalContent = styled.div`
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.2s ease;
  overflow: hidden;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const MotherModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 1.5rem;
  background: #fdf9fb;
  border-bottom: 1px solid #f8edf4;
`

const ModalHeaderIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: ${(props) => props.$color}08;
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const ModalTitleGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const ModalSubtitle = styled.p`
  font-size: 0.8125rem;
  color: #9ca3af;
  margin: 0;
  font-weight: 400;
`

const ListItemIcon = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: ${(props) => props.$color}08;
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
`

const SelectedBadge = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  margin-left: auto;
  flex-shrink: 0;
`

const PersonInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const PersonName = styled.span`
  font-weight: 500;
  color: #374151;
`

const PersonLifespan = styled.span<{ $color: string }>`
  font-size: 0.8125rem;
  color: #9ca3af;
  font-weight: 400;
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
  max-height: calc(85vh - 80px); /* 헤더 높이 제외 */
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
  border: 2px solid ${(props) => (props.$active ? '#3b82f6' : '#d1d5db')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
`

const ModalRadioDot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? '#3b82f6' : 'transparent')};
  transition: all 0.2s;
  transform: scale(${(props) => (props.$active ? 1 : 0)});
`

const FilterOptionButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 0.625rem 1rem;
  background: ${(props) => (props.$active ? '#eff6ff' : 'transparent')};
  color: ${(props) => (props.$active ? '#3b82f6' : '#6b7280')};
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
    background: ${(props) => (props.$active ? '#dbeafe' : '#f3f4f6')};
    color: ${(props) => (props.$active ? '#2563eb' : '#374151')};
  }
`

const DateButton = styled.button<{
  $hasValue: boolean
  $hasError?: boolean
  $flash?: boolean
}>`
  width: 100%;
  padding: 0.875rem 1rem;
  background: ${(props) => (props.$hasValue ? '#f9fafb' : '#ffffff')};
  border: 1px solid
    ${(props) => {
      if (props.$hasError) return '#fca5a5'
      return props.$hasValue ? '#d1d5db' : '#e5e7eb'
    }};
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: ${(props) => (props.$hasValue ? '600' : '500')};
  color: ${(props) => (props.$hasValue ? '#111827' : '#9ca3af')};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: none;

  svg {
    font-size: 1.1rem;
    color: ${(props) => (props.$hasValue ? '#6b7280' : '#9ca3af')};
  }

  &:hover {
    border-color: ${(props) => (props.$hasError ? '#fca5a5' : '#d1d5db')};
    background: #f9fafb;
    box-shadow: none;
  }

  ${(props) => props.$hasError && props.$flash && errorBlinkStyles}
`

const SelectionCard = styled.button<{ $hasValue: boolean; $color?: string }>`
  width: 100%;
  padding: 1.25rem 1.5rem;
  background: ${(props) => (props.$hasValue ? '#f9fafb' : 'white')};
  border: 1px solid
    ${(props) => (props.$hasValue ? props.$color || '#3b82f6' : '#e5e7eb')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: ${(props) =>
    props.$hasValue
      ? '0 2px 8px rgba(0, 0, 0, 0.08)'
      : '0 1px 2px rgba(0, 0, 0, 0.05)'};
  text-align: left;

  &:hover {
    border-color: ${(props) => props.$color || '#3b82f6'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: ${(props) => (props.$hasValue ? '#f3f4f6' : '#fafafa')};
  }

  &:active {
    transform: scale(0.99);
  }
`

const SelectionCardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 10px;
  background: ${(props) => `${props.$color || '#3b82f6'}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: ${(props) => props.$color || '#3b82f6'};
  transition: all 0.2s;

  ${SelectionCard}:hover & {
    transform: scale(1.05);
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

const MultiJobContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`

const JobBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(6, 182, 212, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
  }
`

const JobBadgeRemove = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const AddJobButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #06b6d4;
  border: 1.5px dashed #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #eff6ff;
    border-color: #06b6d4;
    color: #0891b2;
  }

  &:active {
    transform: scale(0.98);
  }
`

const SelectedJobsContainer = styled.div`
  padding: 1rem 1.5rem;
  background: #f0f9ff;
  border-bottom: 1px solid #bae6fd;
`

const SelectedJobsLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
`

const SelectedJobsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const SelectedJobTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #eff6ff;
  border: 1.5px solid #93c5fd;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
  transition: all 0.15s;

  &:hover {
    border-color: #60a5fa;
    background: #dbeafe;
  }
`

const SelectedJobRemove = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: #dbeafe;
  border: none;
  border-radius: 50%;
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #fee2e2;
    color: #ef4444;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const JobModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
`

const JobModalDoneButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`

const FormLabelHint = styled.span`
  font-size: 0.8rem;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 0.5rem;
`

const ModernSelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const ModernSelectionCard = styled.button<{
  $hasValue?: boolean
  $error?: boolean
}>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: ${({ $hasValue }) => ($hasValue ? '#f8fafc' : '#ffffff')};
  border: 2px solid
    ${({ $hasValue, $error }) =>
      $error ? '#ef4444' : $hasValue ? '#cbd5e1' : '#e2e8f0'};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;

  &:hover {
    border-color: ${({ $hasValue, $error }) =>
      $error ? '#dc2626' : $hasValue ? '#94a3b8' : '#cbd5e1'};
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(0);
  }
`

const ModernCardIcon = styled.div<{ $color: string }>`
  width: 52px;
  height: 52px;
  min-width: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}15`};
  border-radius: 14px;
  color: ${({ $color }) => $color};
  transition: all 0.2s;

  ${ModernSelectionCard}:hover & {
    background: ${({ $color }) => `${$color}25`};
  }
`

const ModernCardContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const ModernCardLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const ModernCardValue = styled.div<{ $hasValue?: boolean }>`
  font-size: 1rem;
  font-weight: ${({ $hasValue }) => ($hasValue ? '600' : '500')};
  color: ${({ $hasValue }) => ($hasValue ? '#1e293b' : '#94a3b8')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ModernCardClear = styled.button`
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border: none;
  border-radius: 10px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.15s;
  opacity: 0;

  ${ModernSelectionCard}:hover & {
    opacity: 1;
  }

  &:hover {
    background: #fecaca;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const JobSelectionArea = styled.button<{ $hasJobs?: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background: ${({ $hasJobs }) => ($hasJobs ? '#f8fafc' : '#ffffff')};
  border: 2px dashed ${({ $hasJobs }) => ($hasJobs ? '#cbd5e1' : '#e2e8f0')};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &:hover {
    border-color: #06b6d4;
    border-style: solid;
    background: ${({ $hasJobs }) => ($hasJobs ? '#f1f5f9' : '#f8fafc')};
    box-shadow: 0 6px 18px rgba(6, 182, 212, 0.12);
  }

  &:active {
    transform: scale(0.99);
  }
`

const JobSelectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const JobSelectionIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border-radius: 14px;
  color: white;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
  transition: all 0.2s;

  ${JobSelectionArea}:hover & {
    transform: scale(1.05);
    box-shadow: 0 6px 18px rgba(6, 182, 212, 0.3);
  }
`

const JobSelectionInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const JobSelectionTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e293b;
`

const JobSelectionHint = styled.div`
  font-size: 0.85rem;
  color: #94a3b8;
`

const JobBadgeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const ImprovedJobBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }
`

const JobBadgeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
`

const JobBadgeText = styled.span`
  font-weight: 600;
`

const ImprovedJobBadgeRemove = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
    color: #64748b;
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
  }
`

const JobCategoryBadgeContainer = styled.div`
  margin-bottom: 1rem;
`

const JobCategoryBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #334155;

  svg {
    color: #64748b;
  }

  span {
    font-weight: 600;
  }
`

const JobCategoryBadgeButton = styled.button`
  padding: 0.35rem 0.75rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1e40af;
  }

  &:active {
    transform: scale(0.95);
  }
`

const JobCategoryChangeButton = styled.button`
  padding: 0.25rem 0.625rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.95);
  }
`

const JobCountBadge = styled.div`
  padding: 0.125rem 0.5rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
`

const JobBadgeInCard = styled.span`
  padding: 0.25rem 0.625rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.15s;
  cursor: pointer;

  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;

    .remove-icon {
      opacity: 1;
    }
  }

  .remove-icon {
    opacity: 0;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    color: #94a3b8;

    &:hover {
      color: #64748b;
    }
  }
`

const NicknameTag = styled.span`
  padding: 0.375rem 0.75rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 8px;
  font-size: ${DESIGN_TOKENS.fontSize.sm};
  font-weight: 500;
  border: 1px solid #cbd5e1;
  display: inline-flex;
  align-items: center;
  gap: ${DESIGN_TOKENS.spacing.sm};
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
    border-color: #94a3b8;

    .remove-icon,
    .action-icon {
      opacity: 1;
    }
  }

  .action-icon {
    opacity: 0.5;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    color: #3b82f6;
    cursor: pointer;

    &:hover {
      opacity: 1;
      color: #2563eb;
    }
  }

  .remove-icon {
    opacity: 0.5;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    color: #64748b;
    cursor: pointer;

    &:hover {
      opacity: 1;
      color: #dc2626;
    }
  }
`

const NicknameInputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`

const AddNicknameButton = styled.button`
  padding: 0.5rem 1rem;
  background: #fefce8;
  border: 1.5px solid #fde047;
  border-radius: 8px;
  color: #854d0e;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:hover {
    background: #fef08a;
    border-color: #facc15;
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CountryBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1.5px solid #93c5fd;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e40af;
  transition: all 0.15s;

  &:hover {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-color: #60a5fa;

    .remove-icon {
      opacity: 1;
    }
  }

  .flag {
    font-size: 1.25rem;
  }

  .remove-icon {
    opacity: 0.7;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    color: #3b82f6;
    cursor: pointer;

    &:hover {
      opacity: 1;
      color: #2563eb;
    }
  }
`

const AddCountryButton = styled.button`
  padding: 0.5rem 1rem;
  background: #f0f9ff;
  border: 1.5px dashed #93c5fd;
  border-radius: 10px;
  color: #1e40af;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:hover {
    background: #e0f2fe;
    border-color: #60a5fa;
    border-style: solid;
  }

  &:active {
    transform: scale(0.98);
  }
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
  background: ${(props) => (props.$hasValue ? '#f9fafb' : 'white')};
  border: 1px solid
    ${(props) => (props.$hasValue ? props.$color || '#3b82f6' : '#e5e7eb')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: ${(props) =>
    props.$hasValue
      ? '0 2px 8px rgba(0, 0, 0, 0.08)'
      : '0 1px 2px rgba(0, 0, 0, 0.05)'};
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
      props.$hasValue ? props.$color || '#3b82f6' : 'transparent'};
    transition: all 0.2s;
  }

  &:hover {
    border-color: ${(props) => props.$color || '#3b82f6'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: ${(props) => (props.$hasValue ? '#f3f4f6' : '#fafafa')};

    &::before {
      height: 3px;
    }
  }

  &:active {
    transform: scale(0.98);
  }
`

const JobCategoryCard = styled(PrimarySelectionCard)`
  aspect-ratio: auto;
  min-height: 78px;
  padding: 0.5rem;
  gap: 0.35rem;
  border-width: 1px;
  box-shadow: none;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

const JobSelectionContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const JobCategorySelectCard = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 12px;
  border: 2px solid ${({ $hasValue }) => ($hasValue ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $hasValue }) => ($hasValue ? '#eff6ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  min-height: 90px;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${({ $hasValue }) => ($hasValue ? '#2563eb' : '#cbd5e1')};
    box-shadow: 0 2px 8px rgba(100, 116, 139, 0.08);
  }

  &:active {
    transform: scale(0.98);
  }
`

const JobCategorySelectHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`

const JobCategorySelectIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 1.1rem;
  transition: all 0.2s;

  ${JobCategorySelectCard}:hover & {
    background: #e2e8f0;
    color: #475569;
  }
`

const JobCategorySelectLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const JobCategorySelectValue = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-left: 0.125rem;
`

const JobCategoryMain = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
`

const JobCategorySub = styled.div`
  font-size: 0.813rem;
  font-weight: 500;
  color: #64748b;
  background: #f8fafc;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  display: inline-block;
  width: fit-content;
  line-height: 1.3;

  &::before {
    content: '›';
    margin-right: 0.3rem;
    color: #cbd5e1;
  }
`

const JobCategorySelectPlaceholder = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
  padding-left: 0.125rem;
  line-height: 1.5;
`

const JobSelectCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $selected }) => ($selected ? '#eff6ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  min-height: 90px;
  position: relative;
  overflow: hidden;

  &:hover:not(:disabled) {
    border-color: ${({ $selected }) => ($selected ? '#2563eb' : '#cbd5e1')};
    box-shadow: 0 2px 8px rgba(100, 116, 139, 0.08);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const JobSelectHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`

const JobSelectIconWrapper = styled.div<{ $selected?: boolean }>`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 1.1rem;
  transition: all 0.2s;

  ${JobSelectCard}:hover:not(:disabled) & {
    background: #e2e8f0;
    color: #475569;
  }
`

const JobSelectLabelText = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const JobSelectValueText = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
  padding-left: 0.125rem;
`

const JobSelectPlaceholder = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
  padding-left: 0.125rem;
  line-height: 1.5;
`

const JobCategoryCardIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: ${(props) => `${props.$color || '#3b82f6'}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: ${(props) => props.$color || '#3b82f6'};
  transition: all 0.2s;

  ${JobCategoryCard}:hover & {
    transform: scale(1.05);
    background: ${(props) => `${props.$color || '#3b82f6'}20`};
  }
`

const JobCategoryCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`

const JobCategoryCardLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const JobCategoryCardValue = styled.div<{ $hasValue?: boolean }>`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ $hasValue }) => ($hasValue ? '#1f2937' : '#9ca3af')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const JobCategoryBreadcrumb = styled.div`
  font-size: 0.7rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`

const JobSelectButton = styled.button<{ $selected?: boolean }>`
  height: auto;
  min-height: 78px;
  padding: 0.75rem;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#e5e7eb')};
  background: ${({ $selected }) => ($selected ? '#eff6ff' : '#ffffff')};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`

const JobSelectIcon = styled.div<{ $selected?: boolean }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(59, 130, 246, 0.15)' : '#f3f4f6'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: ${({ $selected }) => ($selected ? '#3b82f6' : '#9ca3af')};
  transition: all 0.2s;

  ${JobSelectButton}:hover:not(:disabled) & {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    transform: scale(1.05);
  }
`

const JobSelectContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`

const JobSelectLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const JobSelectValue = styled.div<{ $selected?: boolean }>`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ $selected }) => ($selected ? '#1f2937' : '#9ca3af')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PrimarySelectionCardIcon = styled.div<{ $color?: string }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  background: ${(props) => `${props.$color || '#3b82f6'}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: ${(props) => props.$color || '#3b82f6'};
  transition: all 0.2s;

  ${PrimarySelectionCard}:hover & {
    transform: scale(1.05);
  }
`

const JobCategoryCardIconSmall = styled(PrimarySelectionCardIcon)`
  width: 28px;
  height: 28px;
  min-width: 28px;
  font-size: 1rem;
  border-radius: 6px;
  box-shadow: none;

  ${JobCategoryCard}:hover & {
    transform: scale(1.02);
    box-shadow: none;
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

const CurrentCategoryBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
`

const CurrentCategoryText = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
`

const CurrentCategoryAction = styled.button`
  padding: 0.5rem 1rem;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  color: #3b82f6;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #2563eb;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const JobModalList = styled.div`
  max-height: 450px;
  overflow-y: auto;
  padding: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;

    &:hover {
      background: #cbd5e1;
    }
  }
`

const JobModalListItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1.5px solid
    ${({ $selected }) => ($selected ? '#3b82f6' : 'transparent')};
  border-radius: 12px;
  background: ${({ $selected }) => ($selected ? '#eff6ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  margin-bottom: 0.5rem;

  &:hover {
    background: ${({ $selected }) => ($selected ? '#eff6ff' : '#f8fafc')};
    border-color: ${({ $selected }) => ($selected ? '#3b82f6' : '#e2e8f0')};
    transform: translateX(4px);
  }

  &:active {
    transform: translateX(2px);
  }
`

const JobModalItemContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const JobModalItemTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
`

const JobModalItemDesc = styled.div`
  font-size: 0.8rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const JobModalItemCheck = styled.div`
  width: 22px;
  height: 22px;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  font-size: 0.75rem;
`

const EmptyJobMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3.5rem 2rem;
  text-align: center;
`

const EmptyJobHint = styled.div`
  font-size: 0.85rem;
  color: #cbd5e1;
  max-width: 320px;
  margin-top: 0.5rem;
`

const JobCategoryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem 0;
  background: white;
  border-bottom: 1px solid #e5e7eb;
`

const JobCategoryChip = styled.button<{ $active?: boolean }>`
  height: 30px;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? '#3b82f6' : '#e5e7eb')};
  background: ${({ $active }) =>
    $active ? 'rgba(59, 130, 246, 0.1)' : '#ffffff'};
  color: ${({ $active }) => ($active ? '#2563eb' : '#6b7280')};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    color: #2563eb;
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
  padding: 1.25rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 3px;

    &:hover {
      background: #d1d5db;
    }
  }
`

const ModalListItem = styled.button<{ $selected?: boolean; $color?: string }>`
  width: 100%;
  padding: 1rem 1.125rem;
  background: ${(props) => (props.$selected ? '#fafafa' : 'white')};
  border: 2px solid ${(props) => (props.$selected ? '#e5e7eb' : 'transparent')};
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  font-weight: 500;
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.625rem;

  &:hover {
    background: ${(props) => (props.$selected ? '#f5f5f5' : '#fafafa')};
    border-color: #e5e7eb;
    transform: scale(1.01);

    ${ListItemIcon} {
      background: ${(props) => `${props.$color || '#3b82f6'}12`};
      transform: scale(1.05);
    }
  }

  &:active {
    transform: scale(0.99);
  }

  &:last-child {
    margin-bottom: 0;
  }
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

const CareerLayout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const TimelineSidebar = styled.div`
  position: relative;
`

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const TimelineItem = styled.button<{ $active?: boolean; $isCurrent?: boolean }>`
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 0.75rem;
  text-align: left;
  align-items: flex-start;
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  position: relative;

  ${({ $active }) =>
    $active &&
    `
    background: rgba(59, 130, 246, 0.08);
  `}

  ${({ $isCurrent }) =>
    $isCurrent &&
    `
    &::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${DESIGN_TOKENS.gradients.primary};
      border-radius: 2px;
    }
  `}

  &:hover {
    background: rgba(59, 130, 246, 0.06);
  }
`

const TimelineMarker = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding-top: 2px;
`

const TimelineDot = styled.span<{ $active?: boolean; $isCurrent?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, $isCurrent }) =>
    $isCurrent ? '#3b82f6' : $active ? '#3b82f6' : '#d1d5db'};
  box-shadow: ${({ $active, $isCurrent }) =>
    $isCurrent
      ? '0 0 0 4px rgba(59, 130, 246, 0.15)'
      : $active
        ? '0 0 0 4px rgba(59, 130, 246, 0.15)'
        : 'none'};
  ${({ $isCurrent }) =>
    $isCurrent &&
    `
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `}
`

const TimelineLine = styled.span`
  width: 2px;
  flex: 1;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 2px;
`

const TimelineGap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 500;

  &::before {
    content: '⋮';
    font-size: 1rem;
    line-height: 1;
    color: #d1d5db;
  }
`

const TimelineContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;

  strong {
    font-size: 0.85rem;
    color: #374151;
  }

  span {
    font-size: 0.75rem;
    color: #9ca3af;
  }
`

const TimelineItemActions = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;

  ${TimelineItem}:hover & {
    opacity: 1;
  }
`

const TimelineItemButton = styled.button<{ $danger?: boolean }>`
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid ${(props) => (props.$danger ? '#fecaca' : '#e5e7eb')};
  background: ${(props) => (props.$danger ? '#fee2e2' : 'white')};
  color: ${(props) => (props.$danger ? '#ef4444' : '#6b7280')};
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$danger ? '#fecaca' : '#f9fafb')};
    border-color: ${(props) => (props.$danger ? '#ef4444' : '#9ca3af')};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

const CareerFormPanel = styled.div`
  min-width: 0;
`

const EmptyCareerFormHint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;
  min-height: 300px;
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
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: white;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3b82f6;
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    font-size: 1rem;
    transition: transform 0.2s;
  }

  &:hover svg {
    transform: rotate(90deg);
  }
`

const EmptyCareerMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 2rem 2.5rem 2.75rem;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  gap: 0.4rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 18px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      rgba(59, 130, 246, 0.3),
      rgba(147, 197, 253, 0.15)
    );
  }
`

const EmptyCareerIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin-bottom: 0.5rem;
`

const EmptyCareerDot = styled.span`
  position: absolute;
  left: 10px;
  top: 24px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(99, 102, 241, 0.45);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
`

const EmptyCareerTitle = styled.p`
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: #4b5563;
`

const EmptyCareerDescription = styled.span`
  font-size: 0.8125rem;
  color: #6b7280;
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
  background: #3b82f6;
  color: white;
  font-size: ${DESIGN_TOKENS.fontSize.xs};
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

const CareerImageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`

const CareerImageItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const CareerImageThumb = styled.button`
  width: 180px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: white;
  position: relative;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    background: #111827;
    color: #ffffff;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    white-space: nowrap;
    z-index: 2;
  }

  &[data-tooltip]:hover::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: calc(100% + 2px);
    transform: translateX(-50%);
    border-width: 6px 6px 0 6px;
    border-style: solid;
    border-color: #111827 transparent transparent transparent;
    z-index: 2;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity 0.2s ease;
  }

  &:hover img {
    opacity: 0.95;
  }
`

const CareerImageRemove = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: white;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 0;

  ${CareerImageThumb}:hover & {
    opacity: 1;
  }

  &:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const CareerImageDescriptionInput = styled.input`
  width: 180px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 0.75rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const CareerImageAdd = styled.label`
  width: 180px;
  height: 120px;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  background: #fafafa;
  color: #9ca3af;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;

  svg {
    font-size: 1.5rem;
  }

  &:hover {
    border-color: #9ca3af;
    background: #f5f5f5;
    color: #6b7280;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: scale(0.98);
  }
`

const CareerImageInput = styled.input`
  display: none;
`

const JobCategoryModalBody = styled.div`
  padding: 1.5rem 2rem 2rem;
  max-height: 70vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;

    &:hover {
      background: #cbd5e1;
    }
  }
`

const JobCategorySection = styled.div`
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const JobCategorySectionTitle = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const JobCategoryParentBadge = styled.span`
  padding: 0.35rem 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  text-transform: none;
  letter-spacing: normal;
`

const JobCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
`

const JobCategorySubGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
`

const JobCategoryItem = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 0.75rem;
  border-radius: 16px;
  border: 1.5px solid ${({ $active }) => ($active ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ $active }) => ($active ? '#1e40af' : '#64748b')};

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
  }

  &:active {
    transform: translateY(0);
  }
`

const JobCategorySubItem = styled.button<{ $active?: boolean }>`
  padding: 0.65rem 1.1rem;
  border-radius: 12px;
  border: 1.5px solid ${({ $active }) => ($active ? '#3b82f6' : '#e2e8f0')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1e40af' : '#64748b')};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
    color: #1e40af;
  }

  &:active {
    transform: scale(0.98);
  }
`

const JobCategoryItemIcon = styled.div<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'rgba(59, 130, 246, 0.12)' : '#f8fafc'};
  color: ${({ $active }) => ($active ? '#3b82f6' : '#94a3b8')};
  font-size: 1.4rem;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  ${JobCategoryItem}:hover & {
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    transform: scale(1.05);
  }

  svg {
    stroke-width: 2px;
  }
`

const JobCategoryItemText = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
`

const JobCategoryModalStep = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 6px;
  letter-spacing: 0.03em;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
`

const JobCategorySectionHint = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #94a3b8;
  text-transform: none;
  letter-spacing: normal;
  margin-left: 0.75rem;
`

const JobCategoryModalFooter = styled.div`
  display: flex;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid #f1f5f9;
  margin-top: 2rem;
`

const JobCategoryNextButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 1.1rem;
  }
`

const JobCategoryResetButton = styled.button`
  padding: 1rem 1.5rem;
  background: #ffffff;
  color: #64748b;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #475569;
  }

  &:active {
    transform: scale(0.98);
  }
`

const CareerFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const PeriodRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
`

const PeriodStatus = styled.div`
  min-width: 160px;
`

const AgeHint = styled.div`
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #6b7280;
`
const CareerInlineRow = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const CareerPositionRow = styled.div`
  display: grid;
  grid-template-columns: 140px 180px 1fr;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const TermNumberRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const TermNumberInput = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const TermNumberPrefix = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
`

const TermNumberSuffix = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
`

const CareerJobButton = styled.button<{ $selected?: boolean }>`
  height: 42px;
  border-radius: 8px;
  border: 1.5px solid ${({ $selected }) => ($selected ? '#3b82f6' : '#e5e7eb')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(59, 130, 246, 0.08)' : '#fff'};
  color: ${({ $selected }) => ($selected ? '#2563eb' : '#374151')};
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0 1rem;
  text-align: left;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
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

// 확인 모달 스타일
const ConfirmModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

const ConfirmModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`

const ConfirmModalTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
`

const ConfirmModalBody = styled.div`
  padding: 1.5rem;
`

const ConfirmMessage = styled.div`
  font-size: 1rem;
  color: #374151;
  margin-bottom: 1.5rem;
  text-align: center;

  strong {
    color: #111827;
    font-size: 1.125rem;
  }
`

const ConfirmDetails = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const ConfirmDetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;

  span {
    color: #6b7280;
    min-width: 4rem;
  }

  strong {
    color: #111827;
  }
`

const ConfirmModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
`

// 국가 이적 관련 스타일 컴포넌트
const CountryTransferItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(
    135deg,
    rgba(249, 250, 251, 0.8),
    rgba(243, 244, 246, 0.6)
  );
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(249, 250, 251, 1),
      rgba(243, 244, 246, 0.9)
    );
    border-color: #d1d5db;
    transform: translateX(2px);
  }
`

const TransferArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
  font-size: 0.75rem;
  flex-shrink: 0;
`

const TransferInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const TransferCountryName = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const TransferYear = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 500;
`

const TransferNote = styled.div`
  font-size: 0.8125rem;
  color: #9ca3af;
  font-style: italic;
  white-space: pre-line;
  line-height: 1.5;
  margin-top: 0.25rem;
`

const TransferRemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  ${CountryTransferItem}:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const CountrySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const CountrySectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: -0.25rem;
`

const BirthCountryCard = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  background: ${(props) =>
    props.$hasValue
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(110, 231, 183, 0.12))'
      : 'linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.6))'};
  border: 1.5px solid
    ${(props) => (props.$hasValue ? 'rgba(16, 185, 129, 0.25)' : '#e5e7eb')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &:hover {
    background: ${(props) =>
      props.$hasValue
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(110, 231, 183, 0.18))'
        : 'linear-gradient(135deg, rgba(249, 250, 251, 1), rgba(243, 244, 246, 0.9))'};
    border-color: ${(props) =>
      props.$hasValue ? 'rgba(16, 185, 129, 0.4)' : '#d1d5db'};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`

const BirthCountryIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${DESIGN_TOKENS.gradients.success};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: ${DESIGN_TOKENS.fontSize.lg};
`

const BirthCountryContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const BirthCountryLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const BirthCountryValue = styled.div<{ $hasValue: boolean }>`
  font-size: 0.9375rem;
  font-weight: ${(props) => (props.$hasValue ? '600' : '500')};
  color: ${(props) => (props.$hasValue ? '#1f2937' : '#9ca3af')};
`

const BiographyTextarea = styled.textarea`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #1f2937;
  line-height: 1.6;
  resize: vertical;
  min-height: 140px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const CharacterCountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`

const CharacterCount = styled.div<{ $warning?: boolean }>`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${(props) => (props.$warning ? '#f59e0b' : '#6b7280')};
`

const CharacterWarning = styled.div`
  font-size: 0.8125rem;
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &::before {
    content: '⚠️';
  }
`

const CancelButton = styled.button`
  padding: 0.625rem 1.25rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #e5e7eb;
    border-color: #d1d5db;
  }

  &:active {
    transform: scale(0.98);
  }
`

const SubmitButton = styled.button<{ disabled?: boolean }>`
  padding: 0.625rem 1.25rem;
  background: ${(props) => (props.disabled ? '#e5e7eb' : '#3b82f6')};
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${(props) => (props.disabled ? '#e5e7eb' : '#2563eb')};
  }

  &:active {
    transform: ${(props) => (props.disabled ? 'none' : 'scale(0.98)')};
  }
`

// 국가 이적 모달 전용 스타일
const SelectedCountryCard = styled.div`
  margin-bottom: 1.75rem;
  padding: ${DESIGN_TOKENS.spacing.lg} 1.25rem;
  background: ${DESIGN_TOKENS.gradients.info};
  border-radius: 12px;
  border: 1.5px solid #93c5fd;
  display: flex;
  align-items: center;
  gap: ${DESIGN_TOKENS.spacing.md};
  transition: all 0.2s;

  &:hover {
    border-color: #60a5fa;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
  }
`

const SelectedCountryFlag = styled.span`
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
`

const SelectedCountryInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const SelectedCountryLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
`

const SelectedCountryName = styled.div`
  font-size: 1.0625rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
`

const ChangeCountryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 7px;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`

const TransferFormGroup = styled.div`
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const TransferLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.625rem;
`

const TransferTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #1f2937;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const TransferModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #fafbfc 0%, #f9fafb 100%);
  border-radius: 0 0 12px 12px;
`
