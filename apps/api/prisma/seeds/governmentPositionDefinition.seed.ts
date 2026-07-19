import { GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/** 관직 정의 단일 레벨 — 직함 + positionType(enum) 분류 */
const DEFINITIONS: {
  positionType: GovernmentPositionType
  title: string
  titleEn: string | null
  titleLocal?: string | null
  rank?: number
}[] = [
  // ─ 국가원수 (HEAD_OF_STATE) — 군주·대통령·최고지도자
  // rank 1: 최고 주권자 (황제·국왕·교황 등)
  // ⚠ 칭호 통합 규칙: 국가 스코프(재위의 historicalCountryId)로 구분되는 일반 칭호는 하나로
  //   통합한다 — '신성로마황제'는 '황제'+신성로마제국으로 통합(2026-07-16, consolidate-hre-
  //   emperor-definition.ts). 국가별 bespoke 칭호(러시아차르·오스트리아황제 등) 신설 금지.
  //   별도 정의는 한국어 어휘 자체가 다른 고정 칭호(천황·교황·칸·술탄 등)에만 허용.
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국왕', titleEn: 'King', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '여왕', titleEn: 'Queen', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '황제', titleEn: 'Emperor', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '천황', titleEn: 'Emperor', titleLocal: '天皇', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '교황', titleEn: 'Pope', titleLocal: 'Papa', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '칸', titleEn: 'Khagan', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '술탄', titleEn: 'Sultan', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '대통령', titleEn: 'President', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국가주석', titleEn: 'President', titleLocal: '国家主席', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '최고지도자(라흐바르)', titleEn: 'Supreme Leader (Rahbar)', titleLocal: 'رهبر', rank: 1 },
  // rank 2: 선출·의전 국가원수 / 제국 내 왕급 (신성로마제국 겸직)
  // '대통령(연방)' 제거 — 일반 '대통령'(rank 1)으로 통합 (positionType 동일, 표시명만 달랐음)
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '선제후', titleEn: 'Prince-Elector', titleLocal: 'Kurfürst', rank: 2 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '로마왕', titleEn: 'King of the Romans', titleLocal: 'Rex Romanorum', rank: 2 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '이탈리아왕', titleEn: 'King of Italy', titleLocal: 'Rex Italiae', rank: 2 },
  // rank 3: 하위 제후국 군주 (변경백·방백)
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '변경백', titleEn: 'Margrave', titleLocal: 'Markgraf', rank: 3 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '방백', titleEn: 'Landgrave', titleLocal: 'Landgraf', rank: 3 },
  // ─ 행정부 수반 (HEAD_OF_GOVERNMENT) — 총리·재상·쇼군 등
  // rank 1: 실권 행정 수반 (쇼군·총리·재상 등 동급)
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '쇼군', titleEn: 'Shogun', titleLocal: '将軍', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '총리', titleEn: 'Prime Minister', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '영의정', titleEn: 'Chief State Councillor', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '국무총리', titleEn: 'Prime Minister', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '내각총리대신', titleEn: 'Prime Minister', titleLocal: '内閣総理大臣', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '총리(국무원)', titleEn: 'Premier', titleLocal: '总理', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT, title: '연방총리', titleEn: 'Chancellor', rank: 1 },
  // 서양·동아시아 왕족/귀족 (ROYAL_NOBLE_TITLE)
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공작', titleEn: 'Duke', titleLocal: '公爵', rank: 1 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '후작', titleEn: 'Marquis', titleLocal: '侯爵', rank: 2 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백작', titleEn: 'Count', titleLocal: '伯爵', rank: 3 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백작(영)', titleEn: 'Earl', rank: 3 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '자작', titleEn: 'Viscount', titleLocal: '子爵', rank: 4 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '남작', titleEn: 'Baron', titleLocal: '男爵', rank: 5 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '대공', titleEn: 'Grand Duke', titleLocal: '大公', rank: 1 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '대공(오스트리아)', titleEn: 'Archduke', rank: 1 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공작/왕자', titleEn: 'Prince', titleLocal: '公子·親王', rank: 1 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '공국 군주', titleEn: 'Duke (sovereign)', titleLocal: '公國君', rank: 1 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '군왕', titleEn: 'Commandery King', titleLocal: '郡王', rank: 2 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '국공', titleEn: 'Duke of State', titleLocal: '國公', rank: 2 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '후', titleEn: 'Marquess', titleLocal: '侯', rank: 3 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '백', titleEn: 'Count', titleLocal: '伯', rank: 4 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '자', titleEn: 'Viscount', titleLocal: '子', rank: 5 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '남', titleEn: 'Baron', titleLocal: '男', rank: 6 },
  { positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE, title: '벽경백', titleEn: 'Count (Byeokgyeong)', titleLocal: '壁經伯', rank: 4 },
]

export async function seedGovernmentPositionDefinitions(
  prisma: PrismaService,
): Promise<void> {
  console.log(
    '\n🏛️ 관직 정의(GovernmentPositionDefinition) 시딩 — 단일 레벨(직함 + enum)',
  )

  for (const row of DEFINITIONS) {
    // 자연키(title + positionType)로 조회 — id는 @default(uuid())로 자동 할당
    const existing = await prisma.governmentPositionDefinition.findFirst({
      where: {
        title: row.title,
        positionType: row.positionType as any,
      },
    })

    if (existing) {
      console.log(`  ⏭️  ${row.title} (${row.positionType})`)
    } else {
      await prisma.governmentPositionDefinition.create({
        data: {
          positionType: row.positionType as any,
          title: row.title,
          titleEn: row.titleEn ?? undefined,
          titleLocal: row.titleLocal ?? undefined,
          rank: row.rank ?? undefined,
        },
      })
      console.log(`  ✅ ${row.title} (${row.positionType})`)
    }
  }

  console.log(`✅ 관직 정의 시딩 완료 (${DEFINITIONS.length}건)\n`)
}
