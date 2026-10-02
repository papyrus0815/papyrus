/**
 * 민족 이동기(4~5세기) 행위자 시드 — 훈 제국 · 이동기 고트 · 게피드 · 프랑크족 · 알란족.
 *
 * 왜 필요한가: 376~451년의 고트·훈 사건 5건이 **로마 쪽 절반만** 기록돼 있었다
 * (카탈라우눔 전투 참여국 0, 알라리크 로마 약탈 0, 아드리아노플은 로마 측 1국뿐).
 * 상대편을 고를 자리가 없었기 때문이다 — 훈족은 DB에 없었고, 고트족은 정착 뒤의
 * 서고트 왕국(418~)·동고트 왕국(493~)으로만 있었다.
 *
 * 모델 규약 (docs/event-detail-data-foundation.md D8)
 * - 민족(Ethnicity)  = '누구인가'의 분류 계보. 고트족 > 동게르만족 > 게르만족.
 * - 집단(entityKind PEOPLE) = 영토·건국일 없이 움직이는 **행위자**. 전쟁·조약·통치의 주체.
 *   국가 목록·건국/멸망 표지에서는 빠지고, 정착하면 전환(Transition)으로 왕국에 이어진다.
 * - 훈 제국은 집단이 아니라 **국가(유목 제국)** 다 — 단일 군주(아틸라)·공납 체계·종속 부족이 있었다.
 *
 * 연대는 연 정밀도의 통설 값이다. 시작이 '문헌 첫 등장'인 집단은 설명에 그렇게 적는다.
 * 모던 국가 링크는 걸지 않는다 — 이동 집단의 '정체성 핵심부'가 현대 국가 하나에 대응하지 않는다.
 *
 * 멱등: 국가·민족은 name, 전환은 (선행, 후행), 소속은 (상위, 하위, 역할), 사건 참여국은
 * (사건, 역사국가) 기준. 재실행해도 중복이 생기지 않고, 기존 참여국 행의 순서는 보존한다.
 */
import {
  Era,
  EventCountryRole,
  HistoricalEntityKind,
  HistoricalMembershipRole,
  HistoricalStateType,
  TenureEndReason,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface PeopleEntry {
  name: string
  enName: string
  description: string
  startYear: number | null
  endYear: number | null
  stateType: HistoricalStateType
  entityKind: HistoricalEntityKind
  latitude?: number
  longitude?: number
  ethnicity: string
}

const ENTRIES: PeopleEntry[] = [
  {
    name: '훈 제국',
    enName: 'Hunnic Empire',
    description:
      '4세기 후반 흑해 북안에 나타나 고트족을 밀어내며 민족 이동을 촉발한 훈족이 5세기 전반 판노니아 평원을 ' +
      '중심으로 세운 유목 제국. 루가 대에 동로마로부터 공납을 받기 시작했고, 434년 형 블레다와 공동 즉위한 ' +
      '아틸라가 445년 단독 군주가 되어 동고트·게피드·스키리·헤룰리 등 게르만·이란계 부족을 종속시켰다. ' +
      '441~443년 발칸 원정(나이수스 함락)으로 동로마의 공납을 세 배로 올렸고, 451년 갈리아(카탈라우눔 전투)와 ' +
      '452년 이탈리아를 침공했다. 453년 아틸라가 급사한 뒤 454년 네다오 전투에서 게피드의 아르다리크가 이끈 ' +
      '종속 부족 반란에 패해 해체되기 시작했고, 469년 아들 덴기지크가 동로마군에 전사하며 소멸했다.',
    startYear: 370,
    endYear: 469,
    stateType: HistoricalStateType.NOMADIC_EMPIRE,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 47.0,
    longitude: 20.0,
    ethnicity: '훈족',
  },
  {
    name: '서고트(이동기)',
    enName: 'Visigoths (migration period)',
    description:
      '훈족의 압박을 피해 376년 도나우강을 건너 로마 영내로 들어온 테르빙기 고트와, 그들을 중심으로 ' +
      '395년 알라리크 아래 결집한 고트 집단. 378년 아드리아노플에서 황제 발렌스를 전사시켰고, 382년 ' +
      '테오도시우스 1세와의 조약으로 동맹부족(foederati)이 되어 트라키아에 정착했다. 테오도시우스 사후 ' +
      '알라리크가 발칸과 이탈리아를 전전하다 410년 로마를 약탈했고, 418년 서로마와의 조약으로 아키텐에 ' +
      '정착하면서 툴루즈를 수도로 한 서고트 왕국이 되었다. 영토·수도 없이 움직이던 시기라 국가가 아니라 ' +
      '집단으로 등록한다.',
    startYear: 376,
    endYear: 418,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.PEOPLE,
    latitude: 43.6,
    longitude: 24.0,
    ethnicity: '고트족',
  },
  {
    name: '동고트(이동기)',
    enName: 'Ostrogoths (migration period)',
    description:
      '흑해 북안 그레우퉁기 고트를 모태로 한 고트 집단. 370년대 훈족에게 정복되어 약 80년간 훈 제국에 ' +
      '종속되었고, 발라미르 아래 451년 카탈라우눔 전투에 훈 측으로 참전했다. 454년 네다오 전투 이후 ' +
      '독립하여 동로마의 동맹부족으로 판노니아에 정착했으며, 488년 테오도리쿠스가 제논 황제의 위임을 받아 ' +
      '이탈리아로 진군해 493년 오도아케르를 제거하고 동고트 왕국을 세웠다.',
    startYear: 375,
    endYear: 493,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.PEOPLE,
    latitude: 46.5,
    longitude: 18.5,
    ethnicity: '고트족',
  },
  {
    name: '게피드(훈 지배기)',
    enName: 'Gepids (Hunnic period)',
    description:
      '고트족과 같은 동게르만계 부족. 3세기 중엽 문헌에 처음 나타나며, 5세기 전반 훈 제국에 종속되었다. ' +
      '왕 아르다리크는 아틸라의 최측근으로 451년 카탈라우눔 전투에 훈 측으로 참전했으나, 아틸라 사후 ' +
      '454년 네다오 전투에서 종속 부족 연합을 이끌고 훈족을 격파해 판노니아 동부에 게피드 왕국을 세웠다.',
    startYear: 260,
    endYear: 454,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.PEOPLE,
    latitude: 47.5,
    longitude: 21.5,
    ethnicity: '게피드족',
  },
  {
    name: '프랑크족',
    enName: 'Franks',
    description:
      '라인강 하류의 서게르만 부족 연맹. 3세기 중엽 문헌에 처음 나타나며, 살리 프랑크·리푸아리 프랑크 등 ' +
      '여러 집단으로 나뉘어 있었다. 358년 율리아누스가 살리 프랑크를 톡산드리아에 정착시킨 뒤 일부는 로마의 ' +
      '동맹부족이 되었고, 451년 카탈라우눔 전투에서는 대부분 로마 측으로 싸웠다(일부 집단은 훈 측). ' +
      '481년 클로비스가 프랑크 집단들을 통합하면서 프랑크 왕국이 되었다.',
    startYear: 257,
    endYear: 481,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.PEOPLE,
    latitude: 51.5,
    longitude: 6.0,
    ethnicity: '프랑크족',
  },
  {
    name: '알란족',
    enName: 'Alans',
    description:
      '사르마티아계 이란어 유목민. 1세기 문헌(요세푸스)에 처음 나타나 카스피해·흑해 북안 초원에 살았다. ' +
      '4세기 후반 훈족에 일부가 정복·흡수되었고, 다른 일부는 서쪽으로 이동해 378년 아드리아노플 전투에 ' +
      '그레우퉁기 고트 기병과 함께 참전했으며, 406년 반달족과 함께 라인강을 건넜다. 갈리아에 정착한 알란 ' +
      '집단은 451년 상기반 아래 카탈라우눔 전투에서 로마 측 중앙을 맡았다. 캅카스의 알란은 중세 알라니아를 ' +
      '거쳐 오늘날 오세트인으로 이어진다.',
    startYear: 70,
    endYear: null,
    stateType: HistoricalStateType.TRIBAL_STATE,
    entityKind: HistoricalEntityKind.PEOPLE,
    latitude: 45.5,
    longitude: 40.0,
    ethnicity: '알란족',
  },
]

/** 민족 계보 — 이름, 상위 이름 */
const ETHNICITIES: Array<{ name: string; nameLocal?: string; parent: string | null; description: string }> = [
  { name: '게르만족', nameLocal: 'Germanic peoples', parent: null, description: '게르만어를 쓰는 고대·중세 유럽 북부의 여러 민족.' },
  { name: '동게르만족', nameLocal: 'East Germanic peoples', parent: '게르만족', description: '고트·반달·게피드·부르군트 등 동게르만어 집단.' },
  { name: '서게르만족', nameLocal: 'West Germanic peoples', parent: '게르만족', description: '프랑크·알라만·색슨·앵글 등 서게르만어 집단.' },
  { name: '고트족', nameLocal: 'Goths', parent: '동게르만족', description: '테르빙기·그레우퉁기를 거쳐 서고트·동고트로 갈라진 동게르만 민족.' },
  { name: '게피드족', nameLocal: 'Gepids', parent: '동게르만족', description: '고트족과 가까운 동게르만 민족. 판노니아 동부에 왕국을 세웠다.' },
  { name: '프랑크족', nameLocal: 'Franks', parent: '서게르만족', description: '라인강 하류의 서게르만 민족. 프랑크 왕국을 세웠다.' },
  { name: '훈족', nameLocal: 'Huns', parent: null, description: '4~5세기 유라시아 초원에서 유럽으로 진출한 유목 민족. 기원은 학설이 갈린다.' },
  { name: '알란족', nameLocal: 'Alans', parent: null, description: '사르마티아계 이란어 유목 민족. 오세트인의 선조.' },
]

/** 집단에 이어지는 이미 등록된 국가 — 민족 연결용 */
const LINKED_STATES: Array<{ name: string; ethnicity: string }> = [
  { name: '서고트 왕국', ethnicity: '고트족' },
  { name: '동고트 왕국', ethnicity: '고트족' },
  { name: '게피드 왕국', ethnicity: '게피드족' },
  { name: '프랑크 왕국', ethnicity: '프랑크족' },
]

const TRANSITIONS: Array<{ from: string; to: string; type: TransitionEventType }> = [
  { from: '서고트(이동기)', to: '서고트 왕국', type: TransitionEventType.FOUNDED },
  { from: '동고트(이동기)', to: '동고트 왕국', type: TransitionEventType.FOUNDED },
  { from: '게피드(훈 지배기)', to: '게피드 왕국', type: TransitionEventType.INDEPENDENCE },
  { from: '프랑크족', to: '프랑크 왕국', type: TransitionEventType.UNIFICATION },
]

interface Period {
  era: Era
  year: number
  month?: number
  day?: number
}

const MEMBERSHIPS: Array<{
  parent: string
  member: string
  role: HistoricalMembershipRole
  start: Period | null
  end: Period | null
}> = [
  // 그레우퉁기 고트는 370년대 훈족에게 정복돼 네다오(454)까지 종속
  { parent: '훈 제국', member: '동고트(이동기)', role: HistoricalMembershipRole.VASSAL_STATE, start: { era: Era.AD, year: 375 }, end: { era: Era.AD, year: 454 } },
  { parent: '훈 제국', member: '게피드(훈 지배기)', role: HistoricalMembershipRole.VASSAL_STATE, start: null, end: { era: Era.AD, year: 454 } },
  // 382-10-03 테오도시우스 1세와의 조약 → 트라키아 정착 동맹부족. 395년 알라리크 봉기로 이탈
  { parent: '로마 제국', member: '서고트(이동기)', role: HistoricalMembershipRole.FOEDERATUS, start: { era: Era.AD, year: 382, month: 10, day: 3 }, end: { era: Era.AD, year: 395 } },
  // 418 아키텐 정착 조약 → 475 에우리크의 완전 독립 선언까지
  { parent: '서로마 제국', member: '서고트 왕국', role: HistoricalMembershipRole.FOEDERATUS, start: { era: Era.AD, year: 418 }, end: { era: Era.AD, year: 475 } },
  // 네다오 이후 판노니아 정착 → 488 이탈리아 진군
  { parent: '동로마 제국', member: '동고트(이동기)', role: HistoricalMembershipRole.FOEDERATUS, start: { era: Era.AD, year: 456 }, end: { era: Era.AD, year: 488 } },
]

/** 사건 참여국 — '어느 편'은 진영 모델(D1) 전까지 역할 서술에 적는다 */
const EVENT_PARTICIPANTS: Array<{
  eventTitle: string
  /** 잘못 들어간 참여국 교정 — from 행을 to로 바꾼다(서술·순서 보존) */
  replace?: Array<{ from: string; to: string }>
  rows: Array<{ country: string; role: EventCountryRole; description: string }>
}> = [
  {
    eventTitle: '고트족의 도나우강 도하 허가',
    rows: [
      {
        country: '서고트(이동기)',
        role: EventCountryRole.PARTICIPANT,
        description:
          '프리티게른·알라비부스가 이끄는 테르빙기 고트가 훈족에게 쫓겨 로마 영내 이주를 청원, 허가를 받아 도나우강을 건넘.',
      },
    ],
  },
  {
    eventTitle: '아드리아노플 전투',
    // 378년은 제국 분할(395) 이전 — 발렌스는 통일 로마 제국의 동방 황제였다
    replace: [{ from: '동로마 제국', to: '로마 제국' }],
    rows: [
      {
        country: '서고트(이동기)',
        role: EventCountryRole.PARTICIPANT,
        description: '[고트 측] 프리티게른의 테르빙기 고트 본대. 로마군을 포위·섬멸하고 황제 발렌스를 전사시킴.',
      },
      {
        country: '동고트(이동기)',
        role: EventCountryRole.PARTICIPANT,
        description: '[고트 측] 알라테우스·사프락스의 그레우퉁기 기병. 전투 중 도착해 로마군 좌익을 무너뜨린 결정타.',
      },
      {
        country: '알란족',
        role: EventCountryRole.PARTICIPANT,
        description: '[고트 측] 그레우퉁기 고트 기병과 함께 돌입한 알란 기병.',
      },
    ],
  },
  {
    eventTitle: '알라리크 로마 약탈',
    rows: [
      {
        country: '서고트(이동기)',
        role: EventCountryRole.INITIATOR,
        description: '알라리크가 이끈 고트군이 410년 8월 24일 살라리아 문으로 입성해 사흘간 로마를 약탈.',
      },
      {
        country: '서로마 제국',
        role: EventCountryRole.VICTIM,
        description: '호노리우스 황제는 라벤나에 머문 채 협상을 거부했고, 옛 수도 로마가 약 800년 만에 외적에게 함락됨.',
      },
    ],
  },
  {
    eventTitle: '나이수스 함락',
    rows: [
      {
        country: '훈 제국',
        role: EventCountryRole.INITIATOR,
        description: '블레다·아틸라 공동 통치기의 발칸 원정. 공성구를 동원해 나이수스(현 세르비아 니시)를 함락하고 파괴.',
      },
    ],
  },
  {
    eventTitle: '카탈라우눔 전투',
    rows: [
      {
        country: '훈 제국',
        role: EventCountryRole.INITIATOR,
        description: '[훈 측] 아틸라가 갈리아를 침공해 오를레앙을 포위하다 후퇴한 뒤 카탈라우눔 평원에서 교전. 결전을 피하고 철수.',
      },
      {
        country: '동고트(이동기)',
        role: EventCountryRole.PARTICIPANT,
        description: '[훈 측] 훈 제국의 종속 부족. 발라미르 등 아말 가문 형제가 이끌어 서고트와 맞섬.',
      },
      {
        country: '게피드(훈 지배기)',
        role: EventCountryRole.PARTICIPANT,
        description: '[훈 측] 훈 제국의 종속 부족. 아르다리크가 이끔.',
      },
      {
        country: '서로마 제국',
        role: EventCountryRole.PARTICIPANT,
        description: '[로마 측] 총사령관 플라비우스 아에티우스가 게르만·알란 동맹을 규합해 훈군을 저지.',
      },
      {
        country: '서고트 왕국',
        role: EventCountryRole.PARTICIPANT,
        description: '[로마 측] 동맹군의 주력. 왕 테오도리크 1세가 전사하고 아들 토리스문트가 뒤를 이음.',
      },
      {
        country: '알란족',
        role: EventCountryRole.PARTICIPANT,
        description: '[로마 측] 상기반 왕의 갈리아 알란. 충성을 의심받아 전열 중앙에 배치됨.',
      },
      {
        country: '프랑크족',
        role: EventCountryRole.PARTICIPANT,
        description: '[로마 측] 대부분의 프랑크 집단이 로마 측으로 참전(일부 집단은 훈 측).',
      },
    ],
  },
]

function periodColumns(prefix: 'start' | 'end', period: Period | null) {
  const precision = period == null ? null : period.day != null ? 'day' : period.month != null ? 'month' : 'year'
  const legacy =
    period && period.era === Era.AD && period.year >= 1000 && precision === 'day'
      ? new Date(Date.UTC(period.year, period.month! - 1, period.day!))
      : null
  return prefix === 'start'
    ? {
        startEra: period?.era ?? null,
        startYear: period?.year ?? null,
        startMonth: period?.month ?? null,
        startDay: period?.day ?? null,
        startPrecision: precision,
        membershipStartDate: legacy,
      }
    : {
        endEra: period?.era ?? null,
        endYear: period?.year ?? null,
        endMonth: period?.month ?? null,
        endDay: period?.day ?? null,
        endPrecision: precision,
        membershipEndDate: legacy,
      }
}

export async function seedMigrationAgePeoples(prisma: PrismaService): Promise<void> {
  console.log('\n🏕️ 민족 이동기 행위자 시딩 시작...')

  /* 1) 민족 계보 — 부모가 먼저 */
  const ethnicityIds = new Map<string, string>()
  for (const entry of ETHNICITIES) {
    const parentId = entry.parent ? ethnicityIds.get(entry.parent) ?? null : null
    const row = await prisma.ethnicity.upsert({
      where: { name: entry.name },
      update: { nameLocal: entry.nameLocal ?? null, description: entry.description, parentId },
      create: { name: entry.name, nameLocal: entry.nameLocal ?? null, description: entry.description, parentId },
      select: { id: true },
    })
    ethnicityIds.set(entry.name, row.id)
  }
  console.log(`  ✅ 민족 ${ETHNICITIES.length}`)

  /* 2) 집단·국가 */
  const countryIds = new Map<string, string>()
  let created = 0
  for (const entry of ENTRIES) {
    const data = {
      enName: entry.enName,
      description: entry.description,
      startEra: entry.startYear != null ? Era.AD : null,
      startYear: entry.startYear,
      endEra: entry.endYear != null ? Era.AD : null,
      endYear: entry.endYear,
      stateType: entry.stateType,
      entityKind: entry.entityKind,
      latitude: entry.latitude ?? null,
      longitude: entry.longitude ?? null,
      ethnicities: { connect: [{ id: ethnicityIds.get(entry.ethnicity)! }] },
    }
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
      select: { id: true },
    })
    if (existing) {
      await prisma.historicalCountry.update({ where: { id: existing.id }, data })
      countryIds.set(entry.name, existing.id)
    } else {
      const row = await prisma.historicalCountry.create({
        data: { name: entry.name, accountId: ACCOUNT_ID, ...data },
        select: { id: true },
      })
      countryIds.set(entry.name, row.id)
      created++
    }
  }
  console.log(`  ✅ 집단·국가 신규 ${created} · 갱신 ${ENTRIES.length - created}`)

  const idOf = async (name: string): Promise<string> => {
    const cached = countryIds.get(name)
    if (cached) return cached
    const row = await prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } })
    if (!row) throw new Error(`역사 국가를 찾을 수 없습니다: ${name}`)
    countryIds.set(name, row.id)
    return row.id
  }

  for (const link of LINKED_STATES) {
    await prisma.historicalCountry.update({
      where: { id: await idOf(link.name) },
      data: { ethnicities: { connect: [{ id: ethnicityIds.get(link.ethnicity)! }] } },
    })
  }

  /* 3) 전환 — 집단이 정착·통합해 왕국이 됨 */
  for (const transition of TRANSITIONS) {
    const predecessorId = await idOf(transition.from)
    const successorId = await idOf(transition.to)
    const existing = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId, successorId },
      select: { id: true },
    })
    const data = { eventType: transition.type, transitionScope: TransitionScope.STATE_SUCCESSION }
    if (existing) await prisma.historicalCountryTransition.update({ where: { id: existing.id }, data })
    else await prisma.historicalCountryTransition.create({ data: { predecessorId, successorId, ...data } })
  }
  console.log(`  ✅ 전환 ${TRANSITIONS.length}`)

  /* 4) 종속·동맹부족 관계 */
  for (const membership of MEMBERSHIPS) {
    const historicalCountryId = await idOf(membership.parent)
    const memberCountryId = await idOf(membership.member)
    const data = { ...periodColumns('start', membership.start), ...periodColumns('end', membership.end) }
    const existing = await prisma.historicalCountryMembership.findFirst({
      where: { historicalCountryId, memberCountryId, role: membership.role },
      select: { id: true },
    })
    if (existing) await prisma.historicalCountryMembership.update({ where: { id: existing.id }, data })
    else
      await prisma.historicalCountryMembership.create({
        data: { historicalCountryId, memberCountryId, role: membership.role, ...data },
      })
  }
  console.log(`  ✅ 종속·동맹부족 ${MEMBERSHIPS.length}`)

  /* 5) 아틸라 — 주 국적 교정(로마 왕국으로 잘못 들어가 있었다) + 훈 제국 재위 */
  const hunEmpireId = await idOf('훈 제국')
  const attila = await prisma.person.findFirst({ where: { name: '아틸라', surname: '훈' }, select: { id: true } })
  if (attila) {
    await prisma.person.update({ where: { id: attila.id }, data: { historicalCountryId: hunEmpireId } })
    const reignData = {
      regnalName: '아틸라',
      startEra: Era.AD,
      startYear: 434,
      startDatePrecision: 'year',
      endEra: Era.AD,
      endYear: 453,
      endDatePrecision: 'year',
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      notes: '434~445 형 블레다와 공동 통치, 445년부터 단독 군주. 453년 혼인 첫날밤 급사.',
    }
    const reign = await prisma.sovereignReign.findFirst({
      where: { personId: attila.id, historicalCountryId: hunEmpireId },
      select: { id: true },
    })
    if (reign) await prisma.sovereignReign.update({ where: { id: reign.id }, data: reignData })
    else
      await prisma.sovereignReign.create({
        data: { personId: attila.id, historicalCountryId: hunEmpireId, accountId: ACCOUNT_ID, ...reignData },
      })
    console.log('  ✅ 아틸라 국적·재위')
  } else {
    console.log('  ⚠️ 아틸라 인물 없음 — 재위 생략')
  }

  /* 6) 사건 참여국 — 빠져 있던 상대편 */
  for (const plan of EVENT_PARTICIPANTS) {
    const event = await prisma.event.findFirst({
      where: { title: plan.eventTitle, deletedAt: null },
      select: { id: true },
    })
    if (!event) {
      console.log(`  ⚠️ 사건 없음: ${plan.eventTitle}`)
      continue
    }
    for (const fix of plan.replace ?? []) {
      const fromId = await idOf(fix.from)
      const toId = await idOf(fix.to)
      const wrong = await prisma.eventCountryRelation.findFirst({
        where: { eventId: event.id, historicalCountryId: fromId },
        select: { id: true },
      })
      const already = await prisma.eventCountryRelation.findFirst({
        where: { eventId: event.id, historicalCountryId: toId },
        select: { id: true },
      })
      if (wrong && !already) {
        await prisma.eventCountryRelation.update({ where: { id: wrong.id }, data: { historicalCountryId: toId } })
      }
    }
    for (const row of plan.rows) {
      const historicalCountryId = await idOf(row.country)
      const existing = await prisma.eventCountryRelation.findFirst({
        where: { eventId: event.id, historicalCountryId },
        select: { id: true },
      })
      if (existing) {
        await prisma.eventCountryRelation.update({
          where: { id: existing.id },
          data: { role: row.role, roleDescription: row.description },
        })
        continue
      }
      const last = await prisma.eventCountryRelation.aggregate({
        where: { eventId: event.id },
        _max: { sortOrder: true },
        _count: true,
      })
      await prisma.eventCountryRelation.create({
        data: {
          eventId: event.id,
          historicalCountryId,
          role: row.role,
          roleDescription: row.description,
          sortOrder: last._count === 0 ? 0 : (last._max.sortOrder ?? 0) + 1,
        },
      })
    }
    console.log(`  ✅ ${plan.eventTitle}`)
  }

  console.log('🏕️ 민족 이동기 행위자 시딩 완료')
}
