import { GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/** 이전 1차 카테고리 id — 시드 시 삭제하여 단일 레벨만 유지 */
const LEGACY_ROOT_IDS = [
  'gov-cat-head-of-state',
  'gov-cat-head-of-government',
  'gov-cat-heir-apparent',
  'gov-cat-regent',
  'gov-cat-other',
]

/** 관직 정의 단일 레벨 — 직함 + positionType(enum) 분류 */
const DEFINITIONS: {
  id: string
  positionType: GovernmentPositionType
  title: string
  titleEn: string | null
  titleLocal?: string | null
  rank?: number
}[] = [
  { id: 'gov-pos-king', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국왕', titleEn: 'King', rank: 1 },
  { id: 'gov-pos-queen', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '여왕', titleEn: 'Queen', rank: 1 },
  { id: 'gov-pos-emperor', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '황제', titleEn: 'Emperor', rank: 1 },
  { id: 'gov-pos-tenno', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '천황', titleEn: 'Emperor', titleLocal: '天皇', rank: 1 },
  { id: 'gov-pos-shogun', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '쇼군', titleEn: 'Shogun', titleLocal: '将軍', rank: 2 },
  { id: 'gov-pos-elector', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '선제후', titleEn: 'Prince-Elector', titleLocal: 'Kurfürst', rank: 2 },
  { id: 'gov-pos-margrave', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '변경백', titleEn: 'Margrave', titleLocal: 'Markgraf', rank: 2 },
  // 신성로마제국 등 복합 직책 (로마왕·이탈리아왕·황제를 같은 국가에서 겸직)
  { id: 'gov-pos-king-of-the-romans', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '로마왕', titleEn: 'King of the Romans', titleLocal: 'Rex Romanorum', rank: 2 },
  { id: 'gov-pos-king-of-italy', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '이탈리아왕', titleEn: 'King of Italy', titleLocal: 'Rex Italiae', rank: 2 },
  { id: 'gov-pos-hre-emperor', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '신성로마황제', titleEn: 'Holy Roman Emperor', titleLocal: 'Imperator Romanorum', rank: 1 },
  { id: 'gov-pos-president', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '대통령', titleEn: 'President', rank: 1 },
  { id: 'gov-pos-khan', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '칸', titleEn: 'Khagan', rank: 1 },
  { id: 'gov-pos-sultan', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '술탄', titleEn: 'Sultan', rank: 1 },
  { id: 'gov-pos-supreme-leader', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '최고지도자(라흐바르)', titleEn: 'Supreme Leader (Rahbar)', titleLocal: 'رهبر', rank: 1 },
  { id: 'gov-pos-chairman', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국가주석', titleEn: 'President', titleLocal: '国家主席', rank: 1 },
  { id: 'gov-pos-federal-president', positionType: GovernmentPositionType.HEAD_OF_STATE, title: '대통령(연방)', titleEn: 'Federal President', rank: 1 },
  { id: 'gov-pos-pm', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '총리', titleEn: 'Prime Minister', rank: 1 },
  { id: 'gov-pos-yeonguijeong', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '영의정', titleEn: 'Chief State Councillor', rank: 1 },
  { id: 'gov-pos-kr-pm', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '국무총리', titleEn: 'Prime Minister', rank: 2 },
  { id: 'gov-pos-naegak-pm', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '내각총리대신', titleEn: 'Prime Minister', titleLocal: '内閣総理大臣', rank: 2 },
  { id: 'gov-pos-premier', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '총리(국무원)', titleEn: 'Premier', titleLocal: '总理', rank: 2 },
  { id: 'gov-pos-chancellor', positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '연방총리', titleEn: 'Chancellor', rank: 2 },
  // 서양·동아시아 왕족/귀족 (ROYAL_NOBLE_TITLE)
  { id: 'gov-pos-duke', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공작', titleEn: 'Duke', titleLocal: '公爵', rank: 1 },
  { id: 'gov-pos-marquis', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '후작', titleEn: 'Marquis', titleLocal: '侯爵', rank: 2 },
  { id: 'gov-pos-count', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백작', titleEn: 'Count', titleLocal: '伯爵', rank: 3 },
  { id: 'gov-pos-earl', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백작(영)', titleEn: 'Earl', rank: 3 },
  { id: 'gov-pos-viscount', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '자작', titleEn: 'Viscount', titleLocal: '子爵', rank: 4 },
  { id: 'gov-pos-baron', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '남작', titleEn: 'Baron', titleLocal: '男爵', rank: 5 },
  { id: 'gov-pos-grand-duke', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '대공', titleEn: 'Grand Duke', titleLocal: '大公', rank: 1 },
  { id: 'gov-pos-archduke', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '대공(오스트리아)', titleEn: 'Archduke', rank: 1 },
  { id: 'gov-pos-prince', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공작/왕자', titleEn: 'Prince', titleLocal: '公子·親王', rank: 1 },
  { id: 'gov-pos-duchy-lord', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공국 군주', titleEn: 'Duke (sovereign)', titleLocal: '公國君', rank: 1 },
  { id: 'gov-pos-gunwang', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '군왕', titleEn: 'Commandery King', titleLocal: '郡王', rank: 2 },
  { id: 'gov-pos-gukgong', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '국공', titleEn: 'Duke of State', titleLocal: '國公', rank: 2 },
  { id: 'gov-pos-hou', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '후', titleEn: 'Marquess', titleLocal: '侯', rank: 3 },
  { id: 'gov-pos-beck', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백', titleEn: 'Count', titleLocal: '伯', rank: 4 },
  { id: 'gov-pos-ja', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '자', titleEn: 'Viscount', titleLocal: '子', rank: 5 },
  { id: 'gov-pos-nam', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '남', titleEn: 'Baron', titleLocal: '男', rank: 6 },
  { id: 'gov-pos-byeokgyeong-beck', positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '벽경백', titleEn: 'Count (Byeokgyeong)', titleLocal: '壁經伯', rank: 4 },
]

export async function seedGovernmentPositionDefinitions(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏛️ 관직 정의(GovernmentPositionDefinition) 시딩 — 단일 레벨(직함 + enum)')

  await prisma.governmentPositionDefinition.deleteMany({
    where: { id: { in: LEGACY_ROOT_IDS } },
  })
  console.log(`  🗑️ 이전 1차 카테고리 행 제거 (${LEGACY_ROOT_IDS.length}개 id)`)

  for (const row of DEFINITIONS) {
    await prisma.governmentPositionDefinition.upsert({
      where: { id: row.id },
      update: {
        positionType: row.positionType as any,
        title: row.title,
        titleEn: row.titleEn ?? undefined,
        titleLocal: row.titleLocal ?? undefined,
        rank: row.rank ?? undefined,
      },
      create: {
        id: row.id,
        positionType: row.positionType as any,
        title: row.title,
        titleEn: row.titleEn ?? undefined,
        titleLocal: row.titleLocal ?? undefined,
        rank: row.rank ?? undefined,
      },
    })
    console.log(`  ✅ ${row.title} (${row.positionType})`)
  }

  console.log(`✅ 관직 정의 시딩 완료 (${DEFINITIONS.length}건)\n`)
}
