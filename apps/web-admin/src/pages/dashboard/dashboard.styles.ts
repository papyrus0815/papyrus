import { motion } from 'framer-motion'
import styled from 'styled-components'

import {
  BODY_TEXT,
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

export const DashboardViewport = styled(motion.div)`
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  box-sizing: border-box;
  ${BODY_TEXT}
`

export const DashboardInner = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 32px 56px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 900px) {
    padding: 20px 18px 48px;
    gap: 14px;
  }
`

/* ─── 1. Command Header Row ───────────────────────────────────────────────── */

export const HeaderBar = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const HeaderLead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const EyebrowRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const EyebrowBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const ClockPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const ClockTime = styled.strong`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const GreetingTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: 19px;
  }
`

export const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const CommandSearchTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  height: 36px;
  min-width: 280px;
  padding: 0 10px 0 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  box-shadow: none;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 640px) {
    min-width: 0;
    flex: 1 1 200px;
  }
`

export const SearchLead = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SearchShortcutKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

export const PrimaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#6366f1' : '#4f46e5'};
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
  transition: opacity ${MOTION.fast} ease;

  &:hover {
    opacity: 0.92;
  }
`

/* ─── 2. 6-Cell Archive Volume Strip + Quick Hub Bar ─────────────────────── */

export const VolumeStripWrap = styled.section`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

export const VolumeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));

  @media (max-width: 1080px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 580px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const VolumeCell = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background ${MOTION.fast} ease;

  & + & {
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 1080px) and (min-width: 581px) {
    &:nth-child(3n + 1) {
      border-left: none;
    }
    &:nth-child(n + 4) {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }

  @media (max-width: 580px) {
    &:nth-child(2n + 1) {
      border-left: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

export const VolumeTopRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const VolumeNumber = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

export const VolumeUnit = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const VolumeSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

export const QuickHubStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 9px 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const QuickHubLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

export const QuickHubPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/* ─── 3. Bento Grids & Cards ─────────────────────────────────────────────── */

export const InfographicsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FeedsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const BentoCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 10px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: none;
  min-width: 0;
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

export const CardTitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const CardTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const CardLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

export const CardCaption = styled.p`
  margin: -6px 0 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── 4. 9-Domain Donut Ring + Horizontal Proportional Bars ───────────────── */

export const DomainInfographicBody = styled.div`
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 16px;
  align-items: center;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
  }
`

export const DonutWrap = styled.div`
  position: relative;
  width: 112px;
  height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
`

export const DonutTotalNum = styled.span`
  font-size: 16px;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

export const DonutTotalLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const DomainBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
`

export const DomainBarRow = styled.button`
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) 68px;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const DomainLabelCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

export const DomainSwatch = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export const DomainTrack = styled.span`
  display: block;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

export const DomainFill = styled.span<{ $pct: number; $color: string }>`
  display: block;
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

export const DomainStatCell = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const DomainPctSub = styled.span`
  margin-left: 3px;
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── 5. Live Feeds (On This Day Spine & Recent Events Ledger) ───────────── */

export const SpineList = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;
`

export const FeedRowButton = styled.button`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-bottom-color: ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:last-child {
    border-bottom-color: transparent;
  }

  &:hover {
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

export const FeedYearBadge = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
  white-space: nowrap;
`

export const FeedMainCol = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const FeedTitleLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

export const FeedEventTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const FeedSummary = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const FeedCategoryTag = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`

export const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 8px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
