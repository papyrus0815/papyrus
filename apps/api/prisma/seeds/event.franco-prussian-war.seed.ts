/**
 * 보불전쟁 (Franco-Prussian War, 1870–1871) 시드
 *
 * 부모 사건: 보불전쟁 (1870-07-19 ~ 1871-05-10)
 * 자식 사건:
 *   - 스당 전투 (1870-09-01 ~ 1870-09-02) — 나폴레옹 3세 항복
 *   - 파리 포위 (1870-09-19 ~ 1871-01-28)
 *
 * 등록 항목:
 *  - Event x3 (부모 + 자식 2건)
 *  - EventSection (배경/전개/결과)
 *  - EventCountryRelation (참전국 — 매핑 가능한 역사 국가 우선, 프랑스만 현대 country fallback)
 *  - BelligerentSide x2 (프로이센·독일 측 / 프랑스 측) + CountryInSide
 *  - MilitaryDetailsNorm (전쟁/전투 상세)
 *  - CasualtiesData (양측 사상자)
 *
 * 매핑되지 않는 점:
 *  - 프랑스 제2제국(1852–1870) / 제3공화국(1870–1940) historicalCountry는 시드에 없어
 *    현대 country '프랑스'로 매핑. 추후 프랑스 historicalCountry 시드 추가 시 마이그레이션 권장.
 */
import { EventCountryRole, SideLevel, ConflictType, CombatType, ParticipationType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '전쟁/군사'

interface BelligerentInput {
  /** 진영 식별용(코드) */
  code: 'germany' | 'france'
  name: string
  level: SideLevel
  commander: string
  forces: string
  description: string
  color: string
  /** 진영 내 참전국 — 매핑 가능한 곳만. countryName(현대) 또는 historicalCountryName(역사) 중 하나 */
  countries: Array<{
    historicalCountryName?: string
    countryName?: string
    role?: string
    forces?: string
    commander?: string
    description?: string
    participation?: ParticipationType
  }>
  /** 사상자 (집계) */
  casualties: {
    militaryKilled?: string
    militaryWounded?: string
    militaryMissing?: string
    militaryCaptured?: string
    total?: string
  }
}

const GERMANY_SIDE: BelligerentInput = {
  code: 'germany',
  name: '프로이센·독일 측',
  level: SideLevel.COALITION,
  commander:
    '빌헬름 1세 (총사령관, 프로이센 국왕·이후 독일 황제) / 헬무트 폰 몰트케 (참모총장) / 오토 폰 비스마르크 (수상)',
  forces:
    '동원 약 120만명 (북독일 연방군 + 남독일 4국 연합군). 전선 투입 약 50만명 — 후속 동원으로 단계별 증강.',
  description:
    '프로이센 왕국이 주도한 북독일 연방과 남독일 4국(바이에른·뷔르템베르크·바덴·헤센) 연합. 1870년 7월 비밀 동맹 조항이 자동 발효되어 즉시 통합 작전이 가능했고, 종전 직전인 1871년 1월 18일 베르사유에서 독일 제국이 선포되었다.',
  color: '#1d4ed8',
  countries: [
    {
      historicalCountryName: '프로이센 왕국',
      role: '주도국',
      forces: '북독일 연방군 약 90만명 (전선 투입 약 30만)',
      commander: '빌헬름 1세 / 헬무트 폰 몰트케',
      description:
        '북독일 연방의 맹주로서 전쟁 전 과정을 주도. 7월 19일 프랑스의 선전포고를 받자 즉시 동원령을 발효, 8월 초 라인강을 도하해 알자스·로렌으로 진격했다.',
      participation: ParticipationType.FULL,
    },
    {
      historicalCountryName: '북독일 연방',
      role: '주(主) 정치체',
      forces: '북독일 22개 회원국의 군사 통합체',
      commander: '빌헬름 1세 (연방 대통령)',
      description:
        '1867년 보오전쟁 후 프로이센 주도로 결성된 22개국 연방. 보불전쟁의 공식 교전 주체이자 1871년 1월 독일 제국으로 승격되었다.',
      participation: ParticipationType.FULL,
    },
    {
      historicalCountryName: '바이에른 왕국',
      role: '남독일 동맹국',
      forces: '약 5만 5천명 (제1·제2 바이에른 군단)',
      commander: '루트비히 2세 (국왕) / 야코프 폰 하르트만',
      description:
        '1870년 비밀 군사 동맹에 따라 자동 참전. 베르트 전투(8/6)와 스당 전투(9/1)에서 프로이센 제3군에 편성되어 결정적 역할을 수행. 종전 후 독일 제국 가입.',
      participation: ParticipationType.FULL,
    },
    {
      historicalCountryName: '뷔르템베르크 왕국',
      role: '남독일 동맹국',
      forces: '약 2만명',
      commander: '카를 1세',
      description:
        '뷔르템베르크 사단으로 편성되어 프로이센 제3군에 합류. 알자스 진격과 파리 포위에 참여했고 종전 후 독일 제국에 가입했다.',
      participation: ParticipationType.FULL,
    },
    {
      historicalCountryName: '바덴 대공국',
      role: '남독일 동맹국',
      forces: '약 1만 5천명',
      commander: '프리드리히 1세 폰 바덴 대공',
      description:
        '바덴 사단이 프로이센 제3군에 편성되어 알자스 작전에 참여. 종전 후 독일 제국 가입.',
      participation: ParticipationType.FULL,
    },
    {
      historicalCountryName: '헤센 대공국',
      role: '남독일 동맹국',
      forces: '약 1만명',
      commander: '루트비히 3세 헤센 대공',
      description:
        '헤센-다름슈타트 사단으로 편성되어 메스 포위와 파리 포위에 참여했다.',
      participation: ParticipationType.LIMITED,
    },
  ],
  casualties: {
    militaryKilled: '약 44,700명',
    militaryWounded: '약 89,700명',
    militaryMissing: '약 4,000명',
    militaryCaptured: '약 720명',
    total: '약 139,000명 (전사·부상·실종·포로 합계)',
  },
}

const FRANCE_SIDE: BelligerentInput = {
  code: 'france',
  name: '프랑스 측',
  level: SideLevel.COUNTRY,
  commander:
    '나폴레옹 3세 (황제, ~1870-09-02) / 레옹 강베타 (국방정부 내무장관, 1870-09-04~) / 파트리스 드 마크마옹 (원수, 샬롱군) / 프랑수아 아실 바젠 (원수, 라인군)',
  forces:
    '동원 약 90만명 — 정규군 49만 + 국민방위대 + 의용군. 개전 시 전선 투입 약 25만으로 동원·집결 모두 독일 측에 비해 늦었다.',
  description:
    '프랑스 제2제국(나폴레옹 3세)이 7월 19일 선전포고로 개전. 9월 2일 스당 전투에서 황제가 항복하며 제정이 붕괴, 9월 4일 파리에서 제3공화국 국방정부가 선포되어 항전을 이어갔다. 그러나 메스(10/27)·파리(1871-01-28) 차례로 항복하며 패전.',
  color: '#b91c1c',
  countries: [
    {
      countryName: '프랑스',
      role: '주도국',
      forces: '약 90만명 (정규군·국민방위대·의용군 총합)',
      commander: '나폴레옹 3세 → 국방정부(레옹 강베타·줄 파브르)',
      description:
        '엠스 전보 사건(7/13)에 격분해 7월 19일 프로이센에 선전포고. 1804–1870 시기 프랑스 제2제국이나 별도 historicalCountry가 시드에 없어 현대 프랑스로 매핑. 9/4 이후 프랑스 제3공화국이 같은 정치적 실체로 항전을 이어감.',
      participation: ParticipationType.FULL,
    },
  ],
  casualties: {
    militaryKilled: '약 138,800명',
    militaryWounded: '약 143,000명',
    militaryMissing: '약 41,000명',
    militaryCaptured: '약 474,000명 (스당 10만, 메스 17만, 파리 항복 시 등)',
    total: '약 756,000명 — 보불전쟁의 인적 손실 대부분이 프랑스 측에 집중되었으며, 특히 포로 수가 압도적이다.',
  },
}

export async function seedFrancoPrussianWar(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n⚔️  보불전쟁(1870-1871) 시딩 시작...')

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
  const TITLE = '보불전쟁'

  let parentEvent = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date('1870-07-19'),
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
          '1870년 7월 19일 ~ 1871년 5월 10일, 프랑스 제2제국과 프로이센 주도 북독일 연방·남독일 4국 연합 사이에 벌어진 전쟁. 스당(9/1)·메스(10/27)·파리(1871-01-28)의 잇따른 함락으로 프랑스가 결정적으로 패배했고, 1871년 1월 18일 베르사유 거울홀에서 독일 제국이 선포되며 독일 통일이 완성되었다.',
        startDate: new Date('1870-07-19'),
        startDatePrecision: 'day',
        endDate: new Date('1871-05-10'),
        endDatePrecision: 'day',
        location: '알자스·로렌·샹파뉴·파리·루아르 일대 (프랑스 동부 및 북부)',
        categoryId: category.id,
        historicalCountryId: prussiaHC.id,
        background:
          '1866년 보오전쟁 승리로 북독일 연방을 결성한 프로이센은 남독일 4국과 비밀 군사 동맹을 맺어 통일 완성을 노렸다. 한편 1868년 스페인 혁명으로 공석이 된 스페인 왕위에 호엔촐레른-지그마링겐 가문의 레오폴트가 후보로 거론되자(1870년 7월), 프랑스는 동·남 양면에서 호엔촐레른 가문에 포위된다며 격렬히 반발했다. 비스마르크는 7월 13일 빌헬름 1세와 프랑스 대사 베네데티의 엠스 회담을 의도적으로 축약·강조한 "엠스 전보"를 공표해 양국 여론을 자극했고, 7월 19일 프랑스가 선전포고하며 개전했다.',
        aftermath:
          '프랑크푸르트 조약(1871-05-10)으로 종결. 프랑스는 알자스 전체와 로렌 북부(메스 포함)를 독일 제국에 할양하고 50억 프랑의 배상금을 지불(1873년 완납)했다. 종전 직전인 1871년 1월 18일 베르사유 거울홀에서 빌헬름 1세가 독일 황제로 즉위하며 독일 제국이 공식 출범, 19세기 유럽 세력 균형이 근본적으로 재편되었다. 프랑스에서는 제2제국이 붕괴하고 제3공화국이 수립되었으며, 파리 코뮌(1871-03-18~05-28)이 발생해 약 2만~3만명의 사망자를 낳았다. 알자스-로렌 상실은 이후 50년간 프랑스의 대독 복수 정서(revanchisme)의 원동력이 되어 제1차 세계대전의 한 원인을 이룬다.',
        keywords: [
          '보불전쟁',
          '프로이센·프랑스 전쟁',
          '독일통일',
          '독일 제국 선포',
          '비스마르크',
          '몰트케',
          '나폴레옹 3세',
          '엠스 전보',
          '스당 전투',
          '파리 포위',
          '프랑크푸르트 조약',
          '알자스-로렌',
          '파리 코뮌',
        ] as any,
        warCost:
          '프랑스 약 70억 프랑(전비) + 50억 프랑(배상금). 독일 측 약 8억 마르크(전비). 인적·경제적 손실 모두 압도적으로 프랑스 측에 집중.',
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${parentEvent.id})`)
  }

  // ── 2) 자식 사건 — 스당 전투 ────────────────────────────────────────────
  const SEDAN_TITLE = '스당 전투'
  let sedanEvent = await prisma.event.findFirst({
    where: {
      title: SEDAN_TITLE,
      startDate: new Date('1870-09-01'),
      parentEventId: parentEvent.id,
      deletedAt: null,
    },
  })

  if (sedanEvent) {
    console.log(`  ⏭️  이미 존재: ${SEDAN_TITLE} (id=${sedanEvent.id})`)
  } else {
    sedanEvent = await prisma.event.create({
      data: {
        title: SEDAN_TITLE,
        description:
          '1870년 9월 1일~2일 프랑스 북동부 아르덴 지역 스당에서 벌어진 보불전쟁의 결정적 회전. 마크마옹 원수의 샬롱군 약 12만이 몰트케의 제3군·뮤즈군에 양익 포위되어 항복했고, 황제 나폴레옹 3세가 친히 포로가 되며 프랑스 제2제국이 사실상 붕괴했다.',
        startDate: new Date('1870-09-01'),
        startDatePrecision: 'day',
        endDate: new Date('1870-09-02'),
        endDatePrecision: 'day',
        location: '프랑스 아르덴 스당 (Sedan)',
        categoryId: category.id,
        historicalCountryId: prussiaHC.id,
        parentEventId: parentEvent.id,
        background:
          '메스에 포위된 바젠 원수의 라인군(약 17만)을 구하기 위해 마크마옹 원수의 샬롱군 약 12만이 8월 21일 출발해 북상했다. 그러나 몰트케는 정찰 정보로 진로를 파악하고 보몽 전투(8/30)에서 일격을 가한 뒤 8월 31일 스당 일대로 프랑스군을 몰아넣었다. 황제 나폴레옹 3세도 샬롱군에 동행하고 있었다.',
        aftermath:
          '9월 2일 정오 직전 황제가 백기를 올리며 항복. 약 10만 4천명이 포로가 되었고 황제 본인도 빌헬름하우엔 성에 유폐되었다. 9월 4일 파리에서 제정이 폐지되고 국방정부와 제3공화국이 선포되었다. 양측 사상은 프로이센·독일 측 약 9천명, 프랑스 측 약 1만 7천명(전사·부상)에 더해 포로 10만 4천명. 9월 19일 곧바로 파리 포위가 시작되었다.',
        keywords: [
          '스당 전투',
          '나폴레옹 3세 항복',
          '마크마옹',
          '몰트케',
          '제2제국 붕괴',
          '국방정부',
          '제3공화국 선포',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${SEDAN_TITLE} (id=${sedanEvent.id})`)
  }

  // ── 3) 자식 사건 — 파리 포위 ────────────────────────────────────────────
  const PARIS_TITLE = '파리 포위'
  let parisEvent = await prisma.event.findFirst({
    where: {
      title: PARIS_TITLE,
      startDate: new Date('1870-09-19'),
      parentEventId: parentEvent.id,
      deletedAt: null,
    },
  })

  if (parisEvent) {
    console.log(`  ⏭️  이미 존재: ${PARIS_TITLE} (id=${parisEvent.id})`)
  } else {
    parisEvent = await prisma.event.create({
      data: {
        title: PARIS_TITLE,
        description:
          '1870년 9월 19일~1871년 1월 28일 프로이센·독일 연합군이 약 132일간 파리를 포위한 작전. 보급선 차단과 포격으로 시민 약 200만명이 극심한 기근을 겪었으며, 1871년 1월 28일 항복으로 종전의 결정적 단서가 마련되었다.',
        startDate: new Date('1870-09-19'),
        startDatePrecision: 'day',
        endDate: new Date('1871-01-28'),
        endDatePrecision: 'day',
        location: '프랑스 파리 및 일드프랑스',
        categoryId: category.id,
        historicalCountryId: prussiaHC.id,
        parentEventId: parentEvent.id,
        background:
          '스당에서 황제가 항복한 뒤에도 국방정부는 파리 사수를 결의하고 시민·국민방위대를 동원했다. 9월 19일 프로이센 제3군과 뮤즈군이 파리를 완전 포위하기 시작했고, 빌헬름 1세와 비스마르크는 베르사유에 사령부를 차렸다.',
        aftermath:
          '1871년 1월 5일~26일 크루프제 공성포로 파리 좌안 포격이 시작되어 시민 사상자가 발생. 식량난이 한계에 달해 1월 28일 줄 파브르가 휴전 조약에 서명하며 항복. 같은 시기 1월 18일 베르사유 거울홀에서 독일 제국이 선포되었다. 파리 시내에서는 무장한 국민방위대와 정부의 대치가 격화되어 3월 18일 파리 코뮌이 봉기, 5월 28일 "피의 일주일"로 진압되며 약 2만~3만명이 사망했다.',
        keywords: [
          '파리 포위',
          '국방정부',
          '베르사유',
          '독일 제국 선포',
          '파리 코뮌',
          '비스마르크',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${PARIS_TITLE} (id=${parisEvent.id})`)
  }

  // ── 4) EventSection (부모 사건) ─────────────────────────────────────────
  const SECTIONS: Array<{ title: string; content: string; order: number; sectionType?: string }> = [
    {
      order: 1,
      title: '개전 배경',
      sectionType: 'background',
      content: `<p>1866년 보오전쟁 승리로 북독일 연방을 결성한 프로이센은 비스마르크의 외교 아래 독일 통일의 마지막 장애물 — 프랑스의 견제 — 을 제거할 명분을 노리고 있었다.</p>
<ul>
  <li><strong>스페인 왕위 후보 사건</strong>: 1868년 스페인 혁명으로 공석이 된 왕위에 호엔촐레른-지그마링겐 가문의 레오폴트가 후보로 거론(1870년 7월). 프랑스는 동·남 양면에서 호엔촐레른 가문에 포위된다며 격렬히 반발.</li>
  <li><strong>엠스 회담(1870-07-13)</strong>: 프랑스 대사 베네데티가 빌헬름 1세에게 후보 영구 포기를 강요하나 거절당함. 빌헬름이 비스마르크에게 보낸 전보를 비스마르크가 의도적으로 축약·강조하여 공개("엠스 전보").</li>
  <li><strong>여론의 자극</strong>: 양국 여론이 격분, 7월 19일 프랑스가 선전포고하며 개전.</li>
  <li><strong>독일 측의 비밀 동맹</strong>: 1866년 이후 남독일 4국(바이에른·뷔르템베르크·바덴·헤센)과 체결한 비밀 군사 동맹이 자동 발효되어 통일 작전 가능.</li>
  <li><strong>외교 고립</strong>: 비스마르크는 1866년 베네토 이양 약속과 1867년 룩셈부르크 위기 등으로 영국·러시아·오스트리아의 중립을 미리 확보, 프랑스를 외교적으로 고립시켰다.</li>
</ul>`,
    },
    {
      order: 2,
      title: '전쟁 경과',
      sectionType: 'process',
      content: `<p>몰트케는 보오전쟁의 외선 작전을 더 큰 규모로 적용했다. 철도와 동원 계획의 우위로 독일군이 먼저 전선에 도착했고, 알자스·로렌으로 진격해 프랑스 야전군을 차례로 격파했다.</p>
<ol>
  <li>1870-07-19: 프랑스 선전포고. 독일 측 즉각 동원.</li>
  <li>1870-08-04 비센부르크 전투 — 첫 충돌, 독일 승리.</li>
  <li>1870-08-06 베르트(프뢰슈빌러)·슈피헤렌 동시 전투 — 마크마옹의 알자스군과 라인군 모두 후퇴.</li>
  <li>1870-08-16 마르스라투르 전투 — 라인군 메스 후방 차단.</li>
  <li>1870-08-18 그라블로트-생프리바 회전 — 사상 약 4만, 프로이센 측의 승리이지만 가장 피비린내 나는 전투. 바젠 원수의 라인군 약 17만이 메스에 갇힘.</li>
  <li>1870-08-19 ~ 10-27 메스 포위전 — 17만의 프랑스 라인군이 항복.</li>
  <li><strong>1870-09-01~02 스당 전투 — 나폴레옹 3세 항복, 제2제국 붕괴.</strong></li>
  <li>1870-09-04 파리에서 제3공화국·국방정부 선포.</li>
  <li>1870-09-19 ~ 1871-01-28 파리 포위.</li>
  <li>1870-12-02 ~ 1871-01-19 루아르군·북부군의 반격 시도 (콜미에·로아니·르망·생캉탱) — 모두 실패.</li>
  <li>1871-01-18 베르사유에서 독일 제국 선포.</li>
  <li>1871-01-28 파리 항복 + 휴전 조약.</li>
  <li>1871-05-10 프랑크푸르트 조약 — 종전.</li>
</ol>`,
    },
    {
      order: 3,
      title: '전후 처리와 영향',
      sectionType: 'aftermath',
      content: `<p>프랑크푸르트 조약(1871-05-10)으로 다음이 결정되었다.</p>
<ul>
  <li>알자스 전체와 로렌 북부(메스 포함)를 독일 제국에 할양 — 약 14,500 km², 인구 160만.</li>
  <li>50억 프랑의 배상금 지불 (1873년 9월 완납).</li>
  <li>배상금 완납 시까지 프랑스 동부 6개 주에 독일군 점령.</li>
</ul>
<p>전쟁의 더 큰 영향:</p>
<ul>
  <li><strong>독일 제국 성립(1871-01-18)</strong>: 베르사유 거울홀에서 빌헬름 1세가 독일 황제로 즉위. 19세기 후반 유럽의 강국 지도가 근본적으로 재편.</li>
  <li><strong>프랑스 제2제국 붕괴와 제3공화국 수립</strong>: 약 70년간 지속된 공화제의 출발점.</li>
  <li><strong>파리 코뮌(1871-03-18~05-28)</strong>: 항복에 반발한 파리 시민이 자치 정부 수립. "피의 일주일"로 진압되며 약 2만~3만명 사망.</li>
  <li><strong>이탈리아 통일 완성</strong>: 프랑스군이 로마에서 철수하면서 이탈리아 왕국이 9월 20일 로마 점령, 통일이 완성됨.</li>
  <li><strong>알자스-로렌 문제</strong>: 향후 50년간 프랑스 대독 복수 정서(revanchisme)의 핵심으로 작용해 1차 세계대전의 한 원인을 이룬다.</li>
</ul>`,
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

  // ── 5) EventCountryRelation (부모 사건) ────────────────────────────────
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
      roleDescription:
        '주(主) 교전국. 비스마르크의 외교(엠스 전보)와 몰트케의 군사 운용으로 단기 결전을 통해 독일 통일을 완성.',
    },
    {
      historicalCountryName: '북독일 연방',
      role: EventCountryRole.INITIATOR,
      roleDescription: '공식 교전 주체로서의 정치체. 종전 직전 독일 제국으로 승격.',
    },
    {
      historicalCountryName: '바이에른 왕국',
      role: EventCountryRole.ALLY,
      roleDescription: '프로이센 측 남독일 동맹국. 종전 후 독일 제국 가입.',
    },
    {
      historicalCountryName: '뷔르템베르크 왕국',
      role: EventCountryRole.ALLY,
      roleDescription: '프로이센 측 남독일 동맹국. 종전 후 독일 제국 가입.',
    },
    {
      historicalCountryName: '바덴 대공국',
      role: EventCountryRole.ALLY,
      roleDescription: '프로이센 측 남독일 동맹국. 종전 후 독일 제국 가입.',
    },
    {
      historicalCountryName: '헤센 대공국',
      role: EventCountryRole.ALLY,
      roleDescription: '프로이센 측 남독일 동맹국 (헤센-다름슈타트).',
    },
    {
      historicalCountryName: '독일 제국',
      role: EventCountryRole.OTHER,
      roleDescription: '본 전쟁의 결과로 1871-01-18 선포된 정치 공동체.',
    },
    {
      countryName: '프랑스',
      role: EventCountryRole.ADVERSARY,
      roleDescription:
        '주(主) 적국. 1852–1870 시기 프랑스 제2제국 → 1870-09-04 이후 제3공화국. 별도 historicalCountry가 시드에 없어 현대 프랑스로 매핑.',
    },
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
        role: rel.role,
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

  // ── 6) BelligerentSide + CountryInSide + 사상자 ────────────────────────
  for (const side of [GERMANY_SIDE, FRANCE_SIDE]) {
    let belligerent = await prisma.belligerentSide.findFirst({
      where: { eventId: parentEvent.id, name: side.name },
    })

    if (belligerent) {
      console.log(`    ⏭️  진영 스킵: ${side.name}`)
    } else {
      belligerent = await prisma.belligerentSide.create({
        data: {
          eventId: parentEvent.id,
          name: side.name,
          level: side.level,
          commander: side.commander,
          forces: side.forces,
          description: side.description,
          color: side.color,
        },
      })
      console.log(`    ✅ 진영 생성: ${side.name}`)
    }

    // 진영 내 참전국
    for (const c of side.countries) {
      let countryId: string | null = null
      let historicalCountryId: string | null = null

      if (c.historicalCountryName) {
        const hc = await prisma.historicalCountry.findFirst({
          where: { name: c.historicalCountryName },
          select: { id: true },
        })
        if (!hc) {
          console.warn(`      ⚠️  역사 국가 미존재: ${c.historicalCountryName}`)
          continue
        }
        historicalCountryId = hc.id
      } else if (c.countryName) {
        const country = await prisma.country.findFirst({
          where: { name: c.countryName },
          select: { id: true },
        })
        if (!country) {
          console.warn(`      ⚠️  현대 국가 미존재: ${c.countryName}`)
          continue
        }
        countryId = country.id
      }

      const exists = await prisma.countryInSide.findFirst({
        where: {
          sideId: belligerent.id,
          countryId: countryId ?? undefined,
          historicalCountryId: historicalCountryId ?? undefined,
        },
      })
      if (exists) {
        console.log(`      ⏭️  진영국가 스킵: ${c.historicalCountryName ?? c.countryName}`)
        continue
      }
      await prisma.countryInSide.create({
        data: {
          sideId: belligerent.id,
          countryId,
          historicalCountryId,
          commander: c.commander ?? null,
          forces: c.forces ?? null,
          role: c.role ?? null,
          description: c.description ?? null,
          participation: c.participation ?? ParticipationType.FULL,
          joinDate: new Date('1870-07-19'),
        },
      })
      console.log(`      ✅ 진영국가: ${c.historicalCountryName ?? c.countryName}`)
    }

    // 사상자
    const casualtiesExists = await prisma.casualtiesData.findFirst({
      where: { eventId: parentEvent.id, sideId: belligerent.id },
    })
    if (!casualtiesExists) {
      await prisma.casualtiesData.create({
        data: {
          eventId: parentEvent.id,
          sideId: belligerent.id,
          sideName: side.name,
          militaryKilled: side.casualties.militaryKilled ?? null,
          militaryWounded: side.casualties.militaryWounded ?? null,
          militaryMissing: side.casualties.militaryMissing ?? null,
          militaryCaptured: side.casualties.militaryCaptured ?? null,
          total: side.casualties.total ?? null,
        },
      })
      console.log(`    ✅ 사상자: ${side.name}`)
    } else {
      console.log(`    ⏭️  사상자 스킵: ${side.name}`)
    }
  }

  // ── 7) MilitaryDetailsNorm ─────────────────────────────────────────────
  const milExists = await prisma.militaryDetailsNorm.findUnique({
    where: { eventId: parentEvent.id },
  })
  if (!milExists) {
    const md = await prisma.militaryDetailsNorm.create({
      data: {
        eventId: parentEvent.id,
        conflictType: ConflictType.WAR,
        objective:
          '독일 측: 남독일 4국을 통합한 독일 통일 완성. 프랑스 측: 호엔촐레른의 동·남 양면 포위 저지 및 라인 강 좌안 영향력 확보.',
        tactics:
          '독일 측은 후장식 라이플(드라이제·드라이제 후속) 보병 + 후장식 강선 크루프 강철포의 화력 우위. 프랑스 측은 사정거리에서 우위인 샤스포 소총을 보유했지만 미트라이외즈 기관총 등 신무기 운용 미숙.',
        strategy:
          '몰트케의 분진합격(외선 작전)과 철도 동원 — 1주일 내 라인강 일대 집결. 비스마르크의 외교적 고립 작전으로 영국·러시아·오스트리아 중립 확보. 프랑스 측은 동원 지연으로 전쟁 초반부터 수세에 몰림.',
        outcome:
          '독일 측의 결정적 승리. 스당 회전(9/1~2)으로 황제 친히 항복, 메스 포위(10/27)로 라인군 17만 항복, 파리 항복(1871-01-28)으로 종전. 약 10개월 내 모든 야전군 격파.',
        territoryChanges:
          '프랑스 → 독일 제국: 알자스 전체, 로렌 북부(메스·티옹빌 포함), 약 14,500 km², 인구 약 160만. 1919년 베르사유 조약으로 다시 프랑스에 반환.',
        treaty:
          '베르사유 가조약(1871-02-26) → 프랑크푸르트 조약(1871-05-10)',
        strategicImpact:
          '독일 통일 완성과 독일 제국 선포(1871-01-18). 유럽 세력 균형의 근본적 재편 — 빈 체제(1815) 이래 균형이 무너지고 독일이 대륙 강국으로 부상. 프랑스의 제2제국 붕괴와 제3공화국 수립. 알자스-로렌 문제는 50년간 프랑스 복수 정서(revanchisme)의 핵심으로 작용해 1차 세계대전의 한 원인을 이룬다. 이탈리아군이 로마를 점령해(1870-09-20) 이탈리아 통일도 완성됨.',
      },
    })
    // 교전 형태: 거의 대부분 육상
    for (const ct of [CombatType.LAND]) {
      await prisma.militaryDetailsCombatType.create({
        data: { militaryDetailsId: md.id, combatType: ct },
      })
    }
    console.log(`    ✅ 군사 상세: ${TITLE}`)
  } else {
    console.log(`    ⏭️  군사 상세 스킵: ${TITLE}`)
  }

  console.log(`✅ 보불전쟁 시딩 완료\n`)
}
