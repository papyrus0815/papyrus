import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiGitCommit,
  FiLayers,
  FiPlus,
  FiSearch,
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
import { militaryUnitApi } from '@/shared/api/military-unit'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import {
  collectDescendantDepartmentIds,
  hasDefenseExtensionContent,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import type { SelectOption } from '@/shared/ui/select-modal/select-modal'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import {
  FieldLabel,
  FormFieldRow,
  FormInputField,
  FormSelectBtn,
  FormTextareaField,
  MinistryFormModalBody,
  MinistryFormModalBox,
} from './ministry-form.styles'

type ModalTabKey = 'basic' | 'lineage' | 'command'

type KindCardMeta = {
  value: AdministrationDepartmentKind
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
    label: '중앙부처 (부·성·조)',
    shortBadge: '부처·성·조',
    subtitle: '내각·행정부 소속 장관급 중앙 행정부처 및 전근대 6조·성',
    examples: '국방부, 외무성, 제국전쟁성, 재무부, 이조·병조',
    nameLabel: '부처·기관명',
    namePlaceholder: '예: 국방부, 외무성, 제국전쟁성, 병조',
    localPlaceholder: '예: Reichskriegsministerium, 外務省, 兵曹',
    enPlaceholder: '예: Ministry of National Defense',
    abbrPlaceholder: '예: 국방부, 외무성, RKM',
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
    label: '외청 · 위원회 · 정보 · 독립기구',
    shortBadge: '외청·정보·위원회',
    subtitle: '부처 산하 외청, 정보·방첩·치안기구, 감사원, 국가위원회',
    examples: '국가보안본부(RSHA), 아프베어, CIA, NKVD, 감사원',
    nameLabel: '외청·기구명',
    namePlaceholder: '예: 국가보안본부, 해외방첩국, 중앙정보국, 감사원',
    localPlaceholder: '예: Reichssicherheitshauptamt, Amt Ausland/Abwehr',
    enPlaceholder: '예: Reich Main Security Office, Central Intelligence Agency',
    abbrPlaceholder: '예: RSHA, Abwehr, CIA, NKVD',
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
        name: '국방군지휘참모부',
        abbreviation: 'WFSt',
        nameLocal: 'Wehrmachtführungsstab',
        nameEn: 'Armed Forces Operations Staff',
      },
      {
        name: '중앙정보국',
        abbreviation: 'CIA',
        nameEn: 'Central Intelligence Agency',
      },
    ],
  },
  {
    value: 'ROYAL_HOUSEHOLD',
    label: '궁내 · 황실 · 원수직속기구',
    shortBadge: '궁내·원수직속',
    subtitle: '군주·황실 보좌 기구 및 국가원수·총통 직속 비서실·관저',
    examples: '총통관저, 대통령비서실, 궁내성, 추밀원, 승정원',
    nameLabel: '직속·궁내기구명',
    namePlaceholder: '예: 총통관저, 국가원수비서실, 궁내성, 추밀원, 승정원',
    localPlaceholder: '예: Reichskanzlei, 宮内省, 承政院',
    enPlaceholder: '예: Reich Chancellery, Imperial Household Ministry',
    abbrPlaceholder: '예: 총통관저, 궁내성',
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
    label: '총독부 · 점령통치기구',
    shortBadge: '총독부·점령청',
    subtitle: '식민지·속령·점령지 통치를 위해 설치된 총독부 및 민정청',
    examples: '조선총독부, 동방점령지성, 폴란드 총독부, 인도 정청',
    nameLabel: '총독부·통치기구명',
    namePlaceholder: '예: 조선총독부, 동방점령지성, 폴란드 총독부',
    localPlaceholder: '예: 朝鮮總督府, Reichsministerium für die besetzten Ostgebiete',
    enPlaceholder: '예: Government-General of Joseon, Reich Ministry for the Occupied Eastern Territories',
    abbrPlaceholder: '예: 총독부, RMfdbO',
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
    label: '기타 국가기관 (입법·사법·특수)',
    shortBadge: '기타 국가기관',
    subtitle: '의회, 대법원·재판소, 헌법기관 및 특수 국가기구',
    examples: '제국의회, 연방대법원, 헌법재판소, 인민법원',
    nameLabel: '국가기관명',
    namePlaceholder: '예: 제국의회, 인민법원, 헌법재판소',
    localPlaceholder: '예: Reichstag, Volksgerichtshof',
    enPlaceholder: '예: Reichstag, Supreme Court',
    abbrPlaceholder: '예: 의회, 대법원',
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

export function MinistryFormModal({
  effectiveCountryId,
  isHistorical = false,
  isOpen,
  isDark,
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
  categorySelectOpen,
  setCategorySelectOpen,
  parentSelectOpen,
  setParentSelectOpen,
  successorSelectOpen,
  setSuccessorSelectOpen,
  predecessorSelectOpen: externalPredecessorSelectOpen,
  setPredecessorSelectOpen: setExternalPredecessorSelectOpen,
}: MinistryFormModalProps) {
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const [activeTab, setActiveTab] = useState<ModalTabKey>('basic')
  const [localPredecessorSelectOpen, setLocalPredecessorSelectOpen] =
    useState(false)
  const predecessorSelectOpen =
    externalPredecessorSelectOpen ?? localPredecessorSelectOpen
  const setPredecessorSelectOpen =
    setExternalPredecessorSelectOpen ?? setLocalPredecessorSelectOpen

  const [historicalCountrySelectOpen, setHistoricalCountrySelectOpen] =
    useState(false)
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [unitSearchQuery, setUnitSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      setActiveTab('basic')
      setInlineCategoryOpen(false)
      setNewCategoryName('')
      setNewCategoryNameEn('')
      setUnitSearchQuery('')
    }
  }, [isOpen, editingMinistry?.id])

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

  const filteredCandidateUnits = useMemo(() => {
    const queryText = unitSearchQuery.trim().toLowerCase()
    return countryMilitaryUnits.filter((unitItem) => {
      if (
        ministryForm.historicalCountryId &&
        unitItem.historicalCountryId &&
        unitItem.historicalCountryId !== ministryForm.historicalCountryId
      ) {
        return false
      }
      if (!queryText) return true
      return (
        unitItem.name.toLowerCase().includes(queryText) ||
        (unitItem.unitType ?? '').toLowerCase().includes(queryText) ||
        (unitItem.branch ?? '').toLowerCase().includes(queryText)
      )
    })
  }, [
    countryMilitaryUnits,
    ministryForm.historicalCountryId,
    unitSearchQuery,
  ])

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
    if (!ministryForm.historicalCountryId) return '현대 국가 직속'
    return (
      linkedHistoricalCountries.find(
        (histItem) => histItem.id === ministryForm.historicalCountryId,
      )?.name ??
      editingMinistry?.historicalCountry?.name ??
      '역사적 국가'
    )
  }, [
    editingMinistry?.historicalCountry?.name,
    isHistorical,
    linkedHistoricalCountries,
    ministryForm.historicalCountryId,
  ])

  const lineageTotalCount =
    (ministryForm.predecessorTransitions?.length ?? 0) +
    (ministryForm.successorTransitions?.length ?? 0)

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
      notify.error(
        err instanceof Error ? err.message : '분류 생성에 실패했습니다.',
      )
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
      const nextCatId =
        prev.categoryId || matchedParent.categoryId || ''
      return {
        ...prev,
        parentId: selectedId,
        historicalCountryId: nextHistId,
        categoryId: nextCatId,
      }
    })
  }

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

  if (!effectiveCountryId || !isOpen) return null

  return createPortal(
    <>
      <ModalOverlay
        role="dialog"
        aria-modal="true"
        aria-labelledby="ministry-form-modal-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMinistryFormModal()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => event.stopPropagation()}
        >
          <MinistryFormModalBox>
            <ModalHeader
              style={{
                padding: '18px 26px 14px',
                borderBottom: `1px solid ${palette.divider}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <ModalTitle id="ministry-form-modal-title">
                    {editingMinistry
                      ? '중앙부처 · 국가기관 수정'
                      : '중앙부처 · 국가기관 등록'}
                  </ModalTitle>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: palette.accentBg,
                      color: palette.accent,
                      border: `1px solid ${palette.accentBorder}`,
                    }}
                  >
                    {activeKindMeta.shortBadge}
                  </span>
                  {selectedEraLabel ? (
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: palette.bgMuted,
                        color: palette.textMuted,
                        border: `1px solid ${palette.borderMid}`,
                      }}
                    >
                      🏛️ {selectedEraLabel}
                    </span>
                  ) : null}
                  {selectedParentDept ? (
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: palette.bgMuted,
                        color: palette.text,
                        border: `1px solid ${palette.borderMid}`,
                      }}
                    >
                      상위: {selectedParentDept.name}
                    </span>
                  ) : null}
                </div>
                <span style={{ fontSize: 12.5, color: palette.textMuted }}>
                  행정부처(성·부·6조), 군 최고사령부(OKW·STAVKA·합참),
                  외청·정보기관, 총독부·궁내기관의 편제 위계와 전신·후신 계보를
                  기록합니다.
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  disabled={submittingMinistry}
                  onClick={submitMinistryForm}
                  style={{
                    padding: '10px 20px',
                    background: palette.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: submittingMinistry ? 'wait' : 'pointer',
                    opacity: submittingMinistry ? 0.7 : 1,
                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                  }}
                >
                  {submittingMinistry
                    ? '저장 중…'
                    : editingMinistry
                      ? '변경사항 저장'
                      : '기관 등록'}
                </button>
                <ModalCloseButton
                  type="button"
                  onClick={closeMinistryFormModal}
                  aria-label="닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </ModalCloseButton>
              </div>
            </ModalHeader>

            {/* 상단 3-탭 네비게이션 */}
            <div
              role="tablist"
              aria-label="기관 등록 섹션 탭"
              style={{
                display: 'flex',
                gap: 6,
                padding: '10px 26px',
                background: palette.bgSubtle,
                borderBottom: `1px solid ${palette.divider}`,
                overflowX: 'auto',
              }}
            >
              {(
                [
                  {
                    key: 'basic' as const,
                    icon: <FiLayers size={14} />,
                    label: '1. 기본 정보 · 편제 위계',
                    badge: null,
                  },
                  {
                    key: 'lineage' as const,
                    icon: <FiGitCommit size={14} />,
                    label: '2. 조직 계보 (전신 · 후신)',
                    badge:
                      lineageTotalCount > 0 ? `${lineageTotalCount}건` : null,
                  },
                  {
                    key: 'command' as const,
                    icon: <FiShield size={14} />,
                    label: '3. 직할 군부대 · 관할 상세',
                    badge:
                      commandTabBadgeCount > 0
                        ? `${commandTabBadgeCount}`
                        : null,
                  },
                ] as const
              ).map((tabItem) => {
                const isActive = activeTab === tabItem.key
                return (
                  <button
                    key={tabItem.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tabItem.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: `1px solid ${
                        isActive ? palette.accent : palette.borderMid
                      }`,
                      background: isActive ? palette.accentBg : palette.cardBg,
                      color: isActive ? palette.accent : palette.textMuted,
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tabItem.icon}
                    <span>{tabItem.label}</span>
                    {tabItem.badge ? (
                      <span
                        style={{
                          padding: '1px 7px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isActive
                            ? palette.accent
                            : palette.bgMuted,
                          color: isActive ? '#fff' : palette.text,
                        }}
                      >
                        {tabItem.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            <MinistryFormModalBody>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  event.target.value = ''
                  try {
                    validateImageFile(file)
                    setThumbnailUploading(true)
                    const res = await uploadImage(file, 'ministries')
                    setMinistryForm((prev) => ({
                      ...prev,
                      thumbnailUrl: res.url,
                    }))
                  } catch (err) {
                    notify.error(
                      err instanceof Error
                        ? err.message
                        : '이미지 업로드에 실패했습니다.',
                    )
                  } finally {
                    setThumbnailUploading(false)
                  }
                }}
              />

              {activeTab === 'basic' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 22,
                  }}
                >
                  {/* 1. 기관 성격 6종 카드 */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: palette.text,
                        }}
                      >
                        기관 성격 구분
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: palette.textMuted,
                        }}
                      >
                        선택한 성격에 맞춰 입력 안내와 빠른 템플릿이 자동
                        전환됩니다
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(245px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {KIND_CARD_META_LIST.map((kindItem) => {
                        const isSelected =
                          (ministryForm.kind || 'MINISTRY') === kindItem.value
                        return (
                          <button
                            key={kindItem.value}
                            type="button"
                            onClick={() =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                kind: kindItem.value,
                              }))
                            }
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 4,
                              padding: '10px 13px',
                              borderRadius: 12,
                              border: `1.5px solid ${
                                isSelected ? palette.accent : palette.borderMid
                              }`,
                              background: isSelected
                                ? palette.accentBg
                                : palette.cardBg,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.14s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: isSelected
                                    ? palette.accent
                                    : palette.text,
                                }}
                              >
                                {kindItem.label}
                              </span>
                              {isSelected ? (
                                <FiCheck size={14} color={palette.accent} />
                              ) : null}
                            </div>
                            <span
                              style={{
                                fontSize: 11.5,
                                color: palette.textMuted,
                                lineHeight: 1.35,
                              }}
                            >
                              {kindItem.subtitle}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: palette.textFaint,
                                fontWeight: 500,
                              }}
                            >
                              예: {kindItem.examples}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: isDark
                          ? 'rgba(59, 130, 246, 0.12)'
                          : '#f8fafc',
                        border: `1px solid ${palette.borderMid}`,
                        fontSize: 12,
                        color: palette.textMuted,
                        lineHeight: 1.45,
                      }}
                    >
                      💡 <strong>군 최고사령부(OKW·OKH·STAVKA)·합참·참모본부·야전군·사단·함대</strong>는
                      행정 부처가 아닌 상단 <strong>「군사」</strong> 탭에서 전용 편제·지휘관 재임으로 등록합니다.
                      (국방부·전쟁성·병조 등 <strong>민정 국방 부처</strong>만 이곳에 등록하세요.)
                    </div>
                  </div>

                  {/* 2. 상징 문장(96px) + 기관명·약칭·원어·영문 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '112px 1fr',
                      gap: 18,
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.bgSubtle,
                      alignItems: 'start',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => thumbnailInputRef.current?.click()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            thumbnailInputRef.current?.click()
                          }
                        }}
                        title="기관 문장·로고·상징 이미지 선택"
                        style={{
                          width: 92,
                          height: 92,
                          borderRadius: 18,
                          border: `2px ${
                            ministryForm.thumbnailUrl ? 'solid' : 'dashed'
                          } ${palette.borderMid}`,
                          background: palette.cardBg,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          overflow: 'hidden',
                          cursor: thumbnailUploading ? 'wait' : 'pointer',
                        }}
                      >
                        {thumbnailUploading ? (
                          <span
                            style={{ fontSize: 11, color: palette.textMuted }}
                          >
                            업로드 중…
                          </span>
                        ) : ministryForm.thumbnailUrl ? (
                          <img
                            src={getUploadImageUrl(ministryForm.thumbnailUrl)}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <>
                            <FiUpload size={18} color={palette.textMuted} />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: palette.textMuted,
                              }}
                            >
                              문장·로고
                            </span>
                          </>
                        )}
                      </div>
                      {ministryForm.thumbnailUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              thumbnailUrl: '',
                            }))
                          }
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            border: `1px solid ${palette.borderMid}`,
                            borderRadius: 6,
                            background: palette.btnBg,
                            color: palette.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          이미지 제거
                        </button>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 160px',
                          gap: 10,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 12,
                              fontWeight: 700,
                              color: palette.text,
                              marginBottom: 5,
                            }}
                          >
                            {activeKindMeta.nameLabel}{' '}
                            <span style={{ color: palette.danger }}>*</span>
                          </label>
                          <FormInputField
                            value={ministryForm.name}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            placeholder={activeKindMeta.namePlaceholder}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 12,
                              fontWeight: 700,
                              color: palette.text,
                              marginBottom: 5,
                            }}
                          >
                            약칭 (검색·배지)
                          </label>
                          <FormInputField
                            value={ministryForm.abbreviation}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                abbreviation: event.target.value,
                              }))
                            }
                            placeholder={activeKindMeta.abbrPlaceholder}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 12,
                              fontWeight: 600,
                              color: palette.textMuted,
                              marginBottom: 5,
                            }}
                          >
                            원어 표기 (독일어·한자·러시아어 등)
                          </label>
                          <FormInputField
                            value={ministryForm.nameLocal}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                nameLocal: event.target.value,
                              }))
                            }
                            placeholder={activeKindMeta.localPlaceholder}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 12,
                              fontWeight: 600,
                              color: palette.textMuted,
                              marginBottom: 5,
                            }}
                          >
                            영문 표기
                          </label>
                          <FormInputField
                            value={ministryForm.nameEn}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                nameEn: event.target.value,
                                defenseOfficialNameEn: event.target.value,
                              }))
                            }
                            placeholder={activeKindMeta.enPlaceholder}
                          />
                        </div>
                      </div>

                      {/* 빠른 아키타입 프리셋 칩 */}
                      {activeKindMeta.presets.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            paddingTop: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: palette.textMuted,
                            }}
                          >
                            빠른 예시 채우기:
                          </span>
                          {activeKindMeta.presets.map((presetItem) => (
                            <button
                              key={presetItem.name}
                              type="button"
                              onClick={() =>
                                setMinistryForm((prev) => ({
                                  ...prev,
                                  name: presetItem.name,
                                  abbreviation:
                                    presetItem.abbreviation ??
                                    prev.abbreviation,
                                  nameLocal:
                                    presetItem.nameLocal ?? prev.nameLocal,
                                  nameEn: presetItem.nameEn ?? prev.nameEn,
                                  defenseOfficialNameEn:
                                    presetItem.nameEn ??
                                    prev.defenseOfficialNameEn,
                                }))
                              }
                              style={{
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.cardBg,
                                color: palette.text,
                                cursor: 'pointer',
                              }}
                            >
                              + {presetItem.name}
                              {presetItem.abbreviation
                                ? ` (${presetItem.abbreviation})`
                                : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. 소속 시대·정체 (인라인 칩) */}
                  {!isHistorical && linkedHistoricalCountries.length > 0 && (
                    <FormFieldRow>
                      <FieldLabel>소속 시대 · 정체</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                historicalCountryId: '',
                              }))
                            }
                            style={{
                              padding: '7px 13px',
                              borderRadius: 10,
                              fontSize: 12.5,
                              fontWeight: !ministryForm.historicalCountryId
                                ? 700
                                : 500,
                              border: `1px solid ${
                                !ministryForm.historicalCountryId
                                  ? palette.accent
                                  : palette.borderMid
                              }`,
                              background: !ministryForm.historicalCountryId
                                ? palette.accentBg
                                : palette.inputBg,
                              color: !ministryForm.historicalCountryId
                                ? palette.accent
                                : palette.text,
                              cursor: 'pointer',
                            }}
                          >
                            현대 국가 직속 (현재 체제)
                          </button>
                          {linkedHistoricalCountries.map((histCountry) => {
                            const isSelected =
                              ministryForm.historicalCountryId ===
                              histCountry.id
                            return (
                              <button
                                key={histCountry.id}
                                type="button"
                                onClick={() =>
                                  setMinistryForm((prev) => ({
                                    ...prev,
                                    historicalCountryId: histCountry.id,
                                  }))
                                }
                                style={{
                                  padding: '7px 13px',
                                  borderRadius: 10,
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? 700 : 500,
                                  border: `1px solid ${
                                    isSelected
                                      ? palette.accent
                                      : palette.borderMid
                                  }`,
                                  background: isSelected
                                    ? palette.accentBg
                                    : palette.inputBg,
                                  color: isSelected
                                    ? palette.accent
                                    : palette.text,
                                  cursor: 'pointer',
                                }}
                              >
                                🏛️ {histCountry.name}
                              </button>
                            )
                          })}
                        </div>
                        <span style={{ fontSize: 11.5, color: palette.textMuted }}>
                          나치 독일의 OKW·전쟁성, 조선의 6조, 일본 제국의 육·해군성처럼
                          과거 체제 소속 기관이면 해당 시대를 선택하세요.
                        </span>
                      </div>
                    </FormFieldRow>
                  )}

                  {/* 4. 상위 기관 (편제 계층) */}
                  <FormFieldRow>
                    <FieldLabel>상위 기관 (상하 위계)</FieldLabel>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <FormSelectBtn
                          type="button"
                          $hasValue={!!ministryForm.parentId}
                          onClick={() => setParentSelectOpen(true)}
                          style={{ flex: 1 }}
                        >
                          <span>
                            {selectedParentDept
                              ? formatDeptOptionLabel(selectedParentDept)
                              : '최상위 기관 (상위 기관 없음 — 클릭하여 선택)'}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: palette.textMuted,
                              marginLeft: 8,
                            }}
                          >
                            변경 ▾
                          </span>
                        </FormSelectBtn>
                        {ministryForm.parentId ? (
                          <button
                            type="button"
                            onClick={() => handleSelectParentId('')}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.btnBg,
                              color: palette.textMuted,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            최상위로 해제
                          </button>
                        ) : null}
                      </div>

                      {candidateParentDepartments.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: palette.textMuted,
                            }}
                          >
                            빠른 상위 지정:
                          </span>
                          {candidateParentDepartments
                            .slice(0, 8)
                            .map((parentCandidate) => {
                              const isCurrentParent =
                                ministryForm.parentId === parentCandidate.id
                              return (
                                <button
                                  key={parentCandidate.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectParentId(
                                      isCurrentParent ? '' : parentCandidate.id,
                                    )
                                  }
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: isCurrentParent ? 700 : 500,
                                    border: `1px solid ${
                                      isCurrentParent
                                        ? palette.accent
                                        : palette.borderMid
                                    }`,
                                    background: isCurrentParent
                                      ? palette.accentBg
                                      : palette.cardBg,
                                    color: isCurrentParent
                                      ? palette.accent
                                      : palette.text,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {parentCandidate.historicalCountry?.name
                                    ? `[${parentCandidate.historicalCountry.name}] `
                                    : ''}
                                  {parentCandidate.name}
                                  {parentCandidate.abbreviation
                                    ? ` (${parentCandidate.abbreviation})`
                                    : ''}
                                </button>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </FormFieldRow>

                  {/* 5. 분류 카테고리 + 인라인 새 분류 추가 */}
                  <FormFieldRow>
                    <FieldLabel>분야 카테고리 (선택)</FieldLabel>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              categoryId: '',
                            }))
                          }
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: !ministryForm.categoryId ? 700 : 500,
                            border: `1px solid ${
                              !ministryForm.categoryId
                                ? palette.accent
                                : palette.borderMid
                            }`,
                            background: !ministryForm.categoryId
                              ? palette.accentBg
                              : palette.inputBg,
                            color: !ministryForm.categoryId
                              ? palette.accent
                              : palette.text,
                            cursor: 'pointer',
                          }}
                        >
                          미분류 · 직속 기구
                        </button>
                        {categoriesList.map((catItem) => {
                          const isSelected =
                            ministryForm.categoryId === catItem.id
                          return (
                            <button
                              key={catItem.id}
                              type="button"
                              onClick={() =>
                                setMinistryForm((prev) => ({
                                  ...prev,
                                  categoryId: catItem.id,
                                }))
                              }
                              style={{
                                padding: '6px 12px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: isSelected ? 700 : 500,
                                border: `1px solid ${
                                  isSelected
                                    ? palette.accent
                                    : palette.borderMid
                                }`,
                                background: isSelected
                                  ? palette.accentBg
                                  : palette.inputBg,
                                color: isSelected
                                  ? palette.accent
                                  : palette.text,
                                cursor: 'pointer',
                              }}
                            >
                              {catItem.name}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            setInlineCategoryOpen((prev) => !prev)
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 11px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1px dashed ${palette.accent}`,
                            background: 'transparent',
                            color: palette.accent,
                            cursor: 'pointer',
                          }}
                        >
                          <FiPlus size={13} />새 분류 추가
                        </button>
                      </div>

                      {inlineCategoryOpen && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: `1px solid ${palette.accentBorder}`,
                            background: palette.accentBg,
                            flexWrap: 'wrap',
                          }}
                        >
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(event) =>
                              setNewCategoryName(event.target.value)
                            }
                            placeholder="새 분류명 (예: 국방·군사, 외교, 정보·치안)"
                            style={{
                              flex: 1,
                              minWidth: 180,
                              padding: '7px 10px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                            }}
                          />
                          <input
                            type="text"
                            value={newCategoryNameEn}
                            onChange={(event) =>
                              setNewCategoryNameEn(event.target.value)
                            }
                            placeholder="영문명 (선택, 예: Defense)"
                            style={{
                              width: 170,
                              padding: '7px 10px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                            }}
                          />
                          <button
                            type="button"
                            disabled={
                              !newCategoryName.trim() || creatingCategory
                            }
                            onClick={() => void handleCreateInlineCategory()}
                            style={{
                              padding: '7px 14px',
                              borderRadius: 8,
                              border: 'none',
                              background: palette.accent,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {creatingCategory ? '추가 중…' : '즉시 추가'}
                          </button>
                        </div>
                      )}
                    </div>
                  </FormFieldRow>

                  {/* 6. 설립 시점 · 폐지 시점 (구조화 연/월/일 직접 입력 + 달력) */}
                  <FormFieldRow>
                    <FieldLabel>설립 · 폐지 시점</FieldLabel>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {/* 설립일 카드 */}
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${palette.borderMid}`,
                          background: palette.bgSubtle,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: palette.text,
                            }}
                          >
                            설립 · 개청 시점
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setEstablishedDateModalOpen(true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.cardBg,
                                color: palette.textMuted,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <FiCalendar size={11} /> 달력
                            </button>
                            {(ministryForm.establishedYear != null ||
                              ministryForm.establishedDate) && (
                              <button
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
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: 6,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.cardBg,
                                  color: palette.textMuted,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                }}
                              >
                                비우기
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '64px 1fr 64px 64px',
                            gap: 6,
                          }}
                        >
                          <select
                            aria-label="설립 기원"
                            value={ministryForm.establishedEra || 'AD'}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                establishedEra: event.target.value as
                                  | 'AD'
                                  | 'BC',
                              }))
                            }
                            style={{
                              padding: '7px 6px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <option value="AD">서기</option>
                            <option value="BC">BC</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            placeholder="연도(예: 1938)"
                            value={ministryForm.establishedYear ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                establishedYear:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 9px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                          <input
                            type="number"
                            min={1}
                            max={12}
                            placeholder="월"
                            value={ministryForm.establishedMonth ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                establishedMonth:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 8px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                          <input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="일"
                            value={ministryForm.establishedDay ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                establishedDay:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 8px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                        </div>
                        <span
                          style={{ fontSize: 11, color: palette.textMuted }}
                        >
                          연도만(예: 1392) 또는 연·월(예: 1938.2)만 입력해도
                          저장됩니다.
                        </span>
                      </div>

                      {/* 폐지일 카드 */}
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${palette.borderMid}`,
                          background: palette.bgSubtle,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: palette.text,
                            }}
                          >
                            폐지 · 해체 시점 (현존 시 비움)
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setAbolishedDateModalOpen(true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.cardBg,
                                color: palette.textMuted,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <FiCalendar size={11} /> 달력
                            </button>
                            {(ministryForm.abolishedYear != null ||
                              ministryForm.abolishedDate) && (
                              <button
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
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: 6,
                                  border: `1px solid ${palette.borderMid}`,
                                  background: palette.cardBg,
                                  color: palette.textMuted,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                }}
                              >
                                비우기
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '64px 1fr 64px 64px',
                            gap: 6,
                          }}
                        >
                          <select
                            aria-label="폐지 기원"
                            value={ministryForm.abolishedEra || 'AD'}
                            onChange={(event) =>
                              setMinistryForm((prev) => ({
                                ...prev,
                                abolishedEra: event.target.value as 'AD' | 'BC',
                              }))
                            }
                            style={{
                              padding: '7px 6px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <option value="AD">서기</option>
                            <option value="BC">BC</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            placeholder="연도(예: 1945)"
                            value={ministryForm.abolishedYear ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                abolishedYear:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 9px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                          <input
                            type="number"
                            min={1}
                            max={12}
                            placeholder="월"
                            value={ministryForm.abolishedMonth ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                abolishedMonth:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 8px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                          <input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="일"
                            value={ministryForm.abolishedDay ?? ''}
                            onChange={(event) => {
                              const rawVal = event.target.value.trim()
                              const parsed = rawVal
                                ? Number.parseInt(rawVal, 10)
                                : null
                              setMinistryForm((prev) => ({
                                ...prev,
                                abolishedDay:
                                  parsed != null && Number.isFinite(parsed)
                                    ? parsed
                                    : null,
                              }))
                            }}
                            style={{
                              padding: '7px 8px',
                              borderRadius: 8,
                              border: `1px solid ${palette.borderMid}`,
                              background: palette.cardBg,
                              color: palette.text,
                              fontSize: 12.5,
                              minWidth: 0,
                            }}
                          />
                        </div>
                        <span
                          style={{ fontSize: 11, color: palette.textMuted }}
                        >
                          비워두면 현재까지 존속(또는 폐지 시점 미상)으로
                          표시됩니다.
                        </span>
                      </div>
                    </div>
                  </FormFieldRow>

                  {/* 7. 간단 설명 */}
                  <FormFieldRow>
                    <FieldLabel>기관 개요 (요약)</FieldLabel>
                    <FormTextareaField
                      value={ministryForm.description}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="기관의 설립 배경, 핵심 권한, 역사적 의의 등을 요약해 주세요."
                      rows={3}
                    />
                  </FormFieldRow>
                </div>
              )}

              {activeTab === 'lineage' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  {/* 계보 흐름 다이어그램 배너 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.bgSubtle,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: palette.text,
                      }}
                    >
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: palette.cardBg,
                          border: `1px solid ${palette.borderMid}`,
                        }}
                      >
                        전신 기관{' '}
                        {ministryForm.predecessorTransitions?.length ?? 0}곳
                      </span>
                      <span style={{ color: palette.textMuted }}>
                        ──(개편·개칭·분할·통합)──▶
                      </span>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: 8,
                          background: palette.accentBg,
                          border: `1px solid ${palette.accentBorder}`,
                          color: palette.accent,
                          fontWeight: 700,
                        }}
                      >
                        {ministryForm.name.trim() || '현재 등록·수정 기관'}
                      </span>
                      <span style={{ color: palette.textMuted }}>
                        ──(개편·개칭·분할·통합)──▶
                      </span>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: palette.cardBg,
                          border: `1px solid ${palette.borderMid}`,
                        }}
                      >
                        후신 기관{' '}
                        {ministryForm.successorTransitions?.length ?? 0}곳
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(360px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {/* 전신 기관 블록 */}
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: 14,
                        border: `1px solid ${palette.borderMid}`,
                        background: palette.cardBg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: palette.text,
                            marginBottom: 4,
                          }}
                        >
                          전신 기관 (이 기관으로 이어진 앞선 기관)
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: palette.textMuted,
                            lineHeight: 1.45,
                          }}
                        >
                          예: 1938년「제국전쟁성」이 해체·개편되어
                          「국방군최고사령부(OKW)」로 이어진 경우, 제국전쟁성을
                          전신으로 연결합니다.
                        </div>
                      </div>

                      {(ministryForm.predecessorTransitions ?? []).map(
                        (predItem) => {
                          const targetDept = ministriesList.find(
                            (dept) => dept.id === predItem.predecessorId,
                          )
                          const deptLabel = targetDept
                            ? formatDeptOptionLabel(targetDept)
                            : predItem.predecessorId
                          return (
                            <div
                              key={predItem.predecessorId}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.bgSubtle,
                              }}
                            >
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
                                    fontWeight: 700,
                                    color: palette.text,
                                  }}
                                >
                                  {deptLabel}
                                </span>
                                <select
                                  aria-label="전신 개편 유형"
                                  value={predItem.kind}
                                  onChange={(event) => {
                                    const nextKind = event.target
                                      .value as DepartmentTransitionKind
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      predecessorTransitions: (
                                        prev.predecessorTransitions ?? []
                                      ).map((item) =>
                                        item.predecessorId ===
                                        predItem.predecessorId
                                          ? { ...item, kind: nextKind }
                                          : item,
                                      ),
                                    }))
                                  }}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 8,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.btnBg,
                                    color: palette.text,
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {DEPARTMENT_TRANSITION_KIND_OPTIONS.map(
                                    (opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                                <button
                                  type="button"
                                  aria-label="전신 기관 연결 해제"
                                  onClick={() =>
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      predecessorTransitions: (
                                        prev.predecessorTransitions ?? []
                                      ).filter(
                                        (item) =>
                                          item.predecessorId !==
                                          predItem.predecessorId,
                                      ),
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: palette.textMuted,
                                    cursor: 'pointer',
                                    padding: 4,
                                  }}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  placeholder="전환 연도(예: 1938)"
                                  value={predItem.year ?? ''}
                                  onChange={(event) => {
                                    const rawVal = event.target.value.trim()
                                    const parsedYear = rawVal
                                      ? Number.parseInt(rawVal, 10)
                                      : null
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      predecessorTransitions: (
                                        prev.predecessorTransitions ?? []
                                      ).map((item) =>
                                        item.predecessorId ===
                                        predItem.predecessorId
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
                                  style={{
                                    width: 125,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  placeholder="월(1~12)"
                                  value={predItem.month ?? ''}
                                  onChange={(event) => {
                                    const rawVal = event.target.value.trim()
                                    const parsedMonth = rawVal
                                      ? Number.parseInt(rawVal, 10)
                                      : null
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      predecessorTransitions: (
                                        prev.predecessorTransitions ?? []
                                      ).map((item) =>
                                        item.predecessorId ===
                                        predItem.predecessorId
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
                                  style={{
                                    width: 72,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="개편 사유·비고(선택)"
                                  value={predItem.note ?? ''}
                                  onChange={(event) => {
                                    const nextNote = event.target.value
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      predecessorTransitions: (
                                        prev.predecessorTransitions ?? []
                                      ).map((item) =>
                                        item.predecessorId ===
                                        predItem.predecessorId
                                          ? { ...item, note: nextNote }
                                          : item,
                                      ),
                                    }))
                                  }}
                                  style={{
                                    flex: 1,
                                    minWidth: 120,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        },
                      )}

                      <FormSelectBtn
                        type="button"
                        $hasValue={
                          (ministryForm.predecessorTransitions ?? []).length > 0
                        }
                        onClick={() => setPredecessorSelectOpen(true)}
                      >
                        <span>+ 전신(앞선) 기관 선택 · 추가</span>
                        <FiPlus size={16} />
                      </FormSelectBtn>
                    </div>

                    {/* 후신 기관 블록 */}
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: 14,
                        border: `1px solid ${palette.borderMid}`,
                        background: palette.cardBg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: palette.text,
                            marginBottom: 4,
                          }}
                        >
                          후신 기관 (이 기관이 이어진 뒤 기관)
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: palette.textMuted,
                            lineHeight: 1.45,
                          }}
                        >
                          이 기관이 폐지·개편·분할·통합된 뒤 기능과 조직을
                          승계한 후속 기관을 연결합니다.
                        </div>
                      </div>

                      {(ministryForm.successorTransitions ?? []).map(
                        (transitionItem) => {
                          const targetDept = ministriesList.find(
                            (dept) => dept.id === transitionItem.successorId,
                          )
                          const deptLabel = targetDept
                            ? formatDeptOptionLabel(targetDept)
                            : transitionItem.successorId
                          return (
                            <div
                              key={transitionItem.successorId}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: `1px solid ${palette.borderMid}`,
                                background: palette.bgSubtle,
                              }}
                            >
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
                                    fontWeight: 700,
                                    color: palette.text,
                                  }}
                                >
                                  {deptLabel}
                                </span>
                                <select
                                  aria-label="후신 개편 유형"
                                  value={transitionItem.kind}
                                  onChange={(event) => {
                                    const nextKind = event.target
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
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 8,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.btnBg,
                                    color: palette.text,
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {DEPARTMENT_TRANSITION_KIND_OPTIONS.map(
                                    (opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                                <button
                                  type="button"
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
                                        successorId:
                                          nextList[0]?.successorId ?? '',
                                      }
                                    })
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: palette.textMuted,
                                    cursor: 'pointer',
                                    padding: 4,
                                  }}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  placeholder="전환 연도(예: 1945)"
                                  value={transitionItem.year ?? ''}
                                  onChange={(event) => {
                                    const rawVal = event.target.value.trim()
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
                                  style={{
                                    width: 125,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  placeholder="월(1~12)"
                                  value={transitionItem.month ?? ''}
                                  onChange={(event) => {
                                    const rawVal = event.target.value.trim()
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
                                  style={{
                                    width: 72,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="개편 사유·비고(선택)"
                                  value={transitionItem.note ?? ''}
                                  onChange={(event) => {
                                    const nextNote = event.target.value
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
                                  style={{
                                    flex: 1,
                                    minWidth: 120,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${palette.borderMid}`,
                                    background: palette.cardBg,
                                    color: palette.text,
                                    fontSize: 12,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        },
                      )}

                      <FormSelectBtn
                        type="button"
                        $hasValue={
                          (ministryForm.successorTransitions ?? []).length > 0
                        }
                        onClick={() => setSuccessorSelectOpen(true)}
                      >
                        <span>+ 후신(뒤이은) 기관 선택 · 추가</span>
                        <FiPlus size={16} />
                      </FormSelectBtn>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'command' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 22,
                  }}
                >
                  {/* 1. 직할·예하 군부대 연결 패널 */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: `1px solid ${palette.borderMid}`,
                      background: palette.bgSubtle,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 14,
                            fontWeight: 700,
                            color: palette.text,
                          }}
                        >
                          <FiShield size={15} color={palette.accent} />
                          <span>직할 · 소관 군부대 연결 (MilitaryUnit)</span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: palette.textMuted,
                            marginTop: 3,
                          }}
                        >
                          이 기관(최고사령부·국방부 등)이 직접 지휘·관할하는
                          군사 부대를 선택해 연결합니다.
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: palette.accentBg,
                          color: palette.accent,
                        }}
                      >
                        연결됨 {ministryForm.linkedMilitaryUnitIds?.length ?? 0}
                        개 부대
                      </span>
                    </div>

                    {(ministryForm.linkedMilitaryUnitIds ?? []).length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {(ministryForm.linkedMilitaryUnitIds ?? []).map(
                          (unitId) => {
                            const matchedUnit = allMilitaryUnits.find(
                              (unitItem) => unitItem.id === unitId,
                            )
                            return (
                              <span
                                key={unitId}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 10px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: palette.cardBg,
                                  border: `1px solid ${palette.accent}`,
                                  color: palette.text,
                                }}
                              >
                                <FiShield size={12} color={palette.accent} />
                                <span>
                                  {matchedUnit ? matchedUnit.name : unitId}
                                </span>
                                {matchedUnit?.unitType ? (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: palette.textMuted,
                                    }}
                                  >
                                    ·{' '}
                                    {militaryUnitTypeLabelKo(
                                      matchedUnit.unitType,
                                    )}
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMinistryForm((prev) => ({
                                      ...prev,
                                      linkedMilitaryUnitIds: (
                                        prev.linkedMilitaryUnitIds ?? []
                                      ).filter((item) => item !== unitId),
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: palette.textMuted,
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                  }}
                                >
                                  <FiX size={13} />
                                </button>
                              </span>
                            )
                          },
                        )}
                      </div>
                    )}

                    {countryMilitaryUnits.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 11px',
                            borderRadius: 9,
                            border: `1px solid ${palette.borderMid}`,
                            background: palette.cardBg,
                          }}
                        >
                          <FiSearch size={14} color={palette.textMuted} />
                          <input
                            type="search"
                            value={unitSearchQuery}
                            onChange={(event) =>
                              setUnitSearchQuery(event.target.value)
                            }
                            placeholder="이 국가의 등록된 군부대 검색 (예: 중부집단군, 제6군)…"
                            style={{
                              flex: 1,
                              border: 'none',
                              background: 'transparent',
                              color: palette.text,
                              fontSize: 12.5,
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            maxHeight: 150,
                            overflowY: 'auto',
                            padding: '2px 0',
                          }}
                        >
                          {filteredCandidateUnits.map((unitItem) => {
                            const isLinked = (
                              ministryForm.linkedMilitaryUnitIds ?? []
                            ).includes(unitItem.id)
                            return (
                              <button
                                key={unitItem.id}
                                type="button"
                                onClick={() =>
                                  setMinistryForm((prev) => {
                                    const currentIds =
                                      prev.linkedMilitaryUnitIds ?? []
                                    const nextIds = currentIds.includes(
                                      unitItem.id,
                                    )
                                      ? currentIds.filter(
                                          (idItem) => idItem !== unitItem.id,
                                        )
                                      : [...currentIds, unitItem.id]
                                    return {
                                      ...prev,
                                      linkedMilitaryUnitIds: nextIds,
                                    }
                                  })
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: isLinked ? 700 : 500,
                                  border: `1px solid ${
                                    isLinked
                                      ? palette.accent
                                      : palette.borderMid
                                  }`,
                                  background: isLinked
                                    ? palette.accentBg
                                    : palette.cardBg,
                                  color: isLinked
                                    ? palette.accent
                                    : palette.text,
                                  cursor: 'pointer',
                                }}
                              >
                                {isLinked ? (
                                  <FiCheck size={12} />
                                ) : (
                                  <FiPlus size={12} />
                                )}
                                <span>{unitItem.name}</span>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: palette.textMuted,
                                  }}
                                >
                                  ({militaryUnitTypeLabelKo(unitItem.unitType)})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: palette.textMuted,
                          padding: '6px 0',
                        }}
                      >
                        현재 이 국가에 등록된 군부대가 없습니다. 기관 저장 후
                        상세 화면의「직할 군부대 등록」또는「군사 편제」탭에서
                        새 군부대를 추가할 수 있습니다.
                      </div>
                    )}
                  </div>

                  {/* 2. 관할·본부·지휘체계·예산 구조화 상세 */}
                  <FormFieldRow>
                    <FieldLabel>주요 임무 · 관할권</FieldLabel>
                    <FormTextareaField
                      value={ministryForm.defenseMissionScope}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          defenseMissionScope: event.target.value,
                        }))
                      }
                      placeholder="예: 동부전선 외 전 전구(서부·북아프리카·발칸·노르웨이) 작전 지휘 및 총통 군령 보좌 / 국가 재정·조세 총괄"
                      rows={3}
                    />
                  </FormFieldRow>

                  <FormFieldRow>
                    <FieldLabel>본부 · 청사 소재지</FieldLabel>
                    <FormTextareaField
                      value={ministryForm.defenseHeadquarters}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          defenseHeadquarters: event.target.value,
                        }))
                      }
                      placeholder="예: 베를린 벤들러블록(Bendlerblock), 뷔희도르프 조센(Zossen) 지하 벙커(Maybach)"
                      rows={2}
                    />
                  </FormFieldRow>

                  <FormFieldRow>
                    <FieldLabel>지휘 · 산하 편제 구조</FieldLabel>
                    <FormTextareaField
                      value={ministryForm.defenseOrgStructure}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          defenseOrgStructure: event.target.value,
                        }))
                      }
                      placeholder="예: 산하 국방군지휘참모부(WFSt), 해외방첩국(Abwehr), 국방경제군비국(WiRüAmt) 편성"
                      rows={3}
                    />
                  </FormFieldRow>

                  <FormFieldRow>
                    <FieldLabel>예산 · 병력 · 정원 참고</FieldLabel>
                    <FormTextareaField
                      value={ministryForm.defenseBudgetOrForcesNote}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          defenseBudgetOrForcesNote: event.target.value,
                        }))
                      }
                      placeholder="예: 정원·예산 규모, 동부전선 작전권(OKH 전담)과의 권한 분쟁 등 비고"
                      rows={2}
                    />
                  </FormFieldRow>
                </div>
              )}
            </MinistryFormModalBody>
          </MinistryFormModalBox>
        </motion.div>
      </ModalOverlay>

      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(date) => {
          const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
          setMinistryForm((prev) => ({
            ...prev,
            establishedDate: date,
            establishedEra: 'AD',
            establishedYear: match ? Number.parseInt(match[1], 10) : prev.establishedYear,
            establishedMonth: match ? Number.parseInt(match[2], 10) : prev.establishedMonth,
            establishedDay: match ? Number.parseInt(match[3], 10) : prev.establishedDay,
          }))
          setEstablishedDateModalOpen(false)
        }}
        initialDate={ministryForm.establishedDate || undefined}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={abolishedDateModalOpen}
        onClose={() => setAbolishedDateModalOpen(false)}
        onSelect={(date) => {
          const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
          setMinistryForm((prev) => ({
            ...prev,
            abolishedDate: date,
            abolishedEra: 'AD',
            abolishedYear: match ? Number.parseInt(match[1], 10) : prev.abolishedYear,
            abolishedMonth: match ? Number.parseInt(match[2], 10) : prev.abolishedMonth,
            abolishedDay: match ? Number.parseInt(match[3], 10) : prev.abolishedDay,
          }))
          setAbolishedDateModalOpen(false)
        }}
        initialDate={ministryForm.abolishedDate || undefined}
        title="폐지일 선택"
      />
      {!isHistorical && linkedHistoricalCountries.length > 0 && (
        <SelectModal
          isOpen={historicalCountrySelectOpen}
          onClose={() => setHistoricalCountrySelectOpen(false)}
          title="소속 시대 · 정체 선택"
          options={
            [
              { value: '', label: '현대 국가 직속 (현재 체제)' },
              ...linkedHistoricalCountries.map((hc) => ({
                value: hc.id,
                label: hc.name,
              })),
            ] as SelectOption[]
          }
          selectedValue={ministryForm.historicalCountryId}
          onSelect={(selectedId) => {
            setMinistryForm((prev) => ({
              ...prev,
              historicalCountryId: selectedId,
            }))
            setHistoricalCountrySelectOpen(false)
          }}
        />
      )}
      <SelectModal
        isOpen={categorySelectOpen}
        onClose={() => setCategorySelectOpen(false)}
        title="카테고리 선택"
        options={
          [
            { value: '', label: '미분류 · 직속 기구 (카테고리 없음)' },
            ...categoriesList.map((category) => ({
              value: category.id,
              label: `${category.name}${category.nameEn ? ` (${category.nameEn})` : ''}`,
            })),
          ] as SelectOption[]
        }
        selectedValue={ministryForm.categoryId || ''}
        onSelect={(selectedId) => {
          setMinistryForm((prev) => ({ ...prev, categoryId: selectedId }))
          setCategorySelectOpen(false)
        }}
      />
      <SelectModal
        isOpen={parentSelectOpen}
        onClose={() => setParentSelectOpen(false)}
        title="상위 기관 선택"
        options={
          [
            { value: '', label: '없음 (최상위 독립 기관)' },
            ...candidateParentDepartments.map((dept) => ({
              value: dept.id,
              label: formatDeptOptionLabel(dept),
            })),
          ] as SelectOption[]
        }
        selectedValue={ministryForm.parentId}
        onSelect={(selectedId) => {
          handleSelectParentId(selectedId)
          setParentSelectOpen(false)
        }}
      />
      <SelectModal
        isOpen={predecessorSelectOpen}
        onClose={() => setPredecessorSelectOpen(false)}
        title="전신(앞선) 기관 선택"
        options={
          [
            ...ministriesList
              .filter(
                (dept) =>
                  (!editingMinistry || dept.id !== editingMinistry.id) &&
                  !(ministryForm.predecessorTransitions ?? []).some(
                    (item) => item.predecessorId === dept.id,
                  ),
              )
              .map((dept) => ({
                value: dept.id,
                label: formatDeptOptionLabel(dept),
              })),
          ] as SelectOption[]
        }
        selectedValue=""
        onSelect={(selectedId) => {
          if (selectedId) {
            setMinistryForm((prev) => {
              const existing = prev.predecessorTransitions ?? []
              if (existing.some((item) => item.predecessorId === selectedId)) {
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
          }
          setPredecessorSelectOpen(false)
        }}
      />
      <SelectModal
        isOpen={successorSelectOpen}
        onClose={() => setSuccessorSelectOpen(false)}
        title="후신(뒤이은) 기관 선택"
        options={
          [
            ...ministriesList
              .filter(
                (dept) =>
                  (!editingMinistry || dept.id !== editingMinistry.id) &&
                  !(ministryForm.successorTransitions ?? []).some(
                    (item) => item.successorId === dept.id,
                  ),
              )
              .map((dept) => ({
                value: dept.id,
                label: formatDeptOptionLabel(dept),
              })),
          ] as SelectOption[]
        }
        selectedValue={ministryForm.successorId}
        onSelect={(selectedId) => {
          if (selectedId) {
            setMinistryForm((prev) => {
              const existing = prev.successorTransitions ?? []
              if (existing.some((item) => item.successorId === selectedId)) {
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
          }
          setSuccessorSelectOpen(false)
        }}
      />
    </>,
    document.body,
  )
}
