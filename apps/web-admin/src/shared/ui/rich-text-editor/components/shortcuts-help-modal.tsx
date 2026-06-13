/**
 * 리치 텍스트 에디터 키보드 단축키 도움말 모달.
 * 정적 표현 컴포넌트 — visible/onClose에만 의존하므로 React.memo로 분리해
 * 에디터 본문 리렌더와 무관하게 둔다. (원본: rich-text-editor.tsx 인라인 JSX 추출)
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { scrollbarMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: ${Z_INDEX.RICH_TEXT_EDITOR_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.95)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 20px;
  width: 92%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
`

const Header = styled.div`
  padding: 18px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseButton = styled.button`
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const Content = styled.div`
  overflow-y: auto;
  padding: 16px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  ${scrollbarMixin}
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 2px;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  & > span:last-child {
    margin-left: auto;
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 500;
  }

  & kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
    font: 600 11.5px/1
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }
`

interface ShortcutsHelpModalProps {
  visible: boolean
  onClose: () => void
}

function ShortcutsHelpModalComponent({
  visible,
  onClose,
}: ShortcutsHelpModalProps) {
  if (!visible || typeof document === 'undefined') return null
  return createPortal(
    <Overlay onClick={onClose}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <Header>
          <Title>키보드 단축키</Title>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseButton>
        </Header>
        <Content>
          <Section>
            <SectionTitle>서식</SectionTitle>
            <Row>
              <kbd>Ctrl/⌘</kbd> + <kbd>B</kbd>
              <span>굵게</span>
            </Row>
            <Row>
              <kbd>Ctrl/⌘</kbd> + <kbd>I</kbd>
              <span>기울임</span>
            </Row>
            <Row>
              <kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd>
              <span>실행 취소</span>
            </Row>
            <Row>
              <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>
              <span>다시 실행</span>
            </Row>
          </Section>
          <Section>
            <SectionTitle>마크다운(줄 시작)</SectionTitle>
            <Row>
              <kbd>*</kbd>/<kbd>-</kbd> + <kbd>Space</kbd>
              <span>순서 없는 목록</span>
            </Row>
            <Row>
              <kbd>1.</kbd> + <kbd>Space</kbd>
              <span>순서 있는 목록</span>
            </Row>
            <Row>
              <kbd>#</kbd>/<kbd>##</kbd>/<kbd>###</kbd> + <kbd>Space</kbd>
              <span>제목 1·2·3</span>
            </Row>
            <Row>
              <kbd>&gt;</kbd> + <kbd>Space</kbd>
              <span>인용</span>
            </Row>
            <Row>
              <kbd>---</kbd> + <kbd>Space</kbd>
              <span>수평선</span>
            </Row>
            <Row>
              <span style={{ color: '#94a3b8' }}>http://… </span>
              <span>+ Space → 자동 링크</span>
            </Row>
          </Section>
          <Section>
            <SectionTitle>목록·표</SectionTitle>
            <Row>
              <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>
              <span>들여쓰기 / 내어쓰기</span>
            </Row>
            <Row>
              <kbd>Enter</kbd>
              <span>빈 항목에서 → 목록 종료</span>
            </Row>
            <Row>
              <kbd>Backspace</kbd>
              <span>빈/시작 항목에서 → 목록 종료</span>
            </Row>
          </Section>
          <Section>
            <SectionTitle>이미지</SectionTitle>
            <Row>
              <kbd>Tab</kbd>
              <span>이미지 포커스</span>
            </Row>
            <Row>
              <kbd>Enter</kbd>
              <span>이미지 툴바 열기</span>
            </Row>
            <Row>
              <kbd>Delete</kbd>/<kbd>Backspace</kbd>
              <span>선택한 이미지 삭제</span>
            </Row>
            <Row>
              <kbd>Esc</kbd>
              <span>선택 해제</span>
            </Row>
          </Section>
          <Section>
            <SectionTitle>이 도움말</SectionTitle>
            <Row>
              <kbd>Ctrl/⌘</kbd> + <kbd>/</kbd>
              <span>열기/닫기</span>
            </Row>
          </Section>
        </Content>
      </ModalCard>
    </Overlay>,
    document.body,
  )
}

export const ShortcutsHelpModal = React.memo(ShortcutsHelpModalComponent)
