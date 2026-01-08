/**
 * Services Manager - 서비스 데이터 관리 및 제어 로직
 */
/// <reference path="../types/global.d.ts" />
import type {
  Service,
  ServiceStatus,
  ServiceStatusMap,
} from './types/service.js'
import { ENV_KEYS, SERVICE_STATUS, TIMING } from './utils/constants.js'
import { getElementById, setButtonDisabled } from './utils/dom.js'
import { handleApiResult, handleError } from './utils/error-handler.js'

// 환경 변수 캐시
let cachedEnvVariables: Record<string, string> | null = null

/**
 * 환경 변수 로드
 */
async function loadEnvVariables(): Promise<Record<string, string>> {
  if (cachedEnvVariables) {
    return cachedEnvVariables
  }

  try {
    const result = await window.electronAPI.env.read('env.development')
    if (result.success) {
      cachedEnvVariables = result.variables
      return cachedEnvVariables
    }
  } catch (error) {
    console.warn('⚠️ 환경 변수 로드 실패, 기본값 사용:', error)
  }

  // 환경 변수 로드 실패 시 빈 객체 반환 (기본값 사용)
  return {}
}

/**
 * 환경 변수에서 포트 번호 가져오기
 */
function getPortFromEnv(
  env: Record<string, string>,
  key: string,
): number | undefined {
  const value = env[key]
  if (!value) {
    console.warn(`⚠️ 환경 변수 ${key}가 설정되지 않았습니다`)
    return undefined
  }

  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(`⚠️ 환경 변수 ${key}의 값이 유효하지 않습니다: ${value}`)
    return undefined
  }

  return parsed
}

/**
 * 환경 변수에서 URL 생성
 */
function getUrlFromEnv(
  env: Record<string, string>,
  subdomain: string,
): string | undefined {
  // DOMAIN_NAME이 있으면 서브도메인과 결합하여 URL 생성
  const domainName = env[ENV_KEYS.DOMAIN_NAME]
  if (!domainName) {
    console.warn(`⚠️ 환경 변수 ${ENV_KEYS.DOMAIN_NAME}가 설정되지 않았습니다`)
    return undefined
  }

  // 도메인에서 서브도메인 추출 (예: app.civilization.zone -> civilization.zone)
  const baseDomain = domainName.replace(/^[^.]+\./, '')
  const fullDomain = `${subdomain}.${baseDomain}`
  return `https://${fullDomain}`
}

/**
 * 서비스 목록 생성 (환경 변수 기반)
 */
async function createServices(): Promise<Service[]> {
  const env = await loadEnvVariables()

  return [
    {
      id: 'docker',
      name: '도커',
      icon: '🐳',
      type: 'docker',
      canControl: true,
    },
    {
      id: 'mysql',
      name: 'MySQL Database',
      icon: '🗄️',
      type: 'container',
      port: getPortFromEnv(env, ENV_KEYS.MYSQL_PORT),
      canControl: false,
    },
    {
      id: 'nginx',
      name: 'Nginx Proxy',
      icon: '🌐',
      type: 'container',
      port: getPortFromEnv(env, ENV_KEYS.NGINX_HTTPS_PORT),
      canControl: false,
    },
    {
      id: 'api',
      name: 'API 서버',
      icon: '⚡',
      type: 'api',
      port: getPortFromEnv(env, ENV_KEYS.API_PORT),
      canControl: true,
    },
    {
      id: 'web-admin',
      name: '관리자 애플리케이션',
      icon: '🔧',
      type: 'web-admin',
      port: getPortFromEnv(env, ENV_KEYS.WEB_PORT),
      canControl: true,
      url: getUrlFromEnv(env, 'app'),
    },
    {
      id: 'web-user',
      name: '사용자 애플리케이션',
      icon: '👥',
      type: 'web-user',
      port: getPortFromEnv(env, ENV_KEYS.WEB_USER_PORT),
      canControl: true,
      url: getUrlFromEnv(env, 'user'),
    },
  ]
}

// 서비스 목록 (동적 생성)
let services: Service[] = []

/**
 * 서비스 목록을 화면에 렌더링하는 함수
 */
async function renderServices(): Promise<void> {
  const servicesList = getElementById<HTMLElement>('servicesList')
  if (!servicesList) return

  // 환경 변수에서 서비스 목록 동적 생성
  services = await createServices()

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
              <div class="service-port">${
                service.port
                  ? `포트: ${service.port}`
                  : service.type === 'docker'
                    ? '시스템 서비스'
                    : '포트: 미설정'
              }</div>
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
 * 환경 변수 캐시 초기화 (환경 변수 변경 시 호출)
 */
function clearEnvCache(): void {
  cachedEnvVariables = null
}

/**
 * 서비스 상태에 따라 버튼 활성/비활성 처리
 */
function updateServiceButtons(): void {
  // 서비스 목록이 아직 로드되지 않았으면 렌더링 먼저 실행
  if (services.length === 0) {
    renderServices().then(() => {
      updateServiceButtons()
    })
    return
  }

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
window.clearEnvCache = clearEnvCache
