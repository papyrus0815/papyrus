/**
 * 서비스 관련 타입 정의
 */

export interface Service {
  id: string
  name: string
  icon: string
  type: 'docker' | 'container' | 'api' | 'web-admin' | 'web-user'
  port?: number
  canControl: boolean
  url?: string
}

export type ServiceStatus = 'running' | 'stopped'

export interface ServiceStatusMap {
  /** 로컬 네트워크 IP (예: 192.168.0.10) */
  localIp?: string
  docker?: {
    isRunning?: boolean
    containers?: {
      mysql?: boolean
      nginx?: boolean
    }
  }
  papyrusServer?: {
    apiServer?: {
      isRunning?: boolean
      port?: number
      healthCheckUrl?: string
    }
    webAdminServer?: {
      isRunning?: boolean
      port?: number
      url?: string
    }
    webUserServer?: {
      isRunning?: boolean
      port?: number
      url?: string
    }
  }
}

