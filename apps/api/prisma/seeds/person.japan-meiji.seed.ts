import {
  AppointmentMethod,
  GovernmentPositionType,
  HistoricalEntityKind,
  HistoricalStateType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
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

// ── 역사 국가: 일본 제국 ──────────────────────────────────────────────────────
const HISTORICAL_COUNTRY = {
  name: '일본 제국',
  enName: 'Empire of Japan',
  description:
    '메이지 유신(1868) 이후 수립된 입헌군주국. 메이지·다이쇼·쇼와(전기)를 거치며 동아시아 최초의 근대 국민국가로 발전했고, 청일·러일전쟁 승리와 한국 병합을 거쳐 제국주의 열강으로 부상했다. 1947년 신헌법 시행과 함께 국호가 "일본국"으로 바뀌며 막을 내렸다.',
  startEra: 'AD' as const, startYear: 1868, startMonth: 1,
  endEra: 'AD' as const, endYear: 1947, endMonth: 5,
  stateType: HistoricalStateType.EMPIRE,
  entityKind: HistoricalEntityKind.STATE,
  latitude: 35.6895, longitude: 139.6917,
}

// ── 가문: 황실(천황가) ────────────────────────────────────────────────────────
const DYNASTY = {
  name: '황실',
  description:
    '일본 천황의 가문. 신화상 진무 천황을 시조로 삼는 세계 최장수 군주가로 알려져 있으며, 메이지 유신 이후에는 입헌군주제 하의 국가원수 가문이 되었다. 별도의 성씨를 사용하지 않는다.',
  startYear: 660, // 신화상 시조
  originPlace: '日本',
}

// ── 인물 인터페이스 ───────────────────────────────────────────────────────────
interface PersonStatsInput {
  politics: number
  military: number
  diplomacy: number
  intellect: number
  charisma: number
  administration: number
  notes?: string
}

interface PersonEntry {
  name: string
  surname?: string
  originalName: string
  regnalName?: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string
  dynastyName?: string
  countryName?: string
  /** 출생지 직접 입력 텍스트 (역사적 지명) — Person.birthPlaceText */
  birthPlaceText?: string
  /** 역사적 영향력 (0–100) — Person.influence */
  influence?: number
  /** 6축 능력치 (0–100) — PersonStats. ACCOUNT_ID 단위로 등록 */
  stats?: PersonStatsInput
  /** 천황 재위 (SovereignReign) */
  reigns?: {
    countryName: string
    positionTitle: string
    regnalNumber?: number
    startYear: number
    startMonth: number
    startDay?: number
    endYear?: number
    endMonth?: number
    endDay?: number
    appointmentMethod: AppointmentMethod
    endReason?: TenureEndReason
    notes?: string
  }[]
  /** 총리 재임 (GovernmentPositionTenure) — 한 인물이 여러 번 역임 가능 */
  tenures?: {
    countryName: string
    positionTitle: string
    positionType: GovernmentPositionType
    termNumber: number
    startYear: number
    startMonth: number
    startDay?: number
    endYear?: number
    endMonth?: number
    endDay?: number
    appointmentMethod: AppointmentMethod
    endReason?: TenureEndReason
    notes?: string
    /** 행정부(Cabinet) 이름 — 이 임기를 머리로 하는 내각 표시명 (예: "1차 이토 내각") */
    cabinetName?: string
  }[]
}

// ── 인물 목록 ─────────────────────────────────────────────────────────────────
const PERSONS: PersonEntry[] = [
  // ── 천황 (3명) ─────────────────────────────────────────────────────────────
  {
    name: '무쓰히토',
    originalName: 'Emperor Meiji (Mutsuhito)',
    regnalName: '메이지',
    biography:
      '일본 제122대 천황(1867-1912). 메이지 유신을 이끌어 막부 체제를 무너뜨리고 도쿄 천도(1869), 폐번치현(1871), 헌법 제정(1889) 등 근대화 개혁을 단행했다. 청일전쟁(1894-95)과 러일전쟁(1904-05)에서 승리하며 일본을 동아시아 최초의 근대 제국으로 끌어올렸다. 그의 치세 전체가 곧 "메이지 시대"라 불린다.',
    birthYear: 1852, birthMonth: 11, birthDay: 3,
    deathYear: 1912, deathMonth: 7, deathDay: 30,
    gender: 'MALE',
    dynastyName: '황실',
    countryName: '일본 제국',
    birthPlaceText: '교토 기온 나카야마 저(中山邸) — 현재 교토부 교토시',
    influence: 95,
    stats: {
      politics: 75, military: 60, diplomacy: 70, intellect: 70, charisma: 92, administration: 80,
      notes: '군림하나 친정은 제한적 — 원로(겐로) 보좌 하 상징·통합의 카리스마.',
    },
    reigns: [
      {
        countryName: '일본 제국',
        positionTitle: '천황',
        regnalNumber: 122,
        startYear: 1867, startMonth: 2, startDay: 3,
        endYear: 1912, endMonth: 7, endDay: 30,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '메이지 유신을 통해 천황 친정 체제 회복. 일본 제국 수립과 근대화의 상징.',
      },
    ],
  },
  {
    name: '요시히토',
    originalName: 'Emperor Taishō (Yoshihito)',
    regnalName: '다이쇼',
    biography:
      '일본 제123대 천황(1912-1926). 메이지 천황의 셋째 아들로 어려서부터 병약하여 재위 후반에는 황태자(훗날 쇼와 천황)가 섭정을 맡았다(1921~). 그의 치세는 정당정치가 발전한 "다이쇼 데모크라시" 시기로 불리며, 1차 세계대전 참전과 시베리아 출병, 관동대지진(1923) 등을 겪었다.',
    birthYear: 1879, birthMonth: 8, birthDay: 31,
    deathYear: 1926, deathMonth: 12, deathDay: 25,
    gender: 'MALE',
    dynastyName: '황실',
    countryName: '일본 제국',
    birthPlaceText: '도쿄 아카사카 황실어용지 아오야마 어소(青山御所) — 현재 도쿄도 미나토구',
    influence: 50,
    stats: {
      politics: 30, military: 25, diplomacy: 30, intellect: 50, charisma: 35, administration: 30,
      notes: '병약하여 재위 후반 황태자 섭정. 친정 능력은 제한적.',
    },
    reigns: [
      {
        countryName: '일본 제국',
        positionTitle: '천황',
        regnalNumber: 123,
        startYear: 1912, startMonth: 7, startDay: 30,
        endYear: 1926, endMonth: 12, endDay: 25,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '병약하여 재위 말기에는 황태자 섭정. 다이쇼 데모크라시의 상징.',
      },
    ],
  },
  {
    name: '히로히토',
    originalName: 'Emperor Shōwa (Hirohito)',
    regnalName: '쇼와',
    biography:
      '일본 제124대 천황(1926-1989). 다이쇼 천황의 장남. 1921년부터 부친의 섭정을 맡았고 1926년 즉위했다. 그의 치세 전반기에는 군부 통제 하에 만주사변(1931), 중일전쟁(1937), 태평양전쟁(1941-45)이 일어났으며, 1945년 8월 15일 옥음방송으로 항복을 선언했다. 전후 신헌법(1947) 하에서 "상징 천황"으로 위상이 전환되었으며 재위 62년은 일본 역사상 최장이다.',
    birthYear: 1901, birthMonth: 4, birthDay: 29,
    deathYear: 1989, deathMonth: 1, deathDay: 7,
    gender: 'MALE',
    dynastyName: '황실',
    countryName: '일본 제국',
    birthPlaceText: '도쿄 아오야마 어소(青山御所) — 현재 도쿄도 미나토구',
    influence: 92,
    stats: {
      politics: 70, military: 55, diplomacy: 65, intellect: 88, charisma: 75, administration: 65,
      notes: '해양생물학 연구로 알려진 학자형 군주. 군부 통제력은 제한, 종전 결단으로 일본 보존.',
    },
    reigns: [
      {
        countryName: '일본 제국',
        positionTitle: '천황',
        regnalNumber: 124,
        startYear: 1926, startMonth: 12, startDay: 25,
        endYear: 1989, endMonth: 1, endDay: 7,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '재위 기간 일본 제국이 멸망(1945)하고 신헌법 하 상징 천황으로 전환. 재위 62년 최장.',
      },
    ],
  },

  // ── 총리 (5인 — 1~10대 점유) ─────────────────────────────────────────────
  {
    name: '히로부미',
    surname: '이토',
    originalName: 'Itō Hirobumi',
    biography:
      '메이지 유신의 핵심 원로(겐로) 중 한 명. 조슈번 출신으로 영국 유학을 다녀와 헌법 제정과 내각제 도입을 주도했다. 1885년 초대 내각총리대신에 취임한 이래 1·5·7·10대 총리를 역임했고, 대일본제국헌법(1889) 기초의 중심 인물이었다. 한국 통감(1905-1909)으로 부임해 을사늑약·정미7조약을 강요했으며, 1909년 10월 26일 하얼빈역에서 안중근 의사에게 사살되었다.',
    birthYear: 1841, birthMonth: 10, birthDay: 16,
    deathYear: 1909, deathMonth: 10, deathDay: 26,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '조슈번 스오국 구마게군 쓰카리촌(束荷村) — 현재 야마구치현 히카리시',
    influence: 92,
    stats: {
      politics: 95, military: 60, diplomacy: 92, intellect: 88, charisma: 85, administration: 90,
      notes: '메이지 헌법·내각제·조선 통감 — 정치·외교·행정 전 영역의 만능형.',
    },
    tenures: [
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 1,
        startYear: 1885, startMonth: 12, startDay: 22,
        endYear: 1888, endMonth: 4, endDay: 30,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '일본 최초의 내각총리대신. 내각제 도입 직후 조각.',
        cabinetName: '1차 이토 내각',
      },
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 5,
        startYear: 1892, startMonth: 8, startDay: 8,
        endYear: 1896, endMonth: 8, endDay: 31,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '청일전쟁(1894-95)을 지휘. 시모노세키 조약 체결.',
        cabinetName: '2차 이토 내각',
      },
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 7,
        startYear: 1898, startMonth: 1, startDay: 12,
        endYear: 1898, endMonth: 6, endDay: 30,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '단기 내각. 지조 증징안 부결로 총사직.',
        cabinetName: '3차 이토 내각',
      },
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 10,
        startYear: 1900, startMonth: 10, startDay: 19,
        endYear: 1901, endMonth: 5, endDay: 10,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '입헌정우회 결성 후 첫 정당 내각. 귀족원 반대로 사퇴.',
        cabinetName: '4차 이토 내각',
      },
    ],
  },
  {
    name: '기요타카',
    surname: '구로다',
    originalName: 'Kuroda Kiyotaka',
    biography:
      '메이지 시대의 군인·정치가. 사쓰마번 출신으로 보신전쟁에서 활약했고, 홋카이도 개척사 장관(1874-1882)을 역임하며 북방 개발을 주도했다. 1888년 제2대 내각총리대신으로 취임하여 1889년 대일본제국헌법 반포를 맞이했다. 불평등 조약 개정 추진 중 외무대신 오쿠마 시게노부의 안에 대한 비판이 격화되자 사임했다.',
    birthYear: 1840, birthMonth: 11, birthDay: 9,
    deathYear: 1900, deathMonth: 8, deathDay: 23,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '사쓰마번 가고시마 성하촌 — 현재 가고시마현 가고시마시',
    influence: 65,
    stats: {
      politics: 70, military: 80, diplomacy: 60, intellect: 60, charisma: 65, administration: 78,
      notes: '군인+개척행정 — 홋카이도 개척사·강화도조약 강요 등 무력·행정 양면.',
    },
    tenures: [
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 2,
        startYear: 1888, startMonth: 4, startDay: 30,
        endYear: 1889, endMonth: 10, endDay: 25,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '재임 중 대일본제국헌법 반포(1889). 조약개정 좌절로 사임.',
        cabinetName: '구로다 내각',
      },
    ],
  },
  {
    name: '아리토모',
    surname: '야마가타',
    originalName: 'Yamagata Aritomo',
    biography:
      '메이지·다이쇼 시대의 군인·정치가. "일본 군국주의의 아버지"로 평가받는 조슈번 출신 원로(겐로). 징병제(1873)와 참모본부 제도를 도입해 근대 일본 육군의 기틀을 세웠다. 3·9대 내각총리대신을 역임했고, 9대 재임 중 청일전쟁 후 군비 확장과 의화단 사건 출병을 지휘했다.',
    birthYear: 1838, birthMonth: 6, birthDay: 14,
    deathYear: 1922, deathMonth: 2, deathDay: 1,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '조슈번 하기 성하촌 가와시마무라 — 현재 야마구치현 하기시',
    influence: 88,
    stats: {
      politics: 90, military: 95, diplomacy: 70, intellect: 70, charisma: 70, administration: 88,
      notes: '징병제·참모본부·군부대신 현역무관제 — 일본 군국주의의 제도적 설계자.',
    },
    tenures: [
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 3,
        startYear: 1889, startMonth: 12, startDay: 24,
        endYear: 1891, endMonth: 5, endDay: 6,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '제국의회(첫 의회) 개회. 교육칙어(1890) 발포.',
        cabinetName: '1차 야마가타 내각',
      },
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 9,
        startYear: 1898, startMonth: 11, startDay: 8,
        endYear: 1900, endMonth: 10, endDay: 19,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '의화단 사건 출병. 군부대신 현역무관제 도입(1900).',
        cabinetName: '2차 야마가타 내각',
      },
    ],
  },
  {
    name: '마사요시',
    surname: '마쓰카타',
    originalName: 'Matsukata Masayoshi',
    biography:
      '메이지 시대의 재정가·정치가. 사쓰마번 출신 원로(겐로)로, 대장경(재무장관) 시절 "마쓰카타 디플레이션"을 단행하여 인플레이션을 진정시키고 일본은행을 창설(1882)했다. 4·6대 내각총리대신을 역임하며 금본위제 도입(1897) 등 근대 재정·금융 제도의 기초를 닦았다.',
    birthYear: 1835, birthMonth: 2, birthDay: 25,
    deathYear: 1924, deathMonth: 7, deathDay: 2,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '사쓰마번 가고시마 성하촌 — 현재 가고시마현 가고시마시',
    influence: 78,
    stats: {
      politics: 78, military: 50, diplomacy: 65, intellect: 80, charisma: 60, administration: 95,
      notes: '일본은행 창설·금본위제 — 근대 재정·금융 제도의 아버지. 행정·재무 특화.',
    },
    tenures: [
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 4,
        startYear: 1891, startMonth: 5, startDay: 6,
        endYear: 1892, endMonth: 8, endDay: 8,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '오쓰사건(러시아 황태자 피습) 처리. 선거 간섭 사건 후 사임.',
        cabinetName: '1차 마쓰카타 내각',
      },
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 6,
        startYear: 1896, startMonth: 9, startDay: 18,
        endYear: 1898, endMonth: 1, endDay: 12,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '금본위제 시행(1897). 진보당과의 제휴 와해로 사퇴.',
        cabinetName: '2차 마쓰카타 내각',
      },
    ],
  },
  {
    name: '시게노부',
    surname: '오쿠마',
    originalName: 'Ōkuma Shigenobu',
    biography:
      '메이지·다이쇼 시대의 정치가·교육자. 사가번 출신으로 입헌개진당을 결성하고 정당정치 도입에 앞장섰다. 와세다대학(전신 도쿄전문학교, 1882)을 창립한 교육자로도 유명하다. 1898년 헌정당과 연립한 "외쿠라이쿠(隈板) 내각"으로 8대 총리에 취임했으며, 이는 일본 최초의 정당내각이었으나 4개월 만에 붕괴했다(이후 17대로 다시 총리 역임).',
    birthYear: 1838, birthMonth: 3, birthDay: 11,
    deathYear: 1922, deathMonth: 1, deathDay: 10,
    gender: 'MALE',
    countryName: '일본 제국',
    birthPlaceText: '사가번 사가 성하촌 야마부키촌(会所小路) — 현재 사가현 사가시',
    influence: 80,
    stats: {
      politics: 88, military: 45, diplomacy: 80, intellect: 92, charisma: 82, administration: 78,
      notes: '입헌개진당·와세다대학 창립 — 정당정치+교육 양면. 학식·카리스마 강점.',
    },
    tenures: [
      {
        countryName: '일본 제국', positionTitle: '내각총리대신',
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        termNumber: 8,
        startYear: 1898, startMonth: 6, startDay: 30,
        endYear: 1898, endMonth: 11, endDay: 8,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: TenureEndReason.RESIGNATION,
        notes: '일본 최초의 정당내각(외쿠라이쿠 내각). 헌정당 내분으로 4개월 만에 붕괴.',
        cabinetName: '1차 오쿠마 내각 (외쿠라이쿠 내각)',
      },
    ],
  },
]

// ── 천황 부자 관계 ────────────────────────────────────────────────────────────
const FATHER_CHILD: { father: string; child: string }[] = [
  { father: 'Emperor Meiji (Mutsuhito)', child: 'Emperor Taishō (Yoshihito)' },
  { father: 'Emperor Taishō (Yoshihito)', child: 'Emperor Shōwa (Hirohito)' },
]

// ── 시딩 함수 ─────────────────────────────────────────────────────────────────
export async function seedJapanMeijiEra(prisma: PrismaService): Promise<void> {
  console.log('\n🇯🇵 일본 메이지·다이쇼·쇼와 인물 시딩 시작...')

  // ── 0. 역사 국가 (일본 제국) ──────────────────────────────────────
  console.log('\n  🏯 역사 국가 생성...')
  const modernJapan = await prisma.country.findFirst({ where: { isoCode: 'JP' }, select: { id: true } })
  let historicalCountryId: string
  const existingHC = await prisma.historicalCountry.findFirst({ where: { name: HISTORICAL_COUNTRY.name } })
  if (existingHC) {
    historicalCountryId = existingHC.id
    console.log(`    ⏭️  ${HISTORICAL_COUNTRY.name}`)
  } else {
    const created = await prisma.historicalCountry.create({
      data: {
        name: HISTORICAL_COUNTRY.name,
        enName: HISTORICAL_COUNTRY.enName,
        description: HISTORICAL_COUNTRY.description,
        startEra: HISTORICAL_COUNTRY.startEra as any,
        startYear: HISTORICAL_COUNTRY.startYear,
        startMonth: HISTORICAL_COUNTRY.startMonth,
        endEra: HISTORICAL_COUNTRY.endEra as any,
        endYear: HISTORICAL_COUNTRY.endYear,
        endMonth: HISTORICAL_COUNTRY.endMonth,
        stateType: HISTORICAL_COUNTRY.stateType,
        entityKind: HISTORICAL_COUNTRY.entityKind,
        latitude: HISTORICAL_COUNTRY.latitude,
        longitude: HISTORICAL_COUNTRY.longitude,
        accountId: ACCOUNT_ID,
      },
    })
    historicalCountryId = created.id
    console.log(`    ✅ ${HISTORICAL_COUNTRY.name}`)
  }
  if (modernJapan) {
    const linkExists = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId, modernCountryId: modernJapan.id },
    })
    if (!linkExists) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId, modernCountryId: modernJapan.id },
      })
      console.log(`    🔗 현대 일본(JP) 연결`)
    }
  }

  // ── 0-1. 가문 (황실) ──────────────────────────────────────────────
  console.log('\n  🏰 가문 생성...')
  const existingDyn = await prisma.dynasty.findFirst({ where: { name: DYNASTY.name } })
  let dynastyId: string
  if (existingDyn) {
    dynastyId = existingDyn.id
    console.log(`    ⏭️  ${DYNASTY.name}`)
  } else {
    const createdDyn = await prisma.dynasty.create({
      data: {
        name: DYNASTY.name,
        description: DYNASTY.description,
        startDate: new Date(DYNASTY.startYear, 0, 1),
        originPlace: DYNASTY.originPlace,
      },
    })
    dynastyId = createdDyn.id
    console.log(`    ✅ ${DYNASTY.name}`)
  }

  // ── 0-2. 가문 통치 (황실 → 일본 제국) ────────────────────────────
  const ruleExists = await prisma.dynastyRule.findFirst({
    where: { dynastyId, historicalCountryId },
  })
  if (!ruleExists) {
    await prisma.dynastyRule.create({
      data: {
        dynastyId, historicalCountryId,
        startEra: 'AD', startYear: HISTORICAL_COUNTRY.startYear,
        endEra: 'AD', endYear: HISTORICAL_COUNTRY.endYear,
      },
    })
    console.log(`    📜 통치 기록: 황실 → 일본 제국`)
  }

  // ── 1. 인물 ───────────────────────────────────────────────────────
  console.log('\n  👤 인물 등록...')
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
      const patch: { dynastyId?: string; influence?: number; birthPlaceText?: string } = {}
      if (!existing.dynastyId && linkedDynastyId) patch.dynastyId = linkedDynastyId
      if (existing.influence == null && m.influence != null) patch.influence = m.influence
      if (!existing.birthPlaceText && m.birthPlaceText) patch.birthPlaceText = m.birthPlaceText
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: personId }, data: patch })
        if (patch.dynastyId) console.log(`        ✅ 가문 연결: ${m.dynastyName}`)
        if (patch.influence != null) console.log(`        ✅ 영향력: ${patch.influence}`)
        if (patch.birthPlaceText) console.log(`        ✅ 출생지: ${patch.birthPlaceText}`)
      }
    } else {
      const created = await prisma.person.create({
        data: {
          name: m.name,
          surname: m.surname,
          originalName: m.originalName,
          regnalName: m.regnalName,
          biography: m.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: m.gender,
          nameDisplayOrder: 'korean', // 일본 이름은 성-이름 순서
          dynastyId: linkedDynastyId ?? undefined,
          influence: m.influence,
          birthPlaceText: m.birthPlaceText,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${m.originalName}${m.influence != null ? ` (영향력 ${m.influence})` : ''}`)
    }

    // 능력치 (PersonStats — accountId 단위)
    if (m.stats) {
      const existingStats = await prisma.personStats.findFirst({
        where: { personId, accountId: ACCOUNT_ID },
      })
      if (existingStats) {
        console.log(`        ⏭️  능력치`)
      } else {
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

    // 천황 재위 (SovereignReign)
    for (const r of m.reigns ?? []) {
      const reignCountryId = await getHistoricalCountryId(prisma, r.countryName)
      if (!reignCountryId) { console.warn(`        ⚠️  역사 국가 없음: ${r.countryName}`); continue }
      const positionDefId = await getPositionDefId(prisma, r.positionTitle)
      const startDate = new Date(r.startYear, r.startMonth - 1, r.startDay ?? 1)
      const endDate = r.endYear ? new Date(r.endYear, (r.endMonth ?? 1) - 1, r.endDay ?? 1) : undefined
      const existingReign = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: reignCountryId, regnalNumber: r.regnalNumber },
      })
      if (existingReign) {
        if (existingReign.personId === personId) {
          console.log(`        ⏭️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''}`)
        } else {
          console.warn(
            `        ⚠️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''} — 다른 인물에 점유됨 (skip)`,
          )
        }
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId: reignCountryId,
            positionDefinitionId: positionDefId,
            regnalNumber: r.regnalNumber,
            startDate,
            endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            notes: r.notes,
            accountId: ACCOUNT_ID,
          },
        })
        console.log(`        ✅ 재위: ${r.positionTitle} ${r.regnalNumber}대 (${r.startYear}-${r.endYear ?? '현재'})`)
      }
    }

    // 총리 재임 (GovernmentPositionTenure)
    for (const t of m.tenures ?? []) {
      const tenureCountryId = await getHistoricalCountryId(prisma, t.countryName)
      if (!tenureCountryId) { console.warn(`        ⚠️  역사 국가 없음: ${t.countryName}`); continue }
      const positionDefId = await getPositionDefId(prisma, t.positionTitle)
      const startDate = new Date(t.startYear, t.startMonth - 1, t.startDay ?? 1)
      const endDate = t.endYear ? new Date(t.endYear, (t.endMonth ?? 1) - 1, t.endDay ?? 1) : undefined
      // 같은 인물 + 같은 국가 + 같은 termNumber 면 중복으로 본다
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

      // 행정부(Cabinet) — 총리 임기 1건당 내각 1건
      if (t.cabinetName && t.positionType === GovernmentPositionType.HEAD_OF_GOVERNMENT) {
        const existingCabinet = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
        if (existingCabinet) {
          console.log(`        ⏭️  내각: ${existingCabinet.name ?? t.cabinetName}`)
        } else {
          await prisma.cabinet.create({
            data: { headTenureId: tenureId, name: t.cabinetName, accountId: ACCOUNT_ID },
          })
          console.log(`        🏛️  내각: ${t.cabinetName}`)
        }
      }
    }
  }

  // ── 2. 천황 부자 관계 ────────────────────────────────────────────
  console.log('\n  👨‍👦 천황 부자 관계 등록...')
  for (const rel of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: rel.father } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!father || !child) {
      console.warn(`    ⚠️  없음: ${rel.father} → ${rel.child}`)
      continue
    }
    if (child.fatherId) {
      console.log(`    ⏭️  ${rel.child}`)
      continue
    }
    await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
    console.log(`    ✅ ${rel.father} → ${rel.child}`)
  }

  console.log(`\n✅ 일본 인물 시딩 완료 (${PERSONS.length}명)\n`)
}
