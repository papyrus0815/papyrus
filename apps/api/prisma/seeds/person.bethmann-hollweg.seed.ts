/**
 * 테오발트 폰 베트만홀베크 (Theobald von Bethmann Hollweg, 1856~1921) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 독일 제국 총리(1909~1917). 1914년 7월 위기에서 오스트리아-헝가리에 "백지수표"를 내줘
 * 개전의 문을 열었고, 벨기에 침공을 정당화하며 1839년 벨기에 중립 조약을 "종잇조각"이라
 * 불러 두고두고 회자됐다. 무제한 잠수함전에는 시종 반대했으나 1917-01 결국 밀려 승인했고,
 * 같은 해 힌덴부르크·루덴도르프(OHL)의 최후통첩에 밀려 사임했다.
 *
 * 날짜 규약: 독일 제국은 그레고리력(신력)이라 구력 병기가 필요 없다.
 *
 * 관직 매핑: 총리(Reichskanzler)는 카탈로그의 보편 칭호 '총리'(HEAD_OF_GOVERNMENT, 스코프
 * 없음)를 그대로 쓴다 — 고레미킨·비테·파시치 등 이 시리즈의 다른 총리급 인물과 동일 규약.
 * 프로이센 내무장관도 카탈로그 '내무장관'(CABINET_MINISTER)을 재사용한다. 란트라트·주지사
 * (지방행정)·제국 내무장관(프로이센과 구분되는 별개 관직)은 카탈로그에 대응 정의가 없어
 * title을 직접 기입한다.
 *
 * 의존: seedGermanyHistoricalCountries('독일 제국' HC) + 관직 정의(총리·내무장관).
 *
 * 등록 항목:
 *  - Person x1 (베트만홀베크 본인 — historicalCountryId=독일 제국)
 *  - GovernmentPositionTenure x5 (란트라트·주지사·프로이센 내무장관·제국 내무장관·총리) +
 *    Cabinet x1(총리 임기 동반) — 신규 생성이라 appointmentDetail을 create에 직접 기입
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
const BETHMANN = {
  name: '테오발트',
  middleName: null as string | null,
  surname: '폰 베트만홀베크',
  originalName: 'Theobald Theodor Friedrich Alfred von Bethmann Hollweg',
  gender: 'MALE' as const,
  birthYear: 1856, birthMonth: 11, birthDay: 29,
  birthNote:
    '브란덴부르크 호엔피노 영지에서 프로이센 관료 펠릭스 폰 베트만홀베크의 아들로 태어났다. ' +
    '조부 아우구스트 폰 베트만홀베크는 저명한 법학자이자 베를린 프리드리히 빌헬름 대학 ' +
    '총장을 지냈고, 프랑크푸르트의 부유한 베트만 은행가 가문과의 혼인으로 성에 그 이름이 ' +
    '더해졌다. 어머니 이자벨라 드 루즈몽은 프랑스어권 스위스 출신이다.',
  birthPlaceText: '프로이센 왕국 브란덴부르크 호엔피노',
  deathYear: 1921, deathMonth: 1, deathDay: 1,
  deathPlaceText: '프로이센 자유주 호엔피노',
  deathType: DeathType.NATURAL,
  deathCause: '향년 64세, 은퇴지 호엔피노 영지에서 사망.',
  deathNote:
    '1918년 11월 혁명을 "재앙(désastre)"이라 표현하며 지켜봤다. 1919년 5월부터 회고록 ' +
    '«세계대전을 돌아보며(Betrachtungen zum Weltkriege)»를 연재했으나 완결하지 못한 채 ' +
    '죽었다 — 여기서 그는 독일도 다른 열강과 «공동의 책임»을 나눠 진다고 반성했다.',
  influence: 82,
  biography:
    '독일 제국 총리(1909~1917). 1914년 7월 위기에서 오스트리아-헝가리에 "백지수표"를 내줘 ' +
    '개전의 문을 열었고, 벨기에 침공을 정당화하며 1839년 벨기에 중립 조약을 "종잇조각(a ' +
    'scrap of paper)"이라 불러 영국 여론을 자극한 실언으로 두고두고 회자됐다. 무제한 잠수함전에는 ' +
    '"독일 국민에 대한 범죄"라며 시종 반대했으나 1917년 1월 결국 밀려 승인했고, 그 결정이 ' +
    '미국 참전을 부르며 같은 해 7월 힌덴부르크·루덴도르프(육군 최고사령부)의 최후통첩에 ' +
    '밀려 사임했다. ' +
    '\n\n' +
    '관료 경력(1856~1909). 슐포르타 기숙학교를 거쳐 슈트라스부르크·라이프치히·베를린 ' +
    '대학에서 법학을 공부했다(1875~1879). 1884년 왕실 정부 참사관, 1886년 스물아홉의 ' +
    '나이로 브란덴부르크 최연소 란트라트(군수)에 올라 권위주의 대신 합의 중심 행정을 ' +
    '폈다. 1890년 자유보수당 소속으로 제국의회 의원에 당선됐으나 단 한 표 차 승리가 ' +
    '이의제기로 취소되자 정당 활동을 완전히 접었다. 1899년 마흔셋에 프로이센 최연소 ' +
    '주지사(오버프레지덴트)가 되었고, 1905-03-21 마지못해 프로이센 내무장관을 맡아 보수-자유 ' +
    '사이 "대각선 정책"을 표방하며 포즈난 지역 폴란드어 종교교육을 허가하는 등 유화책을 ' +
    '폈다. 1907년 뷜로 총리에 의해 제국 내무장관(국무장관)으로 발탁되었다. ' +
    '\n\n' +
    '총리 취임과 전전 외교(1909~1914). 1909-07-14 카이저 빌헬름 2세가 그의 타협적 성향과 ' +
    '온건한 태도를 높이 사 총리로 임명했다 — 영국 국왕 에드워드 7세도 "평화 유지의 중요한 ' +
    '동반자"로 반겼다. 1911년 알자스-로렌에 양원제 의회를 도입하는 헌정 개혁을 밀어붙였고, ' +
    '프로이센 3계급 선거법 개혁은 거듭 시도했으나 프로이센 의회에서 번번이 좌절됐다. 외교는 ' +
    '외무장관 키더렌-베히터에게 상당 부분 맡겼는데, 1911년 제2차 모로코 위기에서 이 방임이 ' +
    '한계를 드러냈고 1912년 홀데인 사절단을 통한 영독 해군 군축 교섭도 실패로 끝났다. ' +
    '\n\n' +
    '7월 위기와 백지수표(1914). 1914-06-28 프란츠 페르디난트 암살 후 빌헬름 2세가 오스트리아 ' +
    '대사 세죄니에게 무조건적 지지를 약속하자, 07-06 베트만홀베크가 이를 재확인했다 — ' +
    '"세르비아에 대한 요구 문구는 오스트리아의 소관이라 우리가 언급할 바 아니다"라며 사실상 ' +
    '백지수표를 내줬다. 07-27 세르비아가 최후통첩을 대부분 수용하자 빌헬름 2세는 "베오그라드 ' +
    '정지" 방안을 제안했고 그도 처음엔 이를 지지했으나, 영국 대사의 편지를 뒤늦게 빈에 ' +
    '불완전하게 전달하며 "독일이 사태의 열쇠를 쥐고 있다"는 핵심 문장을 누락시켜 결과적으로 ' +
    '무산시켰다. 08-04 독일군의 벨기에 침공 이후 영국 대사 고션과의 면담에서 벨기에 중립을 ' +
    '보장한 1839년 런던 조약을 "종잇조각"이라 표현해 국제 여론의 반감을 샀다 — 훗날 회고록에서 ' +
    '이를 "실언(Entgleisung)"으로 인정했다. ' +
    '\n\n' +
    '전시 총리(1914~1917). 러시아보다 늦게 동원령을 내려 독일을 침략의 피해자로 내세우는 데 ' +
    '성공해 전쟁 초반 사회민주당의 지지를 끌어냈다. 1915-05-07 루시타니아호 격침 이후 미국의 ' +
    '반발이 거세지자 무제한 잠수함전을 "독일 국민에 대한 범죄"라 부르며 반대해 1916-03-12 ' +
    '티르피츠 제독의 사임을 이끌어냈다. 1916-08-28 팔켄하인을 해임하고 힌덴부르크·루덴도르프를 ' +
    '군 수뇌부에 앉히는 데 힘을 보탰으나, 이는 결과적으로 군부 권력이 문민 정부를 압도하는 ' +
    '길을 열었다. 1916-11-05 러시아령 폴란드에 섭정왕국 수립을 선언했고, 1916-12-12 제국의회 ' +
    '연설로 교섭 강화를 제안했으나 연합국의 거부로 무산됐다. 1917-01-09 플레스 어전회의에서 ' +
    '"미국은 참전할 병력이 없다"는 루덴도르프의 주장에 밀려 무제한 잠수함전을 승인했고, 이는 ' +
    '04-06 미국 참전으로 이어졌다. ' +
    '\n\n' +
    '실각(1917). 중앙당의 에르츠베르거가 무병합·무배상 강화를 요구하는 제국의회 평화결의안을 ' +
    '주도하자, 자신을 지지한다고 믿었던 원내 다수파의 이반에 그는 크게 당황했다. 국민자유당의 ' +
    '슈트레제만이 "제국총리는 자기 주장을 관철할 수 있어야 하며, 못 한다면 결단을 내려야 ' +
    '한다"고 압박하는 가운데, 07-12 힌덴부르크와 루덴도르프가 그가 물러나지 않으면 자신들이 ' +
    '사임하겠다는 최후통첩을 던졌다. 빌헬름 2세가 직접 해임하는 모양새를 피하려 07-13 스스로 ' +
    '사임했다 — 후임은 OHL이 낙점한 게오르크 미하엘리스였다. ' +
    '\n\n' +
    '만년(1917~1921). 호엔피노 영지로 물러나 농사에 전념했다. 1918년 11월 혁명을 "재앙"으로 ' +
    '지켜봤고, 1919년부터 연재한 회고록에서 독일도 다른 열강과 "공동의 책임"을 나눠 진다고 ' +
    '반성했으나 완결하지 못한 채 1921-01-01 죽었다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  useDefinition: boolean
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
    title: '브란덴부르크 란트라트',
    positionType: GovernmentPositionType.LOCAL_GOVERNMENT,
    useDefinition: false,
    startYear: 1886, startMonth: 1,
    endYear: 1899,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '브란덴부르크 주지사(오버프레지덴트)로 승진.',
    appointmentDetail: '1886년 1월 스물아홉의 나이로 브란덴부르크 최연소 란트라트(군수)에 올랐다.',
    notes: '권위주의 대신 합의 중심 행정을 폈다.',
  },
  {
    title: '브란덴부르크 주지사',
    positionType: GovernmentPositionType.LOCAL_GOVERNMENT,
    useDefinition: false,
    startYear: 1899,
    endYear: 1905, endMonth: 3, endDay: 21,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '프로이센 내무장관으로 발탁.',
    appointmentDetail: '1899년 마흔셋의 나이로 프로이센 최연소 주지사(오버프레지덴트)가 되었다.',
    notes: '지방행정에서 쌓은 경력이 내무장관 발탁의 발판이 되었다.',
  },
  {
    title: '내무장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    useDefinition: true,
    startYear: 1905, startMonth: 3, startDay: 21,
    endYear: 1907,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '뷜로 총리에 의해 제국 내무장관(국무장관)으로 발탁.',
    appointmentDetail:
      '1905-03-21 마지못해 프로이센 내무장관을 맡아 보수-자유 사이 "대각선 정책"을 표방했다.',
    notes: '포즈난 지역 폴란드어 종교교육을 허가하는 등 유화적 행정을 폈다.',
  },
  {
    title: '제국 내무장관(국무장관)',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    useDefinition: false,
    startYear: 1907,
    endYear: 1909, endMonth: 7, endDay: 14,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '빌헬름 2세에 의해 총리로 발탁.',
    appointmentDetail: '1907년 제국의회 선거 이후 뷜로 총리가 제국 내무장관(국무장관)으로 발탁했다.',
    notes: '프로이센 내무장관과는 별개의 제국(연방) 차원 직위다.',
  },
  {
    title: '총리',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    useDefinition: true,
    startYear: 1909, startMonth: 7, startDay: 14,
    endYear: 1917, endMonth: 7, endDay: 13,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1917-07-12 힌덴부르크·루덴도르프(육군 최고사령부)가 그가 물러나지 않으면 자신들이 ' +
      '사임하겠다는 최후통첩을 던지자, 빌헬름 2세가 직접 해임하는 모양새를 피하려 07-13 ' +
      '스스로 사임했다. 후임은 OHL이 낙점한 게오르크 미하엘리스.',
    appointmentDetail:
      '1909-07-14 카이저 빌헬름 2세가 그의 타협적 성향과 온건한 태도를 높이 사 총리로 ' +
      '임명했다 — 영국 국왕 에드워드 7세도 "평화 유지의 중요한 동반자"로 반겼다.',
    notes:
      '재임 8년, 이 중 3년은 세계대전기. 1914년 7월 위기 "백지수표"·벨기에 중립 조약 ' +
      '"종잇조각" 발언, 1916 팔켄하인 해임과 힌덴부르크·루덴도르프 기용, 1917-01 무제한 ' +
      '잠수함전 승인(미국 참전 촉발) 등 전쟁의 향방을 가른 결정들이 이 임기에 몰려 있다.',
    cabinetName: '베트만홀베크 내각',
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
    title: '브란덴부르크 호엔피노 출생',
    category: 'FAMILY',
    startYear: 1856, startMonth: 11, startDay: 29,
    description: '프로이센 관료 펠릭스 폰 베트만홀베크의 아들로 출생.',
  },
  {
    title: '슐포르타·대학 법학 수학',
    category: 'EDUCATION',
    startYear: 1875, endYear: 1879,
    description: '슐포르타 기숙학교를 거쳐 슈트라스부르크·라이프치히·베를린 대학에서 법학을 공부했다.',
  },
  {
    title: '왕실 정부 참사관',
    category: 'CAREER',
    startYear: 1884, startMonth: 12,
    description: '프로이센 왕실 정부 참사관(Regierungsassessor)에 임명되었다.',
  },
  {
    title: '브란덴부르크 최연소 란트라트',
    category: 'CAREER',
    startYear: 1886, startMonth: 1,
    description: '스물아홉의 나이로 브란덴부르크 최연소 군수(란트라트)에 올랐다.',
  },
  {
    title: '제국의회 의원 당선·낙마',
    category: 'POLITICAL',
    startYear: 1890,
    description:
      '자유보수당 소속으로 단 한 표 차로 당선됐으나 이의제기로 무효화되자 정당 정치를 완전히 ' +
      '접었다.',
  },
  {
    title: '프로이센 최연소 주지사',
    category: 'CAREER',
    startYear: 1899,
    description: '마흔셋의 나이로 프로이센 최연소 오버프레지덴트(주지사)가 되었다.',
  },
  {
    title: '프로이센 내무장관 취임',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 3, startDay: 21,
    description: '마지못해 취임해 보수-자유 사이 "대각선 정책"을 표방했다.',
  },
  {
    title: '제국 내무장관 발탁',
    category: 'POLITICAL',
    startYear: 1907,
    description: '뷜로 총리가 제국의회 선거 이후 제국 내무장관(국무장관)으로 발탁했다.',
  },
  {
    title: '총리 취임',
    category: 'POLITICAL',
    startYear: 1909, startMonth: 7, startDay: 14,
    description: '빌헬름 2세가 타협적 성향을 높이 사 총리로 임명했다.',
  },
  {
    title: '알자스-로렌 헌정 개혁',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 3, startDay: 23,
    description: '알자스-로렌에 하원 보통선거를 포함한 양원제 의회를 도입하는 개혁을 이끌었다.',
  },
  {
    title: '제2차 모로코 위기',
    category: 'DIPLOMATIC',
    startYear: 1911,
    description:
      '외무장관 키더렌-베히터에게 교섭을 상당 부분 위임했다가 외교적 한계를 드러냈다 — 결국 ' +
      '모로코에 대한 권리를 포기하고 신카메룬을 얻는 데 그쳤다.',
  },
  {
    title: '홀데인 사절단 — 영독 해군 군축 교섭 실패',
    category: 'DIPLOMATIC',
    startYear: 1912,
    description: '영국과의 군비 경쟁을 진정시키려는 해군 군축 교섭이 합의에 이르지 못했다.',
  },
  {
    title: '사라예보 사건과 "백지수표"',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 6,
    description:
      '프란츠 페르디난트 암살 후 빌헬름 2세의 무조건 지지 약속을 재확인해 오스트리아-헝가리에 ' +
      '사실상 "백지수표"를 내줬다.',
  },
  {
    title: '"베오그라드 정지" 방안 무산',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 27,
    description:
      '세르비아의 최후통첩 수용 이후 빌헬름 2세의 타협안을 처음엔 지지했으나, 영국 대사의 ' +
      '편지를 불완전하게 전달해 결과적으로 무산시켰다.',
  },
  {
    title: '"종잇조각" 발언',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 8, startDay: 4,
    description:
      '벨기에 침공 이후 영국 대사 고션에게 1839년 벨기에 중립 조약을 "종잇조각"이라 표현해 ' +
      '국제 여론의 반감을 샀다.',
  },
  {
    title: '루시타니아호 격침 이후 잠수함전 억제',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 5, startDay: 7,
    endYear: 1916, endMonth: 3, endDay: 12,
    description:
      '미국인 100여 명이 숨진 루시타니아호 격침 이후 무제한 잠수함전을 "독일 국민에 대한 ' +
      '범죄"라 부르며 반대, 1916-03-12 티르피츠 제독의 사임을 이끌어냈다.',
  },
  {
    title: '힌덴부르크·루덴도르프 기용',
    category: 'MILITARY',
    startYear: 1916, startMonth: 8, startDay: 28,
    description:
      '팔켄하인을 해임하고 힌덴부르크·루덴도르프를 육군 최고사령부에 앉히는 데 힘을 보탰다 — ' +
      '결과적으로 군부 권력이 문민 정부를 압도하는 길을 열었다.',
  },
  {
    title: '제국의회 강화 제안 — 연합국 거부',
    category: 'DIPLOMATIC',
    startYear: 1916, startMonth: 12, startDay: 12,
    description: '교섭을 통한 강화를 제안했으나 연합국의 거부로 무산됐다.',
  },
  {
    title: '플레스 어전회의 — 무제한 잠수함전 승인',
    category: 'MILITARY',
    startYear: 1917, startMonth: 1, startDay: 9,
    description:
      '"미국은 참전할 병력이 없다"는 루덴도르프의 주장에 밀려 반대를 접고 무제한 잠수함전을 ' +
      '승인했다 — 04-06 미국 참전으로 이어진다.',
  },
  {
    title: '사임',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 7, startDay: 13,
    description:
      '힌덴부르크·루덴도르프의 최후통첩에 밀려 스스로 사임했다. 후임은 게오르크 미하엘리스.',
  },
  {
    title: '호엔피노에서 사망',
    category: 'PERSONAL',
    startYear: 1921, startMonth: 1, startDay: 1,
    description:
      '은퇴지 호엔피노 영지에서 사망(향년 64세). 회고록 «세계대전을 돌아보며»는 완결하지 ' +
      '못했다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BETHMANN_STATS = {
  politics: 76,
  military: 15,
  diplomacy: 50,
  intellect: 68,
  charisma: 45,
  administration: 72,
  notes:
    '란트라트부터 총리까지 30년 넘게 프로이센-제국 관료 체계를 오른 경력이 행정에서 드러난다. ' +
    '정치는 8년간 제국의회 다수파를 관리하며 알자스-로렌 개혁 등을 성사시켰으나, 끝내 ' +
    'OHL·평화결의안 다수파 양쪽에서 신뢰를 잃고 실각해 상한선은 있다. 군사는 최저권 — ' +
    '문민 총리로서 군사 문제에 개입할 권한도 의지도 약해 1916년 이후 사실상 군부에 정책을 ' +
    '내줬다. 외교는 백지수표·종잇조각 발언 같은 치명적 실책과 여러 차례의 강화 시도가 뒤섞여 ' +
    '중간권에 그친다. 카리스마는 "타협적이고 온건하다"는 평가 자체가 강한 대중적 흡인력과는 ' +
    '거리가 멀었음을 보여준다. 학식은 법학 수학과 전후 회고록 저술에서 드러나는 성찰적 ' +
    '태도를 반영했다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBethmannHollweg(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️ 테오발트 폰 베트만홀베크(Bethmann Hollweg) 시딩 시작 (기존 데이터 보존 모드)...')

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
        { originalName: { contains: 'Bethmann Hollweg' } },
        { AND: [{ name: '테오발트' }, { surname: '폰 베트만홀베크' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = BETHMANN.originalName
    if (!person.biography) patch.biography = BETHMANN.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BETHMANN.birthPlaceText
    if (!person.birthNote) patch.birthNote = BETHMANN.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BETHMANN.deathPlaceText
    if (!person.deathType) patch.deathType = BETHMANN.deathType
    if (!person.deathCause) patch.deathCause = BETHMANN.deathCause
    if (!person.deathNote) patch.deathNote = BETHMANN.deathNote
    if (person.influence == null) patch.influence = BETHMANN.influence
    if (!person.historicalCountryId) patch.historicalCountryId = germanEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BETHMANN.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BETHMANN.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BETHMANN.name,
        middleName: BETHMANN.middleName,
        surname: BETHMANN.surname,
        originalName: BETHMANN.originalName,
        biography: BETHMANN.biography,
        birthDate: toDate(BETHMANN.birthYear, BETHMANN.birthMonth, BETHMANN.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BETHMANN.birthNote,
        deathDate: toDate(BETHMANN.deathYear, BETHMANN.deathMonth, BETHMANN.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BETHMANN.deathType,
        deathCause: BETHMANN.deathCause,
        deathNote: BETHMANN.deathNote,
        gender: BETHMANN.gender,
        nameDisplayOrder: 'western' as any,
        influence: BETHMANN.influence,
        birthPlaceText: BETHMANN.birthPlaceText,
        deathPlaceText: BETHMANN.deathPlaceText,
        historicalCountryId: germanEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BETHMANN.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 (+ 총리 임기는 Cabinet 동반) ────────────────────────────────────
  for (const t of TENURES) {
    const def = t.useDefinition
      ? await prisma.governmentPositionDefinition.findFirst({
          where: { title: t.title, positionType: t.positionType },
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
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
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
        note: '출생·복무 전 기간의 국가. 1918년 제국 해체 뒤에도 호엔피노 영지에 머물러 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 독일 제국 (출생·복무 1856~1918)')
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
        politics: BETHMANN_STATS.politics,
        military: BETHMANN_STATS.military,
        diplomacy: BETHMANN_STATS.diplomacy,
        intellect: BETHMANN_STATS.intellect,
        charisma: BETHMANN_STATS.charisma,
        administration: BETHMANN_STATS.administration,
        notes: BETHMANN_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BETHMANN_STATS.politics}·군사 ${BETHMANN_STATS.military}·` +
        `외교 ${BETHMANN_STATS.diplomacy}·학식 ${BETHMANN_STATS.intellect}·` +
        `카리스마 ${BETHMANN_STATS.charisma}·행정 ${BETHMANN_STATS.administration}`,
    )
  }

  console.log('✅ 테오발트 폰 베트만홀베크 시딩 완료\n')
}
