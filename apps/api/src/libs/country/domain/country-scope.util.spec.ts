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

    // 검토서 R4 불변식: 표시 분류(전신/구성국/유산)는 스코프 합산에 영향을 주지 않는다.
    // 표시 UI가 '구성국'·'유산'으로 접는 역사국가라도 스코프 OR에는 전부 포함돼야 한다.
    it('표시 분류와 무관하게 연결 id 전부를 IN에 담는다 (관계타입 필터 없음)', () => {
      // hre=전신, bavaria=구성국, rome=유산 으로 표시 분류되더라도 스코프는 셋 다 포함.
      const where = buildCountryScopeOr('DE', ['hre', 'bavaria', 'rome'])
      expect(where).toEqual({
        OR: [
          { countryId: 'DE' },
          { historicalCountryId: { in: ['hre', 'bavaria', 'rome'] } },
        ],
      })
    })

    it('relationKind 같은 분류 필터 인자를 받지 않는다 (시그니처 격리)', () => {
      // buildCountryScopeOr(modernId, ids, options?) — 3번째 인자는 필드명 옵션뿐.
      // 분류 필터가 추가되면 이 길이 단언이 깨져 규약 위반을 조기 포착한다.
      expect(buildCountryScopeOr.length).toBe(3)
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
