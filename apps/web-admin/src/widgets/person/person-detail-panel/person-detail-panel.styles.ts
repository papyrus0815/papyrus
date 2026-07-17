/**
 * person-detail-panel 스타일 — 컴포넌트에서 분리.
 * 변경 시 person-detail-panel.tsx의 import 함께 확인.
 */
import { motion } from 'framer-motion'
import styled, { css } from 'styled-components'

import { glassCardMixin } from '@/shared/styles/mixins'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import {
  type InfluenceTier,
  getInfluenceTierGradient,
} from '@/shared/lib/influence-tier'

export const BioMentionModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  -webkit-backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
`

export const BioMentionModalPanel = styled(motion.div)`
  /* 공용 glassCardMixin — 다른 모달(공용 ModalBox)과 톤 일치 (다크: rgba(20,20,20,0.92)) */
  ${({ theme }) => glassCardMixin(theme)}
  position: relative;
  border-radius: 16px;
  width: 100%;
  max-width: 740px;
  height: 68vh;
  min-height: 400px;
  max-height: 78vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

export const BioMentionModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 16px 20px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafbfc'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const BioMentionModalBack = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

export const BioMentionModalTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const BioMentionModalOpenDetail = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.14)'
      : 'rgba(99,102,241,0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'};
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : 'rgba(99,102,241,0.14)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.35)'};
  }
  &:active {
    transform: translateY(1px);
  }
`

export const BioMentionModalClose = styled.button`
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
  box-shadow: none;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
    box-shadow: none;
  }
  &:active {
    transform: scale(0.97);
  }
`

export const BioMentionModalBody = styled.div`
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
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
    border-radius: 4px;
  }
`

export const BioTermTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: transparent;
`

export const BioTermTooltipPopover = styled.div<{ $x: number; $y: number }>`
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
  box-shadow: none;
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

export const BioDynastyTooltipPopover = styled.div<{ $x: number; $y: number }>`
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
  box-shadow: none;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const PanelRoot = styled.div<{ $embed?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  background: transparent;

  @media (max-width: 968px) {
    padding: ${(p) => (p.$embed ? '0' : '0')};
  }
`

export const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`

export const HeaderRow = styled.header`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 36px 32px 28px;
  border-radius: 20px;
  margin-bottom: 20px;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  box-shadow: none;
`

export const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 0;
  width: 100%;
`

export const AvatarButton = styled.button<{ $loading?: boolean }>`
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 9999px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-weight: 700;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.6)' : '#94a3b8'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  padding: 0;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#94a3b8'};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  svg {
    opacity: 0.9;
  }

  &:hover > span {
    opacity: 1;
  }
`

export const AvatarOverlay = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
`

export const AvatarSpinner = styled.span`
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: avatarSpin 0.7s linear infinite;
  @keyframes avatarSpin {
    to { transform: rotate(360deg); }
  }
`

export const HeaderTitleBlock = styled.div`
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`

export const PageTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const CountryFlagImg = styled.img`
  width: 22px;
  height: 15px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: none;
`

export const CountryBracket = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  letter-spacing: 0.02em;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
`

export const DetailCountryRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 12px 4px 8px;
  border-radius: 100px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          &:hover {
            background: rgba(255,255,255,0.10);
            border-color: rgba(255,255,255,0.18);
          }
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          &:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
          }
        `}
`

export const DetailCountryFlagEmoji = styled.span`
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
`

export const DetailCountryName = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(203,213,225,0.9)' : '#475569'};
`

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.25;
  text-align: center;
  word-break: keep-all;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  @media (max-width: 640px) {
    font-size: 19px;
    white-space: normal;
  }
`

export const MonarchTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
`

export const MonarchCrownIcon = styled.span`
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
`

export const MonarchNameLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.9)' : 'rgba(160,110,0,0.95)'};
  letter-spacing: 0.02em;
`

export const MonarchPositionBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 100px;
  letter-spacing: 0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.85)' : 'rgba(140,95,0,0.9)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.18)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.4)'};
`

export const PageSubtitleInline = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 14px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#64748b'};

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

export const PageSubtitle = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RegisteredByline = styled.p`
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.03em;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const NameMetaBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`

export const NameMetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

export const NameMetaLabel = styled.span`
  flex: 0 0 36px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const NameMetaValue = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

export const NameMetaOriginal = styled(NameMetaValue)`
  font-family: 'Noto Serif KR', 'Source Han Serif', serif;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: 0.02em;
`

export const NicknameRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`

export const NicknameChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.07)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.15)'};
`

export const NicknameType = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const NicknameValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 별칭 이유·유래 — 칩 안 값 뒤 muted 접미. 길면 말줄임(전문은 title 툴팁). */
export const NicknameReason = styled.span`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  &::before {
    content: '· ';
  }
`

export const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.12);
            transform: translateY(-1px);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.06);
            border-color: rgba(99, 102, 241, 0.35);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

export const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.12);
            transform: translateY(-1px);
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.06);
            border-color: rgba(99, 102, 241, 0.35);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

export const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: rgba(252, 165, 165, 0.9);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          &:hover {
            background: rgba(239, 68, 68, 0.16);
            border-color: rgba(239, 68, 68, 0.45);
            transform: translateY(-1px);
          }
        `
      : css`
          color: #dc2626;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.2);
          &:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.35);
            transform: translateY(-1px);
          }
        `}
`

/* ── 삭제 확인 모달 ────────────────────────────────────────────── */

export const DeleteConfirmOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const DeleteConfirmDialog = styled(motion.div)`
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(28, 28, 32, 0.97);
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(239, 68, 68, 0.15);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
        `}
`

export const DeleteConfirmIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #ef4444;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.22);
        `
      : css`
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
        `}
`

export const DeleteConfirmTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DeleteConfirmPersonName = styled.p`
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #ef4444;
`

export const DeleteConfirmDesc = styled.p`
  margin: 0 0 24px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const DeleteConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`

export const DeleteConfirmCancelBtn = styled.button`
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: ${theme.colors.text.primary};
          &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          &:hover:not(:disabled) { background: #e9eef5; }
        `}
`

export const DeleteConfirmDeleteBtn = styled.button<{ $loading?: boolean }>`
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  border: none;
  background: #ef4444;
  color: #ffffff;
  opacity: ${({ $loading }) => ($loading ? 0.7 : 1)};
  &:disabled { cursor: not-allowed; }
  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
  }
`

/**
 * 인물 핵심 정보 대시보드 — 헤더 아래 한 줄.
 * 카드 중첩 없이, 하나의 줄(divider) 안에서 라벨 위 / 값 아래 형식으로
 * 균등하게 나열. 정보가 적어도 빈약해 보이지 않도록 큰 타이포 + 넉넉한 패딩.
 */
export const KpiStrip = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0;
  margin-bottom: 28px;
  padding: 22px 4px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

export const KpiItem = styled.div`
  flex: 1 1 0;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 18px;
  text-align: center;

  & + & {
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
  }
  @media (max-width: 760px) {
    flex: 1 1 33.333%;
    min-width: 0;
    padding: 10px 12px;
    &:nth-child(3n+1) {
      border-left: none;
    }
  }
  @media (max-width: 480px) {
    flex: 1 1 50%;
    &:nth-child(3n+1) {
      border-left: 1px solid
        ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
    }
    &:nth-child(2n+1) {
      border-left: none;
    }
  }
`

export const KpiLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

export const KpiValue = styled.span`
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.15;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  word-break: keep-all;
`

export const KpiSubValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: -0.01em;
`

export const KpiLink = styled.button`
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-align: inherit;
  letter-spacing: inherit;
  transition: color 0.15s ease;
  &:hover {
    color: #6366f1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
    border-radius: 4px;
  }
`

export const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6366f1;
`

export const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

export const FamilyBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`

export const FamilyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
`

/** 개요 탭 섹션 래퍼 — 섹션 간 일관된 수직 리듬 (divider 대체) */
export const OverviewSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

/** 개요 4클러스터(생애·요약 / 이력·활동 / 관계 / 소속·맥락) 구분 라벨 — 라벨 + 우측 divider 선.
    위쪽에 여백을 더하고 아래쪽을 당겨(margin) 라벨이 뒤따르는 섹션 묶음에 붙어 보이게 한다. */
export const OverviewClusterLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 -8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.light};
  }
`

/** 개요 점프 내비(UX8) — 4클러스터 바로가기 칩 행. */
export const OverviewJumpNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
`

export const OverviewJumpChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
  &:hover,
  &:focus-visible {
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  }
`

export const OverviewSectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 좁은 폭에서 버튼 라벨이 버튼 안에서 줄바꿈되는 대신 액션 행이 통째로 내려가도록 */
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 14px;
`

export const OverviewSectionHeading = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const CountMuted = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

export const InlineActions = styled.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
`

export const UnifiedActionRow = styled.div`
  display: inline-flex;
  gap: 6px;
`

// ─── 재임·재위 통합 카드 ───────────────────────────────────────
export const UnifiedCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const unifiedKindColor = {
  tenure: {
    base: '#4338ca',
    softBg: 'rgba(99,102,241,0.1)',
    softBgDark: 'rgba(99,102,241,0.18)',
    text: '#4338ca',
    textDark: '#a5b4fc',
  },
  reign: {
    base: '#0f766e',
    softBg: 'rgba(20,184,166,0.1)',
    softBgDark: 'rgba(20,184,166,0.18)',
    text: '#0f766e',
    textDark: '#5eead4',
  },
} as const

export const UnifiedCard = styled.div<{ $kind: 'tenure' | 'reign' }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: flex-start;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  overflow: hidden;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: rgba(99, 102, 241, 0.18);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  }

  @media (max-width: 560px) {
    padding: 14px 16px;
  }
`

export const UnifiedCardMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

export const UnifiedCardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const UnifiedKindBadge = styled.span<{ $kind: 'tenure' | 'reign' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 9px 3px 8px;
  border-radius: 999px;
  background: ${({ $kind, theme }) =>
    theme.mode === 'dark'
      ? unifiedKindColor[$kind].softBgDark
      : unifiedKindColor[$kind].softBg};
  color: ${({ $kind, theme }) =>
    theme.mode === 'dark'
      ? unifiedKindColor[$kind].textDark
      : unifiedKindColor[$kind].text};
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    /* 다크모드: base(진한 색)는 어두운 칩 위에서 저대비 — 텍스트와 동일 토큰 사용 */
    background: ${({ $kind, theme }) =>
      theme.mode === 'dark'
        ? unifiedKindColor[$kind].textDark
        : unifiedKindColor[$kind].base};
    flex-shrink: 0;
  }
`

export const UnifiedCardTitle = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  min-width: 0;
  word-break: break-word;
`

export const UnifiedOrdinal = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

export const UnifiedMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
`

export const UnifiedMetaChip = styled.span<{ $muted?: boolean }>`
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $muted }) =>
    $muted
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.045)'};
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

export const UnifiedAgeBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.09)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
`

export const UnifiedReappointBadge = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

export const UnifiedSubRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`

/** 비고(notes) — 즉위/퇴위 칩과 달리 여러 줄일 수 있어 자체 행을 차지하고 개행을 보존. */
export const UnifiedNote = styled.span`
  flex-basis: 100%;
  white-space: pre-wrap;
  word-break: break-word;
`

export const UnifiedEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  ${UnifiedCard}:hover & {
    opacity: 1;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  }
  /* 키보드 포커스 시 가시화 — opacity:0 + hover만 있으면 Tab 이동해도 계속 투명해
     보이지 않는다(형제 삭제 버튼과 동일 규약). */
  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.button.primary};
    outline-offset: 1px;
  }
`

// ─── 영향력 블록 — 티어 색상은 @/shared/lib/influence-tier에서 관리 ───
export const InfluenceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 2px;
`

/** 영향력 미평가(null) 빈 상태(UX7) — 능력치 섹션 빈 상태와 동일 톤. */
export const InfluenceEmpty = styled.div`
  padding: 6px 2px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 연보 페치 실패 안내(ER3) — 거짓 빈 상태 대신 실패를 표면화 + 재시도. */
export const LifeEventsErrorNote = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0;
  padding: 10px 12px;
  font-size: 13px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#7f1d1d' : '#fecaca')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(220,38,38,0.12)' : 'rgba(254,226,226,0.6)'};
  button {
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 7px;
  }
`

export const InfluenceSliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const InfluenceSliderInput = styled.input`
  flex: 1;
  accent-color: #6366f1;
`

export const InfluenceBar = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  overflow: hidden;
`

export const InfluenceFill = styled.div<{
  $pct: number
  $tier: InfluenceTier | null
}>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${({ $tier }) =>
    $tier
      ? getInfluenceTierGradient($tier)
      : 'linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%)'};
  border-radius: 4px;
  transition:
    width 0.3s,
    background 0.3s;
`

export const InfluenceValueGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 64px;
`

export const InfluenceValue = styled.span<{ $tier: InfluenceTier | null }>`
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: ${({ $tier, theme }) =>
    $tier === 'top'
      ? '#b45309'
      : $tier === 'high'
        ? '#d97706'
        : $tier === 'mid'
          ? '#4f46e5'
          : $tier === 'low'
            ? theme.colors.text.secondary
            : theme.colors.text.tertiary};
`

export const InfluenceTierLabel = styled.span<{ $tier: InfluenceTier }>`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ $tier }) =>
    $tier === 'top'
      ? '#b45309'
      : $tier === 'high'
        ? '#d97706'
        : $tier === 'mid'
          ? '#4f46e5'
          : '#64748b'};
`

export const InfluenceAnchorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 0 2px;
`

export const InfluenceAnchor = styled.div<{
  $active: boolean
  $tier: InfluenceTier | null
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.3;
  color: ${({ theme, $active, $tier }) => {
    if (!$active) return theme.colors.text.tertiary
    if ($tier === 'top') return '#b45309'
    if ($tier === 'high') return '#d97706'
    if ($tier === 'mid')
      return theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'
    return theme.colors.text.secondary
  }};
  b {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

// ─── 전기 빈 상태 CTA ────────────────────────────────────────
export const BioEmptyClickable = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 36px 28px;
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(99,102,241,0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(99,102,241,0.02)'};
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(99,102,241,0.35)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.035)'
        : 'rgba(99,102,241,0.04)'};
  }
  &:active {
    transform: translateY(1px);
  }
`

export const BioEmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
`

export const BioEmptyDesc = styled.div`
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const BioEmptyCta = styled.span`
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6366f1;
`

export const TenureAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  color: #6366f1;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.25);
          &:hover {
            background: rgba(99, 102, 241, 0.14);
            border-color: rgba(99, 102, 241, 0.45);
            transform: translateY(-1px);
          }
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.4);
            transform: translateY(-1px);
          }
        `}
`

export const TenureEmpty = styled.p`
  margin: 0;
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
  background: transparent;
  border: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
  strong {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
    font-weight: 600;
  }
`

/* ── 군주 재위 카드 ──────────────────────────── */
export const ReignCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const ReignCard = styled.div`
  display: flex;
  align-items: stretch;
  border-radius: 14px;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          &:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        `
      : css`
          background: #fff;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        `}
`

export const ReignCardAccent = styled.div`
  width: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
`

export const ReignCardBody = styled.div`
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const ReignCardTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

export const ReignCrownIcon = styled.span`
  font-size: 14px;
  line-height: 1;
  color: #d97706;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(217,119,6,0.3));
`

export const ReignCardTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ theme }) =>
    theme.mode === 'dark' ? `color: ${theme.colors.text.primary};` : `color: #1e293b;`}
`

export const ReignOrdinal = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
  border-radius: 6px;
  padding: 1px 6px;
  flex-shrink: 0;
`

export const ReignEditBtn = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: transparent;
          color: ${theme.colors.text.tertiary};
          &:hover { background: rgba(255,255,255,0.08); color: ${theme.colors.text.primary}; }
        `
      : css`
          background: transparent;
          color: #94a3b8;
          &:hover { background: #f1f5f9; color: #475569; }
        `}
`

export const ReignCardMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

export const ReignMetaChip = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 6px;
  padding: 2px 7px;
  ${({ theme, $muted }) =>
    theme.mode === 'dark'
      ? $muted
        ? `background: rgba(255,255,255,0.05); color: ${theme.colors.text.tertiary};`
        : `background: rgba(217,119,6,0.12); color: #fbbf24;`
      : $muted
        ? `background: #f8fafc; color: #64748b;`
        : `background: rgba(217,119,6,0.08); color: #92400e;`}
`

export const SectionCard = styled.div`
  border-radius: 20px;
  padding: 24px 28px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

export const SectionCardBio = styled.div`
  background: transparent;
  padding: 4px 0 150px;
`

export const BioSectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

export const BioSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6366f1;
`

export const BioText = styled.div`
  font-size: 14.5px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 68ch;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DeathInfoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const PlaceInfoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const PlaceInfoRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
`

export const PlaceLabel = styled.span`
  flex: 0 0 48px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PlaceValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

export const LifeCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
`

export const LifeCard = styled.section<{ $tone: 'birth' | 'death' }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ theme, $tone }) =>
    $tone === 'birth'
      ? theme.mode === 'dark'
        ? 'rgba(34, 197, 94, 0.06)'
        : 'rgba(34, 197, 94, 0.04)'
      : theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.06)'
        : 'rgba(239, 68, 68, 0.04)'};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'birth'
        ? theme.mode === 'dark'
          ? 'rgba(34, 197, 94, 0.20)'
          : 'rgba(34, 197, 94, 0.14)'
        : theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.20)'
          : 'rgba(239, 68, 68, 0.14)'};
`

export const LifeCardHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const LifeCardIconWrap = styled.span<{ $tone: 'birth' | 'death' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: ${({ $tone }) => ($tone === 'birth' ? '#16a34a' : '#dc2626')};
  background: ${({ $tone, theme }) =>
    $tone === 'birth'
      ? theme.mode === 'dark'
        ? 'rgba(34, 197, 94, 0.18)'
        : 'rgba(34, 197, 94, 0.12)'
      : theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.18)'
        : 'rgba(239, 68, 68, 0.12)'};
`

export const LifeCardTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`

export const LifeCardAge = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 출생 카드 신분 마커 — 서출(사생아). 가계도 별표(*)와 동일 시맨틱, 사망(적색)과 구분한 앰버 톤. */
export const BirthMarkerPill = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.005em;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.24)'};
`

export const LifeCardRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

export const LifeCardLabel = styled.span`
  flex: 0 0 36px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const LifeCardValue = styled.span`
  flex: 1;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

export const SpouseDetailList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const SpouseDetailItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)'};
`

export const SpouseDetailHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
`

export const SpouseDetailName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SpouseDetailPeriod = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SpouseDetailNote = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 68ch;
`

export const SimpleEntryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const SimpleEntryItem = styled.li`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0'};

  &:hover button[data-role='entry-delete'] {
    opacity: 1;
  }
`

/** 학력·경력·수상 항목 우상단 인라인 삭제 버튼 (호버 시 또렷해짐) */
export const SimpleEntryDeleteBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s, background 0.15s, color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(248, 113, 113, 0.14)'
        : 'rgba(239, 68, 68, 0.1)'};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.error};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`

export const SimpleEntryHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
`

export const SimpleEntryTitle = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SimpleEntrySub = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SimpleEntryRole = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)'};
  color: #6366f1;
`

export const SimpleEntryPeriod = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.01em;
`

export const SimpleEntryDescription = styled.p`
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

export const ActivityGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const ActivityGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const ActivityGroupTitle = styled.h4`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CountryAffiliationList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const CountryAffiliationChip = styled.div<{ $primary: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12.5px;
  background: ${({ theme, $primary }) =>
    $primary
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.10)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : '#f1f5f9'};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.42)'
          : 'rgba(99, 102, 241, 0.26)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : '#e2e8f0'};
`

export const CountryAffiliationType = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
`

export const CountryAffiliationName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CountryAffiliationPeriod = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FoundedDynastyRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const FoundedDynastyChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.08)'};
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.32)' : 'rgba(99, 102, 241, 0.22)'};
  transition: background-color 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.14)'};
  }
`

export const DeathInfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

export const DeathTypePill = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.005em;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.22)'};
`

export const DeathCauseText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DeathNoteText = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 68ch;
`

export const BioEditorWrap = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
`

export const BioProse = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px;
`

/** 전기: 공통 RichTextReadView + 인물 패널만 살짝 좁은 타이포 */
export const BioContent = styled(RichTextReadView)`
  font-size: 14.5px;
  line-height: 1.8;
  word-break: break-word;
  & p {
    margin: 0 0 0.75em;
  }
  & p:last-child {
    margin-bottom: 0;
  }
`

export const BioEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const BioEmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  padding: 4px 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 56px 24px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2.5px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.15)'};
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const LoadingText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 24px;
  text-align: center;
`

export const ErrorIcon = styled.div`
  font-size: 40px;
  opacity: 0.55;
`

export const ErrorTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ErrorDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CloseBtn = styled.button`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: none;
  }
`

/** 오류 상태 액션 행(ER1) — 재시도 + 닫기. */
export const ErrorActions = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
`

/** 일시 오류 재시도 버튼(ER1) — 채운 인디고. */
export const PrimaryRetryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
  }
`

export const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

export const TabNav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  padding: 10px;
  margin-bottom: 24px;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  border-radius: 20px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

export const TabBtn = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '700' : '600')};
  cursor: pointer;
  white-space: nowrap;
  border-radius: 12px;
  transition: all 0.2s ease;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          color: ${$active ? '#ffffff' : 'rgba(255,255,255,0.55)'};
          background: ${$active
            ? '#6366f1'
            : 'transparent'};
          box-shadow: none;
          svg {
            flex-shrink: 0;
            opacity: ${$active ? 1 : 0.7};
          }
          &:hover {
            ${!$active &&
            css`
              color: #a5b4fc;
              background: rgba(99, 102, 241, 0.12);
            `}
          }
        `
      : css`
          color: ${$active ? '#ffffff' : '#64748b'};
          background: ${$active
            ? '#6366f1'
            : 'transparent'};
          box-shadow: none;
          svg {
            flex-shrink: 0;
            opacity: ${$active ? 1 : 0.7};
          }
          &:hover {
            ${!$active &&
            css`
              color: #6366f1;
              background: rgba(99, 102, 241, 0.08);
            `}
          }
        `}

  @media (max-width: 768px) {
    padding: 9px 14px;
    font-size: 12px;
    gap: 6px;
  }
`

export const TabContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

export const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`

export const ListBlock = styled.div`
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

export const ListRowGroupLabel = styled.div`
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#6366f1')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.04)'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.1)'};
`

export const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.6)'};
  transition: background 0.15s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99, 102, 241, 0.04)'};
  }
`

export const ListRowLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 60px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
`

export const ListRowPrimary = styled.div`
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

export const ListRowMeta = styled.div`
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#64748b'};
`

export const TenureListWrap = styled.div`
  max-width: 100%;
`

export const TenureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const TenureRow = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
            background: rgba(99, 102, 241, 0.08);
            transform: translateX(4px);
          }
        `
      : css`
          background: #fafbfc;
          border: 1.5px solid #e2e8f0;
          &:hover {
            background: #ffffff;
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateX(4px);
            box-shadow: none;
          }
        `}
`

export const TenureRowMain = styled.div`
  min-width: 0;
  flex: 1;
`

export const TenureRowTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

export const TenureRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 12px;
  font-weight: 500;
`

export const TenureRowMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #64748b;
        `}
`

export const TenureRowAgeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.3);
        `
      : css`
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
        `}
`

export const TenureRowSub = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: ${theme.colors.text.tertiary};
        `
      : css`
          background: rgba(99, 102, 241, 0.03);
          border: 1px solid rgba(99, 102, 241, 0.08);
          color: #64748b;
        `}

  span::before {
    content: '·';
    margin-right: 4px;
    opacity: 0.4;
  }
  span:first-child::before {
    content: none;
  }
`

export const TenureRowEditBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  color: #6366f1;
  transition: all 0.2s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          &:hover {
            background: rgba(99, 102, 241, 0.15);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.08);
            transform: translateY(-1px);
            box-shadow: none;
          }
        `}
`

export const TenureSectionCard = styled.div`
  max-width: 720px;
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: none;
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
          box-shadow: none;
        `}
`

export const TenureSectionLabel = styled.div`
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#6366f1')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.04)'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.1)'};
`

export const TenureItem = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.6)'};
  transition: background 0.15s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(99, 102, 241, 0.04)'};
  }
`

export const TenurePositionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
`

export const TenureMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 9px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const chipStyles = css`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #64748b;
        `}
`

export const TenureCountryBadge = styled.span`
  ${chipStyles}
`

export const TenurePeriod = styled.span`
  ${chipStyles}
`

export const TenureTerm = styled.span`
  ${chipStyles}
`

export const TenureSub = styled.div`
  margin-top: 6px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const EmptyState = styled.div`
  padding: 40px 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.2)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#94a3b8'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(99, 102, 241, 0.02)'};
`


// ─── 재임·재위 업적·한일 (인물 상세 카드 내 인라인 / 타임라인 스타일) ───
type AchKind = 'tenure' | 'reign'

/** 부모 카드(재임=인디고 / 재위=틸)와 연동되는 accent 팔레트 */
const achAccent = {
  tenure: {
    base: '#6366f1',
    strong: '#4f46e5',
    line: 'rgba(99,102,241,0.28)',
    soft: 'rgba(99,102,241,0.1)',
    softDark: 'rgba(99,102,241,0.18)',
    text: '#4338ca',
    textDark: '#a5b4fc',
    ring: 'rgba(99,102,241,0.18)',
  },
  reign: {
    base: '#14b8a6',
    strong: '#0d9488',
    line: 'rgba(20,184,166,0.28)',
    soft: 'rgba(20,184,166,0.1)',
    softDark: 'rgba(20,184,166,0.18)',
    text: '#0f766e',
    textDark: '#5eead4',
    ring: 'rgba(20,184,166,0.18)',
  },
} as const

export const AchievementSection = styled.div<{ $kind: AchKind }>`
  --ach-base: ${({ $kind }) => achAccent[$kind].base};
  --ach-strong: ${({ $kind }) => achAccent[$kind].strong};
  --ach-line: ${({ $kind }) => achAccent[$kind].line};
  --ach-soft: ${({ $kind, theme }) =>
    theme.mode === 'dark' ? achAccent[$kind].softDark : achAccent[$kind].soft};
  --ach-text: ${({ $kind, theme }) =>
    theme.mode === 'dark' ? achAccent[$kind].textDark : achAccent[$kind].text};
  --ach-ring: ${({ $kind }) => achAccent[$kind].ring};

  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'};
  display: flex;
  flex-direction: column;
  gap: 7px;
`

export const AchievementHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const AchievementToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  }
  svg.ach-trophy {
    color: var(--ach-base);
  }
`

export const AchievementChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
`

export const AchievementCount = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 17px;
  text-align: center;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--ach-soft);
  color: var(--ach-text);
`

export const AchievementAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  color: var(--ach-text);
  background: var(--ach-soft);
  border: 1px solid transparent;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  &:hover {
    box-shadow: 0 0 0 3px var(--ach-ring);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`

export const AchievementTimeline = styled(motion.ul)`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const AchievementNode = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 8px 7px 16px;
  border-radius: 8px;
  transition: background 0.15s;

  /* 작은 불릿 (연결선 없음) */
  &::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 13px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--ach-base);
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
  }
`

export const AchievementRowMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const AchievementRowTitle = styled.div`
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  word-break: break-word;
`

export const AchievementRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
`

export const AchievementDateChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1.5px 8px;
  border-radius: 999px;
  background: var(--ach-soft);
  color: var(--ach-text);
  svg {
    opacity: 0.8;
  }
`

export const AchievementEventBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 180px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1.5px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,184,166,0.16)' : 'rgba(20,184,166,0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const AchievementHiddenBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1.5px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const AchievementRowDesc = styled.div`
  font-size: 11.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-word;
`

export const AchievementRowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.15s;

  ${AchievementNode}:hover & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
`

export const AchievementIconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme, $danger }) =>
      $danger
        ? 'rgba(239,68,68,0.12)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(15,23,42,0.06)'};
    color: ${({ theme, $danger }) =>
      $danger
        ? '#ef4444'
        : theme.mode === 'dark'
          ? theme.colors.text.primary
          : '#0f172a'};
  }
`

export const AchievementForm = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding: 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
`

export const AchievementInput = styled.input`
  width: 100%;
  padding: 8px 11px;
  font-size: 12.5px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: var(--ach-base);
    box-shadow: 0 0 0 3px var(--ach-ring);
  }
`

export const AchievementTitleInput = styled(AchievementInput)`
  font-size: 13px;
  font-weight: 600;
`

export const AchievementTextarea = styled.textarea`
  width: 100%;
  min-height: 58px;
  resize: vertical;
  padding: 8px 11px;
  font-size: 12.5px;
  line-height: 1.55;
  font-family: inherit;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: var(--ach-base);
    box-shadow: 0 0 0 3px var(--ach-ring);
  }
`

export const AchievementFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
`

export const AchievementDateField = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    width: auto;
    padding: 6px 9px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    border-radius: 8px;
    border: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
    color-scheme: ${({ theme }) => (theme.mode === 'dark' ? 'dark' : 'light')};
    transition: border-color 0.15s, box-shadow 0.15s;
    &:focus {
      outline: none;
      border-color: var(--ach-base);
      box-shadow: 0 0 0 3px var(--ach-ring);
    }
  }
`

export const AchievementCheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  user-select: none;
  input {
    width: 15px;
    height: 15px;
    accent-color: var(--ach-base);
    cursor: pointer;
  }
`

export const AchievementLinkLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const AchievementLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'};
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  &:hover {
    color: var(--ach-strong);
    border-color: var(--ach-base);
    border-style: solid;
  }
  &:focus-visible {
    outline: 2px solid var(--ach-base);
    outline-offset: 2px;
  }
`

export const AchievementLinkedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 240px;
  padding: 3px 6px 3px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,184,166,0.16)' : 'rgba(20,184,166,0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const AchievementLinkClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
`

export const AchievementFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 7px;
  margin-top: 1px;
`

export const AchievementSaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ach-base), var(--ach-strong));
  box-shadow: 0 2px 8px var(--ach-ring);
  transition: transform 0.1s, box-shadow 0.15s, opacity 0.15s;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px var(--ach-ring);
  }
  &:active {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`

export const AchievementCancelBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  }
`

export const AchievementEmpty = styled.p`
  margin: 0;
  padding: 6px 2px 2px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 업적 연결 사건 선택 모달 — 포털 렌더라 --ach-* 변수가 상속되지 않음(테마 토큰만 사용) ───

export const AchievementEventPickerSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

export const AchievementEventPickerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: min(56vh, 400px);
  overflow-y: auto;
`

export const AchievementEventPickerRow = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

export const AchievementEventPickerRowTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;
`

export const AchievementEventPickerRowMeta = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const AchievementEventPickerEmpty = styled.p`
  margin: 0;
  padding: 28px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 가계도 가족 퀵액션 (ego 기준 자녀/부모/배우자 추가·기존 인물 연결) ──────
export const FamilyActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`

export const FamilyActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    border-style: solid;
  }
  /* aria-disabled(포커스 유지형 비활성)도 native disabled와 동일한 시각 + hover 무효화 */
  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.5;
    cursor: default;
  }
  &[aria-disabled='true']:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: ${({ theme }) => theme.colors.border.default};
    border-style: dashed;
  }
`
