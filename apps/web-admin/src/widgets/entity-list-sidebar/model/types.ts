/**
 * 좌측 목록 사이드바 공용 계약.
 *
 * 도메인(국가·인물·사건·가문·…)은 자기 데이터를 이 모양으로 **매핑만** 하고, 그룹핑·접힘·
 * 키보드 네비·선택·빈/에러 상태는 EntityListSidebar가 전부 처리한다.
 */
import type React from 'react'

export interface EntitySidebarItem {
  id: string
  /** 행 첫 줄 */
  name: string
  /**
   * 행 둘째 줄 조각 — 빈 값은 자동으로 걸러지고 남은 것 사이에만 점 구분자가 들어간다.
   * (호출부가 구분자를 직접 넣으면 값이 비었을 때 점이 떠버린다)
   */
  meta?: (string | null | undefined | false)[]
  /** 썸네일 URL. 없으면 badgeText/badgeIcon으로 대체 배지를 그린다 */
  thumbnailUrl?: string | null
  /** 대체 배지 텍스트 — ISO 코드, 이름 첫 글자 등. 미지정 시 name 첫 글자 */
  badgeText?: string
  /** 대체 배지 아이콘 — 지정하면 badgeText 대신 */
  badgeIcon?: React.ReactNode
  /** 이름 옆 작은 표식 (군주 왕관 등) */
  mark?: React.ReactNode
  /** 행 우측 수치 배지. null·0·빈 문자열이면 그리지 않는다 */
  metric?: number | string | null
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
  const haystack = [item.name, ...(item.meta ?? [])]
    .filter((part): part is string => typeof part === 'string' && !!part)
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
