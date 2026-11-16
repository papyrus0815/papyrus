import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  type UIEvent,
} from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiAward,
  FiBookmark,
  FiBriefcase,
  FiClock,
  FiColumns,
  FiExternalLink,
  FiFlag,
  FiGlobe,
  FiImage,
  FiLayers,
  FiPlus,
  FiShield,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled, { type DefaultTheme } from 'styled-components'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import {
  DEPARTMENT_TRANSITION_KIND_OPTIONS,
  type DepartmentTransitionKind,
  type MinistryFormFields,
} from '@/features/government-info/model/ministry-form-fields'
import {
  administrationDepartmentApi,
  type AdministrationDepartment,
  type AdministrationDepartmentCategory,
  type AdministrationDepartmentKind,
} from '@/shared/api/administration-department'
import {
  militaryUnitApi,
  type MilitaryUnitTransitionKind,
} from '@/shared/api/military-unit'
import type { ConstituentHistoricalPolityDto } from '@/shared/api/person-career'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import {
  CORE_CATEGORY_PRIORITY_NAMES,
  CROSS_COUNTRY_CATEGORY_EXAMPLES,
  DEPARTMENT_NAME_FRAMES,
  getDepartmentNameFrame,
  inferDepartmentFrameId,
  matchDepartmentCategoryByName,
  resolveCategoryByCanonicalName,
  suggestFrameItems,
} from '@/shared/lib/ministry-department/department-name-frames'
import {
  collectDescendantDepartmentIds,
  emptyMinistryFormFields,
  hasDefenseExtensionContent,
  isDefenseRelatedCategory,
  ministryFormFieldsFromDepartment,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import {
  buildPartialDateString,
  isPartialRangeInverted,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { FormTextarea } from '@/shared/ui/form-input/form-input'
import { HeadquartersLocationField } from '@/shared/ui/headquarters-location-field'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  ChoiceChips,
  type ChoiceChipOption,
  KitAddButton,
  KitBusyBar,
  KitRemoveButton,
  KitUploadActions,
  KitUploadButton,
  KitUploadFilled,
  KitUploadRemove,
  KitUploadStrip,
  KitUploadText,
  KitUploadThumb,
  kitC,
} from '@/shared/ui/register-form-kit/register-form-kit'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormGroup,
  FormGroupTitle,
  Input,
  LabeledRowsWrap,
  OptionalTag,
  Required,
  SubField,
  SubFieldLabel,
  SubFieldPair,
} from '@/shared/ui/register-form-layout'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterActions,
  FooterHint,
  FooterJumpArrow,
  FooterJumpButton,
  FooterKbd,
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
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

const LAYOUT_STORAGE_KEY = 'papyrus:ministry-register-layout'
const DIRECT_POLITY_SENTINEL = '__DIRECT_COUNTRY__'
const COLLAPSED_PRESET_LIMIT = 6

const FORM_SECTION_LINKS = [
  { id: 'ministry-form-group-basic', label: '기본 정보' },
  { id: 'ministry-form-group-lineage', label: '상하위 · 계보' },
  { id: 'ministry-form-group-context', label: '맥락 · 소개' },
] as const

type FormSectionId = (typeof FORM_SECTION_LINKS)[number]['id']

type DateDraftState = {
  era: 'BC' | 'AD'
  year: string
  month: string
  day: string
}

function readInitialLayoutMode(): 'split' | 'single' {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    return saved === 'single' ? 'single' : 'split'
  } catch {
    return 'split'
  }
}

type KindMetaItem = {
  value: AdministrationDepartmentKind
  icon: ReactNode
  label: string
  shortBadge: string
  titleHint: string
  nameLabel: string
  namePlaceholder: string
  localPlaceholder: string
  enPlaceholder: string
  abbrPlaceholder: string
  presets: ReadonlyArray<{
    name: string
    categoryName: string
    abbreviation?: string
    nameEn?: string
  }>
}

const KIND_META_LIST: ReadonlyArray<KindMetaItem> = [
  {
    value: 'MINISTRY',
    icon: <FiBriefcase size={13} />,
    label: '중앙부처',
    shortBadge: '부처·성·조',
    titleHint: '내각·행정부 소속 장관급 부처 및 전근대 6조·6부·성(省)',
    nameLabel: '부처 · 기관명',
    namePlaceholder: '예: 외무부, 국무부, 외무성, 기획재정부, 예조',
    localPlaceholder: '예: 外務省, 禮曹',
    enPlaceholder: '예: Ministry of Foreign Affairs',
    abbrPlaceholder: '약칭 (선택)',
    presets: [],
  },
  {
    value: 'AGENCY',
    icon: <FiLayers size={13} />,
    label: '외청·위원회',
    shortBadge: '외청·위원회',
    titleHint: '부처 산하 외청, 정보·치안기구, 감사원 및 국가위원회',
    nameLabel: '외청 · 기구명',
    namePlaceholder: '예: 국가정보원, 중앙정보국, 감사원, 경찰청, 국세청',
    localPlaceholder: '예: 國家情報院',
    enPlaceholder: '예: Central Intelligence Agency',
    abbrPlaceholder: '약칭 (예: CIA)',
    presets: [
      {
        name: '국가정보원',
        categoryName: '정보·정보기관',
        nameEn: 'National Intelligence Service',
      },
      {
        name: '중앙정보국',
        categoryName: '정보·정보기관',
        abbreviation: 'CIA',
        nameEn: 'Central Intelligence Agency',
      },
      {
        name: '감사원',
        categoryName: '기획·조정',
        nameEn: 'Board of Audit and Inspection',
      },
      {
        name: '경찰청',
        categoryName: '행정·안전',
        nameEn: 'National Police Agency',
      },
      {
        name: '국세청',
        categoryName: '재정·경제',
        nameEn: 'National Tax Service',
      },
    ],
  },
  {
    value: 'ROYAL_HOUSEHOLD',
    icon: <FiAward size={13} />,
    label: '원수직속·궁내',
    shortBadge: '원수직속·궁내',
    titleHint: '군주·황실 보좌 기구 및 국가원수 직속 비서실·자문원',
    nameLabel: '직속 · 궁내기구명',
    namePlaceholder: '예: 대통령비서실, 국가안보실, 궁내부, 궁내성, 추밀원',
    localPlaceholder: '예: 宮内省, 承政院',
    enPlaceholder: '예: Privy Council',
    abbrPlaceholder: '약칭 (선택)',
    presets: [
      {
        name: '대통령비서실',
        categoryName: '기타',
        nameEn: 'Office of the President',
      },
      {
        name: '궁내부',
        categoryName: '기타',
        nameEn: 'Ministry of the Royal Household',
      },
      {
        name: '추밀원',
        categoryName: '기타',
        nameEn: 'Privy Council',
      },
      {
        name: '승정원',
        categoryName: '기타',
        nameEn: 'Royal Secretariat',
      },
    ],
  },
  {
    value: 'COLONIAL_GOVERNMENT',
    icon: <FiGlobe size={13} />,
    label: '총독부·점령청',
    shortBadge: '총독부·점령청',
    titleHint: '식민지·속령·점령지 통치를 위해 설치된 총독부 및 민정청',
    nameLabel: '총독부 · 통치기구명',
    namePlaceholder: '예: 조선총독부, 인도 정청, 대만총독부, 군정청',
    localPlaceholder: '예: 朝鮮總督府',
    enPlaceholder: '예: Government-General',
    abbrPlaceholder: '약칭 (선택)',
    presets: [
      {
        name: '조선총독부',
        categoryName: '기타',
        nameEn: 'Government-General of Korea',
      },
      {
        name: '군정청',
        categoryName: '행정·안전',
        nameEn: 'Military Government',
      },
    ],
  },
  {
    value: 'OTHER',
    icon: <FiBriefcase size={13} />,
    label: '헌법·사법·입법·기타',
    shortBadge: '헌법·독립·기타',
    titleHint: '대법원·재판소, 국회·의회 사무처, 선관위 등 헌법·독립 국가기구',
    nameLabel: '국가기관명',
    namePlaceholder: '예: 대법원, 헌법재판소, 중앙선거관리위원회, 국회사무처',
    localPlaceholder: '원어·한자 표기 (선택)',
    enPlaceholder: '예: Supreme Court',
    abbrPlaceholder: '약칭 (선택)',
    presets: [
      {
        name: '대법원',
        categoryName: '기타',
        nameEn: 'Supreme Court',
      },
      {
        name: '헌법재판소',
        categoryName: '기타',
        nameEn: 'Constitutional Court',
      },
      {
        name: '중앙선거관리위원회',
        categoryName: '기타',
        nameEn: 'National Election Commission',
      },
      {
        name: '국회사무처',
        categoryName: '기타',
        nameEn: 'National Assembly Secretariat',
      },
    ],
  },
]

const KIND_CHIP_OPTIONS: ChoiceChipOption<AdministrationDepartmentKind>[] =
  KIND_META_LIST.map((metaItem) => ({
    value: metaItem.value,
    label: metaItem.label,
    title: metaItem.titleHint,
  }))

export function buildDateDraftFromForm(
  era: 'BC' | 'AD' | undefined,
  year: number | null,
  month: number | null,
  day: number | null,
  isoFallback?: string,
): DateDraftState {
  if (year != null && Number.isFinite(year) && year > 0) {
    return {
      era: era === 'BC' ? 'BC' : 'AD',
      year: String(Math.abs(year)),
      month:
        month != null && month >= 1 && month <= 12
          ? String(month).padStart(2, '0')
          : '',
      day:
        day != null && day >= 1 && day <= 31
          ? String(day).padStart(2, '0')
          : '',
    }
  }
  if (isoFallback?.trim()) {
    return parsePartialDateString(isoFallback.trim())
  }
  return {
    era: era === 'BC' ? 'BC' : 'AD',
    year: '',
    month: '',
    day: '',
  }
}

function formatDepartmentSpanLabel(
  estParts: DateDraftState,
  abolParts: DateDraftState,
): string | null {
  const estNum = Number(estParts.year.trim())
  if (!estParts.year.trim() || !Number.isFinite(estNum) || estNum <= 0) {
    return null
  }
  const signedStart = estParts.era === 'BC' ? -estNum : estNum
  if (!abolParts.year.trim()) {
    return '현존'
  }
  const abolNum = Number(abolParts.year.trim())
  if (!Number.isFinite(abolNum) || abolNum <= 0) return null
  const signedEnd = abolParts.era === 'BC' ? -abolNum : abolNum
  const startMonth = Number(estParts.month) || 1
  const endMonth = Number(abolParts.month) || startMonth
  const totalMonths = (signedEnd - signedStart) * 12 + (endMonth - startMonth)
  if (totalMonths < 0) return null
  if (totalMonths === 0) return '1년 미만'
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `약 ${years}년 ${months}개월`
  if (years > 0) return `약 ${years}년`
  return `약 ${months}개월`
}

function parsePolitySpanYears(polity: {
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}): {
  startEra: 'BC' | 'AD'
  startYear: number | null
  endEra: 'BC' | 'AD'
  endYear: number | null
  label: string | null
} {
  let startEra: 'BC' | 'AD' = polity.startEra === 'BC' ? 'BC' : 'AD'
  let startYear: number | null =
    polity.startYear != null && polity.startYear > 0
      ? Math.abs(polity.startYear)
      : null
  let endEra: 'BC' | 'AD' = polity.endEra === 'BC' ? 'BC' : 'AD'
  let endYear: number | null =
    polity.endYear != null && polity.endYear > 0
      ? Math.abs(polity.endYear)
      : null

  if (startYear == null && polity.startDate) {
    const parsedStart = parsePartialDateString(polity.startDate)
    if (parsedStart.year) {
      startEra = parsedStart.era
      startYear = Number.parseInt(parsedStart.year, 10) || null
    }
  }
  if (endYear == null && polity.endDate) {
    const parsedEnd = parsePartialDateString(polity.endDate)
    if (parsedEnd.year) {
      endEra = parsedEnd.era
      endYear = Number.parseInt(parsedEnd.year, 10) || null
    }
  }

  if (startYear == null && endYear == null) {
    return { startEra, startYear: null, endEra, endYear: null, label: null }
  }
  const startLabel =
    startYear != null ? `${startEra === 'BC' ? 'BC ' : ''}${startYear}` : '?'
  const endLabel =
    endYear != null ? `${endEra === 'BC' ? 'BC ' : ''}${endYear}` : '미상'
  return {
    startEra,
    startYear,
    endEra,
    endYear,
    label: `${startLabel}–${endLabel}`,
  }
}

export type MinistryFormModalProps = {
  effectiveCountryId: string | undefined
  countryName?: string
  isHistorical?: boolean
  constituentPolities?: ConstituentHistoricalPolityDto[]
  isOpen: boolean
  isDark: boolean
  editingMinistry: AdministrationDepartment | null
  ministryForm: MinistryFormFields
  setMinistryForm: Dispatch<SetStateAction<MinistryFormFields>>
  ministriesList: AdministrationDepartment[]
  categoriesList: AdministrationDepartmentCategory[]
  setCategoriesList?: Dispatch<
    SetStateAction<AdministrationDepartmentCategory[]>
  >
  reloadCategories?: () => void
  closeMinistryFormModal: () => void
  submitMinistryForm: (options?: { continueAfterSave?: boolean }) => void
  submittingMinistry?: boolean
  batchSavedCount?: number
  thumbnailInputRef: RefObject<HTMLInputElement | null>
  thumbnailUploading: boolean
  setThumbnailUploading: (value: boolean) => void
  establishedDateModalOpen: boolean
  setEstablishedDateModalOpen: (value: boolean) => void
  abolishedDateModalOpen: boolean
  setAbolishedDateModalOpen: (value: boolean) => void
  categorySelectOpen: boolean
  setCategorySelectOpen: (value: boolean) => void
  parentSelectOpen: boolean
  setParentSelectOpen: (value: boolean) => void
  successorSelectOpen: boolean
  setSuccessorSelectOpen: (value: boolean) => void
  predecessorSelectOpen?: boolean
  setPredecessorSelectOpen?: (value: boolean) => void
}

export function MinistryFormModal(props: MinistryFormModalProps) {
  const {
    effectiveCountryId,
    countryName,
    isHistorical = false,
    constituentPolities = [],
    isOpen,
    editingMinistry,
    ministryForm,
    setMinistryForm,
    ministriesList,
    categoriesList,
    setCategoriesList,
    reloadCategories,
    closeMinistryFormModal,
    submitMinistryForm,
    submittingMinistry = false,
    batchSavedCount = 0,
    thumbnailInputRef,
    thumbnailUploading,
    setThumbnailUploading,
    establishedDateModalOpen,
    setEstablishedDateModalOpen,
    abolishedDateModalOpen,
    setAbolishedDateModalOpen,
  } = props

  const instanceId = useId()
  const estDateAnchorId = `ministry-est-date-${instanceId}`
  const abolDateAnchorId = `ministry-abol-date-${instanceId}`

  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(
    readInitialLayoutMode,
  )
  const [activeSectionId, setActiveSectionId] = useState<FormSectionId>(
    FORM_SECTION_LINKS[0].id,
  )
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [presetsExpanded, setPresetsExpanded] = useState(false)
  const [isThumbDragOver, setIsThumbDragOver] = useState(false)

  /**
   * InlineDateField는 타이핑 중 '1' → '11' 같은 부분 숫자 문자열을 그대로 유지해야 하므로
   * 숫자 변환으로 인한 즉시 zero-pad('1' → 1 → '01')가 발생하지 않도록 문자열 드래프트를 별도 보관한다.
   */
  const [estDateDraft, setEstDateDraft] = useState<DateDraftState>(() =>
    buildDateDraftFromForm(
      ministryForm.establishedEra,
      ministryForm.establishedYear,
      ministryForm.establishedMonth,
      ministryForm.establishedDay,
      ministryForm.establishedDate,
    ),
  )
  const [abolDateDraft, setAbolDateDraft] = useState<DateDraftState>(() =>
    buildDateDraftFromForm(
      ministryForm.abolishedEra,
      ministryForm.abolishedYear,
      ministryForm.abolishedMonth,
      ministryForm.abolishedDay,
      ministryForm.abolishedDate,
    ),
  )

  const [categoryManualLocked, setCategoryManualLocked] = useState(false)
  const [categoryAutoMatched, setCategoryAutoMatched] = useState(false)
  const [overrideFrameId, setOverrideFrameId] = useState<string>('')
  const [orgDetailExpanded, setOrgDetailExpanded] = useState(false)
  const [milTransitionExpanded, setMilTransitionExpanded] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const openSessionKeyRef = useRef<string | null>(null)

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prevMode) => {
      const nextMode = prevMode === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, nextMode)
      } catch {
        // storage disabled
      }
      return nextMode
    })
  }, [])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      isOpen && !isHistorical && effectiveCountryId ? effectiveCountryId : '',
    )

  const uploadThumbnailFile = useCallback(
    async (selectedFile: File) => {
      try {
        validateImageFile(selectedFile)
        setThumbnailUploading(true)
        const uploaded = await uploadImage(selectedFile, 'ministries')
        setMinistryForm((prevForm) => ({
          ...prevForm,
          thumbnailUrl: uploaded.url,
        }))
      } catch (uploadError) {
        notify.error(
          getApiErrorMessage(uploadError, '이미지 업로드에 실패했습니다.'),
        )
      } finally {
        setThumbnailUploading(false)
      }
    },
    [setMinistryForm, setThumbnailUploading],
  )

  // 사건 등록 모달과 동일하게 클립보드 이미지 붙여넣기(Ctrl/⌘+V) 지원
  useEffect(() => {
    if (!isOpen) return
    const handlePaste = (pasteEvent: ClipboardEvent) => {
      const clipboardItems = pasteEvent.clipboardData?.items
      if (!clipboardItems) return
      for (let itemIndex = 0; itemIndex < clipboardItems.length; itemIndex += 1) {
        const clipItem = clipboardItems[itemIndex]
        if (clipItem && clipItem.type.startsWith('image/')) {
          const pastedFile = clipItem.getAsFile()
          if (pastedFile) {
            pasteEvent.preventDefault()
            void uploadThumbnailFile(pastedFile)
            return
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen, uploadThumbnailFile])

  useEffect(() => {
    if (!isOpen) {
      openSessionKeyRef.current = null
      return
    }
    const sessionKey = `${editingMinistry?.id ?? 'create'}:${batchSavedCount}`
    if (openSessionKeyRef.current === sessionKey) return
    openSessionKeyRef.current = sessionKey

    setActiveSectionId(FORM_SECTION_LINKS[0].id)
    setInlineCategoryOpen(false)
    setNewCategoryName('')
    setNewCategoryNameEn('')
    setOverrideFrameId('')
    setPresetsExpanded(false)

    setEstDateDraft(
      buildDateDraftFromForm(
        ministryForm.establishedEra,
        ministryForm.establishedYear,
        ministryForm.establishedMonth,
        ministryForm.establishedDay,
        ministryForm.establishedDate,
      ),
    )
    setAbolDateDraft(
      buildDateDraftFromForm(
        ministryForm.abolishedEra,
        ministryForm.abolishedYear,
        ministryForm.abolishedMonth,
        ministryForm.abolishedDay,
        ministryForm.abolishedDate,
      ),
    )

    const hasPresetCategory = Boolean(
      editingMinistry || ministryForm.categoryId,
    )
    setCategoryManualLocked(hasPresetCategory)
    setCategoryAutoMatched(false)

    setOrgDetailExpanded(
      Boolean(
        editingMinistry?.orgStructure?.trim() ||
          editingMinistry?.budgetNote?.trim() ||
          ministryForm.defenseOrgStructure.trim() ||
          ministryForm.defenseBudgetOrForcesNote.trim(),
      ),
    )
    setMilTransitionExpanded(
      Boolean(
        (editingMinistry?.militaryUnitSuccessors?.length ?? 0) > 0 ||
          (ministryForm.militaryUnitSuccessorTransitions?.length ?? 0) > 0,
      ),
    )

    if (!editingMinistry && batchSavedCount > 0) {
      window.setTimeout(() => nameInputRef.current?.focus(), 80)
    }
  }, [
    isOpen,
    editingMinistry,
    batchSavedCount,
    ministryForm.abolishedDate,
    ministryForm.abolishedDay,
    ministryForm.abolishedEra,
    ministryForm.abolishedMonth,
    ministryForm.abolishedYear,
    ministryForm.categoryId,
    ministryForm.defenseBudgetOrForcesNote,
    ministryForm.defenseOrgStructure,
    ministryForm.establishedDate,
    ministryForm.establishedDay,
    ministryForm.establishedEra,
    ministryForm.establishedMonth,
    ministryForm.establishedYear,
    ministryForm.militaryUnitSuccessorTransitions?.length,
  ])

  const isDateInverted = useMemo(
    () => isPartialRangeInverted(estDateDraft, abolDateDraft),
    [estDateDraft, abolDateDraft],
  )

  const spanSummary = useMemo(
    () =>
      isDateInverted
        ? null
        : formatDepartmentSpanLabel(estDateDraft, abolDateDraft),
    [isDateInverted, estDateDraft, abolDateDraft],
  )

  const isFormValid = Boolean(ministryForm.name.trim()) && !isDateInverted

  useModalSubmitShortcut({
    enabled:
      Boolean(isOpen && effectiveCountryId) &&
      isFormValid &&
      !submittingMinistry &&
      !establishedDateModalOpen &&
      !abolishedDateModalOpen,
    scrollContainerRef,
    onSubmit: ({ continueAfterSave }) => {
      submitMinistryForm({
        continueAfterSave: Boolean(continueAfterSave && !editingMinistry),
      })
    },
  })

  const scrollToSection = useCallback((sectionId: FormSectionId) => {
    setActiveSectionId(sectionId)
    const sectionEl = document.getElementById(sectionId)
    if (!sectionEl) return
    const leftPane = document.getElementById('ministry-form-split-left')
    const rightPane = document.getElementById('ministry-form-split-right')
    if (sectionId === 'ministry-form-group-lineage' && rightPane) {
      rightPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      rightPane.scrollTop = 0
      return
    }
    if (sectionId === 'ministry-form-group-basic' && leftPane) {
      leftPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      leftPane.scrollTop = 0
      return
    }
    sectionEl.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFormScroll = useCallback((scrollEvent: UIEvent<HTMLDivElement>) => {
    const scrollTarget = scrollEvent.target as HTMLElement | null
    if (scrollTarget?.id === 'ministry-form-split-right') {
      setActiveSectionId((prevId) =>
        prevId === 'ministry-form-group-lineage'
          ? prevId
          : 'ministry-form-group-lineage',
      )
      return
    }
    if (scrollTarget?.id === 'ministry-form-split-left') {
      const leftRect = scrollTarget.getBoundingClientRect()
      const contextEl = document.getElementById('ministry-form-group-context')
      const nextId: FormSectionId =
        contextEl && contextEl.getBoundingClientRect().top <= leftRect.top + 96
          ? 'ministry-form-group-context'
          : 'ministry-form-group-basic'
      setActiveSectionId((prevId) => (prevId === nextId ? prevId : nextId))
      return
    }
    const containerEl = scrollEvent.currentTarget
    const containerRect = containerEl.getBoundingClientRect()
    const threshold = containerRect.top + 96
    let currentId: FormSectionId = FORM_SECTION_LINKS[0].id
    for (const navItem of FORM_SECTION_LINKS) {
      const targetEl = document.getElementById(navItem.id)
      if (!targetEl) continue
      if (targetEl.getBoundingClientRect().top <= threshold) {
        currentId = navItem.id
      }
    }
    setActiveSectionId((prevId) => (prevId === currentId ? prevId : currentId))
  }, [])

  // 소속 시대 · 정치체 검색 드롭다운 옵션 (연대순 정렬 — 수십 개 왕조·정체도 1줄로 유지)
  const politySelectOptions = useMemo<SearchableSelectOption[]>(() => {
    if (!isHistorical) {
      if (linkedHistoricalCountries.length === 0) return []
      const enrichedList = linkedHistoricalCountries.map((histItem) => {
        const spanMeta = parsePolitySpanYears(histItem)
        return {
          raw: histItem,
          spanMeta,
          sortShape: {
            startEra: spanMeta.startEra,
            startYear: spanMeta.startYear,
            endEra: spanMeta.endEra,
            endYear: spanMeta.endYear,
          },
        }
      })
      enrichedList.sort((leftItem, rightItem) =>
        compareByCountryStart(leftItem.sortShape, rightItem.sortShape),
      )

      const directOption: SearchableSelectOption = {
        value: DIRECT_POLITY_SENTINEL,
        label: `${countryName ?? '현재 국가'} 직속`,
        meta: '현재 국가 본체',
        group: '기본 소속',
        icon: <FiFlag size={13} />,
      }
      const historicalOptions: SearchableSelectOption[] = enrichedList.map(
        ({ raw, spanMeta }) => ({
          value: raw.id,
          label: raw.name,
          meta: spanMeta.label ?? undefined,
          group: `연결된 시대 · 역사 국가 (${enrichedList.length})`,
          icon: <FiBookmark size={13} />,
          keywords: [
            raw.enName,
            spanMeta.label,
            spanMeta.startYear ? String(spanMeta.startYear) : '',
            spanMeta.endYear ? String(spanMeta.endYear) : '',
          ]
            .filter(Boolean)
            .join(' '),
        }),
      )
      return [directOption, ...historicalOptions]
    }

    if (!effectiveCountryId || constituentPolities.length === 0) return []
    const enrichedConstituents = constituentPolities.map((polityItem) => {
      const spanMeta = parsePolitySpanYears(polityItem)
      return {
        raw: polityItem,
        spanMeta,
        sortShape: {
          startEra: spanMeta.startEra,
          startYear: spanMeta.startYear,
          endEra: spanMeta.endEra,
          endYear: spanMeta.endYear,
        },
      }
    })
    enrichedConstituents.sort((leftItem, rightItem) =>
      compareByCountryStart(leftItem.sortShape, rightItem.sortShape),
    )

    const directOption: SearchableSelectOption = {
      value: DIRECT_POLITY_SENTINEL,
      label: `${countryName ?? '본국'} 직속`,
      meta: '본국 전체',
      group: '기본 소속',
      icon: <FiFlag size={13} />,
    }
    const constituentOptions: SearchableSelectOption[] =
      enrichedConstituents.map(({ raw, spanMeta }) => ({
        value: raw.id,
        label: raw.name,
        meta: spanMeta.label ?? undefined,
        group: `구성 정치체 (${enrichedConstituents.length})`,
        icon: <FiAward size={13} />,
        keywords: [
          raw.enName,
          spanMeta.label,
          spanMeta.startYear ? String(spanMeta.startYear) : '',
          spanMeta.endYear ? String(spanMeta.endYear) : '',
        ]
          .filter(Boolean)
          .join(' '),
      }))
    return [directOption, ...constituentOptions]
  }, [
    constituentPolities,
    countryName,
    effectiveCountryId,
    isHistorical,
    linkedHistoricalCountries,
  ])

  const selectedPolityValue = useMemo(() => {
    if (!isHistorical) {
      return ministryForm.historicalCountryId || DIRECT_POLITY_SENTINEL
    }
    if (
      !ministryForm.historicalCountryId ||
      ministryForm.historicalCountryId === effectiveCountryId
    ) {
      return DIRECT_POLITY_SENTINEL
    }
    return ministryForm.historicalCountryId
  }, [effectiveCountryId, isHistorical, ministryForm.historicalCountryId])

  const handlePolitySelectChange = useCallback(
    (nextValue: string) => {
      setPresetsExpanded(false)
      setOverrideFrameId('')
      if (!nextValue || nextValue === DIRECT_POLITY_SENTINEL) {
        setMinistryForm((prevForm) => ({
          ...prevForm,
          historicalCountryId: isHistorical ? (effectiveCountryId ?? '') : '',
        }))
        return
      }
      setMinistryForm((prevForm) => ({
        ...prevForm,
        historicalCountryId: nextValue,
      }))
    },
    [effectiveCountryId, isHistorical, setMinistryForm],
  )

  const selectedLinkedHist = useMemo(() => {
    if (isHistorical || !ministryForm.historicalCountryId) return null
    return (
      linkedHistoricalCountries.find(
        (histItem) => histItem.id === ministryForm.historicalCountryId,
      ) ?? null
    )
  }, [isHistorical, linkedHistoricalCountries, ministryForm.historicalCountryId])

  const selectedConstituent = useMemo(() => {
    if (!isHistorical || !ministryForm.historicalCountryId) return null
    if (ministryForm.historicalCountryId === effectiveCountryId) return null
    return (
      constituentPolities.find(
        (polityItem) => polityItem.id === ministryForm.historicalCountryId,
      ) ?? null
    )
  }, [
    constituentPolities,
    effectiveCountryId,
    isHistorical,
    ministryForm.historicalCountryId,
  ])

  const activePolityDisplayName = useMemo(() => {
    if (selectedLinkedHist?.name) return selectedLinkedHist.name
    if (selectedConstituent?.name) return selectedConstituent.name
    if (
      editingMinistry?.historicalCountry?.name &&
      ministryForm.historicalCountryId
    ) {
      return editingMinistry.historicalCountry.name
    }
    return countryName ?? '현재 국가'
  }, [
    countryName,
    editingMinistry?.historicalCountry?.name,
    ministryForm.historicalCountryId,
    selectedConstituent?.name,
    selectedLinkedHist?.name,
  ])

  const activePolityLifespan = useMemo(() => {
    if (selectedLinkedHist) return parsePolitySpanYears(selectedLinkedHist)
    if (selectedConstituent) return parsePolitySpanYears(selectedConstituent)
    return null
  }, [selectedConstituent, selectedLinkedHist])

  const existingNamesInActivePolity = useMemo(() => {
    const targetHistId = ministryForm.historicalCountryId || ''
    return ministriesList
      .filter((deptItem) => {
        if (editingMinistry && deptItem.id === editingMinistry.id) return false
        if (isHistorical) {
          const effectiveTarget = targetHistId || effectiveCountryId || ''
          return (deptItem.historicalCountryId ?? '') === effectiveTarget
        }
        return (deptItem.historicalCountryId ?? '') === targetHistId
      })
      .map((deptItem) => deptItem.name)
  }, [
    editingMinistry,
    effectiveCountryId,
    isHistorical,
    ministriesList,
    ministryForm.historicalCountryId,
  ])

  const inferredFrameId = useMemo(
    () =>
      inferDepartmentFrameId(existingNamesInActivePolity, {
        name: activePolityDisplayName,
        isHistorical: Boolean(isHistorical || ministryForm.historicalCountryId),
      }),
    [
      activePolityDisplayName,
      existingNamesInActivePolity,
      isHistorical,
      ministryForm.historicalCountryId,
    ],
  )

  const activeFrame = useMemo(
    () => getDepartmentNameFrame(overrideFrameId || inferredFrameId),
    [inferredFrameId, overrideFrameId],
  )

  const frameSuggestedItems = useMemo(
    () => suggestFrameItems(activeFrame, existingNamesInActivePolity),
    [activeFrame, existingNamesInActivePolity],
  )

  const visibleFrameSuggestions = useMemo(
    () =>
      presetsExpanded
        ? frameSuggestedItems
        : frameSuggestedItems.slice(0, COLLAPSED_PRESET_LIMIT),
    [frameSuggestedItems, presetsExpanded],
  )

  const inferredCategoryFromName = useMemo(
    () =>
      matchDepartmentCategoryByName(
        ministryForm.name,
        categoriesList,
        activeFrame,
      ),
    [activeFrame, categoriesList, ministryForm.name],
  )

  const handleNameChange = useCallback(
    (nextName: string) => {
      const autoMatched = !categoryManualLocked
        ? matchDepartmentCategoryByName(nextName, categoriesList, activeFrame)
        : null

      setMinistryForm((prevForm) => {
        const nextCatId = categoryManualLocked
          ? prevForm.categoryId
          : (autoMatched?.id ?? (nextName.trim() ? prevForm.categoryId : ''))
        return {
          ...prevForm,
          name: nextName,
          categoryId: nextCatId,
        }
      })

      if (!categoryManualLocked) {
        if (autoMatched) {
          setCategoryAutoMatched(true)
        } else if (!nextName.trim()) {
          setCategoryAutoMatched(false)
        }
      }
    },
    [activeFrame, categoriesList, categoryManualLocked, setMinistryForm],
  )

  const handleManualSelectCategory = useCallback(
    (nextCategoryId: string) => {
      setCategoryManualLocked(Boolean(nextCategoryId))
      setCategoryAutoMatched(false)
      setMinistryForm((prevForm) => ({
        ...prevForm,
        categoryId: nextCategoryId,
      }))
    },
    [setMinistryForm],
  )

  const prioritizedCategories = useMemo(() => {
    const priorityIndex = new Map(
      CORE_CATEGORY_PRIORITY_NAMES.map((catName, idx) => [catName, idx]),
    )
    return [...categoriesList].sort((leftItem, rightItem) => {
      const leftRank = priorityIndex.get(leftItem.name) ?? 999
      const rightRank = priorityIndex.get(rightItem.name) ?? 999
      if (leftRank !== rightRank) return leftRank - rightRank
      return leftItem.name.localeCompare(rightItem.name, 'ko')
    })
  }, [categoriesList])

  const selectedCategory = useMemo(
    () =>
      ministryForm.categoryId
        ? (categoriesList.find(
            (catItem) => catItem.id === ministryForm.categoryId,
          ) ?? null)
        : null,
    [categoriesList, ministryForm.categoryId],
  )

  const { data: categoryPeerDepts = [] } = useQuery({
    queryKey: ['ministry-category-peers', selectedCategory?.id ?? ''],
    queryFn: () =>
      administrationDepartmentApi.getAll({
        categoryId: selectedCategory!.id,
        take: 20,
      }),
    enabled: Boolean(isOpen && selectedCategory?.id),
    staleTime: 120_000,
  })

  const crossCountryPeers = useMemo(() => {
    if (!selectedCategory) return []
    return categoryPeerDepts.filter((peerDept) => {
      if (editingMinistry && peerDept.id === editingMinistry.id) return false
      if (isHistorical) {
        return peerDept.historicalCountryId !== effectiveCountryId
      }
      return peerDept.countryId !== effectiveCountryId
    })
  }, [
    categoryPeerDepts,
    editingMinistry,
    effectiveCountryId,
    isHistorical,
    selectedCategory,
  ])

  const isDefenseContext = useMemo(
    () => isDefenseRelatedCategory(selectedCategory, ministryForm.kind),
    [ministryForm.kind, selectedCategory],
  )

  const linkedHistIdSet = useMemo(() => {
    const idSet = new Set<string>()
    for (const histItem of linkedHistoricalCountries) {
      if (histItem.id) idSet.add(histItem.id)
    }
    return idSet
  }, [linkedHistoricalCountries])

  const { data: allMilitaryUnits = [] } = useQuery({
    queryKey: ['military-units', 'all'],
    queryFn: () => militaryUnitApi.getAll(),
    enabled: Boolean(
      isOpen &&
        effectiveCountryId &&
        (isDefenseContext ||
          milTransitionExpanded ||
          (ministryForm.militaryUnitSuccessorTransitions?.length ?? 0) > 0),
    ),
    staleTime: 60_000,
  })

  const countryMilitaryUnits = useMemo(() => {
    if (!effectiveCountryId) return []
    const targetHistoricalId =
      ministryForm.historicalCountryId.trim() || effectiveCountryId
    return allMilitaryUnits.filter((unitItem) => {
      if (isHistorical) {
        return (
          unitItem.historicalCountryId === targetHistoricalId ||
          unitItem.historicalCountryId === effectiveCountryId
        )
      }
      if (unitItem.countryId === effectiveCountryId) return true
      if (
        unitItem.historicalCountryId &&
        linkedHistIdSet.has(unitItem.historicalCountryId)
      ) {
        return true
      }
      return false
    })
  }, [
    allMilitaryUnits,
    effectiveCountryId,
    isHistorical,
    linkedHistIdSet,
    ministryForm.historicalCountryId,
  ])

  const activeKindMeta = useMemo(
    () =>
      KIND_META_LIST.find(
        (metaItem) => metaItem.value === (ministryForm.kind || 'MINISTRY'),
      ) ?? KIND_META_LIST[0],
    [ministryForm.kind],
  )

  const forbiddenParentIds = useMemo(() => {
    if (!editingMinistry) return new Set<string>()
    const descSet = collectDescendantDepartmentIds(
      editingMinistry.id,
      ministriesList,
    )
    descSet.add(editingMinistry.id)
    return descSet
  }, [editingMinistry, ministriesList])

  const candidateParentDepartments = useMemo(() => {
    return ministriesList
      .filter((deptItem) => !forbiddenParentIds.has(deptItem.id))
      .sort((leftItem, rightItem) => {
        const leftSameEra =
          (leftItem.historicalCountryId ?? '') ===
          (ministryForm.historicalCountryId ?? '')
            ? 0
            : 1
        const rightSameEra =
          (rightItem.historicalCountryId ?? '') ===
          (ministryForm.historicalCountryId ?? '')
            ? 0
            : 1
        if (leftSameEra !== rightSameEra) return leftSameEra - rightSameEra
        return leftItem.name.localeCompare(rightItem.name, 'ko')
      })
  }, [forbiddenParentIds, ministriesList, ministryForm.historicalCountryId])

  const selectedParentDept = useMemo(
    () =>
      ministryForm.parentId
        ? (ministriesList.find(
            (deptItem) => deptItem.id === ministryForm.parentId,
          ) ?? null)
        : null,
    [ministriesList, ministryForm.parentId],
  )

  const lineageBadgeCount = useMemo(() => {
    const parentCount = ministryForm.parentId ? 1 : 0
    const lineageCount =
      (ministryForm.predecessorTransitions?.length ?? 0) +
      (ministryForm.successorTransitions?.length ?? 0) +
      (ministryForm.militaryUnitSuccessorTransitions?.length ?? 0)
    return parentCount + lineageCount
  }, [
    ministryForm.militaryUnitSuccessorTransitions?.length,
    ministryForm.parentId,
    ministryForm.predecessorTransitions?.length,
    ministryForm.successorTransitions?.length,
  ])

  const contextBadgeCount = useMemo(() => {
    let count = 0
    if (
      ministryForm.defenseHeadquarters.trim() ||
      ministryForm.headquartersLatitude != null
    ) {
      count += 1
    }
    if (ministryForm.defenseMissionScope.trim()) {
      count += 1
    }
    if (ministryForm.description.trim()) count += 1
    if (
      hasDefenseExtensionContent({
        officialNameEn: '',
        missionScope: '',
        headquarters: '',
        orgStructure: ministryForm.defenseOrgStructure,
        budgetOrForcesNote: ministryForm.defenseBudgetOrForcesNote,
      })
    ) {
      count += 1
    }
    if (ministryForm.thumbnailUrl.trim()) count += 1
    return count
  }, [
    ministryForm.defenseBudgetOrForcesNote,
    ministryForm.defenseHeadquarters,
    ministryForm.defenseMissionScope,
    ministryForm.defenseOrgStructure,
    ministryForm.description,
    ministryForm.headquartersLatitude,
    ministryForm.thumbnailUrl,
  ])

  const isFormDirty = useMemo(() => {
    if (editingMinistry) {
      const base = ministryFormFieldsFromDepartment(editingMinistry)
      return (
        ministryForm.name !== base.name ||
        ministryForm.abbreviation !== base.abbreviation ||
        ministryForm.nameLocal !== base.nameLocal ||
        ministryForm.nameEn !== base.nameEn ||
        ministryForm.kind !== base.kind ||
        ministryForm.categoryId !== base.categoryId ||
        ministryForm.parentId !== base.parentId ||
        ministryForm.historicalCountryId !== base.historicalCountryId ||
        ministryForm.establishedYear !== base.establishedYear ||
        ministryForm.establishedMonth !== base.establishedMonth ||
        ministryForm.establishedDay !== base.establishedDay ||
        ministryForm.abolishedYear !== base.abolishedYear ||
        ministryForm.abolishedMonth !== base.abolishedMonth ||
        ministryForm.abolishedDay !== base.abolishedDay ||
        ministryForm.description !== base.description ||
        ministryForm.defenseHeadquarters !== base.defenseHeadquarters ||
        (ministryForm.headquartersLatitude ?? null) !==
          (base.headquartersLatitude ?? null) ||
        (ministryForm.headquartersLongitude ?? null) !==
          (base.headquartersLongitude ?? null) ||
        ministryForm.defenseMissionScope !== base.defenseMissionScope ||
        ministryForm.defenseOrgStructure !== base.defenseOrgStructure ||
        ministryForm.defenseBudgetOrForcesNote !== base.defenseBudgetOrForcesNote
      )
    }
    return Boolean(
      ministryForm.name.trim() ||
        ministryForm.abbreviation.trim() ||
        ministryForm.nameLocal.trim() ||
        ministryForm.nameEn.trim() ||
        estDateDraft.year.trim() ||
        abolDateDraft.year.trim() ||
        ministryForm.description.trim() ||
        ministryForm.defenseHeadquarters.trim() ||
        ministryForm.headquartersLatitude != null ||
        ministryForm.defenseMissionScope.trim() ||
        ministryForm.defenseOrgStructure.trim() ||
        ministryForm.defenseBudgetOrForcesNote.trim() ||
        ministryForm.thumbnailUrl.trim() ||
        (ministryForm.predecessorTransitions?.length ?? 0) > 0 ||
        (ministryForm.successorTransitions?.length ?? 0) > 0 ||
        (ministryForm.militaryUnitSuccessorTransitions?.length ?? 0) > 0,
    )
  }, [abolDateDraft.year, editingMinistry, estDateDraft.year, ministryForm])

  const requestCloseModal = useCallback(async () => {
    if (submittingMinistry) return
    if (isFormDirty) {
      const shouldDiscard = await confirm({
        title: '확인',
        message: editingMinistry
          ? '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'
          : '작성 중인 중앙부처·국가기관 내용이 저장되지 않습니다. 창을 닫으시겠습니까?',
        confirmLabel: '닫기',
        cancelLabel: '계속 작성',
        danger: true,
      })
      if (!shouldDiscard) return
    }
    closeMinistryFormModal()
  }, [closeMinistryFormModal, editingMinistry, isFormDirty, submittingMinistry])

  const handleResetCreateForm = useCallback(async () => {
    if (editingMinistry || submittingMinistry) return
    if (isFormDirty) {
      const confirmed = await confirm({
        title: '초기화 확인',
        message: '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?',
        confirmLabel: '초기화',
        cancelLabel: '취소',
        danger: true,
      })
      if (!confirmed) return
    }
    setCategoryManualLocked(false)
    setCategoryAutoMatched(false)
    setEstDateDraft({ era: 'AD', year: '', month: '', day: '' })
    setAbolDateDraft({ era: 'AD', year: '', month: '', day: '' })
    setMinistryForm((prevForm) =>
      emptyMinistryFormFields('', '', prevForm.historicalCountryId, prevForm.kind),
    )
    scrollToSection('ministry-form-group-basic')
    window.setTimeout(() => nameInputRef.current?.focus(), 60)
  }, [
    editingMinistry,
    isFormDirty,
    scrollToSection,
    setMinistryForm,
    submittingMinistry,
  ])

  const focusFirstProblemField = useCallback(() => {
    if (!ministryForm.name.trim()) {
      scrollToSection('ministry-form-group-basic')
      window.setTimeout(() => nameInputRef.current?.focus(), 80)
      return
    }
    if (isDateInverted) {
      scrollToSection('ministry-form-group-basic')
      const abolEl = document.getElementById(abolDateAnchorId)
      const firstInput = abolEl?.querySelector<HTMLElement>('input')
      firstInput?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      firstInput?.focus()
    }
  }, [abolDateAnchorId, isDateInverted, ministryForm.name, scrollToSection])

  const handleCreateInlineCategory = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName || creatingCategory) return
    setCreatingCategory(true)
    try {
      const createdCat = await administrationDepartmentApi.createCategory({
        name: trimmedName,
        nameEn: newCategoryNameEn.trim() || null,
      })
      setCategoriesList?.((prevList) =>
        [...prevList, createdCat].sort((leftItem, rightItem) =>
          leftItem.name.localeCompare(rightItem.name, 'ko'),
        ),
      )
      reloadCategories?.()
      setCategoryManualLocked(true)
      setCategoryAutoMatched(false)
      setMinistryForm((prevForm) => ({
        ...prevForm,
        categoryId: createdCat.id,
      }))
      setNewCategoryName('')
      setNewCategoryNameEn('')
      setInlineCategoryOpen(false)
      notify.success(`「${createdCat.name}」 직능 분류가 추가되었습니다.`)
    } catch (catError) {
      notify.error(getApiErrorMessage(catError, '분류 생성에 실패했습니다.'))
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleSelectParentId = (selectedId: string) => {
    const matchedParent = ministriesList.find(
      (deptItem) => deptItem.id === selectedId,
    )
    setMinistryForm((prevForm) => {
      if (!matchedParent) {
        return { ...prevForm, parentId: '' }
      }
      const nextHistId =
        !isHistorical && matchedParent.historicalCountryId !== undefined
          ? (matchedParent.historicalCountryId ?? '')
          : prevForm.historicalCountryId
      const nextCatId = prevForm.categoryId || matchedParent.categoryId || ''
      return {
        ...prevForm,
        parentId: selectedId,
        historicalCountryId: nextHistId,
        categoryId: nextCatId,
      }
    })
  }

  // 설립일·폐지일 드래프트 핸들러 — 문자열 그대로 유지하고 유효 숫자만 폼 상태에 동기화
  const updateEstEra = useCallback(
    (nextEra: 'BC' | 'AD') => {
      setEstDateDraft((prevDraft) => ({ ...prevDraft, era: nextEra }))
      setMinistryForm((prevForm) => ({
        ...prevForm,
        establishedDate: '',
        establishedEra: nextEra,
      }))
    },
    [setMinistryForm],
  )

  const updateEstYear = useCallback(
    (nextYearStr: string) => {
      setEstDateDraft((prevDraft) => ({ ...prevDraft, year: nextYearStr }))
      const parsed = nextYearStr ? Number.parseInt(nextYearStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        establishedDate: '',
        establishedYear:
          parsed != null && Number.isFinite(parsed) && parsed > 0
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const updateEstMonth = useCallback(
    (nextMonthStr: string) => {
      setEstDateDraft((prevDraft) => ({ ...prevDraft, month: nextMonthStr }))
      const parsed = nextMonthStr ? Number.parseInt(nextMonthStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        establishedDate: '',
        establishedMonth:
          parsed != null &&
          Number.isFinite(parsed) &&
          parsed >= 1 &&
          parsed <= 12
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const updateEstDay = useCallback(
    (nextDayStr: string) => {
      setEstDateDraft((prevDraft) => ({ ...prevDraft, day: nextDayStr }))
      const parsed = nextDayStr ? Number.parseInt(nextDayStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        establishedDate: '',
        establishedDay:
          parsed != null &&
          Number.isFinite(parsed) &&
          parsed >= 1 &&
          parsed <= 31
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const clearEstablishedDate = useCallback(() => {
    setEstDateDraft({ era: 'AD', year: '', month: '', day: '' })
    setMinistryForm((prevForm) => ({
      ...prevForm,
      establishedDate: '',
      establishedEra: 'AD',
      establishedYear: null,
      establishedMonth: null,
      establishedDay: null,
    }))
  }, [setMinistryForm])

  const updateAbolEra = useCallback(
    (nextEra: 'BC' | 'AD') => {
      setAbolDateDraft((prevDraft) => ({ ...prevDraft, era: nextEra }))
      setMinistryForm((prevForm) => ({
        ...prevForm,
        abolishedDate: '',
        abolishedEra: nextEra,
      }))
    },
    [setMinistryForm],
  )

  const updateAbolYear = useCallback(
    (nextYearStr: string) => {
      setAbolDateDraft((prevDraft) => ({ ...prevDraft, year: nextYearStr }))
      const parsed = nextYearStr ? Number.parseInt(nextYearStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        abolishedDate: '',
        abolishedYear:
          parsed != null && Number.isFinite(parsed) && parsed > 0
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const updateAbolMonth = useCallback(
    (nextMonthStr: string) => {
      setAbolDateDraft((prevDraft) => ({ ...prevDraft, month: nextMonthStr }))
      const parsed = nextMonthStr ? Number.parseInt(nextMonthStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        abolishedDate: '',
        abolishedMonth:
          parsed != null &&
          Number.isFinite(parsed) &&
          parsed >= 1 &&
          parsed <= 12
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const updateAbolDay = useCallback(
    (nextDayStr: string) => {
      setAbolDateDraft((prevDraft) => ({ ...prevDraft, day: nextDayStr }))
      const parsed = nextDayStr ? Number.parseInt(nextDayStr, 10) : null
      setMinistryForm((prevForm) => ({
        ...prevForm,
        abolishedDate: '',
        abolishedDay:
          parsed != null &&
          Number.isFinite(parsed) &&
          parsed >= 1 &&
          parsed <= 31
            ? parsed
            : null,
      }))
    },
    [setMinistryForm],
  )

  const clearAbolishedDate = useCallback(() => {
    setAbolDateDraft({ era: 'AD', year: '', month: '', day: '' })
    setMinistryForm((prevForm) => ({
      ...prevForm,
      abolishedDate: '',
      abolishedEra: 'AD',
      abolishedYear: null,
      abolishedMonth: null,
      abolishedDay: null,
    }))
  }, [setMinistryForm])

  const applyPolityLifespanDates = useCallback(() => {
    if (!activePolityLifespan) return
    setEstDateDraft({
      era: activePolityLifespan.startEra,
      year:
        activePolityLifespan.startYear != null
          ? String(activePolityLifespan.startYear)
          : '',
      month: '',
      day: '',
    })
    setAbolDateDraft({
      era: activePolityLifespan.endEra,
      year:
        activePolityLifespan.endYear != null
          ? String(activePolityLifespan.endYear)
          : '',
      month: '',
      day: '',
    })
    setMinistryForm((prevForm) => ({
      ...prevForm,
      establishedDate: '',
      establishedEra: activePolityLifespan.startEra,
      establishedYear: activePolityLifespan.startYear,
      establishedMonth: null,
      establishedDay: null,
      abolishedDate: '',
      abolishedEra: activePolityLifespan.endEra,
      abolishedYear: activePolityLifespan.endYear,
      abolishedMonth: null,
      abolishedDay: null,
    }))
  }, [activePolityLifespan, setMinistryForm])

  const applyDatePickerResult = useCallback(
    (
      target: 'est' | 'abol',
      isoDate: string,
      precision: DatePickerPrecision,
    ) => {
      const parsed = parsePartialDateString(isoDate)
      const nextMonthText = precision === 'year' ? '' : parsed.month
      const nextDayText = precision === 'day' ? parsed.day : ''
      const parsedYear = parsed.year ? Number.parseInt(parsed.year, 10) : null
      const parsedMonth = nextMonthText
        ? Number.parseInt(nextMonthText, 10)
        : null
      const parsedDay = nextDayText ? Number.parseInt(nextDayText, 10) : null

      if (target === 'est') {
        setEstDateDraft({
          era: parsed.era,
          year: parsed.year,
          month: nextMonthText,
          day: nextDayText,
        })
        setMinistryForm((prevForm) => ({
          ...prevForm,
          establishedDate:
            precision === 'day' && parsed.era === 'AD' ? isoDate : '',
          establishedEra: parsed.era,
          establishedYear:
            parsedYear != null && Number.isFinite(parsedYear)
              ? parsedYear
              : null,
          establishedMonth:
            parsedMonth != null && Number.isFinite(parsedMonth)
              ? parsedMonth
              : null,
          establishedDay:
            parsedDay != null && Number.isFinite(parsedDay) ? parsedDay : null,
        }))
        setEstablishedDateModalOpen(false)
      } else {
        setAbolDateDraft({
          era: parsed.era,
          year: parsed.year,
          month: nextMonthText,
          day: nextDayText,
        })
        setMinistryForm((prevForm) => ({
          ...prevForm,
          abolishedDate:
            precision === 'day' && parsed.era === 'AD' ? isoDate : '',
          abolishedEra: parsed.era,
          abolishedYear:
            parsedYear != null && Number.isFinite(parsedYear)
              ? parsedYear
              : null,
          abolishedMonth:
            parsedMonth != null && Number.isFinite(parsedMonth)
              ? parsedMonth
              : null,
          abolishedDay:
            parsedDay != null && Number.isFinite(parsedDay) ? parsedDay : null,
        }))
        setAbolishedDateModalOpen(false)
      }
    },
    [
      setAbolishedDateModalOpen,
      setEstablishedDateModalOpen,
      setMinistryForm,
    ],
  )

  const buildDeptSelectOption = useCallback(
    (deptItem: AdministrationDepartment): SearchableSelectOption => {
      const kindMeta = KIND_META_LIST.find(
        (metaItem) => metaItem.value === deptItem.kind,
      )
      const abbrSuffix = deptItem.abbreviation?.trim()
        ? ` (${deptItem.abbreviation.trim()})`
        : ''
      return {
        value: deptItem.id,
        label: `${deptItem.name}${abbrSuffix}`,
        icon: kindMeta?.icon ?? <FiBriefcase size={13} />,
        meta: deptItem.historicalCountry?.name ?? kindMeta?.shortBadge,
        keywords: [
          deptItem.abbreviation,
          deptItem.nameEn,
          deptItem.nameLocal,
          deptItem.historicalCountry?.name,
          kindMeta?.shortBadge,
        ]
          .filter(Boolean)
          .join(' '),
      }
    },
    [],
  )

  const formatDeptOptionLabel = (deptItem: AdministrationDepartment) => {
    const kindMeta = KIND_META_LIST.find(
      (metaItem) => metaItem.value === deptItem.kind,
    )
    const prefixParts = [
      deptItem.historicalCountry?.name,
      kindMeta?.shortBadge,
    ].filter(Boolean)
    const prefix = prefixParts.length > 0 ? `[${prefixParts.join(' · ')}] ` : ''
    const abbrSuffix = deptItem.abbreviation?.trim()
      ? ` (${deptItem.abbreviation.trim()})`
      : ''
    return `${prefix}${deptItem.name}${abbrSuffix}`
  }

  const formatMilitaryUnitOptionLabel = (
    unitItem: (typeof allMilitaryUnits)[number],
  ) => {
    const prefixParts = [
      unitItem.historicalCountry?.name,
      militaryUnitTypeLabelKo(unitItem.unitType),
    ].filter(Boolean)
    const prefix = prefixParts.length > 0 ? `[${prefixParts.join(' · ')}] ` : ''
    const abbrSuffix = unitItem.abbreviation?.trim()
      ? ` (${unitItem.abbreviation.trim()})`
      : ''
    return `${prefix}${unitItem.name}${abbrSuffix}`
  }

  const parentDeptOptions = useMemo<SearchableSelectOption[]>(
    () => candidateParentDepartments.map(buildDeptSelectOption),
    [buildDeptSelectOption, candidateParentDepartments],
  )

  const categoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      prioritizedCategories.map((catItem) => ({
        value: catItem.id,
        label: catItem.name,
        meta: catItem.nameEn ?? undefined,
        description: CROSS_COUNTRY_CATEGORY_EXAMPLES[catItem.name],
        keywords: [catItem.nameEn, CROSS_COUNTRY_CATEGORY_EXAMPLES[catItem.name]]
          .filter(Boolean)
          .join(' '),
      })),
    [prioritizedCategories],
  )

  const availablePredecessorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      ministriesList
        .filter(
          (deptItem) =>
            (!editingMinistry || deptItem.id !== editingMinistry.id) &&
            !(ministryForm.predecessorTransitions ?? []).some(
              (item) => item.predecessorId === deptItem.id,
            ),
        )
        .map(buildDeptSelectOption),
    [
      buildDeptSelectOption,
      editingMinistry,
      ministriesList,
      ministryForm.predecessorTransitions,
    ],
  )

  const availableSuccessorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      ministriesList
        .filter(
          (deptItem) =>
            (!editingMinistry || deptItem.id !== editingMinistry.id) &&
            !(ministryForm.successorTransitions ?? []).some(
              (item) => item.successorId === deptItem.id,
            ),
        )
        .map(buildDeptSelectOption),
    [
      buildDeptSelectOption,
      editingMinistry,
      ministriesList,
      ministryForm.successorTransitions,
    ],
  )

  const availableMilitarySuccessorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      countryMilitaryUnits
        .filter(
          (unitItem) =>
            !(ministryForm.militaryUnitSuccessorTransitions ?? []).some(
              (item) => item.unitId === unitItem.id,
            ),
        )
        .map((unitItem) => ({
          value: unitItem.id,
          label: `${unitItem.name}${unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}`,
          icon: <FiShield size={13} />,
          meta: unitItem.historicalCountry?.name ?? undefined,
          description: militaryUnitTypeLabelKo(unitItem.unitType),
          keywords: [
            unitItem.abbreviation,
            unitItem.nameEn,
            unitItem.nameLocal,
            unitItem.unitType,
            militaryUnitTypeLabelKo(unitItem.unitType),
          ]
            .filter(Boolean)
            .join(' '),
        })),
    [countryMilitaryUnits, ministryForm.militaryUnitSuccessorTransitions],
  )

  if (!effectiveCountryId || !isOpen) return null

  const estInitialIso = buildPartialDateString(estDateDraft) || undefined
  const estInitialPrecision: DatePickerPrecision | null =
    estDateDraft.day.trim()
      ? 'day'
      : estDateDraft.month.trim()
        ? 'month'
        : estDateDraft.year.trim()
          ? 'year'
          : null

  const abolInitialIso = buildPartialDateString(abolDateDraft) || undefined
  const abolInitialPrecision: DatePickerPrecision | null =
    abolDateDraft.day.trim()
      ? 'day'
      : abolDateDraft.month.trim()
        ? 'month'
        : abolDateDraft.year.trim()
          ? 'year'
          : null

  const predecessorList = ministryForm.predecessorTransitions ?? []
  const successorList = ministryForm.successorTransitions ?? []
  const milSuccessorList = ministryForm.militaryUnitSuccessorTransitions ?? []
  const hasAnyLineage =
    predecessorList.length > 0 ||
    successorList.length > 0 ||
    milSuccessorList.length > 0

  const showMilSuccessorBlock =
    milTransitionExpanded || milSuccessorList.length > 0

  const peerSummaryText = (() => {
    if (!selectedCategory) return ''
    if (crossCountryPeers.length > 0) {
      const sampleText = crossCountryPeers
        .slice(0, 4)
        .map((peerDept) => {
          const peerCountry =
            peerDept.historicalCountry?.name ?? peerDept.country?.name ?? ''
          return peerCountry ? `${peerCountry} ${peerDept.name}` : peerDept.name
        })
        .join(' · ')
      const remaining = crossCountryPeers.length - 4
      return remaining > 0 ? `${sampleText} 외 ${remaining}건` : sampleText
    }
    return (
      CROSS_COUNTRY_CATEGORY_EXAMPLES[selectedCategory.name] ??
      `타국의 「${selectedCategory.name}」 담당 기관과 함께 비교됩니다.`
    )
  })()

  /* ═══════════════ 섹션 1: 기본 정보 (사건 등록 모달 basicGroup 대응) ═══════════════ */
  const basicGroup = (
    <FormGroup
      id="ministry-form-group-basic"
      aria-labelledby="ministry-form-group-basic-title"
    >
      <FormGroupTitle id="ministry-form-group-basic-title">
        기본 정보
      </FormGroupTitle>

      {/* 1) 기관명 + 약칭 + 추천 칩 */}
      <FieldRow>
        <FieldLabel htmlFor="ministry-form-name">
          {activeKindMeta.nameLabel} <Required>*</Required>
        </FieldLabel>
        <FieldControl>
          <NameAndAbbrGrid>
            <Input
              ref={nameInputRef}
              id="ministry-form-name"
              data-autofocus=""
              type="text"
              value={ministryForm.name}
              onChange={(changeEvent) =>
                handleNameChange(changeEvent.target.value)
              }
              placeholder={activeKindMeta.namePlaceholder}
            />
            <Input
              type="text"
              aria-label="약칭"
              value={ministryForm.abbreviation}
              onChange={(changeEvent) =>
                setMinistryForm((prevForm) => ({
                  ...prevForm,
                  abbreviation: changeEvent.target.value,
                }))
              }
              placeholder={activeKindMeta.abbrPlaceholder}
            />
          </NameAndAbbrGrid>

          {!editingMinistry &&
          (ministryForm.kind || 'MINISTRY') === 'MINISTRY' ? (
            <TitleSuggestionRow aria-label="빠른 부처 추천">
              <FrameSelectPill
                aria-label="부처 명칭 체계 선택"
                value={activeFrame.id}
                onChange={(changeEvent) => {
                  setOverrideFrameId(changeEvent.target.value)
                  setPresetsExpanded(false)
                }}
              >
                {DEPARTMENT_NAME_FRAMES.map((frameOption) => (
                  <option key={frameOption.id} value={frameOption.id}>
                    {frameOption.label}
                  </option>
                ))}
              </FrameSelectPill>

              {visibleFrameSuggestions.length > 0 ? (
                <>
                  {visibleFrameSuggestions.map((frameItem) => {
                    const isSelectedPreset =
                      ministryForm.name.trim() === frameItem.name
                    const matchedCat = resolveCategoryByCanonicalName(
                      frameItem.categoryName,
                      categoriesList,
                    )
                    return (
                      <TitleSuggestionChip
                        key={`${activeFrame.id}:${frameItem.slot}:${frameItem.name}`}
                        type="button"
                        $active={isSelectedPreset}
                        onClick={() => {
                          if (matchedCat) {
                            setCategoryManualLocked(false)
                            setCategoryAutoMatched(true)
                          }
                          setMinistryForm((prevForm) => ({
                            ...prevForm,
                            name: frameItem.name,
                            kind: frameItem.kind ?? prevForm.kind,
                            categoryId: matchedCat?.id ?? prevForm.categoryId,
                          }))
                        }}
                      >
                        {frameItem.name}
                      </TitleSuggestionChip>
                    )
                  })}
                  {frameSuggestedItems.length > COLLAPSED_PRESET_LIMIT ? (
                    <TitleSuggestionMoreBtn
                      type="button"
                      onClick={() =>
                        setPresetsExpanded((prevExpanded) => !prevExpanded)
                      }
                    >
                      {presetsExpanded
                        ? '접기'
                        : `+${frameSuggestedItems.length - COLLAPSED_PRESET_LIMIT}개`}
                    </TitleSuggestionMoreBtn>
                  ) : null}
                </>
              ) : (
                <FieldHint>기본 추천 부처가 모두 등록되었습니다.</FieldHint>
              )}
            </TitleSuggestionRow>
          ) : !editingMinistry && activeKindMeta.presets.length > 0 ? (
            <TitleSuggestionRow aria-label="빠른 기관 추천">
              {activeKindMeta.presets.map((presetItem) => {
                const matchedCat = resolveCategoryByCanonicalName(
                  presetItem.categoryName,
                  categoriesList,
                )
                return (
                  <TitleSuggestionChip
                    key={presetItem.name}
                    type="button"
                    $active={ministryForm.name.trim() === presetItem.name}
                    onClick={() => {
                      if (matchedCat) {
                        setCategoryManualLocked(false)
                        setCategoryAutoMatched(true)
                      }
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        name: presetItem.name,
                        abbreviation:
                          presetItem.abbreviation ?? prevForm.abbreviation,
                        nameEn: presetItem.nameEn ?? prevForm.nameEn,
                        defenseOfficialNameEn:
                          presetItem.nameEn ?? prevForm.defenseOfficialNameEn,
                        categoryId: matchedCat?.id ?? prevForm.categoryId,
                      }))
                    }}
                  >
                    {presetItem.name}
                  </TitleSuggestionChip>
                )
              })}
            </TitleSuggestionRow>
          ) : null}
        </FieldControl>
      </FieldRow>

      {/* 2) 소속 시대 · 정체 (다수 왕조도 단일 검색 드롭다운으로 깔끔하게 표시) */}
      {politySelectOptions.length > 0 && (
        <FieldRow>
          <FieldLabel>
            {isHistorical ? '소속 정치체' : '소속 시대 · 정체'}
          </FieldLabel>
          <FieldControl>
            <SearchableSelect
              options={politySelectOptions}
              value={selectedPolityValue}
              clearable={false}
              onChange={handlePolitySelectChange}
              placeholder={`${countryName ?? '현재 국가'} 직속`}
              searchPlaceholder="왕조 · 시대 정체명 또는 존속 연도 검색…"
              ariaLabel="소속 시대 및 정치체 선택"
              noMatchMessage="일치하는 시대·정치체가 없습니다"
            />
          </FieldControl>
        </FieldRow>
      )}

      {/* 3) 설립 · 폐지 (사건 등록 모달 '기간' 행과 동일한 레이아웃·PeriodBadge·빠른 액션) */}
      <FieldRow>
        <FieldLabel>
          <div>
            설립 · 폐지<OptionalTag>(선택)</OptionalTag>
          </div>
          {spanSummary ? (
            <PeriodBadge>
              <FiClock size={12} />
              {spanSummary}
            </PeriodBadge>
          ) : null}
        </FieldLabel>
        <FieldControl>
          <DateRangeGrid>
            <SubField>
              <DateColumnHeaderRow>
                <SubFieldLabel>설립일</SubFieldLabel>
                <DateQuickActions>
                  {!estDateDraft.year &&
                  !estDateDraft.month &&
                  !estDateDraft.day &&
                  activePolityLifespan?.startYear != null ? (
                    <DateQuickActionBtn
                      type="button"
                      onClick={applyPolityLifespanDates}
                      title={`${activePolityDisplayName} 존속 연도로 채우기`}
                    >
                      시대 연도({activePolityLifespan.label}) 적용
                    </DateQuickActionBtn>
                  ) : null}
                  {estDateDraft.year ||
                  estDateDraft.month ||
                  estDateDraft.day ? (
                    <DateQuickActionBtn
                      type="button"
                      onClick={clearEstablishedDate}
                    >
                      비우기
                    </DateQuickActionBtn>
                  ) : null}
                </DateQuickActions>
              </DateColumnHeaderRow>
              <InlineDateField
                appearance="field"
                anchorId={estDateAnchorId}
                pickerOpen={establishedDateModalOpen}
                era={estDateDraft.era}
                year={estDateDraft.year}
                month={estDateDraft.month}
                day={estDateDraft.day}
                onEra={updateEstEra}
                onYear={updateEstYear}
                onMonth={updateEstMonth}
                onDay={updateEstDay}
                onOpenPicker={() => setEstablishedDateModalOpen(true)}
                ariaLabel="기관 설립일"
              />
            </SubField>

            <SubField>
              <DateColumnHeaderRow>
                <SubFieldLabel>폐지일</SubFieldLabel>
                {abolDateDraft.year ||
                abolDateDraft.month ||
                abolDateDraft.day ? (
                  <DateQuickActions>
                    <DateQuickActionBtn
                      type="button"
                      onClick={clearAbolishedDate}
                    >
                      비우기
                    </DateQuickActionBtn>
                  </DateQuickActions>
                ) : null}
              </DateColumnHeaderRow>
              <InlineDateField
                appearance="field"
                anchorId={abolDateAnchorId}
                pickerOpen={abolishedDateModalOpen}
                era={abolDateDraft.era}
                year={abolDateDraft.year}
                month={abolDateDraft.month}
                day={abolDateDraft.day}
                onEra={updateAbolEra}
                onYear={updateAbolYear}
                onMonth={updateAbolMonth}
                onDay={updateAbolDay}
                onOpenPicker={() => setAbolishedDateModalOpen(true)}
                error={isDateInverted}
                ariaLabel="기관 폐지일"
              />
            </SubField>
          </DateRangeGrid>

          {isDateInverted ? (
            <InlineErrorText role="alert">
              <FiAlertCircle size={13} />
              <span>
                폐지 시점이 설립 시점보다 앞섭니다. 기원(서기/기원전)과 연·월·일을
                확인해 주세요.
              </span>
            </InlineErrorText>
          ) : (
            <FieldHint>
              연도만 입력해도 저장되며, 폐지일을 비워두면 현존 기관으로 표시됩니다.
            </FieldHint>
          )}
        </FieldControl>
      </FieldRow>

      {/* 4) 기관 구분 — 사건 등록 모달 정본 알약 칩(ChoiceChips) */}
      <FieldRow>
        <FieldLabel>기관 구분</FieldLabel>
        <FieldControl>
          <ChoiceChips
            value={ministryForm.kind || 'MINISTRY'}
            options={KIND_CHIP_OPTIONS}
            ariaLabel="기관 구분 선택"
            onChange={(nextKind) => {
              if (!nextKind) return
              setMinistryForm((prevForm) => ({
                ...prevForm,
                kind: nextKind,
              }))
            }}
          />
        </FieldControl>
      </FieldRow>

      {/* 5) 직능 분류 (타국 비교 축) */}
      <FieldRow>
        <FieldLabel>
          직능 분류<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <InlineControlRow>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <SearchableSelect
                options={categoryOptions}
                value={ministryForm.categoryId || ''}
                onChange={(nextCatId) => handleManualSelectCategory(nextCatId)}
                placeholder="직능 미지정 (외교 · 국방 · 재정·경제 등 검색)"
                searchPlaceholder="외교, 국방, 재정, 정보기관 등 검색…"
                ariaLabel="공통 직능 분류 선택"
                emptyMessage="일치하는 직능 분류가 없습니다"
              />
            </div>
            <KitAddButton
              type="button"
              onClick={() => setInlineCategoryOpen((prevOpen) => !prevOpen)}
            >
              <FiPlus size={14} />새 분류
            </KitAddButton>
          </InlineControlRow>

          {inlineCategoryOpen && (
            <InlineControlRow>
              <Input
                type="text"
                value={newCategoryName}
                onChange={(changeEvent) =>
                  setNewCategoryName(changeEvent.target.value)
                }
                placeholder="새 직능명 (예: 우주·항공)"
                style={{ flex: '1 1 180px' }}
              />
              <Input
                type="text"
                value={newCategoryNameEn}
                onChange={(changeEvent) =>
                  setNewCategoryNameEn(changeEvent.target.value)
                }
                placeholder="영문명 (선택)"
                style={{ flex: '0 1 160px' }}
              />
              <KitAddButton
                type="button"
                disabled={!newCategoryName.trim() || creatingCategory}
                onClick={() => void handleCreateInlineCategory()}
              >
                {creatingCategory ? '추가 중…' : '추가'}
              </KitAddButton>
            </InlineControlRow>
          )}

          {selectedCategory ? (
            <CategoryMetaLine>
              <span className="meta-summary">
                {categoryAutoMatched ? (
                  <span className="auto-tag">자동 매칭 · </span>
                ) : null}
                {crossCountryPeers.length > 0 ? '동종 기관: ' : '비교 예시: '}
                {peerSummaryText}
              </span>
              <CompareCatalogLink
                to={pathKeys.government.list({
                  tab: 'departments',
                  categoryId: selectedCategory.id,
                })}
                target="_blank"
                rel="noreferrer"
              >
                <span>타국 「{selectedCategory.name}」 비교</span>
                <FiExternalLink size={11} />
              </CompareCatalogLink>
            </CategoryMetaLine>
          ) : inferredCategoryFromName ? (
            <TitleSuggestionRow>
              <TitleSuggestionChip
                type="button"
                $accent
                onClick={() =>
                  handleManualSelectCategory(inferredCategoryFromName.id)
                }
              >
                추천 직능 적용: {inferredCategoryFromName.name}
              </TitleSuggestionChip>
            </TitleSuggestionRow>
          ) : (
            <FieldHint>
              기관명을 입력하면 자동 매칭되며, 명칭이 다른 타국 동종 부처(예:
              외무부·국무부·외무성·예조)와 비교됩니다.
            </FieldHint>
          )}
        </FieldControl>
      </FieldRow>

      {/* 6) 원어 · 영문 표기 */}
      <FieldRow>
        <FieldLabel>
          원어 · 영문명<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <SubFieldPair $cols={2}>
            <SubField>
              <SubFieldLabel>원어 · 한자</SubFieldLabel>
              <Input
                type="text"
                aria-label="원어 표기"
                value={ministryForm.nameLocal}
                onChange={(changeEvent) =>
                  setMinistryForm((prevForm) => ({
                    ...prevForm,
                    nameLocal: changeEvent.target.value,
                  }))
                }
                placeholder={activeKindMeta.localPlaceholder}
              />
            </SubField>
            <SubField>
              <SubFieldLabel>영문 표기</SubFieldLabel>
              <Input
                type="text"
                aria-label="영문 표기"
                value={ministryForm.nameEn}
                onChange={(changeEvent) =>
                  setMinistryForm((prevForm) => ({
                    ...prevForm,
                    nameEn: changeEvent.target.value,
                    defenseOfficialNameEn: changeEvent.target.value,
                  }))
                }
                placeholder={activeKindMeta.enPlaceholder}
              />
            </SubField>
          </SubFieldPair>
        </FieldControl>
      </FieldRow>
    </FormGroup>
  )

  /* ═══════════════ 섹션 2: 상하위 편제 · 전후 계보 (2단 분할 시 우측 패널) ═══════════════ */
  const lineageGroup = (
    <FormGroup
      id="ministry-form-group-lineage"
      aria-labelledby="ministry-form-group-lineage-title"
    >
      <FormGroupTitle id="ministry-form-group-lineage-title">
        상하위 편제 · 전후 계보
      </FormGroupTitle>

      {/* 상위 소속 기관 */}
      <FieldRow>
        <FieldLabel>
          상위 기관<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <SearchableSelect
            options={parentDeptOptions}
            value={ministryForm.parentId}
            onChange={(nextParentId) => handleSelectParentId(nextParentId)}
            placeholder="최상위 독립 기관 (상위 부처 없음)"
            searchPlaceholder="상위 부처·기관명, 약칭, 시대 검색…"
            ariaLabel="상위 기관 선택"
            emptyMessage="선택 가능한 상위 기관이 없습니다"
          />
        </FieldControl>
      </FieldRow>

      {/* 전신 · 후신 계보 (사건 등록 모달 ModalCausalFlowBoard 스타일 공유) */}
      <FieldRow>
        <FieldLabel>
          전신 · 후신<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          {hasAnyLineage ? (
            <ModalLineageFlowBoard aria-label="조직 계보 요약 흐름">
              <ModalLineageGrid>
                <ModalLineageLaneBox>
                  <ModalLineageLaneHead>
                    <span>전신</span>
                    <ModalLineageLaneCount>
                      {predecessorList.length}
                    </ModalLineageLaneCount>
                  </ModalLineageLaneHead>
                  {predecessorList.length > 0 ? (
                    <ModalLineagePillWrap>
                      {predecessorList.map((predItem) => {
                        const predName =
                          ministriesList.find(
                            (deptItem) => deptItem.id === predItem.predecessorId,
                          )?.name ?? '기관'
                        return (
                          <ModalLineagePill key={predItem.predecessorId}>
                            {predName}
                          </ModalLineagePill>
                        )
                      })}
                    </ModalLineagePillWrap>
                  ) : (
                    <ModalLineageEmpty>신설 · 독립</ModalLineageEmpty>
                  )}
                </ModalLineageLaneBox>

                <ModalLineageArrow aria-hidden="true">→</ModalLineageArrow>

                <ModalLineageSelfBox>
                  <span className="self-role">현재 기관</span>
                  <strong className="self-title">
                    {ministryForm.name.trim() || '입력 중인 기관'}
                  </strong>
                </ModalLineageSelfBox>

                <ModalLineageArrow aria-hidden="true">→</ModalLineageArrow>

                <ModalLineageLaneBox>
                  <ModalLineageLaneHead>
                    <span>후신 · 이관</span>
                    <ModalLineageLaneCount>
                      {successorList.length + milSuccessorList.length}
                    </ModalLineageLaneCount>
                  </ModalLineageLaneHead>
                  {successorList.length + milSuccessorList.length > 0 ? (
                    <ModalLineagePillWrap>
                      {successorList.map((succItem) => {
                        const succName =
                          ministriesList.find(
                            (deptItem) => deptItem.id === succItem.successorId,
                          )?.name ?? '기관'
                        return (
                          <ModalLineagePill key={succItem.successorId}>
                            {succName}
                          </ModalLineagePill>
                        )
                      })}
                      {milSuccessorList.map((milItem) => {
                        const milName =
                          allMilitaryUnits.find(
                            (unitItem) => unitItem.id === milItem.unitId,
                          )?.name ?? '군사조직'
                        return (
                          <ModalLineagePill key={milItem.unitId}>
                            {milName}
                          </ModalLineagePill>
                        )
                      })}
                    </ModalLineagePillWrap>
                  ) : (
                    <ModalLineageEmpty>현존 · 미지정</ModalLineageEmpty>
                  )}
                </ModalLineageLaneBox>
              </ModalLineageGrid>
            </ModalLineageFlowBoard>
          ) : null}

          {predecessorList.map((predItem) => {
            const targetDept = ministriesList.find(
              (deptItem) => deptItem.id === predItem.predecessorId,
            )
            const deptLabel = targetDept
              ? formatDeptOptionLabel(targetDept)
              : predItem.predecessorId
            return (
              <TransitionCard key={`pred-${predItem.predecessorId}`}>
                <TransitionTopRow>
                  <TransitionDirectionTag $tone="pred">
                    전신 ←
                  </TransitionDirectionTag>
                  <TransitionTargetName>{deptLabel}</TransitionTargetName>
                  <CompactSelect
                    aria-label="전신 개편 유형"
                    value={predItem.kind}
                    onChange={(changeEvent) => {
                      const nextKind = changeEvent.target
                        .value as DepartmentTransitionKind
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).map((item) =>
                          item.predecessorId === predItem.predecessorId
                            ? { ...item, kind: nextKind }
                            : item,
                        ),
                      }))
                    }}
                  >
                    {DEPARTMENT_TRANSITION_KIND_OPTIONS.map((optItem) => (
                      <option key={optItem.value} value={optItem.value}>
                        {optItem.label}
                      </option>
                    ))}
                  </CompactSelect>
                  <KitRemoveButton
                    type="button"
                    aria-label="전신 기관 연결 해제"
                    onClick={() =>
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).filter(
                          (item) =>
                            item.predecessorId !== predItem.predecessorId,
                        ),
                      }))
                    }
                  >
                    <FiTrash2 size={14} />
                  </KitRemoveButton>
                </TransitionTopRow>
                <InlineControlRow>
                  <CompactSelect
                    aria-label="전신 전환 기원"
                    value={predItem.era ?? 'AD'}
                    onChange={(changeEvent) => {
                      const nextEra = changeEvent.target.value as 'AD' | 'BC'
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).map((item) =>
                          item.predecessorId === predItem.predecessorId
                            ? { ...item, era: nextEra }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 72 }}
                  >
                    <option value="AD">서기</option>
                    <option value="BC">BC</option>
                  </CompactSelect>
                  <Input
                    type="number"
                    min={1}
                    max={9999}
                    placeholder="전환 연도"
                    value={predItem.year ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsedYear = rawVal
                        ? Number.parseInt(rawVal, 10)
                        : null
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).map((item) =>
                          item.predecessorId === predItem.predecessorId
                            ? {
                                ...item,
                                year:
                                  parsedYear != null &&
                                  Number.isFinite(parsedYear)
                                    ? parsedYear
                                    : null,
                              }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 108 }}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="월"
                    value={predItem.month ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsedMonth = rawVal
                        ? Number.parseInt(rawVal, 10)
                        : null
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).map((item) =>
                          item.predecessorId === predItem.predecessorId
                            ? {
                                ...item,
                                month:
                                  parsedMonth != null &&
                                  Number.isFinite(parsedMonth)
                                    ? parsedMonth
                                    : null,
                              }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 68 }}
                  />
                  <Input
                    type="text"
                    placeholder="개편 사유·비고 (선택)"
                    value={predItem.note ?? ''}
                    onChange={(changeEvent) => {
                      const nextNote = changeEvent.target.value
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        predecessorTransitions: (
                          prevForm.predecessorTransitions ?? []
                        ).map((item) =>
                          item.predecessorId === predItem.predecessorId
                            ? { ...item, note: nextNote }
                            : item,
                        ),
                      }))
                    }}
                    style={{ flex: '1 1 140px' }}
                  />
                </InlineControlRow>
              </TransitionCard>
            )
          })}

          {successorList.map((transitionItem) => {
            const targetDept = ministriesList.find(
              (deptItem) => deptItem.id === transitionItem.successorId,
            )
            const deptLabel = targetDept
              ? formatDeptOptionLabel(targetDept)
              : transitionItem.successorId
            return (
              <TransitionCard key={`succ-${transitionItem.successorId}`}>
                <TransitionTopRow>
                  <TransitionDirectionTag $tone="succ">
                    후신 →
                  </TransitionDirectionTag>
                  <TransitionTargetName>{deptLabel}</TransitionTargetName>
                  <CompactSelect
                    aria-label="후신 개편 유형"
                    value={transitionItem.kind}
                    onChange={(changeEvent) => {
                      const nextKind = changeEvent.target
                        .value as DepartmentTransitionKind
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        successorTransitions: (
                          prevForm.successorTransitions ?? []
                        ).map((item) =>
                          item.successorId === transitionItem.successorId
                            ? { ...item, kind: nextKind }
                            : item,
                        ),
                      }))
                    }}
                  >
                    {DEPARTMENT_TRANSITION_KIND_OPTIONS.map((optItem) => (
                      <option key={optItem.value} value={optItem.value}>
                        {optItem.label}
                      </option>
                    ))}
                  </CompactSelect>
                  <KitRemoveButton
                    type="button"
                    aria-label="후신 부처 연결 해제"
                    onClick={() =>
                      setMinistryForm((prevForm) => {
                        const nextList = (
                          prevForm.successorTransitions ?? []
                        ).filter(
                          (item) =>
                            item.successorId !== transitionItem.successorId,
                        )
                        return {
                          ...prevForm,
                          successorTransitions: nextList,
                          successorId: nextList[0]?.successorId ?? '',
                        }
                      })
                    }
                  >
                    <FiTrash2 size={14} />
                  </KitRemoveButton>
                </TransitionTopRow>
                <InlineControlRow>
                  <CompactSelect
                    aria-label="후신 전환 기원"
                    value={transitionItem.era ?? 'AD'}
                    onChange={(changeEvent) => {
                      const nextEra = changeEvent.target.value as 'AD' | 'BC'
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        successorTransitions: (
                          prevForm.successorTransitions ?? []
                        ).map((item) =>
                          item.successorId === transitionItem.successorId
                            ? { ...item, era: nextEra }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 72 }}
                  >
                    <option value="AD">서기</option>
                    <option value="BC">BC</option>
                  </CompactSelect>
                  <Input
                    type="number"
                    min={1}
                    max={9999}
                    placeholder="전환 연도"
                    value={transitionItem.year ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsedYear = rawVal
                        ? Number.parseInt(rawVal, 10)
                        : null
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        successorTransitions: (
                          prevForm.successorTransitions ?? []
                        ).map((item) =>
                          item.successorId === transitionItem.successorId
                            ? {
                                ...item,
                                year:
                                  parsedYear != null &&
                                  Number.isFinite(parsedYear)
                                    ? parsedYear
                                    : null,
                              }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 108 }}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="월"
                    value={transitionItem.month ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsedMonth = rawVal
                        ? Number.parseInt(rawVal, 10)
                        : null
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        successorTransitions: (
                          prevForm.successorTransitions ?? []
                        ).map((item) =>
                          item.successorId === transitionItem.successorId
                            ? {
                                ...item,
                                month:
                                  parsedMonth != null &&
                                  Number.isFinite(parsedMonth)
                                    ? parsedMonth
                                    : null,
                              }
                            : item,
                        ),
                      }))
                    }}
                    style={{ width: 68 }}
                  />
                  <Input
                    type="text"
                    placeholder="개편 사유·비고 (선택)"
                    value={transitionItem.note ?? ''}
                    onChange={(changeEvent) => {
                      const nextNote = changeEvent.target.value
                      setMinistryForm((prevForm) => ({
                        ...prevForm,
                        successorTransitions: (
                          prevForm.successorTransitions ?? []
                        ).map((item) =>
                          item.successorId === transitionItem.successorId
                            ? { ...item, note: nextNote }
                            : item,
                        ),
                      }))
                    }}
                    style={{ flex: '1 1 140px' }}
                  />
                </InlineControlRow>
              </TransitionCard>
            )
          })}

          <SubFieldPair $cols={2}>
            <SearchableSelect
              options={availablePredecessorOptions}
              value=""
              clearable={false}
              onChange={(selectedId) => {
                if (!selectedId) return
                setMinistryForm((prevForm) => {
                  const existing = prevForm.predecessorTransitions ?? []
                  if (
                    existing.some((item) => item.predecessorId === selectedId)
                  ) {
                    return prevForm
                  }
                  return {
                    ...prevForm,
                    predecessorTransitions: [
                      ...existing,
                      {
                        predecessorId: selectedId,
                        kind: 'REORGANIZE' as const,
                        era: prevForm.establishedEra ?? 'AD',
                        year: prevForm.establishedYear ?? null,
                        month: prevForm.establishedMonth ?? null,
                      },
                    ],
                  }
                })
              }}
              placeholder="+ 전신 기관 연결…"
              searchPlaceholder="전신 행정부처·기관명 검색…"
              ariaLabel="전신 기관 검색 및 추가"
              emptyMessage="추가 가능한 기관이 없습니다"
            />

            <SearchableSelect
              options={availableSuccessorOptions}
              value=""
              clearable={false}
              onChange={(selectedId) => {
                if (!selectedId) return
                setMinistryForm((prevForm) => {
                  const existing = prevForm.successorTransitions ?? []
                  if (existing.some((item) => item.successorId === selectedId)) {
                    return prevForm
                  }
                  const nextList = [
                    ...existing,
                    {
                      successorId: selectedId,
                      kind: 'REORGANIZE' as const,
                      era: prevForm.abolishedEra ?? 'AD',
                      year: prevForm.abolishedYear ?? null,
                      month: prevForm.abolishedMonth ?? null,
                    },
                  ]
                  return {
                    ...prevForm,
                    successorId: nextList[0]?.successorId ?? selectedId,
                    successorTransitions: nextList,
                  }
                })
              }}
              placeholder="+ 후신 기관 연결…"
              searchPlaceholder="후신 행정부처·기관명 검색…"
              ariaLabel="후신 기관 검색 및 추가"
              emptyMessage="추가 가능한 기관이 없습니다"
            />
          </SubFieldPair>
        </FieldControl>
      </FieldRow>

      {/* 국방·군사 관련 기관 전용: 군사 사령부·부대로의 기능 개편·이관 계보 (예: 전쟁성 → OKW) */}
      {(isDefenseContext || milSuccessorList.length > 0) && (
        <FieldRow>
          <FieldLabel>
            군조직 개편<OptionalTag>(선택)</OptionalTag>
          </FieldLabel>
          <FieldControl>
            {showMilSuccessorBlock ? (
              <SubDisclosureBox>
                <SubDisclosureHeader>
                  <FiShield size={12} />
                  <span>군사 사령부·부대로의 기능 개편·이관</span>
                </SubDisclosureHeader>
                {milSuccessorList.map((milTransition) => {
                  const targetUnit = allMilitaryUnits.find(
                    (unitItem) => unitItem.id === milTransition.unitId,
                  )
                  const unitLabel = targetUnit
                    ? formatMilitaryUnitOptionLabel(targetUnit)
                    : milTransition.unitId
                  return (
                    <TransitionCard key={milTransition.unitId}>
                      <TransitionTopRow>
                        <TransitionDirectionTag $tone="mil">
                          군조직 이관 →
                        </TransitionDirectionTag>
                        <TransitionTargetName>{unitLabel}</TransitionTargetName>
                        <CompactSelect
                          aria-label="군사조직 개편 유형"
                          value={milTransition.kind}
                          onChange={(changeEvent) => {
                            const nextKind = changeEvent.target
                              .value as MilitaryUnitTransitionKind
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).map((item) =>
                                item.unitId === milTransition.unitId
                                  ? { ...item, kind: nextKind }
                                  : item,
                              ),
                            }))
                          }}
                        >
                          {DEPARTMENT_TRANSITION_KIND_OPTIONS.map((optItem) => (
                            <option key={optItem.value} value={optItem.value}>
                              {optItem.label}
                            </option>
                          ))}
                        </CompactSelect>
                        <KitRemoveButton
                          type="button"
                          aria-label="후신 군사조직 연결 해제"
                          onClick={() =>
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).filter(
                                (item) => item.unitId !== milTransition.unitId,
                              ),
                            }))
                          }
                        >
                          <FiTrash2 size={14} />
                        </KitRemoveButton>
                      </TransitionTopRow>
                      <InlineControlRow>
                        <CompactSelect
                          aria-label="군사조직 전환 기원"
                          value={milTransition.era ?? 'AD'}
                          onChange={(changeEvent) => {
                            const nextEra = changeEvent.target.value as
                              | 'AD'
                              | 'BC'
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).map((item) =>
                                item.unitId === milTransition.unitId
                                  ? { ...item, era: nextEra }
                                  : item,
                              ),
                            }))
                          }}
                          style={{ width: 72 }}
                        >
                          <option value="AD">서기</option>
                          <option value="BC">BC</option>
                        </CompactSelect>
                        <Input
                          type="number"
                          min={1}
                          max={9999}
                          placeholder="전환 연도"
                          value={milTransition.year ?? ''}
                          onChange={(changeEvent) => {
                            const rawVal = changeEvent.target.value.trim()
                            const parsedYear = rawVal
                              ? Number.parseInt(rawVal, 10)
                              : null
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).map((item) =>
                                item.unitId === milTransition.unitId
                                  ? {
                                      ...item,
                                      year:
                                        parsedYear != null &&
                                        Number.isFinite(parsedYear)
                                          ? parsedYear
                                          : null,
                                    }
                                  : item,
                              ),
                            }))
                          }}
                          style={{ width: 108 }}
                        />
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          placeholder="월"
                          value={milTransition.month ?? ''}
                          onChange={(changeEvent) => {
                            const rawVal = changeEvent.target.value.trim()
                            const parsedMonth = rawVal
                              ? Number.parseInt(rawVal, 10)
                              : null
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).map((item) =>
                                item.unitId === milTransition.unitId
                                  ? {
                                      ...item,
                                      month:
                                        parsedMonth != null &&
                                        Number.isFinite(parsedMonth)
                                          ? parsedMonth
                                          : null,
                                    }
                                  : item,
                              ),
                            }))
                          }}
                          style={{ width: 68 }}
                        />
                        <Input
                          type="text"
                          placeholder="개편·이관 사유 (선택)"
                          value={milTransition.note ?? ''}
                          onChange={(changeEvent) => {
                            const nextNote = changeEvent.target.value
                            setMinistryForm((prevForm) => ({
                              ...prevForm,
                              militaryUnitSuccessorTransitions: (
                                prevForm.militaryUnitSuccessorTransitions ?? []
                              ).map((item) =>
                                item.unitId === milTransition.unitId
                                  ? { ...item, note: nextNote }
                                  : item,
                              ),
                            }))
                          }}
                          style={{ flex: '1 1 140px' }}
                        />
                      </InlineControlRow>
                    </TransitionCard>
                  )
                })}

                <SearchableSelect
                  options={availableMilitarySuccessorOptions}
                  value=""
                  clearable={false}
                  onChange={(selectedUnitId) => {
                    if (!selectedUnitId) return
                    setMinistryForm((prevForm) => {
                      const existing =
                        prevForm.militaryUnitSuccessorTransitions ?? []
                      if (
                        existing.some((item) => item.unitId === selectedUnitId)
                      ) {
                        return prevForm
                      }
                      return {
                        ...prevForm,
                        militaryUnitSuccessorTransitions: [
                          ...existing,
                          {
                            unitId: selectedUnitId,
                            kind: 'REORGANIZE',
                            era: prevForm.abolishedEra ?? 'AD',
                            year: prevForm.abolishedYear ?? null,
                            month: prevForm.abolishedMonth ?? null,
                          },
                        ],
                      }
                    })
                  }}
                  placeholder="+ 후신 군사조직(사령부·부대) 연결…"
                  searchPlaceholder="사령부·군부대명, 약칭(OKW 등) 검색…"
                  ariaLabel="후신 군사조직 검색 및 추가"
                  emptyMessage="연결 가능한 군사조직이 없습니다"
                />
              </SubDisclosureBox>
            ) : (
              <SubtleExpandLink
                type="button"
                onClick={() => setMilTransitionExpanded(true)}
              >
                + 해체 후 군사 사령부·부대로 개편된 이력 추가 (예: 전쟁성 → OKW)
              </SubtleExpandLink>
            )}
          </FieldControl>
        </FieldRow>
      )}
    </FormGroup>
  )

  /* ═══════════════ 섹션 3: 맥락 · 소개 (사건 등록 모달 contextGroup 대응) ═══════════════ */
  const contextGroup = (
    <FormGroup
      id="ministry-form-group-context"
      aria-labelledby="ministry-form-group-context-title"
    >
      <FormGroupTitle id="ministry-form-group-context-title">
        맥락 · 소개
      </FormGroupTitle>

      {/* 청사 · 본부 소재지 (장소 검색 · 지도 핀 선택 · Google 지도 미리보기) */}
      <FieldRow>
        <FieldLabel>
          청사 소재지<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <HeadquartersLocationField
            headquarters={ministryForm.defenseHeadquarters}
            latitude={ministryForm.headquartersLatitude ?? null}
            longitude={ministryForm.headquartersLongitude ?? null}
            countryName={countryName}
            departmentName={ministryForm.name}
            ariaLabel="청사 · 본부 소재지"
            onChange={(nextHq) =>
              setMinistryForm((prevForm) => ({
                ...prevForm,
                defenseHeadquarters: nextHq.headquarters,
                headquartersLatitude: nextHq.headquartersLatitude,
                headquartersLongitude: nextHq.headquartersLongitude,
              }))
            }
          />
        </FieldControl>
      </FieldRow>

      {/* 주요 임무 · 관할 */}
      <FieldRow>
        <FieldLabel>
          주요 임무<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <FormTextarea
            rows={2}
            aria-label="주요 임무 · 관할"
            value={ministryForm.defenseMissionScope}
            onChange={(changeEvent) =>
              setMinistryForm((prevForm) => ({
                ...prevForm,
                defenseMissionScope: changeEvent.target.value,
              }))
            }
            placeholder="핵심 관장 임무 (예: 외교 정책 수립·조약 교섭 및 재외공관 총괄)"
          />
        </FieldControl>
      </FieldRow>

      {/* 개요 설명 */}
      <FieldRow>
        <FieldLabel>
          개요 설명<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <FormTextarea
            rows={3}
            value={ministryForm.description}
            onChange={(changeEvent) =>
              setMinistryForm((prevForm) => ({
                ...prevForm,
                description: changeEvent.target.value,
              }))
            }
            placeholder="설립 배경, 시대적 위상, 주요 권한 변천 등 개요 설명을 입력하세요."
          />
        </FieldControl>
      </FieldRow>

      {/* 내부 직제 · 예산 비고 */}
      <FieldRow>
        <FieldLabel>
          직제 · 예산<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          {orgDetailExpanded ? (
            <SubFieldPair $cols={2}>
              <SubField>
                <SubFieldLabel>산하 실 · 국 · 편제</SubFieldLabel>
                <FormTextarea
                  rows={2}
                  aria-label="산하 실·국 · 편제"
                  value={ministryForm.defenseOrgStructure}
                  onChange={(changeEvent) =>
                    setMinistryForm((prevForm) => ({
                      ...prevForm,
                      defenseOrgStructure: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 정무국·통상국·조약국 편성"
                />
              </SubField>
              <SubField>
                <SubFieldLabel>예산 · 정원 · 법제 비고</SubFieldLabel>
                <FormTextarea
                  rows={2}
                  aria-label="예산 · 정원 · 비고"
                  value={ministryForm.defenseBudgetOrForcesNote}
                  onChange={(changeEvent) =>
                    setMinistryForm((prevForm) => ({
                      ...prevForm,
                      defenseBudgetOrForcesNote: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 연간 예산·정원 규모, 조직법 근거"
                />
              </SubField>
            </SubFieldPair>
          ) : (
            <SubtleExpandLink
              type="button"
              onClick={() => setOrgDetailExpanded(true)}
            >
              + 산하 실·국 직제 및 예산·정원 비고 입력
            </SubtleExpandLink>
          )}
        </FieldControl>
      </FieldRow>

      {/* 문장 · 로고 이미지 (사건 등록 모달 KitUploadStrip / KitUploadFilled 정본) */}
      <FieldRow>
        <FieldLabel>
          문장 · 로고<OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          {ministryForm.thumbnailUrl ? (
            <KitUploadFilled
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                setIsThumbDragOver(true)
              }}
              onDragLeave={() => setIsThumbDragOver(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setIsThumbDragOver(false)
                const droppedFile = dropEvent.dataTransfer.files?.[0]
                if (droppedFile) {
                  void uploadThumbnailFile(droppedFile)
                }
              }}
            >
              <KitUploadThumb>
                <img
                  src={getUploadImageUrl(ministryForm.thumbnailUrl)}
                  alt="문장·로고 미리보기"
                />
              </KitUploadThumb>
              <KitUploadText>
                <strong>
                  {isThumbDragOver
                    ? '여기에 놓아 문장·로고 바꾸기'
                    : thumbnailUploading
                      ? '올리는 중…'
                      : '공식 문장 · 로고'}
                </strong>
                <span>목록과 기관 상세 머리에 쓰입니다</span>
              </KitUploadText>
              <KitUploadActions>
                <KitUploadButton
                  type="button"
                  disabled={thumbnailUploading}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  바꾸기
                </KitUploadButton>
                <KitUploadRemove
                  type="button"
                  aria-label="문장·로고 제거"
                  disabled={thumbnailUploading}
                  onClick={() => {
                    setMinistryForm((prevForm) => ({
                      ...prevForm,
                      thumbnailUrl: '',
                    }))
                    if (thumbnailInputRef.current) {
                      thumbnailInputRef.current.value = ''
                    }
                  }}
                >
                  <FiX size={15} />
                </KitUploadRemove>
              </KitUploadActions>
            </KitUploadFilled>
          ) : (
            <KitUploadStrip
              type="button"
              disabled={thumbnailUploading}
              $dragOver={isThumbDragOver}
              onClick={() => thumbnailInputRef.current?.click()}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                setIsThumbDragOver(true)
              }}
              onDragLeave={() => setIsThumbDragOver(false)}
              onDrop={(dropEvent) => {
                dropEvent.preventDefault()
                setIsThumbDragOver(false)
                const droppedFile = dropEvent.dataTransfer.files?.[0]
                if (droppedFile) {
                  void uploadThumbnailFile(droppedFile)
                }
              }}
            >
              <KitUploadThumb aria-hidden="true">
                <FiImage size={18} />
              </KitUploadThumb>
              <KitUploadText>
                <strong>
                  {isThumbDragOver
                    ? '여기에 놓아 문장·로고 올리기'
                    : thumbnailUploading
                      ? '이미지를 올리는 중…'
                      : '공식 문장 · 로고 올리기'}
                </strong>
                <span>클릭 · 드래그 · Ctrl/⌘+V 붙여넣기 · 10MB 이하</span>
              </KitUploadText>
            </KitUploadStrip>
          )}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(changeEvent) => {
              const selectedFile = changeEvent.target.files?.[0]
              if (!selectedFile) return
              changeEvent.target.value = ''
              void uploadThumbnailFile(selectedFile)
            }}
          />
        </FieldControl>
      </FieldRow>
    </FormGroup>
  )

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestCloseModal()
      }}
      title={
        editingMinistry
          ? `${editingMinistry.name} 수정`
          : '중앙부처 · 국가기관 등록'
      }
      headerActions={
        <HeaderActionsBar>
          {selectedParentDept && !editingMinistry ? (
            <HeaderContextBadge
              type="button"
              onClick={() => scrollToSection('ministry-form-group-lineage')}
              title={`상위 기관 '${selectedParentDept.name}'의 산하 기관으로 등록합니다`}
            >
              <span>↳</span>
              <HeaderContextBadgeText>
                {selectedParentDept.name} 산하
              </HeaderContextBadgeText>
            </HeaderContextBadge>
          ) : null}

          <SectionJumpNav aria-label="폼 섹션 이동">
            {FORM_SECTION_LINKS.map((navItem) => {
              const isActive = activeSectionId === navItem.id
              const badgeText =
                navItem.id === 'ministry-form-group-basic'
                  ? isFormValid
                    ? '✓'
                    : null
                  : navItem.id === 'ministry-form-group-lineage'
                    ? lineageBadgeCount > 0
                      ? String(lineageBadgeCount)
                      : null
                    : contextBadgeCount > 0
                      ? String(contextBadgeCount)
                      : null
              return (
                <SectionJumpBtn
                  key={navItem.id}
                  type="button"
                  $active={isActive}
                  aria-label={navItem.label}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => scrollToSection(navItem.id)}
                >
                  <span>{navItem.label}</span>
                  {badgeText ? (
                    <HeaderSectionBadge $done={badgeText === '✓'}>
                      {badgeText}
                    </HeaderSectionBadge>
                  ) : null}
                </SectionJumpBtn>
              )
            })}
          </SectionJumpNav>

          <LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            aria-label={
              layoutMode === 'split'
                ? '1단 세로 보기로 전환'
                : '2단 좌우 분할 보기로 전환'
            }
            title={
              layoutMode === 'split'
                ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
            }
            onClick={toggleLayoutMode}
          >
            <FiColumns size={13} />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </LayoutModeToggleBtn>

          {!editingMinistry && isFormDirty && !submittingMinistry ? (
            <HeaderResetBtn
              type="button"
              aria-label="작성 내용 초기화"
              title="입력한 내용을 모두 비우고 처음 상태로 되돌립니다"
              onClick={() => {
                void handleResetCreateForm()
              }}
            >
              초기화
            </HeaderResetBtn>
          ) : null}
        </HeaderActionsBar>
      }
      maxWidth={
        layoutMode === 'split' ? 'min(1380px, 96vw)' : 'min(1000px, 96vw)'
      }
      minHeight="88vh"
      height={layoutMode === 'split' ? '88vh' : undefined}
      fullBleedOnMobile
      closeOnEsc={
        !submittingMinistry &&
        !establishedDateModalOpen &&
        !abolishedDateModalOpen
      }
      closeOnOverlayClick={
        !submittingMinistry &&
        !establishedDateModalOpen &&
        !abolishedDateModalOpen
      }
    >
      <MinistryModalFormScroll
        ref={scrollContainerRef}
        $layoutMode={layoutMode}
        onScroll={handleFormScroll}
        onScrollCapture={handleFormScroll}
      >
        {submittingMinistry && (
          <KitBusyBar role="status" aria-live="polite">
            {editingMinistry
              ? '수정 사항을 저장하는 중...'
              : '기관을 등록하는 중...'}
          </KitBusyBar>
        )}

        <LabeledRowsWrap>
          {layoutMode === 'split' ? (
            <SplitColumnsGrid data-testid="ministry-form-split-grid">
              <SplitColumnLeft id="ministry-form-split-left">
                {basicGroup}
                {contextGroup}
              </SplitColumnLeft>
              <SplitColumnRight id="ministry-form-split-right">
                {lineageGroup}
              </SplitColumnRight>
            </SplitColumnsGrid>
          ) : (
            <>
              {basicGroup}
              {lineageGroup}
              {contextGroup}
            </>
          )}
        </LabeledRowsWrap>
      </MinistryModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={!isFormValid}>
          {!editingMinistry && batchSavedCount > 0 && (
            <BatchSavedBadge role="status">
              <BatchSavedDot aria-hidden="true" />
              연속 {batchSavedCount}건 등록됨
            </BatchSavedBadge>
          )}
          {!ministryForm.name.trim() ? (
            <FooterJumpButton
              type="button"
              onClick={focusFirstProblemField}
              title="클릭하면 해당 필수 입력 칸으로 이동합니다"
            >
              <span>필수 입력: {activeKindMeta.nameLabel}</span>
              <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
            </FooterJumpButton>
          ) : isDateInverted ? (
            <FooterJumpButton
              type="button"
              onClick={focusFirstProblemField}
              title="클릭하면 폐지일 입력 칸으로 이동합니다"
            >
              <span>날짜 확인: 폐지일이 설립일보다 앞섭니다</span>
              <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
            </FooterJumpButton>
          ) : editingMinistry ? (
            <FooterReadyGroup>
              <span>기관 정보를 수정합니다</span>
              <FooterShortcutItem>
                <FooterKbd>⌘↵</FooterKbd>
                <span>바로 저장</span>
              </FooterShortcutItem>
            </FooterReadyGroup>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>
                등록 준비 완료
                {selectedCategory ? ` · ${selectedCategory.name}` : ''}
              </FooterReadyBadge>
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
            disabled={submittingMinistry}
            onClick={() => {
              void requestCloseModal()
            }}
          >
            취소
          </PersonRegisterModalCancelBtn>
          {!editingMinistry && (
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={!isFormValid || submittingMinistry}
              title="저장 후 창을 닫지 않고 같은 국가·시대·설립 시기로 다음 기관을 바로 이어 등록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
              onClick={() => submitMinistryForm({ continueAfterSave: true })}
            >
              등록 후 계속
            </PersonRegisterModalCancelBtn>
          )}
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={!isFormValid || submittingMinistry}
            title={
              submittingMinistry
                ? '저장 중...'
                : !isFormValid
                  ? '기관명을 입력해야 저장할 수 있습니다'
                  : '단축키: ⌘/Ctrl + Enter'
            }
            onClick={() => submitMinistryForm({ continueAfterSave: false })}
          >
            {submittingMinistry
              ? editingMinistry
                ? '수정 중...'
                : '등록 중...'
              : editingMinistry
                ? '수정 완료'
                : '기관 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        allowPartial
        initialDate={estInitialIso}
        initialPrecision={estInitialPrecision}
        anchorEl={
          establishedDateModalOpen && typeof document !== 'undefined'
            ? document.getElementById(estDateAnchorId)
            : null
        }
        onSelect={(selectedIsoDate, precision) =>
          applyDatePickerResult('est', selectedIsoDate, precision)
        }
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={abolishedDateModalOpen}
        onClose={() => setAbolishedDateModalOpen(false)}
        allowPartial
        initialDate={abolInitialIso}
        initialPrecision={abolInitialPrecision}
        anchorEl={
          abolishedDateModalOpen && typeof document !== 'undefined'
            ? document.getElementById(abolDateAnchorId)
            : null
        }
        onSelect={(selectedIsoDate, precision) =>
          applyDatePickerResult('abol', selectedIsoDate, precision)
        }
        title="폐지일 선택"
      />
    </RegisterModal>
  )
}

/* ─────────────────────────── EventRegisterModal 동일 규격 Styled ─────────────────────────── */

const MinistryModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 1180px) {
      overflow-y: hidden;
      padding: 22px 28px;
    }
  `
      : ''}
`

const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  min-width: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const SplitColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.9fr);
  gap: 0;
  align-items: start;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 1180px) {
    ${FieldRow} {
      grid-template-columns: 112px minmax(0, 1fr);
      gap: 16px;
    }

    ${DateRangeGrid} {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
  }

  @media (max-width: 1179px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const splitPaneScrollStyles = ({ theme }: { theme: DefaultTheme }) => `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 1180px) {
    max-height: calc(88vh - 168px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 48px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${theme.colors.border.default};
      border-radius: 2px;
    }
  }
`

const SplitColumnLeft = styled.div`
  ${splitPaneScrollStyles}

  @media (min-width: 1180px) {
    padding-left: 3px;
    padding-right: 26px;
  }
`

const SplitColumnRight = styled.div`
  ${splitPaneScrollStyles}

  @media (min-width: 1180px) {
    padding-left: 26px;
    padding-right: 3px;
    border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const HeaderContextBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const HeaderContextBadgeText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeaderSectionBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  margin-left: 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.colors.primary};
`

const LayoutModeToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.35)'
          : 'rgba(99, 102, 241, 0.28)'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  @media (max-width: 1180px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const BatchSavedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.28)'
        : 'rgba(16, 185, 129, 0.22)'};
`

const BatchSavedDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
`

const NameAndAbbrGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 156px;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const TitleSuggestionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

const FrameSelectPill = styled.select`
  height: 26px;
  max-width: 196px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  color: ${({ theme }) => kitC(theme).textSecondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  outline: none;
  cursor: pointer;

  &:hover,
  &:focus {
    color: ${({ theme }) => kitC(theme).textPrimary};
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
`

const TitleSuggestionChip = styled.button<{
  $active?: boolean
  $accent?: boolean
}>`
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, $accent, theme }) =>
      $active || $accent
        ? 'rgba(99, 102, 241, 0.5)'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
      : 'transparent'};
  color: ${({ $active, $accent, theme }) =>
    $active || $accent
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active, $accent }) => ($active || $accent ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.14s ease,
    background-color 0.14s ease,
    color 0.14s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.55);
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'};
  }
`

const TitleSuggestionMoreBtn = styled.button`
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PeriodBadge = styled.div`
  width: fit-content;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : theme.colors.primary};
  background: ${({ theme }) =>
    `rgba(99, 102, 241, ${theme.mode === 'dark' ? 0.18 : 0.1})`};
  border: 1px solid rgba(99, 102, 241, 0.22);
  border-radius: 999px;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const DateColumnHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const DateQuickActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const DateQuickActionBtn = styled.button`
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.06);
  }
`

const InlineErrorText = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`

const InlineControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const CategoryMetaLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};

  .meta-summary {
    min-width: 0;
    flex: 1;
  }

  .auto-tag {
    font-weight: 600;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#a5b4fc' : theme.colors.primary};
  }
`

const CompareCatalogLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ModalLineageFlowBoard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'};
`

const ModalLineageGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(110px, 0.85fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ModalLineageLaneBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  min-width: 0;
`

const ModalLineageLaneHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModalLineageLaneCount = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ModalLineageEmpty = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ModalLineagePillWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const ModalLineagePill = styled.span`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ModalLineageArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  user-select: none;

  @media (max-width: 600px) {
    display: none;
  }
`

const ModalLineageSelfBox = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}10`};
  text-align: center;
  min-width: 0;

  .self-role {
    font-size: 10.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
  }

  .self-title {
    max-width: 100%;
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const TransitionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
`

const TransitionTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const TransitionDirectionTag = styled.span<{ $tone: 'pred' | 'succ' | 'mil' }>`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tone, theme }) =>
    $tone === 'pred'
      ? theme.mode === 'dark'
        ? '#cbd5e1'
        : '#475569'
      : $tone === 'mil'
        ? theme.mode === 'dark'
          ? '#5eead4'
          : '#0f766e'
        : theme.mode === 'dark'
          ? '#a5b4fc'
          : theme.colors.primary};
  background: ${({ $tone, theme }) =>
    $tone === 'pred'
      ? theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.16)'
        : '#f1f5f9'
      : $tone === 'mil'
        ? theme.mode === 'dark'
          ? 'rgba(13, 148, 136, 0.16)'
          : '#f0fdfa'
        : theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.18)'
          : 'rgba(99, 102, 241, 0.09)'};
`

const TransitionTargetName = styled.strong`
  flex: 1 1 140px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CompactSelect = styled.select`
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textPrimary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

const SubDisclosureBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SubDisclosureHeader = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    color: #0d9488;
  }
`

const SubtleExpandLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => kitC(theme).borderHover};
  background: transparent;
  color: ${({ theme }) => kitC(theme).textSecondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(99, 102, 241, 0.05);
  }
`
