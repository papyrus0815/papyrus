import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { Event } from '../domain/event.entity'
import { EventRepository } from '../domain/event.repository'

@Injectable()
export class EventPrismaRepository implements EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return events.map((event) => this.toEntity(event))
  }

  async findById(id: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return event ? this.toEntity(event) : null
  }

  async findByTitle(title: string): Promise<Event | null> {
    const event = await this.prisma.event.findFirst({
      where: { title },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return event ? this.toEntity(event) : null
  }

  async findByParentEventId(parentEventId: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { parentEventId },
      orderBy: { startDate: 'asc' },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return events.map((event) => this.toEntity(event))
  }

  /**
   * 사건 생성
   * 
   * 기본 정보만 저장합니다.
   * 군사 정보는 MilitaryEventService를 통해 정규화된 테이블에 저장됩니다.
   * 
   * @param data 사건 생성 데이터
   * @returns 생성된 사건 엔티티
   */
  async create(data: Omit<Event, 'id'>): Promise<Event> {
    const event = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        categoryId: data.categoryId,
        background: data.background,
        aftermath: data.aftermath,
        parentEventId: data.parentEventId,
        cityId: data.cityId,
        administrativeDivisionId: data.administrativeDivisionId,
        historicalCountryId: data.historicalCountryId,
        warCost: data.warCost,
        keywords: data.keywords ?? undefined,
        createdById: data.createdById!, // 등록자 ID (필수)
      },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return this.toEntity(event)
  }

  /**
   * 사건 수정
   * 
   * 기본 정보만 수정합니다.
   * 군사 정보는 MilitaryEventService를 통해 정규화된 테이블에 저장됩니다.
   * 
   * @param id 사건 ID
   * @param data 수정할 데이터
   * @returns 수정된 사건 엔티티
   */
  async update(id: string, data: Partial<Omit<Event, 'id'>>): Promise<Event> {
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        categoryId: data.categoryId,
        background: data.background,
        aftermath: data.aftermath,
        parentEventId: data.parentEventId,
        cityId: data.cityId,
        administrativeDivisionId: data.administrativeDivisionId,
        historicalCountryId: data.historicalCountryId,
        warCost: data.warCost,
        keywords:
          data.keywords === undefined
            ? undefined
            : data.keywords === null
              ? Prisma.JsonNull
              : data.keywords,
      },
      include: {
        category: true,
        parentEvent: true,
        childEvents: true,
      },
    })
    return this.toEntity(event)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.event.delete({
      where: { id },
    })
  }

  /**
   * Prisma 모델을 Event 엔티티로 변환
   * 
   * 정규화된 구조에서는 기본 정보만 포함합니다.
   * 군사 정보는 MilitaryEventService.getMilitaryData()로 별도 조회합니다.
   * 
   * @param event Prisma event 모델
   * @returns Event 엔티티
   */
  private toEntity(event: Prisma.EventGetPayload<object>): Event {
    return new Event({
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      categoryId: event.categoryId,
      background: event.background,
      aftermath: event.aftermath,
      parentEventId: event.parentEventId,
      cityId: event.cityId,
      administrativeDivisionId: event.administrativeDivisionId,
      historicalCountryId: event.historicalCountryId,
      warCost: event.warCost,
      keywords:
        event.keywords != null && Array.isArray(event.keywords)
          ? (event.keywords as string[])
          : null,
      createdById: event.createdById,
    })
  }
}

