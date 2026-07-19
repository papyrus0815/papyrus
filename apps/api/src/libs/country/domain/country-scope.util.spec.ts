import {
  buildCountryScopeOr,
  resolveCountryScopeOr,
  resolveLinkedHistoricalCountryIds,
  type HistoricalCountryLinkReader,
} from './country-scope.util'

describe('country-scope.util', () => {
  describe('buildCountryScopeOr (순수 where 빌더)', () => {
    it('연결 역사국가가 없으면 현대 id 단일 조건', () => {
      expect(buildCountryScopeOr('DE', [])).toEqual({ countryId: 'DE' })
    })

    it('연결 역사국가가 있으면 OR 확장', () => {
      expect(buildCountryScopeOr('DE', ['hre', 'prussia'])).toEqual({
        OR: [
          { countryId: 'DE' },
          { historicalCountryId: { in: ['hre', 'prussia'] } },
        ],
      })
    })

    it('linkedHistoricalIds 중복은 제거', () => {
      expect(buildCountryScopeOr('DE', ['hre', 'hre', 'prussia'])).toEqual({
        OR: [
          { countryId: 'DE' },
          { historicalCountryId: { in: ['hre', 'prussia'] } },
        ],
      })
    })

    it('필드명 재지정 (도메인별 상이 FK)', () => {
      expect(
        buildCountryScopeOr('DE', ['hre'], {
          countryField: 'modernCountryId',
          historicalField: 'histId',
        }),
      ).toEqual({
        OR: [
          { modernCountryId: 'DE' },
          { histId: { in: ['hre'] } },
        ],
      })
    })

    it('빈 배열 + 필드명 재지정도 단일 조건', () => {
      expect(
        buildCountryScopeOr('DE', [], { countryField: 'modernCountryId' }),
      ).toEqual({ modernCountryId: 'DE' })
    })
  })

  describe('resolveLinkedHistoricalCountryIds', () => {
    const makePrisma = (
      rows: Array<{ historicalCountryId: string }>,
    ): HistoricalCountryLinkReader & { calls: unknown[] } => {
      const calls: unknown[] = []
      return {
        calls,
        historicalCountryModernCountry: {
          findMany: (args) => {
            calls.push(args)
            return Promise.resolve(rows)
          },
        },
      }
    }

    it('브리지 행에서 historicalCountryId만 뽑는다', async () => {
      const prisma = makePrisma([
        { historicalCountryId: 'hre' },
        { historicalCountryId: 'prussia' },
      ])
      const ids = await resolveLinkedHistoricalCountryIds(prisma, 'DE')
      expect(ids).toEqual(['hre', 'prussia'])
      expect(prisma.calls[0]).toEqual({
        where: { modernCountryId: 'DE' },
        select: { historicalCountryId: true },
      })
    })

    it('연결이 없으면 빈 배열', async () => {
      const prisma = makePrisma([])
      expect(await resolveLinkedHistoricalCountryIds(prisma, 'FR')).toEqual([])
    })
  })

  describe('resolveCountryScopeOr (조회 + 빌드 편의)', () => {
    const makePrisma = (rows: Array<{ historicalCountryId: string }>) =>
      ({
        historicalCountryModernCountry: {
          findMany: () => Promise.resolve(rows),
        },
      }) as never

    it('연결 있으면 OR 확장까지 반환', async () => {
      const where = await resolveCountryScopeOr(
        makePrisma([{ historicalCountryId: 'hre' }]),
        'DE',
      )
      expect(where).toEqual({
        OR: [
          { countryId: 'DE' },
          { historicalCountryId: { in: ['hre'] } },
        ],
      })
    })

    it('연결 없으면 단일 조건', async () => {
      const where = await resolveCountryScopeOr(makePrisma([]), 'FR')
      expect(where).toEqual({ countryId: 'FR' })
    })
  })
})
