/** Prisma `MilitaryUnitType` → 한글 라벨 (관리자 UI 표시용) */
export const MILITARY_UNIT_TYPE_KO: Record<string, string> = {
  SUPREME_COMMAND: '최고사령부',
  GENERAL_STAFF: '참모본부·합참',
  SERVICE_HQ: '각군 총사령부',
  THEATER: '전구·방면사령부',
  ARMY_GROUP: '집단군',
  FRONT: '전선군·방면군',
  MILITARY_DISTRICT: '군관구',
  FIELD_ARMY: '야전군',
  CORPS: '군단',
  DIVISION: '사단',
  BRIGADE: '여단',
  REGIMENT: '연대',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  FLEET: '함대',
  AIR_FLEET: '항공함대',
  AIR_CORPS: '항공군단',
  SQUADRON: '비행대대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '분견대',
  OTHER: '기타',
}

export function isHighCommandUnitType(
  unitType: string | null | undefined,
): boolean {
  return (
    unitType === 'SUPREME_COMMAND' ||
    unitType === 'GENERAL_STAFF' ||
    unitType === 'SERVICE_HQ'
  )
}

export function militaryUnitTypeLabelKo(
  unitType: string | null | undefined,
): string {
  if (!unitType) return '—'
  return MILITARY_UNIT_TYPE_KO[unitType] ?? unitType
}

/** 카드 아이콘 그라데이션용 토큰 (기존 styled $type과 호환) */
export function militaryUnitIconVariant(
  unitType: string | null | undefined,
): 'army' | 'navy' | 'air-force' | 'marines' | 'default' {
  if (!unitType) return 'default'
  const upper = unitType.toUpperCase()
  if (upper === 'FLEET') return 'navy'
  if (
    upper === 'AIR_FLEET' ||
    upper === 'AIR_CORPS' ||
    upper === 'WING' ||
    upper === 'SQUADRON'
  ) {
    return 'air-force'
  }
  if (
    upper === 'SUPREME_COMMAND' ||
    upper === 'GENERAL_STAFF' ||
    upper === 'SERVICE_HQ' ||
    upper === 'THEATER' ||
    upper === 'ARMY_GROUP' ||
    upper === 'FRONT' ||
    upper === 'MILITARY_DISTRICT' ||
    upper === 'SPECIAL_FORCES' ||
    upper === 'FIELD_ARMY' ||
    upper === 'CORPS'
  ) {
    return 'army'
  }
  return 'army'
}
