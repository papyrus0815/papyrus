/**
 * 알로이스 렉사 폰 에렌탈 (Alois Lexa von Aehrenthal, 1854~1912) 인물 시드
 *
 * ⚠️ UI 스텁 행 보강 전용 — 사용자가 이미 이름·생몰일·사망 원인(백혈병)·인물 사진·역사국가
 *    소속까지 상세히 등록해 둔 행이다. biography·influence·출생지·사망지 등 **비어 있는
 *    필드만** 채우고, 이미 채워진 birthNote·deathNote·deathType·deathCause·countryId 등은
 *    절대 덮어쓰지 않는다(사용자 편집 보호). 재임·소속·연보·능력치는 신규 추가.
 *
 * 오스트리아-헝가리 외무장관(1906~1912, 재임 중 사망). 1908년 보스니아-헤르체고비나 병합을
 * 러시아 외무장관 이즈볼스키와의 밀약으로 성사시켰으나 러시아가 "배신당했다"고 여기며
 * 국제 위기로 번졌다(보스니아 위기). 콘라트 폰 회첸도르프의 대이탈리아·대세르비아 예방전쟁
 * 요구를 시종 막아선 평화 노선의 보루였고, 1911년 그 대립으로 콘라트를 해임시켰다. 백혈병
 * 투병 끝에 재임 중 사망했고, 후임(베르히톨트) 인선까지 마친 상태였다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)이라 구력 병기가 필요 없다(콘라트 선례).
 *
 * 관직 매핑: 외무장관은 카탈로그의 보편 칭호 '외무장관'(CABINET_MINISTER)을 그대로 쓴다 —
 * 베르히톨트·사조노프 등 이 시리즈 동일 규약. 이 정의 연결 덕에 후임 베르히톨트(외무장관
 * 1912-02-17~)와 승계 박스(같은 국가·같은 title)로 자동으로 이어진다. 외교관 재임은
 * DIPLOMATIC_POST 카탈로그(대사·특명전권공사)를 재사용한다.
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC, 이미 Person에 연결됨) +
 *       관직 정의(외무장관·대사·특명전권공사).
 *
 * 등록 항목:
 *  - Person 필드 보강 (biography·influence·birthPlaceText·deathPlaceText만)
 *  - GovernmentPositionTenure x3 (주루마니아 특명전권공사·주러시아 대사·외무장관) — 신규
 *    생성이라 appointmentDetail을 create에 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonLifeEvent x17 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 (보강용 — 이미 채워진 필드는 아래서 건드리지 않는다) ────────────
const AEHRENTHAL = {
  originalName: 'Alois Leopold Johann Baptist Graf Lexa von Aehrenthal',
  birthPlaceText: '오스트리아 제국 보헤미아 그로스 스칼(현 체코 흐루바스칼라) 성',
  deathPlaceText: '오스트리아-헝가리 빈',
  influence: 74,
  biography:
    '오스트리아-헝가리 외무장관(1906~1912, 재임 중 사망). 1908년 보스니아-헤르체고비나 ' +
    '병합을 러시아 외무장관 이즈볼스키와의 밀약으로 성사시켰으나 러시아가 "배신당했다"고 ' +
    '여기며 국제 위기로 번졌다(보스니아 위기). 콘라트 폰 회첸도르프의 대이탈리아·대세르비아 ' +
    '예방전쟁 요구를 시종 막아선 평화 노선의 보루였고, 1911년 그 대립으로 결국 콘라트를 ' +
    '해임시켰다. 백혈병 투병 끝에 재임 중 사망했고, 병세가 악화되던 무렵 이미 후임(베르히톨트) ' +
    '인선까지 마친 상태였다. ' +
    '\n\n' +
    '외교관 경력(1854~1906). 보헤미아의 신흥 귀족 가문에서 태어나 본 대학과 프라하 카를 ' +
    '대학에서 법학·정치학을 공부했다. 1877년 파리 대사관 수습(보이스트 백작 아래), 1878년 ' +
    '상트페테르부르크 수습을 거쳐 1883~1888년 빈 외무부에서 칼노키 백작을 보좌했다. 1888년 ' +
    '상트페테르부르크 대사관 참사관으로 러시아 외교의 실무를 익혔고, 1895년 주루마니아 ' +
    '특명전권공사로 부쿠레슈티에 부임해 1883년 체결된 비밀동맹을 갱신했다. 1899년 주러시아 ' +
    '대사로 상트페테르부르크에 복귀해 1903년 뮈르츠슈테크 협정 체결에 주도적 역할을 했다. ' +
    '\n\n' +
    '외무장관 취임과 보스니아 위기(1906~1909). 1906-10-24 외무장관에 임명돼 취임 직후 ' +
    '외교관 임용시험을 개혁하고 주요 영사관에 통상고문관을 두는 등 행정 정비에 나섰다. ' +
    '애초 러시아와의 우호적 타협을 모색했으나, 1908-09-15~16 이즈볼스키와 은밀히 협상해 ' +
    '"러시아의 양해 아래 보스니아-헤르체고비나를 완전히 병합한다"는 밀약을 맺고 10-06 ' +
    '병합을 전격 선언했다 — 다르다넬스 해협 통항권을 얻으려던 러시아의 기대는 무산됐고, ' +
    '러시아는 배신감 속에 전쟁 직전까지 갔다(보스니아 위기). 이후 러시아와의 우호 노선은 ' +
    '사실상 접었다. ' +
    '\n\n' +
    '콘라트와의 대립·만년(1909~1912). 참모총장 콘라트 폰 회첸도르프가 거듭 요구한 대이탈리아· ' +
    '대세르비아 예방전쟁론에 시종 반대하며 문민 통제를 지켰고, 1911-11-15 프란츠 요제프의 ' +
    '질책과 함께 콘라트를 해임시키는 데 결정적 역할을 했다. 백혈병으로 병세가 악화되는 ' +
    '와중에도 직무를 놓지 않다가 1912-02-17 재임 중 빈에서 사망했다 — 사망 무렵에는 이미 ' +
    '후임 베르히톨트의 인선을 사실상 마친 상태였다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  definitionTitle?: string
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
    title: '주루마니아 특명전권공사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '특명전권공사',
    startYear: 1895,
    endYear: 1899,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '주러시아 대사로 영전.',
    appointmentDetail:
      '1888년부터 맡았던 상트페테르부르크 대사관 참사관 경력을 발판으로 1895년 부쿠레슈티에 ' +
      '특명전권공사로 부임했다.',
    notes: '1883년 체결된 오스트리아-헝가리-루마니아 비밀동맹을 갱신했다.',
  },
  {
    title: '주러시아 대사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '대사',
    startYear: 1899,
    endYear: 1906, endMonth: 10, endDay: 24,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '외무장관으로 발탁되어 빈으로 복귀.',
    appointmentDetail: '루마니아 공사 임기를 마치고 1899년 상트페테르부르크 대사로 복귀했다.',
    notes:
      '1903년 뮈르츠슈테크 협정(발칸 개혁을 위한 오스트리아-러시아 협조) 체결에 주도적 역할을 ' +
      '했다 — 이 시기의 대러 협조 노선이 훗날 외무장관으로서의 초기 정책과 이어진다.',
  },
  {
    title: '외무장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '외무장관',
    startYear: 1906, startMonth: 10, startDay: 24,
    endYear: 1912, endMonth: 2, endDay: 17,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail:
      '백혈병 투병 끝에 1912-02-17 빈에서 재임 중 사망했다. 병세 악화 무렵 이미 후임 ' +
      '베르히톨트의 인선을 사실상 마친 상태였다.',
    appointmentDetail:
      '주러시아 대사로서 쌓은 외교 경력을 인정받아 1906-10-24 프란츠 요제프 1세에 의해 ' +
      '외무장관으로 임명되었다.',
    notes:
      '1908 보스니아-헤르체고비나 병합(이즈볼스키와의 밀약 → 보스니아 위기), 1911 콘라트 폰 ' +
      '회첸도르프의 예방전쟁론과의 대립 끝 콘라트 해임 관철 등이 이 임기의 핵심이다.',
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
    title: '보헤미아 그로스 스칼 성 출생',
    category: 'FAMILY',
    startYear: 1854, startMonth: 9, startDay: 27,
    description:
      '대지주 정당 "입헌충성대지주당"을 이끈 남작 요한 렉사 폰 에렌탈의 차남으로 출생. ' +
      '어머니는 마리 폰 툰-호엔슈타인 백작부인.',
  },
  {
    title: '본 대학·프라하 카를 대학 수학',
    category: 'EDUCATION',
    startYear: 1873, endYear: 1877,
    description: '법학과 정치학을 공부했다.',
  },
  {
    title: '외교관 입직 — 파리 대사관 수습',
    category: 'CAREER',
    startYear: 1877,
    description: '프리드리히 페르디난트 폰 보이스트 백작 아래 파리 대사관 수습으로 외교관 경력을 시작했다.',
  },
  {
    title: '상트페테르부르크 수습·빈 외무부 근무',
    category: 'CAREER',
    startYear: 1878, endYear: 1888,
    description: '1878년 상트페테르부르크 수습을 거쳐 1883~1888년 빈 외무부에서 칼노키 백작을 보좌했다.',
  },
  {
    title: '상트페테르부르크 대사관 참사관',
    category: 'DIPLOMATIC',
    startYear: 1888,
    endYear: 1895,
    description: '러시아 외교 실무를 익힌 시기.',
  },
  {
    title: '주루마니아 특명전권공사 부임',
    category: 'DIPLOMATIC',
    startYear: 1895,
    description: '부쿠레슈티에 부임해 오스트리아-헝가리-루마니아 비밀동맹을 갱신했다.',
  },
  {
    title: '주러시아 대사 부임',
    category: 'DIPLOMATIC',
    startYear: 1899,
    description: '상트페테르부르크 대사로 복귀했다.',
  },
  {
    title: '파울리네 세체니와 결혼',
    category: 'FAMILY',
    startYear: 1902,
    description: '샤르바르-펠셰비데크의 세체니 백작가 파울리네(1871~1945)와 혼인, 세 자녀를 두었다.',
  },
  {
    title: '뮈르츠슈테크 협정 체결',
    category: 'DIPLOMATIC',
    startYear: 1903,
    description: '발칸 개혁을 위한 오스트리아-러시아 협조 체제 구축에 주도적 역할을 했다.',
  },
  {
    title: '외무장관 취임',
    category: 'POLITICAL',
    startYear: 1906, startMonth: 10, startDay: 24,
    description:
      '프란츠 요제프 1세에 의해 외무장관으로 임명됐다. 취임 직후 외교관 임용시험을 개혁하고 ' +
      '주요 영사관에 통상고문관을 두는 등 행정을 정비했다.',
  },
  {
    title: '이즈볼스키와의 밀약',
    category: 'DIPLOMATIC',
    startYear: 1908, startMonth: 9, startDay: 15, endMonth: 9, endDay: 16,
    description:
      '러시아 외무장관 이즈볼스키와 은밀히 협상해 "러시아의 양해 아래 보스니아-헤르체고비나를 ' +
      '완전히 병합한다"는 밀약을 맺었다.',
  },
  {
    title: '보스니아-헤르체고비나 병합 선언 — 보스니아 위기',
    category: 'DIPLOMATIC',
    startYear: 1908, startMonth: 10, startDay: 6,
    description:
      '병합을 전격 선언하자 다르다넬스 해협 통항권을 기대했던 러시아가 배신감 속에 전쟁 ' +
      '직전까지 갔다. 이후 대러 우호 노선은 사실상 끝났다.',
  },
  {
    title: '콘라트의 예방전쟁론과 대립',
    category: 'POLITICAL',
    startYear: 1909, endYear: 1911,
    description:
      '참모총장 콘라트 폰 회첸도르프가 거듭 요구한 대이탈리아·대세르비아 예방전쟁론에 시종 ' +
      '반대하며 문민 통제를 지켰다.',
  },
  {
    title: '콘라트 해임 관철',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 11, startDay: 15,
    description:
      '프란츠 요제프 1세의 질책과 함께 콘라트를 참모총장에서 물러나게 하는 데 결정적 역할을 ' +
      '했다.',
  },
  {
    title: '백혈병 투병',
    category: 'HEALTH',
    startYear: 1911, endYear: 1912, endMonth: 2, endDay: 17,
    description: '병세가 악화되는 와중에도 직무를 놓지 않고 후임 인선을 준비했다.',
  },
  {
    title: '재임 중 사망',
    category: 'HEALTH',
    startYear: 1912, startMonth: 2, startDay: 17,
    description:
      '빈에서 백혈병으로 사망(향년 57세). 이미 사실상 인선을 마쳐뒀던 레오폴트 베르히톨트가 ' +
      '뒤를 이었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const AEHRENTHAL_STATS = {
  politics: 72,
  military: 10,
  diplomacy: 85,
  intellect: 76,
  charisma: 55,
  administration: 65,
  notes:
    '뮈르츠슈테크 협정부터 보스니아 병합까지, 밀약과 기습 선언을 능란하게 구사한 외교 수완이 ' +
    '이 시리즈 최고 수준이다 — 다만 그 수완이 러시아와의 관계를 돌이킬 수 없이 틀어뜨려 훗날 ' +
    '1914년 위기의 원경을 만들었다는 점에서 양날의 검이었다. 정치는 콘라트의 예방전쟁론을 ' +
    '거듭 막아내고 끝내 해임시킨 문민 통제력에서 높이 평가한다. 학식은 30년 외교관 경력의 ' +
    '축적을 반영했다. 카리스마는 동시대인들이 "완고한 오만과 해체적 책모"(당대 평)로 ' +
    '묘사한 만큼 대중적 호감보다 상대를 압도하는 유형에 가까워 중간권에 그친다. 군사는 순수 ' +
    '문민 외교관 경력이라 최저권.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedAehrenthal(prisma: PrismaService): Promise<void> {
  console.log('\n🕊️ 알로이스 렉사 폰 에렌탈(Aehrenthal) 시딩 시작 (UI 스텁 행 보강 전용)...')

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

  // ── 1) 인물 보강 (UI 스텁 전용 — 비어 있는 필드만) ──────────────────────────
  const person = await prisma.person.findFirst({
    where: { originalName: AEHRENTHAL.originalName },
  })
  if (!person) {
    console.warn(
      '  ⚠️  UI 스텁 인물이 없음 — 이 시드는 기존 행 보강 전용이라 신규 생성하지 않는다. ' +
        `먼저 어드민에서 "${AEHRENTHAL.originalName}" 인물을 등록해야 한다. 시딩 중단.`,
    )
    return
  }
  const personId = person.id
  const patch: Record<string, unknown> = {}
  if (!person.biography) patch.biography = AEHRENTHAL.biography
  if (person.influence == null) patch.influence = AEHRENTHAL.influence
  if (!person.birthPlaceText) patch.birthPlaceText = AEHRENTHAL.birthPlaceText
  if (!person.deathPlaceText) patch.deathPlaceText = AEHRENTHAL.deathPlaceText
  if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
  if (Object.keys(patch).length > 0) {
    await prisma.person.update({ where: { id: personId }, data: patch })
    console.log(`  🔧 보강: ${AEHRENTHAL.originalName} (${Object.keys(patch).join(', ')})`)
  } else {
    console.log(`  ⏭️  인물 필드 이미 충분히 채워짐: ${AEHRENTHAL.originalName}`)
  }

  // ── 2) 재임 ────────────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const def = t.definitionTitle
      ? await prisma.governmentPositionDefinition.findFirst({
          where: { title: t.definitionTitle, positionType: t.positionType },
          select: { id: true },
        })
      : null

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
      if (!existing.positionDefinitionId && def?.id) {
        await prisma.governmentPositionTenure.update({
          where: { id: existing.id },
          data: { positionDefinitionId: def.id },
        })
        console.log(`  🔧 관직 정의 보강: ${t.title} → ${t.definitionTitle}`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      }
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionDefinitionId: def?.id ?? undefined,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision,
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
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
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국')
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
        politics: AEHRENTHAL_STATS.politics,
        military: AEHRENTHAL_STATS.military,
        diplomacy: AEHRENTHAL_STATS.diplomacy,
        intellect: AEHRENTHAL_STATS.intellect,
        charisma: AEHRENTHAL_STATS.charisma,
        administration: AEHRENTHAL_STATS.administration,
        notes: AEHRENTHAL_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${AEHRENTHAL_STATS.politics}·군사 ${AEHRENTHAL_STATS.military}·` +
        `외교 ${AEHRENTHAL_STATS.diplomacy}·학식 ${AEHRENTHAL_STATS.intellect}·` +
        `카리스마 ${AEHRENTHAL_STATS.charisma}·행정 ${AEHRENTHAL_STATS.administration}`,
    )
  }

  console.log('✅ 알로이스 렉사 폰 에렌탈 시딩 완료\n')
}
