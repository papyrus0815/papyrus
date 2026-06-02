/**
 * 이벤트 생성/수정 시 필요한 타입 변환 함수들
 * FSD: features/event-create/lib
 */
import {
  CombatType,
  ConflictType,
  MilitaryRelationType,
  SideLevel,
} from '@/shared/types/military-event.types'

/**
 * conflictType 변환 - 타입 가드 함수 사용 (타입 안전성 향상)
 */
export const toConflictType = (type: string | undefined): ConflictType => {
  const typeMap: Record<string, ConflictType> = {
    battle: ConflictType.BATTLE,
    war: ConflictType.WAR,
    siege: ConflictType.SIEGE,
    campaign: ConflictType.CAMPAIGN,
    skirmish: ConflictType.SKIRMISH,
  }
  return type && type in typeMap ? typeMap[type] : ConflictType.BATTLE
}

/**
 * combatTypes 변환 - 타입 가드 함수 사용 (타입 안전성 향상)
 */
export const toCombatType = (type: string): CombatType => {
  const combatMap: Record<string, CombatType> = {
    land: CombatType.LAND,
    naval: CombatType.NAVAL,
    air: CombatType.AIR,
    amphibious: CombatType.AMPHIBIOUS,
    combined: CombatType.COMBINED,
  }
  return type in combatMap ? combatMap[type] : CombatType.LAND
}

/**
 * SideLevel 변환 맵
 */
export const sideLevelMap: Record<string, 'COALITION' | 'COUNTRY' | 'FORCE'> = {
  coalition: 'COALITION',
  country: 'COUNTRY',
  force: 'FORCE',
}

/**
 * ParticipationType 변환 맵 (DTO 기준)
 */
export const participationMap: Record<string, string> = {
  full: 'MAIN',
  limited: 'LIMITED',
  indirect: 'SUPPORT',
  'non-combatant': 'OCCUPIED',
}

/**
 * RelationType 변환 맵
 */
export const relationTypeMap: Record<string, string> = {
  allied: 'ALLIED',
  cooperation: 'COOPERATION',
  'non-aggression': 'NON_AGGRESSION',
  neutral: 'NEUTRAL',
  enemy: 'ENEMY',
  puppet: 'PUPPET',
  occupied: 'OCCUPIED',
}

/**
 * 역변환: conflictType DTO → UI
 */
export const fromConflictTypeDto = (
  type: string,
): 'battle' | 'war' | 'siege' | 'campaign' | 'skirmish' => {
  const typeMap: Record<
    string,
    'battle' | 'war' | 'siege' | 'campaign' | 'skirmish'
  > = {
    BATTLE: 'battle',
    WAR: 'war',
    SIEGE: 'siege',
    CAMPAIGN: 'campaign',
    SKIRMISH: 'skirmish',
  }
  return (typeMap[type] || 'battle') as
    | 'battle'
    | 'war'
    | 'siege'
    | 'campaign'
    | 'skirmish'
}

/**
 * 역변환: combatTypes DTO → UI
 */
export const fromCombatTypeDto = (type: string): 'land' | 'naval' | 'air' => {
  const combatMap: Record<string, 'land' | 'naval' | 'air'> = {
    LAND: 'land',
    NAVAL: 'naval',
    AIR: 'air',
    AMPHIBIOUS: 'land',
    URBAN: 'land',
  }
  return combatMap[type] || 'land'
}

/**
 * 역변환: SideLevel DTO → UI
 */
export const fromSideLevelDto = (
  level: string | undefined,
): 'coalition' | 'country' | 'force' => {
  const sideLevelMap: Record<
    'COALITION' | 'COUNTRY' | 'FORCE',
    'coalition' | 'country' | 'force'
  > = {
    COALITION: 'coalition',
    COUNTRY: 'country',
    FORCE: 'force',
  }
  return (
    level && level in sideLevelMap
      ? sideLevelMap[level as keyof typeof sideLevelMap]
      : 'country'
  ) as 'coalition' | 'country' | 'force'
}

/**
 * 역변환: ParticipationType DTO → UI
 */
export const fromParticipationTypeDto = (
  type: string,
): 'full' | 'limited' | 'indirect' | 'non-combatant' => {
  const participationMap: Record<
    string,
    'full' | 'limited' | 'indirect' | 'non-combatant'
  > = {
    MAIN: 'full',
    SUPPORT: 'indirect',
    LIMITED: 'limited',
    OCCUPIED: 'non-combatant',
  }
  return participationMap[type] || 'full'
}

/**
 * 역변환: RelationType DTO → UI (relationTypeMap의 역방향)
 */
export const fromRelationTypeDto = (
  type: string | undefined,
):
  | 'allied'
  | 'cooperation'
  | 'non-aggression'
  | 'neutral'
  | 'enemy'
  | 'puppet'
  | 'occupied' => {
  const map: Record<
    string,
    | 'allied'
    | 'cooperation'
    | 'non-aggression'
    | 'neutral'
    | 'enemy'
    | 'puppet'
    | 'occupied'
  > = {
    ALLIED: 'allied',
    COOPERATION: 'cooperation',
    NON_AGGRESSION: 'non-aggression',
    NEUTRAL: 'neutral',
    ENEMY: 'enemy',
    PUPPET: 'puppet',
    OCCUPIED: 'occupied',
  }
  return (type && map[type]) || 'neutral'
}

/**
 * 카테고리명 매핑 (영문 → 한글)
 * @deprecated 더 이상 사용하지 않음. DB에서 직접 categoryId 사용
 */
export const categoryNameMap: Record<string, string> = {
  political: '정치',
  economic: '경제',
  military: '전쟁/군사',
  social: '사회',
  cultural: '문화',
  technological: '과학기술',
  diplomatic: '외교',
  conference: '회담',
  religious: '종교',
}
