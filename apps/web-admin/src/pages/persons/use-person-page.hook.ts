/**
 * 인물 페이지 비즈니스 로직 훅
 *
 * @description
 * 인물 페이지의 상태 관리 및 비즈니스 로직을 담당합니다.
 * - 인물 CRUD 작업
 * - 검색 및 필터링
 * - 페이지네이션
 * - 폼 상태 관리
 */

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
  usePersons,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  type Person,
  type CreatePersonData,
  type Era,
} from '@/entities/person/api'
import { useCountries } from '@/features/country/api'
import { useContinents } from '@/features/continent/use-continents.hook'
import { useReligions } from '@/shared/api/religion'
import { useDynasties } from '@/shared/api/dynasty'
import { useJobs } from '@/shared/api/job'

export interface PersonFormData {
  name: string
  surname?: string
  gender?: string
  birthEra?: Era
  birthYear?: number
  birthMonth?: number
  birthDay?: number
  deathEra?: Era
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  biography?: string
  profileImageUrl?: string
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  jobId?: string
  countryId?: string
}

export function usePersonPage() {
  // Data Fetching
  const { data: persons, isLoading, isError, error } = usePersons()
  const { data: countries } = useCountries()
  const { data: continents } = useContinents()
  const { data: religions } = useReligions()
  const { data: dynasties } = useDynasties()
  const { data: jobs } = useJobs()

  // Mutations
  const deleteMutation = useDeletePerson()
  const createMutation = useCreatePerson()
  const updateMutation = useUpdatePerson()

  // UI State
  const [showSidebar, setShowSidebar] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('ALL')
  const [countryFilter, setCountryFilter] = useState<string[]>([])
  const [continentFilter, setContinentFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'birthYear' | 'countryName'>('birthYear')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // SelectModal State
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showBirthEraModal, setShowBirthEraModal] = useState(false)
  const [showDeathEraModal, setShowDeathEraModal] = useState(false)

  // Filter Modal State
  const [showGenderFilterModal, setShowGenderFilterModal] = useState(false)
  const [showCountryFilterModal, setShowCountryFilterModal] = useState(false)
  const [showContinentFilterModal, setShowContinentFilterModal] =
    useState(false)
  const [showSortModal, setShowSortModal] = useState(false)

  // Profile Image State
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string>('')

  // Form Data
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    surname: '',
    gender: undefined,
    birthEra: 'AD' as Era,
    birthYear: undefined,
    birthMonth: undefined,
    birthDay: undefined,
    deathEra: 'AD' as Era,
    deathYear: undefined,
    deathMonth: undefined,
    deathDay: undefined,
    biography: '',
    profileImageUrl: '',
    dynastyId: undefined,
    religionId: undefined,
    denominationId: undefined,
    fatherId: undefined,
    motherId: undefined,
    jobId: undefined,
    countryId: undefined,
  })

  /**
   * 필터링 및 검색된 인물 목록
   */
  const filteredPersons = useMemo(() => {
    if (!persons) return []

    const filtered = persons.filter((person) => {
      // 검색어 필터
      const fullName = person.surname
        ? `${person.surname} ${person.name}`
        : person.name
      const matchesSearch =
        searchTerm === '' ||
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.biography?.toLowerCase().includes(searchTerm.toLowerCase())

      // 성별 필터
      const matchesGender =
        genderFilter === 'ALL' || person.gender === genderFilter

      // 국가 필터 (다중 선택)
      const matchesCountry =
        countryFilter.length === 0 ||
        (person.countryId && countryFilter.includes(person.countryId))

      // 대륙 필터 (국가를 통한 간접 필터)
      let matchesContinent = true
      if (continentFilter !== 'ALL' && person.countryId) {
        const personCountry = countries?.find(
          (country) => country.id === person.countryId,
        )
        matchesContinent = personCountry?.continentId === continentFilter
      }

      return (
        matchesSearch && matchesGender && matchesCountry && matchesContinent
      )
    })

    // 정렬
    return filtered.sort((personA, personB) => {
      if (sortBy === 'birthYear') {
        // 연생순 (오래된 순)
        const yearA = personA.birthYear || 9999
        const yearB = personB.birthYear || 9999

        return yearA - yearB
      } else if (sortBy === 'countryName') {
        // 국가 이름순
        const countryA = countries?.find(
          (country) => country.id === personA.countryId,
        )
        const countryB = countries?.find(
          (country) => country.id === personB.countryId,
        )
        const nameA = countryA?.name || ''
        const nameB = countryB?.name || ''

        return nameA.localeCompare(nameB, 'ko')
      }

      return 0
    })
  }, [
    persons,
    searchTerm,
    genderFilter,
    countryFilter,
    continentFilter,
    sortBy,
    countries,
  ])

  /**
   * 페이징 적용된 인물 목록
   */
  const paginatedPersons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPersons.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPersons, currentPage, itemsPerPage])

  /**
   * 총 페이지 수
   */
  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage)

  /**
   * 검색어 또는 필터 변경 시 첫 페이지로 이동
   */
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, genderFilter, countryFilter, continentFilter])

  /**
   * 수정 시 폼 데이터 설정
   */
  useEffect(() => {
    if (editingPerson) {
      setFormData({
        name: editingPerson.name || '',
        surname: editingPerson.surname || '',
        gender: editingPerson.gender || undefined,
        birthEra: (editingPerson.birthEra || 'AD') as Era,
        birthYear: editingPerson.birthYear || undefined,
        birthMonth: editingPerson.birthMonth || undefined,
        birthDay: editingPerson.birthDay || undefined,
        deathEra: (editingPerson.deathEra || 'AD') as Era,
        deathYear: editingPerson.deathYear || undefined,
        deathMonth: editingPerson.deathMonth || undefined,
        deathDay: editingPerson.deathDay || undefined,
        biography: editingPerson.biography || '',
        profileImageUrl: editingPerson.profileImageUrl || '',
        dynastyId: editingPerson.dynastyId || undefined,
        religionId: editingPerson.religionId || undefined,
        denominationId: editingPerson.denominationId || undefined,
        fatherId: editingPerson.fatherId || undefined,
        motherId: editingPerson.motherId || undefined,
        jobId: editingPerson.jobId || undefined,
        countryId: editingPerson.countryId || undefined,
      })
      setProfilePreview(editingPerson.profileImageUrl || '')
    } else {
      // 새 등록 시 초기화
      setFormData({
        name: '',
        surname: '',
        gender: undefined,
        birthEra: 'AD' as Era,
        birthYear: undefined,
        birthMonth: undefined,
        birthDay: undefined,
        deathEra: 'AD' as Era,
        deathYear: undefined,
        deathMonth: undefined,
        deathDay: undefined,
        biography: '',
        profileImageUrl: '',
        dynastyId: undefined,
        religionId: undefined,
        denominationId: undefined,
        fatherId: undefined,
        motherId: undefined,
        jobId: undefined,
        countryId: undefined,
      })
      setProfilePreview('')
      setProfileImageFile(null)
    }
  }, [editingPerson])

  /**
   * 프로필 이미지 파일 업로드 핸들러
   */
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setProfilePreview(result)
        setFormData({ ...formData, profileImageUrl: result })
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * 인물 수정 핸들러
   */
  const handleEdit = (person: Person) => {
    setEditingPerson(person)
    setShowSidebar(true)
  }

  /**
   * 인물 삭제 핸들러
   */
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) {
      const loadingToast = toast.loading('삭제하는 중...')
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('삭제되었습니다', { id: loadingToast })
      } catch (err) {
        toast.error('삭제 실패: ' + (err as Error).message, {
          id: loadingToast,
        })
      }
    }
  }

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      toast.error('이름을 입력해주세요')

      return
    }

    const loadingToast = toast.loading(
      editingPerson ? '수정하는 중...' : '등록하는 중...',
    )

    try {
      const payload: CreatePersonData = {
        name: formData.name.trim(),
        surname: formData.surname?.trim() || '',
        gender: formData.gender,
        biography: formData.biography?.trim(),
        profileImageUrl: formData.profileImageUrl?.trim(),
        birthEra: formData.birthEra,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        deathEra: formData.deathEra,
        deathYear: formData.deathYear,
        deathMonth: formData.deathMonth,
        deathDay: formData.deathDay,
        dynastyId: formData.dynastyId,
        religionId: formData.religionId,
        denominationId: formData.denominationId,
        fatherId: formData.fatherId,
        motherId: formData.motherId,
        jobId: formData.jobId,
        countryId: formData.countryId,
      } as CreatePersonData // SDK 타입에 맞게 캐스팅

      if (editingPerson) {
        await updateMutation.mutateAsync({
          id: editingPerson.id,
          data: payload,
        })
        toast.success('수정되었습니다', { id: loadingToast })
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('등록되었습니다', { id: loadingToast })
      }

      setShowSidebar(false)
      setEditingPerson(null)
      setFormData({
        name: '',
        surname: '',
        gender: undefined,
        birthEra: 'AD' as Era,
        birthYear: undefined,
        birthMonth: undefined,
        birthDay: undefined,
        deathEra: 'AD' as Era,
        deathYear: undefined,
        deathMonth: undefined,
        deathDay: undefined,
        biography: '',
        profileImageUrl: '',
        dynastyId: undefined,
        religionId: undefined,
        denominationId: undefined,
        fatherId: undefined,
        motherId: undefined,
        jobId: undefined,
        countryId: undefined,
      })
    } catch (err) {
      toast.error(
        `${editingPerson ? '수정' : '등록'} 실패: ${(err as Error).message}`,
        { id: loadingToast },
      )
    }
  }

  /**
   * 새 인물 등록 시작
   */
  const handleOpenCreate = () => {
    setEditingPerson(null)
    setShowSidebar(true)
  }

  /**
   * 사이드바 닫기
   */
  const handleCloseSidebar = () => {
    setShowSidebar(false)
    setEditingPerson(null)
  }

  return {
    // Data
    persons,
    countries,
    continents,
    religions,
    dynasties,
    jobs,
    filteredPersons,
    paginatedPersons,
    totalPages,
    isLoading,
    isError,
    error,

    // State
    showSidebar,
    editingPerson,
    isMobileListOpen,
    setIsMobileListOpen,
    searchTerm,
    setSearchTerm,
    genderFilter,
    setGenderFilter,
    countryFilter,
    setCountryFilter,
    continentFilter,
    setContinentFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    itemsPerPage,

    // Form State
    formData,
    setFormData,
    profileImageFile,
    profilePreview,
    handleProfileImageChange,

    // Modal State
    showCountryModal,
    setShowCountryModal,
    showFatherModal,
    setShowFatherModal,
    showMotherModal,
    setShowMotherModal,
    showReligionModal,
    setShowReligionModal,
    showDynastyModal,
    setShowDynastyModal,
    showJobModal,
    setShowJobModal,
    showBirthEraModal,
    setShowBirthEraModal,
    showDeathEraModal,
    setShowDeathEraModal,
    showGenderFilterModal,
    setShowGenderFilterModal,
    showCountryFilterModal,
    setShowCountryFilterModal,
    showContinentFilterModal,
    setShowContinentFilterModal,
    showSortModal,
    setShowSortModal,

    // Mutations
    deleteMutation,

    // Handlers
    handleEdit,
    handleDelete,
    handleSubmit,
    handleOpenCreate,
    handleCloseSidebar,
  }
}
