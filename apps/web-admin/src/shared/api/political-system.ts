/**
 * 정체(政體) API 래퍼 — Nestia SDK 기반.
 *
 * 백엔드: /political-systems (목록은 countryId 또는 historicalCountryId로 스코프)
 * countryId를 주면 서버가 연결된 과거 국가의 정체까지 함께 준다(브리지 스코프).
 */
import * as politicalSystemsApi from '@api/functional/political_systems'

import { getApiConnection } from './client'

export type PoliticalSystem = Awaited<
  ReturnType<typeof politicalSystemsApi.list>
>[number]

export type CreatePoliticalSystemInput = Parameters<
  typeof politicalSystemsApi.create
>[1]

export type UpdatePoliticalSystemInput = Parameters<
  typeof politicalSystemsApi.update
>[2]

/** TransformInterceptor로 래핑된 응답({ data })에서 알맹이를 꺼낸다 */
function unwrap<T>(response: unknown): T {
  const wrapped = response as { data?: T }
  return (wrapped?.data ?? response) as T
}

export interface PoliticalSystemScope {
  countryId?: string
  historicalCountryId?: string
  includeConstituents?: boolean
}

export async function listPoliticalSystems(
  scope: PoliticalSystemScope,
): Promise<PoliticalSystem[]> {
  if (scope.includeConstituents && scope.historicalCountryId) {
    const query = new URLSearchParams()
    if (scope.countryId) query.set('countryId', scope.countryId)
    query.set('historicalCountryId', scope.historicalCountryId)
    query.set('includeConstituents', 'true')
    const conn = getApiConnection()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(conn.headers as Record<string, string>),
    }
    const rawResponse = await fetch(
      `${conn.host}/political-systems?${query.toString()}`,
      { method: 'GET', headers },
    )
    if (!rawResponse.ok) {
      const errorText = await rawResponse.text()
      throw new Error(errorText || `HTTP ${rawResponse.status}`)
    }
    const parsedBody: unknown = await rawResponse.json()
    const rows = unwrap<PoliticalSystem[]>(parsedBody)
    return Array.isArray(rows) ? rows : []
  }
  const response = await politicalSystemsApi.list(
    getApiConnection(),
    scope.countryId,
    scope.historicalCountryId,
  )
  const rows = unwrap<PoliticalSystem[]>(response)
  return Array.isArray(rows) ? rows : []
}

export async function createPoliticalSystem(
  dto: CreatePoliticalSystemInput,
): Promise<PoliticalSystem> {
  return unwrap<PoliticalSystem>(
    await politicalSystemsApi.create(getApiConnection(), dto),
  )
}

export async function updatePoliticalSystem(
  id: string,
  dto: UpdatePoliticalSystemInput,
): Promise<PoliticalSystem> {
  return unwrap<PoliticalSystem>(
    await politicalSystemsApi.update(getApiConnection(), id, dto),
  )
}

export async function deletePoliticalSystem(id: string): Promise<void> {
  await politicalSystemsApi.remove(getApiConnection(), id)
}
