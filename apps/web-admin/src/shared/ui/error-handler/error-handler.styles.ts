import styled, { keyframes, css } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

// --- 액센트 토큰 ---
// 전면 레드 대신 "복구 가능" 톤의 앰버를 단일 액센트로 사용.
// 표면은 뉴트럴 글래스, 액센트는 상태/주요 액션에만 한정한다.
const ACCENT = '#f59e0b' // amber-500
const ACCENT_STRONG = '#d97706' // amber-600
const ACCENT_GLOW = 'rgba(245, 158, 11, 0.28)'

// --- 키프레임 애니메이션 ---
const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`

const pulse = keyframes`
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.8;
  }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
`

// --- 메인 컴포넌트 ---
export const Wrapper = styled.div.attrs({ role: 'alert' })<{
  $isVisible: boolean
}>`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.LOADING_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  /* 카드가 뷰포트보다 길어도(예: dev 스택트레이스) 잘리지 않고 스크롤되도록 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24px;
  background: linear-gradient(135deg, #0f1115 0%, #12151a 50%, #0b0d11 100%);

  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.6s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    /* 상단 앰버 글로우 + 우상단 음영으로 단색 배경에 깊이감 부여 */
    background:
      radial-gradient(circle at 50% -10%, ${ACCENT_GLOW} 0%, transparent 45%),
      radial-gradient(circle at 80% 20%, rgba(0, 0, 0, 0.25) 0%, transparent 55%);
    pointer-events: none;
  }

  /* 전정기관 장애 사용자 배려 — 무한 애니메이션·전환 정지 */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &,
    & * {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
  }
`

export const FloatingElements = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`

export const ErrorCard = styled.div<{ $isVisible: boolean }>`
  position: relative;
  /* margin:auto — 공간이 있으면 중앙 정렬, 부족하면 위 잘림 없이 스크롤 */
  margin: auto;
  max-width: 600px;
  width: 100%;
  /* 단색 배경 위라 backdrop-filter는 효과가 없어 제거하고,
     실제 면 색 그라데이션 + 강한 그림자로 깊이감을 만든다. */
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.025) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 24px;
  box-shadow:
    0 24px 60px -16px rgba(0, 0, 0, 0.6),
    0 4px 16px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  padding: 3rem 2.5rem;

  transform: ${({ $isVisible }) =>
    $isVisible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)'};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 24px;
    border: 1px solid transparent;
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.2),
        rgba(255, 255, 255, 0.1)
      )
      border-box;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    max-width: 90%;
  }
`

export const IllustrationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
`

export const ErrorIllustration = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`

export const Robot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const RobotHead = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_STRONG} 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  box-shadow:
    0 8px 24px ${ACCENT_GLOW},
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: ${float} 3s ease-in-out infinite;
`

export const RobotEye = styled.div<{ $isBlinking?: boolean; $delay?: number }>`
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  ${({ $isBlinking }) =>
    $isBlinking &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
      animation-delay: ${({ $delay = 0 }) => $delay}s;
    `}
`

export const RobotMouth = styled.div`
  width: 24px;
  height: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0 0 12px 12px;
`

export const HeartIcon = styled.div`
  width: 30px;
  height: 30px;
  color: ${ACCENT};
  animation: ${pulse} 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px ${ACCENT_GLOW});
`

export const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  text-align: center;
`

export const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_STRONG} 100%);
  color: #1c1206;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 700;
  width: fit-content;
  box-shadow: 0 4px 12px ${ACCENT_GLOW};
  letter-spacing: 0.3px;
  text-transform: uppercase;
`

export const StatusDot = styled.div`
  width: 6px;
  height: 6px;
  background: #1c1206;
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
`

export const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #f9fafb;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`

export const Subtitle = styled.p`
  font-size: 15px;
  color: #d1d5db;
  line-height: 1.6;
  margin: 0;
  max-width: 400px;
`

export const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
`

export const ActionButton = styled.button<{
  $variant: 'primary' | 'secondary'
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  ${({ $variant }) =>
    $variant === 'primary'
      ? css`
          background: linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_STRONG} 100%);
          color: #1c1206;
          box-shadow:
            0 4px 16px ${ACCENT_GLOW},
            inset 0 1px 0 rgba(255, 255, 255, 0.25);

          &:hover {
            background: linear-gradient(135deg, ${ACCENT_STRONG} 0%, #b45309 100%);
            transform: translateY(-2px);
            box-shadow:
              0 8px 24px ${ACCENT_GLOW},
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        `
      : css`
          background: rgba(255, 255, 255, 0.05);
          color: #d1d5db;
          border: 1px solid rgba(255, 255, 255, 0.1);

          &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          }
        `}

  &:active {
    transform: translateY(0);
  }

  /* 키보드 포커스 가시화 — 에러 화면은 키보드 의존도가 높음 */
  &:focus-visible {
    outline: 2px solid ${ACCENT};
    outline-offset: 2px;
  }
`

export const ButtonIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`

export const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
`

export const HelpSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`

export const HelpTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #f9fafb;
  margin: 0 0 16px 0;
  letter-spacing: 0.3px;
`

/** 타이틀 앞 인라인 아이콘 슬롯 (전구/터미널) */
export const TitleIcon = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: ${ACCENT};
  flex-shrink: 0;
`

export const HelpList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const HelpItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #d1d5db;
  line-height: 1.5;
`

export const HelpIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${ACCENT};
  flex-shrink: 0;
`

export const ErrorInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const ErrorBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  color: #fcd34d;
  font-size: 13px;
  font-weight: 600;
`

export const ErrorIcon = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
`

export const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #d1d5db;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${ACCENT};
    outline-offset: 2px;
  }
`

export const ChevronIcon = styled.div<{ $isOpen: boolean }>`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};

  svg {
    width: 100%;
    height: 100%;
  }
`

export const DevDetails = styled.div<{ $isOpen: boolean }>`
  margin-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  animation: ${({ $isOpen }) => ($isOpen ? slideDown : 'none')} 0.3s ease;
  overflow: hidden;
`

export const DevHeader = styled.div`
  margin-bottom: 16px;
`

export const DevTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #f9fafb;
  margin: 0;
  letter-spacing: 0.3px;
`

export const DevContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const ErrorMessage = styled.div`
  padding: 14px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #fca5a5;
  font-weight: 600;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
`

export const StackTrace = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  color: #e5e7eb;
  padding: 16px;
  border-radius: 12px;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`
