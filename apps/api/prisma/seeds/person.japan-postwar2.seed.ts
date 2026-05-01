/**
 * 전후 일본(1948~1955) 시드 — 47~51대 총리 + 자유민주당 결성(55년 체제)
 *
 * 등록 항목:
 *  - PoliticalParty x7: 민주당, 국민협동당, 민주자유당, 자유당, 개진당, 일본민주당, 자유민주당
 *  - PoliticalPartyTransition x7: 보수합동에 이르는 정당 계보(MERGER/CONTINUITY)
 *  - Person x1 신규: 아시다 히토시(47대)
 *  - GovernmentPositionTenure x5: 47대(아시다), 48~51대(요시다 2~5차)
 *  - Cabinet x5 + CabinetPoliticalParty
 *  - PoliticalPartyMembership x5 (아시다 民主党 총재, 요시다 民主自由党·自由党 총재 등)
 *  - Event x5: 쇼와전공사건 / 샌프란시스코강화조약 / 일본 주권회복 / 자위대 발족 / 자유민주당 결성(55년 체제)
 *
 * 의존성: seedJapanMeijiEra + seedJapanPostwar (요시다·일본자유당·일본 제국·일본국·황실 등) 가 먼저 실행되어야 함.
 */
import {
  AppointmentMethod,
  CabinetPartyProvenance,
  CabinetPartyRole,
  EventCountryRole,
  GovernmentPositionType,
  PartyMembershipRoleCategory,
  PoliticalPartyTransitionKind,
  PoliticalPosition,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
async function getHistoricalCountryId(prisma: PrismaService, name: string): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}
async function getPositionDefId(prisma: PrismaService, title: string): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}
/** 일본 제국·일본국 양쪽에서 정당을 찾는다 (전후 정당 일부는 1947 헌법 시행 직전 결당) */
async function findJapanParty(prisma: PrismaService, name: string): Promise<{ id: string } | null> {
  const empire = await prisma.historicalCountry.findFirst({ where: { name: '일본 제국' }, select: { id: true } })
  const postwar = await prisma.historicalCountry.findFirst({ where: { name: '일본국' }, select: { id: true } })
  return prisma.politicalParty.findFirst({
    where: {
      name,
      OR: [
        empire ? { historicalCountryId: empire.id } : { historicalCountryId: '__none__' },
        postwar ? { historicalCountryId: postwar.id } : { historicalCountryId: '__none__' },
      ],
    },
    select: { id: true },
  })
}

// ── 정당 (모두 일본국 hc 소속) ──────────────────────────────────────────────
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
    name: '민주당',
    shortName: '민주',
    localName: '民主党 (1947)',
    ideology: '온건 보수주의, 자유주의, 의회주의',
    position: PoliticalPosition.CENTER,
    foundedDate: new Date('1947-03-31'),
    dissolvedDate: new Date('1950-04-28'),
    description:
      '일본진보당과 협동민주당이 합당해 결성한 중도 보수 정당. 1947년 4월 총선에서 사회당에 이어 제2당이 되어 가타야마(46대)·아시다(47대) 연립 내각의 중심이 되었다. 1948년 쇼와 전공 사건으로 큰 타격을 입었고 1950년 일부는 민주자유당과 합당, 일부는 야당화되어 분열로 해체되었다.',
    brandColor: '#1976D2',
  },
  {
    name: '국민협동당',
    shortName: '협동',
    localName: '国民協同党',
    ideology: '협동조합주의, 중도주의',
    position: PoliticalPosition.CENTER,
    foundedDate: new Date('1947-03-08'),
    dissolvedDate: new Date('1950-04-28'),
    description:
      '협동주의(協同主義) 노선의 중도 정당. 결당 직후 가타야마·아시다 연립 내각에 참가, 미키 다케오를 중심으로 활동했다. 1950년 국민민주당으로 합당되며 해체.',
    brandColor: '#26A69A',
  },
  {
    name: '민주자유당',
    shortName: '민자당',
    localName: '民主自由党',
    ideology: '보수주의, 반공주의, 자유주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1948-03-15'),
    dissolvedDate: new Date('1950-03-01'),
    description:
      '일본자유당 본류와 민주당 탈당파(시데하라계)가 합당해 결성한 보수 정당. 요시다 시게루를 총재로, 1949년 1월 총선에서 264석을 얻어 단독 과반을 달성했다. 1950년 민주당 연립파를 흡수하면서 자유당으로 명칭 변경.',
    brandColor: '#D32F2F',
  },
  {
    name: '자유당 (요시다)',
    shortName: '자유당',
    localName: '自由党 (1950)',
    ideology: '보수주의, 반공주의, 자유주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1950-03-01'),
    dissolvedDate: new Date('1955-11-15'),
    description:
      '민주자유당이 민주당 연립파(이누카이파)를 흡수하면서 자유당(自由党)으로 개편. 1953년 분당 위기를 거쳐 요시다파가 잔류했다. 1955년 11월 15일 일본민주당과의 보수합동으로 자유민주당이 결성되며 해산.',
    brandColor: '#C62828',
  },
  {
    name: '개진당',
    shortName: '개진',
    localName: '改進党',
    ideology: '온건 보수주의, 헌법 개정주의',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1952-02-08'),
    dissolvedDate: new Date('1954-11-24'),
    description:
      '민주당 야당파, 국민민주당, 신정클럽 등이 합류해 결성된 보수 정당. 시게미쓰 마모루가 총재로 취임했다. 1954년 11월 24일 자유당 탈당파(하토야마파)와 합당해 일본민주당을 결성.',
    brandColor: '#7B1FA2',
  },
  {
    name: '일본민주당',
    shortName: '민주당(1954)',
    localName: '日本民主党',
    ideology: '보수주의, 헌법 개정주의, 자주외교',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1954-11-24'),
    dissolvedDate: new Date('1955-11-15'),
    description:
      '하토야마 이치로를 중심으로 자유당 탈당파와 개진당이 합당해 결성한 보수 정당. 결당 16일 만에 요시다 5차 내각을 무너뜨리고 하토야마 1차 내각(52대)을 출범시켰다. 1955년 11월 15일 자유당과의 보수합동으로 자유민주당 결성에 합류하며 해산.',
    brandColor: '#5D4037',
  },
  {
    name: '자유민주당',
    shortName: '자민당',
    localName: '自由民主党',
    ideology: '보수주의, 자유주의, 입헌군주제, 미일동맹',
    position: PoliticalPosition.CENTER_RIGHT,
    foundedDate: new Date('1955-11-15'),
    description:
      '1955년 11월 15일 자유당과 일본민주당의 보수합동(保守合同)으로 결성된 일본 최대 보수 정당. 같은 해 10월 통합된 일본사회당(좌우 재통합)과 함께 "55년 체제"를 형성, 이후 1993년까지 38년간 단독 정권을 유지했다. 현재까지 전후 일본 정치의 중심 정당이다.',
    brandColor: '#0F4C81',
  },
]

// ── 정당 transition ─────────────────────────────────────────────────────────
const PARTY_TRANSITIONS: {
  from: string
  to: string
  kind: PoliticalPartyTransitionKind
  effectiveDate: string
  notes?: string
}[] = [
  // 일본진보당 → 민주당 (1947.3.31 합당)
  { from: '일본진보당', to: '민주당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1947-03-31',
    notes: '일본진보당+협동민주당 합당으로 민주당 결성.' },
  // 일본자유당 → 민주자유당 (1948.3.15)
  { from: '일본자유당', to: '민주자유당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1948-03-15',
    notes: '일본자유당 본류 + 민주당 탈당파(시데하라계) → 민주자유당.' },
  { from: '민주당', to: '민주자유당', kind: PoliticalPartyTransitionKind.SPLIT_FROM, effectiveDate: '1948-03-15',
    notes: '시데하라계 등 민주당 탈당파가 민주자유당 결성에 참여.' },
  // 민주자유당 → 자유당 (1950.3.1 개편/합당)
  { from: '민주자유당', to: '자유당 (요시다)', kind: PoliticalPartyTransitionKind.CONTINUITY, effectiveDate: '1950-03-01',
    notes: '민주자유당이 민주당 연립파(이누카이파)를 흡수하며 자유당으로 개편.' },
  // 민주당 → 개진당 (1952.2.8)
  { from: '민주당', to: '개진당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1952-02-08',
    notes: '민주당 야당파 + 국민민주당 + 신정클럽 → 개진당.' },
  // 개진당 → 일본민주당 (1954.11.24)
  { from: '개진당', to: '일본민주당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1954-11-24',
    notes: '개진당 + 자유당 탈당파(하토야마계) → 일본민주당.' },
  // 자유당 → 자유민주당 (1955.11.15 보수합동)
  { from: '자유당 (요시다)', to: '자유민주당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1955-11-15',
    notes: '보수합동(保守合同). 자유민주당 결성.' },
  { from: '일본민주당', to: '자유민주당', kind: PoliticalPartyTransitionKind.MERGER_INTO, effectiveDate: '1955-11-15',
    notes: '보수합동. 자유민주당 결성.' },
]

// ── 인물 (신규: 아시다, 기존: 요시다 — tenure만 추가) ────────────────────────
interface PersonStatsInput {
  politics: number; military: number; diplomacy: number; intellect: number; charisma: number; administration: number
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
  cabinetParties?: { partyName: string; role: CabinetPartyRole; notes?: string }[]
}

interface PersonEntry {
  /** 신규 인물이면 birthYear 등 채우고, 기존 인물이면 originalName으로만 식별 */
  isNew: boolean
  name: string
  surname?: string
  originalName: string
  biography?: string
  birthYear?: number; birthMonth?: number; birthDay?: number
  deathYear?: number; deathMonth?: number; deathDay?: number
  gender?: string
  countryName?: string
  birthPlaceText?: string
  influence?: number
  stats?: PersonStatsInput
  tenures: TenureEntry[]
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
  // ── 47대: 아시다 히토시 (신규) ──────────────────────────────────────────
  {
    isNew: true,
    name: '히토시',
    surname: '아시다',
    originalName: 'Ashida Hitoshi',
    biography:
      '일본 제47대 내각총리대신(1948.3.10~10.15). 외무관료·중의원 의원 출신의 자유주의자. 일본진보당 → 민주당 총재로서 가타야마 내각의 외무대신을 지냈고, 가타야마 사퇴 후 사회당·민주당·국민협동당 3당 연립 내각을 이어받아 총리에 취임했다. 1948년 6월 발각된 쇼와 전공(昭和電工) 의옥 사건의 정점에서 본인까지 조사선상에 오르자 10월 7일 총사직, 12월 7일 체포되었다(훗날 무죄). 헌법 9조 "아시다 수정"(芦田修正)을 통해 자위권 여지를 남긴 것으로도 유명하다.',
    birthYear: 1887, birthMonth: 11, birthDay: 15,
    deathYear: 1959, deathMonth: 6, deathDay: 20,
    gender: 'MALE',
    countryName: '일본국',
    birthPlaceText: '교토부 후나이군 야부우치무라(藪内村) — 현재 교토부 후쿠치야마시',
    influence: 60,
    stats: {
      politics: 75, military: 35, diplomacy: 80, intellect: 82, charisma: 60, administration: 65,
      notes: '"아시다 수정"의 입헌 감각·외교 강점. 쇼와전공 의옥으로 정치력 손실.',
    },
    tenures: [
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 47,
        startYear: 1948, startMonth: 3, startDay: 10,
        endYear: 1948, endMonth: 10, endDay: 15,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes: '사회·민주·국민협동 3당 연립 유지. 쇼와 전공 의옥 확산으로 7개월 만에 총사직.',
        cabinetName: '아시다 내각',
        cabinetParties: [
          { partyName: '민주당', role: CabinetPartyRole.LEADING, notes: '아시다 본인 정당.' },
          { partyName: '일본사회당', role: CabinetPartyRole.COALITION_PARTNER, notes: '연립 파트너(우파 중심).' },
          { partyName: '국민협동당', role: CabinetPartyRole.COALITION_PARTNER, notes: '연립 파트너.' },
        ],
      },
    ],
    partyMemberships: [
      {
        partyName: '민주당',
        startYear: 1947, startMonth: 3, startDay: 31,
        endYear: 1950, endMonth: 4, endDay: 28,
        roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
        roleTitle: '총재',
        notes: '결당 직후부터 1948-10 사퇴까지 총재. 사퇴 후에도 당원으로 잔류.',
      },
    ],
  },

  // ── 48~51대: 요시다 시게루 (기존) — tenure만 추가 ────────────────────────
  {
    isNew: false,
    name: '시게루',
    surname: '요시다',
    originalName: 'Yoshida Shigeru',
    tenures: [
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 48,
        startYear: 1948, startMonth: 10, startDay: 15,
        endYear: 1949, endMonth: 2, endDay: 16,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '아시다 사퇴 후 소수 여당 내각으로 출범. 의회 해산 → 1949년 1월 23일 총선 실시(민주자유당 264석 압승)로 종료, 3차 내각으로 이행.',
        cabinetName: '제2차 요시다 내각',
        cabinetParties: [
          { partyName: '민주자유당', role: CabinetPartyRole.LEADING, notes: '단독 소수 여당.' },
        ],
      },
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 49,
        startYear: 1949, startMonth: 2, startDay: 16,
        endYear: 1952, endMonth: 10, endDay: 30,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '단독 과반 여당의 안정 내각. 닷지 라인(1949)·사프란시스코 강화조약·미일안보조약 체결(1951.9.8), 일본 주권회복(1952.4.28), 1950년 민주자유당이 자유당으로 개편.',
        cabinetName: '제3차 요시다 내각',
        cabinetParties: [
          { partyName: '민주자유당', role: CabinetPartyRole.LEADING, notes: '1949-02 ~ 1950-03 기간.' },
          { partyName: '자유당 (요시다)', role: CabinetPartyRole.LEADING, notes: '1950-03 ~ 1952-10 기간(개편 후).' },
        ],
      },
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 50,
        startYear: 1952, startMonth: 10, startDay: 30,
        endYear: 1953, endMonth: 5, endDay: 21,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '1952년 10월 1일 제25회 총선(전후 첫 총선거 후 임시 내각). "바카야로 해산"(1953.3.14)으로 의회 해산 → 4월 총선 → 5차 내각.',
        cabinetName: '제4차 요시다 내각',
        cabinetParties: [
          { partyName: '자유당 (요시다)', role: CabinetPartyRole.LEADING, notes: '단독 여당.' },
        ],
      },
      {
        countryName: '일본국',
        positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 51,
        startYear: 1953, startMonth: 5, startDay: 21,
        endYear: 1954, endMonth: 12, endDay: 10,
        appointmentMethod: AppointmentMethod.PARLIAMENTARY_ELECTION,
        endReason: TenureEndReason.RESIGNATION,
        notes:
          '소수 여당 내각. 자위대 발족(1954.7.1), MSA 협정 체결. 1954년 11월 자유당 탈당파(하토야마계)가 일본민주당을 결성하자 12월 6일 불신임 직전 총사직.',
        cabinetName: '제5차 요시다 내각',
        cabinetParties: [
          { partyName: '자유당 (요시다)', role: CabinetPartyRole.LEADING, notes: '단독 소수 여당. 1953-04 총선 후 분당 위기 속 출범.' },
        ],
      },
    ],
    partyMemberships: [
      {
        partyName: '민주자유당',
        startYear: 1948, startMonth: 3, startDay: 15,
        endYear: 1950, endMonth: 3, endDay: 1,
        roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
        roleTitle: '총재',
        notes: '결당 시 초대 총재 취임. 1949년 1월 총선 압승.',
      },
      {
        partyName: '자유당 (요시다)',
        startYear: 1950, startMonth: 3, startDay: 1,
        endYear: 1955, endMonth: 11, endDay: 15,
        roleCategory: PartyMembershipRoleCategory.LEADERSHIP,
        roleTitle: '총재',
        notes: '민주자유당 → 자유당 개편 시 그대로 총재 유임. 1954-12 총리 사임 후에도 총재 잔류, 보수합동 직전까지.',
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
    title: '쇼와 전공 의옥 사건',
    description:
      '1948년 6월 23일 발각된 일본 전후 최대급 정치 부패 사건. 화학회사 쇼와 전공(昭和電工)이 부흥금융금고로부터 거액의 융자를 받기 위해 정·관계 인사들에게 뇌물을 살포했다는 의혹이 GHQ의 조사로 드러나면서 아시다 내각이 붕괴, 64명이 기소되었다.',
    startDate: '1948-06-23',
    startDatePrecision: 'day',
    endDate: '1948-12-07',
    endDatePrecision: 'day',
    location: '도쿄 — 정·관·재계',
    category: '정치',
    historicalCountryName: '일본국',
    background:
      '쇼와 전공 사장 히노하라 세쓰조(日野原節三)가 부흥금융금고 융자를 받기 위해 정부·국회·관료·GHQ 등에 뇌물을 살포한 정황이 드러났다. GHQ G-2(정보참모부)와 민정국(GS) 사이의 갈등 속에서 사건이 정치 쟁점화되었다.',
    aftermath:
      '아시다 총리·니시오 스에히로 부총리(전 사회당 서기장)·구리스 다케오 경제안정본부 장관 등이 체포되었고, 64명이 기소되었으나 대부분 무죄·시효 등으로 사면. 사건의 정치적 충격으로 1948년 10월 7일 아시다 내각이 총사직, 사회당계 정권이 사실상 종료되었다.',
    keywords: ['쇼와전공', '소덴의옥', '아시다내각붕괴', '히노하라세쓰조', 'GHQ', '부흥금융금고'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '발생 국가.' },
      { countryName: '미국', role: EventCountryRole.OBSERVER, roleDescription: 'GHQ G-2/GS 조사 개입.' },
    ],
  },
  {
    title: '샌프란시스코 강화조약 체결',
    description:
      '1951년 9월 8일 미국 샌프란시스코 오페라하우스에서 일본과 48개 연합국 사이에 체결된 강화조약. 일본은 주권 회복과 점령 종료에 합의했고, 한국·만주·대만·사할린 등에 대한 모든 권리·청구권을 포기했다. 같은 날 도쿄에서 미·일 안전보장조약이 별도 체결되었다.',
    startDate: '1951-09-08',
    startDatePrecision: 'day',
    endDate: '1951-09-08',
    endDatePrecision: 'day',
    location: '미국 캘리포니아 샌프란시스코 오페라하우스',
    category: '회담/조약',
    historicalCountryName: '일본국',
    background:
      '한국전쟁 발발(1950-06-25) 이후 미국은 일본의 빠른 주권 회복과 서방 진영 편입을 추진했다. 존 포스터 덜레스 특사가 영국·호주 등과 조정해 "징벌적이지 않은 강화"를 설계했으며, 일본 측은 요시다 총리가 직접 조약에 서명했다. 소련·중국·인도 등은 조약에 반대·불참했고, 한국은 초청되지 않았다.',
    aftermath:
      '52개국이 회의에 참가했으나 소련·체코·폴란드는 서명을 거부했다. 1952년 4월 28일 비준서 교환과 함께 발효되어 일본은 6년 8개월의 GHQ 점령에서 벗어나 주권을 회복했다. 같은 날 미·일 안보조약도 발효되어 미군 주둔이 합법화되었다.',
    keywords: ['샌프란시스코강화조약', '대일강화', '주권회복', '요시다시게루', '존포스터덜레스', '미일안보조약'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '강화조약 당사국.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: '조약 주도국. 덜레스 특사가 설계.' },
      { countryName: '영국', role: EventCountryRole.PARTICIPANT, roleDescription: '공동 주최국.' },
      { historicalCountryName: '소비에트 사회주의 공화국 연방', role: EventCountryRole.OBSERVER, roleDescription: '회의 참가했으나 서명 거부.' },
    ],
    sections: [
      {
        order: 1, title: '주요 조항', sectionType: 'aftermath',
        content: `<p>전체 7장 27조로 구성. 핵심 조항은 다음과 같다.</p>
<ul>
  <li><strong>제1조</strong>: 연합국과 일본의 전쟁상태 종결 + 일본의 완전한 주권 인정.</li>
  <li><strong>제2조</strong>: 일본은 한국 독립 인정, 만주·대만·펑후·사할린 남부·쿠릴 열도·태평양 위임통치령에 대한 모든 권리·권원·청구권 포기.</li>
  <li><strong>제3조</strong>: 오키나와·오가사와라 등 남방 제도를 미국의 신탁통치 하에 둠(1972년 본토 반환).</li>
  <li><strong>제14조</strong>: 일본의 배상 의무는 "역무 배상"(役務賠償) 형태로 한정 — 사실상 면책에 가까운 가벼운 부담.</li>
</ul>`,
      },
    ],
  },
  {
    title: '일본 주권 회복 (강화조약 발효)',
    description:
      '1952년 4월 28일 샌프란시스코 강화조약이 발효되며 일본이 6년 8개월의 GHQ 점령에서 벗어나 국제법상 주권을 완전히 회복한 사건. 같은 날 미·일 안전보장조약도 발효되어 미군의 일본 주둔이 합법화되었다.',
    startDate: '1952-04-28',
    startDatePrecision: 'day',
    endDate: '1952-04-28',
    endDatePrecision: 'day',
    location: '도쿄 / 일본 전역',
    category: '정치',
    historicalCountryName: '일본국',
    background:
      '1951년 9월 8일 체결된 강화조약이 일본·미국 등 주요국 비준 절차를 거쳐 1952년 4월 28일 비준서 교환과 함께 발효되었다.',
    aftermath:
      'GHQ 해체. 점령기 발효된 다수의 GHQ 지령이 효력을 잃었고, 일본 정부는 외교권·국방권을 회복했다. 같은 시기 한일·일·중 등 주변국과의 국교 정상화 교섭이 시작되었다(한일회담은 동일자 4월 28일 개시).',
    keywords: ['주권회복', '강화조약발효', 'GHQ해체', '미일안보조약', '4월28일'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '주권 회복 당사국.' },
      { countryName: '미국', role: EventCountryRole.PARTICIPANT, roleDescription: '점령 종료·미일안보 발효.' },
    ],
  },
  {
    title: '자위대 발족',
    description:
      '1954년 7월 1일 방위청 설치법·자위대법 시행으로 육·해·공 자위대가 발족한 사건. 1950년 한국전쟁 발발 직후 GHQ 지령으로 창설된 경찰예비대(警察予備隊, 1950) → 보안대(保安隊, 1952) → 자위대(自衛隊, 1954)로 이어지는 재무장 과정의 종착점이었다. 헌법 제9조 해석을 둘러싼 논쟁의 시발점이 되었다.',
    startDate: '1954-07-01',
    startDatePrecision: 'day',
    endDate: '1954-07-01',
    endDatePrecision: 'day',
    location: '도쿄 방위청 — 현재 도쿄도 신주쿠구',
    category: '전쟁/군사',
    historicalCountryName: '일본국',
    background:
      '1950년 6월 한국전쟁 발발로 주일 미군이 한반도로 이동하자 GHQ는 일본의 자체 치안을 위해 7월 8일 경찰예비대 창설을 지령했다. 1952년 4월 주권 회복과 함께 보안대로 개편, 1954년 미·일 MSA 협정 체결로 미국의 군사원조를 받게 되면서 본격적인 군사조직으로 전환되었다.',
    aftermath:
      '평화헌법 제9조와의 관계가 정치 쟁점이 되었으며, 일본 정부는 "자위를 위한 필요 최소한도의 실력"으로 합헌 해석을 정립했다(자위권 해석). 자위대는 이후 해외 파병 논쟁(1991 걸프전·2003 이라크전 등)의 중심에 서 왔다.',
    keywords: ['자위대', '방위청', '경찰예비대', '보안대', 'MSA협정', '재무장', '헌법9조'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '자위대 창설 주체.' },
      { countryName: '미국', role: EventCountryRole.INITIATOR, roleDescription: 'GHQ 지령·MSA 협정으로 재무장 추동.' },
    ],
  },
  {
    title: '자유민주당 결성과 55년 체제 성립',
    description:
      '1955년 11월 15일 자유당과 일본민주당이 보수합동(保守合同)으로 자유민주당을 결성한 사건. 같은 해 10월 13일 좌우로 분열되어 있던 일본사회당이 통일대회로 다시 합쳐진 것에 대한 보수 측의 대응이었다. 이로써 자민당(여당)과 사회당(제1야당)이 의석을 나눠 갖는 "1.5당 체제" — 이른바 "55년 체제"가 성립, 1993년 호소카와 연립 내각까지 38년간 일본 정치의 기본 구조가 되었다.',
    startDate: '1955-11-15',
    startDatePrecision: 'day',
    endDate: '1955-11-15',
    endDatePrecision: 'day',
    location: '도쿄 중앙구로 츄오(中央) 공회당',
    category: '정치',
    historicalCountryName: '일본국',
    background:
      '1955년 2월 총선에서 자유당·일본민주당의 보수 양당이 합쳐도 사회당의 약진을 막기 어렵다는 위기감이 보수합동 추진의 직접 동기가 되었다. 같은 해 10월 13일 좌·우로 분열되어 있던 사회당이 다시 통일되며 단일 야당으로 부상하자, 재계(경단련 등)와 미국의 압력이 가세해 11월 15일 보수합동이 성사되었다.',
    aftermath:
      '자민당은 1955년 단독 과반 의석으로 출발해 1993년 호소카와 모리히로 비자민 연립 내각이 성립할 때까지 38년간 단독 정권을 유지했다. 사회당은 같은 기간 만년 야당에 머물러 의석의 약 1/3 수준을 유지, "1.5당 체제"라는 말이 생겨났다. 55년 체제는 일본 전후 정치의 안정과 동시에 정권 교체 부재라는 한계를 동시에 낳은 구조였다.',
    keywords: ['자유민주당', '자민당', '55년체제', '보수합동', '하토야마이치로', '오노반보쿠', '미키부키치', '일본사회당', '1.5당체제'],
    countryRelations: [
      { historicalCountryName: '일본국', role: EventCountryRole.PARTICIPANT, roleDescription: '정당 재편 발생국.' },
    ],
    sections: [
      {
        order: 1, title: '보수합동에 이르는 과정', sectionType: 'process',
        content: `<p>1954년 11월부터 1955년 11월까지 약 1년간 진행된 보수 양당 통합 협상의 주요 일정.</p>
<ol>
  <li>1954-11-24: 일본민주당 결성(하토야마 이치로 총재) — 자유당 탈당파+개진당.</li>
  <li>1954-12-10: 요시다 5차 내각 총사직 → 12-10 하토야마 1차 내각 출범.</li>
  <li>1955-02-27: 제27회 총선거 — 일본민주당 185석, 자유당 112석, 사회당 좌우 합계 156석. 보수 위기감 증폭.</li>
  <li>1955-10-13: 좌·우 사회당 통일대회(통일사회당). 단일 야당화.</li>
  <li>1955-11-15: 자유당+일본민주당 보수합동 → 자유민주당 결성. 초대 총재대행위원회(하토야마·오가타·미키·오노) 설치.</li>
</ol>`,
      },
      {
        order: 2, title: '"55년 체제"의 의미', sectionType: 'aftermath',
        content: `<p>55년 체제는 다음의 특징을 가지는 일본 전후 정당 구조이다.</p>
<ul>
  <li><strong>자민당 단독 정권</strong>: 1955-11-15 ~ 1993-08-09 (38년간) 단독 과반 유지.</li>
  <li><strong>1.5당 체제</strong>: 사회당이 만년 야당으로 약 1/3 의석 유지, 정권 교체 부재.</li>
  <li><strong>이념적 대립축</strong>: 헌법 9조·미일안보 vs 자주외교·평화 노선.</li>
  <li><strong>당내 파벌(派閥) 정치</strong>: 자민당 내 5~7개 파벌이 사실상 정당 역할 수행, 총재 선출이 곧 총리 선출.</li>
</ul>
<p>1993년 비자민 호소카와 연립 내각 성립으로 55년 체제는 형식적으로 종결되었으나, 자민당의 정치 지배력은 21세기에도 이어져 왔다.</p>`,
      },
    ],
  },
]

// ── 시딩 함수 ────────────────────────────────────────────────────────────────
export async function seedJapanPostwar2(prisma: PrismaService): Promise<void> {
  console.log('\n🇯🇵 일본 전후 2단계(1948~1955) 시딩 시작...')

  // ── 0. admin 계정 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 없음 — 시딩 중단 (admin.seed 먼저 실행)')
    return
  }

  // ── 0-1. 일본국 hc 확인 ─────────────────────────────────────────────
  const postwarHc = await prisma.historicalCountry.findFirst({ where: { name: '일본국' }, select: { id: true } })
  if (!postwarHc) {
    console.warn('  ⚠️  일본국 hc 없음 — seedJapanPostwar 먼저 실행 필요')
    return
  }

  // ── 1. 정당 ─────────────────────────────────────────────────────────
  console.log('\n  🏛️  정당 등록...')
  for (const p of PARTIES) {
    const existing = await prisma.politicalParty.findFirst({
      where: { historicalCountryId: postwarHc.id, name: p.name },
    })
    if (existing) {
      console.log(`    ⏭️  ${p.name}`)
      continue
    }
    await prisma.politicalParty.create({
      data: {
        historicalCountryId: postwarHc.id,
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

  // ── 2. 정당 transition ──────────────────────────────────────────────
  console.log('\n  🔁 정당 계보(transition) 등록...')
  for (const t of PARTY_TRANSITIONS) {
    const fromParty = await findJapanParty(prisma, t.from)
    const toParty = await findJapanParty(prisma, t.to)
    if (!fromParty || !toParty) {
      console.warn(`    ⚠️  정당 미존재: ${t.from} → ${t.to}`)
      continue
    }
    const exists = await prisma.politicalPartyTransition.findFirst({
      where: { fromPartyId: fromParty.id, toPartyId: toParty.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${t.from} → ${t.to} (${t.kind})`)
      continue
    }
    await prisma.politicalPartyTransition.create({
      data: {
        fromPartyId: fromParty.id,
        toPartyId: toParty.id,
        kind: t.kind,
        effectiveDate: new Date(t.effectiveDate),
        notes: t.notes,
      },
    })
    console.log(`    ✅ ${t.from} → ${t.to} (${t.kind})`)
  }

  // ── 3. 인물 + 임기 + 내각 + 정당 ─────────────────────────────────────
  console.log('\n  👤 인물·임기·내각 등록...')
  for (const m of PERSONS) {
    let personId: string
    const existing = await prisma.person.findFirst({ where: { originalName: m.originalName } })

    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${m.originalName} (기존)`)
    } else if (m.isNew) {
      const birthDate = new Date(m.birthYear!, m.birthMonth! - 1, m.birthDay!)
      const deathDate = m.deathYear ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1) : undefined
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
          nameDisplayOrder: 'korean',
          influence: m.influence,
          birthPlaceText: m.birthPlaceText,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${m.originalName} (신규)`)

      // 능력치
      if (m.stats) {
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
      }

      // 소속 국가 affiliation
      if (m.countryName) {
        const linkedCountryId = await getHistoricalCountryId(prisma, m.countryName)
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
      }
    } else {
      console.warn(`    ⚠️  기존 인물 ${m.originalName} 미존재 — seedJapanPostwar 누락 — 시딩 스킵`)
      continue
    }

    // 임기 + 내각 + 내각-정당
    for (const t of m.tenures) {
      const tenureCountryId = await getHistoricalCountryId(prisma, t.countryName)
      if (!tenureCountryId) {
        console.warn(`        ⚠️  hc 없음: ${t.countryName}`)
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
        const partyRow = await findJapanParty(prisma, cp.partyName)
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
      const partyRow = await findJapanParty(prisma, pm.partyName)
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

  // ── 4. 사건 ─────────────────────────────────────────────────────────
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

  console.log(`\n✅ 일본 전후 2단계 시딩 완료 (정당 ${PARTIES.length}건, 인물 변경 ${PERSONS.length}건, 사건 ${EVENTS.length}건)\n`)
}
