/**
 * 베른하르트 폰 뷜로 (Bernhard von Bülow, 1849~1929) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 독일 제국 총리(1900~1909), 베트만홀베크의 직전 전임자. 티르피츠의 함대 확장과 "세계정책
 * (Weltpolitik)"을 앞세워 독일을 열강 경쟁의 한복판에 세웠고, 1905년 제1차 모로코 위기로
 * 후작(Fürst)에 올랐으나 알헤시라스 회의에서 외교적 참패를 겪었다. 1908년 데일리 텔레그래프
 * 사건으로 신뢰를 잃고, 1909년 상속세 개혁 부결로 사임했다. 1차대전 중에는 이탈리아의 중립을
 * 지키려 로마에 특사로 파견됐으나 실패했다.
 *
 * 날짜 규약: 독일 제국은 그레고리력(신력)이라 구력 병기가 필요 없다.
 *
 * 관직 매핑: 총리·외무장관은 카탈로그의 보편 칭호(HEAD_OF_GOVERNMENT '총리', CABINET_MINISTER
 * '외무장관')를 그대로 쓴다 — 베트만홀베크와 동일 규약. 외교관 재임은 DIPLOMATIC_POST 카탈로그
 * (대사·공사)를 재사용한다. 뷜로 후작 작위는 카이저가 수여한 것이라 title 직접 기입.
 *
 * 의존: seedGermanyHistoricalCountries('독일 제국' HC) + 관직 정의(총리·외무장관·대사·공사).
 *
 * 등록 항목:
 *  - Person x1 (뷜로 본인 — historicalCountryId=독일 제국)
 *  - GovernmentPositionTenure x6 (주루마니아 공사·주이탈리아 대사·외무장관·총리·뷜로 후작·
 *    주이탈리아 임시대사) + Cabinet x1(총리 임기 동반) — 신규 생성이라 appointmentDetail을
 *    create에 직접 기입
 *  - PersonCountryAffiliation x1 (독일 제국 CITIZENSHIP)
 *  - PersonLifeEvent x20 (연보)
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
const BULOW = {
  name: '베른하르트',
  middleName: null as string | null,
  surname: '폰 뷜로',
  originalName: 'Bernhard Heinrich Karl Martin von Bülow',
  gender: 'MALE' as const,
  birthYear: 1849, birthMonth: 5, birthDay: 3,
  birthNote:
    '홀슈타인 공국 클라인플로트베크(현 함부르크 알토나)에서 덴마크-독일계 정치가 베른하르트 ' +
    '에른스트 폰 뷜로의 아들로 태어났다. 어머니 루이제 빅토린 뤼커는 부유한 상속녀였다.',
  birthPlaceText: '홀슈타인 공국 클라인플로트베크(현 독일 함부르크 알토나)',
  deathYear: 1929, deathMonth: 10, deathDay: 28,
  deathPlaceText: '이탈리아 로마',
  deathType: DeathType.NATURAL,
  deathCause: '향년 80세, 은퇴지 로마에서 사망.',
  deathNote:
    '1909년 퇴임 이후 주로 로마 저택에서 지내며 재임기 업적을 옹호하는 저술에 몰두했다. ' +
    '1921년 총리 후보로 이름이 오르내렸으나 국민과 제국의회 다수파의 지지를 다시 얻지 ' +
    '못했다.',
  influence: 80,
  biography:
    '독일 제국 총리(1900~1909), 베트만홀베크의 직전 전임자. 티르피츠의 함대 확장과 "세계정책 ' +
    '(Weltpolitik)"을 앞세워 독일을 열강 경쟁의 한복판에 세웠고, 1905년 제1차 모로코 위기로 ' +
    '후작(Fürst)에 올랐으나 이듬해 알헤시라스 회의에서 10대3으로 외교적 참패를 겪었다. ' +
    '1908년 데일리 텔레그래프 사건으로 카이저와 여론의 신뢰를 잃고, 1909년 상속세 개혁이 ' +
    '표 차로 부결되자 사임했다. 1차대전 중에는 이탈리아의 중립을 지키려 로마에 특사로 ' +
    '파견됐으나 결국 실패했다. ' +
    '\n\n' +
    '외교관 경력(1849~1897). 프랑크푸르트 김나지움을 거쳐 로잔·라이프치히·베를린·그라이프스 ' +
    '발트 대학에서 법학을 공부해 1872년 학위를 받았다. 보불전쟁(1870~71)에 경기병연대 ' +
    '병장으로 자원했다. 부친이 외무장관이 된 1873년 외교관의 길에 들어서 1876년 파리 대사관 ' +
    '수습, 1880년 2등서기관, 1884년 상트페테르부르크 1등서기관 겸 1887년 대리대사를 ' +
    '지냈다. 1888년 워싱턴과 부쿠레슈티 중 부쿠레슈티를 택해 주루마니아 공사가 되었고, ' +
    '수년간의 로비 끝에 1893년 주이탈리아 대사로 로마에 부임했다. 1897-10-20 호엔로에- ' +
    '실링스퓌르스트 총리 아래서 외무장관에 발탁되었다. ' +
    '\n\n' +
    '총리 취임과 세계정책(1900~1905). 1900-10-17 빌헬름 2세가 사냥터 후베르투스슈토크로 ' +
    '불러 총리 겸 프로이센 총리대신에 임명했다. 티르피츠 제독의 대함대 건설을 "애국심을 ' +
    '고취해 노동자를 사회주의로부터 떼어놓을 수단"으로 여겨 적극 밀었고, 1900년 재해보험 ' +
    '확대, 1901년 인구 2만 이상 도시의 노동중재법원 의무화, 1903년 건강보험 확대와 아동노동 ' +
    '제한, 1904년 비밀투표 개선, 1906년 제국의회 의원 세비 지급 등 사회정책을 이어갔다. ' +
    '1902년에는 융커 세력인 농업동맹의 압박으로 농산물 관세를 올리는 관세법을 통과시켰다. ' +
    '1905년 제1차 모로코 위기에서 프랑스의 모로코 지배에 도전해 빌헬름 2세의 탕헤르 방문을 ' +
    '이끌어냈고, 프랑스 외무장관 델카세가 사임하자 06-06 후작(Fürst)에 올랐다. ' +
    '\n\n' +
    '뷜로 블록과 몰락(1906~1909). 1906년 초 알헤시라스 회의에서 독일의 제안이 10대3으로 ' +
    '부결되는 외교적 참패를 겪었고, 04-05 제국의회에서 이를 방어하다 과로와 독감으로 ' +
    '실신했다. 1907년 사회주의·가톨릭중앙당에 반대하는 보수-자유 연합 "뷜로 블록"을 결성해 ' +
    '"호텐토트 선거"라 불린 총선에서 사회민주당 의석을 크게 줄였다. 1908-10-28 빌헬름 2세가 ' +
    '영국 데일리 텔레그래프에 일본·프랑스·러시아·영국을 자극하는 인터뷰를 실은 사건이 ' +
    '터지자 처음엔 외무부 책임으로 돌렸으나, 훗날 연구에 따르면 그가 인터뷰 초안을 미리 ' +
    '검토·승인했을 가능성이 크다 — 결국 감독 소홀의 책임을 여론으로부터 추궁당했다. ' +
    '1909-06 상속세를 포함한 재정개혁이 제국의회에서 단 8표 차로 부결되자, 06-26 황실 요트 ' +
    '호엔촐레른호에서 사의를 표했고 07-14 사임이 공식 발표되었다 — 후임은 베트만홀베크. ' +
    '흑鷲훈장(다이아몬드 장식)을 받았다. ' +
    '\n\n' +
    '만년과 전시 특사(1909~1929). 퇴임 후 로마 저택과 클라인플로트베크·노르더나이를 오가며 ' +
    '재임기 업적을 옹호하는 저술에 몰두했다. 1914-12-19 주이탈리아 대사 플로토프가 병가로 ' +
    '자리를 비우자 임시로 로마 대사관을 맡아, 트렌티노·트리에스테 등 이탈리아의 영토 요구를 ' +
    '들어줘서라도 동맹국 편에 묶어두려 했으나 오스트리아-헝가리의 완강한 반대로 교섭이 ' +
    '막혔다. 1915-05-23 이탈리아가 오스트리아-헝가리에 선전포고하자 이튿날 로마를 떠나며 ' +
    '"독일 국민의 사기와 태도는 A-1, 정치 지도력은 Z-마이너스"라는 냉소적 총평을 남겼다. ' +
    '1921년 총리 후보로 거론됐으나 국민과 제국의회 다수파의 지지를 다시 얻지 못한 채 ' +
    '1929-10-28 로마에서 죽었다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  /** 관직 정의 조회 키 — title(표시명)과 별개. 없으면 정의 미연결(자유입력) */
  definitionTitle?: string
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
  cabinetName?: string
}

const TENURES: TenureSpec[] = [
  {
    title: '주루마니아 공사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '특명전권공사',
    startYear: 1888,
    endYear: 1893,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '주이탈리아 대사로 영전.',
    appointmentDetail: '1888년 워싱턴과 부쿠레슈티 중 부쿠레슈티를 골라 루마니아 공사로 부임했다.',
    notes: '이후 수년간의 로비 끝에 로마 대사 자리를 얻어낸다.',
  },
  {
    title: '주이탈리아 대사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '대사',
    startYear: 1893,
    endYear: 1897, endMonth: 10, endDay: 20,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '외무장관으로 발탁되어 베를린으로 복귀.',
    appointmentDetail: '수년간의 로비 끝에 1893년 로마 주재 대사로 부임했다.',
    notes: '이탈리아·지중해 외교의 요충지에서 쌓은 경력이 외무장관 발탁의 발판이 되었다.',
  },
  {
    title: '외무장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '외무장관',
    startYear: 1897, startMonth: 10, startDay: 20,
    endYear: 1900, endMonth: 10, endDay: 17,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '빌헬름 2세에 의해 총리로 발탁.',
    appointmentDetail: '1897-10-20 호엔로에-실링스퓌르스트 총리 아래서 외무장관에 발탁되었다.',
    notes: '이 시기 티르피츠의 함대법을 외교적으로 뒷받침했다.',
  },
  {
    title: '총리',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    startYear: 1900, startMonth: 10, startDay: 17,
    endYear: 1909, endMonth: 7, endDay: 14,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1909-06 상속세를 포함한 재정개혁안이 제국의회에서 단 8표 차로 부결되자 06-26 황실 요트 ' +
      '호엔촐레른호에서 사의를 표했고, 07-14 사임이 공식 발표되었다. 후임은 베트만홀베크.',
    appointmentDetail:
      '1900-10-17 빌헬름 2세가 사냥터 후베르투스슈토크로 불러 호엔로에-실링스퓌르스트의 후임 ' +
      '총리 겸 프로이센 총리대신으로 임명했다.',
    notes:
      '재임 9년. 티르피츠의 함대 확장·세계정책(Weltpolitik), 1905 제1차 모로코 위기와 1906 ' +
      '알헤시라스 회의의 외교적 참패, 1907 뷜로 블록 결성("호텐토트 선거"), 1908 데일리 ' +
      '텔레그래프 사건이 이 임기에 몰려 있다.',
    cabinetName: '뷜로 내각',
  },
  {
    title: '뷜로 후작',
    positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE,
    startYear: 1905, startMonth: 6, startDay: 6,
    endYear: 1919,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '오스트리아·독일 공통의 귀족 칭호 폐지 흐름 속에 법적 지위가 소멸.',
    appointmentDetail:
      '제1차 모로코 위기에서 프랑스 외무장관 델카세의 사임을 이끌어낸 공으로 1905-06-06 ' +
      '빌헬름 2세가 후작(Fürst)으로 봉했다.',
    notes: '세습이 아니라 카이저가 개인 공적으로 수여한 작위다.',
  },
  {
    title: '주이탈리아 임시대사(전시 특사)',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '대사',
    startYear: 1914, startMonth: 12, startDay: 19,
    endYear: 1915, endMonth: 5, endDay: 24,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1915-05-23 이탈리아가 오스트리아-헝가리에 선전포고하자 이튿날 로마를 떠나며 임무를 ' +
      '마쳤다.',
    appointmentDetail:
      '정식 대사 플로토프가 병가를 내자 로마 외교가에 발이 넓은 그가 임시로 대사관을 맡아, ' +
      '이탈리아를 동맹국 편에 묶어두려는 마지막 시도에 나섰다.',
    notes:
      '트렌티노·트리에스테 등 이탈리아의 영토 요구를 들어줘서라도 중립·참전을 막으려 했으나 ' +
      '오스트리아-헝가리의 완강한 반대로 교섭이 막혔다. "독일 국민의 사기는 A-1, 정치 ' +
      '지도력은 Z-마이너스"라는 냉소적 총평을 남기고 떠났다.',
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
    title: '홀슈타인 클라인플로트베크 출생',
    category: 'FAMILY',
    startYear: 1849, startMonth: 5, startDay: 3,
    description: '덴마크-독일계 정치가 베른하르트 에른스트 폰 뷜로의 아들로 출생.',
  },
  {
    title: '보불전쟁 자원 종군',
    category: 'MILITARY',
    startYear: 1870, endYear: 1871,
    description: '경기병연대에 병장으로 자원 종군했다.',
  },
  {
    title: '법학 수학·학위 취득',
    category: 'EDUCATION',
    startYear: 1872,
    description: '로잔·라이프치히·베를린·그라이프스발트 대학에서 법학을 공부해 학위를 받았다.',
  },
  {
    title: '외교관 입문',
    category: 'CAREER',
    startYear: 1873,
    description: '부친이 외무장관이 된 해에 외교관의 길에 들어섰다.',
  },
  {
    title: '파리 대사관 근무',
    category: 'DIPLOMATIC',
    startYear: 1876, endYear: 1884,
    description: '1876년 수습으로 파리에 부임, 1880년 2등서기관으로 승진했다.',
  },
  {
    title: '상트페테르부르크 근무',
    category: 'DIPLOMATIC',
    startYear: 1884, endYear: 1888,
    description: '1884년 1등서기관, 1887년에는 대리대사를 지냈다.',
  },
  {
    title: '마리아 베카델리 디 볼로냐와 결혼',
    category: 'FAMILY',
    startYear: 1886, startMonth: 1, startDay: 9,
    description: '이탈리아 귀족 출신 마리아 안나 초에 로잘리아 베카델리 디 볼로냐와 혼인했다.',
  },
  {
    title: '주루마니아 공사 부임',
    category: 'DIPLOMATIC',
    startYear: 1888,
    description: '워싱턴과 부쿠레슈티 중 부쿠레슈티를 택해 공사로 부임했다.',
  },
  {
    title: '주이탈리아 대사 부임',
    category: 'DIPLOMATIC',
    startYear: 1893,
    description: '수년간의 로비 끝에 로마 주재 대사가 되었다.',
  },
  {
    title: '외무장관 발탁',
    category: 'POLITICAL',
    startYear: 1897, startMonth: 10, startDay: 20,
    description: '호엔로에-실링스퓌르스트 총리 아래서 외무장관에 발탁되었다.',
  },
  {
    title: '총리 취임',
    category: 'POLITICAL',
    startYear: 1900, startMonth: 10, startDay: 17,
    description: '빌헬름 2세가 사냥터로 불러 총리 겸 프로이센 총리대신으로 임명했다.',
  },
  {
    title: '관세법 통과',
    category: 'POLITICAL',
    startYear: 1902,
    description: '융커 세력인 농업동맹의 압박으로 농산물 관세를 올리는 관세법을 통과시켰다.',
  },
  {
    title: '제1차 모로코 위기 — 탕헤르 방문',
    category: 'DIPLOMATIC',
    startYear: 1905, startMonth: 3,
    description: '프랑스의 모로코 지배에 도전해 빌헬름 2세의 탕헤르 방문을 이끌어냈다.',
  },
  {
    title: '후작 서임',
    category: 'AWARD',
    startYear: 1905, startMonth: 6, startDay: 6,
    description: '프랑스 외무장관 델카세의 사임을 이끌어낸 공으로 후작(Fürst)에 올랐다.',
  },
  {
    title: '알헤시라스 회의 외교 참패 — 제국의회 실신',
    category: 'DIPLOMATIC',
    startYear: 1906, startMonth: 4, startDay: 5,
    description:
      '독일의 제안이 10대3으로 부결된 회의 결과를 방어하다 과로와 독감으로 제국의회에서 ' +
      '실신했다.',
  },
  {
    title: '뷜로 블록 결성 — "호텐토트 선거"',
    category: 'POLITICAL',
    startYear: 1907,
    description:
      '사회주의·가톨릭중앙당에 반대하는 보수-자유 연합을 결성해 총선에서 사회민주당 의석을 ' +
      '크게 줄였다.',
  },
  {
    title: '데일리 텔레그래프 사건',
    category: 'DIPLOMATIC',
    startYear: 1908, startMonth: 10, startDay: 28,
    description:
      '빌헬름 2세의 영국 언론 인터뷰가 일본·프랑스·러시아·영국을 자극하며 파문을 일으켰다 — ' +
      '초안을 사전에 검토·승인했을 가능성이 크다는 것이 훗날 정설이 되었다.',
  },
  {
    title: '재정개혁 부결 — 사임',
    category: 'POLITICAL',
    startYear: 1909, startMonth: 6, startDay: 26,
    endYear: 1909, endMonth: 7, endDay: 14,
    description:
      '상속세 개혁이 단 8표 차로 부결되자 황실 요트에서 사의를 표했고, 07-14 사임이 공식 ' +
      '발표되었다. 흑鷲훈장(다이아몬드 장식)을 받았다.',
  },
  {
    title: '로마 전시 특사 — 이탈리아 중립 교섭 실패',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 12, startDay: 19,
    endYear: 1915, endMonth: 5, endDay: 24,
    description:
      '트렌티노·트리에스테 할양으로 이탈리아를 동맹국 편에 묶으려 했으나 오스트리아-헝가리의 ' +
      '반대로 실패, 이탈리아 참전 이튿날 로마를 떠났다.',
  },
  {
    title: '로마에서 사망',
    category: 'PERSONAL',
    startYear: 1929, startMonth: 10, startDay: 28,
    description: '은퇴지 로마에서 향년 80세로 사망.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BULOW_STATS = {
  politics: 80,
  military: 20,
  diplomacy: 75,
  intellect: 78,
  charisma: 74,
  administration: 68,
  notes:
    '뷜로 블록 결성·9년 재임이라는 정치력, 파리·상트페테르부르크·부쿠레슈티·로마를 거친 ' +
    '경력에서 나온 외교 감각과 언변에서 이 시리즈 상위권이다. 다만 알헤시라스 회의 10대3 ' +
    '참패와 데일리 텔레그래프 사건 은폐 정황은 외교·정치 모두에서 실책으로 감점 요인이다. ' +
    '학식·카리스마는 다국어 구사와 궁정 내 세평("뱀장어"라 불릴 만큼 미끄러운 언변)을 ' +
    '반영했다. 군사는 문민 외교관 경력뿐이라 최저권 — 다만 함대법 추진을 정책으로 뒷받침한 ' +
    '점은 반영하지 않고 순수 군사 역량만 평가한다. 행정은 9년간 제국 정부를 이끈 실적을 ' +
    '반영했으나, 끝내 제국의회 다수를 잃고 사임한 결말이 상한선이 되었다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBulow(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️ 베른하르트 폰 뷜로(Bernhard von Bülow) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const germanEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '독일 제국' },
    select: { id: true },
  })
  if (!germanEmpire) {
    console.warn(
      '  ⚠️  독일 제국 HC 미존재 — 먼저 seedGermanyHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Bülow' } },
        { AND: [{ name: '베른하르트' }, { surname: '폰 뷜로' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = BULOW.originalName
    if (!person.biography) patch.biography = BULOW.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BULOW.birthPlaceText
    if (!person.birthNote) patch.birthNote = BULOW.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BULOW.deathPlaceText
    if (!person.deathType) patch.deathType = BULOW.deathType
    if (!person.deathCause) patch.deathCause = BULOW.deathCause
    if (!person.deathNote) patch.deathNote = BULOW.deathNote
    if (person.influence == null) patch.influence = BULOW.influence
    if (!person.historicalCountryId) patch.historicalCountryId = germanEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BULOW.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BULOW.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BULOW.name,
        middleName: BULOW.middleName,
        surname: BULOW.surname,
        originalName: BULOW.originalName,
        biography: BULOW.biography,
        birthDate: toDate(BULOW.birthYear, BULOW.birthMonth, BULOW.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BULOW.birthNote,
        deathDate: toDate(BULOW.deathYear, BULOW.deathMonth, BULOW.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BULOW.deathType,
        deathCause: BULOW.deathCause,
        deathNote: BULOW.deathNote,
        gender: BULOW.gender,
        nameDisplayOrder: 'western' as any,
        influence: BULOW.influence,
        birthPlaceText: BULOW.birthPlaceText,
        deathPlaceText: BULOW.deathPlaceText,
        historicalCountryId: germanEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BULOW.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 (+ 총리 임기는 Cabinet 동반) ────────────────────────────────────
  for (const t of TENURES) {
    const def = t.definitionTitle
      ? await prisma.governmentPositionDefinition.findFirst({
          where: { title: t.definitionTitle, positionType: t.positionType },
          select: { id: true },
        })
      : null

    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: germanEmpire.id,
        positionType: t.positionType,
        title: t.title,
      },
    })
    let tenureId: string
    if (existing) {
      tenureId = existing.id
      if (!existing.positionDefinitionId && def?.id) {
        await prisma.governmentPositionTenure.update({
          where: { id: existing.id },
          data: { positionDefinitionId: def.id },
        })
        console.log(`  🔧 관직 정의 보강: ${t.title} → ${t.definitionTitle}`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      }
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: germanEmpire.id,
          positionDefinitionId: def?.id ?? undefined,
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
      tenureId = created.id
      console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
    }

    if (t.cabinetName) {
      const cab = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
      if (!cab) {
        await prisma.cabinet.create({
          data: { headTenureId: tenureId, name: t.cabinetName, accountId: admin.id },
        })
        console.log(`  🏛️  내각: ${t.cabinetName}`)
      } else {
        console.log(`  ⏭️  내각 스킵 (이미 존재): ${t.cabinetName}`)
      }
    }
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId: germanEmpire.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 독일 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: germanEmpire.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note: '출생·복무 전 기간의 국가. 1918년 제국 해체 뒤에는 로마에서 은거해 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 독일 제국 (출생·복무 1849~1918)')
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
        politics: BULOW_STATS.politics,
        military: BULOW_STATS.military,
        diplomacy: BULOW_STATS.diplomacy,
        intellect: BULOW_STATS.intellect,
        charisma: BULOW_STATS.charisma,
        administration: BULOW_STATS.administration,
        notes: BULOW_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BULOW_STATS.politics}·군사 ${BULOW_STATS.military}·` +
        `외교 ${BULOW_STATS.diplomacy}·학식 ${BULOW_STATS.intellect}·` +
        `카리스마 ${BULOW_STATS.charisma}·행정 ${BULOW_STATS.administration}`,
    )
  }

  console.log('✅ 베른하르트 폰 뷜로 시딩 완료\n')
}
