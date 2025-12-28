import styled from 'styled-components'

export const LoginContainer = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: transparent;
`

export const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(10px);
  gap: 1.5rem;
`

export const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  letter-spacing: 0.05em;
`

export const ContentContainer = styled.div`
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
`

export const LoginPanel = styled.div`
  position: relative;
  background: rgba(24, 24, 27, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  z-index: 1;

  /* 포커스 문제 해결 */
  pointer-events: auto;

  /* 모든 자식 요소에 pointer-events 활성화 */
  * {
    pointer-events: auto;
  }

  display: flex;
  flex-direction: column;
  gap: 2rem;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    max-width: 90%;
  }
`

export const SoundController = styled.div`
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }
`

export const SoundButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 1);
  }

  &:active {
    transform: scale(0.95);
  }
`

export const VolumeSlider = styled.input`
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  &::-moz-range-thumb:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    width: 80px;
  }
`
