/**
 * 배열 모듈(연혁·시설·제품·목표주가)의 서버↔로컬 행 동기화 — **id 우선**(검토 F4·F11).
 *
 * 서버가 id 기준 대조 저장으로 바뀌면서 행 id가 저장 사이에 유지된다. 그러면 '어느 로컬 행이
 * 어느 서버 행인가'를 **위치로 짝지으면 안 된다** — 예전 모듈별 syncRows는 행 수가 같으면 같은 자리끼리
 * id를 붙였는데, 정렬·리페치 타이밍이 어긋나면 남의 id를 달고, 다음 저장이 그 행을 덮어쓴다
 * (시설이면 거기 딸린 법규·이력이 다른 시설로 옮겨 간다). 그래서 규칙을 하나로 모은다:
 *
 * 1. serverId가 같은 로컬 행 → 서버 값으로 갱신하되 **key는 유지**(편집 중인 입력 칸이 다시 마운트되지 않게)
 * 2. 아직 id 없는 로컬 행 중 `isSaveOf`가 참인 것 → 그 행이 저장된 결과. key 유지 + id 부여
 * 3. 그 밖의 서버 행 → 새 key로 추가
 * 4. id 없는 로컬 행이 남으면(제목이 비어 아직 저장되지 않은 새 행 등) 끝에 그대로 둔다.
 *    id가 있는데 서버에 없는 로컬 행은 다른 곳에서 지워진 것이라 버린다.
 *
 * 결과 순서는 서버 순서 + 미저장 행 — 모듈이 필요하면 다시 정렬한다.
 */
export interface SyncableRow {
  key: string
  serverId?: string
}

export function syncRowsById<Row extends SyncableRow, Server extends { id: string }>(
  prev: Row[],
  server: Server[],
  options: {
    toRow: (srv: Server, key: string) => Row
    newKey: () => string
    /** id 없는 로컬 행이 이 서버 행을 저장한 결과인가(내용 비교) */
    isSaveOf: (local: Row, srv: Server) => boolean
  },
): Row[] {
  const used = new Set<number>()
  const byServerId = new Map<string, number>()
  prev.forEach((row, index) => {
    if (row.serverId && !byServerId.has(row.serverId)) byServerId.set(row.serverId, index)
  })

  const next: Row[] = server.map((srv) => {
    const matched = byServerId.get(srv.id)
    if (matched !== undefined && !used.has(matched)) {
      used.add(matched)
      return options.toRow(srv, prev[matched].key)
    }
    const saved = prev.findIndex(
      (row, index) => !used.has(index) && !row.serverId && options.isSaveOf(row, srv),
    )
    if (saved >= 0) {
      used.add(saved)
      return options.toRow(srv, prev[saved].key)
    }
    return options.toRow(srv, options.newKey())
  })

  prev.forEach((row, index) => {
    if (!used.has(index) && !row.serverId) next.push(row)
  })
  return next
}
