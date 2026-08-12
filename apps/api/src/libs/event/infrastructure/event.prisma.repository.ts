import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { Event } from '../domain/event.entity'
import { EventRepository } from '../domain/event.repository'

@Injectable()
export class EventPrismaRepository implements EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Event[]> {
    // include 없음 — toEntity가 스칼라만 매핑하므로 relation 로드는 전부 버려지는 죽은 로드(API-4).
    const events = await this.prisma.event.findMany({
      orderBy: { startDate: 'desc' },
    })
    return events.map((event) => this.toEntity(event))
  }

  async findById(id: string): Promise<Event | null> {
    // include 없음 — toEntity가 스칼라만 매핑하므로 relation 로드는 전부 버려지는 죽은 로드(API-4).
    const event = await this.prisma.event.findUnique({
      where: { id },
    })
    return event ? this.toEntity(event) : null
  }

  /**
   * 제목으로 사건 조회 — 중복 제목 검사용.
   *
   * ⚠️ title에는 DB `@unique`가 없어 앱 레벨 강제다. 반드시 소유자(createdById)와
   * 미삭제(deletedAt:null)로 스코프한다:
   *  - createdById 미스코프 시 타 계정이 먼저 쓴 제목이 내 생성을 409로 막고 타 계정
   *    데이터 존재를 누설(나머지 소유권 로직과 불일치).
   *  - deletedAt 미필터 시 소프트삭제된 좀비 제목이 재생성을 막는다(활성 목록엔 없어 원인 불명).
   */
  async findByTitle(title: string, createdById?: string): Promise<Event | null> {
    const event = await this.prisma.event.findFirst({
      where: {
        title,
        deletedAt: null,
        ...(createdById ? { createdById } : {}),
      },
    })
    return event ? this.toEntity(event) : null
  }

  async findByParentEventId(parentEventId: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      // 소프트삭제된 자식 제외 — loadEventDetail의 childEvents 정책과 통일(유령 자식 방지).
      where: { parentEventId, deletedAt: null },
      orderBy: { startDate: 'asc' },
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
        startDatePrecision: data.startDatePrecision ?? undefined,
        startEra: data.startEra ?? undefined,
        startYear: data.startYear ?? undefined,
        startMonth: data.startMonth ?? undefined,
        startDay: data.startDay ?? undefined,
        endDate: data.endDate,
        endDatePrecision: data.endDatePrecision ?? undefined,
        endEra: data.endEra ?? undefined,
        endYear: data.endYear ?? undefined,
        endMonth: data.endMonth ?? undefined,
        endDay: data.endDay ?? undefined,
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
      // include 없음 — toEntity가 스칼라만 매핑하므로 relation 로드는 전부 버려지는 죽은 로드(API-4).
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
  async update(
    id: string,
    data: Partial<Omit<Event, 'id'>>,
    tx?: Prisma.TransactionClient,
  ): Promise<Event> {
    const event = await (tx ?? this.prisma).event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        startDatePrecision: data.startDatePrecision !== undefined ? data.startDatePrecision : undefined,
        startEra: data.startEra !== undefined ? data.startEra : undefined,
        startYear: data.startYear !== undefined ? data.startYear : undefined,
        startMonth: data.startMonth !== undefined ? data.startMonth : undefined,
        startDay: data.startDay !== undefined ? data.startDay : undefined,
        endDate: data.endDate,
        endDatePrecision: data.endDatePrecision !== undefined ? data.endDatePrecision : undefined,
        endEra: data.endEra !== undefined ? data.endEra : undefined,
        endYear: data.endYear !== undefined ? data.endYear : undefined,
        endMonth: data.endMonth !== undefined ? data.endMonth : undefined,
        endDay: data.endDay !== undefined ? data.endDay : undefined,
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
      // include 없음 — toEntity가 스칼라만 매핑하므로 relation 로드는 전부 버려지는 죽은 로드(API-4).
    })
    return this.toEntity(event)
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).event.delete({
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
      startDatePrecision: event.startDatePrecision ?? undefined,
      startEra: event.startEra ?? undefined,
      startYear: event.startYear ?? undefined,
      startMonth: event.startMonth ?? undefined,
      startDay: event.startDay ?? undefined,
      endDate: event.endDate,
      endDatePrecision: event.endDatePrecision ?? undefined,
      endEra: event.endEra ?? undefined,
      endYear: event.endYear ?? undefined,
      endMonth: event.endMonth ?? undefined,
      endDay: event.endDay ?? undefined,
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

