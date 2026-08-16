import {
  createMemoryRouter,
  matchRoutes,
  type RouteObject,
} from 'react-router-dom'

import {
  personFormRoutes,
  personsTimelineRoutes,
} from '@/pages/persons-timeline/persons-timeline.route'

import { legacyPersonsRedirectRoutes } from './legacy-redirects'

/**
 * 인물 지면을 `/persons-timeline` 하나로 통합한 뒤의 라우팅 계약.
 *
 * 폼(`create`·`:id/edit`)은 대시보드와 URL 프리픽스를 공유하지만 ContentLayout 셸이
 * 없어서 **다른 라우트 그룹**에 등록된다. 이 스펙은 그룹이 갈라져도 정적 세그먼트가
 * 동적 세그먼트를 이긴다는 것과, 구 `/persons/*` 북마크가 전부 흡수되는지를 고정한다.
 */

/** browser-router.tsx의 중첩 구조를 실제 라우트 객체로 재현 */
const routes: RouteObject[] = [
  {
    children: [
      {
        // <Layout /> 그룹
        children: [
          ...personFormRoutes,
          {
            // <ContentLayout /> 그룹
            children: personsTimelineRoutes,
          },
          ...legacyPersonsRedirectRoutes,
        ],
      },
      { path: '*' },
    ],
  },
]

/** 주어진 URL이 최종적으로 매칭하는 라우트의 path와 params */
function match(url: string) {
  const matched = matchRoutes(routes, url)
  const leaf = matched?.[matched.length - 1]
  return { path: leaf?.route.path, params: leaf?.params }
}

/** loader가 돌려주는 redirect Response */
async function responseFor(url: string): Promise<Response> {
  const matched = matchRoutes(routes, url)
  const leaf = matched?.[matched.length - 1]
  const loader = leaf?.route.loader
  if (typeof loader !== 'function') {
    throw new Error(`${url}에 loader가 없음 (매칭: ${leaf?.route.path})`)
  }
  return (await loader({
    params: leaf!.params,
    request: new Request(`http://localhost${url}`),
    // 라우터가 넘기는 나머지 인자(context·unstable_pattern 등)는 이 loader들이 쓰지 않는다.
    unstable_pattern: leaf!.route.path ?? '',
    context: undefined as never,
  })) as Response
}

/** redirect Response의 Location 헤더 */
async function locationOf(url: string): Promise<string> {
  return (await responseFor(url)).headers.get('Location') ?? ''
}

describe('인물 라우트 통합 — /persons-timeline', () => {
  it('대시보드 목록·상세로 매칭된다', () => {
    expect(match('/persons-timeline')).toEqual({
      path: 'persons-timeline',
      params: {},
    })
    expect(match('/persons-timeline/')).toEqual({
      path: 'persons-timeline',
      params: {},
    })
    expect(match('/persons-timeline/abc123')).toEqual({
      path: 'persons-timeline/:personId',
      params: { personId: 'abc123' },
    })
    expect(match('/persons-timeline/abc123/')).toEqual({
      path: 'persons-timeline/:personId',
      params: { personId: 'abc123' },
    })
  })

  it('폼 라우트가 다른 그룹에 있어도 :personId보다 먼저 매칭된다', () => {
    // 정적 'create'가 동적 ':personId'를 이겨야 함 — 지면이 서로 다른 셸에 등록돼 있어도.
    expect(match('/persons-timeline/create').path).toBe('persons-timeline/create')
    expect(match('/persons-timeline/create/').path).toBe(
      'persons-timeline/create',
    )
    expect(match('/persons-timeline/abc123/edit')).toEqual({
      path: 'persons-timeline/:personId/edit',
      params: { personId: 'abc123' },
    })
    expect(match('/persons-timeline/abc123/edit/')).toEqual({
      path: 'persons-timeline/:personId/edit',
      params: { personId: 'abc123' },
    })
  })

  it('구 /persons/* 북마크가 전부 흡수된다', async () => {
    await expect(locationOf('/persons')).resolves.toBe('/persons-timeline/')
    await expect(locationOf('/persons/')).resolves.toBe('/persons-timeline/')
    await expect(locationOf('/persons/create/')).resolves.toBe(
      '/persons-timeline/create/',
    )
    await expect(locationOf('/persons/abc123/')).resolves.toBe(
      '/persons-timeline/abc123/',
    )
    await expect(locationOf('/persons/abc123/edit/')).resolves.toBe(
      '/persons-timeline/abc123/edit/',
    )
  })

  it('구 상세 딥링크의 쿼리(탭)를 보존한다', async () => {
    // 연보 탭 딥링크(?tab=events)가 리다이렉트에서 유실되면 탭이 개요로 튄다.
    await expect(locationOf('/persons/abc123/?tab=events')).resolves.toBe(
      '/persons-timeline/abc123/?tab=events',
    )
  })

  it('리다이렉트는 PUSH가 아니라 REPLACE다 — 구 URL이 스택에 남으면 뒤로가기가 갇힌다', async () => {
    for (const url of [
      '/persons',
      '/persons/create/',
      '/persons/abc123/',
      '/persons/abc123/edit/',
    ]) {
      const response = await responseFor(url)
      // react-router 7은 이 헤더가 있을 때만 히스토리를 REPLACE한다.
      expect(response.headers.get('X-Remix-Replace')).toBe('true')
    }
  })

  /** 라우터가 진행 중인 내비게이션(리다이렉트 포함)을 끝낼 때까지 대기 */
  const settle = (router: ReturnType<typeof createMemoryRouter>) =>
    new Promise<void>((resolve) => {
      const done = (state: typeof router.state) =>
        state.initialized && state.navigation.state === 'idle'
      if (done(router.state)) {
        resolve()
        return
      }
      const unsubscribe = router.subscribe((state) => {
        if (done(state)) {
          unsubscribe()
          resolve()
        }
      })
    })

  it('구 URL로 진입해도 뒤로가기가 출발지로 돌아간다', async () => {
    // 실제 페이지를 로드하지 않도록 목적지는 빈 라우트로 두고 히스토리 동작만 본다.
    const router = createMemoryRouter(
      [
        { path: '/events', element: null },
        { path: '/persons-timeline/:personId', element: null },
        ...legacyPersonsRedirectRoutes,
      ],
      { initialEntries: ['/events', '/persons/abc123/'], initialIndex: 1 },
    )
    router.initialize()
    await settle(router)
    expect(router.state.location.pathname).toBe('/persons-timeline/abc123/')

    await router.navigate(-1)
    await settle(router)
    expect(router.state.location.pathname).toBe('/events')

    router.dispose()
  })

  it('리다이렉트 목적지가 다시 리다이렉트로 매칭되지 않는다(루프 없음)', () => {
    // /persons-timeline/* 는 전부 실제 페이지 라우트여야 한다.
    for (const url of [
      '/persons-timeline/',
      '/persons-timeline/create/',
      '/persons-timeline/abc123/',
      '/persons-timeline/abc123/edit/',
    ]) {
      const matched = matchRoutes(routes, url)
      const leaf = matched?.[matched.length - 1]
      expect(leaf?.route.loader).toBeUndefined()
      expect(leaf?.route.lazy).toBeDefined()
    }
  })
})
