import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'

import { type ContinentOption, type Country } from '@/entities/country/api'
import { getSummaryMetrics } from '@/entities/country/lib/utils'
import { countrySchema } from '@/entities/country/model/schema'
import {
  COUNTRY_TYPE_LABELS,
  type CountryFormData,
  type CountryTypeFilter,
  type UnifiedCountry,
  historicalToUnified,
  modernToUnified,
} from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { useContinents } from '@/features/continent/use-continents.hook'
import {
  useCountries,
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from '@/features/country/api'
import {
  useCreateHistoricalCountry,
  useDeleteHistoricalCountry,
  useHistoricalCountries,
  useUpdateHistoricalCountry,
} from '@/features/historical-country'
import { CountryDashboard } from '@/widgets/country/country-dashboard'
import { CountryDetail } from '@/widgets/country/country-detail'
import { CountryForm } from '@/widgets/country/country-form'
import { CountryList } from '@/widgets/country/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui'
import { HistoricalCountryForm } from '@/widgets/historical-country/historical-country-form'
import { zodResolver } from '@hookform/resolvers/zod'

import * as S from './country.styles'

/**
 * CountryPage - 국가 관리 페이지
 *
 * @description
 * 현대 국가와 역사적 국가를 통합 관리하는 메인 페이지입니다.
 * 대시보드, 리스트, 상세보기를 제공하며 필터링/정렬/검색 기능을 지원합니다.
 *
 * @features
 * - 현대 국가 CRUD
 * - 역사적 국가 CRUD
 * - 통합 검색/필터링 (대륙, 국가 타입)
 * - 정렬 (이름, 인구, 면적)
 * - 대시보드 통계
 * - 반응형 모바일 UI
 */
export default function CountryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ countryId?: string }>()
  const inHistory = location.pathname.startsWith('/history')

  /** 경로 기반 URL의 countryId (현대/과거 국가 공통 고유 ID) */
  const countryIdFromUrl = params.countryId ?? null
  /** 역대 수반 탭 전용 URL 여부 (/history/country/:id/heads-of-state) */
  const isHeadsOfStateUrl = location.pathname.includes('/heads-of-state')

  // ==================== API Hooks ====================
  // 현대 국가 데이터
  const { data: apiCountries, isLoading: isLoadingCountries } = useCountries()
  const createMutation = useCreateCountry()
  const updateMutation = useUpdateCountry()
  const deleteMutation = useDeleteCountry()

  // 역사적 국가 데이터
  const { data: apiHistoricalCountries, isLoading: isLoadingHistorical } =
    useHistoricalCountries()
  const createHistoricalMutation = useCreateHistoricalCountry()
  const updateHistoricalMutation = useUpdateHistoricalCountry()
  const deleteHistoricalMutation = useDeleteHistoricalCountry()

  // 대륙 데이터
  const { data: apiContinents } = useContinents()

  // ==================== 데이터 변환 ====================
  /**
   * API 데이터를 로컬 Country 타입으로 변환
   * - BigInt → Number 변환
   * - null → undefined 변환
   */
  const countries = useMemo(() => {
    if (!apiCountries) return []

    return apiCountries.map((country) => ({
      id: country.id,
      name: country.name,
      localName: country.localName || undefined,
      isoCode: country.isoCode || undefined,
      flagEmoji: country.flagEmoji || undefined,
      capital: country.capital || undefined,
      population: country.population ? Number(country.population) : undefined,
      areaSqKm: country.areaSqKm ? Number(country.areaSqKm) : undefined,
      thumbnailUrl: country.thumbnailUrl || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined,
      currencyId: country.currencyId || undefined,
      languageId: country.languageId || undefined,
      continentId: country.continentId || undefined,
      // 역사 국가를 최신순으로 정렬 (최신 = 상단)
      historicalCountries: (country.historicalCountries || []).sort((a, b) => {
        // endYear가 있으면 endYear 기준으로 정렬 (최신 = 큰 숫자)
        // endYear가 없으면 startYear 기준으로 정렬
        const aYear = a.endYear || a.startYear || 0
        const bYear = b.endYear || b.startYear || 0
        return bYear - aYear // 내림차순 (최신 = 위)
      }),
    }))
  }, [apiCountries])

  /**
   * 현대 국가 + 역사적 국가 통합 목록
   * - 단일 인터페이스로 두 타입의 국가를 관리
   * - 필터가 'historical'일 때만 별도 역사 국가 항목 표시
   */
  const unifiedCountries = useMemo(() => {
    const modernCountries = countries.map(modernToUnified)
    // 역사 국가는 별도로 추가하지 않음 (현대 국가의 하위 항목으로만 표시)

    return modernCountries
  }, [countries])

  /**
   * 대륙 옵션 목록 (Select/Filter용)
   */
  const CONTINENTS: ContinentOption[] = useMemo(() => {
    if (!apiContinents) return []

    return apiContinents.map((cont) => ({
      id: cont.id,
      name: cont.name,
    }))
  }, [apiContinents])

  // ==================== 상태 관리 ====================
  // 검색 & 필터
  const [query, setQuery] = useState('')
  const [continentFilter, setContinentFilter] = useState('')
  const [countryTypeFilter, setCountryTypeFilter] =
    useState<CountryTypeFilter>('all')
  const [sortBy, setSortBy] = useState<'name' | 'population' | 'area'>('name')

  // 모달 상태
  const [showContinentModal, setShowContinentModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [showCountryTypeModal, setShowCountryTypeModal] = useState(false)

  // 편집 상태
  const [editing, setEditing] = useState<Country | null>(null)
  const [editingHistorical, setEditingHistorical] =
    useState<HistoricalCountry | null>(null)

  // UI 상태 (선택된 국가 ID — URL과 동기화, 직접 진입 시에도 URL 기준으로 초기화)
  const [selectedId, setSelectedId] = useState<string | null>(
    () => countryIdFromUrl || null,
  )

  // URL이 바뀌면 선택 상태 동기화 (다른 국가 클릭, 뒤로가기, 직접 URL 입력 등)
  useEffect(() => {
    setSelectedId(countryIdFromUrl || null)
  }, [countryIdFromUrl])

  const [isLoading, setIsLoading] = useState(false)
  // URL에 countryId가 있으면 목록 탭으로 열기 (직접 진입 시 상세 패널이 보이도록)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>(() =>
    countryIdFromUrl ? 'list' : 'dashboard',
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

  // 이미지 업로드 상태
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [flagImageFile, setFlagImageFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // ==================== React Hook Form ====================
  /**
   * 폼 검증 및 상태 관리
   * - Zod schema 기반 검증
   * - 실시간 검증 (onChange, onBlur)
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm({
    resolver: zodResolver(countrySchema),
    mode: 'all', // 모든 이벤트에서 검증
    reValidateMode: 'onChange', // 재검증도 onChange
    criteriaMode: 'all', // 모든 에러 표시
  })

  /**
   * editing 변경 시 폼 데이터 초기화
   * - 수정 모드: 기존 데이터 로드
   * - 생성 모드: 빈 값
   */
  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name || '',
        localName: editing.localName || '',
        isoCode: editing.isoCode || '',
        flagEmoji: editing.flagEmoji || '',
        flagImageUrl: editing.flagImageUrl ?? undefined,
        capital: editing.capital || '',
        continentId: editing.continentId || '',
        population: editing.population ?? undefined,
        areaSqKm: editing.areaSqKm ?? undefined,
        gdpUsdBn: editing.gdpUsdBn ?? undefined,
        thumbnailUrl: editing.thumbnailUrl || '',
        currencyId: editing.currencyId || '',
        languageId: editing.languageId || '',
      })
      setThumbnailPreview(editing.thumbnailUrl || '')
      setFlagImageFile(null)
      setThumbnailFile(null)
    }
  }, [editing, reset])

  // ==================== 계산된 값 (Memoized) ====================
  /** 대시보드 통계 (총 인구, 평균 면적 등) */
  const metrics = useMemo(() => getSummaryMetrics(countries), [countries])

  /** 현재 선택된 국가 (URL 직접 진입 시에도 현대/과거 모두 조회) */
  const selectedCountry = useMemo(() => {
    if (!selectedId) return undefined

    // 1. 현대 국가에서 찾기
    const modernCountry = unifiedCountries.find((c) => c.id === selectedId)
    if (modernCountry) return modernCountry

    // 2. 현대 국가 하위 역사적 국가에서 찾기
    for (const country of unifiedCountries) {
      if (country.type === 'modern' && country.historicalCountries) {
        const historical = country.historicalCountries.find(
          (h) => h.id === selectedId,
        )
        if (historical) return historicalToUnified(historical)
      }
    }

    // 3. API 전체 역사적 국가에서 찾기 (URL 직접 접근 시 미연결 과거 국가도 표시)
    const fromApi = (apiHistoricalCountries ?? []).find(
      (hc) => hc.id === selectedId,
    )
    if (fromApi) return historicalToUnified(fromApi as HistoricalCountry)

    return undefined
  }, [unifiedCountries, selectedId, apiHistoricalCountries])

  /**
   * 필터링 및 정렬된 국가 목록
   * - 검색어 필터 (이름, ISO 코드, 수도, 영문명)
   * - 대륙 필터 (현대 국가만 해당)
   * - 국가 타입 필터 (전체/현대/역사)
   * - 정렬 (이름/인구/면적)
   *
   * 역사적 국가: GET /historical-countries 전체를 사용해 표시 (연결 여부와 무관하게 DB에 있는 모든 역사적 국가 노출)
   */
  const filtered = useMemo(() => {
    const searchTextLower = query.trim().toLowerCase()

    // 'historical' 필터: API에서 조회한 전체 역사적 국가 사용 (연결된 것만이 아님)
    if (countryTypeFilter === 'historical') {
      const fromApi = (apiHistoricalCountries ?? []).map((hc) =>
        historicalToUnified(hc as HistoricalCountry),
      )
      // 현대 국가 하위에만 있는 항목 중 API 목록에 없는 것도 포함 (이중화 방지를 위해 Set으로 id 관리)
      const seenIds = new Set(fromApi.map((c) => c.id))
      unifiedCountries.forEach((country) => {
        if (country.type === 'modern' && country.historicalCountries) {
          country.historicalCountries.forEach((hc) => {
            if (!seenIds.has(hc.id)) {
              seenIds.add(hc.id)
              fromApi.push(historicalToUnified(hc))
            }
          })
        }
      })

      const result = fromApi.filter((country) => {
        const matchSearch =
          !searchTextLower ||
          country.name.toLowerCase().includes(searchTextLower) ||
          (country.enName || '').toLowerCase().includes(searchTextLower)
        return matchSearch
      })

      return result.sort((countryA, countryB) => {
        if (sortBy === 'name') {
          return countryA.name.localeCompare(countryB.name, 'ko')
        }
        return 0
      })
    }

    // 'all' 또는 'modern' 필터: 현대 국가만 표시 (하위에 역사 국가 포함)
    const result = unifiedCountries.filter((country) => {
      // 타입 필터 (modern만 표시)
      if (country.type !== 'modern') return false

      // 검색 필터
      const matchSearch =
        !searchTextLower ||
        country.name.toLowerCase().includes(searchTextLower) ||
        (country.isoCode || '').toLowerCase().includes(searchTextLower) ||
        (country.capital || '').toLowerCase().includes(searchTextLower)

      // 대륙 필터
      const matchContinent =
        !continentFilter || country.continentId === continentFilter

      return matchSearch && matchContinent
    })

    // 정렬
    return result.sort((countryA, countryB) => {
      if (sortBy === 'name') {
        return countryA.name.localeCompare(countryB.name, 'ko')
      } else if (sortBy === 'population') {
        return (
          (Number(countryB.population) || 0) -
          (Number(countryA.population) || 0)
        )
      } else if (sortBy === 'area') {
        return (countryB.areaSqKm || 0) - (countryA.areaSqKm || 0)
      }

      return 0
    })
  }, [
    unifiedCountries,
    apiHistoricalCountries,
    query,
    continentFilter,
    countryTypeFilter,
    sortBy,
  ])

  /** 탭별 카운트 (미사용 - 향후 확장용) */
  const countUnassigned = useMemo(
    () => countries.filter((countryItem) => !countryItem.isoCode).length,
    [countries],
  )
  const countAssigned = useMemo(
    () => countries.filter((countryItem) => !!countryItem.isoCode).length,
    [countries],
  )
  const countArchived = 0

  // ==================== Side Effects ====================
  /**
   * 페이지 배경 설정
   * - 흰색 배경으로 변경
   * - 글로벌 배경 이미지 숨김
   */
  useEffect(() => {
    document.body.style.backgroundColor = '#ffffff'
    const globalBg = document.getElementById('global-bg')
    if (globalBg) globalBg.style.display = 'none'

    return () => {
      document.body.style.backgroundColor = ''
      const gb = document.getElementById('global-bg')
      if (gb) gb.style.display = ''
    }
  }, [])

  /**
   * 국가 선택 시 로딩 효과
   * - 800ms 인위적 로딩 (애니메이션 효과)
   */
  useEffect(() => {
    if (selectedId) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [selectedId])

  /**
   * 뷰 모드 전환 이벤트 리스너
   * - 모바일 UI에서 발생한 커스텀 이벤트 처리
   */
  useEffect(() => {
    const handleViewModeSwitch = (e: Event) => {
      const customEvent = e as CustomEvent
      const mode = customEvent.detail as 'dashboard' | 'list'
      setActiveTab(mode)

      if (mode === 'list') {
        setIsMobileListOpen(true)
      } else {
        setIsMobileListOpen(false)
        handleClearCountry()
      }
    }

    window.addEventListener('switchViewMode', handleViewModeSwitch)

    return () => {
      window.removeEventListener('switchViewMode', handleViewModeSwitch)
    }
  }, [])

  // ==================== 이벤트 핸들러 ====================
  /** 국가 선택 시 해당 국가 고유 URL로 이동 */
  const handleSelectCountry = useCallback(
    (id: string) => {
      navigate(pathKeys.history.countryDetail(id))
    },
    [navigate],
  )

  /** 상세 닫기 시 URL에서 countryId 제거 */
  const handleClearCountry = useCallback(() => {
    navigate(pathKeys.history.country())
  }, [navigate])

  /**
   * 현대 국가 삭제
   * - 사용자 확인 후 삭제
   * - Toast 알림
   */
  async function handleDelete(id: string) {
    const country = countries.find((item) => item.id === id)
    if (!country) return

    if (window.confirm(`"${country.name}"을(를) 삭제하시겠습니까?`)) {
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
   * 현대 국가 저장 (생성/수정)
   * - id 유무로 생성/수정 구분
   * - BigInt 변환 처리
   * - Toast 알림
   */
  async function handleSave(data: Omit<Country, 'id'> & { id?: string }) {
    const loadingToast = toast.loading(
      data.id ? '수정하는 중...' : '등록하는 중...',
    )

    try {
      if (data.id) {
        // 수정
        await updateMutation.mutateAsync({
          id: data.id,
          data: {
            name: data.name,
            localName: data.localName,
            isoCode: data.isoCode,
            flagEmoji: data.flagEmoji,
            capital: data.capital,
            population: data.population ? String(data.population) : undefined,
            areaSqKm: data.areaSqKm ? Number(data.areaSqKm) : undefined,
            thumbnailUrl: data.thumbnailUrl,
            currencyId: data.currencyId,
            languageId: data.languageId,
            continentId: data.continentId,
          },
        })
        toast.success('수정되었습니다', { id: loadingToast })
      } else {
        // 생성
        await createMutation.mutateAsync({
          name: data.name,
          localName: data.localName,
          isoCode: data.isoCode,
          flagEmoji: data.flagEmoji,
          capital: data.capital,
          population: data.population ? String(data.population) : undefined,
          areaSqKm: data.areaSqKm ? Number(data.areaSqKm) : undefined,
          thumbnailUrl: data.thumbnailUrl,
          currencyId: data.currencyId,
          languageId: data.languageId,
          continentId: data.continentId,
        })
        toast.success('등록되었습니다', { id: loadingToast })
      }

      // 상태 초기화
      setEditing(null)
      setThumbnailPreview('')
      setFlagImageFile(null)
      setThumbnailFile(null)
    } catch (error) {
      toast.error(
        (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
        { id: loadingToast },
      )
    }
  }

  /**
   * React Hook Form 제출 핸들러
   * - 폼 데이터를 handleSave 형식으로 변환
   */
  const onSubmit = (data: CountryFormData) => {
    handleSave({
      id: editing?.id || undefined,
      name: data.name,
      localName: data.localName || undefined,
      isoCode: data.isoCode || undefined,
      flagEmoji: data.flagEmoji || undefined,
      flagImageUrl: data.flagImageUrl || undefined,
      capital: data.capital || undefined,
      population: data.population || undefined,
      areaSqKm: data.areaSqKm || undefined,
      thumbnailUrl: data.thumbnailUrl || undefined,
      currencyId: data.currencyId || undefined,
      languageId: data.languageId || undefined,
      continentId: data.continentId || undefined,
      gdpUsdBn: data.gdpUsdBn || undefined,
    })
  }

  /**
   * 역사적 국가 삭제
   * - 사용자 확인 후 삭제
   * - Toast 알림
   */
  async function handleDeleteHistorical(id: string) {
    if (confirm('정말 삭제하시겠습니까?')) {
      const loadingToast = toast.loading('삭제하는 중...')

      try {
        await deleteHistoricalMutation.mutateAsync(id)
        handleClearCountry()
        toast.success('삭제되었습니다', { id: loadingToast })
      } catch (err) {
        toast.error('삭제 실패: ' + (err as Error).message, {
          id: loadingToast,
        })
      }
    }
  }

  /**
   * 역사적 국가 저장 (생성/수정)
   * - id 유무로 생성/수정 구분
   * - null/undefined 변환 처리
   * - Toast 알림
   */
  async function handleSaveHistorical(
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
    },
  ) {
    const loadingToast = toast.loading(
      data.id ? '수정하는 중...' : '등록하는 중...',
    )

    try {
      if (data.id) {
        // 수정
        await updateHistoricalMutation.mutateAsync({
          id: data.id,
          data: {
            name: data.name,
            enName: data.enName,
            description: data.description || null,
            thumbnailUrl: data.thumbnailUrl || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            stateType: data.stateType,
            parentModernCountryIds: data.parentModernCountryIds,
          },
        })
        toast.success('수정되었습니다', { id: loadingToast })
      } else {
        // 생성
        await createHistoricalMutation.mutateAsync({
          name: data.name,
          enName: data.enName,
          description: data.description || undefined,
          thumbnailUrl: data.thumbnailUrl || undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          stateType: data.stateType,
          parentModernCountryIds: data.parentModernCountryIds,
        })
        toast.success('등록되었습니다', { id: loadingToast })
      }

      setEditingHistorical(null)
    } catch (error) {
      toast.error(
        (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
        { id: loadingToast },
      )
    }
  }

  // ==================== 이미지 업로드 핸들러 ====================
  const thumbnailUrl = watch('thumbnailUrl')

  /**
   * 썸네일 URL 변경 감지
   * - URL 필드 값이 변경되면 미리보기 업데이트
   */
  useEffect(() => {
    if (thumbnailUrl) {
      setThumbnailPreview(thumbnailUrl)
    } else {
      setThumbnailPreview('')
    }
  }, [thumbnailUrl])

  /**
   * 국기 이미지 파일 업로드
   * - FileReader로 Base64 변환
   * - 미리보기 및 폼 값 업데이트
   */
  const handleFlagImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFlagImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setValue('flagImageUrl', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * 썸네일 이미지 파일 업로드
   * - FileReader로 Base64 변환
   * - 미리보기 및 폼 값 업데이트
   */
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
        setValue('thumbnailUrl', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // ==================== Render ====================

  return (
    <S.Wrap
      $inHistory={inHistory}
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {!inHistory && (
        <S.PageHeader>
          <S.HeaderContent>
            <S.PageHeaderLeft>
              <S.PageHeaderIcon>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z"
                    fill="currentColor"
                  />
                </svg>
              </S.PageHeaderIcon>
              <S.PageHeaderTitleGroup>
                <S.PageHeaderTitle>국가 관리</S.PageHeaderTitle>
                <S.PageHeaderSubtitle>
                  전 세계 {countries.length}개 국가의 역사와 정보를 탐색하세요
                </S.PageHeaderSubtitle>
              </S.PageHeaderTitleGroup>
            </S.PageHeaderLeft>
            <S.PageHeaderRight>
              <S.HeaderStat>
                <S.HeaderStatLabel>총 인구</S.HeaderStatLabel>
                <S.HeaderStatValue>
                  {(metrics.totalPopulation / 1_000_000_000).toFixed(2)}B
                </S.HeaderStatValue>
              </S.HeaderStat>
              <S.HeaderStat>
                <S.HeaderStatLabel>평균 면적</S.HeaderStatLabel>
                <S.HeaderStatValue>
                  {metrics.avgArea.toLocaleString()}km²
                </S.HeaderStatValue>
              </S.HeaderStat>
            </S.PageHeaderRight>
          </S.HeaderContent>
        </S.PageHeader>
      )}
      <CountryMobileUI
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab === 'dashboard') {
            handleClearCountry()
          }
        }}
        isMobileListOpen={isMobileListOpen}
        onMobileListOpenChange={setIsMobileListOpen}
        countries={countries}
        filtered={filtered}
        continents={CONTINENTS}
        selectedId={selectedId}
        onSelectCountry={handleSelectCountry}
        query={query}
        onQueryChange={setQuery}
        continentFilter={continentFilter}
        onContinentFilterChange={setContinentFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onShowContinentModal={() => setShowContinentModal(true)}
        onShowSortModal={() => setShowSortModal(true)}
        onAddCountry={() => setEditing({} as Country)}
        inHistory={inHistory}
      />

      <S.MainGrid $noSidebar={inHistory}>
        <CountryList
          countries={countries}
          filtered={filtered}
          continents={CONTINENTS}
          selectedId={selectedId}
          onSelect={handleSelectCountry}
          query={query}
          onQueryChange={setQuery}
          continentFilter={continentFilter}
          onContinentFilterChange={setContinentFilter}
          countryTypeFilter={countryTypeFilter}
          onCountryTypeFilterChange={setCountryTypeFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          showContinentModal={showContinentModal}
          setShowContinentModal={setShowContinentModal}
          showSortModal={showSortModal}
          setShowSortModal={setShowSortModal}
          showCountryTypeModal={showCountryTypeModal}
          setShowCountryTypeModal={setShowCountryTypeModal}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            handleClearCountry()
          }}
          onAdd={() => setEditing({} as Country)}
          onAddHistorical={() => setEditingHistorical({} as HistoricalCountry)}
          onEditHistorical={(country) => {
            // UnifiedCountry를 HistoricalCountry로 변환
            const historical = apiHistoricalCountries?.find(
              (hc) => hc.id === country.id,
            )
            if (historical) {
              setEditingHistorical(historical)
            }
          }}
          inHistory={inHistory}
        />

        <S.DetailPane>
          {activeTab === 'dashboard' ? (
            <CountryDashboard
              countries={countries}
              filtered={filtered}
              continents={CONTINENTS}
              isLoading={isLoading}
              onCountryEdit={setEditing}
            />
          ) : selectedId ? (
            <CountryDetail
              country={selectedCountry || null}
              continents={CONTINENTS}
              isLoading={isLoading}
              onEdit={setEditing}
              onDelete={handleDelete}
              initialDetailTab={isHeadsOfStateUrl ? 'heads' : undefined}
              onDetailTabChange={(tab: 'heads' | null) => {
                if (!selectedId) return
                if (tab === 'heads') {
                  navigate(pathKeys.history.countryHeadsOfState(selectedId))
                } else {
                  navigate(pathKeys.history.countryDetail(selectedId))
                }
              }}
            />
          ) : (
            <CountryDetail
              country={null}
              continents={CONTINENTS}
              isLoading={isLoading}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          )}
        </S.DetailPane>
      </S.MainGrid>

      <CountryForm
        editing={editing}
        continents={CONTINENTS}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      {/* 대륙 선택 모달 */}
      {showContinentModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowContinentModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>대륙 선택</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowContinentModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption
                    $active={!continentFilter}
                    onClick={() => {
                      setContinentFilter('')
                      setShowContinentModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>전체 대륙</S.SelectOptionText>
                    {!continentFilter && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  {CONTINENTS.map((continent) => (
                    <S.SelectOption
                      key={continent.id}
                      $active={continentFilter === continent.id}
                      onClick={() => {
                        setContinentFilter(continent.id)
                        setShowContinentModal(false)
                      }}
                    >
                      <S.SelectOptionIcon>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionIcon>
                      <S.SelectOptionText>{continent.name}</S.SelectOptionText>
                      {continentFilter === continent.id && (
                        <S.SelectOptionCheck>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                              fill="currentColor"
                            />
                          </svg>
                        </S.SelectOptionCheck>
                      )}
                    </S.SelectOption>
                  ))}
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* 정렬 선택 모달 */}
      {showSortModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowSortModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>정렬 기준</S.SelectModalTitle>
                  <S.SelectModalClose onClick={() => setShowSortModal(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption
                    $active={sortBy === 'name'}
                    onClick={() => {
                      setSortBy('name')
                      setShowSortModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path d="M14 7l-5 5 5 5V7z" fill="currentColor" />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>이름순</S.SelectOptionText>
                    {sortBy === 'name' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={sortBy === 'population'}
                    onClick={() => {
                      setSortBy('population')
                      setShowSortModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>인구순</S.SelectOptionText>
                    {sortBy === 'population' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={sortBy === 'area'}
                    onClick={() => {
                      setSortBy('area')
                      setShowSortModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>면적순</S.SelectOptionText>
                    {sortBy === 'area' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* 국가 타입 선택 모달 */}
      {showCountryTypeModal
        ? createPortal(
            <>
              <S.SelectModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowCountryTypeModal(false)}
              />
              <S.SelectModal
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <S.SelectModalHeader>
                  <S.SelectModalTitle>국가 타입</S.SelectModalTitle>
                  <S.SelectModalClose
                    onClick={() => setShowCountryTypeModal(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectModalClose>
                </S.SelectModalHeader>
                <S.SelectModalContent>
                  <S.SelectOption
                    $active={countryTypeFilter === 'all'}
                    onClick={() => {
                      setCountryTypeFilter('all')
                      setShowCountryTypeModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>
                      {COUNTRY_TYPE_LABELS.all}
                    </S.SelectOptionText>
                    {countryTypeFilter === 'all' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={countryTypeFilter === 'modern'}
                    onClick={() => {
                      setCountryTypeFilter('modern')
                      setShowCountryTypeModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>
                      {COUNTRY_TYPE_LABELS.modern}
                    </S.SelectOptionText>
                    {countryTypeFilter === 'modern' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                  <S.SelectOption
                    $active={countryTypeFilter === 'historical'}
                    onClick={() => {
                      setCountryTypeFilter('historical')
                      setShowCountryTypeModal(false)
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>
                      {COUNTRY_TYPE_LABELS.historical}
                    </S.SelectOptionText>
                    {countryTypeFilter === 'historical' && (
                      <S.SelectOptionCheck>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                </S.SelectModalContent>
              </S.SelectModal>
            </>,
            document.body,
          )
        : null}

      {/* 역사적 국가 Form */}
      <HistoricalCountryForm
        editing={editingHistorical}
        modernCountries={countries.map((countryItem) => ({
          id: countryItem.id,
          name: countryItem.name,
        }))}
        onClose={() => setEditingHistorical(null)}
        onSave={handleSaveHistorical}
      />
    </S.Wrap>
  )
}
