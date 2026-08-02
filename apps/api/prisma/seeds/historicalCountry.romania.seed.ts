import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  startMonth?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  // ── 고대 ─────────────────────────────────────────────────────────
  {
    name: '다키아 왕국',
    enName: 'Kingdom of Dacia',
    nameOrigin:
      '카르파티아 일대에 살던 트라키아계 다키아인의 이름에서 왔으며, 그리스 사료의 게타이인과 같은 계통으로 본다.',
    description:
      '기원전 82년경 부레비스타가 다키아·게타이 부족들을 통합해 카르파티아와 다뉴브 하류 일대에 세운 왕국. ' +
      '수도는 오러슈티에 산맥의 사르미제게투사 레기아였다. 부레비스타 사후 분열과 재통합을 거쳐 ' +
      '데케발루스(재위 87~106)가 로마와 두 차례 전쟁을 치렀으나, 106년 트라야누스에게 정복되어 ' +
      '로마 속주 다키아가 되었다. 로마화된 다키아는 루마니아인의 민족적 기원 서사의 뿌리가 되었다.',
    startEra: 'BC', startYear: 82,
    endEra: 'AD', endYear: 106,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 45.62, longitude: 23.31,
    linkToIsoCodes: ['RO'],
  },

  // ── 중세 양대 공국 ────────────────────────────────────────────────
  {
    name: '왈라키아 공국',
    enName: 'Principality of Wallachia',
    nameOrigin:
      '게르만·슬라브계가 로망스어 화자를 부르던 "블라흐(Vlach)"에서 온 이름으로, ' +
      '루마니아어로는 스스로를 "루마니아인의 나라(Țara Românească)"라 불렀다.',
    description:
      '1330년 바사라브 1세가 포사다 전투에서 헝가리 국왕 카로이 1세를 격파하고 자립한 다뉴브 이북의 공국. ' +
      '수도는 큼풀룽에서 쿠르테아 데 아르제슈·터르고비슈테를 거쳐 부쿠레슈티로 옮겨갔다. ' +
      '15세기부터 오스만의 조공 속국이 되었으나 자체 군주(보이보드)와 제도를 유지했고, ' +
      '블라드 3세(드라큘라)·미하이 용맹공 등이 오스만에 맞섰다. ' +
      '1859년 몰다비아와 함께 알렉산드루 이오안 쿠자를 공으로 선출하며 루마니아 연합공국으로 이어졌다.',
    startEra: 'AD', startYear: 1330,
    endEra: 'AD', endYear: 1859,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },
  {
    name: '몰다비아 공국',
    enName: 'Principality of Moldavia',
    nameOrigin:
      '건국 전승에서 드라고슈가 사냥 중 건넜다는 몰도바강에서 온 이름이다.',
    description:
      '1346년 헝가리의 봉신 변경백령으로 출발해 1359년 보그단 1세가 종주권을 떨치고 자립한 카르파티아 동쪽의 공국. ' +
      '수도는 수체아바였다가 1564년 이아시로 옮겼다. 슈테판 대공(1457~1504) 치세에 오스만·헝가리·폴란드에 맞서 ' +
      '전성기를 누렸으나 16세기부터 오스만의 조공 속국이 되었다. ' +
      '1775년 부코비나를 오스트리아에, 1812년 부쿠레슈티 조약으로 동부 절반인 베사라비아(오늘날 몰도바)를 ' +
      '러시아에 할양해 영토가 줄었고, 1859년 왈라키아와 함께 쿠자를 공으로 선출하며 연합공국으로 이어졌다.',
    startEra: 'AD', startYear: 1359,
    endEra: 'AD', endYear: 1859,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.16, longitude: 27.59,
    // 베사라비아(1359~1812 약 450년 정주핵 동부 절반)=현 몰도바,
    // 북부코비나(체르너우치 ~1775)·호틴(~1812)=현 우크라이나 — 창건기 원년 강역의 정주 행정구역(규범 A)
    linkToIsoCodes: ['RO', 'MD', 'UA'],
  },
  {
    name: '트란실바니아 공국',
    enName: 'Principality of Transylvania',
    nameOrigin:
      '라틴어로 "숲 너머의 땅(trans silvam)"이라는 뜻이며, 헝가리어로는 에르데이, 루마니아어로는 아르데알이라 부른다.',
    description:
      '1570년 슈파이어 조약으로 동헝가리 왕국이 재편되어 성립한 오스만 종주권 하의 공국. ' +
      '수도는 줄러페헤르바르(알바이울리아)였고, 바토리·베틀렌·라코치 가문의 공들이 다스리며 ' +
      '종교 관용(1568 토르다 칙령의 유산)과 30년 전쟁 개입으로 이름을 남겼다. ' +
      '1699년 카를로비츠 조약으로 합스부르크에 귀속되어 1711년부터 직할 통치(1765년 대공국 승격)를 받았고, ' +
      '1867년 대타협으로 헝가리 왕국에 재통합되며 소멸했다. 루마니아인이 인구 다수였으나 정치 참여에서 배제되어 ' +
      '근대 루마니아 민족운동의 진원지가 되었다.',
    startEra: 'AD', startYear: 1570,
    endEra: 'AD', endYear: 1867,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 46.07, longitude: 23.57,
    linkToIsoCodes: ['RO'],
  },

  // ── 근대 통일과 왕국 ──────────────────────────────────────────────
  {
    name: '몰다비아 왈라키아 연합공국',
    enName: 'United Principalities of Moldavia and Wallachia',
    description:
      '1859년 1월 몰다비아와 왈라키아가 알렉산드루 이오안 쿠자를 공(公)으로 동시에 선출하며 성립한 동군연합. ' +
      '1862년 단일 정부·의회로 통합해 국호를 루마니아로 정했고, ' +
      '쿠자는 토지 개혁과 교육 개혁, 수도원 재산 세속화를 밀어붙였다. ' +
      '1866년 2월 쿠데타로 쿠자가 퇴위하면서 호엔촐레른 가문의 카롤을 맞아들인 루마니아 공국으로 이어졌다.',
    startEra: 'AD', startYear: 1859, startMonth: 1,
    endEra: 'AD', endYear: 1866, endMonth: 5,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },
  {
    name: '루마니아 공국',
    enName: 'Principality of Romania',
    description:
      '1866년 2월 쿠자 퇴위 후 국민투표로 호엔촐레른 가문의 카롤 1세를 공으로 맞아들이며 재편된 공국' +
      '(5월 10일 즉위). 1866년 7월 신헌법이 국호를 루마니아로 확정했다. ' +
      '1877년 5월 오스만에 독립을 선언하고 러시아-튀르크 전쟁에 참전해 플레브나 공방전에서 활약했으며, ' +
      '1878년 베를린 조약으로 독립을 승인받고 북부 도브루자를 얻는 대신 남부 베사라비아를 러시아에 내주었다. ' +
      '1881년 3월 왕국 선포로 이어졌다.',
    startEra: 'AD', startYear: 1866, startMonth: 5,
    endEra: 'AD', endYear: 1881, endMonth: 3,
    stateType: HistoricalStateType.PRINCIPALITY,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },
  {
    name: '루마니아 왕국',
    enName: 'Kingdom of Romania',
    description:
      '1881년 3월 카롤 1세가 왕을 칭하며 성립한 왕국. 1차 세계대전에서 연합국 측에 서서 ' +
      '1918년 12월 알바이울리아 대국민집회의 결의로 트란실바니아·베사라비아·부코비나를 아우르는 ' +
      '대루마니아를 이루었다(1920 트리아농 조약 확정). ' +
      '1940년 소련의 최후통첩으로 베사라비아·북부코비나를 상실하고 추축국에 가담했다가 1944년 8월 연합국으로 전향했으며, ' +
      '1947년 12월 30일 미하이 1세가 공산 정권의 강요로 퇴위하며 소멸했다.',
    startEra: 'AD', startYear: 1881, startMonth: 3,
    endEra: 'AD', endYear: 1947, endMonth: 12,
    stateType: HistoricalStateType.KINGDOM,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },

  // ── 현대 ─────────────────────────────────────────────────────────
  {
    name: '루마니아 사회주의 공화국',
    enName: 'Socialist Republic of Romania',
    description:
      '1947년 12월 군주제 폐지와 함께 선포된 공산주의 국가(초명은 인민공화국, 1965년 사회주의 공화국으로 개칭). ' +
      '게오르기우-데지에 이어 1965년부터 차우셰스쿠가 독자 외교 노선과 개인숭배 체제로 통치했다. ' +
      '1980년대 외채 상환 긴축으로 민생이 피폐해졌고, 1989년 12월 티미쇼아라에서 시작된 혁명으로 ' +
      '차우셰스쿠 부부가 처형되며 동구권에서 유일하게 유혈로 붕괴했다.',
    startEra: 'AD', startYear: 1947, startMonth: 12,
    endEra: 'AD', endYear: 1989, endMonth: 12,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },
  {
    // 행명은 현대 country 행 '루마니아'와의 검색 중의성을 피해 '루마니아 공화국'
    // (공식 국호는 수식어 없는 '루마니아' — 탈공산 현대행 5행의 'X 공화국' 관례 준용)
    name: '루마니아 공화국',
    enName: 'Republic of Romania',
    description:
      '1989년 12월 혁명으로 공산 정권이 붕괴한 뒤 민주주의·시장경제로 전환한 현대 루마니아' +
      '(공식 국호는 수식어 없는 "루마니아"이며 헌법 제1조가 공화국임을 명시한다). 1991년 신헌법을 채택했으며, ' +
      '2004년 나토(NATO), 2007년 유럽연합(EU)에 가입했다.',
    startEra: 'AD', startYear: 1989, startMonth: 12,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 44.43, longitude: 26.1,
    linkToIsoCodes: ['RO'],
  },

  // ── 몰도바 ───────────────────────────────────────────────────────
  // 몰도바 공화국은 몰다비아 공국(이 파일)의 후신 체인이라 이 파일에서 관리한다
  // (몰다비아 소비에트 사회주의 공화국 행은 러시아 계열 시드 소유).
  {
    name: '몰도바 공화국',
    enName: 'Republic of Moldova',
    description:
      '1991년 8월 27일 소련에서 독립을 선언한 몰다비아 소비에트 사회주의 공화국의 후신. ' +
      '주민 다수가 루마니아어(몰도바어) 화자로 옛 몰다비아 공국의 동부 절반(베사라비아)에 해당한다. ' +
      '독립 직후 트란스니스트리아 분쟁(1992)을 겪어 드네스트르강 동안이 사실상 분리 상태이며, ' +
      '2022년부터 유럽연합(EU) 가입 후보국이다.',
    startEra: 'AD', startYear: 1991, startMonth: 8,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.01, longitude: 28.86,
    linkToIsoCodes: ['MD'],
  },
]

export async function seedRomaniaHistoricalCountries(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇷🇴 루마니아 관련 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({
      where: { isoCode },
      select: { id: true },
    })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
    })

    let id: string

    if (existing) {
      id = existing.id
      console.log(`  ⏭️  ${entry.name}`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          nameOrigin: entry.nameOrigin,
          description: entry.description,
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: ACCOUNT_ID,
        },
      })
      id = created.id
      console.log(`  ✅ ${entry.name}`)
    }

    for (const isoCode of entry.linkToIsoCodes) {
      const modernCountryId = isoToModernId.get(isoCode)
      if (!modernCountryId) continue

      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId },
        })
      }
    }
  }

  console.log(`✅ 루마니아 역사 국가 시딩 완료 (${ENTRIES.length}건)\n`)
}
