import {
  ORGANIZATION_TYPE_LABEL as SHARED_ORGANIZATION_TYPE_LABEL,
  type OrganizationScope,
  type OrganizationType,
} from '@/shared/api/organizations'

/** 유형 라벨 정본은 shared/api/organizations — 여기서 따로 두면 유형이 늘 때 어긋난다 */
export const ORGANIZATION_TYPE_LABEL: Record<string, string> = SHARED_ORGANIZATION_TYPE_LABEL

export const ORGANIZATION_TYPE_OPTIONS: {
  value: OrganizationType
  label: string
}[] = [
  { value: 'INTERGOVERNMENTAL_ORG', label: '국제기구' },
  { value: 'MULTILATERAL_FORUM', label: '다자 협의체·블록' },
  { value: 'MILITARY_ALLIANCE', label: '군사동맹' },
  { value: 'NGO', label: 'NGO·시민단체' },
  { value: 'TRADE_UNION', label: '노동조합' },
  { value: 'BUSINESS_ASSOCIATION', label: '경제·직능단체' },
  { value: 'RELIGIOUS_ORG', label: '종교단체' },
  { value: 'EDUCATION', label: '교육·학술기관' },
  { value: 'MILITARY_ACADEMY', label: '군사학교' },
  { value: 'PARTY_ORGAN', label: '당 기구' },
  { value: 'MASS_ORGANIZATION', label: '대중 조직(청년·여성·학생)' },
  { value: 'PARAMILITARY', label: '준군사조직' },
  { value: 'MEDIA', label: '언론·출판' },
  { value: 'POLITICAL_ALLIANCE', label: '정치 연합·인터내셔널' },
  { value: 'OTHER', label: '기타 민간단체' },
]

export const ORGANIZATION_SCOPE_OPTIONS: {
  value: OrganizationScope
  label: string
}[] = [
  { value: 'INTERNATIONAL', label: '국제' },
  { value: 'SUPRANATIONAL', label: '초국가' },
  { value: 'REGIONAL', label: '지역' },
  { value: 'NATIONAL', label: '국가' },
  { value: 'SUBNATIONAL', label: '광역/기초' },
  { value: 'LOCAL', label: '지역/도시' },
]
