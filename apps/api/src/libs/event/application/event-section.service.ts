import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

/** 단락 한 줄 입력 — id가 있으면 기존 단락, 없으면 새 단락 */
export interface EventSectionInput {
  id?: string
  title: string
  content: string
  order?: number
  sectionType?: string
  /** 이 단락이 서술하는 하위 사건(D2) — 생략=유지, null=해제 */
  subjectEventId?: string | null
}

/**
 * 사건 단락 — **쓰기 단일 통로**, id 자연키 머지.
 *
 * 예전 저장은 단락을 전부 지우고 다시 만들었다(트랜잭션도 없이). 저장할 때마다 단락 id가 새로
 * 발급되니, 단락을 가리키는 무엇도 둘 수 없었다 — 단락→하위 사건 연결(D2)과 앞으로 본문 인용
 * (D4)이 그 대상이다. 이제 id가 있는 단락은 그 행을 고치고, 요청에서 빠진 단락만 지운다.
 * id 없이 오는 단락은 새로 만든다(옛 클라이언트는 그래서 예전처럼 동작한다).
 */
@Injectable()
export class EventSectionService {
  async sync(tx: Prisma.TransactionClient, eventId: string, inputs: EventSectionInput[]): Promise<void> {
    const existing = await tx.eventSection.findMany({
      where: { eventId },
      select: {
        id: true,
        title: true,
        content: true,
        order: true,
        sectionType: true,
        subjectEventId: true,
      },
    })
    const existingById = new Map(existing.map((row) => [row.id, row]))
    for (const input of inputs) {
      if (input.id && !existingById.has(input.id)) {
        throw new BadRequestException(`이 사건의 단락이 아닙니다: ${input.id}`)
      }
    }
    await assertSubjectsAreChildren(tx, eventId, inputs)

    const keepIds = new Set(inputs.map((input) => input.id).filter((id): id is string => !!id))
    const removed = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id)
    if (removed.length > 0) await tx.eventSection.deleteMany({ where: { id: { in: removed } } })

    for (const [index, input] of inputs.entries()) {
      const order = input.order ?? index
      const sectionType = input.sectionType || 'content'
      const current = input.id ? existingById.get(input.id) : undefined
      if (!current) {
        await tx.eventSection.create({
          data: {
            eventId,
            title: input.title,
            content: input.content,
            order,
            sectionType,
            subjectEventId: input.subjectEventId ?? null,
          },
        })
        continue
      }
      const patch: Prisma.EventSectionUncheckedUpdateInput = {}
      if (input.title !== current.title) patch.title = input.title
      if (input.content !== current.content) patch.content = input.content
      if (order !== current.order) patch.order = order
      if (sectionType !== current.sectionType) patch.sectionType = sectionType
      if (input.subjectEventId !== undefined && input.subjectEventId !== current.subjectEventId) {
        patch.subjectEventId = input.subjectEventId
      }
      if (Object.keys(patch).length > 0) {
        await tx.eventSection.update({ where: { id: current.id }, data: patch })
      }
    }
  }
}

/**
 * 단락이 가리키는 사건은 **이 사건의 하위 사건**이어야 한다 — 주 상위(parentEventId) 또는
 * 추가 상위(EventParentLink)로 이어진 살아 있는 사건.
 */
async function assertSubjectsAreChildren(
  tx: Prisma.TransactionClient,
  eventId: string,
  inputs: EventSectionInput[],
): Promise<void> {
  const subjectIds = [
    ...new Set(inputs.map((input) => input.subjectEventId).filter((id): id is string => !!id)),
  ]
  if (subjectIds.length === 0) return
  if (subjectIds.includes(eventId)) {
    throw new BadRequestException('단락이 자기 사건을 하위 사건으로 가리킬 수 없습니다')
  }
  const [primary, extra] = await Promise.all([
    tx.event.findMany({
      where: { id: { in: subjectIds }, parentEventId: eventId, deletedAt: null },
      select: { id: true },
    }),
    tx.eventParentLink.findMany({
      where: { childEventId: { in: subjectIds }, parentEventId: eventId, childEvent: { deletedAt: null } },
      select: { childEventId: true },
    }),
  ])
  const children = new Set([...primary.map((row) => row.id), ...extra.map((row) => row.childEventId)])
  const stray = subjectIds.filter((id) => !children.has(id))
  if (stray.length > 0) {
    throw new BadRequestException(`단락은 이 사건의 하위 사건만 가리킬 수 있습니다: ${stray.join(', ')}`)
  }
}
