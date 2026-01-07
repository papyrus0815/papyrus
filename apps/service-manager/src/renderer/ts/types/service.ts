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
    }
    webAdminServer?: {
      isRunning?: boolean
    }
    webUserServer?: {
      isRunning?: boolean
    }
  }
}

