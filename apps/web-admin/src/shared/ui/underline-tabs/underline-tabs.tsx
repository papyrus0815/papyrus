/**
 * 섹션용 언더라인 탭 — 사건 상세(pages/events/detail/styles.ts TabBar · Tab)와 동일한 플랫 원장 규격.
 * 그라데이션·네온 글로우·scaleX 바운스 없이 단색 2px 인디고 헤어라인과 텍스트 명암으로만 활성 상태를 표현한다.
 */
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairlineStrong,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

export const UnderlineTabNav = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 0;
  margin-bottom: 16px;
  padding: 0;
  background: transparent;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  box-shadow: none;
  border-radius: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const UnderlineTabButton = styled.button<{ $active?: boolean }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  padding: 11px 12px 10px;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.35;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.01em;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  transition: color ${MOTION.fast} ease;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active, theme }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
    transition: background ${MOTION.fast} ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: transparent;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -3px;
    border-radius: 6px;
  }

  &[data-empty]:not([aria-selected='true']) {
    color: ${metaText};
    font-weight: 400;
  }

  svg {
    flex-shrink: 0;
    opacity: ${({ $active }) => ($active ? 1 : 0.82)};
  }

  @media (max-width: 768px) {
    padding: 9px 10px 8px;
    font-size: 12.5px;

    &::after {
      left: 8px;
      right: 8px;
    }
  }
`

export const UnderlineTabBadge = styled.span<{ $active?: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : metaText};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerSubtleFill(theme.mode)};
`
