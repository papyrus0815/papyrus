/**
 * 통합 멘션 시스템
 * 모든 엔티티 타입을 지원하는 확장 가능한 멘션 시스템
 */
import type { IconType } from 'react-icons'
import {
  FiGlobe,
  FiHome,
  FiMapPin,
  FiShield,
  FiTarget,
  FiUsers,
  FiZap,
} from 'react-icons/fi'

import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'

import type { HistoricalEvent } from './events.types'

// 멘션 가능한 엔티티 타입
export type MentionEntityType =
  | 'person'
  | 'event'
  | 'country'
  | 'historicalCountry'
  | 'city'
  | 'administrativeDivision'
  | 'organization'
  | 'militaryUnit'
  | 'weapon'
  | 'groundVehicle'
  | 'aircraft'
  | 'navalVessel'

// 통합 멘션 아이템 타입
export interface MentionItem {
  type: MentionEntityType
  id: string
  name: string
  subtitle?: string
  icon?: IconType
  color?: string
  data: unknown // 원본 데이터
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
    searchFields: ['name'],
    getName: (item: unknown) => (item as PersonResponseDto).name,
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
    getName: (item: unknown) =>
      (item as EventResponseDto).title || (item as HistoricalEvent).title,
    getSubtitle: (item: unknown) => {
      const event = item as EventResponseDto | HistoricalEvent
      if ('startDate' in event && event.startDate) {
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
      (item as { name: string; country?: { name: string } }).country?.name ||
      undefined,
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
}

/**
 * 검색어로 엔티티 검색
 */
export function searchMentionEntities(
  searchTerm: string,
  entities: {
    persons?: PersonResponseDto[]
    events?: (EventResponseDto | HistoricalEvent)[]
    countries?: CountryResponseDto[]
    historicalCountries?: HistoricalCountryResponseDto[]
    cities?: Array<{ id: string; name: string; [key: string]: unknown }>
    militaryUnits?: MilitaryUnit[]
  },
): MentionItem[] {
  const results: MentionItem[] = []
  const normalizedSearch = searchTerm.toLowerCase().trim()

  // 빈 검색어일 때는 모든 항목 반환 (최대 개수 제한)
  const shouldShowAll = !normalizedSearch

  // 인물 검색
  if (entities.persons) {
    entities.persons
      .filter((person) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG.person.searchFields.some((field) =>
              (person as unknown as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(0, shouldShowAll ? 3 : 5)
      .forEach((person) => {
        results.push({
          type: 'person',
          id: person.id,
          name: MENTION_TYPE_CONFIG.person.getName(person),
          subtitle: MENTION_TYPE_CONFIG.person.getSubtitle?.(person),
          icon: MENTION_TYPE_CONFIG.person.icon,
          color: MENTION_TYPE_CONFIG.person.color,
          data: person,
        })
      })
  }

  // 사건 검색
  if (entities.events) {
    entities.events
      .filter((event) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG.event.searchFields.some((field) =>
              (event as unknown as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(0, shouldShowAll ? 3 : 5)
      .forEach((event) => {
        results.push({
          type: 'event',
          id: event.id,
          name: MENTION_TYPE_CONFIG.event.getName(event),
          subtitle: MENTION_TYPE_CONFIG.event.getSubtitle?.(event),
          icon: MENTION_TYPE_CONFIG.event.icon,
          color: MENTION_TYPE_CONFIG.event.color,
          data: event,
        })
      })
  }

  // 국가 검색
  if (entities.countries) {
    entities.countries
      .filter((country) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG.country.searchFields.some((field) =>
              (country as unknown as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(0, shouldShowAll ? 3 : 5)
      .forEach((country) => {
        results.push({
          type: 'country',
          id: country.id,
          name: MENTION_TYPE_CONFIG.country.getName(country),
          subtitle: MENTION_TYPE_CONFIG.country.getSubtitle?.(country),
          icon: MENTION_TYPE_CONFIG.country.icon,
          color: MENTION_TYPE_CONFIG.country.color,
          data: country,
        })
      })
  }

  // 역사적 국가 검색
  if (entities.historicalCountries) {
    entities.historicalCountries
      .filter((hc) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG.historicalCountry.searchFields.some((field) =>
              (hc as unknown as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(0, shouldShowAll ? 3 : 5)
      .forEach((hc) => {
        results.push({
          type: 'historicalCountry',
          id: hc.id,
          name: MENTION_TYPE_CONFIG.historicalCountry.getName(hc),
          subtitle: MENTION_TYPE_CONFIG.historicalCountry.getSubtitle?.(hc),
          icon: MENTION_TYPE_CONFIG.historicalCountry.icon,
          color: MENTION_TYPE_CONFIG.historicalCountry.color,
          data: hc,
        })
      })
  }

  // 군부대 검색
  if (entities.militaryUnits) {
    entities.militaryUnits
      .filter((unit) =>
        shouldShowAll
          ? true
          : MENTION_TYPE_CONFIG.militaryUnit.searchFields.some((field) =>
              (unit as unknown as Record<string, unknown>)[field]
                ?.toString()
                .toLowerCase()
                .includes(normalizedSearch),
            ),
      )
      .slice(0, shouldShowAll ? 3 : 5)
      .forEach((unit) => {
        results.push({
          type: 'militaryUnit',
          id: unit.id,
          name: MENTION_TYPE_CONFIG.militaryUnit.getName(unit),
          subtitle: MENTION_TYPE_CONFIG.militaryUnit.getSubtitle?.(unit),
          icon: MENTION_TYPE_CONFIG.militaryUnit.icon,
          color: MENTION_TYPE_CONFIG.militaryUnit.color,
          data: unit,
        })
      })
  }

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
