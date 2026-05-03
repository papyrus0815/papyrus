/**
 * 1951-09-08 샌프란시스코 강화조약 체결 — 참여 인물 보강 시드
 *
 * 사건 본문(Event/Section/CountryRelation)은 person.japan-postwar2.seed.ts에 이미 등록됨.
 * 본 시드는 *참여 인물(PersonEvent)*만 추가로 등록한다.
 *
 * 신규 인물 4명
 *  - John Foster Dulles (덜레스, 미국 특사·조약 설계자)
 *  - Herbert Morrison (모리슨, 영국 외무장관·서명자)
 *  - Andrei Gromyko (그로미코, 소련 외무차관·서명 거부 주도)
 *  - Ikeda Hayato (이케다 하야토, 일본 대장상·요시다 측근·전권 위원)
 *
 * 기존 인물 활용
 *  - Yoshida Shigeru — 일본 총리·전권 위원장(서명자) (japan-postwar 시드)
 *  - Harry S. Truman — 미국 대통령·개회 연설 (truman-scap-appointment 시드)
 *  - Dean Acheson — 미국 국무장관·회의 의장(공동) (event.korean-war 시드)
 *  - Clement Attlee — 영국 총리(전 시기, 1951-10-26까지) (potsdam-conference 시드)
 *  - Joseph Stalin — 소련 공산당 서기장(불참 결정자) (russia-bolsheviks 시드)
 *
 * 의존성
 *  - Event '샌프란시스코 강화조약 체결' (person.japan-postwar2.seed.ts에서 등록)
 *  - 위 5명의 기존 Person originalName 일치
 */
import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_TITLE = '샌프란시스코 강화조약 체결'

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
    originalName: 'John Foster Dulles',
    name: '존',
    middleName: 'F.',
    surname: '덜레스',
    biography:
      '미국 외교관·국무장관(재임 1953-01-26 ~ 1959-04-22). 1888년 워싱턴 D.C. 장로교 목사 가정 출생, 외조부 존 W. 포스터(국무장관, 1892-1893)·외삼촌 로버트 랜싱(국무장관, 1915-1920)의 외교 명문. 1908년 프린스턴 학사·조지워싱턴 로스쿨 졸업, 설리번앤드크롬웰 로펌 평생 근무(1911-1949 시니어 파트너). 1907년 헤이그 평화회의에서 16세에 외조부 비서로 첫 외교 경험. 1차 대전 후 베르사유 평화회의 미국 대표단 법률고문, 1945년 샌프란시스코 UN 창립회의 미국 대표단원. 1949-07 ~ 1949-11 듀이 뉴욕 주지사 임명으로 임시 상원의원. 1950-04 트루먼이 *대일 강화 특사*로 임명, 1950-06 ~ 1951-09 *덜레스 미션*으로 영국·호주·뉴질랜드·필리핀·인도 등 14개국 셔틀 외교. *"징벌적이지 않은(non-punitive) 강화"* 설계로 ① 일본의 빠른 주권 회복, ② 미·일 안보조약 동시 체결, ③ ANZUS·미·필리핀 상호방위조약 패키지를 만든 *전후 동아시아 안보 구조의 건축가*. 1951-09-08 샌프란시스코에서 미국 측 *서명자*. 1953년 아이젠하워 정부에서 국무장관으로 6년 재임, *대량 보복(massive retaliation)·도미노 이론·SEATO·바그다드 조약*의 봉쇄 정책 강경 라인을 설계. 1959-04 위암 사망.',
    birthYear: 1888, birthMonth: 2, birthDay: 25,
    deathYear: 1959, deathMonth: 5, deathDay: 24,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '미국 워싱턴 D.C.',
    influence: 90,
    stats: {
      politics: 85, military: 65, diplomacy: 95, intellect: 95, charisma: 78, administration: 88,
      notes: '대일 강화 + 미·일 안보 패키지 설계자. 외교 명문가 출신의 *법률가형 외교관*.',
    },
  },
  {
    originalName: 'Herbert Morrison',
    name: '허버트',
    middleName: 'S.',
    surname: '모리슨',
    biography:
      '영국 노동당 정치인·외무장관(재임 1951-03-09 ~ 1951-10-26). 1888년 런던 람베스 경찰관 가정 출생, 14세에 학교 떠나 식료점·인쇄공·신문 배달 등 노동계급 직업. 노동당 런던 지역 조직 활동을 거쳐 1922년 해크니 사우스 하원의원 첫 당선. 1929-1931년 1차 노동당 정부 운수장관으로 *런던 패신저 트랜스포트 보드(LPTB)* 통합 입안. 1940-1945 처칠 거국 전시내각 *국내장관(Home Secretary)*으로 본토 방어·민방위·MI5 운영. 1945-1951 애틀리 노동당 정부에서 *부총리(Lord President of the Council)* 겸 하원 원내총무로 *NHS·산업 국유화 입법*의 의회 통과를 직접 지휘 — *전후 영국 사회 계약*의 입법 좌장. 1951-03 베빈 외무장관 사망 후 외무장관 승계, *7개월짜리 단명 외무장관*. 그 7개월 동안 ① 1951-04-15 영국령 이란 석유 국유화(모사데크 위기), ② 1951-09-08 샌프란시스코 강화조약 영국 측 *서명*, ③ 1951-10-25 총선 패배의 3대 사건을 처리했다. 1955년 노동당 당수 경선에서 게이츠컬·베번에 패배, 1959년 의회 사임 → 모리슨 자작(Baron Morrison of Lambeth) 작위. 회고록 「Herbert Morrison: An Autobiography」(1960).',
    birthYear: 1888, birthMonth: 1, birthDay: 3,
    deathYear: 1965, deathMonth: 3, deathDay: 6,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '영국 잉글랜드 런던 람베스',
    influence: 78,
    stats: {
      politics: 88, military: 60, diplomacy: 75, intellect: 78, charisma: 80, administration: 92,
      notes: '런던 노동당 머신의 보스. *NHS·국유화*의 의회 운영 좌장 — 행정·입법 조직력 표준.',
    },
  },
  {
    originalName: 'Andrei Gromyko (Андре́й Громы́ко)',
    name: '안드레이',
    middleName: 'A.',
    surname: '그로미코',
    biography:
      '소련 외무차관(1949-1952·1953-1957)·외무장관(재임 1957-02-15 ~ 1985-07-02)·소련최고회의 간부회 의장(1985-07-02 ~ 1988-10-01). 1909년 벨로루시 SSR 모길료프 주 스타리예 그로미키 농민 가정 출생, 민스크 농업기술학교 → 1939년 모스크바 농업경제학 박사. 1939년 외교 인민위원부 입부 — 스탈린 대숙청 직후 *외교부 대거 충원*의 신세대로 등용. 1939-1943 워싱턴 미국 대사관 참사관, 1943-1946 *소련 미국 대사*(35세에 대사 — 소련 외교사 최연소), 1946-1948 UN 안보리 소련 대표(*"미스터 거부권(Mr. Veto)"* 별명, 25번 거부권 행사). 1949 외무차관, 1951-09-04 ~ 09-08 샌프란시스코 강화회의에 소련 대표단장으로 참가, *대일 강화조약 본문 7개 수정안* 제출 후 모두 부결되자 9-8 *서명 거부* 표명·체코·폴란드 동조. 이후 1957-1985 *28년 5개월간 외무장관* — 소련사 최장기 외상. 흐루쇼프 ~ 브레즈네프 ~ 안드로포프 ~ 체르넨코 ~ 고르바초프 5명의 서기장 휘하에서 외교를 담당. 1985-07 외상 사퇴 후 명목 국가원수(소련최고회의 간부회 의장), 1988-10 사임. 회고록 「Памятное」(1988, 2 vols.) 사후 영문본 「Memoirs」(1989).',
    birthYear: 1909, birthMonth: 7, birthDay: 18,
    deathYear: 1989, deathMonth: 7, deathDay: 2,
    gender: 'MALE',
    nameDisplayOrder: 'western',
    birthPlaceText: '러시아 제국 모길료프 주 스타리예 그로미키(현 벨라루스)',
    influence: 88,
    stats: {
      politics: 82, military: 60, diplomacy: 95, intellect: 92, charisma: 60, administration: 90,
      notes: '*"미스터 녯(Mr. Nyet)"* — 28년 외상의 인내·정확·지구력. 소련 외교의 표준.',
    },
  },
  {
    originalName: 'Ikeda Hayato',
    name: '하야토',
    surname: '이케다',
    biography:
      '일본 정치인·제58·59·60대 내각총리대신(재임 1960-07-19 ~ 1964-11-09). 1899년 히로시마현 다케하라(現 다케하라시) 양조업 가정 출생, 교토 제국대학 법학부 졸업(1925) 후 대장성 입성. 결핵 요양 8년·세금 채권 부서를 거쳐 1947 대장차관, 1948 사무차관 직후 정계 입문. 1949-02 ~ 1952-10 요시다 시게루의 *대장상*(재무장관)으로 *닷지 라인*(1949-04 GARIOA 부채 정리) 실행 + *사무라이 재정* 별명. 1951-09-04 ~ 09-08 샌프란시스코 강화회의 *일본 측 전권 위원*(요시다 시게루·호시지마 니로·이치마다 히사토·도쿠가와 무네요시·이케다 하야토·마쓰모토 슌이치·도모마쓰 토라키치 7인). 1956 통상산업대신, 1958-1960 다시 대장상. 1960-07 안보 파동 후 기시 노부스케 사임으로 총리 취임, *"소득배증 계획(国民所得倍増計画)"*(1960-12 결정, 10년 만에 국민소득 2배 목표 → 실제 7년 만에 달성)으로 일본 고도성장기를 열었다. *"인내와 관용(寛容と忍耐)"* 정치 슬로건. 1964-10 도쿄 올림픽 개막 직후 후두암 진단·11-09 사임, 1965-08 사망.',
    birthYear: 1899, birthMonth: 12, birthDay: 3,
    deathYear: 1965, deathMonth: 8, deathDay: 13,
    gender: 'MALE',
    nameDisplayOrder: 'korean',
    birthPlaceText: '일본 히로시마현 도요타군 후나키촌(현 다케하라시)',
    influence: 86,
    stats: {
      politics: 88, military: 55, diplomacy: 80, intellect: 90, charisma: 78, administration: 95,
      notes: '*경제 총리*의 표준. 닷지 라인·소득배증의 대장성-총리 라인 좌장.',
    },
  },
]

interface PersonLink {
  originalName: string
  role: string
  note: string
}

const PERSON_LINKS: PersonLink[] = [
  // ── 일본 측 ────────────────────────────────────────────────────────
  {
    originalName: 'Yoshida Shigeru',
    role: '일본 총리·전권 위원장(서명자)',
    note: '제3차 요시다 내각 총리. 일본 측 전권 위원장으로 1951-09-04 회의 참가, 9-7 영어로 *"이 조약은 복수의 도구가 아닌 화해의 도구"* 수락 연설, 9-8 14:43 일본 대표 첫 서명. 같은 날 오후 별도로 *미·일 안전보장조약*(요시다·애치슨)에도 단독 서명.',
  },
  {
    originalName: 'Ikeda Hayato',
    role: '일본 대장상·전권 위원',
    note: '요시다의 대장상. 1951년 샌프란시스코 일본 7인 전권 위원 중 한 명, *역무 배상* 조항(제14조) 협상 핵심 인물. 이후 1960년 총리 취임 후 *소득배증 계획*으로 강화조약 후 일본 부흥의 정치적 결과를 직접 정책화.',
  },
  // ── 미국 측 ────────────────────────────────────────────────────────
  {
    originalName: 'Harry S. Truman',
    role: '미국 대통령(개회 연설)',
    note: '1951-09-04 19:00 회의 개회식에서 *"우리는 화해와 협력의 강화를 추진한다"* 라디오 동시 중계 개회 연설. 회의 참가는 개회식만, 본 협상·서명은 애치슨·덜레스·UN대사 워런 오스틴에 위임. 1952-04-28 발효 후 4-30 백악관에서 비준서 교환 의식 주관.',
  },
  {
    originalName: 'Dean Acheson',
    role: '미국 국무장관·회의 의장',
    note: '회의 의장(Chairman of the Conference) — 9-4 ~ 9-8 본회의 사회. 9-5 회의 절차 규칙으로 *"수정안 발의 권한 제한"*을 가결시켜 그로미코의 7개 수정안 발의 자체를 봉쇄한 *절차적 결정*이 회의 향방을 결정. 1951-09-08 미국 측 서명자. *"덜레스가 설계, 애치슨이 의장"*의 분업 구조.',
  },
  {
    originalName: 'John Foster Dulles',
    role: '미국 대일 강화 특사·서명자',
    note: '1950-04 트루먼 임명으로 1년 5개월간 14개국 셔틀 외교로 조약 본문 설계. 9-5 본회의에서 *조약 정신 설명* 약 40분 기조연설로 *"징벌이 아닌 화해"* 원칙 천명. 1951-09-08 미국 측 서명자(애치슨과 공동). 같은 날 미·일 안보조약은 별도 협의 — *조약 패키지의 사실상 작성자*.',
  },
  // ── 영국 측 ────────────────────────────────────────────────────────
  {
    originalName: 'Clement Attlee',
    role: '영국 총리(시기 중)',
    note: '회의 시점 영국 총리(노동당 정부, 1951-10-26 총선 패배 직전). 회의 직접 참가는 모리슨 외상에 위임했으나, 영국 정부의 조약 비준·국익 보호의 *최종 정치 책임자*. 회의 직후 10-25 총선 패배로 정권 인계, 후속 처칠 정부가 1952-04 비준 절차를 마무리.',
  },
  {
    originalName: 'Herbert Morrison',
    role: '영국 외무장관·서명자',
    note: '베빈 사망(1951-04-14) 후 외무장관 승계. 1951-09-08 영국 측 서명자 — *영연방 5국(영국·호주·뉴질랜드·캐나다·남아공·인도 — 인도는 불참)*의 정치적 조정을 떠맡았다. 호주·뉴질랜드의 *재무장 일본에 대한 안보 우려*를 ANZUS 조약(1951-09-01 별도 체결)으로 해소시킨 외교적 성취가 회의 성사의 전제.',
  },
  // ── 소련 측 ────────────────────────────────────────────────────────
  {
    originalName: 'Joseph Stalin',
    role: '소련 공산당 서기장(불참 결정자)',
    note: '회의에 직접 불참, 그로미코 외무차관에 *전권* 위임. 그러나 ① 회의 의제 설정·② 7개 수정안 작성·③ 서명 거부 결정 모두 모스크바 정치국이 사전 결재. *대일 강화 = 미·일 동맹화*를 분명히 인지하고, *서명 거부 후 별도 평화 시도*를 1956-10-19 일·소 공동선언까지 끌어 갔다(영토 문제 미해결로 평화조약은 미체결 상태).',
  },
  {
    originalName: 'Andrei Gromyko (Андре́й Громы́ко)',
    role: '소련 외무차관·대표단장(서명 거부)',
    note: '소련 대표단장. 9-5 본회의에서 *7개 수정안* 발의 — ① 중공 초청, ② 류큐·오가사와라 일본 잔류, ③ 일본 영토 명시(쿠릴·사할린 소련 귀속), ④ 외국군 철수, ⑤ 일본 재무장 금지, ⑥ 가입국 확대, ⑦ 별도 회담 1년 연기. 모두 부결. 9-8 본회의에서 *"이 조약은 진정한 평화 조약이 아니다"* 격렬 항의 후 체코·폴란드 대표와 함께 *서명 거부* — 소련·체코·폴란드 3국이 미서명. 9-9 모스크바 귀국, 별도 *"적대적 단독 강화 비난"* 외교 캠페인 주도.',
  },
]

export async function seedSanFranciscoTreatyPersons(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🇯🇵 1951-09-08 샌프란시스코 강화조약 — 참여 인물 보강 시딩 시작...')

  // ── 0. 의존성 점검 ─────────────────────────────────────────────────
  const event = await prisma.event.findFirst({
    where: { title: EVENT_TITLE, deletedAt: null },
    select: { id: true, title: true },
  })
  if (!event) {
    console.warn(`  ⚠️  사건 미존재: ${EVENT_TITLE} — seedJapanPostwar2 먼저 필요`)
    return
  }
  console.log(`  📌 대상 사건: ${event.title} (id=${event.id})`)

  // ── 1. 신규 인물 등록 ──────────────────────────────────────────────
  console.log('\n  👤 신규 인물 등록...')
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

  // ── 2. PersonEvent 링크 ──────────────────────────────────────────
  console.log('\n  👥 인물 관계 등록...')
  for (const link of PERSON_LINKS) {
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

  console.log(`\n✅ 샌프란시스코 강화조약 인물 보강 완료\n`)
}
