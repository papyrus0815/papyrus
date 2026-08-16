/**
 * 세르게이 드미트리예비치 사조노프 (Sergey Dmitrievich Sazonov, 1860~1927) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 직업 외교관·정치가. 1910~1916년 외무장관으로 제1차 세계대전 개전
 * 국면의 러시아 외교를 이끌었다. 발칸 동맹 결성 후원(1912), 7월 위기에서 니콜라이
 * 2세에게 총동원을 진언(1914-07-30), 콘스탄티노플·해협 확보 합의(1915), 사조노프-
 * 사이크스-피코 협정(1916)이 재임기의 주요 국면. 1916년 폴란드 자치 추진이 황후·
 * 궁정 그룹의 반발을 사 해임되었고, 혁명 후 콜차크·데니킨 백군 정부의 외무장관으로
 * 파리 강화회의에서 반볼셰비키 러시아를 대표했다. 프랑스 망명 중 회고록을 남기고
 * 1927년 니스에서 사망했다.
 *
 * 날짜 규약: 러시아 관보 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes에 병기.
 * 외무장관 재임은 관리서리(구력 1910-09-04)~정식 임명(구력 11-08)을 한 건으로 합쳐
 * 서리 임명일을 시작일로 삼고 단계는 notes에 기록(바르크 선례).
 * 사망일은 출처 분열 — 신력 12-23~24일 밤(24일)이 정설(러시아어 위키백과가 소련
 * 대백과사전의 12-25를 명시적 오류로 판정), 12-25는 BSE·prlib·hrono 계열의 전파 이설.
 * 기존 등록값이 12-25면 12-24로 교정하고 이설은 deathNote에 병기.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('외무장관' 관직 정의).
 *       프랑스 제3공화국 HC는 있으면 망명지(EXILE) 소속으로 연결하고 없으면 건너뛴다.
 *
 * 등록 항목:
 *  - Person x1 (사조노프 본인 — 기존 행 보강: originalName·biography·influence·deathNote,
 *    birthPlaceText '레시아' 오타 교정, 사망일 12-25→12-24 교정, nameDisplayOrder
 *    korean→western 정합화)
 *  - GovernmentPositionTenure x1 (외무장관 1910~1916, CABINET_MINISTER)
 *  - PersonCountryAffiliation x2 (러시아 제국 CITIZENSHIP — 선재 시 스킵 / 프랑스 제3공화국 EXILE)
 *  - PersonLifeEvent x28 (연보)
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
const SAZONOV = {
  name: '세르게이',
  middleName: '드미트리예비치',
  surname: '사조노프',
  originalName: 'Sergey Dmitrievich Sazonov (Сергей Дмитриевич Сазонов)',
  gender: 'MALE' as const,
  birthYear: 1860, birthMonth: 8, birthDay: 10,
  birthNote:
    '구력(율리우스력) 1860-07-29 출생 — 신력 환산 08-10. 랴잔현의 유서 깊은 지주 귀족 ' +
    '가문 출신.',
  birthPlaceText: '러시아 제국 랴잔현',
  deathYear: 1927, deathMonth: 12, deathDay: 24,
  deathPlaceText: '프랑스 니스',
  deathType: DeathType.NATURAL,
  deathCause:
    '1920년대 국외 망명 생활 중 니스에서 사망 (향년 67세) — 니스 코카드(Caucade) ' +
    '러시아인 묘지에 안장.',
  deathNote:
    '12월 23~24일 밤 사망(24일 채택) — 러시아어 위키백과가 소련 대백과사전(БСЭ)의 ' +
    '12-25를 명시적 오류로 판정한다. 다만 12-25 기록도 prlib·hrono·브리태니커 등에 널리 ' +
    '전파되어 있어 이설로 병기. 사망 직전인 1927년 파리에서 회고록 «Воспоминания»를 ' +
    '출간했다(영어판 «Fateful Years, 1909–1916», 런던·뉴욕 1928).',
  influence: 63,
  biography:
    '러시아 제국의 직업 외교관·정치가. 1910년부터 1916년까지 외무장관으로 제1차 세계대전 ' +
    '개전 국면의 러시아 외교를 이끌었다. 발칸 동맹 결성 후원, 7월 위기에서의 총동원 진언, ' +
    '콘스탄티노플·해협 확보 합의, 사조노프-사이크스-피코 협정이 재임기의 주요 국면이며, ' +
    '온화하고 정직하다는 평으로 연합국 대사들의 신뢰가 두터웠던 «협상국의 사람»이었다. ' +
    '\n\n' +
    '성장과 교육(1860~1883). 랴잔현의 17세기까지 거슬러 오르는 지주 귀족 가문에서, 퇴역 ' +
    '이등대위 드미트리 표도로비치 사조노프와 남작영애 예르미오니야 알렉산드로브나 ' +
    '프레데릭스 사이에서 태어났다(구력 07-29, 신력 08-10). 독실한 정교회 가정에서 자라 ' +
    '한때 성직을 진지하게 고민했다는 회고가 있다. 페테르부르크의 황립 알렉산드르 리체이를 ' +
    '1883년 졸업하고 같은 해 외무부에 입부했다. ' +
    '\n\n' +
    '외교관의 길(1883~1909). 1890년 런던 주재 대사관 2등서기관으로 첫 재외 근무를 시작해, ' +
    '1894년 교황청(바티칸) 주재 공사관 서기관으로 옮겼다 — 공사관장이던 알렉산드르 ' +
    '이즈볼스키와의 인연이 여기서 시작된다. 1904년 런던 대사관 참사관, 1906년 교황청 주재 ' +
    '공사(장관급 대표)를 지냈다. 1898년 결혼한 부인 안나 보리소브나 네이드가르트는 표트르 ' +
    '스톨리핀 부인 올가의 친자매로, 총리 스톨리핀과는 동서지간이었다(자녀는 없었다). ' +
    '\n\n' +
    '외무차관(1909~1910). 부클라우 밀약 파동의 후폭풍 속에 1909-06-08(구력 05-26) 외무장관 ' +
    '이즈볼스키의 차관(товарищ министра)으로 발탁되었다. 이즈볼스키가 파리 대사로 물러나 ' +
    '면서 1910-09-17(구력 09-04)부터 부처 관리서리(управляющий)로 외무부를 지휘했고, ' +
    '1910-11-21(구력 11-08) 정식 외무장관에 임명되었다 — 스톨리핀과의 인척 관계가 발탁의 ' +
    '배경이라는 평이 따랐다. ' +
    '\n\n' +
    '외무장관 전반기(1910~1913). 서리 시절 니콜라이 2세의 포츠담 방문(1910-11-04~06)에 ' +
    '배석해 독러 협상의 물꼬를 텄고, 이는 1911-08-19 포츠담 협정(북페르시아 러시아 세력권 ' +
    '승인·바그다드 철도 불방해의 상호 양해)으로 이어졌다 — 다만 협정 서명 시점에는 본인이 ' +
    '중병으로 자리를 비워 차관 네라토프가 대리 서명했다(1911년 3~12월 네라토프 직무대행, ' +
    '다보스 요양). 복귀 후에는 오스만 압박을 겨냥한 세르비아-불가리아 동맹(발칸 동맹, ' +
    '1912-03-13 조약)을 후원했으나, 오스트리아 방벽으로 구상한 동맹이 러시아의 통제를 ' +
    '벗어나 두 차례의 발칸 전쟁(1912~1913)으로 치닫는 것은 막지 못했다. 1913-01-14(구력 ' +
    '01-01) 국가평의회 의원에 임명되었다. 1913년 말 독일 군사고문단장 리만 폰 잔더스의 ' +
    '콘스탄티노플 주둔군 지휘권 문제로 독일과 정면 충돌했다(리만 폰 잔더스 위기 — 1914-01 ' +
    '리만의 원수 승진·직접 지휘권 이양으로 무마). ' +
    '\n\n' +
    '7월 위기와 개전(1914). 오스트리아의 세르비아 최후통첩을 접하고(07-24) «이것은 유럽 ' +
    '전쟁이다»라고 외쳤다고 전해진다. 오스트리아가 세르비아에 선전포고하자 1914-07-30 ' +
    '페테르고프에서 니콜라이 2세를 알현, 부분동원으로는 군사적으로 무의미하다며 약 한 ' +
    '시간에 걸쳐 총동원령 재가를 설득했다 — 재가 직후 참모총장 야누시케비치에게 «이제 ' +
    '전화기를 부숴도 좋소»라고 전화한 일화(실링 남작 일기 계열)가 유명하다. 총동원 발령에 ' +
    '독일의 최후통첩과 대러 선전포고(08-01)가 뒤따르며 제1차 세계대전이 개전되었고, 개전의 ' +
    '문턱에서 총동원을 밀어붙인 결정은 이후 백 년의 사학사에서 논쟁의 중심에 있다. ' +
    '\n\n' +
    '전시 외교(1914~1916). 개전 후 연합국 결속과 전후 구상을 주도했다. 1915-03 자신의 ' +
    '각서로 시작된 비밀 각서 교환으로 영국·프랑스로부터 전승 시 콘스탄티노플과 해협 ' +
    '지대를 러시아에 귀속시킨다는 약속을 받아냈고(콘스탄티노플 협정 — 제정 러시아 외교의 ' +
    '숙원이던 «차르그라드»의 문서화), 1916-04-26 팔레올로그 프랑스 대사에게 보낸 서한으로 ' +
    '오스만 제국 분할에서 러시아 몫(트레비존드-에르주룸-반-비틀리스의 서부 아르메니아)을 ' +
    '확정했다(사조노프-팔레올로그 합의 — 사이크스-피코 협정의 러시아 축). ' +
    '\n\n' +
    '폴란드 문제와 해임(1916). 전후 폴란드에 러시아 황제 아래의 자치를 부여하는 구상을 ' +
    '추진했다 — 1916-04-30(구력 04-17) 독립·연합자치·지방자치 3안 각서에서 «오직 중간 ' +
    '길만이 목표에 이른다»며 자치안을 주창했고, 07-12(구력 06-29) 모길료프 스타프카에서 ' +
    '황제의 잠정 재가까지 얻었다. 그러나 황후 알렉산드라와 총리 슈튜르머 등 궁정 그룹이 ' +
    '강하게 반발했고, 핀란드에서 휴가 중이던 1916-07-20(구력 07-07) 해임 칙령을 받았다. ' +
    '외무장관직은 총리 슈튜르머가 겸임했다 — 협상국 대사들(뷰캐넌·팔레올로그)이 공공연히 ' +
    '아쉬워한 경질이었다. ' +
    '\n\n' +
    '혁명과 백군(1917~1920). 해임 후에도 궁정 시종장관(гофмейстер) 관등과 국가평의회 ' +
    '의석은 유지했고, 1917-01(구력 01-12) 주영 대사로 임명되었으나 2월 혁명으로 끝내 ' +
    '부임하지 못했다. 내전기에는 백군 진영에 가담해 1918년 가을 남러시아 특별협의회의 ' +
    '외교부장을 맡았고, 1919-01 콜차크의 옴스크 전러시아 정부 외무장관에 임명되어 — ' +
    '데니킨 진영도 이를 승인 — 직무를 파리에서 수행했다. 파리 강화회의(1919)에서는 러시아 ' +
    '정치회의가 구성한 4인 정치대표단(리보프 공·차이콥스키·마클라코프와 함께)의 일원으로 ' +
    '반볼셰비키 러시아를 대표했으나 열강의 승인도, 회의 정식 참석도 얻지 못했다. 1919년 말 ' +
    '데니킨이 해임을 명했으나 불복했고, 1920-06 브란겔 정부가 외교를 스트루베에게 맡기면서 ' +
    '최종적으로 물러났다. ' +
    '\n\n' +
    '망명과 최후(1921~1927). 1921년부터 공식 망명객이 되어, 1916년의 폴란드 자치 옹호에 ' +
    '대한 사의로 반환받은 비아위스토크 인근 영지에서 수년을 보낸 뒤 프랑스 파리·니스에 ' +
    '정착했다. 1927년 파리에서 회고록 «Воспоминания»(시얄스카야 서점 간)를 출간하고 같은 ' +
    '해 12월 니스에서 사망했다(향년 67세) — 영어판 «Fateful Years, 1909–1916»은 이듬해 ' +
    '런던·뉴욕에서 나왔다. 니스 코카드 러시아인 묘지에 안장되었다. ' +
    '\n\n' +
    '평가. 강대국 협조와 발칸 후견을 오가는 제정 말기 러시아 외교의 딜레마를 한 몸에 안은 ' +
    '인물로, 협상국 외교관들에게는 «신뢰할 수 있는 파트너»로, 비판자들에게는 총동원의 ' +
    '방아쇠를 당긴 장본인으로 기억된다. 두마·진보블록과의 관계가 원만했던 드문 각료였으나, ' +
    '바로 그 점 때문에 궁정 그룹의 표적이 되어 물러났다.',
}

// ── 외무장관 재임 ────────────────────────────────────────────────────────────
const FM_TENURE = {
  title: '외무장관',
  startYear: 1910, startMonth: 9, startDay: 17,
  endYear: 1916, endMonth: 7, endDay: 20,
  endReason: TenureEndReason.REMOVAL,
  endReasonDetail:
    '폴란드 자치 구상이 황후 알렉산드라·총리 슈튜르머 등 궁정 그룹의 반발을 사 핀란드 ' +
    '휴가 중 해임 칙령 (구력 1916-07-07) — 외무장관직은 총리 슈튜르머가 겸임 승계, ' +
    '국가평의회 의석은 유지.',
  notes:
    '구력 1910-09-04 부처 관리서리(управляющий) 임명 → 구력 11-08(신력 11-21) 정식 ' +
    '외무장관 — 서리 임명일을 재임 시작일로 삼고 단계를 여기 기록(바르크 선례). 보스니아 ' +
    '병합 위기로 물러난 이즈볼스키(파리 대사 전출)의 후임으로 차관에서 승진했으며, 총리 ' +
    '스톨리핀과 동서지간(부인들이 친자매)이라는 인척 관계가 발탁 배경이라는 평. 서리 기간 ' +
    '중 포츠담 회동(1910-11-04~06) 배석. 1911년 3~12월 와병(다보스 요양)으로 차관 네라토프 ' +
    '가 직무 대행 — 포츠담 협정(1911-08-19)도 네라토프가 대리 서명. 재임기 주요 국면 — ' +
    '발칸 동맹(1912-03-13)·리만 폰 잔더스 위기(1913~14)·7월 위기 총동원 진언(1914-07-30)· ' +
    '콘스탄티노플 협정(1915-03)·사조노프-팔레올로그 합의(1916-04-26, 사이크스-피코의 ' +
    '러시아 축).',
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
    title: '랴잔현 출생',
    category: 'FAMILY',
    startYear: 1860, startMonth: 8, startDay: 10,
    description:
      '17세기까지 거슬러 오르는 랴잔현 지주 귀족 가문 — 퇴역 이등대위 드미트리 표도로비치 ' +
      '사조노프와 남작영애 예르미오니야 프레데릭스의 아들 (구력 07-29).',
  },
  {
    title: '알렉산드르 리체이 졸업',
    category: 'EDUCATION',
    startYear: 1883, startMonth: 5,
    description: '페테르부르크의 황립 알렉산드르 리체이(구 차르스코예셀로 리체이).',
  },
  {
    title: '외무부 입부',
    category: 'CAREER',
    startYear: 1883,
    description:
      '외무부 관방에서 9등문관으로 관직 시작. 독실한 정교회 가정에서 자라 한때 성직을 ' +
      '고민했다는 회고가 있다.',
  },
  {
    title: '런던 주재 대사관 2등서기관',
    category: 'CAREER',
    startYear: 1890,
    description: '첫 재외 근무 — 이후 경력의 두 축(런던·바티칸) 중 하나.',
  },
  {
    title: '안나 네이드가르트와 결혼',
    category: 'FAMILY',
    startYear: 1898,
    description:
      '부인 안나 보리소브나 네이드가르트(1868~1939)는 표트르 스톨리핀 부인 올가의 친자매 — ' +
      '후일 총리가 되는 스톨리핀과 동서지간. 자녀는 없었다.',
  },
  {
    title: '교황청 주재 공사관 서기관',
    category: 'CAREER',
    startYear: 1894, endYear: 1904,
    description:
      '바티칸 공사관에서 10년 근무 — 공사관장 알렉산드르 이즈볼스키(후일 외무장관)와의 ' +
      '인연이 시작된 자리.',
  },
  {
    title: '런던 대사관 참사관',
    category: 'CAREER',
    startYear: 1904, endYear: 1906,
    description:
      '벤켄도르프 대사 아래의 러일전쟁기 런던 근무 — 도거뱅크(헐) 사건 수습 실무와 영국-' +
      '티베트 협약 교섭을 맡으며 영국통 외교관의 면모가 굳어진 시기.',
  },
  {
    title: '교황청 주재 공사',
    category: 'CAREER',
    startYear: 1906, startMonth: 3, endYear: 1909,
    description: '1906-03부터 공사관장(minister resident)으로 승진 복귀 — 1909년 소환까지.',
  },
  {
    title: '4등문관(실제국가고문관) 승서',
    category: 'AWARD',
    startYear: 1907, startMonth: 5, startDay: 5,
    description: '구력 04-22(부활절 서훈일) 실제국가고문관(действительный статский советник).',
  },
  {
    title: '외무차관 취임',
    category: 'POLITICAL',
    startYear: 1909, startMonth: 6, startDay: 8,
    description:
      '구력 05-26. 부클라우 밀약 파동의 후폭풍 속에 외무장관 이즈볼스키의 차관(товарищ ' +
      'министра)으로 발탁(차리코프 후임) — 동서 스톨리핀의 후원이 작용했다는 평.',
  },
  {
    title: '외무장관 취임',
    category: 'POLITICAL',
    startYear: 1910, startMonth: 11, startDay: 21,
    description:
      '구력 11-08 정식 임명 — 구력 09-04(신력 09-17)부터 부처 관리서리(управляющий)로 ' +
      '외무부를 지휘했다. 파리 대사로 전출된 이즈볼스키의 후임. 서리 기간 중 니콜라이 2세의 ' +
      '포츠담 방문(11-04~06)에 배석해 독러 협상의 물꼬를 텄다.',
  },
  {
    title: '궁정 시종장관(гофмейстер) 서임',
    category: 'AWARD',
    startYear: 1910, startMonth: 12, startDay: 19,
    description: '구력 12-06(성 니콜라이 축일 서훈) 황실 궁정 시종장관 관등.',
  },
  {
    title: '포츠담 협정',
    category: 'DIPLOMATIC',
    startYear: 1911, startMonth: 8, startDay: 19,
    description:
      '구력 08-06 페테르부르크 서명 — 북페르시아 러시아 세력권 승인·바그다드 철도 불방해의 ' +
      '독러 상호 양해. 본인 와병으로 서명은 차관 네라토프가 대리.',
  },
  {
    title: '와병 — 네라토프 직무대행',
    category: 'HEALTH',
    startYear: 1911, startMonth: 3, endYear: 1911, endMonth: 12,
    description:
      '중병으로 자리를 비워(다보스 요양 등) 차관 네라토프가 3월부터 연말까지 직무 대행 — ' +
      '아가디르 위기 대응과 포츠담 협정 서명이 대행기에 걸쳤다. 연말 복귀.',
  },
  {
    title: '발칸 동맹 결성 후원',
    category: 'DIPLOMATIC',
    startYear: 1912, startMonth: 3, startDay: 13,
    description:
      '구력 1912-02-29 세르비아-불가리아 동맹조약(비밀 부속서의 분쟁 중재자는 러시아 황제) ' +
      '— 오스트리아 방벽으로 구상했으나 동맹이 통제를 벗어나 발칸 전쟁(1912~13)으로 치닫는 ' +
      '것은 막지 못했고, 전쟁 중에는 세르비아의 아드리아 항구 요구 포기 압박과 런던 대사 ' +
      '회의 지지로 확전 억제에 주력했다.',
  },
  {
    title: '국가평의회 의원 임명',
    category: 'POLITICAL',
    startYear: 1913, startMonth: 1, startDay: 14,
    description:
      '구력 1913-01-01(신년 서훈일) 임명 — 외무장관 겸임, 1916년 해임 후에도 의석 유지.',
  },
  {
    title: '리만 폰 잔더스 위기',
    category: 'DIPLOMATIC',
    startYear: 1913, endYear: 1914,
    description:
      '독일 군사고문단장의 콘스탄티노플 주둔군 직접 지휘권 문제로 독일과 정면 충돌(1913-11 ' +
      '항의 개시) — 1914-01 리만의 오스만 원수 승진·지휘권 이양으로 무마. 해협 문제의 ' +
      '사활적 이해를 재확인한 전초전.',
  },
  {
    title: '7월 위기 — 총동원 진언',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 30,
    description:
      '최후통첩 접수(07-24) 때 «이것은 유럽 전쟁이다»라 외쳤다고 전해진다. 오스트리아의 대 ' +
      '세르비아 선전포고 후 페테르고프에서 니콜라이 2세를 약 1시간 알현, 부분동원의 군사적 ' +
      '무의미를 들어 총동원 재가를 설득 — 직후 참모총장 야누시케비치에게 «이제 전화기를 ' +
      '부숴도 좋소»라 전화한 일화가 유명하다. 독일의 대러 선전포고(08-01)로 제1차 세계대전 ' +
      '개전.',
  },
  {
    title: '콘스탄티노플 협정',
    category: 'DIPLOMATIC',
    startYear: 1915, startMonth: 3,
    description:
      '03-04 사조노프 각서로 개시된 협상국 비밀 각서 교환(영국 03-12·프랑스 04-10 동의) — ' +
      '전승 시 콘스탄티노플·해협 지대의 러시아 귀속 약속. 제정 외교의 숙원 «차르그라드»의 ' +
      '문서화.',
  },
  {
    title: '사조노프-팔레올로그 합의',
    category: 'DIPLOMATIC',
    startYear: 1916, startMonth: 4, startDay: 26,
    description:
      '팔레올로그 프랑스 대사에게 보낸 서한으로 오스만 분할에서 러시아 몫(트레비존드-' +
      '에르주룸-반-비틀리스의 서부 아르메니아)을 확정 — 사이크스-피코 협정의 러시아 축.',
  },
  {
    title: '폴란드 자치안 상주',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 7, startDay: 12,
    description:
      '구력 06-29 모길료프 스타프카에서 니콜라이 2세에게 폴란드 자치 헌장안을 상주해 잠정 ' +
      '재가 획득 — 04-30(구력 04-17) 3안 각서에서 «오직 중간 길만이 목표에 이른다»며 연합 ' +
      '자치안을 주창했었다. 황후·슈튜르머 등 궁정 그룹의 반발을 불러 해임의 직접 원인이 ' +
      '되었다.',
  },
  {
    title: '외무장관 해임',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 7, startDay: 20,
    description:
      '폴란드 자치 구상에 대한 황후·슈튜르머 등 궁정 그룹의 반발로 핀란드 휴가 중 해임 칙령 ' +
      '(구력 07-07) — 총리 슈튜르머가 외무장관 겸임, 국가평의회 의석은 유지.',
  },
  {
    title: '주영 대사 임명 — 부임 무산',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 1, startDay: 25,
    description:
      '구력 01-12 특명전권대사 임명 — 2월 혁명으로 끝내 부임하지 못했다. 해임 후에도 ' +
      '유지하던 국가평의회 의석도 1917-11(구력 10-25) 임명직 의원 일괄 해직으로 상실.',
  },
  {
    title: '남러시아 특별협의회 외교부장',
    category: 'POLITICAL',
    startYear: 1918,
    description:
      '1918년 가을 백군 진영 가담 — 알렉세예프·데니킨의 특별협의회(Особое совещание)에서 ' +
      '외교부를 총괄.',
  },
  {
    title: '콜차크 정부 외무장관',
    category: 'POLITICAL',
    startYear: 1919, startMonth: 1,
    endYear: 1920, endMonth: 6,
    description:
      '옴스크 전러시아 정부의 외무장관(데니킨 진영도 승인) — 직무는 파리에서 수행. 파리 ' +
      '강화회의에서 러시아 정치회의의 4인 정치대표단(리보프 공·차이콥스키·마클라코프와 ' +
      '함께)으로 활동했으나 열강의 승인 획득에 실패. 1919년 말 데니킨의 해임 명령에 ' +
      '불복했고, 1920-06 브란겔 정부가 외교를 스트루베에게 맡기며 최종 퇴임.',
  },
  {
    title: '국외 망명',
    category: 'EXILE',
    startYear: 1921,
    description:
      '1916년 폴란드 자치 옹호에 대한 사의로 반환받은 비아위스토크 인근 영지에서 수년을 ' +
      '보낸 뒤 프랑스 파리·니스에 정착.',
  },
  {
    title: '회고록 «Воспоминания» 출간',
    category: 'PUBLICATION',
    startYear: 1927,
    description:
      '사망 직전 파리 시얄스카야 서점에서 출간(398쪽) — 영어판 «Fateful Years, 1909–1916» ' +
      '(런던 조너선 케이프·뉴욕 스토크스, 1928)으로도 번역.',
  },
  {
    title: '니스에서 사망',
    category: 'PERSONAL',
    startYear: 1927, startMonth: 12, startDay: 24,
    description:
      '12월 23~24일 밤 사망, 향년 67세 (이설 12-25 — 소련 대백과사전 계열의 전파 오류로 ' +
      '판정). 니스 코카드(Caucade) 러시아인 묘지에 안장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const SAZONOV_STATS = {
  politics: 52,
  military: 22,
  diplomacy: 84,
  intellect: 66,
  charisma: 55,
  administration: 58,
  notes:
    '경력 전부를 외교 현장에서 쌓은 직업 외교관의 정점(외교) — 발칸 동맹·콘스탄티노플 ' +
    '협정·사이크스-피코의 러시아 몫까지, 제정 말기 러시아 외교의 성과 대부분에 그의 서명이 ' +
    '있다. 온화하고 정직하다는 평으로 뷰캐넌·팔레올로그 등 연합국 대사들의 신뢰가 두터웠고 ' +
    '두마와의 관계도 원만했으나(카리스마·정치), 황후·라스푸틴 궁정 그룹과의 권력 게임에는 ' +
    '무력해 결국 해임으로 끝났다. 군 경력은 없으며 총동원 진언은 군사 판단이라기보다 참모 ' +
    '본부 논리의 수용이었다(군사). 행정은 외무부라는 단일 부처 운영에 한정.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedSazonov(prisma: PrismaService): Promise<void> {
  console.log('\n🕊️ 세르게이 사조노프(Sergey Sazonov) 시딩 시작 (기존 데이터 보존 모드)...')

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

  const thirdRepublic = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제3공화국' },
    select: { id: true },
  })

  const fmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '외무장관' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Sergey Dmitrievich Sazonov' } },
        { AND: [{ name: '세르게이' }, { middleName: '드미트리예비치' }, { surname: '사조노프' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = SAZONOV.originalName
    if (!person.biography) patch.biography = SAZONOV.biography
    if (!person.birthPlaceText) patch.birthPlaceText = SAZONOV.birthPlaceText
    if (!person.birthNote) patch.birthNote = SAZONOV.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = SAZONOV.deathPlaceText
    if (!person.deathType) patch.deathType = SAZONOV.deathType
    if (!person.deathCause) patch.deathCause = SAZONOV.deathCause
    if (!person.deathNote) patch.deathNote = SAZONOV.deathNote
    if (person.influence == null) patch.influence = SAZONOV.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    // 명백한 오타 교정 — '레시아 제국' → '러시아 제국' (정확히 이 값일 때만 손댄다)
    if (person.birthPlaceText === '레시아 제국 랴잔현') {
      patch.birthPlaceText = '러시아 제국 랴잔현'
    }
    // 사망일 교정 — 러시아어 위키가 БСЭ의 12-25를 명시적 오류로 판정(정설=12-23~24일 밤).
    // 기존값이 정확히 1927-12-25일 때만 12-24로 교정한다. 로컬 타임존에 따라
    // getDate()가 밀릴 수 있어 UTC 날짜부(ISO 접두)로 판정한다.
    if (person.deathDate?.toISOString().slice(0, 10) === '1927-12-25') {
      patch.deathDate = toDate(1927, 12, 24)
      patch.deathNote = SAZONOV.deathNote
    }
    // 러시아 인물 표기 정합화 — 다닐로프·고레미킨 등 기존 러시아 인물 시드와 동일하게
    // western(이름-부칭-성) 순서로 통일. 등록 모달 기본값 korean만 교정한다.
    if (person.nameDisplayOrder === ('korean' as any)) {
      patch.nameDisplayOrder = 'western'
    }
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${SAZONOV.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${SAZONOV.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: SAZONOV.name,
        middleName: SAZONOV.middleName,
        surname: SAZONOV.surname,
        originalName: SAZONOV.originalName,
        biography: SAZONOV.biography,
        birthDate: toDate(SAZONOV.birthYear, SAZONOV.birthMonth, SAZONOV.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: SAZONOV.birthNote,
        deathDate: toDate(SAZONOV.deathYear, SAZONOV.deathMonth, SAZONOV.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: SAZONOV.deathType,
        deathCause: SAZONOV.deathCause,
        deathNote: SAZONOV.deathNote,
        gender: SAZONOV.gender,
        nameDisplayOrder: 'western' as any,
        influence: SAZONOV.influence,
        birthPlaceText: SAZONOV.birthPlaceText,
        deathPlaceText: SAZONOV.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${SAZONOV.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 외무장관 재임 (CABINET_MINISTER) ─────────────────────────────────────
  {
    const t = FM_TENURE
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
          positionDefinitionId: fmDef?.id ?? undefined,
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
      label: '러시아 제국 (출생·복무 1860~1917)',
      priority: 0,
    },
  ]
  if (thirdRepublic) {
    affiliations.push({
      historicalCountryId: thirdRepublic.id,
      type: 'EXILE',
      label: '프랑스 제3공화국 (1920 망명 — 니스 정착, 1927 사망)',
      priority: 1,
      note: '백군 패퇴 후 프랑스 정착 — 1927년 파리에서 회고록을 출간하고 니스에서 사망.',
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
        politics: SAZONOV_STATS.politics,
        military: SAZONOV_STATS.military,
        diplomacy: SAZONOV_STATS.diplomacy,
        intellect: SAZONOV_STATS.intellect,
        charisma: SAZONOV_STATS.charisma,
        administration: SAZONOV_STATS.administration,
        notes: SAZONOV_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${SAZONOV_STATS.politics}·군사 ${SAZONOV_STATS.military}·` +
        `외교 ${SAZONOV_STATS.diplomacy}·학식 ${SAZONOV_STATS.intellect}·` +
        `카리스마 ${SAZONOV_STATS.charisma}·행정 ${SAZONOV_STATS.administration}`,
    )
  }

  console.log('✅ 세르게이 사조노프 시딩 완료\n')
}
