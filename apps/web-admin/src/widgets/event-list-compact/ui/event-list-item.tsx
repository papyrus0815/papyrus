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
import { titleWithoutOwnDate } from '@/shared/lib/title-date'

import { yearSpanGeometry } from '../lib/year-span'
import {
  bleedToEdges,
  rowGridTemplate,
} from '../../../pages/events/styles/list.styles'
import {
  BRAND,
  CATEGORY_SOFT_COLORS,
  CONTROL,
  LIST_STEPS,
  MOTION,
  focusRingInset,
  focusRingOnTinted,
  metaText,
  RAIL_CONNECTOR,
  RAIL_TICK,
  rowHairline,
  SPAN_GRID,
} from '../../../pages/events/styles/theme'
import {
  getAnchorBadgeLabel,
  getEventDescendantCount,
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
  /** 키워드 칩 개수 상한 — 열 폭에 따라 목록이 정한다 */
  keywordMax?: number
  /** 계층 깊이(1-base) — 하위 사건이 최상위와 똑같이 읽히지 않게 한다 */
  ariaLevel?: number
  /** 같은 연도 그룹 안에서의 위치/크기 — 스크린리더가 '3 / 12'를 읽어 준다 */
  positionInSet?: number
  setSize?: number
  /**
   * **부모**에게 아직 뒤따르는 형제가 있는가(depth ≥ 2에서만 의미).
   *
   * 손자 행이 지나가는 동안 부모의 가지선은 x 한 단 **왼쪽**에 있어 아무도 그리지 않는다.
   * 부모가 막내가 아니면 그 구간에서 가지선이 끊겨, 다음 삼촌 행의 선이 허공에서 다시
   * 시작하는 것처럼 보인다. 이 값이 참이면 손자 행이 부모 몫의 세로선을 대신 잇는다.
   * (실측 316행 중 해당 1건 — 드물지만 끊기면 그 한 곳이 오류로 읽힌다.)
   */
  ancestorContinues?: boolean
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

/*
 * (제거) 설명 스니펫 — `buildSnippet` · `SNIPPET_MIN_CHARS` · `SNIPPET_MAX_CHARS`.
 *
 * 행에서 설명을 걷어냈다(사용자 결정). 목록은 이제 **색인**이다 — 무엇이 언제 있었는지
 * 훑는 자리이고, 무슨 내용인지는 상세가 답한다. 한 줄 말줄임으로 보여 주던 125자는
 * 어차피 문장 중간에서 끊겨, 읽히기보다 행의 가로 폭만 먹고 있었다.
 *
 * 되살아난 폭은 **키워드·관련국 열**이 가져간다(rowGridTemplate의 fr 분배) — 캡을 걸어
 * 지면 오른쪽을 비우는 처방은 이전 라운드에서 세 번 시도하고 폐기했다.
 *
 * ⚠️ 검색 **근거**(matchReason)는 남는다. 설명과 답하는 질문이 다르다 —
 * 설명은 "무슨 사건인가", 근거는 "왜 이 행이 결과에 있는가"다. 그래서 근거의 한 종류가
 * '설명 일치'인 것은 그대로다(buildMatchReason).
 */

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
  keywordMax = 2,
  ariaLevel,
  positionInSet,
  setSize,
  ancestorContinues = false,
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
  /**
   * 종료 열의 토큰.
   *
   * 이 목록은 **시작만 보여 주고 있었다** — 종료는 기간 막대의 길이와 `title` 툴팁 안에만
   * 있었고, 툴팁조차 '시작일 · 기간'이라 종료 날짜 자체는 화면 어디에도 없었다
   * (사용자 지적). 실측 299행: 실제 종료일 131(44%) · 당일 152(51%) · 미상 16(5%).
   *
   * 규칙은 날짜 열과 **같은 문법**이다 — 연도는 그룹 머리글이 말하므로 같은 해면 월·일만,
   * 다른 해면 연도까지. 그래야 두 열이 한 범위의 양 끝으로 읽힌다.
   *  - 종료 없음        → 빈칸(그 빈칸이 '종료 미상'이라는 사실이다. 지어내지 않는다)
   *  - 시작과 같은 날   → '당일'. 날짜를 한 번 더 적는 것은 같은 말이고, 이건
   *                       '종료가 기록됐고 그날 끝났다'는 **다른 사실**이다(152행).
   *  - 연 정밀도        → 연도만. 월·일 sentinel(01-01)을 날짜로 내보내지 않는다.
   */
  const rowEndLabel = (() => {
    if (!endParts || !startParts) return null
    if (endParts.year < 0) return `BC ${Math.abs(endParts.year)}`
    if (
      endParts.year === startParts.year &&
      endParts.month === startParts.month &&
      endParts.day === startParts.day
    )
      return '당일'
    const precision = event.endDatePrecision
    const sameYear = groupYear != null && endParts.year === groupYear
    if (precision === 'year') return `${endParts.year}`
    if (precision === 'month')
      return sameYear
        ? `${endParts.month}월`
        : `${endParts.year}.${endParts.month}`
    if (endParts.month === 1 && endParts.day === 1) return `${endParts.year}`
    return sameYear
      ? `${endParts.month}.${endParts.day}`
      : `${endParts.year}.${endParts.month}.${endParts.day}`
  })()
  /** 종료 열의 전체 값 — 열 예산 때문에 축약된 토큰의 원본. */
  const rowEndTitle = (() => {
    if (!endParts) return undefined
    const era = endParts.year < 0 ? '기원전 ' : ''
    const yearText = `${era}${Math.abs(endParts.year)}년`
    const precision = event.endDatePrecision
    if (precision === 'year') return `종료 ${yearText}`
    if (precision === 'month') return `종료 ${yearText} ${endParts.month}월`
    if (endParts.month === 1 && endParts.day === 1) return `종료 ${yearText}`
    return `종료 ${yearText} ${endParts.month}월 ${endParts.day}일`
  })()
  /**
   * 행이 **그 사건의 날짜를 온전히(연·월·일) 보여주는가**.
   *
   * 연도는 그룹 머리글('2025년')이, 월·일은 날짜 열('6.12')이 댄다. 둘이 맞아떨어질 때만
   * 참이다 — 연 정밀도(열이 빈칸)·월 정밀도('9월')·그룹 밖 연도('(2024.3)', 일이 없다)·
   * 1월 1일 sentinel에서는 행이 날짜를 다 말하지 못한다.
   */
  const rowShowsFullDate =
    !!startParts &&
    startParts.year >= 0 &&
    !isOffGroupYear &&
    event.startDatePrecision !== 'year' &&
    event.startDatePrecision !== 'month' &&
    !(startParts.month === 1 && startParts.day === 1)
  /**
   * 화면에 그릴 제목 — 날짜 열이 이미 말한 괄호 날짜는 덜어낸다.
   * 같은 셀의 설명(buildSnippet)이 선두 날짜에 대해 이미 하고 있던 일을 제목에도 적용한다.
   * ⚠️ 원본(node.title)은 검색 하이라이트의 모수가 아니라 **표시 문자열만** 바뀌는 것이고,
   * aria-label·요약 모달·툴팁은 그대로 원본을 쓴다.
   */
  const displayTitle = (() => {
    if (!rowShowsFullDate) return node.title
    const trimmed = titleWithoutOwnDate(
      node.title,
      node.period.start,
      event.startDatePrecision,
    )
    if (trimmed === node.title) return node.title
    /* 검색어가 **덜어낸 꼬리에만** 걸려 있으면 원본을 남긴다 — 그 행이 결과에 뜬 이유가
       화면에서 통째로 사라지는 편이 중복보다 나쁘다('2025-06-12'로 검색한 경우). */
    const term = searchQuery?.trim().toLowerCase()
    if (
      term &&
      node.title.toLowerCase().includes(term) &&
      !trimmed.toLowerCase().includes(term)
    )
      return node.title
    return trimmed
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
  const duration = formatDuration(
    startParts,
    endParts,
    event.startDatePrecision,
    event.endDatePrecision,
  )
  /**
   * 기간 열의 막대 — 폐기된 타임라인 뷰에서 넘어온 유일한 인코딩(위치·길이 = 시간).
   * 축은 이 행이 놓인 **연 그룹**이라 좌표계를 설명할 축 헤더가 따로 필요 없다.
   * 놓을 수 없는 행(그룹과 어긋난 버킷 등)은 `null`이 되어 기간 텍스트로 되돌아간다.
   */
  const span = yearSpanGeometry({
    scopeYear: groupYear ?? null,
    start: startParts,
    end: endParts,
    startPrecision: event.startDatePrecision,
    endPrecision: event.endDatePrecision,
  })
  /**
   * 막대의 낭독값·툴팁 — 막대가 삼킨 문자열을 되돌려 놓는다. 막대만 남기면
   * 스크린리더에서 기간 열이 통째로 빈 칸이 되고, 정확한 날짜를 볼 표면도 사라진다.
   */
  const durationTitle = (() => {
    /* 예전엔 '시작일 · 기간'이라 **종료 날짜 자체가 어디에도 없었다**. 이제 종료 열이
       화면에 값을 싣지만, 그 열은 연도를 그룹에 맡겨 축약하므로 전체 값은 여기 남긴다. */
    const when = rowDateTitle ?? ''
    /* ⚠️ 당일 종료(152행)에는 화살표를 붙이지 않는다 — '6월 13일 → 6월 13일'은 같은 말을
       두 번 하는 것이고, 낭독에서는 그 반복이 그대로 두 번 읽힌다. */
    const range =
      rowEndTitle && rowEndLabel !== '당일'
        ? `${when} → ${rowEndTitle.replace(/^종료 /, '')}`
        : when
    if (!span || span.outside) return duration || range || undefined
    if (span.isPoint) return range || '1일'
    /* 잘린 막대는 이 해에 걸쳐 있다는 것만 말한다 — 실제 폭은 기간 문자열에만 있다. */
    return duration ? `${range} · ${duration}` : range
  })()
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
  /**
   * 관련국 칩에 **이름도** 적을 만큼 열이 넓은가.
   *
   * 별도 prop을 만들지 않고 flagMax로 판정한다 — 그 값 자체가 '이 열에 칩을 몇 개 놓을
   * 수 있는가'를 대역별로 이미 재어 둔 값이라, 폭 판정이 두 벌로 갈리지 않는다.
   * 4 이상 = 열 사다리 step 2·3(ledger/atlas) 대역이고, 거기서 관련국 열은 신축 트랙이다.
   */
  const flagsWithName = flagMax >= 4
  /* 이름이 붙으면 칩 하나가 3~5배 넓어진다 — 개수는 도로 줄인다(넘치는 분은 '+N'). */
  const effectiveFlagMax = hasTextChips
    ? Math.min(flagMax, 3)
    : flagsWithName
      ? Math.min(flagMax, 3)
      : flagMax
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
  const visibleKeywords = orderedKeywords.slice(0, Math.max(1, keywordMax))
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
      {/* 가지선 — **구슬은 언제나 선 위에 얹힌다**가 이 레일의 단일 문법이다.
          최상위 구슬이 줄기(축선) 위에 앉듯, 하위 구슬은 자기 가지선 위에 앉는다.
          그래서 행은 둘 중 하나라도 해당되면 이 요소를 그린다:
            · depth > 0  → 내가 얹힐 가지선(A)
            · 펼친 자식 → 자식들이 얹힐 가지선으로 꺾어 내려가는 엘보(B)
          (이력) 예전엔 depth 1 자식이 가지선 없이 축선에서 10px짜리 **가로 스텁**을
          하나씩 뽑아 썼다 — 실측 316행 중 115행(36%)이 그 스텁이라 거터가 다시
          빗살(comb)이 됐고, 무엇보다 하위 묶음의 시작·끝이 화면에 없었다. */}
      {(depth > 0 || (hasChildren && isExpanded)) && (
        <RailBranch
          aria-hidden="true"
          $child={depth > 0}
          $continues={(positionInSet ?? 1) < (setSize ?? 1)}
          $branching={hasChildren && isExpanded}
          $ancestor={depth > 1 && ancestorContinues === true}
        />
      )}
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
        {/* 종료 — 날짜와 한 쌍. 값이 없으면 칸은 비어 있고, 그 빈칸이 '종료 미상'이다. */}
        <EndCell
          data-row-end=""
          title={rowEndTitle}
          data-sameday={rowEndLabel === '당일' ? 'true' : undefined}
        >
          {rowEndLabel}
        </EndCell>
        <CategoryLabel
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
        <TitleCell>
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
            <Title data-row-title="" $withTrailing={Boolean(matchReason)}>
              {highlightMatches(displayTitle, searchQuery)}
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
            {/*
              (제거) 단독 토큰 '· 단독'.
              "앵커만 강조하면 표시 없는 147행이 기본값으로 읽혀 배지가 장식처럼 보인다"는
              근거로 다수 쪽을 물러나게 찍던 토큰인데, 실측 293행 중 **160행(55%)**이 달고
              있었다 — 절반이 넘게 붙는 표시는 두 층을 가르지 못하고 제목 끝마다 회색 덩어리를
              하나씩 남긴다. 설명이 제목 뒤를 잇는 조판이 되면서 그 자리는 실제 내용이 쓴다.
              양성 신호(앵커 배지·디스클로저 셰브론)만으로 두 층은 이미 갈린다.
            */}
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
        {/**
             * 요약 — 넓은 카드 전용 신축 열. 좁은 카드·모바일에서는 박스를 만들지 않는다.
             * aria-hidden이 아닌 이유: 스크린리더에도 실제로 값이 있는 텍스트다.
             *
             * 검색 중이면 설명 앞머리가 아니라 **매칭 근거**를 싣는다. 둘 다 설명에서 오지만
             * 답하는 질문이 다르다 — 앞머리는 "무슨 사건인가", 근거는 "왜 이 행이 결과에
             * 있는가"다. 검색 결과의 76%가 제목에 검색어가 없는 행이라, 검색 중에 근거를
             * 앞머리로 덮으면 CR-3이 고쳤던 '왜 걸렸는지 알 수 없는 목록'으로 되돌아간다.
             */}
            {matchReason && (
              <TrailingNote
                data-row-summary=""
                title={`${matchReason.kind} 일치: ${matchReason.text}`}
              >
                <MatchReasonKind>{matchReason.kind}</MatchReasonKind>{' '}
                {highlightMatches(matchReason.text, searchQuery)}
              </TrailingNote>
            )}
          </TitleText>
        </TitleCell>

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

        {/* 기간 — 그 해 안에서의 **위치와 길이**를 그리는 트랙(폐기된 타임라인 뷰의
            인코딩을 흡수한 자리). 실측 252행 중 133행(53%)이 '1일'이라 텍스트로 두면
            열의 절반이 같은 두 글자였고, 그나마도 '언제'는 말하지 않았다.
            막대는 언제·얼마나를 한 번에 말하고, 낭독·툴팁에는 원래 문자열이 그대로
            남는다(formatDuration에는 손대지 않는다 — precision 가드 보존). */}
        <Duration
          title={durationTitle}
          /* 연 격자는 **좌표계가 있는 행**에만 — 기간 문자열로 되돌아간 행의 글자 뒤에
             세로선을 깔면 그건 좌표가 아니라 무늬다. */
          $field={Boolean(span)}
          data-sameday={!span && duration === '1일' ? 'true' : undefined}
        >
          {span?.outside ? (
            /* 이 연 축 밖 — 부모를 따라 다른 해의 그룹에 놓인 자식. 막대를 그리면
               거짓이고, 빈 칸으로 두면 '기간 정보 없음'과 구별되지 않는다. */
            <OutsideMark $side={span.outside}>
              {span.outside === 'after' ? '›' : '‹'}
              <SrOnly>
                {span.outside === 'after'
                  ? '이 연도 이후의 사건'
                  : '이 연도 이전의 사건'}
                {durationTitle ? ` — ${durationTitle}` : ''}
              </SrOnly>
            </OutsideMark>
          ) : span ? (
            <>
              <SpanTrack aria-hidden="true">
                {span.isPoint ? (
                  <SpanPoint style={{ left: `${span.start * 100}%` }} />
                ) : (
                  <SpanBar
                    $approximate={span.approximate}
                    $clippedStart={span.clippedStart}
                    $clippedEnd={span.clippedEnd}
                    style={{
                      left: `${span.start * 100}%`,
                      width: `max(9px, ${(span.end - span.start) * 100}%)`,
                    }}
                  />
                )}
              </SpanTrack>
              {/* 막대는 낭독되지 않는다 — 기간 문자열이 접근성 트리의 유일한 값이다. */}
              <SrOnly>{durationTitle}</SrOnly>
            </>
          ) : duration === '1일' ? (
            <SrOnly>1일</SrOnly>
          ) : (
            <DurationText>{duration}</DurationText>
          )}
        </Duration>
        <Flags>
          <CountryFlags
            modern={event.relatedCountries}
            historical={event.relatedHistoricalCountries}
            /* 개수는 대역이 정한다(목록이 1회 계산). 폭만 줄이면 역사국가처럼 이모지가
               없어 국가명 전체가 텍스트 칩인 경우 글리프 중간에서 잘린다. */
            max={effectiveFlagMax}
            /* 넓은 대역에서는 이모지 옆에 이름을 적는다 — 삼색기는 서로 닮아서
               500px짜리 칸에 이모지 3개만 떠 있으면 폭도 뜻도 낭비다. */
            withName={flagsWithName}
            size="sm"
            /* 정식 명칭은 어떤 폭 예산으로도 안 담기는 것이 있다 — 라벨만 통용 약칭으로
               줄이고 정식 명칭은 툴팁·낭독 라벨에 남긴다(실측 521칩 중 190칩 말줄임). */
            shorten
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
  /* 면(배경·hover·선택 tint·하단 괘선)은 카드 안쪽 가장자리까지, 잉크는 패딩으로 들여쓴다
     — 목록의 모든 가로 면이 같은 두 세로선 위에 서게 하는 규약(list.styles의 bleedToEdges).
     예전엔 행만 컨테이너 패딩 안에 갇혀 있어 밴드(전폭)와 행(양쪽 17/9px 안쪽)의 끝선이
     달랐고, 선택 행 tint가 밴드보다 좁게 그려졌다. */
  ${bleedToEdges}
  padding: var(--row-pad-y) calc(var(--list-pad-r, 20px) + var(--row-pad-r))
    var(--row-pad-y) calc(var(--rail-gutter) + var(--row-pad-l));
  cursor: pointer;

  @media (max-width: 640px) {
    /* ⚠️ margin-left였다 — 이제 좌측 마진은 전폭 번짐(bleedToEdges)이 쓰므로 여기서
       덮어쓰면 행이 밴드보다 안쪽에서 시작한다. 들여쓰기는 패딩에 더한다. */
    padding-left: calc(
      var(--rail-gutter) + var(--row-pad-l) +
        min(calc(var(--row-indent) * var(--depth, 0)), 72px)
    );
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
   * ⚠️ 사다리는 **2겹**이다: 열 헤더(--col-header-h) → 연 헤더(--year-h + --year-mt).
   * 세기 헤더는 sticky가 아니다(근거는 list.styles.ts CenturyDivider) — 그 항이 남아 있으면
   * 스크롤 목적지가 44px 더 내려가 '선택한 행이 화면 한가운데로 튀는' 어긋남이 된다.
   * 한때는 반대로 열 헤더 한 단이 빠져 포커스 행 윗부분 16px이 연 헤더 뒤로 잘렸다
   * (cozy 행 45px의 36% — 검토 A11Y-10). 사다리 토큰의 합으로 두어 밴드 밀도를 바꿔도
   * 자동으로 따라오게 한다. 값의 정의는 list.styles.ts의 sticky top 2곳과 같은 출처다. */
  scroll-margin-top: calc(
    var(--col-header-h, 26px) + var(--year-h, 34px) + var(--year-mt, 16px)
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
   * ═══ 레일 눈금 — 이 행이 시간축 **위에** 있음을 말한다 ═══════════════════════
   *
   * 2026-08-01 배치 C1에서 폐지됐다가 되살렸다. 폐지 근거 네 가지는 전부 도트가
   * **카테고리 색**이고 **연도 앵커와 같은 크기**였다는 사실에서 나왔지, 눈금 자체를
   * 반대한 게 아니다 — 그리고 눈금을 지우자 축 위 눈금이 세기·연도 헤더뿐이 되면서
   * (17,000px 스크롤에 약 100개) 행이 축에 매달리지 않고 지면이 **표로** 읽혔다.
   * 사용자 판정: "타임라인 느낌이 전체적으로 덜 난다."
   *
   * 되살리되 네 근거를 각각 막는다.
   *  ① 카테고리 hue를 쓰지 않는다 — 중립 단색. 카테고리는 145px 옆 칩이 말한다.
   *  ② 그래서 다크 1.78:1 같은 대비 미달이 성립하지 않는다(색이 하나뿐이다).
   *  ③ 크기를 연도 앵커(9px)의 절반 아래로 묶는다 — 5px. 선택해도 6px까지만 커져
   *     눈금 서열(세기 16 > 연도 9 > 행 6)이 어떤 상태에서도 역전되지 않는다.
   *  ④ 하위 사건은 속을 비우고 흐리게 — 축을 훑을 때 세어지는 것은 최상위뿐이라
   *     '축 위 눈금 수 = 연대기 앵커 수'가 다시 참이 된다.
   *
   * 커넥터(::after)는 눈금에서 행 시작까지의 짧은 선이다. 이게 없으면 점이 축 옆에
   * 떠 있을 뿐 '이 행이 저 시점에 걸려 있다'가 안 읽힌다.
   */
  /**
   * 레일 트리의 두 x좌표.
   *
   *  --rail-tick-x  : 이 행의 **눈금**(점) x. depth 0이면 **축선 그 자체**다.
   *  --rail-spine-x : 이 행이 매달린 줄기 = 부모의 눈금 = 한 단 왼쪽.
   *
   *     ●  사건            (tick 17 = 축선)
   *     ├─○ 하위            (spine 17 = 축선 · tick 27)
   *     │  └─○ 손자         (spine 27 · tick 37)
   *     ●  사건
   *
   * ⚠️ 예전엔 depth 0의 눈금이 축에서 **한 단 오른쪽**(23px)에 있었다. 그래서 행마다
   * 점을 축에 이어 줄 26px짜리 가로 스텁이 필요했고, 301행 × (점 + 스텁)이 거터를
   * 파란 빗으로 만들었다(사용자 판정: "좌측 타임라인 선 최악"). 점을 축 위로 올리면
   *   ① 스텁이 최상위 행에서 통째로 사라지고(지면 잉크 −250획),
   *   ② '이 행이 저 시점에 걸려 있다'가 점이 선 위에 있다는 사실로 직접 읽히고,
   *   ③ 계층 장치(줄기·스텁)가 **실제로 계층이 있는 행에만** 남는다(실측 301행 중 48행).
   * 하위는 여전히 한 단씩 안으로 들어가므로 트리는 그대로다.
   *
   * 두 단까지만 민다(거터 예산 31px · 실측 최대 깊이 2).
   */
  --rail-depth-x: min(
    calc(var(--depth, 0) * var(--rail-depth-step, 6px)),
    calc(var(--rail-depth-step, 6px) * 2)
  );
  --rail-tick-x: calc(var(--rail-x) + var(--rail-depth-x));
  --rail-spine-x: calc(var(--rail-tick-x) - var(--rail-depth-step, 6px));
  /*
   * 내 자식들의 눈금 x — 분기 엘보(RailBranch ::after)가 꺾어 내려갈 목적지다.
   *
   * ⚠️ 그냥 '내 눈금 + 한 단'으로 잡으면 안 된다. 들여쓰기는 두 단에서 멈추므로
   * (위 min() clamp) depth 2의 자식은 부모와 **같은 x**에 선다 — 그때 엘보가 한 단
   * 오른쪽으로 꺾으면 자식의 가지선이 없는 허공으로 내려간다.
   * 같은 clamp를 depth + 1에 한 번 더 적용하면, 그 경우 폭이 1px로 줄어 엘보가
   * 저절로 '같은 x에서 곧장 내려가는 세로선'이 된다.
   */
  --rail-child-x: calc(
    var(--rail-x) +
      min(
        calc((var(--depth, 0) + 1) * var(--rail-depth-step, 6px)),
        calc(var(--rail-depth-step, 6px) * 2)
      )
  );

  &::before {
    content: '';
    position: absolute;
    /* 눈금 x — depth 0이면 축선 위다. 디바이더 도트와 같은 좌표계(카드 안쪽 가장자리 기준). */
    left: var(--rail-tick-x);
    top: 50%;
    /* 줄기·가지(RailBranch)보다 위 — 점이 선에 덮이면 눈금이 사라진다. */
    z-index: 1;
    transform: translate(-50%, -50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    /* 중립 — 축(3:1)보다 한 단 진한 5:1이라 선 위의 **구슬**로 읽힌다(theme.ts RAIL_TICK).
       파랑은 세기·연 앵커와 선택 행에만 남는다: 301개가 전부 같은 파랑이면 정보량 0이다. */
    background: ${({ theme }) =>
      theme.mode === 'dark' ? RAIL_TICK.dark : RAIL_TICK.light};
    /* ⚠️ 지면색 링(0 0 0 2px)을 뺐다 — 눈금이 축 위로 올라온 지금 그 링은 축을 눈금마다
       2px씩 끊어 **점선처럼** 보이게 하던 원인이다. 구슬이 선보다 진하므로 링 없이도
       선이 구슬 뒤로 사라진다. */
    pointer-events: none;
    transition: background 0.14s ease;
  }

  /*
   * (제거) 가로 스텁 ::after — ⚠️ styled 템플릿 안이라 이 주석에 백틱을 쓰지 말 것.
   *
   * 축선에서 하위 눈금까지 10px을 잇던 가로 선이다. depth 0 스텁 250개를 없앤 뒤에도
   * 하위 행 몫은 남아 있었는데, 실측 316행 중 **115행(36%)** 이 하위라 거터는 여전히
   * 가로 획 115개가 늘어선 빗이었다. 게다가 이 문법에는 **묶음의 경계가 없다** —
   * 자식 6개가 저마다 축선에서 따로 뻗어 나올 뿐, 어디서 시작해 어디서 끝나는지
   * 화면에 표시된 적이 없었다.
   *
   * 대신 하위 묶음마다 **세로 가지선 하나**를 세우고(RailBranch) 하위 눈금을 그 위에
   * 얹는다. 가로 획은 묶음당 한 개(분기 엘보)로 줄어 115 → 28개가 된다.
   */

  /* 하위 사건 — 가지선 위에 얹히는 **한 단 작은 구슬**(5 → 4px). */
  ${({ $depth }) =>
    $depth > 0 &&
    css`
      &::before {
        width: 4px;
        height: 4px;
        /* (제거) 속 빈 원 + 지면색 링. 링은 가로 스텁이 원 한가운데를 가로지르는 걸
           막으려던 장치인데, 스텁이 사라진 지금은 **세로 가지선**을 구슬마다 3px씩
           끊어 선을 파선으로 만든다.
           '축 위 구슬 수 = 최상위 사건 수'라는 불변식(근거 ④)도 이제 fill이 아니라
           **x 좌표**가 지킨다 — 하위 구슬은 축선 위에 있지도 않다. */
      }
    `}

  /* 선택 행 — 눈금이 브랜드색으로. 크기는 6px까지만(연 앵커 7px을 넘지 않는다). */
  ${({ $active }) =>
    $active &&
    css`
      &::before {
        width: 6px;
        height: 6px;
        background: ${BRAND.primary};
        /* ⚠️ 지면색 링을 뺐다 — 선택 행은 배경이 **파란 tint**라, 지면색 링이 그 위에
           흰 후광으로 떠올랐다(실측 스크린샷에서 확인). 구슬이 축보다 진하므로 링 없이도
           선이 뒤로 사라진다. */
      }
    `}

  /**
   * (이력) 2026-08-01 배치 C1의 폐지 기록 — 되살린 이유는 위에 있다.
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
const TitleCell = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns:
    [ind] min(calc(var(--row-indent) * var(--depth, 0)), 96px)
    [disc] var(--row-disc-btn)
    [text] minmax(0, 1fr);
  column-gap: 0;
  align-items: baseline;

  /* (제거) 빈 요약 트랙을 제목이 삼키던 grid-column: title / sumend.
     요약이 독립 열이 아니게 되면서 삼킬 빈 셀 자체가 없어졌고, sumend는 이제 제목 직후
     라인이라 이 선언은 어느 단계에서도 no-op이다. */

  @media (max-width: 640px) {
    /* 모바일에서는 셀 자체를 해제해 자식이 Body의 flex 아이템이 되게 한다 —
       2줄 행 규약이 직속 자식에 걸린 order로 동작하기 때문이다. */
    display: contents;
  }
`

/**
 * 레일의 **가지선** — 하위 묶음이 줄기(축선)에서 갈라져 나오는 선.
 *
 * ── 단일 문법: 구슬은 언제나 선 위에 얹힌다 ─────────────────────────────────
 * 최상위 구슬이 줄기 위에 앉는 것처럼, 하위 구슬도 **자기 가지선 위에** 앉는다.
 * 그래서 깊이를 말하는 것은 구슬의 생김새가 아니라 *어느 선 위에 있는가*다.
 *
 *     ● 부모            ─┐  (B) 내 구슬에서 꺾어 자식 가지선으로 내려가는 엘보
 *                        │
 *                        ● 자식 1   (A) 자식이 자기 가지선 위에 얹힌다
 *                        ● 자식 2
 *                        ● 자식 3   막내에서 선이 끝난다 → 묶음의 **종단**
 *     ● 다음 사건
 *
 * ── 왜 바꿨나 ───────────────────────────────────────────────────────────────
 * 직전 문법은 자식마다 축선에서 10px짜리 **가로 스텁**을 뽑았다. 실측 316행 중
 * 115행(36%)이 하위라, 좌측 거터가 가로 획 115개가 늘어선 빗(comb)이었다 —
 * 두 라운드 전에 "좌측 타임라인 선 최악"이라는 판정을 받고 depth 0 스텁 250개를
 * 없앴던 바로 그 텍스처가 하위 행 몫으로 남아 있었다.
 * 그보다 결정적인 결함은 **묶음의 경계가 화면에 없었다**는 것이다. 자식 6개가
 * 저마다 축선에서 따로 뻗어 나오니, 어디서 시작해 어디서 끝나는지는 들여쓰기로
 * 추론할 수밖에 없었다(실측: 가지선을 그리던 행이 316개 중 9개뿐이었다 —
 * depth 1 자식 115행은 세로선을 단 하나도 갖지 않았다).
 *
 * 획 수도 줄어든다: 가로 획 115 → **28개**(펼친 부모 수), 세로 가지선 28벌.
 *
 * ⚠️ depth 0 구슬은 줄기 위에 있으므로 자기 선을 그리지 않는다. 그 자리가 곧 축선이고,
 *    축선은 스크롤러 배경이 이미 연속으로 그린다(겹쳐 그리면 그 구간만 두 겹이 된다).
 * ⚠️ '막내인가'는 aria용 posinset/setsize를 그대로 읽는다. 그 값은 연 버킷 안에서
 *    parentNodeId로 묶은 형제 시퀀스라(levelPositionById) '아래에 형제 행이 더 있다'와
 *    정확히 같은 뜻이다 — 계층 판정을 위해 배열을 다시 훑지 않는다.
 * ⚠️ 잉크는 축선과 **같은 값**(RAIL_CONNECTOR = RAIL_AXIS)이다. 가지선이 축의 흐린
 *    복사본으로 읽히면 안 되고, 겹치는 자리에서 색이 어긋난 이중선이 돼서도 안 된다.
 */
const RailBranch = styled.span<{
  $child: boolean
  $continues: boolean
  $branching: boolean
  $ancestor: boolean
}>`
  position: absolute;
  top: 0;
  /*
   * ⚠️ -1px. 절대 위치의 기준은 행의 **패딩 상자**라 행 하단 hairline(1px) 위에서 끝난다 —
   * 그러면 가지선이 행 경계마다 1px씩 끊겨 파선으로 보인다(줄기는 스크롤러 배경이라
   * 끊기지 않는데 가지선만 끊기면 둘이 다른 종류의 선으로 읽힌다). 실측 31px/32px.
   */
  bottom: -1px;
  left: 0;
  width: var(--rail-gutter);
  /* 구슬(Stop::before, z-index 1) **아래**로 깔린다 — 선이 구슬을 덮으면 눈금이 사라진다. */
  z-index: 0;
  pointer-events: none;

  /*
   * (C) 조부모 몫의 세로선 — 손자 행이 지나가는 구간을 대신 잇는다.
   *
   * 손자 행은 자기 가지선을 한 단 오른쪽에 그리므로, 그 몇 행 동안 부모의 가지선은
   * 아무도 그리지 않는다. 부모가 막내가 아니면 그 구간에서 선이 끊겨 다음 삼촌 행의
   * 선이 허공에서 다시 시작하는 것처럼 보인다.
   * 남은 pseudo 슬롯이 없어 **배경 그라디언트**로 그린다(::before·::after는 A·B가 쓴다).
   */
  ${({ $ancestor, theme }) => {
    if (!$ancestor) return ''
    const ink =
      theme.mode === 'dark' ? RAIL_CONNECTOR.dark : RAIL_CONNECTOR.light
    return css`
      background-image: linear-gradient(
        to right,
        transparent var(--rail-spine-x),
        ${ink} var(--rail-spine-x),
        ${ink} calc(var(--rail-spine-x) + 1px),
        transparent calc(var(--rail-spine-x) + 1px)
      );
      background-repeat: no-repeat;
    `
  }}

  /* (A) 내 가지선 — 내 구슬이 얹히는 선. 막내면 구슬에서 끝나 묶음의 종단이 된다. */
  ${({ $child, $continues, theme }) =>
    $child &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: var(--rail-tick-x);
        top: 0;
        /* 형제가 더 있으면 행 아래까지 이어 다음 형제의 토막과 만난다.
           막내면 50% — 내 구슬이 선의 끝이다. */
        height: ${$continues ? '100%' : '50%'};
        width: 1px;
        background: ${theme.mode === 'dark'
          ? RAIL_CONNECTOR.dark
          : RAIL_CONNECTOR.light};
      }
    `}

  /*
   * (B) 분기 엘보 — 내 구슬에서 오른쪽으로 꺾어 자식 가지선의 머리로 내려간다.
   *
   * 묶음당 **하나**다(예전엔 자식마다 하나였다). border-top + border-right 한 상자로
   * 가로·세로를 동시에 그리고, 만나는 모서리를 둥글려 '갈라진다'를 말한다.
   * ⚠️ box-sizing: border-box(전역 리셋)라 오른쪽 보더는 상자 폭 **안쪽**에 그려진다 —
   *    폭을 (자식 눈금 x − 내 눈금 x) + 1px로 잡아야 보더가 정확히 자식 가지선 위에 선다.
   *    들여쓰기 clamp에 걸린 깊이에서는 이 값이 1px이 돼 엘보가 세로선 한 줄로 축퇴한다.
   */
  ${({ $branching, theme }) =>
    $branching &&
    css`
      &::after {
        content: '';
        position: absolute;
        left: var(--rail-tick-x);
        top: 50%;
        bottom: 0;
        width: calc(var(--rail-child-x) - var(--rail-tick-x) + 1px);
        border-top: 1px solid
          ${theme.mode === 'dark'
            ? RAIL_CONNECTOR.dark
            : RAIL_CONNECTOR.light};
        border-right: 1px solid
          ${theme.mode === 'dark'
            ? RAIL_CONNECTOR.dark
            : RAIL_CONNECTOR.light};
        border-top-right-radius: 4px;
      }
    `}

  /*
   * 좁은 폭(≤640) — 계층은 행 들여쓰기가 맡는다(Indent도 여기서 사라진다).
   * ⚠️ 가지선을 지우면 하위 구슬이 아무 선에도 얹히지 않은 채 뜬다. 그래서 같은
   *    대역에서 --rail-depth-step을 0으로 눕혀 **구슬을 줄기 위로 되돌린다**
   *    (list.styles.ts의 ≤640 블록). 둘은 한 쌍이다.
   */
  @media (max-width: 640px) {
    display: none;
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

/**
 * 자식 없는 행도 같은 폭을 예약해 제목 텍스트 시작점이 흔들리지 않게 한다.
 *
 * ⚠️ `align-self: center`가 **필수**다. 제목 셀은 baseline 정렬인데, 내용이 없는 24px
 * 상자의 베이스라인은 제 아래 모서리다 — 즉 이 스페이서 혼자서 셀 전체를 24px 아래로
 * 떠받치고 있었다. 설명이 한 줄일 때는 그 힘이 행 높이를 정했고(36px), 두 줄이 되자
 * 제목 위에 **12px짜리 빈 띠**로 남았다(셀 32.9 → 44.9px, 실측 298행 중 237행).
 * 보이지 않는 상자이므로 가운데로 빼도 그리는 것은 달라지지 않는다.
 */
const DiscSpacer = styled.span`
  grid-column: disc;
  align-self: center;
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

  /*
   * 제목과 설명이 한 줄의 앞뒤다. 제목은 이미 flex: 0 1 auto + min-width: 8ch라
   * 자기 잉크만큼만 차지하고(Title 참조), 남는 폭은 검색 근거(TrailingNote)가 먹는다.
   * ⚠️ 여기서 제목에 min-width: 0을 덮어쓰지 말 것 — 390px에서 제목 폭이 0이 되던
   * 회귀를 8ch가 막고 있다.
   */

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

/* (제거) SoloToken — '· 단독'. 293행 중 160행(55%)이 달고 있어 두 층을 가르지 못했고,
   설명이 제목 뒤를 잇게 되면서 그 자리는 실제 내용이 쓴다. */

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

/**
 * 종료 열 — 날짜(Year)와 **한 쌍**이다.
 *
 * 같은 폭(--col-date)·같은 우측정렬·같은 tabular 숫자라, 두 열이 한 범위의 양 끝으로
 * 읽힌다. 다른 점은 **한 단 흐리다**는 것뿐이다 — 이 목록의 정렬 축은 시작이고,
 * 종료는 그 시작에 딸린 값이다. 같은 무게로 두면 눈이 매번 둘 중 어느 쪽이 기준인지
 * 되물어야 한다.
 *
 * ⚠️ 값이 없으면 **빈칸**이다. 'ー'나 '미상' 같은 토큰을 채우지 않는다 — 299행 중
 * 193행(65%)이 여기 해당해서, 채우는 순간 화면의 3분의 2가 같은 글자의 반복이 된다.
 * ⚠️ step 0(6트랙)에는 [end] 라인이 없다. grid-column을 걸면 CSS가 **암묵 트랙**을
 * 만들어 행이 헤더보다 넓어지므로, 열 사다리의 다른 늦은 열들과 같은 게이트를 쓴다.
 */
const EndCell = styled.span.attrs(() => ({ 'data-col': 'end' }) as Record<string, string>)`
  display: none;

  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: block;
    grid-column: end;
    text-align: right;
    font-size: var(--row-meta);
    font-weight: 500;
    letter-spacing: 0;
    color: ${metaText};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /*
   * 당일 종료 — 실측 299행 중 **152행(51%)**이다. 이 열을 세로로 훑는 목적은 '며칠짜리
   * 사건이 어디 있나'를 찾는 것인데, 절반을 차지하는 기본값이 실제 종료일(131행 = 44%)과
   * 같은 무게로 찍히면 찾을 것이 텍스처에 묻힌다. 값을 지우지는 않는다 — 종료 미상(16행)과
   * 당일 종료는 다른 사실이고, 이 목록은 그 둘을 예전부터 구별해 왔다(formatDuration 주석).
   * 날짜가 아니라 **사실의 이름**이므로 숫자 서식(tabular)에서도 빼낸다.
   */
  &[data-sameday='true'] {
    font-variant-numeric: normal;
    /*
     * ⚠️ 0.42였다. 그 값의 실측 대비는 라이트 **1.75:1** · 다크 2.27:1로,
     * '한 단 흐리다'가 아니라 **안 보인다**에 가까웠다(WCAG 1.4.3 텍스트 하한 4.5:1,
     * 비텍스트 하한 3:1). 절반이 같은 글자라는 원래 문제의식은 그대로 두되, 눌러서
     * 없애는 것이 아니라 한 단만 내린다 — 실제 종료일(4.48:1)과의 차이는 남고,
     * 당일 종료와 종료 미상(빈칸)의 구별도 비로소 화면에서 성립한다.
     * 알파가 테마마다 다른 이유는 배경이 다르기 때문이다(흰 바탕은 더 진해야 같은 대비).
     */
    opacity: ${({ theme }) => (theme.mode === 'dark' ? 0.58 : 0.75)};
  }

  @media (max-width: 640px) {
    display: none;
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

const Title = styled.span<{ $withTrailing?: boolean }>`
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

  /*
   * **검색 근거와 한 칸을 나눠 쓸 때만** 상한을 둔다 — 제목이 트랙을 통째로 먹으면 근거가
   * 0~31px로 찌그러져 '공…' 같은 잔해만 남는다(실측 1280px에서 최소 0px, 1440px에서 31px).
   * 비율이라 폭이 넓어지면 상한도 함께 커져, 2200px에서는 어떤 제목도 여기에 걸리지 않는다.
   * 검색 중이 아닌 행(= 평소 전부)에는 걸지 않는다 — 걸 이유가 없는데 제목만 잘린다.
   */
  ${({ $withTrailing }) =>
    $withTrailing &&
    css`
      @container eventcard (min-width: ${LIST_STEPS.summary}px) {
        max-width: 62%;
      }
    `}

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
const CategoryLabel = styled.span.attrs(() => ({ 'data-col': 'cat' }) as Record<string, string>)<{
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
  /*
   * 우측 정렬 — 색 면(fill)을 지운 뒤로 '칩의 좌·우 모서리가 스캔선'이라는 계약은
   * 트랙 폭이 아니라 **글자 끝**이 이행한다. 가운데 정렬이면 라벨 길이가 2~5글자로
   * 흩어지는 만큼 양쪽 끝이 다 흔들려(실측 좌 276~294 · 우 318~336) 세로선이 하나도
   * 서지 않는다. 오른쪽에 붙이면 날짜(우측 정렬)와 함께 제목 바로 앞에 두 줄기
   * 세로선이 생기고, '언제·무엇' 두 토큰이 제목으로 이어지는 한 덩어리로 읽힌다.
   */
  justify-content: flex-end;
  /* 면(fill)이 없는 칩의 좌우 패딩은 여백이 아니라 **정렬 오차**다 — 6px이 남아 있어
     글자 끝이 트랙(과 열 머리글) 끝에서 6px 안쪽에 섰다(실측 330 vs 336). 칩 사이
     간격은 격자의 column-gap이 이미 만든다. */
  padding: 0;
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
/**
 * 설명 — **열이 아니라 제목 뒤를 잇는 글**이다.
 *
 * 고정 폭 열이던 시절엔 제목 트랙(520~760px)이 가장 긴 제목에 맞춰져 있어 제목 잉크 끝과
 * 이 글 사이가 중앙값 270px 벌어졌다. 이제 같은 셀 안에서 제목 바로 뒤를 잇고 남는 폭을
 * 전부 먹는다 — 보이는 글자 수가 340px 고정에서 배 이상 늘고, 건너뛸 빈 구간이 사라진다.
 */
/**
 * 제목 뒤에 붙는 **검색 근거** 한 줄 — 예전의 설명 자리다.
 *
 * 설명을 걷어낸 뒤 이 자리에 남는 것은 "왜 이 행이 결과에 있는가"뿐이다. 검색 결과의
 * 76%가 제목에 검색어가 없는 행이라, 이 줄이 없으면 목록이 '왜 걸렸는지 알 수 없는
 * 행 묶음'이 된다. 검색 중이 아니면 아예 렌더되지 않으므로 평소 행은 제목 하나다.
 */
const TrailingNote = styled.span`
  display: none;

  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: block;
    /* 제목이 자기 잉크만큼 쓰고 남는 폭을 받는다 — 제목보다 먼저 줄어든다. */
    flex: 1 1 0;
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
const KeywordCell = styled.span.attrs(() => ({ 'data-col': 'kw' }) as Record<string, string>)`
  display: none;

  /* ⚠️ ledger(8트랙)에서 summary로 **내려왔다**. 이 열이 ledger에 있던 이유는 그 아래
     대역의 남는 폭을 설명이 이미 쓰고 있었기 때문인데, 설명을 걷어내며 그 전제가 사라졌다.
     키워드는 짧은 칩이라 좁은 카드에도 들어가고, 지금은 제목 뒤 빈 폭을 메우는 유일한
     내용이다(안 그러면 1,062px 카드에서 제목 뒤 300px이 그냥 빈다). */
  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
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
const RegisteredCell = styled.span.attrs(() => ({ 'data-col': 'reg' }) as Record<string, string>)`
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

/**
 * 기간 트랙 — 이 행이 속한 연 그룹의 1월 1일 ~ 12월 31일이 열의 좌우 끝이다.
 * 좌표계는 그룹 머리글('1911년')이 이미 말하고 있으므로 축 헤더를 따로 세우지 않는다.
 *
 * 바탕 실선 한 줄을 깔아 **빈 트랙과 짧은 막대**를 구분한다 — 선이 없으면 1월 초
 * 사건의 3px 점이 '아무것도 없음'과 같은 자리에서 같은 무게로 읽힌다.
 */
const SpanTrack = styled.span`
  position: relative;
  display: block;
  /* 셀이 flex가 되면서(Duration) 트랙은 남는 폭을 전부 가져가는 신축 항목이다 */
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 9px;
  align-self: center;
  /* 연 격자(Duration::before, z 0)보다 위 — 바탕선·막대가 격자에 먹히지 않는다 */
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(20,19,34,0.07)'};
  }

  /*
   * (제거) 분기 눈금(::after) — 1·4·7·10월 자리의 세로선 4개 + 연말 경계선.
   *
   * 도입 근거는 '축 헤더 없이 대충 언제인지 읽게 한다'였는데, **그 질문은 날짜 열이 이미
   * 정확히 답한다**(같은 행 왼쪽에 '7.27'이 있다). 눈금이 실제로 한 일은 293행 × 5선 =
   * 1,465개의 세로 획을 한 열에 반복해 깐 것이고, 그 격자 텍스처가 정작 값(점·막대)보다
   * 먼저 읽혔다(사용자 판정: "디자인이 어수선하다").
   *
   * 남는 인코딩은 **위치(연 안의 시점)와 길이(지속)** 이고 둘 다 바탕선 하나로 읽힌다.
   * 되살릴 거라면 눈금은 행이 아니라 **열 머리글에 한 번** 그릴 것 — 축은 한 번, 데이터는
   * 행마다다.
   */
`

/**
 * 막대·점의 잉크 — **중립 단색**.
 *
 * 분류 hue를 그대로 썼었다. 그러면 같은 사실(카테고리)이 한 행에서 두 번, 그것도
 * 900px 떨어진 두 열에서 색으로 인코딩된다 — 왼쪽 '분류' 열의 색 글자와 오른쪽 '기간'
 * 열의 색 점이다. 화면의 색 수가 배로 늘 뿐 새로 읽히는 것은 없고, 정작 기간 열이
 * 말해야 할 **위치와 길이**는 색과 무관하다.
 *
 * 색은 분류 열이 단독으로 싣고, 기간 열은 모양(점/막대)과 좌표만 싣는다.
 * 값은 이 지면의 메타 잉크(META_TEXT)와 같다 — 새 팔레트를 만들지 않는다.
 * 라이트 #6b7280 = 4.83:1 · 다크 #a1a1aa = 7.48:1 (WCAG 1.4.11 3:1 통과).
 */
const spanInk = css`
  background: ${metaText};
`

const SpanBar = styled.span<{
  $approximate: boolean
  $clippedStart: boolean
  $clippedEnd: boolean
}>`
  ${spanInk};
  position: absolute;
  top: 50%;
  /* 눈금(::after)보다 위 — 안 그러면 분기 선이 막대를 가로질러 두 동강 내 보인다. */
  z-index: 1;
  height: 7px;
  transform: translateY(-50%);
  border-radius: 4px;

  /*
   * 일 정밀도가 아닌 막대는 '지속 기간'이 아니라 **아는 범위**다(연 정밀도 = 그 해 어딘가).
   * 흐리게·각지게 그려 확정된 기간과 눈으로 갈라 놓는다 — 같은 모양으로 그리면
   * '1911년에 있었다'가 '1911년 내내 계속됐다'로 읽힌다.
   */
  ${({ $approximate }) =>
    $approximate &&
    css`
      opacity: 0.4;
      border-radius: 1px;
    `}

  /*
   * 창 밖으로 이어지는 끝은 흐려지며 끊긴다. 직각으로 뚝 잘리면 1914~1918 전쟁이
   * 1916년 그룹에서 '1916년 12월 31일에 끝난 사건'으로 읽힌다.
   */
  ${({ $clippedStart, $clippedEnd }) => {
    if (!$clippedStart && !$clippedEnd) return ''
    const from = $clippedStart ? 'transparent 0, #000 9px' : '#000 0'
    const to = $clippedEnd ? '#000 calc(100% - 9px), transparent 100%' : '#000 100%'
    return css`
      border-radius: ${$clippedStart ? 1 : 4}px ${$clippedEnd ? 1 : 4}px
        ${$clippedEnd ? 1 : 4}px ${$clippedStart ? 1 : 4}px;
      mask-image: linear-gradient(to right, ${from}, ${to});
    `
  }}
`

/**
 * 연 축 밖 표지 — 트랙의 그 방향 끝에 붙는 홑화살표. 막대가 없는 이유를 한 글자로
 * 말한다(‹ = 이 해 이전, › = 이 해 이후). 조용해야 한다 — 이건 사실이 아니라 각주다.
 */
const OutsideMark = styled.span<{ $side: 'before' | 'after' }>`
  display: block;
  /* ⚠️ flex 항목이라 width 를 주지 않으면 글리프 폭으로 쪼그라들어, '‹'(이 해 이전)가
     justify-content: flex-end에 밀려 트랙 **오른쪽 끝**에 선다 — 뜻이 뒤집힌다. */
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  position: relative;
  z-index: 1;
  text-align: ${({ $side }) => ($side === 'after' ? 'right' : 'left')};
  font-size: 13px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.7;
`

/**
 * 막대를 놓을 수 없는 행의 **기간 문자열**.
 *
 * 말줄임이 예전엔 셀(Duration)에 걸려 있었는데, 셀이 연 격자를 그리는 상자가 되면서
 * `overflow: hidden`을 거기 둘 수 없게 됐다(격자가 행 밖으로 뻗는다). 클립과 말줄임을
 * 글자 자신의 상자로 내린다.
 *
 * ⚠️ 우측정렬 + hard clip이면 LTR에서 **시작(좌측)** 이 잘린다 — '12년 11개월'(약 68px)이
 * 56px 트랙에서 '년 11개월'로 렌더돼 앞자리가 소리 없이 사라졌다.
 */
const DurationText = styled.span`
  min-width: 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 당일 사건 — 폭이 없는 사실을 폭으로 그리지 않는다. */
const SpanPoint = styled.span`
  ${spanInk};
  position: absolute;
  top: 50%;
  z-index: 1;
  /* 막대 최소폭(9px)보다 **작게** 잡는다 — 12일짜리 사건이 당일 사건보다 작아 보이던
     역전을 막는다(같은 크기면 원/캡슐 구분만으로는 안 읽힌다). */
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
`

const Duration = styled.span.attrs(() => ({ 'data-col': 'dur' }) as Record<string, string>)<{ $field: boolean }>`
  grid-column: dur;
  /*
   * 격자 기본은 baseline이지만 이 칸의 주 내용은 글자가 아니라 **막대**다.
   *
   * ⚠️ 이전 값은 center였다. 그러면 셀 상자가 트랙(9px) 높이로 쪼그라들어 **연 격자를 그릴 면이
   * 없다** — 격자는 행 높이를 꽉 채우고 위아래 행의 격자와 맞닿아야 한 줄로 이어진다.
   * 셀을 늘리고, 가운데 정렬은 flex가 대신 맡는다(내용물의 위치는 이전과 픽셀 동일).
   */
  align-self: stretch;
  position: relative;
  display: flex;
  align-items: center;
  /* 폴백 문자열·막대 트랙 모두 트랙 우단 기준 — 예전 text-align: right와 같은 결과 */
  justify-content: flex-end;
  font-size: var(--row-meta);
  font-weight: 500;
  letter-spacing: 0;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  /*
   * ⚠️ overflow: hidden이 여기 있었다. 말줄임은 이제 DurationText가 자기 상자 안에서
   * 하고(아래), 셀에 클립이 남아 있으면 **행 밖으로 뻗는 연 격자가 잘려** 행마다
   * 끊긴 획으로 되돌아간다 — 정확히 2026-08-01에 폐기된 그 모양이다.
   */

  /**
   * ═══ 연 격자 — 이 열이 '한 해'라는 좌표계를 가졌다고 말하는 바탕 ═══════════════
   *
   * 세로선 다섯(연 경계 2 + 4·7·10월 3)을 **행 패딩만큼 위아래로 뻗어** 그린다.
   * 위 행의 아래 끝과 아래 행의 위 끝이 정확히 맞닿으므로, 연 그룹을 관통하는
   * 연속선 한 벌이 된다(행마다 끊기는 짧은 획이 아니다 — 근거는 theme.ts SPAN_GRID).
   * 연 그룹이 바뀌면 사이에 연 헤더가 끼어 격자도 함께 끊긴다: 축이 해마다 새로
   * 시작한다는 사실이 그대로 그려진다.
   *
   * ⚠️ 백분율 background-position은 **상자 기준**이라 0%·100%가 트랙 양 끝에 정확히
   * 선다 — 열 머리글의 눈금(List.DurationAxis)과 같은 산식이라 둘이 한 자로 이어진다.
   * ⚠️ 좌표계가 없는 행(span 이 null — 기간 문자열로 되돌아간 행)에는 그리지 않는다.
   *    글자 뒤의 격자는 좌표가 아니라 그냥 무늬다.
   */
  ${({ $field, theme }) => {
    if (!$field) return ''
    const ink = theme.mode === 'dark' ? SPAN_GRID.dark : SPAN_GRID.light
    const line = (color: string) => `linear-gradient(${color}, ${color})`
    return css`
      &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        /* 행 패딩 + 하단 hairline 1px까지 덮어 위아래 행과 맞닿는다 */
        top: calc(-1 * var(--row-pad-y));
        bottom: calc(-1 * var(--row-pad-y) - 1px);
        z-index: 0;
        pointer-events: none;
        background-repeat: no-repeat;
        background-size: 1px 100%;
        /*
         * 좁은 대역(트랙 48~96px)에서는 **연 경계 둘만** 그린다. 분기까지 넣으면 눈금
         * 간격이 12~24px이라, 6px 점 하나가 한 칸의 절반을 덮는다 — 그 폭에서 격자는
         * 좌표가 아니라 텍스처다. 양 끝 두 선은 그 폭에서도 '이 칸이 한 해'라는 사실을
         * 공짜로 싣는다(열 머리글의 1월·12월 라벨과 같은 임계에서 갈린다).
         */
        background-image: ${line(ink.year)}, ${line(ink.year)};
        background-position:
          0 0,
          100% 0;

        @container eventcard (min-width: ${LIST_STEPS.summary}px) {
          background-image: ${line(ink.year)}, ${line(ink.quarter)},
            ${line(ink.quarter)}, ${line(ink.quarter)}, ${line(ink.year)};
          background-position:
            0 0,
            25% 0,
            50% 0,
            75% 0,
            100% 0;
        }
      }
    `
  }}

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

const Flags = styled.span.attrs(() => ({ 'data-col': 'flags' }) as Record<string, string>)`
  grid-column: flags;
  align-self: center;
  /*
   * 텍스트 칩(역사국가)의 개별 상한.
   *
   * 52px이었다 — '트랙 128px에 2칩 + "+N"이 들어가려면'이라는 **최악의 경우**로 잡은 값인데,
   * 그 최악은 fit 모드의 flex 축소가 이미 처리한다(칩 둘이 같은 상한에서 출발하면 남는 폭을
   * 균등하게 나눠 갖는다). 결과적으로 상한은 최악의 경우엔 **아무 일도 하지 않고**, 칩이
   * 하나뿐인 다수 행에서만 작동해 128px 트랙에 52px짜리 '독일 …'을 그렸다(실측: 역사국가를
   * 가진 행의 다수가 1칩). 상한을 트랙이 실제로 줄 수 있는 폭까지 올린다 —
   * 2칩일 때 계산값은 종전과 같고(둘 다 상한에 걸려 균등 축소), 1칩일 때만 이름이 살아난다.
   *
   * 76 → 92: 실측 재측정에서 **정식 명칭 전체가 들어가고도 남는 행**이 도리어 잘리고
   * 있었다. 2칩 + '+N' 행의 자연 폭 합계는 141px(칩 58+49 · '+N' 26 · gap 8)로 트랙
   * 128px을 13px 넘겼고, 그 13px이 두 칩에 나뉘어 '러시아 …' · '일본 …'이 됐다 —
   * 모자란 양이 이렇게 작을 때 답은 상한이 아니라 **트랙**이다(theme.ts colFlags 128 → 172).
   * 상한은 1칩 행이 그 넓어진 트랙을 다 쓰게만 해 준다.
   */
  --flag-name-max: 92px;
  display: inline-flex;
  align-items: center;
  /*
   * 칩 묶음을 트랙 **우단**에 붙인다.
   *
   * 관련국은 마지막 데이터 열인데 칩 수가 행마다 0~3개(실측 잉크 폭 26~147px)로 달라,
   * 좌측 정렬이면 행의 마지막 잉크가 매 행 다른 x에서 끝난다 — 카드 오른쪽에 폭
   * 53~120px짜리 들쭉날쭉한 빈 띠가 293행 내내 생긴다(광폭 단계에서 특히 크다).
   * 우단에 붙이면 남는 폭은 기간 트랙과 칩 **사이**의 일정한 간격으로 바뀌고,
   * 행의 오른쪽 끝선이 하나로 선다. 빈 트랙만큼 줄여 제목에 주는 길은 택하지 않았다 —
   * 관련국 3개 + '+N'은 그 폭을 실제로 쓴다(광폭 단계 실측 상한 147px).
   */
  justify-content: flex-end;

  /*
   * 이름 예산은 트랙과 함께 넓어진다 — 역사국가는 이모지가 없어 칩이 곧 국가명인데,
   * 52px 고정이면 광폭에서도 '독일 …' · '프랑스 제…'로 잘려 독일 제국/독일 연방을
   * 가르지 못했다(실측). 상한은 **트랙이 1칩에 줄 수 있는 폭**이고, 2칩 이상은 위에 적은
   * 대로 flex 축소가 균등하게 나눈다(ledger 200px 트랙에서 2칩 + '+N'이면 칩당 약 85px).
   */
  @container eventcard (min-width: ${LIST_STEPS.ledger}px) {
    --flag-name-max: 104px;
  }

  @container eventcard (min-width: ${LIST_STEPS.atlas}px) {
    --flag-name-max: 132px;
  }
  /* 국기/역사국가 칩이 폭 초과의 주범이다 — 역사국가는 이모지가 없어 국가명 전체가
   * 텍스트 칩(max-width 80px)으로 그려지므로 3개면 270px에 달한다. 넘칠 때는 제목을
   * 0으로 만드는 대신 여기서 흡수한다(좁은 폭에선 max=1로 개수 자체도 줄인다). */
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;

  @media (max-width: 640px) {
    order: 1;
    /* 모바일 메타 줄에서는 Flags가 격자 셀이 아니라 flex 아이템이라 우측 정렬할 '트랙'이
       없다 — 그대로 두면 상한(112px) 안에서 칩이 오른쪽으로 밀려 앞 토큰과 벌어진다. */
    justify-content: flex-start;
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
