/**
 * 1945년 8월 마닐라 사전 회담(マニラ会談 / Manila Pre-Surrender Conference) 시드
 *
 * 사건 개요
 *  - 일본 정부가 포츠담 선언을 수락(8/14)하고 옥음방송(8/15)을 발표한 직후,
 *    GHQ(맥아더 사령부)와의 *항복 절차 사전 협의*를 위해 가와베 도라시로 육군
 *    중장을 단장으로 한 16~17명 규모의 일본 사절단이 마닐라(필리핀)에 파견되어
 *    1945-08-19~20 양일에 걸쳐 진행한 회담.
 *  - 9월 2일 미주리함 항복 문서 조인의 모든 실무 절차 — General Order No.1,
 *    연합군 진주 일정·지점, 무장해제 절차, 천황 신변 처우 — 가 이 회담에서 사실상
 *    확정되었다. 동아시아 점령 분할(38선·9월 2일선 등)의 직접 근간 문서가 일본
 *    측에 인계된 자리이기도 하다.
 *
 * 등록 항목
 *  - Event(부모): 마닐라 사전 회담 (1945-08-19 ~ 1945-08-20, 회담/조약 카테고리)
 *  - EventSection x7: 발단·사절단/항공편/1차회담/2차회담/General Order 1/천황 처우 합의/사료
 *  - EventCountryRelation: 일본 제국·미국·필리핀·영국·중국·소련(연합국)
 *  - Person 신규: 가와베 도라시로(사절단장), 더글러스 맥아더(GHQ 최고사령관)
 *  - PersonEvent: 위 두 명 + 시데하라(외무 라인) — 시데하라는 기존 인물 활용
 *
 * 의존성: 일본 제국 hc(seedJapanMeijiEra), eventCategory '회담/조약', admin
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '회담/조약'

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
  originalName: string
  name: string
  surname?: string
  biography: string
  birthYear: number; birthMonth: number; birthDay: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender: string
  /** 인물의 1차 소속국가 — 한국어 이름 기준으로 historical_country 또는 modern country에서 검색 */
  affiliationHistoricalCountryName?: string
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
}

const NEW_PERSONS: PersonEntry[] = [
  {
    originalName: 'Kawabe Torashirō',
    name: '도라시로',
    surname: '가와베',
    biography:
      '일본 제국 육군 중장(陸軍中将, 1945 시점). 육군대학 30기 수석 졸업, 작전·기획 분야의 엘리트 참모로 분류된다. 1944년 항공총군 참모장, 1945년 4월 참모차장(参謀次長)에 보임되어 종전 결정 직전까지 대본영 작전 라인의 핵심에 있었다. 1945년 8월 17일 종전조서 봉행을 위한 사절단장(全権)으로 마닐라에 파견되어 8월 19~20일 가와베 사절단을 이끌었다. 미국 측 대표 리처드 서덜랜드 참모장과의 회담에서 9월 2일 미주리함 항복 조인 일정·진주 절차·General Order No.1 인수까지의 실무 합의를 도출했다. 회고록 「市ヶ谷台より市ヶ谷台へ」(1962)는 일본 종전사 1차 사료로 평가된다.',
    birthYear: 1890, birthMonth: 1, birthDay: 25,
    deathYear: 1960, deathMonth: 1, deathDay: 25,
    gender: 'MALE',
    affiliationHistoricalCountryName: '일본 제국',
    birthPlaceText: '도야마현 도야마시(富山県富山市) — 사족 가문',
    influence: 60,
    stats: {
      politics: 65, military: 78, diplomacy: 70, intellect: 88, charisma: 60, administration: 75,
      notes: '작전·기획 라인의 정통 엘리트. 종전 사절단장으로서 외교적 기민성도 입증.',
    },
  },
  {
    originalName: 'Douglas MacArthur',
    name: '더글러스',
    surname: '맥아더',
    biography:
      '미국 육군 5성 장군. 태평양 전구 미군 총사령관(SWPA, 1942-1945)으로 필리핀 탈환 전역(1944)을 지휘했고 1945년 8월 14일 연합군 최고사령관(SCAP)에 임명되어 일본 점령 통치를 주도했다(1945-08~1951-04). 1945년 8월 19~20일 마닐라 사전 회담은 그의 참모장 리처드 서덜랜드에게 위임했고, 8월 30일 아쓰기 비행장에 도착해 9월 2일 미주리함에서 일본 항복 문서를 수락했다. 점령기 농지개혁·재벌 해체·신헌법 제정·여성 참정권을 단행해 전후 일본의 기본 골격을 설계했다. 한국전쟁(1950-1951)에서 인천상륙작전을 지휘했으나 1951년 4월 트루먼 대통령에 의해 해임되었다.',
    birthYear: 1880, birthMonth: 1, birthDay: 26,
    deathYear: 1964, deathMonth: 4, deathDay: 5,
    gender: 'MALE',
    affiliationHistoricalCountryName: undefined, // 현대 미국 — 인물 affiliation은 historicalCountry 기준이라 일단 비움
    birthPlaceText: '미국 아칸소주 리틀록(Little Rock, Arkansas)',
    influence: 95,
    stats: {
      politics: 88, military: 92, diplomacy: 80, intellect: 85, charisma: 92, administration: 88,
      notes: '전장 지휘·점령 통치·군정 개혁의 종합 능력. 정치적 야심과 충돌 — 1951 해임.',
    },
  },
]

export async function seedJapan1945ManilaConference(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🤝 1945년 마닐라 사전 회담 시딩 시작...')

  // ── 0. 사전 의존성 ─────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 없음 — 시딩 중단 (admin.seed 먼저)')
    return
  }
  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 미존재: ${EVENT_CATEGORY_NAME}`)
    return
  }
  const empireHc = await prisma.historicalCountry.findFirst({
    where: { name: '일본 제국' },
    select: { id: true },
  })
  if (!empireHc) {
    console.warn('  ⚠️  일본 제국 hc 미존재 — seedJapanMeijiEra 먼저 필요')
    return
  }

  // ── 1. 신규 인물 등록 ──────────────────────────────────────────────
  console.log('\n  👤 회담 핵심 인물 등록...')
  for (const p of NEW_PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    let personId: string
    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${p.originalName}`)
    } else {
      const birthDate = new Date(p.birthYear, p.birthMonth - 1, p.birthDay)
      const deathDate = p.deathYear
        ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
        : undefined
      const created = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          biography: p.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: p.gender,
          nameDisplayOrder: 'korean',
          influence: p.influence,
          birthPlaceText: p.birthPlaceText,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${p.originalName} (영향력 ${p.influence ?? '-'})`)

      if (p.stats) {
        await prisma.personStats.create({
          data: {
            personId,
            accountId: ACCOUNT_ID,
            politics: p.stats.politics,
            military: p.stats.military,
            diplomacy: p.stats.diplomacy,
            intellect: p.stats.intellect,
            charisma: p.stats.charisma,
            administration: p.stats.administration,
            notes: p.stats.notes,
          },
        })
        const s = p.stats
        console.log(`        ✅ 능력치: 정${s.politics}/군${s.military}/외${s.diplomacy}/학${s.intellect}/카${s.charisma}/행${s.administration}`)
      }

      if (p.affiliationHistoricalCountryName) {
        const hc = await prisma.historicalCountry.findFirst({
          where: { name: p.affiliationHistoricalCountryName },
          select: { id: true },
        })
        if (hc) {
          await prisma.personCountryAffiliation.create({
            data: {
              personId,
              historicalCountryId: hc.id,
              affiliationType: 'CITIZENSHIP' as any,
              priority: 0,
            },
          })
          console.log(`        ✅ 소속국가: ${p.affiliationHistoricalCountryName}`)
        }
      }
    }
  }

  // ── 2. 사건 등록 ───────────────────────────────────────────────────
  const TITLE = '마닐라 사전 회담 (1945)'
  const START = new Date('1945-08-19')
  const END = new Date('1945-08-20')

  let event = await prisma.event.findFirst({
    where: { title: TITLE, startDate: START, deletedAt: null },
  })

  if (event) {
    console.log(`\n  ⏭️  사건 이미 존재: ${TITLE}`)
  } else {
    event = await prisma.event.create({
      data: {
        title: TITLE,
        description:
          '1945년 8월 19~20일 필리핀 마닐라에서 열린 일본 항복 절차의 사전 실무 회담. 일본 측은 가와베 도라시로 육군 중장(参謀次長)을 단장으로 한 16~17명의 사절단(외무·육해군 합동)이, 연합군 측은 더글러스 맥아더 SCAP의 위임으로 리처드 K. 서덜랜드 참모장이 주재했다. 9월 2일 미주리함에서 거행된 정식 항복 조인의 모든 실무 절차(General Order No.1 인수, 진주 일정·지점, 무장해제 순서, 천황 보존을 포함한 처우)가 이 회담에서 사실상 확정되었다. 동아시아 분할 점령(한반도 38선, 인도차이나 16도선 등)의 직접 근간 문서인 General Order No.1이 일본 측에 공식 인계된 자리이기도 하다.',
        startDate: START,
        startDatePrecision: 'day',
        endDate: END,
        endDatePrecision: 'day',
        location: '필리핀 마닐라 — AFPAC(Army Forces Pacific) 임시 본부, 시청 인근 시민회관(Manila City Hall 일대)',
        categoryId: category.id,
        historicalCountryId: empireHc.id,
        background:
          '1945년 8월 14일 일본 정부가 포츠담 선언 수락을 결정하고, 8월 15일 정오 옥음방송으로 종전이 발표되었다. 같은 날 트루먼 대통령은 더글러스 맥아더를 연합군 최고사령관(SCAP)에 임명, 16일 일본 정부 앞으로 *항복 절차 협의를 위한 사절단 파견을 요구하는 무선 전문*을 송신했다. 8월 17일 히가시쿠니노미야 내각이 발족하여 사절단 인선을 결정 — 단장 가와베 도라시로 참모차장, 외무성 라인 오카자키 가쓰오, 작전 호리바 가즈오 대좌, 해군 데라쿠라 마사오 소장 등 16명이 18일 도쿄 가시와비행장(柏飛行場)에서 출발 준비를 마쳤다. 사절단 항공기 2대(녹색 도장 더글러스 더그글러스 더글러스 G3M "베티" 폭격기 개조)는 19일 새벽 출발하여 오키나와 이에지마(伊江島)를 경유, 같은 날 마닐라에 도착했다.',
        aftermath:
          '회담 종료 후 사절단은 8월 20일 저녁 마닐라를 출발, 8월 21일 도쿄로 귀환하면서 General Order No.1 정본·진주 일정·항복 문서 초안을 가지고 들어왔다. 이를 바탕으로 8월 28일 미군 선견대(서덜랜드 인솔)가 가시와·아쓰기 일대에 도착, 8월 30일 맥아더 본대가 아쓰기 비행장에 진주, 9월 2일 도쿄 만 미주리함에서 시게미쓰 마모루 외무대신(정부)·우메즈 요시지로 참모총장(군부)이 항복 문서에 조인했다. 마닐라 회담의 *천황 처우 구두 합의*는 1945년 9월 27일 천황과 맥아더의 미국 대사관 회견으로 이어져 천황 보존이 사실상 확정되었고, General Order No.1의 일본군 무장해제 분담선은 한반도 38선·인도차이나 16도선 등 전후 동아시아 분할 점령의 골격이 되었다.',
        keywords: [
          '마닐라회담', 'マニラ会談', 'Manila Conference', '가와베도라시로', '河辺虎四郎',
          '맥아더', 'MacArthur', '서덜랜드', 'Sutherland', 'GHQ', 'AFPAC',
          'GeneralOrderNo1', '일반명령제1호', '항복문서', '미주리함조인',
          '38선', '천황보존', '히가시쿠니노미야내각', '시게미쓰마모루', '우메즈요시지로',
          '오카자키가쓰오', '岡崎勝男', '이에지마', '가시와비행장', '아쓰기',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${event.id})`)
  }

  // ── 3. 본문 섹션(논문급 7개) ───────────────────────────────────────
  const SECTIONS: { order: number; title: string; sectionType: string; content: string }[] = [
    {
      order: 1,
      title: '발단 — 사절단 파견 결정과 인선',
      sectionType: 'background',
      content: `<p>1945년 8월 16일 더글러스 맥아더 SCAP은 일본 정부 앞으로 무선 전문(Manila signal #1)을 보내 <strong>항복 절차 협의를 위한 일본 측 사절단의 즉시 파견</strong>을 요구했다. 전문은 다음을 명시했다.</p>
<ul>
  <li>사절단은 <strong>천황·정부·대본영 모두를 대표하는 全権</strong>이어야 함.</li>
  <li>현역 군 고위 장교 + 외무 관료가 포함되어야 함.</li>
  <li>출발 시 사절단의 신원·항공편 정보를 사전 통지하고, 식별을 위해 <strong>기체에 녹색 도료를 발라 항공기 양 측면에 흰 십자(Cross)</strong>를 도장할 것.</li>
  <li>도착지는 마닐라, 경유지는 오키나와 이에지마(伊江島).</li>
</ul>
<p>8월 17일 발족한 히가시쿠니노미야 나루히코 내각은 즉각 사절단 구성을 결정한다. 인선은 다음과 같이 정리된다(日本外交文書 終戦処理 1卷 수록).</p>
<table>
  <thead>
    <tr><th>역할</th><th>인물</th><th>당시 직위</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>단장(全権)</strong></td><td>가와베 도라시로(河辺虎四郎)</td><td>육군 중장 / 대본영 참모차장</td></tr>
    <tr><td>외무 수석</td><td>오카자키 가쓰오(岡崎勝男)</td><td>외무성 종전연락중앙사무국 차장</td></tr>
    <tr><td>육군 작전</td><td>호리바 가즈오(堀場一雄)</td><td>육군 대좌 / 작전과장</td></tr>
    <tr><td>해군 대표</td><td>데라쿠라 마사오(寺倉正三)</td><td>해군 소장</td></tr>
    <tr><td>해군 작전</td><td>기시 류이치(木藤龍一)</td><td>해군 대좌</td></tr>
    <tr><td>통역·기록</td><td>마쓰모토 슌이치 외 5명</td><td>외무성·해군성 실무진</td></tr>
  </tbody>
</table>
<p>전체 인원은 16~17명(자료별 편차)으로 사료에 따라 다소 다르며, 다수가 야간 비행 경험이 부족했던 점이 회고록에 반복적으로 등장한다. 사절단 인선의 핵심 원칙은 <em>"군부와 외무가 함께 가지 않으면 본국 합의 도출 불가"</em>였고, 이는 회담 후 도쿄 귀환 시 군부 강경파 설득의 직접 자산이 되었다.</p>`,
    },
    {
      order: 2,
      title: '항공편 — 가시와비행장 → 이에지마 → 마닐라',
      sectionType: 'process',
      content: `<p>사절단은 8월 19일 새벽 도쿄 외곽 <strong>가시와비행장(柏飛行場, 현 지바현 가시와시)</strong>에서 출발했다. 항공기는 일본 해군의 <strong>L2D 제로식 수송기</strong>(미츠비시 제작, DC-3 라이센스 생산형) 2대였다.</p>
<ul>
  <li><strong>1호기 — "Bataan" 호환</strong>: 가와베 단장·오카자키 외에 단장 직속 5명 탑승.</li>
  <li><strong>2호기</strong>: 호리바·데라쿠라 등 육해군 실무 6명 + 통역·기록 4명.</li>
  <li><strong>식별 도장</strong>: GHQ 지령에 따라 양 기체 동체 양 측면에 <strong>흰 십자(✚)</strong>를 굵게 도장. 이는 미군 식별·오격추 방지용으로, 사절단 회고록에서는 "치욕의 십자"로 기록되었다.</li>
</ul>
<p>비행 경로는 다음과 같다.</p>
<ol>
  <li>05:50 가시와 출발(현지 시간).</li>
  <li>10:00경 오키나와 이에지마(伊江島) 도착 — 미군 비행장에서 급유 + 미군 호위기 인계.</li>
  <li>이에지마에서 미군 C-54 수송기로 환승, 가와베 사절단 일행이 분승.</li>
  <li>17:00경 마닐라 니콜스 비행장(Nichols Field) 도착.</li>
  <li>마닐라 시내 호텔(Rosario Hotel)로 호송, 무장 헌병 4중 경비 하에 숙박.</li>
</ol>
<p>이에지마에서 환승된 이유는 (1) 일본 항공기의 항속거리(2,000km) 한계, (2) 미군 측의 안전·정보보안 요구 양쪽이었다. 환승 절차에서 사절단의 휴대 문서·필기구·시계까지 모두 미군 보안 검사를 거쳤으며, 가와베 단장은 회고록에서 <em>"기왓장 한 장의 무게도 우리 어깨에 앉은 듯 느꼈다"</em>고 기술했다.</p>`,
    },
    {
      order: 3,
      title: '제1차 회담(8월 19일 저녁) — 의제 제시와 General Order No.1',
      sectionType: 'process',
      content: `<p>8월 19일 19:00 마닐라 시청 인근 <strong>AFPAC(미 육군 태평양총사령부) 임시 본부</strong>에서 1차 회담이 시작되었다. 미국 측 주재는 <strong>리처드 K. 서덜랜드 중장(R. K. Sutherland, 참모장)</strong>, 일본 측 단장은 가와베 중장.</p>
<p>맥아더 SCAP은 회담장에 직접 등장하지 않았다. 이는 (1) 의도된 거리두기로 위계를 명확히 하고, (2) 합의 사항이 SCAP의 결재(裁可)를 한 단계 거쳐야 발효된다는 점을 일본 측에 인식시키기 위한 연출이었다(서덜랜드 회고록·Willoughby Papers 기록).</p>
<p>1차 회담의 핵심 의제는 다음과 같이 제시되었다.</p>
<ol>
  <li><strong>General Order No.1 인계</strong> — 미국 정부가 8월 17일 트루먼 대통령 결재로 작성한 일본군 무장해제 일반명령. 21개 조항 중 일본 본토·한반도·만주·인도차이나·동남아·태평양 도서별 무장해제 분담을 규정.</li>
  <li><strong>연합군 진주 일정</strong> — 8월 28일 선견대 도착, 8월 30일 본대 도착(아쓰기), 9월 2일 항복 조인.</li>
  <li><strong>진주 지점</strong> — 아쓰기·요코스카·사세보·구레 등 7개 1차 거점.</li>
  <li><strong>일본 측 협조 의무</strong> — 비행장 정비, 통신·보급 협조, 일본 측 무장 헌병 배치 금지.</li>
</ol>
<p>가와베 단장은 즉답을 피하고 본국 청훈(請訓)이 필요한 사항을 정리하고자 했으나, 서덜랜드는 <em>"이 회담은 협상이 아니라 절차의 통보"</em>임을 명백히 했다. 다만 *진주 시기를 8월 26일 → 8월 28일로 이틀 미루는 데*는 합의했는데, 일본 본토 군부 강경파(특히 항공총군) 통제를 위한 시간 확보 명목이었다.</p>
<p>1차 회담은 21:30 종료. 가와베 사절단은 호텔로 돌아가 본국과 무선 교신을 시도했으나, 미군이 통신 보안을 이유로 즉시 송수신을 거부, *교신은 마닐라발 미군 전문으로 일원화*되었다.</p>`,
    },
    {
      order: 4,
      title: '제2차 회담(8월 20일 오전) — 세부 절차 정리·천황 처우',
      sectionType: 'process',
      content: `<p>8월 20일 09:30 2차 회담이 시작되었다. 1차에서 제시된 의제의 세부 사항이 정리되었고, 다음의 주요 사항이 합의되었다.</p>
<ol>
  <li><strong>항복 문서 초안 인계</strong> — 9월 2일 미주리함 갑판에서 사용될 정식 문서 초안이 사절단에게 전달됨. 본문은 영어 1개 정본, 일본어는 *번역문* 자격(서명 효력은 영어판에 한정).</li>
  <li><strong>서명자 지정 요구</strong>: 일본 측은 (1) 정부 대표(외무대신 시게미쓰 마모루로 결정될 예정), (2) 군 대표(참모총장 우메즈 요시지로). 미국 측 대표 외에 영국·소련·중국·캐나다·호주·뉴질랜드·네덜란드·프랑스 8개국이 추가 서명.</li>
  <li><strong>일본군 무장해제 일정</strong> — 8월 22일 일본 정부가 무장해제 명령을 전군에 하달. 9월 8일까지 일본 본토 무장해제 80% 완료.</li>
  <li><strong>연합군 진주 시 일본 측 의무</strong> — 비행장 통신·연료 보급, 도시 거리 *일본 군경 통제선 60m 후방으로 격퇴*, 우호적 환영 의식 금지(중립 기조 유지).</li>
  <li><strong>천황 처우 — 구두 합의</strong>: 가와베 단장이 직접 제기. 서덜랜드는 *"천황의 신변 안전과 황실의 존속에 대해 SCAP이 부정적 조치를 즉각 취할 의도가 없다"*는 비공식 입장을 전달. 문서화는 거부되었으나, 사절단은 이를 본국에 *"보존 가능"* 신호로 해석하여 보고. 9월 27일 천황-맥아더 회견의 길이 이 자리에서 사실상 열렸다.</li>
</ol>
<p>2차 회담은 12:00에 종료. 가와베 사절단은 점심 후 마닐라 시청에서 General Order No.1 정본·항복 문서 초안·진주 일정 부속 문서를 인수받았고, 14:00경 니콜스 비행장으로 호송되어 16:30 출발했다.</p>
<p>맥아더 SCAP은 2차 회담에 5분간 등장해 사절단과 인사만 나누고 떠났다. 이때 가와베 단장과 직접 악수를 나누었으나 기록상 발언은 없었다.</p>`,
    },
    {
      order: 5,
      title: 'General Order No.1 — 동아시아 분할 점령의 골격',
      sectionType: 'aftermath',
      content: `<p>마닐라 회담에서 사절단이 인수한 <strong>General Order No.1(일반명령 제1호)</strong>은 그 자체로 전후 동아시아 정치 지형을 결정한 핵심 문서다. 미국 정부가 8월 17일 트루먼 대통령 재가 하에 작성하여 8월 19일 마닐라에서 일본 측에 인계되었다.</p>
<p>주요 무장해제 분담은 다음과 같다(전체 21개 조항 중 일부).</p>
<table>
  <thead><tr><th>지역</th><th>일본군 항복 대상</th></tr></thead>
  <tbody>
    <tr><td>일본 본토 + 류큐(오키나와)</td><td>미국</td></tr>
    <tr><td>한반도 <strong>북위 38도 이북</strong></td><td><strong>소련</strong></td></tr>
    <tr><td>한반도 <strong>북위 38도 이남</strong></td><td><strong>미국</strong></td></tr>
    <tr><td>중국 본토(동북·만주 제외) + 대만 + 인도차이나 16도 이북</td><td>중국 국민정부</td></tr>
    <tr><td>만주(중국 동북) + 38도 이북 한반도 + 사할린 + 쿠릴 일부</td><td>소련</td></tr>
    <tr><td>인도차이나 <strong>북위 16도 이남</strong></td><td>영국</td></tr>
    <tr><td>동남아 도서·말레이·홍콩</td><td>영국</td></tr>
    <tr><td>네덜란드령 동인도(인도네시아)</td><td>영국 → 네덜란드 이양</td></tr>
    <tr><td>태평양 도서(미크로네시아 등)</td><td>미국</td></tr>
  </tbody>
</table>
<p><strong>역사적 의의:</strong></p>
<ul>
  <li>한반도 38선은 1945년 8월 10~11일 미국 국무·전쟁성·해군성 합동위원회에서 데이비드 딘 러스크와 찰스 본스틸 두 대령이 30분 만에 작성한 임시 분할선이었으나, General Order No.1을 통해 *공식 분담선*이 되어 분단의 직접 근원이 되었다.</li>
  <li>인도차이나 16도선은 베트남 분단(이후 17도선)의 직접 전사로, 베트남 독립전쟁(1946-1954)과 베트남 전쟁의 지정학적 시발점.</li>
  <li>홍콩 분담을 둘러싸고 영국과 중국 국민정부가 경쟁했으나 영국이 우선권을 확보, 1997년 반환까지의 식민지 체제가 연장되었다.</li>
</ul>
<p>가와베 사절단이 이 문서를 도쿄로 가져와 8월 21일 본국에 보고했고, 일본 정부는 8월 22일 전군에 무장해제 명령을 하달했다.</p>`,
    },
    {
      order: 6,
      title: '천황 보존 구두 합의의 함의',
      sectionType: 'aftermath',
      content: `<p>마닐라 회담의 가장 정치적으로 민감한 합의는 *문서로 남지 않은* 천황 처우 합의였다. 가와베 단장은 회고록에서 다음과 같이 기술했다(「市ヶ谷台より市ヶ谷台へ」 1962, p.328).</p>
<blockquote>
"서덜랜드 장군은 천황의 안전에 관한 명시적 보장을 거부했으나, 동시에 어떠한 부정적 즉각 조치도 계획하지 않는다고 분명히 말했다. 나는 이 발언을 *조용한 보존 약속*으로 받아들였다."
</blockquote>
<p>이 발언은 단순한 사적 이해가 아니라 미국 정부 내부에서 이미 확정된 정책 방향을 반영했다. 1945년 8월 10~14일 워싱턴에서 헨리 스팀슨 전쟁장관·딘 애치슨 국무차관·존 매클로이 등이 *천황 보존을 통한 일본 무장해제의 효율적 실행*을 결정했고, SCAP에 이 방침이 사전 통보되어 있었다(JCS 1380/15 문서, 1945-08-14).</p>
<p>마닐라 회담의 천황 처우 구두 합의는 다음과 같은 후속 사건의 직접 토대가 되었다.</p>
<ol>
  <li><strong>1945년 9월 27일 천황-맥아더 회견</strong>: 미국 대사관에서 단독 회견. 천황이 "전쟁의 모든 책임은 자신에게 있다"고 발언, 맥아더가 *"이 분이야말로 진정한 신사"*로 평가. 회견 후 천황·맥아더 동시 촬영 사진이 일본 전국 신문에 게재되어 천황의 권위와 점령 통치의 정당성을 동시에 시각화.</li>
  <li><strong>1946년 1월 1일 인간선언(人間宣言)</strong>: 천황 자신이 "현인신(現人神)" 신성성을 부정. 헌법 제정의 길을 여는 정치적 의식.</li>
  <li><strong>1947년 5월 3일 일본국 헌법 제1조</strong>: "천황은 일본국의 상징이며 일본 국민통합의 상징(国民統合の象徴)" — 상징천황제 확립.</li>
</ol>
<p>한편, 이 합의는 도쿄 전범 재판(IMTFE, 1946~1948)에서 천황을 기소 대상에서 제외한 결정의 사실상 출발점이기도 하며, 호주·뉴질랜드·소련 등 일부 연합국이 이를 강하게 비판하는 빌미가 되었다.</p>`,
    },
    {
      order: 7,
      title: '사료와 학계의 평가',
      sectionType: 'aftermath',
      content: `<p>마닐라 사전 회담은 형식상 *기술 회담*이었으나, 그 결과는 전후 동아시아 70년의 정치 지형을 결정한 *전략 회담*에 가까웠다. 학계의 주요 평가와 1차 사료를 정리한다.</p>
<h4>1차 사료</h4>
<ul>
  <li><strong>가와베 도라시로 회고록</strong> 「市ヶ谷台より市ヶ谷台へ」(時事通信社, 1962) — 사절단장 직접 기술. 사절단 인선·항공편·회담 분위기·천황 합의 해석에 관한 단일 가장 상세한 기술.</li>
  <li><strong>일본 외무성 외교사료관</strong> 「終戦処理関係」 1~3권 — 외무성 사이드 공식 회담록·전문·사후 보고서.</li>
  <li><strong>미국 국립문서기록관리청(NARA)</strong> RG 165 War Department / RG 218 Joint Chiefs of Staff — General Order No.1 작성·전달 문서, AFPAC 회담 회의록.</li>
  <li><strong>맥아더 기념관(MacArthur Memorial Archives)</strong> — Sutherland Papers 중 마닐라 회담 메모.</li>
  <li><strong>오카자키 가쓰오 회고록</strong> 「終戦をめぐる断章」(1965) — 외무 라인의 시각.</li>
</ul>
<h4>주요 학술 분석</h4>
<ul>
  <li><strong>가토 요코</strong>(加藤陽子) 「終戦史録」(東京大学出版会, 1980) — 종전사 표준 통사로, 마닐라 회담을 *"사전 협의가 사후 정당화의 형식이 된 회담"*으로 분석.</li>
  <li><strong>존 다워</strong>(John Dower) "Embracing Defeat" (W.W. Norton, 1999) — 점령 통치의 시작점으로 마닐라 회담의 결정적 역할 강조.</li>
  <li><strong>리처드 프랭크</strong>(Richard B. Frank) "Downfall: The End of the Imperial Japanese Empire" (Random House, 1999) — 미국 측 일정의 지정학적 의도 분석.</li>
  <li><strong>나가이 가즈</strong>(永井和) 「天皇不問の原点」(2008, 京都大学人文研報告) — 천황 처우 구두 합의를 IMTFE의 천황 불기소 결정과 직접 연결.</li>
</ul>
<h4>학계의 주요 쟁점</h4>
<ol>
  <li><strong>"실질 협상" vs "절차 통보"</strong> — 일본 측 자료는 *합의*로, 미국 측 자료는 *통보*로 기술. 진주 시기 이틀 연기와 천황 처우는 명백히 협상 영역.</li>
  <li><strong>천황 처우 합의의 법적 성격</strong> — 구두 합의의 효력 범위. SCAP 단독 의사 vs 워싱턴의 사전 정책의 반영.</li>
  <li><strong>General Order No.1의 즉흥성</strong> — 38선 작성 30분 일화는 분단의 우연성을 강조하지만, 정작 인계 자리(마닐라)는 동아시아 분할 정책의 *공식 발효 시점*.</li>
</ol>
<p>마닐라 회담은 일본 종전사·동아시아 점령사·한반도 분단사의 결절점이며, 단일 사건으로 가장 압축적으로 1945년 8월의 동아시아를 보여주는 *사건의 사건*으로 평가된다.</p>`,
    },
  ]

  console.log('\n  📜 본문 섹션 등록...')
  for (const s of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId: event.id, title: s.title },
    })
    if (exists) {
      console.log(`    ⏭️  ${s.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: event.id,
        title: s.title,
        content: s.content,
        order: s.order,
        sectionType: s.sectionType,
      },
    })
    console.log(`    ✅ ${s.title}`)
  }

  // ── 4. EventCountryRelation ───────────────────────────────────────
  console.log('\n  🌍 국가 관계 등록...')
  type RelInput = {
    historicalCountryName?: string
    countryName?: string
    role: EventCountryRole
    roleDescription?: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '일본 제국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '사절단 파견국. 가와베 도라시로 단장이 인솔한 16~17명 사절단 파견.',
    },
    {
      countryName: '미국',
      role: EventCountryRole.INITIATOR,
      roleDescription: '회담 주재국. 맥아더 SCAP 위임으로 서덜랜드 참모장이 회담 진행.',
    },
    {
      countryName: '필리핀',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '회담 개최지(마닐라). 1945년 7월 4일 미국으로부터 자치 회복, 회담 시점 미군 점령 행정 지속.',
    },
    {
      countryName: '영국',
      role: EventCountryRole.OBSERVER,
      roleDescription: '연합국 일원. General Order No.1로 동남아·홍콩 무장해제 분담 부여. 회담에는 직접 참석 X.',
    },
    {
      countryName: '중국',
      role: EventCountryRole.OBSERVER,
      roleDescription: '연합국 일원. 중국 본토·대만·인도차이나 16도 이북 무장해제 분담. 회담에는 직접 참석 X.',
    },
    {
      historicalCountryName: '소비에트 사회주의 공화국 연방',
      role: EventCountryRole.OBSERVER,
      roleDescription: '연합국 일원. 만주·사할린·쿠릴·한반도 38도 이북 무장해제 분담. 회담에는 직접 참석 X — 별도 채널로 일본과 교섭.',
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
      if (!hc) { console.warn(`    ⚠️  hc 미존재: ${rel.historicalCountryName}`); continue }
      historicalCountryId = hc.id
    } else if (rel.countryName) {
      const c = await prisma.country.findFirst({
        where: { name: rel.countryName },
        select: { id: true },
      })
      if (!c) { console.warn(`    ⚠️  현대 국가 미존재: ${rel.countryName}`); continue }
      countryId = c.id
    }
    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId: event.id,
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
        role: rel.role,
      },
    })
    if (exists) {
      console.log(`    ⏭️  ${rel.historicalCountryName ?? rel.countryName} (${rel.role})`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: event.id,
        countryId,
        historicalCountryId,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ ${rel.historicalCountryName ?? rel.countryName} (${rel.role})`)
  }

  // ── 5. PersonEvent ─────────────────────────────────────────────────
  console.log('\n  👥 인물 관계 등록...')
  const personLinks: { originalName: string; role: string; note: string }[] = [
    {
      originalName: 'Kawabe Torashirō',
      role: '일본 측 사절단장(全権)',
      note: '대본영 참모차장. 가와베 사절단 16~17명 인솔. 회담 결과를 도쿄로 가져와 군부 강경파 설득.',
    },
    {
      originalName: 'Douglas MacArthur',
      role: '연합군 최고사령관(SCAP)',
      note: '회담은 서덜랜드 참모장에 위임. 2차 회담 마지막에 5분간 등장해 가와베 단장과 악수.',
    },
    {
      originalName: 'Shidehara Kijūrō',
      role: '회담 후속 외교 라인',
      note: '회담 자체엔 직접 참여 X. 회담 결과 보고를 받은 외무 라인의 좌장 격(영미 협조파). 1945-10-09 총리 취임 후 GHQ 5대 개혁 지령 수용.',
    },
  ]

  for (const link of personLinks) {
    const person = await prisma.person.findFirst({
      where: { originalName: link.originalName },
      select: { id: true },
    })
    if (!person) {
      console.warn(`    ⚠️  인물 미존재: ${link.originalName}`)
      continue
    }
    const exists = await prisma.personEvent.findFirst({
      where: { personId: person.id, eventId: event.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${link.originalName}`)
      continue
    }
    await prisma.personEvent.create({
      data: {
        personId: person.id,
        eventId: event.id,
        role: link.role,
        note: link.note,
      },
    })
    console.log(`    ✅ ${link.originalName} (${link.role})`)
  }

  console.log(`\n✅ 마닐라 사전 회담 시딩 완료\n`)
}
