/**
 * 좌측 목록 사이드바 공용 계약.
 *
 * 도메인(국가·인물·사건·가문·…)은 자기 데이터를 이 모양으로 **매핑만** 하고, 그룹핑·접힘·
 * 키보드 네비·선택·빈/에러 상태는 EntityListSidebar가 전부 처리한다.
 */
import type React from 'react'

/**
 * 행 둘째 줄의 조각 하나.
 *
 * 문자열이면 '줄이지 않는 조각'(연도·수치처럼 통째로 보여야 하는 값)이고,
 * `{ text, shrink: true }`는 남는 폭을 먹다가 넘치면 말줄임되는 조각이다. 둘째 줄은 flex라
 * 부모의 text-overflow가 자식에 먹지 않는다 — 긴 이름을 그냥 문자열로 넘기면 뒤따르는
 * 조각이 통째로 화면 밖으로 밀려 사라진다.
 */
export type EntitySidebarMetaPart =
  | string
  | {
      text: string
      shrink?: boolean
      tone?: string
      /**
       * 이 조각을 **꾸며서** 그릴 때의 노드 — 검색어 `<mark>` 강조 등.
       * `text`는 그대로 둬야 한다: 툴팁과 빈 조각 판정이 계속 문자열을 본다.
       */
      node?: React.ReactNode
    }

/** 메타 조각의 표시 문자열 (검색 색인·렌더가 같은 값을 보게 하는 단일 출처) */
export function metaPartText(
  part: EntitySidebarMetaPart | null | undefined | false,
): string {
  if (!part) return ''
  return typeof part === 'string' ? part : part.text
}

export interface EntitySidebarItem {
  id: string
  /** 행 첫 줄 */
  name: string
  /**
   * 행 첫 줄을 **꾸며서** 그릴 때의 노드 — 검색어 `<mark>` 강조 등.
   *
   * 지정해도 `name`은 그대로 남겨야 한다: 툴팁(title 속성)·대체 배지 첫 글자는 계속
   * 문자열을 쓰고, 그래야 노드를 넘긴 도메인만 겉모습이 바뀐다.
   * 값이 없으면 `name`을 그대로 그리므로 다른 도메인은 픽셀 무변화다.
   */
  nameNode?: React.ReactNode
  /**
   * 행 둘째 줄 조각 — 빈 값은 자동으로 걸러지고 남은 것 사이에만 점 구분자가 들어간다.
   * (호출부가 구분자를 직접 넣으면 값이 비었을 때 점이 떠버린다)
   */
  meta?: (EntitySidebarMetaPart | null | undefined | false)[]
  /** 썸네일 URL. 없으면 badgeText/badgeIcon으로 대체 배지를 그린다 */
  thumbnailUrl?: string | null
  /** 대체 배지 텍스트 — ISO 코드, 이름 첫 글자 등. 미지정 시 name 첫 글자 */
  badgeText?: string
  /** 대체 배지 아이콘 — 지정하면 badgeText 대신 */
  badgeIcon?: React.ReactNode
  /**
   * 배지 자리에 놓는 고정폭 선두 값 — 지정하면 썸네일·배지 대신 이걸 그린다.
   * 행마다 같은 자리에서 오른쪽 맞춤으로 정렬되는 값에 쓴다(사건 목록의 날짜).
   */
  lead?: React.ReactNode
  /**
   * 대체 배지 자체를 그리지 않는다(썸네일도 없을 때).
   *
   * 이름 첫 글자 배지는 '무엇인지'를 말해 주는 도메인(국가 ISO·인물 얼굴)에서만 값을 한다.
   * 사건처럼 배지가 실을 게 없는 도메인에서는 32px 색 블록이 제목 폭만 먹는다.
   */
  noBadge?: boolean
  /** 이름 옆 작은 표식 (군주 왕관 등) */
  mark?: React.ReactNode
  /** 행 우측 수치 배지. null·0·빈 문자열이면 그리지 않는다 */
  metric?: number | string | null
  /**
   * 이 행만의 accent(대체 배지 틴트) — 미지정 시 그룹 accent를 따른다.
   *
   * 그룹 축과 **다른 축**을 행에서 색으로 읽히게 할 때만 쓴다(사건: 그룹=세기, 행=카테고리).
   * 두 축이 같은 도메인에서 쓰면 같은 색이 두 번 나올 뿐이다.
   */
  accentColor?: string
  /**
   * 이 행 **위에** 그릴 구분 라벨 — 그룹 안을 다시 끊는 시간 앵커(사건 목록의 연도).
   * 같은 그룹에서 값이 바뀌는 첫 행에만 넣는다(호출부 책임).
   * 문자열이 기본이고, 라벨 안에서 조각별로 톤을 나눠야 하면 노드를 넘겨도 된다(연도+건수).
   */
  leadDivider?: React.ReactNode
  /**
   * 스크린리더가 읽을 행 전체 문구. 미지정 시 화면에 보이는 텍스트를 그대로 읽는다.
   * 화면에서 축약한 값(연도를 앵커로 빼고 '9.4'만 남긴 날짜 등)을 보완할 때 쓴다.
   */
  ariaLabel?: string
  /**
   * 이 행에는 고정(★) 버튼을 두지 않는다 — 같은 목록에 도메인이 다른 행(인물 사이드바의
   * '인물 그룹' 링크)이 섞일 때, 고정 목록에 엉뚱한 id가 들어가지 않게.
   */
  noPin?: boolean
  /** 이 항목이 속한 그룹 id — groups에 없으면 '미분류'로 흡수된다(never-drop) */
  groupId: string
  /** 검색 매칭용 소문자 텍스트. 미지정 시 name + meta로 자동 생성 */
  searchText?: string
}

export interface EntitySidebarGroup {
  id: string
  name: string
  /** 그룹 dot·행 좌측 strip·대체 배지 틴트에 쓰는 색 */
  accent: string
  /** 지정하면 dot 대신 이 아이콘 (고정·최근 등) */
  leadIcon?: React.ReactNode
  /** 빠른 접근 그룹 — 통상 그룹과 행 id가 겹치므로 앵커 id를 부여하지 않는다 */
  isQuickAccess?: boolean
  /** 접힘 기본값에서 제외 (빠른 접근은 항상 펼침) */
  alwaysExpanded?: boolean
}

/** 검색 인풋 옆 칩 셀렉트 하나 */
export interface EntitySidebarSelect {
  id: string
  /** aria-label */
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  title?: string
  /** 필터가 걸려 있는 상태로 강조할지. 미지정 시 value가 비어있지 않으면 활성 */
  active?: boolean
}

/** 검색어 매칭 — searchText가 없으면 name + meta를 합쳐 본다 */
export function matchesSidebarQuery(
  item: EntitySidebarItem,
  loweredQuery: string,
): boolean {
  if (!loweredQuery) return true
  if (item.searchText) return item.searchText.includes(loweredQuery)
  const haystack = [item.name, ...(item.meta ?? []).map(metaPartText)]
    .filter((part) => !!part)
    .join(' ')
    .toLowerCase()
  return haystack.includes(loweredQuery)
}

/** 도메인 목록을 검색어로 거르는 기본 구현 — 도메인별 특수 규칙이 없으면 이걸 쓴다 */
export function filterSidebarItems(
  items: EntitySidebarItem[],
  query: string,
): EntitySidebarItem[] {
  const lowered = query.trim().toLowerCase()
  if (!lowered) return items
  return items.filter((item) => matchesSidebarQuery(item, lowered))
}
