/**
 * 리치 텍스트 에디터 이미지 설명(caption) 입력/편집 모달.
 * 상태(visible/value)·핸들러는 부모가 보유하고 props로 받는 표현 컴포넌트.
 * (원본: rich-text-editor.tsx 인라인 JSX 추출 — 동작 보존)
 *
 * 사운드: 오버레이·X 닫기는 무음(onCancel), 푸터 취소/확인 버튼만 playClickSound — 원본과 동일.
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.9)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(20px)' : 'none'};
  border-radius: 20px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseButton = styled.button`
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: #4f46e5;
  }
`

const Content = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
`

const ActionButton = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  ${({ $primary, theme }) =>
    $primary
      ? `
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
    &:hover {
      background: #4f46e5;
    }
  `
      : `
    background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border.default};
    &:hover {
      background: ${theme.colors.background.tertiary};
      color: ${theme.colors.text.primary};
    }
  `}
`

interface ImageCaptionModalProps {
  visible: boolean
  value: string
  /** true면 제목이 "편집", false면 "추가" */
  isEditing: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
  playClickSound: () => void
}

function ImageCaptionModalComponent({
  visible,
  value,
  isEditing,
  inputRef,
  onValueChange,
  onConfirm,
  onCancel,
  playClickSound,
}: ImageCaptionModalProps) {
  if (!visible || typeof document === 'undefined') return null
  return createPortal(
    <Overlay onClick={onCancel}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>{isEditing ? '이미지 설명 편집' : '이미지 설명 추가'}</Title>
          <CloseButton onClick={onCancel} aria-label="닫기">
            <FiX size={20} />
          </CloseButton>
        </Header>
        <Content>
          <Input
            ref={inputRef}
            type="text"
            placeholder="이미지 설명을 입력하세요 (선택사항)"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onConfirm()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
            }}
          />
        </Content>
        <Footer>
          <ActionButton
            onClick={() => {
              playClickSound()
              onCancel()
            }}
          >
            취소
          </ActionButton>
          <ActionButton
            $primary
            onClick={() => {
              playClickSound()
              onConfirm()
            }}
          >
            확인
          </ActionButton>
        </Footer>
      </ModalCard>
    </Overlay>,
    document.body,
  )
}

export const ImageCaptionModal = React.memo(ImageCaptionModalComponent)
