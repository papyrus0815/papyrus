/**
 * 정당 표지·당사 — 대표값 캐시 규칙(B4, docs/political-party-model-review.md §4.5).
 *
 * 정본은 political_party_symbol·political_party_headquarters. political_party.logoUrl·headquartersCityId는
 * 목록·카드가 조인 없이 쓰는 캐시라, 곁가지를 바꾸는 모든 길(표지·당사 CRUD, 정당 폼의 로고 업로드)이 여기를 거친다.
 */
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

/** 대표 LOGO 표지의 이미지 → logoUrl */
export async function refreshPartyLogoCache(db: Db, partyId: string): Promise<void> {
  const primary = await db.politicalPartySymbol.findFirst({
    where: { partyId, kind: 'LOGO', isPrimary: true },
    select: { imageUrl: true },
  })
  await db.politicalParty.update({ where: { id: partyId }, data: { logoUrl: primary?.imageUrl ?? null } })
}

/**
 * 정당 폼에서 로고를 올리거나 지울 때 — 대표 LOGO 표지를 맞춘다.
 * 올리면 대표 LOGO를 그 이미지로(없으면 만든다), 지우면 대표 표시만 끈다(이력은 남긴다).
 */
export async function syncPrimaryLogoFromParty(db: Db, partyId: string, logoUrl: string | null): Promise<void> {
  const primary = await db.politicalPartySymbol.findFirst({
    where: { partyId, kind: 'LOGO', isPrimary: true },
    select: { id: true, imageUrl: true },
  })
  if (logoUrl) {
    if (primary) {
      if (primary.imageUrl !== logoUrl) {
        await db.politicalPartySymbol.update({ where: { id: primary.id }, data: { imageUrl: logoUrl } })
      }
    } else {
      await db.politicalPartySymbol.create({ data: { partyId, kind: 'LOGO', imageUrl: logoUrl, isPrimary: true } })
    }
  } else if (primary) {
    await db.politicalPartySymbol.update({ where: { id: primary.id }, data: { isPrimary: false } })
  }
  await refreshPartyLogoCache(db, partyId)
}

/** 끝 키 — 지속 중은 무한대, 끝을 모르면 시작으로, 둘 다 없으면 가장 작게 */
function headquartersRecency(row: {
  isCurrent: boolean
  startEra: string | null
  startYear: number | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
}): number {
  if (row.isCurrent) return Number.POSITIVE_INFINITY
  const signed = (era: string | null, year: number) => (era === 'BC' ? -year : year)
  if (row.endYear != null) return signed(row.endEra, row.endYear) * 10000 + (row.endMonth ?? 12) * 100 + (row.endDay ?? 31)
  if (row.startYear != null) return signed(row.startEra, row.startYear) * 10000
  return Number.NEGATIVE_INFINITY
}

/** 지속 중 당사(없으면 가장 늦게까지 쓴 당사)의 도시 → headquartersCityId */
export async function refreshPartyHeadquartersCache(db: Db, partyId: string): Promise<void> {
  const rows = await db.politicalPartyHeadquarters.findMany({
    where: { partyId },
    select: {
      cityId: true,
      isCurrent: true,
      startEra: true,
      startYear: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      endDay: true,
    },
  })
  const latest = [...rows].sort((left, right) => headquartersRecency(right) - headquartersRecency(left))[0]
  await db.politicalParty.update({ where: { id: partyId }, data: { headquartersCityId: latest?.cityId ?? null } })
}

/** 상징색 배열 검증 — #RRGGBB 문자열, 최대 12개, 중복 제거(대문자). 형식이 틀리면 null 대신 에러 문구 */
export function normalizeColorPalette(raw: unknown): { value: string[] | null; error: string | null } {
  if (raw == null) return { value: null, error: null }
  if (!Array.isArray(raw)) return { value: null, error: '상징색은 #RRGGBB 문자열 배열이어야 합니다.' }
  const colors: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') return { value: null, error: '상징색은 #RRGGBB 문자열 배열이어야 합니다.' }
    const hex = (item.trim().startsWith('#') ? item.trim() : `#${item.trim()}`).toUpperCase()
    if (!/^#[0-9A-F]{6}$/.test(hex)) return { value: null, error: `상징색 형식이 올바르지 않습니다: ${item}` }
    if (!colors.includes(hex)) colors.push(hex)
  }
  if (colors.length > 12) return { value: null, error: '상징색은 12개까지입니다.' }
  return { value: colors.length > 0 ? colors : null, error: null }
}
