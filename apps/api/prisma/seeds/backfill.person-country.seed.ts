/**
 * Person 국가 정보 통합 백필 시드
 *
 * 목적: 어드민 인포그래픽·인물 리스트에서 "국가 미상" 카운트를 줄인다.
 *
 * 1) HC ↔ 모던 국가 링크 보강 (HistoricalCountryModernCountry)
 *    - 카스티야 왕국·아라곤 왕국 → ES
 *    - 합스부르크령 네덜란드 → NL, BE
 *    - 포르투갈 왕국 → PT
 *    (선행 의존: country.seed에 ES/PT가 이미 추가돼 있어야 함)
 *
 * 2) PersonCountryAffiliation 자동 추가 — affiliation이 0건인 인물에 대해
 *    birthPlaceText·originalName·surname·dynasty 키워드 매칭으로 모던 국가 추론,
 *    CITIZENSHIP 타입 affiliation 1건 생성.
 *
 *    매칭 우선순위:
 *      ① birthPlaceText 시작 키워드 (조선·일본·에도 막부·미국·영국·청·러시아 제국·포르투갈 등)
 *      ② originalName 패턴 ("of Russia", "of Castile" 등)
 *      ③ surname / dynasty 키워드 (도쿠가와·로마노프·아비스 등)
 *
 *    추론 실패 시 unresolved로 분류, 로그 출력.
 *
 * 3) 멱등성 — 이미 affiliation이 있는 인물·이미 HC-국가 링크가 있는 경우 스킵.
 *
 * 후속 — 이 시드 실행 후 backfill.person-country-id 시드를 다시 실행하면
 * Person.countryId가 채워진다.
 */
import { PrismaService } from '../prisma.service'

// ── HC ↔ 모던 국가 매핑 ──────────────────────────────────────────────────
const HC_MODERN_LINKS: Array<{
  hcName: string
  modernIsoCodes: string[]
}> = [
  { hcName: '카스티야 왕국', modernIsoCodes: ['ES'] },
  { hcName: '아라곤 왕국', modernIsoCodes: ['ES'] },
  { hcName: '합스부르크령 네덜란드', modernIsoCodes: ['NL', 'BE'] },
  { hcName: '포르투갈 왕국', modernIsoCodes: ['PT'] },
  // 디종 본토(=현대 프랑스) 우선 + 저지대 영지(NL/BE/LU)는 별도 합스부르크령 네덜란드로 분리
  { hcName: '부르고뉴 공국', modernIsoCodes: ['FR'] },
  // 신성로마제국 — 핵심 영토는 독일·오스트리아·체코·이탈리아 북부에 걸침
  { hcName: '신성로마제국', modernIsoCodes: ['DE', 'AT'] },
  { hcName: '보헤미아 왕국', modernIsoCodes: ['CZ'] },
  { hcName: '헝가리 왕국', modernIsoCodes: ['HU'] },
]

// ── 모던 국가 추론 패턴 ──────────────────────────────────────────────────
// birthPlaceText 시작 키워드 → 모던 국가 ISO 코드. 순서대로 우선 매칭.
const PLACE_PATTERNS: Array<{ patterns: string[]; iso: string }> = [
  // 한국·조선
  { patterns: ['조선', '대한제국', '대한민국', '한국'], iso: 'KR' },
  // 일본 (에도 막부 시기 + 메이지 이후)
  {
    patterns: [
      '일본',
      '에도 막부',
      '에도성',
      '에도(',
      '메이지',
      '도쿄',
      '히로시마',
      '교토',
      '오사카',
      '미토',
      '무사시국',
      '히타치국',
    ],
    iso: 'JP',
  },
  // 청·중화·중국
  { patterns: ['청 ', '중화', '중국', '中国'], iso: 'CN' },
  // 미국
  { patterns: ['미국'], iso: 'US' },
  // 영국
  { patterns: ['영국'], iso: 'GB' },
  // 러시아 제국·소련
  { patterns: ['러시아 제국', '소련', '러시아', 'Россия'], iso: 'RU' },
  // 포르투갈
  { patterns: ['포르투갈'], iso: 'PT' },
  // 스페인·카스티야·아라곤
  { patterns: ['카스티야', '아라곤', '스페인'], iso: 'ES' },
  // 독일·신성로마·프로이센
  { patterns: ['독일', '신성로마', '프로이센', '작센', '바이에른'], iso: 'DE' },
  // 프랑스
  { patterns: ['프랑스'], iso: 'FR' },
  // 이탈리아
  { patterns: ['이탈리아', '로마(', '시칠리아', '나폴리'], iso: 'IT' },
]

// ── originalName / surname / dynasty 보조 매칭 ──────────────────────────
const NAME_PATTERNS: Array<{ patterns: string[]; iso: string }> = [
  // 영어 originalName
  { patterns: ['of Russia', 'Russian', 'Romanov'], iso: 'RU' },
  { patterns: ['of England', 'English'], iso: 'GB' },
  { patterns: ['of France', 'French'], iso: 'FR' },
  { patterns: ['of Spain', 'Spanish', 'of Castile', 'of Aragon'], iso: 'ES' },
  { patterns: ['of Portugal', 'Portuguese'], iso: 'PT' },
  { patterns: ['of Germany', 'German', 'Saxe-', 'Saxon'], iso: 'DE' },
  { patterns: ['of Italy', 'Italian'], iso: 'IT' },
]

const SURNAME_PATTERNS: Record<string, string> = {
  로마노프: 'RU',
  도쿠가와: 'JP',
  하야시: 'JP',
  아베: 'JP',
  이케다: 'JP',
  사카모토: 'JP',
  아비스: 'PT',
  합스부르크: 'ES', // 스페인 합스부르크 인물에 대한 폴백 (HRE 인물은 affiliation으로 이미 처리됨)
  작센고타알텐부르크: 'DE',
}

const DYNASTY_PATTERNS: Record<string, string> = {
  '아비스 가문': 'PT',
  '로마노프 가문': 'RU',
  '도쿠가와 가문': 'JP',
}

function resolveIso(person: {
  birthPlaceText: string | null
  originalName: string | null
  surname: string | null
  dynasty: { name: string } | null
}): string | null {
  // 1) birthPlaceText (시작·포함 양쪽 매칭)
  if (person.birthPlaceText) {
    const place = person.birthPlaceText
    for (const { patterns, iso } of PLACE_PATTERNS) {
      for (const p of patterns) {
        if (place.startsWith(p) || place.includes(` ${p}`) || place.includes(p)) {
          return iso
        }
      }
    }
  }
  // 2) originalName
  if (person.originalName) {
    const n = person.originalName
    for (const { patterns, iso } of NAME_PATTERNS) {
      for (const p of patterns) {
        if (n.includes(p)) return iso
      }
    }
  }
  // 3) surname
  if (person.surname && SURNAME_PATTERNS[person.surname]) {
    return SURNAME_PATTERNS[person.surname]
  }
  // 4) dynasty
  if (person.dynasty && DYNASTY_PATTERNS[person.dynasty.name]) {
    return DYNASTY_PATTERNS[person.dynasty.name]
  }
  return null
}

export async function seedBackfillPersonCountry(prisma: PrismaService): Promise<void> {
  console.log('\n🧭 Person 국가 정보 통합 백필 시작...')

  // ── 1) HC ↔ 모던 국가 링크 보강 ────────────────────────────────────────
  console.log('\n  [1/2] HC ↔ 모던 국가 링크 보강')
  let linksAdded = 0
  let linksSkipped = 0
  for (const { hcName, modernIsoCodes } of HC_MODERN_LINKS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: hcName },
      select: { id: true },
    })
    if (!hc) {
      console.log(`    ⚠️  HC 미존재: ${hcName} (스킵)`)
      continue
    }
    for (const iso of modernIsoCodes) {
      const country = await prisma.country.findFirst({
        where: { isoCode: iso },
        select: { id: true, name: true },
      })
      if (!country) {
        console.log(`    ⚠️  모던 국가 미존재: ${iso} (스킵)`)
        continue
      }
      const exists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: hc.id, modernCountryId: country.id },
      })
      if (exists) {
        linksSkipped++
        continue
      }
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId: hc.id, modernCountryId: country.id },
      })
      console.log(`    ✅ 링크: ${hcName} → ${country.name} (${iso})`)
      linksAdded++
    }
  }
  console.log(`  HC 링크 — 추가: ${linksAdded}건 / 스킵: ${linksSkipped}건`)

  // ── 2) PersonCountryAffiliation 자동 추가 ─────────────────────────────
  console.log('\n  [2/2] PersonCountryAffiliation 자동 추가')
  const targets = await prisma.person.findMany({
    where: { countryAffiliations: { none: {} } },
    select: {
      id: true,
      name: true,
      surname: true,
      originalName: true,
      birthPlaceText: true,
      dynasty: { select: { name: true } },
    },
  })

  let added = 0
  let skipped = 0
  const unresolved: typeof targets = []

  for (const p of targets) {
    const iso = resolveIso(p)
    if (!iso) {
      unresolved.push(p)
      continue
    }
    const country = await prisma.country.findFirst({
      where: { isoCode: iso },
      select: { id: true },
    })
    if (!country) {
      console.log(`    ⚠️  매칭된 모던 국가 미존재(${iso}): ${p.originalName ?? p.name}`)
      unresolved.push(p)
      continue
    }
    // 멱등성: countryId 기준 affiliation 중복 체크
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId: p.id,
        countryId: country.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      skipped++
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId: p.id,
        countryId: country.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    added++
    if (added <= 50) {
      console.log(`    ✅ ${p.originalName ?? p.name} → ${iso}`)
    }
  }

  console.log(
    `  Affiliation — 추가: ${added}건 / 이미 존재: ${skipped}건 / 추론 실패: ${unresolved.length}건`,
  )

  if (unresolved.length > 0) {
    console.log('\n  --- 추론 실패 (수동 PATCH 필요) ---')
    for (const p of unresolved) {
      const full = [p.surname, p.name].filter(Boolean).join(' ')
      console.log(
        `    ${p.originalName ?? full} | dynasty=${p.dynasty?.name ?? '-'} | place=${(p.birthPlaceText ?? '').slice(0, 60)}`,
      )
    }
  }

  console.log('\n🧭 Person 국가 정보 통합 백필 완료\n')
}
