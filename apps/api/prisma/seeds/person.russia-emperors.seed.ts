import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// 역사 국가 이름 → id 조회 헬퍼
async function getHistoricalCountryId(
  prisma: PrismaService,
  name: string,
): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}

// 관직 정의 이름 → id 조회 헬퍼
async function getPositionDefId(
  prisma: PrismaService,
  title: string,
): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

interface MonarchEntry {
  name: string
  surname: string
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

  /** 부친(originalName 으로 lookup, 시드 안에 같이 정의돼 있어야 함) */
  fatherOriginalName?: string
  /** 모친(originalName 으로 lookup) */
  motherOriginalName?: string

  /** 재위 기록. 황제가 아닌 연결고리 인물(예: 황태자·황녀)은 빈 배열 */
  reigns: {
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
    endReasonDetail?: string
    notes?: string
  }[]
}

const MONARCHS: MonarchEntry[] = [
  // ── 0. 이반 5세 (연결고리 — 표트르 1세의 형, 안나 여제의 부친) ──────────
  {
    name: '이반',
    surname: '로마노프',
    originalName: 'Ivan V of Russia',
    regnalName: 'Ivan',
    biography:
      '러시아 차르국의 차르(1682-1696). 알렉세이 미하일로비치 차르의 다섯째 아들이자 표트르 1세의 형(이복형). 병약하고 시각·언어 장애를 가졌으나 나리시킨가-밀로슬라프스키가 권력 다툼 끝에 동생 표트르 1세와 공동 차르로 추대되었다(1682). 실권은 누나 소피야 알렉세예브나 섭정공주가 행사했으며, 1689년 표트르 1세가 친정을 시작한 뒤로 형식상 공동 군주로만 남았다. 안나 여제(러시아 제국 4대 황제)와 이반 6세 가계의 시조.',
    birthYear: 1666, birthMonth: 9, birthDay: 6,
    deathYear: 1696, deathMonth: 2, deathDay: 8,
    gender: 'MALE',
    reigns: [
      {
        countryName: '러시아 차르국',
        positionTitle: '차르',
        startYear: 1682, startMonth: 5, startDay: 7,
        endYear: 1696, endMonth: 2, endDay: 8,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '동생 표트르 1세와 공동 차르. 실권은 섭정 소피야 → 표트르 1세에게 있었음.',
      },
    ],
  },

  // ── 1. 표트르 1세 (대제) ──────────────────────────────────────────
  {
    name: '표트르',
    surname: '로마노프',
    originalName: 'Peter I of Russia',
    regnalName: 'Peter',
    biography:
      '러시아 제국의 초대 황제(1721-1725)이자 차르(1682-1725). "대제(Великий)"로 불리는 러시아 역사상 가장 위대한 군주 중 한 명. 서유럽 대여행(그랜드 엠버시, 1697-1698)을 통해 근대화 정책을 추진했다. 스웨덴과의 북방 전쟁(1700-1721)에서 승리해 발트해 출구를 확보하고, 1703년 상트페테르부르크를 건설해 수도를 이전했다. 1721년 니스타트 조약 체결 후 원로원으로부터 "황제(Император)" 칭호를 받아 러시아 제국을 공식 성립시켰다.',
    birthYear: 1672, birthMonth: 6, birthDay: 9,
    deathYear: 1725, deathMonth: 2, deathDay: 8,
    gender: 'MALE',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 1,
        startYear: 1721, startMonth: 11, startDay: 2,
        endYear: 1725, endMonth: 2, endDay: 8,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '니스타트 조약 체결 후 황제 칭호 선포. 서구화 대개혁, 상트페테르부르크 건설, 북방 전쟁 승리.',
      },
    ],
  },

  // ── 2. 예카테리나 1세 ──────────────────────────────────────────────
  {
    name: '예카테리나',
    surname: '로마노프',
    originalName: 'Catherine I of Russia',
    regnalName: 'Catherine',
    biography:
      '러시아 제국의 제2대 황제(1725-1727). 리투아니아 농민 출신으로 포로로 잡혀 표트르 1세의 정부가 되었다가 두 번째 황후(1712년 혼례)이자 공동 황제(1724년 대관식)로 책봉되었다. 표트르 1세 사망 후 메셴시코프 공작과 근위대의 지지를 받아 러시아 최초의 여성 황제로 즉위했다. 실질 통치는 측근들이 담당했으며, 과학 아카데미 설립(1725)을 완성하고 베링 탐험대를 파견했다.',
    birthYear: 1684, birthMonth: 4, birthDay: 15,
    deathYear: 1727, deathMonth: 5, deathDay: 17,
    gender: 'FEMALE',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        // 정본 P: regnalNumber = 러시아 제국 통산 즉위 순서(제N대). 이름별 번호(예카테리나 1세)는 인물 regnalName.
        regnalNumber: 2,
        startYear: 1725, startMonth: 2, startDay: 8,
        endYear: 1727, endMonth: 5, endDay: 17,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '러시아 최초의 여성 황제. 근위대 추대로 즉위. 과학 아카데미 완성, 베링 탐험 파견.',
      },
    ],
  },

  // ── 연결고리: 알렉세이 표트로비치 (표트르 1세의 장남, 표트르 2세의 부친) ──
  {
    name: '알렉세이',
    surname: '로마노프',
    originalName: 'Alexei Petrovich of Russia',
    biography:
      '러시아 황태자(차레비치, 1690-1718). 표트르 1세와 첫 황후 예브도키야 로푸히나의 장남. 서구화 개혁에 거부감을 보이고 보수파의 구심점이 되어 부친과 갈등했다. 1716년 빈으로 도주했다가 1718년 송환되어 반역 혐의로 심문 끝에 페트로파블롭스크 요새에서 사망(고문 후유증으로 추정). 표트르 1세 직계 남성 후계 단절의 결정적 사건이며, 그의 아들이 후일 표트르 2세로 즉위했다.',
    birthYear: 1690, birthMonth: 2, birthDay: 28,
    deathYear: 1718, deathMonth: 6, deathDay: 26,
    gender: 'MALE',
    fatherOriginalName: 'Peter I of Russia',
    reigns: [],
  },

  // ── 연결고리: 안나 페트로브나 (표트르 1세의 차녀, 표트르 3세의 모친) ───
  {
    name: '안나',
    surname: '로마노프',
    originalName: 'Anna Petrovna of Russia',
    biography:
      '러시아 황녀(체사레브나, 1708-1728). 표트르 1세와 예카테리나 1세의 차녀. 1725년 홀슈타인-고토르프 공작 카를 프리드리히와 결혼해 독일로 이주했다. 1728년 아들 카를 페터(훗날의 표트르 3세)를 낳은 직후 산후 합병증으로 사망. 그녀의 아들이 외숙모 엘리자베타 여제의 후계자로 지명되어 러시아 황제(표트르 3세)로 즉위함으로써 로마노프 직계 남성 계열을 홀슈타인-고토르프-로마노프 가계로 잇는 결정적 연결고리가 되었다.',
    birthYear: 1708, birthMonth: 2, birthDay: 7,
    deathYear: 1728, deathMonth: 5, deathDay: 15,
    gender: 'FEMALE',
    fatherOriginalName: 'Peter I of Russia',
    motherOriginalName: 'Catherine I of Russia',
    reigns: [],
  },

  // ── 3. 표트르 2세 ─────────────────────────────────────────────────
  {
    name: '표트르',
    surname: '로마노프',
    originalName: 'Peter II of Russia',
    regnalName: 'Peter',
    biography:
      '러시아 제국의 제3대 황제(1727-1730). 표트르 1세의 손자이자 황태자 알렉세이의 아들. 11세에 즉위했으나 실권은 메셴시코프 공작, 이후 돌고루코프 가문이 장악했다. 수도를 다시 모스크바로 옮기려는 움직임이 있었다. 돌고루코프 공녀와의 약혼을 앞두고 천연두에 걸려 14세에 요절하면서 표트르 1세 직계 남성 계열이 단절되었다.',
    birthYear: 1715, birthMonth: 10, birthDay: 23,
    deathYear: 1730, deathMonth: 1, deathDay: 30,
    gender: 'MALE',
    fatherOriginalName: 'Alexei Petrovich of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 3,
        startYear: 1727, startMonth: 5, startDay: 18,
        endYear: 1730, endMonth: 1, endDay: 30,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '11세 즉위, 14세 천연두로 요절. 표트르 1세 직계 남성 계열 마지막 황제.',
      },
    ],
  },

  // ── 4. 안나 ──────────────────────────────────────────────────────
  {
    name: '안나',
    surname: '로마노프',
    originalName: 'Anna of Russia',
    regnalName: 'Anna',
    biography:
      '러시아 제국의 제4대 황제(1730-1740). 표트르 1세의 조카로 쿠를란트 공비 출신. 최고추밀원이 귀족 과두제를 강화하는 조건("조건문")을 붙여 즉위시켰으나, 안나는 즉위 직후 조건문을 파기하고 전제 권력을 복원했다. 독일인 총신 비론(Biron)에게 실권을 위임해 "비론 치세(Бироновщина)"라는 비판을 받았다. 쿠를란트를 러시아 세력권에 편입시키고 폴란드 계승 전쟁에도 개입했다.',
    birthYear: 1693, birthMonth: 2, birthDay: 7,
    deathYear: 1740, deathMonth: 10, deathDay: 28,
    gender: 'FEMALE',
    fatherOriginalName: 'Ivan V of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 4,
        startYear: 1730, startMonth: 2, startDay: 19,
        endYear: 1740, endMonth: 10, endDay: 28,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '최고추밀원 조건부 추대. 즉위 후 조건 파기, 전제 복원. "비론 치세"로 비판.',
      },
    ],
  },

  // ── 5. 이반 6세 ──────────────────────────────────────────────────
  {
    name: '이반',
    surname: '로마노프',
    originalName: 'Ivan VI of Russia',
    regnalName: 'Ivan',
    biography:
      '러시아 제국의 제5대 황제(1740-1741). 안나 황제의 지명을 받아 생후 약 2개월 만에 즉위한 유아 황제. 어머니 안나 레오폴도브나(브라운슈바이크 공비)가 섭정을 맡았으나, 1741년 12월 엘리자베타 황녀가 이끄는 근위대 쿠데타로 폐위되었다. 이후 슐리셀부르크 요새에 23년간 독방 감금되다가 1764년 미로비치 중위의 탈환 시도 과정에서 간수에 의해 살해되었다.',
    birthYear: 1740, birthMonth: 8, birthDay: 23,
    deathYear: 1764, deathMonth: 7, deathDay: 16,
    gender: 'MALE',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 5,
        startYear: 1740, startMonth: 10, startDay: 28,
        endYear: 1741, endMonth: 12, endDay: 6,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.OVERTHROWN,
        endReasonDetail: '엘리자베타 황녀 주도 근위대 쿠데타로 폐위. 23년 감금 후 살해.',
        notes: '생후 2개월에 즉위한 유아 황제. 재위 13개월.',
      },
    ],
  },

  // ── 6. 엘리자베타 ────────────────────────────────────────────────
  {
    name: '엘리자베타',
    surname: '로마노프',
    originalName: 'Elizabeth of Russia',
    regnalName: 'Elizabeth',
    biography:
      '러시아 제국의 제6대 황제(1741-1762). 표트르 1세와 예카테리나 1세의 딸. 근위대 쿠데타로 이반 6세를 폐위하고 즉위했다. 7년 전쟁(1756-1763)에 참전해 프로이센의 프리드리히 대왕을 수세에 몰아넣었으나 사망 후 조카 표트르 3세의 즉위로 전세가 역전되었다("브란덴부르크의 기적"). 모스크바 국립대학 창설(1755), 겨울 궁전 건축(라스트렐리 설계) 등 문화·교육 부흥에 기여했다. 평생 공식 혼인 없이 총신 알렉세이 라주모프스키를 총애했다.',
    birthYear: 1709, birthMonth: 12, birthDay: 29,
    deathYear: 1762, deathMonth: 1, deathDay: 5,
    gender: 'FEMALE',
    fatherOriginalName: 'Peter I of Russia',
    motherOriginalName: 'Catherine I of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 6,
        startYear: 1741, startMonth: 12, startDay: 6,
        endYear: 1762, endMonth: 1, endDay: 5,
        appointmentMethod: AppointmentMethod.COUP,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '7년 전쟁 참전, 모스크바 대학 창설, 겨울 궁전 건축. 공식 후계자 없이 사망.',
      },
    ],
  },

  // ── 7. 표트르 3세 ────────────────────────────────────────────────
  {
    name: '표트르',
    surname: '로마노프',
    originalName: 'Peter III of Russia',
    regnalName: 'Peter',
    biography:
      '러시아 제국의 제7대 황제(1762). 표트르 1세의 외손자로 독일 홀슈타인-고토르프 공작 출신. 엘리자베타 황제의 후계자로 지명되어 즉위했다. 즉위 직후 7년 전쟁에서 프로이센과 갑작스러운 강화를 맺어("브란덴부르크의 기적") 군부와 귀족의 반감을 샀다. 농노제 폐지 사전 논의, 성직자 재산 몰수 등 개혁 정책도 추진했으나, 즉위 6개월 만에 황후 예카테리나 주도 쿠데타로 폐위, 얼마 후 살해되었다.',
    birthYear: 1728, birthMonth: 2, birthDay: 21,
    deathYear: 1762, deathMonth: 7, deathDay: 17,
    gender: 'MALE',
    motherOriginalName: 'Anna Petrovna of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 7,
        startYear: 1762, startMonth: 1, startDay: 5,
        endYear: 1762, endMonth: 7, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.OVERTHROWN,
        endReasonDetail: '황후 예카테리나 주도 근위대 쿠데타로 폐위. 재위 186일. 직후 살해.',
        notes: '프로이센과의 일방적 강화로 군부 반발 → 쿠데타. "브란덴부르크의 기적" 유발.',
      },
    ],
  },

  // ── 8. 예카테리나 2세 (대제) ──────────────────────────────────────
  {
    name: '예카테리나',
    surname: '로마노프',
    originalName: 'Catherine II of Russia',
    regnalName: 'Catherine',
    biography:
      '러시아 제국의 제8대 황제(1762-1796). "대제(Великая)"로 불리며 표트르 대제와 함께 러시아 역사상 가장 위대한 군주로 평가된다. 독일 안할트-체르프스트 공국 출신으로 남편 표트르 3세를 쿠데타로 폐위하고 즉위했다. 계몽전제주의를 표방하며 볼테르·디드로 등 철학자들과 교류했다. 러시아-튀르크 전쟁 승리로 크림반도를 병합(1783)하고, 폴란드 1·2·3차 분할에 참여해 러시아 영토를 대폭 확장했다. 푸가초프 반란(1773-1775)을 진압하고 귀족 헌장으로 귀족 특권을 강화했다.',
    birthYear: 1729, birthMonth: 5, birthDay: 2,
    deathYear: 1796, deathMonth: 11, deathDay: 17,
    gender: 'FEMALE',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 8,
        startYear: 1762, startMonth: 7, startDay: 9,
        endYear: 1796, endMonth: 11, endDay: 17,
        appointmentMethod: AppointmentMethod.COUP,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '계몽전제주의, 크림반도 병합, 폴란드 분할 참여. 러시아를 유럽 최강국으로 확립.',
      },
    ],
  },

  // ── 9. 파벨 1세 ──────────────────────────────────────────────────
  {
    name: '파벨',
    surname: '로마노프',
    originalName: 'Paul I of Russia',
    regnalName: 'Paul',
    biography:
      '러시아 제국의 제9대 황제(1796-1801). 표트르 3세와 예카테리나 2세의 아들. 어머니 예카테리나 2세와 오랜 갈등 끝에 42세에 즉위했다. 어머니의 귀족 우대 정책을 뒤집고 귀족 특권을 축소했으며, 파울 황제 법(1797)으로 명확한 남성 장자 세습 원칙을 확립했다. 제2·3차 대불동맹에 참가했다가 이탈리아 원정 실패 후 나폴레옹과 화해하고 인도 원정을 계획했다. 변덕스러운 통치로 귀족과 근위대의 반감을 사 1801년 쿠데타로 아들 알렉산드르 1세가 옹립되면서 살해되었다.',
    birthYear: 1754, birthMonth: 10, birthDay: 1,
    deathYear: 1801, deathMonth: 3, deathDay: 23,
    gender: 'MALE',
    fatherOriginalName: 'Peter III of Russia',
    motherOriginalName: 'Catherine II of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 9,
        startYear: 1796, startMonth: 11, startDay: 17,
        endYear: 1801, endMonth: 3, endDay: 23,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '귀족 주도 쿠데타로 암살. 아들 알렉산드르 1세 즉위.',
        notes: '귀족 특권 축소, 장자 세습 원칙 확립. 나폴레옹과 화해 후 암살.',
      },
    ],
  },

  // ── 연결고리: 마리야 표도로브나 (파벨 1세의 황후, 알렉1·니콜1의 모친) ──
  {
    name: '마리야',
    surname: '로마노프',
    originalName: 'Maria Feodorovna (Sophie Dorothea of Württemberg)',
    biography:
      '러시아 황후(1796-1801, 1759-1828). 본명 조피 도로테아 폰 뷔르템베르크(Sophie Dorothea of Württemberg). 1776년 파벨 1세와 결혼해 정교회로 개종하면서 마리야 표도로브나로 개명했다. 알렉산드르 1세, 니콜라이 1세를 비롯해 10명의 자녀를 두어 19세기 로마노프 가계의 어머니로 불린다. 남편 파벨 1세 사후(1801) 자선·교육 사업에 헌신해 황실 자선기관(마리야 부서)을 운영했다.',
    birthYear: 1759, birthMonth: 10, birthDay: 25,
    deathYear: 1828, deathMonth: 11, deathDay: 5,
    gender: 'FEMALE',
    reigns: [],
  },

  // ── 10. 알렉산드르 1세 ───────────────────────────────────────────
  {
    name: '알렉산드르',
    surname: '로마노프',
    originalName: 'Alexander I of Russia',
    regnalName: 'Alexander',
    biography:
      '러시아 제국의 제10대 황제(1801-1825). 파벨 1세와 마리아 표도로브나의 장남. 1812년 나폴레옹의 러시아 침공을 격퇴하고("조국 전쟁") 파리까지 진군해 반나폴레옹 연합의 핵심 인물이 되었다. 빈 회의(1815)에서 유럽 질서 재편에 주도적 역할을 하고 신성동맹을 창설했다. 자유주의 성향으로 즉위 초 개혁을 시도했으나 말년에는 보수·신비주의로 기울었다. 타간로크에서 갑작스럽게 사망해 일각에서는 수도사로 은거했다는 전설이 남아 있다.',
    birthYear: 1777, birthMonth: 12, birthDay: 23,
    deathYear: 1825, deathMonth: 12, deathDay: 1,
    gender: 'MALE',
    fatherOriginalName: 'Paul I of Russia',
    motherOriginalName: 'Maria Feodorovna (Sophie Dorothea of Württemberg)',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 10,
        startYear: 1801, startMonth: 3, startDay: 23,
        endYear: 1825, endMonth: 12, endDay: 1,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '나폴레옹 격퇴(조국 전쟁), 빈 회의 주도, 신성동맹 창설.',
      },
    ],
  },

  // ── 11. 니콜라이 1세 ─────────────────────────────────────────────
  {
    name: '니콜라이',
    surname: '로마노프',
    originalName: 'Nicholas I of Russia',
    regnalName: 'Nicholas',
    biography:
      '러시아 제국의 제11대 황제(1825-1855). 즉위 첫날 데카브리스트 반란(자유주의 장교 봉기)을 진압하며 강력한 반동적 전제정치를 확립했다. "유럽의 헌병(Жандарм Европы)"으로 불리며 1830년 폴란드 봉기와 1848년 혁명(오스트리아 지원) 진압에 개입했다. 국가 종교 체제(정교회·전제·민족성)를 표방했다. 크림 전쟁(1853-1856)에서 영국·프랑스·오스만 제국의 연합에 고전하다 사망했다.',
    birthYear: 1796, birthMonth: 7, birthDay: 6,
    deathYear: 1855, deathMonth: 3, deathDay: 2,
    gender: 'MALE',
    fatherOriginalName: 'Paul I of Russia',
    motherOriginalName: 'Maria Feodorovna (Sophie Dorothea of Württemberg)',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 11,
        startYear: 1825, startMonth: 12, startDay: 19,
        endYear: 1855, endMonth: 3, endDay: 2,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '데카브리스트 반란 진압, "유럽의 헌병". 크림 전쟁 패배 중 사망.',
      },
    ],
  },

  // ── 12. 알렉산드르 2세 (해방자 황제) ─────────────────────────────
  {
    name: '알렉산드르',
    surname: '로마노프',
    originalName: 'Alexander II of Russia',
    regnalName: 'Alexander',
    biography:
      '러시아 제국의 제12대 황제(1855-1881). "해방자 황제(Царь-Освободитель)"로 불리며 1861년 농노 해방령을 발표해 약 2,300만 명의 농노를 해방시키고 러시아 근대화의 토대를 마련했다. 사법·군사·지방자치 개혁도 단행했다. 알래스카를 미국에 매각(1867)하고 중앙아시아(타슈켄트, 사마르칸트 등)를 병합했다. 러시아-튀르크 전쟁(1877-1878)으로 발칸반도에서 슬라브 민족 해방을 지원했다. 수차례의 암살 시도 끝에 1881년 인민의지당 혁명가들의 폭탄 공격으로 사망했다.',
    birthYear: 1818, birthMonth: 4, birthDay: 29,
    deathYear: 1881, deathMonth: 3, deathDay: 13,
    gender: 'MALE',
    fatherOriginalName: 'Nicholas I of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 12,
        startYear: 1855, startMonth: 3, startDay: 2,
        endYear: 1881, endMonth: 3, endDay: 13,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '인민의지당 혁명가들의 폭탄 테러로 암살.',
        notes: '농노 해방(1861), 알래스카 매각(1867). "해방자 황제". 혁명가에 의해 암살.',
      },
    ],
  },

  // ── 13. 알렉산드르 3세 (평화 황제) ───────────────────────────────
  {
    name: '알렉산드르',
    surname: '로마노프',
    originalName: 'Alexander III of Russia',
    regnalName: 'Alexander',
    biography:
      '러시아 제국의 제13대 황제(1881-1894). "평화 황제(Царь-Миротворец)"로 불리며 재위 기간 동안 전쟁을 치르지 않았다. 아버지 암살에 충격을 받아 자유주의 개혁을 철회하고 강력한 반동 정책(러시아화 정책, 소수민족 탄압)을 추진했다. 급속한 산업화를 이끌어 시베리아 횡단 철도 건설을 시작했다. 독일·오스트리아와의 삼제동맹에서 이탈해 프랑스와 러불 동맹(1894)을 체결, 유럽 외교 지형을 바꿨다.',
    birthYear: 1845, birthMonth: 3, birthDay: 10,
    deathYear: 1894, deathMonth: 11, deathDay: 1,
    gender: 'MALE',
    fatherOriginalName: 'Alexander II of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 13,
        startYear: 1881, startMonth: 3, startDay: 13,
        endYear: 1894, endMonth: 11, endDay: 1,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '시베리아 횡단 철도 착공, 러불 동맹 체결. "평화 황제". 러시아화 반동 정책.',
      },
    ],
  },

  // ── 14. 니콜라이 2세 (마지막 황제) ───────────────────────────────
  {
    name: '니콜라이',
    surname: '로마노프',
    originalName: 'Nicholas II of Russia',
    regnalName: 'Nicholas',
    biography:
      '러시아 제국의 마지막 황제(1894-1917). 러일 전쟁(1904-1905) 패배와 "피의 일요일"(1905)로 대규모 혁명이 발생해 10월 선언으로 입헌 두마를 창설했다. 1914년 1차 세계대전에 참전했고, 황후 알렉산드라와 라스푸틴 스캔들, 연이은 전선 패배로 권위가 급격히 추락했다. 1917년 2월 혁명으로 퇴위 선언 후 가족과 함께 시베리아로 유배되었다가 1918년 7월 예카테린부르크에서 볼셰비키에 의해 황후·자녀·측근들과 함께 총살당했다.',
    birthYear: 1868, birthMonth: 5, birthDay: 18,
    deathYear: 1918, deathMonth: 7, deathDay: 17,
    gender: 'MALE',
    fatherOriginalName: 'Alexander III of Russia',
    reigns: [
      {
        countryName: '러시아 제국',
        positionTitle: '황제',
        regnalNumber: 14,
        startYear: 1894, startMonth: 11, startDay: 1,
        endYear: 1917, endMonth: 3, endDay: 15,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '1917년 2월 혁명으로 퇴위. 1918년 볼셰비키에 의해 가족과 함께 처형.',
        notes: '러일 전쟁 패배, 1905년 혁명, 1차 세계대전 참전. 러시아 제국 마지막 황제.',
      },
    ],
  },
]

export async function seedRussiaEmperors(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n👑 러시아 제국 황제 시딩 시작...')

  /** Pass 1 결과: originalName → personId 매핑. Pass 2(부모 연결)에서 사용. */
  const idByOriginalName = new Map<string, string>()

  for (const m of MONARCHS) {
    // ── 인물 생성 또는 확인 ──────────────────────────────────────
    const existing = await prisma.person.findFirst({
      where: { originalName: m.originalName },
    })

    let personId: string

    const birthDate = new Date(m.birthYear, m.birthMonth - 1, m.birthDay)
    const deathDate = m.deathYear
      ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1)
      : undefined

    if (existing) {
      personId = existing.id
      console.log(`  ⏭️  ${m.originalName}`)
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
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`  ✅ ${m.originalName}`)
    }

    idByOriginalName.set(m.originalName, personId)

    // ── 재위 기록 생성 ─────────────────────────────────────────
    for (const r of m.reigns) {
      const historicalCountryId = await getHistoricalCountryId(prisma, r.countryName)
      if (!historicalCountryId) {
        console.warn(`    ⚠️  역사 국가 없음: ${r.countryName}`)
        continue
      }

      const positionDefId = await getPositionDefId(prisma, r.positionTitle)

      const startDate = new Date(r.startYear, r.startMonth - 1, r.startDay ?? 1)
      const endDate = r.endYear
        ? new Date(r.endYear, (r.endMonth ?? 1) - 1, r.endDay ?? 1)
        : undefined

      // 유니크 제약 (historicalCountryId, regnalNumber) — 다른 personId라도 충돌하므로 제약 키로 lookup.
      const existingReign = await prisma.sovereignReign.findFirst({
        where: {
          historicalCountryId,
          regnalNumber: r.regnalNumber,
        },
      })

      if (existingReign) {
        if (existingReign.personId === personId) {
          console.log(`    ⏭️  재위: ${r.countryName} ${r.positionTitle} (${r.startYear}-${r.endYear ?? '현재'})`)
        } else {
          console.warn(
            `    ⚠️  재위: ${r.countryName} ${r.positionTitle} ${r.regnalNumber ?? ''} — 다른 인물에 이미 점유됨 (skip)`,
          )
        }
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId,
            positionDefinitionId: positionDefId,
            regnalNumber: r.regnalNumber,
            startDate,
            endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            endReasonDetail: r.endReasonDetail,
            notes: r.notes,
            accountId: ACCOUNT_ID,
          },
        })
        console.log(`    ✅ 재위: ${r.countryName} ${r.positionTitle} (${r.startYear}-${r.endYear ?? '현재'})`)
      }
    }
  }

  // ── Pass 2: 부모 연결 ──────────────────────────────────────────────
  console.log('\n👨‍👩‍👧 부모-자식 연결 적용 중...')
  let linked = 0
  for (const m of MONARCHS) {
    if (!m.fatherOriginalName && !m.motherOriginalName) continue
    const personId = idByOriginalName.get(m.originalName)
    if (!personId) continue

    const fatherId = m.fatherOriginalName
      ? (idByOriginalName.get(m.fatherOriginalName) ?? null)
      : undefined
    const motherId = m.motherOriginalName
      ? (idByOriginalName.get(m.motherOriginalName) ?? null)
      : undefined

    if (m.fatherOriginalName && fatherId == null) {
      console.warn(`    ⚠️  부친 lookup 실패: ${m.originalName} ← ${m.fatherOriginalName}`)
    }
    if (m.motherOriginalName && motherId == null) {
      console.warn(`    ⚠️  모친 lookup 실패: ${m.originalName} ← ${m.motherOriginalName}`)
    }

    const data: { fatherId?: string; motherId?: string } = {}
    if (fatherId) data.fatherId = fatherId
    if (motherId) data.motherId = motherId
    if (Object.keys(data).length === 0) continue

    await prisma.person.update({ where: { id: personId }, data })
    const parts = [
      data.fatherId ? `부 ${m.fatherOriginalName}` : null,
      data.motherId ? `모 ${m.motherOriginalName}` : null,
    ].filter(Boolean)
    console.log(`    🔗 ${m.originalName} ← ${parts.join(', ')}`)
    linked += 1
  }
  console.log(`✅ 부모 연결 ${linked}건`)

  console.log(`\n✅ 러시아 제국 황제 시딩 완료 (${MONARCHS.length}명)\n`)
}
