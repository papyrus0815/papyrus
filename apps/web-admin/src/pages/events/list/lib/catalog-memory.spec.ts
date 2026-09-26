import {
  CATALOG_COLLAPSED_KEY,
  CATALOG_QUERY_KEY,
  readCatalogQuery,
  readCollapsedBands,
  saveCatalogQuery,
  saveCollapsedBands,
  toRememberedQuery,
} from './catalog-memory'

describe('catalog-memory', () => {
  beforeEach(() => window.localStorage.clear())

  it('열린 사건(event)은 빼고 쿼리를 기억한다', () => {
    const params = new URLSearchParams('century=19&event=abc&sort=duration')
    expect(toRememberedQuery(params)).toBe('century=19&sort=duration')
    saveCatalogQuery(params)
    expect(readCatalogQuery()).toBe('century=19&sort=duration')
  })

  it('필터를 전부 풀면 빈 쿼리가 기억돼 복원하지 않는다', () => {
    saveCatalogQuery(new URLSearchParams('century=19'))
    saveCatalogQuery(new URLSearchParams(''))
    expect(window.localStorage.getItem(CATALOG_QUERY_KEY)).toBe('')
    expect(readCatalogQuery()).toBeNull()
  })

  it('접힌 세기·연을 왕복하고, 깨진 값은 기본값으로 떨어진다', () => {
    saveCollapsedBands({ years: new Set([1888, 1889]), centuries: [19] })
    expect(readCollapsedBands()).toEqual({
      years: [1888, 1889],
      centuries: [19],
    })
    window.localStorage.setItem(CATALOG_COLLAPSED_KEY, '{"years":["x"]')
    expect(readCollapsedBands()).toEqual({ years: [], centuries: [] })
  })

  it('아무것도 안 접혔으면 키를 지운다', () => {
    saveCollapsedBands({ years: [1888], centuries: [] })
    saveCollapsedBands({ years: [], centuries: [] })
    expect(window.localStorage.getItem(CATALOG_COLLAPSED_KEY)).toBeNull()
  })
})
