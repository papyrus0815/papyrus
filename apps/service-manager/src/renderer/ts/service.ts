/**
 * Services Manager - 서비스 데이터 관리 및 제어 로직
 */
import type {
  Service,
  ServiceStatus,
  ServiceStatusMap,
} from './types/service.js'
import { SERVICE_STATUS, TIMING } from './utils/constants.js'
import { getElementById, setButtonDisabled } from './utils/dom.js'
import { handleApiResult, handleError } from './utils/error-handler.js'

// 서비스 목록 데이터 정의
const services: Service[] = [
  {
    id: 'docker',
    name: 'Docker Desktop',
    icon: '🐳',
    type: 'docker',
    canControl: true,
  },
  {
    id: 'mysql',
    name: 'MySQL Database',
    icon: '🗄️',
    type: 'container',
    port: 3307,
    canControl: false,
  },
  {
    id: 'nginx',
    name: 'Nginx Proxy',
    icon: '🌐',
    type: 'container',
    port: 443,
    canControl: false,
  },
  {
    id: 'api',
    name: 'API Server',
    icon: '⚡',
    type: 'api',
    port: 8000,
    canControl: true,
  },
  {
    id: 'web-admin',
    name: '관리자 앱',
    icon: '🔧',
    type: 'web-admin',
    port: 3000,
    canControl: true,
    url: 'https://app.civilization.zone',
  },
  {
    id: 'web-user',
    name: '사용자 앱',
    icon: '👥',
    type: 'web-user',
    port: 4200,
    canControl: true,
    url: 'https://user.civilization.zone',
  },
]

/**
 * 서비스 목록을 화면에 렌더링하는 함수
 */
function renderServices(): void {
  const servicesList = getElementById<HTMLElement>('servicesList')
  if (!servicesList) return

  servicesList.innerHTML = services
    .map((service) => {
      const status = getServiceStatus(service.id)
      const statusClass = status.toLowerCase()
      const canControl = service.canControl

      return `
        <div class="service-item">
          <div class="service-header">
            <div class="service-icon">${service.icon}</div>
            <div class="service-info">
              <div class="service-name">${service.name}</div>
              <div class="service-port">${service.port ? `포트: ${service.port}` : '시스템 서비스'}</div>
            </div>
            <div class="service-status ${statusClass}">${status}</div>
          </div>
          ${
            canControl
              ? `
            <div class="service-actions">
              <button class="btn btn-secondary btn-sm" onclick="handleStart('${service.id}')" id="start-${service.id}">시작</button>
              <button class="btn btn-secondary btn-sm" onclick="handleStop('${service.id}')" id="stop-${service.id}">중지</button>
              ${service.url ? `<button class="btn btn-secondary btn-sm" onclick="openUrl('${service.url}')">웹 열기</button>` : ''}
            </div>
          `
              : ''
          }
        </div>`
    })
    .join('')

  updateServiceButtons()
}

/**
 * Electron에서 받은 상태값을 텍스트로 변환
 */
function getServiceStatus(serviceId: string): ServiceStatus {
  if (!window.cachedStatus) return SERVICE_STATUS.STOPPED

  const status = window.cachedStatus as ServiceStatusMap

  switch (serviceId) {
    case 'docker':
      return status.docker?.isRunning &&
        (status.docker?.containers?.mysql || status.docker?.containers?.nginx)
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    case 'mysql':
      return status.docker?.containers?.mysql
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    case 'nginx':
      return status.docker?.containers?.nginx
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    case 'api':
      return status.papyrusServer?.apiServer?.isRunning
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    case 'web-admin':
      return status.papyrusServer?.webAdminServer?.isRunning
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    case 'web-user':
      return status.papyrusServer?.webUserServer?.isRunning
        ? SERVICE_STATUS.RUNNING
        : SERVICE_STATUS.STOPPED
    default:
      return SERVICE_STATUS.STOPPED
  }
}

/**
 * 서비스 상태에 따라 버튼 활성/비활성 처리
 */
function updateServiceButtons(): void {
  services.forEach((service) => {
    if (!service.canControl) return

    const status = getServiceStatus(service.id)
    const startBtnId = `start-${service.id}`
    const stopBtnId = `stop-${service.id}`

    if (status === SERVICE_STATUS.RUNNING) {
      setButtonDisabled(startBtnId, true)
      setButtonDisabled(stopBtnId, false)
    } else {
      setButtonDisabled(startBtnId, false)
      setButtonDisabled(stopBtnId, true)
    }
  })
}

/**
 * 서비스별 API 호출 매핑
 */
const SERVICE_API_MAP: Record<string, () => Promise<void>> = {
  docker: () => window.electronAPI.startDocker(),
  api: () => window.electronAPI.startApi(),
  'web-admin': () => window.electronAPI.startWebAdmin(),
  'web-user': () => window.electronAPI.startWebUser(),
}

/**
 * 서비스 시작 처리
 */
async function handleStart(serviceId: string): Promise<void> {
  console.log('🚀 Starting:', serviceId)
  const startBtnId = `start-${serviceId}`
  const stopBtnId = `stop-${serviceId}`

  try {
    // UI 로딩 상태 시작
    if (typeof window.UI !== 'undefined') {
      window.UI.setLoading(startBtnId, true, '시작 중...')
    }
    setButtonDisabled(stopBtnId, true)

    // 서비스별 API 호출
    const apiCall = SERVICE_API_MAP[serviceId]
    if (apiCall) {
      await apiCall()
    } else {
      throw new Error(`알 수 없는 서비스: ${serviceId}`)
    }

    // 상태 갱신 (지연)
    setTimeout(() => {
      if (typeof window.updateStatus === 'function') {
        window.updateStatus()
      }
    }, TIMING.STATUS_REFRESH_DELAY)
  } catch (error) {
    handleError(error, `${serviceId} 시작 실패`)
  } finally {
    // UI 복구 (지연)
    setTimeout(() => {
      if (typeof window.UI !== 'undefined') {
        window.UI.setLoading(startBtnId, false)
      }
      updateServiceButtons()
    }, TIMING.UI_RESTORE_DELAY)
  }
}

/**
 * 서비스 중지 API 호출 매핑
 */
const SERVICE_STOP_API_MAP: Record<string, () => Promise<void>> = {
  docker: () => window.electronAPI.stopDocker(),
  api: () => window.electronAPI.stopApi(),
  'web-admin': () => window.electronAPI.stopWebAdmin(),
  'web-user': () => window.electronAPI.stopWebUser(),
}

/**
 * 서비스 중지 처리
 */
async function handleStop(serviceId: string): Promise<void> {
  console.log('🛑 Stopping:', serviceId)
  const startBtnId = `start-${serviceId}`
  const stopBtnId = `stop-${serviceId}`

  try {
    // UI 로딩 상태 시작
    if (typeof window.UI !== 'undefined') {
      window.UI.setLoading(stopBtnId, true, '중지 중...')
    }
    setButtonDisabled(startBtnId, true)

    // 서비스별 API 호출
    const apiCall = SERVICE_STOP_API_MAP[serviceId]
    if (apiCall) {
      await apiCall()
    } else {
      throw new Error(`알 수 없는 서비스: ${serviceId}`)
    }

    // 상태 갱신 (지연)
    setTimeout(() => {
      if (typeof window.updateStatus === 'function') {
        window.updateStatus()
      }
    }, TIMING.STATUS_REFRESH_DELAY)
  } catch (error) {
    handleError(error, `${serviceId} 중지 실패`)
  } finally {
    // UI 복구 (지연)
    setTimeout(() => {
      if (typeof window.UI !== 'undefined') {
        window.UI.setLoading(stopBtnId, false)
      }
      updateServiceButtons()
    }, TIMING.UI_RESTORE_DELAY)
  }
}

/**
 * 외부 URL 열기
 */
function openUrl(url: string): void {
  window.electronAPI.openExternal(url)
}

/**
 * Docker 완전 초기화
 */
async function resetDocker(): Promise<void> {
  const confirmed = confirm(
    '⚠️ Docker 완전 초기화\n\n' +
      '다음 항목이 모두 삭제됩니다:\n' +
      '• 모든 컨테이너 (MySQL, Nginx)\n' +
      '• 모든 볼륨 (데이터베이스 데이터)\n' +
      '• 모든 이미지\n' +
      '• 네트워크\n\n' +
      '⚠️ 이 작업은 되돌릴 수 없습니다!\n\n' +
      '계속하시겠습니까?',
  )

  if (!confirmed) return

  const button = getElementById<HTMLButtonElement>('resetDockerButton')
  if (!button) return

  const originalText = button.innerHTML

  try {
    setButtonDisabled('resetDockerButton', true)
    button.innerHTML = '<span class="spinner"></span> 초기화 중...'

    console.log('🗑️ Docker 초기화 시작...')
    const result = await window.electronAPI.resetDocker()

    handleApiResult(result, '✅ Docker 초기화 완료', '❌ Docker 초기화 실패')

    // 상태 갱신
    if (typeof window.updateStatus === 'function') {
      await window.updateStatus()
    }
  } catch (error) {
    handleError(error, 'Docker 초기화 실패')
  } finally {
    setButtonDisabled('resetDockerButton', false)
    button.innerHTML = originalText
  }
}

// 🌐 HTML에서 호출할 수 있도록 전역 window 객체에 등록
window.renderServices = renderServices
window.getServiceStatus = getServiceStatus
window.updateServiceButtons = updateServiceButtons
window.handleStart = handleStart
window.handleStop = handleStop
window.openUrl = openUrl
window.resetDocker = resetDocker

window.resetDocker = resetDocker
