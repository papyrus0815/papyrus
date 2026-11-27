/**
 * 기업 등록·수정 모달 — 옛 `/companies/new`·`/companies/:id/edit` 풀 페이지를 대체한다.
 *
 * 사건 등록 모달(`EventRegisterModal`)·법령 등록 모달(`LawFormModal`)과 같은 문법을 따른다:
 * - 외곽 셸: `RegisterModal` + 헤더 섹션 이동 알약(`RegisterSectionJumpNav`) + 초기화 + 2단/1단 보기 전환
 * - 본문 조판: 카드 상자 없이 점(•) 머리글 섹션(`기본 정보` · `소속·인물` · `기간·링크` · `소개`),
 *   라벨 열 + 칸(사건 폼 `FormRow`), 상태는 사건 분야 칩(`ToneChipGroup`), 날짜는 사건 시작·종료 칸(`YmdDateField`)
 * - 하단 고정 푸터: 빠진 필수 칸 이동 알약(`RegisterFooterStatus`) + 단축키(`⌘↵` / `⌘⇧↵`) + `등록 후 계속`
 * - 닫기(Esc·오버레이·취소)는 dirty면 확인부터, 저장 중에는 닫히지 않는다
 * - 신규 등록 후 3지 분기 — 상세 보기 / 기업 계속 등록 / 닫기
 *
 * 사는 것은 **복귀 충실도**다. 페이지로 나갔다 오면 목록의 검색어·필터·정렬·스크롤이
 * 사라졌다. 모달은 뒤의 목록을 언마운트하지 않는다.
 *
 * 폼 상태는 열릴 때마다 대상에 맞춰 다시 채운다(`resetForm`) — 바깥에서 늘 마운트해 두는
 * 호출부(기업 목록)가 있어, 닫았다 다시 열 때 지난 입력이 남으면 안 된다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiActivity,
  FiBriefcase,
  FiColumns,
  FiGitMerge,
  FiGlobe,
  FiImage,
  FiMoreHorizontal,
  FiPauseCircle,
  FiXCircle,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import type {
  Company,
  CompanyStatus,
  CreateCompanyInput,
} from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { cityApi } from '@/shared/api/city'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import { getUploadImageUrl } from '@/shared/api/upload'
import { plainTextToRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { ConfirmDialog, confirm } from '@/shared/ui/confirm-dialog'
import { PersonPickerButton } from '@/shared/ui/person-picker'
import { KitChoiceChip } from '@/shared/ui/register-form-kit/register-form-kit'
import {
  activeSectionAt,
  FooterActions,
  HeaderActionsBar,
  HeaderResetBtn,
  RegisterFooterStatus,
  RegisterSectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'
import {
  ToneChipGroup,
  type ToneChipOption,
  useSplitLayoutMode,
  YmdDateField,
} from '@/widgets/country/country-detail/ui/politics-form/politics-form-parts'

import { type PickerOption, SearchPicker } from './company-search-picker'

/** 상태별 라벨 + 색조 — 목록(companies-list STATUS_META)과 같은 값. */
export const COMPANY_STATUS_META: Record<
  CompanyStatus,
  { label: string; tone: string }
> = {
  ACTIVE: { label: '활동 중', tone: '#16a34a' },
  DISSOLVED: { label: '해산', tone: '#dc2626' },
  MERGED: { label: '합병', tone: '#2563eb' },
  SUSPENDED: { label: '중단', tone: '#d97706' },
  OTHER: { label: '기타', tone: '#64748b' },
}

export const COMPANY_STATUS_ORDER: CompanyStatus[] = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'SUSPENDED',
  'OTHER',
]

/**
 * 상태 칩 — 사건 분야 칩과 같은 조립(아이콘 원 + 이름, 고르면 그 색 면·링).
 * 진한 점(accent)은 COMPANY_STATUS_META.tone과 같은 값이라 목록 배지와 색이 어긋나지 않는다.
 */
const STATUS_TONE: Record<CompanyStatus, Omit<ToneChipOption<CompanyStatus>, 'value' | 'label'>> = {
  ACTIVE: { Icon: FiActivity, rgb: '22, 163, 74', text: '#15803d', textDark: '#86efac', accent: '#16a34a', title: '지금 영업 중인 기업' },
  DISSOLVED: { Icon: FiXCircle, rgb: '220, 38, 38', text: '#b91c1c', textDark: '#fca5a5', accent: '#dc2626', title: '청산·폐업으로 사라진 기업' },
  MERGED: { Icon: FiGitMerge, rgb: '37, 99, 235', text: '#1d4ed8', textDark: '#93c5fd', accent: '#2563eb', title: '다른 기업에 합쳐진 기업' },
  SUSPENDED: { Icon: FiPauseCircle, rgb: '217, 119, 6', text: '#b45309', textDark: '#fcd34d', accent: '#d97706', title: '국유화·전시 몰수 등으로 활동이 멈춘 기업' },
  OTHER: { Icon: FiMoreHorizontal, rgb: '100, 116, 139', text: '#475569', textDark: '#cbd5e1', accent: '#64748b' },
}

const STATUS_CHIP_OPTIONS: ToneChipOption<CompanyStatus>[] = COMPANY_STATUS_ORDER.map((status) => ({
  value: status,
  label: COMPANY_STATUS_META[status].label,
  ...STATUS_TONE[status],
}))

const SECTION_ID = {
  basic: 'company-form-section-basic',
  affiliation: 'company-form-section-affiliation',
  timing: 'company-form-section-timing',
  narrative: 'company-form-section-narrative',
} as const

const LEFT_SECTION_IDS = [SECTION_ID.basic, SECTION_ID.affiliation] as const
const RIGHT_SECTION_IDS = [SECTION_ID.timing, SECTION_ID.narrative] as const
const ALL_SECTION_IDS = [...LEFT_SECTION_IDS, ...RIGHT_SECTION_IDS] as const

/** 소속 국가 한 칸의 값 접두 — 현대/역사 id 공간이 달라 칸 값에 축을 싣는다 */
const AFFILIATION_MODERN = 'm:'
const AFFILIATION_HISTORICAL = 'h:'

const signedYear = (era: string | null | undefined, year: number | null | undefined) =>
  year == null ? null : era === 'BC' ? -year : year
const historicalStartKey = (historical: HistoricalCountryResponseDto) =>
  signedYear(historical.startEra, historical.startYear)
const historicalEndKey = (historical: HistoricalCountryResponseDto) =>
  signedYear(historical.endEra, historical.endYear)
const yearText = (year: number) => (year < 0 ? `BC ${-year}` : String(year))

/** '1871–1918' · 'BC 27–476' · '1949–' — 연도가 없으면 빈 값 */
function historicalSpanLabel(historical: HistoricalCountryResponseDto): string {
  const startKey = historicalStartKey(historical)
  const endKey = historicalEndKey(historical)
  if (startKey == null && endKey == null) return ''
  return `${startKey != null ? yearText(startKey) : '?'}–${endKey != null ? yearText(endKey) : ''}`
}

const SPLIT_LEFT_ID = 'company-form-split-left'
const SPLIT_RIGHT_ID = 'company-form-split-right'

/* ───────────────────────── 폼 상태 ───────────────────────── */

type FormState = {
  name: string
  shortName: string
  localName: string
  status: CompanyStatus
  /** 'YYYY-MM-DD' 또는 빈 값 */
  foundedAt: string
  dissolvedAt: string
  websiteUrl: string
  logoUrl: string
  description: string
  countryId: string
  historicalCountryId: string
  founderId: string
  headquartersCityId: string
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  localName: '',
  status: 'ACTIVE',
  foundedAt: '',
  dissolvedAt: '',
  websiteUrl: '',
  logoUrl: '',
  description: '',
  countryId: '',
  historicalCountryId: '',
  founderId: '',
  headquartersCityId: '',
}

/**
 * 서버 ISO(`1600-12-31T00:00:00.000Z`) → 칸 값 'YYYY-MM-DD'. 서버가 UTC 자정으로 저장하므로
 * 앞 10자를 그대로 쓴다(로컬 Date로 바꾸면 시간대에 따라 하루 밀린다).
 * 기원전(`-000578-…`)처럼 칸이 담을 수 없는 값은 빈 값 — 저장 때 그 칸은 보내지 않아 보존된다.
 */
function isoToYmd(raw: string | null | undefined): string {
  if (!raw) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim())
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

function hydrateForm(company: Company): FormState {
  return {
    name: company.name,
    shortName: company.shortName ?? '',
    localName: company.localName ?? '',
    status: company.status ?? 'ACTIVE',
    foundedAt: isoToYmd(company.foundedAt),
    dissolvedAt: isoToYmd(company.dissolvedAt),
    websiteUrl: company.websiteUrl ?? '',
    logoUrl: company.logoUrl ?? '',
    // 개요는 리치텍스트(HTML)라 평문 칸에 싣지 않는다 — 수정 모달은 개요를 다루지 않는다(검토 F1)
    description: '',
    countryId: company.countryId ?? '',
    historicalCountryId: company.historicalCountryId ?? '',
    founderId: company.founderId ?? '',
    headquartersCityId: company.headquartersCityId ?? '',
  }
}

const URL_PATTERN = /^https?:\/\//i

/**
 * 저장 본문. 개요(description)는 **신규 등록일 때만** 싣는다 — 평문 입력을 문단 HTML로 바꿔
 * 상세의 리치텍스트와 같은 형식으로 저장한다. 수정 때 실으면 상세에서 쓴 서식 있는 개요를
 * 평문 칸 값으로 덮게 된다.
 *
 * 날짜는 수정 때 **바뀐 칸만** 보낸다 — 칸이 못 담는 기존 값(기원전 등)이 빈 칸으로 보였다가
 * 저장 한 번에 지워지지 않게.
 */
function toPayload(form: FormState, baseline: FormState | null): CreateCompanyInput {
  const base: CreateCompanyInput = {
    name: form.name.trim(),
    shortName: form.shortName.trim() || null,
    localName: form.localName.trim() || null,
    status: form.status,
    websiteUrl: form.websiteUrl.trim() || null,
    logoUrl: form.logoUrl.trim() || null,
    countryId: form.countryId || null,
    historicalCountryId: form.historicalCountryId || null,
    founderId: form.founderId || null,
    headquartersCityId: form.headquartersCityId || null,
  }
  if (!baseline || form.foundedAt !== baseline.foundedAt) base.foundedAt = form.foundedAt || null
  if (!baseline || form.dissolvedAt !== baseline.dissolvedAt) base.dissolvedAt = form.dissolvedAt || null
  if (baseline) return base
  return { ...base, description: plainTextToRichTextHtml(form.description) || null }
}

/* ───────────────────────── 모달 ───────────────────────── */

export interface CompanyRegisterModalProps {
  isOpen: boolean
  /** 닫기 — dirty면 이 컴포넌트가 먼저 확인을 받는다 */
  onClose: () => void
  /** 수정 대상. 없으면 신규 등록. */
  companyId?: string
  /** 국가 상세에서 열었을 때 기본 선택될 현대 국가 ID */
  defaultCountryId?: string
  /** 역사 국가 상세에서 열었을 때 기본 선택될 과거 국가 ID */
  defaultHistoricalCountryId?: string
  /** 저장 성공 통지 — 캐시 무효화는 이미 했으므로 호출부 추가 처리용 */
  onSaved?: (company: Company) => void
}

export const CompanyRegisterModal: React.FC<CompanyRegisterModalProps> = ({
  isOpen,
  onClose,
  companyId,
  defaultCountryId,
  defaultHistoricalCountryId,
  onSaved,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(companyId)

  const initialForm = useMemo<FormState>(
    () => ({
      ...EMPTY,
      countryId: !isEdit && defaultCountryId ? defaultCountryId : '',
      historicalCountryId:
        !isEdit && defaultHistoricalCountryId ? defaultHistoricalCountryId : '',
    }),
    [isEdit, defaultCountryId, defaultHistoricalCountryId],
  )

  const [form, setForm] = useState<FormState>(initialForm)
  /** 더티 비교 기준 — 신규는 initialForm, 수정은 불러온 직후 */
  const [baseline, setBaseline] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [founderLabel, setFounderLabel] = useState('')
  const [cityLabel, setCityLabel] = useState('')
  const [logoBroken, setLogoBroken] = useState(false)
  /** 서버엔 있는데 칸이 담지 못한 날짜(기원전 등) — 저장 때 보존됨을 알린다 */
  const [unshownDates, setUnshownDates] = useState<{ founded: string | null; dissolved: string | null }>({
    founded: null,
    dissolved: null,
  })
  const [dateErrors, setDateErrors] = useState<{ founded: string | null; dissolved: string | null }>({
    founded: null,
    dissolved: null,
  })
  /** 날짜 칸은 치는 중간 상태를 스스로 들고 있어서, 초기화 때 새로 마운트해 비운다 */
  const [dateFieldKey, setDateFieldKey] = useState(0)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<HistoricalCountryResponseDto[]>([])
  /** 등록 직후 3지 분기 대상 */
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null)

  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode('papyrus:company-register-layout')
  const formScrollRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>(SECTION_ID.basic)

  const resetForm = useCallback(
    (next: FormState) => {
      setForm(next)
      setBaseline(next)
      setFounderLabel('')
      setCityLabel('')
      setLogoBroken(false)
      setUnshownDates({ founded: null, dissolved: null })
      setDateErrors({ founded: null, dissolved: null })
      setDateFieldKey((prev) => prev + 1)
      setActiveSectionId(SECTION_ID.basic)
    },
    [],
  )

  const scrollToTopAndFocusName = useCallback(() => {
    setActiveSectionId(SECTION_ID.basic)
    formScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document.getElementById(SPLIT_LEFT_ID)?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document.getElementById(SPLIT_RIGHT_ID)?.scrollTo?.({ top: 0, behavior: 'smooth' })
    nameInputRef.current?.focus()
  }, [])

  /* 열릴 때마다 대상에 맞춰 채운다 — 직전에 열었던 값이 남지 않도록 */
  useEffect(() => {
    if (!isOpen) return
    resetForm(initialForm)
    setLoadFailed(false)
    if (!companyId) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    companyApi
      .getById(companyId)
      .then((company) => {
        if (!alive) return
        if (!company) {
          setLoadFailed(true)
          return
        }
        const hydrated = hydrateForm(company)
        resetForm(hydrated)
        setFounderLabel(company.founder?.name ?? '')
        setCityLabel(company.headquartersCity?.name ?? '')
        setUnshownDates({
          founded: company.foundedAt && !hydrated.foundedAt ? company.foundedAt : null,
          dissolved: company.dissolvedAt && !hydrated.dissolvedAt ? company.dissolvedAt : null,
        })
      })
      .catch(() => alive && setLoadFailed(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [isOpen, companyId, initialForm, resetForm])

  /* 국가 후보는 한 번만 — 열 때마다 다시 받지 않는다 */
  useEffect(() => {
    if (!isOpen || countries.length > 0) return
    getAllCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
    getAllHistoricalCountries()
      .then(setHistoricalCountries)
      .catch(() => setHistoricalCountries([]))
  }, [isOpen, countries.length])

  useEffect(() => setLogoBroken(false), [form.logoUrl])

  const fetchCityOptions = useCallback(async (query: string): Promise<PickerOption[]> => {
    const cities = await cityApi.searchCities(query)
    return cities.map((city) => ({
      id: city.id,
      label: city.name,
      sub: city.countryName ?? undefined,
    }))
  }, [])

  const patch = <FieldKey extends keyof FormState>(key: FieldKey, value: FormState[FieldKey]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /*
   * 소속 국가는 **한 칸**이다 — 현대 국가 하나 또는 역사 국가 하나.
   * 역사 국가는 등록할 때 이미 현대 국가에 이어 두므로(parentModernCountryIds) 둘을 따로 받을
   * 이유가 없다. 현대 국가 기업 탭·대시보드는 그 연결을 따라 역사 국가 소속 기업까지 모은다.
   */
  const modernNameById = useMemo(
    () => new Map(countries.map((country) => [country.id, country.name])),
    [countries],
  )
  /** 기준 현대 국가 — 국가 상세에서 열었으면 그 나라, 아니면 지금 고른 칸에서 */
  const anchorModernId =
    defaultCountryId ||
    form.countryId ||
    (historicalCountries.find((historical) => historical.id === form.historicalCountryId)
      ?.parentModernCountryIds?.[0] ?? '')
  const affiliationValue = form.historicalCountryId
    ? `${AFFILIATION_HISTORICAL}${form.historicalCountryId}`
    : form.countryId
      ? `${AFFILIATION_MODERN}${form.countryId}`
      : ''
  const affiliationOptions = useMemo<SearchableSelectOption[]>(() => {
    const anchorName = anchorModernId ? modernNameById.get(anchorModernId) : undefined
    const linkedGroup = anchorName ? `${anchorName}과(와) 이어진 나라` : undefined
    const byName = (left: { name: string }, right: { name: string }) =>
      left.name.localeCompare(right.name, 'ko')
    const historicalOption = (historical: HistoricalCountryResponseDto, group: string) => {
      const modernNames = (historical.parentModernCountryIds ?? [])
        .map((modernId) => modernNameById.get(modernId))
        .filter((name): name is string => Boolean(name))
      const span = historicalSpanLabel(historical)
      return {
        value: `${AFFILIATION_HISTORICAL}${historical.id}`,
        label: historical.name,
        meta: [modernNames.join('·'), span].filter(Boolean).join(' · ') || undefined,
        keywords: [historical.enName, ...modernNames].filter(Boolean).join(' '),
        group,
      }
    }
    const linkedHistorical = anchorModernId
      ? historicalCountries
          .filter((historical) => historical.parentModernCountryIds?.includes(anchorModernId))
          .sort((left, right) => (historicalStartKey(left) ?? Infinity) - (historicalStartKey(right) ?? Infinity))
      : []
    const linkedIds = new Set(linkedHistorical.map((historical) => historical.id))
    return [
      ...(linkedGroup && anchorName
        ? [
            { value: `${AFFILIATION_MODERN}${anchorModernId}`, label: anchorName, meta: '현대', group: linkedGroup },
            ...linkedHistorical.map((historical) => historicalOption(historical, linkedGroup)),
          ]
        : []),
      ...[...countries]
        .filter((country) => !linkedGroup || country.id !== anchorModernId)
        .sort(byName)
        .map((country) => ({ value: `${AFFILIATION_MODERN}${country.id}`, label: country.name, group: '현대 국가' })),
      ...[...historicalCountries]
        .filter((historical) => !linkedIds.has(historical.id))
        .sort(byName)
        .map((historical) => historicalOption(historical, '역사 국가')),
    ]
  }, [anchorModernId, countries, historicalCountries, modernNameById])

  const pickAffiliation = (next: string) =>
    setForm((prev) => ({
      ...prev,
      countryId: next.startsWith(AFFILIATION_MODERN) ? next.slice(AFFILIATION_MODERN.length) : '',
      historicalCountryId: next.startsWith(AFFILIATION_HISTORICAL)
        ? next.slice(AFFILIATION_HISTORICAL.length)
        : '',
    }))

  /**
   * 설립 연도에 그 땅에 있던 역사 국가 — 현대 국가를 골랐는데 설립이 그 나라 성립 전이면
   * 연결된 역사 국가를 제안한다(1851년 독일 → 독일 연방). 고르는 건 사람 몫이라 자동으로 바꾸지 않는다.
   */
  const foundedYear = form.foundedAt ? Number(form.foundedAt.slice(0, 4)) : null
  const eraSuggestions =
    form.countryId && !form.historicalCountryId && foundedYear
      ? historicalCountries
          .filter((historical) => historical.parentModernCountryIds?.includes(form.countryId))
          .filter((historical) => {
            const startKey = historicalStartKey(historical)
            const endKey = historicalEndKey(historical)
            return startKey != null && startKey <= foundedYear && (endKey == null || foundedYear <= endKey)
          })
          .slice(0, 3)
      : []

  /* ── 검증 ── */
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const dateOrderInvalid = Boolean(form.foundedAt && form.dissolvedAt && form.dissolvedAt < form.foundedAt)
  const websiteInvalid = Boolean(form.websiteUrl.trim() && !URL_PATTERN.test(form.websiteUrl.trim()))
  const logoUrlInvalid = Boolean(form.logoUrl.trim() && !URL_PATTERN.test(form.logoUrl.trim()))
  const missingRequired = form.name.trim() ? [] : ['기업명']
  const validationProblem =
    dateErrors.founded ??
    dateErrors.dissolved ??
    (dateOrderInvalid
      ? '해산일은 설립일보다 빠를 수 없습니다.'
      : websiteInvalid
        ? '공식 웹사이트는 http(s)://로 시작해야 합니다.'
        : logoUrlInvalid
          ? '로고 URL은 http(s)://로 시작해야 합니다.'
          : null)
  const canSubmit =
    !submitting && !loading && !loadFailed && missingRequired.length === 0 && !validationProblem

  /* ── 섹션 배지(✓ = 필수 완료, 숫자 = 채운 칸) ── */
  const affiliationFilled = [form.countryId || form.historicalCountryId, form.founderId, form.headquartersCityId].filter(Boolean).length
  const timingFilled = [form.foundedAt, form.dissolvedAt, form.websiteUrl.trim(), form.logoUrl.trim()].filter(Boolean).length
  const narrativeFilled = !isEdit && form.description.trim() ? 1 : 0
  const sections = [
    { id: SECTION_ID.basic, label: '기본 정보', badge: missingRequired.length === 0 ? '✓' : null },
    { id: SECTION_ID.affiliation, label: '소속·인물', badge: affiliationFilled > 0 ? String(affiliationFilled) : null },
    { id: SECTION_ID.timing, label: '기간·링크', badge: timingFilled > 0 ? String(timingFilled) : null },
    { id: SECTION_ID.narrative, label: '소개', badge: narrativeFilled > 0 ? String(narrativeFilled) : null },
  ]

  const jumpToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    document.getElementById(sectionId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFormScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    let nextId: string
    if (target?.id === SPLIT_LEFT_ID) nextId = activeSectionAt(target, LEFT_SECTION_IDS)
    else if (target?.id === SPLIT_RIGHT_ID) nextId = activeSectionAt(target, RIGHT_SECTION_IDS)
    else nextId = activeSectionAt(event.currentTarget, ALL_SECTION_IDS)
    setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
  }

  const focusFirstMissing = () => {
    jumpToSection(SECTION_ID.basic)
    nameInputRef.current?.focus()
  }

  /* ── 닫기 · 초기화 ── */
  const requestClose = useCallback(async () => {
    if (submitting) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message: isEdit
          ? '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'
          : '작성 중인 기업 정보가 사라집니다. 창을 닫으시겠습니까?',
      }))
    ) {
      return
    }
    onClose()
  }, [submitting, isDirty, isEdit, onClose])

  const handleReset = async () => {
    if (submitting) return
    if (
      !(await confirm({
        title: '작성 내용 초기화',
        message: '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?',
      }))
    ) {
      return
    }
    resetForm(initialForm)
    requestAnimationFrame(() => scrollToTopAndFocusName())
  }

  /* ── 저장 ── */
  const handleSubmit = async (options?: { continueAfterSave?: boolean }) => {
    if (!canSubmit) {
      if (missingRequired.length > 0) {
        notify.error('기업명을 입력해주세요.')
        focusFirstMissing()
      } else if (validationProblem) {
        notify.error(validationProblem)
      }
      return
    }
    const continueAfterSave = !isEdit && Boolean(options?.continueAfterSave)
    setSubmitting(true)
    try {
      const payload = toPayload(form, isEdit ? baseline : null)
      const saved = companyId
        ? await companyApi.update(companyId, payload)
        : await companyApi.create(payload)
      setBaseline(form)
      // 목록·사이드바·국가 대시보드 기업 섹션·상세가 모두 ['companies', …] 아래다.
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      onSaved?.(saved)
      if (isEdit) {
        notify.success('기업 정보를 수정했습니다.')
        onClose()
      } else if (continueAfterSave) {
        notify.success(`'${saved.name}'을(를) 등록했습니다. 다음 기업을 이어서 입력하세요.`)
        resetForm(initialForm)
        requestAnimationFrame(() => scrollToTopAndFocusName())
      } else {
        setSavedCompanyId(saved.id)
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  useModalSubmitShortcut({
    enabled: isOpen && canSubmit && savedCompanyId === null,
    scrollContainerRef: formScrollRef,
    onSubmit: ({ continueAfterSave }) => {
      void handleSubmit({ continueAfterSave })
    },
  })

  const logoSrc = getUploadImageUrl(form.logoUrl)
  const showLogo = !!logoSrc && !logoBroken
  // 이름에서 딴다 — 약칭은 종목코드('000660')일 때가 많다
  const initial = form.name.trim().charAt(0).toUpperCase()

  /* ───────────── 섹션 ───────────── */

  const basicSectionNode = (
    <FormS.FormGroupSection id={SECTION_ID.basic} aria-labelledby={`${SECTION_ID.basic}-title`}>
      <FormS.FormGroupTitle id={`${SECTION_ID.basic}-title`}>기본 정보</FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="company-name">
          기업명 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <NameLine>
            <LogoTile $hasLogo={showLogo} aria-hidden>
              {showLogo ? (
                <img src={logoSrc} alt="" onError={() => setLogoBroken(true)} />
              ) : (
                initial || <FiBriefcase size={16} />
              )}
            </LogoTile>
            <FormS.TitleInput
              ref={nameInputRef}
              id="company-name"
              value={form.name}
              onChange={(event) => patch('name', event.target.value)}
              autoComplete="off"
              maxLength={100}
              aria-required
              placeholder="예: 영국 동인도회사, 크루프, 미쓰비시"
            />
          </NameLine>
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          약칭 · 원어명<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.SubTitleGrid>
            <FormS.SubTitleField htmlFor="company-short-name">
              <FormS.SubTitleLabel>약칭 / 티커</FormS.SubTitleLabel>
              <EventFormS.Input
                id="company-short-name"
                value={form.shortName}
                onChange={(event) => patch('shortName', event.target.value)}
                autoComplete="off"
                maxLength={50}
                placeholder="예: EIC, 000660"
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField htmlFor="company-local-name">
              <FormS.SubTitleLabel>현지어 / 원어명</FormS.SubTitleLabel>
              <EventFormS.Input
                id="company-local-name"
                value={form.localName}
                onChange={(event) => patch('localName', event.target.value)}
                autoComplete="off"
                maxLength={200}
                placeholder="예: East India Company"
              />
            </FormS.SubTitleField>
          </FormS.SubTitleGrid>
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="company-status-label">
          상태
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ToneChipGroup
            ariaLabelledBy="company-status-label"
            value={form.status}
            onChange={(next) => patch('status', next || 'ACTIVE')}
            options={STATUS_CHIP_OPTIONS}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const affiliationSectionNode = (
    <FormS.FormGroupSection id={SECTION_ID.affiliation} aria-labelledby={`${SECTION_ID.affiliation}-title`}>
      <FormS.FormGroupTitle id={`${SECTION_ID.affiliation}-title`}>
        소속·인물
        {affiliationFilled > 0 ? (
          <FormS.FormGroupSummaryBadge>{affiliationFilled}칸</FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          소속 국가<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <SearchableSelect
            id="company-affiliation"
            options={affiliationOptions}
            value={affiliationValue}
            onChange={pickAffiliation}
            placeholder="현대 국가 또는 그 시대 나라 고르기"
            searchPlaceholder="나라 이름으로 찾기 — '독일'로 찾으면 독일 제국도 나옵니다"
            ariaLabel="소속 국가"
            clearable
            emptyMessage="국가 목록을 불러오는 중입니다"
          />
          {eraSuggestions.length > 0 ? (
            <SuggestionRow>
              <SuggestionLabel>{foundedYear}년 설립이면</SuggestionLabel>
              {eraSuggestions.map((historical) => (
                <KitChoiceChip
                  key={historical.id}
                  type="button"
                  $selected={false}
                  onClick={() => pickAffiliation(`${AFFILIATION_HISTORICAL}${historical.id}`)}
                >
                  {historical.name}
                </KitChoiceChip>
              ))}
            </SuggestionRow>
          ) : null}
          <EventFormS.Hint>
            설립 당시의 나라를 하나 고릅니다(예: 동인도회사 → 잉글랜드 왕국). 역사 국가는 이미 현대 국가에 이어져 있어,
            고르면 그 현대 국가의 기업 목록에도 함께 나옵니다.
          </EventFormS.Hint>
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          창립자<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {/* 인물은 공용 인물 고르기로 — 드롭다운엔 이름(과 원어 이름)뿐이라 동명이인을 못 갈랐다 */}
          <PersonPickerButton
            value={form.founderId}
            selectedLabel={founderLabel}
            placeholder="창립자 고르기"
            title="창립자 선택"
            label="창립자"
            onChange={(founderId, label) => {
              patch('founderId', founderId)
              setFounderLabel(label)
            }}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          본사 도시<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <SearchPicker
            value={form.headquartersCityId}
            selectedLabel={cityLabel}
            placeholder="도시 이름으로 검색..."
            label="본사 도시"
            fetchOptions={fetchCityOptions}
            onChange={(cityId, label) => {
              patch('headquartersCityId', cityId)
              setCityLabel(label)
            }}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const timingSectionNode = (
    <FormS.FormGroupSection id={SECTION_ID.timing} aria-labelledby={`${SECTION_ID.timing}-title`}>
      <FormS.FormGroupTitle id={`${SECTION_ID.timing}-title`}>
        기간·링크
        {timingFilled > 0 ? <FormS.FormGroupSummaryBadge>{timingFilled}칸</FormS.FormGroupSummaryBadge> : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          설립 · 해산<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid key={dateFieldKey}>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>설립일</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="설립일"
                pickerTitle="설립일 선택"
                value={form.foundedAt}
                onChange={(ymd) => patch('foundedAt', ymd)}
                onErrorChange={(message) =>
                  setDateErrors((prev) => (prev.founded === message ? prev : { ...prev, founded: message }))
                }
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>해산일 (선택)</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="해산일"
                pickerTitle="해산일 선택"
                value={form.dissolvedAt}
                onChange={(ymd) => patch('dissolvedAt', ymd)}
                onErrorChange={(message) =>
                  setDateErrors((prev) => (prev.dissolved === message ? prev : { ...prev, dissolved: message }))
                }
                error={dateOrderInvalid}
                minDate={form.foundedAt || undefined}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          {dateOrderInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              해산일({form.dissolvedAt})이 설립일({form.foundedAt})보다 앞설 수 없습니다.
            </EventFormS.ErrorMessage>
          ) : unshownDates.founded || unshownDates.dissolved ? (
            <EventFormS.Hint>
              이 칸이 표시하지 못하는 기존 날짜(1000년 이전·기원전)는 비워 보이지만, 칸을 건드리지 않으면 그대로 보존됩니다.
            </EventFormS.Hint>
          ) : (
            <EventFormS.Hint>지금도 영업 중이면 해산일은 비워 둡니다.</EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="company-website">
          공식 웹사이트<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <IconInputWrap>
            <FiGlobe aria-hidden size={14} />
            <EventFormS.Input
              id="company-website"
              type="url"
              value={form.websiteUrl}
              onChange={(event) => patch('websiteUrl', event.target.value)}
              autoComplete="off"
              maxLength={255}
              placeholder="https://..."
              aria-invalid={websiteInvalid}
              $error={websiteInvalid}
            />
          </IconInputWrap>
          {websiteInvalid ? (
            <EventFormS.ErrorMessage role="alert">공식 웹사이트는 http(s)://로 시작해야 합니다.</EventFormS.ErrorMessage>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="company-logo-url">
          로고 URL<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <IconInputWrap>
            <FiImage aria-hidden size={14} />
            <EventFormS.Input
              id="company-logo-url"
              type="url"
              value={form.logoUrl}
              onChange={(event) => patch('logoUrl', event.target.value)}
              autoComplete="off"
              maxLength={255}
              placeholder="https://..."
              aria-invalid={logoUrlInvalid}
              $error={logoUrlInvalid}
            />
          </IconInputWrap>
          {logoUrlInvalid ? (
            <EventFormS.ErrorMessage role="alert">로고 URL은 http(s)://로 시작해야 합니다.</EventFormS.ErrorMessage>
          ) : form.logoUrl.trim() && logoBroken ? (
            <EventFormS.Hint>이미지를 불러오지 못했습니다 — 주소를 확인하세요.</EventFormS.Hint>
          ) : (
            <EventFormS.Hint>넣으면 기업명 옆 칸에 바로 보입니다. 파일 업로드는 상세 페이지에서 할 수 있습니다.</EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const narrativeSectionNode = (
    <FormS.FormGroupSection id={SECTION_ID.narrative} aria-labelledby={`${SECTION_ID.narrative}-title`}>
      <FormS.FormGroupTitle id={`${SECTION_ID.narrative}-title`}>소개</FormS.FormGroupTitle>
      {isEdit ? (
        <EventFormS.FormRow>
          <EventFormS.FormLabel as="div">개요</EventFormS.FormLabel>
          <EventFormS.FormField>
            <EventFormS.Hint>
              개요는 상세 페이지의 <strong>개요</strong>에서 서식·인물 링크와 함께 편집합니다. 연혁·시설·업종도 상세에서 채웁니다.
            </EventFormS.Hint>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      ) : (
        <EventFormS.FormRow>
          <EventFormS.FormLabel htmlFor="company-description">
            한 줄 소개<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            <EventFormS.Textarea
              id="company-description"
              value={form.description}
              onChange={(event) => patch('description', event.target.value)}
              rows={6}
              placeholder="기업을 한눈에 설명하는 짧은 소개 — 무엇을 만들고, 어디서, 누구와 거래했는지"
            />
            <EventFormS.Hint>
              저장 후 상세의 <strong>개요</strong>에서 서식·인물 링크를 더해 다듬을 수 있습니다. 연혁·시설·업종도 상세에서 이어서 채웁니다.
            </EventFormS.Hint>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      )}
    </FormS.FormGroupSection>
  )

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        closeOnEsc={!submitting}
        closeOnOverlayClick={!submitting}
        initialFocusRef={isEdit ? undefined : nameInputRef}
        title={isEdit ? '기업 기본 정보 수정' : '기업 등록'}
        headerActions={
          <HeaderActionsBar>
            <RegisterSectionJumpNav sections={sections} activeId={activeSectionId} onJump={jumpToSection} />
            {!isEdit && isDirty ? (
              <HeaderResetBtn
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleReset()
                }}
              >
                초기화
              </HeaderResetBtn>
            ) : null}
            <FormS.LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              aria-pressed={layoutMode === 'split'}
              aria-label={layoutMode === 'split' ? '1단 세로 보기로 전환' : '2단 좌우 분할 보기로 전환'}
              title={
                layoutMode === 'split'
                  ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                  : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
              }
              onClick={toggleLayoutMode}
            >
              <FiColumns size={13} aria-hidden="true" />
              <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
            </FormS.LayoutModeToggleBtn>
          </HeaderActionsBar>
        }
        maxWidth={layoutMode === 'split' ? 'min(1320px, 96vw)' : 'min(960px, 96vw)'}
        minHeight="80vh"
        height={layoutMode === 'split' ? '84vh' : undefined}
        fullBleedOnMobile
      >
        <FormS.MilitaryModalFormScroll
          ref={formScrollRef}
          $layoutMode={layoutMode}
          onScroll={handleFormScroll}
          onScrollCapture={handleFormScroll}
        >
          {submitting ? (
            <FormS.BusyBar role="status" aria-live="polite">
              {isEdit ? '수정 사항을 저장하는 중...' : '기업을 등록하는 중...'}
            </FormS.BusyBar>
          ) : null}

          {loading ? (
            <StateNote role="status">기업 정보를 불러오는 중...</StateNote>
          ) : loadFailed ? (
            <StateNote role="alert">기업 정보를 불러오지 못했습니다.</StateNote>
          ) : (
            <EventFormS.FormSection>
              {layoutMode === 'split' ? (
                <HalfSplitGrid>
                  <FormS.SplitColumnLeft id={SPLIT_LEFT_ID}>
                    {basicSectionNode}
                    {affiliationSectionNode}
                  </FormS.SplitColumnLeft>
                  <FormS.SplitColumnRight id={SPLIT_RIGHT_ID}>
                    {timingSectionNode}
                    {narrativeSectionNode}
                  </FormS.SplitColumnRight>
                </HalfSplitGrid>
              ) : (
                <>
                  {basicSectionNode}
                  {affiliationSectionNode}
                  {timingSectionNode}
                  {narrativeSectionNode}
                </>
              )}
            </EventFormS.FormSection>
          )}
        </FormS.MilitaryModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <RegisterFooterStatus
            missing={loading || loadFailed ? [] : missingRequired}
            onJumpToMissing={focusFirstMissing}
            problem={validationProblem}
            readyLabel={isEdit ? '수정 준비 완료' : '등록 준비 완료'}
            shortcuts={
              isEdit
                ? [{ keys: '⌘↵', label: '저장' }]
                : [
                    { keys: '⌘↵', label: '저장' },
                    { keys: '⌘⇧↵', label: '등록 후 계속' },
                  ]
            }
          />
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={() => {
                void requestClose()
              }}
              disabled={submitting}
            >
              취소
            </PersonRegisterModalCancelBtn>
            {!isEdit ? (
              <PersonRegisterModalCancelBtn
                type="button"
                disabled={!canSubmit}
                title="저장 후 창을 닫지 않고 다음 기업을 이어서 등록합니다 (⌘/Ctrl + Shift + Enter)"
                onClick={() => {
                  void handleSubmit({ continueAfterSave: true })
                }}
              >
                등록 후 계속
              </PersonRegisterModalCancelBtn>
            ) : null}
            <FormS.ModalPrimarySubmitBtn
              type="button"
              disabled={!canSubmit}
              title={
                missingRequired.length > 0
                  ? `필수 입력: ${missingRequired.join(', ')}`
                  : (validationProblem ?? '단축키: ⌘/Ctrl + Enter')
              }
              onClick={() => {
                void handleSubmit()
              }}
            >
              {submitting ? (isEdit ? '저장 중...' : '등록 중...') : isEdit ? '수정 완료' : '기업 등록'}
            </FormS.ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      <ConfirmDialog
        isOpen={savedCompanyId !== null}
        title="기업 등록 완료"
        message="등록했습니다. 상세로 이동해 연혁·시설·업종을 이어서 채우거나, 기업을 계속 등록할 수 있습니다."
        confirmLabel="상세 보기"
        altLabel="기업 계속 등록"
        onAlt={() => {
          setSavedCompanyId(null)
          resetForm(initialForm)
          requestAnimationFrame(() => scrollToTopAndFocusName())
        }}
        cancelLabel="닫기"
        onConfirm={() => {
          const targetId = savedCompanyId
          setSavedCompanyId(null)
          onClose()
          if (targetId) navigate(pathKeys.companies.detail(targetId))
        }}
        onCancel={() => {
          setSavedCompanyId(null)
          onClose()
        }}
      />
    </>
  )
}

export default CompanyRegisterModal

/* ───────────────────────── Styled ───────────────────────── */

const HalfSplitGrid = styled(FormS.SplitColumnsGrid)`
  @media (min-width: ${FormS.SPLIT_MIN_WIDTH}px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const StateNote = styled.p`
  margin: 48px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 기업명 칸 — 왼쪽에 로고(없으면 머리글자) 타일, 사건 제목 칸과 같은 높이 */
const NameLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  > input {
    flex: 1;
    min-width: 0;
  }
`

const LogoTile = styled.span<{ $hasLogo: boolean }>`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ $hasLogo, theme }) =>
    $hasLogo
      ? theme.colors.background.tertiary
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : '#eef2ff'};
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/** 설립 연도 기준 '그 시대 나라' 제안 줄 */
const SuggestionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const SuggestionLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 앞에 아이콘이 붙는 칸 — 아이콘 자리만큼 들여 쓴다 */
const IconInputWrap = styled.div`
  position: relative;
  min-width: 0;

  > svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }

  > input {
    width: 100%;
    padding-left: 34px;
  }
`
