/**
 * 행정부·내각 목록의 **군주 행** — 재위(군주직 재임)를 내각 행과 같은 줄에 세운다.
 *
 * 왜 필요한가 — 행정부 목록의 행은 `cabinet`이다. 「군주·원수 재위 등록」과 재위 시드는 재위만 만들고
 * 내각 행은 만들지 않아(실DB 재위 200건 중 내각 연결 0건), 군주는 총리 내각과 기간이 겹칠 때만 행 사이
 * '군주 교체' 표지로 비쳤다. 내각이 없는 전근대 왕조(러시아 차르국)는 통째로 「등록된 행정부가 없습니다」였다.
 *
 * 방식 — 내각이 없는 재위를 **읽을 때 가상 내각 행**(`reign:<tenureId>`)으로 합친다. 데이터를 복제하지 않으니
 * 시드·등록 어디로 들어온 재위든 바로 보이고, 재위와 내각 행이 따로 놀 일이 없다. 그 재위 아래 대신·사건·조약을
 * 묶고 싶을 때만 실제 내각을 만든다(행을 열 때) — 그 뒤엔 실제 내각이 같은 자리를 대신한다.
 */
import type {
  CabinetListItemDto,
  GovernmentHeadTenureInCabinetList,
} from '@/shared/api/person-career'

import { getPersonName } from './cabinets-section.helpers'

export const REIGN_ROW_ID_PREFIX = 'reign:'

export function isReignRowId(cabinetId: string | null | undefined): boolean {
  return typeof cabinetId === 'string' && cabinetId.startsWith(REIGN_ROW_ID_PREFIX)
}

export function reignTenureIdOfRow(cabinetId: string): string {
  return cabinetId.slice(REIGN_ROW_ID_PREFIX.length)
}

/** 재위(군주직) 수반인가 — 재임 피드는 `isMonarchical`, 내각 응답의 수반은 직위 정의 쪽에 실린다 */
export function isMonarchicalHead(
  head: { isMonarchical?: boolean | null; positionDefinition?: unknown } | null | undefined,
): boolean {
  if (!head) return false
  if (head.isMonarchical === true) return true
  // 직위 정의 타입(GovernmentCabinetTenureItem)엔 isMonarchical 칸이 선언돼 있지 않지만 응답엔 실린다
  const definition = head.positionDefinition as { isMonarchical?: boolean | null } | null | undefined
  return definition?.isMonarchical === true
}

/**
 * 수반 표시명 — 군주는 왕명(이반 4세 (뇌제)), 그 밖은 인물 이름.
 * 군주를 인물 이름으로 쓰면 차르국 11명 중 '이반'·'표도르'가 세 번씩 겹쳐 누가 누군지 안 보인다.
 */
export function cabinetHeadDisplayName(
  head:
    | (Pick<GovernmentHeadTenureInCabinetList, 'regnalName' | 'person' | 'isMonarchical' | 'positionDefinition'>)
    | null
    | undefined,
): string | null {
  if (!head) return null
  const regnal = head.regnalName?.trim()
  if (regnal && isMonarchicalHead(head)) return regnal
  return head.person ? getPersonName(head.person) : null
}

type StructuredEnd = {
  era?: string | null
  year?: number | null
  month?: number | null
  day?: number | null
}

/**
 * 구조화 칸 → 부호 있는 날짜 문자열('1547-01-16', 기원전 '-0044-03-15'). 목록의 날짜 파서(parseSignedDateParts)가
 * 읽는 형식이다. 재위의 DATETIME은 AD1000+만 담겨 기원전·고대 재위는 비어 있으므로 구조화 칸이 진실이다.
 */
function signedDateString(end: StructuredEnd): string | null {
  if (end.year == null || end.year <= 0) return null
  const pad2 = (value: number) => String(value).padStart(2, '0')
  const yearToken = end.era === 'BC' ? `-${String(end.year).padStart(4, '0')}` : String(end.year).padStart(4, '0')
  return `${yearToken}-${pad2(end.month ?? 1)}-${pad2(end.month != null ? (end.day ?? 1) : 1)}`
}

type ReignTenure = GovernmentHeadTenureInCabinetList & {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}

/**
 * 내각이 없는 재위 → 가상 내각 행. 이미 그 재위를 수반으로 둔 내각이 있으면 만들지 않는다(실제 내각이 대신).
 * 기간은 재위의 구조화 칸이 우선, 없을 때만 DATETIME.
 */
export function buildReignRowCabinets(
  cabinets: readonly CabinetListItemDto[],
  tenures: readonly unknown[],
): CabinetListItemDto[] {
  const headedTenureIds = new Set<string>()
  for (const cabinet of cabinets) {
    const headId = cabinet.headTenureId ?? cabinet.headTenure?.id
    if (headId) headedTenureIds.add(headId)
  }
  const rows: CabinetListItemDto[] = []
  for (const raw of tenures as ReignTenure[]) {
    if (!raw || raw.isMonarchical !== true || headedTenureIds.has(raw.id)) continue
    const startDate =
      signedDateString({ era: raw.startEra, year: raw.startYear, month: raw.startMonth, day: raw.startDay }) ??
      raw.startDate ??
      null
    if (!startDate) continue
    const endDate =
      signedDateString({ era: raw.endEra, year: raw.endYear, month: raw.endMonth, day: raw.endDay }) ??
      raw.endDate ??
      null
    rows.push({
      id: `${REIGN_ROW_ID_PREFIX}${raw.id}`,
      name: null,
      description: null,
      headTenureId: raw.id,
      countryId: raw.countryId ?? null,
      historicalCountryId: raw.historicalCountryId ?? null,
      startDate,
      endDate,
      country: raw.country ?? null,
      historicalCountry: raw.historicalCountry ?? null,
      linkageGroup: null,
      politicalParties: [],
      _count: { members: 0, memberTenures: 0, events: 0, treatySignatories: 0 },
      headTenure: { ...raw, startDate, endDate },
    })
  }
  return rows
}
