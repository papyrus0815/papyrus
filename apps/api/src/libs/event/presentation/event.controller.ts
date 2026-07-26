import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  Patch,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  EventLinkCandidateDto,
} from './dto'
import { Event } from '../domain/event.entity'
import { PrismaClient } from '@prisma/client'
import { resolveLinkedHistoricalCountryIds } from '../../country/domain/country-scope.util'

/** 사건 날짜 구조화 파싱 결과 */
interface ParsedEventDate {
  /** 저장가능 DateTime — AD 1000~9999일 때만, 그 외(BC·고대)는 null */
  date: Date | null
  era: 'BC' | 'AD'
  year: number
  month: number
  day: number
}

/**
 * ISO(음수 BC 포함) 날짜 문자열 → 구조화 표현.
 * MySQL DATETIME은 1000~9999년만 저장 가능하므로, BC·고대(연<1000)는 date=null로 두고
 * 구조화 필드(era/year/month/day)만 채운다(응답에서 이 필드로 재구성).
 * 입력이 없거나 파싱 불가면 undefined(필드 미변경 의미).
 */
function parseEventDate(iso?: string | null): ParsedEventDate | undefined {
  if (!iso) return undefined
  const neg = iso.startsWith('-')
  const body = neg ? iso.slice(1) : iso
  const m = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  let year: number
  let month: number
  let day: number
  if (m) {
    year = parseInt(m[1], 10)
    month = parseInt(m[2], 10)
    day = parseInt(m[3], 10)
  } else {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return undefined
    year = Math.abs(d.getUTCFullYear())
    month = d.getUTCMonth() + 1
    day = d.getUTCDate()
  }
  const era: 'BC' | 'AD' = neg ? 'BC' : 'AD'
  const date =
    !neg && year >= 1000 && year <= 9999 ? new Date(Date.UTC(year, month - 1, day)) : null
  return { date, era, year, month, day }
}

/**
 * 응답용 날짜 문자열 재구성. 저장 DateTime이 있으면 기존 동작 보존(toISOString),
 * 없으면 구조화 필드로 ISO(음수=BC) 재구성. 둘 다 없으면 null.
 */
function formatEventDate(
  date: Date | string | null | undefined,
  era: 'BC' | 'AD' | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string | null {
  if (date) {
    if (typeof (date as Date).toISOString === 'function') return (date as Date).toISOString()
    return date as string // 이미 문자열로 들어온 경우
  }
  if (year == null) return null
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month ?? 1).padStart(2, '0')
  const dd = String(day ?? 1).padStart(2, '0')
  return `${era === 'BC' ? '-' : ''}${yyyy}-${mm}-${dd}`
}

/** 방문(놀러가기)용 사건 카드 — 제목·날짜·카테고리만(상세·본문·하위사건·이미지 미개방, 읽기전용) */
export interface VisitedEventCardDto {
  id: string
  title: string
  startEra: string | null
  startYear: number | null
  startDate: string | null
  categoryName: string | null
}

@ApiTags('events')
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly militaryEventService: MilitaryEventService,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * Event 엔티티를 EventResponseDto로 변환
   * @param event Event 엔티티
   * @returns EventResponseDto
   */
  private toResponseDto(event: any): EventResponseDto {
    // EventSection 변환
    const eventSections = event.eventSections?.map((section: any) => ({
      id: section.id,
      title: section.title,
      content: section.content,
      order: section.order,
      sectionType: section.sectionType,
    }))

    // EventImage 변환
    const eventImages = event.eventImages?.map((image: any) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      caption: image.caption,
      source: image.source,
      order: image.order,
      isPrimary: image.isPrimary,
    }))

    // 썸네일: isPrimary=true인 이미지 URL
    const thumbnail = eventImages?.find((img: any) => img.isPrimary)?.imageUrl || null

    // 계층 연결 사유 맵 — 상세(loadEventDetail)에서만 로드되므로 미로드 시 빈 맵(사유 undefined).
    //  · reasonByParentId: 이 사건이 자식인 쌍의 상위별 사유(주 상위·추가 상위 표시)
    //  · reasonByChildId:  이 사건이 부모인 쌍의 자식별 사유(하위 카드·추가 하위 표시)
    const reasonByParentId = new Map<string, string>()
    if (Array.isArray(event.hierarchyReasonsAsChild)) {
      for (const row of event.hierarchyReasonsAsChild) {
        reasonByParentId.set(row.parentEventId, row.reason)
      }
    }
    const reasonByChildId = new Map<string, string>()
    if (Array.isArray(event.hierarchyReasonsAsParent)) {
      for (const row of event.hierarchyReasonsAsParent) {
        reasonByChildId.set(row.childEventId, row.reason)
      }
    }

    // 관련 국가 정보 추출
    const relatedCountryIds: string[] = []
    const relatedHistoricalCountryIds: string[] = []
    const relatedCountries: any[] = []
    const relatedHistoricalCountries: any[] = []
    
    if (event.countryRelations && Array.isArray(event.countryRelations)) {
      event.countryRelations.forEach((relation: any) => {
        if (relation.countryId && relation.country) {
          relatedCountryIds.push(relation.countryId)
          relatedCountries.push({
            id: relation.country.id,
            name: relation.country.name,
            flagEmoji: relation.country.flagEmoji,
            // 사건 내 역할 — Timeline 등에서 대표 국가 선정에 사용 (INITIATOR > TARGET ...)
            role: relation.role ?? null,
          })
        }
        if (relation.historicalCountryId && relation.historicalCountry) {
          relatedHistoricalCountryIds.push(relation.historicalCountryId)
          relatedHistoricalCountries.push({
            id: relation.historicalCountry.id,
            name: relation.historicalCountry.name,
            role: relation.role ?? null,
          })
        }
      })
    }

    // F17: 본체 historicalCountryId(주 무대 역사국가)를 관련 역사국가 표시 목록에
    // dedup 합류. event_country_relation 행 없이 본체 FK만 지정된(시드 전용) 자식 사건도
    // 상세 히어로·행위자 칩에 국가 귀속이 표시되도록 한다. 이름 표기를 위해
    // historicalCountry relation이 include된 응답 경로에서만 합류한다.
    if (
      event.historicalCountry &&
      event.historicalCountryId &&
      !relatedHistoricalCountryIds.includes(event.historicalCountryId)
    ) {
      relatedHistoricalCountryIds.push(event.historicalCountryId)
      relatedHistoricalCountries.push({
        id: event.historicalCountry.id,
        name: event.historicalCountry.name,
        role: null,
      })
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: formatEventDate(event.startDate, event.startEra, event.startYear, event.startMonth, event.startDay),
      startDatePrecision: event.startDatePrecision ?? null,
      endDate: formatEventDate(event.endDate, event.endEra, event.endYear, event.endMonth, event.endDay),
      endDatePrecision: event.endDatePrecision ?? null,
      location: event.location,
      categoryId: event.categoryId,
      category: event.category ? {
        id: event.category.id,
        name: event.category.name,
        description: event.category.description,
      } : undefined,
      background: event.background,
      aftermath: event.aftermath,
      parentEventId: event.parentEventId,
      // 소프트삭제된(유령) 부모는 breadcrumb·상위 링크에 노출하지 않는다 — link-candidates의
      // liveParent 정책과 통일. deletedAt은 include된 parentEvent에 실려온다(select 시엔 undefined라
      // 통과). 재귀 호출이 조상 각 단계에도 같은 게이트를 적용한다.
      parentEvent:
        event.parentEvent && !event.parentEvent.deletedAt
          ? this.toResponseDto(event.parentEvent)
          : undefined,
      // 주 상위 연결 사유 — 쌍(this, parentEventId). 상세에서만 실린다(미로드 시 undefined).
      parentLinkReason: event.parentEventId
        ? (reasonByParentId.get(event.parentEventId) ?? undefined)
        : undefined,
      // 자식 원소에 (child, this) 쌍의 사유를 부착 — 쌍 스코프라 재귀 매퍼가 아니라 여기서.
      childEvents: event.childEvents
        ? event.childEvents.map((child: any) => ({
            ...this.toResponseDto(child),
            reason: reasonByChildId.get(child.id) ?? undefined,
          }))
        : undefined,
      // 추가 상위/하위(EventParentLink) — include된 응답 경로(상세)에서만 실린다.
      // conditional 필수: 이 매퍼는 목록·후보 등이 공유하므로 무조건 ?? []는 목록 payload를
      // 오염시키고, 프론트 낙관 갱신이 '[] = 없음'과 '미로드'를 구분 못 하게 된다.
      // 소프트삭제된 상대는 게이트(유령 주 상위 null 정책 승계). 사유는 방출되는 링크 객체에만.
      extraParents: Array.isArray(event.extraParentLinks)
        ? event.extraParentLinks
            .filter((link: any) => link.parentEvent && !link.parentEvent.deletedAt)
            .map((link: any) => ({
              id: link.parentEvent.id,
              title: link.parentEvent.title,
              reason: reasonByParentId.get(link.parentEvent.id) ?? undefined,
            }))
        : undefined,
      extraChildren: Array.isArray(event.extraChildLinks)
        ? event.extraChildLinks
            .filter((link: any) => link.childEvent && !link.childEvent.deletedAt)
            .map((link: any) => ({
              id: link.childEvent.id,
              title: link.childEvent.title,
              reason: reasonByChildId.get(link.childEvent.id) ?? undefined,
            }))
        : undefined,
      keywords: event.keywords != null ? (Array.isArray(event.keywords) ? event.keywords : []) : null,
      cityId: event.cityId,
      city: event.city
        ? { id: event.city.id, name: event.city.name }
        : null,
      administrativeDivisionId: event.administrativeDivisionId,
      administrativeDivision: event.administrativeDivision
        ? {
            id: event.administrativeDivision.id,
            name: event.administrativeDivision.name,
          }
        : null,
      historicalCountryId: event.historicalCountryId,
      eventSections: eventSections,
      eventImages: eventImages,
      thumbnail: thumbnail,
      relatedCountryIds: relatedCountryIds.length > 0 ? relatedCountryIds : undefined,
      relatedHistoricalCountryIds: relatedHistoricalCountryIds.length > 0 ? relatedHistoricalCountryIds : undefined,
      relatedCountries: relatedCountries.length > 0 ? relatedCountries : undefined,
      relatedHistoricalCountries: relatedHistoricalCountries.length > 0 ? relatedHistoricalCountries : undefined,
      // 참여 인물(PersonEvent) — 인물 시점 role/note(장문) 포함
      relatedPersons: Array.isArray(event.persons) && event.persons.length > 0
        ? event.persons.map((pe: any) => ({
            id: pe.id,
            personId: pe.personId,
            role: pe.role ?? null,
            note: pe.note ?? null,
            person: pe.person
              ? {
                  id: pe.person.id,
                  name: pe.person.name ?? null,
                  surname: pe.person.surname ?? null,
                  middleName: pe.person.middleName ?? null,
                  profileImageUrl: pe.person.profileImageUrl ?? null,
                  nameDisplayOrder: pe.person.nameDisplayOrder ?? null,
                  country: pe.person.country
                    ? {
                        defaultNameDisplayOrder:
                          pe.person.country.defaultNameDisplayOrder ?? null,
                      }
                    : null,
                }
              : null,
          }))
        : undefined,
      warCost: event.warCost ?? null,
      cabinetEvents: event.cabinetEvents
        ? event.cabinetEvents.map((ce: any) => ({
            id: ce.id,
            cabinetId: ce.cabinetId,
            role: ce.role ?? null,
            note: ce.note ?? null,
            cabinet: ce.cabinet
              ? {
                  id: ce.cabinet.id,
                  name: ce.cabinet.name,
                  headTenure: ce.cabinet.headTenure
                    ? {
                        id: ce.cabinet.headTenure.id,
                        startDate: ce.cabinet.headTenure.startDate,
                        endDate: ce.cabinet.headTenure.endDate,
                        person: ce.cabinet.headTenure.person
                          ? {
                              id: ce.cabinet.headTenure.person.id,
                              name: ce.cabinet.headTenure.person.name,
                            }
                          : null,
                        country: ce.cabinet.headTenure.country
                          ? {
                              id: ce.cabinet.headTenure.country.id,
                              name: ce.cabinet.headTenure.country.name,
                              flagEmoji: ce.cabinet.headTenure.country.flagEmoji,
                            }
                          : null,
                        historicalCountry: ce.cabinet.headTenure.historicalCountry
                          ? {
                              id: ce.cabinet.headTenure.historicalCountry.id,
                              name: ce.cabinet.headTenure.historicalCountry.name,
                            }
                          : null,
                      }
                    : null,
                }
              : null,
          }))
        : undefined,
      createdAt: event.createdAt?.toISOString ? event.createdAt.toISOString() : event.createdAt,
      updatedAt: event.updatedAt?.toISOString ? event.updatedAt.toISOString() : event.updatedAt,
    }
  }

  /**
   * 모든 사건 조회 (페이징 + 다축 필터).
   *
   * 클라이언트 lens 칩(country/hcountry/category/decade/century/quality)을
   * 1:1로 매핑하기 위한 query 파라미터들. 모두 AND 결합. 누락 검사 플래그는
   * "true"/"1"만 의미 있음.
   *
   * @param offset 시작 위치 (기본값: 0)
   * @param limit 가져올 개수 (기본값: 20, 최대: 100)
   * @param countryId (legacy) 단일 국가 — 현대/역사적 양쪽 매칭
   * @param countryIds 쉼표 구분 현대 국가 id 목록 — 다중 OR
   * @param historicalCountryIds 쉼표 구분 역사 국가 id 목록 — 다중 OR
   * @param categoryId EventCategory.id 정확 매칭
   * @param decade 십년대 시작 연도 (예: "1860") — startDate ∈ [year, year+10)
   * @param century 세기 (예: "19") — startDate ∈ 해당 세기
   * @param hasNoDescription "true" 시 description이 null/빈 사건만
   * @param hasNoCountries "true" 시 countryRelations 비어있는 사건만
   * @param hasNoKeywords "true" 시 keywords 비어있는 사건만
   * @returns 사건 목록
   * @tag events
   */
  @Get()
  async getAllEvents(
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('createdSinceDays') createdSinceDays?: string,
    @Query('countryId') countryId?: string,
    @Query('countryIds') countryIds?: string,
    @Query('historicalCountryIds') historicalCountryIds?: string,
    @Query('categoryId') categoryId?: string,
    @Query('decade') decade?: string,
    @Query('century') century?: string,
    @Query('hasNoDescription') hasNoDescription?: string,
    @Query('hasNoCountries') hasNoCountries?: string,
    @Query('hasNoKeywords') hasNoKeywords?: string,
    @Request() req?: any,
  ): Promise<EventResponseDto[]> {
    const userId = req.user?.id || req.user?.sub // AuthGuard가 이미 인증 체크함
    const skip = offset ? parseInt(offset, 10) : 0
    const take = limit ? Math.min(parseInt(limit, 10), 100) : 20
    const sinceDays = createdSinceDays ? parseInt(createdSinceDays, 10) : undefined
    const createdAtGte =
      sinceDays != null && !Number.isNaN(sinceDays) && sinceDays > 0
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
        : undefined
    const filterCountryId =
      countryId && typeof countryId === 'string' && countryId.trim()
        ? countryId.trim()
        : undefined

    // 쉼표 구분 ids → 빈값 제거된 배열. 빈 배열은 undefined(필터 미적용).
    const splitIds = (raw?: string): string[] | undefined => {
      if (!raw) return undefined
      const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
      return parts.length > 0 ? parts : undefined
    }
    const countryIdList = splitIds(countryIds)
    const hCountryIdList = splitIds(historicalCountryIds)

    const isFlagOn = (raw?: string): boolean => raw === 'true' || raw === '1'

    // 시간 범위 — decade/century 동시 적용 가능 (양쪽 만족하는 교집합).
    const dateRange: { gte?: Date; lt?: Date } = {}
    if (decade) {
      const decadeNum = parseInt(decade, 10)
      if (!Number.isNaN(decadeNum)) {
        dateRange.gte = new Date(`${decadeNum}-01-01T00:00:00.000Z`)
        dateRange.lt = new Date(`${decadeNum + 10}-01-01T00:00:00.000Z`)
      }
    }
    if (century) {
      const centuryNum = parseInt(century, 10)
      if (!Number.isNaN(centuryNum)) {
        const startYear = (centuryNum - 1) * 100 + 1
        const endYear = centuryNum * 100 + 1
        const cGte = new Date(`${startYear}-01-01T00:00:00.000Z`)
        const cLt = new Date(`${endYear}-01-01T00:00:00.000Z`)
        // 교집합: 더 좁은 범위 채택
        dateRange.gte =
          dateRange.gte && dateRange.gte > cGte ? dateRange.gte : cGte
        dateRange.lt =
          dateRange.lt && dateRange.lt < cLt ? dateRange.lt : cLt
      }
    }

    console.log(
      `📄 사건 목록 조회: offset=${skip}, limit=${take}, ` +
        `createdSinceDays=${sinceDays ?? 'all'}, ` +
        `countryId=${filterCountryId ?? 'all'}, ` +
        `category=${categoryId ?? 'all'}, decade=${decade ?? '-'}, century=${century ?? '-'}`,
    )

    // countryRelations 단일 필터 — has-no-countries 우선(country 지정 + 빈 관계는
    // 항상 0이라 사용자의 has-no 명시 요청을 그대로 따른다).
    let countryRelationsFilter: Record<string, unknown> | undefined
    if (isFlagOn(hasNoCountries)) {
      countryRelationsFilter = { none: {} }
    } else {
      const countryRelationOr: Array<Record<string, unknown>> = []
      if (filterCountryId) {
        countryRelationOr.push({ countryId: filterCountryId })
        countryRelationOr.push({ historicalCountryId: filterCountryId })
        // F14: filterCountryId가 현대 국가이면 브리지로 연결된 역사국가도 합류시킨다
        // (예: 대한민국 → 조선). 현대국가 대시보드의 인물·선거·정당 카운트와 동일한
        // 소속 정의를 사건 카운트에도 적용해, 브리지 역사국가로 태그된 사건이 빠지지 않게 함.
        // filterCountryId가 역사 국가 id면 브리지 조회가 빈 배열이라 조건이 늘지 않음
        // (레거시 dual-match 동작 보존).
        const linkedHistoricalIds = await resolveLinkedHistoricalCountryIds(
          this.prisma,
          filterCountryId,
        )
        if (linkedHistoricalIds.length > 0) {
          countryRelationOr.push({
            historicalCountryId: { in: linkedHistoricalIds },
          })
        }
      }
      if (countryIdList) {
        countryRelationOr.push({ countryId: { in: countryIdList } })
      }
      if (hCountryIdList) {
        countryRelationOr.push({ historicalCountryId: { in: hCountryIdList } })
      }
      if (countryRelationOr.length > 0) {
        countryRelationsFilter = { some: { OR: countryRelationOr } }
      }
    }

    // 최상위 사건만 페이징 (본인이 등록한 것만, 삭제되지 않은 것만)
    const events = await this.prisma.event.findMany({
      where: {
        // 루트 판정 — INV-2("추가 상위는 주 상위 필수") 의존: 다중 상위가 생겨도
        // parentEventId IS NULL만이 루트다(EventParentLink는 루트에 존재 불가).
        parentEventId: null,
        createdById: userId,
        deletedAt: null,
        ...(createdAtGte && { createdAt: { gte: createdAtGte } }),
        ...(categoryId && { categoryId }),
        ...((dateRange.gte || dateRange.lt) && { startDate: dateRange }),
        ...(countryRelationsFilter && { countryRelations: countryRelationsFilter }),
        ...(isFlagOn(hasNoDescription) && {
          OR: [{ description: null }, { description: '' }],
        }),
        ...(isFlagOn(hasNoKeywords) && {
          // Json? 필드는 Prisma에서 equals: null만 안전. 빈 배열은 못잡음.
          keywords: { equals: null as any },
        }),
      },
      skip,
      take,
      orderBy: createdAtGte ? { createdAt: 'desc' } : { startDate: 'desc' },
      include: {
        category: true,
        // F17: 본체 historicalCountryId 표시용(관련 역사국가 목록에 dedup 합류)
        historicalCountry: { select: { id: true, name: true } },
        parentEvent: true,
        childEvents: {
          // 상세(loadEventDetail)와 동일 — 소프트 삭제된 자식 제외.
          where: { deletedAt: null },
          include: {
            category: true,
            historicalCountry: { select: { id: true, name: true } },
            eventSections: true,
            eventImages: true,
            // 손자(2단 하위) — 트리/목록의 3계층 표시용. 경량 include(category·역사국가만)로
            // 페이로드 팽창을 억제. 여기서 nested를 멈춰 depth 3(root→자식→손자)에서 캡한다.
            // toResponseDto가 childEvents를 재귀 매핑하므로 배선 불필요(손자의 childEvents는
            // include 안 해 undefined → 응답에서 자연히 종단).
            childEvents: {
              where: { deletedAt: null },
              include: {
                category: true,
                historicalCountry: { select: { id: true, name: true } },
              },
              orderBy: { startDate: 'asc' },
            },
          },
          orderBy: { startDate: 'asc' }, // 하위 사건 시간순 정렬
        },
        countryRelations: {
          include: {
            country: true,
            historicalCountry: true,
          },
          // role 미설정 데이터에서도 lane 배치가 안정적이도록 createdAt 오름차순 — items[0] 결정성 보장
          orderBy: { createdAt: 'asc' },
        },
        eventSections: {
          orderBy: { order: 'asc' },
        },
        eventImages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    console.log(`✅ ${events.length}개 최상위 사건 반환`)
    events.forEach(evt => {
      console.log(`   - ${evt.title}: ${evt.childEvents?.length || 0}개 하위 사건`)
    })
    
    return events.map((event) => this.toResponseDto(event as any))
  }

  /**
   * 사건 총 개수 — 현재 사용자의 최상위·미삭제 사건 수(선택 필터 반영).
   *
   * 목록 API(getAllEvents)는 배열만 반환하고 total을 주지 않아, 프론트의 "전체 N건"이
   * *로드된 수*에 불과했다. 이 엔드포인트로 권위 있는 총량을 노출한다. where 절은
   * getAllEvents의 서버측 스코프(parentEventId=null · createdById · deletedAt=null + 선택
   * 필터)와 일치시켜 "전체"의 의미가 목록 페이징 대상과 같도록 한다.
   *
   * ⚠️ 라우트는 반드시 @Get(':id')보다 먼저 선언 — 아니면 'count'가 :id로 매칭된다.
   * @returns { total } 총 개수
   * @tag events
   */
  @Get('count')
  async getEventsCount(
    @Query('countryId') countryId?: string,
    @Query('countryIds') countryIds?: string,
    @Query('historicalCountryIds') historicalCountryIds?: string,
    @Query('categoryId') categoryId?: string,
    @Query('decade') decade?: string,
    @Query('century') century?: string,
    @Query('createdSinceDays') createdSinceDays?: string,
    @Query('hasNoDescription') hasNoDescription?: string,
    @Query('hasNoCountries') hasNoCountries?: string,
    @Query('hasNoKeywords') hasNoKeywords?: string,
    @Request() req?: any,
  ): Promise<{ total: number }> {
    const userId = req.user?.id || req.user?.sub

    const sinceDays = createdSinceDays ? parseInt(createdSinceDays, 10) : undefined
    const createdAtGte =
      sinceDays != null && !Number.isNaN(sinceDays) && sinceDays > 0
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
        : undefined
    const filterCountryId =
      countryId && typeof countryId === 'string' && countryId.trim()
        ? countryId.trim()
        : undefined
    const splitIds = (raw?: string): string[] | undefined => {
      if (!raw) return undefined
      const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
      return parts.length > 0 ? parts : undefined
    }
    const countryIdList = splitIds(countryIds)
    const hCountryIdList = splitIds(historicalCountryIds)
    const isFlagOn = (raw?: string): boolean => raw === 'true' || raw === '1'

    const dateRange: { gte?: Date; lt?: Date } = {}
    if (decade) {
      const decadeNum = parseInt(decade, 10)
      if (!Number.isNaN(decadeNum)) {
        dateRange.gte = new Date(`${decadeNum}-01-01T00:00:00.000Z`)
        dateRange.lt = new Date(`${decadeNum + 10}-01-01T00:00:00.000Z`)
      }
    }
    if (century) {
      const centuryNum = parseInt(century, 10)
      if (!Number.isNaN(centuryNum)) {
        const startYear = (centuryNum - 1) * 100 + 1
        const endYear = centuryNum * 100 + 1
        const cGte = new Date(`${startYear}-01-01T00:00:00.000Z`)
        const cLt = new Date(`${endYear}-01-01T00:00:00.000Z`)
        dateRange.gte =
          dateRange.gte && dateRange.gte > cGte ? dateRange.gte : cGte
        dateRange.lt = dateRange.lt && dateRange.lt < cLt ? dateRange.lt : cLt
      }
    }

    let countryRelationsFilter: Record<string, unknown> | undefined
    if (isFlagOn(hasNoCountries)) {
      countryRelationsFilter = { none: {} }
    } else {
      const countryRelationOr: Array<Record<string, unknown>> = []
      if (filterCountryId) {
        countryRelationOr.push({ countryId: filterCountryId })
        countryRelationOr.push({ historicalCountryId: filterCountryId })
        // F14: 목록(getAllEvents)과 동일하게, 현대 국가면 브리지 연결 역사국가도 합류
        // (카운트가 목록과 어긋나지 않도록 스코프 일치). 역사 id면 조회 빈 배열이라 무변화.
        const linkedHistoricalIds = await resolveLinkedHistoricalCountryIds(
          this.prisma,
          filterCountryId,
        )
        if (linkedHistoricalIds.length > 0) {
          countryRelationOr.push({
            historicalCountryId: { in: linkedHistoricalIds },
          })
        }
      }
      if (countryIdList) {
        countryRelationOr.push({ countryId: { in: countryIdList } })
      }
      if (hCountryIdList) {
        countryRelationOr.push({ historicalCountryId: { in: hCountryIdList } })
      }
      if (countryRelationOr.length > 0) {
        countryRelationsFilter = { some: { OR: countryRelationOr } }
      }
    }

    const total = await this.prisma.event.count({
      where: {
        // 루트 판정 — INV-2 의존(getAllEvents와 동일 계약)
        parentEventId: null,
        createdById: userId,
        deletedAt: null,
        ...(createdAtGte && { createdAt: { gte: createdAtGte } }),
        ...(categoryId && { categoryId }),
        ...((dateRange.gte || dateRange.lt) && { startDate: dateRange }),
        ...(countryRelationsFilter && { countryRelations: countryRelationsFilter }),
        ...(isFlagOn(hasNoDescription) && {
          OR: [{ description: null }, { description: '' }],
        }),
        ...(isFlagOn(hasNoKeywords) && {
          keywords: { equals: null as any },
        }),
      },
    })

    return { total }
  }

  /**
   * 상위·하위 사건 연결 후보 검색 — 경량 응답.
   *
   * 연결 모달의 후보는 그간 목록 API(GET /events)를 재사용했는데, 그 API는
   * ① parentEventId=null(최상위만) ② take 캡 100이라 이미 하위인 사건·오래된 사건이
   * 검색에 안 잡히는 결함이 있었다. 이 엔드포인트는 *하위 사건 포함* 본인 소유
   * 미삭제 전체를 대상으로 title 부분일치 검색한다. q가 비면 최근 수정순 기본 목록.
   *
   * ⚠️ 라우트는 반드시 @Get(':id')보다 먼저 선언 — 아니면 'link-candidates'가 :id로 매칭된다.
   * @param q 사건명 부분일치 검색어 (비면 최근 수정순)
   * @param limit 가져올 개수 (기본 30, 최대 100)
   * @returns 경량 후보 목록 (id·제목·날짜·현재 상위 사건)
   * @tag events
   */
  @Get('link-candidates')
  async getEventLinkCandidates(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ): Promise<EventLinkCandidateDto[]> {
    const userId = req.user?.id || req.user?.sub
    const term = (q ?? '').trim()
    const parsedLimit = limit ? parseInt(limit, 10) : NaN
    const take = Number.isNaN(parsedLimit)
      ? 30
      : Math.min(Math.max(parsedLimit, 1), 100)

    const events = await this.prisma.event.findMany({
      where: {
        createdById: userId,
        deletedAt: null,
        ...(term && { title: { contains: term } }),
      },
      take,
      // 검색 시엔 시대순(내림), 기본 목록은 최근 손댄 순 — 방금 만든 사건을 바로 연결하는 흐름.
      // id 2차 정렬로 결정성 확보 — startDate/updatedAt 동률(특히 BC·미상 startDate=NULL이
      // 다수 동률)일 때 순서가 요청마다 뒤바뀌어 take 캡 경계에서 목록이 흔들리던 것 방지.
      orderBy: term
        ? [{ startDate: 'desc' }, { id: 'desc' }]
        : [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        startDate: true,
        startDatePrecision: true,
        endDate: true,
        endDatePrecision: true,
        startEra: true,
        startYear: true,
        endEra: true,
        endYear: true,
        parentEventId: true,
        parentEvent: { select: { title: true, deletedAt: true } },
        // 추가 상위 — 후보 배지 "(+N)"의 근거. liveParent와 동일 소프트삭제 게이트.
        extraParentLinks: {
          select: {
            parentEvent: { select: { id: true, title: true, deletedAt: true } },
          },
          orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        },
      },
    })

    return events.map((event) => {
      // 부모가 소프트 삭제됐으면 연결 UX상 무부모로 취급 — 삭제된 사건명을
      // "현재 X의 하위" 안내·이동 confirm에 생존 사건처럼 노출하지 않는다.
      const liveParent =
        event.parentEvent && !event.parentEvent.deletedAt ? event.parentEvent : null
      const liveExtraParents = event.extraParentLinks
        .filter((link) => !link.parentEvent.deletedAt)
        .map((link) => ({ id: link.parentEvent.id, title: link.parentEvent.title }))
      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate ? event.startDate.toISOString() : null,
        startDatePrecision: event.startDatePrecision,
        endDate: event.endDate ? event.endDate.toISOString() : null,
        endDatePrecision: event.endDatePrecision,
        startEra: event.startEra,
        startYear: event.startYear,
        endEra: event.endEra,
        endYear: event.endYear,
        parentEventId: liveParent ? event.parentEventId : null,
        parentEventTitle: liveParent?.title ?? null,
        extraParents: liveExtraParents.length > 0 ? liveExtraParents : undefined,
      }
    })
  }

  /**
   * 역사 속 오늘 — start_date의 월·일이 오늘과 같은 사건(연도 무관).
   *
   * 일(day) 정밀도 사건만 의미가 있어 start_date_precision='day'(또는 null=day로 간주)만 매칭한다.
   * MySQL DATETIME은 TZ 없이 저장값 그대로라 MONTH()/DAY()가 입력한 달력 날짜를 그대로 반환한다.
   * 사용자 로컬 기준 '오늘'이 서버와 다를 수 있어, 프론트가 month·day를 넘기면 그것을 우선한다.
   *
   * ⚠️ 라우트는 반드시 @Get(':id')보다 먼저 선언 — 아니면 'on-this-day'가 :id로 매칭된다.
   * @returns 오늘에 해당하는 최상위·미삭제 사건 목록(없으면 빈 배열)
   * @tag events
   */
  @Get('on-this-day')
  async getEventsOnThisDay(
    @Query('month') month?: string,
    @Query('day') day?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ): Promise<EventResponseDto[]> {
    const userId = req.user?.id || req.user?.sub

    const now = new Date()
    const parseInRange = (raw: string | undefined, fallback: number, max: number) => {
      const n = raw != null ? parseInt(raw, 10) : NaN
      return Number.isNaN(n) || n < 1 || n > max ? fallback : n
    }
    const targetMonth = parseInRange(month, now.getMonth() + 1, 12)
    const targetDay = parseInRange(day, now.getDate(), 31)
    const take = parseInRange(limit, 6, 50)

    // 월·일 매칭은 Prisma 쿼리 빌더로 불가 → 원시 SQL로 후보 ID만 추린 뒤
    // 표준 include로 본문을 채운다(toResponseDto 호환).
    // ⚠️ parent_event_id IS NULL 루트 판정은 INV-2("추가 상위는 주 상위 필수") 의존 —
    // raw SQL이라 컴파일러·camelCase grep 모두 못 잡는 유일 지점. 다중 상위 정책이
    // '주 상위 없는 추가 상위 허용'으로 바뀌면 이 쿼리는 조용히 틀린다
    // (docs/event-multi-parent-review.md §7 리스크 3).
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM event
      WHERE parent_event_id IS NULL
        AND created_by = ${userId}
        AND deleted_at IS NULL
        AND start_date IS NOT NULL
        AND (start_date_precision = 'day' OR start_date_precision IS NULL)
        AND MONTH(start_date) = ${targetMonth}
        AND DAY(start_date) = ${targetDay}
      ORDER BY start_date DESC
      LIMIT ${take}
    `

    const ids = rows.map((row) => row.id)
    if (ids.length === 0) return []

    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      include: {
        category: true,
        // F17: 본체 historicalCountryId 표시용(관련 역사국가 목록에 dedup 합류)
        historicalCountry: { select: { id: true, name: true } },
        parentEvent: true,
        childEvents: {
          include: {
            category: true,
            historicalCountry: { select: { id: true, name: true } },
            eventSections: true,
            eventImages: true,
          },
          orderBy: { startDate: 'asc' },
        },
        countryRelations: {
          include: { country: true, historicalCountry: true },
          orderBy: { createdAt: 'asc' },
        },
        eventSections: { orderBy: { order: 'asc' } },
        eventImages: { orderBy: { order: 'asc' } },
      },
    })

    // 원시 쿼리 정렬(start_date desc) 보존 — findMany의 in 순서는 비결정적
    const orderIndex = new Map(ids.map((id, index) => [id, index]))
    events.sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    )

    return events.map((event) => this.toResponseDto(event as any))
  }

  /**
   * 상위 사건의 하위 사건 목록 조회
   *
   * @param parentEventId 상위 사건 ID
   * @returns 하위 사건 목록
   * @tag events
   */
  @Get('parent/:parentEventId')
  async getEventsByParentId(
    @Param('parentEventId') parentEventId: string,
    @Request() req?: any,
  ): Promise<EventResponseDto[]> {
    const userId = req.user?.id // AuthGuard가 이미 인증 체크함
    
    // 상위 사건의 권한 체크
    const parentEvent = await this.prisma.event.findUnique({
      where: { id: parentEventId },
      select: { createdById: true },
    })
    
    if (!parentEvent) {
      throw new NotFoundException('상위 사건을 찾을 수 없습니다.')
    }

    if (parentEvent.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 사건의 하위 사건만 조회할 수 있습니다.')
    }
    
    const events = await this.eventService.getEventsByParentId(parentEventId)
    return events.map((event) => this.toResponseDto(event))
  }

  /**
   * 상세 응답 빌더 — GET·생성·수정이 *동일한 full-include + 군사정보*로 응답을
   * 만들도록 단일화한다. 생성/수정 직후에도 관계(인물·국가·섹션·이미지·카테고리)와
   * 군사 모듈이 모두 채워진 응답을 돌려줘, 프론트가 응답 시딩만으로 완전한 상세를
   * 렌더하게 한다(부분 응답 → refetch 도착 시 레이아웃 점프 방지).
   *
   * 권한 체크는 호출부 책임 — GET은 조회 권한, create/update는 이미 소유권을 확인했다.
   */
  private async loadEventDetail(
    id: string,
  ): Promise<{ event: any; response: EventResponseDto } | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        // F17: 본체 historicalCountryId 표시용(관련 역사국가 목록에 dedup 합류)
        historicalCountry: { select: { id: true, name: true } },
        // 위치 복원: 편집 폼 PlaceSelect 뱃지에 표시할 이름 (UUID만으론 부족)
        city: { select: { id: true, name: true } },
        administrativeDivision: { select: { id: true, name: true } },
        // 조상 breadcrumb용 — parentEvent를 여러 단계 중첩 로드(각 단계 scalar만).
        // 단일레벨(parentEvent: true)만 로드하면 히어로 breadcrumb의 조부모 체인·'…'
        // 말줄임이 죽은 코드가 된다(부모.parentEvent가 늘 undefined). 스칼라(제목·날짜·
        // deletedAt·parentEventId)만이라 페이로드 부담 작고, 소프트삭제 조상은 toResponseDto가
        // deletedAt로 null 처리한다. depth 4까지 로드해 CAP(3) 초과 시 '…' 표식이 뜬다.
        parentEvent: {
          include: {
            parentEvent: {
              include: {
                parentEvent: { include: { parentEvent: true } },
              },
            },
          },
        },
        // 추가 상위/하위(EventParentLink) — 평면 1단 요약만(id·title·deletedAt).
        // 주 상위 4단 중첩과 달리 조상 체인을 싣지 않는다 — k^4 조합 팽창 원천 차단.
        // 정렬 2키 = 칩 순서 결정성(연결 오래된 순, 승격 기본 제안 순서와 일치).
        extraParentLinks: {
          include: {
            parentEvent: { select: { id: true, title: true, deletedAt: true } },
          },
          orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        },
        extraChildLinks: {
          include: {
            childEvent: { select: { id: true, title: true, deletedAt: true } },
          },
          orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        },
        // 계층 연결 사유(EventHierarchyReason) — 쌍 자연키라 두 방향을 각각 로드.
        //  · asChild: 이 사건이 자식인 쌍 → parentEventId별 사유(주 상위·추가 상위 표시)
        //  · asParent: 이 사건이 부모인 쌍 → childEventId별 사유(하위 카드·추가 하위 표시)
        // 상세(loadEventDetail)에서만 로드 — toResponseDto는 로드됐을 때만 매핑(conditional 계약).
        hierarchyReasonsAsChild: {
          select: { parentEventId: true, reason: true },
        },
        hierarchyReasonsAsParent: {
          select: { childEventId: true, reason: true },
        },
        childEvents: {
          // 소프트 삭제된 자식 제외 — 유령 카드 방지 + 프론트가 이 목록으로
          // childEventIds 전체 재전송을 만들기 때문에(가드가 삭제 사건을 거부) 필수.
          where: { deletedAt: null },
          include: {
            // 카드 색띠용 category — 누락 시 resolveCategory(undefined)가 전부 회색 폴백.
            category: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
            // eventSections·eventImages는 카드가 쓰지 않는데 섹션 content(MEDIUMTEXT)까지
            // 매 상세 응답에 실려 페이로드가 부풀었다 — 제거(카드는 title·날짜·설명·category만 소비).
          },
          orderBy: { startDate: 'asc' }, // 하위 사건 시간순 정렬
        },
        countryRelations: {
          include: {
            country: true,
            historicalCountry: true,
          },
          // role 미설정 데이터에서도 lane 배치가 안정적이도록 createdAt 오름차순 — items[0] 결정성 보장
          orderBy: { createdAt: 'asc' },
        },
        eventSections: {
          orderBy: { order: 'asc' },
        },
        eventImages: {
          orderBy: { order: 'asc' },
        },
        // 참여 인물(PersonEvent) — 인물 시점의 role/note(장문) 포함
        persons: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                middleName: true,
                profileImageUrl: true,
                // 이름 표시 순서: 개인 오버라이드 → 국가 기본 → 동양식(성→이름)
                nameDisplayOrder: true,
                country: { select: { defaultNameDisplayOrder: true } },
              },
            },
          },
        },
        cabinetEvents: {
          include: {
            cabinet: {
              include: {
                headTenure: {
                  include: {
                    person: true,
                    country: true,
                    historicalCountry: true,
                    positionDefinition: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!event) return null

    // 정규화된 군사 정보 조회
    const militaryEvent = await this.militaryEventService.getMilitaryData(id)

    const response = this.toResponseDto(event as any)
    if (militaryEvent) {
      // @ts-ignore
      response.militaryEvent = militaryEvent
    }

    return { event, response }
  }

  /**
   * 사건 상세 조회
   *
   * @param id 사건 ID
   * @returns 사건 정보
   * @tag events
   */
  /**
   * 방문(놀러가기): 타 계정이 등록한 사건 목록(카드, 읽기전용).
   * 보수 노출 — 카드 레벨만(제목·날짜·카테고리). 본문·하위사건·이미지·행위자 미개방.
   * 최상위(parentEventId=null)·미삭제만. 편집/삭제 액션은 프론트 viewerIsOwner로 숨김.
   * 주의: `:id` 라우트보다 위에 위치해야 함 (NestJS 라우트 매칭 순서).
   */
  @Get('by-account/:accountId')
  async getEventsByAccount(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: string,
  ): Promise<VisitedEventCardDto[]> {
    const parsedLimit = parseInt(limit ?? '', 10)
    const take = Number.isNaN(parsedLimit) ? 60 : Math.min(Math.max(parsedLimit, 1), 100)
    const rows = await this.prisma.event.findMany({
      // parentEventId: null 루트 판정 — INV-2 의존(다중 상위 무영향)
      where: { createdById: accountId, parentEventId: null, deletedAt: null },
      take,
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        title: true,
        startDate: true,
        startEra: true,
        startYear: true,
        category: { select: { name: true } },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      startEra: row.startEra ?? null,
      startYear: row.startYear ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      categoryName: row.category?.name ?? null,
    }))
  }

  @Get(':id')
  async getEventById(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id // AuthGuard가 이미 인증 체크함

    const loaded = await this.loadEventDetail(id)
    if (!loaded) {
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }

    // 권한 체크: 본인 사건만 조회 가능
    if (loaded.event.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 사건만 조회할 수 있습니다.')
    }

    return loaded.response
  }

  /**
   * 사건 생성
   *
   * @param dto 사건 생성 정보
   * @returns 생성된 사건
   * @tag events
   */
  @Post()
  async createEvent(
    @Body() dto: CreateEventDto,
    @Request() req?: any,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id! // AuthGuard가 이미 인증 체크함
    
    console.log(`👤 사건 등록 사용자: ${userId}`)
    
    // categoryName이 제공되면 categoryId로 변환 (우선순위: categoryName > categoryId)
    let categoryId = dto.categoryId
    if (dto.categoryName) {
      const category = await this.prisma.eventCategory.findFirst({
        where: { name: dto.categoryName },
      })
      if (category) {
        categoryId = category.id
      }
    }

    const startParts = parseEventDate(dto.startDate)
    const endParts = parseEventDate(dto.endDate)
    const event = await this.eventService.createEvent(
      {
        title: dto.title,
        description: dto.description,
        startDate: startParts ? startParts.date : undefined,
        startDatePrecision: dto.startDatePrecision ?? undefined,
        startEra: startParts?.era,
        startYear: startParts?.year,
        startMonth: startParts?.month,
        startDay: startParts?.day,
        endDate: endParts ? endParts.date : undefined,
        endDatePrecision: dto.endDatePrecision ?? undefined,
        endEra: endParts?.era,
        endYear: endParts?.year,
        endMonth: endParts?.month,
        endDay: endParts?.day,
        location: dto.location,
        categoryId: categoryId,
        background: dto.background,
        aftermath: dto.aftermath,
        parentEventId: dto.parentEventId,
        cityId: dto.cityId,
        administrativeDivisionId: dto.administrativeDivisionId,
        historicalCountryId: dto.historicalCountryId,
        warCost: dto.warCost,
        keywords: dto.keywords,
        childEvents: dto.childEvents, // 🆕 하위 사건 정보 전달
        createdById: userId, // 🆕 등록자 ID
      },
      dto.relatedPersons,
      dto.relatedEventIds,
      dto.relatedCountryIds,
      dto.relatedHistoricalCountryIds,
      dto.eventSections,
      dto.eventImages,
      dto.childEventIds, // 🆕 기존 사건을 하위로 연결
      dto.primaryCountryId,
      dto.primaryHistoricalCountryId,
      dto.extraParentEventIds, // 🆕 추가 상위(EventParentLink) — 수령만 하고 버리는 계약 거짓말 금지
    )

    // 정규화된 군사 정보 저장
    if (dto.militaryEvent) {
      console.log('🔵 [Controller] militaryEvent 수신:', {
        hasBelligerentSides: dto.militaryEvent.belligerentSides?.length || 0,
        hasRelations: dto.militaryEvent.relations?.length || 0,
        hasMilitaryDetails: !!dto.militaryEvent.militaryDetails,
        conflictType: dto.militaryEvent.militaryDetails?.conflictType,
        combatTypesCount: dto.militaryEvent.militaryDetails?.combatTypes?.length || 0,
        combatTypes: dto.militaryEvent.militaryDetails?.combatTypes,
        tactics: dto.militaryEvent.militaryDetails?.tactics,
        strategy: dto.militaryEvent.militaryDetails?.strategy,
        outcome: dto.militaryEvent.militaryDetails?.outcome,
        hasCasualties: dto.militaryEvent.casualties?.length || 0,
        warCost: dto.militaryEvent.warCost,
      })
      
      await this.militaryEventService.saveMilitaryData(
        event.id,
        dto.militaryEvent,
      )
      
      console.log('✅ [Controller] militaryEvent 저장 완료')
    } else {
      console.log('⚠️ [Controller] militaryEvent가 없습니다')
    }

    // 모든 관계 + 군사정보가 채워진 *조회와 동일한* 응답으로 반환 — 프론트가 시딩만으로
    // 완전한 상세를 렌더하도록(부분 응답 → refetch 점프 방지). 폴백: 재조회 실패 시 bare.
    const loaded = await this.loadEventDetail(event.id)
    return loaded ? loaded.response : this.toResponseDto(event)
  }

  /**
   * 사건 수정
   *
   * @param id 사건 ID
   * @param dto 사건 수정 정보
   * @returns 수정된 사건
   * @tag events
   */
  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req?: any,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id! // AuthGuard가 이미 인증 체크함
    
    console.log(`👤 사건 수정 사용자: ${userId}`)
    
    // 권한 체크: 본인이 등록한 사건만 수정 가능
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
      select: { createdById: true },
    })
    
    if (!existingEvent) {
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }
    
    if (existingEvent.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 사건만 수정할 수 있습니다.')
    }
    
    // categoryName이 제공되면 categoryId로 변환 (우선순위: categoryName > categoryId)
    let categoryId = dto.categoryId
    if (dto.categoryName) {
      const category = await this.prisma.eventCategory.findFirst({
        where: { name: dto.categoryName },
      })
      if (category) {
        categoryId = category.id
      }
    }

    const startPartsU = parseEventDate(dto.startDate)
    const endPartsU = parseEventDate(dto.endDate)
    const event = await this.eventService.updateEvent(
      id,
      {
        title: dto.title,
        description: dto.description,
        startDate: startPartsU ? startPartsU.date : undefined,
        startDatePrecision: dto.startDatePrecision ?? undefined,
        startEra: startPartsU?.era,
        startYear: startPartsU?.year,
        startMonth: startPartsU?.month,
        startDay: startPartsU?.day,
        endDate: endPartsU ? endPartsU.date : undefined,
        endDatePrecision: dto.endDatePrecision ?? undefined,
        endEra: endPartsU?.era,
        endYear: endPartsU?.year,
        endMonth: endPartsU?.month,
        endDay: endPartsU?.day,
        location: dto.location,
        categoryId: categoryId,
        background: dto.background,
        aftermath: dto.aftermath,
        parentEventId: dto.parentEventId,
        cityId: dto.cityId,
        administrativeDivisionId: dto.administrativeDivisionId,
        historicalCountryId: dto.historicalCountryId,
        warCost: dto.warCost,
        keywords: dto.keywords,
      },
      dto.relatedCountryIds,
      dto.relatedHistoricalCountryIds,
      dto.eventSections,
      dto.eventImages,
      dto.childEventIds, // 🆕 기존 사건을 하위로 연결
      dto.primaryCountryId,
      dto.primaryHistoricalCountryId,
      dto.relatedPersons,
      dto.extraParentEventIds, // 🆕 추가 상위(EventParentLink) 전체목록 — undefined=변경 없음
      dto.parentLinkReasons, // 🆕 연결 사유(이 사건=자식) 부분 업서트
      dto.childLinkReasons, // 🆕 연결 사유(이 사건=부모) 부분 업서트
    )

    // 정규화된 군사 정보 저장
    if (dto.militaryEvent) {
      await this.militaryEventService.saveMilitaryData(id, dto.militaryEvent)
    }

    // create와 동일 — 관계·군사정보 포함 full 응답으로 반환(시딩 시 점프 방지).
    const loaded = await this.loadEventDetail(id)
    return loaded ? loaded.response : this.toResponseDto(event)
  }

  /**
   * 사건 삭제
   *
   * @param id 사건 ID
   * @tag events
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<void> {
    const userId = req.user?.id! // AuthGuard가 이미 인증 체크함
    
    console.log(`👤 사건 삭제 사용자: ${userId}`)
    
    // 권한 체크: 본인이 등록한 사건만 삭제 가능
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
      select: { createdById: true },
    })
    
    if (!existingEvent) {
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }
    
    if (existingEvent.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 사건만 삭제할 수 있습니다.')
    }
    
    await this.eventService.deleteEvent(id, userId)
  }

  /**
   * 삭제된 사건 목록 조회
   */
  @Get('deleted/list')
  async getDeletedEvents(@Request() req?: any): Promise<EventResponseDto[]> {
    const userId = req.user?.id!
    const events = await this.eventService.getDeletedEvents(userId)
    return events.map((event) => this.toResponseDto(event))
  }

  /**
   * 사건 복구
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreEvent(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id!
    const event = await this.eventService.restoreEvent(id, userId)
    return this.toResponseDto(event)
  }

  /**
   * 사건 완전 삭제
   */
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async permanentlyDeleteEvent(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<void> {
    const userId = req.user?.id!
    await this.eventService.permanentlyDeleteEvent(id, userId)
  }

  // ========================================================================
  // Cabinet ↔ Event N:M 연결 (CabinetEvent)
  // ========================================================================

  /**
   * 사건에 연결된 행정부 목록
   */
  @Get(':id/cabinets')
  async getEventCabinets(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<any[]> {
    const userId = req.user?.id
    const event = await this.prisma.event.findUnique({ where: { id }, select: { createdById: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== userId) throw new ForbiddenException('본인이 등록한 사건만 조회할 수 있습니다.')

    const rows = await this.prisma.cabinetEvent.findMany({
      where: { eventId: id },
      include: {
        cabinet: {
          include: {
            headTenure: {
              include: {
                person: true,
                country: true,
                historicalCountry: true,
                positionDefinition: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return rows
  }

  /**
   * 사건에 행정부 연결
   */
  @Post(':id/cabinets')
  async linkCabinetToEvent(
    @Param('id') id: string,
    @Body() body: { cabinetId: string; role?: 'ORIGIN' | 'PARTY' | 'MEDIATOR' | 'AFFECTED' | null; note?: string | null },
    @Request() req?: any,
  ): Promise<any> {
    const userId = req.user?.id
    const event = await this.prisma.event.findUnique({ where: { id }, select: { createdById: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== userId) throw new ForbiddenException('본인이 등록한 사건만 수정할 수 있습니다.')

    if (!body?.cabinetId) throw new BadRequestException('cabinetId가 필요합니다.')

    const created = await this.prisma.cabinetEvent.upsert({
      where: { cabinetId_eventId: { cabinetId: body.cabinetId, eventId: id } },
      create: {
        cabinetId: body.cabinetId,
        eventId: id,
        role: (body.role ?? null) as any,
        note: body.note ?? null,
      },
      update: {
        role: (body.role ?? null) as any,
        note: body.note ?? null,
      },
      include: {
        cabinet: {
          include: {
            headTenure: {
              include: { person: true, country: true, historicalCountry: true, positionDefinition: true },
            },
          },
        },
      },
    })
    return created
  }

  /**
   * 사건-행정부 연결 수정 (역할/메모)
   */
  @Patch(':id/cabinets/:cabinetId')
  async updateEventCabinet(
    @Param('id') id: string,
    @Param('cabinetId') cabinetId: string,
    @Body() body: { role?: 'ORIGIN' | 'PARTY' | 'MEDIATOR' | 'AFFECTED' | null; note?: string | null },
    @Request() req?: any,
  ): Promise<any> {
    const userId = req.user?.id
    const event = await this.prisma.event.findUnique({ where: { id }, select: { createdById: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== userId) throw new ForbiddenException('본인이 등록한 사건만 수정할 수 있습니다.')

    return this.prisma.cabinetEvent.update({
      where: { cabinetId_eventId: { cabinetId, eventId: id } },
      data: {
        ...(body.role !== undefined ? { role: body.role as any } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
      },
    })
  }

  /**
   * 사건에서 행정부 연결 해제
   */
  @Delete(':id/cabinets/:cabinetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkCabinetFromEvent(
    @Param('id') id: string,
    @Param('cabinetId') cabinetId: string,
    @Request() req?: any,
  ): Promise<void> {
    const userId = req.user?.id
    const event = await this.prisma.event.findUnique({ where: { id }, select: { createdById: true } })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== userId) throw new ForbiddenException('본인이 등록한 사건만 수정할 수 있습니다.')

    await this.prisma.cabinetEvent.deleteMany({ where: { cabinetId, eventId: id } })
  }
}

