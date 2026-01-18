import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto'
import { Event } from '../domain/event.entity'
import { PrismaClient } from '@prisma/client'

@ApiTags('events')
@Controller('events')
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
    // sections에서 제목만 추출
    let sectionTitles: string[] | undefined
    if (event.sections) {
      // sections가 { items: [...] } 형태인 경우
      const items = event.sections.items || event.sections
      if (Array.isArray(items)) {
        sectionTitles = items
          .map((section: any) => section.title)
          .filter((title: string) => title) // 빈 제목 제외
      }
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate?.toISOString ? event.startDate.toISOString() : event.startDate ?? null,
      endDate: event.endDate?.toISOString ? event.endDate.toISOString() : event.endDate ?? null,
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
      cityId: event.cityId,
      administrativeDivisionId: event.administrativeDivisionId,
      historicalCountryId: event.historicalCountryId,
      thumbnail: event.thumbnail ?? null,
      sections: event.sections ?? null,
      sectionTitles: sectionTitles,
      warCost: event.warCost ?? null,
      createdAt: event.createdAt?.toISOString ? event.createdAt.toISOString() : event.createdAt,
      updatedAt: event.updatedAt?.toISOString ? event.updatedAt.toISOString() : event.updatedAt,
    }
  }

  /**
   * 모든 사건 조회
   *
   * @returns 사건 목록
   * @tag events
   */
  @Get()
  async getAllEvents(): Promise<EventResponseDto[]> {
    // Prisma로 직접 조회하여 category 관계 포함
    const events = await this.prisma.event.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
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
  ): Promise<EventResponseDto[]> {
    const events = await this.eventService.getEventsByParentId(parentEventId)
    return events.map((event) => this.toResponseDto(event))
  }

  /**
   * 사건 상세 조회
   *
   * @param id 사건 ID
   * @returns 사건 정보
   * @tag events
   */
  @Get(':id')
  async getEventById(@Param('id') id: string): Promise<EventResponseDto> {
    // Prisma로 직접 조회하여 category 관계 포함
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    if (!event) {
      throw new Error('Event not found')
    }

    // 정규화된 군사 정보 조회
    const militaryEvent = await this.militaryEventService.getMilitaryData(id)

    const response = this.toResponseDto(event as any)
    if (militaryEvent) {
      // @ts-ignore
      response.militaryEvent = militaryEvent
    }

    return response
  }

  /**
   * 사건 생성
   *
   * @param dto 사건 생성 정보
   * @returns 생성된 사건
   * @tag events
   */
  @Post()
  async createEvent(@Body() dto: CreateEventDto): Promise<EventResponseDto> {
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
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        location: dto.location,
        categoryId: categoryId,
        background: dto.background,
        aftermath: dto.aftermath,
        parentEventId: dto.parentEventId,
        cityId: dto.cityId,
        administrativeDivisionId: dto.administrativeDivisionId,
        historicalCountryId: dto.historicalCountryId,
        thumbnail: dto.thumbnail,
        sections: dto.sections,
        warCost: dto.warCost,
        childEvents: dto.childEvents, // 🆕 하위 사건 정보 전달
      },
      dto.relatedPersons,
      dto.relatedEventIds,
      dto.sections,
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

    return this.toResponseDto(event)
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
  ): Promise<EventResponseDto> {
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

    const event = await this.eventService.updateEvent(id, {
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      location: dto.location,
      categoryId: categoryId,
      background: dto.background,
      aftermath: dto.aftermath,
      parentEventId: dto.parentEventId,
      thumbnail: dto.thumbnail,
      cityId: dto.cityId,
      administrativeDivisionId: dto.administrativeDivisionId,
      historicalCountryId: dto.historicalCountryId,
      sections: dto.sections,
      warCost: dto.warCost,
    })

    // 정규화된 군사 정보 저장
    if (dto.militaryEvent) {
      await this.militaryEventService.saveMilitaryData(id, dto.militaryEvent)
    }

    return this.toResponseDto(event)
  }

  /**
   * 사건 삭제
   *
   * @param id 사건 ID
   * @tag events
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string): Promise<void> {
    await this.eventService.deleteEvent(id)
  }
}

