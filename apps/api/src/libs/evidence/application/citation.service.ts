import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CitationTargetType, Prisma, SourceKind } from '@prisma/client'

import type { CitationInputDto, CreateSourceDto } from '../presentation/dto/evidence.dto'

export interface SourceView {
  id: string
  kind: SourceKind
  title: string
  authors: string | null
  publisher: string | null
  publishedYear: number | null
  url: string | null
  identifier: string | null
  accessedOn: string | null
  note: string | null
}

export interface CitationView {
  id: string
  locator: string | null
  quote: string | null
  note: string | null
  sortOrder: number
  source: SourceView
}

export const SOURCE_VIEW_SELECT = {
  id: true,
  kind: true,
  title: true,
  authors: true,
  publisher: true,
  publishedYear: true,
  url: true,
  identifier: true,
  accessedOn: true,
  note: true,
} as const

/** 인용의 자연키 — 같은 출처의 같은 위치는 한 줄 */
function citationKey(sourceId: string, locator: string | null | undefined): string {
  return `${sourceId}|${(locator ?? '').trim()}`
}

/**
 * 인용 — **쓰기 단일 통로**. 대상 타입이 무엇이든(측정값·사건·참여국…) 같은 경로로 붙인다.
 *
 * 저장은 참여국과 같은 자연키 머지다(event-country-participant.service). 전량 재생성하면
 * 사람이 다듬은 근거 구절(quote)·위치가 저장할 때마다 새 id로 갈려, 나중에 본문 참조 노드가
 * 인용 id를 가리키는 순간(D4) 링크가 끊긴다.
 */
@Injectable()
export class CitationService {
  /**
   * 대상의 인용 목록을 요청과 같게 만든다. 배열 순서 = 표시 순서.
   * 새 출처(source)는 식별자·URL이 같은 기존 출처가 있으면 그것을 재사용한다(중복 출처 방지).
   */
  async sync(
    tx: Prisma.TransactionClient,
    targetType: CitationTargetType,
    targetId: string,
    inputs: CitationInputDto[],
    actorId: string,
  ): Promise<void> {
    const resolved: Array<{ sourceId: string; input: CitationInputDto; sortOrder: number }> = []
    for (const [index, input] of inputs.entries()) {
      const sourceId = await this.resolveSourceId(tx, input, actorId)
      resolved.push({ sourceId, input, sortOrder: index })
    }

    const keys = resolved.map((entry) => citationKey(entry.sourceId, entry.input.locator))
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('같은 출처의 같은 위치를 두 번 인용했습니다')
    }

    const existing = await tx.citation.findMany({ where: { targetType, targetId } })
    const existingByKey = new Map(existing.map((row) => [citationKey(row.sourceId, row.locator), row]))
    const desiredKeys = new Set(keys)

    const removedIds = existing
      .filter((row) => !desiredKeys.has(citationKey(row.sourceId, row.locator)))
      .map((row) => row.id)
    if (removedIds.length > 0) {
      await tx.citation.deleteMany({ where: { id: { in: removedIds } } })
    }

    for (const entry of resolved) {
      const current = existingByKey.get(citationKey(entry.sourceId, entry.input.locator))
      const locator = entry.input.locator?.trim() || null
      if (!current) {
        await tx.citation.create({
          data: {
            sourceId: entry.sourceId,
            targetType,
            targetId,
            locator,
            quote: entry.input.quote ?? null,
            note: entry.input.note ?? null,
            sortOrder: entry.sortOrder,
          },
        })
        continue
      }
      const patch: Prisma.CitationUpdateInput = {}
      if (entry.input.quote !== undefined && entry.input.quote !== current.quote) {
        patch.quote = entry.input.quote
      }
      if (entry.input.note !== undefined && entry.input.note !== current.note) {
        patch.note = entry.input.note
      }
      if (entry.sortOrder !== current.sortOrder) patch.sortOrder = entry.sortOrder
      if (Object.keys(patch).length > 0) {
        await tx.citation.update({ where: { id: current.id }, data: patch })
      }
    }
  }

  /** 대상이 지워질 때 — 인용도 함께. 출처는 공유 자원이라 남긴다 */
  async removeForTargets(
    tx: Prisma.TransactionClient,
    targetType: CitationTargetType,
    targetIds: string[],
  ): Promise<void> {
    if (targetIds.length === 0) return
    await tx.citation.deleteMany({ where: { targetType, targetId: { in: targetIds } } })
  }

  async listForTargets(
    client: Prisma.TransactionClient,
    targetType: CitationTargetType,
    targetIds: string[],
  ): Promise<Map<string, CitationView[]>> {
    const byTarget = new Map<string, CitationView[]>()
    if (targetIds.length === 0) return byTarget
    const rows = await client.citation.findMany({
      where: { targetType, targetId: { in: targetIds } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { source: { select: SOURCE_VIEW_SELECT } },
    })
    for (const row of rows) {
      const list = byTarget.get(row.targetId) ?? []
      list.push({
        id: row.id,
        locator: row.locator,
        quote: row.quote,
        note: row.note,
        sortOrder: row.sortOrder,
        source: row.source,
      })
      byTarget.set(row.targetId, list)
    }
    return byTarget
  }

  private async resolveSourceId(
    tx: Prisma.TransactionClient,
    input: CitationInputDto,
    actorId: string,
  ): Promise<string> {
    if (input.sourceId && input.source) {
      throw new BadRequestException('인용에는 sourceId와 source 중 하나만 줍니다')
    }
    if (input.sourceId) {
      const found = await tx.source.findUnique({ where: { id: input.sourceId }, select: { id: true } })
      if (!found) throw new NotFoundException(`출처를 찾을 수 없습니다: ${input.sourceId}`)
      return found.id
    }
    if (!input.source) {
      throw new BadRequestException('인용에 출처(sourceId 또는 source)가 없습니다')
    }
    return findOrCreateSource(tx, input.source, actorId)
  }
}

/**
 * 같은 출처를 두 번 만들지 않는다 — 표준 식별자(ISBN·DOI) → URL 순으로 기존 행을 찾는다.
 * 둘 다 없으면 제목만으로는 판정하지 않는다(같은 제목의 다른 판본이 흔하다).
 */
export async function findOrCreateSource(
  tx: Prisma.TransactionClient,
  input: CreateSourceDto,
  actorId: string | null,
): Promise<string> {
  const identifier = input.identifier?.trim() || null
  const url = input.url?.trim() || null
  if (identifier) {
    const found = await tx.source.findFirst({ where: { identifier }, select: { id: true } })
    if (found) return found.id
  }
  if (url) {
    const found = await tx.source.findFirst({ where: { url }, select: { id: true } })
    if (found) return found.id
  }
  const created = await tx.source.create({
    data: {
      kind: input.kind as SourceKind,
      title: input.title.trim(),
      authors: input.authors?.trim() || null,
      publisher: input.publisher?.trim() || null,
      publishedYear: input.publishedYear ?? null,
      url,
      identifier,
      accessedOn: input.accessedOn ?? null,
      note: input.note ?? null,
      createdById: actorId,
    },
    select: { id: true },
  })
  return created.id
}
