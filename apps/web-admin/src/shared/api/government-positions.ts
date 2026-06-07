/**
 * 정부 직책 API 서비스
 */
import { apiConnection } from './client'

/**
 * 정부 직책 유형
 */
export enum GovernmentPositionType {
  HEAD_OF_STATE = 'HEAD_OF_STATE', // 국가원수
  HEAD_OF_GOVERNMENT = 'HEAD_OF_GOVERNMENT', // 정부수반
  DEPUTY_HEAD_OF_STATE = 'DEPUTY_HEAD_OF_STATE', // 부통령
  CABINET_MINISTER = 'CABINET_MINISTER', // 각료/장관
  VICE_MINISTER = 'VICE_MINISTER', // 차관
  LEGISLATOR = 'LEGISLATOR', // 의회의원
  JUDICIARY = 'JUDICIARY', // 사법부
  LOCAL_GOVERNMENT = 'LOCAL_GOVERNMENT', // 지방정부
  SPECIAL_POSITION = 'SPECIAL_POSITION', // 특별직
  MILITARY_COMMANDER = 'MILITARY_COMMANDER', // 군 지휘관
  OTHER = 'OTHER',
}

/**
 * 정부 직책 정의
 */
export interface GovernmentPositionDefinition {
  id: string
  title: string
  titleEn?: string
  titleLocal?: string
  positionType: GovernmentPositionType
  description?: string
  rank?: number
  /** 중앙부처 카테고리 연결 */
  categoryId?: string | null
  category?: { id: string; name: string; nameEn?: string } | null
  /** 행정기구 연결 */
  organizationId?: string | null
  organization?: {
    id: string
    name: string
    shortName?: string | null
  } | null
  establishedDate?: string | null
  abolishedDate?: string | null
}

/**
 * 정부 직책 재임 기록
 */
export interface GovernmentPositionTenure {
  id: string
  positionId: string
  personId: string
  termNumber?: number
  startDate: string
  endDate?: string
  appointmentMethod?: string
  endReason?: string
  notes?: string
  position: GovernmentPositionDefinition
  person?: {
    id: string
    name: string
    surname?: string
    profileImageUrl?: string
  }
}

/**
 * 사건 기간과 겹치는 국가 원수 정보
 */
export interface HeadOfStateDuringEvent {
  person: {
    id: string
    name: string
    surname?: string
    profileImageUrl?: string
    birthEra?: 'BC' | 'AD' | null
    birthYear?: number | null
    birthMonth?: number | null
    birthDay?: number | null
    birthDate?: string | null
    deathEra?: 'BC' | 'AD' | null
    deathYear?: number | null
    deathMonth?: number | null
    deathDay?: number | null
    deathDate?: string | null
    governmentPositions?: GovernmentPositionTenure[]
  }
  position: GovernmentPositionDefinition
  tenure: {
    termNumber?: number
    startDate: string
    endDate?: string
    showPositionInfo?: boolean
  }
  country: {
    id: string
    name: string
  }
}

/**
 * 사건 기간과 겹치는 국가 원수를 찾는 함수
 * @param eventStartDate 사건 시작일
 * @param eventEndDate 사건 종료일 (없으면 시작일만 사용)
 * @param persons 모든 인물 목록 (governmentPositions 포함)
 * @param positionTypeFilter 직업 필터 (선택사항)
 * @param excludePositionDefinitionIds 이 ID 목록에 있는 직책(예: 교황)은 제외
 * @returns 해당 기간에 집권했던 국가 원수 목록
 */
export function findHeadsOfStateDuringPeriod(
  eventStartDate: string,
  eventEndDate: string | undefined,
  persons: any[],
  positionTypeFilter?: string,
  excludePositionDefinitionIds?: readonly string[],
): HeadOfStateDuringEvent[] {
  const result: HeadOfStateDuringEvent[] = []
  const eventStart = new Date(eventStartDate)
  const eventEnd = eventEndDate ? new Date(eventEndDate) : eventStart

  const pushPerson = (
    person: any,
    entry: Omit<HeadOfStateDuringEvent, 'person'> & { person?: any },
  ) => {
    const basePerson = {
      id: person.id,
      name: person.name,
      surname: person.surname,
      profileImageUrl: person.profileImageUrl,
      birthEra: person.birthEra ?? null,
      birthYear: person.birthYear ?? null,
      birthMonth: person.birthMonth ?? null,
      birthDay: person.birthDay ?? null,
      birthDate: person.birthDate ?? null,
      deathEra: person.deathEra ?? null,
      deathYear: person.deathYear ?? null,
      deathMonth: person.deathMonth ?? null,
      deathDay: person.deathDay ?? null,
      deathDate: person.deathDate ?? null,
      governmentPositions: person.governmentPositions ?? [],
    }
    result.push({ ...entry, person: basePerson })
  }

  const isOverlapping = (start: Date, end: Date | null) =>
    (start <= eventEnd && (!end || end >= eventStart)) ||
    (eventStart <= end! && eventEnd >= start)

    persons.forEach((person) => {
    // 1) 재임 기록 (GovernmentPositionTenure) — 사건 페이지 노출 체크된 것만
    if (person.governmentPositions?.length > 0) {
      person.governmentPositions.forEach((tenure: any) => {
        if (tenure.showPositionInfo === false) return
        if (excludePositionDefinitionIds?.length) {
          const posDefId = tenure.positionDefinition?.id ?? tenure.positionDefinitionId
          if (posDefId && excludePositionDefinitionIds.includes(posDefId)) return
        }
        if (positionTypeFilter && positionTypeFilter !== 'all') {
          if (tenure.positionType !== positionTypeFilter) return
        } else {
          if (tenure.positionType !== 'HEAD_OF_STATE') return
        }
        const tenureStart = new Date(tenure.startDate)
        const tenureEnd = tenure.endDate ? new Date(tenure.endDate) : new Date()
        if (!isOverlapping(tenureStart, tenure.endDate ? tenureEnd : null))
          return
        const country = tenure.country || tenure.historicalCountry
        const countryLabel = country
          ? { id: country.id, name: country.name }
          : {
              id: 'global',
              name:
                tenure.positionDefinition?.title ||
                tenure.title ||
                '전역',
            }
        pushPerson(person, {
            position: {
              id: tenure.id,
              title: tenure.title,
              titleEn: tenure.titleEn,
              positionType: tenure.positionType,
              rank: tenure.priority || 0,
            },
            tenure: {
              termNumber: tenure.termNumber,
              startDate: tenure.startDate,
              endDate: tenure.endDate,
              showPositionInfo: tenure.showPositionInfo,
            },
            country: countryLabel,
          })
      })
    }
    // 사건 페이지는 연대표(국가 페이지)에 등록한 수반(GovernmentPositionTenure)만 사용.
    // 정부/공무원 경력(GovernmentCareer)은 사용하지 않음.
  })

  return result.sort(
    (a, b) =>
      new Date(a.tenure.startDate).getTime() -
      new Date(b.tenure.startDate).getTime(),
  )
}
