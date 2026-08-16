/**
 * 유리 니키포로비치 다닐로프 (Yuri Nikiforovich Danilov, 1866~1937) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 보병대장(генерал от инфантерии). 1909~1914 참모본부(ГУГШ) 병참감,
 * 1914~1915 최고총사령관 사령부(스타프카) 병참감으로 제1차 세계대전 개전기 러시아군의
 * 전쟁계획을 사실상 총괄한 "러시아군의 두뇌". 동원계획 제19호(1910)와 그 개정 19A(1912)의
 * 주 저자이며, 동명(同姓) 장군들과 구별해 «검은 다닐로프(Данилов-чёрный)»로 불렸다.
 * 1915년 니콜라이 2세 친정(親政) 개편으로 스타프카에서 물러나 제25군단장·북부전선군
 * 참모장·제5군 사령관을 지냈고, 브레스트-리토프스크 강화회담 군사전문가그룹 수장을 거쳐
 * 1920년 망명, 파리에서 전사(戰史) 저술가로 활동하다 1937년 사망했다.
 *
 * 날짜 규약: 러시아 복무기록 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 1866년 출생일 +12일). 구력 원일자는 notes에 병기.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC). 프랑스 제3공화국 HC는 있으면
 *       망명지(EXILE) 소속으로 연결하고 없으면 건너뛴다.
 *
 * 등록 항목:
 *  - Person x1 (다닐로프 본인 — historicalCountryId=러시아 제국, 폰 클루크 선례)
 *  - GovernmentPositionTenure x5 (MILITARY_COMMANDER — 병참감 2건 + 군단장·참모장·군사령관)
 *  - PersonCountryAffiliation x2 (러시아 제국 CITIZENSHIP / 프랑스 제3공화국 EXILE)
 *  - PersonNickname x1 (검은 다닐로프)
 *  - PersonLifeEvent x15 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
  type PersonNicknameType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const DANILOV = {
  name: '유리',
  middleName: '니키포로비치',
  surname: '다닐로프',
  originalName: 'Yuri Nikiforovich Danilov (Юрий Никифорович Данилов)',
  gender: 'MALE' as const,
  birthYear: 1866, birthMonth: 8, birthDay: 25,
  birthNote:
    '구력(율리우스력) 1866-08-13 출생 — 신력 환산 08-25. 영어권 일부 자료는 08-13을 신력으로 ' +
    '적지만, 러시아 측 사료가 일관되게 «13(25) августа 1866»로 기록한다.',
  deathYear: 1937, deathMonth: 2, deathDay: 3,
  birthPlaceText: '러시아 제국 키예프(현 우크라이나 키이우)',
  deathPlaceText: '프랑스 불로뉴비양쿠르(Boulogne-Billancourt) — 파리 서남 교외',
  deathType: DeathType.UNKNOWN,
  deathCause: '사인 미기록 (향년 70세)',
  deathNote:
    '1920년 망명 이후 파리에서 백계 러시아인 전사 저술가로 활동하다 1937-02-03 파리 교외 ' +
    '불로뉴비양쿠르에서 사망했다. 사인과 매장지는 조사된 사료에 기록이 없다.',
  influence: 58,
  biography:
    '러시아 제국의 보병대장(генерал от инфантерии). 1909년부터 1915년까지 참모본부와 ' +
    '최고총사령관 사령부(스타프카)의 병참감(генерал-квартирмейстер)으로 러시아의 대독일 ' +
    '전쟁계획을 사실상 혼자 총괄해 "러시아군의 두뇌"로 불렸다. 같은 성의 장군들 ' +
    '(니콜라이 다닐로프 «붉은 다닐로프» 등)과 구별해 «검은 다닐로프(Данилов-чёрный)»라는 ' +
    '별명으로 통했다. 직명 병참감은 관례적 번역으로, 러시아군의 이 직책은 보급이 아니라 ' +
    '작전계획·전개·정보를 관장하는 참모본부의 핵심 작전참모직이었다. ' +
    '\n\n' +
    '성장과 교육(1866~1892). 키예프에서 태어나 블라디미르 키예프 유년군사학교(1883)와 ' +
    '미하일롭스코예 포병학교(1886)를 거쳐 포병 소위로 임관했고, 1892년 니콜라예프 ' +
    '참모본부아카데미를 제1등급(수석급)으로 졸업해 참모장교의 길에 들어섰다. ' +
    '\n\n' +
    '참모본부 병참감과 동원계획 제19호(1909~1914). 1908년 참모본부(ГУГШ) ' +
    '오베르크바르티르메이스터를 거쳐 1909년 병참감에 올랐다. 이 자리에서 러시아의 전략 ' +
    '전개계획을 전면 재설계한 동원계획 제19호(1910)를 입안했다 — 개전 시 독일이 주력을 ' +
    '프랑스로 돌릴 것으로 보고 러시아 4개군의 동프로이센 즉시 침공을 골자로 한 과감한 ' +
    '계획이었다. 오스트리아-헝가리 위협을 중시하는 군 수뇌부의 반대로 1912년 «19A»로 ' +
    '수정되어(동프로이센 2개군 + 갈리치아 4개군) 1914년 실제 전개는 이 A안을 따랐다. ' +
    '\n\n' +
    '스타프카 병참감(1914~1915). 개전과 함께 스타프카 병참감으로 옮겨, 총사령관 니콜라이 ' +
    '니콜라예비치 대공과 참모장 야누시케비치에 이은 서열 3위이자 실질적인 작전 책임자가 ' +
    '되었다. 프랑스의 요청에 따른 동프로이센 조기 침공을 강행해 초기 진격이 탄넨베르크의 ' +
    '참패로 끝났고, 1915년 대퇴각기까지 러시아군의 작전을 지도했다. 1915년 9월 니콜라이 ' +
    '2세가 친정에 나서 대공을 캅카스로 보내고 스타프카 지도부를 교체하면서 실각했다. ' +
    '\n\n' +
    '야전 지휘와 혁명(1915~1917). 이후 제25군단장(1915~1916), 북부전선군 참모장(1916~1917), ' +
    '제5군 사령관(1917)을 지냈다. 2월 혁명 뒤 병사 소비에트와 군 기강 붕괴 속에서 야전군을 ' +
    '지휘하다 1917년 9월 해임되어 페트로그라드 군관구 예비역 명부에 편입되었다. ' +
    '\n\n' +
    '내전과 망명(1918~1937). 1918년 3월 브레스트-리토프스크 강화회담에서 소비에트 대표단 ' +
    '부속 군사전문가그룹의 수장을 맡았으나, 전문가단 명의로 강화조약 체결에 반대하는 ' +
    '의견서를 제출하고 이탈했다. 우크라이나를 거쳐 백군 의용군에 합류했고 1920년 크림의 ' +
    '브란겔 러시아군에서 군사관리부 부부장을 지낸 뒤 콘스탄티노플을 거쳐 파리에 정착했다. ' +
    '망명지에서 《세계대전의 러시아 1914~1915》(베를린, 1924), 《니콜라이 니콜라예비치 대공》' +
    '(파리, 1930) 등 1차 사료 가치가 큰 전사·회고를 남겼다. ' +
    '\n\n' +
    '평가. 제정 러시아 참모장교단의 정점에 선 치밀한 기획가·조직가로, 개전기 러시아의 전쟁 ' +
    '수행 체계가 상당 부분 그의 설계였다. 반면 도식적이고 경직된 계획으로 야전 현실을 ' +
    '충분히 반영하지 못했다는 비판(탄넨베르크 책임론)도 꾸준히 따라붙는다.',
}

// ── 재임 (전부 러시아 제국 · MILITARY_COMMANDER) ─────────────────────────────
interface TenureSpec {
  title: string
  startYear: number; startMonth: number; startDay: number
  endYear: number; endMonth: number; endDay: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '참모본부 병참감',
    startYear: 1909, startMonth: 8, startDay: 7,
    endYear: 1914, endMonth: 8, endDay: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '제1차 세계대전 개전으로 최고총사령관 사령부(스타프카) 병참감으로 전임 (구력 1914-07-19 발령).',
    notes:
      '구력 1909-07-25(신력 08-07) 취임 — 직전 1908-10부터 참모본부(ГУГШ) 오베르크바르티르메이스터. ' +
      '이 자리에서 동원계획 제19호(1910)와 개정 19A(1912)를 입안해 러시아의 전쟁계획을 사실상 ' +
      '총괄했다 — "러시아군의 두뇌". 직명은 병참감이지만 소관은 보급이 아니라 작전계획·전개·정보였다.',
  },
  {
    title: '최고총사령관 사령부(스타프카) 병참감',
    startYear: 1914, startMonth: 8, startDay: 1,
    endYear: 1915, endMonth: 9, endDay: 12,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1915-09 니콜라이 2세 친정(親政) — 총사령관 니콜라이 니콜라예비치 대공의 캅카스 전출과 함께 ' +
      '스타프카 지도부가 교체되어 제25군단장으로 전보 (구력 1915-08-30 발령).',
    notes:
      '구력 1914-07-19(신력 08-01) 임명. 총사령관 니콜라이 니콜라예비치 대공·참모장 야누시케비치에 ' +
      '이은 서열 3위의 실질 작전 책임자로, 동프로이센 침공(탄넨베르크 패배)부터 1915년 대퇴각까지 ' +
      '개전기 러시아군의 작전을 지도했다.',
  },
  {
    title: '제25군단장',
    startYear: 1915, startMonth: 9, startDay: 12,
    endYear: 1916, endMonth: 8, endDay: 24,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '북부전선군 참모장으로 전보 (구력 1916-08-11 발령).',
    notes: '구력 1915-08-30 ~ 1916-08-11. 스타프카 실각 후의 야전 지휘 보직.',
  },
  {
    title: '북부전선군 참모장',
    startYear: 1916, startMonth: 8, startDay: 24,
    endYear: 1917, endMonth: 5, endDay: 12,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '제5군 사령관으로 전보 (구력 1917-04-29 발령).',
    notes:
      '구력 1916-08-11 취임(일부 사료는 직무대행 и.д. 표기) ~ 1917-04-29. 리가 방면 북부전선 ' +
      '예하 군들의 참모 업무 총괄 — 재임 중 2월 혁명을 맞았다.',
  },
  {
    title: '제5군 사령관',
    startYear: 1917, startMonth: 5, startDay: 12,
    endYear: 1917, endMonth: 9, endDay: 22,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '구력 1917-09-09 해임 — 이후 페트로그라드 군관구 예비역 명부(резерв чинов)에 편입.',
    notes:
      '구력 1917-04-29 ~ 1917-09-09. 2월 혁명 후 임시정부 아래 드빈스크 방면 제5군을 지휘 — ' +
      '병사 소비에트와 군 기강 붕괴 속의 야전 지휘였다.',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '검은 다닐로프 (Данилов-чёрный)', type: 'EPITHET', priority: 1 },
]

// ── 연보 ────────────────────────────────────────────────────────────────────
type LifeEventCategory =
  | 'EDUCATION' | 'TRAVEL' | 'PUBLICATION' | 'EXILE' | 'AWARD' | 'PERSONAL'
  | 'CAREER' | 'MILITARY' | 'POLITICAL' | 'DIPLOMATIC' | 'FAMILY' | 'HEALTH' | 'OTHER'

interface LifeEventEntry {
  title: string
  category: LifeEventCategory
  startYear: number; startMonth?: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  description?: string
}

const LIFE_EVENTS: LifeEventEntry[] = [
  {
    title: '키예프 출생',
    category: 'FAMILY',
    startYear: 1866, startMonth: 8, startDay: 25,
    description: '러시아 제국 키예프에서 출생 (구력 08-13).',
  },
  {
    title: '미하일롭스코예 포병학교 졸업·임관',
    category: 'EDUCATION',
    startYear: 1886,
    description: '블라디미르 키예프 유년군사학교(1883)를 거쳐 미하일롭스코예 포병학교를 마치고 포병 소위로 임관.',
  },
  {
    title: '니콜라예프 참모본부아카데미 졸업',
    category: 'EDUCATION',
    startYear: 1892,
    description: '참모본부아카데미를 제1등급(수석급)으로 졸업 — 제정 러시아 참모장교단의 정예 코스.',
  },
  {
    title: '참모본부 오베르크바르티르메이스터',
    category: 'CAREER',
    startYear: 1908, startMonth: 10, startDay: 31,
    endYear: 1909, endMonth: 8, endDay: 7,
    description: '참모본부(ГУГШ)의 작전 부참모직 (구력 1908-10-18 ~ 1909-07-25). 병참감 승진의 발판.',
  },
  {
    title: '참모본부 병참감 취임',
    category: 'MILITARY',
    startYear: 1909, startMonth: 8, startDay: 7,
    description: '구력 1909-07-25 취임. 이후 5년간 러시아의 전쟁계획을 사실상 총괄 — "러시아군의 두뇌".',
  },
  {
    title: '동원계획 제19호 입안',
    category: 'MILITARY',
    startYear: 1910, endYear: 1912,
    description:
      '러시아 4개군의 동프로이센 즉시 침공을 골자로 한 전략전개계획(1910). 군 수뇌부 반대로 ' +
      '1912년 «19A»로 수정(동프로이센 2개군 + 갈리치아 4개군) — 1914년 실제 전개는 A안을 따랐다.',
  },
  {
    title: '스타프카 병참감 — 제1차 세계대전 개전',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8, startDay: 1,
    description:
      '개전과 함께 최고총사령관 사령부의 병참감으로 전임 (구력 07-19). 서열 3위의 실질 작전 ' +
      '책임자로 동프로이센 조기 침공을 강행 — 탄넨베르크 참패로 귀결.',
  },
  {
    title: '제25군단장 전보',
    category: 'MILITARY',
    startYear: 1915, startMonth: 9, startDay: 12,
    description: '니콜라이 2세 친정 개편으로 스타프카에서 실각, 야전 군단장으로 전보 (구력 08-30).',
  },
  {
    title: '북부전선군 참모장',
    category: 'MILITARY',
    startYear: 1916, startMonth: 8, startDay: 24,
    description: '리가 방면 북부전선 예하 군들의 참모 업무 총괄 (구력 08-11 취임).',
  },
  {
    title: '제5군 사령관',
    category: 'MILITARY',
    startYear: 1917, startMonth: 5, startDay: 12,
    description: '2월 혁명 후 임시정부 아래 드빈스크 방면 제5군 지휘 (구력 04-29 취임).',
  },
  {
    title: '해임·예비역 편입',
    category: 'MILITARY',
    startYear: 1917, startMonth: 9, startDay: 22,
    description: '구력 09-09 해임 — 페트로그라드 군관구 예비역 명부(резерв чинов)에 편입.',
  },
  {
    title: '브레스트-리토프스크 군사전문가그룹 수장',
    category: 'DIPLOMATIC',
    startYear: 1918, startMonth: 3,
    description:
      '소비에트 대표단 부속 군사전문가그룹을 이끌었으나, 전문가단 명의로 강화조약 체결 반대 ' +
      '의견서를 제출하고 이탈.',
  },
  {
    title: '백군 합류와 망명',
    category: 'EXILE',
    startYear: 1920,
    description:
      '우크라이나를 거쳐 백군 의용군에 합류, 1920년 크림의 브란겔 러시아군 군사관리부 부부장 역임 ' +
      '후 콘스탄티노플을 거쳐 파리에 정착.',
  },
  {
    title: '《세계대전의 러시아 1914~1915》 출간',
    category: 'PUBLICATION',
    startYear: 1924,
    description:
      '베를린에서 간행한 대표작. 이후 《니콜라이 니콜라예비치 대공》(파리, 1930), ' +
      '《프랑스·마케도니아 전선의 러시아 부대 1916~1918》(파리, 1933) 등을 남겼다.',
  },
  {
    title: '불로뉴비양쿠르에서 사망',
    category: 'PERSONAL',
    startYear: 1937, startMonth: 2, startDay: 3,
    description: '파리 서남 교외 불로뉴비양쿠르에서 향년 70세로 사망. 사인은 사료에 기록이 없다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const DANILOV_STATS = {
  politics: 38,
  military: 74,
  diplomacy: 46,
  intellect: 85,
  charisma: 36,
  administration: 83,
  notes:
    '제정 러시아 참모장교단의 정점에 선 기획가 — 동원계획 19호·19A로 제국 전체의 전쟁 수행 ' +
    '체계를 설계한 두뇌(학식)와, 참모본부·스타프카의 방대한 작전·전개 실무를 장악한 조직력(행정)이 ' +
    '최고 강점. 군사 역량은 계획·참모 업무에서는 발군이나 야전 지휘(25군단·제5군)는 평범했고, ' +
    '도식적 계획으로 현실을 놓쳤다는 탄넨베르크 책임론이 따라붙는다. 궁정 정치와는 거리를 뒀고 ' +
    '(1915년 친정 개편에서 보호자 없이 실각), 대중적 카리스마보다 서재형 참모의 전형이었다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedDanilov(prisma: PrismaService): Promise<void> {
  console.log('\n🎖️ 유리 다닐로프(Yuri Danilov) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const russianEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '러시아 제국' },
    select: { id: true },
  })
  if (!russianEmpire) {
    console.warn('  ⚠️  러시아 제국 HC 미존재 — 먼저 seedRussiaHistoricalCountries 실행 필요. 시딩 중단.')
    return
  }
  // 망명지 — 없으면 연결만 건너뛴다.
  const thirdRepublic = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제3공화국' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Yuri Nikiforovich Danilov' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = DANILOV.biography
    if (!person.birthPlaceText) patch.birthPlaceText = DANILOV.birthPlaceText
    if (!person.birthNote) patch.birthNote = DANILOV.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = DANILOV.deathPlaceText
    if (!person.deathType) patch.deathType = DANILOV.deathType
    if (!person.deathCause) patch.deathCause = DANILOV.deathCause
    if (!person.deathNote) patch.deathNote = DANILOV.deathNote
    if (person.influence == null) patch.influence = DANILOV.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${DANILOV.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${DANILOV.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: DANILOV.name,
        middleName: DANILOV.middleName,
        surname: DANILOV.surname,
        originalName: DANILOV.originalName,
        biography: DANILOV.biography,
        birthDate: toDate(DANILOV.birthYear, DANILOV.birthMonth, DANILOV.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: DANILOV.birthNote,
        deathDate: toDate(DANILOV.deathYear, DANILOV.deathMonth, DANILOV.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: DANILOV.deathType,
        deathCause: DANILOV.deathCause,
        deathNote: DANILOV.deathNote,
        gender: DANILOV.gender,
        nameDisplayOrder: 'western' as any,
        influence: DANILOV.influence,
        birthPlaceText: DANILOV.birthPlaceText,
        deathPlaceText: DANILOV.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${DANILOV.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 군 재임 5건 (MILITARY_COMMANDER — 내각 동반 없음) ───────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    // 같은 인물·국가·타입의 보직이 여럿이므로 startDate로 식별 (카보우르 선례)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
        startDate,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
        title: t.title,
        startDate,
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        accountId: admin.id,
      },
    })
    console.log(
      `  ✅ 재임: ${t.title} (${t.startYear}-${String(t.startMonth).padStart(2, '0')} ~ ` +
        `${t.endYear}-${String(t.endMonth).padStart(2, '0')})`,
    )
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: {
    historicalCountryId: string
    type: 'CITIZENSHIP' | 'EXILE'
    label: string
    priority: number
    note?: string
  }[] = [
    {
      historicalCountryId: russianEmpire.id,
      type: 'CITIZENSHIP',
      label: '러시아 제국 (출생·복무 1866~1917)',
      priority: 0,
    },
  ]
  if (thirdRepublic) {
    affiliations.push({
      historicalCountryId: thirdRepublic.id,
      type: 'EXILE',
      label: '프랑스 제3공화국 (1920 망명 — 파리 정착, 1937 사망)',
      priority: 1,
      note: '1920년 콘스탄티노플을 거쳐 파리 정착 — 백계 러시아인 망명 사회에서 전사 저술가로 활동.',
    })
  } else {
    console.warn('  ⚠️  프랑스 제3공화국 HC 미존재 — 망명지(EXILE) 소속 연결을 건너뛴다.')
  }
  for (const aff of affiliations) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        historicalCountryId: aff.historicalCountryId,
        affiliationType: aff.type as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${aff.label}`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: aff.historicalCountryId,
          affiliationType: aff.type as any,
          priority: aff.priority,
          note: aff.note,
        },
      })
      console.log(`  ✅ 소속국가: ${aff.label}`)
    }
  }

  // ── 4) 별명 ─────────────────────────────────────────────────────────────────
  for (const nk of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({
      where: { personId, nickname: nk.nickname },
    })
    if (!exists) {
      await prisma.personNickname.create({
        data: { personId, nickname: nk.nickname, type: nk.type, priority: nk.priority },
      })
      console.log(`  ✅ 별명: ${nk.nickname}`)
    }
  }

  // ── 5) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({
      where: { personId, title: e.title },
    })
    if (exists) continue
    const startDate = toDate(e.startYear, e.startMonth, e.startDay)
    const startDatePrecision = e.startDay ? 'day' : e.startMonth ? 'month' : 'year'
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    const endDatePrecision = e.endYear ? (e.endDay ? 'day' : e.endMonth ? 'month' : 'year') : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate,
        startDatePrecision,
        endDate,
        endDatePrecision,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 6) 6축 능력치 ────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId, accountId: admin.id },
  })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: DANILOV_STATS.politics,
        military: DANILOV_STATS.military,
        diplomacy: DANILOV_STATS.diplomacy,
        intellect: DANILOV_STATS.intellect,
        charisma: DANILOV_STATS.charisma,
        administration: DANILOV_STATS.administration,
        notes: DANILOV_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${DANILOV_STATS.politics}·군사 ${DANILOV_STATS.military}·` +
        `외교 ${DANILOV_STATS.diplomacy}·학식 ${DANILOV_STATS.intellect}·` +
        `카리스마 ${DANILOV_STATS.charisma}·행정 ${DANILOV_STATS.administration}`,
    )
  }

  console.log('✅ 유리 다닐로프 시딩 완료\n')
}
