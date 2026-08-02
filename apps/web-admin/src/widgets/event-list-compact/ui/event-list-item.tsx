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
  FiGitBranch,
  FiLayers,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { type IsoDateParts, parseIsoDateParts } from '@/shared/lib/iso-date'

import {
  CATEGORY_SOFT_COLORS,
  metaText,
} from '../../../pages/events/styles/theme'
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
  /** 직계 자식 수 — 접었을 때 무엇이 숨는지 알려주는 배지 */
  childCount?: number
  /** 필터 때문에 숨겨진 직계 자식 수 — 조용한 누락 방지 */
  hiddenChildCount?: number
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
   * 좁은 폭(≤640px) 여부. 목록이 **한 번만** 계산해 내려준다 — 행마다 useMediaQuery를
   * 부르면 matchMedia 리스너가 행 수만큼(수백 개) 생긴다.
   * 폭이 모자란 곳에서 무엇을 먼저 포기할지(국기 개수·자식 수 배지)를 결정한다.
   */
  isNarrow?: boolean
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

const EventListItemImpl: React.FC<EventListItemProps> = ({
  node,
  event,
  depth,
  isExpanded,
  hasChildren,
  childCount = 0,
  hiddenChildCount = 0,
  isMatch = true,
  isActive,
  dbCategories,
  isBookmarked = false,
  searchQuery,
  groupYear,
  isNarrow = false,
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
  const isOffGroupYear =
    !startParts || startParts.year < 0 || groupYear == null || startParts.year !== groupYear
  const rowDateLabel = (() => {
    if (!startParts) return '미상'
    if (startParts.year < 0) return `기원전 ${Math.abs(startParts.year)}`
    if (groupYear != null && startParts.year === groupYear) {
      const precision = event.startDatePrecision
      if (precision === 'year') return '' // 명시적 연-정밀도 → 그룹 헤더에 위임
      if (precision === 'month') return `${startParts.month}월`
      // 'day' 또는 precision 미기록(대부분 실제 월·일 보유) → 월.일.
      // 단 01-01은 연도만 아는 값이 sentinel로 저장된 것일 수 있어(BC·고대 재구성 등) 생략.
      if (startParts.month === 1 && startParts.day === 1) return ''
      return `${startParts.month}.${startParts.day}`
    }
    return `${startParts.year}`
  })()
  const matchReason = buildMatchReason(node, event, searchQuery)
  const duration = formatDuration(
    startParts,
    endParts,
    event.startDatePrecision,
    event.endDatePrecision,
  )
  const categoryName = getCategoryName(event.category, dbCategories)
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
      data-active={isActive ? 'true' : undefined}
    >
      {/* 단일 행 — 콘텐츠를 좌측에 밀착시키고(우측 정렬 메타 폐기) 제목 뒤에 메타가 바로
       * 따라오게 해, 짧은 제목에서 제목↔메타 사이가 텅 비던 '죽은 여백'을 제거한다. */}
      <Body>
        {hasChildren ? (
          <ExpandBtn
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
            aria-label={
              childCount > 0
                ? `하위 사건 ${childCount}개 ${isExpanded ? '접기' : '펼치기'}`
                : isExpanded
                  ? '접기'
                  : '하위 사건 펼치기'
            }
          >
            <FiChevronRight size={11} />
          </ExpandBtn>
        ) : (
          <ExpandSpacer />
        )}

        <Year data-offgroup={isOffGroupYear ? 'true' : undefined}>
          {rowDateLabel}
        </Year>
        <CategoryLabel
          $rgb={soft.rgb}
          $text={soft.text}
          $textDark={soft.textDark}
        >
          {categoryName}
        </CategoryLabel>
        <Title>{highlightMatches(node.title, searchQuery)}</Title>
        {matchReason && (
          <MatchReason title={`${matchReason.kind} 일치: ${matchReason.text}`}>
            <MatchReasonKind>{matchReason.kind}</MatchReasonKind>
            {highlightMatches(matchReason.text, searchQuery)}
          </MatchReason>
        )}
        {/* 모바일 2줄 행의 강제 개행 지점 — 데스크톱에서는 display:none이라 무영향 */}
        <RowBreak aria-hidden="true" />

        {/* 자식 수 — 접었을 때 무엇이 숨는지 알 수 있게. 어포던스가 20px 셰브론
            하나뿐이라 접고 나면 몇 개가 사라졌는지 알 방법이 없었다(검토 LD-6). */}
        {/* 좁은 폭에서는 생략 — 메타 줄을 한 줄로 고정하기 위한 폭 확보이고,
            같은 수치가 바로 앞 ExpandBtn의 aria-label에 이미 있어 정보 손실이 없다. */}
        {hasChildren && childCount > 0 && !isNarrow && (
          /* aria-hidden — 같은 수치가 바로 앞 ExpandBtn의 aria-label('하위 사건 N개 …')에
             이미 있다. 노출하면 스크린리더가 맥락 없는 숫자 '3'을 한 번 더 읽는다. */
          <ChildCountBadge aria-hidden="true" title={`하위 사건 ${childCount}개`}>
            <FiGitBranch size={9} aria-hidden="true" />
            {childCount}
          </ChildCountBadge>
        )}
        {/* 필터로 잘려나간 자식이 있으면 조용히 사라진 것처럼 보이지 않게 알린다. */}
        {hiddenChildCount > 0 && (
          <FilteredOutHint
            as="button"
            type="button"
            tabIndex={isRovingTarget ? 0 : -1}
            /* 정보만 주고 되돌릴 수단이 없던 막다른 안내를 행동 가능하게(검토 INT-10).
               title 속성은 터치·키보드에 안 뜨므로 aria-label로 설명을 옮긴다. */
            aria-label={`현재 필터 조건 밖의 하위 사건 ${hiddenChildCount}개 — 눌러서 이 사건의 계층 전체 보기`}
            title={`현재 필터 조건 밖의 하위 사건 ${hiddenChildCount}개 — 눌러서 계층 전체 보기`}
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              event.stopPropagation()
              onShowSummary(node.id)
            }}
          >
            조건 밖 {hiddenChildCount}
          </FilteredOutHint>
        )}

        {duration && <Duration>{duration}</Duration>}
        <Flags>
          <CountryFlags
            modern={event.relatedCountries}
            historical={event.relatedHistoricalCountries}
            /* 좁은 폭은 1개 + '+N'. 2개를 그리면 위 max-width 상한에 걸려 두 번째 칩이
               중간에서 잘린다(역사국가는 이모지가 없어 국가명 전체가 텍스트 칩이라 폭을 많이 먹는다). */
            max={isNarrow ? 1 : 3}
            size="sm"
          />
        </Flags>

        <RowActions>
          {hasChildren && depth === 0 && (
            <IconBtn
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onShowSummary(node.id)
              }}
              tabIndex={isRovingTarget ? 0 : -1}
              title="사건 요약 보기"
              aria-label="사건 요약 보기"
            >
              {/* ⚠️ FiGitBranch를 쓰지 말 것 — 바로 옆 ChildCountBadge가 같은 글리프로
                  '자식 수'라는 다른 뜻을 이미 쓰고 있어, 한 행에서 같은 아이콘이 정적
                  카운트와 모달 트리거 두 의미로 갈렸다. 브랜치 글리프는 계층 전용으로 예약. */}
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
  margin-left: ${({ $depth }) => `calc(var(--row-indent) * ${$depth})`};
  cursor: pointer;

  /* 문맥용 부모 행 강등 — 이 행 자체는 조건 불일치이고 '매칭된 자식이 아래에 있어서'
   * 남아 있을 뿐이다. 강등이 없으면 '조건 일치 12건'인데 18행이 똑같은 무게로 보여
   * 필터가 새는 것처럼 읽힌다. 숨기지 않는 이유는 계층 문맥이 필요하기 때문. */
  ${({ $context }) =>
    $context &&
    css`
      opacity: 0.62;
      &:hover,
      &:focus-within {
        opacity: 1;
      }
    `}
  font-variant-numeric: tabular-nums;
  transition: background 0.14s ease;

  /* 선택 행으로 스크롤(events.page의 단일 effect)할 때 sticky 세기·연도 헤더에
   * 가려지지 않도록 상단 여백을 확보한다. --century-header-h는 목록 컨테이너가 정의. */
  scroll-margin-top: calc(var(--century-header-h, 44px) + 44px);
  scroll-margin-bottom: 12px;

  /* 사건 단위 분리 — hairline bottom border. 마지막 행은 자동 제거.
   * YearDivider/CenturyDivider 직전 Stop도 border-bottom 제거(:has(+ button)):
   * divider 자신이 border-top hairline을 그어 트리플 라인 회피. */
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.05)'};

  &:last-of-type,
  &:has(+ button) {
    border-bottom: none;
  }

  /* 활성 상태 좌측 인디고 막대(굵게) + 우측 라운드 — 긴 리스트에서도 위치 즉시 인지.
   * depth>0 행은 좌측 1px vertical guide(box-shadow inset)로 부모-자식 위계 시각화.
   * 두 효과 모두 box-shadow 스택으로 한 번에 적용 — 덕분에 active 위에 guide도 같이 표시. */
  border-radius: ${({ $active }) => ($active ? '6px' : '0')};
  box-shadow: ${({ $active, $depth, theme }) => {
    const shadows: string[] = []
    if ($depth > 0) {
      const c =
        theme.mode === 'dark'
          ? 'rgba(147, 197, 253, 0.22)'
          : 'rgba(37, 99, 235, 0.18)'
      shadows.push(`inset 1px 0 0 0 ${c}`)
    }
    if ($active) {
      shadows.push('inset 4px 0 0 0 #2563eb')
    }
    return shadows.length ? shadows.join(', ') : 'none'
  }};
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
      return css`
        background: ${isDark
          ? 'rgba(37, 99, 235, 0.22)'
          : 'rgba(37, 99, 235, 0.13)'};
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
          ? 'rgba(37, 99, 235, 0.28)'
          : 'rgba(37, 99, 235, 0.18)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  }

  /* 강제 색 모드(Windows 고대비 등)에서는 box-shadow·배경 tint가 전부 제거된다 —
     활성 행과 계층 가이드가 통째로 사라지므로 시스템 색 테두리로 대체 신호를 준다. */
  @media (forced-colors: active) {
    ${({ $active }) =>
      $active &&
      css`
        outline: 2px solid Highlight;
        outline-offset: -2px;
      `}
  }

  /* 키보드 focus 시각화 — 마우스 click에선 안 뜨고 Tab 순회 시에만 ring */
  &:focus {
    outline: none;
  }
  &:focus-visible {
    /* 다크에서는 파란 활성 배경(rgba(37,99,235,0.22)) 위에 같은 파랑 아웃라인이 그려져
       링 안쪽 경계 대비가 2.93:1까지 떨어졌다. 화살표 내비게이션은 선택과 포커스를 함께
       옮기므로 '활성 행 위의 포커스'가 상시 상태라 실질 식별력이 낮았다(검토 A11Y-1). */
    outline: 2px solid
      ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
    outline-offset: -2px;
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
  }
`

/* 단일 행 컨테이너 — 모든 토큰(연도·카테고리·제목·별·기간·국기·액션)을 한 줄에 좌측 밀착.
 * max-width로 읽기 컬럼을 제한하되, flex:1 스페이서가 없으므로 콘텐츠는 좌측에 붙고 남는
 * 폭은 예측 가능한 우측 여백이 된다(제목↔메타 사이 죽은 여백 소멸). */
const Body = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 880px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--row-col-gap);

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
    flex-wrap: wrap;
    row-gap: 3px;
    align-items: center;
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
  display: inline-flex;
  align-items: center;
  gap: 2px;
  /* 액션은 읽기 컬럼(Body max-width 880px)의 **우측 고정 열**에 둔다.
   *
   * 이전엔 margin-left: 2px으로 국기 바로 뒤에 붙어, 제목 길이에 따라 버튼 x좌표가
   * 행마다 달라졌다 — 실측 233행에서 고유 x좌표 184개, 산포 641px(316~957).
   * 즐겨찾기를 연속으로 누를 때 포인터가 매 행 다른 위치를 찾아야 했고 세로 스캔선도 끊겼다.
   * auto 마진으로 밀어 한 열에 정렬하되, 메타(기간·국기)는 제목 옆에 그대로 남으므로
   * 2026-07-22 검토가 없앤 '제목↔메타 죽은 여백'은 되살아나지 않는다. */
  margin-left: auto;
  padding-left: 8px;
  flex-shrink: 0;

  @media (max-width: 640px) {
    order: 2;
  }
`

const ExpandBtn = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--row-disc-btn);
  height: var(--row-disc-btn);
  padding: 0;
  /* 시각 크기는 20px 그대로 두고 **히트 영역만** 확장한다(포인터·터치 오탭 방지).
     20×20은 권장 44px에 한참 못 미치고, 바로 옆 액션들과 gap 2px로 붙어 있었다. */
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
  transition: background 0.12s, transform 0.15s;
  transform: rotate(${({ $expanded }) => ($expanded ? 90 : 0)}deg);

  @media (prefers-reduced-motion: reduce) {
    transition: background 0.12s;
  }

  @media (max-width: 640px) {
    order: -2;
  }
  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
`

const ExpandSpacer = styled.span`
  width: var(--row-disc-btn);
  height: var(--row-disc-btn);
  flex-shrink: 0;

  @media (max-width: 640px) {
    order: -2;
  }
`

const ChildCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;

  @media (max-width: 640px) {
    order: 1;
  }

  padding: 0 5px;
  height: 15px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
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

  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  /* '조건 밖 N'은 누락 고지다 — 행에서 가장 안 보이는 토큰이면 도입 목적이 무효가 된다. */
  color: ${metaText};
  font-variant-numeric: tabular-nums;
`

const Year = styled.span`
  /* 날짜는 보조 데이텀 — 항상 제목보다 한 단계 아래. tier별 크기 증가를 없애 고정 12px로,
     굵기도 500으로 낮춰(중요도 신호는 제목·별이 담당) 제목이 확실한 주인공이 되게 한다. */
  font-size: var(--row-meta);
  font-weight: 500;
  letter-spacing: -0.01em;
  /* 보조 데이텀이지만 '언제'는 이 목록의 핵심 정보다 — tertiary(2.54:1)는 AA 미달. */
  color: ${metaText};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: var(--col-date);

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
  /* ⚠️ min-width: 0이면 제목이 **0px까지 짓눌린다**. Body의 다른 자식이 전부
   * flex-shrink: 0이라 폭이 모자랄 때 줄어드는 건 제목뿐이기 때문이다.
   * 390px 실측(수정 전): 238행 중 73행(31%)의 제목 폭이 0 — 카테고리 칩과 국가명만 남았다.
   * 최소 폭을 두어 어떤 조합에서도 제목이 사라지지 않게 한다(넘치는 국기는 Flags가 흡수). */
  min-width: 8ch;
  /* 제목이 확실한 주인공 — 연도보다 크고 굵다. 크기는 밀도 토큰이 소유. */
  font-size: var(--row-title);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
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

/* 검색어 매칭 강조 — 노란 배경 + 진한 텍스트. 다크 모드는 amber 톤. */
const Mark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251, 191, 36, 0.5)' : '#fef3c7'};
  color: inherit;
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
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: var(--row-chip);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  background: ${({ $rgb, theme }) =>
    theme.mode === 'dark' ? `rgba(${$rgb}, 0.16)` : `rgba(${$rgb}, 0.1)`};
  color: ${({ $text, $textDark, theme }) =>
    theme.mode === 'dark' ? $textDark : $text};

  @media (max-width: 640px) {
    order: 1;
  }
`

/* 검색 매칭 근거 — 제목에 검색어가 없을 때만 나타난다. 제목을 밀어내지 않게 축소·말줄임. */
const MatchReason = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 0 1 auto;
  font-size: 11px;
  font-weight: 500;
  color: ${metaText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    /* 2줄 행에서는 메타 줄이 한 줄로 고정돼야 하므로 생략 — 근거는 상세에서 확인한다. */
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

const Duration = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${metaText};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;

  /* 모바일 메타 줄은 **한 줄로 고정**해야 행 높이가 일정하다(들쭉날쭉하면 스캔이 깨진다).
     한정된 폭에서 가장 먼저 포기할 토큰이 기간이다 — 실측상 233행 중 218행(94%)이
     '1일'이라 반복 노이즈에 가깝고, 날짜·분류·국가가 훨씬 높은 식별 가치를 갖는다. */
  @media (max-width: 640px) {
    display: none;
  }
`

const Flags = styled.span`
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
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  /* 비활성 아이콘도 '무엇을 할 수 있는지' 알리는 UI 요소다 — WCAG 1.4.11은 3:1을 요구하는데
   * 이전 alpha 0.32는 실측 라이트 2.06:1 / 다크 2.89:1로 미달이었다. alpha를 올려 통과시킨다. */
  color: ${({ theme, $bookmarked }) =>
    $bookmarked
      ? '#f59e0b'
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
    color: ${({ $bookmarked }) => ($bookmarked ? '#d97706' : '#f59e0b')};
  }
`
