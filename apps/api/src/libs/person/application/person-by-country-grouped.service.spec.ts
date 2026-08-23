/**
 * 국가 상세 "인물" 탭 — 현대/과거 묶음 분리 규칙 회귀 테스트.
 *
 * 지키려는 계약 두 가지:
 * 1. 한 인물이 현대 축과 과거국가 축에 **모두** 걸리면 과거 그룹에만 남는다(역사 우선).
 *    안 그러면 '현대' 묶음이 실제로 현대 국가 소속이 아닌 사람까지 담아 구분이 무의미해진다.
 * 2. 인물이 0명인 과거국가는 묶음으로 내보내지 않는다(빈 아코디언 방지).
 */
import { PersonService } from './person.service'

type AnyRepo = Record<string, jest.Mock>

const person = (id: string, name: string) => ({ id, name }) as never

function makeService(repo: Partial<AnyRepo>) {
  const base: AnyRepo = {
    findPersonsByCountryId: jest.fn().mockResolvedValue([]),
    findPersonsWithTenureInCountry: jest.fn().mockResolvedValue([]),
    findPersonsByAffiliationInCountry: jest.fn().mockResolvedValue([]),
    findLinkedHistoricalCountries: jest.fn().mockResolvedValue([]),
    findPersonsByHistoricalCountryIdsGrouped: jest
      .fn()
      .mockResolvedValue(new Map()),
  }
  const merged = { ...base, ...repo }
  // 이 경로(findPersonsByCountryGrouped)는 repository만 쓴다 — 나머지 의존성은 미사용이라
  // null을 넣어도 접근되지 않는다.
  return new PersonService(
    merged as never,
    null as never,
    null as never,
    null as never,
    null as never,
  )
}

describe('PersonService.findPersonsByCountryGrouped', () => {
  it('현대·과거 양쪽에 걸린 인물은 과거 그룹에만 남는다 (역사 우선)', async () => {
    const both = person('p-both', '카를')
    const onlyModern = person('p-modern', '리벤트로프')

    const service = makeService({
      // 현대 축 3원 합집합의 첫 소스만 채워도 결과는 동일 (mergePersonSources)
      findPersonsByCountryId: jest.fn().mockResolvedValue([both, onlyModern]),
      findLinkedHistoricalCountries: jest
        .fn()
        .mockResolvedValue([{ id: 'hc-1', name: '프랑크 왕국', startYear: 800 }]),
      findPersonsByHistoricalCountryIdsGrouped: jest
        .fn()
        .mockResolvedValue(new Map([['hc-1', [both]]])),
    })

    const result = await service.findPersonsByCountryGrouped('c-1')

    expect(result.modern.map((item) => item.id)).toEqual(['p-modern'])
    expect(result.historical).toHaveLength(1)
    expect(result.historical[0].historicalCountryName).toBe('프랑크 왕국')
    expect(result.historical[0].persons.map((item) => item.id)).toEqual([
      'p-both',
    ])
  })

  it('인물이 없는 과거국가는 묶음으로 내보내지 않는다', async () => {
    const service = makeService({
      findPersonsByCountryId: jest.fn().mockResolvedValue([person('p-1', '갑')]),
      findLinkedHistoricalCountries: jest.fn().mockResolvedValue([
        { id: 'hc-empty', name: '조선', startYear: 1392 },
        { id: 'hc-full', name: '고려', startYear: 918 },
      ]),
      findPersonsByHistoricalCountryIdsGrouped: jest
        .fn()
        .mockResolvedValue(new Map([['hc-full', [person('p-2', '을')]]])),
    })

    const result = await service.findPersonsByCountryGrouped('c-1')

    expect(result.historical.map((group) => group.historicalCountryName)).toEqual(
      ['고려'],
    )
    expect(result.modern.map((item) => item.id)).toEqual(['p-1'])
  })

  it('연결된 과거국가가 없으면 현대 목록만 돌려준다', async () => {
    const service = makeService({
      findPersonsByCountryId: jest.fn().mockResolvedValue([person('p-1', '갑')]),
    })

    const result = await service.findPersonsByCountryGrouped('c-1')

    expect(result.historical).toEqual([])
    expect(result.modern).toHaveLength(1)
  })
})
