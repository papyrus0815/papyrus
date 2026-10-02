/**
 * 보오전쟁 (Austro-Prussian War / Seven Weeks' War, 1866) 시드
 *
 * 부모 사건: 보오전쟁 (1866-06-14 ~ 1866-08-23)
 * 자식 사건: 쾨니히그레츠 전투 (1866-07-03)
 *
 * 등록 항목:
 *  - Event x2 (부모/자식)
 *  - EventSection (배경/전개/결과)
 *  - EventCountryRelation (참전국 — 매핑 가능한 역사 국가 우선, 오스트리아만 현대 country fallback)
 *  - EventSide x2 (프로이센 측 / 오스트리아 측) + 참여국 진영 소속 + 병력·사상자 측정값(Observation) — data/event-sides.legacy-five-wars.ts
 *  - MilitaryDetailsNorm (전쟁/전투 상세)
 *
 * 매핑되지 않는 점:
 *  - 오스트리아 제국(1804–1867) historicalCountry는 아직 시드에 없어 현대 country '오스트리아'로 매핑.
 *    추후 오스트리아 historicalCountry 시드 추가 시 마이그레이션 권장.
 */
import { EventCountryRole, ConflictType, CombatType, ParticipationType } from '@prisma/client'

import { PrismaService } from '../prisma.service'
import { LEGACY_FIVE_WAR_SIDES, LEGACY_FIVE_WAR_SOURCE } from './data/event-sides.legacy-five-wars'
import { applyEventSides } from './lib/event-sides'

const EVENT_CATEGORY_NAME = '전쟁/군사'

const COUNTRY_RELATION_ROLE_MAP: Record<string, EventCountryRole> = {
  주도국: EventCountryRole.INITIATOR,
  '동맹국 (남부 전선)': EventCountryRole.PARTICIPANT,
  독일연방: EventCountryRole.PARTICIPANT,
  '독일연방 동맹국': EventCountryRole.PARTICIPANT,
}

export async function seedAustroPrussianWar(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n⚔️  보오전쟁(1866) 시딩 시작...')

  // ── 사전 의존성 조회 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
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

  const prussiaHC = await prisma.historicalCountry.findFirst({
    where: { name: '프로이센 왕국' },
    select: { id: true },
  })
  if (!prussiaHC) {
    console.warn('  ⚠️  역사 국가 \'프로이센 왕국\' 미존재 — 시딩 중단')
    return
  }

  // ── 1) 부모 사건 등록(또는 조회) ───────────────────────────────────────
  const TITLE = '보오전쟁'

  let parentEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date('1866-06-14'),
      deletedAt: null,
    },
  })

  if (parentEvent) {
    console.log(`  ⏭️  이미 존재: ${TITLE} (id=${parentEvent.id})`)
  } else {
    parentEvent = await prisma.event.create({
      data: {
        title: TITLE,
        description:
          '1866년 6월 14일 ~ 8월 23일, 독일연방 패권을 두고 프로이센 왕국과 오스트리아 제국이 충돌한 7주 전쟁. 프로이센이 압승해 독일연방이 해체되고 북독일 연방이 성립, 1871년 독일 통일의 결정적 발판이 되었다.',
        startDate: new Date('1866-06-14'),
        startDatePrecision: 'day',
        endDate: new Date('1866-08-23'),
        endDatePrecision: 'day',
        location: '보헤미아·실레지아·이탈리아 베네토·아드리아해',
        categoryId: category.id,
        historicalCountryId: prussiaHC.id,
        background:
          '1864년 프로이센·오스트리아 연합으로 덴마크를 격파(슐레스비히-홀슈타인 전쟁)한 후 양국은 가슈타인 협약(1865)으로 슐레스비히는 프로이센, 홀슈타인은 오스트리아가 통치하기로 합의했다. 그러나 비스마르크는 독일연방 내 프로이센의 주도권을 위해 의도적으로 협약을 흔들었고, 1866년 6월 9일 프로이센이 홀슈타인에 진주하자 오스트리아는 6월 14일 연방의회에서 대(對)프로이센 동원안을 가결시켰다. 비스마르크는 이미 4월 8일 이탈리아 왕국과 비밀 동맹을 체결, 남부 전선을 분산시킬 준비를 마쳐두고 있었다.',
        aftermath:
          '쾨니히그레츠(7/3) 결정적 승리 후 8월 23일 프라하 조약으로 종결. 독일연방이 공식 해체되었고, 프로이센은 슐레스비히-홀슈타인·하노버·헤센-카셀·나사우·프랑크푸르트 자유시를 합병하였다. 오스트리아 이북 22개 국가가 북독일 연방(1867)으로 재편되었으며, 이는 1871년 독일 제국 성립의 직접적 전신이 되었다. 베네토는 프란츠 요제프가 나폴레옹 3세에게 양도한 후 이탈리아에 인계, 이탈리아 통일의 한 단계가 진전되었다. 오스트리아는 독일 정치에서 배제되어 이듬해 오스트리아-헝가리 이중제국(1867)으로 재편되었다.',
        keywords: [
          '보오전쟁',
          '7주전쟁',
          '독일통일',
          '비스마르크',
          '몰트케',
          '쾨니히그레츠',
          '프라하 조약',
          '독일연방 해체',
          '북독일 연방',
        ] as any,
        warCost:
          '프로이센 약 1.95억 탈러, 오스트리아 약 5억 굴덴 (직간접 동원 비용 포함, 추산)',
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${parentEvent.id})`)
  }

  // ── 2) 자식 사건 — 쾨니히그레츠 전투 ────────────────────────────────────
  const CHILD_TITLE = '쾨니히그레츠 전투'
  let childEvent = await prisma.event.findFirst({
    where: {
      title: CHILD_TITLE,
      startDate: new Date('1866-07-03'),
      parentEventId: parentEvent.id,
      deletedAt: null,
    },
  })

  if (childEvent) {
    console.log(`  ⏭️  이미 존재: ${CHILD_TITLE} (id=${childEvent.id})`)
  } else {
    childEvent = await prisma.event.create({
      data: {
        title: CHILD_TITLE,
        description:
          '1866년 7월 3일 보헤미아 쾨니히그레츠(현 흐라데츠 크랄로베) 인근에서 벌어진 보오전쟁의 결정적 회전. 프로이센 3개 군 약 22만이 오스트리아·작센 연합군 약 21만을 격파하여 7주 전쟁의 향방을 단번에 결정지었다.',
        startDate: new Date('1866-07-03'),
        startDatePrecision: 'day',
        endDate: new Date('1866-07-03'),
        endDatePrecision: 'day',
        location: '보헤미아 쾨니히그레츠 (흐라데츠 크랄로베) 인근',
        categoryId: category.id,
        historicalCountryId: prussiaHC.id,
        parentEventId: parentEvent.id,
        background:
          '몰트케는 철도와 전신을 활용해 3개 군(엘베군·제1군·제2군)을 다른 경로로 보헤미아에 진입시켰다. 베네데크는 비스트라 강 서편 고지대에 진을 쳤으나 합류 직전 정찰 실패로 프로이센 3개 군의 협격을 허용했다.',
        aftermath:
          '오스트리아군 사망·부상·포로 약 4만 4천명, 프로이센군 사상 약 9천명. 베네데크 군은 전투 능력을 상실하고 빈으로 후퇴했고 프란츠 요제프는 즉각 화평을 모색하기 시작했다. 7월 22일 니콜스부르크 가조약이 체결되며 사실상 전쟁이 끝났다.',
        keywords: ['쾨니히그레츠', '사도와 전투', '몰트케', '베네데크', '보오전쟁'] as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${CHILD_TITLE} (id=${childEvent.id})`)
  }

  // ── 3) EventSection (부모 사건) ─────────────────────────────────────────
  const SECTIONS: Array<{ title: string; content: string; order: number; sectionType?: string }> = [
    {
      order: 1,
      title: '개전 배경',
      sectionType: 'background',
      content: `<p>1864년 덴마크 전쟁의 결과로 슐레스비히-홀슈타인을 공동 점령하게 된 프로이센과 오스트리아는 1865년 가슈타인 협약으로 분할 통치를 시작했다. 그러나 양국 간의 패권 경쟁은 곧 표면화되었다.</p>
<ul>
  <li><strong>외교 포위</strong>: 비스마르크는 1866년 4월 8일 이탈리아와 비밀 동맹을 체결, 베네치아 회복 약속과 함께 양면 전쟁 구도를 구축.</li>
  <li><strong>나폴레옹 3세 중립화</strong>: 라인 좌안 양보 가능성을 암시하며 프랑스의 중립을 확보.</li>
  <li><strong>러시아 묵인</strong>: 1863년 1월 봉기 진압 협조의 채무를 활용해 알렉산드르 2세의 묵인을 확보.</li>
  <li><strong>도화선</strong>: 6월 9일 프로이센군이 홀슈타인에 진주하자 6월 14일 연방의회가 동원안 가결.</li>
</ul>`,
    },
    {
      order: 2,
      title: '전쟁 경과',
      sectionType: 'process',
      content: `<p>몰트케는 철도와 전신을 활용해 외선(外線) 작전을 구사했다. 3개 군이 서로 다른 경로로 보헤미아로 집결하여 7월 3일 쾨니히그레츠에서 합류, 단번에 오스트리아 북부군을 격파했다.</p>
<ol>
  <li>6월 15일~22일: 프로이센군이 작센·하노버를 점령. 랑엔잘차 전투(6/27)에서 하노버군 항복.</li>
  <li>6월 24일: 쿠스토자 전투에서 오스트리아군이 이탈리아군을 격퇴 (남부 전선).</li>
  <li>6월 27일~29일: 트라우테나우·나호드 전투 — 보헤미아 진입 과정의 전초전.</li>
  <li><strong>7월 3일: 쾨니히그레츠(사도와) 결정적 승리</strong> — 오스트리아 북부군 붕괴.</li>
  <li>7월 20일: 리사 해전에서 오스트리아 해군이 이탈리아 해군 격파.</li>
  <li>7월 22일: 니콜스부르크 가조약.</li>
  <li>8월 23일: 프라하 조약 체결 — 종전.</li>
</ol>`,
    },
    {
      order: 3,
      title: '전후 처리와 영향',
      sectionType: 'aftermath',
      content: `<p>프라하 조약(1866-08-23)으로 다음이 결정되었다.</p>
<ul>
  <li>독일연방(1815~1866) 공식 해체.</li>
  <li>프로이센이 슐레스비히-홀슈타인·하노버·헤센-카셀·나사우·프랑크푸르트 자유시를 합병.</li>
  <li>오스트리아는 영토를 보전했으나 독일 정치에서 배제 — 이듬해 오스트리아-헝가리 이중제국(1867) 출범.</li>
  <li>마인 강 이북 22개 국가가 북독일 연방(1867)을 결성, 프로이센 국왕이 연방 대통령직 수임.</li>
  <li>베네치아는 프란츠 요제프가 나폴레옹 3세에게 양도한 후 이탈리아 왕국에 인계.</li>
</ul>
<p>이 전쟁은 소독일주의(klein-deutsch) 통일 노선이 대독일주의(groß-deutsch)를 누른 결정적 사건이며, 1870년 보불전쟁과 1871년 독일 제국 성립으로 직결되었다.</p>`,
    },
  ]

  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId: parentEvent.id, title: section.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: parentEvent.id,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 4) EventCountryRelation (부모 사건) ────────────────────────────────
  type RelInput = {
    historicalCountryName?: string
    countryName?: string
    role: EventCountryRole
    roleDescription?: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '프로이센 왕국',
      role: EventCountryRole.INITIATOR,
      roleDescription: '주도국. 비스마르크의 외교와 몰트케의 군사 운용으로 단기 결전을 노렸다.',
    },
    {
      historicalCountryName: '이탈리아 왕국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '프로이센의 동맹국. 베네치아 회복을 목표로 남부 전선을 담당.',
    },
    {
      countryName: '오스트리아',
      role: EventCountryRole.PARTICIPANT,
      roleDescription:
        '주(主) 적국. 1804–1867 시기 오스트리아 제국이나 별도 historicalCountry가 시드에 없어 현대 오스트리아로 매핑.',
    },
    { historicalCountryName: '바이에른 왕국', role: EventCountryRole.PARTICIPANT, roleDescription: '오스트리아 측 독일연방 동맹국.' },
    { historicalCountryName: '작센 왕국', role: EventCountryRole.PARTICIPANT, roleDescription: '오스트리아 측 — 개전 즉시 프로이센군에 점령.' },
    { historicalCountryName: '하노버 왕국', role: EventCountryRole.PARTICIPANT, roleDescription: '오스트리아 측 — 종전 후 프로이센에 합병.' },
    { historicalCountryName: '뷔르템베르크 왕국', role: EventCountryRole.PARTICIPANT, roleDescription: '오스트리아 측 독일연방 동맹국.' },
    { historicalCountryName: '바덴 대공국', role: EventCountryRole.PARTICIPANT, roleDescription: '오스트리아 측 독일연방 동맹국.' },
    { historicalCountryName: '독일 연방', role: EventCountryRole.OTHER, roleDescription: '본 전쟁의 결과로 해체된 정치 공동체.' },
  ]

  for (const rel of RELATIONS) {
    let countryId: string | null = null
    let historicalCountryId: string | null = null

    if (rel.historicalCountryName) {
      const hc = await prisma.historicalCountry.findFirst({
        where: { name: rel.historicalCountryName },
        select: { id: true },
      })
      if (!hc) {
        console.warn(`    ⚠️  역사 국가 미존재: ${rel.historicalCountryName}`)
        continue
      }
      historicalCountryId = hc.id
    } else if (rel.countryName) {
      const c = await prisma.country.findFirst({
        where: { name: rel.countryName },
        select: { id: true },
      })
      if (!c) {
        console.warn(`    ⚠️  현대 국가 미존재: ${rel.countryName}`)
        continue
      }
      countryId = c.id
    }

    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId: parentEvent.id,
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
      },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵: ${rel.historicalCountryName ?? rel.countryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: parentEvent.id,
        countryId,
        historicalCountryId,
        role: rel.role,
        roleDescription: rel.roleDescription ?? null,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.historicalCountryName ?? rel.countryName} (${rel.role})`)
  }

  // ── 5) 진영·소속·병력/사상자 측정값 (D1·D3) ──────────────────
  // 정본은 seeds/data/event-sides.legacy-five-wars.ts — 진영 이관 스크립트와 같은 데이터
  const sideResult = await applyEventSides(
    prisma,
    parentEvent.id,
    LEGACY_FIVE_WAR_SIDES['보오전쟁'],
    LEGACY_FIVE_WAR_SOURCE,
  )
  console.log(
    `    ✅ 진영 ${sideResult.sides} · 소속 ${sideResult.members} · 측정값 ${sideResult.observations}`,
  )

  // ── 6) MilitaryDetailsNorm ─────────────────────────────────────────────
  const milExists = await prisma.militaryDetailsNorm.findUnique({
    where: { eventId: parentEvent.id },
  })
  if (!milExists) {
    const md = await prisma.militaryDetailsNorm.create({
      data: {
        eventId: parentEvent.id,
        conflictType: ConflictType.WAR,
        objective:
          '프로이센은 독일연방 내 패권 확립 및 오스트리아 영향력 배제. 오스트리아는 연방 헤게모니 유지.',
        tactics:
          '프로이센은 후장식 드라이제 소총의 발사속도 우위를 활용한 분산 운용. 철도·전신 기반 외선 작전으로 3개 군이 보헤미아에 동시 진입.',
        strategy:
          '몰트케의 외선 전략(분진합격) — 분산해서 행군하고 전장에서 합류해 적을 양익 포위. 비스마르크의 단기 결전 외교(이탈리아 동맹·프랑스 중립화).',
        outcome:
          '프로이센의 결정적 승리. 쾨니히그레츠 회전(7/3)으로 오스트리아 북부군 와해, 4주 만에 사실상 종결.',
        territoryChanges:
          '프로이센이 슐레스비히-홀슈타인·하노버·헤센-카셀·나사우·프랑크푸르트 합병. 베네치아는 오스트리아→프랑스→이탈리아로 이전.',
        treaty: '니콜스부르크 가조약(1866-07-26) → 프라하 조약(1866-08-23)',
        strategicImpact:
          '독일연방 해체 + 북독일 연방 결성 → 1871년 독일 제국 성립의 직접적 발판. 오스트리아는 독일에서 배제되어 이중제국(1867)으로 재편.',
      },
    })
    // 교전 형태: 육상 + 해상 (리사 해전)
    for (const ct of [CombatType.LAND, CombatType.NAVAL]) {
      await prisma.militaryDetailsCombatType.create({
        data: { militaryDetailsId: md.id, combatType: ct },
      })
    }
    console.log(`    ✅ 군사 상세: ${TITLE}`)
  } else {
    console.log(`    ⏭️  군사 상세 스킵: ${TITLE}`)
  }

  console.log(`✅ 보오전쟁 시딩 완료\n`)
}
