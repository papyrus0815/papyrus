import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiCheck, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  findPoliticalSystemAtDate,
  WAR_POWER_AUTHORITY_LABEL,
} from '@/entities/political-system/model/political-system'
import { usePoliticalSystems } from '@/entities/political-system/api'
import { useCountries } from '@/features/country/api/use-countries.hook'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { chamberApi, chamberKeys, chamberLabel } from '@/shared/api/chamber'
import { personApi } from '@/shared/api/person'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonsByHistoricalCountryUnion } from '@/shared/api/persons'
import { treatyApi } from '@/shared/api/treaty'
import {
  type CreateWarDeclarationInput,
  WAR_DECLARATION_KIND_HINTS,
  WAR_DECLARATION_KIND_LABELS,
  WAR_DECLARATION_KIND_ORDER,
  type WarDeclarationDto,
  type WarDeclarationKind,
  WAR_TERMINATION_KIND_LABELS,
  WAR_TERMINATION_KIND_ORDER,
  type WarTerminationKind,
  warDeclarationApi,
  warDeclarationKeys,
} from '@/shared/api/war-declaration'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  buildPartialDateString,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import {
  CountryPicker,
  CountryPickerField,
  type CountryPickerPick,
} from '@/shared/ui/country-picker'
import {
  DatePickerModal,
  type DatePickerPrecision,
} from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'
import {
  ChoiceChips,
  type ChoiceChipOption,
  KitBusyBar,
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
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

import { LinkedEventPickerField } from './linked-event-picker-field'

export interface PartyPreset {
  id: string
  name: string
  flagEmoji?: string | null
  isHistorical: boolean
}

export interface WarDeclarationFormModalProps {
  open: boolean
  onClose: () => void
  editing?: WarDeclarationDto | null
  defaultDeclaring?: PartyPreset | null
  defaultTarget?: PartyPreset | null
  defaultWarEvent?: { id: string; title: string } | null
  defaultNarrativeEvent?: {
    id: string
    title: string
    startEra?: 'BC' | 'AD' | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
  } | null
  onSaved?: (saved: WarDeclarationDto) => void
}

type NarrativeLinkMode = 'none' | 'existing' | 'create'

interface PartyState {
  id: string
  name: string
  flagEmoji?: string | null
  isHistorical: boolean
}

interface FormState {
  declaring: PartyState | null
  target: PartyState | null
  extraTargets: PartyState[]
  kind: WarDeclarationKind
  title: string
  casusBelli: string
  summary: string
  declaredEra: 'BC' | 'AD'
  declaredYear: string
  declaredMonth: string
  declaredDay: string
  showSeveranceDate: boolean
  severanceEra: 'BC' | 'AD'
  severanceYear: string
  severanceMonth: string
  severanceDay: string
  decidedByTenureId: string
  decidedByPersonId: string
  cabinetId: string
  approvedChamberId: string
  yeas: string
  nays: string
  abstentions: string
  warEventId: string
  warEventInitialTitle: string
  ultimatumEventId: string
  ultimatumEventInitialTitle: string
  narrativeMode: NarrativeLinkMode
  narrativeEventId: string
  narrativeEventInitialTitle: string
  inlineEventTitle: string
  inlineEventDescription: string
  inlineEventDomain: 'DIPLOMACY' | 'MILITARY' | 'POLITICS'
  terminationKind: WarTerminationKind | ''
  endedEra: 'BC' | 'AD'
  endedYear: string
  endedMonth: string
  endedDay: string
  peaceTreatyId: string
  terminationNote: string
}

const KIND_OPTIONS: ChoiceChipOption<WarDeclarationKind>[] =
  WAR_DECLARATION_KIND_ORDER.map((key) => ({
    value: key,
    label: WAR_DECLARATION_KIND_LABELS[key],
    title: WAR_DECLARATION_KIND_HINTS[key],
  }))

const TERMINATION_OPTIONS: ChoiceChipOption<WarTerminationKind>[] =
  WAR_TERMINATION_KIND_ORDER.map((key) => ({
    value: key,
    label: WAR_TERMINATION_KIND_LABELS[key],
  }))

const NARRATIVE_MODE_OPTIONS: ChoiceChipOption<NarrativeLinkMode>[] = [
  { value: 'none', label: '원장 기록만 유지 (사건 미연결)' },
  { value: 'existing', label: '기존 사건 연결' },
  { value: 'create', label: '+ 보조 서술 사건 함께 생성' },
]

const INLINE_DOMAIN_OPTIONS: ChoiceChipOption<
  'DIPLOMACY' | 'MILITARY' | 'POLITICS'
>[] = [
  { value: 'DIPLOMACY', label: '외교' },
  { value: 'MILITARY', label: '군사' },
  { value: 'POLITICS', label: '정치' },
]

const numOrNull = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function toPartyState(
  country: { id: string; name: string; flagEmoji?: string | null } | null,
  hist: { id: string; name: string } | null,
): PartyState | null {
  if (hist) {
    return { id: hist.id, name: hist.name, isHistorical: true }
  }
  if (country) {
    return {
      id: country.id,
      name: country.name,
      flagEmoji: country.flagEmoji ?? null,
      isHistorical: false,
    }
  }
  return null
}

function buildInitialState(props: {
  editing?: WarDeclarationDto | null
  defaultDeclaring?: PartyPreset | null
  defaultTarget?: PartyPreset | null
  defaultWarEvent?: { id: string; title: string } | null
  defaultNarrativeEvent?: WarDeclarationFormModalProps['defaultNarrativeEvent']
}): FormState {
  const { editing } = props
  if (editing) {
    return {
      declaring: toPartyState(
        editing.declaringCountry,
        editing.declaringHistoricalCountry,
      ),
      target: toPartyState(editing.targetCountry, editing.targetHistoricalCountry),
      extraTargets: [],
      kind: editing.kind ?? 'FORMAL_DECLARATION',
      title: editing.title ?? '',
      casusBelli: editing.casusBelli ?? '',
      summary: editing.summary ?? '',
      declaredEra: editing.declaredEra ?? 'AD',
      declaredYear:
        editing.declaredYear != null ? String(editing.declaredYear) : '',
      declaredMonth:
        editing.declaredMonth != null ? String(editing.declaredMonth) : '',
      declaredDay:
        editing.declaredDay != null ? String(editing.declaredDay) : '',
      showSeveranceDate: editing.severanceYear != null,
      severanceEra: editing.severanceEra ?? 'AD',
      severanceYear:
        editing.severanceYear != null ? String(editing.severanceYear) : '',
      severanceMonth:
        editing.severanceMonth != null ? String(editing.severanceMonth) : '',
      severanceDay:
        editing.severanceDay != null ? String(editing.severanceDay) : '',
      decidedByTenureId: editing.decidedByTenureId ?? '',
      decidedByPersonId: editing.decidedByTenureId
        ? ''
        : (editing.decidedByPersonId ?? ''),
      cabinetId: editing.cabinetId ?? '',
      approvedChamberId: editing.approvedChamberId ?? '',
      yeas: editing.yeas != null ? String(editing.yeas) : '',
      nays: editing.nays != null ? String(editing.nays) : '',
      abstentions:
        editing.abstentions != null ? String(editing.abstentions) : '',
      warEventId: editing.warEventId ?? '',
      warEventInitialTitle: editing.warEvent?.title ?? '',
      ultimatumEventId: editing.ultimatumEventId ?? '',
      ultimatumEventInitialTitle: editing.ultimatumEvent?.title ?? '',
      narrativeMode: editing.narrativeEventId ? 'existing' : 'none',
      narrativeEventId: editing.narrativeEventId ?? '',
      narrativeEventInitialTitle: editing.narrativeEvent?.title ?? '',
      inlineEventTitle: '',
      inlineEventDescription: '',
      inlineEventDomain: 'DIPLOMACY',
      terminationKind: editing.terminationKind ?? '',
      endedEra: editing.endedEra ?? 'AD',
      endedYear: editing.endedYear != null ? String(editing.endedYear) : '',
      endedMonth: editing.endedMonth != null ? String(editing.endedMonth) : '',
      endedDay: editing.endedDay != null ? String(editing.endedDay) : '',
      peaceTreatyId: editing.peaceTreatyId ?? '',
      terminationNote: editing.terminationNote ?? '',
    }
  }

  const narr = props.defaultNarrativeEvent
  return {
    declaring: props.defaultDeclaring ?? null,
    target: props.defaultTarget ?? null,
    extraTargets: [],
    kind: 'FORMAL_DECLARATION',
    title: '',
    casusBelli: '',
    summary: '',
    declaredEra: narr?.startEra ?? 'AD',
    declaredYear: narr?.startYear != null ? String(narr.startYear) : '',
    declaredMonth: narr?.startMonth != null ? String(narr.startMonth) : '',
    declaredDay: narr?.startDay != null ? String(narr.startDay) : '',
    showSeveranceDate: false,
    severanceEra: narr?.startEra ?? 'AD',
    severanceYear: '',
    severanceMonth: '',
    severanceDay: '',
    decidedByTenureId: '',
    decidedByPersonId: '',
    cabinetId: '',
    approvedChamberId: '',
    yeas: '',
    nays: '',
    abstentions: '',
    warEventId: props.defaultWarEvent?.id ?? '',
    warEventInitialTitle: props.defaultWarEvent?.title ?? '',
    ultimatumEventId: '',
    ultimatumEventInitialTitle: '',
    narrativeMode: narr?.id ? 'existing' : 'none',
    narrativeEventId: narr?.id ?? '',
    narrativeEventInitialTitle: narr?.title ?? '',
    inlineEventTitle: '',
    inlineEventDescription: '',
    inlineEventDomain: 'DIPLOMACY',
    terminationKind: '',
    endedEra: 'AD',
    endedYear: '',
    endedMonth: '',
    endedDay: '',
    peaceTreatyId: '',
    terminationNote: '',
  }
}

export function WarDeclarationFormModal({
  open,
  onClose,
  editing = null,
  defaultDeclaring = null,
  defaultTarget = null,
  defaultWarEvent = null,
  defaultNarrativeEvent = null,
  onSaved,
}: WarDeclarationFormModalProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const declaredAnchorId = useId()
  const severanceAnchorId = useId()
  const endedAnchorId = useId()

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState({
      editing,
      defaultDeclaring,
      defaultTarget,
      defaultWarEvent,
      defaultNarrativeEvent,
    }),
  )
  const [saving, setSaving] = useState(false)
  const [pickerSlot, setPickerSlot] = useState<
    'declaring' | 'target' | 'extraTarget' | null
  >(null)
  const [activeDatePicker, setActiveDatePicker] = useState<
    'declared' | 'severance' | 'ended' | null
  >(null)

  useEffect(() => {
    if (!open) {
      setPickerSlot(null)
      setActiveDatePicker(null)
      return
    }
    setForm(
      buildInitialState({
        editing,
        defaultDeclaring,
        defaultTarget,
        defaultWarEvent,
        defaultNarrativeEvent,
      }),
    )
  }, [
    open,
    editing,
    defaultDeclaring,
    defaultTarget,
    defaultWarEvent,
    defaultNarrativeEvent,
  ])

  const { data: modernCountries = [], isLoading: modernLoading } = useCountries()
  const { data: historicalCountries = [], isLoading: histLoading } =
    useHistoricalCountries({ enabled: open })

  const declaringScope = useMemo(() => {
    if (!form.declaring) return null
    return form.declaring.isHistorical
      ? { historicalCountryId: form.declaring.id }
      : { countryId: form.declaring.id }
  }, [form.declaring])

  // 선포국의 헌정 체제·의회 원·수반 재임·내각·조약 목록 조회
  const politicalSystemsQuery = usePoliticalSystems({
    countryId: declaringScope?.countryId,
    historicalCountryId: declaringScope?.historicalCountryId,
    includeConstituents: Boolean(declaringScope?.historicalCountryId),
  })

  const { data: chambers = [] } = useQuery({
    queryKey: chamberKeys.list(declaringScope ?? {}),
    queryFn: () => chamberApi.list(declaringScope ?? {}),
    enabled: open && Boolean(declaringScope),
    staleTime: 60_000,
  })

  const { data: tenures = [] } = useQuery({
    queryKey: [
      'tenures-for-war-decl',
      declaringScope?.countryId ?? '',
      declaringScope?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: declaringScope?.countryId,
        historicalCountryId: declaringScope?.historicalCountryId,
      }),
    enabled: open && Boolean(declaringScope),
    staleTime: 60_000,
  })

  const { data: cabinets = [] } = useQuery({
    queryKey: [
      'cabinets-for-war-decl',
      declaringScope?.countryId ?? '',
      declaringScope?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: declaringScope?.countryId,
        historicalCountryId: declaringScope?.historicalCountryId,
      }),
    enabled: open && Boolean(declaringScope),
    staleTime: 60_000,
  })

  const { data: treatiesResult } = useQuery({
    queryKey: [
      'treaties-for-war-decl',
      declaringScope?.countryId ?? '',
      declaringScope?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      treatyApi.getAll({
        countryId: declaringScope?.countryId,
        historicalCountryId: declaringScope?.historicalCountryId,
      }),
    enabled: open && Boolean(declaringScope),
    staleTime: 60_000,
  })

  const { data: countryPersons = [] } = useQuery({
    queryKey: [
      'persons-for-war-decl',
      declaringScope?.countryId ?? '',
      declaringScope?.historicalCountryId ?? '',
    ],
    queryFn: async () => {
      if (declaringScope?.historicalCountryId) {
        return getPersonsByHistoricalCountryUnion(
          declaringScope.historicalCountryId,
        )
      }
      if (declaringScope?.countryId) {
        return personApi.getByCountryId(declaringScope.countryId)
      }
      return []
    },
    enabled: open && Boolean(declaringScope),
    staleTime: 60_000,
  })

  const parsedDeclaredYear = numOrNull(form.declaredYear)
  const signedDeclaredYear =
    parsedDeclaredYear != null
      ? form.declaredEra === 'BC'
        ? -parsedDeclaredYear
        : parsedDeclaredYear
      : null

  // 선포 시점에 해당하는 선포국의 헌정 체제(개전·선전포고권 규칙) 자동 탐지
  const activeRegimeAtDate = useMemo(() => {
    const list = politicalSystemsQuery.data ?? []
    if (list.length === 0 || parsedDeclaredYear == null) return null
    return findPoliticalSystemAtDate(list, {
      era: form.declaredEra,
      year: parsedDeclaredYear,
      month: numOrNull(form.declaredMonth),
      day: numOrNull(form.declaredDay),
    })
  }, [
    politicalSystemsQuery.data,
    form.declaredEra,
    parsedDeclaredYear,
    form.declaredMonth,
    form.declaredDay,
  ])

  // 정체에 개전 동의 원이 지정되어 있고 새로 만드는 중이면 기본값으로 제안
  useEffect(() => {
    if (editing || !activeRegimeAtDate?.warConsentChamberId) return
    setForm((prev) =>
      prev.approvedChamberId
        ? prev
        : {
            ...prev,
            approvedChamberId: activeRegimeAtDate.warConsentChamberId!,
          },
    )
  }, [editing, activeRegimeAtDate?.warConsentChamberId])

  // 신규 등록 시 선포 시점에 재임 중인 수반·내각 1순위 자동 프리필
  useEffect(() => {
    if (editing || signedDeclaredYear == null) return
    const rawTenures = Array.isArray(tenures) ? tenures : []
    const rawCabinets = Array.isArray(cabinets) ? cabinets : []
    const preferHos =
      activeRegimeAtDate?.warPowerAuthority === 'MONARCH_PREROGATIVE' ||
      activeRegimeAtDate?.warPowerAuthority === 'MONARCH_WITH_UPPER_HOUSE' ||
      activeRegimeAtDate?.governmentForm === 'PRESIDENTIAL' ||
      activeRegimeAtDate?.governmentForm === 'ABSOLUTE_MONARCHY'

    const matchingHeads = rawTenures.filter((t) => {
      if (
        t.positionType !== 'HEAD_OF_STATE' &&
        t.positionType !== 'HEAD_OF_GOVERNMENT'
      ) {
        return false
      }
      const sy =
        t.startYear != null
          ? t.startEra === 'BC'
            ? -t.startYear
            : t.startYear
          : null
      const ey =
        t.endYear != null ? (t.endEra === 'BC' ? -t.endYear : t.endYear) : null
      if (sy == null) return false
      if (sy > signedDeclaredYear) return false
      if (ey != null && ey < signedDeclaredYear) return false
      return true
    })

    matchingHeads.sort((a, b) => {
      const aPreferred = preferHos
        ? a.positionType === 'HEAD_OF_STATE'
        : a.positionType === 'HEAD_OF_GOVERNMENT'
      const bPreferred = preferHos
        ? b.positionType === 'HEAD_OF_STATE'
        : b.positionType === 'HEAD_OF_GOVERNMENT'
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1
      return (b.startYear ?? 0) - (a.startYear ?? 0)
    })

    const matchingCabinet = rawCabinets.find((cab) => {
      if (cab.startYear == null) return false
      const sy = cab.startEra === 'BC' ? -cab.startYear : cab.startYear
      const ey =
        cab.endYear != null
          ? cab.endEra === 'BC'
            ? -cab.endYear
            : cab.endYear
          : null
      return sy <= signedDeclaredYear && (ey == null || ey >= signedDeclaredYear)
    })

    if (!matchingHeads[0] && !matchingCabinet) return
    setForm((prev) => ({
      ...prev,
      decidedByTenureId:
        prev.decidedByTenureId || prev.decidedByPersonId
          ? prev.decidedByTenureId
          : (matchingHeads[0]?.id ?? ''),
      cabinetId: prev.cabinetId || (matchingCabinet?.id ?? ''),
    }))
  }, [
    editing,
    signedDeclaredYear,
    tenures,
    cabinets,
    activeRegimeAtDate?.warPowerAuthority,
    activeRegimeAtDate?.governmentForm,
  ])

  const tenureOptions = useMemo<SearchableSelectOption[]>(() => {
    const rawList = Array.isArray(tenures) ? tenures : []
    return rawList
      .filter((t) => {
        if (signedDeclaredYear == null) return true
        const sy =
          t.startYear != null
            ? t.startEra === 'BC'
              ? -t.startYear
              : t.startYear
            : null
        const ey =
          t.endYear != null
            ? t.endEra === 'BC'
              ? -t.endYear
              : t.endYear
            : null
        if (sy != null && sy > signedDeclaredYear + 1) return false
        if (ey != null && ey < signedDeclaredYear - 1) return false
        return true
      })
      .map((t) => {
        const personName = t.person
          ? getPersonDisplayName(t.person)
          : '인물 미상'
        const posTitle =
          t.title || t.positionDefinition?.title || '직위'
        const yr =
          t.startYear != null
            ? `${t.startEra === 'BC' ? 'BC ' : ''}${t.startYear}~${t.endYear ?? ''}`
            : ''
        return {
          value: t.id,
          label: `${personName} (${posTitle})`,
          meta: yr || undefined,
          group:
            t.positionType === 'HEAD_OF_STATE' ||
            t.positionType === 'HEAD_OF_GOVERNMENT'
              ? '당시 수반 · 원수'
              : '장관 · 사령관 · 기타 재임',
        }
      })
  }, [tenures, signedDeclaredYear])

  const personFallbackOptions = useMemo<SearchableSelectOption[]>(() => {
    const rawList = Array.isArray(countryPersons) ? countryPersons : []
    return rawList.map((p: any) => ({
      value: p.id,
      label: getPersonDisplayName({
        name: p.name ?? '',
        surname: p.surname ?? null,
        middleName: p.middleName ?? null,
        nameDisplayOrder: p.nameDisplayOrder ?? null,
      }),
      meta:
        p.birthYear != null || p.deathYear != null
          ? `${p.birthYear ?? '?'}~${p.deathYear ?? ''}`
          : undefined,
    }))
  }, [countryPersons])

  const cabinetOptions = useMemo<SearchableSelectOption[]>(() => {
    return (Array.isArray(cabinets) ? cabinets : []).map((cab) => ({
      value: cab.id,
      label: cab.name || '내각',
    }))
  }, [cabinets])

  const chamberOptions = useMemo<SearchableSelectOption[]>(() => {
    return chambers.map((ch) => ({
      value: ch.id,
      label: chamberLabel(ch),
    }))
  }, [chambers])

  const peaceTreatyOptions = useMemo<SearchableSelectOption[]>(() => {
    const items = treatiesResult?.items ?? []
    return items.map((tr) => ({
      value: tr.id,
      label: tr.name,
      meta: tr.signDate ? tr.signDate.slice(0, 10) : undefined,
      group:
        tr.type === 'PEACE'
          ? '강화 · 평화 조약'
          : '기타 조약 · 협정',
    }))
  }, [treatiesResult])

  const isSameParty = useMemo(() => {
    if (!form.declaring) return false
    const allTargets = [
      ...(form.target ? [form.target] : []),
      ...form.extraTargets,
    ]
    return allTargets.some(
      (t) =>
        t.isHistorical === form.declaring!.isHistorical &&
        t.id === form.declaring!.id,
    )
  }, [form.declaring, form.target, form.extraTargets])

  const isDateInverted = useMemo(() => {
    const sy = numOrNull(form.declaredYear)
    const ey = numOrNull(form.endedYear)
    if (sy == null || ey == null) return false
    const startKey =
      (form.declaredEra === 'BC' ? -sy : sy) * 10000 +
      (numOrNull(form.declaredMonth) ?? 1) * 100 +
      (numOrNull(form.declaredDay) ?? 1)
    const endKey =
      (form.endedEra === 'BC' ? -ey : ey) * 10000 +
      (numOrNull(form.endedMonth) ?? 12) * 100 +
      (numOrNull(form.endedDay) ?? 31)
    return startKey > endKey
  }, [
    form.declaredEra,
    form.declaredYear,
    form.declaredMonth,
    form.declaredDay,
    form.endedEra,
    form.endedYear,
    form.endedMonth,
    form.endedDay,
  ])

  const canSubmit = Boolean(
    form.declaring && form.target && !isSameParty && !isDateInverted && !saving,
  )

  const swapParties = () => {
    setForm((prev) => ({
      ...prev,
      declaring: prev.target,
      target: prev.declaring,
      decidedByTenureId: '',
      cabinetId: '',
      approvedChamberId: '',
    }))
  }

  const handlePickCountry = (picked: CountryPickerPick) => {
    const modernHit = !picked.isHistorical
      ? modernCountries.find((c) => c.id === picked.id)
      : undefined
    const party: PartyState = picked.isHistorical
      ? { id: picked.id, name: picked.name, isHistorical: true }
      : {
          id: picked.id,
          name: picked.name,
          flagEmoji: modernHit?.flagEmoji ?? null,
          isHistorical: false,
        }
    if (pickerSlot === 'declaring') {
      setForm((prev) => ({
        ...prev,
        declaring: party,
        decidedByTenureId: '',
        decidedByPersonId: '',
        cabinetId: '',
        approvedChamberId: '',
      }))
    } else if (pickerSlot === 'target') {
      setForm((prev) => ({ ...prev, target: party }))
    } else if (pickerSlot === 'extraTarget') {
      setForm((prev) => {
        const exists =
          (prev.target &&
            prev.target.id === party.id &&
            prev.target.isHistorical === party.isHistorical) ||
          prev.extraTargets.some(
            (item) =>
              item.id === party.id && item.isHistorical === party.isHistorical,
          )
        if (exists) return prev
        if (!prev.target) return { ...prev, target: party }
        return { ...prev, extraTargets: [...prev.extraTargets, party] }
      })
    }
    setPickerSlot(null)
  }

  const removeExtraTarget = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      extraTargets: prev.extraTargets.filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async () => {
    if (!form.declaring || !form.target) {
      notify.error('선포국과 대상국을 모두 선택해 주세요.')
      return
    }
    if (isSameParty) {
      notify.error('선포국과 대상국이 같은 국가일 수 없습니다.')
      return
    }
    if (isDateInverted) {
      notify.error('교전 종료 시점이 선포 시점보다 앞설 수 없습니다.')
      return
    }

    const declaredYear = numOrNull(form.declaredYear)
    const declaredMonth = declaredYear != null ? numOrNull(form.declaredMonth) : null
    const declaredDay =
      declaredYear != null && declaredMonth != null
        ? numOrNull(form.declaredDay)
        : null

    const severanceActive =
      form.kind === 'DIPLOMATIC_SEVERANCE' || form.showSeveranceDate
    const severanceYear = severanceActive
      ? numOrNull(form.severanceYear)
      : null
    const severanceMonth =
      severanceYear != null ? numOrNull(form.severanceMonth) : null
    const severanceDay =
      severanceYear != null && severanceMonth != null
        ? numOrNull(form.severanceDay)
        : null

    const endedYear = numOrNull(form.endedYear)
    const endedMonth = endedYear != null ? numOrNull(form.endedMonth) : null
    const endedDay =
      endedYear != null && endedMonth != null ? numOrNull(form.endedDay) : null

    const commonPayload: Omit<
      CreateWarDeclarationInput,
      | 'declaringCountryId'
      | 'declaringHistoricalCountryId'
      | 'targetCountryId'
      | 'targetHistoricalCountryId'
    > = {
      kind: form.kind,
      title: form.title.trim() || null,
      casusBelli: form.casusBelli.trim() || null,
      summary: form.summary.trim() || null,
      declaredEra: declaredYear != null ? form.declaredEra : null,
      declaredYear,
      declaredMonth,
      declaredDay,
      declaredPrecision:
        declaredDay != null
          ? 'day'
          : declaredMonth != null
            ? 'month'
            : declaredYear != null
              ? 'year'
              : null,
      severanceEra: severanceYear != null ? form.severanceEra : null,
      severanceYear,
      severanceMonth,
      severanceDay,
      decidedByTenureId: form.decidedByTenureId || null,
      decidedByPersonId: form.decidedByTenureId
        ? null
        : form.decidedByPersonId || null,
      cabinetId: form.cabinetId || null,
      approvedChamberId: form.approvedChamberId || null,
      yeas: numOrNull(form.yeas),
      nays: numOrNull(form.nays),
      abstentions: numOrNull(form.abstentions),
      warEventId: form.warEventId || null,
      ultimatumEventId: form.ultimatumEventId || null,
      narrativeEventId:
        form.narrativeMode === 'existing'
          ? form.narrativeEventId || null
          : null,
      ...(form.narrativeMode === 'create'
        ? {
            createNarrativeEvent: {
              title: form.inlineEventTitle.trim() || null,
              description: form.inlineEventDescription.trim() || null,
              domain: form.inlineEventDomain,
            },
          }
        : {}),
      terminationKind: form.terminationKind || null,
      endedEra: endedYear != null ? form.endedEra : null,
      endedYear,
      endedMonth,
      endedDay,
      endedPrecision:
        endedDay != null
          ? 'day'
          : endedMonth != null
            ? 'month'
            : endedYear != null
              ? 'year'
              : null,
      peaceTreatyId: form.peaceTreatyId || null,
      terminationNote: form.terminationNote.trim() || null,
    }

    const payload: CreateWarDeclarationInput = {
      ...commonPayload,
      declaringCountryId: form.declaring.isHistorical ? null : form.declaring.id,
      declaringHistoricalCountryId: form.declaring.isHistorical
        ? form.declaring.id
        : null,
      targetCountryId: form.target.isHistorical ? null : form.target.id,
      targetHistoricalCountryId: form.target.isHistorical
        ? form.target.id
        : null,
    }

    setSaving(true)
    try {
      let saved: WarDeclarationDto
      if (editing) {
        saved = await warDeclarationApi.update(editing.id, payload)
      } else if (form.extraTargets.length > 0) {
        const allTargets = [form.target, ...form.extraTargets]
        const batchSaved = await warDeclarationApi.createBatch({
          ...commonPayload,
          declaringParties: [
            form.declaring.isHistorical
              ? { historicalCountryId: form.declaring.id }
              : { countryId: form.declaring.id },
          ],
          targetParties: allTargets.map((t) =>
            t.isHistorical
              ? { historicalCountryId: t.id }
              : { countryId: t.id },
          ),
        })
        saved = batchSaved[0]
      } else {
        saved = await warDeclarationApi.create(payload)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: warDeclarationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['country-military-events'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['treaty'] }),
        queryClient.invalidateQueries({ queryKey: ['treaties'] }),
      ])
      notify.success(
        editing
          ? '선전포고·개전 정본을 수정했습니다.'
          : form.extraTargets.length > 0
            ? `선전포고·개전 정본 ${form.extraTargets.length + 1}건을 일괄 등록했습니다.`
            : '선전포고·개전 정본을 등록했습니다.',
      )
      if (saved) onSaved?.(saved)
      onClose()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '선전포고 저장에 실패했습니다.',
      )
    } finally {
      setSaving(false)
    }
  }

  useModalSubmitShortcut({
    enabled:
      open && !saving && pickerSlot === null && activeDatePicker === null,
    scrollContainerRef: scrollRef,
    onSubmit: () => {
      if (canSubmit) void handleSubmit()
    },
  })

  const pickerDateParts =
    activeDatePicker === 'ended'
      ? {
          era: form.endedEra,
          year: form.endedYear,
          month: form.endedMonth,
          day: form.endedDay,
        }
      : activeDatePicker === 'severance'
        ? {
            era: form.severanceEra,
            year: form.severanceYear,
            month: form.severanceMonth,
            day: form.severanceDay,
          }
        : {
            era: form.declaredEra,
            year: form.declaredYear,
            month: form.declaredMonth,
            day: form.declaredDay,
          }
  const pickerInitialDate =
    buildPartialDateString(pickerDateParts) || undefined
  const pickerInitialPrecision: DatePickerPrecision | null =
    pickerDateParts.day.trim()
      ? 'day'
      : pickerDateParts.month.trim()
        ? 'month'
        : pickerDateParts.year.trim()
          ? 'year'
          : null

  const applyPickedDate = (
    isoString: string,
    precision: DatePickerPrecision,
  ) => {
    if (!activeDatePicker) return
    const parsed = parsePartialDateString(isoString)
    const month = precision === 'year' ? '' : parsed.month
    const day = precision === 'day' ? parsed.day : ''
    setForm((prev) =>
      activeDatePicker === 'declared'
        ? {
            ...prev,
            declaredEra: parsed.era,
            declaredYear: parsed.year,
            declaredMonth: month,
            declaredDay: day,
          }
        : activeDatePicker === 'severance'
          ? {
              ...prev,
              severanceEra: parsed.era,
              severanceYear: parsed.year,
              severanceMonth: month,
              severanceDay: day,
            }
          : {
              ...prev,
              endedEra: parsed.era,
              endedYear: parsed.year,
              endedMonth: month,
              endedDay: day,
            },
    )
    setActiveDatePicker(null)
  }

  return (
    <>
      <RegisterModal
        isOpen={open}
        onClose={onClose}
        title={editing ? '선전포고 · 개전 기록 수정' : '선전포고 · 개전 기록 등록'}
        maxWidth="min(960px, 96vw)"
        minHeight="76vh"
        fullBleedOnMobile
        closeOnOverlayClick={
          !saving && pickerSlot === null && activeDatePicker === null
        }
        closeOnEsc={!saving && pickerSlot === null && activeDatePicker === null}
      >
        <PersonRegisterModalFormScroll ref={scrollRef}>
          {saving ? (
            <KitBusyBar role="status" aria-live="polite">
              선전포고·개전 원장을 저장하는 중...
            </KitBusyBar>
          ) : null}

          <LabeledRowsWrap>
            {/* ① 당사국 구도 · 시점 · 유형 */}
            <FormGroup>
              <FormGroupTitle>개전 주체 · 상대국 · 시점</FormGroupTitle>

              <FieldRow>
                <FieldLabel as="div">당사국 구도 *</FieldLabel>
                <FieldControl>
                  <PartyAxisRow>
                    <PartyBox>
                      <SubFieldLabel>선포국 · 개전 주체</SubFieldLabel>
                      <CountryPickerField
                        value={form.declaring}
                        placeholder="선포국 선택 (현대·역사)"
                        onOpen={() => setPickerSlot('declaring')}
                        onClear={() =>
                          setForm((prev) => ({ ...prev, declaring: null }))
                        }
                      />
                    </PartyBox>

                    <SwapBtn
                      type="button"
                      onClick={swapParties}
                      title="선포국 ↔ 대상국 맞바꾸기"
                      aria-label="선포국과 대상국 맞바꾸기"
                    >
                      <FiRefreshCw size={13} />
                      <span>방향 전환</span>
                    </SwapBtn>

                    <PartyBox>
                      <SubFieldLabel>대상국 · 피선포국</SubFieldLabel>
                      <CountryPickerField
                        value={form.target}
                        placeholder="대상국 선택 (현대·역사)"
                        onOpen={() => setPickerSlot('target')}
                        onClear={() =>
                          setForm((prev) => ({ ...prev, target: null }))
                        }
                      />
                    </PartyBox>
                  </PartyAxisRow>

                  {!editing && form.target ? (
                    <ExtraTargetsBar>
                      {form.extraTargets.map((et, idx) => (
                        <ExtraTargetChip
                          key={`${et.isHistorical ? 'h' : 'm'}:${et.id}`}
                        >
                          <span>
                            {et.flagEmoji ? `${et.flagEmoji} ` : ''}
                            {et.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExtraTarget(idx)}
                            aria-label={`${et.name} 제외`}
                          >
                            <FiX size={11} />
                          </button>
                        </ExtraTargetChip>
                      ))}
                      <AddExtraTargetBtn
                        type="button"
                        onClick={() => setPickerSlot('extraTarget')}
                      >
                        <FiPlus size={12} />
                        <span>동시 선포 대상국 추가 (일괄 생성)</span>
                      </AddExtraTargetBtn>
                    </ExtraTargetsBar>
                  ) : null}

                  {isSameParty ? (
                    <AlertBox variant="danger" icon={<FiAlertCircle />}>
                      선포국과 대상국이 동일합니다. 서로 다른 두 국가를 선택해 주세요.
                    </AlertBox>
                  ) : null}
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel as="div">개전 행위 유형</FieldLabel>
                <FieldControl>
                  <ChoiceChips
                    ariaLabel="개전 행위 유형"
                    options={KIND_OPTIONS}
                    value={form.kind}
                    onChange={(next) => {
                      if (next) setForm((prev) => ({ ...prev, kind: next }))
                    }}
                  />
                  <FieldHint>{WAR_DECLARATION_KIND_HINTS[form.kind]}</FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel as="div">
                  개전·선포일 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <InlineDateField
                    appearance="field"
                    anchorId={declaredAnchorId}
                    pickerOpen={activeDatePicker === 'declared'}
                    era={form.declaredEra}
                    year={form.declaredYear}
                    month={form.declaredMonth}
                    day={form.declaredDay}
                    onEra={(era) =>
                      setForm((prev) => ({ ...prev, declaredEra: era }))
                    }
                    onYear={(val) =>
                      setForm((prev) => ({ ...prev, declaredYear: val }))
                    }
                    onMonth={(val) =>
                      setForm((prev) => ({ ...prev, declaredMonth: val }))
                    }
                    onDay={(val) =>
                      setForm((prev) => ({ ...prev, declaredDay: val }))
                    }
                    onOpenPicker={() => setActiveDatePicker('declared')}
                    ariaLabel="선전포고·개전 시점"
                  />
                  {form.kind === 'DIPLOMATIC_SEVERANCE' ||
                  form.showSeveranceDate ? (
                    <SubField>
                      <SubFieldLabel>
                        선행 외교 단절(단교)일{' '}
                        {form.kind !== 'DIPLOMATIC_SEVERANCE' ? (
                          <InlineToggleLink
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                showSeveranceDate: false,
                                severanceYear: '',
                                severanceMonth: '',
                                severanceDay: '',
                              }))
                            }
                          >
                            접기
                          </InlineToggleLink>
                        ) : null}
                      </SubFieldLabel>
                      <InlineDateField
                        appearance="field"
                        anchorId={severanceAnchorId}
                        pickerOpen={activeDatePicker === 'severance'}
                        era={form.severanceEra}
                        year={form.severanceYear}
                        month={form.severanceMonth}
                        day={form.severanceDay}
                        onEra={(era) =>
                          setForm((prev) => ({ ...prev, severanceEra: era }))
                        }
                        onYear={(val) =>
                          setForm((prev) => ({ ...prev, severanceYear: val }))
                        }
                        onMonth={(val) =>
                          setForm((prev) => ({ ...prev, severanceMonth: val }))
                        }
                        onDay={(val) =>
                          setForm((prev) => ({ ...prev, severanceDay: val }))
                        }
                        onOpenPicker={() => setActiveDatePicker('severance')}
                        ariaLabel="선행 외교 단교 시점"
                      />
                    </SubField>
                  ) : (
                    <InlineToggleLink
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, showSeveranceDate: true }))
                      }
                    >
                      + 개전에 앞선 외교 단교(국교 단절)일 별도 기록
                    </InlineToggleLink>
                  )}
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="war-decl-casus-belli">
                  개전 명분·사유 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <Input
                    id="war-decl-casus-belli"
                    value={form.casusBelli}
                    onChange={(ev) =>
                      setForm((prev) => ({
                        ...prev,
                        casusBelli: ev.target.value,
                      }))
                    }
                    placeholder="예: 사라예보 암살 배후 책임 및 최후통첩 일부 거부 · 벨기에 중립 침범"
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="war-decl-title">
                  표시 제목 오버라이드 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <Input
                    id="war-decl-title"
                    value={form.title}
                    onChange={(ev) =>
                      setForm((prev) => ({ ...prev, title: ev.target.value }))
                    }
                    placeholder="비우면 '{선포국}의 대(對){대상국} 선전포고'가 자동으로 쓰입니다"
                  />
                </FieldControl>
              </FieldRow>
            </FormGroup>

            {/* ② 국가 헌정 의사결정 절차 */}
            <FormGroup>
              <FormGroupTitle>국가 헌정 의사결정 절차 (수반 · 내각 · 의회 표결)</FormGroupTitle>

              {activeRegimeAtDate &&
              (activeRegimeAtDate.warPowerAuthority ||
                activeRegimeAtDate.commanderInChiefPosition ||
                activeRegimeAtDate.warPowerNotes) ? (
                <FieldRow>
                  <span aria-hidden />
                  <FieldControl>
                    <RegimeGuideBanner>
                      <strong>
                        당시 선포국 헌정 체제 ({activeRegimeAtDate.name || '정체'}):
                      </strong>{' '}
                      {activeRegimeAtDate.warPowerAuthority
                        ? WAR_POWER_AUTHORITY_LABEL[
                            activeRegimeAtDate.warPowerAuthority
                          ]
                        : null}
                      {activeRegimeAtDate.warConsentChamber
                        ? ` · ${activeRegimeAtDate.warConsentChamber.name} 동의`
                        : ''}
                      {activeRegimeAtDate.commanderInChiefPosition
                        ? ` · 통수권: ${activeRegimeAtDate.commanderInChiefPosition.title}`
                        : ''}
                      {activeRegimeAtDate.warPowerNotes
                        ? ` — ${activeRegimeAtDate.warPowerNotes}`
                        : ''}
                    </RegimeGuideBanner>
                  </FieldControl>
                </FieldRow>
              ) : null}

              <FieldRow>
                <FieldLabel as="div">
                  결정 수반·내각 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <SubFieldPair $cols={2}>
                    <SubField>
                      <SubFieldLabel>결정·선포 수반/보직자 (재임 정본)</SubFieldLabel>
                      <SearchableSelect
                        options={tenureOptions}
                        value={form.decidedByTenureId}
                        onChange={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            decidedByTenureId: next,
                            ...(next ? { decidedByPersonId: '' } : {}),
                          }))
                        }
                        placeholder={
                          form.declaring
                            ? '당시 군주·대통령·총리·외무장관 선택'
                            : '선포국을 먼저 선택하세요'
                        }
                        searchPlaceholder="인물명·직위로 검색..."
                        ariaLabel="결정·선포 수반 재임 기록"
                        disabled={!form.declaring}
                        clearable
                      />
                    </SubField>
                    <SubField>
                      <SubFieldLabel>소속 내각·행정부</SubFieldLabel>
                      <SearchableSelect
                        options={cabinetOptions}
                        value={form.cabinetId}
                        onChange={(next) =>
                          setForm((prev) => ({ ...prev, cabinetId: next }))
                        }
                        placeholder={
                          form.declaring
                            ? '당시 내각 선택 (비우면 수반에서 자동 추정)'
                            : '선포국을 먼저 선택하세요'
                        }
                        searchPlaceholder="내각명 검색..."
                        ariaLabel="소속 내각"
                        disabled={!form.declaring}
                        clearable
                      />
                    </SubField>
                  </SubFieldPair>
                  {!form.decidedByTenureId ? (
                    <SubField>
                      <SubFieldLabel>
                        결정·서명 인물 직접 지정 (재임 이력 미등록 시대·인물용 폴백)
                      </SubFieldLabel>
                      <SearchableSelect
                        options={personFallbackOptions}
                        value={form.decidedByPersonId}
                        onChange={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            decidedByPersonId: next,
                          }))
                        }
                        placeholder={
                          form.declaring
                            ? '재임 기록이 아직 없을 때 인물을 직접 지정'
                            : '선포국을 먼저 선택하세요'
                        }
                        searchPlaceholder="인물명 검색..."
                        ariaLabel="결정·서명 인물 직접 지정"
                        disabled={!form.declaring}
                        clearable
                      />
                    </SubField>
                  ) : null}
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel as="div">
                  의회 승인·표결 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <SearchableSelect
                    options={chamberOptions}
                    value={form.approvedChamberId}
                    onChange={(next) =>
                      setForm((prev) => ({ ...prev, approvedChamberId: next }))
                    }
                    placeholder={
                      form.declaring
                        ? '선전포고 의결·동의 의회 원 선택 (예: 입법의회 · 연방상원 · 국회)'
                        : '선포국을 먼저 선택하세요'
                    }
                    searchPlaceholder="의회 원 검색..."
                    ariaLabel="승인·의결 의회 원"
                    disabled={!form.declaring}
                    clearable
                  />
                  <SubFieldPair $cols={3}>
                    <SubField>
                      <SubFieldLabel>찬성 표수</SubFieldLabel>
                      <Input
                        inputMode="numeric"
                        value={form.yeas}
                        onChange={(ev) =>
                          setForm((prev) => ({
                            ...prev,
                            yeas: ev.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        placeholder="예: 388"
                      />
                    </SubField>
                    <SubField>
                      <SubFieldLabel>반대 표수</SubFieldLabel>
                      <Input
                        inputMode="numeric"
                        value={form.nays}
                        onChange={(ev) =>
                          setForm((prev) => ({
                            ...prev,
                            nays: ev.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        placeholder="예: 1"
                      />
                    </SubField>
                    <SubField>
                      <SubFieldLabel>기권 표수</SubFieldLabel>
                      <Input
                        inputMode="numeric"
                        value={form.abstentions}
                        onChange={(ev) =>
                          setForm((prev) => ({
                            ...prev,
                            abstentions: ev.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        placeholder="예: 0"
                      />
                    </SubField>
                  </SubFieldPair>
                </FieldControl>
              </FieldRow>
            </FormGroup>

            {/* ③ 상위 전쟁 · 보조 서술 사건 · 종결 조약 */}
            <FormGroup>
              <FormGroupTitle>상위 전쟁 · 보조 서술 사건 · 종전 조약</FormGroupTitle>

              <FieldRow>
                <FieldLabel htmlFor="war-decl-parent-war">
                  상위 전쟁 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <LinkedEventPickerField
                    inputId="war-decl-parent-war"
                    value={form.warEventId}
                    initialTitle={form.warEventInitialTitle || null}
                    nearYear={signedDeclaredYear}
                    onChange={(nextId) =>
                      setForm((prev) => ({ ...prev, warEventId: nextId }))
                    }
                  />
                  <FieldHint>
                    이 개전이 속한 전쟁(예: 제1차 세계대전 · 크림 전쟁 · 독소전쟁)을 연결하면 전쟁 조망의 개전·참전 도미노에 자동 합류합니다.
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="war-decl-ultimatum-event">
                  선행 최후통첩 사건 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <LinkedEventPickerField
                    inputId="war-decl-ultimatum-event"
                    value={form.ultimatumEventId}
                    initialTitle={form.ultimatumEventInitialTitle || null}
                    nearYear={signedDeclaredYear}
                    onChange={(nextId) =>
                      setForm((prev) => ({ ...prev, ultimatumEventId: nextId }))
                    }
                  />
                  <FieldHint>
                    개전에 앞서 발송된 최후통첩·외교 각서 사건(예: 오스트리아-헝가리의 대세르비아 최후통첩)을 연결하면 외교 위기 → 개전 인과가 이어집니다.
                  </FieldHint>
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel as="div">
                  보조 서술 사건 <OptionalTag>(사건 본문 연동)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <ChoiceChips
                    ariaLabel="보조 서술 사건 연결 방식"
                    options={NARRATIVE_MODE_OPTIONS}
                    value={form.narrativeMode}
                    onChange={(next) => {
                      if (next) {
                        setForm((prev) => ({ ...prev, narrativeMode: next }))
                      }
                    }}
                  />

                  {form.narrativeMode === 'existing' ? (
                    <>
                      <LinkedEventPickerField
                        value={form.narrativeEventId}
                        initialTitle={form.narrativeEventInitialTitle || null}
                        nearYear={signedDeclaredYear}
                        onChange={(nextId) =>
                          setForm((prev) => ({
                            ...prev,
                            narrativeEventId: nextId,
                          }))
                        }
                      />
                      <FieldHint>
                        외교 비화·각서 전달 경위·의회 연설 등을 서술한 사건을 연결합니다. 단순 참전 기록이면 비워 두어도 국가·전쟁 원장에서 온전히 집계됩니다.
                      </FieldHint>
                    </>
                  ) : null}

                  {form.narrativeMode === 'create' ? (
                    <InlineEventBox>
                      <SubFieldPair $cols={2}>
                        <SubField>
                          <SubFieldLabel>새 보조 사건 제목 (비우면 자동 생성)</SubFieldLabel>
                          <Input
                            value={form.inlineEventTitle}
                            onChange={(ev) =>
                              setForm((prev) => ({
                                ...prev,
                                inlineEventTitle: ev.target.value,
                              }))
                            }
                            placeholder="예: 주소 독일 대사 슐렌부르크의 개전 각서 전달"
                          />
                        </SubField>
                        <SubField>
                          <SubFieldLabel>사건 분야</SubFieldLabel>
                          <ChoiceChips
                            ariaLabel="보조 사건 분야"
                            options={INLINE_DOMAIN_OPTIONS}
                            value={form.inlineEventDomain}
                            onChange={(next) => {
                              if (next) {
                                setForm((prev) => ({
                                  ...prev,
                                  inlineEventDomain: next,
                                }))
                              }
                            }}
                          />
                        </SubField>
                      </SubFieldPair>
                      <SubField>
                        <SubFieldLabel>경위·맥락 개요 (선택)</SubFieldLabel>
                        <PersonRegisterModalTextarea
                          rows={3}
                          value={form.inlineEventDescription}
                          onChange={(ev) =>
                            setForm((prev) => ({
                              ...prev,
                              inlineEventDescription: ev.target.value,
                            }))
                          }
                          placeholder="선전포고의 외교적 배경·전달 과정·여파 개요를 적으면 연결된 사건 문서가 함께 생성됩니다."
                        />
                      </SubField>
                    </InlineEventBox>
                  ) : null}
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel as="div">
                  교전 종결·강화 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <ChoiceChips
                    ariaLabel="교전 종결 방식"
                    options={TERMINATION_OPTIONS}
                    value={form.terminationKind}
                    allowDeselect
                    onChange={(next) =>
                      setForm((prev) => ({ ...prev, terminationKind: next }))
                    }
                  />
                  <SubFieldPair $cols={2}>
                    <SubField>
                      <SubFieldLabel>교전 상태 종료 시점</SubFieldLabel>
                      <InlineDateField
                        appearance="field"
                        anchorId={endedAnchorId}
                        pickerOpen={activeDatePicker === 'ended'}
                        era={form.endedEra}
                        year={form.endedYear}
                        month={form.endedMonth}
                        day={form.endedDay}
                        onEra={(era) =>
                          setForm((prev) => ({ ...prev, endedEra: era }))
                        }
                        onYear={(val) =>
                          setForm((prev) => ({ ...prev, endedYear: val }))
                        }
                        onMonth={(val) =>
                          setForm((prev) => ({ ...prev, endedMonth: val }))
                        }
                        onDay={(val) =>
                          setForm((prev) => ({ ...prev, endedDay: val }))
                        }
                        onOpenPicker={() => setActiveDatePicker('ended')}
                        error={isDateInverted}
                        ariaLabel="교전 상태 종료 시점"
                      />
                    </SubField>
                    <SubField>
                      <SubFieldLabel>종결 강화·휴전 조약 (조약 정본)</SubFieldLabel>
                      <SearchableSelect
                        options={peaceTreatyOptions}
                        value={form.peaceTreatyId}
                        onChange={(next) =>
                          setForm((prev) => ({ ...prev, peaceTreatyId: next }))
                        }
                        placeholder={
                          form.declaring
                            ? '베르사유 조약 · 파리 조약 등 선택'
                            : '선포국을 먼저 선택하세요'
                        }
                        searchPlaceholder="조약명 검색..."
                        ariaLabel="종결 강화·평화 조약"
                        disabled={!form.declaring}
                        clearable
                      />
                    </SubField>
                  </SubFieldPair>
                  {isDateInverted ? (
                    <AlertBox variant="danger" icon={<FiAlertCircle />}>
                      교전 종료 시점이 선포 시점보다 앞섭니다.
                    </AlertBox>
                  ) : null}
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel htmlFor="war-decl-summary">
                  원장 비고 <OptionalTag>(선택)</OptionalTag>
                </FieldLabel>
                <FieldControl>
                  <PersonRegisterModalTextarea
                    id="war-decl-summary"
                    rows={2}
                    value={form.summary}
                    onChange={(ev) =>
                      setForm((prev) => ({ ...prev, summary: ev.target.value }))
                    }
                    placeholder="단교 시점, 각서 전달 시각, 헌법상 절차 준수 여부 등 원장 메모"
                  />
                </FieldControl>
              </FieldRow>
            </FormGroup>
          </LabeledRowsWrap>
        </PersonRegisterModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={!canSubmit && isDateInverted}>
            <FooterReadyGroup>
              <FooterReadyBadge>
                <FiCheck size={12} aria-hidden />
                {canSubmit ? '저장 준비됨' : '선포국·대상국 필수'}
              </FooterReadyBadge>
              <span>⌘/Ctrl + Enter로 바로 저장</span>
            </FooterReadyGroup>
          </FooterHint>
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
            {saving
              ? '저장 중...'
              : editing
                ? '선전포고 기록 수정'
                : form.extraTargets.length > 0
                  ? `선전포고 기록 ${form.extraTargets.length + 1}건 일괄 등록`
                  : '선전포고 기록 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>

      <CountryPicker
        isOpen={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        title={
          pickerSlot === 'declaring'
            ? '선포국 · 개전 주체 선택'
            : pickerSlot === 'extraTarget'
              ? '동시 선포 추가 대상국 선택'
              : '대상국 · 피선포국 선택'
        }
        mode="single"
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        isLoading={modernLoading || histLoading}
        hintYearRange={
          signedDeclaredYear != null
            ? { startYear: signedDeclaredYear, endYear: signedDeclaredYear }
            : undefined
        }
        selectedIds={
          pickerSlot === 'declaring'
            ? form.declaring
              ? [form.declaring.id]
              : []
            : pickerSlot === 'extraTarget'
              ? [
                  ...(form.target ? [form.target.id] : []),
                  ...form.extraTargets.map((t) => t.id),
                ]
              : form.target
                ? [form.target.id]
                : []
        }
        onSelect={handlePickCountry}
      />

      {activeDatePicker ? (
        <DatePickerModal
          isOpen
          allowPartial
          anchorEl={
            typeof document !== 'undefined'
              ? document.getElementById(
                  activeDatePicker === 'ended'
                    ? endedAnchorId
                    : activeDatePicker === 'severance'
                      ? severanceAnchorId
                      : declaredAnchorId,
                )
              : null
          }
          initialDate={pickerInitialDate}
          initialPrecision={pickerInitialPrecision}
          onSelect={applyPickedDate}
          onClose={() => setActiveDatePicker(null)}
        />
      ) : null}
    </>
  )
}

const ExtraTargetsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
`

const ExtraTargetChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 500;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: pointer;
    padding: 1px;
  }
`

const AddExtraTargetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const InlineToggleLink = styled.button`
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 2px 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PartyAxisRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: end;
  width: 100%;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`

const PartyBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

const SwapBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 36px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const RegimeGuideBanner = styled.div`
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`

const InlineEventBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`
