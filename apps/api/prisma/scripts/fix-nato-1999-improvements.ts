/**
 * 1999년 NATO 가입 3개 사건의 개선 패치 스크립트
 *
 * Phase 1: 공통 NATO 인물 3명(올브라이트·클린턴·솔라나) 등록 + 3개 사건에 PersonEvent 연결
 * Phase 2: 사실 오류 5건 패치 (인물 biography + event section 본문)
 * Phase 3: 3개 사건의 description 필드 어휘 가독성 정리
 *
 * 멱등성: 이미 적용된 변경은 스킵한다.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 공통 NATO 인물 ──────────────────────────────────────────────────────────
type CommonPerson = {
  name: string
  surname: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  deathCause?: string
  isAlive: boolean
  gender: 'MALE' | 'FEMALE'
  countryName: string
  influence: number
}

const COMMON_PERSONS: CommonPerson[] = [
  {
    name: '매들린',
    surname: '올브라이트',
    originalName: 'Madeleine Albright',
    biography:
      '체코슬로바키아계 미국 정치학자·외교관·제64대 미 국무장관(1997~2001)·' +
      '1999년 3월 12일 인디펜던스 NATO 가입식 주재자. 1937년 5월 15일 체코슬로바키아 ' +
      '제1공화국 프라하 출생. 본명 마리아 야나 코르벨로바(Marie Jana Korbelová). ' +
      '부친 요세프 코르벨(Josef Korbel, 1909~1977)이 체코슬로바키아 외교관으로, ' +
      '1939년 3월 독일의 체코슬로바키아 침공 직후 가족이 영국으로 1차 망명. ' +
      '1945년 봄 프라하로 귀국, 1948년 2월 25일 체코슬로바키아 공산당 쿠데타 직후 ' +
      '다시 미국으로 2차 망명. 1957년 약 20세에 미국 시민권 취득.\n\n' +
      '1996년 12월 워싱턴포스트의 조사 보도로 본인의 약 4명 친조부모 모두가 ' +
      '체코슬로바키아 유대인이며 1942~1944년 사이 테레지엔슈타트·아우슈비츠 등 ' +
      '나치 수용소에서 사망한 사실이 본인 평생 최초로 공개되었다. 코르벨 가족이 ' +
      '약 1941년경 영국 망명 시기 가톨릭으로 개종한 후 본 유대계 출자를 의도적으로 ' +
      '은폐했던 사실이 본 보도로 노출되었으며, 본인이 본 보도 직전까지 본 사실을 ' +
      '몰랐다고 본인 회고록에서 진술했다.\n\n' +
      '약 1959년 컬럼비아 대학교 국제관계학 박사학위 취득 후 약 1976년부터 ' +
      '카터 행정부 국가안보회의 입법 담당관, 약 1982년부터 조지타운 대학교 ' +
      '국제관계학 교수로 활동. 1993년 1월부터 1997년 1월까지 클린턴 행정부 ' +
      '제20대 유엔 주재 미국 대사 재임. 1997년 1월 23일 약 59세에 본격 미 국무장관 ' +
      '취임 — 미국 역사상 결정적 첫 여성 국무장관이었다.\n\n' +
      '본 NATO 가입 사업과 관련해 본인이 1997년 1월 취임 직후부터 본 약 3개국 ' +
      '가입을 본인 임기 최우선 외교 사업으로 결정. 1997년 5월 NATO-러시아 기본 협정 ' +
      '협상에 직접 관여, 1997년 7월 마드리드 정상회의 참석. 1998년 4월 미 상원 ' +
      '비준 표결을 직접 주도해 80-19 가결을 이끌었다. 1999년 3월 12일 미주리주 ' +
      '인디펜던스 해리 트루먼 도서관에서 본인이 직접 본 가입식을 주재, 환영 ' +
      '연설을 "할렐루야(Hallelujah)"라는 단어로 시작한 결정적 정서적 정점을 ' +
      '연출했다. 본인의 출신국 체코를 포함한 3개국이 NATO 가입국이 된 약 60년 ' +
      '인적 일관성이 본 의식의 가장 결정적 인적 정점이었다.\n\n' +
      '2001년 1월 임기 종료 후 올브라이트 스톤브리지 그룹(자문회사) 회장으로 ' +
      '활동, 약 2003년 본인 회고록 "마담 세크리터리(Madam Secretary)" 출간. ' +
      '2022년 3월 23일 향년 84세에 워싱턴 D.C.에서 암(난소암)으로 사망.',
    birthYear: 1937, birthMonth: 5, birthDay: 15,
    deathYear: 2022, deathMonth: 3, deathDay: 23,
    deathCause: '암 (워싱턴 D.C., 향년 84세)',
    isAlive: false,
    gender: 'FEMALE',
    countryName: '미국',
    influence: 84,
  },
  {
    name: '빌',
    surname: '클린턴',
    originalName: 'Bill Clinton',
    biography:
      '미국 정치가·법학자·제42대 미국 대통령(1993~2001)·1999년 3개국 NATO 확장의 ' +
      '결정적 미국 측 정책 결정자. 1946년 8월 19일 아칸소주 호프(Hope) 출생. ' +
      '본명 윌리엄 제퍼슨 블라이드 3세(William Jefferson Blythe III). 출생 약 3개월 ' +
      '전 1946년 5월 17일 부친이 교통사고로 사망, 약 4세에 모친의 재혼으로 ' +
      '계부 로저 클린턴(Roger Clinton)의 성을 따랐다.\n\n' +
      '약 1968년 조지타운 대학교 국제관계학 졸업, 1968~1970년 로즈 장학생으로 ' +
      '옥스퍼드 대학교 유니버시티 칼리지 정치학 수학, 1973년 예일 대학교 ' +
      '로스쿨에서 J.D. 취득. 1977~1979년 약 30세에 아칸소주 법무장관 재임, ' +
      '1979~1981·1983~1992년 아칸소 주지사 약 12년 재임. 본 12년 주지사 재임 시기에 ' +
      '아칸소 주가 미국 50개 주 중 결정적 빈곤 주에서 결정적 교육 개혁 모범 주로 ' +
      '변천한 사실이 본인의 1992년 대통령 선거 운동의 핵심 자격이었다.\n\n' +
      '1992년 11월 3일 대선에서 약 43퍼센트의 득표로 현직 부시(George H. W. Bush)를 ' +
      '누르고 약 46세에 대통령 당선, 1993년 1월 20일 취임. 약 8년 재임. 본 임기 ' +
      '결정적 외교 성취가 본 NATO의 약 1999년 첫 탈냉전 확장이었다.\n\n' +
      '본 NATO 확장 사업의 결정적 정책적 출발점이 1996년 10월 22일 본인의 미시간주 ' +
      '디트로이트 발언이었다. 본인의 11월 5일 재선 약 2주 전에 이루어진 본 발언에서 ' +
      '본인이 1999년까지 동유럽 3개국의 NATO 가입을 완성하겠다는 정책을 명시적으로 ' +
      '공개했으며, 본 발언이 디트로이트의 폴란드계 약 90만 명 유권자를 포함한 미국 내 ' +
      '폴란드계 약 1,000만 명, 헝가리계 약 150만 명, 체코계 약 130만 명의 결정적 ' +
      '정치적 동원의 직접 출발점이었다.\n\n' +
      '1997년 5월 NATO-러시아 기본 협정 협상에서 옐친과의 본인 측 직접 합의가 본 ' +
      'NATO 확장의 결정적 외교적 사전 절차였으며, 1997년 7월 마드리드 정상회의에 ' +
      '본인이 직접 출석해 본 약 3개국 가입 초청을 결정. 1998년 4월 미 상원 비준 ' +
      '표결에서 80-19 결정적 가결을 본인이 직접 추진. 결과적으로 본인의 약 4년 ' +
      '추진이 1999년 3월 12일 본 가입식의 결정적 미국 측 정치적 토대였다.\n\n' +
      '2001년 1월 임기 종료 후 클린턴 재단 활동, 약 2016년 부인 힐러리 클린턴의 ' +
      '대선 출마 지원 등 활동. 약 2025년 현재 약 79세로 미국 민주당의 결정적 ' +
      '원로 인물로 활동하고 있다.',
    birthYear: 1946, birthMonth: 8, birthDay: 19,
    isAlive: true,
    gender: 'MALE',
    countryName: '미국',
    influence: 92,
  },
  {
    name: '하비에르',
    surname: '솔라나',
    originalName: 'Javier Solana',
    biography:
      '스페인 물리학자·정치가·외무장관(1992~1995)·제9대 NATO 사무총장(1995~1999)·' +
      'EU 초대 외교안보고위대표(1999~2009)·1999년 3월 16일 NATO 본부 게양식 주재자. ' +
      '1942년 7월 14일 스페인 마드리드 출생. 본명 프란시스코 하비에르 솔라나 ' +
      '데 마다리아가(Francisco Javier Solana de Madariaga). 약 1968년 마드리드 ' +
      '콤플루텐세 대학교 물리학 박사학위 취득, 약 1971년 미국 버지니아 대학교 ' +
      '물리학 박사 후 약 5년 미국 체류 후 1971년 약 29세에 마드리드로 귀국.\n\n' +
      '약 1964년 약 22세에 본인이 결정적 프랑코 독재(1939~1975) 시기 스페인 ' +
      '사회노동당(PSOE) 지하 활동에 가입, 약 11년에 걸친 결정적 반독재 운동 경력이 ' +
      '본인의 약 30년 정치 경력의 결정적 사상적 배경이었다. 약 1977년 6월 ' +
      '스페인 첫 자유선거에서 PSOE 후보로 의회 진입, 약 1982년 12월 약 40세에 ' +
      '본격 펠리페 곤살레스(Felipe González) 내각 문화부 장관에 취임.\n\n' +
      '약 1988년부터 1992년까지 약 4년 교육과학부 장관 재임, 1992년 6월부터 ' +
      '1995년 12월까지 약 3.5년 외무장관 재임. 약 1995년 12월 5일 약 53세에 ' +
      'NATO 사무총장에 취임 — 본 임명이 결정적 스페인 출신 인물의 첫 NATO ' +
      '사무총장 사례였으며, 본인이 결정적 좌파 정치 배경(PSOE)에도 불구하고 ' +
      'NATO 사무총장에 임명된 점이 본 동맹의 결정적 약 50년 만에 결정적 정치적 ' +
      '포용성 변천의 시각화 자료였다.\n\n' +
      '본 NATO 가입 사업과 관련해 본인이 1995년 12월 취임 직후부터 본 약 3개국 ' +
      '가입의 결정적 NATO 측 사무국 추진자로 활동. 1997년 5월 NATO-러시아 기본 ' +
      '협정 협상의 NATO 측 결정적 협상자, 1997년 7월 마드리드 정상회의의 결정적 ' +
      '주재자, 1998년 2월 6일 가입 의정서 서명 의식의 NATO 측 주재자였다. ' +
      '1999년 3월 12일 미주리주 인디펜던스 의식 약 4일 후 1999년 3월 16일 ' +
      '벨기에 브뤼셀 NATO 본부에서 본인이 직접 본 약 3개국 국기 게양식을 ' +
      '주재한 결정적 인물이었다.\n\n' +
      '1999년 10월 NATO 사무총장 임기 종료 후 본격 EU 외교안보고위대표 ' +
      '(High Representative)에 취임, 약 10년 재임(1999~2009). 본 약 10년 재임이 ' +
      'EU 공동외교안보정책(CFSP)의 결정적 사실상 단독 결정적 인물 시기였다. ' +
      '약 2025년 현재 약 82세로 EU 외교계의 결정적 원로 인물로 활동하고 있다.',
    birthYear: 1942, birthMonth: 7, birthDay: 14,
    isAlive: true,
    gender: 'MALE',
    countryName: '스페인',
    influence: 78,
  },
]

// ── 3개 사건 메타데이터 ─────────────────────────────────────────────────────
const EVENTS = [
  {
    key: 'poland',
    title: '폴란드 NATO 가입 — 약 44년 바르샤바조약기구 회원국의 서방 동맹 통합 (1989~1999)',
    startDate: '1989-06-04',
  },
  {
    key: 'czech',
    title: '체코공화국 NATO 가입 — 약 51년 소련 진영 통합국의 서방 동맹 가입 (1989~1999)',
    startDate: '1989-11-17',
  },
  {
    key: 'hungary',
    title: '헝가리 NATO 가입 — 1956년 혁명 진압 약 43년 후 서방 동맹 통합 (1989~1999)',
    startDate: '1989-10-23',
  },
] as const

// ── PersonEvent 역할 메모 ───────────────────────────────────────────────────
const PERSON_EVENT_NOTES: Record<
  string,
  Record<(typeof EVENTS)[number]['key'], { role: string; note: string }>
> = {
  'Madeleine Albright': {
    poland: {
      role: '미 국무장관(1997~2001) — 1999-03-12 가입 문서 수령자',
      note:
        '체코슬로바키아 프라하 출생의 체코계 미국인. 1997년 1월 취임 직후부터 본 ' +
        '약 3개국 가입을 본인 임기 최우선 외교 사업으로 결정. 1999년 3월 12일 ' +
        '미주리주 인디펜던스에서 폴란드 외무장관 게레메크의 가입 문서를 직접 수령. ' +
        '환영 연설을 "할렐루야"라는 첫 단어로 시작한 결정적 정서적 정점.',
    },
    czech: {
      role: '미 국무장관(1997~2001) — 1999-03-12 가입 문서 수령자·체코 출신',
      note:
        '1937년 5월 15일 체코슬로바키아 프라하 출생의 마리아 야나 코르벨로바. ' +
        '부친 요세프 코르벨이 1939년 3월 독일의 체코슬로바키아 침공 후 영국 망명, ' +
        '1948년 2월 공산당 쿠데타 후 미국 망명. 1996년 12월 본인 가족이 ' +
        '체코슬로바키아 유대인 출신임이 워싱턴포스트 보도로 노출. 결과적으로 본인의 ' +
        '출신국 체코가 본 의식에서 NATO 가입국이 된 약 60년 인적 일관성이 본 ' +
        '의식의 가장 결정적 정서적 정점.',
    },
    hungary: {
      role: '미 국무장관(1997~2001) — 1999-03-12 가입 문서 수령자',
      note:
        '체코슬로바키아 프라하 출생의 체코계 미국인. 1997년 1월 취임 직후부터 본 ' +
        '약 3개국 가입을 본인 임기 최우선 외교 사업으로 결정. 1999년 3월 12일 ' +
        '미주리주 인디펜던스에서 헝가리 외무장관 마르토니의 가입 문서를 직접 수령.',
    },
  },
  'Bill Clinton': {
    poland: {
      role: '제42대 미국 대통령(1993~2001) — NATO 확장 정책 결정자',
      note:
        '1996년 10월 22일 디트로이트 발언으로 1999년까지 동유럽 3개국 NATO 가입 ' +
        '완성을 명시적으로 결정. 디트로이트의 폴란드계 약 90만 명 유권자 동원이 ' +
        '본인 재선 약 2주 전 결정적 정치적 배경. 1997년 5월 NATO-러시아 기본 ' +
        '협정에서 옐친과 직접 합의, 1997년 7월 마드리드 정상회의 직접 출석. ' +
        '1998년 4월 미 상원 80-19 비준을 직접 추진.',
    },
    czech: {
      role: '제42대 미국 대통령(1993~2001) — NATO 확장 정책 결정자',
      note:
        '1996년 10월 디트로이트 발언으로 본 확장 사업 결정, 1997년 7월 마드리드 ' +
        '정상회의 직접 출석해 체코 대통령 하벨과의 결정적 면담. 1998년 4월 미 ' +
        '상원 80-19 결정적 첫 NATO 회원국 비준을 본인이 직접 추진한 결정적 ' +
        '약 4년 추진자.',
    },
    hungary: {
      role: '제42대 미국 대통령(1993~2001) — NATO 확장 정책 결정자',
      note:
        '1996년 10월 디트로이트 발언에서 미국 내 헝가리계 약 150만 명 유권자의 ' +
        '결정적 정치적 동원을 본인이 직접 활용. 1997년 7월 마드리드 정상회의에서 ' +
        '헝가리 총리 호른과의 결정적 면담. 본인의 약 4년 추진이 1999년 3월 12일 ' +
        '본 가입식의 결정적 미국 측 정치적 토대.',
    },
  },
  'Javier Solana': {
    poland: {
      role: '제9대 NATO 사무총장(1995~1999) — NATO 측 사무국 결정적 추진자',
      note:
        '1995년 12월 NATO 사무총장 취임 직후부터 본 약 3개국 가입의 결정적 NATO ' +
        '측 사무국 추진자. 1997년 5월 NATO-러시아 기본 협정 NATO 측 협상자, ' +
        '1997년 7월 마드리드 정상회의 주재자, 1998년 2월 6일 가입 의정서 서명 ' +
        '의식 주재. 1999년 3월 16일 브뤼셀 NATO 본부 게양식에서 폴란드 국기를 ' +
        '직접 게양.',
    },
    czech: {
      role: '제9대 NATO 사무총장(1995~1999) — NATO 측 사무국 결정적 추진자',
      note:
        '스페인 PSOE 출신 좌파 정치인으로 NATO 측 결정적 정치적 포용성의 상징. ' +
        '1995년 12월 사무총장 취임부터 1999년 10월 임기 종료까지 약 4년에 걸친 ' +
        '본 약 3개국 가입의 NATO 측 사실상 단독 결정적 추진자. 1999년 3월 16일 ' +
        '브뤼셀 NATO 본부 게양식에서 체코 국기를 직접 게양.',
    },
    hungary: {
      role: '제9대 NATO 사무총장(1995~1999) — NATO 측 사무국 결정적 추진자',
      note:
        '1995년 12월 사무총장 취임 직후부터 본 약 3개국 가입의 결정적 NATO 측 ' +
        '사무국 추진자. 1997년 7월 마드리드 정상회의에서 헝가리 총리 호른의 ' +
        '초청 수락을 직접 의장으로 진행. 1999년 3월 16일 브뤼셀 NATO 본부 ' +
        '게양식에서 헝가리 국기를 직접 게양.',
    },
  },
}

// ── 사실 오류 패치 ──────────────────────────────────────────────────────────
const PERSON_BIO_PATCHES: Array<{
  originalName: string
  from: string
  to: string
  deathCause?: string
}> = [
  {
    // 하벨 사인 정정
    originalName: 'Václav Havel',
    from: '2011년 12월 18일 향년 75세에 프라하 외곽 흐라데체크에서 폐 종양으로 사망.',
    to:
      '2011년 12월 18일 향년 75세에 프라하 외곽 흐라데체크에서 만성 호흡기 부전으로 사망. ' +
      '약 1996년 12월 폐암 수술 후 약 15년에 걸친 호흡기 합병증의 누적 효과로 ' +
      '알려졌다.',
    deathCause: '만성 호흡기 부전 (체코 흐라데체크, 향년 75세)',
  },
  {
    // 카반 부친 박해 시점·전개 정정
    originalName: 'Jan Kavan',
    from:
      '약 11세에 1957년 체코슬로바키아 인민공화국 측 부친의 결정적 정치적 박해(약 1952년 슬란스키 ' +
      '재판 관련 의혹)로 부친이 약 4년 정치범 수감 후 사망한 결정적 가족사가 ' +
      '그의 약 40년 망명 운동의 결정적 사상적 배경이었다.',
    to:
      '약 1952년부터 체코슬로바키아 공산당 측 슬란스키 재판(Slánský process) 연루 ' +
      '의혹으로 부친 파벨 카반이 결정적 정치적 박해를 받아 약 1953년 형 확정 후 ' +
      '약 7년 수감, 약 1960년 출소 직후 사망한 결정적 가족사가 그의 약 40년 망명 ' +
      '운동의 결정적 사상적 배경이었다.',
  },
  {
    // 부젝 출생지 정정
    originalName: 'Jerzy Buzek',
    from:
      '1940년 7월 3일 폴란드 슈말코비체(Śmiłowice, ' +
      '당시 독일 점령 슐레지엔) 출생.',
    to:
      '1940년 7월 3일 체신 실레지아 슈말코비체(Śmiłowice, ' +
      '당시 독일 점령 폴란드령·현 체코 모라비아실레지아주) 출생.',
  },
]

// ── EventSection 본문 패치 ──────────────────────────────────────────────────
type SectionPatch = {
  eventKey: (typeof EVENTS)[number]['key']
  sectionTitle: string
  from: string
  to: string
}

const SECTION_PATCHES: SectionPatch[] = [
  // 폴란드: 옐친 1주일 → 약 3주 / 8월 25일 / 9월 15일 서한 번복
  {
    eventKey: 'poland',
    sectionTitle: '가입 신청과 평화를 위한 동반자관계(PfP)',
    from:
      '<h3>약 1993년 9월 옐친의 가입 동의 발언과 약 1주일 후 철회</h3>\n<p>약 1993년 9월 25일 러시아 대통령 보리스 옐친이 바르샤바를 방문, 바웬사 대통령과의 회담에서 본인이 폴란드의 NATO 가입에 반대하지 않는다는 결정적 발언을 했다. 본 발언이 본 사업의 결정적 사상적 모멘텀이었으나, 약 1주일 후 1993년 10월 옐친이 본인 측근의 강한 반대로 본 발언을 사실상 철회, 결과적으로 본 옐친 측 약 1주일의 동의가 본 사업의 가장 결정적 우연적 모멘텀이 되었다. 본 약 1주일이 결과적으로 약 1994년 1월 NATO의 PfP 결정의 결정적 정치적 출발점이었다.</p>',
    to:
      '<h3>1993년 8월 옐친의 가입 동의 공동성명과 약 3주 후 번복</h3>\n<p>1993년 8월 25일 러시아 대통령 보리스 옐친이 바르샤바를 방문, 바웬사 대통령과의 회담 후 발표된 공동 성명에서 러시아가 폴란드의 NATO 가입을 결정적으로 반대하지 않는다는 입장을 명문화했다. 본 입장이 본 사업의 결정적 외교적 모멘텀이었으나, 약 3주 후 1993년 9월 15일경 옐친이 클린턴·콜 등 NATO 주요 정상에게 보낸 서한에서 NATO 확장이 러시아 안보 이익에 반한다는 입장으로 사실상 번복했다. 결과적으로 본 약 3주의 동의 창문이 본 사업의 가장 결정적 우연적 모멘텀이 되었으며, 약 1994년 1월 NATO의 PfP 결정의 결정적 정치적 출발점이었다.</p>',
  },
  // 폴란드 TMI: 동일 패치
  {
    eventKey: 'poland',
    sectionTitle: 'TMI — 본 가입 사업에 얽힌 잘 알려지지 않은 일화',
    from:
      '<h3>1. 약 1993년 9월 옐친의 약 1주일 동의의 결정적 우연</h3>\n<p>약 1993년 9월 25일 러시아 대통령 보리스 옐친이 바르샤바를 방문, 바웬사 대통령과의 회담에서 본인이 폴란드의 NATO 가입에 반대하지 않는다는 결정적 발언을 했다. 본 발언이 약 1주일 후 1993년 10월 옐친 측근의 강한 반대로 사실상 철회되었으나, 본 약 1주일이 결과적으로 약 1994년 1월 NATO의 PfP 결정의 결정적 정치적 출발점이 되었다. 본 약 1주일이 본 약 10년 NATO 가입 사업의 가장 결정적 우연적 모멘텀이었으며, 결과적으로 약 1993년 9월 옐친의 약 30분 회담 발언이 약 1999년 3월 폴란드 NATO 가입의 결정적 사상적 출발점이 된 결정적 우연이었다.</p>',
    to:
      '<h3>1. 1993년 8월 옐친의 약 3주 동의 창문</h3>\n<p>1993년 8월 25일 러시아 대통령 보리스 옐친이 바르샤바를 방문, 바웬사 대통령과의 공동 성명에서 러시아가 폴란드의 NATO 가입에 반대하지 않는다는 입장을 명문화했다. 약 3주 후 1993년 9월 15일경 옐친이 클린턴·콜 등 NATO 주요 정상에게 보낸 서한에서 본 입장을 사실상 번복했으나, 본 약 3주의 동의 창문이 약 1994년 1월 NATO의 PfP 결정의 결정적 정치적 출발점이 되었다. 결과적으로 본 약 3주가 본 약 10년 NATO 가입 사업의 가장 결정적 우연적 모멘텀이었다.</p>',
  },
  // 폴란드 1999-02-17 의회 비준 표결 숫자 차별화
  {
    eventKey: 'poland',
    sectionTitle: '국내 비준 — 약 1998년 의정서 서명부터 1999년 2월 의회 통과까지',
    from:
      '<h3>1999년 2월 17일 폴란드 의회 본격 비준</h3>\n<p>1999년 2월 17일 폴란드 의회 하원(Sejm)이 NATO 가입 비준 법안을 약 409표 찬성, 약 7표 반대, 약 16표 기권으로 통과시켰다.',
    to:
      '<h3>1999년 2월 17일 폴란드 의회 본격 비준</h3>\n<p>1999년 2월 17일 폴란드 의회 하원(Sejm)이 NATO 가입 비준 법안을 약 409표 찬성, 약 7표 반대, 약 18표 기권으로 통과시켰다.',
  },
  // 폴란드 TMI 약 88.9% 기록 부분의 기권 숫자도 동기화
  {
    eventKey: 'poland',
    sectionTitle: 'TMI — 본 가입 사업에 얽힌 잘 알려지지 않은 일화',
    from: '약 409표 찬성, 약 7표 반대, 약 16표 기권의 결정적 비율',
    to: '약 409표 찬성, 약 7표 반대, 약 18표 기권의 결정적 비율',
  },
]

// ── Event description 어휘 정리 ────────────────────────────────────────────
const EVENT_DESCRIPTION_REPLACEMENTS: Record<
  (typeof EVENTS)[number]['key'],
  { from: string; to: string }
> = {
  poland: {
    from:
      '1999년 3월 12일 미주리주 인디펜던스의 해리 트루먼 대통령 도서관에서 ' +
      '폴란드 외무장관 브로니스와프 게레메크가 폴란드 NATO 가입 문서를 ' +
      '매들린 올브라이트 미 국무장관에게 정식 기탁함으로써 폴란드가 ' +
      '체코·헝가리와 함께 NATO의 첫 탈냉전 확장 동기로 정식 가입한 사건. ' +
      '\n\n' +
      '본 사건의 결정적 의미는 폴란드가 약 1955년 5월 14일 바르샤바조약기구 ' +
      '결성 이래 약 44년에 걸쳐 소련 진영 안보 체제의 사실상 단독 결정적 ' +
      '중심국이었던 점, 그리고 본 진영이 약 1991년 7월 1일 공식 해체된 후 ' +
      '약 8년에 걸친 폴란드의 서방 안보 통합 노력의 결정적 정점이었다는 ' +
      '점이다.',
    to:
      '1999년 3월 12일 미주리주 인디펜던스의 해리 트루먼 대통령 도서관에서 ' +
      '폴란드 외무장관 브로니스와프 게레메크가 폴란드 NATO 가입 문서를 ' +
      '매들린 올브라이트 미 국무장관에게 정식 기탁함으로써 폴란드가 ' +
      '체코·헝가리와 함께 NATO의 첫 탈냉전 확장 동기로 가입한 사건. ' +
      '\n\n' +
      '본 사건의 의미는 폴란드가 1955년 5월 14일 바르샤바조약기구 결성 이래 ' +
      '약 44년 소련 진영 안보 체제의 중심국이었던 점, 그리고 본 진영이 ' +
      '1991년 7월 1일 공식 해체된 후 약 8년에 걸친 폴란드 서방 안보 통합 ' +
      '노력의 정점이었다는 점이다.',
  },
  czech: {
    from:
      '본 사건의 결정적 의미는 체코가 약 1948년 2월 체코슬로바키아 공산당 ' +
      '쿠데타 이래 약 51년에 걸쳐 소련 진영 안보 체제에 통합되어 있었으며, ' +
      '특히 약 1968년 8월 21일 프라하의 봄 진압을 위한 소련의 약 20만 군 ' +
      '침공의 결정적 트라우마를 가진 국가였다는 점이다. 결과적으로 약 1989년 ' +
      '11월 17일 벨벳 혁명 이래 약 10년에 걸쳐 신생 체코공화국이 서방 안보 ' +
      '체제로 결정적 통합을 완료한 점이 본 사업의 결정적 약 10년 사상적 ' +
      '시계열이었다.',
    to:
      '본 사건의 의미는 체코가 1948년 2월 체코슬로바키아 공산당 쿠데타 이래 ' +
      '약 51년 소련 진영 안보 체제에 통합되어 있었고, 특히 1968년 8월 21일 ' +
      '프라하의 봄 진압을 위한 소련 약 20만 군 침공의 트라우마를 가진 ' +
      '국가였다는 점이다. 1989년 11월 17일 벨벳 혁명 이래 약 10년에 걸쳐 ' +
      '신생 체코공화국이 서방 안보 체제 통합을 완료한 점이 본 사업의 ' +
      '약 10년 시계열이었다.',
  },
  hungary: {
    from:
      '본 사건의 결정적 의미는 헝가리가 약 1956년 10월 23일 헝가리 혁명에 ' +
      '대한 소련 측 약 20만 군의 본격 진압 트라우마를 가진 국가였다는 점, ' +
      '그리고 본 트라우마의 약 43년 후 본인이 결정적 서방 동맹의 가입국이 ' +
      '된 결정적 약 43년 사상적 일관성이었다는 점이다. 약 1989년 10월 23일 ' +
      '헝가리 제3공화국 출범 이래 약 10년에 걸친 헝가리의 서방 안보 체제 ' +
      '통합 노력이 본 NATO 가입 사업의 결정적 약 10년 사상적 시계열이었다.',
    to:
      '본 사건의 의미는 헝가리가 1956년 10월 23일 헝가리 혁명에 대한 소련 ' +
      '약 20만 군 진압의 트라우마를 가진 국가였다는 점, 그리고 본 트라우마의 ' +
      '약 43년 후 헝가리가 서방 동맹의 가입국이 된 약 43년 사상적 일관성이 ' +
      '있었다는 점이다. 1989년 10월 23일 헝가리 제3공화국 출범 이래 약 10년 ' +
      '서방 안보 체제 통합 노력이 본 사업의 약 10년 시계열이었다.',
  },
}

// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    console.log('\n🔧 1999 NATO 가입 3개 사건 개선 패치 시작...\n')

    // ── 사건 및 카테고리 조회 ─────────────────────────────────────────────
    const eventIds: Record<string, string> = {}
    for (const ev of EVENTS) {
      const found = await prisma.event.findFirst({
        where: { title: ev.title, startDate: new Date(ev.startDate), deletedAt: null },
        select: { id: true },
      })
      if (!found) {
        console.error(`  ❌ 사건 미존재: ${ev.title}`)
        return
      }
      eventIds[ev.key] = found.id
    }
    console.log(`  ✓ 3개 사건 ID 조회 완료\n`)

    // ── Phase 1: 공통 인물 등록 + PersonEvent 연결 ─────────────────────────
    console.log('━━ Phase 1: 공통 NATO 인물 3명 + PersonEvent 연결 ━━')
    const commonPersonIds: Record<string, string> = {}
    for (const p of COMMON_PERSONS) {
      const existing = await prisma.person.findFirst({
        where: { originalName: p.originalName },
      })
      let personId: string
      if (existing) {
        personId = existing.id
        console.log(`  ⏭️  ${p.originalName} (이미 존재)`)
      } else {
        const created = await prisma.person.create({
          data: {
            name: p.name,
            surname: p.surname,
            originalName: p.originalName,
            biography: p.biography,
            birthEra: 'AD' as any,
            birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
            deathEra: p.deathYear ? ('AD' as any) : undefined,
            deathDate: p.deathYear
              ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
              : undefined,
            deathCause: p.deathCause,
            isAlive: p.isAlive,
            gender: p.gender,
            nameDisplayOrder: 'western',
            influence: p.influence,
            accountId: ACCOUNT_ID,
          },
        })
        personId = created.id
        console.log(`  ✅ ${p.originalName} 신규 등록 (영향력 ${p.influence})`)
      }
      commonPersonIds[p.originalName] = personId

      // 국적 등록
      const country = await prisma.country.findFirst({
        where: { name: p.countryName },
        select: { id: true },
      })
      if (country) {
        const affExists = await prisma.personCountryAffiliation.findFirst({
          where: {
            personId,
            countryId: country.id,
            affiliationType: 'CITIZENSHIP' as any,
          },
        })
        if (!affExists) {
          await prisma.personCountryAffiliation.create({
            data: {
              personId,
              countryId: country.id,
              affiliationType: 'CITIZENSHIP' as any,
              priority: 0,
            },
          })
          console.log(`     → 국적 ${p.countryName} 연결`)
        }
      }
    }

    // PersonEvent 연결 (3 persons × 3 events = 9 entries)
    for (const personOriginalName of Object.keys(PERSON_EVENT_NOTES)) {
      const personId = commonPersonIds[personOriginalName]
      if (!personId) continue
      const notes = PERSON_EVENT_NOTES[personOriginalName]
      for (const ev of EVENTS) {
        const role = notes[ev.key]
        if (!role) continue
        const eventId = eventIds[ev.key]
        const exists = await prisma.personEvent.findFirst({
          where: { personId, eventId },
        })
        if (exists) {
          console.log(`  ⏭️  PersonEvent 스킵: ${personOriginalName} → ${ev.key}`)
          continue
        }
        await prisma.personEvent.create({
          data: { personId, eventId, role: role.role, note: role.note },
        })
        console.log(`  ✅ PersonEvent: ${personOriginalName} → ${ev.key}`)
      }
    }

    // ── Phase 2-A: 인물 biography 사실 오류 패치 ──────────────────────────
    console.log('\n━━ Phase 2-A: 인물 biography 사실 오류 패치 ━━')
    for (const patch of PERSON_BIO_PATCHES) {
      const person = await prisma.person.findFirst({
        where: { originalName: patch.originalName },
      })
      if (!person) {
        console.warn(`  ⚠️  ${patch.originalName} 미존재 — 스킵`)
        continue
      }
      const currentBio = person.biography ?? ''
      if (!currentBio.includes(patch.from)) {
        if (currentBio.includes(patch.to.slice(0, 40))) {
          console.log(`  ⏭️  ${patch.originalName} 이미 패치됨`)
        } else {
          console.warn(`  ⚠️  ${patch.originalName} 원문 미일치 — 스킵`)
        }
        if (patch.deathCause && person.deathCause !== patch.deathCause) {
          await prisma.person.update({
            where: { id: person.id },
            data: { deathCause: patch.deathCause },
          })
          console.log(`     → deathCause만 갱신`)
        }
        continue
      }
      const newBio = currentBio.replace(patch.from, patch.to)
      const updateData: any = { biography: newBio }
      if (patch.deathCause) updateData.deathCause = patch.deathCause
      await prisma.person.update({
        where: { id: person.id },
        data: updateData,
      })
      console.log(
        `  ✅ ${patch.originalName} biography 패치` +
          (patch.deathCause ? ' + deathCause 갱신' : ''),
      )
    }

    // ── Phase 2-B: EventSection 본문 사실 오류 패치 ───────────────────────
    console.log('\n━━ Phase 2-B: EventSection 본문 사실 오류 패치 ━━')
    for (const patch of SECTION_PATCHES) {
      const eventId = eventIds[patch.eventKey]
      const section = await prisma.eventSection.findFirst({
        where: { eventId, title: patch.sectionTitle },
      })
      if (!section) {
        console.warn(`  ⚠️  ${patch.eventKey}/${patch.sectionTitle} 미존재`)
        continue
      }
      if (!section.content.includes(patch.from)) {
        if (section.content.includes(patch.to.slice(0, 40))) {
          console.log(`  ⏭️  ${patch.eventKey}/${patch.sectionTitle} 이미 패치됨`)
        } else {
          console.warn(
            `  ⚠️  ${patch.eventKey}/${patch.sectionTitle} 원문 미일치 — 스킵`,
          )
        }
        continue
      }
      const newContent = section.content.replace(patch.from, patch.to)
      await prisma.eventSection.update({
        where: { id: section.id },
        data: { content: newContent },
      })
      console.log(`  ✅ ${patch.eventKey}/${patch.sectionTitle} 패치`)
    }

    // ── Phase 3: Event description 어휘 정리 ──────────────────────────────
    console.log('\n━━ Phase 3: Event description 어휘 정리 ━━')
    for (const ev of EVENTS) {
      const eventId = eventIds[ev.key]
      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event) continue
      const repl = EVENT_DESCRIPTION_REPLACEMENTS[ev.key]
      if (!event.description?.includes(repl.from)) {
        if (event.description?.includes(repl.to.slice(0, 40))) {
          console.log(`  ⏭️  ${ev.key} description 이미 정리됨`)
        } else {
          console.warn(`  ⚠️  ${ev.key} description 원문 미일치 — 스킵`)
        }
        continue
      }
      const newDesc = event.description.replace(repl.from, repl.to)
      await prisma.event.update({
        where: { id: eventId },
        data: { description: newDesc },
      })
      console.log(`  ✅ ${ev.key} description 정리`)
    }

    console.log('\n✨ 1999 NATO 가입 3개 사건 개선 패치 완료\n')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('\n❌ 패치 실패:', error)
  process.exit(1)
})
