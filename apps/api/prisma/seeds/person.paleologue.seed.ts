/**
 * 모리스 팔레올로그 (Maurice Paléologue, 1859~1944) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 프랑스 제3공화국의 외교관·문필가. 제1차 세계대전 개전기 주러시아 프랑스 대사
 * (1914~1917)로, 1914년 7월 위기에서 러시아에 프랑스의 무조건 지지를 확약하고 러시아
 * 총동원의 진행을 파리에 신속히 알리지 않아 개전 책임 논쟁의 중심에 선 인물이다.
 * 페트로그라드에서 니콜라이 2세 궁정과 라스푸틴 주변을 관찰하고 2월혁명을 목격했으며,
 * 그 기록인 «차르들의 러시아» 3부작은 가공·윤색 논쟁에도 불구하고 널리 인용되는
 * 사료다. 루마니아 망명자의 아들로 비잔티움 팔레올로고스 황가 후손을 자처했으나
 * 학계는 참칭으로 본다. 1928년 아카데미 프랑세즈 회원(제19번 의석)으로 선출되었다.
 *
 * 날짜 규약: 프랑스 사료라 전부 그레고리력 — 러시아 시리즈와 달리 구력(OS) 환산 없음.
 * 사망일은 출처 3갈래(11-18 아카데미·BnF / 11-21 파시 묘지 / 11-23 en.wiki) —
 * 프랑스 전거가 수렴하는 1944-11-18 채택, 이설은 deathNote 병기. 별명 없음.
 *
 * 의존: seedFranceHistoricalCountries('프랑스 제3공화국' HC) +
 *       관직 정의('대사'·'특명전권공사' — DIPLOMATIC_POST 카탈로그).
 *       주재지는 정의가 아니라 title 오버라이드로 표기하는 신설 규약을 따른다.
 *
 * 등록 항목:
 *  - Person x1 (팔레올로그 본인 — historicalCountryId=프랑스 제3공화국)
 *  - GovernmentPositionTenure x3:
 *      · 주불가리아 공사 1907~1912 (DIPLOMATIC_POST, 정의=특명전권공사)
 *      · 주러시아 대사 1914~1917 (DIPLOMATIC_POST, 정의=대사)
 *      · 외무부 사무총장 1920 (SPECIAL_POSITION)
 *  - PersonCountryAffiliation x1 (프랑스 제3공화국 CITIZENSHIP)
 *  - PersonLifeEvent x15 (연보)
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
const PALEOLOGUE = {
  name: '모리스',
  surname: '팔레올로그',
  originalName: 'Georges Maurice Paléologue',
  gender: 'MALE' as const,
  birthYear: 1859, birthMonth: 1, birthDay: 13,
  birthNote:
    '부친 알렉산드루 팔레올로구는 1848년 왈라키아 혁명기 비베스쿠 공 모반 연루로 추방돼 ' +
    '1851년 파리에 정착한 루마니아 망명자. 가문이 자처한 비잔티움 팔레올로고스 황가 ' +
    '후손설은 학계에서 의심받는다 — 계보학자 스투르자는 황가의 진정한 후손 계보는 ' +
    '단절됐다고 평가하며, 본인이 백과사전에 스스로를 비잔티움 후예로 소개하는 항목을 ' +
    '넣었다는 지적도 있다.',
  birthPlaceText: '프랑스 파리',
  deathYear: 1944, deathMonth: 11, deathDay: 18,
  deathPlaceText: '프랑스 파리 — 테헤란 가(rue de Téhéran) 자택',
  deathType: DeathType.UNKNOWN,
  deathCause: '사인 미기록 (향년 85세)',
  deathNote:
    '파리 해방(1944-08) 직후 자택에서 사망했다. 사망일은 출처가 세 갈래 — 아카데미 ' +
    '프랑세즈·BnF 전거는 11-18, 파시 묘지 공식 사이트는 11-21, 영어 위키백과는 11-23 — ' +
    '프랑스 측 전거가 수렴하는 11-18을 채택. 사인은 사료에 기록이 없다. 파리 16구 파시 ' +
    '묘지(10구역)에 매장.',
  influence: 54,
  biography:
    '프랑스 제3공화국의 외교관·문필가. 제1차 세계대전 개전기의 주러시아 프랑스 대사 ' +
    '(1914~1917)로, 7월 위기에서의 처신 때문에 개전 책임 사학 논쟁의 단골 인물이 되었다. ' +
    '동시에 페트로그라드 궁정의 가장 유명한 관찰자로, 그의 회고록 «차르들의 러시아» ' +
    '3부작은 지금도 널리 인용된다. ' +
    '\n\n' +
    '가문(참칭 논쟁). 1848년 왈라키아 혁명에 연루돼 추방된 루마니아 망명자 알렉산드루 ' +
    '팔레올로구의 아들로 파리에서 태어났다. 가문은 비잔티움 팔레올로고스 황가의 후손을 ' +
    '자처했으나 학계는 이 관련성을 의심한다 — 17세기 말부터 선조들이 주장했을 뿐이며, ' +
    '진정한 황가 계보는 단절됐다는 것이 계보학의 평가다. ' +
    '\n\n' +
    '외무부의 그림자 경력(1880~1906). 리세 앙리4세와 루이르그랑(레몽 푸앵카레와 동문)을 ' +
    '거쳐 법학 학사 후 1880년 외무부에 들어가 탕헤르·베이징·로마의 공관 서기관을 순회했다. ' +
    '1886년경부터 20년간 본부의 기밀 담당 «유보 사무(affaires réservées)» — 암호·정보 ' +
    '업무 — 에 몸담았고, 드레퓌스 사건에서는 외무부 측 비밀문서 관리자로서 1899년 렌 ' +
    '재심에 장관 대리로 파견돼 증언했다(사후 출간된 일기는 사건의 중요 증언 사료). ' +
    '\n\n' +
    '푸앵카레의 사람(1907~1914). 1901년 전권공사 서열에 오르고 1907~1912년 주불가리아 ' +
    '소피아 공사를 지냈다. 1912년 1월 총리 겸 외무장관에 갓 취임한 동문 푸앵카레가 그를 ' +
    '파리로 불러 외무부 정치·통상국장에 앉혔고, 1914년 1월 델카세의 후임으로 주러시아 ' +
    '대사에 임명했다 — 2월 16일 페테르부르크 부임. ' +
    '\n\n' +
    '1914년 7월 위기. 푸앵카레 대통령의 러시아 국빈방문(07-20~23)을 현지에서 수행한 직후 ' +
    '위기가 폭발하자, 사조노프 외무장관에게 프랑스의 무조건적 지지를 확약했다. 그가 본국 ' +
    '훈령을 넘었는지는 알베르티니 이래 사학계의 논쟁거리지만, 러시아 총동원(07-29)의 진행 ' +
    '상황과 그 함의를 파리에 신속·정확히 알리지 않았다는 데는 대체로 합의가 있다 — ' +
    '르누뱅은 보고 지연을 추궁했고, 본인은 «전보가 스칸디나비아 경유라 지연됐다»고 ' +
    '해명했으나 만년(1936/37)에는 «전쟁이 불가피하고 필요하다고 판단했다»고 사실상 ' +
    '시인했다. 독일 혐오와 프랑스-러시아 결속에 대한 신념이 행동의 배경으로 꼽힌다. ' +
    '\n\n' +
    '페트로그라드의 관찰자(1914~1917). 3년 4개월의 재임 동안 니콜라이 2세 궁정과 사교계에 ' +
    '깊이 밀착해 황후 알렉산드라와 라스푸틴 주변의 궁정 정치를 관찰·기록했고, 1917년 ' +
    '2월혁명을 현장에서 목격했다. 혁명 후 리보 정부는 그가 구체제와 지나치게 동일시된 ' +
    '인물이라 보고 5월 소환했다 — 일기의 마지막 기입은 1917-05-17이다. ' +
    '\n\n' +
    '전후(1920~1944). 1920년 밀랑 내각에서 외무부 사무총장(1~9월)을 지낸 뒤 물러나 ' +
    '저술에 전념했다. «차르들의 러시아» 3부작(1921~22)은 동시대 일기 형식이지만 사후 ' +
    '대폭 가공·윤색됐다는 것이 사학계 중론으로 — 차르와의 «예언적» 대화들은 회고적 ' +
    '창작으로 평가된다 — 그럼에도 궁정·사교계 묘사의 생생함 때문에 여전히 1차 사료로 ' +
    '인용된다. 1928년 아카데미 프랑세즈 제19번 의석에 선출되었고, 외제니 황후 대담록· ' +
    '알렉산드라 황후 전기·카보우르 연구 등 폭넓은 저술을 남겼다. ' +
    '\n\n' +
    '평가. 문필과 사교의 재능으로 외교의 정점에 올랐으나, 정작 결정적 국면에서는 신념이 ' +
    '보고 의무를 앞섰다는 혐의가 평생을 따라다녔다. 동시대인들은 그의 «지나친 상상력»을 ' +
    '꼬집었고, 그 상상력은 외교관으로서는 약점이었지만 기록자로서는 20세기 러시아 궁정의 ' +
    '가장 읽히는 초상을 남겼다.',
}

// ── 재임 (전부 프랑스 제3공화국) ─────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  /** 관직 정의 카탈로그 제목 — 없으면 자유입력(title만) */
  defTitle?: string
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '주불가리아 공사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    defTitle: '특명전권공사',
    startYear: 1907,
    endYear: 1912, endMonth: 1, endDay: 25,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '총리 겸 외무장관에 취임한 푸앵카레가 파리로 소환, 1912-01-25 외무부 정치·통상국장에 임명.',
    notes:
      '소피아 주재 공사관 수석(전권공사 서열은 1901년 취득). 통칭 1907~1912 — 시작 월은 ' +
      '사료 미확인(연 단위), 외교사료관 문서철의 1907~1909 표기와는 상충.',
  },
  {
    title: '주러시아 대사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    defTitle: '대사',
    startYear: 1914, startMonth: 1,
    endYear: 1917, endMonth: 5, endDay: 17,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '2월혁명 후 리보 정부가 차르 체제와 지나치게 동일시된 인물로 판단해 1917-05 소환 — ' +
      '이임일은 일기 마지막 기입(05-17) 기준, 공식 소환·출국 일자는 사료 미확인. 후임 눌랑스.',
    notes:
      '1914-01 델카세 후임으로 임명(월 단위 — 부임은 02-16 페테르부르크 도착). 7월 위기에서 ' +
      '사조노프에게 프랑스의 무조건 지지를 확약하고 러시아 총동원(07-29) 진행을 파리에 ' +
      '신속히 보고하지 않아 개전 책임 논쟁의 중심에 섰다(훈령 초과 여부는 알베르티니 이래 ' +
      '논쟁, 보고 해태에는 사학계 합의). 페트로그라드 궁정·라스푸틴 관찰과 2월혁명 목격 ' +
      '기록이 «차르들의 러시아» 3부작으로 남았다.',
  },
  {
    title: '외무부 사무총장',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1920, startMonth: 1, startDay: 20,
    endYear: 1920, endMonth: 9, endDay: 30,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '밀랑의 대통령 취임 국면에서 필리프 베르텔로로 교체 (1920-09-30 후임 임명).',
    notes:
      '밀랑 총리 겸 외무장관 아래 외무부 최고위 관료직 — 전임 쥘 캉봉. 폴란드-소비에트 ' +
      '전쟁기와 겹치는 재임. 1921년 외교관직에서 퇴직(통설).',
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
    title: '파리 출생 — 루마니아 망명자의 아들',
    category: 'FAMILY',
    startYear: 1859, startMonth: 1, startDay: 13,
    description:
      '1848년 왈라키아 혁명 연루로 추방된 알렉산드루 팔레올로구의 아들. 가문의 비잔티움 ' +
      '황가 후손설은 학계에서 참칭으로 평가.',
  },
  {
    title: '외무부 입부·재외공관 순회',
    category: 'CAREER',
    startYear: 1880, endYear: 1886,
    description:
      '앙리4세·루이르그랑(푸앵카레와 동문)·법학 학사를 거쳐 1880년 입부 — 탕헤르·베이징· ' +
      '로마 공관 서기관 순회.',
  },
  {
    title: '본부 기밀사무(affaires réservées) 근무',
    category: 'CAREER',
    startYear: 1886, endYear: 1906,
    description: '약 20년간 암호·정보 담당 «유보 사무» 부서에서 근무 — 외무부의 그림자 경력.',
  },
  {
    title: '드레퓌스 렌 재심 증언',
    category: 'POLITICAL',
    startYear: 1899,
    description:
      '외무부 측 비밀문서 관리자로서 렌 재심에 장관 대리로 파견돼 증언. 사후 출간 일기 ' +
      '«드레퓌스 사건 일지»(1955)는 사건의 중요 증언 사료.',
  },
  {
    title: '전권공사 서열 취득',
    category: 'CAREER',
    startYear: 1901,
    description: 'ministre plénipotentiaire 서열 — 공관장 보임 자격.',
  },
  {
    title: '주불가리아 공사',
    category: 'DIPLOMATIC',
    startYear: 1907, endYear: 1912,
    description: '소피아 주재 공사관 수석 — 발칸 정세의 최전선 근무.',
  },
  {
    title: '외무부 정치·통상국장',
    category: 'CAREER',
    startYear: 1912, startMonth: 1, startDay: 25,
    endYear: 1914, endMonth: 1,
    description: '총리 겸 외무장관에 취임한 동문 푸앵카레가 소환·임명 — 푸앵카레 후원의 경력 상승.',
  },
  {
    title: '주러시아 대사 임명',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 1,
    description: '델카세 후임 (1914-01) — 02-16 페테르부르크 부임.',
  },
  {
    title: '7월 위기 — 푸앵카레 방러 수행과 지지 확약 논쟁',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 20,
    description:
      '푸앵카레 국빈방문(07-20~23) 수행 직후 사조노프에게 프랑스의 무조건 지지를 확약. ' +
      '러시아 총동원(07-29) 진행을 파리에 신속히 알리지 않았다는 데 사학계 합의 — 훈령 ' +
      '초과 여부는 논쟁. 만년(1936/37)에 «전쟁 불가피 판단»을 사실상 시인.',
  },
  {
    title: '2월혁명 목격',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 3,
    description: '페트로그라드 현장에서 제정 붕괴를 관찰·기록.',
  },
  {
    title: '소환·페트로그라드 이임',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 5, startDay: 17,
    description:
      '리보 정부가 구체제 밀착 인물로 판단해 소환 — 일기 마지막 기입일 기준, 후임 눌랑스.',
  },
  {
    title: '외무부 사무총장',
    category: 'CAREER',
    startYear: 1920, startMonth: 1, startDay: 20,
    endYear: 1920, endMonth: 9, endDay: 30,
    description: '밀랑 내각의 외무부 최고위 관료직 — 베르텔로 교체 후 1921년 퇴직(통설).',
  },
  {
    title: '《차르들의 러시아》 3부작 출간',
    category: 'PUBLICATION',
    startYear: 1921, endYear: 1922,
    description:
      '페트로그라드 대사 시절 일기 형식의 회고(플롱, 영역 1923~25). 사후 가공·윤색 ' +
      '논쟁에도 궁정 묘사의 생생함으로 여전히 널리 인용되는 사료.',
  },
  {
    title: '아카데미 프랑세즈 선출',
    category: 'AWARD',
    startYear: 1928, startMonth: 6, startDay: 7,
    description: '제19번 의석(fauteuil 19), 전임 샤를 조나르 — 같은 해 11-29 입회식.',
  },
  {
    title: '파리에서 사망',
    category: 'PERSONAL',
    startYear: 1944, startMonth: 11, startDay: 18,
    description:
      '파리 해방 직후 자택에서 향년 85세로 사망(사망일 이설 11-21·11-23). 파시 묘지 매장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const PALEOLOGUE_STATS = {
  politics: 50,
  military: 12,
  diplomacy: 72,
  intellect: 80,
  charisma: 55,
  administration: 60,
  notes:
    '40년 경력의 직업 외교관 — 기밀사무·발칸 공사·정치국장·페테르부르크 대사로 이어진 ' +
    '정통 코스(외교). 그러나 7월 위기의 확약과 보고 해태는 신념이 직무를 앞선 외교관 ' +
    '경력 최대의 오점 논쟁. 문필·관찰의 재능(학식)은 아카데미 프랑세즈가 공인했고 살롱 ' +
    '사교의 매력(카리스마)도 상당했으나, 동시대인들이 꼬집은 «지나친 상상력»은 보고의 ' +
    '엄밀성을 갉아먹었다. 푸앵카레 후원에 얹힌 경력이라 독자적 정치 기반은 약했다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedPaleologue(prisma: PrismaService): Promise<void> {
  console.log('\n🎩 모리스 팔레올로그(Maurice Paléologue) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const thirdRepublic = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제3공화국' },
    select: { id: true },
  })
  if (!thirdRepublic) {
    console.warn('  ⚠️  프랑스 제3공화국 HC 미존재 — 먼저 seedFranceHistoricalCountries 실행 필요. 시딩 중단.')
    return
  }

  // DIPLOMATIC_POST 정의 — 주재지는 title 오버라이드로 표기하는 규약
  const defByTitle = new Map<string, string>()
  for (const title of ['대사', '특명전권공사']) {
    const def = await prisma.governmentPositionDefinition.findFirst({
      where: { title },
      select: { id: true },
    })
    if (def) defByTitle.set(title, def.id)
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Maurice Paléologue' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = PALEOLOGUE.biography
    if (!person.birthPlaceText) patch.birthPlaceText = PALEOLOGUE.birthPlaceText
    if (!person.birthNote) patch.birthNote = PALEOLOGUE.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = PALEOLOGUE.deathPlaceText
    if (!person.deathType) patch.deathType = PALEOLOGUE.deathType
    if (!person.deathCause) patch.deathCause = PALEOLOGUE.deathCause
    if (!person.deathNote) patch.deathNote = PALEOLOGUE.deathNote
    if (person.influence == null) patch.influence = PALEOLOGUE.influence
    if (!person.historicalCountryId) patch.historicalCountryId = thirdRepublic.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${PALEOLOGUE.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${PALEOLOGUE.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: PALEOLOGUE.name,
        surname: PALEOLOGUE.surname,
        originalName: PALEOLOGUE.originalName,
        biography: PALEOLOGUE.biography,
        birthDate: toDate(PALEOLOGUE.birthYear, PALEOLOGUE.birthMonth, PALEOLOGUE.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: PALEOLOGUE.birthNote,
        deathDate: toDate(PALEOLOGUE.deathYear, PALEOLOGUE.deathMonth, PALEOLOGUE.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: PALEOLOGUE.deathType,
        deathCause: PALEOLOGUE.deathCause,
        deathNote: PALEOLOGUE.deathNote,
        gender: PALEOLOGUE.gender,
        nameDisplayOrder: 'western' as any,
        influence: PALEOLOGUE.influence,
        birthPlaceText: PALEOLOGUE.birthPlaceText,
        deathPlaceText: PALEOLOGUE.deathPlaceText,
        historicalCountryId: thirdRepublic.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${PALEOLOGUE.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 3건 (외교관 2 + 특별직 1) ──────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: thirdRepublic.id,
        positionType: t.positionType,
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
        historicalCountryId: thirdRepublic.id,
        positionDefinitionId: t.defTitle ? defByTitle.get(t.defTitle) : undefined,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision,
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

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId: thirdRepublic.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 프랑스 제3공화국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: thirdRepublic.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log('  ✅ 소속국가: 프랑스 제3공화국 (출생·복무 1859~1944)')
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
        politics: PALEOLOGUE_STATS.politics,
        military: PALEOLOGUE_STATS.military,
        diplomacy: PALEOLOGUE_STATS.diplomacy,
        intellect: PALEOLOGUE_STATS.intellect,
        charisma: PALEOLOGUE_STATS.charisma,
        administration: PALEOLOGUE_STATS.administration,
        notes: PALEOLOGUE_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${PALEOLOGUE_STATS.politics}·군사 ${PALEOLOGUE_STATS.military}·` +
        `외교 ${PALEOLOGUE_STATS.diplomacy}·학식 ${PALEOLOGUE_STATS.intellect}·` +
        `카리스마 ${PALEOLOGUE_STATS.charisma}·행정 ${PALEOLOGUE_STATS.administration}`,
    )
  }

  console.log('✅ 모리스 팔레올로그 시딩 완료\n')
}
