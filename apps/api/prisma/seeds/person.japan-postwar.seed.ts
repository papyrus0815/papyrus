/**
 * 전후 일본(1945~1948) 시드
 *
 * 등록 항목:
 *  - HistoricalCountry: 일본국 (1947-05-03 신헌법 시행 ~ 현재)
 *  - HistoricalCountryTransition: 일본 제국 → 일본국 (SUCCESSION)
 *  - PoliticalParty x3: 일본진보당, 일본자유당, 일본사회당 (1945-11 결당)
 *  - Person x4: 히가시쿠니노미야 나루히코(43대) / 시데하라 기주로(44대) / 요시다 시게루(45·48·49·50·51대 중 1차) / 가타야마 데쓰(46대)
 *  - GovernmentPositionTenure x4 (43~46대)
 *  - Cabinet x4 (각 임기를 머리로 하는 내각) + CabinetPoliticalParty
 *  - PoliticalPartyMembership x3 (히가시쿠니노미야 제외, 황족 출신)
 *  - Event x5: 포츠담선언 수락 / 항복 문서 조인 / GHQ 점령 / 일본국헌법 공포 / 일본국헌법 시행
 *
 * 의존성: seedJapanMeijiEra (일본 제국·관직 정의·황실 가문) 가 먼저 실행되어야 함.
 */
import {
  AppointmentMethod,
  CabinetPartyProvenance,
  CabinetPartyRole,
  EventCountryRole,
  GovernmentPositionType,
  HistoricalEntityKind,
  HistoricalStateType,
  PartyMembershipRoleCategory,
  PoliticalPosition,
  TenureEndReason,
  TransitionEventType,
  TransitionScope,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
async function getHistoricalCountryId(prisma: PrismaService, name: string): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}
async function getDynastyId(prisma: PrismaService, name: string): Promise<string | null> {
  const d = await prisma.dynasty.findFirst({ where: { name } })
  return d?.id ?? null
}
async function getPositionDefId(prisma: PrismaService, title: string): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

// ── 역사 국가: 일본국 ────────────────────────────────────────────────────────
const POSTWAR_JAPAN = {
  name: '일본국',
  enName: 'Japan (post-1947)',
  description:
    '1947년 5월 3일 일본국 헌법 시행과 함께 출범한 일본의 현행 정치체. 천황은 "국가와 국민통합의 상징"으로 위상이 격하되었고, 주권이 국민에게 있는 의원내각제 입헌군주국이 되었다. 평화헌법 제9조에 따라 전쟁 포기·전력 비보유를 명문화했으며, 미·일 안보체제 하에서 경제 성장을 거쳐 동아시아 자유민주주의 진영의 핵심이 되었다.',
  startEra: 'AD' as const, startYear: 1947, startMonth: 5, startDay: 3,
  // endYear/endMonth: null (현재 진행 중)
  stateType: HistoricalStateType.HEREDITARY, // 입헌세습군주국 (천황 = 상징)
  entityKind: HistoricalEntityKind.STATE,
  latitude: 35.6895, longitude: 139.6917,
}

// ── 정당 (모두 1945년 결당, 일본 제국 hc 소속으로 등록) ────────────────────
interface PartyEntry {
  name: string
  shortName?: string
  localName: string
  ideology: string
  position: PoliticalPosition
  foundedDate: Date
  dissolvedDate?: Date
  description: string
  brandColor?: string
}

const PARTIES: PartyEntry[] = [
  {
    name: '일본진보당',
    shortName: '진보당',
    localName: '日本進歩党',
    ideology: '온건 보수주의, 자유주의, 의회주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1945-11-16'),
    dissolvedDate: new Date('1947-03-31'),
    description:
      '대정익찬회 해체 후 구 입헌민정당계 의원들이 결성한 보수 정당. 시데하라 내각의 여당이었으나 1946년 1월 GHQ의 공직추방령으로 다수 의원이 추방되며 큰 타격을 입었다. 1947년 3월 국민당 등과 통합해 민주당(民主党)을 결성.',
    brandColor: '#1565C0',
  },
  {
    name: '일본자유당',
    shortName: '자유당',
    localName: '日本自由党',
    ideology: '보수주의, 반공주의, 자유주의',
    position: PoliticalPosition.RIGHT,
    foundedDate: new Date('1945-11-09'),
    dissolvedDate: new Date('1948-03-15'),
    description:
      '구 입헌정우회계 의원들이 하토야마 이치로를 중심으로 결성한 보수 정당. 1946년 4월 총선에서 제1당이 되어 요시다 시게루가 1차 내각을 조각. 1948년 민주당 일부와 통합해 민주자유당(民主自由党, 훗날 자유민주당의 전신)으로 개편.',
    brandColor: '#C62828',
  },
  {
    name: '일본사회당',
    shortName: '사회당',
    localName: '日本社会党',
    ideology: '사회민주주의, 민주사회주의, 비무장중립주의(좌파)',
    position: PoliticalPosition.CENTER_LEFT,
    foundedDate: new Date('1945-11-02'),
    dissolvedDate: new Date('1996-01-19'), // 사회민주당으로 당명 변경
    description:
      '전전 사회대중당·노농당계 등 무산정당 세력이 결집해 결성한 사회민주주의 정당. 1947년 4월 총선에서 제1당(143석)이 되어 가타야마 데쓰가 일본 최초의 사회당계 총리로 취임, 민주당·국민협동당과 3당 연립 내각을 구성했다.',
    brandColor: '#E91E63',
  },
]

// ── 인물 ─────────────────────────────────────────────────────────────────────
interface PersonStatsInput {
  politics: number
  military: number
  diplomacy: number
  intellect: number
  charisma: number
  administration: number
  notes?: string
}

interface TenureEntry {
  countryName: string
  positionTitle: string
  positionType: GovernmentPositionType
  termNumber: number
  startYear: number; startMonth: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  appointmentMethod: AppointmentMethod
  endReason?: TenureEndReason
  notes?: string
  cabinetName: string
  /** 내각의 여당·연정 정당 — CabinetPoliticalParty 등록용 */
  cabinetParties?: { partyName: string; role: CabinetPartyRole; notes?: string }[]
}

interface PersonEntry {
  name: string
  surname?: string
  originalName: string
  biography: string
  birthYear: number; birthMonth: number; birthDay: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender: string
  dynastyName?: string
  countryName?: string
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
  tenures: TenureEntry[]
  /** 정당 멤버십 — PoliticalPartyMembership */
  partyMemberships?: {
    partyName: string
    startYear: number; startMonth?: number; startDay?: number
    endYear?: number; endMonth?: number; endDay?: number
    roleCategory: PartyMembershipRoleCategory
    roleTitle?: string
    notes?: string
  }[]
}

const PERSONS: PersonEntry[] = [
  // ── 43대: 히가시쿠니노미야 나루히코 ───────────────────────────────────────
  {
    name: '나루히코',
    surname: '히가시쿠니노미야',
    originalName: 'Higashikuni Naruhiko',
    biography:
      '일본 제43대 내각총리대신(1945.8.17~10.9). 메이지 천황의 외손녀를 아내로 둔 황족(東久邇宮家 당주)이자 육군 대장. 본토결전 직전인 1945년 8월 17일 종전 처리를 위해 황족 출신으로는 처음이자 마지막으로 총리에 올랐다. 무장해제·연합군 진주 협조·항복 문서 조인을 매끄럽게 진행했으나 GHQ의 인권지령(특고경찰 폐지·치안유지법 폐지)을 거부하여 54일 만에 총사퇴했다. 1947년 신헌법 시행에 따라 황적이탈(臣籍降下)로 평민이 되었다.',
    birthYear: 1887, birthMonth: 12, birthDay: 3,
    deathYear: 1990, deathMonth: 1, deathDay: 20,
    gender: 'MALE',
    dynastyName: '황실',
    countryName: '일본 제국',
    birthPlaceText: '교토부 교토시 — 구바미야가(久邇宮家) 별저',
    influence: 55,
    stats: {
      politics: 55, military: 75, diplomacy: 65, intellect: 60, charisma: 70, administration: 55,
      notes: '황족·육군 대장 — 종전 처리에 한해 카리스마 발휘. 정치 경험 부족.',
    },
    tenures: [
      {
        countryName: '일본 제국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 43,
        startYear: 1945, startMonth: 8, startDay: 17,
        endYear: 1945, endMonth: 10, endDay: 9,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '일본 헌정사 유일의 황족 총리. 9월 2일 미주리함 항복문서 조인을 맡았으며 GHQ 인권지령(특고·치안유지법 폐지) 수용 거부로 총사직.',
        cabinetName: '히가시쿠니노미야 내각',
        cabinetParties: [
          // 거국일치(초당파) 내각 — 정당 분류 모호. 정식 여당 등록 생략.
        ],
      },
    ],
    // 황족 → 정당 무소속
  },

  // ── 44대: 시데하라 기주로 ─────────────────────────────────────────────────
  {
    name: '기주로',
    surname: '시데하라',
    originalName: 'Shidehara Kijūrō',
    biography:
      '일본 제44대 내각총리대신(1945.10.9~1946.5.22). 외무관료 출신으로 다이쇼·쇼와 초기 외무대신을 4차례 역임하며 영미 협조·국제 연맹 중심의 "시데하라 외교"를 주도했다. 군부의 만주사변 후 정치 일선에서 물러나 있다가 종전 직후 75세에 총리에 추대됐다. 재임 중 GHQ의 5대 개혁 지령(부인 참정권·노동조합 합법화·교육 자유화·압정 폐지·경제민주화)을 수용했고, 맥아더와 함께 헌법 9조 발상을 공유한 것으로 알려져 있다. 후임 요시다 내각에서 부총리를 역임했다.',
    birthYear: 1872, birthMonth: 9, birthDay: 13,
    deathYear: 1951, deathMonth: 3, deathDay: 10,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '오사카부 가도마무라(門真村) — 현재 오사카부 가도마시',
    influence: 78,
    stats: {
      politics: 75, military: 35, diplomacy: 95, intellect: 88, charisma: 60, administration: 80,
      notes: '"시데하라 외교"의 영미 협조 노선. 외교·행정 강점, 군사·정치력은 평이.',
    },
    tenures: [
      {
        countryName: '일본 제국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 44,
        startYear: 1945, startMonth: 10, startDay: 9,
        endYear: 1946, endMonth: 5, endDay: 22,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          'GHQ 5대 개혁 지령 수용. 1946년 4월 전후 첫 총선(부인 참정권 최초) 패배 후 총사직. 신헌법 초안 작업이 본격화된 시기.',
        cabinetName: '시데하라 내각',
        cabinetParties: [
          { partyName: '일본진보당', role: CabinetPartyRole.LEADING, notes: '결당 직후 다수 입각으로 사실상 여당화.' },
        ],
      },
    ],
    partyMemberships: [
      {
        partyName: '일본진보당',
        startYear: 1945, startMonth: 11, startDay: 16,
        endYear: 1947, endMonth: 3, endDay: 31,
        roleCategory: PartyMembershipRoleCategory.GENERAL_MEMBER,
        notes: '시데하라 내각 시기 진보당 소속.',
      },
    ],
  },

  // ── 45대: 요시다 시게루 1차 ───────────────────────────────────────────────
  {
    name: '시게루',
    surname: '요시다',
    originalName: 'Yoshida Shigeru',
    biography:
      '일본 제45·48·49·50·51대 내각총리대신. 외무관료 출신으로 주영국·주이탈리아 대사를 역임했고 영미 협조파의 거두였다. 1946년 4월 총선에서 제1당이 된 일본자유당의 총재로서 첫 조각, 신헌법 공포(1946.11.3)와 시행(1947.5.3)을 맡았다. 1948년부터 1954년까지 4·5·6차 내각을 이어가며 샌프란시스코 강화조약(1951)·미일안보조약(1951)을 체결, "요시다 독트린"(경무장+경제 우선) 노선으로 전후 일본의 기본 진로를 설정했다.',
    birthYear: 1878, birthMonth: 9, birthDay: 22,
    deathYear: 1967, deathMonth: 10, deathDay: 20,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '도쿄부 도쿄시 — 현재 도쿄도',
    influence: 92,
    stats: {
      politics: 90, military: 50, diplomacy: 95, intellect: 85, charisma: 80, administration: 88,
      notes: '"요시다 독트린"의 설계자 — 외교·정치·행정 모두 정상급. 경제 우선·경무장 노선의 완성자.',
    },
    tenures: [
      {
        countryName: '일본 제국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 45,
        startYear: 1946, startMonth: 5, startDay: 22,
        endYear: 1947, endMonth: 5, endDay: 24,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '1차 내각. 재임 중 일본국 헌법 공포(1946.11.3)·시행(1947.5.3) 진행. 1947년 4월 총선에서 사회당에 제1당 자리를 내주고 가타야마에게 정권 이양.',
        cabinetName: '제1차 요시다 내각',
        cabinetParties: [
          { partyName: '일본자유당', role: CabinetPartyRole.LEADING, notes: '단독 여당. 제22회 총선(1946-04) 제1당.' },
          { partyName: '일본진보당', role: CabinetPartyRole.COALITION_PARTNER, notes: '각외 협력으로 입각 일부.' },
        ],
      },
    ],
    partyMemberships: [
      {
        partyName: '일본자유당',
        startYear: 1946, startMonth: 5, startDay: 15, // 하토야마 공직추방 직후 총재 취임
        endYear: 1948, endMonth: 3, endDay: 15,
        roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
        roleTitle: '총재',
        notes: '하토야마 이치로의 공직추방으로 1946년 5월 자유당 총재 취임.',
      },
    ],
  },

  // ── 46대: 가타야마 데쓰 ───────────────────────────────────────────────────
  {
    name: '데쓰',
    surname: '가타야마',
    originalName: 'Katayama Tetsu',
    biography:
      '일본 제46대 내각총리대신(1947.5.24~1948.3.10). 변호사 출신의 기독교 사회주의자. 1947년 4월 총선(제23회 중의원 의원 총선거)에서 일본사회당이 제1당이 되자 사회당 위원장으로서 민주당·국민협동당과 3당 연립 내각을 조각, 일본 헌정사 최초의 사회당계 총리·최초의 기독교인 총리가 되었다. 신헌법 시행 직후의 격동기를 맡았으나 식량난·인플레이션·당내 좌우 대립으로 9개월 만에 총사직. 가타야마 내각은 신헌법 하 첫 내각이자 일본 행정조직법(1948), 노동기준법(1947) 시행을 책임졌다.',
    birthYear: 1887, birthMonth: 7, birthDay: 28,
    deathYear: 1978, deathMonth: 5, deathDay: 30,
    gender: 'MALE',
    countryName: '일본국',
    birthPlaceText: '와카야마현 다나베정 — 현재 와카야마현 다나베시',
    influence: 65,
    stats: {
      politics: 70, military: 30, diplomacy: 60, intellect: 80, charisma: 65, administration: 65,
      notes: '기독교 사회주의·법조 — 좌우 양 날개를 봉합하지 못한 한계. 행정·정치 평이.',
    },
    tenures: [
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 46,
        startYear: 1947, startMonth: 5, startDay: 24,
        endYear: 1948, endMonth: 3, endDay: 10,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '신헌법(1947.5.3) 시행 직후 첫 총리 — 처음으로 국회 지명에 의해 선출. 사회당·민주당·국민협동당 3당 연립. 사회당 좌파의 예산안 반발로 총사직.',
        cabinetName: '가타야마 내각',
        cabinetParties: [
          { partyName: '일본사회당', role: CabinetPartyRole.LEADING, notes: '제23회 총선 제1당(143석).' },
          { partyName: '일본진보당', role: CabinetPartyRole.COALITION_PARTNER, notes: '※ 1947-03에 민주당으로 흡수 통합되었으나 본 시드는 진보당으로 정합 — 민주당 등록은 후속 시드 과제.' },
        ],
      },
    ],
    partyMemberships: [
      {
        partyName: '일본사회당',
        startYear: 1945, startMonth: 11, startDay: 2,
        endYear: 1963, endMonth: 11, endDay: 21, // 정계 은퇴
        roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
        roleTitle: '서기장 → 위원장(중앙집행위원장)',
        notes: '결당 시 서기장. 1946-09 위원장 취임 후 1950년까지 재임.',
      },
    ],
  },
]

// ── 사건 ─────────────────────────────────────────────────────────────────────
interface EventEntry {
  title: string
  description: string
  startDate: string
  startDatePrecision?: 'year' | 'month' | 'day'
  endDate?: string
  endDatePrecision?: 'year' | 'month' | 'day'
  location: string
  category: string
  historicalCountryName?: string
  background?: string
  aftermath?: string
  keywords: string[]
  countryRelations?: { historicalCountryName?: string; countryName?: string; role: EventCountryRole; roleDescription?: string }[]
  sections?: { title: string; content: string; order: number; sectionType?: string }[]
}

const EVENTS: EventEntry[] = [
  {
    title: '포츠담 선언 수락과 옥음방송',
    description:
      '1945년 8월 14일 일본 정부가 포츠담 선언 수락을 결정하고, 다음날 8월 15일 정오 쇼와 천황의 "옥음방송(玉音放送)"을 통해 무조건 항복을 국민에게 알린 일련의 사건. 4년에 걸친 태평양전쟁의 사실상 종전을 의미한다.',
    startDate: '1945-08-14',
    startDatePrecision: 'day',
    endDate: '1945-08-15',
    endDatePrecision: 'day',
    location: '도쿄 황거 / 일본 전역(라디오 방송)',
    category: '정치',
    historicalCountryName: '일본 제국',
    background:
      '1945년 7월 26일 미·영·중 3국 수뇌가 발표한 포츠담 선언은 일본의 무조건 항복을 요구했다. 일본 내부에서는 본토결전을 주장하는 군부와 종전을 모색하는 외무·궁정파가 격렬히 대립했다. 8월 6일 히로시마, 8월 9일 나가사키 원폭 투하와 8월 8일 소련의 대일 참전이 결정타가 되었으며, 8월 9~10일 어전회의에서 천황의 "성단(聖斷)"으로 수락이 결정되었다.',
    aftermath:
      '8월 17일 히가시쿠니노미야 내각 발족. 9월 2일 미주리함 상에서 항복 문서 조인. 일본은 GHQ(연합군 최고사령부) 점령 통치기로 진입했다.',
    keywords: ['포츠담선언', '옥음방송', '쇼와천황', '종전', '태평양전쟁', '8.15'],
    countryRelations: [
      { historicalCountryName: '일본 제국', role: EventCountryRole.TARGET, roleDescription: '항복 선언 주체. 포츠담 선언의 수신국.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: '연합국 주도국. 포츠담 선언·원폭 투하.' },
      { historicalCountryName: '소비에트 사회주의 공화국 연방', role: EventCountryRole.ADVERSARY, roleDescription: '8월 8일 대일 선전포고.' },
      { countryName: '영국', role: EventCountryRole.ADVERSARY, roleDescription: '포츠담 선언 공동 발표국.' },
      { countryName: '중국', role: EventCountryRole.ADVERSARY, roleDescription: '포츠담 선언 공동 발표국.' },
    ],
    sections: [
      {
        order: 1, title: '결정에 이르는 어전회의', sectionType: 'process',
        content: `<p>1945년 8월 9~10일 황거 지하 방공호에서 열린 두 차례 어전회의는 일본 헌정사상 가장 격렬한 회합 중 하나였다.</p>
<ul>
  <li><strong>주전파</strong>: 육군대신 아나미 고레치카, 참모총장 우메즈 요시지로, 군령부총장 도요다 소에무 — 본토결전 주장.</li>
  <li><strong>화평파</strong>: 외무대신 도고 시게노리, 추밀원 의장 히라누마 기이치로, 해군대신 요나이 미쓰마사 — 국체 호지 조건부 수락.</li>
  <li><strong>성단</strong>: 8월 10일 새벽 2시, 스즈키 간타로 총리가 천황의 결단을 청하자 쇼와 천황은 "외무대신 안에 동의한다"고 답하여 종전 결정.</li>
</ul>`,
      },
      {
        order: 2, title: '8월 15일 옥음방송', sectionType: 'process',
        content: `<p>8월 14일 밤 녹음된 천황의 종전 조서가 8월 15일 정오 NHK 라디오로 방송되었다. "참기 어려움을 참고 견디기 어려움을 견뎌 만세를 위하여 태평을 열고자 한다"는 구절이 유명하다. 방송 직전 일부 청년 장교들이 녹음판 탈취를 시도한 "궁성 사건"이 있었으나 진압되었다.</p>`,
      },
    ],
  },
  {
    title: '일본의 항복 문서 조인',
    description:
      '1945년 9월 2일 도쿄 만에 정박한 미 해군 전함 미주리(USS Missouri)함 갑판에서 거행된 항복 문서 조인식. 일본 측은 외무대신 시게미쓰 마모루(정부 대표)와 참모총장 우메즈 요시지로(군 대표)가 서명했고, 연합국 측은 더글러스 맥아더 최고사령관 등 9개국 대표가 서명했다.',
    startDate: '1945-09-02',
    startDatePrecision: 'day',
    endDate: '1945-09-02',
    endDatePrecision: 'day',
    location: '도쿄 만 미주리함 (USS Missouri, BB-63)',
    category: '회담/조약',
    historicalCountryName: '일본 제국',
    background:
      '8월 15일 옥음방송 이후 연합국과 일본 정부 간 휴전 절차가 진행되었다. 8월 30일 맥아더가 가나가와 아쓰기 비행장에 도착하여 GHQ 점령 통치를 개시했고, 9월 2일 미주리함에서 공식 항복 문서가 조인되었다.',
    aftermath:
      '제2차 세계대전이 공식적으로 종결되었다. 9월 2일은 미국·러시아 등에서 대일 전승기념일(VJ Day)로 지정되었다. 일본은 이후 1952년 4월 28일 샌프란시스코 강화조약 발효까지 약 6년 8개월간 GHQ 점령 통치를 받았다.',
    keywords: ['항복문서', '미주리함', '맥아더', 'VJ데이', '시게미쓰마모루', '우메즈요시지로', 'GHQ'],
    countryRelations: [
      { historicalCountryName: '일본 제국', role: EventCountryRole.TARGET, roleDescription: '항복 당사국.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: '연합국 주도국. 맥아더가 항복 수락.' },
      { historicalCountryName: '소비에트 사회주의 공화국 연방', role: EventCountryRole.ADVERSARY, roleDescription: '연합국 일원.' },
      { countryName: '영국', role: EventCountryRole.ADVERSARY, roleDescription: '연합국 일원.' },
      { countryName: '중국', role: EventCountryRole.ADVERSARY, roleDescription: '연합국 일원.' },
    ],
  },
  {
    title: 'GHQ 점령 통치 개시',
    description:
      '1945년 9월 2일 항복 문서 조인 직후부터 1952년 4월 28일 샌프란시스코 강화조약 발효까지, 더글러스 맥아더가 이끄는 연합군 최고사령부(GHQ/SCAP, General Headquarters / Supreme Commander for the Allied Powers)가 일본을 간접 통치한 시기. 일본 정부는 존속했으나 GHQ의 지령에 따라 정책을 집행하는 형태였다.',
    startDate: '1945-08-30',
    startDatePrecision: 'day',
    endDate: '1952-04-28',
    endDatePrecision: 'day',
    location: '도쿄 다이이치 생명관(第一生命館) — GHQ 본부',
    category: '정치',
    historicalCountryName: '일본 제국',
    background:
      '포츠담 선언 수락 후 연합국은 일본을 직접 점령하기로 결정했다. 8월 30일 맥아더가 아쓰기에 도착하여 점령을 개시했고, 일본은 분할되지 않은 채 미군 단독 점령 형태가 되었다(미·영·소·중 4개국으로 구성된 극동위원회와 4개국 대일이사회가 자문 역할).',
    aftermath:
      'GHQ 통치 하에서 다음의 대개혁이 단행되었다 — ① 군대 해산·군국주의자 공직추방, ② 신헌법 제정(1946-47), ③ 농지개혁(1946-50), ④ 재벌 해체, ⑤ 노동조합 합법화·노동기준법(1947), ⑥ 교육개혁(1947-48), ⑦ 극동국제군사재판(1946-48). 1952년 4월 28일 샌프란시스코 강화조약 발효로 일본은 주권을 회복하고 점령이 종료되었다.',
    keywords: ['GHQ', 'SCAP', '맥아더', '점령통치', '대일이사회', '극동위원회', '연합국'],
    countryRelations: [
      { historicalCountryName: '일본 제국', role: EventCountryRole.TARGET, roleDescription: '점령 통치 대상국.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: 'GHQ 주도. 맥아더 최고사령관.' },
      { countryName: '영국', role: EventCountryRole.ALLY, roleDescription: '극동위원회·대일이사회 참여.' },
      { historicalCountryName: '소비에트 사회주의 공화국 연방', role: EventCountryRole.ALLY, roleDescription: '대일이사회 참여.' },
      { countryName: '중국', role: EventCountryRole.ALLY, roleDescription: '대일이사회 참여.' },
    ],
  },
  {
    title: '일본국 헌법 공포',
    description:
      '1946년 11월 3일 일본 정부가 신헌법(일본국 헌법)을 공포한 사건. 1946년 2월 GHQ 민정국이 작성한 초안(이른바 "맥아더 초안")을 기초로 일본 정부가 다듬은 안을 제90회 제국의회가 심의·수정 가결하여 천황이 공포했다. 메이지 헌법(대일본제국헌법)을 형식상 개정하는 형태로 이루어졌다.',
    startDate: '1946-11-03',
    startDatePrecision: 'day',
    endDate: '1946-11-03',
    endDatePrecision: 'day',
    location: '도쿄 황거 — 일본 정부',
    category: '정치',
    historicalCountryName: '일본 제국',
    background:
      'GHQ는 1945년 10월 시데하라 내각에 헌법 개정을 지시했다. 일본 정부 헌법문제조사위원회(마쓰모토 위원회)가 작성한 보수적 초안이 GHQ에 의해 거부되자, 1946년 2월 GHQ 민정국이 9일 만에 작성한 새 초안이 일본 정부에 제시되었다(맥아더 초안). 정부는 이를 토대로 헌법개정초안 요강을 발표(1946-03-06), 4월 총선을 거친 새 의회(제90회)에서 심의되어 1946년 10월 7일 가결, 11월 3일 메이지 천황 탄생일에 맞춰 공포되었다.',
    aftermath:
      '6개월의 주지 기간을 거쳐 1947년 5월 3일 시행. 천황의 지위가 "국가와 국민통합의 상징"으로 변경되었고(1조), 주권이 국민에게 이양되었으며(전문), 전쟁 포기(9조), 기본적 인권 보장이 명문화되었다.',
    keywords: ['일본국헌법', '신헌법', '평화헌법', '맥아더초안', '주권재민', '상징천황제', '제9조'],
    countryRelations: [
      { historicalCountryName: '일본 제국', role: EventCountryRole.PARTICIPANT, roleDescription: '신헌법 공포 주체.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: 'GHQ 민정국이 초안 작성.' },
    ],
    sections: [
      {
        order: 1, title: '핵심 내용', sectionType: 'aftermath',
        content: `<p>일본국 헌법은 다음 세 가지를 기본 원칙으로 한다.</p>
<ol>
  <li><strong>주권재민(国民主権)</strong>: 메이지 헌법의 천황 주권에서 국민 주권으로 전환.</li>
  <li><strong>기본적 인권의 존중(基本的人権の尊重)</strong>: 인권을 "영구히 침해할 수 없는 영원한 권리"로 보장.</li>
  <li><strong>평화주의(平和主義, 제9조)</strong>: 전쟁의 포기·전력의 비보유·교전권의 부인을 명문화.</li>
</ol>
<p>천황은 "국가와 국민통합의 상징"이 되어 정치적 권능을 잃고 의례적 행위만 수행한다(상징천황제, 1~7조).</p>`,
      },
    ],
  },
  {
    title: '일본국 헌법 시행',
    description:
      '1947년 5월 3일 일본국 헌법이 시행되며 일본의 정치체가 대일본제국에서 일본국으로 공식 전환된 사건. 같은 해 4월 총선에서 선출된 제1회 참의원·제23회 중의원 의원들이 신헌법 하 첫 국회를 구성했고, 5월 24일 가타야마 내각이 발족하여 신헌법 하 최초의 내각이 되었다.',
    startDate: '1947-05-03',
    startDatePrecision: 'day',
    endDate: '1947-05-03',
    endDatePrecision: 'day',
    location: '도쿄 황거 / 일본 전역',
    category: '정치',
    historicalCountryName: '일본국',
    background:
      '1946년 11월 3일 공포된 일본국 헌법은 부칙에 따라 6개월 후 시행되도록 정해져 있었다. 1947년 4월에는 신헌법 하의 새 의회를 구성하기 위한 제23회 중의원 총선과 제1회 참의원 통상선거가 동시 실시되어 사회당이 제1당이 되었다.',
    aftermath:
      '신헌법 시행에 따라 ① 11개 황족 가문이 황적이탈(臣籍降下), ② 귀족원이 폐지되고 참의원이 설치되었으며, ③ 추밀원·내대신부·궁내성 등 구 헌법 기관이 폐지되었다. 5월 20일 신헌법 하 첫 국회 개회, 5월 23일 가타야마 데쓰가 국회 지명을 통해 총리로 선출되어 5월 24일 내각을 발족시켰다.',
    keywords: ['일본국헌법', '시행', '5월3일', '헌법기념일', '상징천황제', '가타야마내각', '참의원'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '신헌법 시행으로 공식 출범.' },
      { historicalCountryName: '일본 제국', role: EventCountryRole.OTHER, roleDescription: '구 정치체로 이행 종료.' },
    ],
  },
]

// ── 헌법 전후 transition ────────────────────────────────────────────────────
const TRANSITION = {
  predecessor: '일본 제국',
  successor: '일본국',
  eventType: TransitionEventType.SUCCESSION,
  transitionScope: TransitionScope.STATE_SUCCESSION,
}

// ── 시딩 함수 ────────────────────────────────────────────────────────────────
export async function seedJapanPostwar(prisma: PrismaService): Promise<void> {
  console.log('\n🇯🇵 일본 전후(1945~1948) 시딩 시작...')

  // ── 0. admin 계정 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 없음 — 시딩 중단 (admin.seed 먼저 실행)')
    return
  }

  // ── 1. 일본국 historicalCountry ──────────────────────────────────────
  console.log('\n  🏯 일본국(전후) 역사 국가 생성...')
  let postwarHcId: string
  const existingPostwarHc = await prisma.historicalCountry.findFirst({ where: { name: POSTWAR_JAPAN.name } })
  if (existingPostwarHc) {
    postwarHcId = existingPostwarHc.id
    console.log(`    ⏭️  ${POSTWAR_JAPAN.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: POSTWAR_JAPAN.name,
        enName: POSTWAR_JAPAN.enName,
        description: POSTWAR_JAPAN.description,
        startEra: POSTWAR_JAPAN.startEra,
        startYear: POSTWAR_JAPAN.startYear,
        startMonth: POSTWAR_JAPAN.startMonth,
        startDay: POSTWAR_JAPAN.startDay,
        stateType: POSTWAR_JAPAN.stateType,
        entityKind: POSTWAR_JAPAN.entityKind,
        latitude: POSTWAR_JAPAN.latitude,
        longitude: POSTWAR_JAPAN.longitude,
        accountId: ACCOUNT_ID,
      },
    })
    postwarHcId = created.id
    console.log(`    ✅ ${POSTWAR_JAPAN.name}`)
  }

  // 현대 일본(JP) 연결
  const modernJapan = await prisma.country.findFirst({ where: { isoCode: 'JP' }, select: { id: true } })
  if (modernJapan) {
    const linkExists = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId: postwarHcId, modernCountryId: modernJapan.id },
    })
    if (!linkExists) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: postwarHcId, modernCountryId: modernJapan.id },
      })
      console.log(`    🔗 현대 일본(JP) 연결: 일본국`)
    }
  }

  // ── 2. 일본 제국 → 일본국 transition ────────────────────────────────
  const empireHc = await prisma.historicalCountry.findFirst({ where: { name: TRANSITION.predecessor } })
  if (empireHc) {
    const exists = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId: empireHc.id, successorId: postwarHcId },
    })
    if (!exists) {
      await prisma.historicalCountryTransition.create({
        data: {
          predecessorId: empireHc.id,
          successorId: postwarHcId,
          eventType: TRANSITION.eventType,
          transitionScope: TRANSITION.transitionScope,
        },
      })
      console.log(`    📜 계승 관계: ${TRANSITION.predecessor} → ${TRANSITION.successor}`)
    } else {
      console.log(`    ♻️  계승 관계 이미 존재: ${TRANSITION.predecessor} → ${TRANSITION.successor}`)
    }
  } else {
    console.warn(`    ⚠️  ${TRANSITION.predecessor} 미존재 — transition 스킵`)
  }

  // ── 3. 정당 (일본 제국 hc 소속) ─────────────────────────────────────
  console.log('\n  🏛️  정당 등록...')
  if (!empireHc) {
    console.warn('    ⚠️  일본 제국 hc 미존재 — 정당 시딩 스킵')
  } else {
    for (const p of PARTIES) {
      const existing = await prisma.politicalParty.findFirst({
        where: { historicalCountryId: empireHc.id, name: p.name },
      })
      if (existing) {
        console.log(`    ⏭️  ${p.name}`)
        continue
      }
      await prisma.politicalParty.create({
        data: {
          historicalCountryId: empireHc.id,
          name: p.name,
          shortName: p.shortName,
          localName: p.localName,
          ideology: p.ideology,
          position: p.position,
          foundedDate: p.foundedDate,
          dissolvedDate: p.dissolvedDate ?? null,
          description: p.description,
          brandColor: p.brandColor ?? null,
        },
      })
      console.log(`    ✅ ${p.name} (${p.localName})`)
    }
  }

  // ── 4. 인물 ─────────────────────────────────────────────────────────
  console.log('\n  👤 전후 총리 등록...')
  for (const m of PERSONS) {
    const existing = await prisma.person.findFirst({ where: { originalName: m.originalName } })
    let personId: string

    const birthDate = new Date(m.birthYear, m.birthMonth - 1, m.birthDay)
    const deathDate = m.deathYear ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1) : undefined
    const linkedDynastyId = m.dynastyName ? await getDynastyId(prisma, m.dynastyName) : null
    const linkedCountryId = m.countryName ? await getHistoricalCountryId(prisma, m.countryName) : null

    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${m.originalName}`)
    } else {
      const created = await prisma.person.create({
        data: {
          name: m.name,
          surname: m.surname,
          originalName: m.originalName,
          biography: m.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: m.gender,
          nameDisplayOrder: 'korean', // 일본 = 성-이름 순
          dynastyId: linkedDynastyId ?? undefined,
          influence: m.influence,
          birthPlaceText: m.birthPlaceText,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${m.originalName}${m.influence != null ? ` (영향력 ${m.influence})` : ''}`)
    }

    // 능력치
    if (m.stats) {
      const existingStats = await prisma.personStats.findFirst({
        where: { personId, accountId: ACCOUNT_ID },
      })
      if (!existingStats) {
        await prisma.personStats.create({
          data: {
            personId,
            accountId: ACCOUNT_ID,
            politics: m.stats.politics,
            military: m.stats.military,
            diplomacy: m.stats.diplomacy,
            intellect: m.stats.intellect,
            charisma: m.stats.charisma,
            administration: m.stats.administration,
            notes: m.stats.notes,
          },
        })
        const s = m.stats
        console.log(`        ✅ 능력치: 정${s.politics}/군${s.military}/외${s.diplomacy}/학${s.intellect}/카${s.charisma}/행${s.administration}`)
      } else {
        console.log(`        ⏭️  능력치`)
      }
    }

    // 소속 국가 affiliation
    if (linkedCountryId) {
      const affExists = await prisma.personCountryAffiliation.findFirst({
        where: { personId, historicalCountryId: linkedCountryId, affiliationType: 'CITIZENSHIP' as any },
      })
      if (!affExists) {
        await prisma.personCountryAffiliation.create({
          data: { personId, historicalCountryId: linkedCountryId, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
        })
        console.log(`        ✅ 소속국가: ${m.countryName}`)
      }
    }

    // 임기 + 내각 + 내각-정당
    for (const t of m.tenures) {
      const tenureCountryId = await getHistoricalCountryId(prisma, t.countryName)
      if (!tenureCountryId) {
        console.warn(`        ⚠️  역사 국가 없음: ${t.countryName}`)
        continue
      }
      const positionDefId = await getPositionDefId(prisma, t.positionTitle)
      const startDate = new Date(t.startYear, t.startMonth - 1, t.startDay ?? 1)
      const endDate = t.endYear ? new Date(t.endYear, (t.endMonth ?? 1) - 1, t.endDay ?? 1) : undefined

      const existingTenure = await prisma.governmentPositionTenure.findFirst({
        where: {
          personId,
          historicalCountryId: tenureCountryId,
          positionType: t.positionType,
          termNumber: t.termNumber,
        },
      })
      let tenureId: string
      if (existingTenure) {
        tenureId = existingTenure.id
        console.log(`        ⏭️  재임: ${t.positionTitle} ${t.termNumber}대`)
      } else {
        const createdTenure = await prisma.governmentPositionTenure.create({
          data: {
            personId,
            historicalCountryId: tenureCountryId,
            positionDefinitionId: positionDefId,
            positionType: t.positionType,
            title: t.positionTitle,
            termNumber: t.termNumber,
            startDate,
            endDate,
            appointmentMethod: t.appointmentMethod,
            endReason: t.endReason,
            notes: t.notes,
            accountId: ACCOUNT_ID,
          },
        })
        tenureId = createdTenure.id
        console.log(`        ✅ 재임: ${t.positionTitle} ${t.termNumber}대 (${t.startYear}-${t.endYear ?? '현재'})`)
      }

      // Cabinet
      let cabinetId: string
      const existingCabinet = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
      if (existingCabinet) {
        cabinetId = existingCabinet.id
        console.log(`        ⏭️  내각: ${existingCabinet.name ?? t.cabinetName}`)
      } else {
        const createdCabinet = await prisma.cabinet.create({
          data: { headTenureId: tenureId, name: t.cabinetName, accountId: ACCOUNT_ID },
        })
        cabinetId = createdCabinet.id
        console.log(`        🏛️  내각: ${t.cabinetName}`)
      }

      // CabinetPoliticalParty
      for (const cp of t.cabinetParties ?? []) {
        const partyRow = await prisma.politicalParty.findFirst({
          where: { historicalCountryId: empireHc?.id, name: cp.partyName },
        })
        if (!partyRow) {
          console.warn(`          ⚠️  정당 미존재: ${cp.partyName}`)
          continue
        }
        const cpExists = await prisma.cabinetPoliticalParty.findFirst({
          where: { cabinetId, partyId: partyRow.id },
        })
        if (cpExists) {
          console.log(`          ⏭️  내각정당: ${cp.partyName} (${cp.role})`)
          continue
        }
        await prisma.cabinetPoliticalParty.create({
          data: {
            cabinetId,
            partyId: partyRow.id,
            role: cp.role,
            provenance: CabinetPartyProvenance.MANUAL,
            notes: cp.notes,
          },
        })
        console.log(`          ✅ 내각정당: ${cp.partyName} (${cp.role})`)
      }
    }

    // 정당 멤버십
    for (const pm of m.partyMemberships ?? []) {
      const partyRow = await prisma.politicalParty.findFirst({
        where: { historicalCountryId: empireHc?.id, name: pm.partyName },
      })
      if (!partyRow) {
        console.warn(`        ⚠️  정당 미존재: ${pm.partyName}`)
        continue
      }
      const startDate = new Date(pm.startYear, (pm.startMonth ?? 1) - 1, pm.startDay ?? 1)
      const endDate = pm.endYear ? new Date(pm.endYear, (pm.endMonth ?? 1) - 1, pm.endDay ?? 1) : undefined
      const exists = await prisma.politicalPartyMembership.findFirst({
        where: { personId, partyId: partyRow.id, startDate },
      })
      if (exists) {
        console.log(`        ⏭️  정당소속: ${pm.partyName}`)
        continue
      }
      await prisma.politicalPartyMembership.create({
        data: {
          personId,
          partyId: partyRow.id,
          startDate,
          endDate,
          roleCategory: pm.roleCategory,
          roleTitle: pm.roleTitle,
          notes: pm.notes,
        },
      })
      console.log(`        ✅ 정당소속: ${pm.partyName}${pm.roleTitle ? ` (${pm.roleTitle})` : ''}`)
    }
  }

  // ── 5. 사건 ─────────────────────────────────────────────────────────
  console.log('\n  📜 주요 사건 등록...')
  for (const ev of EVENTS) {
    const category = await prisma.eventCategory.findFirst({ where: { name: ev.category }, select: { id: true } })
    if (!category) {
      console.warn(`    ⚠️  카테고리 미존재: ${ev.category}`)
      continue
    }
    const hcId = ev.historicalCountryName ? await getHistoricalCountryId(prisma, ev.historicalCountryName) : null
    const startDate = new Date(ev.startDate)
    const endDate = ev.endDate ? new Date(ev.endDate) : undefined

    let event = await prisma.event.findFirst({
      where: { title: ev.title, startDate, deletedAt: null },
    })
    if (event) {
      console.log(`    ⏭️  ${ev.title}`)
    } else {
      event = await prisma.event.create({
        data: {
          title: ev.title,
          description: ev.description,
          startDate,
          startDatePrecision: ev.startDatePrecision ?? 'day',
          endDate,
          endDatePrecision: ev.endDatePrecision ?? 'day',
          location: ev.location,
          categoryId: category.id,
          historicalCountryId: hcId,
          background: ev.background,
          aftermath: ev.aftermath,
          keywords: ev.keywords as any,
          createdById: admin.id,
        },
      })
      console.log(`    ✅ ${ev.title}`)
    }

    // 섹션
    for (const s of ev.sections ?? []) {
      const sExists = await prisma.eventSection.findFirst({ where: { eventId: event.id, title: s.title } })
      if (sExists) continue
      await prisma.eventSection.create({
        data: {
          eventId: event.id,
          title: s.title,
          content: s.content,
          order: s.order,
          sectionType: s.sectionType ?? null,
        },
      })
      console.log(`        ✅ 섹션: ${s.title}`)
    }

    // 국가 관계
    for (const rel of ev.countryRelations ?? []) {
      let countryId: string | null = null
      let historicalCountryId: string | null = null
      if (rel.historicalCountryName) {
        const hc = await prisma.historicalCountry.findFirst({ where: { name: rel.historicalCountryName }, select: { id: true } })
        if (!hc) { console.warn(`        ⚠️  hc 미존재: ${rel.historicalCountryName}`); continue }
        historicalCountryId = hc.id
      } else if (rel.countryName) {
        const c = await prisma.country.findFirst({ where: { name: rel.countryName }, select: { id: true } })
        if (!c) { console.warn(`        ⚠️  현대 국가 미존재: ${rel.countryName}`); continue }
        countryId = c.id
      }
      const exists = await prisma.eventCountryRelation.findFirst({
        where: {
          eventId: event.id,
          countryId: countryId ?? undefined,
          historicalCountryId: historicalCountryId ?? undefined,
          role: rel.role,
        },
      })
      if (exists) continue
      await prisma.eventCountryRelation.create({
        data: {
          eventId: event.id,
          countryId,
          historicalCountryId,
          role: rel.role,
          roleDescription: rel.roleDescription ?? null,
        },
      })
      console.log(`        ✅ 국가관계: ${rel.historicalCountryName ?? rel.countryName} (${rel.role})`)
    }
  }

  console.log(`\n✅ 일본 전후 시딩 완료 (총리 ${PERSONS.length}명, 정당 ${PARTIES.length}건, 사건 ${EVENTS.length}건)\n`)
}
