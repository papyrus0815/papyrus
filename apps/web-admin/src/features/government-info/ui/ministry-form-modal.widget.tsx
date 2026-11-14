import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiCalendar,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi'

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
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import {
  collectDescendantDepartmentIds,
  hasDefenseExtensionContent,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { SidePanel } from '@/shared/ui/side-panel'
import {
  CompactUploadStrip,
  CompactUploadThumb,
  EventStyleFooterBar,
  FlatFieldControl,
  FlatFormLabel,
  FlatFormRow,
  FlatFormSection,
  FlatFormStack,
  FlatHint,
  FlatInput,
  FlatNameAbbrGrid,
  FlatRequired,
  FlatSectionHeader,
  FlatSectionHint,
  FlatSectionTitle,
  FlatSelect,
  FlatTextarea,
  FlatTwoColGrid,
  FooterActionGroup,
  FooterCancelButton,
  FooterHintArea,
  FooterJumpBtn,
  FooterKbd,
  FooterReadyBadge,
  FooterReadyDot,
  FooterReadyGroup,
  FooterShortcutText,
  FooterSubmitButton,
  InlineDateRow,
  InlineIconBtn,
  LinkedRecordRow,
  MobileSectionStrip,
  OutlineAddBtn,
  PanelHeaderActionsBar,
  PanelHeaderContextBadge,
  PillChoiceChip,
  PillChoiceIcon,
  PillChoiceRow,
  QuickPresetChip,
  SectionJumpBadge,
  SectionJumpBtn,
  SectionJumpDone,
  SectionJumpNav,
} from '@/shared/ui/side-panel-form'
import { notify } from '@/shared/ui/toast'

type FormSectionKey = 'basic' | 'lineage' | 'command'

type KindCardMeta = {
  value: AdministrationDepartmentKind
  icon: string
  label: string
  shortBadge: string
  subtitle: string
  examples: string
  nameLabel: string
  namePlaceholder: string
  localPlaceholder: string
  enPlaceholder: string
  abbrPlaceholder: string
  presets: ReadonlyArray<{
    name: string
    abbreviation?: string
    nameLocal?: string
    nameEn?: string
  }>
}

const KIND_CARD_META_LIST: ReadonlyArray<KindCardMeta> = [
  {
    value: 'MINISTRY',
    icon: '🏛️',
    label: '중앙부처',
    shortBadge: '부처·성·조',
    subtitle: '내각·행정부 소속 장관급 중앙 행정부처 및 전근대 6조·성',
    examples: '국방부, 외무성, 제국전쟁성, 재무부, 이조·병조',
    nameLabel: '부처·기관명',
    namePlaceholder: '예: 국방부, 외무성, 제국전쟁성, 병조',
    localPlaceholder: '예: Reichskriegsministerium, 外務省, 兵曹',
    enPlaceholder: '예: Ministry of National Defense',
    abbrPlaceholder: '약칭 (예: 국방부, RKM)',
    presets: [
      {
        name: '국방부',
        nameEn: 'Ministry of National Defense',
        abbreviation: '국방부',
      },
      {
        name: '외무부',
        nameEn: 'Ministry of Foreign Affairs',
        abbreviation: '외무부',
      },
      {
        name: '내무부',
        nameEn: 'Ministry of the Interior',
        abbreviation: '내무부',
      },
      {
        name: '재무부',
        nameEn: 'Ministry of Finance',
        abbreviation: '재무부',
      },
      {
        name: '전쟁성',
        nameLocal: 'Reichskriegsministerium',
        nameEn: 'Ministry of War',
        abbreviation: '전쟁성',
      },
    ],
  },
  {
    value: 'AGENCY',
    icon: '🛰️',
    label: '외청·정보·위원회',
    shortBadge: '외청·정보·위원회',
    subtitle: '부처 산하 외청, 정보·방첩·치안기구, 감사원, 국가위원회',
    examples: '국가보안본부(RSHA), 아프베어, CIA, NKVD, 감사원',
    nameLabel: '외청·기구명',
    namePlaceholder: '예: 국가보안본부, 해외방첩국, 중앙정보국, 감사원',
    localPlaceholder: '예: Reichssicherheitshauptamt, Amt Ausland/Abwehr',
    enPlaceholder: '예: Reich Main Security Office, Central Intelligence Agency',
    abbrPlaceholder: '약칭 (예: RSHA, CIA)',
    presets: [
      {
        name: '국가보안본부',
        abbreviation: 'RSHA',
        nameLocal: 'Reichssicherheitshauptamt',
        nameEn: 'Reich Main Security Office',
      },
      {
        name: '해외방첩국',
        abbreviation: 'Abwehr',
        nameLocal: 'Amt Ausland/Abwehr',
        nameEn: 'Foreign Military Intelligence Service',
      },
      {
        name: '중앙정보국',
        abbreviation: 'CIA',
        nameEn: 'Central Intelligence Agency',
      },
      {
        name: '감사원',
        nameEn: 'Board of Audit and Inspection',
      },
    ],
  },
  {
    value: 'ROYAL_HOUSEHOLD',
    icon: '👑',
    label: '궁내·원수직속',
    shortBadge: '궁내·원수직속',
    subtitle: '군주·황실 보좌 기구 및 국가원수·총통 직속 비서실·관저',
    examples: '총통관저, 대통령비서실, 궁내성, 추밀원, 승정원',
    nameLabel: '직속·궁내기구명',
    namePlaceholder: '예: 총통관저, 국가원수비서실, 궁내성, 추밀원, 승정원',
    localPlaceholder: '예: Reichskanzlei, 宮内省, 承政院',
    enPlaceholder: '예: Reich Chancellery, Imperial Household Ministry',
    abbrPlaceholder: '약칭 (예: 총통관저, 궁내성)',
    presets: [
      {
        name: '제국수상부',
        nameLocal: 'Reichskanzlei',
        nameEn: 'Reich Chancellery',
      },
      {
        name: '궁내성',
        nameLocal: '宮内省',
        nameEn: 'Ministry of the Imperial Household',
      },
      {
        name: '추밀원',
        nameLocal: '枢密院',
        nameEn: 'Privy Council',
      },
    ],
  },
  {
    value: 'COLONIAL_GOVERNMENT',
    icon: '🗺️',
    label: '총독부·점령청',
    shortBadge: '총독부·점령청',
    subtitle: '식민지·속령·점령지 통치를 위해 설치된 총독부 및 민정청',
    examples: '조선총독부, 동방점령지성, 폴란드 총독부, 인도 정청',
    nameLabel: '총독부·통치기구명',
    namePlaceholder: '예: 조선총독부, 동방점령지성, 폴란드 총독부',
    localPlaceholder:
      '예: 朝鮮總督府, Reichsministerium für die besetzten Ostgebiete',
    enPlaceholder:
      '예: Government-General of Joseon, Reich Ministry for the Occupied Eastern Territories',
    abbrPlaceholder: '약칭 (예: 총독부, RMfdbO)',
    presets: [
      {
        name: '동방점령지성',
        abbreviation: 'RMfdbO',
        nameLocal: 'Reichsministerium für die besetzten Ostgebiete',
        nameEn: 'Reich Ministry for the Occupied Eastern Territories',
      },
      {
        name: '조선총독부',
        nameLocal: '朝鮮總督府',
        nameEn: 'Government-General of Korea',
      },
    ],
  },
  {
    value: 'OTHER',
    icon: '⚖️',
    label: '기타 국가기관',
    shortBadge: '기타 국가기관',
    subtitle: '의회, 대법원·재판소, 헌법기관 및 특수 국가기구',
    examples: '제국의회, 연방대법원, 헌법재판소, 인민법원',
    nameLabel: '국가기관명',
    namePlaceholder: '예: 제국의회, 인민법원, 헌법재판소',
    localPlaceholder: '예: Reichstag, Volksgerichtshof',
    enPlaceholder: '예: Reichstag, Supreme Court',
    abbrPlaceholder: '약칭 (예: 의회, 대법원)',
    presets: [
      {
        name: '제국의회',
        nameLocal: 'Reichstag',
        nameEn: 'Imperial Diet',
      },
      {
        name: '대법원',
        nameEn: 'Supreme Court',
      },
    ],
  },
]

export type MinistryFormModalProps = {
  effectiveCountryId: string | undefined
  isHistorical?: boolean
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
  submitMinistryForm: () => void
  submittingMinistry?: boolean
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
    isHistorical = false,
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
    thumbnailInputRef,
    thumbnailUploading,
    setThumbnailUploading,
    establishedDateModalOpen,
    setEstablishedDateModalOpen,
    abolishedDateModalOpen,
    setAbolishedDateModalOpen,
  } = props

  const [activeSection, setActiveSection] = useState<FormSectionKey>('basic')
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const formRootRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveSection('basic')
      setInlineCategoryOpen(false)
      setNewCategoryName('')
      setNewCategoryNameEn('')
    }
  }, [isOpen, editingMinistry?.id])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (
        (keyEvent.metaKey || keyEvent.ctrlKey) &&
        keyEvent.key === 'Enter' &&
        !submittingMinistry &&
        ministryForm.name.trim()
      ) {
        keyEvent.preventDefault()
        submitMinistryForm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, ministryForm.name, submitMinistryForm, submittingMinistry])

  const scrollToSection = useCallback((sectionKey: FormSectionKey) => {
    setActiveSection(sectionKey)
    const targetNode = formRootRef.current?.querySelector<HTMLElement>(
      `[data-form-section="${sectionKey}"]`,
    )
    targetNode?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      isOpen && !isHistorical && effectiveCountryId ? effectiveCountryId : '',
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
    enabled: Boolean(isOpen && effectiveCountryId),
    staleTime: 60_000,
  })

  const countryMilitaryUnits = useMemo(() => {
    if (!effectiveCountryId) return []
    return allMilitaryUnits.filter((unitItem) => {
      if (isHistorical) {
        return unitItem.historicalCountryId === effectiveCountryId
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
  }, [allMilitaryUnits, effectiveCountryId, isHistorical, linkedHistIdSet])

  const activeKindMeta = useMemo(
    () =>
      KIND_CARD_META_LIST.find(
        (metaItem) => metaItem.value === (ministryForm.kind || 'MINISTRY'),
      ) ?? KIND_CARD_META_LIST[0],
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
      .sort((left, right) => {
        const leftSameEra =
          (left.historicalCountryId ?? '') ===
          (ministryForm.historicalCountryId ?? '')
            ? 0
            : 1
        const rightSameEra =
          (right.historicalCountryId ?? '') ===
          (ministryForm.historicalCountryId ?? '')
            ? 0
            : 1
        if (leftSameEra !== rightSameEra) return leftSameEra - rightSameEra
        return left.name.localeCompare(right.name, 'ko')
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

  const selectedEraLabel = useMemo(() => {
    if (isHistorical) return null
    if (!ministryForm.historicalCountryId) return null
    return (
      linkedHistoricalCountries.find(
        (histItem) => histItem.id === ministryForm.historicalCountryId,
      )?.name ??
      editingMinistry?.historicalCountry?.name ??
      null
    )
  }, [
    editingMinistry?.historicalCountry?.name,
    isHistorical,
    linkedHistoricalCountries,
    ministryForm.historicalCountryId,
  ])

  const lineageTotalCount =
    (ministryForm.predecessorTransitions?.length ?? 0) +
    (ministryForm.successorTransitions?.length ?? 0) +
    (ministryForm.militaryUnitSuccessorTransitions?.length ?? 0)

  const commandTabBadgeCount = useMemo(() => {
    const unitCount = ministryForm.linkedMilitaryUnitIds?.length ?? 0
    const hasDetail = hasDefenseExtensionContent({
      officialNameEn: ministryForm.defenseOfficialNameEn,
      missionScope: ministryForm.defenseMissionScope,
      headquarters: ministryForm.defenseHeadquarters,
      orgStructure: ministryForm.defenseOrgStructure,
      budgetOrForcesNote: ministryForm.defenseBudgetOrForcesNote,
    })
    return unitCount + (hasDetail ? 1 : 0)
  }, [
    ministryForm.defenseBudgetOrForcesNote,
    ministryForm.defenseHeadquarters,
    ministryForm.defenseMissionScope,
    ministryForm.defenseOfficialNameEn,
    ministryForm.defenseOrgStructure,
    ministryForm.linkedMilitaryUnitIds?.length,
  ])

  const handleCreateInlineCategory = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName || creatingCategory) return
    setCreatingCategory(true)
    try {
      const createdCat = await administrationDepartmentApi.createCategory({
        name: trimmedName,
        nameEn: newCategoryNameEn.trim() || null,
      })
      setCategoriesList?.((prev) =>
        [...prev, createdCat].sort((left, right) =>
          left.name.localeCompare(right.name, 'ko'),
        ),
      )
      reloadCategories?.()
      setMinistryForm((prev) => ({ ...prev, categoryId: createdCat.id }))
      setNewCategoryName('')
      setNewCategoryNameEn('')
      setInlineCategoryOpen(false)
      notify.success(`「${createdCat.name}」 분류가 추가되어 선택되었습니다.`)
    } catch (err) {
      notify.error(getApiErrorMessage(err, '분류 생성에 실패했습니다.'))
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleSelectParentId = (selectedId: string) => {
    const matchedParent = ministriesList.find(
      (deptItem) => deptItem.id === selectedId,
    )
    setMinistryForm((prev) => {
      if (!matchedParent) {
        return { ...prev, parentId: '' }
      }
      const nextHistId =
        !isHistorical && matchedParent.historicalCountryId !== undefined
          ? (matchedParent.historicalCountryId ?? '')
          : prev.historicalCountryId
      const nextCatId = prev.categoryId || matchedParent.categoryId || ''
      return {
        ...prev,
        parentId: selectedId,
        historicalCountryId: nextHistId,
        categoryId: nextCatId,
      }
    })
  }

  const buildDeptSelectOption = useCallback(
    (deptItem: AdministrationDepartment): SearchableSelectOption => {
      const kindMeta = KIND_CARD_META_LIST.find(
        (metaItem) => metaItem.value === deptItem.kind,
      )
      const abbrSuffix = deptItem.abbreviation?.trim()
        ? ` (${deptItem.abbreviation.trim()})`
        : ''
      return {
        value: deptItem.id,
        label: `${deptItem.name}${abbrSuffix}`,
        icon: kindMeta?.icon ?? '🏛️',
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
    const kindMeta = KIND_CARD_META_LIST.find(
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
      categoriesList.map((catItem) => ({
        value: catItem.id,
        label: catItem.name,
        meta: catItem.nameEn ?? undefined,
        keywords: catItem.nameEn ?? '',
      })),
    [categoriesList],
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
          icon: '🛡️',
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

  const unlinkedMilitaryUnitOptions = useMemo<SearchableSelectOption[]>(
    () =>
      countryMilitaryUnits
        .filter((unitItem) => {
          if (
            ministryForm.historicalCountryId &&
            unitItem.historicalCountryId &&
            unitItem.historicalCountryId !== ministryForm.historicalCountryId
          ) {
            return false
          }
          return !(ministryForm.linkedMilitaryUnitIds ?? []).includes(
            unitItem.id,
          )
        })
        .map((unitItem) => ({
          value: unitItem.id,
          label: `${unitItem.name}${unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}`,
          icon: '🛡️',
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
    [
      countryMilitaryUnits,
      ministryForm.historicalCountryId,
      ministryForm.linkedMilitaryUnitIds,
    ],
  )

  if (!effectiveCountryId || !isOpen) return null

  const isFormValid = Boolean(ministryForm.name.trim())

  const renderSectionJumpButtons = () => (
    <>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'basic'}
        onClick={() => scrollToSection('basic')}
      >
        기본 정보
        {isFormValid ? <SectionJumpDone>✓</SectionJumpDone> : null}
      </SectionJumpBtn>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'lineage'}
        onClick={() => scrollToSection('lineage')}
      >
        계보
        {lineageTotalCount > 0 ? (
          <SectionJumpBadge>{lineageTotalCount}</SectionJumpBadge>
        ) : null}
      </SectionJumpBtn>
      <SectionJumpBtn
        type="button"
        $active={activeSection === 'command'}
        onClick={() => scrollToSection('command')}
      >
        관할 · 군부대
        {commandTabBadgeCount > 0 ? (
          <SectionJumpBadge>{commandTabBadgeCount}</SectionJumpBadge>
        ) : null}
      </SectionJumpBtn>
    </>
  )

  return (
    <>
      <SidePanel
        isOpen={isOpen}
        onClose={closeMinistryFormModal}
        width="min(880px, 100vw)"
        closeOnEscape={!establishedDateModalOpen && !abolishedDateModalOpen}
        title={
          editingMinistry
            ? '중앙부처 · 국가기관 수정'
            : '중앙부처 · 국가기관 등록'
        }
        headerActions={
          <PanelHeaderActionsBar>
            {selectedParentDept ? (
              <PanelHeaderContextBadge
                title={`상위 기관: ${selectedParentDept.name}`}
              >
                ↳ 상위: {selectedParentDept.name}
              </PanelHeaderContextBadge>
            ) : selectedEraLabel ? (
              <PanelHeaderContextBadge
                title={`소속 시대: ${selectedEraLabel}`}
              >
                🏛️ {selectedEraLabel}
              </PanelHeaderContextBadge>
            ) : null}
            <SectionJumpNav aria-label="기관 등록 섹션 이동">
              {renderSectionJumpButtons()}
            </SectionJumpNav>
          </PanelHeaderActionsBar>
        }
        footer={
          <EventStyleFooterBar>
            <FooterHintArea>
              {!isFormValid ? (
                <FooterJumpBtn
                  type="button"
                  onClick={() => {
                    scrollToSection('basic')
                    window.setTimeout(() => nameInputRef.current?.focus(), 120)
                  }}
                >
                  필수 입력: {activeKindMeta.nameLabel} →
                </FooterJumpBtn>
              ) : (
                <FooterReadyGroup>
                  <FooterReadyBadge>
                    <FooterReadyDot />
                    {editingMinistry ? '수정 준비 완료' : '등록 준비 완료'}
                  </FooterReadyBadge>
                  <FooterShortcutText>
                    <FooterKbd>⌘↵</FooterKbd> 저장
                  </FooterShortcutText>
                </FooterReadyGroup>
              )}
            </FooterHintArea>

            <FooterActionGroup>
              <FooterCancelButton
                type="button"
                onClick={closeMinistryFormModal}
              >
                취소
              </FooterCancelButton>
              <FooterSubmitButton
                type="button"
                disabled={submittingMinistry || !isFormValid}
                onClick={submitMinistryForm}
              >
                {submittingMinistry
                  ? '저장 중…'
                  : editingMinistry
                    ? '변경사항 저장'
                    : '기관 등록'}
              </FooterSubmitButton>
            </FooterActionGroup>
          </EventStyleFooterBar>
        }
      >
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async (changeEvent) => {
            const selectedFile = changeEvent.target.files?.[0]
            if (!selectedFile) return
            changeEvent.target.value = ''
            try {
              validateImageFile(selectedFile)
              setThumbnailUploading(true)
              const uploaded = await uploadImage(selectedFile, 'ministries')
              setMinistryForm((prev) => ({
                ...prev,
                thumbnailUrl: uploaded.url,
              }))
            } catch (err) {
              notify.error(
                getApiErrorMessage(err, '이미지 업로드에 실패했습니다.'),
              )
            } finally {
              setThumbnailUploading(false)
            }
          }}
        />

        <MobileSectionStrip>{renderSectionJumpButtons()}</MobileSectionStrip>

        <FlatFormStack ref={formRootRef}>
          {/* 1. 기본 정보 · 편제 위계 */}
          <FlatFormSection
            data-form-section="basic"
            onFocusCapture={() => setActiveSection('basic')}
          >
            <FlatSectionHeader>
              <FlatSectionTitle>기본 정보 · 편제 위계</FlatSectionTitle>
              <FlatSectionHint>{activeKindMeta.subtitle}</FlatSectionHint>
            </FlatSectionHeader>

            <FlatFormRow>
              <FlatFormLabel>기관 성격</FlatFormLabel>
              <FlatFieldControl>
                <PillChoiceRow role="radiogroup" aria-label="기관 성격 구분">
                  {KIND_CARD_META_LIST.map((kindItem) => {
                    const isSelected =
                      (ministryForm.kind || 'MINISTRY') === kindItem.value
                    return (
                      <PillChoiceChip
                        key={kindItem.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        $selected={isSelected}
                        onClick={() =>
                          setMinistryForm((prev) => ({
                            ...prev,
                            kind: kindItem.value,
                          }))
                        }
                      >
                        <PillChoiceIcon $selected={isSelected}>
                          {kindItem.icon}
                        </PillChoiceIcon>
                        <span>{kindItem.label}</span>
                      </PillChoiceChip>
                    )
                  })}
                </PillChoiceRow>
                <FlatHint>
                  군 최고사령부(OKW·STAVKA)·참모본부·야전부대는 상단 「군사」
                  탭에서 등록합니다. (예: {activeKindMeta.examples})
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel htmlFor="ministry-form-name">
                {activeKindMeta.nameLabel}
                <FlatRequired>*</FlatRequired>
              </FlatFormLabel>
              <FlatFieldControl>
                <FlatNameAbbrGrid>
                  <FlatInput
                    ref={nameInputRef}
                    id="ministry-form-name"
                    type="text"
                    value={ministryForm.name}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        name: changeEvent.target.value,
                      }))
                    }
                    placeholder={activeKindMeta.namePlaceholder}
                  />
                  <FlatInput
                    type="text"
                    aria-label="약칭"
                    value={ministryForm.abbreviation}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        abbreviation: changeEvent.target.value,
                      }))
                    }
                    placeholder={activeKindMeta.abbrPlaceholder}
                  />
                </FlatNameAbbrGrid>

                {activeKindMeta.presets.length > 0 && (
                  <InlineDateRow>
                    <FlatHint>빠른 예시:</FlatHint>
                    {activeKindMeta.presets.map((presetItem) => (
                      <QuickPresetChip
                        key={presetItem.name}
                        type="button"
                        $active={ministryForm.name === presetItem.name}
                        onClick={() =>
                          setMinistryForm((prev) => ({
                            ...prev,
                            name: presetItem.name,
                            abbreviation:
                              presetItem.abbreviation ?? prev.abbreviation,
                            nameLocal: presetItem.nameLocal ?? prev.nameLocal,
                            nameEn: presetItem.nameEn ?? prev.nameEn,
                            defenseOfficialNameEn:
                              presetItem.nameEn ?? prev.defenseOfficialNameEn,
                          }))
                        }
                      >
                        + {presetItem.name}
                        {presetItem.abbreviation &&
                        presetItem.abbreviation !== presetItem.name
                          ? ` (${presetItem.abbreviation})`
                          : ''}
                      </QuickPresetChip>
                    ))}
                  </InlineDateRow>
                )}
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>원어 · 영문 표기</FlatFormLabel>
              <FlatFieldControl>
                <FlatTwoColGrid>
                  <FlatInput
                    type="text"
                    aria-label="원어 표기"
                    value={ministryForm.nameLocal}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        nameLocal: changeEvent.target.value,
                      }))
                    }
                    placeholder={activeKindMeta.localPlaceholder}
                  />
                  <FlatInput
                    type="text"
                    aria-label="영문 표기"
                    value={ministryForm.nameEn}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        nameEn: changeEvent.target.value,
                        defenseOfficialNameEn: changeEvent.target.value,
                      }))
                    }
                    placeholder={activeKindMeta.enPlaceholder}
                  />
                </FlatTwoColGrid>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>문장 · 로고</FlatFormLabel>
              <FlatFieldControl>
                <CompactUploadStrip>
                  <CompactUploadThumb>
                    {ministryForm.thumbnailUrl ? (
                      <img
                        src={getUploadImageUrl(ministryForm.thumbnailUrl)}
                        alt=""
                      />
                    ) : (
                      <FiUpload size={16} />
                    )}
                  </CompactUploadThumb>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <FlatHint>
                      {thumbnailUploading
                        ? '문장·로고 이미지를 업로드하는 중입니다…'
                        : ministryForm.thumbnailUrl
                          ? '등록된 문장·로고 이미지가 적용되어 있습니다.'
                          : '기관의 공식 문장·인장·로고 이미지를 업로드합니다 (선택)'}
                    </FlatHint>
                  </div>
                  <InlineDateRow>
                    <InlineIconBtn
                      type="button"
                      disabled={thumbnailUploading}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <FiUpload size={13} />
                      {ministryForm.thumbnailUrl ? '변경' : '업로드'}
                    </InlineIconBtn>
                    {ministryForm.thumbnailUrl ? (
                      <InlineIconBtn
                        type="button"
                        $danger
                        disabled={thumbnailUploading}
                        onClick={() =>
                          setMinistryForm((prev) => ({
                            ...prev,
                            thumbnailUrl: '',
                          }))
                        }
                      >
                        <FiTrash2 size={13} />
                        제거
                      </InlineIconBtn>
                    ) : null}
                  </InlineDateRow>
                </CompactUploadStrip>
              </FlatFieldControl>
            </FlatFormRow>

            {!isHistorical && linkedHistoricalCountries.length > 0 && (
              <FlatFormRow>
                <FlatFormLabel>소속 시대 · 정체</FlatFormLabel>
                <FlatFieldControl>
                  <PillChoiceRow role="radiogroup" aria-label="소속 시대 선택">
                    <PillChoiceChip
                      type="button"
                      role="radio"
                      aria-checked={!ministryForm.historicalCountryId}
                      $selected={!ministryForm.historicalCountryId}
                      onClick={() =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          historicalCountryId: '',
                        }))
                      }
                    >
                      <PillChoiceIcon
                        $selected={!ministryForm.historicalCountryId}
                      >
                        🏳️
                      </PillChoiceIcon>
                      <span>현대 국가 직속</span>
                    </PillChoiceChip>
                    {linkedHistoricalCountries.map((histCountry) => {
                      const isSelected =
                        ministryForm.historicalCountryId === histCountry.id
                      return (
                        <PillChoiceChip
                          key={histCountry.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          $selected={isSelected}
                          onClick={() =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              historicalCountryId: histCountry.id,
                            }))
                          }
                        >
                          <PillChoiceIcon $selected={isSelected}>
                            🏛️
                          </PillChoiceIcon>
                          <span>{histCountry.name}</span>
                        </PillChoiceChip>
                      )
                    })}
                  </PillChoiceRow>
                </FlatFieldControl>
              </FlatFormRow>
            )}

            <FlatFormRow>
              <FlatFormLabel>상위 기관</FlatFormLabel>
              <FlatFieldControl>
                <SearchableSelect
                  options={parentDeptOptions}
                  value={ministryForm.parentId}
                  onChange={(nextParentId) => handleSelectParentId(nextParentId)}
                  placeholder="최상위 독립 기관 (상위 기관 없음)"
                  searchPlaceholder="상위 부처·기관명, 약칭, 시대 검색…"
                  ariaLabel="상위 기관 선택"
                  emptyMessage="선택 가능한 상위 기관이 없습니다"
                />
                {candidateParentDepartments.length > 0 && (
                  <InlineDateRow>
                    <FlatHint>빠른 상위 지정:</FlatHint>
                    {candidateParentDepartments
                      .slice(0, 6)
                      .map((parentCandidate) => {
                        const isCurrentParent =
                          ministryForm.parentId === parentCandidate.id
                        return (
                          <QuickPresetChip
                            key={parentCandidate.id}
                            type="button"
                            $active={isCurrentParent}
                            onClick={() =>
                              handleSelectParentId(
                                isCurrentParent ? '' : parentCandidate.id,
                              )
                            }
                          >
                            {parentCandidate.historicalCountry?.name
                              ? `[${parentCandidate.historicalCountry.name}] `
                              : ''}
                            {parentCandidate.name}
                          </QuickPresetChip>
                        )
                      })}
                  </InlineDateRow>
                )}
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>분야 카테고리</FlatFormLabel>
              <FlatFieldControl>
                <InlineDateRow>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <SearchableSelect
                      options={categoryOptions}
                      value={ministryForm.categoryId || ''}
                      onChange={(nextCatId) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          categoryId: nextCatId,
                        }))
                      }
                      placeholder="미분류 · 직속 기구"
                      searchPlaceholder="국방, 외교, 재무 등 분류 검색…"
                      ariaLabel="분야 카테고리 선택"
                      emptyMessage="등록된 카테고리가 없습니다"
                    />
                  </div>
                  <OutlineAddBtn
                    type="button"
                    onClick={() => setInlineCategoryOpen((prev) => !prev)}
                  >
                    <FiPlus size={14} />새 분류 추가
                  </OutlineAddBtn>
                </InlineDateRow>

                {inlineCategoryOpen && (
                  <InlineDateRow>
                    <FlatInput
                      type="text"
                      value={newCategoryName}
                      onChange={(changeEvent) =>
                        setNewCategoryName(changeEvent.target.value)
                      }
                      placeholder="새 분류명 (예: 국방·군사, 외교, 정보·치안)"
                      style={{ flex: '1 1 200px' }}
                    />
                    <FlatInput
                      type="text"
                      value={newCategoryNameEn}
                      onChange={(changeEvent) =>
                        setNewCategoryNameEn(changeEvent.target.value)
                      }
                      placeholder="영문명 (선택)"
                      style={{ flex: '0 1 170px' }}
                    />
                    <InlineIconBtn
                      type="button"
                      disabled={!newCategoryName.trim() || creatingCategory}
                      onClick={() => void handleCreateInlineCategory()}
                    >
                      {creatingCategory ? '추가 중…' : '즉시 추가'}
                    </InlineIconBtn>
                  </InlineDateRow>
                )}
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>설립 시점</FlatFormLabel>
              <FlatFieldControl>
                <InlineDateRow>
                  <FlatSelect
                    aria-label="설립 기원"
                    value={ministryForm.establishedEra || 'AD'}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        establishedEra: changeEvent.target.value as 'AD' | 'BC',
                      }))
                    }
                    style={{ width: 74 }}
                  >
                    <option value="AD">서기</option>
                    <option value="BC">BC</option>
                  </FlatSelect>
                  <FlatInput
                    type="number"
                    min={1}
                    max={9999}
                    placeholder="연도 (예: 1938)"
                    value={ministryForm.establishedYear ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        establishedYear:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 136 }}
                  />
                  <FlatInput
                    type="number"
                    min={1}
                    max={12}
                    placeholder="월"
                    value={ministryForm.establishedMonth ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        establishedMonth:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 72 }}
                  />
                  <FlatInput
                    type="number"
                    min={1}
                    max={31}
                    placeholder="일"
                    value={ministryForm.establishedDay ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        establishedDay:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 72 }}
                  />
                  <InlineIconBtn
                    type="button"
                    onClick={() => setEstablishedDateModalOpen(true)}
                    title="달력에서 날짜 선택"
                  >
                    <FiCalendar size={14} />
                    달력
                  </InlineIconBtn>
                  {(ministryForm.establishedYear != null ||
                    ministryForm.establishedDate) && (
                    <InlineIconBtn
                      type="button"
                      onClick={() =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          establishedDate: '',
                          establishedEra: 'AD',
                          establishedYear: null,
                          establishedMonth: null,
                          establishedDay: null,
                        }))
                      }
                      title="설립 시점 비우기"
                    >
                      <FiX size={14} />
                    </InlineIconBtn>
                  )}
                </InlineDateRow>
                <FlatHint>
                  연도만(예: 1392) 또는 연·월(예: 1938.2)만 입력해도 저장됩니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>폐지 시점</FlatFormLabel>
              <FlatFieldControl>
                <InlineDateRow>
                  <FlatSelect
                    aria-label="폐지 기원"
                    value={ministryForm.abolishedEra || 'AD'}
                    onChange={(changeEvent) =>
                      setMinistryForm((prev) => ({
                        ...prev,
                        abolishedEra: changeEvent.target.value as 'AD' | 'BC',
                      }))
                    }
                    style={{ width: 74 }}
                  >
                    <option value="AD">서기</option>
                    <option value="BC">BC</option>
                  </FlatSelect>
                  <FlatInput
                    type="number"
                    min={1}
                    max={9999}
                    placeholder="연도 (예: 1945)"
                    value={ministryForm.abolishedYear ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        abolishedYear:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 136 }}
                  />
                  <FlatInput
                    type="number"
                    min={1}
                    max={12}
                    placeholder="월"
                    value={ministryForm.abolishedMonth ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        abolishedMonth:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 72 }}
                  />
                  <FlatInput
                    type="number"
                    min={1}
                    max={31}
                    placeholder="일"
                    value={ministryForm.abolishedDay ?? ''}
                    onChange={(changeEvent) => {
                      const rawVal = changeEvent.target.value.trim()
                      const parsed = rawVal ? Number.parseInt(rawVal, 10) : null
                      setMinistryForm((prev) => ({
                        ...prev,
                        abolishedDay:
                          parsed != null && Number.isFinite(parsed)
                            ? parsed
                            : null,
                      }))
                    }}
                    style={{ width: 72 }}
                  />
                  <InlineIconBtn
                    type="button"
                    onClick={() => setAbolishedDateModalOpen(true)}
                    title="달력에서 날짜 선택"
                  >
                    <FiCalendar size={14} />
                    달력
                  </InlineIconBtn>
                  {(ministryForm.abolishedYear != null ||
                    ministryForm.abolishedDate) && (
                    <InlineIconBtn
                      type="button"
                      onClick={() =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          abolishedDate: '',
                          abolishedEra: 'AD',
                          abolishedYear: null,
                          abolishedMonth: null,
                          abolishedDay: null,
                        }))
                      }
                      title="폐지 시점 비우기"
                    >
                      <FiX size={14} />
                    </InlineIconBtn>
                  )}
                </InlineDateRow>
                <FlatHint>
                  비워두면 현재까지 존속(또는 폐지 시점 미상)으로 표시됩니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>기관 개요</FlatFormLabel>
              <FlatFieldControl>
                <FlatTextarea
                  rows={3}
                  value={ministryForm.description}
                  onChange={(changeEvent) =>
                    setMinistryForm((prev) => ({
                      ...prev,
                      description: changeEvent.target.value,
                    }))
                  }
                  placeholder="기관의 설립 배경, 핵심 권한, 역사적 의의 등을 요약해 주세요."
                />
              </FlatFieldControl>
            </FlatFormRow>
          </FlatFormSection>

          {/* 2. 조직 계보 */}
          <FlatFormSection
            data-form-section="lineage"
            onFocusCapture={() => setActiveSection('lineage')}
          >
            <FlatSectionHeader>
              <FlatSectionTitle>
                조직 계보 (전신 · 후신 · 군사조직 이관)
              </FlatSectionTitle>
              <FlatSectionHint>
                개편 · 개칭 · 분할 · 통합 이력 ({lineageTotalCount}건)
              </FlatSectionHint>
            </FlatSectionHeader>

            <FlatFormRow>
              <FlatFormLabel>전신 기관</FlatFormLabel>
              <FlatFieldControl>
                {(ministryForm.predecessorTransitions ?? []).map((predItem) => {
                  const targetDept = ministriesList.find(
                    (deptItem) => deptItem.id === predItem.predecessorId,
                  )
                  const deptLabel = targetDept
                    ? formatDeptOptionLabel(targetDept)
                    : predItem.predecessorId
                  return (
                    <LinkedRecordRow key={predItem.predecessorId}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 600,
                            minWidth: 0,
                          }}
                        >
                          {deptLabel} → 현재 기관
                        </span>
                        <FlatSelect
                          aria-label="전신 개편 유형"
                          value={predItem.kind}
                          onChange={(changeEvent) => {
                            const nextKind = changeEvent.target
                              .value as DepartmentTransitionKind
                            setMinistryForm((prev) => ({
                              ...prev,
                              predecessorTransitions: (
                                prev.predecessorTransitions ?? []
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
                        </FlatSelect>
                        <InlineIconBtn
                          type="button"
                          $danger
                          aria-label="전신 기관 연결 해제"
                          onClick={() =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              predecessorTransitions: (
                                prev.predecessorTransitions ?? []
                              ).filter(
                                (item) =>
                                  item.predecessorId !== predItem.predecessorId,
                              ),
                            }))
                          }
                        >
                          <FiTrash2 size={14} />
                        </InlineIconBtn>
                      </div>
                      <InlineDateRow>
                        <FlatInput
                          type="number"
                          min={1}
                          max={9999}
                          placeholder="전환 연도(예: 1938)"
                          value={predItem.year ?? ''}
                          onChange={(changeEvent) => {
                            const rawVal = changeEvent.target.value.trim()
                            const parsedYear = rawVal
                              ? Number.parseInt(rawVal, 10)
                              : null
                            setMinistryForm((prev) => ({
                              ...prev,
                              predecessorTransitions: (
                                prev.predecessorTransitions ?? []
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
                          style={{ width: 132 }}
                        />
                        <FlatInput
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
                            setMinistryForm((prev) => ({
                              ...prev,
                              predecessorTransitions: (
                                prev.predecessorTransitions ?? []
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
                          style={{ width: 72 }}
                        />
                        <FlatInput
                          type="text"
                          placeholder="개편 사유·비고 (선택)"
                          value={predItem.note ?? ''}
                          onChange={(changeEvent) => {
                            const nextNote = changeEvent.target.value
                            setMinistryForm((prev) => ({
                              ...prev,
                              predecessorTransitions: (
                                prev.predecessorTransitions ?? []
                              ).map((item) =>
                                item.predecessorId === predItem.predecessorId
                                  ? { ...item, note: nextNote }
                                  : item,
                              ),
                            }))
                          }}
                          style={{ flex: '1 1 160px' }}
                        />
                      </InlineDateRow>
                    </LinkedRecordRow>
                  )
                })}

                <SearchableSelect
                  options={availablePredecessorOptions}
                  value=""
                  clearable={false}
                  onChange={(selectedId) => {
                    if (!selectedId) return
                    setMinistryForm((prev) => {
                      const existing = prev.predecessorTransitions ?? []
                      if (
                        existing.some(
                          (item) => item.predecessorId === selectedId,
                        )
                      ) {
                        return prev
                      }
                      return {
                        ...prev,
                        predecessorTransitions: [
                          ...existing,
                          {
                            predecessorId: selectedId,
                            kind: 'REORGANIZE' as const,
                            year: prev.establishedYear ?? null,
                            month: prev.establishedMonth ?? null,
                          },
                        ],
                      }
                    })
                  }}
                  placeholder="+ 전신(앞선) 기관 검색 · 추가…"
                  searchPlaceholder="전신 행정부처·기관명, 약칭, 시대 검색…"
                  ariaLabel="전신 기관 검색 및 추가"
                  emptyMessage="추가 가능한 기관이 없습니다"
                />
                <FlatHint>
                  이 기관으로 통합·개편되어 이어진 앞선 행정부처·기관을
                  연결합니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>후신 기관</FlatFormLabel>
              <FlatFieldControl>
                {(ministryForm.successorTransitions ?? []).map(
                  (transitionItem) => {
                    const targetDept = ministriesList.find(
                      (deptItem) => deptItem.id === transitionItem.successorId,
                    )
                    const deptLabel = targetDept
                      ? formatDeptOptionLabel(targetDept)
                      : transitionItem.successorId
                    return (
                      <LinkedRecordRow key={transitionItem.successorId}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 600,
                              minWidth: 0,
                            }}
                          >
                            현재 기관 → {deptLabel}
                          </span>
                          <FlatSelect
                            aria-label="후신 개편 유형"
                            value={transitionItem.kind}
                            onChange={(changeEvent) => {
                              const nextKind = changeEvent.target
                                .value as DepartmentTransitionKind
                              setMinistryForm((prev) => ({
                                ...prev,
                                successorTransitions: (
                                  prev.successorTransitions ?? []
                                ).map((item) =>
                                  item.successorId ===
                                  transitionItem.successorId
                                    ? { ...item, kind: nextKind }
                                    : item,
                                ),
                              }))
                            }}
                          >
                            {DEPARTMENT_TRANSITION_KIND_OPTIONS.map(
                              (optItem) => (
                                <option
                                  key={optItem.value}
                                  value={optItem.value}
                                >
                                  {optItem.label}
                                </option>
                              ),
                            )}
                          </FlatSelect>
                          <InlineIconBtn
                            type="button"
                            $danger
                            aria-label="후신 부처 연결 해제"
                            onClick={() =>
                              setMinistryForm((prev) => {
                                const nextList = (
                                  prev.successorTransitions ?? []
                                ).filter(
                                  (item) =>
                                    item.successorId !==
                                    transitionItem.successorId,
                                )
                                return {
                                  ...prev,
                                  successorTransitions: nextList,
                                  successorId: nextList[0]?.successorId ?? '',
                                }
                              })
                            }
                          >
                            <FiTrash2 size={14} />
                          </InlineIconBtn>
                        </div>
                        <InlineDateRow>
                          <FlatInput
                            type="number"
                            min={1}
                            max={9999}
                            placeholder="전환 연도(예: 1945)"
                            value={transitionItem.year ?? ''}
                            onChange={(changeEvent) => {
                              const rawVal = changeEvent.target.value.trim()
                              const parsedYear = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                successorTransitions: (
                                  prev.successorTransitions ?? []
                                ).map((item) =>
                                  item.successorId ===
                                  transitionItem.successorId
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
                            style={{ width: 132 }}
                          />
                          <FlatInput
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
                              setMinistryForm((prev) => ({
                                ...prev,
                                successorTransitions: (
                                  prev.successorTransitions ?? []
                                ).map((item) =>
                                  item.successorId ===
                                  transitionItem.successorId
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
                            style={{ width: 72 }}
                          />
                          <FlatInput
                            type="text"
                            placeholder="개편 사유·비고 (선택)"
                            value={transitionItem.note ?? ''}
                            onChange={(changeEvent) => {
                              const nextNote = changeEvent.target.value
                              setMinistryForm((prev) => ({
                                ...prev,
                                successorTransitions: (
                                  prev.successorTransitions ?? []
                                ).map((item) =>
                                  item.successorId ===
                                  transitionItem.successorId
                                    ? { ...item, note: nextNote }
                                    : item,
                                ),
                              }))
                            }}
                            style={{ flex: '1 1 160px' }}
                          />
                        </InlineDateRow>
                      </LinkedRecordRow>
                    )
                  },
                )}

                <SearchableSelect
                  options={availableSuccessorOptions}
                  value=""
                  clearable={false}
                  onChange={(selectedId) => {
                    if (!selectedId) return
                    setMinistryForm((prev) => {
                      const existing = prev.successorTransitions ?? []
                      if (
                        existing.some((item) => item.successorId === selectedId)
                      ) {
                        return prev
                      }
                      const nextList = [
                        ...existing,
                        {
                          successorId: selectedId,
                          kind: 'REORGANIZE' as const,
                          year: prev.abolishedYear ?? null,
                          month: prev.abolishedMonth ?? null,
                        },
                      ]
                      return {
                        ...prev,
                        successorId: nextList[0]?.successorId ?? selectedId,
                        successorTransitions: nextList,
                      }
                    })
                  }}
                  placeholder="+ 후신(뒤이은) 기관 검색 · 추가…"
                  searchPlaceholder="후신 행정부처·기관명, 약칭, 시대 검색…"
                  ariaLabel="후신 기관 검색 및 추가"
                  emptyMessage="추가 가능한 기관이 없습니다"
                />
                <FlatHint>
                  폐지·개편·분할 후 기능과 조직을 승계한 후속 행정기관을
                  연결합니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>군사조직 이관</FlatFormLabel>
              <FlatFieldControl>
                {(ministryForm.militaryUnitSuccessorTransitions ?? []).map(
                  (milTransition) => {
                    const targetUnit = allMilitaryUnits.find(
                      (unitItem) => unitItem.id === milTransition.unitId,
                    )
                    const unitLabel = targetUnit
                      ? formatMilitaryUnitOptionLabel(targetUnit)
                      : milTransition.unitId
                    return (
                      <LinkedRecordRow key={milTransition.unitId}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 600,
                              minWidth: 0,
                            }}
                          >
                            현재 부처 → 🛡️ {unitLabel}
                          </span>
                          <FlatSelect
                            aria-label="군사조직 개편 유형"
                            value={milTransition.kind}
                            onChange={(changeEvent) => {
                              const nextKind = changeEvent.target
                                .value as MilitaryUnitTransitionKind
                              setMinistryForm((prev) => ({
                                ...prev,
                                militaryUnitSuccessorTransitions: (
                                  prev.militaryUnitSuccessorTransitions ?? []
                                ).map((item) =>
                                  item.unitId === milTransition.unitId
                                    ? { ...item, kind: nextKind }
                                    : item,
                                ),
                              }))
                            }}
                          >
                            {DEPARTMENT_TRANSITION_KIND_OPTIONS.map(
                              (optItem) => (
                                <option
                                  key={optItem.value}
                                  value={optItem.value}
                                >
                                  {optItem.label}
                                </option>
                              ),
                            )}
                          </FlatSelect>
                          <InlineIconBtn
                            type="button"
                            $danger
                            aria-label="후신 군사조직 연결 해제"
                            onClick={() =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                militaryUnitSuccessorTransitions: (
                                  prev.militaryUnitSuccessorTransitions ?? []
                                ).filter(
                                  (item) =>
                                    item.unitId !== milTransition.unitId,
                                ),
                              }))
                            }
                          >
                            <FiTrash2 size={14} />
                          </InlineIconBtn>
                        </div>
                        <InlineDateRow>
                          <FlatInput
                            type="number"
                            min={1}
                            max={9999}
                            placeholder="전환 연도(예: 1938)"
                            value={milTransition.year ?? ''}
                            onChange={(changeEvent) => {
                              const rawVal = changeEvent.target.value.trim()
                              const parsedYear = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                militaryUnitSuccessorTransitions: (
                                  prev.militaryUnitSuccessorTransitions ?? []
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
                            style={{ width: 132 }}
                          />
                          <FlatInput
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
                              setMinistryForm((prev) => ({
                                ...prev,
                                militaryUnitSuccessorTransitions: (
                                  prev.militaryUnitSuccessorTransitions ?? []
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
                            style={{ width: 72 }}
                          />
                          <FlatInput
                            type="text"
                            placeholder="개편·이관 사유·비고 (선택)"
                            value={milTransition.note ?? ''}
                            onChange={(changeEvent) => {
                              const nextNote = changeEvent.target.value
                              setMinistryForm((prev) => ({
                                ...prev,
                                militaryUnitSuccessorTransitions: (
                                  prev.militaryUnitSuccessorTransitions ?? []
                                ).map((item) =>
                                  item.unitId === milTransition.unitId
                                    ? { ...item, note: nextNote }
                                    : item,
                                ),
                              }))
                            }}
                            style={{ flex: '1 1 160px' }}
                          />
                        </InlineDateRow>
                      </LinkedRecordRow>
                    )
                  },
                )}

                <SearchableSelect
                  options={availableMilitarySuccessorOptions}
                  value=""
                  clearable={false}
                  onChange={(selectedUnitId) => {
                    if (!selectedUnitId) return
                    setMinistryForm((prev) => {
                      const existing =
                        prev.militaryUnitSuccessorTransitions ?? []
                      if (
                        existing.some((item) => item.unitId === selectedUnitId)
                      ) {
                        return prev
                      }
                      return {
                        ...prev,
                        militaryUnitSuccessorTransitions: [
                          ...existing,
                          {
                            unitId: selectedUnitId,
                            kind: 'REORGANIZE',
                            year: prev.abolishedYear ?? null,
                            month: prev.abolishedMonth ?? null,
                          },
                        ],
                      }
                    })
                  }}
                  placeholder="+ 후신 군사조직(사령부·부대) 검색 · 추가…"
                  searchPlaceholder="사령부·군부대명, 약칭(OKW 등), 부대 유형 검색…"
                  ariaLabel="후신 군사조직 검색 및 추가"
                  emptyMessage="이 국가에 연결 가능한 군사조직이 없습니다"
                />
                <FlatHint>
                  예: 1938년 「제국전쟁성」 해체 후 「국방군 최고사령부(OKW)」로
                  군령권이 이관된 경우처럼 부처 → 군사조직 계보를 연결합니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>
          </FlatFormSection>

          {/* 3. 관할 · 청사 · 편제 · 소관 군부대 */}
          <FlatFormSection
            data-form-section="command"
            onFocusCapture={() => setActiveSection('command')}
          >
            <FlatSectionHeader>
              <FlatSectionTitle>
                관할 · 청사 · 편제 및 소관 군부대
              </FlatSectionTitle>
              <FlatSectionHint>선택 입력</FlatSectionHint>
            </FlatSectionHeader>

            <FlatFormRow>
              <FlatFormLabel>주요 임무 · 관할</FlatFormLabel>
              <FlatFieldControl>
                <FlatTextarea
                  rows={2}
                  value={ministryForm.defenseMissionScope}
                  onChange={(changeEvent) =>
                    setMinistryForm((prev) => ({
                      ...prev,
                      defenseMissionScope: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 외교 정책 수립 및 재외공관 총괄 / 국가 재정·조세·예산 편성 / 국방 정책·군정 및 병무 총괄"
                />
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>청사 · 본부 소재지</FlatFormLabel>
              <FlatFieldControl>
                <FlatTextarea
                  rows={2}
                  value={ministryForm.defenseHeadquarters}
                  onChange={(changeEvent) =>
                    setMinistryForm((prev) => ({
                      ...prev,
                      defenseHeadquarters: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 베를린 빌헬름 거리 74-76 / 한성부 광화문 앞 육조거리 / 워싱턴 D.C. 펜타곤"
                />
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>산하 실·국 · 편제</FlatFormLabel>
              <FlatFieldControl>
                <FlatTextarea
                  rows={2}
                  value={ministryForm.defenseOrgStructure}
                  onChange={(changeEvent) =>
                    setMinistryForm((prev) => ({
                      ...prev,
                      defenseOrgStructure: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 정무국·통상국·조약국 편성 / 산하 주요 실·국·외청 및 위원회 구성"
                />
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>예산 · 정원 · 비고</FlatFormLabel>
              <FlatFieldControl>
                <FlatTextarea
                  rows={2}
                  value={ministryForm.defenseBudgetOrForcesNote}
                  onChange={(changeEvent) =>
                    setMinistryForm((prev) => ({
                      ...prev,
                      defenseBudgetOrForcesNote: changeEvent.target.value,
                    }))
                  }
                  placeholder="예: 연간 예산·정원 규모, 타 부처·기관과의 권한 조정 및 법제 변천 비고"
                />
              </FlatFieldControl>
            </FlatFormRow>

            <FlatFormRow>
              <FlatFormLabel>소관 직할 군부대</FlatFormLabel>
              <FlatFieldControl>
                {(ministryForm.linkedMilitaryUnitIds ?? []).length > 0 && (
                  <PillChoiceRow>
                    {(ministryForm.linkedMilitaryUnitIds ?? []).map(
                      (unitId) => {
                        const matchedUnit = allMilitaryUnits.find(
                          (unitItem) => unitItem.id === unitId,
                        )
                        return (
                          <QuickPresetChip
                            key={unitId}
                            type="button"
                            $active
                            onClick={() =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                linkedMilitaryUnitIds: (
                                  prev.linkedMilitaryUnitIds ?? []
                                ).filter((idItem) => idItem !== unitId),
                              }))
                            }
                            title="클릭하여 연결 해제"
                          >
                            <FiShield size={11} />
                            <span>
                              {matchedUnit ? matchedUnit.name : unitId}
                            </span>
                            {matchedUnit?.unitType ? (
                              <span style={{ opacity: 0.72 }}>
                                · {militaryUnitTypeLabelKo(matchedUnit.unitType)}
                              </span>
                            ) : null}
                            <FiX size={12} />
                          </QuickPresetChip>
                        )
                      },
                    )}
                  </PillChoiceRow>
                )}

                <SearchableSelect
                  options={unlinkedMilitaryUnitOptions}
                  value=""
                  clearable={false}
                  onChange={(selectedUnitId) => {
                    if (!selectedUnitId) return
                    setMinistryForm((prev) => {
                      const currentIds = prev.linkedMilitaryUnitIds ?? []
                      if (currentIds.includes(selectedUnitId)) return prev
                      return {
                        ...prev,
                        linkedMilitaryUnitIds: [...currentIds, selectedUnitId],
                      }
                    })
                  }}
                  placeholder="+ 소관·직할 군부대 검색 · 연결…"
                  searchPlaceholder="합동참모본부, 육군본부 등 등록된 군부대 검색…"
                  ariaLabel="소관 군부대 검색 및 연결"
                  emptyMessage="이 국가에 추가로 연결할 군부대가 없습니다"
                />
                <FlatHint>
                  국방부·전쟁성·병조 등 군정 부처가 관할하는 군사
                  부대(MilitaryUnit)가 있을 때 선택해 연결합니다.
                </FlatHint>
              </FlatFieldControl>
            </FlatFormRow>
          </FlatFormSection>
        </FlatFormStack>
      </SidePanel>

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(selectedDate) => {
          const matched = selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
          setMinistryForm((prev) => ({
            ...prev,
            establishedDate: selectedDate,
            establishedEra: 'AD',
            establishedYear: matched
              ? Number.parseInt(matched[1], 10)
              : prev.establishedYear,
            establishedMonth: matched
              ? Number.parseInt(matched[2], 10)
              : prev.establishedMonth,
            establishedDay: matched
              ? Number.parseInt(matched[3], 10)
              : prev.establishedDay,
          }))
          setEstablishedDateModalOpen(false)
        }}
        initialDate={ministryForm.establishedDate || undefined}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={abolishedDateModalOpen}
        onClose={() => setAbolishedDateModalOpen(false)}
        onSelect={(selectedDate) => {
          const matched = selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
          setMinistryForm((prev) => ({
            ...prev,
            abolishedDate: selectedDate,
            abolishedEra: 'AD',
            abolishedYear: matched
              ? Number.parseInt(matched[1], 10)
              : prev.abolishedYear,
            abolishedMonth: matched
              ? Number.parseInt(matched[2], 10)
              : prev.abolishedMonth,
            abolishedDay: matched
              ? Number.parseInt(matched[3], 10)
              : prev.abolishedDay,
          }))
          setAbolishedDateModalOpen(false)
        }}
        initialDate={ministryForm.abolishedDate || undefined}
        title="폐지일 선택"
      />
    </>
  )
}
