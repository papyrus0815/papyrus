/**
 * 정당 × 이념 카탈로그 — 연결 동기화와 표시 캐시(B2, docs/political-party-model-review.md §4.3).
 *
 * 정본은 political_party_ideology(카탈로그 연결). political_party.ideology(문자열)는 연결 순서대로
 * 이름을 ', '로 이은 **표시 캐시**라 목록·검색·옛 화면이 조인 없이 돈다. 연결을 바꾸는 모든 길(API·시드)이
 * 이 파일을 거쳐 캐시를 같은 규칙으로 다시 쓴다.
 */
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

/** 문자열 이념(옛 입력) → 조각. 쉼표로 먼저 나누고, 통째로 카탈로그에 없는 조각만 가운뎃점으로 다시 나눈다 */
export function splitIdeologyText(text: string | null | undefined, isKnown: (piece: string) => boolean): string[] {
  if (!text) return []
  const pieces: string[] = []
  for (const commaPiece of text.split(/[,，]/)) {
    const trimmed = commaPiece.trim()
    if (!trimmed) continue
    if (isKnown(trimmed) || !/[·・]/.test(trimmed)) {
      pieces.push(trimmed)
      continue
    }
    for (const dotPiece of trimmed.split(/\s*[·・]\s*/)) {
      if (dotPiece.trim()) pieces.push(dotPiece.trim())
    }
  }
  return [...new Set(pieces)]
}

/** 이름·별칭 → 이념 id. 없으면 null */
export async function resolveIdeologyIdByLabel(db: Db, label: string): Promise<string | null> {
  const byName = await db.ideology.findUnique({ where: { name: label }, select: { id: true } })
  if (byName) return byName.id
  const byAlias = await db.ideologyAlias.findUnique({ where: { name: label }, select: { ideologyId: true } })
  return byAlias?.ideologyId ?? null
}

/**
 * 옛 문자열 입력(구 클라이언트·빠른 등록) → 이념 id 목록. 카탈로그 이름·별칭으로 찾고, 없으면 사상(IDEOLOGY)으로 새로 만든다.
 * 문자열이 정본으로 남지 않게 — 들어온 순간 카탈로그 연결로 바뀐다.
 */
export async function ideologyIdsFromText(db: Db, text: string | null | undefined): Promise<string[]> {
  const labels = new Set<string>()
  for (const row of await db.ideology.findMany({ select: { name: true } })) labels.add(row.name)
  for (const row of await db.ideologyAlias.findMany({ select: { name: true } })) labels.add(row.name)
  const ids: string[] = []
  for (const piece of splitIdeologyText(text, (label) => labels.has(label))) {
    const found = await resolveIdeologyIdByLabel(db, piece)
    ids.push(found ?? (await db.ideology.create({ data: { name: piece.slice(0, 120) }, select: { id: true } })).id)
  }
  return ids
}

/** 연결 순서대로 이름을 이어 정당의 ideology 캐시를 다시 쓴다 */
export async function refreshPartyIdeologyCache(db: Db, partyId: string): Promise<void> {
  const links = await db.politicalPartyIdeology.findMany({
    where: { partyId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { ideology: { select: { name: true } } },
  })
  await db.politicalParty.update({
    where: { id: partyId },
    data: { ideology: links.length > 0 ? links.map((link) => link.ideology.name).join(', ') : null },
  })
}

/**
 * 정당의 이념 집합·순서를 맞춘다(모달의 칩 목록). 이미 있는 연결은 기간·메모를 보존하고 순서만 갱신,
 * 빠진 연결은 지우고, 새 연결은 만든다. 대표가 하나도 없으면 첫 이념이 대표.
 */
export async function syncPartyIdeologies(db: Db, partyId: string, ideologyIds: string[]): Promise<void> {
  const ordered = [...new Set(ideologyIds)]
  const existing = await db.politicalPartyIdeology.findMany({ where: { partyId } })
  const keep = new Set(ordered)
  const removed = existing.filter((link) => !keep.has(link.ideologyId)).map((link) => link.id)
  if (removed.length > 0) {
    /* 빠진 연결의 인용도 — 인용은 다형이라 FK CASCADE가 없다 */
    await db.citation.deleteMany({ where: { targetType: 'PARTY_IDEOLOGY', targetId: { in: removed } } })
    await db.politicalPartyIdeology.deleteMany({ where: { id: { in: removed } } })
  }
  const byIdeology = new Map(existing.map((link) => [link.ideologyId, link]))
  for (const [index, ideologyId] of ordered.entries()) {
    const current = byIdeology.get(ideologyId)
    if (current) {
      if (current.sortOrder !== index) {
        await db.politicalPartyIdeology.update({ where: { id: current.id }, data: { sortOrder: index } })
      }
    } else {
      await db.politicalPartyIdeology.create({ data: { partyId, ideologyId, sortOrder: index } })
    }
  }
  await ensureOnePrimary(db, partyId)
  await refreshPartyIdeologyCache(db, partyId)
}

/** 대표가 없으면 첫 이념을 대표로, 여럿이면 순서상 첫 대표만 남긴다 */
export async function ensureOnePrimary(db: Db, partyId: string): Promise<void> {
  const links = await db.politicalPartyIdeology.findMany({
    where: { partyId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, isPrimary: true },
  })
  if (links.length === 0) return
  const primaries = links.filter((link) => link.isPrimary)
  if (primaries.length === 1) return
  const keepId = primaries[0]?.id ?? links[0].id
  await db.politicalPartyIdeology.updateMany({ where: { partyId, id: { not: keepId } }, data: { isPrimary: false } })
  await db.politicalPartyIdeology.update({ where: { id: keepId }, data: { isPrimary: true } })
}
