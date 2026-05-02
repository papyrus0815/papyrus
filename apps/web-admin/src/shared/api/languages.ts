/**
 * 언어 API 서비스 — Nestia SDK 기반 read-only
 */
import * as languagesApi from '@api/functional/languages'
import { apiConnection } from './client'

export type LanguageResponseDto = Awaited<
  ReturnType<typeof languagesApi.getAllLanguages>
>[number]

export async function getAllLanguages(): Promise<LanguageResponseDto[]> {
  const response = (await languagesApi.getAllLanguages(apiConnection)) as any
  return response.data || response
}
