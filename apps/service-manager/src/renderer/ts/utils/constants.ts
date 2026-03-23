/**
 * 공통 상수 정의
 */

// 탭 이름
export const TABS = {
  SERVICES: 'services',
  PRISMA: 'prisma',
  ENV: 'env',
  PACKAGES: 'packages',
  LOGS: 'logs',
} as const

// 탭 한글 이름 매핑
export const TAB_LABELS: Record<string, string> = {
  [TABS.SERVICES]: '서비스',
  [TABS.PRISMA]: 'Prisma',
  [TABS.ENV]: '환경 변수',
  [TABS.LOGS]: '로그',
  [TABS.PACKAGES]: '패키지',
}

// 서비스 상태
export const SERVICE_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
} as const

// Prisma 서브탭
export const PRISMA_SUBTABS = {
  OVERVIEW: 'overview',
  SCHEMA: 'schema',
  MIGRATION: 'migration',
  STUDIO: 'studio',
  SEED: 'seed',
  HISTORY: 'history',
} as const

// Prisma 서브탭 한글 이름 매핑
export const PRISMA_SUBTAB_LABELS: Record<string, string> = {
  [PRISMA_SUBTABS.OVERVIEW]: '개요',
  [PRISMA_SUBTABS.SCHEMA]: '스키마',
  [PRISMA_SUBTABS.MIGRATION]: '마이그레이션',
  [PRISMA_SUBTABS.STUDIO]: 'Studio',
  [PRISMA_SUBTABS.SEED]: 'Seed',
  [PRISMA_SUBTABS.HISTORY]: '히스토리',
}

// 타이밍 상수
export const TIMING = {
  INITIAL_LOAD_DELAY: 500,
  STATUS_UPDATE_INTERVAL: 3000,
  STATUS_REFRESH_DELAY: 2000,
  UI_RESTORE_DELAY: 2500,
  TAB_LOAD_DELAY: 100,
  COPY_FEEDBACK_DURATION: 2000,
} as const

// 콘솔 로그
export const CONSOLE = {
  MAX_LOGS: 100,
} as const

// 환경 변수 키 매핑
export const ENV_KEYS = {
  MYSQL_PORT: 'MYSQL_PORT',
  NGINX_HTTP_PORT: 'NGINX_HTTP_PORT',
  NGINX_HTTPS_PORT: 'NGINX_HTTPS_PORT',
  API_PORT: 'API_PORT',
  WEB_PORT: 'WEB_PORT',
  DOMAIN_NAME: 'DOMAIN_NAME',
} as const
