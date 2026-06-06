/**
 * 국가 교역(ExportImport) API 래퍼.
 * 백엔드: /countries/:id/export-imports
 */
import * as countriesApi from '@api/functional/countries'
import { getApiConnection } from './client'

export type ExportImport = Awaited<
  ReturnType<typeof countriesApi.export_imports.getExportImports>
>[number]
export type UpsertExportImportInput = Parameters<
  typeof countriesApi.export_imports.upsertExportImport
>[2]

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

export async function getExportImports(
  countryId: string,
): Promise<ExportImport[]> {
  const response = await countriesApi.export_imports.getExportImports(
    getApiConnection(),
    countryId,
  )
  return unwrap<ExportImport>(response)
}

export async function upsertExportImport(
  countryId: string,
  dto: UpsertExportImportInput,
): Promise<ExportImport> {
  const response = await countriesApi.export_imports.upsertExportImport(
    getApiConnection(),
    countryId,
    dto,
  )
  return unwrapOne<ExportImport>(response)
}

export async function deleteExportImport(
  countryId: string,
  year: number,
): Promise<void> {
  await countriesApi.export_imports.deleteExportImport(
    getApiConnection(),
    countryId,
    year,
  )
}
