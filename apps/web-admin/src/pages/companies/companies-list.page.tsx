/**
 * 기업 목록 — 사건 목록(`/events`)의 지면 문법을 따른다.
 *
 * - **존속 타임라인**: 국가별로 묶고, 행마다 공통 연도 축 위에 존속 막대를 그린다.
 *   이름만 줄 세운 표는 '나열'로만 읽혔다 — 축이 있으면 누가 먼저 섰고 얼마나 버텼는지가
 *   행끼리 비교된다(국가·창립자·본사 열은 묶음 머리글·이름 아래 메타 줄로 흡수).
 *
 * - 제목은 시각적으로 숨긴다(좌측 내비의 활성 탭과 같은 말). 대신 좌측 강조 막대 + 한 줄 집계.
 * - 데이터가 1순위: KPI 카드 4장·리스트/테이블 보기 토글·페이지네이션을 걷어내고
 *   **조밀한 열 표 하나**로 전부 보여 준다. 정렬은 열 머리글 클릭(aria-sort).
 * - 등록·수정은 페이지 이동이 아니라 `CompanyRegisterModal` — 검색어·필터·정렬·스크롤이
 *   모달을 닫은 뒤에도 그대로 남는다.
 * - 목록 데이터는 사이드바·국가 대시보드와 같은 쿼리 키(['companies','all'])라 한 번만 받는다.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiExternalLink,
  FiPlus,
  FiSearch,
  FiTag,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'

import type { Company, CompanyStatus } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { companyLifespanLabel } from '@/shared/lib/company-lifespan'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { richTextToPlainText } from '@/shared/lib/rich-text-plain'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import {
  COMPANY_STATUS_META,
  COMPANY_STATUS_ORDER,
  CompanyCategoryManagerModal,
  CompanyRegisterModal,
} from '@/widgets/company-form'

const COMPANIES_QUERY_KEY = ['companies', 'all'] as const

type SortKey = 'name' | 'founded'
type SortState = { key: SortKey; dir: 'asc' | 'desc' }

/** 기본 정렬 — 역사 기록이니 오래된 것이 위(국가 대시보드 기업 섹션과 같은 규약) */
const DEFAULT_SORT: SortState = { key: 'founded', dir: 'asc' }

const countryName = (company: Company) =>
  company.country?.name ?? company.historicalCountry?.name ?? null

/** 연도 라벨 — BC 음수연도 안전(slice(0,4)는 '-0044'를 '-004'로 깨뜨림). */
const yearLabel = (iso: string | null): string | null => {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return parts.year < 0 ? `BC ${Math.abs(parts.year)}` : String(parts.year)
}

/** 활동 중 = 상태가 ACTIVE(또는 미기입)이고 해산일이 없다 — companyLifespanLabel과 같은 판정 */
const isOngoing = (company: Company) =>
  !company.dissolvedAt && (!company.status || company.status === 'ACTIVE')

/**
 * 존속 기간 — '1600 – 1874' · 활동 중이면 '1969 – 현재' · 설립 미상이면 null.
 * 예전 '1969 –'는 끝이 잘린 것처럼 읽혀서 '현재'를 명시한다.
 */
const periodLabel = (company: Company): string | null => {
  const start = yearLabel(company.foundedAt)
  const end = yearLabel(company.dissolvedAt) ?? (isOngoing(company) ? '현재' : null)
  if (!start && !end) return null
  return `${start ?? '?'} – ${end ?? '?'}`
}

const sortValue = (company: Company, key: SortKey): string | number | null =>
  // 설립: BC 안전 숫자 키 — raw ISO 문자열 비교는 음수연도를 사전식으로 오정렬.
  key === 'name' ? company.name : dateSortKey(company.foundedAt)

const SORT_LABEL: Record<SortKey, string> = { name: '기업', founded: '존속' }

/* ── 존속 축 ── */

const startYearOf = (company: Company) => parseIsoDateParts(company.foundedAt)?.year ?? null
const endYearOf = (company: Company) => parseIsoDateParts(company.dissolvedAt)?.year ?? null

/** 눈금 간격 후보 — 축이 4~6칸이 되는 가장 촘촘한 값을 고른다 */
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]

/** ticks=라벨 달린 큰 눈금 · minorTicks=그 사이 옅은 보조 눈금(라벨 없음) */
type Axis = { from: number; to: number; ticks: number[]; minorTicks: number[] }

/**
 * 공통 연도 축 — 가장 오래된 설립 연도(조금 앞)부터 올해까지.
 * 필터와 무관하게 **등록 전체**로 잡는다: 검색할 때마다 축이 늘었다 줄면 막대 길이를 비교할 수 없다.
 */
const buildAxis = (companies: Company[], currentYear: number): Axis | null => {
  const starts = companies.map(startYearOf).filter((year): year is number => year != null)
  if (starts.length === 0) return null
  const earliest = Math.min(...starts)
  const span = Math.max(currentYear - earliest, 1)
  const step = TICK_STEPS.find((candidate) => span / candidate <= 5) ?? 1000
  // 맨 오래된 막대가 축 왼끝에 달라붙지 않게 4%쯤 앞에서 시작해 눈금에 맞춘다
  const from = Math.floor((earliest - span * 0.04) / step) * step
  const ticks: number[] = []
  // '현재' 라벨과 겹치지 않게 마지막 눈금은 올해에서 반 칸 이상 떨어진 것까지만
  for (let tick = from; tick <= currentYear - step * 0.5; tick += step) ticks.push(tick)
  // 큰 눈금 2~3개만으론 자(尺)로 안 읽혔다 — 사이를 2칸(25 같은 홀수 간격은 5칸)으로 쪼갠 보조선
  const minorStep = step % 2 === 0 ? step / 2 : step / 5
  const minorTicks: number[] = []
  if (Number.isInteger(minorStep) && minorStep > 0) {
    for (let tick = from + minorStep; tick < currentYear; tick += minorStep)
      if ((tick - from) % step !== 0) minorTicks.push(tick)
  }
  return { from, to: currentYear, ticks, minorTicks }
}

const axisPercent = (axis: Axis, year: number) =>
  Math.min(100, Math.max(0, ((year - axis.from) / (axis.to - axis.from)) * 100))

const axisYearLabel = (year: number) => (year < 0 ? `BC ${Math.abs(year)}` : String(year))

/* ── 국가 묶음 ── */

type CountryGroup = {
  key: string
  label: string
  historical: boolean
  /** 묶음 색 — 이니셜·존속 막대·머리글 띠가 같은 색이라 '이 나라 기업'이 한눈에 묶인다 */
  hue: string
  earliest: number | null
  companies: Company[]
}

/*
 * 묶음 색 팔레트 — 빨강·주황 계열은 뺐다(해산·중단 상태색과 겹치면 막대 색이 거짓말을 한다).
 * 해시로 고르면 나라가 몇 개 안 될 때도 색이 겹쳤다(7색에 3국인데 둘이 같은 초록) →
 * 등록 전체의 국가를 id순으로 줄 세워 차례로 배정한다. 필터·정렬과 무관하게 같은 나라는 같은 색.
 */
const GROUP_HUES = ['#2563eb', '#0d9488', '#7c3aed', '#0284c7', '#059669', '#4f46e5', '#0891b2']
const NEUTRAL_HUE = '#64748b'

const buildHueMap = (companies: Company[]): Map<string, string> => {
  const keys = [...new Set(companies.map(countryKeyOf))]
    .filter((key) => key !== NO_COUNTRY)
    .sort()
  return new Map(keys.map((key, index) => [key, GROUP_HUES[index % GROUP_HUES.length]]))
}

const NO_COUNTRY = '__none__'

/* ── 필터(패싯) ── */

type FacetKey = 'country' | 'century' | 'status'

type Filters = {
  needle: string
  countries: ReadonlySet<string>
  centuries: ReadonlySet<number>
  statuses: ReadonlySet<CompanyStatus>
}

const countryKeyOf = (company: Company) =>
  company.country?.id ?? company.historicalCountry?.id ?? NO_COUNTRY

/** 설립 세기 — 1969→20, 1600→16, BC 44→-1. 설립 미상은 0. */
const centuryOf = (company: Company): number => {
  const year = startYearOf(company)
  if (year == null) return 0
  const century = Math.floor((Math.max(Math.abs(year), 1) - 1) / 100) + 1
  return year > 0 ? century : -century
}

const centuryLabel = (century: number) =>
  century === 0 ? '설립 미상' : century < 0 ? `BC ${-century}세기` : `${century}세기`

/**
 * 패싯 판정 — `skip`한 축은 보지 않는다.
 * 칩 옆 숫자는 '그 축만 빼고 나머지 조건을 다 건 결과'라서, 누르면 정확히 그만큼 남는다.
 */
const matchesFilters = (company: Company, filters: Filters, skip?: FacetKey) => {
  if (skip !== 'country' && filters.countries.size && !filters.countries.has(countryKeyOf(company)))
    return false
  if (skip !== 'century' && filters.centuries.size && !filters.centuries.has(centuryOf(company)))
    return false
  if (
    skip !== 'status' &&
    filters.statuses.size &&
    !(company.status && filters.statuses.has(company.status))
  )
    return false
  if (!filters.needle) return true
  return [
    company.name,
    company.shortName,
    company.localName,
    company.country?.name,
    company.historicalCountry?.name,
    company.founder?.name,
  ].some((value) => value?.toLowerCase().includes(filters.needle))
}

type FacetOption<OptionKey> = { key: OptionKey; label: string; count: number; tone?: string }

const toggleInSet = <OptionKey,>(set: ReadonlySet<OptionKey>, key: OptionKey): Set<OptionKey> => {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

/**
 * 행을 국가별로 묶는다 — 묶음 안 순서는 들어온 정렬 그대로.
 * 묶음 순서는 가장 이른 설립 연도순(역사 기록이니 오래된 쪽이 위), 국가 미상은 맨 뒤.
 */
const groupByCountry = (
  companies: Company[],
  hueMap: ReadonlyMap<string, string>,
): CountryGroup[] => {
  const groups = new Map<string, CountryGroup>()
  for (const company of companies) {
    const country = company.country ?? company.historicalCountry
    const key = country?.id ?? NO_COUNTRY
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: country?.name ?? '국가 미상',
        historical: !company.country && !!company.historicalCountry,
        hue: hueMap.get(key) ?? NEUTRAL_HUE,
        earliest: null,
        companies: [],
      }
      groups.set(key, group)
    }
    group.companies.push(company)
    const start = startYearOf(company)
    if (start != null && (group.earliest == null || start < group.earliest)) group.earliest = start
  }
  return [...groups.values()].sort((left, right) => {
    if (left.key === NO_COUNTRY) return 1
    if (right.key === NO_COUNTRY) return -1
    if (left.earliest == null) return 1
    if (right.earliest == null) return -1
    return left.earliest - right.earliest || left.label.localeCompare(right.label, 'ko')
  })
}

/** 묶음이 걸친 기간 — 가장 이른 설립부터 가장 늦은 끝(활동 중이면 올해)까지 */
const groupSpan = (group: CountryGroup, currentYear: number) => {
  if (group.earliest == null) return null
  let latest = group.earliest
  for (const company of group.companies) {
    const end =
      endYearOf(company) ?? (isOngoing(company) ? currentYear : startYearOf(company))
    if (end != null && end > latest) latest = end
  }
  return { from: group.earliest, to: latest, ongoing: latest === currentYear }
}

/** 존속 막대 — 설립에서 해산(또는 올해)까지. 끝을 모르면 짧은 점선 꼬리만. */
const LifespanBar: React.FC<{ company: Company; axis: Axis; tone: string; ongoing: boolean }> = ({
  company,
  axis,
  tone,
  ongoing,
}) => {
  const start = startYearOf(company)
  if (start == null) return <TrackNote>설립 미상</TrackNote>
  const end = endYearOf(company) ?? (ongoing ? axis.to : null)
  const left = axisPercent(axis, start)
  // 연도 라벨은 행 hover·포커스 때만 — 늘 띄우면 오른쪽 기간 열과 같은 숫자가 두 번 보인다
  const startLabel = <BarLabel $tone={tone}>{axisYearLabel(start)}</BarLabel>
  if (end == null) {
    return (
      <Bar $tone={tone} $kind="unknown" style={{ left: `${left}%`, width: '6%' }}>
        {startLabel}
      </Bar>
    )
  }
  return (
    <Bar
      $tone={tone}
      $kind={ongoing ? 'ongoing' : 'ended'}
      style={{ left: `${left}%`, width: `${Math.max(axisPercent(axis, end) - left, 0)}%` }}
    >
      {startLabel}
      {/* 활동 중의 끝은 '현재' 선이 이미 말한다 */}
      {!ongoing && (
        <BarLabel $tone={tone} $end>
          {axisYearLabel(end)}
        </BarLabel>
      )}
    </Bar>
  )
}

/** 로고 — 로드 실패 시 이니셜로 폴백(깨진 이미지 박스 방지). */
const CompanyMark: React.FC<{ company: Company; hue: string }> = ({ company, hue }) => {
  const src = getUploadImageUrl(company.logoUrl)
  const [broken, setBroken] = useState(false)
  // 이름에서 딴다 — 약칭은 '000660' 같은 종목코드라 이니셜로 쓰면 '0'이 된다
  const initial = (company.name.trim()[0] ?? '·').toUpperCase()
  const showLogo = !!src && !broken
  return (
    <Mark $hasLogo={showLogo} $hue={hue} aria-hidden>
      {showLogo ? <img src={src} alt="" onError={() => setBroken(true)} /> : initial}
    </Mark>
  )
}

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    data: list = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: COMPANIES_QUERY_KEY,
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [query, setQuery] = useState('') // 입력값(즉시)
  const [search, setSearch] = useState('') // 디바운스된 검색어
  const [countryFilter, setCountryFilter] = useState<ReadonlySet<string>>(new Set())
  const [centuryFilter, setCenturyFilter] = useState<ReadonlySet<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<ReadonlySet<CompanyStatus>>(new Set())
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  /** 등록·수정 모달 — null=닫힘, 'new'=신규, 그 외=수정 대상 id */
  const [modalTarget, setModalTarget] = useState<string | null>(null)
  /* 카테고리 관리 모달 — 옛 /company-categories 주소는 ?categories=open으로 넘어와 바로 연다 */
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoriesOpen, setCategoriesOpen] = useState(
    () => searchParams.get('categories') === 'open',
  )
  const closeCategories = () => {
    setCategoriesOpen(false)
    if (searchParams.has('categories')) {
      const next = new URLSearchParams(searchParams)
      next.delete('categories')
      setSearchParams(next, { replace: true })
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  // 같은 열 클릭: 방향 반전 / 다른 열: 오름차순으로 시작
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      COMPANY_STATUS_ORDER.map((status) => [status, 0]),
    ) as Record<CompanyStatus, number>
    for (const company of list) if (company.status) counts[company.status] += 1
    return counts
  }, [list])

  const countryCount = useMemo(
    () => new Set(list.map(countryName).filter(Boolean)).size,
    [list],
  )

  const filters = useMemo<Filters>(
    () => ({
      needle: search.trim().toLowerCase(),
      countries: countryFilter,
      centuries: centuryFilter,
      statuses: statusFilter,
    }),
    [search, countryFilter, centuryFilter, statusFilter],
  )

  /** 축마다 '자기 축만 뺀' 조건으로 센 선택지 — 등록 전체에 있는 값은 0건이어도 남긴다(사라지면 칩이 튄다) */
  const facets = useMemo(() => {
    const countFor = <OptionKey,>(
      facet: FacetKey,
      keyOf: (company: Company) => OptionKey | null,
    ): Map<OptionKey, number> => {
      const counts = new Map<OptionKey, number>()
      for (const company of list) {
        const key = keyOf(company)
        if (key == null) continue
        if (!counts.has(key)) counts.set(key, 0)
        if (matchesFilters(company, filters, facet)) counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      return counts
    }
    const countryLabels = new Map<string, string>()
    for (const company of list)
      countryLabels.set(countryKeyOf(company), countryName(company) ?? '국가 미상')

    const countries: FacetOption<string>[] = [...countFor('country', countryKeyOf)]
      .map(([key, count]) => ({ key, label: countryLabels.get(key) ?? '국가 미상', count }))
      .sort((left, right) => {
        if (left.key === NO_COUNTRY) return 1
        if (right.key === NO_COUNTRY) return -1
        return left.label.localeCompare(right.label, 'ko')
      })
    // 세기는 연대순, 미상(0)은 맨 뒤
    const centuries: FacetOption<number>[] = [...countFor('century', centuryOf)]
      .map(([key, count]) => ({ key, label: centuryLabel(key), count }))
      .sort((left, right) =>
        left.key === 0 ? 1 : right.key === 0 ? -1 : left.key - right.key,
      )
    const statusCountMap = countFor('status', (company) => company.status)
    const statuses: FacetOption<CompanyStatus>[] = COMPANY_STATUS_ORDER.filter((status) =>
      statusCountMap.has(status),
    ).map((status) => ({
      key: status,
      label: COMPANY_STATUS_META[status].label,
      count: statusCountMap.get(status) ?? 0,
      tone: COMPANY_STATUS_META[status].tone,
    }))
    return { countries, centuries, statuses }
  }, [list, filters])

  const rows = useMemo(() => {
    const filtered = list.filter((company) => matchesFilters(company, filters))
    const direction = sort.dir === 'asc' ? 1 : -1
    return filtered.sort((left, right) => {
      const leftValue = sortValue(left, sort.key)
      const rightValue = sortValue(right, sort.key)
      // 값 없는 항목은 정렬 방향과 무관하게 항상 뒤로
      if (leftValue == null && rightValue == null)
        return left.name.localeCompare(right.name, 'ko')
      if (leftValue == null) return 1
      if (rightValue == null) return -1
      const compared =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), 'ko')
      return compared * direction || left.name.localeCompare(right.name, 'ko')
    })
  }, [list, filters, sort])

  const currentYear = new Date().getFullYear()
  const axis = useMemo(() => buildAxis(list, currentYear), [list, currentYear])
  const hueMap = useMemo(() => buildHueMap(list), [list])
  const groups = useMemo(() => groupByCountry(rows, hueMap), [rows, hueMap])

  /** 머리글 한 줄 사실 — 지금 보이는 행 기준 가장 오래된 기업·평균 존속 햇수 */
  const insight = useMemo(() => {
    let oldest: { company: Company; year: number } | null = null
    let totalYears = 0
    let measured = 0
    for (const company of rows) {
      const start = startYearOf(company)
      if (start == null) continue
      if (!oldest || start < oldest.year) oldest = { company, year: start }
      const end = endYearOf(company) ?? (isOngoing(company) ? currentYear : null)
      if (end == null || end < start) continue
      totalYears += end - start
      measured += 1
    }
    return { oldest, averageYears: measured ? Math.round(totalYears / measured) : null }
  }, [rows, currentYear])

  const facetCount = countryFilter.size + centuryFilter.size + statusFilter.size
  const isFiltered = !!search.trim() || facetCount > 0

  const resetFilters = () => {
    setQuery('')
    setSearch('')
    setCountryFilter(new Set())
    setCenturyFilter(new Set())
    setStatusFilter(new Set())
  }

  /** 걸린 조건을 칩으로 — 패널 아래 한 줄에서 하나씩 뗄 수 있다 */
  const activeChips: { id: string; label: string; remove: () => void }[] = [
    ...(search.trim()
      ? [{ id: 'search', label: `“${search.trim()}”`, remove: () => setQuery('') }]
      : []),
    ...facets.countries
      .filter((option) => countryFilter.has(option.key))
      .map((option) => ({
        id: `country-${option.key}`,
        label: option.label,
        remove: () => setCountryFilter((prev) => toggleInSet(prev, option.key)),
      })),
    ...facets.centuries
      .filter((option) => centuryFilter.has(option.key))
      .map((option) => ({
        id: `century-${option.key}`,
        label: option.label,
        remove: () => setCenturyFilter((prev) => toggleInSet(prev, option.key)),
      })),
    ...facets.statuses
      .filter((option) => statusFilter.has(option.key))
      .map((option) => ({
        id: `status-${option.key}`,
        label: option.label,
        remove: () => setStatusFilter((prev) => toggleInSet(prev, option.key)),
      })),
  ]

  const renderFacet = <OptionKey extends string | number>(
    label: string,
    options: FacetOption<OptionKey>[],
    selected: ReadonlySet<OptionKey>,
    onToggle: (key: OptionKey) => void,
  ) => (
    <FacetRow role="group" aria-label={`${label} 필터`}>
      <FacetLabel aria-hidden>{label}</FacetLabel>
      <ChipList>
        {options.map((option) => {
          const active = selected.has(option.key)
          return (
            <Chip
              key={String(option.key)}
              type="button"
              $active={active}
              aria-pressed={active}
              // 0건이어도 선택돼 있으면 풀 수 있어야 한다
              disabled={!active && option.count === 0}
              onClick={() => onToggle(option.key)}
            >
              {option.tone && <Dot $tone={option.tone} aria-hidden />}
              {option.label}
              <ChipCount>{option.count}</ChipCount>
            </Chip>
          )
        })}
      </ChipList>
    </FacetRow>
  )

  const handleDelete = async (company: Company) => {
    if (deletingId) return
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `'${company.name}' 기업을 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    setDeletingId(company.id)
    try {
      await companyApi.delete(company.id)
      // 낙관적 제거 후 사이드바 등 같은 키 소비처까지 정본 재조회
      queryClient.setQueryData<Company[]>(COMPANIES_QUERY_KEY, (prev) =>
        prev?.filter((item) => item.id !== company.id),
      )
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const renderBody = () => {
    if (isLoading) {
      return Array.from({ length: 8 }).map((_, index) => (
        <Row key={index} as="div" aria-hidden>
          <NameCell>
            <Skeleton $w="32px" $h="32px" $r="9px" />
            <SkeletonStack>
              <Skeleton $w={`${30 + ((index * 17) % 30)}%`} $h="13px" />
              <Skeleton $w={`${50 + ((index * 23) % 35)}%`} $h="10px" />
            </SkeletonStack>
          </NameCell>
          <TrackCell>
            <Skeleton
              $h="6px"
              $r="3px"
              style={{ marginLeft: `${20 + ((index * 29) % 50)}%` }}
              $w={`${20 + ((index * 13) % 25)}%`}
            />
          </TrackCell>
          <Cell>
            <Skeleton $w="70%" $h="11px" />
          </Cell>
        </Row>
      ))
    }
    if (isError) {
      return (
        <EmptyState>
          <EmptyTitle>기업을 불러오지 못했습니다</EmptyTitle>
          <EmptyDesc>일시적인 오류일 수 있습니다. 다시 시도해 주세요.</EmptyDesc>
          <GhostBtn type="button" onClick={() => void refetch()}>
            다시 시도
          </GhostBtn>
        </EmptyState>
      )
    }
    if (rows.length === 0) {
      return (
        <EmptyState>
          <EmptyTitle>
            {isFiltered ? '조건에 맞는 기업이 없습니다' : '아직 등록된 기업이 없습니다'}
          </EmptyTitle>
          <EmptyDesc>
            {isFiltered
              ? '검색어나 필터 조건을 바꿔 보세요.'
              : '첫 기업을 등록해 데이터베이스를 시작하세요.'}
          </EmptyDesc>
          {isFiltered ? (
            <GhostBtn type="button" onClick={resetFilters}>
              <FiX size={14} />
              필터 초기화
            </GhostBtn>
          ) : (
            <PrimaryBtn type="button" onClick={() => setModalTarget('new')}>
              <FiPlus size={15} />
              기업 추가
            </PrimaryBtn>
          )}
        </EmptyState>
      )
    }
    const renderRow = (company: Company, hue: string) => {
      const meta = company.status ? COMPANY_STATUS_META[company.status] : null
      const detailPath = pathKeys.companies.detail(company.id)
      const period = periodLabel(company)
      const lifespan = companyLifespanLabel(company)
      const ongoing = isOngoing(company)
      // 활동 중은 '– 현재'가 이미 말한다 — 그 밖의 상태만 색 점으로 드러낸다
      const showStatus = !!meta && !ongoing
      // 개요는 리치텍스트(HTML)가 정본 — 목록은 평문 한 줄로(태그가 그대로 보이던 결함, 검토 F1)
      const summary = richTextToPlainText(company.description)
      const subName = [company.shortName, company.localName]
        .filter((value) => value && value !== company.name)
        .join(' · ')
      return (
        <Row
          key={company.id}
          role="row"
          onClick={(event) => {
            // 행 안 링크·버튼은 자기 동작만 — 행 클릭은 빈 자리에서만 상세로
            if ((event.target as HTMLElement).closest('a,button')) return
            navigate(detailPath)
          }}
        >
          <NameCell role="cell">
            <CompanyMark company={company} hue={hue} />
            <NameText>
              <NameLine>
                <NameLink to={detailPath}>{company.name}</NameLink>
                {subName && <SubName>{subName}</SubName>}
              </NameLine>
              {summary && <Description title={summary}>{summary}</Description>}
              {(company.founder || company.headquartersCity) && (
                <MetaLine>
                  {company.founder && (
                    <span>
                      창립{' '}
                      <PlainLink to={pathKeys.personsTimelineDetail(company.founder.id)}>
                        {company.founder.name}
                      </PlainLink>
                    </span>
                  )}
                  {company.headquartersCity && (
                    <span>본사 {company.headquartersCity.name}</span>
                  )}
                </MetaLine>
              )}
            </NameText>
            {/* 관리 버튼 — 이름 칸 오른끝(소개 꼬리) 위에 뜬다. 예전엔 기간 열 위라 '1983 – 현재'가 반쯤 가려졌다 */}
            <ActionsCell role="group" aria-label={`${company.name} 관리`}>
              {company.websiteUrl && (
                <IconAction
                  as="a"
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="웹사이트 열기"
                  aria-label={`${company.name} 웹사이트 (새 창)`}
                >
                  <FiExternalLink size={14} />
                </IconAction>
              )}
              <IconAction
                type="button"
                onClick={() => setModalTarget(company.id)}
                title="기본 정보 수정"
                aria-label={`${company.name} 수정`}
              >
                <FiEdit2 size={14} />
              </IconAction>
              <IconAction
                type="button"
                $danger
                disabled={deletingId === company.id}
                onClick={() => void handleDelete(company)}
                title="삭제"
                aria-label={`${company.name} 삭제`}
              >
                <FiTrash2 size={14} />
              </IconAction>
            </ActionsCell>
          </NameCell>
          <TrackCell role="cell" aria-hidden>
            {axis && (
              <>
                {axis.minorTicks.map((tick) => (
                  <GridLine key={`m${tick}`} $minor style={{ left: `${axisPercent(axis, tick)}%` }} />
                ))}
                {/* 0% 선은 칸 경계와 겹쳐 열 구분선처럼 보인다 — 그리지 않는다 */}
                {axis.ticks
                  .filter((tick) => axisPercent(axis, tick) > 0.5)
                  .map((tick) => (
                    <GridLine key={tick} style={{ left: `${axisPercent(axis, tick)}%` }} />
                  ))}
                <NowLine />
                <LifespanBar
                  company={company}
                  axis={axis}
                  tone={showStatus && meta ? meta.tone : hue}
                  ongoing={ongoing}
                />
              </>
            )}
          </TrackCell>
          <Cell role="cell" $numeric>
            {period || showStatus ? (
              <Stack>
                {period && <span>{period}</span>}
                {showStatus && meta ? (
                  <StatusDot $tone={meta.tone}>
                    {meta.label}
                    {lifespan && <SubValue>· {lifespan}</SubValue>}
                  </StatusDot>
                ) : (
                  lifespan && <SubValue>{lifespan}</SubValue>
                )}
              </Stack>
            ) : (
              <Muted>—</Muted>
            )}
          </Cell>
        </Row>
      )
    }

    return groups.map((group) => {
      const span = groupSpan(group, currentYear)
      return (
        <div key={group.key} role="rowgroup" aria-label={group.label}>
          <GroupHead role="row">
            <GroupTitle role="cell">
              <GroupSwatch $hue={group.hue} aria-hidden />
              {group.label}
              <GroupCount>{group.companies.length}</GroupCount>
              {group.historical && <GroupTag>역사 국가</GroupTag>}
            </GroupTitle>
            {/* 이 나라 기업들이 걸친 기간 — 행 막대들의 그림자 띠 */}
            <GroupSpanCell role="cell" aria-hidden>
              {axis && span && (
                <GroupBand
                  $hue={group.hue}
                  style={{
                    left: `${axisPercent(axis, span.from)}%`,
                    width: `${Math.max(axisPercent(axis, span.to) - axisPercent(axis, span.from), 0.5)}%`,
                  }}
                />
              )}
            </GroupSpanCell>
            <GroupRange role="cell">
              {span &&
                `${axisYearLabel(span.from)} – ${span.ongoing ? '현재' : axisYearLabel(span.to)}`}
            </GroupRange>
          </GroupHead>
          {group.companies.map((company) => renderRow(company, group.hue))}
        </div>
      )
    })
  }

  return (
    <Page>
      <VisuallyHidden as="h1">기업</VisuallyHidden>

      <Header>
        <HeaderTitle>
          <TitleText aria-hidden>기업</TitleText>
          {!isLoading && !isError && (
            <Stats>
              {isFiltered && <span>조건 일치</span>}
              <span>
                <strong>{rows.length.toLocaleString()}</strong>개
              </span>
              {isFiltered ? (
                <StatsHint>/ 등록 전체 {list.length.toLocaleString()}개</StatsHint>
              ) : (
                <StatsHint>
                  · 활동 중 {statusCounts.ACTIVE.toLocaleString()} · 국가{' '}
                  {countryCount.toLocaleString()}
                </StatsHint>
              )}
              {insight.oldest && (
                <StatsHint>
                  · 가장 오래된 <em>{insight.oldest.company.name}</em>{' '}
                  {axisYearLabel(insight.oldest.year)}
                </StatsHint>
              )}
              {insight.averageYears != null && (
                <StatsHint>
                  · 평균 존속 <em>{insight.averageYears}년</em>
                </StatsHint>
              )}
            </Stats>
          )}
        </HeaderTitle>
        <HeaderActions>
          <GhostBtn type="button" onClick={() => setCategoriesOpen(true)} aria-haspopup="dialog">
            <FiTag size={14} />
            카테고리 관리
          </GhostBtn>
          <PrimaryBtn type="button" onClick={() => setModalTarget('new')}>
            <FiPlus size={15} />
            기업 추가
          </PrimaryBtn>
        </HeaderActions>
      </Header>

      <FilterPanel aria-label="기업 필터">
        <PanelTop>
          <SearchWrap>
            <FiSearch size={15} className="lead" aria-hidden />
            <SearchInput
              type="search"
              placeholder="기업명·약칭·원어명·국가·창립자로 검색"
              aria-label="기업 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.stopPropagation()
                  setQuery('')
                }
              }}
            />
            {query && (
              <ClearBtn type="button" onClick={() => setQuery('')} aria-label="검색어 지우기">
                <FiX size={13} />
              </ClearBtn>
            )}
          </SearchWrap>
          <SortGroup role="group" aria-label="정렬">
            <FacetLabel aria-hidden>정렬</FacetLabel>
            <Segment>
              {(['founded', 'name'] as const).map((key) => (
                <SegmentBtn
                  key={key}
                  type="button"
                  $active={sort.key === key}
                  aria-pressed={sort.key === key}
                  onClick={() => setSort((prev) => ({ key, dir: prev.key === key ? prev.dir : 'asc' }))}
                >
                  {key === 'founded' ? '설립순' : '이름순'}
                </SegmentBtn>
              ))}
            </Segment>
            <DirBtn
              type="button"
              onClick={() => toggleSort(sort.key)}
              aria-label={sort.dir === 'asc' ? '오름차순 — 눌러서 내림차순' : '내림차순 — 눌러서 오름차순'}
              title={
                sort.key === 'founded'
                  ? sort.dir === 'asc'
                    ? '오래된 순'
                    : '최근 순'
                  : sort.dir === 'asc'
                    ? '가나다순'
                    : '가나다 역순'
              }
            >
              {sort.dir === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
              {sort.key === 'founded'
                ? sort.dir === 'asc'
                  ? '오래된 순'
                  : '최근 순'
                : sort.dir === 'asc'
                  ? 'ㄱ → ㅎ'
                  : 'ㅎ → ㄱ'}
            </DirBtn>
          </SortGroup>
        </PanelTop>

        {!isLoading && !isError && list.length > 0 && (
          <Facets>
            {renderFacet('국가', facets.countries, countryFilter, (key) =>
              setCountryFilter((prev) => toggleInSet(prev, key)),
            )}
            {renderFacet('시기', facets.centuries, centuryFilter, (key) =>
              setCenturyFilter((prev) => toggleInSet(prev, key)),
            )}
            {renderFacet('상태', facets.statuses, statusFilter, (key) =>
              setStatusFilter((prev) => toggleInSet(prev, key)),
            )}
          </Facets>
        )}

        {isFiltered && (
          <ActiveBar>
            <ActiveSummary>
              <strong>{rows.length.toLocaleString()}</strong>
              <span>/ {list.length.toLocaleString()}개</span>
            </ActiveSummary>
            <ChipList>
              {activeChips.map((chip) => (
                <ActiveChip
                  key={chip.id}
                  type="button"
                  onClick={chip.remove}
                  aria-label={`${chip.label} 조건 해제`}
                >
                  {chip.label}
                  <FiX size={12} aria-hidden />
                </ActiveChip>
              ))}
            </ChipList>
            <ResetLink type="button" onClick={resetFilters}>
              모두 지우기
            </ResetLink>
          </ActiveBar>
        )}
      </FilterPanel>

      <VisuallyHidden role="status" aria-live="polite">
        {isLoading
          ? '불러오는 중'
          : isError
            ? '기업을 불러오지 못했습니다'
            : `${rows.length}개 기업`}
      </VisuallyHidden>

      <TableWrap>
        <Table role="table" aria-label="기업 목록" aria-busy={isLoading}>
          <HeadRow role="row">
            {(['name', 'axis', 'founded'] as const).map((column) => {
              if (column === 'axis') {
                return (
                  <AxisHead key="axis" role="columnheader" aria-label="존속 타임라인">
                    {axis && (
                      <>
                        {/* 머리글 아래 변에 눈금 — 아래 행들의 격자선이 여기서 시작하는 것처럼 */}
                        {axis.minorTicks.map((tick) => (
                          <AxisTick
                            key={`m${tick}`}
                            aria-hidden
                            $minor
                            style={{ left: `${axisPercent(axis, tick)}%` }}
                          />
                        ))}
                        {axis.ticks.map((tick, index) => (
                          <React.Fragment key={tick}>
                            {axisPercent(axis, tick) > 0.5 && (
                              <AxisTick aria-hidden style={{ left: `${axisPercent(axis, tick)}%` }} />
                            )}
                            <AxisLabel
                              aria-hidden
                              $edge={index === 0}
                              style={{ left: `${axisPercent(axis, tick)}%` }}
                            >
                              {axisYearLabel(tick)}
                            </AxisLabel>
                          </React.Fragment>
                        ))}
                        <AxisTick aria-hidden $now style={{ right: 0 }} />
                        <AxisNow aria-hidden>현재</AxisNow>
                      </>
                    )}
                  </AxisHead>
                )
              }
              const active = sort.key === column
              return (
                <HeadCell
                  key={column}
                  role="columnheader"
                  aria-sort={
                    active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  $first={column === 'name'}
                >
                  <SortBtn type="button" $active={active} onClick={() => toggleSort(column)}>
                    {SORT_LABEL[column]}
                    {active &&
                      (sort.dir === 'asc' ? (
                        <FiArrowUp size={11} aria-hidden />
                      ) : (
                        <FiArrowDown size={11} aria-hidden />
                      ))}
                  </SortBtn>
                </HeadCell>
              )
            })}
          </HeadRow>
          <div role="rowgroup">{renderBody()}</div>
        </Table>
      </TableWrap>

      <CompanyCategoryManagerModal isOpen={categoriesOpen} onClose={closeCategories} />
      <CompanyRegisterModal
        isOpen={modalTarget !== null}
        onClose={() => setModalTarget(null)}
        companyId={modalTarget && modalTarget !== 'new' ? modalTarget : undefined}
      />
    </Page>
  )
}

// ───────────────────────── Styled ─────────────────────────
// 값은 사건 목록(pages/events/styles/theme.ts)의 토큰과 같다 — 페이지 간 import를 피하려
// 필요한 몇 개만 옮겨 둔다: 브랜드 #2563eb · 메타 텍스트 #6b7280/#a1a1aa ·
// 행 헤어라인 rgba(15,23,42,.08)/rgba(255,255,255,.12) · 툴바 컨트롤 34px.

const BRAND = '#2563eb'
const metaText = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'
const rowHairline = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)'
/* 행 hover 틴트 — theme.colors.hover는 다크에서 지면과 거의 구분되지 않았다 */
const rowHover = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.035)'
/* 지면색 — sticky 머리글·행 위 오버레이가 불투명해야 해서 명시한다 */
const surface = ({ theme }: { theme: { mode: string; colors: { background: { primary: string } } } }) =>
  theme.mode === 'dark' ? theme.colors.background.primary : '#ffffff'
const focusRing = css`
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${BRAND};
  }
`

/*
 * 세 트랙 — 이름 | 존속 축 | 기간 글자. 이름과 축이 남는 폭을 나눠 갖는다.
 * 좁으면(≤720) 축을 접는다 — 축이 200px 아래로 내려가면 막대 길이 차이가 읽히지 않는다.
 * ⚠️ 접힌 셀은 display:none이라 자동 배치에서 빠진다 → 트랙 수도 같은 임계에서 같이 줄인다.
 */
const AXIS_HIDE_BELOW = 720
const rowGrid = css`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(0, 1.15fr) 120px;
  align-items: center;
  column-gap: 24px;

  @container companies (max-width: ${AXIS_HIDE_BELOW}px) {
    grid-template-columns: minmax(0, 1fr) 112px;
    column-gap: 12px;
  }
`

const hideNarrow = css`
  @container companies (max-width: ${AXIS_HIDE_BELOW}px) {
    display: none;
  }
`

/* 축 격자선·'현재' 선 색 — 행 헤어라인보다 한 단 옅게 */
const gridLineColor = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)'

const Page = styled.div`
  /* 헤더 오프셋과 스크롤 컨테이너는 ContentLayout이 준다 */
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 20px clamp(16px, 2.5vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  container: companies / inline-size;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  padding: 2px 0 2px 12px;

  /* 사건 목록과 같은 시그니처 — 좌측 강조 막대 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    border-radius: 2px;
    background: ${BRAND};
  }
`

const HeaderTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
`

const TitleText = styled.span`
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Stats = styled.span`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const StatsHint = styled.span`
  margin-left: 4px;

  em {
    font-style: normal;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  ${focusRing}
`

const PrimaryBtn = styled.button`
  ${buttonBase}
  border: 1px solid ${BRAND};
  background: ${BRAND};
  color: #fff;

  &:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
`

const GhostBtn = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.hover};
  }
`

/*
 * 필터 패널 — 검색·정렬 한 줄 + 패싯(국가·시기·상태) 칩 줄 + 걸린 조건 줄.
 * 예전엔 검색창 하나와 (상태가 한 종류면 사라지는) 세그먼트뿐이라 걸러 볼 축이 없었다.
 */
const FilterPanel = styled.section`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#fafbfc'};
`

const PanelTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px 20px;
  flex-wrap: wrap;
  padding: 12px 14px;
`

/*
 * 패싯은 한 줄에 나란히 — 축마다 칩이 1~3개라 세로 3줄이면 패널 대부분이 빈 칸이었다.
 * 축 사이는 세로 구분선, 좁으면 줄바꿈(줄 머리의 구분선은 왼쪽 여백만 남긴다).
 */
const Facets = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 0;
  padding: 10px 14px;
  border-top: 1px solid ${rowHairline};
`

const FacetRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 0 18px;
  border-left: 1px solid ${rowHairline};

  &:first-child {
    padding-left: 0;
    border-left: none;
  }
`

/* 축 이름 — 칩 높이(28) 가운데에 맞춘다 */
const FacetLabel = styled.span`
  flex-shrink: 0;
  line-height: 28px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};
`

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const Chip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
  ${focusRing}

  ${({ $active, theme }) =>
    $active
      ? css`
          border: 1px solid ${theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.55)' : BRAND};
          background: ${theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.22)' : '#eff6ff'};
          color: ${theme.mode === 'dark' ? '#bfdbfe' : '#1d4ed8'};
          font-weight: 600;
        `
      : css`
          border: 1px solid ${theme.colors.border.default};
          background: ${surface};
          color: ${theme.colors.text.secondary};
          &:hover:not(:disabled) {
            border-color: ${theme.colors.border.medium};
            color: ${theme.colors.text.primary};
          }
        `}

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
`

const SortGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const DirBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${surface};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  svg {
    color: ${BRAND};
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  ${focusRing}
`

const ActiveBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-top: 1px solid ${rowHairline};
`

const ActiveSummary = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};

  strong {
    font-size: 14px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ActiveChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 6px 0 9px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.22)' : '#eff6ff')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#bfdbfe' : '#1d4ed8')};

  svg {
    opacity: 0.7;
  }
  &:hover svg {
    opacity: 1;
  }
  ${focusRing}
`

const ResetLink = styled.button`
  margin-left: auto;
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: none;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
  ${focusRing}
`

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  max-width: 520px;

  svg.lead {
    position: absolute;
    left: 10px;
    color: ${metaText};
    pointer-events: none;
  }
`

const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  padding: 0 30px 0 32px;
  border-radius: 8px;
  font-size: 13px;
  /* 패널(옅은 회색) 위라 입력칸은 지면색으로 띄운다 */
  background: ${surface};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.15s,
    background 0.15s;

  &::placeholder {
    color: ${metaText};
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
  &:focus {
    outline: none;
    border-color: ${BRAND};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

const ClearBtn = styled.button`
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${focusRing}
`

const Segment = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const SegmentBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  ${focusRing}

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.primary};
          box-shadow: 0 1px 2px
            ${theme.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.08)'};
        `
      : css`
          background: transparent;
          color: ${metaText};
          &:hover {
            color: ${theme.colors.text.primary};
          }
        `}
`

const Dot = styled.span<{ $tone: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $tone }) => $tone};
  flex-shrink: 0;
`

/* ── 표 ── */

const TableWrap = styled.div`
  min-width: 0;
`

const Table = styled.div`
  width: 100%;
`

const HeadRow = styled.div`
  ${rowGrid}
  position: sticky;
  top: 0;
  z-index: 2;
  height: 32px;
  padding: 0 8px;
  /* sticky라 불투명해야 한다 — 아래로 지나가는 행이 비치면 안 된다 */
  background: ${surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

const HeadCell = styled.div<{ $first?: boolean }>`
  min-width: 0;
  overflow: hidden;
  /* 이름 열 머리글은 로고 폭(32)+간격(12)만큼 들여 행의 글자 시작선에 맞춘다 */
  padding-left: ${({ $first }) => ($first ? '44px' : '0')};
`

/* 축 머리글 — 눈금 연도를 행 격자선과 같은 x에 단다 */
const AxisHead = styled.div`
  position: relative;
  align-self: stretch;
  min-width: 0;
  ${hideNarrow}
`

const axisLabelBase = css`
  position: absolute;
  bottom: 8px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: 1;
`

const AxisLabel = styled.span<{ $edge?: boolean }>`
  ${axisLabelBase}
  /* 왼끝 눈금은 칸 밖으로 반쯤 나가지 않게 시작선 정렬 */
  transform: ${({ $edge }) => ($edge ? 'none' : 'translateX(-50%)')};
  color: ${metaText};
`

/* 머리글 아래 변의 눈금 — 큰 눈금 5px, 보조 3px, '현재'는 브랜드색 */
const AxisTick = styled.span<{ $minor?: boolean; $now?: boolean }>`
  position: absolute;
  bottom: 0;
  width: 1px;
  height: ${({ $minor }) => ($minor ? '3px' : '5px')};
  background: ${({ $now, theme }) =>
    $now ? BRAND : theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 23, 42, 0.22)'};
`

const AxisNow = styled.span`
  ${axisLabelBase}
  right: 0;
  color: ${BRAND};
`

const SortBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : metaText({ theme }))};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  svg {
    color: ${BRAND};
  }
  ${focusRing}
`

/*
 * 행 사이 가로줄은 없앤다 — 줄마다 칸막이가 있으면 '표에 줄 세운 목록'으로 읽혔다.
 * 구분은 묶음 머리글 선 + 행을 관통하는 축 격자선이 맡고, 행은 hover 면으로만 드러난다.
 */
const Row = styled.div`
  ${rowGrid}
  position: relative;
  min-height: 56px;
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: ${rowHover};
  }
`

const Cell = styled.div<{ $numeric?: boolean }>`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${({ $numeric }) =>
    $numeric &&
    css`
      font-variant-numeric: tabular-nums;
    `}
`

const NameCell = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const Mark = styled.span<{ $hasLogo: boolean; $hue: string }>`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 9px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  /* 묶음 색 틴트 — 다크에선 색 글자가 지면에 묻혀서 글자는 밝게, 면을 진하게 */
  color: ${({ $hue, theme }) => (theme.mode === 'dark' ? '#f4f4f5' : $hue)};
  background: ${({ $hasLogo, $hue, theme }) =>
    $hasLogo
      ? theme.colors.background.tertiary
      : theme.mode === 'dark'
        ? `${$hue}59`
        : `${$hue}17`};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/*
 * 두 줄: 이름·약칭 / 한 줄 소개.
 * 한 줄에 잇던 시절엔 이름 열(~300px)에서 소개가 '— 대한…' 몇 글자로 잘려 정보가 0이었다.
 * 소개는 기업을 가장 잘 설명하는 필드라 자기 줄을 준다.
 */
const NameText = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const NameLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
`

const NameLink = styled(Link)`
  flex-shrink: 0;
  max-width: 75%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  ${Row}:hover & {
    color: ${BRAND};
  }
  &:hover {
    text-decoration: underline;
  }
  ${focusRing}
`

const SubName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: ${metaText};
`

const Description = styled.span`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.45;
  color: ${metaText};
`

/* 값 아래 보조 줄(존속 햇수·'역사 국가') */
const Stack = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SubValue = styled.span`
  font-size: 11px;
  color: ${metaText};
`

/* 이름 아래 셋째 줄 — 창립자·본사(예전 독립 열) */
const MetaLine = styled.span`
  display: flex;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 11.5px;
  color: ${metaText};

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

/* ── 국가 묶음 머리글 ── */

const GroupSwatch = styled.span<{ $hue: string }>`
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $hue }) => $hue};
`

const GroupSpanCell = styled.div`
  position: relative;
  align-self: center;
  height: 10px;
  min-width: 0;
  ${hideNarrow}
`

const GroupBand = styled.span<{ $hue: string }>`
  position: absolute;
  top: 3px;
  height: 4px;
  border-radius: 2px;
  background: ${({ $hue, theme }) => `${$hue}${theme.mode === 'dark' ? '73' : '40'}`};
`

const GroupRange = styled.div`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${metaText};
`

const GroupHead = styled.div`
  ${rowGrid}
  align-items: end;
  padding: 24px 8px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

const GroupTitle = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const GroupTag = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${metaText};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'};
`

/* ── 존속 축 칸 ── */

/*
 * 행 padding(8px)만큼 위아래로 늘려 격자선이 행 경계를 넘어 이어지게 한다 —
 * 행마다 끊긴 짧은 선이면 축이 아니라 장식으로 읽힌다.
 */
const TrackCell = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  align-self: stretch;
  min-width: 0;
  margin: -8px 0;
  ${hideNarrow}
`

const GridLine = styled.span<{ $minor?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${gridLineColor};
  /* 보조선은 큰 눈금선의 절반 농도 — 자의 잔눈금처럼 */
  opacity: ${({ $minor }) => ($minor ? 0.5 : 1)};
`

const NowLine = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  border-right: 1px dashed
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.35)' : 'rgba(37, 99, 235, 0.3)')};
`

/*
 * 존속 막대 — 설립 점(원) + 몸통.
 * ongoing: 올해까지 차오르고 끝이 '현재' 선에 닿는다 / ended: 끝에 마감 눈금 /
 * unknown: 해산했다는데 날짜가 없음 — 짧은 점선으로 '끝 미상'.
 */
const Bar = styled.span<{ $tone: string; $kind: 'ongoing' | 'ended' | 'unknown' }>`
  position: absolute;
  top: 50%;
  /* 6px는 넓은 화면(축 칸 600px+)·56px 행에서 실오라기처럼 보였다 */
  height: 8px;
  min-width: 2px;
  margin-top: -4px;
  border-radius: 4px;
  background: ${({ $tone, $kind }) =>
    $kind === 'unknown'
      ? `repeating-linear-gradient(90deg, ${$tone} 0 3px, transparent 3px 6px)`
      : $kind === 'ended'
        ? `${$tone}99`
        : `linear-gradient(90deg, ${$tone}cc, ${$tone})`};
  transition: filter 0.12s;

  &::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 50%;
    width: 10px;
    height: 10px;
    margin-top: -5px;
    border-radius: 50%;
    background: ${surface};
    box-shadow: inset 0 0 0 2.5px ${({ $tone }) => $tone};
  }

  ${({ $kind, $tone }) =>
    $kind === 'ended' &&
    css`
      &::after {
        content: '';
        position: absolute;
        right: 0;
        top: -3px;
        width: 2px;
        height: 14px;
        border-radius: 1px;
        background: ${$tone};
      }
    `}

  ${Row}:hover & {
    filter: saturate(1.3) brightness(1.05);
  }
`

/* 막대 끝 연도 — 설립 점 위·끝 눈금 위. 평소엔 숨기고 행 hover·포커스 때 띄운다 */
const BarLabel = styled.span<{ $tone: string; $end?: boolean }>`
  position: absolute;
  bottom: 11px;
  ${({ $end }) =>
    $end
      ? css`
          right: 0;
          transform: translateX(50%);
        `
      : css`
          left: 0;
          transform: translateX(-50%);
        `}
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  white-space: nowrap;
  color: ${({ $tone, theme }) => (theme.mode === 'dark' ? '#f4f4f5' : $tone)};
  background: ${surface};
  opacity: 0;
  transition: opacity 0.12s;
  pointer-events: none;

  ${Row}:hover &,
  ${Row}:focus-within & {
    opacity: 1;
  }
`

const TrackNote = styled.span`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  font-size: 11px;
  color: ${metaText};
  opacity: 0.7;
`

/* 활동 중이 아닌 기업만 — 존속 열 둘째 줄에 색 점 + 라벨(+ 존속 햇수) */
const StatusDot = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '';
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
  }

  ${SubValue} {
    font-weight: 400;
  }
`

/* 셀 안의 보조 링크(창립자) — 평소엔 셀 글자색, hover 때만 밑줄 */
const PlainLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  border-radius: 3px;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  ${focusRing}
`

const Muted = styled.span`
  color: ${metaText};
  opacity: 0.6;
`

/*
 * 행 우측에 떠 있는 관리 버튼 — 격자 트랙을 차지하지 않는다.
 * 예전엔 100px 열을 늘 비워 두고 hover 때만 채워서, 평소엔 모든 행 끝에 빈 기둥이 섰고
 * 그만큼 이름 열이 좁았다. 이제 hover/포커스 때 상태 열 위에 겹쳐 뜬다.
 * 배경은 지면 + hover 틴트를 겹친 불투명 면이라 아래 상태 글자가 비치지 않는다.
 */
const ActionsCell = styled.div`
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
  padding: 2px 2px 2px 20px;
  /* 지면 위에 행 hover 틴트를 한 번 더 — 행 배경과 같은 색이 된다. 왼쪽 20px은 마스크로 녹인다
     (그라데이션 배경으로 녹이면 투명 구간에 틴트가 이중으로 얹힌다) */
  background:
    linear-gradient(${rowHover}, ${rowHover}),
    ${surface};
  mask-image: linear-gradient(to right, transparent, #000 20px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;

  /* 키보드 포커스에도 노출(WCAG 2.4.7) · 터치 기기는 상시 */
  ${Row}:hover &,
  ${Row}:focus-within & {
    opacity: 1;
    pointer-events: auto;
  }
  @media (hover: none) {
    opacity: 1;
    pointer-events: auto;
  }
`

const IconAction = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  ${focusRing}
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 24px;
  text-align: center;
`

const EmptyTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.div`
  font-size: 13px;
  color: ${metaText};
  margin-bottom: 8px;
`

const SkeletonStack = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const shimmer = keyframes`
  100% { transform: translateX(100%); }
`

const Skeleton = styled.span<{ $w?: string; $h?: string; $r?: string }>`
  display: block;
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '12px'};
  border-radius: ${({ $r }) => $r ?? '4px'};
  background: ${({ theme }) => theme.colors.background.tertiary};
  position: relative;
  overflow: hidden;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)'},
      transparent
    );
    animation: ${shimmer} 1.4s infinite;
  }
`
