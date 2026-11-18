import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiClock,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi'
import styled, { type DefaultTheme } from 'styled-components'

import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import {
  administrationDepartmentApi,
  type AdministrationDepartment,
  type AdministrationDepartmentKind,
  type CreateAdministrationDepartmentInput,
} from '@/shared/api/administration-department'
import {
  compareByCountryStart,
  describeLifespanMismatch,
  formatCountryPeriod,
} from '@/shared/lib/country-period'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  CROSS_COUNTRY_CATEGORY_EXAMPLES,
  inferDepartmentKind,
  matchDepartmentCategoryByName,
} from '@/shared/lib/ministry-department/department-name-frames'
import {
  collectDescendantDepartmentIds,
  parseDepartmentDescription,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import {
  buildPartialDateString,
  isPartialRangeInverted,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { DepartmentKindField } from '@/shared/ui/department-kind-field'
import { FormTextarea } from '@/shared/ui/form-input/form-input'
import { HeadquartersLocationField } from '@/shared/ui/headquarters-location-field'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  KitAddButton,
  KitBusyBar,
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
  FooterMissingCount,
  FooterReadyBadge,
  FooterReadyGroup,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModalMoreMenu } from '@/shared/ui/register-modal-shell/register-modal-more-menu'
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

type EraType = 'BC' | 'AD'
type DepartmentModalSectionKey = 'basic' | 'periodDetail'

type DepartmentDateInfoPayload = NonNullable<
  CreateAdministrationDepartmentInput['establishedInfo']
>

export interface GovernmentDepartmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (savedDepartmentId?: string) => void
  editingDepartment?: AdministrationDepartment | null
  initialPolityValue?: string
}

function formatPolityRange(polity: {
  startYear?: number | null
  endYear?: number | null
  startEra?: string | null
  endEra?: string | null
}): string | null {
  if (polity.startYear == null && polity.endYear == null) return null
  const startLabel =
    polity.startYear != null
      ? `${polity.startEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.startYear)}`
      : ''
  const endLabel =
    polity.endYear != null
      ? `${polity.endEra === 'BC' ? 'BC ' : ''}${Math.abs(polity.endYear)}`
      : '미상'
  return `${startLabel}~${endLabel}`
}

function formatDepartmentSpanLabel(
  estParts: { era: EraType; year: string; month: string; day: string },
  abolParts: { era: EraType; year: string; month: string; day: string },
): string | null {
  const estNum = Number(estParts.year.trim())
  if (!estParts.year.trim() || !Number.isFinite(estNum) || estNum <= 0) {
    return null
  }
  const signedStart = estParts.era === 'BC' ? -estNum : estNum
  if (!abolParts.year.trim()) {
    return '현존 · 폐지일 미지정'
  }
  const abolNum = Number(abolParts.year.trim())
  if (!Number.isFinite(abolNum) || abolNum <= 0) return null
  const signedEnd = abolParts.era === 'BC' ? -abolNum : abolNum
  const startMonth = Number(estParts.month) || 1
  const endMonth = Number(abolParts.month) || startMonth
  const totalMonths = (signedEnd - signedStart) * 12 + (endMonth - startMonth)
  if (totalMonths < 0) return null
  if (totalMonths === 0) return '1년 미만 존속'
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `약 ${years}년 ${months}개월 존속`
  if (years > 0) return `약 ${years}년 존속`
  return `약 ${months}개월 존속`
}

export const GovernmentDepartmentFormModal: React.FC<
  GovernmentDepartmentFormModalProps
> = ({
  isOpen,
  onClose,
  onSaved,
  editingDepartment = null,
  initialPolityValue = '',
}) => {
  const queryClient = useQueryClient()
  const instanceId = useId()
  const isEditing = Boolean(editingDepartment)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const basicSectionRef = useRef<HTMLElement>(null)
  const periodDetailSectionRef = useRef<HTMLElement>(null)

  const estDateAnchorId = `dept-est-date-${instanceId}`
  const abolDateAnchorId = `dept-abol-date-${instanceId}`

  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>('split')
  const [activeDatePicker, setActiveDatePicker] = useState<
    'est' | 'abol' | null
  >(null)

  const { data: countries = [] } = useCountries({ enabled: isOpen })
  const { data: historicalCountries = [] } = useHistoricalCountries({
    enabled: isOpen,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    enabled: isOpen,
    staleTime: 120_000,
  })

  const [polityValue, setPolityValue] = useState<string>('')
  const [kind, setKind] = useState<AdministrationDepartmentKind>('MINISTRY')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categoryManualLocked, setCategoryManualLocked] =
    useState<boolean>(false)
  const [autoMatchedCategoryId, setAutoMatchedCategoryId] = useState<
    string | null
  >(null)
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false)
  const [newCategoryName, setNewCategoryName] = useState<string>('')

  const [name, setName] = useState<string>('')
  const [abbreviation, setAbbreviation] = useState<string>('')
  const [nameLocal, setNameLocal] = useState<string>('')
  const [nameEn, setNameEn] = useState<string>('')
  const [parentId, setParentId] = useState<string>('')

  const [estEra, setEstEra] = useState<EraType>('AD')
  const [estYear, setEstYear] = useState<string>('')
  const [estMonth, setEstMonth] = useState<string>('')
  const [estDay, setEstDay] = useState<string>('')

  const [abolEra, setAbolEra] = useState<EraType>('AD')
  const [abolYear, setAbolYear] = useState<string>('')
  const [abolMonth, setAbolMonth] = useState<string>('')
  const [abolDay, setAbolDay] = useState<string>('')

  const [headquarters, setHeadquarters] = useState<string>('')
  const [headquartersLatitude, setHeadquartersLatitude] = useState<
    number | null
  >(null)
  const [headquartersLongitude, setHeadquartersLongitude] = useState<
    number | null
  >(null)
  const [primaryMission, setPrimaryMission] = useState<string>('')
  const [orgStructure, setOrgStructure] = useState<string>('')
  const [budgetNote, setBudgetNote] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [batchSavedCount, setBatchSavedCount] = useState<number>(0)

  const continueAfterSaveRef = useRef<boolean>(false)
  const lastBatchSavedDeptIdRef = useRef<string | undefined>(undefined)
  const initializedKeyRef = useRef<string | null>(null)

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const modernOpts: SearchableSelectOption[] = [...countries]
      .sort((leftItem, rightItem) =>
        leftItem.name.localeCompare(rightItem.name, 'ko'),
      )
      .map((countryItem) => ({
        value: `m:${countryItem.id}`,
        label: `${countryItem.flagEmoji ?? ''} ${countryItem.name}`.trim(),
        group: '현대 국가',
      }))
    const histOpts: SearchableSelectOption[] = [...historicalCountries]
      .sort(compareByCountryStart)
      .map((histItem) => {
        const range = formatPolityRange(histItem)
        return {
          value: `h:${histItem.id}`,
          label: range ? `${histItem.name} (${range})` : histItem.name,
          group: '역사적 국가 · 왕조 · 시대 정체 (연대순)',
        }
      })
    return [...modernOpts, ...histOpts]
  }, [countries, historicalCountries])

  const selectedHistoricalPolity = useMemo(() => {
    if (!polityValue.startsWith('h:')) return null
    const histId = polityValue.slice(2)
    return (
      historicalCountries.find((histItem) => histItem.id === histId) ?? null
    )
  }, [polityValue, historicalCountries])

  const resolvedAxis = useMemo(() => {
    if (polityValue.startsWith('m:')) {
      return {
        countryId: polityValue.slice(2) || null,
        historicalCountryId: null,
      }
    }
    if (polityValue.startsWith('h:')) {
      const histId = polityValue.slice(2)
      const linkedModernId =
        selectedHistoricalPolity?.parentModernCountryIds?.[0] ??
        (
          selectedHistoricalPolity as
            | {
                modernCountries?: Array<{ modernCountryId?: string | null }>
                countryId?: string | null
              }
            | undefined
            | null
        )?.modernCountries?.[0]?.modernCountryId ??
        (
          selectedHistoricalPolity as
            | { countryId?: string | null }
            | undefined
            | null
        )?.countryId ??
        null
      return {
        countryId: linkedModernId,
        historicalCountryId: histId || null,
      }
    }
    return { countryId: null, historicalCountryId: null }
  }, [polityValue, selectedHistoricalPolity])

  const { data: siblingDepartments = [] } = useQuery({
    queryKey: [
      'dept-form-siblings',
      resolvedAxis.countryId ?? '',
      resolvedAxis.historicalCountryId ?? '',
    ],
    queryFn: () =>
      administrationDepartmentApi.getAll({
        ...(resolvedAxis.historicalCountryId
          ? { historicalCountryId: resolvedAxis.historicalCountryId }
          : resolvedAxis.countryId
            ? { countryId: resolvedAxis.countryId }
            : {}),
        take: 500,
      }),
    enabled:
      isOpen &&
      Boolean(resolvedAxis.countryId || resolvedAxis.historicalCountryId),
    staleTime: 60_000,
  })

  const resetCreateFormFields = useCallback(() => {
    setErrorMessage(null)
    setActiveDatePicker(null)
    setShowNewCategory(false)
    setNewCategoryName('')
    setPolityValue(initialPolityValue || '')
    setKind('MINISTRY')
    setCategoryId('')
    setCategoryManualLocked(false)
    setAutoMatchedCategoryId(null)
    setName('')
    setAbbreviation('')
    setNameLocal('')
    setNameEn('')
    setParentId('')
    setEstEra('AD')
    setEstYear('')
    setEstMonth('')
    setEstDay('')
    setAbolEra('AD')
    setAbolYear('')
    setAbolMonth('')
    setAbolDay('')
    setHeadquarters('')
    setHeadquartersLatitude(null)
    setHeadquartersLongitude(null)
    setPrimaryMission('')
    setOrgStructure('')
    setBudgetNote('')
    setDescription('')
  }, [initialPolityValue])

  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null
      continueAfterSaveRef.current = false
      lastBatchSavedDeptIdRef.current = undefined
      setBatchSavedCount(0)
      setActiveDatePicker(null)
      return
    }

    const nextKey = `${editingDepartment?.id ?? 'create'}:${initialPolityValue || ''}`
    if (initializedKeyRef.current === nextKey) return
    initializedKeyRef.current = nextKey
    setBatchSavedCount(0)
    lastBatchSavedDeptIdRef.current = undefined
    continueAfterSaveRef.current = false

    if (editingDepartment) {
      setErrorMessage(null)
      setShowNewCategory(false)
      setNewCategoryName('')

      if (editingDepartment.historicalCountryId) {
        setPolityValue(`h:${editingDepartment.historicalCountryId}`)
      } else if (editingDepartment.countryId) {
        setPolityValue(`m:${editingDepartment.countryId}`)
      } else {
        setPolityValue('')
      }
      setKind(editingDepartment.kind)
      setCategoryId(editingDepartment.categoryId ?? '')
      setCategoryManualLocked(Boolean(editingDepartment.categoryId))
      setAutoMatchedCategoryId(null)
      setName(editingDepartment.name ?? '')
      setAbbreviation(editingDepartment.abbreviation ?? '')
      setNameLocal(editingDepartment.nameLocal ?? '')
      setNameEn(editingDepartment.nameEn ?? '')
      setParentId(editingDepartment.parentId ?? '')

      if (editingDepartment.established) {
        setEstEra(editingDepartment.established.era)
        setEstYear(String(Math.abs(editingDepartment.established.year)))
        setEstMonth(
          editingDepartment.established.month != null
            ? String(editingDepartment.established.month)
            : '',
        )
        setEstDay(
          editingDepartment.established.day != null
            ? String(editingDepartment.established.day)
            : '',
        )
      } else {
        setEstEra('AD')
        setEstYear('')
        setEstMonth('')
        setEstDay('')
      }

      if (editingDepartment.abolished) {
        setAbolEra(editingDepartment.abolished.era)
        setAbolYear(String(Math.abs(editingDepartment.abolished.year)))
        setAbolMonth(
          editingDepartment.abolished.month != null
            ? String(editingDepartment.abolished.month)
            : '',
        )
        setAbolDay(
          editingDepartment.abolished.day != null
            ? String(editingDepartment.abolished.day)
            : '',
        )
      } else {
        setAbolEra('AD')
        setAbolYear('')
        setAbolMonth('')
        setAbolDay('')
      }

      const parsedDesc = parseDepartmentDescription(
        editingDepartment.description,
      )
      setHeadquarters(
        editingDepartment.headquarters ??
          parsedDesc.defense?.headquarters ??
          '',
      )
      setHeadquartersLatitude(
        editingDepartment.headquartersLatitude != null &&
          editingDepartment.headquartersLongitude != null
          ? Number(editingDepartment.headquartersLatitude)
          : null,
      )
      setHeadquartersLongitude(
        editingDepartment.headquartersLatitude != null &&
          editingDepartment.headquartersLongitude != null
          ? Number(editingDepartment.headquartersLongitude)
          : null,
      )
      setPrimaryMission(
        editingDepartment.primaryMission ??
          parsedDesc.defense?.missionScope ??
          '',
      )
      setOrgStructure(
        editingDepartment.orgStructure ??
          parsedDesc.defense?.orgStructure ??
          '',
      )
      setBudgetNote(
        editingDepartment.budgetNote ??
          parsedDesc.defense?.budgetOrForcesNote ??
          '',
      )
      setDescription(parsedDesc.cleanDescription)
      return
    }

    resetCreateFormFields()
  }, [isOpen, editingDepartment, initialPolityValue, resetCreateFormFields])

  const estParts = useMemo(
    () => ({ era: estEra, year: estYear, month: estMonth, day: estDay }),
    [estEra, estYear, estMonth, estDay],
  )
  const abolParts = useMemo(
    () => ({ era: abolEra, year: abolYear, month: abolMonth, day: abolDay }),
    [abolEra, abolYear, abolMonth, abolDay],
  )

  const isDateInverted = useMemo(
    () => isPartialRangeInverted(estParts, abolParts),
    [estParts, abolParts],
  )

  const spanSummary = useMemo(
    () => (isDateInverted ? null : formatDepartmentSpanLabel(estParts, abolParts)),
    [isDateInverted, estParts, abolParts],
  )

  const signedEstYear = useMemo(() => {
    const trimmed = estYear.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    return estEra === 'BC' ? -parsed : parsed
  }, [estEra, estYear])

  const polityLifespanWarning = useMemo(() => {
    if (!selectedHistoricalPolity || signedEstYear == null) return null
    const mismatchMsg = describeLifespanMismatch(
      selectedHistoricalPolity,
      signedEstYear,
      { recordSupportsBc: true },
    )
    if (!mismatchMsg) return null
    return `설립 연도가 선택한 역사 정치체(${selectedHistoricalPolity.name})의 ${mismatchMsg}. 체제 개편·승계 기관이라면 그대로 저장할 수 있습니다.`
  }, [selectedHistoricalPolity, signedEstYear])

  const selectedPolityPeriodLabel = useMemo(() => {
    if (!selectedHistoricalPolity) return null
    const formatted = formatCountryPeriod(selectedHistoricalPolity, {
      unknownText: '미상',
    })
    return formatted || null
  }, [selectedHistoricalPolity])

  const applyPolityLifespanToDepartment = useCallback(() => {
    if (!selectedHistoricalPolity) return
    if (selectedHistoricalPolity.startYear != null) {
      setEstEra(selectedHistoricalPolity.startEra === 'BC' ? 'BC' : 'AD')
      setEstYear(String(Math.abs(selectedHistoricalPolity.startYear)))
      setEstMonth('')
      setEstDay('')
    }
    if (selectedHistoricalPolity.endYear != null) {
      setAbolEra(selectedHistoricalPolity.endEra === 'BC' ? 'BC' : 'AD')
      setAbolYear(String(Math.abs(selectedHistoricalPolity.endYear)))
      setAbolMonth('')
      setAbolDay('')
    } else {
      setAbolEra('AD')
      setAbolYear('')
      setAbolMonth('')
      setAbolDay('')
    }
  }, [selectedHistoricalPolity])

  const jumpToSection = useCallback(
    (targetSection: DepartmentModalSectionKey) => {
      const refMap: Record<
        DepartmentModalSectionKey,
        React.RefObject<HTMLElement | null>
      > = {
        basic: basicSectionRef,
        periodDetail: periodDetailSectionRef,
      }
      refMap[targetSection].current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    },
    [],
  )

  const missingFieldItems = useMemo(() => {
    const items: Array<{ label: string; section: DepartmentModalSectionKey }> =
      []
    if (!resolvedAxis.countryId && !resolvedAxis.historicalCountryId) {
      items.push({ label: '소속 국가·정치체', section: 'basic' })
    }
    if (!name.trim()) {
      items.push({ label: '기관명 (한국어)', section: 'basic' })
    }
    if (isDateInverted) {
      items.push({ label: '폐지일 역전 수정', section: 'periodDetail' })
    }
    return items
  }, [resolvedAxis, name, isDateInverted])

  const isFormDirty = useMemo(() => {
    if (isEditing && editingDepartment) {
      const initPolity = editingDepartment.historicalCountryId
        ? `h:${editingDepartment.historicalCountryId}`
        : editingDepartment.countryId
          ? `m:${editingDepartment.countryId}`
          : ''
      const initEstYear = editingDepartment.established
        ? String(Math.abs(editingDepartment.established.year))
        : ''
      const initAbolYear = editingDepartment.abolished
        ? String(Math.abs(editingDepartment.abolished.year))
        : ''
      const parsedInitDesc = parseDepartmentDescription(
        editingDepartment.description,
      )
      return (
        polityValue !== initPolity ||
        kind !== editingDepartment.kind ||
        categoryId !== (editingDepartment.categoryId ?? '') ||
        parentId !== (editingDepartment.parentId ?? '') ||
        name !== (editingDepartment.name ?? '') ||
        abbreviation !== (editingDepartment.abbreviation ?? '') ||
        nameLocal !== (editingDepartment.nameLocal ?? '') ||
        nameEn !== (editingDepartment.nameEn ?? '') ||
        estYear !== initEstYear ||
        abolYear !== initAbolYear ||
        headquarters !==
          (editingDepartment.headquarters ??
            parsedInitDesc.defense?.headquarters ??
            '') ||
        headquartersLatitude !==
          (editingDepartment.headquartersLatitude ?? null) ||
        headquartersLongitude !==
          (editingDepartment.headquartersLongitude ?? null) ||
        primaryMission !==
          (editingDepartment.primaryMission ??
            parsedInitDesc.defense?.missionScope ??
            '') ||
        orgStructure !==
          (editingDepartment.orgStructure ??
            parsedInitDesc.defense?.orgStructure ??
            '') ||
        budgetNote !==
          (editingDepartment.budgetNote ??
            parsedInitDesc.defense?.budgetOrForcesNote ??
            '') ||
        description !== parsedInitDesc.cleanDescription
      )
    }
    return Boolean(
      name.trim() ||
        abbreviation.trim() ||
        nameLocal.trim() ||
        nameEn.trim() ||
        estYear.trim() ||
        abolYear.trim() ||
        headquarters.trim() ||
        headquartersLatitude != null ||
        primaryMission.trim() ||
        orgStructure.trim() ||
        budgetNote.trim() ||
        description.trim() ||
        newCategoryName.trim(),
    )
  }, [
    isEditing,
    editingDepartment,
    polityValue,
    kind,
    categoryId,
    parentId,
    name,
    abbreviation,
    nameLocal,
    nameEn,
    estYear,
    abolYear,
    headquarters,
    headquartersLatitude,
    headquartersLongitude,
    primaryMission,
    orgStructure,
    budgetNote,
    description,
    newCategoryName,
  ])

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const trimmedCat = newCategoryName.trim()
      if (!trimmedCat) {
        throw new Error('새 직능 분류 이름을 입력해주세요.')
      }
      return administrationDepartmentApi.createCategory({ name: trimmedCat })
    },
    onSuccess: (createdCat) => {
      setCategoryId(createdCat.id)
      setCategoryManualLocked(true)
      setAutoMatchedCategoryId(null)
      setShowNewCategory(false)
      setNewCategoryName('')
      notify.success(`"${createdCat.name}" 직능 분류가 추가되었습니다.`)
      void queryClient.invalidateQueries({
        queryKey: ['administration-department-categories'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const refreshDepartmentQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['global-departments'] })
    void queryClient.invalidateQueries({
      queryKey: ['global-department-detail'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['administration-departments'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['dept-form-siblings'],
    })
  }, [queryClient])

  const saveDepartmentMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedAxis.countryId && !resolvedAxis.historicalCountryId) {
        throw new Error('소속 국가 또는 역사적 정치체를 먼저 선택해주세요.')
      }
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('부처 · 국가기관 이름을 입력해주세요.')
      }
      if (isDateInverted) {
        throw new Error('폐지 시점이 설립 시점보다 앞설 수 없습니다.')
      }

      let establishedInfo: DepartmentDateInfoPayload | null | undefined =
        undefined
      if (estYear.trim()) {
        const parsedEstYear = Number(estYear.trim())
        if (!Number.isInteger(parsedEstYear) || parsedEstYear <= 0) {
          throw new Error('설립 연도를 자연수로 입력해주세요.')
        }
        establishedInfo = {
          era: estEra as DepartmentDateInfoPayload['era'],
          year: parsedEstYear,
          ...(estMonth.trim() ? { month: Number(estMonth.trim()) } : {}),
          ...(estDay.trim() ? { day: Number(estDay.trim()) } : {}),
        }
      } else if (isEditing) {
        establishedInfo = null
      }

      let abolishedInfo: DepartmentDateInfoPayload | null | undefined =
        undefined
      if (abolYear.trim()) {
        const parsedAbolYear = Number(abolYear.trim())
        if (!Number.isInteger(parsedAbolYear) || parsedAbolYear <= 0) {
          throw new Error('폐지 연도를 자연수로 입력해주세요.')
        }
        abolishedInfo = {
          era: abolEra as DepartmentDateInfoPayload['era'],
          year: parsedAbolYear,
          ...(abolMonth.trim() ? { month: Number(abolMonth.trim()) } : {}),
          ...(abolDay.trim() ? { day: Number(abolDay.trim()) } : {}),
        }
      } else if (isEditing) {
        abolishedInfo = null
      }

      const hasValidCoords =
        headquartersLatitude != null &&
        headquartersLongitude != null &&
        Number.isFinite(headquartersLatitude) &&
        Number.isFinite(headquartersLongitude)

      const payload = {
        countryId: resolvedAxis.countryId,
        historicalCountryId: resolvedAxis.historicalCountryId,
        kind,
        categoryId: categoryId || null,
        parentId: parentId || null,
        name: trimmedName,
        abbreviation: abbreviation.trim() || null,
        nameLocal: nameLocal.trim() || null,
        nameEn: nameEn.trim() || null,
        headquarters: headquarters.trim() || null,
        headquartersLatitude: hasValidCoords ? headquartersLatitude : null,
        headquartersLongitude: hasValidCoords ? headquartersLongitude : null,
        primaryMission: primaryMission.trim() || null,
        orgStructure: orgStructure.trim() || null,
        budgetNote: budgetNote.trim() || null,
        description: description.trim() || null,
        ...(establishedInfo !== undefined ? { establishedInfo } : {}),
        ...(abolishedInfo !== undefined ? { abolishedInfo } : {}),
      }

      if (isEditing && editingDepartment?.id) {
        return administrationDepartmentApi.update(editingDepartment.id, payload)
      }
      return administrationDepartmentApi.create(payload)
    },
    onSuccess: (savedDept) => {
      const shouldContinue = !isEditing && continueAfterSaveRef.current
      continueAfterSaveRef.current = false
      refreshDepartmentQueries()

      if (shouldContinue) {
        lastBatchSavedDeptIdRef.current = savedDept.id
        setBatchSavedCount((prevCount) => prevCount + 1)

        setName('')
        setAbbreviation('')
        setNameLocal('')
        setNameEn('')
        setCategoryId('')
        setCategoryManualLocked(false)
        setAutoMatchedCategoryId(null)
        setParentId('')
        setPrimaryMission('')
        setOrgStructure('')
        setBudgetNote('')
        setDescription('')
        setErrorMessage(null)

        jumpToSection('basic')
        notify.success(
          `"${savedDept.name}" 등록 완료! 국가·설립 시기를 유지한 채 다음 기관을 이어서 입력할 수 있습니다.`,
        )
        return
      }

      notify.success(
        isEditing
          ? '부처 · 국가기관 정보가 수정되었습니다.'
          : '새 부처 · 국가기관이 등록되었습니다.',
      )
      onSaved?.(savedDept.id)
      onClose()
    },
    onError: (mutationError) => {
      continueAfterSaveRef.current = false
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const handleSubmitWithOption = useCallback(
    (continueAfterSave: boolean) => {
      if (saveDepartmentMutation.isPending) return
      if (missingFieldItems.length > 0) {
        jumpToSection(missingFieldItems[0].section)
      }
      setErrorMessage(null)
      continueAfterSaveRef.current = !isEditing && continueAfterSave
      saveDepartmentMutation.mutate()
    },
    [saveDepartmentMutation, missingFieldItems, jumpToSection, isEditing],
  )

  useModalSubmitShortcut({
    enabled: isOpen && !saveDepartmentMutation.isPending,
    scrollContainerRef,
    onSubmit: ({ continueAfterSave }) =>
      handleSubmitWithOption(!isEditing && continueAfterSave),
  })

  const requestClose = useCallback(async () => {
    if (saveDepartmentMutation.isPending) return
    if (isFormDirty) {
      const confirmedClose = await confirm({
        title: '작성 중인 내용 닫기',
        message:
          '입력 중인 중앙부처·국가기관 내용이 저장되지 않습니다. 창을 닫으시겠습니까?',
        confirmLabel: '닫기',
        cancelLabel: '계속 작성',
        danger: true,
      })
      if (!confirmedClose) return
    }
    if (lastBatchSavedDeptIdRef.current) {
      onSaved?.(lastBatchSavedDeptIdRef.current)
    }
    onClose()
  }, [saveDepartmentMutation.isPending, isFormDirty, onSaved, onClose])

  const handleResetClick = useCallback(async () => {
    if (isFormDirty) {
      const confirmedReset = await confirm({
        title: '입력 내용 초기화',
        message: '현재 입력한 항목을 처음 상태로 되돌릴까요?',
        confirmLabel: '초기화',
        cancelLabel: '취소',
        danger: true,
      })
      if (!confirmedReset) return
    }
    resetCreateFormFields()
  }, [isFormDirty, resetCreateFormFields])

  const applyDatePickerSelection = (
    target: 'est' | 'abol',
    isoDate: string,
    precision: DatePickerPrecision,
  ) => {
    const parsed = parsePartialDateString(isoDate)
    const nextMonth = precision === 'year' ? '' : parsed.month
    const nextDay = precision === 'day' ? parsed.day : ''
    if (target === 'est') {
      setEstEra(parsed.era)
      setEstYear(parsed.year)
      setEstMonth(nextMonth)
      setEstDay(nextDay)
    } else {
      setAbolEra(parsed.era)
      setAbolYear(parsed.year)
      setAbolMonth(nextMonth)
      setAbolDay(nextDay)
    }
    setActiveDatePicker(null)
  }

  const availableParents = useMemo(() => {
    if (!editingDepartment) return siblingDepartments
    const forbiddenIds = collectDescendantDepartmentIds(
      editingDepartment.id,
      siblingDepartments,
    )
    forbiddenIds.add(editingDepartment.id)
    return siblingDepartments.filter(
      (deptItem) => !forbiddenIds.has(deptItem.id),
    )
  }, [siblingDepartments, editingDepartment])

  const categorySelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      categories.map((catItem) => ({
        value: catItem.id,
        label: catItem.name,
        meta: catItem.nameEn ?? undefined,
        description: CROSS_COUNTRY_CATEGORY_EXAMPLES[catItem.name],
        keywords: [catItem.nameEn, CROSS_COUNTRY_CATEGORY_EXAMPLES[catItem.name]]
          .filter(Boolean)
          .join(' '),
      })),
    [categories],
  )

  const parentSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      availableParents.map((parentDept) => ({
        value: parentDept.id,
        label: parentDept.abbreviation?.trim()
          ? `${parentDept.name} (${parentDept.abbreviation.trim()})`
          : parentDept.name,
        meta: parentDept.historicalCountry?.name ?? undefined,
        keywords: [
          parentDept.abbreviation,
          parentDept.nameEn,
          parentDept.nameLocal,
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [availableParents],
  )

  const selectedCategory = useMemo(
    () => categories.find((catItem) => catItem.id === categoryId) ?? null,
    [categories, categoryId],
  )

  const handleNameChange = useCallback(
    (nextName: string) => {
      setName(nextName)
      if (!categoryManualLocked && categories.length > 0) {
        const matched = matchDepartmentCategoryByName(nextName, categories)
        if (matched) {
          setCategoryId(matched.id)
          setAutoMatchedCategoryId(matched.id)
        } else if (
          autoMatchedCategoryId &&
          categoryId === autoMatchedCategoryId
        ) {
          setCategoryId('')
          setAutoMatchedCategoryId(null)
        }
      }
      if (!isEditing) {
        const inferredKind = inferDepartmentKind(nextName)
        if (inferredKind) {
          setKind(inferredKind)
        }
      }
    },
    [
      categoryManualLocked,
      categories,
      autoMatchedCategoryId,
      categoryId,
      isEditing,
    ],
  )

  useEffect(() => {
    if (
      !isOpen ||
      categoryManualLocked ||
      categoryId ||
      !name.trim() ||
      categories.length === 0
    ) {
      return
    }
    const matched = matchDepartmentCategoryByName(name, categories)
    if (matched) {
      setCategoryId(matched.id)
      setAutoMatchedCategoryId(matched.id)
    }
  }, [isOpen, categoryManualLocked, categoryId, name, categories])

  const activePickerParts =
    activeDatePicker === 'est' ? estParts : abolParts
  const activePickerInitialDate =
    buildPartialDateString(activePickerParts) || undefined
  const activePickerInitialPrecision: DatePickerPrecision | null =
    activePickerParts.day.trim()
      ? 'day'
      : activePickerParts.month.trim()
        ? 'month'
        : activePickerParts.year.trim()
          ? 'year'
          : null

  const modalTitle = isEditing
    ? `${editingDepartment?.name ?? '부처 · 국가기관'} 수정`
    : '중앙부처 · 국가기관 등록'

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      title={modalTitle}
      maxWidth={
        layoutMode === 'split' ? 'min(1260px, 95vw)' : 'min(820px, 95vw)'
      }
      minHeight="auto"
      fullBleedOnMobile
      closeOnOverlayClick={false}
      headerActions={
        <HeaderRightBar>
          <RegisterModalMoreMenu
            layoutMode={layoutMode}
            onChangeLayoutMode={setLayoutMode}
            actions={
              !isEditing && isFormDirty
                ? [
                    {
                      key: 'reset',
                      label: '작성 내용 초기화',
                      icon: <FiRefreshCw size={13.5} />,
                      danger: true,
                      onClick: () => {
                        void handleResetClick()
                      },
                    },
                  ]
                : []
            }
            ariaLabel="모달 설정 더보기"
            title="화면 배치 및 입력 초기화"
          />
        </HeaderRightBar>
      }
    >
      <DeptModalFormScroll ref={scrollContainerRef} $layoutMode={layoutMode}>
        {saveDepartmentMutation.isPending && (
          <KitBusyBar role="status" aria-live="polite">
            {isEditing ? '변경사항을 저장하는 중...' : '기관을 등록하는 중...'}
          </KitBusyBar>
        )}

        {errorMessage ? (
          <AlertBox
            variant="danger"
            icon={<FiAlertCircle />}
            style={{ marginBottom: 16 }}
          >
            {errorMessage}
          </AlertBox>
        ) : null}

        <LabeledRowsWrap>
          <SplitColumnsGrid $layoutMode={layoutMode}>
            <SplitColumnLeft>
          {/* ═══════════════ 기본 정보 · 분류 ═══════════════ */}
          <FormGroup ref={basicSectionRef}>
            <FormGroupTitle>기본 정보 · 분류</FormGroupTitle>

            <FieldRow>
              <FieldLabel>
                소속 국가 · 정체 <Required>*</Required>
              </FieldLabel>
              <FieldControl>
                <SearchableSelect
                  options={polityOptions}
                  value={polityValue}
                  onChange={(nextVal) => {
                    setPolityValue(nextVal)
                    setParentId('')
                  }}
                  placeholder="국가 또는 역사적 정치체 검색 (예: 대한민국, 조선, 미국, 당나라…)"
                  searchPlaceholder="국가명·왕조명·공화국명 검색…"
                />
                <FieldHint>
                  역사적 국가는 연대순으로 표시됩니다. 특정 시대(예: 대한제국, 헝가리 왕국)의
                  부처라면 해당 시대 정체를 선택해 주세요.
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                기관 명칭 <Required>*</Required>
              </FieldLabel>
              <FieldControl>
                <NameAndAbbrGrid>
                  <Input
                    data-autofocus=""
                    value={name}
                    onChange={(changeEvent) =>
                      handleNameChange(changeEvent.target.value)
                    }
                    placeholder="공식 명칭 (예: 외무부, 국무부, 외무성, 기획재정부, 예조)"
                  />
                  <Input
                    value={abbreviation}
                    onChange={(changeEvent) =>
                      setAbbreviation(changeEvent.target.value)
                    }
                    placeholder="약칭 (선택)"
                    aria-label="약칭"
                  />
                </NameAndAbbrGrid>

                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldLabel>
                      원어 · 한자 표기 <OptionalTag>(선택)</OptionalTag>
                    </SubFieldLabel>
                    <Input
                      value={nameLocal}
                      onChange={(changeEvent) =>
                        setNameLocal(changeEvent.target.value)
                      }
                      placeholder="예: 外務省, 兵曹, Pénzügyminisztérium"
                    />
                  </SubField>

                  <SubField>
                    <SubFieldLabel>
                      영문 표기 <OptionalTag>(선택)</OptionalTag>
                    </SubFieldLabel>
                    <Input
                      value={nameEn}
                      onChange={(changeEvent) =>
                        setNameEn(changeEvent.target.value)
                      }
                      placeholder="예: Ministry of Foreign Affairs"
                    />
                  </SubField>
                </SubFieldPair>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>기관 구분</FieldLabel>
              <FieldControl>
                <DepartmentKindField
                  value={kind}
                  ariaLabel="기관 구분 선택"
                  onChange={(nextKind) => setKind(nextKind)}
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                직능 · 상위 기관<OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldHeaderRow>
                      <SubFieldLabel>
                        공통 직능 분류 (타국 비교 축)
                        {autoMatchedCategoryId &&
                        categoryId === autoMatchedCategoryId ? (
                          <AutoMatchPill>자동 매칭</AutoMatchPill>
                        ) : null}
                      </SubFieldLabel>
                      <DateQuickActionBtn
                        type="button"
                        onClick={() =>
                          setShowNewCategory((prevShow) => !prevShow)
                        }
                      >
                        <FiPlus size={11} />
                        <span>
                          {showNewCategory ? '기존 분류 선택' : '새 분류'}
                        </span>
                      </DateQuickActionBtn>
                    </SubFieldHeaderRow>
                    {showNewCategory ? (
                      <InlineAddRow>
                        <Input
                          value={newCategoryName}
                          onChange={(changeEvent) =>
                            setNewCategoryName(changeEvent.target.value)
                          }
                          placeholder="예: 우주·항공, 외교, 국방"
                        />
                        <KitAddButton
                          type="button"
                          disabled={createCategoryMutation.isPending}
                          onClick={() => createCategoryMutation.mutate()}
                        >
                          추가
                        </KitAddButton>
                      </InlineAddRow>
                    ) : (
                      <SearchableSelect
                        options={categorySelectOptions}
                        value={categoryId}
                        onChange={(nextCatId) => {
                          setCategoryId(nextCatId)
                          setCategoryManualLocked(Boolean(nextCatId))
                          setAutoMatchedCategoryId(null)
                        }}
                        placeholder="직능 분류 미지정 (외교 · 국방 · 재정 등)"
                        searchPlaceholder="외교, 국방, 재정, 정보기관 등 검색…"
                        ariaLabel="공통 직능 분류 선택"
                      />
                    )}
                  </SubField>

                  <SubField>
                    <SubFieldLabel>상위 소속 기관</SubFieldLabel>
                    <SearchableSelect
                      options={parentSelectOptions}
                      value={parentId}
                      onChange={(nextParentId) => setParentId(nextParentId)}
                      placeholder="최상위 독립 기관 (상위 없음)"
                      searchPlaceholder="상위 행정부처·기관명 검색…"
                      ariaLabel="상위 소속 기관 선택"
                      emptyMessage="같은 국가·정체에 등록된 다른 기관이 없습니다"
                    />
                  </SubField>
                </SubFieldPair>
                <FieldHint>
                  {selectedCategory ? (
                    <>
                      <strong>「{selectedCategory.name}」</strong> 직능으로 묶이면
                      타국의 동종 부처(
                      {CROSS_COUNTRY_CATEGORY_EXAMPLES[selectedCategory.name] ??
                        '타국 동종 직능 기관'}
                      )와 시대·국가 간 비교가 가능해집니다.
                    </>
                  ) : (
                    <>
                      직능 분류를 지정하면 국가·시대별 명칭이 달라도(예: 외무부 ·
                      국무부 · 외무성 · 예조) 동일 직능 축으로 비교할 수 있습니다.
                    </>
                  )}
                </FieldHint>
              </FieldControl>
            </FieldRow>
          </FormGroup>
          </SplitColumnLeft>

          <SplitColumnRight>
          {/* ═══════════════ 설립 시기 · 소재지 · 상세 ═══════════════ */}
          <FormGroup ref={periodDetailSectionRef}>
            <FormGroupTitle>설립 시기 · 소재지 · 상세</FormGroupTitle>

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
                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldHeaderRow>
                      <SubFieldLabel>설립일</SubFieldLabel>
                      <DateHeaderActions>
                        {!estYear &&
                        !estMonth &&
                        !estDay &&
                        selectedHistoricalPolity?.startYear != null &&
                        selectedPolityPeriodLabel ? (
                          <DateQuickActionBtn
                            type="button"
                            onClick={applyPolityLifespanToDepartment}
                          >
                            시대 연도({selectedPolityPeriodLabel}) 적용
                          </DateQuickActionBtn>
                        ) : null}
                        {estYear || estMonth || estDay ? (
                          <DateQuickActionBtn
                            type="button"
                            onClick={() => {
                              setEstEra('AD')
                              setEstYear('')
                              setEstMonth('')
                              setEstDay('')
                            }}
                          >
                            비우기
                          </DateQuickActionBtn>
                        ) : null}
                      </DateHeaderActions>
                    </SubFieldHeaderRow>
                    <InlineDateField
                      appearance="field"
                      anchorId={estDateAnchorId}
                      pickerOpen={activeDatePicker === 'est'}
                      era={estEra}
                      year={estYear}
                      month={estMonth}
                      day={estDay}
                      onEra={setEstEra}
                      onYear={setEstYear}
                      onMonth={setEstMonth}
                      onDay={setEstDay}
                      onOpenPicker={() => setActiveDatePicker('est')}
                      ariaLabel="기관 설립일"
                    />
                  </SubField>

                  <SubField>
                    <SubFieldHeaderRow>
                      <SubFieldLabel>폐지일</SubFieldLabel>
                      {abolYear || abolMonth || abolDay ? (
                        <DateQuickActionBtn
                          type="button"
                          onClick={() => {
                            setAbolEra('AD')
                            setAbolYear('')
                            setAbolMonth('')
                            setAbolDay('')
                          }}
                        >
                          비우기
                        </DateQuickActionBtn>
                      ) : null}
                    </SubFieldHeaderRow>
                    <InlineDateField
                      appearance="field"
                      anchorId={abolDateAnchorId}
                      pickerOpen={activeDatePicker === 'abol'}
                      era={abolEra}
                      year={abolYear}
                      month={abolMonth}
                      day={abolDay}
                      onEra={setAbolEra}
                      onYear={setAbolYear}
                      onMonth={setAbolMonth}
                      onDay={setAbolDay}
                      onOpenPicker={() => setActiveDatePicker('abol')}
                      error={isDateInverted}
                      ariaLabel="기관 폐지일"
                    />
                  </SubField>
                </SubFieldPair>

                {isDateInverted ? (
                  <AlertBox variant="danger" icon={<FiAlertCircle />}>
                    폐지 시점이 설립 시점보다 앞섭니다. 기원(서기/기원전)과 연·월·일을
                    확인해 주세요.
                  </AlertBox>
                ) : polityLifespanWarning ? (
                  <AlertBox variant="warning" icon={<FiAlertCircle />}>
                    {polityLifespanWarning}
                  </AlertBox>
                ) : (
                  <FieldHint>
                    연도만 입력해도 저장되며, 폐지일을 비워두면 현존 기관으로 표시됩니다.
                  </FieldHint>
                )}
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                청사 소재지<OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <HeadquartersLocationField
                  headquarters={headquarters}
                  latitude={headquartersLatitude}
                  longitude={headquartersLongitude}
                  countryName={
                    selectedHistoricalPolity?.name ??
                    countries.find(
                      (countryItem) => countryItem.id === resolvedAxis.countryId,
                    )?.name ??
                    null
                  }
                  departmentName={name}
                  ariaLabel="본부 · 청사 소재지"
                  onChange={(nextHq) => {
                    setHeadquarters(nextHq.headquarters)
                    setHeadquartersLatitude(nextHq.headquartersLatitude)
                    setHeadquartersLongitude(nextHq.headquartersLongitude)
                  }}
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                핵심 임무<OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <Input
                  value={primaryMission}
                  onChange={(changeEvent) =>
                    setPrimaryMission(changeEvent.target.value)
                  }
                  placeholder="예: 외교·조약 체결 및 재외국민 보호 총괄"
                  aria-label="핵심 관장 임무"
                />
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                하부 직제 · 예산<OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldLabel>하부 직제 · 편제</SubFieldLabel>
                    <Input
                      value={orgStructure}
                      onChange={(changeEvent) =>
                        setOrgStructure(changeEvent.target.value)
                      }
                      placeholder="예: 3실 6국 24과, 내국·외청 체계"
                    />
                  </SubField>
                  <SubField>
                    <SubFieldLabel>예산 · 정원 · 규모</SubFieldLabel>
                    <Input
                      value={budgetNote}
                      onChange={(changeEvent) =>
                        setBudgetNote(changeEvent.target.value)
                      }
                      placeholder="예: 본부 정원 1,800명 · 연간 4.2조 원"
                    />
                  </SubField>
                </SubFieldPair>
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                연혁 · 기관 설명<OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <FormTextarea
                  value={description}
                  onChange={(changeEvent) =>
                    setDescription(changeEvent.target.value)
                  }
                  placeholder="설립 배경, 전신·후신 개편 연혁 등을 자유롭게 기록하세요."
                  style={{ minHeight: 84, fontSize: 14, lineHeight: 1.6 }}
                />
              </FieldControl>
            </FieldRow>
          </FormGroup>
          </SplitColumnRight>
          </SplitColumnsGrid>
        </LabeledRowsWrap>
      </DeptModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={missingFieldItems.length > 0}>
          {!isEditing && batchSavedCount > 0 ? (
            <BatchSavedBadge role="status">
              <BatchSavedDot aria-hidden="true" />
              연속 {batchSavedCount}건 등록됨
            </BatchSavedBadge>
          ) : null}
          {missingFieldItems.length > 0 ? (
            <FooterJumpButton
              type="button"
              onClick={() => jumpToSection(missingFieldItems[0].section)}
            >
              <span>필수 입력: {missingFieldItems[0].label}</span>
              {missingFieldItems.length > 1 ? (
                <FooterMissingCount>
                  외 {missingFieldItems.length - 1}개
                </FooterMissingCount>
              ) : null}
              <FooterJumpArrow>→</FooterJumpArrow>
            </FooterJumpButton>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>
                {isEditing ? '수정 준비 완료' : '등록 준비 완료'}
                {selectedCategory ? ` · ${selectedCategory.name}` : ''}
              </FooterReadyBadge>
            </FooterReadyGroup>
          )}
        </FooterHint>

        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            disabled={saveDepartmentMutation.isPending}
            onClick={() => {
              void requestClose()
            }}
          >
            취소
          </PersonRegisterModalCancelBtn>
          {!isEditing ? (
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={saveDepartmentMutation.isPending}
              onClick={() => handleSubmitWithOption(true)}
            >
              등록 후 계속
            </PersonRegisterModalCancelBtn>
          ) : null}
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saveDepartmentMutation.isPending}
            onClick={() => handleSubmitWithOption(false)}
          >
            {saveDepartmentMutation.isPending
              ? '저장 중...'
              : isEditing
                ? '변경사항 저장'
                : '기관 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>

      <DatePickerModal
        isOpen={activeDatePicker !== null}
        onClose={() => setActiveDatePicker(null)}
        allowPartial
        initialDate={activePickerInitialDate}
        initialPrecision={activePickerInitialPrecision}
        anchorEl={
          activeDatePicker && typeof document !== 'undefined'
            ? document.getElementById(
                activeDatePicker === 'est' ? estDateAnchorId : abolDateAnchorId,
              )
            : null
        }
        onSelect={(isoDate, precision) => {
          if (!activeDatePicker) return
          applyDatePickerSelection(activeDatePicker, isoDate, precision)
        }}
      />
    </RegisterModal>
  )
}

/* ─────────────────────────── Styled Primitives ─────────────────────────── */

const DeptModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      overflow-y: hidden;
      padding: 20px 28px;
    }
  `
      : ''}
`

const SplitColumnsGrid = styled.div<{ $layoutMode: 'split' | 'single' }>`
  display: grid;
  grid-template-columns: ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? 'minmax(0, 1fr) minmax(0, 1fr)'
      : 'minmax(0, 1fr)'};
  gap: ${({ $layoutMode }) => ($layoutMode === 'split' ? '0' : '24px')};
  align-items: start;
  width: 100%;
  min-width: 0;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 980px) {
      ${FieldRow} {
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 14px;
        padding: 12px 0;
      }
    }
  `
      : ''}

  @media (max-width: 979px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const deptPaneScrollStyles = ({ theme }: { theme: DefaultTheme }) => `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 980px) {
    max-height: calc(86vh - 156px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 36px;

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
  ${deptPaneScrollStyles}

  @media (min-width: 980px) {
    padding-right: 26px;
  }
`

const SplitColumnRight = styled.div`
  ${deptPaneScrollStyles}

  @media (min-width: 980px) {
    padding-left: 26px;
    border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const HeaderRightBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  margin-right: 2px;
`

const NameAndAbbrGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 156px;
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const SubFieldHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
`

const DateHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const DateQuickActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const InlineAddRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
`

const PeriodBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(99, 102, 241, 0.24)'};
`

const AutoMatchPill = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(99, 102, 241, 0.24)'};
`

const BatchSavedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.09)'};
`

const BatchSavedDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`
