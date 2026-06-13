// ============================================
// Mock Data Exports
// ============================================

// Types
export * from './types'

// Administrative Data
export * from './administrative.mock'

// Government Organization Data
export * from './government.mock'

// History Data
export * from './history-types'
export * from './history.mock'

// HistoricalEvent는 './types'(행정조직용)와 './history-types'(역사 사건용) 양쪽에 존재 —
// 역사 사건용을 명시 재수출하여 모호성 제거
export type { HistoricalEvent } from './history-types'

