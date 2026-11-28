import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiColumns,
  FiPlus,
  FiSearch,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  administrationDepartmentApi,
  type AdministrationDepartment,
} from '@/shared/api/administration-department'
import {
  getPartyMemberships,
  getScopedPoliticalParties,
  type PartyMembershipRow,
  type PoliticalPartyRow,
} from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type MilitaryRankDto,
  militaryRankApi,
} from '@/shared/api/military-rank'
import {
  type CabinetListItemDto,
  type CreateGovernmentPositionTenureDto,
  type PickerPositionDefinition,
  personCareerApi,
} from '@/shared/api/person-career'
import {
  createPerson,
  type Era,
  getPersonsByHistoricalCountryUnion,
  getPersonsByTenureCountry,
  type PersonResponseDto,
  type PersonSearchItem,
  searchPersons,
} from '@/shared/api/persons'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  buildPartialDateString,
  isPartialRangeInverted,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
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
  LayoutModeToggleBtn,
  SectionJumpBtn,
  SectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import {
  PositionDefinitionField,
  type SelectedPositionDefinition,
} from './position-definition-field'
import {
  isGenericDefinition,
  type PositionDefinitionLike,
} from './position-definition-options'

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
  militaryRankId?: string | null
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
  countryIsoCode?: string | null
  countryDefaultNameDisplayOrder?: string | null
  departmentId?: string | null
  departmentName?: string | null
  departmentKind?: string | null
  militaryUnitId?: string | null
  militaryUnitName?: string | null
  militaryUnitType?: string | null
  cabinetId?: string | null
  cabinetName?: string | null
  /** 내각(CABINET) 컨텍스트에서 내각 존속 기간 원클릭 복사 지원 */
  cabinetStartDate?: string | null
  cabinetEndDate?: string | null
  /** 내각(CABINET) 컨텍스트에서 담당 부처를 선택할 수 있도록 넘기는 부처 목록 */
  availableDepartments?: AdministrationDepartment[]
  /** 부처(DEPARTMENT) 컨텍스트에서 함께 소속시킬 행정부·내각 목록 */
  availableCabinets?: CabinetListItemDto[]
  /** 기존 재임 수정 모드 */
  editingTenure?: EditableInstitutionTenure | null
}

type AppointmentSectionKey = 'personRole' | 'periodExtra'

const SURNAME_FIRST_NAME_PATTERN =
  /헝가리|마자르|오스트리아-헝가리|오스트리아·헝가리|한국|대한민국|조선|고려|고구려|백제|신라|발해|중국|중화|청|명|송|당|한|일본|베트남|몽골/

function inferDefaultAppointmentNameOrder(params: {
  countryDefaultNameDisplayOrder?: string | null
  countryIsoCode?: string | null
  countryName?: string | null
}): 'korean' | 'western' {
  const explicitOrder = (params.countryDefaultNameDisplayOrder ?? '').toUpperCase()
  if (explicitOrder === 'KOREAN' || explicitOrder === 'SURNAME_FIRST') {
    return 'korean'
  }
  if (explicitOrder === 'WESTERN' || explicitOrder === 'GIVEN_NAME_FIRST') {
    return 'western'
  }
  const isoUpper = (params.countryIsoCode ?? '').toUpperCase()
  if (['KR', 'KP', 'CN', 'TW', 'JP', 'VN', 'HU', 'MN'].includes(isoUpper)) {
    return 'korean'
  }
  if (SURNAME_FIRST_NAME_PATTERN.test(params.countryName ?? '')) {
    return 'korean'
  }
  return 'western'
}

function formatQuickNamePreview(params: {
  surname: string
  givenName: string
  nameDisplayOrder: 'korean' | 'western'
}): string {
  const cleanSurname = params.surname.trim()
  const cleanGiven = params.givenName.trim()
  if (!cleanSurname && !cleanGiven) return ''
  if (!cleanSurname) return cleanGiven
  if (!cleanGiven) return cleanSurname
  if (params.nameDisplayOrder === 'korean') {
    const hasAscii = /[A-Za-z]/.test(cleanSurname + cleanGiven)
    const isSpacedMultiSyllable =
      cleanSurname.length >= 2 || cleanGiven.length >= 3 || hasAscii
    return isSpacedMultiSyllable
      ? `${cleanSurname} ${cleanGiven}`
      : `${cleanSurname}${cleanGiven}`
  }
  return `${cleanGiven} ${cleanSurname}`
}

function parseIsoOrStructuredParts(params: {
  era?: string | null
  year?: number | null
  month?: number | null
  day?: number | null
  isoDate?: string | null
}): { era: Era; year: string; month: string; day: string } {
  if (params.year != null && Number.isFinite(params.year) && params.year > 0) {
    return {
      era: params.era === 'BC' ? 'BC' : 'AD',
      year: String(params.year),
      month: params.month != null ? String(params.month) : '',
      day: params.day != null ? String(params.day) : '',
    }
  }
  return parsePartialDateString(params.isoDate)
}

function formatDurationLabel(
  startParts: { era: Era; year: string; month: string; day: string },
  endParts: { era: Era; year: string; month: string; day: string },
): string | null {
  const startNum = Number(startParts.year.trim())
  if (!startParts.year.trim() || !Number.isFinite(startNum) || startNum <= 0) {
    return null
  }
  const signedStart = startParts.era === 'BC' ? -startNum : startNum
  if (!endParts.year.trim()) {
    return '재임 중 · 미상'
  }
  const endNum = Number(endParts.year.trim())
  if (!Number.isFinite(endNum) || endNum <= 0) return null
  const signedEnd = endParts.era === 'BC' ? -endNum : endNum
  const startMonth = Number(startParts.month) || 1
  const endMonth = Number(endParts.month) || startMonth
  const totalMonths = (signedEnd - signedStart) * 12 + (endMonth - startMonth)
  if (totalMonths < 0) return null
  if (totalMonths === 0) return '1개월 미만 (단기)'
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `약 ${years}년 ${months}개월`
  if (years > 0) return `약 ${years}년`
  return `약 ${months}개월`
}

function extractPersonBirthDeathYears(person: {
  birthYear?: number | null
  birthEra?: string | null
  birthDate?: string | null
  deathYear?: number | null
  deathEra?: string | null
  deathDate?: string | null
}): { birthSigned: number | null; deathSigned: number | null } {
  const birthSigned =
    person.birthYear != null
      ? person.birthEra === 'BC'
        ? -Math.abs(person.birthYear)
        : person.birthYear
      : signedYearFromIsoLike(person.birthDate)
  const deathSigned =
    person.deathYear != null
      ? person.deathEra === 'BC'
        ? -Math.abs(person.deathYear)
        : person.deathYear
      : signedYearFromIsoLike(person.deathDate)
  return { birthSigned, deathSigned }
}

function formatPersonLifespanBadge(person: {
  birthYear?: number | null
  birthEra?: string | null
  birthDate?: string | null
  deathYear?: number | null
  deathEra?: string | null
  deathDate?: string | null
}): string | null {
  const { birthSigned, deathSigned } = extractPersonBirthDeathYears(person)
  if (birthSigned == null && deathSigned == null) return null
  const leftLabel =
    birthSigned == null
      ? '?'
      : birthSigned < 0
        ? `BC ${Math.abs(birthSigned)}`
        : String(birthSigned)
  const rightLabel =
    deathSigned == null
      ? ''
      : deathSigned < 0
        ? `BC ${Math.abs(deathSigned)}`
        : String(deathSigned)
  return `${leftLabel}~${rightLabel}`
}

function isPersonActiveNearYear(
  person: PersonResponseDto,
  signedYear: number | null,
): boolean {
  if (signedYear == null) return true
  const { birthSigned, deathSigned } = extractPersonBirthDeathYears(person)
  if (birthSigned != null && signedYear < birthSigned + 10) return false
  if (deathSigned != null && signedYear > deathSigned + 1) return false
  if (birthSigned != null && deathSigned == null && signedYear > birthSigned + 105) {
    return false
  }
  return true
}

function buildLifespanMismatchMessage(
  person: PersonResponseDto | null,
  signedYear: number | null,
): string | null {
  if (!person || signedYear == null) return null
  const { birthSigned, deathSigned } = extractPersonBirthDeathYears(person)
  if (birthSigned != null && signedYear < birthSigned) {
    return `선택한 인물의 출생 연도(${birthSigned < 0 ? `BC ${Math.abs(birthSigned)}` : birthSigned}년)보다 취임 연도가 앞섭니다. 동명이인인지 확인해주세요.`
  }
  if (deathSigned != null && signedYear > deathSigned) {
    return `선택한 인물의 사망 연도(${deathSigned < 0 ? `BC ${Math.abs(deathSigned)}` : deathSigned}년) 이후의 취임 연도입니다.`
  }
  return null
}

function resolveBestPartyFromMemberships(
  memberships: PartyMembershipRow[],
  signedStartYear: number | null,
): { partyId: string; partyName: string } | null {
  const validRows = memberships.filter((membershipItem) =>
    Boolean(membershipItem.partyId ?? membershipItem.party?.id),
  )
  if (validRows.length === 0) return null

  if (signedStartYear != null) {
    const overlapping = validRows.find((membershipItem) => {
      const memStart = signedYearFromIsoLike(
        typeof membershipItem.startDate === 'string'
          ? membershipItem.startDate
          : null,
      )
      const memEnd = signedYearFromIsoLike(
        typeof membershipItem.endDate === 'string'
          ? membershipItem.endDate
          : null,
      )
      if (memStart != null && signedStartYear < memStart) return false
      if (memEnd != null && signedStartYear > memEnd) return false
      return true
    })
    if (overlapping) {
      const targetPartyId = overlapping.partyId ?? overlapping.party?.id ?? ''
      if (targetPartyId) {
        return {
          partyId: targetPartyId,
          partyName: overlapping.party?.name ?? '소속 정당',
        }
      }
    }
  }

  const fallback = validRows[0]
  const fallbackPartyId = fallback?.partyId ?? fallback?.party?.id ?? ''
  if (!fallbackPartyId) return null
  return {
    partyId: fallbackPartyId,
    partyName: fallback?.party?.name ?? '소속 정당',
  }
}

function formatPartyLabel(party: PoliticalPartyRow): string {
  const yearStart = signedYearFromIsoLike(party.foundedDate)
  const yearEnd = signedYearFromIsoLike(party.dissolvedDate)
  const shortPart =
    party.shortName && party.shortName !== party.name
      ? ` (${party.shortName})`
      : ''
  const rangePart =
    yearStart != null || yearEnd != null
      ? ` · ${yearStart ?? '?'}~${yearEnd ?? '현재'}`
      : ''
  return `${party.name}${shortPart}${rangePart}`
}

const APPOINTMENT_LAYOUT_STORAGE_KEY = 'papyrus:appointment-register-layout'
/** 검색어 없이 보여 줄 인물 후보 칩 수 — 나머지는 '+N명 더 보기' */
const PERSON_CANDIDATE_PREVIEW = 6

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

const VALID_POSITION_TYPES = new Set<
  CreateGovernmentPositionTenureDto['positionType']
>([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  'DEPUTY_HEAD_OF_STATE',
  'HEIR_APPARENT',
  'REGENT',
  'CABINET_MINISTER',
  'VICE_MINISTER',
  'LEGISLATOR',
  'JUDICIARY',
  'LOCAL_GOVERNMENT',
  'SPECIAL_POSITION',
  'DIPLOMATIC_POST',
  'MILITARY_COMMANDER',
  'ROYAL_NOBLE_TITLE',
  'OTHER',
])

function isSupportedPositionType(
  rawType?: string | null,
): rawType is CreateGovernmentPositionTenureDto['positionType'] {
  return Boolean(
    rawType &&
      VALID_POSITION_TYPES.has(
        rawType as CreateGovernmentPositionTenureDto['positionType'],
      ),
  )
}

function inferPositionType(params: {
  contextType: InstitutionAppointmentContextType
  departmentName?: string | null
  departmentKind?: string | null
  roleTitle: string
  definitionPositionType?: string | null
  fallbackType?: string | null
}): CreateGovernmentPositionTenureDto['positionType'] {
  const {
    contextType,
    departmentName,
    departmentKind,
    roleTitle,
    definitionPositionType,
    fallbackType,
  } = params
  if (isSupportedPositionType(definitionPositionType)) {
    return definitionPositionType
  }
  if (contextType === 'MILITARY_UNIT') {
    return 'MILITARY_COMMANDER'
  }
  const normalized = roleTitle.trim()
  const cleanDept = departmentName?.trim() ?? ''

  if (
    /대법원장|헌법재판소장|대법관|헌법재판관|재판관|법원장|판사|대심원장|평리원장/.test(
      normalized,
    ) ||
    (/대법원|헌법재판소|대심원|최고재판소|최고법원|고등법원|법원|재판소|평리원/.test(
      cleanDept,
    ) &&
      !/사무처장|사무총장|사무차장/.test(normalized))
  ) {
    return 'JUDICIARY'
  }

  if (
    /국회의장|국회부의장|상원의장|하원의장|중의원의장|참의원의장|원로원의장|원내대표|국회의원|상원의원|하원의원|참의원의원|중의원의원/.test(
      normalized,
    ) ||
    (/국회|의회|상원|하원|원로원|중의원|참의원|입법원|인민회의/.test(
      cleanDept,
    ) &&
      !/사무처|사무총장|사무차장|입법차장/.test(`${cleanDept} ${normalized}`))
  ) {
    return 'LEGISLATOR'
  }

  if (/대사|공사|총영사|영사|특명전권/.test(normalized)) {
    return 'DIPLOMATIC_POST'
  }

  if (/차관|참판|시랑|차장|부총독|정무총감|부위원장/.test(normalized)) {
    return 'VICE_MINISTER'
  }
  if (
    departmentKind === 'COLONIAL_GOVERNMENT' ||
    /총독|태수|관찰사|도지사/.test(normalized)
  ) {
    return 'LOCAL_GOVERNMENT'
  }
  if (
    departmentKind === 'ROYAL_HOUSEHOLD' ||
    departmentKind === 'OTHER' ||
    departmentKind === 'AGENCY' ||
    /비서실장|안보실장|도승지|궁내|청장|위원장|국장|원장|사무총장|사무처장|대사헌|대사간/.test(
      normalized,
    )
  ) {
    return contextType === 'CABINET' ? 'CABINET_MINISTER' : 'SPECIAL_POSITION'
  }
  if (isSupportedPositionType(fallbackType)) {
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
  countryIsoCode,
  countryDefaultNameDisplayOrder,
  departmentId,
  departmentName,
  departmentKind,
  militaryUnitId,
  militaryUnitName,
  cabinetId,
  cabinetName,
  cabinetStartDate,
  cabinetEndDate,
  availableDepartments = [],
  availableCabinets = [],
  editingTenure = null,
}) => {
  const queryClient = useQueryClient()
  const instanceId = useId()
  const positionFieldId = `inst-appt-position-${instanceId}`
  const isEditing = Boolean(editingTenure?.id)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const personRoleSectionRef = useRef<HTMLElement>(null)
  const periodExtraSectionRef = useRef<HTMLElement>(null)

  const startDateAnchorId = `inst-appt-start-${instanceId}`
  const endDateAnchorId = `inst-appt-end-${instanceId}`

  const [activeSection, setActiveSection] =
    useState<AppointmentSectionKey>('personRole')
  /* 사건 등록 모달과 같은 1단/2단 전환 — 왼쪽 인물·직책, 오른쪽 기간·정당·상세 */
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(() => {
    try {
      return window.localStorage.getItem(APPOINTMENT_LAYOUT_STORAGE_KEY) === 'single'
        ? 'single'
        : 'split'
    } catch {
      return 'split'
    }
  })
  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prevMode) => {
      const nextMode = prevMode === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(APPOINTMENT_LAYOUT_STORAGE_KEY, nextMode)
      } catch {
        // 저장소를 못 쓰면 이번 열람에서만 유지
      }
      return nextMode
    })
  }, [])
  const [activeDatePicker, setActiveDatePicker] = useState<
    'start' | 'end' | null
  >(null)

  const [personQuery, setPersonQuery] = useState('')
  /* 검색어 없이 뜨는 같은 나라 인물 후보는 몇 명만 — 아홉 줄이 직책 칸을 열 바닥으로 밀어냈다 */
  const [showAllPersonCandidates, setShowAllPersonCandidates] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedPersonLabel, setSelectedPersonLabel] = useState<string>('')
  const [showQuickCreatePerson, setShowQuickCreatePerson] = useState(false)
  const [quickPersonSurname, setQuickPersonSurname] = useState('')
  const [quickPersonGivenName, setQuickPersonGivenName] = useState('')
  const [quickPersonOriginalName, setQuickPersonOriginalName] = useState('')
  const [quickPersonNameOrder, setQuickPersonNameOrder] = useState<
    'korean' | 'western'
  >('korean')
  const quickOrderTouchedRef = useRef(false)

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departmentId ?? '',
  )
  const [selectedPositionDefinitionId, setSelectedPositionDefinitionId] =
    useState<string>('')
  const [roleTitle, setRoleTitle] = useState<string>('')
  /** 직책 칸에서 고른 DB 정의 — 방금 등록한 정의는 목록 재조회 전이라 여기서 들고 있는다 */
  const [selectedDefinitionMeta, setSelectedDefinitionMeta] =
    useState<SelectedPositionDefinition | null>(null)
  const [militaryRankId, setMilitaryRankId] = useState<string>('')
  const [rankTitle, setRankTitle] = useState<string>('')
  const [ordinalInput, setOrdinalInput] = useState<string>('')
  const [partyId, setPartyId] = useState<string>('')
  const [autoSuggestedPartyLabel, setAutoSuggestedPartyLabel] = useState<
    string | null
  >(null)
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
  const [batchSavedCount, setBatchSavedCount] = useState<number>(0)

  const userTouchedRoleRef = useRef(false)
  /** 사용자가 직책 칸을 직접 바꿨는가 — 수정 모드에서 안 건드린 직책(이름 덧쓰기 포함)은 그대로 둔다 */
  const positionTouchedRef = useRef(false)
  const userTouchedPartyRef = useRef(false)
  const continueAfterSaveRef = useRef(false)
  const lastBatchSavedTenureRef = useRef<unknown>(undefined)
  const initializedKeyRef = useRef<string | null>(null)

  const matchedCabinetFromList = useMemo(() => {
    if (!cabinetId) return null
    return (
      availableCabinets.find((cabItem) => cabItem.id === cabinetId) ?? null
    )
  }, [availableCabinets, cabinetId])

  const effectiveCabinetStartIso =
    cabinetStartDate ??
    matchedCabinetFromList?.startDate ??
    matchedCabinetFromList?.headTenure?.startDate ??
    null
  const effectiveCabinetEndIso =
    cabinetEndDate ??
    matchedCabinetFromList?.endDate ??
    matchedCabinetFromList?.headTenure?.endDate ??
    null

  const parsedCabinetStart = useMemo(
    () => parsePartialDateString(effectiveCabinetStartIso),
    [effectiveCabinetStartIso],
  )
  const parsedCabinetEnd = useMemo(
    () => parsePartialDateString(effectiveCabinetEndIso),
    [effectiveCabinetEndIso],
  )

  const applyCabinetPeriodToFields = useCallback(() => {
    if (!parsedCabinetStart.year) return
    setStartEra(parsedCabinetStart.era)
    setStartYear(parsedCabinetStart.year)
    setStartMonth(parsedCabinetStart.month)
    setStartDay(parsedCabinetStart.day)
    if (parsedCabinetEnd.year) {
      setEndEra(parsedCabinetEnd.era)
      setEndYear(parsedCabinetEnd.year)
      setEndMonth(parsedCabinetEnd.month)
      setEndDay(parsedCabinetEnd.day)
    } else {
      setEndEra('AD')
      setEndYear('')
      setEndMonth('')
      setEndDay('')
    }
  }, [parsedCabinetStart, parsedCabinetEnd])

  const resetCreateFormFields = useCallback(() => {
    userTouchedRoleRef.current = false
    positionTouchedRef.current = false
    setSelectedDefinitionMeta(null)
    userTouchedPartyRef.current = false
    quickOrderTouchedRef.current = false
    setErrorMessage(null)
    setActiveDatePicker(null)
    setActiveSection('personRole')
    setShowQuickCreatePerson(false)
    setQuickPersonSurname('')
    setQuickPersonGivenName('')
    setQuickPersonOriginalName('')
    setQuickPersonNameOrder(
      inferDefaultAppointmentNameOrder({
        countryDefaultNameDisplayOrder,
        countryIsoCode,
        countryName,
      }),
    )
    setPersonQuery('')
    setShowAllPersonCandidates(false)
    setSelectedPersonId('')
    setSelectedPersonLabel('')
    setSelectedDeptId(departmentId ?? '')
    setSelectedPositionDefinitionId('')
    setRoleTitle('')
    setMilitaryRankId('')
    setRankTitle('')
    setOrdinalInput('')
    setPartyId('')
    setAutoSuggestedPartyLabel(null)
    setSelectedCabinetIds(cabinetId ? [cabinetId] : [])

    if (contextType === 'CABINET' && parsedCabinetStart.year) {
      setStartEra(parsedCabinetStart.era)
      setStartYear(parsedCabinetStart.year)
      setStartMonth(parsedCabinetStart.month)
      setStartDay(parsedCabinetStart.day)
      if (parsedCabinetEnd.year) {
        setEndEra(parsedCabinetEnd.era)
        setEndYear(parsedCabinetEnd.year)
        setEndMonth(parsedCabinetEnd.month)
        setEndDay(parsedCabinetEnd.day)
      } else {
        setEndEra('AD')
        setEndYear('')
        setEndMonth('')
        setEndDay('')
      }
    } else {
      setStartEra('AD')
      setStartYear('')
      setStartMonth('')
      setStartDay('')
      setEndEra('AD')
      setEndYear('')
      setEndMonth('')
      setEndDay('')
    }
    setNotes('')
  }, [
    countryDefaultNameDisplayOrder,
    countryIsoCode,
    countryName,
    departmentId,
    cabinetId,
    contextType,
    parsedCabinetStart,
    parsedCabinetEnd,
  ])

  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null
      continueAfterSaveRef.current = false
      lastBatchSavedTenureRef.current = undefined
      setBatchSavedCount(0)
      setActiveDatePicker(null)
      return
    }

    const nextInitKey = `${editingTenure?.id ?? 'create'}:${contextType}:${cabinetId ?? ''}:${departmentId ?? ''}:${militaryUnitId ?? ''}`
    if (initializedKeyRef.current === nextInitKey) return
    initializedKeyRef.current = nextInitKey
    setBatchSavedCount(0)
    lastBatchSavedTenureRef.current = undefined
    continueAfterSaveRef.current = false

    if (editingTenure) {
      userTouchedRoleRef.current = true
      positionTouchedRef.current = false
      setSelectedDefinitionMeta(null)
      userTouchedPartyRef.current = true
      setErrorMessage(null)
      setShowQuickCreatePerson(false)
      setQuickPersonSurname('')
      setQuickPersonGivenName('')
      setQuickPersonOriginalName('')
      setPersonQuery('')
      setAutoSuggestedPartyLabel(null)

      setSelectedPersonId(editingTenure.personId ?? '')
      setSelectedPersonLabel(editingTenure.personName ?? '')
      setSelectedDeptId(
        editingTenure.administrationDepartmentId ?? departmentId ?? '',
      )
      setSelectedPositionDefinitionId(editingTenure.positionDefinitionId ?? '')
      setRoleTitle(editingTenure.title ?? '')
      setMilitaryRankId(editingTenure.militaryRankId ?? '')
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

      const parsedStart = parseIsoOrStructuredParts({
        era: editingTenure.startEra,
        year: editingTenure.startYear,
        month: editingTenure.startMonth,
        day: editingTenure.startDay,
        isoDate: editingTenure.startDate,
      })
      setStartEra(parsedStart.era)
      setStartYear(parsedStart.year)
      setStartMonth(parsedStart.month)
      setStartDay(parsedStart.day)

      const parsedEnd = parseIsoOrStructuredParts({
        era: editingTenure.endEra,
        year: editingTenure.endYear,
        month: editingTenure.endMonth,
        day: editingTenure.endDay,
        isoDate: editingTenure.endDate,
      })
      setEndEra(parsedEnd.era)
      setEndYear(parsedEnd.year)
      setEndMonth(parsedEnd.month)
      setEndDay(parsedEnd.day)

      setNotes(editingTenure.notes ?? '')
      return
    }

    resetCreateFormFields()
  }, [
    isOpen,
    editingTenure,
    contextType,
    cabinetId,
    departmentId,
    militaryUnitId,
    resetCreateFormFields,
  ])

  const activeDepartment = useMemo(() => {
    if (!selectedDeptId) return null
    return (
      availableDepartments.find((deptItem) => deptItem.id === selectedDeptId) ??
      null
    )
  }, [availableDepartments, selectedDeptId])

  const effectiveActiveDeptId =
    contextType === 'MILITARY_UNIT'
      ? ''
      : selectedDeptId || departmentId || ''
  const effectiveDepartmentName = activeDepartment?.name ?? departmentName
  const effectiveDepartmentKind = activeDepartment?.kind ?? departmentKind

  const { data: fetchedDepartmentDetail } = useQuery({
    queryKey: ['institution-appointment-dept-meta', effectiveActiveDeptId],
    queryFn: () => administrationDepartmentApi.getById(effectiveActiveDeptId),
    enabled:
      isOpen &&
      Boolean(effectiveActiveDeptId) &&
      !activeDepartment?.categoryId,
    staleTime: 120_000,
  })
  const effectiveDepartmentCategoryId =
    activeDepartment?.categoryId ?? fetchedDepartmentDetail?.categoryId ?? null

  const { data: allPositionDefinitions = [] } = useQuery<
    PickerPositionDefinition[]
  >({
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}),
    enabled: isOpen,
    staleTime: 60_000,
  })

  const definitionById = useMemo(
    () =>
      new Map(
        allPositionDefinitions.map((defItem) => [
          defItem.id,
          defItem as PositionDefinitionLike,
        ]),
      ),
    [allPositionDefinitions],
  )

  /** 지금 고른 DB 직책 — 일반 정의(자유 입력의 그릇)는 '고른 직책'이 아니다 */
  const selectedDefinition = useMemo<SelectedPositionDefinition | null>(() => {
    if (!selectedPositionDefinitionId) return null
    if (selectedDefinitionMeta?.id === selectedPositionDefinitionId) {
      return selectedDefinitionMeta
    }
    const found = definitionById.get(selectedPositionDefinitionId)
    if (!found || isGenericDefinition(found)) return null
    return {
      id: found.id,
      title: (found.title ?? '').trim(),
      positionType: found.positionType ?? null,
    }
  }, [definitionById, selectedDefinitionMeta, selectedPositionDefinitionId])

  /** 수정 중인 기록이 DB 직책 없이 이름으로만 저장된 경우(예전 자유 입력) 그 이름 */
  const legacyRoleTitle =
    isEditing &&
    allPositionDefinitions.length > 0 &&
    !selectedDefinition &&
    roleTitle.trim()
      ? roleTitle.trim()
      : null

  const signedStartYear = useMemo(() => {
    const trimmed = startYear.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    return startEra === 'BC' ? -parsed : parsed
  }, [startEra, startYear])

  const startDateParts = useMemo(
    () => ({ era: startEra, year: startYear, month: startMonth, day: startDay }),
    [startEra, startYear, startMonth, startDay],
  )
  const endDateParts = useMemo(
    () => ({ era: endEra, year: endYear, month: endMonth, day: endDay }),
    [endEra, endYear, endMonth, endDay],
  )

  const isDateInverted = useMemo(
    () => isPartialRangeInverted(startDateParts, endDateParts),
    [startDateParts, endDateParts],
  )

  const durationSummary = useMemo(
    () =>
      isDateInverted ? null : formatDurationLabel(startDateParts, endDateParts),
    [isDateInverted, startDateParts, endDateParts],
  )

  const { data: searchedPersons = [], isFetching: isSearchingPersons } =
    useQuery({
      queryKey: ['institution-appointment-person-search', personQuery.trim()],
      queryFn: () => searchPersons(personQuery.trim(), 20),
      enabled: isOpen && personQuery.trim().length > 0,
      staleTime: 30_000,
    })

  const { data: mergedCountryPersons = [] } = useQuery({
    queryKey: [
      'institution-appointment-country-persons',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: async () => {
      const queries: Array<Promise<PersonResponseDto[]>> = []
      if (historicalCountryId) {
        queries.push(getPersonsByHistoricalCountryUnion(historicalCountryId))
      }
      if (countryId) {
        queries.push(getPersonsByTenureCountry({ countryId }))
      }
      if (queries.length === 0) return []
      const batches = await Promise.all(queries)
      const deduped = new Map<string, PersonResponseDto>()
      for (const batchRows of batches) {
        for (const personRow of batchRows) {
          if (!deduped.has(personRow.id)) {
            deduped.set(personRow.id, personRow)
          }
        }
      }
      return Array.from(deduped.values())
    },
    enabled: isOpen && Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const { data: parties = [] } = useQuery({
    queryKey: [
      'institution-appointment-parties',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: () =>
      getScopedPoliticalParties({
        countryId,
        historicalCountryId,
      }),
    enabled: isOpen && Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const { data: militaryRanks = [] } = useQuery<MilitaryRankDto[]>({
    queryKey: [
      'military-ranks',
      countryId ?? '',
      historicalCountryId ?? '',
      'appointment-modal',
    ],
    queryFn: () =>
      militaryRankApi.list({
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        includeUniversal: true,
        limit: 200,
      }),
    enabled: isOpen && contextType === 'MILITARY_UNIT',
    staleTime: 120_000,
  })

  const { data: selectedPersonMemberships = [] } = useQuery({
    queryKey: ['institution-appointment-memberships', selectedPersonId],
    queryFn: () => getPartyMemberships(selectedPersonId),
    enabled: isOpen && !isEditing && Boolean(selectedPersonId),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!isOpen || isEditing || userTouchedPartyRef.current) return
    if (!selectedPersonId) {
      setPartyId('')
      setAutoSuggestedPartyLabel(null)
      return
    }
    const matched = resolveBestPartyFromMemberships(
      selectedPersonMemberships,
      signedStartYear,
    )
    if (matched) {
      setPartyId(matched.partyId)
      setAutoSuggestedPartyLabel(matched.partyName)
    } else {
      setPartyId('')
      setAutoSuggestedPartyLabel(null)
    }
  }, [
    isOpen,
    isEditing,
    selectedPersonId,
    selectedPersonMemberships,
    signedStartYear,
  ])

  const fallbackSelectedParty = useMemo<PoliticalPartyRow | null>(() => {
    if (!partyId) return null
    if (parties.some((partyItem) => partyItem.id === partyId)) return null
    const fromMem = selectedPersonMemberships.find(
      (memRow) => (memRow.partyId ?? memRow.party?.id) === partyId,
    )
    if (fromMem?.party) {
      return {
        id: partyId,
        name: fromMem.party.name,
        shortName: fromMem.party.shortName ?? null,
      }
    }
    return null
  }, [partyId, parties, selectedPersonMemberships])

  const personCandidates = useMemo(() => {
    if (personQuery.trim().length > 0) {
      return searchedPersons.map((personItem: PersonSearchItem) => {
        const matchedFull = mergedCountryPersons.find(
          (fullRow) => fullRow.id === personItem.id,
        )
        const lifespanTag = matchedFull
          ? formatPersonLifespanBadge(matchedFull)
          : null
        return {
          id: personItem.id,
          label: getPersonDisplayName(personItem, {
            countryDefaultNameDisplayOrder,
          }),
          subLabel: lifespanTag ?? personItem.originalName ?? null,
          isContemporary: matchedFull
            ? isPersonActiveNearYear(matchedFull, signedStartYear)
            : false,
        }
      })
    }

    const sortedPersons = [...mergedCountryPersons].sort(
      (leftPerson, rightPerson) => {
        const leftContemporary = isPersonActiveNearYear(
          leftPerson,
          signedStartYear,
        )
        const rightContemporary = isPersonActiveNearYear(
          rightPerson,
          signedStartYear,
        )
        if (leftContemporary !== rightContemporary) {
          return leftContemporary ? -1 : 1
        }
        return 0
      },
    )

    return sortedPersons.slice(0, 16).map((personItem) => ({
      id: personItem.id,
      label: getPersonDisplayName(personItem, {
        countryDefaultNameDisplayOrder,
      }),
      subLabel:
        formatPersonLifespanBadge(personItem) ??
        personItem.originalName ??
        null,
      isContemporary:
        signedStartYear != null &&
        isPersonActiveNearYear(personItem, signedStartYear),
    }))
  }, [
    personQuery,
    searchedPersons,
    mergedCountryPersons,
    countryDefaultNameDisplayOrder,
    signedStartYear,
  ])

  const isPersonCandidateListCapped =
    !personQuery.trim() && !showAllPersonCandidates
  const visiblePersonCandidates = isPersonCandidateListCapped
    ? personCandidates.slice(0, PERSON_CANDIDATE_PREVIEW)
    : personCandidates
  const hiddenPersonCandidateCount =
    personCandidates.length - visiblePersonCandidates.length

  const selectedPersonRecord = useMemo(() => {
    if (!selectedPersonId) return null
    return (
      mergedCountryPersons.find(
        (personRow) => personRow.id === selectedPersonId,
      ) ?? null
    )
  }, [selectedPersonId, mergedCountryPersons])

  const personLifespanWarning = useMemo(
    () => buildLifespanMismatchMessage(selectedPersonRecord, signedStartYear),
    [selectedPersonRecord, signedStartYear],
  )

  const quickPersonPreview = useMemo(
    () =>
      formatQuickNamePreview({
        surname: quickPersonSurname,
        givenName: quickPersonGivenName,
        nameDisplayOrder: quickPersonNameOrder,
      }),
    [quickPersonSurname, quickPersonGivenName, quickPersonNameOrder],
  )

  const jumpToSection = useCallback((targetSection: AppointmentSectionKey) => {
    setActiveSection(targetSection)
    const refMap: Record<
      AppointmentSectionKey,
      React.RefObject<HTMLElement | null>
    > = {
      personRole: personRoleSectionRef,
      periodExtra: periodExtraSectionRef,
    }
    refMap[targetSection].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  const missingFieldItems = useMemo(() => {
    const items: Array<{ label: string; section: AppointmentSectionKey }> = []
    if (!selectedPersonId) {
      items.push({ label: '임명 인물 선택', section: 'personRole' })
    }
    if (!roleTitle.trim()) {
      items.push({ label: '직책(DB)', section: 'personRole' })
    }
    if (!startYear.trim()) {
      items.push({ label: '취임·부임 연도', section: 'periodExtra' })
    } else if (isDateInverted) {
      items.push({ label: '퇴임일 역전 수정', section: 'periodExtra' })
    }
    return items
  }, [selectedPersonId, roleTitle, startYear, isDateInverted])

  const isFormDirty = useMemo(() => {
    if (isEditing && editingTenure) {
      const initStart = parseIsoOrStructuredParts({
        era: editingTenure.startEra,
        year: editingTenure.startYear,
        month: editingTenure.startMonth,
        day: editingTenure.startDay,
        isoDate: editingTenure.startDate,
      })
      const initEnd = parseIsoOrStructuredParts({
        era: editingTenure.endEra,
        year: editingTenure.endYear,
        month: editingTenure.endMonth,
        day: editingTenure.endDay,
        isoDate: editingTenure.endDate,
      })
      const initOrd =
        editingTenure.ordinal != null ? String(editingTenure.ordinal) : ''
      return (
        roleTitle !== (editingTenure.title ?? '') ||
        rankTitle !== (editingTenure.rankTitle ?? '') ||
        ordinalInput !== initOrd ||
        partyId !== (editingTenure.partyId ?? '') ||
        selectedDeptId !==
          (editingTenure.administrationDepartmentId ?? departmentId ?? '') ||
        notes !== (editingTenure.notes ?? '') ||
        startEra !== initStart.era ||
        startYear !== initStart.year ||
        startMonth !== initStart.month ||
        startDay !== initStart.day ||
        endEra !== initEnd.era ||
        endYear !== initEnd.year ||
        endMonth !== initEnd.month ||
        endDay !== initEnd.day
      )
    }

    return Boolean(
      selectedPersonId ||
        roleTitle.trim() ||
        rankTitle.trim() ||
        ordinalInput.trim() ||
        notes.trim() ||
        quickPersonGivenName.trim() ||
        quickPersonSurname.trim(),
    )
  }, [
    isEditing,
    editingTenure,
    departmentId,
    selectedPersonId,
    roleTitle,
    rankTitle,
    ordinalInput,
    partyId,
    selectedDeptId,
    notes,
    startEra,
    startYear,
    startMonth,
    startDay,
    endEra,
    endYear,
    endMonth,
    endDay,
    quickPersonGivenName,
    quickPersonSurname,
  ])

  const quickCreatePersonMutation = useMutation({
    mutationFn: async () => {
      const trimmedGiven = quickPersonGivenName.trim()
      if (!trimmedGiven) {
        throw new Error('인물의 이름(또는 단명)을 입력해주세요.')
      }
      const trimmedSurname = quickPersonSurname.trim()
      return createPerson({
        name: trimmedGiven,
        surname: trimmedSurname || null,
        originalName: quickPersonOriginalName.trim() || undefined,
        ...(trimmedSurname ? { nameDisplayOrder: quickPersonNameOrder } : {}),
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
    },
    onSuccess: (createdPerson) => {
      const displayLabel = getPersonDisplayName(createdPerson, {
        countryDefaultNameDisplayOrder,
      })
      setSelectedPersonId(createdPerson.id)
      setSelectedPersonLabel(displayLabel)
      setShowQuickCreatePerson(false)
      setPersonQuery('')
      setQuickPersonSurname('')
      setQuickPersonGivenName('')
      setQuickPersonOriginalName('')
      notify.success(`"${displayLabel}" 인물이 생성되어 임명 대상으로 선택되었습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['persons'] })
      void queryClient.invalidateQueries({
        queryKey: ['institution-appointment-country-persons'],
      })
    },
    onError: (mutationError) => {
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const refreshAppointmentQueries = useCallback(() => {
    invalidateTenureQueries(queryClient, {
      personId: selectedPersonId || editingTenure?.personId || null,
      cabinetId: cabinetId ?? null,
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
    })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinet-detail'] })
    void queryClient.invalidateQueries({ queryKey: ['administration-departments'] })
  }, [
    queryClient,
    selectedPersonId,
    editingTenure,
    cabinetId,
    countryId,
    historicalCountryId,
  ])

  const saveTenureMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPersonId) {
        throw new Error('임명할 인물을 선택해주세요.')
      }
      /* 직책은 DB 정의에서만 — 수정 모드에서 직책 칸을 안 건드렸으면 기존 직책(이름 덧쓰기 포함)을 그대로 둔다 */
      const keepExistingPosition = isEditing && !positionTouchedRef.current
      if (!keepExistingPosition && !selectedDefinition) {
        throw new Error(
          '직책을 DB에서 고르세요. 목록에 없으면 「DB에 등록」으로 먼저 등록하면 바로 골라집니다.',
        )
      }
      const trimmedTitle = keepExistingPosition
        ? roleTitle.trim()
        : (selectedDefinition?.title ?? '')
      const parsedStartYear = Number(startYear.trim())
      if (
        !startYear.trim() ||
        !Number.isInteger(parsedStartYear) ||
        parsedStartYear <= 0
      ) {
        throw new Error('취임·부임 연도를 자연수로 입력해주세요.')
      }
      if (isDateInverted) {
        throw new Error(
          '퇴임(이임) 시점이 취임(부임) 시점보다 앞설 수 없습니다.',
        )
      }

      const parsedStartMonth = startMonth.trim()
        ? Number(startMonth.trim())
        : undefined
      const parsedStartDay = startDay.trim()
        ? Number(startDay.trim())
        : undefined

      let endDateInfo:
        | { era: Era; year: number; month?: number; day?: number }
        | null
        | undefined = undefined
      if (endYear.trim()) {
        const parsedEndYear = Number(endYear.trim())
        if (!Number.isInteger(parsedEndYear) || parsedEndYear <= 0) {
          throw new Error('퇴임·이임 연도가 올바르지 않습니다.')
        }
        const parsedEndMonth = endMonth.trim()
          ? Number(endMonth.trim())
          : undefined
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

      const matchedDefinition = keepExistingPosition ? null : selectedDefinition

      const resolvedPositionType = inferPositionType({
        contextType,
        departmentName: effectiveDepartmentName,
        departmentKind: effectiveDepartmentKind,
        roleTitle: trimmedTitle,
        definitionPositionType: matchedDefinition?.positionType ?? null,
        fallbackType: editingTenure?.positionType ?? null,
      })

      const parsedOrdinal = ordinalInput.trim()
        ? Number(ordinalInput.trim())
        : null
      const effectiveDeptId =
        contextType === 'MILITARY_UNIT'
          ? null
          : selectedDeptId || departmentId || null
      const effectiveUnitId =
        contextType === 'MILITARY_UNIT' ? (militaryUnitId ?? null) : null
      const primaryCabinetId =
        selectedCabinetIds.length > 0 ? selectedCabinetIds[0] : null

      let resolvedRankId = militaryRankId.trim() || null
      if (
        contextType === 'MILITARY_UNIT' &&
        !resolvedRankId &&
        rankTitle.trim()
      ) {
        const exactMatch = militaryRanks.find(
          (rk) =>
            rk.name === rankTitle.trim() || rk.nameLocal === rankTitle.trim(),
        )
        if (exactMatch) {
          resolvedRankId = exactMatch.id
        } else {
          try {
            const createdRank = await militaryRankApi.createOrResolve({
              name: rankTitle.trim(),
              countryId: historicalCountryId ? null : (countryId ?? null),
              historicalCountryId: historicalCountryId ?? null,
              isUniversal: !countryId && !historicalCountryId,
            })
            resolvedRankId = createdRank.id
          } catch {
            // 계급 자동 승격 실패 시 문자열 캐시로 저장
          }
        }
      }

      if (isEditing && editingTenure?.id) {
        return personCareerApi.updateGovernmentPositionTenure(editingTenure.id, {
          ...(matchedDefinition
            ? {
                positionType: resolvedPositionType,
                positionDefinitionId: matchedDefinition.id,
                title: matchedDefinition.title,
              }
            : {}),
          ...(contextType === 'MILITARY_UNIT'
            ? { militaryRankId: resolvedRankId }
            : {}),
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
        ...(matchedDefinition
          ? { positionDefinitionId: matchedDefinition.id }
          : {}),
        ...(contextType === 'MILITARY_UNIT' && resolvedRankId
          ? { militaryRankId: resolvedRankId }
          : {}),
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
      const shouldContinue = !isEditing && continueAfterSaveRef.current
      continueAfterSaveRef.current = false
      refreshAppointmentQueries()

      if (shouldContinue) {
        lastBatchSavedTenureRef.current = savedTenure
        setBatchSavedCount((prevCount) => prevCount + 1)

        userTouchedRoleRef.current = false
        userTouchedPartyRef.current = false
        setSelectedPersonId('')
        setSelectedPersonLabel('')
        setPersonQuery('')
        setShowQuickCreatePerson(false)
        if (contextType === 'CABINET') {
          setSelectedDeptId('')
          setSelectedPositionDefinitionId('')
          setSelectedDefinitionMeta(null)
          setRoleTitle('')
          positionTouchedRef.current = false
        }
        setRankTitle('')
        setOrdinalInput((prevOrd) => {
          const parsedOrd = Number(prevOrd.trim())
          return contextType !== 'CABINET' &&
            Number.isInteger(parsedOrd) &&
            parsedOrd > 0
            ? String(parsedOrd + 1)
            : ''
        })
        setPartyId('')
        setAutoSuggestedPartyLabel(null)
        setNotes('')
        setErrorMessage(null)

        jumpToSection('personRole')
        notify.success(
          '임명 등록 완료! 재임 기간을 유지한 채 다음 인사를 이어서 추가할 수 있습니다.',
        )
        return
      }

      notify.success(
        isEditing ? '보직 · 임기 정보가 수정되었습니다.' : '인사 임명이 등록되었습니다.',
      )
      onSaved?.(savedTenure)
      onClose()
    },
    onError: (mutationError) => {
      continueAfterSaveRef.current = false
      setErrorMessage(getApiErrorMessage(mutationError))
    },
  })

  const handleSubmitWithOption = useCallback(
    (continueAfterSave: boolean) => {
      if (saveTenureMutation.isPending) return
      if (missingFieldItems.length > 0) {
        jumpToSection(missingFieldItems[0].section)
      }
      continueAfterSaveRef.current = !isEditing && continueAfterSave
      saveTenureMutation.mutate()
    },
    [saveTenureMutation, missingFieldItems, jumpToSection, isEditing],
  )

  useModalSubmitShortcut({
    enabled: isOpen && !saveTenureMutation.isPending,
    scrollContainerRef,
    onSubmit: ({ continueAfterSave }) =>
      handleSubmitWithOption(!isEditing && continueAfterSave),
  })

  const requestClose = useCallback(async () => {
    if (saveTenureMutation.isPending) return
    if (isFormDirty) {
      const confirmedClose = await confirm({
        title: '작성 중인 내용 닫기',
        message: '입력 중인 임명 내용이 저장되지 않습니다. 창을 닫으시겠습니까?',
        confirmLabel: '닫기',
        cancelLabel: '계속 작성',
        danger: true,
      })
      if (!confirmedClose) return
    }
    if (lastBatchSavedTenureRef.current !== undefined) {
      onSaved?.(lastBatchSavedTenureRef.current)
    }
    onClose()
  }, [saveTenureMutation.isPending, isFormDirty, onSaved, onClose])

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
    target: 'start' | 'end',
    isoDate: string,
    precision: DatePickerPrecision,
  ) => {
    const parsed = parsePartialDateString(isoDate)
    const nextMonth = precision === 'year' ? '' : parsed.month
    const nextDay = precision === 'day' ? parsed.day : ''
    if (target === 'start') {
      setStartEra(parsed.era)
      setStartYear(parsed.year)
      setStartMonth(nextMonth)
      setStartDay(nextDay)
    } else {
      setEndEra(parsed.era)
      setEndYear(parsed.year)
      setEndMonth(nextMonth)
      setEndDay(nextDay)
    }
    setActiveDatePicker(null)
  }

  const toggleCabinetSelection = (targetCabId: string) => {
    setSelectedCabinetIds((prevIds) =>
      prevIds.includes(targetCabId)
        ? prevIds.filter((idItem) => idItem !== targetCabId)
        : [...prevIds, targetCabId],
    )
  }

  const contextHeaderBadge =
    contextType === 'MILITARY_UNIT'
      ? `군사부대 · ${militaryUnitName ?? '부대'}`
      : contextType === 'CABINET'
        ? `내각 · ${cabinetName ?? '행정부'}`
        : `부처·기관 · ${effectiveDepartmentName ?? '기관'}`

  const modalHeading = isEditing
    ? '보직 · 임기 수정'
    : contextType === 'MILITARY_UNIT'
      ? '지휘관 · 참모 임명'
      : contextType === 'CABINET'
        ? '내각 각료 · 국무위원 임명'
        : '소속 수장 · 주요 인사 임명'

  const activePickerParts =
    activeDatePicker === 'start' ? startDateParts : endDateParts
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

  const cabinetPeriodPreviewLabel = useMemo(() => {
    if (!parsedCabinetStart.year) return null
    const startText = `${parsedCabinetStart.era === 'BC' ? 'BC ' : ''}${parsedCabinetStart.year}${parsedCabinetStart.month ? `.${parsedCabinetStart.month}` : ''}${parsedCabinetStart.day ? `.${parsedCabinetStart.day}` : ''}`
    const endText = parsedCabinetEnd.year
      ? `${parsedCabinetEnd.era === 'BC' ? 'BC ' : ''}${parsedCabinetEnd.year}${parsedCabinetEnd.month ? `.${parsedCabinetEnd.month}` : ''}${parsedCabinetEnd.day ? `.${parsedCabinetEnd.day}` : ''}`
      : '현직'
    return `${startText} ~ ${endText}`
  }, [parsedCabinetStart, parsedCabinetEnd])

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      title={modalHeading}
      maxWidth={layoutMode === 'split' ? 'min(1240px, 96vw)' : 'min(860px, 96vw)'}
      minHeight="520px"
      fullBleedOnMobile
      closeOnOverlayClick={false}
      headerActions={
        <HeaderActionsBar>
          <ContextScopeBadge $variant={contextType}>
            {countryName ? `${countryName} · ` : ''}
            {contextHeaderBadge}
          </ContextScopeBadge>
          <SectionJumpNav aria-label="폼 섹션 이동">
            <SectionJumpBtn
              type="button"
              $active={activeSection === 'personRole'}
              onClick={() => jumpToSection('personRole')}
            >
              {contextType === 'MILITARY_UNIT' ? '인물·보직' : '인물·직책'}
            </SectionJumpBtn>
            <SectionJumpBtn
              type="button"
              $active={activeSection === 'periodExtra'}
              onClick={() => jumpToSection('periodExtra')}
            >
              기간·정당·상세
            </SectionJumpBtn>
          </SectionJumpNav>
          <LayoutModeToggleBtn
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
            <FiColumns size={13} aria-hidden />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </LayoutModeToggleBtn>
          {!isEditing ? (
            <HeaderResetBtn
              type="button"
              onClick={() => {
                void handleResetClick()
              }}
            >
              초기화
            </HeaderResetBtn>
          ) : null}
        </HeaderActionsBar>
      }
    >
      <PersonRegisterModalFormScroll ref={scrollContainerRef}>
        {errorMessage ? (
          <AlertBox
            variant="danger"
            icon={<FiAlertCircle />}
            style={{ marginBottom: 16 }}
          >
            {errorMessage}
          </AlertBox>
        ) : null}

        {/* 사건 등록 모달처럼 머리 안내 띠 없이 — 기관·부대는 머리의 범위 배지가 말한다. 연속 임명 진행만 남긴다 */}
        {batchSavedCount > 0 ? (
          <BatchProgressRow>
            <BatchProgressPill>
              연속 임명 · {batchSavedCount}명 완료
            </BatchProgressPill>
          </BatchProgressRow>
        ) : null}

        <LabeledRowsWrap>
          <AppointmentColumns $split={layoutMode === 'split'}>
          {/* ═══════════════ STEP 1: 인물 · 담당 부처 · 보직명 ═══════════════ */}
          <FormGroup ref={personRoleSectionRef}>
            <FormGroupTitle>
              임명 인물 · {contextType === 'MILITARY_UNIT' ? '보직' : '직책'}
            </FormGroupTitle>

            <FieldRow>
              <FieldLabel>
                임명 인물 <Required>*</Required>
              </FieldLabel>
              <FieldControl>
                {selectedPersonId ? (
                  <SelectedPersonBox>
                    <div className="person-summary">
                      <PersonInitialAvatar>
                        {selectedPersonLabel.slice(0, 1) || '인'}
                      </PersonInitialAvatar>
                      <div>
                        <div className="person-name">{selectedPersonLabel}</div>
                        <div className="person-sub">
                          {selectedPersonRecord
                            ? (formatPersonLifespanBadge(selectedPersonRecord) ??
                              '임명 대상으로 선택됨')
                            : '임명 대상으로 선택됨'}
                        </div>
                      </div>
                    </div>
                    {!isEditing ? (
                      <SmallGhostBtn
                        type="button"
                        onClick={() => {
                          setSelectedPersonId('')
                          setSelectedPersonLabel('')
                        }}
                      >
                        인물 변경
                      </SmallGhostBtn>
                    ) : null}
                  </SelectedPersonBox>
                ) : showQuickCreatePerson ? (
                  <QuickPersonCard>
                    <QuickCardTopBar>
                      <strong>새 인물 즉석 등록 후 선택</strong>
                      <InlineClearLink
                        type="button"
                        onClick={() => setShowQuickCreatePerson(false)}
                      >
                        기존 인물 검색으로 돌아가기
                      </InlineClearLink>
                    </QuickCardTopBar>

                    <NameOrderBar>
                      <span className="order-label">이름 표기 순서</span>
                      <NameOrderSegment>
                        <NameOrderBtn
                          type="button"
                          $active={quickPersonNameOrder === 'korean'}
                          onClick={() => {
                            quickOrderTouchedRef.current = true
                            setQuickPersonNameOrder('korean')
                          }}
                        >
                          성 + 이름 (한국·헝가리·동아시아식)
                        </NameOrderBtn>
                        <NameOrderBtn
                          type="button"
                          $active={quickPersonNameOrder === 'western'}
                          onClick={() => {
                            quickOrderTouchedRef.current = true
                            setQuickPersonNameOrder('western')
                          }}
                        >
                          이름 + 성 (서양식)
                        </NameOrderBtn>
                      </NameOrderSegment>
                    </NameOrderBar>

                    <SubFieldPair $cols={2}>
                      <SubField>
                        <SubFieldLabel>
                          성 (Surname) <OptionalTag>(단명이면 비움)</OptionalTag>
                        </SubFieldLabel>
                        <Input
                          value={quickPersonSurname}
                          onChange={(changeEvent) =>
                            setQuickPersonSurname(changeEvent.target.value)
                          }
                          placeholder={
                            quickPersonNameOrder === 'korean'
                              ? '예: 티사 / 안드라시 / 이'
                              : '예: 폰 브라우히치 / 롬멜'
                          }
                        />
                      </SubField>
                      <SubField>
                        <SubFieldLabel>
                          이름 (Given Name) <Required>*</Required>
                        </SubFieldLabel>
                        <Input
                          value={quickPersonGivenName}
                          onChange={(changeEvent) =>
                            setQuickPersonGivenName(changeEvent.target.value)
                          }
                          placeholder={
                            quickPersonNameOrder === 'korean'
                              ? '예: 이슈트반 / 줄러 / 순신'
                              : '예: 발터 / 에르빈'
                          }
                        />
                      </SubField>
                    </SubFieldPair>

                    <QuickBottomRow>
                      <Input
                        value={quickPersonOriginalName}
                        onChange={(changeEvent) =>
                          setQuickPersonOriginalName(changeEvent.target.value)
                        }
                        placeholder="원어·한자 표기 (선택 — 예: Andrássy Gyula)"
                      />
                      <QuickCreateBtn
                        type="button"
                        disabled={quickCreatePersonMutation.isPending}
                        onClick={() => quickCreatePersonMutation.mutate()}
                      >
                        {quickCreatePersonMutation.isPending
                          ? '생성 중...'
                          : '생성 후 선택'}
                      </QuickCreateBtn>
                    </QuickBottomRow>

                    {quickPersonPreview ? (
                      <QuickPreviewLine>
                        표시될 이름: <strong>{quickPersonPreview}</strong>
                      </QuickPreviewLine>
                    ) : null}
                  </QuickPersonCard>
                ) : (
                  <>
                    <PersonSearchBarRow>
                      <SearchInputWrap style={{ flex: 1 }}>
                        <FiSearch size={14} />
                        <SearchInput
                          type="text"
                          value={personQuery}
                          onChange={(changeEvent) =>
                            setPersonQuery(changeEvent.target.value)
                          }
                          placeholder="인물 이름 검색 (성·이름·원어명)..."
                        />
                      </SearchInputWrap>
                      {!isEditing ? (
                        <SmallGhostBtn
                          type="button"
                          onClick={() => {
                            if (personQuery.trim() && !quickPersonGivenName.trim()) {
                              setQuickPersonGivenName(personQuery.trim())
                            }
                            setShowQuickCreatePerson(true)
                          }}
                        >
                          <FiPlus size={12} />새 인물 즉석 등록
                        </SmallGhostBtn>
                      ) : null}
                    </PersonSearchBarRow>

                    <PersonChipWrap>
                      {isSearchingPersons ? (
                        <EmptyHintBox>인물 검색 중...</EmptyHintBox>
                      ) : personCandidates.length === 0 ? (
                        <EmptyHintBox>
                          {personQuery.trim()
                            ? '일치하는 인물이 없습니다. 우측 [새 인물 즉석 등록] 버튼으로 바로 추가할 수 있습니다.'
                            : '검색어를 입력하거나 [새 인물 즉석 등록]을 눌러 인물을 추가해주세요.'}
                        </EmptyHintBox>
                      ) : (
                        visiblePersonCandidates.map((candidateItem) => (
                          <PersonCandidateBtn
                            key={candidateItem.id}
                            type="button"
                            $contemporary={candidateItem.isContemporary}
                            onClick={() => {
                              setSelectedPersonId(candidateItem.id)
                              setSelectedPersonLabel(candidateItem.label)
                            }}
                          >
                            <span>{candidateItem.label}</span>
                            {candidateItem.subLabel ? (
                              <span className="sub">({candidateItem.subLabel})</span>
                            ) : null}
                          </PersonCandidateBtn>
                        ))
                      )}
                      {hiddenPersonCandidateCount > 0 ? (
                        <MoreCandidatesBtn
                          type="button"
                          onClick={() => setShowAllPersonCandidates(true)}
                        >
                          +{hiddenPersonCandidateCount}명 더 보기
                        </MoreCandidatesBtn>
                      ) : null}
                    </PersonChipWrap>
                  </>
                )}

                {personLifespanWarning ? (
                  <AlertBox variant="warning" icon={<FiAlertCircle />}>
                    {personLifespanWarning}
                  </AlertBox>
                ) : null}
              </FieldControl>
            </FieldRow>

            {contextType === 'CABINET' && availableDepartments.length > 0 ? (
              <FieldRow>
                <FieldLabel>
                  담당 부처 · 기관 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <NativeSelect
                    value={selectedDeptId}
                    onChange={(changeEvent) => {
                      const nextDeptId = changeEvent.target.value
                      setSelectedDeptId(nextDeptId)
                      /* 부처를 바꾸면 그 부처의 DB 직책(첫 번째)을 고른다 — 이름을 지어내 채우지 않는다 */
                      setSelectedPositionDefinitionId('')
                      setSelectedDefinitionMeta(null)
                      setRoleTitle('')
                      positionTouchedRef.current = true
                      if (!userTouchedRoleRef.current) {
                        const deptScopedDef = allPositionDefinitions.find(
                          (defItem) =>
                            defItem.administrationDepartmentId === nextDeptId &&
                            !defItem.isMonarchical &&
                            !isGenericDefinition(defItem as PositionDefinitionLike) &&
                            defItem.title?.trim(),
                        )
                        if (deptScopedDef) {
                          setSelectedPositionDefinitionId(deptScopedDef.id)
                          setRoleTitle(deptScopedDef.title?.trim() ?? '')
                        }
                      }
                    }}
                  >
                    <option value="">무임소 / 부처 미지정</option>
                    {availableDepartments.map((deptItem) => {
                      const estYr = deptItem.established?.year ?? null
                      const abolYr = deptItem.abolished?.year ?? null
                      const deptYears =
                        estYr != null || abolYr != null
                          ? ` · ${estYr ?? '?'}~${abolYr ?? '현존'}`
                          : ''
                      return (
                        <option key={deptItem.id} value={deptItem.id}>
                          {deptItem.name}
                          {deptItem.abbreviation
                            ? ` (${deptItem.abbreviation})`
                            : ''}
                          {deptYears}
                        </option>
                      )
                    })}
                  </NativeSelect>
                </FieldControl>
              </FieldRow>
            ) : null}

            <FieldRow>
              <FieldLabel htmlFor={positionFieldId}>
                {contextType === 'MILITARY_UNIT' ? '보직' : '직책'} <Required>*</Required>
              </FieldLabel>
              <FieldControl>
                <PositionDefinitionField
                  id={positionFieldId}
                  contextType={contextType}
                  departmentId={effectiveActiveDeptId || null}
                  departmentCategoryId={effectiveDepartmentCategoryId}
                  departmentName={effectiveDepartmentName}
                  militaryUnitId={militaryUnitId}
                  militaryUnitName={militaryUnitName}
                  countryId={countryId}
                  historicalCountryId={historicalCountryId}
                  value={selectedDefinition?.id ?? ''}
                  legacyTitle={legacyRoleTitle}
                  inferPositionType={(title) =>
                    inferPositionType({
                      contextType,
                      departmentName: effectiveDepartmentName,
                      departmentKind: effectiveDepartmentKind,
                      roleTitle: title,
                    })
                  }
                  onSelect={(definition) => {
                    userTouchedRoleRef.current = true
                    positionTouchedRef.current = true
                    setSelectedDefinitionMeta(definition)
                    setSelectedPositionDefinitionId(definition?.id ?? '')
                    setRoleTitle(definition?.title ?? '')
                  }}
                />
                <OrdinalLine>
                  <OrdinalLabel>대수</OrdinalLabel>
                  <AdornedNumberBox>
                    <span className="prefix">제</span>
                    <input
                      type="number"
                      min={1}
                      value={ordinalInput}
                      onChange={(changeEvent) =>
                        setOrdinalInput(changeEvent.target.value)
                      }
                      placeholder="대수"
                    />
                    <span className="suffix">대</span>
                  </AdornedNumberBox>
                  <OrdinalHint>그 직책의 몇 대째인지 (선택)</OrdinalHint>
                </OrdinalLine>
              </FieldControl>
            </FieldRow>
          </FormGroup>

          {/* ═══════════════ STEP 2: 재임 기간 · 소속 정당 · 상세 ═══════════════ */}
          <FormGroup ref={periodExtraSectionRef}>
            <FormGroupTitle>재임 기간 · 소속 정당 · 상세</FormGroupTitle>

            <FieldRow>
              <FieldLabel>
                재임 기간 <Required>*</Required>
              </FieldLabel>
              <FieldControl>
                {contextType === 'CABINET' && cabinetPeriodPreviewLabel ? (
                  <CabinetPeriodHelperBar>
                    <div className="bar-label">
                      <FiCalendar size={13} />
                      <span>
                        소속 내각 기간:{' '}
                        <strong>{cabinetPeriodPreviewLabel}</strong>
                      </span>
                    </div>
                    <QuickFillBtn
                      type="button"
                      onClick={applyCabinetPeriodToFields}
                    >
                      내각 존속 기간으로 채우기
                    </QuickFillBtn>
                  </CabinetPeriodHelperBar>
                ) : null}

                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldLabel>
                      취임 · 부임일 <Required>*</Required>
                    </SubFieldLabel>
                    <InlineDateField
                      appearance="field"
                      anchorId={startDateAnchorId}
                      pickerOpen={activeDatePicker === 'start'}
                      era={startEra}
                      year={startYear}
                      month={startMonth}
                      day={startDay}
                      onEra={setStartEra}
                      onYear={setStartYear}
                      onMonth={setStartMonth}
                      onDay={setStartDay}
                      onOpenPicker={() => setActiveDatePicker('start')}
                      ariaLabel="취임 및 부임일"
                    />
                  </SubField>

                  <SubField>
                    <SubFieldHeaderRow>
                      <SubFieldLabel>
                        퇴임 · 이임일 <OptionalTag>(선택)</OptionalTag>
                      </SubFieldLabel>
                      {endYear || endMonth || endDay ? (
                        <InlineClearLink
                          type="button"
                          onClick={() => {
                            setEndEra('AD')
                            setEndYear('')
                            setEndMonth('')
                            setEndDay('')
                          }}
                        >
                          재임 중·미상으로 비우기
                        </InlineClearLink>
                      ) : null}
                    </SubFieldHeaderRow>
                    <InlineDateField
                      appearance="field"
                      anchorId={endDateAnchorId}
                      pickerOpen={activeDatePicker === 'end'}
                      era={endEra}
                      year={endYear}
                      month={endMonth}
                      day={endDay}
                      onEra={setEndEra}
                      onYear={setEndYear}
                      onMonth={setEndMonth}
                      onDay={setEndDay}
                      onOpenPicker={() => setActiveDatePicker('end')}
                      error={isDateInverted}
                      ariaLabel="퇴임 및 이임일"
                    />
                  </SubField>
                </SubFieldPair>

                <DateMetaFooterRow>
                  <FieldHint>
                    정확한 월·일을 모르면 <strong>연도만 입력</strong>해도 저장됩니다.
                  </FieldHint>
                  {durationSummary ? (
                    <DurationPill>
                      <FiClock size={11} />
                      <span>{durationSummary}</span>
                    </DurationPill>
                  ) : null}
                </DateMetaFooterRow>

                {isDateInverted ? (
                  <AlertBox variant="danger" icon={<FiAlertCircle />}>
                    퇴임 시점이 취임 시점보다 앞섭니다. 기원(서기/기원전)과 연·월·일을
                    확인해주세요.
                  </AlertBox>
                ) : null}
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>
                정당 · 계급 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldLabel>소속 정당 · 파벌</SubFieldLabel>
                    <NativeSelect
                      value={partyId}
                      onChange={(changeEvent) => {
                        userTouchedPartyRef.current = true
                        setAutoSuggestedPartyLabel(null)
                        setPartyId(changeEvent.target.value)
                      }}
                    >
                      <option value="">무소속 / 정당 미지정</option>
                      {fallbackSelectedParty ? (
                        <option value={fallbackSelectedParty.id}>
                          {formatPartyLabel(fallbackSelectedParty)}
                        </option>
                      ) : null}
                      {parties.map((partyItem) => (
                        <option key={partyItem.id} value={partyItem.id}>
                          {formatPartyLabel(partyItem)}
                        </option>
                      ))}
                    </NativeSelect>
                    {autoSuggestedPartyLabel && partyId ? (
                      <FieldHint>
                        인물의 당적 이력(
                        <strong>{autoSuggestedPartyLabel}</strong>)에서 자동
                        선택됨
                      </FieldHint>
                    ) : null}
                  </SubField>

                  <SubField>
                    <SubFieldLabel>
                      {contextType === 'MILITARY_UNIT'
                        ? '군 계급 정본 (DB 선택 · 직접 입력 시 자동 등록)'
                        : '계급 · 품계 · 칭호'}
                    </SubFieldLabel>
                    {contextType === 'MILITARY_UNIT' &&
                    militaryRanks.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <NativeSelect
                          aria-label="군 계급 정본 선택"
                          value={militaryRankId}
                          onChange={(
                            e: React.ChangeEvent<HTMLSelectElement>,
                          ) => {
                            const nextId = e.target.value
                            setMilitaryRankId(nextId)
                            const found = militaryRanks.find(
                              (rk) => rk.id === nextId,
                            )
                            if (found) {
                              setRankTitle(found.name)
                            } else if (!nextId) {
                              setRankTitle('')
                            }
                          }}
                        >
                          <option value="">— 계급 카탈로그에서 선택 —</option>
                          {militaryRanks.map((rk) => (
                            <option key={rk.id} value={rk.id}>
                              {rk.name}
                              {rk.nameLocal && rk.nameLocal !== rk.name
                                ? ` (${rk.nameLocal})`
                                : ''}
                              {rk.natoCode ? ` · ${rk.natoCode}` : ''}
                            </option>
                          ))}
                        </NativeSelect>
                        <Input
                          value={rankTitle}
                          onChange={(changeEvent) => {
                            const val = changeEvent.target.value
                            setRankTitle(val)
                            const matched = militaryRanks.find(
                              (rk) => rk.name === val.trim(),
                            )
                            setMilitaryRankId(matched?.id ?? '')
                          }}
                          placeholder="또는 새 계급명 직접 입력 (저장 시 계급 정본에 자동 등록)"
                        />
                      </div>
                    ) : (
                      <Input
                        value={rankTitle}
                        onChange={(changeEvent) =>
                          setRankTitle(changeEvent.target.value)
                        }
                        placeholder={
                          contextType === 'MILITARY_UNIT'
                            ? '예: 원수, 상급대장, 육군 중장'
                            : '예: 백작, 정1품, 육군 대장(겸임)'
                        }
                      />
                    )}
                  </SubField>
                </SubFieldPair>

                {contextType === 'MILITARY_UNIT' ? (
                  <PresetChipWrap>
                    {(militaryRanks.length > 0
                      ? militaryRanks
                          .filter(
                            (rk) =>
                              !rk.isUniversal ||
                              MILITARY_RANK_PRESETS.includes(rk.name),
                          )
                          .slice(0, 10)
                          .map((rk) => ({
                            id: rk.id,
                            label: rk.name,
                          }))
                      : MILITARY_RANK_PRESETS.map((p) => ({
                          id: '',
                          label: p,
                        }))
                    ).map((presetItem) => {
                      const isActiveChip = presetItem.id
                        ? militaryRankId === presetItem.id ||
                          rankTitle.trim() === presetItem.label
                        : rankTitle.trim() === presetItem.label
                      return (
                        <RolePresetChip
                          key={presetItem.id || presetItem.label}
                          type="button"
                          $active={isActiveChip}
                          onClick={() => {
                            if (isActiveChip) {
                              setMilitaryRankId('')
                              setRankTitle('')
                            } else {
                              setMilitaryRankId(presetItem.id)
                              setRankTitle(presetItem.label)
                            }
                          }}
                        >
                          {presetItem.label}
                        </RolePresetChip>
                      )
                    })}
                  </PresetChipWrap>
                ) : null}
              </FieldControl>
            </FieldRow>

            {contextType === 'DEPARTMENT' && availableCabinets.length > 0 ? (
              <FieldRow>
                <FieldLabel>
                  함께 편입할 내각 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <PresetChipWrap>
                    {availableCabinets.map((cabinetItem) => {
                      const headPerson = cabinetItem.headTenure?.person
                      const fallbackLabel = headPerson
                        ? `${getPersonDisplayName({ ...headPerson, name: headPerson.name ?? '' })} 행정부`
                        : '내각'
                      const label = cabinetItem.name?.trim() || fallbackLabel
                      const checked = selectedCabinetIds.includes(cabinetItem.id)
                      return (
                        <RolePresetChip
                          key={cabinetItem.id}
                          type="button"
                          $active={checked}
                          onClick={() => toggleCabinetSelection(cabinetItem.id)}
                        >
                          {checked ? '✓ ' : '+ '}
                          {label}
                        </RolePresetChip>
                      )
                    })}
                  </PresetChipWrap>
                </FieldControl>
              </FieldRow>
            ) : null}

            <FieldRow>
              <FieldLabel>
                비고 · 임명 배경 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <Input
                  value={notes}
                  onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                  placeholder="예: 겸임 각료, 서리(직무대행), 연립내각 정당 안배로 입각 등"
                />
              </FieldControl>
            </FieldRow>
          </FormGroup>
          </AppointmentColumns>
        </LabeledRowsWrap>
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={missingFieldItems.length > 0}>
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
              <FooterJumpArrow>↗ 이동</FooterJumpArrow>
            </FooterJumpButton>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>임명 준비 완료</FooterReadyBadge>
              <FooterShortcutItem>
                <FooterKbd>⌘</FooterKbd>
                <FooterKbd>↵</FooterKbd> 바로 저장
              </FooterShortcutItem>
              {!isEditing ? (
                <FooterShortcutItem>
                  <FooterKbd>⇧</FooterKbd>
                  <FooterKbd>⌘</FooterKbd>
                  <FooterKbd>↵</FooterKbd> 연속 임명
                </FooterShortcutItem>
              ) : null}
            </FooterReadyGroup>
          )}
        </FooterHint>

        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
          >
            취소
          </PersonRegisterModalCancelBtn>
          {!isEditing ? (
            <ContinueSubmitBtn
              type="button"
              disabled={saveTenureMutation.isPending}
              onClick={() => handleSubmitWithOption(true)}
            >
              임명 후 다음 인사 추가
            </ContinueSubmitBtn>
          ) : null}
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saveTenureMutation.isPending}
            onClick={() => handleSubmitWithOption(false)}
          >
            {saveTenureMutation.isPending
              ? '저장 중...'
              : isEditing
                ? '변경사항 저장'
                : '임명 등록'}
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
                activeDatePicker === 'start'
                  ? startDateAnchorId
                  : endDateAnchorId,
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

const ContextScopeBadge = styled.span<{
  $variant: InstitutionAppointmentContextType
}>`
  display: inline-flex;
  align-items: center;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ $variant, theme }) =>
    $variant === 'MILITARY_UNIT'
      ? theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.16)'
        : '#fef2f2'
      : $variant === 'CABINET'
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.16)'
          : 'rgba(99, 102, 241, 0.08)'
        : theme.mode === 'dark'
          ? 'rgba(16, 185, 129, 0.16)'
          : '#f0fdf4'};
  color: ${({ $variant, theme }) =>
    $variant === 'MILITARY_UNIT'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : $variant === 'CABINET'
        ? theme.mode === 'dark'
          ? '#c7d2fe'
          : theme.colors.primary
        : theme.mode === 'dark'
          ? '#6ee7b7'
          : '#15803d'};
`

const BatchProgressRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 0 0 12px;
`

/*
 * 2단 분할 — 1180px 이상에서 왼쪽(인물·직책) | 오른쪽(기간·정당·상세), 사이 세로선.
 * 반 폭 열에선 옆 라벨 열을 172→124px로 줄여 칸이 좁아지지 않게 한다.
 */
const AppointmentColumns = styled.div<{ $split: boolean }>`
  ${({ $split, theme }) =>
    $split
      ? `
    @media (min-width: 1180px) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 0;
      align-items: start;

      && > section:first-of-type {
        padding-right: 26px;
      }
      && > section + section {
        margin-top: 0;
        padding-left: 26px;
        border-left: 1px solid ${theme.colors.border.light};
      }
    }
  `
      : ''}

  @media (min-width: 1180px) {
    && ${FieldRow} {
      ${({ $split }) => ($split ? 'grid-template-columns: 124px minmax(0, 1fr); column-gap: 16px;' : '')}
    }
  }
`

const BatchProgressPill = styled.span`
  flex-shrink: 0;
  align-self: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
`

const SubFieldHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const InlineClearLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const DateMetaFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const DurationPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(16, 185, 129, 0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const CabinetPeriodHelperBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  .bar-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    svg {
      color: ${({ theme }) => theme.colors.primary};
    }

    strong {
      color: ${({ theme }) => theme.colors.text.primary};
      font-variant-numeric: tabular-nums;
    }
  }
`

const QuickFillBtn = styled.button`
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : '#ffffff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
  }
`

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PersonSearchBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SmallGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MoreCandidatesBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const PersonChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PersonCandidateBtn = styled.button<{ $contemporary: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $contemporary, theme }) =>
      $contemporary
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.4)'
          : 'rgba(99, 102, 241, 0.3)'
        : theme.colors.border.default};
  background: ${({ $contemporary, theme }) =>
    $contemporary
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.1)'
        : 'rgba(99, 102, 241, 0.04)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.02)'
        : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;

  .sub {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const EmptyHintBox = styled.div`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SelectedPersonBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.35)'
        : 'rgba(99, 102, 241, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'rgba(99, 102, 241, 0.04)'};

  .person-summary {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .person-name {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .person-sub {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PersonInitialAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  flex-shrink: 0;
`

const QuickPersonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
`

const QuickCardTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NameOrderBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  .order-label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NameOrderSegment = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff'};
`

const NameOrderBtn = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.secondary};
`

const QuickBottomRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const QuickCreateBtn = styled.button`
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const QuickPreviewLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
  }
`

const PresetChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RolePresetChip = styled.button<{ $active: boolean; $defined?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  border: 1px solid
    ${({ $active, $defined, theme }) =>
      $active
        ? theme.colors.primary
        : $defined
          ? theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.45)'
            : 'rgba(99, 102, 241, 0.35)'
          : theme.colors.border.default};
  background: ${({ $active, $defined, theme }) =>
    $active
      ? theme.colors.primary
      : $defined
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.12)'
          : 'rgba(99, 102, 241, 0.06)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.025)'
          : '#ffffff'};
  color: ${({ $active, theme }) =>
    $active ? '#ffffff' : theme.colors.text.primary};

  .def-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 999px;
    background: ${({ $active, theme }) =>
      $active
        ? 'rgba(255, 255, 255, 0.22)'
        : theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.24)'
          : 'rgba(99, 102, 241, 0.14)'};
    color: ${({ $active, theme }) =>
      $active ? '#ffffff' : theme.colors.primary};
  }
`

/* 대수 줄 — 직책 칸 아래 짧은 한 줄(직책 검색 칸 옆에 붙이면 칩·검색 칸과 높이가 어긋난다) */
const OrdinalLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;

  > div {
    width: 128px;
  }
`

const OrdinalLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const OrdinalHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AdornedNumberBox = styled.div`
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 11px;
  gap: 6px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};

  .prefix,
  .suffix {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const NativeSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13.5px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  }
`

const ContinueSubmitBtn = styled.button`
  height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.45)'
        : 'rgba(99, 102, 241, 0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
