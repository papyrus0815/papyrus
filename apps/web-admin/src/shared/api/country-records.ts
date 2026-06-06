/**
 * 국가 기록(CountryRecord) API 래퍼.
 * 백엔드: /countries/:id/records
 */
import * as countriesApi from '@api/functional/countries'
import { getApiConnection } from './client'

export type CountryRecord = Awaited<
  ReturnType<typeof countriesApi.records.getCountryRecords>
>[number]
export type CreateCountryRecordInput = Parameters<
  typeof countriesApi.records.createCountryRecord
>[2]
export type UpdateCountryRecordInput = Parameters<
  typeof countriesApi.records.updateCountryRecord
>[3]

function unwrap<T>(response: unknown): T[] {
  const r = response as { data?: T[] } | T[]
  if (Array.isArray(r)) return r
  return r?.data ?? []
}
function unwrapOne<T>(response: unknown): T {
  const r = response as { data?: T } | T
  if (r && typeof r === 'object' && 'data' in (r as object)) {
    const inner = (r as { data?: T }).data
    if (inner !== undefined) return inner
  }
  return r as T
}

export async function getCountryRecords(
  countryId: string,
): Promise<CountryRecord[]> {
  const response = await countriesApi.records.getCountryRecords(
    getApiConnection(),
    countryId,
  )
  return unwrap<CountryRecord>(response)
}

export async function createCountryRecord(
  countryId: string,
  dto: CreateCountryRecordInput,
): Promise<CountryRecord> {
  const response = await countriesApi.records.createCountryRecord(
    getApiConnection(),
    countryId,
    dto,
  )
  return unwrapOne<CountryRecord>(response)
}

export async function updateCountryRecord(
  countryId: string,
  recordId: string,
  dto: UpdateCountryRecordInput,
): Promise<CountryRecord> {
  const response = await countriesApi.records.updateCountryRecord(
    getApiConnection(),
    countryId,
    recordId,
    dto,
  )
  return unwrapOne<CountryRecord>(response)
}

export async function deleteCountryRecord(
  countryId: string,
  recordId: string,
): Promise<void> {
  await countriesApi.records.deleteCountryRecord(
    getApiConnection(),
    countryId,
    recordId,
  )
}
