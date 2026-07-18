import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { EventRepository } from '../domain/event.repository'
import { Event } from '../domain/event.entity'
import { AggregateType, EventMethod, PrismaClient } from '@prisma/client'
import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { NotificationService } from '../../notification/application/notification.service'
import { yearPreview } from '../../shared/notification-preview.util'

@Injectable()
export class EventService {
  constructor(
    @Inject('EventRepository')
    private readonly events: EventRepository,
    private readonly prisma: PrismaClient,
    private readonly pointService: PointService,
    private readonly notificationService: NotificationService,
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
    /**
     * 메인 국가 — 마킹된 country/historicalCountry는 EventCountryRelation.role=INITIATOR로 저장.
     * 미지정이면 모두 PARTICIPANT (Timeline은 createdAt 폴백).
     */
    primaryCountryId?: string,
    primaryHistoricalCountryId?: string,
  ): Promise<Event> {
    // 중복 체크
    const existing = await this.events.findByTitle(data.title)
    if (existing) {
      throw new ConflictException(
        `Event with title ${data.title} already exists`,
      )
    }

    // 상위·하위 연결 대상 존재 + 소유권 확인 — 새 사건은 순환 불가라 소유권만.
    // (childEventIds는 상대 사건의 부모 FK를 덮어쓰므로 update와 동일하게 가드.)
    if (data.parentEventId || (childEventIds && childEventIds.length > 0)) {
      await this.assertLinkTargetsOwnedBy(data.createdById, [
        ...(childEventIds ?? []),
        ...(data.parentEventId ? [data.parentEventId] : []),
      ])
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

    // 관련 국가 연결 — primary와 일치하는 1개만 INITIATOR, 나머지 PARTICIPANT
    if (relatedCountryIds && relatedCountryIds.length > 0) {
      await Promise.all(
        relatedCountryIds.map((countryId) =>
          this.prisma.eventCountryRelation.create({
            data: {
              eventId: event.id,
              countryId,
              role: countryId === primaryCountryId ? 'INITIATOR' : 'PARTICIPANT',
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
              role:
                historicalCountryId === primaryHistoricalCountryId
                  ? 'INITIATOR'
                  : 'PARTICIPANT',
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

    // 게이미피케이션: 등록자에게 점수 적립 (기본 + 완성도 보너스, 하위 사건도 각자 적립됨)
    const completenessSignals =
      (eventImages && eventImages.length > 0 ? 1 : 0) +
      (eventSections && eventSections.length > 0 ? 1 : 0) +
      (data.background ? 1 : 0)
    await this.pointService.awardForCreate(
      data.createdById,
      AggregateType.EVENT,
      event.id,
      completenessBonus(completenessSignals),
    )
    await this.notificationService.notifyEvent(
      event.title,
      EventMethod.CREATE,
      event.id,
      yearPreview(event.startEra, event.startYear),
    )

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
    /** create와 동일 — INITIATOR 마킹 대상 ID */
    primaryCountryId?: string,
    primaryHistoricalCountryId?: string,
    /**
     * 관련 인물 목록. undefined면 손대지 않음(부분 patch), 빈 배열이면 모두 제거.
     * 다른 array 필드(eventSections·eventImages·relatedCountryIds 등)와 동일한
     * delete-and-recreate 패턴.
     */
    relatedPersons?: Array<{ personId: string; role?: string; note?: string }>,
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

    // 상위·하위 연결 검증 — 존재·소유권·순환. 하위 사건도 연결 후보가 되면서
    // 계층이 2단 이상으로 깊어질 수 있어, 자기-부모 단발 체크로는 부족하다.
    // 쓰기 시작 전(비트랜잭션 구간 앞)에 전부 검증한다.
    if (data.parentEventId !== undefined || childEventIds !== undefined) {
      await this.assertHierarchyLinkable(id, data.parentEventId, childEventIds)
    }

    // 관련 국가 업데이트
    if (relatedCountryIds !== undefined || relatedHistoricalCountryIds !== undefined) {
      // 기존 관련 국가 삭제
      await this.prisma.eventCountryRelation.deleteMany({
        where: { eventId: id },
      })

      // 새로운 관련 국가 추가 — primary와 일치하는 것만 INITIATOR
      if (relatedCountryIds && relatedCountryIds.length > 0) {
        await Promise.all(
          relatedCountryIds.map((countryId) =>
            this.prisma.eventCountryRelation.create({
              data: {
                eventId: id,
                countryId,
                role:
                  countryId === primaryCountryId ? 'INITIATOR' : 'PARTICIPANT',
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
                role:
                  historicalCountryId === primaryHistoricalCountryId
                    ? 'INITIATOR'
                    : 'PARTICIPANT',
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

    // PersonEvent 업데이트 — 다른 array 필드와 동일한 delete-and-recreate.
    // createEvent에는 처리 로직이 있었지만 updateEvent에 누락되어 있어 사용자가
    // 인라인으로 인물을 추가/제거해도 서버 반영이 안 되던 결함을 보정.
    if (relatedPersons !== undefined) {
      await this.prisma.personEvent.deleteMany({
        where: { eventId: id },
      })

      if (relatedPersons.length > 0) {
        await Promise.all(
          relatedPersons.map((person) =>
            this.prisma.personEvent.create({
              data: {
                personId: person.personId,
                eventId: id,
                role: person.role,
                note: person.note,
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

    const updated = await this.events.update(id, data)
    await this.notificationService.notifyEvent(
      updated.title,
      EventMethod.UPDATE,
      updated.id,
      yearPreview(updated.startEra, updated.startYear),
    )
    return updated
  }

  /**
   * 상위·하위 사건 연결 검증 — 존재·소유권·순환.
   *
   * - 소유권: 연결 대상은 모두 대상 사건과 같은 소유자(createdById)여야 한다.
   *   (childEventIds는 상대 사건의 parentEventId를 덮어쓰는 쓰기라, 타 계정 사건을
   *   끌어오는 통로가 되면 안 된다.)
   * - 순환: 이번 요청으로 새로 생기는 엣지는 전부 id를 지나므로(id→새 부모, 각 child→id),
   *   *요청 반영 후* 부모 체인을 id의 새 부모부터 위로 걸어 올라가며 id를 다시 만나면
   *   순환이다. childEventIds에 든 사건의 부모는 id가 될 예정이므로 체인 위에서 만나면
   *   id로 치환해 계속 걷는다. (예: 새 부모가 이번에 하위로 붙는 사건의 자손인 경우까지 검출.)
   *
   * @param id 수정 대상 사건 ID
   * @param parentEventId 새 상위 사건 ID — undefined면 변경 없음(현재값 유지), null이면 해제
   * @param childEventIds 새 하위 사건 ID 전체 목록 — undefined면 변경 없음
   */
  private async assertHierarchyLinkable(
    id: string,
    parentEventId?: string | null,
    childEventIds?: string[],
  ): Promise<void> {
    const target = await this.prisma.event.findUnique({
      where: { id },
      select: { createdById: true, parentEventId: true },
    })
    if (!target) {
      throw new NotFoundException(`Event with id ${id} not found`)
    }

    const childSet = new Set(childEventIds ?? [])
    if (childSet.has(id)) {
      throw new ConflictException('자기 자신을 하위 사건으로 연결할 수 없습니다')
    }
    if (parentEventId === id) {
      throw new ConflictException('자기 자신을 상위 사건으로 지정할 수 없습니다')
    }

    // 존재 + 소유권 — 연결에 등장하는 모든 상대 사건을 한 번에 검사.
    // 예외: 이미 이 사건의 자식인데 소프트 삭제된 항목은 통과 — 상세 응답에서 온
    // childEventIds 전체 목록에 섞여 있을 수 있고, 유지해도 링크가 변하지 않는다
    // (거부하면 무관한 자식 편집까지 404로 막는 회귀).
    const linkedIds = [
      ...new Set([
        ...(childEventIds ?? []),
        ...(parentEventId ? [parentEventId] : []),
      ]),
    ]
    if (linkedIds.length > 0) {
      const rows = await this.prisma.event.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, createdById: true, deletedAt: true, parentEventId: true },
      })
      const byId = new Map(rows.map((row) => [row.id, row]))
      for (const linkedId of linkedIds) {
        const row = byId.get(linkedId)
        if (!row || (row.deletedAt && row.parentEventId !== id)) {
          throw new NotFoundException(
            `연결하려는 사건을 찾을 수 없습니다: ${linkedId}`,
          )
        }
        if (row.createdById !== target.createdById) {
          throw new ForbiddenException('본인이 등록한 사건만 연결할 수 있습니다')
        }
      }
    }

    // 순환 검사 — *반영 후* 부모 체인 워크. undefined는 "변경 없음"이라 현재 부모에서 시작.
    const effectiveParentId =
      parentEventId === undefined ? target.parentEventId : parentEventId
    let cursor: string | null = effectiveParentId ?? null
    const visited = new Set<string>()
    while (cursor) {
      if (cursor === id) {
        throw new ConflictException(
          '순환 계층은 만들 수 없습니다: 지정한 상위 사건이 이 사건의 하위 계보에 있습니다',
        )
      }
      // 기존 데이터에 이미 순환이 있는 경우의 무한 루프 방어 — 이번 요청이 만든 순환은 아님.
      if (visited.has(cursor) || visited.size > 100) break
      visited.add(cursor)
      if (childSet.has(cursor)) {
        // 이번 요청으로 이 사건의 부모가 id가 될 예정 — 체인을 id로 이어 걷는다.
        cursor = id
        continue
      }
      const row: { parentEventId: string | null } | null =
        await this.prisma.event.findUnique({
          where: { id: cursor },
          select: { parentEventId: true },
        })
      const dbParent = row?.parentEventId ?? null
      if (dbParent === id && childEventIds !== undefined) {
        // 현재는 id의 자식이지만 새 목록에 없음 → 이번 요청으로 분리(delete-recreate가
        // 부모를 null로 리셋). 반영 후 체인은 여기서 끊긴다 — 분리한 자식(의 서브트리)
        // 으로 재부모화하는 합법 요청을 409로 오탐하지 않기 위한 분기.
        cursor = null
        continue
      }
      cursor = dbParent
    }
  }

  /**
   * 연결 대상 존재·소유권만 검증 — create 경로용(새 사건은 어떤 체인에도 없어
   * 순환이 불가능하므로 순환 워크는 생략). childEventIds는 상대 사건의
   * parentEventId를 덮어쓰는 쓰기라 소유권 검증 없이는 타 계정 사건 탈취 통로가 된다.
   */
  private async assertLinkTargetsOwnedBy(
    ownerId: string | null | undefined,
    linkedIds: string[],
  ): Promise<void> {
    const unique = [...new Set(linkedIds)]
    if (unique.length === 0) return
    const rows = await this.prisma.event.findMany({
      where: { id: { in: unique } },
      select: { id: true, createdById: true, deletedAt: true },
    })
    const byId = new Map(rows.map((row) => [row.id, row]))
    for (const linkedId of unique) {
      const row = byId.get(linkedId)
      if (!row || row.deletedAt) {
        throw new NotFoundException(
          `연결하려는 사건을 찾을 수 없습니다: ${linkedId}`,
        )
      }
      if (row.createdById !== ownerId) {
        throw new ForbiddenException('본인이 등록한 사건만 연결할 수 있습니다')
      }
    }
  }

  /**
   * 사건 삭제 (소프트 삭제)
   * @param id 사건 ID
   * @param userId 삭제하는 사용자 ID
   * @throws NotFoundException 사건을 찾을 수 없는 경우
   */
  async deleteEvent(id: string, userId?: string): Promise<void> {
    // 존재 여부 확인 (라벨용으로 캡처)
    const event = await this.getEventById(id)

    // 소프트 삭제: deletedAt 설정
    await this.prisma.event.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId || null,
      },
    })

    // 게이미피케이션: 소프트 삭제 시 점수 회수(어뷰징 방지). 복구 시 복원됨.
    await this.pointService.revokeForRecord(AggregateType.EVENT, id)
    await this.notificationService.notifyEvent(
      event.title,
      EventMethod.DELETE,
      id,
      yearPreview(event.startEra, event.startYear),
    )

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
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('본인이 삭제한 사건만 복구할 수 있습니다.')
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
    
    // 게이미피케이션: 복구 시 회수했던 점수 복원
    await this.pointService.restoreForRecord(AggregateType.EVENT, id)

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
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('본인이 삭제한 사건만 완전히 삭제할 수 있습니다.')
    }
    
    // 완전 삭제
    await this.events.delete(id)
    // 게이미피케이션: 소프트 삭제 단계에서 회수됐겠지만, 활성 상태에서 바로 완전삭제된 경우 대비(멱등)
    await this.pointService.revokeForRecord(AggregateType.EVENT, id)
    console.log(`🔥 사건 완전 삭제: ${id}`)
  }
}

