/**
 * 카밀로 벤소, 카보우르 백작 (Camillo Benso, Count of Cavour, 1810~1861) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure/Cabinet 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 이탈리아 통일(리소르지멘토)의 외교적 설계자이자 사르데냐 왕국 총리(1852~1859, 1860~1861)와
 * 통일 이탈리아 왕국의 초대 총리(1861)를 지낸 정치가. 비토리오 에마누엘레 2세를 받들어
 * 크림 전쟁 파병으로 "이탈리아 문제"를 국제 무대에 올리고, 플롱비에르 밀약(1858)으로
 * 나폴레옹 3세를 끌어들여 제2차 이탈리아 독립전쟁(1859)을 일으켰으며, 니스·사보이아 할양과
 * 가리발디의 천인대 원정을 능란하게 조율해 통일을 완성 직전까지 끌고 갔다. 1861년 통일 직후
 * 갑작스러운 열병으로 50세에 요절했다. "직조공(Il Tessitore)"이라는 별명처럼 의회·외교의
 * 노련한 책략으로 유명하다.
 *
 * 의존: seedItalyHistoricalCountries (사르데냐 왕국 / 이탈리아 왕국 HC) +
 *       seedGovernmentPositionDefinitions ('총리' 관직 정의) 가 먼저 실행돼야 한다.
 *
 * 등록 항목:
 *  - Person x1 (카보우르 본인)
 *  - GovernmentPositionTenure x3 (HEAD_OF_GOVERNMENT) + Cabinet x3:
 *      · 사르데냐 왕국 총리 1차 1852~1859 (RESIGNATION — 빌라프랑카 휴전 반발)
 *      · 사르데냐 왕국 총리 2차 1860~1861 (이탈리아 왕국 선포로 전환)
 *      · 이탈리아 왕국 초대 총리 1861 (DEATH_IN_OFFICE)
 *  - PersonCountryAffiliation x2 (사르데냐 왕국 BIRTH_PLACE / 이탈리아 왕국 CITIZENSHIP)
 *  - PersonNickname x1 (직조공 Il Tessitore)
 *  - PersonLifeEvent x12 (연보)
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
const CAVOUR = {
  name: '카밀로',
  surname: '카보우르',
  originalName: 'Camillo Benso, Count of Cavour',
  gender: 'MALE' as const,
  birthYear: 1810, birthMonth: 8, birthDay: 10,
  deathYear: 1861, deathMonth: 6, deathDay: 6,
  birthPlaceText:
    '토리노(Torino) — 출생 당시(1810) 프랑스 제1제국 병합기(포 도/département du Pô). 1814년 사르데냐 왕국으로 환원',
  deathPlaceText: '이탈리아 왕국 토리노(Torino) — 팔라초 카보우르',
  deathType: DeathType.ILLNESS,
  deathCause: '말라리아성 열병 + 반복적 사혈(瀉血) 치료로 인한 악화 (향년 50세)',
  deathNote:
    '1861-03-17 이탈리아 왕국 선포·초대 총리 취임 후 불과 약 3개월 만인 1861-06-06 토리노에서 ' +
    '급작스러운 열병으로 사망했다. 평소 앓던 말라리아성 발열이 도진 데다, 당대 표준 치료였던 ' +
    '반복적 사혈(피 뽑기)이 오히려 쇠약을 가속한 것으로 평가된다. 임종 직전 "이탈리아는 만들어졌다, ' +
    '이제 모든 것이 잘될 것이다(L\'Italia è fatta, tutto è a posto)"·"자유로운 교회, 자유로운 국가" ' +
    '같은 말을 남겼다고 전한다. 로마·베네치아가 아직 통일에 편입되기 전의 이른 죽음이었다.',
  influence: 85,
  biography:
    '이탈리아 통일(리소르지멘토)의 외교적 설계자이자 사르데냐 왕국 총리·통일 이탈리아 왕국 초대 총리. ' +
    '피에몬테의 귀족 가문 차남으로 태어나 "카보우르 백작"의 칭호를 썼다. ' +
    '\n\n' +
    '초기 경력(1820s~1840s). 토리노 왕립군사학교에서 공병 장교로 임관했으나 자유주의 성향 때문에 ' +
    '군과 불화해 1831년 사직했다. 이후 가문 영지의 농업 경영과 금융·철도 투자에 몰두하며 영국·프랑스를 ' +
    '오가 산업혁명과 입헌정치를 체득한 경제 자유주의자가 되었다. 1847년 체사레 발보 등과 함께 신문 ' +
    '《일 리소르지멘토(Il Risorgimento)》를 창간해 입헌·통일 여론을 이끌었다. ' +
    '\n\n' +
    '입각과 총리 등극(1848~1852). 1848년 사르데냐 의회 의원이 되었고, 1850년 농상공부 장관, 1851년 ' +
    '재무장관을 거쳤다. 의회에서 중도 우파와 중도 좌파를 묶은 "코누비오(connubio, 결혼 동맹)"를 성사시켜 ' +
    '정국의 주도권을 쥐었고, 1852-11-04 총리에 올랐다. ' +
    '\n\n' +
    '피에몬테 근대화. 철도 부설, 자유무역 조약, 은행·신용 제도 정비, 군 개혁 등으로 사르데냐를 ' +
    '이탈리아 반도에서 가장 근대적인 자유주의 국가로 키워, 통일을 주도할 물적·제도적 토대를 닦았다. ' +
    '\n\n' +
    '통일 외교의 책략(1855~1860). (1)1855년 크림 전쟁에 사르데냐군을 파병해 1856 파리 강화회의 ' +
    '참석권을 얻고 "이탈리아 문제"를 열강 외교 무대에 올렸다 (2)1858-07 플롱비에르에서 나폴레옹 3세와 ' +
    '밀약을 맺어 대(對)오스트리아 전쟁 시 프랑스의 군사 지원을 확보했다 (3)1859 제2차 이탈리아 독립전쟁에서 ' +
    '마젠타·솔페리노 승리로 롬바르디아를 얻었으나, 나폴레옹 3세가 베네치아를 남긴 채 빌라프랑카 휴전을 ' +
    '체결하자 격분해 1859-07 총리직을 사임했다 (4)1860-01 복귀 후, 토리노 조약으로 니스·사보이아를 ' +
    '프랑스에 할양하는 대가로 중부 이탈리아(토스카나·에밀리아) 병합을 승인받았다. ' +
    '\n\n' +
    '가리발디와의 줄다리기(1860). 가리발디의 "천인대(Spedizione dei Mille)" 원정으로 시칠리아·나폴리가 ' +
    '함락되자, 카보우르는 가리발디가 로마로 진격해 프랑스와 충돌하는 것을 막기 위해 사르데냐군을 ' +
    '교황령으로 진입시켜 남부를 사르데냐 왕국에 통합했다. 급진 공화파의 통일이 아니라 사보이아 왕가 ' +
    '주도의 입헌군주제 통일로 방향을 고정한 결정적 수였다. ' +
    '\n\n' +
    '이탈리아 왕국 초대 총리·죽음(1861). 1861-03-17 비토리오 에마누엘레 2세를 국왕으로 하는 ' +
    '이탈리아 왕국이 선포되고, 03-23 카보우르가 초대 총리에 취임했다. 그는 로마를 수도로 삼되 ' +
    '교황권과 공존하는 "자유로운 교회, 자유로운 국가(Libera Chiesa in libero Stato)" 노선을 ' +
    '천명했으나, 통일 완성을 보지 못한 채 1861-06-06 열병으로 50세에 급사했다. ' +
    '\n\n' +
    '평가. 가리발디의 "검(劍)", 마치니의 "혼(魂)"과 더불어 카보우르는 리소르지멘토의 "두뇌(頭腦)"로 ' +
    '꼽힌다. 무력이 아니라 의회 정치와 열강 외교의 정교한 직조로 통일을 설계한 근대적 정치가의 전형이며, ' +
    '그가 다진 자유주의·입헌주의 노선은 통일 이탈리아 초기 우파(데스트라 스토리카) 통치의 기틀이 되었다.',
}

// ── 총리 임기 (사르데냐 왕국 → 이탈리아 왕국) ────────────────────────────────
interface TenureSpec {
  countryName: string
  termNumber?: number
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
    countryName: '사르데냐 왕국',
    startYear: 1852, startMonth: 11, startDay: 4,
    endYear: 1859, endMonth: 7, endDay: 19,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1859 제2차 이탈리아 독립전쟁 중 나폴레옹 3세가 베네치아를 남긴 채 빌라프랑카 휴전을 체결하자 격분해 사임.',
    notes:
      '"코누비오" 의회 동맹으로 정국을 장악해 1852-11-04 총리 취임. 철도·자유무역·재정 개혁으로 ' +
      '피에몬테를 근대화하고, 크림 전쟁 파병(1855)·파리 강화회의(1856)로 이탈리아 문제를 국제화했으며 ' +
      '플롱비에르 밀약(1858)으로 대오스트리아 전쟁을 준비했다.',
    cabinetName: '카보우르 사르데냐 내각 (1852~1859)',
  },
  {
    countryName: '사르데냐 왕국',
    startYear: 1860, startMonth: 1, startDay: 21,
    endYear: 1861, endMonth: 3, endDay: 23,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1861-03-17 이탈리아 왕국 선포로 사르데냐 정부가 통일 이탈리아 정부로 전환 — 03-23 이탈리아 왕국 초대 총리로 이어짐.',
    notes:
      '1860-01 복귀. 토리노 조약으로 니스·사보이아를 프랑스에 할양하는 대가로 중부 이탈리아 병합을 ' +
      '승인받았고, 가리발디의 천인대 원정으로 함락된 남부를 사보이아 왕가 주도로 통합해 통일을 완성 직전까지 끌었다.',
    cabinetName: '카보우르 사르데냐 내각 (1860~1861)',
  },
  {
    countryName: '이탈리아 왕국',
    termNumber: 1,
    startYear: 1861, startMonth: 3, startDay: 23,
    endYear: 1861, endMonth: 6, endDay: 6,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1861-06-06 토리노에서 열병으로 재임 중 급사(향년 50세).',
    notes:
      '1861-03-17 이탈리아 왕국 선포 후 03-23 초대 총리 취임. "자유로운 교회, 자유로운 국가" 노선으로 ' +
      '로마 문제 해결을 모색했으나, 통일 완성(로마·베네치아 편입)을 보지 못한 채 약 3개월 만에 급사했다.',
    cabinetName: '카보우르 이탈리아 초대 내각 (1861)',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: string; priority: number }[] = [
  { nickname: '직조공 (Il Tessitore)', type: '별명', priority: 1 },
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
    title: '토리노 출생',
    category: 'FAMILY',
    startYear: 1810, startMonth: 8, startDay: 10,
    description: '토리노(출생 당시 프랑스 제1제국 병합기)의 피에몬테 귀족 가문 차남으로 출생. "카보우르 백작" 칭호를 씀.',
  },
  {
    title: '공병 장교 사직',
    category: 'CAREER',
    startYear: 1831,
    description: '토리노 왕립군사학교 출신 공병 장교였으나 자유주의 성향으로 군과 불화해 사직, 영지 경영·투자에 몰두.',
  },
  {
    title: '《일 리소르지멘토》 창간',
    category: 'PUBLICATION',
    startYear: 1847, startMonth: 12,
    description: '체사레 발보 등과 함께 신문 《Il Risorgimento》를 창간해 입헌·통일 여론을 주도.',
  },
  {
    title: '사르데냐 의회 의원 당선',
    category: 'POLITICAL',
    startYear: 1848,
    description: '사르데냐 왕국 의회(하원) 의원으로 정계 진출.',
  },
  {
    title: '농상공부·재무장관 역임',
    category: 'CAREER',
    startYear: 1850, endYear: 1851,
    description: '1850 농상공부 장관, 1851 재무장관을 지내며 자유무역·재정 개혁을 추진.',
  },
  {
    title: '사르데냐 왕국 총리 취임',
    category: 'POLITICAL',
    startYear: 1852, startMonth: 11, startDay: 4,
    description: '중도 좌·우를 묶은 "코누비오" 동맹으로 총리에 취임, 피에몬테 근대화를 본격화.',
  },
  {
    title: '크림 전쟁 파병·파리 강화회의',
    category: 'DIPLOMATIC',
    startYear: 1855, endYear: 1856,
    description: '사르데냐군을 크림 전쟁에 파병하고 1856 파리 강화회의 참석권을 얻어 "이탈리아 문제"를 국제화.',
  },
  {
    title: '플롱비에르 밀약',
    category: 'DIPLOMATIC',
    startYear: 1858, startMonth: 7,
    description: '나폴레옹 3세와 밀약을 맺어 대오스트리아 전쟁 시 프랑스의 군사 지원을 확보.',
  },
  {
    title: '제2차 이탈리아 독립전쟁·빌라프랑카 반발 사임',
    category: 'MILITARY',
    startYear: 1859,
    description: '마젠타·솔페리노 승리로 롬바르디아 획득. 그러나 베네치아를 남긴 빌라프랑카 휴전에 격분해 7월 사임.',
  },
  {
    title: '복귀·니스 사보이아 할양·천인대 수습',
    category: 'POLITICAL',
    startYear: 1860,
    description: '1860-01 복귀. 토리노 조약으로 니스·사보이아 할양, 중부 이탈리아 병합. 가리발디 남부 원정을 사보이아 왕가 주도로 통합.',
  },
  {
    title: '이탈리아 왕국 초대 총리 취임',
    category: 'POLITICAL',
    startYear: 1861, startMonth: 3, startDay: 23,
    description: '1861-03-17 이탈리아 왕국 선포 후 초대 총리 취임. "자유로운 교회, 자유로운 국가" 노선 천명.',
  },
  {
    title: '재임 중 급사',
    category: 'HEALTH',
    startYear: 1861, startMonth: 6, startDay: 6,
    description: '통일 완성을 보지 못한 채 토리노에서 열병으로 50세에 급사.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const CAVOUR_STATS = {
  politics: 88,
  military: 40,
  diplomacy: 92,
  intellect: 82,
  charisma: 68,
  administration: 85,
  notes:
    '리소르지멘토의 "두뇌"로 불린 통일 외교의 설계자 — 크림 파병·파리 회의·플롱비에르 밀약·니스 할양·' +
    '가리발디 수습으로 이어지는 정교한 외교 직조가 최고 강점(외교). 의회에서 "코누비오" 동맹을 짜내고 ' +
    '급진 공화파를 제어해 입헌군주제 통일로 방향을 고정한 정치 감각도 최상위. 철도·자유무역·재정 개혁으로 ' +
    '피에몬테를 반도 최선진 국가로 키운 행정 역량도 탁월. 반면 야전 군사 지휘와는 거리가 멀었고, ' +
    '대중 연설형 카리스마보다 책략·실무형 정치가였다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedCavour(prisma: PrismaService): Promise<void> {
  console.log('\n🧵 카보우르 백작(Camillo Benso) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const sardinia = await prisma.historicalCountry.findFirst({
    where: { name: '사르데냐 왕국' },
    select: { id: true },
  })
  const italy = await prisma.historicalCountry.findFirst({
    where: { name: '이탈리아 왕국' },
    select: { id: true },
  })
  // 출생(1810) 당시 토리노는 사르데냐 왕국이 아니라 나폴레옹의 프랑스 제1제국 병합기(포 도)였다.
  const firstEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제1제국' },
    select: { id: true },
  })
  if (!sardinia || !italy) {
    console.warn(
      '  ⚠️  사르데냐 왕국/이탈리아 왕국 HC 미존재 — 먼저 seedItalyHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }
  const hcByName = (name: string): string =>
    name === '이탈리아 왕국' ? italy.id : sardinia.id

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: CAVOUR.originalName },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = CAVOUR.biography
    if (!person.birthPlaceText) patch.birthPlaceText = CAVOUR.birthPlaceText
    if (!person.deathPlaceText) patch.deathPlaceText = CAVOUR.deathPlaceText
    if (!person.deathType) patch.deathType = CAVOUR.deathType
    if (!person.deathCause) patch.deathCause = CAVOUR.deathCause
    if (!person.deathNote) patch.deathNote = CAVOUR.deathNote
    if (person.influence == null) patch.influence = CAVOUR.influence
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${CAVOUR.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${CAVOUR.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: CAVOUR.name,
        surname: CAVOUR.surname,
        originalName: CAVOUR.originalName,
        biography: CAVOUR.biography,
        birthDate: toDate(CAVOUR.birthYear, CAVOUR.birthMonth, CAVOUR.birthDay),
        birthEra: 'AD' as any,
        deathDate: toDate(CAVOUR.deathYear, CAVOUR.deathMonth, CAVOUR.deathDay),
        deathEra: 'AD' as any,
        deathType: CAVOUR.deathType,
        deathCause: CAVOUR.deathCause,
        deathNote: CAVOUR.deathNote,
        gender: CAVOUR.gender,
        nameDisplayOrder: 'western' as any,
        influence: CAVOUR.influence,
        birthPlaceText: CAVOUR.birthPlaceText,
        deathPlaceText: CAVOUR.deathPlaceText,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${CAVOUR.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 총리 임기 3건 + 내각 3건 ────────────────────────────────────────────
  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })
  for (const t of TENURES) {
    const historicalCountryId = hcByName(t.countryName)
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    // 한 인물이 같은 국가에서 여러 임기를 가질 수 있으므로 startDate로 식별
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId,
        positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
        startDate,
      },
    })
    if (existing) {
      tenureId = existing.id
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.countryName} 총리 (${t.startYear})`)
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId,
          positionDefinitionId: pmDef?.id ?? undefined,
          positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
          title: '총리',
          termNumber: t.termNumber,
          startDate,
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
        `  ✅ 재임: ${t.countryName} 총리 (${t.startYear}-${String(t.startMonth).padStart(2, '0')} ~ ${t.endYear}-${String(t.endMonth).padStart(2, '0')})`,
      )
    }

    // 행정부(Cabinet) — 총리 임기 1건당 내각 1건 (행정부 뷰 노출용)
    const cab = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
    if (cab) {
      console.log(`  ⏭️  내각 스킵 (이미 존재): ${cab.name ?? t.cabinetName}`)
    } else {
      await prisma.cabinet.create({
        data: { headTenureId: tenureId, name: t.cabinetName, accountId: admin.id },
      })
      console.log(`  🏛️  내각: ${t.cabinetName}`)
    }
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: {
    historicalCountryId: string
    type: 'BIRTH_PLACE' | 'CITIZENSHIP'
    label: string
    priority: number
  }[] = []
  if (firstEmpire) {
    affiliations.push({
      historicalCountryId: firstEmpire.id,
      type: 'BIRTH_PLACE',
      label: '프랑스 제1제국 (1810 출생 당시 토리노 병합기)',
      priority: 2,
    })
  }
  affiliations.push(
    {
      historicalCountryId: sardinia.id,
      type: 'CITIZENSHIP',
      label: '사르데냐 왕국 (시민·총리 1852~1861)',
      priority: 1,
    },
    {
      historicalCountryId: italy.id,
      type: 'CITIZENSHIP',
      label: '이탈리아 왕국 (초대 총리)',
      priority: 0,
    },
  )
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
        politics: CAVOUR_STATS.politics,
        military: CAVOUR_STATS.military,
        diplomacy: CAVOUR_STATS.diplomacy,
        intellect: CAVOUR_STATS.intellect,
        charisma: CAVOUR_STATS.charisma,
        administration: CAVOUR_STATS.administration,
        notes: CAVOUR_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${CAVOUR_STATS.politics}·군사 ${CAVOUR_STATS.military}·` +
        `외교 ${CAVOUR_STATS.diplomacy}·학식 ${CAVOUR_STATS.intellect}·` +
        `카리스마 ${CAVOUR_STATS.charisma}·행정 ${CAVOUR_STATS.administration}`,
    )
  }

  console.log('✅ 카보우르 백작 시딩 완료\n')
}
