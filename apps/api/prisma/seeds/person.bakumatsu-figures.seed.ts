/**
 * 막부 말기(幕末) 주요 인물 4인 시드 — 14대 이에모치~15대 요시노부 시기 일본 정치·외교의
 * 핵심 행위자들.
 *
 *   1. 오구리 다다마사(小栗忠順, 1827~1868) — 막부 후기 최고 관료. 1860 만엔 견미사절·
 *      1865 요코스카 제철소 건설·해군봉행·감정봉행·외국봉행 역임. 1868 보신 전쟁 후
 *      신정부군에 의해 영지 곤다에서 참수.
 *   2. 토머스 글로버(Thomas Blake Glover, 1838~1911) — 스코틀랜드 출신 무역상. 1859
 *      나가사키 도착·1861 글로버 상회 설립·사쓰마/조슈에 무기·선박 공급, 조슈 5걸·
 *      사쓰마 19인 영국 밀항 주선. "일본 산업혁명의 산파".
 *   3. 해리 파크스(Sir Harry Smith Parkes, 1828~1885) — 1865~1883 주일 영국 공사
 *      18년 재임. 막부에서 토막 세력으로 영국 외교 노선 전환의 결정적 인물.
 *   4. 레옹 로슈(Léon Roches, 1809~1900) — 1864~1868 주일 프랑스 공사. 막부 친프랑스
 *      정책의 핵심 후원자, 오구리·요시노부와 협력해 요코스카 제철소·군제 개혁 추진.
 *
 *   ⚠️ 기존 데이터 보존 모드 + 사망정보 backfill.
 *   ⚠️ 의존: 도쿠가와 막부 HC + 영국(GB)·프랑스(FR) 현대 국가 기등록.
 *
 * 등록 항목:
 *   - Person x4
 *   - PersonStats x4
 *   - PersonCountryAffiliation (각 인물별 적절히)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

type AffiliationSpec = {
  type: 'CITIZENSHIP' | 'PRIMARY_RESIDENCE' | 'SERVED' | 'BIRTH_PLACE' | 'EXILE' | 'OTHER'
  countryIso?: string
  historicalCountryName?: string
  startYear?: number
  endYear?: number
}

interface TenureSpec {
  title: string
  titleEn?: string
  titleLocal?: string
  positionType: GovernmentPositionType
  countryIso?: string
  historicalCountryName?: string
  termNumber?: number
  startYear: number; startMonth: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  appointmentMethod?: AppointmentMethod
  endReason?: TenureEndReason
  endReasonDetail?: string
  notes?: string
}

interface PersonSpec {
  name: string
  surname?: string
  originalName: string
  regnalName?: string
  gender: 'MALE' | 'FEMALE'
  nameDisplayOrder: 'korean' | 'western'
  birthYear: number; birthMonth: number; birthDay: number
  deathYear: number; deathMonth: number; deathDay: number
  birthPlaceText: string
  deathPlaceText: string
  deathType: DeathType
  deathCause: string
  deathNote: string
  biography: string
  influence: number
  stats: {
    politics: number
    military: number
    diplomacy: number
    intellect: number
    charisma: number
    administration: number
    notes: string
  }
  affiliations: AffiliationSpec[]
  tenures?: TenureSpec[]
}

// ── 1) 오구리 다다마사 (小栗忠順) ────────────────────────────────────────
const OGURI: PersonSpec = {
  name: '다다마사',
  surname: '오구리',
  originalName: 'Oguri Tadamasa (小栗忠順)',
  regnalName: '코즈케노스케',
  gender: 'MALE',
  nameDisplayOrder: 'korean',
  birthYear: 1827, birthMonth: 7, birthDay: 16,
  deathYear: 1868, deathMonth: 5, deathDay: 27,
  birthPlaceText: '에도 막부 무사시국 에도(江戸) 스루가다이 오구리가 저택 — 현 도쿄도 지요다구',
  deathPlaceText: '고즈케국 군마군 곤다무라(権田村) 도자와강(烏川) 강변 — 현 군마현 다카사키시 구라가노',
  deathType: DeathType.EXECUTION,
  deathCause: '신정부군 참수형 (재판 없이 처형, 향년 40세)',
  deathNote:
    '1868-05-27(메이지 1년 음력 4월 6일) 본인의 영지 고즈케국 곤다무라 도자와강 강변에서 ' +
    '신정부군(東山道鎮撫総督府, 도산도진부총독부) 군감 도리오 고야타(鳥尾小弥太)·하라 야스타로 ' +
    '(原保太郎) 등의 명령으로 정식 재판 없이 참수되었다. 향년 40세(만 40세). 직접 죄목은 ' +
    '"막부 직속군 보병 잔당과 결탁해 신정부에 저항할 음모"였으나 동시기·후일 자료 모두 ' +
    '구체적 증거를 제시하지 못해 정치적 처형으로 평가된다. 본인은 처형 직전 "나는 막부에 ' +
    '봉사한 신하로서 죽음을 두려워하지 않으나, 신정부가 재판도 없이 사람을 죽인다면 후세에 ' +
    '큰 화근이 될 것"이라는 취지의 말을 남긴 것으로 전한다. 시신은 처형 직후 곤다 동림사 ' +
    '(東善寺)에 묻혔다. 함께 처형된 가신은 양자 오구리 마타이치로(忠道, 19세)·가신 아라카와 ' +
    '쥬자부로(荒川重三郎) 등 4인. 본인 가족 중 정실 미치코(道子)와 양녀·시녀 등은 군마 산속 ' +
    '으로 도피, 후일 메이지 정부 인사들의 보호로 생존. 사후 약 30년 후인 1894년 메이지 ' +
    '정부는 본인에게 정5위(正五位)를 추증, 후세 "막부 최후의 명관(名官)"·"근대 일본 산업의 ' +
    '아버지"라는 우호적 재평가가 정착.',
  biography:
    '에도 막부 후기 최고 관료·1860 만엔 견미사절 메티슈(目付, 감찰관) 단원·1862~1868 막부 ' +
    '재정·해군·외교의 핵심 책임자. 1827-07-16(분세이 10년 음력 6월 23일) 에도 스루가다이의 ' +
    '에도 막부 직속 하타모토(旗本) 오구리 다다타카(忠高)의 장남으로 출생. 본명 다다마사 ' +
    '(忠順), 통칭 분고노카미(豊後守)·코즈케노스케(上野介)로 자주 불렸다. 오구리 가문은 ' +
    '미카와 시대부터 도쿠가와가에 봉사한 2,500석의 명문 하타모토.\n\n' +
    '1860 만엔 견미사절(万延元年遣米使節) — 미국 방문. 1858 미일수호통상조약의 비준서 교환 ' +
    '임무로 1860-01 ~ 11 약 10개월간 미국·아프리카·동남아시아를 일주, 일본인 사상 최초의 ' +
    '"공식 세계일주" 사절단의 일원이 되었다. 본인은 메티슈(감찰관, 사절 부책임자) 자격으로 ' +
    '단장 신미 마사오키(新見正興)·부단장 무라가키 노리마사(村垣範正)와 함께 1860-02-13 ' +
    '시나가와 출항 → 호놀룰루 → 샌프란시스코 → 파나마 → 워싱턴 D.C. → 뉴욕 → 대서양 → ' +
    '아프리카 → 인도양 → 자카르타 → 1860-11-09 시나가와 귀항. 워싱턴 D.C.에서 1860-05-17 ' +
    '뷰캐넌 대통령 면담·비준서 교환. 미국의 산업·해군 시설을 직접 시찰하면서 충격적 ' +
    '"근대화 필요성"을 자각, 후일 막부 근대화 정책의 사상적 출발점이 되었다.\n\n' +
    '1862~1868 막부 핵심 관료직 역임. 미국 귀국 후 (1)1861 외국봉행(外国奉行)·메티슈 ' +
    '겸직 (2)1862-08 감정봉행(勘定奉行, 막부 재정 책임자) (3)1864 해군봉행(海軍奉行) ' +
    '(4)1866 보병봉행(歩兵奉行) (5)1868 한자(勘定) 가시라(가시라봉행)까지 막부 핵심 ' +
    '실무직 다수 역임. 약 7년간 막부의 사실상 실무 총책임자였다.\n\n' +
    '1865 요코스카 제철소(横須賀製鉄所) — 일본 산업혁명의 출발점. 본인이 주일 프랑스 공사 ' +
    '레옹 로슈(Léon Roches)와 협력해 1865-09 요코스카에 본격적 근대 조선·제철소 건설을 ' +
    '시작. 프랑스 기술자 프랑수아 베르니(François Verny) 총감독, 약 4,000명 노동자, 약 ' +
    '240만 달러(약 2.4억 엔 현재 가치) 막부 자금 투입. 1871년 메이지 정부가 인수해 ' +
    '"요코스카 조선소(横須賀造船所)"로 운영, 후일 일본 해군의 핵심 기지로 1907년 첫 ' +
    '국산 전함 "쓰쿠바(筑波)" 건조. 일본 근대 조선·중공업의 시발점이며 본인은 "근대 일본 ' +
    '산업의 아버지"로 재평가되었다.\n\n' +
    '"한미와 함께 가자(米国と歩調を合わせる)" — 친미·친불 외교 노선. 본인의 외교 노선은 ' +
    '(1)미국·프랑스와 협력하는 막부 자체 근대화 → 막번 체제 유지 + 산업화 (2)영국 ' +
    '주도의 사쓰마·조슈 토막 노선에 대한 견제 (3)다이묘 회의(公議)가 아닌 막부 친정 ' +
    '체제 강화의 3축으로 요약된다. 15대 요시노부와는 외교 노선에서 미묘한 차이가 있었으나 ' +
    '본인은 끝까지 막부 측에 충실히 봉사했다.\n\n' +
    '1868 보신 전쟁 — 신정부군에 의한 처형. 1868-01-27 ~ 30 도바·후시미 전투에서 막부군 ' +
    '패배 → 1868-04-11 에도성 무혈 개성 직전 본인은 막부 군제 개혁의 책임을 지고 ' +
    '"막부 직속 보병 1만 명의 항전" 안을 요시노부에 제안했으나 거부됨. 결국 1868-03 ' +
    '한자가시라봉행 사임 → 영지 곤다무라(現 군마현 다카사키시)로 귀향. 약 1개월 후 ' +
    '1868-04-21 신정부군에 체포 → 5-27 정식 재판 없이 곤다 도자와강 강변에서 참수 — ' +
    '향년 40세. 죄목은 "막부 보병 잔당과 결탁한 음모"였으나 구체적 증거는 없었다.\n\n' +
    '장기 유산. (1)1860 만엔 견미사절로 일본인 사상 최초의 공식 세계일주 (2)1865 요코스카 ' +
    '제철소 건설로 "근대 일본 산업의 아버지" 평가 — 메이지 산업혁명의 사실상 출발점 ' +
    '(3)막부 재정·해군·외교의 약 7년간 사실상 총책임자 (4)1868 정식 재판 없이 참수된 ' +
    '"막부 최후의 충신" 이미지 — 후세 평가는 시바 료타로 등에 의해 우호적으로 재정착 ' +
    '(5)1894 메이지 정부가 정5위 추증, 출생지 군마현 다카사키에 기념관·동상.',
  influence: 80,
  stats: {
    politics: 80,
    military: 70,
    diplomacy: 80,
    intellect: 90,
    charisma: 65,
    administration: 92,
    notes:
      '막부 후기 최고급 행정 관료 — 일본사 평가에서 "막부 최후의 명관(名官)". 행정 능력은 ' +
      '재정·해군·외교 다축 동시 운영의 결정적 실력. 학식은 만엔 견미사절에서 미국 산업 ' +
      '시설 직접 시찰 후 "근대화 필요성"을 직관적으로 파악하는 통찰력. 외교는 미·불 협력 ' +
      '노선의 일관된 추진. 정치는 막부 친정 체제 강화 노선 — 결과적으로 토막에 패배. 군사는 ' +
      '직접 지휘 경험 적으나 보병봉행으로 막부군 근대화 추진. 카리스마는 가신단·외국인 ' +
      '협력자들에게 신뢰받은 점에서 양호. 본인 평가는 1868 참수 후 "비운의 충신"·"근대 ' +
      '일본 산업의 아버지"로 우호적으로 재정착.',
  },
  affiliations: [
    { type: 'CITIZENSHIP', historicalCountryName: '도쿠가와 막부', startYear: 1827, endYear: 1868 },
  ],
  tenures: [
    {
      title: '외국봉행',
      titleEn: 'Commissioner of Foreign Affairs',
      titleLocal: '外国奉行',
      positionType: GovernmentPositionType.CABINET_MINISTER,
      historicalCountryName: '도쿠가와 막부',
      startYear: 1860, startMonth: 12, startDay: 23,
      endYear: 1862, endMonth: 6, endDay: 25,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.REMOVAL,
      endReasonDetail: '1862-06-25(文久2年5月28日) 보직 해임 — 직접 사유는 자료마다 차이.',
      notes:
        '만엔 견미사절(1860-01~11) 귀국 직후 1860-12-23(万延元年11月11日) 외국봉행 임명. 약 ' +
        '1년 6개월 재임 중 안세이 5개국 조약 후속 실무·요코하마 거류지 확장·생사 무역 관련 ' +
        '문제 처리. 본인 정치 경력의 출발점이자 미국 시찰 경험을 직접 적용한 첫 직책.',
    },
    {
      title: '감정봉행',
      titleEn: 'Commissioner of Finance',
      titleLocal: '勘定奉行',
      positionType: GovernmentPositionType.CABINET_MINISTER,
      historicalCountryName: '도쿠가와 막부',
      startYear: 1862, startMonth: 8, startDay: 21,
      endYear: 1868, endMonth: 1, endDay: 15,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail:
        '1868-01-15 대정봉환·도바·후시미 패전 후 일괄 보직 해임 — 군마현 곤다 영지로 귀향.',
      notes:
        '막부 재정 책임자(감정봉행). 1862-08-21(文久2年閏7月25日) 첫 취임 후 분리·복귀를 ' +
        '거듭하며 약 5년 5개월간 4~5차례 임면. 사실상 막부 최후 5년의 재정 운영 총책임자. ' +
        '겐로쿠 화폐 개주 이래의 만성 인플레이션·요코스카 제철소 건설 자금·프랑스 군사 ' +
        '사절단 비용 등을 처리. 정확한 분리·복귀 시점은 자료마다 차이가 있으나 1862-08~ ' +
        '1868-01의 통합 기간으로 표시.',
    },
    {
      title: '군함봉행',
      titleEn: 'Commissioner of Warships (Navy)',
      titleLocal: '軍艦奉行',
      positionType: GovernmentPositionType.CABINET_MINISTER,
      historicalCountryName: '도쿠가와 막부',
      startYear: 1864, startMonth: 9, startDay: 6,
      endYear: 1865, endMonth: 8, endDay: 23,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1865-08-23 군함봉행에서 해임 — 보병봉행 등 다른 직책으로 전임.',
      notes:
        '약 11개월 재임. 군함봉행은 막부 해군의 실무 책임자. 본인은 미국 시찰 경험을 바탕으로 ' +
        '(1)함선 도입 결정 (2)요코스카 제철소 건설 시작(1865-09 첫 삽) (3)프랑스 해군 사절단 ' +
        '유치 등 막부 해군 근대화의 핵심을 추진했다.',
    },
    {
      title: '보병봉행',
      titleEn: 'Commissioner of Infantry (Army)',
      titleLocal: '歩兵奉行',
      positionType: GovernmentPositionType.CABINET_MINISTER,
      historicalCountryName: '도쿠가와 막부',
      startYear: 1866, startMonth: 8, startDay: 9,
      endYear: 1867, endMonth: 12, endDay: 15,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail:
        '1867-12 대정봉환 후 보병봉행 → 가시라(勘定奉行頭取格)로 전임 — 막부 최후 보직.',
      notes:
        '약 1년 4개월 재임. 보병봉행은 막부 직속 보병 부대(歩兵組)의 총책임자. 본인은 프랑스 ' +
        '군사 사절단(샤를 슈누알디 중령)의 자문으로 막부 보병 약 7,000명을 프랑스식 군제로 ' +
        '편성·교련. 1868 도바·후시미 전투에서 이 부대가 사쓰마·조슈군과 직접 교전했다.',
    },
  ],
}

// ── 2) 토머스 글로버 (Thomas Blake Glover) ──────────────────────────────
const GLOVER: PersonSpec = {
  name: '토머스',
  surname: '글로버',
  originalName: 'Thomas Blake Glover',
  gender: 'MALE',
  nameDisplayOrder: 'western',
  birthYear: 1838, birthMonth: 6, birthDay: 6,
  deathYear: 1911, deathMonth: 12, deathDay: 16,
  birthPlaceText: '영국 스코틀랜드 애버딘셔 프레이저버그(Fraserburgh, Aberdeenshire)',
  deathPlaceText: '일본 제국 도쿄부 도쿄시 아자부구(麻布区) — 현 도쿄도 미나토구 아자부',
  deathType: DeathType.ILLNESS,
  deathCause: '동맥경화성 신부전 추정 (향년 73세)',
  deathNote:
    '1911-12-16(메이지 44년) 도쿄 아자부 자택에서 향년 73세에 사망. 사망 약 1년 전부터 ' +
    '신장 질환·동맥경화가 진행되어 만성 신부전이 유력 사인이다. 임종 시 후처 쓰루(ツル)는 ' +
    '이미 사망(1899)했고, 외아들 토머스 알버트(倉場富三郎, Kuraba Tomisaburō, 1870~1945, ' +
    '본인과 일본인 측실 야마무라 가게(山村ツル) 사이의 자녀)·딸 한나(Hannah)가 동석. 일본 ' +
    '정부 차원에서 메이지 천황의 칙사 파견·근대 일본 산업화 기여 공로 인정. 시신은 도쿄 ' +
    '아자부의 외국인 묘지에 일시 안치 후 1959 나가사키 사카모토 국제 묘지(坂本国際墓地)로 ' +
    '이장 — 본인이 약 30년간 거주한 나가사키 글로버 가든이 내려다보이는 위치. 외아들 ' +
    '쿠라바 도미사부로는 1945-08-26 나가사키 원폭 투하 약 3주 후 자택에서 자살.',
  biography:
    '스코틀랜드 출신 무역상·"일본 산업혁명의 산파". 1838-06-06 영국 스코틀랜드 애버딘셔 ' +
    '프레이저버그에서 자딘 매더슨 상회 직원 토머스 베리(Thomas Berry Glover, 1805~1878)의 ' +
    '5남으로 출생. 1857년 19세에 자딘 매더슨 상회(Jardine, Matheson & Co.) 상하이 지점에 ' +
    '입사, 1859-09 21세에 자딘 매더슨 나가사키 대리인으로 부임 — 일본 개국 직후의 ' +
    '제일선이었다.\n\n' +
    '1861 글로버 상회 설립. 1861-03 23세에 자딘 매더슨에서 독립해 나가사키에 글로버 상회 ' +
    '(Glover & Co.) 설립. 1860년대 초 차·생사 무역에서 시작해 1863년부터는 (1)서구 무기· ' +
    '함선의 사쓰마·조슈·토사 등 토막 측 다이묘에 판매 (2)일본 청년의 영국 밀항 주선 ' +
    '(3)다카시마 탄광·고스게 조선소 개발의 3축으로 사업 확장. 막부 측이 명령한 "외국인의 ' +
    '다이묘 무기 판매 금지"를 사실상 어기는 사업이었으나 영국 영사관의 보호로 지속.\n\n' +
    '1865 조슈 5걸·1866 사쓰마 19인 영국 밀항 주선. 1863-05 본인이 직접 알선·자비로 ' +
    '"조슈 5걸(長州五傑, 후일 이토 히로부미·이노우에 가오루·야마오 요조·엔도 긴스케· ' +
    '이노우에 마사루)"의 영국 밀항을 주선 — 일본 근대 정치 지도자의 영국 유학 출발점. ' +
    '1865-04 "사쓰마 19인(薩摩スチューデント)"의 영국 밀항도 알선(고다이 도모아쓰·모리 ' +
    '아리노리·테라시마 무네노리 등). 막부 시기 외국 도항 금지 위반이었으나 메이지 유신 ' +
    '후 이들 인물의 약 절반이 메이지 정부 핵심 각료가 되었다.\n\n' +
    '1865 다카시마 탄광·고스게 조선소 — 일본 산업혁명의 출발. 본인이 1865 사가번과 합작해 ' +
    '다카시마 탄광(高島炭鉱, 나가사키 앞바다)을 일본 최초의 근대 광산으로 개발. 1869 ' +
    '고스게 슬립(小菅修船場, 일본 최초 서양식 건조 도크) 건립. 두 시설 모두 1870년대 ' +
    '미쓰비시에 인수되어 "미쓰비시 그룹"의 출발점이 되었다. 본인은 1881년 미쓰비시 고문 ' +
    '취임.\n\n' +
    '1868 보신 전쟁 — 신정부 측 지원. 1868 보신 전쟁 시 사쓰마·조슈에 무기·함선을 ' +
    '지속 공급, 신정부 측 군사력의 사실상 무기 공급원. 1869 글로버 상회가 막부 시기의 ' +
    '대규모 부채로 1870-08 파산했으나, 본인은 1881 미쓰비시 고문으로 재기 — 사실상 ' +
    '신정부의 보호를 받은 셈이었다.\n\n' +
    '메이지 시대 — 미쓰비시 고문·기린맥주 설립. 1881~1908 약 27년간 미쓰비시 그룹 고문 ' +
    '으로 (1)나가사키 조선소(현 미쓰비시 중공업) (2)다카시마·미이케 탄광 (3)1899 기린 ' +
    '맥주(Kirin Beer) 공동 설립 — 본인이 일본 최초의 본격적 양조 산업의 시발자 (4)일본은행 ' +
    '고문 등 다축 자문. 1908-07 메이지 정부로부터 외국인 최고 영예 훈공장 2등을 수여받음 ' +
    '— 일본인이 아닌 자에게 거의 처음 수여된 사례.\n\n' +
    '1911 사망 — 시신 일·영 양국 추모. 1911-12-16 도쿄 아자부 자택에서 향년 73세에 동맥 ' +
    '경화성 신부전으로 사망. 일본 정부 차원의 메이지 천황 칙사 파견·국장에 준하는 격조의 ' +
    '추모. 시신은 1959 나가사키 사카모토 국제 묘지로 이장. 나가사키의 글로버 저택은 1957 ' +
    '"글로버 가든(グラバー園)"으로 시민에 개방 — 푸치니 오페라 "나비부인(Madama Butterfly)" ' +
    '의 무대 영감지로도 알려졌다. 일본인 후처 쓰루와 외아들 쿠라바 도미사부로의 가계는 ' +
    '"일·영 혼혈의 산업가 일가"로 일본 근대사에 기록.\n\n' +
    '장기 유산. (1)조슈 5걸·사쓰마 19인 영국 밀항 주선으로 메이지 정부 핵심 인물의 영국 ' +
    '유학 출발점 (2)다카시마 탄광·고스게 조선소·요코하마 조선소 등 일본 산업혁명의 사실상 ' +
    '시발자 (3)미쓰비시 그룹 형성의 외국인 핵심 공헌자 (4)1899 기린 맥주 공동 설립 (5)1908 ' +
    '외국인 훈공장 2등 수여로 일본 정부의 공식 인정 (6)나가사키 글로버 가든·"나비부인" ' +
    '오페라 무대 영감지로 문화적 상징.',
  influence: 75,
  stats: {
    politics: 60,
    military: 30,
    diplomacy: 78,
    intellect: 80,
    charisma: 75,
    administration: 85,
    notes:
      '"일본 산업혁명의 산파"라는 우호적 평가가 정설. 행정·사업 능력은 다카시마 탄광· ' +
      '고스게 조선소·미쓰비시 고문·기린 맥주 등 다축 산업 형성에서 최고급. 외교는 ' +
      '사쓰마·조슈와 영국 영사관 사이의 비공식 중재자 역할. 학식은 산업 기술·무역 실무 ' +
      '중심. 정치는 직접 정치 활동은 적으나 메이지 정부 형성에 결정적 비공식 기여. 군사는 ' +
      '무기 판매 사업에 한정. 카리스마는 일본인 가신·동료들에게 신뢰받은 점이 특징.',
  },
  affiliations: [
    { type: 'CITIZENSHIP', countryIso: 'GB', startYear: 1838, endYear: 1911 },
    { type: 'PRIMARY_RESIDENCE', historicalCountryName: '도쿠가와 막부', startYear: 1859, endYear: 1868 },
  ],
}

// ── 3) 해리 파크스 (Harry Smith Parkes) ────────────────────────────────
const PARKES: PersonSpec = {
  name: '해리',
  surname: '파크스',
  originalName: 'Sir Harry Smith Parkes',
  gender: 'MALE',
  nameDisplayOrder: 'western',
  birthYear: 1828, birthMonth: 2, birthDay: 24,
  deathYear: 1885, deathMonth: 3, deathDay: 22,
  birthPlaceText: '영국 잉글랜드 스태퍼드셔 버치힐스 — 현 스태퍼드셔 월솔(Walsall)',
  deathPlaceText: '청나라 직예성 베이징(北京) 영국 공사관 — 현 중국 베이징시',
  deathType: DeathType.ILLNESS,
  deathCause: '말라리아성 폐렴 (향년 57세)',
  deathNote:
    '1885-03-22(광서 11년) 베이징의 영국 공사관에서 향년 57세에 사망. 사망 약 2주 전부터 ' +
    '발열·오한·기침·호흡 곤란이 진행되어 말라리아 합병 폐렴이 유력 사인이다. 임종 시 정실 ' +
    '패니(Fanny Parkes, 1832~1893, 여행 작가)·자녀들·영국 공사관 직원이 동석. 시신은 ' +
    '베이징 영국 공동묘지에 일시 안치 후 1885 영국 본국으로 운구, 런던 켄살그린 묘지 ' +
    '(Kensal Green Cemetery)에 안장. 영국 빅토리아 여왕은 칙사 파견·1879 KCMG(세인트 ' +
    '마이클·세인트 조지 훈장 2등) 서임 직전 격상 KGCMG(1등) 추서 검토했으나 사후라 무산. ' +
    '일본 메이지 천황은 본인의 18년간 주일 공사 재임을 기리며 "근대 일본 외교의 동반자"라는 ' +
    '추도사 발신.',
  biography:
    '영국 외교관·1865~1883 주일 영국 특명전권공사(18년 재임)·1883~1885 주청 영국 ' +
    '특명전권공사. 1828-02-24 영국 스태퍼드셔 버치힐스(Birchills, 현 월솔)에서 출생, 양친이 ' +
    '일찍 사망해 13세에 사촌 메리 워드(Mary Wanstall, 칼 귀츨라프[Karl Gützlaff] 부인의 ' +
    '여동생)를 따라 마카오로 이주. 1842 만 14세에 사촌 부부의 알선으로 영국 공사관 통역 ' +
    '보조·중국어 학습 시작.\n\n' +
    '1842 난징 조약 통역 보조. 1842-08 제1차 아편전쟁 종결 시점의 난징 조약(8-29) 영국 측 ' +
    '대표단에 14세에 통역 보조로 참가 — 외교 경력의 출발점. 이후 1843~1846 광저우·푸저우 ' +
    '영국 영사관·1846~1849 샤먼(廈門)·1849~1855 푸저우 영국 영사관에서 차례로 근무, ' +
    '약 13년의 중국 현장 경험을 쌓았다.\n\n' +
    '1856 애로호 사건 — 제2차 아편전쟁의 도화선. 1856-10-08 광저우 영국 영사관 영사로 ' +
    '재임 중 "애로호(Arrow) 사건" — 중국 측이 영국 국적 선박 애로호의 청 선원 12명을 ' +
    '체포한 사건 — 의 직접 처리자. 본인이 청 측에 "영국 국기를 모욕했다"는 강경 항의 ' +
    '서한을 발송, 영국 측의 강경 대응을 끌어낸 결정적 인물 → 제2차 아편전쟁(1856~1860)의 ' +
    '직접 도화선이 되었다. 약 1856-12 영국 광저우 함락 시 본인은 영국 측 사실상 정치 ' +
    '책임자 역할.\n\n' +
    '1865 ~ 1883 주일 영국 공사 — 18년 재임. 1865-04(만 37세)에 주일 영국 특명전권공사 ' +
    '임명, 1865-06 요코하마 부임. 전임 러더포드 올콕(Rutherford Alcock, 1859~1864 초대 ' +
    '주일 공사)의 후임. 18년 재임은 19세기 영국 외교사상 단일 임지 최장 기록 중 하나로, ' +
    '막부 말기 → 메이지 유신 → 메이지 중기까지 일본 정치 격동기 전체를 관통.\n\n' +
    '막부에서 토막 세력으로 영국 외교 노선 전환. 본인의 결정적 외교 판단은 (1)1866년경부터 ' +
    '"막부 약화·사쓰마/조슈의 도막 세력 성장" 정세 분석 (2)1867-11 대정봉환 직전 영국이 ' +
    '"막부 친 프랑스 노선에 맞서 사쓰마·조슈 토막 세력을 지원"하는 외교 정책 결정 ' +
    '(3)1868-01 도바·후시미 전투 후 영국 중립 선언 → 사실상 메이지 정부 측 지지의 3단계 ' +
    '전환이다. 이는 동시기 막부 친 프랑스 공사 레옹 로슈와의 외교 대결의 결과로, 영국이 ' +
    '승리해 메이지 정부 형성의 결정적 외세 지원이 되었다.\n\n' +
    '1868 에도성 무혈 개성 협상 참여. 1868-04 에도성 무혈 개성 직전 본인이 사이고 다카모리 ' +
    '(西郷隆盛)·가쓰 가이슈(勝海舟) 사이의 협상에 영국 측 중재자로 참여, 도쿠가와가 보호· ' +
    '에도 시민 보호 등의 조건을 협상에 일조했다.\n\n' +
    '메이지 시대 — 근대 일본 외교의 동반자. 1869~1883 약 14년간 메이지 정부와 외교적 ' +
    '동반자 관계 유지. 주요 활동: (1)1872 이와쿠라 사절단의 영국 방문 시 사실상 메이지 ' +
    '천황·외무경 추천자 (2)불평등 조약 개정 협상(영국 측 강경 대응으로 일본 측에 양보 ' +
    '거부, 단 1894년까지 미해결) (3)1882년 임오군란·1884 갑신정변 시 한반도 외교에 관여. ' +
    '본인은 일본 측에 우호적이었으나 영국 본국 측 강경 노선과 일본 자주 외교 사이의 ' +
    '균형 잡기에 고심했다.\n\n' +
    '1883 ~ 1885 주청 공사 — 단명. 1883-08 주청 영국 특명전권공사로 전임, 베이징 부임. ' +
    '약 1년 6개월 재임 후 1885-03-22 베이징 공사관에서 말라리아 합병 폐렴으로 향년 57세 ' +
    '사망. 1879 KCMG 서임으로 작위 보유.\n\n' +
    '장기 유산. (1)1865~1883 18년의 주일 영국 공사 재임은 영국 외교사상 단일 임지 최장 ' +
    '기록 중 하나 (2)1867 영국의 토막 세력 지원 결정 → 메이지 유신의 외세 지원 결정 ' +
    '요인 (3)1868 에도성 무혈 개성·도쿠가와가 보호 협상의 영국 측 중재 (4)1872 이와쿠라 ' +
    '사절단의 영국 방문 알선 (5)근대 일본 외교사에서 "프랑스 로슈 vs 영국 파크스"의 대결 ' +
    '구도의 영국 측 승자 (6)일본 측의 본인 평가는 "근대 일본 외교의 동반자"라는 우호적 ' +
    '인식이 정착.',
  influence: 82,
  stats: {
    politics: 80,
    military: 50,
    diplomacy: 90,
    intellect: 80,
    charisma: 72,
    administration: 75,
    notes:
      '"프랑스 로슈 vs 영국 파크스"의 막부 말기 외교 대결의 영국 측 승자. 외교 능력은 ' +
      '동시기 동아시아 주재 외국 공사 중 최고급 — 중국어·일본어 일정 수준·약 13년 중국 ' +
      '경험·18년 일본 경험의 압도적 현장 통찰력. 정치 판단은 1866~1867 막부 약화 정세 ' +
      '분석에서 결정적 정확성. 학식은 중국·일본 문헌 외교 보고서 다수 작성. 카리스마는 ' +
      '메이지 정부 핵심 인물(이토 히로부미·이노우에 가오루 등)에게 신뢰받은 점에서 양호. ' +
      '단점은 1856 애로호 사건의 강경 대응처럼 때로 과도하게 강경한 노선·일본 측 자주 ' +
      '외교에 대한 견제 의도. 행정은 영국 공사관 운영에서 큰 잡음 없이 18년 유지.',
  },
  affiliations: [
    { type: 'CITIZENSHIP', countryIso: 'GB', startYear: 1828, endYear: 1885 },
    { type: 'SERVED', historicalCountryName: '도쿠가와 막부', startYear: 1865, endYear: 1868 },
  ],
  tenures: [
    {
      title: '광저우 영국 영사',
      titleEn: 'British Consul at Canton',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'GB',
      startYear: 1856, startMonth: 4, startDay: 1,
      endYear: 1861, endMonth: 10, endDay: 31,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1861-10 광저우 영사에서 상하이 영사로 전임.',
      notes:
        '약 5년 6개월 재임. 1856-10 애로호(Arrow) 사건의 직접 처리자로 제2차 아편전쟁의 ' +
        '도화선이 된 인물. 1858-12 ~ 1861-10 약 3년간 영·프 연합군의 광저우 점령기에는 ' +
        '"광저우 행정관(Allied Commissioner of Canton)"으로 사실상 광저우 통치 책임자도 겸직.',
    },
    {
      title: '상하이 영국 영사',
      titleEn: 'British Consul at Shanghai',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'GB',
      startYear: 1862, startMonth: 1, startDay: 1,
      endYear: 1864, endMonth: 12, endDay: 31,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1864-12 본국 휴가 후 1865-04 주일 영국 특명전권공사로 임명.',
      notes:
        '약 3년 재임. 태평천국의 난(1850~1864) 후반기 상하이 외국인 거류지의 영국 측 사실상 ' +
        '총책임자. 외국인 의용군(Ever Victorious Army) 운영 자문·태평천국군과 청 측 사이의 ' +
        '외교 중재가 주된 업무였다.',
    },
    {
      title: '주일 영국 특명전권공사',
      titleEn: 'British Minister Plenipotentiary to Japan',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'GB',
      startYear: 1865, startMonth: 4, startDay: 8,
      endYear: 1883, endMonth: 8, endDay: 14,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1883-08-14 주청 영국 특명전권공사로 전임.',
      notes:
        '약 18년 4개월 재임 — 19세기 영국 외교사 단일 임지 최장 기록 중 하나. 1865-04-08 ' +
        '임명·1865-06 요코하마 부임. 막부 말기~메이지 중기 일본 정치 격동의 전 기간을 관통. ' +
        '핵심 업적: (1)1867 막부에서 사쓰마·조슈 토막 세력 지원으로 영국 외교 노선 전환 ' +
        '(2)1868 에도성 무혈 개성 협상 중재 (3)1872 이와쿠라 사절단 영국 방문 알선 ' +
        '(4)불평등 조약 개정 협상의 영국 측 협상 책임자(1894년까지 미해결).',
    },
    {
      title: '주청 영국 특명전권공사',
      titleEn: 'British Minister Plenipotentiary to China',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'GB',
      startYear: 1883, startMonth: 8, startDay: 14,
      endYear: 1885, endMonth: 3, endDay: 22,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail:
        '1885-03-22 베이징 영국 공사관에서 향년 57세에 말라리아성 폐렴으로 재임 중 사망.',
      notes:
        '약 1년 6개월 재임 — 단명. 본인의 사상 두 번째 동아시아 임지였으나 부임 약 19개월 만에 ' +
        '베이징 공사관에서 사망. 임기 중 1884 청불전쟁 발발·1885-04 톈진 조약 협상기와 ' +
        '겹쳤으나 본인 사망으로 영국 외교의 청-프 중재 역할이 일시 공백.',
    },
  ],
}

// ── 4) 레옹 로슈 (Léon Roches) ──────────────────────────────────────────
const ROCHES: PersonSpec = {
  name: '레옹',
  surname: '로슈',
  originalName: 'Léon Roches',
  gender: 'MALE',
  nameDisplayOrder: 'western',
  birthYear: 1809, birthMonth: 9, birthDay: 27,
  deathYear: 1900, deathMonth: 6, deathDay: 23,
  birthPlaceText: '프랑스 이제르(Isère)현 그르노블 — 현 그르노블 광역시',
  deathPlaceText: '프랑스 부슈뒤론(Bouches-du-Rhône)현 마르세유 인근 — 별장 사망',
  deathType: DeathType.ILLNESS,
  deathCause: '노환 / 자연사 (향년 90세)',
  deathNote:
    '1900-06-23 프랑스 마르세유 인근 별장에서 향년 90세에 자연사로 사망. 만년에는 거의 ' +
    '은퇴 생활로 알제리 통역관 시절·일본 공사 시절을 회고하는 회고록 "Trente-deux ans à ' +
    'travers l\'Islam"(이슬람 세계의 32년, 1884~1887, 전 4권)을 출판한 것이 마지막 ' +
    '공식 활동. 1868 일본 소환 후 약 32년의 만년 동안 정치 활동은 거의 없었고, 1900년 ' +
    '사망 시점에는 1860년대 막부 친 프랑스 정책의 옛 추진자라는 역사적 기억의 인물로만 ' +
    '남아 있었다. 시신은 마르세유의 가족 묘지에 안치.',
  biography:
    '프랑스 외교관·아랍학자·1864~1868 주일 프랑스 특명전권공사. 1809-09-27 프랑스 그르노블 ' +
    '에서 출생, 본명 레옹 외젠 로슈(Léon Eugène Roches). 1832년 23세에 알제리로 이주, ' +
    '1839~1842 약 3년간 무슬림으로 개종해 압드 알 카디르(Abd al-Qādir, 알제리 저항 지도자) ' +
    '진영에 침투해 정보 수집 — 후일 프랑스의 알제리 점령에 결정적 정보를 제공한 사건. ' +
    '이 경험으로 본인의 회고록 "이슬람 세계의 32년"이 탄생했고, 동시기 프랑스 외교계에서 ' +
    '"이슬람 통역의 최고 권위자"라는 평가를 얻었다.\n\n' +
    '1846 ~ 1864 — 모로코·튀니지 외교관. 1846~1849 프랑스 모로코 영사·1855~1863 프랑스 ' +
    '튀니스 총영사 등 약 18년간 북아프리카 무슬림권에서 외교 경력을 쌓았다. 이슬람권 ' +
    '외교 전문가로서의 명성이 1864년 주일 공사 임명의 결정적 이유였다 — 막부와의 외교가 ' +
    '"비유럽 문명권과의 외교"라는 점에서 본인이 적임자로 선정.\n\n' +
    '1864 ~ 1868 주일 공사 — 친막부 노선. 1864-04 만 54세에 주일 프랑스 특명전권공사 임명, ' +
    '1864-06 요코하마 부임. 전임 뒤셰누(Duchesne de Bellecourt, 1859~1864 초대 주일 공사)의 ' +
    '후임. 본인의 외교 노선은 (1)막부와의 협력 강화·막부 근대화 지원 (2)영국 측의 사쓰마· ' +
    '조슈 지원 노선에 대한 견제 (3)프랑스 자본·기술의 일본 시장 진출이라는 3축이었다.\n\n' +
    '1865 요코스카 제철소 — 일본 근대화의 프랑스 측 지원. 1865-09 막부 감정봉행 오구리 ' +
    '다다마사와 협력해 요코스카 제철소(横須賀製鉄所) 건설 시작 — 일본 근대 조선·중공업의 ' +
    '시발점이자 본인 임기의 최대 성과. 프랑스 기술자 프랑수아 베르니(François Verny)를 ' +
    '총감독으로 추천, 약 4,000명 노동자·약 240만 달러 자금 투입. 동시에 (1)막부 보병· ' +
    '포병 부대의 프랑스식 군제 교련(샤를 슈누알디[Charles Sulpice Jules Chanoine] 중령 ' +
    '소장 군사 사절단) (2)막부 직속 학교 설립 (3)요코하마 ~ 에도 철도 부설 계획 추진 등 ' +
    '다축 근대화 지원.\n\n' +
    '1867 파리 만국박람회 — 막부 사절단. 1867-04 ~ 11 파리 만국박람회에 막부 사절단 ' +
    '참가를 본인이 직접 알선 — 15대 요시노부의 동생 도쿠가와 아키타케(徳川昭武, 14세)가 ' +
    '단장. 이는 막부의 국제적 존재감 격상을 위한 본인의 외교적 기획이었다. 그러나 동시기 ' +
    '사쓰마번도 별도 사절단을 파견(고다이 도모아쓰 단장)해 막부와 동등한 자격으로 ' +
    '박람회에 참가 — 본인의 외교적 일관성에 큰 타격.\n\n' +
    '1868 막부 패망 — 본국 소환. 1867-11 대정봉환 → 1868-01 도바·후시미 전투에서 막부군 ' +
    '패배 → 1868-04 에도성 무혈 개성. 본인은 끝까지 막부 친정 회복을 주장했으나 영국 ' +
    '파크스의 중립 노선·메이지 정부 형성으로 패배. 1868-04-30 본국에 의해 소환 결정 → ' +
    '1868-06 일본 출국. 후임 막시밀리앙 우트레(Maxime Outrey, 1868~1873). 본인의 4년 재임은 ' +
    '"막부 측에 너무 깊이 관여해 외교적 중립성을 잃었다"는 본국 평가로 사실상 외교 경력의 ' +
    '실질적 종료가 되었다.\n\n' +
    '만년 — 회고록 작가. 1868 일본 소환 후 약 32년간 정치 활동은 거의 없었고, 알제리·일본 ' +
    '경험을 정리한 회고록 "Trente-deux ans à travers l\'Islam"(이슬람 세계의 32년, 4권, ' +
    '1884~1887)을 출판한 것이 만년의 주된 활동. 1900-06-23 마르세유 인근 별장에서 향년 ' +
    '90세에 자연사로 사망.\n\n' +
    '장기 유산. (1)1864~1868 주일 프랑스 공사로 막부 친 프랑스 정책의 핵심 후원자 — ' +
    '"막부 말기 외교의 프랑스 측 인물" (2)1865 요코스카 제철소 건설로 일본 근대 조선업의 ' +
    '시발 — 메이지 시대에도 이어진 산업 유산 (3)1867 파리 만국박람회 막부 사절단 알선 ' +
    '(4)"영국 파크스 vs 프랑스 로슈"의 막부 말기 외교 대결의 프랑스 측 인물 — 결과적으로 ' +
    '패배했으나 그의 활동이 없었다면 막부의 근대화가 더 늦었을 것이라는 평가 (5)이슬람권 ' +
    '경험 회고록은 19세기 프랑스 동방학(Orientalisme)의 1차 사료.',
  influence: 70,
  stats: {
    politics: 70,
    military: 60,
    diplomacy: 78,
    intellect: 78,
    charisma: 72,
    administration: 70,
    notes:
      '"막부 말기 외교의 프랑스 측 인물". 외교 능력은 알제리·모로코·튀니지 18년·일본 4년 ' +
      '의 풍부한 비유럽 현장 경험. 정치 판단은 1864~1868 막부 친정 회복 노선의 일관된 ' +
      '추진 — 그러나 결과적으로 영국 파크스에 외교 대결에서 패배. 학식은 아랍학·이슬람학 ' +
      '권위자·회고록 4권 출판. 행정은 요코스카 제철소·프랑스 군사 사절단 등 다축 사업 ' +
      '동시 추진의 실력. 카리스마는 오구리 다다마사·15대 요시노부 등 막부 측 인사와의 ' +
      '깊은 협력 관계. 단점은 외교 중립성을 너무 일찍 포기해 본국 평가가 부정적이었던 점.',
  },
  affiliations: [
    { type: 'CITIZENSHIP', countryIso: 'FR', startYear: 1809, endYear: 1900 },
    { type: 'SERVED', historicalCountryName: '도쿠가와 막부', startYear: 1864, endYear: 1868 },
  ],
  tenures: [
    {
      title: '트리에스테 프랑스 영사',
      titleEn: 'French Consul at Trieste',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'FR',
      startYear: 1849, startMonth: 1, startDay: 1,
      endYear: 1855, endMonth: 8, endDay: 31,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1855-09 튀니스 프랑스 총영사로 전임.',
      notes:
        '약 6년 8개월 재임. 알제리 통역관 시절(1832~1845)의 무슬림권 경험을 바탕으로 첫 ' +
        '본격적 외교관 직위. 아드리아해 항만 도시 트리에스테(현 이탈리아)에서 오스트리아 ' +
        '제국·이탈리아 반도 정세 대응이 주된 업무. 정확한 임명·전임 시점은 자료마다 차이.',
    },
    {
      title: '튀니스 프랑스 총영사',
      titleEn: 'French Consul General in Tunis',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'FR',
      startYear: 1855, startMonth: 9, startDay: 1,
      endYear: 1863, endMonth: 8, endDay: 31,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.OTHER,
      endReasonDetail: '1863-08 임기 종료 후 본국 귀환, 1864-04 주일 공사로 임명.',
      notes:
        '약 8년 재임. 오스만 제국 속국이었던 튀니지 베이의 자치 정부에 대한 프랑스 측 외교 ' +
        '대표. 1864년 후일의 프랑스 튀니지 보호령(1881) 형성의 사전 외교 기반을 다진 시기. ' +
        '본인의 아랍어·이슬람권 외교 전문성이 본격적으로 인정받은 직위로, 1864 주일 공사 ' +
        '임명의 결정적 이유가 되었다.',
    },
    {
      title: '주일 프랑스 특명전권공사',
      titleEn: 'French Minister Plenipotentiary to Japan',
      positionType: GovernmentPositionType.SPECIAL_POSITION,
      countryIso: 'FR',
      startYear: 1864, startMonth: 4, startDay: 20,
      endYear: 1868, endMonth: 6, endDay: 22,
      appointmentMethod: AppointmentMethod.APPOINTMENT,
      endReason: TenureEndReason.REMOVAL,
      endReasonDetail:
        '1868-04 본국 소환 결정 — 막부 패망 후 친 막부 노선에 너무 깊이 관여한 책임. ' +
        '1868-06-22 일본 출국.',
      notes:
        '약 4년 2개월 재임. 막부 친 프랑스 정책의 핵심 후원자. 주요 활동: (1)1865 요코스카 ' +
        '제철소 건설 추진(오구리 다다마사 협력) (2)프랑스 군사 사절단(샤를 슈누알디 중령) ' +
        '유치·막부 보병 약 7,000명 프랑스식 군제 교련 (3)1867 파리 만국박람회 막부 사절단 ' +
        '(도쿠가와 아키타케 단장) 알선 (4)1868 도바·후시미 패전 후에도 막부 친정 회복 주장. ' +
        '결과적으로 영국 파크스의 중립 노선에 패배해 본국 소환·외교 경력 사실상 종료.',
    },
  ],
}

const ALL_PERSONS: readonly PersonSpec[] = [OGURI, GLOVER, PARKES, ROCHES] as const

// ────────────────────────────────────────────────────────────────────────────
export async function seedBakumatsuFigures(prisma: PrismaService): Promise<void> {
  console.log('\n🎌 막부 말기 주요 인물 4인(오구리·글로버·파크스·로슈) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 미존재 — 시딩 중단')
    return
  }
  const tokugawaHC = await prisma.historicalCountry.findFirst({
    where: { name: '도쿠가와 막부' },
    select: { id: true },
  })
  if (!tokugawaHC) {
    console.warn('  ⚠️  "도쿠가와 막부" HC 미존재 — 시딩 중단')
    return
  }

  // 국가 ID 캐시 (현대 국가 — ISO 코드)
  const countryIdByIso: Record<string, string | undefined> = {}
  for (const iso of ['GB', 'FR']) {
    const c = await prisma.country.findFirst({
      where: { isoCode: iso },
      select: { id: true },
    })
    countryIdByIso[iso] = c?.id
  }

  for (const spec of ALL_PERSONS) {
    // ── Person ─────────────────────────────────────────────────────────
    let personId: string
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
      select: {
        id: true,
        deathType: true,
        deathCause: true,
        deathNote: true,
      },
    })
    if (existing) {
      personId = existing.id
      const patch: Record<string, unknown> = {}
      if (!existing.deathType) patch.deathType = spec.deathType
      if (!existing.deathCause) patch.deathCause = spec.deathCause
      if (!existing.deathNote) patch.deathNote = spec.deathNote
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: personId }, data: patch })
        console.log(`  🔧 사망정보 backfill: ${spec.originalName}`)
      } else {
        console.log(`  ⏭️  인물 스킵: ${spec.originalName}`)
      }
    } else {
      const created = await prisma.person.create({
        data: {
          name: spec.name,
          surname: spec.surname,
          originalName: spec.originalName,
          regnalName: spec.regnalName,
          biography: spec.biography,
          birthDate: new Date(spec.birthYear, spec.birthMonth - 1, spec.birthDay),
          birthEra: 'AD' as any,
          deathDate: new Date(spec.deathYear, spec.deathMonth - 1, spec.deathDay),
          deathEra: 'AD' as any,
          gender: spec.gender,
          nameDisplayOrder: spec.nameDisplayOrder as any,
          birthPlaceText: spec.birthPlaceText,
          deathPlaceText: spec.deathPlaceText,
          deathType: spec.deathType,
          deathCause: spec.deathCause,
          deathNote: spec.deathNote,
          influence: spec.influence,
          accountId: admin.id,
        },
      })
      personId = created.id
      console.log(`  ✅ 인물 생성: ${spec.originalName} (id=${created.id})`)
    }

    // ── PersonStats ────────────────────────────────────────────────────
    const statsExists = await prisma.personStats.findFirst({
      where: { personId, accountId: admin.id },
    })
    if (!statsExists) {
      await prisma.personStats.create({
        data: {
          personId,
          accountId: admin.id,
          politics: spec.stats.politics,
          military: spec.stats.military,
          diplomacy: spec.stats.diplomacy,
          intellect: spec.stats.intellect,
          charisma: spec.stats.charisma,
          administration: spec.stats.administration,
          notes: spec.stats.notes,
        },
      })
      console.log(`    ✅ 능력치 등록`)
    }

    // ── PersonCountryAffiliation ───────────────────────────────────────
    for (const aff of spec.affiliations) {
      const countryId = aff.countryIso ? countryIdByIso[aff.countryIso] : undefined
      const historicalCountryId =
        aff.historicalCountryName === '도쿠가와 막부' ? tokugawaHC.id : undefined
      if (!countryId && !historicalCountryId) {
        console.warn(
          `    ⚠️  소속 미해석 — countryIso=${aff.countryIso}, hc=${aff.historicalCountryName}`,
        )
        continue
      }
      const affExists = await prisma.personCountryAffiliation.findFirst({
        where: {
          personId,
          countryId: countryId ?? null,
          historicalCountryId: historicalCountryId ?? null,
          affiliationType: aff.type as any,
        },
      })
      if (affExists) continue
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          countryId: countryId ?? null,
          historicalCountryId: historicalCountryId ?? null,
          affiliationType: aff.type as any,
          startDate: aff.startYear ? new Date(aff.startYear, 0, 1) : undefined,
          endDate: aff.endYear ? new Date(aff.endYear, 11, 31) : undefined,
          priority: 0,
        },
      })
      const label = countryId ? aff.countryIso : aff.historicalCountryName
      console.log(`    ✅ 소속: ${label} (${aff.type})`)
    }

    // ── GovernmentPositionTenure ───────────────────────────────────────
    for (const t of spec.tenures ?? []) {
      const tenureCountryId = t.countryIso ? countryIdByIso[t.countryIso] : undefined
      const tenureHcId =
        t.historicalCountryName === '도쿠가와 막부' ? tokugawaHC.id : undefined
      if (!tenureCountryId && !tenureHcId) {
        console.warn(
          `    ⚠️  재임 미해석 — countryIso=${t.countryIso}, hc=${t.historicalCountryName}`,
        )
        continue
      }
      const startDate = new Date(t.startYear, t.startMonth - 1, t.startDay ?? 1)
      const endDate = t.endYear
        ? new Date(t.endYear, (t.endMonth ?? 1) - 1, t.endDay ?? 1)
        : undefined
      // 같은 인물 + 같은 직위명 + 같은 시작일 → 중복으로 본다
      const tenureExists = await prisma.governmentPositionTenure.findFirst({
        where: { personId, title: t.title, startDate },
      })
      if (tenureExists) {
        console.log(`    ⏭️  재임 스킵: ${t.title} (${t.startYear})`)
        continue
      }
      await prisma.governmentPositionTenure.create({
        data: {
          personId,
          countryId: tenureCountryId ?? null,
          historicalCountryId: tenureHcId ?? null,
          positionType: t.positionType,
          title: t.title,
          titleEn: t.titleEn,
          termNumber: t.termNumber,
          startDate,
          endDate,
          appointmentMethod: t.appointmentMethod,
          endReason: t.endReason,
          endReasonDetail: t.endReasonDetail,
          notes: t.notes,
          accountId: admin.id,
        },
      })
      console.log(
        `    ✅ 재임: ${t.title} (${t.startYear}~${t.endYear ?? '∞'})`,
      )
    }
  }

  console.log(`✅ 막부 말기 주요 인물 시딩 완료\n`)
}
