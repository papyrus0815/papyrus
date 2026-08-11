import { AggregateType, ArtifactRarity, Prisma } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 한국 역사 유물 데모 시드 (Phase A).
 * - "조선 왕실 유물"(JOSEON_ROYAL) 세트 + 시대별 명품 몇 종.
 * - linkedType/linkedId는 실제 백과 엔티티(Person/HistoricalCountry)를 이름으로 best-effort 조회해 연결.
 *   엔티티가 없으면 링크 없이 생성(유물 자체는 항상 생성). 이름(name) 기준 idempotent upsert.
 */
interface SeedArtifact {
  name: string
  era: string
  contentCentury: number
  rarity: ArtifactRarity
  pricePapy: number
  setKey: string | null
  description: string
  /** 연결 후보 (best-effort): 엔티티 타입 + 이름 검색어 */
  link?: { type: AggregateType; nameLike: string }
}

const ARTIFACTS: SeedArtifact[] = [
  {
    name: '훈민정음 해례본',
    era: '조선 15세기',
    contentCentury: 15,
    rarity: ArtifactRarity.LEGENDARY,
    pricePapy: 150,
    setKey: 'JOSEON_ROYAL',
    description: '세종이 창제한 한글의 원리를 풀이한 책. 국보이자 유네스코 세계기록유산.',
    link: { type: AggregateType.PERSON, nameLike: '세종' },
  },
  {
    name: '거북선',
    era: '조선 16세기',
    contentCentury: 16,
    rarity: ArtifactRarity.LEGENDARY,
    pricePapy: 150,
    setKey: 'JOSEON_ROYAL',
    description: '임진왜란에서 이순신이 이끈 돌격용 군함. 철갑·용머리가 특징.',
    link: { type: AggregateType.PERSON, nameLike: '이순신' },
  },
  {
    name: '측우기',
    era: '조선 15세기',
    contentCentury: 15,
    rarity: ArtifactRarity.RARE,
    pricePapy: 70,
    setKey: 'JOSEON_ROYAL',
    description: '세계 최초의 표준 강우량 측정기구. 세종 대 농업 정책의 산물.',
    link: { type: AggregateType.PERSON, nameLike: '세종' },
  },
  {
    name: '앙부일구',
    era: '조선 15세기',
    contentCentury: 15,
    rarity: ArtifactRarity.RARE,
    pricePapy: 70,
    setKey: 'JOSEON_ROYAL',
    description: '솥뚜껑 모양의 오목 해시계. 시각과 절기를 함께 읽을 수 있었다.',
    link: { type: AggregateType.PERSON, nameLike: '세종' },
  },
  {
    name: '자격루',
    era: '조선 15세기',
    contentCentury: 15,
    rarity: ArtifactRarity.RARE,
    pricePapy: 80,
    setKey: 'JOSEON_ROYAL',
    description: '스스로 시각을 알리는 물시계(자동 타종 장치). 장영실이 제작.',
    link: { type: AggregateType.HISTORICAL_COUNTRY, nameLike: '조선' },
  },
  {
    name: '고려청자 상감운학문 매병',
    era: '고려 12세기',
    contentCentury: 12,
    rarity: ArtifactRarity.RARE,
    pricePapy: 90,
    setKey: null,
    description: '비취색 유약과 상감 학·구름 무늬가 절정에 이른 고려 도자의 대표작.',
    link: { type: AggregateType.HISTORICAL_COUNTRY, nameLike: '고려' },
  },
  {
    name: '백제 금동대향로',
    era: '백제 6세기',
    contentCentury: 6,
    rarity: ArtifactRarity.LEGENDARY,
    pricePapy: 130,
    setKey: null,
    description: '백제 공예의 정수. 신선 세계를 정교하게 표현한 금동 향로.',
    link: { type: AggregateType.HISTORICAL_COUNTRY, nameLike: '백제' },
  },
  {
    name: '첨성대',
    era: '신라 7세기',
    contentCentury: 7,
    rarity: ArtifactRarity.COMMON,
    pricePapy: 40,
    setKey: null,
    description: '동양에서 가장 오래된 천문 관측대. 선덕여왕 대 경주에 세워졌다.',
    link: { type: AggregateType.HISTORICAL_COUNTRY, nameLike: '신라' },
  },
]

async function resolveLink(
  prisma: PrismaService,
  link?: SeedArtifact['link'],
): Promise<{ linkedType: AggregateType; linkedId: string } | Record<string, never>> {
  if (!link) return {}
  let found: { id: string } | null = null
  if (link.type === AggregateType.PERSON) {
    found = await prisma.person.findFirst({
      where: { name: { contains: link.nameLike } },
      select: { id: true },
    })
  } else if (link.type === AggregateType.HISTORICAL_COUNTRY) {
    // 정확 일치 우선 — contains만 쓰면 '조선'이 '조선민주주의인민공화국'을 물어 온다.
    // (조선 왕조 행이 생기기 전에는 오연결이 유일한 후보라 드러나지 않던 잠복 결함)
    found =
      (await prisma.historicalCountry.findFirst({
        where: { name: link.nameLike },
        select: { id: true },
      })) ??
      (await prisma.historicalCountry.findFirst({
        where: { name: { contains: link.nameLike } },
        orderBy: { name: 'asc' },
        select: { id: true },
      }))
  }
  return found ? { linkedType: link.type, linkedId: found.id } : {}
}

export async function seedArtifacts(prisma: PrismaService): Promise<void> {
  let sortOrder = 0
  for (const seed of ARTIFACTS) {
    const link = await resolveLink(prisma, seed.link)
    const data = {
      name: seed.name,
      era: seed.era,
      contentCentury: seed.contentCentury,
      rarity: seed.rarity,
      pricePapy: seed.pricePapy,
      setKey: seed.setKey,
      description: seed.description,
      isActive: true,
      sortOrder: (sortOrder += 10),
      ...link,
    } satisfies Prisma.ArtifactUncheckedCreateInput

    const existing = await prisma.artifact.findFirst({ where: { name: seed.name }, select: { id: true } })
    if (existing) {
      await prisma.artifact.update({ where: { id: existing.id }, data })
    } else {
      await prisma.artifact.create({ data })
    }
    const linked = 'linkedId' in link ? ` → ${link.linkedType}` : ' (링크 없음)'
    console.log(`  ✓ ${seed.name} [${seed.rarity}] ${seed.pricePapy}파피${linked}`)
  }
  console.log(`한국 유물 ${ARTIFACTS.length}종 시드 완료`)
}
