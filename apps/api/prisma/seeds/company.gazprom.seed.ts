/**
 * 가스프롬(Gazprom) 기업 시드
 *
 * 기존 데이터 보존 모드 — Company/City/Category/History 이미 있으면 갱신하지 않고 스킵한다.
 *
 * 소련 가스공업부(Министерство газовой промышленности СССР)를 모태로 1989년
 * 국영 가스 콘체른 "가스프롬"으로 출범, RAO Gazprom(1993) → OAO Gazprom(1998) →
 * PJSC Gazprom(2015) 으로 이어진 세계 최대 천연가스 기업. 러시아 정부가 과반 지분을
 * 보유한 국영기업으로 노르드스트림·시베리아의 힘 등 대형 파이프라인을 운영한다.
 *
 * 등록 항목:
 *  - Company 1 (가스프롬) + Organization 1:1 (경력·사건 연결용 다리)
 *  - City 2 (상트페테르부르크·모스크바, 없으면 생성)
 *  - 인물 2 (창립자 체르노미르딘 · 현 회장 밀레르) + 임원 role 2
 *  - CompanyCategory x2 (에너지 → 천연가스, 계층형) + Relation x1
 *  - CompanyHistory x5 (연혁)
 *  - Event x7 (출범·민영화·노르드스트림 개통/폭발·시베리아의 힘·유럽 공급중단·첫 순손실)
 *    + EventOrganizationRelation x7 (FOUNDED / PRINCIPAL / VICTIM)
 */
import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const RUSSIA_COUNTRY_NAME = '러시아'
const HQ_CITY_NAME = '상트페테르부르크'
const COMPANY_NAME = '가스프롬'
const FOUNDED_AT = new Date('1989-08-08') // 소련 각료회의 결정 제619호로 국영 가스 콘체른 출범

// ── 인물 (창립자·임원) ────────────────────────────────────────────────────
type PersonSeedInput = {
  name: string
  surname: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  deathCause?: string
  isAlive: boolean
  influence: number
}

const FOUNDER: PersonSeedInput = {
  name: '빅토르',
  surname: '체르노미르딘',
  originalName: 'Viktor Chernomyrdin',
  biography:
    '빅토르 스테파노비치 체르노미르딘(Виктор Степанович Черномырдин, 1938~2010)은 소련 마지막 가스공업부 장관으로서 1989년 부처를 국영 콘체른 가스프롬으로 개편하고 초대 대표를 맡았다. 이후 1992~1998년 러시아 연방 총리를 지냈으며, 가스프롬을 러시아 최대 기업으로 키운 핵심 인물로 평가된다.',
  birthYear: 1938,
  birthMonth: 4,
  birthDay: 9,
  deathYear: 2010,
  deathMonth: 11,
  deathDay: 3,
  deathCause: '병환(자연사)',
  isAlive: false,
  influence: 78,
}

const MILLER: PersonSeedInput = {
  name: '알렉세이',
  surname: '밀레르',
  originalName: 'Alexei Miller',
  biography:
    '알렉세이 보리소비치 밀레르(Алексей Борисович Миллер, 1962~)는 2001년부터 가스프롬 이사회 의장(회장)을 맡고 있는 경영인이다. 푸틴 정권의 에너지 정책 핵심 인물로 평가된다.',
  birthYear: 1962,
  birthMonth: 1,
  birthDay: 31,
  isAlive: true,
  influence: 70,
}

// ── 시설 ──────────────────────────────────────────────────────────────────
type FacilityInput = {
  name: string
  facilityType: 'HEADQUARTERS' | 'OFFICE' | 'FACTORY' | 'RND' | 'OTHER'
  cityName: string
  address?: string
  openedAt?: Date
  closedAt?: Date
  note?: string
}

const FACILITIES: FacilityInput[] = [
  {
    name: '라흐타 센터 (본사)',
    facilityType: 'HEADQUARTERS',
    cityName: '상트페테르부르크',
    address: 'Lakhtinsky prospekt 2, Saint Petersburg',
    openedAt: new Date('2021-10-01'),
    note: '높이 462m, 유럽 최고층 빌딩. 2021년 모스크바에서 이전한 현재 본사.',
  },
  {
    name: '구 모스크바 본사 (나메트키나)',
    facilityType: 'OFFICE',
    cityName: '모스크바',
    address: 'ul. Nametkina 16, Moscow',
    closedAt: new Date('2021-10-01'),
    note: '1989년 출범 이후 2021년까지 사용한 옛 본사.',
  },
]

type CategoryInput = {
  name: string
  slug: string
  description: string
  parentSlug?: string
}

const CATEGORIES: CategoryInput[] = [
  {
    name: '에너지',
    slug: 'energy',
    description: '석유·가스·전력 등 에너지 부문 기업',
  },
  {
    name: '천연가스',
    slug: 'natural-gas',
    description: '천연가스 탐사·생산·수송·판매 기업',
    parentSlug: 'energy',
  },
]

type HistoryInput = {
  title: string
  occurredAt: Date
  content: string
  order: number
}

const HISTORIES: HistoryInput[] = [
  {
    title: '국영 가스 콘체른 가스프롬 출범',
    occurredAt: new Date('1989-08-08'),
    content:
      '소련 각료회의 결정 제619호에 따라 소련 가스공업부가 국영 가스 콘체른 "가스프롬"으로 개편되었다. 초대 대표는 빅토르 체르노미르딘(Виктор Черномырдин).',
    order: 1,
  },
  {
    title: 'RAO 가스프롬으로 주식회사화',
    occurredAt: new Date('1993-02-17'),
    content:
      '러시아 대통령령에 따라 러시아주식회사(RAO) 가스프롬으로 전환되며 민영화·증권화의 토대를 마련했다.',
    order: 2,
  },
  {
    title: 'OAO 가스프롬으로 개편',
    occurredAt: new Date('1998-06-26'),
    content: '공개주식회사(OAO) 가스프롬으로 명칭과 지배구조를 정비했다.',
    order: 3,
  },
  {
    title: '알렉세이 밀레르 CEO 취임',
    occurredAt: new Date('2001-05-30'),
    content:
      '알렉세이 밀레르(Алексей Миллер)가 이사회 의장(CEO)으로 취임하여 국가 통제 강화 기조 아래 자산 재집중을 추진했다.',
    order: 4,
  },
  {
    title: '본사 상트페테르부르크 라흐타 센터 이전',
    occurredAt: new Date('2021-10-01'),
    content:
      '모스크바에서 상트페테르부르크 라흐타 센터(Лахта Центр, 유럽 최고층 빌딩)로 본사를 이전했다.',
    order: 5,
  },
]

/** 인물 생성(없으면) + 러시아 국적 연결. personId 반환. */
async function ensurePerson(
  prisma: PrismaService,
  p: PersonSeedInput,
  countryId: string,
): Promise<string> {
  let personId: string
  const existing = await prisma.person.findFirst({
    where: { originalName: p.originalName },
    select: { id: true },
  })
  if (existing) {
    personId = existing.id
    console.log(`    ⏭️  ${p.originalName} (이미 존재)`)
  } else {
    const created = await prisma.person.create({
      data: {
        name: p.name,
        surname: p.surname,
        originalName: p.originalName,
        biography: p.biography,
        birthEra: 'AD' as any,
        birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
        deathEra: p.deathYear ? ('AD' as any) : undefined,
        deathDate: p.deathYear
          ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
          : undefined,
        deathCause: p.deathCause,
        isAlive: p.isAlive,
        gender: 'MALE',
        nameDisplayOrder: 'western' as any,
        influence: p.influence,
        accountId: ACCOUNT_ID,
      },
      select: { id: true },
    })
    personId = created.id
    console.log(`    ✅ ${p.originalName} (영향력 ${p.influence})`)
  }
  const aff = await prisma.personCountryAffiliation.findFirst({
    where: { personId, countryId, affiliationType: 'CITIZENSHIP' as any },
  })
  if (!aff) {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        countryId,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
  }
  return personId
}

export async function seedGazpromCompany(prisma: PrismaService): Promise<void> {
  console.log('\n🏭 가스프롬(Gazprom) 기업 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 전제: 러시아 국가 ──────────────────────────────────────────────────
  const russia = await prisma.country.findFirst({
    where: { name: RUSSIA_COUNTRY_NAME },
    select: { id: true },
  })
  if (!russia) {
    console.warn(`  ⚠️  국가 '${RUSSIA_COUNTRY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  // ── 도시 get-or-create 헬퍼 (City엔 (countryId,name) unique 없음) ─────────
  const getOrCreateCity = async (
    name: string,
    population?: number,
  ): Promise<string> => {
    const found = await prisma.city.findFirst({
      where: { name, countryId: russia.id },
      select: { id: true },
    })
    if (found) {
      console.log(`  ⏭️  도시 '${name}' (이미 존재)`)
      return found.id
    }
    const created = await prisma.city.create({
      data: {
        name,
        countryId: russia.id,
        population: population ? BigInt(population) : undefined,
      },
      select: { id: true },
    })
    console.log(`  ✅ 도시 생성: ${name}`)
    return created.id
  }

  // ── 본사 도시 (상트페테르부르크) ─────────────────────────────────────────
  const hqCityId = await getOrCreateCity(HQ_CITY_NAME, 5600000)

  // ── 창립자 (빅토르 체르노미르딘) ─────────────────────────────────────────
  console.log('\n  👤 창립자 등록...')
  const founderId = await ensurePerson(prisma, FOUNDER, russia.id)

  // ── 카테고리 (에너지 → 천연가스) ─────────────────────────────────────────
  console.log('\n  🗂️  카테고리 등록...')
  const categoryIdBySlug = new Map<string, string>()
  for (const c of CATEGORIES) {
    const parentId = c.parentSlug ? categoryIdBySlug.get(c.parentSlug) : undefined
    const cat = await prisma.companyCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        parentId,
      },
      select: { id: true },
    })
    categoryIdBySlug.set(c.slug, cat.id)
    console.log(`    ✅ ${c.name} (${c.slug})`)
  }

  // ── Organization(정본) + 기업(가스프롬 산업 확장) ───────────────────────
  // schema-1 통합(방향 B): 명칭·상태·국가·날짜 등 공유필드는 type=COMPANY Organization이
  // 정본으로 보유하고, Company는 founder·시설·연혁·업종만 갖는 1:1 확장이다.
  const orgData = {
    name: COMPANY_NAME,
    shortName: 'GAZP',
    localName: 'ПАО «Газпром»',
    description:
      '러시아의 국영 천연가스 기업이자 세계 최대 규모의 천연가스 생산·수송 회사. 소련 가스공업부를 모태로 1989년 출범했으며, 러시아 정부가 과반 지분을 보유한다. 노르드스트림·시베리아의 힘 등 대형 파이프라인망을 통해 유럽·아시아로 가스를 공급하며 모스크바 증권거래소(MOEX) 상장사다(티커 GAZP).',
    status: 'ACTIVE' as any,
    foundedDate: FOUNDED_AT,
    websiteUrl: 'https://www.gazprom.com',
    countryId: russia.id,
    headquartersCityId: hqCityId,
  }
  let org = await prisma.organization.findFirst({
    where: { name: COMPANY_NAME, type: 'COMPANY' as any },
    select: { id: true },
  })
  if (org) {
    await prisma.organization.update({ where: { id: org.id }, data: orgData })
  } else {
    org = await prisma.organization.create({
      data: { ...orgData, type: 'COMPANY' as any },
      select: { id: true },
    })
    console.log('    ✅ Organization(정본) 생성')
  }

  let companyId: string
  const existing = await prisma.company.findFirst({
    where: { organizationId: org.id },
    select: { id: true },
  })
  if (existing) {
    companyId = existing.id
    await prisma.company.update({
      where: { id: companyId },
      data: { founderId },
    })
    console.log(`\n  ⏭️  기업 '${COMPANY_NAME}' 이미 존재 — 창립자 연결 보강 (id=${companyId})`)
  } else {
    const created = await prisma.company.create({
      data: { organizationId: org.id, founderId },
      select: { id: true },
    })
    companyId = created.id
    console.log(`\n  ✅ 기업 생성: ${COMPANY_NAME} (id=${companyId})`)
  }

  // ── 카테고리 연결 (천연가스) ─────────────────────────────────────────────
  const naturalGasCategoryId = categoryIdBySlug.get('natural-gas')!
  const relExists = await prisma.companyCategoryRelation.findFirst({
    where: { companyId, categoryId: naturalGasCategoryId },
  })
  if (relExists) {
    console.log('  ⏭️  카테고리 연결(천연가스) 이미 존재')
  } else {
    await prisma.companyCategoryRelation.create({
      data: {
        companyId,
        categoryId: naturalGasCategoryId,
        fromDate: FOUNDED_AT,
      },
    })
    console.log('  ✅ 카테고리 연결: 천연가스')
  }

  // ── 연혁 ─────────────────────────────────────────────────────────────────
  console.log('\n  📜 연혁 등록...')
  for (const h of HISTORIES) {
    const hExists = await prisma.companyHistory.findFirst({
      where: { companyId, title: h.title },
    })
    if (hExists) {
      console.log(`    ⏭️  ${h.title} (이미 존재)`)
      continue
    }
    await prisma.companyHistory.create({
      data: {
        companyId,
        title: h.title,
        occurredAt: h.occurredAt,
        content: h.content,
        order: h.order,
      },
    })
    console.log(`    ✅ ${h.title}`)
  }

  // ── 시설 ─────────────────────────────────────────────────────────────────
  console.log('\n  🏢 시설 등록...')
  for (const f of FACILITIES) {
    const cityId = await getOrCreateCity(f.cityName)
    const fExists = await prisma.companyFacility.findFirst({
      where: { companyId, name: f.name },
    })
    if (fExists) {
      console.log(`    ⏭️  ${f.name} (이미 존재)`)
      continue
    }
    await prisma.companyFacility.create({
      data: {
        companyId,
        name: f.name,
        facilityType: f.facilityType as any,
        address: f.address,
        cityId,
        openedAt: f.openedAt,
        closedAt: f.closedAt,
        note: f.note,
      },
    })
    console.log(`    ✅ ${f.name}`)
  }

  // Organization(정본)·기업 다리는 위에서 이미 생성·연결됨 — org 변수 재사용.

  // ── 임원 (OrganizationPersonRole) ────────────────────────────────────────
  console.log('\n  👔 임원 등록...')
  const millerId = await ensurePerson(prisma, MILLER, russia.id)
  const ROLES: Array<{
    personId: string
    roleTitle: string
    termNumber?: number
    startDate?: Date
    endDate?: Date
    notes?: string
  }> = [
    {
      personId: founderId,
      roleTitle: '초대 회장',
      termNumber: 1,
      startDate: new Date('1989-08-08'),
      endDate: new Date('1992-06-01'),
      notes: '소련 가스공업부 장관 출신 초대 대표. 이후 러시아 총리로 이동.',
    },
    {
      personId: millerId,
      roleTitle: '회장 (이사회 의장)',
      startDate: new Date('2001-05-30'),
      notes: '2001년 취임, 현직.',
    },
  ]
  for (const r of ROLES) {
    const exists = await prisma.organizationPersonRole.findFirst({
      where: { organizationId: org.id, personId: r.personId, roleTitle: r.roleTitle },
    })
    if (exists) {
      console.log(`    ⏭️  ${r.roleTitle} (이미 존재)`)
      continue
    }
    await prisma.organizationPersonRole.create({
      data: {
        organizationId: org.id,
        personId: r.personId,
        roleTitle: r.roleTitle,
        termNumber: r.termNumber,
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes,
      },
    })
    console.log(`    ✅ ${r.roleTitle}`)
  }

  // ── 사건(Event) 생성 + 조직 연결 ─────────────────────────────────────────
  console.log('\n  📅 사건 등록 + 연결...')
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('    ⚠️  admin 계정 미존재 — 사건 연결 스킵')
    return
  }
  const economyCategory = await prisma.eventCategory.findFirst({
    where: { name: '경제' },
    select: { id: true },
  })

  type EventSeedInput = {
    title: string
    description: string
    startDate: Date
    startDatePrecision?: 'year' | 'month' | 'day'
    endDate?: Date
    location?: string
    background?: string
    aftermath?: string
    /** 조직(가스프롬)이 이 사건에서 가진 역할 */
    orgRole:
      | 'FOUNDED'
      | 'PRINCIPAL'
      | 'PARTICIPANT'
      | 'VICTIM'
      | 'BENEFICIARY'
    orgRoleDescription?: string
    /** 동일 제목의 기존 CompanyHistory에 eventId를 채워 연결 */
    linkHistoryTitle?: string
    keywords?: string[]
  }

  const EVENTS: EventSeedInput[] = [
    {
      title: '국영 가스 콘체른 가스프롬 출범',
      description:
        '1989년 8월 8일 소련 각료회의 결정 제619호로 가스공업부가 국영 가스 콘체른 "가스프롬"으로 개편된 사건. 세계 최대 천연가스 기업의 출발점이다.',
      startDate: new Date('1989-08-08'),
      startDatePrecision: 'day',
      background:
        '소련 가스공업부(Министерство газовой промышленности)의 자산·인력을 그대로 승계해 국영 콘체른으로 전환했다. 초대 대표는 빅토르 체르노미르딘.',
      aftermath:
        '소련 해체 후 러시아 경제·에너지 안보의 핵심 축으로 성장했으며 유럽 가스 공급의 절대적 비중을 차지하게 되었다.',
      orgRole: 'FOUNDED',
      orgRoleDescription: '이 사건으로 설립된 조직/기업',
      linkHistoryTitle: '국영 가스 콘체른 가스프롬 출범',
      keywords: ['가스프롬', '소련', '천연가스', '국영기업'],
    },
    {
      title: 'RAO 가스프롬 주식회사 전환',
      description:
        '러시아 대통령령·정부결정으로 가스공업부 자산이 러시아주식회사(RAO) 가스프롬으로 전환되며 민영화·증권화의 토대가 마련되었다.',
      startDate: new Date('1993-02-17'),
      startDatePrecision: 'day',
      background: '소련 붕괴 직후 국영 자산을 주식회사로 재편하던 흐름의 일환.',
      aftermath:
        '1990년대 대중 주식 공모와 외국인 지분 제한(링펜스) 구조로 이어져 러시아 최대 상장사가 되었다.',
      orgRole: 'PRINCIPAL',
      orgRoleDescription: '주식회사 전환의 주체',
      linkHistoryTitle: 'RAO 가스프롬으로 주식회사화',
      keywords: ['가스프롬', '민영화', 'RAO'],
    },
    {
      title: '노르드스트림 1 가스관 개통',
      description:
        '러시아 비보르크에서 독일 그라이프스발트까지 발트해 해저를 잇는 1,224km 가스관 노르드스트림 1이 가동을 시작해 우크라이나 경유 없이 유럽에 직접 가스를 공급하기 시작했다.',
      startDate: new Date('2011-11-08'),
      startDatePrecision: 'day',
      location: '발트해 (비보르크–그라이프스발트)',
      background:
        '가스프롬이 주도하고 독일 E.ON·BASF, 네덜란드 Gasunie, 프랑스 GDF Suez가 참여한 컨소시엄이 건설했다.',
      aftermath:
        '유럽의 러시아 가스 의존을 심화시켰고, 훗날 지정학 갈등의 핵심 인프라가 되었다.',
      orgRole: 'PRINCIPAL',
      orgRoleDescription: '가스관 운영 주체',
      keywords: ['가스프롬', '노르드스트림', '파이프라인', '유럽'],
    },
    {
      title: "'시베리아의 힘' 가스관 가동",
      description:
        "가스프롬과 중국 CNPC를 잇는 '시베리아의 힘'(Сила Сибири) 가스관이 가동을 시작했다. 30년간 연 380억㎥를 공급하는 계약에 따라 중국向 수출을 본격화했다.",
      startDate: new Date('2019-12-02'),
      startDatePrecision: 'day',
      location: '동시베리아–중국',
      background:
        '2014년 서방 제재와 유럽 의존 축소 필요성 속에 체결한 4,000억 달러 규모 대중 공급계약의 결실이다.',
      aftermath: '유럽 시장 축소에 대비한 아시아 수출 다변화의 상징이 되었다.',
      orgRole: 'PRINCIPAL',
      orgRoleDescription: '가스관 운영·공급 주체',
      keywords: ['가스프롬', '시베리아의 힘', '중국', 'CNPC'],
    },
    {
      title: '노르드스트림 가스관 폭발 (사보타주)',
      description:
        '노르드스트림 1·2 가스관이 발트해 해저에서 연쇄 폭발로 파손되어 대량의 메탄이 누출되었다. 의도적 사보타주로 규정되었으며 배후를 둘러싼 국제 공방이 이어졌다.',
      startDate: new Date('2022-09-26'),
      startDatePrecision: 'day',
      location: '발트해 (보른홀름섬 인근)',
      background:
        '2022년 러시아의 우크라이나 침공 이후 유럽向 가스 공급이 급감하던 상황에서 발생했다.',
      aftermath: '가스프롬의 대유럽 수송 인프라가 사실상 무력화되었다.',
      orgRole: 'VICTIM',
      orgRoleDescription: '파손된 가스관의 운영사',
      keywords: ['가스프롬', '노르드스트림', '사보타주', '발트해'],
    },
    {
      title: '가스프롬 유럽向 가스 공급 사실상 중단',
      description:
        '러-우 전쟁과 제재 국면에서 가스프롬이 노르드스트림 1 가동을 무기한 중단하는 등 유럽向 파이프라인 가스 공급을 사실상 끊었다.',
      startDate: new Date('2022-09-01'),
      startDatePrecision: 'month',
      location: '유럽',
      background: 'EU의 대러 제재와 러시아의 에너지 무기화 전략이 맞물렸다.',
      aftermath:
        '유럽 에너지 가격 폭등과 LNG·비러시아 공급원으로의 급속한 전환을 촉발했다.',
      orgRole: 'PRINCIPAL',
      orgRoleDescription: '공급 중단 주체',
      keywords: ['가스프롬', '에너지 위기', '제재', '유럽'],
    },
    {
      title: '가스프롬, 1999년 이후 첫 연간 순손실',
      description:
        '가스프롬이 2023 회계연도에 약 6,290억 루블의 순손실을 기록하며 1999년 이후 처음으로 연간 적자를 냈다(2024년 5월 공시).',
      startDate: new Date('2023-12-31'),
      startDatePrecision: 'year',
      background: '유럽 수출 급감과 가스 사업 부문 부진이 겹쳤다.',
      aftermath: '아시아 수출 확대·내수 의존 심화 등 사업 구조 재편 압력이 커졌다.',
      orgRole: 'PRINCIPAL',
      orgRoleDescription: '실적 주체',
      keywords: ['가스프롬', '순손실', '실적', '2023'],
    },
  ]

  for (const e of EVENTS) {
    let evId: string
    const existingEv = await prisma.event.findFirst({
      where: { title: e.title, startDate: e.startDate, deletedAt: null },
      select: { id: true },
    })
    if (existingEv) {
      evId = existingEv.id
      console.log(`    ⏭️  ${e.title} (이미 존재)`)
    } else {
      const created = await prisma.event.create({
        data: {
          title: e.title,
          description: e.description,
          startDate: e.startDate,
          startDatePrecision: e.startDatePrecision ?? 'day',
          endDate: e.endDate,
          location: e.location,
          background: e.background,
          aftermath: e.aftermath,
          keywords: (e.keywords ?? undefined) as any,
          categoryId: economyCategory?.id,
          createdById: admin.id,
        },
        select: { id: true },
      })
      evId = created.id
      console.log(`    ✅ 사건 생성: ${e.title}`)
    }

    // 사건 ↔ 조직(가스프롬) 연결
    const relExists = await prisma.eventOrganizationRelation.findFirst({
      where: { eventId: evId, organizationId: org.id, role: e.orgRole as any },
    })
    if (!relExists) {
      await prisma.eventOrganizationRelation.create({
        data: {
          eventId: evId,
          organizationId: org.id,
          role: e.orgRole as any,
          roleDescription: e.orgRoleDescription,
        },
      })
      console.log(`      ↳ 조직 연결 (${e.orgRole})`)
    }

    // 동일 제목 연혁 항목에 사건 연결
    if (e.linkHistoryTitle) {
      const linked = await prisma.companyHistory.updateMany({
        where: { companyId, title: e.linkHistoryTitle, eventId: null },
        data: { eventId: evId },
      })
      if (linked.count > 0) console.log('      ↳ 연혁 ↔ 사건 연결')
    }
  }
}
