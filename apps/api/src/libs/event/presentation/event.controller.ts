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
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto'
import { Event } from '../domain/event.entity'
import { PrismaClient } from '@prisma/client'

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

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate?.toISOString ? event.startDate.toISOString() : event.startDate ?? null,
      startDatePrecision: event.startDatePrecision ?? null,
      endDate: event.endDate?.toISOString ? event.endDate.toISOString() : event.endDate ?? null,
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
      parentEvent: event.parentEvent ? this.toResponseDto(event.parentEvent) : undefined,
      childEvents: event.childEvents ? event.childEvents.map((child: any) => this.toResponseDto(child)) : undefined,
      keywords: event.keywords != null ? (Array.isArray(event.keywords) ? event.keywords : []) : null,
      cityId: event.cityId,
      administrativeDivisionId: event.administrativeDivisionId,
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
                  profileImageUrl: pe.person.profileImageUrl ?? null,
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
        parentEvent: true,
        childEvents: {
          include: {
            category: true,
            eventSections: true,
            eventImages: true,
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
      throw new Error('상위 사건을 찾을 수 없습니다.')
    }
    
    if (parentEvent.createdById !== userId) {
      throw new Error('본인이 등록한 사건의 하위 사건만 조회할 수 있습니다.')
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
        parentEvent: true,
        childEvents: {
          include: {
            eventSections: { orderBy: { order: 'asc' } },
            eventImages: { orderBy: { order: 'asc' } },
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
                profileImageUrl: true,
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
  @Get(':id')
  async getEventById(
    @Param('id') id: string,
    @Request() req?: any,
  ): Promise<EventResponseDto> {
    const userId = req.user?.id // AuthGuard가 이미 인증 체크함

    const loaded = await this.loadEventDetail(id)
    if (!loaded) {
      throw new Error('Event not found')
    }

    // 권한 체크: 본인 사건만 조회 가능
    if (loaded.event.createdById !== userId) {
      throw new Error('본인이 등록한 사건만 조회할 수 있습니다.')
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

    const event = await this.eventService.createEvent(
      {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        startDatePrecision: dto.startDatePrecision ?? undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        endDatePrecision: dto.endDatePrecision ?? undefined,
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
      throw new Error('사건을 찾을 수 없습니다.')
    }
    
    if (existingEvent.createdById !== userId) {
      throw new Error('본인이 등록한 사건만 수정할 수 있습니다.')
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

    const event = await this.eventService.updateEvent(
      id,
      {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        startDatePrecision: dto.startDatePrecision ?? undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        endDatePrecision: dto.endDatePrecision ?? undefined,
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
      throw new Error('사건을 찾을 수 없습니다.')
    }
    
    if (existingEvent.createdById !== userId) {
      throw new Error('본인이 등록한 사건만 삭제할 수 있습니다.')
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
    if (!event) throw new Error('Event not found')
    if (event.createdById !== userId) throw new Error('본인이 등록한 사건만 조회할 수 있습니다.')

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
    if (!event) throw new Error('Event not found')
    if (event.createdById !== userId) throw new Error('본인이 등록한 사건만 수정할 수 있습니다.')

    if (!body?.cabinetId) throw new Error('cabinetId가 필요합니다.')

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
    if (!event) throw new Error('Event not found')
    if (event.createdById !== userId) throw new Error('본인이 등록한 사건만 수정할 수 있습니다.')

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
    if (!event) throw new Error('Event not found')
    if (event.createdById !== userId) throw new Error('본인이 등록한 사건만 수정할 수 있습니다.')

    await this.prisma.cabinetEvent.deleteMany({ where: { cabinetId, eventId: id } })
  }
}

