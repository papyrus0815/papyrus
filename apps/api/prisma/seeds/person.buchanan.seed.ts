/**
 * 조지 윌리엄 뷰캐넌 (Sir George William Buchanan, 1854~1924) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 영국의 직업 외교관. 1910~1918년 주러시아 대사로 제1차 세계대전기 페트로그라드
 * 협상국 외교의 축이었다. 외무장관 사조노프의 카운터파트로 영러 협조를 다졌고,
 * 1917년 1월 니콜라이 2세를 알현해 혁명의 위험을 경고한 일화, 2월 혁명 후 임시정부
 * 승인, 로마노프 일가 망명 문제의 당사자로 기억된다. 볼셰비키 집권 후 1918년 1월
 * 페트로그라드를 떠났고, 주이탈리아 대사(1919~1921)를 끝으로 은퇴해 회고록
 * «My Mission to Russia»(1923)를 남겼다.
 *
 * 날짜 규약: 영국 인물이라 원자료가 그레고리력(NS) — 러시아 주재기의 러시아 측
 * 사건(혁명 등)만 구력 병기가 필요할 때 notes에 적는다.
 *
 * 의존: seedBritainHistoricalCountries('그레이트브리튼 및 아일랜드 연합왕국' HC) +
 *       seedGovernmentPositionDefinitions('대사'·'특명전권공사' 관직 정의 —
 *       DIPLOMATIC_POST).
 *
 * 등록 항목:
 *  - Person x1 (뷰캐넌 본인 — historicalCountryId=그레이트브리튼 및 아일랜드 연합왕국)
 *  - GovernmentPositionTenure x4 (DIPLOMATIC_POST — 주불가리아 외교대표·주네덜란드
 *    공사·주러시아 대사·주이탈리아 대사, 팔레올로그와 동형의 외교관 변형)
 *  - PersonCountryAffiliation x1 (그레이트브리튼 및 아일랜드 연합왕국 CITIZENSHIP)
 *  - PersonLifeEvent x23 (연보)
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
const BUCHANAN = {
  name: '조지',
  middleName: '윌리엄',
  surname: '뷰캐넌',
  originalName: 'Sir George William Buchanan',
  gender: 'MALE' as const,
  birthYear: 1854, birthMonth: 11, birthDay: 25,
  birthNote:
    '주덴마크 공사이던 직업 외교관 앤드루 뷰캐넌 경(후일 주러시아 대사 1864~71·초대 ' +
    '준남작)의 아들로 아버지의 임지 코펜하겐에서 태어났다. 어머니 프랜시스 멜리시는 그를 ' +
    '낳고 9일 만에 세상을 떠났다(1854-12-04).',
  birthPlaceText: '덴마크 코펜하겐 (영국 공사관)',
  deathYear: 1924, deathMonth: 12, deathDay: 20,
  deathPlaceText: '영국 런던 레녹스 가든스 15번지 자택',
  deathType: DeathType.NATURAL,
  deathCause: '은퇴 3년 후 자택에서 사망 (향년 70세) — 사인은 사료 미기록.',
  deathNote:
    '글로스터셔 사이런세스터의 체스터턴 묘지에 안장된 것으로 전해진다(처가 배서스트 ' +
    '백작가의 본거지 — 다만 매장지는 Find a Grave 단일 출처).' as string | null,
  influence: 57,
  biography:
    '영국의 직업 외교관. 1910년부터 1918년까지 주러시아 대사로 제1차 세계대전기 ' +
    '페트로그라드 협상국 외교의 축이었다 — 독일 측이 «러시아의 무관의 왕»이라 부를 만큼 ' +
    '영향력이 컸다. 외무장관 사조노프의 카운터파트로 영러 협조를 다졌고, 1917년 1월 ' +
    '니콜라이 2세에게 혁명의 위험을 직언한 마지막 경고, 2월 혁명 후 임시정부 공동 승인, ' +
    '로마노프 일가 망명 무산의 당사자로 기억된다. ' +
    '\n\n' +
    '성장(1854~1876). 주덴마크 공사이던 앤드루 뷰캐넌 경의 아들로 아버지의 임지 코펜하겐 ' +
    '에서 태어났고, 어머니는 그를 낳고 9일 만에 세상을 떠났다. 아버지는 후일 주러시아 대사 ' +
    '(1864~1871)까지 지내고 준남작이 된 당대의 대표적 직업 외교관으로, 부자가 대를 이어 ' +
    '페테르부르크 대사관을 이끈 셈이 된다. 웰링턴 칼리지에서 수학한 뒤 대학을 거치지 않고 ' +
    '1876년 외교관 시험을 거쳐 입직, 아버지가 대사로 있던 빈 대사관의 관보(attaché)로 ' +
    '경력을 시작했다. ' +
    '\n\n' +
    '초임 순환 근무(1878~1893). 로마 3등서기관(1878), 도쿄 2등서기관(1880~1883), 빈 ' +
    '2등서기관(1883~1888), 외무부 본부(1888~1889), 베르네 근무를 거쳤다. 1885년 배서스트 ' +
    '백작가의 조지아나와 결혼했고, 외동딸 메리엘(1886~1959)은 후일 페트로그라드 시절을 ' +
    '기록한 작가가 된다. ' +
    '\n\n' +
    '다름슈타트(1893~1900). 1892년 말 공사관 서기관으로 승진하며 코부르크 대리공사로 ' +
    '내정됐으나 빅토리아 여왕의 반대로 헤센 대공국의 다름슈타트 대리공사로 부임했다. ' +
    '대공 에른스트 루트비히 남매와 친교를 맺었고 — 대공의 여동생 알릭스가 1894년 니콜라이 ' +
    '2세와 결혼하면서 이 작은 공관은 러시아 황제 부부가 수시로 찾는 요지가 된다. 1896년 ' +
    '가을 다름슈타트를 찾은 니콜라이 2세를 처음 알현했고 1897년에는 사적 접견까지 받았다 ' +
    '— 20년 뒤 페테르부르크 부임의 결정적 자산이 된 인연. 1898~1899년 베네수엘라 국경 ' +
    '중재재판의 영국 대표를 겸해 CB 훈장을 받았고, 보어 전쟁 개전기 독일 군중의 반영 ' +
    '감정을 보고하자 빅토리아 여왕이 «우리는 잊지 않을 것»이라 답한 일화를 남겼다. ' +
    '\n\n' +
    '로마·베를린 참사관(1900~1903). 로마 대사관 참사관을 거쳐 1901년 가을 베를린 ' +
    '대사관으로 옮겨, 보어 전쟁 여파로 영독 관계가 얼어붙은 시기를 지켰다. ' +
    '\n\n' +
    '소피아(1903~1909). 1903-11 불가리아 주재 외교대표 겸 총영사(개인 계급 전권공사 — ' +
    '불가리아가 아직 오스만 종주권 아래의 공국이어서 당대 정식 직함은 대표부 대표)로 ' +
    '임명되었다. 페르디난트 공은 주러 대사였던 아버지를 기려 «아버지의 아들을 맞게 되어 ' +
    '기쁘다»는 인사로 그를 맞았다. 1908-10-05 티르노보의 불가리아 독립 선언을 현지에서 ' +
    '지켜봤고, 이미 헤이그 전임이 내정된 상태에서 «위기를 끝까지 지켜보라»는 본부 요청에 ' +
    '1909년 봄까지 잔류했다. ' +
    '\n\n' +
    '헤이그(1909~1910). 주네덜란드 공사(룩셈부르크 겸임, 관례 표기 1908~1910). 1910-07 ' +
    '그레이 외무장관이 니콜슨의 본부 전보로 비게 된 페테르부르크 대사직을 서한으로 ' +
    '제안했다. ' +
    '\n\n' +
    '주러시아 대사 부임(1910). 1910-11-23 임명(11-25 관보), 11월 말 사은숙배 후 12월 초 ' +
    '페테르부르크에 도착했다 — 마침 정식 외무장관에 오른 사조노프와 임기가 거의 정확히 ' +
    '겹쳐, 이후 6년간 영러 협조의 양 축이 된다. 신임장 제정 때 조지 5세의 영러 이해 유지 ' +
    '의지를 전하며 포츠담 독러 협상에 대한 런던의 우려를 제기했고, 첫 과제도 포츠담 협정 ' +
    '국면이 3국 협상의 균열로 번지지 않게 막는 일이었다. 발칸 전쟁기(1912~13)에는 스스로 ' +
    '«그레이의 메가폰»이라 부른 역할로 러시아에 자제를 권하는 훈령을 수행했다. ' +
    '\n\n' +
    '7월 위기(1914). 07-24 아침 사조노프의 전화(«전쟁을 뜻하는 최후통첩»)로 프랑스 대사관 ' +
    '3자 회동에 불려갔다. 팔레올로그가 프랑스의 전면 지원을 확약한 자리에서 뷰캐넌은 ' +
    '영국의 연대나 참전을 약속하기를 거부했고 — 그레이는 «매우 어려운 상황에서 전적으로 ' +
    '옳게 말했다»고 추인했다. 다만 독일·오스트리아에 대한 경고를 본부에 건의하는 등 ' +
    '억지에도 힘썼다. 그의 7월 위기 처신이 러시아를 자제시키려는 것이었는지에 대해서는 ' +
    '지금도 사학사 논쟁이 있으나(영 2018은 옹호론), 러시아 총동원 국면의 보고가 정확했는 ' +
    '지에 대한 비판과 함께 다뤄진다. ' +
    '\n\n' +
    '전시 페트로그라드(1914~1916). 콘스탄티노플 합의(1915-03)의 전달 창구, 군수·차관 조율, ' +
    '이탈리아 참전 교섭 지원 등 연합 전쟁수행의 현지 축이었다. 두마 자유주의 진영(로쟌코· ' +
    '밀류코프 등)과 폭넓게 교류해 궁정과 의회 양쪽에 닿는 드문 대사였고, 1916년 모스크바 ' +
    '명예시민(외국인에게는 이례)과 모스크바 대학 명예회원이 되었다. 부인 조지아나는 ' +
    '페트로그라드에서 부상병 병원을 꾸렸다. ' +
    '\n\n' +
    '1917년 — 경고, 혁명, 임시정부. 01-12(구력 1916-12-30) 차르스코예셀로에서 니콜라이 ' +
    '2세를 알현해, 본국 승인 아래 자신의 이름으로 «폐하와 인민 사이에 장벽이 생겼다»며 ' +
    '두마가 신임하는 정부를 세우지 않으면 혁명과 파국이 온다고 직언했다 — 황제는 «고맙소, ' +
    '조지 경»이라 답했고, 직후 접견한 재무장관 바르크는 황제가 그토록 동요한 모습을 본 적 ' +
    '이 없다고 회고했다(황후는 대사 소환을 검토할 만큼 격노). 이것이 마지막 정식 알현이 ' +
    '되었다. 2월 혁명 후 03-24(감기로 이틀 늦어) 프랑스·이탈리아 대사와 함께 임시정부를 ' +
    '공동 승인했다 — 협상국 대사단의 수석(도이엔)으로서 가장 먼저 발언했다(중립국이던 ' +
    '미국의 프랜시스 대사가 이틀 앞서 단독 승인). 로마노프 일가 망명 문제에서는 03-23 ' +
    '밀류코프에게 영국 정부의 수용 의사를 전달했으나 제안은 4월 조지 5세 자신의 강력한 ' +
    '요청으로 철회되었다 — 회고록에서는 «제안은 철회된 적이 없다»며 임시정부 측 사정을 ' +
    '이유로 들었지만, 딸 메리엘은 아버지가 진실을 쓰려 하자 외무부가 연금을 볼모로 막았고 ' +
    '국왕의 책임을 덮은 것이라 폭로했다(1932). ' +
    '\n\n' +
    '볼셰비키와 철수(1917~1918). 10월 혁명 후 볼셰비키 정부를 승인하지 않은 채 잔류하며, ' +
    '11-27에는 «러시아에게 약속을 돌려주자»(1914년 단독 강화 금지 협정에서 풀어주자)는 ' +
    '전보를 본부에 보냈다. 12월 중순 현기증 발작으로 쓰러진 뒤 병가를 얻어 1918-01-07 ' +
    '(구력 1917-12-25) 새벽 핀란드역에서 페트로그라드를 떠났다 — 트로츠키는 출국에 편의를 ' +
    '제공했다. 이후 대사는 다시 임명되지 않았다. 귀국 후 군주제 망명자들로부터 «혁명의 ' +
    '주모자»라는 비난(팔레이 공비 회고 등)에 시달렸는데, 그는 음모(궁정 쿠데타·라스푸틴 ' +
    '암살)를 사전에 전해 들은 사실은 인정하면서도 관여는 부인했다. ' +
    '\n\n' +
    '만년(1918~1924). 귀국 후에는 연합국의 대러 개입과 백군(데니킨) 지원을 지지했다. ' +
    '기대하던 귀족 작위는 끝내 받지 못했고, 주이탈리아 대사(1919~1921)를 끝으로 45년의 ' +
    '외교관 생활을 마감했다. 1922년 부인과 사별했고, 1923년 회고록 «My Mission to Russia ' +
    'and Other Diplomatic Memories»(전 2권, 카셀)를 출간한 뒤 1924-12-20 런던 자택에서 ' +
    '사망했다(향년 70세). ' +
    '\n\n' +
    '평가. 제정 러시아의 마지막 국면을 지킨 협상국 외교의 얼굴. 궁정·정부·두마 어디에나 ' +
    '닿는 신망으로 «무관의 왕» 소리를 들었으나, 바로 그 영향력 때문에 혁명 방조자라는 ' +
    '멍에도 함께 졌다. 혁명 전야의 경고와 로마노프 망명 무산은 20세기 외교사의 «만약»으로 ' +
    '남아 있다.',
}

// ── 재임(외교관 헤드오브미션 4건) ────────────────────────────────────────────
interface DiplomatTenureSpec {
  title: string
  definitionTitle: '대사' | '특명전권공사'
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  notes: string
}

const TENURES: DiplomatTenureSpec[] = [
  {
    title: '주불가리아 외교대표 겸 총영사',
    definitionTitle: '특명전권공사',
    startYear: 1903, startMonth: 11, startDay: 14,
    endYear: 1909, endMonth: 5, endDay: 28,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '주네덜란드 공사로 전보 (헤이그 임명 관보 1909-05-28을 종료일로 삼음) — 관례 표기는 ' +
      '1903~1908.',
    notes:
      '외무부 임명장 1903-11-14(관보 12-01), 부임은 1904년 초. 불가리아가 아직 오스만 ' +
      '종주권 아래의 공국이어서 당대 정식 직함은 외교대표(agent) 겸 총영사 — 별도 관보 ' +
      '(12-29)로 개인 계급 전권공사(Minister Plenipotentiary)를 부여받았다(영어 위키의 ' +
      '«특명전권공사 1903~1908» 표기는 소급 관례). 페르디난트 공은 주러 대사였던 아버지를 ' +
      '기려 그를 환대. 1908-10-05 티르노보 독립 선언(구력 09-22)을 현지에서 지켜봤고, ' +
      '1908-08 말 헤이그 전임이 내정된 뒤에도 «위기를 끝까지 지켜보라»는 요청에 1909년 ' +
      '봄까지 잔류했다.',
  },
  {
    title: '주네덜란드 공사 (룩셈부르크 겸임)',
    definitionTitle: '특명전권공사',
    startYear: 1909, startMonth: 5, startDay: 28,
    endYear: 1910, endMonth: 11, endDay: 23,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '주러시아 대사로 영전 (러시아 임명 외무부 고시 1910-11-23).',
    notes:
      '헤이그 주재 특명전권공사 — 임명 관보 1909-05-28(전임 하워드가 1908년 이임해 관례 ' +
      '표기는 1908~1910이나, 소피아 위기 잔류로 실제 부임은 1909년). 1910-07-16 그레이 ' +
      '외무장관이 니콜슨의 본부 전보(사무차관)로 비게 된 페테르부르크 대사직을 서한으로 ' +
      '제안했다.',
  },
  {
    title: '주러시아 대사',
    definitionTitle: '대사',
    startYear: 1910, startMonth: 11, startDay: 23,
    endYear: 1918, endMonth: 1, endDay: 7,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '현기증 발작(1917-12 중순) 후 병가 귀국 — 1918-01-07(구력 1917-12-25) 새벽 핀란드역 ' +
      '출발. 볼셰비키 정부 불승인 상태라 후임 대사는 임명되지 않았고(대리공사 린들리 잔류) ' +
      '재임은 관례상 1918년 종료로 표기된다.',
    notes:
      '외무부 고시 1910-11-23(관보 11-25, 니콜슨 후임), 11월 말 사은숙배, 12월 초 ' +
      '페테르부르크 도착 — 신임 외무장관 사조노프와 임기가 거의 정확히 겹친다. 제1차 ' +
      '세계대전기 페트로그라드 협상국 외교의 축(독일 측 별칭 «러시아의 무관의 왕»). 포츠담 ' +
      '협정 국면 관리 → 발칸 전쟁기 «그레이의 메가폰» → 7월 위기 3자 회동(영국의 연대 ' +
      '약속 거부, 그레이 추인) → 콘스탄티노플 합의 전달·군수 조율 → 1917-01-12 니콜라이 ' +
      '2세 알현 혁명 경고(마지막 정식 알현) → 03-24 임시정부 공동 승인(도이엔으로 첫 발언) ' +
      '→ 로마노프 망명 문제(03-23 수용 전달, 4월 국왕 요청으로 철회) → 10월 혁명 후 잔류 ' +
      '끝 철수까지 제정 최후 국면의 목격자.',
  },
  {
    title: '주이탈리아 대사',
    definitionTitle: '대사',
    startYear: 1919,
    endYear: 1921,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail: '1921년 외교관 생활 45년을 마감하고 은퇴 — 기대하던 귀족 작위는 못 받았다.',
    notes: '러시아 철수 후의 마지막 임지(로마 주재) — 전임 레넬 로드(~1919)·후임 그레이엄(1921~).',
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
    title: '코펜하겐 출생',
    category: 'FAMILY',
    startYear: 1854, startMonth: 11, startDay: 25,
    description:
      '주덴마크 공사 앤드루 뷰캐넌 경(후일 주러시아 대사 1864~71·초대 준남작)의 아들로 ' +
      '아버지의 임지에서 출생 — 어머니 프랜시스 멜리시는 9일 뒤 세상을 떠났다.',
  },
  {
    title: '외교관 입직 — 빈 대사관 관보',
    category: 'CAREER',
    startYear: 1876,
    description:
      '웰링턴 칼리지 수학 후 대학을 거치지 않고 외교관 시험으로 입직 — 첫 보직은 아버지가 ' +
      '대사로 있던 빈 대사관의 관보(attaché).',
  },
  {
    title: '로마 3등서기관',
    category: 'CAREER',
    startYear: 1878, endYear: 1879,
    description: '파젯 대사 아래서 «행복한 1년 반»(회고록).',
  },
  {
    title: '도쿄 2등서기관',
    category: 'CAREER',
    startYear: 1880, endYear: 1883,
    description: '1879년 말 임명, 미국을 거쳐 1880년 부임 — 1883년 초 이임.',
  },
  {
    title: '빈 2등서기관 복귀',
    category: 'CAREER',
    startYear: 1883, endYear: 1888,
    description: '이 시기 약혼·결혼. 1888년 여름 외무부 본부 교환 근무 후 베르네로.',
  },
  {
    title: '조지아나 배서스트와 결혼',
    category: 'FAMILY',
    startYear: 1885, startMonth: 2, startDay: 25,
    description:
      '제6대 배서스트 백작의 딸 조지아나 메리엘(1863~1922)과 결혼 — 부인은 WWI기 ' +
      '페트로그라드에서 부상병 병원을 꾸렸고, 외동딸 메리엘(1886~1959)은 페트로그라드 ' +
      '시절을 기록한 작가가 된다.',
  },
  {
    title: '다름슈타트 대리공사',
    category: 'CAREER',
    startYear: 1893, endYear: 1900,
    description:
      '1892년 말 공사관 서기관 승진 — 코부르크行이 빅토리아 여왕의 반대로 무산되고 헤센 ' +
      '대공국 다름슈타트로. 대공 에른스트 루트비히와 친교, 1899년 카를스루에 겸임. 보어 ' +
      '전쟁기 독일 군중의 반영 감정 보고에 여왕이 «우리는 잊지 않을 것»이라 답한 일화.',
  },
  {
    title: '니콜라이 2세와의 첫 만남',
    category: 'DIPLOMATIC',
    startYear: 1896,
    description:
      '다름슈타트를 찾은 황제 부부를 궁정극장 갈라 공연 막간에 처음 알현(솔즈베리의 훈령 ' +
      '으로 아르메니아 문제 의중 타진) — 1897년 볼프스가르텐 체류 때는 사적 접견까지. ' +
      '황후 알렉산드라가 헤센 대공가 출신이라 맺어진, 20년 뒤 페테르부르크 부임의 자산.',
  },
  {
    title: '베네수엘라 국경중재 영국 대표',
    category: 'DIPLOMATIC',
    startYear: 1898, endYear: 1899,
    description:
      '솔즈베리의 제안으로 다름슈타트 대리공사를 겸한 채 영령 기아나-베네수엘라 국경 ' +
      '중재재판 영국 대표 수행(파리 구두변론 54회) — 이 공로로 1900년 신년 서훈 CB.',
  },
  {
    title: '로마·베를린 참사관',
    category: 'CAREER',
    startYear: 1900, endYear: 1903,
    description:
      '1900년 말 로마 대사관 참사관(11개월, 그중 4개월 대리대사) → 1901년 가을 베를린 ' +
      '전보. 보어 전쟁 여파(기선 나포 사건)로 영독 감정이 얼어붙은 시기.',
  },
  {
    title: 'KCVO 서훈 — «조지 경»',
    category: 'AWARD',
    startYear: 1905, startMonth: 3, startDay: 21,
    description: '페르디난트 공의 런던 방문을 계기로 기사 서임 — 이후 «서 조지». (GCVO는 1909-06.)',
  },
  {
    title: '불가리아 독립 선언 국면',
    category: 'DIPLOMATIC',
    startYear: 1908, startMonth: 10, startDay: 5,
    description:
      '티르노보의 독립 선언(구력 09-22)과 페르디난트의 차르 즉위를 현지에서 목격 — 이미 ' +
      '헤이그 전임이 내정된 상태에서 «위기를 끝까지 지켜보라»는 본부 요청에 1909년 봄까지 ' +
      '잔류(동방철도·동루멜리아 공납 교섭).',
  },
  {
    title: '추밀원 위원',
    category: 'AWARD',
    startYear: 1910, startMonth: 11, startDay: 8,
    description: '관보 1910-11-08 — 페테르부르크 부임 직전의 서임. (KCMG 1909·GCMG 1913.)',
  },
  {
    title: '주러시아 대사 임명',
    category: 'DIPLOMATIC',
    startYear: 1910, startMonth: 11, startDay: 23,
    description:
      '그레이의 1910-07-16 서한 제안(니콜슨 후임) — 외무부 고시 11-23·관보 11-25, 11월 말 ' +
      '사은숙배, 12월 초 페테르부르크 도착. 신임 외무장관 사조노프의 환대로 임기 시작.',
  },
  {
    title: '7월 위기 — 3자 회동',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 24,
    description:
      '사조노프의 아침 전화(«전쟁을 뜻하는 최후통첩») 후 프랑스 대사관 3자 회동 — ' +
      '팔레올로그의 전면 지원 확약 옆에서 영국의 연대 약속을 거부했고 그레이가 추인. ' +
      '독일·오스트리아 경고는 본부에 건의. 처신의 성격(억지 vs 오판)은 지금도 사학사 논쟁.',
  },
  {
    title: '모스크바 명예시민',
    category: 'AWARD',
    startYear: 1916,
    description:
      '외국인에게 이례적인 모스크바 명예시민 + 모스크바 대학 명예회원 — 독일 측이 ' +
      '«러시아의 무관의 왕»이라 부르던 절정기. (GCB는 1915-06 국왕 탄신 서훈.)',
  },
  {
    title: '니콜라이 2세 마지막 알현 — 혁명 경고',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 1, startDay: 12,
    description:
      '구력 1916-12-30, 차르스코예셀로. 본국 승인 아래 자신의 이름으로 «폐하와 인민 사이에 ' +
      '장벽이 생겼다»며 두마가 신임하는 정부 없이는 혁명과 파국뿐이라 직언 — 황제는 ' +
      '«고맙소, 조지 경», 직후 접견한 바르크는 황제가 그토록 동요한 모습은 처음이라 회고. ' +
      '황후는 대사 소환을 검토할 만큼 격노. 마지막 정식 알현이 되었다.',
  },
  {
    title: '임시정부 공동 승인',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 3, startDay: 24,
    description:
      '구력 03-11. 프랑스(팔레올로그)·이탈리아(카를로티) 대사와 함께 리보프 공의 임시정부 ' +
      '를 공동 승인 — 협상국 대사단 수석(도이엔)으로 첫 발언(중립국 미국의 프랜시스 대사가 ' +
      '이틀 앞서 단독 승인).',
  },
  {
    title: '로마노프 일가 망명 문제',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 3, startDay: 23,
    description:
      '밀류코프의 요청으로 영국 정부·국왕의 수용 의사를 전달 — 그러나 제안은 4월 조지 5세 ' +
      '자신의 강력한 요청으로 철회. 회고록에서는 «제안은 철회된 적 없다»고 썼으나, 딸 ' +
      '메리엘은 외무부가 연금을 볼모로 진실 기술을 막아 국왕의 책임을 덮은 것이라 폭로 ' +
      '(1932).',
  },
  {
    title: '페트로그라드 철수',
    category: 'TRAVEL',
    startYear: 1918, startMonth: 1, startDay: 7,
    description:
      '구력 1917-12-25 새벽 핀란드역 출발(트로츠키가 출국 편의 제공) — 10월 혁명 후 ' +
      '볼셰비키 불승인 잔류 중 12월 중순 현기증 발작으로 병가 귀국. 01-17 리스 상륙. 다시 ' +
      '러시아 땅을 밟지 못했고, 귀국 후 군주제 망명자들의 «혁명 주모자» 비난에 시달렸다.',
  },
  {
    title: '아내 조지아나와 사별',
    category: 'FAMILY',
    startYear: 1922, startMonth: 4, startDay: 25,
    description: '페트로그라드에서 부상병 병원을 꾸렸던 평생의 동반자.',
  },
  {
    title: '회고록 «My Mission to Russia» 출간',
    category: 'PUBLICATION',
    startYear: 1923,
    description:
      '«My Mission to Russia and Other Diplomatic Memories» 전 2권(런던 카셀) — 로마노프 ' +
      '망명 대목은 «제안은 철회된 적 없다»로 남겨 훗날 딸의 폭로와 대비된다.',
  },
  {
    title: '런던에서 사망',
    category: 'PERSONAL',
    startYear: 1924, startMonth: 12, startDay: 20,
    description:
      '레녹스 가든스 15번지 자택, 향년 70세 — 사이런세스터 체스터턴 묘지 안장(단일 출처).',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BUCHANAN_STATS = {
  politics: 55,
  military: 15,
  diplomacy: 82,
  intellect: 64,
  charisma: 62,
  administration: 56,
  notes:
    '45년을 현장에서 보낸 대물림 직업 외교관의 정점(외교) — 발칸 신흥국·강대국 공관을 두루 ' +
    '거쳐 제정 러시아 최후 국면의 협상국 외교를 이끌었고, 독일 측이 «러시아의 무관의 왕» ' +
    '이라 부를 정도의 현지 장악력을 보였다. 궁정·정부·두마 어디에나 닿는 인망(카리스마)이 ' +
    '무기였고, 군주에게 혁명을 직언할 만큼 정세 판단(정치)도 갖췄으나 본국의 결정(로마노프 ' +
    '망명 철회)을 뒤집을 힘은 없었다. 군사 경력은 전무하고, 행정은 대사관 운영에 한정.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBuchanan(prisma: PrismaService): Promise<void> {
  console.log('\n🎩 조지 뷰캐넌(George Buchanan) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const unitedKingdom = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 및 아일랜드 연합왕국' },
    select: { id: true },
  })
  if (!unitedKingdom) {
    console.warn(
      '  ⚠️  그레이트브리튼 및 아일랜드 연합왕국 HC 미존재 — 먼저 seedBritainHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  const ambassadorDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '대사' },
    select: { id: true },
  })
  const envoyDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '특명전권공사' },
    select: { id: true },
  })
  const defByTitle: Record<DiplomatTenureSpec['definitionTitle'], string | undefined> = {
    대사: ambassadorDef?.id,
    특명전권공사: envoyDef?.id,
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'George William Buchanan' } },
        { AND: [{ name: '조지' }, { surname: '뷰캐넌' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = BUCHANAN.originalName
    if (!person.biography) patch.biography = BUCHANAN.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BUCHANAN.birthPlaceText
    if (!person.birthNote) patch.birthNote = BUCHANAN.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BUCHANAN.deathPlaceText
    if (!person.deathType) patch.deathType = BUCHANAN.deathType
    if (!person.deathCause) patch.deathCause = BUCHANAN.deathCause
    if (!person.deathNote && BUCHANAN.deathNote) patch.deathNote = BUCHANAN.deathNote
    if (person.influence == null) patch.influence = BUCHANAN.influence
    if (!person.historicalCountryId) patch.historicalCountryId = unitedKingdom.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BUCHANAN.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BUCHANAN.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BUCHANAN.name,
        middleName: BUCHANAN.middleName,
        surname: BUCHANAN.surname,
        originalName: BUCHANAN.originalName,
        biography: BUCHANAN.biography,
        birthDate: toDate(BUCHANAN.birthYear, BUCHANAN.birthMonth, BUCHANAN.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BUCHANAN.birthNote,
        deathDate: toDate(BUCHANAN.deathYear, BUCHANAN.deathMonth, BUCHANAN.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BUCHANAN.deathType,
        deathCause: BUCHANAN.deathCause,
        deathNote: BUCHANAN.deathNote,
        gender: BUCHANAN.gender,
        nameDisplayOrder: 'western' as any,
        influence: BUCHANAN.influence,
        birthPlaceText: BUCHANAN.birthPlaceText,
        deathPlaceText: BUCHANAN.deathPlaceText,
        historicalCountryId: unitedKingdom.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BUCHANAN.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 외교관 재임 (DIPLOMATIC_POST x4) ─────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: unitedKingdom.id,
        positionType: GovernmentPositionType.DIPLOMATIC_POST,
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
        historicalCountryId: unitedKingdom.id,
        positionDefinitionId: defByTitle[t.definitionTitle] ?? undefined,
        positionType: GovernmentPositionType.DIPLOMATIC_POST,
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
      historicalCountryId: unitedKingdom.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 그레이트브리튼 및 아일랜드 연합왕국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: unitedKingdom.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note:
          '복무 전 기간(1876~1921)의 국가. 1922년 아일랜드 자유국 분리(→그레이트브리튼 및 ' +
          '북아일랜드 연합왕국)는 은퇴 후의 일이라 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 그레이트브리튼 및 아일랜드 연합왕국 (출생·복무 1854~1924)')
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
        politics: BUCHANAN_STATS.politics,
        military: BUCHANAN_STATS.military,
        diplomacy: BUCHANAN_STATS.diplomacy,
        intellect: BUCHANAN_STATS.intellect,
        charisma: BUCHANAN_STATS.charisma,
        administration: BUCHANAN_STATS.administration,
        notes: BUCHANAN_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BUCHANAN_STATS.politics}·군사 ${BUCHANAN_STATS.military}·` +
        `외교 ${BUCHANAN_STATS.diplomacy}·학식 ${BUCHANAN_STATS.intellect}·` +
        `카리스마 ${BUCHANAN_STATS.charisma}·행정 ${BUCHANAN_STATS.administration}`,
    )
  }

  console.log('✅ 조지 뷰캐넌 시딩 완료\n')
}
