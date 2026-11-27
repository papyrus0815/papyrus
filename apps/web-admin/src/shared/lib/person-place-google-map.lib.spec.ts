import {
  buildCleanGoogleSearchQuery,
  buildPersonPlaceGoogleMapsUrls,
  computeHaversineDistanceKm,
} from './person-place-google-map.lib'

describe('person-place-google-map.lib', () => {
  it('현대 지명 병기("— 현 ...", "(현 ...)")가 있으면 현대 지명을 최우선 검색어로 추출한다', () => {
    expect(
      buildCleanGoogleSearchQuery(
        '무사시국 에도성 — 현 도쿄도 지요다구',
        '일본',
      ),
    ).toBe('도쿄도 지요다구')

    expect(
      buildCleanGoogleSearchQuery(
        '러시아 제국 티플리스 (현 조지아 트빌리시)',
        '조지아',
      ),
    ).toBe('조지아 트빌리시')
  })

  it('정본 Place 좌표가 있으면 고정 좌표 Google 지도 임베드·외부 링크·거리뷰 URL을 생성한다', () => {
    const urls = buildPersonPlaceGoogleMapsUrls({
      place: {
        id: 'pl-1',
        kind: 'SITE',
        name: '와카야마성',
        latitude: 34.225556,
        longitude: 135.1715,
        googlePlaceId: 'ChIJ_wakayama',
        defaultZoom: 15,
      },
      historicalLabel: '기이국 와카야마성',
      layer: 'hybrid',
    })

    expect(urls).not.toBeNull()
    expect(urls?.mode).toBe('pinned')
    expect(urls?.embedUrl).toContain('q=34.225556%2C135.1715')
    expect(urls?.embedUrl).toContain('t=h')
    expect(urls?.externalUrl).toContain('query_place_id=ChIJ_wakayama')
    expect(urls?.streetViewUrl).toContain('map_action=pano')
  })

  it('두 좌표 사이의 대권 거리(km)를 계산한다', () => {
    // 와카야마성 -> 오사카성 (~58km)
    const km = computeHaversineDistanceKm(
      { lat: 34.2256, lng: 135.1715 },
      { lat: 34.6873, lng: 135.5262 },
    )
    expect(km).toBeGreaterThan(50)
    expect(km).toBeLessThan(70)
  })
})
