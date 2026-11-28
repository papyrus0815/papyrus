import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import type { IconType } from 'react-icons'
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiAward,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiColumns,
  FiEdit3,
  FiFileText,
  FiFlag,
  FiGitCommit,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiSlash,
  FiUserCheck,
  FiX,
  FiZap,
} from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  findPoliticalSystemAtDate,
  WAR_POWER_AUTHORITY_LABEL,
  type WarPowerAuthority,
} from '@/entities/political-system/model/political-system'
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
import {
  buildPartialDateString,
  parsePartialDateString,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { AlertBox } from '@/shared/ui/alert-box/alert-box'
import {
  CountryPicker,
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
  Input,
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
  PersonRegisterModalTextarea,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'

import { LinkedEventPickerField } from './linked-event-picker-field'
import { useSplitLayoutMode } from './politics-form/politics-form-parts'

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

type RelatedEventTab = 'ultimatum' | 'narrative'

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
  narrativeEventId: string
  narrativeEventInitialTitle: string
  terminationKind: WarTerminationKind | ''
  endedEra: 'BC' | 'AD'
  endedYear: string
  endedMonth: string
  endedDay: string
  peaceTreatyId: string
  terminationNote: string
}

/* ─── 개전 유형별 시맨틱 컬러 · 벡터 연출 · 대표 역사 사례 스펙 ─── */

const KIND_TONE_SPEC: Record<
  WarDeclarationKind,
  {
    Icon: IconType
    rgb: string
    text: string
    textDark: string
    accent: string
    vectorBadge: string
    friendlySub: string
    example: string
    tensionLevel: 1 | 2 | 3 | 4 | 5
    tensionLabel: string
    beamMode: 'comet' | 'countdown' | 'shield' | 'lightning' | 'flip' | 'sever'
    sealGlyph: string
  }
> = {
  FORMAL_DECLARATION: {
    Icon: FiFileText,
    rgb: '220, 38, 38',
    text: '#b91c1c',
    textDark: '#fca5a5',
    accent: '#dc2626',
    vectorBadge: '공식 선전포고 전달',
    friendlySub: '외교 각서·의회 승인 후 정식 통보',
    example: '예: 1914 오스트리아→세르비아 · 1941 미국→일본',
    tensionLevel: 5,
    tensionLabel: '전면 교전 돌입 · 정식 선전포고',
    beamMode: 'comet',
    sealGlyph: '宣',
  },
  ULTIMATUM_EXPIRY: {
    Icon: FiClock,
    rgb: '217, 119, 6',
    text: '#b45309',
    textDark: '#fcd34d',
    accent: '#d97706',
    vectorBadge: '최후통첩 시한 만료',
    friendlySub: '최후통첩 시한이 지나 개전 돌입',
    example: '예: 1914 영국→독일 · 1939 영·불→독일',
    tensionLevel: 4,
    tensionLabel: '시한 만료 · 조건부 자동 개전',
    beamMode: 'countdown',
    sealGlyph: '限',
  },
  ALLIANCE_ENTRY: {
    Icon: FiShield,
    rgb: '37, 99, 235',
    text: '#1d4ed8',
    textDark: '#93c5fd',
    accent: '#2563eb',
    vectorBadge: '동맹 의무 참전',
    friendlySub: '동맹·상호방위 조약에 따라 합류',
    example: '예: 상호방위·삼국동맹 연쇄 참전',
    tensionLevel: 4,
    tensionLabel: '동맹 조약 발동 · 연쇄 참전',
    beamMode: 'shield',
    sealGlyph: '盟',
  },
  UNDECLARED_HOSTILITIES: {
    Icon: FiZap,
    rgb: '147, 51, 234',
    text: '#7e22ce',
    textDark: '#d8b4fe',
    accent: '#9333ea',
    vectorBadge: '무선전 기습 개전',
    friendlySub: '사전 통보 없이 기습 공격으로 시작',
    example: '예: 1904 여순 기습 · 1941 바르바로사 작전',
    tensionLevel: 5,
    tensionLabel: '선전 절차 생략 · 기습 무력 충돌',
    beamMode: 'lightning',
    sealGlyph: '襲',
  },
  CO_BELLIGERENCY: {
    Icon: FiRefreshCw,
    rgb: '13, 148, 136',
    text: '#0f766e',
    textDark: '#5eead4',
    accent: '#0d9488',
    vectorBadge: '진영 전환 · 공동교전',
    friendlySub: '진영을 바꿔 어제의 동맹과 교전',
    example: '예: 1943 이탈리아 바돌리오 정부 대독 선전',
    tensionLevel: 3,
    tensionLabel: '진영 전환 · 공동교전국 재참전',
    beamMode: 'flip',
    sealGlyph: '轉',
  },
  DIPLOMATIC_SEVERANCE: {
    Icon: FiSlash,
    rgb: '71, 85, 105',
    text: '#334155',
    textDark: '#cbd5e1',
    accent: '#64748b',
    vectorBadge: '외교 관계 단절 (단교)',
    friendlySub: '대사 소환 및 공식 국교 단절',
    example: '예: 1917 미·독 단교 (선전포고 2개월 전)',
    tensionLevel: 2,
    tensionLabel: '외교 결렬 · 국교 단절 단계',
    beamMode: 'sever',
    sealGlyph: '斷',
  },
}

const CASUS_BELLI_SPARKS: ReadonlyArray<{ label: string; snippet: string }> = [
  { label: '최후통첩 거부', snippet: '최후통첩 시한 만료 및 핵심 요구 조건 거부' },
  { label: '동맹 의무 이행', snippet: '상호방위·동맹 조약상 참전 의무 이행' },
  { label: '영세중립 침해', snippet: '조약으로 보장된 중립국 영토 무단 침범' },
  { label: '국경 도발·충돌', snippet: '접경 지역 무력 도발 및 주권 침해 주장' },
  { label: '실지·미수복 영토 회복', snippet: '역사적 실지(미수복 영토) 수복 및 민족 통합' },
  { label: '해상 봉쇄·통상 파괴', snippet: '무제한 잠수함전·해상 봉쇄로 인한 자국 선박 피해' },
  { label: '예방전쟁 주장', snippet: '상대국의 총동원·국경 병력 집결에 대한 선제 방어 주장' },
]

const TERMINATION_OPTIONS: ChoiceChipOption<WarTerminationKind>[] =
  WAR_TERMINATION_KIND_ORDER.map((key) => ({
    value: key,
    label: WAR_TERMINATION_KIND_LABELS[key],
  }))

const numOrNull = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function formatCompactDateParts(
  era: 'BC' | 'AD',
  yearStr: string,
  monthStr: string,
  dayStr: string,
): string | null {
  const y = numOrNull(yearStr)
  if (y == null) return null
  const prefix = era === 'BC' ? `BC ${y}` : `${y}`
  const m = numOrNull(monthStr)
  if (m == null) return `${prefix}년`
  const d = numOrNull(dayStr)
  if (d == null) return `${prefix}년 ${m}월`
  return `${prefix}년 ${m}월 ${d}일`
}

function computeApproxDurationLabel(
  start: {
    era: 'BC' | 'AD'
    year: number | null
    month: number | null
    day: number | null
  },
  end: {
    era: 'BC' | 'AD'
    year: number | null
    month: number | null
    day: number | null
  },
): string | null {
  if (start.year == null || end.year == null) return null
  const sy = start.era === 'BC' ? -start.year : start.year
  const ey = end.era === 'BC' ? -end.year : end.year
  if (
    start.era === 'AD' &&
    end.era === 'AD' &&
    sy >= 100 &&
    ey >= 100 &&
    start.month != null &&
    end.month != null
  ) {
    const d1 = Date.UTC(sy, start.month - 1, start.day ?? 1)
    const d2 = Date.UTC(ey, end.month - 1, end.day ?? 1)
    const diffDays = Math.round((d2 - d1) / 86_400_000)
    if (diffDays < 0) return null
    if (diffDays === 0) return '당일'
    if (diffDays < 60) return `${diffDays}일간`
    const years = Math.floor(diffDays / 365.25)
    const months = Math.round((diffDays - years * 365.25) / 30.44)
    if (years === 0) return `약 ${Math.max(1, months)}개월`
    return months > 0 ? `${years}년 ${months}개월` : `약 ${years}년`
  }
  const diffY = ey - sy
  if (diffY < 0) return null
  return diffY === 0 ? '같은 해' : `약 ${diffY}년`
}

function evaluateConstitutionalStatus(params: {
  authority: WarPowerAuthority | null | undefined
  kind: WarDeclarationKind
  hasChamber: boolean
  yeas: number | null
  nays: number | null
  hasLeader: boolean
}): {
  tone: 'valid' | 'executive' | 'bypass' | 'warning' | 'neutral'
  badge: string
  detail: string
} | null {
  const { authority, kind, hasChamber, yeas, nays, hasLeader } = params
  if (!authority) return null

  if (authority === 'RENOUNCED') {
    return {
      tone: 'warning',
      badge: '교전권 포기 헌법 체제',
      detail: '당시 헌법상 국가 교전권·선전포고권이 인정되지 않는 체제예요.',
    }
  }

  const requiresChamber =
    authority === 'LEGISLATURE_EXCLUSIVE' ||
    authority === 'EXECUTIVE_WITH_LEGISLATURE_CONSENT' ||
    authority === 'MONARCH_WITH_UPPER_HOUSE'

  if (kind === 'UNDECLARED_HOSTILITIES') {
    return {
      tone: 'bypass',
      badge: '절차 생략 · 기습 개전',
      detail: requiresChamber
        ? '헌법상 의회 동의 절차를 거치지 않고 기습 행동으로 개전했어요.'
        : '공식 선전포고 통보 없이 바로 교전에 돌입했어요.',
    }
  }

  if (requiresChamber) {
    if (hasChamber) {
      if (yeas != null && nays != null && yeas <= nays) {
        return {
          tone: 'warning',
          badge: '찬성 과반 미달 확인 필요',
          detail: '입력된 찬성표가 반대표 이하예요. 표결 숫자를 한 번 확인해 주세요.',
        }
      }
      return {
        tone: 'valid',
        badge: '합헌 의회 승인 충족',
        detail: '당시 헌법이 요구하는 의회·상원 승인 절차가 잘 기록되었어요.',
      }
    }
    return {
      tone: 'neutral',
      badge: '의회 승인 절차 대상',
      detail:
        '이 체제는 의회(또는 상원) 승인을 거치는 국가예요. 표결 기록이 있다면 아래에 적어 보세요.',
    }
  }

  if (
    authority === 'MONARCH_PREROGATIVE' ||
    authority === 'EXECUTIVE_EXCLUSIVE'
  ) {
    return {
      tone: 'executive',
      badge: hasLeader ? '군주·행정부 대권 발동' : '군주·행정부 전권 체제',
      detail:
        authority === 'MONARCH_PREROGATIVE'
          ? '의회 표결 없이 군주의 고유 권한으로 선전포고가 이루어지는 체제예요.'
          : '행정부·최고지도부의 결정만으로 개전이 성립하는 체제예요.',
    }
  }

  return null
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
      target: toPartyState(
        editing.targetCountry,
        editing.targetHistoricalCountry,
      ),
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
      narrativeEventId: editing.narrativeEventId ?? '',
      narrativeEventInitialTitle: editing.narrativeEvent?.title ?? '',
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
    narrativeEventId: narr?.id ?? '',
    narrativeEventInitialTitle: narr?.title ?? '',
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
  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode(
    'papyrus:war-declaration-modal-layout',
  )
  const [activeNavSection, setActiveNavSection] = useState<
    'stage' | 'constitution' | 'chain'
  >('stage')

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
  const [swapSpinCount, setSwapSpinCount] = useState(0)
  const [pickerSlot, setPickerSlot] = useState<
    'declaring' | 'target' | 'extraTarget' | null
  >(null)
  const [activeDatePicker, setActiveDatePicker] = useState<
    'declared' | 'severance' | 'ended' | null
  >(null)

  const [showCustomTitleMemo, setShowCustomTitleMemo] = useState(false)
  const [showPersonFallback, setShowPersonFallback] = useState(false)
  const [showTerminationDetails, setShowTerminationDetails] = useState(false)
  const [showExtraEventsDrawer, setShowExtraEventsDrawer] = useState(false)
  const [relatedEventTab, setRelatedEventTab] =
    useState<RelatedEventTab>('ultimatum')

  useEffect(() => {
    if (!open) {
      setPickerSlot(null)
      setActiveDatePicker(null)
      return
    }
    const next = buildInitialState({
      editing,
      defaultDeclaring,
      defaultTarget,
      defaultWarEvent,
      defaultNarrativeEvent,
    })
    setActiveNavSection('stage')
    setSwapSpinCount(0)
    setForm(next)
    setShowCustomTitleMemo(Boolean(next.title.trim() || next.summary.trim()))
    setShowPersonFallback(Boolean(next.decidedByPersonId))
    setShowTerminationDetails(
      Boolean(
        (next.terminationKind && next.terminationKind !== 'ONGOING') ||
          next.endedYear.trim() ||
          next.peaceTreatyId ||
          next.terminationNote.trim(),
      ),
    )
    setShowExtraEventsDrawer(
      Boolean(next.ultimatumEventId || next.narrativeEventId),
    )
    setRelatedEventTab(
      next.narrativeEventId && !next.ultimatumEventId
        ? 'narrative'
        : 'ultimatum',
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

  const activeRegimeAtDate = useMemo(() => {
    const list = politicalSystemsQuery.data ?? []
    if (list.length === 0) return null
    if (parsedDeclaredYear == null) {
      return list.find((ps) => ps.isCurrent) ?? list[0] ?? null
    }
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

  const contemporaryHeadCandidates = useMemo(() => {
    const rawTenures = Array.isArray(tenures) ? tenures : []
    const preferHos =
      activeRegimeAtDate?.warPowerAuthority === 'MONARCH_PREROGATIVE' ||
      activeRegimeAtDate?.warPowerAuthority === 'MONARCH_WITH_UPPER_HOUSE' ||
      activeRegimeAtDate?.governmentForm === 'PRESIDENTIAL' ||
      activeRegimeAtDate?.governmentForm === 'ABSOLUTE_MONARCHY'

    const heads = rawTenures.filter((t) => {
      if (
        t.positionType !== 'HEAD_OF_STATE' &&
        t.positionType !== 'HEAD_OF_GOVERNMENT'
      ) {
        return false
      }
      if (signedDeclaredYear == null) return true
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

    heads.sort((a, b) => {
      const aPreferred = preferHos
        ? a.positionType === 'HEAD_OF_STATE'
        : a.positionType === 'HEAD_OF_GOVERNMENT'
      const bPreferred = preferHos
        ? b.positionType === 'HEAD_OF_STATE'
        : b.positionType === 'HEAD_OF_GOVERNMENT'
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1
      return (b.startYear ?? 0) - (a.startYear ?? 0)
    })

    return heads.slice(0, 4).map((t) => ({
      id: t.id,
      name: t.person ? getPersonDisplayName(t.person) : '인물 미상',
      role: t.title || t.positionDefinition?.title || '수반',
    }))
  }, [
    tenures,
    signedDeclaredYear,
    activeRegimeAtDate?.warPowerAuthority,
    activeRegimeAtDate?.governmentForm,
  ])

  useEffect(() => {
    if (editing || signedDeclaredYear == null) return
    const rawCabinets = Array.isArray(cabinets) ? cabinets : []
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

    if (!contemporaryHeadCandidates[0] && !matchingCabinet) return
    setForm((prev) => ({
      ...prev,
      decidedByTenureId:
        prev.decidedByTenureId || prev.decidedByPersonId
          ? prev.decidedByTenureId
          : (contemporaryHeadCandidates[0]?.id ?? ''),
      cabinetId: prev.cabinetId || (matchingCabinet?.id ?? ''),
    }))
  }, [editing, signedDeclaredYear, cabinets, contemporaryHeadCandidates])

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
        const posTitle = t.title || t.positionDefinition?.title || '직위'
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
              ? '당시 수반 · 국가원수'
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
      group: tr.type === 'PEACE' ? '강화 · 평화 조약' : '기타 조약 · 협정',
    }))
  }, [treatiesResult])

  const selectedLeaderSummary = useMemo(() => {
    if (form.decidedByTenureId) {
      const hit = (Array.isArray(tenures) ? tenures : []).find(
        (t) => t.id === form.decidedByTenureId,
      )
      if (hit) {
        const name = hit.person ? getPersonDisplayName(hit.person) : '인물'
        const role = hit.title || hit.positionDefinition?.title || '재임 직위'
        const avatar = (
          hit.person as { profileImageUrl?: string | null } | undefined
        )?.profileImageUrl
        return { name, role, avatar: avatar ?? null }
      }
    }
    if (form.decidedByPersonId) {
      const hit = (Array.isArray(countryPersons) ? countryPersons : []).find(
        (p: any) => p.id === form.decidedByPersonId,
      ) as any
      if (hit) {
        return {
          name: getPersonDisplayName({
            name: hit.name ?? '',
            surname: hit.surname ?? null,
            middleName: hit.middleName ?? null,
            nameDisplayOrder: hit.nameDisplayOrder ?? null,
          }),
          role: '직접 지정 인물',
          avatar: hit.profileImageUrl ?? null,
        }
      }
    }
    return null
  }, [form.decidedByTenureId, form.decidedByPersonId, tenures, countryPersons])

  const declaringPolityMeta = useMemo(() => {
    if (!form.declaring) return null
    if (!form.declaring.isHistorical) return '현대 국가'
    const hit = historicalCountries.find((hc) => hc.id === form.declaring!.id)
    if (!hit) return '역사 국가'
    const sy =
      hit.startYear != null
        ? `${hit.startEra === 'BC' ? 'BC ' : ''}${hit.startYear}`
        : ''
    const ey =
      hit.endYear != null
        ? `${hit.endEra === 'BC' ? 'BC ' : ''}${hit.endYear}`
        : ''
    return sy || ey ? `역사 국가 · ${sy}~${ey}` : '역사 국가'
  }, [form.declaring, historicalCountries])

  const targetPolityMeta = useMemo(() => {
    if (!form.target) return null
    if (!form.target.isHistorical) return '현대 국가'
    const hit = historicalCountries.find((hc) => hc.id === form.target!.id)
    if (!hit) return '역사 국가'
    const sy =
      hit.startYear != null
        ? `${hit.startEra === 'BC' ? 'BC ' : ''}${hit.startYear}`
        : ''
    const ey =
      hit.endYear != null
        ? `${hit.endEra === 'BC' ? 'BC ' : ''}${hit.endYear}`
        : ''
    return sy || ey ? `역사 국가 · ${sy}~${ey}` : '역사 국가'
  }, [form.target, historicalCountries])

  const severanceGapLabel = useMemo(
    () =>
      form.kind === 'DIPLOMATIC_SEVERANCE' || form.showSeveranceDate
        ? computeApproxDurationLabel(
            {
              era: form.severanceEra,
              year: numOrNull(form.severanceYear),
              month: numOrNull(form.severanceMonth),
              day: numOrNull(form.severanceDay),
            },
            {
              era: form.declaredEra,
              year: numOrNull(form.declaredYear),
              month: numOrNull(form.declaredMonth),
              day: numOrNull(form.declaredDay),
            },
          )
        : null,
    [
      form.kind,
      form.showSeveranceDate,
      form.severanceEra,
      form.severanceYear,
      form.severanceMonth,
      form.severanceDay,
      form.declaredEra,
      form.declaredYear,
      form.declaredMonth,
      form.declaredDay,
    ],
  )

  const belligerenceDurationLabel = useMemo(
    () =>
      computeApproxDurationLabel(
        {
          era: form.declaredEra,
          year: numOrNull(form.declaredYear),
          month: numOrNull(form.declaredMonth),
          day: numOrNull(form.declaredDay),
        },
        {
          era: form.endedEra,
          year: numOrNull(form.endedYear),
          month: numOrNull(form.endedMonth),
          day: numOrNull(form.endedDay),
        },
      ),
    [
      form.declaredEra,
      form.declaredYear,
      form.declaredMonth,
      form.declaredDay,
      form.endedEra,
      form.endedYear,
      form.endedMonth,
      form.endedDay,
    ],
  )

  const voteStats = useMemo(() => {
    const y = numOrNull(form.yeas) ?? 0
    const n = numOrNull(form.nays) ?? 0
    const a = numOrNull(form.abstentions) ?? 0
    const hasAny =
      form.yeas.trim() !== '' ||
      form.nays.trim() !== '' ||
      form.abstentions.trim() !== ''
    const total = y + n + a
    if (!hasAny || total <= 0) return null
    const yeaPct = Math.round((y / total) * 1000) / 10
    const nayPct = Math.round((n / total) * 1000) / 10
    const absPct = Math.max(0, Math.round((100 - yeaPct - nayPct) * 10) / 10)
    const verdict =
      n === 0 && a === 0 && y > 0
        ? '만장일치 가결'
        : y > n && yeaPct >= 85
          ? '압도적 가결'
          : y > n
            ? '과반 가결'
            : y === n
              ? '가부 동수'
              : '부결 · 과반 미달'
    return { y, n, a, total, yeaPct, nayPct, absPct, verdict, passed: y > n }
  }, [form.yeas, form.nays, form.abstentions])

  const constitutionalEval = useMemo(
    () =>
      evaluateConstitutionalStatus({
        authority: activeRegimeAtDate?.warPowerAuthority,
        kind: form.kind,
        hasChamber: Boolean(form.approvedChamberId),
        yeas: numOrNull(form.yeas),
        nays: numOrNull(form.nays),
        hasLeader: Boolean(form.decidedByTenureId || form.decidedByPersonId),
      }),
    [
      activeRegimeAtDate?.warPowerAuthority,
      form.kind,
      form.approvedChamberId,
      form.yeas,
      form.nays,
      form.decidedByTenureId,
      form.decidedByPersonId,
    ],
  )

  const autoGeneratedTitle = useMemo(() => {
    if (form.declaring && form.target) {
      const actionNoun =
        form.kind === 'DIPLOMATIC_SEVERANCE'
          ? '국교 단절'
          : form.kind === 'UNDECLARED_HOSTILITIES'
            ? '기습 개전'
            : form.kind === 'ALLIANCE_ENTRY'
              ? '동맹 참전'
              : '선전포고'
      return `${form.declaring.name}의 대(對)${form.target.name} ${actionNoun}`
    }
    return '{선포국}의 대(對){상대국} 선전포고'
  }, [form.declaring, form.target, form.kind])

  const formattedDeclaredDate = useMemo(
    () =>
      formatCompactDateParts(
        form.declaredEra,
        form.declaredYear,
        form.declaredMonth,
        form.declaredDay,
      ),
    [form.declaredEra, form.declaredYear, form.declaredMonth, form.declaredDay],
  )

  const selectedTreatyName = useMemo(() => {
    if (!form.peaceTreatyId) return null
    return (
      (treatiesResult?.items ?? []).find((t) => t.id === form.peaceTreatyId)
        ?.name ?? null
    )
  }, [form.peaceTreatyId, treatiesResult?.items])

  const liveDispatchInfo = useMemo(() => {
    if (!form.declaring && !form.target) {
      return {
        ready: false,
        text: '위에서 선포한 국가와 상대 국가를 고르면, 입력한 내용이 한 줄 역사 기록 문장으로 자동 완성돼요.',
      }
    }
    if (!form.declaring) {
      return {
        ready: false,
        text: `${form.target!.name}을(를) 상대로 선포한 국가만 더 고르면 한 줄 기록 문장이 바로 완성돼요!`,
      }
    }
    if (!form.target) {
      return {
        ready: false,
        text: `${form.declaring.name} 측이 어느 나라에 선포했는지 오른쪽에서 상대 국가를 골라 주세요.`,
      }
    }

    const declText = form.declaring.name
    const allTargets = [
      form.target.name,
      ...form.extraTargets.map((t) => t.name),
    ]
    const targText = allTargets.join(' · ')
    const leaderText = selectedLeaderSummary
      ? `(${selectedLeaderSummary.name}${selectedLeaderSummary.role !== '직접 지정 인물' ? ` · ${selectedLeaderSummary.role}` : ''})`
      : ''
    const actionVerb: Record<WarDeclarationKind, string> = {
      FORMAL_DECLARATION: '공식 선전포고를 전달함',
      ULTIMATUM_EXPIRY: '최후통첩 시한 만료와 함께 개전함',
      ALLIANCE_ENTRY: '동맹 의무에 따라 참전을 선언함',
      UNDECLARED_HOSTILITIES: '선전포고 없이 기습 적대행위를 개시함',
      CO_BELLIGERENCY: '진영을 전환하여 공동교전·재참전을 선포함',
      DIPLOMATIC_SEVERANCE: '외교 관계를 공식 단절(단교)함',
    }
    const casusPart = form.casusBelli.trim()
      ? ` 「${form.casusBelli.trim()}」을(를) 사유로`
      : ''
    const endDateText = formatCompactDateParts(
      form.endedEra,
      form.endedYear,
      form.endedMonth,
      form.endedDay,
    )
    const tail =
      endDateText || selectedTreatyName || form.terminationKind
        ? ` — ${[
            endDateText,
            selectedTreatyName
              ? `《${selectedTreatyName}》`
              : form.terminationKind
                ? WAR_TERMINATION_KIND_LABELS[form.terminationKind]
                : null,
            belligerenceDurationLabel
              ? `교전 ${belligerenceDurationLabel}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')} 마무리`
        : ''

    return {
      ready: true,
      text: `${formattedDeclaredDate ? `${formattedDeclaredDate}, ` : ''}${declText}${leaderText} 측이${casusPart} ${targText}에 ${actionVerb[form.kind]}${tail}`,
    }
  }, [
    form.declaring,
    form.target,
    form.extraTargets,
    formattedDeclaredDate,
    form.casusBelli,
    form.kind,
    form.endedEra,
    form.endedYear,
    form.endedMonth,
    form.endedDay,
    form.terminationKind,
    selectedLeaderSummary,
    selectedTreatyName,
    belligerenceDurationLabel,
  ])

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

  // 단계별 완료·풍성도 체크 (어디까지 입력됐는지 한눈에 확 보이게!)
  const stepStatus = useMemo(() => {
    const step1 = Boolean(
      form.declaring &&
        form.target &&
        (form.declaredYear.trim() || form.casusBelli.trim()),
    )
    const step2 = Boolean(
      form.decidedByTenureId ||
        form.decidedByPersonId ||
        form.cabinetId ||
        form.approvedChamberId ||
        voteStats,
    )
    const step3 = Boolean(
      form.warEventId ||
        form.terminationKind ||
        form.endedYear.trim() ||
        form.peaceTreatyId ||
        form.ultimatumEventId ||
        form.narrativeEventId,
    )
    const filledDetailsCount = [
      form.declaredYear.trim(),
      form.casusBelli.trim(),
      form.decidedByTenureId || form.decidedByPersonId,
      form.approvedChamberId || voteStats,
      form.warEventId,
      form.terminationKind || form.peaceTreatyId,
    ].filter(Boolean).length
    return { step1, step2, step3, filledDetailsCount }
  }, [form, voteStats])

  const isConcluded = Boolean(
    (form.terminationKind && form.terminationKind !== 'ONGOING') ||
      form.peaceTreatyId ||
      form.endedYear.trim(),
  )

  const swapParties = () => {
    setSwapSpinCount((c) => c + 1)
    setForm((prev) => ({
      ...prev,
      declaring: prev.target,
      target: prev.declaring,
      decidedByTenureId: '',
      decidedByPersonId: '',
      cabinetId: '',
      approvedChamberId: '',
    }))
  }

  const toggleCasusSpark = (snippet: string) => {
    setForm((prev) => {
      const parts = prev.casusBelli
        .split(' · ')
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.includes(snippet)) {
        return {
          ...prev,
          casusBelli: parts.filter((s) => s !== snippet).join(' · '),
        }
      }
      return {
        ...prev,
        casusBelli: [...parts, snippet].join(' · '),
      }
    })
  }

  const jumpToSection = (id: 'stage' | 'constitution' | 'chain') => {
    setActiveNavSection(id)
    const el = scrollRef.current?.querySelector(`#war-decl-sec-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      notify.error('선포한 국가와 상대 국가를 모두 선택해 주세요.')
      return
    }
    if (isSameParty) {
      notify.error('선포한 국가와 상대 국가가 같을 수 없어요.')
      return
    }
    if (isDateInverted) {
      notify.error('종결 날짜가 선포 날짜보다 앞설 수 없어요.')
      return
    }

    const declaredYear = numOrNull(form.declaredYear)
    const declaredMonth =
      declaredYear != null ? numOrNull(form.declaredMonth) : null
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
      narrativeEventId: form.narrativeEventId || null,
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
      declaringCountryId: form.declaring.isHistorical
        ? null
        : form.declaring.id,
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
        queryClient.invalidateQueries({
          queryKey: ['country-military-events'],
        }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['treaty'] }),
        queryClient.invalidateQueries({ queryKey: ['treaties'] }),
      ])
      notify.success(
        editing
          ? '선전포고 기록을 수정했어요.'
          : form.extraTargets.length > 0
            ? `선전포고 기록 ${form.extraTargets.length + 1}건을 한 번에 저장했어요.`
            : '선전포고 기록을 저장했어요.',
      )
      if (saved) onSaved?.(saved)
      onClose()
    } catch (err) {
      notify.error(
        err instanceof Error
          ? err.message
          : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
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

  const kindTone = KIND_TONE_SPEC[form.kind]
  const KindVectorIcon = kindTone.Icon
  const bothPartiesReady = Boolean(
    form.declaring && form.target && !isSameParty,
  )

  const activeSparkSet = useMemo(
    () =>
      new Set(
        form.casusBelli
          .split(' · ')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    [form.casusBelli],
  )

  const showTerminationDetailFields =
    Boolean(form.terminationKind && form.terminationKind !== 'ONGOING') ||
    showTerminationDetails ||
    Boolean(form.endedYear.trim()) ||
    Boolean(form.peaceTreatyId) ||
    Boolean(form.terminationNote.trim())

  const extraLinkedCount =
    (form.ultimatumEventId ? 1 : 0) + (form.narrativeEventId ? 1 : 0)

  const sealTriggerKey = `${form.kind}-${bothPartiesReady ? 'ready' : 'idle'}-${isConcluded ? 'peace' : 'war'}-${selectedLeaderSummary?.name ?? ''}`

  return (
    <>
      <RegisterModal
        isOpen={open}
        onClose={onClose}
        title={editing ? '선전포고 · 개전 기록 수정' : '선전포고 · 개전 기록하기'}
        maxWidth={
          layoutMode === 'split'
            ? 'min(1480px, 96vw)'
            : 'min(1060px, 96vw)'
        }
        minHeight="86vh"
        fullBleedOnMobile
        closeOnOverlayClick={
          !saving && pickerSlot === null && activeDatePicker === null
        }
        closeOnEsc={!saving && pickerSlot === null && activeDatePicker === null}
        headerActions={
          <HeaderActionsBar>
            <SectionJumpNav aria-label="모달 구역 바로가기">
              <SectionJumpBtn
                type="button"
                $active={activeNavSection === 'stage'}
                onClick={() => jumpToSection('stage')}
              >
                ① 당사국·개전 {bothPartiesReady ? '✓' : ''}
              </SectionJumpBtn>
              <SectionJumpBtn
                type="button"
                $active={activeNavSection === 'constitution'}
                onClick={() => jumpToSection('constitution')}
              >
                ② 결정·표결 {stepStatus.step2 ? '✓' : ''}
              </SectionJumpBtn>
              <SectionJumpBtn
                type="button"
                $active={activeNavSection === 'chain'}
                onClick={() => jumpToSection('chain')}
              >
                ③ 전쟁·마무리 {stepStatus.step3 ? '✓' : ''}
              </SectionJumpBtn>
            </SectionJumpNav>
            <LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              onClick={toggleLayoutMode}
              title="넓은 2단 보기 / 넓은 1단 보기 전환"
            >
              <FiColumns size={13} aria-hidden />
              <span>
                {layoutMode === 'split' ? '넓은 2단 보기' : '1단 크게 보기'}
              </span>
            </LayoutModeToggleBtn>
            {!editing ? (
              <HeaderResetBtn
                type="button"
                onClick={() => {
                  const reset = buildInitialState({
                    defaultDeclaring,
                    defaultTarget,
                    defaultWarEvent,
                    defaultNarrativeEvent,
                  })
                  setForm(reset)
                  setShowCustomTitleMemo(false)
                  setShowPersonFallback(false)
                  setShowTerminationDetails(false)
                  setShowExtraEventsDrawer(Boolean(reset.narrativeEventId))
                  setRelatedEventTab(
                    reset.narrativeEventId ? 'narrative' : 'ultimatum',
                  )
                }}
              >
                처음부터
              </HeaderResetBtn>
            ) : null}
          </HeaderActionsBar>
        }
      >
        <WideModalScroll ref={scrollRef}>
          {saving ? (
            <KitBusyBar role="status" aria-live="polite">
              선전포고 기록을 저장하고 있어요...
            </KitBusyBar>
          ) : null}

          <StudioCanvas>
            {/* ═══ 상단 라이브 상황판: 위기 수위 계기판 + 당사국 키네틱 대치 + 국새 포고문 카드 ═══ */}
            <ConfrontationStage
              id="war-decl-sec-stage"
              $accentRgb={isConcluded ? '22, 163, 74' : kindTone.rgb}
              aria-label="교전 당사국 대치 구도"
            >
              {/* 1) 한눈에 현재 국면을 확 알려주는 라이브 위기·종전 계기판 */}
              <CrisisMeterRibbon>
                <div className="meter-left">
                  <FiActivity size={14} aria-hidden />
                  <span className="meter-title">현재 외교·교전 국면</span>
                  <CrisisLevelBars aria-hidden>
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <CrisisBarSegment
                        key={lv}
                        $active={
                          isConcluded ? true : lv <= kindTone.tensionLevel
                        }
                        $rgb={isConcluded ? '22, 163, 74' : kindTone.rgb}
                      />
                    ))}
                  </CrisisLevelBars>
                  <CrisisStatusBadge
                    $concluded={isConcluded}
                    $rgb={kindTone.rgb}
                    $accent={kindTone.accent}
                  >
                    {isConcluded
                      ? `종전·강화 기록됨 (${
                          selectedTreatyName ??
                          (form.terminationKind
                            ? WAR_TERMINATION_KIND_LABELS[form.terminationKind]
                            : '교전 종료')
                        })`
                      : `LV.${kindTone.tensionLevel} · ${kindTone.tensionLabel}`}
                  </CrisisStatusBadge>
                </div>

                {belligerenceDurationLabel ? (
                  <DurationHighlightPill>
                    총 교전 기간 {belligerenceDurationLabel}
                  </DurationHighlightPill>
                ) : severanceGapLabel ? (
                  <DurationHighlightPill $tone="amber">
                    단교 {severanceGapLabel} 후 개전
                  </DurationHighlightPill>
                ) : null}
              </CrisisMeterRibbon>

              {/* 2) 좌·우 당사국 카드 & 키네틱 벡터 아레나 */}
              <ArenaGrid>
                {/* 좌측: 선포국 와이드 카드 */}
                <BelligerentDossier
                  as={motion.div}
                  key={`decl-${swapSpinCount}`}
                  initial={
                    swapSpinCount > 0 ? { x: 26, opacity: 0.65 } : false
                  }
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  $side="declaring"
                  $filled={Boolean(form.declaring)}
                >
                  <DossierHeaderRow>
                    <DossierEyebrow $side="declaring">
                      <FiFlag size={13} aria-hidden />
                      <span>누가 먼저 선포·개전했나요?</span>
                    </DossierEyebrow>
                    <RequiredMiniBadge $done={Boolean(form.declaring)}>
                      {form.declaring ? '✓ 선택됨' : '필수'}
                    </RequiredMiniBadge>
                  </DossierHeaderRow>

                  {form.declaring ? (
                    <DossierSelectedBody>
                      <DossierIdentityButton
                        type="button"
                        onClick={() => setPickerSlot('declaring')}
                        title="클릭해서 선포한 국가 변경하기"
                      >
                        <DossierEmblem
                          $side="declaring"
                          $engaged={bothPartiesReady && !isConcluded}
                        >
                          {form.declaring.flagEmoji ||
                            form.declaring.name.slice(0, 1)}
                        </DossierEmblem>
                        <DossierNameBlock>
                          <DossierCountryName>
                            <span>{form.declaring.name}</span>
                            <span className="change-hint">국가 변경</span>
                          </DossierCountryName>
                          <DossierPolitySub>
                            {declaringPolityMeta}
                            {activeRegimeAtDate?.name
                              ? ` · ${activeRegimeAtDate.name}`
                              : ''}
                          </DossierPolitySub>
                        </DossierNameBlock>
                      </DossierIdentityButton>
                      <DossierClearBtn
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            declaring: null,
                            decidedByTenureId: '',
                            decidedByPersonId: '',
                            cabinetId: '',
                            approvedChamberId: '',
                          }))
                        }
                        aria-label="선포국 선택 해제"
                      >
                        <FiX size={16} />
                      </DossierClearBtn>
                    </DossierSelectedBody>
                  ) : (
                    <DossierEmptyTrigger
                      type="button"
                      onClick={() => setPickerSlot('declaring')}
                    >
                      <span className="main">
                        <FiPlus size={17} />
                        선포한 국가 고르기
                      </span>
                      <span className="sub">
                        현대 국가·역사 국가 모두 검색할 수 있어요
                      </span>
                    </DossierEmptyTrigger>
                  )}
                </BelligerentDossier>

                {/* 중앙: 유형별 라이브 애니메이션 빔 + 스프링 공수 전환 허브 */}
                <VectorHub>
                  <VectorBadge
                    as={motion.div}
                    key={form.kind}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 24 }}
                    $rgb={kindTone.rgb}
                    $accent={kindTone.accent}
                    title={WAR_DECLARATION_KIND_HINTS[form.kind]}
                  >
                    <KindVectorIcon size={14} aria-hidden />
                    <span>{kindTone.vectorBadge}</span>
                  </VectorBadge>

                  {/* 6가지 시작 방식마다 다르게 움직이는 키네틱 트랙 */}
                  <KineticBeamStage
                    $rgb={kindTone.rgb}
                    $mode={kindTone.beamMode}
                    $engaged={bothPartiesReady}
                    aria-hidden
                  >
                    {kindTone.beamMode === 'sever' ? (
                      <>
                        <div className="half left" />
                        <span className="sever-mark">✕</span>
                        <div className="half right" />
                      </>
                    ) : (
                      <>
                        <div className="base-rail" />
                        <div className="traveling-pulse" />
                        <span className="arrow-head">▶</span>
                      </>
                    )}
                  </KineticBeamStage>

                  <SwapDirectionPill
                    type="button"
                    onClick={swapParties}
                    title="선포한 나라와 상대 나라를 서로 맞바꿔요"
                  >
                    <motion.span
                      animate={{ rotate: swapSpinCount * 180 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      style={{ display: 'inline-flex' }}
                    >
                      <FiRefreshCw size={13} />
                    </motion.span>
                    <span>공수 전환</span>
                  </SwapDirectionPill>
                </VectorHub>

                {/* 우측: 상대국 와이드 카드 + 동시 선포국 스택 */}
                <BelligerentDossier
                  as={motion.div}
                  key={`targ-${swapSpinCount}`}
                  initial={
                    swapSpinCount > 0 ? { x: -26, opacity: 0.65 } : false
                  }
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  $side="target"
                  $filled={Boolean(form.target)}
                >
                  <DossierHeaderRow>
                    <DossierEyebrow $side="target">
                      <FiShield size={13} aria-hidden />
                      <span>
                        어느 나라를 상대로 하나요?
                        {form.extraTargets.length > 0
                          ? ` (총 ${form.extraTargets.length + 1}개국)`
                          : ''}
                      </span>
                    </DossierEyebrow>
                    <RequiredMiniBadge $done={Boolean(form.target)}>
                      {form.target ? '✓ 선택됨' : '필수'}
                    </RequiredMiniBadge>
                  </DossierHeaderRow>

                  {form.target ? (
                    <>
                      <DossierSelectedBody>
                        <DossierIdentityButton
                          type="button"
                          onClick={() => setPickerSlot('target')}
                          title="클릭해서 상대 국가 변경하기"
                        >
                          <DossierEmblem
                            $side="target"
                            $engaged={bothPartiesReady && !isConcluded}
                          >
                            {form.target.flagEmoji ||
                              form.target.name.slice(0, 1)}
                          </DossierEmblem>
                          <DossierNameBlock>
                            <DossierCountryName>
                              <span>{form.target.name}</span>
                              <span className="change-hint">국가 변경</span>
                            </DossierCountryName>
                            <DossierPolitySub>
                              {targetPolityMeta}
                            </DossierPolitySub>
                          </DossierNameBlock>
                        </DossierIdentityButton>
                        <DossierClearBtn
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, target: null }))
                          }
                          aria-label="상대국 선택 해제"
                        >
                          <FiX size={16} />
                        </DossierClearBtn>
                      </DossierSelectedBody>

                      {!editing ? (
                        <ExtraDominoStack>
                          <AnimatePresence initial={false}>
                            {form.extraTargets.map((et, idx) => (
                              <DominoChip
                                as={motion.span}
                                key={`${et.isHistorical ? 'h' : 'm'}:${et.id}`}
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ duration: 0.16 }}
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
                                  <FiX size={12} />
                                </button>
                              </DominoChip>
                            ))}
                          </AnimatePresence>
                          <AddDominoBtn
                            type="button"
                            onClick={() => setPickerSlot('extraTarget')}
                            title="같은 날 여러 나라에 동시에 선전포고했다면 한 번에 묶어 저장할 수 있어요"
                          >
                            <FiPlus size={12.5} />
                            <span>같은 날 선포한 국가 더 추가</span>
                          </AddDominoBtn>
                        </ExtraDominoStack>
                      ) : null}
                    </>
                  ) : (
                    <DossierEmptyTrigger
                      type="button"
                      onClick={() => setPickerSlot('target')}
                    >
                      <span className="main">
                        <FiPlus size={17} />
                        상대 국가 고르기
                      </span>
                      <span className="sub">
                        선전포고를 받거나 공격당한 나라를 골라 주세요
                      </span>
                    </DossierEmptyTrigger>
                  )}
                </BelligerentDossier>
              </ArenaGrid>

              {isSameParty ? (
                <AlertBox variant="danger" icon={<FiAlertCircle />}>
                  선포한 국가와 상대 국가가 같아요. 서로 다른 두 나라를 골라 주세요.
                </AlertBox>
              ) : null}

              {/* 3) 국새 인장 애니메이션이 찍히는 라이브 포고문 카드 */}
              <DispatchTickerBar $ready={liveDispatchInfo.ready}>
                <WaxSealMedallion
                  as={motion.div}
                  key={sealTriggerKey}
                  initial={
                    liveDispatchInfo.ready
                      ? { scale: 1.32, rotate: -14, opacity: 0.4 }
                      : false
                  }
                  animate={{ scale: 1, rotate: -4, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  $rgb={isConcluded ? '22, 163, 74' : kindTone.rgb}
                  $ready={liveDispatchInfo.ready}
                  aria-hidden
                >
                  <span>{isConcluded ? '和' : kindTone.sealGlyph}</span>
                </WaxSealMedallion>

                <DispatchContentStack>
                  <div className="top-row">
                    <DispatchKicker
                      $accent={isConcluded ? '#16a34a' : kindTone.accent}
                    >
                      포고 전문 미리보기
                    </DispatchKicker>

                    {/* 핵심 요소를 색깔 배지로 한눈에 요약해 주는 토큰 바 */}
                    {liveDispatchInfo.ready ? (
                      <VisualTokenStrip aria-hidden>
                        {formattedDeclaredDate ? (
                          <SummaryToken $tone="neutral">
                            📅 {formattedDeclaredDate}
                          </SummaryToken>
                        ) : null}
                        <SummaryToken $tone="crimson">
                          🚩 {form.declaring!.name}
                        </SummaryToken>
                        <SummaryToken $tone="slate">→</SummaryToken>
                        <SummaryToken $tone="blue">
                          🎯 {form.target!.name}
                          {form.extraTargets.length > 0
                            ? ` 외 ${form.extraTargets.length}개국`
                            : ''}
                        </SummaryToken>
                        {selectedLeaderSummary ? (
                          <SummaryToken $tone="indigo">
                            🖋 {selectedLeaderSummary.name}
                          </SummaryToken>
                        ) : null}
                        {voteStats ? (
                          <SummaryToken
                            $tone={voteStats.passed ? 'emerald' : 'crimson'}
                          >
                            🏛 {voteStats.verdict} ({voteStats.yeaPct}%)
                          </SummaryToken>
                        ) : null}
                        {isConcluded ? (
                          <SummaryToken $tone="emerald">
                            🕊{' '}
                            {selectedTreatyName ??
                              (form.terminationKind
                                ? WAR_TERMINATION_KIND_LABELS[
                                    form.terminationKind
                                  ]
                                : '종전')}
                          </SummaryToken>
                        ) : null}
                      </VisualTokenStrip>
                    ) : null}
                  </div>

                  <DispatchPreviewSentence $muted={!liveDispatchInfo.ready}>
                    {liveDispatchInfo.text}
                  </DispatchPreviewSentence>
                </DispatchContentStack>
              </DispatchTickerBar>
            </ConfrontationStage>

            {/* ═══ 본문 와이드 2단(또는 1단) 작업실 ═══ */}
            <WorkspaceColumns $split={layoutMode === 'split'}>
              {/* ── 좌측 카드: STEP 1 어떻게, 언제, 왜 시작됐나요? ── */}
              <ColumnStack>
                <StudioSectionCard>
                  <FriendlySectionHeader>
                    <SectionTitleRow>
                      <StepNumberPill $tone="crimson">
                        STEP 1 {stepStatus.step1 ? '✓' : ''}
                      </StepNumberPill>
                      <StudioSectionTitle>
                        1. 어떻게, 언제, 왜 시작됐나요?
                      </StudioSectionTitle>
                    </SectionTitleRow>
                    <SectionSubHint>
                      카드를 눌러 시작 방식을 고르면 대표 역사 사례와 함께 상단 상황판이 즉시 반응해요.
                    </SectionSubHint>
                  </FriendlySectionHeader>

                  {/* 3×2 와이드 시나리오 카드 그리드 (선택 시 체크 배지 + 대표 사례 표시) */}
                  <StudioFieldBlock>
                    <StudioFieldLabelRow>
                      <StudioFieldLabel as="div">시작 방식</StudioFieldLabel>
                    </StudioFieldLabelRow>

                    <ScenarioKindGrid role="radiogroup" aria-label="시작 방식">
                      {WAR_DECLARATION_KIND_ORDER.map((key) => {
                        const spec = KIND_TONE_SPEC[key]
                        const CardIcon = spec.Icon
                        const selected = form.kind === key
                        return (
                          <ScenarioKindCard
                            as={motion.button}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.985 }}
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            $selected={selected}
                            $rgb={spec.rgb}
                            $text={spec.text}
                            $textDark={spec.textDark}
                            onClick={() =>
                              setForm((prev) => ({ ...prev, kind: key }))
                            }
                          >
                            <div className="card-top">
                              <span className="icon-wrap">
                                <CardIcon size={15} aria-hidden />
                              </span>
                              <strong>{WAR_DECLARATION_KIND_LABELS[key]}</strong>
                              {selected ? (
                                <span className="selected-check" aria-hidden>
                                  <FiCheck size={11.5} />
                                </span>
                              ) : null}
                            </div>
                            <span className="card-sub">{spec.friendlySub}</span>
                            <span className="card-example">{spec.example}</span>
                          </ScenarioKindCard>
                        )
                      })}
                    </ScenarioKindGrid>
                    <StudioFieldHint>
                      {WAR_DECLARATION_KIND_HINTS[form.kind]}
                    </StudioFieldHint>
                  </StudioFieldBlock>

                  {/* 시원한 가로폭의 에스컬레이션 날짜 트랙 */}
                  <StudioFieldBlock>
                    <StudioFieldLabelRow>
                      <StudioFieldLabel as="div">
                        선포 · 개전 날짜 <OptionalTag>(선택)</OptionalTag>
                      </StudioFieldLabel>
                      {form.kind !== 'DIPLOMATIC_SEVERANCE' &&
                      !form.showSeveranceDate ? (
                        <PillActionBtn
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              showSeveranceDate: true,
                            }))
                          }
                        >
                          <FiPlus size={12.5} />
                          <span>앞서 단교한 날짜도 추가</span>
                        </PillActionBtn>
                      ) : null}
                    </StudioFieldLabelRow>

                    <EscalationTimelineCard>
                      <AnimatePresence initial={false}>
                        {form.kind === 'DIPLOMATIC_SEVERANCE' ||
                        form.showSeveranceDate ? (
                          <motion.div
                            key="severance-step"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                          >
                            <EscalationStep>
                              <StepHeaderRow>
                                <StepBadge $tone="slate">
                                  1단계 · 앞서 국교를 끊은 날짜 (단교일)
                                </StepBadge>
                                {form.kind !== 'DIPLOMATIC_SEVERANCE' ? (
                                  <StepDismissBtn
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
                                    단교일 접기
                                  </StepDismissBtn>
                                ) : null}
                              </StepHeaderRow>
                              <InlineDateField
                                appearance="field"
                                anchorId={severanceAnchorId}
                                pickerOpen={activeDatePicker === 'severance'}
                                era={form.severanceEra}
                                year={form.severanceYear}
                                month={form.severanceMonth}
                                day={form.severanceDay}
                                onEra={(era) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    severanceEra: era,
                                  }))
                                }
                                onYear={(val) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    severanceYear: val,
                                  }))
                                }
                                onMonth={(val) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    severanceMonth: val,
                                  }))
                                }
                                onDay={(val) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    severanceDay: val,
                                  }))
                                }
                                onOpenPicker={() =>
                                  setActiveDatePicker('severance')
                                }
                                ariaLabel="선행 외교 단교 시점"
                              />
                            </EscalationStep>
                            <EscalationConnector>
                              <span className="line" />
                              {severanceGapLabel ? (
                                <span className="pill">
                                  ⚡ 단교 후 {severanceGapLabel} 만에 개전
                                </span>
                              ) : null}
                            </EscalationConnector>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <EscalationStep>
                        <StepHeaderRow>
                          <StepBadge $tone="crimson">
                            {form.kind === 'DIPLOMATIC_SEVERANCE' ||
                            form.showSeveranceDate
                              ? '2단계 · 선전포고 · 개전 날짜'
                              : '선전포고 · 개전 날짜'}
                          </StepBadge>
                          <DateOptionalNote>
                            연도만 적어도 충분해요 (예: 1914년)
                          </DateOptionalNote>
                        </StepHeaderRow>
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
                            setForm((prev) => ({
                              ...prev,
                              declaredYear: val,
                            }))
                          }
                          onMonth={(val) =>
                            setForm((prev) => ({
                              ...prev,
                              declaredMonth: val,
                            }))
                          }
                          onDay={(val) =>
                            setForm((prev) => ({ ...prev, declaredDay: val }))
                          }
                          onOpenPicker={() => setActiveDatePicker('declared')}
                          ariaLabel="선전포고·개전 시점"
                        />
                      </EscalationStep>
                    </EscalationTimelineCard>
                  </StudioFieldBlock>

                  {/* 큼지막한 개전 명분 입력 + 스프링 팝 토글 칩 */}
                  <StudioFieldBlock>
                    <StudioFieldLabelRow>
                      <StudioFieldLabel htmlFor="war-decl-casus-belli">
                        전쟁 명분 · 이유 <OptionalTag>(선택)</OptionalTag>
                      </StudioFieldLabel>
                    </StudioFieldLabelRow>

                    <WideInput
                      id="war-decl-casus-belli"
                      value={form.casusBelli}
                      onChange={(ev) =>
                        setForm((prev) => ({
                          ...prev,
                          casusBelli: ev.target.value,
                        }))
                      }
                      placeholder="예: 사라예보 사건 배후 책임 추궁 및 최후통첩 거부"
                    />
                    <SparkBar aria-label="자주 쓰이는 명분 바로 넣기">
                      <span className="kicker">눌러서 바로 넣기:</span>
                      {CASUS_BELLI_SPARKS.map((sp) => {
                        const isActive = activeSparkSet.has(sp.snippet)
                        return (
                          <SparkChip
                            as={motion.button}
                            whileTap={{ scale: 0.94 }}
                            key={sp.label}
                            type="button"
                            $active={isActive}
                            onClick={() => toggleCasusSpark(sp.snippet)}
                            title={
                              isActive
                                ? '다시 누르면 이 문구를 빼요'
                                : `누르면 "${sp.snippet}" 문구가 들어가요`
                            }
                          >
                            {isActive ? `✓ ${sp.label}` : `+ ${sp.label}`}
                          </SparkChip>
                        )
                      })}
                    </SparkBar>
                  </StudioFieldBlock>

                  {/* 접이식 문서 제목 · 추가 메모 서랍 */}
                  <CollapsibleHelperBox>
                    <CollapsibleTriggerBtn
                      type="button"
                      aria-expanded={showCustomTitleMemo}
                      onClick={() => setShowCustomTitleMemo((v) => !v)}
                    >
                      <span className="left">
                        <FiEdit3 size={14} aria-hidden />
                        <span>
                          {form.title.trim()
                            ? `직접 입력한 제목: 「${form.title.trim()}」`
                            : `자동 문서 제목: 「${autoGeneratedTitle}」`}
                        </span>
                      </span>
                      <span className="right">
                        {showCustomTitleMemo
                          ? '접기'
                          : '제목 바꾸기 · 메모 남기기'}
                        {showCustomTitleMemo ? (
                          <FiChevronUp size={14} />
                        ) : (
                          <FiChevronDown size={14} />
                        )}
                      </span>
                    </CollapsibleTriggerBtn>

                    <AnimatePresence initial={false}>
                      {showCustomTitleMemo ? (
                        <CollapsibleBody
                          as={motion.div}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16 }}
                        >
                          <SubField>
                            <SubFieldLabel>
                              고유 포고 문서 제목 (비워 두면 자동 생성돼요)
                            </SubFieldLabel>
                            <WideInput
                              id="war-decl-title"
                              value={form.title}
                              onChange={(ev) =>
                                setForm((prev) => ({
                                  ...prev,
                                  title: ev.target.value,
                                }))
                              }
                              placeholder={`비워 두면 "${autoGeneratedTitle}"(으)로 저장돼요`}
                            />
                          </SubField>
                          <SubField>
                            <SubFieldLabel>보충 메모</SubFieldLabel>
                            <WideTextarea
                              id="war-decl-summary"
                              rows={3}
                              value={form.summary}
                              onChange={(ev) =>
                                setForm((prev) => ({
                                  ...prev,
                                  summary: ev.target.value,
                                }))
                              }
                              placeholder="외교 각서 전달 시각, 구력 표기, 역사적 배경 메모 등 자유롭게 적어 주세요"
                            />
                          </SubField>
                        </CollapsibleBody>
                      ) : null}
                    </AnimatePresence>
                  </CollapsibleHelperBox>
                </StudioSectionCard>
              </ColumnStack>

              {/* ── 우측 카드 스택: STEP 2 결정·표결 + STEP 3 전쟁·마무리 ── */}
              <ColumnStack>
                <StudioSectionCard id="war-decl-sec-constitution">
                  <FriendlySectionHeader>
                    <SectionTitleRow>
                      <StepNumberPill $tone="indigo">
                        STEP 2 {stepStatus.step2 ? '✓' : ''}
                      </StepNumberPill>
                      <StudioSectionTitle>
                        2. 누가 결정하고 승인했나요?
                      </StudioSectionTitle>
                    </SectionTitleRow>
                    <SectionSubHint>
                      선포 연도를 적으면 당시 국가원수·내각과 헌법 절차를 자동으로 찾아드려요.
                    </SectionSubHint>
                  </FriendlySectionHeader>

                  {activeRegimeAtDate ? (
                    <ConstitutionalCard>
                      <ConstitutionalTopRow>
                        <div className="regime-title">
                          <FiShield size={14} aria-hidden />
                          <strong>
                            {activeRegimeAtDate.name || '당대 정치 체제'}
                          </strong>
                          {activeRegimeAtDate.warPowerAuthority ? (
                            <span className="rule-tag">
                              {
                                WAR_POWER_AUTHORITY_LABEL[
                                  activeRegimeAtDate.warPowerAuthority
                                ]
                              }
                            </span>
                          ) : null}
                        </div>
                        {constitutionalEval ? (
                          <ConstitutionalVerdictBadge
                            as={motion.span}
                            key={constitutionalEval.badge}
                            initial={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 22,
                            }}
                            $tone={constitutionalEval.tone}
                          >
                            {constitutionalEval.tone === 'valid' ? (
                              <FiCheckCircle size={12.5} />
                            ) : constitutionalEval.tone === 'warning' ? (
                              <FiAlertTriangle size={12.5} />
                            ) : constitutionalEval.tone === 'bypass' ? (
                              <FiZap size={12.5} />
                            ) : (
                              <FiAward size={12.5} />
                            )}
                            <span>{constitutionalEval.badge}</span>
                          </ConstitutionalVerdictBadge>
                        ) : null}
                      </ConstitutionalTopRow>
                      {constitutionalEval ? (
                        <p className="notes">{constitutionalEval.detail}</p>
                      ) : activeRegimeAtDate.warPowerNotes ? (
                        <p className="notes">
                          {activeRegimeAtDate.warPowerNotes}
                        </p>
                      ) : null}
                    </ConstitutionalCard>
                  ) : null}

                  <StudioFieldBlock>
                    <StudioFieldLabelRow>
                      <StudioFieldLabel as="div">
                        결정권자 · 내각 <OptionalTag>(선택)</OptionalTag>
                      </StudioFieldLabel>
                    </StudioFieldLabelRow>

                    {contemporaryHeadCandidates.length > 0 ? (
                      <QuickLeaderBar>
                        <span className="kicker">당시 수반 바로 선택:</span>
                        {contemporaryHeadCandidates.map((cand) => {
                          const selected = form.decidedByTenureId === cand.id
                          return (
                            <QuickLeaderChip
                              as={motion.button}
                              whileTap={{ scale: 0.95 }}
                              key={cand.id}
                              type="button"
                              $selected={selected}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  decidedByTenureId: selected ? '' : cand.id,
                                  decidedByPersonId: '',
                                }))
                              }
                            >
                              {selected ? '✓ ' : ''}
                              {cand.name} · {cand.role}
                            </QuickLeaderChip>
                          )
                        })}
                      </QuickLeaderBar>
                    ) : null}

                    <SubFieldPair $cols={2}>
                      <SubField>
                        <SubFieldLabel>결정·서명한 수반 (재임 기록)</SubFieldLabel>
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
                              ? '군주·대통령·총리 검색'
                              : '위에서 선포국을 먼저 골라 주세요'
                          }
                          searchPlaceholder="인물명이나 직위로 검색..."
                          ariaLabel="결정·선포 수반 재임 기록"
                          disabled={!form.declaring}
                          clearable
                        />
                      </SubField>
                      <SubField>
                        <SubFieldLabel>당시 내각·행정부</SubFieldLabel>
                        <SearchableSelect
                          options={cabinetOptions}
                          value={form.cabinetId}
                          onChange={(next) =>
                            setForm((prev) => ({ ...prev, cabinetId: next }))
                          }
                          placeholder={
                            form.declaring
                              ? '당시 내각 선택'
                              : '위에서 선포국을 먼저 골라 주세요'
                          }
                          searchPlaceholder="내각 이름 검색..."
                          ariaLabel="소속 내각"
                          disabled={!form.declaring}
                          clearable
                        />
                      </SubField>
                    </SubFieldPair>

                    {!form.decidedByTenureId ? (
                      showPersonFallback || form.decidedByPersonId ? (
                        <SubField>
                          <StepHeaderRow>
                            <SubFieldLabel>
                              재임 기록 없이 인물에서 직접 찾기
                            </SubFieldLabel>
                            {!form.decidedByPersonId ? (
                              <StepDismissBtn
                                type="button"
                                onClick={() => setShowPersonFallback(false)}
                              >
                                접기
                              </StepDismissBtn>
                            ) : null}
                          </StepHeaderRow>
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
                                ? '국가 소속 인물 이름으로 검색'
                                : '위에서 선포국을 먼저 골라 주세요'
                            }
                            searchPlaceholder="인물 이름 검색..."
                            ariaLabel="결정·서명 인물 직접 지정"
                            disabled={!form.declaring}
                            clearable
                          />
                        </SubField>
                      ) : form.declaring ? (
                        <InlineTextToggleBtn
                          type="button"
                          onClick={() => setShowPersonFallback(true)}
                        >
                          찾는 인물이 재임 목록에 없나요? 인물에서 직접 찾기
                        </InlineTextToggleBtn>
                      ) : null
                    ) : null}

                    {/* 선택 즉시 도장이 쾅 찍히듯 나타나는 서명 인장 카드 */}
                    <AnimatePresence initial={false}>
                      {selectedLeaderSummary ? (
                        <SignatorySealCard
                          as={motion.div}
                          key={selectedLeaderSummary.name}
                          initial={{ scale: 1.04, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.97, opacity: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 22,
                          }}
                        >
                          <SealAvatar>
                            {selectedLeaderSummary.avatar ? (
                              <img
                                src={selectedLeaderSummary.avatar}
                                alt={selectedLeaderSummary.name}
                              />
                            ) : (
                              <span>
                                {selectedLeaderSummary.name.slice(0, 1)}
                              </span>
                            )}
                          </SealAvatar>
                          <div className="meta">
                            <strong>{selectedLeaderSummary.name}</strong>
                            <span>{selectedLeaderSummary.role}</span>
                          </div>
                          <motion.span
                            className="seal-stamp"
                            initial={{ scale: 1.35, rotate: -10, opacity: 0.3 }}
                            animate={{ scale: 1, rotate: -2.5, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 450,
                              damping: 16,
                            }}
                          >
                            <FiUserCheck size={13} /> 개전 서명·결정자
                          </motion.span>
                        </SignatorySealCard>
                      ) : null}
                    </AnimatePresence>
                  </StudioFieldBlock>

                  <StudioFieldBlock>
                    <StudioFieldLabelRow>
                      <StudioFieldLabel as="div">
                        의회 승인 · 표결 <OptionalTag>(선택)</OptionalTag>
                      </StudioFieldLabel>
                      <div style={{ display: 'inline-flex', gap: 10 }}>
                        <VoteHelperBtn
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              nays: '0',
                              abstentions: '0',
                            }))
                          }
                          title="반대 0 · 기권 0으로 빠르게 채워요"
                        >
                          반대·기권 0으로 채우기
                        </VoteHelperBtn>
                        {voteStats ? (
                          <VoteHelperBtn
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                yeas: '',
                                nays: '',
                                abstentions: '',
                              }))
                            }
                          >
                            비우기
                          </VoteHelperBtn>
                        ) : null}
                      </div>
                    </StudioFieldLabelRow>

                    <SearchableSelect
                      options={chamberOptions}
                      value={form.approvedChamberId}
                      onChange={(next) =>
                        setForm((prev) => ({
                          ...prev,
                          approvedChamberId: next,
                        }))
                      }
                      placeholder={
                        form.declaring
                          ? '승인한 의회 선택 (예: 연방하원 · 입법의회 · 상원)'
                          : '위에서 선포국을 먼저 골라 주세요'
                      }
                      searchPlaceholder="의회 이름 검색..."
                      ariaLabel="승인·의결 의회 원"
                      disabled={!form.declaring}
                      clearable
                    />

                    <SubFieldPair $cols={3}>
                      <SubField>
                        <SubFieldLabel>찬성표</SubFieldLabel>
                        <WideVoteInput
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
                        <SubFieldLabel>반대표</SubFieldLabel>
                        <WideVoteInput
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
                        <SubFieldLabel>기권</SubFieldLabel>
                        <WideVoteInput
                          inputMode="numeric"
                          value={form.abstentions}
                          onChange={(ev) =>
                            setForm((prev) => ({
                              ...prev,
                              abstentions: ev.target.value.replace(
                                /[^0-9]/g,
                                '',
                              ),
                            }))
                          }
                          placeholder="예: 0"
                        />
                      </SubField>
                    </SubFieldPair>

                    {/* 과반선(50%) 눈금과 스프링 판정 배지가 살아 움직이는 표결 전광판 */}
                    <AnimatePresence initial={false}>
                      {voteStats ? (
                        <VoteMeterCard
                          as={motion.div}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="head">
                            <span className="counts">
                              찬성 <strong>{voteStats.y}</strong> (
                              {voteStats.yeaPct}%) · 반대{' '}
                              <strong>{voteStats.n}</strong> ({voteStats.nayPct}
                              %)
                              {voteStats.a > 0
                                ? ` · 기권 ${voteStats.a} (${voteStats.absPct}%)`
                                : ''}
                            </span>
                            <VoteVerdictChip
                              as={motion.span}
                              key={voteStats.verdict}
                              initial={{ scale: 0.85 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: 'spring',
                                stiffness: 460,
                                damping: 20,
                              }}
                              $passed={voteStats.passed}
                            >
                              {voteStats.verdict}
                            </VoteVerdictChip>
                          </div>
                          <VoteBarContainer>
                            <VoteStackBar
                              role="img"
                              aria-label={`찬성 ${voteStats.yeaPct}%, 반대 ${voteStats.nayPct}%`}
                            >
                              <div
                                className="yea"
                                style={{ width: `${voteStats.yeaPct}%` }}
                              />
                              <div
                                className="nay"
                                style={{ width: `${voteStats.nayPct}%` }}
                              />
                              <div
                                className="abs"
                                style={{ width: `${voteStats.absPct}%` }}
                              />
                            </VoteStackBar>
                            <MajorityMarker title="과반 기준선 (50%)" aria-hidden />
                          </VoteBarContainer>
                        </VoteMeterCard>
                      ) : null}
                    </AnimatePresence>
                  </StudioFieldBlock>
                </StudioSectionCard>

                {/* ── STEP 3. 어떤 전쟁으로 이어지고 어떻게 끝났나요? ── */}
                <StudioSectionCard id="war-decl-sec-chain">
                  <FriendlySectionHeader>
                    <SectionTitleRow>
                      <StepNumberPill $tone="emerald">
                        STEP 3 {stepStatus.step3 ? '✓' : ''}
                      </StepNumberPill>
                      <StudioSectionTitle>
                        3. 어떤 전쟁으로 이어지고 어떻게 끝났나요?
                      </StudioSectionTitle>
                    </SectionTitleRow>
                    <SectionSubHint>
                      큰 전쟁에 연결해 두면 해당 전쟁의 참전국 타임라인에 자동으로 반영돼요.
                    </SectionSubHint>
                  </FriendlySectionHeader>

                  <DominoChainStack>
                    {/* Step A: 소속 상위 전쟁 */}
                    <ChainNode>
                      <ChainNodeDot $color="#4f46e5" />
                      <ChainNodeContent>
                        <ChainNodeTitle>
                          <FiGitCommit size={13.5} aria-hidden />
                          <span>
                            소속 전쟁 연결 (예: 제1차 세계대전 · 태평양 전쟁)
                          </span>
                          <OptionalTag>(선택)</OptionalTag>
                        </ChainNodeTitle>
                        <LinkedEventPickerField
                          inputId="war-decl-parent-war"
                          value={form.warEventId}
                          initialTitle={form.warEventInitialTitle || null}
                          nearYear={signedDeclaredYear}
                          onChange={(nextId) =>
                            setForm((prev) => ({
                              ...prev,
                              warEventId: nextId,
                            }))
                          }
                        />
                      </ChainNodeContent>
                    </ChainNode>

                    {/* Step B: 교전 마무리 방식 & 강화조약 */}
                    <ChainNode>
                      <ChainNodeDot $color="#16a34a" />
                      <ChainNodeContent>
                        <ChainNodeTitle>
                          <FiCheckCircle size={13.5} aria-hidden />
                          <span>전쟁은 어떻게 마무리됐나요?</span>
                          {belligerenceDurationLabel ? (
                            <DurationPill>
                              교전 기간 {belligerenceDurationLabel}
                            </DurationPill>
                          ) : (
                            <OptionalTag>(선택)</OptionalTag>
                          )}
                        </ChainNodeTitle>
                        <ChoiceChips
                          ariaLabel="교전 종결 방식"
                          options={TERMINATION_OPTIONS}
                          value={form.terminationKind}
                          allowDeselect
                          onChange={(next) => {
                            setForm((prev) => ({
                              ...prev,
                              terminationKind: next,
                            }))
                            if (next && next !== 'ONGOING') {
                              setShowTerminationDetails(true)
                            }
                          }}
                        />

                        <AnimatePresence initial={false}>
                          {showTerminationDetailFields ? (
                            <TerminationDetailsCard
                              as={motion.div}
                              key="termination-details"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18 }}
                            >
                              <SubFieldPair $cols={2}>
                                <SubField>
                                  <SubFieldLabel>종결 · 휴전 날짜</SubFieldLabel>
                                  <InlineDateField
                                    appearance="field"
                                    anchorId={endedAnchorId}
                                    pickerOpen={activeDatePicker === 'ended'}
                                    era={form.endedEra}
                                    year={form.endedYear}
                                    month={form.endedMonth}
                                    day={form.endedDay}
                                    onEra={(era) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        endedEra: era,
                                      }))
                                    }
                                    onYear={(val) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        endedYear: val,
                                      }))
                                    }
                                    onMonth={(val) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        endedMonth: val,
                                      }))
                                    }
                                    onDay={(val) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        endedDay: val,
                                      }))
                                    }
                                    onOpenPicker={() =>
                                      setActiveDatePicker('ended')
                                    }
                                    ariaLabel="교전 종결 시점"
                                  />
                                </SubField>
                                <SubField>
                                  <SubFieldLabel>
                                    체결된 강화 · 평화 조약
                                  </SubFieldLabel>
                                  <SearchableSelect
                                    options={peaceTreatyOptions}
                                    value={form.peaceTreatyId}
                                    onChange={(next) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        peaceTreatyId: next,
                                      }))
                                    }
                                    placeholder={
                                      form.declaring
                                        ? '베르사유 조약 · 파리 조약 등 검색'
                                        : '위에서 선포국을 먼저 골라 주세요'
                                    }
                                    searchPlaceholder="조약 이름 검색..."
                                    ariaLabel="종결 강화·평화 조약"
                                    disabled={!form.declaring}
                                    clearable
                                  />
                                </SubField>
                              </SubFieldPair>
                              <WideInput
                                value={form.terminationNote}
                                onChange={(ev) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    terminationNote: ev.target.value,
                                  }))
                                }
                                placeholder="마무리 한 줄 설명 (예: 1918.11.11 콩피에뉴 휴전협정 후 베르사유 조약 체결)"
                              />
                              {isDateInverted ? (
                                <AlertBox
                                  variant="danger"
                                  icon={<FiAlertCircle />}
                                >
                                  종결 날짜가 선포 날짜보다 앞섭니다. 날짜를 확인해 주세요.
                                </AlertBox>
                              ) : null}
                            </TerminationDetailsCard>
                          ) : (
                            <InlineTextToggleBtn
                              type="button"
                              onClick={() => setShowTerminationDetails(true)}
                            >
                              + 종결 날짜나 강화조약도 함께 적기 (진행 중이면 비워 두어도 돼요)
                            </InlineTextToggleBtn>
                          )}
                        </AnimatePresence>
                      </ChainNodeContent>
                    </ChainNode>

                    {/* Step C: 이미 등록된 관련 사건 연결 (없어도 되는 선택 연결 — 탭으로 한 번에 하나씩만 깔끔하게 노출) */}
                    <ChainNode $last>
                      <ChainNodeDot $color="#d97706" />
                      <ChainNodeContent>
                        <CollapsibleHelperBox>
                          <CollapsibleTriggerBtn
                            type="button"
                            aria-expanded={showExtraEventsDrawer}
                            onClick={() =>
                              setShowExtraEventsDrawer((v) => !v)
                            }
                          >
                            <span className="left">
                              <FiBookOpen size={14} aria-hidden />
                              <span>
                                이미 등록된 관련 사건(최후통첩·연설 등)이 있을 때만 연결 — 없어도 됩니다
                                {extraLinkedCount > 0
                                  ? ` (${extraLinkedCount}건 연결됨)`
                                  : ''}
                              </span>
                            </span>
                            <span className="right">
                              {showExtraEventsDrawer ? '접기' : '있을 때만 펼치기'}
                              {showExtraEventsDrawer ? (
                                <FiChevronUp size={14} />
                              ) : (
                                <FiChevronDown size={14} />
                              )}
                            </span>
                          </CollapsibleTriggerBtn>

                          <AnimatePresence initial={false}>
                            {showExtraEventsDrawer ? (
                              <CollapsibleBody
                                as={motion.div}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.16 }}
                              >
                                <RelatedEventGuideNote>
                                  이 모달의 선전포고 기록만 저장해도 충분해요. 사건 메뉴에 이미 작성된 직전 최후통첩이나 당일 연설·일화 글이 있을 때만 골라서 이어 주세요.
                                </RelatedEventGuideNote>

                                <RelatedEventTabBar role="tablist" aria-label="관련 사건 종류">
                                  <RelatedEventTabBtn
                                    type="button"
                                    role="tab"
                                    aria-selected={relatedEventTab === 'ultimatum'}
                                    $active={relatedEventTab === 'ultimatum'}
                                    onClick={() => setRelatedEventTab('ultimatum')}
                                  >
                                    <FiClock size={13} aria-hidden />
                                    <span>직전 최후통첩 사건</span>
                                    {form.ultimatumEventId ? (
                                      <span className="linked-dot">✓ 연결됨</span>
                                    ) : null}
                                  </RelatedEventTabBtn>
                                  <RelatedEventTabBtn
                                    type="button"
                                    role="tab"
                                    aria-selected={relatedEventTab === 'narrative'}
                                    $active={relatedEventTab === 'narrative'}
                                    onClick={() => setRelatedEventTab('narrative')}
                                  >
                                    <FiBookOpen size={13} aria-hidden />
                                    <span>당일 연설·비화 사건</span>
                                    {form.narrativeEventId ? (
                                      <span className="linked-dot">✓ 연결됨</span>
                                    ) : null}
                                  </RelatedEventTabBtn>
                                </RelatedEventTabBar>

                                {relatedEventTab === 'ultimatum' ? (
                                  <SubField key="tab-ultimatum">
                                    <SubFieldLabel>
                                      개전 직전에 보낸 최후통첩 · 외교 각서 사건 검색
                                    </SubFieldLabel>
                                    <LinkedEventPickerField
                                      inputId="war-decl-ultimatum-event"
                                      value={form.ultimatumEventId}
                                      initialTitle={
                                        form.ultimatumEventInitialTitle || null
                                      }
                                      nearYear={signedDeclaredYear}
                                      onChange={(nextId) =>
                                        setForm((prev) => ({
                                          ...prev,
                                          ultimatumEventId: nextId,
                                        }))
                                      }
                                    />
                                    <StudioFieldHint>
                                      예: 오스트리아의 7월 최후통첩, 포츠담 선언 등 개전 직전 통첩 사건
                                    </StudioFieldHint>
                                  </SubField>
                                ) : (
                                  <SubField key="tab-narrative">
                                    <SubFieldLabel>
                                      선전포고 당일의 연설 · 각서 전달 비화 사건 검색
                                    </SubFieldLabel>
                                    <LinkedEventPickerField
                                      inputId="war-decl-narrative-event"
                                      value={form.narrativeEventId}
                                      initialTitle={
                                        form.narrativeEventInitialTitle || null
                                      }
                                      nearYear={signedDeclaredYear}
                                      onChange={(nextId) =>
                                        setForm((prev) => ({
                                          ...prev,
                                          narrativeEventId: nextId,
                                        }))
                                      }
                                    />
                                    <StudioFieldHint>
                                      예: 루스벨트 치욕의 날 의회 연설, 대사관 개전 각서 수교 일화 등
                                    </StudioFieldHint>
                                  </SubField>
                                )}
                              </CollapsibleBody>
                            ) : null}
                          </AnimatePresence>
                        </CollapsibleHelperBox>
                      </ChainNodeContent>
                    </ChainNode>
                  </DominoChainStack>
                </StudioSectionCard>
              </ColumnStack>
            </WorkspaceColumns>
          </StudioCanvas>
        </WideModalScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={!canSubmit && (isDateInverted || isSameParty)}>
            {canSubmit ? (
              <FooterReadyGroup>
                <FooterReadyBadge>
                  <FiCheck size={13} aria-hidden />
                  바로 저장할 수 있어요!
                </FooterReadyBadge>
                <span>
                  {stepStatus.filledDetailsCount > 0
                    ? `상세 항목 ${stepStatus.filledDetailsCount}개 함께 기록됨 · `
                    : ''}
                  단축키 ⌘/Ctrl + Enter
                </span>
              </FooterReadyGroup>
            ) : (
              <FooterStepPromptRow>
                <span className="guide">저장하려면 두 나라를 골라 주세요:</span>
                {!form.declaring ? (
                  <FooterStepBtn
                    type="button"
                    onClick={() => setPickerSlot('declaring')}
                  >
                    + 선포한 국가 선택
                  </FooterStepBtn>
                ) : null}
                {!form.target ? (
                  <FooterStepBtn
                    type="button"
                    onClick={() => setPickerSlot('target')}
                  >
                    + 상대 국가 선택
                  </FooterStepBtn>
                ) : null}
              </FooterStepPromptRow>
            )}
          </FooterHint>
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              닫기
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {saving
                ? '저장하는 중...'
                : editing
                  ? '수정 내용 저장'
                  : form.extraTargets.length > 0
                    ? `${form.extraTargets.length + 1}개국 한 번에 저장`
                    : '선전포고 기록 저장'}
            </PersonRegisterModalPrimaryBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      <CountryPicker
        isOpen={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        title={
          pickerSlot === 'declaring'
            ? '선포한 국가 선택'
            : pickerSlot === 'extraTarget'
              ? '같은 날 함께 선포한 상대 국가 추가'
              : '상대 국가 선택'
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

/* ═══════════════════════════ Keyframe Animations ═══════════════════════════ */

const cometGlide = keyframes`
  0% { transform: translateX(-100%); opacity: 0.25; }
  45% { opacity: 1; }
  100% { transform: translateX(260%); opacity: 0.2; }
`

const lightningFlash = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
`

const radarAura = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.28); }
  70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
`

const shieldAura = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.26); }
  70% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
`

const severPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.16); }
`

/* ═══════════════════════════ Styled Components ═══════════════════════════ */

const WideModalScroll = styled(PersonRegisterModalFormScroll)`
  padding: 24px 32px 32px;

  @media (max-width: 768px) {
    padding: 16px 16px 24px;
  }
`

const StudioCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
`

const StudioSectionCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px 26px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(24, 24, 27, 0.55)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'none'
      : '0 1px 3px rgba(15, 23, 42, 0.04)'};

  @media (max-width: 768px) {
    padding: 18px 16px;
    gap: 18px;
  }
`

const FriendlySectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const StepNumberPill = styled.span<{ $tone: 'crimson' | 'indigo' | 'emerald' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  ${({ theme, $tone }) => {
    if ($tone === 'crimson') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(220, 38, 38, 0.1)'};
        color: ${theme.mode === 'dark' ? '#fca5a5' : '#dc2626'};
      `
    }
    if ($tone === 'emerald') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(22, 163, 74, 0.2)'
          : 'rgba(22, 163, 74, 0.1)'};
        color: ${theme.mode === 'dark' ? '#86efac' : '#15803d'};
      `
    }
    return css`
      background: ${theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.1)'};
      color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
    `
  }}
`

const StudioSectionTitle = styled.h3`
  margin: 0;
  font-size: 16.5px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionSubHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StudioFieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
`

const StudioFieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const StudioFieldLabel = styled.label`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StudioFieldHint = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const WideInput = styled(Input)`
  width: 100%;
  max-width: none;
  min-height: 44px;
  font-size: 14px;
  padding: 10px 14px;
`

const WideVoteInput = styled(Input)`
  width: 100%;
  max-width: none;
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 10px 14px;
`

const WideTextarea = styled(PersonRegisterModalTextarea)`
  width: 100%;
  max-width: none;
  font-size: 14px;
  line-height: 1.55;
  padding: 11px 14px;
`

const PillActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'};
  }
`

const ConfrontationStage = styled.section<{ $accentRgb: string }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 26px 22px;
  border-radius: 18px;
  border: 1.5px solid
    ${({ theme, $accentRgb }) =>
      theme.mode === 'dark'
        ? `rgba(${$accentRgb}, 0.38)`
        : `rgba(${$accentRgb}, 0.28)`};
  background: ${({ theme, $accentRgb }) =>
    theme.mode === 'dark'
      ? `linear-gradient(135deg, rgba(${$accentRgb}, 0.13) 0%, rgba(15, 23, 42, 0.78) 55%, rgba(37, 99, 235, 0.09) 100%)`
      : `linear-gradient(135deg, rgba(${$accentRgb}, 0.06) 0%, rgba(248, 250, 252, 0.98) 55%, rgba(37, 99, 235, 0.045) 100%)`};
  transition: border-color 260ms ease, background 260ms ease;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const CrisisMeterRibbon = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  .meter-left {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .meter-title {
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const CrisisLevelBars = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const CrisisBarSegment = styled.span<{ $active: boolean; $rgb: string }>`
  width: 16px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme, $active, $rgb }) =>
    $active ? `rgba(${$rgb}, 0.85)` : theme.colors.border.light};
  transition: background 220ms ease, transform 220ms ease;
`

const CrisisStatusBadge = styled.span<{
  $concluded: boolean
  $rgb: string
  $accent: string
}>`
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  ${({ theme, $concluded, $rgb, $accent }) =>
    $concluded
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(22, 163, 74, 0.24)'
            : 'rgba(22, 163, 74, 0.12)'};
          color: ${theme.mode === 'dark' ? '#86efac' : '#15803d'};
        `
      : css`
          background: ${theme.mode === 'dark'
            ? `rgba(${$rgb}, 0.24)`
            : `rgba(${$rgb}, 0.11)`};
          color: ${theme.mode === 'dark' ? '#f8fafc' : $accent};
        `}
`

const DurationHighlightPill = styled.span<{ $tone?: 'amber' | 'emerald' }>`
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme, $tone }) =>
    $tone === 'amber'
      ? theme.mode === 'dark'
        ? 'rgba(217, 119, 6, 0.22)'
        : 'rgba(217, 119, 6, 0.11)'
      : theme.mode === 'dark'
        ? 'rgba(22, 163, 74, 0.22)'
        : 'rgba(22, 163, 74, 0.11)'};
  color: ${({ theme, $tone }) =>
    $tone === 'amber'
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.mode === 'dark'
        ? '#86efac'
        : '#15803d'};
`

const ArenaGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 196px minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const BelligerentDossier = styled.div<{
  $side: 'declaring' | 'target'
  $filled: boolean
}>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-height: 120px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1.5px solid
    ${({ theme, $side, $filled }) =>
      !$filled
        ? theme.colors.border.default
        : $side === 'declaring'
          ? theme.mode === 'dark'
            ? 'rgba(239, 68, 68, 0.42)'
            : 'rgba(220, 38, 38, 0.3)'
          : theme.mode === 'dark'
            ? 'rgba(59, 130, 246, 0.42)'
            : 'rgba(37, 99, 235, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.84)' : '#ffffff'};
  transition: border-color 160ms ease, box-shadow 160ms ease;
`

const DossierHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const DossierEyebrow = styled.div<{ $side: 'declaring' | 'target' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme, $side }) =>
    $side === 'declaring'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#2563eb'};
`

const RequiredMiniBadge = styled.span<{ $done: boolean }>`
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme, $done }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(22, 163, 74, 0.22)'
        : 'rgba(22, 163, 74, 0.11)'
      : theme.colors.background.secondary};
  color: ${({ theme, $done }) =>
    $done
      ? theme.mode === 'dark'
        ? '#86efac'
        : '#15803d'
      : theme.colors.text.tertiary};
`

const DossierSelectedBody = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const DossierIdentityButton = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
  padding: 4px 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;

  .change-hint {
    margin-left: 8px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => theme.colors.background.secondary};
    border: 1px solid ${({ theme }) => theme.colors.border.light};
    transition: border-color 120ms ease, color 120ms ease;
    flex-shrink: 0;
  }

  &:hover .change-hint {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const DossierEmblem = styled.span<{
  $side: 'declaring' | 'target'
  $engaged?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 13px;
  flex-shrink: 0;
  font-size: 23px;
  font-weight: 800;
  background: ${({ theme, $side }) =>
    $side === 'declaring'
      ? theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.18)'
        : 'rgba(220, 38, 38, 0.09)'
      : theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.18)'
        : 'rgba(37, 99, 235, 0.09)'};
  color: ${({ theme, $side }) =>
    $side === 'declaring'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'};
  ${({ $engaged, $side }) =>
    $engaged &&
    css`
      animation: ${$side === 'declaring' ? radarAura : shieldAura} 2.2s
        ease-out infinite;
      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
`

const DossierNameBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const DossierCountryName = styled.strong`
  display: inline-flex;
  align-items: center;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;

  > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const DossierPolitySub = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DossierClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)'};
  }
`

const DossierEmptyTrigger = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  min-height: 68px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px dashed ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;

  .main {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 15px;
    font-weight: 700;
  }

  .sub {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.1)'
        : 'rgba(99, 102, 241, 0.045)'};
  }
`

const VectorHub = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
`

const VectorBadge = styled.div<{ $rgb: string; $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: ${({ theme, $rgb }) =>
    theme.mode === 'dark'
      ? `rgba(${$rgb}, 0.24)`
      : `rgba(${$rgb}, 0.12)`};
  border: 1px solid ${({ $rgb }) => `rgba(${$rgb}, 0.4)`};
  color: ${({ theme, $accent }) =>
    theme.mode === 'dark' ? '#f8fafc' : $accent};
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
`

const KineticBeamStage = styled.div<{
  $rgb: string
  $mode: 'comet' | 'countdown' | 'shield' | 'lightning' | 'flip' | 'sever'
  $engaged: boolean
}>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 18px;

  .base-rail {
    position: relative;
    flex: 1;
    height: 4px;
    border-radius: 999px;
    overflow: hidden;
    background: ${({ $rgb, $mode }) =>
      $mode === 'lightning'
        ? `repeating-linear-gradient(90deg, rgba(${$rgb}, 0.72) 0 8px, transparent 8px 14px)`
        : `rgba(${$rgb}, 0.24)`};
    ${({ $mode }) =>
      $mode === 'lightning' &&
      css`
        animation: ${lightningFlash} 0.9s ease-in-out infinite;
      `}
  }

  .traveling-pulse {
    position: absolute;
    left: 0;
    top: 7px;
    width: 36%;
    height: 4px;
    border-radius: 999px;
    background: ${({ $rgb }) =>
      `linear-gradient(90deg, transparent 0%, rgba(${$rgb}, 0.95) 75%, #ffffff 100%)`};
    animation: ${cometGlide}
      ${({ $mode }) =>
        $mode === 'lightning'
          ? '0.85s'
          : $mode === 'countdown'
            ? '1.9s'
            : '1.45s'}
      ease-in-out infinite;
    opacity: ${({ $engaged }) => ($engaged ? 1 : 0.45)};
  }

  .arrow-head {
    margin-left: 4px;
    font-size: 11px;
    line-height: 1;
    color: ${({ $rgb }) => `rgb(${$rgb})`};
  }

  .half {
    flex: 1;
    height: 3px;
    border-radius: 999px;
    background: ${({ $rgb }) =>
      `repeating-linear-gradient(90deg, rgba(${$rgb}, 0.65) 0 6px, transparent 6px 11px)`};
  }

  .sever-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin: 0 5px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.14);
    color: #dc2626;
    font-size: 11px;
    font-weight: 800;
    animation: ${severPulse} 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .base-rail,
    .traveling-pulse,
    .sever-mark {
      animation: none;
    }
  }

  @media (max-width: 880px) {
    display: none;
  }
`

const SwapDirectionPill = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ExtraDominoStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const DominoChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: 600;

  button {
    display: inline-flex;
    align-items: center;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: pointer;
    padding: 0;
  }
`

const AddDominoBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const DispatchTickerBar = styled.div<{ $ready: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 13px;
  border: 1px solid
    ${({ theme, $ready }) =>
      $ready ? theme.colors.border.default : theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.74)'
      : 'rgba(255, 255, 255, 0.94)'};
`

const WaxSealMedallion = styled.div<{ $rgb: string; $ready: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px dashed
    ${({ $rgb, $ready }) =>
      $ready ? `rgba(${$rgb}, 0.65)` : 'rgba(148, 163, 184, 0.35)'};
  background: ${({ theme, $rgb, $ready }) =>
    !$ready
      ? theme.colors.background.secondary
      : theme.mode === 'dark'
        ? `rgba(${$rgb}, 0.24)`
        : `rgba(${$rgb}, 0.12)`};
  color: ${({ theme, $rgb, $ready }) =>
    !$ready
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#f8fafc'
        : `rgb(${$rgb})`};
  font-size: 16px;
  font-weight: 900;
  box-shadow: ${({ $rgb, $ready }) =>
    $ready ? `0 3px 10px rgba(${$rgb}, 0.18)` : 'none'};
`

const DispatchContentStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;

  .top-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`

const DispatchKicker = styled.span<{ $accent: string }>`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: ${({ $accent }) => $accent};
  flex-shrink: 0;
`

const VisualTokenStrip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SummaryToken = styled.span<{
  $tone: 'neutral' | 'crimson' | 'blue' | 'indigo' | 'emerald' | 'slate'
}>`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  ${({ theme, $tone }) => {
    if ($tone === 'slate') {
      return css`
        padding: 0 2px;
        color: ${theme.colors.text.tertiary};
      `
    }
    if ($tone === 'crimson') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(220, 38, 38, 0.09)'};
        color: ${theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
      `
    }
    if ($tone === 'blue') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(37, 99, 235, 0.09)'};
        color: ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
      `
    }
    if ($tone === 'indigo') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.22)'
          : 'rgba(99, 102, 241, 0.1)'};
        color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
      `
    }
    if ($tone === 'emerald') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(22, 163, 74, 0.22)'
          : 'rgba(22, 163, 74, 0.1)'};
        color: ${theme.mode === 'dark' ? '#86efac' : '#15803d'};
      `
    }
    return css`
      background: ${theme.colors.background.secondary};
      color: ${theme.colors.text.secondary};
    `
  }}
`

const DispatchPreviewSentence = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.secondary : theme.colors.text.primary};
  font-weight: ${({ $muted }) => ($muted ? 400 : 500)};
`

const WorkspaceColumns = styled.div<{ $split: boolean }>`
  display: grid;
  grid-template-columns: ${({ $split }) =>
    $split ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr'};
  gap: 26px;
  align-items: start;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`

const ColumnStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
`

/* ─── 3×2 와이드 시나리오 카드 그리드 ─── */

const ScenarioKindGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;

  @media (max-width: 1360px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`

const ScenarioKindCard = styled.button<{
  $selected: boolean
  $rgb: string
  $text: string
  $textDark: string
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  min-height: 94px;
  padding: 13px 15px;
  border-radius: 13px;
  border: 1.5px solid
    ${({ theme, $selected, $rgb }) =>
      $selected ? `rgba(${$rgb}, 0.68)` : theme.colors.border.light};
  background: ${({ theme, $selected, $rgb }) =>
    $selected
      ? theme.mode === 'dark'
        ? `rgba(${$rgb}, 0.22)`
        : `rgba(${$rgb}, 0.085)`
      : theme.colors.background.secondary};
  box-shadow: ${({ $selected, $rgb }) =>
    $selected ? `0 4px 14px rgba(${$rgb}, 0.14)` : 'none'};
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;

  .card-top {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-width: 0;

    strong {
      flex: 1;
      font-size: 13.5px;
      font-weight: 700;
      line-height: 1.3;
      color: ${({ theme, $selected, $text, $textDark }) =>
        $selected
          ? theme.mode === 'dark'
            ? $textDark
            : $text
          : theme.colors.text.primary};
    }
  }

  .selected-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $rgb }) => `rgb(${$rgb})`};
    color: #ffffff;
  }

  .icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    flex-shrink: 0;
    background: ${({ theme, $rgb }) =>
      theme.mode === 'dark'
        ? `rgba(${$rgb}, 0.24)`
        : `rgba(${$rgb}, 0.13)`};
    color: ${({ theme, $text, $textDark }) =>
      theme.mode === 'dark' ? $textDark : $text};
  }

  .card-sub {
    font-size: 12px;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .card-example {
    font-size: 11px;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    border-color: ${({ $rgb }) => `rgba(${$rgb}, 0.55)`};
  }
`

const EscalationTimelineCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const EscalationStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StepHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const StepBadge = styled.span<{ $tone: 'slate' | 'crimson' }>`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'crimson'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : theme.colors.text.secondary};
`

const DateOptionalNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StepDismissBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const EscalationConnector = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px;

  .line {
    width: 2px;
    height: 18px;
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 2px;
    margin-left: 10px;
  }

  .pill {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SparkBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 2px;

  .kicker {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-right: 4px;
  }
`

const SparkChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.colors.background.secondary};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const CollapsibleHelperBox = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow: hidden;
`

const CollapsibleTriggerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-align: left;

  .left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .right {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
  }

  &:hover .left {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CollapsibleBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const InlineTextToggleBtn = styled.button`
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 4px 0;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const QuickLeaderBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  .kicker {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const QuickLeaderChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme, $selected }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.colors.background.secondary};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const VoteHelperBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const ConstitutionalCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};

  .notes {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const ConstitutionalTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  .regime-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .rule-tag {
    padding: 2px 9px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) => theme.colors.background.primary};
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const ConstitutionalVerdictBadge = styled.span<{
  $tone: 'valid' | 'executive' | 'bypass' | 'warning' | 'neutral'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  ${({ theme, $tone }) => {
    if ($tone === 'valid') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(22, 163, 74, 0.22)'
          : 'rgba(22, 163, 74, 0.11)'};
        color: ${theme.mode === 'dark' ? '#86efac' : '#15803d'};
      `
    }
    if ($tone === 'warning') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.22)'
          : 'rgba(220, 38, 38, 0.11)'};
        color: ${theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
      `
    }
    if ($tone === 'bypass') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(147, 51, 234, 0.24)'
          : 'rgba(147, 51, 234, 0.11)'};
        color: ${theme.mode === 'dark' ? '#d8b4fe' : '#7e22ce'};
      `
    }
    if ($tone === 'executive') {
      return css`
        background: ${theme.mode === 'dark'
          ? 'rgba(37, 99, 235, 0.22)'
          : 'rgba(37, 99, 235, 0.11)'};
        color: ${theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
      `
    }
    return css`
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.secondary};
    `
  }}
`

const SignatorySealCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    strong {
      font-size: 14.5px;
      color: ${({ theme }) => theme.colors.text.primary};
    }
    span {
      font-size: 12.5px;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }

  .seal-stamp {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1.5px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(220, 38, 38, 0.45)'
          : 'rgba(220, 38, 38, 0.32)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(220, 38, 38, 0.12)'
        : 'rgba(220, 38, 38, 0.05)'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }
`

const SealAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const VoteMeterCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px 15px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .counts {
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-variant-numeric: tabular-nums;

    strong {
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`

const VoteVerdictChip = styled.span<{ $passed: boolean }>`
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme, $passed }) =>
    $passed
      ? theme.mode === 'dark'
        ? 'rgba(22, 163, 74, 0.24)'
        : 'rgba(22, 163, 74, 0.12)'
      : theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.24)'
        : 'rgba(220, 38, 38, 0.12)'};
  color: ${({ theme, $passed }) =>
    $passed
      ? theme.mode === 'dark'
        ? '#86efac'
        : '#15803d'
      : theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'};
`

const VoteBarContainer = styled.div`
  position: relative;
  width: 100%;
`

const VoteStackBar = styled.div`
  display: flex;
  width: 100%;
  height: 11px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border.light};

  .yea {
    background: #16a34a;
    transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .nay {
    background: #dc2626;
    transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .abs {
    background: #94a3b8;
    transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`

const MajorityMarker = styled.span`
  position: absolute;
  left: 50%;
  top: -3px;
  bottom: -3px;
  width: 2px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.45)'};
  pointer-events: none;
`

const DominoChainStack = styled.div`
  display: flex;
  flex-direction: column;
`

const ChainNode = styled.div<{ $last?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: ${({ $last }) => ($last ? '0' : '22px')};

  ${({ $last, theme }) =>
    !$last &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 18px;
        bottom: 0;
        width: 2px;
        background: ${theme.colors.border.light};
      }
    `}
`

const ChainNodeDot = styled.span<{ $color: string }>`
  width: 14px;
  height: 14px;
  margin-top: 4px;
  margin-left: 5px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.background.primary};
  z-index: 1;
`

const ChainNodeContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const ChainNodeTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DurationPill = styled.span`
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(22, 163, 74, 0.2)'
      : 'rgba(22, 163, 74, 0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#86efac' : '#15803d')};
`

const TerminationDetailsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const RelatedEventGuideNote = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RelatedEventTabBar = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const RelatedEventTabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1.5px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.09)'
      : theme.colors.background.secondary};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;

  .linked-dot {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(22, 163, 74, 0.24)'
        : 'rgba(22, 163, 74, 0.12)'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#86efac' : '#15803d')};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const FooterStepPromptRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .guide {
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const FooterStepBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.18)'
      : 'rgba(99, 102, 241, 0.08)'};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : 'rgba(99, 102, 241, 0.14)'};
  }
`
