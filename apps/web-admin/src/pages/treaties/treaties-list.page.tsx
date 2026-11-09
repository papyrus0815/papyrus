/**
 * 조약 카탈로그 — `/treaties`.
 *
 * 조약은 원래 국가 상세의 한 탭에서만 볼 수 있었다. 그러면 "이 나라가 낀 조약"은
 * 물을 수 있어도 "베르사유 조약"을 이름으로 찾거나 "19세기 불평등 조약들"을
 * 가로로 훑을 수가 없다 — 조약을 1급 엔티티로 여는 지면이 여기다.
 *
 * 지면 문법은 **사건 목록(/events)과 같다**(2026-11-05 '사건 페이지 참조해서 디자인 개선'):
 * 상단 툴바 한 줄 → 열 머리글(정렬은 머리글 클릭) → 세기 장(章) 표지(축 위 큰 구슬 +
 * 리더 룰) → 한 줄 행(축 위 작은 구슬). 예전의 카드 격자는 카드마다 정보 배치가
 * 들쭉날쭉해(서명국이 1~3줄로 접힘) 서명일·서명국을 세로로 견줘 읽을 수 없었다.
 *
 * ⚠️ 연(年) 머리글은 두지 않는다 — 조약 20건이 거의 모두 서로 다른 해라, 사건 목록에서
 *    이미 문제로 확인된 '행 1개짜리 연 머리글'만 잔뜩 생긴다. 연도는 서명일 열이 말한다.
 *
 * 좌측 목록은 레이아웃(ContentAreaShell)이 소유하므로 여기서는 본문만 그린다.
 */
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import {
  TREATY_TYPE_LABELS,
  treatyApi,
  treatyTypeTone,
  type TreatyDto,
  type TreatyType,
} from '@/shared/api/treaty'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import {
  formatCenturyLabel,
  getCenturyFromIso,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import {
  parseTreatyListState,
  serializeTreatyListState,
  type TreatyListReturnState,
  type TreatyListState,
  type TreatySortKey,
} from '@/shared/lib/treaty-list-state'
import { pathKeys } from '@/shared/router'
import {
  TreatyCreateModal,
  TreatySectionThemeProvider,
} from '@/widgets/country/country-detail/ui/treaty-section.widget'

const UNDATED = '__undated__'

/** 연도 라벨 — BC 음수 연도 안전. 표기는 상세와 같은 '기원전 N' */
function yearLabel(year: number): string {
  return year < 0 ? `기원전 ${-year}` : String(year)
}

interface Party {
  key: string
  name: string
  flag: string | null
}

/** 서명국 — 현대·역사 국가를 한 축으로 편다 */
function partiesOf(treaty: TreatyDto): Party[] {
  return treaty.signatories
    .map((signatory) => {
      const name =
        signatory.country?.name ?? signatory.historicalCountry?.name ?? null
      if (!name) return null
      return {
        key: signatory.id,
        name,
        flag: signatory.country?.flagEmoji ?? null,
      }
    })
    .filter((party): party is Party => !!party)
}

/** 세기 범위 '(1901–2000)' — 사건 목록 세기 머리글과 같은 꼬리 */
function centuryRange(century: number): string {
  if (century > 0) return `${(century - 1) * 100 + 1}–${century * 100}`
  const end = (-century - 1) * 100 + 1
  return `기원전 ${-century * 100}–${end}`
}

type SortKey = TreatySortKey

/** 행 끝 상태 — 파기가 만료보다 강한 사실이다. 둘 다 없으면 비워 둔다(유효라고 단정하지 않는다). */
function statusOf(
  treaty: TreatyDto,
): { tone: 'broken' | 'expired'; label: string } | null {
  const broken = parseIsoDateParts(treaty.violationDate)
  if (broken) return { tone: 'broken', label: `파기 ${yearLabel(broken.year)}` }
  const expired = parseIsoDateParts(treaty.expiryDate)
  if (expired) return { tone: 'expired', label: `만료 ${yearLabel(expired.year)}` }
  return null
}

export function TreatiesListPage() {
  useDocumentTitle('조약')
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    /* 좌측 사이드바와 같은 키 — 같은 응답을 두 번 받지 않는다 */
    queryKey: ['treaties', 'all'],
    queryFn: () => treatyApi.getAll(),
    staleTime: 60_000,
  })

  /* 검색·유형·정렬의 정본은 URL — 상세에 갔다 '목록'으로 돌아와도, 새로고침해도 그대로다 */
  const [searchParams, setSearchParams] = useSearchParams()
  const listState = useMemo(
    () => parseTreatyListState(searchParams),
    [searchParams],
  )
  const { query, type: typeFilter, sort } = listState
  const patchListState = (patch: Partial<TreatyListState>) =>
    setSearchParams(serializeTreatyListState({ ...listState, ...patch }), {
      replace: true,
    })
  const setQuery = (next: string) => patchListState({ query: next })
  const setTypeFilter = (next: TreatyType | '') => patchListState({ type: next })
  const setSort = (next: SortKey) => patchListState({ sort: next })
  const returnState: TreatyListReturnState = {
    treatyListSearch: location.search,
  }

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)

  const all = useMemo(() => data?.items ?? [], [data])

  /** 유형 필터는 실제로 존재하는 유형만 — 비어 있는 칸은 막다른 길이다 */
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
        ...partiesOf(treaty).map((party) => party.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(lowered)
    })

    /* 연·월·일 전부로 비교 — 같은 해(1905년 2건)의 순서가 입력 순서에 맡겨지지 않게 */
    const dateKey = (treaty: TreatyDto) => {
      const parts = parseIsoDateParts(treaty.signDate)
      if (!parts) return Number.NEGATIVE_INFINITY
      return parts.year * 10_000 + parts.month * 100 + parts.day
    }

    const sorted = [...filtered].sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name, 'ko')
      const diff = dateKey(right) - dateKey(left)
      if (diff !== 0) return sort === 'date-desc' ? diff : -diff
      return left.name.localeCompare(right.name, 'ko')
    })

    if (sort === 'name') {
      return [{ key: 'all', century: null as number | null, treaties: sorted }]
    }

    /* 세기 장으로 묶어 시대감을 준다 — 이름순일 땐 축이 다르므로 묶지 않는다 */
    const buckets = new Map<string, { century: number | null; treaties: TreatyDto[] }>()
    for (const treaty of sorted) {
      const century = getCenturyFromIso(treaty.signDate)
      const key = century === null ? UNDATED : String(century)
      if (!buckets.has(key)) buckets.set(key, { century, treaties: [] })
      buckets.get(key)!.treaties.push(treaty)
    }
    return [...buckets.entries()].map(([key, bucket]) => ({ key, ...bucket }))
  }, [all, query, typeFilter, sort])

  const shownCount = groups.reduce(
    (sum, group) => sum + group.treaties.length,
    0,
  )
  const hasFilter = !!query.trim() || !!typeFilter

  const clearFilters = () => patchListState({ query: '', type: '' })

  const toggleGroup = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Page>
      <Toolbar>
        <SearchBox>
          <FiSearch size={16} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="조약명 · 별칭 · 서명국 · 장소 검색"
            aria-label="조약 검색"
          />
          {query && (
            <ClearButton
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
            >
              <FiX size={13} />
            </ClearButton>
          )}
        </SearchBox>

        <FilterGroup role="group" aria-label="조약 유형">
          <FilterButton
            type="button"
            $active={typeFilter === ''}
            aria-pressed={typeFilter === ''}
            onClick={() => setTypeFilter('')}
          >
            전체
            <FilterCount>{all.length}</FilterCount>
          </FilterButton>
          {(Object.keys(TREATY_TYPE_LABELS) as TreatyType[])
            .filter((type) => typeCounts.has(type))
            .map((type) => (
              <FilterButton
                key={type}
                type="button"
                $active={typeFilter === type}
                $type={type}
                aria-pressed={typeFilter === type}
                onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              >
                <TypeDot $type={type} aria-hidden />
                {TREATY_TYPE_LABELS[type]}
                <FilterCount>{typeCounts.get(type)}</FilterCount>
              </FilterButton>
            ))}
        </FilterGroup>

        {hasFilter && (
          <ResetButton type="button" onClick={clearFilters}>
            필터 초기화
          </ResetButton>
        )}

        <CreateButton type="button" onClick={() => setCreateOpen(true)}>
          <FiPlus size={15} aria-hidden />
          조약 등록
        </CreateButton>
      </Toolbar>

      <Catalog>
        {/*
          열 머리글은 표 구조(role=table/row)를 흉내 내지 않는다 — 행은 링크 한 덩어리라
          낭독기는 행 글자를 그대로 읽는다. 예전엔 버튼에 role=columnheader를 씌워 버튼 의미가
          지워졌고 role=row는 table 없이 떠 있었다. 정렬 버튼은 버튼으로, 상태는 라벨로 말한다.
        */}
        <ColumnHeader>
          <HeaderCell
            as="button"
            type="button"
            data-col="date"
            $sortable
            $active={sort !== 'name'}
            onClick={() =>
              setSort(sort === 'date-desc' ? 'date-asc' : 'date-desc')
            }
            aria-label={
              sort === 'date-desc'
                ? '서명일 정렬 — 지금 최신순, 누르면 오래된순'
                : sort === 'date-asc'
                  ? '서명일 정렬 — 지금 오래된순, 누르면 최신순'
                  : '서명일순으로 정렬'
            }
            title="서명일 정렬 바꾸기"
          >
            서명일
            <Caret $flipped={sort === 'date-asc'} $idle={sort === 'name'}>
              ▾
            </Caret>
          </HeaderCell>
          <HeaderCell data-col="type" aria-hidden>
            유형
          </HeaderCell>
          <HeaderCell
            as="button"
            type="button"
            data-col="title"
            $sortable
            $active={sort === 'name'}
            aria-pressed={sort === 'name'}
            onClick={() => setSort('name')}
            aria-label={`이름순 정렬 — 조약 ${shownCount}건`}
            title="이름순 정렬"
          >
            조약
            <HeaderCount>
              {hasFilter ? `${shownCount} / ${all.length}` : all.length}건
            </HeaderCount>
          </HeaderCell>
          <HeaderCell data-col="parties" aria-hidden>
            서명국
          </HeaderCell>
          <HeaderCell data-col="place" aria-hidden>
            서명 장소
          </HeaderCell>
          <HeaderCell data-col="status" aria-hidden>
            상태
          </HeaderCell>
        </ColumnHeader>

        {isLoading ? (
          <Notice>불러오는 중…</Notice>
        ) : isError ? (
          <Notice>
            목록을 불러오지 못했습니다.{' '}
            <TextButton onClick={() => void refetch()}>다시 시도</TextButton>
          </Notice>
        ) : shownCount === 0 ? (
          <Notice>
            {all.length === 0
              ? '아직 등록된 조약이 없습니다. 위의 「조약 등록」으로 시작하세요.'
              : '조건에 맞는 조약이 없습니다.'}
            {hasFilter && (
              <>
                {' '}
                <TextButton onClick={clearFilters}>필터 초기화</TextButton>
              </>
            )}
          </Notice>
        ) : (
          <Rail>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key)
              return (
                <section key={group.key} aria-label={group.century === null ? undefined : formatCenturyLabel(group.century)}>
                  {group.key !== 'all' && (
                    <CenturyDivider
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(group.key)}
                    >
                      <CenturyLabel>
                        <FiChevronDown
                          size={14}
                          aria-hidden
                          style={{
                            transform: isCollapsed ? 'rotate(-90deg)' : undefined,
                          }}
                        />
                        {group.century === null
                          ? '서명일 미상'
                          : formatCenturyLabel(group.century)}
                        {group.century !== null && (
                          <CenturyYears>({centuryRange(group.century)})</CenturyYears>
                        )}
                      </CenturyLabel>
                      <CenturyCount>{group.treaties.length}건</CenturyCount>
                    </CenturyDivider>
                  )}
                  {!isCollapsed &&
                    group.treaties.map((treaty) => (
                      <TreatyRow
                        key={treaty.id}
                        treaty={treaty}
                        returnState={returnState}
                      />
                    ))}
                </section>
              )
            })}
          </Rail>
        )}
      </Catalog>

      {/* body로 포털 — Page의 container-type이 position:fixed 오버레이의 기준 상자가 된다 */}
      {createOpen &&
        createPortal(
          <TreatySectionThemeProvider>
            <TreatyCreateModal
              onClose={() => setCreateOpen(false)}
              onCreated={(createdId) => {
                setCreateOpen(false)
                void queryClient.invalidateQueries({ queryKey: ['treaties'] })
                navigate(pathKeys.treaties.detail(createdId), {
                  state: returnState,
                })
              }}
            />
          </TreatySectionThemeProvider>,
          document.body,
        )}
    </Page>
  )
}

function TreatyRow({
  treaty,
  returnState,
}: {
  treaty: TreatyDto
  returnState: TreatyListReturnState
}) {
  const parts = parseIsoDateParts(treaty.signDate)
  const parties = partiesOf(treaty)
  const status = statusOf(treaty)
  const shownParties = parties.slice(0, 2)
  const restCount = parties.length - shownParties.length

  return (
    <Row to={pathKeys.treaties.detail(treaty.id)} state={returnState}>
      <DateCell data-col="date">
        {parts ? (
          <>
            <b>{yearLabel(parts.year)}</b>
            <span>
              .{parts.month}.{parts.day}
            </span>
          </>
        ) : (
          <span>미상</span>
        )}
      </DateCell>
      <TypeCell data-col="type" $type={treaty.type}>
        {(TREATY_TYPE_LABELS[treaty.type] ?? treaty.type).replace(/ (조약|협정)$/, '')}
      </TypeCell>
      <TitleCell data-col="title">
        <strong>{treaty.name}</strong>
        {treaty.alias && <em>{treaty.alias}</em>}
      </TitleCell>
      <PartiesCell
        data-col="parties"
        title={parties.map((party) => party.name).join(' · ')}
      >
        {shownParties.map((party) => (
          <PartyChip key={party.key}>
            {party.flag && <span aria-hidden>{party.flag}</span>}
            <span className="name">{party.name}</span>
          </PartyChip>
        ))}
        {restCount > 0 && <MoreChip>+{restCount}</MoreChip>}
      </PartiesCell>
      <PlaceCell data-col="place" title={treaty.location ?? undefined}>
        {treaty.location}
      </PlaceCell>
      <StatusCell data-col="status" $tone={status?.tone}>
        {status?.label}
      </StatusCell>
    </Row>
  )
}

export default TreatiesListPage

// ──────────────────────────────────────────────
// styled — 토큰은 사건 목록·상세와 같은 ledger-tokens
// ──────────────────────────────────────────────

/** 축 좌표 — 행 구슬·세기 구슬·축선이 같은 x를 공유한다 */
const RAIL_X = 22
const RAIL_GUTTER = 44

const metaColor = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'

/*
 * ⚠️ 스크롤러가 되지 말 것(height:100% · overflow-y:auto 금지). 예전엔 둘 다 걸려 있었는데
 * 부모가 높이를 묶지 않아 이 div가 내용만큼(1392px) 늘어났고, 실제 스크롤은 바깥 셸이 했다 —
 * 그러면 열 머리글의 sticky가 '스크롤하지 않는 이 div'에 묶여 600px 내리면 top −323px로
 * 화면 밖에 나갔다. 스크롤은 셸에 맡기고 sticky는 셸 스크롤포트에 붙인다.
 */
const Page = styled.div`
  container-type: inline-size;
  container-name: treatycatalog;
  padding: 18px clamp(16px, 2vw, 28px) 64px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  /* 우상단 전역 플로팅 아바타가 줄 끝을 덮는다 — 사건 상세와 같은 56px 비킴 */
  @media (max-width: 768px) {
    padding-right: 56px;
  }
`

/** 사건 목록 '+ 새 사건 등록'과 같은 자리·같은 옷 — 툴바 맨 끝, 브랜드 채움 */
const CreateButton = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: #1d4ed8;
  }

  &:focus-visible {
    outline: 2px solid #1d4ed8;
    outline-offset: 2px;
  }
`

const SearchBox = styled.label`
  flex: 0 1 320px;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
  color: ${metaColor};
  transition: border-color 0.12s;

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${metaColor};
    }
  }
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/**
 * 사건 툴바의 '분야 · 세부 · 대륙…' 묶음과 같은 한 덩어리 — 칸 사이는 세로 헤어라인.
 * ⚠️ 줄바꿈하지 않는다: 예전엔 좁은 폭에서 3줄로 꺾였는데 줄 사이 가로선이 없어 칸이
 * 흐트러졌다. 넘치면 묶음 안에서만 가로로 민다(페이지 가로 스크롤은 생기지 않는다).
 */
const FilterGroup = styled.div`
  display: inline-flex;
  flex-wrap: nowrap;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  align-items: stretch;
  min-height: 36px;

  &::-webkit-scrollbar {
    display: none;
  }

  > * {
    flex-shrink: 0;
  }
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
  overflow: hidden;
`

const FilterButton = styled.button<{ $active: boolean; $type?: TreatyType }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  min-height: 34px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(165,180,252,0.14)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:last-child {
    border-right: none;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const TypeDot = styled.span<{ $type: TreatyType }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $type }) => treatyTypeTone($type, theme.mode)};
`

const FilterCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 500;
  color: ${metaColor};
`

const ResetButton = styled.button`
  border: none;
  background: none;
  padding: 0 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

/** 사건 목록 본문 카드와 같은 테두리 한 장 — 열 머리글·세기 장·행이 이 안에 산다 */
const Catalog = styled.div`
  border-radius: 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
`

/**
 * 열 트랙 — 머리글과 행이 **같은 템플릿**을 쓴다(사건 목록 5차에서 머리글 격자가 행보다
 * 넓어 제목 우측 열이 전부 밀리던 결함의 재발 방지). 좁아지면 장소 → 서명국 순으로 접는다.
 */
const rowGrid = css`
  display: grid;
  grid-template-columns:
    [date] 96px [type] 64px [title] minmax(0, 1fr)
    [parties] minmax(0, 260px) [place] minmax(0, 220px) [status] 80px;
  column-gap: 16px;
  align-items: center;
  padding: 0 20px 0 ${RAIL_GUTTER}px;

  @container treatycatalog (max-width: 1180px) {
    grid-template-columns:
      [date] 96px [type] 64px [title] minmax(0, 1fr)
      [parties] minmax(0, 240px) [status] 80px;

    [data-col='place'] {
      display: none;
    }
  }

  @container treatycatalog (max-width: 820px) {
    grid-template-columns: [date] 84px [title] minmax(0, 1fr) [status] 64px;
    column-gap: 12px;
    padding-right: 14px;

    [data-col='type'],
    [data-col='parties'],
    [data-col='place'] {
      display: none;
    }
  }
`

const ColumnHeader = styled.div`
  ${rowGrid}
  position: sticky;
  top: 0;
  z-index: 2;
  height: 34px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 12px 12px 0 0;
  /* ⚠️ 불투명 — 아래로 지나가는 행이 비치면 안 된다 */
  background: ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
`

const HeaderCell = styled.span<{ $sortable?: boolean; $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-align: left;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : metaColor({ theme })};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};

  &[data-col='status'] {
    justify-content: flex-end;
  }

  &:hover {
    color: ${({ theme, $sortable }) =>
      $sortable ? theme.colors.text.primary : undefined};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const Caret = styled.span<{ $flipped: boolean; $idle: boolean }>`
  display: inline-block;
  font-size: 10px;
  opacity: ${({ $idle }) => ($idle ? 0.35 : 1)};
  transform: ${({ $flipped }) => ($flipped ? 'rotate(180deg)' : 'none')};
  transition: transform 0.15s;
`

const HeaderCount = styled.span`
  ${DIGIT_DISPLAY}
  margin-left: 6px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 레일 — 축선 한 줄이 목록 전체를 세로로 꿴다. 구슬(행 5 : 세기 10)이 그 위에 얹힌다. */
const Rail = styled.div`
  position: relative;
  padding-bottom: 10px;

  &::before {
    content: '';
    position: absolute;
    left: ${RAIL_X}px;
    top: 22px;
    bottom: 22px;
    width: 1px;
    /* 사건 목록 RAIL_AXIS와 같은 잉크 — 행 괘선(0.04)보다 확실히 진해야 '축'으로 읽힌다 */
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.36)' : 'rgba(15,23,42,0.46)'};
    pointer-events: none;
  }
`

/**
 * 세기 장 표지 — 사건 목록 CenturyDivider와 같은 옷: 라벨 18/700 + 범위 11 + 건수 12,
 * 남는 폭은 리더 룰, 축 위엔 브랜드 큰 구슬(지면색 링). sticky 아님(장 표지는 지나간다).
 */
const CenturyDivider = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  margin-top: 6px;
  padding: 8px 20px 8px ${RAIL_GUTTER - 6}px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;

  section:first-child > & {
    margin-top: 0;
  }

  &::before {
    content: '';
    position: absolute;
    left: ${RAIL_X}px;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
    box-shadow: 0 0 0 3px
      ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
  }

  &::after {
    content: '';
    flex: 1;
    min-width: 24px;
    height: 1px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.13)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
    border-radius: 6px;
  }
`

const CenturyLabel = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    align-self: center;
    flex-shrink: 0;
    color: ${metaColor};
    transition: transform 0.15s;
  }
`

const CenturyYears = styled.span`
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Row = styled(Link)`
  ${rowGrid}
  position: relative;
  min-height: 44px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 0.12s;

  /* 행 구슬 — 축 위 5px, 지면색 링으로 축선을 끊는다 */
  &::before {
    content: '';
    position: absolute;
    left: ${RAIL_X}px;
    top: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
    box-shadow: 0 0 0 2px
      ${({ theme }) => (theme.mode === 'dark' ? '#141414' : '#fff')};
  }

  section:last-child > &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};

    &::before {
      background: ${({ theme }) => ledgerAccent(theme.mode)};
    }

    strong {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const DateCell = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12.5px;
  white-space: nowrap;
  color: ${metaColor};

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TypeCell = styled.span<{ $type: TreatyType }>`
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme, $type }) => treatyTypeTone($type, theme.mode)};
`

/** 제목 + 별칭을 한 줄 글로 — 사건 목록의 '제목 뒤 잇는 설명'과 같은 조판 */
const TitleCell = styled.span`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 11px 0;

  strong {
    flex: 0 1 auto;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
    color: ${({ theme }) => theme.colors.text.primary};
    transition: color 0.12s;
  }

  em {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-style: normal;
    font-size: 12.5px;
    color: ${metaColor};
  }

  /*
   * 좁은 폭(390px)에선 별칭이 남은 폭을 나눠 먹어 제목이 '독소 불가침 …' 4~5자로 잘렸다.
   * 별칭을 내리고 제목에 전폭 + 두 줄까지 — 제목이 행의 주어다.
   */
  @container treatycatalog (max-width: 640px) {
    em {
      display: none;
    }

    strong {
      max-width: 100%;
      white-space: normal;
      word-break: keep-all;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
`

const PartiesCell = styled.span`
  display: flex;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
  overflow: hidden;
`

/* ⚠️ 말줄임은 안쪽 .name이 진다 — flex 컨테이너 자신의 text-overflow는 익명 텍스트에
   안 먹어서 '프랑스 제3공'처럼 글자가 반쯤 잘린 채 끝났다. */
const PartyChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  > span {
    flex-shrink: 0;
  }

  > .name {
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const MoreChip = styled.span`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10.5px;
  line-height: 17px;
  color: ${metaColor};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.05)'};
`

const PlaceCell = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: ${metaColor};
`

const StatusCell = styled.span<{ $tone?: 'broken' | 'expired' }>`
  ${DIGIT_DISPLAY}
  justify-self: end;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tone }) =>
    $tone === 'broken'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : metaColor({ theme })};
`

const Notice = styled.div`
  padding: 48px 16px;
  text-align: center;
  font-size: 13px;
  color: ${metaColor};
`

const TextButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};

  &:hover {
    text-decoration: underline;
  }
`
