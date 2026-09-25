/**
 * 사건 목록 사이드바 — `/events` 좌측.
 *
 * 목록 UI는 공용 EntityListSidebar. 여기서는 사건 도메인만 다룬다:
 * 세기 그룹핑(BC 안전) · 연 소제목 · 카테고리/정렬 셀렉트 · 행 클릭 시 사건 상세로 이동.
 *
 * 카탈로그 본문(우측)은 자체 필터 체계가 방대해 그대로 두고, 사이드바는 **탐색 전용**으로
 * 독립 검색을 갖는다. 본문 필터와 억지로 묶으면 두 필터 체계가 서로를 덮어쓴다.
 *
 * 조판은 **평범한 목록**이다(자세한 규칙은 event-list-sidebar.styles.ts 주석):
 * - 한 행 = 제목(최대 2줄) + 메타 한 줄. 메타는 날짜가 선두다.
 * - 세기는 접히는 섹션, 연은 소제목. 그 밖의 장식(축·눈금·배지)은 두지 않는다.
 * - 유일한 색은 분류(카탈로그·원장과 같은 LEDGER 팔레트, 대비 보정본)다.
 */
import React, { useMemo, useState } from 'react'

import { FiClock, FiLayers, FiStar } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import type { HistoricalEvent } from '@/entities/event/model'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import {
  compareByDate,
  formatDateWithPrecision,
  formatYearLabel,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { formatCenturyLabel } from '@/shared/lib/lifespan-text'
import { titleWithoutOwnDate } from '@/shared/lib/title-date'
import { pathKeys } from '@/shared/router'
import { HighlightedText } from '@/shared/ui/highlighted-text'
import {
  EntityListSidebar,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  useSidebarPins,
  useSidebarRecents,
} from '@/widgets/entity-list-sidebar'

import { EventListScope, ParentTail } from './event-list-sidebar.styles'

/**
 * 세기 앵커 ramp — 최신(인디고)에서 먼 과거(바랜 슬레이트)로 **단조 감쇠**한다.
 * 색이 그룹을 구분하는 게 아니라 '얼마나 오래됐나'를 읽히게 하는 축이므로, 그룹 수에 맞춰
 * 두 끝점 사이를 보간한다(6색 순환은 13세기와 19세기를 같은 색으로 만든다).
 */
const RAMP_NEW: [number, number, number] = [0x63, 0x66, 0xf1]
const RAMP_OLD: [number, number, number] = [0x94, 0xa3, 0xb8]

function centuryRampColor(index: number, total: number): string {
  const ratio = total <= 1 ? 0 : index / (total - 1)
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * ratio)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(RAMP_NEW[0], RAMP_OLD[0])}${channel(
    RAMP_NEW[1],
    RAMP_OLD[1],
  )}${channel(RAMP_NEW[2], RAMP_OLD[2])}`
}

const UNKNOWN_GROUP = '__no-date__'
const PINNED_GROUP = '__pinned__'
const RECENT_GROUP = '__recent__'
type SortKey = 'recent' | 'oldest' | 'title' | 'created'

/** 시간 순서로 늘어선 정렬인가 — 연 앵커는 이때만 뜻이 있다 */
const isChronological = (sort: SortKey) =>
  sort === 'recent' || sort === 'oldest'

/**
 * 메타 줄 선두의 날짜 토큰.
 *
 * 연 소제목 아래에서는 **연도를 빼고** 월·일만 쓴다(바로 위에서 이미 말했다). 소제목이
 * 없는 자리(고정·최근, 이름순·등록순)에서는 연도까지 적어야 행 혼자서 말이 된다.
 * 정밀도를 넘어서 지어내지 않는다 — 연 정밀도는 연도까지, 날짜 미상은 아무것도.
 */
/**
 * 행 **선두 열**에 세우는 날짜 — 인물 목록이 얼굴을 세우는 그 자리다.
 *
 * 한 행의 날짜는 **한 토막**이어야 한다. 선두에 '4.1', 메타 줄에 '1683'을 따로 두면 읽는
 * 사람이 둘을 도로 붙여야 한다(고정·최근 그룹에서 실제로 그렇게 보였다).
 *
 * 그래서 **눈금이 이미 말하는 만큼만 덜어낸다**:
 * - 연 소제목 아래 → 월·일만. 연도는 바로 위에 서 있다.
 * - 소제목이 없는 자리(고정·최근·연도 미상) → 연도. 역사 사건에서 먼저 필요한 좌표는
 *   날짜가 아니라 연도다.
 *
 * 어느 쪽이든 열 폭 안에 든다('11.27' 33.3px, 'BC 44' 33px < 36px). 연 정밀도 사건이 연
 * 소제목 아래 오면 빈 값이다 — 월·일을 모르는데 지어낼 수 없고, 열 폭은 그대로 유지된다.
 */
function leadDateToken(
  event: HistoricalEvent,
  underYearHeading: boolean,
): string {
  const parts = parseIsoDateParts(event.startDate)
  if (!parts) return ''
  if (!underYearHeading) {
    return parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
  }
  const precision = event.startDatePrecision
  if (precision === 'year') return ''
  if (precision === 'month') return `${parts.month}월`
  if (isJanuaryFirstSentinel(parts)) return ''
  return `${parts.month}.${parts.day}`
}

/**
 * 1월 1일은 **날짜가 아니라 자리 표시**로 본다 — 카탈로그 본문(event-list-item의
 * `rowShowsFullDate`)이 이미 같은 판정을 하고 있고, 두 지면이 같은 사건을 두고 다르게
 * 말하면 안 된다.
 *
 * 근거는 데이터다. `start_date_precision`이 실DB 328행 중 **237행에서 NULL**이라
 * '연 정밀도'라는 신호 자체가 거의 없고, 1월 1일로 들어온 18행은 **전부** NULL이다.
 * 그 18행은 '신성 로마 제국-폴란드 전쟁 (1002~1018)'(끝 1018-12-31) · '네덜란드 튤립
 * 파동'(끝 1637-02-03)처럼 연 단위 사건에 1월 1일을 넣어 둔 것들이다.
 *
 * ⚠️ 대가: 진짜 1월 1일 사건('대한민국 금융소득종합과세 최초 시행' 1996-01-01)은
 *    사이드바에서 일자를 잃는다. 연 머리글이 연도를 대므로 **틀린 말은 하지 않지만**
 *    덜 말한다 — 16행의 거짓 '1.1'보다 이쪽이 싼 실수라고 봤다. 본문 목록의 날짜 열에는
 *    그대로 남는다.
 */
function isJanuaryFirstSentinel(parts: { month: number; day: number }): boolean {
  return parts.month === 1 && parts.day === 1
}

/**
 * 상위 사건 꼬리표용 짧은 제목 — 첫 구분자 앞까지만.
 *
 * 사건 제목은 문장이라('NSPM-2 서명 — 이란 최대 압박 재발동') 킥커에 통째로 넣으면 날짜·분류
 * 옆에서 줄을 다 먹고도 말줄임된다. 부제를 떼면 같은 폭에서 훨씬 많은 행이 '무엇의 일부'인지
 * 말할 수 있다.
 */
function shortParentTitle(title: string): string {
  const head = title.split(/[—–(:·]/)[0].trim()
  return head.length >= 2 ? head : title.trim()
}

/** 상위 꼬리표 최대 길이 — 아래 주석 참고 */
const PARENT_TAIL_MAX = 16

/**
 * 화면에 세우는 꼬리표 길이 — 여기서만 자른다(검색·스크린리더는 전값을 쓴다).
 *
 * 꼬리표는 제목에 딸린 **주석**이지 두 번째 제목이 아니다. 실측 73개 꼬리표의 중앙값은
 * 8자로 멀쩡한데 꼬리 쪽이 길다 — 17자 이상이 8개, 최장 28자('엔비디아 차세대 AI 칩
 * 아키텍처 블랙웰 공개')다. 그런 꼬리표는 혼자 한 줄을 다 먹고도 말줄임됐고, 정작 자기가
 * 붙은 제목('다고메 유덱스 작성' 8자)보다 세 배 길었다(실측 17행에서 꼬리표가 제목보다 길다).
 * 16자에서 끊는다 — 중앙값의 두 배라 짧은 꼬리표는 하나도 건드리지 않는다.
 */
function clampParentTail(text: string): string {
  if (text.length <= PARENT_TAIL_MAX) return text
  const head = text.slice(0, PARENT_TAIL_MAX)
  /* 낱말 한가운데서 끊지 않는다 — 그냥 자르면 '오토 3세 섭정 분쟁과 하인리…'처럼 이름이
     쪼개진다(제목 줄바꿈을 keep-all로 고친 것과 같은 이유). 다만 첫 낱말이 통째로 한도를
     넘으면(긴 고유명사) 되돌릴 자리가 없으므로 그때는 그대로 끊는다. */
  const lastSpace = head.lastIndexOf(' ')
  const cut = lastSpace >= PARENT_TAIL_MAX / 2 ? head.slice(0, lastSpace) : head
  return `${cut.trimEnd()}…`
}

/** 관련국 요약 — 앞 하나만 이름으로, 나머지는 '외 N' (조약 사이드바와 같은 규약) */
function summarizeCountries(event: HistoricalEvent): string | null {
  const names = [
    ...(event.relatedCountries ?? []).map((country) => country.name),
    ...(event.relatedHistoricalCountries ?? []).map((country) => country.name),
  ].filter(Boolean)
  if (names.length === 0) return null
  return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}`
}

/**
 * 검색 대상 문자열 — 제목·분류·장소·상위 제목·관련국·키워드.
 *
 * 행을 만들기 **전에** 필요하다. 예전에는 행을 다 만든 뒤 `filterSidebarItems`로 걸렀는데,
 * 연 앵커는 그 전에 붙어 있어서 앵커를 단 행이 걸러지면 그 해의 남은 행들이 **연도 없이**
 * 떠 있었다(검색 '전쟁' → 2026년 행이 21세기 헤더 바로 밑에 붙고 다음 앵커는 2025).
 * 상위 꼬리표 되풀이 판정도 같은 이유로 필터 뒤에 와야 한다.
 */
function searchTextOf(
  event: HistoricalEvent,
  parent: HistoricalEvent | null,
  countries: string | null,
): string {
  return [
    event.title,
    event.category,
    event.location,
    parent?.title,
    countries,
    ...(event.relatedCountries ?? []).map((country) => country.name),
    ...(event.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

interface EventListSidebarProps {
  selectedId: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** 사건 등록 진입 — 미지정 시 헤더 + 버튼 숨김 */
  onAdd?: () => void
}

function EventListSidebarInner({
  selectedId,
  collapsed = false,
  onToggleCollapse,
  onAdd,
}: EventListSidebarProps) {
  const navigate = useNavigate()
  // 사이드바는 세기 그룹을 온전히 보여야 하므로 전량 로드(서버 페이지네이션 위 클라 그룹핑은
  // 1페이지만 그룹이 잡히는 함정이 있다 — event-catalog 회귀와 같은 이유).
  const { events, isLoading, isError, refetch } = useEvents({
    autoLoadAll: true,
  })
  const { pinnedIds, togglePin } = useSidebarPins('event-sidebar-pins')
  const recentIds = useSidebarRecents('event-sidebar-recents', selectedId)

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  /** 분류 셀렉트 — 건수를 함께 보여 어느 축이 실제로 채워져 있는지 고르기 전에 알 수 있게 */
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      if (!event.category) continue
      const name = String(event.category)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0], 'ko'))
      .map(([name, count]) => ({ name, count }))
  }, [events])

  /** 세기 그룹 id는 부호 연도 기준 — BC는 음수 세기로 따로 잡힌다 */
  const centuryIdOf = (signedYear: number): string => {
    const century = Math.floor((Math.abs(signedYear) - 1) / 100) + 1
    return signedYear < 0 ? `c-bc-${century}` : `c-ad-${century}`
  }

  const hasActiveFilter = !!query.trim() || !!categoryFilter

  const { items, groups, totalCount } = useMemo(() => {
    const byId = new Map(events.map((event) => [event.id, event]))
    const chronological = isChronological(sort)
    /** 검색 중인가 — 행이 '왜 걸렸는지'를 스스로 말해야 하는 유일한 상태다(아래 meta). */
    const searching = !!query.trim()
    /** 검색어 매치를 mark로 짚는다 — 검색 중일 때만 부른다 */
    const highlight = (text: string) => (
      <HighlightedText text={text} query={query.trim()} />
    )

    /** 한 사건 → 한 행. 빠른 접근 그룹은 같은 사건을 다른 groupId로 한 번 더 싣는다. */
    const toRow = (
      event: HistoricalEvent,
      groupId: string,
      options: {
        underYearAnchor: boolean
        leadDivider?: React.ReactNode
        /** 바로 윗행이 같은 상위 사건이었나 — 꼬리표를 되풀이하지 않는다 */
        repeatsParent?: boolean
      } = {
        underYearAnchor: false,
      },
    ): EntitySidebarItem => {
      const parent = event.parentEventId ? byId.get(event.parentEventId) : null
      const countries = summarizeCountries(event)
      const childCount = event.hierarchy?.children?.length ?? 0
      const categoryLabel = event.category ? String(event.category) : null
      /* 상위 꼬리표는 **묶음의 첫 행에만**. 한 상위 밑에 다섯 행이 붙는 일이 흔해서
         (NSPM-2 서명 · 러불 동맹 · 독일 함대법) 매 행에 찍으면 같은 문장이 세로로 쌓여
         정작 그 행만의 정보를 밀어낸다. 되풀이는 자리에서는 아예 달지 않는다 —
         그 행들은 꼬리표를 단 행 바로 아래 이어 서서 한 묶음으로 읽힌다. */
      const parentTailFull =
        parent && !options.repeatsParent
          ? shortParentTitle(parent.title)
          : null
      const parentTail = parentTailFull
        ? clampParentTail(parentTailFull)
        : null
      /* 화면에 세우는 제목은 **자기 날짜 꼬리를 덜어낸** 것 — 바로 왼쪽 선두 열과 연
         머리글이 같은 날짜를 이미 말한다(shared/lib/title-date.ts).
         연도 하나뿐인 꼬리('포츠담 회담 (1945)')까지 덜어내는 건 이 지면이 연도를 늘
         보여 주기 때문이다 — 연 머리글이 있으면 그 머리글이, 없으면(고정·최근, 이름순)
         선두 열이 연도를 쓴다. 검색·스크린리더는 아래에서 원본을 쓴다. */
      const displayTitle = titleWithoutOwnDate(
        event.title,
        event.startDate,
        event.startDatePrecision,
        { rowShowsYear: true },
      )
      return {
        id: event.id,
        name: displayTitle,
        /* 검색 중에만 매치 강조 — 이 목록은 평소 색인이라 잉크를 아끼지만, 결과 목록에서는
           '어디가 걸렸나'가 제목 안에서 보여야 한다. 원본 문자열은 name에 그대로 남아
           툴팁·정렬·검색 색인이 쓴다. */
        nameNode: searching ? (
          <HighlightedText text={displayTitle} query={query.trim()} />
        ) : undefined,
        /*
         * 둘째 줄(메타)은 **검색 중에만** 있다 — 평소 이 목록은 색인이다.
         *
         * 예전에는 분류 · 관련국 · 하위 N을 제목 아래 한 줄로 상시 달았다. 그 줄 하나가
         * 행마다 16px씩, 목록 전체로 3,200px을 썼고(실측 316행) 정작 같은 값을 바로 옆
         * 본문 목록이 **전용 열**로 이미 말하고 있었다. 행 72.6 → 45.5px이 그 대가다.
         *
         * 다만 검색은 제목 밖(분류·관련국·장소·키워드)에서도 걸린다. '오스만'으로 25행이
         * 뜨는데 그 25행의 제목 어디에도 '오스만'이 없으면 **왜 이 행이 여기 있는지**가
         * 화면에서 사라진다. 그래서 검색 중에만 근거를 되살린다 — 본문 목록이 검색 중에만
         * TrailingNote를 그리는 것과 같은 규약이다(설명과 근거는 다른 질문에 답한다).
         * 색은 입히지 않는다: 이 줄이 답하는 것은 '왜 걸렸나'이지 '무슨 분류인가'가 아니다.
         */
        meta: searching
          ? [
              categoryLabel
                ? { text: categoryLabel, node: highlight(categoryLabel) }
                : null,
              countries
                ? { text: countries, shrink: true, node: highlight(countries) }
                : null,
            ]
          : undefined,
        /* 선두 고정폭 열 — 인물 목록의 아바타 자리에 사건은 날짜를 세운다.
           썸네일을 놓을 수도 있었지만 실측 보유율이 13%(13/100)라, 열의 87%가 빈 블록이
           되면서 제목 폭만 먹는다. 인물은 40%(151/380)라 얼굴이 그 자리를 벌 만하다. */
        lead: leadDateToken(event, options.underYearAnchor),
        leadDivider: options.leadDivider,
        /*
         * 상위 사건 꼬리표 — 제목 **뒤에 이어 붙는다**(mark는 제목과 같은 줄 안에 흐른다).
         *
         * 메타 줄을 없애면서 '이 행이 무엇의 하위인가'가 갈 곳이 없어졌는데, 그건 행 하나로
         * 자족하지 않는 유일한 값이다(분류·관련국은 본문 열이 말하지만, 계보는 목록에
         * 다른 출처가 없다). 제목 줄 안에 두면 세로 예산을 0px 쓰고 2줄 클램프에 함께 접힌다.
         */
        mark: parentTail ? (
          <>
            {/* 줄바꿈 기회는 꼬리표 **앞에만** 둔다 — 아래 nbsp 참고 */}{' '}
            <ParentTail title={`상위 사건: ${parent?.title ?? parentTail}`}>
              {`\u21b3\u00a0${parentTail}`}
            </ParentTail>
          </>
        ) : undefined,
        /* 읽어 주는 쪽에는 **줄이기 전 값**을 그대로 준다 — 화면에서는 연 소제목이 연도를
           대신 말해 날짜를 '9.4'로 줄였고, 제목에서도 중복 날짜 꼬리를 덜어냈다. */
        ariaLabel: [
          event.title,
          event.startDate
            ? formatDateWithPrecision(event.startDate, event.startDatePrecision)
            : '날짜 미상',
          categoryLabel,
          countries,
          parent ? `${shortParentTitle(parent.title)}의 하위 사건` : null,
          childCount > 0 ? `하위 사건 ${childCount}건` : null,
        ]
          .filter(Boolean)
          .join(', '),
        searchText: searchTextOf(event, parent ?? null, countries),
        groupId,
      }
    }

    const rows: EntitySidebarItem[] = []
    const groupMeta = new Map<string, { name: string; sortKey: number }>()

    const sorted = [...events]
    if (sort === 'title') {
      sorted.sort((left, right) => left.title.localeCompare(right.title, 'ko'))
    } else if (sort === 'created') {
      sorted.sort((left, right) =>
        (right.createdAt ?? '').localeCompare(left.createdAt ?? ''),
      )
    } else {
      /* 연도가 아니라 **날짜**로 정렬한다(BC 안전·미상은 항상 뒤).
         예전엔 연도만 비교해 같은 해 안은 서버 응답 순서 그대로였다 — 킥커에 날짜가
         드러난 뒤로는 '9.4 · 7.27 · … · 9.10 · 9.14'처럼 축이 되돌아가는 게 보였다. */
      sorted.sort((left, right) =>
        compareByDate(
          left.startDate,
          right.startDate,
          sort === 'oldest' ? 'asc' : 'desc',
        ),
      )
    }

    /* 1단계 — 걸러내기. 분류·검색을 **여기서 모두** 끝낸다. 앵커·꼬리표는 화면에 남는
       행들 사이의 관계라서, 걸러낸 뒤의 목록을 봐야 맞게 붙는다. */
    const loweredQuery = query.trim().toLowerCase()
    const visible: {
      event: HistoricalEvent
      groupId: string
      signedYear: number | null
      searchText: string
    }[] = []
    for (const event of sorted) {
      if (categoryFilter && String(event.category) !== categoryFilter) continue
      const parent = event.parentEventId ? byId.get(event.parentEventId) : null
      const searchText = searchTextOf(
        event,
        parent ?? null,
        summarizeCountries(event),
      )
      if (loweredQuery && !searchText.includes(loweredQuery)) continue
      const signedYear = signedYearFromIsoLike(event.startDate)
      visible.push({
        event,
        groupId: signedYear == null ? UNKNOWN_GROUP : centuryIdOf(signedYear),
        signedYear,
        searchText,
      })
    }

    /* 2단계 — 남은 행들에 앵커·꼬리표를 붙인다.
       연 앵커는 '연도가 바뀌는 첫 행'에만. 시간 정렬이 아닐 때는 순서가 연도와 무관하므로
       앵커를 달지 않는다 — 같은 연도가 목록 곳곳에서 되살아나 축을 거짓말로 만든다. */
    let anchoredYear: number | null = null
    let anchoredGroup: string | null = null
    /** 상위 꼬리표 되풀이 판정용 — 연·세기가 바뀌면 문맥이 끊기므로 같이 초기화한다 */
    let previousParentId: string | null = null

    for (const { event, groupId, signedYear } of visible) {
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, {
          name:
            signedYear == null ? '연도 미상' : formatCenturyLabel(signedYear),
          // 미상은 항상 맨 끝
          sortKey: signedYear == null ? Number.POSITIVE_INFINITY : signedYear,
        })
      }

      let leadDivider: React.ReactNode
      if (chronological && signedYear != null) {
        if (groupId !== anchoredGroup || signedYear !== anchoredYear) {
          leadDivider = formatYearLabel(signedYear)
          anchoredYear = signedYear
          anchoredGroup = groupId
          previousParentId = null
        }
      }
      const parentId = event.parentEventId ?? null
      rows.push(
        toRow(event, groupId, {
          underYearAnchor: chronological && signedYear != null,
          leadDivider,
          repeatsParent: !!parentId && parentId === previousParentId,
        }),
      )
      previousParentId = parentId
    }

    // 최신 세기 먼저(기본) — 정렬이 '오래된순'이면 그룹도 오래된 세기 먼저.
    // '연도 미상'은 방향과 무관하게 맨 끝이다. 예전엔 sortKey=+Infinity에 방향을 곱해서,
    // 기본값인 최신순에서 -Infinity가 되며 미상 그룹이 목록 맨 위로 올라왔다.
    const direction = sort === 'oldest' ? 1 : -1
    const centuryEntries = [...groupMeta.entries()].sort((left, right) => {
      const leftUnknown = left[0] === UNKNOWN_GROUP
      const rightUnknown = right[0] === UNKNOWN_GROUP
      if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1
      return (left[1].sortKey - right[1].sortKey) * direction
    })
    const rampLength = centuryEntries.filter(
      ([groupId]) => groupId !== UNKNOWN_GROUP,
    ).length
    let rampIndex = 0
    const centuryGroups: EntitySidebarGroup[] = centuryEntries.map(
      ([groupId, meta], index) => ({
        id: groupId,
        name: meta.name,
        accent:
          groupId === UNKNOWN_GROUP
            ? '#a1a1aa'
            : centuryRampColor(rampIndex++, rampLength),
        /* 첫 그룹만 펼쳐 둔다 — 전 그룹이 접힌 채로 열리면 292개짜리 목록이 헤더 12줄로만
           보인다(국가 목록과 같은 규약). 사용자가 접으면 그 선택이 유지된다. */
        alwaysExpanded: index === 0,
      }),
    )

    // 핀·최근은 검색/필터 중에는 숨긴다 — 결과 모수를 흐리지 않기 위해(국가·인물과 같은 규약)
    const quickGroups: EntitySidebarGroup[] = []
    if (!hasActiveFilter) {
      const pinnedEvents = pinnedIds
        .map((id) => byId.get(id))
        .filter((event): event is HistoricalEvent => !!event)
      /* 지금 보고 있는 사건은 뺀다 — 상세 지면에서 '최근 본 사건'의 첫 행은 **언제나**
         자기 자신이다(방문하는 순간 맨 앞으로 올라오므로). 갈 수 없는 목적지가 목록 맨
         위 한 줄을 차지하고, 같은 사건이 아래 세기 그룹에서 한 번 더 선택 표시를 받아
         '지금 어디인가'가 두 곳으로 갈라진다. 고정(핀)은 사용자가 직접 박아 둔 자리라
         그대로 둔다. */
      const recentEvents = recentIds
        .filter((id) => id !== selectedId && !pinnedIds.includes(id))
        .map((id) => byId.get(id))
        .filter((event): event is HistoricalEvent => !!event)
        .slice(0, 5)
      if (pinnedEvents.length > 0) {
        quickGroups.push({
          id: PINNED_GROUP,
          name: '고정',
          accent: '#eab308',
          leadIcon: <FiStar size={11} />,
          isQuickAccess: true,
        })
        rows.unshift(...pinnedEvents.map((event) => toRow(event, PINNED_GROUP)))
      }
      if (recentEvents.length > 0) {
        quickGroups.push({
          id: RECENT_GROUP,
          name: '최근 본 사건',
          accent: '#06b6d4',
          leadIcon: <FiClock size={11} />,
          isQuickAccess: true,
        })
        rows.push(...recentEvents.map((event) => toRow(event, RECENT_GROUP)))
      }
    }

    return {
      // 검색은 1단계에서 이미 끝났다 — 여기서 또 거르면 앵커가 다시 어긋난다.
      items: rows,
      groups: [...quickGroups, ...centuryGroups],
      totalCount: events.length,
    }
  }, [
    events,
    query,
    categoryFilter,
    sort,
    hasActiveFilter,
    pinnedIds,
    recentIds,
    selectedId,
  ])

  return (
    <EventListScope>
      <EntityListSidebar
        title="사건 목록"
        noun="사건"
        domainKey="event"
        items={items}
        totalCount={totalCount}
        groups={groups}
        selectedId={selectedId}
        onSelect={(id) => navigate(pathKeys.events.detail(id))}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="제목·국가·키워드 검색..."
        titleLines={2}
        selects={[
          {
            id: 'category',
            label: '분류',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: '', label: '분류 전체' },
              ...categoryOptions.map(({ name, count }) => ({
                value: name,
                label: `${name} ${count}`,
              })),
            ],
          },
          {
            id: 'sort',
            label: '정렬',
            value: sort,
            active: false,
            onChange: (next) => setSort(next as SortKey),
            options: [
              { value: 'recent', label: '최신순' },
              { value: 'oldest', label: '오래된순' },
              { value: 'title', label: '이름순' },
              { value: 'created', label: '등록순' },
            ],
          },
        ]}
        hasActiveFilter={hasActiveFilter}
        onClearFilters={() => {
          setQuery('')
          setCategoryFilter('')
        }}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        onAdd={onAdd}
        addLabel="사건 등록"
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapsedIcon={<FiLayers size={16} />}
      />
    </EventListScope>
  )
}

export const EventListSidebar = React.memo(EventListSidebarInner)
