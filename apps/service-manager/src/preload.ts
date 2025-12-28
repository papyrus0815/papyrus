import { contextBridge, ipcRenderer } from 'electron'

// Electron API를 안전하게 렌더러 프로세스에 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 전체 상태 조회
  getStatus: () => ipcRenderer.invoke('service:getStatus'),

  // 전체 제어
  startAll: () => ipcRenderer.invoke('service:startAll'),
  stopAll: () => ipcRenderer.invoke('service:stopAll'),

  // Docker 제어
  startDocker: () => ipcRenderer.invoke('service:startDocker'),
  stopDocker: () => ipcRenderer.invoke('service:stopDocker'),

  // API 서버 제어
  startApi: () => ipcRenderer.invoke('service:startApi'),
  stopApi: () => ipcRenderer.invoke('service:stopApi'),

  // 관리자 웹 서버 제어
  startWebAdmin: () => ipcRenderer.invoke('service:startWebAdmin'),
  stopWebAdmin: () => ipcRenderer.invoke('service:stopWebAdmin'),

  // 사용자 웹 서버 제어
  startWebUser: () => ipcRenderer.invoke('service:startWebUser'),
  stopWebUser: () => ipcRenderer.invoke('service:stopWebUser'),

  // 로그 조회
  getContainerLogs: (containerName: string) =>
    ipcRenderer.invoke('service:getContainerLogs', containerName),
  getApiLogs: () => ipcRenderer.invoke('service:getApiLogs'),
  getWebAdminLogs: () => ipcRenderer.invoke('service:getWebAdminLogs'),
  getWebUserLogs: () => ipcRenderer.invoke('service:getWebUserLogs'),

  // 실시간 콘솔 로그
  onConsoleLog: (callback: (log: string) => void) => {
    ipcRenderer.on('console:log', (_event, log) => callback(log))
  },

  // 웹 열기
  openWeb: () => ipcRenderer.invoke('service:openWeb'),
  openExternal: (url: string) => ipcRenderer.invoke('service:openExternal', url),

  // 포트 체크
  checkPort: (port: number) => ipcRenderer.invoke('service:checkPort', port),

  // API 빌드
  buildApi: () => ipcRenderer.invoke('service:buildApi'),

  // SDK 빌드
  buildSdk: () => ipcRenderer.invoke('service:buildSdk'),

  // 데이터베이스 관리
  runMigration: () => ipcRenderer.invoke('service:runMigration'),
  runDeploy: () => ipcRenderer.invoke('service:runDeploy'),
  runGenerate: () => ipcRenderer.invoke('service:runGenerate'),
  runSeed: () => ipcRenderer.invoke('service:runSeed'),
  openPrismaStudio: () => ipcRenderer.invoke('service:openPrismaStudio'),
})

// TypeScript 타입 정의
declare global {
  interface Window {
    electronAPI: {
      getStatus: () => Promise<any>
      startAll: () => Promise<void>
      stopAll: () => Promise<void>
      startDocker: () => Promise<void>
      stopDocker: () => Promise<void>
      startApi: () => Promise<void>
      stopApi: () => Promise<void>
      startWebAdmin: () => Promise<void>
      stopWebAdmin: () => Promise<void>
      startWebUser: () => Promise<void>
      stopWebUser: () => Promise<void>
      getContainerLogs: (containerName: string) => Promise<string>
      getApiLogs: () => Promise<string>
      getWebAdminLogs: () => Promise<string>
      getWebUserLogs: () => Promise<string>
      onConsoleLog: (callback: (log: string) => void) => void
      openWeb: () => Promise<void>
      openExternal: (url: string) => Promise<void>
      checkPort: (port: number) => Promise<boolean>
      buildApi: () => Promise<boolean>
      buildSdk: () => Promise<boolean>
      runMigration: () => Promise<boolean>
      runDeploy: () => Promise<boolean>
      runGenerate: () => Promise<boolean>
      runSeed: () => Promise<boolean>
      openPrismaStudio: () => Promise<boolean>
    }
  }
}
