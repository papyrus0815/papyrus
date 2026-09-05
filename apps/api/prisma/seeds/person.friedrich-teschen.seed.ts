/**
 * 프리드리히 폰 외스터라이히-테셴 대공 (Erzherzog Friedrich, Herzog von Teschen, 1856~1936) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 1914-07-31~1916-12-02 오스트리아-헝가리군 명목상 최고사령관(Armeeoberkommandant).
 * 아스페른-에슬링 전투의 명장 카를 대공의 손자이자 쿠스토차 전투의 명장 알브레히트 대공의
 * 조카로, "정해진 후보"로 뽑혔으나 스스로 자신의 권한을 낮춰 잡아 실질 지휘는 참모총장
 * 콘라트 폰 회첸도르프에게 맡기고 자신은 의전·조정 역할에 그쳤다. 카를 1세가 즉위 직후
 * 1916-12-02 친정 지휘를 선언하며 자리를 넘겨받았다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)이라 구력 병기가 필요 없다(콘라트 선례).
 * 최고사령관 취임일은 사료가 두 단계로 갈린다 — 07-12 군 총감찰관 지정, 07-31 최고사령관
 * 취임(대세르비아 선전포고 07-28 직후) — 이 시드는 두 단계를 별도 재임으로 나눠 등록한다.
 *
 * 관직 매핑: 향토방위군 총사령관·군 총감찰관·최고사령관 등은 GovernmentPositionDefinition
 * 카탈로그에 대응 정의가 0건이므로 title을 직접 기입한다(군인 시드 규약, 콘라트·포티오레크·
 * 베크-지코프스키 선례). positionType은 MILITARY_COMMANDER. 테셴 공작위는 세습 귀족 작위라
 * ROYAL_NOBLE_TITLE.
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (프리드리히 본인 — historicalCountryId=오스트리아-헝가리 제국)
 *  - GovernmentPositionTenure x4 (향토방위군 총사령관·군 총감찰관·최고사령관·테셴 공작) —
 *    신규 생성이라 appointmentDetail을 create에 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonLifeEvent x16 (연보)
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
const FRIEDRICH = {
  name: '프리드리히',
  middleName: null as string | null,
  surname: '폰 외스터라이히-테셴',
  originalName: 'Friedrich Maria Albrecht Wilhelm Karl von Österreich-Teschen',
  gender: 'MALE' as const,
  birthYear: 1856, birthMonth: 6, birthDay: 4,
  birthNote:
    '모라비아 그로스 젤로비츠(현 체코 지들로호비체) 성에서 카를 페르디난트 대공과 엘리자베트 ' +
    '프란치스카 대공비의 아들로 태어났다. 스페인 왕비 마리아 크리스티나, 폴란드 왕위 후보로 ' +
    '거론된 카를 슈테판 대공, 발칸 전선 총사령관을 지낸 에우겐 대공이 형제자매다.',
  birthPlaceText: '오스트리아 제국 모라비아 그로스 젤로비츠(현 체코 지들로호비체)',
  deathYear: 1936, deathMonth: 12, deathDay: 30,
  deathPlaceText: '헝가리 운가리쉬-알텐부르크(현 모숀머저로바르)',
  deathType: DeathType.ILLNESS,
  deathCause: '폐렴에 이은 심부전으로 사망(향년 80세).',
  deathNote:
    '국장에 준하는 장례가 치러져 망명 중이던 스페인 국왕 알폰소 13세, 헝가리 섭정 호르티 ' +
    '미클로시, 독일·이탈리아·오스트리아 대표, 생존한 오스트리아-헝가리 원수들, 헝가리 왕립군 ' +
    '전 대대가 참석했다. 빈 카푸친 지하묘지에 안장되었다.',
  influence: 58,
  biography:
    '1914-07-31~1916-12-02 오스트리아-헝가리군 명목상 최고사령관(Armeeoberkommandant). ' +
    '아스페른-에슬링 전투의 명장 카를 대공의 손자이자 쿠스토차 전투의 명장 알브레히트 대공의 ' +
    '조카로 "혈통상 정해진 후보"였으나, 스스로 자신의 권한을 낮춰 잡아 실질 지휘는 참모총장 ' +
    '콘라트 폰 회첸도르프에게 맡기고 자신은 군·문민·동맹국 사이를 조율하는 의전적 역할에 ' +
    '그쳤다. ' +
    '\n\n' +
    '성장과 상속(1856~1914). 모라비아에서 태어나 1874년 군 경력을 시작해 향토방위군 ' +
    '(k.k. Landwehr) 지휘 계통을 거쳤고, 1895-02-18 백부 알브레히트 대공이 죽자 테셴 공작 ' +
    '작위와 헝가리·폴란드·모라비아에 흩어진 광대한 영지, 빈의 팔레 알브레히트(알베르티나 ' +
    '컬렉션 소재지)를 물려받았다. 1878-10-08 프랑스 레르미타주 성에서 이자벨라 폰 크루아 ' +
    '(1856~1931)와 결혼해 9남매를 두었으나 아들은 1897-07-24 태어난 알브레히트 프란츠 ' +
    '한 명뿐이었다. 1907년부터 향토방위군 총사령관을 지내며 프란츠 페르디난트 대공의 신뢰를 ' +
    '받았다. ' +
    '\n\n' +
    '최고사령관(1914~1916). 1914-06-28 프란츠 페르디난트가 사라예보에서 죽자 그의 군 총감찰관 ' +
    '(Generalinspektor) 직을 이어받았고, 대세르비아 선전포고(07-28) 직후인 07-31 프란츠 ' +
    '요제프 1세로부터 전군 최고사령관으로 임명되었다. 12-08 원수(Generalfeldmarschall)로 ' +
    '진급했다. 실전 지휘·전략 수립은 전적으로 참모총장 콘라트에게 맡기고, 본인은 전선 시찰과 ' +
    '사기 진작, 독일 최고사령부와의 연락, 군부·궁정·정부 사이의 마찰 중재에 주력했다 — ' +
    '"자신의 권한을 스스로 겸손하게 낮춰 잡았다"는 평이 따른다. ' +
    '\n\n' +
    '퇴진과 만년(1916~1936). 1916-11-21 프란츠 요제프 1세가 죽고 카를 1세가 즉위하자, ' +
    '새 황제는 12-02 스스로 최고사령관을 겸하겠다고 선언하며 프리드리히를 자리에서 물러나게 ' +
    '했다. 이후 공직에 복귀하지 않고 헝가리 영지에서 지냈다 — 오스트리아·체코슬로바키아 ' +
    '정부가 자국 내 영지와 알베르티나 컬렉션을 몰수했으나 헝가리 영지는 지켰고, 1929년 ' +
    '체코슬로바키아를 상대로 한 보상 소송에서 이겼다. 1919년 오스트리아의 귀족 칭호 폐지로 ' +
    '테셴 공작이라는 법적 지위는 소멸했다. 1936-12-30 헝가리 운가리쉬-알텐부르크에서 폐렴 ' +
    '합병증으로 죽었다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  appointmentMethod: AppointmentMethod
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '테셴 공작',
    positionType: GovernmentPositionType.ROYAL_NOBLE_TITLE,
    appointmentMethod: AppointmentMethod.HEREDITARY,
    startYear: 1895, startMonth: 2, startDay: 18,
    endYear: 1919,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '오스트리아 귀족 칭호 폐지법으로 법적 작위가 소멸(재산은 헝가리 쪽만 유지).',
    appointmentDetail:
      '1895-02-18 백부 알브레히트 대공이 죽으면서 테셴 공작 작위와 헝가리·폴란드·모라비아의 ' +
      '광대한 영지, 빈의 팔레 알브레히트(알베르티나 컬렉션 소재지)를 물려받았다.',
    notes: '오스트리아-헝가리 제국 최대 지주 중 한 명이 되었다.',
  },
  {
    title: '향토방위군(란트베어) 총사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    startYear: 1907,
    endYear: 1914, endMonth: 7, endDay: 12,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '프란츠 페르디난트의 군 총감찰관직을 승계하며 향토방위군 지휘를 내려놓았다.',
    appointmentDetail: '1907년 오스트리아 향토방위군(k.k. Landwehr) 총사령관에 임명되었다.',
    notes: '이 직위를 발판으로 프란츠 페르디난트 대공의 신임을 얻었다.',
  },
  {
    title: '군 총감찰관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    startYear: 1914, startMonth: 7, startDay: 12,
    endYear: 1914, endMonth: 7, endDay: 31,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '대세르비아 선전포고 직후 전군 최고사령관으로 승격.',
    appointmentDetail:
      '1914-06-28 사라예보에서 프란츠 페르디난트가 암살되자 그가 맡던 군 총감찰관 ' +
      '(Generalinspektor) 직을 물려받았다 — 최고사령관 취임까지 19일간의 과도기 직위.',
    notes: '전쟁 발발 전야, 후계 지휘 체계를 정비하는 짧은 가교 역할이었다.',
  },
  {
    title: '오스트리아-헝가리군 최고사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    startYear: 1914, startMonth: 7, startDay: 31,
    endYear: 1916, endMonth: 12, endDay: 2,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1916-11-21 프란츠 요제프 1세 사후 즉위한 카를 1세가 12-02 스스로 최고사령관을 겸하겠다고 ' +
      '선언하며 자리를 넘겨받았다.',
    appointmentDetail:
      '1914-07-28 오스트리아-헝가리의 대세르비아 선전포고 직후인 07-31, 프란츠 요제프 1세가 ' +
      '전군 최고사령관(Armeeoberkommandant)으로 임명했다 — 아스페른-에슬링의 명장 카를 대공의 ' +
      '손자·쿠스토차의 명장 알브레히트 대공의 조카라는 혈통이 "정해진 후보"로 꼽힌 배경이었다.',
    notes:
      '12-08 원수(Generalfeldmarschall) 진급. 실전 지휘·전략은 참모총장 콘라트 폰 회첸도르프에게 ' +
      '전적으로 맡기고, 본인은 전선 시찰·사기 진작·독일 최고사령부 연락·군부-문민-동맹국 간 ' +
      '조정에 주력했다 — "자신의 권한을 스스로 겸손하게 낮춰 잡았다"는 평이 따른다.',
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
    title: '모라비아 그로스 젤로비츠 출생',
    category: 'FAMILY',
    startYear: 1856, startMonth: 6, startDay: 4,
    description:
      '카를 페르디난트 대공과 엘리자베트 프란치스카 대공비의 아들로 출생. 스페인 왕비 마리아 ' +
      '크리스티나, 카를 슈테판 대공, 에우겐 대공이 형제자매다.',
  },
  {
    title: '군 경력 시작',
    category: 'MILITARY',
    startYear: 1874,
    description: '합스부르크 대공가의 관례에 따라 군 경력을 시작했다.',
  },
  {
    title: '이자벨라 폰 크루아와 결혼',
    category: 'FAMILY',
    startYear: 1878, startMonth: 10, startDay: 8,
    description: '프랑스 레르미타주 성에서 이자벨라 폰 크루아(1856~1931)와 혼인, 9남매를 두었다.',
  },
  {
    title: '테셴 공작 작위·영지 상속',
    category: 'PERSONAL',
    startYear: 1895, startMonth: 2, startDay: 18,
    description:
      '백부 알브레히트 대공 사후 테셴 공작 작위와 헝가리·폴란드·모라비아 영지, 빈의 팔레 ' +
      '알브레히트(알베르티나 컬렉션)를 물려받아 제국 최대 지주 중 한 명이 되었다.',
  },
  {
    title: '외아들 알브레히트 프란츠 출생',
    category: 'FAMILY',
    startYear: 1897, startMonth: 7, startDay: 24,
    description: '9남매 중 유일한 아들로, 훗날 테셴 공작위를 승계한다.',
  },
  {
    title: '향토방위군 총사령관 취임',
    category: 'MILITARY',
    startYear: 1907,
    description: '오스트리아 향토방위군(k.k. Landwehr) 총사령관에 올라 프란츠 페르디난트의 신임을 얻었다.',
  },
  {
    title: '프란츠 페르디난트 암살 — 군 총감찰관 승계',
    category: 'MILITARY',
    startYear: 1914, startMonth: 6, startDay: 28,
    description:
      '사라예보에서 황위 계승자가 암살되자 그가 맡던 군 총감찰관직을 이어받았다 — 최고사령관 ' +
      '취임까지의 과도기가 시작되었다.',
  },
  {
    title: '대세르비아 선전포고',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 28,
    description: '오스트리아-헝가리가 세르비아에 선전포고했다.',
  },
  {
    title: '전군 최고사령관 취임',
    category: 'MILITARY',
    startYear: 1914, startMonth: 7, startDay: 31,
    description:
      '프란츠 요제프 1세가 전군 최고사령관(Armeeoberkommandant)으로 임명했다 — 명목상 지위였고 ' +
      '실권은 참모총장 콘라트 폰 회첸도르프에게 있었다.',
  },
  {
    title: '원수 진급',
    category: 'AWARD',
    startYear: 1914, startMonth: 12, startDay: 8,
    description: '원수(Generalfeldmarschall)로 진급했다.',
  },
  {
    title: '프란츠 요제프 1세 사망 — 카를 1세 즉위',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 11, startDay: 21,
    description: '68년 재위한 프란츠 요제프 1세가 죽고 조카손자 카를 1세가 제위에 올랐다.',
  },
  {
    title: '최고사령관직 이양',
    category: 'MILITARY',
    startYear: 1916, startMonth: 12, startDay: 2,
    description:
      '새 황제 카를 1세가 스스로 최고사령관을 겸하겠다고 선언하며 프리드리히는 2년 4개월의 ' +
      '재임을 마쳤다. 이후 공직에 복귀하지 않았다.',
  },
  {
    title: '오스트리아 귀족 칭호 폐지',
    category: 'PERSONAL',
    startYear: 1919,
    description: '오스트리아 공화국의 귀족 칭호 폐지법으로 테셴 공작이라는 법적 지위가 소멸했다.',
  },
  {
    title: '체코슬로바키아 상대 보상 소송 승소',
    category: 'PERSONAL',
    startYear: 1929,
    description:
      '오스트리아·체코슬로바키아 정부에 몰수된 영지와 알베르티나 컬렉션에 대해 체코슬로바키아를 ' +
      '상대로 낸 보상 소송에서 이겼다. 헝가리 영지는 몰수를 피해 지켰다.',
  },
  {
    title: '운가리쉬-알텐부르크에서 사망',
    category: 'PERSONAL',
    startYear: 1936, startMonth: 12, startDay: 30,
    description:
      '폐렴 합병증으로 사망(향년 80세). 알폰소 13세·호르티 미클로시 등이 참석한 국장급 장례 ' +
      '뒤 빈 카푸친 지하묘지에 안장되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const FRIEDRICH_STATS = {
  politics: 42,
  military: 30,
  diplomacy: 58,
  intellect: 45,
  charisma: 60,
  administration: 48,
  notes:
    '2년 4개월간 오스트리아-헝가리 전군의 명목상 최고사령관이었으나 실전 지휘·전략 수립은 ' +
    '전적으로 콘라트에게 맡겨 군사는 이 시리즈 최저권이다. 외교·카리스마는 전선 시찰·사기 ' +
    '진작과 독일 최고사령부 연락, 군부-문민-동맹국 간 마찰 중재라는 실제 역할을 반영해 ' +
    '중간 이상으로 잡았다 — "자신의 권한을 스스로 겸손하게 낮춰 잡았다"는 평판 자체가 ' +
    '정치적 야심 없이 조정자 역할에 충실했다는 방증이다. 행정은 제국 최대 지주로서 광대한 ' +
    '영지를 관리한 이력을 반영해 중간 수준. 학식은 특별한 저작이나 이론적 기여가 없어 낮게 ' +
    '평가한다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedFriedrichTeschen(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️ 프리드리히 폰 외스터라이히-테셴 대공(Erzherzog Friedrich) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const austriaHungary = await prisma.historicalCountry.findFirst({
    where: { name: '오스트리아-헝가리 제국' },
    select: { id: true },
  })
  if (!austriaHungary) {
    console.warn(
      '  ⚠️  오스트리아-헝가리 제국 HC 미존재 — 먼저 seedAustriaHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Österreich-Teschen' } },
        { AND: [{ name: '프리드리히' }, { surname: '폰 외스터라이히-테셴' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = FRIEDRICH.originalName
    if (!person.biography) patch.biography = FRIEDRICH.biography
    if (!person.birthPlaceText) patch.birthPlaceText = FRIEDRICH.birthPlaceText
    if (!person.birthNote) patch.birthNote = FRIEDRICH.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = FRIEDRICH.deathPlaceText
    if (!person.deathType) patch.deathType = FRIEDRICH.deathType
    if (!person.deathCause) patch.deathCause = FRIEDRICH.deathCause
    if (!person.deathNote) patch.deathNote = FRIEDRICH.deathNote
    if (person.influence == null) patch.influence = FRIEDRICH.influence
    if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${FRIEDRICH.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${FRIEDRICH.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: FRIEDRICH.name,
        middleName: FRIEDRICH.middleName,
        surname: FRIEDRICH.surname,
        originalName: FRIEDRICH.originalName,
        biography: FRIEDRICH.biography,
        birthDate: toDate(FRIEDRICH.birthYear, FRIEDRICH.birthMonth, FRIEDRICH.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: FRIEDRICH.birthNote,
        deathDate: toDate(FRIEDRICH.deathYear, FRIEDRICH.deathMonth, FRIEDRICH.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: FRIEDRICH.deathType,
        deathCause: FRIEDRICH.deathCause,
        deathNote: FRIEDRICH.deathNote,
        gender: FRIEDRICH.gender,
        nameDisplayOrder: 'western' as any,
        influence: FRIEDRICH.influence,
        birthPlaceText: FRIEDRICH.birthPlaceText,
        deathPlaceText: FRIEDRICH.deathPlaceText,
        historicalCountryId: austriaHungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${FRIEDRICH.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 ────────────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
        title: t.title,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision,
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: t.appointmentMethod,
        appointmentDetail: t.appointmentDetail,
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
      historicalCountryId: austriaHungary.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 오스트리아-헝가리 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note: '출생·복무 전 기간의 국가. 1918년 제국 해체 뒤에도 헝가리 영지에서 지내 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국 (출생·복무 1856~1918)')
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
        politics: FRIEDRICH_STATS.politics,
        military: FRIEDRICH_STATS.military,
        diplomacy: FRIEDRICH_STATS.diplomacy,
        intellect: FRIEDRICH_STATS.intellect,
        charisma: FRIEDRICH_STATS.charisma,
        administration: FRIEDRICH_STATS.administration,
        notes: FRIEDRICH_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${FRIEDRICH_STATS.politics}·군사 ${FRIEDRICH_STATS.military}·` +
        `외교 ${FRIEDRICH_STATS.diplomacy}·학식 ${FRIEDRICH_STATS.intellect}·` +
        `카리스마 ${FRIEDRICH_STATS.charisma}·행정 ${FRIEDRICH_STATS.administration}`,
    )
  }

  console.log('✅ 프리드리히 폰 외스터라이히-테셴 대공 시딩 완료\n')
}
