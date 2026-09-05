import { NotFoundException } from '@nestjs/common'

import { PersonReignAdjacencyService } from './person-reign-adjacency.service'

/**
 * 같은 국가 전/후 재위(reign-adjacency) 읽기모델 특성화 — 검토서
 * (docs/person-reign-neighbors-review.md §4·§5)의 확정 규칙을 못 박는다:
 * record별 인스턴스 스코프(브리지 아님)·**승계 축 분리**·startDate 최근접·동률 배열·
 * REIGN 우선 dedup·정밀도 인지 경계·본인 record isSelf·overlapsAnchor·BC/국가없음 앵커 제외.
 */

function utc(year: number, month = 0, day = 1): Date {
  const date = new Date(Date.UTC(2000, month, day))
  date.setUTCFullYear(year)
  return date
}

interface FakeSubject {
  id: string
  deathEra?: string | null
  deathDate?: Date | null
  isAlive?: boolean
  isDeathDateUnknown?: boolean
}

function rulerPerson(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'ruler-1',
    name: '수장',
    surname: null,
    middleName: null,
    nameDisplayOrder: null,
    country: null,
    profileImageUrl: null,
    templeName: null,
    regnalName: null,
    isAlive: false,
    isDeathDateUnknown: false,
    deathEra: null,
    deathDate: null,
    accountId: 'acc-1',
    ...overrides,
  }
}

/** ANCHOR_REIGN_SELECT 모양 — 재위 앵커의 축은 연결된 직위 정의가 정한다 */
function anchorReign(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'anchor-reign',
    positionDefinition: { positionType: 'HEAD_OF_STATE' },
    startDate: utc(1450),
    endDate: utc(1480),
    startDatePrecision: null,
    countryId: null,
    historicalCountryId: 'joseon',
    ...overrides,
  }
}

/**
 * ANCHOR_TENURE_SELECT 모양 — positionType이 앵커의 승계 축을 정한다.
 * MILITARY_COMMANDER/CABINET_MINISTER(TITLED)는 title까지 축에 실린다.
 */
function anchorTenure(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'anchor-tenure',
    positionType: 'HEAD_OF_STATE',
    title: null,
    startDate: utc(2010),
    endDate: utc(2015),
    startDatePrecision: null,
    countryId: 'kr',
    historicalCountryId: null,
    ...overrides,
  }
}

/** NEIGHBOR_SELECT 모양 — 이웃 후보(reign). positionDefinition.positionType이 축 진실원 */
function worldReign(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'world-reign',
    regnalName: null,
    appointmentMethod: null,
    termNumber: null,
    regnalNumber: null,
    startDate: utc(1418),
    endDate: utc(1450),
    startDatePrecision: null,
    person: rulerPerson(),
    country: null,
    historicalCountry: { id: 'joseon', name: '조선' },
    positionDefinition: { id: 'def-1', title: '국왕', positionType: 'HEAD_OF_STATE' },
    ...overrides,
  }
}

/** NEIGHBOR_SELECT 모양 — 이웃 후보(tenure, 수장급) */
function worldTenure(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'world-tenure',
    positionType: 'HEAD_OF_STATE',
    title: '대통령',
    appointmentMethod: 'DIRECT_ELECTION',
    termNumber: null,
    regnalNumber: null,
    startDate: utc(2000),
    endDate: utc(2005),
    startDatePrecision: null,
    person: rulerPerson(),
    country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
    historicalCountry: null,
    positionDefinition: null,
    ...overrides,
  }
}

/** 스코프 절(단순 {historicalCountryId} 또는 확장 {OR:[...]})에 world 행이 부합하나 */
function rowMatchesScope(row: any, andClauses: any[]): boolean {
  // 축 게이트도 OR을 쓰므로(정의 NULL 살리기) 국가 키가 든 절만 스코프로 인정한다
  const scopeClause = andClauses.find(
    (clause) =>
      clause &&
      (clause.historicalCountryId ||
        clause.countryId ||
        (clause.OR &&
          clause.OR.some(
            (sub: any) => sub.historicalCountryId || sub.countryId,
          ))),
  )
  if (!scopeClause) return true
  const rowHist = row.historicalCountry?.id ?? null
  const rowModern = row.country?.id ?? null
  const matchOne = (clause: any): boolean => {
    if (clause.historicalCountryId) {
      const value = clause.historicalCountryId
      const ids = value.in ?? [value]
      return rowHist != null && ids.includes(rowHist)
    }
    if (clause.countryId) {
      const value = clause.countryId
      const ids = value.in ?? [value]
      return rowModern != null && ids.includes(rowModern)
    }
    return false
  }
  if (scopeClause.OR) return scopeClause.OR.some(matchOne)
  return matchOne(scopeClause)
}

/** 정의 축 조건의 두 형태 — 정확 일치 또는 부정 */
type DefinitionTypeCondition = string | { not: string }

/**
 * 정의 축 조건(`{ positionType: 'X' }` 또는 `{ positionType: { not: 'X' } }`)에 부합하나.
 * `null`은 항상 false — Prisma의 `positionDefinition: { is: ... }`가 **관계 NULL 행을
 * 배제**하는 시맨틱을 그대로 모사한다(구현이 OR로 살려내는지 검증하려면 필수).
 */
function matchesDefinitionType(
  condition: DefinitionTypeCondition,
  actual: string | null,
): boolean {
  if (actual == null) return false
  if (typeof condition === 'object' && 'not' in condition) {
    return actual !== condition.not
  }
  return actual === condition
}

/** 재위 축 절(`positionDefinition` 중첩 또는 정의-NULL을 살리는 OR)에 world 행이 부합하나 */
function rowMatchesReignAxis(row: any, clause: any): boolean {
  const defType = row.positionDefinition?.positionType ?? null
  if (clause.positionDefinition) {
    const condition = clause.positionDefinition.is ?? clause.positionDefinition
    return matchesDefinitionType(condition.positionType, defType)
  }
  return clause.OR.some((sub: any) => {
    if ('positionDefinitionId' in sub) return row.positionDefinition == null
    const condition = sub.positionDefinition.is ?? sub.positionDefinition
    return matchesDefinitionType(condition.positionType, defType)
  })
}

/**
 * 이웃 쿼리의 AND에서 날짜 경계 + 스코프 + **승계 축**을 적용해 world 후보를 실제로 분할한다
 * (JS 선택 로직 + 스코프 확장 + 축 게이트를 함께 실검증 — 축 절을 무시하면 축 테스트가 공허해진다).
 */
function filterWorld(pool: any[], andClauses: any[]): any[] {
  const dateClause = andClauses.find(
    (clause) =>
      clause &&
      clause.startDate &&
      (clause.startDate.lt !== undefined || clause.startDate.gt !== undefined),
  )
  // 재임 축은 스칼라 positionType, 재위 축은 정의 중첩(또는 정의-NULL OR)
  const tenureAxisClause = andClauses.find(
    (clause) => clause && clause.positionType,
  )
  const reignAxisClause = andClauses.find(
    (clause) =>
      clause &&
      (clause.positionDefinition ||
        (clause.OR &&
          clause.OR.some(
            (sub: any) => 'positionDefinitionId' in sub || sub.positionDefinition,
          ))),
  )
  let rows = pool.filter((row) => rowMatchesScope(row, andClauses))
  if (tenureAxisClause) {
    const value = tenureAxisClause.positionType
    const allowed = value.in ?? [value]
    rows = rows.filter((row) => allowed.includes(row.positionType))
    // TITLED 축(참모총장·장관 등)은 positionType에 더해 title까지 일치해야 같은 자리다
    if (tenureAxisClause.title !== undefined) {
      rows = rows.filter((row) => row.title === tenureAxisClause.title)
    }
  }
  if (reignAxisClause) {
    rows = rows.filter((row) => rowMatchesReignAxis(row, reignAxisClause))
  }
  if (dateClause) {
    const { lt, gt } = dateClause.startDate
    if (lt) rows = rows.filter((row) => row.startDate.getTime() < lt.getTime())
    else if (gt) rows = rows.filter((row) => row.startDate.getTime() > gt.getTime())
  }
  return rows
}

function createService(fixture: {
  subject: FakeSubject | null
  anchorTenures?: any[]
  anchorReigns?: any[]
  worldTenures?: any[]
  worldReigns?: any[]
  /** 전이 그래프 엣지 (B4 succession) — {predecessorId, successorId} */
  transitions?: Array<{ predecessorId: string; successorId: string }>
  /** historical→modern 링크 (B4) — {modernCountryId} */
  modernLinks?: Array<{ modernCountryId: string }>
}) {
  const calls: {
    anchorTenureWheres: any[]
    anchorReignWheres: any[]
    neighborTenureWheres: any[]
    neighborReignWheres: any[]
    transitionWheres: any[]
    bridgeCalls: number
  } = {
    anchorTenureWheres: [],
    anchorReignWheres: [],
    neighborTenureWheres: [],
    neighborReignWheres: [],
    transitionWheres: [],
    bridgeCalls: 0,
  }
  const prismaFake = {
    person: {
      findFirst: jest.fn(async () =>
        fixture.subject
          ? {
              id: fixture.subject.id,
              deathEra: fixture.subject.deathEra ?? null,
              deathDate: fixture.subject.deathDate ?? null,
              isAlive: fixture.subject.isAlive ?? false,
              isDeathDateUnknown: fixture.subject.isDeathDateUnknown ?? false,
            }
          : null,
      ),
    },
    governmentPositionTenure: {
      findMany: jest.fn(async (args: any) => {
        if (!args.where.AND) {
          calls.anchorTenureWheres.push(args.where)
          return fixture.anchorTenures ?? []
        }
        calls.neighborTenureWheres.push(args.where)
        return filterWorld(fixture.worldTenures ?? [], args.where.AND)
      }),
    },
    sovereignReign: {
      findMany: jest.fn(async (args: any) => {
        if (!args.where.AND) {
          calls.anchorReignWheres.push(args.where)
          return fixture.anchorReigns ?? []
        }
        calls.neighborReignWheres.push(args.where)
        return filterWorld(fixture.worldReigns ?? [], args.where.AND)
      }),
    },
    historicalCountryTransition: {
      findMany: jest.fn(async (args: any) => {
        calls.transitionWheres.push(args.where)
        return fixture.transitions ?? []
      }),
    },
    historicalCountryModernCountry: {
      findMany: jest.fn(async () => {
        calls.bridgeCalls++
        return fixture.modernLinks ?? []
      }),
    },
  }
  return {
    service: new PersonReignAdjacencyService(prismaFake as any),
    prismaFake,
    calls,
  }
}

const BASE_PARAMS = {
  personId: 'subject-1',
  accountId: 'acc-1',
  scope: 'instance' as const,
}

describe('PersonReignAdjacencyService', () => {
  it('소유자 스코프 밖 인물이면 NotFound (findById 관례)', async () => {
    const { service } = createService({ subject: null })
    await expect(service.getReignAdjacency(BASE_PARAMS)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('직전=선대, 직후=후대 최근접만 선택 (창 없이 startDate 인접)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1450), endDate: utc(1480) })],
      worldReigns: [
        worldReign({ id: 'far-prev', startDate: utc(1400), endDate: utc(1418), person: rulerPerson({ id: 'far-prev-p' }) }),
        worldReign({ id: 'prev', startDate: utc(1418), endDate: utc(1450), person: rulerPerson({ id: 'prev-p' }) }),
        worldReign({ id: 'next', startDate: utc(1481), endDate: utc(1500), person: rulerPerson({ id: 'next-p' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    expect(result.entries).toHaveLength(1)
    const entry = result.entries[0]!
    expect(entry.predecessors.map((neighbor) => neighbor.person.id)).toEqual(['prev-p'])
    expect(entry.predecessors[0]!.relation).toBe('PREDECESSOR')
    expect(entry.successors.map((neighbor) => neighbor.person.id)).toEqual(['next-p'])
    expect(entry.successors[0]!.relation).toBe('SUCCESSOR')
  })

  it('동일 startDate 공동군주는 배열로 전부 노출 (coBoundary, 무성 절단 금지)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1450) })],
      worldReigns: [
        worldReign({ id: 'co-a', startDate: utc(1418), person: rulerPerson({ id: 'co-a-p' }) }),
        worldReign({ id: 'co-b', startDate: utc(1418), person: rulerPerson({ id: 'co-b-p' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const predecessors = result.entries[0]!.predecessors
    expect(predecessors).toHaveLength(2)
    expect(predecessors.every((neighbor) => neighbor.coBoundary)).toBe(true)
    expect(new Set(predecessors.map((neighbor) => neighbor.person.id))).toEqual(
      new Set(['co-a-p', 'co-b-p']),
    )
  })

  it('같은 인물·같은 날짜의 TENURE·REIGN 이중계상은 REIGN 우선으로 dedup (자기-인접 유령 방지)', async () => {
    const person = rulerPerson({ id: 'dup' })
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1450) })],
      worldTenures: [worldTenure({ id: 'dup-tenure', startDate: utc(1418), endDate: utc(1450), positionType: 'HEAD_OF_STATE', person })],
      worldReigns: [worldReign({ id: 'dup-reign', startDate: utc(1418), endDate: utc(1450), person })],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const predecessors = result.entries[0]!.predecessors
    expect(predecessors).toHaveLength(1)
    expect(predecessors[0]!.record.recordKind).toBe('SOVEREIGN_REIGN')
    expect(predecessors[0]!.coBoundary).toBe(false)
  })

  it('인스턴스 스코프 — 정확한 historicalCountryId만 걸고 브리지(m:n)는 타지 않는다', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ historicalCountryId: 'joseon', countryId: null })],
      worldReigns: [worldReign({ id: 'prev', startDate: utc(1418), person: rulerPerson({ id: 'prev-p' }) })],
    })
    await service.getReignAdjacency(BASE_PARAMS)
    // 이웃 reign where.AND 최상위에 인스턴스 절이 정확히 들어간다
    const neighborWhere = calls.neighborReignWheres[0]
    expect(neighborWhere.AND).toContainEqual({ historicalCountryId: 'joseon' })
    // 국가 키를 확장하는 OR 브리지 절이 없어야 한다 (동시대 sameCountry의 과확장 회피).
    // 축 게이트도 OR을 쓰므로(정의 NULL 재위 살리기) 국가 키가 든 OR만 브리지로 센다.
    const hasBridgeOr = neighborWhere.AND.some(
      (clause: any) =>
        clause.OR &&
        clause.OR.some((sub: any) => sub.historicalCountryId || sub.countryId),
    )
    expect(hasBridgeOr).toBe(false)
    // historicalCountryModernCountry(브리지) 조회 자체를 하지 않는다
    expect(calls.bridgeCalls).toBe(0)
  })

  it('이웃 tenure 후보는 앵커와 같은 축으로 좁힌다 (장관·의원은 물론 다른 축 수장도 배제)', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      anchorTenures: [
        anchorTenure({ positionType: 'HEAD_OF_STATE', countryId: 'kr', historicalCountryId: null }),
      ],
    })
    await service.getReignAdjacency(BASE_PARAMS)
    const neighborTenureWhere = calls.neighborTenureWheres[0]
    expect(neighborTenureWhere.AND).toContainEqual({ positionType: 'HEAD_OF_STATE' })
  })

  describe('승계 축 분리 (국가원수 ⊥ 정부수반 — 병렬 재직은 승계가 아님)', () => {
    it('정부수반 앵커는 군주 재위를 이웃으로 삼지 않는다 — 초대 총리의 선대는 빈 배열 (비테 ← 니콜라이 2세 회귀)', async () => {
      const { service } = createService({
        subject: { id: 'witte' },
        // 러시아 제국 초대 총리 — 정부수반 축엔 선대가 없다
        anchorTenures: [
          anchorTenure({
            id: 'witte-pm',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1905, 10, 1),
            endDate: utc(1906, 4, 5),
            countryId: null,
            historicalCountryId: 'russian-empire',
          }),
        ],
        worldReigns: [
          // 앵커 시작 전에 즉위해 한참 뒤까지 재위한 군주 — 축 분리 전엔 이게 '선대(공동·중첩)'로 잡혔다
          worldReign({
            id: 'nicholas-2',
            startDate: utc(1894, 10, 1),
            endDate: utc(1917, 2, 15),
            historicalCountry: { id: 'russian-empire', name: '러시아 제국' },
            person: rulerPerson({ id: 'nicholas-2-p', deathDate: utc(1918) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      expect(result.entries[0]!.predecessors).toEqual([])
    })

    it('축은 테이블이 아니라 직위 정의 — 총리 정의로 등록된 재위는 정부수반 축에 남는다 (프랑스 제3공화국 푸앵카레)', async () => {
      const pmDefinition = { id: 'def-pm', title: '총리', positionType: 'HEAD_OF_GOVERNMENT' }
      const { service } = createService({
        subject: { id: 'clemenceau' },
        // 클레망소 1차 총리(재임) — 후임은 재위 테이블에 들어간 푸앵카레 총리다
        anchorTenures: [
          anchorTenure({
            id: 'clemenceau-1',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1906, 9, 25),
            endDate: utc(1909, 6, 24),
            countryId: null,
            historicalCountryId: 'fr3',
          }),
        ],
        worldReigns: [
          worldReign({
            id: 'poincare-pm',
            startDate: utc(1912, 0, 14),
            endDate: utc(1913, 0, 21),
            historicalCountry: { id: 'fr3', name: '프랑스 제3공화국' },
            positionDefinition: pmDefinition,
            person: rulerPerson({ id: 'poincare-p', deathDate: utc(1934) }),
          }),
          // 같은 인물의 대통령 재위 — 국가원수 축이라 총리 사슬엔 끼면 안 된다
          worldReign({
            id: 'poincare-president',
            startDate: utc(1913, 1, 18),
            endDate: utc(1920, 1, 18),
            historicalCountry: { id: 'fr3', name: '프랑스 제3공화국' },
            positionDefinition: { id: 'def-pres', title: '대통령', positionType: 'HEAD_OF_STATE' },
            person: rulerPerson({ id: 'poincare-p', deathDate: utc(1934) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.record.recordId)).toEqual(['poincare-pm'])
      // 응답 positionType도 정의에서 파생 — '재위니까 국가원수'로 둔갑시키지 않는다
      expect(successors[0]!.record.positionType).toBe('HEAD_OF_GOVERNMENT')
    })

    it('총리 정의 재위가 앵커면 그 자신도 정부수반 축 — 재임으로 등록된 전임 총리를 찾는다', async () => {
      const { service } = createService({
        subject: { id: 'poincare-p' },
        anchorReigns: [
          anchorReign({
            id: 'poincare-pm',
            positionDefinition: { positionType: 'HEAD_OF_GOVERNMENT' },
            startDate: utc(1912, 0, 14),
            endDate: utc(1913, 0, 21),
            countryId: null,
            historicalCountryId: 'fr3',
          }),
        ],
        worldTenures: [
          worldTenure({
            id: 'clemenceau-1',
            positionType: 'HEAD_OF_GOVERNMENT',
            title: '총리',
            startDate: utc(1906, 9, 25),
            endDate: utc(1909, 6, 24),
            country: null,
            historicalCountry: { id: 'fr3', name: '프랑스 제3공화국' },
            person: rulerPerson({ id: 'clemenceau-p', deathDate: utc(1929) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      expect(
        result.entries[0]!.predecessors.map((neighbor) => neighbor.person.id),
      ).toEqual(['clemenceau-p'])
    })

    it('직위 정의가 없는 재위(군주)는 국가원수 축에 남는다 — 관계 NULL을 조용히 떨구면 승계선이 점프한다', async () => {
      const { service } = createService({
        subject: { id: 'philippe' },
        anchorReigns: [
          anchorReign({
            id: 'philippe-6',
            startDate: utc(1328),
            endDate: utc(1350),
            historicalCountryId: 'france-k',
          }),
        ],
        worldReigns: [
          // 정의 미기입 군주 — Prisma 중첩 조건만 쓰면 배제돼 후대가 다음 세기로 점프한다
          worldReign({
            id: 'charles-5',
            startDate: utc(1364, 3, 8),
            endDate: utc(1380, 8, 16),
            historicalCountry: { id: 'france-k', name: '프랑스 왕국' },
            positionDefinition: null,
            person: rulerPerson({ id: 'charles-5-p', deathDate: utc(1380) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.person.id)).toEqual(['charles-5-p'])
      // 정의가 없으면 응답 positionType은 국가원수 폴백
      expect(successors[0]!.record.positionType).toBe('HEAD_OF_STATE')
    })

    it('정부수반 앵커의 이웃은 같은 축(HEAD_OF_GOVERNMENT) 재임 — 전임·후임 총리로 이어진다', async () => {
      const { service } = createService({
        subject: { id: 'witte' },
        anchorTenures: [
          anchorTenure({
            id: 'witte-pm',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1905, 10, 1),
            endDate: utc(1906, 4, 5),
            countryId: null,
            historicalCountryId: 'russian-empire',
          }),
        ],
        worldTenures: [
          worldTenure({
            id: 'goremykin-pm',
            positionType: 'HEAD_OF_GOVERNMENT',
            title: '총리',
            startDate: utc(1906, 4, 5),
            endDate: utc(1906, 6, 21),
            country: null,
            historicalCountry: { id: 'russian-empire', name: '러시아 제국' },
            person: rulerPerson({ id: 'goremykin-p', deathDate: utc(1917) }),
          }),
          // 같은 국가·같은 시기의 국가원수 축 재임 — 정부수반 카드엔 유입 금지
          worldTenure({
            id: 'other-axis-head',
            positionType: 'HEAD_OF_STATE',
            startDate: utc(1906, 0, 1),
            country: null,
            historicalCountry: { id: 'russian-empire', name: '러시아 제국' },
            person: rulerPerson({ id: 'other-axis-p' }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.person.id)).toEqual(['goremykin-p'])
    })

    it('국가원수 앵커(군주 재위)는 총리 재임을 이웃으로 삼지 않는다 — 역방향 오염도 차단', async () => {
      const { service } = createService({
        subject: { id: 'nicholas-2-p' },
        anchorReigns: [
          anchorReign({
            id: 'nicholas-2',
            startDate: utc(1894, 10, 1),
            endDate: utc(1917, 2, 15),
            historicalCountryId: 'russian-empire',
          }),
        ],
        worldTenures: [
          // 재위 뒤에 시작한 총리 — 국가원수 축 카드의 '후대'가 되면 안 된다
          worldTenure({
            id: 'pm-after',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1905, 10, 1),
            country: null,
            historicalCountry: { id: 'russian-empire', name: '러시아 제국' },
            person: rulerPerson({ id: 'pm-after-p' }),
          }),
        ],
        worldReigns: [
          worldReign({
            id: 'alexander-3',
            startDate: utc(1881, 2, 13),
            endDate: utc(1894, 10, 1),
            historicalCountry: { id: 'russian-empire', name: '러시아 제국' },
            person: rulerPerson({ id: 'alexander-3-p', deathDate: utc(1894) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const entry = result.entries[0]!
      expect(entry.predecessors.map((neighbor) => neighbor.person.id)).toEqual(['alexander-3-p'])
      expect(entry.successors).toEqual([])
    })

    it('한 인물이 두 축을 겸직하면 카드별로 축이 갈린다 (record 단위 축 판정)', async () => {
      const { service } = createService({
        subject: { id: 'dual' },
        anchorTenures: [
          anchorTenure({
            id: 'dual-hos',
            positionType: 'HEAD_OF_STATE',
            startDate: utc(1950),
            endDate: utc(1960),
            countryId: 'xx',
            historicalCountryId: null,
          }),
          anchorTenure({
            id: 'dual-hog',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1950),
            endDate: utc(1955),
            countryId: 'xx',
            historicalCountryId: null,
          }),
        ],
        worldTenures: [
          worldTenure({
            id: 'prev-hos',
            positionType: 'HEAD_OF_STATE',
            startDate: utc(1940),
            endDate: utc(1950),
            country: { id: 'xx', name: '가상국', flagEmoji: null },
            person: rulerPerson({ id: 'prev-hos-p', deathDate: utc(1950) }),
          }),
          worldTenure({
            id: 'prev-hog',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1945),
            endDate: utc(1950),
            country: { id: 'xx', name: '가상국', flagEmoji: null },
            person: rulerPerson({ id: 'prev-hog-p', deathDate: utc(1950) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const byRecord = new Map(
        result.entries.map((entry) => [entry.subjectRecordId, entry]),
      )
      expect(
        byRecord.get('dual-hos')!.predecessors.map((neighbor) => neighbor.person.id),
      ).toEqual(['prev-hos-p'])
      expect(
        byRecord.get('dual-hog')!.predecessors.map((neighbor) => neighbor.person.id),
      ).toEqual(['prev-hog-p'])
    })
  })

  describe('TITLED 축 (참모총장·장관 등 — positionType뿐 아니라 title까지 일치해야 같은 자리)', () => {
    it('참모총장 재임도 앵커가 되어 같은 title의 전임·후임을 승계 이웃으로 삼는다', async () => {
      const { service } = createService({
        subject: { id: 'conrad' },
        anchorTenures: [
          anchorTenure({
            id: 'conrad-chief',
            positionType: 'MILITARY_COMMANDER',
            title: '참모총장',
            startDate: utc(1906, 10, 18),
            endDate: utc(1911, 11, 3),
            countryId: null,
            historicalCountryId: 'austria-hungary',
          }),
        ],
        worldTenures: [
          worldTenure({
            id: 'beck-chief',
            positionType: 'MILITARY_COMMANDER',
            title: '참모총장',
            startDate: utc(1881),
            endDate: utc(1906, 10, 18),
            country: null,
            historicalCountry: { id: 'austria-hungary', name: '오스트리아-헝가리 제국' },
            person: rulerPerson({ id: 'beck-p', deathDate: utc(1920) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const predecessors = result.entries[0]!.predecessors
      expect(predecessors.map((neighbor) => neighbor.person.id)).toEqual(['beck-p'])
      expect(predecessors[0]!.record.title).toBe('참모총장')
    })

    it('같은 국가·같은 positionType이어도 title이 다르면 승계 이웃에서 배제한다 (여단장이 참모총장 후임으로 잡히면 안 됨)', async () => {
      const { service } = createService({
        subject: { id: 'beck' },
        anchorTenures: [
          anchorTenure({
            id: 'beck-chief',
            positionType: 'MILITARY_COMMANDER',
            title: '참모총장',
            startDate: utc(1881),
            endDate: utc(1906, 10, 18),
            countryId: null,
            historicalCountryId: 'austria-hungary',
          }),
        ],
        worldTenures: [
          // 같은 나라·같은 positionType(MILITARY_COMMANDER)이지만 다른 자리 — 승계 이웃 아님
          worldTenure({
            id: 'potiorek-corps',
            positionType: 'MILITARY_COMMANDER',
            title: '제3군단장 (그라츠)',
            startDate: utc(1906),
            country: null,
            historicalCountry: { id: 'austria-hungary', name: '오스트리아-헝가리 제국' },
            person: rulerPerson({ id: 'potiorek-p' }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      expect(result.entries[0]!.successors).toEqual([])
    })

    it('CABINET_MINISTER도 title 일치로 승계선을 잇는다 (외무장관 전임·후임)', async () => {
      const { service } = createService({
        subject: { id: 'berchtold' },
        anchorTenures: [
          anchorTenure({
            id: 'berchtold-fm',
            positionType: 'CABINET_MINISTER',
            title: '외무장관',
            startDate: utc(1912),
            endDate: utc(1915),
            countryId: null,
            historicalCountryId: 'austria-hungary',
          }),
        ],
        worldTenures: [
          worldTenure({
            id: 'burian-fm',
            positionType: 'CABINET_MINISTER',
            title: '외무장관',
            startDate: utc(1915),
            country: null,
            historicalCountry: { id: 'austria-hungary', name: '오스트리아-헝가리 제국' },
            person: rulerPerson({ id: 'burian-p' }),
          }),
          // 같은 국가·같은 시기의 다른 부처 — 유입 금지
          worldTenure({
            id: 'krobatin-war',
            positionType: 'CABINET_MINISTER',
            title: '전쟁장관',
            startDate: utc(1915),
            country: null,
            historicalCountry: { id: 'austria-hungary', name: '오스트리아-헝가리 제국' },
            person: rulerPerson({ id: 'krobatin-p' }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.person.id)).toEqual(['burian-p'])
    })

    it('TITLED 앵커는 SovereignReign을 조회하지 않는다 (군주 전용 테이블이라 참모총장 자리를 가질 수 없음)', async () => {
      const { service, calls } = createService({
        subject: { id: 'conrad' },
        anchorTenures: [
          anchorTenure({
            id: 'conrad-chief',
            positionType: 'MILITARY_COMMANDER',
            title: '참모총장',
            startDate: utc(1906, 10, 18),
            countryId: null,
            historicalCountryId: 'austria-hungary',
          }),
        ],
        worldReigns: [
          // 같은 국가에 재위가 있어도 TITLED 축에선 아예 조회 대상이 아니어야 한다
          worldReign({
            id: 'unrelated-reign',
            startDate: utc(1848),
            historicalCountry: { id: 'austria-hungary', name: '오스트리아-헝가리 제국' },
            person: rulerPerson({ id: 'franz-joseph-p' }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(BASE_PARAMS)
      expect(calls.neighborReignWheres).toHaveLength(0)
      expect(result.entries[0]!.predecessors).toEqual([])
    })

    it('title 없는 MILITARY_COMMANDER/CABINET_MINISTER 재임은 애초에 앵커 후보가 아니다', async () => {
      const { service, calls } = createService({
        subject: { id: 'nobody' },
        anchorTenures: [], // findMany 모킹이 where만 기록하고 빈 배열을 돌려주므로, 실제 게이트는 where 절로 검증
      })
      await service.getReignAdjacency(BASE_PARAMS)
      const anchorWhere = calls.anchorTenureWheres[0]
      // TITLED 절이 title:{not:null}을 강제하는지 where 형태로 확인
      const titledClause = anchorWhere.OR.find((clause: any) => clause.title)
      expect(titledClause).toEqual({
        positionType: { in: ['MILITARY_COMMANDER', 'CABINET_MINISTER'] },
        title: { not: null },
      })
    })
  })

  it('다국가 대상은 record별로 스코프를 분리한다 (프랑스 재위 이웃에 스페인 왕 불가)', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ id: 'fr-reign', historicalCountryId: 'france-k', countryId: null })],
      anchorTenures: [anchorTenure({ id: 'kr-tenure', countryId: 'kr', historicalCountryId: null })],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    expect(result.entries).toHaveLength(2)
    const scopeClauses = calls.neighborReignWheres
      .concat(calls.neighborTenureWheres)
      .map((where: any) =>
        where.AND.find(
          (clause: any) => clause.historicalCountryId || clause.countryId,
        ),
      )
    expect(scopeClauses).toContainEqual({ historicalCountryId: 'france-k' })
    expect(scopeClauses).toContainEqual({ countryId: 'kr' })
  })

  it('복위·단계 전환 — 대상 본인의 다른 재위가 최근접이면 isSelf=true (딥링크 비활성 근거)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ id: 'reign-1', startDate: utc(1450), endDate: utc(1455) })],
      // 대상 본인의 두 번째 재위(복위)가 후대 후보 풀에 존재
      worldReigns: [
        worldReign({ id: 'reign-2', startDate: utc(1460), person: rulerPerson({ id: 'subject-1' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const successors = result.entries[0]!.successors
    expect(successors).toHaveLength(1)
    expect(successors[0]!.isSelf).toBe(true)
    expect(successors[0]!.person.id).toBe('subject-1')
  })

  it('겹치는 이웃(공동·중첩·대립왕)은 overlapsAnchor=true로 태깅한다', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1500), endDate: utc(1520) })],
      worldReigns: [
        // 1490 시작, 1510 종료 → 앵커(1500~) 시작과 겹침
        worldReign({ id: 'overlap', startDate: utc(1490), endDate: utc(1510), person: rulerPerson({ id: 'overlap-p', deathDate: utc(1510) }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const predecessors = result.entries[0]!.predecessors
    expect(predecessors).toHaveLength(1)
    expect(predecessors[0]!.overlapsAnchor).toBe(true)
  })

  it('정상 승계(선대 종료 연도 == 앵커 시작 연도)는 overlapsAnchor=false — 연 단위 handover', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1796), endDate: utc(1801) })],
      worldReigns: [
        // 선대: 1762~1796 종료. 후대: 1801~1825 시작. 둘 다 경계 연도만 맞닿음 → 겹침 아님
        worldReign({ id: 'pred', startDate: utc(1762), endDate: utc(1796), person: rulerPerson({ id: 'pred-p', deathDate: utc(1796) }) }),
        worldReign({ id: 'succ', startDate: utc(1801), endDate: utc(1825), person: rulerPerson({ id: 'succ-p', deathDate: utc(1825) }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const entry = result.entries[0]!
    expect(entry.predecessors[0]!.overlapsAnchor).toBe(false)
    expect(entry.successors[0]!.overlapsAnchor).toBe(false)
  })

  it('tenure↔reign 크로스 — 왕(재위) 후대로 초대 대통령(재임)이 자연 인접', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ id: 'last-king', startDate: utc(1790), endDate: utc(1800), historicalCountryId: 'france-k' })],
      worldTenures: [
        worldTenure({ id: 'first-pres', startDate: utc(1805), endDate: utc(1810), historicalCountry: { id: 'france-k', name: '프랑스' }, country: null, person: rulerPerson({ id: 'pres-p' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const successors = result.entries[0]!.successors
    expect(successors).toHaveLength(1)
    expect(successors[0]!.record.recordKind).toBe('TENURE')
    expect(successors[0]!.person.id).toBe('pres-p')
  })

  it("같은 해에 year-정밀도가 섞이면 '순서 미상' 동률로 묶는다 (01-01 관행이 만든 가짜 순서 방지)", async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1500) })],
      worldReigns: [
        // 같은 해 1490: day 정밀도(06-15)와 year 정밀도(01-01) 혼재 → 순서 단정 금지
        worldReign({ id: 'day', startDate: utc(1490, 5, 15), startDatePrecision: null, person: rulerPerson({ id: 'day-p' }) }),
        worldReign({ id: 'year-only', startDate: utc(1490, 0, 1), startDatePrecision: 'year', person: rulerPerson({ id: 'year-p' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const predecessors = result.entries[0]!.predecessors
    expect(predecessors).toHaveLength(2)
    expect(predecessors.every((neighbor) => neighbor.coBoundary)).toBe(true)
  })

  it('isOwned — 타계정 이웃은 false (칩 비활성 근거)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1450) })],
      worldReigns: [
        worldReign({ id: 'mine', startDate: utc(1440), person: rulerPerson({ id: 'mine-p', accountId: 'acc-1' }) }),
        worldReign({ id: 'next-foreign', startDate: utc(1470), person: rulerPerson({ id: 'foreign-p', accountId: 'acc-2' }) }),
      ],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    const entry = result.entries[0]!
    expect(entry.predecessors[0]!.person.isOwned).toBe(true)
    expect(entry.successors[0]!.person.isOwned).toBe(false)
  })

  it('체인 끝 — 후대만 있고 선대가 없으면 predecessors는 빈 배열(오류 아님)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ startDate: utc(1450) })],
      worldReigns: [worldReign({ id: 'next', startDate: utc(1480), person: rulerPerson({ id: 'next-p' }) })],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    expect(result.entries[0]!.predecessors).toEqual([])
    expect(result.entries[0]!.successors).toHaveLength(1)
  })

  it('BC(연도<1) 앵커는 계산 생략 — bcSkippedCount로 노출, 이웃 조회 안 함', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ id: 'bc', startDate: utc(-100), historicalCountryId: 'rome' })],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    expect(result.entries).toEqual([])
    expect(result.meta.bcSkippedCount).toBe(1)
    expect(calls.neighborReignWheres).toHaveLength(0)
  })

  it('국가 정보 없는 앵커(교황 등)는 제외 — noCountryCount로 노출', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      anchorReigns: [anchorReign({ id: 'pope', countryId: null, historicalCountryId: null })],
    })
    const result = await service.getReignAdjacency(BASE_PARAMS)
    expect(result.entries).toEqual([])
    expect(result.meta.noCountryCount).toBe(1)
    expect(calls.neighborReignWheres).toHaveLength(0)
  })

  describe('scope=succession (B4 크로스-정체 전이 그래프)', () => {
    const SUCCESSION_PARAMS = { ...BASE_PARAMS, scope: 'succession' as const }

    it('instance 모드는 전이 그래프를 타지 않는다 (전이 조회 0회, 단순 스코프)', async () => {
      const { service, calls } = createService({
        subject: { id: 'subject-1' },
        anchorReigns: [anchorReign({ historicalCountryId: 'empire', countryId: null })],
      })
      await service.getReignAdjacency(BASE_PARAMS)
      expect(calls.transitionWheres).toHaveLength(0)
      expect(calls.neighborReignWheres[0].AND).toContainEqual({ historicalCountryId: 'empire' })
    })

    it('succession: 직전 정체(전이 그래프)의 마지막 군주가 선대로 — 정체 경계를 잇는다', async () => {
      const { service } = createService({
        subject: { id: 'subject-1' },
        // 앵커 = 제국의 초대 군주(같은 정체엔 선대 없음)
        anchorReigns: [anchorReign({ id: 'first-emperor', startDate: utc(1721), historicalCountryId: 'empire', countryId: null })],
        worldReigns: [
          // 직전 정체(차르국)의 마지막 군주 — instance 스코프면 제외됨
          worldReign({ id: 'last-tsar', startDate: utc(1700), historicalCountry: { id: 'tsardom', name: '차르국' }, person: rulerPerson({ id: 'tsar-p' }) }),
          // 전이로 연결되지 않은 병렬 정체 — succession이어도 유입 금지
          worldReign({ id: 'parallel', startDate: utc(1710), historicalCountry: { id: 'lithuania', name: '리투아니아' }, person: rulerPerson({ id: 'lith-p' }) }),
        ],
        transitions: [{ predecessorId: 'tsardom', successorId: 'empire' }],
      })
      const result = await service.getReignAdjacency(SUCCESSION_PARAMS)
      const predecessors = result.entries[0]!.predecessors
      // 전이로 연결된 차르국의 마지막 군주만 선대(병렬 리투아니아는 제외)
      expect(predecessors.map((neighbor) => neighbor.person.id)).toEqual(['tsar-p'])
      expect(result.entries[0]!.scope.degradedToStrict).toBe(false)
    })

    it('전이 미시드 정체는 instance-only로 강등 (degradedToStrict, 가짜 이웃 안 채움)', async () => {
      const { service, calls } = createService({
        subject: { id: 'subject-1' },
        anchorReigns: [anchorReign({ id: 'orphan', historicalCountryId: 'orphan-hc', countryId: null })],
        transitions: [], // 전이 엣지 없음
        worldReigns: [
          worldReign({ id: 'other', startDate: utc(1400), historicalCountry: { id: 'elsewhere', name: '딴곳' }, person: rulerPerson({ id: 'other-p' }) }),
        ],
      })
      const result = await service.getReignAdjacency(SUCCESSION_PARAMS)
      expect(result.entries[0]!.scope.degradedToStrict).toBe(true)
      // 단순 스코프로 폴백(OR 확장 아님) → 딴곳 군주 미유입
      expect(calls.neighborReignWheres[0].AND).toContainEqual({ historicalCountryId: 'orphan-hc' })
      expect(result.entries[0]!.predecessors).toEqual([])
      // 미시드면 modern 링크 조회도 하지 않는다
      expect(calls.bridgeCalls).toBe(0)
    })

    it('정부수반 축도 전이 그래프를 타지만, 확장된 스코프의 군주 재위는 여전히 미유입', async () => {
      const { service } = createService({
        subject: { id: 'pasic' },
        // 세르비아 왕국 총리 — 후임은 전이로 이어진 SHS 왕국 총리다
        anchorTenures: [
          anchorTenure({
            id: 'pasic-serbia',
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: utc(1912),
            endDate: utc(1918),
            countryId: null,
            historicalCountryId: 'serbia-k',
          }),
        ],
        transitions: [{ predecessorId: 'serbia-k', successorId: 'shs-k' }],
        worldTenures: [
          worldTenure({
            id: 'pasic-shs',
            positionType: 'HEAD_OF_GOVERNMENT',
            title: '총리',
            startDate: utc(1921),
            endDate: utc(1926),
            country: null,
            historicalCountry: { id: 'shs-k', name: '세르비아-크로아티아-슬로베니아 왕국' },
            person: rulerPerson({ id: 'pasic', deathDate: utc(1926) }),
          }),
        ],
        worldReigns: [
          // 확장된 정체의 국왕 — 정부수반 축엔 들어오면 안 된다
          worldReign({
            id: 'petar-1',
            startDate: utc(1918),
            endDate: utc(1921),
            historicalCountry: { id: 'shs-k', name: '세르비아-크로아티아-슬로베니아 왕국' },
            person: rulerPerson({ id: 'petar-1-p', deathDate: utc(1921) }),
          }),
        ],
      })
      const result = await service.getReignAdjacency(SUCCESSION_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.record.recordId)).toEqual(['pasic-shs'])
    })

    it('역사→현대 링크로 초대 대통령(현대 filed)이 후대로 — 왕정→공화정 크로스', async () => {
      const { service } = createService({
        subject: { id: 'subject-1' },
        anchorReigns: [anchorReign({ id: 'last-king', startDate: utc(1900), endDate: utc(1917), historicalCountryId: 'empire', countryId: null })],
        transitions: [{ predecessorId: 'empire', successorId: 'republic-hc' }],
        modernLinks: [{ modernCountryId: 'ru' }],
        worldTenures: [
          // 현대 국가(countryId=ru)로 filed된 초대 대통령
          worldTenure({ id: 'first-pres', startDate: utc(1918), endDate: utc(1922), country: { id: 'ru', name: '러시아', flagEmoji: '🇷🇺' }, historicalCountry: null, person: rulerPerson({ id: 'pres-p' }) }),
        ],
      })
      const result = await service.getReignAdjacency(SUCCESSION_PARAMS)
      const successors = result.entries[0]!.successors
      expect(successors.map((neighbor) => neighbor.person.id)).toEqual(['pres-p'])
      expect(successors[0]!.record.recordKind).toBe('TENURE')
    })
  })
})
