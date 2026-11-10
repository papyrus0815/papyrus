import type { Era, Prisma } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 소련 국가 기관 — 독소전쟁기 군령·군정 기관(국방인민위원부·총참모부·최고사령부 대본영) + 개전 훈령 연결.
 *
 * 나치 독일 OKW 계열(administrationDepartment.naziGermany.seed)의 맞은편. 경계 규칙 그대로: 국가 기관은
 * AdministrationDepartment(kind MINISTRY·MILITARY_COMMAND), 방면군·군·군단 같은 야전 편제는 MilitaryUnit이고
 * 부대는 소속 기관(administrationDepartmentId)으로 이 기관들에 붙는다.
 *
 * 소속: 소련(역사, 정체성 축) + 현대 러시아(표시 축) dual-fill.
 * 상하: 총참모부는 형식상 국방인민위원부 산하(1941.8부터는 사실상 대본영의 실무 기관 — 설명에 적음).
 * 대본영은 국가방위위원회·인민위원회의와 나란한 최고 지휘기구라 상위를 두지 않는다.
 *
 * 멱등: (이름, 역사국가)로 찾고 있으면 건너뛴다(UI 편집분을 덮어쓰지 않는다).
 */

const HISTORICAL_COUNTRY_NAME = '소비에트 사회주의 공화국 연방'
const MODERN_COUNTRY_ISO = 'RU'
const DEFENSE_CATEGORY_NAME = '국방'

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
    key: 'nko',
    name: '국방인민위원부',
    kind: 'MINISTRY',
    abbreviation: 'NKO',
    nameLocal: 'Народный комиссариат обороны СССР',
    nameEn: "People's Commissariat of Defence",
    established: { year: 1934, month: 3, day: 15 },
    abolished: { year: 1946, month: 2, day: 25 },
    description:
      '1934년 3월 육해군 인민위원부를 개편한 소련의 군정 부처. 인민위원 클리멘트 보로실로프(1934~40), ' +
      '세묜 티모셴코(1940~41), 1941년 7월부터 스탈린이 겸임. 1941년 6월 21~22일 개전 훈령 제1~3호를 티모셴코·주코프 명의로 하달했다. ' +
      '1946년 2월 해군 인민위원부와 합쳐 군사력 인민위원부(곧 군사력부)가 되었다.',
  },
  {
    key: 'general-staff',
    name: '붉은 군대 총참모부',
    kind: 'MILITARY_COMMAND',
    nameLocal: 'Генеральный штаб Красной армии',
    nameEn: 'General Staff of the Red Army',
    parentKey: 'nko',
    established: { year: 1935, month: 9, day: 22 },
    abolished: { year: 1946, month: 2, day: 25 },
    description:
      '1935년 9월 노농적군 참모부를 개칭한 군령 참모 기관. 총장 보리스 샤포시니코프(1937~40, 1941~42), ' +
      '키릴 메레츠코프(1940~41), 게오르기 주코프(1941.1~7), 알렉산드르 바실렙스키(1942~45). ' +
      '형식상 국방인민위원부 산하였지만 1941년 8월 이후 최고사령부 대본영의 작전 실무 기관으로 방면군·군의 작전을 기획했다.',
  },
  {
    key: 'stavka',
    name: '최고사령부 대본영',
    kind: 'MILITARY_COMMAND',
    abbreviation: 'Stavka',
    nameLocal: 'Ставка Верховного Главнокомандования',
    nameEn: 'Stavka of the Supreme High Command',
    established: { year: 1941, month: 6, day: 23 },
    abolished: { year: 1945, month: 10 },
    description:
      '개전 다음 날인 1941년 6월 23일 "총사령부 대본영"(의장 티모셴코)으로 세워져, 7월 10일 최고사령부 대본영, ' +
      '8월 8일 최고총사령부 대본영으로 개칭된 소련군 최고 전략 지휘기구. 7월부터 스탈린이 의장(최고총사령관)을 맡고 ' +
      '주코프·바실렙스키·샤포시니코프·티모셴코 등이 구성원이었다. 방면군에 대본영 대표를 파견해 주요 작전을 조율했다. 1945년 10월 해산.',
  },
]

/** 개전 훈령 — 국방인민위원부 발령, 총참모부 기안(주코프 공동 서명) */
const DIRECTIVE_LINKS: Array<{
  title: string
  links: Array<{ key: string; role: 'ISSUER' | 'PARTICIPANT'; roleDescription: string }>
}> = [
  {
    title: "소련 국방인민위원부 '훈령 제1호' 하달",
    links: [
      { key: 'nko', role: 'ISSUER', roleDescription: '티모셴코(국방인민위원) 명의 — 서부 국경 군관구 전투준비 경계령' },
      { key: 'general-staff', role: 'PARTICIPANT', roleDescription: '총참모장 주코프 공동 서명·기안' },
    ],
  },
  {
    title: "소련 국방인민위원부 '훈령 제2호(국경 월경 금지령)' 하달",
    links: [
      { key: 'nko', role: 'ISSUER', roleDescription: '독일군 격퇴 명령 — 단, 별도 지시 전 국경 월경 금지' },
      { key: 'general-staff', role: 'PARTICIPANT', roleDescription: '총참모부 기안·주코프 공동 서명' },
    ],
  },
  {
    title: "소련 국방인민위원부 '훈령 제3호(국경 전면 역습령)' 하달",
    links: [
      { key: 'nko', role: 'ISSUER', roleDescription: '6월 22일 밤 — 서부·서남부 방면군에 전면 반격 명령' },
      { key: 'general-staff', role: 'PARTICIPANT', roleDescription: '총참모부 기안(주코프는 서명 직후 서남부 방면군으로 파견)' },
    ],
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

export async function seedSovietDepartments(prisma: PrismaService): Promise<void> {
  console.log('\n🏛️  소련 국가 기관(국방인민위원부·총참모부·대본영) 시딩 시작...')

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

  for (const directive of DIRECTIVE_LINKS) {
    const event = await prisma.event.findFirst({ where: { title: directive.title, deletedAt: null }, select: { id: true } })
    if (!event) {
      console.warn(`  ⚠️  사건 없음: ${directive.title} — 연결 건너뜀`)
      continue
    }
    let sortOrder = await prisma.eventDepartmentRelation.count({ where: { eventId: event.id } })
    for (const link of directive.links) {
      const departmentId = idByKey.get(link.key)
      if (!departmentId) continue
      const exists = await prisma.eventDepartmentRelation.findFirst({
        where: { eventId: event.id, departmentId, role: link.role },
      })
      if (exists) continue
      await prisma.eventDepartmentRelation.create({
        data: {
          eventId: event.id,
          departmentId,
          role: link.role,
          roleDescription: link.roleDescription,
          sortOrder: sortOrder++,
        },
      })
      console.log(`  📜 ${directive.title} ← ${link.key} (${link.role})`)
    }
  }

  console.log('✅ 소련 국가 기관 시딩 완료\n')
}
