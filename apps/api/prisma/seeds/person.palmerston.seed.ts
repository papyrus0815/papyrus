/**
 * 헨리 존 템플, 3대 파머스턴 자작 (Henry John Temple, 3rd Viscount Palmerston, 1784~1865) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure/Cabinet 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 19세기 중반 영국 정치를 지배한 외교가이자 총리. 약 35년에 걸쳐 전쟁장관·외무장관·내무장관을
 * 역임했고, 두 차례 총리(1855~1858 / 1859~1865)를 지냈다. "포함외교(gunboat diplomacy)"와
 * 강경한 국익 우선 외교로 대표되며, 돈 파시피코 사건의 "Civis Romanus sum" 연설(1850),
 * 크림 전쟁 수행, 노예무역 단속, 이탈리아 통일 지지 등으로 빅토리아 시대 영국의 패권 외교를
 * 상징했다. 토리 → 휘그 → 자유당으로 당적을 옮겨 사실상 최초의 자유당 총리가 되었으며,
 * 1865년 재임 중 사망한 마지막 영국 총리로 기록된다.
 *
 * 의존: seedBritainHistoricalCountries (그레이트브리튼 왕국 / 그레이트브리튼 및 아일랜드 연합왕국 HC) +
 *       seedGovernmentPositionDefinitions ('총리' 관직 정의) 가 먼저 실행돼야 한다.
 *
 * 등록 항목:
 *  - Person x3 (파머스턴 본인 + 배우자 에밀리 램 + 처남 멜번 자작 윌리엄 램)
 *  - GovernmentPositionTenure (영국은 총리·장관에 공식 통산 대수가 없어 termNumber=NULL,
 *    같은 직책 복수 재임은 subTermNumber(기)로만 구분. 자작만 termNumber=3 = 3rd Viscount):
 *      · HEAD_OF_GOVERNMENT x2 (총리 1기 1855~1858 RESIGNATION / 2기 1859~1865 DEATH_IN_OFFICE) + Cabinet x2
 *      · CABINET_MINISTER x5 (전쟁장관 / 외무장관 1·2·3기 / 내무장관)
 *      · ROYAL_NOBLE_TITLE x1 (3대 파머스턴 자작)
 *  - PersonSpouse x2 (파머스턴 ↔ 에밀리, 양방향)
 *  - PersonHumanRelationship x1 (파머스턴 → 멜번, 처남이자 휘그 동지)
 *  - PoliticalParty x2 (휘그당 / 자유당) + CabinetPoliticalParty x2 + PoliticalPartyMembership x2
 *  - PersonCountryAffiliation (본인 x2 / 에밀리·멜번 각 CITIZENSHIP)
 *  - PersonNickname x3 (Pam / Lord Cupid / Lord Pumicestone)
 *  - PersonLifeEvent x10 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  CabinetPartyProvenance,
  CabinetPartyRole,
  DeathType,
  GovernmentPositionType,
  PartyMembershipRoleCategory,
  PersonHumanRelationshipType,
  PoliticalPosition,
  TenureEndReason,
  type PersonNicknameType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const PALMERSTON = {
  name: '헨리',
  middleName: '존',
  surname: '템플',
  originalName: 'Henry John Temple',
  gender: 'MALE' as const,
  birthYear: 1784, birthMonth: 10, birthDay: 20,
  deathYear: 1865, deathMonth: 10, deathDay: 18,
  birthPlaceText: '그레이트브리튼 왕국 런던 웨스트민스터 — 파크 스트리트(현 퀸 앤스 게이트)',
  deathPlaceText: '영국 하트퍼드셔 브로켓 홀(Brocket Hall)',
  deathType: DeathType.ILLNESS,
  deathCause: '오한·발열에서 진행된 폐렴(추정) — 81세 생일을 이틀 앞두고 사망',
  deathNote:
    '1865-10-18 하트퍼드셔의 브로켓 홀에서 재임 중 사망 — 영국 역사상 재임 중 사망한 마지막 총리다. ' +
    '향년 80세(81세 생일 이틀 전). 임종을 앞두고 의사에게 했다는 "죽는다고? 이 사람아, 그건 내가 ' +
    '제일 마지막에 할 일일세(Die, my dear doctor? That\'s the last thing I shall do!)"라는 말이 ' +
    '전해지나 진위는 분명치 않다. 국장으로 웨스트민스터 사원에 안장되었다.',
  influence: 82,
  biography:
    '19세기 중반 영국 정치를 지배한 외교가이자 두 차례 총리(1855~1858 / 1859~1865)를 지낸 정치가. ' +
    '아일랜드 귀족 작위인 파머스턴 자작 3대(3rd Viscount Palmerston)를 1802년 부친에게서 물려받았으나, ' +
    '아일랜드 귀족 작위는 영국 상원 의석을 주지 않아 평생 하원(House of Commons)에서 활동했다. ' +
    '\n\n' +
    '초기 경력(1807~1830). 해로 스쿨·에든버러 대학·케임브리지 세인트 존스 칼리지에서 수학한 뒤 1807년 ' +
    '하원의원이 되었다. 1809년부터 약 19년간 전쟁장관(Secretary at War)으로 군 행정을 맡았으나, 이 시기에는 ' +
    '내각 핵심에서 다소 비껴 있는 토리(Tory)계 인사였다. 1828년 캐닝파(Canningite)로서 토리 정권을 이탈, ' +
    '이후 휘그(Whig)로 옮겨 갔다. ' +
    '\n\n' +
    '외무장관 시기(1830~1851). 세 차례(1830~1834, 1835~1841, 1846~1851)에 걸쳐 외무장관을 지내며 ' +
    '영국 외교의 노선을 사실상 좌우했다. 벨기에 독립(1830~1839)의 보장, 이베리아 반도 사국동맹(1834), ' +
    '동방문제(이집트-오스만 위기) 개입, 제1차 아편전쟁(1839~1842) 수행 등에서 무력 시위를 동반한 ' +
    '강경 외교를 구사해 "포함외교"의 대명사가 되었다. 1850년 돈 파시피코 사건에서는 그리스에 함대를 ' +
    '보내 압박하고, 하원에서 "로마 시민은 어디서든 보호받았듯 영국 신민도 그러해야 한다(Civis Romanus sum)"는 ' +
    '명연설로 여론의 지지를 얻었다. 한편 노예무역 단속에는 적극적이었다. 1851년 빅토리아 여왕·총리 러셀과 ' +
    '상의 없이 루이 나폴레옹의 친위 쿠데타를 승인한 일로 외무장관에서 경질되었다. ' +
    '\n\n' +
    '내무장관·총리 등극(1852~1858). 1852~1855년 애버딘 연립내각의 내무장관을 지냈고, 크림 전쟁(1853~1856) ' +
    '수행 부실로 애버딘 내각이 무너지자 1855-02-06 국민적 인기에 힘입어 총리에 올랐다. 전쟁을 매듭짓고 ' +
    '1856 파리 조약으로 강화했으나, 1857년 제2차 아편전쟁(애로호 사건)을 둘러싼 논란과 1858년 오르시니의 ' +
    '나폴레옹 3세 암살 미수 사건의 여파로 추진한 "살인 공모 법안(Conspiracy to Murder Bill)"이 하원에서 ' +
    '부결되자 사임했다. ' +
    '\n\n' +
    '자유당 창당과 2차 내각(1859~1865). 1859-06 윌리스 룸스 회합에서 휘그·필파·급진파가 결집해 자유당(Liberal Party)이 ' +
    '결성되었고, 파머스턴은 그 첫 정부의 총리로 복귀했다 — 사실상 최초의 자유당 총리다. 2차 내각기에는 ' +
    '이탈리아 통일을 외교적으로 지지하고, 미국 남북전쟁기 중립을 유지(트렌트호 사건 수습)했으며, ' +
    '프로이센-덴마크의 슐레스비히-홀슈타인 분쟁에는 개입을 자제했다. 1865년 총선 직후 재임 중 사망했다. ' +
    '\n\n' +
    '평가. 토리에서 출발해 휘그를 거쳐 자유당 총리로 생을 마친 그는, 강경한 국익 우선·애국주의 외교로 ' +
    '대중적 인기를 누린 빅토리아 중기의 상징적 정치가였다. 의회 개혁·사회 개혁에는 보수적이었던 탓에 ' +
    '그의 사망(1865)은 글래드스턴·디즈레일리로 대표되는 본격적 개혁 정치 시대로 가는 길을 텄다고 평가된다.',
}

// ── 총리 임기 (그레이트브리튼 및 아일랜드 연합왕국) ──────────────────────────
// 영국 총리는 공식 통산 대수(제N대)가 없으므로 termNumber는 비우고, 1기·2기는 subTermNumber로 구분한다.
interface TenureSpec {
  subTermNumber: number
  startYear: number; startMonth: number; startDay: number
  endYear: number; endMonth: number; endDay: number
  appointmentMethod: AppointmentMethod
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  cabinetName: string
}

const TENURES: TenureSpec[] = [
  {
    subTermNumber: 1,
    startYear: 1855, startMonth: 2, startDay: 6,
    endYear: 1858, endMonth: 2, endDay: 19,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1858년 오르시니 사건 이후 추진한 "살인 공모 법안(Conspiracy to Murder Bill)"이 하원에서 부결되자 사임.',
    notes:
      '크림 전쟁 수행 부실로 애버딘 연립내각이 붕괴하자 국민적 인기에 힘입어 1855-02-06 총리 취임. ' +
      '전쟁을 매듭짓고 1856 파리 조약으로 강화했으나, 제2차 아편전쟁 논란과 살인 공모 법안 부결로 1858 사임. (휘그)',
    cabinetName: '1차 파머스턴 내각',
  },
  {
    subTermNumber: 2,
    startYear: 1859, startMonth: 6, startDay: 12,
    endYear: 1865, endMonth: 10, endDay: 18,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail:
      '1865-10-18 하트퍼드셔 브로켓 홀에서 재임 중 사망 — 재임 중 사망한 마지막 영국 총리.',
    notes:
      '1859-06 윌리스 룸스 회합으로 결성된 자유당의 첫 총리로 복귀(사실상 최초의 자유당 총리). ' +
      '이탈리아 통일 지지, 미국 남북전쟁 중립(트렌트호 사건 수습), 슐레스비히-홀슈타인 불개입 등을 거쳐 ' +
      '1865 총선 직후 재임 중 사망. (자유당)',
    cabinetName: '2차 파머스턴 내각',
  },
]

// ── 장관급·작위 임기 (CABINET_MINISTER / ROYAL_NOBLE_TITLE) ──────────────────
// 파머스턴은 총리보다 외무장관으로 더 유명하다. 이 임기들은 Cabinet 행을 만들지 않는다.
// termNumber(대) = 제N대 통산 순서, subTermNumber(기) = 같은 직책 복수 재임 구분.
// 영국 장관직은 통산 대수가 없으므로 termNumber는 비우고, 외무장관 3회만 subTermNumber로 구분한다.
// 자작은 "3대 파머스턴 자작"이라는 명확한 작위 대수가 있으므로 termNumber=3.
interface OfficeTenureSpec {
  positionType: GovernmentPositionType
  title: string
  titleEn: string
  termNumber?: number
  subTermNumber?: number
  startYear: number; startMonth: number; startDay: number
  endYear: number; endMonth: number; endDay: number
  appointmentMethod: AppointmentMethod
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
}

const OFFICE_TENURES: OfficeTenureSpec[] = [
  {
    positionType: GovernmentPositionType.CABINET_MINISTER,
    title: '전쟁장관', titleEn: 'Secretary at War',
    startYear: 1809, startMonth: 10, startDay: 27,
    endYear: 1828, endMonth: 5, endDay: 30,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail: '1828년 캐닝파(Canningite)와 함께 웰링턴 토리 내각에서 동반 사임.',
    notes:
      '약 19년간 전쟁장관(육군 행정·예산 담당)을 지낸, 본인 정치 경력의 출발점. 이 시기에는 토리계 인사였다.',
  },
  {
    positionType: GovernmentPositionType.CABINET_MINISTER,
    title: '외무장관', titleEn: 'Secretary of State for Foreign Affairs',
    subTermNumber: 1,
    startYear: 1830, startMonth: 11, startDay: 22,
    endYear: 1834, endMonth: 11, endDay: 14,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail: '1834-11 윌리엄 4세가 멜번 휘그 내각을 해임하면서 함께 물러남.',
    notes:
      '제1기 외무장관. 그레이 휘그 정권에서 벨기에 독립 보장·사국동맹(1834) 등 입헌주의 진영 외교를 주도.',
  },
  {
    positionType: GovernmentPositionType.CABINET_MINISTER,
    title: '외무장관', titleEn: 'Secretary of State for Foreign Affairs',
    subTermNumber: 2,
    startYear: 1835, startMonth: 4, startDay: 18,
    endYear: 1841, endMonth: 8, endDay: 30,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '1841 총선 패배로 멜번 내각이 총사퇴하며 함께 퇴임.',
    notes:
      '제2기 외무장관. 멜번 내각에서 동방문제(이집트-오스만 위기)·제1차 아편전쟁(1839~42) 등 포함외교의 전성기.',
  },
  {
    positionType: GovernmentPositionType.CABINET_MINISTER,
    title: '외무장관', titleEn: 'Secretary of State for Foreign Affairs',
    subTermNumber: 3,
    startYear: 1846, startMonth: 7, startDay: 6,
    endYear: 1851, endMonth: 12, endDay: 26,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '여왕·총리(러셀)와 상의 없이 루이 나폴레옹의 친위 쿠데타를 승인한 일로 1851-12 외무장관에서 경질.',
    notes:
      '제3기 외무장관. 돈 파시피코 사건("Civis Romanus sum" 연설, 1850) 등 대중적 강경 외교로 절정에 올랐으나, ' +
      '독단적 외교로 1851 경질되었다.',
  },
  {
    positionType: GovernmentPositionType.CABINET_MINISTER,
    title: '내무장관', titleEn: 'Secretary of State for the Home Department',
    startYear: 1852, startMonth: 12, startDay: 28,
    endYear: 1855, endMonth: 2, endDay: 6,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '1855-02-06 총리에 취임하면서 내무장관직을 떠남.',
    notes:
      '애버딘 연립내각의 내무장관(1852~1855). 공장법·공중보건 등 국내 개혁 행정을 맡았고, 크림 전쟁 부실로 ' +
      '애버딘 내각이 무너지자 총리로 직행했다.',
  },
  {
    positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE,
    title: '자작', titleEn: '3rd Viscount Palmerston',
    termNumber: 3,
    startYear: 1802, startMonth: 4, startDay: 17,
    endYear: 1865, endMonth: 10, endDay: 18,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1865 사망으로 작위는 단절(직계 후사 없음).',
    notes:
      '아일랜드 귀족 작위(Peerage of Ireland)인 파머스턴 자작 3대. 1802년 부친 사망으로 승계. ' +
      '아일랜드 귀족이라 영국 상원 의석이 없어 평생 하원에서 활동했다.',
  },
]

// ── 배우자·처남 (Person + 관계) ──────────────────────────────────────────────
interface RelativeSpec {
  key: 'emily' | 'melbourne'
  name: string
  surname: string
  originalName: string
  gender: 'MALE' | 'FEMALE'
  birthYear: number; birthMonth: number; birthDay: number
  deathYear: number; deathMonth: number; deathDay: number
  birthPlaceText: string
  deathPlaceText: string
  deathType: DeathType
  influence: number
  biography: string
}

const EMILY_LAMB: RelativeSpec = {
  key: 'emily',
  name: '에밀리', surname: '램',
  originalName: 'Emily Lamb',
  gender: 'FEMALE',
  birthYear: 1787, birthMonth: 4, birthDay: 21,
  deathYear: 1869, deathMonth: 9, deathDay: 11,
  birthPlaceText: '그레이트브리튼 왕국 런던',
  deathPlaceText: '영국 런던 — 브로켓 홀(말년)',
  deathType: DeathType.NATURAL,
  influence: 32,
  biography:
    '파머스턴 자작 부인. 휘그 정치가이자 두 차례 총리를 지낸 멜번 자작 윌리엄 램의 누이다. ' +
    '첫 결혼으로 카우퍼 백작(5th Earl Cowper)의 부인이 되었다가 1837 사별, 1839 오랜 연인이던 파머스턴과 재혼했다. ' +
    '런던 사교계 최고의 안주인(hostess)으로서 휘그·자유당 정치의 살롱을 운영하며 남편의 정치 경력을 적극 뒷받침했다.',
}

const MELBOURNE: RelativeSpec = {
  key: 'melbourne',
  name: '윌리엄', surname: '램',
  originalName: 'William Lamb',
  gender: 'MALE',
  birthYear: 1779, birthMonth: 3, birthDay: 15,
  deathYear: 1848, deathMonth: 11, deathDay: 24,
  birthPlaceText: '그레이트브리튼 왕국 런던',
  deathPlaceText: '영국 하트퍼드셔 브로켓 홀(Brocket Hall)',
  deathType: DeathType.ILLNESS,
  influence: 60,
  biography:
    '2대 멜번 자작(2nd Viscount Melbourne). 휘그 정치가로 두 차례 총리(1834 / 1835~1841)를 지냈으며, ' +
    '1837 즉위한 빅토리아 여왕의 초기 정치적 멘토이자 신임받는 조언자로 유명하다. 누이 에밀리가 1839 파머스턴과 ' +
    '재혼하면서 파머스턴의 처남이 되었고, 파머스턴은 멜번 내각 내내 외무장관을 맡아 두 사람은 휘그 정권의 핵심 동지였다.',
}

const RELATIVES = [EMILY_LAMB, MELBOURNE] as const

// ── 정당 (휘그 → 자유당) ─────────────────────────────────────────────────────
interface PartySpec {
  key: 'whig' | 'liberal'
  name: string
  shortName: string
  localName: string
  ideology: string
  position: PoliticalPosition
  foundedYear?: number; foundedMonth?: number; foundedDay?: number
  dissolvedYear?: number; dissolvedMonth?: number; dissolvedDay?: number
  brandColor: string
  description: string
}

const WHIG: PartySpec = {
  key: 'whig',
  name: '휘그당', shortName: 'Whig', localName: 'Whigs',
  ideology: '입헌주의·의회개혁·자유무역·반(反)절대왕권',
  position: PoliticalPosition.CENTER_LEFT,
  dissolvedYear: 1859, dissolvedMonth: 6, dissolvedDay: 6,
  brandColor: '#F4A300',
  description:
    '17세기 후반 왕권 견제·의회 우위를 주장하며 등장한 영국의 정파. 19세기 귀족적 자유주의 개혁 세력으로, ' +
    '1832 선거법 개정을 주도했다. 1859년 자유당으로 통합되며 사실상 소멸했다.',
}

const LIBERAL: PartySpec = {
  key: 'liberal',
  name: '자유당', shortName: 'Liberal', localName: 'Liberal Party',
  ideology: '자유주의·자유무역·점진적 개혁',
  position: PoliticalPosition.CENTER_LEFT,
  foundedYear: 1859, foundedMonth: 6, foundedDay: 6,
  brandColor: '#FDBB30',
  description:
    '1859년 윌리스 룸스 회합에서 휘그·필파(Peelite)·급진파가 결집해 결성된 영국의 자유주의 정당. ' +
    '파머스턴이 그 첫 정부의 총리였고, 이후 글래드스턴 아래에서 빅토리아 시대 양대 정당의 한 축으로 성장했다.',
}

const PARTIES = [WHIG, LIBERAL] as const

// 내각 ↔ 정당, 인물 ↔ 정당(당적)
const CABINET_PARTY: { subTermNumber: number; partyKey: 'whig' | 'liberal'; role: CabinetPartyRole }[] = [
  { subTermNumber: 1, partyKey: 'whig', role: CabinetPartyRole.LEADING },
  { subTermNumber: 2, partyKey: 'liberal', role: CabinetPartyRole.LEADING },
]

const PARTY_MEMBERSHIPS: {
  partyKey: 'whig' | 'liberal'
  startYear: number; startMonth: number; startDay: number
  endYear: number; endMonth: number; endDay: number
  roleTitle: string
  notes: string
}[] = [
  {
    partyKey: 'whig',
    startYear: 1830, startMonth: 11, startDay: 22,
    endYear: 1859, endMonth: 6, endDay: 6,
    roleTitle: '지도부 (외무장관·총리)',
    notes: '토리(Pittite)로 출발했으나 1828 캐닝파 이탈을 거쳐 휘그에 합류, 외무장관·총리로 당의 핵심 인물이 되었다.',
  },
  {
    partyKey: 'liberal',
    startYear: 1859, startMonth: 6, startDay: 6,
    endYear: 1865, endMonth: 10, endDay: 18,
    roleTitle: '초대 총리(자유당)',
    notes: '1859 자유당 결성과 함께 첫 자유당 정부의 총리를 맡아 1865 재임 중 사망까지 당을 이끌었다.',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '팸 (Pam)', type: 'PET_NAME', priority: 1 },
  { nickname: '큐피드 경 (Lord Cupid)', type: 'EPITHET', priority: 2 },
  { nickname: '경석 경 (Lord Pumicestone)', type: 'PEJORATIVE', priority: 3 },
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
    title: '웨스트민스터 출생',
    category: 'FAMILY',
    startYear: 1784, startMonth: 10, startDay: 20,
    description: '런던 웨스트민스터에서 2대 파머스턴 자작 헨리 템플의 아들로 출생.',
  },
  {
    title: '파머스턴 자작 3대 승계',
    category: 'PERSONAL',
    startYear: 1802,
    description: '부친 사망으로 아일랜드 귀족 작위 파머스턴 자작 3대를 승계. 아일랜드 귀족이라 상원 의석은 없어 평생 하원에서 활동.',
  },
  {
    title: '하원의원 당선',
    category: 'POLITICAL',
    startYear: 1807,
    description: '뉴포트(와이트섬) 등에서 하원의원으로 정계 진출. 이후 60년 가까이 하원 의원직 유지.',
  },
  {
    title: '전쟁장관 취임',
    category: 'CAREER',
    startYear: 1809,
    endYear: 1828,
    description: '약 19년간 전쟁장관(Secretary at War)으로 군 행정 담당. 이 시기 토리계 인사였다.',
  },
  {
    title: '제1차 외무장관 취임',
    category: 'DIPLOMATIC',
    startYear: 1830,
    endYear: 1841,
    description: '휘그 정권의 외무장관으로 벨기에 독립 보장·동방문제·제1차 아편전쟁 등 강경(포함)외교를 주도.',
  },
  {
    title: '에밀리 램과 결혼',
    category: 'FAMILY',
    startYear: 1839, startMonth: 12, startDay: 16,
    description: '멜번 자작의 누이이자 카우퍼 백작부인이던 에밀리 램(Emily Lamb)과 결혼.',
  },
  {
    title: '돈 파시피코 사건·"Civis Romanus sum" 연설',
    category: 'DIPLOMATIC',
    startYear: 1850, startMonth: 6,
    description: '그리스에 함대를 보내 압박하고, 하원에서 영국 신민 보호를 로마 시민권에 빗댄 명연설로 여론의 지지를 얻음.',
  },
  {
    title: '제1차 총리 취임',
    category: 'POLITICAL',
    startYear: 1855, startMonth: 2, startDay: 6,
    endYear: 1858, endMonth: 2, endDay: 19,
    description: '크림 전쟁 부실로 무너진 애버딘 내각을 이어 총리 취임. 1856 파리 조약으로 전쟁 종결, 1858 살인 공모 법안 부결로 사임.',
  },
  {
    title: '자유당 결성·제2차 총리 취임',
    category: 'POLITICAL',
    startYear: 1859, startMonth: 6, startDay: 12,
    endYear: 1865, endMonth: 10, endDay: 18,
    description: '윌리스 룸스 회합으로 결성된 자유당의 첫 정부 총리로 복귀. 이탈리아 통일 지지·미 남북전쟁 중립 유지.',
  },
  {
    title: '재임 중 사망',
    category: 'HEALTH',
    startYear: 1865, startMonth: 10, startDay: 18,
    description: '하트퍼드셔 브로켓 홀에서 재임 중 사망 — 재임 중 사망한 마지막 영국 총리. 웨스트민스터 사원 안장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const PALMERSTON_STATS = {
  politics: 85,
  military: 60,
  diplomacy: 90,
  intellect: 72,
  charisma: 84,
  administration: 76,
  notes:
    '약 15년에 걸친 외무장관 경력과 "포함외교"로 대표되는 강경 국익 외교 — 외교가 최고 강점. ' +
    '대중적 애국주의 여론을 동력 삼아 두 차례 총리에 오른 정치 감각과, "팸(Pam)"이라 불리며 누린 대중성(카리스마)도 상위. ' +
    '군사는 크림 전쟁을 총리로서 매듭지었으나 야전 지휘관은 아니어서 중상위. 의회·사회 개혁에는 보수적이었다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

async function ensureRelative(
  prisma: PrismaService,
  spec: RelativeSpec,
  accountId: string,
): Promise<string> {
  const existing = await prisma.person.findFirst({ where: { originalName: spec.originalName } })
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (!existing.biography) patch.biography = spec.biography
    if (existing.influence == null) patch.influence = spec.influence
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: existing.id }, data: patch })
      console.log(`  🔧 보강(친족): ${spec.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  친족 이미 존재: ${spec.originalName}`)
    }
    return existing.id
  }
  const created = await prisma.person.create({
    data: {
      name: spec.name,
      surname: spec.surname,
      originalName: spec.originalName,
      biography: spec.biography,
      birthDate: toDate(spec.birthYear, spec.birthMonth, spec.birthDay),
      birthEra: 'AD' as any,
      deathDate: toDate(spec.deathYear, spec.deathMonth, spec.deathDay),
      deathEra: 'AD' as any,
      deathType: spec.deathType,
      gender: spec.gender,
      nameDisplayOrder: 'western' as any,
      influence: spec.influence,
      birthPlaceText: spec.birthPlaceText,
      deathPlaceText: spec.deathPlaceText,
      accountId,
    },
  })
  console.log(`  ✅ 친족 생성: ${spec.originalName} (id=${created.id})`)
  return created.id
}

async function ensureSpouse(
  prisma: PrismaService,
  aId: string,
  bId: string,
  startDate: Date,
  endDate: Date | undefined,
  note: string,
): Promise<void> {
  for (const [personId, spouseId] of [
    [aId, bId],
    [bId, aId],
  ]) {
    const exists = await prisma.personSpouse.findFirst({ where: { personId, spouseId } })
    if (!exists) {
      await prisma.personSpouse.create({
        data: { personId, spouseId, marriageStartDate: startDate, marriageEndDate: endDate, note },
      })
    }
  }
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedPalmerston(prisma: PrismaService): Promise<void> {
  console.log('\n🎩 파머스턴 자작(Henry John Temple) 시딩 시작 (기존 데이터 보존 모드)...')

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
      '  ⚠️  "그레이트브리튼 및 아일랜드 연합왕국" HC 미존재 — 먼저 seedBritainHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }
  const kingdomOfGB = await prisma.historicalCountry.findFirst({
    where: { name: '그레이트브리튼 왕국' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: PALMERSTON.originalName },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = PALMERSTON.biography
    if (!person.birthPlaceText) patch.birthPlaceText = PALMERSTON.birthPlaceText
    if (!person.deathPlaceText) patch.deathPlaceText = PALMERSTON.deathPlaceText
    if (!person.deathType) patch.deathType = PALMERSTON.deathType
    if (!person.deathCause) patch.deathCause = PALMERSTON.deathCause
    if (!person.deathNote) patch.deathNote = PALMERSTON.deathNote
    if (person.influence == null) patch.influence = PALMERSTON.influence
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${PALMERSTON.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${PALMERSTON.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: PALMERSTON.name,
        middleName: PALMERSTON.middleName,
        surname: PALMERSTON.surname,
        originalName: PALMERSTON.originalName,
        biography: PALMERSTON.biography,
        birthDate: toDate(PALMERSTON.birthYear, PALMERSTON.birthMonth, PALMERSTON.birthDay),
        birthEra: 'AD' as any,
        deathDate: toDate(PALMERSTON.deathYear, PALMERSTON.deathMonth, PALMERSTON.deathDay),
        deathEra: 'AD' as any,
        deathType: PALMERSTON.deathType,
        deathCause: PALMERSTON.deathCause,
        deathNote: PALMERSTON.deathNote,
        gender: PALMERSTON.gender,
        nameDisplayOrder: 'western' as any,
        influence: PALMERSTON.influence,
        birthPlaceText: PALMERSTON.birthPlaceText,
        deathPlaceText: PALMERSTON.deathPlaceText,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${PALMERSTON.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 총리 임기 2건 + 내각 2건 ────────────────────────────────────────────
  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })
  const cabinetIdByTerm = new Map<number, string>()
  for (const t of TENURES) {
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: unitedKingdom.id,
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        subTermNumber: t.subTermNumber,
      },
    })
    if (existing) {
      tenureId = existing.id
      console.log(`  ⏭️  재임 스킵 (이미 존재): 총리 ${t.subTermNumber}기`)
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: unitedKingdom.id,
          positionDefinitionId: pmDef?.id ?? undefined,
          positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
          title: '총리',
          subTermNumber: t.subTermNumber, // 영국 총리는 통산 대수(termNumber) 없음 → 기수만
          startDate: toDate(t.startYear, t.startMonth, t.startDay),
          endDate: toDate(t.endYear, t.endMonth, t.endDay),
          appointmentMethod: t.appointmentMethod,
          endReason: t.endReason,
          endReasonDetail: t.endReasonDetail,
          notes: t.notes,
          accountId: admin.id,
        },
      })
      tenureId = created.id
      console.log(
        `  ✅ 재임: 총리 ${t.subTermNumber}기 (${t.startYear}-${String(t.startMonth).padStart(2, '0')} ~ ${t.endYear}-${String(t.endMonth).padStart(2, '0')})`,
      )
    }

    // 행정부(Cabinet) — 총리 임기 1건당 내각 1건 (행정부 뷰 노출용)
    const cab = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
    if (cab) {
      cabinetIdByTerm.set(t.subTermNumber, cab.id)
      console.log(`  ⏭️  내각 스킵 (이미 존재): ${cab.name ?? t.cabinetName}`)
    } else {
      const createdCab = await prisma.cabinet.create({
        data: { headTenureId: tenureId, name: t.cabinetName, accountId: admin.id },
      })
      cabinetIdByTerm.set(t.subTermNumber, createdCab.id)
      console.log(`  🏛️  내각: ${t.cabinetName}`)
    }
  }

  // ── 2-1) 장관급·작위 임기 (CABINET_MINISTER / ROYAL_NOBLE_TITLE) ───────────
  for (const o of OFFICE_TENURES) {
    const def = await prisma.governmentPositionDefinition.findFirst({
      where: { title: o.title, positionType: o.positionType },
      select: { id: true },
    })
    // 같은 직책 복수 재임(외무장관)은 subTermNumber로, 단임은 title로 구분
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: unitedKingdom.id,
        positionType: o.positionType,
        title: o.title,
        subTermNumber: o.subTermNumber ?? null,
      },
    })
    const label = o.subTermNumber ? `${o.title} ${o.subTermNumber}기` : o.title
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${label}`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: unitedKingdom.id,
        positionDefinitionId: def?.id ?? undefined,
        positionType: o.positionType,
        title: o.title,
        termNumber: o.termNumber, // 자작(3대)만 값 존재, 장관직은 undefined(NULL)
        subTermNumber: o.subTermNumber,
        startDate: toDate(o.startYear, o.startMonth, o.startDay),
        endDate: toDate(o.endYear, o.endMonth, o.endDay),
        appointmentMethod: o.appointmentMethod,
        endReason: o.endReason,
        endReasonDetail: o.endReasonDetail,
        notes: o.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${label}${o.termNumber ? ` (${o.termNumber}대)` : ''} (${o.startYear}~${o.endYear})`)
  }

  // ── 2-2) 배우자(에밀리 램)·처남(멜번) + 혼인·인간관계 ──────────────────────
  const relativeIds = new Map<string, string>()
  for (const r of RELATIVES) {
    const id = await ensureRelative(prisma, r, admin.id)
    relativeIds.set(r.key, id)
    // 친족도 연합왕국 소속을 달아 countryId 백필이 가능하게 한다
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: { personId: id, historicalCountryId: unitedKingdom.id, affiliationType: 'CITIZENSHIP' as any },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: { personId: id, historicalCountryId: unitedKingdom.id, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
      })
    }
  }
  const emilyId = relativeIds.get('emily')!
  const melbourneId = relativeIds.get('melbourne')!

  await ensureSpouse(
    prisma, personId, emilyId,
    toDate(1839, 12, 16), toDate(1865, 10, 18),
    '1839-12-16 혼인. 에밀리는 카우퍼 백작과 사별 후 재혼했다. 파머스턴 사망(1865)으로 사별.',
  )
  console.log('  💍 혼인: 파머스턴 ↔ 에밀리 램')

  const relExists = await prisma.personHumanRelationship.findFirst({
    where: { fromPersonId: personId, toPersonId: melbourneId },
  })
  if (!relExists) {
    await prisma.personHumanRelationship.create({
      data: {
        fromPersonId: personId,
        toPersonId: melbourneId,
        relationshipType: PersonHumanRelationshipType.GENERAL,
        isMutual: true,
        affinityLevel: 1,
        startDate: toDate(1830, 11, 22),
        note:
          '처남이자 휘그 정권의 핵심 동지. 파머스턴이 멜번의 누이 에밀리와 1839 재혼해 인척이 되었고, ' +
          '파머스턴은 멜번 내각(1835~1841) 내내 외무장관을 맡았다.',
      },
    })
    console.log('  🤝 인간관계: 파머스턴 → 멜번 (처남·휘그 동지)')
  } else {
    console.log('  ⏭️  인간관계 스킵 (이미 존재): 파머스턴 → 멜번')
  }

  // ── 2-3) 정당(휘그·자유당) + 내각정당 + 당적 ───────────────────────────────
  const partyIdByKey = new Map<string, string>()
  for (const p of PARTIES) {
    let party = await prisma.politicalParty.findFirst({
      where: { name: p.name, historicalCountryId: unitedKingdom.id },
    })
    if (!party) {
      party = await prisma.politicalParty.create({
        data: {
          historicalCountryId: unitedKingdom.id,
          name: p.name,
          shortName: p.shortName,
          localName: p.localName,
          ideology: p.ideology,
          position: p.position,
          foundedDate: p.foundedYear ? toDate(p.foundedYear, p.foundedMonth, p.foundedDay) : null,
          dissolvedDate: p.dissolvedYear ? toDate(p.dissolvedYear, p.dissolvedMonth, p.dissolvedDay) : null,
          description: p.description,
          brandColor: p.brandColor,
        },
      })
      console.log(`  ✅ 정당: ${p.name} (${p.localName})`)
    } else {
      console.log(`  ⏭️  정당 스킵 (이미 존재): ${p.name}`)
    }
    partyIdByKey.set(p.key, party.id)
  }

  for (const cp of CABINET_PARTY) {
    const cabinetId = cabinetIdByTerm.get(cp.subTermNumber)
    const partyId = partyIdByKey.get(cp.partyKey)
    if (!cabinetId || !partyId) continue
    const exists = await prisma.cabinetPoliticalParty.findFirst({ where: { cabinetId, partyId } })
    if (!exists) {
      await prisma.cabinetPoliticalParty.create({
        data: { cabinetId, partyId, role: cp.role, provenance: CabinetPartyProvenance.MANUAL },
      })
      console.log(`  🏛️🎌 내각정당: ${cp.partyKey} (${cp.role})`)
    }
  }

  for (const pm of PARTY_MEMBERSHIPS) {
    const partyId = partyIdByKey.get(pm.partyKey)
    if (!partyId) continue
    const startDate = toDate(pm.startYear, pm.startMonth, pm.startDay)
    const exists = await prisma.politicalPartyMembership.findFirst({
      where: { personId, partyId, startDate },
    })
    if (!exists) {
      await prisma.politicalPartyMembership.create({
        data: {
          personId,
          partyId,
          startDate,
          endDate: toDate(pm.endYear, pm.endMonth, pm.endDay),
          roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
          roleTitle: pm.roleTitle,
          notes: pm.notes,
        },
      })
      console.log(`  🎫 당적: ${pm.partyKey} (${pm.roleTitle})`)
    }
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: {
    historicalCountryId: string
    type: 'BIRTH_PLACE' | 'CITIZENSHIP'
    label: string
    priority: number
  }[] = []
  if (kingdomOfGB) {
    affiliations.push({
      historicalCountryId: kingdomOfGB.id,
      type: 'BIRTH_PLACE',
      label: '그레이트브리튼 왕국 (1784 출생)',
      priority: 1,
    })
  }
  affiliations.push({
    historicalCountryId: unitedKingdom.id,
    type: 'CITIZENSHIP',
    label: '그레이트브리튼 및 아일랜드 연합왕국 (정치 활동·총리)',
    priority: 0,
  })
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
        politics: PALMERSTON_STATS.politics,
        military: PALMERSTON_STATS.military,
        diplomacy: PALMERSTON_STATS.diplomacy,
        intellect: PALMERSTON_STATS.intellect,
        charisma: PALMERSTON_STATS.charisma,
        administration: PALMERSTON_STATS.administration,
        notes: PALMERSTON_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${PALMERSTON_STATS.politics}·군사 ${PALMERSTON_STATS.military}·` +
        `외교 ${PALMERSTON_STATS.diplomacy}·학식 ${PALMERSTON_STATS.intellect}·` +
        `카리스마 ${PALMERSTON_STATS.charisma}·행정 ${PALMERSTON_STATS.administration}`,
    )
  }

  console.log('✅ 파머스턴 자작 시딩 완료\n')
}
