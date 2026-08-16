import { GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/** 관직 정의 단일 레벨 — 직함 + positionType(enum) 분류 */
const DEFINITIONS: {
  positionType: GovernmentPositionType
  title: string
  titleEn: string | null
  titleLocal?: string | null
  rank?: number
  /** 군주·주권 칭호(재위로 등록) 여부. true면 "관직 재임" 피커에서 제외. */
  isMonarchical?: boolean
}[] = [
  // ─ 국가원수 (HEAD_OF_STATE) — 군주·대통령·최고지도자
  // rank 1: 최고 주권자 (황제·국왕·교황 등)
  // ⚠ 칭호 통합 규칙: 국가 스코프(재위의 historicalCountryId)로 구분되는 일반 칭호는 하나로
  //   통합한다 — '신성로마황제'는 '황제'+신성로마제국으로 통합(2026-07-16, consolidate-hre-
  //   emperor-definition.ts). 국가별 bespoke 칭호(러시아차르·오스트리아황제 등) 신설 금지.
  //   별도 정의는 한국어 어휘 자체가 다른 고정 칭호(천황·교황·칸·술탄 등)에만 허용.
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국왕', titleEn: 'King', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '여왕', titleEn: 'Queen', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '황제', titleEn: 'Emperor', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '천황', titleEn: 'Emperor', titleLocal: '天皇', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '교황', titleEn: 'Pope', titleLocal: 'Papa', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '칸', titleEn: 'Khagan', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '술탄', titleEn: 'Sultan', rank: 1, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '대통령', titleEn: 'President', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '국가주석', titleEn: 'President', titleLocal: '国家主席', rank: 1 },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '최고지도자(라흐바르)', titleEn: 'Supreme Leader (Rahbar)', titleLocal: 'رهبر', rank: 1 },
  // rank 2: 선출·의전 국가원수 / 제국 내 왕급 (신성로마제국 겸직)
  // '대통령(연방)' 제거 — 일반 '대통령'(rank 1)으로 통합 (positionType 동일, 표시명만 달랐음)
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '선제후', titleEn: 'Prince-Elector', titleLocal: 'Kurfürst', rank: 2, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '로마왕', titleEn: 'King of the Romans', titleLocal: 'Rex Romanorum', rank: 2, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '이탈리아왕', titleEn: 'King of Italy', titleLocal: 'Rex Italiae', rank: 2, isMonarchical: true },
  // rank 3: 하위 제후국 군주 (변경백·방백)
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '변경백', titleEn: 'Margrave', titleLocal: 'Markgraf', rank: 3, isMonarchical: true },
  { positionType: GovernmentPositionType.HEAD_OF_STATE, title: '방백', titleEn: 'Landgrave', titleLocal: 'Landgraf', rank: 3, isMonarchical: true },
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
  // ─ 각료/장관 (CABINET_MINISTER) — 행정부 각료. rank는 각의 내 통상 서열(외무·재무·내무·국방 우선).
  //   ⚠ 2026-08-11 정책 변경: 과거 이 자리에는 "더 구체적인 직함(외국봉행·6조 판서 등)은
  //   '기타 (직접 입력)'으로 커버"라고 적혀 있었다. 그 정책이 곧 "있어야 할 직책이 목록에 없다"는
  //   사용자 리포트의 근인이었다(실측: 정의 없이 자유입력으로만 존재하던 재임 21행).
  //   이제는 **특정 정체 고유 직책도 정의로 등록하고, 적용 범위(GovernmentPositionDefinitionScope)로
  //   그 나라에서만 보이게** 한다 — governmentPositionDefinitionScope.seed.ts 참고.
  //   보편 칭호(총리·대통령·장관 등)에는 스코프를 붙이지 않아 전역으로 남는다.
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '외무장관', titleEn: 'Foreign Minister', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '재무장관', titleEn: 'Finance Minister', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '내무장관', titleEn: 'Interior Minister', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '국방장관', titleEn: 'Defense Minister', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '법무장관', titleEn: 'Justice Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '교육장관', titleEn: 'Education Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '전쟁장관', titleEn: 'Secretary of State for War', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '해군장관', titleEn: 'Navy Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '장관', titleEn: 'Minister', rank: 3 },
  // ─ 미국 행정부 15부 장관 — 외무·재무·내무·국방·법무·교육은 위 보편 칭호를 그대로 쓴다.
  //   여기 추가하는 10종 중 '국무장관'·'주택도시개발장관'·'국토안보장관'은 미국 고유 명칭이라
  //   governmentPositionDefinitionScope.seed.ts에서 미국으로 스코프한다. 나머지 7종(농무·상무·
  //   노동·보건복지·교통·에너지·보훈)은 다른 나라에도 있는 보편 부처라 스코프를 붙이지 않는다.
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '국무장관', titleEn: 'Secretary of State', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '농무장관', titleEn: 'Agriculture Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '상무장관', titleEn: 'Commerce Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '노동장관', titleEn: 'Labor Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '보건복지장관', titleEn: 'Health and Human Services Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '주택도시개발장관', titleEn: 'Housing and Urban Development Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '교통장관', titleEn: 'Transportation Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '에너지장관', titleEn: 'Energy Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '보훈장관', titleEn: 'Veterans Affairs Minister', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '국토안보장관', titleEn: 'Homeland Security Minister', rank: 2 },
  // ─ 차관 (VICE_MINISTER) — 정무직 고위 공무원
  { positionType: GovernmentPositionType.VICE_MINISTER, title: '차관', titleEn: 'Vice Minister', rank: 1 },
  // ─ 외교직 (DIPLOMATIC_POST) — 각료도 수반도 아니라 카탈로그에 자리가 없던 축.
  //   주재지는 정의가 아니라 재임 행의 표시명 오버라이드로 적는다(예: 정의 '영사' + 표시명 '광저우 영국 영사').
  //   따라서 여기엔 국가 무관 보편 계급만 두고 스코프를 붙이지 않는다.
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '대사', titleEn: 'Ambassador', rank: 1 },
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '특명전권공사', titleEn: 'Envoy Extraordinary and Minister Plenipotentiary', rank: 2 },
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '대리공사', titleEn: "Chargé d'affaires", rank: 3 },
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '총영사', titleEn: 'Consul General', rank: 4 },
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '영사', titleEn: 'Consul', rank: 5 },
  { positionType: GovernmentPositionType.DIPLOMATIC_POST, title: '부영사', titleEn: 'Vice Consul', rank: 6 },
  // ─ 도쿠가와 막부 전속 직책 — 적용 범위 시드가 '도쿠가와 막부'로 스코프를 붙인다.
  //   ⚠ 로주를 HEAD_OF_GOVERNMENT로 두지 말 것 — 쇼군이 이미 그 자리라 역대 수반·타임라인에서
  //     같은 시기 수반이 둘로 겹친다. 막부 각로는 각료(CABINET_MINISTER)로 본다.
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '로주', titleEn: 'Rōjū (Senior Councillor)', titleLocal: '老中', rank: 1 },
  { positionType: GovernmentPositionType.VICE_MINISTER, title: '와카도시요리', titleEn: 'Wakadoshiyori (Junior Councillor)', titleLocal: '若年寄', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '외국봉행', titleEn: 'Commissioner of Foreign Affairs', titleLocal: '外国奉行', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '감정봉행', titleEn: 'Commissioner of Finance', titleLocal: '勘定奉行', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '군함봉행', titleEn: 'Commissioner of Warships', titleLocal: '軍艦奉行', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '보병봉행', titleEn: 'Commissioner of Infantry', titleLocal: '歩兵奉行', rank: 2 },
  // ─ 조선 전속 직책 — 적용 범위 시드가 역사국가 '조선' + 현대 '대한민국'으로 스코프를 붙인다.
  //   영의정은 위 HEAD_OF_GOVERNMENT 블록에 이미 있다(삼정승의 수반).
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '좌의정', titleEn: 'Second State Councillor', titleLocal: '左議政', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '우의정', titleEn: 'Third State Councillor', titleLocal: '右議政', rank: 1 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '이조판서', titleEn: 'Minister of Personnel', titleLocal: '吏曹判書', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '호조판서', titleEn: 'Minister of Taxation', titleLocal: '戶曹判書', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '예조판서', titleEn: 'Minister of Rites', titleLocal: '禮曹判書', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '병조판서', titleEn: 'Minister of War', titleLocal: '兵曹判書', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '형조판서', titleEn: 'Minister of Punishments', titleLocal: '刑曹判書', rank: 2 },
  { positionType: GovernmentPositionType.CABINET_MINISTER, title: '공조판서', titleEn: 'Minister of Works', titleLocal: '工曹判書', rank: 2 },
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
          isMonarchical: row.isMonarchical ?? undefined,
        },
      })
      console.log(`  ✅ ${row.title} (${row.positionType})`)
    }
  }

  console.log(`✅ 관직 정의 시딩 완료 (${DEFINITIONS.length}건)\n`)
}
