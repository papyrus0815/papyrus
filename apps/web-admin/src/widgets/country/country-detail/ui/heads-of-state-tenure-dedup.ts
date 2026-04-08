/**
 * 역대 수반 UI: 동일 인물·동일 취임일·동일 국가 범위에서
 * `SOVEREIGN_REIGN`(재위)과 `TENURE`(HEAD_OF_STATE 재임)가 같이 오면
 * 행정부 수반용 재임 행은 목록에서 숨기고 재위 행만 남긴다.
 *
 * DB/백필 정책상 국왕 재임이 양쪽 테이블에 복제된 경우의 중복 표시 방지.
 */

function normalizePersonId(id: unknown): string | null {
  if (id == null || id === '') return null
  return String(id).trim().toLowerCase()
}

function startDateKey(d: unknown): string | null {
  if (d == null || d === '') return null
  const s = d instanceof Date ? d.toISOString() : String(d)
  const m = s.match(/^(-?\d{4}-\d{2}-\d{2})/)
  return m ? m[1]! : s.slice(0, 10)
}

export function isHeadOfStateTenureRow(t: any): boolean {
  const pt = t?.positionType ?? t?.positionDefinition?.positionType
  return pt === 'HEAD_OF_STATE'
}

function countryScopeMatch(a: any, b: any): boolean {
  const ac = a?.countryId ?? null
  const ah = a?.historicalCountryId ?? null
  const bc = b?.countryId ?? null
  const bh = b?.historicalCountryId ?? null
  return ac === bc && ah === bh
}

export function tenureRowShadowsSovereignReign(tenure: any, sovereign: any): boolean {
  const pidT = normalizePersonId(tenure?.personId)
  const pidS = normalizePersonId(sovereign?.personId)
  if (!pidT || !pidS || pidT !== pidS) return false
  const tk = startDateKey(tenure?.startDate)
  const sk = startDateKey(sovereign?.startDate)
  if (!tk || !sk || tk !== sk) return false
  return countryScopeMatch(tenure, sovereign)
}

export type DisplayLinkedHeadTenure = {
  id: string
  cabinetId?: string | null
  cabinetName?: string | null
}

/** 재위 행에만: 목록·계보 카드에서 숨긴 행정부 수반 재임 안내 */
export function adminTenureHintFromRow(t: any): string | null {
  const link = t?._displayLinkedHeadTenure as DisplayLinkedHeadTenure | undefined
  if (!link) return null
  const name =
    typeof link.cabinetName === 'string' ? link.cabinetName.trim() : ''
  if (name) return `같은 기간 행정부 수반 재임 연결 · ${name}`
  return '같은 기간 행정부 수반 재임이 있습니다. 각료는 행정부 탭에서 보세요.'
}

/**
 * @returns 새 배열. 재위 행은 `_displayLinkedHeadTenure`가 붙을 수 있음(표시용 메타).
 */
export function dedupeHeadsOfStateTenuresForDisplay(rows: readonly any[]): any[] {
  const list = [...rows]
  const sovereigns = list.filter((r) => r?.recordKind === 'SOVEREIGN_REIGN')
  const toDrop = new Set<string>()
  const linkBySovereignId = new Map<string, DisplayLinkedHeadTenure>()

  for (const t of list) {
    if (t?.recordKind !== 'TENURE') continue
    if (!isHeadOfStateTenureRow(t)) continue
    const match = sovereigns.find((s) => tenureRowShadowsSovereignReign(t, s))
    if (!match) continue
    toDrop.add(t.id)
    if (!linkBySovereignId.has(match.id)) {
      linkBySovereignId.set(match.id, {
        id: t.id,
        cabinetId: t.cabinetId ?? null,
        cabinetName: t.cabinet?.name ?? null,
      })
    }
  }

  return list
    .filter((r) => !toDrop.has(r.id))
    .map((r) => {
      if (r?.recordKind !== 'SOVEREIGN_REIGN') return r
      const link = linkBySovereignId.get(r.id)
      if (!link) return r
      return { ...r, _displayLinkedHeadTenure: link }
    })
}
