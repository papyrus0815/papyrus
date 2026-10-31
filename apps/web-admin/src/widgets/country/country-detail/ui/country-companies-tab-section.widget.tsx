import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FiEdit2,
  FiExternalLink,
  FiPlus,
  FiSearch,
  FiTag,
  FiTrash2,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  companyApi,
  type Company,
  type CompanyStatus,
} from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import { notify } from '@/shared/ui/toast'
import {
  COMPANY_STATUS_META,
  COMPANY_STATUS_ORDER,
  CompanyCategoryManagerModal,
  CompanyRegisterModal,
} from '@/widgets/company-form'

import { SectionEmpty } from './dashboard-panels/section-empty'

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
      await queryClient.invalidateQueries({ queryKey: ['companies'] })
      notify.success('기업이 삭제되었습니다.')
    } catch {
      notify.error('기업 삭제에 실패했습니다.')
    }
  }

  return (
    <Root
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <SectionTabHeader
        variant="plain"
        title="기업"
        description={`${country.name}에 설립·소속된 기업의 존속 기간, 창업자, 본사 도시 및 이력을 관리합니다.`}
        rightSlot={
          <HeaderButtons>
            <SecondaryBtn
              type="button"
              onClick={() => setCategoriesOpen(true)}
            >
              <FiTag size={14} />
              업종 카탈로그
            </SecondaryBtn>
            <AddButton
              type="button"
              onClick={() => setModalTarget('new')}
            >
              <FiPlus size={14} />
              기업 등록
            </AddButton>
          </HeaderButtons>
        }
      />

      {countryCompanies.length > 0 && (
        <SummaryStrip aria-label="기업 요약 지표">
          <SummaryCell>
            <SummaryLabel>등록 기업</SummaryLabel>
            <SummaryValue>{stats.total}개</SummaryValue>
          </SummaryCell>
          <SummaryCell>
            <SummaryLabel>활동 중</SummaryLabel>
            <SummaryValue>{stats.active}개</SummaryValue>
          </SummaryCell>
          <SummaryCell>
            <SummaryLabel>해산 · 합병 · 중단</SummaryLabel>
            <SummaryValue>{stats.ended}개</SummaryValue>
          </SummaryCell>
          {stats.earliestLabel && (
            <SummaryCell>
              <SummaryLabel>최초 설립 기록</SummaryLabel>
              <SummaryValue>{stats.earliestLabel}</SummaryValue>
            </SummaryCell>
          )}
        </SummaryStrip>
      )}

      {isLoading ? (
        <LoadingBox>기업 목록을 불러오는 중…</LoadingBox>
      ) : countryCompanies.length === 0 ? (
        <SectionEmpty
          text={`${country.name}에 등록된 기업이 아직 없습니다. 기업을 등록하면 설립 연도부터 현재까지의 존속 타임라인과 창업자·본사 정보가 여기에 정리됩니다.`}
          actionLabel="첫 기업 등록"
          onAction={() => setModalTarget('new')}
          secondaryLabel="전체 국가 기업 목록 보기"
          onSecondary={() => navigate(pathKeys.companies.root())}
        />
      ) : (
        <>
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
          onClose={() => setModalTarget(null)}
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
  gap: 24px;
  padding: 36px 32px 48px;
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 24px 20px 36px;
  }
`

const HeaderButtons = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const SummaryStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: max-content;
  max-width: 100%;
  gap: 1px;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.border.light};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SummaryCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 140px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const SummaryLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SummaryValue = styled.span`
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

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
  min-width: 260px;
  flex: 1 1 280px;
  max-width: 420px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ChipGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 5px 10px;
  border-radius: 999px;
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
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  overflow: hidden;
`

const AxisHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(200px, 1.6fr) 210px;
  align-items: center;
  gap: 16px;
  padding: 10px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
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
  padding: 12px 18px;
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
  border-radius: 10px;
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
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `${$tone}18`};
`

const HistoricalBadge = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
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
  background: ${({ $ongoing }) => ($ongoing ? '#4f46e5' : '#64748b')};
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
  padding: 48px 24px;
  text-align: center;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
