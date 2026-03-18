/**
 * event-form 위젯 유틸 re-export
 * pages 레이어에 있던 유틸을 위젯 레이어로 끌어올립니다.
 */
export {
  getImageUrl,
  getApiHost,
  formatDateForDisplay,
  calculateDaysDifference,
  getDateError,
  mapCategoryNameToType,
} from '@/pages/events/utils/event-create.utils'

export {
  formatDateRange,
  formatDateWithPrecision,
  formatTimelineDate,
  formatCompactNumber,
  getCenturyFromDate,
  formatCenturyLabel,
  formatCenturyRange,
} from '@/pages/events/utils/events.utils'

export type { DatePrecision } from '@/pages/events/utils/events.utils'
