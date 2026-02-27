import { pathKeys } from '@/shared/router'

/**
 * 알림 ownerType에 해당하는 리스트 페이지 경로 반환.
 * 해당하는 경로가 없으면 null.
 */
export function getNotificationListPath(ownerType: string | undefined): string | null {
  if (!ownerType) return null
  switch (ownerType) {
    case 'PERSON':
      return pathKeys.persons.root()
    case 'COUNTRY':
    case 'HISTORICAL_COUNTRY':
    case 'ADMINISTRATION_DEPARTMENT':
      return pathKeys.history.country()
    case 'EVENT':
      return pathKeys.events.root()
    default:
      return null
  }
}
