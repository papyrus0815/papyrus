/**
 * 행정부(cabinets-section) 전용 styled-components
 */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { glassCardMixin } from '@/shared/styles/mixins'
import { proseHrSmallStyles, proseHrStyles } from '@/shared/styles/prose-hr'
import { richTextReadonlyMediaAndTablesCss } from '@/shared/styles/rich-text-readonly-content'
import { Z_INDEX } from '@/shared/styles/z-index'
import {
  ModalBody,
  ModalBox,
  ModalHeader,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { FieldControl } from '@/shared/ui/register-form-layout'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

import {
  CABINET_SECTION_MAIN as MAIN,
  CABINET_SECTION_MAIN_HOVER as MAIN_HOVER,
  TL_COL_PAD_X,
  TL_LIST_PAD_LEFT,
  TL_MONARCH_BADGE_VISUAL,
  TL_MONARCH_HIT_MIN,
  TL_ROW_GAP,
  TL_THUMB,
} from './cabinets-section.constants'

/* 행정부 등록 모달 */
export const CabinetModalBox = styled(ModalBox)`
  max-width: 920px;
  min-height: 520px;
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cabinetModalUp 0.2s ease;
  @keyframes cabinetModalUp {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`
export const CabinetModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 28px 28px;
`
export const CabinetFormDesc = styled.div`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#666')};
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#888')};
    margin-top: 2px;
  }
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  }
`
/** 탭: register-form-layout과 동일 (pill 20px, 배경 #f1f5f9, 활성 흰색+인디고) */
export const CabinetTabWrap = styled.div`
  margin-bottom: 24px;
  & > div {
    width: fit-content;
  }
`
/** 기존 수반 선택: 카드형 섹션 */
export const CabinetSelectSection = styled.div`
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border-radius: 16px;
  padding: 20px 24px 0;
  margin-bottom: 4px;
`
export const CabinetSelectSectionTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  letter-spacing: -0.01em;
`
export const CabinetSearchWrap = styled.div`
  position: relative;
  margin-bottom: 16px;
  flex-shrink: 0;
`
export const CabinetSearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  pointer-events: none;
`
export const CabinetList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 10px 0 0;
  flex: 1;
  min-height: 200px;
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};
    border-radius: 3px;
  }
`
export const CabinetHeadTenureCard = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0;
  align-items: center;
  min-height: 76px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 2px 10px rgba(0,0,0,0.3)'
        : '0 2px 6px rgba(15,23,42,0.06)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#fafafa'};
  }
  &:focus-visible {
    outline: none;
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.15);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
export const CabinetHeadTenureCardMain = styled.div`
  grid-column: 1;
  grid-row: 1 / -1;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
`
export const CabinetHeadTenureCardBadge = styled.span`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.01em;
`
export const CabinetHeadTenureCardName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  line-height: 1.35;
`
export const CabinetHeadTenureCardMeta = styled.span`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  line-height: 1.4;
`
export const CabinetHeadTenureCardAction = styled.span`
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 18px 20px 18px 16px;
  display: flex;
  align-items: center;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  svg {
    margin-left: 4px;
    flex-shrink: 0;
  }
`
export const CabinetActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
  flex-wrap: wrap;
`
export const CabinetEmptyHint = styled.div`
  margin: 0;
  padding: 40px 28px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#cbd5e1'};
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
  }
  svg {
    color: #94a3b8;
    flex-shrink: 0;
    opacity: 0.9;
  }
`
/** 인물 등록 폼과 동일: 선택 트리거 버튼 (DateFieldBtn 스타일) */
export const CabinetSelectTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111827'
      : p.theme.mode === 'dark'
        ? '#475569'
        : '#9ca3af'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#64748b'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#faf5ff'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  }
  &:focus-visible {
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  span {
    flex: 1;
  }
  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

/** register-form-layout Input과 동일 스타일의 select */
export const CabinetSelectNative = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #64748b;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  option {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#fff')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#111827')};
  }
`

/** 인물 등록 모달과 동일: 날짜 선택 버튼 (SelectBtn 스타일 — 8px radius, 12px 14px, 15px) */
export const CabinetDateTrigger = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111'
      : p.theme.mode === 'dark'
        ? '#475569'
        : '#888'};
  cursor: pointer;
  text-align: left;
  outline: none;
  &:focus {
    outline: none;
    border-color: #64748b;
  }
  span {
    flex: 1;
  }
  svg {
    flex-shrink: 0;
    color: #64748b;
  }
`

/** 대수 입력용 작은 너비 */
export const CabinetTermNumberWrap = styled.div`
  max-width: 120px;
  width: 100%;
`

/** 인물 선택·날짜 선택 모달이 행정부 모달 앞에 뜨도록 */
export const CabinetSubModalLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_CONTENT + 2};
  pointer-events: none;
  & > * {
    pointer-events: auto;
  }
`

export const EditingTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  }
  &:focus {
    border-color: #64748b;
  }
`

export const CabinetCancelBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f9fafb'};
  }
`
/** 각료로 등록할 인물 선택 모달 — 검색·리스트 UX */
/* 각료 선택 모달 */
export const MinisterSelectModalBox = styled(ModalBox)`
  max-width: 920px;
  max-height: 88vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
export const MinisterSelectModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px 24px;
`
/** 인물 등록 모달 썸네일과 동일: 88px 원형, 점선 테두리, 배경·호버 색 */
export const MinisterPersonTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 14px 0;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f3f4f6'};
  border-radius: 0;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.35);
  }
`
export const MinisterPersonThumb = styled.div<{ $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${(p) =>
    p.$hasImage
      ? 'transparent'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(226, 232, 240, 0.6)'};
  border: 2px dashed
    ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.35)')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.2s,
    background 0.2s;

  ${MinisterPersonTrigger}:hover & {
    border-color: ${(p) =>
      p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.6)'};
    background: ${(p) =>
      p.$hasImage
        ? 'transparent'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(226, 232, 240, 0.9)'};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #94a3b8;
    width: 32px;
    height: 32px;
  }
`
export const MinisterPersonLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  &.placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#64748b')};
  }
`
export const MinisterSelectActions = styled.div`
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
  display: flex;
  justify-content: flex-end;
`

/** 행정부 리스트 카드 — 호버·선택 시 시각적 피드백, 가독성 개선 */

/* ── 레이아웃 ── */
export const CabinetsSectionRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0;
`

/** 리스트 뷰 루트 — 필터·본문을 한 흐름으로 (이중 카드 박스 없음) */
export const CabListPanel = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  gap: 20px;
  @media (max-width: 640px) {
    gap: 16px;
  }
`

/** 필터·검색·등록 — 플랫 스트립 */
export const CabListToolbarShell = styled.div.attrs({
  role: 'region',
  'aria-label': '행정부 검색 및 필터',
})`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  background: transparent;
  border: none;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
`

/** `CabListToolbarShell` 내부 툴바 */
export const CabListToolbar = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  box-sizing: border-box;
  @media (max-width: 640px) {
    gap: 16px;
  }
`

/** 타임라인·빈 상태 — 별도 카드 테두리 없음 */
export const CabListBody = styled.div.attrs({
  role: 'region',
  'aria-label': '행정부 목록',
})`
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  background: transparent;
  border: none;
  box-sizing: border-box;
  padding: 0;
  @media (max-width: 640px) {
    padding: 0;
  }
`

/** 타임라인 요약(개수·연도·범례) 래퍼 */
export const CabTimelineSummaryOuter = styled.div`
  width: 100%;
  padding: 0 0 28px;
  box-sizing: border-box;
  @media (max-width: 640px) {
    padding: 0 0 20px;
  }
`

export const CabTimelineSummaryHeader = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) => getCabinetsSectionPalette(theme.mode === 'dark').divider};
`

/** 개수·연도·소속 범례 — 한 줄(좁으면 범례만 가로 스크롤) */
export const CabTimelineSummaryTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  flex-wrap: nowrap;
  min-width: 0;
  width: 100%;
`

export const CabTimelineLegendRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px 12px;
  padding: 0 4px 0 0;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'}
    transparent;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : '#cbd5e1'};
    border-radius: 4px;
  }
`

/** 타임라인 그리드 (행정부 카드 열만) — 첫 행 위 여백 */
export const CabTimelineGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  padding-top: 44px;
  @media (max-width: 640px) {
    padding-top: 32px;
  }
`

export const CabTimelineColRight = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: ${TL_ROW_GAP}px;
  @media (max-width: 640px) {
    gap: 72px;
  }
`

export const CabTimelineSepRule = styled.div`
  width: 1px;
  height: 12px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').borderMid};
`

/** 필터 라벨 + 칩 (박스 없음) */
export const CabListFilterSegment = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  @media (min-width: 720px) {
    flex-direction: row;
    align-items: center;
    gap: 12px 16px;
  }
`

export const CabListFilterLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  user-select: none;
  svg {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#6366f1')};
    opacity: 0.9;
  }
`

export const CabListFilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  @media (max-width: 640px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;
    margin: 0 -2px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`
/** 미니멀 칩 — 비활성은 플랫, 활성만 틴트·테두리 */
export const CabListFilterPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? '#e0e7ff'
        : '#4338ca'
      : p.theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
  background: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : '#eef2ff'
      : 'transparent'};
  border: 1px solid
    ${(p) =>
      p.$active
        ? p.theme.mode === 'dark'
          ? 'rgba(129, 140, 248, 0.35)'
          : '#ddd6fe'
        : 'transparent'};
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.14s ease,
    color 0.14s ease,
    border-color 0.14s ease;
  &:hover {
    color: ${(p) =>
      p.$active
        ? p.theme.mode === 'dark'
          ? '#f1f5ff'
          : '#3730a3'
        : p.theme.mode === 'dark'
          ? '#e2e8f0'
          : '#334155'};
    background: ${(p) =>
      p.$active
        ? p.theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.2)'
          : '#e0e7ff'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : '#f1f5f9'};
    border-color: ${(p) =>
      p.$active
        ? p.theme.mode === 'dark'
          ? 'rgba(165, 180, 252, 0.45)'
          : '#c4b5fd'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(129, 140, 248, 0.45)'
          : 'rgba(99, 102, 241, 0.35)'};
  }
`
export const CabListControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
`
export const CabListSearchBox = styled.div`
  position: relative;
  flex: 1;
  min-width: min(100%, 220px);
`
export const CabListSearchIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  align-items: center;
  pointer-events: none;
`
export const CabListSearchInput = styled.input<{ $hasTrailing: boolean }>`
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#e2e8f0'};
  border-radius: 999px;
  padding: 0 ${(p) => (p.$hasTrailing ? '52px' : '14px')} 0 44px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
    font-weight: 400;
  }
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#d1d5db'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
  &:focus {
    outline: none;
    border-color: #818cf8;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.28)'
          : 'rgba(99, 102, 241, 0.18)'};
  }
`
export const CabListSearchClearBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: #94a3b8;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#475569')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45);
  }
`
export const CabListSearchCount = styled.span`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  pointer-events: none;
  letter-spacing: -0.02em;
`
export const CabListSortBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 14px;
  height: 40px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  flex-shrink: 0;
`
export const CabListRegisterBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 18px;
  height: 40px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.28);
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease;
  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.38);
  }
  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.45),
      0 2px 10px rgba(99, 102, 241, 0.28);
  }
`

/* ── 툴바 ── */
export const CabSearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 160px;
`
export const CabSearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #b0bac9;
  pointer-events: none;
  display: flex;
  align-items: center;
`
export const CabSearchInput = styled.input`
  width: 100%;
  height: 36px;
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 10px;
  padding: 0 10px 0 36px;
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  outline: none;
  transition: border-color 0.14s;
  &::placeholder {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  }
  &:focus {
    border-color: #94a3b8;
  }
`
export const CabSearchClear = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #b0bac9;
  border-radius: 5px;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  }
`
export const CabResultCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  white-space: nowrap;
`

/* ── 2열 레이아웃 ── */
/* ══════════════════════════════════════════════
   인물 리스트 동일 패턴 레이아웃
   ══════════════════════════════════════════════ */

/* ListRow: flex row, 상세+카드그리드 나란히 */
/* 좌: 상세 패널 — 인물의 DetailPanel */

/* 닫기 버튼 — 상단 bar에 인라인 배치 */

/** 행정부 상세 상단 — 얇은 헤어라인만 (무거운 테두리 대비) */
export const CabDetailTopBar = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px 16px;
  flex-wrap: wrap;
  padding: 2px 0 14px;
  margin-bottom: 14px;
  flex-shrink: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 1px 0 rgba(255, 255, 255, 0.06)'
      : '0 1px 0 rgba(15, 23, 42, 0.06)'};
`

/** 상단 바 좌측: 브레드크럼 + (선택) 행정부 명칭 */
export const CabDetailTopBarMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 6px;
  gap: 2px;
`

export const CabDetailTopBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
`

/** 등록한 행정부 이름(예: 루즈벨트 제1기) — 수반 브레드크럼 아래 보조 제목 */
export const CabDetailTopBarSubtitle = styled.p`
  margin: 6px 0 0;
  padding-left: 2px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').sectionHeading};
  opacity: ${({ theme }) => (theme.mode === 'dark' ? 0.92 : 0.88)};
`

/* 우: 카드 열 — 상세 열리면 고정 너비 2열 그리드, 닫히면 자동채움 */

/* 행정부 등록 버튼 — 우측 고정, accent 스타일 */
export const CabRegisterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.32);
  }
`

/* 카드 그리드 — 상세 열리면 2열 고정, 닫히면 auto-fill */
export const CabCardGrid = styled.div<{ $hasDetail?: boolean }>`
  display: grid;
  gap: 16px;
  ${(p) =>
    p.$hasDetail
      ? `
    grid-template-columns: repeat(2, 220px);
    width: max-content;
    padding-right: 4px;
    @media (min-width: 1000px) { grid-template-columns: repeat(2, 240px); }
    @media (max-width: 640px) { grid-template-columns: repeat(2, 140px); gap: 10px; }
  `
      : `
    width: 100%;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    @media (min-width: 900px) { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  `}
`

/* ── 행정부 카드 — 인물 Card 패턴 ── */
export const CabCard = styled.div<{ $selected?: boolean; $deleting?: boolean }>`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border-radius: 14px;
  padding: 0;
  border: 1px solid
    ${(p) =>
      p.$selected
        ? p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.25)'
          : '#94a3b8'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e8ecf0'};
  box-shadow: ${(p) =>
    p.$selected
      ? '0 0 0 2px rgba(148,163,184,0.2), 0 4px 16px rgba(15,23,42,0.08)'
      : '0 1px 4px rgba(15,23,42,0.04)'};
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  position: relative;
  cursor: ${(p) => (p.$deleting ? 'wait' : 'pointer')};
  overflow: hidden;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  }
`

/* ── 상세 패널 내 각료·조약 (박스 없음, 위쪽은 재임 블록 border-bottom과 맞닿음) ── */
export const CabDetailMinistersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 52px 0 56px;
  scroll-margin-top: 12px;
`
/** 조약 — 각료와 동일 리듬 (위·아래 패딩으로 블록 간격 확보) */
export const CabDetailSubSection = styled(CabDetailMinistersSection)`
  scroll-margin-top: 12px;
`
export const CabDetailMinistersSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
`
export const CabDetailMinistersSectionTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').sectionHeading};
  letter-spacing: -0.02em;
`

/* ── 각료 테이블 ── */

/* ── 행정부 상세 헤더: 수반 요약 카드 ── */

/* ── 각료 목록 + 각료 상세 영역 ── */

/* ── 각료 상세: 뒤로가기 버튼 ── */
export const CabDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  margin: 0 -4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease;
  &:hover {
    color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').sectionLabelTint};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
    color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').sectionLabelTint};
  }
`
export const CabBreadcrumbSep = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  padding: 0 2px;
  user-select: none;
  opacity: 0.9;
`

/** 상세 브레드크럼 현재 항목 — 다크 모드 대비 */
export const CabDetailCrumbText = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 6px 4px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  max-width: min(260px, 42vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 행정부 타임라인 칸 — 키보드·포커스 지원 */
export const CabinetTimelineCellBtn = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  margin: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: inherit;
  width: 100%;
  padding: 0 ${TL_COL_PAD_X}px;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.45);
  }
  &:disabled {
    cursor: wait;
    opacity: 0.85;
  }
`

export const CabinetListSkeletonRoot = styled.div`
  padding: 24px 0 40px ${TL_LIST_PAD_LEFT}px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
`

export const CabinetListSkeletonBar = styled.div<{ $w?: string; $h?: string }>`
  height: ${(p) => p.$h ?? '14px'};
  width: ${(p) => p.$w ?? '100%'};
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
  animation: cabSkPulse 1.1s ease-in-out infinite;
  @keyframes cabSkPulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
`

/** 취임·퇴임 등 앵커 구역 공통 래퍼 */
export const CabDetailScrollSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 44px;
  padding: 48px 0 56px;
  scroll-margin-top: 12px;
`

/* ── 각료 상세 패널 (뷰 전환 방식) ── */

/* ── 각료 카드 그리드 ── */
export const MinisterCardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f2f7'};
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
`
export const MinisterCard = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: ${(p) =>
    p.$selected
      ? p.theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : '#eef2ff'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  cursor: pointer;
  transition: background 0.12s;
  border-left: ${(p) =>
    p.$selected ? '3px solid #6366f1' : '3px solid transparent'};
  &:first-child {
    border-radius: 12px 12px 0 0;
  }
  &:last-child {
    border-radius: 0 0 12px 12px;
  }
  &:only-child {
    border-radius: 12px;
  }
  &:hover {
    background: ${(p) =>
      p.$selected
        ? p.theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : '#e0e7ff'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f8fafc'};
  }
`
export const MinisterCardThumb = styled.div`
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
`
export const MinisterCardThumbImg = styled.img`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  object-position: top center;
  display: block;
`
export const MinisterCardThumbPlaceholder = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9edf5'};
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').iconColor};
`
export const MinisterCardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`
export const MinisterCardName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').text};
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
export const MinisterCardPos = styled.span`
  font-size: 11px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
/** 각료 카드 내 재임 기간 괄호 보조 텍스트 */
export const CabMinisterCardDurationHint = styled.span`
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').placeholderText};
  font-size: 10.5px;
`

export const MinisterCardRange = styled.div`
  font-size: 11px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
`
export const MinisterCardAge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').accent};
  border-radius: 4px;
  padding: 1px 5px;
`
export const MinisterCardLifespan = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').placeholderText};
`
export const MinisterCardBadge = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #334155;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#1e293b' : '#fff')};
  line-height: 1;
`
export const MinisterCardChevron = styled.span`
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  flex-shrink: 0;
`

/* 프로필 원 지름 — 상단 걸침(반원 노출) 계산에 사용 */
const HEAD_PROFILE_AVATAR_PX = 220
const HEAD_PROFILE_AVATAR_RADIUS = HEAD_PROFILE_AVATAR_PX / 2

/* ── 수반 상세 프로필 블록 (썸네일 중앙, 상단 테두리에 반쯤 걸침) ── */
export const HeadProfileBlock = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  /* 위로 반원이 나가므로 바깥 여백 + 테두리선에 원 중심이 오도록 패딩 */
  margin-top: 25px;
  margin-bottom: 48px;
  padding: ${HEAD_PROFILE_AVATAR_RADIUS + 24}px 24px 32px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0'};
  border-radius: 16px;
  overflow: visible;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 4px rgba(15, 23, 42, 0.04)'};
`
export const HeadProfileAvatar = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  z-index: 2;
  flex-shrink: 0;
  width: ${HEAD_PROFILE_AVATAR_PX}px;
  height: ${HEAD_PROFILE_AVATAR_PX}px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 12px 40px rgba(0,0,0,0.35)'
      : '0 10px 32px rgba(15, 23, 42, 0.08)'};
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.28)' : '#94a3b8'};
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 14px 44px rgba(0,0,0,0.4)'
        : '0 12px 36px rgba(15, 23, 42, 0.1)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.5),
      ${({ theme }) =>
        theme.mode === 'dark'
          ? '0 14px 44px rgba(0,0,0,0.45)'
          : '0 12px 36px rgba(15, 23, 42, 0.12)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(129,140,248,0.85)' : '#6366f1'};
  }
`
export const HeadProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 520px;
  width: 100%;
  min-width: 0;
`
export const HeadProfileBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 100%;
`
export const HeadProfileDetailChipTerm = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: -0.01em;
  max-width: 100%;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c4b5fd' : '#5b21b6')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(167, 139, 250, 0.35)' : '#ddd6fe'};
`
export const HeadProfileDetailChipPosition = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: -0.01em;
  max-width: 100%;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'};
`
export const HeadProfileHeadline = styled.h3`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f8fafc' : '#0f172a')};
  letter-spacing: -0.035em;
  line-height: 1.35;
  word-break: keep-all;
  text-align: center;
`
export const HeadProfileDivider = styled.div`
  width: min(360px, 100%);
  height: 1px;
  margin: 0;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 35%, rgba(255,255,255,0.14) 65%, transparent)'
      : 'linear-gradient(90deg, transparent, #e2e8f0 35%, #e2e8f0 65%, transparent)'};
`
export const HeadTenureRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
`
export const HeadTenureDates = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  font-weight: 500;
`
export const HeadTenureDuration = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 1px 7px;
`
export const HeadTenureAge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 1px 7px;
`
export const HeadLifespan = styled.div`
  font-size: 11px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').placeholderText};
  margin: 0;
  line-height: 1.55;
  text-align: center;
`

/** 수반 프로필 — 생몰·출신 등 소제목 라벨 */
export const HeadMetaKicker = styled.span`
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  margin-right: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`
export const HeadProfileActions = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  z-index: 2;
`

/* ── 구 배너 스타일 (미사용, 참조용) ── */
export const ProfileSection = styled.div`
  padding: 20px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`
export const ProfileSectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 7px;
`
export const ProfileSectionCount = styled.span`
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').badge};
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 7px;
`
export const ProfileEmptyNote = styled.div`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#c0cad8')};
  padding: 20px 0;
  text-align: center;
  line-height: 1.7;
`

export const MinisterEmptyText = styled.span`
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
`
export const EmptyStateBox = styled.div`
  padding: 40px 24px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  border-radius: 14px;
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  font-size: 13px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  line-height: 1.6;
  text-align: center;
`

export const CabDetailEmptyStack = styled.div<{ $padding?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 160px;
  box-sizing: border-box;
  padding: ${(p) => p.$padding ?? '32px 0 36px'};
`

export const CabDetailEmptyText = styled.p<{
  $fontSize?: string
  $muted?: boolean
}>`
  margin: 0;
  font-size: ${(p) => p.$fontSize ?? '13px'};
  font-style: italic;
  color: ${({ theme, $muted }) =>
    $muted
      ? getCabinetsSectionPalette(theme.mode === 'dark').textMuted
      : getCabinetsSectionPalette(theme.mode === 'dark').placeholderText};
`

export const CabMinistersLoadingBox = styled.div`
  padding: 24px 20px;
  border-radius: 14px;
  border: 1px dashed
    ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').borderHairline};
  font-size: 13px;
  text-align: center;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').bgSubtle};
`

/* ── 행정부 상세: 집권·연정 정당 ── */
export const CabDetailPartySubSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 36px 0 52px;
  margin-top: 0;
  scroll-margin-top: 12px;
`

export const CabDetailPartySectionTitle = styled.h4`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').sectionHeading};
  letter-spacing: -0.01em;
`

export const CabDetailPartyCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  margin-left: 4px;
  white-space: nowrap;
`

export const CabDetailPartyLoading = styled.div`
  font-size: 11px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  padding: 8px 0 4px;
`

export const CabDetailPartyEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 0 8px;
  text-align: center;
`

export const CabDetailPartyEmptyHint = styled.span`
  font-size: 11px;
  line-height: 1.4;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  max-width: 260px;
`

export const CabDetailPartyEmptyIconWrap = styled.span`
  display: inline-flex;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').placeholderText};
  opacity: 0.9;
`

export const CabDetailPartyList = styled.ul`
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const CabDetailPartyRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').borderHairline};
  &:last-child {
    border-bottom: none;
    padding-bottom: 1px;
  }
`

export const CabDetailPartyRowMain = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const CabDetailPartyName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CabDetailPartyRoleChip = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  white-space: nowrap;
  color: ${MAIN};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.2)'
      : 'rgba(99, 102, 241, 0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.32)'
        : 'rgba(99, 102, 241, 0.22)'};
`

export const CabDetailPartyNotes = styled.span`
  font-size: 10.5px;
  line-height: 1.35;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  word-break: break-word;
`

export const CabDetailPartyRemoveBtn = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.12s,
    color 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.12)'
        : 'rgba(239, 68, 68, 0.08)'};
    color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').danger};
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* ── 행정부 상세: 체결 조약 목록 ── */
export const CabDetailTreatyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
`

export const CabDetailTreatyCard = styled.div<{
  $expanded: boolean
  $accent: string
  $borderIdle: string
}>`
  border: 1.5px solid ${(p) => (p.$expanded ? p.$accent : p.$borderIdle)};
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyRowBg};
  transition: border-color 0.15s;
`

export const CabDetailTreatyCardBtn = styled.button.attrs({ type: 'button' })`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
`

export const CabDetailTreatyTypeChip = styled.span<{ $accent: string }>`
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: ${(p) => p.$accent};
  border-radius: 4px;
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
`

export const CabDetailTreatyTitleCell = styled.span`
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
`

export const CabDetailTreatyAlias = styled.span`
  font-size: 11.5px;
  font-weight: 400;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').slate400};
  margin-left: 6px;
`

export const CabDetailTreatyYearCell = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').slate400};
  white-space: nowrap;
`

export const CabDetailTreatyChevronWrap = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').slate400};
  transform: ${(p) => (p.$expanded ? 'rotate(180deg)' : 'none')};
  transition: transform 0.2s;
`

export const CabDetailTreatyExpandedPanel = styled.div`
  padding: 12px 14px 14px;
  margin: 0;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.12)' : 'rgba(248, 250, 252, 0.95)'};
`

export const CabDetailTreatySectionTitle = styled.div<{ $spaced?: boolean }>`
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').sectionLabelTint};
  margin: ${(p) => (p.$spaced ? '4px 0 0' : '0')};
`

export const CabDetailTreatyInfoRows = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
  gap: 6px 12px;
  font-size: 12px;
  align-items: start;
`

export const CabDetailTreatyInfoDt = styled.dt`
  margin: 0;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  font-weight: 600;
`

export const CabDetailTreatyInfoDd = styled.dd`
  margin: 0;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  line-height: 1.45;
  word-break: break-word;
`

export const CabDetailTreatyBodyPara = styled.div`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  white-space: pre-wrap;
  word-break: break-word;
`

export const CabDetailTreatyTermList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const CabDetailTreatyTermItem = styled.li`
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
`

export const CabDetailTreatyTermTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  margin-bottom: 4px;
`

export const CabDetailTreatyTermExcerpt = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
`

export const CabDetailTreatySigTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const CabDetailTreatySigRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 10px 12px;
  padding: 10px 11px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#e8ecf0'};
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
`

export const CabDetailTreatySigCountry = styled.div`
  font-weight: 700;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
`

export const CabDetailTreatySigCabinetHint = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textFaint};
  margin-top: 3px;
`

export const CabDetailTreatyImageRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const CabDetailTreatyImageThumb = styled.img`
  width: 76px;
  height: 54px;
  object-fit: cover;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
`

export const CabDetailTreatySignatoryRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

export const CabDetailTreatyMetaText = styled.span`
  font-size: 12px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
`

export const CabDetailTreatyPillRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
`

export const CabDetailTreatyCountryPill = styled.span`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').signatoryPillBg};
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').signatoryPillText};
`

export const CardIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: #94a3b8;
  cursor: pointer;
  transition:
    background 0.14s,
    color 0.14s,
    border-color 0.14s;
  &:hover:not(:disabled) {
    background: ${(p) =>
      p.$danger
        ? p.theme.mode === 'dark'
          ? 'rgba(220,38,38,0.15)'
          : '#fef2f2'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#f8fafc'};
    color: ${(p) =>
      p.$danger ? '#dc2626' : p.theme.mode === 'dark' ? '#cbd5e1' : '#475569'};
    border-color: ${(p) =>
      p.$danger
        ? p.theme.mode === 'dark'
          ? 'rgba(220,38,38,0.3)'
          : '#fecaca'
        : p.theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : '#94a3b8'};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`
/* 재임 기록 모달 */
export const MinisterHistoryModalBox = styled(ModalBox)`
  max-width: min(1000px, 100%);
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
export const MinisterHistoryModalBody = styled(ModalBody)`
  padding: 20px 24px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`
export const MinisterHistoryTarget = styled.div`
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  strong {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
`
export const MinisterHistorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`
export const MinisterHistorySectionTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
`
export const HistoryItemList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
export const HistoryItem = styled.li`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  padding: 10px 12px;
`
export const HistoryItemTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`
export const HistoryItemTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`
export const HistoryItemMeta = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
`
export const HistoryItemActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`
export const MinisterHistoryActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding-top: 24px;
`
export const HistorySecondaryButton = styled.button`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f8fafc'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#334155')};
  }
`

/* ——— 부처 상세 패널 (무슨 일을 했고, 직책·담당자) ——— */

/* ── 재임 기록 가로 타임라인: 열당 말풍선 카드 → 연결선 → 노드(가로 축) → 메타 (팔레트 전용) ── */
export const TenureHistoryInfographicCardMain = styled.div`
  flex: 1;
  min-width: 0;
`
export const TenureHistoryInfographicCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
  min-width: 0;
  width: 100%;
`

/** 바깥 래퍼 없음 — 추가 패널·테두리 없음 */
export const TenureHistoryTimelineShell = styled.div`
  margin-top: 14px;
`
export const TenureHistoryTimelineKicker = styled.p`
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').sectionHeading};
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').accent};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        getCabinetsSectionPalette(theme.mode === 'dark').accentBg};
  }
`
export const TenureHistoryHorizScroll = styled.div`
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  margin: 0 -4px;
  padding: 4px 4px 8px;
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148,163,184,0.35)' : '#cbd5e1'};
  }
`
/** 가로 스크롤 한 줄 — 열(말풍선·축·메타) 정렬 */
export const TenureHistoryHorizTrack = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  min-width: min-content;
  gap: 0;
`
export const TenureHistoryHorizCol = styled.div`
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 10px;
  box-sizing: border-box;
`
/** 말풍선 중앙 ↔ 노드 중앙 정렬용 세로 줄 */
export const TenureHistoryHorizConnector = styled.div`
  width: 2px;
  height: 14px;
  flex-shrink: 0;
  align-self: center;
  margin-top: 2px;
  border-radius: 1px;
  ${({ theme }) => {
    const p = getCabinetsSectionPalette(theme.mode === 'dark')
    return css`
      background: ${p.borderMid};
      opacity: 0.7;
    `
  }}
`
/** 열 중심에 맞춘 가로 축(좌·우 반씩) + 중앙 노드 — 카드 열과 동일; 좌우 마진으로 열 간 가로선 연결 */
export const TenureHistoryHorizSpineCell = styled.div`
  position: relative;
  height: 26px;
  flex-shrink: 0;
  align-self: stretch;
  width: calc(100% + 20px);
  margin-left: -10px;
  margin-right: -10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 50%;
    top: 50%;
    height: 3px;
    transform: translateY(-50%);
    border-radius: 2px;
    ${({ theme }) => {
      const p = getCabinetsSectionPalette(theme.mode === 'dark')
      return css`
        background: ${p.borderMid};
        opacity: 0.45;
      `
    }}
  }
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    right: 0;
    top: 50%;
    height: 3px;
    transform: translateY(-50%);
    border-radius: 2px;
    ${({ theme }) => {
      const p = getCabinetsSectionPalette(theme.mode === 'dark')
      return css`
        background: ${p.borderMid};
        opacity: 0.45;
      `
    }}
  }
`
export const TenureHistoryHorizNode = styled.div`
  position: relative;
  z-index: 2;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 50%;
  ${({ theme }) => {
    const p = getCabinetsSectionPalette(theme.mode === 'dark')
    return css`
      background: ${p.btnBg};
      border: 3px solid ${MAIN};
      box-shadow: 0 0 0 2px ${p.bgMuted};
    `
  }}
`
/** 말풍선 — 아래 꼬리가 열 중앙 노드와 수직으로 맞춤 */
export const TenureHistoryHorizCard = styled.div<{ $linkagePeer?: boolean }>`
  position: relative;
  width: 100%;
  min-height: 100px;
  overflow: visible;
  border-radius: 18px 18px 20px 18px;
  cursor: pointer;
  padding: 12px 32px 14px 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease,
    background 0.15s ease;

  ${({ theme, $linkagePeer }) => {
    const p = getCabinetsSectionPalette(theme.mode === 'dark')
    const drop =
      theme.mode === 'dark'
        ? '0 4px 18px rgba(0, 0, 0, 0.35)'
        : '0 2px 10px rgba(15, 23, 42, 0.06)'
    return css`
      border: 1px solid ${p.accentBorder};
      background: ${p.cardBg};
      box-shadow: ${drop};
      ${$linkagePeer &&
      css`
        box-shadow:
          inset 3px 0 0 ${MAIN},
          ${drop};
      `}
    `
  }}

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid
      ${({ theme }) => getCabinetsSectionPalette(theme.mode === 'dark').cardBg};
    z-index: 1;
    pointer-events: none;
    filter: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'drop-shadow(0 1px 0 rgba(99, 102, 241, 0.25))'
        : 'none'};
  }

  &:hover {
    transform: translateY(-1px);
    ${({ theme, $linkagePeer }) => {
      const p = getCabinetsSectionPalette(theme.mode === 'dark')
      const hoverDrop =
        theme.mode === 'dark'
          ? '0 8px 24px rgba(0, 0, 0, 0.4)'
          : '0 6px 18px rgba(15, 23, 42, 0.08)'
      return css`
        border-color: ${p.accentSecondaryBorder};
        background: ${p.cardBgHover};
        box-shadow: ${$linkagePeer
          ? `inset 3px 0 0 ${MAIN}, ${hoverDrop}`
          : hoverDrop};
      `
    }}
  }

  &:hover::after {
    border-top-color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').cardBgHover};
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    ${({ theme }) => {
      const p = getCabinetsSectionPalette(theme.mode === 'dark')
      return css`
        outline: 2px solid ${p.accent};
        outline-offset: 3px;
      `
    }}
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    &:hover {
      transform: none;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }
  }
`
export const TenureHistoryLinkagePeerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-bottom: 6px;
  padding: 3px 9px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 6px;
  ${({ theme }) => {
    const p = getCabinetsSectionPalette(theme.mode === 'dark')
    return css`
      color: ${p.accent};
      background: ${p.accentBg};
      border: 1px solid ${p.accentBorder};
    `
  }}
`
export const TenureHistoryDateStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 6px;
`
export const TenureHistoryYearBadge = styled.span`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  ${({ theme }) => {
    const p = getCabinetsSectionPalette(theme.mode === 'dark')
    return css`
      color: ${p.accent};
      background: ${p.accentBg};
      border: 1px solid ${p.accentBorder};
    `
  }}
  padding: 4px 10px;
  border-radius: 999px;
  line-height: 1.2;
`
export const TenureHistoryDateRange = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  letter-spacing: -0.01em;
`
export const TenureHistoryInfographicTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.4;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').text};
  margin-bottom: 0;
`
export const TenureHistoryInfographicExcerpt = styled.div`
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
export const TenureHistoryTimelinePeersSlot = styled.div`
  margin-top: 8px;
`
export const TenureHistoryInfographicChevron = styled.span`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').iconColor};
  display: flex;
  align-items: center;
  pointer-events: none;
  opacity: 0.65;
`

/* ── 재임 기록 목록 카드 ── */
export const HistoryCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 10px;
  overflow: hidden;
`
export const HistoryCardDeleteBtn = styled.button`
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #e11d48;
  cursor: pointer;
  border-radius: 6px;
  padding: 0;
  opacity: 0.4;
  transition:
    opacity 0.12s,
    background 0.12s,
    color 0.12s;
  &:hover {
    opacity: 1;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.15)' : '#fff0f3'};
    color: #be123c;
  }
  &:focus-visible {
    opacity: 1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45);
  }
`
export const HistoryCard = styled.div`
  position: relative;
  padding: 12px 58px 12px 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  cursor: pointer;
  transition: background 0.12s;
  &:first-child {
    border-radius: 10px 10px 0 0;
  }
  &:last-child {
    border-radius: 0 0 10px 10px;
  }
  &:only-child {
    border-radius: 10px;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  }
  &:hover ${HistoryCardDeleteBtn} {
    opacity: 1;
  }
`
export const HistoryCardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  line-height: 1.35;
  margin-bottom: 3px;
`
export const HistoryCardMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-bottom: 2px;
`
export const HistoryCardExcerpt = styled.div`
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
/** 다국 행정부 묶음 — 카드 하단 피어 영토(국기·이모지·[국가명]) */
export const HistoryCardPeersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
`
export const HistoryCardPeerChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  font-size: 16px;
  line-height: 1;
`
export const HistoryCardPeerChipImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const HistoryArticlePeersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#eceff3'};
`
export const HistoryArticlePeerChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  font-size: 17px;
  line-height: 1;
`
export const HistoryArticlePeerChipImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`
export const HistoryPeerNameFallback = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 썸네일·이모지 없을 때 — [국가명] (칩보다 넓게) */
export const HistoryCardPeerBracket = styled.span`
  display: inline-flex;
  align-items: center;
  max-width: 180px;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  line-height: 1.25;
  word-break: break-all;
`

export const HistoryArticlePeerBracket = styled.span`
  display: inline-flex;
  align-items: center;
  max-width: 220px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  line-height: 1.3;
  word-break: break-all;
`

export const HistoryCardChevron = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#c8d0db'};
  display: flex;
  align-items: center;
`

/* ── 각료 프로필 compact block ── */
export const MinisterProfileBlock = styled.div<{ $articleMode?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: ${(p) => (p.$articleMode ? '18px 0 0' : '20px 0 16px')};
  border-bottom: ${(p) =>
    p.$articleMode
      ? 'none'
      : `1px solid ${
          p.theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'
        }`};
`
export const MinisterProfileAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9edf5'};
  display: flex;
  align-items: center;
  justify-content: center;
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45);
  }
`
export const MinisterProfileMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`
export const MinisterProfileName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  letter-spacing: -0.02em;
  line-height: 1.25;
`
export const MinisterProfileBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
`
export const MinisterPosBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 5px;
  padding: 2px 7px;
`
export const MinisterDeptTag = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 2px 7px;
`
export const MinisterProfileStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`
export const MinisterStatItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
`
export const MinisterStatAge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 4px;
  padding: 1px 6px;
`
export const MinisterProfileAction = styled.div`
  flex-shrink: 0;
  align-self: flex-start;
  padding-top: 2px;
`
export const MinisterProfileLifespan = styled.div`
  font-size: 11px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#b0bac9')};
  margin-top: 2px;
`
export const MinisterEditHistoryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  min-width: max-content;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.14s,
    border-color 0.14s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#94a3b8'};
  }
`

/* ── 재임 기록 상세(아티클 레이아웃) ── */
const NYT_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

/** 재임 기록 상세 버튼 공통 — 동일 높이·모서리·타이포 */
const historyArticleBtnPhysical = css`
  font-family: ${NYT_FONT};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  flex: 0 0 auto;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/** 재임 기록 상세 — 박스/카드 없이 본문 흐름만 (편집기·뉴스형) */
export const HistoryArticleWrap = styled.div`
  margin-top: 6px;
  padding: 0 0 56px;
  background: transparent;
  font-family: ${NYT_FONT};
  display: flex;
  flex-direction: column;
  gap: 0;
`
/** 재임 기록 상세 상단 액션 — 내용 너비만 차지 (한 줄 전체 점유 방지) */
export const HistoryArticleToolbarActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 1 auto;
  max-width: 100%;
`
/** 다국 행정부 묶기 — accent 고스트 (툴바 공통 터치 영역) */
export const HistoryArticleToolbarSecondaryBtn = styled.button`
  ${historyArticleBtnPhysical};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.12)'
      : 'rgba(99, 102, 241, 0.07)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(129, 140, 248, 0.28)'
        : 'rgba(99, 102, 241, 0.2)'};
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.4)'
        : 'rgba(99, 102, 241, 0.35)'};
  }
`
/** 툴바 삭제 — danger 고스트 */
export const HistoryArticleToolbarDeleteBtn = styled.button`
  ${historyArticleBtnPhysical};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fda4af' : '#be123c')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(244, 63, 94, 0.08)'
      : 'rgba(254, 242, 242, 0.95)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 113, 133, 0.28)'
        : 'rgba(225, 29, 72, 0.2)'};
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(244, 63, 94, 0.18)' : '#ffe4e6'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fecdd3' : '#9f1239')};
  }
`
export const HistoryArticleBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font-family: ${NYT_FONT};
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
  &:focus-visible {
    outline: none;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }
`
export const HistoryArticleDeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#e11d48')};
  cursor: pointer;
  border-radius: 6px;
  transition:
    background 0.12s,
    color 0.12s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(225,29,72,0.15)' : '#fff0f3'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fda4af' : '#be123c')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }
`
/** 본문 수정·추가 — neutral 고스트 (취소와 동일 계열) */
export const HistoryArticleEditBtn = styled.button`
  ${historyArticleBtnPhysical};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1'};
  }
`
/* 제목/날짜 영역: 100% width */
export const HistoryArticleMetaSection = styled.div`
  padding: 4px 0 12px;
  width: 100%;
  box-sizing: border-box;
`
export const HistoryHeadlineRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`
/** 제목 오른쪽 — 묶기·삭제·제목수정 등 (한 덩어리) */
export const HistoryArticleHeadlineAside = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
`
/** 제목 연필 — 아이콘만, 툴바와 동일 32px 터치 */
export const HistoryMetaEditBtn = styled.button`
  ${historyArticleBtnPhysical};
  width: 32px;
  min-width: 32px;
  padding: 0;
  gap: 0;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f8fafc'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : '#cbd5e1'};
  }
`
export const HistoryMetaForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`
export const HistoryMetaInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 17px;
  font-weight: 700;
  font-family: ${NYT_FONT};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#818cf8' : '#6366f1'};
  }
`
export const HistoryMetaDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
export const HistoryMetaDateInput = styled.input`
  padding: 7px 10px;
  font-size: 13px;
  font-family: ${NYT_FONT};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#818cf8' : '#6366f1'};
  }
`
/* 본문 영역: 가운데 정렬, max-width 680px */
export const HistoryArticleInner = styled.div`
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
`
export const HistoryArticleContentBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`
export const HistoryArticleHeadline = styled.h2`
  font-family: ${NYT_FONT};
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  margin: 0;
  flex: 1;
  min-width: 0;
`
export const HistoryArticleByline = styled.p`
  font-family: ${NYT_FONT};
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  margin: 6px 0 0;
  line-height: 1.5;
  font-weight: 500;
`

/** 재임 기록 제목·기간 아래 — 다국 행정부 묶음(byline 톤, 패널 아님) */
export const HistoryArticleLinkageMeta = styled.div<{
  $placement?: 'article' | 'list'
}>`
  font-family: ${NYT_FONT};
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  margin: ${({ $placement }) => ($placement === 'list' ? '0' : '6px 0 0')};
  font-weight: 500;
  & p {
    margin: 0;
  }
  & p + p {
    margin-top: 4px;
  }
  & a {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
    font-weight: 600;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`

/** 재임 기록 목록에서 묶음 메타 — 상세 기사 열(720)과 동일 정렬 */
export const CabinetLinkageMetaListShell = styled.div`
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
`

/** 본문 전 — 선 없이 여백만으로 구역 구분 */
export const HistoryArticleDivider = styled.div.attrs({
  'aria-hidden': true,
})`
  flex-shrink: 0;
  height: 0;
  margin: 20px 0 4px;
  border: none;
`
export const HistoryArticleEditorWrap = styled.div`
  width: 100%;
  min-height: 240px;
  margin-bottom: 12px;
`
export const HistoryArticleEditActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  & > ${HistoryArticleToolbarActions} {
    margin-right: auto;
  }
`
export const HistoryArticleCancelBtn = styled.button`
  ${historyArticleBtnPhysical};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'};
  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1'};
  }
`
export const HistoryArticleSaveBtn = styled.button<{ $isRegister?: boolean }>`
  ${historyArticleBtnPhysical};
  padding: 0 16px;
  border: none;
  color: #fff;
  background: ${(p) => (p.$isRegister ? '#059669' : '#6366f1')};
  &:hover:not(:disabled) {
    background: ${(p) => (p.$isRegister ? '#047857' : '#4f46e5')};
  }
  &:disabled {
    opacity: 0.55;
  }
`
/** RichTextEditor 본문(EditorContent)과 동일한 타이포·간격 — 수평선은 hr + .prose-hr 모두 지원 */
export const HistoryArticleProse = styled(RichTextReadView)`
  /* RichTextReadView Root의 pre-wrap은 figure/img 블록과 맞지 않아 뷰에서 이미지가 안 보이는 경우가 있음 */
  white-space: normal;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').text};
  word-break: break-word;

  p {
    margin: 0 0 8px 0;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }
  em {
    font-style: italic;
  }
  h1,
  h2,
  h3 {
    margin: 18px 0 8px 0;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').text};
    &:first-child {
      margin-top: 0;
    }
  }
  h1 {
    font-size: 32px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  }
  h2 {
    font-size: 24px;
  }
  h3 {
    font-size: 20px;
  }
  blockquote {
    border-left: 4px solid #4f46e5;
    padding: 12px 20px;
    margin: 12px 0;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(79,70,229,0.1)'
        : 'rgba(79, 70, 229, 0.04)'};
    border-radius: 0 12px 12px 0;
    color: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
    font-style: italic;
    position: relative;
    &::before {
      content: '"';
      position: absolute;
      top: 8px;
      left: 12px;
      font-size: 48px;
      color: rgba(79, 70, 229, 0.12);
      font-family: Georgia, serif;
      line-height: 1;
    }
  }
  hr,
  .prose-hr {
    ${proseHrStyles}
  }
  .prose-hr.prose-hr--small {
    ${proseHrSmallStyles}
  }
  a {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    text-decoration: none;
    border-bottom: 1px solid rgba(79, 70, 229, 0.3);
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease;
    font-weight: 500;
    &:hover {
      color: #4338ca;
      border-bottom-color: #4f46e5;
      background: rgba(79, 70, 229, 0.04);
    }
  }
  code {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : 'rgba(79, 70, 229, 0.08)'};
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    font-weight: 500;
    border: 1px solid rgba(79, 70, 229, 0.15);
  }
  pre {
    background: ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').bgSubtle};
    padding: 12px;
    border-radius: 12px;
    border: 1px solid
      ${({ theme }) =>
        getCabinetsSectionPalette(theme.mode === 'dark').borderMid};
    overflow-x: auto;
    margin: 10px 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    code {
      background: transparent;
      padding: 0;
      color: ${({ theme }) =>
        getCabinetsSectionPalette(theme.mode === 'dark').text};
      border: none;
    }
  }
  ${richTextReadonlyMediaAndTablesCss}

  .mention,
  .entity-link {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#2563eb')};
    text-decoration: none;
    cursor: pointer;
    border-radius: 2px;
    transition: color 0.15s ease;
  }
  .mention:hover,
  .entity-link:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#1d4ed8')};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .term {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#2dd4bf' : '#0f766e')};
    cursor: pointer;
    padding: 0 2px;
    border-radius: 3px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .term:hover {
    background: rgba(15, 118, 110, 0.12);
  }
`
export const HistoryArticleEmpty = styled.p`
  font-family: ${NYT_FONT};
  font-size: 14px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  margin: 0;
  padding: 6px 0 16px;
`

/** 재임 기록 본문 — 용어(.term) / 가문 클릭 시 툴팁 (다른 리치텍스트 뷰와 동일 z-index) */
export const HistoryProseTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: transparent;
`

export const HistoryProseTermTooltipPopover = styled.div<{
  $x: number
  $y: number
}>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent'};
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const HistoryProseDynastyTooltipPopover = styled.div<{
  $x: number
  $y: number
}>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.96)' : '#fff'};
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent'};
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #6d28d9;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

/* ── 인물 상세 모달 ── */
/* 인물 상세 뷰 모달 */
export const PersonViewOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  overflow-y: auto;
`
export const PersonViewModalBox = styled(motion.div)`
  ${({ theme }) => glassCardMixin(theme)}
  max-width: 900px;
  width: 100%;
  max-height: 88vh;
  border-radius: 20px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
export const PersonViewModalHeader = styled(ModalHeader)`
  padding: 16px 20px;
  flex-shrink: 0;
`
export const PersonViewModalTitle = styled(ModalTitle)`
  font-size: 15px;
`
export const PersonViewModalBody = styled(ModalBody)`
  overflow-y: auto;
  flex: 1;
`

/* ── 수반 재임 부가정보 — 플랫(박스 제거), 좌측 액센트만 ── */
export const HeadTenureInfoSection = styled.div<{
  $accent?: 'mint' | 'rose'
  /** 재임 기록 상세(아티클)일 때 하단 누적 구분선 제거 */
  $omitBottomRule?: boolean
}>`
  padding: ${(p) => (p.$omitBottomRule ? '22px 0 0' : '28px 0 36px')};
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: ${(p) =>
    p.$omitBottomRule
      ? 'none'
      : `1px solid ${
          p.theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#eceff3'
        }`};
  margin-bottom: 0;
  border-left: ${(p) =>
    p.$accent === 'mint'
      ? '3px solid #6ee7b7'
      : p.$accent === 'rose'
        ? '3px solid #fca5a5'
        : 'none'};
  padding-left: ${(p) =>
    p.$accent === 'mint' || p.$accent === 'rose' ? '14px' : '0'};
`
export const HeadTenureInfoBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`
export const HeadTenureInfoBadge = styled.div<{
  $type?: 'appointment' | 'end'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
`
export const HeadTenureInfoBadgeLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`
export const HeadTenureInfoRow = styled.div<{ $block?: boolean }>`
  display: ${(p) => (p.$block ? 'block' : 'flex')};
  align-items: ${(p) => (p.$block ? 'unset' : 'flex-start')};
  gap: 8px;
`
export const HeadTenureInfoLabel = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #b0bac9;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 72px;
  display: block;
  margin-bottom: 2px;
`
export const HeadTenureInfoValue = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 5px;
  padding: 2px 8px;
`
export const HeadTenureInfoText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`

/** SidePanel 본문 상단: 모드 탭을 스크롤 영역 맨 위에 고정(헤더 바로 아래) */
export const TreatySidePanelTabBarWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  margin: -22px -28px 14px -28px;
  width: calc(100% + 56px);
  box-sizing: border-box;
`

/** 조약 패널 하단(또는 헤더) 주요 버튼 — 등록·연결·수정 */
export const TreatyPanelPrimaryBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  background: ${MAIN};
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.35);
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: ${MAIN_HOVER};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const TreatyPanelFooterBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 -24px -16px;
  padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 15, 18, 0.88)'
      : 'rgba(248, 250, 252, 0.97)'};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 -10px 32px rgba(15, 23, 42, 0.08);
`

export const TreatyListSkeletonPulse = styled.div`
  height: 52px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#e2e8f0'};
  animation: treatySk 1.1s ease-in-out infinite;
  @keyframes treatySk {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
`

/** 조약 폼: 직접 입력 ↔ DB 등 한쪽만 보일 때 모드 전환 */
export const TreatyFieldModeRow = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
`
export const TreatyFieldModeBtn = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: ${(p) =>
    p.$active
      ? p.theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : '#eef2ff'
      : 'transparent'};
  color: ${(p) => (p.$active ? '#4f46e5' : p.theme.colors.text.secondary)};
  transition:
    background 0.15s ease,
    color 0.15s ease;
  mar &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const TreatySubSectionTitle = styled.h3`
  margin: 0;
  padding: 4px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  &:not(:first-of-type) {
    margin-top: 8px;
    padding-top: 20px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

export const TreatyFormSelect = styled.select`
  width: 100%;
  max-width: 360px;
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

export const TreatyListRow = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  border-radius: 12px;
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : theme.colors.border.light};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.12)'
        : '#eef2ff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fafbff'};
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: #a5b4fc;
  }
`

/** 조약 모달 상단: 새 조약 / 기존 연결 — Pill 탭과 구분되는 언더라인 탭 */
export const TreatyModeTabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 0 8px 0 24px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

export const TreatyModeTab = styled.button<{ $active?: boolean }>`
  padding: 14px 22px;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  color: ${(p) =>
    p.$active ? '#4f46e5' : p.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  background: none;
  border: none;
  border-bottom: 3px solid ${(p) => (p.$active ? '#6366f1' : 'transparent')};
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 다자 조약 서명국 한 행 */
export const SignatoryRowCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  padding: 16px 18px 8px;
  margin-bottom: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafbff'};
`

export const SignatoryRowHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 서명·참여 탭: 다자 조약 입력 예시 (접이식) */
export const TreatyExampleSummary = styled.summary`
  cursor: pointer;
  list-style: none;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;

  &::-webkit-details-marker {
    display: none;
  }

  &:hover {
    filter: brightness(1.04);
  }

  svg {
    flex-shrink: 0;
    color: #6366f1;
    transition: transform 0.2s ease;
  }
`

export const TreatyExamplePanel = styled.details`
  margin: 0 0 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#f5f3ff'};
  overflow: hidden;

  &[open] ${TreatyExampleSummary} svg {
    transform: rotate(180deg);
  }
`

export const TreatyExampleBody = styled.div`
  padding: 0 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const TreatyExampleScrollWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

export const TreatyExampleTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 12.5px;
  line-height: 1.45;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  th {
    font-weight: 600;
    font-size: 11.5px;
    text-transform: none;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  caption {
    caption-side: bottom;
    padding-top: 10px;
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-align: left;
    line-height: 1.5;
  }
`

/** 짧은 필드(유형 등) — 가로 폭 제한 */
export const TreatyFieldNarrow = styled(FieldControl)`
  max-width: 280px;
`

/** 긴 한 줄 입력(장소 등) */
export const TreatyFieldWide = styled(FieldControl)`
  max-width: 520px;
`

/** 서명 장소·서술 등 — 폼 열 전체 너비 */
export const TreatyFullWidthFieldControl = styled(FieldControl)`
  max-width: 100%;
  width: 100%;
`

/* ── 타임라인 셀 `TlItem` (`cabinets-section-timeline`) ─────────────────── */

const TL_MONARCH_HIT_PAD =
  (TL_MONARCH_HIT_MIN - TL_MONARCH_BADGE_VISUAL) / 2

export const TlItemRoot = styled.div<{ $thumbOnEnd?: boolean }>`
  display: flex;
  flex-direction: ${(p) => (p.$thumbOnEnd ? 'row-reverse' : 'row')};
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  min-width: 0;
`

export const TlItemAvatarCol = styled.div`
  position: relative;
  width: ${TL_THUMB}px;
  height: ${TL_THUMB}px;
  flex-shrink: 0;
  overflow: visible;
`

export const TlItemAvatarRing = styled.div<{ $lineColor: string }>`
  width: ${TL_THUMB}px;
  height: ${TL_THUMB}px;
  border-radius: 50%;
  overflow: hidden;
  background: ${(p) => `${p.$lineColor}18`};
  border: 3px solid ${(p) => p.$lineColor};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${(p) => `0 4px 16px ${p.$lineColor}44`};
`

export const TlItemAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
`

export const TlItemMonarchAnchor = styled.div<{
  $left: number
  $top: number
  $pointerEvents: 'auto' | 'none'
}>`
  position: absolute;
  left: ${(p) => p.$left}px;
  top: ${(p) => p.$top}px;
  z-index: 2;
  pointer-events: ${(p) => p.$pointerEvents};
  transform: translate(${-TL_MONARCH_HIT_PAD}px, ${-TL_MONARCH_HIT_PAD}px);
`

export const TlItemMonarchHitBtn = styled.button`
  margin: 0;
  padding: ${TL_MONARCH_HIT_PAD}px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;
  line-height: 0;
  min-width: ${TL_MONARCH_HIT_MIN}px;
  min-height: ${TL_MONARCH_HIT_MIN}px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`

export const TlItemMonarchBadgeVisual = styled.div<{
  $lineColor: string
  $accentColor: string | null
  $panelBg: string
}>`
  width: ${TL_MONARCH_BADGE_VISUAL}px;
  height: ${TL_MONARCH_BADGE_VISUAL}px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) =>
    p.$accentColor ? `${p.$accentColor}28` : `${p.$lineColor}22`};
  border: 2px solid ${(p) => (p.$accentColor ? p.$accentColor : p.$lineColor)};
  box-shadow: ${(p) => `0 0 0 2px ${p.$panelBg}, 0 2px 8px rgba(0, 0, 0, 0.2)`};
`

export const TlItemMonarchBadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
`

export const TlItemTextCol = styled.div<{ $thumbOnEnd?: boolean }>`
  container-type: inline-size;
  container-name: tl-item;
  min-width: 0;
  flex: 1;
  text-align: ${(p) => (p.$thumbOnEnd ? 'right' : 'left')};
`

export const TlItemTerritoryLine = styled.div<{
  $color: string
  $thumbOnEnd?: boolean
}>`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => p.$color};
  align-self: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'flex-start')};
  max-width: 100%;
`

export const TlItemPosPill = styled.span<{
  $lineColor: string
  $thumbOnEnd?: boolean
}>`
  font-size: 10.5px;
  font-weight: 700;
  color: ${(p) => p.$lineColor};
  background: ${(p) => `${p.$lineColor}12`};
  border: 1.5px solid ${(p) => `${p.$lineColor}66`};
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;

  @container tl-item (max-width: 220px) {
    max-width: 100%;
    align-self: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'flex-start')};
  }
`

export const TlItemTitleRow = styled.div<{ $thumbOnEnd?: boolean }>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'flex-start')};
  gap: 8px 10px;
  min-width: 0;

  @container tl-item (max-width: 220px) {
    flex-direction: column;
    align-items: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'stretch')};
    gap: 6px;
  }
`

export const TlItemPersonName = styled.div<{
  $color: string
  $thumbOnEnd?: boolean
}>`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.45;
  word-break: keep-all;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  color: ${(p) => p.$color};

  @container tl-item (max-width: 220px) {
    flex: none;
    width: 100%;
    text-align: ${(p) => (p.$thumbOnEnd ? 'right' : 'left')};
  }
`

export const TlItemMetaRow = styled.div<{ $thumbOnEnd?: boolean }>`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'flex-start')};
  gap: 6px 8px;
`

export const TlItemRangeChip = styled.span<{ $lineColor: string }>`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.$lineColor};
  background: transparent;
  border: 1px solid ${(p) => `${p.$lineColor}55`};
  border-radius: 6px;
  padding: 2px 9px;
  white-space: normal;
  word-break: keep-all;
  line-height: 1.35;
`

export const TlItemAgeNote = styled.span<{ $color: string }>`
  font-size: 10.5px;
  font-weight: 500;
  color: ${(p) => p.$color};
`

export const TlItemBirthRow = styled.div<{
  $color: string
  $thumbOnEnd?: boolean
}>`
  margin-top: 6px;
  font-size: 10.5px;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  justify-content: ${(p) => (p.$thumbOnEnd ? 'flex-end' : 'flex-start')};
  flex-wrap: wrap;
  gap: 6px;
`

export const TlItemBirthLabel = styled.span<{ $color: string }>`
  font-size: 9.5px;
  font-weight: 600;
  color: ${(p) => p.$color};
`
