import {
  PersonCountryAffiliationType,
  PersonHumanRelationshipType,
  PersonRelationshipTag,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 러시아 혁명·소비에트 핵심 3인 시드
 *
 *   1) Vladimir Lenin   (1870–1924) — 본명 Ulyanov.   10월 혁명 지도자, 초대 인민위원회 의장
 *   2) Leon  Trotsky    (1879–1940) — 본명 Bronstein. 적군(赤軍) 창설자, 1929년 추방·1940년 멕시코에서 암살
 *   3) Joseph Stalin    (1878–1953) — 본명 Dzhugashvili. 1924년 이후 사실상 최고지도자
 *
 * 관계:
 *   - 레닌 ↔ 트로츠키: 1917 혁명·내전기 핵심 동맹 (ALLY/COLLEAGUE)
 *   - 레닌 ↔ 스탈린:  볼셰비키 동료 → 만년 레닌이 후계 평가에서 스탈린 경계 ("유언장", 1922–1923)
 *   - 트로츠키 ↔ 스탈린: 권력 투쟁의 양대 라이벌, 결국 적대 (RIVAL/ENEMY)
 *
 * 등록 정보:
 *   - 인물 본체 (이름·생몰·전기·사망유형·영향력)
 *   - PersonCountryAffiliation (출생지·시민권·봉사국·망명지)
 *   - PersonHumanRelationship (3쌍, 양방향)
 *   - PersonStats (ACCOUNT_ID 기준 6축 능력치 — 정치·군사·외교·학식·카리스마·행정)
 *   - PersonLifeEvent (3인 연보 — 학업·망명·집필·정치활동·가족사·건강 등)
 *
 * 이 시드는 idempotent: 인물(originalName)·관계(from,to,type)·affiliation(person+country+type+startDate)
 * ·stats(personId+accountId)·lifeEvent(personId+title) 모두 존재하면 skip 또는 update.
 */

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface RevolutionaryEntry {
  /** 한글 이름 부분 */
  name: string
  /** 한글 성씨 — Person.surname (가명 기준) */
  surname: string
  /** Person.originalName — idempotent 키로 사용 (가명 기준 영문) */
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear: number
  deathMonth: number
  deathDay: number
  deathType: 'NATURAL' | 'ILLNESS' | 'ASSASSINATION' | 'EXECUTION'
  deathCause?: string
  /** 0–100. 20세기 정치사 영향력 평가 */
  influence: number
}

const REVOLUTIONARIES: RevolutionaryEntry[] = [
  {
    name: '블라디미르',
    surname: '레닌',
    originalName: 'Vladimir Lenin',
    biography:
      '러시아 혁명가·정치가. 본명은 블라디미르 일리치 울리야노프(Ульянов). 1903년 러시아 사회민주노동당 분열에서 볼셰비키 분파를 이끌었으며, 1917년 4월 망명지에서 귀국해 4월 테제로 무장봉기 노선을 제시했다. 같은 해 10월(구력) 페트로그라드 무장봉기를 지도해 임시정부를 전복하고 인민위원회 의장에 취임, 1918년 브레스트-리토프스크 조약으로 1차 대전에서 이탈한 뒤 적백내전을 승리로 이끌었다. 만년에는 신경제정책(NEP) 도입과 소비에트연방 창설(1922)을 주도했으나 1922년부터 잇따른 뇌졸중으로 활동이 제한되었고, 1924년 1월 고리키에서 사망했다. 사망 직전 작성한 "당대회에 보내는 편지"(이른바 유언장)에서 스탈린의 서기장 직 해임을 권고한 것으로 유명하다.',
    birthYear: 1870, birthMonth: 4, birthDay: 22,
    deathYear: 1924, deathMonth: 1, deathDay: 21,
    deathType: 'ILLNESS',
    deathCause: '뇌출혈 (수차례 뇌졸중 후유증)',
    influence: 98, // 20세기 가장 영향력 있는 혁명가, 소비에트 체제 창건자
  },
  {
    name: '레프',
    surname: '트로츠키',
    originalName: 'Leon Trotsky',
    biography:
      '러시아 혁명가·이론가·군 지도자. 본명은 레프 다비도비치 브론슈테인(Бронштейн). 1905년 혁명에서 페테르부르크 소비에트 의장을 지냈고, 1917년 8월 볼셰비키에 합류해 페트로그라드 소비에트 의장으로 10월 무장봉기를 실무 지휘했다. 외무인민위원으로 브레스트-리토프스크 협상을 맡은 뒤 군사인민위원으로 적군(赤軍)을 창설하고 적백내전을 지휘해 볼셰비키 정권을 사수했다. 레닌 사후 스탈린과의 권력투쟁에서 패배해 1927년 당에서 제명, 1929년 국외로 추방되어 터키·프랑스·노르웨이를 거쳐 1937년 멕시코에 정착했다. 1938년 제4 인터내셔널을 창설했으며, 1940년 8월 21일 멕시코시티 자택에서 NKVD 요원 라몬 메르카데르의 얼음송곳 공격으로 암살되었다. 영구혁명론(永久革命論)의 주창자로 마르크스주의 사상사에 큰 족적을 남겼다.',
    birthYear: 1879, birthMonth: 11, birthDay: 7,
    deathYear: 1940, deathMonth: 8, deathDay: 21,
    deathType: 'ASSASSINATION',
    deathCause: '얼음송곳 공격에 의한 두부 외상 (NKVD 요원 라몬 메르카데르)',
    influence: 82, // 권력투쟁 패배·추방으로 실권은 짧았으나 사상·이론 영향은 지속
  },
  {
    name: '이오시프',
    surname: '스탈린',
    originalName: 'Joseph Stalin',
    biography:
      '소비에트연방의 정치가. 본명은 이오시프 비사리오노비치 주가시빌리(Джугашвили). 그루지야 고리에서 구두 수선공의 아들로 태어나 신학교에서 추방된 뒤 캅카스 지역에서 볼셰비키 비합법 활동(은행 강도, 노동자 조직)에 종사했다. 1917년 페트로그라드 귀환 후 당 중앙위원, 1922년 당 서기장에 임명되어 인사권을 장악했다. 레닌 사후 1924–1929년 좌익반대파(트로츠키·지노비예프·카메네프)와 우익반대파(부하린)를 차례로 숙청하며 1인 지배 체제를 구축했다. 1928년부터 5개년 계획에 의한 급속 공업화·농업집단화를 강행해 우크라이나 대기근(1932–1933) 등 막대한 인명 손실을 낳았고, 1936–1938년 대숙청(예조프시나)으로 당·군 간부 다수를 처형했다. 2차 세계대전(독소전)에서는 적군 최고사령관으로서 베를린 함락까지 지휘해 동유럽에 소비에트 위성국 체제를 수립했고, 전후 냉전 초기 진영의 지도자로 군림하다 1953년 3월 모스크바 근교 별장에서 뇌출혈로 사망했다.',
    birthYear: 1878, birthMonth: 12, birthDay: 18,
    deathYear: 1953, deathMonth: 3, deathDay: 5,
    deathType: 'ILLNESS',
    deathCause: '뇌출혈',
    influence: 97, // 30년간 소련 최고지도자, 2차 대전 승전·동유럽 위성권 구축
  },
]

/** 3인 사이의 인간관계 — 시기별 특성이 강해 phase로 표현하지 않고 본체 affinityLevel 평균값 사용 */
interface PairRelation {
  a: string
  b: string
  tags: PersonRelationshipTag[]
  /** -2..+2. 전체 평균/대표값 */
  affinityLevel: number
  trustLevel: number
  startYear: number
  startMonth: number
  startDay: number
  note: string
}

const PAIR_RELATIONS: PairRelation[] = [
  {
    a: 'Vladimir Lenin',
    b: 'Leon Trotsky',
    tags: [PersonRelationshipTag.ALLY, PersonRelationshipTag.COLLEAGUE],
    affinityLevel: 1, // 우호적 — 1903년 분열기에는 갈등이 있었으나 1917년 이후 핵심 동맹
    trustLevel: 1,
    startYear: 1917, startMonth: 8, startDay: 1, // 1917년 8월 트로츠키 볼셰비키 합류
    note:
      '1903년 RSDRP 2차 당대회 분열 당시에는 트로츠키가 멘셰비키와 가까웠고 레닌과 격렬히 대립했으나, 1917년 8월 볼셰비키 합류 이후 10월 혁명·내전 시기 가장 가까운 협력자가 되었다. 레닌은 트로츠키를 "당내 가장 유능한 인물"로 평가하면서도 그의 비(非)볼셰비키적 과거와 자만을 결점으로 지적했다(유언장, 1922).',
  },
  {
    a: 'Vladimir Lenin',
    b: 'Joseph Stalin',
    tags: [PersonRelationshipTag.COLLEAGUE, PersonRelationshipTag.RIVAL],
    affinityLevel: -1, // 만년 경계감이 표면화되며 평균은 약하게 적대 쪽
    trustLevel: -1,
    startYear: 1912, startMonth: 1, startDay: 1, // 1912년 프라하 협의회에서 스탈린 중앙위원 진출 — 본격 협력 시작
    note:
      '1912년 프라하 당협의회 이후 볼셰비키 핵심 실무자로 협력했고, 스탈린은 "민족 문제와 사회민주주의"(1913)를 레닌의 의뢰로 집필했다. 그러나 1922년 그루지야 사건과 나데즈다 크룹스카야에 대한 스탈린의 무례한 처사로 레닌은 결정적으로 등을 돌려, "당대회에 보내는 편지"(1922–1923)에서 스탈린의 서기장 직 해임을 명시적으로 권고했다.',
  },
  {
    a: 'Leon Trotsky',
    b: 'Joseph Stalin',
    tags: [PersonRelationshipTag.RIVAL, PersonRelationshipTag.ENEMY],
    affinityLevel: -2, // 매우 적대
    trustLevel: -2,
    startYear: 1918, startMonth: 1, startDay: 1, // 내전기 차리친(스탈린그라드) 군사 운영 갈등으로 본격 충돌
    note:
      '내전기 차리친 방어전(1918) 운영을 두고 군사인민위원 트로츠키와 현지 스탈린 사이에 격렬한 갈등이 빚어졌고, 이는 평생의 적대로 이어졌다. 레닌 사후 1924–1927년 권력투쟁에서 스탈린은 지노비예프·카메네프·부하린과 차례로 동맹을 바꾸며 트로츠키를 고립·축출했다. 1929년 국외 추방 이후에도 스탈린은 트로츠키를 "주적"으로 규정해 1936–1938년 모스크바 재판에서 궐석 사형을 선고했고, 1940년 NKVD가 멕시코에서 트로츠키를 암살했다.',
  },
]

/** 인물-국가 affiliation. historicalCountryName은 historical_country.name과 일치해야 함 */
interface AffiliationEntry {
  originalName: string
  historicalCountryName: string
  type: PersonCountryAffiliationType
  startYear?: number
  endYear?: number
  /** 낮을수록 우선 — 주 국적 정렬용 */
  priority: number
  note?: string
}

const AFFILIATIONS: AffiliationEntry[] = [
  // ── 레닌 ─────────────────────────────────────────────────────────
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.BIRTH_PLACE,
    startYear: 1870,
    priority: 0,
    note: '심비르스크(현 울리야놉스크) 출생.',
  },
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1870, endYear: 1917,
    priority: 1,
  },
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1917, endYear: 1922,
    priority: 0,
  },
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1922, endYear: 1924,
    priority: 0,
  },
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1917, endYear: 1924,
    priority: 0,
    note: '인민위원회 의장(국가수반).',
  },
  {
    originalName: 'Vladimir Lenin',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1922, endYear: 1924,
    priority: 0,
    note: '소련 초대 인민위원회 의장.',
  },

  // ── 트로츠키 ─────────────────────────────────────────────────────
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.BIRTH_PLACE,
    startYear: 1879,
    priority: 0,
    note: '헤르손 현(現 우크라이나) 야노브카 출생.',
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1879, endYear: 1917,
    priority: 1,
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1917, endYear: 1922,
    priority: 0,
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1922, endYear: 1932,
    priority: 0,
    note: '1932년 스탈린이 시민권을 박탈.',
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1917, endYear: 1922,
    priority: 0,
    note: '외무인민위원·군사인민위원·페트로그라드 소비에트 의장.',
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1922, endYear: 1925,
    priority: 0,
    note: '군사인민위원(1925년 해임).',
  },
  {
    originalName: 'Leon Trotsky',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.EXILE,
    startYear: 1929, endYear: 1940,
    priority: 0,
    note:
      '1929년 국외 추방. 터키(프린키포) → 프랑스 → 노르웨이 → 멕시코(1937년 정착, 1940년 암살).',
  },

  // ── 스탈린 ───────────────────────────────────────────────────────
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.BIRTH_PLACE,
    startYear: 1878,
    priority: 0,
    note: '그루지야 티플리스 현 고리(Gori) 출생.',
  },
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '러시아 제국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1878, endYear: 1917,
    priority: 1,
  },
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1917, endYear: 1922,
    priority: 0,
  },
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.CITIZENSHIP,
    startYear: 1922, endYear: 1953,
    priority: 0,
  },
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '러시아 소비에트 연방 사회주의 공화국',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1917, endYear: 1922,
    priority: 0,
    note: '민족인민위원·노농감독인민위원.',
  },
  {
    originalName: 'Joseph Stalin',
    historicalCountryName: '소비에트 사회주의 공화국 연방',
    type: PersonCountryAffiliationType.SERVED,
    startYear: 1922, endYear: 1953,
    priority: 0,
    note:
      '소련공산당 서기장(1922–1952), 인민위원회 의장→각료회의 의장(1941–1953), 국방인민위원·최고사령관(2차 대전).',
  },
]

/** PersonStats 6축 — 사용자(ACCOUNT_ID)별 평가 */
interface StatsEntry {
  originalName: string
  politics: number       // 정치 (정쟁·국내 권력 운용)
  military: number       // 군사 (야전 지휘·전략)
  diplomacy: number      // 외교 (협상·동맹)
  intellect: number      // 학식 (학문·저술)
  charisma: number       // 카리스마 (대중·부하 장악)
  administration: number // 행정 (통치·재정·관료 운용)
  notes: string
}

const STATS: StatsEntry[] = [
  {
    originalName: 'Vladimir Lenin',
    politics: 95,        // 분파 투쟁·당내 노선 장악의 화신
    military: 60,        // 야전 지휘는 없으나 내전 전략 결정의 최종 책임
    diplomacy: 75,       // 브레스트-리토프스크에서 영토 양보 강경 결단
    intellect: 95,       // 50권 이상 저작, 마르크스주의 이론가
    charisma: 88,        // 당원 카리스마 압도적, 대중 연설은 트로츠키만 못함
    administration: 78,  // NEP 전환·소련 헌법 설계
    notes:
      '정치·이론에서 압도적. 군사는 직접 지휘는 없었으나 내전 승리의 전략적 책임자. 외교는 브레스트-리토프스크의 강경한 현실주의 결단으로 평가.',
  },
  {
    originalName: 'Leon Trotsky',
    politics: 65,        // 권력투쟁 패배 — 인사·당내 정치는 약점
    military: 95,        // 무에서 적군 창설, 내전 승리의 야전 지휘관
    diplomacy: 80,       // 브레스트-리토프스크 협상 직접 담당
    intellect: 95,       // 영구혁명론·"러시아 혁명사" 등 방대한 이론·역사 저술
    charisma: 92,        // 시대 최고의 대중 연설가로 평가
    administration: 70,  // 군 행정은 우수했으나 당·국가 전반 행정은 보통
    notes:
      '군사·이론·웅변에서 최고 수준. 다만 당내 정치 감각·인사 장악력에서 스탈린에 패배해 권력 투쟁에서 밀려난 것이 결정적 약점.',
  },
  {
    originalName: 'Joseph Stalin',
    politics: 100,       // 인사·분파 조작·숙청으로 1인 지배 완성 — 양적 최대
    military: 80,        // 초기 대독전 패배 후 학습, 종전기 최고사령관 수행
    diplomacy: 78,       // 얄타·포츠담에서 처칠·루스벨트와 대등한 흥정
    intellect: 60,       // "변증법적 유물론"·"민족 문제" 등 저작 있으나 깊이 평가 분분
    charisma: 75,        // 개인숭배는 인위적 — 자연 카리스마는 레닌·트로츠키만 못함
    administration: 90,  // 5개년 계획·전시 동원·국가 기구 운용
    notes:
      '정치 조작·국가 행정에서 압도적. 군사는 학습형이고 이론·외교는 평균 이상 수준. 카리스마는 선전 기구가 만든 측면이 크다.',
  },
]

/** 인물 연보 — PersonLifeEvent. 카테고리는 shared/api/person-life-events.ts의 14종 enum과 일치 */
type LifeEventCategory =
  | 'EDUCATION'
  | 'TRAVEL'
  | 'PUBLICATION'
  | 'EXILE'
  | 'AWARD'
  | 'PERSONAL'
  | 'CAREER'
  | 'MILITARY'
  | 'POLITICAL'
  | 'DIPLOMATIC'
  | 'RELIGIOUS'
  | 'HEALTH'
  | 'FAMILY'
  | 'OTHER'

type DatePrecision = 'year' | 'month' | 'day'

interface LifeEventEntry {
  originalName: string
  title: string
  category: LifeEventCategory
  startYear: number
  startMonth?: number
  startDay?: number
  endYear?: number
  endMonth?: number
  endDay?: number
  description?: string
}

const LIFE_EVENTS: LifeEventEntry[] = [
  // ── 레닌 (1870–1924) ────────────────────────────────────────────
  {
    originalName: 'Vladimir Lenin',
    title: '형 알렉산드르 울리야노프 처형',
    category: 'FAMILY',
    startYear: 1887, startMonth: 5, startDay: 8,
    description:
      '형 알렉산드르가 알렉산드르 3세 암살 미수에 가담해 슐리셀부르크 요새에서 교수형. 17세의 레닌이 혁명운동에 투신하는 결정적 계기가 되었다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '카잔대학교 법학부 입학과 제적',
    category: 'EDUCATION',
    startYear: 1887, startMonth: 8,
    endYear: 1887, endMonth: 12,
    description:
      '1887년 8월 카잔대 법학부 입학. 12월 학생 시위 가담으로 제적·코쿠시키노 추방. 이후 자택에서 마르크스 『자본』을 독학.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '상트페테르부르크대 법학부 외부시험 합격',
    category: 'EDUCATION',
    startYear: 1891, startMonth: 11,
    description:
      '재학 없이 외부생 자격으로 응시한 법학부 졸업시험을 수석 합격. 잠시 사마라에서 변호사 활동.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '첫 체포 — 페테르부르크 노동계급 해방투쟁 협회 사건',
    category: 'PERSONAL',
    startYear: 1895, startMonth: 12, startDay: 9,
    description:
      '마르토프 등과 결성한 "페테르부르크 노동계급 해방투쟁 협회"가 적발되어 체포. 14개월 구금 후 시베리아 유형 선고.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '시베리아 슈셴스코예 유형',
    category: 'EXILE',
    startYear: 1897, startMonth: 2,
    endYear: 1900, endMonth: 1,
    description:
      '예니세이 강변 슈셴스코예 마을에서 3년 유형. 이 시기 『러시아 자본주의의 발전』(1899)을 집필했고, 1898년 7월 동지 나데즈다 크룹스카야와 결혼했다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '나데즈다 크룹스카야와 결혼',
    category: 'FAMILY',
    startYear: 1898, startMonth: 7, startDay: 22,
    description:
      '슈셴스코예 유형지에서 같은 시기 유형 중이던 크룹스카야와 결혼. 평생의 정치적 동반자.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '서유럽 망명 — 뮌헨·런던·제네바',
    category: 'EXILE',
    startYear: 1900, startMonth: 7,
    endYear: 1917, endMonth: 4,
    description:
      '유형 종료 직후 출국. 뮌헨에서 『이스크라』 창간(1900), 1903년 런던 RSDRP 2차 당대회 이후 제네바·파리·취리히를 전전하며 17년간 망명 생활.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '『무엇을 할 것인가?』 출간',
    category: 'PUBLICATION',
    startYear: 1902, startMonth: 3,
    description:
      '직업 혁명가들의 전위정당론을 정식화한 핵심 저작. 1903년 RSDRP 분열에서 볼셰비키 노선의 사상적 토대가 되었다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: 'RSDRP 2차 당대회 분열 — 볼셰비키 결성',
    category: 'POLITICAL',
    startYear: 1903, startMonth: 7, startDay: 30,
    endYear: 1903, endMonth: 8, endDay: 23,
    description:
      '브뤼셀에서 시작해 런던으로 옮겨 진행된 당대회에서 당원 자격 조항을 둘러싸고 마르토프와 충돌. 다수파(볼셰비키)·소수파(멘셰비키) 분파가 영구화되었다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '『제국주의 — 자본주의의 최고 단계』 집필',
    category: 'PUBLICATION',
    startYear: 1916, startMonth: 1,
    endYear: 1916, endMonth: 6,
    description:
      '취리히 망명 중 집필. 1차 대전을 제국주의 열강의 식민지·시장 재분할 전쟁으로 분석한 마르크스주의 정치경제학의 고전. 1917년 페트로그라드에서 출간.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '봉인열차로 페트로그라드 귀환·4월 테제 발표',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 4, startDay: 16,
    description:
      '독일이 제공한 봉인열차로 취리히→스톡홀름→핀란드를 거쳐 페트로그라드 핀란드역 도착. 다음 날 임시정부 타도와 모든 권력의 소비에트 이양을 주장한 "4월 테제"를 발표했다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '10월 혁명 — 인민위원회 의장 취임',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 11, startDay: 7,
    description:
      '구력 10월 25일 페트로그라드 무장봉기로 임시정부 전복. 다음 날 제2차 전러시아 소비에트 대회에서 인민위원회 의장(국가수반)에 선출되었다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '파니 카플란 암살 시도 — 중상',
    category: 'HEALTH',
    startYear: 1918, startMonth: 8, startDay: 30,
    description:
      '모스크바 미헬손 공장 연설 후 사회혁명당원 파니 카플란이 발사한 권총탄 두 발에 피격. 목과 왼쪽 어깨에 박힌 탄환은 끝내 적출하지 못했고, 만년 뇌졸중의 한 원인으로 지목된다. 직후 "적색 테러" 칙령 발동.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '첫 뇌졸중 — 활동 제한 시작',
    category: 'HEALTH',
    startYear: 1922, startMonth: 5, startDay: 26,
    description:
      '1차 뇌졸중으로 우반신 마비·언어장애. 12월 2차 뇌졸중, 1923년 3월 3차 뇌졸중으로 사실상 모든 정치 활동을 중단했다.',
  },
  {
    originalName: 'Vladimir Lenin',
    title: '"당대회에 보내는 편지"(유언장) 구술',
    category: 'PUBLICATION',
    startYear: 1922, startMonth: 12, startDay: 23,
    endYear: 1923, endMonth: 1, endDay: 4,
    description:
      '뇌졸중 후 비서들에게 구술. 후계 6인(트로츠키·스탈린·지노비예프·카메네프·부하린·퍄타코프)을 평가하며 스탈린의 서기장 직 해임을 명시적으로 권고했다. 그러나 13차 당대회(1924)에서 비공개 처리되었다.',
  },

  // ── 트로츠키 (1879–1940) ────────────────────────────────────────
  {
    originalName: 'Leon Trotsky',
    title: '오데사 성 바울 실업학교 입학',
    category: 'EDUCATION',
    startYear: 1888, startMonth: 9,
    endYear: 1895,
    description:
      '유대인 거주 제한 지역 외부였던 오데사로 이주해 친척 집에 기거하며 7년간 수학. 우수한 성적으로 졸업.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '첫 체포 — 니콜라예프 남러시아노동자동맹 사건',
    category: 'PERSONAL',
    startYear: 1898, startMonth: 1,
    description:
      '니콜라예프에서 결성한 "남러시아노동자동맹"이 적발되어 체포. 2년간 수감 후 시베리아 유형 4년 선고.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '시베리아 첫 유형',
    category: 'EXILE',
    startYear: 1900,
    endYear: 1902, endMonth: 8,
    description:
      '이르쿠츠크 주 우스트-쿠트·베르홀렌스크에서 유형. 이 시기 첫 아내 알렉산드라 소콜롭스카야와의 사이에서 두 딸을 두었으나, 1902년 8월 단신 탈출했다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '시베리아 탈출과 런던 망명 — 레닌과의 첫 만남',
    category: 'TRAVEL',
    startYear: 1902, startMonth: 10,
    description:
      '위조 여권의 간수 이름 "트로츠키"를 가명으로 채택. 런던에 도착해 『이스크라』 편집부의 레닌과 처음 대면, 깊은 인상을 남겼다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '페테르부르크 소비에트 의장',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 10,
    endYear: 1905, endMonth: 12,
    description:
      '1905년 혁명 와중에 결성된 페테르부르크 노동자 대표 소비에트의 사실상 지도자(의장 대행→의장)로 활동. 12월 정부의 진압으로 체포.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '두 번째 시베리아 유형과 즉각 탈출',
    category: 'EXILE',
    startYear: 1907, startMonth: 1,
    description:
      '북극권 오브도르스크(현 살레하르트) 종신 유형 선고. 호송 도중 순록 썰매로 탈출해 핀란드를 거쳐 다시 서유럽 망명에 들어갔다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '서유럽·미국 망명 — 빈·파리·취리히·뉴욕',
    category: 'EXILE',
    startYear: 1907, startMonth: 10,
    endYear: 1917, endMonth: 5,
    description:
      '빈에서 7년간 거주(1907–1914). 1차 대전 발발로 스위스·프랑스로 이동, 1916년 프랑스에서 추방되어 스페인을 거쳐 1917년 1월 뉴욕 도착.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '페트로그라드 귀환·볼셰비키 합류',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 5, startDay: 17,
    endYear: 1917, endMonth: 8,
    description:
      '뉴욕에서 출항, 캐나다 노바스코샤 억류를 거쳐 5월 페트로그라드 도착. 메즈라이온차 그룹과 함께 8월 6차 당대회에서 볼셰비키에 정식 합류, 즉시 중앙위원에 선출되었다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '페트로그라드 소비에트 의장으로 10월 혁명 실무 지휘',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 9, startDay: 25,
    endYear: 1917, endMonth: 11, endDay: 7,
    description:
      '9월 페트로그라드 소비에트 의장 재선출. 군사혁명위원회 위원장으로서 10월 봉기의 군사 작전을 지휘했다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '브레스트-리토프스크 강화 협상',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 12,
    endYear: 1918, endMonth: 3, endDay: 3,
    description:
      '외무인민위원으로서 독일·오스트리아와의 강화 협상을 직접 지휘. "전쟁도 강화도 아닌(no war, no peace)" 노선을 제시했으나 독일군 진격으로 굴욕적 조약에 서명.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '적군(赤軍) 창설과 내전 지휘',
    category: 'MILITARY',
    startYear: 1918, startMonth: 3, startDay: 13,
    endYear: 1920, endMonth: 11,
    description:
      '군사인민위원·혁명군사회의 의장으로 무에서 적군을 창설. 차르군 출신 장교를 "군사전문가"로 등용하고 정치위원 제도를 도입. 장갑열차로 전선을 누비며 차리친·페트로그라드·바르샤바 전선을 지휘해 백군과 외국 간섭군을 격퇴했다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '군사인민위원 해임',
    category: 'CAREER',
    startYear: 1925, startMonth: 1, startDay: 26,
    description:
      '레닌 사후 권력 투쟁에서 지노비예프·카메네프·스탈린 "삼두 체제(트로이카)"의 압박으로 군 핵심 직책에서 해임. 형식상 양허 부서장 등 한직으로 밀려났다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '소련 공산당에서 제명',
    category: 'POLITICAL',
    startYear: 1927, startMonth: 11, startDay: 14,
    description:
      '"좌익반대파" 활동을 빌미로 지노비예프와 함께 당에서 제명. 1928년 1월 알마아타로 국내 추방되었다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '국외 추방 — 터키 프린키포 도착',
    category: 'EXILE',
    startYear: 1929, startMonth: 2, startDay: 12,
    endYear: 1933, endMonth: 7,
    description:
      '소련에서 강제 추방되어 터키 마르마라해 프린키포 섬에 도착. 4년간 머물며 자서전 『나의 생애』(1930)·『러시아 혁명사』(1930–32)를 집필.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '『러시아 혁명사』 출간',
    category: 'PUBLICATION',
    startYear: 1930,
    endYear: 1932,
    description:
      '터키 프린키포 망명 중 집필한 3권의 대작. 2월 혁명에서 10월 혁명까지의 과정을 당사자 시각으로 서술한 마르크스주의 역사 서술의 고전.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '소련 시민권 박탈',
    category: 'POLITICAL',
    startYear: 1932, startMonth: 2, startDay: 20,
    description:
      '스탈린이 트로츠키 일가 32인의 소련 시민권을 박탈. 이후 트로츠키는 무국적자로 각국을 전전했다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '『배반당한 혁명』 출간',
    category: 'PUBLICATION',
    startYear: 1936, startMonth: 8,
    description:
      '노르웨이 망명 중 집필. 스탈린 체제를 "관료적 변형(degenerated workers state)"으로 규정한 트로츠키주의의 핵심 분석서.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '멕시코 정착 — 코요아칸 거주',
    category: 'TRAVEL',
    startYear: 1937, startMonth: 1, startDay: 9,
    description:
      '노르웨이 정부가 소련 압력으로 추방하자 화가 디에고 리베라의 초청으로 멕시코 도착. 코요아칸 푸른 집(Casa Azul)에 정착했다.',
  },
  {
    originalName: 'Leon Trotsky',
    title: '제4 인터내셔널 창설',
    category: 'POLITICAL',
    startYear: 1938, startMonth: 9, startDay: 3,
    description:
      '파리 근교에서 창립대회 개최. 코민테른(제3 인터내셔널)에 대항하는 세계 혁명운동 조직으로 출범했다.',
  },

  // ── 스탈린 (1878–1953) ──────────────────────────────────────────
  {
    originalName: 'Joseph Stalin',
    title: '고리 신학교 입학',
    category: 'EDUCATION',
    startYear: 1888, startMonth: 9,
    endYear: 1894,
    description:
      '고향 고리의 정교회 부속학교에 입학. 6년간 수학하며 우수한 성적으로 장학생이 되었다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '티플리스 신학교 입학',
    category: 'EDUCATION',
    startYear: 1894, startMonth: 9,
    endYear: 1899, endMonth: 5,
    description:
      '캅카스 정교회의 최고 교육기관 티플리스 신학교 장학생 입학. 재학 중 비합법 사회주의 서클에 가담했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '신학교 제적 — 혁명 활동 본격화',
    category: 'POLITICAL',
    startYear: 1899, startMonth: 5,
    description:
      '시험 거부와 비합법 활동 적발로 사실상 제적. 이후 티플리스 천문대 임시직을 거쳐 직업 혁명가의 길로 들어섰다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '첫 체포 — 바투미 시위 사건',
    category: 'PERSONAL',
    startYear: 1902, startMonth: 4, startDay: 5,
    description:
      '바투미 노동자 시위 조직 혐의로 체포. 이후 1917년까지 8회 체포·7회 시베리아 유형, 6회 탈출이라는 이력을 남겼다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '예카테리나 스바니제와 결혼 — 첫 결혼',
    category: 'FAMILY',
    startYear: 1906, startMonth: 7, startDay: 16,
    description:
      '동지의 누이 카토 스바니제와 결혼. 1907년 장남 야코프(2차 대전 중 독일 포로로 사망) 출생, 같은 해 12월 아내가 장티푸스로 사망했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '티플리스 은행 마차 강도 — 당 자금 조달',
    category: 'POLITICAL',
    startYear: 1907, startMonth: 6, startDay: 26,
    description:
      '예레반 광장에서 국립은행 현금 수송 마차를 습격, 약 25만 루블을 탈취해 볼셰비키 금고에 송금. 본인은 직접 가담하지 않고 기획·지휘를 맡은 것으로 평가된다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '프라하 협의회 — 중앙위원 선출',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 1,
    description:
      '레닌이 멘셰비키와 결별을 선언한 프라하 협의회에서 결석한 채 볼셰비키 중앙위원·러시아국 위원으로 선출. 당 핵심부 진입의 시작.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '『마르크스주의와 민족 문제』 집필',
    category: 'PUBLICATION',
    startYear: 1913, startMonth: 1,
    description:
      '레닌의 의뢰로 빈에서 부하린·트로츠키 등을 만나며 집필. 다민족 국가 사회주의의 민족정책론을 정식화해 이후 민족인민위원의 이론적 기반이 되었다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '투루칸스크 종신 유형',
    category: 'EXILE',
    startYear: 1913, startMonth: 7,
    endYear: 1917, endMonth: 3,
    description:
      '예니세이 강 하류 쿠레이카 마을에서 4년간 유형. 1차 대전 중 입대 거부 처리되었으며 1917년 2월 혁명 후 사면되어 페트로그라드로 귀환했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '나데즈다 알릴루예바와 재혼',
    category: 'FAMILY',
    startYear: 1919, startMonth: 3,
    description:
      '오랜 동지 세르게이 알릴루예프의 딸 나데즈다와 재혼. 슬하에 바실리(1921)·스베틀라나(1926) 출생.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '소련공산당 서기장 임명',
    category: 'CAREER',
    startYear: 1922, startMonth: 4, startDay: 3,
    endYear: 1952, endMonth: 10, endDay: 16,
    description:
      '11차 당대회 직후 신설된 서기장직에 취임. 본래 행정직에 불과했으나 인사권 장악을 통해 30년간 사실상의 최고 권력 기반으로 활용했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '제1차 5개년 계획 시작 — 급속 공업화·농업집단화',
    category: 'POLITICAL',
    startYear: 1928, startMonth: 10,
    endYear: 1932, endMonth: 12,
    description:
      '신경제정책(NEP) 폐기. 강제 농업집단화(콜호스화)와 중공업 우선 투자 정책 추진. 부농(쿨라크) 박멸 캠페인이 동반되었다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '두 번째 아내 알릴루예바 자살',
    category: 'FAMILY',
    startYear: 1932, startMonth: 11, startDay: 9,
    description:
      '10월 혁명 기념 만찬 직후 자택에서 권총 자살. 공식 발표는 맹장염이었으나 실제 사인은 자살로, 이후 스탈린의 가족 관계와 성격 변화에 큰 영향을 끼쳤다는 평가가 일반적이다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '대숙청(예조프시나)',
    category: 'POLITICAL',
    startYear: 1936, startMonth: 8,
    endYear: 1938, endMonth: 11,
    description:
      '키로프 암살(1934)을 빌미로 시작된 대규모 정치 숙청. 모스크바 재판 3회로 지노비예프·카메네프·부하린 등 옛 볼셰비키를 처형, 군 간부 80% 이상이 숙청되었다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '독소 불가침조약(몰로토프-리벤트로프) 체결',
    category: 'DIPLOMATIC',
    startYear: 1939, startMonth: 8, startDay: 23,
    description:
      '모스크바에서 외무장관 몰로토프와 독일 리벤트로프가 서명. 비밀 의정서로 폴란드·발트 3국·핀란드·베사라비아의 세력권을 분할했고, 1주일 후 2차 대전이 발발했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '독소전 발발 — 최고사령관 취임',
    category: 'MILITARY',
    startYear: 1941, startMonth: 6, startDay: 22,
    endYear: 1945, endMonth: 5, endDay: 9,
    description:
      '독일의 바르바로사 작전으로 개전. 7월 국방위원회 의장, 8월 최고사령관에 취임해 모스크바·스탈린그라드·쿠르스크 전투를 거쳐 1945년 5월 베를린 함락까지 적군을 지휘했다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '얄타 회담',
    category: 'DIPLOMATIC',
    startYear: 1945, startMonth: 2, startDay: 4,
    endYear: 1945, endMonth: 2, endDay: 11,
    description:
      '크림반도 얄타에서 처칠·루스벨트와 정상회담. 전후 독일 분할, 폴란드 정부 구성, 소련의 대일전 참전을 합의해 동유럽에 대한 소련의 지배적 영향력을 사실상 승인받았다.',
  },
  {
    originalName: 'Joseph Stalin',
    title: '포츠담 회담',
    category: 'DIPLOMATIC',
    startYear: 1945, startMonth: 7, startDay: 17,
    endYear: 1945, endMonth: 8, endDay: 2,
    description:
      '베를린 근교 포츠담에서 트루먼·처칠(중도 애틀리 교체)과 회담. 독일 점령 정책과 일본에 대한 무조건 항복 요구(포츠담 선언)를 결정. 회담 중 트루먼이 핵실험 성공을 통보해 냉전의 서막을 알렸다.',
  },
]

async function ensureRelationship(
  prisma: PrismaService,
  fromId: string,
  toId: string,
  type: PersonHumanRelationshipType,
  tags: PersonRelationshipTag[],
  affinityLevel: number,
  trustLevel: number,
  note: string,
  startDate: Date,
): Promise<string | null> {
  // 어느 방향으로든 이미 있으면 skip (양방향 GENERAL)
  const existing = await prisma.personHumanRelationship.findFirst({
    where: {
      OR: [
        { fromPersonId: fromId, toPersonId: toId },
        { fromPersonId: toId, toPersonId: fromId },
      ],
      relationshipType: type,
    },
  })
  if (existing) return null

  const created = await prisma.personHumanRelationship.create({
    data: {
      fromPersonId: fromId,
      toPersonId: toId,
      relationshipType: type,
      isMutual: true,
      affinityLevel,
      trustLevel,
      startDate,
      note,
    },
  })

  for (const tag of tags) {
    await prisma.personHumanRelationshipTagAssignment.create({
      data: { relationshipId: created.id, tag },
    })
  }
  return created.id
}

async function ensureAffiliation(
  prisma: PrismaService,
  personId: string,
  historicalCountryId: string,
  type: PersonCountryAffiliationType,
  startDate: Date | null,
  endDate: Date | null,
  priority: number,
  note: string | undefined,
): Promise<boolean> {
  const existing = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId,
      affiliationType: type,
      startDate,
    },
  })
  if (existing) return false

  await prisma.personCountryAffiliation.create({
    data: {
      personId,
      historicalCountryId,
      affiliationType: type,
      startDate,
      endDate,
      priority,
      note,
    },
  })
  return true
}

/** 시작/종료일 + 정밀도 도출. month·day가 없으면 1로 채우고 precision은 가장 거친 단위로 */
function buildLifeEventDates(e: LifeEventEntry): {
  startDate: Date
  startDatePrecision: DatePrecision
  endDate: Date | null
  endDatePrecision: DatePrecision | null
} {
  const startDate = new Date(
    e.startYear,
    (e.startMonth ?? 1) - 1,
    e.startDay ?? 1,
  )
  const startDatePrecision: DatePrecision = e.startDay
    ? 'day'
    : e.startMonth
      ? 'month'
      : 'year'

  if (!e.endYear) {
    return { startDate, startDatePrecision, endDate: null, endDatePrecision: null }
  }
  const endDate = new Date(
    e.endYear,
    (e.endMonth ?? 12) - 1,
    e.endDay ?? (e.endMonth ? 28 : 31),
  )
  const endDatePrecision: DatePrecision = e.endDay
    ? 'day'
    : e.endMonth
      ? 'month'
      : 'year'
  return { startDate, startDatePrecision, endDate, endDatePrecision }
}

async function ensureLifeEvent(
  prisma: PrismaService,
  personId: string,
  entry: LifeEventEntry,
): Promise<boolean> {
  const existing = await prisma.personLifeEvent.findFirst({
    where: { personId, title: entry.title },
  })
  if (existing) return false

  const { startDate, startDatePrecision, endDate, endDatePrecision } =
    buildLifeEventDates(entry)

  await prisma.personLifeEvent.create({
    data: {
      personId,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      startDate,
      startDatePrecision,
      endDate,
      endDatePrecision,
      accountId: ACCOUNT_ID,
    },
  })
  return true
}

export async function seedRussiaBolsheviks(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n☭ 러시아 혁명·소비에트 3인(레닌·트로츠키·스탈린) 시드 시작...')

  // ── 1. 인물 생성/보강 ───────────────────────────────────────────
  console.log('\n  👤 3인 인물 등록/보강...')
  const idMap = new Map<string, string>()
  for (const r of REVOLUTIONARIES) {
    const existing = await prisma.person.findFirst({
      where: { originalName: r.originalName },
    })

    if (existing) {
      // 기존 인물에 누락된 필드(영향력·사망유형·사망원인)를 set — 이미 같으면 no-op
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          influence: r.influence,
          deathType: r.deathType,
          deathCause: r.deathCause,
        },
      })
      idMap.set(r.originalName, existing.id)
      console.log(`    ♻️  ${r.originalName} (보강: influence=${r.influence})`)
      continue
    }

    const created = await prisma.person.create({
      data: {
        name: r.name,
        surname: r.surname,
        originalName: r.originalName,
        biography: r.biography,
        birthDate: new Date(r.birthYear, r.birthMonth - 1, r.birthDay),
        birthEra: 'AD',
        deathDate: new Date(r.deathYear, r.deathMonth - 1, r.deathDay),
        deathEra: 'AD',
        deathType: r.deathType,
        deathCause: r.deathCause,
        gender: 'MALE',
        nameDisplayOrder: 'western',
        influence: r.influence,
        accountId: ACCOUNT_ID,
      },
    })
    idMap.set(r.originalName, created.id)
    console.log(`    ✅ ${r.originalName} (influence=${r.influence})`)
  }

  // ── 2. 3쌍 인간관계 ─────────────────────────────────────────────
  console.log('\n  🤝 3쌍 인간관계 등록...')
  for (const pair of PAIR_RELATIONS) {
    const fromId = idMap.get(pair.a)
    const toId = idMap.get(pair.b)
    if (!fromId || !toId) {
      console.warn(`    ⚠️  인물 ID 누락: ${pair.a} ↔ ${pair.b}`)
      continue
    }
    const id = await ensureRelationship(
      prisma,
      fromId,
      toId,
      PersonHumanRelationshipType.GENERAL,
      pair.tags,
      pair.affinityLevel,
      pair.trustLevel,
      pair.note,
      new Date(pair.startYear, pair.startMonth - 1, pair.startDay),
    )
    if (id) {
      console.log(`    ✅ ${pair.a} ↔ ${pair.b}`)
    } else {
      console.log(`    ♻️  ${pair.a} ↔ ${pair.b}`)
    }
  }

  // ── 3. 국가 affiliation (출생지·시민권·봉사·망명) ───────────────
  console.log('\n  🏳️  국가 affiliation 등록...')
  const histCountryCache = new Map<string, string>()
  for (const a of AFFILIATIONS) {
    const personId = idMap.get(a.originalName)
    if (!personId) continue

    let countryId = histCountryCache.get(a.historicalCountryName)
    if (!countryId) {
      const c = await prisma.historicalCountry.findFirst({
        where: { name: a.historicalCountryName },
      })
      if (!c) {
        console.warn(`    ⚠️  historical country 없음: ${a.historicalCountryName}`)
        continue
      }
      countryId = c.id
      histCountryCache.set(a.historicalCountryName, countryId)
    }

    const startDate = a.startYear ? new Date(a.startYear, 0, 1) : null
    const endDate = a.endYear ? new Date(a.endYear, 11, 31) : null
    const created = await ensureAffiliation(
      prisma,
      personId,
      countryId,
      a.type,
      startDate,
      endDate,
      a.priority,
      a.note,
    )
    const yearRange =
      a.startYear && a.endYear
        ? `${a.startYear}–${a.endYear}`
        : a.startYear
          ? `${a.startYear}–`
          : ''
    if (created) {
      console.log(
        `    ✅ ${a.originalName} · ${a.type} · ${a.historicalCountryName} ${yearRange}`,
      )
    } else {
      console.log(
        `    ♻️  ${a.originalName} · ${a.type} · ${a.historicalCountryName} ${yearRange}`,
      )
    }
  }

  // ── 4. 능력치(PersonStats) 등록 ────────────────────────────────
  console.log('\n  📊 6축 능력치 등록...')
  for (const s of STATS) {
    const personId = idMap.get(s.originalName)
    if (!personId) continue

    await prisma.personStats.upsert({
      where: {
        person_stats_person_account_key: {
          personId,
          accountId: ACCOUNT_ID,
        },
      },
      update: {
        politics: s.politics,
        military: s.military,
        diplomacy: s.diplomacy,
        intellect: s.intellect,
        charisma: s.charisma,
        administration: s.administration,
        notes: s.notes,
      },
      create: {
        personId,
        accountId: ACCOUNT_ID,
        politics: s.politics,
        military: s.military,
        diplomacy: s.diplomacy,
        intellect: s.intellect,
        charisma: s.charisma,
        administration: s.administration,
        notes: s.notes,
      },
    })
    console.log(
      `    ✅ ${s.originalName} · 정치 ${s.politics} · 군사 ${s.military} · 외교 ${s.diplomacy} · 학식 ${s.intellect} · 카리스마 ${s.charisma} · 행정 ${s.administration}`,
    )
  }

  // ── 5. 인물 연보(PersonLifeEvent) ───────────────────────────────
  console.log('\n  📜 인물 연보(PersonLifeEvent) 등록...')
  let lifeEventCreated = 0
  let lifeEventSkipped = 0
  for (const e of LIFE_EVENTS) {
    const personId = idMap.get(e.originalName)
    if (!personId) {
      console.warn(`    ⚠️  인물 ID 누락: ${e.originalName} · ${e.title}`)
      continue
    }
    const created = await ensureLifeEvent(prisma, personId, e)
    if (created) {
      lifeEventCreated++
      console.log(
        `    ✅ ${e.originalName} · ${e.startYear}${e.startMonth ? `.${String(e.startMonth).padStart(2, '0')}` : ''} · [${e.category}] ${e.title}`,
      )
    } else {
      lifeEventSkipped++
      console.log(`    ♻️  ${e.originalName} · ${e.title}`)
    }
  }
  console.log(
    `    → 연보 ${LIFE_EVENTS.length}개 중 신규 ${lifeEventCreated} · 스킵 ${lifeEventSkipped}`,
  )

  console.log(
    `\n✅ 볼셰비키 3인 시드 완료 (인물 ${REVOLUTIONARIES.length}, 관계 ${PAIR_RELATIONS.length}, affiliation ${AFFILIATIONS.length}, stats ${STATS.length}, lifeEvent ${LIFE_EVENTS.length})\n`,
  )
}
