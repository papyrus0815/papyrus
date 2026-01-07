/**
 * App Manager - 애플리케이션 초기화 및 전역 상태(상태 폴링, 콘솔 로그) 관리
 */
// 모든 모듈을 먼저 import하여 초기화
import './env.js'
import './logs.js'
import './nestia.js'
import './packages.js'
import './prisma.js'
import './service.js'
import './ui.js'
import { CONSOLE, TABS, TIMING } from './utils/constants.js'
import { getElementById, setElementText } from './utils/dom.js'

// 전역 상태
let consoleLogBuffer: string[] = []

/**
 * 앱 초기화 함수
 */
function initApp() {
  console.log('🏛️ Papyrus Manager 초기화 시작...')

  // 1. 콘솔 로그 리스너 등록
  if (window.electronAPI && window.electronAPI.onConsoleLog) {
    window.electronAPI.onConsoleLog((log) => {
      handleConsoleLog(log)
    })
  }

  // 2. 초기 화면 설정 (서비스 탭)
  if (typeof window.UI !== 'undefined' && window.UI.switchTab) {
    window.UI.switchTab(TABS.SERVICES)
  }

  // 3. 초기 데이터 로드 (약간의 지연을 두어 안정적으로 로드)
  setTimeout(() => {
    updateStatus() // 전체 상태 확인

    // 패키지 목록도 미리 로드해두면 좋습니다
    if (typeof window.loadInstalledPackages === 'function') {
      window.loadInstalledPackages()
    }
  }, TIMING.INITIAL_LOAD_DELAY)

  // 4. 상태 폴링 시작 (주기적으로 상태 갱신)
  setInterval(updateStatus, TIMING.STATUS_UPDATE_INTERVAL)

  console.log('✅ 앱 초기화 완료')
}

/**
 * 실시간 콘솔 로그 처리 로직
 */
function handleConsoleLog(log: string) {
  const time = new Date().toLocaleTimeString()
  consoleLogBuffer.push(`[${time}] ${log}`)

  // 최대 로그 개수 유지
  if (consoleLogBuffer.length > CONSOLE.MAX_LOGS) {
    consoleLogBuffer.shift()
  }

  updateConsoleOutput()
}

/**
 * 콘솔 로그 화면 렌더링
 */
function updateConsoleOutput(): void {
  const consoleOutput = getElementById<HTMLElement>('consoleOutput')
  if (consoleOutput) {
    setElementText('consoleOutput', consoleLogBuffer.join('\n'))
    consoleOutput.scrollTop = consoleOutput.scrollHeight
  }
}

/**
 * 콘솔 로그 지우기
 */
function clearConsoleLog(): void {
  consoleLogBuffer = []
  updateConsoleOutput()
}

/**
 * 전체 시스템 상태 업데이트 (Docker, DB, API 서버 등)
 */
async function updateStatus(): Promise<void> {
  try {
    if (!window.electronAPI?.getStatus) return

    // Electron 메인 프로세스로부터 전체 상태 가져오기
    const status = await window.electronAPI.getStatus()

    // 전역 변수에 저장하여 다른 파일에서 공유
    window.cachedStatus = status

    // 서비스 목록 화면 갱신
    if (typeof window.renderServices === 'function') {
      window.renderServices()
    }

    // Prisma 관련 상태(Overview 등)도 갱신이 필요하면 호출
    if (typeof window.refreshPrismaStatus === 'function') {
      window.refreshPrismaStatus()
    }
  } catch (error) {
    console.error('⚠️ 상태 업데이트 실패:', error)
  }
}

/**
 * 개발자 도구 열기 유틸리티
 */
function openDevTools(): void {
  if (window.electronAPI?.openDevTools) {
    window.electronAPI.openDevTools()
  } else {
    alert('개발자 도구를 열 수 없습니다.')
  }
}

// 🌐 전역 등록
window.initApp = initApp
window.updateStatus = updateStatus
window.clearConsoleLog = clearConsoleLog
window.openDevTools = openDevTools

// 🚀 페이지 로드 시 앱 시작
window.onload = initApp
