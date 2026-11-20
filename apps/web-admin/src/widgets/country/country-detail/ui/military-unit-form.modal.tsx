/**
 * 군사 사령부·부대 등록/수정 모달 — **사건 등록 모달(`widgets/event-form/ui/event-register-modal`)과
 * 같은 문법**으로 짠다. 국가 상세 군사 탭·군사 카탈로그·부대 상세가 같은 인스턴스를 쓴다.
 *
 * 사건 모달에서 그대로 가져온 것:
 * - 셸: `RegisterModal` 폭 2단 `min(1440px, 96vw)` / 1단 `min(1040px, 96vw)`, 높이 90vh, 모바일 전면
 * - 헤더: 섹션 이동 알약(완료 ✓ · 입력 개수 배지) + 2단/1단 전환 + 작성 중일 때만 '초기화'
 * - 본문: 2단이면 좌(기본 · 시기) / 우(소속 · 지휘)가 각자 스크롤, 1단이면 세 섹션을 위에서 아래로
 * - 섹션 머리: 점(•) + 구분선 + 오른쪽 요약 배지 — 점·배지 색은 고른 군종 색을 따른다
 *   (사건 폼이 고른 분야 색을 따르는 것과 같은 자리)
 * - 푸터: 빠진 필수 칸으로 **이동하는** 버튼 / 준비 완료 + 단축키(⌘↵ 저장 · ⇧⌘↵ 등록 후 계속)
 * - 등록 완료 3지 분기(상세 보기 · 계속 등록 · 닫기)
 *
 * 역대 지휘관 임명·전신/후신 개편 계보는 저장 뒤 부대 상세(`MilitaryUnitDetailContent`)에서 다룬다.
 * 상위 부대·유사 부대 조회는 선택 국가 스코프의 경량 요약(`summary=1`) API만 쓴다.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiColumns, FiImage, FiInfo, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  fetchCountryScopedMilitaryUnits,
  militaryUnitQueryKeys,
} from '@/entities/military-unit'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import * as S from '@/pages/events/create/event-create.styles'
import {
  type AdministrationDepartment,
  administrationDepartmentApi,
} from '@/shared/api/administration-department'
import {
  type CountryResponseDto,
  getAllCountries,
} from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import {
  type CreateMilitaryUnitInput,
  type MilitaryUnit,
  militaryUnitApi,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import {
  getUploadImageUrl,
  toUploadStoragePath,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import {
  describeLifespanMismatch,
  formatCountryPeriod,
} from '@/shared/lib/country-period'
import {
  type CountryHintYearRange,
  filterCountriesByQuery,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { isDefenseRelatedCategory } from '@/shared/lib/ministry-department/ministry-department-utils'
import { pathKeys } from '@/shared/router'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm, ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  type PlaceResult,
  PlaceSelect,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  KitChipGroup,
  KitChoiceChip,
  KitFormLoading,
  KitGroupLabel,
  KitRemoveButton,
  KitUploadActions,
  KitUploadFilled,
  KitUploadRemove,
  KitUploadStrip,
  KitUploadText,
  KitUploadThumb,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterActions,
  FooterHint,
  FooterJumpArrow,
  FooterJumpButton,
  FooterKbd,
  FooterMissingCount,
  FooterReadyBadge,
  FooterReadyGroup,
  FooterShortcutItem,
  HeaderActionsBar,
  HeaderResetBtn,
  SectionJumpBtn,
  SectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { notify } from '@/shared/ui/toast'

import {
  collectDescendantUnitIds,
  CREATE_LEAVE_MESSAGE,
  EDIT_LEAVE_MESSAGE,
  FORM_SECTION_META,
  type FormSectionKey,
  HIGH_COMMAND_PRESETS,
  hydrateStructuredParts,
  inferMilitaryUnitMetaFromName,
  LAYOUT_STORAGE_KEY,
  MILITARY_BRANCHES,
  parseIsoPartsFallback,
  readInitialLayoutMode,
  RESET_CONFIRM_MESSAGE,
  toCalendarInitialIso,
  toSignedComparableYear,
  UNIT_TYPE_GROUPS,
  UNIT_TYPES,
} from './military-unit-form/constants'
import * as FormS from './military-unit-form/styles'

const SPLIT_LEFT_ID = 'military-unit-split-left'
const SPLIT_RIGHT_ID = 'military-unit-split-right'
const NAME_INPUT_ID = 'military-unit-form-name'
const COUNTRY_SEARCH_ID = 'military-unit-form-country-search'

const sectionIdOf = (sectionKey: FormSectionKey) =>
  FORM_SECTION_META.find((item) => item.key === sectionKey)?.id ?? ''

/** 분할 칸이 실제로 나란히 서 있는가 — 1180px 미만이면 2단을 켜도 한 줄로 쌓인다 */
const isSplitActiveViewport = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.(`(min-width: ${FormS.SPLIT_MIN_WIDTH}px)`).matches === true

export type MilitaryUnitFormModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
  defaultCountryId?: string | null
  defaultHistoricalCountryId?: string | null
  defaultAdministrationDepartmentId?: string | null
  defaultParentUnitId?: string | null
  defaultBranch?: string | null
  editingUnitId?: string | null
  lockCountryAndDepartment?: boolean
}

export const MilitaryUnitFormModal: React.FC<MilitaryUnitFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  defaultCountryId = null,
  defaultHistoricalCountryId = null,
  defaultAdministrationDepartmentId = null,
  defaultParentUnitId = null,
  defaultBranch = null,
  editingUnitId = null,
  lockCountryAndDepartment = false,
}) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const playClickSound = useClickSound()
  const theme = useTheme()
  const isDarkMode = theme.mode === 'dark'
  const isEdit = Boolean(editingUnitId)

  const estCalendarAnchorId = useId()
  const disbCalendarAnchorId = useId()

  const [loading, setLoading] = useState(false)
  const [hydratingUnit, setHydratingUnit] = useState(false)
  const [insigniaUploading, setInsigniaUploading] = useState(false)
  const [insigniaDragOver, setInsigniaDragOver] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSectionKey>('basic')
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(
    readInitialLayoutMode,
  )
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty
  /** 등록 직후 3지 분기 다이얼로그 대상 */
  const [savedUnit, setSavedUnit] = useState<{ id: string; name: string } | null>(
    null,
  )

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [scopedUnits, setScopedUnits] = useState<MilitaryUnit[]>([])
  const [adminDepartments, setAdminDepartments] = useState<
    AdministrationDepartment[]
  >([])

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const insigniaInputRef = useRef<HTMLInputElement>(null)

  // 자식 모달
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [disbandedDateModalOpen, setDisbandedDateModalOpen] = useState(false)

  // 선택 입력 묶음 — 각 섹션 끝의 '+ …' 줄에서 연다
  const [showHighCommandPresets, setShowHighCommandPresets] = useState(false)
  const [showForeignAndMottoFields, setShowForeignAndMottoFields] =
    useState(false)
  const [showDetailedSpecs, setShowDetailedSpecs] = useState(false)
  const [showAllUnitTypes, setShowAllUnitTypes] = useState(false)

  // 빠른 검색 입력
  const [countryQuickQuery, setCountryQuickQuery] = useState('')
  const [countryQuickFocused, setCountryQuickFocused] = useState(false)
  const [parentUnitQuickQuery, setParentUnitQuickQuery] = useState('')
  const [parentUnitQuickFocused, setParentUnitQuickFocused] = useState(false)
  const [adminDeptQuickQuery, setAdminDeptQuickQuery] = useState('')
  const [adminDeptQuickFocused, setAdminDeptQuickFocused] = useState(false)

  // 1. 기본 정보
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [nameLocal, setNameLocal] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [unitType, setUnitType] = useState<MilitaryUnitType | ''>('')
  const [branch, setBranch] = useState('')
  const [nickname, setNickname] = useState('')
  const [motto, setMotto] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 2. 소속 · 지휘 계통
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const [parentUnitId, setParentUnitId] = useState('')
  const [administrationDepartmentId, setAdministrationDepartmentId] =
    useState('')

  // 3. 시기 · 소재지 · 설명
  const [establishedEra, setEstablishedEra] = useState<'AD' | 'BC'>('AD')
  const [establishedYear, setEstablishedYear] = useState('')
  const [establishedMonth, setEstablishedMonth] = useState('')
  const [establishedDay, setEstablishedDay] = useState('')
  const [disbandedEra, setDisbandedEra] = useState<'AD' | 'BC'>('AD')
  const [disbandedYear, setDisbandedYear] = useState('')
  const [disbandedMonth, setDisbandedMonth] = useState('')
  const [disbandedDay, setDisbandedDay] = useState('')
  const [garrisonPlace, setGarrisonPlace] = useState<PlaceResult | null>(null)
  const [insigniaUrl, setInsigniaUrl] = useState('')
  const [description, setDescription] = useState('')
  const [strength, setStrength] = useState('')
  const [primaryMission, setPrimaryMission] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [notableBattles, setNotableBattles] = useState('')
  const [honors, setHonors] = useState('')

  const markDirty = useCallback((nextVal = true) => {
    isDirtyRef.current = nextVal
    setIsDirty(nextVal)
  }, [])

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
      } catch {
        // storage disabled
      }
      return next
    })
  }, [])

  /**
   * 섹션 이동 — 사건 모달과 같은 규칙. 2단이 실제로 나란히 서 있으면 '소속·지휘'는 오른쪽 칸을,
   * '기본'은 왼쪽 칸을 맨 위로 올리고, 그 밖은 해당 섹션을 칸 안에서 scrollIntoView 한다.
   */
  const scrollToSection = useCallback(
    (sectionKey: FormSectionKey) => {
      setActiveSection(sectionKey)
      const splitActive = layoutMode === 'split' && isSplitActiveViewport()
      if (splitActive) {
        const paneId =
          sectionKey === 'command'
            ? SPLIT_RIGHT_ID
            : sectionKey === 'basic'
              ? SPLIT_LEFT_ID
              : null
        if (paneId) {
          document.getElementById(paneId)?.scrollTo?.({ top: 0, behavior: 'smooth' })
          return
        }
      }
      document
        .getElementById(sectionIdOf(sectionKey))
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    [layoutMode],
  )

  /** 스크롤 위치로 헤더 알약의 현재 섹션을 따라간다 */
  const handleFormScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.id === SPLIT_RIGHT_ID) {
      setActiveSection('command')
      return
    }
    const container =
      target?.id === SPLIT_LEFT_ID ? target : event.currentTarget
    const threshold = container.getBoundingClientRect().top + 96
    let currentKey: FormSectionKey = 'basic'
    for (const item of FORM_SECTION_META) {
      if (target?.id === SPLIT_LEFT_ID && item.key === 'command') continue
      const sectionEl = document.getElementById(item.id)
      if (sectionEl && sectionEl.getBoundingClientRect().top <= threshold) {
        currentKey = item.key
      }
    }
    setActiveSection((prev) => (prev === currentKey ? prev : currentKey))
  }, [])

  const focusNameInput = useCallback(() => {
    window.setTimeout(() => {
      nameInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      nameInputRef.current?.focus()
    }, 60)
  }, [])

  const scrollToTopAndFocusName = useCallback(() => {
    setActiveSection('basic')
    scrollContainerRef.current?.scrollTo?.({ top: 0 })
    document.getElementById(SPLIT_LEFT_ID)?.scrollTo?.({ top: 0 })
    document.getElementById(SPLIT_RIGHT_ID)?.scrollTo?.({ top: 0 })
    focusNameInput()
  }, [focusNameInput])

  // 국가 목록 로드 (모달 열릴 때)
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    Promise.all([getAllCountries(), getAllHistoricalCountries()])
      .then(([modernList, histList]) => {
        if (cancelled) return
        setModernCountries(modernList)
        setHistoricalCountries(histList)
      })
      .catch(() => {
        // 국가 목록 실패는 빠른 검색만 비게 둔다 — 전체 목록 피커가 따로 다시 받는다
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      isOpen && countryId ? countryId : '',
    )

  // 선택된 국가 스코프의 경량 요약 부대 목록만 로드
  const loadScopedUnits = useCallback(async () => {
    const scopeId = historicalCountryId || countryId
    if (!scopeId) {
      setScopedUnits([])
      return
    }
    try {
      const list = await fetchCountryScopedMilitaryUnits({
        countryId: scopeId,
        isHistorical: Boolean(historicalCountryId),
        summary: true,
      })
      setScopedUnits(list)
    } catch {
      setScopedUnits([])
    }
  }, [countryId, historicalCountryId])

  useEffect(() => {
    if (!isOpen) return
    void loadScopedUnits()
  }, [isOpen, loadScopedUnits])

  // 소관 중앙부처 목록 로드
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const loadDepts = async () => {
      try {
        const [histDepts, modDepts] = await Promise.all([
          historicalCountryId
            ? administrationDepartmentApi.getAll({ historicalCountryId })
            : Promise.resolve([] as AdministrationDepartment[]),
          countryId
            ? administrationDepartmentApi.getAll({ countryId })
            : Promise.resolve([] as AdministrationDepartment[]),
        ])
        const seen = new Set(histDepts.map((deptItem) => deptItem.id))
        if (!cancelled) {
          setAdminDepartments([
            ...histDepts,
            ...modDepts.filter((deptItem) => !seen.has(deptItem.id)),
          ])
        }
      } catch {
        if (!cancelled) setAdminDepartments([])
      }
    }
    void loadDepts()
    return () => {
      cancelled = true
    }
  }, [isOpen, countryId, historicalCountryId])

  const resetCreateFields = useCallback(
    (opts?: { keepContext?: boolean }) => {
      const keepCtx = Boolean(opts?.keepContext)
      setName('')
      setAbbreviation('')
      setNameLocal('')
      setNameEn('')
      setUnitType('')
      setNickname('')
      setMotto('')
      setIsActive(true)
      setEstablishedEra('AD')
      setEstablishedYear('')
      setEstablishedMonth('')
      setEstablishedDay('')
      setDisbandedEra('AD')
      setDisbandedYear('')
      setDisbandedMonth('')
      setDisbandedDay('')
      setGarrisonPlace(null)
      setInsigniaUrl('')
      setDescription('')
      setStrength('')
      setPrimaryMission('')
      setJurisdiction('')
      setNotableBattles('')
      setHonors('')
      setShowForeignAndMottoFields(false)
      setShowDetailedSpecs(false)
      setShowHighCommandPresets(false)
      setActiveSection('basic')
      if (!keepCtx) {
        setBranch(defaultBranch ?? '')
        setCountryId(defaultCountryId ?? '')
        setHistoricalCountryId(defaultHistoricalCountryId ?? '')
        setCountryName('')
        setCountryFlagEmoji('')
        setParentUnitId(defaultParentUnitId ?? '')
        setAdministrationDepartmentId(defaultAdministrationDepartmentId ?? '')
      }
      markDirty(false)
    },
    [
      defaultBranch,
      defaultCountryId,
      defaultHistoricalCountryId,
      defaultParentUnitId,
      defaultAdministrationDepartmentId,
      markDirty,
    ],
  )

  // 모달 열릴 때 초기 데이터 바인딩 (신규 / 수정)
  useEffect(() => {
    if (!isOpen) return
    setSavedUnit(null)
    if (!isEdit || !editingUnitId) {
      resetCreateFields({ keepContext: false })
      return
    }

    let cancelled = false
    setHydratingUnit(true)
    militaryUnitApi
      .getById(editingUnitId)
      .then((unitData) => {
        if (cancelled) return
        setName(unitData.name ?? '')
        setAbbreviation(unitData.abbreviation ?? '')
        setNameLocal(unitData.nameLocal ?? '')
        setNameEn(unitData.nameEn ?? '')
        setUnitType((unitData.unitType as MilitaryUnitType) ?? '')
        setBranch(unitData.branch ?? '')
        setNickname(unitData.nickname ?? '')
        setMotto(unitData.motto ?? '')
        setIsActive(unitData.isActive !== false)
        setCountryId(unitData.countryId ?? '')
        setHistoricalCountryId(unitData.historicalCountryId ?? '')
        setCountryName(
          unitData.historicalCountry?.name ?? unitData.country?.name ?? '',
        )
        setCountryFlagEmoji(unitData.historicalCountry ? '🏛️' : '🏳️')
        setParentUnitId(unitData.parentUnitId ?? '')
        setAdministrationDepartmentId(unitData.administrationDepartmentId ?? '')

        const estParts = hydrateStructuredParts(
          unitData.established,
          unitData.establishedDate,
        )
        setEstablishedEra(estParts.era)
        setEstablishedYear(estParts.year)
        setEstablishedMonth(estParts.month)
        setEstablishedDay(estParts.day)

        const disParts = hydrateStructuredParts(
          unitData.disbanded,
          unitData.disbandedDate,
        )
        setDisbandedEra(disParts.era)
        setDisbandedYear(disParts.year)
        setDisbandedMonth(disParts.month)
        setDisbandedDay(disParts.day)

        const garrisonText: string = unitData.garrison ?? ''
        setGarrisonPlace(
          garrisonText
            ? { displayName: garrisonText, shortName: garrisonText, isManual: true }
            : null,
        )
        setInsigniaUrl(unitData.insigniaUrl ?? '')
        setDescription(unitData.description ?? '')
        setStrength(unitData.strength ?? '')
        setPrimaryMission(unitData.primaryMission ?? '')
        setJurisdiction(unitData.jurisdiction ?? '')
        setNotableBattles(unitData.notableBattles ?? '')
        setHonors(unitData.honors ?? '')

        setShowForeignAndMottoFields(
          Boolean(
            unitData.nameLocal ||
              unitData.nameEn ||
              unitData.nickname ||
              unitData.motto,
          ),
        )
        setShowDetailedSpecs(
          Boolean(
            unitData.strength ||
              unitData.primaryMission ||
              unitData.jurisdiction ||
              unitData.notableBattles ||
              unitData.honors,
          ),
        )
        setActiveSection('basic')
        markDirty(false)
      })
      .catch((err) => {
        if (!cancelled) {
          notify.error(getApiErrorMessage(err, '부대 정보를 불러오지 못했습니다.'))
        }
      })
      .finally(() => {
        if (!cancelled) setHydratingUnit(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, isEdit, editingUnitId, resetCreateFields, markDirty])

  // 기본 countryId / historicalCountryId 로 countryName 보강
  useEffect(() => {
    if (!isOpen) return
    if (historicalCountryId) {
      const matchedHist = historicalCountries.find(
        (item) => item.id === historicalCountryId,
      )
      if (matchedHist) {
        setCountryName(matchedHist.name)
        setCountryFlagEmoji('🏛️')
        return
      }
    }
    if (countryId && !historicalCountryId) {
      const matchedMod = modernCountries.find((item) => item.id === countryId)
      if (matchedMod) {
        setCountryName(matchedMod.name)
        setCountryFlagEmoji(matchedMod.flagEmoji || '🏳️')
      }
    }
  }, [isOpen, countryId, historicalCountryId, modernCountries, historicalCountries])

  // 이름 기반 자동 제대/군종/연도 추론
  const nameInference = useMemo(
    () => inferMilitaryUnitMetaFromName(name, abbreviation),
    [name, abbreviation],
  )

  const hasInferenceSuggestion = Boolean(
    (nameInference.inferredUnitType && !unitType) ||
      (nameInference.inferredBranch && !branch) ||
      (nameInference.inferredYear && !establishedYear.trim()),
  )

  // 유사 부대명 경고 (동일 국가 스코프 내)
  const similarUnits = useMemo(() => {
    const trimmed = name.trim().toLowerCase()
    if (trimmed.length < 2) return []
    return scopedUnits
      .filter((unitItem) => {
        if (editingUnitId && unitItem.id === editingUnitId) return false
        const targetName = unitItem.name.toLowerCase()
        const targetAbbr = (unitItem.abbreviation ?? '').toLowerCase()
        return (
          targetName.includes(trimmed) ||
          trimmed.includes(targetName) ||
          (targetAbbr.length > 0 && targetAbbr === trimmed)
        )
      })
      .slice(0, 4)
  }, [name, scopedUnits, editingUnitId])

  const descendantIds = useMemo(
    () => collectDescendantUnitIds(editingUnitId, scopedUnits),
    [editingUnitId, scopedUnits],
  )

  const parentUnitCandidates = useMemo(() => {
    const query = parentUnitQuickQuery.trim().toLowerCase()
    return scopedUnits
      .filter((candidate) => {
        if (editingUnitId && candidate.id === editingUnitId) return false
        if (descendantIds.has(candidate.id)) return false
        if (!query) return true
        return (
          candidate.name.toLowerCase().includes(query) ||
          (candidate.abbreviation ?? '').toLowerCase().includes(query)
        )
      })
      .slice(0, 14)
  }, [scopedUnits, editingUnitId, descendantIds, parentUnitQuickQuery])

  const selectedParentUnit = useMemo(
    () => scopedUnits.find((unitItem) => unitItem.id === parentUnitId) ?? null,
    [scopedUnits, parentUnitId],
  )

  const sortedAdminDepts = useMemo(() => {
    const query = adminDeptQuickQuery.trim().toLowerCase()
    return [...adminDepartments]
      .filter((deptItem) => {
        if (!query) return true
        return (
          deptItem.name.toLowerCase().includes(query) ||
          (deptItem.abbreviation ?? '').toLowerCase().includes(query)
        )
      })
      .sort((leftDept, rightDept) => {
        const leftDefense = isDefenseRelatedCategory(leftDept.category) ? 0 : 1
        const rightDefense = isDefenseRelatedCategory(rightDept.category)
          ? 0
          : 1
        if (leftDefense !== rightDefense) return leftDefense - rightDefense
        return leftDept.name.localeCompare(rightDept.name, 'ko')
      })
      .slice(0, 14)
  }, [adminDepartments, adminDeptQuickQuery])

  const selectedAdminDept = useMemo(
    () =>
      adminDepartments.find(
        (deptItem) => deptItem.id === administrationDepartmentId,
      ) ?? null,
    [adminDepartments, administrationDepartmentId],
  )

  const hintYearRange = useMemo<CountryHintYearRange | null>(() => {
    const estYr = toSignedComparableYear(establishedEra, establishedYear)
    const disYr = toSignedComparableYear(disbandedEra, disbandedYear)
    if (estYr == null && disYr == null) return null
    return { startYear: estYr, endYear: disYr }
  }, [establishedEra, establishedYear, disbandedEra, disbandedYear])

  const historicalById = useMemo(
    () => new Map(historicalCountries.map((item) => [item.id, item])),
    [historicalCountries],
  )

  const selectedHistoricalObj = historicalCountryId
    ? (historicalById.get(historicalCountryId) ?? null)
    : null

  const lifespanMismatchMsg = useMemo(() => {
    if (!selectedHistoricalObj || !hintYearRange) return null
    const recordYear = hintYearRange.startYear ?? hintYearRange.endYear
    if (recordYear == null) return null
    // 부대 창설·해산은 era 구조화 저장이라 BC 경계와도 비교할 수 있다
    return describeLifespanMismatch(selectedHistoricalObj, recordYear, {
      recordSupportsBc: true,
    })
  }, [selectedHistoricalObj, hintYearRange])

  /** 현대 국가에 이어진 역사 정치체 칩 — 기간 정보는 전체 목록에서 보강해 시기 힌트로 거른다 */
  const linkedEraChips = useMemo(() => {
    return linkedHistoricalCountries
      .map((eraItem) => historicalById.get(eraItem.id) ?? null)
      .filter((eraItem): eraItem is HistoricalCountryResponseDto => eraItem != null)
      .filter((eraItem) =>
        hintYearRange && eraItem.id !== historicalCountryId
          ? matchesHintYearRange(eraItem, hintYearRange)
          : true,
      )
      .slice(0, 6)
  }, [linkedHistoricalCountries, historicalById, hintYearRange, historicalCountryId])

  const countryQuickSuggestions = useMemo(() => {
    const query = countryQuickQuery.trim()
    if (!query) return []
    const matchedMod = filterCountriesByQuery(modernCountries, query)
      .slice(0, 6)
      .map((item) => ({
        kind: 'modern' as const,
        id: item.id,
        name: item.name,
        emoji: item.flagEmoji || '🏳️',
        meta: '현대 국가',
      }))
    const matchedHist = filterCountriesByQuery(historicalCountries, query)
      .slice(0, 8)
      .map((item) => ({
        kind: 'historical' as const,
        id: item.id,
        name: item.name,
        emoji: '🏛️',
        meta: formatCountryPeriod(item) || '역사 정치체',
      }))
    return [...matchedHist, ...matchedMod].slice(0, 10)
  }, [countryQuickQuery, modernCountries, historicalCountries])

  const estComparable = toSignedComparableYear(establishedEra, establishedYear)
  const disComparable = toSignedComparableYear(disbandedEra, disbandedYear)
  const isDateOrderInverted =
    !isActive &&
    estComparable != null &&
    disComparable != null &&
    disComparable < estComparable

  const visibleUnitTypes = useMemo(() => {
    if (showAllUnitTypes) return UNIT_TYPES
    const primary = UNIT_TYPES.filter(
      (opt) =>
        opt.value === unitType || opt.primaryForBranches.includes(branch),
    )
    return primary.length > 0 ? primary : UNIT_TYPES.slice(0, 10)
  }, [showAllUnitTypes, branch, unitType])

  const selectedBranchDef = useMemo(
    () => MILITARY_BRANCHES.find((item) => item.value === branch) ?? null,
    [branch],
  )

  const buildStructuredDatePayload = (
    eraVal: 'AD' | 'BC',
    yearStr: string,
    monthStr: string,
    dayStr: string,
    fieldLabel: string,
  ):
    | {
        ok: true
        info: {
          era: 'AD' | 'BC'
          year: number
          month: number | null
          day: number | null
        } | null
      }
    | { ok: false } => {
    const trimmedYear = yearStr.trim()
    const trimmedMonth = monthStr.trim()
    const trimmedDay = dayStr.trim()

    if (!trimmedYear) {
      if (trimmedMonth || trimmedDay) {
        notify.error(`${fieldLabel} 연도를 먼저 입력해주세요.`)
        return { ok: false }
      }
      return { ok: true, info: null }
    }
    const parsedYear = Number.parseInt(trimmedYear, 10)
    if (!Number.isInteger(parsedYear) || parsedYear < 1) {
      notify.error(`${fieldLabel} 연도는 1 이상의 자연수로 입력해주세요.`)
      return { ok: false }
    }
    let parsedMonth: number | null = null
    if (trimmedMonth) {
      const monthNum = Number.parseInt(trimmedMonth, 10)
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        notify.error(`${fieldLabel} 월은 1~12 사이로 입력해주세요.`)
        return { ok: false }
      }
      parsedMonth = monthNum
    }
    let parsedDay: number | null = null
    if (trimmedDay) {
      if (parsedMonth == null) {
        notify.error(`${fieldLabel} 월을 먼저 입력해주세요.`)
        return { ok: false }
      }
      const dayNum = Number.parseInt(trimmedDay, 10)
      if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
        notify.error(`${fieldLabel} 일은 1~31 사이로 입력해주세요.`)
        return { ok: false }
      }
      parsedDay = dayNum
    }
    return {
      ok: true,
      info: {
        era: eraVal,
        year: parsedYear,
        month: parsedMonth,
        day: parsedDay,
      },
    }
  }

  const handleInsigniaFile = useCallback(
    async (file: File) => {
      try {
        validateImageFile(file)
      } catch (validationError) {
        notify.error(
          validationError instanceof Error
            ? validationError.message
            : '이미지 형식을 확인해주세요.',
        )
        return
      }
      setInsigniaUploading(true)
      try {
        const uploaded = await uploadImage(file, 'military-units')
        setInsigniaUrl(uploaded.url)
        markDirty(true)
      } catch (err) {
        notify.error(getApiErrorMessage(err, '휘장 업로드에 실패했습니다.'))
      } finally {
        setInsigniaUploading(false)
      }
    },
    [markDirty],
  )

  const busy = loading || insigniaUploading || hydratingUnit

  /** Esc·오버레이·취소 공통 — 작성 중이면 확인부터 */
  const requestClose = useCallback(async () => {
    if (loading) return
    const leaveMsg = isEdit ? EDIT_LEAVE_MESSAGE : CREATE_LEAVE_MESSAGE
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: leaveMsg }))
    ) {
      return
    }
    markDirty(false)
    onClose()
  }, [isEdit, loading, markDirty, onClose])

  const handleResetForm = useCallback(async () => {
    if (busy) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '초기화 확인', message: RESET_CONFIRM_MESSAGE }))
    ) {
      return
    }
    playClickSound()
    resetCreateFields({ keepContext: false })
    scrollToTopAndFocusName()
  }, [busy, playClickSound, resetCreateFields, scrollToTopAndFocusName])

  const hasCountry = Boolean(countryId || historicalCountryId)
  const missingFields: Array<{ label: string; section: FormSectionKey }> = []
  if (!name.trim()) missingFields.push({ label: '부대·사령부명', section: 'basic' })
  if (!hasCountry) missingFields.push({ label: '소속 국가', section: 'command' })
  const firstMissing = missingFields[0] ?? null
  const isValid = missingFields.length === 0 && !isDateOrderInverted
  const canSubmit = isValid && !busy

  const focusFirstMissingField = useCallback(() => {
    const target = firstMissing
    if (!target) {
      if (isDateOrderInverted) scrollToSection('context')
      return
    }
    scrollToSection(target.section)
    window.setTimeout(() => {
      const fieldEl = document.getElementById(
        target.section === 'basic' ? NAME_INPUT_ID : COUNTRY_SEARCH_ID,
      )
      fieldEl?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      fieldEl?.focus()
    }, 80)
  }, [firstMissing, isDateOrderInverted, scrollToSection])

  const submitUnitForm = async (options?: { continueAfterSave?: boolean }) => {
    const shouldContinue = Boolean(options?.continueAfterSave && !isEdit)
    if (busy) return

    if (missingFields.length > 0) {
      focusFirstMissingField()
      return
    }
    if (isDateOrderInverted) {
      notify.error('해산 시점이 창설 시점보다 앞설 수 없습니다.')
      scrollToSection('context')
      return
    }

    const establishedPayload = buildStructuredDatePayload(
      establishedEra,
      establishedYear,
      establishedMonth,
      establishedDay,
      '창설 시기',
    )
    if (!establishedPayload.ok) {
      scrollToSection('context')
      return
    }

    const effectiveIsActive = disbandedYear.trim() ? false : isActive
    const disbandedPayload = effectiveIsActive
      ? { ok: true as const, info: null }
      : buildStructuredDatePayload(
          disbandedEra,
          disbandedYear,
          disbandedMonth,
          disbandedDay,
          '해산 시기',
        )
    if (!disbandedPayload.ok) {
      scrollToSection('context')
      return
    }

    const payload: CreateMilitaryUnitInput = {
      name: name.trim(),
      abbreviation: abbreviation.trim() || null,
      nameLocal: nameLocal.trim() || null,
      nameEn: nameEn.trim() || null,
      unitType: unitType || null,
      branch: branch
        ? (branch as NonNullable<CreateMilitaryUnitInput['branch']>)
        : null,
      countryId: countryId || null,
      historicalCountryId: historicalCountryId || null,
      parentUnitId: parentUnitId || null,
      administrationDepartmentId: administrationDepartmentId || null,
      isActive: effectiveIsActive,
      establishedDate: null,
      establishedInfo: establishedPayload.info,
      disbandedDate: null,
      disbandedInfo: disbandedPayload.info,
      nickname: nickname.trim() || null,
      motto: motto.trim() || null,
      garrison: garrisonPlace?.displayName?.trim() || null,
      strength: strength.trim() || null,
      insigniaUrl: toUploadStoragePath(insigniaUrl) || null,
      primaryMission: primaryMission.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      notableBattles: notableBattles.trim() || null,
      honors: honors.trim() || null,
      description: description.trim() || null,
    }

    try {
      setLoading(true)
      let savedId: string | null = editingUnitId
      let savedName = payload.name
      if (isEdit && editingUnitId) {
        await militaryUnitApi.update(editingUnitId, payload)
      } else {
        const createdUnit = await militaryUnitApi.create(payload)
        savedId = createdUnit.id
        savedName = createdUnit.name ?? savedName
      }

      void queryClient.invalidateQueries({ queryKey: militaryUnitQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      void queryClient.invalidateQueries({ queryKey: ['administration-departments'] })
      void loadScopedUnits()
      markDirty(false)
      onSaved?.()

      if (isEdit) {
        notify.success('군사 사령부·부대를 수정했습니다.')
        onClose()
        return
      }
      if (shouldContinue) {
        notify.success(`'${savedName}' 등록 — 같은 소속으로 다음 부대를 이어서 등록합니다.`)
        resetCreateFields({ keepContext: true })
        scrollToTopAndFocusName()
        return
      }
      if (savedId) setSavedUnit({ id: savedId, name: savedName })
      else onClose()
    } catch (submitError) {
      notify.error(getApiErrorMessage(submitError, '군부대 저장에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  const submitUnitFormRef = useRef(submitUnitForm)
  submitUnitFormRef.current = submitUnitForm

  const handleShortcutSubmit = useCallback(
    ({ continueAfterSave }: { continueAfterSave: boolean }) => {
      void submitUnitFormRef.current({ continueAfterSave })
    },
    [],
  )

  useModalSubmitShortcut({
    enabled: isOpen && canSubmit && savedUnit === null,
    scrollContainerRef,
    onSubmit: handleShortcutSubmit,
  })

  /* ─── 등록 완료 3지 분기 ─── */
  const handleViewDetail = useCallback(() => {
    const targetId = savedUnit?.id
    setSavedUnit(null)
    onClose()
    if (targetId) navigate(pathKeys.militaryUnitDetail(targetId))
  }, [navigate, onClose, savedUnit])

  const handleRegisterAnother = useCallback(() => {
    setSavedUnit(null)
    resetCreateFields({ keepContext: true })
    scrollToTopAndFocusName()
  }, [resetCreateFields, scrollToTopAndFocusName])

  const handleCloseAfterSave = useCallback(() => {
    setSavedUnit(null)
    onClose()
  }, [onClose])

  /* ─── 섹션 상태(헤더 알약 배지) ─── */
  const basicDone = Boolean(name.trim())
  const commandCount =
    (hasCountry ? 1 : 0) + (parentUnitId ? 1 : 0) + (administrationDepartmentId ? 1 : 0)
  const contextCount = [
    establishedYear.trim(),
    disbandedYear.trim(),
    garrisonPlace ? 'garrison' : '',
    insigniaUrl,
    description.trim(),
    strength.trim(),
    jurisdiction.trim(),
    primaryMission.trim(),
    notableBattles.trim(),
    honors.trim(),
  ].filter(Boolean).length

  const sectionBadgeOf = (sectionKey: FormSectionKey): string | null => {
    if (sectionKey === 'basic') return basicDone && !hydratingUnit ? '✓' : null
    if (sectionKey === 'command') return hasCountry ? '✓' : null
    return contextCount > 0 ? String(contextCount) : null
  }

  const updateTextField =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (changeEvent: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(changeEvent.target.value)
      markDirty(true)
    }

  /* ─────────────── 1. 기본 정보 ─────────────── */
  const basicSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('basic')}
      aria-labelledby="military-unit-section-basic-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-basic-title">
        기본 정보
        {unitType || selectedBranchDef ? (
          <FormS.FormGroupSummaryBadge>
            {[
              selectedBranchDef?.label,
              unitType
                ? (UNIT_TYPES.find((item) => item.value === unitType)?.shortLabel ??
                  unitType)
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel htmlFor={NAME_INPUT_ID}>
          부대·사령부명 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <FormS.NameAbbrGrid>
            <FormS.TitleInput
              ref={nameInputRef}
              id={NAME_INPUT_ID}
              type="text"
              /* 모달이 열리면 닫기(✕)가 아니라 여기로 — 등록의 첫 동작은 이름 쓰기다 */
              data-autofocus=""
              placeholder="예: 합동참모본부, 제1야전군, 제7기동군단"
              value={name}
              onChange={updateTextField(setName)}
            />
            <FormS.AbbrInput
              type="text"
              aria-label="약칭"
              placeholder="약칭 (예: 합참)"
              value={abbreviation}
              onChange={updateTextField(setAbbreviation)}
            />
          </FormS.NameAbbrGrid>

          {hasInferenceSuggestion ? (
            <FormS.TitleSuggestionRow>
              <FormS.TitleSuggestionLabel>이름에서 추천</FormS.TitleSuggestionLabel>
              {nameInference.inferredUnitType && !unitType ? (
                <FormS.TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    setUnitType(nameInference.inferredUnitType!)
                    markDirty(true)
                  }}
                >
                  제대:{' '}
                  {
                    UNIT_TYPES.find(
                      (item) => item.value === nameInference.inferredUnitType,
                    )?.shortLabel
                  }
                </FormS.TitleSuggestionButton>
              ) : null}
              {nameInference.inferredBranch && !branch ? (
                <FormS.TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    setBranch(nameInference.inferredBranch!)
                    markDirty(true)
                  }}
                >
                  군종:{' '}
                  {
                    MILITARY_BRANCHES.find(
                      (item) => item.value === nameInference.inferredBranch,
                    )?.label
                  }
                </FormS.TitleSuggestionButton>
              ) : null}
              {nameInference.inferredYear && !establishedYear.trim() ? (
                <FormS.TitleSuggestionButton
                  type="button"
                  onClick={() => {
                    setEstablishedEra(nameInference.inferredYear!.era)
                    setEstablishedYear(nameInference.inferredYear!.year)
                    markDirty(true)
                  }}
                >
                  창설 연도: {nameInference.inferredYear.year}년
                </FormS.TitleSuggestionButton>
              ) : null}
            </FormS.TitleSuggestionRow>
          ) : null}

          {similarUnits.length > 0 ? (
            <FormS.SimilarUnitsBar>
              <FormS.SimilarUnitsLabel>
                같은 국가에 비슷한 이름의 편제가 이미 있습니다
              </FormS.SimilarUnitsLabel>
              <FormS.SimilarUnitsList>
                {similarUnits.map((simUnit) => (
                  <FormS.SimilarUnitChip key={simUnit.id}>
                    {simUnit.name}
                    {simUnit.abbreviation ? ` (${simUnit.abbreviation})` : ''}
                  </FormS.SimilarUnitChip>
                ))}
              </FormS.SimilarUnitsList>
            </FormS.SimilarUnitsBar>
          ) : null}

          {showHighCommandPresets ? (
            <FormS.PresetChipRow>
              {HIGH_COMMAND_PRESETS.map((preset) => (
                <FormS.PresetChipBtn
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.name)
                    setAbbreviation(preset.abbreviation)
                    if (preset.nameLocal) setNameLocal(preset.nameLocal)
                    if (preset.nameEn) setNameEn(preset.nameEn)
                    setUnitType(preset.unitType)
                    setBranch(preset.branch)
                    markDirty(true)
                  }}
                >
                  {preset.label}
                </FormS.PresetChipBtn>
              ))}
            </FormS.PresetChipRow>
          ) : null}
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div" id="military-unit-branch-label">
          군종<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.CategoryGrid role="radiogroup" aria-labelledby="military-unit-branch-label">
            {MILITARY_BRANCHES.map((branchDef) => {
              const isSelected = branch === branchDef.value
              const BranchIcon = branchDef.Icon
              return (
                <S.CategoryCard
                  key={branchDef.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-pressed={isSelected}
                  style={
                    {
                      '--cat-rgb': branchDef.rgb,
                      '--cat-text': isDarkMode ? branchDef.textDark : branchDef.text,
                      '--cat-accent': branchDef.accent,
                    } as React.CSSProperties
                  }
                  $selected={isSelected}
                  onClick={() => {
                    playClickSound()
                    setBranch(isSelected ? '' : branchDef.value)
                    markDirty(true)
                  }}
                >
                  <S.CategoryIcon $selected={isSelected}>
                    <BranchIcon size={13} />
                  </S.CategoryIcon>
                  <S.CategoryLabel>{branchDef.label}</S.CategoryLabel>
                </S.CategoryCard>
              )
            })}
          </S.CategoryGrid>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          제대 · 부대 유형<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {showAllUnitTypes ? (
            UNIT_TYPE_GROUPS.map((groupName) => (
              <div key={groupName} style={{ marginBottom: 8 }}>
                <KitGroupLabel>{groupName}</KitGroupLabel>
                <KitChipGroup>
                  {UNIT_TYPES.filter((opt) => opt.group === groupName).map(
                    (opt) => (
                      <KitChoiceChip
                        key={opt.value}
                        type="button"
                        aria-pressed={unitType === opt.value}
                        $selected={unitType === opt.value}
                        onClick={() => {
                          setUnitType(unitType === opt.value ? '' : opt.value)
                          markDirty(true)
                        }}
                      >
                        {opt.shortLabel}
                      </KitChoiceChip>
                    ),
                  )}
                </KitChipGroup>
              </div>
            ))
          ) : (
            <KitChipGroup>
              {visibleUnitTypes.map((opt) => (
                <KitChoiceChip
                  key={opt.value}
                  type="button"
                  aria-pressed={unitType === opt.value}
                  $selected={unitType === opt.value}
                  onClick={() => {
                    setUnitType(unitType === opt.value ? '' : opt.value)
                    markDirty(true)
                  }}
                >
                  {opt.shortLabel}
                </KitChoiceChip>
              ))}
            </KitChipGroup>
          )}
          <div style={{ marginTop: 6 }}>
            <FormS.InlineLinkBtn
              type="button"
              onClick={() => setShowAllUnitTypes((prev) => !prev)}
            >
              {showAllUnitTypes ? '주요 제대만 보기' : '+ 전체 제대 보기'}
            </FormS.InlineLinkBtn>
          </div>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">운용 상태</S.FormLabel>
        <S.FormField>
          <SegmentControl
            appearance="chips"
            ariaLabel="운용 상태"
            value={isActive ? 'active' : 'disbanded'}
            onChange={(nextVal) => {
              const nextActive = nextVal === 'active'
              setIsActive(nextActive)
              if (nextActive) {
                setDisbandedYear('')
                setDisbandedMonth('')
                setDisbandedDay('')
              }
              markDirty(true)
            }}
            options={[
              { value: 'active', label: '현역 · 존속' },
              { value: 'disbanded', label: '해체 · 개편 종결' },
            ]}
          />
        </S.FormField>
      </S.FormRow>

      {showForeignAndMottoFields ? (
        <S.FormRow>
          <S.FormLabel as="div">
            다른 이름<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <FormS.SubTitleGrid>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>원어명</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="현지어 공식 명칭"
                  value={nameLocal}
                  onChange={updateTextField(setNameLocal)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>영문명</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="English Official Name"
                  value={nameEn}
                  onChange={updateTextField(setNameEn)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>별칭 · 통칭</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="예: 맹호부대, 백골부대"
                  value={nickname}
                  onChange={updateTextField(setNickname)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>표어 · 구호</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="부대 표어"
                  value={motto}
                  onChange={updateTextField(setMotto)}
                />
              </FormS.SubTitleField>
            </FormS.SubTitleGrid>
          </S.FormField>
        </S.FormRow>
      ) : null}

      <FormS.OptionalRevealRow>
        <FormS.OptionalRevealBtn
          type="button"
          $open={showForeignAndMottoFields}
          aria-expanded={showForeignAndMottoFields}
          onClick={() => setShowForeignAndMottoFields((prev) => !prev)}
        >
          {showForeignAndMottoFields ? '− ' : '+ '}원어 · 영문 · 별칭 · 표어
        </FormS.OptionalRevealBtn>
        {!isEdit ? (
          <FormS.OptionalRevealBtn
            type="button"
            $open={showHighCommandPresets}
            aria-expanded={showHighCommandPresets}
            onClick={() => setShowHighCommandPresets((prev) => !prev)}
          >
            {showHighCommandPresets ? '− ' : '+ '}대표 사령부 예시
          </FormS.OptionalRevealBtn>
        ) : null}
      </FormS.OptionalRevealRow>
    </FormS.FormGroupSection>
  )

  /* ─────────────── 2. 소속 · 지휘 계통 ─────────────── */
  const commandSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('command')}
      aria-labelledby="military-unit-section-command-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-command-title">
        소속 · 지휘 계통
        {countryName ? (
          <FormS.FormGroupSummaryBadge>{countryName}</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel htmlFor={hasCountry ? undefined : COUNTRY_SEARCH_ID}>
          소속 국가 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          {hasCountry ? (
            <FormS.ContextCard>
              <FormS.ContextCardRow>
                <FormS.ContextCardTitle>
                  <span aria-hidden="true">{countryFlagEmoji || '🏳️'}</span>
                  <span>{countryName || '선택된 국가'}</span>
                  {selectedHistoricalObj ? (
                    <FormS.ContextCardMeta>
                      {formatCountryPeriod(selectedHistoricalObj)}
                    </FormS.ContextCardMeta>
                  ) : null}
                </FormS.ContextCardTitle>
                {!lockCountryAndDepartment ? (
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <FormS.InlineLinkBtn
                      type="button"
                      onClick={() => setCountryModalOpen(true)}
                    >
                      변경
                    </FormS.InlineLinkBtn>
                    <KitRemoveButton
                      type="button"
                      aria-label="소속 국가 해제"
                      onClick={() => {
                        setCountryId('')
                        setHistoricalCountryId('')
                        setCountryName('')
                        setCountryFlagEmoji('')
                        setParentUnitId('')
                        setAdministrationDepartmentId('')
                        markDirty(true)
                      }}
                    >
                      <FiX size={13} />
                    </KitRemoveButton>
                  </span>
                ) : null}
              </FormS.ContextCardRow>

              {!lockCountryAndDepartment && countryId && linkedEraChips.length > 0 ? (
                <KitChipGroup aria-label="시대(역사 정치체)">
                  <KitChoiceChip
                    type="button"
                    aria-pressed={!historicalCountryId}
                    $selected={!historicalCountryId}
                    onClick={() => {
                      setHistoricalCountryId('')
                      const modObj = modernCountries.find(
                        (item) => item.id === countryId,
                      )
                      if (modObj) {
                        setCountryName(modObj.name)
                        setCountryFlagEmoji(modObj.flagEmoji || '🏳️')
                      }
                      markDirty(true)
                    }}
                  >
                    현대 국가
                  </KitChoiceChip>
                  {linkedEraChips.map((eraItem) => (
                    <KitChoiceChip
                      key={eraItem.id}
                      type="button"
                      aria-pressed={historicalCountryId === eraItem.id}
                      $selected={historicalCountryId === eraItem.id}
                      title={formatCountryPeriod(eraItem) || undefined}
                      onClick={() => {
                        setHistoricalCountryId(eraItem.id)
                        setCountryName(eraItem.name)
                        setCountryFlagEmoji('🏛️')
                        setParentUnitId('')
                        markDirty(true)
                      }}
                    >
                      {eraItem.name}
                    </KitChoiceChip>
                  ))}
                </KitChipGroup>
              ) : null}
            </FormS.ContextCard>
          ) : (
            <FormS.QuickSearchBox>
              <S.Input
                id={COUNTRY_SEARCH_ID}
                type="text"
                placeholder="국가 또는 역사 정치체 이름 검색…"
                value={countryQuickQuery}
                onFocus={() => setCountryQuickFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setCountryQuickFocused(false), 180)
                }
                onChange={(changeEvent) => setCountryQuickQuery(changeEvent.target.value)}
              />
              {countryQuickFocused && countryQuickSuggestions.length > 0 ? (
                <FormS.QuickSuggestionList role="listbox" aria-label="국가 검색 결과">
                  {countryQuickSuggestions.map((candidate) => (
                    <FormS.QuickSuggestionItem
                      key={`${candidate.kind}:${candidate.id}`}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(mouseEvent) => {
                        mouseEvent.preventDefault()
                        if (candidate.kind === 'historical') {
                          // 부대는 역사 축 단독 — 현대 FK까지 채우면 현대 국가 화면에 시대착오로 뜬다
                          setHistoricalCountryId(candidate.id)
                          setCountryId('')
                          setCountryFlagEmoji('🏛️')
                        } else {
                          setCountryId(candidate.id)
                          setHistoricalCountryId('')
                          setCountryFlagEmoji(candidate.emoji)
                        }
                        setCountryName(candidate.name)
                        setCountryQuickQuery('')
                        markDirty(true)
                      }}
                    >
                      <span>
                        {candidate.emoji} {candidate.name}
                      </span>
                      <FormS.ContextCardMeta>{candidate.meta}</FormS.ContextCardMeta>
                    </FormS.QuickSuggestionItem>
                  ))}
                </FormS.QuickSuggestionList>
              ) : null}
              <div>
                <FormS.InlineLinkBtn
                  type="button"
                  onClick={() => setCountryModalOpen(true)}
                >
                  전체 국가 목록에서 선택…
                </FormS.InlineLinkBtn>
              </div>
            </FormS.QuickSearchBox>
          )}

          {lifespanMismatchMsg ? (
            <div style={{ marginTop: 6 }}>
              <AlertBox variant="warning">{lifespanMismatchMsg}</AlertBox>
            </div>
          ) : null}
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          상급 부대<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {selectedParentUnit ? (
            <FormS.ContextCard>
              <FormS.ContextCardRow>
                <FormS.ContextCardTitle>
                  <span>{selectedParentUnit.name}</span>
                  {selectedParentUnit.abbreviation ? (
                    <FormS.ContextCardMeta>
                      ({selectedParentUnit.abbreviation})
                    </FormS.ContextCardMeta>
                  ) : null}
                </FormS.ContextCardTitle>
                <KitRemoveButton
                  type="button"
                  aria-label="상급 부대 해제"
                  onClick={() => {
                    setParentUnitId('')
                    markDirty(true)
                  }}
                >
                  <FiX size={13} />
                </KitRemoveButton>
              </FormS.ContextCardRow>
            </FormS.ContextCard>
          ) : (
            <FormS.QuickSearchBox>
              <S.Input
                type="text"
                aria-label="상급 부대 검색"
                disabled={!hasCountry}
                placeholder={
                  hasCountry
                    ? '상급 사령부·부대 검색 (비우면 최상위 편제)'
                    : '소속 국가를 먼저 선택해주세요'
                }
                value={parentUnitQuickQuery}
                onFocus={() => setParentUnitQuickFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setParentUnitQuickFocused(false), 180)
                }
                onChange={(changeEvent) => setParentUnitQuickQuery(changeEvent.target.value)}
              />
              {parentUnitQuickFocused && parentUnitCandidates.length > 0 ? (
                <FormS.QuickSuggestionList role="listbox" aria-label="상급 부대 후보">
                  {parentUnitCandidates.map((unitCandidate) => (
                    <FormS.QuickSuggestionItem
                      key={unitCandidate.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(mouseEvent) => {
                        mouseEvent.preventDefault()
                        setParentUnitId(unitCandidate.id)
                        setParentUnitQuickQuery('')
                        markDirty(true)
                      }}
                    >
                      <span>{unitCandidate.name}</span>
                      <FormS.ContextCardMeta>
                        {unitCandidate.abbreviation || ''}
                      </FormS.ContextCardMeta>
                    </FormS.QuickSuggestionItem>
                  ))}
                </FormS.QuickSuggestionList>
              ) : null}
            </FormS.QuickSearchBox>
          )}
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          소관 부처<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          {selectedAdminDept ? (
            <FormS.ContextCard>
              <FormS.ContextCardRow>
                <FormS.ContextCardTitle>
                  <span>{selectedAdminDept.name}</span>
                  {selectedAdminDept.abbreviation ? (
                    <FormS.ContextCardMeta>
                      ({selectedAdminDept.abbreviation})
                    </FormS.ContextCardMeta>
                  ) : null}
                </FormS.ContextCardTitle>
                {!lockCountryAndDepartment ? (
                  <KitRemoveButton
                    type="button"
                    aria-label="소관 부처 해제"
                    onClick={() => {
                      setAdministrationDepartmentId('')
                      markDirty(true)
                    }}
                  >
                    <FiX size={13} />
                  </KitRemoveButton>
                ) : null}
              </FormS.ContextCardRow>
            </FormS.ContextCard>
          ) : (
            <FormS.QuickSearchBox>
              <S.Input
                type="text"
                aria-label="소관 부처 검색"
                disabled={!hasCountry || lockCountryAndDepartment}
                placeholder={
                  hasCountry
                    ? '소관 중앙부처 검색 (예: 국방부, 육군성)'
                    : '소속 국가를 먼저 선택해주세요'
                }
                value={adminDeptQuickQuery}
                onFocus={() => setAdminDeptQuickFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setAdminDeptQuickFocused(false), 180)
                }
                onChange={(changeEvent) => setAdminDeptQuickQuery(changeEvent.target.value)}
              />
              {adminDeptQuickFocused && sortedAdminDepts.length > 0 ? (
                <FormS.QuickSuggestionList role="listbox" aria-label="소관 부처 후보">
                  {sortedAdminDepts.map((deptItem) => (
                    <FormS.QuickSuggestionItem
                      key={deptItem.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(mouseEvent) => {
                        mouseEvent.preventDefault()
                        setAdministrationDepartmentId(deptItem.id)
                        setAdminDeptQuickQuery('')
                        markDirty(true)
                      }}
                    >
                      <span>{deptItem.name}</span>
                      <FormS.ContextCardMeta>
                        {deptItem.abbreviation || ''}
                      </FormS.ContextCardMeta>
                    </FormS.QuickSuggestionItem>
                  ))}
                </FormS.QuickSuggestionList>
              ) : null}
            </FormS.QuickSearchBox>
          )}
        </S.FormField>
      </S.FormRow>

      <FormS.DelegationHintBox>
        <FiInfo size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
        <span>
          <strong>역대 지휘관·참모</strong>와 <strong>전신·후신 개편 계보</strong>는
          저장한 뒤 부대 상세에서 이어서 채웁니다.
        </span>
      </FormS.DelegationHintBox>
    </FormS.FormGroupSection>
  )

  /* ─────────────── 3. 시기 · 소재지 · 설명 ─────────────── */
  const contextSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('context')}
      aria-labelledby="military-unit-section-context-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-context-title">
        시기 · 소재지 · 설명
        {contextCount > 0 ? (
          <FormS.FormGroupSummaryBadge>{contextCount}개 입력</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel as="div">
          존속 기간<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <FormS.DateRangeGrid>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>창설</FormS.SubTitleLabel>
              <InlineDateField
                appearance="field"
                ariaLabel="창설일"
                anchorId={estCalendarAnchorId}
                pickerOpen={establishedDateModalOpen}
                era={establishedEra}
                year={establishedYear}
                month={establishedMonth}
                day={establishedDay}
                onEra={(nextEra) => {
                  setEstablishedEra(nextEra)
                  markDirty(true)
                }}
                onYear={(nextYear) => {
                  setEstablishedYear(nextYear)
                  markDirty(true)
                }}
                onMonth={(nextMonth) => {
                  setEstablishedMonth(nextMonth)
                  markDirty(true)
                }}
                onDay={(nextDay) => {
                  setEstablishedDay(nextDay)
                  markDirty(true)
                }}
                onOpenPicker={() => {
                  playClickSound()
                  setEstablishedDateModalOpen(true)
                }}
              />
            </FormS.DateColumn>

            <FormS.DateColumn>
              <FormS.SubTitleLabel>해산 · 개편 종결</FormS.SubTitleLabel>
              <InlineDateField
                appearance="field"
                ariaLabel="해산일"
                anchorId={disbCalendarAnchorId}
                pickerOpen={disbandedDateModalOpen}
                error={isDateOrderInverted}
                ariaDescribedBy={isDateOrderInverted ? 'military-unit-date-error' : undefined}
                era={disbandedEra}
                year={disbandedYear}
                month={disbandedMonth}
                day={disbandedDay}
                onEra={(nextEra) => {
                  setDisbandedEra(nextEra)
                  markDirty(true)
                }}
                onYear={(nextYear) => {
                  setDisbandedYear(nextYear)
                  // 해산 연도를 쓰면 운용 상태도 '해체'로 — 둘이 엇갈린 채 저장되지 않게
                  if (nextYear.trim()) setIsActive(false)
                  markDirty(true)
                }}
                onMonth={(nextMonth) => {
                  setDisbandedMonth(nextMonth)
                  markDirty(true)
                }}
                onDay={(nextDay) => {
                  setDisbandedDay(nextDay)
                  markDirty(true)
                }}
                onOpenPicker={() => {
                  playClickSound()
                  setDisbandedDateModalOpen(true)
                }}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          {isDateOrderInverted ? (
            <S.ErrorMessage id="military-unit-date-error" role="alert">
              해산 시점이 창설 시점보다 앞설 수 없습니다.
            </S.ErrorMessage>
          ) : null}
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          주둔지 · 본영<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <PlaceSelect
            countryId={countryId || defaultCountryId || undefined}
            disabled={!hasCountry}
            value={garrisonPlace}
            onChange={(placeVal) => {
              setGarrisonPlace(placeVal)
              markDirty(true)
            }}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          부대 휘장<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <input
            ref={insigniaInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(changeEvent) => {
              const file = changeEvent.target.files?.[0]
              if (file) void handleInsigniaFile(file)
              changeEvent.target.value = ''
            }}
          />
          {insigniaUrl ? (
            <KitUploadFilled>
              <KitUploadThumb>
                <FormS.InsigniaImg
                  src={getUploadImageUrl(insigniaUrl)}
                  alt="부대 휘장 미리보기"
                />
              </KitUploadThumb>
              <KitUploadText>휘장 이미지 등록됨</KitUploadText>
              <KitUploadActions>
                <KitUploadRemove
                  type="button"
                  onClick={() => {
                    setInsigniaUrl('')
                    markDirty(true)
                  }}
                >
                  제거
                </KitUploadRemove>
              </KitUploadActions>
            </KitUploadFilled>
          ) : (
            <KitUploadStrip
              type="button"
              $dragOver={insigniaDragOver}
              disabled={insigniaUploading}
              onClick={() => insigniaInputRef.current?.click()}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                setInsigniaDragOver(true)
              }}
              onDragLeave={() => setInsigniaDragOver(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setInsigniaDragOver(false)
                const droppedFile = dropEvent.dataTransfer.files?.[0]
                if (droppedFile) void handleInsigniaFile(droppedFile)
              }}
            >
              <FiImage size={15} aria-hidden="true" />
              <KitUploadText>
                {insigniaUploading
                  ? '휘장 업로드 중…'
                  : '클릭하거나 이미지를 끌어다 놓아 휘장 업로드'}
              </KitUploadText>
            </KitUploadStrip>
          )}
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-description">
          설명 · 연혁<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.TextArea
            id="military-unit-form-description"
            rows={4}
            placeholder="창설 배경, 핵심 작전, 개편 연혁 등"
            value={description}
            onChange={updateTextField(setDescription)}
          />
        </S.FormField>
      </S.FormRow>

      {showDetailedSpecs ? (
        <S.FormRow>
          <S.FormLabel as="div">
            편제 세부<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </S.FormLabel>
          <S.FormField>
            <FormS.SubTitleGrid>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>병력 규모 · 정원</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="예: 약 15만 명, 3개 사단"
                  value={strength}
                  onChange={updateTextField(setStrength)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>관할 · 작전구역</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="예: 동부전선 중부"
                  value={jurisdiction}
                  onChange={updateTextField(setJurisdiction)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>주요 임무 · 역할</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="예: 전략 기동, 상륙 작전"
                  value={primaryMission}
                  onChange={updateTextField(setPrimaryMission)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField>
                <FormS.SubTitleLabel>주요 참전 전투</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="대표 전투·작전명"
                  value={notableBattles}
                  onChange={updateTextField(setNotableBattles)}
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField style={{ gridColumn: '1 / -1' }}>
                <FormS.SubTitleLabel>부대 표창 · 수훈</FormS.SubTitleLabel>
                <S.Input
                  type="text"
                  placeholder="대통령 부대표창 등"
                  value={honors}
                  onChange={updateTextField(setHonors)}
                />
              </FormS.SubTitleField>
            </FormS.SubTitleGrid>
          </S.FormField>
        </S.FormRow>
      ) : null}

      <FormS.OptionalRevealRow>
        <FormS.OptionalRevealBtn
          type="button"
          $open={showDetailedSpecs}
          aria-expanded={showDetailedSpecs}
          onClick={() => setShowDetailedSpecs((prev) => !prev)}
        >
          {showDetailedSpecs ? '− ' : '+ '}병력 · 관할 · 임무 · 전투 · 수훈
        </FormS.OptionalRevealBtn>
      </FormS.OptionalRevealRow>
    </FormS.FormGroupSection>
  )

  /** 고른 군종 색 — 섹션 머리 점·요약 배지가 따라간다(사건 폼의 분야 색 자리) */
  const branchToneStyle = selectedBranchDef
    ? ({
        '--unit-branch-rgb': selectedBranchDef.rgb,
        '--unit-branch-accent': selectedBranchDef.accent,
        '--unit-branch-text': isDarkMode
          ? selectedBranchDef.textDark
          : selectedBranchDef.text,
      } as React.CSSProperties)
    : undefined

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        title={isEdit ? '사령부·부대 수정' : '사령부·부대 등록'}
        headerActions={
          <HeaderActionsBar>
            <SectionJumpNav aria-label="폼 섹션 이동">
              {FORM_SECTION_META.map((sectionItem) => {
                const isActiveSection = activeSection === sectionItem.key
                const badgeText = sectionBadgeOf(sectionItem.key)
                return (
                  <SectionJumpBtn
                    key={sectionItem.key}
                    type="button"
                    $active={isActiveSection}
                    aria-label={sectionItem.label}
                    aria-current={isActiveSection ? 'location' : undefined}
                    onClick={() => scrollToSection(sectionItem.key)}
                  >
                    <span>{sectionItem.label}</span>
                    {badgeText ? (
                      <FormS.SectionJumpBadge $done={badgeText === '✓'} aria-hidden="true">
                        {badgeText}
                      </FormS.SectionJumpBadge>
                    ) : null}
                  </SectionJumpBtn>
                )
              })}
            </SectionJumpNav>
            <FormS.LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              aria-pressed={layoutMode === 'split'}
              aria-label={
                layoutMode === 'split' ? '1단 세로 보기로 전환' : '2단 좌우 분할 보기로 전환'
              }
              title={
                layoutMode === 'split'
                  ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                  : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
              }
              onClick={toggleLayoutMode}
            >
              <FiColumns size={13} aria-hidden="true" />
              <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
            </FormS.LayoutModeToggleBtn>
            {!isEdit && isDirty && !busy ? (
              <HeaderResetBtn
                type="button"
                aria-label="작성 내용 초기화"
                title="입력한 내용을 모두 비우고 처음 상태로 되돌립니다"
                onClick={() => {
                  void handleResetForm()
                }}
              >
                초기화
              </HeaderResetBtn>
            ) : null}
          </HeaderActionsBar>
        }
        maxWidth={layoutMode === 'split' ? 'min(1440px, 96vw)' : 'min(1040px, 96vw)'}
        minHeight="90vh"
        height={layoutMode === 'split' ? '90vh' : undefined}
        fullBleedOnMobile
        // 저장 중에는 Esc·오버레이로 닫히지 않게 — 요청이 날아간 뒤 UI만 사라지는 상태 방지
        closeOnEsc={!loading}
        closeOnOverlayClick={!loading}
      >
        <FormS.MilitaryModalFormScroll
          ref={scrollContainerRef}
          $layoutMode={layoutMode}
          onScroll={handleFormScroll}
          onScrollCapture={handleFormScroll}
          style={branchToneStyle}
        >
          {loading ? (
            <FormS.BusyBar role="status" aria-live="polite">
              {isEdit ? '수정 사항을 저장하는 중...' : '부대를 등록하는 중...'}
            </FormS.BusyBar>
          ) : null}
          {/* 수정 모드에서 부대를 불러오는 동안 — 빈 폼 대신 도는 로딩 */}
          {hydratingUnit ? (
            <KitFormLoading label="부대 정보를 불러오는 중" />
          ) : (
            <FormS.FormReveal>
              <S.FormSection>
                {layoutMode === 'split' ? (
                  <FormS.SplitColumnsGrid>
                    <FormS.SplitColumnLeft id={SPLIT_LEFT_ID}>
                      {basicSectionNode}
                      {contextSectionNode}
                    </FormS.SplitColumnLeft>
                    <FormS.SplitColumnRight id={SPLIT_RIGHT_ID}>
                      {commandSectionNode}
                    </FormS.SplitColumnRight>
                  </FormS.SplitColumnsGrid>
                ) : (
                  <>
                    {basicSectionNode}
                    {commandSectionNode}
                    {contextSectionNode}
                  </>
                )}
              </S.FormSection>
            </FormS.FormReveal>
          )}
        </FormS.MilitaryModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={!isValid && Boolean(firstMissing || isDateOrderInverted)}>
            {firstMissing ? (
              <FooterJumpButton
                type="button"
                onClick={focusFirstMissingField}
                title="클릭하면 해당 필수 입력 칸으로 이동합니다"
              >
                <span>필수 입력: {firstMissing.label}</span>
                {missingFields.length > 1 ? (
                  <FooterMissingCount>외 {missingFields.length - 1}건</FooterMissingCount>
                ) : null}
                <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
              </FooterJumpButton>
            ) : isDateOrderInverted ? (
              <FooterJumpButton
                type="button"
                onClick={() => scrollToSection('context')}
                title="클릭하면 존속 기간 칸으로 이동합니다"
              >
                <span>해산 시점이 창설 시점보다 앞섭니다</span>
                <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
              </FooterJumpButton>
            ) : isEdit ? (
              <FooterReadyGroup>
                <FooterReadyBadge>수정 준비 완료</FooterReadyBadge>
                <FooterShortcutItem>
                  <FooterKbd>⌘↵</FooterKbd>
                  <span>바로 저장</span>
                </FooterShortcutItem>
              </FooterReadyGroup>
            ) : (
              <FooterReadyGroup>
                <FooterReadyBadge>등록 준비 완료</FooterReadyBadge>
                <FooterShortcutItem>
                  <FooterKbd>⌘↵</FooterKbd>
                  <span>저장</span>
                </FooterShortcutItem>
                <FooterShortcutItem>
                  <FooterKbd>⇧⌘↵</FooterKbd>
                  <span>등록 후 계속</span>
                </FooterShortcutItem>
              </FooterReadyGroup>
            )}
          </FooterHint>
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={() => {
                void requestClose()
              }}
              disabled={loading}
            >
              취소
            </PersonRegisterModalCancelBtn>
            {!isEdit ? (
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={!canSubmit}
                title="저장 후 창을 닫지 않고 같은 소속·군종으로 다음 부대를 바로 이어 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
                onClick={() => {
                  void submitUnitForm({ continueAfterSave: true })
                }}
              >
                등록 후 계속
              </PersonRegisterModalCancelBtn>
            ) : null}
            <FormS.ModalPrimarySubmitBtn
              type="button"
              disabled={!canSubmit}
              title={
                hydratingUnit
                  ? '부대 정보를 불러오는 중'
                  : loading
                    ? '저장 중...'
                    : firstMissing
                      ? `필수 입력: ${firstMissing.label}`
                      : '단축키: ⌘/Ctrl + Enter'
              }
              onClick={() => {
                void submitUnitForm({ continueAfterSave: false })
              }}
            >
              {loading
                ? isEdit
                  ? '수정 중...'
                  : '등록 중...'
                : isEdit
                  ? '수정 완료'
                  : '부대 등록'}
            </FormS.ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {/*
       * 등록 완료 3지 분기. 초기 포커스는 ConfirmDialog 규약대로 '닫기' —
       * 주 액션 '상세 보기'는 화면 이탈이라, 반사적 Enter로 연속 등록 흐름이 끊기지 않게 한다.
       */}
      <ConfirmDialog
        isOpen={savedUnit !== null}
        title="사령부·부대 등록 완료"
        message={`'${savedUnit?.name ?? ''}'을(를) 등록했습니다. 상세로 이동해 역대 지휘관·개편 계보를 이어서 채우거나, 같은 소속으로 계속 등록할 수 있습니다.`}
        confirmLabel="상세 보기"
        altLabel="부대 계속 등록"
        onAlt={handleRegisterAnother}
        cancelLabel="닫기"
        onConfirm={handleViewDetail}
        onCancel={handleCloseAfterSave}
      />

      <CountryPicker
        mode="single"
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        title="소속 국가 선택"
        hintYearRange={hintYearRange ?? undefined}
        initialKind={historicalCountryId ? 'historical' : undefined}
        onSelect={(selectedCountry) => {
          if (selectedCountry.isHistorical) {
            setCountryId('')
            setHistoricalCountryId(selectedCountry.id)
            setCountryFlagEmoji('🏛️')
          } else {
            const modObj = modernCountries.find(
              (candidate) => candidate.id === selectedCountry.id,
            )
            setHistoricalCountryId('')
            setCountryId(selectedCountry.id)
            setCountryFlagEmoji(modObj?.flagEmoji || '🏳️')
          }
          setCountryName(selectedCountry.name)
          setAdministrationDepartmentId('')
          setParentUnitId('')
          markDirty(true)
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        selectedIds={[historicalCountryId || countryId].filter(Boolean)}
      />

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        anchorEl={
          establishedDateModalOpen && typeof document !== 'undefined'
            ? document.getElementById(estCalendarAnchorId)
            : null
        }
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setEstablishedEra(parsedParts.era)
            setEstablishedYear(parsedParts.year)
            setEstablishedMonth(parsedParts.month)
            setEstablishedDay(parsedParts.day)
            markDirty(true)
          }
          setEstablishedDateModalOpen(false)
        }}
        initialDate={toCalendarInitialIso(
          establishedEra,
          establishedYear,
          establishedMonth,
          establishedDay,
        )}
        title="창설일 선택"
      />

      <DatePickerModal
        isOpen={disbandedDateModalOpen}
        onClose={() => setDisbandedDateModalOpen(false)}
        anchorEl={
          disbandedDateModalOpen && typeof document !== 'undefined'
            ? document.getElementById(disbCalendarAnchorId)
            : null
        }
        onSelect={(selectedIso) => {
          const parsedParts = parseIsoPartsFallback(selectedIso)
          if (parsedParts.year) {
            setDisbandedEra(parsedParts.era)
            setDisbandedYear(parsedParts.year)
            setDisbandedMonth(parsedParts.month)
            setDisbandedDay(parsedParts.day)
            setIsActive(false)
            markDirty(true)
          }
          setDisbandedDateModalOpen(false)
        }}
        initialDate={toCalendarInitialIso(
          disbandedEra,
          disbandedYear,
          disbandedMonth,
          disbandedDay,
        )}
        title="해산일 선택"
      />
    </>
  )
}
