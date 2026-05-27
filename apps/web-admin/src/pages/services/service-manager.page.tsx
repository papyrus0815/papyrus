import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaDocker,
  FaDatabase,
  FaServer,
  FaRocket,
  FaPlay,
  FaStop,
  FaSync,
  FaFileAlt,
} from 'react-icons/fa'
import { ToastProvider, useToast } from '@/shared/ui/toast'
import { Z_INDEX, OVERLAY_STYLES } from '@/shared/styles/z-index'

// 타입 정의
interface ServiceStatus {
  docker: {
    isInstalled: boolean
    isRunning: boolean
    containers: {
      mysql: boolean
      nginx: boolean
    }
  }
  api: {
    isRunning: boolean
    port: number
    healthCheckUrl: string
  }
  allReady: boolean
}

function ServiceManagerPageContent() {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState('')
  const { showToast } = useToast()

  // 서비스 상태 조회
  const fetchStatus = async () => {
    try {
      const newStatus = await window.electron.service.getStatus()
      setStatus(newStatus)
    } catch (error) {
      showToast('error', '서비스 상태 조회 실패')
    }
  }

  // 초기 로드 및 3초마다 갱신
  useEffect(() => {
    fetchStatus()

    const interval = setInterval(() => {
      fetchStatus()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // 서비스 제어 함수들
  const handleStartAll = async () => {
    setLoading(true)
    showToast('info', '모든 서비스를 시작하는 중...')
    try {
      await window.electron.service.startAll()
      await fetchStatus()
      showToast('success', '모든 서비스가 시작되었습니다!')
    } catch (error) {
      showToast('error', '서비스 시작에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStopAll = async () => {
    setLoading(true)
    showToast('info', '모든 서비스를 중지하는 중...')
    try {
      await window.electron.service.stopAll()
      await fetchStatus()
      showToast('success', '모든 서비스가 중지되었습니다')
    } catch (error) {
      showToast('error', '서비스 중지에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleRestart = async () => {
    setLoading(true)
    showToast('info', '서비스를 재시작하는 중...')
    try {
      await window.electron.service.restart()
      await fetchStatus()
      showToast('success', '서비스가 재시작되었습니다!')
    } catch (error) {
      showToast('error', '서비스 재시작에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStartDocker = async () => {
    setLoading(true)
    showToast('info', 'Docker 컨테이너를 시작하는 중...')
    try {
      await window.electron.service.startDocker()
      await fetchStatus()
      showToast('success', 'Docker 컨테이너가 시작되었습니다!')
    } catch (error) {
      showToast('error', 'Docker 시작에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStopDocker = async () => {
    setLoading(true)
    showToast('info', 'Docker 컨테이너를 중지하는 중...')
    try {
      await window.electron.service.stopDocker()
      await fetchStatus()
      showToast('success', 'Docker 컨테이너가 중지되었습니다')
    } catch (error) {
      showToast('error', 'Docker 중지에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStartApi = async () => {
    setLoading(true)
    showToast('info', 'API 서버를 시작하는 중...')
    try {
      await window.electron.service.startApi()
      await fetchStatus()
      showToast('success', 'API 서버가 시작되었습니다!')
    } catch (error) {
      showToast('error', 'API 시작에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStopApi = async () => {
    setLoading(true)
    showToast('info', 'API 서버를 중지하는 중...')
    try {
      await window.electron.service.stopApi()
      await fetchStatus()
      showToast('success', 'API 서버가 중지되었습니다')
    } catch (error) {
      showToast('error', 'API 중지에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 로그 조회
  const handleViewLog = async (service: string) => {
    setSelectedLog(service)
    setLogContent('로그를 불러오는 중...')

    try {
      let logs = ''
      if (service === 'mysql') {
        logs = await window.electron.service.getMySQLLogs(100)
      } else if (service === 'nginx') {
        logs = await window.electron.service.getContainerLogs(
          'papyrus-nginx',
          100,
        )
      } else if (service === 'api') {
        logs = await window.electron.service.getApiLogs(100)
      }
      setLogContent(logs || '로그가 없습니다.')
    } catch (error: any) {
      setLogContent(`로그 조회 실패: ${error.message}`)
    }
  }

  if (!status) {
    return (
      <Container>
        <LoadingSpinner>
          <FaSync className="spin" />
          <p>서비스 상태를 확인하는 중...</p>
        </LoadingSpinner>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>
          <FaRocket /> Papyrus 서비스 관리
        </Title>
        <StatusBadge $isReady={status.allReady}>
          {status.allReady ? '✅ 모든 서비스 정상' : '⚠️ 일부 서비스 중지됨'}
        </StatusBadge>
      </Header>

      <GlobalControls>
        <ControlButton
          onClick={handleStartAll}
          disabled={loading || status.allReady}
        >
          <FaPlay /> 모두 시작
        </ControlButton>
        <ControlButton
          onClick={handleStopAll}
          disabled={loading || !status.api.isRunning}
        >
          <FaStop /> 모두 중지
        </ControlButton>
        <ControlButton
          onClick={handleRestart}
          disabled={loading || !status.allReady}
        >
          <FaSync /> 모두 재시작
        </ControlButton>
      </GlobalControls>

      <ServicesGrid>
        {/* Docker Desktop */}
        <ServiceCard>
          <ServiceHeader>
            <ServiceIcon>
              <FaDocker size={32} color="#2496ed" />
            </ServiceIcon>
            <div>
              <ServiceName>Docker Desktop</ServiceName>
              <ServiceDescription>컨테이너 런타임</ServiceDescription>
            </div>
            <ServiceStatus $isRunning={status.docker.isRunning}>
              {status.docker.isRunning ? '● 실행 중' : '○ 중지됨'}
            </ServiceStatus>
          </ServiceHeader>
          <ServiceActions>
            {!status.docker.isInstalled && (
              <InfoText>Docker가 설치되지 않았습니다</InfoText>
            )}
          </ServiceActions>
        </ServiceCard>

        {/* MySQL */}
        <ServiceCard>
          <ServiceHeader>
            <ServiceIcon>
              <FaDatabase size={32} color="#00758f" />
            </ServiceIcon>
            <div>
              <ServiceName>MySQL Database</ServiceName>
              <ServiceDescription>데이터베이스 서버</ServiceDescription>
            </div>
            <ServiceStatus $isRunning={status.docker.containers.mysql}>
              {status.docker.containers.mysql ? '● 실행 중' : '○ 중지됨'}
            </ServiceStatus>
          </ServiceHeader>
          <ServiceActions>
            <ActionButton
              onClick={handleStartDocker}
              disabled={loading || status.docker.containers.mysql}
            >
              <FaPlay /> 시작
            </ActionButton>
            <ActionButton
              onClick={handleStopDocker}
              disabled={loading || !status.docker.containers.mysql}
            >
              <FaStop /> 중지
            </ActionButton>
            <ActionButton onClick={() => handleViewLog('mysql')}>
              <FaFileAlt /> 로그
            </ActionButton>
          </ServiceActions>
        </ServiceCard>

        {/* Nginx */}
        <ServiceCard>
          <ServiceHeader>
            <ServiceIcon>
              <FaServer size={32} color="#009639" />
            </ServiceIcon>
            <div>
              <ServiceName>Nginx Server</ServiceName>
              <ServiceDescription>웹 서버</ServiceDescription>
            </div>
            <ServiceStatus $isRunning={status.docker.containers.nginx}>
              {status.docker.containers.nginx ? '● 실행 중' : '○ 중지됨'}
            </ServiceStatus>
          </ServiceHeader>
          <ServiceActions>
            <ActionButton
              onClick={handleStartDocker}
              disabled={loading || status.docker.containers.nginx}
            >
              <FaPlay /> 시작
            </ActionButton>
            <ActionButton
              onClick={handleStopDocker}
              disabled={loading || !status.docker.containers.nginx}
            >
              <FaStop /> 중지
            </ActionButton>
            <ActionButton onClick={() => handleViewLog('nginx')}>
              <FaFileAlt /> 로그
            </ActionButton>
          </ServiceActions>
        </ServiceCard>

        {/* API Server */}
        <ServiceCard>
          <ServiceHeader>
            <ServiceIcon>
              <FaRocket size={32} color="#e535ab" />
            </ServiceIcon>
            <div>
              <ServiceName>Papyrus API</ServiceName>
              <ServiceDescription>
                NestJS API (포트: {status.api.port})
              </ServiceDescription>
            </div>
            <ServiceStatus $isRunning={status.api.isRunning}>
              {status.api.isRunning ? '● 실행 중' : '○ 중지됨'}
            </ServiceStatus>
          </ServiceHeader>
          <ServiceActions>
            <ActionButton
              onClick={handleStartApi}
              disabled={loading || status.api.isRunning}
            >
              <FaPlay /> 시작
            </ActionButton>
            <ActionButton
              onClick={handleStopApi}
              disabled={loading || !status.api.isRunning}
            >
              <FaStop /> 중지
            </ActionButton>
            <ActionButton onClick={() => handleViewLog('api')}>
              <FaFileAlt /> 로그
            </ActionButton>
          </ServiceActions>
        </ServiceCard>
      </ServicesGrid>

      {/* 로그 뷰어 모달 */}
      <AnimatePresence>
        {selectedLog && (
          <LogModal
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
          >
            <LogContent
              as={motion.div}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LogHeader>
                <LogTitle>
                  <FaFileAlt /> {selectedLog.toUpperCase()} 로그
                </LogTitle>
                <CloseButton onClick={() => setSelectedLog(null)}>
                  ✕
                </CloseButton>
              </LogHeader>
              <LogBody>{logContent}</LogBody>
            </LogContent>
          </LogModal>
        )}
      </AnimatePresence>
    </Container>
  )
}

// 메인 export: ToastProvider로 래핑
export function ServiceManagerPage() {
  return (
    <ToastProvider>
      <ServiceManagerPageContent />
    </ToastProvider>
  )
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  color: #e0e0e0;
  padding: calc(var(--header-height, 64px) + 2rem) 2rem 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;

  .spin {
    animation: spin 2s linear infinite;
    font-size: 3rem;
    color: #4a9eff;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: #fff;
`

const StatusBadge = styled.div<{ $isReady: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${(props) => (props.$isReady ? '#10b981' : '#f59e0b')};
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
`

const GlobalControls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const ServiceCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  }
`

const ServiceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`

const ServiceIcon = styled.div`
  flex-shrink: 0;
`

const ServiceName = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
`

const ServiceDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #9ca3af;
`

const ServiceStatus = styled.div<{ $isRunning: boolean }>`
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${(props) => (props.$isRunning ? '#10b981' : '#6b7280')};
  background: ${(props) =>
    props.$isRunning ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
`

const ServiceActions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.85rem;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const InfoText = styled.p`
  color: #f59e0b;
  font-size: 0.85rem;
  margin: 0;
`

const LogModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  padding: 2rem;
`

const LogContent = styled.div`
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const LogTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`

const LogBody = styled.pre`
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #e0e0e0;
  background: #0a0a0f;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
`
