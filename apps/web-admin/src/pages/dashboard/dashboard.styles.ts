import { motion } from 'framer-motion'
import styled from 'styled-components'

const SANS =
  "'Roboto', -apple-system, sans-serif"

// --- 메인 컨테이너 ---
export const DashboardContainer = styled(motion.div)`
  position: fixed;
  inset: 0;
  /* 100vw는 스크롤바 폭을 포함해 가로 스크롤을 유발할 수 있어 100% 사용 */
  width: 100%;
  height: 100vh;
  padding: 0;
  margin: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  box-sizing: border-box;
  transition: background 0.25s ease;
`

export const CentralContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-auto-flow: row;
  justify-items: center;
  align-items: center;
  text-align: center;
  width: max-content;
`

// 환영 인사
export const Greeting = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${SANS};
  margin-bottom: 10px;
`

// 시계
export const ClockContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
`

export const Time = styled.div`
  font-size: 28px;
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

// 아이콘 내비게이션
export const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 8px;
`

export const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
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
`

export const TextButton = styled.button`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 24px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  font-family: ${SANS};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.colors.text.secondary};
  }
`

// --- 하단 최근 사건 영역 ---
export const BottomContainer = styled(motion.div)`
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0;
  background: transparent;
  z-index: 20;
`

export const BottomInner = styled.div`
  width: min(820px, calc(100% - 64px));
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  padding: 0 2px 4px 2px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 14px;
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
  padding: 4px 6px;
  border-radius: 6px;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const EventGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

export const EventCard = styled.button`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 14px 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

  /* 왼쪽 얇은 상태 바 */
  &::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 16px;
    width: 2px;
    height: 20px;
    background: ${({ theme }) => theme.colors.active};
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
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 12px;
  font-weight: 600;

  svg {
    width: 14px;
    height: 14px;
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
