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
      thumbnail?: string
    }>
    },
    relatedPersons?: Array<{ personId: string; role?: string; note?: string }>,
    relatedEventIds?: string[],
    relatedCountryIds?: string[],
    relatedHistoricalCountryIds?: string[],
    sections?: Array<{
      id: string
      title: string
      content: string
      mentions: Array<{
        type: 'person' | 'event'
        id: string
        name: string
        startIndex: number
        endIndex: number
      }>
    }>,
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

    // 섹션 데이터를 background와 aftermath로 변환
    let backgroundData = data.background
    let aftermathData = data.aftermath

    if (sections && sections.length > 0) {
      // 첫 번째 섹션을 background로
      backgroundData = sections[0]
        ? `## ${sections[0].title}\n\n${sections[0].content}`
        : data.background

      // 나머지 섹션들을 aftermath로
      if (sections.length > 1) {
        aftermathData = sections
          .slice(1)
          .map((section) => `## ${section.title}\n\n${section.content}`)
          .join('\n\n')
      }
    }

    // 사건 생성
    const event = await this.events.create({
      ...data,
      background: backgroundData,
      aftermath: aftermathData,
    })

    // 섹션에서 멘션된 인물 추출 및 연결
    const allMentionedPersons = new Map<string, string>() // personId -> role

    if (sections) {
      // sections가 {items: [...]} 형태인지 확인
      const sectionArray = Array.isArray(sections) ? sections : (sections as any).items || []
      
      sectionArray.forEach((section: any) => {
        if (section.mentions && Array.isArray(section.mentions)) {
          section.mentions.forEach((mention: any) => {
            if (mention.type === 'person') {
              // 멘션된 인물의 역할은 섹션 제목이나 내용에서 추출 가능
              allMentionedPersons.set(mention.id, '')
            }
          })
        }
      })
    }

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
            // updatedAt: new Date(), // Prisma가 자동 관리
            background: null,
            aftermath: null,
            thumbnail: childData.thumbnail || null,
            cityId: null,
            administrativeDivisionId: null,
            historicalCountryId: null,
            warCost: null,
          })
          console.log(`✅ 하위 사건 생성 완료: ${childData.title}`)
        } catch (error) {
          console.error(`❌ 하위 사건 생성 실패: ${childData.title}`, error)
          // 하위 사건 생성 실패해도 상위 사건은 유지
        }
      }
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

    return this.events.update(id, data)
  }

  /**
   * 사건 삭제
   * @param id 사건 ID
   * @throws NotFoundException 사건을 찾을 수 없는 경우
   */
  async deleteEvent(id: string): Promise<void> {
    // 존재 여부 확인
    await this.getEventById(id)
    await this.events.delete(id)
  }
}

