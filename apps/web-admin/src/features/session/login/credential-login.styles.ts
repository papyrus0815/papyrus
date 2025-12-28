import styled, { keyframes, css } from 'styled-components'
import { motion } from 'framer-motion'

// --- 키프레임 애니메이션 ---
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

const glow = keyframes`
  0%, 100% { 
    box-shadow: 
      0 0 0 4px rgba(0, 190, 255, 0.1),
      0 4px 12px rgba(0, 190, 255, 0.2);
  }
  50% { 
    box-shadow: 
      0 0 0 4px rgba(0, 190, 255, 0.15),
      0 4px 16px rgba(0, 190, 255, 0.3);
  }
`

// 💧 리퀴드 글라스 효과 (대시보드와 동일)
const liquidGlassEffect = css`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid transparent;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);

  // 그라데이션 테두리를 위한 가상 요소
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

  &:hover {
    transform: translateY(-5px) scale(1.01);
    border-color: rgba(0, 190, 255, 0.5);
    animation: ${glow} 2s ease-in-out infinite;
  }
`

// --- 로딩 오버레이 ---
export const FullScreenLoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 15, 0.6);
  backdrop-filter: blur(10px);
  gap: 1.5rem;
`

export const BigLoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

export const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  animation: ${pulse} 2s ease-in-out infinite;
`

// --- 메인 컴포넌트 ---
export const LoginFormWrapper = styled.div`
  width: 100%;

  /* 포커스 문제 해결: 모든 이벤트 활성화 */
  pointer-events: auto !important;

  * {
    pointer-events: auto !important;
  }
`

export const LoginForm = styled.form<{
  $hasError: boolean
  $isLoading: boolean
}>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;

  ${({ $hasError }) =>
    $hasError &&
    css`
      animation: ${shake} 0.5s ease-in-out;
    `}

  /* 로딩 중에도 입력 가능하도록 pointer-events 제거 */
  ${({ $isLoading }) =>
    $isLoading &&
    `
      opacity: 0.8;
    `}
`

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const InputField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* focus 시 label 색상 변경 */
  &:focus-within label {
    color: #00beff;
  }
`

export const InputLabel = styled.label<{ $isFocused: boolean }>`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: ${({ $isFocused }) => ($isFocused ? '#00beff' : '#e5e7eb')};
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
`

export const InputWrapper = styled.div<{
  $hasValue: boolean
}>`
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  /* 포커스 문제 해결 */
  pointer-events: auto !important;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(
      135deg,
      rgba(0, 190, 255, 0),
      rgba(0, 190, 255, 0)
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:focus-within {
    border-color: rgba(0, 190, 255, 0.4);
    background: rgba(255, 255, 255, 0.06);
    box-shadow:
      0 0 0 4px rgba(0, 190, 255, 0.08),
      0 8px 24px rgba(0, 190, 255, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
      background: linear-gradient(
        135deg,
        rgba(0, 190, 255, 0.3),
        rgba(0, 190, 255, 0.1)
      );
    }
  }

  &:hover:not(:focus-within) {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
`

export const InputIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 56px;
  color: #9ca3af;
  font-size: 20px;
  transition: color 0.3s ease;

  ${InputWrapper}:focus-within & {
    color: #00beff;
  }
`

export const Input = styled.input`
  flex: 1;
  padding: 18px 16px 18px 0;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 500;
  color: #f9fafb;
  background: transparent;
  letter-spacing: 0.3px;

  /* 포커스 문제 해결 */
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;

  &::placeholder {
    color: #6b7280;
    font-weight: 400;
  }

  &:focus::placeholder {
    opacity: 0.5;
  }
`

export const PasswordToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 56px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  margin-right: 4px;

  &:hover {
    color: #00beff;
    background: rgba(0, 190, 255, 0.1);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    font-size: 18px;
  }
`

export const FormOptions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-top: 4px;
`

export const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`

export const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: #00beff;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`

export const CheckboxLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #d1d5db;
  cursor: pointer;
  user-select: none;
  letter-spacing: 0.2px;
  transition: color 0.2s ease;

  ${CheckboxWrapper}:hover & {
    color: #e5e7eb;
  }
`

export const ForgotLink = styled.a`
  font-size: 14px;
  color: #00beff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;

  &:hover {
    color: #0099cc;
    text-decoration: underline;
  }
`

export const ErrorAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: ${slideUp} 0.3s ease;
  margin-bottom: 16px;
  word-wrap: break-word;
  overflow-wrap: break-word;
`

export const ErrorIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
`

export const ErrorMessage = styled.span`
  font-size: 14px;
  color: #fca5a5;
  font-weight: 500;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  word-break: keep-all;
  overflow-wrap: break-word;
`

export const SubmitButton = styled(motion.button)<{
  $isValid: boolean
  $isLoading: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 18px 32px;
  margin-top: 8px;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: ${({ $isValid, $isLoading }) =>
    $isValid && !$isLoading ? 'pointer' : 'not-allowed'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  ${({ $isValid, $isLoading }) => {
    if ($isValid && !$isLoading) {
      return `
        background: linear-gradient(135deg, #00beff 0%, #0096d6 50%, #0077b6 100%);
        color: #ffffff;
        box-shadow: 
          0 8px 24px rgba(0, 190, 255, 0.35),
          0 4px 12px rgba(0, 150, 214, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);

        &:hover {
          background: linear-gradient(135deg, #0096d6 0%, #0077b6 50%, #005f99 100%);
          box-shadow: 
            0 12px 32px rgba(0, 190, 255, 0.45),
            0 6px 16px rgba(0, 150, 214, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transform: translateY(-3px) scale(1.01);
        }

        &:active {
          transform: translateY(-1px) scale(0.99);
          box-shadow: 
            0 4px 16px rgba(0, 190, 255, 0.3),
            0 2px 8px rgba(0, 150, 214, 0.2);
        }
      `
    }
    return `
      background: rgba(255, 255, 255, 0.05);
      color: #6b7280;
      cursor: not-allowed;
      box-shadow: none;
    `
  }}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover::before {
    left: 100%;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0)
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: ${({ $isValid }) => ($isValid ? 1 : 0)};
  }
`

export const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

export const ButtonIcon = styled.span`
  font-size: 18px;
  display: flex;
  align-items: center;
`

export const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`

export const CardFooter = styled.div`
  padding: 24px 0 0;
  text-align: center;
`

export const FooterText = styled.p`
  margin: 0;
  font-size: 14px;
  color: #d1d5db;
`

export const SignupLink = styled.a`
  color: #00beff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;

  &:hover {
    color: #0099cc;
    text-decoration: underline;
  }
`
