import { PrismaService } from '../prisma.service'

// influence 점수 기준 (0-100)
//  95~100 : 세계사 전환급 (표트르·예카테리나·빅토리아 여왕)
//  80~ 94 : 대국을 변혁한 거인 (빌헬름 2세·알렉산드르 1·2세·비토리오 에마누엘레 2세)
//  65~ 79 : 역사적 족적이 뚜렷한 군주
//  50~ 64 : 중간급 군주·통치자·주요 배우자
//  35~ 49 : 정치적 존재감은 있으나 제한적
//  20~ 34 : 보조적, 짧거나 무력했던 치세·주요 왕비
//   0~ 19 : 미미하거나 이름만 남은 인물 (주로 배우자·유아기 퇴위 등)

const INFLUENCE_BY_ID: Record<string, number> = {
  // ── 로마노프 (러시아 차르·황제) ───────────────────────────────────
  '43643b66-a52f-4e20-ba35-a064655ac970': 97, // Peter I (대제)
  'ddf8acab-4908-459f-8cb1-e8c49190b38c': 30, // Catherine I
  '2007843e-bf2b-4aed-91d5-3bbe6ceb3e37': 40, // Anna
  'a62d1b08-a005-4744-802f-d6c50a97118e': 15, // Peter II
  '956497de-f202-4437-9fef-9cb438451d9e': 62, // Elizabeth
  'ab39d80e-9093-47d3-9a34-a8c2c4666c09': 25, // Peter III
  '9c64e2da-1524-4212-9f41-21fcc229dda1': 95, // Catherine II (대제)
  '416243ed-e9f7-4410-8b42-f69560880b2b':  5, // Ivan VI
  '650ac469-fb42-46e4-8f0b-6e77504d4c85': 35, // Paul I
  'e4cb7895-da57-4231-b1aa-05698a89722b': 85, // Alexander I
  'c255065f-049a-41cf-bd4c-ca2ed56e1b65': 75, // Nicholas I
  '58304579-ebc9-462d-abd9-0ef731237120': 85, // Alexander II
  'a7b57997-7e04-4ad2-b76d-19f33a3fde57': 60, // Alexander III
  '28f1336a-606d-4354-8f1f-2cd4a759dcee': 80, // Nicholas II

  // ── 로마노프 황후 ────────────────────────────────────────────────
  'fe8ce57b-c942-44eb-a9e7-48b9906a39fa': 30, // Maria Fyodorovna (Paul I)
  'f25d9726-ebbf-44f9-b65e-bfa979239de1': 20, // Elizaveta Alexeievna
  '5f481d60-4f0d-4b79-be1f-b631a8a4e461': 25, // Alexandra Fyodorovna (Nicholas I)
  'd2b72bb6-8d01-4094-ba4c-80a563dbe205': 25, // Maria Alexandrovna
  'ed2671f8-c102-408a-b164-da58c4b207b6': 25, // Ekaterina Dolgorukova
  '2f94203e-58e3-4319-8382-8c8511fb929e': 40, // Maria Fyodorovna (Alexander III)
  'e294dfb7-98cb-4480-8fed-89b1e9d4c77a': 70, // Alexandra Fyodorovna (Nicholas II) — 라스푸틴

  // ── 프로이센·독일 (호엔촐레른) ──────────────────────────────────
  '370c6884-95fc-4fca-b674-1d54e4ca7fc3': 45, // Friedrich Wilhelm II of Prussia
  'b9ef5af2-9b43-4f7b-9a6d-525904a17af7': 55, // Friedrich Wilhelm III
  'f5ee4e0d-24b0-47ed-8a1f-5bfbee77425d': 45, // Friedrich Wilhelm IV
  '7cc5eb24-62e3-4f20-8ff3-72614a65f447': 88, // Wilhelm I (초대 독일 황제)
  '83dfbebe-fa26-4561-a0fc-1873b20817a2': 35, // 호엔촐레른 프리드리히 (dup of Friedrich III)
  '1e9020a4-4f4f-417a-81f6-da21952d1a70': 35, // Friedrich III (99일 황제)
  '7ba08fc8-1756-4f5b-83e4-e9d8a6542190': 90, // 호엔촐레른 빌헬름 (dup of Wilhelm II)
  'eebb9ae0-e238-4189-94f9-a48ae1bc2fc3': 90, // Wilhelm II (제1차 세계대전)

  // ── 호엔촐레른 왕비·황후 ──────────────────────────────────────────
  'd8f07cae-9c20-4bb0-9c33-5a4f722e159f': 15, // 헤센다름슈타트 프리데리케 루이제 (dup)
  '6e60a960-4d18-4bde-adbc-29fc292a725e': 15, // Friederike Luise of Hesse-Darmstadt
  '0734b084-a8f6-4940-9e8b-1a45e58b457c': 50, // Luise of Mecklenburg-Strelitz (프로이센 국민 상징)
  'f0aff924-e698-4c85-82ce-27211dbb9c1e': 20, // Elisabeth Ludovika of Bavaria
  '1a99d31e-9456-4cff-b5fc-999d7404bbc6': 30, // Augusta of Saxe-Weimar-Eisenach
  '0a0503a8-d40d-4bff-88e7-f6fb04de3baa': 40, // 작센코부르크고타 빅토리아 (dup of Victoria, Princess Royal)
  '3c7079ae-c544-4ec9-9d36-bc8b259ae5e4': 40, // Victoria, Princess Royal (빅토리아 여왕의 장녀)
  'b18b75f6-7e3f-40ba-b5af-121e2f6a2f2b': 25, // Augusta Victoria of Schleswig-Holstein
  '58727be8-be3b-4c7b-aee2-f1c3398b4c8d': 15, // Hermine of Reuss

  // ── 영국 하노버·작센코부르크 ──────────────────────────────────────
  'f77aa1b7-0f19-44a1-af42-5c070c59a819': 15, // Edward, Duke of Kent
  'f1658e3c-6b07-489b-b7c3-1dfbbd7ca877': 20, // Victoria of Saxe-Coburg-Saalfeld
  '44c75c7d-2eb0-40d8-9c88-3ec37e3f1f71': 95, // Queen Victoria
  '34d83d8d-9769-42df-a012-493e01d58729': 72, // Prince Albert (왕자 배우자, 실세)
  '4ca3a5da-302c-4b1f-966e-2ae40ebe4563': 55, // Edward VII
  '9a1ab274-796b-433c-b5de-93d81510fa94': 20, // Ernest I, Duke of Saxe-Coburg and Gotha
  'b667b7f0-348e-4d23-914a-279d3b92d7c8': 15, // Louise of Saxe-Gotha-Altenburg
  '3f3b3113-f16b-4d4e-9aef-1e6eb40e3289': 18, // 작센코부르크고타 앨프리드 어니스트 앨버트
  '0b9f4b31-1c1c-407a-ae26-10bd73efa711': 18, // 작센코부르크고타 앨리스 모드 메리

  // ── 세르비아 (오브레노비치·카라조르제비치) ─────────────────────
  '2dac9c3c-b64d-419c-9afb-48863c6b0038': 72, // Miloš I Obrenović (세르비아 공국 건국자)
  'bfb152a9-ca5c-48ae-8628-dcc9829f8efd': 45, // Aleksandar Karađorđević
  '2ea1dd40-3b01-45d7-aa5d-9bd626ac519c': 10, // Milan II Obrenović (20세 요절)
  'a6692d16-b060-47d1-95d1-0aa231b71e40': 55, // Mihailo III Obrenović
  '4806f19c-cafd-4c95-94c2-b5ff1226bacf': 60, // Milan I of Serbia (초대 왕)
  'c5042790-88c0-4532-968d-e0a962412096': 40, // Aleksandar Obrenović (1903 암살)
  '9d50dfbe-9bb3-4a63-be7e-4291424f2778': 75, // Petar I Karađorđević (발칸전쟁·WWI)

  // ── 세르비아 왕비 ────────────────────────────────────────────────
  'a0e7566d-8d89-45b5-a85c-05b66fb149f4': 30, // Ljubica Obrenović
  '7374e276-3eb5-49da-9ac6-37946b7126ac': 15, // Persida Nenadović
  'ae343909-445a-4cf2-8d7c-195ccc784629': 35, // Natalija Obrenović
  '47505788-e7b2-420f-a6d5-0e9efd0bc868': 35, // Draga Obrenović (1903 쿠데타의 방아쇠)
  'ff9cd065-2220-4a77-b723-289d9b877585': 15, // Zorka of Montenegro
  '266308c5-4c93-4f75-a29d-72183f8057a7': 12, // Júlia Hunyady

  // ── 사보이아 (사르데냐·이탈리아) ─────────────────────────────────
  'eb67bd47-0c27-41a7-8bac-934a5ee045d4': 60, // Vittorio Amedeo II (사르데냐 왕국 창설)
  '101ecb64-e2c3-43e4-ac43-dc725a2cfb00': 42, // Carlo Emanuele III
  'bac07ba5-7f9b-464e-9b30-55a5c8197068': 30, // Vittorio Amedeo III
  '0c6b9f6a-ba61-4182-901a-c8eeae7dbabb': 20, // Carlo Emanuele IV
  '508304f7-e75b-404c-898a-6a651506439c': 30, // Vittorio Emanuele I
  'aa77d8c6-25ce-4054-89c6-7e05ee9a89b5': 25, // Carlo Felice
  '937d6237-9ae1-4406-b68d-8bc5e417e47b': 60, // Carlo Alberto (1848 헌법)
  '678ad936-fb3e-4200-bfd1-d2313d88a396': 85, // Vittorio Emanuele II (초대 이탈리아 국왕)
  '0eb6683a-43dd-4fee-8fd6-33aed8b8ac3e': 50, // Umberto I (암살)
  'a2d1c76c-0cd2-4096-98f2-efdcdfee6522': 78, // Vittorio Emanuele III (파시즘·두 차례 대전)
  '1448b2ff-f722-46f1-a8d4-29a972d64bd2': 25, // Umberto II (1946년 한 달의 왕)

  // ── 사보이아 왕비 ────────────────────────────────────────────────
  '98fa0fe3-527f-4419-b93e-16b039b080f4': 10, // Anne Marie d'Orléans
  'e8e756a6-08fd-433e-8b30-a1aa185236f7':  5, // Anna Cristina of Sulzbach
  '8e5d16e7-d13f-4590-b996-c53c8b11ae5a':  5, // Polissena of Hesse-Rheinfels-Rotenburg
  '39da275c-6208-4002-8fe9-e96101ba07b1':  5, // Elisabeth Therese of Lorraine
  '6232b99c-b535-4b05-836d-2a9038c5cca4': 10, // Maria Antonietta of Bourbon-Spain
  '45689a46-7143-4ccf-8aa3-a242f2b3cb53': 15, // Marie Clotilde of France
  'acd77d77-49aa-4b19-93dc-16f22f0d4b15': 10, // Maria Teresa of Austria-Este
  'da796fe1-7a4c-4dea-9c9b-522ba84da3b1': 10, // Maria Cristina of the Two Sicilies
  '17913a69-02cf-4f8b-9107-431d4c8c221d': 10, // Maria Teresa of Austria-Tuscany
  '8a4be827-9c22-4b7b-928f-c764ce6a89f3': 10, // Maria Adelaide of Austria
  'd79a00f1-b940-4eed-8c64-9017428c094b': 30, // Margherita of Savoy
  '5566c4d1-3bf6-4f7d-8376-04da4f4e1cdd': 25, // Elena of Montenegro
  'd6a17d8d-d1ef-4310-9997-44d15d734b8f': 20, // Marie José of Belgium

  // ── 헤센-다름슈타트 방백·대공 (러시아·영국 왕실의 인척) ───────
  '0470c914-aeda-4889-b086-e49c0e3449d1': 15, // 헤센 다름슈타트 루트비히 (Ludwig IX, 1719~1790)
  '61ab3e41-6e7b-46c7-8287-8ab35d5c9cae': 30, // Ludwig I of Hesse (1753~1830)
  '3b9de76f-6781-4615-8732-7c61cd6e640a': 15, // Ludwig II of Hesse (1777~1848)
  '48315549-3c50-4e8a-b479-718bfe01db68': 15, // Ludwig III of Hesse (1806~1877)
  '3a8cd731-9f8c-4280-93f3-5ad7430980da': 20, // Ludwig IV of Hesse (1837~1892, 러시아 황후 알릭스의 부친)
}

async function main() {
  const prisma = new PrismaService({ useAdapter: true })

  const existing = await prisma.person.findMany({
    select: { id: true, name: true, surname: true, originalName: true, influence: true },
  })
  const idToPerson = new Map(existing.map((p) => [p.id, p]))

  let updated = 0
  let skipped = 0
  let missing = 0

  for (const [id, influence] of Object.entries(INFLUENCE_BY_ID)) {
    const p = idToPerson.get(id)
    if (!p) {
      console.warn(`  ⚠️  존재하지 않는 ID: ${id}`)
      missing++
      continue
    }
    if (p.influence === influence) {
      skipped++
      continue
    }
    await prisma.person.update({
      where: { id },
      data: { influence },
    })
    const label = p.originalName ?? [p.surname, p.name].filter(Boolean).join(' ')
    console.log(`  ✅ ${label.padEnd(50)} → ${influence}`)
    updated++
  }

  const notInMap = existing.filter((p) => !(p.id in INFLUENCE_BY_ID))
  if (notInMap.length > 0) {
    console.log('\n  📝 매핑되지 않은 인물 (그대로 유지):')
    for (const p of notInMap) {
      const label = p.originalName ?? [p.surname, p.name].filter(Boolean).join(' ')
      console.log(`     - ${label} (${p.id}) [influence=${p.influence ?? 'null'}]`)
    }
  }

  console.log(
    `\n✅ 영향력 업데이트 완료: ${updated}건 변경, ${skipped}건 유지, ${missing}건 누락`,
  )
  await prisma.$disconnect()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
