import { syncRowsById } from './sync-rows-by-id'

type Row = { key: string; serverId?: string; title: string }
type Srv = { id: string; title: string }

let counter = 0
const options = {
  toRow: (srv: Srv, key: string): Row => ({ key, serverId: srv.id, title: srv.title }),
  newKey: () => `new-${++counter}`,
  isSaveOf: (local: Row, srv: Srv) => local.title === srv.title,
}

describe('syncRowsById', () => {
  beforeEach(() => {
    counter = 0
  })

  it('id가 같으면 서버 값으로 갱신하고 key는 유지 — 위치가 달라도', () => {
    const prev: Row[] = [
      { key: 'a', serverId: '1', title: 'A' },
      { key: 'b', serverId: '2', title: 'B' },
    ]
    // 서버 순서가 바뀌고 내용도 바뀜
    const next = syncRowsById(prev, [
      { id: '2', title: 'B2' },
      { id: '1', title: 'A2' },
    ], options)
    expect(next).toEqual([
      { key: 'b', serverId: '2', title: 'B2' },
      { key: 'a', serverId: '1', title: 'A2' },
    ])
  })

  it('행 수가 같아도 위치로 id를 붙이지 않는다', () => {
    // 예전 결함: 같은 자리라는 이유로 로컬 '새 행'이 남의 id를 달았다
    const prev: Row[] = [
      { key: 'a', serverId: '1', title: 'A' },
      { key: 'local', title: '새 시설' },
    ]
    const next = syncRowsById(prev, [
      { id: '1', title: 'A' },
      { id: '9', title: '다른 시설' },
    ], options)
    expect(next.find((row) => row.key === 'local')).toEqual({ key: 'local', title: '새 시설' })
    expect(next.find((row) => row.serverId === '9')?.key).toBe('new-1')
  })

  it('id 없는 로컬 행이 저장되면 key를 유지한 채 id를 받는다', () => {
    const prev: Row[] = [{ key: 'local', title: '새 연혁' }]
    expect(syncRowsById(prev, [{ id: '5', title: '새 연혁' }], options)).toEqual([
      { key: 'local', serverId: '5', title: '새 연혁' },
    ])
  })

  it('아직 저장 안 된 로컬 행은 끝에 남기고, 서버에서 지워진 행은 버린다', () => {
    const prev: Row[] = [
      { key: 'a', serverId: '1', title: 'A' },
      { key: 'gone', serverId: '2', title: 'B' },
      { key: 'draft', title: '' },
    ]
    expect(syncRowsById(prev, [{ id: '1', title: 'A' }], options)).toEqual([
      { key: 'a', serverId: '1', title: 'A' },
      { key: 'draft', title: '' },
    ])
  })
})
