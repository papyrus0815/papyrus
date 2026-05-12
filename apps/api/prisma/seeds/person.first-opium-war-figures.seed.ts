/**
 * 1차 아편전쟁(1839-1842) 핵심 인물 시드
 *
 * 등록 항목:
 *  - 청 황실(애신각라 愛新覺羅) Dynasty + DynastyRule (청나라 통치)
 *  - Person 7명
 *    • 청 측: 도광제(8대 황제, SovereignReign), 임칙서, 기영
 *    • 영국 측: 찰스 엘리엇, 헨리 포팅거, 휴 고프, 파머스턴 자작
 *  - PersonStats(6축 능력치) + Person.influence
 *  - PersonEvent — 1차 아편전쟁 + 자식 사건 연결 (빅토리아 여왕도 포함)
 */
import {
  AppointmentMethod,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

async function getHistoricalCountryId(prisma: PrismaService, name: string): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}
async function getDynastyId(prisma: PrismaService, name: string): Promise<string | null> {
  const d = await prisma.dynasty.findFirst({ where: { name } })
  return d?.id ?? null
}
async function getPositionDefId(prisma: PrismaService, title: string): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

// ── 청 황실 가문 ─────────────────────────────────────────────────────────────
const QING_DYNASTY = {
  name: '애신각라 가문',
  description:
    '청나라 황실 가문(滿洲愛新覺羅, Aisin Gioro). 누르하치(태조)의 후금 건국에서 출발해 1644년 입관 후 청 제국 황실로 자리잡아 1912년 신해혁명까지 중원을 통치했다.',
  startYear: 1616, endYear: 1912,
  originPlace: '滿洲',
}

interface PersonStatsInput {
  politics: number
  military: number
  diplomacy: number
  intellect: number
  charisma: number
  administration: number
  notes?: string
}

interface PersonEntry {
  name: string
  surname?: string
  originalName: string
  regnalName?: string
  biography: string
  birthYear: number; birthMonth: number; birthDay: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender: string
  dynastyName?: string
  countryName?: string
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
  /** 천황·황제 등 SovereignReign */
  reigns?: {
    countryName: string
    positionTitle: string
    regnalNumber?: number
    startYear: number; startMonth: number; startDay?: number
    endYear?: number; endMonth?: number; endDay?: number
    appointmentMethod: AppointmentMethod
    endReason?: TenureEndReason
    notes?: string
  }[]
  /** PersonEvent — 사건 연결 */
  events?: { eventTitle: string; role?: string; note?: string }[]
}

const PERSONS: PersonEntry[] = [
  // ── 청 측 ────────────────────────────────────────────────────────────────
  {
    name: '민녕',
    surname: '아이신줴뤄',
    originalName: 'Daoguang Emperor (Aisin Gioro Mianning)',
    regnalName: '도광',
    biography:
      '청 제8대 황제(재위 1820-1850). 가경제의 둘째 아들. 검약과 친정으로 알려졌으나 재위 중 백련교의 잔재·신강 회민 반란·아편 무역 등 누적된 위기에 직면했다. 1839년 임칙서를 광저우에 파견해 아편 단속을 단행했으나 1차 아편전쟁(1839-1842)에 패해 난징 조약을 수락, 청 쇠퇴기의 시작을 상징하는 군주가 되었다.',
    birthYear: 1782, birthMonth: 9, birthDay: 16,
    deathYear: 1850, deathMonth: 2, deathDay: 25,
    gender: 'MALE',
    dynastyName: '애신각라 가문',
    countryName: '청나라',
    birthPlaceText: '청 베이징 자금성 — 현재 베이징시 둥청구',
    influence: 78,
    stats: {
      politics: 65, military: 50, diplomacy: 45, intellect: 70, charisma: 55, administration: 75,
      notes: '검소한 친정과 행정 장악력은 있었으나 외세 대응에선 정보·전략 부재로 결정 동요. 임칙서 파견 → 해임 → 강화의 갈팡질팡이 대표적.',
    },
    reigns: [
      {
        countryName: '청나라',
        positionTitle: '황제',
        regnalNumber: 8,
        startYear: 1820, startMonth: 10, startDay: 3,
        endYear: 1850, endMonth: 2, endDay: 25,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '재위 중 1차 아편전쟁(1839-42) 발발. 난징 조약(1842) 체결로 청 쇠퇴기 시작.',
      },
    ],
    events: [
      { eventTitle: '1차 아편전쟁', role: '청 황제(친정)', note: '아편 단속 명령자, 강화 결단자.' },
    ],
  },
  {
    name: '칙서',
    surname: '임',
    originalName: 'Lin Zexu',
    biography:
      '청 흠차대신·양광총독. 푸젠성 푸저우 출신의 한족 관료로 청렴·강직으로 명성이 높았다. 1838년 도광제에게 "주의(籌議)" 상소를 올려 아편 엄금을 주장, 1839년 흠차대신으로 광저우에 파견되어 영국 상인 아편 약 1,400톤(2만 상자)을 압수해 후먼 해변에서 폐기했다. 1차 아편전쟁의 직접 도화선이 된 인물이며, 패전 책임으로 신강 이리(伊犁)로 유배되었다(1841). 1845년 복권되어 운귀총독·광시순무 등을 역임.',
    birthYear: 1785, birthMonth: 8, birthDay: 30,
    deathYear: 1850, deathMonth: 11, deathDay: 22,
    gender: 'MALE',
    countryName: '청나라',
    birthPlaceText: '청 푸젠성 푸저우부 후관현 — 현재 푸젠성 푸저우시',
    influence: 85,
    stats: {
      politics: 85, military: 55, diplomacy: 60, intellect: 92, charisma: 80, administration: 95,
      notes: '아편 단속의 행정 집행력은 압권. 다만 영국 군사력 정보가 부족해 외교·군사 판단에서는 한계.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '청 흠차대신(1839)', note: '아편 압수·폐기로 전쟁 도화선. 패전 후 신강 유배.' },
    ],
  },
  {
    name: '영',
    surname: '기',
    originalName: 'Qiying (Kiying)',
    biography:
      '청 만주 정람기 출신 황족 관료. 광저우장군·양강총독을 거쳐 1842년 흠차대신으로 영국과 난징 조약(1842-08-29) 체결을 주관했다. 이후 후먼 추가조약(1843)과 미국·프랑스와의 망하조약·황포조약(1844)도 모두 그의 손에서 체결되어 "불평등 조약 체제의 청 측 서명자"로 평가된다. 1858년 톈진 조약 협상에서 도주죄로 자결을 명받아 사망.',
    birthYear: 1787, birthMonth: 1, birthDay: 1, // 정확한 일자 불명, 1월 1일로 표기
    deathYear: 1858, deathMonth: 6, deathDay: 29,
    gender: 'MALE',
    dynastyName: '애신각라 가문',
    countryName: '청나라',
    birthPlaceText: '청 베이징 만주 정람기 — 현재 베이징시',
    influence: 65,
    stats: {
      politics: 70, military: 40, diplomacy: 75, intellect: 70, charisma: 60, administration: 75,
      notes: '협상 실무는 매끄러웠으나 청의 요구를 거의 관철 못 함. 이후 청에서 "유화론자"로 비판받음.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '청 강화 협상자', note: '난징 조약(1842) 체결.' },
    ],
  },
  // ── 영국 측 ───────────────────────────────────────────────────────────────
  {
    name: '찰스',
    surname: '엘리엇',
    originalName: 'Charles Elliot',
    biography:
      '영국 해군 장교·외교관. 1834년 對청 무역감독관으로 부임, 1836년 수석감독관, 1839년 對청 전권대사로 승격. 1839년 임칙서의 아편 단속에 영국 상인을 마카오로 철수시키고 무력 시위를 지시, 천비 해전(1839-11-03)을 야기했다. 1841년 1월 25일 홍콩섬 점거를 명령하고 천비 가조약을 맺었으나 영국 본국이 "양보 과다"로 거부, 5월에 헨리 포팅거에게 전권을 인계했다. 이후 텍사스 영사·세인트헬레나 총독·트리니다드 총독을 역임.',
    birthYear: 1801, birthMonth: 8, birthDay: 15,
    deathYear: 1875, deathMonth: 9, deathDay: 9,
    gender: 'MALE',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    birthPlaceText: '영국령 인도 드레스덴 — (실제 출생지는 독일 작센)',
    influence: 70,
    stats: {
      politics: 60, military: 75, diplomacy: 78, intellect: 75, charisma: 65, administration: 70,
      notes: '실무 외교 능력은 우수하나 본국 외무성과 마찰. 홍콩 점거의 실질적 결정자.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '영국 1대 전권대사(1839~1841)', note: '천비 해전 지시·홍콩섬 점거 결정.' },
      { eventTitle: '천비 해전', role: '영국 측 결정권자', note: '청 수군과의 충돌 결행.' },
    ],
  },
  {
    name: '헨리',
    surname: '포팅거',
    originalName: 'Henry Pottinger',
    biography:
      '영국 동인도회사 장교 출신 외교관. 인도·페르시아·발루치스탄에서 활약하며 신드(Sindh) 정세 보고로 명성을 얻었다. 1841년 5월 對청 2대 전권대사로 부임, 양쯔강 진격 작전을 지휘해 진강 함락(1842-07-21) 후 난징 조약(1842-08-29)을 체결했다. 1843년 초대 홍콩 총독에 취임. 이후 케이프 식민지 총독·마드라스 총독을 역임.',
    birthYear: 1789, birthMonth: 10, birthDay: 3,
    deathYear: 1856, deathMonth: 3, deathDay: 18,
    gender: 'MALE',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    birthPlaceText: '아일랜드 다운주 마운트포팅거 — 현재 북아일랜드 다운주',
    influence: 78,
    stats: {
      politics: 70, military: 80, diplomacy: 85, intellect: 78, charisma: 70, administration: 82,
      notes: '인도 식민 행정의 전형적 베테랑. 압박 협상으로 난징 조약 관철.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '영국 2대 전권대사(1841~1842)', note: '양쯔강 진격 지휘·난징 조약 체결.' },
      { eventTitle: '진강 전투', role: '영국 측 정치 책임자', note: '함대 진강 진격 명령.' },
    ],
  },
  {
    name: '휴',
    surname: '고프',
    originalName: 'Hugh Gough',
    biography:
      '영국 육군 원수, 아일랜드 출신. 반도전쟁에서 두각, 마라타 전쟁에서 공적. 1841년 對청 영국 원정군 총사령관으로 부임해 광저우·샤먼·정해·닝보·진강을 차례로 점령. 진강 전투(1842-07-21)에서 결정적 승리로 청을 강화로 몰았다. 이후 시크 전쟁(1845-46, 1848-49)을 지휘해 펀자브를 영국 영토로 편입.',
    birthYear: 1779, birthMonth: 11, birthDay: 3,
    deathYear: 1869, deathMonth: 3, deathDay: 2,
    gender: 'MALE',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    birthPlaceText: '아일랜드 리머릭주 우드스타운 하우스 — 현재 아일랜드 리머릭주',
    influence: 72,
    stats: {
      politics: 50, military: 92, diplomacy: 55, intellect: 70, charisma: 75, administration: 70,
      notes: '정면 돌파형 야전 지휘관. 아편전쟁·시크 전쟁 모두 함포·총포 우위로 단기 결전 도출.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '영국 원정군 총사령관', note: '연안·양쯔강 점령 작전 총지휘.' },
      { eventTitle: '진강 전투', role: '영국군 지휘관', note: '결정적 승리 — 양쯔강 보급선 차단.' },
    ],
  },
  {
    name: '헨리',
    surname: '템플',
    originalName: 'Henry John Temple, 3rd Viscount Palmerston',
    regnalName: 'Palmerston',
    biography:
      '영국 외무장관(1830~1841, 1846~1851)·총리(1855~1858, 1859~1865). 휘그·리버럴 정치인으로 19세기 중반 영국 외교를 사실상 주도. 1839~40년 임칙서의 아편 압수에 강경 대응을 주도, 1840년 4월 의회에서 출병안 가결(271 대 262)에 결정적 역할을 했다. 후일 크림전쟁 외교, 인도 세포이 항쟁 진압, 미국 남북전쟁 중립 정책 등 영국 제국 외교의 상징적 인물.',
    birthYear: 1784, birthMonth: 10, birthDay: 20,
    deathYear: 1865, deathMonth: 10, deathDay: 18,
    gender: 'MALE',
    countryName: '그레이트브리튼 및 아일랜드 연합왕국',
    birthPlaceText: '런던 웨스트민스터 파크 스트리트 — 현재 런던 웨스트민스터구',
    influence: 90,
    stats: {
      politics: 92, military: 70, diplomacy: 95, intellect: 88, charisma: 88, administration: 82,
      notes: '"포함 외교(gunboat diplomacy)"의 전형. 자유무역+제국주의 결합 노선.',
    },
    events: [
      { eventTitle: '1차 아편전쟁', role: '영국 외무장관', note: '출병 결의 주도, 동방원정군 파견 지시.' },
    ],
  },
]

// 빅토리아 여왕은 person.britain-monarchs.seed에서 이미 등록 — PersonEvent만 추가
const EXTRA_EVENT_LINKS: { originalName: string; eventTitle: string; role?: string; note?: string }[] = [
  { originalName: 'Victoria', eventTitle: '1차 아편전쟁', role: '영국 군주', note: '재위 중 영국이 출병. 의회 결의 후 칙허.' },
]

export async function seedFirstOpiumWarFigures(prisma: PrismaService): Promise<void> {
  console.log('\n🎭 1차 아편전쟁 인물 시딩 시작...')

  // ── 0) 청 애신각라 가문 ────────────────────────────────────────────────
  console.log('\n  🏰 청 황실 가문 등록...')
  const existingDyn = await prisma.dynasty.findFirst({ where: { name: QING_DYNASTY.name } })
  let qingDynastyId: string
  if (existingDyn) {
    qingDynastyId = existingDyn.id
    console.log(`    ⏭️  ${QING_DYNASTY.name}`)
  } else {
    const created = await prisma.dynasty.create({
      data: {
        name: QING_DYNASTY.name,
        description: QING_DYNASTY.description,
        startDate: new Date(QING_DYNASTY.startYear, 0, 1),
        endDate: new Date(QING_DYNASTY.endYear, 11, 31),
        originPlace: QING_DYNASTY.originPlace,
      },
    })
    qingDynastyId = created.id
    console.log(`    ✅ ${QING_DYNASTY.name}`)
  }

  // 청나라 통치 기록
  const qingHCId = await getHistoricalCountryId(prisma, '청나라')
  if (qingHCId) {
    const ruleExists = await prisma.dynastyRule.findFirst({
      where: { dynastyId: qingDynastyId, historicalCountryId: qingHCId },
    })
    if (!ruleExists) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: qingDynastyId,
          historicalCountryId: qingHCId,
          startEra: 'AD' as any, startYear: 1644,
          endEra: 'AD' as any, endYear: 1912,
        },
      })
      console.log(`    📜 통치 기록: 애신각라 가문 → 청나라 (1644-1912)`)
    }
  }

  // ── 1) 인물 등록 ──────────────────────────────────────────────────────
  console.log('\n  👤 인물 등록...')
  for (const m of PERSONS) {
    const existing = await prisma.person.findFirst({ where: { originalName: m.originalName } })
    let personId: string

    const birthDate = new Date(m.birthYear, m.birthMonth - 1, m.birthDay)
    const deathDate = m.deathYear ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1) : undefined
    const linkedDynastyId = m.dynastyName ? await getDynastyId(prisma, m.dynastyName) : null
    const linkedCountryId = m.countryName ? await getHistoricalCountryId(prisma, m.countryName) : null

    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${m.originalName}`)
      const patch: { dynastyId?: string; influence?: number; birthPlaceText?: string } = {}
      if (!existing.dynastyId && linkedDynastyId) patch.dynastyId = linkedDynastyId
      if (existing.influence == null && m.influence != null) patch.influence = m.influence
      if (!existing.birthPlaceText && m.birthPlaceText) patch.birthPlaceText = m.birthPlaceText
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: personId }, data: patch })
        if (patch.influence != null) console.log(`        ✅ 영향력: ${patch.influence}`)
        if (patch.birthPlaceText) console.log(`        ✅ 출생지: ${patch.birthPlaceText}`)
      }
    } else {
      const created = await prisma.person.create({
        data: {
          name: m.name,
          surname: m.surname,
          originalName: m.originalName,
          regnalName: m.regnalName,
          biography: m.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: m.gender,
          // 청 인물은 동아시아식(성-이름) → korean. 영국·아일랜드는 western.
          nameDisplayOrder: (m.surname === '아이신줴뤄' || m.surname === '임' || m.surname === '기') ? 'korean' : 'western',
          dynastyId: linkedDynastyId ?? undefined,
          influence: m.influence,
          birthPlaceText: m.birthPlaceText,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${m.originalName}${m.influence != null ? ` (영향력 ${m.influence})` : ''}`)
    }

    // 소속 국가 affiliation
    if (linkedCountryId) {
      const affExists = await prisma.personCountryAffiliation.findFirst({
        where: { personId, historicalCountryId: linkedCountryId, affiliationType: 'CITIZENSHIP' as any },
      })
      if (!affExists) {
        await prisma.personCountryAffiliation.create({
          data: { personId, historicalCountryId: linkedCountryId, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
        })
        console.log(`        ✅ 소속국가: ${m.countryName}`)
      }
    }

    // 능력치
    if (m.stats) {
      const existingStats = await prisma.personStats.findFirst({
        where: { personId, accountId: ACCOUNT_ID },
      })
      if (existingStats) {
        console.log(`        ⏭️  능력치`)
      } else {
        await prisma.personStats.create({
          data: {
            personId,
            accountId: ACCOUNT_ID,
            politics: m.stats.politics,
            military: m.stats.military,
            diplomacy: m.stats.diplomacy,
            intellect: m.stats.intellect,
            charisma: m.stats.charisma,
            administration: m.stats.administration,
            notes: m.stats.notes,
          },
        })
        const s = m.stats
        console.log(`        ✅ 능력치: 정${s.politics}/군${s.military}/외${s.diplomacy}/학${s.intellect}/카${s.charisma}/행${s.administration}`)
      }
    }

    // 황제 재위
    for (const r of m.reigns ?? []) {
      const reignCountryId = await getHistoricalCountryId(prisma, r.countryName)
      if (!reignCountryId) { console.warn(`        ⚠️  역사 국가 없음: ${r.countryName}`); continue }
      const positionDefId = await getPositionDefId(prisma, r.positionTitle)
      const startDate = new Date(r.startYear, r.startMonth - 1, r.startDay ?? 1)
      const endDate = r.endYear ? new Date(r.endYear, (r.endMonth ?? 1) - 1, r.endDay ?? 1) : undefined
      const existingReign = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: reignCountryId, regnalNumber: r.regnalNumber },
      })
      if (existingReign) {
        if (existingReign.personId === personId) {
          console.log(`        ⏭️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''}`)
        } else {
          console.warn(`        ⚠️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''} — 다른 인물 점유 (skip)`)
        }
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId: reignCountryId,
            positionDefinitionId: positionDefId,
            regnalNumber: r.regnalNumber,
            startDate, endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            notes: r.notes,
            accountId: ACCOUNT_ID,
          },
        })
        console.log(`        ✅ 재위: ${r.positionTitle} ${r.regnalNumber}대 (${r.startYear}-${r.endYear ?? '현재'})`)
      }
    }

    // 사건 연결 (PersonEvent)
    for (const ev of m.events ?? []) {
      const event = await prisma.event.findFirst({
        where: { title: ev.eventTitle, deletedAt: null },
        select: { id: true },
      })
      if (!event) {
        console.warn(`        ⚠️  사건 없음: ${ev.eventTitle}`)
        continue
      }
      const exists = await prisma.personEvent.findFirst({
        where: { personId, eventId: event.id },
      })
      if (exists) {
        console.log(`        ⏭️  사건연결: ${ev.eventTitle}`)
      } else {
        await prisma.personEvent.create({
          data: { personId, eventId: event.id, role: ev.role, note: ev.note },
        })
        console.log(`        ✅ 사건연결: ${ev.eventTitle}${ev.role ? ` (${ev.role})` : ''}`)
      }
    }
  }

  // ── 2) 추가 사건 연결 (이미 등록된 인물) ─────────────────────────────
  console.log('\n  🔗 추가 사건 연결 (기존 인물)...')
  for (const link of EXTRA_EVENT_LINKS) {
    const person = await prisma.person.findFirst({
      where: { originalName: link.originalName },
      select: { id: true },
    })
    if (!person) {
      console.warn(`    ⚠️  인물 없음: ${link.originalName}`)
      continue
    }
    const event = await prisma.event.findFirst({
      where: { title: link.eventTitle, deletedAt: null },
      select: { id: true },
    })
    if (!event) {
      console.warn(`    ⚠️  사건 없음: ${link.eventTitle}`)
      continue
    }
    const exists = await prisma.personEvent.findFirst({
      where: { personId: person.id, eventId: event.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${link.originalName} → ${link.eventTitle}`)
    } else {
      await prisma.personEvent.create({
        data: { personId: person.id, eventId: event.id, role: link.role, note: link.note },
      })
      console.log(`    ✅ ${link.originalName} → ${link.eventTitle}${link.role ? ` (${link.role})` : ''}`)
    }
  }

  console.log(`\n✅ 1차 아편전쟁 인물 시딩 완료 (${PERSONS.length}명)\n`)
}
