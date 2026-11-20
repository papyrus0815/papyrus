/**
 * 새 기구·협의체·조직 등록 모달 스타일 — 사건 등록 모달(`widgets/event-form`)의 문법을 따른다.
 * 군사 사령부·부대 등록 모달(`military-unit-form/styles.ts`)과 같은 값.
 *
 * - 섹션: 카드 상자 없이 점(•) 머리글 + 아래 구분선. 점·요약 배지 색은 고른 **기구 유형 색**을 따른다
 *   (사건 폼이 고른 분야 색을 따르는 것과 같은 자리)
 * - 2단 분할(≥1180px): 좌(기본 정보) / 우(회원국·소재, 소속 인물) 두 칸이 **각자 스크롤**
 * - 1단 보기: 세 섹션을 위에서 아래로 — 섹션 이동은 헤더 알약으로
 */
import styled from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import {
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

/** 분할 판정 폭 — 사건 모달과 같다(이보다 좁으면 분할을 켜도 한 줄로 쌓인다) */
export const SPLIT_MIN_WIDTH = 1180

export const OrgModalFormScroll = styled(PersonRegisterModalFormScroll)<{
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
  min-width: 132px;
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
    $done ? (theme.mode === 'dark' ? '#6ee7b7' : '#047857') : theme.colors.primary};
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
    background: var(--org-type-accent, ${({ theme }) => theme.colors.primary});
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
  color: var(--org-type-accent, ${({ theme }) => theme.colors.primary});
  background: ${({ theme }) =>
    `rgba(var(--org-type-rgb, 99, 102, 241), ${theme.mode === 'dark' ? 0.16 : 0.08})`};
  border: 1px solid rgba(var(--org-type-rgb, 99, 102, 241), 0.22);
`

/* 2단 분할 — 사건 폼 SplitColumnsGrid / SplitColumnLeft·Right와 같은 값 */
export const SplitColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
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

/** 약칭 · 현지 표기처럼 한 행에 나란히 서는 보조 칸 */
export const SubFieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SubField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

export const SubFieldLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 네이티브 select — FormInput과 같은 칸 모양(38px · 8px 모서리) */
export const FieldSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 0 10px;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff')};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

/** 유형 예시 — 칩 아래 한 줄 */
export const TypeExample = styled.p`
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  word-break: keep-all;
  color: ${({ theme }) => S.getC(theme).text.muted};
`

/* ─── 회원국 · 소속 인물 ─── */

export const CandidateQuickBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
`

export const CandidateQuickLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => S.getC(theme).text.muted};
  margin-right: 2px;
`

export const CandidateQuickChip = styled.button<{ $accent?: boolean }>`
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? 'rgba(var(--org-type-rgb, 99, 102, 241), 0.4)' : S.getC(theme).border.light};
  background: ${({ theme, $accent }) =>
    $accent
      ? `rgba(var(--org-type-rgb, 99, 102, 241), ${theme.mode === 'dark' ? 0.16 : 0.08})`
      : 'transparent'};
  color: ${({ theme, $accent }) =>
    $accent ? `var(--org-type-accent, ${theme.colors.primary})` : theme.colors.text.secondary};

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => `var(--org-type-accent, ${theme.colors.primary})`};
    color: ${({ theme }) => `var(--org-type-accent, ${theme.colors.primary})`};
    outline: none;
  }
`

/** 고른 회원국·인물 — 상자 대신 줄 구분선만(사건 폼 참여국 목록과 같은 결) */
export const PickedList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

export const PickedRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 200px) 28px;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 0;
  border-bottom: 1px solid ${({ theme }) => S.getC(theme).border.light};

  &:first-child {
    border-top: 1px solid ${({ theme }) => S.getC(theme).border.light};
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr) 28px;
    > :nth-child(2) {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
`

export const PickedName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PickedRoleInput = styled.input`
  width: 100%;
  height: 30px;
  padding: 0 9px;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 6px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const PickedRoleSelect = styled.select`
  width: 100%;
  height: 30px;
  padding: 0 8px;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 6px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const PickedRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    outline: none;
  }
`

/** '+ 검색·추가' — 사건 폼 섹션 끝 알약과 같은 점선 알약 */
export const AddPillBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => S.getC(theme).border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
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
