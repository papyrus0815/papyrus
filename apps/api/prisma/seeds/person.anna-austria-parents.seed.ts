/**
 * 안나 폰 외스터라이히(Anna of Austria, 1549~1580 — 펠리페 2세의 4번째 부인)의 부모 시드
 *
 *  - 아버지: 막시밀리안 2세 (Maximilian II, 1527~1576) — 신성로마황제 22대
 *  - 어머니: 마리아 데 에스파냐 (Maria of Spain, 1528~1603) — 카를 5세와 이사벨 데 포르투갈의 딸,
 *    펠리페 2세의 친누이
 *
 * 두 사람은 사촌(막시밀리안 2세는 페르디난트 1세의 아들 — 카를 5세의 동생, 마리아는 카를 5세의 딸)이며,
 * 1548년 결혼은 합스부르크 양가(스페인-오스트리아) 통합 사촌 결혼의 전형이었다. 그들의 딸 안나는
 * 외삼촌 펠리페 2세와 결혼해 펠리페 3세를 낳았으니, 합스부르크 근친혼 누적의 결정적 단계 중 하나다.
 *
 * 마리아 데 에스파냐의 부모(카를 5세·이사벨 데 포르투갈)는 이미 DB에 등록되어 있어,
 * 이번 시드에서는 마리아의 부모 연결만 추가한다.
 *
 * 또한 펠리페 3세 시드(person.felipe-iii.seed)에서 안나는 등록되었으나 그녀의 부모(이번 시드 대상)가
 * 미등록 상태라 안나의 fatherId/motherId가 비어 있었다. 이번 시드에서 안나의 부모 연결도 채운다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (막시밀리안 2세·마리아 데 에스파냐)
 *  - PersonStats x2
 *  - PersonSpouse x2 (양방향 결혼, 1548-09-13 ~ 1576-10-12 사별)
 *  - PersonCountryAffiliation x2 (막시밀리안 → 신성로마, 마리아 → 카스티야)
 *  - 부자/모자 관계:
 *      막시밀리안 + 마리아 → 안나 폰 외스터라이히 (이미 등록된 안나에 부모 연결)
 *      카를 5세 + 이사벨 데 포르투갈 → 마리아 데 에스파냐
 *  - SovereignReign x1 (막시밀리안 2세 — 신성로마황제 22대, 1564-07-25 ~ 1576-10-12)
 *
 * ⚠️ 의존: 카를 5세·펠리페 2세·펠리페 3세(안나) 시드가 먼저 실행되어
 *  합스부르크 가문·신성로마제국 HC·카스티야 왕국 HC·카를 5세·이사벨 데 포르투갈·안나 등이
 *  모두 등록되어 있어야 한다.
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 막시밀리안 2세 본문 ────────────────────────────────────────────────────
const MAXIMILIAN_II = {
  name: '막시밀리안',
  surname: '합스부르크',
  originalName: 'Maximilian II, Holy Roman Emperor',
  regnalName: '2세',
  birthYear: 1527,
  birthMonth: 7,
  birthDay: 31,
  deathYear: 1576,
  deathMonth: 10,
  deathDay: 12,
  birthPlaceText: '신성로마제국 오스트리아 빈 호프부르크 궁',
  deathPlaceText: '신성로마제국 바이에른 레겐스부르크',
  deathType: DeathType.ILLNESS,
  deathCause: '심부전 + 신장병',
  deathNote: '1576년 10월 12일 레겐스부르크에서 제국 의회 회기 중 향년 49세로 사망했다. 약 2년간 심장과 신장 질환이 점진적으로 악화되었고, 임종 시 가톨릭 종부 성사를 거부한 것으로 기록되어 있다(루터파에 우호적이었던 종교관 때문). 시신은 빈의 성 슈테판 대성당에 안치되어 21세기 현재까지 보존되고 있다.',
  biography:
    '합스부르크 가문 오스트리아 분지 출신의 신성로마제국 22대 황제(재위 1564~1576). 신성로마황제 페르디난트 1세(Ferdinand I, 1503~1564 — 카를 5세의 동생이자 오스트리아 합스부르크의 시조)와 안나 폰 뵈멘 운트 운가른(Anna of Bohemia and Hungary, 1503~1547)의 장남이다.\n\n' +
    '아버지 페르디난트 1세는 1556년 카를 5세의 양위로 신성로마황제 21대로 즉위해 약 8년 재위했다. 막시밀리안은 부친의 후계자로 양육되며 빈과 인스부르크에서 라틴어, 이탈리아어, 스페인어, 헝가리어, 체코어 등 여러 언어를 익혔다. 청년기에는 사촌 카를 5세의 궁정에서 약 4년간(1544~1548) 머물며 정치 경험을 쌓았다.\n\n' +
    '1548년 9월 13일 21세의 막시밀리안은 사촌 누이 마리아 데 에스파냐(Maria of Spain, 카를 5세와 이사벨 데 포르투갈의 딸)와 바야돌리드에서 결혼했다. 합스부르크 양가(스페인·오스트리아) 통합 사촌 결혼의 전형이었다. 결혼 직후 부부가 카스티야 섭정으로 임명되어 약 3년간(1548~1551) 카스티야를 통치했고, 1552년부터 1554년까지 다시 카스티야 섭정을 수행했다. 약 28년의 결혼 생활 동안 16명의 자녀를 두었으며, 그중 후계자 루돌프 2세(1552년생, 후일 신성로마황제 23대), 마티아스(1557년생, 후일 신성로마황제 24대), 안나(1549년생, 후일 펠리페 2세의 4번째 부인이자 펠리페 3세의 어머니), 알베르트(1559년생, 후일 합스부르크령 네덜란드 공동 군주) 등이 있었다.\n\n' +
    '1562년 보헤미아 왕, 1563년 헝가리 왕으로 즉위했고, 1564년 7월 25일 부친 페르디난트 1세가 사망하면서 신성로마황제로 즉위했다. 약 12년의 재위 동안 핵심 과제는 종교와 외교, 그리고 오스만 제국과의 대립이었다.\n\n' +
    '종교 정책에서 막시밀리안 2세는 합스부르크 가문 군주들 중 가장 관용적이었다. 본인은 명목상 가톨릭 신자였으나 루터파에 깊이 공감했고, 1568년 오스트리아 귀족과 도시에 루터파 신앙을 사실상 인정하는 양보를 했다. 임종 시 가톨릭 종부 성사를 거부한 일화도 이런 경향을 반영한다. 단 동시기 가톨릭과 프로테스탄트 사이의 결정적 결정을 보류함으로써 1618년 30년 전쟁의 폭발을 일시 지연시켰다는 양면 평가를 받는다.\n\n' +
    '오스만 제국과는 1566년 술레이만 1세의 헝가리 침공으로 시기게트바르 전투가 벌어졌고, 술레이만이 진중에서 사망하면서 오스만 측이 일시 후퇴했다. 1568년 아드리아노폴리스 평화 조약으로 헝가리 분할이 사실상 확정되었고, 약 8년간 합스부르크-오스만 평화가 유지되었다.\n\n' +
    '동생 페르디난트(티롤 대공)와 카를(인너오스트리아 대공)에게는 부친의 유언에 따라 영지를 분배했고, 막시밀리안 본인은 오스트리아 본국과 보헤미아, 헝가리를 통치했다. 이 분할은 후일 1665년 인너오스트리아 분지의 흡수 합병까지 약 100년의 합스부르크 오스트리아 분립의 출발점이 되었다.\n\n' +
    '문화적으로는 빈 호프부르크 궁의 르네상스 학예 후원으로 알려졌다. 동물원과 식물원을 운영하고 점성술사 등을 후원했으며, 후계자 루돌프 2세의 신비주의 학예 후원의 토대가 되었다.\n\n' +
    '1576년 10월 12일 레겐스부르크에서 제국 의회 회기 중 향년 49세로 사망했다. 후계자는 루돌프 2세였다. 막시밀리안 2세의 유산은 양면적이다. 종교 관용과 외교적 균형으로 30년 전쟁 폭발을 약 40년간 지연시켰으나, 합스부르크 양가 통합 사촌 결혼의 정점으로서 1700년 카를로스 2세의 신체 결함과 후사 단절의 누적 원인 중 하나가 되었다. 또한 그의 딸 안나가 외삼촌 펠리페 2세와 결혼함으로써 합스부르크 근친혼이 한층 심화되었다.',
  influence: 80,
  stats: {
    politics: 75,
    military: 60,
    diplomacy: 80,
    intellect: 80,
    charisma: 70,
    administration: 70,
    notes:
      '합스부르크 가문 군주들 중 가장 종교적으로 관용적이었던 황제. 외교와 학식이 강점이며 다언어 능력(라틴어·이탈리아어·스페인어·헝가리어·체코어)으로 합스부르크 양가 통합과 헝가리·보헤미아 통치에 기여. 1568년 아드리아노폴리스 조약으로 약 8년 오스만 평화 유지. 단 종교 결단을 미루는 신중함이 1618년 30년 전쟁의 폭발을 지연시켰지만 결정적 해결은 못했다. 카리스마는 동시기 평가가 우호적이었으나 광적 가톨릭 신자였던 사촌 펠리페 2세에 비해 정치적 지지 기반은 약했다. 49세 요절로 잠재력의 일부만 발휘.',
  },
} as const

// ── 마리아 데 에스파냐 본문 ────────────────────────────────────────────
const MARIA_SPAIN = {
  name: '마리아',
  surname: '합스부르크',
  originalName: 'Maria of Spain (Holy Roman Empress)',
  regnalName: undefined as string | undefined,
  birthYear: 1528,
  birthMonth: 6,
  birthDay: 21,
  deathYear: 1603,
  deathMonth: 2,
  deathDay: 26,
  birthPlaceText: '카스티야 왕국 마드리드 알카사르',
  deathPlaceText: '카스티야 왕국 마드리드 데스칼사스 레알레스 수녀원',
  deathType: DeathType.ILLNESS,
  deathCause: '노환',
  deathNote: '1603년 2월 26일 마드리드 데스칼사스 레알레스 수녀원에서 향년 74세로 자연사했다. 1581년 남편 막시밀리안 2세 사망 후 약 22년간 마드리드의 데스칼사스 레알레스 수녀원에서 가톨릭 신앙 생활에 전념했으며, 동생 펠리페 2세와 자주 만났다. 시신은 같은 수녀원에 안치되었다.',
  biography:
    '합스부르크 가문 출신의 신성로마황후(재위 1564~1576). 신성로마황제 카를 5세와 이사벨 데 포르투갈의 둘째 자녀이자 장녀로, 펠리페 2세의 친누이이다. 1528년 6월 21일 마드리드 알카사르에서 태어났다.\n\n' +
    '어머니 이사벨이 1539년 산욕열로 사망했을 때 마리아는 11세였다. 이복 형제와 같이 카스티야 궁정에서 양육되며 라틴어와 스페인어, 이탈리아어, 독일어 등 다언어 인문 교육을 받았다.\n\n' +
    '1548년 9월 13일 20세의 마리아는 사촌 막시밀리안 2세(부친 카를 5세의 동생 페르디난트 1세의 아들)와 바야돌리드에서 결혼했다. 합스부르크 양가 통합 사촌 결혼의 전형이었고, 결혼식은 카를 5세의 직접 주도로 거행되었다.\n\n' +
    '결혼 직후 부부가 카스티야 섭정으로 임명되어 약 3년간(1548~1551) 통치했고, 1552년부터 1554년까지 두 번째 섭정을 수행했다. 두 번째 섭정 시기인 1549년 11월 1일 시갈레스에서 딸 안나(우리 펠리페 3세의 어머니, 후일 펠리페 2세의 4번째 부인)를 출산했다. 1554년 동생 펠리페 2세가 잉글랜드 메리 1세와 결혼하기 위해 영국으로 떠나면서 마리아 부부의 카스티야 섭정도 종결되었다.\n\n' +
    '약 28년의 결혼 생활 동안 16명의 자녀를 두었으며, 그중 8명이 성인까지 생존했다. 후계자 루돌프 2세, 마티아스, 안나, 알베르트(후일 합스부르크령 네덜란드 공동 군주) 등이 있었다.\n\n' +
    '1576년 남편 막시밀리안 2세 사망 후 마리아는 1581년 동생 펠리페 2세의 초청으로 스페인으로 귀국했다. 마드리드의 데스칼사스 레알레스 수녀원(Convento de las Descalzas Reales)에 입주해 약 22년간 가톨릭 신앙 생활에 전념했고, 동생 펠리페 2세와 자주 만나며 그의 정치적 조언자 역할도 했다. 광적 가톨릭 신자였던 펠리페 2세와 비교적 종교적으로 관용적이었던 막시밀리안 2세 사이에서 평생 균형을 잡아온 마리아의 후일은 가톨릭 신앙으로 정리되었다.\n\n' +
    '마리아의 사후 영향은 결정적이다. 그녀의 딸 안나가 외삼촌 펠리페 2세와 결혼해 펠리페 3세를 낳았고, 아들 알베르트가 펠리페 2세의 딸 이사벨라 클라라 에우헤니아와 결혼해 합스부르크령 네덜란드를 공동 통치했다. 합스부르크 양가 통합의 결정적 매개자였으며, 동시에 1700년 카를로스 2세의 신체 결함과 후사 단절을 가져온 합스부르크 근친혼 누적의 한 단계였다.',
  influence: 60,
  stats: {
    politics: 65,
    military: 20,
    diplomacy: 75,
    intellect: 80,
    charisma: 70,
    administration: 60,
    notes:
      '약 6년간 두 차례 카스티야 섭정을 수행하며 행정 경험을 쌓았다. 16명의 자녀를 두어 합스부르크 양가 통합의 결정적 매개자가 되었으며, 광적 가톨릭 신자였던 동생 펠리페 2세와 비교적 종교 관용적이었던 남편 막시밀리안 2세 사이에서 평생 균형을 유지했다. 학식은 어머니 이사벨 데 포르투갈의 직접 교육과 카를 5세 궁정의 인문 교육으로 우수. 외교는 합스부르크 양가의 결혼 외교에서 중심 역할. 만년 약 22년간 데스칼사스 레알레스 수녀원에서 신앙 생활.',
  },
} as const

export async function seedAnnaAustriaParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 안나 폰 외스터라이히 부모(막시밀리안 2세 + 마리아 데 에스파냐) 시딩 시작...')

  // ── 사전 의존성 ────────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀')
    return
  }

  const habsburgDynasty = await prisma.dynasty.findFirst({
    where: { name: '합스부르크 가문' },
    select: { id: true },
  })
  if (!habsburgDynasty) {
    console.warn('  ⚠️  합스부르크 가문 미존재')
    return
  }

  const hreHC = await prisma.historicalCountry.findFirst({
    where: { name: '신성로마제국' },
    select: { id: true },
  })
  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })
  if (!hreHC || !castileHC) {
    console.warn('  ⚠️  신성로마제국/카스티야 HC 미존재')
    return
  }

  const anna = await prisma.person.findFirst({
    where: { originalName: 'Anna of Austria (Queen of Spain, 1549-1580)' },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!anna) {
    console.warn('  ⚠️  안나 폰 외스터라이히 미존재 — 먼저 person.felipe-iii.seed 실행 필요')
    return
  }

  const charlesV = await prisma.person.findFirst({
    where: { originalName: 'Charles V, Holy Roman Emperor' },
    select: { id: true },
  })
  const isabelPortugal = await prisma.person.findFirst({
    where: { originalName: 'Isabella of Portugal (Empress)' },
    select: { id: true },
  })
  if (!charlesV || !isabelPortugal) {
    console.warn('  ⚠️  카를 5세 또는 이사벨 데 포르투갈 미존재')
    return
  }

  const hrePos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '신성로마황제' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof MAXIMILIAN_II | typeof MARIA_SPAIN,
    gender: 'MALE' | 'FEMALE',
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({
      where: { originalName: spec.originalName },
    })
    if (existing) {
      console.log(`  ⏭️  인물 이미 존재 — 스킵: ${spec.originalName} (id=${existing.id})`)
      const patch: any = {}
      if (!existing.dynastyId) patch.dynastyId = habsburgDynasty.id
      if (!existing.deathType) patch.deathType = spec.deathType
      if (!existing.deathCause) patch.deathCause = spec.deathCause
      if (!existing.deathNote) patch.deathNote = spec.deathNote
      if (!existing.biography) patch.biography = spec.biography
      if (!existing.birthPlaceText) patch.birthPlaceText = spec.birthPlaceText
      if (!existing.deathPlaceText) patch.deathPlaceText = spec.deathPlaceText
      if (existing.influence == null) patch.influence = spec.influence
      if (Object.keys(patch).length > 0) {
        await prisma.person.update({ where: { id: existing.id }, data: patch })
        console.log(`    🔧 필드 보강: ${Object.keys(patch).join(', ')}`)
      }
      return existing.id
    }
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
        gender,
        nameDisplayOrder: 'western' as any,
        dynastyId: habsburgDynasty.id,
        birthPlaceText: spec.birthPlaceText,
        deathPlaceText: spec.deathPlaceText,
        deathType: spec.deathType,
        deathCause: spec.deathCause,
        deathNote: spec.deathNote,
        influence: spec.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${spec.originalName} (id=${created.id})`)
    return created.id
  }

  // ── 1) 막시밀리안 2세·마리아 데 에스파냐 등록 ──────────────────────────
  const maxId = await createOrFindPerson(MAXIMILIAN_II, 'MALE')
  const mariaId = await createOrFindPerson(MARIA_SPAIN, 'FEMALE')

  // ── 2) PersonStats x2 ──────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [maxId, MAXIMILIAN_II, '막시밀리안 2세'],
    [mariaId, MARIA_SPAIN, '마리아 데 에스파냐'],
  ] as const) {
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`    ⏭️  ${label} 능력치 스킵 (이미 존재)`)
      continue
    }
    await prisma.personStats.create({
      data: {
        personId: pid,
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
    console.log(
      `    ✅ ${label} 능력치: 정치 ${spec.stats.politics}·군사 ${spec.stats.military}·` +
        `외교 ${spec.stats.diplomacy}·학식 ${spec.stats.intellect}·카리스마 ${spec.stats.charisma}·` +
        `행정 ${spec.stats.administration}`,
    )
  }

  // ── 3) PersonCountryAffiliation ─────────────────────────────────────
  for (const [pid, hcId, label, hcLabel] of [
    [maxId, hreHC.id, '막시밀리안 2세', '신성로마제국'],
    [mariaId, castileHC.id, '마리아 데 에스파냐', '카스티야 왕국'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: hcId,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${label} → ${hcLabel}`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: hcId,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → ${hcLabel} (CITIZENSHIP)`)
  }

  // ── 4) 결혼 관계 (양방향) ─────────────────────────────────────────────
  const mStart = new Date(1548, 8, 13) // 1548-09-13 바야돌리드
  const mEnd = new Date(1576, 9, 12) // 1576-10-12 막시밀리안 2세 사망
  const mNote =
    '1548년 9월 13일 카스티야 바야돌리드에서 결혼. 막시밀리안 2세 21세, 마리아 20세. 두 사람은 사촌(막시밀리안 부친 페르디난트 1세는 카를 5세의 동생, 마리아의 부친 카를 5세) 관계로, 합스부르크 양가(스페인·오스트리아) 통합 사촌 결혼의 전형이었다. 결혼 직후 부부가 카스티야 섭정으로 임명되어 약 3년간(1548~1551) 통치했고, 1552년부터 1554년까지 두 번째 섭정을 수행했다. 약 28년 결혼 생활 동안 16명의 자녀를 두었으며, 그중 8명이 성인까지 생존했다. 후일 신성로마황제 23대 루돌프 2세, 24대 마티아스, 펠리페 2세의 4번째 부인 안나(우리의 안나 폰 외스터라이히), 합스부르크령 네덜란드 공동 군주 알베르트가 이 부부의 자녀들이다. 1576년 10월 12일 막시밀리안 2세의 레겐스부르크 사망으로 결혼 종결. 마리아는 1581년 마드리드로 귀국해 데스칼사스 레알레스 수녀원에서 약 22년간 신앙 생활.'

  for (const [aId, bId, label] of [
    [maxId, mariaId, '막시밀리안 2세 → 마리아'],
    [mariaId, maxId, '마리아 → 막시밀리안 2세'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  ⏭️  결혼 스킵: ${label}`)
      continue
    }
    await prisma.personSpouse.create({
      data: {
        personId: aId,
        spouseId: bId,
        marriageStartDate: mStart,
        marriageEndDate: mEnd,
        note: mNote,
      },
    })
    console.log(`  ✅ 결혼: ${label} (1548-09-13 ~ 1576-10-12 사별)`)
  }

  // ── 5) 부자/모자 관계 ─────────────────────────────────────────────────
  // (a) 막시밀리안 + 마리아 → 안나
  if (anna.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 안나 fatherId=${anna.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: anna.id },
      data: { fatherId: maxId },
    })
    console.log(`  ✅ 부자: 막시밀리안 2세 → 안나 폰 외스터라이히`)
  }
  if (anna.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 안나 motherId=${anna.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: anna.id },
      data: { motherId: mariaId },
    })
    console.log(`  ✅ 모자: 마리아 데 에스파냐 → 안나 폰 외스터라이히`)
  }

  // (b) 카를 5세 + 이사벨 데 포르투갈 → 마리아 데 에스파냐
  const mariaRecord = await prisma.person.findFirst({
    where: { id: mariaId },
    select: { fatherId: true, motherId: true },
  })
  if (mariaRecord?.fatherId) {
    console.log(`  ⏭️  부자 스킵 (이미 연결): 마리아 fatherId=${mariaRecord.fatherId}`)
  } else {
    await prisma.person.update({
      where: { id: mariaId },
      data: { fatherId: charlesV.id },
    })
    console.log(`  ✅ 부자: 카를 5세 → 마리아 데 에스파냐`)
  }
  if (mariaRecord?.motherId) {
    console.log(`  ⏭️  모자 스킵 (이미 연결): 마리아 motherId=${mariaRecord.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: mariaId },
      data: { motherId: isabelPortugal.id },
    })
    console.log(`  ✅ 모자: 이사벨 데 포르투갈 → 마리아 데 에스파냐`)
  }

  // ── 6) SovereignReign — 신성로마제국 22대 막시밀리안 2세 ───────────────
  // HRE start=962 오토 1세부터: ... 19대 막시밀리안 1세 → 20대 카를 5세 →
  // 21대 페르디난트 1세(미등록) → 22대 막시밀리안 2세
  if (hrePos) {
    const r = {
      historicalCountryId: hreHC.id,
      regnalNumber: 22,
      regnalName: '막시밀리안 2세',
      startDate: new Date(1564, 6, 25), // 1564-07-25 부친 페르디난트 1세 사망
      endDate: new Date(1576, 9, 12), // 1576-10-12 본인 사망
      appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
      endReason: TenureEndReason.DEATH_IN_OFFICE,
      endReasonDetail: '1576년 10월 12일 레겐스부르크에서 제국 의회 회기 중 향년 49세 사망 (심부전·신장병).',
      notes:
        '1562년 보헤미아 왕, 1563년 헝가리 왕으로 즉위 후 1564년 7월 25일 부친 페르디난트 1세(21대, 1556~1564 재위) 사망으로 신성로마황제 즉위. 약 12년 재위. 합스부르크 가문 군주 중 가장 종교 관용적이었으며 1568년 오스트리아 귀족·도시에 루터파 신앙 사실상 인정. 1568년 아드리아노폴리스 평화 조약으로 약 8년 합스부르크-오스만 평화. 단 30년 전쟁 폭발은 약 40년 지연시켰을 뿐. 1576년 사망으로 후계자 루돌프 2세 즉위.',
    }
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: maxId, historicalCountryId: r.historicalCountryId },
    })
    if (existingByPerson) {
      const needsUpdate =
        existingByPerson.regnalNumber !== r.regnalNumber ||
        existingByPerson.regnalName !== r.regnalName
      if (needsUpdate) {
        await prisma.sovereignReign.update({
          where: { id: existingByPerson.id },
          data: { regnalNumber: r.regnalNumber, regnalName: r.regnalName },
        })
        console.log(`  🔧 재임 정정: 신성로마제국 ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 정확): 신성로마제국 ${r.regnalName} ${r.regnalNumber}대`)
      }
    } else {
      const slotConflict = await prisma.sovereignReign.findFirst({
        where: {
          historicalCountryId: r.historicalCountryId,
          regnalNumber: r.regnalNumber,
        },
      })
      if (slotConflict) {
        console.warn(`  ⚠️  재임 충돌: 신성로마제국 ${r.regnalNumber}대 — 다른 인물 점유 (skip)`)
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId: maxId,
            historicalCountryId: r.historicalCountryId,
            positionDefinitionId: hrePos.id,
            regnalNumber: r.regnalNumber,
            regnalName: r.regnalName,
            startDate: r.startDate,
            endDate: r.endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            endReasonDetail: r.endReasonDetail,
            notes: r.notes,
            accountId: admin.id,
          },
        })
        console.log(
          `  ✅ 재임: 신성로마제국 ${r.regnalName} ${r.regnalNumber}대 (1564-07-25 ~ 1576-10-12)`,
        )
      }
    }
  } else {
    console.warn('  ⚠️  관직 정의 \'신성로마황제\' 미존재 — 재임 스킵')
  }

  console.log(`✅ 안나 폰 외스터라이히 부모 시딩 완료\n`)
}
