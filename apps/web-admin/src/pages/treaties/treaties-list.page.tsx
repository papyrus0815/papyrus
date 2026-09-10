/**
 * 조약 카탈로그 — `/treaties`.
 *
 * 조약은 원래 국가 상세의 한 탭에서만 볼 수 있었다. 그러면 "이 나라가 낀 조약"은
 * 물을 수 있어도 "베르사유 조약"을 이름으로 찾거나 "19세기 불평등 조약들"을
 * 가로로 훑을 수가 없다 — 조약을 1급 엔티티로 여는 지면이 여기다.
 *
 * 좌측 목록은 레이아웃(ContentAreaShell)이 소유하므로 여기서는 본문만 그린다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiFileText, FiMapPin, FiSearch, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  TREATY_TYPE_LABELS,
  treatyApi,
  type TreatyDto,
  type TreatyType,
} from '@/shared/api/treaty'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import {
  formatCenturyLabel,
  getCenturyFromIso,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

/** 서명일 라벨 — BC 음수 연도 안전 */
function formatSignDate(signDate: string | null): string {
  const parts = parseIsoDateParts(signDate)
  if (!parts) return '서명일 미상'
  const year =
    parts.year < 0 ? `기원전 ${-parts.year}년` : `${parts.year}년`
  return `${year} ${parts.month}월 ${parts.day}일`
}

/** 서명국 이름 목록 — 현대·역사 국가를 한 축으로 편다 */
function signatoryNames(treaty: TreatyDto): string[] {
  return treaty.signatories
    .map(
      (signatory) =>
        signatory.country?.name ?? signatory.historicalCountry?.name ?? null,
    )
    .filter((name): name is string => !!name)
}

type SortKey = 'recent' | 'oldest' | 'name'

const SORT_LABELS: Record<SortKey, string> = {
  recent: '최근 서명순',
  oldest: '오래된 서명순',
  name: '이름순',
}

export function TreatiesListPage() {
  useDocumentTitle('조약')
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    /* 좌측 사이드바와 같은 키 — 같은 응답을 두 번 받지 않는다 */
    queryKey: ['treaties', 'all'],
    queryFn: () => treatyApi.getAll(),
    staleTime: 60_000,
  })

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TreatyType | ''>('')
  const [sort, setSort] = useState<SortKey>('recent')

  const all = useMemo(() => data?.items ?? [], [data])

  /** 유형 칩은 실제로 존재하는 유형만 — 비어 있는 칩은 막다른 길이다 */
  const typeCounts = useMemo(() => {
    const counts = new Map<TreatyType, number>()
    for (const treaty of all) {
      counts.set(treaty.type, (counts.get(treaty.type) ?? 0) + 1)
    }
    return counts
  }, [all])

  const groups = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    const filtered = all.filter((treaty) => {
      if (typeFilter && treaty.type !== typeFilter) return false
      if (!lowered) return true
      const haystack = [
        treaty.name,
        treaty.alias,
        treaty.location,
        ...signatoryNames(treaty),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(lowered)
    })

    const yearOf = (treaty: TreatyDto) =>
      parseIsoDateParts(treaty.signDate)?.year ?? Number.NEGATIVE_INFINITY

    const sorted = [...filtered].sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name, 'ko')
      const diff = yearOf(right) - yearOf(left)
      return sort === 'recent' ? diff : -diff
    })

    if (sort === 'name') {
      return [{ key: 'all', label: null, treaties: sorted }]
    }

    /* 세기 헤딩으로 묶어 시대감을 준다 — 이름순일 땐 축이 다르므로 묶지 않는다 */
    const buckets = new Map<string, { label: string; treaties: TreatyDto[] }>()
    for (const treaty of sorted) {
      const century = getCenturyFromIso(treaty.signDate)
      const key = century === null ? '__undated__' : String(century)
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: century === null ? '서명일 미상' : formatCenturyLabel(century),
          treaties: [],
        })
      }
      buckets.get(key)!.treaties.push(treaty)
    }
    return [...buckets.entries()].map(([key, bucket]) => ({
      key,
      label: bucket.label,
      treaties: bucket.treaties,
    }))
  }, [all, query, typeFilter, sort])

  const shownCount = groups.reduce(
    (sum, group) => sum + group.treaties.length,
    0,
  )
  const hasFilter = !!query.trim() || !!typeFilter

  return (
    <Page>
      <Head>
        <div>
          <PageTitle>조약 · 협정</PageTitle>
          <PageSub>
            국가가 맺은 조약을 한자리에서 — 유형·세기로 좁히고 이름·서명국으로
            찾습니다.
          </PageSub>
        </div>
        <CountBadge>
          {hasFilter ? `${shownCount} / ${all.length}` : all.length}건
        </CountBadge>
      </Head>

      <Toolbar>
        <SearchBox>
          <FiSearch size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="조약명 · 별칭 · 서명국 · 장소"
            aria-label="조약 검색"
          />
        </SearchBox>
        <SortSelect
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label="정렬"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </SortSelect>
      </Toolbar>

      <ChipRow>
        <Chip $active={typeFilter === ''} onClick={() => setTypeFilter('')}>
          전체
        </Chip>
        {(Object.keys(TREATY_TYPE_LABELS) as TreatyType[])
          .filter((type) => typeCounts.has(type))
          .map((type) => (
            <Chip
              key={type}
              $active={typeFilter === type}
              onClick={() =>
                setTypeFilter((current) => (current === type ? '' : type))
              }
            >
              {TREATY_TYPE_LABELS[type]}
              <ChipCount>{typeCounts.get(type)}</ChipCount>
            </Chip>
          ))}
      </ChipRow>

      {isLoading ? (
        <Notice>불러오는 중…</Notice>
      ) : isError ? (
        <Notice>
          목록을 불러오지 못했습니다.{' '}
          <RetryButton onClick={() => void refetch()}>다시 시도</RetryButton>
        </Notice>
      ) : shownCount === 0 ? (
        <Notice>
          {all.length === 0
            ? '아직 등록된 조약이 없습니다. 국가 상세의 「조약」 탭에서 등록할 수 있습니다.'
            : '조건에 맞는 조약이 없습니다.'}
          {hasFilter && (
            <>
              {' '}
              <RetryButton
                onClick={() => {
                  setQuery('')
                  setTypeFilter('')
                }}
              >
                필터 초기화
              </RetryButton>
            </>
          )}
        </Notice>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            {group.label && <GroupHeading>{group.label}</GroupHeading>}
            <Grid>
              {group.treaties.map((treaty) => {
                const parties = signatoryNames(treaty)
                const thumb =
                  treaty.images.find((image) => image.isPrimary)?.imageUrl ??
                  treaty.images[0]?.imageUrl
                return (
                  <Card
                    key={treaty.id}
                    onClick={() => navigate(pathKeys.treaties.detail(treaty.id))}
                  >
                    <Thumb>
                      {thumb ? (
                        <img src={thumb} alt="" />
                      ) : (
                        <FiFileText size={18} />
                      )}
                    </Thumb>
                    <CardBody>
                      <CardTitle>{treaty.name}</CardTitle>
                      {treaty.alias && <CardAlias>{treaty.alias}</CardAlias>}
                      <TypeTag>
                        {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
                      </TypeTag>
                      <MetaRow>{formatSignDate(treaty.signDate)}</MetaRow>
                      {parties.length > 0 && (
                        <MetaRow>
                          <FiUsers size={12} />
                          {parties.slice(0, 3).join(' · ')}
                          {parties.length > 3 && ` 외 ${parties.length - 3}`}
                        </MetaRow>
                      )}
                      {treaty.location && (
                        <MetaRow>
                          <FiMapPin size={12} />
                          {treaty.location}
                        </MetaRow>
                      )}
                      {treaty.violationDate && (
                        <BrokenTag>파기 · 종료</BrokenTag>
                      )}
                    </CardBody>
                  </Card>
                )
              })}
            </Grid>
          </section>
        ))
      )}
    </Page>
  )
}

export default TreatiesListPage

// ──────────────────────────────────────────────
// styled
// ──────────────────────────────────────────────

const Page = styled.div`
  padding: 24px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
`

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#111827')};
`

const PageSub = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
`

const CountBadge = styled.span`
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#374151')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`

const SearchBox = styled.label`
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : 'rgba(15,23,42,0.12)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#181818' : '#fff')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#111827')};
  }
`

const SortSelect = styled.select`
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : 'rgba(15,23,42,0.12)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#181818' : '#fff')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#111827')};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? '#3b82f6' : theme.mode === 'dark' ? '#2a2a2a' : 'rgba(15,23,42,0.12)'};
  background: ${({ theme, $active }) =>
    $active
      ? 'rgba(59,130,246,0.14)'
      : theme.mode === 'dark'
        ? '#181818'
        : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? '#3b82f6' : theme.mode === 'dark' ? '#d1d5db' : '#374151'};
`

const ChipCount = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
`

const GroupHeading = styled.h2`
  margin: 18px 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
`

const Card = styled.button`
  display: flex;
  gap: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : 'rgba(15,23,42,0.1)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#181818' : '#fff')};
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;

  &:hover {
    border-color: #3b82f6;
    transform: translateY(-1px);
  }
`

const Thumb = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CardBody = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#111827')};
`

const CardAlias = styled.div`
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
`

const TypeTag = styled.span`
  align-self: flex-start;
  margin: 2px 0;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
`

const BrokenTag = styled.span`
  align-self: flex-start;
  margin-top: 3px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.12);
`

const Notice = styled.div`
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
`

const RetryButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  color: #3b82f6;
  text-decoration: underline;
`
