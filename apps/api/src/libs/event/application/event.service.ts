import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { EventRepository } from '../domain/event.repository'
import { Event } from '../domain/event.entity'
import { AggregateType, EventMethod, Prisma, PrismaClient } from '@prisma/client'
import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { NotificationService } from '../../notification/application/notification.service'
import { yearPreview } from '../../shared/notification-preview.util'

/**
 * updateEvent 계층 트랜잭션이 소비하는 추가 상위 엣지(EventParentLink) 쓰기 계획.
 * - none: 엣지 변경 없음
 * - clearAll: 주 상위 해제 통과 — 소프트삭제-부모(유령) 엣지까지 전부 제거(INV-2)
 * - diff: finalExtras로 전체목록 덮어쓰기 — 삭제는 살아있는 부모의 엣지에만(유령 보존)
 */
type ExtraParentEdgePlan =
  | { kind: 'none' }
  | { kind: 'clearAll' }
  | { kind: 'diff'; finalExtras: string[] }

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
    /**
     * 추가 상위 사건 ID 목록(EventParentLink 엣지) — 주 상위(parentEventId)가 있을 때만
     * 허용(INV-2)·주 상위와 중복 금지(INV-1). docs/event-multi-parent-review.md §4.2 W4.
     */
    extraParentEventIds?: string[],
  ): Promise<Event> {
    // 중복 체크 — 같은 계정의 미삭제 사건 안에서만(타 계정 제목 충돌·소프트삭제 좀비 제외).
    const existing = await this.events.findByTitle(
      data.title,
      data.createdById ?? undefined,
    )
    if (existing) {
      throw new ConflictException(
        `Event with title ${data.title} already exists`,
      )
    }

    // 상위·하위·추가 상위 연결 가드 — 존재·소유권 + 불변식(INV-1·2) + 순환.
    // (childEventIds는 상대 사건의 부모 FK를 덮어쓰므로 update와 동일하게 가드.)
    const extraIds = [...new Set(extraParentEventIds ?? [])]
    if (
      data.parentEventId ||
      (childEventIds && childEventIds.length > 0) ||
      extraIds.length > 0
    ) {
      // INV-2: 추가 상위는 주 상위가 있는 사건에만 — 루트판정(parentEventId IS NULL) 보존.
      if (extraIds.length > 0 && !data.parentEventId) {
        throw new ConflictException(
          '주 상위가 없는 사건에는 추가 상위를 연결할 수 없습니다 — 먼저 상위 사건을 지정하세요.',
        )
      }
      // INV-1: 주 상위와 중복 엣지 금지 — 명시 제출은 fail-loud.
      if (data.parentEventId && extraIds.includes(data.parentEventId)) {
        throw new ConflictException(
          '이미 대표 상위 사건입니다 — 추가 상위로 중복 연결할 수 없습니다.',
        )
      }
      await this.assertLinkTargetsOwnedBy(data.createdById, [
        ...(childEventIds ?? []),
        ...(data.parentEventId ? [data.parentEventId] : []),
        ...extraIds,
      ])
      // 순환: 신설 사건이라도 위(주·추가 상위)와 아래(childEventIds)를 동시에 연결하면
      // 생성 즉시 순환이 가능(예: 새 부모 P가 이번에 붙는 자식 C의 자손 — 기존
      // '새 사건은 순환 불가' 전제의 잠복 구멍). 위·아래가 모두 있을 때만 반영 후
      // 그래프로 검사 — 센티널 id는 DB에 없어 childSet 치환으로만 도달된다.
      if (
        (data.parentEventId || extraIds.length > 0) &&
        childEventIds &&
        childEventIds.length > 0
      ) {
        await this.assertNoHierarchyCycle(
          EventService.CREATE_CYCLE_SENTINEL,
          data.parentEventId ?? null,
          childEventIds,
          extraIds,
        )
      }
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

    // 🆕 기존 사건을 하위로 연결 + 추가 상위 엣지 — 계층 쓰기를 한 $transaction으로
    // (부분 실패 시 반쯤 연결된 상태 방지, 기존 비트랜잭션 Promise.all 대체).
    // 신설 사건을 가리키는 기존 엣지는 있을 수 없어 attach collapse는 자연 no-op — 생략.
    if ((childEventIds && childEventIds.length > 0) || extraIds.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        if (childEventIds && childEventIds.length > 0) {
          console.log(
            `🔗 기존 사건 ${childEventIds.length}개를 하위 사건으로 연결...`,
          )
          await tx.event.updateMany({
            where: { id: { in: childEventIds } },
            data: { parentEventId: event.id },
          })
        }
        if (extraIds.length > 0) {
          await tx.eventParentLink.createMany({
            data: extraIds.map((parentId) => ({
              childEventId: event.id,
              parentEventId: parentId,
            })),
            skipDuplicates: true,
          })
        }
      })
      if (childEventIds && childEventIds.length > 0) {
        console.log(`✅ ${childEventIds.length}개 사건이 하위 사건으로 연결됨`)
      }
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
    /**
     * 추가 상위 사건 ID 전체 목록(EventParentLink 엣지) — childEventIds와 동형의
     * 전체목록 덮어쓰기 규약: undefined=변경 없음, []=전부 해제.
     * 불변식·엣지 diff는 docs/event-multi-parent-review.md §4.2 매트릭스 참조.
     */
    extraParentEventIds?: string[],
    /**
     * 계층 연결 사유 — *부분 업서트* 규약(전체목록 아님): undefined=변경 없음, 나열된
     * 쌍만 터치. reason 문자열=업서트, null(또는 공백)=행 삭제. 인접(멤버십) 채널과
     * 독립 — hierarchyTouched 게이트를 태우지 않아 무관 편집이 순환 BFS로 막히지 않는다.
     * parentLinkReasons: 이 사건이 자식인 쌍(상위와의 연결). childLinkReasons: 부모인 쌍.
     * docs/event-subevent-link-reason-review.md §2.2.
     */
    parentLinkReasons?: Array<{ parentEventId: string; reason: string | null }>,
    childLinkReasons?: Array<{ childEventId: string; reason: string | null }>,
  ): Promise<Event> {
    // 존재 여부 확인 (소유자 스코프한 제목 중복 검사에 사용)
    const target = await this.getEventById(id)

    // 제목 변경 시 중복 체크 — 같은 계정의 미삭제 사건 안에서, 자기 자신 제외.
    if (data.title) {
      const existing = await this.events.findByTitle(
        data.title,
        target.createdById ?? undefined,
      )
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Event with title ${data.title} already exists`,
        )
      }
    }

    // 상위·하위·추가 상위 연결 검증 — 존재·소유권·불변식(INV-1·2·3)·순환.
    // 순환은 단일 부모 체인이 아닌 '주 상위 FK ∪ 추가 상위 엣지' 합집합 그래프의
    // 반영 후 상향 도달성(BFS)으로 검사한다. 쓰기 시작 전(비트랜잭션 구간 앞)에 전부
    // 검증하고, 통과 시 아래 계층 트랜잭션이 소비할 엣지 쓰기 계획을 받는다.
    const hierarchyTouched =
      data.parentEventId !== undefined ||
      childEventIds !== undefined ||
      extraParentEventIds !== undefined
    let edgePlan: ExtraParentEdgePlan = { kind: 'none' }
    if (hierarchyTouched) {
      edgePlan = await this.assertHierarchyLinkable(
        id,
        target,
        data.parentEventId,
        childEventIds,
        extraParentEventIds,
      )
    }

    // 연결 사유(부분 업서트) — 인접 채널과 독립. 같은 배열 내 중복 쌍은 비결정 동작이라
    // 선차단(400). 유효 쌍(실제 링크) 밖 업서트는 트랜잭션 안에서 반영 후 상태로 검증.
    const reasonsTouched =
      parentLinkReasons !== undefined || childLinkReasons !== undefined
    if (parentLinkReasons !== undefined) {
      assertNoDuplicateKey(
        parentLinkReasons,
        (entry) => entry.parentEventId,
        '같은 상위 사건에 대한 연결 사유가 중복 제출되었습니다',
      )
    }
    if (childLinkReasons !== undefined) {
      assertNoDuplicateKey(
        childLinkReasons,
        (entry) => entry.childEventId,
        '같은 하위 사건에 대한 연결 사유가 중복 제출되었습니다',
      )
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

    // 🆕 계층 쓰기(하위 재설정·추가 상위 엣지 diff)와 본체 update를 단일 $transaction으로
    // 원자화 — 기존 '자식 tx vs 본체 쓰기' 분리(부분 실패 시 계층만 반영) 부채 해소.
    //
    // detach는 *살아있는* 자식만(deletedAt:null). 소프트삭제된 자식은 부모 FK를
    // 보존해야 한다 — deleteEvent가 deletedAt만 세팅하고 restoreEvent가 부모를
    // 복원하지 않으므로, 여기서 null로 만들면 복구 시 부모를 영구히 잃는다. 게다가
    // 프론트가 만드는 childEventIds에는 소프트삭제 자식이 애초에 없어(loadEventDetail이
    // deletedAt:null로 걸러 응답) 재링크에서도 빠진다.
    // (존재·소유권·불변식·순환·detach 409는 위 assertHierarchyLinkable에서 선검증.)
    const updated =
      hierarchyTouched || reasonsTouched
        ? await this.prisma.$transaction(async (tx) => {
          if (childEventIds !== undefined) {
            console.log(
              `🔗 기존 사건 ${childEventIds.length}개를 하위 사건으로 연결...`,
            )
            await tx.event.updateMany({
              where: { parentEventId: id, deletedAt: null },
              data: { parentEventId: null },
            })
            if (childEventIds.length > 0) {
              await tx.event.updateMany({
                where: { id: { in: childEventIds } },
                data: { parentEventId: id },
              })
              // attach collapse(INV-1): 이 사건을 '추가 상위'로 갖던 자식이 주 상위로
              // 붙으면 중복 엣지가 되므로 자동 제거 — 엣지 축소라 auto-heal 안전.
              await tx.eventParentLink.deleteMany({
                where: { childEventId: { in: childEventIds }, parentEventId: id },
              })
              console.log(`✅ ${childEventIds.length}개 사건이 하위 사건으로 연결됨`)
            }
          }
          if (edgePlan.kind === 'clearAll') {
            // 주 상위 해제(살아있는 추가 상위 0) 통과 — 소프트삭제-부모 엣지까지 정리.
            // '주 상위 없이 엣지 존속 불가'(INV-2) 계약이 부활 약속에 우선한다.
            await tx.eventParentLink.deleteMany({ where: { childEventId: id } })
          } else if (edgePlan.kind === 'diff') {
            // 삭제는 살아있는 부모의 엣지에만(childEventIds detach의 deletedAt:null
            // 정책 거울) — 소프트삭제 부모의 엣지는 보존해 복구 시 관계가 부활한다.
            await tx.eventParentLink.deleteMany({
              where: {
                childEventId: id,
                parentEventId: { notIn: edgePlan.finalExtras },
                parentEvent: { deletedAt: null },
              },
            })
            if (edgePlan.finalExtras.length > 0) {
              await tx.eventParentLink.createMany({
                data: edgePlan.finalExtras.map((parentId) => ({
                  childEventId: id,
                  parentEventId: parentId,
                })),
                skipDuplicates: true,
              })
            }
          }
          // 연결 사유 — 인접 쓰기 *후* 실행해 유효 쌍 집합을 반영 후(effective) 상태로
          // 읽는다(같은 patch가 방금 붙인 링크에도 사유를 쓸 수 있게). 승격 swap 등은
          // 슬롯만 바꾸므로 쌍 자연키 사유는 자동으로 따라간다(이관 코드 없음).
          if (reasonsTouched) {
            await this.applyHierarchyReasons(
              tx,
              id,
              parentLinkReasons,
              childLinkReasons,
            )
          }
          return this.events.update(id, data, tx)
        })
        : await this.events.update(id, data)
    await this.notificationService.notifyEvent(
      updated.title,
      EventMethod.UPDATE,
      updated.id,
      yearPreview(updated.startEra, updated.startYear),
    )
    return updated
  }

  /** create 경로 순환검사용 센티널 id — DB에 존재하지 않아 childSet 치환으로만 도달된다. */
  private static readonly CREATE_CYCLE_SENTINEL = '__create-cycle-sentinel__'

  /**
   * 순환 BFS fail-closed 캡(정책 — docs/event-multi-parent-review.md §4.4).
   * 초과 시 409: 통과(fail-open)는 순환 유입 통로라 금지. 합법 초대형 계보가
   * 오탐되면 이 상수를 튜닝한다(그때 warn 텔레메트리 근거 확보).
   */
  private static readonly CYCLE_MAX_VISITED = 500
  private static readonly CYCLE_MAX_DEPTH = 50

  /**
   * 상위·하위·추가 상위 연결 검증 — 존재·소유권·불변식(INV-1·2·3)·순환.
   * 통과 시 updateEvent의 계층 트랜잭션이 소비할 추가 상위 엣지 쓰기 계획을 반환한다.
   *
   * 불변식(docs/event-multi-parent-review.md §4.2 매트릭스):
   * - W1(extras patch): 자기참조·주 상위 중복(a-1)·주 상위 부재(b-추가)·유령 주 상위
   *   상태의 신규 엣지는 409. diff 삭제는 살아있는 부모의 엣지에만.
   * - W2(parent patch): 새 주 상위가 기존 엣지와 겹치면 자동 collapse(스칼라 경유 승격 —
   *   정보 무손실 격 상승). null 해제인데 살아있는 추가 상위 잔존이면 409(b-해제),
   *   통과 시 소프트삭제-부모 엣지까지 정리(clearAll).
   * - W3(childEventIds patch): 분리 예정 자식이 엣지 보유 시 409(몰래 승격·무성 엣지
   *   삭제 금지), 새로 붙는 자식의 기존 엣지는 attach collapse(트랜잭션에서).
   * - 가드 스코프: (b)류 '유효 상태' 검증은 계층 키가 patch에 있을 때만 평가 —
   *   기존/레이스 유입 고아 행이 무관 편집(제목 자동저장 등)을 잠그지 않게 한다.
   *
   * @param id 수정 대상 사건 ID
   * @param target 수정 대상 엔티티(존재 확인 완료 — createdById·parentEventId 사용)
   * @param parentEventId 새 주 상위 — undefined면 변경 없음, null이면 해제(3상)
   * @param childEventIds 새 하위 전체 목록 — undefined면 변경 없음
   * @param extraParentEventIds 새 추가 상위 전체 목록 — undefined면 변경 없음, []면 전부 해제
   */
  private async assertHierarchyLinkable(
    id: string,
    target: Event,
    parentEventId?: string | null,
    childEventIds?: string[],
    extraParentEventIds?: string[],
  ): Promise<ExtraParentEdgePlan> {
    const childSet = new Set(childEventIds ?? [])
    if (childSet.has(id)) {
      throw new ConflictException('자기 자신을 하위 사건으로 연결할 수 없습니다')
    }
    if (parentEventId === id) {
      throw new ConflictException('자기 자신을 상위 사건으로 지정할 수 없습니다')
    }
    const extrasPatch =
      extraParentEventIds === undefined
        ? undefined
        : [...new Set(extraParentEventIds)]
    if (extrasPatch?.includes(id)) {
      // INV-3
      throw new ConflictException('자기 자신을 추가 상위로 연결할 수 없습니다')
    }

    // 현행 엣지 로드 — 유령(소프트삭제 부모) 판별 포함. 이후 모든 가드가 재사용한다.
    const currentEdges = await this.prisma.eventParentLink.findMany({
      where: { childEventId: id },
      select: {
        parentEventId: true,
        parentEvent: { select: { deletedAt: true } },
      },
    })
    const currentAllExtraIds = currentEdges.map((edge) => edge.parentEventId)
    const currentLiveExtraIds = currentEdges
      .filter((edge) => !edge.parentEvent.deletedAt)
      .map((edge) => edge.parentEventId)
    const ghostExtraIds = currentEdges
      .filter((edge) => edge.parentEvent.deletedAt)
      .map((edge) => edge.parentEventId)
    const knownEdgeSet = new Set(currentAllExtraIds)

    // effective 값 통일 — 가드는 '제출값 ?? DB의 살아있는-부모 엣지' 기준으로 평가한다.
    const effectiveParentId =
      parentEventId === undefined ? (target.parentEventId ?? null) : parentEventId
    const effectiveExtras = extrasPatch ?? currentLiveExtraIds

    // (a-1) INV-1: 명시 제출된 추가 상위가 주 상위와 중복 — fail-loud.
    // (스칼라 경유 — parent patch가 기존 엣지 위로 이동 — 는 아래 (a-2) 자동 collapse.)
    if (
      extrasPatch !== undefined &&
      effectiveParentId &&
      extrasPatch.includes(effectiveParentId)
    ) {
      throw new ConflictException(
        '이미 대표 상위 사건입니다 — 추가 상위로 중복 연결할 수 없습니다.',
      )
    }

    // (b) INV-2: 주 상위 없이 추가 상위 존속 불가 — 방향별 문구.
    if (effectiveParentId === null && effectiveExtras.length > 0) {
      if (extrasPatch !== undefined) {
        throw new ConflictException(
          '주 상위가 없는 사건에는 추가 상위를 연결할 수 없습니다 — 먼저 상위 사건을 지정하세요.',
        )
      }
      // parentEventId: null 해제 요청인데 살아있는 추가 상위 잔존.
      throw new ConflictException(
        `추가 상위 ${effectiveExtras.length}개가 연결되어 있어 상위를 해제할 수 없습니다 — 추가 상위를 대표로 승격하거나 함께 해제하세요.`,
      )
    }

    // 존재 + 소유권 — 연결에 등장하는 모든 상대 사건을 한 번에 검사.
    // 소프트삭제 통과 예외(역할별 — 전체목록 재전송으로 무관 편집이 404로 막히는 회귀 방지):
    //  · 하위: 이미 이 사건의 자식인 항목만(기존 정책 — 링크 불변)
    //  · 추가 상위: 이미 엣지가 있는 항목만(상세 응답이 걸러 보낸 목록의 재전송 — 링크 불변)
    //  · 새 주 상위: 예외 없음 — 유령 승격 금지(§4.5-4).
    const linkedIds = [
      ...new Set([
        ...(childEventIds ?? []),
        ...(parentEventId ? [parentEventId] : []),
        ...(extrasPatch ?? []),
      ]),
    ]
    if (linkedIds.length > 0) {
      const rows = await this.prisma.event.findMany({
        where: { id: { in: linkedIds } },
        select: {
          id: true,
          createdById: true,
          deletedAt: true,
          parentEventId: true,
        },
      })
      const byId = new Map(rows.map((row) => [row.id, row]))
      for (const linkedId of linkedIds) {
        const row = byId.get(linkedId)
        if (!row) {
          throw new NotFoundException(
            `연결하려는 사건을 찾을 수 없습니다: ${linkedId}`,
          )
        }
        if (row.deletedAt) {
          const asNewParent = linkedId === parentEventId
          const keptChild = childSet.has(linkedId) && row.parentEventId === id
          const keptExtra =
            (extrasPatch?.includes(linkedId) ?? false) && knownEdgeSet.has(linkedId)
          if (asNewParent || !(keptChild || keptExtra)) {
            throw new NotFoundException(
              `연결하려는 사건을 찾을 수 없습니다: ${linkedId}`,
            )
          }
        }
        if (row.createdById !== target.createdById) {
          throw new ForbiddenException('본인이 등록한 사건만 연결할 수 있습니다')
        }
      }
    }

    // (유령) 주 상위가 소프트삭제 상태에서 '신규' 엣지 추가는 409 — UI는 '주 상위 없음'
    // 으로 보이는데 추가 상위만 자라는 모순 차단. 기존 엣지 재전송은 통과(위 예외와 짝).
    // patch로 온 새 주 상위는 위 존재 검사가 유령을 404로 걸렀으므로, 여기 대상은
    // '변경 없음(undefined)'으로 DB에서 온 현행 주 상위뿐이다.
    if (
      extrasPatch !== undefined &&
      effectiveParentId &&
      parentEventId === undefined &&
      extrasPatch.some((pid) => !knownEdgeSet.has(pid))
    ) {
      const parentRow = await this.prisma.event.findUnique({
        where: { id: effectiveParentId },
        select: { deletedAt: true },
      })
      if (parentRow?.deletedAt) {
        throw new ConflictException(
          '현재 상위 사건이 삭제 상태입니다 — 복구하거나 상위를 정리한 뒤 추가 상위를 연결하세요.',
        )
      }
    }

    // W3 detach 가드: 분리 예정 자식이 추가 상위 엣지를 보유하면 409 — 몰래 승격도,
    // 무성 엣지 삭제도 하지 않는다(자식 본인의 주 상위 해제 409와 대칭).
    if (childEventIds !== undefined) {
      const detachRows = await this.prisma.event.findMany({
        where: {
          parentEventId: id,
          deletedAt: null,
          ...(childSet.size > 0 ? { id: { notIn: [...childSet] } } : {}),
        },
        select: { id: true, title: true },
      })
      if (detachRows.length > 0) {
        const blocked = await this.prisma.eventParentLink.findFirst({
          where: { childEventId: { in: detachRows.map((row) => row.id) } },
          select: { childEventId: true },
        })
        if (blocked) {
          const blockedTitle =
            detachRows.find((row) => row.id === blocked.childEventId)?.title ??
            blocked.childEventId
          throw new ConflictException(
            `'${blockedTitle}'에 추가 상위가 연결되어 있어 하위에서 분리할 수 없습니다 — 해당 사건에서 추가 상위를 정리하세요.`,
          )
        }
      }
    }

    // 엣지 쓰기 계획 확정
    let edgePlan: ExtraParentEdgePlan = { kind: 'none' }
    if (extrasPatch !== undefined) {
      edgePlan =
        effectiveParentId === null
          ? { kind: 'clearAll' } // (b) 통과 = extras []·주 상위 해제 — 유령 엣지까지 정리
          : { kind: 'diff', finalExtras: extrasPatch }
    } else if (parentEventId !== undefined) {
      if (parentEventId === null) {
        // (b-해제) 통과 = 살아있는 엣지 0 — 잔존 유령 엣지 정리(V1-7: INV-2가 부활 약속에 우선).
        edgePlan = { kind: 'clearAll' }
      } else if (currentAllExtraIds.includes(parentEventId)) {
        // (a-2) 스칼라 경유 승격 — 새 주 상위와 겹치는 엣지 자동 collapse.
        edgePlan = {
          kind: 'diff',
          finalExtras: currentLiveExtraIds.filter((pid) => pid !== parentEventId),
        }
      }
    }

    // 순환 검사 — 반영 후 이 사건의 상위 집합(주 상위 + 엣지, 보존되는 유령 엣지 포함).
    const bfsExtras =
      edgePlan.kind === 'clearAll'
        ? []
        : edgePlan.kind === 'diff'
          ? [...new Set([...edgePlan.finalExtras, ...ghostExtraIds])]
          : currentAllExtraIds
    await this.assertNoHierarchyCycle(id, effectiveParentId, childEventIds, bfsExtras)

    return edgePlan
  }

  /**
   * 계층 연결 사유(EventHierarchyReason) 부분 업서트 — 트랜잭션 안에서 인접 쓰기 *후* 실행.
   *
   * 유효 쌍 검증은 반영 후(effective) DB 상태로 읽는다:
   *  - parentLinkReasons(이 사건=자식): 유효 상위 = 주 상위 FK ∪ 모든 엣지(살아있는+유령).
   *    유령(소프트삭제 부모) 쌍도 허용 — R-1 부활 약속의 거울(재연결 시 사유 부활).
   *  - childLinkReasons(이 사건=부모): 유효 자식 = 살아있는 주 상위 FK 자식(편집 자식 쪽 단일화).
   *
   * reason 정규화: trim 후 빈 문자열이면 행 삭제(NOT NULL 컬럼에 '' 저장 금지). 삭제(빈/누락)는
   * 링크 상태와 무관하게 허용(정리 어포던스). 업서트는 delete-then-create — 이벤트 도메인 관례.
   */
  private async applyHierarchyReasons(
    tx: Prisma.TransactionClient,
    id: string,
    parentLinkReasons?: Array<{ parentEventId: string; reason: string | null }>,
    childLinkReasons?: Array<{ childEventId: string; reason: string | null }>,
  ): Promise<void> {
    if (parentLinkReasons !== undefined && parentLinkReasons.length > 0) {
      const self = await tx.event.findUnique({
        where: { id },
        select: { parentEventId: true },
      })
      const edges = await tx.eventParentLink.findMany({
        where: { childEventId: id },
        select: { parentEventId: true },
      })
      // 유령(소프트삭제 부모) 엣지까지 포함 — R-1 부활 약속. 주 상위 FK도 유령이면
      // self.parentEventId가 여전히 가리키므로 유효 집합에 든다.
      const validParents = new Set<string>([
        ...(self?.parentEventId ? [self.parentEventId] : []),
        ...edges.map((edge) => edge.parentEventId),
      ])
      for (const entry of parentLinkReasons) {
        const normalized = (entry.reason ?? '').trim()
        await tx.eventHierarchyReason.deleteMany({
          where: { childEventId: id, parentEventId: entry.parentEventId },
        })
        if (!normalized) continue
        if (!validParents.has(entry.parentEventId)) {
          throw new BadRequestException(
            '연결되지 않은 상위 사건에는 연결 사유를 기록할 수 없습니다',
          )
        }
        await tx.eventHierarchyReason.create({
          data: {
            childEventId: id,
            parentEventId: entry.parentEventId,
            reason: normalized,
          },
        })
      }
    }

    if (childLinkReasons !== undefined && childLinkReasons.length > 0) {
      const children = await tx.event.findMany({
        where: { parentEventId: id, deletedAt: null },
        select: { id: true },
      })
      const validChildren = new Set(children.map((child) => child.id))
      for (const entry of childLinkReasons) {
        const normalized = (entry.reason ?? '').trim()
        await tx.eventHierarchyReason.deleteMany({
          where: { childEventId: entry.childEventId, parentEventId: id },
        })
        if (!normalized) continue
        if (!validChildren.has(entry.childEventId)) {
          throw new BadRequestException(
            '연결되지 않은 하위 사건에는 연결 사유를 기록할 수 없습니다',
          )
        }
        await tx.eventHierarchyReason.create({
          data: {
            childEventId: entry.childEventId,
            parentEventId: id,
            reason: normalized,
          },
        })
      }
    }
  }

  /**
   * 순환 검사 — '주 상위 FK ∪ 추가 상위 엣지' 합집합 그래프에서 *반영 후* 상태의
   * 상향 BFS 도달성. 레벨 단위 배치 로드(스텝당 이벤트·엣지 각 1쿼리)로 기존
   * 노드당 findUnique N+1을 제거했다. 소프트삭제 무시 — 전 엣지를 걷어, 삭제된
   * 중간 조상을 복구하는 순간 순환이 성립하는 상태를 애초에 차단한다.
   *
   * fail-closed: visited·depth 캡 초과 시 409(§4.4 — 통과는 순환 유입 통로라 금지).
   * visited 재방문은 '해당 노드 확장 생략'(다이아몬드 dedup·기존 데이터의 선재 순환
   * 무한루프 방어)으로, '기존 데이터의 죄'와 '검사 미완'을 구분한다.
   *
   * @param id 수정 대상 — create는 CREATE_CYCLE_SENTINEL(DB에 없어 childSet 치환으로만 도달)
   * @param effectiveParentId 반영 후 주 상위(undefined 해소 완료 값)
   * @param childEventIds 새 하위 전체 목록 — undefined면 변경 없음(절단 분기 비활성)
   * @param extraParentIds 반영 후 이 사건의 추가 상위 엣지(보존 유령 포함)
   */
  private async assertNoHierarchyCycle(
    id: string,
    effectiveParentId: string | null,
    childEventIds: string[] | undefined,
    extraParentIds: string[],
  ): Promise<void> {
    const childSet = new Set(childEventIds ?? [])
    const start = [
      ...new Set([
        ...(effectiveParentId ? [effectiveParentId] : []),
        ...extraParentIds,
      ]),
    ]
    if (start.length === 0) return

    /** 경로 역추적용 — prev.get(p) = p를 발견한 자식 노드(진단성 409 문구, G3) */
    const prev = new Map<string, string>()
    const visited = new Set(start)
    let frontier = start
    let depth = 0

    while (frontier.length > 0) {
      depth += 1
      if (depth > EventService.CYCLE_MAX_DEPTH) {
        throw new ConflictException(
          '계층이 너무 깊어 순환 검사를 완료할 수 없습니다.',
        )
      }
      const [rows, links] = await Promise.all([
        this.prisma.event.findMany({
          where: { id: { in: frontier } },
          select: { id: true, parentEventId: true },
        }),
        this.prisma.eventParentLink.findMany({
          where: { childEventId: { in: frontier } },
          select: { childEventId: true, parentEventId: true },
        }),
      ])
      const fkByNode = new Map(rows.map((row) => [row.id, row.parentEventId]))
      const extrasByNode = new Map<string, string[]>()
      for (const link of links) {
        const list = extrasByNode.get(link.childEventId)
        if (list) list.push(link.parentEventId)
        else extrasByNode.set(link.childEventId, [link.parentEventId])
      }

      const next: string[] = []
      for (const nodeId of frontier) {
        const nodeExtras = extrasByNode.get(nodeId) ?? []
        const dbParent = fkByNode.get(nodeId) ?? null
        // 오버레이 — 노드별 *반영 후* 부모 집합 P'(x)
        let parents: (string | null)[]
        if (childSet.has(nodeId)) {
          // 이번 요청으로 이 노드의 주 상위가 id가 될 예정 — 체인을 id로 치환.
          parents = [id, ...nodeExtras]
        } else if (childEventIds !== undefined && dbParent === id) {
          // 현재는 id의 자식이지만 새 목록에 없음 → 분리 예정 — 주 상위 체인 절단.
          // (W3 detach 409가 엣지 보유 자식을 선차단하므로 nodeExtras는 실질 빈
          //  집합이지만, 오버레이는 일반형 유지 — 가드 순서 변경에 견고.)
          parents = [...nodeExtras]
        } else {
          parents = [dbParent, ...nodeExtras]
        }
        for (const parentId of parents) {
          if (!parentId) continue
          if (parentId === id) {
            const pathLabel = await this.cyclePathTitles(nodeId, prev)
            throw new ConflictException(
              `순환 계층은 만들 수 없습니다: ${pathLabel} — 지정한 상위가 이 사건의 하위 계보에 있습니다`,
            )
          }
          if (!visited.has(parentId)) {
            visited.add(parentId)
            prev.set(parentId, nodeId)
            next.push(parentId)
          }
        }
      }
      if (visited.size > EventService.CYCLE_MAX_VISITED) {
        throw new ConflictException(
          '계층이 너무 깊어 순환 검사를 완료할 수 없습니다.',
        )
      }
      frontier = next
    }
  }

  /** 순환 검출 지점부터 prev 포인터 역추적으로 경로 사건 제목 최대 3개(진단성 — G3). */
  private async cyclePathTitles(
    fromNodeId: string,
    prev: Map<string, string>,
  ): Promise<string> {
    const pathIds: string[] = []
    let cursor: string | undefined = fromNodeId
    while (cursor && pathIds.length < 3) {
      pathIds.push(cursor)
      cursor = prev.get(cursor)
    }
    const rows = await this.prisma.event.findMany({
      where: { id: { in: pathIds } },
      select: { id: true, title: true },
    })
    const titleById = new Map(rows.map((row) => [row.id, row.title]))
    return pathIds
      .map((nodeId) => `'${titleById.get(nodeId) ?? nodeId}'`)
      .join(' → ')
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

    // 완전 삭제 — ParentChildEvent FK가 SetNull이라 주-자식의 FK는 앱이 개입 못 하는
    // 지점에서 무통보 NULL이 되는데, 자식의 event_parent_link는 이 사건의 Cascade 대상이
    // 아니라 잔존해 INV-2(추가 상위는 주 상위 필수)가 DB 레벨에서 깨진다.
    // → 엣지 보유 자식은 최소 엣지(createdAt asc → id asc)를 주 상위로 자동 승격 후 삭제.
    //   완전삭제는 이미 파괴적 confirm을 거친 맥락 — 남은 상위 연결은 사용자가 기록한
    //   정보라 보존을 우선한다(G4). 소프트삭제된 자식도 포함(엣지 불변식은 자식 생존과 무관).
    //   docs/event-multi-parent-review.md §4.6.
    await this.prisma.$transaction(async (tx) => {
      const children = await tx.event.findMany({
        where: { parentEventId: id },
        select: { id: true },
      })
      if (children.length > 0) {
        const links = await tx.eventParentLink.findMany({
          where: {
            childEventId: { in: children.map((child) => child.id) },
            parentEventId: { not: id }, // INV-1 위반 데이터 방어 — 삭제 대상으로의 승격 금지
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, childEventId: true, parentEventId: true },
        })
        const promotionByChild = new Map<
          string,
          { id: string; parentEventId: string }
        >()
        for (const link of links) {
          if (!promotionByChild.has(link.childEventId)) {
            promotionByChild.set(link.childEventId, link)
          }
        }
        for (const [childId, link] of promotionByChild) {
          await tx.event.update({
            where: { id: childId },
            data: { parentEventId: link.parentEventId },
          })
          await tx.eventParentLink.delete({ where: { id: link.id } })
        }
      }
      // 이후 본체 delete — SetNull은 엣지 없는 자식(정상 루트 승격)에만 발화하고,
      // 이 사건을 부모로 갖는 엣지 행은 Cascade로 동반 소멸한다.
      await this.events.delete(id, tx)
    })
    // 게이미피케이션: 소프트 삭제 단계에서 회수됐겠지만, 활성 상태에서 바로 완전삭제된 경우 대비(멱등)
    await this.pointService.revokeForRecord(AggregateType.EVENT, id)
    console.log(`🔥 사건 완전 삭제: ${id}`)
  }
}

/** 같은 키가 배열에 두 번 이상이면 400 — 부분 업서트의 비결정 동작 차단(연결 사유). */
function assertNoDuplicateKey<T>(
  items: T[],
  keyOf: (item: T) => string,
  message: string,
): void {
  const seen = new Set<string>()
  for (const item of items) {
    const key = keyOf(item)
    if (seen.has(key)) throw new BadRequestException(message)
    seen.add(key)
  }
}

