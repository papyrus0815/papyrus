/**
 * Inline edit primitives.
 *
 * 디자인 의도
 * - 읽기 모드는 *깨끗한 본문* — 호버 시에만 미세한 어포던스 노출.
 * - 편집 진입: 텍스트 자체 클릭 OR 호스트 hover 시 등장하는 ✎ 버튼.
 * - 편집 모드 input/textarea도 chrome 없이 *동일한 자리에서 글자만 갈아끼움* —
 *   focus 시 1px outline만으로 active 표시.
 *
 * Group hover: 편집 가능한 컨테이너에 `data-edit-host` 속성을 부여하면
 * 그 안의 `InlineEditButton`이 호스트 hover/focus-within 시에만 노출된다.
 */
import styled, { css } from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
} from '@/pages/events/ledger/styles/ledger-tokens'

/**
 * read 모드 본문 — 평소엔 거의 보이지 않는 dashed underline으로 click-to-edit
 * 어포던스를 상시 노출(hover 전부터 시각 단서). text-decoration이라 layout은
 * 흔들리지 않는다. 호스트(`[data-edit-host]`) hover/focus 시 또렷해진다.
 * placeholder 상태는 italic + tertiary 색.
 */
export const editableSurface = css`
  position: relative;
  cursor: text;
  text-decoration: underline dashed
    ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: text-decoration-color 0.16s;

  [data-edit-host]:hover &,
  [data-edit-host]:focus-within & {
    text-decoration-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &[data-empty='true'] {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-style: italic;
  }
`

/** 별도 트리거 변형 — 의미상 분리만 유지(현재 시각 차이 없음). */
export const editableTrigger = css`
  ${editableSurface}
`

/**
 * 편집 모드 input/textarea — 배경·테두리 없음.
 * 위치/크기를 read 모드와 일치시키려고 패딩/마진 0. focus 시 outline만.
 * `data-invalid="true"` 시 outline을 error 색으로 강제.
 */
const inputBase = css`
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
  border-radius: 0;
  outline: none;
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  &[data-invalid='true'],
  &[data-invalid='true']:focus {
    outline: 1px solid ${({ theme }) => theme.colors.error ?? '#dc2626'};
    outline-offset: 2px;
  }
`

export const InlineInput = styled.input`
  ${inputBase}
`

export const InlineTextArea = styled.textarea`
  ${inputBase}
  min-height: 2em;
  resize: vertical;
`

export const InlineSelectEl = styled.select`
  ${inputBase}
  cursor: pointer;
  padding-right: 18px;
`

/** 저장/취소 inline 버튼(rich text 등 명시 저장 필요한 곳용) */
export const InlineActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
`

const inlineBtnBase = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.14s, color 0.14s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const InlineSaveBtn = styled.button`
  ${inlineBtnBase}
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: #ffffff;
  border: none;

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
`

export const InlineCancelBtn = styled.button`
  ${inlineBtnBase}
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: none;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/**
 * 명시 ✎ 편집 버튼 — 본문 옆에 붙이는 작은 트리거.
 * 평소엔 *완전히 숨김*. 호스트(`[data-edit-host]`) hover/focus-within 또는
 * 자기 자신 focus-visible 시에만 노출. 본문 곳곳 펜 아이콘이 줄지어 보이는
 * 노이즈를 제거.
 */
export const InlineEditButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  margin-left: 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, color 0.14s;
  vertical-align: middle;

  [data-edit-host]:hover &,
  [data-edit-host]:focus-within & {
    opacity: 0.55;
  }

  &:hover,
  &:focus-visible {
    opacity: 1 !important;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    outline: none;
  }

  /**
   * 터치/펜 등 hover 미지원 환경 — read 텍스트엔 클릭 핸들러가 없어 편집은 ✎로만
   * 진입하는데, hover로만 드러나면 영영 안 보인다. 상시 옅게 노출해 발견성 보장.
   */
  @media (hover: none) {
    opacity: 0.5;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`
