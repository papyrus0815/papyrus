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
  departmentName?: string
  countryId?: string
  historicalCountryId?: string
  country?: {
    id: string
    name: string
  }
  historicalCountry?: {
    id: string
    name: string
  }
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
  }
  position: GovernmentPositionDefinition
  tenure: {
    termNumber?: number
    startDate: string
    endDate?: string
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
 * @returns 해당 기간에 집권했던 국가 원수 목록
 */
export function findHeadsOfStateDuringPeriod(
  eventStartDate: string,
  eventEndDate: string | undefined,
  persons: any[],
  positionTypeFilter?: string,
): HeadOfStateDuringEvent[] {
  const result: HeadOfStateDuringEvent[] = []
  const eventStart = new Date(eventStartDate)
  const eventEnd = eventEndDate ? new Date(eventEndDate) : eventStart

  persons.forEach((person) => {
    if (
      !person.governmentPositions ||
      person.governmentPositions.length === 0
    ) {
      return
    }

    person.governmentPositions.forEach((tenure: any) => {
      // 직업 타입 필터링
      if (positionTypeFilter && positionTypeFilter !== 'all') {
        if (tenure.position?.positionType !== positionTypeFilter) {
          return
        }
      } else {
        // 필터가 없으면 국가 원수만 필터링 (기본 동작)
        if (tenure.position?.positionType !== 'HEAD_OF_STATE') {
          return
        }
      }

      const tenureStart = new Date(tenure.startDate)
      const tenureEnd = tenure.endDate ? new Date(tenure.endDate) : new Date()

      // 기간이 겹치는지 확인
      const isOverlapping =
        (tenureStart <= eventEnd &&
          (!tenure.endDate || tenureEnd >= eventStart)) ||
        (eventStart <= tenureEnd && eventEnd >= tenureStart)

      if (isOverlapping) {
        const country =
          tenure.position.country || tenure.position.historicalCountry

        if (country) {
          result.push({
            person: {
              id: person.id,
              name: person.name,
              surname: person.surname,
              profileImageUrl: person.profileImageUrl,
            },
            position: tenure.position,
            tenure: {
              termNumber: tenure.termNumber,
              startDate: tenure.startDate,
              endDate: tenure.endDate,
            },
            country: {
              id: country.id,
              name: country.name,
            },
          })
        }
      }
    })
  })

  // 시작일 기준으로 정렬
  return result.sort((a, b) => {
    return (
      new Date(a.tenure.startDate).getTime() -
      new Date(b.tenure.startDate).getTime()
    )
  })
}
