/**
 * 정당 소속·당직 라벨 — 정당 지면과 인물 지면이 같은 말을 쓴다(예전엔 두 곳에 다른 라벨로 복사돼 있었다).
 */
export type PartyMembershipRoleCategoryValue =
  | 'GENERAL_MEMBER'
  | 'LEADERSHIP'
  | 'PARLIAMENTARY'
  | 'LOCAL_ORGANIZATION'
  | 'WING_ORGAN'
  | 'POLICY_STAFF'
  | 'HONORARY'
  | 'OTHER'

export type PartyMembershipLeadershipTierValue = 'TOP' | 'SECOND' | 'SENIOR' | 'ORDINARY' | 'JUNIOR' | 'UNSPECIFIED'

/** 당직 종류 — 직함 문자열('두체')과 별개로 '역대 당수·서기장'을 정당끼리 같은 축으로 */
export type PartyOfficeKindValue =
  | 'LEADER'
  | 'CHAIR'
  | 'SECRETARY_GENERAL'
  | 'DEPUTY_LEADER'
  | 'PARLIAMENTARY_LEADER'
  | 'SPOKESPERSON'
  | 'TREASURER'
  | 'HONORARY_LEADER'
  | 'OTHER'

export const PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS: Array<{ value: PartyMembershipRoleCategoryValue; label: string }> = [
  { value: 'GENERAL_MEMBER', label: '일반 당원' },
  { value: 'LEADERSHIP', label: '지도부·당직' },
  { value: 'PARLIAMENTARY', label: '원내·의회직' },
  { value: 'LOCAL_ORGANIZATION', label: '지역 조직' },
  { value: 'WING_ORGAN', label: '산하기구·계파' },
  { value: 'POLICY_STAFF', label: '정책·사무' },
  { value: 'HONORARY', label: '명예직·고문' },
  { value: 'OTHER', label: '기타' },
]

export const PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS: Array<{ value: PartyMembershipLeadershipTierValue; label: string }> = [
  { value: 'UNSPECIFIED', label: '위계 미지정' },
  { value: 'TOP', label: '최고 (당수·총재)' },
  { value: 'SECOND', label: '2인자 (서기장·원내대표)' },
  { value: 'SENIOR', label: '고위 지도부' },
  { value: 'ORDINARY', label: '일반 지도부' },
  { value: 'JUNIOR', label: '하급 지도부' },
]

export const PARTY_OFFICE_KIND_OPTIONS: Array<{ value: PartyOfficeKindValue; label: string; hint: string }> = [
  { value: 'LEADER', label: '당수', hint: '최고 지도자 — 두체, 퓌러, 총재' },
  { value: 'CHAIR', label: '대표·의장', hint: '당 대표·의장' },
  { value: 'SECRETARY_GENERAL', label: '서기장·사무총장', hint: 'Segretario, 총서기' },
  { value: 'DEPUTY_LEADER', label: '부대표', hint: '부총재·부대표' },
  { value: 'PARLIAMENTARY_LEADER', label: '원내대표', hint: '' },
  { value: 'SPOKESPERSON', label: '대변인', hint: '' },
  { value: 'TREASURER', label: '재정 책임', hint: '' },
  { value: 'HONORARY_LEADER', label: '명예 당수', hint: '' },
  { value: 'OTHER', label: '기타 당직', hint: '' },
]

export function labelPartyMembershipRoleCategory(value: string | null | undefined): string {
  if (!value) return ''
  return PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function labelPartyMembershipLeadershipTier(value: string | null | undefined): string {
  if (!value || value === 'UNSPECIFIED') return ''
  return PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function labelPartyOfficeKind(value: string | null | undefined): string {
  if (!value) return ''
  return PARTY_OFFICE_KIND_OPTIONS.find((option) => option.value === value)?.label ?? value
}

/**
 * 당직 한 줄 — '제3대 서기장 · Segretario', '당수 · 두체'.
 * 당직이 없으면 역할 분류·직함. 직함이 당직 라벨과 같으면 한 번만.
 */
export function formatPartyOffice(row: {
  roleCategory?: string | null
  officeKind?: string | null
  officeOrdinal?: number | null
  roleTitle?: string | null
}): string {
  const title = row.roleTitle?.trim() || ''
  if (row.roleCategory === 'LEADERSHIP' && row.officeKind) {
    const office = `${row.officeOrdinal ? `제${row.officeOrdinal}대 ` : ''}${labelPartyOfficeKind(row.officeKind)}`
    return title && title !== labelPartyOfficeKind(row.officeKind) ? `${office} · ${title}` : office
  }
  const category = row.roleCategory && row.roleCategory !== 'OTHER' ? labelPartyMembershipRoleCategory(row.roleCategory) : ''
  return [title, category].filter(Boolean).join(' · ')
}
