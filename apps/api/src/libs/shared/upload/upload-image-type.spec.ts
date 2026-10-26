import { resolveImageExtension } from './upload-image-type'

describe('resolveImageExtension', () => {
  it.each([
    ['image/jpeg', 'photo.JPG', '.jpg'],
    ['image/jpeg', 'photo.jpeg', '.jpg'],
    ['image/png', 'flag.png', '.png'],
    ['image/webp', 'a.webp', '.webp'],
    ['image/svg+xml', 'emblem.svg', '.svg'],
  ])('%s + %s → %s', (mime, name, expected) => {
    expect(resolveImageExtension(mime, name)).toBe(expected)
  })

  it.each([
    ['image/png', 'x.html', 'MIME만 이미지인 HTML'],
    ['text/html', 'x.png', '확장자만 이미지인 HTML'],
    ['image/png', 'x.svg', 'MIME과 확장자 불일치'],
    ['image/png', 'noext', '확장자 없음'],
    ['application/octet-stream', 'a.jpg', '허용 외 MIME'],
    [undefined, 'a.jpg', 'MIME 없음'],
  ])('%s + %s → 거절 (%s)', (mime, name, _reason) => {
    expect(resolveImageExtension(mime as string | undefined, name)).toBeNull()
  })
})
