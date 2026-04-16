import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 오브레노비치 왕조 통치 기록 ──────────────────────────────────────
const OBRENOVIĆ_DYNASTY_RULES: {
  countryName: string
  startYear: number
  endYear?: number
  endReason?: string
  notes?: string
}[] = [
  { countryName: '세르비아 공국', startYear: 1817, endYear: 1842, endReason: '카라조르제비치 가문의 쿠데타로 퇴위' },
  { countryName: '세르비아 공국', startYear: 1858, endYear: 1868, endReason: '미하일로 3세 암살로 왕조 일시 지속' },
  { countryName: '세르비아 공국', startYear: 1868, endYear: 1882, endReason: '세르비아 왕국 선포' },
  { countryName: '세르비아 왕국 (근대)', startYear: 1882, endYear: 1903, endReason: '알렉산다르 국왕 암살로 오브레노비치 왕조 단절' },
]

// ── 카라조르제비치 왕조 통치 기록 ────────────────────────────────────
const KARAĐORĐEVIĆ_DYNASTY_RULES: {
  countryName: string
  startYear: number
  endYear?: number
  endReason?: string
  notes?: string
}[] = [
  { countryName: '세르비아 공국', startYear: 1842, endYear: 1858, endReason: '오브레노비치 세력에 의해 퇴위' },
  { countryName: '세르비아 왕국 (근대)', startYear: 1903, endYear: 1918, endReason: '세르비아-크로아티아-슬로베니아 왕국으로 통합' },
  { countryName: '세르비아-크로아티아-슬로베니아 왕국', startYear: 1918, endYear: 1929 },
]

// ── 오브레노비치 왕조 군주 ──────────────────────────────────────────
const OBRENOVIĆ_MONARCHS: string[] = [
  'Miloš I Obrenović',
  'Milan II Obrenović',
  'Mihailo III Obrenović',
  'Milan I of Serbia',
  'Aleksandar Obrenović',
]

// ── 카라조르제비치 왕조 군주 ────────────────────────────────────────
const KARAĐORĐEVIĆ_MONARCHS: string[] = [
  'Aleksandar Karađorđević',
  'Petar I Karađorđević',
]

// ── 부인 인물 ──────────────────────────────────────────────────────
interface PersonEntry {
  name: string
  surname: string
  originalName: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay?: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string
}

const WIVES: PersonEntry[] = [
  // ── 밀로시 1세 왕비 ───────────────────────────────────────────────
  {
    name: '류비차',
    surname: '오브레노비치',
    originalName: 'Ljubica Obrenović',
    biography:
      '세르비아 공국의 초대 공비(公妃). 본성은 불코마노비치(Vukomanović)로 1812년 밀로시 오브레노비치와 결혼하여 세르비아 공비가 되었다. 강인한 성격과 정치적 수완으로 남편을 보좌했으며, 벨그라드의 류비차 공비 저택(Konak kneginje Ljubice)은 지금도 역사 박물관으로 남아 있다. 밀란 2세와 미하일로 3세의 어머니. 1843년 벨그라드에서 사망.',
    birthYear: 1788, birthMonth: 1,
    deathYear: 1843, deathMonth: 5, deathDay: 6,
    gender: 'FEMALE',
  },

  // ── 미하일로 3세 왕비 ─────────────────────────────────────────────
  {
    name: '율리야',
    surname: '후냐디',
    originalName: 'Júlia Hunyady',
    biography:
      '세르비아 공국의 공비. 헝가리 귀족 가문 후냐디 케텔리 가문 출신으로 1853년 미하일로 오브레노비치 3세와 결혼했다. 두 사람 사이에는 자녀가 없었으며 결혼 생활은 불화로 점철되었다. 법적으로 이혼하지 않은 상태에서 별거하였고, 1868년 미하일로가 암살된 후에도 오래 생존하여 1919년 사망했다.',
    birthYear: 1831, birthMonth: 7, birthDay: 4,
    deathYear: 1919, deathMonth: 4, deathDay: 21,
    gender: 'FEMALE',
  },

  // ── 알렉산다르 카라조르제비치 왕비 ───────────────────────────────
  {
    name: '페르시다',
    surname: '네나도비치',
    originalName: 'Persida Nenadović',
    biography:
      '세르비아 공국의 공비. 저명한 세르비아 귀족 가문 네나도비치 출신으로 1830년 알렉산다르 카라조르제비치와 결혼했다. 여러 자녀를 두었으며 그 중 페타르(훗날 페타르 1세 국왕)가 세르비아 왕위를 계승했다. 1873년 사망.',
    birthYear: 1813, birthMonth: 7, birthDay: 19,
    deathYear: 1873, deathMonth: 4, deathDay: 7,
    gender: 'FEMALE',
  },

  // ── 밀란 1세 왕비 ─────────────────────────────────────────────────
  {
    name: '나탈리야',
    surname: '오브레노비치',
    originalName: 'Natalija Obrenović',
    biography:
      '세르비아 왕국의 왕비. 본명 나탈리야 케쇼(Kešco)로 몰다비아(루마니아) 귀족 출신이며 1875년 밀란 1세와 결혼했다. 알렉산다르 왕세자를 낳았다. 밀란 1세와의 관계는 정치적 견해 차이(러시아 친화 vs 오스트리아 친화)로 극도로 악화되었으며 1888년 이혼했다. 이후 벨그라드로 돌아와 아들 알렉산다르와 갈등을 빚기도 했다. 1941년 파리에서 사망.',
    birthYear: 1859, birthMonth: 5, birthDay: 2,
    deathYear: 1941, deathMonth: 5, deathDay: 8,
    gender: 'FEMALE',
  },

  // ── 알렉산다르 국왕 왕비 ──────────────────────────────────────────
  {
    name: '드라가',
    surname: '오브레노비치',
    originalName: 'Draga Obrenović',
    biography:
      '세르비아 왕국의 왕비. 본성은 루니예비차(Lunjevica)이며 첫 남편 마신(Mašin)의 성으로 알려졌다. 왕비 나탈리야의 시녀로 궁정에 들어와 알렉산다르 국왕의 총애를 받았으며, 1900년 국왕과 결혼하여 왕비가 되었다. 서민 출신 과부와의 결혼은 귀족층과 군부의 강한 반발을 샀다. 1903년 5월 쿠데타 때 남편 알렉산다르 국왕과 함께 궁에서 피살되었다.',
    birthYear: 1861, birthMonth: 9, birthDay: 23,
    deathYear: 1903, deathMonth: 6, deathDay: 11,
    gender: 'FEMALE',
  },

  // ── 페타르 1세 왕비 ────────────────────────────────────────────────
  {
    name: '조르카',
    surname: '카라조르제비치',
    originalName: 'Zorka of Montenegro',
    biography:
      '세르비아 왕국 왕비. 몬테네그로 국왕 니콜라 1세(페트로비치-녜고시)의 장녀로 태어나 1883년 페타르 카라조르제비치(훗날 페타르 1세)와 결혼했다. 알렉산다르 1세(훗날 유고슬라비아 국왕)와 게오르기예 왕자를 낳았으나 1890년 26세의 나이에 산욕열로 사망했다.',
    birthYear: 1864, birthMonth: 12, birthDay: 23,
    deathYear: 1890, deathMonth: 3, deathDay: 28,
    gender: 'FEMALE',
  },
]

// ── 부인 가문 정의 ──────────────────────────────────────────────────
const WIFE_DYNASTIES: {
  name: string
  description: string
  startYear: number
  endYear?: number
}[] = [
  {
    name: '불코마노비치 가문',
    description: '세르비아 공국 초대 공비 류비차의 친정 가문. 세르비아 중부 지역 귀족 가문으로, 류비차 오브레노비치 공비를 배출하였다.',
    startYear: 1700,
  },
  {
    name: '후냐디 가문 (케텔리)',
    description: '헝가리 귀족 가문. 세르비아 공국 공비 율리야(미하일로 3세의 왕비)를 배출했다. 헝가리 역사상 유명한 후냐디 야노시 가문과는 별개의 방계 가문이다.',
    startYear: 1500,
  },
  {
    name: '네나도비치 가문',
    description: '세르비아 공국 공비 페르시다의 친정 가문. 세르비아 정교회 사제 집안에서 시작하여 근대 세르비아 독립 운동의 주역이 된 명문 귀족 가문이다.',
    startYear: 1700,
  },
  {
    name: '케쇼 가문 (루마니아)',
    description: '몰다비아(현 루마니아) 귀족 가문. 세르비아 왕국 왕비 나탈리야(밀란 1세의 왕비)의 친정 가문이다.',
    startYear: 1800, endYear: 1950,
  },
  {
    name: '루니예비차 가문',
    description: '세르비아 귀족 가문. 알렉산다르 국왕의 왕비 드라가의 친정 가문이다. 드라가 왕비가 첫 남편 마신의 성으로 알려지기도 했다.',
    startYear: 1800,
  },
  {
    name: '페트로비치-녜고시 가문 (몬테네그로)',
    description: '몬테네그로를 통치한 왕가. 1696년부터 1918년까지 몬테네그로를 지배했다. 세르비아 왕국 왕비 조르카(페타르 1세의 왕비이자 니콜라 1세의 딸)를 배출했다.',
    startYear: 1696, endYear: 1918,
  },
]

// ── 부인 가문 매핑 ──────────────────────────────────────────────────
const WIFE_DYNASTY_MAP: {
  originalName: string
  dynastyName: string
}[] = [
  { originalName: 'Ljubica Obrenović',   dynastyName: '불코마노비치 가문' },
  { originalName: 'Júlia Hunyady',       dynastyName: '후냐디 가문 (케텔리)' },
  { originalName: 'Persida Nenadović',   dynastyName: '네나도비치 가문' },
  { originalName: 'Natalija Obrenović',  dynastyName: '케쇼 가문 (루마니아)' },
  { originalName: 'Draga Obrenović',     dynastyName: '루니예비차 가문' },
  { originalName: 'Zorka of Montenegro', dynastyName: '페트로비치-녜고시 가문 (몬테네그로)' },
]

// ── 결혼 관계 ──────────────────────────────────────────────────────
const MARRIAGES: {
  personA: string
  personB: string
  startYear: number
  startMonth: number
  startDay?: number
  endYear?: number
  endMonth?: number
  note?: string
}[] = [
  {
    personA: 'Miloš I Obrenović',
    personB: 'Ljubica Obrenović',
    startYear: 1812, startMonth: 10,
    endYear: 1843, endMonth: 5,
    note: '류비차 공비 사망으로 혼인 종료.',
  },
  {
    personA: 'Mihailo III Obrenović',
    personB: 'Júlia Hunyady',
    startYear: 1853, startMonth: 9, startDay: 17,
    endYear: 1868, endMonth: 6,
    note: '부부 관계는 파탄났으나 법적으로 이혼하지 않음. 미하일로 암살로 사실상 종료.',
  },
  {
    personA: 'Aleksandar Karađorđević',
    personB: 'Persida Nenadović',
    startYear: 1830, startMonth: 7, startDay: 14,
    endYear: 1873, endMonth: 4,
    note: '페르시다 사망으로 혼인 종료.',
  },
  {
    personA: 'Milan I of Serbia',
    personB: 'Natalija Obrenović',
    startYear: 1875, startMonth: 10, startDay: 17,
    endYear: 1888, endMonth: 10,
    note: '정치적 갈등으로 이혼. 세르비아 왕실 최초의 왕실 이혼.',
  },
  {
    personA: 'Aleksandar Obrenović',
    personB: 'Draga Obrenović',
    startYear: 1900, startMonth: 7, startDay: 23,
    endYear: 1903, endMonth: 6,
    note: '두 사람 모두 5월 쿠데타(1903-06-11)에서 피살되어 혼인 종료.',
  },
  {
    personA: 'Petar I Karađorđević',
    personB: 'Zorka of Montenegro',
    startYear: 1883, startMonth: 11, startDay: 1,
    endYear: 1890, endMonth: 3,
    note: '조르카 왕비 산욕열로 사망하여 혼인 종료.',
  },
]

// ── 부자 관계 ──────────────────────────────────────────────────────
const FATHER_CHILD: { father: string; child: string }[] = [
  { father: 'Miloš I Obrenović',      child: 'Milan II Obrenović' },
  { father: 'Miloš I Obrenović',      child: 'Mihailo III Obrenović' },
  { father: 'Milan I of Serbia',      child: 'Aleksandar Obrenović' },
  { father: 'Aleksandar Karađorđević', child: 'Petar I Karađorđević' },
]

// ── 모자 관계 ──────────────────────────────────────────────────────
const MOTHER_CHILD: { mother: string; child: string }[] = [
  { mother: 'Ljubica Obrenović',  child: 'Milan II Obrenović' },
  { mother: 'Ljubica Obrenović',  child: 'Mihailo III Obrenović' },
  { mother: 'Natalija Obrenović', child: 'Aleksandar Obrenović' },
  { mother: 'Persida Nenadović',  child: 'Petar I Karađorđević' },
]

// ── 인물 소속 국가 ──────────────────────────────────────────────────
const PERSON_AFFILIATION: {
  originalName: string
  historicalCountryName: string
  startYear: number
  endYear?: number
}[] = [
  // 군주
  { originalName: 'Miloš I Obrenović',       historicalCountryName: '세르비아 공국',          startYear: 1817, endYear: 1860 },
  { originalName: 'Milan II Obrenović',       historicalCountryName: '세르비아 공국',          startYear: 1819, endYear: 1839 },
  { originalName: 'Mihailo III Obrenović',    historicalCountryName: '세르비아 공국',          startYear: 1823, endYear: 1868 },
  { originalName: 'Aleksandar Karađorđević',  historicalCountryName: '세르비아 공국',          startYear: 1806, endYear: 1885 },
  { originalName: 'Milan I of Serbia',        historicalCountryName: '세르비아 공국',          startYear: 1854, endYear: 1882 },
  { originalName: 'Milan I of Serbia',        historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1882, endYear: 1901 },
  { originalName: 'Aleksandar Obrenović',     historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1876, endYear: 1903 },
  { originalName: 'Petar I Karađorđević',     historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1844, endYear: 1918 },
  // 왕비
  { originalName: 'Ljubica Obrenović',        historicalCountryName: '세르비아 공국',          startYear: 1788, endYear: 1843 },
  { originalName: 'Júlia Hunyady',            historicalCountryName: '세르비아 공국',          startYear: 1853, endYear: 1868 },
  { originalName: 'Persida Nenadović',        historicalCountryName: '세르비아 공국',          startYear: 1830, endYear: 1873 },
  { originalName: 'Natalija Obrenović',       historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1875, endYear: 1888 },
  { originalName: 'Draga Obrenović',          historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1900, endYear: 1903 },
  { originalName: 'Zorka of Montenegro',      historicalCountryName: '세르비아 왕국 (근대)',   startYear: 1883, endYear: 1890 },
]

export async function seedSerbiaDynasty(prisma: PrismaService): Promise<void> {
  console.log('\n🏰 세르비아 왕조 시딩 시작...')

  // ── 1. 오브레노비치 왕조 생성 ─────────────────────────────────────
  let obrenovićDynasty = await prisma.dynasty.findFirst({ where: { name: '오브레노비치 왕조' } })
  if (!obrenovićDynasty) {
    obrenovićDynasty = await prisma.dynasty.create({
      data: {
        name: '오브레노비치 왕조',
        description:
          '1817년 밀로시 오브레노비치가 세르비아 공국을 창건하면서 시작된 왕조. 1882년 세르비아 왕국 선포 이후까지 오브레노비치 가문과 카라조르제비치 가문이 번갈아 권력을 장악했으며, 1903년 알렉산다르 국왕 부부가 암살되면서 오브레노비치 왕조는 단절되었다.',
        startDate: new Date(1817, 10, 6),
        endDate: new Date(1903, 5, 11),
      },
    })
    console.log('  ✅ 오브레노비치 왕조 생성')
  } else {
    console.log('  ♻️  오브레노비치 왕조 이미 존재')
  }

  // ── 2. 카라조르제비치 왕조 생성 ──────────────────────────────────
  let karađorđevićDynasty = await prisma.dynasty.findFirst({ where: { name: '카라조르제비치 왕조' } })
  if (!karađorđevićDynasty) {
    karađorđevićDynasty = await prisma.dynasty.create({
      data: {
        name: '카라조르제비치 왕조',
        description:
          '제1차 세르비아 봉기(1804)를 이끈 카라조르제(게오르기예 페트로비치)의 후손이 세운 왕조. 세르비아 공국(1842~1858)을 거쳐 1903년 오브레노비치 왕조 단절 이후 세르비아 왕국의 왕가가 되었으며, 유고슬라비아 왕국(1929~1945)까지 지속되었다.',
        startDate: new Date(1842, 8, 14),
      },
    })
    console.log('  ✅ 카라조르제비치 왕조 생성')
  } else {
    console.log('  ♻️  카라조르제비치 왕조 이미 존재')
  }

  // ── 3. 왕조 통치 기록 등록 ──────────────────────────────────────
  console.log('  📋 왕조 통치 기록 등록...')

  for (const rule of OBRENOVIĆ_DYNASTY_RULES) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!hc) {
      console.warn(`    ⚠️  역사 국가 없음: ${rule.countryName}`)
      continue
    }
    const existing = await prisma.dynastyRule.findFirst({
      where: { dynastyId: obrenovićDynasty.id, historicalCountryId: hc.id, startYear: rule.startYear },
    })
    if (!existing) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: obrenovićDynasty.id,
          historicalCountryId: hc.id,
          startEra: 'AD',
          startYear: rule.startYear,
          endEra: rule.endYear ? 'AD' : undefined,
          endYear: rule.endYear,
          endReason: rule.endReason,
          notes: rule.notes,
        },
      })
      console.log(`    ✅ 오브레노비치 → ${rule.countryName} (${rule.startYear})`)
    } else {
      console.log(`    ⏭️  오브레노비치 → ${rule.countryName} (${rule.startYear})`)
    }
  }

  for (const rule of KARAĐORĐEVIĆ_DYNASTY_RULES) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!hc) {
      console.warn(`    ⚠️  역사 국가 없음: ${rule.countryName}`)
      continue
    }
    const existing = await prisma.dynastyRule.findFirst({
      where: { dynastyId: karađorđevićDynasty.id, historicalCountryId: hc.id, startYear: rule.startYear },
    })
    if (!existing) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: karađorđevićDynasty.id,
          historicalCountryId: hc.id,
          startEra: 'AD',
          startYear: rule.startYear,
          endEra: rule.endYear ? 'AD' : undefined,
          endYear: rule.endYear,
          endReason: rule.endReason,
          notes: rule.notes,
        },
      })
      console.log(`    ✅ 카라조르제비치 → ${rule.countryName} (${rule.startYear})`)
    } else {
      console.log(`    ⏭️  카라조르제비치 → ${rule.countryName} (${rule.startYear})`)
    }
  }

  // ── 4. 부인 인물 생성 ─────────────────────────────────────────────
  console.log('  👩 부인 인물 생성...')
  for (const w of WIVES) {
    const existing = await prisma.person.findFirst({ where: { originalName: w.originalName } })
    if (existing) {
      console.log(`    ⏭️  ${w.originalName}`)
    } else {
      await prisma.person.create({
        data: {
          name: w.name,
          surname: w.surname,
          originalName: w.originalName,
          biography: w.biography,
          birthDate: new Date(w.birthYear, (w.birthMonth ?? 1) - 1, w.birthDay ?? 1),
          birthEra: 'AD',
          deathDate: w.deathYear
            ? new Date(w.deathYear, (w.deathMonth ?? 1) - 1, w.deathDay ?? 1)
            : undefined,
          deathEra: w.deathYear ? 'AD' : undefined,
          gender: w.gender as any,
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`    ✅ ${w.originalName}`)
    }
  }

  // ── 5. 군주 → 오브레노비치 왕조 연결 ────────────────────────────
  console.log('  🔗 군주-왕조 연결...')
  for (const originalName of OBRENOVIĆ_MONARCHS) {
    const person = await prisma.person.findFirst({ where: { originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${originalName}`); continue }
    if (person.dynastyId !== obrenovićDynasty.id) {
      await prisma.person.update({ where: { id: person.id }, data: { dynastyId: obrenovićDynasty.id } })
      console.log(`    ✅ ${originalName} → 오브레노비치 왕조`)
    } else {
      console.log(`    ⏭️  ${originalName}`)
    }
  }
  for (const originalName of KARAĐORĐEVIĆ_MONARCHS) {
    const person = await prisma.person.findFirst({ where: { originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${originalName}`); continue }
    if (person.dynastyId !== karađorđevićDynasty.id) {
      await prisma.person.update({ where: { id: person.id }, data: { dynastyId: karađorđevićDynasty.id } })
      console.log(`    ✅ ${originalName} → 카라조르제비치 왕조`)
    } else {
      console.log(`    ⏭️  ${originalName}`)
    }
  }

  // ── 6. 부인 출신 가문 생성 ──────────────────────────────────────
  console.log('  🏛️  부인 출신 가문 생성...')
  const dynastyIdMap = new Map<string, string>()
  for (const wd of WIFE_DYNASTIES) {
    let d = await prisma.dynasty.findFirst({ where: { name: wd.name } })
    if (!d) {
      d = await prisma.dynasty.create({
        data: {
          name: wd.name,
          description: wd.description,
          startDate: new Date(wd.startYear, 0, 1),
          endDate: wd.endYear ? new Date(wd.endYear, 11, 31) : undefined,
        },
      })
      console.log(`    ✅ ${wd.name}`)
    } else {
      console.log(`    ⏭️  ${wd.name}`)
    }
    dynastyIdMap.set(wd.name, d.id)
  }

  // ── 7. 부인 → 출신 가문 연결 ────────────────────────────────────
  for (const map of WIFE_DYNASTY_MAP) {
    const person = await prisma.person.findFirst({ where: { originalName: map.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${map.originalName}`); continue }
    const dynastyId = dynastyIdMap.get(map.dynastyName)
    if (!dynastyId) { console.warn(`    ⚠️  가문 없음: ${map.dynastyName}`); continue }
    if (person.dynastyId !== dynastyId) {
      await prisma.person.update({ where: { id: person.id }, data: { dynastyId } })
      console.log(`    ✅ ${map.originalName} → ${map.dynastyName}`)
    } else {
      console.log(`    ⏭️  ${map.originalName}`)
    }
  }

  // ── 8. 결혼 관계 등록 ─────────────────────────────────────────────
  console.log('  💍 결혼 관계 등록...')
  for (const m of MARRIAGES) {
    const personA = await prisma.person.findFirst({ where: { originalName: m.personA } })
    const personB = await prisma.person.findFirst({ where: { originalName: m.personB } })
    if (!personA) { console.warn(`    ⚠️  인물 없음: ${m.personA}`); continue }
    if (!personB) { console.warn(`    ⚠️  인물 없음: ${m.personB}`); continue }

    const startDate = new Date(m.startYear, m.startMonth - 1, m.startDay ?? 1)
    const endDate = m.endYear ? new Date(m.endYear, (m.endMonth ?? 1) - 1, 1) : undefined

    const existingAB = await prisma.personSpouse.findFirst({
      where: { personId: personA.id, spouseId: personB.id },
    })
    if (!existingAB) {
      await prisma.personSpouse.create({
        data: { personId: personA.id, spouseId: personB.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    const existingBA = await prisma.personSpouse.findFirst({
      where: { personId: personB.id, spouseId: personA.id },
    })
    if (!existingBA) {
      await prisma.personSpouse.create({
        data: { personId: personB.id, spouseId: personA.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    if (!existingAB || !existingBA) {
      console.log(`    ✅ ${m.personA} ↔ ${m.personB}`)
    } else {
      console.log(`    ⏭️  ${m.personA} ↔ ${m.personB}`)
    }
  }

  // ── 9. 부자 관계 등록 ─────────────────────────────────────────────
  console.log('  👨 부자/모자 관계 등록...')
  for (const fc of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: fc.father } })
    const child = await prisma.person.findFirst({ where: { originalName: fc.child } })
    if (!father) { console.warn(`    ⚠️  인물 없음: ${fc.father}`); continue }
    if (!child) { console.warn(`    ⚠️  인물 없음: ${fc.child}`); continue }
    if (child.fatherId !== father.id) {
      await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
      console.log(`    ✅ 부: ${fc.father} → ${fc.child}`)
    } else {
      console.log(`    ⏭️  부: ${fc.father} → ${fc.child}`)
    }
  }
  for (const mc of MOTHER_CHILD) {
    const mother = await prisma.person.findFirst({ where: { originalName: mc.mother } })
    const child = await prisma.person.findFirst({ where: { originalName: mc.child } })
    if (!mother) { console.warn(`    ⚠️  인물 없음: ${mc.mother}`); continue }
    if (!child) { console.warn(`    ⚠️  인물 없음: ${mc.child}`); continue }
    if (child.motherId !== mother.id) {
      await prisma.person.update({ where: { id: child.id }, data: { motherId: mother.id } })
      console.log(`    ✅ 모: ${mc.mother} → ${mc.child}`)
    } else {
      console.log(`    ⏭️  모: ${mc.mother} → ${mc.child}`)
    }
  }

  // ── 10. 인물 소속 국가 등록 ──────────────────────────────────────
  console.log('  🗺️  인물 소속 국가 등록...')
  for (const aff of PERSON_AFFILIATION) {
    const person = await prisma.person.findFirst({ where: { originalName: aff.originalName } })
    if (!person) { console.warn(`    ⚠️  인물 없음: ${aff.originalName}`); continue }

    const hc = await prisma.historicalCountry.findFirst({ where: { name: aff.historicalCountryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${aff.historicalCountryName}`); continue }

    const existing = await prisma.personCountryAffiliation.findFirst({
      where: { personId: person.id, historicalCountryId: hc.id },
    })
    if (!existing) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId: person.id,
          historicalCountryId: hc.id,
          affiliationType: 'CITIZENSHIP',
          startDate: new Date(aff.startYear, 0, 1),
          endDate: aff.endYear ? new Date(aff.endYear, 11, 31) : undefined,
          priority: 0,
        },
      })
      console.log(`    ✅ ${aff.originalName} → ${aff.historicalCountryName}`)
    } else {
      console.log(`    ⏭️  ${aff.originalName} → ${aff.historicalCountryName}`)
    }
  }

  console.log('✅ 세르비아 왕조 시딩 완료\n')
}
