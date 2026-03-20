/** Prisma `MilitaryUnitType` → 한글 라벨 (관리자 UI 표시용) */
const MILITARY_UNIT_TYPE_KO: Record<string, string> = {
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
  SQUADRON: '비행대대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '분견대',
  OTHER: '기타',
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
  const u = unitType.toUpperCase()
  if (u === 'FLEET') return 'navy'
  if (u === 'WING' || u === 'SQUADRON') return 'air-force'
  if (u === 'SPECIAL_FORCES' || u === 'FIELD_ARMY' || u === 'CORPS')
    return 'army'
  return 'army'
}
