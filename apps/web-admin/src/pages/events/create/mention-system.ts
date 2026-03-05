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
import type { EventResponseDto } from '@/shared/api/events'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import type { PersonResponseDto } from '@/shared/api/persons'

import type { HistoricalEvent } from './events.types'

// 멘션 가능한 엔티티 타입
export type MentionEntityType =
  // 인물/조직
  | 'person'
  | 'organization'
  | 'militaryUnit'
  
  // 지리/정치
  | 'event'
  | 'country'
  | 'historicalCountry'
  | 'city'
  | 'administrativeDivision'
  
  // 경제/상업
  | 'brand'              // 브랜드: 코카콜라, 배스킨라빈스
  | 'company'            // 기업: IBM, 도요타
  | 'product'            // 제품: M1 개런드, 지프
  
  // 군사
  | 'weapon'
  | 'groundVehicle'
  | 'aircraft'
  | 'navalVessel'
  
  // 문화/사회
  | 'culture'            // 문화 현상: 재즈, 스윙
  | 'ideology'           // 이념: 파시즘, 공산주의
  | 'religion'           // 종교: 기독교, 이슬람
  | 'art'                // 예술 작품: 게르니카
  | 'literature'         // 문학: 1984, 동물농장
  | 'music'              // 음악: 라 마르세예즈
  
  // 과학/기술
  | 'technology'         // 기술: 레이더, 암호 해독
  | 'invention'          // 발명품: 페니실린, 제트 엔진
  | 'scientificTheory'   // 과학 이론: 원자폭탄 이론
  
  // 법률/문서
  | 'document'           // 문서: 대서양 헌장
  | 'treaty'             // 조약: 베르사유 조약
  | 'law'                // 법률: 뉘른베르크 법

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
    searchFields: ['name', 'surname'],
    getName: (item: unknown) => {
      const p = item as PersonResponseDto
      const name = p.name ?? ''
      const surname = p.surname ?? ''
      const order = (p.nameDisplayOrder as string) ?? 'korean'
      if (order === 'western') return [surname, name].filter(Boolean).join(' ').trim() || '이름 없음'
      return [name, surname].filter(Boolean).join(' ').trim() || '이름 없음'
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
  
  // ============================================
  // 경제/상업 엔티티
  // ============================================
  brand: {
    label: '브랜드',
    icon: FiShoppingBag,
    color: '#ec4899', // 핑크
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
    color: '#0891b2', // 시안
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { industry?: string }).industry || undefined,
  },
  product: {
    label: '제품',
    icon: FiPackage,
    color: '#f59e0b', // 주황
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { manufacturer?: string }).manufacturer || undefined,
  },
  
  // ============================================
  // 문화/사회 엔티티
  // ============================================
  culture: {
    label: '문화',
    icon: FiStar,
    color: '#a855f7', // 보라
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  ideology: {
    label: '이념',
    icon: FiTrendingUp,
    color: '#dc2626', // 빨강
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  religion: {
    label: '종교',
    icon: FiHeart,
    color: '#7c3aed', // 진보라
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  art: {
    label: '예술',
    icon: FiStar,
    color: '#db2777', // 마젠타
    searchFields: ['name', 'artist'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { artist?: string }).artist || undefined,
  },
  literature: {
    label: '문학',
    icon: FiBook,
    color: '#059669', // 초록
    searchFields: ['name', 'author'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { author?: string }).author || undefined,
  },
  music: {
    label: '음악',
    icon: FiMusic,
    color: '#d946ef', // 핑크
    searchFields: ['name', 'composer'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { composer?: string }).composer || undefined,
  },
  
  // ============================================
  // 과학/기술 엔티티
  // ============================================
  technology: {
    label: '기술',
    icon: FiZap,
    color: '#0284c7', // 블루
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
  },
  invention: {
    label: '발명품',
    icon: FiCoffee,
    color: '#ea580c', // 주황
    searchFields: ['name', 'inventor'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { inventor?: string }).inventor || undefined,
  },
  scientificTheory: {
    label: '과학 이론',
    icon: FiBookOpen,
    color: '#0369a1', // 다크 블루
    searchFields: ['name', 'scientist'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { scientist?: string }).scientist || undefined,
  },
  
  // ============================================
  // 법률/문서 엔티티
  // ============================================
  document: {
    label: '문서',
    icon: FiFileText,
    color: '#64748b', // 회색
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { date?: string }).date || undefined,
  },
  treaty: {
    label: '조약',
    icon: FiFileText,
    color: '#16a34a', // 초록
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { signedDate?: string }).signedDate || undefined,
  },
  law: {
    label: '법률',
    icon: FiShield,
    color: '#b91c1c', // 다크 레드
    searchFields: ['name', 'description'],
    getName: (item: unknown) =>
      (item as { name: string; [key: string]: unknown }).name,
    getSubtitle: (item: unknown) =>
      (item as { enactedDate?: string }).enactedDate || undefined,
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
