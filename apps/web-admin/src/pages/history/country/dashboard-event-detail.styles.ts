/**
 * 대시보드 사건 상세 페이지 전용 스타일.
 * 이전에는 dashboard-event-detail.page.tsx 내에 약 500줄이 함께 있었음.
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

export const ARTICLE_MAX_WIDTH = '680px'

export const SansFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

export const Page = styled(motion.article)`
  width: 100%;
  padding: 40px 0 64px;
  background: transparent;
  min-height: 100%;
  font-family: ${SansFamily};
`

/** 제목 영역 — 좌우 패딩만, max-width 없음 */
export const HeaderArea = styled.div`
  padding: 0 28px;
`

/** 본문 내용 — 폭 제한 + 중앙 정렬 */
export const ContentArea = styled.div`
  max-width: ${ARTICLE_MAX_WIDTH};
  margin: 0 auto;
  padding: 0 28px;
`

export const Kicker = styled.span`
  display: block;
  font-family: ${SansFamily};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 10px;
`

export const BackLink = styled.button`
  font-family: ${SansFamily};
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

export const EditButton = styled.button`
  font-family: ${SansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

export const Headline = styled.h1`
  font-family: ${SansFamily};
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 16px;
`

export const Byline = styled.p`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const Section = styled.section`
  margin-bottom: 40px;

  &:last-of-type {
    margin-bottom: 0;
  }
`

export const SectionTitle = styled.h2`
  font-family: ${SansFamily};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 14px;
`

export const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  ${SectionTitle} {
    margin: 0;
  }
`

/* 연대표 상단 수정 버튼과 동일한 스타일 */
export const SectionEditBtn = styled.button`
  font-family: ${SansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

export const SectionEditorWrap = styled.div`
  width: 100%;
  min-height: 240px;
  margin-bottom: 12px;
`

export const SectionEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const SectionSaveBtn = styled.button`
  font-family: ${SansFamily};
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #4f46e5;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #4338ca;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const DashboardRichText = styled(RichTextReadView)`
  font-family: ${SansFamily};
`

/** 피해·비용 — 구조화된 필드만 표시(RichText 아님) */
export const CasualtiesBlock = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  p {
    margin: 0 0 6px;
  }
`

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const Tag = styled.span`
  font-family: ${SansFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 5px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
`

export const CountryChip = styled.span<{ $historical?: boolean }>`
  font-family: ${SansFamily};
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f9fafb'};
  border: 1px solid
    ${(p) => (p.$historical ? '#fef3c7' : p.theme.colors.border.light)};
  color: ${(p) => (p.$historical ? '#b45309' : p.theme.colors.text.tertiary)};
`

export const SideBlock = styled.div`
  padding: 18px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 0;

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

export const SideName = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
`

export const SideDetail = styled.div`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const ImageWrap = styled.figure`
  margin: 28px 0;
  max-width: 100%;

  img {
    width: 100%;
    height: auto;
    display: block;
    background: ${({ theme }) => theme.colors.background.secondary};
  }
`

export const Figcaption = styled.figcaption`
  font-family: ${SansFamily};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 8px;
  line-height: 1.4;
`

export const ImageSource = styled.cite`
  display: block;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
  font-style: normal;
`

export const SubEventBtn = styled.button`
  display: block;
  width: 100%;
  padding: 12px 0;
  text-align: left;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  font-family: ${SansFamily};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  &:last-child {
    border-bottom: none;
  }
`

export const SubEventMeta = styled.span`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  margin-left: 8px;
`

export const MetaNote = styled.p`
  font-family: ${SansFamily};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 28px 0 0;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const LoadingWrap = styled.div`
  padding: 80px 32px;
  text-align: center;
  font-family: ${SansFamily};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ErrorWrap = styled.div`
  padding: 48px 32px;
  font-family: ${SansFamily};
  font-size: 15px;
  color: #c00;
`

export const MentionModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
`
export const MentionModalPanel = styled(motion.div)`
  position: relative;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.85)' : '#ffffff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: ${({ theme }) =>
    theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'};
  border-radius: 24px;
  box-shadow:
    0 32px 64px -16px rgba(0, 0, 0, 0.2),
    0 16px 32px -16px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 740px;
  height: 68vh;
  min-height: 400px;
  max-height: 78vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
export const MentionModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafbfc'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`
export const MentionModalTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
export const MentionModalClose = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  border-radius: 50%;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }
  &:active {
    transform: scale(0.97);
  }
`
export const MentionModalBody = styled.div`
  overflow: auto;
  flex: 1;
  min-height: 280px;
  padding: 20px 24px 32px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`

export const TermTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  background: transparent;
`
export const TermTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-family: ${SansFamily};
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
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

export const DynastyTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-family: ${SansFamily};
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
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
