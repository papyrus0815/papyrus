/**
 * 루트 술어 스펙 — `isTreeRoot`와 `isRenderRoot`를 섞어 쓰면 앵커 스코프에서
 * 화면이 통째로 비는 경로가 생긴다(검토 K4).
 */
import { isRenderRoot, isTreeRoot } from './root-event'

describe('isTreeRoot — 서버 ROOT_EVENT_WHERE의 미러', () => {
  it('parentEventId가 없으면 루트', () => {
    expect(isTreeRoot({ id: 'ww1' })).toBe(true)
    expect(isTreeRoot({ id: 'ww1', parentEventId: null })).toBe(true)
    expect(isTreeRoot({ id: 'ww1', parentEventId: undefined })).toBe(true)
  })

  it('parentEventId가 있으면 루트가 아니다', () => {
    expect(isTreeRoot({ id: 'sarajevo', parentEventId: 'ww1' })).toBe(false)
  })

  it('빈 문자열은 루트로 본다 — 서버가 null을 빈 문자열로 흘리는 경로 방어', () => {
    expect(isTreeRoot({ id: 'ww1', parentEventId: '' })).toBe(true)
  })
})

describe('isRenderRoot — 화면 모수 기준 최상위', () => {
  it('스코프가 없으면 isTreeRoot와 같다', () => {
    expect(isRenderRoot({ id: 'ww1' })).toBe(true)
    expect(isRenderRoot({ id: 'sarajevo', parentEventId: 'ww1' })).toBe(false)
  })

  it('부모가 모수 안이면 최상위가 아니다', () => {
    const scope = new Set(['loan', 'loan-1888'])
    expect(isRenderRoot({ id: 'loan-1888', parentEventId: 'loan' }, scope)).toBe(
      false,
    )
  })

  it('비루트 앵커로 스코프를 잡으면 그 앵커 자신이 최상위가 된다', () => {
    // ?anchor=loan — 모수는 loan과 그 자손. loan의 부모(alliance)는 모수 밖.
    const scope = new Set(['loan', 'loan-1888', 'loan-1891'])
    expect(isRenderRoot({ id: 'loan', parentEventId: 'alliance' }, scope)).toBe(
      true,
    )
  })

  it('유령 부모(소프트삭제로 모수에서 사라진 상위)를 가진 사건도 최상위로 그린다', () => {
    const scope = new Set(['orphan'])
    expect(isRenderRoot({ id: 'orphan', parentEventId: 'deleted' }, scope)).toBe(
      true,
    )
  })
})
