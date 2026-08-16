/**
 * Event List Item — Timeline stop 형태 (2단 구성).
 * FSD: widgets/event-list-compact/ui
 *
 * 디자인 원칙
 *  - "카드 박스" 아님. 좌측 축을 따라 흐르는 평면 행. 행 단위 도트는 폐지됐고(배치 C1)
 *    축 위 눈금은 세기·연도 앵커만 남는다.
 *  - **단일 행**: [월·일][카테고리 칩][제목][기간][국기][액션]을 한 줄에 좌측 밀착.
 *    제목(flex:0 1 auto+ellipsis) 뒤에 메타가 바로 붙어 '죽은 여백' 없이 스캔되고,
 *    남는 우측은 예측 가능한 여백(Body max-width로 읽기 컬럼 제한).
 *  - 중요도(★) 표시는 제거됨 — 데이터 출처가 없다(아래 주석 참고).
 *  - depth > 0 (하위 사건)는 들여쓰기로만 구별한다(레일 커넥터는 배치 C1에서 폐지).
 */
import React from 'react'

import {
  FiBookmark,
  FiChevronRight,
  FiCornerLeftUp,
  FiFlag,
  FiLayers,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { type IsoDateParts, parseIsoDateParts } from '@/shared/lib/iso-date'

import { rowGridTemplate } from '../../../pages/events/styles/list.styles'
import {
  CATEGORY_SOFT_COLORS,
  CONTROL,
  LIST_STEPS,
  MOTION,
  focusRingInset,
  focusRingOnTinted,
  metaText,
  rowHairline,
} from '../../../pages/events/styles/theme'
import {
  getAnchorBadgeLabel,
  getEventDescendantCount,
  isSoloRootEvent,
} from '@/features/event-hierarchy/model/anchor'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

interface EventListItemProps {
  node: EventHierarchyNode
  event: HistoricalEvent
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  /** 최상위(앵커) 배지 클릭 — 그 사건 아래로 카탈로그 모수를 좁힌다. 없으면 정적 표기. */
  onEnterAnchorScope?: (eventId: string) => void
  /** 직계 자식 수 — 접었을 때 무엇이 숨는지 알려주는 배지 */
  childCount?: number
  /** 필터 때문에 숨겨진 직계 자식 수 — 조용한 누락 방지 */
  hiddenChildCount?: number
  /**
   * 이 행의 **상위 사건 앵커** — 부모가 이 행과 *다른 연 밴드*에 놓였을 때만 채워진다.
   *
   * 자식은 보통 부모 바로 아래 붙지만, ⑴ 필터가 걸리면 매칭 자식이 자기 연도 밴드로
   * 옮겨 가고(DATA-9) ⑵ 세기 칩 하나에 16~27행이 그렇게 이동한다. 그러면 화면에는
   * 부모 없이 들여쓰기만 남은 행이 서고, 바로 위 행은 무관한 사건이다(검토 IDX-7).
   * 계보를 말하는 텍스트가 목록 행에 하나도 없었기 때문에(부모 이름 0회) 그 행이
   * 무엇의 하위인지 알 방법이 없었다.
   */
  anchorParent?: { id: string; title: string; year: number | null } | null
  /** 트리에서의 부모 노드 id — ← 키가 부모 행으로 올라갈 때 쓴다(최상위는 null) */
  parentNodeId?: string | null
  /**
   * 이 행 자체가 현재 필터를 만족하는가. false = '매칭된 후손이 있어 문맥용으로만 남은 부모'.
   * 이 값이 화면에 반영되지 않으면 헤더 '조건 일치 12건'과 목록 18행의 차이를 설명할
   * 시각 단서가 전혀 없어, 사용자는 필터가 새는 것으로 읽는다.
   */
  isMatch?: boolean
  isActive: boolean
  dbCategories: EventCategoryDto[]
  isBookmarked?: boolean
  /** 활성 검색어 — Title에서 매칭 부분 노란 배경 */
  searchQuery?: string
  /**
   * 이 행이 속한 연도 그룹의 연도. 행의 연도가 이 값과 같으면 연도가 이미 그룹 헤더에
   * 표시돼 중복이므로, 선두 토큰을 월·일(정밀도 확정 시)로 대체하거나 생략한다.
   * '연도 미상' 섹션·평면 뷰의 다른 해 항목은 null → 연도를 그대로 표시.
   */
  groupYear?: number | null
  /**
   * 이 행이 속한 연도 그룹에 **시각 헤더가 없는가**(1행짜리 버킷).
   * 헤더가 연도를 말해 주지 않으므로 행이 연도를 되살려 'YYYY.M.D'로 표시한다.
   */
  groupHeaderless?: boolean
  /**
   * 좁은 폭(≤640px) 여부. 목록이 **한 번만** 계산해 내려준다 — 행마다 useMediaQuery를
   * 부르면 matchMedia 리스너가 행 수만큼(수백 개) 생긴다.
   * 폭이 모자란 곳에서 무엇을 먼저 포기할지(국기 개수·자식 수 배지)를 결정한다.
   */
  isNarrow?: boolean
  /**
   * 관련국 칩 최대 개수 — 목록이 대역별로 계산해 내려준다.
   * CSS로는 개수를 못 자르고, 폭만 자르면 글리프 중간에서 절단돼
   * '이탈'·'그레이트' 같은 존재하지 않는 국가명이 만들어진다.
   */
  flagMax?: number
  /** 계층 깊이(1-base) — 하위 사건이 최상위와 똑같이 읽히지 않게 한다 */
  ariaLevel?: number
  /** 같은 연도 그룹 안에서의 위치/크기 — 스크린리더가 '3 / 12'를 읽어 준다 */
  positionInSet?: number
  setSize?: number
  /**
   * 목록의 단일 탭 정지점인가(로빙 tabindex).
   * 전 행이 tabIndex=0이면 238개의 정지점이 생겨 목록 아래로 키보드 이동이 불가능해진다.
   */
  isRovingTarget?: boolean
  /**
   * id 기반 콜백 — 상위(CompactList)가 *안정* 참조를 그대로 넘길 수 있어 React.memo가
   * 실효를 낸다(행마다 인라인 화살표를 만들면 memo가 매번 무력화됨).
   */
  onSelect: (id: string) => void
  onToggleExpansion: (id: string) => void
  onShowSummary: (id: string) => void
  onToggleBookmark?: (id: string) => void
}

/**
 * 검색어 매칭 부분 강조 — case-insensitive split. 빈 query/매칭 없음 시 그대로 반환.
 * 한국어·영문 혼합 안전 (lower-case 비교). 정규식 메타 문자 escape.
 */
function highlightMatches(text: string, query: string | undefined) {
  if (!query) return text
  const q = query.trim()
  if (!q) return text
  // regex 메타 escape
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  // String.split with capturing group → 매칭은 홀수 인덱스에 위치
  const parts = text.split(re)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Mark key={i}>{part}</Mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  )
}

/**
 * 중요도(importance) 시각 위계는 **제거됐다**(2026-07-28 검토 M9).
 *
 * 데이터 출처가 없기 때문이다 — Event 스키마·응답 DTO 어디에도 importance 필드가
 * 없고, transformer가 모든 사건에 `'notable'`을 하드코딩한다. 그래서 별(★★/★★★)은
 * 한 번도 렌더된 적이 없고, 제목 3단 크기·도트 3단 크기·헤더 '핵심 N·주요 N' 칩도
 * 전부 상수 분기였다. 실재하지 않는 신호를 지우고 고정값으로 단순화한다.
 *
 * 나중에 importance를 진짜 필드로 도입한다면 이 주석을 지우고 위계를 되살릴 것.
 */

/**
 * 기간 포맷 — ISO 구성요소(부호 연도 포함) 기반 borrow 차분. BC 음수 연도에서도
 * NaN 없이 동작한다(네이티브 Date는 `-0044-..`를 Invalid Date로 만들어 기간이 깨졌음).
 * 월/일 borrow는 30일 근사 — 일 단위 정밀도가 필요한 화면이 아니므로 충분.
 */
const formatDuration = (
  start: IsoDateParts | null,
  end: IsoDateParts | null,
  startPrecision?: string | null,
  endPrecision?: string | null,
): string => {
  if (!start) return ''
  /**
   * 정밀도가 '일'이 아닌 쪽이 하나라도 있으면 **월·일 차분을 하지 않는다**(검토 IA-11).
   *
   * 서버는 월·일이 없는 사건을 `month ?? 1, day ?? 1`로 재구성해 내려보낸다. 그 sentinel을
   * 그대로 빼면 없는 정보를 지어낸다 — 양끝이 연 정밀도면 동일 비교에 걸려 '1일'이 되고,
   * 한쪽만 일 정밀도면 '3년 5개월'처럼 sentinel이 만든 월 단위가 튀어나온다.
   * 같은 파일이 시작일 토큰에는 이미 precision 가드와 01-01 sentinel 가드를 쓰고 있었다.
   */
  const dayPrecise = (precision?: string | null) =>
    precision == null || precision === 'day'
  if (!dayPrecise(startPrecision) || !dayPrecise(endPrecision)) {
    const years = end && start ? end.year - start.year : 0
    if (!end) return ''
    if (years <= 0) return ''
    return `약 ${years}년`
  }
  // 종료 정보가 *없는* 것과 '당일 종료'는 다른 사실이다. 예전엔 둘을 같은 '1일'로
  // 합쳐, 종료 시점이 기록되지 않은 지속 상태(예: 공급 중단)까지 하루짜리 사건으로
  // 단정했다 — 실측상 전체 행의 절반이 이 잉여 토큰을 달고 있었다. 미상은 토큰을
  // 생략해 제목 폭을 돌려준다(2026-07-28 검토 LD-5/DATA-4).
  if (!end) return ''
  if (
    end.year === start.year &&
    end.month === start.month &&
    end.day === start.day
  )
    return '1일'
  let years = end.year - start.year
  let months = end.month - start.month
  let days = end.day - start.day
  if (days < 0) {
    months -= 1
    days += 30
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years > 0) return months > 0 ? `${years}년 ${months}개월` : `${years}년`
  if (months > 0) return days > 0 ? `${months}개월 ${days}일` : `${months}개월`
  return `${Math.max(1, days)}일`
}

/**
 * 제목에 검색어가 없을 때 **왜 이 행이 결과에 있는지**를 보여주는 2차 토큰.
 *
 * 매칭 술어는 제목·설명·키워드 3필드를 보는데 행이 렌더하는 건 제목 하이라이트뿐이라,
 * '조약'으로 검색하면 제목에 그 단어가 없는 행들이 아무 표시 없이 섞여 나왔다 —
 * 왜 걸렸는지 확인하려면 행마다 드로어를 열어야 했다(검토 CR-3).
 * 설명에서 매칭 주변만 잘라 보여주고, 설명에도 없으면 매칭된 키워드를 보여준다.
 */
function buildMatchReason(
  node: EventHierarchyNode,
  event: HistoricalEvent,
  query: string | undefined,
): { kind: '설명' | '키워드'; text: string } | null {
  const term = query?.trim().toLowerCase()
  if (!term) return null
  if (node.title.toLowerCase().includes(term)) return null // 제목에 이미 보인다

  const summary = node.summary || event.description || ''
  const at = summary.toLowerCase().indexOf(term)
  if (at >= 0) {
    const from = Math.max(0, at - 20)
    const to = Math.min(summary.length, at + term.length + 20)
    const snippet = `${from > 0 ? '…' : ''}${summary.slice(from, to).trim()}${to < summary.length ? '…' : ''}`
    return { kind: '설명', text: snippet }
  }

  const hitKeyword = (event.keywords ?? []).find((keyword) =>
    keyword.toLowerCase().includes(term),
  )
  if (hitKeyword) return { kind: '키워드', text: hitKeyword }
  return null
}

/** 요약 열이 실제로 글자를 실을 수 있는 최소 잔량. 이보다 짧으면 열지 않는다. */
const SNIPPET_MIN_CHARS = 30
/**
 * 싱크(요약) 셀의 잉크 상한.
 *
 * 160자는 앱 폰트 실측 약 8.67px/자 기준 1,388px에서 끝나, 전폭 3440에서 요약 트랙
 * (약 1,594px) **안쪽에** 확정 공백을 만든다 — 캡을 없애 되찾은 폭이 다시 죽는다.
 * 220자 ≈ 1,907px라 전 대역을 덮는다. 비용은 행당 최대 60자 추가(전체 약 16KB 텍스트
 * 노드)뿐이고, 한 줄 말줄임이라 레이아웃 비용은 0이다.
 */
const SNIPPET_MAX_CHARS = 220

/**
 * 등록 시각의 상대 표기 — 열 사다리 step 3의 `[reg]` 셀.
 *
 * 상대 표기를 쓰는 이유는 폭이다: 절대 시각은 96px 트랙에 못 들어가고, 이 열이 답하는
 * 질문은 "정확히 언제 넣었나"가 아니라 "최근인가"다. 절대 시각은 title 속성이 담는다.
 */
function formatRegisteredAt(
  isoValue: string | null | undefined,
): { label: string; title: string } | null {
  if (!isoValue) return null
  const registered = new Date(isoValue)
  if (Number.isNaN(registered.getTime())) return null
  const elapsedDays = Math.floor((Date.now() - registered.getTime()) / 86_400_000)
  const label =
    elapsedDays <= 0
      ? '오늘'
      : elapsedDays < 7
        ? `${elapsedDays}일 전`
        : elapsedDays < 35
          ? `${Math.floor(elapsedDays / 7)}주 전`
          : elapsedDays < 365
            ? `${Math.floor(elapsedDays / 30)}개월 전`
            : `${Math.floor(elapsedDays / 365)}년 전`
  return { label, title: registered.toLocaleString('ko-KR') }
}

/**
 * 넓은 카드의 `[sum]` 요약 열 텍스트.
 *
 * 설명 앞머리에는 제목·날짜 토큰과 겹치는 선두 날짜가 흔하다("1592년 4월 13일, 왜군이…").
 * 그 부분은 행이 이미 date 트랙에서 말하고 있으므로 잘라낸다. 다만 **행의 시작 연도와
 * 실제로 일치할 때만** 자른다 — 설명이 다른 해를 언급하며 시작하는 경우(배경 서술)는
 * 중복이 아니라 정보다. 자른 뒤 남는 게 너무 짧으면 자르기 자체를 포기한다.
 */
function buildSnippet(
  node: EventHierarchyNode,
  event: HistoricalEvent,
  startYear: number | null,
): string | null {
  const source = (node.summary || event.description || '').replace(/\s+/g, ' ').trim()
  if (!source) return null

  let text = source
  const leadingDate = text.match(
    /^(기원전\s*)?(\d{1,4})\s*년(\s*\d{1,2}\s*월)?(\s*\d{1,2}\s*일)?\s*[,·\-—:]?\s*/,
  )
  if (leadingDate && startYear !== null) {
    const year = Number(leadingDate[2]) * (leadingDate[1] ? -1 : 1)
    const rest = text.slice(leadingDate[0].length).trim()
    if (year === startYear && rest.length >= SNIPPET_MIN_CHARS) text = rest
  }

  if (text.length < SNIPPET_MIN_CHARS) return null
  return text.length > SNIPPET_MAX_CHARS
    ? `${text.slice(0, SNIPPET_MAX_CHARS).trimEnd()}…`
    : text
}

const EventListItemImpl: React.FC<EventListItemProps> = ({
  node,
  event,
  depth,
  isExpanded,
  hasChildren,
  onEnterAnchorScope,
  childCount = 0,
  hiddenChildCount = 0,
  anchorParent = null,
  parentNodeId = null,
  isMatch = true,
  isActive,
  dbCategories,
  isBookmarked = false,
  searchQuery,
  groupYear,
  groupHeaderless = false,
  isNarrow = false,
  flagMax = 3,
  ariaLevel,
  positionInSet,
  setSize,
  isRovingTarget = true,
  onSelect,
  onToggleExpansion,
  onShowSummary,
  onToggleBookmark,
}) => {
  const startParts = parseIsoDateParts(node.period.start)
  const endParts = node.period.end ? parseIsoDateParts(node.period.end) : null
  /**
   * 행 선두 시간 토큰. 연도가 그룹 헤더('YYYY년')와 같으면 중복이라 월·일(정밀도가
   * 'day'/'month'로 *확정*된 경우만)로 대체하고, 연도만 아는 경우(precision 미확정·'year')는
   * 생략해 divider에 위임한다. 그룹과 다른 해(평면 뷰·미상 섹션)는 연도를 그대로 노출.
   * ⚠️ 연도만 아는 이벤트가 01-01로 저장될 수 있어, precision이 명시적으로 'day'일 때만 월.일.
   */
  /**
   * 이 행의 시간 토큰이 그룹 헤더와 *다른* 해를 가리키는가.
   * (평면 뷰의 타 연도·'연도 미상' 섹션·BC 표기) — 좁은 폭에서도 숨기면 안 된다.
   */
  /**
   * 이 행의 시간 토큰이 그룹 헤더와 *다른* 해를 가리키는가 — 괄호로 신호한다.
   * ⚠️ BC는 제외한다. 'BC' 접두사 자체가 이미 다른 축이라는 신호라 괄호는 중복이고,
   * 괄호 2자가 날짜 열 예산을 또 잠식한다.
   */
  const isOffGroupYear =
    !!startParts &&
    startParts.year >= 0 &&
    (groupYear == null || startParts.year !== groupYear)
  const rowDateLabel = (() => {
    if (!startParts) return '미상'
    /**
     * BC는 행에서 **축약**한다. '기원전 1046'은 11자(~72px)로 날짜 열 예산(66px)을
     * 넘겨 그 초과분을 제목이 전부 떠안았다 — 고대사가 이 앱의 주요 콘텐츠라
     * 데이터가 들어오는 순간 좁은 대역 전체에서 발현한다.
     * 전체 표기는 title 속성이 유지한다.
     */
    if (startParts.year < 0) return `BC ${Math.abs(startParts.year)}`
    if (groupYear != null && startParts.year === groupYear) {
      const precision = event.startDatePrecision
      /**
       * 시각 헤더가 없는 연도(1행 버킷)는 연도를 **행이 되살린다**.
       * 헤더를 지우고도 월·일만 남기면 '7.27'만 보이는 미아 행이 된다.
       */
      const yearPrefix = groupHeaderless ? `${startParts.year}.` : ''
      if (precision === 'year') return groupHeaderless ? `${startParts.year}` : ''
      if (precision === 'month')
        return groupHeaderless
          ? `${startParts.year}.${startParts.month}`
          : `${startParts.month}월`
      // 'day' 또는 precision 미기록(대부분 실제 월·일 보유) → 월.일.
      // 단 01-01은 연도만 아는 값이 sentinel로 저장된 것일 수 있어(BC·고대 재구성 등) 생략.
      if (startParts.month === 1 && startParts.day === 1)
        return groupHeaderless ? `${startParts.year}` : ''
      return `${yearPrefix}${startParts.month}.${startParts.day}`
    }
    /**
     * 그룹 헤더와 다른 해 — 예전엔 연도만 돌려줘 월·일이 통째로 사라졌다(검토 IDX-4).
     * 1875년 밴드는 날짜 열이 '(1878)(1878)(1877)(1877)(1877)(1876)×5'로 찍혀,
     * 같은 괄호 연도 안의 선후를 알 단서가 화면에 하나도 없었다(실제 값은 1877-04-24 /
     * 01-15 / 12-13). 월까지 되살리면 그 순서가 읽힌다.
     *
     * 일(day)까지는 넣지 않는다 — '1877.4.24'는 9자로 날짜 열 예산(cozy 66px)을 넘겨
     * 초과분을 제목이 떠안는다(BC 축약이 같은 이유로 도입됐다). 정밀한 전체 값은
     * 아래 title 속성이 유지한다.
     */
    const precision = event.startDatePrecision
    if (precision === 'year') return `${startParts.year}`
    if (startParts.month === 1 && startParts.day === 1)
      return `${startParts.year}`
    return `${startParts.year}.${startParts.month}`
  })()
  /** 날짜 열의 전체 값 — 열 예산 때문에 축약된 토큰(BC·off-group)의 원본. */
  const rowDateTitle = (() => {
    if (!startParts) return undefined
    const era = startParts.year < 0 ? '기원전 ' : ''
    const yearText = `${era}${Math.abs(startParts.year)}년`
    const precision = event.startDatePrecision
    if (precision === 'year') return yearText
    if (precision === 'month') return `${yearText} ${startParts.month}월`
    if (startParts.month === 1 && startParts.day === 1) return yearText
    return `${yearText} ${startParts.month}월 ${startParts.day}일`
  })()
  const matchReason = buildMatchReason(node, event, searchQuery)
  /**
   * 앵커(최상위 사건) 표기 — 판정은 `features/event-hierarchy/model/anchor.ts` 단일출처.
   *
   * ⚠️ 모수를 `childCount`(직계만)로 바꾸지 말 것. 그러면 손자를 가진 사건의 배지가
   * 실제 서브트리 크기보다 작게 찍혀, 지면마다 다른 것을 세던 원래 문제로 되돌아간다
   * (검토 근인 4). depth로 최상위를 판정하지 않는 이유도 같다 — 필터가 걸리면
   * 자식 행이 depth 0으로 승격된다.
   */
  const anchorBadgeLabel = getAnchorBadgeLabel(event)
  const anchorDescendantCount = getEventDescendantCount(event)
  const isSolo = isSoloRootEvent(event)
  /* 넓은 카드에서만 그려진다(CSS 컨테이너 쿼리). 문자열 계산은 좁은 카드에서도 돌지만
     행당 정규식 2회·slice 2회라 252행 기준 무시할 수 있다 — 대신 폭 판정을 JS로 끌고 와
     ResizeObserver를 다는 것보다 훨씬 싸다. */
  const snippet = buildSnippet(node, event, startParts?.year ?? null)
  const duration = formatDuration(
    startParts,
    endParts,
    event.startDatePrecision,
    event.endDatePrecision,
  )
  const categoryName = getCategoryName(event.category, dbCategories)
  /**
   * 관련국 칩 개수 — **폭 예산**으로 정한다. 개수만으로는 안 된다.
   *
   * 현대 국가는 이모지 한 글자(약 26px)지만 역사국가는 이모지가 없어 국가명 전체가
   * 텍스트 칩이다. 같은 3개라도 앞은 78px, 뒤는 240px를 먹는다. 개수를 고정하면
   * 텍스트 칩 3개가 128px 트랙에 욱여넣어져 전부 '오…', '러…'로 잘려 아무것도
   * 식별할 수 없게 된다 — 잘림이 없어졌을 뿐 정보는 여전히 0이다.
   * 텍스트 칩이 섞여 있으면 개수를 줄여 남는 칩이 읽히게 한다.
   */
  const hasTextChips = (event.relatedHistoricalCountries?.length ?? 0) > 0
  const effectiveFlagMax = hasTextChips ? Math.min(flagMax, 2) : flagMax
  /* 키워드 열(step 2) — 검색 중에는 매칭된 키워드를 첫 칩으로 올린다. '왜 이 행이 결과에
     있는가'를 말하는 계약(CR-3)과 같은 방향이다. */
  const searchTerm = searchQuery?.trim().toLowerCase()
  const allKeywords = event.keywords ?? []
  const orderedKeywords = searchTerm
    ? [...allKeywords].sort(
        (left, right) =>
          Number(right.toLowerCase().includes(searchTerm)) -
          Number(left.toLowerCase().includes(searchTerm)),
      )
    : allKeywords
  const visibleKeywords = orderedKeywords.slice(0, 2)
  const hiddenKeywordCount = Math.max(
    0,
    orderedKeywords.length - visibleKeywords.length,
  )
  /* 등록 시각 열(step 3) */
  const registeredAt = formatRegisteredAt(event.createdAt)
  // 카테고리 hue는 이제 **칩이 단독으로** 싣는다(행 도트 폐지, 배치 C1).
  // 원색 텍스트는 WCAG AA 미달이라 저채도 soft chip으로.
  const soft =
    CATEGORY_SOFT_COLORS[event.category as keyof typeof CATEGORY_SOFT_COLORS] ??
    CATEGORY_SOFT_COLORS.other

  return (
    <Stop
      $active={isActive}
      $depth={depth}
      $context={!isMatch}
      /* depth를 인라인 CSS 변수로 넘긴다 — styled prop이면 depth마다 클래스가 생성돼
         252행에서 클래스 캐시가 부풀고 React.memo 이득이 깎인다. */
      style={{ '--depth': depth } as React.CSSProperties}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => {
        // 키보드 네비 — Enter/Space로 행 선택. ↑↓ 이동·펼치기는 상위 catalog hook에서 처리
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.id)
        }
      }}
      // 로빙 tabindex — 목록 전체가 정지점 하나. 그 안 이동은 ↑↓가 담당한다.
      tabIndex={isRovingTarget ? 0 : -1}
      role="listitem"
      aria-level={ariaLevel}
      aria-posinset={positionInSet}
      aria-setsize={setSize}
      aria-current={isActive ? 'true' : undefined}
      data-event-id={node.id}
      {...
      /**
       * 트리 키(←/→)가 읽는 계층 상태 — 모델 배열이 아니라 **DOM**에 싣는다.
       * ↑↓ 내비가 이미 '렌더된 행'을 DOM에서 뽑는 규약이라(접힌 밴드의 행은 애초에
       * DOM에 없다), 같은 판정 근거를 쓰면 두 키가 서로 다른 집합을 보는 일이 없다.
       */
      {
        'data-parent-id': parentNodeId ?? undefined,
        'data-can-expand': hasChildren ? 'true' : undefined,
        'data-expanded': hasChildren
          ? isExpanded
            ? 'true'
            : 'false'
          : undefined,
      }}
      data-active={isActive ? 'true' : undefined}
    >
      {/* 6트랙 원장 격자 — [날짜][분류][제목][기간][국가][액션].
       *
       * 이전 구조는 flex 좌측 밀착이었다. 각 행의 Body가 자기만의 flex 컨테이너라
       * 열 축이라는 것이 아예 존재하지 않았고, 열이 겹쳐 보이는 건 우연이었다 —
       * 실측 제목 좌측 x 11종(219~265) · 기간 x 157종 · 국기 x 161종.
       * 폭 고정 트랙 5개 + minmax(0,1fr) 하나로 전 행·전 그룹 공통 축을 만든다. */}
      <Body>
        <Year
          data-offgroup={isOffGroupYear ? 'true' : undefined}
          title={rowDateTitle}
        >
          {rowDateLabel}
        </Year>
        <CategoryLabel
          $rgb={soft.rgb}
          $text={soft.text}
          $textDark={soft.textDark}
        >
          {categoryName}
        </CategoryLabel>

        {/* 제목 셀 = [들여쓰기][디스클로저][텍스트] 3열 서브격자.
         *
         * 계층 들여쓰기를 **제목 셀 안에** 가둔다. 예전처럼 행 전체를 밀면 날짜·분류·기간·
         * 국기·액션까지 22px씩 따라 움직여, 계층과 무관한 축들이 depth에 오염됐다
         * (액션 우측 끝이 985/1007로 갈리던 문제). 이제 depth가 바꾸는 것은 제목 텍스트
         * 시작점 하나뿐이다. */}
        <TitleCell $spanSummary={!snippet && !matchReason}>
          <Indent aria-hidden="true" $depth={depth} />
          {hasChildren ? (
            <Disclosure
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onToggleExpansion(node.id)
              }}
              $expanded={isExpanded}
              // 로빙 tabindex는 행 안의 액션에도 적용된다 — 아니면 행 238개 × 액션 2개가
              // 그대로 탭 정지점으로 남아 목록을 빠져나가는 데 수백 번이 필요하다.
              tabIndex={isRovingTarget ? 0 : -1}
              aria-expanded={isExpanded}
              /* 이름을 **자족시킨다**(검토 A11Y-9). 390px 브라우즈 모드에서는
                 '9.22 → 전쟁 → 하위 사건 18개 펼치기 → 1차세계대전' 순으로 낭독돼
                 버튼 이름만 들은 시점에는 무엇의 하위인지 알 수 없었다.
                 ⚠️ DOM 순서를 바꿔 해결하지 말 것 — 데스크톱 3열 서브격자가 깨진다. */
              aria-label={
                childCount > 0
                  ? `${node.title} — 하위 사건 ${childCount}개 ${
                      isExpanded ? '접기' : '펼치기'
                    }`
                  : `${node.title} — ${isExpanded ? '접기' : '하위 사건 펼치기'}`
              }
            >
              <FiChevronRight size={11} aria-hidden="true" />
              {/* 자식 수를 셰브론과 한 컨트롤로 합친다. 예전에는 셰브론(x=105)·자식수
                  배지(제목 뒤 가변 x)·요약 버튼(x=919)이 한 개념을 행의 세 지점에서
                  말했고, 배지가 제목과 기간 사이에 끼어들어 메타 x를 한 번 더 흔들었다.
                  aria-hidden — 같은 수치가 이 버튼의 aria-label에 이미 있다. */}
              {/* 좁은 폭에서도 숨기지 않는다 — 모바일 LIST가 기본 진입인 대역인데,
                  거기서만 자식 수가 사라져 '하위가 있다'는 유일한 수치 신호가 없었다
                  (검토 DISC-5). 셰브론이 메타 줄로 내려가도 숫자는 함께 간다. */}
              {childCount > 0 && (
                <DiscCount aria-hidden="true">{childCount}</DiscCount>
              )}
            </Disclosure>
          ) : (
            <DiscSpacer aria-hidden="true" />
          )}
          <TitleText>
            <Title data-row-title="">
              {highlightMatches(node.title, searchQuery)}
            </Title>
            {/* 최상위(앵커) 배지 — 루트만 '최상위 사건'이라 부르고, 상위가 있는 앵커는
                '하위 N건'으로 표기한다. '상위가 있는 최상위 사건'이라는 자기모순 라벨을
                만들지 않기 위한 규약(사용자 결정 2026-08-11). 판정·문구는 전부
                features/event-hierarchy/model/anchor.ts 단일출처. */}
            {anchorBadgeLabel &&
              (onEnterAnchorScope ? (
                /* 배지가 곧 조망 진입점 — 별도 지면을 만들지 않고 같은 카탈로그의
                   모수를 좁힌다. 행 클릭(상세 이동)과 구분되도록 전파를 끊는다. */
                <AnchorBadge
                  as="button"
                  type="button"
                  tabIndex={isRovingTarget ? 0 : -1}
                  aria-label={`'${node.title}' 아래 하위 사건 ${anchorDescendantCount}건만 보기`}
                  title={`하위 사건 ${anchorDescendantCount}건 — 눌러서 이 사건 아래만 보기`}
                  onClick={(clickEvent: React.MouseEvent<HTMLElement>) => {
                    clickEvent.stopPropagation()
                    onEnterAnchorScope(node.id)
                  }}
                >
                  <FiFlag size={9} aria-hidden="true" />
                  {anchorBadgeLabel}
                </AnchorBadge>
              ) : (
                <AnchorBadge
                  title={`하위 사건 ${anchorDescendantCount}건을 가진 사건`}
                >
                  <FiFlag size={9} aria-hidden="true" />
                  {anchorBadgeLabel}
                </AnchorBadge>
              ))}
            {/* 하위가 하나도 없는 최상위 — 한 톤 물러나 앵커에 자리를 내준다. */}
            {isSolo && <SoloToken>· 단독</SoloToken>}
            {matchReason && (
              <MatchReason
                title={`${matchReason.kind} 일치: ${matchReason.text}`}
              >
                <MatchReasonKind>{matchReason.kind}</MatchReasonKind>
                {highlightMatches(matchReason.text, searchQuery)}
              </MatchReason>
            )}
            {/* 부모가 다른 밴드로 갈라져 나가 화면에서 인접하지 않을 때만 계보를 밝힌다.
                부모가 바로 위 행이면 칩은 순수한 중복이고, 1914년처럼 자식 18행이
                이어지는 구간에서 매 행에 붙으면 밀도만 잡아먹는다(검토 IDX-7). */}
            {anchorParent && (
              <AnchorChip
                type="button"
                tabIndex={isRovingTarget ? 0 : -1}
                aria-label={`상위 사건 ${anchorParent.title}${
                  anchorParent.year !== null
                    ? ` (${anchorParent.year}년 그룹)`
                    : ''
                }로 이동`}
                title={`상위 사건 — ${anchorParent.title}`}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation()
                  onSelect(anchorParent.id)
                }}
              >
                <FiCornerLeftUp size={10} aria-hidden="true" />
                <AnchorChipText>{anchorParent.title}</AnchorChipText>
              </AnchorChip>
            )}
            {/* 접힌 부모는 '무엇이 몇 건 숨어 있는지'를 **문장으로** 말한다(검토 DISC-5).
                셰브론 옆 숫자 배지만으로는 그것이 하위 사건 수라는 게 전달되지 않고,
                좁은 폭에서는 배지가 제목 줄을 떠나 메타 줄로 내려가 더 멀어진다. */}
            {hasChildren && !isExpanded && childCount > 0 && (
              <FilteredOutHint
                as="button"
                type="button"
                tabIndex={isRovingTarget ? 0 : -1}
                aria-label={`하위 사건 ${childCount}건 펼치기`}
                onClick={(event: React.MouseEvent<HTMLElement>) => {
                  event.stopPropagation()
                  onToggleExpansion(node.id)
                }}
              >
                하위 {childCount}건 접힘
              </FilteredOutHint>
            )}
            {/* 필터로 잘려나간 자식이 있으면 조용히 사라진 것처럼 보이지 않게 알린다.
                시각 텍스트가 '조건 밖 N'이던 시절엔 그 N이 **하위 사건** 수라는 사실이
                title 속성에만 있었다 — 터치·키보드에는 뜨지 않는 자리다(검토 DISC-9).
                문맥 행(자기 자신은 조건 불일치)은 그 사실까지 함께 말한다(검토 FILT-5). */}
            {hiddenChildCount > 0 && (
              <FilteredOutHint
                as="button"
                type="button"
                tabIndex={isRovingTarget ? 0 : -1}
                /* 정보만 주고 되돌릴 수단이 없던 막다른 안내를 행동 가능하게(검토 INT-10).
                   title 속성은 터치·키보드에 안 뜨므로 aria-label로 설명을 옮긴다. */
                aria-label={`${
                  isMatch ? '' : '이 사건은 조건 불일치 — '
                }현재 필터 조건 밖의 하위 사건 ${hiddenChildCount}개 — 눌러서 이 사건의 계층 전체 보기`}
                title={`현재 필터 조건 밖의 하위 사건 ${hiddenChildCount}개 — 눌러서 계층 전체 보기`}
                onClick={(event: React.MouseEvent<HTMLElement>) => {
                  event.stopPropagation()
                  onShowSummary(node.id)
                }}
              >
                {isMatch ? '하위' : '문맥 · 하위'} {hiddenChildCount}건 조건 밖
              </FilteredOutHint>
            )}
          </TitleText>
        </TitleCell>

        {/**
         * 요약 — 넓은 카드 전용 신축 열. 좁은 카드·모바일에서는 박스를 만들지 않는다.
         * aria-hidden이 아닌 이유: 스크린리더에도 실제로 값이 있는 텍스트다.
         *
         * 검색 중이면 설명 앞머리가 아니라 **매칭 근거**를 싣는다. 둘 다 설명에서 오지만
         * 답하는 질문이 다르다 — 앞머리는 "무슨 사건인가", 근거는 "왜 이 행이 결과에
         * 있는가"다. 검색 결과의 76%가 제목에 검색어가 없는 행이라, 검색 중에 근거를
         * 앞머리로 덮으면 CR-3이 고쳤던 '왜 걸렸는지 알 수 없는 목록'으로 되돌아간다.
         */}
        {(matchReason || snippet) && (
          <Snippet
            data-row-summary=""
            title={
              matchReason
                ? `${matchReason.kind} 일치: ${matchReason.text}`
                : (snippet ?? undefined)
            }
          >
            {matchReason ? (
              <>
                <MatchReasonKind>{matchReason.kind}</MatchReasonKind>{' '}
                {highlightMatches(matchReason.text, searchQuery)}
              </>
            ) : (
              snippet
            )}
          </Snippet>
        )}

        {/* 키워드 — 열 사다리 step 2 전용. aria-hidden인 이유: 키워드 정본은 상세 패널이
            말하고, 행 낭독을 3배로 늘리지 않는다(스크린리더에 제목·날짜·분류가 먼저다). */}
        {visibleKeywords.length > 0 && (
          <KeywordCell aria-hidden="true">
            {visibleKeywords.map((keyword) => (
              <KeywordChip key={keyword} title={keyword}>
                {keyword}
              </KeywordChip>
            ))}
            {hiddenKeywordCount > 0 && (
              <KeywordMore>+{hiddenKeywordCount}</KeywordMore>
            )}
          </KeywordCell>
        )}

        {/* 모바일 2줄 행의 강제 개행 지점 — 데스크톱 격자에서는 display:none이라 무영향 */}
        <RowBreak aria-hidden="true" />

        {/* 기간 — 우측 정렬 고정 열. 실측 252행 중 133행(53%)이 '1일'이라 텍스트로 두면
            반복 노이즈지만, '종료 확정'과 '종료 미상'은 다른 사실이라 지울 수도 없다.
            당일은 점 하나로 눌러 세로로 훑을 때 **지속된 사건만** 튀어나오게 한다.
            formatDuration에는 손대지 않는다(precision 가드 보존). */}
        <Duration data-sameday={duration === '1일' ? 'true' : undefined}>
          {duration === '1일' ? (
            <SrOnly>1일</SrOnly>
          ) : (
            duration
          )}
        </Duration>
        <Flags>
          <CountryFlags
            modern={event.relatedCountries}
            historical={event.relatedHistoricalCountries}
            /* 개수는 대역이 정한다(목록이 1회 계산). 폭만 줄이면 역사국가처럼 이모지가
               없어 국가명 전체가 텍스트 칩인 경우 글리프 중간에서 잘린다. */
            max={effectiveFlagMax}
            size="sm"
            /* 폭 예산 안에서 말줄임 — 글리프 중간 절단으로 없는 국가명이 만들어지던
               것을 막고, '+N'은 어떤 폭에서도 살아남는다. */
            fit
          />
        </Flags>

        {/* 등록 시각 — 열 사다리 step 3 전용. '등록순' 정렬의 근거를 화면에 세운다. */}
        {registeredAt && (
          <RegisteredCell title={`등록 ${registeredAt.title}`}>
            {registeredAt.label}
          </RegisteredCell>
        )}

        <RowActions data-has-bookmark={isBookmarked ? 'true' : undefined}>
          {/* 하위 사건 계층을 손자까지 한눈에 보는 **목록 내 유일한 진입점**이다.
              ⑴ 이름이 '사건 요약 보기'라 그 사실이 전달되지 않았고
              ⑵ `depth === 0` 게이트 때문에 자식을 가진 depth 1 부모(손자 5행의 부모)에는
                 아예 없었다 — 정작 손자를 확인할 곳이 거기다(검토 DISC-6·DEPTH-7).
              게이트를 '자식이 있는가'로 바꾸고 이름을 동작에 맞춘다. */}
          {hasChildren && (
            <IconBtn
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onShowSummary(node.id)
              }}
              tabIndex={isRovingTarget ? 0 : -1}
              title="하위 사건 계층 보기"
              aria-label={`${node.title} — 하위 사건 계층 보기`}
            >
              {/* ⚠️ 브랜치 글리프(FiGitBranch)를 쓰지 말 것 — 계층 신호는 제목 셀의
                  디스클로저가 전담한다. 여기에 같은 글리프를 두면 한 행에서 같은
                  아이콘이 '자식 수'와 '모달 트리거' 두 의미로 갈린다. */}
              <FiLayers size={12} />
            </IconBtn>
          )}
          {onToggleBookmark && (
            <BookmarkBtn
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onToggleBookmark(node.id)
              }}
              $bookmarked={isBookmarked}
              tabIndex={isRovingTarget ? 0 : -1}
              title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              aria-label={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <FiBookmark
                size={13}
                fill={isBookmarked ? 'currentColor' : 'none'}
              />
            </BookmarkBtn>
          )}
        </RowActions>
      </Body>
    </Stop>
  )
}

/**
 * React.memo — 부모(CompactList) 1회 리렌더에 전 행이 재조정되던 비용 차단.
 * props가 모두 원시값/안정 콜백이라 얕은 비교로 충분(콜백은 상위에서 useCallback 안정화).
 */
export const EventListItem = React.memo(EventListItemImpl)

// ─────────────────────────────────────────────────────────────────────────────
// styled — Timeline stop (2-row)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 타임라인 정거장(row) — 2단 구성 컨테이너.
 * - 좌측 레일(CompactList의 left:32px)에 dot + connector를 ::before/::after로 그림.
 * - depth>0 행은 들여쓰기된다(레일 커넥터는 배치 C1에서 폐지).
 * - active state: **좌측 4px 색 막대 + 미세 bg tint**(색 신호 단일화).
 */
const Stop = styled.div<{
  $active: boolean
  $depth: number
  /** 필터 문맥용으로만 남은 행(자기 자신은 조건 불일치) — 매칭 행과 구별해 강등 표시 */
  $context: boolean
}>`
  position: relative;
  display: flex;
  align-items: stretch;
  /* 기하는 전부 밀도 변수(CompactList가 선언) — 리터럴 금지.
   * min-height가 계산값보다 크게 잡혀 있어야 행 높이 고유값이 1종으로 고정된다. */
  min-height: var(--row-min-h);
  padding: var(--row-pad-y) var(--row-pad-r) var(--row-pad-y) var(--row-pad-l);
  /* 데스크톱에서는 행을 밀지 않는다 — 들여쓰기는 제목 셀의 ind 트랙이 전담한다.
     모바일(격자 미적용)에서만 예전처럼 행 전체를 민다. */
  margin-left: 0;
  cursor: pointer;

  @media (max-width: 640px) {
    margin-left: min(calc(var(--row-indent) * var(--depth, 0)), 72px);
  }

  /* 문맥용 부모 행 강등 — 이 행 자체는 조건 불일치이고 '매칭된 자식이 아래에 있어서'
   * 남아 있을 뿐이다. 강등이 없으면 '조건 일치 12건'인데 18행이 똑같은 무게로 보여
   * 필터가 새는 것처럼 읽힌다. 숨기지 않는 이유는 계층 문맥이 필요하기 때문.
   *
   * ⚠️ blanket opacity(0.62)를 쓰지 않는다. 두 가지가 잘못됐었다.
   *  ① 행 전체를 반투명하게 만들어 metaText가 2.39:1로 떨어졌다 — 강등이 아니라 AA 위반을
   *     새로 만들고 있었다.
   *  ② hover·focus에서 해제했는데, 키보드 ↑↓ 내비는 선택과 포커스를 함께 옮기므로
   *     사용자가 그 행을 보는 순간 강등이 사라졌다 = 신호가 한 번도 안 보였다.
   * 제목의 굵기·색만 낮추고 상태로 해제하지 않는다. */
  ${({ $context, theme }) =>
    $context &&
    css`
      [data-row-title] {
        font-weight: 500;
        color: ${theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'};
      }
    `}
  /* (제거됨) font-variant-numeric: tabular-nums.
   * 등폭 숫자는 숫자가 세로로 쌓일 때만 값을 한다. 실측상 252행 중 109행(43%)의
   * **제목**이 숫자를 포함하는데, 행 전역 tabular가 그 제목만 최대 7px 넓혀 말줄임
   * 임계를 앞당기고 있었다. 날짜·기간·카운트 열에만 국소 선언한다. */
  transition: background 0.14s ease;

  /* 선택 행으로 스크롤(events.page의 단일 effect)할 때 sticky 헤더에 가려지지 않도록
   * 상단 여백을 확보한다.
   *
   * ⚠️ 사다리는 **3겹**이다: 열 헤더(--col-header-h) → 세기 헤더(--century-header-h)
   * → 연 헤더(--year-h + --year-mt). 예전 값은 세기 헤더 + 리터럴 44px이라 열 헤더 한 단이
   * 빠져 있었고, ↑로 뷰포트 위쪽 행에 도달하면 포커스 행 윗부분 16px이 연 헤더 뒤로 잘렸다
   * (cozy 행 45px의 36% — 검토 A11Y-10). 사다리 토큰의 합으로 바꿔 밴드 밀도를 바꿔도
   * 자동으로 따라오게 한다. 값의 정의는 list.styles.ts의 sticky top 3곳과 같은 출처다. */
  scroll-margin-top: calc(
    var(--col-header-h, 26px) + var(--century-header-h, 44px) +
      var(--year-h, 34px) + var(--year-mt, 16px)
  );
  scroll-margin-bottom: 12px;

  /* 사건 단위 분리 — hairline bottom border. 마지막 행은 자동 제거.
   * YearDivider/CenturyDivider 직전 Stop도 border-bottom 제거(:has(+ button)):
   * divider 자신이 border-top hairline을 그어 트리플 라인 회피.
   * 값은 rowHairline 토큰이 소유한다 — 스켈레톤이 같은 값을 읽어야 로딩→데이터에서
   * 선 굵기가 안 튄다. 전폭에서 행이 3.2배 길어져 alpha 0.05는 지각 하한 미만이었다. */
  border-bottom: 1px solid ${rowHairline};

  &:last-of-type,
  &:has(+ button) {
    border-bottom: none;
  }

  /* 활성 상태 좌측 인디고 막대(굵게) + 우측 라운드 — 긴 리스트에서도 위치 즉시 인지.
   *
   * (이관됨) depth>0 행의 좌측 1px guide. 2026-08-11 하위 사건 검토 배치 2.
   * 행 좌단에 그리던 그 선은 세 가지가 잘못됐다.
   *  ① **깊이를 읽지 않았다** — depth 1과 2가 같은 선 하나라, 손자를 자식과 구별할 수단이
   *     들여쓰기 24px 하나뿐이었다.
   *  ② **대비 미달** — 라이트 1.29:1 / 다크 1.62:1로 WCAG 1.4.11(3:1)에 못 미쳤고,
   *     하필 19px 옆에 상시 그려지는 레일 축선(1.65:1)이 같은 파란 계열에 알파는 2배라
   *     계층 신호가 시간축 신호의 '흐린 복사본'으로 읽혔다.
   *  ③ **계층 신호가 164px 떨어진 두 곳에 나뉘어 있었다** — 선은 행 좌단, 들여쓰기는
   *     제목 셀 안. 눈이 둘을 한 신호로 묶지 못한다.
   * 이제 Indent 트랙이 depth만큼의 중립 회색 세로선을 **들여쓰기와 같은 자리에** 그린다.
   * ⚠️ 이 주석 안에서 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 끊겨 TS1005가 난다.
   * 여기 남는 것은 활성 막대뿐이다(그래서 활성 행에서 guide가 지워지던 문제도 사라진다). */
  border-radius: ${({ $active }) => ($active ? '6px' : '0')};
  box-shadow: ${({ $active }) =>
    $active ? 'inset 4px 0 0 0 #2563eb' : 'none'};
  ${({ $active }) =>
    $active &&
    css`
      border-bottom-color: transparent;
    `}

  /**
   * (폐지됨) 행 도트(::after)와 레일→행 커넥터(::before). 2026-08-01 4차 검토 배치 C1.
   *
   * 네 개의 진단이 한 지점을 가리켰다.
   *  - 도트가 나르는 유일한 정보는 카테고리인데, 같은 정보를 145px 옆 칩이 한글 텍스트로
   *    이미 말한다. 2026-07-22 설계기록이 '도트 이중 인코딩'을 이유로 다른 안을 기각했지만
   *    정작 도트 + 칩 tint + 칩 라벨 hue = 3중 인코딩이 그대로 배포돼 있었다.
   *  - 다크에서 최빈 3개 카테고리 도트가 1.78~2.85:1로 WCAG 1.4.11(3:1) 미달 —
   *    252행 중 161행(64%). 라이트는 통과라 같은 화면이 테마에 따라 다른 위계로 읽혔다.
   *  - 행을 선택하면 그 도트(11px)가 자기 연도 앵커 도트(10px)보다 커져 눈금 서열이
   *    상시 역전됐다.
   *  - 자식 행 도트가 최상위와 같은 좌표·크기라, 축만 보면 252건이지만 실제 연대기
   *    앵커는 167건이었다.
   *
   * 부수 효과: stuck 헤더의 좌측 오클루전 띠를 관통하던 도트·커넥터가 사라져,
   * 헤더 ::after의 left 좌표를 손댈 필요 자체가 없어졌다.
   *
   * 축(수직선)과 세기·연도 앵커 도트는 존치한다 — 스크롤 중 '지금 어느 시대인가'를
   * 읽으려면 좌측 단일 축이 필요하고, 축이 없으면 헤더는 그냥 텍스트 줄이 된다.
   */

  /* active별 bg tint — 활성 행이 hover 행과 명확히 구분되도록 강화. */
  ${({ $active, theme }) => {
    const isDark = theme.mode === 'dark'
    if ($active) {
      /* 라이트 0.13은 그 위 metaText를 4.04:1로 떨어뜨려 AA에 미달시켰다.
         식별은 좌측 4px 인디고 막대가 이미 담당하므로 tint는 낮춰도 된다. */
      return css`
        background: ${isDark
          ? 'rgba(37, 99, 235, 0.20)'
          : 'rgba(37, 99, 235, 0.08)'};
      `
    }
    return css`
      background: transparent;
    `
  }}

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(37, 99, 235, 0.26)'
          : 'rgba(37, 99, 235, 0.13)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  }

  /* 강제 색 모드(Windows 고대비 등)에서는 box-shadow·배경 tint가 전부 제거된다 —
     활성 행이 통째로 사라지므로 시스템 색 테두리로 대체 신호를 준다.
     계층 가이드의 대체 신호는 Indent가 스스로 갖는다(데스크톱). 다만 모바일에서는
     Indent가 display:none이고 행 전체 margin-left만 남으므로 여기서 한 번 더 준다. */
  @media (forced-colors: active) {
    ${({ $active }) =>
      $active &&
      css`
        outline: 2px solid Highlight;
        outline-offset: -2px;
      `}

    @media (max-width: 640px) {
      ${({ $depth }) => $depth > 0 && 'border-left: 1px solid CanvasText;'}
    }
  }

  /* 키보드 focus 시각화 — 마우스 click에선 안 뜨고 Tab 순회 시에만 ring */
  &:focus {
    outline: none;
  }
  &:focus-visible {
    /* 틴트 배경 위 포커스 규약 — 근거와 값은 theme.ts focusRingOnTinted가 소유한다.
       익명 리터럴로 두면 같은 상황을 만난 다음 사람이 규약이 있는 줄 모른다(검토 A11Y-1). */
    ${focusRingOnTinted}
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
  }
`

/**
 * 행 본문 — 원장 격자. 트랙 정의는 **`list.styles.ts`의 `rowGridTemplate`이 단일 출처**다
 * (스켈레톤 `SkeletonBody`가 같은 선언을 읽어야 로딩→데이터 전환에서 열이 안 튄다).
 *
 * ⚠️ 여기에 트랙을 직접 쓰지 말 것. subgrid 금지·fr 1개 규약·열 사다리 4단계의 근거는
 * 전부 그쪽 주석에 있다.
 *
 * ⚠️ max-width도 여기에 두지 않는다. 예전의 880px 캡은 지키는 게 없으면서(콘텐츠 자연
 * 최대 폭이 870px라 실제로 걸려 잘리는 제목은 1행뿐이었다) 행 **안쪽에** 400~900px의
 * 빈 밴드를 만들었다. 이제 폭 상한은 어디에도 없고, 넓어진 폭은 열 사다리가 흡수한다.
 */
const Body = styled.div`
  flex: 1;
  min-width: 0;
  ${rowGridTemplate}

  /**
   * 모바일(≤640px) 2줄 행 — 1줄: 제목, 2줄: 날짜·분류·기간·국기·액션.
   *
   * 2026-07-22 검토가 채택한 '단일 행'은 데스크톱 기준 결정이었다. 390px에서는 고정 토큰
   * (셰브론 20 + 날짜 30 + 칩 34 + 국기 + 액션 28 + gap)이 행 폭의 대부분을 먹어 제목에
   * 남는 폭이 120px 남짓이었다 — 한글 8자 내외라 어떤 사건인지 식별이 안 됐다.
   * 데스크톱 단일 행 결정은 그대로 두고 좁은 폭에서만 줄을 나눈다.
   *
   * 줄바꿈은 order + 0높이 100%폭 스페이서(RowBreak)로 강제한다. 제목이 짧아도 메타가
   * 같은 줄로 올라오지 않아야 행 높이가 들쭉날쭉하지 않다.
   */
  @media (max-width: 640px) {
    /* ⚠️ 좁은 폭에서는 **격자를 쓰지 않는다.** 2줄 행 규약(Title flex:1 1 0 · Flags
     * max-width 112px · order 재배치)은 실측으로 어렵게 얻은 것이고, 격자로 옮기면
     * 제목 0폭 붕괴와 3줄 행이라는 과거 회귀를 다시 열게 된다. 데스크톱 격자와
     * 모바일 flex는 별개의 규약으로 공존시킨다. */
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    row-gap: 3px;
    column-gap: 8px;
    align-items: center;
  }

  /* ≤400px — 헤더리스 연 그룹 도입으로 모바일 날짜가 '7.27'(30px)에서
   * '1980.9.22'(54px)로 길어졌다. 그만큼 메타 줄이 넘쳐 320px에서 3줄로 무너졌다
   * (실측 행 높이 68/93/94px 4종). gap을 좁혀 24px를 회수한다. */
  @media (max-width: 400px) {
    column-gap: 6px;
  }
`

/**
 * 모바일 전용 줄바꿈 스페이서 — flex 컨테이너에서 강제 개행을 만드는 표준 기법.
 * 데스크톱에서는 렌더 트리에 있지만 박스를 만들지 않는다(display: none).
 */
const RowBreak = styled.span`
  display: none;

  @media (max-width: 640px) {
    display: block;
    flex-basis: 100%;
    height: 0;
    /* 제목(-1)과 메타(1) 사이 */
    order: 0;
  }
`

const RowActions = styled.div`
  grid-column: act;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  /* 액션은 읽기 컬럼(Body max-width 880px)의 **우측 고정 열**에 둔다.
   *
   * 이전엔 margin-left: 2px으로 국기 바로 뒤에 붙어, 제목 길이에 따라 버튼 x좌표가
   * 행마다 달라졌다 — 실측 233행에서 고유 x좌표 184개, 산포 641px(316~957).
   * 즐겨찾기를 연속으로 누를 때 포인터가 매 행 다른 위치를 찾아야 했고 세로 스캔선도 끊겼다.
   * 이제 격자 트랙이 열을 보장하므로 auto 마진이 필요 없다 — 그리고 auto 마진 시절엔
   * 행 전체가 depth만큼 밀려서 자식 행의 액션이 22px 어긋났다(고유 x 3종). */
  padding-left: 0;
  flex-shrink: 0;

  /**
   * 평소엔 숨고 행에 들어올 때만 나타난다.
   *
   * 조밀 밀도 전폭에서는 한 화면에 37행 × 아이콘 2개 = 74개가 상시 떠 있었다. 그 아이콘들은
   * 어떤 행이 중요한지 0비트도 말하지 않으면서 우측 열 전체를 시각 소음으로 채웠다.
   *
   * ⚠️ visibility:hidden · display:none을 쓰지 말 것 — 로빙 tabindex가 이 버튼들을
   *    정지점으로 쓴다. opacity 0인 요소는 Tab으로 도달 가능하고 :focus-within이 즉시
   *    되살리므로, 키보드 사용자에게는 아무것도 사라지지 않는다.
   *    (이 주석 안에서 백틱 금지 — styled 템플릿 리터럴이 끊긴다.)
   */
  opacity: 0;
  transition: opacity ${MOTION.fast};

  ${Stop}:hover &,
  ${Stop}:focus-within &,
  ${Stop}[data-active='true'] & {
    opacity: 1;
  }

  /* 북마크가 **켜진** 행은 상태 신호이므로 항상 보인다 */
  &[data-has-bookmark='true'] {
    opacity: 1;
  }

  /* 터치 기기에는 hover가 없다 — 숨기면 영영 못 찾는다 */
  @media (hover: none) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 640px) {
    margin-left: auto;
    order: 2;
    /* 좁은 폭은 포인터 hover 규약이 불안정한 경계라 상시 노출 */
    opacity: 1;
  }
`

/**
 * 제목 셀 — [들여쓰기][디스클로저][텍스트] 3열 서브격자.
 *
 * 들여쓰기 트랙이 depth를 **혼자** 흡수한다. 예전에는 Stop 전체에 margin-left를 걸어
 * 날짜·분류·기간·국기·액션까지 22px씩 따라 움직였다(액션 우측 끝 985/1007 분기).
 * depth는 인라인 CSS 변수로 넘긴다 — styled prop으로 넘기면 depth마다 클래스가 생성돼
 * 252행에서 클래스 캐시가 부풀고 React.memo 이득이 깎인다.
 *
 * 5단 이상은 96px에서 클램프한다(다중 상위 도입으로 depth 3+가 예정돼 있다).
 */
const TitleCell = styled.div<{ $spanSummary?: boolean }>`
  min-width: 0;
  display: grid;
  grid-template-columns:
    [ind] min(calc(var(--row-indent) * var(--depth, 0)), 96px)
    [disc] var(--row-disc-btn)
    [text] minmax(0, 1fr);
  column-gap: 0;
  align-items: baseline;

  /* 설명·매칭근거가 둘 다 없는 행은 요약 트랙이 통째로 빈다. 행 *중간*의 빈 셀은
     '깨진 행'으로 읽히므로 제목이 그 자리를 삼킨다. [sumend]는 요약 직후 라인이라
     단계가 바뀌어도 스팬 폭이 정확히 '제목 + 요약'이고, 요약 열이 없는 step 0에서는
     [sumend]가 제목 직후라 이 선언이 자동으로 no-op이 된다. */
  ${({ $spanSummary }) =>
    $spanSummary &&
    css`
      grid-column: title / sumend;
    `}

  @media (max-width: 640px) {
    /* 모바일에서는 셀 자체를 해제해 자식이 Body의 flex 아이템이 되게 한다 —
       2줄 행 규약이 직속 자식에 걸린 order로 동작하기 때문이다. */
    display: contents;
  }
`

/**
 * 들여쓰기 트랙 — **계층 잉크를 혼자 지고 있는 자리**다.
 *
 * 격자 트랙만으로는 baseline 정렬이 흔들려 빈 박스가 필요했는데, 그 박스가 마침
 * '조상 한 단 = 들여쓰기 한 칸'과 정확히 같은 폭이라 가이드선을 그리기에 맞다.
 * 반복 그라디언트의 주기를 `--row-indent`로 잡으면 선이 x=0, indent, 2·indent…에 서고,
 * 트랙 폭이 `indent × depth`이므로 **depth 개수만큼** 선이 그어진다 —
 * depth 1은 1줄, depth 2는 2줄. 손자를 자식과 구별하는 신호가 여기서 생긴다.
 *
 * 색은 레일 축선(파랑 = 시간축)과 **다른 채널**인 중립 회색이다. 같은 hue를 쓰면
 * 계층선이 시간축의 흐린 복사본으로 읽힌다. 대비는 행 표면 기준 라이트 3.13:1 /
 * 다크 3.78:1로 WCAG 1.4.11(3:1)을 넘긴다.
 */
const Indent = styled.span<{ $depth: number }>`
  grid-column: ind;
  /* baseline 정렬이 걸린 격자라 명시하지 않으면 높이가 글자 한 줄로 접힌다. */
  align-self: stretch;
  background-image: repeating-linear-gradient(
    to right,
    ${({ theme }) => (theme.mode === 'dark' ? '#6b7076' : '#8f9296')} 0 1px,
    transparent 1px var(--row-indent)
  );
  background-repeat: no-repeat;
  background-size: min(calc(var(--row-indent) * var(--depth, 0)), 96px) 100%;

  /* 강제 색 모드(Windows 고대비)는 배경 이미지를 통째로 지운다 — 계층이 사라지므로
     테두리로 대체한다. 깊이별 줄 수는 포기하고 '자식이다'만 남긴다. */
  @media (forced-colors: active) {
    background-image: none;
    ${({ $depth }) => $depth > 0 && 'border-left: 1px solid CanvasText;'}
  }

  @media (max-width: 640px) {
    display: none;
  }
`

/**
 * 디스클로저 — 셰브론과 자식 수를 **한 컨트롤**로 합친 것.
 *
 * 예전에는 셰브론(x=105)·자식수 배지(제목 뒤 가변 x)·요약 버튼(x=919)이 '계층'이라는
 * 한 개념을 행의 세 지점에서 말했고, 배지가 제목과 기간 사이에 끼어들어 메타 x를
 * 한 번 더 흔들었다. 배지를 셰브론 안으로 들여 삽입 토큰을 하나 없앤다.
 */
const Disclosure = styled.button<{ $expanded: boolean }>`
  grid-column: disc;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: var(--row-disc-btn);
  height: var(--row-disc-btn);
  padding: 0;
  /* 시각 크기는 그대로 두고 **히트 영역만** 확장한다(포인터·터치 오탭 방지). */
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: -8px -6px;
  }
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  font-size: var(--row-chip);
  transition: background 0.12s;

  /* ⚠️ 버튼 전체를 회전시키지 않는다 — 회전하면 안에 든 자식 수 숫자까지 눕는다.
     글리프만 돌린다. */
  svg {
    transition: transform 0.15s;
    transform: rotate(${({ $expanded }) => ($expanded ? 90 : 0)}deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }

  @media (max-width: 640px) {
    /* 메타 줄 선두로 내린다. 제목 줄 앞에 두면 제목만 22+8=30px 안쪽으로 들여써져
       한 행에 좌측 기준선이 두 개 생긴다(실측 제목 85px vs 메타 55px).
       세로로 훑을 때 눈이 두 축을 오가야 하고, 제목이 쓸 수 있는 폭도 그만큼 준다. */
    order: 1;
  }
  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
  /* 행 안의 액션은 전역 --focus-ring(연보라 반투명 번짐, 라이트 1.39:1 / 다크 1.32:1)을
     그대로 받고 있었다 — 같은 목록의 행은 solid 2px, 밴드 버튼도 solid인데 여기만
     판독이 곤란했다(검토 A11Y-2). 링은 목록 규약 3종 중 inset을 쓴다: 이 버튼은
     제목 셀 서브격자 안의 20~26px 정사각이라 바깥 번짐이 옆 글자를 덮는다. */
  &:focus-visible {
    ${focusRingInset}
  }
`

/**
 * 디스클로저 안 자식 수 — 셰브론이 있을 때만.
 *
 * 9px 리터럴이었다. 행 타입 스케일은 제목 13/14/15 · 메타 11/12 · 칩 10/11인데
 * 이 숫자만 그 밖에 있었고, 조밀 밀도에서 20px 버튼 안에 11px 셰브론과 나란히 들어가
 * 내용 고유폭이 버튼을 넘겼다. 스케일 안으로 들여보낸다(검토 VIS-8).
 */
const DiscCount = styled.span`
  font-size: var(--row-chip);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
`

/** 자식 없는 행도 같은 폭을 예약해 제목 텍스트 시작점이 흔들리지 않게 한다. */
const DiscSpacer = styled.span`
  grid-column: disc;
  width: var(--row-disc-btn);
  height: var(--row-disc-btn);
  flex-shrink: 0;

  @media (max-width: 640px) {
    /* 자식 없는 행도 같은 자리를 예약한다 — 아니면 메타 줄의 날짜 x가 행마다
       30px씩 튀어 방금 세운 열이 다시 무너진다. */
    order: 1;
  }
`

/**
 * 제목 텍스트 트랙 — 제목 + 검색 근거 + '조건 밖 N'이 이 안에서 좌측으로 흐른다.
 * 이 셋은 모두 '제목에 딸린 설명'이라 제목 열 안에 있는 게 옳고, 밖으로 나가면
 * 기간·국기 열의 x를 흔든다.
 */
const TitleText = styled.span`
  grid-column: text;
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  overflow: hidden;

  @media (max-width: 640px) {
    order: -1;
    flex: 1 1 0;
  }
`

/** 시각적으로 숨기되 스크린리더에는 남긴다 */
const SrOnly = styled.span`
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

/**
 * 상위 사건 앵커 칩 — 계보를 말하는 목록의 유일한 텍스트.
 *
 * 제목과 경쟁하지 않도록 메타 크기·중립 회색으로 두고, 누를 수 있다는 것만 테두리로
 * 알린다. 폭은 제목을 밀어내지 않게 상한을 두고 말줄임한다.
 */
const AnchorChip = styled.button`
  flex-shrink: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  height: 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.14)'};
  border-radius: 4px;
  background: transparent;
  font-family: inherit;
  font-size: var(--row-chip);
  line-height: 1;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    border-color: #2563eb;
    color: #2563eb;
  }
  &:focus-visible {
    ${focusRingInset}
  }

  @media (max-width: 640px) {
    order: 1;
  }
`

/** 앵커 칩의 제목 부분 — 긴 상위 제목이 행을 밀지 않게 말줄임. */
const AnchorChipText = styled.span`
  max-width: 15ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/**
 * 최상위(앵커) 사건 배지 — 자손이 하나라도 있는 사건.
 *
 * 생존 루트 167건 중 147건(88%)이 자식 0인 단독 사건이라, 아무 신호가 없으면
 * '1차세계대전'이 '1914 킬 운하 재개통'과 완전히 같은 자격으로 나열된다
 * (docs/event-root-designation-review.md 근인 1).
 */
const AnchorBadge = styled.span`
  flex-shrink: 0;
  /* as="button"으로도 렌더된다 — 기본 버튼 표면을 지워 정적 배지와 픽셀을 맞춘다. */
  border: none;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  height: 16px;
  border-radius: 4px;
  font-size: var(--row-chip);
  line-height: 1;
  font-weight: 600;
  white-space: nowrap;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.10)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93b4fc' : '#1d4ed8')};

  &:is(button) {
    cursor: pointer;
  }
  &:is(button):hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(37,99,235,0.30)' : 'rgba(37,99,235,0.18)'};
  }
  &:is(button):focus-visible {
    ${focusRingInset}
  }
`

/**
 * 단독 사건 토큰 — 하위가 하나도 없는 최상위.
 *
 * 앵커를 강조하는 것만으로는 부족하다. 147행이 아무 표시 없이 남으면 '표시가 없는 것'이
 * 기본값으로 읽혀 앵커 배지가 장식처럼 보인다. 반대로 이쪽을 **한 톤 물러나게** 찍으면
 * 목록이 스스로 두 층으로 갈린다. 강조가 아니라 후퇴가 목적이라 색·굵기를 쓰지 않는다.
 */
const SoloToken = styled.span`
  flex-shrink: 0;
  font-size: var(--row-chip);
  line-height: 1;
  white-space: nowrap;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.34)' : 'rgba(15,23,42,0.36)'};
`

const FilteredOutHint = styled.span`
  flex-shrink: 0;
  /* as="button"으로 렌더된다 — 기본 버튼 표면을 지우고 텍스트처럼 보이게. */
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-family: inherit;

  @media (max-width: 640px) {
    order: 1;
  }

  /* 이 목록의 **유일한 인터랙티브 텍스트**인데, 예전에는 39×13px에 정적 메타와 똑같은
     회색이라 어포던스가 0이었다. metaText 한 토큰이 날짜·기간·근거·행동 4역할을 겸하던
     것을 3층으로 나눈다 — datum(날짜) / measure(기간·근거) / action(여기). */
  font-size: var(--row-meta);
  font-weight: 600;
  letter-spacing: 0;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  font-variant-numeric: tabular-nums;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: -6px -4px;
  }
  &:focus-visible {
    ${focusRingInset}
    border-radius: 3px;
  }
  &:hover {
    text-decoration: underline solid;
  }
`

const Year = styled.span`
  /* 날짜는 보조 데이텀 — 항상 제목보다 한 단계 아래. tier별 크기 증가를 없애 고정 12px로,
     굵기도 500으로 낮춰(중요도 신호는 제목·별이 담당) 제목이 확실한 주인공이 되게 한다. */
  grid-column: date;
  /* 우측 정렬 — 자릿수가 다른 값들(7.27 · 12.31 · (1893) · 기원전 1046)이 끝자리를
     한 축에 세운다. 예전 좌측 정렬 + min-width는 값 길이에 따라 흔들렸고 49행(19%)이
     슬롯을 넘었다. */
  text-align: right;
  font-size: var(--row-meta);
  font-weight: 600;
  letter-spacing: 0;
  /* 이 목록의 정렬 축은 '언제'인데, 예전에는 날짜가 행에서 가장 옅고 가장 가는
     텍스트였다(4.83:1 / weight 500). 정보량이 가장 적은 분류 칩이 대비·굵기 양축에서
     이기고 있었다. 굵기를 600으로 올리고 색을 한 단계 진하게 해 축을 되돌린다. */
  color: ${({ theme }) => (theme.mode === 'dark' ? '#d4d4d8' : '#4b5563')};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  /* 극단값(BC·헤더리스 승격 'YYYY.M.D')이 열을 넘기더라도 제목을 잠식하지 못하게
     여기서 흡수한다 — 격자에서 줄어들 수 있는 건 제목 트랙뿐이기 때문이다. */
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 그룹 헤더와 *다른* 해를 가리키는 토큰 — 같은 슬롯에 '12.31'(월·일)과 '1893'(연도)이
   * 완전히 같은 서식으로 찍히면 두 단위가 구분되지 않는다. 실측상 자식 87건 중 62건(71%)이
   * 부모와 다른 해다. 한 단계 진한 색 + 앞 구분점으로 '이건 다른 해'를 신호한다(검토 VIS-6). */
  &[data-offgroup='true'] {
    /* ⚠️ 색으로 구분하려 하지 말 것 — 이 테마에서 text.secondary는 라이트 #6b7280 /
       다크 #a1a1aa로 메타 토큰과 **값이 같아** 색 분기가 no-op이 된다(실측 확인).
       괄호로 감싸 테마와 무관하게 '(1893)'과 '12.31'을 즉시 구별되게 한다. */
    &::before {
      content: '(';
      opacity: 0.6;
    }
    &::after {
      content: ')';
      opacity: 0.6;
    }
  }

  /* (제거됨) ≤640px에서 &:not([data-offgroup]) { display: none }.
   *
   * 그 규칙의 근거는 "연도는 sticky 연도 divider와 중복"이었는데, 2차 디자인 구현 이후
   * 이 슬롯이 담는 값은 **연도가 아니라 월·일**이다(rowDateLabel이 'M.D'/'M월'을 만들고,
   * 연 정밀도로 확정된 경우엔 이미 빈 문자열을 반환해 스스로 중복을 피한다).
   * 그래서 이 규칙은 중복 제거가 아니라 **모바일에서만 날짜를 통째로 없애는** 회귀였다
   * (실측: 390px에서 날짜 토큰 렌더 박스 w=0 — 같은 해 안의 선후 관계를 알 방법이 없음).
   * display:none은 접근성 트리에서도 제거돼 모바일 스크린리더에도 전달되지 않았다.
   * 폭 확보는 Flags 축소(max=1·max-width)와 Title min-width가 대신 맡는다. */
  @media (max-width: 640px) {
    font-size: 11px;
    min-width: 30px;
    order: 1;
  }
`

const Title = styled.span`
  /* 단일 행 밀도 — 제목은 자기 폭(flex:0 1 auto)만 차지하고, 넘치면 …로 자른다.
   * flex:1을 쓰지 않아 뒤따르는 메타가 제목 바로 옆에 붙어 '죽은 여백'이 생기지 않는다. */
  flex: 0 1 auto;
  /* 데스크톱에서는 제목이 자기 격자 트랙(minmax(0,1fr)) 안에 있어 다른 셀에 짓눌리지
   * 않는다. 좁은 폭(flex 경로)에서는 여전히 유일한 축소 대상이라 최소 폭이 필요하다 —
   * 390px 실측(수정 전) 238행 중 73행(31%)의 제목 폭이 0이었다. */
  min-width: 8ch;
  /* 제목이 확실한 주인공 — 연도보다 크고 굵다. 크기는 밀도 토큰이 소유. */
  font-size: var(--row-title);
  /* 700 — 날짜(600)·칩(500)과 함께 크기·굵기 **양축에서 단조**가 되게 한다.
     예전엔 제목 600 / 칩 600으로 굵기가 같아 색 있는 칩이 먼저 눈에 들어왔다. */
  font-weight: 700;
  /* 한글에 -0.01em은 자간을 눈에 띄게 좁힌다. 라틴 기준 트래킹을 그대로 쓰지 않는다. */
  letter-spacing: -0.005em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 모바일 1줄차 — 셰브론만 옆에 두고 남은 폭 전부를 제목이 가진다(120px → ~270px).
   *
   * ⚠️ flex-basis는 반드시 0. auto면 기준 폭이 *콘텐츠 폭*이라 긴 제목이 셰브론과
   * 같은 줄에 못 들어가 자기 줄로 밀려나고, 결과적으로 셰브론만 있는 빈 줄이 하나 더
   * 생겨 행이 3줄(92px)이 된다 — 실측에서 240행 중 79행이 이 상태였다.
   * basis 0이면 남은 폭을 받아 한 줄에 눕고 넘치면 말줄임된다. */
  @media (max-width: 640px) {
    order: -1;
    flex: 1 1 0;
    min-width: 0;
  }
`

/* 검색어 매칭 강조.
 *
 * ⚠️ color를 반드시 **강제**한다. color:inherit이면 amber 배경 위에 부모 색이 그대로
 * 올라와, 메타 회색을 상속하는 매칭 근거에서 대비가 1.99:1(다크)까지 떨어졌다.
 *
 * amber는 이 목록에서 **검색 전용**이다(TYPE-6 vs RHYTHM-13 충돌의 결론). 하이라이트는
 * 제목 텍스트 *안*에 나타나 대체 채널이 없는 반면, 북마크는 fill 유무라는 형태 채널이
 * 이미 있기 때문이다. */
const Mark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#fbbf24' : '#fde68a'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#1c1917' : '#0f172a')};
  padding: 0 1px;
  border-radius: 2px;
`

/* 저채도 soft chip — 원색 텍스트(AA 미달)를 대신. 배경 tint + 어둡게 조정한 텍스트색으로
 * 대비 확보하고, 칩 형태로 '분류'임을 명확히(중요도=별과 신호 분리). */
const CategoryLabel = styled.span<{
  $rgb: string
  $text: string
  $textDark: string
}>`
  grid-column: cat;
  align-self: center;
  /* 칩이 셀을 꽉 채운다 → 칩의 좌·우 두 모서리가 **모두** 세로 스캔선이 된다.
     예전에는 라벨 길이대로 폭이 34/43/52/56px 4종이라 좌측선조차 없었고, 그 가변 폭이
     바로 뒤 제목의 시작점을 11종(219~265px)으로 흩뜨린 근인이었다. */
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  height: 18px;
  font-size: var(--row-chip);
  /* 굵기 축에서 날짜(600)에 양보한다 — hue 대비는 유지하되 정렬 축을 이기지 않게. */
  font-weight: 500;
  letter-spacing: 0;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /**
   * 색 **면(fill) 없음** — 카테고리 hue는 글자에만 싣는다(2026-08-02 결정).
   *
   * 근거 둘 다 실측이다:
   *  ⑴ 칩 배경과 표면의 대비가 10색 전부 1.06~1.25:1이었다. 비텍스트 기준 3:1의 절반도
   *     못 미쳐 '배지'로 읽히지 않으면서, 화면 색 면적의 대부분을 차지했다.
   *  ⑵ 반투명 fill이 활성 행 tint 위에 합성되면 사회 4.11:1 · 문화 4.37:1로 소형 텍스트
   *     AA(4.5:1) **위반**이었다. ↑↓ 내비가 선택과 포커스를 함께 옮기므로 상시 상태다.
   *     fill을 지우면 활성 행 위 최저 4.90:1, 라이트 기본 행은 5.47~10.36:1로 전 색 향상.
   *  ⚠️ 반투명을 유지하면서 ⑵를 해소하는 길은 없다. 색 면이 다시 필요하면
   *     사전 합성한 **불투명** 헥스 10색을 CATEGORY_SOFT_COLORS에 추가해야 한다.
   *
   * ⚠️ width:100% / justify-content:center / height는 **유지**한다 — 칩의 좌·우 모서리가
   *    세로 스캔선이라는 계약은 fill이 아니라 트랙 폭이 만든다.
   */
  color: ${({ $text, $textDark, theme }) =>
    theme.mode === 'dark' ? $textDark : $text};

  @media (max-width: 640px) {
    order: 1;
    /* ⚠️ width:100%는 **격자 셀 전용**이다. 모바일은 flex라 100%가 행 전체를 먹어
       메타 줄이 통째로 밀려나고 행이 3~4줄(110px)이 된다 — 실측으로만 잡히는 함정. */
    width: auto;
    height: 16px;
    line-height: 16px;
  }
`

/* 검색 매칭 근거 — 제목에 검색어가 없을 때만 나타난다. 제목을 밀어내지 않게 축소·말줄임. */
const MatchReason = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 0 1 auto;
  font-size: var(--row-meta);
  font-weight: 500;
  letter-spacing: 0;
  color: ${metaText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 좁은 폭에서도 **넓은 절반(481~640px)에서는 되살린다.**
   * 검색 결과의 76%가 제목에 검색어가 없는 행인데(매칭 술어는 제목·설명·키워드 3필드),
   * 근거를 통째로 지우면 모바일 검색은 '왜 걸렸는지 알 수 없는 목록'이 된다.
   * 480px 이하에서만 포기한다 — 거기서는 제목 자체의 폭이 먼저 위협받는다. */
  @media (max-width: 480px) {
    display: none;
  }

  /* 요약 열이 켜지면 매칭 근거는 그 안으로 흡수된다 — 같은 필드(설명)를 두 지점에서
     말하게 두면 제목 뒤에 붙은 근거가 제목 트랙을 다시 밀어낸다. */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: none;
  }
`

/**
 * 요약 셀 — 넓은 카드에서 죽은 폭을 잉크로 되돌리는 유일한 흡수체.
 *
 * 기본이 `display: none`이고 컨테이너 게이트에서만 켜진다. 좁은 카드에서 켜지면 제목이
 * 0폭으로 붕괴하던 과거 회귀를 다시 여는 셈이라, **모바일은 이중으로 차단**한다
 * (컨테이너 게이트를 통과할 수 없는 폭이지만 규약을 코드로 못박아 둔다).
 */
const Snippet = styled.span`
  display: none;

  /* display:block + inline 자식 — flex로 두면 text-overflow가 자식에 안 걸려
     말줄임 없이 잘린다(MatchReason이 inline-flex라 겪고 있는 문제). */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: block;
    grid-column: sum;
    min-width: 0;
    font-size: var(--row-meta);
    font-weight: 500;
    letter-spacing: 0;
    color: ${metaText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 640px) {
    display: none;
  }
`

const MatchReasonKind = styled.span`
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.16)' : 'rgba(251,191,36,0.22)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#854d0e')};
`

/**
 * 키워드 열 — 열 사다리 step 2(ledger)에서만 켜진다.
 *
 * 목록 응답이 이미 싣고 transformer가 매핑까지 하는데, 지금까지 행에서 유일한 소비처는
 * '검색 매칭 근거' 탐색뿐이라 검색어가 없으면 0픽셀이었다. 서버 변경 0줄로 전폭에서
 * 되찾은 가로 픽셀을 실제 정보로 바꾸는 가장 싼 열이다.
 *
 * ⚠️ 카테고리 hue를 쓰지 말 것 — 칩 색은 '분류' 전용 채널이다. amber 계열도 금지다
 *    (검색 하이라이트 전용). 중립 표면 토큰만 쓴다.
 */
const KeywordCell = styled.span`
  display: none;

  @container eventcard (min-width: ${LIST_STEPS.ledger}px) {
    display: inline-flex;
    grid-column: kw;
    align-self: center;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  @media (max-width: 640px) {
    display: none;
  }
`

const KeywordChip = styled.span`
  flex: 0 1 auto;
  min-width: 0;
  max-width: 96px;
  padding: 0 6px;
  height: 16px;
  line-height: 16px;
  border-radius: 4px;
  font-size: var(--row-chip);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? CONTROL.bgDark : CONTROL.bgLight};
  color: ${metaText};
`

const KeywordMore = styled.span`
  flex-shrink: 0;
  font-size: var(--row-chip);
  font-weight: 600;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
`

/**
 * 등록 시각 열 — 열 사다리 step 3(atlas)에서만. 커버리지 100%.
 *
 * '등록순' 정렬은 연도 그룹핑까지 해제하는데도 화면에 정렬 축을 나타내는 토큰이 하나도
 * 없어, 사용자가 '방금 넣은 20건'을 눈으로 확인할 수 없었다.
 *
 * ⚠️ 조건부 트랙(정렬이 '등록순'일 때만 켜기)으로 만들지 말 것 — 정렬을 바꿀 때마다
 *    전 행의 열 축이 흔들린다. 폭이 허락하면 항상 있는 열이다.
 */
const RegisteredCell = styled.span`
  display: none;

  @container eventcard (min-width: ${LIST_STEPS.atlas}px) {
    display: block;
    grid-column: reg;
    min-width: 0;
    text-align: right;
    font-size: var(--row-meta);
    font-weight: 500;
    color: ${metaText};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 640px) {
    display: none;
  }
`

const Duration = styled.span`
  grid-column: dur;
  /* 우측 정렬 — '오래 지속된 사건 찾기'가 처음으로 세로 스캔으로 성립한다. */
  text-align: right;
  font-size: var(--row-meta);
  font-weight: 500;
  letter-spacing: 0;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  /* ⚠️ 우측정렬 + hard clip이면 LTR에서 **시작(좌측)** 이 잘린다 — '12년 11개월'(약 68px)이
     56px 트랙에서 '년 11개월'로 렌더돼 앞자리가 소리 없이 사라졌다. 넘침이 최소한 눈에
     보이게 한다(트랙 폭 자체는 열 사다리 step 2에서 넓어진다). */
  text-overflow: ellipsis;

  /* 당일(252행 중 133행 = 53%)은 점 하나로 누른다. 텍스트로 두면 화면 절반이 같은
     두 글자를 반복해 '27년 4개월'과 완전히 같은 무게로 읽혔다. 지우지 않는 이유는
     '종료 확정'과 '종료 미상'이 다른 사실이기 때문이고, 그래서 스크린리더에는
     '1일'이 그대로 남는다. */
  &[data-sameday='true']::after {
    content: '·';
    opacity: 0.55;
  }

  /* 모바일 메타 줄은 **한 줄로 고정**해야 행 높이가 일정하다(들쭉날쭉하면 스캔이 깨진다).
   *
   * 예전엔 ≤640 전체에서 기간을 지웠다. 근거는 '233행 중 218행(94%)이 1일'이었는데,
   * 그 통계는 종료 미상까지 '1일'로 합치던 시절 것이다. 지금은 종료 미상이 토큰을
   * 만들지 않고 당일은 점 하나로 눌리므로, 실제로 글자를 차지하는 기간은 105행뿐이다.
   * 481~640px에서는 그 105행을 되살린다. */
  @media (max-width: 480px) {
    display: none;
  }
`

const Flags = styled.span`
  grid-column: flags;
  align-self: center;
  /* 텍스트 칩(역사국가)의 개별 상한. 트랙 128px에 2개 + '+N'이 들어가려면
     칩 하나가 52px 안쪽이어야 한다 — 한글 4~5자로, 국가를 구별하기에 충분하다. */
  --flag-name-max: 52px;
  display: inline-flex;
  align-items: center;
  /* 국기/역사국가 칩이 폭 초과의 주범이다 — 역사국가는 이모지가 없어 국가명 전체가
   * 텍스트 칩(max-width 80px)으로 그려지므로 3개면 270px에 달한다. 넘칠 때는 제목을
   * 0으로 만드는 대신 여기서 흡수한다(좁은 폭에선 max=1로 개수 자체도 줄인다). */
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;

  @media (max-width: 640px) {
    order: 1;
    /* 메타 줄 1줄 고정을 위한 상한. 실측 폭 합계로 역산한다 —
       Body 296 = 날짜 30 + 분류 56(최장 '전쟁/군사') + 액션 66(요약+북마크) + gap 24
       = 176을 빼고 남는 120에서 안전 여유 8px. 이 상한을 넘기면 flex가 국기를
       3번째 줄로 밀어 행 높이가 71px과 94px로 갈린다(실측: 240행 중 46행). */
    max-width: 112px;
  }

  /* ≤400px — ≤640 한 벌이 320~640(폭 2배 범위)을 담당하던 것을 두 단계로 나눈다.
   * 실측: 320·360px에서 메타 줄이 넘쳐 행 높이가 68/93/94px 4종으로 갈렸다(3줄 붕괴).
   * 폭 합계 역산: Body 260 = 디스클로저 22 + 날짜 30 + 분류 40 + 액션 66 + gap 32 = 190,
   * 남는 70에서 안전 여유를 빼고 56. */
  @media (max-width: 400px) {
    max-width: 48px;
  }
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* ≤400px — 자식이 있는 행은 액션이 두 개(요약 + 북마크)라 메타 줄이 넘쳐 3줄이 된다.
   * 요약은 **중복 어포던스**다(행을 누르면 열리는 드로어가 같은 계층 정보를 준다).
   * 정보가 아니라 지름길을 포기하는 것이라 이 대역에서만 접는다. */
  @media (max-width: 400px) {
    display: none;
  }
  width: var(--row-act-btn);
  height: var(--row-act-btn);
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.58)' : 'rgba(15,23,42,0.58)'};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#cbd5e1' : '#0f172a'};
  }
`

const BookmarkBtn = styled.button<{ $bookmarked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--row-act-btn);
  height: var(--row-act-btn);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  /* 켜짐은 **채워진 글리프 + 본문 색**으로 표현한다.
   * 예전 amber(#f59e0b)는 라이트에서 2.15:1이라 꺼짐(4.00:1)보다 **덜 보였다** —
   * 상태가 켜졌는데 신호가 약해지는 역전이었다. amber는 검색 하이라이트에 양보한다. */
  color: ${({ theme, $bookmarked }) =>
    $bookmarked
      ? theme.colors.text.primary
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.55)'
        : 'rgba(15,23,42,0.55)'};
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
