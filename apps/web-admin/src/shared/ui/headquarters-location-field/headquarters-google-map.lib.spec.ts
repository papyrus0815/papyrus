import {
  buildHeadquartersGoogleMapsSpec,
  formatHeadquartersCoordinate,
  parseHeadquartersMapInput,
} from './headquarters-google-map.lib'

describe('headquarters-google-map.lib', () => {
  it('Google 지도 place URL(!3d·!4d)에서 정확한 건물 핀 좌표와 장소명을 함께 추출한다', () => {
    const parsed = parseHeadquartersMapInput(
      'https://www.google.com/maps/place/%EC%A0%95%EB%B6%80%EC%84%9C%EC%9A%B8%EC%B2%AD%EC%82%AC/@37.5748,126.9730,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d37.574889!4d126.975201',
    )
    expect(parsed.isMapUrlOrCoord).toBe(true)
    expect(parsed.extractedLabel).toBe('정부서울청사')
    expect(parsed.point).toEqual({ lat: 37.574889, lng: 126.975201 })
  })

  it('Google 지도 iframe 퍼가기 코드(pb=!2d경도!3d위도)에서도 위·경도를 추출한다', () => {
    const parsed = parseHeadquartersMapInput(
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.2!2d126.975201!3d37.574889!2m3!1f0!2f0!3f0"></iframe>',
    )
    expect(parsed.isMapUrlOrCoord).toBe(true)
    expect(parsed.point).toEqual({ lat: 37.574889, lng: 126.975201 })
  })

  it('도·분·초(DMS) 및 소수점 위·경도 문자열을 WGS84 좌표로 파싱한다', () => {
    const dmsParsed = parseHeadquartersMapInput(
      '북위 37° 34′ 29.6″ 동경 126° 58′ 30.7″',
    )
    expect(dmsParsed.isMapUrlOrCoord).toBe(true)
    expect(dmsParsed.point?.lat).toBeCloseTo(37.574889, 4)
    expect(dmsParsed.point?.lng).toBeCloseTo(126.975194, 4)

    const ddParsed = parseHeadquartersMapInput('37.574889, 126.975201')
    expect(ddParsed.isMapUrlOrCoord).toBe(true)
    expect(ddParsed.point).toEqual({ lat: 37.574889, lng: 126.975201 })
    expect(formatHeadquartersCoordinate(ddParsed.point!)).toBe(
      '북위 37.5749°, 동경 126.9752°',
    )
  })

  it('좌표가 있으면 핀 고정 구글 지도 임베드 URL을, 텍스트만 있으면 국가명 결합 검색 임베드 URL을 생성한다', () => {
    const pinnedSpec = buildHeadquartersGoogleMapsSpec({
      headquarters: '한성부 광화문 앞 육조거리',
      latitude: 37.574889,
      longitude: 126.975201,
      countryName: '조선',
    })
    expect(pinnedSpec?.mode).toBe('pinned')
    expect(pinnedSpec?.embedUrl).toContain('ll=37.574889%2C126.975201')
    expect(pinnedSpec?.embedUrl).toContain('output=embed')

    const textOnlySpec = buildHeadquartersGoogleMapsSpec({
      headquarters: '정부서울청사',
      latitude: null,
      longitude: null,
      countryName: '대한민국',
    })
    expect(textOnlySpec?.mode).toBe('query')
    expect(new URL(textOnlySpec!.embedUrl).searchParams.get('q')).toBe(
      '대한민국 정부서울청사',
    )

    const hybridSpec = buildHeadquartersGoogleMapsSpec({
      headquarters: '정부서울청사',
      latitude: 37.574889,
      longitude: 126.975201,
      zoom: 17,
      mapLayer: 'hybrid',
    })
    const hybridParams = new URL(hybridSpec!.embedUrl).searchParams
    expect(hybridParams.get('t')).toBe('h')
    expect(hybridParams.get('z')).toBe('17')
  })
})
