import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import {
  PersonRecordItemDto,
  PersonRecordKind,
  PersonRecordsCompareResponseDto,
  PersonRecordsPersonDto,
} from '../presentation/dto/person-records-compare.response'

/** 한 번에 비교할 수 있는 인물 수 상한 (read-union 비용 가드) */
export const PERSON_RECORDS_COMPARE_MAX_PERSONS = 12

const SUMMARY_LIMIT = 200

const ALL_SOURCES: PersonRecordKind[] = [
  'LIFE_EVENT',
  'TENURE',
  'REIGN',
  'ACHIEVEMENT',
  'EVENT',
  'AWARD',
]

/** HTML 서술 → 공백 축약 plain text 200자. 빈 결과는 null */
function toPlainSummary(html?: string | null): string | null {
  if (!html) return null
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  return text.length > SUMMARY_LIMIT ? `${text.slice(0, SUMMARY_LIMIT)}…` : text
}

/**
 * plain text 서술 → 공백 축약 200자. 빈 결과는 null.
 * appointmentDetail 등 Textarea 저작 원문에 toPlainSummary(HTML 스트리퍼)를 쓰면
 * 사용자가 문자 그대로 적은 꺾쇠 구간(<조지 5세> 등)이 태그로 오인·소실되므로 분리.
 */
function toPlainTextSummary(text?: string | null): string | null {
  if (!text) return null
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return normalized.length > SUMMARY_LIMIT
    ? `${normalized.slice(0, SUMMARY_LIMIT)}…`
    : normalized
}

function yearOf(date?: Date | null): number | null {
  return date ? date.getUTCFullYear() : null
}

/**
 * Person 생몰 하이브리드(era 플래그 + 크기값 DATETIME) → 부호 연도.
 * BC 44 → era=BC, DATETIME 연도 44 로 저장돼 있으므로 부호만 뒤집는다.
 */
function signedYearFromEraDate(
  era?: string | null,
  date?: Date | null,
): number | null {
  const year = yearOf(date)
  if (year == null) return null
  return era === 'BC' ? -year : year
}

/** Event 구조화 필드 우선, 없으면 DATETIME 연도 (event.prisma:252-273 계약) */
function signedYearFromEvent(
  era: string | null,
  structuredYear: number | null,
  date: Date | null,
): number | null {
  if (structuredYear != null) return era === 'BC' ? -structuredYear : structuredYear
  return yearOf(date)
}

function isoOf(date?: Date | null): string | null {
  return date ? date.toISOString() : null
}

interface CompareParams {
  personIds: string[]
  fromYear: number | null
  /** exclusive */
  toYear: number | null
  sources: PersonRecordKind[] | null
  /** 요청 계정 — 연보(LIFE_EVENT) own-only 스코프에 사용 */
  accountId: string
}

/**
 * 인물 통합 기록 비교 읽기모델.
 *
 * 스키마 변경 0 — 기존 5개 채널을 읽기 시점에 union하고 부호 연도로 정규화한다.
 * 성능이 실측으로 문제 되면 이 서비스 내부를 프로젝션 테이블 구현으로 교체할 수 있도록
 * 응답 계약(PersonRecordsCompareResponseDto)은 구현 은닉적으로 유지한다.
 */
@Injectable()
export class PersonRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async compare(params: CompareParams): Promise<PersonRecordsCompareResponseDto> {
    const personIds = [...new Set(params.personIds)]
    const sources = params.sources?.length ? params.sources : ALL_SOURCES
    const wants = (kind: PersonRecordKind) => sources.includes(kind)
    const { fromYear, toYear, accountId } = params

    const [persons, lifeEvents, tenures, reigns, tenureAchievements, reignAchievements, personEvents, awards] =
      await Promise.all([
        this.prisma.person.findMany({
          where: { id: { in: personIds } },
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            birthEra: true,
            birthDate: true,
            deathEra: true,
            deathDate: true,
          },
        }),
        wants('LIFE_EVENT')
          ? this.prisma.personLifeEvent.findMany({
              // v1 스코프: 본인 계정 등록분만 — 무인증/전역 노출 정책을 선점하지 않는다
              where: { personId: { in: personIds }, accountId },
            })
          : Promise.resolve([]),
        wants('TENURE')
          ? this.prisma.governmentPositionTenure.findMany({
              where: { personId: { in: personIds } },
              include: {
                positionDefinition: { select: { title: true } },
                country: { select: { name: true } },
                historicalCountry: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
        wants('REIGN')
          ? this.prisma.sovereignReign.findMany({
              where: { personId: { in: personIds } },
              include: {
                positionDefinition: { select: { title: true, positionType: true } },
                country: { select: { name: true } },
                historicalCountry: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
        wants('ACHIEVEMENT')
          ? this.prisma.tenureAchievement.findMany({
              where: { tenure: { personId: { in: personIds } } },
              include: {
                tenure: {
                  select: {
                    personId: true,
                    startDate: true,
                    endDate: true,
                    country: { select: { name: true } },
                    historicalCountry: { select: { name: true } },
                  },
                },
              },
            })
          : Promise.resolve([]),
        wants('ACHIEVEMENT')
          ? this.prisma.sovereignReignAchievement.findMany({
              where: { sovereignReign: { personId: { in: personIds } } },
              include: {
                sovereignReign: {
                  select: {
                    personId: true,
                    startDate: true,
                    endDate: true,
                    country: { select: { name: true } },
                    historicalCountry: { select: { name: true } },
                  },
                },
              },
            })
          : Promise.resolve([]),
        wants('EVENT')
          ? this.prisma.personEvent.findMany({
              where: { personId: { in: personIds }, event: { deletedAt: null } },
              include: {
                event: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    startDate: true,
                    startDatePrecision: true,
                    startEra: true,
                    startYear: true,
                    endDate: true,
                    endEra: true,
                    endYear: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        wants('AWARD')
          ? this.prisma.personAward.findMany({
              where: { personId: { in: personIds } },
            })
          : Promise.resolve([]),
      ])

    const records: PersonRecordItemDto[] = []

    for (const row of lifeEvents) {
      records.push({
        kind: 'LIFE_EVENT',
        sourceId: row.id,
        personId: row.personId,
        title: row.title,
        summary: toPlainSummary(row.description),
        category: row.category ?? null,
        startYear: yearOf(row.startDate),
        endYear: yearOf(row.endDate),
        ongoing: false,
        startDate: isoOf(row.startDate),
        endDate: isoOf(row.endDate),
        precision: row.startDatePrecision ?? null,
        linkEventId: null,
        countryName: null,
        role: null,
      })
    }

    for (const row of tenures) {
      const baseTitle =
        row.positionDefinition?.title ?? row.title ?? row.positionType
      records.push({
        kind: 'TENURE',
        sourceId: row.id,
        personId: row.personId,
        title: row.termNumber != null ? `제${row.termNumber}대 ${baseTitle}` : baseTitle,
        summary: toPlainTextSummary(row.appointmentDetail),
        category: row.positionType,
        startYear: yearOf(row.startDate),
        endYear: yearOf(row.endDate),
        ongoing: row.endDate == null,
        startDate: isoOf(row.startDate),
        endDate: isoOf(row.endDate),
        precision: null,
        linkEventId: null,
        countryName: row.country?.name ?? row.historicalCountry?.name ?? null,
        role: null,
      })
    }

    for (const row of reigns) {
      const positionTitle = row.positionDefinition?.title ?? '군주'
      records.push({
        kind: 'REIGN',
        sourceId: row.id,
        personId: row.personId,
        title: row.regnalName
          ? `${row.regnalName} · ${positionTitle} 재위`
          : `${positionTitle} 재위`,
        summary: toPlainTextSummary(row.appointmentDetail),
        category: row.positionDefinition?.positionType ?? 'HEAD_OF_STATE',
        startYear: yearOf(row.startDate),
        endYear: yearOf(row.endDate),
        ongoing: row.endDate == null,
        startDate: isoOf(row.startDate),
        endDate: isoOf(row.endDate),
        precision: null,
        linkEventId: null,
        countryName: row.country?.name ?? row.historicalCountry?.name ?? null,
        role: null,
      })
    }

    // 업적: 자체 날짜가 없으면 부모 재임/재위 기간을 상속(그 재임 중의 일이라는 계약)
    for (const row of tenureAchievements) {
      const hasOwnDates = row.startDate != null || row.endDate != null
      const startDate = hasOwnDates ? row.startDate : row.tenure.startDate
      const endDate = hasOwnDates ? row.endDate : row.tenure.endDate
      records.push({
        kind: 'ACHIEVEMENT',
        sourceId: row.id,
        personId: row.tenure.personId,
        title: row.title,
        summary: toPlainSummary(row.description),
        category: null,
        startYear: yearOf(startDate),
        endYear: yearOf(endDate),
        ongoing: !hasOwnDates && row.tenure.endDate == null,
        startDate: isoOf(startDate),
        endDate: isoOf(endDate),
        precision: null,
        linkEventId: row.eventId ?? null,
        countryName:
          row.tenure.country?.name ?? row.tenure.historicalCountry?.name ?? null,
        role: null,
      })
    }

    for (const row of reignAchievements) {
      const hasOwnDates = row.startDate != null || row.endDate != null
      const startDate = hasOwnDates ? row.startDate : row.sovereignReign.startDate
      const endDate = hasOwnDates ? row.endDate : row.sovereignReign.endDate
      records.push({
        kind: 'ACHIEVEMENT',
        sourceId: row.id,
        personId: row.sovereignReign.personId,
        title: row.title,
        summary: toPlainSummary(row.description),
        category: null,
        startYear: yearOf(startDate),
        endYear: yearOf(endDate),
        ongoing: !hasOwnDates && row.sovereignReign.endDate == null,
        startDate: isoOf(startDate),
        endDate: isoOf(endDate),
        precision: null,
        linkEventId: row.eventId ?? null,
        countryName:
          row.sovereignReign.country?.name ??
          row.sovereignReign.historicalCountry?.name ??
          null,
        role: null,
      })
    }

    for (const row of personEvents) {
      const event = row.event
      records.push({
        kind: 'EVENT',
        sourceId: row.id,
        personId: row.personId,
        title: event.title,
        summary: toPlainSummary(event.description),
        category: null,
        startYear: signedYearFromEvent(event.startEra, event.startYear, event.startDate),
        endYear: signedYearFromEvent(event.endEra, event.endYear, event.endDate),
        ongoing: false,
        startDate: isoOf(event.startDate),
        endDate: isoOf(event.endDate),
        precision: event.startDatePrecision ?? null,
        linkEventId: event.id,
        countryName: null,
        role: row.role ?? null,
      })
    }

    for (const row of awards) {
      records.push({
        kind: 'AWARD',
        sourceId: row.id,
        personId: row.personId,
        title: row.category ? `${row.awardName} (${row.category})` : row.awardName,
        summary: toPlainSummary(row.description) ?? row.awardingBody ?? null,
        category: row.category ?? null,
        startYear: yearOf(row.awardDate),
        endYear: null,
        ongoing: false,
        startDate: isoOf(row.awardDate),
        endDate: null,
        precision: null,
        linkEventId: null,
        countryName: null,
        role: null,
      })
    }

    const hasRange = fromYear != null || toYear != null
    const undatedCountByPerson = new Map<string, number>()
    const filtered = records.filter((record) => {
      const rangeStart = record.startYear ?? record.endYear
      const rangeEnd = record.ongoing
        ? Number.POSITIVE_INFINITY
        : (record.endYear ?? record.startYear)
      if (rangeStart == null && !record.ongoing) {
        if (!hasRange) return true
        undatedCountByPerson.set(
          record.personId,
          (undatedCountByPerson.get(record.personId) ?? 0) + 1,
        )
        return false
      }
      if (fromYear != null && rangeEnd != null && rangeEnd < fromYear) return false
      if (toYear != null && rangeStart != null && rangeStart >= toYear) return false
      return true
    })

    const byPerson = new Map<string, PersonRecordItemDto[]>()
    for (const record of filtered) {
      const list = byPerson.get(record.personId)
      if (list) list.push(record)
      else byPerson.set(record.personId, [record])
    }

    const sortKey = (record: PersonRecordItemDto): number =>
      record.startYear ?? record.endYear ?? Number.POSITIVE_INFINITY

    const personById = new Map(persons.map((person) => [person.id, person]))
    const resultPersons: PersonRecordsPersonDto[] = []
    const missingPersonIds: string[] = []
    for (const personId of personIds) {
      const person = personById.get(personId)
      if (!person) {
        missingPersonIds.push(personId)
        continue
      }
      const personRecords = (byPerson.get(personId) ?? []).sort(
        (left, right) =>
          sortKey(left) - sortKey(right) || left.title.localeCompare(right.title, 'ko'),
      )
      resultPersons.push({
        person: {
          id: person.id,
          name: person.name,
          surname: person.surname ?? null,
          middleName: person.middleName ?? null,
          nameDisplayOrder: person.nameDisplayOrder ?? null,
          birthYear: signedYearFromEraDate(person.birthEra, person.birthDate),
          deathYear: signedYearFromEraDate(person.deathEra, person.deathDate),
        },
        records: personRecords,
        undatedCount: undatedCountByPerson.get(personId) ?? 0,
      })
    }

    return {
      meta: {
        lifeEventScope: 'OWN_ACCOUNT_ONLY',
        fromYear,
        toYear,
        sources,
        missingPersonIds,
      },
      persons: resultPersons,
    }
  }
}
