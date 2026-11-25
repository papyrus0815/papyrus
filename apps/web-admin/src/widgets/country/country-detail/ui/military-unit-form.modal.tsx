/**
 * 군사 사령부·부대 등록/수정 모달 — 진화형 5섹션 통합 레저 폼.
 *
 * 핵심 원칙:
 * 1. 공간(지도) 상시 통합: 주둔지·본영(`HeadquartersLocationField` 핀·위성 지도) + 관할·작전구역(`JurisdictionMapField` 다각형/전선 지도)
 * 2. 정밀 병력·전력 데이터: 시점별 편제 정원(평시/전시)·실병력·계급별 인원(장교/부사관/병)·핵심 장비 정수를 근거(`Observation`) 정본으로 직접 기록
 * 3. 5대 핵심 서술(`병력 · 관할 · 임무 · 전투 · 수훈`) 전면 `<S.TextArea>` 상시 노출 — 접힘 토글 없이 한눈에 작성·검토
 * 4. 인물·사건 양방향 정본 연결: 지휘관·참모·주요 인물(`GovernmentPositionTenure`) 및 참전 전투(`SideDeployedUnit`)·지령(`EventDepartmentRelation`) 직결
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiColumns, FiImage, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { recordRecentParticipants } from '@/entities/event/model'
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
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CreateMilitaryUnitInput,
  type MilitaryUnit,
  militaryUnitApi,
  type MilitaryUnitObservationDto,
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
  type CountryHintYearRange,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { isDefenseRelatedCategory } from '@/shared/lib/ministry-department/ministry-department-utils'
import { pathKeys } from '@/shared/router'
import { confirm, ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { CountryPicker } from '@/shared/ui/country-picker'
import { HeadquartersLocationField } from '@/shared/ui/headquarters-location-field'
import {
  type JurisdictionGeometry,
  JurisdictionMapField,
} from '@/shared/ui/jurisdiction-map-field'
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
  readInitialLayoutMode,
  RESET_CONFIRM_MESSAGE,
  toSignedComparableYear,
  UNIT_TYPE_GROUPS,
  UNIT_TYPES,
} from './military-unit-form/constants'
import {
  countFilledStrengthFields,
  createEmptyStrengthSnapshot,
  hydrateStrengthSnapshots,
  StrengthSnapshotsEditor,
  syncStrengthSnapshotsForUnit,
  type UnitStrengthSnapshotDraft,
  validateStrengthSnapshots,
} from './military-unit-form/strength-snapshots-editor'
import { StructuredPartsDateField } from './military-unit-form/structured-parts-date-field'
import * as FormS from './military-unit-form/styles'
import { UnitCountryField } from './military-unit-form/unit-country-field'
import {
  hydrateUnitEventDrafts,
  syncUnitEventDrafts,
  type UnitEventLinkDraft,
  UnitEventLinksEditor,
} from './military-unit-form/unit-event-links-editor'
import {
  hydrateUnitPersonDrafts,
  syncUnitPersonDrafts,
  type UnitPersonLinkDraft,
  UnitPersonLinksEditor,
  validateUnitPersonDrafts,
} from './military-unit-form/unit-person-links-editor'

const SPLIT_LEFT_ID = 'military-unit-split-left'
const SPLIT_RIGHT_ID = 'military-unit-split-right'
const NAME_INPUT_ID = 'military-unit-form-name'
const COUNTRY_SEARCH_ID = 'military-unit-form-country-search'

const RIGHT_COLUMN_SECTIONS = new Set<FormSectionKey>(['command', 'records'])

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

  // 기본 정보 내 보조 토글 (원어·별칭 / 사령부 프리셋 / 전체 제대)
  const [showHighCommandPresets, setShowHighCommandPresets] = useState(false)
  const [showForeignAndMottoFields, setShowForeignAndMottoFields] =
    useState(false)
  const [showAllUnitTypes, setShowAllUnitTypes] = useState(false)

  // 빠른 검색 입력
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
  const [insigniaUrl, setInsigniaUrl] = useState('')

  // 2. 시기 · 주둔지 · 관할 지도
  const [establishedEra, setEstablishedEra] = useState<'AD' | 'BC'>('AD')
  const [establishedYear, setEstablishedYear] = useState('')
  const [establishedMonth, setEstablishedMonth] = useState('')
  const [establishedDay, setEstablishedDay] = useState('')
  const [disbandedEra, setDisbandedEra] = useState<'AD' | 'BC'>('AD')
  const [disbandedYear, setDisbandedYear] = useState('')
  const [disbandedMonth, setDisbandedMonth] = useState('')
  const [disbandedDay, setDisbandedDay] = useState('')
  const [garrison, setGarrison] = useState('')
  const [garrisonLatitude, setGarrisonLatitude] = useState<number | null>(null)
  const [garrisonLongitude, setGarrisonLongitude] = useState<number | null>(null)
  const [jurisdiction, setJurisdiction] = useState('')
  const [jurisdictionGeometry, setJurisdictionGeometry] =
    useState<JurisdictionGeometry | null>(null)

  // 3. 병력 · 편제 전력 (정량 스냅샷 + 상시 노출 서술)
  const [strengthSnapshots, setStrengthSnapshots] = useState<
    UnitStrengthSnapshotDraft[]
  >(() => [createEmptyStrengthSnapshot()])
  const [initialObservations, setInitialObservations] = useState<
    MilitaryUnitObservationDto[]
  >([])
  const [strength, setStrength] = useState('')

  // 4. 소속 · 인물 · 사건 연결
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryFlagEmoji, setCountryFlagEmoji] = useState('')
  const [parentUnitId, setParentUnitId] = useState('')
  const [administrationDepartmentId, setAdministrationDepartmentId] =
    useState('')
  const [personDrafts, setPersonDrafts] = useState<UnitPersonLinkDraft[]>([])
  const [initialTenureIds, setInitialTenureIds] = useState<string[]>([])
  const [eventDrafts, setEventDrafts] = useState<UnitEventLinkDraft[]>([])
  const [initialDeployments, setInitialDeployments] = useState<
    Array<{ id: string; eventId: string; sideId: string }>
  >([])
  const [initialRelations, setInitialRelations] = useState<
    Array<{ relationId: string; eventId: string }>
  >([])

  // 5. 임무 · 전투 · 수훈 · 연혁 (전부 상시 노출 Textarea)
  const [primaryMission, setPrimaryMission] = useState('')
  const [notableBattles, setNotableBattles] = useState('')
  const [honors, setHonors] = useState('')
  const [description, setDescription] = useState('')

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

  const scrollToSection = useCallback(
    (sectionKey: FormSectionKey) => {
      setActiveSection(sectionKey)
      const splitActive = layoutMode === 'split' && isSplitActiveViewport()
      if (splitActive) {
        if (sectionKey === 'basic') {
          document
            .getElementById(SPLIT_LEFT_ID)
            ?.scrollTo?.({ top: 0, behavior: 'smooth' })
          return
        }
        if (sectionKey === 'command') {
          document
            .getElementById(SPLIT_RIGHT_ID)
            ?.scrollTo?.({ top: 0, behavior: 'smooth' })
          return
        }
      }
      document
        .getElementById(sectionIdOf(sectionKey))
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    [layoutMode],
  )

  const handleFormScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const isRightPane = target?.id === SPLIT_RIGHT_ID
    const isLeftPane = target?.id === SPLIT_LEFT_ID
    const container =
      isLeftPane || isRightPane ? target : event.currentTarget
    if (!container) return
    const threshold = container.getBoundingClientRect().top + 96
    let currentKey: FormSectionKey = isRightPane ? 'command' : 'basic'
    for (const item of FORM_SECTION_META) {
      if (isLeftPane && RIGHT_COLUMN_SECTIONS.has(item.key)) continue
      if (isRightPane && !RIGHT_COLUMN_SECTIONS.has(item.key)) continue
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
        // 국가 목록 실패 시 전체 목록 피커에서 재시도
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      isOpen && countryId ? countryId : '',
    )

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
      const effectiveBranch = keepCtx ? branch : (defaultBranch ?? '')
      setName('')
      setAbbreviation('')
      setNameLocal('')
      setNameEn('')
      setUnitType('')
      setNickname('')
      setMotto('')
      setIsActive(true)
      setInsigniaUrl('')
      setEstablishedEra('AD')
      setEstablishedYear('')
      setEstablishedMonth('')
      setEstablishedDay('')
      setDisbandedEra('AD')
      setDisbandedYear('')
      setDisbandedMonth('')
      setDisbandedDay('')
      setGarrison('')
      setGarrisonLatitude(null)
      setGarrisonLongitude(null)
      setJurisdiction('')
      setJurisdictionGeometry(null)
      setStrengthSnapshots([
        createEmptyStrengthSnapshot({ branch: effectiveBranch }),
      ])
      setInitialObservations([])
      setStrength('')
      setPersonDrafts([])
      setInitialTenureIds([])
      setEventDrafts([])
      setInitialDeployments([])
      setInitialRelations([])
      setPrimaryMission('')
      setNotableBattles('')
      setHonors('')
      setDescription('')
      setShowForeignAndMottoFields(false)
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
      branch,
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
        setInsigniaUrl(unitData.insigniaUrl ?? '')
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

        setGarrison(unitData.garrison ?? '')
        setGarrisonLatitude(
          unitData.garrisonLatitude != null &&
            unitData.garrisonLongitude != null
            ? Number(unitData.garrisonLatitude)
            : null,
        )
        setGarrisonLongitude(
          unitData.garrisonLatitude != null &&
            unitData.garrisonLongitude != null
            ? Number(unitData.garrisonLongitude)
            : null,
        )
        setJurisdiction(unitData.jurisdiction ?? '')
        setJurisdictionGeometry(unitData.jurisdictionGeometry ?? null)

        const unitObs = unitData.unitObservations ?? []
        setInitialObservations(unitObs)
        setStrengthSnapshots(
          hydrateStrengthSnapshots(unitObs, unitData.branch ?? ''),
        )
        setStrength(unitData.strength ?? '')

        const tenures = unitData.tenures ?? []
        setPersonDrafts(hydrateUnitPersonDrafts(tenures))
        setInitialTenureIds(
          tenures
            .map((tenureRow: { id?: unknown }) =>
              tenureRow?.id ? String(tenureRow.id) : '',
            )
            .filter(Boolean),
        )

        const deps: NonNullable<MilitaryUnit['sideDeployedUnits']> =
          unitData.sideDeployedUnits ?? []
        const rels: NonNullable<MilitaryUnit['eventRelations']> =
          unitData.eventRelations ?? []
        setEventDrafts(
          hydrateUnitEventDrafts({
            sideDeployedUnits: deps,
            eventRelations: rels,
          }),
        )
        setInitialDeployments(
          deps
            .filter(
              (depItem: {
                id?: string
                side?: { id?: string; event?: { id?: string } }
              }) =>
                Boolean(
                  depItem?.id &&
                    depItem?.side?.id &&
                    depItem?.side?.event?.id,
                ),
            )
            .map(
              (depItem: {
                id: string
                side: { id: string; event: { id: string } }
              }) => ({
                id: String(depItem.id),
                eventId: String(depItem.side.event.id),
                sideId: String(depItem.side.id),
              }),
            ),
        )
        setInitialRelations(
          rels
            .filter(
              (relItem: { relationId?: string; event?: { id?: string } }) =>
                Boolean(relItem?.relationId && relItem?.event?.id),
            )
            .map(
              (relItem: { relationId: string; event: { id: string } }) => ({
                relationId: String(relItem.relationId),
                eventId: String(relItem.event.id),
              }),
            ),
        )

        setPrimaryMission(unitData.primaryMission ?? '')
        setNotableBattles(unitData.notableBattles ?? '')
        setHonors(unitData.honors ?? '')
        setDescription(unitData.description ?? '')

        setShowForeignAndMottoFields(
          Boolean(
            unitData.nameLocal ||
              unitData.nameEn ||
              unitData.nickname ||
              unitData.motto,
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
      if (isDateOrderInverted) scrollToSection('spatial')
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
      scrollToSection('spatial')
      return
    }

    const strengthValidationError = validateStrengthSnapshots(strengthSnapshots)
    if (strengthValidationError) {
      notify.error(strengthValidationError)
      scrollToSection('strength')
      return
    }

    const personValidationError = validateUnitPersonDrafts(personDrafts)
    if (personValidationError) {
      notify.error(personValidationError)
      scrollToSection('command')
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
      scrollToSection('spatial')
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
      scrollToSection('spatial')
      return
    }

    const hasValidCoordPair =
      garrisonLatitude != null &&
      garrisonLongitude != null &&
      Number.isFinite(garrisonLatitude) &&
      Number.isFinite(garrisonLongitude)

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
      garrison: garrison.trim() || null,
      garrisonLatitude: hasValidCoordPair ? garrisonLatitude : null,
      garrisonLongitude: hasValidCoordPair ? garrisonLongitude : null,
      strength: strength.trim() || null,
      insigniaUrl: toUploadStoragePath(insigniaUrl) || null,
      primaryMission: primaryMission.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      jurisdictionGeometry: jurisdictionGeometry ?? null,
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

      if (savedId) {
        // 1) 정량 병력·전력 스냅샷 동기화 (Observation[subjectType=MILITARY_UNIT])
        const hasAnyObservationChange =
          countFilledStrengthFields(strengthSnapshots) > 0 ||
          initialObservations.length > 0
        if (hasAnyObservationChange) {
          await syncStrengthSnapshotsForUnit(
            savedId,
            strengthSnapshots,
            initialObservations,
          )
        }

        // 2) 인물 연결 동기화 (GovernmentPositionTenure 정본)
        if (personDrafts.length > 0 || initialTenureIds.length > 0) {
          const { affectedPersonIds } = await syncUnitPersonDrafts({
            unitId: savedId,
            unitType,
            countryId: countryId || null,
            historicalCountryId: historicalCountryId || null,
            drafts: personDrafts,
            initialTenureIds,
          })
          for (const pid of affectedPersonIds) {
            invalidateTenureQueries(queryClient, {
              personId: pid,
              countryId: countryId || null,
              historicalCountryId: historicalCountryId || null,
            })
          }
          if (affectedPersonIds.length === 0 && initialTenureIds.length > 0) {
            invalidateTenureQueries(queryClient, {
              countryId: countryId || null,
              historicalCountryId: historicalCountryId || null,
            })
          }
        }

        // 3) 사건 연결 동기화 (SideDeployedUnit + EventDepartmentRelation 정본)
        if (
          eventDrafts.length > 0 ||
          initialDeployments.length > 0 ||
          initialRelations.length > 0
        ) {
          const { warnings } = await syncUnitEventDrafts({
            unitId: savedId,
            drafts: eventDrafts,
            initialDeployments,
            initialRelations,
          })
          if (warnings.length > 0) {
            notify.error(`사건 연결 일부 실패: ${warnings.join(' / ')}`)
          }
          void queryClient.invalidateQueries({ queryKey: ['events'] })
        }
      }

      if (historicalCountryId || countryId) {
        recordRecentParticipants([
          historicalCountryId
            ? { historicalCountryId }
            : { countryId },
        ])
      }

      void queryClient.invalidateQueries({ queryKey: militaryUnitQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
      void queryClient.invalidateQueries({ queryKey: ['administration-departments'] })
      void queryClient.invalidateQueries({ queryKey: ['observations'] })
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
  const spatialCount = [
    establishedYear.trim(),
    disbandedYear.trim(),
    garrison.trim() || garrisonLatitude != null ? 'hq' : '',
    jurisdiction.trim(),
    jurisdictionGeometry ? 'geom' : '',
  ].filter(Boolean).length

  const strengthFilledCount =
    countFilledStrengthFields(strengthSnapshots) + (strength.trim() ? 1 : 0)

  const commandLinksCount = personDrafts.length + eventDrafts.length

  const recordsCount = [
    primaryMission.trim(),
    notableBattles.trim(),
    honors.trim(),
    description.trim(),
  ].filter(Boolean).length

  const sectionBadgeOf = (sectionKey: FormSectionKey): string | null => {
    if (sectionKey === 'basic') return basicDone && !hydratingUnit ? '✓' : null
    if (sectionKey === 'spatial')
      return spatialCount > 0 ? String(spatialCount) : null
    if (sectionKey === 'strength')
      return strengthFilledCount > 0 ? String(strengthFilledCount) : null
    if (sectionKey === 'command') {
      if (!hasCountry) return null
      return commandLinksCount > 0 ? `✓+${commandLinksCount}` : '✓'
    }
    return recordsCount > 0 ? String(recordsCount) : null
  }

  const updateTextField =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (changeEvent: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(changeEvent.target.value)
      markDirty(true)
    }

  const garrisonPointForMap = useMemo(() => {
    if (
      garrisonLatitude != null &&
      garrisonLongitude != null &&
      Number.isFinite(garrisonLatitude) &&
      Number.isFinite(garrisonLongitude)
    ) {
      return {
        lat: garrisonLatitude,
        lng: garrisonLongitude,
        label: garrison.trim() || name.trim() || '본영',
      }
    }
    return null
  }, [garrisonLatitude, garrisonLongitude, garrison, name])

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

  /* ─────────────── 2. 시기 · 주둔지 · 관할 지도 ─────────────── */
  const spatialSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('spatial')}
      aria-labelledby="military-unit-section-spatial-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-spatial-title">
        시기 · 주둔지 · 관할 지도
        {spatialCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {spatialCount}개 입력
          </FormS.FormGroupSummaryBadge>
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
              <StructuredPartsDateField
                era={establishedEra}
                year={establishedYear}
                month={establishedMonth}
                day={establishedDay}
                ariaLabel="창설일"
                pickerTitle="창설일 선택"
                onOpenSound={playClickSound}
                onChange={(nextEst) => {
                  setEstablishedEra(nextEst.era)
                  setEstablishedYear(nextEst.year)
                  setEstablishedMonth(nextEst.month)
                  setEstablishedDay(nextEst.day)
                  markDirty(true)
                }}
              />
            </FormS.DateColumn>

            <FormS.DateColumn>
              <FormS.SubTitleLabel>해산 · 개편 종결</FormS.SubTitleLabel>
              <StructuredPartsDateField
                era={disbandedEra}
                year={disbandedYear}
                month={disbandedMonth}
                day={disbandedDay}
                ariaLabel="해산일"
                pickerTitle="해산일 선택"
                error={isDateOrderInverted}
                ariaDescribedBy={
                  isDateOrderInverted ? 'military-unit-date-error' : undefined
                }
                onOpenSound={playClickSound}
                onChange={(nextDisb) => {
                  setDisbandedEra(nextDisb.era)
                  setDisbandedYear(nextDisb.year)
                  setDisbandedMonth(nextDisb.month)
                  setDisbandedDay(nextDisb.day)
                  if (nextDisb.year.trim()) setIsActive(false)
                  markDirty(true)
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
          <HeadquartersLocationField
            headquarters={garrison}
            latitude={garrisonLatitude}
            longitude={garrisonLongitude}
            countryName={countryName || null}
            departmentName={name || null}
            ariaLabel="주둔지 · 사령부 본영 위치"
            placeholder="예: 이천 주둔지, 용산기지, 라슈텐부르크 늑대소굴 · Google 지도 URL 붙여넣기"
            onChange={(nextHq) => {
              setGarrison(nextHq.headquarters)
              setGarrisonLatitude(nextHq.headquartersLatitude)
              setGarrisonLongitude(nextHq.headquartersLongitude)
              markDirty(true)
            }}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-jurisdiction">
          관할 · 작전구역<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <JurisdictionMapField
            value={jurisdictionGeometry}
            onChange={(nextGeom) => {
              setJurisdictionGeometry(nextGeom)
              markDirty(true)
            }}
            garrisonPoint={garrisonPointForMap}
            accentColor={selectedBranchDef?.accent}
            countryName={countryName || null}
          />
          <S.TextArea
            id="military-unit-form-jurisdiction"
            rows={3}
            placeholder="관할 군관구·위수지역, 담당 전선 정면, 작전 해역 등을 자세히 기록하세요 (예: 백러시아·동부전선 중부 축선 담당)"
            value={jurisdiction}
            onChange={updateTextField(setJurisdiction)}
          />
        </S.FormField>
      </S.FormRow>
    </FormS.FormGroupSection>
  )

  /* ─────────────── 3. 병력 · 편제 전력 (카드 없이 평면 행 상시 노출) ─────────────── */
  const strengthSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('strength')}
      aria-labelledby="military-unit-section-strength-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-strength-title">
        병력 · 편제 전력
        {strengthFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {strengthFilledCount}개 수치·서술
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <StrengthSnapshotsEditor
        snapshots={strengthSnapshots}
        onChange={(nextSnaps) => {
          setStrengthSnapshots(nextSnaps)
          markDirty(true)
        }}
        branch={branch}
        defaultEstablishedEra={establishedEra}
        defaultEstablishedYear={establishedYear}
      />

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-strength">
          병력 · 편제 서술<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.TextArea
            id="military-unit-form-strength"
            rows={3}
            placeholder="직할대 구성, 예하 보병·기갑·포병 연대 편성, 평시/전시 보충 체계 및 시기별 개편 변천을 자세히 서술하세요"
            value={strength}
            onChange={updateTextField(setStrength)}
          />
        </S.FormField>
      </S.FormRow>
    </FormS.FormGroupSection>
  )

  /* ─────────────── 4. 소속 · 인물 · 사건 연결 ─────────────── */
  const commandSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('command')}
      aria-labelledby="military-unit-section-command-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-command-title">
        소속 · 인물 · 사건 연결
        {countryName ? (
          <FormS.FormGroupSummaryBadge>{countryName}</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel htmlFor={hasCountry ? undefined : COUNTRY_SEARCH_ID}>
          소속 국가 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <UnitCountryField
            inputId={COUNTRY_SEARCH_ID}
            unitName={name}
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            countryName={countryName}
            countryFlagEmoji={countryFlagEmoji}
            modernCountries={modernCountries}
            historicalCountries={historicalCountries}
            linkedEraChips={linkedEraChips}
            hintYearRange={hintYearRange}
            locked={lockCountryAndDepartment}
            onClickSound={playClickSound}
            onOpenCountryModal={() => setCountryModalOpen(true)}
            onSelectCountry={(nextCountry) => {
              const changedCountryScope =
                nextCountry.countryId !== countryId ||
                nextCountry.historicalCountryId !== historicalCountryId
              setCountryId(nextCountry.countryId)
              setHistoricalCountryId(nextCountry.historicalCountryId)
              setCountryName(nextCountry.countryName)
              setCountryFlagEmoji(nextCountry.countryFlagEmoji)
              if (changedCountryScope) {
                setParentUnitId('')
                setAdministrationDepartmentId('')
              }
              markDirty(true)
            }}
            onClearCountry={() => {
              setCountryId('')
              setHistoricalCountryId('')
              setCountryName('')
              setCountryFlagEmoji('')
              setParentUnitId('')
              setAdministrationDepartmentId('')
              markDirty(true)
            }}
          />
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

      <S.FormRow>
        <S.FormLabel as="div">
          인물 연결<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <UnitPersonLinksEditor
            drafts={personDrafts}
            onChange={(nextPersons) => {
              setPersonDrafts(nextPersons)
              markDirty(true)
            }}
            unitType={unitType}
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            countryName={countryName}
            establishedEra={establishedEra}
            establishedYear={establishedYear}
            disbandedEra={disbandedEra}
            disbandedYear={disbandedYear}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">
          사건 연결<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <UnitEventLinksEditor
            drafts={eventDrafts}
            onChange={(nextEvents) => {
              setEventDrafts(nextEvents)
              markDirty(true)
            }}
            unitType={unitType}
            countryId={countryId}
            historicalCountryId={historicalCountryId}
            countryName={countryName}
          />
        </S.FormField>
      </S.FormRow>
    </FormS.FormGroupSection>
  )

  /* ─────────────── 5. 임무 · 전투 · 수훈 · 연혁 (전부 Textarea 상시 노출) ─────────────── */
  const recordsSectionNode = (
    <FormS.FormGroupSection
      id={sectionIdOf('records')}
      aria-labelledby="military-unit-section-records-title"
    >
      <FormS.FormGroupTitle id="military-unit-section-records-title">
        임무 · 전투 · 수훈 · 연혁
        {recordsCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {recordsCount}개 입력
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-primary-mission">
          주요 임무 · 역할<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.TextArea
            id="military-unit-form-primary-mission"
            rows={3}
            placeholder="평시 경계·억제 임무, 전시 작전계획상 기동·돌파·상륙·방공 등 핵심 임무를 서술하세요"
            value={primaryMission}
            onChange={updateTextField(setPrimaryMission)}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-notable-battles">
          주요 참전 전투<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.TextArea
            id="military-unit-form-notable-battles"
            rows={3}
            placeholder="위 ‘사건 연결’로 정본 전투·작전을 연결하고, 세부 교전 일지·전역 경과 요약을 함께 서술하세요"
            value={notableBattles}
            onChange={updateTextField(setNotableBattles)}
          />
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor="military-unit-form-honors">
          부대 표창 · 수훈<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.TextArea
            id="military-unit-form-honors"
            rows={3}
            placeholder="대통령 부대표창, 근위(Guards) 칭호 승격, 국내외 훈장·부대기 수훈 내역을 기록하세요"
            value={honors}
            onChange={updateTextField(setHonors)}
          />
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
            placeholder="창설 배경, 시대별 개편 연혁, 역사적 의의 등 종합 설명"
            value={description}
            onChange={updateTextField(setDescription)}
          />
        </S.FormField>
      </S.FormRow>
    </FormS.FormGroupSection>
  )

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
                      <FormS.SectionJumpBadge
                        $done={badgeText.startsWith('✓')}
                        aria-hidden="true"
                      >
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
        maxWidth={layoutMode === 'split' ? 'min(1480px, 96vw)' : 'min(1080px, 96vw)'}
        minHeight="90vh"
        height={layoutMode === 'split' ? '90vh' : undefined}
        fullBleedOnMobile
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
          {hydratingUnit ? (
            <KitFormLoading label="부대 정보를 불러오는 중" />
          ) : (
            <FormS.FormReveal>
              <S.FormSection>
                {layoutMode === 'split' ? (
                  <FormS.SplitColumnsGrid>
                    <FormS.SplitColumnLeft id={SPLIT_LEFT_ID}>
                      {basicSectionNode}
                      {spatialSectionNode}
                      {strengthSectionNode}
                    </FormS.SplitColumnLeft>
                    <FormS.SplitColumnRight id={SPLIT_RIGHT_ID}>
                      {commandSectionNode}
                      {recordsSectionNode}
                    </FormS.SplitColumnRight>
                  </FormS.SplitColumnsGrid>
                ) : (
                  <>
                    {basicSectionNode}
                    {spatialSectionNode}
                    {strengthSectionNode}
                    {commandSectionNode}
                    {recordsSectionNode}
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
                onClick={() => scrollToSection('spatial')}
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

      <ConfirmDialog
        isOpen={savedUnit !== null}
        title="사령부·부대 등록 완료"
        message={`'${savedUnit?.name ?? ''}'을(를) 등록했습니다. 상세로 이동해 편제·지도·전사를 확인하거나, 같은 소속으로 계속 등록할 수 있습니다.`}
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
    </>
  )
}
