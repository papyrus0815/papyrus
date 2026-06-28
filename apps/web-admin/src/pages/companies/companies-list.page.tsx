import React, { useEffect, useMemo, useState } from 'react'

import { motion, useReducedMotion } from 'framer-motion'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiBriefcase,
  FiTag,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiExternalLink,
  FiUser,
  FiCheckCircle,
  FiGitMerge,
  FiGlobe,
  FiList,
  FiColumns,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'

import type { Company, CompanyStatus } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

type StatusMeta = { label: string; color: string; bg: string }

const STATUS_META: Record<CompanyStatus, StatusMeta> = {
  ACTIVE: { label: '활동 중', color: '#16a34a', bg: 'rgba(34, 197, 94, 0.14)' },
  DISSOLVED: { label: '해산', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.12)' },
  MERGED: { label: '합병', color: '#2563eb', bg: 'rgba(59, 130, 246, 0.12)' },
  SUSPENDED: { label: '중단', color: '#d97706', bg: 'rgba(245, 158, 11, 0.14)' },
  OTHER: { label: '기타', color: '#64748b', bg: 'rgba(148, 163, 184, 0.18)' },
}

const STATUS_ORDER: CompanyStatus[] = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'SUSPENDED',
  'OTHER',
]

const getInitial = (company: Company) =>
  (company.shortName?.trim()?.[0] ?? company.name.trim()[0] ?? '·').toUpperCase()

/** 설립 연도 라벨 — BC 음수연도 안전(slice(0,4)는 '-0044'를 '-004'로 깨뜨림). */
const getYear = (iso: string | null): string | null => {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return parts.year < 0 ? `BC ${Math.abs(parts.year)}` : String(parts.year)
}

/** 로고 이미지 — 로드 실패 시 이니셜로 폴백(깨진 이미지 박스 방지). */
const LogoImage: React.FC<{ src: string; fallback: string }> = ({
  src,
  fallback,
}) => {
  const [broken, setBroken] = useState(false)
  if (broken) return <>{fallback}</>
  return <img src={src} alt="" onError={() => setBroken(true)} />
}

type ViewMode = 'list' | 'table'

type SortKey = 'name' | 'status' | 'country' | 'founded'
type SortState = { key: SortKey; dir: 'asc' | 'desc' }

const sortValue = (company: Company, key: SortKey): string | number | null => {
  switch (key) {
    case 'name':
      return company.name
    case 'status':
      return company.status ? STATUS_ORDER.indexOf(company.status) : null
    case 'country':
      return company.country?.name ?? company.historicalCountry?.name ?? null
    case 'founded':
      // BC 안전 숫자 키 — raw ISO 문자열 비교는 음수연도를 사전식으로 오정렬.
      return dateSortKey(company.foundedAt)
  }
}

const PAGE_SIZES = [10, 20, 50] as const

/** 페이지 번호 목록 (양 끝 + 현재 주변, 사이는 말줄임) */
const getPageItems = (current: number, total: number): (number | 'dots')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | 'dots')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) items.push('dots')
  for (let i = left; i <= right; i++) items.push(i)
  if (right < total - 1) items.push('dots')
  items.push(total)
  return items
}

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [list, setList] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [query, setQuery] = useState('') // 입력값(즉시)
  const [search, setSearch] = useState('') // 디바운스된 검색어
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // 같은 컬럼 클릭: 오름차순 → 내림차순 → 해제
  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const load = () => {
    setLoading(true)
    setLoadError(false)
    companyApi
      .getAll()
      .then(setList)
      // 실패를 빈 목록으로 흡수하면 서버 장애가 '등록된 기업 없음'으로 오인된다 — 에러 상태로 분리.
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // 검색어 디바운스 (250ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // ── KPI 통계 ──
  const stats = useMemo(() => {
    const counts: Record<CompanyStatus, number> = {
      ACTIVE: 0,
      DISSOLVED: 0,
      MERGED: 0,
      SUSPENDED: 0,
      OTHER: 0,
    }
    const countries = new Set<string>()
    for (const company of list) {
      if (company.status) counts[company.status] += 1
      const country = company.country?.name ?? company.historicalCountry?.name
      if (country) countries.add(country)
    }
    return {
      total: list.length,
      active: counts.ACTIVE,
      closed: counts.DISSOLVED + counts.MERGED,
      countries: countries.size,
      counts,
    }
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((company) => {
      if (statusFilter !== 'ALL' && company.status !== statusFilter) return false
      if (!q) return true
      return (
        company.name.toLowerCase().includes(q) ||
        (company.shortName?.toLowerCase().includes(q) ?? false) ||
        (company.localName?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [list, search, statusFilter])

  // ── 정렬 (페이지네이션 전에 적용) ──
  const sorted = useMemo(() => {
    if (!sort) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      // 값 없는 항목은 정렬 방향과 무관하게 항상 뒤로
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir
      }
      return String(av).localeCompare(String(bv), 'ko') * dir
    })
  }, [filtered, sort])

  // ── 페이지네이션 ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const paginated = sorted.slice(pageStart, pageStart + pageSize)

  // 검색·필터·정렬·페이지크기 변경 시 첫 페이지로
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, sort, pageSize])

  const handleCreate = () => navigate('/companies/new')
  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/companies/${id}/edit`)
  }
  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingId) return
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `'${name}' 기업을 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    setDeletingId(id)
    try {
      await companyApi.delete(id)
      // 낙관적 제거 — 전체 재조회 대신 목록에서만 빼서 깜빡임을 줄인다.
      setList((prev) => prev.filter((company) => company.id !== id))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const statusFilters: { key: CompanyStatus | 'ALL'; label: string; count: number }[] =
    [
      { key: 'ALL', label: '전체', count: list.length },
      ...STATUS_ORDER.filter((s) => stats.counts[s] > 0).map((s) => ({
        key: s,
        label: STATUS_META[s].label,
        count: stats.counts[s],
      })),
    ]

  const renderSortHeader = (label: string, col: SortKey, hideSm = false) => {
    const Comp = hideSm ? SortHeaderHideSm : SortHeader
    const active = sort?.key === col
    return (
      <Comp
        type="button"
        $active={active}
        onClick={() => toggleSort(col)}
        aria-label={
          active
            ? `${label}, ${sort.dir === 'asc' ? '오름차순' : '내림차순'} 정렬`
            : `${label} 정렬`
        }
      >
        {label}
        {active &&
          (sort.dir === 'asc' ? (
            <FiArrowUp size={12} aria-hidden />
          ) : (
            <FiArrowDown size={12} aria-hidden />
          ))}
      </Comp>
    )
  }

  const renderSkeleton = () => (
    <>
      <StatRow>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard key={i} $accent="#cbd5e1">
            <Skeleton $w="48px" $h="30px" $r="8px" />
            <Skeleton $w="62px" $h="12px" />
          </StatCard>
        ))}
      </StatRow>
      <SkeletonToolbar>
        <Skeleton $w="min(340px, 60%)" $h="40px" $r="12px" />
        <Skeleton $w="180px" $h="36px" $r="999px" />
      </SkeletonToolbar>
      <List>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonItem key={i}>
            <Skeleton $w="46px" $h="46px" $r="12px" />
            <SkeletonStack style={{ flex: 1 }}>
              <Skeleton $w="38%" $h="15px" />
              <Skeleton $w="58%" $h="11px" />
            </SkeletonStack>
            <Skeleton $w="96px" $h="34px" $r="10px" />
          </SkeletonItem>
        ))}
      </List>
    </>
  )

  return (
    <Page>
      <Header>
        <HeaderLeft>
          <TitleBadge>
            <FiBriefcase size={22} />
          </TitleBadge>
          <div>
            <Title>기업 관리</Title>
            <Subtitle>
              기업 마스터 데이터를 등록·관리하고 국가·창립자·조직과 연결합니다.
            </Subtitle>
          </div>
        </HeaderLeft>
        <HeaderActions>
          <Btn onClick={() => navigate('/company-categories')}>
            <FiTag size={16} />
            카테고리 관리
          </Btn>
          <Btn $primary onClick={handleCreate}>
            <FiPlus size={18} />
            기업 추가
          </Btn>
        </HeaderActions>
      </Header>

      <VisuallyHidden role="status" aria-live="polite">
        {loading
          ? '불러오는 중'
          : loadError
            ? '기업을 불러오지 못했습니다'
            : filtered.length === 0
              ? '조건에 맞는 기업이 없습니다'
              : `${filtered.length}개 기업`}
      </VisuallyHidden>

      {loading ? (
        renderSkeleton()
      ) : loadError ? (
        <EmptyBox>
          <EmptyIcon>
            <FiBriefcase size={26} />
          </EmptyIcon>
          <EmptyTitle>기업을 불러오지 못했습니다</EmptyTitle>
          <EmptyDesc>일시적인 오류일 수 있습니다. 다시 시도해 주세요.</EmptyDesc>
          <Btn $primary onClick={load}>
            다시 시도
          </Btn>
        </EmptyBox>
      ) : (
        <>
      <StatRow>
        <StatCard $accent="#6366f1">
          <StatValue>{stats.total.toLocaleString()}</StatValue>
          <StatLabel>
            <StatIcon $accent="#6366f1">
              <FiBriefcase size={13} />
            </StatIcon>
            전체 기업
          </StatLabel>
        </StatCard>
        <StatCard $accent="#16a34a">
          <StatValue>{stats.active.toLocaleString()}</StatValue>
          <StatLabel>
            <StatIcon $accent="#16a34a">
              <FiCheckCircle size={13} />
            </StatIcon>
            활동 중
          </StatLabel>
        </StatCard>
        <StatCard $accent="#64748b">
          <StatValue>{stats.closed.toLocaleString()}</StatValue>
          <StatLabel>
            <StatIcon $accent="#64748b">
              <FiGitMerge size={13} />
            </StatIcon>
            해산 · 합병
          </StatLabel>
        </StatCard>
        <StatCard $accent="#0891b2">
          <StatValue>{stats.countries.toLocaleString()}</StatValue>
          <StatLabel>
            <StatIcon $accent="#0891b2">
              <FiGlobe size={13} />
            </StatIcon>
            등록 국가
          </StatLabel>
        </StatCard>
      </StatRow>

      <Toolbar>
        <SearchWrap>
          <FiSearch size={16} className="lead" />
          <SearchInput
            type="text"
            placeholder="기업명·약칭·원어명 검색..."
            aria-label="기업 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <ClearBtn
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
            >
              <FiX size={14} />
            </ClearBtn>
          )}
        </SearchWrap>
        <FilterChips role="group" aria-label="상태 필터">
          {statusFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              type="button"
              $active={statusFilter === filter.key}
              aria-pressed={statusFilter === filter.key}
              aria-label={`${filter.label} ${filter.count}개`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
              <ChipCount $active={statusFilter === filter.key}>
                {filter.count}
              </ChipCount>
            </FilterChip>
          ))}
        </FilterChips>
        <ViewToggle role="group" aria-label="보기 방식">
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            title="리스트 보기"
            aria-pressed={viewMode === 'list'}
          >
            <FiList size={16} />
          </ViewToggleBtn>
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'table'}
            onClick={() => setViewMode('table')}
            title="테이블 보기"
            aria-pressed={viewMode === 'table'}
          >
            <FiColumns size={16} />
          </ViewToggleBtn>
        </ViewToggle>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyBox>
          <EmptyIcon>
            <FiBriefcase size={26} />
          </EmptyIcon>
          <EmptyTitle>
            {search || statusFilter !== 'ALL'
              ? '조건에 맞는 기업이 없습니다'
              : '아직 등록된 기업이 없습니다'}
          </EmptyTitle>
          <EmptyDesc>
            {search || statusFilter !== 'ALL'
              ? '검색어나 필터를 변경해 보세요.'
              : '첫 기업을 등록해 데이터베이스를 시작하세요.'}
          </EmptyDesc>
          {!search && statusFilter === 'ALL' ? (
            <Btn $primary onClick={handleCreate}>
              <FiPlus size={18} />
              기업 추가
            </Btn>
          ) : (
            <Btn
              onClick={() => {
                setQuery('')
                setSearch('')
                setStatusFilter('ALL')
              }}
            >
              <FiX size={16} />
              필터 초기화
            </Btn>
          )}
        </EmptyBox>
      ) : (
        <>
          <ResultBar>
            <ResultCount>
              <strong>{filtered.length.toLocaleString()}</strong>개 기업
            </ResultCount>
          </ResultBar>
          {viewMode === 'list' ? (
            <EditorialList>
              {paginated.map((company) => {
              const meta = company.status ? STATUS_META[company.status] : null
              const country = company.country?.name ?? company.historicalCountry?.name
              const year = getYear(company.foundedAt)
              return (
                <EditorialItem
                  key={company.id}
                  as={motion.li}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <EdMain>
                    <EdTopRow>
                      <BigName
                        to={`/companies/${company.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {company.name}
                      </BigName>
                      {company.shortName && <EdShort>{company.shortName}</EdShort>}
                    </EdTopRow>
                    <MetaRow>
                      {country && (
                        <MetaItem>
                          <FiMapPin size={13} />
                          {country}
                        </MetaItem>
                      )}
                      {year && (
                        <MetaItem>
                          <FiCalendar size={13} />
                          {year} 설립
                        </MetaItem>
                      )}
                      {company.headquartersCity?.name && (
                        <MetaItem>
                          <FiBriefcase size={13} />
                          {company.headquartersCity.name}
                        </MetaItem>
                      )}
                      {company.founder?.name && (
                        <MetaItem>
                          <FiUser size={13} />
                          {company.founder.name}
                        </MetaItem>
                      )}
                      {company.organization?.name && (
                        <MetaItem>
                          <FiGlobe size={13} />
                          {company.organization.name}
                        </MetaItem>
                      )}
                      {!country &&
                        !year &&
                        !company.headquartersCity?.name &&
                        !company.founder?.name &&
                        !company.organization?.name && <MetaItem>—</MetaItem>}
                    </MetaRow>
                    {company.description && <EdDesc>{company.description}</EdDesc>}
                  </EdMain>
                  <EdRight onClick={(e) => e.stopPropagation()}>
                    {meta && (
                      <StatusBadge $color={meta.color}>{meta.label}</StatusBadge>
                    )}
                    <EdActions>
                      {company.websiteUrl && (
                        <IconLink
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          title="웹사이트 열기"
                          aria-label={`${company.name} 웹사이트 (새 창)`}
                        >
                          <FiExternalLink size={16} />
                        </IconLink>
                      )}
                      <IconBtn
                        type="button"
                        onClick={(ev) => handleEdit(company.id, ev)}
                        title="수정"
                        aria-label="수정"
                      >
                        <FiEdit2 size={16} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        $danger
                        disabled={deletingId === company.id}
                        onClick={(ev) => handleDelete(company.id, company.name, ev)}
                        title="삭제"
                        aria-label="삭제"
                      >
                        <FiTrash2 size={16} />
                      </IconBtn>
                    </EdActions>
                  </EdRight>
                </EditorialItem>
              )
            })}
            </EditorialList>
          ) : (
            <TableCard>
              <TableHead>
                {renderSortHeader('기업', 'name')}
                {renderSortHeader('상태', 'status')}
                {renderSortHeader('국가', 'country', true)}
                {renderSortHeader('설립', 'founded', true)}
                <ThRight>관리</ThRight>
              </TableHead>
              {paginated.map((company) => {
                const meta = company.status ? STATUS_META[company.status] : null
                const country = company.country?.name ?? company.historicalCountry?.name
                const year = getYear(company.foundedAt)
                const initial = getInitial(company)
                return (
                  <TableRow
                    key={company.id}
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <Td>
                      <CellCompany>
                        <ThumbSm $hasLogo={!!company.logoUrl}>
                          {company.logoUrl ? (
                            <LogoImage src={company.logoUrl} fallback={initial} />
                          ) : (
                            initial
                          )}
                        </ThumbSm>
                        <CellCompanyText>
                          <CellName
                            to={`/companies/${company.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {company.name}
                          </CellName>
                          {company.shortName && <CellSub>{company.shortName}</CellSub>}
                        </CellCompanyText>
                      </CellCompany>
                    </Td>
                    <Td>
                      {meta ? (
                        <StatusChip $color={meta.color} $bg={meta.bg}>
                          {meta.label}
                        </StatusChip>
                      ) : (
                        <MutedDash>—</MutedDash>
                      )}
                    </Td>
                    <TdHideSm>{country ?? <MutedDash>—</MutedDash>}</TdHideSm>
                    <TdHideSm>{year ?? <MutedDash>—</MutedDash>}</TdHideSm>
                    <TdRight onClick={(e) => e.stopPropagation()}>
                      <ItemActions>
                        {company.websiteUrl && (
                          <IconLink
                            href={company.websiteUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="웹사이트 열기"
                            aria-label={`${company.name} 웹사이트 (새 창)`}
                          >
                            <FiExternalLink size={15} />
                          </IconLink>
                        )}
                        <IconBtn
                          type="button"
                          onClick={(ev) => handleEdit(company.id, ev)}
                          title="수정"
                          aria-label="수정"
                        >
                          <FiEdit2 size={15} />
                        </IconBtn>
                        <IconBtn
                          type="button"
                          $danger
                          disabled={deletingId === company.id}
                          onClick={(ev) => handleDelete(company.id, company.name, ev)}
                          title="삭제"
                          aria-label="삭제"
                        >
                          <FiTrash2 size={15} />
                        </IconBtn>
                      </ItemActions>
                    </TdRight>
                  </TableRow>
                )
              })}
            </TableCard>
          )}

          {totalPages > 1 && (
            <Pagination as="nav" aria-label="페이지네이션">
              <PageInfo>
                {pageStart + 1}–
                {Math.min(pageStart + pageSize, filtered.length)} / 전체{' '}
                {filtered.length.toLocaleString()}
              </PageInfo>
              <PageControls>
                <PageBtn
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="이전 페이지"
                >
                  <FiChevronLeft size={16} />
                </PageBtn>
                {getPageItems(currentPage, totalPages).map((it, i) =>
                  it === 'dots' ? (
                    <PageDots key={`d${i}`}>…</PageDots>
                  ) : (
                    <PageNum
                      key={it}
                      type="button"
                      $active={it === currentPage}
                      aria-current={it === currentPage ? 'page' : undefined}
                      onClick={() => setPage(it)}
                    >
                      {it}
                    </PageNum>
                  ),
                )}
                <PageBtn
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="다음 페이지"
                >
                  <FiChevronRight size={16} />
                </PageBtn>
              </PageControls>
              <PageSize>
                <span>페이지당</span>
                <select
                  value={pageSize}
                  aria-label="페이지당 항목 수"
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}개
                    </option>
                  ))}
                </select>
              </PageSize>
            </Pagination>
          )}
        </>
      )}
        </>
      )}
    </Page>
  )
}

// ───────────────────────── Styled ─────────────────────────

const Page = styled.div`
  /* companiesRoutes는 ContentLayout이 아니라 <Layout/> 직속이고 전역 body·#root가
     overflow:hidden+100vh라, 페이지 자체를 *내부 스크롤 컨테이너*로 만들어야 헤더
     아래 목록·페이지네이션이 잘리지 않는다(상세·폼 페이지와 동일 패턴). */
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow-y: auto;
  overflow-x: hidden;
  /* 가운데 정렬 캡 제거 — 좌우 전체 폭 사용 */
  padding: 2rem clamp(1.25rem, 2.5vw, 2.5rem) 4rem;
  width: 100%;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
`

const TitleBadge = styled.div`
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 46ch;
`

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

/* ── 미니멀 KPI 스트립 (박스 없이 숫자 + 라벨 + 세로 구분선) ── */
const StatRow = styled.div`
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const StatCard = styled.div<{ $accent: string }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 34px;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    border-left: none;
    padding-left: 2px;
  }

  @media (max-width: 640px) {
    padding: 2px 18px;

    &:first-child {
      padding-left: 2px;
    }
  }
`

const StatIcon = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  color: ${({ $accent }) => $accent};
`

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`

const StatLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 220px;
  max-width: 340px;

  svg.lead {
    position: absolute;
    left: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
`

const ClearBtn = styled.button`
  position: absolute;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6rem 2.25rem 0.6rem 2.25rem;
  border-radius: 12px;
  font-size: 0.875rem;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const FilterChips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
          border: 1px solid
            ${theme.mode === 'dark' ? 'rgba(99,102,241,0.45)' : '#c7d2fe'};
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`

const ChipCount = styled.span<{ $active: boolean }>`
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.3)'
        : 'rgba(99,102,241,0.16)'
      : theme.colors.background.tertiary};
  color: inherit;
`

const ResultBar = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
`

const ResultCount = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatusChip = styled.span<{ $color: string; $bg: string }>`
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 16px;
  margin-top: 9px;
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

/* ── 에디토리얼 빅 타이포 리스트 ── */
const EditorialList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

const EditorialItem = styled.li`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 22px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;

  &:first-child {
    border-top: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const EdMain = styled.div`
  min-width: 0;
  flex: 1;
`

const EdTopRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const BigName = styled(Link)`
  font-size: 1.5rem;
  font-weight: 750;
  letter-spacing: -0.022em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    text-decoration: underline;
  }

  ${EditorialItem}:hover & {
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 640px) {
    font-size: 1.25rem;
  }
`

const EdShort = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EdDesc = styled.p`
  margin: 9px 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 86ch;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EdRight = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
`

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  white-space: nowrap;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

const EdActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.15s, transform 0.15s;

  /* 키보드 포커스(focus-within)에도 노출 — 안 그러면 Tab으로 수정/삭제 버튼에 닿아도
     보이지 않아 WCAG 2.4.7(Focus Visible) 위반(hover만 처리하던 누락 보완). */
  ${EditorialItem}:hover &,
  ${EditorialItem}:focus-within & {
    opacity: 1;
    transform: none;
  }

  @media (hover: none) {
    opacity: 1;
    transform: none;
  }
`

const actionBtnStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  ${actionBtnStyles}
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  ${({ $danger, theme }) =>
    $danger &&
    css`
      &:hover {
        color: ${theme.colors.error};
        border-color: ${theme.colors.alert.danger.border};
        background: ${theme.mode === 'dark'
          ? 'rgba(248,113,113,0.12)'
          : 'rgba(239,68,68,0.06)'};
      }
    `}
`

const IconLink = styled.a`
  ${actionBtnStyles}
`

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.55rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.12s,
    box-shadow 0.18s;

  &:active {
    transform: scale(0.97);
  }

  ${({ theme, $primary }) =>
    $primary
      ? css`
          background: ${theme.colors.gradient.primary};
          color: ${theme.colors.button.text};
          border: none;
          box-shadow: 0 4px 14px ${theme.colors.shadow.md};
          &:hover {
            box-shadow: 0 6px 18px ${theme.colors.shadow.lg};
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 32px;
  text-align: center;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const EmptyIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const EmptyTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`

// ── 스켈레톤 (로딩) ──
const shimmer = keyframes`
  100% { transform: translateX(100%); }
`

const Skeleton = styled.div<{ $w?: string; $h?: string; $r?: string }>`
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '14px'};
  border-radius: ${({ $r }) => $r ?? '6px'};
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
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(255, 255, 255, 0.65)'},
      transparent
    );
    animation: ${shimmer} 1.4s infinite;
  }
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const SkeletonToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const SkeletonItem = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px 14px 18px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

// ── 보기 토글 ──
const ViewToggle = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  margin-left: auto;
`

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 30px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.primary};
          box-shadow: 0 1px 3px ${theme.colors.shadow.sm};
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.tertiary};
          &:hover {
            color: ${theme.colors.text.secondary};
          }
        `}
`

// ── 테이블 뷰 ──
const tableGrid = css`
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) 120px minmax(0, 1.4fr) 90px 130px;
  align-items: center;
  gap: 12px;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr) 110px 130px;
  }
`

const TableCard = styled.div`
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  /* overflow:hidden 은 sticky 헤더를 깨므로 사용하지 않고, 코너는 head/마지막 행에서 처리 */
`

const TableHead = styled.div`
  ${tableGrid}
  position: sticky;
  /* 스크롤 컨테이너가 이제 Page(헤더 아래에서 시작)이므로 top:0이 곧 뷰포트 상단. */
  top: 0;
  z-index: 2;
  padding: 12px 18px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 16px 16px 0 0;
`

const Th = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ThRight = styled(Th)`
  text-align: right;
`

const SortHeader = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
`

const SortHeaderHideSm = styled(SortHeader)`
  @media (max-width: 860px) {
    display: none;
  }
`

const TableRow = styled.div`
  ${tableGrid}
  padding: 12px 18px;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.12s;
  &:last-child {
    border-bottom: none;
    border-radius: 0 0 16px 16px;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Td = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TdHideSm = styled(Td)`
  @media (max-width: 860px) {
    display: none;
  }
`

const TdRight = styled(Td)`
  justify-content: flex-end;
`

const CellCompany = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const ThumbSm = styled.div<{ $hasLogo: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ $hasLogo, theme }) =>
    $hasLogo
      ? theme.colors.background.tertiary
      : theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : '#eef2ff'};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CellCompanyText = styled.div`
  min-width: 0;
`

const CellName = styled(Link)`
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    text-decoration: underline;
  }
`

const CellSub = styled.div`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MutedDash = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ── 페이지네이션 ──
const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 1.25rem;
  flex-wrap: wrap;
`

const PageInfo = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const PageBtn = styled.button`
  ${actionBtnStyles}
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PageNum = styled.button<{ $active: boolean }>`
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
          border: 1px solid
            ${theme.mode === 'dark' ? 'rgba(99,102,241,0.45)' : '#c7d2fe'};
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`

const PageDots = styled.span`
  min-width: 22px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PageSize = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  select {
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.8125rem;
    cursor: pointer;
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
    }
    option {
      background: ${({ theme }) => theme.colors.background.primary};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`
