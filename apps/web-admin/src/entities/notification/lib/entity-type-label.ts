/**
 * 알림 ownerType(API AggregateType) → 사용자에게 보여줄 한글 라벨
 * 국가면 "국가", 인물이면 "인물" 등
 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  PERSON: '인물',
  COUNTRY: '국가',
  HISTORICAL_COUNTRY: '국가',
  EVENT: '사건',
  ORGANIZATION: '조직',
  POLITICAL_PARTY: '정당',
  ADMINISTRATION_DEPARTMENT: '행정부처',
}

export function getNotificationEntityTypeLabel(ownerType: string | undefined): string | null {
  if (!ownerType) return null
  return ENTITY_TYPE_LABELS[ownerType] ?? null
}
