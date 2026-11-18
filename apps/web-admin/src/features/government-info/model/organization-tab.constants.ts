import type {
  OrganizationScope,
  OrganizationType,
} from '@/shared/api/organizations'

export const ORGANIZATION_TYPE_LABEL: Record<string, string> = {
  GOVERNMENT_AGENCY: '정부기관/행정기구',
  COMPANY: '기업',
  MILITARY_ACADEMY: '군사학교',
  POLITICAL_PARTY: '정당',
  INTERGOVERNMENTAL_ORG: '국제기구',
  MULTILATERAL_FORUM: '다자 협의체·블록',
  NGO: 'NGO',
  TRADE_UNION: '노동조합',
  MILITARY_ALLIANCE: '군사동맹',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '경제단체',
  EDUCATION: '교육기관',
  OTHER: '기타',
}

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
