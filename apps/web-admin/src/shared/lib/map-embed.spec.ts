import {
  isAllowedMapEmbedSrc,
  readMapFigure,
  looksLikeMapPaste,
  mapEmbedHtml,
  parseMapInput,
} from './map-embed'

const embedOf = (input: string) => {
  const result = parseMapInput(input)
  if (!result.ok) throw new Error(result.reason)
  return result.embed
}

describe('parseMapInput', () => {
  it('구글 "지도 퍼가기" iframe 코드 → 그 src', () => {
    const code =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12&amp;x=1" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
    expect(embedOf(code)).toEqual({
      src: 'https://www.google.com/maps/embed?pb=!1m18!1m12&x=1',
      kind: 'embed',
    })
  })

  it('내 지도(My Maps) 보기·편집 주소 → 퍼가기 주소', () => {
    expect(embedOf('https://www.google.com/maps/d/viewer?mid=1AbC_x&ll=48,2&z=5')).toEqual({
      src: 'https://www.google.com/maps/d/embed?mid=1AbC_x',
      kind: 'mymaps',
    })
    expect(embedOf('https://www.google.com/maps/d/edit?mid=1AbC_x').src).toBe(
      'https://www.google.com/maps/d/embed?mid=1AbC_x',
    )
  })

  it('브라우저 주소창의 장소 주소 → 이름 검색(+줌)', () => {
    const embed = embedOf(
      'https://www.google.com/maps/place/Sarajevo/@43.8563,18.4131,13z/data=!3m1',
    )
    expect(embed.kind).toBe('search')
    // 좌표를 함께 — 이름만이면 동명 장소로 갈 수 있다
    expect(embed.src).toBe(
      'https://maps.google.com/maps?q=Sarajevo&ll=43.8563%2C18.4131&output=embed&z=13',
    )
  })

  it('좌표만 있는 지도 주소 → 좌표 검색', () => {
    expect(embedOf('https://www.google.com/maps/@50.85,4.35,8z').src).toBe(
      'https://maps.google.com/maps?q=50.85%2C4.35&output=embed&z=8',
    )
  })

  it('장소 이름(평문) → 검색 퍼가기', () => {
    expect(embedOf('흑해 시노프').src).toBe(
      'https://maps.google.com/maps?q=%ED%9D%91%ED%95%B4+%EC%8B%9C%EB%85%B8%ED%94%84&output=embed',
    )
  })

  it('짧은 공유 링크는 열 수 없다고 안내', () => {
    const result = parseMapInput('https://maps.app.goo.gl/AbCdEf')
    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.reason).toMatch(/지도 퍼가기/)
  })

  it('구글 지도가 아닌 주소·iframe은 거절', () => {
    expect(parseMapInput('https://example.com/maps').ok).toBe(false)
    expect(parseMapInput('<iframe src="https://evil.example/x"></iframe>').ok).toBe(false)
  })
})

describe('isAllowedMapEmbedSrc', () => {
  it('구글 지도 퍼가기 세 갈래만 허용', () => {
    expect(isAllowedMapEmbedSrc('https://www.google.com/maps/embed?pb=1')).toBe(true)
    expect(isAllowedMapEmbedSrc('https://www.google.com/maps/d/embed?mid=1')).toBe(true)
    expect(isAllowedMapEmbedSrc('https://maps.google.com/maps?q=x&output=embed')).toBe(true)
  })

  it('꼬리 붙이기·http·다른 경로는 거절', () => {
    expect(isAllowedMapEmbedSrc('https://www.google.com.evil.example/maps/embed?pb=1')).toBe(false)
    expect(isAllowedMapEmbedSrc('http://www.google.com/maps/embed?pb=1')).toBe(false)
    expect(isAllowedMapEmbedSrc('https://www.google.com/search?q=x')).toBe(false)
    expect(isAllowedMapEmbedSrc('https://maps.google.com/maps?q=x')).toBe(false)
    expect(isAllowedMapEmbedSrc('javascript:alert(1)')).toBe(false)
  })
})

describe('mapEmbedHtml · looksLikeMapPaste', () => {
  it('설명은 이스케이프, 없으면 figcaption 없음', () => {
    const html = mapEmbedHtml({ src: 'https://www.google.com/maps/embed?pb=1', kind: 'embed' }, '<b>진격로</b>')
    expect(html).toContain('<figcaption>&lt;b&gt;진격로&lt;/b&gt;</figcaption>')
    expect(html).toContain('loading="lazy"')
    expect(mapEmbedHtml({ src: 'https://www.google.com/maps/embed?pb=1', kind: 'embed' }, '')).not.toContain(
      'figcaption',
    )
  })

  it('지도 주소·퍼가기 코드만 자동 변환 대상 — 평범한 글·다른 주소는 아님', () => {
    expect(looksLikeMapPaste('https://www.google.com/maps/place/Sarajevo')).toBe(true)
    expect(looksLikeMapPaste('<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>')).toBe(true)
    expect(looksLikeMapPaste('사라예보에서 암살이 일어났다')).toBe(false)
    expect(looksLikeMapPaste('https://example.com')).toBe(false)
  })
})

describe('크기·기존 블록 읽기', () => {
  it('크기는 data-size로 — 보통은 속성 없음', () => {
    const embed = { src: 'https://www.google.com/maps/embed?pb=1', kind: 'embed' as const }
    expect(mapEmbedHtml(embed, '', 'tall')).toContain('data-size="tall"')
    expect(mapEmbedHtml(embed, '')).not.toContain('data-size')
  })

  it('넣은 지도 블록에서 주소·설명·크기를 되읽는다', () => {
    const holder = document.createElement('div')
    holder.innerHTML = mapEmbedHtml(
      { src: 'https://www.google.com/maps/d/embed?mid=1', kind: 'mymaps' },
      '진격로',
      'small',
    )
    expect(readMapFigure(holder.firstElementChild as Element)).toEqual({
      src: 'https://www.google.com/maps/d/embed?mid=1',
      caption: '진격로',
      size: 'small',
    })
  })
})
