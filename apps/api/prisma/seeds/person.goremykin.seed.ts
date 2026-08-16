/**
 * 이반 로기노비치 고레미킨 (Ivan Logginovich Goremykin, 1839~1917) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure/Cabinet 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 관료·정치가. 대신회의 의장(총리)을 두 차례 지냈다 — 제2대(1906,
 * 비테와 스톨리핀 사이 약 2개월 반)와 제5대(1914~1916, 제1차 세계대전 개전기).
 * 평생을 법제·내무 관료로 보낸 «구파 인간»으로, 대신을 차르의 종복으로 여기는 절대
 * 충성이 신조였다. 1915년 니콜라이 2세 친정 반대 각료 연명서한 사태에서 홀로 황제
 * 편에 서서 유임됐고, 두마·진보블록과의 관계가 파탄나며 1916년 초 해임되었다.
 * 1916년 1등 실제추밀고문관(제국 역사상 13번째이자 마지막) 서임. 1917년 12월 소치
 * 근교 다차에서 강도단 습격으로 부인·딸·사위와 함께 살해되었다.
 *
 * 날짜 규약: 러시아 관보 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes에 병기.
 * 사망일은 출처 분열(NS 12-21 vs 12-24) — 다수설 12-24 채택, 이설은 deathNote 병기.
 * 고유 별명 없음 — 당대 인물평 «제곱된 관료(чиновник в квадрате)»는 사평이라
 * 별명으로 등록하지 않고 전기·능력치 노트에만 기록.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('총리'·'내무장관' 관직 정의).
 *
 * 등록 항목:
 *  - Person x1 (고레미킨 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x3:
 *      · 내무장관 1895~1899 (CABINET_MINISTER)
 *      · 대신회의 의장 1차 1906 (HEAD_OF_GOVERNMENT, 제2대) + Cabinet
 *      · 대신회의 의장 2차 1914~1916 (HEAD_OF_GOVERNMENT, 제5대) + Cabinet
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
const GOREMYKIN = {
  name: '이반',
  middleName: '로기노비치',
  surname: '고레미킨',
  originalName: 'Ivan Logginovich Goremykin (Иван Логгинович Горемыкин)',
  gender: 'MALE' as const,
  birthYear: 1839, birthMonth: 11, birthDay: 8,
  birthNote:
    '구력(율리우스력) 1839-10-27 출생 — 신력 환산 11-08. 노브고로드의 황실령(우델) ' +
    '관리소 지배인의 아들.',
  birthPlaceText: '러시아 제국 노브고로드',
  deathYear: 1917, deathMonth: 12, deathDay: 24,
  deathPlaceText: '소치 근교 자택 다차',
  deathType: DeathType.OTHER,
  deathCause: '강도단 습격으로 부인·딸·사위와 함께 살해 (향년 78세)',
  deathNote:
    '혁명 후 소치 근교 다차에 머물다 1917년 12월 강도단의 습격으로 부인 알렉산드라, 딸, ' +
    '사위(옵친니코프 교수)와 함께 살해되었다. 사망일은 출처가 갈린다 — 대통령도서관' +
    '(prlib)·hrono는 구력 12-11(신력 12-24), 러시아어 위키백과는 구력 12-08(신력 12-21); ' +
    '다수설인 12-24를 채택. 단순 강도인지 정치적 살해인지 경위는 끝내 규명되지 않았다. ' +
    '소치 자보크잘노예 묘지의 가족 납골묘에 묻혔으나 묘지 자체가 현존하지 않는다.',
  influence: 55,
  biography:
    '러시아 제국의 관료·정치가. 대신회의 의장(총리)을 두 차례 — 제2대(1906)와 ' +
    '제5대(1914~1916) — 지냈다. 평생을 법제·내무 관료로 보낸 스스로의 표현대로 «구파 ' +
    '인간(человек старой школы)»으로, 대신이란 차르의 종복이며 황제의 명령이 곧 법이라는 ' +
    '신조를 전제정 최후의 순간까지 지켰다. 당대의 평은 «제곱된 관료(чиновник в квадрате)». ' +
    '\n\n' +
    '성장과 교육(1839~1860). 노브고로드에서 황실령 관리소 지배인의 아들로 태어나 제국' +
    '법률학교를 1860년(제21기) 졸업했다. ' +
    '\n\n' +
    '관료의 길(1860~1895). 원로원 제1부에서 관직을 시작해 법무부를 거쳐, 1864~1873년 ' +
    '폴란드 왕국에서 농민사무 위원으로 일하며 플로츠크(1866)·켈체(1869) 부지사를 지냈다. ' +
    '1884~1891년 원로원 제2부(농민 담당) 검사장, 1891년 법무차관, 1894년 세나토르, ' +
    '1895년 4월 내무차관 — 농민·토지 법제 실무로 잔뼈가 굵은 전형적 관방 경력이었다. ' +
    '\n\n' +
    '내무장관(1895~1899). 1895년 10월 내무장관에 올랐다. 젬스트보(지방자치) 제도를 서부 ' +
    '변경으로 확대하는 개혁안을 추진했으나 재무장관 비테와의 대립 속에 좌절됐고, 1899년 ' +
    '11월 해임되어 국가평의회 의원으로 물러났다. ' +
    '\n\n' +
    '대신회의 의장 1차(1906). 비테 내각 총사퇴 직후인 1906-05-05(구력 04-22), 제1대 국가' +
    '두마 개원 직전에 의장으로 임명되었다. 내각책임제와 토지 강제수용을 요구하는 두마에 ' +
    '정면으로 적대했고, 1906-07-21(구력 07-08) 제1대 두마 해산 칙령과 같은 날 해임 — ' +
    '내무장관 스톨리핀이 곧바로 승계했다. 재임 약 2개월 반. ' +
    '\n\n' +
    '대신회의 의장 2차(1914~1916). 코콥초프 해임 후 1914-02-12(구력 01-30) 74세로 재기용 ' +
    '되었다. 본인부터가 코콥초프에게 «나는 오래전 궤짝에 넣어 장뇌를 뿌려둔 낡은 너구리 ' +
    '모피 외투 같다 — 꺼냈듯 또 갑자기 도로 넣힐 것»이라 자평한 인사였다(후대에 «나프탈린' +
    '에서 꺼내졌다»로 통용되는 인용의 원형). 개전 후 두마·진보블록에 적대했고, 라스푸틴 ' +
    '중심 궁정 그룹의 뜻을 수행한다는 평을 들었다. ' +
    '\n\n' +
    '1915년 각료 서한 사태. 니콜라이 2세가 대공을 해임하고 몸소 총사령관에 나서려 하자 ' +
    '각료 8명이 1915-09-03(구력 08-21) 연명 서한으로 재고를 간청했으나, 고레미킨은 서명을 ' +
    '거부하고 «황제의 명령은 법»이라며 홀로 황제 편에 섰다. 황제는 그를 유임시키고 서명 ' +
    '각료들을 순차 해임했다. 그러나 두마와의 관계가 완전히 파탄나며 1916-02-02(구력 ' +
    '01-20) 해임 — 시튜르머가 승계했다. ' +
    '\n\n' +
    '최후(1916~1917). 1916년 1등 실제추밀고문관에 서임되었다 — 제국 역사상 이 관등을 받은 ' +
    '13번째이자 마지막 인물. 혁명 후 소치 근교 다차로 물러났다가 1917년 12월 강도단의 ' +
    '습격으로 가족과 함께 살해되었다. ' +
    '\n\n' +
    '평가. 유능한 법제 실무가였으나 의회정치의 시대에 전제정 관료의 논리만으로 정부를 ' +
    '이끈 인물로, 그의 두 차례 의장 재임은 위기 국면마다 «충성스러운 종복»을 택한 니콜라이 ' +
    '2세 인사의 상징으로 꼽힌다.',
}

// ── 내무장관 재임 ────────────────────────────────────────────────────────────
const INTERIOR_TENURE = {
  title: '내무장관',
  startYear: 1895, startMonth: 10, startDay: 27,
  endYear: 1899, endMonth: 11, endDay: 1,
  endReason: TenureEndReason.REMOVAL,
  endReasonDetail:
    '젬스트보 확대 개혁안이 재무장관 비테와의 대립 속에 좌절되며 해임 (구력 1899-10-20) — ' +
    '국가평의회 의원으로 전보.',
  notes:
    '구력 1895-10-15 취임(같은 해 4월부터 내무차관). 젬스트보(지방자치) 제도의 서부 변경 ' +
    '확대를 추진한 것이 재임 중 대표 정책.',
}

// ── 대신회의 의장(총리) 재임 2건 ─────────────────────────────────────────────
interface PmTenureSpec {
  termNumber: number
  subTermNumber: number
  startYear: number; startMonth: number; startDay: number
  endYear: number; endMonth: number; endDay: number
  endReasonDetail: string
  notes: string
  cabinetName: string
}

const PM_TENURES: PmTenureSpec[] = [
  {
    termNumber: 2,
    subTermNumber: 1,
    startYear: 1906, startMonth: 5, startDay: 5,
    endYear: 1906, endMonth: 7, endDay: 21,
    endReasonDetail:
      '제1대 국가두마 해산 칙령과 같은 날 해임 (구력 1906-07-08) — 내무장관 스톨리핀이 승계.',
    notes:
      '구력 1906-04-22 임명, 비테 후임 — 제1대 두마 개원(구력 04-27) 직전. 내각책임제·토지 ' +
      '강제수용을 요구하는 두마에 정면 적대한 약 2개월 반의 재임. 러시아 제국 대신회의 ' +
      '의장(Председатель Совета министров) 제2대.',
    cabinetName: '고레미킨 1차 내각 (1906)',
  },
  {
    termNumber: 5,
    subTermNumber: 2,
    startYear: 1914, startMonth: 2, startDay: 12,
    endYear: 1916, endMonth: 2, endDay: 2,
    endReasonDetail:
      '1915년 각료 연명서한 사태에서 홀로 황제 편에 서 유임됐으나 두마·진보블록과의 관계 ' +
      '파탄으로 해임 (구력 1916-01-20) — 시튜르머가 승계.',
    notes:
      '구력 1914-01-30 임명(일부 자료 01-31), 코콥초프 후임 — 74세의 재기용으로, 본인이 ' +
      '«궤짝에 장뇌를 뿌려 넣어둔 낡은 너구리 모피 외투»라 자평한 인사(후대 통용 «나프탈린 ' +
      '에서 꺼내졌다»의 원형). 제1차 세계대전 개전기 정부 수반으로 두마에 적대했고 라스푸틴 ' +
      '궁정 그룹의 뜻을 수행한다는 평을 들었다. 1915-09-03(구력 08-21) 니콜라이 2세 친정 ' +
      '반대 각료 8인 연명서한에 서명을 거부, «황제의 명령은 법»이라며 황제를 지지 — 서명 ' +
      '각료들은 순차 해임되고 본인은 유임. 대신회의 의장 제5대.',
    cabinetName: '고레미킨 2차 내각 (1914~1916)',
  },
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
    title: '노브고로드 출생',
    category: 'FAMILY',
    startYear: 1839, startMonth: 11, startDay: 8,
    description: '황실령(우델) 관리소 지배인의 아들로 출생 (구력 10-27).',
  },
  {
    title: '제국법률학교 졸업',
    category: 'EDUCATION',
    startYear: 1860, startMonth: 5, startDay: 28,
    description: '제21기 졸업 (구력 05-16) — 원로원 제1부에서 관직 시작.',
  },
  {
    title: '폴란드 왕국 농민사무 위원',
    category: 'CAREER',
    startYear: 1864, endYear: 1873,
    description:
      '농노해방 후속 농민사무를 10년 가까이 담당 — 플로츠크 부지사(1866)·켈체 부지사(1869) ' +
      '역임. 농민·토지 법제 전문성의 기반.',
  },
  {
    title: '원로원 제2부 검사장',
    category: 'CAREER',
    startYear: 1884, endYear: 1891,
    description: '농민 담당 제2부의 검사장(обер-прокурор) — 1882년 제1부 검사장보를 거침.',
  },
  {
    title: '법무차관',
    category: 'CAREER',
    startYear: 1891, startMonth: 11,
    endYear: 1894,
    description: '1891-11 임명 (구력) ~ 1894 세나토르 전보.',
  },
  {
    title: '세나토르(원로원 의원) 임명',
    category: 'CAREER',
    startYear: 1894,
    description: '월일은 사료 미확인.',
  },
  {
    title: '내무차관',
    category: 'CAREER',
    startYear: 1895, startMonth: 4, startDay: 14,
    description: '구력 04-02 임명 — 같은 해 10월 장관으로 승진.',
  },
  {
    title: '내무장관 취임',
    category: 'POLITICAL',
    startYear: 1895, startMonth: 10, startDay: 27,
    description: '구력 10-15. 젬스트보 확대 개혁안을 추진.',
  },
  {
    title: '내무장관 해임·국가평의회 의원',
    category: 'POLITICAL',
    startYear: 1899, startMonth: 11, startDay: 1,
    description:
      '젬스트보 개혁안이 비테와의 대립 속에 좌절되며 해임 (구력 10-20) — 국가평의회 의원' +
      '으로 물러나 1917년까지 유지.',
  },
  {
    title: '대신회의 의장 1차 취임',
    category: 'POLITICAL',
    startYear: 1906, startMonth: 5, startDay: 5,
    description: '비테 후임, 제2대 (구력 04-22) — 제1대 국가두마 개원 직전의 임명.',
  },
  {
    title: '1차 해임 — 제1대 두마 해산',
    category: 'POLITICAL',
    startYear: 1906, startMonth: 7, startDay: 21,
    description: '두마 해산 칙령과 같은 날 해임 (구력 07-08) — 스톨리핀 승계. 재임 약 2개월 반.',
  },
  {
    title: '국가서기 명예칭호',
    category: 'AWARD',
    startYear: 1910,
    description: '황제 폐하의 국가서기(статс-секретарь) — 궁정 신임의 표지.',
  },
  {
    title: '대신회의 의장 2차 취임',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 2, startDay: 12,
    description:
      '코콥초프 후임, 제5대 (구력 01-30) — 74세의 재기용. «궤짝에 장뇌를 뿌려 넣어둔 낡은 ' +
      '너구리 모피 외투» 자평(후대 «나프탈린» 인용의 원형).',
  },
  {
    title: '각료 연명서한 사태 — 홀로 황제 편에',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 9, startDay: 3,
    description:
      '니콜라이 2세 친정에 반대하는 각료 8인 연명서한(구력 08-21)에 서명 거부 — «황제의 ' +
      '명령은 법». 서명 각료 순차 해임, 본인 유임.',
  },
  {
    title: '2차 해임 — 시튜르머 승계',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 2, startDay: 2,
    description: '두마·진보블록과의 관계 파탄으로 해임 (구력 01-20).',
  },
  {
    title: '1등 실제추밀고문관 서임',
    category: 'AWARD',
    startYear: 1916,
    description:
      '문관 관등의 정점 — 러시아 제국 역사상 이 관등을 받은 13번째이자 마지막 인물 ' +
      '(2등 실제추밀고문관은 1896년).',
  },
  {
    title: '소치 다차에서 피살',
    category: 'PERSONAL',
    startYear: 1917, startMonth: 12, startDay: 24,
    description:
      '강도단 습격으로 부인·딸·사위와 함께 살해 (향년 78세, 이설 신력 12-21). 경위는 끝내 ' +
      '미규명. 소치 자보크잘노예 묘지 가족 납골묘 매장 — 묘지 현존 안 함.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const GOREMYKIN_STATS = {
  politics: 62,
  military: 15,
  diplomacy: 40,
  intellect: 60,
  charisma: 30,
  administration: 70,
  notes:
    '농민·토지 법제로 잔뼈가 굵은 유능한 법제 실무가(행정) — 당대의 평 «제곱된 관료»가 ' +
    '강점과 한계를 동시에 요약한다. 정치는 궁정형 — 차르의 절대 신임을 얻어 위기마다 ' +
    '재기용되는 생존력은 탁월했으나, 두마를 상대하는 의회정치 역량은 사실상 0에 가까워 ' +
    '두 차례 재임 모두 대결로 끝났다. 군사·외교는 경력 자체가 없고, 고령의 수동적 처신 ' +
    '탓에 카리스마도 최저 수준. 학식은 법률학교 수석급 출신의 법제 전문성에 한정.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedGoremykin(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️ 이반 고레미킨(Ivan Goremykin) 시딩 시작 (기존 데이터 보존 모드)...')

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

  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })
  const interiorDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '내무장관' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Ivan Logginovich Goremykin' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = GOREMYKIN.biography
    if (!person.birthPlaceText) patch.birthPlaceText = GOREMYKIN.birthPlaceText
    if (!person.birthNote) patch.birthNote = GOREMYKIN.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = GOREMYKIN.deathPlaceText
    if (!person.deathType) patch.deathType = GOREMYKIN.deathType
    if (!person.deathCause) patch.deathCause = GOREMYKIN.deathCause
    if (!person.deathNote) patch.deathNote = GOREMYKIN.deathNote
    if (person.influence == null) patch.influence = GOREMYKIN.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${GOREMYKIN.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${GOREMYKIN.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: GOREMYKIN.name,
        middleName: GOREMYKIN.middleName,
        surname: GOREMYKIN.surname,
        originalName: GOREMYKIN.originalName,
        biography: GOREMYKIN.biography,
        birthDate: toDate(GOREMYKIN.birthYear, GOREMYKIN.birthMonth, GOREMYKIN.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: GOREMYKIN.birthNote,
        deathDate: toDate(GOREMYKIN.deathYear, GOREMYKIN.deathMonth, GOREMYKIN.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: GOREMYKIN.deathType,
        deathCause: GOREMYKIN.deathCause,
        deathNote: GOREMYKIN.deathNote,
        gender: GOREMYKIN.gender,
        nameDisplayOrder: 'western' as any,
        influence: GOREMYKIN.influence,
        birthPlaceText: GOREMYKIN.birthPlaceText,
        deathPlaceText: GOREMYKIN.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${GOREMYKIN.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 내무장관 재임 (CABINET_MINISTER — 내각 동반 없음) ───────────────────
  {
    const t = INTERIOR_TENURE
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
          positionDefinitionId: interiorDef?.id ?? undefined,
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

  // ── 3) 대신회의 의장(총리) 재임 2건 + 내각 2건 ─────────────────────────────
  for (const t of PM_TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    // 같은 인물·국가·타입 재임이 2건이므로 startDate로 식별 (카보우르 선례)
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        startDate,
      },
    })
    if (existing) {
      tenureId = existing.id
      console.log(`  ⏭️  재임 스킵 (이미 존재): 대신회의 의장 ${t.subTermNumber}차 (${t.startYear})`)
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: russianEmpire.id,
          positionDefinitionId: pmDef?.id ?? undefined,
          positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
          title: '총리',
          termNumber: t.termNumber,
          subTermNumber: t.subTermNumber,
          startDate,
          endDate: toDate(t.endYear, t.endMonth, t.endDay),
          appointmentMethod: AppointmentMethod.APPOINTMENT,
          endReason: TenureEndReason.REMOVAL,
          endReasonDetail: t.endReasonDetail,
          notes: t.notes,
          accountId: admin.id,
        },
      })
      tenureId = created.id
      console.log(
        `  ✅ 재임: 대신회의 의장 ${t.subTermNumber}차 · 제${t.termNumber}대 ` +
          `(${t.startYear}-${String(t.startMonth).padStart(2, '0')} ~ ` +
          `${t.endYear}-${String(t.endMonth).padStart(2, '0')})`,
      )
    }

    // 행정부(Cabinet) — 총리 임기 1건당 내각 1건 (행정부 뷰 노출용)
    const cab = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
    if (cab) {
      console.log(`  ⏭️  내각 스킵 (이미 존재): ${cab.name ?? t.cabinetName}`)
    } else {
      await prisma.cabinet.create({
        data: { headTenureId: tenureId, name: t.cabinetName, accountId: admin.id },
      })
      console.log(`  🏛️  내각: ${t.cabinetName}`)
    }
  }

  // ── 4) 국가 소속 ───────────────────────────────────────────────────────────
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
    console.log('  ✅ 소속국가: 러시아 제국 (출생·복무 1839~1917)')
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
        politics: GOREMYKIN_STATS.politics,
        military: GOREMYKIN_STATS.military,
        diplomacy: GOREMYKIN_STATS.diplomacy,
        intellect: GOREMYKIN_STATS.intellect,
        charisma: GOREMYKIN_STATS.charisma,
        administration: GOREMYKIN_STATS.administration,
        notes: GOREMYKIN_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${GOREMYKIN_STATS.politics}·군사 ${GOREMYKIN_STATS.military}·` +
        `외교 ${GOREMYKIN_STATS.diplomacy}·학식 ${GOREMYKIN_STATS.intellect}·` +
        `카리스마 ${GOREMYKIN_STATS.charisma}·행정 ${GOREMYKIN_STATS.administration}`,
    )
  }

  console.log('✅ 이반 고레미킨 시딩 완료\n')
}
