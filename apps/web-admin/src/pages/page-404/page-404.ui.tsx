import React, { useState, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import {
  BACKGROUND_IMAGES,
  BACKGROUND_CHANGE_INTERVAL,
} from '@/shared/constants/background-images'

// --- 키프레임 애니메이션 ---
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
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

  /* 그라데이션 테두리를 위한 가상 요소 */
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
    transform: translateY(-2px);
    border-color: rgba(0, 190, 255, 0.3);
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.2);
  }
`

const Container = styled.div<{ $bgImage: string }>`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem;
  /* 로그인 페이지와 동일한 배경 이미지 적용 */
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  animation: ${fadeIn} 0.6s ease-out;

  /* 배경 이미지 위에 어두운 오버레이 추가 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
`

const Title = styled.h1`
  font-size: 4rem;
  color: #ef4444;
  margin-bottom: 1rem;
  animation: ${pulse} 2s ease-in-out infinite;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
`

const Message = styled.p`
  font-size: 1.2rem;
  color: #d1d5db;
  margin-bottom: 2rem;
  animation: ${slideInUp} 0.8s ease-out 0.2s both;
`

const BackButton = styled.button`
  ${liquidGlassEffect}
  padding: 12px 24px;
  color: #f8f9fa;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  animation: ${slideInUp} 0.8s ease-out 0.4s both;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 190, 255, 0.5);
  }
`

export default function Page404() {
  const navigate = useNavigate()

  // 현재 배경 이미지 인덱스
  const [bgIndex, setBgIndex] = useState(() =>
    Math.floor(Math.random() * BACKGROUND_IMAGES.length),
  )

  // 배경 이미지 자동 변경
  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length)
    }, BACKGROUND_CHANGE_INTERVAL)

    return () => clearInterval(timer)
  }, [BACKGROUND_IMAGES.length])

  return (
    <Container $bgImage={BACKGROUND_IMAGES[bgIndex]}>
      <Title>404</Title>
      <Message>페이지를 찾을 수 없습니다.</Message>
      <BackButton onClick={() => navigate('/')}>홈으로 돌아가기</BackButton>
    </Container>
  )
}
