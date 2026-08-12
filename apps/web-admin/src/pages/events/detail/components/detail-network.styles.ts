import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'

/**
 * 연관(네트워크) 섹션 styled 레이어 — detail-network 컨테이너·블록(parent/children/
 * keywords)·링크 후보 픽커 훅이 공유한다. 스타일만 모은 파일이라 로직 import 없음.
 */

export const HierBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const TruncationNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const HierRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

export const ParentLink = styled(Link)`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

export const ExtraParentsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

export const ExtraInlineLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ExtraChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

export const ExtraChipLink = styled(Link)`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

export const HelperNote = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 연결 사유 편집 라인 — 주 상위 행/추가 상위 칩 아래. 좌측 얇은 킥커 + InlineText. */
export const ReasonLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-left: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ReasonKicker = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 하위 카드의 연결 사유 라인 — 카드 바로 아래, 카드 내용과 좌측 정렬(막대+갭 만큼 들여쓰기). */
export const ChildReasonRow = styled.div`
  display: flex;
  padding: 0 14px 0 29px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const SiblingNav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
`

export const SiblingLink = styled(Link)<{ $alignEnd?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 48%;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;
  justify-content: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  margin-left: ${({ $alignEnd }) => ($alignEnd ? 'auto' : '0')};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`

export const SiblingText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TextBtn = styled.button`
  /* 최소 24×24 터치 타깃(WCAG 2.5.8) — 12px 텍스트라도 클릭 영역은 24px 확보. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 0 4px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* 칩 '사유' 토글 버튼 — TextBtn 계열, 사유 보유 시 강조·펼침 시 primary. */
export const ReasonToggleBtn = styled(TextBtn)<{ $hasReason?: boolean }>`
  color: ${({ theme, $hasReason }) =>
    $hasReason ? theme.colors.text.primary : theme.colors.text.tertiary};

  &[aria-expanded='true'] {
    color: ${({ theme }) => theme.colors.primary};
  }
`

export const ChildCardWrap = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* 카드 호버 시 제거 버튼만 노출 — 직계 자식 button으로 한정(연결 사유 InlineText의
     편집 펜슬은 InlineText 자체 hover/focus-within 규칙을 따르도록 건드리지 않는다). */
  &:hover > button {
    opacity: 0.7;
  }
`

export const RemoveChildBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, color 0.14s;

  &:hover,
  &:focus-visible {
    opacity: 1;
    color: ${({ theme }) => theme.colors.error};
    outline: none;
  }

  @media (hover: none) {
    opacity: 0.7;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export const ChildCard = styled(Link)`
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: color 0.16s, background 0.16s, border-color 0.16s, box-shadow 0.16s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 2px 10px rgba(0,0,0,0.28)'
        : '0 2px 8px rgba(15,23,42,0.06)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  /* 터치 기기 — hover가 없으므로 탭 시 즉각 피드백. */
  @media (hover: none) {
    &:active {
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
    }
  }
`

export const ChildBar = styled.span`
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
`

export const ChildBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const ChildTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`

export const ChildMeta = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

export const ChildDesc = styled.span`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export const KeywordsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const KeywordsLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const KeywordsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

export const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border: none;

  &::before {
    content: '#';
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-right: 1px;
  }
`

export const ChipX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

export const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;

    &:hover {
      border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
      color: ${({ theme }) => theme.colors.text.secondary};
    }
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export const KeywordInput = styled.input`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  min-width: 140px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
