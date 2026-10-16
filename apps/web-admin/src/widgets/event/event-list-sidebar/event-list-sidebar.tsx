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
import React, { Suspense, lazy, useMemo, useState } from 'react'

import { FiClock, FiLayers, FiStar } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import type { HistoricalEvent } from '@/entities/event/model'
/* 분류 색 단일출처 — 본문 목록(event-list-compact)도 같은 파일을 읽는다 */
import { CATEGORY_SOFT_COLORS } from '@/pages/events/styles/theme'
import { getUploadImageUrl } from '@/shared/api/upload'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import {
  compareByDate,
  formatDateWithPrecision,
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

import { EventListScope } from './event-list-sidebar.styles'

/**
 * 사건 등록 모달 — 열 때만 불러온다(폼 청크 gzip 약 19KB, 상세의 '새 하위 사건'과 같은 정책).
 * URL 동기화(`?eventForm=new`) 호스트를 쓰지 않는 이유: 상세 본문도 같은 모달을 띄우는 길이
 * 있어 두 호스트가 한 파라미터를 동시에 읽으면 모달이 겹친다. 기업 사이드바처럼 로컬 상태로 연다.
 */
const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

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

/**
 * 메타 줄 선두의 날짜 토큰.
 *
 * 연 소제목 아래에서는 **연도를 빼고** 월·일만 쓴다(바로 위에서 이미 말했다). 소제목이
 * 없는 자리(고정·최근, 이름순·등록순)에서는 연도까지 적어야 행 혼자서 말이 된다.
 * 정밀도를 넘어서 지어내지 않는다 — 연 정밀도는 연도까지, 날짜 미상은 아무것도.
 */
/**
 * 행 둘째 줄의 날짜 — 연도부터 적는다('2026.9.24' · '1453' · 'BC 221').
 *
 * 예전엔 선두 고정폭 열에 월·일만 세우고 연도는 그룹 안 연 소제목이 댔다. 기업 사이드바와
 * 같은 행 문법(썸네일 + 이름 + 메타 줄)으로 바꾸면서(2026-10-15) 연 소제목을 걷었으므로,
 * 행 혼자서 언제인지 말해야 한다. 정밀도를 넘어서 지어내지 않는다 — 연 정밀도와
 * 1월 1일 자리표시는 연도까지만.
 */
function metaDateLabel(event: HistoricalEvent): string {
  const parts = parseIsoDateParts(event.startDate)
  if (!parts) return ''
  const year = parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
  const precision = event.startDatePrecision
  if (precision === 'year' || isJanuaryFirstSentinel(parts)) return year
  if (precision === 'month') return `${year}.${parts.month}`
  return `${year}.${parts.month}.${parts.day}`
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
  /* 호출부가 onAdd를 안 주면(레이아웃 셸) 등록 모달을 직접 띄운다 — 기업 사이드바와 같은 규약 */
  const [createOpen, setCreateOpen] = useState(false)
  // 사이드바는 세기 그룹을 온전히 보여야 하므로 전량 로드(서버 페이지네이션 위 클라 그룹핑은
  // 1페이지만 그룹이 잡히는 함정이 있다 — event-catalog 회귀와 같은 이유).
  const { events, isLoading, isError, refetch } = useEvents({
    autoLoadAll: true,
  })
  const { pinnedIds, togglePin } = useSidebarPins('event-sidebar-pins')
  const recentIds = useSidebarRecents('event-sidebar-recents', selectedId)

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

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
    ): EntitySidebarItem => {
      const parent = event.parentEventId ? byId.get(event.parentEventId) : null
      const countries = summarizeCountries(event)
      const childCount = event.hierarchy?.children?.length ?? 0
      const categoryLabel = event.category ? String(event.category) : null
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
         * 썸네일 — 기업 사이드바와 같은 행 문법(2026-10-15 사용자 지시 '기업 사이드랑 디자인이
         * 다르다, 썸네일 나오는 것도 없고'). 이미지가 없는 사건은 **분류 첫 글자** 배지를
         * 분류 색으로 칠한다(정·경·외·전…) — 제목 첫 글자('2026년…'의 '2')는 아무것도 말하지 않는다.
         * 예전엔 보유율 13%라 선두를 날짜 열로 썼지만, 배지가 분류를 말하므로 빈 블록이 아니다.
         */
        thumbnailUrl: event.visuals?.thumbnailUrl
          ? getUploadImageUrl(event.visuals.thumbnailUrl) || event.visuals.thumbnailUrl
          : null,
        badgeText: (categoryLabel ?? '미분류').slice(0, 1),
        accentColor: (
          CATEGORY_SOFT_COLORS[event.category as keyof typeof CATEGORY_SOFT_COLORS] ??
          CATEGORY_SOFT_COLORS.other
        ).text,
        /*
         * 둘째 줄 — 날짜 · 관련국 · 분류(기업의 '종목코드 · 국가 · 상태'와 같은 자리).
         * 검색 중에는 관련국·분류에 매치 강조를 입힌다 — 제목 밖에서 걸린 행이 '왜 여기 있나'를
         * 스스로 말하게.
         */
        meta: [
          metaDateLabel(event) || '날짜 미상',
          countries
            ? { text: countries, shrink: true, node: searching ? highlight(countries) : undefined }
            : null,
          categoryLabel
            ? { text: categoryLabel, node: searching ? highlight(categoryLabel) : undefined }
            : null,
        ],
        /*
         * (제거, 2026-10-15) 제목 뒤 꼬리표 — '↳ 상위 사건'·'하위 N'.
         * 제목이 1~2줄로 접히고 꼬리표가 그 뒤에 붙으면서 행 높이가 37·58·79px로 들쭉날쭉했고,
         * 사용자 판정이 '너무 지저분하다'였다. 행은 이제 **한 줄 제목**으로 고르다(37px).
         * 계보는 툴팁(제목 전문)·aria-label('…의 하위 사건')·상세 본문의 상위/하위 지면이 말한다.
         */
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

    /*
     * 최신순 하나(2026-10-15). 정렬 셀렉트(최신·오래된·이름·등록순)는 걷어냈다 — 기업 사이드바처럼
     * 검색칸과 필터 하나를 **한 줄**에 앉히려면 칩이 하나여야 하고(공용 규칙: 칩 ≤1개면 인라인),
     * 이 사이드바는 상세 사이를 오가는 길이라 정렬 축이 필요한 일은 본문 목록(/events)이 맡는다.
     * 연도가 아니라 **날짜**로 정렬한다(BC 안전·미상은 항상 뒤) — 같은 해 안이 서버 응답
     * 순서 그대로면 '9.4 · 7.27 · … · 9.10'처럼 축이 되돌아간다.
     */
    const sorted = [...events].sort((left, right) =>
      compareByDate(left.startDate, right.startDate, 'desc'),
    )

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

    /* 2단계 — 세기 그룹에 싣는다. (연 소제목은 2026-10-15 제거 — 날짜가 메타 줄에 연도부터 선다) */

    for (const { event, groupId, signedYear } of visible) {
      if (!groupMeta.has(groupId)) {
        groupMeta.set(groupId, {
          name:
            signedYear == null ? '연도 미상' : formatCenturyLabel(signedYear),
          // 미상은 항상 맨 끝
          sortKey: signedYear == null ? Number.POSITIVE_INFINITY : signedYear,
        })
      }

      rows.push(toRow(event, groupId))
    }

    // 최신 세기 먼저. '연도 미상'은 맨 끝이다(sortKey=+Infinity를 뒤집으면 맨 위로 올라온다).
    const centuryEntries = [...groupMeta.entries()].sort((left, right) => {
      const leftUnknown = left[0] === UNKNOWN_GROUP
      const rightUnknown = right[0] === UNKNOWN_GROUP
      if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1
      return right[1].sortKey - left[1].sortKey
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
        /* 목록 페이지·필터 칩이 모두 '건'으로 센다 — 같은 사건 수가 '개'로 읽히지 않게.
           이 수는 하위 사건까지 센다 — 목록 머리글은 최상위만 세므로 툴팁으로 모수를 밝힌다. */
        countUnit="건"
        countHint="하위 사건 포함(사건 목록 머리글은 최상위만 셉니다)"
        domainKey="event"
        items={items}
        totalCount={totalCount}
        groups={groups}
        selectedId={selectedId}
        onSelect={(id) => navigate(pathKeys.events.detail(id))}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="제목·국가·키워드 검색..."
        /* 한 줄 — 행 높이를 고르게(37px). 잘린 제목은 행 툴팁이 전문을 보인다 */
        titleLines={1}
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
        ]}
        hasActiveFilter={hasActiveFilter}
        onClearFilters={() => {
          setQuery('')
          setCategoryFilter('')
        }}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        onAdd={onAdd ?? (() => setCreateOpen(true))}
        addLabel="사건 등록"
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapsedIcon={<FiLayers size={16} />}
      />
      {createOpen && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => setCreateOpen(false)}
            onSaved={(eventId) => {
              setCreateOpen(false)
              navigate(pathKeys.events.detail(eventId))
            }}
          />
        </Suspense>
      )}
    </EventListScope>
  )
}

export const EventListSidebar = React.memo(EventListSidebarInner)
