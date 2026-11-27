import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiCheck,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CabinetListItemDto,
  type CreateGovernmentPositionTenureDto,
  type GovernmentCabinetTenureItem,
  type PickerPositionDefinition,
  personCareerApi,
} from '@/shared/api/person-career'
import {
  createPerson,
  getPersonsByHistoricalCountryUnion,
  getPersonsByTenureCountry,
  type PersonResponseDto,
  type PersonSearchItem,
  searchPersons,
} from '@/shared/api/persons'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { ensureOwnedPositionDefinition } from '@/shared/lib/government-position/ensure-owned-position-definition'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { findDepartmentForMember } from '@/shared/lib/ministry-department/department-cabinet-matcher'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Z_INDEX } from '@/shared/styles/z-index'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'
import { Input } from '@/shared/ui/register-form-layout'
import {
  FooterActions,
  FooterHint,
  FooterReadyBadge,
  FooterReadyGroup,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  type ModalMoreActionOption,
  type ModalMoreToggleOption,
  RegisterModalMoreMenu,
} from '@/shared/ui/register-modal-shell/register-modal-more-menu'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import {
  formatPersonLifespanTag,
  isPersonPlausibleForYear,
  parseStructuredOrIsoDate,
} from './cabinet-form-modal.helpers'
import {
  formatDate,
  getPersonName,
  resolveCabinetEffectiveDates,
} from './cabinets-section.helpers'

export interface CabinetBulkMinisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (appointedCount: number) => void
  cabinet: CabinetListItemDto
  departments: AdministrationDepartment[]
  existingMinisters: GovernmentCabinetTenureItem[]
  countryId?: string | null
  historicalCountryId?: string | null
  countryName?: string
}

interface BulkPortfolioRow {
  rowKey: string
  isCustom: boolean
  departmentId: string | null
  departmentName: string
  roleTitle: string
  matchedDefinitionId: string | null
  personId: string
  personLabel: string
  incumbentNames: string[]
}

const POPOVER_Z = Z_INDEX.RICH_TEXT_EDITOR_OVERLAY + 40

/** 부처명과 관직 정의 목록을 바탕으로 기본 장관·수장 직위명을 추론한다 */
export function deriveDefaultPortfolioRoleTitle(
  department: Pick<AdministrationDepartment, 'id' | 'name' | 'kind'>,
  definitions: readonly PickerPositionDefinition[],
): { title: string; definitionId: string | null } {
  const matchedDef = definitions
    .filter(
      (defItem) =>
        defItem.administrationDepartmentId === department.id &&
        !defItem.isMonarchical &&
        Boolean(defItem.title?.trim()),
    )
    .sort(
      (leftDef, rightDef) => (leftDef.rank ?? 999) - (rightDef.rank ?? 999),
    )[0]

  if (matchedDef?.title?.trim()) {
    return {
      title: matchedDef.title.trim(),
      definitionId: matchedDef.id,
    }
  }

  const cleanName = department.name.trim()
  if (!cleanName) return { title: '장관', definitionId: null }
  if (cleanName === '의정부') return { title: '영의정', definitionId: null }
  if (/^(이조|호조|예조|병조|형조|공조)$/.test(cleanName)) {
    return { title: `${cleanName}판서`, definitionId: null }
  }
  if (cleanName.endsWith('성')) {
    return { title: `${cleanName} 대신`, definitionId: null }
  }
  if (cleanName.endsWith('위원회')) {
    return { title: `${cleanName} 위원장`, definitionId: null }
  }
  if (
    cleanName.endsWith('청') ||
    cleanName.endsWith('처') ||
    cleanName.endsWith('원') ||
    cleanName.endsWith('실')
  ) {
    return { title: `${cleanName}장`, definitionId: null }
  }
  return { title: `${cleanName} 장관`, definitionId: null }
}

export const CabinetBulkMinisterModal: React.FC<
  CabinetBulkMinisterModalProps
> = ({
  isOpen,
  onClose,
  onSaved,
  cabinet,
  departments,
  existingMinisters,
  countryId = null,
  historicalCountryId = null,
  countryName = '',
}) => {
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const customSeqRef = useRef(1)
  const initializedCabinetIdRef = useRef<string | null>(null)

  const [rows, setRows] = useState<BulkPortfolioRow[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [hideFilledDepartments, setHideFilledDepartments] = useState(false)
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Row-level person picker popover state
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null)
  const [personSearchText, setPersonSearchText] = useState('')
  const debouncedPersonQuery = useDebouncedValue(personSearchText, 220)
  const [pickerCoords, setPickerCoords] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const rowTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const pickerPopoverRef = useRef<HTMLDivElement | null>(null)
  const pickerInputRef = useRef<HTMLInputElement | null>(null)

  const effectiveDates = useMemo(
    () => resolveCabinetEffectiveDates(cabinet),
    [cabinet],
  )

  const parsedStartParts = useMemo(
    () =>
      parseStructuredOrIsoDate({
        era: cabinet.startEra,
        year: cabinet.startYear,
        month: cabinet.startMonth,
        day: cabinet.startDay,
        isoDate: effectiveDates.startDate,
      }),
    [cabinet, effectiveDates.startDate],
  )

  const parsedEndParts = useMemo(
    () =>
      parseStructuredOrIsoDate({
        era: cabinet.endEra,
        year: cabinet.endYear,
        month: cabinet.endMonth,
        day: cabinet.endDay,
        isoDate: effectiveDates.endDate,
      }),
    [cabinet, effectiveDates.endDate],
  )

  const signedStartYear = useMemo(() => {
    const numericYear = Number(parsedStartParts.year)
    if (!Number.isInteger(numericYear) || numericYear <= 0) return null
    return parsedStartParts.era === 'BC' ? -numericYear : numericYear
  }, [parsedStartParts])

  const { data: allDefinitions = [] } = useQuery<PickerPositionDefinition[]>({
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}),
    enabled: isOpen,
    staleTime: 60_000,
  })

  const { data: countryPersons = [] } = useQuery<PersonResponseDto[]>({
    queryKey: [
      'bulk-minister-country-persons',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: async () => {
      if (historicalCountryId) {
        return getPersonsByHistoricalCountryUnion(historicalCountryId)
      }
      if (countryId) {
        return getPersonsByTenureCountry({ countryId })
      }
      return []
    },
    enabled: isOpen && Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const { data: searchedPersons = [] } = useQuery<PersonSearchItem[]>({
    queryKey: ['bulk-minister-person-search', debouncedPersonQuery],
    queryFn: () => searchPersons(debouncedPersonQuery, 12),
    enabled: isOpen && Boolean(activeRowKey) && debouncedPersonQuery.trim().length > 0,
    staleTime: 30_000,
  })

  const incumbentNamesByDeptId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const ministerItem of existingMinisters) {
      const matchedDept = findDepartmentForMember(ministerItem, departments)
      if (!matchedDept) continue
      const personName = ministerItem.person
        ? getPersonName(ministerItem.person)
        : '인물 미상'
      const list = map.get(matchedDept.id) ?? []
      if (!list.includes(personName)) {
        list.push(personName)
      }
      map.set(matchedDept.id, list)
    }
    return map
  }, [existingMinisters, departments])

  const buildInitialRows = useCallback((): BulkPortfolioRow[] => {
    if (departments.length === 0) {
      return [
        {
          rowKey: 'custom-init-1',
          isCustom: true,
          departmentId: null,
          departmentName: '',
          roleTitle: '',
          matchedDefinitionId: null,
          personId: '',
          personLabel: '',
          incumbentNames: [],
        },
      ]
    }
    return departments.map((deptItem) => {
      const derived = deriveDefaultPortfolioRoleTitle(deptItem, allDefinitions)
      return {
        rowKey: `dept-${deptItem.id}`,
        isCustom: false,
        departmentId: deptItem.id,
        departmentName: deptItem.name,
        roleTitle: derived.title,
        matchedDefinitionId: derived.definitionId,
        personId: '',
        personLabel: '',
        incumbentNames: incumbentNamesByDeptId.get(deptItem.id) ?? [],
      }
    })
  }, [departments, allDefinitions, incumbentNamesByDeptId])

  useEffect(() => {
    if (!isOpen) {
      initializedCabinetIdRef.current = null
      setActiveRowKey(null)
      setPersonSearchText('')
      setErrorMessage(null)
      return
    }
    const initKey = `${cabinet.id}:${departments.length}:${allDefinitions.length > 0 ? 'defs' : 'nodefs'}`
    if (initializedCabinetIdRef.current === initKey) return
    initializedCabinetIdRef.current = initKey
    setRows((prevRows) => {
      // Preserve any already-picked person selections if definitions finish loading mid-open
      const prevByKey = new Map(
        prevRows.map((existingRow) => [existingRow.rowKey, existingRow]),
      )
      const freshRows = buildInitialRows()
      return freshRows.map((freshRow) => {
        const prevMatch = prevByKey.get(freshRow.rowKey)
        if (!prevMatch) return freshRow
        return {
          ...freshRow,
          roleTitle: prevMatch.personId ? prevMatch.roleTitle : freshRow.roleTitle,
          personId: prevMatch.personId,
          personLabel: prevMatch.personLabel,
        }
      })
    })
  }, [isOpen, cabinet.id, departments.length, allDefinitions.length, buildInitialRows])

  const updatePickerCoords = useCallback(() => {
    if (!activeRowKey || typeof window === 'undefined') return
    const triggerEl = rowTriggerRefs.current.get(activeRowKey)
    if (!triggerEl) return
    const rect = triggerEl.getBoundingClientRect()
    const desiredWidth = Math.max(rect.width, 300)
    const clampedLeft = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - desiredWidth - 12),
    )
    const estimatedHeight = 290
    const fitsBelow = rect.bottom + 6 + estimatedHeight <= window.innerHeight - 12
    const nextTop = fitsBelow
      ? rect.bottom + 6
      : Math.max(12, rect.top - estimatedHeight - 6)
    setPickerCoords({
      top: nextTop,
      left: clampedLeft,
      width: desiredWidth,
    })
  }, [activeRowKey])

  useLayoutEffect(() => {
    if (!activeRowKey) return
    updatePickerCoords()
    requestAnimationFrame(() => {
      pickerInputRef.current?.focus()
    })
  }, [activeRowKey, updatePickerCoords])

  useEffect(() => {
    if (!activeRowKey) return
    const handlePointerDown = (mouseEvent: MouseEvent) => {
      const targetNode = mouseEvent.target as Node | null
      if (!targetNode) return
      const activeTrigger = rowTriggerRefs.current.get(activeRowKey)
      if (activeTrigger?.contains(targetNode)) return
      if (pickerPopoverRef.current?.contains(targetNode)) return
      setActiveRowKey(null)
      setPersonSearchText('')
    }
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.stopPropagation()
        setActiveRowKey(null)
        setPersonSearchText('')
      }
    }
    const handleReposition = () => updatePickerCoords()
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [activeRowKey, updatePickerCoords])

  const pickerCandidates = useMemo(() => {
    if (personSearchText.trim().length > 0) {
      return searchedPersons.slice(0, 8).map((personItem) => {
        const matchedFull = countryPersons.find(
          (fullItem) => fullItem.id === personItem.id,
        )
        const lifespan = matchedFull
          ? formatPersonLifespanTag(matchedFull)
          : null
        return {
          id: personItem.id,
          label: getPersonDisplayName(personItem),
          subLabel: lifespan ?? personItem.originalName ?? null,
        }
      })
    }
    const sorted = [...countryPersons].sort((leftPerson, rightPerson) => {
      const leftOk = isPersonPlausibleForYear(leftPerson, signedStartYear)
      const rightOk = isPersonPlausibleForYear(rightPerson, signedStartYear)
      if (leftOk !== rightOk) return leftOk ? -1 : 1
      return 0
    })
    return sorted.slice(0, 7).map((personItem) => ({
      id: personItem.id,
      label: getPersonDisplayName(personItem),
      subLabel:
        formatPersonLifespanTag(personItem) ?? personItem.originalName ?? null,
    }))
  }, [personSearchText, searchedPersons, countryPersons, signedStartYear])

  const assignPersonToRow = useCallback(
    (targetRowKey: string, personId: string, personLabel: string) => {
      setRows((prevRows) =>
        prevRows.map((rowItem) =>
          rowItem.rowKey === targetRowKey
            ? { ...rowItem, personId, personLabel }
            : rowItem,
        ),
      )
      setActiveRowKey(null)
      setPersonSearchText('')
    },
    [],
  )

  const quickCreatePersonForRowMutation = useMutation({
    mutationFn: async (rawName: string) => {
      const trimmed = rawName.trim()
      if (!trimmed) {
        throw new Error('생성할 인물 이름을 입력해주세요.')
      }
      return createPerson({
        name: trimmed,
        ...(countryId || historicalCountryId
          ? {
              countries: [
                {
                  ...(countryId ? { countryId } : {}),
                  ...(historicalCountryId ? { historicalCountryId } : {}),
                  priority: 0,
                },
              ],
            }
          : {}),
      } as Parameters<typeof createPerson>[0])
    },
    onSuccess: (createdPerson) => {
      const displayLabel = getPersonDisplayName(createdPerson)
      if (activeRowKey) {
        assignPersonToRow(activeRowKey, createdPerson.id, displayLabel)
      }
      notify.success(`"${displayLabel}" 인물이 등록되어 배정되었습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void queryClient.invalidateQueries({
        queryKey: ['bulk-minister-country-persons'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const addCustomPortfolioRow = useCallback(() => {
    const seq = customSeqRef.current++
    setRows((prevRows) => [
      ...prevRows,
      {
        rowKey: `custom-${seq}`,
        isCustom: true,
        departmentId: null,
        departmentName: '',
        roleTitle: '',
        matchedDefinitionId: null,
        personId: '',
        personLabel: '',
        incumbentNames: [],
      },
    ])
  }, [])

  const filledRows = useMemo(
    () =>
      rows.filter(
        (rowItem) =>
          Boolean(rowItem.personId) && Boolean(rowItem.roleTitle.trim()),
      ),
    [rows],
  )

  const visibleRows = useMemo(() => {
    const normalizedQuery = searchFilter.trim().toLowerCase()
    return rows.filter((rowItem) => {
      if (
        hideFilledDepartments &&
        !rowItem.isCustom &&
        rowItem.incumbentNames.length > 0 &&
        !rowItem.personId
      ) {
        return false
      }
      if (!normalizedQuery) return true
      return (
        rowItem.departmentName.toLowerCase().includes(normalizedQuery) ||
        rowItem.roleTitle.toLowerCase().includes(normalizedQuery) ||
        rowItem.personLabel.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [rows, hideFilledDepartments, searchFilter])

  const saveBulkMinistersMutation = useMutation({
    mutationFn: async () => {
      if (filledRows.length === 0) {
        throw new Error('임명할 각료 인물을 최소 1명 이상 선택해주세요.')
      }
      const parsedYearNum = Number(parsedStartParts.year)
      if (!Number.isInteger(parsedYearNum) || parsedYearNum <= 0) {
        throw new Error(
          '내각 출범 연도를 확인할 수 없습니다. 먼저 내각 기간을 설정해주세요.',
        )
      }
      const startDateInfo: NonNullable<
        CreateGovernmentPositionTenureDto['startDateInfo']
      > = {
        era: parsedStartParts.era,
        year: parsedYearNum,
        ...(parsedStartParts.month.trim()
          ? { month: Number(parsedStartParts.month) }
          : {}),
        ...(parsedStartParts.day.trim()
          ? { day: Number(parsedStartParts.day) }
          : {}),
      }

      const endYearNum = Number(parsedEndParts.year)
      const endDateInfo =
        parsedEndParts.year.trim() &&
        Number.isInteger(endYearNum) &&
        endYearNum > 0
          ? {
              era: parsedEndParts.era,
              year: endYearNum,
              ...(parsedEndParts.month.trim()
                ? { month: Number(parsedEndParts.month) }
                : {}),
              ...(parsedEndParts.day.trim()
                ? { day: Number(parsedEndParts.day) }
                : {}),
            }
          : undefined

      /*
       * 직책은 DB 정의 필수(서버 2026-11-27) — 부처에서 추론한 직위명('X 대신' 등)이 DB에 없으면
       * 그 부처의 직책으로 먼저 등록하고 id로 보낸다. 부처 없는 행은 이름을 서버가 DB 직책으로 해석한다(없으면 거부).
       */
      const definitionPool = [...allDefinitions]
      for (const rowItem of filledRows) {
        const trimmedRole = rowItem.roleTitle.trim()
        const positionDefinitionId =
          rowItem.matchedDefinitionId ??
          (rowItem.departmentId
            ? await ensureOwnedPositionDefinition({
                title: trimmedRole,
                positionType: 'CABINET_MINISTER',
                administrationDepartmentId: rowItem.departmentId,
                pool: definitionPool,
              })
            : null)
        if (
          positionDefinitionId &&
          !definitionPool.some((definition) => definition.id === positionDefinitionId)
        ) {
          definitionPool.push({
            id: positionDefinitionId,
            title: trimmedRole,
            administrationDepartmentId: rowItem.departmentId,
          })
        }
        const payload: CreateGovernmentPositionTenureDto = {
          personId: rowItem.personId,
          positionType: 'CABINET_MINISTER',
          title: trimmedRole,
          ...(positionDefinitionId ? { positionDefinitionId } : {}),
          ...(countryId ? { countryId } : {}),
          ...(historicalCountryId ? { historicalCountryId } : {}),
          ...(rowItem.departmentId
            ? { administrationDepartmentId: rowItem.departmentId }
            : {}),
          cabinetId: cabinet.id,
          cabinetIds: [cabinet.id],
          startDateInfo,
          ...(endDateInfo ? { endDateInfo } : {}),
        }
        await personCareerApi.addGovernmentPositionTenure(payload)
      }

      return filledRows.length
    },
    onSuccess: (savedCount) => {
      invalidateTenureQueries(queryClient, {
        cabinetId: cabinet.id,
        countryId,
        historicalCountryId,
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet', cabinet.id],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinets-by-country'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['administration-department-tenures'],
      })
      notify.success(`${savedCount}명의 각료·장관이 일괄 임명되었습니다.`)
      onSaved?.(savedCount)
      onClose()
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  useModalSubmitShortcut({
    enabled:
      isOpen &&
      !saveBulkMinistersMutation.isPending &&
      filledRows.length > 0 &&
      activeRowKey === null,
    scrollContainerRef,
    onSubmit: () => saveBulkMinistersMutation.mutate(),
  })

  const cabinetTitleText = useMemo(() => {
    if (cabinet.name?.trim()) return cabinet.name.trim()
    if (cabinet.headTenure?.person) {
      return `${getPersonName(cabinet.headTenure.person)} 행정부`
    }
    return `${countryName || '국가'} 내각`
  }, [cabinet, countryName])

  const periodCaption = useMemo(() => {
    const startStr = effectiveDates.startDate
      ? formatDate(effectiveDates.startDate)
      : '출범일 미상'
    const endStr = effectiveDates.endDate
      ? formatDate(effectiveDates.endDate)
      : '현직'
    return `${startStr} – ${endStr}`
  }, [effectiveDates])

  const moreToggles = useMemo<ModalMoreToggleOption[]>(
    () => [
      {
        key: 'hide-filled',
        label: '이미 임명된 부처 숨기기',
        description: '공석 부처만 집중해서 배정할 때 사용',
        checked: hideFilledDepartments,
        onChange: setHideFilledDepartments,
      },
    ],
    [hideFilledDepartments],
  )

  const moreActions = useMemo<ModalMoreActionOption[]>(
    () => [
      {
        key: 'add-custom-row',
        label: '부처 외 직접 직위 행 추가',
        icon: <FiPlus size={13.5} />,
        onClick: addCustomPortfolioRow,
      },
      ...(filledRows.length > 0
        ? [
            {
              key: 'clear-selections',
              label: '선택한 인물 초기화',
              icon: <FiRefreshCw size={13.5} />,
              danger: true,
              onClick: () =>
                setRows((prevRows) =>
                  prevRows.map((rowItem) => ({
                    ...rowItem,
                    personId: '',
                    personLabel: '',
                  })),
                ),
            },
          ]
        : []),
    ],
    [addCustomPortfolioRow, filledRows.length],
  )

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        if (!saveBulkMinistersMutation.isPending) {
          onClose()
        }
      }}
      title="부처별 일괄 각료 임명"
      maxWidth="min(880px, 95vw)"
      minHeight="auto"
      fullBleedOnMobile
      closeOnEsc={
        !saveBulkMinistersMutation.isPending &&
        activeRowKey === null &&
        !headerMoreOpen
      }
      closeOnOverlayClick={false}
      headerActions={
        <HeaderRightMeta>
          <CabinetPeriodPill title={cabinetTitleText}>
            <strong>{cabinetTitleText}</strong>
            <span>· {periodCaption}</span>
          </CabinetPeriodPill>
          <RegisterModalMoreMenu
            toggles={moreToggles}
            actions={moreActions}
            ariaLabel="일괄 임명 설정 더보기"
            title="공석 필터 · 직접 직위 추가"
            hasActiveIndicator={hideFilledDepartments}
            onOpenChange={setHeaderMoreOpen}
          />
        </HeaderRightMeta>
      }
    >
      <PersonRegisterModalFormScroll ref={scrollContainerRef}>
        {errorMessage ? (
          <AlertBox
            variant="danger"
            icon={<FiAlertCircle />}
            style={{ marginBottom: 14 }}
          >
            {errorMessage}
          </AlertBox>
        ) : null}

        <TopFilterBar>
          <SearchBox>
            <FiSearch size={13.5} aria-hidden />
            <input
              type="text"
              value={searchFilter}
              onChange={(changeEvt) => setSearchFilter(changeEvt.target.value)}
              placeholder="부처명 또는 직위명 검색…"
              aria-label="부처 및 직위 검색"
            />
            {searchFilter ? (
              <ClearIconBtn
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setSearchFilter('')}
              >
                <FiX size={12} />
              </ClearIconBtn>
            ) : null}
          </SearchBox>

          <AddCustomRowBtn type="button" onClick={addCustomPortfolioRow}>
            <FiPlus size={13} />
            <span>직접 직위 추가</span>
          </AddCustomRowBtn>
        </TopFilterBar>

        <PortfolioTable>
          <PortfolioHeadRow>
            <span>소관 부처 · 기관</span>
            <span>임명 직위명</span>
            <span>각료 인물 배정</span>
          </PortfolioHeadRow>

          {visibleRows.length === 0 ? (
            <EmptyRowsNotice>
              조건에 해당하는 부처 행이 없습니다. 우측 상단 [직접 직위 추가]로
              새 각료 자리를 추가할 수 있습니다.
            </EmptyRowsNotice>
          ) : (
            visibleRows.map((rowItem) => {
              const isSelected = Boolean(rowItem.personId)
              const isPickerOpenForRow = activeRowKey === rowItem.rowKey
              return (
                <PortfolioDataRow key={rowItem.rowKey} $filled={isSelected}>
                  <DeptCell>
                    {rowItem.isCustom ? (
                      <CustomDeptRow>
                        <CustomBadge>직접 입력</CustomBadge>
                        {rows.length > 1 ? (
                          <RemoveRowBtn
                            type="button"
                            title="이 행 제거"
                            aria-label="직접 입력 행 제거"
                            onClick={() =>
                              setRows((prevRows) =>
                                prevRows.filter(
                                  (candidate) =>
                                    candidate.rowKey !== rowItem.rowKey,
                                ),
                              )
                            }
                          >
                            <FiTrash2 size={12.5} />
                          </RemoveRowBtn>
                        ) : null}
                      </CustomDeptRow>
                    ) : (
                      <>
                        <DeptTitleText>{rowItem.departmentName}</DeptTitleText>
                        {rowItem.incumbentNames.length > 0 ? (
                          <IncumbentSubText>
                            현임: {rowItem.incumbentNames.join(', ')}
                          </IncumbentSubText>
                        ) : null}
                      </>
                    )}
                  </DeptCell>

                  <RoleCell>
                    <Input
                      value={rowItem.roleTitle}
                      onChange={(changeEvt) => {
                        const nextRole = changeEvt.target.value
                        setRows((prevRows) =>
                          prevRows.map((candidate) =>
                            candidate.rowKey === rowItem.rowKey
                              ? {
                                  ...candidate,
                                  roleTitle: nextRole,
                                  matchedDefinitionId: null,
                                }
                              : candidate,
                          ),
                        )
                      }}
                      placeholder="예: 외교부 장관, 무임소 장관"
                      aria-label={`${rowItem.departmentName || '직접 입력'} 직위명`}
                    />
                  </RoleCell>

                  <PersonCell>
                    {isSelected ? (
                      <AssignedPersonPill>
                        <span className="person-main">
                          <FiCheck size={12.5} />
                          <strong>{rowItem.personLabel}</strong>
                        </span>
                        <ClearIconBtn
                          type="button"
                          aria-label={`${rowItem.personLabel} 배정 해제`}
                          onClick={() =>
                            setRows((prevRows) =>
                              prevRows.map((candidate) =>
                                candidate.rowKey === rowItem.rowKey
                                  ? {
                                      ...candidate,
                                      personId: '',
                                      personLabel: '',
                                    }
                                  : candidate,
                              ),
                            )
                          }
                        >
                          <FiX size={13} />
                        </ClearIconBtn>
                      </AssignedPersonPill>
                    ) : (
                      <PersonPickTriggerBtn
                        ref={(btnEl) => {
                          if (btnEl) {
                            rowTriggerRefs.current.set(rowItem.rowKey, btnEl)
                          } else {
                            rowTriggerRefs.current.delete(rowItem.rowKey)
                          }
                        }}
                        type="button"
                        $open={isPickerOpenForRow}
                        onClick={() => {
                          if (isPickerOpenForRow) {
                            setActiveRowKey(null)
                            setPersonSearchText('')
                          } else {
                            setPersonSearchText('')
                            setActiveRowKey(rowItem.rowKey)
                          }
                        }}
                      >
                        <FiUser size={13} />
                        <span>인물 검색 · 배정…</span>
                      </PersonPickTriggerBtn>
                    )}
                  </PersonCell>
                </PortfolioDataRow>
              )
            })
          )}
        </PortfolioTable>
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterReadyGroup>
          {filledRows.length > 0 ? (
            <FooterReadyBadge>
              <FiCheck size={12.5} />
              <span>{filledRows.length}명 임명 준비됨</span>
            </FooterReadyBadge>
          ) : (
            <FooterHint>
              배정할 부처 행에서 인물을 선택하면 내각 기간으로 한 번에 임명됩니다
            </FooterHint>
          )}
        </FooterReadyGroup>

        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            disabled={saveBulkMinistersMutation.isPending}
            onClick={onClose}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={
              filledRows.length === 0 || saveBulkMinistersMutation.isPending
            }
            onClick={() => saveBulkMinistersMutation.mutate()}
          >
            {saveBulkMinistersMutation.isPending
              ? '일괄 임명 중…'
              : filledRows.length > 0
                ? `${filledRows.length}명 일괄 임명`
                : '일괄 임명'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>

      {activeRowKey && pickerCoords && typeof document !== 'undefined'
        ? createPortal(
            <PersonPickerPopover
              ref={pickerPopoverRef}
              role="dialog"
              aria-label="각료 인물 검색 및 선택"
              style={{
                top: pickerCoords.top,
                left: pickerCoords.left,
                width: pickerCoords.width,
              }}
            >
              <PickerSearchHeader>
                <FiSearch size={13.5} />
                <input
                  ref={pickerInputRef}
                  type="text"
                  value={personSearchText}
                  onChange={(changeEvt) =>
                    setPersonSearchText(changeEvt.target.value)
                  }
                  placeholder="인물 이름 검색 (없으면 아래에서 바로 생성)…"
                />
              </PickerSearchHeader>

              <PickerCandidateList>
                {pickerCandidates.length === 0 ? (
                  <PickerEmptyHint>
                    {personSearchText.trim()
                      ? '일치하는 기존 인물이 없습니다.'
                      : '이름을 입력해 인물을 검색하세요.'}
                  </PickerEmptyHint>
                ) : (
                  pickerCandidates.map((candItem) => (
                    <PickerCandidateBtn
                      key={candItem.id}
                      type="button"
                      onClick={() =>
                        assignPersonToRow(
                          activeRowKey,
                          candItem.id,
                          candItem.label,
                        )
                      }
                    >
                      <span className="cand-name">{candItem.label}</span>
                      {candItem.subLabel ? (
                        <span className="cand-sub">{candItem.subLabel}</span>
                      ) : null}
                    </PickerCandidateBtn>
                  ))
                )}
              </PickerCandidateList>

              {personSearchText.trim() ? (
                <PickerQuickCreateBtn
                  type="button"
                  disabled={quickCreatePersonForRowMutation.isPending}
                  onClick={() =>
                    quickCreatePersonForRowMutation.mutate(personSearchText)
                  }
                >
                  <FiUserPlus size={13.5} />
                  <span>
                    &ldquo;{personSearchText.trim()}&rdquo; 새 인물로 등록 후
                    배정
                  </span>
                </PickerQuickCreateBtn>
              ) : null}
            </PersonPickerPopover>,
            document.body,
          )
        : null}
    </RegisterModal>
  )
}

const HeaderRightMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const CabinetPeriodPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 340px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 640px) {
    display: none;
  }
`

const TopFilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`

const SearchBox = styled.div`
  flex: 1 1 220px;
  max-width: 340px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-family: inherit;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ClearIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const AddCustomRowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PortfolioTable = styled.div`
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  overflow: hidden;
`

const PortfolioHeadRow = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1.05fr) minmax(160px, 1.1fr) minmax(
      190px,
      1.3fr
    );
  gap: 10px;
  padding: 9px 14px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};

  @media (max-width: 680px) {
    display: none;
  }
`

const PortfolioDataRow = styled.div<{ $filled: boolean }>`
  display: grid;
  grid-template-columns: minmax(150px, 1.05fr) minmax(160px, 1.1fr) minmax(
      190px,
      1.3fr
    );
  gap: 10px;
  align-items: center;
  padding: 9px 14px;
  background: ${({ $filled, theme }) =>
    $filled
      ? theme.mode === 'dark'
        ? 'rgba(79, 70, 229, 0.1)'
        : 'rgba(79, 70, 229, 0.04)'
      : 'transparent'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.06)'};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`

const DeptCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const DeptTitleText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const IncumbentSubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CustomDeptRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

const CustomBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RemoveRowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
`

const RoleCell = styled.div`
  min-width: 0;
`

const PersonCell = styled.div`
  min-width: 0;
`

const PersonPickTriggerBtn = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 36px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px dashed
    ${({ $open, theme }) =>
      $open ? '#4f46e5' : kitC(theme).border};
  background: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? 'rgba(79, 70, 229, 0.12)'
        : '#eef2ff'
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;

  &:hover {
    border-style: solid;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.secondary};
  }
`

const AssignedPersonPill = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 36px;
  padding: 0 8px 0 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(129, 140, 248, 0.4)'
        : 'rgba(79, 70, 229, 0.28)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(79, 70, 229, 0.16)' : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};

  .person-main {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12.5px;

    strong {
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`

const EmptyRowsNotice = styled.div`
  padding: 28px 18px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PersonPickerPopover = styled.div`
  position: fixed;
  z-index: ${POPOVER_Z};
  max-width: calc(100vw - 24px);
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#181a20' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 18px 40px -12px rgba(0, 0, 0, 0.7)'
      : '0 16px 36px -12px rgba(15, 23, 42, 0.2)'};
  overflow: hidden;
`

const PickerSearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-family: inherit;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PickerCandidateList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const PickerCandidateBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: none;
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  .cand-name {
    font-size: 12.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .cand-sub {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc'};
  }
`

const PickerEmptyHint = styled.div`
  padding: 14px 10px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PickerQuickCreateBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 9px 11px;
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(79, 70, 229, 0.14)' : '#f5f3ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4f46e5')};
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(79, 70, 229, 0.22)' : '#ede9fe'};
  }
`
