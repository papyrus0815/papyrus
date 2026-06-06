import { pathKeys } from '@/shared/router'

/**
 * 알림 대상으로 이동할 경로 반환.
 * recordId가 있으면 상세 페이지로, 없으면 해당 ownerType의 리스트 페이지로 폴백.
 * 해당하는 경로가 없으면 null.
 */
export function getNotificationTargetPath(
  ownerType: string | undefined,
  recordId?: string,
): string | null {
  if (!ownerType) return null
  switch (ownerType) {
    case 'PERSON':
      // 리스트(타임라인) 행 클릭과 동일한 상세 URL로 통일.
      return recordId ? pathKeys.personsTimelineDetail(recordId) : pathKeys.personsTimeline()
    case 'EVENT':
      return recordId ? pathKeys.events.detail(recordId) : pathKeys.events.root()
    case 'COUNTRY':
      return recordId ? pathKeys.countryDetail(recordId) : pathKeys.country()
    case 'HISTORICAL_COUNTRY':
    case 'ADMINISTRATION_DEPARTMENT':
      return pathKeys.country()
    default:
      return null
  }
}
