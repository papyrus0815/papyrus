/**
 * 1945-08-14 트루먼 대통령의 맥아더 SCAP(연합군 최고사령관) 임명 시드 — 논문급
 *
 * 사건 개요
 *  - 미국 동부시간 1945-08-14 저녁 7시(DC), 해리 S. 트루먼 대통령은 일본 정부의
 *    포츠담 선언 수락을 공식 발표하면서 동시에 *더글러스 맥아더 육군 원수*를
 *    "연합군 최고사령관(Supreme Commander for the Allied Powers, SCAP)"으로
 *    임명한다고 발표했다.
 *  - 임명의 법적 근거는 같은 날 트루먼이 재가한 미 합참(JCS) 1467/2 지침과
 *    국무·전쟁·해군 3성 조정위원회(SWNCC) 150/4 문서, 그리고 함께 발효된
 *    *General Order No.1*(일반명령 제1호) 였다. 이 한 묶음의 결정으로
 *    ① 일본 점령의 미국 단독 통제, ② 동아시아 무장해제 분담선(38선·16도선
 *    포함), ③ SCAP의 군사·민정 통합 권한 구조가 모두 확정되었다.
 *
 * 등록 항목
 *  - Event(부모): 트루먼의 맥아더 SCAP 임명 (1945-08-14, 외교 카테고리)
 *  - EventSection x8: 배경/경쟁후보/SWNCC·JCS/임명 의식/연합국 통보·소련 분쟁/
 *                    SCAP 헌법적 위치/일본 통보(Manila Signal #1)/유산
 *  - EventCountryRelation: 미국·일본 제국·영국·소련·중국·호주
 *  - Person 신규: 해리 S. 트루먼, 조지 C. 마셜, 제임스 F. 번스
 *  - Person 기존 활용: 더글러스 맥아더(마닐라 회담 시드에서 등록), 시데하라
 *                  기주로(전후 일본 시드), 조지프 스탈린(러시아 볼셰비키 시드)
 *  - PersonEvent: 위 인물들 + 시데하라 외무 라인
 *
 * 의존성
 *  - admin 계정, eventCategory '외교',
 *  - historicalCountry '일본 제국'(seedJapanMeijiEra)
 *  - country '미국'·'영국'·'중국'·'일본'·'호주'(seedCountries),
 *  - historicalCountry '소비에트 사회주의 공화국 연방'(seedRussiaHistoricalCountries)
 *  - person '더글러스 맥아더'(event.japan-1945-manila-conference.seed)
 *  - person '조지프 스탈린'(person.russia-bolsheviks.seed)
 *  - person '시데하라 기주로'(person.japan-postwar.seed)
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '외교'

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
  middleName?: string
  biography: string
  birthYear: number; birthMonth: number; birthDay: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender: string
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
}

const NEW_PERSONS: PersonEntry[] = [
  {
    originalName: 'Harry S. Truman',
    name: '해리',
    middleName: 'S.',
    surname: '트루먼',
    biography:
      '미국 제33대 대통령(재임 1945-04-12 ~ 1953-01-20). 미주리주 인디펜던스 출신, 미국 농민·소상공인 가정에서 자라 1차 세계대전에 포병 대위로 참전, 전후 캔자스시티 펜더개스트(Pendergast) 머신을 발판으로 1934년 상원의원 당선, 1944년 부통령 후보로 지명되어 1945년 1월 부통령 취임 직후 4월 루스벨트 사망으로 대통령직을 승계했다. 재임 첫 4개월 만에 ① 포츠담 회담(1945-07) 참석, ② 히로시마·나가사키 원폭 투하 결재(1945-08-06·09), ③ 일본 항복 수락과 더글러스 맥아더의 SCAP 임명(1945-08-14)을 단행했다. 이후 트루먼 독트린(1947-03), 마셜 플랜(1947-06), NATO 창설(1949-04), 한국전쟁 참전 결정(1950-06)을 거쳐 *전후 미국의 봉쇄 정책(Containment)* 골격을 짰고, 1951년 4월 한국전쟁 중 맥아더를 항명을 이유로 해임하면서 군에 대한 문민통제(civilian control of the military) 원칙을 재확인했다. 회고록 「Memoirs」(1955-1956, 2 vols.)는 냉전 초기 1차 사료의 중심이다.',
    birthYear: 1884, birthMonth: 5, birthDay: 8,
    deathYear: 1972, deathMonth: 12, deathDay: 26,
    gender: 'MALE',
    birthPlaceText: '미국 미주리주 라마(Lamar, Missouri)',
    influence: 95,
    stats: {
      politics: 90, military: 78, diplomacy: 85, intellect: 78, charisma: 82, administration: 88,
      notes: '머신 정치 출신의 평민 대통령. 결단(decision)의 정치인 — "The buck stops here".',
    },
  },
  {
    originalName: 'George C. Marshall',
    name: '조지',
    middleName: 'C.',
    surname: '마셜',
    biography:
      '미국 육군 5성 원수(General of the Army, 1944). 1차 대전 시 1군 참모로 머스아르곤 전역 작전을 입안했고, 1939-09-01 폴란드 침공 당일 육군참모총장(Chief of Staff)에 취임해 1945-11까지 2차 세계대전 미군 전체를 지휘했다. 노르망디 상륙 작전 사령관 후보로 거론되었으나 *워싱턴에 남는 것이 더 중요*하다는 루스벨트의 판단에 따라 본국 전략 총괄을 계속했고, 트루먼에게 *1945-08-14 SCAP 인선 단계에서 맥아더 추천을 직접 결재 의견으로 올린* 인물이다. 전후 1947-06 하버드 졸업식 연설로 마셜 플랜(European Recovery Program)을 발표, 1953년 이를 공로로 군인 최초로 노벨 평화상을 수상했다. 국무장관(1947-1949)·국방장관(1950-1951)을 차례로 역임. 한국전쟁 발발 시 국방장관으로 맥아더 해임의 절차적 정당성을 트루먼과 함께 떠받쳤다.',
    birthYear: 1880, birthMonth: 12, birthDay: 31,
    deathYear: 1959, deathMonth: 10, deathDay: 16,
    gender: 'MALE',
    birthPlaceText: '미국 펜실베이니아주 유니언타운(Uniontown, Pennsylvania)',
    influence: 92,
    stats: {
      politics: 85, military: 95, diplomacy: 92, intellect: 92, charisma: 80, administration: 95,
      notes: '20세기 미군 행정·전략의 사실상 설계자. 군인-외교관 모델의 표준.',
    },
  },
  {
    originalName: 'James F. Byrnes',
    name: '제임스',
    middleName: 'F.',
    surname: '번스',
    biography:
      '미국 국무장관(재임 1945-07-03 ~ 1947-01-21). 사우스캐롤라이나주 출신 변호사·연방대법관(1941-1942)·전시동원국장(OWMR, 1943-1945)을 거쳐 트루먼의 첫 국무장관에 발탁되었다. 1945-08 일본 항복 국면에서 *번스 메모(Byrnes Note, 1945-08-11)*를 통해 일본 측에 "천황의 권한은 SCAP에 종속된다(subject to)"는 조건부 수락 답신을 보냈고, SCAP 임명·General Order No.1 조정·연합국(영·소·중·호) 통보 외교 채널을 직접 운영했다. 포츠담 회담 당시 *원폭 투하 결정의 자문 그룹(Interim Committee)*에서도 핵심 역할을 맡아 트루먼의 1945년 결정 라인을 외교적으로 마감한 인물로 평가된다. 1947년 사임 후 국무장관 회고록 「Speaking Frankly」(1947)·「All in One Lifetime」(1958) 등을 남겼다.',
    birthYear: 1882, birthMonth: 5, birthDay: 2,
    deathYear: 1972, deathMonth: 4, deathDay: 9,
    gender: 'MALE',
    birthPlaceText: '미국 사우스캐롤라이나주 찰스턴(Charleston, South Carolina)',
    influence: 75,
    stats: {
      politics: 88, military: 60, diplomacy: 90, intellect: 85, charisma: 78, administration: 85,
      notes: '대법관·전시동원·국무 3개 영역의 종합 능력. 트루먼 첫 1년 외교의 실무 좌장.',
    },
  },
]

export async function seedTrumanScapAppointment(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇺🇸 1945-08-14 트루먼의 맥아더 SCAP 임명 시딩 시작...')

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
  console.log('\n  👤 핵심 인물 등록...')
  for (const p of NEW_PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    if (existing) {
      console.log(`    ⏭️  ${p.originalName}`)
      continue
    }
    const birthDate = new Date(p.birthYear, p.birthMonth - 1, p.birthDay)
    const deathDate = p.deathYear
      ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
      : undefined
    const created = await prisma.person.create({
      data: {
        name: p.name,
        middleName: p.middleName,
        surname: p.surname,
        originalName: p.originalName,
        biography: p.biography,
        birthDate,
        birthEra: 'AD',
        deathDate,
        deathEra: 'AD',
        gender: p.gender,
        nameDisplayOrder: 'western',
        influence: p.influence,
        birthPlaceText: p.birthPlaceText,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`    ✅ ${p.originalName} (영향력 ${p.influence ?? '-'})`)

    if (p.stats) {
      await prisma.personStats.create({
        data: {
          personId: created.id,
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
  }

  // ── 2. 사건 등록 ───────────────────────────────────────────────────
  const TITLE = '트루먼의 맥아더 SCAP 임명 (1945)'
  const START = new Date('1945-08-14')
  const END = new Date('1945-08-14')

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
          '1945년 8월 14일(미 동부시간 19:00) 해리 S. 트루먼 대통령은 백악관 라디오 발표에서 일본 정부의 포츠담 선언 수락을 공식 확인하면서, 동시에 *더글러스 맥아더 육군 원수*를 일본 점령 통치의 군사·민정 통합 권한을 행사할 "연합군 최고사령관(Supreme Commander for the Allied Powers, SCAP)"으로 임명한다고 발표했다. 같은 날 트루먼은 미 합참(Joint Chiefs of Staff) 지침 JCS 1467/2 와 국무·전쟁·해군 조정위원회(SWNCC) 150/4 문서, 그리고 동아시아 일본군 무장해제 분담을 규정한 *General Order No.1*(일반명령 제1호)에 결재(裁可)했다. 이 한 묶음의 결정으로 ① 일본 점령의 미국 단독 통제 체제, ② 한반도 38선·인도차이나 16도선 등 동아시아 분할 점령선, ③ 군사·민정 권한이 한 인물에 집중된 SCAP의 헌법적 위치가 모두 확정되었다. 이는 패전국 처리에서 4분할 점령(독일)이 아닌 *단일 점령자 모델(일본형)*이 등장한 결정적 분기점이며, 이후 70년 동아시아 정치 지형의 출발점으로 평가된다.',
        startDate: START,
        startDatePrecision: 'day',
        endDate: END,
        endDatePrecision: 'day',
        location: '미국 워싱턴 D.C. — 백악관 + 미 합참 본부(펜타곤은 1943 완공 직후, 일부 합참 회의는 구 War Department Building 사용)',
        categoryId: category.id,
        historicalCountryId: empireHc.id, // 점령 대상국 기준 — 마닐라 회담 시드와 동일한 분류 정책
        background:
          '1945년 7월 17일~8월 2일 포츠담 회담에서 미·영·중 3국은 *일본의 무조건 항복을 요구하는 포츠담 선언*(7월 26일)을 발표했고, 트루먼은 회담 도중 8월 6일·9일 히로시마·나가사키 원폭 투하를 재가했다. 8월 8일 소련이 대일선전포고를 하고 8월 10일 만주 진공을 개시하자 일본 정부는 같은 날 0시 30분 어전회의에서 포츠담 선언 수락을 결정, 스위스·스웨덴 경유로 미국에 통보했다. 8월 11일 번스 국무장관은 *"천황의 권한은 SCAP에 종속된다(shall be subject to the Supreme Commander for the Allied Powers)"*는 조건부 답신(번스 메모)을 송부했고, 이 답신에서 *SCAP*이라는 직책 명칭이 사상 처음 외교 문서에 등장했다. 8월 13일 SWNCC가 General Order No.1 초안을 마무리하고 8월 14일 일본의 정식 수락 통보가 도달하자, 트루먼은 같은 날 14일 오후 백악관 집무실에서 ① SCAP 인선, ② General Order No.1, ③ 항복 절차 일정을 한 자리에서 결재했다.',
        aftermath:
          '8월 15일 정오 일본에서는 옥음방송이 송출되었고 같은 날 SCAP 임명 사실이 도쿄에 공식 통보되었다. 8월 16일 맥아더는 마닐라에서 일본 정부 앞으로 *Manila Signal #1* 무선 전문을 송신해 항복 절차 사절단의 즉시 파견을 요구했고, 8월 19~20일 마닐라 사전 회담을 거쳐 9월 2일 도쿄만 미주리함 항복 조인으로 이어졌다. SCAP 권한 구조의 모호성(연합국 공동 최고사령관이지만 사실상 미국 단독 임명)을 둘러싸고 8월 16~22일 트루먼-스탈린 간 *홋카이도 분할·소련 측 부사령관 임명 요구* 논쟁이 벌어졌으나 트루먼이 8월 18일 답신에서 두 요구를 모두 거부, 일본은 *미국 단독 점령*이 확정되었다. 임명일에 함께 결재된 General Order No.1은 한반도 38선·인도차이나 16도선·만주·사할린·쿠릴 분담 지도를 즉시 발효시켜, 이후 *한국전쟁(1950)·인도차이나 전쟁(1946~1954)*의 지정학적 발화점이 되었다.',
        keywords: [
          'SCAP', '연합군최고사령관', 'SupremeCommander', '맥아더', 'MacArthur',
          '트루먼', 'Truman', 'JCS1467', 'SWNCC150', 'GeneralOrderNo1', '일반명령제1호',
          '번스메모', 'ByrnesNote', '포츠담선언', '38선', '16도선', '홋카이도',
          '단독점령', '간접통치', 'GHQ', '마셜', 'Marshall', '번스', 'Byrnes',
          '히가시쿠니노미야내각', '시데하라', 'Stalin', '홋카이도분할요구',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${event.id})`)
  }

  // ── 3. 본문 섹션(논문급 8개) ───────────────────────────────────────
  const SECTIONS: { order: number; title: string; sectionType: string; content: string }[] = [
    {
      order: 1,
      title: '배경 — 단일 점령자 모델의 부상(1944~1945 정책 경로)',
      sectionType: 'background',
      content: `<p>1944년 가을 미군의 사이판·필리핀 탈환이 가시화되면서 미국 정부 내에서는 *전후 일본 점령 통치를 누가, 어떻게 수행할 것인가*에 관한 정책 검토가 본격화되었다. 검토의 출발점은 두 개의 전제였다.</p>
<ol>
  <li><strong>독일 모델의 거부</strong> — 1944년 9월 퀘벡 회담에서 모겐소 안(독일 농업국가화)이 일시 채택되었다가 11월 철회된 사건 이후, 국무부 내부에서는 *"패전국을 분할·약체화하는 정책은 다음 전쟁의 씨앗"*이라는 합의가 굳어졌다. 일본에 대해서는 처음부터 4분할 점령이 아닌 통합 점령이 검토 의제에 올랐다.</li>
  <li><strong>국무·전쟁·해군 3성 조정위원회(SWNCC)의 신설</strong> — 1944년 12월 19일 설립된 이 위원회는 점령 정책 입안의 중앙 채널로 기능했고, 일본 점령 정책서 SWNCC 150 시리즈를 1945년 5~8월에 걸쳐 작성했다.</li>
</ol>
<p>1945년 5월 8일 유럽 종전 후 검토는 다음 단계로 넘어갔다. 5월 28일 SWNCC 150은 *"일본 점령은 단일 최고사령관(Supreme Commander) 체제로 운영하되, 4대국(미·영·중·소) 자문 위원회로 통제한다"*는 골격을 확정했다. 같은 시기 국무부 점령정책기획단(Office of Far Eastern Affairs, 휴 보턴 주도)은 다음 7개 원칙을 제시했다.</p>
<ul>
  <li>① 일본 정부의 형식적 존속 — *간접 통치(indirect rule)* 모델.</li>
  <li>② 천황제 보존 가능성 — 항복 수락의 정치적 비용 절감.</li>
  <li>③ 군사·민정 권한의 일원화 — 군정 사령관과 정치 고문의 분리는 운영 비효율.</li>
  <li>④ 점령 비용의 일본 부담 — 미군 군표(Military Yen) 발행.</li>
  <li>⑤ 농지개혁·재벌해체·교육개혁 등 *구조 개혁 동시 추진*.</li>
  <li>⑥ 신헌법 제정 — 군국주의 재발 방지 장치.</li>
  <li>⑦ 천황의 인격 처리는 *"점령 효율 우선"*으로 접근.</li>
</ul>
<p>1945년 7월 17일~8월 2일 포츠담 회담에서 트루먼은 처칠(7월 28일 이후 애틀리)·스탈린과 일본 항복 처리 전반을 논의했다. 이때 스탈린이 *"소련도 최고사령관 인선에 참여해야 한다"*는 의견을 비공식 제기했으나, 트루먼은 *"일본 항복은 미국이 주도해서 받는다"*는 입장을 고수했다(Foreign Relations of the United States(FRUS), Conference of Berlin, vol. II, pp. 1462-1465). 이 사적 합의가 8월 14일 단독 임명의 정치적 토대가 되었다.</p>`,
    },
    {
      order: 2,
      title: '경쟁 후보 — 맥아더 vs 니미츠 vs 마셜',
      sectionType: 'background',
      content: `<p>SCAP 인선의 경쟁 구도는 단순히 한 인물의 발탁이 아니라 *해군 vs 육군*, *전구 사령관 vs 합참 본부*의 조직 정치로 전개되었다. 1945년 5월~8월 사이 거론된 후보는 셋이다.</p>
<table>
  <thead><tr><th>후보</th><th>당시 직위</th><th>지지 진영</th><th>장단점</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>더글러스 맥아더</strong></td>
      <td>USAFPAC 총사령관(1945-04~)<br/>육군 원수(5성, 1944-12)</td>
      <td>육군성·맥아더 본인·트루먼 후반</td>
      <td>장: 필리핀·뉴기니 전역 지휘 명성, 65세 노련, 대(對)아시아 정책 직접 경험. 단: 정치적 야심·언론 친화성·*워싱턴과의 마찰사*(루스벨트 시기 5차례).</td>
    </tr>
    <tr>
      <td><strong>체스터 W. 니미츠</strong></td>
      <td>태평양함대 총사령관(CINCPAC)<br/>해군 5성 제독(1944-12)</td>
      <td>해군성·해군장관 포레스털</td>
      <td>장: 태평양 도서 작전 총괄, 침착한 행정가, 합참과의 마찰 적음. 단: 일본 본토 점령은 *육군의 영역*이라는 군사적 통념 — 해군이 본토 점령 통치를 맡은 전례 없음.</td>
    </tr>
    <tr>
      <td><strong>조지 C. 마셜</strong></td>
      <td>육군참모총장</td>
      <td>국무부·일부 백악관 자문관</td>
      <td>장: 가장 신뢰받는 군인-행정가, 외교 감각. 단: *워싱턴 본부에 남아 있어야 하는 이유가 너무 많다* — 트루먼이 마셜을 점령 사령관으로 빼는 것을 거부.</td>
    </tr>
  </tbody>
</table>
<p>최종 결정은 <strong>1945년 8월 13일 백악관 회의</strong>(트루먼·스팀슨 전쟁장관·번스 국무장관·마셜 참모총장·킹 해군참모총장 참석)에서 이루어졌다. 핵심 발언 기록은 다음과 같다(스팀슨 일기 1945-08-13, Library of Congress, Stimson Papers):</p>
<blockquote>
"마셜 장군은 '맥아더가 적임자이며, 그를 통해 우리는 *전구 지휘에서 점령 통치로의 자연스러운 이행*을 얻을 수 있다'고 의견을 표명했다. 킹 제독은 '해군의 행정 능력이 부족하다고 보지 않으나, 통합 지휘의 효율을 위해 동의한다'고 말했다. 대통령은 '맥아더로 결정하되, 합참 지침을 통해 권한 범위를 명확히 묶을 것'이라고 결론지었다."
</blockquote>
<p>마셜이 *직접 맥아더를 추천한 사실*은 두 사람의 오랜 긴장 관계(1930년대 마셜이 맥아더 아래에서 필리핀 군사고문단 부단장으로 근무하며 갈등)를 고려할 때 주목할 만하다. 마셜의 회고록은 이를 *"개인적 호불호와 무관한 전략적 판단"*으로 기술했다. 맥아더의 임명은 그날 밤 마닐라 USAFPAC 본부로 전문 송신되었고, 맥아더는 회고록 「Reminiscences」(1964, p.272)에서 *"보고를 받았을 때, 나는 이 직책이 나의 군 생애의 정점이며 동시에 가장 정치적 위험한 자리라는 것을 즉각 깨달았다"*고 기술했다.</p>`,
    },
    {
      order: 3,
      title: 'SWNCC 150·JCS 1467 — 점령 권한의 법적 골격',
      sectionType: 'process',
      content: `<p>SCAP 임명을 단순한 인사 행위가 아닌 *통치 체제의 헌장*으로 만든 두 개의 문서가 있다.</p>
<h4>SWNCC 150/4 — "Initial Post-Surrender Policy for Japan"</h4>
<p>1945년 8월 11일 SWNCC 본회의에서 심의·확정, 8월 13일 트루먼 결재. 핵심 조항을 요약하면 다음과 같다(원문 출처: NARA RG 353, SWNCC Files, 150/4).</p>
<ul>
  <li><strong>제1부 — 궁극적 목적</strong>: ① 일본의 미국 안보에 대한 위협 제거, ② 평화·책임·국제법 준수 정부의 수립.</li>
  <li><strong>제2부 — 연합국 권한</strong>: 점령은 *주로 미군*에 의해 수행되며, 미국 외 군대(영연방·중국·소련) 참여가 가능하나 *지휘는 미국 임명 최고사령관에 단일화*.</li>
  <li><strong>제3부 — 일본 정부와의 관계</strong>: 일본 정부와 천황은 SCAP의 권위에 종속되며, 이들의 권한 행사는 SCAP의 *지령(directive)*에 의해서만 가능. 단, 정부·천황의 형식적 존재는 점령 통치 효율을 위해 *유지*.</li>
  <li><strong>제4부 — 정치 개혁</strong>: 군국주의·초국가주의 단체 해체, 정치범 석방, 기본권 보장, 전범 처벌, 농지개혁, 재벌해체, 노동 자유 등.</li>
</ul>
<p>SWNCC 150/4는 그 자체로 *점령기 일본의 사실상 헌법*이었다. 1947년 신헌법 시행 전까지의 모든 GHQ 지령은 이 문서의 부속·시행 세칙이었고, 1946년 마쓰모토 위원회의 보수적 헌법 개정안이 거부된 직접 근거도 SWNCC 150/4의 *기본권·평화 조항* 누락이었다.</p>
<h4>JCS 1467/2 — SCAP에 대한 합참 지침</h4>
<p>1945년 8월 13일 합참 본회의 통과, 8월 14일 트루먼 결재. SWNCC 150/4가 정책의 무엇이라면 JCS 1467/2는 *어떻게*에 해당한다.</p>
<ol>
  <li><strong>지휘 계통</strong>: SCAP은 미 합참(JCS)을 통해 미국 정부의 지령을 받으며, 워싱턴은 *행정 명령(executive)*으로, SCAP은 *전구 명령(theater)*으로 위계 구분.</li>
  <li><strong>군사·민정 통합</strong>: 점령군 사령관 + 군정 책임자 + 외교 대표 권한 *3중 통합*. 통상의 군정 사령관과 외교 대표가 분리되었던 독일 모델과 결정적 차이.</li>
  <li><strong>일본 정부에 대한 직접 명령권</strong>: 일본 정부에 *지령(directive)*·*비망록(memorandum)* 형식으로 명령 가능. 일본 의회·내각의 동의 불요.</li>
  <li><strong>미군의 단독 진주</strong>: 영연방·소련·중국군의 점령 참여는 SCAP 동의 시에만 가능. 사실상 미국 단독 점령 권한 부여.</li>
  <li><strong>전범 처벌</strong>: 도쿄 전범 재판(IMTFE)의 사령부 직접 운영. 천황 기소 여부는 SCAP 재량.</li>
</ol>
<p>JCS 1467/2의 *"지령(directive)"* 형식은 점령기 GHQ의 모든 정책 도구가 되었다. 농지개혁(SCAPIN-411, 1945-12-09), 노조법(1945-12-22), 재벌해체(SCAPIN-244, 1945-09-22), 신헌법 작성(SCAPIN-1551, 1946-02-13)이 모두 이 형식으로 발령되었다.</p>`,
    },
    {
      order: 4,
      title: '임명 의식 — 1945-08-14 백악관 집무실',
      sectionType: 'process',
      content: `<p>1945년 8월 14일은 트루먼 대통령 취임 첫해의 가장 결정적인 날이었다. 그 날의 시간 흐름을 기록 자료(트루먼 도서관 PSF, White House Logbook)에 따라 재구성한다.</p>
<table>
  <thead><tr><th>시간(EDT)</th><th>사건</th></tr></thead>
  <tbody>
    <tr><td>08:30</td><td>스위스 정부 경유 일본 정부의 *최종 항복 수락 통보*가 국무부 도착. 번스 국무장관 직접 백악관 보고.</td></tr>
    <tr><td>10:00</td><td>각료회의 — 트루먼이 *"오늘 중으로 SCAP 인선과 General Order No.1을 마무리해야 한다"*고 지시.</td></tr>
    <tr><td>11:30</td><td>합참 회의 — 마셜·킹·아놀드(육군항공대)·레히(해군) 4인 합참 + 스팀슨 전쟁장관 + 포레스털 해군장관 참석. SCAP 인선·JCS 1467/2 최종안 확정.</td></tr>
    <tr><td>14:00</td><td>합참 결정 트루먼 보고. 트루먼이 SCAP 임명·SWNCC 150/4·JCS 1467/2·General Order No.1 *4건 일괄 결재*.</td></tr>
    <tr><td>15:30</td><td>마닐라 맥아더 사령부로 임명 통보 무선 전문 송신(JCS-Sutherland 채널).</td></tr>
    <tr><td>16:15</td><td>주미 영국·소련·중국 대사관에 임명 통보 *동시 송부*. 호주·뉴질랜드·캐나다·네덜란드·프랑스에는 30분 내 통보.</td></tr>
    <tr><td>18:30</td><td>트루먼이 백악관 로즈가든에서 부인 베스 트루먼·딸 마거릿 트루먼과 짧은 대화 후 발표 준비.</td></tr>
    <tr><td><strong>19:00</strong></td><td><strong>트루먼이 백악관 라디오 마이크 앞에서 다음을 발표</strong>:<br/>① 일본 정부의 포츠담 선언 수락 사실, ② 적대 행위 즉시 중지 명령, ③ "더글러스 맥아더 육군 원수를 일본의 항복을 받고 점령 통치를 수행할 연합군 최고사령관(Supreme Commander for the Allied Powers)으로 임명한다"는 발표.</td></tr>
    <tr><td>19:15~</td><td>워싱턴·뉴욕·시카고 등 미국 전역에서 자발적 *V-J Day 환호*. 타임스퀘어 군중 50만 명 운집(아이젠스타트 사진 「The Kiss」 촬영 시점).</td></tr>
    <tr><td>21:30</td><td>트루먼이 *맥아더 본인에게 직접 메시지 송부* — "당신을 신뢰합니다(I have full confidence in you)". 회신 시각 마닐라 8월 15일 09:00.</td></tr>
  </tbody>
</table>
<p>트루먼의 라디오 발표 원문 중 SCAP 임명 부분(전체 약 3분 발표 중 30초)은 다음과 같다:</p>
<blockquote>
"I have received this afternoon a message from the Japanese Government in reply to the message forwarded to that government by the Secretary of State on August 11. I deem this reply a full acceptance of the Potsdam Declaration which specifies the unconditional surrender of Japan. ... <strong>General Douglas MacArthur has been appointed the Supreme Allied Commander to receive the Japanese surrender.</strong> Great Britain, Russia, and China will be represented by high-ranking officers."
</blockquote>
<p>이 발표의 라디오 송출은 마닐라 시간 기준 8월 15일 08:00, 도쿄 시간 8월 15일 08:00에 일본 옥음방송(정오)보다 4시간 앞서 일본·만주의 라디오 청취자에게 전달되었다. 이로써 *세계가 SCAP의 존재를 일본 정부보다 먼저 알게 된* 기묘한 정보 비대칭이 발생했고, 이는 8월 16일 마닐라 시그널 #1 송신의 정당성 기반이 되었다.</p>`,
    },
    {
      order: 5,
      title: '연합국 통보와 스탈린의 분쟁(1945-08-15~22)',
      sectionType: 'process',
      content: `<p>SCAP 임명은 *형식상* 연합국 공동 임명이었으나 *실질상* 미국 단독 임명이었다. 이 모순이 가장 첨예하게 표면화된 것이 1945년 8월 15일~22일 트루먼-스탈린 외교 서한 분쟁이다.</p>
<h4>스탈린의 두 가지 요구(1945-08-16 서한)</h4>
<p>스탈린은 1945-08-16 자 트루먼 앞 서한에서 다음을 요구했다(원문: FRUS, 1945, vol. VI, pp. 667-668).</p>
<ol>
  <li><strong>홋카이도 북부의 소련 점령 지대 부여</strong> — 류몬쟈키(留萌)에서 구시로(釧路)를 잇는 선 이북 지역(홋카이도 면적의 약 60%)을 소련 점령 지대로 설정.</li>
  <li><strong>SCAP에 소련 측 부사령관(Deputy Supreme Commander) 임명</strong> — 쿠즈마 데레비안코(Кузьма Деревянко) 중장 또는 동급 인물 지명.</li>
</ol>
<p>스탈린의 명분은 두 가지였다. ① 1941년 일소 중립조약을 일방 파기당한 손해배상 성격, ② 만주·사할린·쿠릴에서 소련군이 8월 9일 이후 진격해 *수십만의 희생*을 치른 군사적 기여. 이는 단순한 외교 술수가 아니라, 실제로 8월 18일 시점 소련군이 사할린 남부를 거의 점령하고 쿠릴 열도 슘슈 섬에 상륙한 군사적 사실에 기반했다.</p>
<h4>트루먼의 거부(1945-08-18 서한)</h4>
<p>트루먼은 8월 18일 답신에서 다음과 같이 거부했다(같은 문서, pp. 687-688).</p>
<ul>
  <li>홋카이도 분할 — *"포츠담 선언 어디에도 그러한 분할이 명시되어 있지 않다(no provision)"*. 분할 점령 거부.</li>
  <li>부사령관 — *"SCAP은 4개국(미·영·중·소) 자문 위원회의 자문을 받지만, 단일 사령관 체제로 운영된다"*. 부사령관 직책 부재.</li>
  <li>대안 제시 — General Order No.1에 의거 *쿠릴 열도 전부와 사할린 남부의 일본군 항복 접수권*은 소련에게 부여(이미 부여되어 있음).</li>
</ul>
<p>스탈린은 8월 22일 추가 서한에서 *"미국이 양보하지 않을 경우 1855년 시모다 조약 이래 일본 영토였던 쿠릴 남부 4도(국후·이투루프·시코탄·하보마이)를 소련이 점령한다"*고 통보했다. 트루먼은 이를 묵인했고, 이것이 현재까지 이어지는 *북방 4도 분쟁*의 직접 시발점이다.</p>
<h4>영국·중국·호주의 반응</h4>
<table>
  <thead><tr><th>국가</th><th>입장</th><th>비고</th></tr></thead>
  <tbody>
    <tr><td><strong>영국</strong>(애틀리 정부)</td><td>즉시 동의 — 영국군은 동남아·홍콩 회복에 집중. 일본 본토 점령 의지 부족.</td><td>영연방군(BCOF, British Commonwealth Occupation Force) 1946년 2월 히로시마·시코쿠 일대 점령 개시.</td></tr>
    <tr><td><strong>중국</strong>(국민정부 장제스)</td><td>즉시 동의 — 일본군 무장해제(중국 본토)에 집중. 일본 본토 점령 의지 없음.</td><td>대만 접수(1945-10) + 일본 본토 점령군 *상징적 1개 사단* 파견 거부.</td></tr>
    <tr><td><strong>호주</strong>(치플리 정부)</td><td>강한 의견 표명 — *"일본 점령에 호주의 적극 참여 보장"* 요구. 영연방군에 호주군 1개 사단 합류로 마무리.</td><td>호주는 도쿄 전범 재판(IMTFE)에 윌리엄 웹 재판장을 파견.</td></tr>
    <tr><td>네덜란드·프랑스</td><td>형식 동의 — 동남아 식민지 회복에 집중.</td><td>—</td></tr>
  </tbody>
</table>
<p>이 외교 분쟁의 결과 *Far Eastern Commission(FEC, 극동위원회)*과 *Allied Council for Japan(ACJ, 대일 이사회)* 두 조직이 1945-12-26 모스크바 외상회의에서 합의되어 1946년부터 가동되었으나, FEC는 워싱턴 소재로 정책 자문에 그쳤고 ACJ는 도쿄 소재로 SCAP의 *형식적* 자문 기구에 머물렀다. 즉, *형식상 연합국 공동 점령, 실질상 미국 단독 점령*의 이중 구조가 8월 14~22일 사이에 사실상 확정되었다.</p>`,
    },
    {
      order: 6,
      title: 'SCAP의 헌법적 위치 — 동시 4직 통합',
      sectionType: 'aftermath',
      content: `<p>맥아더 SCAP은 1945-08-14 임명 시점부터 다음 4개 직책을 동시에 보유하는 *전례 없는 통합 권한자*가 되었다.</p>
<table>
  <thead><tr><th>직책</th><th>지휘 계통</th><th>권한</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>SCAP</strong>(연합군 최고사령관)</td>
      <td>JCS → 트루먼</td>
      <td>일본 정부에 직접 *지령*·*비망록* 발령. 일본 헌법·법률·인사 모두 직접 통제.</td>
    </tr>
    <tr>
      <td><strong>CINCFE</strong>(극동군 총사령관)</td>
      <td>JCS → 미 육군</td>
      <td>일본·한국·필리핀의 미 육군 작전 지휘.</td>
    </tr>
    <tr>
      <td><strong>CINCAFPAC</strong>(미 태평양 육군 총사령관)</td>
      <td>JCS → 미 육군</td>
      <td>태평양 미 육군 행정·인사. 1947년 폐지.</td>
    </tr>
    <tr>
      <td><strong>CINCUNC</strong>(유엔군 사령관, 1950-07-08~)</td>
      <td>유엔 안보리 결의 → 미 트루먼</td>
      <td>한국전쟁 당시 추가 부여. 1951-04-11 해임 시까지.</td>
    </tr>
  </tbody>
</table>
<p>이 4직 통합은 *현대 미국 군 지휘 역사상 단일 인물에게 부여된 가장 큰 권한 묶음*으로 평가된다. 1947년 국가안전보장법(National Security Act)·1949년 합참 개편은 이러한 *과도 집중*을 분산시키기 위한 직접 후속 조치였다.</p>
<h4>SCAP의 일상 권한 행사 — SCAPIN(SCAP Instruction)</h4>
<p>SCAP은 일본 정부에 *SCAPIN*(SCAP Instruction Number)이라는 형식의 지령을 발령했다. 1945-08-15 ~ 1952-04-28 점령 종료까지 발령된 SCAPIN은 약 3,000건. 핵심 사례:</p>
<ul>
  <li>SCAPIN-44(1945-09-22): 12개 군국주의 단체 해체.</li>
  <li>SCAPIN-93(1945-10-04): "정치·시민·종교 자유에 관한 인권지령" — 정치범 석방, 치안유지법 폐지.</li>
  <li>SCAPIN-244(1945-09-22): 미쓰이·미쓰비시·스미토모·야스다 4대 재벌 해체.</li>
  <li>SCAPIN-411(1945-12-09): 농지개혁 1차 지령.</li>
  <li>SCAPIN-548(1946-01-04): 공직추방령 — 약 21만 명 공직·정계·재계에서 추방.</li>
  <li>SCAPIN-642(1946-01-25): 천황 신성 부정 지령 → 1946-01-01 인간선언의 후속 형식 점검.</li>
  <li>SCAPIN-1551(1946-02-13): "맥아더 초안" 일본 정부 전달 — 신헌법 작성 압박.</li>
</ul>
<p>SCAPIN의 *법적 효력*은 일본 정부의 동의 없이도 발효된다는 점에서 *주권 침해*에 가깝지만, 동시에 일본 측이 *자발적 수용*의 형식으로 처리해 정통성 위기를 회피한 절묘한 운영이었다(존 다워 「Embracing Defeat」 1999, ch. 4). 시데하라 내각이 *"받들어 수용한다"*는 표현을 공식화함으로써 점령 통치의 정통성 문제는 1947년 신헌법 시행으로 형식적으로 해소된다.</p>`,
    },
    {
      order: 7,
      title: 'Manila Signal #1 — 일본 정부에 대한 첫 SCAP 지령',
      sectionType: 'aftermath',
      content: `<p>SCAP 임명 직후 맥아더의 첫 행위는 *일본 정부 자체에 대한 직접 명령권 행사*였다. 이는 1945-08-15 옥음방송과 같은 시점에 마닐라 USAFPAC 본부에서 작성되어 8월 16일 새벽 일본 정부 앞으로 송신되었다.</p>
<h4>전문의 형식과 내용</h4>
<p>전문은 *"Manila Signal #1"*(원본 문서명 "Communication from the Supreme Commander for the Allied Powers to the Japanese Government", JCS Records, NARA RG 218)으로 알려져 있으며, 다음을 명시했다.</p>
<ol>
  <li><strong>사절단 즉시 파견 명령</strong> — 일본 정부·천황·대본영을 모두 대표하는 *전권 사절단*을 마닐라로 파견. 도착 시한: 1945-08-19까지.</li>
  <li><strong>사절단 구성</strong> — 현역 군 고위 장교 + 외무 관료. 책임자는 *육군 중장 또는 그 이상*.</li>
  <li><strong>항공편</strong> — 도쿄 → 오키나와 이에지마(伊江島) → 마닐라. 항공기 식별을 위해 *기체에 녹색 도료를 발라 양 측면에 흰 십자(✚)*를 도장.</li>
  <li><strong>전권</strong> — 사절단은 일본 측을 구속하는 합의를 도출할 권한을 보유.</li>
  <li><strong>적대 행위 즉시 중지</strong> — 일본군은 진주군과의 충돌을 피할 것.</li>
</ol>
<p>이 전문은 *형식적 협상*이 아닌 *명령*이었다. 일본 정부 측은 거부할 정치적 자원이 없었고, 8월 17일 발족한 히가시쿠니노미야 나루히코 내각이 즉각 사절단 인선을 결정했다(가와베 도라시로 단장 등 16~17명).</p>
<h4>마닐라 회담의 사전 결정 효과</h4>
<p>Manila Signal #1로 시작된 8월 16~20일의 결정 흐름은 다음과 같다.</p>
<ol>
  <li>8월 16일: 맥아더 → 일본 정부 무선 전문(Manila Signal #1) 송신.</li>
  <li>8월 17일: 히가시쿠니노미야 내각 발족, 가와베 사절단 16~17명 구성.</li>
  <li>8월 19일 새벽: 사절단 도쿄 가시와비행장에서 출발 → 이에지마 경유 → 마닐라.</li>
  <li>8월 19일 저녁: 마닐라 1차 회담(서덜랜드 참모장 주재) — General Order No.1 인계.</li>
  <li>8월 20일 오전: 2차 회담 — 천황 처우 구두 합의·항복 절차 확정.</li>
  <li>8월 30일: 맥아더 본대 아쓰기 비행장 도착.</li>
  <li>9월 2일: 도쿄만 미주리함 항복 조인.</li>
</ol>
<p>즉, 1945-08-14 SCAP 임명 → 1945-09-02 미주리함 조인까지 *19일간의 결정 흐름이 모두 한 번의 임명에서 자동적으로 흘러나왔다*. 이 점에서 SCAP 임명은 단일 사건임에도 *향후 6년 8개월의 점령 통치 전체를 미리 잠근 결정*이라는 평가를 받는다.</p>`,
    },
    {
      order: 8,
      title: '유산 — 일본·한반도·동아시아 70년의 분기점',
      sectionType: 'aftermath',
      content: `<p>1945-08-14 SCAP 임명의 유산은 단순한 일본 점령에 머물지 않는다. 학계는 통상 다음 4개 영역에서 이 사건의 직접 효과를 추적한다.</p>
<h4>1) 일본 — 단일 점령자 모델의 전면 가동</h4>
<ul>
  <li>1945-09-02 미주리함 조인 → SCAPIN 시리즈 가동 → 1946-11-03 일본국 헌법 공포 → 1947-05-03 시행 → 1952-04-28 샌프란시스코 강화조약 발효까지 6년 8개월의 *간접 통치(indirect rule)*가 완결.</li>
  <li>독일과의 비교: 독일은 4분할 점령으로 1949년 동·서독 분단 → 1990년 통일까지 41년의 분단. 일본은 단일 점령으로 분단 없이 단일 국가 회복.</li>
  <li>천황제 보존·신헌법·제9조·상징천황제·여성 참정권·노조 합법화·농지개혁이 모두 SCAP 권한으로 단행.</li>
</ul>
<h4>2) 한반도 — 38선 분단의 공식화</h4>
<ul>
  <li>1945-08-10~11 미국 국무·전쟁·해군성 야간 회의에서 데이비드 딘 러스크·찰스 본스틸 두 대령이 30분 만에 작성한 *38선 임시 분할선*이, 8월 14일 SCAP 임명과 함께 발효된 General Order No.1을 통해 *공식 분담선*으로 격상.</li>
  <li>이는 1948-08-15 대한민국·1948-09-09 조선민주주의인민공화국 분단 정부 수립, 1950-06-25 한국전쟁의 직접 전사.</li>
  <li>주한미군의 1945-09-08 인천 상륙·하지 중장의 군정 개시는 SCAP 산하 *조선 군정사령관(USAMGIK)* 형태로 이루어졌으나, 1948년 대한민국 정부 수립 후 SCAP 지휘에서 분리.</li>
</ul>
<h4>3) 인도차이나 — 16도선과 베트남 전쟁의 전사</h4>
<ul>
  <li>General Order No.1의 인도차이나 16도선은 *영국(이남)·중국(이북)*의 일본군 무장해제 분담선으로 시작되었으나, ① 영국의 프랑스 식민통치 회복 지원, ② 중국 국민정부의 호치민 정부 묵인이 겹쳐 1946-09 하이퐁 사건 → 1차 인도차이나 전쟁 발발.</li>
  <li>1954년 제네바 협정에서 17도선으로 약간 북상한 분단선이 1975년까지 유지.</li>
</ul>
<h4>4) 미국 — 군에 대한 문민통제 원칙의 시험</h4>
<ul>
  <li>1945-08-14 임명 → 1951-04-11 해임의 5년 8개월간, 맥아더는 4직 통합 권한으로 사실상 *동아시아의 황제(Pro-Consul)*로 불렸다.</li>
  <li>1950-10 웨이크 섬 회담에서 트루먼-맥아더의 한국전쟁 처리 견해 차이가 드러났고, 1950-11 중공군 개입 후 맥아더의 *원폭 사용·중국 본토 폭격 주장*이 트루먼의 제한전 원칙과 충돌.</li>
  <li>1951-04-11 트루먼이 맥아더를 해임 — *"민주주의 사회에서 대통령이 군 장성을 해임할 수 있다는 헌법 원칙의 가장 극적인 시험"*(Richard Neustadt 「Presidential Power」 1960).</li>
  <li>이 해임은 1945-08-14 임명의 권한 집중이 *불가피하게 정치 충돌로 귀결될 운명*이었음을 시사.</li>
</ul>
<h4>1차 사료와 학계의 평가</h4>
<ul>
  <li><strong>FRUS</strong>(Foreign Relations of the United States) 1945, vol. VI(The British Commonwealth, the Far East) — 트루먼-스탈린 서한·SWNCC 문서 핵심.</li>
  <li><strong>NARA RG 218</strong>(Joint Chiefs of Staff Records), <strong>RG 353</strong>(SWNCC Records) — 임명 결재 문서 원본.</li>
  <li><strong>해리 트루먼 도서관</strong>(Independence, Missouri) — President's Secretary's File(PSF), 8월 14일 결재 기록.</li>
  <li><strong>스팀슨 일기</strong>(Library of Congress, Stimson Papers) — 8월 13일 백악관 회의 기록.</li>
  <li><strong>맥아더 회고록</strong> 「Reminiscences」(1964) — 임명 통보 수령 시점 회고.</li>
  <li>학술서: John Dower 「Embracing Defeat」(1999), Richard Frank 「Downfall」(1999), Marc Gallicchio 「Unconditional」(2020), 五百旗頭真 「米国の日本占領政策」(1985), 加藤陽子 「敗戦と占領」(2009).</li>
</ul>
<p>1945-08-14는 단일 인사 결정이지만, 그 결정의 후속 효과는 동아시아 70년의 정치 지형 — 일본의 단일 회복, 한반도 분단, 인도차이나 전쟁, 미국 동아시아 패권 구조 — 의 *공통 출발점*으로 평가된다. 이 점에서 8월 14일은 *전후 동아시아의 1일차*다.</p>`,
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
      countryName: '미국',
      role: EventCountryRole.INITIATOR,
      roleDescription: '임명 주체. 트루먼 대통령이 맥아더를 SCAP에 임명. JCS 1467/2·SWNCC 150/4·General Order No.1 동시 결재.',
    },
    {
      historicalCountryName: '일본 제국',
      role: EventCountryRole.TARGET,
      roleDescription: '임명의 대상국. SCAP은 일본 정부·천황의 권위를 종속시키며 점령 통치 수행. 8월 16일 Manila Signal #1로 사절단 파견 명령 수령.',
    },
    {
      countryName: '영국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '연합국 일원. 애틀리 정부가 8월 15일 즉시 동의. 영연방군(BCOF) 1946년 2월 히로시마·시코쿠 일대 점령 참여.',
    },
    {
      historicalCountryName: '소비에트 사회주의 공화국 연방',
      role: EventCountryRole.ADVERSARY,
      roleDescription: '연합국 일원이나 분쟁 측. 스탈린이 8월 16·22일 서한으로 ① 홋카이도 북부 분할, ② 부사령관 임명 요구. 트루먼이 8월 18일 답신으로 모두 거부 — 일본의 미국 단독 점령 확정.',
    },
    {
      countryName: '중국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '연합국 일원. 국민정부 장제스가 8월 15일 동의. 일본 본토 점령군 파견 거부 → 대만 접수·중국 본토 일본군 무장해제에 집중.',
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
      originalName: 'Harry S. Truman',
      role: '임명권자(미국 대통령)',
      note: '1945-08-14 백악관 집무실에서 SCAP 임명·SWNCC 150/4·JCS 1467/2·General Order No.1 4건 일괄 결재. 같은 날 19:00 라디오 발표로 공표. 이후 1951-04-11 동일 인물을 항명을 이유로 해임.',
    },
    {
      originalName: 'Douglas MacArthur',
      role: '피임명자(SCAP)',
      note: '1945-08-14 마닐라 USAFPAC 본부에서 임명 통보 수령. 8월 16일 Manila Signal #1 송신, 8월 30일 아쓰기 진주, 9월 2일 미주리함에서 항복 수락. 1951-04-11 해임까지 5년 8개월 동안 4직 통합 권한 행사.',
    },
    {
      originalName: 'George C. Marshall',
      role: '추천자(육군참모총장)',
      note: '1945-08-13 백악관 회의에서 트루먼에게 맥아더 직접 추천. 1930년대 필리핀 시절 갈등에도 불구하고 *"전구 지휘에서 점령 통치로의 자연스러운 이행"*을 명분으로 추천. 후일 국무장관(1947-49)·국방장관(1950-51) 역임.',
    },
    {
      originalName: 'James F. Byrnes',
      role: '국무장관 — 외교 채널 운영',
      note: '8월 11일 번스 메모로 *"천황 권한은 SCAP에 종속된다"* 답신 작성, 임명일 *"SCAP"* 명칭의 외교 문서 데뷔를 마감. 8월 14일 영·소·중·호 대사관 동시 통보 직접 운영. 트루먼-스탈린 8월 16~22일 서한 분쟁의 실무 좌장.',
    },
    {
      originalName: 'Joseph Stalin',
      role: '분쟁 측(소련 공산당 서기장)',
      note: '8월 16일 서한으로 ① 홋카이도 북부 분할 점령, ② SCAP 부사령관 임명 요구. 트루먼이 8월 18일 거부하자 8월 22일 *쿠릴 4도 단독 점령 통보*로 대응 — 북방 4도 분쟁의 시발점.',
    },
    {
      originalName: 'Shidehara Kijūrō',
      role: '후속 점령 통치 수용자(일본 총리, 1945-10-09 취임)',
      note: 'SCAP 임명 시점에는 직접 관여 없음. 그러나 1945-10-09 총리 취임 후 GHQ 5대 개혁 지령(부인 참정권·노조·교육 자유화·압정 폐지·경제민주화)과 SCAPIN 시리즈를 *"받들어 수용한다"* 형식으로 처리해 SCAP 권한 행사의 정통성 위기를 회피.',
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

  console.log(`\n✅ 트루먼의 맥아더 SCAP 임명 시딩 완료\n`)
}
