/**
 * 크림 전쟁 (Crimean War, 1853~1856) 시드
 *
 * 부모 사건: 크림 전쟁 (1853-10-16 ~ 1856-03-30 파리 조약)
 * 자식 사건:
 *   - 시노프 해전 (1853-11-30) — 영·프 참전의 도화선
 *   - 알마 전투 (1854-09-20) — 연합군 크림 상륙 후 첫 회전
 *   - 발라클라바 전투 (1854-10-25) — 경기병여단의 돌격
 *   - 세바스토폴 공방전 (1854-10-17 ~ 1855-09-09) — 전쟁의 핵심
 *
 * 등록 항목:
 *  - Event x5 (부모 + 자식 4)
 *  - EventSection x3 (배경/경과/전후)
 *  - EventCountryRelation x5 (러시아 INITIATOR / 오스만·프랑스·영국 ADVERSARY / 사르데냐 ALLY)
 *  - EventSide x2 (동맹국 측 COALITION / 러시아 측 COUNTRY) + 참여국 진영 소속 + 병력·사상자 측정값(Observation) — data/event-sides.legacy-five-wars.ts
 *  - MilitaryDetailsNorm (CombatType LAND + NAVAL)
 *  - PersonEvent (나폴레옹 3세·비토리오 에마누엘레 2세·카보우르·파머스턴·니콜라이 1세·알렉산드르 2세 — 존재 시)
 *
 * 의존: seedEventCategories('전쟁/군사') + 역사국가(러시아 제국·오스만 제국·프랑스 제2제국·
 *       그레이트브리튼 및 아일랜드 연합왕국·사르데냐 왕국).
 */
import {
  CombatType,
  ConflictType,
  EventCountryRole,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'
import { LEGACY_FIVE_WAR_SIDES, LEGACY_FIVE_WAR_SOURCE } from './data/event-sides.legacy-five-wars'
import { applyEventSides } from './lib/event-sides'

const EVENT_CATEGORY_NAME = '전쟁/군사'

// ── 자식 사건 ────────────────────────────────────────────────────────────────
interface ChildEventInput {
  title: string
  start: string
  end?: string
  endPrecision?: 'day' | 'month' | 'year'
  location: string
  description: string
  background: string
  aftermath: string
  keywords: string[]
}

const CHILD_EVENTS: ChildEventInput[] = [
  {
    title: '시노프 해전',
    start: '1853-11-30',
    location: '흑해 시노프(Sinop, 오스만 아나톨리아 북안)',
    description:
      '1853년 11월 30일 파벨 나히모프 제독이 이끄는 러시아 흑해 함대가 시노프 항에 정박한 오스만 분함대를 기습·전멸시킨 해전. 폭발탄(셸)의 위력이 입증된 마지막 대규모 범선 해전 중 하나다.',
    background:
      '오스만이 1853-10 러시아에 선전포고한 직후, 러시아 흑해 함대가 흑해 제해권을 노려 오스만 해안을 봉쇄·공격했다.',
    aftermath:
      '오스만 함선 약 12척이 파괴되고 수천 명이 전사했다. 영국·프랑스 여론은 이를 "시노프 학살"로 규탄했고, 양국이 흑해에 함대를 파견해 1854-03 러시아에 선전포고하는 직접적 계기가 되었다.',
    keywords: ['시노프 해전', '나히모프', '흑해 함대', '폭발탄', '영프 참전'],
  },
  {
    title: '알마 전투',
    start: '1854-09-20',
    location: '크림 반도 알마 강(Alma River)',
    description:
      '1854년 9월 20일 크림 반도에 상륙한 영·프·오스만 연합군이 알마 강변에 포진한 멘시코프의 러시아군을 격파한 첫 대회전. 세바스토폴로 가는 길을 열었다.',
    background:
      '연합군은 1854-09 예브파토리아 인근에 상륙해 세바스토폴 요새를 향해 남진했고, 멘시코프가 알마 강 고지에서 방어선을 폈다.',
    aftermath:
      '연합군이 고지를 탈취하며 승리했으나 추격이 늦어 러시아군 주력이 세바스토폴로 후퇴했다. 곧이어 세바스토폴 포위가 시작된다.',
    keywords: ['알마 전투', '크림 상륙', '멘시코프', '세바스토폴 진격'],
  },
  {
    title: '발라클라바 전투',
    start: '1854-10-25',
    location: '크림 반도 발라클라바(Balaklava)',
    description:
      '1854년 10월 25일 세바스토폴 포위 중 러시아군이 연합군 보급항 발라클라바를 노려 벌인 전투. 영국 "경기병여단의 돌격(Charge of the Light Brigade)"과 "가느다란 붉은 선(Thin Red Line)"으로 유명하다.',
    background:
      '러시아군은 연합군의 보급 거점인 발라클라바 항을 탈취해 포위를 풀려 했다. 영국 기병·하일랜드 보병이 방어를 맡았다.',
    aftermath:
      '명령 전달 착오로 영국 경기병여단이 포대 정면으로 무모하게 돌격해 큰 손실을 입었다 — 테니슨의 시 「경기병여단의 돌격」의 소재가 되었다. 전술적으로는 무승부였으나 연합군은 보급항을 지켰다.',
    keywords: ['발라클라바 전투', '경기병여단의 돌격', '가느다란 붉은 선', '테니슨', '라글란'],
  },
  {
    title: '세바스토폴 공방전',
    start: '1854-10-17',
    end: '1855-09-09',
    location: '크림 반도 세바스토폴(Sevastopol) 요새',
    description:
      '1854년 10월부터 1855년 9월까지 약 11개월간 이어진 크림 전쟁의 핵심 공방전. 연합군이 러시아 흑해 함대의 모항 세바스토폴을 포위·포격했고, 토틀레벤의 야전 축성으로 러시아가 끈질기게 방어했다.',
    background:
      '알마 전투 후 연합군이 세바스토폴 남쪽에 진을 치고 1854-10-17 1차 대포격을 개시했다. 러시아는 함대를 자침시켜 항구를 막고 시가를 요새화했다.',
    aftermath:
      '1855-09-08 프랑스군이 핵심 보루 말라코프(Malakoff)를 점령하자 러시아군은 도시를 버리고 철수, 9월 9일 세바스토폴이 함락되었다. 이로써 전쟁의 승패가 결정되어 파리 강화회의로 이어졌다. 방어 지휘관 나히모프 제독은 포위 중 전사했다.',
    keywords: ['세바스토폴 공방전', '말라코프 보루', '토틀레벤', '나히모프', '참호전'],
  },
]

// ── PersonEvent 연결 후보 (존재 시에만) ───────────────────────────────────────
const PERSON_LINKS: { originalName: string; role: string; note: string }[] = [
  {
    originalName: 'Napoleon III',
    role: '프랑스 제2제국 황제',
    note: '최대 파병국 프랑스의 참전을 주도. 세바스토폴 함락으로 군사적 위신을 높였고 파리 강화회의를 주재했다.',
  },
  {
    originalName: 'Vittorio Emanuele II of Italy',
    role: '사르데냐 왕국 국왕',
    note: '카보우르의 건의를 받아들여 사르데냐군을 파병(1855).',
  },
  {
    originalName: 'Camillo Benso, Count of Cavour',
    role: '사르데냐 왕국 총리',
    note: '직접적 국익보다 파리 강화회의 참석권을 얻어 "이탈리아 문제"를 국제화하려는 포석으로 파병을 결정.',
  },
  {
    originalName: 'Henry John Temple',
    role: '영국 총리(1855~)·전쟁 지도',
    note: '애버딘 내각의 전쟁 수행 부실로 1855-02 총리에 올라 전쟁을 매듭짓고 파리 조약으로 강화했다.',
  },
  {
    originalName: 'Nicholas I of Russia',
    role: '러시아 황제 (개전)',
    note: '오스만 압박·흑해 남하 정책으로 개전했으나 전황이 악화되던 1855-03 전쟁 중 사망.',
  },
  {
    originalName: 'Alexander II of Russia',
    role: '러시아 황제 (강화)',
    note: '1855-03 즉위해 세바스토폴 함락 후 전쟁을 수습, 파리 조약으로 강화. 패전의 충격은 1861 농노해방 등 대개혁의 동인이 되었다.',
  },
]

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
async function hcId(prisma: PrismaService, name: string): Promise<string | null> {
  const hc = await prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } })
  return hc?.id ?? null
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedCrimeanWar(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️  크림 전쟁(1853-1856) 시딩 시작...')

  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  사건 카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const russiaHC = await hcId(prisma, '러시아 제국')
  if (!russiaHC) {
    console.warn('  ⚠️  역사 국가 \'러시아 제국\' 미존재 — 시딩 중단')
    return
  }

  // ── 1) 부모 사건 ─────────────────────────────────────────────────────────
  const TITLE = '크림 전쟁'
  let parentEvent = await prisma.event.findFirst({
    where: { title: TITLE, startDate: new Date('1853-10-16'), deletedAt: null },
  })

  if (parentEvent) {
    console.log(`  ⏭️  이미 존재: ${TITLE} (id=${parentEvent.id})`)
  } else {
    parentEvent = await prisma.event.create({
      data: {
        title: TITLE,
        description:
          '1853년 10월 ~ 1856년 3월, 러시아 제국과 오스만 제국·프랑스 제2제국·영국·사르데냐 왕국 연합 사이에 ' +
          '벌어진 전쟁. 흑해·발칸을 둘러싼 러시아의 남하와 "동방문제"가 배경이며, 주 전장은 크림 반도 세바스토폴이었다. ' +
          '약 11개월의 세바스토폴 공방전 끝에 연합군이 승리, 1856년 파리 조약으로 흑해가 중립화되었다. 전사자보다 ' +
          '콜레라·티푸스 등 질병 사망자가 훨씬 많아 근대 군 의료·간호(나이팅게일) 개혁을 촉발한 전쟁이기도 하다.',
        startDate: new Date('1853-10-16'),
        startDatePrecision: 'day',
        endDate: new Date('1856-03-30'),
        endDatePrecision: 'day',
        location: '크림 반도(세바스토폴)·흑해·다뉴브 공국·캅카스·발트해',
        categoryId: category.id,
        historicalCountryId: russiaHC,
        background:
          '쇠퇴하는 오스만 제국("유럽의 병자")을 둘러싼 열강의 "동방문제"가 배경이다. 러시아 니콜라이 1세는 ' +
          '오스만 내 정교도 보호권을 요구하고 1853년 7월 다뉴브 공국(몰다비아·왈라키아)을 점령했다. 오스만이 ' +
          '1853-10 선전포고하고, 11월 시노프 해전에서 러시아 함대가 오스만 분함대를 전멸시키자 영국·프랑스가 ' +
          '러시아의 지중해 진출과 세력 균형 붕괴를 우려해 1854-03 참전했다.',
        aftermath:
          '1855-09 세바스토폴 함락으로 승패가 결정되고, 1856-03-30 파리 조약으로 종전했다. (1)흑해 중립화 — ' +
          '러시아·오스만의 흑해 함대·군항 보유 금지 (2)다뉴브 공국·세르비아의 자치 보장, 오스만 영토 보전 ' +
          '(3)러시아의 발칸 남하 좌절. 빈 체제(1815)의 협조 외교가 무너지고, 러시아·오스트리아 관계가 파탄나 ' +
          '이후 이탈리아·독일 통일의 외교적 공간이 열렸다. 패전한 러시아는 1861 농노해방을 비롯한 대개혁에 ' +
          '나섰고, 사르데냐는 파리 회의 참석으로 통일의 발판을 얻었다.',
        keywords: [
          '크림 전쟁',
          '동방문제',
          '세바스토폴 공방전',
          '발라클라바 전투',
          '경기병여단의 돌격',
          '시노프 해전',
          '흑해 중립화',
          '파리 조약',
          '나이팅게일',
          '니콜라이 1세',
          '나히모프',
          '러시아',
        ] as any,
        warCost:
          '양측 총사망 약 70만~75만 추정(전투 사망보다 콜레라·티푸스 등 질병 사망이 다수). 러시아 약 45만, ' +
          '프랑스 약 10만, 오스만 약 15만 이상, 영국 약 2만 이상, 사르데냐 약 2천.',
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${parentEvent.id})`)
  }

  // ── 2) 자식 사건 ─────────────────────────────────────────────────────────
  for (const ce of CHILD_EVENTS) {
    const exists = await prisma.event.findFirst({
      where: {
        title: ce.title,
        startDate: new Date(ce.start),
        parentEventId: parentEvent.id,
        deletedAt: null,
      },
    })
    if (exists) {
      console.log(`  ⏭️  자식 사건 스킵: ${ce.title}`)
      continue
    }
    await prisma.event.create({
      data: {
        title: ce.title,
        description: ce.description,
        startDate: new Date(ce.start),
        startDatePrecision: 'day',
        endDate: ce.end ? new Date(ce.end) : null,
        endDatePrecision: ce.end ? (ce.endPrecision ?? 'day') : null,
        location: ce.location,
        categoryId: category.id,
        historicalCountryId: russiaHC,
        parentEventId: parentEvent.id,
        background: ce.background,
        aftermath: ce.aftermath,
        keywords: ce.keywords as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 자식 사건: ${ce.title}`)
  }

  // ── 3) EventSection (부모) ─────────────────────────────────────────────────
  const SECTIONS: Array<{ title: string; content: string; order: number; sectionType: string }> = [
    {
      order: 1,
      title: '개전 배경 — 동방문제',
      sectionType: 'background',
      content: `<p>쇠퇴하는 오스만 제국("유럽의 병자")을 둘러싼 열강의 이해 충돌 — "동방문제"가 전쟁의 뿌리다.</p>
<ul>
  <li><strong>성지 관할권 분쟁</strong>: 예루살렘 성지의 관리권을 둘러싸고 가톨릭(프랑스 후원)과 정교회(러시아 후원)가 대립.</li>
  <li><strong>러시아의 요구</strong>: 니콜라이 1세가 오스만 내 정교도 보호권을 요구하고, 1853년 7월 다뉴브 공국(몰다비아·왈라키아)을 점령.</li>
  <li><strong>오스만의 선전포고</strong>: 영국의 지지를 등에 업은 오스만이 1853-10 러시아에 선전포고.</li>
  <li><strong>시노프 해전(1853-11-30)</strong>: 러시아 흑해 함대가 오스만 분함대를 전멸 → 영·프 여론 격앙.</li>
  <li><strong>영·프 참전(1854-03)</strong>: 러시아의 지중해 진출·세력 균형 붕괴를 우려한 영국·프랑스가 참전.</li>
</ul>`,
    },
    {
      order: 2,
      title: '전쟁 경과',
      sectionType: 'process',
      content: `<p>다뉴브·캅카스·발트해에서도 전투가 있었으나, 전쟁의 중심은 크림 반도의 세바스토폴 요새였다.</p>
<ol>
  <li>1853-11-30 시노프 해전 — 러시아 흑해 함대의 승리, 영·프 참전의 도화선.</li>
  <li>1854-03-27/28 프랑스·영국, 러시아에 선전포고.</li>
  <li>1854-09 연합군 크림 반도 상륙.</li>
  <li>1854-09-20 알마 전투 — 연합군 승리, 세바스토폴 진격.</li>
  <li>1854-10-17 세바스토폴 1차 대포격 — 약 11개월 공방전 시작.</li>
  <li>1854-10-25 발라클라바 전투 — "경기병여단의 돌격".</li>
  <li>1854-11-05 인케르만 전투 — 러시아의 포위 돌파 시도 실패.</li>
  <li>1855-01-26 사르데냐 왕국 참전.</li>
  <li>1855-03-02 니콜라이 1세 사망 → 알렉산드르 2세 즉위.</li>
  <li>1855-09-08~09 말라코프 보루 함락 → 세바스토폴 함락. 승패 결정.</li>
</ol>`,
    },
    {
      order: 3,
      title: '전후 처리와 영향',
      sectionType: 'aftermath',
      content: `<p>1856-03-30 파리 조약으로 종전되었다.</p>
<ul>
  <li><strong>흑해 중립화</strong>: 러시아·오스만 모두 흑해에 함대·군항을 둘 수 없게 됨(러시아는 1870년 보불전쟁의 혼란을 틈타 일방 파기, 1871년 런던 회의로 추인).</li>
  <li><strong>오스만 영토 보전·다뉴브 공국 자치</strong>: 러시아의 발칸 남하 좌절. 몰다비아·왈라키아는 후일 루마니아로 통합.</li>
  <li><strong>빈 체제의 붕괴</strong>: 열강 협조 체제가 무너지고 러시아·오스트리아 관계가 파탄 — 이탈리아·독일 통일의 외교적 공간이 열림.</li>
  <li><strong>러시아 대개혁</strong>: 패전의 충격으로 알렉산드르 2세가 1861 농노해방 등 근대화 개혁에 착수.</li>
  <li><strong>사르데냐의 발판</strong>: 카보우르가 파리 회의 참석권을 얻어 "이탈리아 문제"를 국제화.</li>
  <li><strong>근대 간호·군 의료</strong>: 플로렌스 나이팅게일의 활동으로 야전 위생·간호 체계가 획기적으로 개선.</li>
</ul>`,
    },
  ]
  for (const s of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId: parentEvent.id, title: s.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${s.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: parentEvent.id,
        title: s.title,
        content: s.content,
        order: s.order,
        sectionType: s.sectionType,
      },
    })
    console.log(`    ✅ 섹션: ${s.title}`)
  }

  // ── 4) EventCountryRelation ────────────────────────────────────────────────
  const RELATIONS: { name: string; role: EventCountryRole; desc: string }[] = [
    {
      name: '러시아 제국',
      role: EventCountryRole.INITIATOR,
      desc: '다뉴브 공국 점령·시노프 해전으로 전쟁을 촉발한 주(主) 교전국. 세바스토폴을 잃고 패전.',
    },
    {
      name: '오스만 제국',
      role: EventCountryRole.PARTICIPANT,
      desc: '러시아 압박의 직접 대상이자 1853-10 단독 개전한 당사국.',
    },
    {
      name: '프랑스 제2제국',
      role: EventCountryRole.PARTICIPANT,
      desc: '최대 파병국. 세바스토폴 말라코프 보루를 함락시켜 종전을 견인.',
    },
    {
      name: '그레이트브리튼 및 아일랜드 연합왕국',
      role: EventCountryRole.PARTICIPANT,
      desc: '러시아의 남하 차단을 위해 참전한 주력국.',
    },
    {
      name: '사르데냐 왕국',
      role: EventCountryRole.PARTICIPANT,
      desc: '1855 가세한 후발 동맹국. 통일 외교의 포석으로 파병.',
    },
  ]
  for (const r of RELATIONS) {
    const id = await hcId(prisma, r.name)
    if (!id) {
      console.warn(`    ⚠️  역사 국가 미존재: ${r.name}`)
      continue
    }
    const exists = await prisma.eventCountryRelation.findFirst({
      where: { eventId: parentEvent.id, historicalCountryId: id },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵: ${r.name}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: parentEvent.id,
        historicalCountryId: id,
        role: r.role,
        roleDescription: r.desc,
      },
    })
    console.log(`    ✅ 국가관계: ${r.name} (${r.role})`)
  }

  // ── 5) 진영·소속·병력/사상자 측정값 (D1·D3) ──────────────────
  // 정본은 seeds/data/event-sides.legacy-five-wars.ts — 진영 이관 스크립트와 같은 데이터
  const sideResult = await applyEventSides(
    prisma,
    parentEvent.id,
    LEGACY_FIVE_WAR_SIDES['크림 전쟁'],
    LEGACY_FIVE_WAR_SOURCE,
  )
  console.log(
    `    ✅ 진영 ${sideResult.sides} · 소속 ${sideResult.members} · 측정값 ${sideResult.observations}`,
  )

  // ── 6) MilitaryDetailsNorm ─────────────────────────────────────────────────
  const milExists = await prisma.militaryDetailsNorm.findUnique({
    where: { eventId: parentEvent.id },
  })
  if (!milExists) {
    const md = await prisma.militaryDetailsNorm.create({
      data: {
        eventId: parentEvent.id,
        conflictType: ConflictType.WAR,
        objective:
          '러시아: 흑해·발칸 남하와 오스만 내 정교도 보호권 확보. 연합국: 러시아의 지중해 진출 저지와 오스만 영토 보전, 유럽 세력 균형 유지.',
        tactics:
          '라이플 머스킷(미니에탄)의 보급으로 보병 사거리가 비약했고, 세바스토폴에서는 야전 축성과 참호전이 전개되어 후일 1차 대전 참호전을 예고. 증기 군함·폭발탄·전신·철도가 본격 투입된 첫 "근대전".',
        strategy:
          '연합국은 크림 반도 상륙으로 러시아 흑해 함대의 모항 세바스토폴을 직접 공략. 러시아는 광대한 영토와 보급 거리에 의존했으나 도로·철도 미비로 보급에 실패했다.',
        outcome:
          '연합국의 승리. 약 11개월 공방전 끝에 1855-09 세바스토폴 함락으로 승패가 결정되어 강화에 이름.',
        territoryChanges:
          '영토 변경은 작음 — 다뉴브 공국에서 러시아 철수, 베사라비아 남부를 몰다비아에 반환. 핵심은 영토가 아니라 "흑해 중립화"라는 군사적 제약이었다.',
        treaty: '파리 조약(Treaty of Paris, 1856-03-30)',
        strategicImpact:
          '빈 체제(1815)의 협조 외교가 붕괴하고 러시아·오스트리아 동맹이 파탄나, 이탈리아·독일 통일의 외교적 공간이 열렸다. 패전한 러시아는 1861 농노해방 등 대개혁에 착수했고, 사르데냐는 파리 회의 참석으로 통일의 발판을 얻었다. 플로렌스 나이팅게일의 활동으로 근대 간호·군 의료가 탄생했다.',
      },
    })
    for (const ct of [CombatType.LAND, CombatType.NAVAL]) {
      await prisma.militaryDetailsCombatType.create({
        data: { militaryDetailsId: md.id, combatType: ct },
      })
    }
    console.log(`    ✅ 군사 상세: ${TITLE}`)
  } else {
    console.log(`    ⏭️  군사 상세 스킵: ${TITLE}`)
  }

  // ── 7) PersonEvent (존재하는 인물만 연결) ──────────────────────────────────
  for (const pl of PERSON_LINKS) {
    const person = await prisma.person.findFirst({
      where: { originalName: pl.originalName },
      select: { id: true },
    })
    if (!person) {
      console.log(`    ⏭️  인물 미존재(연결 생략): ${pl.originalName}`)
      continue
    }
    const exists = await prisma.personEvent.findFirst({
      where: { personId: person.id, eventId: parentEvent.id },
    })
    if (exists) {
      console.log(`    ⏭️  인물연결 스킵: ${pl.originalName}`)
      continue
    }
    await prisma.personEvent.create({
      data: {
        personId: person.id,
        eventId: parentEvent.id,
        role: pl.role,
        note: pl.note,
      },
    })
    console.log(`    ✅ 인물연결: ${pl.originalName} (${pl.role})`)
  }

  console.log('✅ 크림 전쟁 시딩 완료\n')
}
