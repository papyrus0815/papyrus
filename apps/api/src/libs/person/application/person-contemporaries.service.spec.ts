import { BadRequestException, NotFoundException } from '@nestjs/common'

import { PersonContemporariesService } from './person-contemporaries.service'

/**
 * 동시대 수장 읽기모델 특성화 — 검토서(docs/person-contemporary-rulers-review.md §4)의
 * 확정 함정들을 못 박는다: 창 유도(수장급만·사망 캡·미상 클램프), endDate=null
 * 후처리(미입력 조선왕이 현대 창에 등장 금지), REIGN 우선 dedup, cap+omittedCount.
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

function tenureRow(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'tenure-1',
    positionType: 'HEAD_OF_STATE',
    title: '대통령',
    appointmentMethod: 'DIRECT_ELECTION',
    termNumber: null,
    regnalNumber: null,
    startDate: utc(2000),
    endDate: utc(2005),
    person: rulerPerson(),
    country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
    historicalCountry: null,
    positionDefinition: null,
    ...overrides,
  }
}

function reignRow(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'reign-1',
    regnalName: null,
    appointmentMethod: null,
    termNumber: null,
    regnalNumber: null,
    startDate: utc(1418),
    endDate: utc(1450),
    person: rulerPerson(),
    country: null,
    historicalCountry: { id: 'joseon', name: '조선' },
    positionDefinition: { id: 'def-1', title: '국왕' },
    ...overrides,
  }
}

/**
 * PrismaService 대역 — 대상 조회(where.personId)와 후보 조회(where.AND)를
 * 인자 모양으로 구분해 각각 다른 픽스처를 돌려준다.
 */
function createService(fixture: {
  subject: FakeSubject | null
  subjectTenures?: any[]
  subjectReigns?: any[]
  candidateTenures?: any[]
  candidateReigns?: any[]
  bridgeLinks?: any[]
}) {
  const calls: Record<string, any[]> = {
    tenureWheres: [],
    reignWheres: [],
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
        calls.tenureWheres.push(args.where)
        return args.where.AND
          ? (fixture.candidateTenures ?? [])
          : (fixture.subjectTenures ?? [])
      }),
    },
    sovereignReign: {
      findMany: jest.fn(async (args: any) => {
        calls.reignWheres.push(args.where)
        return args.where.AND
          ? (fixture.candidateReigns ?? [])
          : (fixture.subjectReigns ?? [])
      }),
    },
    historicalCountryModernCountry: {
      findMany: jest.fn(async () => fixture.bridgeLinks ?? []),
    },
  }
  return {
    service: new PersonContemporariesService(prismaFake as any),
    prismaFake,
    calls,
  }
}

const BASE_PARAMS = {
  personId: 'subject-1',
  accountId: 'acc-1',
  scope: 'all' as const,
  limit: 100,
}

describe('PersonContemporariesService', () => {
  it('소유자 스코프 밖 인물이면 NotFound (findById 관례)', async () => {
    const { service } = createService({ subject: null })
    await expect(service.getContemporaries(BASE_PARAMS)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  describe('창(window) 결정', () => {
    it('명시 창이 없으면 대상의 수장급 병합 구간에서 유도 — toYear는 배타(+1)', async () => {
      const { service } = createService({
        subject: { id: 'subject-1', deathDate: utc(1450) },
        subjectReigns: [{ startDate: utc(1418), endDate: utc(1450), countryId: null, historicalCountryId: 'joseon' }],
      })
      const result = await service.getContemporaries(BASE_PARAMS)
      expect(result.meta.window).toEqual({ fromYear: 1418, toYear: 1451 })
      expect(result.meta.derivedFromSubject).toBe(true)
    })

    it('대상 재위 종료일 미입력은 사망 연도로 캡 (올해가 아니라)', async () => {
      const { service } = createService({
        subject: { id: 'subject-1', deathDate: utc(1450) },
        subjectReigns: [{ startDate: utc(1418), endDate: null, countryId: null, historicalCountryId: 'joseon' }],
      })
      const result = await service.getContemporaries(BASE_PARAMS)
      expect(result.meta.window).toEqual({ fromYear: 1418, toYear: 1451 })
    })

    it('사망 확정·연도 미상이면 시작 연도로 클램프', async () => {
      const { service } = createService({
        subject: { id: 'subject-1', isAlive: false, deathDate: null },
        subjectReigns: [{ startDate: utc(1418), endDate: null, countryId: null, historicalCountryId: 'joseon' }],
      })
      const result = await service.getContemporaries(BASE_PARAMS)
      expect(result.meta.window).toEqual({ fromYear: 1418, toYear: 1419 })
    })

    it('구조화 축(startEra/startYear) 재위는 startDate=NULL(AD<1000)이어도 창을 유도한다', async () => {
      const { service } = createService({
        subject: { id: 'subject-1', isAlive: false, deathDate: null },
        subjectReigns: [
          {
            startDate: null,
            endDate: null,
            startEra: 'AD',
            startYear: 768,
            endEra: 'AD',
            endYear: 814,
            countryId: null,
            historicalCountryId: 'francia',
          },
        ],
      })
      const result = await service.getContemporaries(BASE_PARAMS)
      // startDate만 읽으면 yearOf(null)=null → 400. 구조화 축을 읽어야 768~814 창을 유도.
      expect(result.meta.window).toEqual({ fromYear: 768, toYear: 815 })
      expect(result.meta.derivedFromSubject).toBe(true)
    })

    it('창 유도용 대상 재임 조회는 수장급으로 좁힌다 (장관·의원 경력의 창 부풀림 방지)', async () => {
      const { service, calls } = createService({
        subject: { id: 'subject-1' },
        subjectReigns: [{ startDate: utc(1418), endDate: utc(1450), countryId: null, historicalCountryId: null }],
      })
      await service.getContemporaries(BASE_PARAMS)
      const subjectWhere = calls.tenureWheres.find((where: any) => !where.AND)
      expect(subjectWhere.positionType).toEqual({
        in: ['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'],
      })
    })

    it('fromYear·toYear 한쪽만 지정하면 400', async () => {
      const { service } = createService({ subject: { id: 'subject-1' } })
      await expect(
        service.getContemporaries({ ...BASE_PARAMS, fromYear: 1500 }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('수장급 기록이 없고 명시 창도 없으면 400', async () => {
      const { service } = createService({ subject: { id: 'subject-1' } })
      await expect(service.getContemporaries(BASE_PARAMS)).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('BC 전용 창(toYear<=1)은 빈 결과 — 현 스키마의 tenure는 AD 전용', async () => {
      const { service, prismaFake } = createService({
        subject: { id: 'subject-1' },
      })
      const result = await service.getContemporaries({
        ...BASE_PARAMS,
        fromYear: -300,
        toYear: -200,
      })
      expect(result.rulers).toEqual([])
      expect(result.meta.totalPersons).toBe(0)
      // 후보 조회 자체를 하지 않는다 (음수 연도 DATETIME 파라미터 금지)
      const candidateCalls = (
        prismaFake.governmentPositionTenure.findMany.mock.calls as any[]
      ).filter((call) => call[0].where.AND)
      expect(candidateCalls).toHaveLength(0)
    })
  })

  describe('endDate=null 후처리 — 미입력과 재임 중의 구분', () => {
    it('종료일 미입력 과거 군주는 그의 사망 연도로 캡돼 현대 창에 등장하지 않는다', async () => {
      const { service } = createService({
        subject: { id: 'subject-1' },
        candidateTenures: [],
        candidateReigns: [
          reignRow({
            startDate: utc(1418),
            endDate: null,
            person: rulerPerson({ id: 'sejong', deathDate: utc(1450) }),
          }),
        ],
      })
      const result = await service.getContemporaries({
        ...BASE_PARAMS,
        fromYear: 1900,
        toYear: 2000,
      })
      expect(result.rulers).toEqual([])
    })

    it('생존 현직(사망 없음)의 종료일 미기록은 올해까지로 간주돼 포함된다', async () => {
      const { service } = createService({
        subject: { id: 'subject-1' },
        candidateTenures: [
          tenureRow({
            startDate: utc(2022, 4, 10),
            endDate: null,
            person: rulerPerson({ id: 'incumbent', isAlive: true }),
          }),
        ],
      })
      const result = await service.getContemporaries({
        ...BASE_PARAMS,
        fromYear: 2023,
        toYear: 2025,
      })
      expect(result.rulers).toHaveLength(1)
      expect(result.rulers[0]!.person.id).toBe('incumbent')
      expect(result.rulers[0]!.records[0]!.endYear).toBeNull()
    })

    it('사망 확정·연도 미상 군주의 종료일 미기록은 시작 연도로 클램프된다', async () => {
      const { service } = createService({
        subject: { id: 'subject-1' },
        candidateReigns: [
          reignRow({
            startDate: utc(1418),
            endDate: null,
            person: rulerPerson({ id: 'unknown-death', isAlive: false, deathDate: null }),
          }),
        ],
      })
      const included = await service.getContemporaries({
        ...BASE_PARAMS,
        fromYear: 1418,
        toYear: 1419,
      })
      expect(included.rulers).toHaveLength(1)
      const excluded = await service.getContemporaries({
        ...BASE_PARAMS,
        fromYear: 1430,
        toYear: 1450,
      })
      expect(excluded.rulers).toEqual([])
    })
  })

  it('구조화 축 재위(startDate=NULL, AD<1000)도 후보로 매칭된다 — 동시대 수장 무성 누락 방지', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
      candidateReigns: [
        reignRow({
          id: 'charlemagne',
          startDate: null,
          endDate: null,
          startEra: 'AD',
          startYear: 768,
          endEra: 'AD',
          endYear: 814,
          historicalCountry: { id: 'francia', name: '프랑크' },
          person: rulerPerson({ id: 'charlemagne', isAlive: false, deathDate: null }),
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 780,
      toYear: 800,
    })
    expect(result.rulers).toHaveLength(1)
    expect(result.rulers[0]!.person.id).toBe('charlemagne')
    expect(result.rulers[0]!.records[0]!.startYear).toBe(768)
    expect(result.rulers[0]!.records[0]!.endYear).toBe(814)
    // 재위 후보 SQL은 startDate=NULL 행도 통과시키는 superset이어야 한다(상한 프루닝에서 탈락 금지)
    const reignWhere = calls.reignWheres.find((where: any) => where.AND)
    const upperBound = reignWhere.AND.find((clause: any) =>
      clause.OR?.some((condition: any) => condition.startDate === null),
    )
    expect(upperBound).toBeTruthy()
  })

  it('같은 인물·같은 시작일의 서로 다른 두 재위(동군연합)는 둘 다 보존된다 (같은 종류는 흡수 금지)', async () => {
    const person = rulerPerson({ id: 'jagiello', deathDate: utc(1434) })
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateReigns: [
        reignRow({
          id: 'poland',
          startDate: utc(1386),
          endDate: utc(1434),
          historicalCountry: { id: 'poland', name: '폴란드' },
          person,
        }),
        reignRow({
          id: 'lithuania',
          startDate: utc(1386),
          endDate: utc(1434),
          historicalCountry: { id: 'lithuania', name: '리투아니아' },
          person,
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1380,
      toYear: 1440,
    })
    expect(result.rulers).toHaveLength(1)
    expect(result.rulers[0]!.records).toHaveLength(2)
    expect(result.rulers[0]!.records.map((record) => record.recordId).sort()).toEqual([
      'lithuania',
      'poland',
    ])
  })

  it('같은 인물·같은 시작일의 TENURE·REIGN 중복은 REIGN 우선 (normalize-tenures 규칙)', async () => {
    const person = rulerPerson({ id: 'dup', deathDate: utc(1450) })
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateTenures: [
        tenureRow({ id: 'as-tenure', startDate: utc(1418), endDate: utc(1450), person }),
      ],
      candidateReigns: [
        reignRow({ id: 'as-reign', startDate: utc(1418), endDate: utc(1450), person }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1400,
      toYear: 1460,
    })
    expect(result.rulers).toHaveLength(1)
    expect(result.rulers[0]!.records).toHaveLength(1)
    expect(result.rulers[0]!.records[0]!.recordKind).toBe('SOVEREIGN_REIGN')
    expect(result.rulers[0]!.records[0]!.positionType).toBe('HEAD_OF_STATE')
  })

  it('dedup은 시간을 무시하고 UTC 날짜 단위 — 저장 경로별 time-of-day 드리프트에도 유령 중복 없음', async () => {
    const person = rulerPerson({ id: 'dup-drift', deathDate: utc(1450) })
    const morning = new Date(Date.UTC(2000, 7, 10, 9, 0, 0))
    morning.setUTCFullYear(1418)
    const midnight = new Date(Date.UTC(2000, 7, 10, 0, 0, 0))
    midnight.setUTCFullYear(1418)
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateTenures: [
        tenureRow({ id: 'as-tenure', startDate: midnight, endDate: utc(1450), person }),
      ],
      candidateReigns: [
        reignRow({ id: 'as-reign', startDate: morning, endDate: utc(1450), person }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1400,
      toYear: 1460,
    })
    expect(result.rulers[0]!.records).toHaveLength(1)
    expect(result.rulers[0]!.records[0]!.recordKind).toBe('SOVEREIGN_REIGN')
  })

  it('미래 시작일 오타의 열린 기록도 겹침이 음수가 되지 않는다 (시작 클램프)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateTenures: [
        tenureRow({
          startDate: utc(2062),
          endDate: null,
          person: rulerPerson({ id: 'typo-future', isAlive: true }),
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 2020,
      toYear: 2070,
    })
    expect(result.rulers).toHaveLength(1)
    expect(result.rulers[0]!.overlapYears).toBeGreaterThanOrEqual(0)
  })

  it('대상의 미래 시작일 열린 기록으로도 유도 창이 역전되지 않는다', async () => {
    const { service } = createService({
      subject: { id: 'subject-1', isAlive: true },
      subjectTenures: [
        {
          startDate: utc(2062),
          endDate: null,
          countryId: 'kr',
          historicalCountryId: null,
        },
      ],
    })
    const result = await service.getContemporaries(BASE_PARAMS)
    expect(result.meta.window.toYear).toBeGreaterThan(result.meta.window.fromYear)
  })

  it('후보 SQL where는 종료<시작 오염 행도 후처리로 넘기는 superset (startDate gte 분기)', async () => {
    const { service, calls } = createService({
      subject: { id: 'subject-1' },
    })
    await service.getContemporaries({ ...BASE_PARAMS, fromYear: 1445, toYear: 1460 })
    const candidateWhere = calls.tenureWheres.find((where: any) => where.AND)
    const dateOr = candidateWhere.AND.find(
      (clause: any) => clause.OR?.some((condition: any) => condition.endDate !== undefined),
    )
    expect(dateOr.OR).toHaveLength(3)
    expect(dateOr.OR[2]).toHaveProperty('startDate')
  })

  it('isOwned는 요청 계정 소유 여부 — 타계정 수장은 false (칩 비활성 근거)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateReigns: [
        reignRow({
          id: 'own',
          startDate: utc(1418),
          endDate: utc(1450),
          person: rulerPerson({ id: 'mine', accountId: 'acc-1', deathDate: utc(1450) }),
        }),
        reignRow({
          id: 'foreign',
          startDate: utc(1420),
          endDate: utc(1440),
          person: rulerPerson({ id: 'others', accountId: 'acc-2', deathDate: utc(1440) }),
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1400,
      toYear: 1460,
    })
    const ownedById = new Map(
      result.rulers.map((ruler) => [ruler.person.id, ruler.person.isOwned]),
    )
    expect(ownedById.get('mine')).toBe(true)
    expect(ownedById.get('others')).toBe(false)
  })

  it('주 국적의 이름 순서 기본값을 응답에 싣는다 (서양식 표시 폴백)', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateReigns: [
        reignRow({
          startDate: utc(1643),
          endDate: utc(1715),
          person: rulerPerson({
            id: 'louis',
            country: { defaultNameDisplayOrder: 'western' },
            deathDate: utc(1715),
          }),
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1650,
      toYear: 1700,
    })
    expect(result.rulers[0]!.person.country).toEqual({
      defaultNameDisplayOrder: 'western',
    })
  })

  it('cap 초과분은 meta.omittedCount로 노출, 정렬은 겹침 길이 내림차순', async () => {
    const { service } = createService({
      subject: { id: 'subject-1' },
      candidateReigns: [
        reignRow({
          id: 'reign-short',
          startDate: utc(1440),
          endDate: utc(1445),
          person: rulerPerson({ id: 'short', deathDate: utc(1445) }),
        }),
        reignRow({
          id: 'reign-long',
          startDate: utc(1400),
          endDate: utc(1460),
          person: rulerPerson({ id: 'long', deathDate: utc(1460) }),
        }),
        reignRow({
          id: 'reign-mid',
          startDate: utc(1430),
          endDate: utc(1450),
          person: rulerPerson({ id: 'mid', deathDate: utc(1450) }),
        }),
      ],
    })
    const result = await service.getContemporaries({
      ...BASE_PARAMS,
      fromYear: 1400,
      toYear: 1461,
      limit: 2,
    })
    expect(result.rulers.map((ruler) => ruler.person.id)).toEqual(['long', 'mid'])
    expect(result.meta.totalPersons).toBe(3)
    expect(result.meta.omittedCount).toBe(1)
  })

  describe('scope=sameCountry', () => {
    it('대상의 재임 국가 + 역사↔현대 브리지로 후보를 제한한다', async () => {
      const { service, calls } = createService({
        subject: { id: 'subject-1', deathDate: utc(1450) },
        subjectReigns: [
          { startDate: utc(1418), endDate: utc(1450), countryId: null, historicalCountryId: 'joseon' },
        ],
        bridgeLinks: [{ modernCountryId: 'kr', historicalCountryId: 'joseon' }],
      })
      await service.getContemporaries({ ...BASE_PARAMS, scope: 'sameCountry' })
      const candidateWhere = calls.reignWheres.find((where: any) => where.AND)
      const scopeClause = candidateWhere.AND.find((clause: any) =>
        clause.OR?.some(
          (condition: any) => condition.countryId || condition.historicalCountryId,
        ),
      )
      expect(scopeClause).toEqual({
        OR: [
          { countryId: { in: ['kr'] } },
          { historicalCountryId: { in: ['joseon'] } },
        ],
      })
    })

    it('대상에 국가 정보가 전혀 없으면(교황 등) 빈 결과', async () => {
      const { service } = createService({
        subject: { id: 'subject-1', deathDate: utc(1520) },
        subjectTenures: [
          { startDate: utc(1503), endDate: utc(1513), countryId: null, historicalCountryId: null },
        ],
      })
      const result = await service.getContemporaries({
        ...BASE_PARAMS,
        scope: 'sameCountry',
      })
      expect(result.rulers).toEqual([])
      expect(result.meta.totalPersons).toBe(0)
    })
  })
})
