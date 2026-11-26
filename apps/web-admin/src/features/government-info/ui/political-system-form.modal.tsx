import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiAlertCircle } from 'react-icons/fi'
import styled from 'styled-components'

import type {
  PoliticalSystem,
  UpdatePoliticalSystemInput,
} from '@/entities/political-system/api'
import {
  GOVERNMENT_FORM_LABEL,
  LEGISLATURE_TYPE_LABEL,
  LEGISLATURE_TYPE_ORDER,
  PARTY_SYSTEM_LABEL,
  PARTY_SYSTEM_ORDER,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
  STATE_STRUCTURE_ORDER,
  type GovernmentForm,
  type LegislatureType,
} from '@/entities/political-system/model/political-system'
import { chamberApi, chamberKeys, chamberLabel, chamberSeatsAt } from '@/shared/api/chamber'
import { personCareerApi } from '@/shared/api/person-career'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
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
  notes: '',
}

const toText = (value: unknown) => (value == null ? '' : String(value))

/**
 * '카탈로그에 없음' 센티널.
 *
 * 직함의 정본은 관직 정의 카탈로그(재임·재위가 참조하는 그 테이블)다. 그래도 자유입력을
 * 남겨 두는 이유 — '연합회의 의장'·'임시정부 수반'처럼 한 정체에서만 쓰인 칭호까지
 * 카탈로그에 올리면 다른 나라 직책 피커가 그만큼 지저분해진다.
 */
const CUSTOM_TITLE = '__custom__'

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
        ? CUSTOM_TITLE
        : '',
    headOfStateTitle: toText(system.headOfStateTitle),
    headOfStateHasPower: system.headOfStateHasPower ?? true,
    headOfGovernmentChoice: system.headOfGovernmentPositionId
      ? system.headOfGovernmentPositionId
      : system.headOfGovernmentTitle
        ? CUSTOM_TITLE
        : '',
    headOfGovernmentTitle: toText(system.headOfGovernmentTitle),
    headOfGovernmentHasPower: system.headOfGovernmentHasPower ?? true,
    stateStructure: system.stateStructure ?? '',
    partySystem: system.partySystem ?? '',
    notes: toText(system.notes),
  }
}

const numberOrNull = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

const textOrNull = (raw: string) => (raw.trim() === '' ? null : raw.trim())

/**
 * 정부 형태 선택 시 통치 구조 기본값(실권 여부·입법부·정당제)을 맞춰준다.
 */
function applyGovernmentFormDefaults(
  nextForm: string,
  prev: FormState,
): FormState {
  const next: FormState = { ...prev, governmentForm: nextForm }
  switch (nextForm as GovernmentForm) {
    case 'PRESIDENTIAL':
      next.headOfStateHasPower = true
      next.headOfGovernmentChoice = ''
      next.headOfGovernmentTitle = ''
      break
    case 'PARLIAMENTARY':
    case 'CONSTITUTIONAL_MONARCHY':
      next.headOfStateHasPower = false
      next.headOfGovernmentHasPower = true
      break
    case 'SEMI_PRESIDENTIAL':
      next.headOfStateHasPower = true
      next.headOfGovernmentHasPower = true
      break
    case 'ABSOLUTE_MONARCHY':
      next.headOfStateHasPower = true
      next.headOfGovernmentChoice = ''
      next.headOfGovernmentTitle = ''
      if (!next.legislatureType) next.legislatureType = 'NONE'
      break
    case 'ONE_PARTY':
      next.headOfStateHasPower = true
      if (!next.partySystem) next.partySystem = 'ONE_PARTY'
      break
    case 'MILITARY':
    case 'THEOCRACY':
      next.headOfStateHasPower = true
      break
    default:
      break
  }
  return next
}

/**
 * 국가원수·정부수반 한 축을 DTO 조각으로 옮긴다.
 * 지정 안 함이면 세 칸 모두 null — 감춘 값이 뒤에 남아 되살아나지 않게.
 */
function headAxisPayload(
  axis: 'headOfState' | 'headOfGovernment',
  form: FormState,
): Partial<UpdatePoliticalSystemInput> {
  const choice = axis === 'headOfState' ? form.headOfStateChoice : form.headOfGovernmentChoice
  const title = axis === 'headOfState' ? form.headOfStateTitle : form.headOfGovernmentTitle
  const hasPower =
    axis === 'headOfState' ? form.headOfStateHasPower : form.headOfGovernmentHasPower

  if (choice === CUSTOM_TITLE) {
    const text = textOrNull(title)
    return {
      [`${axis}PositionId`]: null,
      [`${axis}Title`]: text,
      [`${axis}HasPower`]: text ? hasPower : null,
    } as Partial<UpdatePoliticalSystemInput>
  }
  if (choice) {
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
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [forceSplitExecutive, setForceSplitExecutive] = useState(false)

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      open && !historicalCountryId && countryId ? countryId : '',
    )

  const effectiveHistoricalCountryId =
    historicalCountryId ?? (form.historicalCountryId || undefined)
  const effectiveCountryIdForDefs = effectiveHistoricalCountryId
    ? undefined
    : countryId

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
   * 수정 중인 정체가 이미 참조하는 정의는 목록에서 빠져도 되살린다.
   * 스코프 하드컷(예: 다른 나라 전용으로 스코프된 '국가주석')에 걸려 사라지면
   * select 값이 매칭되지 않아 선택이 조용히 '지정 안 함'으로 떨어진다.
   */
  const optionsFor = useMemo(() => {
    const pinned: DefinitionOption[] = [
      editing?.headOfStatePosition as DefinitionOption | null,
      editing?.headOfGovernmentPosition as DefinitionOption | null,
    ].filter((def): def is DefinitionOption => !!def?.id)

    return (axis: HeadAxis) => {
      const pool = [...definitions]
      for (const def of pinned) {
        if (!pool.some((row) => row.id === def.id)) pool.push(def)
      }
      return pool
        .filter((def) => def.positionType === axis)
        .sort((left, right) => left.title.localeCompare(right.title, 'ko-KR'))
    }
  }, [definitions, editing])

  // 열릴 때마다 대상에 맞춰 채운다 — 직전에 열었던 값이 남지 않도록
  useEffect(() => {
    if (!open) return
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
        ? applyGovernmentFormDefaults(initialGovernmentForm, base)
        : base,
    )
  }, [open, editing, initialGovernmentForm, defaultIsCurrent])

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

    const dto: UpdatePoliticalSystemInput = {
      name: textOrNull(form.name),
      ...(!historicalCountryId && countryId
        ? {
            countryId: form.historicalCountryId ? null : countryId,
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

  const headOptions = (axis: HeadAxis): SearchableSelectOption[] => [
    ...optionsFor(axis).map((def) => ({
      value: def.id,
      label: def.title,
      meta: def.titleLocal ?? undefined,
    })),
    { value: CUSTOM_TITLE, label: '목록에 없음 — 직접 입력', group: '직접' },
  ]

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
    return (
      <FieldRow>
        <FieldLabel as="div">
          {label} <OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          {chips.length > 0 ? (
            <ChoiceChips
              ariaLabel={`${label} — 원 카탈로그`}
              options={chips}
              value={chamberId}
              allowDeselect
              onChange={(nextId) =>
                nextId
                  ? pickChamber(side, nextId)
                  : setForm((prev) => ({ ...prev, [`${side}ChamberId`]: '' }))
              }
            />
          ) : null}
          <SubFieldPair $cols={2}>
            <SubField>
              <SubFieldLabel>이름</SubFieldLabel>
              <Input
                value={form[nameKey]}
                readOnly={Boolean(chamberId)}
                title={chamberId ? '고른 원의 이름 — 바꾸려면 원을 고치거나 칩 선택을 푸세요' : undefined}
                onChange={(event) => set(nameKey, event.target.value)}
                placeholder={side === 'upper' ? '참의원 · 상원 · 귀족원' : isBicameral ? '중의원 · 하원' : '국회'}
              />
            </SubField>
            <SubField>
              <SubFieldLabel>의석</SubFieldLabel>
              <Input
                inputMode="numeric"
                value={form[seatsKey]}
                onChange={(event) => set(seatsKey, event.target.value.replace(/[^0-9]/g, ''))}
                placeholder={side === 'upper' ? '100' : '300'}
              />
            </SubField>
          </SubFieldPair>
          {chips.length === 0 ? (
            <FieldHint>
              이 나라에 등록된 원이 없어 이름만 적습니다 — 아래 「의회 · 원」에서 원을 등록하면 여기서 고를 수 있습니다.
            </FieldHint>
          ) : null}
        </FieldControl>
      </FieldRow>
    )
  }

  const renderHead = (axis: 'headOfState' | 'headOfGovernment') => {
    const isState = axis === 'headOfState'
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
        ? '대통령 · 국왕 · 천황 · 황제'
        : '대통령 · 국왕 · 쇼군'
      : '총리 · 수상 · 내각총리대신'
    return (
      <FieldRow>
        <FieldLabel as="div">
          {label} 직함 <OptionalTag>(선택)</OptionalTag>
        </FieldLabel>
        <FieldControl>
          <SearchableSelect
            options={headOptions(isState ? 'HEAD_OF_STATE' : 'HEAD_OF_GOVERNMENT')}
            value={choice}
            onChange={(nextValue) => set(isState ? 'headOfStateChoice' : 'headOfGovernmentChoice', nextValue)}
            placeholder={placeholder}
            searchPlaceholder="관직 사전에서 찾기"
            ariaLabel={`${label} 직함`}
            clearable
            emptyMessage="이 나라 관직 사전에 해당 직함이 없습니다"
          />
          {choice === CUSTOM_TITLE ? (
            <Input
              value={title}
              onChange={(event) => set(isState ? 'headOfStateTitle' : 'headOfGovernmentTitle', event.target.value)}
              placeholder={isState ? '연합회의 의장 · 국가주석' : '임시정부 수반 · 국무원 총리'}
              aria-label={`${label} 직함 직접 입력`}
            />
          ) : null}
          {choice && (isDualExecutive || !isState) ? (
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
      closeOnOverlayClick={false}
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
                    onChange={(next) => set('historicalCountryId', next === '__MODERN__' ? '' : next)}
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
                  onChange={(next) => setForm((prev) => applyGovernmentFormDefaults(next, prev))}
                />
              </FieldControl>
            </FieldRow>

            {renderHead('headOfState')}
            {isDualExecutive ? renderHead('headOfGovernment') : null}

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
          </FormGroup>

          {/* ④ 국가 구조 · 정당제 · 설명 */}
          <FormGroup>
            <FormGroupTitle>국가 구조 · 정당제 · 설명</FormGroupTitle>
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
