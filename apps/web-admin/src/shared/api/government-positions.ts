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
    // 1) 재임 기록 (GovernmentPositionTenure)
    if (person.governmentPositions?.length > 0) {
      person.governmentPositions.forEach((tenure: any) => {
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
        if (country) {
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
            country: { id: country.id, name: country.name },
          })
        }
      })
    }

    // 2) 정부/공무원 경력 (GovernmentCareer) - "직책 정보 표시" 체크된 것만
    const careers = person.governmentCareers ?? []
    careers.forEach((career: any) => {
      if (career.showPositionInfo === false) return
      const careerStart = career.startDate ? new Date(career.startDate) : null
      if (!careerStart || isNaN(careerStart.getTime())) return
      const careerEnd = career.endDate ? new Date(career.endDate) : null
      if (!isOverlapping(careerStart, careerEnd)) return
      const country = career.country
      if (!country) return
      const title =
        career.roleTitle ||
        career.timelineTitle ||
        career.position?.title ||
        '직책'
      // 직급(Job)이 "대통령"이거나 제목에 국가원수 직함이 있으면 HEAD_OF_STATE (사건 페이지 필터/노출용)
      const positionTitle = (career.position?.title || '').trim()
      const titleStr = (title || '').trim()
      const titleLower = titleStr.toLowerCase()
      const isHeadOfState =
        positionTitle === '대통령' ||
        /대통령|국왕|황제|천황|emperor|king|president|head of state/i.test(
          titleLower,
        ) ||
        /제\s*\d+\s*대\s*대통령/.test(titleStr)
      const positionType = isHeadOfState
        ? GovernmentPositionType.HEAD_OF_STATE
        : GovernmentPositionType.CABINET_MINISTER
      if (
        positionTypeFilter &&
        positionTypeFilter !== 'all' &&
        positionType !== positionTypeFilter
      )
        return
      pushPerson(person, {
        position: {
          id: career.positionId || career.id,
          title,
          titleEn: undefined,
          positionType,
          rank: 0,
        },
        tenure: {
          termNumber: career.termNumber,
          startDate: career.startDate,
          endDate: career.endDate ?? undefined,
          showPositionInfo: career.showPositionInfo !== false,
        },
        country: { id: country.id, name: country.name },
      })
    })
  })

  return result.sort(
    (a, b) =>
      new Date(a.tenure.startDate).getTime() -
      new Date(b.tenure.startDate).getTime(),
  )
}
