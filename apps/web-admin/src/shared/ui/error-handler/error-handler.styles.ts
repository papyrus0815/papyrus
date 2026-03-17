import styled, { keyframes, css } from 'styled-components'

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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #0f1115 0%, #12151a 50%, #0b0d11 100%);

  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.6s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 80% 20%,
      rgba(0, 0, 0, 0.25) 0%,
      transparent 55%
    );
    pointer-events: none;
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
  max-width: 600px;
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 8px 32px 0 rgba(0, 0, 0, 0.15);
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
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  box-shadow:
    0 8px 24px rgba(239, 68, 68, 0.35),
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
  font-size: 32px;
  animation: ${pulse} 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(239, 68, 68, 0.4));
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
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  letter-spacing: 0.3px;
  text-transform: uppercase;
`

export const StatusDot = styled.div`
  width: 6px;
  height: 6px;
  background: white;
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
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow:
            0 4px 16px rgba(239, 68, 68, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          &:hover {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            transform: translateY(-2px);
            box-shadow:
              0 8px 24px rgba(239, 68, 68, 0.4),
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
  font-size: 14px;
  font-weight: 700;
  color: #f9fafb;
  margin: 0 0 16px 0;
  letter-spacing: 0.3px;
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
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
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
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 13px;
  font-weight: 600;
`

export const ErrorIcon = styled.span`
  font-size: 16px;
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
