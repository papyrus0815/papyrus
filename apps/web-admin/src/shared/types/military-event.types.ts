/**
 * 사건 군사 정보 — **작전 정보만** 남았다.
 *
 * 진영·참전국·사상자는 정본이 바뀌었다(docs/event-detail-data-foundation.md D1·D3):
 * - 진영 = EventSide (`@/shared/api/event-sides`), 소속 = 참여국 줄의 sideId
 * - 병력·사상자 = 측정값 Observation (`@/shared/api/evidence`)
 * 서버 검증이 화이트리스트(forbidNonWhitelisted)라 옛 필드를 보내면 400이 난다.
 */

// ========================
// Enums
// ========================

export enum ConflictType {
  BATTLE = 'BATTLE',
  WAR = 'WAR',
  SIEGE = 'SIEGE',
  CAMPAIGN = 'CAMPAIGN',
  SKIRMISH = 'SKIRMISH',
}

export enum CombatType {
  LAND = 'LAND',
  NAVAL = 'NAVAL',
  AIR = 'AIR',
  AMPHIBIOUS = 'AMPHIBIOUS',
  COMBINED = 'COMBINED',
}

// ========================
// Military Details
// ========================

export interface MilitaryDetails {
  conflictType?: ConflictType
  combatTypes?: CombatType[]
  objective?: string
  tactics?: string
  strategy?: string
  outcome?: string
  territoryChanges?: string
  treaty?: string
  strategicImpact?: string
}

export interface MilitaryEvent {
  /** 작전 정보 — null이면 삭제 */
  militaryDetails?: MilitaryDetails | null
}
