import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import { getPoliticalParties } from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CabinetListItemDto,
  type CreateGovernmentPositionTenureDto,
  personCareerApi,
} from '@/shared/api/person-career'
import {
  createPerson,
  type Era,
  getPersonsByHistoricalCountryUnion,
  getPersonsByTenureCountry,
  type PersonSearchItem,
  searchPersons,
} from '@/shared/api/persons'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export type InstitutionAppointmentContextType =
  | 'DEPARTMENT'
  | 'MILITARY_UNIT'
  | 'CABINET'

export interface EditableInstitutionTenure {
  id: string
  personId?: string | null
  personName?: string | null
  positionType?: CreateGovernmentPositionTenureDto['positionType'] | string | null
  positionDefinitionId?: string | null
  title?: string | null
  rankTitle?: string | null
  ordinal?: number | null
  partyId?: string | null
  administrationDepartmentId?: string | null
  militaryUnitId?: string | null
  cabinetId?: string | null
  cabinetIds?: string[]
  startDate?: string | null
  endDate?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  notes?: string | null
}

export interface InstitutionAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (savedTenure: unknown) => void
  contextType: InstitutionAppointmentContextType
  countryId?: string | null
  historicalCountryId?: string | null
  countryName?: string | null
  countryDefaultNameDisplayOrder?: string | null
  departmentId?: string | null
  departmentName?: string | null
  departmentKind?: string | null
  militaryUnitId?: string | null
  militaryUnitName?: string | null
  militaryUnitType?: string | null
  cabinetId?: string | null
  cabinetName?: string | null
  /** 내각(CABINET) 컨텍스트에서 담당 부처를 선택할 수 있도록 넘기는 부처 목록 */
  availableDepartments?: AdministrationDepartment[]
  /** 부처(DEPARTMENT) 컨텍스트에서 함께 소속시킬 행정부·내각 목록 */
  availableCabinets?: CabinetListItemDto[]
  /** 기존 재임 수정 모드 */
  editingTenure?: EditableInstitutionTenure | null
}

function parseIsoFallback(isoDate: string | null | undefined): {
  era: Era
  year: string
  month: string
  day: string
} {
  if (!isoDate) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const trimmed = isoDate.trim()
  const match = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(trimmed)
  if (!match) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  const rawYear = Number(match[1])
  if (!Number.isFinite(rawYear) || rawYear === 0) {
    return { era: 'AD', year: '', month: '', day: '' }
  }
  return {
    era: rawYear < 0 ? 'BC' : 'AD',
    year: String(Math.abs(rawYear)),
    month: match[2] ? String(Number(match[2])) : '',
    day: match[3] ? String(Number(match[3])) : '',
  }
}

function buildRolePresets(params: {
  contextType: InstitutionAppointmentContextType
  departmentName?: string | null
  departmentKind?: string | null
  militaryUnitType?: string | null
}): string[] {
  const { contextType, departmentName, departmentKind, militaryUnitType } = params
  const cleanDept = departmentName?.trim() ?? ''

  if (contextType === 'MILITARY_UNIT') {
    if (militaryUnitType === 'SUPREME_COMMAND') {
      return [
        '최고사령관',
        '총장(Chef)',
        '작전부장',
        '참모총장',
        '총사령관',
        '군사위원',
      ]
    }
    if (militaryUnitType === 'GENERAL_STAFF') {
      return [
        '참모총장',
        '합참의장',
        '작전부장',
        '제1병참총감',
        '참모차장',
        '정보부장',
      ]
    }
    if (militaryUnitType === 'SERVICE_HQ') {
      return ['총사령관', '참모총장', '사령관', '참모장', '작전부장']
    }
    if (
      militaryUnitType === 'THEATER' ||
      militaryUnitType === 'ARMY_GROUP' ||
      militaryUnitType === 'FRONT'
    ) {
      return ['총사령관', '사령관', '참모장', '군사위원', '작전참모']
    }
    if (militaryUnitType === 'FLEET') {
      return ['함대사령관', '사령장관', '참모장', '전대사령관']
    }
    if (
      militaryUnitType === 'AIR_FLEET' ||
      militaryUnitType === 'AIR_CORPS' ||
      militaryUnitType === 'WING'
    ) {
      return ['사령관', '비행단장', '참모장']
    }
    return ['사령관', '군단장', '사단장', '여단장', '연대장', '참모장']
  }

  if (departmentKind === 'COLONIAL_GOVERNMENT') {
    return ['총독', '정무총감', '부총독', '민정장관', '경무국장']
  }
  if (departmentKind === 'ROYAL_HOUSEHOLD') {
    return ['궁내대신', '비서실장', '도승지', '시종장', '종친부 제조']
  }
  if (departmentKind === 'AGENCY') {
    return ['청장', '위원장', '처장', '원장', '국장', '차장']
  }

  const presets: string[] = []
  if (cleanDept) {
    if (cleanDept.endsWith('성')) {
      presets.push(`${cleanDept.slice(0, -1)}대신`, `${cleanDept} 장관`)
    } else if (cleanDept.endsWith('조')) {
      presets.push(`${cleanDept}판서`, `${cleanDept}참판`)
    } else if (cleanDept.endsWith('부')) {
      presets.push(`${cleanDept} 장관`, `${cleanDept} 차관`)
    } else {
      presets.push(`${cleanDept} 장관`, `${cleanDept} 수장`)
    }
  }
  for (const baseRole of [
    '장관',
    '대신',
    '차관',
    '국무위원',
    '부총리',
    '무임소장관',
    '청장',
    '국장',
  ]) {
    if (!presets.includes(baseRole)) {
      presets.push(baseRole)
    }
  }
  return presets.slice(0, 8)
}

const MILITARY_RANK_PRESETS = [
  '원수',
  '제국원수',
  '상급대장',
  '대장',
  '중장',
  '소장',
  '준장',
  '대령',
  '제독',
]

function inferPositionType(params: {
  contextType: InstitutionAppointmentContextType
  departmentKind?: string | null
  roleTitle: string
  fallbackType?: string | null
}): CreateGovernmentPositionTenureDto['positionType'] {
  const { contextType, departmentKind, roleTitle, fallbackType } = params
  if (contextType === 'MILITARY_UNIT') {
    return 'MILITARY_COMMANDER'
  }
  const normalized = roleTitle.trim()
  if (/차관|참판|차장|부총독|정무총감|부위원장/.test(normalized)) {
    return 'VICE_MINISTER'
  }
  if (departmentKind === 'COLONIAL_GOVERNMENT' || /총독|태수|관찰사|도지사/.test(normalized)) {
    return 'LOCAL_GOVERNMENT'
  }
  if (
    departmentKind === 'ROYAL_HOUSEHOLD' ||
    /비서실장|도승지|궁내|청장|위원장|국장|원장/.test(normalized)
  ) {
    return contextType === 'CABINET' ? 'CABINET_MINISTER' : 'SPECIAL_POSITION'
  }
  if (
    fallbackType === 'HEAD_OF_STATE' ||
    fallbackType === 'HEAD_OF_GOVERNMENT' ||
    fallbackType === 'CABINET_MINISTER' ||
    fallbackType === 'VICE_MINISTER' ||
    fallbackType === 'LOCAL_GOVERNMENT' ||
    fallbackType === 'SPECIAL_POSITION' ||
    fallbackType === 'MILITARY_COMMANDER'
  ) {
    return fallbackType
  }
  return 'CABINET_MINISTER'
}

export const InstitutionAppointmentModal: React.FC<
  InstitutionAppointmentModalProps
> = ({
  isOpen,
  onClose,
  onSaved,
  contextType,
  countryId,
  historicalCountryId,
  countryName,
  countryDefaultNameDisplayOrder,
  departmentId,
  departmentName,
  departmentKind,
  militaryUnitId,
  militaryUnitName,
  militaryUnitType,
  cabinetId,
  cabinetName,
  availableDepartments = [],
  availableCabinets = [],
  editingTenure = null,
}) => {
  const queryClient = useQueryClient()
  const isEditing = Boolean(editingTenure?.id)

  const [personQuery, setPersonQuery] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedPersonLabel, setSelectedPersonLabel] = useState<string>('')
  const [showQuickCreatePerson, setShowQuickCreatePerson] = useState(false)
  const [quickPersonSurname, setQuickPersonSurname] = useState('')
  const [quickPersonGivenName, setQuickPersonGivenName] = useState('')
  const [quickPersonOriginalName, setQuickPersonOriginalName] = useState('')

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departmentId ?? '',
  )
  const [roleTitle, setRoleTitle] = useState<string>('')
  const [rankTitle, setRankTitle] = useState<string>('')
  const [ordinalInput, setOrdinalInput] = useState<string>('')
  const [partyId, setPartyId] = useState<string>('')
  const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([])

  const [startEra, setStartEra] = useState<Era>('AD')
  const [startYear, setStartYear] = useState<string>('')
  const [startMonth, setStartMonth] = useState<string>('')
  const [startDay, setStartDay] = useState<string>('')

  const [endEra, setEndEra] = useState<Era>('AD')
  const [endYear, setEndYear] = useState<string>('')
  const [endMonth, setEndMonth] = useState<string>('')
  const [endDay, setEndDay] = useState<string>('')

  const [notes, setNotes] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setErrorMessage(null)
    setShowQuickCreatePerson(false)
    setQuickPersonSurname('')
    setQuickPersonGivenName('')
    setQuickPersonOriginalName('')
    setPersonQuery('')

    if (editingTenure) {
      setSelectedPersonId(editingTenure.personId ?? '')
      setSelectedPersonLabel(editingTenure.personName ?? '')
      setSelectedDeptId(
        editingTenure.administrationDepartmentId ?? departmentId ?? '',
      )
      setRoleTitle(editingTenure.title ?? '')
      setRankTitle(editingTenure.rankTitle ?? '')
      setOrdinalInput(
        editingTenure.ordinal != null ? String(editingTenure.ordinal) : '',
      )
      setPartyId(editingTenure.partyId ?? '')
      const initialCabinets =
        editingTenure.cabinetIds && editingTenure.cabinetIds.length > 0
          ? editingTenure.cabinetIds
          : editingTenure.cabinetId
            ? [editingTenure.cabinetId]
            : cabinetId
              ? [cabinetId]
              : []
      setSelectedCabinetIds(initialCabinets)

      if (editingTenure.startYear != null) {
        setStartEra(editingTenure.startEra === 'BC' ? 'BC' : 'AD')
        setStartYear(String(editingTenure.startYear))
        setStartMonth(
          editingTenure.startMonth != null
            ? String(editingTenure.startMonth)
            : '',
        )
        setStartDay(
          editingTenure.startDay != null ? String(editingTenure.startDay) : '',
        )
      } else {
        const parsedStart = parseIsoFallback(editingTenure.startDate)
        setStartEra(parsedStart.era)
        setStartYear(parsedStart.year)
        setStartMonth(parsedStart.month)
        setStartDay(parsedStart.day)
      }

      if (editingTenure.endYear != null) {
        setEndEra(editingTenure.endEra === 'BC' ? 'BC' : 'AD')
        setEndYear(String(editingTenure.endYear))
        setEndMonth(
          editingTenure.endMonth != null ? String(editingTenure.endMonth) : '',
        )
        setEndDay(
          editingTenure.endDay != null ? String(editingTenure.endDay) : '',
        )
      } else {
        const parsedEnd = parseIsoFallback(editingTenure.endDate)
        setEndEra(parsedEnd.era)
        setEndYear(parsedEnd.year)
        setEndMonth(parsedEnd.month)
        setEndDay(parsedEnd.day)
      }

      setNotes(editingTenure.notes ?? '')
    } else {
      setSelectedPersonId('')
      setSelectedPersonLabel('')
      setSelectedDeptId(departmentId ?? '')
      setRoleTitle('')
      setRankTitle('')
      setOrdinalInput('')
      setPartyId('')
      setSelectedCabinetIds(cabinetId ? [cabinetId] : [])
      setStartEra('AD')
      setStartYear('')
      setStartMonth('')
      setStartDay('')
      setEndEra('AD')
      setEndYear('')
      setEndMonth('')
      setEndDay('')
      setNotes('')
    }
  }, [isOpen, editingTenure, departmentId, cabinetId])

  const activeDepartment = useMemo(() => {
    if (!selectedDeptId) return null
    return (
      availableDepartments.find((deptItem) => deptItem.id === selectedDeptId) ??
      null
    )
  }, [availableDepartments, selectedDeptId])

  const effectiveDepartmentName = activeDepartment?.name ?? departmentName
  const effectiveDepartmentKind = activeDepartment?.kind ?? departmentKind

  const rolePresets = useMemo(
    () =>
      buildRolePresets({
        contextType,
        departmentName: effectiveDepartmentName,
        departmentKind: effectiveDepartmentKind,
        militaryUnitType,
      }),
    [
      contextType,
      effectiveDepartmentName,
      effectiveDepartmentKind,
      militaryUnitType,
    ],
  )

  const { data: searchedPersons = [], isFetching: isSearchingPersons } =
    useQuery({
      queryKey: ['institution-appointment-person-search', personQuery.trim()],
      queryFn: () => searchPersons(personQuery.trim(), 20),
      enabled: isOpen && personQuery.trim().length > 0,
      staleTime: 30_000,
    })

  const { data: countryPersons = [] } = useQuery({
    queryKey: [
      'institution-appointment-country-persons',
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
    enabled:
      isOpen &&
      !isEditing &&
      Boolean(countryId || historicalCountryId) &&
      personQuery.trim().length === 0,
    staleTime: 60_000,
  })

  const { data: parties = [] } = useQuery({
    queryKey: [
      'institution-appointment-parties',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: () =>
      getPoliticalParties({
        ...(countryId ? { countryId } : {}),
        ...(historicalCountryId ? { historicalCountryId } : {}),
      }),
    enabled: isOpen && Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const personCandidates = useMemo(() => {
    if (personQuery.trim().length > 0) {
      return searchedPersons.map((personItem: PersonSearchItem) => ({
        id: personItem.id,
        label: getPersonDisplayName(personItem, {
          countryDefaultNameDisplayOrder,
        }),
        subLabel: personItem.originalName ?? null,
      }))
    }
    return countryPersons.slice(0, 15).map((personItem) => ({
      id: personItem.id,
      label: getPersonDisplayName(personItem, {
        countryDefaultNameDisplayOrder,
      }),
      subLabel:
        (personItem as { originalName?: string | null }).originalName ?? null,
    }))
  }, [
    personQuery,
    searchedPersons,
    countryPersons,
    countryDefaultNameDisplayOrder,
  ])

  const quickCreatePersonMutation = useMutation({
    mutationFn: async () => {
      const trimmedGiven = quickPersonGivenName.trim()
      if (!trimmedGiven) {
        throw new Error('인물의 이름(또는 단명)을 입력해주세요.')
      }
      const created = await createPerson({
        name: trimmedGiven,
        surname: quickPersonSurname.trim() || null,
        originalName: quickPersonOriginalName.trim() || undefined,
        ...(countryId ? { countryId } : {}),
        ...(historicalCountryId ? { historicalCountryId } : {}),
        ...(countryId || historicalCountryId
          ? {
              countryAffiliations: [
                {
                  affiliationType: 'CITIZENSHIP',
                  ...(countryId ? { countryId } : {}),
                  ...(historicalCountryId ? { historicalCountryId } : {}),
                  priority: 0,
                },
              ],
            }
          : {}),
      } as Parameters<typeof createPerson>[0])
      return created
    },
    onSuccess: (createdPerson) => {
      const displayLabel = getPersonDisplayName(createdPerson, {
        countryDefaultNameDisplayOrder,
      })
      setSelectedPersonId(createdPerson.id)
      setSelectedPersonLabel(displayLabel)
      setShowQuickCreatePerson(false)
      setPersonQuery('')
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const saveTenureMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPersonId) {
        throw new Error('임명할 인물을 선택해주세요.')
      }
      const trimmedTitle = roleTitle.trim()
      if (!trimmedTitle) {
        throw new Error('직책·보직명을 입력하거나 프리셋을 선택해주세요.')
      }
      const parsedStartYear = Number(startYear.trim())
      if (!startYear.trim() || !Number.isInteger(parsedStartYear) || parsedStartYear <= 0) {
        throw new Error('취임·부임 연도를 입력해주세요 (자연수 연도).')
      }

      const parsedStartMonth = startMonth.trim() ? Number(startMonth.trim()) : undefined
      const parsedStartDay = startDay.trim() ? Number(startDay.trim()) : undefined

      let endDateInfo:
        | { era: Era; year: number; month?: number; day?: number }
        | null
        | undefined = undefined
      if (endYear.trim()) {
        const parsedEndYear = Number(endYear.trim())
        if (!Number.isInteger(parsedEndYear) || parsedEndYear <= 0) {
          throw new Error('퇴임·이임 연도가 올바르지 않습니다.')
        }
        const parsedEndMonth = endMonth.trim() ? Number(endMonth.trim()) : undefined
        const parsedEndDay = endDay.trim() ? Number(endDay.trim()) : undefined
        endDateInfo = {
          era: endEra,
          year: parsedEndYear,
          ...(parsedEndMonth ? { month: parsedEndMonth } : {}),
          ...(parsedEndDay ? { day: parsedEndDay } : {}),
        }
      } else if (isEditing) {
        endDateInfo = null
      }

      const resolvedPositionType = inferPositionType({
        contextType,
        departmentKind: effectiveDepartmentKind,
        roleTitle: trimmedTitle,
        fallbackType: editingTenure?.positionType ?? null,
      })

      const parsedOrdinal = ordinalInput.trim() ? Number(ordinalInput.trim()) : null
      const effectiveDeptId =
        contextType === 'MILITARY_UNIT'
          ? null
          : selectedDeptId || departmentId || null
      const effectiveUnitId =
        contextType === 'MILITARY_UNIT' ? militaryUnitId ?? null : null
      const primaryCabinetId =
        selectedCabinetIds.length > 0 ? selectedCabinetIds[0] : null

      if (isEditing && editingTenure?.id) {
        const titleChanged =
          trimmedTitle !== (editingTenure.title ?? '').trim()
        return personCareerApi.updateGovernmentPositionTenure(editingTenure.id, {
          positionType: resolvedPositionType,
          ...(titleChanged ? { positionDefinitionId: undefined } : {}),
          title: trimmedTitle,
          rankTitle: rankTitle.trim() || null,
          partyId: partyId || null,
          ordinal: parsedOrdinal,
          administrationDepartmentId: effectiveDeptId,
          militaryUnitId: effectiveUnitId,
          cabinetId: primaryCabinetId,
          cabinetIds: selectedCabinetIds,
          startDateInfo: {
            era: startEra,
            year: parsedStartYear,
            ...(parsedStartMonth ? { month: parsedStartMonth } : {}),
            ...(parsedStartDay ? { day: parsedStartDay } : {}),
          },
          endDateInfo,
          notes: notes.trim() || null,
        })
      }

      const payload: CreateGovernmentPositionTenureDto = {
        personId: selectedPersonId,
        positionType: resolvedPositionType,
        title: trimmedTitle,
        ...(rankTitle.trim() ? { rankTitle: rankTitle.trim() } : {}),
        ...(partyId ? { partyId } : {}),
        ...(parsedOrdinal != null && Number.isFinite(parsedOrdinal)
          ? { ordinal: parsedOrdinal }
          : {}),
        ...(countryId ? { countryId } : {}),
        ...(historicalCountryId ? { historicalCountryId } : {}),
        ...(effectiveDeptId
          ? { administrationDepartmentId: effectiveDeptId }
          : {}),
        ...(effectiveUnitId ? { militaryUnitId: effectiveUnitId } : {}),
        ...(primaryCabinetId ? { cabinetId: primaryCabinetId } : {}),
        ...(selectedCabinetIds.length > 0
          ? { cabinetIds: selectedCabinetIds }
          : {}),
        startDateInfo: {
          era: startEra,
          year: parsedStartYear,
          ...(parsedStartMonth ? { month: parsedStartMonth } : {}),
          ...(parsedStartDay ? { day: parsedStartDay } : {}),
        },
        ...(endDateInfo ? { endDateInfo } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }

      return personCareerApi.addGovernmentPositionTenure(payload)
    },
    onSuccess: (savedTenure) => {
      invalidateTenureQueries(queryClient, {
        personId: selectedPersonId || editingTenure?.personId || null,
        cabinetId: cabinetId ?? null,
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
      })
      onSaved?.(savedTenure)
      onClose()
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  if (!isOpen) return null

  const contextHeaderBadge =
    contextType === 'MILITARY_UNIT'
      ? `군사 사령부·부대 · ${militaryUnitName ?? '부대'}`
      : contextType === 'CABINET'
        ? `행정부·내각 · ${cabinetName ?? '내각'}`
        : `중앙부처·기관 · ${effectiveDepartmentName ?? '기관'}`

  const modalHeading = isEditing
    ? '보직·임기 수정'
    : contextType === 'MILITARY_UNIT'
      ? '지휘관 · 참모 임명'
      : contextType === 'CABINET'
        ? '내각 각료 · 국무위원 임명'
        : '소속 수장 · 주요 인사 임명'

  const toggleCabinetSelection = (targetCabId: string) => {
    setSelectedCabinetIds((prev) =>
      prev.includes(targetCabId)
        ? prev.filter((idItem) => idItem !== targetCabId)
        : [...prev, targetCabId],
    )
  }

  return createPortal(
    <Backdrop onClick={onClose}>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-label={modalHeading}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <Header>
          <HeaderTitleGroup>
            <ContextBadge $variant={contextType}>
              {countryName ? `${countryName} · ` : ''}
              {contextHeaderBadge}
            </ContextBadge>
            <Title>{modalHeading}</Title>
          </HeaderTitleGroup>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            ✕
          </CloseButton>
        </Header>

        <Body>
          {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}

          {/* 1. 인물 선택 또는 즉시 생성 */}
          <FieldBlock>
            <FieldLabelRow>
              <FieldLabel>1. 인물 선택 *</FieldLabel>
              {!isEditing && (
                <InlineActionBtn
                  type="button"
                  onClick={() => {
                    setShowQuickCreatePerson((prev) => !prev)
                    if (!showQuickCreatePerson && personQuery.trim()) {
                      setQuickPersonGivenName(personQuery.trim())
                    }
                  }}
                >
                  {showQuickCreatePerson
                    ? '기존 인물 검색으로 전환'
                    : '+ 미등록 인물 바로 생성'}
                </InlineActionBtn>
              )}
            </FieldLabelRow>

            {selectedPersonId ? (
              <SelectedPersonCard>
                <div>
                  <SelectedPersonName>{selectedPersonLabel}</SelectedPersonName>
                  <SelectedPersonMeta>선택됨</SelectedPersonMeta>
                </div>
                {!isEditing && (
                  <ChangePersonBtn
                    type="button"
                    onClick={() => {
                      setSelectedPersonId('')
                      setSelectedPersonLabel('')
                    }}
                  >
                    변경
                  </ChangePersonBtn>
                )}
              </SelectedPersonCard>
            ) : showQuickCreatePerson ? (
              <QuickPersonBox>
                <QuickPersonHint>
                  아직 등록되지 않은 인물을 현재 국가 소속으로 즉시 생성하고 바로 임명합니다.
                </QuickPersonHint>
                <QuickPersonRow>
                  <Input
                    placeholder="성 (예: 폰 브라우히치, 이)"
                    value={quickPersonSurname}
                    onChange={(changeEvent) =>
                      setQuickPersonSurname(changeEvent.target.value)
                    }
                  />
                  <Input
                    placeholder="이름 * (예: 발터, 순신)"
                    value={quickPersonGivenName}
                    onChange={(changeEvent) =>
                      setQuickPersonGivenName(changeEvent.target.value)
                    }
                  />
                </QuickPersonRow>
                <QuickPersonRow>
                  <Input
                    placeholder="원어 표기 (선택, 예: Walther von Brauchitsch)"
                    value={quickPersonOriginalName}
                    onChange={(changeEvent) =>
                      setQuickPersonOriginalName(changeEvent.target.value)
                    }
                  />
                  <PrimaryButton
                    type="button"
                    disabled={quickCreatePersonMutation.isPending}
                    onClick={() => quickCreatePersonMutation.mutate()}
                  >
                    {quickCreatePersonMutation.isPending
                      ? '생성 중…'
                      : '생성 후 선택'}
                  </PrimaryButton>
                </QuickPersonRow>
              </QuickPersonBox>
            ) : (
              <div>
                <Input
                  placeholder="인물 이름 검색 (예: 구데리안, 롬멜, 히틀러, 정약용)…"
                  value={personQuery}
                  onChange={(changeEvent) =>
                    setPersonQuery(changeEvent.target.value)
                  }
                />
                <CandidateList>
                  {isSearchingPersons ? (
                    <EmptyHint>인물 검색 중…</EmptyHint>
                  ) : personCandidates.length === 0 ? (
                    <EmptyHint>
                      {personQuery.trim()
                        ? '일치하는 인물이 없습니다. 우측 상단 "+ 미등록 인물 바로 생성"을 눌러 즉시 만들 수 있습니다.'
                        : '검색어를 입력하거나 아래 국가 소속 인물을 클릭하세요.'}
                    </EmptyHint>
                  ) : (
                    personCandidates.map((candidate) => (
                      <CandidateItem
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonId(candidate.id)
                          setSelectedPersonLabel(candidate.label)
                        }}
                      >
                        <span>{candidate.label}</span>
                        {candidate.subLabel && (
                          <CandidateSub>{candidate.subLabel}</CandidateSub>
                        )}
                      </CandidateItem>
                    ))
                  )}
                </CandidateList>
              </div>
            )}
          </FieldBlock>

          {/* CABINET 컨텍스트일 때 담당 부처 선택 */}
          {contextType === 'CABINET' && availableDepartments.length > 0 && (
            <FieldBlock>
              <FieldLabel>담당 중앙부처 · 국가기관 (선택)</FieldLabel>
              <Select
                value={selectedDeptId}
                onChange={(changeEvent) => {
                  const nextDeptId = changeEvent.target.value
                  setSelectedDeptId(nextDeptId)
                  const matchedDept = availableDepartments.find(
                    (deptItem) => deptItem.id === nextDeptId,
                  )
                  if (matchedDept && !roleTitle.trim()) {
                    setRoleTitle(`${matchedDept.name} 장관`)
                  }
                }}
              >
                <option value="">— 무임소 / 부처 미지정 —</option>
                {availableDepartments.map((deptItem) => (
                  <option key={deptItem.id} value={deptItem.id}>
                    {deptItem.name}
                    {deptItem.abbreviation ? ` (${deptItem.abbreviation})` : ''}
                  </option>
                ))}
              </Select>
            </FieldBlock>
          )}

          {/* 2. 보직·직책명 + 프리셋 칩 */}
          <FieldBlock>
            <FieldLabel>2. 보직 · 직책명 *</FieldLabel>
            <ChipGroup>
              {rolePresets.map((presetLabel) => (
                <PresetChip
                  key={presetLabel}
                  type="button"
                  $active={roleTitle.trim() === presetLabel}
                  onClick={() => setRoleTitle(presetLabel)}
                >
                  {presetLabel}
                </PresetChip>
              ))}
            </ChipGroup>
            <TwoColRow>
              <Input
                placeholder={
                  contextType === 'MILITARY_UNIT'
                    ? '직접 입력 (예: 최고사령관, 참모총장, 제2기갑군 사령관)'
                    : '직접 입력 (예: 외무장관, 전쟁장관, 조선총독)'
                }
                value={roleTitle}
                onChange={(changeEvent) => setRoleTitle(changeEvent.target.value)}
              />
              <OrdinalWrap>
                <Input
                  type="number"
                  min={1}
                  placeholder="대수 (예: 1)"
                  value={ordinalInput}
                  onChange={(changeEvent) =>
                    setOrdinalInput(changeEvent.target.value)
                  }
                />
              </OrdinalWrap>
            </TwoColRow>
          </FieldBlock>

          {/* 3. 계급·칭호 & 정당 */}
          <TwoColGrid>
            <FieldBlock>
              <FieldLabel>
                {contextType === 'MILITARY_UNIT'
                  ? '3. 군 계급 · 칭호 (선택)'
                  : '3. 계급 · 품계 · 칭호 (선택)'}
              </FieldLabel>
              {contextType === 'MILITARY_UNIT' && (
                <ChipGroup>
                  {MILITARY_RANK_PRESETS.map((rankPreset) => (
                    <PresetChip
                      key={rankPreset}
                      type="button"
                      $active={rankTitle.trim() === rankPreset}
                      onClick={() =>
                        setRankTitle((prev) =>
                          prev === rankPreset ? '' : rankPreset,
                        )
                      }
                    >
                      {rankPreset}
                    </PresetChip>
                  ))}
                </ChipGroup>
              )}
              <Input
                placeholder={
                  contextType === 'MILITARY_UNIT'
                    ? '예: 원수, 상급대장, 육군 중장'
                    : '예: 정1품, 백작, 육군 대장(겸임)'
                }
                value={rankTitle}
                onChange={(changeEvent) =>
                  setRankTitle(changeEvent.target.value)
                }
              />
            </FieldBlock>

            <FieldBlock>
              <FieldLabel>소속 정당 · 파벌 (선택)</FieldLabel>
              <Select
                value={partyId}
                onChange={(changeEvent) => setPartyId(changeEvent.target.value)}
              >
                <option value="">— 정당 없음 / 무소속 —</option>
                {parties.map((partyItem) => (
                  <option key={partyItem.id} value={partyItem.id}>
                    {partyItem.name}
                    {partyItem.shortName ? ` (${partyItem.shortName})` : ''}
                  </option>
                ))}
              </Select>
            </FieldBlock>
          </TwoColGrid>

          {/* 4. 재임·보직 기간 (BC/AD 연·월·일) */}
          <TwoColGrid>
            <FieldBlock>
              <FieldLabel>4. 취임 · 부임 시점 *</FieldLabel>
              <DateRow>
                <EraSelect
                  value={startEra}
                  onChange={(changeEvent) =>
                    setStartEra(changeEvent.target.value as Era)
                  }
                >
                  <option value="AD">서기(AD)</option>
                  <option value="BC">기원전(BC)</option>
                </EraSelect>
                <DateNumInput
                  type="number"
                  min={1}
                  placeholder="연도 *"
                  value={startYear}
                  onChange={(changeEvent) =>
                    setStartYear(changeEvent.target.value)
                  }
                />
                <DateSmallInput
                  type="number"
                  min={1}
                  max={12}
                  placeholder="월"
                  value={startMonth}
                  onChange={(changeEvent) =>
                    setStartMonth(changeEvent.target.value)
                  }
                />
                <DateSmallInput
                  type="number"
                  min={1}
                  max={31}
                  placeholder="일"
                  value={startDay}
                  onChange={(changeEvent) =>
                    setStartDay(changeEvent.target.value)
                  }
                />
              </DateRow>
            </FieldBlock>

            <FieldBlock>
              <FieldLabel>퇴임 · 이임 시점 (비우면 재임 중/미상)</FieldLabel>
              <DateRow>
                <EraSelect
                  value={endEra}
                  onChange={(changeEvent) =>
                    setEndEra(changeEvent.target.value as Era)
                  }
                >
                  <option value="AD">서기(AD)</option>
                  <option value="BC">기원전(BC)</option>
                </EraSelect>
                <DateNumInput
                  type="number"
                  min={1}
                  placeholder="연도"
                  value={endYear}
                  onChange={(changeEvent) =>
                    setEndYear(changeEvent.target.value)
                  }
                />
                <DateSmallInput
                  type="number"
                  min={1}
                  max={12}
                  placeholder="월"
                  value={endMonth}
                  onChange={(changeEvent) =>
                    setEndMonth(changeEvent.target.value)
                  }
                />
                <DateSmallInput
                  type="number"
                  min={1}
                  max={31}
                  placeholder="일"
                  value={endDay}
                  onChange={(changeEvent) =>
                    setEndDay(changeEvent.target.value)
                  }
                />
              </DateRow>
            </FieldBlock>
          </TwoColGrid>

          {/* 부처 컨텍스트일 때 내각 연결 옵션 */}
          {contextType === 'DEPARTMENT' && availableCabinets.length > 0 && (
            <FieldBlock>
              <FieldLabel>함께 편입할 행정부 · 내각 (선택, 복수 가능)</FieldLabel>
              <ChipGroup>
                {availableCabinets.map((cabinetItem) => {
                  const headPerson = cabinetItem.headTenure?.person
                  const fallbackLabel = headPerson
                    ? `${getPersonDisplayName(headPerson)} 행정부`
                    : '내각'
                  const label = cabinetItem.name?.trim() || fallbackLabel
                  const checked = selectedCabinetIds.includes(cabinetItem.id)
                  return (
                    <PresetChip
                      key={cabinetItem.id}
                      type="button"
                      $active={checked}
                      onClick={() => toggleCabinetSelection(cabinetItem.id)}
                    >
                      {checked ? '✓ ' : '+ '}
                      {label}
                    </PresetChip>
                  )
                })}
              </ChipGroup>
            </FieldBlock>
          )}

          {/* 비고 */}
          <FieldBlock>
            <FieldLabel>비고 · 임명 배경 (선택)</FieldLabel>
            <Input
              placeholder="예: 블롬베르크-프리치 사건 직후 국방군 최고사령부 창설과 함께 취임"
              value={notes}
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            />
          </FieldBlock>
        </Body>

        <Footer>
          <SecondaryButton type="button" onClick={onClose}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={saveTenureMutation.isPending}
            onClick={() => saveTenureMutation.mutate()}
          >
            {saveTenureMutation.isPending
              ? '저장 중…'
              : isEditing
                ? '수정 저장'
                : '임명 등록'}
          </PrimaryButton>
        </Footer>
      </Dialog>
    </Backdrop>,
    document.body,
  )
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const Dialog = styled.div`
  width: 100%;
  max-width: 660px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  padding: 18px 22px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ContextBadge = styled.span<{
  $variant: InstitutionAppointmentContextType
}>`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ $variant }) =>
    $variant === 'MILITARY_UNIT'
      ? '#fef2f2'
      : $variant === 'CABINET'
        ? '#eff6ff'
        : '#f0fdf4'};
  color: ${({ $variant }) =>
    $variant === 'MILITARY_UNIT'
      ? '#b91c1c'
      : $variant === 'CABINET'
        ? '#1d4ed8'
        : '#15803d'};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'MILITARY_UNIT'
        ? '#fecaca'
        : $variant === 'CABINET'
          ? '#bfdbfe'
          : '#bbf7d0'};
`

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
`

const CloseButton = styled.button`
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  &:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
`

const Body = styled.div`
  padding: 18px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ErrorBanner = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const FieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
`

const InlineActionBtn = styled.button`
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
  &:hover {
    text-decoration: underline;
  }
`

const Input = styled.input`
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  background: #ffffff;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
`

const Select = styled.select`
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  background: #ffffff;
  box-sizing: border-box;
`

const SelectedPersonCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
`

const SelectedPersonName = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #1e3a8a;
`

const SelectedPersonMeta = styled.div`
  font-size: 11.5px;
  color: #3b82f6;
  margin-top: 2px;
`

const ChangePersonBtn = styled.button`
  border: 1px solid #93c5fd;
  background: #ffffff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 7px;
  cursor: pointer;
`

const QuickPersonBox = styled.div`
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const QuickPersonHint = styled.div`
  font-size: 12px;
  color: #475569;
`

const QuickPersonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const CandidateList = styled.div`
  margin-top: 6px;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
`

const CandidateItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #eff6ff;
    color: #1d4ed8;
  }
`

const CandidateSub = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
`

const EmptyHint = styled.div`
  padding: 12px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
`

const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PresetChip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#cbd5e1')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#f8fafc')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#334155')};
  &:hover {
    border-color: #2563eb;
    color: #1d4ed8;
  }
`

const TwoColRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 8px;
`

const OrdinalWrap = styled.div`
  display: flex;
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const DateRow = styled.div`
  display: grid;
  grid-template-columns: 88px 1fr 56px 56px;
  gap: 6px;
`

const EraSelect = styled(Select)`
  padding: 0 6px;
  font-size: 12px;
`

const DateNumInput = styled(Input)`
  padding: 0 8px;
`

const DateSmallInput = styled(Input)`
  padding: 0 6px;
  text-align: center;
`

const Footer = styled.div`
  padding: 14px 22px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const SecondaryButton = styled.button`
  height: 38px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: #f1f5f9;
  }
`

const PrimaryButton = styled.button`
  height: 38px;
  padding: 0 18px;
  border-radius: 9px;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
