/**
 * 표트르 리보비치 바르크 (Pyotr Lvovich Bark, 1869~1937) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 마지막 재무장관(1914~1917). 국립은행·민간은행을 거친 은행가 출신
 * 테크노크라트로, «국고를 보드카 판매 위에 세울 수 없다»는 어전 보고로 니콜라이 2세의
 * 눈에 들어 코콥초프 해임 직후 재무부를 맡았다. 전시 금주령으로 국가세입의 1/4에
 * 달하던 주세를 끊는 «금주 재정»과 금태환 정지·전쟁공채·연합국 차관·러시아 최초의
 * 소득세법(1916)으로 이어지는 전시 재정을 총괄했다. 2월혁명으로 재임이 끝나고 잠시
 * 구금됐다가 크림을 거쳐 영국으로 망명, 잉글랜드은행 총재 몬터규 노먼의 고문이자
 * 앵글로-인터내셔널 은행 경영이사로 활동했고 망명 로마노프 가족의 재산을 관리했다.
 * 1935년 영국 귀화·조지 5세의 사적 기사 서임으로 «서 피터 바크(Sir Peter Bark)»가
 * 되었으며, 1937년 프랑스 오바뉴에서 사망해 니스의 러시아인 묘지에 묻혔다.
 *
 * 날짜 규약: 러시아 관보 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes에 병기.
 * 재무장관 재임은 관리서리(구력 1914-01-30)~정식 확정(구력 05-06)을 한 건으로 합쳐
 * 관리서리 임명일을 시작일로 삼고 단계는 notes에 기록. 러시아어 출처들의 «1935 남작
 * (баронет) 서임»은 기사작위(knighthood)의 오역으로 판정되어 채택하지 않음.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('재무장관' 관직 정의).
 *       망명지 '그레이트브리튼 및 북아일랜드 연합왕국' HC는 있으면 연결, 없으면 생략.
 *
 * 등록 항목:
 *  - Person x1 (바르크 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x1 (재무장관 1914~1917, CABINET_MINISTER — 혁명으로 종료)
 *  - PersonCountryAffiliation x2 (러시아 제국 CITIZENSHIP / 연합왕국 EXILE)
 *  - PersonNickname x1 (서 피터 바크 — 영국 귀화 후 통칭)
 *  - PersonLifeEvent x17 (연보)
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
const BARK = {
  name: '표트르',
  middleName: '리보비치',
  surname: '바르크',
  originalName: 'Pyotr Lvovich Bark (Пётр Львович Барк)',
  gender: 'MALE' as const,
  birthYear: 1869, birthMonth: 4, birthDay: 18,
  birthNote:
    '구력(율리우스력) 1869-04-06 출생 — 신력 환산 04-18. 발트독일계 가문으로 부친 카를 ' +
    '루트비히 바르크는 정교회로 개종했다. 대다수 사료는 출생지를 예카테리노슬라프 현 ' +
    '알렉산드롭스크 군의 노보트로이츠코예 마을로 적고, 일부(대통령도서관)는 ' +
    '예카테리노슬라프 시로 표기한다.',
  birthPlaceText: '러시아 제국 예카테리노슬라프 현 노보트로이츠코예 (현 우크라이나)',
  deathYear: 1937, deathMonth: 1, deathDay: 16,
  deathPlaceText: '프랑스 오바뉴(Aubagne) — 마르세유 근교',
  deathType: DeathType.UNKNOWN,
  deathCause: '사인 미기록 (향년 67세)',
  deathNote:
    '1937-01-16 프랑스 마르세유 근교 오바뉴에서 사망했다. 사인은 조사된 사료에 기록이 ' +
    '없다(당시 부고는 «앵글로-인터내셔널 은행 이사 사망»만 전함). 니스 코카드(Caucade) ' +
    '러시아인 묘지에 매장.',
  influence: 54,
  biography:
    '러시아 제국의 마지막 재무장관(1914~1917). 국립은행과 민간은행을 두루 거친 은행가 ' +
    '출신 테크노크라트로, 전시 금주(禁酒) 재정과 전쟁 재정을 총괄했다. 망명 후에는 ' +
    '잉글랜드은행의 고문이자 런던의 은행 경영자로 변신해 «서 피터 바크(Sir Peter Bark)»로 ' +
    '불렸다 — 제정 러시아의 각료가 영국 금융계의 기사(knight)로 생을 마친 이례적 이력이다. ' +
    '\n\n' +
    '성장과 교육(1869~1891). 예카테리노슬라프 현 노보트로이츠코예의 발트독일계 가문에서 ' +
    '태어나 페테르부르크의 독일계 학교를 거쳐 상트페테르부르크 대학 법학부를 1891년(일부 ' +
    '사료 1892) 졸업했다. ' +
    '\n\n' +
    '은행가의 길(1892~1911). 재무부 신용사무국에서 출발해 1894년 국립은행으로 옮겨 총재 ' +
    '비서·해외거래부장·페테르부르크 사무소장을 거쳐 1906년 부총재에 올랐다. 그 사이 ' +
    '베를린의 멘델스존 상사에서 은행 실무를 연수했고(1903), 페르시아 할인대부은행 이사회 ' +
    '의장과 러청은행 이사를 겸했다. 1907년 관직을 사임하고 볼가-카마 상업은행의 ' +
    '이사-지배인으로 옮겨 민간 금융 경영을 익혔다. ' +
    '\n\n' +
    '통상산업차관(1911~1914). 1911년 8월(구력) 스톨리핀의 발탁으로 통상산업차관이 되어 ' +
    '관계(官界)로 복귀했다. ' +
    '\n\n' +
    '재무장관 발탁(1914). 1914-01-26(구력) 어전 보고에서 «국고의 안녕을 보드카 판매 위에 ' +
    '세울 수 없다 — 소득세를 도입해야 한다»는 프로그램을 제시했고, 이것이 니콜라이 2세의 ' +
    '금주 취지 칙서와 함께 임명의 배경이 되었다. 코콥초프 해임 직후인 구력 01-30 재무부 ' +
    '관리서리로 임명되어 구력 05-06 정식 장관으로 확정 — 제국의 마지막 재무장관이다. ' +
    '\n\n' +
    '전시 재정(1914~1917). 개전 후 구력 1914-09-16 법으로 전쟁 기간 보드카 판매를 중단해 ' +
    '국가세입의 약 1/4에 달하던 주세를 끊었고(«금주 예산»), 그 공백을 증세와 차입으로 ' +
    '메웠다. 신용권의 금태환을 정지하고 국내 전쟁공채를 연속 발행했으며, 영국 재무부와의 ' +
    '차관 교섭과 연합국 재정회의를 오가며 금 이송을 담보로 한 신용공여를 조율했다. ' +
    '1916년 4월(구력)에는 러시아 최초의 소득세법을 제정했으나 징수 개시 전에 혁명이 왔다. ' +
    '1916-01-11(구력 1915-12-29) 국가평의회 의원을 겸했다. ' +
    '\n\n' +
    '혁명과 망명(1917~1920). 2월혁명으로 구력 1917-02-28 재임이 끝났고, 혁명 중 수일간 ' +
    '구금됐다가 석방되었다(자기 하인이 체포했다는 일화가 전한다). 가족과 크림으로 옮겨 ' +
    '적색테러기를 케르치에서 보낸 뒤 1920년(영국 측 서사는 1919년 황태후 일행의 HMS ' +
    '말버러 철수와 함께 구출을 시사) 영국으로 망명했다. ' +
    '\n\n' +
    '영국의 은행가(1920~1937). 런던에서 잉글랜드은행 총재 몬터규 노먼의 고문(동·중유럽 ' +
    '담당)이 되었고, 1926년 잉글랜드은행이 세운 앵글로-인터내셔널 은행의 경영이사로 사망 ' +
    '시까지 재임했다. 망명 로마노프 가족의 재산·금융 사무를 관리해 마리야 표도로브나 ' +
    '황태후의 재정 고문으로 활동했고, 1928년 황태후 사후 보석류 처분과 관련한 국왕의 기밀 ' +
    '임무를 수행했다. 1935년 영국에 귀화했고 조지 5세가 버킹엄궁에서 사적으로 기사 서임 ' +
    '— 본인 표현으로 «나의 기사작위는 국왕의 개인적 명령으로 수여된 것»이다. ' +
    '\n\n' +
    '평가. 제정 최후의 유능한 재정 테크노크라트로, 금주 재정의 도덕적 이상과 전시 인플레 ' +
    '·차입 의존의 현실 사이에서 제국 재정의 마지막 3년을 지탱했다. 망명 후의 이력은 혁명 ' +
    '이후 러시아 금융 엘리트의 국제적 재기 사례로 자주 인용된다.',
}

// ── 재무장관 재임 (관리서리~정식 장관을 한 건으로) ───────────────────────────
const FINANCE_TENURE = {
  title: '재무장관',
  startYear: 1914, startMonth: 2, startDay: 12,
  endYear: 1917, endMonth: 3, endDay: 13,
  endReason: TenureEndReason.OVERTHROWN,
  endReasonDetail:
    '2월혁명으로 제정 정부와 함께 재임 종료 (구력 1917-02-28) — 혁명 중 수일간 구금 후 ' +
    '석방, 이후 크림을 거쳐 영국 망명.',
  notes:
    '코콥초프 해임 직후 구력 1914-01-30(신력 02-12) 재무부 관리서리(управляющий)로 임명 ' +
    '— 니콜라이 2세의 금주 취지 칙서 동반 — 구력 1914-05-06(신력 05-19) 정식 장관 확정. ' +
    '러시아 제국의 마지막 재무장관. 전시 금주령(주세 = 세입 1/4 중단)·금태환 정지·전쟁공채 ' +
    '·영국 차관 교섭·러시아 최초 소득세법(1916) 제정의 전시 재정을 총괄했다. ' +
    '1916-01-11(구력 1915-12-29)부터 국가평의회 의원 겸임.',
}

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '서 피터 바크 (Sir Peter Bark)', type: 'OTHER', priority: 1 },
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
    title: '노보트로이츠코예 출생',
    category: 'FAMILY',
    startYear: 1869, startMonth: 4, startDay: 18,
    description:
      '예카테리노슬라프 현 알렉산드롭스크 군의 발트독일계 가문에서 출생 (구력 04-06). ' +
      '부친은 정교회로 개종.',
  },
  {
    title: '페테르부르크 대학 법학부 졸업',
    category: 'EDUCATION',
    startYear: 1891,
    description:
      '페테르부르크의 독일계 학교(1887)를 거쳐 법학부 졸업 — 대학 동문DB 기준 1891, ' +
      '일부 사료는 1892.',
  },
  {
    title: '재무부 신용사무국 입직',
    category: 'CAREER',
    startYear: 1892,
    description: '재무부 신용사무국(Особенная канцелярия по кредитной части)에서 관료 경력 시작.',
  },
  {
    title: '국립은행 경력',
    category: 'CAREER',
    startYear: 1894, endYear: 1906,
    description:
      '총재 비서(1895~1897)·페테르부르크 사무소 해외거래부장(1897~1905)·사무소장(1905~1906)을 ' +
      '거쳐 1906년 부총재. 베를린 멘델스존 상사 연수(1903), 페르시아 할인대부은행 이사회 ' +
      '의장·러청은행 이사 겸임.',
  },
  {
    title: '볼가-카마 상업은행 이사-지배인',
    category: 'CAREER',
    startYear: 1907, endYear: 1911,
    description: '관직을 사임하고 민간 상업은행 경영자로 — 러시아 유수의 민간은행 실무 경험.',
  },
  {
    title: '통상산업차관',
    category: 'CAREER',
    startYear: 1911, startMonth: 8,
    endYear: 1914, endMonth: 2,
    description: '스톨리핀의 발탁으로 관계 복귀 (구력 1911-08 임명) — 4등문관 승서.',
  },
  {
    title: '재무부 관리서리 임명',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 2, startDay: 12,
    description:
      '코콥초프 해임 직후 (구력 01-30), 니콜라이 2세의 금주 취지 칙서 동반. 나흘 전 어전 ' +
      '보고의 «국고의 안녕을 보드카 판매 위에 세울 수 없다»가 임명의 배경.',
  },
  {
    title: '재무장관 정식 확정',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 5, startDay: 19,
    description: '구력 05-06 — 러시아 제국의 마지막 재무장관.',
  },
  {
    title: '전시 금주령 — 주류전매 세입 중단',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 9, startDay: 29,
    description:
      '전쟁 기간 보드카 판매 중단 입법 (구력 09-16) — 국가세입의 약 1/4에 달하던 주세를 ' +
      '끊는 «금주 예산».',
  },
  {
    title: '전시재정 총괄 — 금태환 정지·전쟁공채·연합국 차관',
    category: 'POLITICAL',
    startYear: 1914, endYear: 1917,
    description:
      '신용권 금태환 정지(1914 여름)·국내 전쟁공채 연속 발행·영국 재무부 차관 교섭과 ' +
      '연합국 재정회의 — 금 이송을 담보로 한 신용공여 조율.',
  },
  {
    title: '국가평의회 의원 임명',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 1, startDay: 11,
    description: '구력 1915-12-29 — 장관직 겸임 유지, 1917년 혁명으로 기관 소멸.',
  },
  {
    title: '러시아 최초 소득세법 제정',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 4, startDay: 19,
    description: '구력 04-06 제정 — 징수는 1917년 개시 예정이었으나 혁명으로 사실상 미시행.',
  },
  {
    title: '2월혁명 — 재임 종료·구금',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 3, startDay: 13,
    description:
      '구력 02-28 재임 종료. 혁명 중 03-14~03-18(신력) 구금 후 석방 — 자기 하인이 ' +
      '체포했다는 일화가 전한다. 이후 가족과 크림 케르치로.',
  },
  {
    title: '영국 망명',
    category: 'EXILE',
    startYear: 1920,
    description:
      '적색테러기 크림을 떠나 런던 정착 — 러시아어 사료는 1920년, 영국 측 서사는 1919-04 ' +
      '황태후 일행의 HMS 말버러 철수와 함께 구출을 시사(이설).',
  },
  {
    title: '앵글로-인터내셔널 은행 경영이사',
    category: 'CAREER',
    startYear: 1926, endYear: 1937,
    description:
      '잉글랜드은행이 세운 은행의 초대 경영이사로 사망 시까지 재임. 총재 몬터규 노먼의 ' +
      '고문(동·중유럽 담당)이자 망명 로마노프 가족의 재산 관리인 — 마리야 표도로브나 ' +
      '황태후의 재정 고문.',
  },
  {
    title: '영국 귀화·기사 서임',
    category: 'AWARD',
    startYear: 1935,
    description:
      '조지 5세가 버킹엄궁에서 사적으로 서임 — «나의 기사작위는 국왕의 개인적 명령으로 ' +
      '수여된 것»(본인). 로열 빅토리아 훈장 기사(KCVO)로 추정되나 등급 미확정. 이후 ' +
      '«서 피터 바크»로 불림.',
  },
  {
    title: '오바뉴에서 사망',
    category: 'PERSONAL',
    startYear: 1937, startMonth: 1, startDay: 16,
    description:
      '마르세유 근교 오바뉴에서 향년 67세로 사망 — 사인 미기록. 니스 코카드 러시아인 묘지 매장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BARK_STATS = {
  politics: 45,
  military: 10,
  diplomacy: 62,
  intellect: 78,
  charisma: 45,
  administration: 84,
  notes:
    '국립은행 부총재·민간은행 경영자·재무장관·런던 은행 경영이사로 이어진 당대 최고 수준의 ' +
    '금융 행정가(행정). 전시 재정의 설계 — 금주 예산의 세입 공백 보전, 금태환 정지, 공채, ' +
    '소득세 도입 — 는 학식과 실무의 결합. 영국 차관 교섭·연합국 재정회의와 망명 후 ' +
    '잉글랜드은행 고문 활동은 금융 외교 역량(외교)의 증거. 반면 궁정·두마 정치와는 거리를 ' +
    '둔 기술관료였고(정치 중하), 군사는 무관. 혁명 후 영국 금융계에서 재기해 기사 작위까지 ' +
    '받은 적응력이 이채롭다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBark(prisma: PrismaService): Promise<void> {
  console.log('\n💰 표트르 바르크(Pyotr Bark) 시딩 시작 (기존 데이터 보존 모드)...')

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
  // 망명지 — 없으면 연결만 건너뛴다. 귀화·기사 서임(1935)이 1922년 이후라 북아일랜드 연합왕국.
  const unitedKingdom = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 및 북아일랜드 연합왕국' },
    select: { id: true },
  })

  const financeDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '재무장관' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Pyotr Lvovich Bark' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = BARK.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BARK.birthPlaceText
    if (!person.birthNote) patch.birthNote = BARK.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BARK.deathPlaceText
    if (!person.deathType) patch.deathType = BARK.deathType
    if (!person.deathCause) patch.deathCause = BARK.deathCause
    if (!person.deathNote) patch.deathNote = BARK.deathNote
    if (person.influence == null) patch.influence = BARK.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BARK.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BARK.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BARK.name,
        middleName: BARK.middleName,
        surname: BARK.surname,
        originalName: BARK.originalName,
        biography: BARK.biography,
        birthDate: toDate(BARK.birthYear, BARK.birthMonth, BARK.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BARK.birthNote,
        deathDate: toDate(BARK.deathYear, BARK.deathMonth, BARK.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BARK.deathType,
        deathCause: BARK.deathCause,
        deathNote: BARK.deathNote,
        gender: BARK.gender,
        nameDisplayOrder: 'western' as any,
        influence: BARK.influence,
        birthPlaceText: BARK.birthPlaceText,
        deathPlaceText: BARK.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BARK.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재무장관 재임 (CABINET_MINISTER — 내각 동반 없음) ───────────────────
  {
    const t = FINANCE_TENURE
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
          positionDefinitionId: financeDef?.id ?? undefined,
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
      console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear}, 혁명으로 종료)`)
    }
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
      label: '러시아 제국 (출생·복무 1869~1917)',
      priority: 0,
    },
  ]
  if (unitedKingdom) {
    affiliations.push({
      historicalCountryId: unitedKingdom.id,
      type: 'EXILE',
      label: '그레이트브리튼 및 북아일랜드 연합왕국 (1920 망명 — 1935 귀화·기사 서임)',
      priority: 1,
      note:
        '1920년(이설 1919) 크림을 떠나 런던 정착. 잉글랜드은행 고문·앵글로-인터내셔널 은행 ' +
        '경영이사. 1935년 귀화와 함께 조지 5세의 사적 기사 서임 — «서 피터 바크».',
    })
  } else {
    console.warn('  ⚠️  연합왕국 HC 미존재 — 망명지(EXILE) 소속 연결을 건너뛴다.')
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
        politics: BARK_STATS.politics,
        military: BARK_STATS.military,
        diplomacy: BARK_STATS.diplomacy,
        intellect: BARK_STATS.intellect,
        charisma: BARK_STATS.charisma,
        administration: BARK_STATS.administration,
        notes: BARK_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BARK_STATS.politics}·군사 ${BARK_STATS.military}·` +
        `외교 ${BARK_STATS.diplomacy}·학식 ${BARK_STATS.intellect}·` +
        `카리스마 ${BARK_STATS.charisma}·행정 ${BARK_STATS.administration}`,
    )
  }

  console.log('✅ 표트르 바르크 시딩 완료\n')
}
