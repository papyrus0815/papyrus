/**
 * Country Page Ledger Design Primitives
 *
 * 사건 페이지(`entities/event/ui/ledger-tokens.ts` · `pages/events/styles/theme.ts` · `pages/events/detail/styles.ts`)의
 * 편집·원장(Flat Ledger) 디자인 언어를 국가 페이지 전 지면에 일관되게 적용하기 위한 공용 프리미티브.
 *
 * 핵심 규율:
 * 1. 단일 강조색(Indigo `#4f46e5` / 다크 `#a5b4fc`), 평소 컨트롤은 무채색 + 1px 헤어라인
 * 2. 평면(Flat) 표면 정책 — 휴지·호버 상태에서 `box-shadow: none`, `translateY` 들썩임 금지
 * 3. 툴바 컨트롤 단일 높이 `34px` (모바일 `<=768px` `40px`), 모서리 반경 `6px`(`RADIUS.SM`) / `8px` / `10px`(`RADIUS.MD`) 통일
 * 4. 파괴적(삭제) 동작은 평소에 중립 회색, `:hover` 시에만 `error` 붉은색 전환
 * 5. 모든 수치·연도·건수는 `tabular-nums`, 보조 메타 텍스트는 WCAG AA 대비(`metaText`) 보장
 */
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerInkLine,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { DANGER, metaText, toolbarControlHeight } from '@/pages/events/styles/theme'

export {
  DANGER,
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerInkLine,
  ledgerSubtleFill,
  metaText,
}

/** 국가 상세 모든 하위 탭 지면이 공유하는 표준 캔버스 패딩 (탭 전환 시 제목 X/Y 점프 방지) */
export const countryTabCanvasPadding = css`
  padding: 20px clamp(20px, 2.5vw, 32px) 48px;

  @media (max-width: 768px) {
    padding: 14px 16px 36px;
  }
`

/** 화면당 단 하나만 쓰는 주 등록/생성 CTA (사건 목록 CreateEventButton + 사건 상세 LedgerAccent 결합) */
export const LedgerPrimaryButton = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? ledgerBackground('dark') : '#ffffff'};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background ${MOTION.fast} ease,
    opacity ${MOTION.fast} ease;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }

  &:active:not(:disabled) {
    opacity: 0.92;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${({ theme }) => ledgerBackground(theme.mode)},
      0 0 0 4px ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
`

/** 보조 아웃라인 / 고스트 툴바 버튼 (평소 무채색, $active 시에만 인디고 틴트) */
export const LedgerToolbarButton = styled.button<{
  $active?: boolean
  $ghost?: boolean
}>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $active, $ghost }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : $ghost
          ? 'transparent'
          : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  letter-spacing: -0.01em;
  white-space: nowrap;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    border-color: ${({ theme, $active, $ghost }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : $ghost
          ? 'transparent'
          : ledgerHairlineHover(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/** 섹션 헤더·카드 우측의 조용한 소형 동작 버튼 (사건 상세 EditIconButton 규격: 28px / 6px) */
export const LedgerCompactAction = styled.button<{
  $primary?: boolean
  $danger?: boolean
}>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? 'transparent' : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $primary }) =>
    $primary ? ledgerAccent(theme.mode) : 'transparent'};
  color: ${({ theme, $primary, $danger }) =>
    $primary
      ? theme.mode === 'dark'
        ? ledgerBackground('dark')
        : '#ffffff'
      : $danger
        ? theme.colors.text.tertiary
        : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    ${({ theme, $primary, $danger }) =>
      $primary
        ? css`
            background: ${ledgerAccentHover(theme.mode)};
          `
        : $danger
          ? css`
              color: ${theme.colors.error};
              border-color: ${DANGER.borderHover};
              background: ${DANGER.soft};
            `
          : css`
              color: ${theme.colors.text.primary};
              border-color: ${ledgerHairlineHover(theme.mode)};
              background: ${ledgerHoverFill(theme.mode)};
            `}
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/** 정사각 아이콘 전용 버튼 (⋯ 메뉴, 인라인 수정/삭제 등 — 사건 상세 EventActionsMenu / ModuleRemoveAction 규격) */
export const LedgerIconButton = styled.button<{
  $outlined?: boolean
  $danger?: boolean
  $size?: 'sm' | 'md'
}>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => ($size === 'sm' ? '26px' : '30px')};
  height: ${({ $size }) => ($size === 'sm' ? '26px' : '30px')};
  padding: 0;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $outlined }) =>
      $outlined ? ledgerHairlineStrong(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.text.tertiary : theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  svg {
    width: ${({ $size }) => ($size === 'sm' ? '13px' : '15px')};
    height: ${({ $size }) => ($size === 'sm' ? '13px' : '15px')};
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    ${({ theme, $danger, $outlined }) =>
      $danger
        ? css`
            color: ${theme.colors.error};
            border-color: ${$outlined ? DANGER.borderHover : 'transparent'};
            background: ${DANGER.soft};
          `
        : css`
            color: ${theme.colors.text.primary};
            border-color: ${$outlined
              ? ledgerHairlineHover(theme.mode)
              : 'transparent'};
            background: ${ledgerSubtleFill(theme.mode)};
          `}
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 빈 상태·보조 추가 유도용 점선 트리거 (사건 상세 ModuleAdd · TabEmptyAction 동일 규격) */
export const LedgerDashedAddChip = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    border-style: solid;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 사건 조망(overview.styles.ts ViewSwitch)과 동일한 세그먼트 보기 전환기 */
export const LedgerViewSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 3px;
  gap: 2px;
  border-radius: 8px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  flex-shrink: 0;
`

export const LedgerViewSwitchItem = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
        : '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 사건 목록 검색창과 동일한 34px 검색 입력 래퍼 */
export const LedgerSearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 340px;
  ${toolbarControlHeight}
  padding: 0 8px 0 11px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    box-shadow ${MOTION.fast} ease;

  & > svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  &:focus-within {
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    border-color: transparent;
    box-shadow: 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
  }

  @media (max-width: 768px) {
    flex: 1 1 100%;
    max-width: none;
  }
`

export const LedgerSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 필터 라디오 칩 (무채색 기본 + $active 시 인디고 하이라이트, 건수 tabular-nums) */
export const LedgerFilterChip = styled.button<{
  $active?: boolean
  $pill?: boolean
}>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: ${({ $pill }) => ($pill ? RADIUS.PILL : RADIUS.SM)};
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    border-color: ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineHover(theme.mode)};
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`
