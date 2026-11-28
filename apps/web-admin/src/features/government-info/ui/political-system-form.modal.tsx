import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiCheck, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import type {
  PoliticalSystem,
  UpdatePoliticalSystemInput,
} from '@/entities/political-system/api'
import {
  ELECTORAL_SYSTEM_TYPE_LABEL,
  ELECTORAL_SYSTEM_TYPE_ORDER,
  GOVERNMENT_FORM_LABEL,
  HEAD_SELECTION_METHOD_LABEL,
  HEAD_SELECTION_METHOD_ORDER,
  LEGISLATURE_TYPE_LABEL,
  LEGISLATURE_TYPE_ORDER,
  PARTY_SYSTEM_LABEL,
  PARTY_SYSTEM_ORDER,
  presetFromHistoricalStateType,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
  STATE_STRUCTURE_ORDER,
  WAR_POWER_AUTHORITY_LABEL,
  WAR_POWER_AUTHORITY_ORDER,
  type ElectoralSystemType,
  type GovernmentForm,
  type HeadSelectionMethod,
  type LegislatureType,
  type WarPowerAuthority,
} from '@/entities/political-system/model/political-system'
import { chamberApi, chamberKeys, chamberLabel, chamberSeatsAt } from '@/shared/api/chamber'
import { getLaws, type LawRow } from '@/shared/api/election'
import { personCareerApi } from '@/shared/api/person-career'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { LinkedEventPickerField } from '@/widgets/country/country-detail/ui/linked-event-picker-field'
import { buildPartialDateString, parsePartialDateString } from '@/shared/lib/partial-date-string'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import { DatePickerModal, type DatePickerPrecision } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  type ChoiceChipGroupDef,
  ChoiceChips,
  type ChoiceChipOption,
  KitBusyBar,
  KitChoiceChip,
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
  SubField,
  SubFieldLabel,
  SubFieldPair,
} from '@/shared/ui/register-form-layout'
import {
  FooterActions,
  FooterHint,
  FooterReadyBadge,
  FooterReadyGroup,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTextarea,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { SearchableSelect, type SearchableSelectOption } from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  /** null이면 새로 만들기 */
  editing: PoliticalSystem | null
  /** 프리셋 칩으로 열 때 초기 정부 형태 */
  initialGovernmentForm?: GovernmentForm | null
  /** 첫 정체 등록 시 기본 현행 체크 여부 */
  defaultIsCurrent?: boolean
  countryId?: string
  historicalCountryId?: string
  countryName?: string
  onSubmit: (dto: UpdatePoliticalSystemInput) => Promise<void>
}

type FormState = {
  name: string
  historicalCountryId: string
  startEra: 'BC' | 'AD'
  startYear: string
  startMonth: string
  startDay: string
  endEra: 'BC' | 'AD'
  endYear: string
  endMonth: string
  endDay: string
  isCurrent: boolean
  governmentForm: string
  legislatureType: string
  lowerHouseName: string
  lowerHouseSeats: string
  upperHouseName: string
  upperHouseSeats: string
  /** 원 카탈로그(B7)에서 고른 원 — 비면 이름 칸만 */
  lowerChamberId: string
  upperChamberId: string
  /**
   * 직함 선택 — 관직 정의 id, 또는 '카탈로그에 없음'을 뜻하는 센티널(CUSTOM_TITLE),
   * 또는 빈 값(지정 안 함). 자유입력 칸은 센티널일 때만 열린다.
   */
  headOfStateChoice: string
  headOfStateTitle: string
  headOfStateHasPower: boolean
  headOfGovernmentChoice: string
  headOfGovernmentTitle: string
  headOfGovernmentHasPower: boolean
  stateStructure: string
  partySystem: string
  headSelectionMethod: string
  headOfStateTermYears: string
  headOfStateTermLimit: string
  lowerHouseTermYears: string
  upperHouseTermYears: string
  electoralSystem: string
  electoralThresholdPercent: string
  warPowerAuthority: string
  warConsentChamberId: string
  commanderInChiefPositionId: string
  warPowerNotes: string
  constitutionLawId: string
  foundingEventId: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  historicalCountryId: '',
  startEra: 'AD',
  startYear: '',
  startMonth: '',
  startDay: '',
  endEra: 'AD',
  endYear: '',
  endMonth: '',
  endDay: '',
  isCurrent: false,
  governmentForm: '',
  legislatureType: '',
  lowerHouseName: '',
  lowerHouseSeats: '',
  upperHouseName: '',
  upperHouseSeats: '',
  lowerChamberId: '',
  upperChamberId: '',
  headOfStateChoice: '',
  headOfStateTitle: '',
  headOfStateHasPower: true,
  headOfGovernmentChoice: '',
  headOfGovernmentTitle: '',
  headOfGovernmentHasPower: true,
  stateStructure: '',
  partySystem: '',
  headSelectionMethod: '',
  headOfStateTermYears: '',
  headOfStateTermLimit: '',
  lowerHouseTermYears: '',
  upperHouseTermYears: '',
  electoralSystem: '',
  electoralThresholdPercent: '',
  warPowerAuthority: '',
  warConsentChamberId: '',
  commanderInChiefPositionId: '',
  warPowerNotes: '',
  constitutionLawId: '',
  foundingEventId: '',
  notes: '',
}

const toText = (value: unknown) => (value == null ? '' : String(value))

/** 새 수반 직위 카탈로그 등록 센티널 & 레거시 수기 직함 센티널 */
const CREATE_POSITION_SENTINEL = '__create_position__'
const LEGACY_UNLINKED_TITLE = '__legacy_unlinked__'

const UNIVERSAL_HEAD_TITLES = new Set([
  '대통령',
  '총리',
  '국왕',
  '황제',
  '여왕',
  '수상',
  '섭정',
])

/** 국가원수와 정부수반이 제도적으로 분리되는 이원 집행부 정체 */
const DUAL_EXECUTIVE_FORMS = new Set<string>([
  'PARLIAMENTARY',
  'CONSTITUTIONAL_MONARCHY',
  'SEMI_PRESIDENTIAL',
  'ONE_PARTY',
  'THEOCRACY',
])

/**
 * 정부 형태 칩 묶음 — 사건 등록 모달의 카테고리 칩처럼 성격별로 한 줄씩.
 * 칩 위에 마우스를 올리면 그 형태가 무엇인지 한 줄 풀이.
 */
const GOVERNMENT_FORM_GROUPS: ChoiceChipGroupDef<GovernmentForm>[] = [
  {
    label: '공화정',
    options: [
      { value: 'PRESIDENTIAL', label: GOVERNMENT_FORM_LABEL.PRESIDENTIAL, title: '대통령이 국가원수이자 정부수반' },
      { value: 'PARLIAMENTARY', label: GOVERNMENT_FORM_LABEL.PARLIAMENTARY, title: '의회 다수파가 내각을 구성, 총리가 정부수반' },
      { value: 'SEMI_PRESIDENTIAL', label: GOVERNMENT_FORM_LABEL.SEMI_PRESIDENTIAL, title: '직선 대통령과 의회 책임 총리가 권한을 나눔' },
    ],
  },
  {
    label: '군주정',
    options: [
      { value: 'CONSTITUTIONAL_MONARCHY', label: GOVERNMENT_FORM_LABEL.CONSTITUTIONAL_MONARCHY, title: '군주는 헌법 아래, 실제 통치는 내각' },
      { value: 'ABSOLUTE_MONARCHY', label: GOVERNMENT_FORM_LABEL.ABSOLUTE_MONARCHY, title: '군주가 입법·행정·사법을 직접 장악' },
    ],
  },
  {
    label: '기타 체제',
    options: [
      { value: 'MILITARY', label: GOVERNMENT_FORM_LABEL.MILITARY },
      { value: 'ONE_PARTY', label: GOVERNMENT_FORM_LABEL.ONE_PARTY },
      { value: 'THEOCRACY', label: GOVERNMENT_FORM_LABEL.THEOCRACY },
      { value: 'PROVISIONAL', label: GOVERNMENT_FORM_LABEL.PROVISIONAL },
      { value: 'OTHER', label: GOVERNMENT_FORM_LABEL.OTHER },
    ],
  },
]

const LEGISLATURE_OPTIONS: ChoiceChipOption<LegislatureType>[] = LEGISLATURE_TYPE_ORDER.map((key) => ({
  value: key,
  label: LEGISLATURE_TYPE_LABEL[key],
}))
const STATE_STRUCTURE_OPTIONS: ChoiceChipOption[] = STATE_STRUCTURE_ORDER.map((key) => ({
  value: key,
  label: STATE_STRUCTURE_LABEL[key],
}))
const PARTY_SYSTEM_OPTIONS: ChoiceChipOption[] = PARTY_SYSTEM_ORDER.map((key) => ({
  value: key,
  label: PARTY_SYSTEM_LABEL[key],
}))
const HEAD_SELECTION_OPTIONS: ChoiceChipOption<HeadSelectionMethod>[] =
  HEAD_SELECTION_METHOD_ORDER.map((key) => ({
    value: key,
    label: HEAD_SELECTION_METHOD_LABEL[key],
  }))
const ELECTORAL_SYSTEM_OPTIONS: ChoiceChipOption<ElectoralSystemType>[] =
  ELECTORAL_SYSTEM_TYPE_ORDER.map((key) => ({
    value: key,
    label: ELECTORAL_SYSTEM_TYPE_LABEL[key],
  }))
const WAR_POWER_AUTHORITY_OPTIONS: ChoiceChipOption<WarPowerAuthority>[] =
  WAR_POWER_AUTHORITY_ORDER.map((key) => ({
    value: key,
    label: WAR_POWER_AUTHORITY_LABEL[key],
  }))
const POWER_OPTIONS: ChoiceChipOption<'power' | 'symbolic'>[] = [
  { value: 'power', label: '실권 있음' },
  { value: 'symbolic', label: '상징적' },
]

/** 카탈로그에서 이 축에 쓸 수 있는 유형 */
type HeadAxis = 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'

interface DefinitionOption {
  id: string
  title: string
  positionType: string
  titleLocal?: string | null
  titleEn?: string | null
  isGeneric?: boolean | null
  isMonarchical?: boolean | null
  scopes?: Array<{ countryId?: string | null; historicalCountryId?: string | null }>
}

function isDefinitionScopedToCountry(def: DefinitionOption): boolean {
  return (def.scopes ?? []).some((s) => Boolean(s.countryId || s.historicalCountryId))
}

function isMonarchicalDef(def: DefinitionOption): boolean {
  if (typeof def.isMonarchical === 'boolean') return def.isMonarchical
  return /^(국왕|황제|여왕|천황|군주|대공|공작|술탄|칼리프|파라오|차르|샤|칸|가한|태왕|왕|친왕|교황)$/.test(
    def.title.trim(),
  )
}

/**
 * 정부 형태(governmentForm) 선택 시 관직 정의 카탈로그에서 가장 적합한 국가원수·정부수반 직위 ID를 자동 매칭한다.
 * (국가 전용 스코프 직위 우선 → 보편 직위 폴백)
 */
function pickDefaultHeadPositionId(
  defs: DefinitionOption[],
  govForm: string,
  axis: HeadAxis,
): string {
  const candidates = defs.filter(
    (def) => !def.isGeneric && def.positionType === axis,
  )
  if (candidates.length === 0) return ''

  const scoped = candidates.filter(isDefinitionScopedToCountry)
  const findByTitles = (pool: DefinitionOption[], titles: string[]) => {
    for (const t of titles) {
      const hit = pool.find((d) => d.title.trim() === t)
      if (hit) return hit.id
    }
    return ''
  }

  if (axis === 'HEAD_OF_GOVERNMENT') {
    if (scoped.length > 0) return scoped[0].id
    return (
      findByTitles(candidates, ['총리', '국무총리', '내각총리대신', '수상', '연방총리']) ||
      candidates[0].id
    )
  }

  const wantsMonarch =
    govForm === 'CONSTITUTIONAL_MONARCHY' || govForm === 'ABSOLUTE_MONARCHY'
  if (wantsMonarch) {
    const monarchScoped = scoped.filter(isMonarchicalDef)
    if (monarchScoped.length > 0) return monarchScoped[0].id
    const monarchPool = candidates.filter(isMonarchicalDef)
    return (
      findByTitles(monarchPool, ['국왕', '황제', '천황', '여왕', '술탄', '차르', '대공']) ||
      monarchPool[0]?.id ||
      ''
    )
  }

  const repScoped = scoped.filter((d) => !isMonarchicalDef(d))
  if (repScoped.length > 0) return repScoped[0].id
  const repPool = candidates.filter((d) => !isMonarchicalDef(d))
  if (
    govForm === 'PRESIDENTIAL' ||
    govForm === 'SEMI_PRESIDENTIAL' ||
    govForm === 'PARLIAMENTARY'
  ) {
    return (
      findByTitles(repPool, ['대통령', '연방대통령', '국가주석']) ||
      repPool[0]?.id ||
      ''
    )
  }
  if (govForm === 'ONE_PARTY') {
    return (
      findByTitles(repPool, ['국가주석', '최고지도자', '대통령']) ||
      repPool[0]?.id ||
      ''
    )
  }
  return ''
}

function hydrate(system: PoliticalSystem): FormState {
  return {
    name: toText(system.name),
    historicalCountryId: system.historicalCountryId ?? '',
    startEra: system.startEra ?? 'AD',
    startYear: toText(system.startYear),
    startMonth: toText(system.startMonth),
    startDay: toText(system.startDay),
    endEra: system.endEra ?? 'AD',
    endYear: toText(system.endYear),
    endMonth: toText(system.endMonth),
    endDay: toText(system.endDay),
    isCurrent: system.isCurrent,
    governmentForm: system.governmentForm ?? '',
    legislatureType: system.legislatureType ?? '',
    lowerHouseName: toText(system.lowerHouseName),
    lowerHouseSeats: toText(system.lowerHouseSeats),
    upperHouseName: toText(system.upperHouseName),
    upperHouseSeats: toText(system.upperHouseSeats),
    lowerChamberId: system.lowerChamberId ?? '',
    upperChamberId: system.upperChamberId ?? '',
    headOfStateChoice: system.headOfStatePositionId
      ? system.headOfStatePositionId
      : system.headOfStateTitle
        ? LEGACY_UNLINKED_TITLE
        : '',
    headOfStateTitle: toText(system.headOfStateTitle),
    headOfStateHasPower: system.headOfStateHasPower ?? true,
    headOfGovernmentChoice: system.headOfGovernmentPositionId
      ? system.headOfGovernmentPositionId
      : system.headOfGovernmentTitle
        ? LEGACY_UNLINKED_TITLE
        : '',
    headOfGovernmentTitle: toText(system.headOfGovernmentTitle),
    headOfGovernmentHasPower: system.headOfGovernmentHasPower ?? true,
    stateStructure: system.stateStructure ?? '',
    partySystem: system.partySystem ?? '',
    headSelectionMethod: system.headSelectionMethod ?? '',
    headOfStateTermYears: toText(system.headOfStateTermYears),
    headOfStateTermLimit: toText(system.headOfStateTermLimit),
    lowerHouseTermYears: toText(system.lowerHouseTermYears),
    upperHouseTermYears: toText(system.upperHouseTermYears),
    electoralSystem: system.electoralSystem ?? '',
    electoralThresholdPercent: toText(system.electoralThresholdPercent),
    warPowerAuthority: system.warPowerAuthority ?? '',
    warConsentChamberId: system.warConsentChamberId ?? '',
    commanderInChiefPositionId: system.commanderInChiefPositionId ?? '',
    warPowerNotes: toText(system.warPowerNotes),
    constitutionLawId: system.constitutionLawId ?? '',
    foundingEventId: system.foundingEventId ?? '',
    notes: toText(system.notes),
  }
}

const numberOrNull = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

const floatOrNull = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const textOrNull = (raw: string) => (raw.trim() === '' ? null : raw.trim())

/**
 * 정부 형태 선택 시 통치 구조 기본값(실권 여부·입법부·정당제·카탈로그 기본 수반 직위)을 맞춰준다.
 */
function applyGovernmentFormDefaults(
  nextForm: string,
  prev: FormState,
  defs: DefinitionOption[] = [],
  opts?: { preserveManualHos?: boolean; preserveManualHog?: boolean },
): FormState {
  const next: FormState = { ...prev, governmentForm: nextForm }
  const autoHos = pickDefaultHeadPositionId(defs, nextForm, 'HEAD_OF_STATE')
  const autoHog = pickDefaultHeadPositionId(defs, nextForm, 'HEAD_OF_GOVERNMENT')
  const applyHosIfAllowed = () => {
    if (!opts?.preserveManualHos && autoHos) {
      next.headOfStateChoice = autoHos
      next.headOfStateTitle = ''
    }
  }
  const applyHogIfAllowed = () => {
    if (!opts?.preserveManualHog && autoHog) {
      next.headOfGovernmentChoice = autoHog
      next.headOfGovernmentTitle = ''
    }
  }

  switch (nextForm as GovernmentForm) {
    case 'PRESIDENTIAL':
      next.headOfStateHasPower = true
      next.headOfGovernmentChoice = ''
      next.headOfGovernmentTitle = ''
      if (!next.headSelectionMethod) next.headSelectionMethod = 'DIRECT'
      if (!next.warPowerAuthority) {
        next.warPowerAuthority = 'EXECUTIVE_WITH_LEGISLATURE_CONSENT'
      }
      applyHosIfAllowed()
      break
    case 'PARLIAMENTARY':
      next.headOfStateHasPower = false
      next.headOfGovernmentHasPower = true
      if (!next.headSelectionMethod) next.headSelectionMethod = 'INDIRECT'
      if (!next.warPowerAuthority) {
        next.warPowerAuthority = 'EXECUTIVE_WITH_LEGISLATURE_CONSENT'
      }
      applyHosIfAllowed()
      applyHogIfAllowed()
      break
    case 'CONSTITUTIONAL_MONARCHY':
      next.headOfStateHasPower = false
      next.headOfGovernmentHasPower = true
      if (!next.headSelectionMethod) next.headSelectionMethod = 'HEREDITARY'
      if (!next.warPowerAuthority) {
        next.warPowerAuthority = 'EXECUTIVE_WITH_LEGISLATURE_CONSENT'
      }
      applyHosIfAllowed()
      applyHogIfAllowed()
      break
    case 'SEMI_PRESIDENTIAL':
      next.headOfStateHasPower = true
      next.headOfGovernmentHasPower = true
      if (!next.headSelectionMethod) next.headSelectionMethod = 'DIRECT'
      if (!next.warPowerAuthority) {
        next.warPowerAuthority = 'EXECUTIVE_WITH_LEGISLATURE_CONSENT'
      }
      applyHosIfAllowed()
      applyHogIfAllowed()
      break
    case 'ABSOLUTE_MONARCHY':
      next.headOfStateHasPower = true
      next.headOfGovernmentChoice = ''
      next.headOfGovernmentTitle = ''
      if (!next.legislatureType) next.legislatureType = 'NONE'
      if (!next.headSelectionMethod) next.headSelectionMethod = 'HEREDITARY'
      if (!next.warPowerAuthority) {
        next.warPowerAuthority = 'MONARCH_PREROGATIVE'
      }
      applyHosIfAllowed()
      break
    case 'ONE_PARTY':
      next.headOfStateHasPower = true
      if (!next.partySystem) next.partySystem = 'ONE_PARTY'
      if (!next.warPowerAuthority) next.warPowerAuthority = 'EXECUTIVE_EXCLUSIVE'
      applyHosIfAllowed()
      break
    case 'MILITARY':
      next.headOfStateHasPower = true
      if (!next.headSelectionMethod) next.headSelectionMethod = 'COUP_OR_JUNTA'
      if (!next.warPowerAuthority) next.warPowerAuthority = 'EXECUTIVE_EXCLUSIVE'
      applyHosIfAllowed()
      break
    case 'THEOCRACY':
      next.headOfStateHasPower = true
      if (!next.warPowerAuthority) next.warPowerAuthority = 'EXECUTIVE_EXCLUSIVE'
      applyHosIfAllowed()
      break
    case 'PROVISIONAL':
      if (!next.warPowerAuthority) next.warPowerAuthority = 'EXECUTIVE_EXCLUSIVE'
      break
    default:
      break
  }
  if (
    !next.commanderInChiefPositionId &&
    next.headOfStateChoice &&
    next.headOfStateChoice !== LEGACY_UNLINKED_TITLE
  ) {
    next.commanderInChiefPositionId = next.headOfStateChoice
  }
  if (
    !next.warConsentChamberId &&
    next.warPowerAuthority === 'EXECUTIVE_WITH_LEGISLATURE_CONSENT' &&
    next.lowerChamberId
  ) {
    next.warConsentChamberId = next.lowerChamberId
  }
  return next
}

/**
 * 국가원수·정부수반 한 축을 DTO 조각으로 옮긴다.
 * 카탈로그 직위(PositionId)를 정본으로 보내고, 구 데이터의 미연결 수기 문자열(LEGACY_UNLINKED_TITLE)만 예외 보존한다.
 */
function headAxisPayload(
  axis: 'headOfState' | 'headOfGovernment',
  form: FormState,
): Partial<UpdatePoliticalSystemInput> {
  const choice = axis === 'headOfState' ? form.headOfStateChoice : form.headOfGovernmentChoice
  const title = axis === 'headOfState' ? form.headOfStateTitle : form.headOfGovernmentTitle
  const hasPower =
    axis === 'headOfState' ? form.headOfStateHasPower : form.headOfGovernmentHasPower

  if (choice === LEGACY_UNLINKED_TITLE) {
    const text = textOrNull(title)
    return {
      [`${axis}PositionId`]: null,
      [`${axis}Title`]: text,
      [`${axis}HasPower`]: text ? hasPower : null,
    } as Partial<UpdatePoliticalSystemInput>
  }
  if (choice && choice !== CREATE_POSITION_SENTINEL) {
    return {
      [`${axis}PositionId`]: choice,
      [`${axis}Title`]: null,
      [`${axis}HasPower`]: hasPower,
    } as Partial<UpdatePoliticalSystemInput>
  }
  return {
    [`${axis}PositionId`]: null,
    [`${axis}Title`]: null,
    [`${axis}HasPower`]: null,
  } as Partial<UpdatePoliticalSystemInput>
}

/**
 * 정체 등록·수정 폼.
 *
 * 입법부 상세는 **양원제를 고를 때만** 상원 칸을 연다. 단원제인데 상원 칸이 떠 있으면
 * 채워야 할 것처럼 보이고, 실제로 채우면 조용히 무의미한 값이 남는다.
 */
export function PoliticalSystemFormModal({
  open,
  onClose,
  editing,
  initialGovernmentForm,
  defaultIsCurrent = false,
  countryId,
  historicalCountryId,
  countryName,
  onSubmit,
}: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [forceSplitExecutive, setForceSplitExecutive] = useState(false)

  const userTouchedHosRef = useRef(false)
  const userTouchedHogRef = useRef(false)
  const userTouchedLowerChamberRef = useRef(false)
  const userTouchedUpperChamberRef = useRef(false)

  const [quickPosCreator, setQuickPosCreator] = useState<{
    axis: HeadAxis
    title: string
    titleLocal: string
    isMonarchical: boolean
    scoped: boolean
    saving: boolean
  } | null>(null)

  const [quickChamberCreator, setQuickChamberCreator] = useState<{
    side: 'lower' | 'upper'
    name: string
    localName: string
    saving: boolean
  } | null>(null)

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      open && !historicalCountryId && countryId ? countryId : '',
    )
  const { data: allHistoricalCountries = [] } = useHistoricalCountries({
    enabled: open && Boolean(historicalCountryId),
  })

  const effectiveHistoricalCountryId =
    historicalCountryId ?? (form.historicalCountryId || undefined)
  const effectiveCountryIdForDefs = effectiveHistoricalCountryId
    ? undefined
    : countryId

  const lawScopeParams = effectiveHistoricalCountryId
    ? { historicalCountryId: effectiveHistoricalCountryId }
    : countryId
      ? { countryId }
      : null
  const { data: scopedLaws = [] } = useQuery<LawRow[]>({
    queryKey: [
      'laws',
      effectiveHistoricalCountryId
        ? `h:${effectiveHistoricalCountryId}`
        : countryId
          ? `c:${countryId}`
          : '',
    ],
    queryFn: () => getLaws(lawScopeParams ?? {}),
    enabled: open && Boolean(lawScopeParams),
    staleTime: 60_000,
  })

  const constitutionLawOptions = useMemo<SearchableSelectOption[]>(() => {
    const isConstitutionLike = (law: {
      name: string
      lawType?: { name?: string | null } | null
    }) => /헌법|기본법|장전|헌장|대전|율령|태정관|제국헌법|임시헌장/i.test(`${law.lawType?.name ?? ''} ${law.name}`)

    const pool: Array<{
      id: string
      name: string
      lawType?: { name?: string | null } | null
      startDate?: string | null
    }> = [...scopedLaws]
    if (
      editing?.constitutionLaw?.id &&
      !pool.some((item) => item.id === editing.constitutionLaw!.id)
    ) {
      pool.push(editing.constitutionLaw)
    }

    const sortedPool = [...pool].sort((left, right) => {
      const leftConst = isConstitutionLike(left) ? 0 : 1
      const rightConst = isConstitutionLike(right) ? 0 : 1
      if (leftConst !== rightConst) return leftConst - rightConst
      return left.name.localeCompare(right.name, 'ko')
    })

    return sortedPool.map((law) => {
      const yearPart = law.startDate ? law.startDate.slice(0, 4) : null
      const meta = [law.lawType?.name ?? null, yearPart ? `${yearPart}년` : null]
        .filter(Boolean)
        .join(' · ')
      return {
        value: law.id,
        label: law.name,
        meta: meta || undefined,
        group: isConstitutionLike(law) ? '헌법 · 기본법' : '기타 법령',
      }
    })
  }, [scopedLaws, editing?.constitutionLaw])

  /*
   * 직함 후보 = 관직 정의 카탈로그. 재임·재위가 쓰는 것과 **같은 목록·같은 쿼리키**를
   * 쓴다 — 여기만 자유 문자열로 두면 같은 '대통령'이 두 어휘로 갈라진다.
   * 국가를 주면 서버가 적용 범위(스코프)로 하드컷해 그 나라 것만 내려준다.
   */
  const { data: definitions = [] } = useQuery<DefinitionOption[]>({
    queryKey: [
      'position-definitions',
      'list',
      effectiveCountryIdForDefs ?? null,
      effectiveHistoricalCountryId ?? null,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: effectiveCountryIdForDefs,
        historicalCountryId: effectiveHistoricalCountryId,
      }) as Promise<DefinitionOption[]>,
    enabled: open,
    staleTime: 60_000,
  })

  /* 원 카탈로그 — 이 정체의 나라 원들. 고르면 이름 칸을 원으로 채운다(서버도 같은 캐시를 쓴다) */
  const chamberScope = {
    countryId: effectiveHistoricalCountryId ? null : (countryId ?? null),
    historicalCountryId: effectiveHistoricalCountryId ?? null,
  }
  const { data: chambers = [] } = useQuery({
    queryKey: chamberKeys.list(chamberScope),
    queryFn: () => chamberApi.list(chamberScope),
    enabled: open && Boolean(chamberScope.countryId || chamberScope.historicalCountryId),
    staleTime: 60_000,
  })
  const pickChamber = (side: 'lower' | 'upper', chamberId: string) => {
    const chamber = chambers.find((candidate) => candidate.id === chamberId)
    setForm((prev) => {
      const next = { ...prev, [`${side}ChamberId`]: chamberId }
      if (chamber) {
        next[`${side}HouseName`] = chamberLabel(chamber)
        const seatsKey = `${side}HouseSeats` as const
        if (!prev[seatsKey].trim()) {
          const year = Number(prev.startYear)
          const seats = chamberSeatsAt(chamber.sizes, Number.isFinite(year) && year > 0 ? (prev.startEra === 'BC' ? -year : year) : null)
          if (seats != null) next[seatsKey] = String(seats)
        }
      }
      return next
    })
  }

  /**
   * 수정 중인 정체가 이미 참조하는 정의는 목록에서 빠져도 되살리고,
   * 시스템 범용 더미(isGeneric: true)는 배제하며, 국가 스코프 직위 및 정체 성격(군주/공화)에 맞는 직위를 상단에 배치한다.
   */
  const optionsFor = useMemo(() => {
    const pinned: DefinitionOption[] = [
      editing?.headOfStatePosition as DefinitionOption | null,
      editing?.headOfGovernmentPosition as DefinitionOption | null,
    ].filter((def): def is DefinitionOption => !!def?.id)

    const wantsMonarch =
      form.governmentForm === 'CONSTITUTIONAL_MONARCHY' ||
      form.governmentForm === 'ABSOLUTE_MONARCHY'

    return (axis: HeadAxis) => {
      const pool = [...definitions]
      for (const def of pinned) {
        if (!pool.some((row) => row.id === def.id)) pool.push(def)
      }
      return pool
        .filter(
          (def) =>
            def.positionType === axis &&
            (!def.isGeneric || pinned.some((p) => p.id === def.id)),
        )
        .sort((left, right) => {
          const leftScoped = isDefinitionScopedToCountry(left) ? 0 : 1
          const rightScoped = isDefinitionScopedToCountry(right) ? 0 : 1
          if (leftScoped !== rightScoped) return leftScoped - rightScoped
          if (axis === 'HEAD_OF_STATE' && form.governmentForm) {
            const leftMatchesNature =
              isMonarchicalDef(left) === wantsMonarch ? 0 : 1
            const rightMatchesNature =
              isMonarchicalDef(right) === wantsMonarch ? 0 : 1
            if (leftMatchesNature !== rightMatchesNature) {
              return leftMatchesNature - rightMatchesNature
            }
          }
          return left.title.localeCompare(right.title, 'ko-KR')
        })
    }
  }, [definitions, editing, form.governmentForm])

  // 열릴 때마다 대상에 맞춰 채운다 — 직전에 열었던 값이 남지 않도록
  const prefilledHistoricalRef = useRef(false)
  useEffect(() => {
    if (!open) {
      prefilledHistoricalRef.current = false
      userTouchedHosRef.current = false
      userTouchedHogRef.current = false
      userTouchedLowerChamberRef.current = false
      userTouchedUpperChamberRef.current = false
      setQuickPosCreator(null)
      setQuickChamberCreator(null)
      return
    }
    userTouchedHosRef.current = false
    userTouchedHogRef.current = false
    userTouchedLowerChamberRef.current = false
    userTouchedUpperChamberRef.current = false
    setQuickPosCreator(null)
    setQuickChamberCreator(null)

    if (editing) {
      setForm(hydrate(editing))
      setForceSplitExecutive(
        Boolean(
          editing.headOfGovernmentPositionId || editing.headOfGovernmentTitle,
        ),
      )
      return
    }
    const base: FormState = {
      ...EMPTY,
      isCurrent: defaultIsCurrent,
    }
    setForceSplitExecutive(false)
    setForm(
      initialGovernmentForm
        ? applyGovernmentFormDefaults(initialGovernmentForm, base, definitions)
        : base,
    )
  }, [open, editing, initialGovernmentForm, defaultIsCurrent])

  // 관직 사전이 로드되면: (1) 생성 모드에서 정부 형태에 맞는 기본 수반 직위를 자동 세팅하고,
  // (2) 수정 모드에서 수기 직함(LEGACY_UNLINKED_TITLE)과 동명인 정식 카탈로그 직위가 있으면 자동 승격한다.
  useEffect(() => {
    if (!open || definitions.length === 0) return
    setForm((prev) => {
      let changed = false
      const next = { ...prev }

      if (editing) {
        if (
          prev.headOfStateChoice === LEGACY_UNLINKED_TITLE &&
          prev.headOfStateTitle.trim()
        ) {
          const hit = definitions.find(
            (d) =>
              !d.isGeneric &&
              d.positionType === 'HEAD_OF_STATE' &&
              d.title.trim() === prev.headOfStateTitle.trim(),
          )
          if (hit) {
            next.headOfStateChoice = hit.id
            next.headOfStateTitle = ''
            changed = true
          }
        }
        if (
          prev.headOfGovernmentChoice === LEGACY_UNLINKED_TITLE &&
          prev.headOfGovernmentTitle.trim()
        ) {
          const hit = definitions.find(
            (d) =>
              !d.isGeneric &&
              d.positionType === 'HEAD_OF_GOVERNMENT' &&
              d.title.trim() === prev.headOfGovernmentTitle.trim(),
          )
          if (hit) {
            next.headOfGovernmentChoice = hit.id
            next.headOfGovernmentTitle = ''
            changed = true
          }
        }
        return changed ? next : prev
      }

      if (!prev.governmentForm) return prev
      if (!userTouchedHosRef.current && !prev.headOfStateChoice) {
        const defaultHos = pickDefaultHeadPositionId(
          definitions,
          prev.governmentForm,
          'HEAD_OF_STATE',
        )
        if (defaultHos) {
          next.headOfStateChoice = defaultHos
          changed = true
        }
      }
      if (
        DUAL_EXECUTIVE_FORMS.has(prev.governmentForm) &&
        !userTouchedHogRef.current &&
        !prev.headOfGovernmentChoice
      ) {
        const defaultHog = pickDefaultHeadPositionId(
          definitions,
          prev.governmentForm,
          'HEAD_OF_GOVERNMENT',
        )
        if (defaultHog) {
          next.headOfGovernmentChoice = defaultHog
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [open, editing, definitions])

  // 의회 원 카탈로그가 로드되거나 의회 구성(단원/양원)을 고르면 미선택 원 슬롯을 자동으로 매칭한다.
  useEffect(() => {
    if (!open || chambers.length === 0 || editing) return
    if (!form.legislatureType || form.legislatureType === 'NONE') return

    setForm((prev) => {
      let changed = false
      const next = { ...prev }
      const signedStart =
        Number.isFinite(Number(prev.startYear)) && Number(prev.startYear) > 0
          ? prev.startEra === 'BC'
            ? -Number(prev.startYear)
            : Number(prev.startYear)
          : null

      if (!userTouchedLowerChamberRef.current && !prev.lowerChamberId) {
        const lowerPool = chambers.filter((ch) =>
          prev.legislatureType === 'UNICAMERAL'
            ? ch.role === 'UNICAMERAL' || ch.role === 'LOWER'
            : ch.role === 'LOWER' || ch.role === 'UNICAMERAL',
        )
        if (lowerPool.length === 1) {
          const chosen = lowerPool[0]
          next.lowerChamberId = chosen.id
          next.lowerHouseName = chamberLabel(chosen)
          if (!prev.lowerHouseSeats.trim()) {
            const seats = chamberSeatsAt(chosen.sizes, signedStart)
            if (seats != null) next.lowerHouseSeats = String(seats)
          }
          changed = true
        }
      }
      if (
        prev.legislatureType === 'BICAMERAL' &&
        !userTouchedUpperChamberRef.current &&
        !prev.upperChamberId
      ) {
        const upperPool = chambers.filter((ch) => ch.role === 'UPPER')
        if (upperPool.length === 1) {
          const chosen = upperPool[0]
          next.upperChamberId = chosen.id
          next.upperHouseName = chamberLabel(chosen)
          if (!prev.upperHouseSeats.trim()) {
            const seats = chamberSeatsAt(chosen.sizes, signedStart)
            if (seats != null) next.upperHouseSeats = String(seats)
          }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [open, editing, chambers, form.legislatureType])

  // 역사적 국가에서 새 정체를 처음 등록할 때 국가 형태(stateType)·존속 기간을 기본값으로 미리 채운다
  useEffect(() => {
    if (!open || editing || !historicalCountryId || prefilledHistoricalRef.current) {
      return
    }
    const targetHc = (
      allHistoricalCountries as Array<{
        id: string
        stateType?: string | null
        startEra?: 'BC' | 'AD' | null
        startYear?: number | null
        endEra?: 'BC' | 'AD' | null
        endYear?: number | null
      }>
    ).find((hc) => hc.id === historicalCountryId)
    if (!targetHc) return
    prefilledHistoricalRef.current = true
    setForm((prev) => {
      if (prev.startYear || prev.governmentForm) return prev
      const preset = presetFromHistoricalStateType(targetHc.stateType)
      let next: FormState = {
        ...prev,
        startEra: targetHc.startEra === 'BC' ? 'BC' : 'AD',
        startYear: targetHc.startYear != null ? String(Math.abs(targetHc.startYear)) : prev.startYear,
        endEra: targetHc.endEra === 'BC' ? 'BC' : 'AD',
        endYear: targetHc.endYear != null ? String(Math.abs(targetHc.endYear)) : prev.endYear,
        isCurrent: targetHc.endYear != null ? false : prev.isCurrent,
        stateStructure: preset.stateStructure ?? prev.stateStructure,
      }
      if (!initialGovernmentForm && preset.governmentForm) {
        next = applyGovernmentFormDefaults(preset.governmentForm, next)
      }
      return next
    })
  }, [open, editing, historicalCountryId, allHistoricalCountries, initialGovernmentForm])

  const set = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const legislature = (form.legislatureType || null) as LegislatureType | null
  const isBicameral = legislature === 'BICAMERAL'
  const hasLegislature = legislature !== 'NONE'
  const isNaturallyDualExecutive = DUAL_EXECUTIVE_FORMS.has(form.governmentForm)
  const isDualExecutive =
    isNaturallyDualExecutive ||
    forceSplitExecutive ||
    Boolean(form.headOfGovernmentChoice)

  const handleSubmit = async () => {
    const startYear = numberOrNull(form.startYear)
    const startMonth = startYear == null ? null : numberOrNull(form.startMonth)
    const startDay =
      startYear == null || startMonth == null
        ? null
        : numberOrNull(form.startDay)
    const endYear = form.isCurrent ? null : numberOrNull(form.endYear)
    const endMonth =
      form.isCurrent || endYear == null ? null : numberOrNull(form.endMonth)
    const endDay =
      form.isCurrent || endYear == null || endMonth == null
        ? null
        : numberOrNull(form.endDay)

    if (startMonth != null && (startMonth < 1 || startMonth > 12)) {
      notify.error('시작 월은 1~12 사이여야 합니다')
      return
    }
    if (startDay != null && (startDay < 1 || startDay > 31)) {
      notify.error('시작 일은 1~31 사이여야 합니다')
      return
    }
    if (endMonth != null && (endMonth < 1 || endMonth > 12)) {
      notify.error('종료 월은 1~12 사이여야 합니다')
      return
    }
    if (endDay != null && (endDay < 1 || endDay > 31)) {
      notify.error('종료 일은 1~31 사이여야 합니다')
      return
    }

    if (startYear != null && endYear != null) {
      const signedStart =
        (form.startEra === 'BC' ? -startYear : startYear) * 10000 +
        (startMonth ?? 1) * 100 +
        (startDay ?? 1)
      const signedEnd =
        (form.endEra === 'BC' ? -endYear : endYear) * 10000 +
        (endMonth ?? 12) * 100 +
        (endDay ?? 31)
      if (signedStart > signedEnd) {
        notify.error('시작 시점이 종료 시점보다 뒤일 수 없습니다')
        return
      }
    }

    if (
      form.headOfStateChoice === LEGACY_UNLINKED_TITLE ||
      (isDualExecutive && form.headOfGovernmentChoice === LEGACY_UNLINKED_TITLE)
    ) {
      notify.error(
        '수기 문자열 직함은 저장할 수 없습니다. 「카탈로그 정식 등록·연결」 버튼을 눌러 DB 직책 정본으로 먼저 연결해 주세요.',
      )
      return
    }

    const dto: UpdatePoliticalSystemInput = {
      name: textOrNull(form.name),
      ...(!historicalCountryId && countryId
        ? {
            countryId,
            historicalCountryId: form.historicalCountryId || null,
          }
        : {}),
      startEra: startYear == null ? null : form.startEra,
      startYear,
      startMonth,
      startDay,
      endEra: endYear == null ? null : form.endEra,
      endYear,
      endMonth,
      endDay,
      isCurrent: form.isCurrent,
      governmentForm: (form.governmentForm ||
        null) as UpdatePoliticalSystemInput['governmentForm'],
      legislatureType: (form.legislatureType ||
        null) as UpdatePoliticalSystemInput['legislatureType'],
      // 의회가 없거나 단원제면 상원 값은 저장하지 않는다 — 폼에서 감춘 값이
      // 뒤에 남아 조용히 되살아나는 일을 막는다
      lowerHouseName: hasLegislature ? textOrNull(form.lowerHouseName) : null,
      lowerHouseSeats: hasLegislature ? numberOrNull(form.lowerHouseSeats) : null,
      upperHouseName: isBicameral ? textOrNull(form.upperHouseName) : null,
      upperHouseSeats: isBicameral ? numberOrNull(form.upperHouseSeats) : null,
      lowerChamberId: hasLegislature ? form.lowerChamberId || null : null,
      upperChamberId: isBicameral ? form.upperChamberId || null : null,
      /*
       * 한 축에 값은 한 벌만 간다. 카탈로그를 골랐으면 id만, '카탈로그에 없음'이면
       * 자유입력만 — 둘을 함께 보내면 나중에 어느 쪽이 진실인지 알 수 없어진다.
       * (서버도 같은 규칙으로 한 번 더 정리한다.)
       */
      ...headAxisPayload('headOfState', form),
      ...(isDualExecutive
        ? headAxisPayload('headOfGovernment', form)
        : {
            headOfGovernmentPositionId: null,
            headOfGovernmentTitle: null,
            headOfGovernmentHasPower: null,
          }),
      stateStructure: (form.stateStructure ||
        null) as UpdatePoliticalSystemInput['stateStructure'],
      partySystem: (form.partySystem ||
        null) as UpdatePoliticalSystemInput['partySystem'],
      headSelectionMethod: (form.headSelectionMethod ||
        null) as UpdatePoliticalSystemInput['headSelectionMethod'],
      headOfStateTermYears: numberOrNull(form.headOfStateTermYears),
      headOfStateTermLimit: numberOrNull(form.headOfStateTermLimit),
      lowerHouseTermYears: hasLegislature
        ? numberOrNull(form.lowerHouseTermYears)
        : null,
      upperHouseTermYears: isBicameral
        ? numberOrNull(form.upperHouseTermYears)
        : null,
      electoralSystem: (hasLegislature && form.electoralSystem
        ? form.electoralSystem
        : null) as UpdatePoliticalSystemInput['electoralSystem'],
      electoralThresholdPercent: hasLegislature
        ? floatOrNull(form.electoralThresholdPercent)
        : null,
      warPowerAuthority: (form.warPowerAuthority ||
        null) as UpdatePoliticalSystemInput['warPowerAuthority'],
      warConsentChamberId:
        hasLegislature && form.warConsentChamberId
          ? form.warConsentChamberId
          : null,
      commanderInChiefPositionId: form.commanderInChiefPositionId || null,
      warPowerNotes: textOrNull(form.warPowerNotes),
      constitutionLawId: form.constitutionLawId || null,
      foundingEventId: form.foundingEventId || null,
      notes: textOrNull(form.notes),
    }

    setSaving(true)
    try {
      await onSubmit(dto)
    } catch {
      notify.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  /* ── 날짜: 사건 등록 모달과 같은 한 칸 날짜 + 달력 드롭다운 ── */
  const startAnchorId = useId()
  const endAnchorId = useId()
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pickerParts =
    activeDatePicker === 'end'
      ? { era: form.endEra, year: form.endYear, month: form.endMonth, day: form.endDay }
      : { era: form.startEra, year: form.startYear, month: form.startMonth, day: form.startDay }
  const pickerInitialDate = buildPartialDateString(pickerParts) || undefined
  const pickerInitialPrecision: DatePickerPrecision | null = pickerParts.day.trim()
    ? 'day'
    : pickerParts.month.trim()
      ? 'month'
      : pickerParts.year.trim()
        ? 'year'
        : null
  const applyPickedDate = (isoString: string, precision: DatePickerPrecision) => {
    if (!activeDatePicker) return
    const parsed = parsePartialDateString(isoString)
    const month = precision === 'year' ? '' : parsed.month
    const day = precision === 'day' ? parsed.day : ''
    setForm((prev) =>
      activeDatePicker === 'start'
        ? { ...prev, startEra: parsed.era, startYear: parsed.year, startMonth: month, startDay: day }
        : { ...prev, endEra: parsed.era, endYear: parsed.year, endMonth: month, endDay: day, isCurrent: false },
    )
    setActiveDatePicker(null)
  }

  const isDateInverted = (() => {
    const startYear = numberOrNull(form.startYear)
    const endYear = form.isCurrent ? null : numberOrNull(form.endYear)
    if (startYear == null || endYear == null) return false
    const startKey =
      (form.startEra === 'BC' ? -startYear : startYear) * 10000 +
      (numberOrNull(form.startMonth) ?? 1) * 100 +
      (numberOrNull(form.startDay) ?? 1)
    const endKey =
      (form.endEra === 'BC' ? -endYear : endYear) * 10000 +
      (numberOrNull(form.endMonth) ?? 12) * 100 +
      (numberOrNull(form.endDay) ?? 31)
    return startKey > endKey
  })()

  useModalSubmitShortcut({
    enabled: open && !saving && activeDatePicker === null,
    scrollContainerRef: scrollRef,
    onSubmit: () => {
      void handleSubmit()
    },
  })

  /* 소속 — 현대 국가 본국 + 연결된 과거 국가(일본 / 일본 제국 / 도쿠가와 막부) 칩 */
  const polityOptions: ChoiceChipOption[] =
    !historicalCountryId && linkedHistoricalCountries.length > 0
      ? [
          { value: '__MODERN__', label: countryName ? `${countryName} (현대)` : '현대 국가' },
          ...linkedHistoricalCountries.map((hcItem) => ({ value: hcItem.id, label: hcItem.name })),
        ]
      : []

  const openQuickPositionCreator = (
    axis: HeadAxis,
    initialTitleText = '',
  ) => {
    const wantsMonarch =
      axis === 'HEAD_OF_STATE' &&
      (form.governmentForm === 'CONSTITUTIONAL_MONARCHY' ||
        form.governmentForm === 'ABSOLUTE_MONARCHY')
    const trimmed = initialTitleText.trim()
    setQuickPosCreator({
      axis,
      title: trimmed,
      titleLocal: '',
      isMonarchical: wantsMonarch,
      scoped:
        Boolean(effectiveCountryIdForDefs || effectiveHistoricalCountryId) &&
        (!trimmed || !UNIVERSAL_HEAD_TITLES.has(trimmed)),
      saving: false,
    })
  }

  const submitQuickPositionCreator = async () => {
    if (!quickPosCreator) return
    const trimmedTitle = quickPosCreator.title.trim()
    if (!trimmedTitle) {
      notify.error('등록할 수반 직위명을 입력해 주세요.')
      return
    }
    const existingHit = definitions.find(
      (d) =>
        !d.isGeneric &&
        d.positionType === quickPosCreator.axis &&
        d.title.trim() === trimmedTitle,
    )
    if (existingHit) {
      if (quickPosCreator.axis === 'HEAD_OF_STATE') {
        userTouchedHosRef.current = true
        setForm((prev) => ({
          ...prev,
          headOfStateChoice: existingHit.id,
          headOfStateTitle: '',
        }))
      } else {
        userTouchedHogRef.current = true
        setForm((prev) => ({
          ...prev,
          headOfGovernmentChoice: existingHit.id,
          headOfGovernmentTitle: '',
        }))
      }
      setQuickPosCreator(null)
      notify.success(`이미 관직 카탈로그에 있는 「${trimmedTitle}」 직위를 선택했습니다.`)
      return
    }

    setQuickPosCreator((prev) => (prev ? { ...prev, saving: true } : null))
    try {
      const created = (await personCareerApi.createPositionDefinition({
        title: trimmedTitle,
        titleLocal: quickPosCreator.titleLocal.trim() || null,
        positionType: quickPosCreator.axis,
        rank: quickPosCreator.axis === 'HEAD_OF_STATE' ? 1 : 2,
        isMonarchical:
          quickPosCreator.axis === 'HEAD_OF_STATE'
            ? quickPosCreator.isMonarchical
            : false,
      })) as { id?: string } | null
      if (!created?.id) {
        throw new Error('직위 정의 생성에 실패했습니다.')
      }

      const shouldAttachScope =
        quickPosCreator.scoped &&
        !UNIVERSAL_HEAD_TITLES.has(trimmedTitle) &&
        Boolean(effectiveCountryIdForDefs || effectiveHistoricalCountryId)
      if (shouldAttachScope) {
        await personCareerApi.addPositionDefinitionScope(created.id, {
          countryId: effectiveCountryIdForDefs || null,
          historicalCountryId: effectiveHistoricalCountryId || null,
          note: `${trimmedTitle} (정체 수반 직위 등록)`,
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['position-definitions'] })
      if (quickPosCreator.axis === 'HEAD_OF_STATE') {
        userTouchedHosRef.current = true
        setForm((prev) => ({
          ...prev,
          headOfStateChoice: created.id!,
          headOfStateTitle: '',
        }))
      } else {
        userTouchedHogRef.current = true
        setForm((prev) => ({
          ...prev,
          headOfGovernmentChoice: created.id!,
          headOfGovernmentTitle: '',
        }))
      }
      setQuickPosCreator(null)
      notify.success(`「${trimmedTitle}」 직위를 카탈로그에 등록하고 선택했습니다.`)
    } catch {
      setQuickPosCreator((prev) => (prev ? { ...prev, saving: false } : null))
      notify.error('수반 직위 카탈로그 등록에 실패했습니다.')
    }
  }

  const submitQuickChamberCreator = async () => {
    if (!quickChamberCreator) return
    const trimmedName = quickChamberCreator.name.trim()
    if (!trimmedName) {
      notify.error('등록할 의회 원 이름을 입력해 주세요.')
      return
    }
    if (!chamberScope.countryId && !chamberScope.historicalCountryId) {
      notify.error('소속 국가 정보가 없어 의회 원을 생성할 수 없습니다.')
      return
    }
    setQuickChamberCreator((prev) => (prev ? { ...prev, saving: true } : null))
    try {
      const side = quickChamberCreator.side
      const role = isBicameral
        ? side === 'upper'
          ? 'UPPER'
          : 'LOWER'
        : 'UNICAMERAL'
      const created = await chamberApi.create({
        name: trimmedName,
        localName: quickChamberCreator.localName.trim() || null,
        role,
        countryId: chamberScope.countryId,
        historicalCountryId: chamberScope.historicalCountryId,
      })
      const seatsRaw =
        side === 'lower' ? form.lowerHouseSeats : form.upperHouseSeats
      const parsedSeats = numberOrNull(seatsRaw)
      const parsedStartY = numberOrNull(form.startYear)
      if (parsedSeats != null && parsedSeats > 0) {
        try {
          await chamberApi.createSize(created.id, {
            seats: parsedSeats,
            start:
              parsedStartY != null
                ? {
                    era: form.startEra,
                    year: parsedStartY,
                    month: numberOrNull(form.startMonth) ?? undefined,
                    day: numberOrNull(form.startDay) ?? undefined,
                  }
                : null,
          })
        } catch {
          // 정원 부가 생성 실패 시 원 본체 연결은 유지
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['chambers'] })
      if (side === 'lower') {
        userTouchedLowerChamberRef.current = true
      } else {
        userTouchedUpperChamberRef.current = true
      }
      setForm((prev) => ({
        ...prev,
        [`${side}ChamberId`]: created.id,
        [`${side}HouseName`]: chamberLabel(created),
      }))
      setQuickChamberCreator(null)
      notify.success(`「${trimmedName}」 의회 원을 등록하고 연결했습니다.`)
    } catch {
      setQuickChamberCreator((prev) =>
        prev ? { ...prev, saving: false } : null,
      )
      notify.error('의회 원 등록에 실패했습니다.')
    }
  }

  const headOptions = (axis: HeadAxis): SearchableSelectOption[] => {
    const wantsMonarch =
      form.governmentForm === 'CONSTITUTIONAL_MONARCHY' ||
      form.governmentForm === 'ABSOLUTE_MONARCHY'
    return [
      ...optionsFor(axis).map((def) => {
        const scoped = isDefinitionScopedToCountry(def)
        const groupLabel =
          axis === 'HEAD_OF_GOVERNMENT'
            ? scoped
              ? '이 국가 전용 정부수반'
              : '보편 정부수반 카테고리'
            : isMonarchicalDef(def)
              ? scoped
                ? '이 국가 전용 군주·원수'
                : '군주·왕실 칭호 카테고리'
              : scoped
                ? '이 국가 전용 국가원수'
                : wantsMonarch
                  ? '공화·기타 원수 카테고리'
                  : '국가원수·수반 카테고리'
        return {
          value: def.id,
          label: def.title,
          meta: def.titleLocal ?? def.titleEn ?? undefined,
          group: groupLabel,
        }
      }),
      {
        value: CREATE_POSITION_SENTINEL,
        label: '+ 새 수반 직위를 카탈로그에 등록 후 선택',
        group: '관직 카탈로그 추가',
      },
    ]
  }

  const chamberChips = (side: 'lower' | 'upper'): ChoiceChipOption[] =>
    chambers
      .filter((chamber) =>
        side === 'upper' ? chamber.role === 'UPPER' || chamber.role === 'OTHER' : chamber.role !== 'UPPER',
      )
      .map((chamber) => ({ value: chamber.id, label: chamberLabel(chamber) }))

  const renderHouse = (side: 'lower' | 'upper') => {
    const chamberId = side === 'lower' ? form.lowerChamberId : form.upperChamberId
    const nameKey = side === 'lower' ? 'lowerHouseName' : 'upperHouseName'
    const seatsKey = side === 'lower' ? 'lowerHouseSeats' : 'upperHouseSeats'
    const label = side === 'lower' ? primaryHouseLabel(legislature) : '상원'
    const chips = chamberChips(side)
    const isCreatingThisHouse = quickChamberCreator?.side === side
    const hasLegacyUnlinkedName = Boolean(!chamberId && form[nameKey].trim())
    return (
      <FieldRow>
        <FieldLabel as="div">
          {label} <OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <InlineCatalogBar>
            {chips.length > 0 ? (
              <ChoiceChips
                ariaLabel={`${label} — 원 카탈로그`}
                options={chips}
                value={chamberId}
                allowDeselect
                onChange={(nextId) => {
                  if (side === 'lower') userTouchedLowerChamberRef.current = true
                  else userTouchedUpperChamberRef.current = true
                  if (nextId) {
                    pickChamber(side, nextId)
                  } else {
                    setForm((prev) => ({
                      ...prev,
                      [`${side}ChamberId`]: '',
                      [nameKey]: '',
                    }))
                  }
                }}
              />
            ) : (
              <FieldHint style={{ margin: 0 }}>
                등록된 의회 원이 없습니다. 정식 원(Chamber)으로 등록해 연결하세요.
              </FieldHint>
            )}
            {!isCreatingThisHouse ? (
              <InlineQuickAddBtn
                type="button"
                onClick={() =>
                  setQuickChamberCreator({
                    side,
                    name: hasLegacyUnlinkedName ? form[nameKey].trim() : '',
                    localName: '',
                    saving: false,
                  })
                }
              >
                <FiPlus size={12} aria-hidden />새 {label} 원 등록
              </InlineQuickAddBtn>
            ) : null}
          </InlineCatalogBar>

          {hasLegacyUnlinkedName && !isCreatingThisHouse ? (
            <LegacyPromoteNotice>
              <span>
                현재 수기 이름 <strong>「{form[nameKey].trim()}」</strong>만 저장되어 있습니다.
              </span>
              <InlineQuickAddBtn
                type="button"
                onClick={() =>
                  setQuickChamberCreator({
                    side,
                    name: form[nameKey].trim(),
                    localName: '',
                    saving: false,
                  })
                }
              >
                정식 의회 원(Chamber)으로 전환
              </InlineQuickAddBtn>
            </LegacyPromoteNotice>
          ) : null}

          {isCreatingThisHouse && quickChamberCreator ? (
            <InlineCreatorCard>
              <SubFieldPair $cols={2}>
                <SubField>
                  <SubFieldLabel>{label} 명칭 *</SubFieldLabel>
                  <Input
                    value={quickChamberCreator.name}
                    onChange={(ev) =>
                      setQuickChamberCreator((prev) =>
                        prev ? { ...prev, name: ev.target.value } : null,
                      )
                    }
                    placeholder={
                      side === 'upper'
                        ? '예: 참의원 · 상원 · 귀족원'
                        : isBicameral
                          ? '예: 중의원 · 하원 · 국민의회'
                          : '예: 국회 · 최고인민회의'
                    }
                  />
                </SubField>
                <SubField>
                  <SubFieldLabel>원어 표기 (선택)</SubFieldLabel>
                  <Input
                    value={quickChamberCreator.localName}
                    onChange={(ev) =>
                      setQuickChamberCreator((prev) =>
                        prev ? { ...prev, localName: ev.target.value } : null,
                      )
                    }
                    placeholder="예: Senate · 衆議院"
                  />
                </SubField>
              </SubFieldPair>
              <InlineCreatorFooter>
                <SplitToggleBtn
                  type="button"
                  onClick={() => setQuickChamberCreator(null)}
                >
                  취소
                </SplitToggleBtn>
                <InlineSaveMiniBtn
                  type="button"
                  disabled={quickChamberCreator.saving}
                  onClick={() => void submitQuickChamberCreator()}
                >
                  <FiCheck size={12} aria-hidden />
                  {quickChamberCreator.saving ? '등록 중...' : '원 등록 후 연결'}
                </InlineSaveMiniBtn>
              </InlineCreatorFooter>
            </InlineCreatorCard>
          ) : null}

          <SubFieldPair $cols={2}>
            <SubField>
              <SubFieldLabel>정체 기준 의석 정원 (선택)</SubFieldLabel>
              <Input
                inputMode="numeric"
                value={form[seatsKey]}
                onChange={(event) =>
                  set(seatsKey, event.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder={side === 'upper' ? '예: 100' : '예: 300'}
              />
            </SubField>
          </SubFieldPair>
        </FieldControl>
      </FieldRow>
    )
  }

  const renderHead = (axis: 'headOfState' | 'headOfGovernment') => {
    const isState = axis === 'headOfState'
    const axisKey: HeadAxis = isState ? 'HEAD_OF_STATE' : 'HEAD_OF_GOVERNMENT'
    const choice = isState ? form.headOfStateChoice : form.headOfGovernmentChoice
    const title = isState ? form.headOfStateTitle : form.headOfGovernmentTitle
    const hasPower = isState ? form.headOfStateHasPower : form.headOfGovernmentHasPower
    const label = isState
      ? isDualExecutive
        ? '국가원수'
        : form.governmentForm === 'ABSOLUTE_MONARCHY'
          ? '군주'
          : '수반'
      : '정부수반'
    const placeholder = isState
      ? isDualExecutive
        ? '관직 카탈로그에서 선택 (예: 대통령 · 국왕 · 천황 · 황제)'
        : '관직 카탈로그에서 선택 (예: 대통령 · 국왕 · 황제)'
      : '관직 카탈로그에서 선택 (예: 총리 · 국무총리 · 내각총리대신)'
    const isCreatingThisAxis = quickPosCreator?.axis === axisKey
    const isLegacyUnlinked = choice === LEGACY_UNLINKED_TITLE && Boolean(title.trim())

    return (
      <FieldRow>
        <FieldLabel as="div">
          {label} 직위 <OptionalTag>(카탈로그)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <HeadSelectRow>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <SearchableSelect
                options={headOptions(axisKey)}
                value={isLegacyUnlinked ? '' : choice}
                onChange={(nextValue) => {
                  if (nextValue === CREATE_POSITION_SENTINEL) {
                    openQuickPositionCreator(axisKey)
                    return
                  }
                  if (isState) {
                    userTouchedHosRef.current = true
                    setForm((prev) => ({
                      ...prev,
                      headOfStateChoice: nextValue,
                      headOfStateTitle: '',
                    }))
                  } else {
                    userTouchedHogRef.current = true
                    setForm((prev) => ({
                      ...prev,
                      headOfGovernmentChoice: nextValue,
                      headOfGovernmentTitle: '',
                    }))
                  }
                }}
                placeholder={
                  isLegacyUnlinked
                    ? `수기 저장됨: ${title} (카탈로그 직위로 변경 권장)`
                    : placeholder
                }
                searchPlaceholder="등록된 수반 직위 검색..."
                ariaLabel={`${label} 직함`}
                clearable
                emptyMessage="등록된 수반 카테고리가 없습니다. 우측 버튼으로 새 직위를 추가하세요."
              />
            </div>
            {!isCreatingThisAxis ? (
              <>
                <InlineQuickAddBtn
                  type="button"
                  onClick={() =>
                    openQuickPositionCreator(
                      axisKey,
                      isLegacyUnlinked ? title : '',
                    )
                  }
                >
                  <FiPlus size={12} aria-hidden />새 직위 등록
                </InlineQuickAddBtn>
                <InlineQuickAddBtn
                  as="a"
                  href="/government/positions"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                  title="관직·직책 정본 관리 페이지 새 탭에서 열기"
                >
                  정본 관리 ↗
                </InlineQuickAddBtn>
              </>
            ) : null}
          </HeadSelectRow>

          {isLegacyUnlinked && !isCreatingThisAxis ? (
            <LegacyPromoteNotice>
              <span>
                현재 수기 문자열 <strong>「{title}」</strong>로 저장되어 있어 행정부·수반 등록 시 정본 FK로 연결되지 않습니다.
              </span>
              <InlineQuickAddBtn
                type="button"
                onClick={() => openQuickPositionCreator(axisKey, title)}
              >
                「{title}」 카탈로그 정식 등록·연결
              </InlineQuickAddBtn>
            </LegacyPromoteNotice>
          ) : null}

          {isCreatingThisAxis && quickPosCreator ? (
            <InlineCreatorCard>
              <SubFieldPair $cols={2}>
                <SubField>
                  <SubFieldLabel>{label} 직위명 *</SubFieldLabel>
                  <Input
                    value={quickPosCreator.title}
                    onChange={(ev) => {
                      const nextVal = ev.target.value
                      setQuickPosCreator((prev) =>
                        prev
                          ? {
                              ...prev,
                              title: nextVal,
                              scoped:
                                Boolean(
                                  effectiveCountryIdForDefs ||
                                    effectiveHistoricalCountryId,
                                ) && !UNIVERSAL_HEAD_TITLES.has(nextVal.trim()),
                            }
                          : null,
                      )
                    }}
                    placeholder={
                      isState
                        ? '예: 국가주석 · 연방대통령 · 최고회의 의장'
                        : '예: 내각총리대신 · 연방총리 · 국무원 총리'
                    }
                  />
                </SubField>
                <SubField>
                  <SubFieldLabel>원어·영문 표기 (선택)</SubFieldLabel>
                  <Input
                    value={quickPosCreator.titleLocal}
                    onChange={(ev) =>
                      setQuickPosCreator((prev) =>
                        prev ? { ...prev, titleLocal: ev.target.value } : null,
                      )
                    }
                    placeholder="예: Bundeskanzler · 内閣総理大臣"
                  />
                </SubField>
              </SubFieldPair>
              <InlineCreatorChecks>
                {isState ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={quickPosCreator.isMonarchical}
                      onChange={(ev) =>
                        setQuickPosCreator((prev) =>
                          prev
                            ? { ...prev, isMonarchical: ev.target.checked }
                            : null,
                        )
                      }
                    />
                    <span>군주·왕실 칭호 (재위로 분류)</span>
                  </label>
                ) : null}
                {effectiveCountryIdForDefs || effectiveHistoricalCountryId ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={quickPosCreator.scoped}
                      onChange={(ev) =>
                        setQuickPosCreator((prev) =>
                          prev ? { ...prev, scoped: ev.target.checked } : null,
                        )
                      }
                    />
                    <span>이 국가·시대 전용 직위로 등록</span>
                  </label>
                ) : null}
              </InlineCreatorChecks>
              <InlineCreatorFooter>
                <SplitToggleBtn
                  type="button"
                  onClick={() => setQuickPosCreator(null)}
                >
                  취소
                </SplitToggleBtn>
                <InlineSaveMiniBtn
                  type="button"
                  disabled={quickPosCreator.saving}
                  onClick={() => void submitQuickPositionCreator()}
                >
                  <FiCheck size={12} aria-hidden />
                  {quickPosCreator.saving
                    ? '등록 중...'
                    : '카탈로그 등록 후 선택'}
                </InlineSaveMiniBtn>
              </InlineCreatorFooter>
            </InlineCreatorCard>
          ) : null}

          {choice && choice !== CREATE_POSITION_SENTINEL && (isDualExecutive || !isState) ? (
            <ChoiceChips
              ariaLabel={`${label} 실권`}
              options={POWER_OPTIONS}
              value={hasPower ? 'power' : 'symbolic'}
              onChange={(next) =>
                set(isState ? 'headOfStateHasPower' : 'headOfGovernmentHasPower', next !== 'symbolic')
              }
            />
          ) : null}
        </FieldControl>
      </FieldRow>
    )
  }

  const title = `${editing ? '정체 수정' : '정체 추가'}${countryName ? ` · ${countryName}` : ''}`

  return (
    <RegisterModal
      isOpen={open}
      onClose={onClose}
      title={title}
      maxWidth="min(1040px, 96vw)"
      minHeight="80vh"
      fullBleedOnMobile
      /* 바깥을 누르면 닫는다 — 저장 중이거나 달력이 떠 있을 땐(그 바깥 클릭은 달력만 닫아야) 막는다 */
      closeOnOverlayClick={!saving && activeDatePicker === null}
      closeOnEsc={!saving && activeDatePicker === null}
    >
      <PersonRegisterModalFormScroll ref={scrollRef}>
        {saving ? (
          <KitBusyBar role="status" aria-live="polite">
            {editing ? '수정 사항을 저장하는 중...' : '정체를 등록하는 중...'}
          </KitBusyBar>
        ) : null}
        <LabeledRowsWrap>
          {/* ① 이름 · 소속 · 기간 */}
          <FormGroup>
            <FormGroupTitle>이름 · 소속 · 기간</FormGroupTitle>
            <FieldRow>
              <FieldLabel htmlFor="political-system-name">
                이름 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <Input
                  id="political-system-name"
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="제5공화국 · 바이마르 공화국 · 메이지 헌법 체제"
                />
                <FieldHint>비우면 정부 형태(예: 의원내각제)가 이름 대신 쓰입니다.</FieldHint>
              </FieldControl>
            </FieldRow>

            {polityOptions.length > 0 ? (
              <FieldRow>
                <FieldLabel as="div">소속 시대 · 국가</FieldLabel>
                <FieldControl>
                  <ChoiceChips
                    ariaLabel="소속 시대 및 국가"
                    options={polityOptions}
                    value={form.historicalCountryId || '__MODERN__'}
                    onChange={(next) => {
                      const nextHcId = next === '__MODERN__' ? '' : next
                      setForm((prev) => {
                        let updated: FormState = {
                          ...prev,
                          historicalCountryId: nextHcId,
                        }
                        if (!editing && nextHcId) {
                          const hc = linkedHistoricalCountries.find(
                            (item) => item.id === nextHcId,
                          ) as
                            | {
                                id: string
                                stateType?: string | null
                                startEra?: 'BC' | 'AD' | null
                                startYear?: number | null
                                endEra?: 'BC' | 'AD' | null
                                endYear?: number | null
                              }
                            | undefined
                          if (hc) {
                            if (!updated.startYear && hc.startYear != null) {
                              updated.startEra = hc.startEra === 'BC' ? 'BC' : 'AD'
                              updated.startYear = String(Math.abs(hc.startYear))
                            }
                            if (!updated.endYear && hc.endYear != null) {
                              updated.endEra = hc.endEra === 'BC' ? 'BC' : 'AD'
                              updated.endYear = String(Math.abs(hc.endYear))
                              updated.isCurrent = false
                            }
                            const preset = presetFromHistoricalStateType(
                              hc.stateType,
                            )
                            if (!updated.stateStructure && preset.stateStructure) {
                              updated.stateStructure = preset.stateStructure
                            }
                            if (!updated.governmentForm && preset.governmentForm) {
                              updated = applyGovernmentFormDefaults(
                                preset.governmentForm,
                                updated,
                                definitions,
                              )
                            }
                          }
                        }
                        return updated
                      })
                    }}
                  />
                </FieldControl>
              </FieldRow>
            ) : null}

            <FieldRow>
              <FieldLabel as="div">기간</FieldLabel>
              <FieldControl>
                <DateRangeGrid>
                  <SubField>
                    {/* 끝 쪽 머리엔 '지금도 이 정체' 칩이 서서 높이가 다르다 — 같은 머리 높이로 두 칸 날짜를 한 줄에 */}
                    <SubFieldHead>
                      <SubFieldLabel>시작</SubFieldLabel>
                    </SubFieldHead>
                    <InlineDateField
                      appearance="field"
                      anchorId={startAnchorId}
                      pickerOpen={activeDatePicker === 'start'}
                      era={form.startEra}
                      year={form.startYear}
                      month={form.startMonth}
                      day={form.startDay}
                      onEra={(era) => set('startEra', era)}
                      onYear={(value) => set('startYear', value)}
                      onMonth={(value) => set('startMonth', value)}
                      onDay={(value) => set('startDay', value)}
                      onOpenPicker={() => setActiveDatePicker('start')}
                      ariaLabel="정체 시작일"
                    />
                  </SubField>
                  <SubField>
                    <SubFieldHead>
                      <SubFieldLabel>
                        끝 <OptionalTag>{form.isCurrent ? '(현행)' : '(모르면 비움)'}</OptionalTag>
                      </SubFieldLabel>
                      <KitChoiceChip
                        type="button"
                        $selected={form.isCurrent}
                        aria-pressed={form.isCurrent}
                        onClick={() =>
                          setForm((prev) =>
                            prev.isCurrent
                              ? { ...prev, isCurrent: false }
                              : { ...prev, isCurrent: true, endYear: '', endMonth: '', endDay: '' },
                          )
                        }
                      >
                        지금도 이 정체
                      </KitChoiceChip>
                    </SubFieldHead>
                    <InlineDateField
                      appearance="field"
                      anchorId={endAnchorId}
                      pickerOpen={activeDatePicker === 'end'}
                      era={form.endEra}
                      year={form.endYear}
                      month={form.endMonth}
                      day={form.endDay}
                      onEra={(era) => set('endEra', era)}
                      onYear={(value) => set('endYear', value)}
                      onMonth={(value) => set('endMonth', value)}
                      onDay={(value) => set('endDay', value)}
                      onOpenPicker={() => setActiveDatePicker('end')}
                      disabled={form.isCurrent}
                      disabledLabel="현행 — 끝 없음"
                      error={isDateInverted}
                      ariaLabel="정체 종료일"
                    />
                  </SubField>
                </DateRangeGrid>
                {isDateInverted ? (
                  <AlertBox variant="danger" icon={<FiAlertCircle />}>
                    끝이 시작보다 앞섭니다. 기원(서기/기원전)과 연·월·일을 확인해 주세요.
                  </AlertBox>
                ) : null}
              </FieldControl>
            </FieldRow>
          </FormGroup>

          {/* ② 정부 형태 · 수반 — 형태를 고르면 수반 칸 구성(겸임/이원)과 실권 기본값이 따라온다 */}
          <FormGroup>
            <FormGroupTitle>정부 형태 · 수반</FormGroupTitle>
            <FieldRow>
              <FieldLabel as="div">
                정부 형태 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="정부 형태"
                  groups={GOVERNMENT_FORM_GROUPS}
                  value={form.governmentForm as GovernmentForm | ''}
                  allowDeselect
                  onChange={(next) =>
                    setForm((prev) =>
                      applyGovernmentFormDefaults(next, prev, definitions, {
                        preserveManualHos: userTouchedHosRef.current,
                        preserveManualHog: userTouchedHogRef.current,
                      }),
                    )
                  }
                />
              </FieldControl>
            </FieldRow>

            {renderHead('headOfState')}
            {isDualExecutive ? renderHead('headOfGovernment') : null}

            <FieldRow>
              <FieldLabel as="div">
                원수 선출·계승 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="국가원수 선출·계승 방식"
                  options={HEAD_SELECTION_OPTIONS}
                  value={form.headSelectionMethod as HeadSelectionMethod | ''}
                  allowDeselect
                  onChange={(next) => set('headSelectionMethod', next)}
                />
                {form.headSelectionMethod !== 'HEREDITARY' ? (
                  <SubFieldPair $cols={2}>
                    <SubField>
                      <SubFieldLabel>법정 임기(년)</SubFieldLabel>
                      <Input
                        inputMode="numeric"
                        value={form.headOfStateTermYears}
                        onChange={(event) =>
                          set(
                            'headOfStateTermYears',
                            event.target.value.replace(/[^0-9]/g, ''),
                          )
                        }
                        placeholder="예: 5 (5년) · 4 (4년)"
                      />
                    </SubField>
                    <SubField>
                      <SubFieldLabel>중임 상한(회)</SubFieldLabel>
                      <Input
                        inputMode="numeric"
                        value={form.headOfStateTermLimit}
                        onChange={(event) =>
                          set(
                            'headOfStateTermLimit',
                            event.target.value.replace(/[^0-9]/g, ''),
                          )
                        }
                        placeholder="1=단임 · 2=중임1회 · 비움=무제한"
                      />
                    </SubField>
                  </SubFieldPair>
                ) : null}
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <span aria-hidden />
              <FieldControl>
                <SplitRow>
                  <FieldHint>
                    {isDualExecutive
                      ? '국가원수와 정부수반이 나뉜 이원 체제입니다.'
                      : '국가원수와 정부수반을 한 사람이 겸합니다.'}{' '}
                    고른 직함은 행정부 · 수반 등록과 이어집니다.
                  </FieldHint>
                  {!isDualExecutive ? (
                    <SplitToggleBtn type="button" onClick={() => setForceSplitExecutive(true)}>
                      + 정부수반 따로 지정
                    </SplitToggleBtn>
                  ) : !isNaturallyDualExecutive ? (
                    <SplitToggleBtn
                      type="button"
                      onClick={() => {
                        setForceSplitExecutive(false)
                        setForm((prev) => ({ ...prev, headOfGovernmentChoice: '', headOfGovernmentTitle: '' }))
                      }}
                    >
                      겸임으로 합치기
                    </SplitToggleBtn>
                  ) : null}
                </SplitRow>
              </FieldControl>
            </FieldRow>
          </FormGroup>

          {/* ③ 입법부 — 양원제일 때만 상원 칸이 열린다 */}
          <FormGroup>
            <FormGroupTitle>입법부</FormGroupTitle>
            <FieldRow>
              <FieldLabel as="div">
                의회 구성 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="의회 구성"
                  options={LEGISLATURE_OPTIONS}
                  value={form.legislatureType as LegislatureType | ''}
                  allowDeselect
                  onChange={(next) => set('legislatureType', next)}
                />
              </FieldControl>
            </FieldRow>
            {hasLegislature && form.legislatureType ? renderHouse('lower') : null}
            {isBicameral ? renderHouse('upper') : null}
            {hasLegislature && form.legislatureType ? (
              <>
                <FieldRow>
                  <FieldLabel as="div">
                    의원 법정 임기 <OptionalTag>(선택)</OptionalTag>
                  </FieldLabel>
                  <FieldControl>
                    <SubFieldPair
                      style={
                        isBicameral ? undefined : { gridTemplateColumns: '1fr' }
                      }
                    >
                      <SubField>
                        <SubFieldLabel>
                          {primaryHouseLabel(legislature)} 임기(년)
                        </SubFieldLabel>
                        <Input
                          inputMode="numeric"
                          value={form.lowerHouseTermYears}
                          onChange={(event) =>
                            set(
                              'lowerHouseTermYears',
                              event.target.value.replace(/[^0-9]/g, ''),
                            )
                          }
                          placeholder="예: 4 (4년) · 2 (미국 하원)"
                        />
                      </SubField>
                      {isBicameral ? (
                        <SubField>
                          <SubFieldLabel>상원 임기(년)</SubFieldLabel>
                          <Input
                            inputMode="numeric"
                            value={form.upperHouseTermYears}
                            onChange={(event) =>
                              set(
                                'upperHouseTermYears',
                                event.target.value.replace(/[^0-9]/g, ''),
                              )
                            }
                            placeholder="예: 6 (참의원·미국 상원)"
                          />
                        </SubField>
                      ) : null}
                    </SubFieldPair>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel as="div">
                    선거제도·봉쇄조항 <OptionalTag>(선택)</OptionalTag>
                  </FieldLabel>
                  <FieldControl>
                    <ChoiceChips
                      ariaLabel="주 선거제도"
                      options={ELECTORAL_SYSTEM_OPTIONS}
                      value={form.electoralSystem as ElectoralSystemType | ''}
                      allowDeselect
                      onChange={(next) => set('electoralSystem', next)}
                    />
                    <SubFieldPair $cols={2}>
                      <SubField>
                        <SubFieldLabel>봉쇄조항 기준 득표율(%)</SubFieldLabel>
                        <Input
                          inputMode="decimal"
                          value={form.electoralThresholdPercent}
                          onChange={(event) =>
                            set(
                              'electoralThresholdPercent',
                              event.target.value.replace(/[^0-9.]/g, ''),
                            )
                          }
                          placeholder="예: 3 (대한민국 3%) · 5 (독일 5%)"
                        />
                      </SubField>
                    </SubFieldPair>
                  </FieldControl>
                </FieldRow>
              </>
            ) : null}
          </FormGroup>

          {/* ④ 국가 구조 · 정당제 · 헌정 근거 · 설명 */}
          <FormGroup>
            <FormGroupTitle>국가 구조 · 정당제 · 헌정 근거</FormGroupTitle>
            <FieldRow>
              <FieldLabel as="div">
                국가 구조 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="국가 구조"
                  options={STATE_STRUCTURE_OPTIONS}
                  value={form.stateStructure}
                  allowDeselect
                  onChange={(next) => set('stateStructure', next)}
                />
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel as="div">
                정당제 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="정당제"
                  options={PARTY_SYSTEM_OPTIONS}
                  value={form.partySystem}
                  allowDeselect
                  onChange={(next) => set('partySystem', next)}
                />
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel as="div">
                개전·통수권 <OptionalTag>(헌법 규칙)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <ChoiceChips
                  ariaLabel="개전·선전포고권 소재"
                  options={WAR_POWER_AUTHORITY_OPTIONS}
                  value={form.warPowerAuthority as WarPowerAuthority | ''}
                  allowDeselect
                  onChange={(next) => set('warPowerAuthority', next)}
                />
                <SubFieldPair $cols={2}>
                  <SubField>
                    <SubFieldLabel>군 최고통수권자 직위 (선택)</SubFieldLabel>
                    <SearchableSelect
                      options={definitions
                        .filter(
                          (def) =>
                            !def.isGeneric &&
                            (def.positionType === 'HEAD_OF_STATE' ||
                              def.positionType === 'HEAD_OF_GOVERNMENT' ||
                              def.positionType === 'MILITARY_COMMANDER'),
                        )
                        .map((def) => ({
                          value: def.id,
                          label: def.title,
                          meta: def.titleLocal ?? def.titleEn ?? undefined,
                          group: isDefinitionScopedToCountry(def)
                            ? '이 국가 전용 직위'
                            : '보편 통수·수반 직위',
                        }))}
                      value={form.commanderInChiefPositionId}
                      onChange={(next) => set('commanderInChiefPositionId', next)}
                      placeholder="예: 대통령 · 황제 · 천황 · 최고사령관"
                      searchPlaceholder="통수권자 직위 검색..."
                      ariaLabel="군 최고통수권자 직위"
                      clearable
                    />
                  </SubField>
                  {hasLegislature &&
                  (form.warPowerAuthority === 'MONARCH_WITH_UPPER_HOUSE' ||
                    form.warPowerAuthority === 'LEGISLATURE_EXCLUSIVE' ||
                    form.warPowerAuthority ===
                      'EXECUTIVE_WITH_LEGISLATURE_CONSENT' ||
                    form.warConsentChamberId) ? (
                    <SubField>
                      <SubFieldLabel>선전포고 의결·동의 의회 원 (선택)</SubFieldLabel>
                      <SearchableSelect
                        options={chambers.map((ch) => ({
                          value: ch.id,
                          label: chamberLabel(ch),
                        }))}
                        value={form.warConsentChamberId}
                        onChange={(next) => set('warConsentChamberId', next)}
                        placeholder="예: 연방참의원 · 국회 · 상·하원"
                        searchPlaceholder="의회 원 검색..."
                        ariaLabel="선전포고 의결·동의 의회 원"
                        clearable
                      />
                    </SubField>
                  ) : null}
                </SubFieldPair>
                <Input
                  value={form.warPowerNotes}
                  onChange={(event) => set('warPowerNotes', event.target.value)}
                  placeholder="예외·단서 조항 (예: 제국 영토·해안 피침 시 연방참의원 동의 면제, 국왕 제청으로 의회 의결)"
                />
                <FieldHint>
                  이 헌정 체제에서 선전포고와 군 통수권이 누구에게 있는지 설정하면 국가 군사 탭의 개전 원장과 대조됩니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel as="div">
                근거 헌법·기본법 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <SearchableSelect
                  options={constitutionLawOptions}
                  value={form.constitutionLawId}
                  onChange={(next) => set('constitutionLawId', next)}
                  placeholder="제헌헌법 · 바이마르 헌법 · 경국대전 · 대일본제국헌법"
                  searchPlaceholder="법령명으로 검색..."
                  ariaLabel="근거 헌법·기본법"
                  clearable
                  emptyMessage="이 국가에 등록된 법령이 아직 없습니다 (법령 탭에서 등록 가능)"
                />
                <FieldHint>
                  이 헌정 체제의 법적 토대가 된 헌법·기본법·장전을 연결하면 정체와 법령 탭에서 양방향으로 이어집니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel htmlFor="political-system-founding-event">
                출범 계기 사건 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <LinkedEventPickerField
                  inputId="political-system-founding-event"
                  value={form.foundingEventId}
                  initialTitle={editing?.foundingEvent?.title ?? null}
                  nearYear={
                    numberOrNull(form.startYear) != null
                      ? form.startEra === 'BC'
                        ? -(numberOrNull(form.startYear) ?? 0)
                        : numberOrNull(form.startYear)
                      : null
                  }
                  onChange={(next) => set('foundingEventId', next)}
                />
                <FieldHint>
                  혁명·개헌·독립·정변 등 이 헌정 체제가 수립된 역사적 사건을 연결합니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel htmlFor="political-system-notes">
                설명 <OptionalTag>(선택)</OptionalTag>
              </FieldLabel>
              <FieldControl>
                <PersonRegisterModalTextarea
                  id="political-system-notes"
                  rows={5}
                  value={form.notes}
                  onChange={(event) => set('notes', event.target.value)}
                  placeholder="헌법 제정·개정 배경, 정체 전환의 계기, 권력 구조의 특징"
                />
              </FieldControl>
            </FieldRow>
          </FormGroup>
        </LabeledRowsWrap>
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={isDateInverted}>
          {isDateInverted ? (
            <span>기간을 확인해 주세요 — 끝이 시작보다 앞섭니다</span>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>{editing ? '수정 준비 완료' : '등록 준비 완료'}</FooterReadyBadge>
            </FooterReadyGroup>
          )}
        </FooterHint>
        <FooterActions>
          <PersonRegisterModalCancelBtn type="button" disabled={saving} onClick={onClose}>
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saving || isDateInverted}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {saving ? '저장 중...' : editing ? '변경사항 저장' : '정체 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>

      {activeDatePicker ? (
        <DatePickerModal
          isOpen
          onClose={() => setActiveDatePicker(null)}
          allowPartial
          initialDate={pickerInitialDate}
          initialPrecision={pickerInitialPrecision}
          anchorEl={
            typeof document !== 'undefined'
              ? document.getElementById(activeDatePicker === 'start' ? startAnchorId : endAnchorId)
              : null
          }
          onSelect={applyPickedDate}
        />
      ) : null}
    </RegisterModal>
  )
}

const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(226px, 1fr));
  gap: 12px 16px;
  min-width: 0;
`

const SubFieldHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
`

const SplitRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
`

const SplitToggleBtn = styled.button`
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const HeadSelectRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const InlineCatalogBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const InlineQuickAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.active};
    color: ${({ theme }) => theme.colors.active};
  }
`

const InlineCreatorCard = styled.div`
  margin-top: 6px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const InlineCreatorChecks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
`

const InlineCreatorFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
`

const InlineSaveMiniBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LegacyPromoteNotice = styled.div`
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
