import { motion } from 'framer-motion'
import styled from 'styled-components'

import { DIGIT_DISPLAY } from '@/entities/event/ui/ledger-tokens'

const SANS =
  "'Pretendard Variable', Pretendard, 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif"

// --- 메인 컨테이너 (기존 디자인틀 유지 + 안전한 세로 스크롤 허용) ---
export const DashboardContainer = styled(motion.div)`
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transition: background 0.25s ease;
`

export const CentralContent = styled.div`
  margin-top: auto;
  margin-bottom: auto;
  padding: clamp(32px, 6vh, 64px) 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: min(760px, 100%);
  box-sizing: border-box;
`

// 환영 인사 (기존 스타일 그대로)
export const Greeting = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  margin-bottom: 10px;
`

// 시계 (기존 스타일 그대로)
export const ClockContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
`

export const Time = styled.div`
  font-size: 30px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${SANS};
  letter-spacing: -0.01em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`

export const DateText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
`

// 통합 검색 바 (⌘K — 기존 알약형 버튼 톤과 일체화)
export const SearchPillButton = styled.button`
  width: min(420px, calc(100vw - 96px));
  height: 38px;
  padding: 0 12px 0 15px;
  margin-bottom: 20px;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  font-size: 12.5px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
  }
`

export const SearchPillLead = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const SearchKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

// 원형 아이콘 내비게이션 (기존 디자인틀 유지 + 도메인 확장)
export const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 18px 22px;
  margin-bottom: 14px;
`

export const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  min-width: 48px;
`

export const CircleButton = styled.button<{ $primary?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${({ $primary, theme }) =>
    $primary ? 'none' : `1px solid ${theme.colors.border.default}`};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.primary : theme.colors.background.primary};
  color: ${({ $primary, theme }) =>
    $primary ? '#ffffff' : theme.colors.text.primary};
  box-shadow: none;

  &:hover {
    background: ${({ $primary, theme }) =>
      $primary ? theme.colors.button.hover : theme.colors.background.secondary};
    border-color: ${({ $primary, theme }) =>
      $primary ? 'transparent' : theme.colors.border.medium};
    box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
  }

  &:active {
    background: ${({ $primary, theme }) =>
      $primary ? theme.colors.button.hover : theme.colors.background.tertiary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

export const ButtonLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  line-height: 1.2;
`

export const ButtonSubCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;
  ${DIGIT_DISPLAY}
`

export const ActionPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
`

export const TextButton = styled.button<{ $subtle?: boolean }>`
  background: ${({ theme, $subtle }) =>
    $subtle ? 'transparent' : theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 24px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  font-family: ${SANS};
  color: ${({ theme, $subtle }) =>
    $subtle ? theme.colors.text.secondary : theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }
`

// --- 하단 큐레이션 · 인포그래픽 영역 (기존 BottomInner 프레임 유지) ---
export const BottomContainer = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 8px 0 calc(22px + env(safe-area-inset-bottom, 0px));
  background: transparent;
  flex-shrink: 0;
`

export const BottomInner = styled.div`
  width: min(880px, calc(100% - 48px));
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 640px) {
    width: calc(100% - 32px);
  }
`

export const DeckModeBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const DeckTabGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

export const DeckTabBtn = styled.button<{ $active: boolean }>`
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.active : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  font-family: ${SANS};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  padding: 5px 11px;
  border-radius: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.activeLight : theme.colors.hover};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

export const DeckTabCount = styled.span`
  font-size: 11px;
  opacity: 0.85;
  ${DIGIT_DISPLAY}
`

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${SANS};
`

export const ViewAllButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const EventGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const EventCard = styled.button<{ $accentColor?: string }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 14px 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  width: 100%;
  min-width: 0;
  position: relative;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};
  }

  /* 왼쪽 얇은 상태 바 (기존 디자인 유지 + 사건 분야 색상 반영) */
  &::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 16px;
    width: 2px;
    height: 20px;
    background: ${({ $accentColor, theme }) =>
      $accentColor || theme.colors.active};
    border-radius: 2px;
  }
`

export const EventTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${SANS};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CardMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  ${DIGIT_DISPLAY}
`

export const MetaDot = styled.span`
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.text.tertiary};
`

export const DescLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 2px;
`

export const OpenChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 11.5px;
  font-weight: 600;

  svg {
    width: 13px;
    height: 13px;
    fill: ${({ theme }) => theme.colors.active};
  }
`

export const EmptyState = styled.div`
  grid-column: 1 / -1;
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
`

// --- 인포그래픽 카드 (기존 EventCard의 12px 테두리·배경 톤 통일) ---
export const InfographicGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 780px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SurfaceCard = styled.section`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

export const CardTitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${SANS};
`

export const CardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const EraModeSwitch = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

export const EraModeBtn = styled.button<{ $active: boolean }>`
  height: 22px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  font-family: ${SANS};
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  ${DIGIT_DISPLAY}
`

export const SimpleCenturyBarsRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 112px;
  padding-top: 12px;
  overflow-x: auto;
`

export const SimpleCenturyCol = styled.button`
  flex: 1 1 24px;
  min-width: 22px;
  max-width: 48px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
`

export const SimpleCenturyCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const SimpleCenturyTrack = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  display: flex;
  align-items: flex-end;
  overflow: hidden;
`

export const SimpleCenturyFill = styled.div<{ $color: string }>`
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: ${({ $color }) => $color};
  opacity: 0.88;
`

export const SimpleCenturyLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

export const DomainInfographicBody = styled.div`
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 14px;
  align-items: center;

  @media (max-width: 500px) {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
  }
`

export const DonutWrap = styled.div`
  position: relative;
  width: 104px;
  height: 104px;
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
  font-size: 15px;
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
  gap: 3px;
  width: 100%;
  min-width: 0;
`

export const DomainBarRow = styled.button<{
  $active?: boolean
  $dimmed?: boolean
}>`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.border.default : 'transparent'};
  border-radius: 6px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.hover : 'transparent'};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.45 : 1)};
  font-family: ${SANS};
  text-align: left;
  cursor: pointer;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.hover};
  }
`

export const DomainLabelCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

export const DomainSwatch = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export const DomainTrack = styled.span`
  display: block;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
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
  font-size: 11px;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

// --- 6대 도메인 수록 규모 그리드 (기존 EventCard 12px 톤 통일) ---
export const VolumeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const VolumeCard = styled.button`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 13px 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  font-family: ${SANS};
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    box-shadow: 0 1px 2px ${({ theme }) => theme.colors.shadow.sm};
  }
`

export const VolumeTop = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const VolumeValue = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

export const VolumeUnit = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const VolumeDesc = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
