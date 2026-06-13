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
  ADMINISTRATIVE_DIVISION: '행정구역',
}

export function getNotificationEntityTypeLabel(ownerType: string | undefined): string | null {
  if (!ownerType) return null
  return ENTITY_TYPE_LABELS[ownerType] ?? null
}

/**
 * 알림 subResourceType(API NotificationSubResource) → 한글 라벨.
 * 인물 하위 항목(전기·경력 등) 변경일 때 보조 칩으로 노출. (서버 SUB_RESOURCE_LABEL과 동기화)
 */
const SUB_RESOURCE_LABELS: Record<string, string> = {
  BIOGRAPHY: '전기',
  CAREER: '경력',
  EDUCATION: '학력',
  AWARD: '수상',
}

export function getNotificationSubResourceLabel(subResourceType: string | undefined): string | null {
  if (!subResourceType) return null
  return SUB_RESOURCE_LABELS[subResourceType] ?? null
}
