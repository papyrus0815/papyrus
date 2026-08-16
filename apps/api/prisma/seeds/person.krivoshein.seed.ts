/**
 * 알렉산드르 바실리예비치 크리보셰인 (Alexander Vasilyevich Krivoshein, 1857~1921) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 정치가. 토지정비·농업총국 장관(1908~1915)으로 스톨리핀 농업개혁 집행의
 * 실질 총책이었고, 스톨리핀 사후에도 개혁과 시베리아 이주 정책을 밀고 나갔다. 1914년
 * 코콥초프 제거를 주도하고 본인은 총리직을 고사했으며(고레미킨 추천), 1915년 니콜라이
 * 2세 친정 반대 각료 8인 연명서한의 서명자이자 각료 반발 그룹의 실질 리더로 그해 10월
 * (구력) 해임되었다. 혁명 후 반볼셰비키 지하조직 우파중앙을 주도했고, 1920년 브란겔의
 * 크림에서 남러시아 정부 수반이 되어 «좌파적 정책을 우파의 손으로»라는 표어 아래 브란겔
 * 토지개혁을 이끌다 11월 철수와 함께 망명, 이듬해 베를린에서 죽었다.
 *
 * 날짜 규약: 러시아 관보 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes에 병기.
 * 1918년 그레고리력 전환 후의 사건(1920~1921)은 환산 불필요. 별명 없음(«좌파적 정책을
 * 우파의 손으로»는 노선 표어라 별명 미등록). 토지정비·농업총국 장관은 카탈로그에 대응
 * 정의가 없어 title 직접 기입(군 직책 폴백 규약). 1920년 남러시아 정부 수반은 대응 HC가
 * 없어 재임이 아니라 연보로 기록(다닐로프의 브란겔군 선례).
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (크리보셰인 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x1 (토지정비·농업총국 장관 1908~1915, CABINET_MINISTER)
 *  - PersonCountryAffiliation x1 (러시아 제국 CITIZENSHIP)
 *  - PersonLifeEvent x17 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const KRIVOSHEIN = {
  name: '알렉산드르',
  middleName: '바실리예비치',
  surname: '크리보셰인',
  originalName: 'Alexander Vasilyevich Krivoshein (Александр Васильевич Кривошеин)',
  gender: 'MALE' as const,
  birthYear: 1857, birthMonth: 7, birthDay: 31,
  birthNote:
    '구력(율리우스력) 1857-07-19 출생 — 신력 환산 07-31. 부친 바실리 크리보셰인은 농노의 ' +
    '아들로 사병에서 중령까지 진급한 자수성가 장교 — 명문 귀족이 아닌 하급 출신 가문이다.',
  birthPlaceText: '러시아 제국령 폴란드 바르샤바',
  deathYear: 1921, deathMonth: 10, deathDay: 28,
  deathPlaceText: '독일 베를린 — 몸젠 요양원',
  deathType: DeathType.UNKNOWN,
  deathCause: '사인 미기록 (향년 64세)',
  deathNote:
    '1921-10-28 베를린의 몸젠 요양원에서 사망했다(망명 사회의 구력 병기 관행으로 10-15/28 ' +
    '이중 표기 — 1918년 그레고리력 전환 후라 공식 날짜는 28일). 사인은 사료에 기록이 없고, ' +
    '백군에서 죽은 두 장남(바실리는 쿠반에서 발진티푸스로, 올레크는 적군 포로 상태에서 ' +
    '피살)의 상실에서 회복하지 못한 채 건강이 무너졌다는 서술만 전한다. 베를린 테겔 러시아 ' +
    '정교회 묘지 중앙 구역에 매장.',
  influence: 60,
  biography:
    '러시아 제국의 정치가. 스톨리핀 농업개혁을 실제로 집행한 토지정비·농업총국 장관 ' +
    '(1908~1915)이자, 1915년 각료 반발의 실질 리더, 그리고 1920년 브란겔의 크림에서 ' +
    '백군 최후의 정부를 이끈 수반 — 제정 말기의 가장 유능한 행정가라는 평가와 «좌파적 ' +
    '정책을 우파의 손으로»라는 표어가 그의 이력을 요약한다. ' +
    '\n\n' +
    '성장(1857~1884). 바르샤바에서 태어났다. 부친은 농노의 아들로 사병에서 중령까지 오른 ' +
    '자수성가 장교로, 명문 귀족과는 거리가 먼 집안이었다. 페테르부르크 제국대학에서 ' +
    '물리수학부로 시작해 법학부로 옮겨 법학 후보 학위를 받고 1884년 법무부에 들어갔다. ' +
    '\n\n' +
    '이주(移住) 행정의 전문가(1896~1906). 내무부 이주국에서 부국장(1896)·국장 대리(1902)· ' +
    '정식 국장(1905, 구력 1904-12-23)을 지내며 시베리아 이주 정책의 실무를 장악했다. ' +
    '1905년 토지정비·농업총국 차관, 1906년 국가평의회 의원을 거쳐 같은 해 10월 ' +
    '재무차관에 올라 귀족토지은행·농민토지은행 양행 총재를 겸했다 — 농민 토지 문제의 ' +
    '행정·금융 양면을 모두 거친 이력이다. ' +
    '\n\n' +
    '스톨리핀 개혁의 집행자(1908~1915). 1908-06-03(구력 05-21) 개혁 주무 부처인 토지정비· ' +
    '농업총국의 장관(각료회의 일원)이 되어, 농촌공동체 해체와 자영농 창출을 골자로 한 ' +
    '스톨리핀 농업개혁 집행을 총괄했다. 1910년에는 스톨리핀과 함께 시베리아를 시찰하고 ' +
    '공동 보고서 «시베리아와 볼가 유역 여행»을 냈으며, 1911년 스톨리핀 암살 후에도 ' +
    '1915년까지 개혁과 이주 정책을 지속 추진했다. 전시에는 식량공급 특별협의회 의장을 ' +
    '겸했다. ' +
    '\n\n' +
    '궁정의 킹메이커(1914). 1914년 1월 코콥초프 총리 제거를 주도했으나 본인은 총리직을 ' +
    '고사하고 고레미킨을 추천했다 — 전면에 서지 않고 내각을 움직이는 실력자의 자리를 ' +
    '택한 것이다. ' +
    '\n\n' +
    '1915년 위기와 실각. 니콜라이 2세가 대공을 해임하고 몸소 총사령관에 나서려 하자, ' +
    '진보블록·여론과의 협력을 주장하던 각료 그룹의 실질 리더로서 1915-09-03(구력 08-21) ' +
    '각료 8인 연명서한에 서명했다. 고레미킨과의 대립에서 황제가 고레미킨을 지지하면서 ' +
    '1915-11-08(구력 10-26) 해임 — 직후 러시아 적십자사 총전권대표로 옮겨 1917년까지 ' +
    '일했다(국가평의회 의원직은 유지). ' +
    '\n\n' +
    '혁명과 백군(1917~1920). 1918년 봄 모스크바에서 친독 지향의 보수 지하조직 우파중앙 ' +
    '(Правый центр)을 주도했고, 가을 키예프로 남하해 러시아국가통합회의 결성에 관여했다. ' +
    '데니킨 치하에서 남러시아 정부의 보급관리부장(1919-12~1920-02)을 지냈다. ' +
    '\n\n' +
    '남러시아 정부 수반(1920). 1920년 4월 브란겔의 초청으로 복귀해 5월 크림에 도착, 6월 ' +
    '남러시아 정부 수반이 되었다(형식 직함은 «총사령관 보좌관»으로 적는 사료도 있다). ' +
    '대지주지를 25년 분할상환으로 경작농에게 유상분배하는 브란겔 토지개혁(1920-05 토지령) ' +
    '의 정치적 후견인으로 — 스톨리핀 개혁의 연장선에서 — «좌파적 정책을 우파의 손으로» ' +
    '노선을 이끌었다. 11월 적군의 크림 돌파로 1920-11-12 세바스토폴에서 영국 순양함 ' +
    '켄타우르 편으로 철수했다. ' +
    '\n\n' +
    '망명과 죽음(1920~1921). 콘스탄티노플과 파리를 거쳐 베를린으로 옮겼으나, 백군에서 ' +
    '죽은 두 장남의 상실에서 회복하지 못한 채 1921-10-28 베를린에서 죽었다. 아내 옐레나 ' +
    '카르포바는 모로조프 상인 왕조의 외손녀이며, 아들 중 프세볼로드는 훗날 브뤼셀 대주교 ' +
    '바실리로 저명한 교부학자가, 키릴은 부친 전기의 저자가 되었다. ' +
    '\n\n' +
    '평가. 하급 출신에서 제국 농정의 정점까지 오른 실무형 정치가로, 제정 말기 관료 중 ' +
    '가장 유능한 행정가라는 평가가 많다. 1915년의 실각은 개혁적 관료와 전제 궁정의 결별을 ' +
    '상징하는 장면으로, 1920년 크림의 실험은 «너무 늦게 온 개혁»의 대명사로 인용된다.',
}

// ── 토지정비·농업총국 장관 재임 (카탈로그 정의 없음 — title 직접) ────────────
const MINISTER_TENURE = {
  title: '토지정비·농업총국 장관',
  startYear: 1908, startMonth: 6, startDay: 3,
  endYear: 1915, endMonth: 11, endDay: 8,
  endReason: TenureEndReason.REMOVAL,
  endReasonDetail:
    '1915년 각료 연명서한 사태 — 고레미킨과의 대립에서 니콜라이 2세가 고레미킨을 지지하며 ' +
    '해임 (구력 1915-10-26). 직후 적십자 총전권대표로 전임, 국가평의회 의원직은 유지.',
  notes:
    '구력 1908-05-21 취임(главноуправляющий землеустройством и земледелием — 각료회의 ' +
    '일원인 장관급 주무직). 스톨리핀 농업개혁(공동체 해체·자영농 창출) 집행 총책이자 ' +
    '시베리아 이주 정책 주도자 — 1911년 스톨리핀 사후에도 개혁을 지속했다. 1910년 ' +
    '스톨리핀과 시베리아 시찰·공동 보고서. 전시 식량공급 특별협의회 의장 겸임(1915). ' +
    '1915-09-03(구력 08-21) 황제 친정 반대 각료 8인 연명서한의 서명자이자 그룹의 실질 리더.',
}

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
    title: '바르샤바 출생',
    category: 'FAMILY',
    startYear: 1857, startMonth: 7, startDay: 31,
    description:
      '농노의 아들로 사병에서 중령까지 오른 자수성가 장교의 아들 (구력 07-19) — 명문 귀족이 ' +
      '아닌 하급 출신 가문.',
  },
  {
    title: '페테르부르크 대학 수학·법무부 입직',
    category: 'EDUCATION',
    startYear: 1884,
    description:
      '물리수학부에서 법학부로 옮겨 법학 후보 학위 — 졸업연도는 사료 미기재(1884 입직으로 ' +
      '역산). 법무부에서 관료 경력 시작.',
  },
  {
    title: '내무부 이주국 근무',
    category: 'CAREER',
    startYear: 1896, endYear: 1905,
    description:
      '부국장(1896)→국장 대리(1902)→정식 국장(1905-01-05, 구력 1904-12-23) — 시베리아 이주 ' +
      '정책 실무 장악.',
  },
  {
    title: '토지정비·농업총국 차관',
    category: 'CAREER',
    startYear: 1905, startMonth: 6, startDay: 21,
    description: '구력 06-08 임명 — 훗날 장관으로 이끌 부처의 차관.',
  },
  {
    title: '국가평의회 의원 임명',
    category: 'POLITICAL',
    startYear: 1906, startMonth: 5, startDay: 19,
    description: '구력 05-06 — 1915년 장관 해임 후에도 의원직 유지(~1917).',
  },
  {
    title: '재무차관·양대 토지은행 총재',
    category: 'CAREER',
    startYear: 1906, startMonth: 10, startDay: 19,
    endYear: 1908, endMonth: 6,
    description:
      '구력 10-06 임명 — 귀족토지은행·농민토지은행 총재 겸임. 농민 토지 문제의 금융 축 장악.',
  },
  {
    title: '토지정비·농업총국 장관 취임',
    category: 'POLITICAL',
    startYear: 1908, startMonth: 6, startDay: 3,
    description: '구력 05-21 — 각료회의 일원, 스톨리핀 개혁 주무 부처의 수장.',
  },
  {
    title: '스톨리핀 농업개혁 집행 총괄',
    category: 'POLITICAL',
    startYear: 1908, endYear: 1915,
    description:
      '농촌공동체 해체·자영농(후토르) 창출·시베리아 이주 — 1911년 스톨리핀 암살 후에도 ' +
      '1915년까지 개혁 지속.',
  },
  {
    title: '스톨리핀과 시베리아 시찰',
    category: 'TRAVEL',
    startYear: 1910,
    description: '공동 보고서 «시베리아와 볼가 유역 여행» 저술 — 이주 정책의 현장 점검.',
  },
  {
    title: '총리직 고사 — 고레미킨 추천',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 2,
    description:
      '코콥초프 총리 제거를 주도(구력 1914-01-30 해임)하고 본인은 고사 — 전면에 서지 않는 ' +
      '내각의 실력자 노선.',
  },
  {
    title: '각료 8인 연명서한 서명',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 9, startDay: 3,
    description:
      '니콜라이 2세 친정 반대 서한(구력 08-21, 사마린 기초)에 서명 — 진보블록과의 협력을 ' +
      '주장한 각료 그룹의 실질 리더.',
  },
  {
    title: '장관 해임·적십자 총전권대표',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 11, startDay: 8,
    description:
      '고레미킨과의 대립에서 황제가 고레미킨 지지 — 구력 10-26 해임. 직후 러시아 적십자사 ' +
      '총전권대표로 전임(~1917).',
  },
  {
    title: '우파중앙(Правый центр) 주도',
    category: 'POLITICAL',
    startYear: 1918,
    description:
      '1918년 봄 모스크바의 친독 지향 보수 지하조직을 주도 — 가을 키예프 남하, ' +
      '러시아국가통합회의 결성 관여.',
  },
  {
    title: '데니킨 남러시아 정부 보급관리부장',
    category: 'POLITICAL',
    startYear: 1919, startMonth: 12,
    endYear: 1920, endMonth: 2,
    description: '데니킨 총사령부 부속 정부의 보급 담당 (러시아어 위키 단일 출처).',
  },
  {
    title: '남러시아 정부 수반 — 브란겔의 크림',
    category: 'POLITICAL',
    startYear: 1920, startMonth: 6,
    endYear: 1920, endMonth: 11, endDay: 12,
    description:
      '브란겔의 초청(4월)·크림 도착(5월, 수반 대리)을 거쳐 6월 정식 수반(형식 직함 «총사령관 ' +
      '보좌관» 표기 사료도 있음). 브란겔 토지개혁(구력 1920-05-25 토지령 — 대지주지 25년 ' +
      '분할상환 유상분배)의 정치적 후견인 — «좌파적 정책을 우파의 손으로».',
  },
  {
    title: '크림 철수·망명',
    category: 'EXILE',
    startYear: 1920, startMonth: 11, startDay: 12,
    description:
      '적군의 크림 돌파로 세바스토폴에서 영국 순양함 켄타우르 편 철수 — 콘스탄티노플→파리→ ' +
      '베를린.',
  },
  {
    title: '베를린에서 사망',
    category: 'PERSONAL',
    startYear: 1921, startMonth: 10, startDay: 28,
    description:
      '몸젠 요양원에서 향년 64세 — 백군에서 죽은 두 장남의 상실 후 건강 붕괴, 사인 미기록. ' +
      '베를린 테겔 러시아 정교회 묘지 매장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const KRIVOSHEIN_STATS = {
  politics: 68,
  military: 20,
  diplomacy: 50,
  intellect: 76,
  charisma: 52,
  administration: 86,
  notes:
    '제정 말기 최고의 행정가라는 평이 붙는 실무형 정치가 — 이주국·토지은행·농업총국으로 ' +
    '이어진 농정 장악과 스톨리핀 개혁 집행 총괄이 근거(행정). 코콥초프 제거·총리 고사· ' +
    '고레미킨 추천·1915 각료 그룹 리더로 이어진 막후 정치력(정치)도 각료 중 발군이었으나, ' +
    '결정적 순간 황제의 신임을 잃었다. 브란겔은 그의 «탁월한 학식과 교양»을 상찬(학식). ' +
    '군사·외교는 본령이 아니었고, 전면에 서기보다 막후를 택한 처신답게 대중적 카리스마도 ' +
    '중간 수준.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedKrivoshein(prisma: PrismaService): Promise<void> {
  console.log('\n🌾 알렉산드르 크리보셰인(Alexander Krivoshein) 시딩 시작 (기존 데이터 보존 모드)...')

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

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Alexander Vasilyevich Krivoshein' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = KRIVOSHEIN.biography
    if (!person.birthPlaceText) patch.birthPlaceText = KRIVOSHEIN.birthPlaceText
    if (!person.birthNote) patch.birthNote = KRIVOSHEIN.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = KRIVOSHEIN.deathPlaceText
    if (!person.deathType) patch.deathType = KRIVOSHEIN.deathType
    if (!person.deathCause) patch.deathCause = KRIVOSHEIN.deathCause
    if (!person.deathNote) patch.deathNote = KRIVOSHEIN.deathNote
    if (person.influence == null) patch.influence = KRIVOSHEIN.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${KRIVOSHEIN.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${KRIVOSHEIN.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: KRIVOSHEIN.name,
        middleName: KRIVOSHEIN.middleName,
        surname: KRIVOSHEIN.surname,
        originalName: KRIVOSHEIN.originalName,
        biography: KRIVOSHEIN.biography,
        birthDate: toDate(KRIVOSHEIN.birthYear, KRIVOSHEIN.birthMonth, KRIVOSHEIN.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: KRIVOSHEIN.birthNote,
        deathDate: toDate(KRIVOSHEIN.deathYear, KRIVOSHEIN.deathMonth, KRIVOSHEIN.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: KRIVOSHEIN.deathType,
        deathCause: KRIVOSHEIN.deathCause,
        deathNote: KRIVOSHEIN.deathNote,
        gender: KRIVOSHEIN.gender,
        nameDisplayOrder: 'western' as any,
        influence: KRIVOSHEIN.influence,
        birthPlaceText: KRIVOSHEIN.birthPlaceText,
        deathPlaceText: KRIVOSHEIN.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${KRIVOSHEIN.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 토지정비·농업총국 장관 재임 (CABINET_MINISTER — 정의 없음, title 직접) ──
  {
    const t = MINISTER_TENURE
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionType: GovernmentPositionType.CABINET_MINISTER,
        startDate,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
    } else {
      await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: russianEmpire.id,
          positionType: GovernmentPositionType.CABINET_MINISTER,
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
      console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
    }
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId: russianEmpire.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 러시아 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: russianEmpire.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log('  ✅ 소속국가: 러시아 제국 (출생·복무 1857~1917)')
  }

  // ── 4) 연보 ─────────────────────────────────────────────────────────────────
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

  // ── 5) 6축 능력치 ────────────────────────────────────────────────────────────
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
        politics: KRIVOSHEIN_STATS.politics,
        military: KRIVOSHEIN_STATS.military,
        diplomacy: KRIVOSHEIN_STATS.diplomacy,
        intellect: KRIVOSHEIN_STATS.intellect,
        charisma: KRIVOSHEIN_STATS.charisma,
        administration: KRIVOSHEIN_STATS.administration,
        notes: KRIVOSHEIN_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${KRIVOSHEIN_STATS.politics}·군사 ${KRIVOSHEIN_STATS.military}·` +
        `외교 ${KRIVOSHEIN_STATS.diplomacy}·학식 ${KRIVOSHEIN_STATS.intellect}·` +
        `카리스마 ${KRIVOSHEIN_STATS.charisma}·행정 ${KRIVOSHEIN_STATS.administration}`,
    )
  }

  console.log('✅ 알렉산드르 크리보셰인 시딩 완료\n')
}
