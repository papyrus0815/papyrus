import { isContentAreaPath } from './routes'

/**
 * 인물 지면을 `/persons-timeline`으로 통합하면서 등록/수정 폼도 같은 프리픽스로 옮겼다.
 * 폼은 ContentLayout 셸이 없는 단일 컬럼 풀페이지라, 프리픽스만 보고 콘텐츠 영역으로
 * 판정하면 lazy 로딩 스켈레톤이 사이드바·3분할(ContentSkeleton)로 잘못 뜬다.
 */
describe('isContentAreaPath', () => {
  it('콘텐츠 영역 대시보드 경로는 true', () => {
    expect(isContentAreaPath('/persons-timeline')).toBe(true)
    expect(isContentAreaPath('/persons-timeline/')).toBe(true)
    expect(isContentAreaPath('/persons-timeline/abc123')).toBe(true)
    expect(isContentAreaPath('/persons-timeline/abc123/')).toBe(true)
    expect(isContentAreaPath('/country/kr/dashboard')).toBe(true)
    expect(isContentAreaPath('/heads-of-state/')).toBe(true)
    expect(isContentAreaPath('/ethnicity')).toBe(true)
  })

  it('인물 등록/수정 폼은 같은 프리픽스여도 false', () => {
    expect(isContentAreaPath('/persons-timeline/create')).toBe(false)
    expect(isContentAreaPath('/persons-timeline/create/')).toBe(false)
    expect(isContentAreaPath('/persons-timeline/abc123/edit')).toBe(false)
    expect(isContentAreaPath('/persons-timeline/abc123/edit/')).toBe(false)
  })

  it('콘텐츠 영역 밖 경로는 false', () => {
    expect(isContentAreaPath('/')).toBe(false)
    expect(isContentAreaPath('/events/')).toBe(false)
    expect(isContentAreaPath('/dynasty')).toBe(false)
    // 구 단독 인물 경로 — 이제 redirect만 남아 콘텐츠 영역이 아니다
    expect(isContentAreaPath('/persons/abc123/')).toBe(false)
  })
})
