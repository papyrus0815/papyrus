/**
 * 프리드리히 베크-지코프스키 (Friedrich von Beck-Rzikowsky, 1830~1920) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 오스트리아-헝가리 참모총장(1881~1906, 25년)으로 콘라트 폰 회첸도르프의 직전 전임자다.
 * 그 전 18년(1863~1881)은 프란츠 요제프 1세의 전속부관으로 지내 사실상 42년을 황제 곁에서
 * 보냈고, 이 개인적 신임을 발판으로 참모본부를 사실상의 최고사령부로 끌어올렸다. 정치·궁정
 * 문제에까지 영향력을 뻗쳐 «부황제(Vice-Kaiser)»라 불렸으나, 신중한 중도 노선으로 큰 충돌은
 * 피했다. 1906년 프란츠 페르디난트 대공의 압박으로 76세에 콘라트에게 자리를 넘겼다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)이라 구력 병기가 필요 없다(콘라트 선례).
 * 참모총장 취임 연도(1881)는 사료가 연도까지만 확인되어 월일 없이 등록한다.
 *
 * 관직 매핑: 전속부관·군사비서실장·참모총장 등은 GovernmentPositionDefinition 카탈로그에
 * 대응 정의가 0건이므로 title을 직접 기입한다(군인 시드 규약, 콘라트·포티오레크 선례).
 * positionType은 MILITARY_COMMANDER.
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (베크-지코프스키 본인 — historicalCountryId=오스트리아-헝가리 제국)
 *  - GovernmentPositionTenure x4 (전속부관·군사비서실장·참모총장·아르시에렌-라이프가르데
 *    대장) — 신규 생성이라 appointmentDetail을 create에 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonNickname x1 («부황제»)
 *  - PersonLifeEvent x18 (연보)
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
const BECK = {
  name: '프리드리히',
  middleName: null as string | null,
  surname: '베크-지코프스키',
  originalName: 'Friedrich von Beck-Rzikowsky',
  gender: 'MALE' as const,
  birthYear: 1830, birthMonth: 3, birthDay: 21,
  birthNote:
    '바덴 대공국 프라이부르크 임 브라이스가우에서 군의관 베른하르트 옥타프 폰 베크의 ' +
    '아들로 태어났다. 원래 이름은 «프리드리히 베크»였고, «지코프스키»는 1913년에야 성에 ' +
    '더해졌다. 1846년 오스트리아 제국군에 소위로 입대했다.',
  birthPlaceText: '바덴 대공국 프라이부르크 임 브라이스가우',
  deathYear: 1920, deathMonth: 2, deathDay: 9,
  deathPlaceText: '오스트리아 공화국 빈',
  deathType: DeathType.NATURAL,
  deathCause: '향년 89세, 제국 해체 이듬해 빈에서 노환으로 사망.',
  deathNote:
    '제국이 오스트리아-헝가리로, 다시 공화국으로 바뀌는 격변을 모두 지켜본 뒤 눈을 감았다. ' +
    '1916년 신설된 상급대장(Generaloberst) 계급을 받은 것이 마지막 진급이었다.',
  influence: 80,
  biography:
    '오스트리아-헝가리 참모총장(1881~1906, 25년)으로 콘라트 폰 회첸도르프의 직전 전임자다. ' +
    '그 전 18년(1863~1881)은 프란츠 요제프 1세의 전속부관으로 지내 사실상 42년을 황제 곁에서 ' +
    '보냈고, 이 개인적 신임을 발판으로 참모본부를 전쟁성마저 명목상으로 만드는 사실상의 ' +
    '최고사령부로 끌어올렸다. 정치·궁정 문제에까지 영향력을 뻗쳐 «부황제(Vice-Kaiser)»라 ' +
    '불렸다. ' +
    '\n\n' +
    '수업과 초기 경력(1830~1859). 프라이부르크에서 태어나 1846년 소위로 임관, 1848년 ' +
    '헝가리 혁명과 1849년 제1차 이탈리아 독립전쟁의 브레시아 공략전에 참전했다. 1854년 ' +
    '육군대학(Kriegsschule) 초기 입학생으로 수석에 가까운 성적으로 졸업하며 대위 진급과 ' +
    '함께 참모본부에 배속되었고, 몰다비아·왈라키아 점령 근무와 헝가리 지도 제작 원정(1857) ' +
    '을 거쳤다. 1859년 제2차 이탈리아 독립전쟁에서 참모장교로 활약하다 06-04 마젠타 전투에서 ' +
    '무릎에 총상을 입었다. ' +
    '\n\n' +
    '황제 곁으로(1861~1881). 부상의 공으로 철관훈장 3등 기사가 되었고, 1862년 하인리히 폰 ' +
    '헤스 남작의 부관을 거쳐 1863년 프란츠 요제프 1세의 전속부관이 되었다. 1866년 ' +
    '보오전쟁에서는 황제의 심복 대리인으로 사령부에 파견되었고, 1867년 대타협 직후 대령으로 ' +
    '진급해 군사비서실장을 겸했다. 1874년 추밀고문관 겸 시종무관장, 1878년 중장 진급과 함께 ' +
    '남작에 서임되었고 보스니아 밀명 파견도 다녀왔다. ' +
    '\n\n' +
    '참모총장 25년(1881~1906). 18년째 전속부관이던 51세에 참모총장에 올라 25년을 재임했다 ' +
    '— 근대 이후 오스트리아-헝가리군 최장수 참모총장이다. «명료한 판단력과 실용적 상식»을 ' +
    '평판으로 삼아 근대화파와 알브레히트 대공이 이끈 보수파 사이에서 신중한 중도로 각 파벌을 ' +
    '조율했고, 전쟁성의 통제를 사실상 명목으로 만들며 참모본부를 실질적 최고사령부로 끌어 ' +
    '올렸다. 1885년 상원 의원이 되었고 같은 해 중부유럽 1:200,000 지형도 제작에 착수, ' +
    '항공사진측량 기법도 선구적으로 도입했다. 1888년 포병대장(Feldzeugmeister)으로 ' +
    '진급했고 1893년 흑鷲훈장 기사가 되었다. 1905년에는 헝가리에서 봉기가 일면 무력으로 ' +
    '진압한다는 «U안(Fall U)» 비상계획을 마련했다. ' +
    '\n\n' +
    '퇴진과 만년(1906~1920). 후계자 프란츠 페르디난트 대공이 개혁과 세대교체를 밀어붙이며 ' +
    '압박한 끝에, 프란츠 요제프는 마지못해 76세의 그를 1906-11-18 콘라트 폰 회첸도르프로 ' +
    '교체했다 — 같은 날 백작으로 올려 예우했다. 이듬해 은퇴해 아르시에렌-라이프가르데(창기병 ' +
    '근위대) 대장이라는 의전직을 죽을 때까지 지녔다. 1913년에는 남계가 끊긴 첫 부인 가문의 ' +
    '성을 더하는 것을 황제가 허락해 «베크-지코프스키»가 되었고, 1916년 신설된 상급대장 ' +
    '계급을 받았다. 제국이 무너지고 공화국이 들어선 이듬해인 1920년 빈에서 89세로 죽었다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '프란츠 요제프 1세 전속부관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1863,
    endYear: 1881,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '참모총장으로 발탁되어 전속부관 임무를 마쳤다.',
    appointmentDetail:
      '1862년 하인리히 폰 헤스 남작의 부관을 지낸 뒤 1863년 프란츠 요제프 1세의 전속부관이 ' +
      '되었다. 1866년 보오전쟁 때는 황제의 심복 대리인으로 사령부에 파견되었다.',
    notes:
      '18년간 황제를 가장 가까이서 보좌하며 절대적 신임을 쌓았다 — 이 신임이 훗날 25년 ' +
      '참모총장 재임과 «부황제»라는 별칭의 토대가 된다.',
  },
  {
    title: '군사비서실장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1867,
    endYear: 1874,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '추밀고문관 겸 시종무관장으로 자리를 옮겼다.',
    appointmentDetail:
      '1867년 오스트리아-헝가리 대타협 직후 대령으로 진급하며 군사비서실장을 겸했다.',
    notes: '전속부관 임무와 병행한 자리로, 궁정 내 군사 행정의 실무를 총괄했다.',
  },
  {
    title: '참모총장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1881,
    endYear: 1906, endMonth: 11, endDay: 18,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '후계자 프란츠 페르디난트 대공의 개혁·세대교체 압박에 밀려 프란츠 요제프가 마지못해 ' +
      '1906-11-18 콘라트 폰 회첸도르프로 교체했다 — 같은 날 백작으로 승작해 예우했다.',
    appointmentDetail:
      '18년째 전속부관이던 51세에 참모총장으로 발탁되었다 — 정확한 월일은 사료가 연도까지만 ' +
      '전한다. 황제의 절대적 신임이 발탁의 배경이었다.',
    notes:
      '근대 이후 오스트리아-헝가리군 최장수 참모총장(25년). 근대화파와 알브레히트 대공의 ' +
      '보수파 사이에서 신중한 중도로 조율하며 전쟁성의 통제를 사실상 명목으로 만들었고, ' +
      '참모본부를 실질적 최고사령부로 끌어올렸다. 1:200,000 중부유럽 지형도·항공사진측량 ' +
      '도입 등 지도 제작 혁신을 이끌었고, 1905년 헝가리 봉기 대비 «U안» 비상계획을 마련했다.',
  },
  {
    title: '아르시에렌-라이프가르데 대장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1907,
    endYear: 1920, endMonth: 2, endDay: 9,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '재임 중 1920-02-09 빈에서 사망.',
    appointmentDetail: '참모총장에서 물러난 이듬해 창기병 근위대 대장이라는 의전직을 받았다.',
    notes: '실권은 없는 명예직으로, 죽을 때까지 유지했다.',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '부황제 (Vice-Kaiser)', type: 'EPITHET', priority: 1 },
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
    title: '프라이부르크 임 브라이스가우 출생',
    category: 'FAMILY',
    startYear: 1830, startMonth: 3, startDay: 21,
    description: '바덴 대공국에서 군의관 베른하르트 옥타프 폰 베크의 아들로 출생.',
  },
  {
    title: '오스트리아 제국군 소위 임관',
    category: 'MILITARY',
    startYear: 1846,
    description: '오스트리아 제국군에 소위로 입대했다.',
  },
  {
    title: '헝가리 혁명·이탈리아 독립전쟁 종군',
    category: 'MILITARY',
    startYear: 1848, endYear: 1849,
    description: '1848년 헝가리 혁명, 1849년 제1차 이탈리아 독립전쟁의 브레시아 공략전에 참전.',
  },
  {
    title: '육군대학 졸업 — 참모본부 배속',
    category: 'EDUCATION',
    startYear: 1854,
    description:
      '육군대학(Kriegsschule) 초기 입학생 중 한 명으로 수석에 가까운 성적으로 졸업, 대위 ' +
      '진급과 함께 참모본부에 배속되었다.',
  },
  {
    title: '몰다비아·왈라키아 점령 근무·헝가리 지도 원정',
    category: 'MILITARY',
    startYear: 1854, endYear: 1857,
    description: '몰다비아·왈라키아 점령 근무를 거쳐 1857년 헝가리 지도 제작 원정에 참가했다.',
  },
  {
    title: '마젠타 전투 부상',
    category: 'MILITARY',
    startYear: 1859, startMonth: 6, startDay: 4,
    description:
      '제2차 이탈리아 독립전쟁에서 참모장교로 활약하다 마젠타 전투에서 무릎에 총상을 입었다.',
  },
  {
    title: '철관훈장 3등 기사 서임',
    category: 'AWARD',
    startYear: 1861,
    description: '마젠타 전투 부상의 공으로 전공장식이 붙은 철관훈장 3등 기사가 되었다.',
  },
  {
    title: '안나 마리아 지코프스키 폰 도브르치츠와 결혼',
    category: 'FAMILY',
    startYear: 1861,
    description:
      '안나 마리아 지코프스키 폰 도브르치츠(1839~1900)와 혼인했다 — 1913년 성을 통합하는 ' +
      '근거가 된 첫 부인 가문이다.',
  },
  {
    title: '프란츠 요제프 1세 전속부관 취임',
    category: 'MILITARY',
    startYear: 1863,
    description:
      '하인리히 폰 헤스 남작의 부관(1862)을 거쳐 황제의 전속부관이 되었다 — 이후 18년을 ' +
      '이 자리에서 보낸다.',
  },
  {
    title: '아들 프리드리히 출생',
    category: 'FAMILY',
    startYear: 1872, startMonth: 10, startDay: 1,
    description: '첫 부인 사이에서 아들 프리드리히 마리아 요한 네포무크 레오폴트가 태어났다.',
  },
  {
    title: '중장 진급·남작 서임',
    category: 'AWARD',
    startYear: 1878,
    description: '중장으로 진급하며 남작에 서임되었고, 보스니아 밀명 파견도 다녀왔다.',
  },
  {
    title: '참모총장 취임',
    category: 'MILITARY',
    startYear: 1881,
    description:
      '18년째 전속부관이던 51세에 참모총장으로 발탁되었다 — 이후 25년, 근대 이후 최장수 ' +
      '재임 기록을 세운다.',
  },
  {
    title: '중부유럽 지형도 제작 착수·상원 의원',
    category: 'CAREER',
    startYear: 1885,
    description:
      '1:200,000 축척 중부유럽 일반도 제작에 착수하고 항공사진측량 기법을 선구적으로 ' +
      '도입했다. 같은 해 상원(귀족원) 의원에 임명되었다.',
  },
  {
    title: '포병대장 진급',
    category: 'MILITARY',
    startYear: 1888,
    description: '포병대장(Feldzeugmeister)으로 진급했다.',
  },
  {
    title: '두 번째 결혼 — 비앙카 폰 라차리니',
    category: 'FAMILY',
    startYear: 1905, startMonth: 10, startDay: 5,
    description:
      '첫 부인 사후(1900) 비앙카 실비아 폰 라차리니(1882~1949)와 재혼했다. 이듬해 딸 알리스가 ' +
      '태어난다.',
  },
  {
    title: '참모총장 퇴진 — 콘라트에게 인계',
    category: 'MILITARY',
    startYear: 1906, startMonth: 11, startDay: 18,
    description:
      '프란츠 페르디난트 대공의 개혁 압박에 밀려 76세에 콘라트 폰 회첸도르프에게 자리를 ' +
      '넘겼다 — 같은 날 백작으로 승작했다.',
  },
  {
    title: '성 통합 — «베크-지코프스키»',
    category: 'PERSONAL',
    startYear: 1913,
    description:
      '남계가 끊긴 첫 부인 지코프스키 폰 도브르치츠 가문의 성을 자신의 성에 더하는 것을 ' +
      '황제가 허락했다.',
  },
  {
    title: '빈에서 사망',
    category: 'PERSONAL',
    startYear: 1920, startMonth: 2, startDay: 9,
    description:
      '제국 해체 이듬해 향년 89세로 사망 — 1916년 받은 상급대장(Generaloberst) 계급이 ' +
      '마지막 진급이었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BECK_STATS = {
  politics: 75,
  military: 60,
  diplomacy: 55,
  intellect: 74,
  charisma: 68,
  administration: 82,
  notes:
    '25년간 참모본부를 운영하며 전쟁성마저 명목으로 만든 조직 장악력에서 행정이 최고 ' +
    '수준이다. 정치는 근대화파·보수파를 조율하며 «부황제»로 불릴 만큼 궁정 영향력을 키운 ' +
    '점을 높이 평가하나, 큰 개혁을 밀어붙이기보다 신중한 현상 유지에 머물렀다는 한계도 ' +
    '있다. 학식은 지도 제작·항공사진측량 도입 등 실무형 혁신에서 드러나지만 콘라트류의 ' +
    '이론적 저작은 남기지 않았다. 군사는 마젠타 전투 부상 등 야전 경험은 있으나 참모총장 ' +
    '재임 25년 동안 큰 전쟁을 치르지 않아 실전 지휘 역량을 검증할 기회가 적었다. 외교는 ' +
    '궁정 내 조정에 능했으나 대외 정책에는 직접 관여가 적었다. 카리스마는 42년(부관 18년+ ' +
    '참모총장 25년 다소 중복 포함)에 걸친 황제의 절대적 신임이 뒷받침한다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBeckRzikowsky(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️ 프리드리히 베크-지코프스키(Beck-Rzikowsky) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const austriaHungary = await prisma.historicalCountry.findFirst({
    where: { name: '오스트리아-헝가리 제국' },
    select: { id: true },
  })
  if (!austriaHungary) {
    console.warn(
      '  ⚠️  오스트리아-헝가리 제국 HC 미존재 — 먼저 seedAustriaHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Beck-Rzikowsky' } },
        { AND: [{ name: '프리드리히' }, { surname: '베크-지코프스키' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = BECK.originalName
    if (!person.biography) patch.biography = BECK.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BECK.birthPlaceText
    if (!person.birthNote) patch.birthNote = BECK.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BECK.deathPlaceText
    if (!person.deathType) patch.deathType = BECK.deathType
    if (!person.deathCause) patch.deathCause = BECK.deathCause
    if (!person.deathNote) patch.deathNote = BECK.deathNote
    if (person.influence == null) patch.influence = BECK.influence
    if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BECK.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BECK.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BECK.name,
        middleName: BECK.middleName,
        surname: BECK.surname,
        originalName: BECK.originalName,
        biography: BECK.biography,
        birthDate: toDate(BECK.birthYear, BECK.birthMonth, BECK.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BECK.birthNote,
        deathDate: toDate(BECK.deathYear, BECK.deathMonth, BECK.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BECK.deathType,
        deathCause: BECK.deathCause,
        deathNote: BECK.deathNote,
        gender: BECK.gender,
        nameDisplayOrder: 'western' as any,
        influence: BECK.influence,
        birthPlaceText: BECK.birthPlaceText,
        deathPlaceText: BECK.deathPlaceText,
        historicalCountryId: austriaHungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BECK.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 ────────────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
        title: t.title,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision,
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        appointmentDetail: t.appointmentDetail,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId: austriaHungary.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 오스트리아-헝가리 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note: '출생·복무 전 기간의 국가. 1918년 제국 해체 뒤에도 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국 (출생·복무 1830~1918)')
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
        politics: BECK_STATS.politics,
        military: BECK_STATS.military,
        diplomacy: BECK_STATS.diplomacy,
        intellect: BECK_STATS.intellect,
        charisma: BECK_STATS.charisma,
        administration: BECK_STATS.administration,
        notes: BECK_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BECK_STATS.politics}·군사 ${BECK_STATS.military}·` +
        `외교 ${BECK_STATS.diplomacy}·학식 ${BECK_STATS.intellect}·` +
        `카리스마 ${BECK_STATS.charisma}·행정 ${BECK_STATS.administration}`,
    )
  }

  console.log('✅ 프리드리히 베크-지코프스키 시딩 완료\n')
}
