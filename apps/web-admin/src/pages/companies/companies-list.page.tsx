/**
 * 기업 목록 — 사건 목록(`/events`)의 지면 문법을 따른다.
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
import { Link, useNavigate } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'

import type { Company, CompanyStatus } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { companyLifespanLabel } from '@/shared/lib/company-lifespan'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import {
  COMPANY_STATUS_META,
  COMPANY_STATUS_ORDER,
  CompanyRegisterModal,
} from '@/widgets/company-form'

const COMPANIES_QUERY_KEY = ['companies', 'all'] as const

type SortKey = 'name' | 'country' | 'founded' | 'founder' | 'city' | 'status'
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

/** 존속 기간 — '1600 – 1874' · 활동 중이면 '1600 –' · 설립 미상이면 null */
const periodLabel = (company: Company): string | null => {
  const start = yearLabel(company.foundedAt)
  const end = yearLabel(company.dissolvedAt)
  if (!start && !end) return null
  return `${start ?? '?'} – ${end ?? ''}`.trimEnd()
}

const sortValue = (company: Company, key: SortKey): string | number | null => {
  switch (key) {
    case 'name':
      return company.name
    case 'country':
      return countryName(company)
    case 'founded':
      // BC 안전 숫자 키 — raw ISO 문자열 비교는 음수연도를 사전식으로 오정렬.
      return dateSortKey(company.foundedAt)
    case 'founder':
      return company.founder?.name ?? null
    case 'city':
      return company.headquartersCity?.name ?? null
    case 'status':
      return company.status ? COMPANY_STATUS_ORDER.indexOf(company.status) : null
  }
}

const COLUMNS: { key: SortKey; label: string; hideBelow?: number }[] = [
  { key: 'name', label: '기업' },
  { key: 'country', label: '국가', hideBelow: 640 },
  { key: 'founded', label: '존속' },
  { key: 'founder', label: '창립자', hideBelow: 960 },
  { key: 'city', label: '본사', hideBelow: 1120 },
  { key: 'status', label: '상태', hideBelow: 520 },
]

/** 로고 — 로드 실패 시 이니셜로 폴백(깨진 이미지 박스 방지). */
const CompanyMark: React.FC<{ company: Company }> = ({ company }) => {
  const src = getUploadImageUrl(company.logoUrl)
  const [broken, setBroken] = useState(false)
  // 이름에서 딴다 — 약칭은 '000660' 같은 종목코드라 이니셜로 쓰면 '0'이 된다
  const initial = (company.name.trim()[0] ?? '·').toUpperCase()
  const showLogo = !!src && !broken
  return (
    <Mark $hasLogo={showLogo} aria-hidden>
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
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'ALL'>('ALL')
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  /** 등록·수정 모달 — null=닫힘, 'new'=신규, 그 외=수정 대상 id */
  const [modalTarget, setModalTarget] = useState<string | null>(null)

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

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = list.filter((company) => {
      if (statusFilter !== 'ALL' && company.status !== statusFilter) return false
      if (!needle) return true
      return [
        company.name,
        company.shortName,
        company.localName,
        countryName(company),
        company.founder?.name,
      ].some((value) => value?.toLowerCase().includes(needle))
    })
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
  }, [list, search, statusFilter, sort])

  const isFiltered = !!search.trim() || statusFilter !== 'ALL'

  const resetFilters = () => {
    setQuery('')
    setSearch('')
    setStatusFilter('ALL')
  }

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

  const statusFilters: { key: CompanyStatus | 'ALL'; label: string; count: number }[] =
    [
      { key: 'ALL', label: '전체', count: list.length },
      ...COMPANY_STATUS_ORDER.filter((status) => statusCounts[status] > 0).map(
        (status) => ({
          key: status,
          label: COMPANY_STATUS_META[status].label,
          count: statusCounts[status],
        }),
      ),
    ]

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
          {COLUMNS.slice(1).map((column) => (
            <Cell key={column.key} $hideBelow={column.hideBelow}>
              <Skeleton $w="60%" $h="11px" />
            </Cell>
          ))}
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
              ? '검색어나 상태 필터를 바꿔 보세요.'
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
    return rows.map((company) => {
      const meta = company.status ? COMPANY_STATUS_META[company.status] : null
      const detailPath = pathKeys.companies.detail(company.id)
      const period = periodLabel(company)
      const lifespan = companyLifespanLabel(company)
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
            <CompanyMark company={company} />
            <NameText>
              <NameLine>
                <NameLink to={detailPath}>{company.name}</NameLink>
                {subName && <SubName>{subName}</SubName>}
              </NameLine>
              {company.description && (
                <Description title={company.description}>
                  {company.description}
                </Description>
              )}
            </NameText>
          </NameCell>
          <Cell role="cell" $hideBelow={640}>
            {company.country?.name ?? company.historicalCountry?.name ?? <Muted>—</Muted>}
            {!company.country && company.historicalCountry && (
              <SubValue as="div">역사 국가</SubValue>
            )}
          </Cell>
          <Cell role="cell" $numeric>
            {period ? (
              <Stack>
                <span>{period}</span>
                {lifespan && <SubValue>{lifespan}</SubValue>}
              </Stack>
            ) : (
              <Muted>—</Muted>
            )}
          </Cell>
          <Cell role="cell" $hideBelow={960}>
            {company.founder?.name ?? <Muted>—</Muted>}
          </Cell>
          <Cell role="cell" $hideBelow={1120}>
            {company.headquartersCity?.name ?? <Muted>—</Muted>}
          </Cell>
          <Cell role="cell" $hideBelow={520}>
            {meta ? <StatusDot $tone={meta.tone}>{meta.label}</StatusDot> : <Muted>—</Muted>}
          </Cell>
          <ActionsCell role="cell">
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
        </Row>
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
              <strong>{rows.length.toLocaleString()}</strong>개
              {isFiltered ? (
                <StatsHint>/ 등록 전체 {list.length.toLocaleString()}개</StatsHint>
              ) : (
                <StatsHint>
                  · 활동 중 {statusCounts.ACTIVE.toLocaleString()} · 국가{' '}
                  {countryCount.toLocaleString()}
                </StatsHint>
              )}
            </Stats>
          )}
        </HeaderTitle>
        <HeaderActions>
          <GhostBtn type="button" onClick={() => navigate('/company-categories')}>
            <FiTag size={14} />
            카테고리 관리
          </GhostBtn>
          <PrimaryBtn type="button" onClick={() => setModalTarget('new')}>
            <FiPlus size={15} />
            기업 추가
          </PrimaryBtn>
        </HeaderActions>
      </Header>

      <Toolbar>
        <SearchWrap>
          <FiSearch size={14} className="lead" aria-hidden />
          <SearchInput
            type="search"
            placeholder="기업명·약칭·원어명·국가·창립자"
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
        <Segment role="group" aria-label="상태 필터">
          {statusFilters.map((filter) => (
            <SegmentBtn
              key={filter.key}
              type="button"
              $active={statusFilter === filter.key}
              aria-pressed={statusFilter === filter.key}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.key !== 'ALL' && (
                <Dot $tone={COMPANY_STATUS_META[filter.key].tone} aria-hidden />
              )}
              {filter.label}
              <SegmentCount>{filter.count}</SegmentCount>
            </SegmentBtn>
          ))}
        </Segment>
      </Toolbar>

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
            {COLUMNS.map((column) => {
              const active = sort.key === column.key
              return (
                <HeadCell
                  key={column.key}
                  role="columnheader"
                  aria-sort={
                    active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  $hideBelow={column.hideBelow}
                  $first={column.key === 'name'}
                >
                  <SortBtn
                    type="button"
                    $active={active}
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
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
            {/* 관리 열은 행 위에 떠 있는 오버레이라 격자 트랙이 없다 — 머리글도 보조기기용만 */}
            <VisuallyHidden role="columnheader">관리</VisuallyHidden>
          </HeadRow>
          <div role="rowgroup">{renderBody()}</div>
        </Table>
      </TableWrap>

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
 * 열 사다리 — 이름 열이 남는 폭을 흡수하고 나머지는 고정. 좁아지면 뒤 열부터 접는다.
 * ⚠️ 접힌 셀은 display:none이라 자동 배치에서 빠진다 → 트랙 수도 **같은 임계에서 같이**
 *    줄여야 한다(0폭 트랙으로 남기면 다음 셀이 그 트랙으로 밀려 들어간다).
 *    임계는 COLUMNS[].hideBelow와 한 쌍이다.
 */
const rowGrid = css`
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) minmax(96px, 150px) 112px minmax(96px, 150px)
    minmax(88px, 130px) 76px;
  align-items: center;
  column-gap: 16px;

  @container companies (max-width: 1120px) {
    grid-template-columns: minmax(0, 1fr) minmax(96px, 150px) 112px minmax(96px, 150px) 76px;
  }
  @container companies (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr) minmax(96px, 150px) 112px 76px;
  }
  @container companies (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr) 96px 72px;
    column-gap: 10px;
  }
  @container companies (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) 88px;
  }
`

const hideBelow = (width?: number) =>
  width
    ? css`
        @container companies (max-width: ${width}px) {
          display: none;
        }
      `
    : ''

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

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 240px;
  max-width: 360px;

  svg.lead {
    position: absolute;
    left: 10px;
    color: ${metaText};
    pointer-events: none;
  }
`

const SearchInput = styled.input`
  width: 100%;
  height: 34px;
  box-sizing: border-box;
  padding: 0 30px 0 30px;
  border-radius: 8px;
  font-size: 13px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(203, 213, 225, 0.6)'};
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

const SegmentCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
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

const HeadCell = styled.div<{ $hideBelow?: number; $first?: boolean }>`
  min-width: 0;
  overflow: hidden;
  /* 이름 열 머리글은 로고 폭(28)+간격(10)만큼 들여 행의 글자 시작선에 맞춘다 */
  padding-left: ${({ $first }) => ($first ? '38px' : '0')};
  ${({ $hideBelow }) => hideBelow($hideBelow)}
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

const Row = styled.div`
  ${rowGrid}
  position: relative;
  min-height: 56px;
  padding: 8px 8px;
  border-bottom: 1px solid ${rowHairline};
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: ${rowHover};
  }
`

const Cell = styled.div<{ $hideBelow?: number; $numeric?: boolean }>`
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
  ${({ $hideBelow }) => hideBelow($hideBelow)}
`

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const Mark = styled.span<{ $hasLogo: boolean }>`
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ $hasLogo, theme }) =>
    $hasLogo
      ? theme.colors.background.tertiary
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : '#eef2ff'};

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

const StatusDot = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
  }
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
  right: 8px;
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
