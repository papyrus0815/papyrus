import { CountryTabEmptyState } from './country-tab-empty-state'
import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FiBriefcase,
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiGlobe,
  FiPlus,
  FiSearch,
  FiTag,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoDivider,
  BentoGrid3Col,
  BentoSubLabel,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  centuryOf,
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  type Mode,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  companyApi,
  type Company,
  type CompanyStatus,
} from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { SectionSubNav, SubNavFigure } from '@/shared/ui/section-sub-nav/section-sub-nav'
import { confirm } from '@/shared/ui/confirm-dialog'
import { AddButton } from '@/shared/ui/section-page-layout'
import { notify } from '@/shared/ui/toast'
import {
  COMPANY_STATUS_META,
  COMPANY_STATUS_ORDER,
  CompanyCategoryManagerModal,
  CompanyRegisterModal,
} from '@/widgets/company-form'

import {
  countryTabCanvasPadding,
  LedgerToolbarButton,
} from './country-ledger-primitives'

export interface CountryCompaniesTabSectionProps {
  country: UnifiedCountry
}

type SortKey = 'founded' | 'name'

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]

interface TimelineAxis {
  from: number
  to: number
  ticks: number[]
}

function startYearOf(company: Company): number | null {
  return parseIsoDateParts(company.foundedAt)?.year ?? null
}

function endYearOf(company: Company): number | null {
  return parseIsoDateParts(company.dissolvedAt)?.year ?? null
}

function isOngoing(company: Company): boolean {
  return !company.dissolvedAt && (!company.status || company.status === 'ACTIVE')
}

function formatYearText(year: number | null): string | null {
  if (year == null) return null
  return year < 0 ? `BC ${Math.abs(year)}` : `${year}년`
}

function formatPeriodText(company: Company): string {
  const start = formatYearText(startYearOf(company))
  const end =
    formatYearText(endYearOf(company)) ?? (isOngoing(company) ? '현재' : null)
  if (!start && !end) return '설립 연도 미상'
  return `${start ?? '?'} – ${end ?? '?'}`
}

function buildAxis(
  companies: Company[],
  currentYear: number,
): TimelineAxis | null {
  const starts = companies
    .map(startYearOf)
    .filter((year): year is number => year != null)
  if (starts.length === 0) return null
  const earliest = Math.min(...starts)
  const span = Math.max(currentYear - earliest, 1)
  const step =
    TICK_STEPS.find((candidate) => span / candidate <= 5) ?? 1000
  const from = Math.floor((earliest - span * 0.04) / step) * step
  const ticks: number[] = []
  for (let tick = from; tick <= currentYear - step * 0.35; tick += step) {
    ticks.push(tick)
  }
  return { from, to: currentYear, ticks }
}

function axisPercent(axis: TimelineAxis, year: number): number {
  if (axis.to <= axis.from) return 0
  return Math.min(
    100,
    Math.max(0, ((year - axis.from) / (axis.to - axis.from)) * 100),
  )
}

function companyStatusColor(status: CompanyStatus, mode: Mode): string {
  switch (status) {
    case 'ACTIVE':
      return mode === 'dark' ? '#34d399' : '#059669'
    case 'DISSOLVED':
      return mode === 'dark' ? '#94a3b8' : '#64748b'
    case 'MERGED':
      return mode === 'dark' ? '#a5b4fc' : '#4f46e5'
    case 'SUSPENDED':
      return mode === 'dark' ? '#fbbf24' : '#d97706'
    case 'OTHER':
    default:
      return mode === 'dark' ? '#5eead4' : '#0f766e'
  }
}

function formatCenturyBucketLabel(centuryIdx: number): string {
  return centuryIdx < 0
    ? `BC ${Math.abs(centuryIdx)}세기`
    : `${centuryIdx}세기`
}

/**
 * 국가 상세 「기업」 전용 탭 (현대·역사 국가 공용).
 *
 * 대시보드에서 전역 `/companies`로 튕기던 흐름을 국가 상세 내부로 편입하여,
 * 해당 국가(및 연결된 과거 국가) 소속 기업의 존속 타임라인·검색·상태별 필터·즉시 등록을 제공한다.
 */
export function CountryCompaniesTabSection({
  country,
}: CountryCompaniesTabSectionProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const mode = theme.mode
  const isModern = country.type === 'modern'
  const currentYear = new Date().getFullYear()

  const { data: allCompanies = [], isLoading } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })

  const historicalIds = useMemo(() => {
    if (!isModern) return new Set<string>([country.id])
    return new Set(
      (country.historicalCountries ?? []).map((item) => item.id),
    )
  }, [country, isModern])

  /** 이 국가(현대 + 연결된 과거 국가)에 속한 전체 기업 */
  const countryCompanies = useMemo(() => {
    return allCompanies.filter((company) => {
      if (isModern) {
        if (company.countryId === country.id) return true
        if (
          company.historicalCountryId &&
          historicalIds.has(company.historicalCountryId)
        ) {
          return true
        }
        return false
      }
      return company.historicalCountryId === country.id
    })
  }, [allCompanies, country.id, historicalIds, isModern])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'ALL'>('ALL')
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MODERN' | 'HISTORICAL'>(
    'ALL',
  )
  const [sortKey, setSortKey] = useState<SortKey>('founded')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalTarget, setModalTarget] = useState<string | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const modernCount = useMemo(
    () =>
      countryCompanies.filter((company) => company.countryId === country.id)
        .length,
    [countryCompanies, country.id],
  )
  const historicalCount = countryCompanies.length - modernCount

  const filteredCompanies = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return countryCompanies
      .filter((company) => {
        if (statusFilter !== 'ALL') {
          const status = company.status ?? 'ACTIVE'
          if (status !== statusFilter) return false
        }
        if (isModern && scopeFilter === 'MODERN') {
          if (company.countryId !== country.id) return false
        }
        if (isModern && scopeFilter === 'HISTORICAL') {
          if (company.countryId === country.id) return false
        }
        if (!needle) return true
        return [
          company.name,
          company.shortName,
          company.localName,
          company.founder?.name,
          company.headquartersCity?.name,
          company.historicalCountry?.name,
        ].some((val) => val?.toLowerCase().includes(needle))
      })
      .sort((left, right) => {
        const direction = sortDir === 'asc' ? 1 : -1
        if (sortKey === 'name') {
          return left.name.localeCompare(right.name, 'ko-KR') * direction
        }
        const leftDate = dateSortKey(left.foundedAt)
        const rightDate = dateSortKey(right.foundedAt)
        if (leftDate == null && rightDate == null) {
          return left.name.localeCompare(right.name, 'ko-KR')
        }
        if (leftDate == null) return 1
        if (rightDate == null) return -1
        return (leftDate - rightDate) * direction
      })
  }, [
    countryCompanies,
    statusFilter,
    isModern,
    scopeFilter,
    country.id,
    searchQuery,
    sortKey,
    sortDir,
  ])

  const axis = useMemo(
    () => buildAxis(countryCompanies, currentYear),
    [countryCompanies, currentYear],
  )

  const stats = useMemo(() => {
    const active = countryCompanies.filter((company) =>
      isOngoing(company),
    ).length
    const ended = countryCompanies.length - active
    const years = countryCompanies
      .map(startYearOf)
      .filter((yr): yr is number => yr != null)
    const earliest = years.length > 0 ? Math.min(...years) : null
    return {
      total: countryCompanies.length,
      active,
      ended,
      earliestLabel: formatYearText(earliest),
    }
  }, [countryCompanies])

  const bentoData = useMemo(() => {
    const statusItems = COMPANY_STATUS_ORDER.map((statusKey) => {
      const count = countryCompanies.filter(
        (company) => (company.status ?? 'ACTIVE') === statusKey,
      ).length
      const color = companyStatusColor(statusKey, mode)
      return {
        status: statusKey,
        label: COMPANY_STATUS_META[statusKey].label,
        count,
        color,
      }
    }).filter((item) => item.count > 0)

    const statusSlices: SegmentSlice[] = statusItems.map((item) => ({
      key: item.status,
      label: item.label,
      value: item.count,
      color: item.color,
      meta: `${item.count.toLocaleString('ko-KR')}개사`,
    }))

    const eraSlices: SegmentSlice[] =
      isModern && historicalCount > 0
        ? [
            {
              key: 'MODERN',
              label: `현대 설립 (${modernCount.toLocaleString('ko-KR')})`,
              value: modernCount,
              color: ledgerAccent(mode),
            },
            {
              key: 'HISTORICAL',
              label: `전신 국가 (${historicalCount.toLocaleString('ko-KR')})`,
              value: historicalCount,
              color: mode === 'dark' ? '#fbbf24' : '#d97706',
            },
          ]
        : []

    // Card 2: 거점 본사 도시 Top 5 (도시 미기재 시 historicalCountry 폴백, 전체 미기재 시 설립 세기·시대 분포 폴백)
    const hqMap = new Map<
      string,
      { name: string; count: number; isPolityFallback: boolean }
    >()
    let locatedCount = 0
    for (const company of countryCompanies) {
      const cityName = company.headquartersCity?.name?.trim()
      const histName = company.historicalCountry?.name?.trim()
      const fallbackPolity =
        !cityName && histName && (isModern || histName !== country.name)
          ? histName
          : undefined
      const keyName = cityName ?? fallbackPolity
      if (!keyName) continue
      locatedCount += 1
      const existing = hqMap.get(keyName)
      if (existing) {
        existing.count += 1
      } else {
        hqMap.set(keyName, {
          name: keyName,
          count: 1,
          isPolityFallback: !cityName,
        })
      }
    }

    const hqSorted = [...hqMap.values()].sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name, 'ko-KR'),
    )
    const hqTopFive = hqSorted.slice(0, 5)
    const maxHqCount =
      hqTopFive.length > 0
        ? Math.max(1, ...hqTopFive.map((row) => row.count))
        : 1

    const centuryMap = new Map<
      string,
      { key: string; label: string; sortOrder: number; count: number }
    >()
    for (const company of countryCompanies) {
      const yr = startYearOf(company)
      if (yr == null) {
        const prev = centuryMap.get('UNDATED')
        if (prev) prev.count += 1
        else {
          centuryMap.set('UNDATED', {
            key: 'UNDATED',
            label: '설립 연도 미상',
            sortOrder: Number.MAX_SAFE_INTEGER,
            count: 1,
          })
        }
        continue
      }
      const cIdx = yr < 0 ? -Math.ceil(Math.abs(yr) / 100) : centuryOf(yr)
      const cKey = `C_${cIdx}`
      const prev = centuryMap.get(cKey)
      if (prev) {
        prev.count += 1
      } else {
        centuryMap.set(cKey, {
          key: cKey,
          label: formatCenturyBucketLabel(cIdx),
          sortOrder: cIdx,
          count: 1,
        })
      }
    }
    const centuryFallbackTopFive = [...centuryMap.values()]
      .sort(
        (left, right) =>
          right.count - left.count || left.sortOrder - right.sortOrder,
      )
      .slice(0, 5)
    const maxCenturyCount =
      centuryFallbackTopFive.length > 0
        ? Math.max(1, ...centuryFallbackTopFive.map((row) => row.count))
        : 1

    // Card 3: 최장수 · 대표 기업 존속 스팬 Top 5
    const lifespanRows = countryCompanies
      .map((company) => {
        const startYr = startYearOf(company)
        if (startYr == null) return null
        const endYr = endYearOf(company)
        const ongoing = isOngoing(company)
        const duration = Math.max(0, (endYr ?? currentYear) - startYr)
        const startText =
          startYr < 0 ? `BC ${Math.abs(startYr)}` : `${startYr}`
        const endText =
          endYr != null
            ? endYr < 0
              ? `BC ${Math.abs(endYr)}`
              : `${endYr}`
            : ongoing
              ? '현재'
              : COMPANY_STATUS_META[company.status ?? 'DISSOLVED'].label
        return {
          company,
          startYr,
          ongoing,
          duration,
          spanLabel: `${startText}–${endText} · ${duration.toLocaleString('ko-KR')}년`,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (left, right) =>
          right.duration - left.duration ||
          left.startYr - right.startYr ||
          left.company.name.localeCompare(right.company.name, 'ko-KR'),
      )
    const datedCompanyCount = lifespanRows.length
    const lifespanTopFive = lifespanRows.slice(0, 5)
    const maxDuration =
      lifespanTopFive.length > 0
        ? Math.max(1, ...lifespanTopFive.map((row) => row.duration))
        : 1

    return {
      statusItems,
      statusSlices,
      eraSlices,
      locatedCount,
      distinctHqCount: hqSorted.length,
      hqTopFive,
      maxHqCount,
      centuryFallbackTopFive,
      maxCenturyCount,
      datedCompanyCount,
      lifespanTopFive,
      maxDuration,
    }
  }, [
    countryCompanies,
    mode,
    isModern,
    historicalCount,
    modernCount,
    country.name,
    currentYear,
  ])

  const handleToggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(nextKey)
      setSortDir('asc')
    }
  }

  const handleDelete = async (company: Company) => {
    const confirmed = await confirm({
      title: '기업 삭제',
      message: `'${company.name}' 기업을 삭제하시겠습니까?`,
      danger: true,
    })
    if (!confirmed) return
    try {
      await companyApi.delete(company.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
        queryClient.invalidateQueries({
          queryKey: ['historical-country-companies'],
        }),
      ])
      notify.success('기업이 삭제되었습니다.')
    } catch {
      notify.error('기업 삭제에 실패했습니다.')
    }
  }

  const hasActiveFilter =
    statusFilter !== 'ALL' ||
    scopeFilter !== 'ALL' ||
    searchQuery.trim().length > 0

  return (
    <Root
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 제목은 위 탭('기업')이 맡는다. 목록이 비면 등록은 빈 화면의 버튼 하나만 */}
      <SectionSubNav
        summary={
          <span>
            기업·상단 <SubNavFigure>{countryCompanies.length.toLocaleString('ko-KR')}</SubNavFigure>곳
          </span>
        }
        actions={
          <HeaderButtons>
            <SecondaryBtn
              type="button"
              onClick={() => setCategoriesOpen(true)}
            >
              <FiTag size={14} />
              업종 카탈로그
            </SecondaryBtn>
            {isLoading || countryCompanies.length === 0 ? null : (
              <AddButton
                type="button"
                onClick={() => setModalTarget('new')}
              >
                <FiPlus size={14} />
                기업 등록
              </AddButton>
            )}
          </HeaderButtons>
        }
      />

      {isLoading ? (
        <ChartSkeleton variant="bars" rows={5} />
      ) : countryCompanies.length === 0 ? (
        <CountryTabEmptyState
          Icon={FiBriefcase}
          title="아직 등록된 기업이 없습니다"
          description={`${country.name}에 설립·소속된 기업이나 시대별 상단·공방·금융기관을 등록하면 존속 기간과 창업자·본사가 정리됩니다.`}
          actionLabel="기업 등록"
          onAction={() => setModalTarget('new')}
          secondaryAction={{
            label: '전체 기업 목록',
            Icon: FiExternalLink,
            onClick: () => navigate(pathKeys.companies.root()),
          }}
          features={[
            { Icon: FiClock, title: '존속 타임라인', description: '설립부터 현재(또는 해산)까지 기간을 막대로' },
            { Icon: FiUser, title: '창업자 · 본사', description: '창업 인물과 본사 도시를 연결' },
            { Icon: FiTag, title: '업종 분류', description: '업종 카탈로그로 산업군을 묶어 비교' },
            { Icon: FiGlobe, title: '국가 간 비교', description: '전체 기업 목록에서 다른 나라 기업과 설립 시기를 비교' },
          ]}
        />
      ) : (
        <>
          <BentoGrid3Col aria-label="기업 요약 인포그래픽">
            {/* Card 1: 존속 상태 도넛 · 시대 소속 */}
            <BentoCard>
              <BentoCardHeader>
                <BentoCardTitleGroup>
                  <BentoCardTitle>존속 상태 · 시대 소속</BentoCardTitle>
                  <BentoCardBadge>
                    총 {stats.total.toLocaleString('ko-KR')}개사
                  </BentoCardBadge>
                </BentoCardTitleGroup>
                {statusFilter !== 'ALL' && (
                  <BentoActionBtn
                    type="button"
                    $accent
                    onClick={() => setStatusFilter('ALL')}
                  >
                    상태 해제 ×
                  </BentoActionBtn>
                )}
              </BentoCardHeader>
              <BentoCardBody>
                <DonutSplitRow>
                  <MiniDonutRing
                    slices={bentoData.statusSlices}
                    size={76}
                    strokeWidth={9.5}
                    centerValue={stats.total.toLocaleString('ko-KR')}
                    centerLabel="전체 기업"
                  />
                  <DonutRightCol>
                    <BentoLegendWrap
                      role="group"
                      aria-label="존속 상태별 필터"
                    >
                      {bentoData.statusItems.map((item) => {
                        const active = statusFilter === item.status
                        return (
                          <BentoLegendChip
                            key={item.status}
                            type="button"
                            $active={active}
                            aria-pressed={active}
                            title={`${item.label} 기업만 필터링`}
                            onClick={() =>
                              setStatusFilter((prev) =>
                                prev === item.status ? 'ALL' : item.status,
                              )
                            }
                          >
                            <BentoSwatchDot $color={item.color} />
                            <span>{item.label}</span>
                            <strong>
                              {item.count.toLocaleString('ko-KR')}
                            </strong>
                          </BentoLegendChip>
                        )
                      })}
                    </BentoLegendWrap>
                    <BentoFootMeta>
                      <span>
                        현존 가동률{' '}
                        <strong>
                          {Math.round((stats.active / stats.total) * 100)}%
                        </strong>
                      </span>
                      {stats.earliestLabel && (
                        <span>
                          최초 설립 <strong>{stats.earliestLabel}</strong>
                        </span>
                      )}
                    </BentoFootMeta>
                  </DonutRightCol>
                </DonutSplitRow>

                {isModern && historicalCount > 0 && (
                  <>
                    <BentoDivider />
                    <BentoSubLabel>
                      <span>시대 소속 구성</span>
                      <span>
                        현대 {modernCount.toLocaleString('ko-KR')} · 전신{' '}
                        {historicalCount.toLocaleString('ko-KR')}
                      </span>
                    </BentoSubLabel>
                    <StackedSegmentBar
                      slices={bentoData.eraSlices}
                      height={8}
                      showPercent
                    />
                  </>
                )}
              </BentoCardBody>
            </BentoCard>

            {/* Card 2: 거점 본사 도시 Top 5 (미설정 시 설립 세기·시대 분포 폴백) */}
            <BentoCard>
              <BentoCardHeader>
                <BentoCardTitleGroup>
                  <BentoCardTitle>
                    {bentoData.hqTopFive.length > 0
                      ? '거점 본사 도시 Top 5'
                      : '설립 세기 · 시대 분포'}
                  </BentoCardTitle>
                  <BentoCardBadge>
                    {bentoData.hqTopFive.length > 0
                      ? `${bentoData.distinctHqCount.toLocaleString('ko-KR')}곳 · 확인 ${bentoData.locatedCount.toLocaleString('ko-KR')}개사`
                      : '본사 미기재 대체'}
                  </BentoCardBadge>
                </BentoCardTitleGroup>
                {bentoData.hqTopFive.some(
                  (row) =>
                    searchQuery.trim().toLowerCase() === row.name.toLowerCase(),
                ) && (
                  <BentoActionBtn
                    type="button"
                    $accent
                    onClick={() => setSearchQuery('')}
                  >
                    검색 해제 ×
                  </BentoActionBtn>
                )}
              </BentoCardHeader>
              <BentoCardBody>
                {bentoData.hqTopFive.length > 0 ? (
                  <>
                    <BentoRankList>
                      {bentoData.hqTopFive.map((row, idx) => {
                        const pct = Math.max(
                          8,
                          Math.round((row.count / bentoData.maxHqCount) * 100),
                        )
                        const isSelected =
                          searchQuery.trim().toLowerCase() ===
                          row.name.toLowerCase()
                        return (
                          <BentoRankBtn
                            key={row.name}
                            type="button"
                            $active={isSelected}
                            aria-pressed={isSelected}
                            title={`${row.name} 소속 기업 검색 연동`}
                            onClick={() =>
                              setSearchQuery((prev) =>
                                prev.trim().toLowerCase() ===
                                row.name.toLowerCase()
                                  ? ''
                                  : row.name,
                              )
                            }
                          >
                            <BentoRankIndex>#{idx + 1}</BentoRankIndex>
                            <BentoRankLabel title={row.name}>
                              {row.name}
                              {row.isPolityFallback && (
                                <BentoInlineSubTag>전신</BentoInlineSubTag>
                              )}
                            </BentoRankLabel>
                            <BentoBarTrack>
                              <BentoBarFill
                                $tone={
                                  row.isPolityFallback
                                    ? mode === 'dark'
                                      ? '#fbbf24'
                                      : '#d97706'
                                    : ledgerAccent(mode)
                                }
                                style={{ width: `${pct}%` }}
                              />
                            </BentoBarTrack>
                            <BentoRankValue>
                              {row.count.toLocaleString('ko-KR')}개사
                            </BentoRankValue>
                          </BentoRankBtn>
                        )
                      })}
                    </BentoRankList>
                    <BentoFootMeta>
                      <span>클릭 시 검색어 연동</span>
                      {stats.total > bentoData.locatedCount && (
                        <span>
                          본사 미기재{' '}
                          <strong>
                            {(
                              stats.total - bentoData.locatedCount
                            ).toLocaleString('ko-KR')}
                            개사
                          </strong>
                        </span>
                      )}
                    </BentoFootMeta>
                  </>
                ) : (
                  <>
                    <BentoRankList>
                      {bentoData.centuryFallbackTopFive.map((bucket, idx) => {
                        const pct = Math.max(
                          8,
                          Math.round(
                            (bucket.count / bentoData.maxCenturyCount) * 100,
                          ),
                        )
                        return (
                          <BentoStaticRow key={bucket.key}>
                            <BentoRankIndex>#{idx + 1}</BentoRankIndex>
                            <BentoRankLabel title={bucket.label}>
                              {bucket.label}
                            </BentoRankLabel>
                            <BentoBarTrack>
                              <BentoBarFill
                                $tone={
                                  bucket.key === 'UNDATED'
                                    ? mode === 'dark'
                                      ? '#94a3b8'
                                      : '#64748b'
                                    : ledgerAccent(mode)
                                }
                                style={{ width: `${pct}%` }}
                              />
                            </BentoBarTrack>
                            <BentoRankValue>
                              {bucket.count.toLocaleString('ko-KR')}개사
                            </BentoRankValue>
                          </BentoStaticRow>
                        )
                      })}
                    </BentoRankList>
                    <BentoFootMeta>
                      <span>본사 도시 등록 시 거점 순위로 자동 전환</span>
                    </BentoFootMeta>
                  </>
                )}
              </BentoCardBody>
            </BentoCard>

            {/* Card 3: 최장수 · 대표 기업 존속 스팬 Top 5 */}
            <BentoCard>
              <BentoCardHeader>
                <BentoCardTitleGroup>
                  <BentoCardTitle>
                    최장수 · 대표 기업 존속 스팬 Top 5
                  </BentoCardTitle>
                  <BentoCardBadge>
                    {bentoData.datedCompanyCount > 0
                      ? `연도 확인 ${bentoData.datedCompanyCount.toLocaleString('ko-KR')}개사`
                      : '설립일 대기'}
                  </BentoCardBadge>
                </BentoCardTitleGroup>
              </BentoCardHeader>
              <BentoCardBody>
                {bentoData.lifespanTopFive.length > 0 ? (
                  <>
                    <BentoRankList>
                      {bentoData.lifespanTopFive.map((row, idx) => {
                        const pct = Math.max(
                          8,
                          Math.round(
                            (row.duration / bentoData.maxDuration) * 100,
                          ),
                        )
                        return (
                          <BentoRankBtn
                            key={row.company.id}
                            type="button"
                            title={`${row.company.name} 상세 페이지로 이동`}
                            onClick={() =>
                              navigate(pathKeys.companies.detail(row.company.id))
                            }
                          >
                            <BentoRankIndex>#{idx + 1}</BentoRankIndex>
                            <BentoRankLabel title={row.company.name}>
                              {row.company.name}
                            </BentoRankLabel>
                            <BentoBarTrack>
                              <BentoBarFill
                                $tone={
                                  row.ongoing
                                    ? ledgerAccent(mode)
                                    : mode === 'dark'
                                      ? '#94a3b8'
                                      : '#64748b'
                                }
                                style={{ width: `${pct}%` }}
                              />
                            </BentoBarTrack>
                            <BentoRankValue>{row.spanLabel}</BentoRankValue>
                          </BentoRankBtn>
                        )
                      })}
                    </BentoRankList>
                    <BentoFootMeta>
                      <span>행 클릭 시 기업 상세 원장 열기</span>
                      {stats.ended > 0 && (
                        <span>
                          해산·합병·종료{' '}
                          <strong>{stats.ended.toLocaleString('ko-KR')}개사</strong>
                        </span>
                      )}
                    </BentoFootMeta>
                  </>
                ) : (
                  <>
                    <BentoRankList>
                      {countryCompanies.slice(0, 5).map((company, idx) => (
                        <BentoRankBtn
                          key={company.id}
                          type="button"
                          title={`${company.name} 정보 수정 모달 열기`}
                          onClick={() => setModalTarget(company.id)}
                        >
                          <BentoRankIndex>#{idx + 1}</BentoRankIndex>
                          <BentoRankLabel title={company.name}>
                            {company.name}
                          </BentoRankLabel>
                          <BentoBarTrack>
                            <BentoBarFill
                              $tone={mode === 'dark' ? '#94a3b8' : '#64748b'}
                              style={{ width: '18%', opacity: 0.45 }}
                            />
                          </BentoBarTrack>
                          <BentoRankValue>설립일 입력 →</BentoRankValue>
                        </BentoRankBtn>
                      ))}
                    </BentoRankList>
                    <BentoFootMeta>
                      <span>설립 연도 입력 시 최장수 존속 스팬 자동 산출</span>
                    </BentoFootMeta>
                  </>
                )}
              </BentoCardBody>
            </BentoCard>
          </BentoGrid3Col>

          <Toolbar>
            <SearchWrap>
              <FiSearch size={14} />
              <SearchInput
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="기업명, 약칭, 창업자, 본사 도시 검색…"
              />
            </SearchWrap>

            <FilterGroup>
              {hasActiveFilter && (
                <>
                  <FilterResultSummary>
                    검색 결과 {filteredCompanies.length}개사
                  </FilterResultSummary>
                  <FilterResetBtn
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL')
                      setScopeFilter('ALL')
                      setSearchQuery('')
                    }}
                  >
                    필터 초기화
                  </FilterResetBtn>
                </>
              )}
              {isModern && historicalCount > 0 && (
                <ChipGroup role="group" aria-label="시대 범위">
                  <FilterChip
                    type="button"
                    $active={scopeFilter === 'ALL'}
                    onClick={() => setScopeFilter('ALL')}
                  >
                    전체 ({countryCompanies.length})
                  </FilterChip>
                  <FilterChip
                    type="button"
                    $active={scopeFilter === 'MODERN'}
                    onClick={() => setScopeFilter('MODERN')}
                  >
                    현대 국가 ({modernCount})
                  </FilterChip>
                  <FilterChip
                    type="button"
                    $active={scopeFilter === 'HISTORICAL'}
                    onClick={() => setScopeFilter('HISTORICAL')}
                  >
                    과거 국가 ({historicalCount})
                  </FilterChip>
                </ChipGroup>
              )}

              <ChipGroup role="group" aria-label="운영 상태 필터">
                <FilterChip
                  type="button"
                  $active={statusFilter === 'ALL'}
                  onClick={() => setStatusFilter('ALL')}
                >
                  상태 전체
                </FilterChip>
                {COMPANY_STATUS_ORDER.map((statusKey) => {
                  const count = countryCompanies.filter(
                    (company) => (company.status ?? 'ACTIVE') === statusKey,
                  ).length
                  if (count === 0) return null
                  return (
                    <FilterChip
                      key={statusKey}
                      type="button"
                      $active={statusFilter === statusKey}
                      onClick={() => setStatusFilter(statusKey)}
                    >
                      {COMPANY_STATUS_META[statusKey].label} ({count})
                    </FilterChip>
                  )
                })}
              </ChipGroup>

              <ChipGroup role="group" aria-label="정렬 기준">
                <FilterChip
                  type="button"
                  $active={sortKey === 'founded'}
                  onClick={() => handleToggleSort('founded')}
                >
                  설립순 {sortKey === 'founded' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </FilterChip>
                <FilterChip
                  type="button"
                  $active={sortKey === 'name'}
                  onClick={() => handleToggleSort('name')}
                >
                  이름순 {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </FilterChip>
              </ChipGroup>
            </FilterGroup>
          </Toolbar>

          {filteredCompanies.length === 0 ? (
            <LoadingBox>조건에 맞는 기업이 없습니다.</LoadingBox>
          ) : (
            <TableCard>
              {axis && (
                <AxisHeader aria-hidden>
                  <AxisTitleCol>기업 · 기본 정보</AxisTitleCol>
                  <AxisTrackCol>
                    {axis.ticks.map((tick) => (
                      <AxisTick
                        key={tick}
                        style={{ left: `${axisPercent(axis, tick)}%` }}
                      >
                        {tick < 0 ? `BC ${Math.abs(tick)}` : tick}
                      </AxisTick>
                    ))}
                    <AxisTick style={{ left: '100%' }}>현재</AxisTick>
                  </AxisTrackCol>
                  <AxisActionCol>존속 기간 · 관리</AxisActionCol>
                </AxisHeader>
              )}

              <CompanyRows>
                {filteredCompanies.map((company) => {
                  const statusMeta =
                    COMPANY_STATUS_META[company.status ?? 'ACTIVE']
                  const startYr = startYearOf(company)
                  const endYr =
                    endYearOf(company) ??
                    (isOngoing(company) ? currentYear : null)
                  const leftPct =
                    axis && startYr != null ? axisPercent(axis, startYr) : 0
                  const rightPct =
                    axis && endYr != null
                      ? axisPercent(axis, endYr)
                      : leftPct + 4
                  const barWidth = Math.max(rightPct - leftPct, 1.5)
                  const logoSrc = getUploadImageUrl(company.logoUrl)
                  const metaParts = [
                    company.shortName,
                    company.headquartersCity?.name &&
                      `본사 ${company.headquartersCity.name}`,
                    company.founder?.name && `창업 ${company.founder.name}`,
                  ].filter(Boolean) as string[]

                  return (
                    <CompanyRow key={company.id}>
                      <IdentityCell
                        type="button"
                        onClick={() =>
                          navigate(pathKeys.companies.detail(company.id))
                        }
                      >
                        <LogoBox aria-hidden>
                          {logoSrc ? (
                            <img src={logoSrc} alt="" />
                          ) : (
                            company.name.trim().slice(0, 1).toUpperCase()
                          )}
                        </LogoBox>
                        <IdentityBody>
                          <NameLine>
                            <CompanyName>{company.name}</CompanyName>
                            <StatusBadge $tone={statusMeta.tone}>
                              {statusMeta.label}
                            </StatusBadge>
                            {isModern &&
                              company.historicalCountry?.name && (
                                <HistoricalBadge>
                                  {company.historicalCountry.name}
                                </HistoricalBadge>
                              )}
                          </NameLine>
                          {metaParts.length > 0 && (
                            <MetaLine>{metaParts.join(' · ')}</MetaLine>
                          )}
                        </IdentityBody>
                      </IdentityCell>

                      <TimelineCell
                        onClick={() =>
                          navigate(pathKeys.companies.detail(company.id))
                        }
                      >
                        {axis && startYr != null ? (
                          <TimelineTrack>
                            <TimelineBar
                              $ongoing={isOngoing(company)}
                              style={{
                                left: `${leftPct}%`,
                                width: `${barWidth}%`,
                              }}
                            />
                          </TimelineTrack>
                        ) : (
                          <TimelineUnknown>연도 미상</TimelineUnknown>
                        )}
                      </TimelineCell>

                      <ActionCell>
                        <PeriodText>{formatPeriodText(company)}</PeriodText>
                        <RowButtons>
                          {company.websiteUrl && (
                            <IconButton
                              as="a"
                              href={company.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="공식 웹사이트"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <FiExternalLink size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            type="button"
                            title="기업 정보 수정"
                            onClick={() => setModalTarget(company.id)}
                          >
                            <FiEdit2 size={14} />
                          </IconButton>
                          <IconButton
                            type="button"
                            $danger
                            title="기업 삭제"
                            onClick={() => {
                              void handleDelete(company)
                            }}
                          >
                            <FiTrash2 size={14} />
                          </IconButton>
                        </RowButtons>
                      </ActionCell>
                    </CompanyRow>
                  )
                })}
              </CompanyRows>
            </TableCard>
          )}
        </>
      )}

      {modalTarget !== null && (
        <CompanyRegisterModal
          isOpen
          onClose={() => {
            setModalTarget(null)
            void queryClient.invalidateQueries({
              queryKey: ['historical-country-companies'],
            })
          }}
          companyId={modalTarget === 'new' ? undefined : modalTarget}
          defaultCountryId={isModern ? country.id : undefined}
          defaultHistoricalCountryId={!isModern ? country.id : undefined}
        />
      )}

      {categoriesOpen && (
        <CompanyCategoryManagerModal
          isOpen={categoriesOpen}
          onClose={() => setCategoriesOpen(false)}
        />
      )}
    </Root>
  )
}

const Root = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 20px;
  ${countryTabCanvasPadding}
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`

const HeaderButtons = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const SecondaryBtn = styled(LedgerToolbarButton)``

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const SearchWrap = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  flex: 1 1 260px;
  max-width: 380px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const FilterResultSummary = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterResetBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ChipGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.active : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TableCard = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const AxisHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(200px, 1.6fr) 210px;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 900px) {
    display: none;
  }
`

const AxisTitleCol = styled.span``

const AxisTrackCol = styled.div`
  position: relative;
  height: 18px;
`

const AxisTick = styled.span`
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AxisActionCol = styled.span`
  text-align: right;
`

const CompanyRows = styled.div`
  display: flex;
  flex-direction: column;
`

const CompanyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(200px, 1.6fr) 210px;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.14s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`

const IdentityCell = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
`

const LogoBox = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const IdentityBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const NameLine = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const CompanyName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StatusBadge = styled.span<{ $tone: string }>`
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `${$tone}18`};
`

const HistoricalBadge = styled.span`
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.15);
`

const MetaLine = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TimelineCell = styled.div`
  cursor: pointer;

  @media (max-width: 900px) {
    display: none;
  }
`

const TimelineTrack = styled.div`
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
  overflow: hidden;
`

const TimelineBar = styled.span<{ $ongoing: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: ${({ $ongoing, theme }) =>
    $ongoing
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
`

const TimelineUnknown = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ActionCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
`

const PeriodText = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const RowButtons = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $danger, theme }) =>
    $danger ? '#ef4444' : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.light};
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
  }
`

const LoadingBox = styled.div`
  padding: 28px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── Event-Ledger Bento Infographic Primitives ───────────────────────────── */

const DonutSplitRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
`

const DonutRightCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const BentoLegendWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const BentoLegendChip = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  box-shadow: none;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  strong {
    font-weight: 700;
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const BentoSwatchDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const BentoRankList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const BentoRankBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: grid;
  grid-template-columns: 22px minmax(78px, 1.1fr) minmax(56px, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 7px;
  margin: 0;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  text-align: left;
  box-shadow: none;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    border-color: ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  }
`

const BentoStaticRow = styled.div`
  display: grid;
  grid-template-columns: 22px minmax(78px, 1.1fr) minmax(56px, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 7px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
`

const BentoRankIndex = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const BentoRankLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const BentoInlineSubTag = styled.span`
  padding: 0 4px;
  border-radius: ${RADIUS.XS};
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.14);
`

const BentoBarTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const BentoBarFill = styled.div<{ $tone: string }>`
  height: 100%;
  border-radius: ${RADIUS.XS};
  background: ${({ $tone }) => $tone};
`

const BentoRankValue = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const BentoFootMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 10px;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`
