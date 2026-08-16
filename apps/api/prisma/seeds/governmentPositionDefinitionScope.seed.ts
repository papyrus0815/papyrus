import { PrismaService } from '../prisma.service'

/**
 * 관직 정의의 적용 범위(GovernmentPositionDefinitionScope) 시딩.
 *
 * 규칙은 하나다: **스코프 행이 0개면 전역(어느 국가에서나 노출), 1개 이상이면 그 국가에서만 노출.**
 * 그래서 이 파일에 등장하는 정의만 국가 전용이 되고, 나머지 전부는 손대지 않아 전역으로 남는다.
 *
 * ⚠️ 무엇을 넣지 말아야 하는지가 더 중요하다.
 * 실측(재임 55행 + 재위 194행)상 '국왕'은 역사국가 21개, '황제' 5개, '공작' 9개, '총리' 5개
 * 컨텍스트에 걸쳐 쓰인다. 이런 보편 칭호에 스코프를 붙이는 순간, 목록에 없는 나라에서 그 직책이
 * **사라진다**(노르웨이 국왕을 등록하려는데 '국왕'이 안 뜨는 식). 그래서 여기엔 특정 정체에
 * 귀속되는 고유 직책만 담는다.
 *
 * ⚠️ 현대 국가 dual-fill이 필수다.
 * 사용자가 역사국가를 안 고르고 현대 국가만 골랐을 때도 직책이 보여야 한다. 예를 들어
 * '내각총리대신'을 역사국가(일본 제국·일본국)에만 붙이면, 국가로 '일본'만 고른 사용자에게는
 * 사라진다. 그래서 역사국가 + 대응 현대 국가를 함께 넣는다(레포의 역사 우선 + 현대 dual-fill 규약).
 *
 * 멱등: (definitionId, countryId, historicalCountryId) 자연키로 findFirst → 없을 때만 create.
 *
 * ⚠️ 실패는 **엔트리 단위 all-or-nothing**이다. 타깃 하나라도 못 찾으면 그 정의에는 스코프를
 * 아예 붙이지 않고 전역으로 남긴다. 부분 적용(현대만 붙고 역사국가는 유실)은 스코프 0개보다
 * 나쁘기 때문 — 그 순간 '현대 전용'으로 확정돼 정작 기록이 달린 역사국가에서 사라진다.
 * 그래서 이 시드는 seed.ts의 **맨 끝**에서 돌려야 한다(일본 역사국가는 인물·사건 시드가 만든다).
 */

interface ScopeEntry {
  /** 정의 자연키 — (title, positionType) */
  title: string
  positionType: string
  /** 이 직책이 속한 역사적 국가 이름들 (historical_country.name 정확 일치) */
  historicalCountries?: string[]
  /** 함께 붙일 현대 국가 이름들 (country.name 정확 일치) — dual-fill */
  countries?: string[]
  /** 현지 표기 (선택) */
  localTitle?: string
  note?: string
}

/**
 * 큐레이션 목록. 각 항목의 "왜 안전한가"는 실측 사용 컨텍스트로 확인했다
 * (쇼군=도쿠가와 막부 15건 단일 / 내각총리대신=일본 제국 13·일본국 6 / 서기장=소련 1 …).
 */
const SCOPES: ScopeEntry[] = [
  // ── 일본 ────────────────────────────────────────────────
  {
    title: '쇼군',
    positionType: 'HEAD_OF_GOVERNMENT',
    historicalCountries: ['도쿠가와 막부'],
    countries: ['일본'],
    localTitle: '征夷大将軍',
    note: '실측 재위 15건 전부 도쿠가와 막부',
  },
  {
    title: '천황',
    positionType: 'HEAD_OF_STATE',
    historicalCountries: ['일본 제국', '일본국'],
    countries: ['일본'],
    localTitle: '天皇',
  },
  {
    title: '내각총리대신',
    positionType: 'HEAD_OF_GOVERNMENT',
    // 대한제국(1907~1910, 이완용 등)의 공식 직함도 內閣總理大臣이라 함께 넣는다 —
    // 일본 전속으로 좁히면 대한제국 재임을 등록할 때 자유입력으로 되돌아간다.
    historicalCountries: ['일본 제국', '일본국', '대한제국'],
    countries: ['일본'],
    localTitle: '内閣総理大臣',
    note: '실측 재임 19건은 일본 제국·일본국. 대한제국은 같은 직함의 별개 정체',
  },
  // 막부 전속 각료 — governmentPositionDefinition.seed.ts에서 신설
  { title: '로주', positionType: 'CABINET_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '老中' },
  { title: '와카도시요리', positionType: 'VICE_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '若年寄' },
  { title: '외국봉행', positionType: 'CABINET_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '外国奉行' },
  { title: '감정봉행', positionType: 'CABINET_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '勘定奉行' },
  { title: '군함봉행', positionType: 'CABINET_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '軍艦奉行' },
  { title: '보병봉행', positionType: 'CABINET_MINISTER', historicalCountries: ['도쿠가와 막부'], countries: ['일본'], localTitle: '歩兵奉行' },

  // ── 한국 ────────────────────────────────────────────────
  { title: '영의정', positionType: 'HEAD_OF_GOVERNMENT', historicalCountries: ['조선'], countries: ['대한민국'], localTitle: '領議政' },
  { title: '좌의정', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'], localTitle: '左議政' },
  { title: '우의정', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'], localTitle: '右議政' },
  { title: '이조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '호조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '예조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '병조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '형조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '공조판서', positionType: 'CABINET_MINISTER', historicalCountries: ['조선'], countries: ['대한민국'] },
  { title: '국무총리', positionType: 'HEAD_OF_GOVERNMENT', countries: ['대한민국'], localTitle: '國務總理' },

  // ── 미국 ────────────────────────────────────────────────
  // 미국 행정부 고유 명칭 3종만 스코프한다 — 농무·상무·노동·보건복지·교통·에너지·보훈장관은
  // 다른 나라에도 있는 보편 부처라 governmentPositionDefinition.seed.ts에서 스코프 없이 전역으로 뒀다.
  { title: '국무장관', positionType: 'CABINET_MINISTER', countries: ['미국'], note: '외무장관과 기능은 같으나 미국 고유 명칭 표기' },
  { title: '주택도시개발장관', positionType: 'CABINET_MINISTER', countries: ['미국'] },
  { title: '국토안보장관', positionType: 'CABINET_MINISTER', countries: ['미국'] },

  // ── 중국·이란 ───────────────────────────────────────────
  { title: '국가주석', positionType: 'HEAD_OF_STATE', countries: ['중국'], localTitle: '国家主席' },
  { title: '총리(국무원)', positionType: 'HEAD_OF_GOVERNMENT', countries: ['중국'], localTitle: '总理' },
  { title: '최고지도자(라흐바르)', positionType: 'HEAD_OF_STATE', countries: ['이란'] },

  // ── 소련·독일권 ─────────────────────────────────────────
  {
    title: '서기장',
    positionType: 'HEAD_OF_GOVERNMENT',
    historicalCountries: ['소비에트 사회주의 공화국 연방'],
    countries: ['러시아'],
    note: '실측 재임 1건(소련). 현대 러시아 dual-fill은 소련 재임을 현대 국가로 등록하는 경로를 막지 않기 위함',
  },
  // 현대 국가에만 붙이면 역사국가만 고른 사용자에게서 사라진다(dual-fill의 역방향).
  // 실측상 재임 귀속은 역사국가 단독이 지배적이라 이쪽 누락이 오히려 더 위험하다.
  {
    title: '연방총리',
    positionType: 'HEAD_OF_GOVERNMENT',
    countries: ['독일', '오스트리아'],
    historicalCountries: ['독일 연방 공화국 (서독)', '오스트리아 제1공화국', '오스트리아 연방국'],
    localTitle: 'Bundeskanzler',
  },
  // 신성로마제국 겸직 칭호 — 실측 재위도 전부 신성로마제국
  { title: '로마왕', positionType: 'HEAD_OF_STATE', historicalCountries: ['신성로마제국'], localTitle: 'Rex Romanorum' },
  { title: '이탈리아왕', positionType: 'HEAD_OF_STATE', historicalCountries: ['신성로마제국'], localTitle: 'Rex Italiae' },
  // 선제후는 제국 중앙직이 아니라 각 선제후국 군주의 칭호다 — 제국에만 묶으면
  // 브란덴부르크·작센 등 정작 그 칭호를 쓰는 정체에서 고를 수 없다.
  {
    title: '선제후',
    positionType: 'HEAD_OF_STATE',
    historicalCountries: [
      '신성로마제국',
      '브란덴부르크 선제후국',
      '작센 선제후국',
      '바이에른 선제후국',
      '팔츠 선제후국',
    ],
    localTitle: 'Kurfürst',
  },
]

export async function seedGovernmentPositionDefinitionScopes(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🗺️  관직 정의 적용 범위(GovernmentPositionDefinitionScope) 시딩')

  let created = 0
  let skipped = 0
  let missing = 0

  for (const entry of SCOPES) {
    const definition = await prisma.governmentPositionDefinition.findFirst({
      where: { title: entry.title, positionType: entry.positionType as any },
    })
    if (!definition) {
      console.log(`  ⚠️  정의 없음: ${entry.title} (${entry.positionType}) — skip`)
      missing++
      continue
    }

    const targets: Array<{ countryId?: string; historicalCountryId?: string; label: string }> = []
    let entryIncomplete = false

    for (const name of entry.historicalCountries ?? []) {
      const historical = await prisma.historicalCountry.findFirst({ where: { name } })
      if (!historical) {
        console.log(`  ⚠️  역사국가 없음: ${name} (${entry.title})`)
        entryIncomplete = true
        continue
      }
      targets.push({ historicalCountryId: historical.id, label: name })
    }

    for (const name of entry.countries ?? []) {
      const country = await prisma.country.findFirst({ where: { name } })
      if (!country) {
        console.log(`  ⚠️  현대 국가 없음: ${name} (${entry.title})`)
        entryIncomplete = true
        continue
      }
      targets.push({ countryId: country.id, label: name })
    }

    /**
     * **엔트리 단위 all-or-nothing.** 타깃 하나만 유실돼도 스코프를 붙이지 않는다.
     * 부분 적용은 '스코프 0개=전역'보다 나쁘다 — 예컨대 역사국가(도쿠가와 막부)만 실패하고
     * 현대(일본)만 붙으면 쇼군이 '현대 일본 전용'으로 확정돼, 정작 재위 15건이 달린
     * 도쿠가와 막부 컨텍스트에서 사라진다. 실패 시 전역으로 남는 쪽이 항상 안전하다.
     */
    if (entryIncomplete) {
      console.log(`  ⏭️  ${entry.title} — 대상 일부 없음, 전역으로 유지(부분 스코프 금지)`)
      missing++
      continue
    }

    for (const target of targets) {
      // @@unique를 걸지 않았으므로(MySQL NULL 유니크는 반쪽 보증) 앱에서 멱등 판정
      const existing = await prisma.governmentPositionDefinitionScope.findFirst({
        where: {
          definitionId: definition.id,
          countryId: target.countryId ?? null,
          historicalCountryId: target.historicalCountryId ?? null,
        },
      })
      if (existing) {
        skipped++
        continue
      }
      await prisma.governmentPositionDefinitionScope.create({
        data: {
          definitionId: definition.id,
          countryId: target.countryId ?? null,
          historicalCountryId: target.historicalCountryId ?? null,
          localTitle: entry.localTitle ?? null,
          note: entry.note ?? null,
        },
      })
      console.log(`  ✅ ${entry.title} → ${target.label}`)
      created++
    }
  }

  console.log(
    `\n🗺️  적용 범위 시딩 완료 — 신규 ${created}건 / 기존 ${skipped}건 / 대상 없음 ${missing}건`,
  )
}
