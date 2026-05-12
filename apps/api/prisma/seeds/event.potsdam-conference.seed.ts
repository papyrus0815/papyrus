/**
 * 1945-07-17 ~ 1945-08-02 포츠담 회담(Potsdam Conference, 코드명 "TERMINAL") 시드 — 논문급
 *
 * 사건 개요
 *  - 베를린 근교 포츠담 체칠리엔호프 궁(Schloss Cecilienhof)에서 17일간 진행된
 *    *전후 처리 빅3 정상회담*. 미·영·소 3국이 공식 참가국이며, 회담 도중
 *    영국 총선 결과 발표(7월 25일 결과·26일 공표)로 처칠이 애틀리로 교체된
 *    *현직 총리가 회담 중 바뀐 유일한 정상회담*이다.
 *  - 결과물 두 갈래: (1) 7월 26일 *포츠담 선언*(미·영·중 공동 명의로 일본에
 *    무조건 항복 요구), (2) 8월 2일 *포츠담 협정/공동성명*(독일 점령 4분할,
 *    오데르-나이세 선, 폴란드 서부 국경, 배상, 비군사화·탈나치화 5D).
 *  - 7월 16일 트리니티 핵실험 성공 → 7월 24일 트루먼이 스탈린에게 *"이례적
 *    파괴력의 신무기"*를 통보 → 7월 26일 포츠담 선언 발표 → 8월 6·9일
 *    히로시마·나가사키 → 8월 14일 트루먼의 맥아더 SCAP 임명으로 이어지는
 *    *1945년 7월~8월 결정 사슬*의 출발점.
 *
 * 등록 항목
 *  - Event(부모): 포츠담 회담 (1945-07-17 ~ 1945-08-02, 회담/조약 카테고리)
 *  - EventSection x8: 배경/참가자·조직/의제·일정/원폭 통보(7-24)/포츠담 선언(7-26)/
 *                    영국 정권교체(7-28)/포츠담 협정(8-2)/유산(냉전·동아시아)
 *  - EventCountryRelation: 미국·영국·소련·중국·일본 제국·나치 독일·폴란드
 *  - Person 신규: 윈스턴 처칠·클레먼트 애틀리·뱌체슬라프 몰로토프
 *  - Person 기존 활용: 트루먼·번스(SCAP 시드)·스탈린(러시아 볼셰비키 시드)
 *  - PersonEvent: 위 6명 + 장제스(중국 부재 서명자, 기존 인물 활용 시도)
 *
 * 의존성
 *  - admin 계정, eventCategory '회담/조약'
 *  - country '미국'·'영국'·'중국'·'폴란드'(seedCountries),
 *  - historicalCountry '소비에트 사회주의 공화국 연방'·'나치 독일 (제3제국)'·'일본 제국'
 *  - person 'Harry S. Truman'·'James F. Byrnes'(SCAP 시드)
 *  - person 'Joseph Stalin'(러시아 볼셰비키 시드)
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
  middleName?: string
  biography: string
  birthYear: number; birthMonth: number; birthDay: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender: string
  nameDisplayOrder?: 'korean' | 'western'
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
}

const NEW_PERSONS: PersonEntry[] = [
  {
    originalName: 'Winston Churchill',
    name: '윈스턴',
    middleName: 'L. S.',
    surname: '처칠',
    biography:
      '영국 보수당 정치인, 제61·63대 영국 총리(재임 1940-05-10~1945-07-26, 1951-10-26~1955-04-05). 1차 세계대전 시 해군상·전쟁상·식민장관, 양차 대전 사이 당내 비주류로 *유화책(appeasement)을 정면 비판한 카산드라*로 알려졌고, 1940년 5월 체임벌린 사퇴와 함께 거국 전시내각 총리에 취임해 영국을 단독으로 추축국에 맞서게 했다. 1941년 대서양 헌장(루스벨트)·1943년 카사블랑카·테헤란 회담·1945년 얄타 회담을 거쳐 1945-07-17~25 포츠담 회담에 참석했으나, *7월 5일 시행되어 7월 25일 결과 발표된 1945년 영국 총선*에서 노동당이 393석을 얻는 압승을 거두며 보수당이 213석으로 패배해 26일 사임, 회담의 후반부(7-28~8-2)는 후임 애틀리가 인계받았다. 회고록 「The Second World War」(1948-1953, 6 vols.)로 1953년 노벨 문학상 수상. 1946-03-05 풀턴(미주리) 연설 *"철의 장막(iron curtain)"*은 냉전 담론의 시발.',
    birthYear: 1874, birthMonth: 11, birthDay: 30,
    deathYear: 1965, deathMonth: 1, deathDay: 24,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '영국 옥스퍼드셔 블레넘 궁(Blenheim Palace, Oxfordshire)',
    influence: 98,
    stats: {
      politics: 95, military: 88, diplomacy: 92, intellect: 95, charisma: 98, administration: 85,
      notes: '20세기 영어권의 정치적 카리스마 표준. 결단·언어·전략 3박자.',
    },
  },
  {
    originalName: 'Clement Attlee',
    name: '클레먼트',
    middleName: 'R.',
    surname: '애틀리',
    biography:
      '영국 노동당 정치인, 제62대 영국 총리(재임 1945-07-26~1951-10-26). 옥스퍼드 유니버시티 칼리지 출신 변호사, 동런던 빈민 사회사업(Toynbee Hall) 활동을 거쳐 노동당 정치 입문. 1935년 노동당 당수에 선출되어 10년간 야당 지도자, 1940년 처칠 거국내각의 부총리(Deputy Prime Minister)·국새상서(Lord Privy Seal)·자치령장관·부총리 권한대행으로 처칠을 보좌했다. 1945-07-05 총선에서 *"승전한 처칠"*을 압도적으로 패배시키며 7월 26일 총리에 취임, 같은 날 포츠담으로 비행해 회담 후반부(7-28~8-2)에 참석했다. 재임 중 영국 복지국가 토대(NHS, 1948-07-05)·산업 국유화(석탄·철강·철도)·인도 독립 승인(1947-08-15)·NATO 창설(1949)을 추진해 *"전후 영국의 사회 계약"*을 설계한 인물로 평가된다.',
    birthYear: 1883, birthMonth: 1, birthDay: 3,
    deathYear: 1967, deathMonth: 10, deathDay: 8,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '영국 잉글랜드 런던 퍼트니(Putney, London)',
    influence: 86,
    stats: {
      politics: 88, military: 65, diplomacy: 80, intellect: 88, charisma: 65, administration: 92,
      notes: '"내성적인 거물(modest little man)" — 화려함 없이 NHS·인도독립을 실행한 행정가형.',
    },
  },
  {
    originalName: 'Vyacheslav Molotov',
    name: '뱌체슬라프',
    middleName: 'M.',
    surname: '몰로토프',
    biography:
      '소련 정치인, 외무인민위원·외무장관(1939-05-03~1949-03-04, 1953-03-05~1956-06-01). 본명 스크랴빈(Скрябин), 가명 *"몰로토프(망치)"*. 1906년 17세에 볼셰비키 입당, 「프라우다」 창간 멤버. 1930-1941년 인민위원회의장(소련 총리)을 거쳐 1939-08-23 *몰로토프-리벤트로프 조약*(독소 불가침 조약)에 서명했고, 1941-06-22 독일 침공 후 외무 라인 좌장으로 4대국 외교를 좌장했다. 테헤란(1943)·얄타(1945)·포츠담(1945) 3대 정상회담에 모두 참석한 유일한 인물이다. 포츠담 회담에서 폴란드 국경(오데르-나이세)·독일 배상·터키 해협 통제 의제를 강하게 밀어붙였고, 1945-08-08 일본에 대일선전포고 통고를 직접 사토 나오타케 일본 대사에게 전달했다. 스탈린 사후 1957년 *반당그룹 사건(anti-Party group)*으로 모든 직책에서 축출, 1962년 당적 박탈, 1984년 안드로포프 시기 복권. 회고록 「Молотов помнит」(1991, 사후 출간).',
    birthYear: 1890, birthMonth: 3, birthDay: 9,
    deathYear: 1986, deathMonth: 11, deathDay: 8,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '러시아 제국 뱌트카 현 쿠카르카(Кукарка, 현 키로프 주 소베츠크)',
    influence: 82,
    stats: {
      politics: 88, military: 70, diplomacy: 90, intellect: 80, charisma: 60, administration: 88,
      notes: '스탈린 외교의 사실상 집행 지휘자. *"대리석 엉덩이(каменный зад)"* — 협상 인내력의 별명.',
    },
  },
]

export async function seedPotsdamConference(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇩🇪 1945년 포츠담 회담 시딩 시작...')

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
  const naziGermanyHc = await prisma.historicalCountry.findFirst({
    where: { name: '나치 독일 (제3제국)' },
    select: { id: true },
  })
  if (!naziGermanyHc) {
    console.warn('  ⚠️  나치 독일 hc 미존재 — seedGermanyHistoricalCountries 먼저 필요')
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
        nameDisplayOrder: p.nameDisplayOrder ?? 'western',
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
  const TITLE = '포츠담 회담 (1945)'
  const START = new Date('1945-07-17')
  const END = new Date('1945-08-02')

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
          '1945년 7월 17일~8월 2일 베를린 남서쪽 약 25km 포츠담 체칠리엔호프 궁(Schloss Cecilienhof, 호엔촐레른 가문 마지막 거주지)에서 17일간 개최된 미·영·소 빅3 정상회담(코드명 "TERMINAL"). 회담의 *시간적 좌표*는 (1) 7월 16일 미국 뉴멕시코 트리니티 핵실험 성공 직후, (2) 5월 8일 유럽 종전 후 두 달 반, (3) 일본의 항복은 아직 받기 전이라는 긴장된 모멘트였다. 결과물은 두 갈래로 나뉜다. (1) **포츠담 선언**(1945-07-26, 미·영·중 명의 — 소련은 일본과 중립조약 유지 중이라 서명 불가): 일본의 무조건 항복·점령·무장해제·전범 처벌·민주화·천황제는 *"일본 국민의 자유 의사에 따른 평화 정부 수립"* 표현으로 우회. (2) **포츠담 협정(공동성명)**(1945-08-02): 독일 4분할 점령·오데르-나이세 선·폴란드 서부 국경·배상·5D(탈나치화·탈군사화·민주화·탈중앙집중·재교육) 원칙·외상이사회(CFM) 신설. 양 결과물은 각각 동아시아·유럽 전후 질서의 직접 헌장이 되었으며, 트루먼-스탈린 7-24 원폭 통보를 시발점으로 하는 *냉전의 사실상 시작*으로 평가된다.',
        startDate: START,
        startDatePrecision: 'day',
        endDate: END,
        endDatePrecision: 'day',
        location: '독일 브란덴부르크주 포츠담 체칠리엔호프 궁(Schloss Cecilienhof, Potsdam) — 본회의장은 大홀, 미국 대표단 숙소는 4번가 카이저슈트라세 28번 *"리틀 화이트하우스"*, 영국·소련 숙소는 회담장 인근 호엔촐레른 별저.',
        categoryId: category.id,
        historicalCountryId: naziGermanyHc.id,
        background:
          '1945년 2월 4~11일 얄타 회담에서 미·영·소 3국은 (1) 독일 항복 후 4분할 점령(프랑스 추가), (2) 폴란드 임시정부 구성, (3) 소련의 대일 참전(독일 항복 3개월 후), (4) 유엔 창설 일정에 합의했다. 그러나 (1) 1945-04-12 루스벨트 사망으로 트루먼 대통령 승계, (2) 5월 8일 독일 무조건 항복, (3) 폴란드 루블린 정부 수립을 둘러싼 미·영-소 마찰, (4) 6월 26일 샌프란시스코 유엔헌장 서명, (5) 7월 16일 트리니티 핵실험 성공이라는 5개 변수가 회담 직전에 발생했다. 회담 의제는 6월 미·영·소 외교 채널을 통해 *조정안 16개 항목*으로 사전 확정되었고, 핵심은 *독일 처리·폴란드 국경·일본 항복 처리·전범 처벌·소련 대일 참전 시기* 였다. 영국 측에서는 7월 5일 시행된 총선 결과를 7월 25일 발표 예정이라는 정치 일정 때문에, 처칠이 *"승부 결과를 모른 채"* 회담을 시작해야 하는 이례적 상황이 빚어졌다.',
        aftermath:
          '회담 종료 후 즉시 가동된 *4가지 후속 절차*: (1) 포츠담 선언을 일본에 통보(7-26 17:00 워싱턴 발표 + 라디오 송출, 일본 측은 7-28 스즈키 간타로 총리의 *"묵살(黙殺)"* 답변으로 거부 의사 표시) → 8-6 히로시마·8-9 나가사키 원폭 → 8-14 일본 항복 수락. (2) 독일 점령 4분할 본격 가동 — 8월부터 베를린·각 지방에서 미·영·프·소 군정 발효. (3) 외상이사회(Council of Foreign Ministers, CFM) 9월 11일 런던 1차 회의로 시작되어 1945-1947년 4차 회의 동안 평화조약·국경 정리. (4) 오데르-나이세 선 적용으로 1947년까지 약 1,200~1,400만 독일계 인구가 폴란드·체코슬로바키아·헝가리 등에서 *추방(Vertreibung)*. 회담 자체는 *"미·영·소 협조의 마지막 순간"* 으로 평가되며, 트루먼-스탈린 7-24 원폭 통보 → 처칠의 풀턴 연설(1946-03-05) → 트루먼 독트린(1947-03-12) → 마셜 플랜(1947-06-05) → 베를린 봉쇄(1948-06)로 이어지는 냉전 격화의 출발점이 되었다.',
        keywords: [
          '포츠담회담', 'PotsdamConference', 'TERMINAL', '체칠리엔호프', 'Cecilienhof',
          '트루먼', 'Truman', '처칠', 'Churchill', '애틀리', 'Attlee', '스탈린', 'Stalin',
          '몰로토프', 'Molotov', '번스', 'Byrnes', '베빈', 'Bevin', '이든', 'Eden',
          '포츠담선언', 'PotsdamDeclaration', '포츠담협정', '포츠담공동성명',
          '오데르-나이세선', 'Oder-Neisse', '4분할점령', '5D', '탈나치화', '탈군사화',
          '트리니티', 'Trinity', '원폭통보', '7월24일', '묵살', '黙殺',
          '외상이사회', 'CFM', '베를린', '폴란드국경', '독일배상', '추방',
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
      title: '배경 — 얄타에서 포츠담으로의 4개월',
      sectionType: 'background',
      content: `<p>1945년 2월 얄타 회담의 합의 골격이 7월 포츠담 회담 시점에 그대로 유지되었는가? 답은 *"형식상 유지, 실질상 균열"*이다. 4개월 사이 일어난 6대 변수가 회담의 분위기와 의제를 모두 바꿔놓았다.</p>
<table>
  <thead><tr><th>변수</th><th>일자</th><th>회담에 미친 영향</th></tr></thead>
  <tbody>
    <tr><td><strong>루스벨트 사망</strong></td><td>1945-04-12</td><td>대소 협조 노선의 정치적 자본 상실. 트루먼은 *"대소 강경 잠재 노선"*을 가진 인물.</td></tr>
    <tr><td><strong>독일 무조건 항복</strong></td><td>1945-05-08</td><td>4분할 점령의 *실행* 단계 진입. 베를린 행정 분담 분쟁 발화.</td></tr>
    <tr><td><strong>폴란드 임시정부 구성</strong></td><td>1945-06-28</td><td>얄타 합의의 "재구성된 임시정부"가 사실상 루블린 친소 정부 + 미국·영국 측 인사 4명 추가 형태로 마무리. 미·영의 정치적 패배.</td></tr>
    <tr><td><strong>유엔헌장 서명</strong></td><td>1945-06-26</td><td>샌프란시스코에서 50개국 서명. 회담 시점 *"안보리 5상임이사국 체제"*가 작동 시작.</td></tr>
    <tr><td><strong>트리니티 핵실험</strong></td><td>1945-07-16 05:29:45 (MWT)</td><td>회담 개막 *24시간 전*. 트루먼이 7-17 회담 시작 시 *"손에 든 카드가 갑자기 두 장 늘어난 상태"*로 협상 임함.</td></tr>
    <tr><td><strong>영국 총선 시행</strong></td><td>1945-07-05 (결과 7-25 공표)</td><td>처칠이 *결과 모른 채* 회담 진행 → 7-25 결과 → 7-26 사임 → 7-28 애틀리 합류.</td></tr>
  </tbody>
</table>
<p>이 6개 변수의 배치는 매우 미묘하다. 트루먼의 *대소 강경 잠재* + 핵 카드 + 처칠의 정치적 운명 = *얄타 합의의 미·영 측 재해석 가능성*이 회담 시점에 활짝 열렸다. 반면 소련은 (1) 폴란드 임시정부 안착, (2) 동유럽 적군 진주 완료, (3) 대일 참전 카드의 시간 압박이라는 *"이미 굳어진 사실(faits accomplis)"*을 손에 쥐고 있었다. 즉, 회담은 두 진영이 서로 다른 *시간 지평*을 들고 만난 자리였다 — 미·영은 *"앞으로 6개월"*, 소련은 *"이미 굳어진 6개월"*.</p>
<h4>의제 사전 조정 (6월 미·영·소 외교 채널)</h4>
<p>1945년 6월 한 달간 워싱턴·런던·모스크바 3각 외교 채널을 통해 의제 16개 항목이 사전 합의되었다. 핵심 의제(번호는 회담 의사록 순서):</p>
<ol>
  <li>외상이사회(CFM) 신설 — 평화조약 작성 채널.</li>
  <li>독일 정치·경제 원칙 — 4분할 점령의 운영 규범.</li>
  <li>독일 배상 — 1,000억 달러 vs 200억 달러(소련 요구) 논쟁.</li>
  <li>폴란드 서부 국경 — 오데르 강 vs 오데르-나이세 선.</li>
  <li>폴란드 임시정부 승인 — 미·영의 6월 묵인.</li>
  <li>이탈리아 평화조약 — 영국군 점령지 처리.</li>
  <li>독일 잔존 동맹국(헝가리·루마니아·불가리아·핀란드) 처리.</li>
  <li>해협(터키 보스포루스·다르다넬스) 통제 — 소련 요구.</li>
  <li>이란 철군 — 1942년 영·소 점령군 철수 일정.</li>
  <li>탕헤르 국제 지위.</li>
  <li>시리아·레바논 — 프랑스 철군 요구.</li>
  <li>전범 재판(뉘른베르크 헌장).</li>
  <li>일본 처리 — *마지막 의제*. 포츠담 선언 작성.</li>
  <li>유엔 — 안보리 거부권 운영.</li>
  <li>독일 포로(전쟁 포로) 송환.</li>
  <li>독일 잔존 함대·상선 분배.</li>
</ol>
<p>의제 13번 *일본 처리*가 회담 종반(7-24~26)에 가서야 본격 다뤄진 점은 주목할 만하다. 미국이 *원폭 카드의 무게*를 회담 분위기에서 어느 정도 시험한 다음 일본 의제로 넘어가는 *전략적 일정 배치*였다.</p>`,
    },
    {
      order: 2,
      title: '참가자와 조직 — Big Three의 대표단 구성',
      sectionType: 'background',
      content: `<p>회담은 *3국 정상 + 외상 + 군부 + 실무진*의 4단 구조로 운영되었다. 각국 대표단 규모는 미국 약 35명, 영국 약 30명, 소련 약 25명, 통역·기록·경호 포함 총 1,000명 규모(체칠리엔호프 인근에 분산 숙박).</p>
<h4>3국 정상 + 외상 라인업</h4>
<table>
  <thead><tr><th>국가</th><th>정상</th><th>외상</th><th>비고</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>미국</strong></td>
      <td>해리 S. 트루먼 (대통령)</td>
      <td>제임스 F. 번스 (국무장관)</td>
      <td>회담 *내내 동일*. 트루먼은 7월 7일 베를린행 USS 오거스타함 출항.</td>
    </tr>
    <tr>
      <td><strong>영국</strong></td>
      <td>윈스턴 처칠 (총리, 7-17~25)<br/>→ <strong>클레먼트 애틀리 (총리, 7-28~)</strong></td>
      <td>앤서니 이든 (외무, 7-17~25)<br/>→ <strong>어니스트 베빈 (외무, 7-28~)</strong></td>
      <td>총선 결과 7-25 발표 → 7-26 처칠 사임 → 7-28 애틀리·베빈 부임. <em>현직 정상이 회담 중 바뀐 유일 사례</em>.</td>
    </tr>
    <tr>
      <td><strong>소련</strong></td>
      <td>이오시프 스탈린 (서기장 + 인민위원회의장)</td>
      <td>뱌체슬라프 몰로토프 (외무인민위원)</td>
      <td>회담 *내내 동일*. 7-15 모스크바에서 특별 열차로 출발, 7-16 베를린 도착(트루먼보다 하루 늦게 도착).</td>
    </tr>
  </tbody>
</table>
<h4>군부·실무 라인업</h4>
<ul>
  <li><strong>미국</strong>: 윌리엄 D. 레히 제독(대통령 군사보좌관·합참 의장 격)·조지 C. 마셜 육군참모총장·헨리 H. 아놀드 항공대 사령관·어니스트 J. 킹 해군참모총장.</li>
  <li><strong>영국</strong>: 헤이스팅스 이즈메이 장군(국방참모차장)·앨런 브룩 육군참모총장·앤드루 커닝햄 해군참모총장·찰스 포털 공군참모총장.</li>
  <li><strong>소련</strong>: 게오르기 주코프 원수(베를린 군관구 사령관)·니콜라이 쿠즈네초프 해군 인민위원·알렉세이 안토노프 참모총장.</li>
</ul>
<h4>회담장 구조 — 체칠리엔호프 大홀</h4>
<p>본회의장은 체칠리엔호프 궁의 대형 응접실. 직경 4m 원형 테이블에 3국 정상이 *동시에* 입장 → 좌석 추첨이 아닌 *동시 개회*로 의전 평등 연출. 트루먼·스탈린·처칠(→애틀리) 좌석 배치는 정삼각형. 회의장 정문에는 *세 깃발(미·영·소)*이 동일 높이로 게양. 외상회의는 별실에서 매일 11:00, 정상회의는 17:00 개회를 원칙으로 했다.</p>
<h4>비공식 채널의 중요성</h4>
<p>공식 회의록(Protocol)에 남지 않은 *3국 정상 1:1 회담*이 결정적 합의의 다수를 만들어냈다. 특히:</p>
<ul>
  <li>7-17 17:00: 트루먼-처칠 1차 단독 회담 (40분).</li>
  <li>7-17 22:00: 트루먼-스탈린 1차 단독 회담 (90분, 통역 찰스 볼런·블라디미르 파블로프).</li>
  <li><strong>7-24 19:30: 트루먼-스탈린 *원폭 통보* — 의사록 외 비공식 발언</strong>.</li>
  <li>7-25: 처칠 단독 귀국(총선 결과 발표 대기).</li>
  <li>7-31: 트루먼-스탈린 마지막 단독 회담.</li>
</ul>
<p>이 비공식 채널 의존도는 *"정상회담 외교의 사실상 헌장"*이 되었고, 이후 1955년 제네바 정상회담·1959년 캠프 데이비드 정상회담·1972년 닉슨-마오 회담 등 모든 후속 정상외교의 운영 모델이 되었다.</p>`,
    },
    {
      order: 3,
      title: '주요 의제와 일정 — 7월 17일~8월 2일 17일간',
      sectionType: 'process',
      content: `<p>17일간의 회담은 *13회 본회의 + 11회 외상회의 + 다수 1:1 회담*으로 구성되었다. 일정의 핵심을 일자별로 정리한다(FRUS, Conference of Berlin, vol. II 의사록 기준).</p>
<table>
  <thead><tr><th>일자</th><th>주요 사항</th></tr></thead>
  <tbody>
    <tr><td>7-15 / 7-16</td><td>대표단 베를린 도착. 트루먼이 베를린 시가지 시찰(7-16 오후) — 폐허 광경에 *"독일은 이 짓을 자초했다"*는 일기 기록.</td></tr>
    <tr><td><strong>7-16 05:29 (MWT, 7-16 13:29 베를린)</strong></td><td><strong>미국 뉴멕시코 트리니티 핵실험 성공</strong>. 베를린 시간 13:30경 트루먼에 1차 통보, 21:00 상세 보고. <em>"It worked."</em></td></tr>
    <tr><td>7-17 17:00</td><td><strong>제1차 본회의 개회</strong>. 의제 채택 — 외상이사회(CFM) 설립 합의 1차 본회의에서 즉시 가결.</td></tr>
    <tr><td>7-18~21</td><td>제2~5차 본회의 — 독일 정치·경제 원칙, 폴란드 국경, 배상 의제 1차 검토. 스탈린이 *"오데르-나이세"* 선 강하게 주장.</td></tr>
    <tr><td>7-21 21:30</td><td>트루먼이 트리니티 핵실험 *상세 보고서*(스팀슨 전쟁장관 특사 송부) 수령. *"새로운 무기를 보유했고 충분한 효과를 내리라 확신한다"* (트루먼 일기).</td></tr>
    <tr><td>7-22~23</td><td>제6~7차 본회의 — 이탈리아 평화조약·잔존 동맹국 처리. 영·소 마찰 표면화.</td></tr>
    <tr><td><strong>7-24 19:30</strong></td><td><strong>트루먼이 스탈린에게 원폭 통보</strong> (본회의 후 비공식, 통역 1명만 동석). 스탈린 반응: *"잘 알아들었습니다. 일본인에게 잘 사용하시기 바랍니다(I hope you make good use of it against the Japanese)."* — 무덤덤한 표정. <em>이미 NKVD/GRU 첩보망(클라우스 푹스 등)을 통해 1942년부터 맨해튼 계획을 인지했기 때문</em>이라는 것이 1990년대 KGB 문서 공개 후 정설.</td></tr>
    <tr><td>7-25 12:00</td><td>제8차 본회의 — 처칠·이든 회담 마지막 참석. 영국 총선 결과 발표 대기를 위해 처칠은 같은 날 저녁 단독 귀국.</td></tr>
    <tr><td><strong>7-26 17:00 (워싱턴) / 7-27 02:00 (도쿄)</strong></td><td><strong>포츠담 선언 발표</strong> — 미·영·중 3국 명의(소련은 일소 중립조약 유지). 워싱턴·런던·충칭 동시 라디오 발표 후 일본 측에 무선 송출.</td></tr>
    <tr><td>7-26 (런던)</td><td>영국 총선 결과: 노동당 393석(전국 47.7%) 압승, 보수당 213석. 처칠 26일 사임.</td></tr>
    <tr><td>7-28</td><td><strong>애틀리·베빈 베를린 도착</strong>, 회담 후반부 합류. <em>"사람은 바뀌었으되 정책은 변하지 않는다(no change)"</em>.</td></tr>
    <tr><td>7-28 (도쿄)</td><td>스즈키 간타로 일본 총리가 기자회견에서 포츠담 선언을 *"묵살(黙殺)"*한다고 표명. 영어 번역에서 *"ignore"* → 영미권에서 *"reject"*로 해석 → 원폭 투하 결정의 정당성 근거로 활용.</td></tr>
    <tr><td>7-29~8-1</td><td>제9~12차 본회의 — 배상·폴란드 서부 국경·CFM 운영 세부·이탈리아 식민지 처리 마무리.</td></tr>
    <tr><td><strong>8-1 23:00</strong></td><td>제13차 본회의(최종) — 공동성명 초안 채택.</td></tr>
    <tr><td><strong>8-2 00:30</strong></td><td><strong>3국 정상이 포츠담 협정(공동성명)에 서명</strong>. 회담 종료. 트루먼 8-2 새벽 귀국행 출발, 8-7 워싱턴 도착(귀국 항해 중 8-6 히로시마 보고 수령).</td></tr>
  </tbody>
</table>
<p>일정을 압축해서 보면, 회담은 *"7-16 핵실험 → 7-24 통보 → 7-26 선언"*의 3박자가 회담의 정치적 중심축이었다. 외교 담론은 독일·폴란드를 다루었으나, 회담장 분위기는 일본·핵의 그림자에 의해 지배되었다.</p>`,
    },
    {
      order: 4,
      title: '7-24 원폭 통보 — 회담의 가장 결정적 90초',
      sectionType: 'process',
      content: `<p>7월 24일 19:30, 제7차 본회의 종료 직후 트루먼은 회의장 출구에서 스탈린을 따로 불러 *"우리는 이례적인 파괴력을 가진 새로운 무기를 개발했다(We have a new weapon of unusual destructive force)"*라고 통보했다. 이 90초의 대화는 회담 17일 동안 가장 결정적인 순간으로 평가되며, 동시에 *역사가들이 가장 많이 분석한 단일 외교 발화*다.</p>
<h4>대화의 4가지 사료</h4>
<ol>
  <li><strong>트루먼 일기</strong>(7-25 작성): *"오늘 스탈린에게 일본에 사용할 새로운 무기를 보유했다고 비밀스럽게 말했다. 러시아인 총리는 기뻐했다. 그것이 일본인에게 잘 쓰이기를 바란다고 말했다."*</li>
  <li><strong>처칠 회고록</strong> 「Triumph and Tragedy」(1953, p.670): *"나는 약 5야드 떨어진 곳에 서서 이 결정적 대화를 지켜보았다. 스탈린은 마치 일상적인 정보를 들은 듯 무표정했다."*</li>
  <li><strong>제임스 번스 회고록</strong> 「Speaking Frankly」(1947, p.263): *"스탈린의 무덤덤함은 우리를 안심시켰다 — 그는 우리가 무엇을 말하는지 충분히 이해하지 못한 듯했다."*</li>
  <li><strong>주코프 회고록</strong>(1969, 「Воспоминания и размышления」, vol.2): *"스탈린은 회담장에서 돌아오자마자 몰로토프와 나에게 '미국이 새 무기를 개발했다고 한다. 우리도 가속화해야 한다'고 지시했다. 무표정은 연기였다."*</li>
</ol>
<h4>스탈린의 무표정이 *연기*였던 이유</h4>
<p>1990년대 KGB·GRU 문서 공개로 다음 사실이 확인되었다.</p>
<ul>
  <li><strong>NKVD 핵첩보 작전(에노르모스, ENORMOZ)</strong>은 1941년 9월 시작되었다. 영국 케임브리지 5인조 중 존 케언크로스(John Cairncross)가 1941-09 영국 MAUD 위원회 보고서(원폭 가능성 검토) 사본을 모스크바로 송부.</li>
  <li><strong>맨해튼 계획 내부 정보</strong>는 클라우스 푹스(Klaus Fuchs, 영국 출신 이론물리학자, 1944~ 로스앨러모스 근무)·테드 홀(Theodore Hall)·데이비드 그린글래스 등 다수 첩보망에서 1944~1945년 송부.</li>
  <li><strong>소련 핵 프로그램</strong>은 1943-02 라브렌티 베리야 직속으로 이고리 쿠르차토프 지휘 하에 가속화. 트리니티 실험 성공 시점에 *소련은 이미 6개월 내 핵분열 연쇄반응 달성을 목표*로 하는 프로그램을 가동 중이었다.</li>
</ul>
<p>즉, 트루먼이 *"비밀스럽게"* 통보한 정보는 스탈린에게 *이미 알려진 사실의 공식 확인*에 불과했다. 다만 *미국이 그것을 회담 자리에서 통보하기로 결정한 시점*과 *어떤 어휘로 통보했는가*가 새로운 정보였다. 스탈린은 회담 종료 후 즉시 모스크바로 전보를 보내 핵 프로그램 가속화를 지시했고, 1949-08-29 세미팔라틴스크에서 첫 핵실험 *RDS-1*을 성공시켜 미국 단독 핵 보유를 4년으로 단축시켰다.</p>
<h4>역사적 의의 — 냉전의 사실상 시작</h4>
<p>학계는 7-24의 90초를 *"냉전의 사실상 개시 시점"*으로 평가한다. 그 근거:</p>
<ul>
  <li><strong>핵 비공유 결정</strong>: 트루먼이 *"새로운 무기"*라고만 통보하고 기술·정보 공유를 제안하지 않은 시점. 이후 1946-08 맥마혼법(Atomic Energy Act)으로 핵 정보 동맹 비공유 정책 법제화.</li>
  <li><strong>대일 전후 결정의 미국 단독화</strong>: 7-26 포츠담 선언이 소련 명의 누락(중립 유지 명목, 그러나 *실제 의도는 소련 대일 참전 시 발언권 제한*)으로 발표.</li>
  <li><strong>스탈린의 동유럽 굳히기</strong>: 핵 격차를 인지한 스탈린이 1945-09부터 동유럽 친소 정권 수립 일정을 가속화 — 1947 코민포름 결성으로 정점.</li>
</ul>
<p>존 루이스 개디스 「The Cold War: A New History」(2005)는 7-24를 *"두 시대를 가르는 90초"*로 명명했다. 같은 자리에서 트루먼은 미국의 새 시대를, 스탈린은 소련의 새 시대를 *각자의 언어로 듣고 있었다*. 두 사람이 같은 방을 공유한 *마지막 순간*이기도 하다 — 트루먼-스탈린은 이후 다시 만나지 않았다.</p>`,
    },
    {
      order: 5,
      title: '7-26 포츠담 선언 — 소련 누락의 외교 기예',
      sectionType: 'process',
      content: `<p>1945년 7월 26일 17:00 워싱턴 시간(베를린 23:00, 도쿄 7-27 02:00)에 발표된 <strong>포츠담 선언</strong>(Potsdam Declaration, 정식명 *"미국·중화민국·영국 정부 수반의 일본 대일 항복 요구 선언"*)은 13개 조항의 단일 문서다.</p>
<h4>13개 조항의 구조</h4>
<table>
  <thead><tr><th>조항</th><th>내용 요약</th></tr></thead>
  <tbody>
    <tr><td>1~5</td><td>미·영·중 3국이 *일본에 본토 결전을 강요할 수 있는 군사력을 보유*. 독일의 운명을 상기. *"무의미한 저항의 결과는 일본의 완전한 파괴"*.</td></tr>
    <tr><td>6</td><td>군국주의·전쟁 책임자 *영구 제거*. 일본 정부의 평화 정부 전환 요구.</td></tr>
    <tr><td>7</td><td>점령 — *"일본 영토에 연합국이 지정한 지점을 점령"*. 점령 종료 조건은 *"신질서 수립 + 일본의 평화적 의지 입증"*.</td></tr>
    <tr><td>8</td><td>영토 — 카이로 선언(1943) 이행. 일본은 본토 4개 섬과 *"우리가 결정하는 작은 섬들"*에만 주권 유지. 만주·대만·조선·태평양 위임통치령 상실.</td></tr>
    <tr><td>9</td><td>일본군 무장해제 후 본국 송환·평화 생활 보장.</td></tr>
    <tr><td>10</td><td>전범 처벌·기본권 보장·민주화·정치범 석방.</td></tr>
    <tr><td>11</td><td>경제 — 평화 산업 유지 가능, 군수 산업 폐기. 무역 참여 가능.</td></tr>
    <tr><td>12</td><td>점령 종료 조건 — *"일본 국민의 자유로 표명된 의사에 따른 평화적이고 책임 있는 정부 수립"*. <strong>천황제 명시 회피</strong>(스팀슨 안의 *"입헌군주제 가능"* 조항이 막판 삭제).</td></tr>
    <tr><td>13</td><td><strong>"무조건 항복(unconditional surrender) 즉시 수락"</strong> 요구. 거부 시 *"즉시적이고 완전한 파괴(prompt and utter destruction)"*.</td></tr>
  </tbody>
</table>
<h4>소련 명의 누락 — 외교 설계의 정점</h4>
<p>선언 명의는 *미국·중화민국·영국* 3국이며, 소련은 누락되었다. 표면 이유는 *1941년 4월 일소 중립조약*이 1946-04까지 유효했기 때문이다. 그러나 실질 이유는 다층적이었다.</p>
<ul>
  <li><strong>미국 측 설계</strong>: 트루먼-번스는 소련 대일 참전이 일본 항복 *전*에 일어나면 점령 분할이 불가피해진다고 판단. 7-24 원폭 통보 후 *"소련 참전 전에 항복을 받는 게임"*에 진입. 포츠담 선언은 *항복 일정을 빠르게 만드는 압박 도구*였고, 소련 참여는 그 게임을 늦출 위험.</li>
  <li><strong>스탈린 측 묵인</strong>: 스탈린은 7-25 본회의에서 *"소련은 일본과 형식상 평화 상태이므로 선언에 명시적으로 가담할 수 없다"*고 선제 양해. *그러나* 동시에 1941년 중립조약을 1년 전 통고로 해지(1945-04-05 이미 통보)했고, 8-8 대일선전포고를 사실상 확정.</li>
  <li><strong>중국 측 가입</strong>: 장제스는 충칭에서 7-26 02:00 무렵 전화로 *명의 가입 동의*만 표명. 회담장에는 부재. 따라서 선언 정본 서명은 트루먼·처칠·아틀리(중국 명의 위임)뿐.</li>
</ul>
<h4>천황제 조항 삭제 논쟁 — 12조의 운명</h4>
<p>7-2 SWNCC 초안에는 12조에 *"입헌군주제(constitutional monarchy)는 황실의 현 가문 하에서도 가능하다"*는 명시 조항이 있었다. 이 조항은 헨리 스팀슨 전쟁장관·조셉 그루 국무차관(전 주일대사)이 *"천황제 보장이 항복 결단의 결정적 인센티브"*라며 삽입한 것이었다.</p>
<p>그러나 7-22 워싱턴에서 *코델 헐 전 국무장관·딘 애치슨 국무차관*이 *"강경 노선"*을 주장하며 삭제 요구. 7-24 트루먼이 최종 결재로 12조를 *"평화적이고 책임 있는 정부의 수립"*이라는 추상적 표현으로 변경. 이 변경은 일본 측에 *"천황제 보장 여부 불명확"*이라는 해석 여지를 남겼고, 8-10 어전회의에서 *"천황 통치권에 변경을 가하지 않는다는 양해 하에 수락"*이라는 조건부 수락 → 8-11 번스 메모(*"천황 권한은 SCAP에 종속된다"*)로 이어졌다.</p>
<h4>일본 측의 *"묵살(黙殺)"* — 번역의 비극</h4>
<p>선언 발표 직후인 7-28 정오 기자회견에서 스즈키 간타로 일본 총리는 *"정부는 이를 묵살하고, 단지 전쟁 완수에 매진할 뿐"*이라고 발언했다. *"묵살"*의 일본어 어감은 *"공식 입장 표명 보류 + 사실상 무시"*의 중간이었으나, 영문 번역에서 *"ignore"*가 채택되었고 미국·영국 신문은 이를 *"reject(거부)"*로 표제 처리.</p>
<p>이 번역의 미묘한 차이가 8-6 히로시마·8-9 나가사키 원폭 투하의 *직접 정당화 명분*이 되었다. 스즈키 본인은 회고록에서 *"보류 의도였다"*고 밝혔으나, *원폭 투하 명령은 7-25 사전 작성된 상태*였으므로 *번역 자체가 결정을 바꾼 것은 아니다*는 것이 학계 정설(Tsuyoshi Hasegawa 「Racing the Enemy」 2005).</p>`,
    },
    {
      order: 6,
      title: '7-28 영국 정권교체 — 회담 도중 총리가 바뀐 유일한 사례',
      sectionType: 'process',
      content: `<p>1945-07-25 오전, 영국 본토에서 7-5 시행된 총선의 개표가 시작되었다. 그날 오후 발표된 결과는 다음과 같았다.</p>
<table>
  <thead><tr><th>정당</th><th>의석</th><th>득표율</th><th>증감</th></tr></thead>
  <tbody>
    <tr><td>노동당(애틀리)</td><td>393</td><td>47.7%</td><td>+239</td></tr>
    <tr><td>보수당(처칠)</td><td>213</td><td>36.2%</td><td>-190</td></tr>
    <tr><td>자유당</td><td>12</td><td>9.0%</td><td>-9</td></tr>
    <tr><td>기타</td><td>22</td><td>7.1%</td><td>-40</td></tr>
  </tbody>
</table>
<p>처칠 본인의 보수당이 약 100석 가량을 잃을 것이라는 예상은 있었으나, 노동당 단독 과반(391석)을 확보할 정도의 *압승*은 거의 모든 정치 분석가의 예상을 빗나갔다. 결과는 7-25 22:00경 발표되었고, 처칠은 7-26 11:00 버킹엄 궁에서 사임을 표명했다. 같은 날 14:00 애틀리가 총리 임명장을 받고 외무장관 어니스트 베빈을 임명, *17:00 부로* 베를린 비행 준비 시작.</p>
<h4>왜 영국 국민은 처칠을 거부했는가?</h4>
<p>이 전후 정치사 가장 흥미로운 수수께끼에 대한 학계 답변은 4가지로 정리된다.</p>
<ol>
  <li><strong>1930년대 보수당의 실패</strong> — 1930년대 대공황·실업·체임벌린 유화책에 대한 노동계급의 누적 불만. 처칠 개인의 전쟁 영웅 이미지는 *전쟁 외 영역*에서는 보수당의 짐을 덜어주지 못함.</li>
  <li><strong>베버리지 보고서(1942)</strong> — 사회보장·NHS·완전 고용을 약속한 베버리지 안. 처칠 정부는 *"전쟁 후 검토"*로 미뤘으나 노동당은 *"즉시 시행"*을 약속.</li>
  <li><strong>군인 표</strong> — 영국군 병사 약 300만 명이 우편 투표. 1944~45년 *"군대내 시민교육(Army Bureau of Current Affairs, ABCA)"*에서 진행된 토론회의 영향으로 노동당 지지가 압도적이었다는 분석.</li>
  <li><strong>"전후의 처칠"에 대한 불안</strong> — 전쟁 영웅 처칠이 *전후 사회 재건의 적임자인가*에 대한 의문. 처칠 본인이 선거 운동에서 노동당을 *"게슈타포"*에 비유한 라디오 연설(1945-06-04, 일명 "Gestapo speech")이 결정타.</li>
</ol>
<h4>회담 운영의 실제 영향 — *"no change"*</h4>
<p>7-28 18:00 베를린 도착 후 애틀리는 다음과 같이 입장 표명했다(영국 공식 회담 기록).</p>
<blockquote>
"My government will continue the policy of the previous government in matters of foreign affairs. There will be <strong>no change</strong>. The British position in the conference remains the same."
</blockquote>
<p>실제로 회담의 후반부 5일(7-28~8-2)에 결정된 핵심 의제 — 폴란드 서부 국경(오데르-나이세 선) 확정·독일 배상(소련 25%·미·영·프 75% 분배 비율)·CFM 운영 세부 — 는 처칠 시기의 영국 입장과 거의 동일한 노선을 유지했다. 베빈 외무장관은 처칠보다 *오히려 대소 강경*이라는 평가를 받았다(이는 1947 베빈의 *"4분할 점령 → 서구 통합 점령"* 전환 정책으로 이어진다).</p>
<p>다만 *분위기*는 달라졌다. 처칠의 위트와 음주·시가 풍의 회담 운영이 사라지고, 애틀리·베빈의 *간결하고 사무적인 운영*으로 회담 분위기가 일변. 스탈린은 후일 회고에서 *"처칠과는 협상의 즐거움이 있었으나, 애틀리와는 그저 일이 있을 뿐이었다"*고 평가.</p>
<h4>역사적 의의</h4>
<p>회담 도중 *현직 정상이 교체된 사례*는 1815년 빈 회의(나폴레옹의 100일 천하)·1932년 로잔 회의(독일 정부 교체)에 이어 세 번째지만, 그 셋 중 *영국처럼 회담장 자체가 바뀐 사례*는 포츠담이 유일하다. 이 사건은 (1) 의회 민주주의가 *전시 정상회담의 정상화 압박*을 견뎌낼 수 있다는 증명, (2) 외교의 *연속성(continuity)* 원칙이 *총리 개인보다 국가에 묶인다*는 점의 현장 시연으로 평가된다.</p>`,
    },
    {
      order: 7,
      title: '8-2 포츠담 협정 — 유럽 전후 질서의 헌장',
      sectionType: 'aftermath',
      content: `<p>회담 종료를 알리는 <strong>포츠담 협정(Potsdam Agreement, 또는 공동성명)</strong>은 1945-08-02 00:30 3국 정상 서명으로 발효되었다. 본문은 15개 절(Section)·총 21쪽 분량. 영토·정치·경제·법률 4개 영역으로 나뉜다.</p>
<h4>I. 외상이사회(Council of Foreign Ministers, CFM) 설립</h4>
<ul>
  <li>설립 목적: (1) 평화 조약 작성(이탈리아·루마니아·불가리아·헝가리·핀란드, 후일 독일), (2) 영토 정리, (3) 후속 의제 조정.</li>
  <li>구성: 미·영·소·중·프 5개국 외상.</li>
  <li>운영: 1945-09 런던 1차 회의로 시작 → 1947-12 런던 5차 회의까지 4차례 회동. 5차 회의 결렬이 *냉전 격화의 외교적 분기점*.</li>
</ul>
<h4>II. 독일 정치·경제 5D 원칙</h4>
<table>
  <thead><tr><th>원칙</th><th>독일어</th><th>영문</th><th>핵심 조치</th></tr></thead>
  <tbody>
    <tr><td>탈군사화</td><td>Demilitarisierung</td><td>Demilitarization</td><td>독일군 완전 해체. 군수 산업 폐기.</td></tr>
    <tr><td>탈나치화</td><td>Entnazifizierung</td><td>Denazification</td><td>나치당 해체. 당원 공직 추방. 뉘른베르크 재판.</td></tr>
    <tr><td>민주화</td><td>Demokratisierung</td><td>Democratization</td><td>지방 자치체부터 단계적 민주 정치 회복. 정당·언론 자유.</td></tr>
    <tr><td>탈중앙집중</td><td>Dezentralisierung</td><td>Decentralization</td><td>중앙집중적 행정 해체 → 연방주의 회복. 카르텔 해체.</td></tr>
    <tr><td>재교육</td><td>Demontage / Reedukation</td><td>Reeducation / Demontage</td><td>학교 교과서 재작성. 산업시설 해체·소련 이전.</td></tr>
  </tbody>
</table>
<p>5D 원칙은 SWNCC 150/4(일본 점령 정책)와 함께 *연합국 점령 정책의 표준 모델*이 되었으며, 1949년 이후 동·서독으로 분단된 후에도 양측이 각자의 해석으로 계승했다.</p>
<h4>III. 폴란드 서부 국경 — 오데르-나이세 선</h4>
<p>회담 17일간 가장 격렬한 협상이 벌어진 의제. 핵심 쟁점:</p>
<ul>
  <li><strong>스탈린 안</strong>: 오데르 강 + *서쪽* 나이세 강(Lusatian Neisse, 글라츠 부근). 폴란드가 동프로이센·포메른·슐레지엔 *전체* 획득.</li>
  <li><strong>처칠/트루먼 안</strong>: 오데르 강 + *동쪽* 나이세 강(Glatzer Neisse). 슐레지엔 일부만 폴란드 이양.</li>
  <li><strong>최종 합의</strong>: <strong>오데르-(서쪽)나이세 선</strong> *임시* 적용. *최종 결정은 평화 조약에 위임*. → 그러나 평화 조약이 1990년 2+4 조약까지 미체결, *임시 선이 사실상 영구 국경*화.</li>
</ul>
<p>이 결정의 부수 효과로 1945-1947년 사이 약 1,200~1,400만 독일계 인구가 새 국경 동쪽(폴란드·체코슬로바키아·헝가리·유고)에서 *추방(Vertreibung, expulsion)*되어 점령 4지역으로 이동. 8-2 협정 13절은 *"질서 있고 인도적인 방식(orderly and humane manner)"*으로 이주가 이루어져야 한다고 명시했으나 실제로는 폭력·기아·동결로 약 50만~200만 명 사망(추정 편차 큼).</p>
<h4>IV. 독일 배상</h4>
<p>최종 합의는 *"각국 점령지에서 자국 점령 비용 + 배상 회수"* 원칙. 즉, 통합 배상 협정이 아닌 *지역별 회수*. 다만 소련에는 추가 인정:</p>
<ul>
  <li>소련 점령지(동독)에서 우선 회수.</li>
  <li>서구 점령지(서독)의 *공업 시설 25%*를 소련에 이전(15%는 무상, 10%는 식료·원료 교환).</li>
  <li>이 25% 조항은 1946-05 클레이 장군이 일방 중단 → 베를린 위기·동·서독 분단의 직접 도화선.</li>
</ul>
<h4>V. 기타 합의</h4>
<ul>
  <li>오스트리아: 4개국 점령. 빈 4분할.</li>
  <li>이탈리아: UN 가입 지원·평화조약 우선 체결.</li>
  <li>오스트리아·헝가리·루마니아·불가리아·핀란드: UN 가입 지원·평화조약 후속.</li>
  <li>전범: 뉘른베르크 헌장 작성 → 1945-08-08 런던 헌장 → 1945-11-20 뉘른베르크 재판 개시.</li>
  <li>해협(터키): 합의 보류 → 1946-08 소련 vs 터키 위기로 이어져 트루먼 독트린의 직접 동기.</li>
  <li>이란 철군: 1946-03 영국군 철수, 소련군은 1946-05까지 잔류 → 이란 위기.</li>
</ul>`,
    },
    {
      order: 8,
      title: '유산 — 냉전·동아시아·국경의 60년',
      sectionType: 'aftermath',
      content: `<p>포츠담 회담의 유산은 단일 사건의 효과를 넘어 *전후 국제 질서의 헌장*에 가깝다. 학계 평가의 핵심 4축을 정리한다.</p>
<h4>1) 냉전의 사실상 시작점 — *마지막 협조의 순간*</h4>
<ul>
  <li>회담은 *"미·영·소 협조의 마지막 순간"*으로 평가된다. 7-24 원폭 통보 → 동유럽 친소 정권 수립 가속(1945-09~1947-09) → 처칠 풀턴 연설(1946-03) → 트루먼 독트린(1947-03) → 마셜 플랜(1947-06) → 코민포름 결성(1947-09) → 베를린 봉쇄(1948-06) → NATO 창설(1949-04) → 소련 첫 핵실험(1949-08).</li>
  <li>1946-03 처칠 풀턴 연설의 *"발트해 슈테틴부터 아드리아 트리에스테까지"* 표현은 포츠담에서 확인된 *오데르-나이세 선과 그 동쪽 친소 진영*을 직접 가리킨 지리적 묘사.</li>
  <li>가디스 「The Cold War」(2005)·존 레위스 「Stalin and the Cold War」(2010)는 *"냉전은 8-2 직후 시작되었다"*는 견해를 정설화.</li>
</ul>
<h4>2) 동아시아 — 포츠담 선언 → 항복 → 점령</h4>
<ul>
  <li>7-26 포츠담 선언 → 7-28 일본 묵살 → 8-6 히로시마 → 8-8 소련 대일선전포고 → 8-9 나가사키 → 8-10 어전회의 → 8-14 일본 수락 → 8-14 트루먼의 SCAP 임명 → 9-2 미주리함 조인.</li>
  <li>20일간의 *압축 결정 사슬*. 포츠담 선언은 이 사슬의 *최초 트리거*.</li>
  <li>선언 8조의 영토 조항(*카이로 선언 이행*)이 한반도·대만 처리의 직접 근거. *"한반도 38선 분할"*은 General Order No.1에서, *"대만 반환"*은 카이로 선언과 포츠담 선언 8조의 직접 후속.</li>
</ul>
<h4>3) 국경 — 오데르-나이세 선과 추방</h4>
<ul>
  <li>1990-09-12 *2+4 조약*(독일 통일 조약)에서 통일 독일이 오데르-나이세 선을 정식 국경으로 인정 → 동·서 분단 45년 후 *임시 합의의 영구 확정*.</li>
  <li>1945-1947년 약 1,200~1,400만 독일계 인구의 *추방*은 20세기 최대 강제 이주 사건 중 하나. 독일 연방의회는 1985년 *"기억의 책임(Erinnerungsverantwortung)"* 결의로 양면적 평가 유지 — *"독일이 자초한 결과지만, 추방의 잔혹성은 별도로 기억되어야 한다"*.</li>
  <li>1990년대 이후 *체코·폴란드와의 화해 외교*(1991 슬로바키아·1991 체코·1992 폴란드 우호협력조약)의 직접 토대.</li>
</ul>
<h4>4) 정상회담 외교의 모델</h4>
<ul>
  <li>포츠담의 *정상 + 외상 + 군부 + 실무진 4단 구조*는 이후 모든 정상회담의 표준 모델로 정착.</li>
  <li>1955 제네바·1959 캠프 데이비드·1972 닉슨-마오 베이징·1986 레이캬비크·1989 몰타 등이 모두 포츠담 모델의 변형.</li>
  <li>특히 *비공식 1:1 회담의 결정력*은 7-24 원폭 통보 사례가 *"단 90초의 발화가 회담 17일을 압도한다"*는 정상외교의 본질을 처음 시연.</li>
</ul>
<h4>1차 사료 및 학계 평가</h4>
<ul>
  <li><strong>FRUS</strong>(Foreign Relations of the United States), Conference of Berlin (The Potsdam Conference) 1945, 2 vols. — 미·영·소 회담록·문서 결정판.</li>
  <li><strong>NARA RG 43</strong>(International Conferences) — 미국 측 원본.</li>
  <li><strong>UK National Archives, CAB 99/39</strong> — 영국 측 회담록(처칠 정부)·CAB 99/40(애틀리 정부).</li>
  <li><strong>러시아 외교사료관(АВПРФ)</strong>, 포츠담 관련 폰드 — 1990년대 이후 부분 공개. 특히 7-24 원폭 통보 후 스탈린 → 베리야 핵 가속화 지시 전보 1995년 공개.</li>
  <li>주요 회고록: 트루먼 「Memoirs」 vol.1(1955), 처칠 「Triumph and Tragedy」(1953), 번스 「Speaking Frankly」(1947), 주코프 「Воспоминания и размышления」(1969), 몰로토프 「Молотов помнит」(1991).</li>
</ul>
<h4>주요 학술 분석</h4>
<ul>
  <li><strong>Charles L. Mee Jr.</strong> "Meeting at Potsdam" (1975) — 회담 전체의 표준 통사.</li>
  <li><strong>Herbert Feis</strong> "Between War and Peace: The Potsdam Conference" (1960) — 미국 측 시각의 고전.</li>
  <li><strong>Tsuyoshi Hasegawa</strong> "Racing the Enemy: Stalin, Truman, and the Surrender of Japan" (2005) — 7-24 원폭 통보의 미·소·일 3각 분석.</li>
  <li><strong>Marc Trachtenberg</strong> "A Constructed Peace: The Making of the European Settlement, 1945-1963" (1999) — 오데르-나이세 선 결정의 장기 효과.</li>
  <li><strong>Geoffrey Roberts</strong> "Stalin's Wars" (2006) — 소련 측 의도의 재구성.</li>
  <li><strong>五百旗頭真</strong> 「米国の日本占領政策」(1985) — 포츠담 선언 12조 천황제 조항 삭제 과정의 일본 측 분석.</li>
</ul>
<p>포츠담 회담은 17일간의 단일 사건이지만, 그 결과로 형성된 (1) 냉전, (2) 동아시아 점령 구조, (3) 유럽 국경, (4) 정상외교 모델은 모두 60~80년의 시계열 효과를 가진다. 이 점에서 8-2 새벽 0시 30분의 서명은 *전후 세계 질서의 출생증명서*로 평가된다.</p>`,
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
      roleDescription: '회담 주도국. 트루먼 대통령·번스 국무장관 참석. 트리니티 핵실험(7-16) 직후 회담장에서 7-24 원폭 통보·7-26 포츠담 선언 주도.',
    },
    {
      countryName: '영국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '빅3 일원. 처칠(7-17~25)·이든 외무 → 7-26 총선 결과 → 애틀리(7-28~)·베빈 외무로 회담 도중 정상 교체. 포츠담 선언·협정 양 문서에 모두 서명.',
    },
    {
      historicalCountryName: '소비에트 사회주의 공화국 연방',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '빅3 일원. 스탈린·몰로토프 참석. 일소 중립조약 명목으로 포츠담 선언에는 명의 누락. 8-8 대일선전포고로 동아시아 합류 — 7-24 원폭 통보가 가속화.',
    },
    {
      countryName: '중국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '포츠담 선언 명의 가입국(중화민국). 장제스가 7-26 충칭에서 전화로 명의 가입 동의. 회담장 부재 — 처칠이 명의 위임 서명.',
    },
    {
      historicalCountryName: '나치 독일 (제3제국)',
      role: EventCountryRole.TARGET,
      roleDescription: '회담의 1차 대상국. 4분할 점령·5D 원칙·오데르-나이세 선·배상이 모두 독일 처리에 해당. 사실상 *독일의 운명을 결정한 회담*.',
    },
    {
      historicalCountryName: '일본 제국',
      role: EventCountryRole.TARGET,
      roleDescription: '7-26 포츠담 선언의 수신국. 7-28 *묵살(黙殺)*로 거부 의사 표시 → 8-6·9 원폭 → 8-14 수락. 회담의 *동아시아 측 1차 결과*.',
    },
    {
      countryName: '폴란드',
      role: EventCountryRole.BENEFICIARY,
      roleDescription: '서부 국경(오데르-나이세 선)·동프로이센·포메른·슐레지엔 획득. 그러나 동시에 친소 임시정부 묵인으로 정치적 자율성은 제한 — *복합 수혜*.',
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
      role: '미국 대표(대통령)',
      note: '회담 *내내 미국 단장*. 7-7 워싱턴 출항, 7-15 베를린 도착, 8-2 회담 종료 후 귀항. 7-24 19:30 스탈린에 원폭 비공식 통보. 7-26 포츠담 선언·8-2 협정 서명.',
    },
    {
      originalName: 'James F. Byrnes',
      role: '미국 외상(국무장관)',
      note: '회담 미국 측 외상. 외상회의 매일 11:00 의장. 포츠담 선언 12조 천황제 조항 삭제 결정 동참(7-22). *Speaking Frankly*(1947) 회고록은 회담 미국 측 1차 사료.',
    },
    {
      originalName: 'Winston Churchill',
      role: '영국 대표 1단계(총리, 7-17~25)',
      note: '빅3 회담 전반부 영국 단장. 7-25 영국 총선 개표 결과 발표를 위해 단독 귀국. 7-26 사임. 회고록 「Triumph and Tragedy」(1953)에 7-24 트루먼-스탈린 원폭 통보 장면을 *5야드 거리*에서 직접 관찰한 기록 수록.',
    },
    {
      originalName: 'Clement Attlee',
      role: '영국 대표 2단계(총리, 7-28~)',
      note: '7-26 총리 취임 → 7-28 베를린 도착. *"no change"* 입장 표명으로 회담 후반부 영국 노선 유지. 폴란드 서부 국경·독일 배상 합의에 서명.',
    },
    {
      originalName: 'Joseph Stalin',
      role: '소련 대표(공산당 서기장 + 인민위원회의장)',
      note: '회담 *내내 소련 단장*. 7-15 모스크바 출발, 7-16 베를린 도착(트루먼 환영). 7-24 트루먼의 원폭 통보를 *무표정*으로 수령 — 그러나 KGB 첩보망(클라우스 푹스 등)을 통해 1942년부터 맨해튼 계획 인지. 회담 종료 후 베리야에 핵 프로그램 가속화 지시.',
    },
    {
      originalName: 'Vyacheslav Molotov',
      role: '소련 외상(외무인민위원)',
      note: '소련 측 외상. 폴란드 국경(오데르-(서쪽)나이세)·독일 배상 25% 조항·터키 해협 통제 의제 직접 협상. 8-8 사토 나오타케 일본 대사에 대일선전포고 통고를 직접 전달.',
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

  console.log(`\n✅ 포츠담 회담 시딩 완료\n`)
}
