import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { UnderlineTabNav } from '@/shared/ui/underline-tabs'

export const StickyContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const CompactContextBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px clamp(20px, 2.5vw, 32px) 2px;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 8px 16px 2px;
  }
`

export const CompactCountryBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 8px;
  margin-left: -8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  min-width: 0;
  transition: background ${MOTION.fast} ease;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
    transition: color ${MOTION.fast} ease;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};

    svg {
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const CompactFlag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow: hidden;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const CompactName = styled.strong`
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CompactMeta = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  color: ${metaText};
  ${DIGIT_DISPLAY}
`

export const CompactActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const CompactActionBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const Row = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin: 0;
  padding: 0 clamp(20px, 2.5vw, 32px);

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`

/** 최상단 국가 상세 탭 — StickyContainer의 하단 1px 헤어라인 위에 2px 활성 밑줄이 정밀 밀착 */
export const TopUnderlineTabNav = styled(UnderlineTabNav)`
  margin-bottom: 0;
  border-bottom: none;
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-items: stretch;
`

export const Left = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

export const TabGroupDivider = styled.span`
  display: inline-block;
  align-self: center;
  width: 1px;
  height: 14px;
  margin: 0 3px;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const TabLabelWrap = styled.span<{ $empty?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

export const TabCountBadge = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  ${DIGIT_DISPLAY}
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccentSubtle(theme.mode)
      : ledgerSubtleFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`
