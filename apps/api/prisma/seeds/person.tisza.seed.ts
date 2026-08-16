/**
 * 티사 이슈트반 백작 (gróf Tisza István, 1861~1918) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — 이미 있으면 갱신하지 않고 누락 필드만 보강한다.
 *
 * 오스트리아-헝가리 이중제국의 헝가리 왕국 총리(1903~1905, 1913~1917). 1914년 7월 7일
 * 공동각료회의에서 **참석자 중 홀로** 세르비아 즉시 개전에 반대했고, 일주일 뒤 «승전해도
 * 세르비아 영토를 병합하지 않는다»는 조건을 관철한 끝에 찬성으로 돌아섰다. 전쟁이 시작된
 * 뒤에는 자신이 반대했던 그 전쟁을 가장 강력하게 수행했으며, 보통선거권 확대를 끝까지
 * 거부하다 1917년 카를 1세의 요구로 물러났다. 1918년 10월 31일 국화혁명 당일 부다페스트
 * 임차 빌라에서 무장 병사들에게 사살되었다.
 *
 * ⚠️ 소속 국가 구분: 티사의 총리직은 이중제국 «공동» 정부가 아니라 헝가리 왕국 정부의
 *    수반이므로 HC는 «헝가리 왕국»이다(공동 외무장관 베르히톨트가 «오스트리아-헝가리
 *    제국»에 달린 것과 대비된다). 이 구분이 이중제국의 이원 구조를 데이터로 보존한다.
 *
 * ⚠️ 이름 표기: 헝가리어는 성+이름 어순(Tisza István)이고 한국어 관행도 «티사 이슈트반»
 *    이므로 nameDisplayOrder='korean'이 정확하다 — 서양식으로 뒤집으면 안 된다.
 *    (프랑스·러시아 인물의 'western'과 반대 케이스)
 *
 * 대수 규약: 헝가리 총리 목록은 재집권에 새 번호를 주지 않아 1·2차 모두 제15대다 →
 * termNumber=15 고정, 본인 회차는 subTermNumber로 구분(tenure-termnumber 규약).
 *
 * 의존: seedHungaryHistoricalCountries 계열('헝가리 왕국' HC) + '총리' 관직 정의(있으면 연결).
 *
 * 등록 항목:
 *  - Person x1 (historicalCountryId=헝가리 왕국)
 *  - GovernmentPositionTenure x6 (하원의원·총리 2·하원의장·연대 지휘관·국왕 특사,
 *    전 건 appointmentDetail 포함) + Cabinet x2 (총리 재임 동반)
 *  - PersonCountryAffiliation x1 / PersonNickname x1 (철의 백작)
 *  - PersonLifeEvent x17 / PersonStats x1
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
const TISZA = {
  name: '이슈트반',
  surname: '티사',
  originalName: 'gróf Tisza István (Count István Tisza)',
  gender: 'MALE' as const,
  birthYear: 1861, birthMonth: 4, birthDay: 22,
  birthPlaceText: '헝가리 왕국 페스트(Pest) — 1873년 부더·오부더와 합쳐져 부다페스트가 된다',
  birthNote:
    '부친 티사 칼만(1830~1902)은 1875~1890년 약 15년을 재임한 이중제국기 최장수 헝가리 ' +
    '총리로, 헝가리사에서 드문 부자(父子) 총리 사례다. 모친은 독일계 데겐펠트-숀부르크 ' +
    '가문의 일로나 백작녀. 보로셰뇌·세게드의 티사 가는 비하르에 기반한 개혁파(칼뱅파) ' +
    '개신교 귀족 가문으로, 헝가리 귀족 다수가 가톨릭인 가운데 이 칼뱅파 정체성이 그의 ' +
    '«타협 없음»과 결부되어 해석된다.',
  deathYear: 1918, deathMonth: 10, deathDay: 31,
  deathPlaceText: '부다페스트 14구 헤르미너 거리 45번지(당시 35번지) — 임차 빌라',
  deathType: DeathType.ASSASSINATION,
  deathCause: '국화혁명 당일 무장 병사들의 총격 (향년 57세)',
  deathNote:
    '1918-10-31 오후 5시경, 국화혁명이 부다페스트에서 승리한 바로 그날 무장 병사 여덟 명이 ' +
    '빌라 담을 넘어 침입했다. 직전에 정체불명의 전화 명령으로 헌병 경비가 철수해 무저항 ' +
    '상태였다는 점이 배후 의혹의 핵심이다. 권총을 들고 맞섰으나 복부와 어깨에 두 발을 맞고 ' +
    '숨졌고, 부인 일로나와 조카딸 알마시 데니제가 유일한 목격 증인이었다. 최후의 말로 ' +
    '«이렇게 될 수밖에 없었다(Ennek így kellett lennie)»가 널리 인용되나 두 사람의 사후 ' +
    '증언에 근거한 전언이다. 실행범은 끝내 확정되지 않았고 1920~21년의 두 차례 재판은 ' +
    '카로이 진영을 겨냥한 정치 재판 성격을 띠었다는 평가를 받는다. 1918-11-03 비하르 ' +
    '게스트의 가문 묘소에 부친 옆으로 안장되었다.',
  influence: 70,
  biography:
    '헝가리 왕국의 총리·정치가. 오스트리아-헝가리 이중제국의 헝가리 측 최고 실력자로 두 차례 ' +
    '총리를 지냈고, 1914년 7월 공동각료회의에서 홀로 개전에 반대한 인물로 기억된다. 완고함과 ' +
    '결투로 유명해 «철의 백작(vasgróf)»으로 불렸다. ' +
    '\n\n' +
    '가문과 교육(1861~1886). 페스트에서 헝가리 최장수 총리 티사 칼만의 아들로 태어났다. ' +
    '데브레첸 개혁파 대학에서 중등 과정을 마치고 베를린·하이델베르크·부다페스트에서 법학과 ' +
    '국가학을 공부해 1879년 부다페스트에서 국가학 박사학위를 받았다(학위논문은 조세 전가의 ' +
    '이론). 영국 연구여행 중 옥스퍼드에서도 수학했다. ' +
    '\n\n' +
    '정계 입문과 1차 총리(1886~1905). 1886년 25세로 집권 자유당 소속 하원의원이 되어 재정· ' +
    '경제 전문가로 두각을 나타냈다. 공동군 문제를 둘러싼 야당의 의사방해로 의회가 마비되자 ' +
    '1903년 11월 프란츠 요제프 1세가 그를 총리로 임명했다 — 1867년 대타협 체제를 지켜내는 ' +
    '것이 임명의 정치적 임무였다. 그러나 의사방해를 원천 차단하는 의사규칙 강행 개정이 ' +
    '자유당 분열을 불러 1905년 총선 패배로 물러났다. ' +
    '\n\n' +
    '하원의장과 물리력(1912~1913). 1910년 국민근로당을 창당해 원내 다수를 회복한 뒤, 1912년 ' +
    '5월 하원의장이 되어 11개월째 막혀 있던 신군사법안을 경찰력으로 관철했다. 5월 23일 ' +
    '«피의 목요일» 총파업 유혈 진압, 6월 4일 야당 의원 강제 퇴장에 이어 6월 7일에는 코발치 ' +
    '줄러 의원이 본회의장에서 그에게 총격을 가하는 암살 미수까지 벌어졌다. 총리가 아닌 ' +
    '의장직으로 국정 주도권을 쥔 이례적 국면이었다. ' +
    '\n\n' +
    '2차 총리와 7월 위기(1913~1914). 1913년 6월 다시 총리가 되었다. 이듬해 사라예보 암살 ' +
    '아흐레 뒤인 7월 7일 공동각료회의에서 그는 참석자 중 유일하게 즉시 개전에 반대했다. ' +
    '근거는 네 가지였다 — 세르비아를 치면 러시아가 개입해 «인간이 예견할 수 있는 한» 유럽 ' +
    '전쟁이 된다, 루마니아가 이탈해 트란실바니아를 위협한다, 세르비아 «정부»의 관여를 ' +
    '입증할 증거가 아직 없어 이중제국이 평화 파괴자로 보인다, 그리고 무엇보다 세르비아 ' +
    '영토를 병합하면 슬라브 인구가 늘어 마자르인의 우위와 이중제국 구조가 흔들린다. 마지막 ' +
    '논거가 보여주듯 그의 반대는 평화주의가 아니라 헝가리 이익 계산이었다. 7월 14일 그는 ' +
    '독일의 지원 보장과 «승전해도 세르비아 영토를 병합하지 않는다»는 조건을 얻고 찬성으로 ' +
    '돌아섰으며, «전쟁을 권하기로 마음먹기가 어려웠으나 이제 그 필요성을 굳게 확신한다»고 ' +
    '말했다. ' +
    '\n\n' +
    '전시 통치와 사임(1914~1917). 오스트리아 제국의회가 정지된 것과 달리 헝가리 의회는 계속 ' +
    '열어 입헌적 외형을 유지했으나, 실질은 전시 대권과 검열에 의한 통치였다. 그는 자신이 ' +
    '반대했던 전쟁을 가장 강력하게 수행하면서도 슬라브 인구를 늘리는 영토 병합에는 일관되게 ' +
    '반대했다. 1916년 11월 프란츠 요제프의 죽음으로 최대의 후견인을 잃었고, 개혁 지향의 ' +
    '카를 1세가 보통선거권 확대를 요구하자 정면으로 맞서다 1917년 6월 물러났다. ' +
    '\n\n' +
    '전선과 최후(1917~1918). 56세에 예비역 기병 장교로 이탈리아 전선 복무를 자원해 데브레첸 ' +
    '후사르 연대를 지휘했고, 자신의 담배 배급과 봉급을 부하들에게 나눠줬다는 일화가 전한다. ' +
    '1918년 9월 국왕의 위임으로 남슬라브 정세를 시찰하고 비관적 결론을 안고 돌아와, 10월 ' +
    '17일 의회에서 «이 전쟁을 우리는 잃었다»고 공개 선언했다. 2주 뒤 국화혁명 당일 자택에서 ' +
    '살해되었다. ' +
    '\n\n' +
    '평가의 진폭. 종전 직후 협상국은 그를 침략의 주된 책임자로 지목해 트리아농 강화를 ' +
    '정당화했고, 호르티 체제는 그를 «혁명이 살해한 순교자»로 국회의사당 앞 17미터 기념 ' +
    '조각군에까지 올렸다. 1945년 그 조각상은 넘어뜨려졌고 마르크스주의 사학은 그를 «제1차 ' +
    '세계대전의 책임자»로 규정했는데, 이는 1914년 7월 그가 유일한 반대자였다는 사료와 정면 ' +
    '충돌한다. 이 모순이 1980년대 이후 재평가의 출발점이 되었고, 현재 학계는 «전쟁광 티사» ' +
    '상도 «빛나는 별» 상도 모두 기각한다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  /** 총리 재임에만 사용 — Cabinet 동반 생성 */
  cabinetName?: string
  termNumber?: number
  subTermNumber?: number
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  appointmentDetail: string
}

const TENURES: TenureSpec[] = [
  {
    title: '하원의원',
    positionType: GovernmentPositionType.LEGISLATOR,
    startYear: 1886,
    endYear: 1918, endMonth: 10, endDay: 31,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1918-10-31 암살로 32년간 이어진 의원직이 끝났다.',
    notes:
      '비자크너(1886)·우이바녀(1892)를 거쳐 1896년부터는 우그러 선거구에서 사망할 때까지 ' +
      '의석을 지켰다. 초기에는 재정·경제 전문 의원으로 두각을 나타냈고, 1904~05년 자유당 ' +
      '분열과 총선 패배 뒤 1910년 국민근로당을 창당해 압도적 원내 다수를 확보했다 — 이 ' +
      '다수가 두 차례 총리기와 전시 통치의 토대가 되었다. 1918-10-17 의회 연설에서 «이 ' +
      '전쟁을 우리는 잃었다»고 공개 선언했다.',
    appointmentDetail:
      '부친 티사 칼만이 총리로 재임하던 1886년, 25세에 집권 자유당 소속으로 트란실바니아 ' +
      '비자크너 선거구에서 처음 당선되며 정계에 들어섰다.',
  },
  {
    title: '총리',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    cabinetName: '제1차 티사 내각 (1903~1905)',
    termNumber: 15,
    subTermNumber: 1,
    startYear: 1903, startMonth: 11, startDay: 3,
    endYear: 1905, endMonth: 6, endDay: 18,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1905년 1월 총선에서 자유당이 1867년 이래 처음으로 패배하자 사임했다 — 후임은 ' +
      '페예르바리 게자.',
    notes:
      '전 기간 내무장관을 겸임했고 1904년 3월까지 국왕 신변장관도 겸했다. 1904년 말 야당의 ' +
      '의사방해를 원천 차단하는 의사규칙 강행 개정(이른바 «손수건 표결»)을 밀어붙였다가 ' +
      '격렬한 반발과 자유당 분열을 불렀다.',
    appointmentDetail:
      '공동군 문제(군사법안·헝가리어 지휘어 요구)를 둘러싼 야당의 의사방해로 의회가 마비되고 ' +
      '케운헤데르바리 카로이 내각이 이를 수습하지 못한 채 무너지자, 프란츠 요제프 1세가 ' +
      '자유당의 강경 실력자였던 그를 총리로 임명했다. 1867년 대타협 체제를 지켜내는 것이 ' +
      '임명의 정치적 임무였다.',
  },
  {
    title: '하원의장',
    positionType: GovernmentPositionType.LEGISLATOR,
    startYear: 1912, startMonth: 5, startDay: 22,
    endYear: 1913, endMonth: 6, endDay: 12,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '루카치 총리가 정치자금 스캔들 소송에서 패소해 물러나자, 본인이 총리로 취임하며 ' +
      '의장직에서 내려왔다(총리 취임일과 이틀 겹친다).',
    notes:
      '재임 중 세 사건이 잇따랐다 — 1912-05-23 «피의 목요일» 사민당 총파업 유혈 진압(사망 약 ' +
      '6명·부상 180~200명), 06-04 군사법안 무토론 강행 처리와 야당 의원 경찰 강제 퇴장, ' +
      '06-07 코발치 줄러 의원의 본회의장 총격 암살 미수.',
    appointmentDetail:
      '루카치 라슬로 내각이 발칸 정세 악화에 대응할 신군사법안을 야당 의사방해 탓에 11개월째 ' +
      '처리하지 못하자, 이를 물리력으로라도 관철할 인물로 1912-05-22 하원의장에 선출되었다. ' +
      '총리가 아닌 의장직으로 사실상의 국정 주도권을 쥔 이례적 구도였다.',
  },
  {
    title: '총리',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    cabinetName: '제2차 티사 내각 (1913~1917)',
    termNumber: 15,
    subTermNumber: 2,
    startYear: 1913, startMonth: 6, startDay: 10,
    endYear: 1917, endMonth: 6, endDay: 15,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '카를 1세(헝가리 왕 카로이 4세)가 보통선거권 확대를 요구했으나 거부해 1917-05-23 국왕의 ' +
      '요구로 사퇴 의사를 밝혔고, 06-15 후임 에스테르하지 모리츠에게 정권을 넘겼다(영어권 ' +
      '사료는 05-23을 사임일로 적는다).',
    notes:
      '제1차 세계대전 전 기간의 헝가리 전시 총리. 오스트리아 제국의회가 정지된 것과 달리 ' +
      '헝가리 의회는 유지해 입헌적 외형을 지켰으나 실질은 전시 대권·검열 통치였다. 보통선거권 ' +
      '확대와 소수민족 자치 요구는 일관되게 거부했고, 슬라브 인구를 늘리는 영토 병합에도 ' +
      '반대했다. 크로아티아-슬라보니아-달마티아 담당 장관을 두 차례 서리 겸임했다.',
    appointmentDetail:
      '루카치 라슬로 총리가 «유럽 최대의 정치자금 사기꾼»이라는 비난을 상대로 낸 명예훼손 ' +
      '소송에서 패소해 사퇴하자 프란츠 요제프 1세가 다시 그를 임명했다. 1912년 의사방해 ' +
      '분쇄로 이미 실질적 최고 권력자였던 그가 형식상의 직위까지 회수한 셈이었다.',
  },
  {
    title: '제2 데브레첸 후사르 연대 지휘관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1917, startMonth: 6,
    endYear: 1918, endMonth: 9,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '1918년 9월 국왕의 위임으로 남슬라브 정세 시찰 임무를 받아 전선을 떠났다.',
    notes:
      '이탈리아(피아베) 전선. 자신의 담배 배급과 장교 봉급을 부하 병사들에게 나눠줬다는 ' +
      '일화가 전한다. 동시에 서한과 의회 연설로 후방 정치에 계속 개입해, 재임하지 않으면서도 ' +
      '헝가리 정계의 실질적 거부권자로 남았다.',
    appointmentDetail:
      '총리에서 물러난 뒤 56세의 나이에 예비역 기병 장교로 전선 복무를 자원했다. 정치적 ' +
      '영향력은 국민근로당의 원내 다수를 통해 후방에서 그대로 유지했다.',
  },
  {
    title: '국왕 특사 (남슬라브 정세 시찰)',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1918, startMonth: 9,
    endYear: 1918, endMonth: 10,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail: '임무를 마치고 부다페스트로 돌아온 직후인 10월 31일 암살되었다.',
    notes:
      '현지 정치 지도자들이 이미 이중제국 밖의 독립을 요구하고 있음을 확인하고 비관적 결론을 ' +
      '안고 귀국했다. 귀국 직후 1918-10-17 의회에서 «이 전쟁을 우리는 잃었다»고 선언하며 ' +
      '윌슨의 14개조를 토대로 한 강화 제의를 지지했다.',
    appointmentDetail:
      '제국 붕괴가 임박한 1918년 9월, 카를 1세가 남슬라브 지역의 실제 정세와 수습 가능성을 ' +
      '판단하도록 그에게 시찰을 위임했다 — 이중제국 틀 안에서 남슬라브 문제를 봉합하려는 ' +
      '마지막 시도였다.',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '철의 백작 (vasgróf)', type: 'EPITHET', priority: 1 },
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
    title: '페스트 출생 — 총리의 아들',
    category: 'FAMILY',
    startYear: 1861, startMonth: 4, startDay: 22,
    description: '훗날 15년을 재임하는 헝가리 총리 티사 칼만의 아들로 출생. 칼뱅파 귀족 가문이었다.',
  },
  {
    title: '데브레첸 개혁파 대학 수학',
    category: 'EDUCATION',
    startYear: 1877,
    description: '중등 과정 마지막 2년을 데브레첸에서 마쳤고, 이 칼뱅파 학맥이 평생의 정체성이 되었다.',
  },
  {
    title: '부다페스트 국가학 박사',
    category: 'EDUCATION',
    startYear: 1879,
    description: '베를린·하이델베르크·부다페스트에서 법학·국가학·경제학 수학. 학위논문은 「조세 전가의 이론」.',
  },
  {
    title: '하원의원 첫 당선',
    category: 'POLITICAL',
    startYear: 1886,
    description: '25세에 자유당 소속으로 트란실바니아 비자크너 선거구에서 당선되며 정계 입문.',
  },
  {
    title: '제1차 총리 취임',
    category: 'POLITICAL',
    startYear: 1903, startMonth: 11, startDay: 3,
    description: '의사방해로 마비된 의회를 수습할 강경 실력자로 프란츠 요제프 1세가 임명. 내무장관 겸임.',
  },
  {
    title: '의사규칙 강행 개정 — 자유당 분열',
    category: 'POLITICAL',
    startYear: 1904, startMonth: 12,
    description: '의사방해를 원천 차단하는 «손수건 표결»을 밀어붙였다가 야당 반발과 여당 분열을 불렀다.',
  },
  {
    title: '총선 패배·1차 총리 사임',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 6, startDay: 18,
    description: '1905년 1월 총선에서 자유당이 1867년 이래 처음 패배했다.',
  },
  {
    title: '국민근로당 창당',
    category: 'POLITICAL',
    startYear: 1910,
    description: '원내 다수를 회복해 이후 두 차례 총리기와 전시 통치의 토대를 마련했다.',
  },
  {
    title: '하원의장 선출 — 군사법안 강행',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 5, startDay: 22,
    description:
      '11개월째 막힌 신군사법안을 물리력으로 관철할 인물로 선출. 다음 날 «피의 목요일» ' +
      '총파업이 유혈 진압되었다.',
  },
  {
    title: '코발치 줄러 의원의 총격 암살 미수',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 6, startDay: 7,
    description: '본회의장에서 야당 의원이 그에게 총을 쏘았으나 미수에 그쳤다.',
  },
  {
    title: '카로이 미하이와의 사브르 결투',
    category: 'PERSONAL',
    startYear: 1913, startMonth: 1, startDay: 2,
    description:
      '약 34합·한 시간 가까운 결투 끝에 훨씬 나이 많은 티사가 압승했다. 훗날 국화혁명의 ' +
      '지도자가 되는 상대와의 이 결투는 두 사람의 대립을 상징하는 장면으로 신화화되었다.',
  },
  {
    title: '제2차 총리 취임',
    category: 'POLITICAL',
    startYear: 1913, startMonth: 6, startDay: 10,
    description: '루카치 총리의 스캔들 패소로 다시 임명되어 제1차 세계대전 전 기간의 전시 총리가 된다.',
  },
  {
    title: '7월 7일 공동각료회의 — 홀로 개전 반대',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 7,
    description:
      '참석자 중 유일하게 세르비아 즉시 개전에 반대했다. 러시아 개입·루마니아 이탈·증거 부재, ' +
      '그리고 슬라브 인구 증가로 마자르 우위가 흔들린다는 계산이 근거였다.',
  },
  {
    title: '개전 찬성으로 선회 — 병합 배제 조건',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 14,
    description:
      '독일의 지원 보장과 «승전해도 세르비아 영토를 병합하지 않는다»는 조건을 얻고 동의했다. ' +
      '«전쟁을 권하기로 마음먹기가 어려웠으나 이제 그 필요성을 굳게 확신한다».',
  },
  {
    title: '카를 1세와 충돌 — 2차 총리 사임',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 6, startDay: 15,
    description:
      '보통선거권 확대를 요구한 새 국왕과 정면으로 맞서다 물러났다. 1916년 프란츠 요제프의 ' +
      '죽음으로 최대의 후견인을 잃은 뒤였다.',
  },
  {
    title: '«이 전쟁을 우리는 잃었다» 의회 연설',
    category: 'POLITICAL',
    startYear: 1918, startMonth: 10, startDay: 17,
    description: '남슬라브 시찰에서 돌아온 직후 패전을 공개 선언하고 윌슨 14개조 기반 강화를 지지했다.',
  },
  {
    title: '국화혁명 당일 암살',
    category: 'PERSONAL',
    startYear: 1918, startMonth: 10, startDay: 31,
    description:
      '헤르미너 거리 임차 빌라에서 무장 병사 여덟 명의 총격으로 사망(향년 57세). 헌병 경비는 ' +
      '직전 정체불명의 전화 명령으로 철수해 있었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const TISZA_STATS = {
  politics: 84,
  military: 40,
  diplomacy: 60,
  intellect: 78,
  charisma: 52,
  administration: 76,
  notes:
    '이중제국 헝가리 측의 최고 실력자 — 국민근로당 창당으로 원내 다수를 만들어내고 의사방해를 ' +
    '물리력으로 분쇄했으며, 총리가 아닌 하원의장직으로도 국정을 좌우한 의회 정치의 기술자다 ' +
    '(정치 최상급). 국가학 박사이자 국제법·재정 저술가로서의 학식도 높았고, 1914년 7월 ' +
    '러시아 개입과 루마니아 이탈을 정확히 예측한 정세 판단력은 그 학식의 산물이었다(외교). ' +
    '반면 인기를 구하지 않는 완고함 탓에 대중적 카리스마는 낮았고, 보통선거권과 소수민족 ' +
    '문제에서 끝까지 양보하지 않은 것이 제국 해체기에 그를 고립시켰다. 군사는 56세의 전선 ' +
    '자원 복무가 있으나 연대급에 그친다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedTisza(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️ 티사 이슈트반(gróf Tisza István) 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  // 총리직은 이중제국 공동정부가 아니라 헝가리 왕국 정부의 수반이다
  const hungary = await prisma.historicalCountry.findFirst({
    where: { name: '헝가리 왕국' },
    select: { id: true },
  })
  if (!hungary) {
    console.warn('  ⚠️  «헝가리 왕국» HC 미존재 — 시딩 중단.')
    return
  }

  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })

  // ── 1) 인물 ────────────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Tisza István' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = TISZA.biography
    if (!person.birthPlaceText) patch.birthPlaceText = TISZA.birthPlaceText
    if (!person.birthNote) patch.birthNote = TISZA.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = TISZA.deathPlaceText
    if (!person.deathType) patch.deathType = TISZA.deathType
    if (!person.deathCause) patch.deathCause = TISZA.deathCause
    if (!person.deathNote) patch.deathNote = TISZA.deathNote
    if (person.influence == null) patch.influence = TISZA.influence
    if (!person.historicalCountryId) patch.historicalCountryId = hungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${TISZA.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${TISZA.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: TISZA.name,
        surname: TISZA.surname,
        originalName: TISZA.originalName,
        biography: TISZA.biography,
        birthDate: toDate(TISZA.birthYear, TISZA.birthMonth, TISZA.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: TISZA.birthNote,
        birthPlaceText: TISZA.birthPlaceText,
        deathDate: toDate(TISZA.deathYear, TISZA.deathMonth, TISZA.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: TISZA.deathType,
        deathCause: TISZA.deathCause,
        deathNote: TISZA.deathNote,
        deathPlaceText: TISZA.deathPlaceText,
        gender: TISZA.gender,
        // 헝가리어는 성+이름 어순 — 서양식으로 뒤집지 않는다
        nameDisplayOrder: 'korean' as any,
        influence: TISZA.influence,
        historicalCountryId: hungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${TISZA.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 6건 (+총리 재임에는 Cabinet 동반) ──────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: { personId, historicalCountryId: hungary.id, positionType: t.positionType, startDate },
      select: { id: true },
    })
    if (existing) {
      tenureId = existing.id
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: hungary.id,
          positionDefinitionId:
            t.positionType === GovernmentPositionType.HEAD_OF_GOVERNMENT
              ? (pmDef?.id ?? undefined)
              : undefined,
          positionType: t.positionType,
          title: t.title,
          termNumber: t.termNumber,
          subTermNumber: t.subTermNumber,
          startDate,
          startDatePrecision: precisionOf(t.startMonth, t.startDay),
          endDate: toDate(t.endYear, t.endMonth, t.endDay),
          appointmentMethod: AppointmentMethod.APPOINTMENT,
          appointmentDetail: t.appointmentDetail,
          endReason: t.endReason,
          endReasonDetail: t.endReasonDetail,
          notes: t.notes,
          accountId: admin.id,
        },
        select: { id: true },
      })
      tenureId = created.id
      console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
    }

    // 총리 재임에는 행정부(Cabinet) 행이 동반돼야 행정부 뷰에 노출된다
    if (t.cabinetName) {
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
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: { personId, historicalCountryId: hungary.id, affiliationType: 'CITIZENSHIP' as any },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 헝가리 왕국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: { personId, historicalCountryId: hungary.id, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
    })
    console.log('  ✅ 소속국가: 헝가리 왕국 (1861~1918)')
  }

  // ── 4) 별명 ─────────────────────────────────────────────────────────────────
  for (const nk of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({ where: { personId, nickname: nk.nickname } })
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
    const exists = await prisma.personLifeEvent.findFirst({ where: { personId, title: e.title } })
    if (exists) continue
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate: toDate(e.startYear, e.startMonth, e.startDay),
        startDatePrecision: precisionOf(e.startMonth, e.startDay),
        endDate,
        endDatePrecision: e.endYear ? precisionOf(e.endMonth, e.endDay) : null,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 6) 능력치 ────────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({ where: { personId, accountId: admin.id } })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: TISZA_STATS.politics,
        military: TISZA_STATS.military,
        diplomacy: TISZA_STATS.diplomacy,
        intellect: TISZA_STATS.intellect,
        charisma: TISZA_STATS.charisma,
        administration: TISZA_STATS.administration,
        notes: TISZA_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${TISZA_STATS.politics}·군사 ${TISZA_STATS.military}·` +
        `외교 ${TISZA_STATS.diplomacy}·학식 ${TISZA_STATS.intellect}·` +
        `카리스마 ${TISZA_STATS.charisma}·행정 ${TISZA_STATS.administration}`,
    )
  }

  console.log('✅ 티사 이슈트반 시딩 완료\n')
}
