/**
 * 영토 이전 — "이 사건으로 어느 땅이 누구에게서 누구에게로" (docs/event-territory-transfer-review.md).
 * 사건 쪽은 목록·동기화(PUT, 빠진 줄은 지움), 나라 쪽은 '영토 변천'(얻음·잃음).
 */
import { functional } from '@papyrus/api-sdk'

import { nestiaApiService } from './api.service'

export type TerritoryTransfer = Awaited<ReturnType<typeof functional.events.territory_transfers.list>>[number]
export type TerritoryTransferInput = functional.events.territory_transfers.sync.Body['transfers'][number]
export type TerritoryChange = Awaited<
  ReturnType<typeof functional.historical_countries.territory_changes.historicalCountryChanges>
>[number]
export type TerritoryTransferMethod = TerritoryTransfer['method']

/** 방식 — 라벨·한 줄 뜻(고를 때 곁에) */
export const TERRITORY_METHODS: ReadonlyArray<{ value: TerritoryTransferMethod; label: string; hint: string }> = [
  { value: 'PARTITION', label: '분할', hint: '여러 나라가 한 나라의 땅을 나눠 가짐 (폴란드 분할)' },
  { value: 'CESSION', label: '할양', hint: '조약으로 넘겨줌 (시모노세키 조약의 타이완)' },
  { value: 'ANNEXATION', label: '병합', hint: '한 나라나 그 일부를 통째로 편입 (보스니아 병합)' },
  { value: 'EXCHANGE', label: '교환', hint: '땅과 땅을 맞바꿈 (헬골란트-잔지바르)' },
  { value: 'PURCHASE', label: '매입', hint: '돈을 주고 삼 (알래스카·루이지애나)' },
  { value: 'OCCUPATION', label: '점령', hint: '주권은 넘기지 않은 채 실효 지배' },
  { value: 'RETROCESSION', label: '반환', hint: '원래 나라로 되돌려줌 (홍콩 반환)' },
  { value: 'LEASE', label: '조차', hint: '기한을 정해 빌림 (광저우만·웨이하이)' },
  { value: 'OTHER', label: '기타', hint: '그 밖의 방식' },
]

export const territoryMethodLabel = (method: TerritoryTransferMethod) =>
  TERRITORY_METHODS.find((item) => item.value === method)?.label ?? method

export const territoryTransferKeys = {
  all: ['territory-transfers'] as const,
  event: (eventId: string) => ['territory-transfers', 'event', eventId] as const,
  party: (kind: 'country' | 'historical', id: string) => ['territory-transfers', 'party', kind, id] as const,
}

export function getEventTerritoryTransfers(eventId: string): Promise<TerritoryTransfer[]> {
  return functional.events.territory_transfers.list(nestiaApiService.getConnection(), eventId)
}

export function syncEventTerritoryTransfers(
  eventId: string,
  transfers: TerritoryTransferInput[],
  fillParticipants = true,
): Promise<TerritoryTransfer[]> {
  return functional.events.territory_transfers.sync(nestiaApiService.getConnection(), eventId, {
    transfers,
    fillParticipants,
  })
}

export function getHistoricalCountryTerritoryChanges(historicalCountryId: string): Promise<TerritoryChange[]> {
  return functional.historical_countries.territory_changes.historicalCountryChanges(
    nestiaApiService.getConnection(),
    historicalCountryId,
  )
}

export function getCountryTerritoryChanges(countryId: string): Promise<TerritoryChange[]> {
  return functional.countries.territory_changes.countryChanges(nestiaApiService.getConnection(), countryId)
}

/** 저장된 줄 → 다시 보낼 입력(동기화는 전체 목록이라 고치지 않은 줄도 같이 보낸다) */
export function toTerritoryInput(row: TerritoryTransfer): TerritoryTransferInput {
  return {
    id: row.id,
    fromCountryId: row.from.countryId,
    fromHistoricalCountryId: row.from.historicalCountryId,
    fromName: row.from.countryId || row.from.historicalCountryId ? null : row.from.name,
    toCountryId: row.to.countryId,
    toHistoricalCountryId: row.to.historicalCountryId,
    toName: row.to.countryId || row.to.historicalCountryId ? null : row.to.name,
    regionName: row.regionName,
    method: row.method,
    areaKm2: row.areaKm2,
    population: row.population,
    treatyId: row.treaty?.id ?? null,
    effectiveEra: row.effectiveEra,
    effectiveYear: row.effectiveYear,
    effectiveMonth: row.effectiveMonth,
    effectiveDay: row.effectiveDay,
    note: row.note,
  }
}
