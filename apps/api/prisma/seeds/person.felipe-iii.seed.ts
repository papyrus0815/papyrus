/**
 * 펠리페 3세 (Felipe III / Philip III of Spain, 1578~1621) 시드
 *
 *  - 본인: 펠리페 3세 — 합스부르크 가문, 스페인 합스부르크 3대 군주
 *  - 어머니: 안나 폰 외스터라이히 (Anna of Austria, 1549~1580) — 펠리페 2세의 4번째 부인이자 친조카
 *
 * 펠리페 2세는 1570년 친누이 마리아 데 에스파냐의 딸 안나(자기 조카)와 결혼해 5명의 자녀를
 * 두었으나 펠리페만 성인까지 생존했다. 안나는 1580년 출산 합병증과 인플루엔자로 31세에 사망했다.
 *
 * 펠리페 3세의 재위(1598~1621)는 합스부르크 스페인의 평화 시대로, 1604년 런던 조약(잉글랜드와 평화),
 * 1609년 네덜란드 12년 휴전, 1609년 모리스코 추방, 1618년 30년 전쟁 발발 등이 주요 사건이다.
 * 별칭은 "경건왕(el Piadoso)" 또는 "평화왕(el Pacífico)"이며, 측근 레르마 공작에게 사실상 권력을
 * 위임한 발리도(valido) 정치 시대를 열었다.
 *
 * ⚠️ 기존 데이터 보존 모드.
 *
 * 등록 항목:
 *  - Person x2 (펠리페 3세·안나 폰 외스터라이히)
 *  - PersonStats x2
 *  - PersonSpouse x2 (펠리페 2세 ↔ 안나, 1570-05-04 ~ 1580-10-26 사별)
 *  - PersonCountryAffiliation x2 (펠리페 3세 → 카스티야, 안나 → 카스티야)
 *  - 부자/모자 관계: 펠리페 2세 + 안나 → 펠리페 3세
 *  - SovereignReign x2:
 *      (1) 카스티야 왕국 17대 펠리페 3세 (1598-09-13 ~ 1621-03-31, DEATH_IN_OFFICE)
 *      (2) 포르투갈 왕국 22대 펠리페 2세 (1598-09-13 ~ 1621-03-31, DEATH_IN_OFFICE)
 *
 * 참고: 아라곤 22·23대(카를 5세·펠리페 2세 of Spain)가 미등록 상태이므로, 이번 시드에서는
 * 아라곤 24대 펠리페 2세 재임은 라인 공백을 피하기 위해 등록하지 않고 notes에만 언급한다.
 *
 * ⚠️ 의존: person.felipe-ii.seed (펠리페 2세 등록), person.charles-v.seed (합스부르크 가문),
 *  person.charles-v-parents.seed (카스티야·아라곤 HC).
 */
import {
  AppointmentMethod,
  DeathType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 펠리페 3세 본문 ────────────────────────────────────────────────────────
const FELIPE_III = {
  name: '펠리페',
  surname: '합스부르크',
  originalName: 'Philip III of Spain',
  regnalName: '3세',
  birthYear: 1578,
  birthMonth: 4,
  birthDay: 14,
  deathYear: 1621,
  deathMonth: 3,
  deathDay: 31,
  birthPlaceText: '카스티야 왕국 마드리드 알카사르',
  deathPlaceText: '카스티야 왕국 마드리드 알카사르',
  deathType: DeathType.ILLNESS,
  deathCause: '발열성 질환 (단독 또는 류머티즘성 발열 추정)',
  deathNote: '1621년 3월 31일 마드리드 알카사르에서 향년 42세로 사망했다. 약 일주일간의 발열과 신체 쇠약 끝에 사망했으며, 동시기 진단으로는 단독(丹毒, erysipelas) 또는 류머티즘성 발열로 기록되었다. 시신은 부친 펠리페 2세가 건립한 엘 에스코리알 왕립 수도원의 왕들의 판테온에 안치되어 21세기 현재까지 보존되어 있다. 사망 시 후계자 펠리페 4세는 만 16세였다.',
  biography:
    '합스부르크 가문 출신의 스페인 합스부르크 3대 군주. 펠리페 2세와 그의 4번째 부인 안나 폰 외스터라이히의 적장자이자 다섯 자녀 중 유일하게 성인까지 생존한 아들이다. 별칭은 "경건왕(el Piadoso)" 또는 "평화왕(el Pacífico)"이다.\n\n' +
    '재위는 카스티야와 아라곤, 이탈리아 영지(나폴리, 시칠리아, 사르데냐, 밀라노), 신대륙 식민지(1598~1621)와 포르투갈(1598~1621, 펠리페 2세로 즉위 — 이베리아 연합)을 포괄했다. 합스부르크령 네덜란드의 충성 부분(현 벨기에)은 1598년 부친의 유언에 따라 누이 이사벨라 클라라 에우헤니아와 그녀의 남편 알베르트 대공에게 사실상 주권 영지로 양위되어, 펠리페 3세의 직접 통치 영역에서 분리되었다.\n\n' +
    '부친 펠리페 2세가 약 53일간의 임종을 거쳐 1598년 9월 13일 사망하면서 만 20세에 즉위했다. 1599년 4월 18일 사촌 마르가레테 폰 외스터라이히(Margarete von Österreich, Inner Austria 분지)와 결혼해 약 22년의 결혼 생활 동안 8명의 자녀를 두었다. 후계자 펠리페 4세(1605년생) 외에 후일 프랑스 왕비가 된 안 도트리슈(Anne of Austria, 1601년생)와 신성로마황후가 된 마리아 안나(1606년생) 등이 있었다.\n\n' +
    '펠리페 3세의 재위는 합스부르크 스페인의 평화 시대로 평가된다. 1604년 8월 28일 런던 조약으로 약 19년의 영-스페인 전쟁이 종결되었고, 1609년 4월 9일 네덜란드 공화국과 12년 휴전이 체결되었다. 단 같은 해 9월 모리스코(가톨릭으로 개종한 무슬림) 약 30만 명을 추방하는 인구 정책으로 발렌시아·아라곤 농업이 결정적 타격을 입었다.\n\n' +
    '내정의 핵심 특징은 발리도(valido) 정치였다. 펠리페 3세는 측근 레르마 공작 프란시스코 고메스 데 산도발(Francisco Gómez de Sandoval, Duke of Lerma)에게 사실상 모든 권력을 위임했다. 레르마 공작은 약 20년간(1598~1618) 사실상 스페인을 통치했으며, 1601년부터 1606년까지 수도를 마드리드에서 바야돌리드로 일시 천도하는 등 자기 가문 이익을 위해 정책을 운영했다. 1618년 부패 의혹으로 실각·추기경 위촉을 받았으며, 후임으로 그의 아들 우세다 공작이 발리도를 계승했다.\n\n' +
    '국제 정세에서는 1618년 5월 23일 보헤미아 프라하 창문 투척 사건으로 30년 전쟁이 발발했다. 펠리페 3세는 사촌인 신성로마황제 페르디난트 2세를 군사적으로 후원했고, 합스부르크 가문 양가(스페인·오스트리아)의 통합 전선을 다시 구축했다. 그러나 1621년 3월 본인 사망 직전 12년 휴전 만기를 앞두고 네덜란드와의 전쟁 재개를 결정한 것이 후계자 펠리페 4세 시대의 결정적 부담이 되었다.\n\n' +
    '경제적으로는 신대륙 은의 유입이 절정에 달했지만, 동시에 인플레이션과 모리스코 추방으로 인한 농업 생산 감소, 측근 정치의 만성 부패로 합스부르크 스페인의 만성 재정난이 누적되었다. 1607년과 1611년 두 차례의 국가 채무 불이행이 이를 압축한다.\n\n' +
    '문화적으로는 스페인 황금 세기의 전반기였다. 미겔 데 세르반테스의 돈키호테(1605년 1부, 1615년 2부), 로페 데 베가의 희곡, 디에고 벨라스케스 등 거장들의 활동기와 겹쳤다. 펠리페 3세 본인은 직접 후원에 적극적이지는 않았으나 측근들이 문화 후원을 통해 왕가 위신을 유지했다.\n\n' +
    '1621년 3월 31일 마드리드 알카사르에서 약 일주일의 발열 끝에 향년 42세로 사망했다. 사인은 단독 또는 류머티즘성 발열로 기록된다. 후계자 펠리페 4세는 만 16세에 즉위했고, 부친의 발리도 제도를 계승해 올리바레스 백공작에게 권력을 위임했다.\n\n' +
    '펠리페 3세의 유산은 양면적이다. 평화 정책으로 재위 전반은 평화로웠으나, 1609년 모리스코 추방·발리도 정치의 부패·1618년 30년 전쟁 가담은 후일 17세기 스페인 합스부르크의 결정적 쇠퇴(1640년 포르투갈·카탈루냐 봉기, 1648년 베스트팔렌 조약, 1659년 피레네 조약, 1700년 카를로스 2세의 후사 단절)의 출발점이 되었다.',
  influence: 70,
  stats: {
    politics: 55,
    military: 50,
    diplomacy: 65,
    intellect: 55,
    charisma: 60,
    administration: 50,
    notes:
      '발리도 정치의 원형으로, 측근 레르마 공작에게 약 20년간 사실상 모든 권력을 위임한 군주. 평화 정책(1604 런던 조약·1609 네덜란드 휴전)은 외교적 성과로 평가되나, 1609년 모리스코 추방·1607·1611 두 차례 국가 부도·1618년 30년 전쟁 가담 등으로 합스부르크 스페인 쇠퇴의 출발점이 되었다. 부친 펠리페 2세의 강력한 친정 행정과 대비되는 약한 군주의 전형. 외교는 사촌인 신성로마황제 페르디난트 2세와의 합스부르크 양가 통합 전선 재구축에 기여. 카리스마는 경건한 가톨릭 신자로서의 도덕적 권위는 인정받았으나 정치적 의지는 부족.',
  },
} as const

// ── 안나 폰 외스터라이히 본문 ─────────────────────────────────────────
const ANNA_AUSTRIA = {
  name: '안나',
  surname: '합스부르크',
  originalName: 'Anna of Austria (Queen of Spain, 1549-1580)',
  regnalName: undefined as string | undefined,
  birthYear: 1549,
  birthMonth: 11,
  birthDay: 1,
  deathYear: 1580,
  deathMonth: 10,
  deathDay: 26,
  birthPlaceText: '카스티야 왕국 시갈레스(Cigales) — 발라돌리드 인근',
  deathPlaceText: '카스티야 왕국 바다호스(Badajoz) — 왕실 별장',
  deathType: DeathType.ILLNESS,
  deathCause: '인플루엔자 + 출산 합병증',
  deathNote: '1580년 10월 26일 바다호스에서 향년 30세로 사망했다. 같은 해 막 출산한 마지막 자녀 마리아(생후 며칠 만에 사망) 후의 회복 중 인플루엔자 유행에 노출되어 약 2주간 고열로 시달리다 사망했다. 시신은 후일 엘 에스코리알 왕립 수도원의 왕들의 판테온에 남편 펠리페 2세 옆에 안치되었다.',
  biography:
    '합스부르크 가문 오스트리아 분지 출신의 스페인 왕비(재위 1570~1580). 신성로마황제 막시밀리안 2세(Maximilian II, 1527~1576 — 카를 5세의 동생 페르디난트 1세의 아들)와 마리아 데 에스파냐(Maria of Spain, 1528~1603 — 카를 5세와 이사벨 데 포르투갈의 딸이자 펠리페 2세의 친누이)의 장녀이다. 즉 안나는 펠리페 2세의 친조카(친누이의 딸)이며, 두 사람의 결혼은 합스부르크 가문 양가(스페인·오스트리아)의 통합 사촌 결혼의 전형 사례였다.\n\n' +
    '안나는 부모 막시밀리안과 마리아가 카스티야 섭정으로 머물던 시기인 1549년 11월 1일 카스티야 시갈레스에서 태어났다. 출생 직후 부모와 함께 신성로마제국으로 돌아가 빈 호프부르크 궁에서 양육되었으며, 라틴어와 이탈리아어, 스페인어, 독일어 등 여러 언어를 익히는 인문 교육을 받았다.\n\n' +
    '1570년 5월 4일 21세의 안나는 43세의 외삼촌이자 사촌인 펠리페 2세와 세고비아에서 결혼했다. 펠리페 2세는 세 번째 부인 엘리자베스 드 발루아가 1568년 출산 합병증으로 사망한 후, 후계자가 절실해 같은 가문 내 통혼을 결정했다. 가톨릭 교회는 외삼촌-조카 결혼에 면제(dispensation)를 발급했다.\n\n' +
    '약 10년의 결혼 생활 동안 다섯 명의 자녀를 두었다. 1571년 페르난도(7세에 사망), 1573년 카를로스 로렌초(2세에 사망), 1575년 디에고(7세에 사망), 1578년 펠리페(후일 펠리페 3세, 유일하게 성인까지 생존), 1580년 마리아(생후 며칠 만에 사망)가 그 자녀들이었다. 합스부르크 근친혼의 전형적 결과로 자녀 사망률이 매우 높았으며, 후일 1700년 합스부르크 스페인 카를로스 2세의 신체적 결함과 후사 단절도 같은 맥락에서 거론된다.\n\n' +
    '1580년 가을 펠리페 2세가 포르투갈 왕위 계승 분쟁(이베리아 연합의 시작)으로 바다호스에 머물던 시기, 안나도 동행했다. 그해 봄 출산한 마지막 자녀 마리아가 며칠 만에 사망한 후 회복 중 발생한 인플루엔자 유행에 노출되어 1580년 10월 26일 향년 30세로 사망했다. 펠리페 2세에게는 네 명의 부인을 모두 떠나보낸 비극의 정점이었다.\n\n' +
    '안나의 사후 영향은 결정적이었다. 그녀의 유일한 생존 아들 펠리페 3세를 통해 합스부르크 스페인의 직계가 1598년 이후 약 100년간 계승되었다. 또한 합스부르크 양가 사촌 결혼이 가문 정책의 전형이 되어, 후일 1700년 카를로스 2세의 후사 단절과 스페인 계승 전쟁(1701~1714)의 직접 원인이 되었다.',
  influence: 50,
  stats: {
    politics: 40,
    military: 15,
    diplomacy: 55,
    intellect: 65,
    charisma: 55,
    administration: 35,
    notes:
      '약 10년의 짧은 왕비 재위 동안 5명의 자녀를 두었으며, 그중 펠리페 3세만 성인까지 생존했다. 합스부르크 근친혼의 전형으로 자녀 사망률이 매우 높았다. 정치 활동은 거의 없었으나 펠리페 2세가 신뢰한 부인으로 동시기 평가에서 우호적이었다. 학식은 빈 호프부르크 궁의 인문 교육으로 다언어 능력 보유. 30세의 요절로 잠재력의 일부만 발휘.',
  },
} as const

export async function seedFelipeIII(prisma: PrismaService): Promise<void> {
  console.log('\n👑 펠리페 3세(Philip III of Spain) 시딩 시작 (기존 데이터 보존 모드)...')

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
    console.warn('  ⚠️  합스부르크 가문 미존재 — 먼저 person.charles-v.seed 실행 필요')
    return
  }

  const castileHC = await prisma.historicalCountry.findFirst({
    where: { name: '카스티야 왕국' },
    select: { id: true },
  })
  const portugalHC = await prisma.historicalCountry.findFirst({
    where: { name: '포르투갈 왕국' },
    select: { id: true },
  })
  if (!castileHC || !portugalHC) {
    console.warn('  ⚠️  카스티야/포르투갈 HC 미존재 — 시딩 중단')
    return
  }

  const felipeII = await prisma.person.findFirst({
    where: { originalName: 'Philip II of Spain' },
    select: { id: true },
  })
  if (!felipeII) {
    console.warn('  ⚠️  펠리페 2세 미존재 — 먼저 person.felipe-ii.seed 실행 필요')
    return
  }

  const kingPos = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ── Helper: Person 등록 ──────────────────────────────────────────────
  const createOrFindPerson = async (
    spec: typeof FELIPE_III | typeof ANNA_AUSTRIA,
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

  // ── 1) 안나·펠리페 3세 등록 (어머니 먼저, 그래야 펠리페 3세 motherId 연결 가능) ──
  const annaId = await createOrFindPerson(ANNA_AUSTRIA, 'FEMALE')
  const felipeIIIExisting = await prisma.person.findFirst({
    where: { originalName: FELIPE_III.originalName },
    select: { id: true, fatherId: true, motherId: true },
  })

  let felipeIIIId: string
  if (felipeIIIExisting) {
    felipeIIIId = felipeIIIExisting.id
    console.log(`  ⏭️  인물 이미 존재 — 스킵: ${FELIPE_III.originalName} (id=${felipeIIIId})`)
    const patch: any = {}
    if (!felipeIIIExisting.fatherId) patch.fatherId = felipeII.id
    if (!felipeIIIExisting.motherId) patch.motherId = annaId
    if (Object.keys(patch).length > 0) {
      await prisma.person.update({ where: { id: felipeIIIId }, data: patch })
      console.log(`    🔧 부모 연결: ${Object.keys(patch).join(', ')}`)
    }
  } else {
    const created = await prisma.person.create({
      data: {
        name: FELIPE_III.name,
        surname: FELIPE_III.surname,
        originalName: FELIPE_III.originalName,
        regnalName: FELIPE_III.regnalName,
        biography: FELIPE_III.biography,
        birthDate: new Date(FELIPE_III.birthYear, FELIPE_III.birthMonth - 1, FELIPE_III.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(FELIPE_III.deathYear, FELIPE_III.deathMonth - 1, FELIPE_III.deathDay),
        deathEra: 'AD' as any,
        gender: 'MALE',
        nameDisplayOrder: 'western' as any,
        dynastyId: habsburgDynasty.id,
        fatherId: felipeII.id,
        motherId: annaId,
        birthPlaceText: FELIPE_III.birthPlaceText,
        deathPlaceText: FELIPE_III.deathPlaceText,
        deathType: FELIPE_III.deathType,
        deathCause: FELIPE_III.deathCause,
        deathNote: FELIPE_III.deathNote,
        influence: FELIPE_III.influence,
        accountId: admin.id,
      },
    })
    felipeIIIId = created.id
    console.log(`  ✅ 인물 생성: ${FELIPE_III.originalName} (id=${felipeIIIId})`)
    console.log(`    🔗 부자: 펠리페 2세 → 펠리페 3세`)
    console.log(`    🔗 모자: 안나 폰 외스터라이히 → 펠리페 3세`)
  }

  // ── 2) PersonStats x2 ─────────────────────────────────────────────────
  for (const [pid, spec, label] of [
    [felipeIIIId, FELIPE_III, '펠리페 3세'],
    [annaId, ANNA_AUSTRIA, '안나 폰 외스터라이히'],
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
  for (const [pid, label] of [
    [felipeIIIId, '펠리페 3세'],
    [annaId, '안나 폰 외스터라이히'],
  ] as const) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: pid,
        historicalCountryId: castileHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${label} → 카스티야 왕국`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: pid,
        historicalCountryId: castileHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: ${label} → 카스티야 왕국 (CITIZENSHIP)`)
  }

  // ── 4) 결혼 관계 (펠리페 2세 ↔ 안나) ──────────────────────────────────
  const mStart = new Date(1570, 4, 4) // 1570-05-04 세고비아
  const mEnd = new Date(1580, 9, 26) // 1580-10-26 안나 사망
  const mNote =
    '1570년 5월 4일 세고비아에서 결혼. 펠리페 2세 43세, 안나 21세. 안나는 펠리페 2세의 친누이 마리아 데 에스파냐의 딸이자 신성로마황제 막시밀리안 2세의 장녀로, 두 사람은 외삼촌-조카 관계였다. 가톨릭 교회의 결혼 면제를 받고 진행된 합스부르크 양가 통합 사촌 결혼의 전형. 약 10년 결혼 생활 동안 5명의 자녀를 두었으나 펠리페 3세만 성인까지 생존했다. 1580년 10월 26일 바다호스에서 안나가 인플루엔자와 출산 합병증으로 30세에 사망하면서 결혼 종결. 펠리페 2세에게는 4명의 부인을 모두 떠나보낸 비극의 정점이었다.'

  for (const [aId, bId, label] of [
    [felipeII.id, annaId, '펠리페 2세 → 안나'],
    [annaId, felipeII.id, '안나 → 펠리페 2세'],
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
    console.log(`  ✅ 결혼: ${label} (1570-05-04 ~ 1580-10-26 사별)`)
  }

  // ── 5) SovereignReign x2 ─────────────────────────────────────────────
  // 카스티야 17대 펠리페 3세 (HC start=1230 페르난도 3세부터)
  // 포르투갈 22대 펠리페 2세 (HC start=1139, 21대 펠리페 1세 = 펠리페 2세 of Spain 다음)
  if (!kingPos) {
    console.warn('  ⚠️  관직 정의 \'국왕\' 미존재 — 재임 스킵')
    console.log(`✅ 펠리페 3세 시딩 완료\n`)
    return
  }

  type ReignSpec = {
    historicalCountryId: string
    historicalCountryName: string
    regnalNumber: number
    regnalName: string
    notes: string
  }

  const REIGNS: ReignSpec[] = [
    {
      historicalCountryId: castileHC.id,
      historicalCountryName: '카스티야 왕국',
      regnalNumber: 16,
      regnalName: '펠리페 3세',
      notes:
        '1598년 9월 13일 부친 펠리페 2세 사망으로 만 20세에 즉위해 약 22년 6개월 재위. 1604년 런던 조약·1609년 네덜란드 12년 휴전으로 평화 정책을 펼쳤으나, 1609년 모리스코 약 30만 명 추방·1607·1611 두 차례 국가 부도·1618년 30년 전쟁 가담으로 합스부르크 스페인 쇠퇴의 출발점이 되었다. 측근 레르마 공작에게 약 20년간 사실상 모든 권력을 위임한 발리도(valido) 정치의 원형. 1621년 3월 31일 마드리드 알카사르에서 향년 42세 사망, 후계자 펠리페 4세(만 16세) 즉위.',
    },
    {
      historicalCountryId: portugalHC.id,
      historicalCountryName: '포르투갈 왕국',
      regnalNumber: 22,
      regnalName: '펠리페 2세',
      notes:
        '1598년 9월 13일 부친 펠리페 1세(= 펠리페 2세 of Spain) 사망으로 포르투갈 왕(스페인 명칭과 다른 포르투갈 측 명명법으로는 펠리페 2세) 즉위. 약 22년 6개월 재위. 이베리아 연합(1580~1640) 약 60년 중 약 23년 통치. 포르투갈 의회·법·통화·식민지 행정 별도 유지의 동군연합 원칙은 그대로 따랐으나, 30년 전쟁 군사비 동원과 인도 식민지 방어 부담으로 포르투갈 측 불만이 누적되어 후일 1640년 왕정복고 전쟁의 토대가 되었다. 1621년 사망으로 아들 펠리페 3세(= 펠리페 4세 of Spain)에게 포르투갈 왕위 상속.',
    },
  ]

  for (const r of REIGNS) {
    const existingByPerson = await prisma.sovereignReign.findFirst({
      where: { personId: felipeIIIId, historicalCountryId: r.historicalCountryId },
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
        console.log(`  🔧 재임 정정: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`)
      } else {
        console.log(
          `  ⏭️  재임 스킵 (이미 정확): ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대`,
        )
      }
      continue
    }
    const slotConflict = await prisma.sovereignReign.findFirst({
      where: {
        historicalCountryId: r.historicalCountryId,
        regnalNumber: r.regnalNumber,
      },
    })
    if (slotConflict) {
      console.warn(
        `  ⚠️  재임 충돌: ${r.historicalCountryName} ${r.regnalNumber}대 — 다른 인물 점유 (skip)`,
      )
      continue
    }
    await prisma.sovereignReign.create({
      data: {
        personId: felipeIIIId,
        historicalCountryId: r.historicalCountryId,
        positionDefinitionId: kingPos.id,
        regnalNumber: r.regnalNumber,
        regnalName: r.regnalName,
        startDate: new Date(1598, 8, 13), // 1598-09-13 부친 사망
        endDate: new Date(1621, 2, 31), // 1621-03-31 본인 사망
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '1621년 3월 31일 마드리드 알카사르에서 향년 42세 사망 (단독 또는 류머티즘성 발열).',
        notes: r.notes,
        accountId: admin.id,
      },
    })
    console.log(
      `  ✅ 재임: ${r.historicalCountryName} ${r.regnalName} ${r.regnalNumber}대 (1598-09-13 ~ 1621-03-31)`,
    )
  }

  console.log(`✅ 펠리페 3세 시딩 완료\n`)
}
