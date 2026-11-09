import type { Era, Prisma } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 나치 독일 국가 기관 — 국방군 최고사령부(OKW) 계열 + 총통 지령 제21호 연결.
 *
 * "총통 지령 제21호(바르바로사 작전) 하달" 사건에 OKW(기안·하달)·OKH·OKL·OKM(수령·집행)을 잇기 위한
 * 첫 데이터(2026-11-08 국가 기관 재설계). 경계 규칙: 최고사령부는 국가 기관(AdministrationDepartment,
 * kind=MILITARY_COMMAND)이고, 집단군·기갑집단 같은 야전 편제는 MilitaryUnit이다.
 *
 * 소속: 나치 독일(역사, 정체성 축) + 현대 독일(표시 축) dual-fill — 독일 국가 상세에도 보이게.
 * 상하: OKH·OKL·OKM·지휘참모부는 형식상 OKW 아래(실제로 OKH는 OKW와 경쟁했다 — 설명에 적음).
 * 계보: 전쟁부 → OKW(1938.2 개편).
 *
 * 멱등: (이름, 역사국가)로 찾고 있으면 건너뛴다(UI 편집분을 덮어쓰지 않는다).
 */

const HISTORICAL_COUNTRY_NAME = '나치 독일 (제3제국)'
const MODERN_COUNTRY_ISO = 'DE'
const DEFENSE_CATEGORY_NAME = '국방'
const DIRECTIVE_21_TITLE = '총통 지령 제21호(바르바로사 작전) 하달'

interface DatePart {
  year: number
  month?: number
  day?: number
}

interface DepartmentSeed {
  key: string
  name: string
  kind: 'MINISTRY' | 'MILITARY_COMMAND'
  abbreviation?: string
  nameLocal: string
  nameEn: string
  parentKey?: string
  established: DatePart
  abolished: DatePart
  description: string
}

const DEPARTMENTS: DepartmentSeed[] = [
  {
    key: 'war-ministry',
    name: '전쟁부',
    kind: 'MINISTRY',
    nameLocal: 'Reichskriegsministerium',
    nameEn: 'Reich Ministry of War',
    established: { year: 1935, month: 5, day: 21 },
    abolished: { year: 1938, month: 2, day: 4 },
    description:
      '1935년 5월 국방법(재군비 선언)으로 국방부(Reichswehrministerium)를 개칭한 군정 부처. 장관 베르너 폰 블롬베르크. ' +
      '1938년 블롬베르크-프리치 사건으로 블롬베르크가 물러나자 히틀러가 부처를 없애고 그 권한을 국방군 최고사령부(OKW)로 넘겼다.',
  },
  {
    key: 'okw',
    name: '국방군 최고사령부',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'OKW',
    nameLocal: 'Oberkommando der Wehrmacht',
    nameEn: 'High Command of the Armed Forces',
    established: { year: 1938, month: 2, day: 4 },
    abolished: { year: 1945, month: 5, day: 23 },
    description:
      '1938년 2월 4일 히틀러가 전쟁부를 폐지하고 육·해·공 3군 위에 세운 최고 지휘기구. 히틀러가 국방군 최고사령관을 겸하고 ' +
      '빌헬름 카이텔이 총장(장관급), 알프레트 요들이 지휘참모부장으로 실무를 맡았다. 총통 지령을 기안·하달했으며, ' +
      '1941년 이후 동부전선은 육군 총사령부(OKH), 그 밖의 전역은 OKW가 맡는 이원 체제가 굳어졌다. ' +
      '1945년 5월 8일 카이텔이 베를린에서 무조건 항복 문서에 서명했고, 5월 23일 플렌스부르크에서 요들 등이 체포되며 해체되었다.',
  },
  {
    key: 'wfst',
    name: '국방군 지휘참모부',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'WFSt',
    nameLocal: 'Wehrmachtführungsstab',
    nameEn: 'Armed Forces Operations Staff',
    parentKey: 'okw',
    established: { year: 1938, month: 2 },
    abolished: { year: 1945, month: 5 },
    description:
      'OKW의 작전 참모부. 1938년 국방군 지휘국(Wehrmachtführungsamt)으로 출발해 1940년 8월 지휘참모부로 개칭했다. ' +
      '부장 알프레트 요들(1939~45), 산하 국토방위과장 발터 바를리몬트가 총통 지령 초안을 작성했다.',
  },
  {
    key: 'okh',
    name: '육군 총사령부',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'OKH',
    nameLocal: 'Oberkommando des Heeres',
    nameEn: 'High Command of the Army',
    parentKey: 'okw',
    established: { year: 1935, month: 6 },
    abolished: { year: 1945, month: 5 },
    description:
      '육군 최고 지휘기구. 총사령관 발터 폰 브라우히치(1938~41), 참모총장 프란츠 할더(1938~42). ' +
      '형식상 OKW 아래였지만 실제로는 작전 지휘권을 두고 경쟁했고, 1941년 12월 브라우히치 해임 뒤 히틀러가 육군 총사령관을 겸했다. ' +
      '바르바로사 작전의 육군 배치 지령(1941년 1월 31일)을 내렸다.',
  },
  {
    key: 'okl',
    name: '공군 총사령부',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'OKL',
    nameLocal: 'Oberkommando der Luftwaffe',
    nameEn: 'High Command of the Air Force',
    parentKey: 'okw',
    established: { year: 1935, month: 3 },
    abolished: { year: 1945, month: 5 },
    description:
      '공군(루프트바페) 최고 지휘기구. 총사령관 헤르만 괴링. 1944년 2월 정식으로 OKL이 되기 전까지는 ' +
      '"공군 총사령관(Ob.d.L.)" 참모부로 불렸다 — 총통 지령 제21호의 수령처 표기도 Ob.d.L.이다.',
  },
  {
    key: 'okm',
    name: '해군 총사령부',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'OKM',
    nameLocal: 'Oberkommando der Kriegsmarine',
    nameEn: 'High Command of the Navy',
    parentKey: 'okw',
    established: { year: 1936, month: 1 },
    abolished: { year: 1945, month: 5 },
    description:
      '해군(크릭스마리네) 최고 지휘기구. 1936년 1월 해군 지휘부(Marineleitung)를 개편해 설치. ' +
      '총사령관 에리히 레더(~1943), 카를 되니츠(1943~45).',
  },
]

const TRANSITIONS: Array<{ from: string; to: string; kind: 'REORGANIZE'; year: number; month: number; note: string }> = [
  {
    from: 'war-ministry',
    to: 'okw',
    kind: 'REORGANIZE',
    year: 1938,
    month: 2,
    note: '블롬베르크-프리치 사건 뒤 전쟁부 폐지, 권한을 OKW로 이관',
  },
]

const DIRECTIVE_21_LINKS: Array<{
  key: string
  role: 'ISSUER' | 'RECIPIENT'
  roleDescription: string
}> = [
  {
    key: 'okw',
    role: 'ISSUER',
    roleDescription:
      '지휘참모부(요들)·국토방위과(바를리몬트)가 기안 — 히틀러 서명 후 9부 한정 기밀로 하달',
  },
  {
    key: 'okh',
    role: 'RECIPIENT',
    roleDescription: '육군 작전 — 프리퍄티 늪 남북으로 3개 집단군 돌파, 드네프르강 서쪽에서 소련군 주력 포위 섬멸',
  },
  {
    key: 'okl',
    role: 'RECIPIENT',
    roleDescription: '소련 공군 무력화와 육군 지상 지원, 본토 방공 유지 (수령처 표기는 Ob.d.L.)',
  },
  {
    key: 'okm',
    role: 'RECIPIENT',
    roleDescription: '영국 상대 작전을 우선하되 발트해 연안 방어와 소련 함대 봉쇄',
  },
]

function dateColumns(prefix: 'established' | 'abolished', part: DatePart): Record<string, unknown> {
  const precision = part.month == null ? 'year' : part.day == null ? 'month' : 'day'
  const date = new Date(Date.UTC(part.year, (part.month ?? 1) - 1, part.day ?? 1))
  return {
    [`${prefix}Era`]: 'AD' as Era,
    [`${prefix}Year`]: part.year,
    [`${prefix}Month`]: part.month ?? null,
    [`${prefix}Day`]: part.day ?? null,
    [`${prefix}Precision`]: precision,
    [`${prefix}Date`]: date,
  }
}

export async function seedNaziGermanyDepartments(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️  나치 독일 국가 기관(OKW 계열) 시딩 시작...')

  const historicalCountry = await prisma.historicalCountry.findFirst({
    where: { name: HISTORICAL_COUNTRY_NAME },
    select: { id: true },
  })
  if (!historicalCountry) {
    console.warn(`  ⚠️  역사국가 없음: ${HISTORICAL_COUNTRY_NAME} — 건너뜀`)
    return
  }
  const modernCountry = await prisma.country.findFirst({ where: { isoCode: MODERN_COUNTRY_ISO }, select: { id: true } })
  const defenseCategory = await prisma.administrationDepartmentCategory.findFirst({
    where: { name: DEFENSE_CATEGORY_NAME },
    select: { id: true },
  })

  const idByKey = new Map<string, string>()
  // 부모가 먼저 생기도록 배열 순서(부모 → 자식)를 지킨다
  for (const seed of DEPARTMENTS) {
    const existing = await prisma.administrationDepartment.findFirst({
      where: { name: seed.name, historicalCountryId: historicalCountry.id },
      select: { id: true },
    })
    if (existing) {
      idByKey.set(seed.key, existing.id)
      console.log(`  ⏭️  ${seed.name}`)
      continue
    }
    const created = await prisma.administrationDepartment.create({
      data: {
        name: seed.name,
        kind: seed.kind,
        abbreviation: seed.abbreviation ?? null,
        nameLocal: seed.nameLocal,
        nameEn: seed.nameEn,
        historicalCountryId: historicalCountry.id,
        countryId: modernCountry?.id ?? null,
        categoryId: defenseCategory?.id ?? null,
        parentId: seed.parentKey ? (idByKey.get(seed.parentKey) ?? null) : null,
        description: seed.description,
        ...dateColumns('established', seed.established),
        ...dateColumns('abolished', seed.abolished),
      } as Prisma.AdministrationDepartmentUncheckedCreateInput,
      select: { id: true },
    })
    idByKey.set(seed.key, created.id)
    console.log(`  ✅ ${seed.name}${seed.abbreviation ? ` (${seed.abbreviation})` : ''}`)
  }

  for (const transition of TRANSITIONS) {
    const predecessorId = idByKey.get(transition.from)
    const successorId = idByKey.get(transition.to)
    if (!predecessorId || !successorId) continue
    const exists = await prisma.administrationDepartmentTransition.findFirst({ where: { predecessorId, successorId } })
    if (exists) continue
    await prisma.administrationDepartmentTransition.create({
      data: {
        predecessorId,
        successorId,
        kind: transition.kind,
        era: 'AD',
        year: transition.year,
        month: transition.month,
        note: transition.note,
      },
    })
    console.log(`  🔗 계보: ${transition.from} → ${transition.to}`)
  }

  const directive = await prisma.event.findFirst({
    where: { title: DIRECTIVE_21_TITLE, deletedAt: null },
    select: { id: true },
  })
  if (!directive) {
    console.warn(`  ⚠️  사건 없음: ${DIRECTIVE_21_TITLE} — 사건 연결 건너뜀`)
  } else {
    let sortOrder = await prisma.eventDepartmentRelation.count({ where: { eventId: directive.id } })
    for (const link of DIRECTIVE_21_LINKS) {
      const departmentId = idByKey.get(link.key)
      if (!departmentId) continue
      const exists = await prisma.eventDepartmentRelation.findFirst({
        where: { eventId: directive.id, departmentId, role: link.role },
      })
      if (exists) continue
      await prisma.eventDepartmentRelation.create({
        data: {
          eventId: directive.id,
          departmentId,
          role: link.role,
          roleDescription: link.roleDescription,
          sortOrder: sortOrder++,
        },
      })
      console.log(`  📜 지령 제21호 ← ${link.key} (${link.role})`)
    }
  }

  console.log('✅ 나치 독일 국가 기관 시딩 완료\n')
}
