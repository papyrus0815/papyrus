import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 부인 출신 가문 정의 ──────────────────────────────────────────────
const WIFE_DYNASTIES: {
  name: string
  description: string
  startYear: number
  endYear?: number
}[] = [
  {
    name: '헤센 가문 (헤센-다름슈타트)',
    description: '헤센-다름슈타트 방백가. 신성로마제국의 방백 가문으로 헤센 지역 남부를 통치했다. 루트비히 왕조라고도 불리며, 나중에 헤센 대공국을 통치했다.',
    startYear: 1509, endYear: 1918,
  },
  {
    name: '메클렌부르크 가문 (메클렌부르크-슈트렐리츠)',
    description: '메클렌부르크-슈트렐리츠 공작가. 북독일 메클렌부르크 지역을 통치한 공작 가문으로 1701년 분가 이후 슈트렐리츠 지선이 독립했다.',
    startYear: 1701, endYear: 1918,
  },
  {
    name: '비텔스바흐 가문',
    description: '바이에른을 수 세기 동안 통치한 독일 최고 명문 가문 중 하나. 바이에른 공국·선제후국·왕국을 지배했으며 팔츠도 통치했다.',
    startYear: 1180, endYear: 1918,
  },
  {
    name: '베틴 가문 (작센-바이마르-아이제나흐)',
    description: '작센-바이마르-아이제나흐 대공가. 베틴 가문의 에른스트 계열로 괴테의 후원자였던 카를 아우구스트가 대표적 통치자다.',
    startYear: 1485, endYear: 1918,
  },
  {
    name: '작센-코부르크-고타 가문',
    description: '영국 빅토리아 여왕의 가문. 베틴 가문의 방계로 영국·벨기에·포르투갈·불가리아 왕실에 군주를 배출한 유럽 최강 왕실 외교 가문이다.',
    startYear: 1826, endYear: 1917,
  },
  {
    name: '슐레스비히-홀슈타인-존더부르크-아우구스텐부르크 가문',
    description: '올덴부르크 가문의 방계. 슐레스비히-홀슈타인 지역의 공작 가문으로 1864년 덴마크-프로이센 전쟁 이후 지위를 상실했다.',
    startYear: 1627, endYear: 1931,
  },
  {
    name: '로이스 가문',
    description: '튜링겐 지방의 소규모 제후 가문. 남성 구성원 전원을 "하인리히"라고 이름 짓는 전통으로 유명하다.',
    startYear: 1232, endYear: 1918,
  },
]

// ── 부인별 가문 매핑 ─────────────────────────────────────────────────
const WIFE_DYNASTY_MAP: {
  originalName: string
  dynastyName: string
}[] = [
  { originalName: 'Friederike Luise of Hesse-Darmstadt', dynastyName: '헤센 가문 (헤센-다름슈타트)' },
  { originalName: 'Luise of Mecklenburg-Strelitz',       dynastyName: '메클렌부르크 가문 (메클렌부르크-슈트렐리츠)' },
  { originalName: 'Elisabeth Ludovika of Bavaria',       dynastyName: '비텔스바흐 가문' },
  { originalName: 'Augusta of Saxe-Weimar-Eisenach',     dynastyName: '베틴 가문 (작센-바이마르-아이제나흐)' },
  { originalName: 'Victoria, Princess Royal',            dynastyName: '작센-코부르크-고타 가문' },
  { originalName: 'Augusta Victoria of Schleswig-Holstein', dynastyName: '슐레스비히-홀슈타인-존더부르크-아우구스텐부르크 가문' },
  { originalName: 'Hermine of Reuss',                    dynastyName: '로이스 가문' },
]

// ── 부인 출신 국가 소속 ─────────────────────────────────────────────
// historicalCountryName 이 null 이면 현대 국가(영국) 사용
const WIFE_AFFILIATION: {
  originalName: string
  historicalCountryName?: string
  modernCountryIso?: string   // 현대 국가 isoCode
  startYear: number
  endYear?: number
}[] = [
  {
    originalName: 'Friederike Luise of Hesse-Darmstadt',
    historicalCountryName: '헤센-다름슈타트 방백령',
    startYear: 1751, endYear: 1805,
  },
  {
    originalName: 'Luise of Mecklenburg-Strelitz',
    historicalCountryName: '프로이센 왕국',  // 메클렌부르크-슈트렐리츠는 미등록 → 결혼 후 프로이센으로
    startYear: 1793, endYear: 1810,
  },
  {
    originalName: 'Elisabeth Ludovika of Bavaria',
    historicalCountryName: '바이에른 왕국',
    startYear: 1801, endYear: 1873,
  },
  {
    originalName: 'Augusta of Saxe-Weimar-Eisenach',
    historicalCountryName: '프로이센 왕국',
    startYear: 1829, endYear: 1890,
  },
  {
    originalName: 'Victoria, Princess Royal',
    modernCountryIso: 'GB',
    startYear: 1840, endYear: 1858,
  },
  {
    originalName: 'Augusta Victoria of Schleswig-Holstein',
    historicalCountryName: '독일 제국',
    startYear: 1881, endYear: 1921,
  },
  {
    originalName: 'Hermine of Reuss',
    historicalCountryName: '독일 제국',  // 출생 시 독일 제국 내
    startYear: 1887, endYear: 1918,
  },
]

// ── 군주 소속 국가 ──────────────────────────────────────────────────
const MONARCH_AFFILIATION: {
  originalName: string
  historicalCountryName: string
  startYear: number
  endYear?: number
}[] = [
  { originalName: 'Friedrich Wilhelm II of Prussia', historicalCountryName: '프로이센 왕국', startYear: 1744, endYear: 1797 },
  { originalName: 'Friedrich Wilhelm III',           historicalCountryName: '프로이센 왕국', startYear: 1770, endYear: 1840 },
  { originalName: 'Friedrich Wilhelm IV',            historicalCountryName: '프로이센 왕국', startYear: 1795, endYear: 1861 },
  { originalName: 'Wilhelm I',                       historicalCountryName: '프로이센 왕국', startYear: 1797, endYear: 1888 },
  { originalName: 'Wilhelm I',                       historicalCountryName: '독일 제국',    startYear: 1871, endYear: 1888 },
  { originalName: 'Friedrich III',                   historicalCountryName: '프로이센 왕국', startYear: 1831, endYear: 1888 },
  { originalName: 'Friedrich III',                   historicalCountryName: '독일 제국',    startYear: 1871, endYear: 1888 },
  { originalName: 'Wilhelm II',                      historicalCountryName: '프로이센 왕국', startYear: 1859, endYear: 1918 },
  { originalName: 'Wilhelm II',                      historicalCountryName: '독일 제국',    startYear: 1888, endYear: 1918 },
]

export async function seedWiveDynasties(prisma: PrismaService): Promise<void> {
  console.log('\n👸 부인 출신 가문 및 국가 소속 시딩 시작...')

  // ── 1. 출신 가문 생성 ────────────────────────────────────────────
  console.log('\n  🏰 출신 가문 생성...')
  const dynastyIdMap = new Map<string, string>()

  for (const d of WIFE_DYNASTIES) {
    let dynasty = await prisma.dynasty.findFirst({ where: { name: d.name } })
    if (!dynasty) {
      dynasty = await prisma.dynasty.create({
        data: {
          name: d.name,
          description: d.description,
          startDate: new Date(d.startYear, 0, 1),
          endDate: d.endYear ? new Date(d.endYear, 11, 31) : undefined,
        },
      })
      console.log(`    ✅ ${d.name}`)
    } else {
      console.log(`    ♻️  ${d.name}`)
    }
    dynastyIdMap.set(d.name, dynasty.id)
  }

  // ── 2. 부인 dynastyId 수정 ──────────────────────────────────────
  console.log('\n  💍 부인 가문 연결 수정...')
  for (const m of WIFE_DYNASTY_MAP) {
    const person = await prisma.person.findFirst({ where: { originalName: m.originalName } })
    const dynastyId = dynastyIdMap.get(m.dynastyName)
    if (!person || !dynastyId) {
      console.warn(`    ⚠️  없음: ${m.originalName} / ${m.dynastyName}`)
      continue
    }
    if (person.dynastyId) {
      console.log(`    ⏭️  ${m.originalName} (가문 이미 연결됨)`)
      continue
    }
    await prisma.person.update({
      where: { id: person.id },
      data: { dynastyId },
    })
    console.log(`    ✅ ${m.originalName} → ${m.dynastyName}`)
  }

  // ── 3. 부인 소속 국가 등록 ──────────────────────────────────────
  console.log('\n  🌍 부인 소속 국가 등록...')
  for (const a of WIFE_AFFILIATION) {
    const person = await prisma.person.findFirst({ where: { originalName: a.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${a.originalName}`); continue }

    let historicalCountryId: string | undefined
    let countryId: string | undefined

    if (a.historicalCountryName) {
      const hc = await prisma.historicalCountry.findFirst({ where: { name: a.historicalCountryName } })
      if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${a.historicalCountryName}`); continue }
      historicalCountryId = hc.id
    } else if (a.modernCountryIso) {
      const c = await prisma.country.findFirst({ where: { isoCode: a.modernCountryIso } })
      if (!c) { console.warn(`    ⚠️  현대 국가 없음: ${a.modernCountryIso}`); continue }
      countryId = c.id
    }

    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: person.id,
        ...(historicalCountryId ? { historicalCountryId } : {}),
        ...(countryId ? { countryId } : {}),
      },
    })
    if (!exists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: person.id,
          historicalCountryId,
          countryId,
          affiliationType: 'CITIZENSHIP',
          startDate: new Date(a.startYear, 0, 1),
          endDate: a.endYear ? new Date(a.endYear, 11, 31) : undefined,
          priority: 0,
        },
      })
      console.log(`    ✅ ${a.originalName} → ${a.historicalCountryName ?? a.modernCountryIso}`)
    } else {
      console.log(`    ♻️  ${a.originalName} → ${a.historicalCountryName ?? a.modernCountryIso}`)
    }
  }

  // ── 4. 군주 소속 국가 등록 ──────────────────────────────────────
  console.log('\n  👑 군주 소속 국가 등록...')
  for (const a of MONARCH_AFFILIATION) {
    const person = await prisma.person.findFirst({ where: { originalName: a.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${a.originalName}`); continue }

    const hc = await prisma.historicalCountry.findFirst({ where: { name: a.historicalCountryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${a.historicalCountryName}`); continue }

    const exists = await prisma.personCountryAffiliation.findFirst({
      where: { personId: person.id, historicalCountryId: hc.id },
    })
    if (!exists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: person.id,
          historicalCountryId: hc.id,
          affiliationType: 'CITIZENSHIP',
          startDate: new Date(a.startYear, 0, 1),
          endDate: a.endYear ? new Date(a.endYear, 11, 31) : undefined,
          priority: 0,
        },
      })
      console.log(`    ✅ ${a.originalName} → ${a.historicalCountryName}`)
    } else {
      console.log(`    ♻️  ${a.originalName} → ${a.historicalCountryName}`)
    }
  }

  console.log('\n✅ 부인 출신 가문 및 국가 소속 시딩 완료\n')
}
