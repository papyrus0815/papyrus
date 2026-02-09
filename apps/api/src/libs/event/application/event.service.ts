import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { EventRepository } from '../domain/event.repository'
import { Event } from '../domain/event.entity'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class EventService {
  constructor(
    @Inject('EventRepository')
    private readonly events: EventRepository,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * 모든 사건 조회
   * @returns 모든 사건 목록
   */
  async getAllEvents(): Promise<Event[]> {
    return this.events.findAll()
  }

  /**
   * ID로 사건 조회
   * @param id 사건 ID
   * @returns 사건 정보
   * @throws NotFoundException 사건을 찾을 수 없는 경우
   */
  async getEventById(id: string): Promise<Event> {
    const event = await this.events.findById(id)
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`)
    }

    return event
  }

  /**
   * 상위 사건의 하위 사건 목록 조회
   * @param parentEventId 상위 사건 ID
   * @returns 하위 사건 목록
   * @throws NotFoundException 상위 사건을 찾을 수 없는 경우
   */
  async getEventsByParentId(parentEventId: string): Promise<Event[]> {
    // 상위 사건이 존재하는지 확인
    await this.getEventById(parentEventId)

    return this.events.findByParentEventId(parentEventId)
  }

  /**
   * 사건 생성
   * @param data 사건 생성 데이터
   * @param relatedPersons 관련 인물 목록
   * @param relatedEventIds 관련 사건 ID 목록
   * @param sections 섹션 기반 내용 (멘션 정보 포함)
   * @param childEvents 하위 사건 목록 (빠른 등록용)
   * @returns 생성된 사건
   * @throws ConflictException 동일한 제목의 사건이 이미 존재하는 경우
   */
  async createEvent(
    data: Omit<Event, 'id'> & {
    childEvents?: Array<{
      title: string
      startDate?: string
      endDate?: string
      description?: string
      location?: string
      images?: Array<{ imageUrl: string; isPrimary?: boolean }>
    }>
    },
    relatedPersons?: Array<{ personId: string; role?: string; note?: string }>,
    relatedEventIds?: string[],
    relatedCountryIds?: string[],
    relatedHistoricalCountryIds?: string[],
    eventSections?: Array<{
      title: string
      content: string
      order?: number
      sectionType?: string
    }>,
    eventImages?: Array<{
      imageUrl: string
      caption?: string
      source?: string
      order?: number
      isPrimary?: boolean
    }>,
    childEventIds?: string[], // 기존 사건을 하위로 연결
  ): Promise<Event> {
    // 중복 체크
    const existing = await this.events.findByTitle(data.title)
    if (existing) {
      throw new ConflictException(
        `Event with title ${data.title} already exists`,
      )
    }

    // 상위 사건이 존재하는지 확인
    if (data.parentEventId) {
      await this.getEventById(data.parentEventId)
    }

    // 관련 사건들이 존재하는지 확인
    if (relatedEventIds) {
      for (const eventId of relatedEventIds) {
        await this.getEventById(eventId)
      }
    }

    // 사건 생성
    const event = await this.events.create(data)

    // EventSection 생성
    if (eventSections && eventSections.length > 0) {
      await Promise.all(
        eventSections.map((section, index) =>
          this.prisma.eventSection.create({
            data: {
              eventId: event.id,
              title: section.title,
              content: section.content,
              order: section.order !== undefined ? section.order : index,
              sectionType: section.sectionType || 'content',
            },
          }),
        ),
      )
    }

    // EventImage 생성
    if (eventImages && eventImages.length > 0) {
      await Promise.all(
        eventImages.map((image, index) =>
          this.prisma.eventImage.create({
            data: {
              eventId: event.id,
              imageUrl: image.imageUrl,
              caption: image.caption,
              source: image.source,
              order: image.order !== undefined ? image.order : index,
              isPrimary: image.isPrimary !== undefined ? image.isPrimary : index === 0,
            },
          }),
        ),
      )
    }

    // 멘션된 인물 추출 (제거 - 복잡도 감소)
    const allMentionedPersons = new Map<string, string>()

    // 관련 인물 연결 (명시적으로 선택한 인물 + 멘션된 인물)
    const allRelatedPersons = new Map<string, { role?: string; note?: string }>()

    // 명시적으로 선택한 인물
    if (relatedPersons) {
      relatedPersons.forEach((person) => {
        allRelatedPersons.set(person.personId, {
          role: person.role,
          note: person.note,
        })
      })
    }

    // 멘션된 인물 추가 (중복 제거)
    allMentionedPersons.forEach((role, personId) => {
      if (!allRelatedPersons.has(personId)) {
        allRelatedPersons.set(personId, { role })
      }
    })

    // PersonEvent 생성
    if (allRelatedPersons.size > 0) {
      await Promise.all(
        Array.from(allRelatedPersons.entries()).map(([personId, info]) =>
          this.prisma.personEvent.create({
            data: {
              personId,
              eventId: event.id,
              role: info.role,
              note: info.note,
            },
          }),
        ),
      )
    }

    // 관련 국가 연결
    if (relatedCountryIds && relatedCountryIds.length > 0) {
      await Promise.all(
        relatedCountryIds.map((countryId) =>
          this.prisma.eventCountryRelation.create({
            data: {
              eventId: event.id,
              countryId,
              role: 'PARTICIPANT', // 기본값: 참여국
            },
          }),
        ),
      )
    }

    if (relatedHistoricalCountryIds && relatedHistoricalCountryIds.length > 0) {
      await Promise.all(
        relatedHistoricalCountryIds.map((historicalCountryId) =>
          this.prisma.eventCountryRelation.create({
            data: {
              eventId: event.id,
              historicalCountryId,
              role: 'PARTICIPANT', // 기본값: 참여국
            },
          }),
        ),
      )
    }

    // 관련 사건 연결 (추후 구현 가능 - 현재는 parentEventId만 지원)

    // 🆕 하위 사건 자동 생성
    if (data.childEvents && Array.isArray(data.childEvents) && data.childEvents.length > 0) {
      console.log(`📝 하위 사건 ${data.childEvents.length}개 생성 시작...`)
      
      for (const childData of data.childEvents) {
        try {
          await this.createEvent({
            title: childData.title,
            description: childData.description || null,
            startDate: childData.startDate ? new Date(childData.startDate) : null,
            endDate: childData.endDate ? new Date(childData.endDate) : null,
            location: childData.location || null,
            parentEventId: event.id, // 방금 생성한 사건을 상위로 설정
            categoryId: data.categoryId || null, // 상위 사건의 카테고리 상속
            background: null,
            aftermath: null,
            cityId: null,
            administrativeDivisionId: null,
            historicalCountryId: null,
            warCost: null,
            createdById: data.createdById, // 상위 사건의 등록자 상속
          })
          console.log(`✅ 하위 사건 생성 완료: ${childData.title}`)
        } catch (error) {
          console.error(`❌ 하위 사건 생성 실패: ${childData.title}`, error)
          // 하위 사건 생성 실패해도 상위 사건은 유지
        }
      }
    }

    // 🆕 기존 사건을 하위 사건으로 연결
    if (childEventIds && childEventIds.length > 0) {
      console.log(`🔗 기존 사건 ${childEventIds.length}개를 하위 사건으로 연결...`)
      
      await Promise.all(
        childEventIds.map((childId) =>
          this.prisma.event.update({
            where: { id: childId },
            data: { parentEventId: event.id },
          })
        )
      )
      
      console.log(`✅ ${childEventIds.length}개 사건이 하위 사건으로 연결됨`)
    }

    return event
  }

  /**
   * 사건 정보 수정
   * @param id 사건 ID
   * @param data 수정할 데이터
   * @returns 수정된 사건
   * @throws NotFoundException 사건을 찾을 수 없는 경우
   * @throws ConflictException 변경하려는 제목이 이미 존재하는 경우
   */
  async updateEvent(
    id: string,
    data: Partial<Omit<Event, 'id'>>,
    relatedCountryIds?: string[],
    relatedHistoricalCountryIds?: string[],
    eventSections?: Array<{
      title: string
      content: string
      order?: number
      sectionType?: string
    }>,
    eventImages?: Array<{
      imageUrl: string
      caption?: string
      source?: string
      order?: number
      isPrimary?: boolean
    }>,
    childEventIds?: string[], // 기존 사건을 하위로 연결
  ): Promise<Event> {
    // 존재 여부 확인
    await this.getEventById(id)

    // 제목 변경 시 중복 체크
    if (data.title) {
      const existing = await this.events.findByTitle(data.title)
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Event with title ${data.title} already exists`,
        )
      }
    }

    // 상위 사건이 존재하는지 확인 (자기 자신을 상위로 설정하는 것 방지)
    if (data.parentEventId) {
      if (data.parentEventId === id) {
        throw new ConflictException('Event cannot be its own parent')
      }
      await this.getEventById(data.parentEventId)
    }

    // 관련 국가 업데이트
    if (relatedCountryIds !== undefined || relatedHistoricalCountryIds !== undefined) {
      // 기존 관련 국가 삭제
      await this.prisma.eventCountryRelation.deleteMany({
        where: { eventId: id },
      })

      // 새로운 관련 국가 추가
      if (relatedCountryIds && relatedCountryIds.length > 0) {
        await Promise.all(
          relatedCountryIds.map((countryId) =>
            this.prisma.eventCountryRelation.create({
              data: {
                eventId: id,
                countryId,
                role: 'PARTICIPANT', // 기본값: 참여국
              },
            }),
          ),
        )
      }

      if (relatedHistoricalCountryIds && relatedHistoricalCountryIds.length > 0) {
        await Promise.all(
          relatedHistoricalCountryIds.map((historicalCountryId) =>
            this.prisma.eventCountryRelation.create({
              data: {
                eventId: id,
                historicalCountryId,
                role: 'PARTICIPANT', // 기본값: 참여국
              },
            }),
          ),
        )
      }
    }

    // EventSection 업데이트
    if (eventSections !== undefined) {
      // 기존 섹션 삭제
      await this.prisma.eventSection.deleteMany({
        where: { eventId: id },
      })

      // 새로운 섹션 생성
      if (eventSections.length > 0) {
        await Promise.all(
          eventSections.map((section, index) =>
            this.prisma.eventSection.create({
              data: {
                eventId: id,
                title: section.title,
                content: section.content,
                order: section.order !== undefined ? section.order : index,
                sectionType: section.sectionType || 'content',
              },
            }),
          ),
        )
      }
    }

    // EventImage 업데이트
    if (eventImages !== undefined) {
      // 기존 이미지 삭제
      await this.prisma.eventImage.deleteMany({
        where: { eventId: id },
      })

      // 새로운 이미지 생성
      if (eventImages.length > 0) {
        await Promise.all(
          eventImages.map((image, index) =>
            this.prisma.eventImage.create({
              data: {
                eventId: id,
                imageUrl: image.imageUrl,
                caption: image.caption,
                source: image.source,
                order: image.order !== undefined ? image.order : index,
                isPrimary: image.isPrimary !== undefined ? image.isPrimary : index === 0,
              },
            }),
          ),
        )
      }
    }

    // 🆕 기존 사건을 하위 사건으로 연결
    if (childEventIds !== undefined) {
      console.log(`🔗 기존 사건 ${childEventIds.length}개를 하위 사건으로 연결...`)
      
      // 먼저 기존 하위 사건들의 연결 해제 (선택적)
      await this.prisma.event.updateMany({
        where: { parentEventId: id },
        data: { parentEventId: null },
      })
      
      // 새로운 하위 사건 연결
      if (childEventIds.length > 0) {
        await Promise.all(
          childEventIds.map((childId) =>
            this.prisma.event.update({
              where: { id: childId },
              data: { parentEventId: id },
            })
          )
        )
        console.log(`✅ ${childEventIds.length}개 사건이 하위 사건으로 연결됨`)
      }
    }

    return this.events.update(id, data)
  }

  /**
   * 사건 삭제 (소프트 삭제)
   * @param id 사건 ID
   * @param userId 삭제하는 사용자 ID
   * @throws NotFoundException 사건을 찾을 수 없는 경우
   */
  async deleteEvent(id: string, userId?: string): Promise<void> {
    // 존재 여부 확인
    await this.getEventById(id)
    
    // 소프트 삭제: deletedAt 설정
    await this.prisma.event.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId || null,
      },
    })
    
    console.log(`🗑️ 사건 소프트 삭제: ${id} (3일 후 완전 삭제 예정)`)
  }

  /**
   * 삭제된 사건 목록 조회
   */
  async getDeletedEvents(userId: string): Promise<any[]> {
    const events = await this.prisma.event.findMany({
      where: {
        createdById: userId,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        category: true,
      },
    })
    
    return events
  }

  /**
   * 사건 복구
   */
  async restoreEvent(id: string, userId: string): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    })
    
    if (!event) {
      throw new Error('사건을 찾을 수 없습니다.')
    }
    
    if (event.createdById !== userId) {
      throw new Error('본인이 삭제한 사건만 복구할 수 있습니다.')
    }
    
    const restored = await this.prisma.event.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: {
        category: true,
      },
    })
    
    console.log(`♻️ 사건 복구: ${id}`)
    return restored
  }

  /**
   * 사건 완전 삭제
   */
  async permanentlyDeleteEvent(id: string, userId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    })
    
    if (!event) {
      throw new Error('사건을 찾을 수 없습니다.')
    }
    
    if (event.createdById !== userId) {
      throw new Error('본인이 삭제한 사건만 완전히 삭제할 수 있습니다.')
    }
    
    // 완전 삭제
    await this.events.delete(id)
    console.log(`🔥 사건 완전 삭제: ${id}`)
  }
}

