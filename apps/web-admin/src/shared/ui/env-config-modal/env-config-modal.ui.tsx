import React from 'react'
import styled from 'styled-components'
import { Z_INDEX, OVERLAY_STYLES } from '@/shared/styles/z-index'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`

const Title = styled.h2`
  color: #dc2626;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Message = styled.p`
  color: #374151;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`

const CodeBlock = styled.pre`
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  overflow-x: auto;
  font-family: 'Asta Sans', sans-serif;
  font-size: 0.875rem;
  color: #1f2937;
`

const ActionButton = styled.button`
  background: #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 0.5rem;

  &:hover {
    background: #b91c1c;
  }
`

const SecondaryButton = styled.button`
  background: #6b7280;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #4b5563;
  }
`

interface EnvConfigModalProps {
  missingEnvKeys: string[]
  onClose?: () => void
  onReload?: () => void
}

export function EnvConfigModal({
  missingEnvKeys,
  onClose,
  onReload,
}: EnvConfigModalProps) {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <ModalOverlay>
      <ModalContent>
        <Title>⚠️ 환경 변수 설정 필요</Title>

        <Message>
          애플리케이션 실행에 필요한 환경 변수가 설정되지 않았습니다. 다음 환경
          변수들을 설정해주세요:
        </Message>

        <CodeBlock>
          {missingEnvKeys.map((key) => `${key}=your_value_here`).join('\n')}
        </CodeBlock>

        <Message>
          <strong>설정 방법:</strong>
          <br />
          1. <code>apps/web/.env</code> 파일을 생성하세요
          <br />
          2. 위의 환경 변수들을 추가하세요
          <br />
          3. 개발 서버를 재시작하세요
        </Message>

        <div>
          <ActionButton onClick={onReload || handleReload}>
            새로고침
          </ActionButton>
          {onClose && (
            <SecondaryButton onClick={onClose}>무시하고 계속</SecondaryButton>
          )}
        </div>
      </ModalContent>
    </ModalOverlay>
  )
}

export default EnvConfigModal
