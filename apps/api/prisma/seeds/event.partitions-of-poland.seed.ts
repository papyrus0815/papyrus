/**
 * 폴란드 분할 (1772 · 1793 · 1795) 시드 — 영토 이전(EventTerritoryTransfer) 첫 데이터.
 * docs/event-territory-transfer-review.md
 *
 * 기존 데이터 보존 모드 — 있으면 건너뛴다(사용자 편집 보호). 단 '제1차 폴란드 분할'은 이미 있는 사건이라
 * 아래만 고친다:
 *  - 분야 군사 → 외교, 세부 건국·멸망·병합 → 영토 변경(1차 분할로 연방은 소멸하지 않았다)
 *  - 빠져 있던 오스트리아(오스트리아 대공국 — 이 앱에서 1655~1796 사건이 쓰는 합스부르크 쪽 역사 국가) 참여국 추가
 *  - 영토 이전 3줄(참여국 역할 설명의 자유 글 '약 9만 2천km² 병합' 등을 줄로)
 *  - 새 묶음 '폴란드 분할' 아래로
 *  기간(1763~1773)은 그대로 둔다 — 하위 사건 '아우구스트 3세 사망과 왕위 계승 위기'(1763)가 1차의 배경이라서.
 *
 * 새로 만드는 것:
 *  - 묶음 '폴란드 분할' (1763~1795) — 1차·2차·3차
 *  - 단일 '제2차 폴란드 분할' (1793) · '제3차 폴란드 분할' (1795, 연방 멸망)
 *
 * 면적·인구는 널리 인용되는 근사치(영어권 백과 기준) — 줄의 메모에 '근사치'라고 적는다.
 */
import { EventCountryRole, type Prisma } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const PLC = '폴란드-리투아니아 연방'
const RUSSIA = '러시아 제국'
const PRUSSIA = '프로이센 왕국'
const AUSTRIA = '오스트리아 대공국'

type Ymd = [number, number, number]

const structuredStart = ([year, month, day]: Ymd) => ({
  startEra: 'AD' as const,
  startYear: year,
  startMonth: month,
  startDay: day,
  startDatePrecision: 'day',
  startDate: new Date(Date.UTC(year, month - 1, day)),
})
const structuredEnd = ([year, month, day]: Ymd) => ({
  endEra: 'AD' as const,
  endYear: year,
  endMonth: month,
  endDay: day,
  endDatePrecision: 'day',
  endDate: new Date(Date.UTC(year, month - 1, day)),
})

interface TransferSeed {
  from: string
  to: string
  regionName: string
  method: 'PARTITION' | 'ANNEXATION'
  areaKm2: number
  population: number
  effective?: Ymd
  note?: string
}

interface EventSeed {
  title: string
  description: string
  start: Ymd
  end: Ymd
  kind: 'SINGLE' | 'COLLECTION'
  sections: Array<{ title: string; sectionType: string; content: string }>
  countries: Array<{ name: string; role: EventCountryRole; roleDescription: string }>
  transfers: TransferSeed[]
}

const APPROX = '면적·인구는 널리 인용되는 근사치'

const FIRST_TRANSFERS: TransferSeed[] = [
  {
    from: PLC,
    to: RUSSIA,
    regionName: '폴란드령 리보니아(인플란티)와 벨라루스 동부(폴로츠크·비텝스크·므스치슬라우·호멜)',
    method: 'PARTITION',
    areaKm2: 92_000,
    population: 1_300_000,
    effective: [1772, 8, 5],
    note: `드비나·드니프로강 동쪽. ${APPROX}`,
  },
  {
    from: PLC,
    to: AUSTRIA,
    regionName: '갈리치아-로도메리아(소폴란드 남부·적루테니아, 르부프)',
    method: 'PARTITION',
    areaKm2: 83_000,
    population: 2_650_000,
    effective: [1772, 8, 5],
    note: `세 몫 중 인구가 가장 많은 땅 — 비엘리치카 소금 광산 포함. ${APPROX}`,
  },
  {
    from: PLC,
    to: PRUSSIA,
    regionName: '왕령 프로이센(단치히·토룬 제외)과 네체 지구',
    method: 'PARTITION',
    areaKm2: 36_300,
    population: 580_000,
    effective: [1772, 8, 5],
    note: `동프로이센과 브란덴부르크 본토가 육로로 이어졌다. ${APPROX}`,
  },
]

const SECOND: EventSeed = {
  title: '제2차 폴란드 분할',
  description:
    '1791년 5월 3일 헌법으로 개혁에 나선 폴란드-리투아니아 연방을 러시아가 1792년 폴란드-러시아 전쟁으로 꺾은 뒤, ' +
    '러시아와 프로이센이 1793년 1월 23일 상트페테르부르크 협약으로 연방의 영토를 다시 나눈 사건이다. ' +
    '러시아군에 둘러싸인 그로드노 세임이 7월 22일(러시아)·9월 25일(프로이센) 할양을 비준했고, ' +
    '연방은 남은 땅이 약 21만 km²로 줄어 러시아의 사실상 보호국이 되었다. 오스트리아는 이번 분할에 끼지 않았다.',
  start: [1793, 1, 23],
  end: [1793, 9, 25],
  kind: 'SINGLE',
  sections: [
    {
      title: '배경',
      sectionType: 'background',
      content:
        '1차 분할 뒤 연방은 4년 세임(1788~1792)에서 5월 3일 헌법(1791)을 채택해 자유 거부권을 없애고 상비군을 늘리는 개혁에 나섰다. ' +
        '러시아는 이를 자국 영향력에 대한 도전으로 보고, 헌법에 반대하는 귀족들의 타르고비차 연맹을 명분으로 1792년 5월 침공했다. ' +
        '1790년 방어 동맹을 맺었던 프로이센은 연방을 돕지 않았고, 스타니스와프 아우구스트 국왕이 7월 타르고비차 연맹에 가담하며 전쟁이 끝났다.',
    },
    {
      title: '여파',
      sectionType: 'aftermath',
      content:
        '남은 연방은 러시아 공사와 주둔군의 감시 아래 놓였고 5월 3일 헌법은 폐기되었다. 군대 감축 명령이 내려지자 ' +
        '1794년 3월 타데우시 코시치우슈코가 크라쿠프에서 봉기를 일으켰으나, 같은 해 가을 러시아·프로이센군에 진압되며 3차 분할로 이어졌다.',
    },
  ],
  countries: [
    { name: PLC, role: EventCountryRole.VICTIM, roleDescription: '영토 약 30만 km²와 인구 약 400만 명을 잃고 러시아의 보호국으로 전락' },
    { name: RUSSIA, role: EventCountryRole.INITIATOR, roleDescription: '1792년 전쟁으로 개혁 연방을 꺾고 분할을 주도 — 우크라이나 우안·벨라루스 중부 병합' },
    { name: PRUSSIA, role: EventCountryRole.BENEFICIARY, roleDescription: '방어 동맹을 저버리고 대폴란드·단치히·토룬 병합' },
  ],
  transfers: [
    {
      from: PLC,
      to: RUSSIA,
      regionName: '우크라이나 우안과 벨라루스 중부(키예프 일부·민스크·브라츨라프·포돌리아·볼히니아 동부)',
      method: 'PARTITION',
      areaKm2: 250_200,
      population: 3_000_000,
      effective: [1793, 7, 22],
      note: `그로드노 세임 비준. ${APPROX}`,
    },
    {
      from: PLC,
      to: PRUSSIA,
      regionName: '대폴란드(포즈난·칼리시)와 단치히·토룬 — 남프로이센',
      method: 'PARTITION',
      areaKm2: 57_100,
      population: 1_000_000,
      effective: [1793, 9, 25],
      note: `그로드노 세임 비준. ${APPROX}`,
    },
  ],
}

const THIRD: EventSeed = {
  title: '제3차 폴란드 분할',
  description:
    '코시치우슈코 봉기(1794)를 진압한 러시아·프로이센·오스트리아가 1795년 10월 24일 협약으로 폴란드-리투아니아 연방의 남은 땅을 모두 나눠 가진 사건이다. ' +
    '11월 25일 스타니스와프 아우구스트 국왕이 퇴위하면서 연방은 지도에서 사라졌고, 폴란드는 1918년까지 123년간 독립 국가를 갖지 못했다.',
  start: [1795, 10, 24],
  end: [1795, 11, 25],
  kind: 'SINGLE',
  sections: [
    {
      title: '배경',
      sectionType: 'background',
      content:
        '2차 분할 뒤 군대 감축 명령에 맞서 1794년 3월 코시치우슈코가 크라쿠프에서 봉기했다. 라츠와비체 승리와 바르샤바·빌뉴스 봉기로 한때 기세를 올렸으나 ' +
        '10월 마치에요비체에서 코시치우슈코가 포로가 되고 11월 수보로프의 러시아군이 바르샤바 프라가 지구를 함락하며 봉기는 끝났다.',
    },
    {
      title: '여파',
      sectionType: 'aftermath',
      content:
        '1797년 1월 상트페테르부르크 협약에서 세 나라는 "폴란드 왕국"이라는 이름을 다시 쓰지 않기로 약속했다. ' +
        '이후 나폴레옹의 바르샤바 공국(1807), 빈 회의의 폴란드 입헌왕국(1815)으로 일부가 되살아났지만, 독립 국가는 1918년 제2공화국에서야 복원되었다.',
    },
  ],
  countries: [
    { name: PLC, role: EventCountryRole.DISSOLVED, roleDescription: '남은 영토를 모두 잃고 국왕 퇴위로 국가 소멸(1795-11-25)' },
    { name: RUSSIA, role: EventCountryRole.INITIATOR, roleDescription: '봉기 진압을 주도하고 리투아니아·벨라루스 서부·볼히니아 서부 병합' },
    { name: PRUSSIA, role: EventCountryRole.BENEFICIARY, roleDescription: '바르샤바를 포함한 마조프셰 병합(신동프로이센)' },
    { name: AUSTRIA, role: EventCountryRole.BENEFICIARY, roleDescription: '크라쿠프·루블린 일대 병합(서갈리치아)' },
  ],
  transfers: [
    {
      from: PLC,
      to: RUSSIA,
      regionName: '리투아니아 대공국 잔여부·벨라루스 서부·볼히니아 서부(부크·네만강 동쪽)',
      method: 'PARTITION',
      areaKm2: 120_000,
      population: 1_200_000,
      effective: [1795, 10, 24],
      note: APPROX,
    },
    {
      from: PLC,
      to: PRUSSIA,
      regionName: '마조프셰와 바르샤바, 포들라시에 일부 — 신동프로이센',
      method: 'PARTITION',
      areaKm2: 55_000,
      population: 1_000_000,
      effective: [1795, 10, 24],
      note: APPROX,
    },
    {
      from: PLC,
      to: AUSTRIA,
      regionName: '크라쿠프·루블린·산도미에시 일대 — 서갈리치아',
      method: 'PARTITION',
      areaKm2: 47_000,
      population: 1_200_000,
      effective: [1795, 10, 24],
      note: APPROX,
    },
  ],
}

export async function seedPartitionsOfPoland(prisma: PrismaService) {
  console.log('\n🇵🇱 폴란드 분할(1772·1793·1795) 시딩 시작...')
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }
  const countryIds = new Map<string, string>()
  for (const name of [PLC, RUSSIA, PRUSSIA, AUSTRIA]) {
    const country = await prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } })
    if (!country) {
      console.warn(`  ⚠️  역사 국가 미존재 — 시딩 중단: ${name}`)
      return
    }
    countryIds.set(name, country.id)
  }
  const idOf = (name: string) => countryIds.get(name)!

  // ── 1) 묶음 '폴란드 분할' ────────────────────────────────────────────────
  const PARENT_TITLE = '폴란드 분할'
  let parent = await prisma.event.findFirst({ where: { title: PARENT_TITLE, deletedAt: null }, select: { id: true } })
  if (parent) {
    console.log(`  ⏭️  묶음 이미 존재: ${PARENT_TITLE}`)
  } else {
    parent = await prisma.event.create({
      data: {
        title: PARENT_TITLE,
        description:
          '러시아·프로이센·오스트리아가 1772년·1793년·1795년 세 차례에 걸쳐 폴란드-리투아니아 연방의 영토를 나눠 가져 끝내 나라를 지도에서 지운 과정. ' +
          '1763년 아우구스트 3세가 죽은 뒤 러시아가 왕위 선거에 개입해 스타니스와프 아우구스트를 세우면서 연방은 사실상 러시아의 영향권에 들었고, ' +
          '세 이웃은 서로의 세력 균형을 지키는 값으로 연방의 땅을 썼다. 연방은 1772년 국토의 약 30%, 1793년 다시 약 30만 km²를 잃은 뒤 1795년 소멸했다.',
        kind: 'COLLECTION',
        domain: 'DIPLOMACY',
        type: 'TERRITORY',
        ...structuredStart([1763, 10, 5]),
        ...structuredEnd([1795, 11, 25]),
        createdById: admin.id,
      },
      select: { id: true },
    })
    console.log(`  ✅ 묶음 생성: ${PARENT_TITLE}`)
    await prisma.eventCountryRelation.createMany({
      data: [
        { eventId: parent.id, historicalCountryId: idOf(PLC), role: EventCountryRole.VICTIM, roleDescription: '세 차례 분할로 영토를 모두 잃고 1795년 소멸', sortOrder: 0 },
        { eventId: parent.id, historicalCountryId: idOf(RUSSIA), role: EventCountryRole.INITIATOR, roleDescription: '세 분할 모두 참여 — 가장 큰 몫(약 46만 km²)', sortOrder: 1 },
        { eventId: parent.id, historicalCountryId: idOf(PRUSSIA), role: EventCountryRole.BENEFICIARY, roleDescription: '세 분할 모두 참여 — 왕령 프로이센·대폴란드·바르샤바', sortOrder: 2 },
        { eventId: parent.id, historicalCountryId: idOf(AUSTRIA), role: EventCountryRole.BENEFICIARY, roleDescription: '1차·3차 참여 — 갈리치아·서갈리치아', sortOrder: 3 },
      ],
    })
  }

  // ── 2) 제1차 — 기존 사건 고치기 ───────────────────────────────────────────
  const first = await prisma.event.findFirst({ where: { title: '제1차 폴란드 분할', deletedAt: null }, select: { id: true, parentEventId: true, type: true } })
  if (!first) {
    console.warn('  ⚠️  제1차 폴란드 분할이 없어 1차 보강을 건너뜀')
  } else {
    if (first.type !== 'TERRITORY' || first.parentEventId !== parent.id) {
      await prisma.event.update({
        where: { id: first.id },
        data: { domain: 'DIPLOMACY', type: 'TERRITORY', parentEventId: first.parentEventId ?? parent.id },
      })
      console.log('  ✅ 1차: 분야 외교 · 세부 영토 변경 · 묶음 아래로')
    }
    const hasAustria = await prisma.eventCountryRelation.findFirst({ where: { eventId: first.id, historicalCountryId: idOf(AUSTRIA) } })
    if (!hasAustria) {
      const last = await prisma.eventCountryRelation.aggregate({ where: { eventId: first.id }, _max: { sortOrder: true } })
      await prisma.eventCountryRelation.create({
        data: {
          eventId: first.id,
          historicalCountryId: idOf(AUSTRIA),
          role: EventCountryRole.BENEFICIARY,
          roleDescription: '처음엔 분할에 주저했으나(마리아 테레지아) 갈리치아-로도메리아 약 8.3만 km² 병합 — 세 몫 중 인구 최다',
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
      })
      console.log('  ✅ 1차: 오스트리아 대공국 참여국 추가')
    }
    await seedTransfers(prisma, first.id, FIRST_TRANSFERS, idOf)
  }

  // ── 3) 제2차·제3차 — 새 사건 ──────────────────────────────────────────────
  for (const seed of [SECOND, THIRD]) {
    const exists = await prisma.event.findFirst({ where: { title: seed.title, deletedAt: null }, select: { id: true } })
    if (exists) {
      console.log(`  ⏭️  이미 존재: ${seed.title}`)
      await seedTransfers(prisma, exists.id, seed.transfers, idOf)
      continue
    }
    const created = await prisma.event.create({
      data: {
        title: seed.title,
        description: seed.description,
        kind: seed.kind,
        domain: 'DIPLOMACY',
        type: 'TERRITORY',
        parentEventId: parent.id,
        ...structuredStart(seed.start),
        ...structuredEnd(seed.end),
        createdById: admin.id,
      },
      select: { id: true },
    })
    await prisma.eventSection.createMany({
      data: seed.sections.map((section, order) => ({ eventId: created.id, order, ...section })),
    })
    await prisma.eventCountryRelation.createMany({
      data: seed.countries.map((country, sortOrder) => ({
        eventId: created.id,
        historicalCountryId: idOf(country.name),
        role: country.role,
        roleDescription: country.roleDescription,
        sortOrder,
      })),
    })
    await seedTransfers(prisma, created.id, seed.transfers, idOf)
    console.log(`  ✅ 생성: ${seed.title}`)
  }
  console.log('✅ 폴란드 분할 시딩 완료\n')
}

/** 영토 이전 줄 — 그 사건에 줄이 하나라도 있으면 건너뛴다(사용자 편집 보호) */
async function seedTransfers(prisma: PrismaService, eventId: string, transfers: TransferSeed[], idOf: (name: string) => string) {
  const count = await prisma.eventTerritoryTransfer.count({ where: { eventId } })
  if (count > 0) {
    console.log(`    ⏭️  영토 이전 이미 ${count}줄`)
    return
  }
  const data: Prisma.EventTerritoryTransferCreateManyInput[] = transfers.map((transfer, sortOrder) => ({
    eventId,
    fromHistoricalCountryId: idOf(transfer.from),
    toHistoricalCountryId: idOf(transfer.to),
    regionName: transfer.regionName,
    method: transfer.method,
    areaKm2: transfer.areaKm2,
    population: transfer.population,
    ...(transfer.effective
      ? {
          effectiveEra: 'AD' as const,
          effectiveYear: transfer.effective[0],
          effectiveMonth: transfer.effective[1],
          effectiveDay: transfer.effective[2],
          effectivePrecision: 'day',
        }
      : {}),
    note: transfer.note ?? null,
    sortOrder,
  }))
  await prisma.eventTerritoryTransfer.createMany({ data })
  console.log(`    ✅ 영토 이전 ${data.length}줄`)
}
