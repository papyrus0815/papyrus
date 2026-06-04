/**
 * 통합 멘션 시스템
 * 모든 엔티티 타입을 지원하는 확장 가능한 멘션 시스템
 */
import type { IconType } from 'react-icons'
import {
  FiBook,
  FiBookOpen,
  FiBriefcase,
  FiCoffee,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHome,
  FiMapPin,
  FiMusic,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { PoliticalPartyRow } from '@/shared/api/election'
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

// 멘션 가능한 엔티티 타입
export type MentionEntityType =
  | 'person'
  | 'dynasty'
  | 'organization'
  | 'militaryUnit'
  | 'event'
  | 'country'
  | 'historicalCountry'
  | 'city'
  | 'administrativeDivision'
  | 'brand'
  | 'company'
  | 'product'
  | 'weapon'
  | 'groundVehicle'
  | 'aircraft'
  | 'navalVessel'
  | 'culture'
  | 'ideology'
  | 'religion'
  | 'art'
  | 'literature'
  | 'music'
  | 'technology'
  | 'invention'
  | 'scientificTheory'
  | 'document'
  | 'treaty'
  | 'law'
  | 'politicalParty'
  | 'personGroup'

// 통합 멘션 아이템 타입
export interface MentionItem {
  type: MentionEntityType
  id: string
  name: string
  subtitle?: string
  icon?: IconType
  color?: string
  data: unknown
}

// 타입별 설정
export const MENTION_TYPE_CONFIG: Record<
  MentionEntityType,
  {
    label: string
    icon: IconType
    color: string
    searchFields: string[]
    getName: (item: unknown) => string
    getSubtitle?: (item: unknown) => string | undefined
  }
> = {
  person: {
    label: '인물',
    icon: FiUsers,
    color: '#6366f1',
    searchFields: ['name', 'surname'],
    getName: (item: unknown) => {
      const p = item as PersonResponseDto
      return (
        getPersonDisplayName({
          name: p.name ?? '',
          surname: p.surname,
          middleName: p.middleName,
          country: p.country ?? null,
        }) || '이름 없음'
      )
    },
    getSubtitle: (item: unknown) =>
      (item as PersonResponseDto).birthYear
        ? `${(item as PersonResponseDto).birthYear}년`
        : undefined,
  },
  event: {
    label: '사건',
    icon: FiGlobe,
    color: '#d97706',
    searchFields: ['title', 'description'],
    getName: (item: unknown) => (item as EventResponseDto).title ?? '',
    getSubtitle: (item: unknown) => {
      const event = item as EventResponseDto
      if (event.startDate) {
        return `${new Date(event.startDate).getFullYear()}년`
      }
      return undefined
    },
  },
  country: {
    label: '국가',
    icon: FiGlobe,
    color: '#22c55e',
    searchFields: ['name', 'localName'],
    getName: (item: unknown) => (item as CountryResponseDto).name,
    getSubtitle: (item: unknown) =>
      (item as CountryResponseDto).localName || undefined,
  },
  historicalCountry: {
    label: '역사적 국가',
    icon: FiHome,
    color: '#8b5cf6',
    searchFields: ['name', 'enName'],
    getName: (item: unknown) => (item as HistoricalCountryResponseDto).name,
    getSubtitle: (item: unknown) =>
      (item as HistoricalCountryResponseDto).enName || undefined,
  },
  city: {
    label: '도시',
    icon: FiMapPin,
    color: '#06b6d4',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; country?: { name: string } }).name,
    getSubtitle: (item: unknown) =>
      (item as { name: string; country?: { name: string } }).country?.name || undefined,
  },
  administrativeDivision: {
    label: '행정구역',
    icon: FiMapPin,
    color: '#06b6d4',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  organization: {
    label: '조직',
    icon: FiHome,
    color: '#f59e0b',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  militaryUnit: {
    label: '군부대',
    icon: FiShield,
    color: '#ef4444',
    searchFields: ['name'],
    getName: (item: unknown) => (item as MilitaryUnit).name,
    getSubtitle: (item: unknown) =>
      (item as MilitaryUnit).country?.name || undefined,
  },
  dynasty: {
    label: '가문',
    icon: FiHome,
    color: '#7c3aed',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { description?: string })?.description
        ? String((item as { description: string }).description).slice(0, 30) + '…'
        : undefined,
  },
  weapon: {
    label: '무기',
    icon: FiTarget,
    color: '#dc2626',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  groundVehicle: {
    label: '지상 장비',
    icon: FiZap,
    color: '#dc2626',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  aircraft: {
    label: '항공기',
    icon: FiZap,
    color: '#dc2626',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  navalVessel: {
    label: '함선',
    icon: FiZap,
    color: '#dc2626',
    searchFields: ['name'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  brand: {
    label: '브랜드',
    icon: FiShoppingBag,
    color: '#ec4899',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { foundedYear?: number }).foundedYear
        ? `${(item as { foundedYear: number }).foundedYear}년 설립`
        : undefined,
  },
  company: {
    label: '기업',
    icon: FiBriefcase,
    color: '#0891b2',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { industry?: string }).industry || undefined,
  },
  product: {
    label: '제품',
    icon: FiPackage,
    color: '#f59e0b',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { manufacturer?: string }).manufacturer || undefined,
  },
  culture: {
    label: '문화',
    icon: FiStar,
    color: '#a855f7',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  ideology: {
    label: '이념',
    icon: FiTrendingUp,
    color: '#dc2626',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  religion: {
    label: '종교',
    icon: FiHeart,
    color: '#7c3aed',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  art: {
    label: '예술',
    icon: FiStar,
    color: '#db2777',
    searchFields: ['name', 'artist'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { artist?: string }).artist || undefined,
  },
  literature: {
    label: '문학',
    icon: FiBook,
    color: '#059669',
    searchFields: ['name', 'author'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { author?: string }).author || undefined,
  },
  music: {
    label: '음악',
    icon: FiMusic,
    color: '#d946ef',
    searchFields: ['name', 'composer'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { composer?: string }).composer || undefined,
  },
  technology: {
    label: '기술',
    icon: FiZap,
    color: '#0284c7',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  invention: {
    label: '발명품',
    icon: FiCoffee,
    color: '#ea580c',
    searchFields: ['name', 'inventor'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { inventor?: string }).inventor || undefined,
  },
  scientificTheory: {
    label: '과학 이론',
    icon: FiBookOpen,
    color: '#0369a1',
    searchFields: ['name', 'scientist'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { scientist?: string }).scientist || undefined,
  },
  document: {
    label: '문서',
    icon: FiFileText,
    color: '#64748b',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { date?: string }).date || undefined,
  },
  treaty: {
    label: '조약',
    icon: FiFileText,
    color: '#16a34a',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { signedDate?: string }).signedDate || undefined,
  },
  law: {
    label: '법률',
    icon: FiShield,
    color: '#b91c1c',
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { enactedDate?: string }).enactedDate || undefined,
  },
  politicalParty: {
    label: '정당',
    icon: FiFlag,
    color: '#0ea5e9',
    searchFields: ['name', 'shortName'],
    getName: (item: unknown) => (item as PoliticalPartyRow).name ?? '',
    getSubtitle: (item: unknown) => {
      const p = item as PoliticalPartyRow
      const s = p.shortName?.trim()
      return s || undefined
    },
  },
  personGroup: {
    label: '집단',
    icon: FiUsers,
    color: '#8b5cf6',
    searchFields: ['name'],
    getName: (item: unknown) => (item as { name?: string }).name ?? '',
    getSubtitle: (item: unknown) =>
      (item as { subtitle?: string }).subtitle || undefined,
  },
}

/**
 * 검색어로 엔티티 검색
 */
const ENTITY_SEARCH_MATCH_LIMIT = 10 /** 검색어 있을 때 타입당 최대 건수 (기존 5에서 확대) */
const ENTITY_BROWSE_PER_TYPE = 5 /** 검색어 없을 때 타입당 샘플 (기존 3에서 확대) */

export function searchMentionEntities(
  searchTerm: string,
  entities: {
    persons?: PersonResponseDto[]
    events?: EventResponseDto[]
    countries?: CountryResponseDto[]
    historicalCountries?: HistoricalCountryResponseDto[]
    cities?: Array<{ id: string; name: string; [key: string]: unknown }>
    militaryUnits?: MilitaryUnit[]
    dynasties?: Array<{ id: string; name: string; description?: string; [key: string]: unknown }>
    politicalParties?: PoliticalPartyRow[]
  },
): MentionItem[] {
  const results: MentionItem[] = []
  const normalizedSearch = searchTerm.toLowerCase().trim()
  const shouldShowAll = !normalizedSearch

  const push = (type: MentionEntityType, items: unknown[], browseLimit: number) => {
    ;(items as unknown[])
      .filter((item) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG[type].searchFields.some((field) =>
              (item as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(
        0,
        shouldShowAll ? browseLimit : ENTITY_SEARCH_MATCH_LIMIT,
      )
      .forEach((item) => {
        results.push({
          type,
          id: (item as { id: string }).id,
          name: MENTION_TYPE_CONFIG[type].getName(item),
          subtitle: MENTION_TYPE_CONFIG[type].getSubtitle?.(item),
          icon: MENTION_TYPE_CONFIG[type].icon,
          color: MENTION_TYPE_CONFIG[type].color,
          data: item,
        })
      })
  }

  if (entities.persons) push('person', entities.persons, ENTITY_BROWSE_PER_TYPE)
  if (entities.events) push('event', entities.events, ENTITY_BROWSE_PER_TYPE)
  if (entities.countries) push('country', entities.countries, ENTITY_BROWSE_PER_TYPE)
  if (entities.historicalCountries)
    push('historicalCountry', entities.historicalCountries, ENTITY_BROWSE_PER_TYPE)
  if (entities.militaryUnits) push('militaryUnit', entities.militaryUnits, ENTITY_BROWSE_PER_TYPE)
  if (entities.dynasties) push('dynasty', entities.dynasties, ENTITY_BROWSE_PER_TYPE)
  if (entities.politicalParties)
    push('politicalParty', entities.politicalParties, ENTITY_BROWSE_PER_TYPE)

  return results
}

/**
 * 타입별로 그룹화
 */
export function groupMentionsByType(
  mentions: MentionItem[],
): Record<MentionEntityType, MentionItem[]> {
  const grouped = {} as Record<MentionEntityType, MentionItem[]>

  Object.keys(MENTION_TYPE_CONFIG).forEach((type) => {
    grouped[type as MentionEntityType] = []
  })

  mentions.forEach((mention) => {
    if (!grouped[mention.type]) {
      grouped[mention.type] = []
    }
    grouped[mention.type].push(mention)
  })

  return grouped
}
