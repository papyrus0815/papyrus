/**
 * 니콜라이 니콜라예비치 야누시케비치 (Nikolai Nikolaevich Yanushkevich, 1868~1918) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 보병대장(генерал от инфантерии). 야전 경력이 전무한 육군성 관방 관료
 * 출신으로 니콜라이 2세의 의중에 따라 1914년 참모총장에 발탁됐고, 제1차 세계대전 개전과
 * 함께 최고총사령관 니콜라이 니콜라예비치 대공의 스타프카 참모장(1914~1915)이 되었다.
 * 스스로 전략 문제에서 물러나 작전을 병참감 다닐로프에게 위임한 명목상 참모장으로,
 * 노먼 스톤은 그를 "서기(clerk)"라 평했다. 1915년 대퇴각기 전선지대 유대인·독일계 주민
 * 강제추방 정책에 이름이 결부된 인물이기도 하다. 니콜라이 2세 친정 후 대공을 따라
 * 캅카스로 전출(부왕 군사보좌관·캅카스군 총병참감), 1917년 임시정부에서 퇴역했고,
 * 1918년 모길료프에서 체포되어 페트로그라드 호송 중 호송병들에게 살해되었다.
 *
 * 날짜 규약: 러시아 복무기록 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 1868년 출생일 +12일). 구력 원일자는 notes에 병기.
 * 출생지는 전 사료 미기재(프스코프 현 귀족 가문·대위의 아들 신분 기록만)라 미상 처리.
 * 고유 별명은 사료에 없어 별명 등록 없음(스톤의 «서기»는 사평이라 제외).
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (야누시케비치 본인 — historicalCountryId=러시아 제국, 폰 클루크 선례)
 *  - GovernmentPositionTenure x5 (MILITARY_COMMANDER — 아카데미 교장·참모총장·스타프카
 *    참모장·캅카스 부왕 군사보좌관·캅카스군 총병참감[겸임 중첩])
 *  - PersonCountryAffiliation x1 (러시아 제국 CITIZENSHIP)
 *  - PersonLifeEvent x18 (연보)
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
const YANUSHKEVICH = {
  name: '니콜라이',
  middleName: '니콜라예비치',
  surname: '야누시케비치',
  originalName: 'Nikolai Nikolaevich Yanushkevich (Николай Николаевич Янушкевич)',
  gender: 'MALE' as const,
  birthYear: 1868, birthMonth: 5, birthDay: 13,
  birthNote:
    '구력(율리우스력) 1868-05-01 출생 — 신력 환산 05-13. 출생 도시는 러시아어·영어권 사료 ' +
    '모두 기재가 없어 미상 — 프스코프 현(Псковская губерния) 귀족 가문, 대위(капитан)의 ' +
    '아들이라는 신분 기록만 남아 있다.',
  deathYear: 1918, deathMonth: 2, deathDay: 18,
  deathPlaceText: '페트로그라드 현 오레데시(Оредеж) 역 부근 — 페트로그라드 호송 중',
  deathType: DeathType.ASSASSINATION,
  deathCause: '모길료프에서 체포 후 페트로그라드 호송 중 호송병들에게 살해 (향년 49세)',
  deathNote:
    '1918년 초 옛 스타프카 소재지 모길료프에서 체포되어 페트로그라드(사료 일부는 목적지를 ' +
    '페트로파블롭스크 요새로 특정)로 호송되던 중, 오레데시 역 부근에서 호송병(конвоиры)들에게 ' +
    '살해되었다 (1918-02-18, 구력 병기 02-05). 시신은 페트로그라드 오부호프 병원을 거쳐 ' +
    '1918-02-23 스몰렌스크 정교회 묘지에 매장되었으나 묘는 이후 소실되어 발견되지 않았다. ' +
    '일부 사전에 병기된 «1918-10-18 트빌리시 사망» 이설은 주류 사료와 배치되어 기각.',
  influence: 50,
  biography:
    '러시아 제국의 보병대장(генерал от инфантерии). 제1차 세계대전 개전기 최고총사령관 ' +
    '니콜라이 니콜라예비치 대공의 스타프카 참모장(1914~1915)이었으나, 야전 참모근무 경험이 ' +
    '전무한 행정 관료 출신으로 스스로 전략 문제에서 물러나 작전 지도를 병참감 유리 ' +
    '다닐로프에게 위임한 명목상의 참모장이었다. 역사가 노먼 스톤은 그를 "서기(clerk)"라고 ' +
    '평했다. ' +
    '\n\n' +
    '성장과 교육(1868~1896). 프스코프 현 귀족 가문에서 대위의 아들로 태어났다(출생 도시는 ' +
    '사료 미기재). 니콜라예프 유년학교(1885)와 미하일롭스코예 포병학교(1888)를 거쳐 근위 ' +
    '제3포병여단 소위로 임관했고, 1896년 니콜라예프 참모본부아카데미를 1등급으로 졸업했다. ' +
    '\n\n' +
    '관방 관료의 길(1897~1913). 빌나 군관구 참모부를 잠깐 거친 뒤 경력 대부분을 야전이 ' +
    '아니라 총참모본부·군사평의회 법전편찬부·육군성 관방에서 보냈다. 관방 입법부장' +
    '(1905~1911)과 관방 부장관(1911~1913)을 지내며 수호믈리노프 국방장관의 측근 요직을 ' +
    '차지했고, 겸직으로 니콜라예프 군사아카데미 교수(군사행정, 1910~1914)를 거쳐 1913년 ' +
    '아카데미 교장에 올랐다. ' +
    '\n\n' +
    '참모총장 발탁(1914). 1914년 3월 니콜라이 2세의 개인적 의중에 따라 45세의 나이로 ' +
    '참모총장(начальник Генерального штаба)에 발탁되었다 — 군단은커녕 연대 지휘 경험도 ' +
    '없는 인사였고, 황제와 궁정의 신임이 사실상 유일한 자격이었다는 평가가 통설이다. ' +
    '\n\n' +
    '스타프카 참모장(1914~1915). 개전과 함께 최고총사령관 사령부(스타프카)의 참모장이 ' +
    '되어 서열 2위에 올랐으나, 자신의 부적격을 자각하고 개전 초부터 전략·작전을 병참감 ' +
    '다닐로프에게 위임한 채 행정·정치 문제와 궁정-외교 기능을 맡았다. 한편 1915년 대퇴각기 ' +
    '전선지대의 초토화와 유대인·독일계 주민 강제추방·인질 관행이 그의 이름으로 제도화되어 ' +
    '거센 비난을 받았다 — 영어권 사료는 그의 "주도적 역할"을 단정하고, 일부 러시아어 ' +
    '전기는 실제 관여 정도에 유보를 두지만, 정책과 그의 결부 자체는 전 사료가 일치한다. ' +
    '\n\n' +
    '캅카스와 퇴역(1915~1917). 1915년 9월 니콜라이 2세가 친정에 나서자 실각한 대공을 따라 ' +
    '캅카스로 옮겨 부왕(наместник) 군사담당 보좌관이 되었고, 1916년 9월부터 캅카스군 ' +
    '총병참감을 겸임했다. 2월 혁명으로 대공이 실각하자 1917년 4월 임시정부 명령으로 ' +
    '명목상 질병 사유의 퇴역 처리되었다(예복·연금 유지). ' +
    '\n\n' +
    '최후(1918). 1918년 초 모길료프에서 체포되어 페트로그라드로 호송되던 중 오레데시 역 ' +
    '부근에서 호송병들에게 살해되었다. 페트로그라드 스몰렌스크 정교회 묘지에 묻혔으나 ' +
    '묘는 소실되었다. ' +
    '\n\n' +
    '평가. 법제·행정 실무에는 유능했던 군사행정 관료가 궁정 인맥으로 제국 최고 참모직까지 ' +
    '오른 인사 실패의 표본으로 꼽힌다. 스타프카의 실질 권한을 다닐로프에게 넘긴 채 서명과 ' +
    '의전을 맡았다는 "서기" 평가와, 추방 정책 책임 문제가 그의 이름에 나란히 따라붙는다.',
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
    title: '니콜라예프 군사아카데미 교장',
    startYear: 1913, startMonth: 2, startDay: 2,
    endYear: 1914, endMonth: 3, endDay: 18,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '니콜라이 2세의 의중에 따라 참모총장으로 발탁 (구력 1914-03-05 발령).',
    notes:
      '구력 1913-01-20 취임 — 같은 날 중장 진급. 1910년부터 겸직해 온 아카데미 교수' +
      '(군사행정 강좌, 원외→정교수)에서 교장으로 승진. 관방 관료 경력의 정점이자 ' +
      '참모총장 발탁의 발판.',
  },
  {
    title: '참모총장',
    startYear: 1914, startMonth: 3, startDay: 18,
    endYear: 1914, endMonth: 8, endDay: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '제1차 세계대전 개전으로 스타프카 참모장으로 이동 — 공식 해임일은 사료 미확인, ' +
      '잔여 직무는 벨랴예프가 대행.',
    notes:
      '구력 1914-03-05 취임(начальник Генерального штаба). 연대 지휘 경험조차 없는 ' +
      '관방 관료의 발탁으로, 황제·궁정의 신임이 사실상 유일한 자격이었다는 평가가 통설.',
  },
  {
    title: '최고총사령관 사령부(스타프카) 참모장',
    startYear: 1914, startMonth: 8, startDay: 1,
    endYear: 1915, endMonth: 8, endDay: 31,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1915-09 니콜라이 2세 친정(親政) — 실각한 총사령관 니콜라이 니콜라예비치 대공을 따라 ' +
      '캅카스 부왕 군사보좌관으로 전출 (구력 1915-08-18 발령).',
    notes:
      '구력 1914-07-19(신력 08-01) 임명 — 최고총사령관 대공에 이은 서열 2위. 부적격을 ' +
      '자각하고 전략·작전을 병참감 다닐로프에게 위임, 본인은 행정·정치·궁정-외교 기능 담당' +
      '(노먼 스톤의 사평 «서기»). 1915년 대퇴각기 전선지대 유대인·독일계 주민 강제추방 ' +
      '정책이 그의 이름으로 제도화되어 거센 비난을 받았다. 1914-10-06(구력 09-23) 성 ' +
      '게오르기 4등훈장.',
  },
  {
    title: '캅카스 부왕 군사담당 보좌관',
    startYear: 1915, startMonth: 8, startDay: 31,
    endYear: 1917, endMonth: 4, endDay: 13,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '2월 혁명으로 부왕(대공) 실각 — 구력 1917-03-31 임시정부 육해군령으로 명목상 질병 ' +
      '사유 퇴역 처리(예복·연금 유지).',
    notes:
      '구력 1915-08-18 임명 — 캅카스 부왕으로 밀려난 니콜라이 니콜라예비치 대공이 무능 ' +
      '평판에도 그를 데려간 동행 인사.',
  },
  {
    title: '캅카스군 총병참감',
    startYear: 1916, startMonth: 9, startDay: 26,
    endYear: 1917, endMonth: 4, endDay: 13,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail: '구력 1917-03-31 임시정부 육해군령으로 퇴역 — 보좌관직과 함께 종료.',
    notes:
      '구력 1916-09-13 임명(главный начальник снабжений) — 부왕 군사보좌관과 겸임. ' +
      '이쪽은 실제로 보급·병참을 관장하는 직책.',
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
    title: '출생 — 프스코프 현 귀족 가문',
    category: 'FAMILY',
    startYear: 1868, startMonth: 5, startDay: 13,
    description: '대위(капитан)의 아들로 출생 (구력 05-01). 출생 도시는 사료에 기재가 없다.',
  },
  {
    title: '니콜라예프 유년학교 졸업',
    category: 'EDUCATION',
    startYear: 1885,
    description: '페테르부르크의 니콜라예프 유년학교(카데트 군사학교) 수료.',
  },
  {
    title: '미하일롭스코예 포병학교 졸업·임관',
    category: 'EDUCATION',
    startYear: 1888,
    description: '근위 제3포병여단 소위로 임관 (서임 구력 1888-08-09).',
  },
  {
    title: '니콜라예프 참모본부아카데미 졸업',
    category: 'EDUCATION',
    startYear: 1896,
    description: '1등급(по 1-му разряду) 졸업 — 이듬해 참모본부 대위로 전속.',
  },
  {
    title: '참모본부 전속 — 관방 관료 경력 시작',
    category: 'CAREER',
    startYear: 1897, startMonth: 2, startDay: 24,
    description:
      '빌나 군관구 참모부 선임부관보를 시작으로 총참모본부·군사평의회 법전편찬부·육군성 ' +
      '관방을 거치는 20년 행정 경력의 출발 (구력 02-12). 야전 지휘 경력은 자격취득용 ' +
      '중대장·대대장 근무가 전부였다.',
  },
  {
    title: '육군성 관방 입법부장',
    category: 'CAREER',
    startYear: 1905, startMonth: 9, startDay: 7,
    endYear: 1911, endMonth: 3, endDay: 7,
    description: '군사 법제 실무 총괄 (구력 1905-08-25 ~ 1911-02-22).',
  },
  {
    title: '니콜라예프 군사아카데미 교수',
    category: 'CAREER',
    startYear: 1910, startMonth: 1, startDay: 21,
    endYear: 1914, endMonth: 3, endDay: 18,
    description: '군사행정 강좌 원외교수(1910)→정교수(1911) — 관방 근무와 겸임 (구력 1910-01-08~).',
  },
  {
    title: '육군성 관방 부장관',
    category: 'CAREER',
    startYear: 1911, startMonth: 3, startDay: 7,
    endYear: 1913, endMonth: 2, endDay: 2,
    description: '수호믈리노프 국방장관 관방의 핵심 요직 (구력 1911-02-22 ~ 1913-01-20).',
  },
  {
    title: '군사아카데미 교장·중장 진급',
    category: 'MILITARY',
    startYear: 1913, startMonth: 2, startDay: 2,
    description: '같은 날(구력 1913-01-20) 교장 취임과 중장 진급.',
  },
  {
    title: '참모총장 취임',
    category: 'MILITARY',
    startYear: 1914, startMonth: 3, startDay: 18,
    description:
      '니콜라이 2세의 개인적 의중에 따른 발탁 (구력 03-05) — 연대 지휘 경험도 없는 45세 ' +
      '관방 관료의 초고속 출세.',
  },
  {
    title: '스타프카 참모장 — 제1차 세계대전 개전',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8, startDay: 1,
    description:
      '최고총사령관 니콜라이 니콜라예비치 대공의 참모장 (구력 07-19). 전략·작전은 병참감 ' +
      '다닐로프에게 위임하고 행정·궁정 기능을 담당.',
  },
  {
    title: '성 게오르기 4등훈장',
    category: 'AWARD',
    startYear: 1914, startMonth: 10, startDay: 6,
    description: '스타프카 참모장 공로 (구력 09-23). 1916년 백수리훈장 추가 수훈.',
  },
  {
    title: '보병대장 진급',
    category: 'MILITARY',
    startYear: 1914, startMonth: 11, startDay: 4,
    description: '«전시 헌신적 복무» 명목 (구력 10-22).',
  },
  {
    title: '전선지대 강제추방 정책 결부',
    category: 'POLITICAL',
    startYear: 1915,
    description:
      '대퇴각기 전선지대 초토화와 유대인·독일계 주민 강제추방·인질 관행이 그의 이름으로 ' +
      '제도화 — 주도 단정(영어권)과 관여 유보(일부 러시아어 전기) 사이의 온도차는 있으나 ' +
      '정책과의 결부 자체는 전 사료 일치.',
  },
  {
    title: '캅카스 전출 — 부왕 군사보좌관',
    category: 'MILITARY',
    startYear: 1915, startMonth: 8, startDay: 31,
    description: '니콜라이 2세 친정으로 실각한 대공을 따라 캅카스로 이동 (구력 08-18).',
  },
  {
    title: '캅카스군 총병참감 겸임',
    category: 'MILITARY',
    startYear: 1916, startMonth: 9, startDay: 26,
    description: '보좌관직과 겸임으로 캅카스군의 보급·병참 관장 (구력 09-13).',
  },
  {
    title: '임시정부 퇴역',
    category: 'MILITARY',
    startYear: 1917, startMonth: 4, startDay: 13,
    description: '2월 혁명·대공 실각에 수반 — 명목상 질병 사유, 예복·연금 유지 (구력 03-31).',
  },
  {
    title: '모길료프 체포·호송 중 피살',
    category: 'PERSONAL',
    startYear: 1918, startMonth: 2, startDay: 18,
    description:
      '옛 스타프카 소재지 모길료프에서 체포, 페트로그라드 호송 중 오레데시 역 부근에서 ' +
      '호송병들에게 살해 (향년 49세). 02-23 스몰렌스크 정교회 묘지 매장 — 묘는 이후 소실.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const YANUSHKEVICH_STATS = {
  politics: 56,
  military: 30,
  diplomacy: 44,
  intellect: 66,
  charisma: 38,
  administration: 79,
  notes:
    '법제·행정 실무에 유능했던 육군성 관방 관료 — 입법부장·관방 부장관·아카데미 교장으로 ' +
    '이어진 행정 역량이 최고 강점(행정). 수호믈리노프와 황제·궁정의 신임을 얻어 야전 경력 ' +
    '없이 참모총장까지 오른 처세(정치)도 상당했으나, 그것이 오히려 인사 실패의 표본이 됐다. ' +
    '군사 역량은 최저 수준 — 연대 지휘 경험조차 없어 스타프카 참모장직을 스스로 다닐로프에게 ' +
    '위임했고, 노먼 스톤은 «서기»라 혹평했다. 추방 정책 결부는 판단력의 어두운 면. 교수 ' +
    '경력의 학식은 군사행정 실무 지식에 한정되고 전략 식견과는 거리가 멀었다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedYanushkevich(prisma: PrismaService): Promise<void> {
  console.log('\n🎖️ 니콜라이 야누시케비치(Nikolai Yanushkevich) 시딩 시작 (기존 데이터 보존 모드)...')

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
    where: { originalName: { contains: 'Nikolai Nikolaevich Yanushkevich' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = YANUSHKEVICH.biography
    if (!person.birthNote) patch.birthNote = YANUSHKEVICH.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = YANUSHKEVICH.deathPlaceText
    if (!person.deathType) patch.deathType = YANUSHKEVICH.deathType
    if (!person.deathCause) patch.deathCause = YANUSHKEVICH.deathCause
    if (!person.deathNote) patch.deathNote = YANUSHKEVICH.deathNote
    if (person.influence == null) patch.influence = YANUSHKEVICH.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${YANUSHKEVICH.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${YANUSHKEVICH.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: YANUSHKEVICH.name,
        middleName: YANUSHKEVICH.middleName,
        surname: YANUSHKEVICH.surname,
        originalName: YANUSHKEVICH.originalName,
        biography: YANUSHKEVICH.biography,
        birthDate: toDate(YANUSHKEVICH.birthYear, YANUSHKEVICH.birthMonth, YANUSHKEVICH.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: YANUSHKEVICH.birthNote,
        deathDate: toDate(YANUSHKEVICH.deathYear, YANUSHKEVICH.deathMonth, YANUSHKEVICH.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: YANUSHKEVICH.deathType,
        deathCause: YANUSHKEVICH.deathCause,
        deathNote: YANUSHKEVICH.deathNote,
        gender: YANUSHKEVICH.gender,
        nameDisplayOrder: 'western' as any,
        influence: YANUSHKEVICH.influence,
        deathPlaceText: YANUSHKEVICH.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${YANUSHKEVICH.originalName} (id=${person.id})`)
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
    console.log('  ✅ 소속국가: 러시아 제국 (출생·복무 1868~1917)')
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
        politics: YANUSHKEVICH_STATS.politics,
        military: YANUSHKEVICH_STATS.military,
        diplomacy: YANUSHKEVICH_STATS.diplomacy,
        intellect: YANUSHKEVICH_STATS.intellect,
        charisma: YANUSHKEVICH_STATS.charisma,
        administration: YANUSHKEVICH_STATS.administration,
        notes: YANUSHKEVICH_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${YANUSHKEVICH_STATS.politics}·군사 ${YANUSHKEVICH_STATS.military}·` +
        `외교 ${YANUSHKEVICH_STATS.diplomacy}·학식 ${YANUSHKEVICH_STATS.intellect}·` +
        `카리스마 ${YANUSHKEVICH_STATS.charisma}·행정 ${YANUSHKEVICH_STATS.administration}`,
    )
  }

  console.log('✅ 니콜라이 야누시케비치 시딩 완료\n')
}
