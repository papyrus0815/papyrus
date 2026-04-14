import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// ── 로마노프 가문 통치 기록 ─────────────────────────────────────────
const DYNASTY_RULES: {
  countryName: string
  startYear: number
  endYear?: number
  endReason?: string
  notes?: string
}[] = [
  { countryName: '러시아 차르국', startYear: 1613, endYear: 1721, endReason: '제국으로 승격', notes: '미하일 로마노프 즉위로 로마노프 왕조 시작.' },
  { countryName: '러시아 제국', startYear: 1721, endYear: 1917, endReason: '2월 혁명으로 니콜라이 2세 퇴위, 제국 붕괴' },
]

// ── 황후 (여황제 제외) 인물 정의 ─────────────────────────────────────
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

const ADDITIONAL_PERSONS: PersonEntry[] = [
  // ── 파벨 1세의 황후 ──────────────────────────────────────────────
  {
    name: '마리아 표도로브나',
    surname: '뷔르템베르크',
    originalName: 'Maria Fyodorovna of Russia (Paul I)',
    biography:
      '러시아 제국 황후. 뷔르템베르크 공국의 소피아 도로테아 공녀로 태어나 파벨 1세의 두 번째 황후(1776)가 되면서 정교회로 개종해 마리아 표도로브나라는 이름을 받았다. 파벨 1세 암살 후에도 오래 살아 알렉산드르 1세와 니콜라이 1세를 비롯한 10명의 자녀를 낳았다. 자선·교육 사업에 헌신하며 "마리아 공로 기관"을 설립했다.',
    birthYear: 1759, birthMonth: 10, birthDay: 25,
    deathYear: 1828, deathMonth: 10, deathDay: 24,
    gender: 'FEMALE',
  },
  // ── 알렉산드르 1세의 황후 ─────────────────────────────────────────
  {
    name: '엘리자베타 알렉세예브나',
    surname: '바덴',
    originalName: 'Elizaveta Alexeievna of Russia',
    biography:
      '러시아 제국 황후. 바덴 변경백국의 루이제 마리 아우구스테 공녀로 태어나 알렉산드르 1세와 결혼(1793)하며 정교회로 개종했다. 총명하고 교양 있는 황후였으나 남편 알렉산드르 1세와의 사이는 소원했다. 남편의 타간로크 사망 후 귀환 중 갑자기 사망했다.',
    birthYear: 1779, birthMonth: 1, birthDay: 24,
    deathYear: 1826, deathMonth: 5, deathDay: 16,
    gender: 'FEMALE',
  },
  // ── 니콜라이 1세의 황후 ──────────────────────────────────────────
  {
    name: '알렉산드라 표도로브나',
    surname: '호엔촐레른',
    originalName: 'Alexandra Fyodorovna of Russia (Nicholas I)',
    biography:
      '러시아 제국 황후. 프로이센 왕 프리드리히 빌헬름 3세의 딸 샤를로테 공녀로 태어나 니콜라이 1세와 결혼(1817)하며 정교회로 개종했다. 니콜라이 1세의 헌신적인 반려자로 알렉산드르 2세를 포함한 7명의 자녀를 낳았다. 러시아 궁정 문화와 예술 후원에 기여했으며 남편보다 5년 먼저 사망했다.',
    birthYear: 1798, birthMonth: 7, birthDay: 13,
    deathYear: 1860, deathMonth: 11, deathDay: 1,
    gender: 'FEMALE',
  },
  // ── 알렉산드르 2세의 첫 번째 황후 ────────────────────────────────
  {
    name: '마리아 알렉산드로브나',
    surname: '헤센',
    originalName: 'Maria Alexandrovna of Russia',
    biography:
      '러시아 제국 황후. 헤센 대공국의 마리 공녀로 태어나 알렉산드르 2세와 결혼(1841)하며 정교회로 개종했다. 알렉산드르 3세를 포함한 8명의 자녀를 낳았다. 독실한 정교회 신자이자 자선 사업가로 러시아 적십자 설립을 지원했다. 말년에는 남편의 불륜 관계(예카테리나 돌고루코바)로 심적 고통을 받았으며 1880년 폐결핵으로 사망했다.',
    birthYear: 1824, birthMonth: 8, birthDay: 8,
    deathYear: 1880, deathMonth: 6, deathDay: 3,
    gender: 'FEMALE',
  },
  // ── 알렉산드르 2세의 두 번째(귀천상혼) 황후 ─────────────────────
  {
    name: '예카테리나 유리예브스카야',
    surname: '돌고루코바',
    originalName: 'Ekaterina Dolgorukova',
    biography:
      '러시아 제국 황제 알렉산드르 2세의 귀천상혼 황후. 러시아 귀족 돌고루코프 가문 출신으로 알렉산드르 2세의 오랜 연인이었다. 마리아 알렉산드로브나 황후 사망 후 1880년 7월 알렉산드르 2세와 귀천상혼(귀족과 평민 간 비공식 혼인)을 치러 "유리예프스카야 공주" 칭호를 받았다. 1881년 황제 암살 후 자녀들과 함께 유럽으로 떠났으며 1922년 니스에서 사망했다.',
    birthYear: 1847, birthMonth: 11, birthDay: 14,
    deathYear: 1922, deathMonth: 2, deathDay: 15,
    gender: 'FEMALE',
  },
  // ── 알렉산드르 3세의 황후 ─────────────────────────────────────────
  {
    name: '마리아 표도로브나',
    surname: '글뤽스부르크',
    originalName: 'Maria Fyodorovna of Russia (Alexander III)',
    biography:
      '러시아 제국 황후. 덴마크 왕 크리스티안 9세의 딸 닥마르 공녀로 태어나 알렉산드르 3세와 결혼(1866)하며 정교회로 개종했다. 니콜라이 2세를 포함한 6명의 자녀를 낳았다. 남편 사망 후에도 러시아에 머물며 황후 대비 역할을 했다. 1917년 혁명 후 덴마크로 망명, 1928년 덴마크에서 사망했다. 영국 알렉산드라 왕비의 친자매.',
    birthYear: 1847, birthMonth: 11, birthDay: 26,
    deathYear: 1928, deathMonth: 10, deathDay: 13,
    gender: 'FEMALE',
  },
  // ── 니콜라이 2세의 황후 ───────────────────────────────────────────
  {
    name: '알렉산드라 표도로브나',
    surname: '헤센',
    originalName: 'Alexandra Fyodorovna of Russia (Nicholas II)',
    biography:
      '러시아 제국 마지막 황후. 헤센-다름슈타트 대공국의 알릭스 공녀로 태어나 니콜라이 2세와 결혼(1894)하며 정교회로 개종했다. 영국 빅토리아 여왕의 외손녀. 황태자 알렉세이의 혈우병 치료를 위해 괴승 라스푸틴에 의존해 정치에 개입하면서 황실의 권위를 실추시켰다. 1917년 혁명 후 남편·자녀들과 함께 유배되었다가 1918년 7월 예카테린부르크에서 볼셰비키에 의해 처형되었다. 2000년 러시아 정교회에 의해 순교 성인으로 시성되었다.',
    birthYear: 1872, birthMonth: 6, birthDay: 6,
    deathYear: 1918, deathMonth: 7, deathDay: 17,
    gender: 'FEMALE',
  },
]

// ── 황후 출신 가문 ──────────────────────────────────────────────────
const WIFE_DYNASTIES: {
  name: string
  description: string
  startYear: number
  endYear?: number
}[] = [
  {
    name: '뷔르템베르크 가문',
    description: '독일 남부 뷔르템베르크 지역을 통치한 왕가. 1495년 공국으로 승격, 1806년 왕국이 되었다. 나폴레옹 전쟁 후 독일 동맹 일원이 되었으며 1918년 독일 혁명으로 왕정이 폐지되었다. 파벨 1세의 황후 마리아 표도로브나(소피아 도로테아)를 배출했다.',
    startYear: 1080, endYear: 1918,
  },
  {
    name: '바덴 가문 (자링겐)',
    description: '독일 남서부 바덴 지역을 통치한 가문. 자링겐 왕가의 후손으로 변경백령, 대공국을 거쳐 1918년까지 바덴 대공국을 통치했다. 알렉산드르 1세의 황후 엘리자베타 알렉세예브나(루이제 마리 공녀)를 배출했다.',
    startYear: 1112, endYear: 1918,
  },
  {
    name: '헤센-다름슈타트 대공 가문',
    description: '독일 헤센 지방 남부를 통치한 대공 가문. 헤센-다름슈타트 방백령에서 출발해 1806년 헤센 대공국이 되었다. 알렉산드르 2세의 황후 마리아 알렉산드로브나(마리 공녀)와 니콜라이 2세의 황후 알렉산드라 표도로브나(알릭스 공녀)를 배출했다.',
    startYear: 1509, endYear: 1918,
  },
  {
    name: '돌고루코프 가문',
    description: '러시아 류리크 왕조 계열의 오랜 귀족 가문. 중세 루스 시대부터 이어진 명문 귀족으로 여러 시대에 걸쳐 군사·정치적 영향력을 행사했다. 알렉산드르 2세의 귀천상혼 황후 예카테리나 돌고루코바(유리예프스카야 공주)를 배출했다.',
    startYear: 1200,
  },
  {
    name: '슐레스비히-홀슈타인-존더부르크-글뤽스부르크 가문 (덴마크)',
    description: '올덴부르크 가문의 방계로 1863년부터 덴마크 왕실을 형성한 가문. 덴마크, 노르웨이, 그리스 왕위를 차지했다. 알렉산드르 3세의 황후 마리아 표도로브나(닥마르 공녀)와 영국 알렉산드라 왕비를 배출했다.',
    startYear: 1825,
  },
]

// ── 황후 가문 매핑 ──────────────────────────────────────────────────
const WIFE_DYNASTY_MAP: {
  originalName: string
  dynastyName: string
}[] = [
  { originalName: 'Maria Fyodorovna of Russia (Paul I)',       dynastyName: '뷔르템베르크 가문' },
  { originalName: 'Elizaveta Alexeievna of Russia',           dynastyName: '바덴 가문 (자링겐)' },
  { originalName: 'Alexandra Fyodorovna of Russia (Nicholas I)', dynastyName: '호엔촐레른 가문' }, // 기존 가문 참조
  { originalName: 'Maria Alexandrovna of Russia',             dynastyName: '헤센-다름슈타트 대공 가문' },
  { originalName: 'Ekaterina Dolgorukova',                    dynastyName: '돌고루코프 가문' },
  { originalName: 'Maria Fyodorovna of Russia (Alexander III)', dynastyName: '슐레스비히-홀슈타인-존더부르크-글뤽스부르크 가문 (덴마크)' },
  { originalName: 'Alexandra Fyodorovna of Russia (Nicholas II)', dynastyName: '헤센-다름슈타트 대공 가문' },
]

// ── 황후 소속 국가 ──────────────────────────────────────────────────
const WIFE_AFFILIATION: {
  originalName: string
  historicalCountryName?: string
  modernCountryIso?: string
  startYear: number
  endYear?: number
}[] = [
  { originalName: 'Maria Fyodorovna of Russia (Paul I)',       historicalCountryName: '러시아 제국', startYear: 1776, endYear: 1828 },
  { originalName: 'Elizaveta Alexeievna of Russia',           historicalCountryName: '러시아 제국', startYear: 1793, endYear: 1826 },
  { originalName: 'Alexandra Fyodorovna of Russia (Nicholas I)', historicalCountryName: '러시아 제국', startYear: 1817, endYear: 1860 },
  { originalName: 'Maria Alexandrovna of Russia',             historicalCountryName: '러시아 제국', startYear: 1841, endYear: 1880 },
  { originalName: 'Ekaterina Dolgorukova',                    historicalCountryName: '러시아 제국', startYear: 1847, endYear: 1881 },
  { originalName: 'Maria Fyodorovna of Russia (Alexander III)', historicalCountryName: '러시아 제국', startYear: 1866, endYear: 1917 },
  { originalName: 'Alexandra Fyodorovna of Russia (Nicholas II)', historicalCountryName: '러시아 제국', startYear: 1894, endYear: 1917 },
]

// ── 황제 소속 국가 ──────────────────────────────────────────────────
const MONARCH_AFFILIATION: {
  originalName: string
  historicalCountryName: string
  startYear: number
  endYear?: number
}[] = [
  { originalName: 'Peter I of Russia',        historicalCountryName: '러시아 제국', startYear: 1672, endYear: 1725 },
  { originalName: 'Catherine I of Russia',    historicalCountryName: '러시아 제국', startYear: 1684, endYear: 1727 },
  { originalName: 'Peter II of Russia',       historicalCountryName: '러시아 제국', startYear: 1715, endYear: 1730 },
  { originalName: 'Anna of Russia',           historicalCountryName: '러시아 제국', startYear: 1693, endYear: 1740 },
  { originalName: 'Ivan VI of Russia',        historicalCountryName: '러시아 제국', startYear: 1740, endYear: 1764 },
  { originalName: 'Elizabeth of Russia',      historicalCountryName: '러시아 제국', startYear: 1709, endYear: 1762 },
  { originalName: 'Peter III of Russia',      historicalCountryName: '러시아 제국', startYear: 1728, endYear: 1762 },
  { originalName: 'Catherine II of Russia',   historicalCountryName: '러시아 제국', startYear: 1729, endYear: 1796 },
  { originalName: 'Paul I of Russia',         historicalCountryName: '러시아 제국', startYear: 1754, endYear: 1801 },
  { originalName: 'Alexander I of Russia',    historicalCountryName: '러시아 제국', startYear: 1777, endYear: 1825 },
  { originalName: 'Nicholas I of Russia',     historicalCountryName: '러시아 제국', startYear: 1796, endYear: 1855 },
  { originalName: 'Alexander II of Russia',   historicalCountryName: '러시아 제국', startYear: 1818, endYear: 1881 },
  { originalName: 'Alexander III of Russia',  historicalCountryName: '러시아 제국', startYear: 1845, endYear: 1894 },
  { originalName: 'Nicholas II of Russia',    historicalCountryName: '러시아 제국', startYear: 1868, endYear: 1918 },
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
    personA: 'Peter I of Russia',
    personB: 'Catherine I of Russia',
    startYear: 1712, startMonth: 2, startDay: 19,
    endYear: 1725, endMonth: 2,
    note: '표트르 대제 사망으로 혼인 종료.',
  },
  {
    personA: 'Peter III of Russia',
    personB: 'Catherine II of Russia',
    startYear: 1745, startMonth: 8, startDay: 21,
    endYear: 1762, endMonth: 7,
    note: '예카테리나 2세 쿠데타로 표트르 3세 폐위 및 사망으로 혼인 종료.',
  },
  {
    personA: 'Paul I of Russia',
    personB: 'Maria Fyodorovna of Russia (Paul I)',
    startYear: 1776, startMonth: 10, startDay: 7,
    endYear: 1801, endMonth: 3,
    note: '파벨 1세 암살로 혼인 종료.',
  },
  {
    personA: 'Alexander I of Russia',
    personB: 'Elizaveta Alexeievna of Russia',
    startYear: 1793, startMonth: 10, startDay: 9,
    endYear: 1825, endMonth: 12,
    note: '알렉산드르 1세 사망으로 혼인 종료.',
  },
  {
    personA: 'Nicholas I of Russia',
    personB: 'Alexandra Fyodorovna of Russia (Nicholas I)',
    startYear: 1817, startMonth: 7, startDay: 13,
    endYear: 1860, endMonth: 11,
    note: '알렉산드라 황후 사망으로 혼인 종료.',
  },
  {
    personA: 'Alexander II of Russia',
    personB: 'Maria Alexandrovna of Russia',
    startYear: 1841, startMonth: 4, startDay: 28,
    endYear: 1880, endMonth: 6,
    note: '마리아 알렉산드로브나 황후 사망으로 혼인 종료.',
  },
  {
    personA: 'Alexander II of Russia',
    personB: 'Ekaterina Dolgorukova',
    startYear: 1880, startMonth: 7, startDay: 18,
    endYear: 1881, endMonth: 3,
    note: '귀천상혼. 알렉산드르 2세 암살로 혼인 종료.',
  },
  {
    personA: 'Alexander III of Russia',
    personB: 'Maria Fyodorovna of Russia (Alexander III)',
    startYear: 1866, startMonth: 11, startDay: 9,
    endYear: 1894, endMonth: 11,
    note: '알렉산드르 3세 사망으로 혼인 종료.',
  },
  {
    personA: 'Nicholas II of Russia',
    personB: 'Alexandra Fyodorovna of Russia (Nicholas II)',
    startYear: 1894, startMonth: 11, startDay: 26,
    endYear: 1918, endMonth: 7,
    note: '니콜라이 2세 처형으로 혼인 종료.',
  },
]

// ── 부자 관계 ──────────────────────────────────────────────────────
const FATHER_CHILD: { father: string; child: string }[] = [
  { father: 'Peter I of Russia',       child: 'Elizabeth of Russia' },
  { father: 'Peter III of Russia',     child: 'Paul I of Russia' },
  { father: 'Paul I of Russia',        child: 'Alexander I of Russia' },
  { father: 'Paul I of Russia',        child: 'Nicholas I of Russia' },
  { father: 'Nicholas I of Russia',    child: 'Alexander II of Russia' },
  { father: 'Alexander II of Russia',  child: 'Alexander III of Russia' },
  { father: 'Alexander III of Russia', child: 'Nicholas II of Russia' },
]

// ── 모자 관계 ──────────────────────────────────────────────────────
const MOTHER_CHILD: { mother: string; child: string }[] = [
  { mother: 'Catherine I of Russia',                          child: 'Elizabeth of Russia' },
  { mother: 'Catherine II of Russia',                         child: 'Paul I of Russia' },
  { mother: 'Maria Fyodorovna of Russia (Paul I)',             child: 'Alexander I of Russia' },
  { mother: 'Maria Fyodorovna of Russia (Paul I)',             child: 'Nicholas I of Russia' },
  { mother: 'Alexandra Fyodorovna of Russia (Nicholas I)',     child: 'Alexander II of Russia' },
  { mother: 'Maria Alexandrovna of Russia',                   child: 'Alexander III of Russia' },
  { mother: 'Maria Fyodorovna of Russia (Alexander III)',      child: 'Nicholas II of Russia' },
]

export async function seedRomanovDynasty(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏰 로마노프 왕조 시딩 시작...')

  // ── 1. 로마노프 가문 생성 ────────────────────────────────────────
  let dynasty = await prisma.dynasty.findFirst({ where: { name: '로마노프 왕조' } })
  if (!dynasty) {
    dynasty = await prisma.dynasty.create({
      data: {
        name: '로마노프 왕조',
        description:
          '1613년 미하일 로마노프 즉위부터 1917년 니콜라이 2세 퇴위까지 러시아를 통치한 왕조. 304년에 걸쳐 러시아 차르국과 러시아 제국을 지배했다. 표트르 대제의 서구화 개혁, 예카테리나 대제의 계몽전제주의를 거쳐 유럽 최대 영토 제국으로 성장했으나 1917년 혁명으로 붕괴되었다.',
        startDate: new Date(1613, 0, 1),
        endDate: new Date(1917, 2, 15),
      },
    })
    console.log('  ✅ 로마노프 왕조 생성')
  } else {
    console.log('  ♻️  로마노프 왕조 이미 존재')
  }

  // ── 2. 가문 통치 기록 등록 ──────────────────────────────────────
  console.log('\n  📜 가문 통치 기록 등록...')
  for (const rule of DYNASTY_RULES) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name: rule.countryName } })
    if (!hc) { console.warn(`    ⚠️  역사 국가 없음: ${rule.countryName}`); continue }
    const exists = await prisma.dynastyRule.findFirst({
      where: { dynastyId: dynasty.id, historicalCountryId: hc.id },
    })
    if (!exists) {
      await prisma.dynastyRule.create({
        data: {
          dynastyId: dynasty.id,
          historicalCountryId: hc.id,
          startEra: 'AD', startYear: rule.startYear,
          endEra: 'AD', endYear: rule.endYear,
          endReason: rule.endReason, notes: rule.notes,
        },
      })
      console.log(`    ✅ 통치: ${rule.countryName} (${rule.startYear}-${rule.endYear ?? '현재'})`)
    } else {
      console.log(`    ♻️  통치: ${rule.countryName}`)
    }
  }

  // ── 3. 황후 출신 가문 생성 ──────────────────────────────────────
  console.log('\n  🏰 황후 출신 가문 생성...')
  const dynastyIdMap = new Map<string, string>()

  // 기존에 생성된 호엔촐레른 가문 조회 (니콜라이 1세 황후 샤를로테 가문)
  const hohenzollern = await prisma.dynasty.findFirst({ where: { name: '호엔촐레른 가문' } })
  if (hohenzollern) {
    dynastyIdMap.set('호엔촐레른 가문', hohenzollern.id)
    console.log(`    ♻️  호엔촐레른 가문 (기존)`)
  }

  for (const d of WIFE_DYNASTIES) {
    let wifeDynasty = await prisma.dynasty.findFirst({ where: { name: d.name } })
    if (!wifeDynasty) {
      wifeDynasty = await prisma.dynasty.create({
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
    dynastyIdMap.set(d.name, wifeDynasty.id)
  }

  // ── 4. 황후 인물 등록 ───────────────────────────────────────────
  console.log('\n  👸 황후 인물 등록...')
  for (const p of ADDITIONAL_PERSONS) {
    const birthDate = new Date(p.birthYear, p.birthMonth - 1, p.birthDay ?? 1)
    const deathDate = p.deathYear
      ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
      : undefined

    const existing = await prisma.person.findFirst({ where: { originalName: p.originalName } })
    if (existing) {
      console.log(`    ⏭️  ${p.originalName}`)
    } else {
      await prisma.person.create({
        data: {
          name: p.name, surname: p.surname, originalName: p.originalName,
          biography: p.biography,
          birthDate, birthEra: 'AD',
          deathDate, deathEra: 'AD',
          gender: p.gender,
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`    ✅ ${p.originalName}`)
    }
  }

  // ── 5. 기존 황제들 로마노프 가문 연결 ───────────────────────────
  console.log('\n  👑 황제 가문 연결...')
  const monarchOriginalNames = [
    'Peter I of Russia', 'Catherine I of Russia', 'Peter II of Russia',
    'Anna of Russia', 'Ivan VI of Russia', 'Elizabeth of Russia',
    'Peter III of Russia', 'Catherine II of Russia', 'Paul I of Russia',
    'Alexander I of Russia', 'Nicholas I of Russia', 'Alexander II of Russia',
    'Alexander III of Russia', 'Nicholas II of Russia',
  ]
  for (const originalName of monarchOriginalNames) {
    const p = await prisma.person.findFirst({ where: { originalName } })
    if (p) {
      if (p.dynastyId) {
        console.log(`    ⏭️  ${originalName} (가문 이미 연결됨)`)
      } else {
        await prisma.person.update({ where: { id: p.id }, data: { dynastyId: dynasty.id } })
        console.log(`    ✅ ${originalName} ← 로마노프 왕조`)
      }
    }
  }

  // ── 6. 황후 가문 연결 ───────────────────────────────────────────
  console.log('\n  💍 황후 가문 연결...')
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

  // ── 7. 결혼 관계 등록 (양방향) ──────────────────────────────────
  console.log('\n  💒 결혼 관계 등록 (양방향)...')
  for (const m of MARRIAGES) {
    const pA = await prisma.person.findFirst({ where: { originalName: m.personA } })
    const pB = await prisma.person.findFirst({ where: { originalName: m.personB } })
    if (!pA || !pB) {
      console.warn(`    ⚠️  인물 없음: ${m.personA} / ${m.personB}`)
      continue
    }
    const startDate = new Date(m.startYear, m.startMonth - 1, m.startDay ?? 1)
    const endDate = m.endYear
      ? new Date(m.endYear, (m.endMonth ?? 1) - 1, 1)
      : undefined

    const existAB = await prisma.personSpouse.findFirst({ where: { personId: pA.id, spouseId: pB.id } })
    if (!existAB) {
      await prisma.personSpouse.create({
        data: { personId: pA.id, spouseId: pB.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    const existBA = await prisma.personSpouse.findFirst({ where: { personId: pB.id, spouseId: pA.id } })
    if (!existBA) {
      await prisma.personSpouse.create({
        data: { personId: pB.id, spouseId: pA.id, marriageStartDate: startDate, marriageEndDate: endDate, note: m.note },
      })
    }
    const isNew = !existAB || !existBA
    console.log(`    ${isNew ? '✅' : '♻️ '} ${m.personA} × ${m.personB} (${m.startYear}) [양방향]`)
  }

  // ── 8. 부자 관계 등록 ───────────────────────────────────────────
  console.log('\n  👨‍👦 부자 관계 등록...')
  for (const rel of FATHER_CHILD) {
    const father = await prisma.person.findFirst({ where: { originalName: rel.father } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!father || !child) { console.warn(`    ⚠️  없음: ${rel.father} → ${rel.child}`); continue }
    if (child.fatherId) { console.log(`    ⏭️  ${rel.child} (부자 관계 이미 설정됨)`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { fatherId: father.id } })
    console.log(`    ✅ ${rel.father} → ${rel.child}`)
  }

  // ── 9. 모자 관계 등록 ───────────────────────────────────────────
  console.log('\n  👩‍👦 모자 관계 등록...')
  for (const rel of MOTHER_CHILD) {
    const mother = await prisma.person.findFirst({ where: { originalName: rel.mother } })
    const child = await prisma.person.findFirst({ where: { originalName: rel.child } })
    if (!mother || !child) { console.warn(`    ⚠️  없음: ${rel.mother} → ${rel.child}`); continue }
    if (child.motherId) { console.log(`    ⏭️  ${rel.child} (모자 관계 이미 설정됨)`); continue }
    await prisma.person.update({ where: { id: child.id }, data: { motherId: mother.id } })
    console.log(`    ✅ ${rel.mother} → ${rel.child}`)
  }

  // ── 10. 황후 소속 국가 등록 ─────────────────────────────────────
  console.log('\n  🌍 황후 소속 국가 등록...')
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

  // ── 11. 황제 소속 국가 등록 ─────────────────────────────────────
  console.log('\n  👑 황제 소속 국가 등록...')
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

  console.log('\n✅ 로마노프 왕조 시딩 완료\n')
}
