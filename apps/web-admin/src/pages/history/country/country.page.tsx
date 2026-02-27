import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'

import { type ContinentOption, type Country } from '@/entities/country/api'
import { getSummaryMetrics } from '@/entities/country/lib/utils'
import { countrySchema } from '@/entities/country/model/schema'
import {
  type CountryFormData,
  type CountryTypeFilter,
  type UnifiedCountry,
  historicalToUnified,
  modernToUnified,
} from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { usePersons } from '@/entities/person/api'
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
  useHistoricalCountry,
  useUpdateHistoricalCountry,
} from '@/features/historical-country'
import { getAllEvents } from '@/shared/api/events'
import { CountryDashboard } from '@/widgets/country/country-dashboard'
import { CountryDetail } from '@/widgets/country/country-detail'
import { CountryForm } from '@/widgets/country/country-form'
import { CountryListModals } from '@/widgets/country/country-list/country-list-modals'
import { CountryListStateProvider } from '@/widgets/country/country-list/country-list-state.context'
import {
  CountryList,
  type DashboardContentView,
} from '@/widgets/country/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui'
import { HistoricalCountryForm } from '@/widgets/historical-country/historical-country-form'
import { zodResolver } from '@hookform/resolvers/zod'

import * as S from './country.styles'

/** 대시보드 메뉴 선택 시 오른쪽 컨텐츠 (통계 제외) */
function DashboardMenuContent({
  view,
  onNavigateFullPage,
}: {
  view: Exclude<DashboardContentView, 'stats'>
  onNavigateFullPage: (path: string) => void
}) {
  const configs: Record<
    Exclude<DashboardContentView, 'stats'>,
    { title: string; desc: string; fullPath?: string; fullLabel?: string }
  > = {
    heads: {
      title: '행정 수반',
      desc: '좌측에서 국가를 선택한 뒤 해당 국가의 역대 수반 탭에서 확인할 수 있습니다.',
    },
    legislature: {
      title: '저원 (입법 기관)',
      desc: '조직·입법 기관 정보를 관리합니다.',
      fullPath: '/organizations/',
      fullLabel: '전체 보기',
    },
    military: {
      title: '군사',
      desc: '군부대 정보를 관리합니다.',
      fullPath: '/military-units/',
      fullLabel: '전체 보기',
    },
    administration: {
      title: '행정부',
      desc: '국가 상세 > 행정조직 > 중앙부처 탭에서 해당 국가의 중앙부처를 등록·관리합니다.',
      fullPath: '',
      fullLabel: '',
    },
  }
  const { title, desc, fullPath, fullLabel } = configs[view]
  return (
    <S.DashboardMenuContentPanel>
      <S.DashboardMenuContentTitle>{title}</S.DashboardMenuContentTitle>
      <S.DashboardMenuContentDesc>{desc}</S.DashboardMenuContentDesc>
      {fullPath && fullLabel && (
        <S.DashboardMenuContentButton
          type="button"
          onClick={() => onNavigateFullPage(fullPath)}
        >
          {fullLabel}
        </S.DashboardMenuContentButton>
      )}
    </S.DashboardMenuContentPanel>
  )
}

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
  // 등록 현황 게시판용
  const { data: apiPersons } = usePersons()

  /** 등록 현황: 일주일(7일) 내, 디자인용 primaryLabel + countryName (문장형 텍스트 없음) */
  const registrationFeed = useMemo(() => {
    type Item = {
      date: string
      type: 'country' | 'person'
      primaryLabel: string
      countryName?: string | null
      profileImageUrl?: string | null
    }
    const items: Item[] = []
    const now = Date.now()
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    const rawCountries = apiCountries ?? []
    const rawPersons = apiPersons ?? []
    const countriesList = apiCountries ?? []

    rawCountries.forEach((c: { name?: string; createdAt?: string }) => {
      const date = c.createdAt
      if (!date || now - new Date(date).getTime() > oneWeekMs) return
      items.push({
        date,
        type: 'country',
        primaryLabel: c.name || '국가',
      })
    })
    rawPersons.forEach(
      (p: {
        name?: string | null
        surname?: string | null
        createdAt?: string
        profileImageUrl?: string | null
        country?: { name?: string } | null
        countryId?: string | null
      }) => {
        const date = p.createdAt
        if (!date || now - new Date(date).getTime() > oneWeekMs) return
        const displayName =
          [p.surname, p.name].filter(Boolean).join(' ') || p.name || p.surname || '이름 없음'
        const countryName =
          p.country?.name ??
          (p.countryId
            ? (countriesList as { id?: string; name?: string }[]).find(
                (c) => c.id === p.countryId,
              )?.name
            : undefined)
        items.push({
          date,
          type: 'person',
          primaryLabel: displayName,
          countryName: countryName ?? undefined,
          profileImageUrl: p.profileImageUrl,
        })
      },
    )
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items.slice(0, 50)
  }, [apiCountries, apiPersons])

  /** 사건(events) 일주일 내 데이터만 조회 (createdSinceDays로 API에서 필터) */
  useEffect(() => {
    getAllEvents({ limit: 100, createdSinceDays: 7 })
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data ?? []
        type Evt = {
          id: string
          title?: string
          createdAt?: string
          startDate?: string | null
          endDate?: string | null
          relatedCountries?: { name?: string }[]
          relatedHistoricalCountries?: { name?: string }[]
        }
        const withDate = (list as Evt[]).map((evt) => {
          const countryNames = [
            ...(evt.relatedCountries ?? []).map((c) => c.name).filter(Boolean),
            ...(evt.relatedHistoricalCountries ?? []).map((c) => c.name).filter(Boolean),
          ] as string[]
          return {
            id: evt.id,
            title: evt.title || '제목 없음',
            _date: evt.createdAt || evt.startDate,
            countryNames,
            startDate: evt.startDate ?? null,
            endDate: evt.endDate ?? null,
          }
        })
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const filtered = withDate
          .filter((e) => e._date && new Date(e._date).getTime() >= oneWeekAgo)
          .sort((a, b) => new Date(b._date!).getTime() - new Date(a._date!).getTime())
          .slice(0, 25)
          .map((e) => ({
            id: e.id,
            title: e.title,
            date: e._date!,
            countryNames: e.countryNames ?? [],
            startDate: e.startDate ?? undefined,
            endDate: e.endDate ?? undefined,
          }))
        setRecentEvents(filtered)
      })
      .catch(() => setRecentEvents([]))
  }, [])

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
  // 모달만 페이지에 둠 (목록 검색/필터는 Context에서 관리 → 입력 시 페이지 리렌더 없음)
  const [showContinentModal, setShowContinentModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [showCountryTypeModal, setShowCountryTypeModal] = useState(false)

  // 편집 상태
  const [editing, setEditing] = useState<Country | null>(null)
  const [editingHistorical, setEditingHistorical] =
    useState<HistoricalCountry | null>(null)
  /** 수정 시 상세 API로 상위 현대 국가(parentModernCountryIds) 포함해 조회 */
  const { data: editingHistoricalDetail } = useHistoricalCountry(
    editingHistorical?.id,
  )

  // UI 상태 (선택된 국가 ID — URL과 동기화, 직접 진입 시에도 URL 기준으로 초기화)
  const [selectedId, setSelectedId] = useState<string | null>(
    () => countryIdFromUrl || null,
  )

  // URL이 바뀌면 선택 상태 동기화 (다른 국가 클릭, 뒤로가기, 직접 URL 입력 등)
  useEffect(() => {
    setSelectedId(countryIdFromUrl || null)
  }, [countryIdFromUrl])

  /** 상세 전환 시 별도 로딩 없음(데이터 이미 있음) */
  const isLoading = false
  // URL에 countryId가 있으면 목록 탭으로 열기 (직접 진입 시 상세 패널이 보이도록)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>(() =>
    countryIdFromUrl ? 'list' : 'dashboard',
  )
  const [dashboardContentView, setDashboardContentView] =
    useState<DashboardContentView>('stats')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [recentEvents, setRecentEvents] = useState<
    {
      id: string
      title: string
      date: string
      countryNames: string[]
      startDate?: string | null
      endDate?: string | null
    }[]
  >([])
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

  // 국가 선택 시 별도 API 호출 없음(이미 메모리에 있음) → 로딩 표시 없이 즉시 전환

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

  /** 목록 탭 전환 (대시보드/국가 목록) */
  const handleTabChange = useCallback(
    (tab: 'dashboard' | 'list') => {
      setActiveTab(tab)
      if (tab === 'dashboard') handleClearCountry()
    },
    [handleClearCountry],
  )

  /** 역사적 국가 수정 클릭 시 폼에 전달할 데이터 설정 */
  const handleEditHistoricalFromList = useCallback(
    (country: UnifiedCountry) => {
      const historical = apiHistoricalCountries?.find((hc) => hc.id === country.id)
      if (historical) setEditingHistorical(historical as HistoricalCountry)
    },
    [apiHistoricalCountries],
  )

  /** 상세 패널 내 탭 변경 시 URL 연동 (역대 수반 등) */
  const handleDetailTabChange = useCallback(
    (tab: 'heads' | null) => {
      if (!selectedId) return
      if (tab === 'heads') navigate(pathKeys.history.countryHeadsOfState(selectedId))
      else navigate(pathKeys.history.countryDetail(selectedId))
    },
    [navigate, selectedId],
  )

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
            thumbnailUrl: data.thumbnailUrl ?? '',
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
  /** 연대표 상세 패널에서 "수정" 클릭 시: 역사적 국가면 역사적 폼, 현대 국가면 현대 폼 열기 */
  function handleEditFromDetail(country: UnifiedCountry) {
    if (country.type === 'historical') {
      const full =
        apiHistoricalCountries?.find((hc) => hc.id === country.id) ?? null
      if (full) setEditingHistorical(full as HistoricalCountry)
    } else {
      setEditing(country as Country)
    }
  }

  /** 연대표 상세 패널에서 "삭제" 클릭 시: 선택이 역사적 국가면 역사적 삭제, 아니면 현대 삭제 */
  function handleDeleteFromDetail(id: string) {
    if (selectedCountry?.type === 'historical') {
      void handleDeleteHistorical(id)
    } else {
      void handleDelete(id)
    }
  }

  async function handleSaveHistorical(
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: string
      transitionEventDate?: string
    },
  ) {
    const loadingToast = toast.loading(
      data.id ? '수정하는 중...' : '등록하는 중...',
    )

    try {
      if (data.id) {
        // 수정 (API는 startDate/endDate 미지원, startEra/startYear 등만 사용)
        await updateHistoricalMutation.mutateAsync({
          id: data.id,
          data: {
            name: data.name,
            enName: data.enName,
            description: data.description ?? null,
            thumbnailUrl: data.thumbnailUrl ?? null,
            startEra: data.startEra ?? null,
            startYear: data.startYear ?? null,
            startMonth: data.startMonth ?? null,
            startDay: data.startDay ?? null,
            endEra: data.endEra ?? null,
            endYear: data.endYear ?? null,
            endMonth: data.endMonth ?? null,
            endDay: data.endDay ?? null,
            stateType: data.stateType,
            parentModernCountryIds: data.parentModernCountryIds,
            parentHistoricalCountryIds: data.parentHistoricalCountryIds,
            transitionEventType: data.transitionEventType,
            transitionEventDate: data.transitionEventDate,
          },
        })
        toast.success('수정되었습니다', { id: loadingToast })
      } else {
        // 생성
        await createHistoricalMutation.mutateAsync({
          name: data.name,
          enName: data.enName,
          description: data.description ?? undefined,
          thumbnailUrl: data.thumbnailUrl ?? undefined,
          startEra: data.startEra ?? undefined,
          startYear: data.startYear ?? undefined,
          startMonth: data.startMonth ?? undefined,
          startDay: data.startDay ?? undefined,
          endEra: data.endEra ?? undefined,
          endYear: data.endYear ?? undefined,
          endMonth: data.endMonth ?? undefined,
          endDay: data.endDay ?? undefined,
          stateType: data.stateType,
          parentModernCountryIds: data.parentModernCountryIds,
          parentHistoricalCountryIds: data.parentHistoricalCountryIds,
          transitionEventType: data.transitionEventType,
          transitionEventDate: data.transitionEventDate,
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
        setValue('thumbnailUrl', reader.result as string)
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
      <CountryListStateProvider
        unifiedCountries={unifiedCountries}
        apiHistoricalCountries={apiHistoricalCountries}
        countries={countries}
        continents={CONTINENTS}
      >
        <CountryMobileUI
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            if (tab === 'dashboard') handleClearCountry()
          }}
          isMobileListOpen={isMobileListOpen}
          onMobileListOpenChange={setIsMobileListOpen}
          selectedId={selectedId}
          onSelectCountry={handleSelectCountry}
          onShowContinentModal={() => setShowContinentModal(true)}
          onShowSortModal={() => setShowSortModal(true)}
          onAddCountry={() => setEditing({} as Country)}
          inHistory={inHistory}
        />

        <S.MainGrid $noSidebar={inHistory}>
          <CountryList
            selectedId={selectedId}
            onSelect={handleSelectCountry}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAdd={() => setEditing({} as Country)}
            onAddHistorical={() => setEditingHistorical({} as HistoricalCountry)}
            onEditHistorical={handleEditHistoricalFromList}
            inHistory={inHistory}
            showContinentModal={showContinentModal}
            setShowContinentModal={setShowContinentModal}
            showSortModal={showSortModal}
            setShowSortModal={setShowSortModal}
            showCountryTypeModal={showCountryTypeModal}
            setShowCountryTypeModal={setShowCountryTypeModal}
            dashboardContentView={dashboardContentView}
            onDashboardMenuSelect={setDashboardContentView}
          />

          <S.DetailPane>
            <AnimatePresence initial={false}>
              {activeTab === 'dashboard' ? (
                <motion.div
                  key={dashboardContentView}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ width: '100%', minHeight: '100%' }}
                >
                  {dashboardContentView === 'stats' ? (
                    <CountryDashboard
                      isLoading={isLoading}
                      onCountryEdit={setEditing}
                      registrationFeed={registrationFeed}
                      recentEvents={recentEvents}
                    />
                  ) : (
                    <DashboardMenuContent
                      view={dashboardContentView}
                      onNavigateFullPage={navigate}
                    />
                  )}
                </motion.div>
              ) : selectedId ? (
                <motion.div
                  key={`detail-${selectedId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ width: '100%', minHeight: '100%' }}
                >
                  <CountryDetail
                    country={selectedCountry || null}
                    continents={CONTINENTS}
                    isLoading={isLoading}
                    onEdit={handleEditFromDetail}
                    onDelete={handleDeleteFromDetail}
                    initialDetailTab={isHeadsOfStateUrl ? 'heads' : undefined}
                    onDetailTabChange={handleDetailTabChange}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="list-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ width: '100%', minHeight: '100%' }}
                >
                  <CountryDetail
                    country={null}
                    continents={CONTINENTS}
                    isLoading={isLoading}
                    onEdit={handleEditFromDetail}
                    onDelete={handleDeleteFromDetail}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </S.DetailPane>
        </S.MainGrid>

        <CountryListModals
          showContinentModal={showContinentModal}
          setShowContinentModal={setShowContinentModal}
          showSortModal={showSortModal}
          setShowSortModal={setShowSortModal}
          showCountryTypeModal={showCountryTypeModal}
          setShowCountryTypeModal={setShowCountryTypeModal}
        />
      </CountryListStateProvider>

      <CountryForm
        editing={editing}
        continents={CONTINENTS}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      {/* 역사적 국가 Form (수정 시 상세 조회 데이터로 상위 현대/역사적 국가 표시) */}
      <HistoricalCountryForm
        editing={
          editingHistorical
            ? (editingHistoricalDetail ?? editingHistorical)
            : null
        }
        modernCountries={countries.map((countryItem) => ({
          id: countryItem.id,
          name: countryItem.name,
        }))}
        historicalCountries={(apiHistoricalCountries ?? [])
          .filter((hc) => hc.id !== editingHistorical?.id)
          .map((hc) => ({ id: hc.id, name: hc.name }))}
        onClose={() => setEditingHistorical(null)}
        onSave={handleSaveHistorical}
      />
    </S.Wrap>
  )
}
