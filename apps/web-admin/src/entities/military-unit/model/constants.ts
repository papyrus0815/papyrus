import type { AdministrationDepartmentEventRole } from '@/shared/api/administration-department'
import type {
  MilitaryUnitTransitionKind,
  MilitaryUnitType,
} from '@/shared/api/military-unit'
import { MILITARY_UNIT_TYPE_KO } from '@/shared/lib/military-unit-type-label'

/** 제대(UnitType) 한글 라벨 단일 사전 */
export const MILITARY_UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  SUPREME_COMMAND: MILITARY_UNIT_TYPE_KO.SUPREME_COMMAND ?? '최고사령부',
  GENERAL_STAFF: MILITARY_UNIT_TYPE_KO.GENERAL_STAFF ?? '참모본부·합참',
  SERVICE_HQ: MILITARY_UNIT_TYPE_KO.SERVICE_HQ ?? '각군 총사령부',
  THEATER: MILITARY_UNIT_TYPE_KO.THEATER ?? '전구·방면사령부',
  ARMY_GROUP: MILITARY_UNIT_TYPE_KO.ARMY_GROUP ?? '집단군',
  FRONT: MILITARY_UNIT_TYPE_KO.FRONT ?? '전선군·방면군',
  MILITARY_DISTRICT: MILITARY_UNIT_TYPE_KO.MILITARY_DISTRICT ?? '군관구',
  FIELD_ARMY: MILITARY_UNIT_TYPE_KO.FIELD_ARMY ?? '야전군',
  FLEET: MILITARY_UNIT_TYPE_KO.FLEET ?? '함대',
  AIR_FLEET: MILITARY_UNIT_TYPE_KO.AIR_FLEET ?? '항공함대',
  CORPS: MILITARY_UNIT_TYPE_KO.CORPS ?? '군단',
  AIR_CORPS: MILITARY_UNIT_TYPE_KO.AIR_CORPS ?? '항공군단',
  DIVISION: MILITARY_UNIT_TYPE_KO.DIVISION ?? '사단',
  WING: MILITARY_UNIT_TYPE_KO.WING ?? '비행단',
  BRIGADE: MILITARY_UNIT_TYPE_KO.BRIGADE ?? '여단',
  REGIMENT: MILITARY_UNIT_TYPE_KO.REGIMENT ?? '연대',
  SQUADRON: MILITARY_UNIT_TYPE_KO.SQUADRON ?? '비행대대',
  BATTALION: MILITARY_UNIT_TYPE_KO.BATTALION ?? '대대',
  COMPANY: MILITARY_UNIT_TYPE_KO.COMPANY ?? '중대',
  PLATOON: MILITARY_UNIT_TYPE_KO.PLATOON ?? '소대',
  SQUAD: MILITARY_UNIT_TYPE_KO.SQUAD ?? '분대',
  DETACHMENT: MILITARY_UNIT_TYPE_KO.DETACHMENT ?? '분견대',
  SPECIAL_FORCES: MILITARY_UNIT_TYPE_KO.SPECIAL_FORCES ?? '특수부대',
  OTHER: MILITARY_UNIT_TYPE_KO.OTHER ?? '기타',
}

/** 군종(Branch) 한글 라벨 단일 사전 */
export const MILITARY_BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

/** 제대 위계 정렬 순서 (낮을수록 최상위) */
export const MILITARY_ECHELON_ORDER: Record<string, number> = {
  SUPREME_COMMAND: -3,
  GENERAL_STAFF: -2,
  SERVICE_HQ: -1,
  THEATER: 1,
  ARMY_GROUP: 2,
  FRONT: 2,
  MILITARY_DISTRICT: 3,
  FIELD_ARMY: 4,
  FLEET: 4,
  AIR_FLEET: 4,
  CORPS: 5,
  AIR_CORPS: 5,
  DIVISION: 6,
  WING: 6,
  BRIGADE: 7,
  REGIMENT: 8,
  SQUADRON: 8,
  BATTALION: 9,
  SPECIAL_FORCES: 9,
  DETACHMENT: 10,
  COMPANY: 11,
  PLATOON: 12,
  SQUAD: 13,
  OTHER: 99,
}

export const HIGH_COMMAND_UNIT_TYPES = new Set<string>([
  'SUPREME_COMMAND',
  'GENERAL_STAFF',
  'SERVICE_HQ',
])

export const HIGH_AND_OPERATIONAL_UNIT_TYPES = new Set<string>([
  'SUPREME_COMMAND',
  'GENERAL_STAFF',
  'SERVICE_HQ',
  'THEATER',
  'ARMY_GROUP',
  'FRONT',
  'MILITARY_DISTRICT',
  'FIELD_ARMY',
  'FLEET',
  'AIR_FLEET',
  'CORPS',
  'AIR_CORPS',
])

export const MILITARY_TRANSITION_KIND_LABELS: Record<
  MilitaryUnitTransitionKind,
  string
> = {
  REORGANIZE: '개편·승격',
  RENAME: '명칭 개칭',
  MERGE: '통합·합병',
  SPLIT: '분할·분리',
  ABSORBED: '흡수·편입',
}

export const MILITARY_TRANSITION_KIND_SHORT: Record<string, string> = {
  REORGANIZE: '개편',
  RENAME: '개칭',
  MERGE: '통합',
  SPLIT: '분할',
  ABSORBED: '흡수',
}

export const MILITARY_TRANSITION_KIND_OPTIONS: Array<{
  value: MilitaryUnitTransitionKind
  label: string
}> = [
  { value: 'REORGANIZE', label: '개편·승격 (REORGANIZE)' },
  { value: 'RENAME', label: '명칭 개칭 (RENAME)' },
  { value: 'MERGE', label: '통합·합병 (MERGE)' },
  { value: 'SPLIT', label: '분할·분리 (SPLIT)' },
  { value: 'ABSORBED', label: '흡수·편입 (ABSORBED)' },
]

export const MILITARY_DIRECTIVE_ROLE_OPTIONS: Array<{
  value: AdministrationDepartmentEventRole
  label: string
}> = [
  /* 값은 서버 EventDepartmentRole 5종뿐 — LEAD·EXECUTOR·CO_LEAD·TARGET은 DB enum에 없어 저장이 거부됐다 */
  { value: 'ISSUER', label: '지령·명령 발령' },
  { value: 'PRINCIPAL', label: '작전 주관·총괄' },
  { value: 'RECIPIENT', label: '작전 집행·수행' },
  { value: 'PARTICIPANT', label: '참여·협동' },
  { value: 'OTHER', label: '기타' },
]

export type MilitaryBranchTabKey =
  | 'ALL'
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'JOINT_OTHER'

export type MilitaryEchelonTierFilter =
  | 'ALL'
  | 'HIGH_COMMAND'
  | 'STRATEGIC'
  | 'OPERATIONAL'
  | 'TACTICAL'

export const MILITARY_BRANCH_TABS: Array<{
  key: MilitaryBranchTabKey
  label: string
}> = [
  { key: 'ALL', label: '전체 편제' },
  { key: 'ARMY', label: '육군' },
  { key: 'NAVY', label: '해군 · 해안경비대' },
  { key: 'AIR_FORCE', label: '공군 · 우주군' },
  { key: 'MARINE_CORPS', label: '해병대' },
  { key: 'JOINT_OTHER', label: '합동 · 특수 · 기타' },
]

export const MILITARY_ECHELON_TIER_OPTIONS: Array<{
  value: MilitaryEchelonTierFilter
  label: string
}> = [
  { value: 'ALL', label: '전체 제대' },
  { value: 'HIGH_COMMAND', label: '최고통수 · 참모본부 · 군종본부' },
  { value: 'STRATEGIC', label: '전역 · 집단군 · 전선군 · 군관구' },
  { value: 'OPERATIONAL', label: '야전군 · 함대 · 군단 · 사단' },
  { value: 'TACTICAL', label: '여단 · 연대 · 대대 이하' },
]

export function matchesMilitaryBranchTab(
  branch: string | null | undefined,
  tab: MilitaryBranchTabKey,
): boolean {
  if (tab === 'ALL') return true
  if (tab === 'ARMY') return branch === 'ARMY'
  if (tab === 'NAVY') return branch === 'NAVY' || branch === 'COAST_GUARD'
  if (tab === 'AIR_FORCE') {
    return branch === 'AIR_FORCE' || branch === 'SPACE_FORCE'
  }
  if (tab === 'MARINE_CORPS') return branch === 'MARINE_CORPS'
  return !branch || branch === 'JOINT' || branch === 'OTHER'
}

export function matchesMilitaryEchelonTier(
  unitType: string | null | undefined,
  tier: MilitaryEchelonTierFilter,
): boolean {
  if (tier === 'ALL') return true
  if (!unitType) return false
  if (tier === 'HIGH_COMMAND') {
    return HIGH_COMMAND_UNIT_TYPES.has(unitType)
  }
  if (tier === 'STRATEGIC') {
    return ['THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT'].includes(
      unitType,
    )
  }
  if (tier === 'OPERATIONAL') {
    return [
      'FIELD_ARMY',
      'FLEET',
      'AIR_FLEET',
      'CORPS',
      'AIR_CORPS',
      'DIVISION',
      'WING',
    ].includes(unitType)
  }
  return [
    'BRIGADE',
    'REGIMENT',
    'SQUADRON',
    'BATTALION',
    'COMPANY',
    'PLATOON',
    'SQUAD',
    'DETACHMENT',
    'SPECIAL_FORCES',
    'OTHER',
  ].includes(unitType)
}
