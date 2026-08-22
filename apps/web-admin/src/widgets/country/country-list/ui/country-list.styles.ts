/**
 * CountryList 위젯 전용 스타일
 * 좌측 사이드바: 탭, 필터, 리스트 행, 대시보드 메뉴
 * 리퀴드 글래스 디자인은 다크 모드 전용
 *
 * ⚠️ 사이드바 목록의 공용 조판(패널·검색행·그룹헤더·행·빈상태)은
 * `@/shared/ui/sidebar-list`로 승격돼 인물 목록(/persons-timeline)과 공유한다.
 * 아래 re-export 블록이 기존 이름(ContinentDot, IsoBadge 등)을 그대로 유지하므로
 * 이 파일을 `import * as S`로 쓰는 쪽은 변경 없이 동작한다.
 * 새 스타일이 국가 전용이 아니라면 공용 모듈에 추가할 것.
 */
import styled, { css } from 'styled-components'

import { UnderlineTabNav } from '@/shared/ui/underline-tabs'
import {
  darkBlur,
  // 행 hover에 반응하는 자식(자식 chevron)을 위해 값으로도 필요 — 아래 재수출과 별개다
  ListRow,
  overlayScrollbar,
  stickyBar,
} from '@/shared/ui/sidebar-list'

// ─── 공용 사이드바 조판 재수출 ────────────────────────────────────────────────
// 정의 원본은 @/shared/ui/sidebar-list — 여기서 국가 도메인 이름으로 이어 붙인다.
export {
  ListPaneWrapper,
  ListPane,
  ListContainer,
  SrLiveRegion,
  SidebarTabBody,
  FilterRow,
  FilterWrapper,
  SearchWrapper,
  SearchIcon,
  SearchInput,
  ClearButton,
  ClearAllFiltersButton,
  FilterSelect,
  VirtualList,
  ListRow,
  RowTop,
  RowLeft,
  RowRight,
  PinButton,
  CollapsedRail,
  CollapsedToggleBtn,
  CollapsedHint,
  ThumbnailAvatar,
  CodeText,
  SubMeta,
  TextStack,
  EmptyFilterState,
  EmptyFilterIcon,
  EmptyFilterTitle,
  EmptyFilterText,
  EmptyFilterActions,
  AddButton,
  AddButtonIcon,
  // 국가 도메인 이름 유지 — 공용에서는 그룹/아바타 일반명
  GroupSectionHeader as ContinentSectionHeader,
  GroupCaret as ContinentCaret,
  GroupTitle as ContinentTitle,
  GroupCount as ContinentCount,
  GroupLeadIcon as ContinentLeadIcon,
  GroupDot as ContinentDot,
  AvatarBadge as IsoBadge,
} from '@/shared/ui/sidebar-list'

/** B-4 — 자식 (역사 국가) 전용 두 번째 컬럼 */
export const ChildrenPane = styled.div`
  display: flex;
  flex-direction: column;
  width: 180px;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  animation: childrenSlideIn 0.18s ease-out;

  @keyframes childrenSlideIn {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 1280px) {
    width: 160px;
  }
`

/** 자식 컬럼 헤더 — 부모 mini 카드 (IsoBadge + 이름 + 자식 수) */
export const ChildrenHeader = styled.div`
  padding: 12px 10px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const ChildrenHeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const ChildrenHeaderName = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
`

export const ChildrenHeaderMeta = styled.div`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;

  > span.count {
    font-variant-numeric: tabular-nums;
    text-transform: none;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 700;
  }
`

export const ChildrenScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
  ${overlayScrollbar}
`

export const ChildrenEmpty = styled.div`
  padding: 24px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  line-height: 1.5;
`

export const ListCollapseButton = styled.button<{ $collapsed?: boolean }>`
  position: absolute;
  top: 50%;
  right: -16px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(33, 33, 33, 0.9);
          ${darkBlur(12)}
          color: ${theme.colors.text.secondary};
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        `
      : css`
          border: 1px solid ${theme.colors.border.light};
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          box-shadow: 0 1px 4px ${theme.colors.shadow.sm};
        `}

  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${({ $collapsed }) =>
      $collapsed ? 'rotate(180deg)' : 'rotate(0deg)'};
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.2)'
        : theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : theme.colors.activeLight};
  }

  @media (max-width: 1024px) {
    display: none;
  }
`

// ─── 레이아웃 ────────────────────────────────────────────────────────────────

export const SidebarFilterSlot = styled.div`
  min-height: 54px;
  flex-shrink: 0;
`

export const SidebarModeTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
`

/** 국가 개수 — 필터 칩 배지 대신 타이포만으로 정리 */
export const SidebarTabCount = styled.span<{ $active?: boolean }>`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  opacity: ${({ $active }) => ($active ? 0.95 : 0.8)};
`

// ─── 컨트롤 / 필터 ────────────────────────────────────────────────────────────

export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 12px 24px;
  top: 0;
  ${({ theme }) => stickyBar(theme)}
  box-shadow: 0 1px 0
    ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'};
`

export const ControlsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const ControlsRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 8px;
  }
`

export const AddIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  transition:
    background 0.15s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
  box-shadow: 0 4px 12px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};

  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: translateY(-1px);
  }

  &:active {
    opacity: 0.9;
    transform: translateY(0);
  }

  svg {
    flex-shrink: 0;
  }
`

export const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.4)'
          : 'rgba(99, 102, 241, 0.3)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.08)'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : theme.colors.primary
      : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.15)'
        : 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.4)'
        : 'rgba(99, 102, 241, 0.3)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.12)'
        : 'rgba(99, 102, 241, 0.07)'};
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 768px) {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }
`

export const FilterResultBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  ${({ theme }) => stickyBar(theme)}
  top: 113px;
  z-index: 1;
`

export const FilterResultText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;

  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

export const FilterResultCount = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

// ─── 리스트 행 ────────────────────────────────────────────────────────────────

export const RowBottom = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  padding-left: 50px;
  margin-top: 4px;

  @media (max-width: 768px) {
    padding-left: 44px;
  }

  @media (max-width: 480px) {
    padding-left: 40px;
  }
`

export const RowCheckbox = styled.span`
  width: 14px;
  height: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.12)'};
  border-radius: 3px;
`

export const ExpandButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 3px;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const StarIcon = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.border.default};
`

export const QuickAccessSection = styled.div`
  margin-bottom: 6px;
`

export const QuickAccessHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 8px 10px 4px;
`

/** 자식(역사) 있는 부모 행 우측 chevron — 클릭 시 popover 열기 (M2) */
export const HasChildrenChevron = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  margin-left: 2px;
  transition: background 0.12s ease, opacity 0.12s ease, color 0.12s ease;

  /* 평소엔 감춘다 — 자식 있는 행마다 상시로 떠 있으면 목록 우측이 화살표 열이 된다.
     핀 버튼과 같은 규약: 행 hover/포커스, 또는 펼친 상태에서만 보인다. */
  opacity: 0;
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border.light};

  ${ListRow}:hover &,
  ${ListRow}:focus-within & {
    opacity: 0.85;
  }

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border.medium};
  }

  &[aria-expanded='true'] {
    opacity: 1;
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.active};
  }

  > svg {
    width: 14px;
    height: 14px;
  }
`

/** Deprecated — IsoBadge 사용. country-mobile-ui 호환 위해 유지 */
export const FlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
`

export const HistoricalCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  font-size: 9px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 7px;
  flex-shrink: 0;
`

export const TextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`

export const NameText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.25;
`

export const SubYear = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  font-size: 11px;
  margin-left: 4px;
`

export const RadioDot = styled.span<{ $active?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
`

export const AttachmentDot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.border.default};
`

export const TimeText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  min-width: 44px;
  text-align: right;
  letter-spacing: 0.02em;
`

export const Meta = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

export const MetaInline = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export const Dot = styled.span`
  width: 3px;
  height: 3px;
  background: ${({ theme }) => theme.colors.border.medium};
  border-radius: 50%;
  display: inline-block;
`

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

export const SelectModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
`

export const SelectModal = styled.div`
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  border-radius: 20px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(33, 33, 33, 0.92);
          ${darkBlur(30)}
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        `
      : css`
          background: ${theme.colors.background.primary};
          border-radius: 16px;
          box-shadow: 0 20px 60px ${theme.colors.shadow.lg};
        `}
`

export const SelectModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(0, 0, 0, 0.06)'};
`

export const SelectModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SelectModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.1)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const SelectModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.1)'};
    border-radius: 2px;
  }
`

export const SelectOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  margin-bottom: 4px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.3)'
          : 'rgba(99, 102, 241, 0.2)'
        : 'transparent'};
  border-radius: 12px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.12)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 106, 242, 0.16)'
          : 'rgba(99, 102, 241, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(0, 0, 0, 0.03)'};
  }

  &:last-child {
    margin-bottom: 0;
  }
`

export const SelectOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ theme }) => theme.colors.primary};
`

export const SelectOptionTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const SelectOptionLabel = styled.span`
  font-weight: 600;
`

export const SelectOptionDesc = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
