/**
 * 군사 사령부·부대 등록 모달 스타일 — 사건 등록 모달(`widgets/event-form`)의 문법을 그대로 따른다.
 *
 * - 섹션: 카드 상자 없이 점(•) 머리글 + 아래 구분선(사건 폼 `FormGroup`/`FormGroupTitle`과 같은 값)
 * - 2단 분할(≥1180px): 좌(기본·시기) / 우(소속·지휘) 두 칸이 **각자 스크롤**, 라벨 열 104px로 좁힘
 * - 1단 보기: 세 섹션을 위에서 아래로 한 번에 — 섹션 이동은 헤더 알약으로
 */
import styled from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import {
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

/** 분할 판정 폭 — 사건 모달과 같다(이보다 좁으면 분할을 켜도 한 줄로 쌓인다) */
export const SPLIT_MIN_WIDTH = 1180

export const MilitaryModalFormScroll = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: 'split' | 'single'
}>`
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: ${SPLIT_MIN_WIDTH}px) {
      overflow-y: hidden;
      padding: 22px 28px;
    }
  `
      : ''}
`

export const ModalPrimarySubmitBtn = styled(PersonRegisterModalPrimaryBtn)`
  min-width: 112px;
`

/* ─── 헤더 ─── */

export const SectionJumpBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.colors.primary};
`

export const LayoutModeToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.35)'
          : 'rgba(99, 102, 241, 0.28)'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;

  @media (max-width: ${SPLIT_MIN_WIDTH - 1}px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

/* ─── 본문 ─── */

export const BusyBar = styled.div`
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

/** 로딩이 걷히고 폼이 들어설 때 짧게 페이드인 */
export const FormReveal = styled.div`
  @media (prefers-reduced-motion: no-preference) {
    animation: militaryFormReveal 0.2s ease;
  }
  @keyframes militaryFormReveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

/* 섹션 묶음 — 사건 폼 FormGroup과 같은 값 */
export const FormGroupSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 8px;
  scroll-margin-top: 12px;

  & + & {
    margin-top: 20px;
    padding-top: 4px;
  }

  > ${S.FormRow} {
    padding: 10px 0;
    border-bottom: none;
  }
`

export const FormGroupTitle = styled.h3`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin: 0 0 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => S.getC(theme).border.light};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--unit-branch-accent, ${({ theme }) => theme.colors.primary});
    transition: background-color 0.2s ease;
  }
`

export const FormGroupSummaryBadge = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  max-width: 60%;
  padding: 2px 9px;
  border-radius: 999px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => `var(--unit-branch-text, ${theme.colors.primary})`};
  background: ${({ theme }) =>
    `rgba(var(--unit-branch-rgb, 99, 102, 241), ${theme.mode === 'dark' ? 0.16 : 0.08})`};
  border: 1px solid rgba(var(--unit-branch-rgb, 99, 102, 241), 0.22);
`

/* 2단 분할 — 사건 폼 SplitColumnsGrid / SplitColumnLeft·Right와 같은 값 */
export const SplitColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 0;
  align-items: start;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: ${SPLIT_MIN_WIDTH}px) {
    ${S.FormRow} {
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 16px;
    }
  }

  @media (max-width: ${SPLIT_MIN_WIDTH - 1}px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const splitPaneScrollCss = `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: ${SPLIT_MIN_WIDTH}px) {
    max-height: calc(90vh - 172px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 56px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }
`

export const SplitColumnLeft = styled.div`
  ${splitPaneScrollCss}

  @media (min-width: ${SPLIT_MIN_WIDTH}px) {
    padding-left: 3px;
    padding-right: 26px;

    &::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.colors.border.default};
      border-radius: 2px;
    }
  }
`

export const SplitColumnRight = styled.div`
  ${splitPaneScrollCss}

  @media (min-width: ${SPLIT_MIN_WIDTH}px) {
    padding-left: 26px;
    padding-right: 3px;
    border-left: 1px solid ${({ theme }) => S.getC(theme).border.light};

    &::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.colors.border.default};
      border-radius: 2px;
    }
  }
`

export const OptionalTag = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

/** 선택 입력 묶음을 펼치는 줄 — 헤더 ⋯ 메뉴 대신 그 자리에서 연다 */
export const OptionalRevealRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0 2px;
`

export const OptionalRevealBtn = styled.button<{ $open?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px dashed
    ${({ $open, theme }) =>
      $open ? theme.colors.primary : S.getC(theme).border.default};
  background: transparent;
  color: ${({ $open, theme }) =>
    $open ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

export const InsigniaImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

export const NameAbbrGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 156px;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

export const TitleInput = styled(S.Input)`
  font-size: 14px;
  font-weight: 600;
`

export const AbbrInput = styled(S.Input)`
  font-size: 13px;
`

export const SubTitleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

export const SubTitleField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const SubTitleLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const TitleSuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(59, 130, 246, 0.12)'
      : 'rgba(37, 99, 235, 0.07)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(96, 165, 250, 0.28)'
        : 'rgba(37, 99, 235, 0.2)'};
`

export const TitleSuggestionLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const TitleSuggestionButton = styled.button`
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(96, 165, 250, 0.35)'
        : 'rgba(37, 99, 235, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 58, 138, 0.35)' : '#ffffff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8')};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`

export const SimilarUnitsBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 11px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(245, 158, 11, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.28)'
        : 'rgba(217, 119, 6, 0.24)'};
`

export const SimilarUnitsLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

export const SimilarUnitsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const SimilarUnitChip = styled.span`
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11.5px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ContextCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 13px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.025)'
      : 'rgba(15, 23, 42, 0.02)'};
`

export const ContextCardRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const ContextCardTitle = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ContextCardMeta = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const QuickSearchBox = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const QuickSuggestionList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 210px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.12)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#141925' : '#ffffff'};
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
`

export const QuickSuggestionItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 11px;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.06)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.04)'};
  }
`

export const DateRangeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const DateColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const DateHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const InlineLinkBtn = styled.button`
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const DelegationHintBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.14)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(15, 23, 42, 0.018)'};
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PresetChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const PresetChipBtn = styled.button`
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(96, 165, 250, 0.4)'
        : 'rgba(37, 99, 235, 0.35)'};
  }
`
