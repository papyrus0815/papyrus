/**
 * 좌측 목록 사이드바 공용 위젯.
 *
 * 모든 콘텐츠 지면(국가·인물·사건·가문·민족·집단·대륙·기업·조직·군부대)이 이걸 쓴다.
 * 지면마다 목록 UI를 새로 짜지 말 것 — 도메인은 EntitySidebarItem/Group 매핑만 담당한다.
 */
export { EntityListSidebar } from './ui/entity-list-sidebar'
export type { EntityListSidebarProps } from './ui/entity-list-sidebar'
export {
  filterSidebarItems,
  matchesSidebarQuery,
  type EntitySidebarGroup,
  type EntitySidebarItem,
  type EntitySidebarSelect,
} from './model/types'
export { useCollapsedGroups } from './model/use-collapsed-groups.hook'
export {
  useAnchorSelection,
  useSidebarPins,
  useSidebarRecents,
} from './model/use-sidebar-quick-access.hook'
